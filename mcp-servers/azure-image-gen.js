#!/usr/bin/env node
'use strict';

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio');
const z = require('zod/v4');

const TOOL_NAME = 'generate_image';

const server = new McpServer({
  name: 'azure-image-gen',
  version: '1.0.0',
});

function normalizeBaseUrl(baseUrl) {
  return baseUrl.replace(/\/+$/, '');
}

function buildImageUrls(data) {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((item) => {
      if (item?.url) {
        return item.url;
      }
      if (item?.b64_json) {
        return `data:image/png;base64,${item.b64_json}`;
      }
      return null;
    })
    .filter(Boolean);
}

async function callImageGeneration(payload) {
  const proxyUrl = process.env.PROXY_URL;
  const apiKey = process.env.PROXY_API_KEY;

  if (!proxyUrl || !apiKey) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: 'Image generation is not configured. Missing PROXY_URL or PROXY_API_KEY.',
        },
      ],
    };
  }

  if (typeof fetch !== 'function') {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: 'Image generation is unavailable: fetch is not supported in this runtime.',
        },
      ],
    };
  }

  const url = `${normalizeBaseUrl(proxyUrl)}/v1/images/generations`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Image generation request failed: ${error.message}`,
        },
      ],
    };
  }

  const responseText = await response.text();
  let responseJson = null;
  if (responseText) {
    try {
      responseJson = JSON.parse(responseText);
    } catch (error) {
      responseJson = null;
    }
  }

  if (!response.ok) {
    const errorMessage =
      responseJson?.error?.message ||
      responseJson?.message ||
      responseText ||
      'Unknown error from image generation service.';
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Image generation failed (${response.status}): ${errorMessage}`,
        },
      ],
    };
  }

  const imageUrls = buildImageUrls(responseJson?.data);
  if (imageUrls.length === 0) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: 'Image generation succeeded but no image URLs were returned.',
        },
      ],
      structuredContent: {
        raw: responseJson ?? {},
      },
    };
  }

  return {
    content: [
      {
        type: 'text',
        text: imageUrls.map((imageUrl, index) => `${index + 1}. ${imageUrl}`).join('\n'),
      },
    ],
    structuredContent: {
      images: imageUrls,
    },
  };
}

server.registerTool(
  TOOL_NAME,
  {
    title: 'Azure Image Generation',
    description:
      'Generate images via the configured proxy. Returns image URLs or base64 data URLs.',
    inputSchema: {
      prompt: z.string().min(1).describe('Text prompt for image generation.'),
      model: z.string().optional().describe('Optional model name.'),
      size: z
        .string()
        .optional()
        .describe('Image size (e.g., 1024x1024). Defaults to provider settings.'),
      n: z.number().int().min(1).max(4).optional().describe('Number of images to generate (1-4).'),
      quality: z
        .enum(['standard', 'hd'])
        .optional()
        .describe('Optional quality setting supported by the provider.'),
      style: z
        .enum(['vivid', 'natural'])
        .optional()
        .describe('Optional style setting supported by the provider.'),
      response_format: z
        .enum(['url', 'b64_json'])
        .optional()
        .describe('Return URLs or base64 JSON data.'),
      user: z.string().optional().describe('Optional user identifier for tracing.'),
    },
  },
  async (params) => {
    const payload = { prompt: params.prompt };

    if (params.model) {
      payload.model = params.model;
    }
    if (params.size) {
      payload.size = params.size;
    }
    if (params.n) {
      payload.n = params.n;
    }
    if (params.quality) {
      payload.quality = params.quality;
    }
    if (params.style) {
      payload.style = params.style;
    }
    if (params.response_format) {
      payload.response_format = params.response_format;
    }
    if (params.user) {
      payload.user = params.user;
    }

    return callImageGeneration(payload);
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('azure-image-gen MCP server running on stdio');
}

main().catch((error) => {
  console.error('azure-image-gen MCP server failed to start:', error);
  process.exit(1);
});
