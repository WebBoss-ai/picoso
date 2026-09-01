/**
 * In-memory webhook delivery diagnostics — proves whether CampaignBot POSTs
 * actually reach this Node process (independent of MongoDB logging).
 */

const state = {
  serverStartedAt: new Date().toISOString(),
  totalHits: 0,
  totalPosts: 0,
  lastHitAt: null,
  lastPostAt: null,
  lastPostIp: null,
  lastPostUserAgent: null,
  lastPostContentType: null,
  lastPostBytes: 0,
  lastPostEvent: null,
  lastPostRequestId: null,
  lastPostBodyPreview: null,
  lastPostSignature: null,
  recentHits: [],
};

function clientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || 'unknown';
}

export function recordWebhookHit(req, meta = {}) {
  const at = new Date().toISOString();
  const entry = {
    at,
    method: req.method,
    path: req.originalUrl || req.path,
    ip: clientIp(req),
    userAgent: req.headers['user-agent'] || '',
    contentType: req.headers['content-type'] || '',
    bytes: meta.bytes || 0,
    event: meta.event || req.body?.event || null,
    requestId: meta.requestId || req.webhookRequestId || null,
    signature: req.headers['x-webhook-signature'] ? 'present' : 'missing',
    bodyPreview: meta.bodyPreview || String(req.rawBody || '').slice(0, 500),
  };

  state.totalHits += 1;
  if (req.method === 'POST') state.totalPosts += 1;
  state.lastHitAt = at;
  if (req.method === 'POST') {
    state.lastPostAt = at;
    state.lastPostIp = entry.ip;
    state.lastPostUserAgent = entry.userAgent;
    state.lastPostContentType = entry.contentType;
    state.lastPostBytes = entry.bytes;
    state.lastPostEvent = entry.event;
    state.lastPostRequestId = entry.requestId;
    state.lastPostBodyPreview = entry.bodyPreview;
    state.lastPostSignature = entry.signature;
  }

  state.recentHits.unshift(entry);
  if (state.recentHits.length > 30) state.recentHits.length = 30;

  console.log(
    `[WP WebhookDiag] ${req.method} ${entry.path} ip=${entry.ip} event=${entry.event || 'none'} ` +
    `bytes=${entry.bytes} ua=${entry.userAgent.slice(0, 60)}`,
  );
}

export function getWebhookDiagnostics() {
  const now = Date.now();
  const lastPostMs = state.lastPostAt ? now - new Date(state.lastPostAt).getTime() : null;
  return {
    ...state,
    minutesSinceLastPost: lastPostMs != null ? Math.floor(lastPostMs / 60000) : null,
    secondsSinceLastPost: lastPostMs != null ? Math.floor(lastPostMs / 1000) : null,
    postStale: lastPostMs == null || lastPostMs > 5 * 60 * 1000,
  };
}

export function analyzeRootCause({ diagnostics, lastWebhookAt, sync, cbConnected }) {
  const causes = [];
  const minutesSinceWebhook = lastWebhookAt
    ? Math.floor((Date.now() - new Date(lastWebhookAt).getTime()) / 60000)
    : null;

  if (diagnostics.totalPosts === 0) {
    causes.push({
      severity: 'critical',
      code: 'NO_POST_EVER',
      title: 'Zero POST requests ever reached this server',
      detail: 'CampaignBot has never successfully hit this Node process. The webhook URL in CampaignBot dashboard may be wrong, or their delivery is broken.',
      action: 'Set webhook URL to https://picoso.in/api/webhooks/campaignbot exactly. Then send a WhatsApp message and click "Run verification" below.',
    });
  } else if (diagnostics.postStale || (minutesSinceWebhook != null && minutesSinceWebhook > 5)) {
    causes.push({
      severity: 'critical',
      code: 'CAMPAIGNBOT_NOT_DELIVERING',
      title: `CampaignBot stopped delivering (${minutesSinceWebhook ?? diagnostics.minutesSinceLastPost}+ min since last POST)`,
      detail: `Last POST to server: ${diagnostics.lastPostAt || 'never'} from IP ${diagnostics.lastPostIp || 'unknown'}. Your WhatsApp messages are NOT triggering new webhooks to picoso.in.`,
      action: 'In CampaignBot: re-save webhook URL, enable incoming_message, verify WhatsApp number is connected. Contact CampaignBot support — their side is not firing webhooks.',
    });
  }

  if (diagnostics.lastPostIp && !/campaignbot|meta|facebook|aws|cloudflare/i.test(diagnostics.lastPostUserAgent || '')) {
    causes.push({
      severity: 'info',
      code: 'LAST_POST_NOT_CAMPAIGNBOT',
      title: 'Last POST was not from CampaignBot',
      detail: `Last POST user-agent: ${diagnostics.lastPostUserAgent || 'empty'}. It may have been a manual test, not CampaignBot.`,
      action: null,
    });
  }

  if (sync?.lastError) {
    causes.push({
      severity: 'warning',
      code: 'SYNC_FETCH_FAILED',
      title: 'CampaignBot pull API unavailable',
      detail: sync.lastError + (sync.lastFetchBody ? ` — ${JSON.stringify(sync.lastFetchBody).slice(0, 200)}` : ''),
      action: 'Inbound messages cannot be pulled — only CampaignBot webhooks can deliver them.',
    });
  }

  if (cbConnected === false) {
    causes.push({
      severity: 'warning',
      code: 'CB_API_DOWN',
      title: 'CampaignBot API not connected',
      detail: 'Cannot send replies or verify account via API.',
      action: 'Check CAMPAIGNBOT_API_KEY and WhatsApp connection in CampaignBot dashboard.',
    });
  }

  if (!causes.length) {
    causes.push({
      severity: 'ok',
      code: 'HEALTHY',
      title: 'Webhooks arriving normally',
      detail: 'Recent POST received and logged.',
      action: null,
    });
  }

  return causes;
}
