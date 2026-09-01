/**
 * Detect picoso self-test / verify webhook pings vs real CampaignBot traffic.
 */

export function isSelfVerifyRequest(req, body = {}, inbounds = []) {
  if (req?.headers?.['x-webhook-verify'] === 'picoso-self-test') return true;
  if (body?.system?.source === 'self_verify') return true;
  if (String(body?.processed?.text || '').includes('__picoso_webhook_verify__')) return true;
  if (String(body?.processed?.message_id || '').startsWith('wamid.VERIFY')) return true;
  for (const inbound of inbounds) {
    if (String(inbound?.text || '').includes('__picoso_webhook_verify__')) return true;
    if (String(inbound?.messageId || '').startsWith('wamid.VERIFY')) return true;
  }
  return false;
}

/** Mongo filter — exclude self-test rows (works for legacy rows without isVerify). */
export const REAL_WEBHOOK_QUERY = {
  $and: [
    { isVerify: { $ne: true } },
    { text: { $not: /__picoso_webhook_verify__/ } },
    { from: { $ne: '+919999999999' } },
    { note: { $not: /wamid\.VERIFY/i } },
  ],
};
