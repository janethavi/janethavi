/**
 * Regenerates the favicon set from the Bitmoji.
 *
 *   node scripts/make-icons.mjs
 *
 * The source is a 512px full-body figure — unreadable once shrunk to a browser
 * tab — so this crops the head, flattens it onto the site's periwinkle accent
 * (transparent favicons render badly on iOS and in dark browser chrome) and
 * writes every size the browsers, iOS and the web manifest each want.
 */
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

const SRC = 'public/images/cropped-bitmoji-20190612081223-1-YD04BnzpqvueRqWY.png';
const HEAD = { left: 288, top: 100, width: 175, height: 175 };
const BG = '#89b0f5'; // periwinkle — the site's accent

const head = await sharp(SRC).extract(HEAD).toBuffer();
const at = (size, background = BG) =>
  sharp(head).resize(size, size).flatten({ background }).png({ compressionLevel: 9, palette: true }).toBuffer();

/** ICO container wrapping PNGs — supported everywhere that matters. */
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + images.length * 16;
  const entries = [];
  for (const { size, data } of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2); // palette
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const ico = [16, 32, 48];
await writeFile(
  'public/favicon.ico',
  buildIco(await Promise.all(ico.map(async (size) => ({ size, data: await at(size) }))))
);

await writeFile('public/icons/icon-96.png', await at(96));
await writeFile('public/icons/icon-192.png', await at(192));
await writeFile('public/icons/icon-512.png', await at(512));
// iOS composites transparency onto black, so this one is deliberately opaque too.
await writeFile('public/apple-touch-icon.png', await at(180));

// Maskable icons get cropped to a circular safe zone, so the head sits in the
// middle 80% with periwinkle padding around it.
const inner = await sharp(head).resize(410, 410).toBuffer();
await writeFile(
  'public/icons/icon-maskable-512.png',
  await sharp({ create: { width: 512, height: 512, channels: 4, background: BG } })
    .composite([{ input: inner, left: 51, top: 51 }])
    .png({ compressionLevel: 9, palette: true })
    .toBuffer()
);

process.stdout.write(`favicon.ico (${ico.join('/')}), icon-96/192/512, maskable-512, apple-touch-icon\n`);
