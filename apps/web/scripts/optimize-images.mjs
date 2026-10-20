// Build-time image pipeline: images-src/**.jpg → public/images/**-{width}.webp + a blur manifest.
// Run with `npm run images -w apps/web` after adding or replacing photos in apps/web/images-src.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'images-src');
const OUT = path.join(root, 'public/images');
const MANIFEST = path.join(root, 'src/lib/image-manifest.json');

// Widths per folder: product cards render ~300–450px wide (2x for retina); scenes up to full width.
const WIDTHS = { products: [480, 960], scenes: [640, 1280, 1920] };
const QUALITY = 72;

const manifest = {};
for (const folder of Object.keys(WIDTHS)) {
  const dir = path.join(SRC, folder);
  if (!fs.existsSync(dir)) continue;
  fs.mkdirSync(path.join(OUT, folder), { recursive: true });
  for (const file of fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f))) {
    const name = file.replace(/\.\w+$/, '');
    const input = sharp(path.join(dir, file)).rotate();
    const { width, height } = await input.metadata();
    const widths = [...new Set(WIDTHS[folder].map((w) => Math.min(w, width)))];
    let bytes = 0;
    for (const w of widths) {
      const out = path.join(OUT, folder, `${name}-${w}.webp`);
      const info = await input.clone().resize({ width: w }).webp({ quality: QUALITY, effort: 5 }).toFile(out);
      bytes += info.size;
    }
    // 24px-wide blurred preview, inlined as a data URI so it shows instantly.
    const blur = await input.clone().resize({ width: 24 }).blur(1.2).webp({ quality: 40 }).toBuffer();
    manifest[`/images/${folder}/${name}.jpg`] = {
      w: width, h: height,
      srcSet: widths.map((w) => `/images/${folder}/${name}-${w}.webp ${w}w`).join(', '),
      src: `/images/${folder}/${name}-${widths.at(-1)}.webp`,
      blur: `data:image/webp;base64,${blur.toString('base64')}`,
    };
    console.log(`${folder}/${name}: ${widths.join(', ')}px → ${(bytes / 1024).toFixed(0)} KB total`);
  }
}
fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 1)}\n`);
console.log(`Wrote ${Object.keys(manifest).length} entries to src/lib/image-manifest.json`);
