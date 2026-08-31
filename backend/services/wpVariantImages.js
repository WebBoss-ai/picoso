/**
 * Generate square sticker images for every experiment variant via Gemini,
 * upload to wp-marketing-001, and persist mediaS3Url on each variant.
 */

import { WpExperiment } from '../models/wpMarketingModels.js';
import { generateStickerImage, geminiImageConfigured } from './geminiImage.js';
import { uploadWpMarketingImage } from '../utils/s3.js';
import { composeWpPoster } from './wpPosterComposer.js';

const CONCURRENCY = Number(process.env.WP_IMAGE_CONCURRENCY || 2);

async function patchVariant(experimentId, variantNumber, fields) {
  const set = {};
  for (const [k, v] of Object.entries(fields)) set[`variants.$.${k}`] = v;
  await WpExperiment.updateOne(
    { _id: experimentId, 'variants.variantNumber': variantNumber },
    { $set: { ...set, updatedAt: new Date() } },
  );
}

async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

export async function generateVariantImages(experimentId, opts = {}) {
  if (!geminiImageConfigured()) {
    console.warn('[WP Images] GEMINI_API_KEY missing — skipping sticker generation');
    return { generated: 0, failed: 0, skipped: true };
  }

  const experiment = await WpExperiment.findById(experimentId);
  if (!experiment) throw new Error('Experiment not found');

  const variants = (experiment.variants || []).filter((v) => {
    if (opts.force) return true;
    if (opts.variantNumbers?.length) return opts.variantNumbers.includes(v.variantNumber);
    return !v.mediaS3Url || v.imageGenStatus === 'failed';
  });

  if (!variants.length) {
    return { generated: 0, failed: 0, skipped: false, results: [] };
  }

  for (const v of variants) {
    await patchVariant(experimentId, v.variantNumber, {
      imageGenStatus: 'generating',
      imageGenError: '',
    });
  }

  const businessName = opts.businessName || 'Picoso';
  const posterOpts = {
    businessName,
    businessDescription: opts.businessDescription || '',
    colors: opts.colors || {},
    designType: opts.designType || 'premium_poster',
  };
  const results = await mapPool(variants, CONCURRENCY, async (v) => {
    try {
      const { buffer: generatedBuffer } = await generateStickerImage(v, posterOpts);
      const buffer = await composeWpPoster(generatedBuffer, v, posterOpts);
      const mimeType = 'image/png';
      const ext = 'png';
      const filename = `${(v.templateName || `variant_${v.variantNumber}`).slice(0, 40)}_${v.variantNumber}.${ext}`;
      const uploaded = await uploadWpMarketingImage(buffer, mimeType, filename);

      await patchVariant(experimentId, v.variantNumber, {
        mediaS3Url: uploaded.url,
        imageGenStatus: 'ready',
        imageGenError: '',
        // Keep template header as IMAGE for preview; CampaignBot publish still uses NONE unless media is attached there
        headerType: 'IMAGE',
      });

      console.log(`[WP Images] ${v.label} → ${uploaded.url}`);
      return { variantNumber: v.variantNumber, ok: true, url: uploaded.url };
    } catch (err) {
      console.error(`[WP Images] ${v.label} failed:`, err.message);
      await patchVariant(experimentId, v.variantNumber, {
        imageGenStatus: 'failed',
        imageGenError: err.message,
      });
      return { variantNumber: v.variantNumber, ok: false, error: err.message };
    }
  });

  return {
    generated: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    skipped: false,
    results,
  };
}
