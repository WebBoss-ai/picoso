import {
  LlmWorkspace,
  LlmConnection,
  LlmSchemaSnapshot,
  LlmSemanticModel,
} from '../models/llmModels.js';
import { encryptSecret, hostFromUri } from '../security/secrets.js';
import { getDataConnection } from './connection.js';
import { discoverSchema, draftSemanticModel } from './engine.js';

export async function getOrCreateDefaultWorkspace() {
  let ws = await LlmWorkspace.findOne({ slug: 'default' });
  if (!ws) {
    ws = await LlmWorkspace.create({
      slug: 'default',
      name: 'Picoso Intelligence',
      settings: {
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        locale: 'en-IN',
      },
    });
  }
  return ws;
}

export async function getOrCreateSelfConnection(workspaceId) {
  let conn = await LlmConnection.findOne({
    workspaceId,
    mode: 'self',
  });
  if (!conn) {
    conn = await LlmConnection.create({
      workspaceId,
      name: 'App database (this server)',
      mode: 'self',
      status: 'connected',
      meta: {
        host: 'self',
        dbName: '',
        collectionsCount: 0,
      },
    });
  }
  return conn;
}

export async function upsertExternalConnection(workspaceId, { name, uri }) {
  if (!uri || !String(uri).startsWith('mongodb')) {
    throw new Error('Valid mongodb:// or mongodb+srv:// URI required');
  }
  // Safety: require explicit allowlist for external in production
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.LLM_ALLOW_EXTERNAL_MONGO !== 'true'
  ) {
    throw new Error(
      'External MongoDB disabled. Set LLM_ALLOW_EXTERNAL_MONGO=true on the server to enable.'
    );
  }

  let conn = await LlmConnection.findOne({
    workspaceId,
    mode: 'mongodb_uri',
    name: name || 'External MongoDB',
  });

  const payload = {
    workspaceId,
    name: name || 'External MongoDB',
    mode: 'mongodb_uri',
    encryptedUri: encryptSecret(uri),
    status: 'connected',
    meta: {
      host: hostFromUri(uri),
      dbName: '',
      collectionsCount: 0,
    },
    lastError: null,
    updatedAt: new Date(),
  };

  if (conn) {
    Object.assign(conn, payload);
    await conn.save();
  } else {
    conn = await LlmConnection.create(payload);
  }
  return conn;
}

/**
 * Run discovery and create draft semantic model.
 */
export async function runTrainingDiscover(workspaceId, options = {}) {
  const workspace = await LlmWorkspace.findById(workspaceId);
  if (!workspace) throw new Error('Workspace not found');

  let connection;
  if (options.connectionId) {
    connection = await LlmConnection.findById(options.connectionId);
  } else {
    connection = await getOrCreateSelfConnection(workspaceId);
  }
  if (!connection) throw new Error('Connection not found');

  const data = await getDataConnection(connection);
  try {
    const discovery = await discoverSchema(data.db, {
      sampleSize: options.sampleSize || 40,
      maxCollections: options.maxCollections || 35,
      collections: options.collections || null,
    });

    connection.meta = {
      host: data.host || connection.meta?.host || '',
      dbName: data.dbName || '',
      collectionsCount: discovery.collections.length,
    };
    connection.status = 'connected';
    connection.lastDiscoveredAt = new Date();
    connection.lastError = null;
    await connection.save();

    const lastSnap = await LlmSchemaSnapshot.findOne({ workspaceId })
      .sort({ version: -1 })
      .lean();
    const version = (lastSnap?.version || 0) + 1;

    const snapshot = await LlmSchemaSnapshot.create({
      workspaceId,
      connectionId: connection._id,
      version,
      collections: discovery.collections,
      relationships: discovery.relationships,
      discoveredAt: new Date(),
    });

    const draft = draftSemanticModel(discovery, {
      businessName: workspace.name,
      modelName: options.modelName || `${workspace.name} brain v${version}`,
      businessContext: options.businessContext,
    });

    const model = await LlmSemanticModel.create({
      workspaceId,
      schemaSnapshotId: snapshot._id,
      version,
      ...draft,
      status: 'draft',
      updatedAt: new Date(),
    });

    return {
      connection: sanitizeConnection(connection),
      snapshot: {
        id: snapshot._id,
        version: snapshot.version,
        collections: snapshot.collections.map((c) => ({
          name: c.name,
          estimatedCount: c.estimatedCount,
          sampleSize: c.sampleSize,
          fieldCount: c.fields?.length || 0,
          fields: c.fields,
          sampleDocs: c.sampleDocs,
        })),
        relationships: snapshot.relationships,
        discoveredAt: snapshot.discoveredAt,
      },
      model: sanitizeModel(model),
    };
  } catch (err) {
    connection.status = 'error';
    connection.lastError = err.message;
    await connection.save().catch(() => {});
    throw err;
  } finally {
    await data.release();
  }
}

export async function getActiveModel(workspaceId) {
  const ws = await LlmWorkspace.findById(workspaceId).lean();
  if (ws?.activeSemanticModelId) {
    const m = await LlmSemanticModel.findById(ws.activeSemanticModelId);
    if (m && m.status === 'active') return m;
  }
  return LlmSemanticModel.findOne({ workspaceId, status: 'active' }).sort({
    updatedAt: -1,
  });
}

export async function getLatestDraftOrActive(workspaceId) {
  const active = await getActiveModel(workspaceId);
  if (active) return active;
  return LlmSemanticModel.findOne({ workspaceId }).sort({ updatedAt: -1 });
}

export async function updateSemanticModel(modelId, patch = {}) {
  const model = await LlmSemanticModel.findById(modelId);
  if (!model) throw new Error('Model not found');

  const allowed = [
    'name',
    'entities',
    'metrics',
    'dimensions',
    'relationships',
    'glossary',
    'businessContext',
    'trainingHints',
    'status',
  ];
  for (const k of allowed) {
    if (patch[k] !== undefined) model[k] = patch[k];
  }
  model.updatedAt = new Date();
  await model.save();
  return model;
}

export async function activateSemanticModel(workspaceId, modelId) {
  const model = await LlmSemanticModel.findOne({ _id: modelId, workspaceId });
  if (!model) throw new Error('Model not found');

  await LlmSemanticModel.updateMany(
    { workspaceId, status: 'active' },
    { $set: { status: 'archived', updatedAt: new Date() } }
  );

  model.status = 'active';
  model.updatedAt = new Date();
  // mark all confirmed if activating after review
  model.entities = (model.entities || []).map((e) => ({
    ...(e.toObject?.() || e),
    confirmed: true,
  }));
  model.metrics = (model.metrics || []).map((m) => ({
    ...(m.toObject?.() || m),
    confirmed: true,
  }));
  await model.save();

  await LlmWorkspace.findByIdAndUpdate(workspaceId, {
    activeSemanticModelId: model._id,
    updatedAt: new Date(),
  });

  return model;
}

export async function addTrainingHint(modelId, question, answer) {
  const model = await LlmSemanticModel.findById(modelId);
  if (!model) throw new Error('Model not found');
  model.trainingHints = model.trainingHints || [];
  model.trainingHints.push({
    question: String(question || '').slice(0, 500),
    answer: String(answer || '').slice(0, 2000),
    createdAt: new Date(),
  });
  // keep last 100
  if (model.trainingHints.length > 100) {
    model.trainingHints = model.trainingHints.slice(-100);
  }
  model.updatedAt = new Date();
  await model.save();
  return model;
}

export function sanitizeConnection(conn) {
  const o = conn.toObject?.() || conn;
  return {
    id: String(o._id),
    name: o.name,
    mode: o.mode,
    status: o.status,
    meta: o.meta,
    lastDiscoveredAt: o.lastDiscoveredAt,
    lastError: o.lastError,
    // never encryptedUri
  };
}

export function sanitizeModel(model) {
  const o = model.toObject?.() || model;
  return {
    id: String(o._id),
    workspaceId: String(o.workspaceId),
    schemaSnapshotId: o.schemaSnapshotId ? String(o.schemaSnapshotId) : null,
    version: o.version,
    name: o.name,
    status: o.status,
    entities: o.entities || [],
    metrics: o.metrics || [],
    dimensions: o.dimensions || [],
    relationships: o.relationships || [],
    glossary: o.glossary || [],
    businessContext: o.businessContext || '',
    trainingHints: o.trainingHints || [],
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

/** Compact model context for LLM system prompt */
export function modelContextForPrompt(model) {
  if (!model) {
    return {
      trained: false,
      note: 'No semantic model trained yet. Use built-in Picoso tools or ask user to Train from Data.',
    };
  }
  return {
    trained: true,
    name: model.name,
    status: model.status,
    businessContext: model.businessContext,
    entities: (model.entities || []).map((e) => ({
      id: e.id,
      name: e.name,
      collection: e.collectionName || e.collection,
      role: e.role,
      labelField: e.labelField,
    })),
    metrics: (model.metrics || []).slice(0, 40).map((m) => ({
      id: m.id,
      name: m.name,
      aggregation: m.aggregation,
      entity: m.entity,
      field: m.field,
      description: m.description,
    })),
    dimensions: (model.dimensions || []).slice(0, 40).map((d) => ({
      id: d.id,
      name: d.name,
      entity: d.entity,
      field: d.field,
      type: d.type,
    })),
    relationships: (model.relationships || []).slice(0, 30),
    glossary: (model.glossary || []).slice(0, 30),
    trainingHints: (model.trainingHints || []).slice(-12),
  };
}
