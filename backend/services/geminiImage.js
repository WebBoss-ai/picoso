/**
 * Gemini Nano Banana 2 Lite (gemini-3.1-flash-lite-image)
 * Square sticker-style images for WP Marketing variants.
 */

const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-lite-image';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

function apiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
}

function stickerPrompt(variant, businessName = 'Picoso') {
  const concept = variant.imageConceptDescription
    || `${variant.copyAngle || 'food marketing'} — ${variant.offer || 'delicious bowls'}`;
  return [
    `Create one square (1:1) Instagram-post style illustration for ${businessName}.`,
    `Style: flat sticker / die-cut sticker sheet aesthetic — bold outlines, soft pastel or vivid brand-friendly colours,`,
    `playful and premium, clean composition centered on a soft gradient or paper-texture background.`,
    `CRITICAL: NO photorealistic food, NO real photographs, NO stock photos, NO real people, NO logos of other brands.`,
    `Everything must look like cute vector stickers or illustrated sticker packs (bowls, chilli, leaves, spoons, hearts, clocks, sparkles as stickers).`,
    `Composition: square social post, balanced margins, Instagram-ready, high clarity at thumbnail size.`,
    `Minimal or no text in the image. If any text appears, keep it tiny and decorative only.`,
    `Variant angle: ${variant.copyAngle || 'general'}.`,
    `Tone: ${variant.tone || 'friendly'}.`,
    `Offer / idea: ${variant.offer || concept}.`,
    `Visual brief: ${concept}.`,
  ].join(' ');
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

  const prompt = stickerPrompt(variant, opts.businessName);

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

  // Older / alternate schema if responseFormat is rejected
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
