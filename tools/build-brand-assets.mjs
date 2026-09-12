// Generate every site-owned WB bitmap from the approved vector.
// Run: node tools/build-brand-assets.mjs (requires Playwright + Chromium).
import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const source = await readFile(new URL('assets/brand/wb.svg', root), 'utf8');
const foreground = source.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const wrapped = (scale = 1) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" color="#fff"><rect width="512" height="512" fill="#0a0a09"/><g transform="translate(256 256) scale(${scale}) translate(-256 -256)">${foreground}</g></svg>`;
await writeFile(new URL('favicon.svg', root), wrapped());
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const render = async (svg, width, height = width) => Buffer.from(await page.evaluate(async ({svg,width,height}) => {
    const img = new Image();
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    await img.decode();
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/png').split(',')[1];
  }, {svg,width,height}), 'base64');
  for (const [file,size,scale] of [
    ['favicon.png',48,1], ['apple-touch-icon.png',180,1],
    ['icon-192.png',192,1], ['icon-512.png',512,1],
    ['icon-maskable-192.png',192,0.88], ['icon-maskable-512.png',512,0.88],
    ['assets/icons/wabbazzar.png',512,1],
  ]) {
    await writeFile(new URL(file, root), await render(wrapped(scale), size));
    console.log(file, size);
  }
  // ICO fallback covers pages/browsers that request /favicon.ico implicitly.
  const sizes = [16,32,48], pngs = [];
  for (const size of sizes) pngs.push(await render(wrapped(), size));
  const header = Buffer.alloc(6 + 16 * sizes.length);
  header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  sizes.forEach((size, i) => {
    const p = 6 + i * 16; header[p] = header[p+1] = size;
    header.writeUInt16LE(1,p+4); header.writeUInt16LE(32,p+6);
    header.writeUInt32LE(pngs[i].length,p+8); header.writeUInt32LE(offset,p+12);
    offset += pngs[i].length;
  });
  await writeFile(new URL('favicon.ico', root), Buffer.concat([header,...pngs]));
  // The existing homepage/writing share-image references previously had no file.
  const preview = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" color="#fff"><rect width="1200" height="630" fill="#0a0a09"/><g transform="translate(32 69) scale(0.95)">${foreground}</g><text x="562" y="300" fill="#f5f5f4" font-family="Arial,sans-serif" font-size="66" font-weight="600">wabbazzar</text><text x="566" y="359" fill="#aaa9a5" font-family="Arial,sans-serif" font-size="26">Apps &amp; writing by Wesley Beckner.</text></svg>`;
  await writeFile(new URL('preview.png', root), await render(preview,1200,630));
  console.log('favicon.ico, preview.png');
} finally { await browser.close(); }
