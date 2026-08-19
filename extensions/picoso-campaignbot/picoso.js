/* Sync PIN + API base from the WP Marketing page into extension storage. */

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.source !== 'picoso-wp-auth' || !data.pin) return;
  chrome.storage.local.set({
    pin: data.pin,
    apiBase: data.apiBase || 'https://picoso.in/api',
  });
  heartbeat(false);
});

async function heartbeat(onCampaignBot) {
  const { pin, apiBase } = await chrome.storage.local.get(['pin', 'apiBase']);
  if (!pin || !apiBase) return;
  try {
    await fetch(`${apiBase.replace(/\/$/, '')}/wp-marketing/helper/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-wp-pin': pin },
      body: JSON.stringify({ onCampaignBot: !!onCampaignBot }),
    });
  } catch { /* ignore */ }
}

setInterval(() => heartbeat(false), 8000);
heartbeat(false);
