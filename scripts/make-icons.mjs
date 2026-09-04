/**
 * Regenerates the favicon set from the Bitmoji.
 *
 *   node scripts/make-icons.mjs
 *
 * The source is a 512px full-body figure — unreadable once shrunk to a browser
 * tab — so this crops the head, sits it on a periwinkle disc (the site's accent;
 * a flat background beats transparency in dark browser chrome) and writes every
 * size the browsers, iOS and the web manifest each want.
 *
 * The tab and manifest icons are circles: browsers and Android draw them
 * untouched, and a disc reads as a portrait rather than a pasted-on tile. The
 * two the platform masks itself — apple-touch-icon and the maskable — stay
 * full-bleed squares, or iOS would composite the circle's corners onto black.
 */
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

const SRC = 'public/images/cropped-bitmoji-20190612081223-1-YD04BnzpqvueRqWY.png';
// Framed wider than the head itself so the hat brim and chin clear the circle.
const HEAD = { left: 262, top: 96, width: 196, height: 196 };
const BG = '#89b0f5'; // periwinkle — the site's accent

const head = await sharp(SRC).extract(HEAD).toBuffer();
const png = (img) => img.png({ compressionLevel: 9, palette: true }).toBuffer();

const circle = (size) =>
  Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`
  );

/** The head on a periwinkle disc, with the square's corners cut away. */
const at = (size) =>
  png(
    sharp(head)
      .resize(size, size)
      .flatten({ background: BG })
      .composite([{ input: circle(size), blend: 'dest-in' }])
  );

/** Same, left square — for the platforms that apply their own mask. */
const square = (size) => png(sharp(head).resize(size, size).flatten({ background: BG }));

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
// iOS rounds the corners itself and composites transparency onto black, so this
// one stays a full-bleed square.
await writeFile('public/apple-touch-icon.png', await square(180));

// Maskable icons get cropped to a circular safe zone, so the head sits in the
// middle 80% with periwinkle padding around it.
const inner = await sharp(head).resize(410, 410).toBuffer();
await writeFile(
  'public/icons/icon-maskable-512.png',
  await png(
    sharp({ create: { width: 512, height: 512, channels: 4, background: BG } }).composite([
      { input: inner, left: 51, top: 51 },
    ])
  )
);

process.stdout.write(`favicon.ico (${ico.join('/')}), icon-96/192/512, maskable-512, apple-touch-icon\n`);
