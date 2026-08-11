import express from 'express';
import { requireLlmPin } from '../middleware/llmAuth.js';
import {
  getOrCreateDefaultWorkspace,
  getOrCreateSelfConnection,
  upsertExternalConnection,
  runTrainingDiscover,
  runUnstructuredTrain,
  getActiveModel,
  getLatestDraftOrActive,
  updateSemanticModel,
  activateSemanticModel,
  addTrainingHint,
  getBrainPackage,
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
    const brain = await getBrainPackage(ws._id);
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
      brain: brain.brain,
      corpus: brain.corpus
        ? {
            id: brain.corpus.id,
            label: brain.corpus.label,
            recordCount: brain.corpus.recordCount,
            domain: brain.corpus.domain,
          }
        : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Workspace error' });
  }
});

/** Full trained brain for inspection (JSON + text) */
router.get('/brain', async (_req, res) => {
  try {
    const ws = await getOrCreateDefaultWorkspace();
    const pack = await getBrainPackage(ws._id);
    res.json(pack);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Brain load failed' });
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

/**
 * TRAIN from unorganized paste (order admin dumps, notes, JSON).
 * Primary path for "any messy data".
 */
router.post('/train/unstructured', async (req, res) => {
  try {
    const ws = await getOrCreateDefaultWorkspace();
    const { text, raw, label, businessContext, modelName, activate } = req.body || {};
    const payload = text || raw;
    if (!payload || String(payload).trim().length < 20) {
      return res.status(400).json({
        error: 'Paste sample data (order cards, JSON, notes) in the text field.',
      });
    }

    const result = await runUnstructuredTrain(ws._id, {
      text: payload,
      label: label || 'Operations paste',
      businessContext,
      modelName,
    });

    if (activate) {
      const activated = await activateSemanticModel(ws._id, result.model.id);
      result.model = sanitizeModel(activated);
      result.trained = true;
    }

    res.json(result);
  } catch (err) {
    console.error('[llm] unstructured train', err);
    res.status(500).json({ error: err.message || 'Unstructured training failed' });
  }
});

/** Discover schema from Mongo samples + draft semantic model */
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
    console.error('[llm] discover', err);
    res.status(500).json({
      error:
        err.message ||
        'Mongo discovery failed. You can still Train from paste under Unstructured data.',
    });
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
