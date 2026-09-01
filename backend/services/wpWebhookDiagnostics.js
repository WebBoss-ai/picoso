/**
 * In-memory webhook delivery diagnostics — proves whether CampaignBot POSTs
 * actually reach this Node process (independent of MongoDB logging).
 */

const state = {
  serverStartedAt: new Date().toISOString(),
  totalHits: 0,
  totalPosts: 0,
  totalRealPosts: 0,
  totalVerifyPosts: 0,
  lastHitAt: null,
  lastPostAt: null,
  lastRealPostAt: null,
  lastVerifyPostAt: null,
  lastPostIp: null,
  lastRealPostIp: null,
  lastPostUserAgent: null,
  lastRealPostUserAgent: null,
  lastPostContentType: null,
  lastPostBytes: 0,
  lastPostEvent: null,
  lastRealPostEvent: null,
  lastPostRequestId: null,
  lastPostBodyPreview: null,
  lastRealPostBodyPreview: null,
  lastPostSignature: null,
  recentHits: [],
  recentRealHits: [],
};

function clientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || 'unknown';
}

export function recordWebhookHit(req, meta = {}) {
  const at = new Date().toISOString();
  const isVerify = meta.isVerify === true
    || req.headers['x-webhook-verify'] === 'picoso-self-test'
    || String(meta.bodyPreview || '').includes('__picoso_webhook_verify__')
    || String(meta.bodyPreview || '').includes('"source":"self_verify"');
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
    isVerify,
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

    if (isVerify) {
      state.totalVerifyPosts += 1;
      state.lastVerifyPostAt = at;
    } else {
      state.totalRealPosts += 1;
      state.lastRealPostAt = at;
      state.lastRealPostIp = entry.ip;
      state.lastRealPostUserAgent = entry.userAgent;
      state.lastRealPostEvent = entry.event;
      state.lastRealPostBodyPreview = entry.bodyPreview;
      state.recentRealHits.unshift(entry);
      if (state.recentRealHits.length > 20) state.recentRealHits.length = 20;
    }
  }

  state.recentHits.unshift(entry);
  if (state.recentHits.length > 30) state.recentHits.length = 30;

  console.log(
    `[WP WebhookDiag] ${req.method} ${entry.path} ip=${entry.ip} event=${entry.event || 'none'} ` +
    `bytes=${entry.bytes} verify=${isVerify} ua=${entry.userAgent.slice(0, 60)}`,
  );
}

export function getWebhookDiagnostics() {
  const now = Date.now();
  const lastRealMs = state.lastRealPostAt ? now - new Date(state.lastRealPostAt).getTime() : null;
  const lastPostMs = state.lastPostAt ? now - new Date(state.lastPostAt).getTime() : null;
  return {
    ...state,
    minutesSinceLastPost: lastPostMs != null ? Math.floor(lastPostMs / 60000) : null,
    secondsSinceLastPost: lastPostMs != null ? Math.floor(lastPostMs / 1000) : null,
    postStale: lastPostMs == null || lastPostMs > 5 * 60 * 1000,
    minutesSinceLastRealPost: lastRealMs != null ? Math.floor(lastRealMs / 60000) : null,
    secondsSinceLastRealPost: lastRealMs != null ? Math.floor(lastRealMs / 1000) : null,
    realPostStale: lastRealMs == null || lastRealMs > 5 * 60 * 1000,
  };
}

export function analyzeRootCause({ diagnostics, lastWebhookAt, sync, cbConnected }) {
  const causes = [];
  const lastRealAt = diagnostics.lastRealPostAt || lastWebhookAt;
  const minutesSinceReal = lastRealAt
    ? Math.floor((Date.now() - new Date(lastRealAt).getTime()) / 60000)
    : null;

  if (diagnostics.totalRealPosts === 0) {
    causes.push({
      severity: 'critical',
      code: 'NO_REAL_POST_EVER',
      title: 'CampaignBot has never POSTed a real WhatsApp message',
      detail: diagnostics.totalVerifyPosts > 0
        ? `Only ${diagnostics.totalVerifyPosts} picoso self-test POST(s) reached the server — not CampaignBot traffic.`
        : 'CampaignBot has never successfully hit this Node process. The webhook URL in CampaignBot dashboard may be wrong, or their delivery is broken.',
      action: 'Set webhook URL to https://picoso.in/api/webhooks/campaignbot exactly. Send a WhatsApp message, then click Run verification (do not rely on self-test alone).',
    });
  } else if (diagnostics.realPostStale || (minutesSinceReal != null && minutesSinceReal > 5)) {
    causes.push({
      severity: 'critical',
      code: 'CAMPAIGNBOT_NOT_DELIVERING',
      title: `CampaignBot stopped delivering (${minutesSinceReal ?? diagnostics.minutesSinceLastRealPost}+ min since last real POST)`,
      detail: `Last real POST: ${diagnostics.lastRealPostAt || 'never'} from IP ${diagnostics.lastRealPostIp || 'unknown'}. Your WhatsApp messages are NOT triggering new webhooks to picoso.in.`,
      action: 'In CampaignBot: re-save webhook URL, enable incoming_message, verify WhatsApp number is connected. Contact CampaignBot support — their side is not firing webhooks.',
    });
  }

  if (diagnostics.totalVerifyPosts > 0 && diagnostics.totalRealPosts === 0) {
    causes.push({
      severity: 'info',
      code: 'ONLY_SELF_TEST',
      title: 'Self-test passes but CampaignBot is silent',
      detail: `Picoso verification POSTs work (${diagnostics.totalVerifyPosts} self-test hits). This proves the endpoint is live — CampaignBot simply is not sending real messages.`,
      action: null,
    });
  }

  if (diagnostics.lastRealPostIp && !/campaignbot|meta|facebook|aws|cloudflare/i.test(diagnostics.lastRealPostUserAgent || '')) {
    causes.push({
      severity: 'info',
      code: 'LAST_POST_NOT_CAMPAIGNBOT',
      title: 'Last real POST was not from CampaignBot',
      detail: `Last real POST user-agent: ${diagnostics.lastRealPostUserAgent || 'empty'}. It may have been a manual test, not CampaignBot.`,
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
