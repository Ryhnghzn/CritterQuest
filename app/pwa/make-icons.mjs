// Renders pwa/icon.js to public/icons/*.png in a headless Chrome:
//   node pwa/make-icons.mjs <path to chrome>   (run from app/; playwright-core must resolve from the script's folder)
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const src = readFileSync('pwa/icon.js', 'utf8').replace('export function', 'function');
const browser = await chromium.launch({ executablePath: process.argv[2] || '/bin/google-chrome' });
const page = await browser.newPage();
mkdirSync('public/icons', { recursive: true });
for (const [name, size, pad] of [['icon-192', 192, 0.06], ['icon-512', 512, 0.06], ['icon-maskable-512', 512, 0.16], ['apple-touch-icon', 180, 0.08]]) {
  const url = await page.evaluate(([s, size, pad]) => {
    eval(s); // defines drawIcon
    const c = document.createElement('canvas'); c.width = c.height = size;
    drawIcon(c.getContext('2d'), size, pad);
    return c.toDataURL('image/png');
  }, [src, size, pad]);
  writeFileSync(`public/icons/${name}.png`, Buffer.from(url.split(',')[1], 'base64'));
}
await browser.close();
