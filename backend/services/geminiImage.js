/**
 * Gemini image generation for WP Marketing.
 *
 * Gemini creates the illustrated art direction only. Exact campaign copy is
 * composited server-side afterwards, because generative models are unreliable
 * at spelling, variables, URLs, and brand names.
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

const LAYOUTS = [
  'editorial split composition: calm copy space on the left third, the product or subject staged prominently on the right',
  'playful celebration composition: an expressive illustrated scene with a soft, uncluttered upper area reserved for copy',
  'bold typographic composition: a strong visual subject emerging from the lower half with quiet negative space above',
  'product spotlight composition: one hero product or service moment, with a clean vertical copy zone along the left edge',
  'warm narrative composition: a clear beginning-to-action visual story, with a quiet lower band reserved for copy',
  'geometric modular composition: 2 or 3 intentional colour blocks and one hero illustration, with a clean central copy area',
  'seasonal editorial composition: tasteful themed details around the edges, leaving the centre calm and readable',
  'high-energy diagonal composition: movement from lower left to upper right, while the opposite corner stays quiet for copy',
  'minimal art-directed composition: one memorable object or character, generous negative space, and refined details',
  'premium announcement composition: a considered hero scene framed by subtle shapes, with a clear lower-third copy zone',
];

const STYLE_DIRECTIONS = {
  premium_poster: 'refined editorial illustration with confident geometry, tactile paper texture, and a premium magazine campaign finish',
  playful_illustration: 'warm playful illustrated scene with expressive characters or objects, soft organic shapes, and joyful handcrafted detail',
  editorial_collage: 'layered cut-paper collage with ink contours, overlapping forms, subtle print texture, and an art-school editorial finish',
  bold_typographic: 'high-contrast graphic campaign art with oversized visual shapes, strong scale contrast, and a striking poster composition',
};

function layoutFor(variant) {
  const n = Math.max(1, Number(variant.variantNumber || 1));
  return LAYOUTS[(n - 1) % LAYOUTS.length];
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
  const layout = layoutFor(variant);
  const style = STYLE_DIRECTIONS[opts.designType] || STYLE_DIRECTIONS.premium_poster;

  return [
    `Create one premium square (1:1) campaign artwork for "${businessName}".`,
    `Business (be literal and specific — show what they actually sell or deliver): ${businessDesc}.`,
    ``,
    `BRAND PALETTE (use these consistently in the scene and shapes):`,
    `- Primary: ${primary}`,
    `- Secondary: ${secondary}`,
    `- Accent: ${accent}`,
    ``,
    `ART DIRECTION: ${style}.`,
    `COMPOSITION: ${layout}.`,
    `- Full-bleed edge-to-edge composition. Fill the complete square with an intentional illustration, not a floating card.`,
    `- Use sophisticated flat colour blocking, tactile paper grain, clean ink outlines, controlled shadows, layered cut-paper forms, and small contextual details.`,
    `- Make the product, service, occasion, or action unmistakable. Build a visual metaphor around the actual offer, not generic abstract shapes.`,
    `- Use a restrained 3-5 colour system from the palette, with strong contrast and a clear focal point.`,
    `- Reserve approximately 35-45% of the canvas as calm, low-detail negative space for typesetting. Integrate that space into the composition rather than drawing a blank white panel.`,
    `- Artwork should feel like a professionally art-directed brand campaign: dimensional, balanced, intentional, and ready for a high-end social feed.`,
    ``,
    `TEXT AND BRANDING SAFETY:`,
    `- Do not render any letters, words, numbers, logos, watermarks, fake UI, or pseudo-text. The final exact copy and business name will be added after generation.`,
    `- No loyalty badges, shields, membership seals, crowns, award ribbons, or badge stacks.`,
    `- No stock-photo look, generic corporate handshake, random smiling headshots, other brand logos, or unrelated objects.`,
    `- No ornate certificate borders, gold frames, scrapbook sticker sheets, rainbow gradients, neon bloom, or metallic backgrounds.`,
    ``,
    `CAMPAIGN STORY FOR THIS VARIANT:`,
    `- Angle: ${variant.copyAngle || 'general'}`,
    `- Tone: ${variant.tone || 'premium'}`,
    `- Offer / idea: ${variant.offer || concept}`,
    `- Visual brief: ${concept}`,
    `- The artwork must communicate the offer visually even with the copy layer hidden.`,
    ``,
    `Output one polished, high-detail square illustration with no text.`,
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
        imageSize: process.env.GEMINI_IMAGE_SIZE || '2K',
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
          imageSize: process.env.GEMINI_IMAGE_SIZE || '2K',
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
