const express = require('express');
const { GenerationJobManager } = require('@librechat/api');
const { logger } = require('@librechat/data-schemas');

const router = express.Router();

const STATUS_TOKEN = process.env.LIBRECHAT_STATUS_TOKEN;
const STATUS_TOKEN_HEADER = 'x-librechat-status-token';
const CONVERSATION_ID_HEADER = 'x-librechat-conversation-id';

const extractToken = (req) => {
  const headerToken = req.get(STATUS_TOKEN_HEADER);
  if (headerToken) {
    return headerToken.trim();
  }

  const auth = req.get('authorization');
  if (!auth) {
    return null;
  }

  const [scheme, value] = auth.split(' ');
  if (scheme?.toLowerCase() === 'bearer' && value) {
    return value.trim();
  }

  return null;
};

router.post('/', express.json({ limit: '16kb' }), async (req, res) => {
  if (STATUS_TOKEN) {
    const token = extractToken(req);
    if (!token || token !== STATUS_TOKEN) {
      return res.status(401).json({ error: 'unauthorized' });
    }
  }

  const conversationId = req.body?.conversationId || req.get(CONVERSATION_ID_HEADER);
  if (!conversationId || typeof conversationId !== 'string') {
    return res.status(400).json({ error: 'conversationId_required' });
  }

  const status = req.body?.status ?? (req.body?.clear === true ? { clear: true } : null);

  if (!status || typeof status !== 'object') {
    return res.status(400).json({ error: 'status_payload_required' });
  }

  const job = await GenerationJobManager.getJob(conversationId);
  const streamActive = Boolean(job);
  const jobStatus = job?.status;
  const shouldLogStreamCheck = status.phase === 'start' || status.clear === true;

  if (!streamActive) {
    logger.warn('[status] stream missing for status callback', {
      conversationId,
      phase: typeof status.phase === 'string' ? status.phase : undefined,
      clear: status.clear === true,
    });
  } else if (shouldLogStreamCheck) {
    logger.info('[status] stream check', {
      conversationId,
      streamActive,
      jobStatus,
      phase: typeof status.phase === 'string' ? status.phase : undefined,
      clear: status.clear === true,
    });
  }

  GenerationJobManager.emitChunk(conversationId, {
    event: 'status',
    data: status,
  });

  logger.debug('[status] status update emitted', {
    conversationId,
    streamActive,
    jobStatus,
    clear: status.clear === true,
    hasText: typeof status.text === 'string',
    phase: typeof status.phase === 'string' ? status.phase : undefined,
  });

  return res.sendStatus(204);
});

module.exports = router;
