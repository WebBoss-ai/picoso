/**
 * Gemini Nano Banana 2 Lite — square premium business posters for WP Marketing.
 * Sticker-illustrated language, full-bleed modern composition (no badges / gradients).
 */

const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-lite-image';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

function apiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
}

function normaliseHex(c, fallback) {
  const s = String(c || '').trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(s)) return s.toUpperCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(s)) {
    return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`.toUpperCase();
  }
  return fallback;
}

function posterPrompt(variant, opts = {}) {
  const businessName = opts.businessName || 'Picoso';
  const businessDesc = (opts.businessDescription || '').trim()
    || `${businessName} — food delivery business`;
  const colors = opts.colors || {};
  const primary = normaliseHex(colors.primary, '#1C1917');
  const secondary = normaliseHex(colors.secondary, '#F97316');
  const accent = normaliseHex(colors.accent, '#FEF3C7');

  const concept = variant.imageConceptDescription
    || `${variant.copyAngle || 'campaign'} — ${variant.offer || 'offer'}`;

  return [
    `Design one square (1:1) Instagram marketing POSTER for "${businessName}".`,
    `Business (be literal and specific — show what they actually sell/deliver): ${businessDesc}.`,
    ``,
    `BRAND COLOURS (use these as flat solid colours only — no blends between them as gradients):`,
    `- Primary: ${primary}`,
    `- Secondary: ${secondary}`,
    `- Accent: ${accent}`,
    ``,
    `VISUAL SYSTEM — premium modern UI poster:`,
    `- Full-bleed edge-to-edge composition. Fill the entire square. No outer frame, no polaroid border, no card inset, no matte/passepartout, no paper sheet floating on a background.`,
    `- Solid flat colour fields or soft paper/noise texture only. ABSOLUTELY NO colour gradients, NO glow, NO neon bloom, NO metallic shine backgrounds.`,
    `- Illustration language may use sticker-like vector shapes (bold clean outlines, simplified icons) but they must feel integrated into one premium poster layout — NOT a sticker scrapbook, NOT a scattered sticker sheet.`,
    `- Modern typography if any text: geometric sans or refined display type, tight tracking, editorial hierarchy. No hand-lettered scrapbook fonts, no chalk, no comic lettering.`,
    `- Sparse, intentional layout with strong hierarchy and breathing room. Premium SaaS / Dribbble / Apple-marketing quality.`,
    ``,
    `STRICT BANS:`,
    `- No loyalty badges, no shields, no "EXCLUSIVE MEMBER" seals, no crowns, no winged clocks as hero badges, no award ribbons.`,
    `- No photoreal photos, no stock photos, no real people faces, no other brand logos.`,
    `- No traditional ornate borders, gold frames, certificate looks, or badge-on-badge stacks.`,
    `- No rainbow gradients or multi-stop colour washes.`,
    ``,
    `CONTENT FOR THIS VARIANT:`,
    `- Angle: ${variant.copyAngle || 'general'}`,
    `- Tone: ${variant.tone || 'premium'}`,
    `- Offer / idea: ${variant.offer || concept}`,
    `- Visual brief: ${concept}`,
    `- Optional short headline text related to the offer (max ~6 words). Prefer visual storytelling over text.`,
    ``,
    `Output a single polished square poster, ready as a WhatsApp / Instagram header.`,
  ].join('\n');
}

function extractImage(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    const inline = part.inlineData || part.inline_data;
    if (inline?.data) {
      return {
        buffer: Buffer.from(inline.data, 'base64'),
        mimeType: inline.mimeType || inline.mime_type || 'image/png',
      };
    }
  }
  return null;
}

/**
 * @returns {{ buffer: Buffer, mimeType: string }}
 */
export async function generateStickerImage(variant, opts = {}) {
  const key = apiKey();
  if (!key) throw new Error('GEMINI_API_KEY is not set on the server');

  const prompt = posterPrompt(variant, opts);

  async function call(body) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch {
      throw new Error(`Gemini image API returned non-JSON (${res.status})`);
    }
    return { res, data, text };
  }

  const base = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  };

  let { res, data, text } = await call({
    ...base,
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      responseFormat: {
        image: {
          aspectRatio: '1:1',
          imageSize: process.env.GEMINI_IMAGE_SIZE || '1K',
        },
      },
    },
  });

  if (!res.ok && /responseFormat|imageConfig|Unknown name|INVALID_ARGUMENT/i.test(data?.error?.message || text)) {
    ({ res, data, text } = await call({
      ...base,
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio: '1:1',
          imageSize: process.env.GEMINI_IMAGE_SIZE || '1K',
        },
      },
    }));
  }

  if (!res.ok) {
    const msg = data?.error?.message || text.slice(0, 240);
    throw new Error(`Gemini image failed (${res.status}): ${msg}`);
  }

  const image = extractImage(data);
  if (!image) {
    throw new Error('Gemini returned no image bytes — try again');
  }
  return image;
}

export function geminiImageConfigured() {
  return Boolean(apiKey());
}

export { posterPrompt };
