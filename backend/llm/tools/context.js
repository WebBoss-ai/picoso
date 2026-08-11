/** Per-request agent tool context (workspace + trained model). */
let _ctx = {
  workspaceId: null,
  model: null,
};

export function setToolContext(partial = {}) {
  _ctx = { ..._ctx, ...partial };
}

export function getToolContext() {
  return _ctx || {};
}

export function clearToolContext() {
  _ctx = { workspaceId: null, model: null };
}
