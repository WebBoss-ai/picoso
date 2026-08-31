/**
 * Turns Gemini's illustration into a finished campaign poster.
 *
 * Generative image models are poor at exact spelling and layout. Keep the
 * artwork generative, but render the business name, offer, message and CTA
 * deterministically so every poster is usable in a real campaign.
 */

import sharp from 'sharp';

const SIZE = 1080;

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function text(value, max = 180) {
  return String(value || '')
    .replace(/\{\{\d+\}\}/g, '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function hex(value, fallback) {
  const candidate = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(candidate) ? candidate : fallback;
}

function luminance(color) {
  const rgb = color.slice(1).match(/.{2}/g).map((v) => parseInt(v, 16) / 255);
  const linear = rgb.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function wrap(value, maxChars, maxLines) {
  const words = text(value).split(' ').filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && next.length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  lines.length = maxLines;
  lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[.,;:!? ]+$/, '')}…`;
  return lines;
}

function linesMarkup(lines, x, y, size, lineHeight, attrs = '') {
  return lines.map((line, index) =>
    `<text x="${x}" y="${y + index * lineHeight}" font-size="${size}" ${attrs}>${escapeXml(line)}</text>`
  ).join('');
}

function layout(number) {
  const n = (Math.max(1, Number(number) || 1) - 1) % 5;
  return [
    { x: 46, y: 62, w: 468, h: 956, titleSize: 62, maxTitle: 16, panel: 'left' },
    { x: 58, y: 62, w: 964, h: 438, titleSize: 60, maxTitle: 30, panel: 'top' },
    { x: 50, y: 600, w: 980, h: 450, titleSize: 62, maxTitle: 28, panel: 'bottom' },
    { x: 54, y: 512, w: 508, h: 510, titleSize: 60, maxTitle: 17, panel: 'left' },
    { x: 54, y: 590, w: 972, h: 460, titleSize: 60, maxTitle: 29, panel: 'bottom' },
  ][n];
}

function posterSvg(variant, opts = {}) {
  const primary = hex(opts.colors?.primary, '#1C1917');
  const secondary = hex(opts.colors?.secondary, '#F97316');
  const accent = hex(opts.colors?.accent, '#FEF3C7');
  const l = layout(variant.variantNumber);
  const business = text(opts.businessName || 'Picoso', 42);
  const eyebrow = text(variant.copyAngle || variant.tone || 'A little something for you', 42).toUpperCase();
  const title = text(variant.offer || variant.headerText || variant.cta || 'Made for your moment', 90);
  const body = text(variant.body || variant.message || '', 150);
  const cta = text(variant.cta || variant.buttons?.[0]?.text || 'Learn more', 24);
  const titleLines = wrap(title, l.maxTitle, l.panel === 'top' || l.panel === 'bottom' ? 2 : 3);
  const bodyLines = wrap(body, l.panel === 'top' ? 78 : 36, l.panel === 'top' || l.panel === 'bottom' ? 2 : 4);
  const panelFill = luminance(primary) > 0.48 ? accent : primary;
  const panelText = luminance(panelFill) > 0.48 ? '#1C1917' : '#FFFFFF';
  const panelOpacity = l.panel === 'top' ? 0.94 : 0.91;
  const titleY = l.y + 142;
  const bodyY = titleY + titleLines.length * (l.titleSize * 0.92) + 30;
  const ctaY = Math.min(l.y + l.h - 62, bodyY + bodyLines.length * 28 + 52);
  const rx = l.panel === 'top' ? 42 : 34;
  const font = 'Arial, Helvetica, sans-serif';
  const displayFont = 'Georgia, Times New Roman, serif';

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000000" flood-opacity="0.16"/>
        </filter>
      </defs>
      <rect x="${l.x}" y="${l.y}" width="${l.w}" height="${l.h}" rx="${rx}" fill="${panelFill}" fill-opacity="${panelOpacity}" filter="url(#shadow)"/>
      <circle cx="${l.x + l.w - 42}" cy="${l.y + 42}" r="12" fill="${secondary}"/>
      <rect x="${l.x + 32}" y="${l.y + 78}" width="54" height="5" rx="2.5" fill="${secondary}"/>
      <text x="${l.x + 32}" y="${l.y + 54}" fill="${panelText}" fill-opacity="0.72" font-family="${font}" font-size="16" font-weight="700" letter-spacing="2">${escapeXml(eyebrow)}</text>
      <text x="${l.x + 32}" y="${l.y + 120}" fill="${panelText}" font-family="${font}" font-size="22" font-weight="800" letter-spacing="1">${escapeXml(business)}</text>
      ${linesMarkup(titleLines, l.x + 32, titleY, l.titleSize, l.titleSize * 0.92, `fill="${panelText}" font-family="${displayFont}" font-weight="700"`)}
      ${linesMarkup(bodyLines, l.x + 32, bodyY, 23, 29, `fill="${panelText}" fill-opacity="0.86" font-family="${font}" font-weight="500"`)}
      <rect x="${l.x + 32}" y="${ctaY - 32}" width="${Math.max(150, cta.length * 13 + 50)}" height="52" rx="26" fill="${secondary}"/>
      <text x="${l.x + 57}" y="${ctaY + 2}" fill="${luminance(secondary) > 0.52 ? '#1C1917' : '#FFFFFF'}" font-family="${font}" font-size="19" font-weight="800">${escapeXml(cta)}</text>
    </svg>
  `;
}

export async function composeWpPoster(buffer, variant, opts = {}) {
  const svg = Buffer.from(posterSvg(variant, opts));
  return sharp(buffer)
    .rotate()
    .resize(SIZE, SIZE, { fit: 'cover', position: 'centre', withoutEnlargement: false })
    .composite([{ input: svg, blend: 'over' }])
    .png({ compressionLevel: 9, quality: 96 })
    .toBuffer();
}

