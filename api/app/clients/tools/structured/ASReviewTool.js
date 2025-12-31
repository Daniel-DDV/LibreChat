const { z } = require('zod');
const { ProxyAgent, fetch } = require('undici');
const { tool } = require('@langchain/core/tools');

/**
 * Creates an ASReview systematic literature review tool.
 *
 * This tool enables LibreChat agents to manage systematic review projects,
 * including creating projects, uploading papers, getting records to screen,
 * and recording screening decisions.
 *
 * @param {Object} fields - Configuration options
 * @param {string} fields.baseUrl - Base URL for ASReview API (default: http://172.17.0.1:3084)
 * @returns {Object} LangChain tool for ASReview operations
 */
function createASReviewTool(fields = {}) {
  // Use Docker host IP for container-to-host communication
  const baseUrl = fields.baseUrl ?? process.env.ASREVIEW_API_URL ?? 'http://172.17.0.1:3084';

  return tool(
    async (input) => {
      const { action, project_id, ...params } = input;

      let endpoint = '';
      let method = 'GET';
      let body = null;

      switch (action) {
        case 'list_projects':
          endpoint = '/projects';
          break;

        case 'create_project':
          endpoint = '/projects';
          method = 'POST';
          body = {
            name: params.name,
            description: params.description,
            research_question: params.research_question,
            inclusion_criteria: params.inclusion_criteria,
            exclusion_criteria: params.exclusion_criteria,
          };
          break;

        case 'get_project':
          if (!project_id) {
            return JSON.stringify({ error: 'project_id is required for get_project action' });
          }
          endpoint = `/projects/${project_id}`;
          break;

        case 'get_next_paper':
          if (!project_id) {
            return JSON.stringify({ error: 'project_id is required for get_next_paper action' });
          }
          endpoint = `/projects/${project_id}/next`;
          break;

        case 'record_decision':
          if (!project_id) {
            return JSON.stringify({ error: 'project_id is required for record_decision action' });
          }
          endpoint = `/projects/${project_id}/decide`;
          method = 'POST';
          body = {
            record_id: params.record_id,
            decision: params.decision,
            reasoning: params.reasoning,
          };
          break;

        case 'get_stats':
          if (!project_id) {
            return JSON.stringify({ error: 'project_id is required for get_stats action' });
          }
          endpoint = `/projects/${project_id}/stats`;
          break;

        case 'get_history':
          if (!project_id) {
            return JSON.stringify({ error: 'project_id is required for get_history action' });
          }
          endpoint = `/projects/${project_id}/history`;
          break;

        default:
          return JSON.stringify({
            error: `Unknown action: ${action}`,
            available_actions: [
              'list_projects',
              'create_project',
              'get_project',
              'get_next_paper',
              'record_decision',
              'get_stats',
              'get_history'
            ]
          });
      }

      const fetchOptions = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (body) {
        fetchOptions.body = JSON.stringify(body);
      }

      if (process.env.PROXY) {
        fetchOptions.dispatcher = new ProxyAgent(process.env.PROXY);
      }

      try {
        const response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);
        const json = await response.json();

        if (!response.ok) {
          return JSON.stringify({
            error: `Request failed with status ${response.status}`,
            details: json
          });
        }

        return JSON.stringify(json);
      } catch (error) {
        return JSON.stringify({
          error: 'Failed to connect to ASReview API',
          message: error.message
        });
      }
    },
    {
      name: 'asreview',
      description: `Manage systematic literature reviews. Use this tool to:
- Create new review projects with research questions and criteria
- Get the next paper to screen from a project
- Record include/exclude decisions with reasoning
- Track progress and statistics

IMPORTANT: When helping students with systematic reviews:
1. First ask for their research question and inclusion/exclusion criteria
2. Create a project with those criteria
3. For each paper, ask the student to evaluate it based on THEIR criteria
4. Record decisions with the student's reasoning
5. Periodically review progress and patterns`,
      schema: z.object({
        action: z.enum([
          'list_projects',
          'create_project',
          'get_project',
          'get_next_paper',
          'record_decision',
          'get_stats',
          'get_history',
        ]).describe('The action to perform'),

        project_id: z.string().optional().describe(
          'Project ID (required for most actions except list_projects and create_project)'
        ),

        // For create_project
        name: z.string().optional().describe(
          'Project name (for create_project)'
        ),
        description: z.string().optional().describe(
          'Project description (for create_project)'
        ),
        research_question: z.string().optional().describe(
          'Research question (for create_project)'
        ),
        inclusion_criteria: z.array(z.string()).optional().describe(
          'List of inclusion criteria (for create_project)'
        ),
        exclusion_criteria: z.array(z.string()).optional().describe(
          'List of exclusion criteria (for create_project)'
        ),

        // For record_decision
        record_id: z.string().optional().describe(
          'Record/paper ID (for record_decision)'
        ),
        decision: z.enum(['include', 'exclude', 'maybe']).optional().describe(
          'Screening decision (for record_decision)'
        ),
        reasoning: z.string().optional().describe(
          'Student reasoning for the decision (for record_decision)'
        ),
      }),
    },
  );
}

module.exports = createASReviewTool;
