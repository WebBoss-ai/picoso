/**
 * Local webhook self-test — no HTTP round-trip (avoids polluting diagnostics).
 */

import {
  buildWebhookSignature,
  verifyWebhookSignature,
  getWebhookSecretCandidates,
} from './wpWebhookSignature.js';
import { extractInboundMessagesWithDebug } from './wpWebhookExtract.js';
import { isSelfVerifyRequest } from './wpWebhookVerify.js';

export function runLocalWebhookSelfTest() {
  const samplePayload = {
    event: 'incoming_message',
    meta_raw: {},
    meta_contacts: [],
    meta_metadata: {},
    processed: {
      message_id: 'wamid.LOCAL_SELFTEST',
      from: '+919999999999',
      type: 'text',
      text: '__picoso_webhook_verify__',
      timestamp: new Date().toISOString(),
      media: { id: null, url: null },
    },
    system: { received_at: new Date().toISOString(), source: 'local_self_test' },
  };
  const rawBody = JSON.stringify(samplePayload);
  const secrets = getWebhookSecretCandidates();
  const primarySecret = secrets[0] || '';
  const signature = primarySecret ? buildWebhookSignature(rawBody, primarySecret) : null;
  const sigCheck = signature
    ? verifyWebhookSignature(rawBody, signature, secrets)
    : { ok: false, reason: 'no secret configured' };
  const { messages } = extractInboundMessagesWithDebug(samplePayload, rawBody);
  const mockReq = { headers: { 'x-webhook-verify': 'picoso-self-test' } };

  return {
    ok: messages.length === 1 && isSelfVerifyRequest(mockReq, samplePayload, messages),
    mode: 'local',
    parserOk: messages.length === 1,
    signatureMathOk: sigCheck.ok,
    secretsConfigured: secrets.length,
    webhookSecretEnvSet: !!process.env.CAMPAIGNBOT_WEBHOOK_SECRET,
    detail: `parser=${messages.length} msg(s), signature=${sigCheck.ok ? 'ok' : sigCheck.reason}`,
  };
}
