import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'ui', 'public');
const iconSvg = await readFile(join(publicDir, 'icon.svg'));

const sizes = [
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-192.png', size: 192 },
];

for (const { name, size } of sizes) {
  await sharp(iconSvg).resize(size, size).png().toFile(join(publicDir, name));
}

const favicon32 = await readFile(join(publicDir, 'favicon-32x32.png'));
const favicon16 = await readFile(join(publicDir, 'favicon-16x16.png'));

await writeFile(
  join(publicDir, 'favicon.ico'),
  await sharp(favicon32)
    .resize(32, 32)
    .toFormat('png')
    .toBuffer()
    .then(async (png32) => {
      const png16 = await sharp(favicon16).resize(16, 16).png().toBuffer();
      return encodeIco([{ size: 32, data: png32 }, { size: 16, data: png16 }]);
    }),
);

function encodeIco(images) {
  const count = images.length;
  const headerSize = 6;
  const entrySize = 16;
  const offset = headerSize + entrySize * count;
  let dataOffset = offset;
  const entries = images.map(({ size, data }) => {
    const entry = {
      width: size === 256 ? 0 : size,
      height: size === 256 ? 0 : size,
      colorCount: 0,
      reserved: 0,
      planes: 1,
      bitCount: 32,
      bytesInRes: data.length,
      imageOffset: dataOffset,
      data,
    };
    dataOffset += data.length;
    return entry;
  });

  const totalSize = dataOffset;
  const buffer = Buffer.alloc(totalSize);
  let pos = 0;

  buffer.writeUInt16LE(0, pos);
  pos += 2;
  buffer.writeUInt16LE(1, pos);
  pos += 2;
  buffer.writeUInt16LE(count, pos);
  pos += 2;

  for (const entry of entries) {
    buffer.writeUInt8(entry.width, pos);
    pos += 1;
    buffer.writeUInt8(entry.height, pos);
    pos += 1;
    buffer.writeUInt8(entry.colorCount, pos);
    pos += 1;
    buffer.writeUInt8(entry.reserved, pos);
    pos += 1;
    buffer.writeUInt16LE(entry.planes, pos);
    pos += 2;
    buffer.writeUInt16LE(entry.bitCount, pos);
    pos += 2;
    buffer.writeUInt32LE(entry.bytesInRes, pos);
    pos += 4;
    buffer.writeUInt32LE(entry.imageOffset, pos);
    pos += 4;
  }

  for (const entry of entries) {
    entry.data.copy(buffer, entry.imageOffset);
  }

  return buffer;
}

console.log('Generated icon PNGs and favicon.ico in ui/public/');
