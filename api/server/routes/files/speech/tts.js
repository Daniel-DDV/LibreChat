const multer = require('multer');
const express = require('express');
const { logger } = require('@librechat/data-schemas');
const { CacheKeys } = require('librechat-data-provider');
const { getVoices, streamAudio, textToSpeech } = require('~/server/services/Files/Audio');
const { getLogStores } = require('~/cache');
const { getAppConfig } = require('~/server/services/Config');

const router = express.Router();
const upload = multer();

// Guard all TTS endpoints so missing config does not create runtime errors.
async function ensureTtsConfigured(req, res) {
  let appConfig = null;
  try {
    appConfig = await getAppConfig({ role: req.user?.role });
  } catch (error) {
    logger.warn('[streamAudio] Failed to load app config for TTS check');
  }

  const hasSchema = !!appConfig?.speech?.tts;

  if (!hasSchema) {
    // Return a clear 503 instead of throwing deeper in the TTS service.
    logger.warn('[streamAudio] TTS not configured; rejecting request');
    res.status(503).json({
      error: 'TTS not configured',
      message: 'Text-to-speech is not available in this deployment.',
      code: 'TTS_UNAVAILABLE',
    });
    return false;
  }

  return true;
}

router.post('/manual', upload.none(), async (req, res) => {
  if (!(await ensureTtsConfigured(req, res))) {
    return;
  }
  await textToSpeech(req, res);
});

const logDebugMessage = (req, message) =>
  logger.debug(`[streamAudio] user: ${req?.user?.id ?? 'UNDEFINED_USER'} | ${message}`);

// TODO: test caching
router.post('/', async (req, res) => {
  try {
    if (!(await ensureTtsConfigured(req, res))) {
      return;
    }
    const audioRunsCache = getLogStores(CacheKeys.AUDIO_RUNS);
    const audioRun = await audioRunsCache.get(req.body.runId);
    logDebugMessage(req, 'start stream audio');
    if (audioRun) {
      logDebugMessage(req, 'stream audio already running');
      return res.status(401).json({ error: 'Audio stream already running' });
    }
    audioRunsCache.set(req.body.runId, true);
    await streamAudio(req, res);
    logDebugMessage(req, 'end stream audio');
    res.status(200).end();
  } catch (error) {
    logger.error(`[streamAudio] user: ${req.user.id} | Failed to stream audio: ${error}`);
    res.status(500).json({ error: 'Failed to stream audio' });
  }
});

router.get('/voices', async (req, res) => {
  if (!(await ensureTtsConfigured(req, res))) {
    return;
  }
  await getVoices(req, res);
});

module.exports = router;
