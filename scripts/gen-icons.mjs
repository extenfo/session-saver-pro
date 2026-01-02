import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function crc32(buf) {
  // Standard CRC32 (IEEE 802.3)
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u32be(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const dataBuf = data || Buffer.alloc(0);
  const lenBuf = u32be(dataBuf.length);
  const crcBuf = u32be(crc32(Buffer.concat([typeBuf, dataBuf])));
  return Buffer.concat([lenBuf, typeBuf, dataBuf, crcBuf]);
}

function makePng({ width, height, colorA, colorB }) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // color type RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  // Raw pixels with filter byte per scanline
  const rowSize = 1 + width * 4;
  const raw = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * rowSize;
    raw[rowStart] = 0; // no filter
    for (let x = 0; x < width; x += 1) {
      const t = (x + y) / (width + height);
      const c = t < 0.5 ? colorA : colorB;
      const p = rowStart + 1 + x * 4;
      raw[p + 0] = c[0];
      raw[p + 1] = c[1];
      raw[p + 2] = c[2];
      raw[p + 3] = c[3];
    }
  }

  const compressed = deflateSync(raw, { level: 9 });

  const png = Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND"),
  ]);

  return png;
}

function ensureIcons() {
  const dir = "icons";
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const svgPath = join("marketing", "save.svg");
  const hasSvg = existsSync(svgPath);

  const accentA = [0x4f, 0x8c, 0xff, 0xff]; // #4f8cff
  const accentB = [0x0b, 0x12, 0x20, 0xff]; // #0b1220

  const sizes = [16, 32, 48, 128];

  let ResvgCtor = null;
  if (hasSvg) {
    try {
      const mod = require("@resvg/resvg-js");
      ResvgCtor = mod && mod.Resvg;
    } catch {
      ResvgCtor = null;
    }
  }

  if (ResvgCtor && hasSvg) {
    const svg = readFileSync(svgPath);
    for (const size of sizes) {
      const file = join(dir, `icon${size}.png`);
      const resvg = new ResvgCtor(svg, {
        fitTo: { mode: "width", value: size },
      });
      const pngBuffer = resvg.render().asPng();
      writeFileSync(file, pngBuffer);
    }
    console.log("Generated icons from marketing/save.svg into ./icons (icon16.png, icon32.png, icon48.png, icon128.png)");
    return;
  }

  for (const size of sizes) {
    const file = join(dir, `icon${size}.png`);
    const png = makePng({ width: size, height: size, colorA: accentA, colorB: accentB });
    writeFileSync(file, png);
  }

  console.log("Generated placeholder icons in ./icons (icon16.png, icon32.png, icon48.png, icon128.png)");
}

ensureIcons();
