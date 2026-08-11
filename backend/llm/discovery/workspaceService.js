import {
  LlmWorkspace,
  LlmConnection,
  LlmSchemaSnapshot,
  LlmSemanticModel,
  LlmTrainingCorpus,
} from '../models/llmModels.js';
import { encryptSecret, hostFromUri } from '../security/secrets.js';
import { getDataConnection } from './connection.js';
import { discoverSchema, draftSemanticModel, listMongoCatalog } from './engine.js';
import {
  trainFromUnstructuredText,
  queryTrainedRecords,
} from './unstructured.js';
import {
  buildLiveFieldMapFromSamples,
  buildLiveQueryPlanText,
  buildQueryPlan,
} from './liveMap.js';
import {
  mergePriorBrain,
  mergeCorpusRecords,
  appendLearningSession,
  mergeTextBrain,
} from './mergeBrain.js';

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
 * Browse Mongo: list every collection with counts + optional sample docs.
 */
export async function exploreMongoCollections(workspaceId, options = {}) {
  let connection;
  if (options.connectionId) {
    connection = await LlmConnection.findById(options.connectionId);
  } else {
    connection = await getOrCreateSelfConnection(workspaceId);
  }
  if (!connection) throw new Error('Connection not found');

  const data = await getDataConnection(connection);
  try {
    const catalog = await listMongoCatalog(data.db, {
      includeEmpty: options.includeEmpty !== false,
      withSamples: options.withSamples !== false,
      sampleSize: options.sampleSize || 2,
    });

    connection.meta = {
      ...(connection.meta || {}),
      host: data.host || connection.meta?.host || '',
      dbName: data.dbName || connection.meta?.dbName || '',
      collectionsCount: catalog.total,
    };
    connection.status = 'connected';
    connection.lastError = null;
    await connection.save().catch(() => {});

    return {
      connection: sanitizeConnection(connection),
      dbName: data.dbName || connection.meta?.dbName || '',
      host: data.host || '',
      ...catalog,
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

/**
 * Sample one collection for preview in Train UI.
 */
export async function previewMongoCollection(workspaceId, collectionName, options = {}) {
  const name = String(collectionName || '').trim();
  if (!name) throw new Error('collection name required');
  if (name.startsWith('system.') || /^llm/i.test(name)) {
    throw new Error('Collection not allowed');
  }

  let connection;
  if (options.connectionId) {
    connection = await LlmConnection.findById(options.connectionId);
  } else {
    connection = await getOrCreateSelfConnection(workspaceId);
  }
  const data = await getDataConnection(connection);
  try {
    const col = data.db.collection(name);
    let estimatedCount = 0;
    try {
      estimatedCount = await col.estimatedDocumentCount();
    } catch {
      estimatedCount = 0;
    }
    const limit = Math.min(Number(options.limit) || 5, 20);
    let docs = [];
    try {
      docs = await col.aggregate([{ $sample: { size: limit } }]).toArray();
    } catch {
      docs = await col.find({}).limit(limit).toArray();
    }
    // local sanitize (avoid secrets)
    const sampleDocs = docs.map((doc) => {
      const out = {};
      for (const [k, v] of Object.entries(doc || {})) {
        if (k === 'password' || /secret|token|hash/i.test(k)) out[k] = '[redacted]';
        else if (v && typeof v === 'object' && v._bsontype) out[k] = String(v);
        else if (v instanceof Date) out[k] = v.toISOString();
        else if (typeof v === 'string' && v.length > 200) out[k] = `${v.slice(0, 197)}…`;
        else if (v && typeof v === 'object') {
          try {
            out[k] = JSON.parse(JSON.stringify(v));
          } catch {
            out[k] = String(v);
          }
        } else out[k] = v;
      }
      return out;
    });
    return { name, estimatedCount, sampleDocs, limit };
  } finally {
    await data.release();
  }
}

/**
 * Run discovery and create draft semantic model (merges with prior brain by default).
 */
export async function runTrainingDiscover(workspaceId, options = {}) {
  const workspace = await LlmWorkspace.findById(workspaceId);
  if (!workspace) throw new Error('Workspace not found');
  const mergeLearning = options.mergeLearning !== false;

  let connection;
  if (options.connectionId) {
    connection = await LlmConnection.findById(options.connectionId);
  } else {
    connection = await getOrCreateSelfConnection(workspaceId);
  }
  if (!connection) throw new Error('Connection not found');

  const selected =
    Array.isArray(options.collections) && options.collections.length
      ? options.collections.map(String)
      : null;

  const data = await getDataConnection(connection);
  try {
    const discovery = await discoverSchema(data.db, {
      sampleSize: options.sampleSize || 40,
      maxCollections: options.maxCollections || (selected ? 120 : 40),
      collections: selected,
      skipEmpty: options.skipEmpty === true,
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

    const base = mergeLearning ? await getLatestDraftOrActive(workspaceId) : null;
    const priorVersion = base?.version || 0;

    let draft = draftSemanticModel(discovery, {
      businessName: workspace.name,
      modelName:
        options.modelName ||
        `${workspace.name} brain v${Math.max(version, priorVersion + 1)}`,
      businessContext: options.businessContext,
    });

    draft = {
      ...draft,
      sessionLabel: options.modelName || `Mongo · ${discovery.collections.length} collections`,
      source: 'mongodb',
      businessContext: options.businessContext || draft.businessContext || '',
    };

    if (base) {
      draft = mergePriorBrain(base, draft);
    }

    const modelVersion =
      ((await LlmSemanticModel.findOne({ workspaceId }).sort({ version: -1 }).lean())
        ?.version || 0) + 1;

    const extractionMeta = appendLearningSession(base?.extractionMeta, {
      source: 'mongodb',
      label: options.modelName || `Discover ${discovery.collections.length} cols`,
      collections: discovery.collections.map((c) => c.name),
      recordCount: 0,
      versionAfter: modelVersion,
      note: mergeLearning && base ? 'Merged with prior brain' : 'Fresh train',
      patch: {
        includedCollections: discovery.collections.map((c) => c.name),
        discoveryVersion: version,
      },
    });

    // Prefer carrying prior corpus forward when merging
    let corpusId = base?.corpusId || null;
    if (mergeLearning && base?.corpusId) {
      corpusId = base.corpusId;
    }

    const model = await LlmSemanticModel.create({
      workspaceId,
      schemaSnapshotId: snapshot._id,
      version: modelVersion,
      name: options.modelName || draft.name || `${workspace.name} brain v${modelVersion}`,
      ...draft,
      corpusId,
      trainingHints: draft.trainingHints || base?.trainingHints || [],
      extractionMeta,
      status: 'draft',
      updatedAt: new Date(),
    });

    return {
      connection: sanitizeConnection(connection),
      merged: Boolean(base),
      priorModelId: base ? String(base._id) : null,
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
    'jsonSchema',
    'textBrain',
    'parameters',
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

/**
 * Train from unorganized paste (order cards, notes, JSON, dumps).
 * Samples teach structure → brain + liveFieldMap; ops answers scan live Mongo.
 * By default MERGES into prior brain (keeps entities, corpus, hints, maps).
 */
export async function runUnstructuredTrain(workspaceId, options = {}) {
  const workspace = await LlmWorkspace.findById(workspaceId);
  if (!workspace) throw new Error('Workspace not found');
  const mergeLearning = options.mergeLearning !== false;

  const result = await trainFromUnstructuredText(options.text || options.raw || '', {
    label: options.label || 'Operations paste',
    businessContext: options.businessContext || '',
  });

  const selected =
    Array.isArray(options.collections) && options.collections.length
      ? options.collections.map(String)
      : null;

  let discovery = null;
  let discoveryError = null;
  let snapshotId = null;
  try {
    const connection = await getOrCreateSelfConnection(workspaceId);
    const data = await getDataConnection(connection);
    try {
      if (!data.db) {
        throw new Error('App MongoDB not connected yet');
      }
      discovery = await discoverSchema(data.db, {
        sampleSize: Math.min(Number(options.sampleSize) || 20, 40),
        maxCollections: selected ? 120 : 30,
        collections: selected,
        skipEmpty: options.skipEmpty === true,
      });
      connection.meta = {
        host: data.host || 'self',
        dbName: data.dbName || '',
        collectionsCount: discovery.collections.length,
      };
      connection.status = 'connected';
      connection.lastError = null;
      connection.lastDiscoveredAt = new Date();
      await connection.save();

      const lastSnap = await LlmSchemaSnapshot.findOne({ workspaceId })
        .sort({ version: -1 })
        .lean();
      const snapVersion = (lastSnap?.version || 0) + 1;
      const snapshot = await LlmSchemaSnapshot.create({
        workspaceId,
        connectionId: connection._id,
        version: snapVersion,
        collections: discovery.collections,
        relationships: discovery.relationships,
        discoveredAt: new Date(),
      });
      snapshotId = snapshot._id;
    } finally {
      await data.release();
    }
  } catch (err) {
    discoveryError = err.message || String(err);
    console.warn('[llm] live discover during paste train (non-fatal):', discoveryError);
  }

  const liveFieldMap = buildLiveFieldMapFromSamples({
    parameters: result.parameters,
    domain: result.domain,
    discovery,
  });
  const queryPlan = buildQueryPlan(liveFieldMap);
  const sessionText =
    result.textBrain +
    buildLiveQueryPlanText(liveFieldMap) +
    (discoveryError
      ? `\n\n## Live discovery note\nCould not sample Mongo during train: ${discoveryError}. Live tools still use built-in Order/Bowl/User mappings when the server is connected.`
      : discovery
        ? `\n\n## Live discovery\nSampled ${discovery.collections.length} collections from app Mongo and bound concepts to real field paths.`
        : '');

  const liveEntities = [
    {
      id: 'orders',
      name: 'Orders (live)',
      collectionName: 'orders',
      description:
        'Live order collection. grandTotal→totalPrice, pin→deliveryAddress.lat/lng, items→items',
      primaryKey: '_id',
      labelField: 'orderId',
      role: 'order',
      confirmed: true,
    },
    {
      id: 'products',
      name: 'Products / bowls (live)',
      collectionName: 'bowls',
      description: 'Live product catalog used by resolve_product',
      primaryKey: '_id',
      labelField: 'name',
      role: 'product',
      confirmed: true,
    },
    {
      id: 'customers',
      name: 'Customers (live)',
      collectionName: 'users',
      description: 'Live users; geo fallback for radius queries',
      primaryKey: '_id',
      labelField: 'name',
      role: 'customer',
      confirmed: true,
    },
  ];

  if (discovery?.collections?.length) {
    for (const c of discovery.collections) {
      if (['orders', 'bowls', 'users'].includes(c.name)) continue;
      liveEntities.push({
        id: `col_${c.name}`,
        name: c.name,
        collectionName: c.name,
        description: `Live Mongo collection · ~${c.estimatedCount} docs · ${c.fields?.length || 0} fields`,
        primaryKey: '_id',
        labelField: null,
        role: 'other',
        confirmed: false,
      });
    }
  }

  const liveMetrics = [
    {
      id: 'revenue',
      name: 'Live revenue',
      description: 'Sum totalPrice on live completed orders',
      aggregation: 'sum',
      entity: 'orders',
      field: 'totalPrice',
      filters: [],
      confirmed: true,
    },
    {
      id: 'orders',
      name: 'Live order count',
      description: 'Count live completed orders',
      aggregation: 'count',
      entity: 'orders',
      field: null,
      filters: [],
      confirmed: true,
    },
    {
      id: 'aov',
      name: 'Live AOV',
      description: 'Average totalPrice on live completed orders',
      aggregation: 'avg',
      entity: 'orders',
      field: 'totalPrice',
      filters: [],
      confirmed: true,
    },
  ];

  const entities = [
    ...liveEntities,
    ...(result.draft.entities || []).map((e) => ({
      ...e,
      description: `${e.description || ''} (sample corpus — structure only)`,
    })),
  ];
  const metrics = [...liveMetrics, ...(result.draft.metrics || [])];
  const dimensions = (result.draft.dimensions || []).map((d) => ({
    ...d,
    dataType: d.dataType || d.type || 'categorical',
  }));

  const glossary = [
    ...(result.draft.glossary || []),
    {
      term: 'live data',
      definition:
        'Full orders/products/users in MongoDB. Sample paste only teaches field meanings; use live tools for real answers.',
    },
    {
      term: 'geo',
      definition:
        'Order deliveryAddress.lat / deliveryAddress.lng or user.location.coordinates; distance via haversine from store.',
    },
    {
      term: 'product radius query',
      definition:
        'resolve_product then count_unique_product_buyers with radius_km on live data.',
    },
  ];

  const base = mergeLearning ? await getLatestDraftOrActive(workspaceId) : null;
  const last = await LlmSemanticModel.findOne({ workspaceId }).sort({ version: -1 }).lean();
  const version = (last?.version || 0) + 1;

  let priorRecords = [];
  let priorCorpus = null;
  if (base?.corpusId) {
    priorCorpus = await LlmTrainingCorpus.findById(base.corpusId);
    priorRecords = priorCorpus?.records || [];
  }
  const mergedRecords = mergeLearning
    ? mergeCorpusRecords(priorRecords, result.records)
    : result.records;
  const recordCount = mergedRecords.length;

  let draftBrain = {
    name: options.modelName || `${result.label} · brain v${version}`,
    sessionLabel: result.label || 'Paste train',
    source: discovery ? 'hybrid' : 'unstructured',
    domain: result.domain,
    businessContext: options.businessContext || '',
    entities,
    metrics,
    dimensions,
    relationships: result.draft.relationships || [],
    glossary,
    jsonSchema: result.jsonSchema,
    textBrain: sessionText,
    parameters: result.parameters,
    liveFieldMap,
    queryPlan,
    trainingHints: [],
  };

  if (base) {
    draftBrain = mergePriorBrain(base, draftBrain);
    draftBrain.textBrain = mergeTextBrain(
      base.textBrain,
      sessionText,
      result.label || 'Paste train'
    );
  }

  const corpus = await LlmTrainingCorpus.create({
    workspaceId,
    label:
      mergeLearning && priorCorpus
        ? `${priorCorpus.label || 'Corpus'} + ${result.label}`
        : result.label,
    source: 'paste',
    domain: result.domain || priorCorpus?.domain || '',
    records: mergedRecords,
    recordCount,
    jsonSchema: draftBrain.jsonSchema,
    textBrain: draftBrain.textBrain,
    parameters: draftBrain.parameters,
    rawPreview: result.rawPreview,
    updatedAt: new Date(),
  });

  const extractionMeta = appendLearningSession(base?.extractionMeta, {
    source: discovery ? 'hybrid_paste' : 'paste',
    label: result.label || 'Paste train',
    recordCount: result.recordCount,
    cumulativeRecords: recordCount,
    collections: discovery?.collections?.map((c) => c.name) || selected || [],
    versionAfter: version,
    note:
      mergeLearning && base
        ? `Merged +${result.recordCount} paste records (kept prior learning)`
        : 'Fresh train',
    patch: {
      discoveryError,
      liveCollections: discovery?.collections?.length || 0,
      mode: 'live_first',
      includedCollections:
        selected || discovery?.collections?.map((c) => c.name) || [],
    },
  });

  const model = await LlmSemanticModel.create({
    workspaceId,
    schemaSnapshotId: snapshotId || base?.schemaSnapshotId || null,
    version,
    name: draftBrain.name,
    status: 'draft',
    source: draftBrain.source,
    domain: draftBrain.domain,
    businessContext: draftBrain.businessContext,
    entities: draftBrain.entities,
    metrics: draftBrain.metrics,
    dimensions: draftBrain.dimensions,
    relationships: draftBrain.relationships,
    glossary: draftBrain.glossary,
    jsonSchema: draftBrain.jsonSchema,
    textBrain: draftBrain.textBrain,
    parameters: draftBrain.parameters,
    liveFieldMap: draftBrain.liveFieldMap,
    queryPlan: draftBrain.queryPlan,
    trainingHints: draftBrain.trainingHints || [],
    corpusId: corpus._id,
    extractionMeta,
    updatedAt: new Date(),
  });

  corpus.modelId = model._id;
  await corpus.save();

  return {
    model: sanitizeModel(model),
    corpus: sanitizeCorpus(corpus, { includeRecords: true, recordLimit: 50 }),
    merged: Boolean(base),
    priorModelId: base ? String(base._id) : null,
    brain: {
      jsonSchema: draftBrain.jsonSchema,
      textBrain: draftBrain.textBrain,
      parameters: draftBrain.parameters,
      domain: draftBrain.domain,
      recordCount,
      extraction: extractionMeta,
      liveFieldMap: draftBrain.liveFieldMap,
      queryPlan: draftBrain.queryPlan,
      mode: 'live_first',
      learningSessions: extractionMeta.learningSessions || [],
    },
    discovery: discovery
      ? {
          collections: discovery.collections.map((c) => ({
            name: c.name,
            estimatedCount: c.estimatedCount,
            fieldCount: c.fields?.length || 0,
          })),
          relationships: discovery.relationships?.length || 0,
        }
      : null,
    discoveryError,
  };
}


export async function getCorpusForModel(model) {
  if (!model) return null;
  if (model.corpusId) {
    return LlmTrainingCorpus.findById(model.corpusId);
  }
  return LlmTrainingCorpus.findOne({
    workspaceId: model.workspaceId,
    modelId: model._id,
  }).sort({ updatedAt: -1 });
}

export async function getBrainPackage(workspaceId) {
  const model = await getLatestDraftOrActive(workspaceId);
  if (!model) {
    return { trained: false, model: null, corpus: null, brain: null, history: [] };
  }
  const corpus = await getCorpusForModel(model);
  const o = model.toObject?.() || model;
  const history =
    o.extractionMeta?.learningSessions ||
    o.extractionMeta?.sessions ||
    [];
  // Also surface recent model versions for the UI
  const recentModels = await LlmSemanticModel.find({ workspaceId })
    .sort({ version: -1 })
    .limit(20)
    .select(
      'version name status source domain createdAt updatedAt extractionMeta corpusId textBrain parameters entities metrics glossary liveFieldMap businessContext'
    )
    .lean();

  return {
    trained: o.status === 'active',
    model: sanitizeModel(model),
    corpus: corpus
      ? sanitizeCorpus(corpus, { includeRecords: true, recordLimit: 100 })
      : null,
    brain: {
      jsonSchema: o.jsonSchema || corpus?.jsonSchema || null,
      textBrain: o.textBrain || corpus?.textBrain || '',
      parameters: o.parameters || corpus?.parameters || [],
      domain: o.domain || corpus?.domain || '',
      recordCount: corpus?.recordCount || corpus?.records?.length || 0,
      source: o.source,
      extraction: o.extractionMeta,
      liveFieldMap: o.liveFieldMap || null,
      queryPlan: o.queryPlan || null,
      mode: o.queryPlan?.priority || (o.liveFieldMap ? 'live_first' : null),
      learningSessions: history,
      entities: o.entities || [],
      metrics: o.metrics || [],
      glossary: o.glossary || [],
    },
    history: recentModels.map((m) => ({
      id: String(m._id),
      version: m.version,
      name: m.name,
      status: m.status,
      source: m.source,
      domain: m.domain,
      sessions: m.extractionMeta?.learningSessions?.length || 0,
      learningSessions: m.extractionMeta?.learningSessions || [],
      textBrain: m.textBrain || '',
      textPreview: String(m.textBrain || '').slice(0, 600),
      parametersCount: (m.parameters || []).length,
      entitiesCount: (m.entities || []).length,
      metricsCount: (m.metrics || []).length,
      glossaryCount: (m.glossary || []).length,
      businessContext: m.businessContext || '',
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    })),
  };
}

export async function runTrainedSampleMetric(model, metricId, options = {}) {
  const corpus = await getCorpusForModel(model);
  if (!corpus?.records?.length) {
    return { type: 'error', error: 'No trained sample corpus found for this brain.' };
  }
  const id = String(metricId || '');
  let aggregation = 'count';
  let field = 'grandTotal';
  if (id.includes('revenue') || id.includes('sum')) aggregation = 'sum';
  else if (id.includes('aov') || id.includes('avg')) aggregation = 'avg';
  else if (id === 'trained_count' || id.includes('count')) aggregation = 'count';

  if (options.aggregation) aggregation = options.aggregation;
  if (options.field) field = options.field;

  const q = queryTrainedRecords(corpus.records, {
    aggregation,
    field,
    status: options.status,
    paymentMethod: options.paymentMethod,
    minTotal: options.minTotal,
    maxTotal: options.maxTotal,
    minDistanceM: options.minDistanceM,
    maxDistanceM: options.maxDistanceM,
  });

  const unit = q.unit === 'INR' ? 'INR' : q.unit;
  const display =
    unit === 'INR' && typeof q.value === 'number'
      ? `₹${Math.round(q.value).toLocaleString('en-IN')}`
      : String(q.value);

  return {
    type: 'metric',
    source: 'trained_samples',
    metricId: id,
    aggregation,
    field,
    value: q.value,
    unit: unit === 'INR' ? 'INR' : undefined,
    display,
    sampleSize: corpus.recordCount || corpus.records.length,
    calculationSteps: [
      `Loaded ${corpus.recordCount || corpus.records.length} trained paste records`,
      `Applied filters and ${aggregation} on ${field || 'rows'}`,
      `Result: ${display} (paste corpus only — not full live DB unless Mongo train was used)`,
    ],
    definitions: [
      {
        id: 'trained_samples',
        text: 'Values come from records extracted from the text you trained on.',
      },
    ],
    confidence: { overall: 0.9 },
  };
}

export function sanitizeCorpus(corpus, { includeRecords = false, recordLimit = 40 } = {}) {
  const o = corpus.toObject?.() || corpus;
  const out = {
    id: String(o._id),
    label: o.label,
    source: o.source,
    domain: o.domain,
    recordCount: o.recordCount || o.records?.length || 0,
    jsonSchema: o.jsonSchema,
    textBrain: o.textBrain,
    parameters: o.parameters || [],
    rawPreview: o.rawPreview,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
  if (includeRecords) {
    out.records = (o.records || []).slice(0, recordLimit);
  }
  return out;
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
    source: o.source || 'mongodb',
    domain: o.domain || '',
    entities: o.entities || [],
    metrics: o.metrics || [],
    dimensions: o.dimensions || [],
    relationships: o.relationships || [],
    glossary: o.glossary || [],
    businessContext: o.businessContext || '',
    trainingHints: o.trainingHints || [],
    jsonSchema: o.jsonSchema || null,
    textBrain: o.textBrain || '',
    parameters: o.parameters || [],
    liveFieldMap: o.liveFieldMap || null,
    queryPlan: o.queryPlan || null,
    corpusId: o.corpusId ? String(o.corpusId) : null,
    extractionMeta: o.extractionMeta || null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

/** Compact model context for LLM system prompt */
export function modelContextForPrompt(model) {
  if (!model) {
    return {
      trained: false,
      note: 'No semantic model trained yet. Use built-in Picoso tools (live Mongo) for analytics.',
    };
  }
  const m = model.toObject?.() || model;
  return {
    trained: true,
    name: m.name,
    status: m.status,
    source: m.source,
    domain: m.domain,
    mode: 'live_first',
    instruction:
      'COMPANY OPS CONSOLE. Full names/phones/distances are allowed. NEVER refuse exports for privacy. ALWAYS use live Mongo tools. Samples taught field meanings only. Use export_order_customers for list/export; count_registered_users for platform signups; never invent numbers.',
    businessContext: m.businessContext,
    liveFieldMap: m.liveFieldMap || null,
    queryPlan: m.queryPlan || null,
    parameters: (m.parameters || []).slice(0, 40).map((p) => ({
      name: p.name,
      type: p.type,
      description: p.description,
      enumValues: p.enumValues,
    })),
    entities: (m.entities || []).map((e) => ({
      id: e.id,
      name: e.name,
      collection: e.collectionName || e.collection,
      role: e.role,
      labelField: e.labelField,
    })),
    metrics: (m.metrics || []).slice(0, 40).map((metric) => ({
      id: metric.id,
      name: metric.name,
      aggregation: metric.aggregation,
      entity: metric.entity,
      field: metric.field,
      description: metric.description,
    })),
    dimensions: (m.dimensions || []).slice(0, 40).map((d) => ({
      id: d.id,
      name: d.name,
      entity: d.entity,
      field: d.field,
      type: d.dataType || d.type,
    })),
    relationships: (m.relationships || []).slice(0, 30),
    glossary: (m.glossary || []).slice(0, 30),
    trainingHints: (m.trainingHints || []).slice(-12),
    textBrainSummary: String(m.textBrain || '').slice(0, 2500),
    jsonSchemaTitle: m.jsonSchema?.title || null,
  };
}
