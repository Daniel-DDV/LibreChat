/**
 * Obtains the date string in 'YYYY-MM-DD' format.
 *
 * @param {string} [clientTimestamp] - Optional ISO timestamp string. If provided, uses this timestamp;
 * otherwise, uses the current date.
 * @returns {string} - The date string in 'YYYY-MM-DD' format.
 */
function getDateStr(clientTimestamp) {
  return clientTimestamp ? clientTimestamp.split('T')[0] : new Date().toISOString().split('T')[0];
}

/**
 * Obtains the time string in 'HH:MM:SS' format.
 *
 * @param {string} [clientTimestamp] - Optional ISO timestamp string. If provided, uses this timestamp;
 * otherwise, uses the current time.
 * @returns {string} - The time string in 'HH:MM:SS' format.
 */
function getTimeStr(clientTimestamp) {
  return clientTimestamp
    ? clientTimestamp.split('T')[1].split('.')[0]
    : new Date().toTimeString().split(' ')[0];
}

function getNow(clientTimestamp) {
  if (clientTimestamp) {
    const parsed = new Date(clientTimestamp);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
}

function buildCurrentDateTimeLine(clientTimestamp) {
  const now = getNow(clientTimestamp);
  const pad = (value) => String(value).padStart(2, '0');
  const localTimestamp = [
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
  ].join(' ');
  const offsetMinutes = -now.getTimezoneOffset();
  const offsetSign = offsetMinutes >= 0 ? '+' : '-';
  const offsetTotalMinutes = Math.abs(offsetMinutes);
  const offsetHours = pad(Math.floor(offsetTotalMinutes / 60));
  const offsetMins = pad(offsetTotalMinutes % 60);
  const offsetLabel = `UTC${offsetSign}${offsetHours}:${offsetMins}`;
  return `Current date and time: ${localTimestamp} (${offsetLabel}) | UTC: ${now.toISOString()}`;
}

/**
 * Creates the body object for a run request.
 *
 * @param {Object} options - The options for creating the run body.
 * @param {string} options.assistant_id - The assistant ID.
 * @param {string} options.model - The model name.
 * @param {string} [options.promptPrefix] - The prompt prefix to include.
 * @param {string} [options.instructions] - The instructions to include.
 * @param {Object} [options.endpointOption={}] - The endpoint options.
 * @param {string} [options.clientTimestamp] - Client timestamp in ISO format.
 *
 * @returns {Object} - The constructed body object for the run request.
 */
const createRunBody = ({
  assistant_id,
  model,
  promptPrefix,
  instructions,
  endpointOption = {},
  clientTimestamp,
}) => {
  const body = {
    assistant_id,
    model,
  };

  let systemInstructions = '';

  if (promptPrefix) {
    systemInstructions += promptPrefix;
  }

  if (typeof endpointOption?.artifactsPrompt === 'string' && endpointOption.artifactsPrompt) {
    systemInstructions += `\n${endpointOption.artifactsPrompt}`;
  }

  const shouldAppendDatetime = endpointOption.assistant?.append_current_datetime !== false;
  if (shouldAppendDatetime && !systemInstructions.includes('Current date and time')) {
    systemInstructions = `${buildCurrentDateTimeLine(clientTimestamp)}\n${systemInstructions}`;
  }

  if (systemInstructions.trim()) {
    body.additional_instructions = systemInstructions.trim();
  }

  if (instructions) {
    body.instructions = instructions;
  }

  return body;
};

module.exports = { createRunBody, getDateStr, getTimeStr };
