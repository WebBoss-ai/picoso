import express from 'express';
import { requireLlmPin } from '../middleware/llmAuth.js';
import {
  getOrCreateDefaultWorkspace,
  getOrCreateSelfConnection,
  upsertExternalConnection,
  runTrainingDiscover,
  getActiveModel,
  getLatestDraftOrActive,
  updateSemanticModel,
  activateSemanticModel,
  addTrainingHint,
  sanitizeConnection,
  sanitizeModel,
  modelContextForPrompt,
} from '../discovery/workspaceService.js';
import { LlmConnection, LlmSchemaSnapshot, LlmSemanticModel } from '../models/llmModels.js';

const router = express.Router();

router.use(requireLlmPin);

/** GET workspace status */
router.get('/workspace', async (_req, res) => {
  try {
    const ws = await getOrCreateDefaultWorkspace();
    const conn = await getOrCreateSelfConnection(ws._id);
    const model = await getLatestDraftOrActive(ws._id);
    const active = await getActiveModel(ws._id);
    const connections = await LlmConnection.find({ workspaceId: ws._id }).lean();
    res.json({
      workspace: {
        id: String(ws._id),
        slug: ws.slug,
        name: ws.name,
        settings: ws.settings,
      },
      connections: connections.map(sanitizeConnection),
      primaryConnection: sanitizeConnection(conn),
      model: model ? sanitizeModel(model) : null,
      activeModel: active ? sanitizeModel(active) : null,
      trained: Boolean(active),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Connect external Mongo (optional) */
router.post('/connections', async (req, res) => {
  try {
    const ws = await getOrCreateDefaultWorkspace();
    const { mode, name, uri } = req.body || {};
    if (mode === 'self' || !uri) {
      const conn = await getOrCreateSelfConnection(ws._id);
      return res.json({ connection: sanitizeConnection(conn) });
    }
    const conn = await upsertExternalConnection(ws._id, { name, uri });
    res.json({ connection: sanitizeConnection(conn) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/** Discover schema from samples + draft semantic model (TRAIN) */
router.post('/train/discover', async (req, res) => {
  try {
    const ws = await getOrCreateDefaultWorkspace();
    const {
      connectionId,
      sampleSize,
      maxCollections,
      collections,
      businessContext,
      modelName,
    } = req.body || {};

    const result = await runTrainingDiscover(ws._id, {
      connectionId,
      sampleSize,
      maxCollections,
      collections,
      businessContext,
      modelName,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Latest schema snapshot */
router.get('/schema', async (_req, res) => {
  try {
    const ws = await getOrCreateDefaultWorkspace();
    const snap = await LlmSchemaSnapshot.findOne({ workspaceId: ws._id })
      .sort({ version: -1 })
      .lean();
    if (!snap) return res.json({ snapshot: null });
    res.json({
      snapshot: {
        id: String(snap._id),
        version: snap.version,
        collections: snap.collections,
        relationships: snap.relationships,
        discoveredAt: snap.discoveredAt,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Get / list models */
router.get('/models', async (_req, res) => {
  try {
    const ws = await getOrCreateDefaultWorkspace();
    const models = await LlmSemanticModel.find({ workspaceId: ws._id })
      .sort({ updatedAt: -1 })
      .limit(20);
    res.json({ models: models.map(sanitizeModel) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/models/active', async (_req, res) => {
  try {
    const ws = await getOrCreateDefaultWorkspace();
    const model = await getActiveModel(ws._id);
    res.json({
      model: model ? sanitizeModel(model) : null,
      context: modelContextForPrompt(model),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Patch draft semantic model (confirm entities/metrics, glossary) */
router.put('/models/:id', async (req, res) => {
  try {
    const model = await updateSemanticModel(req.params.id, req.body || {});
    res.json({ model: sanitizeModel(model) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/** Activate trained model for chat */
router.post('/models/:id/activate', async (req, res) => {
  try {
    const ws = await getOrCreateDefaultWorkspace();
    const model = await activateSemanticModel(ws._id, req.params.id);
    res.json({ model: sanitizeModel(model), trained: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/** Teach the brain: freeform Q/A hint */
router.post('/models/:id/hints', async (req, res) => {
  try {
    const { question, answer } = req.body || {};
    if (!question || !answer) {
      return res.status(400).json({ error: 'question and answer required' });
    }
    const model = await addTrainingHint(req.params.id, question, answer);
    res.json({ model: sanitizeModel(model) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
