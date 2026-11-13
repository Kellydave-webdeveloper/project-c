import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '..', 'public');

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function createPng(width, height, drawFn) {
  // 8-byte PNG signature
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // deflate
  ihdrData[11] = 0; // standard filter
  ihdrData[12] = 0; // no interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Uncompressed image data: each row begins with 0 (no filter) then width * 4 bytes
  const rowStride = 1 + width * 4;
  const rawData = Buffer.alloc(rowStride * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowStride;
    rawData[rowOffset] = 0; // filter 0
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// Draw IPN branded shield + nodes icon
function drawIpnIcon(x, y, w, h, isMaskable = false) {
  const cx = w / 2;
  const cy = h / 2;
  const radius = isMaskable ? w * 0.48 : w * 0.44;

  // Background rounded container
  // For maskable icon: full fill or safe circle
  let inBg = false;
  if (isMaskable) {
    inBg = true;
  } else {
    // Squircle / rounded rect with smooth corners
    const cornerR = w * 0.22;
    const dx = Math.max(0, Math.abs(x - cx) - (w * 0.45 - cornerR));
    const dy = Math.max(0, Math.abs(y - cy) - (h * 0.45 - cornerR));
    inBg = (dx * dx + dy * dy) <= (cornerR * cornerR);
  }

  if (!inBg) {
    return [0, 0, 0, 0]; // Transparent outside squircle
  }

  // Gradient background from Royal Blue #1d4ed8 to Deep Indigo #4338ca
  const t = (x + y) / (w + h);
  let bgR = Math.round(29 * (1 - t) + 67 * t);
  let bgG = Math.round(78 * (1 - t) + 56 * t);
  let bgB = Math.round(216 * (1 - t) + 202 * t);

  // Normalize coords relative to center [-1, 1]
  const nx = (x - cx) / (w * 0.38);
  const ny = (y - cy) / (h * 0.38);

  // Shield outline & interior
  // Shield curve: top is y = -0.6 to -0.4, side is x in [-0.55, 0.55], bottom tapers to (0, 0.7)
  let inShieldStroke = false;
  let inShieldFill = false;

  // Check if inside shield geometry
  const isInsideShield = (px, py) => {
    if (py < -0.55 || py > 0.72) return false;
    const widthAtY = py < 0 ? 0.55 : 0.55 * (1 - Math.pow(py / 0.72, 1.6));
    return Math.abs(px) <= widthAtY;
  };

  // Border thickness ~ 0.08
  const insideOuter = isInsideShield(nx, ny);
  const insideInner = isInsideShield(nx * 1.15, ny * 1.15);

  if (insideOuter && !insideInner) {
    inShieldStroke = true;
  } else if (insideOuter) {
    inShieldFill = true;
  }

  // Network nodes:
  // Node 1 (Center): (0, -0.05), radius 0.14
  // Node 2 (Bottom-Left): (-0.25, 0.35), radius 0.10
  // Node 3 (Bottom-Right): (0.25, 0.35), radius 0.10
  const dNode1 = Math.hypot(nx - 0, ny - (-0.05));
  const dNode2 = Math.hypot(nx - (-0.25), ny - 0.35);
  const dNode3 = Math.hypot(nx - (0.25), ny - 0.35);

  // Connection lines: from (0, -0.05) to (-0.25, 0.35) and (0.25, 0.35)
  const lineDist = (px, py, x1, y1, x2, y2) => {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  };

  const distL1 = lineDist(nx, ny, 0, -0.05, -0.25, 0.35);
  const distL2 = lineDist(nx, ny, 0, -0.05, 0.25, 0.35);

  // Center node: bright cyan/blue #60a5fa
  if (dNode1 <= 0.15) {
    if (dNode1 <= 0.11) {
      return [96, 165, 250, 255]; // Light blue core
    }
    return [255, 255, 255, 255]; // White border
  }

  // Bottom nodes: pure white #ffffff
  if (dNode2 <= 0.11 || dNode3 <= 0.11) {
    return [255, 255, 255, 255];
  }

  // Lines: bright cyan-blue line #93c5fd
  if (distL1 <= 0.055 || distL2 <= 0.055) {
    return [147, 197, 253, 255];
  }

  // Shield stroke: clean crisp white
  if (inShieldStroke) {
    return [255, 255, 255, 255];
  }

  // Inner shield slight translucent highlight
  if (inShieldFill) {
    bgR = Math.min(255, bgR + 25);
    bgG = Math.min(255, bgG + 25);
    bgB = Math.min(255, bgB + 35);
  }

  return [bgR, bgG, bgB, 255];
}

console.log('Generating PWA icons...');
const icon192 = createPng(192, 192, (x, y, w, h) => drawIpnIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), icon192);

const icon512 = createPng(512, 512, (x, y, w, h) => drawIpnIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), icon512);

const iconMaskable = createPng(512, 512, (x, y, w, h) => drawIpnIcon(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), iconMaskable);

const appleIcon = createPng(180, 180, (x, y, w, h) => drawIpnIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);

console.log('Icons generated successfully:');
console.log(' - pwa-192x192.png:', icon192.length, 'bytes');
console.log(' - pwa-512x512.png:', icon512.length, 'bytes');
console.log(' - pwa-maskable-512x512.png:', iconMaskable.length, 'bytes');
console.log(' - apple-touch-icon.png:', appleIcon.length, 'bytes');
