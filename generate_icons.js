const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Function to generate raw PNG with an RGBA buffer
function createPNG(width, height, pixelBuffer) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit depth
  ihdr.writeUInt8(6, 9); // RGBA color type
  ihdr.writeUInt8(0, 10); // Deflate
  ihdr.writeUInt8(0, 11); // Filter 0
  ihdr.writeUInt8(0, 12); // Interlace 0
  const ihdrChunk = createChunk('IHDR', ihdr);

  // Scanlines with filter byte 0
  const rawScanlines = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    rawScanlines[y * (1 + width * 4)] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = y * (1 + width * 4) + 1 + x * 4;
      rawScanlines[dstIdx] = pixelBuffer[srcIdx];
      rawScanlines[dstIdx + 1] = pixelBuffer[srcIdx + 1];
      rawScanlines[dstIdx + 2] = pixelBuffer[srcIdx + 2];
      rawScanlines[dstIdx + 3] = pixelBuffer[srcIdx + 3];
    }
  }

  const compressedData = zlib.deflateSync(rawScanlines);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// CRC32 implementation
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ (-(c & 1) & 0xedb88320);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crcData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  chunk.writeUInt32BE(crc32(crcData), 8 + len);
  return chunk;
}

function renderIcon(size) {
  const buf = Buffer.alloc(size * size * 4);

  // Colors
  // Background: Rounded blue-purple gradient / slate navy
  // Icon: Briefcase (white) + green checkmark
  const radius = size * 0.22;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Rounded rect check
      let inBounds = true;
      const left = radius, right = size - 1 - radius;
      const top = radius, bottom = size - 1 - radius;

      let dx = 0, dy = 0;
      if (x < left) dx = left - x;
      else if (x > right) dx = x - right;

      if (y < top) dy = top - y;
      else if (y > bottom) dy = y - bottom;

      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius) {
        // Outside rounded corner
        buf[idx] = 0;
        buf[idx + 1] = 0;
        buf[idx + 2] = 0;
        buf[idx + 3] = 0;
        continue;
      }

      // Smooth anti-aliased edge
      const alpha = Math.min(1, Math.max(0, radius - dist + 0.7));

      // Background gradient: Blue (#2563eb to #1d4ed8)
      const grad = y / size;
      const r = Math.round(37 * (1 - grad) + 15 * grad);
      const g = Math.round(99 * (1 - grad) + 70 * grad);
      const b = Math.round(235 * (1 - grad) + 180 * grad);

      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = Math.round(255 * alpha);

      // Normalized coordinates [0, 1]
      const nx = x / size;
      const ny = y / size;

      // Draw Briefcase Icon
      // Handle: arc on top
      const inHandle =
        nx >= 0.38 && nx <= 0.62 &&
        ny >= 0.20 && ny <= 0.32 &&
        !(nx >= 0.44 && nx <= 0.56 && ny >= 0.25 && ny <= 0.32);

      // Body of briefcase
      const inBody =
        nx >= 0.22 && nx <= 0.78 &&
        ny >= 0.32 && ny <= 0.75;

      // Straps/latches
      const inLatch1 = nx >= 0.33 && nx <= 0.39 && ny >= 0.42 && ny <= 0.52;
      const inLatch2 = nx >= 0.61 && nx <= 0.67 && ny >= 0.42 && ny <= 0.52;

      // Green Checkmark badge on bottom right
      const centerBadgeX = 0.74;
      const centerBadgeY = 0.74;
      const badgeRadius = 0.20;
      const bdx = nx - centerBadgeX;
      const bdy = ny - centerBadgeY;
      const distBadge = Math.sqrt(bdx * bdx + bdy * bdy);

      if (distBadge <= badgeRadius) {
        // Badge background (Emerald green #10b981)
        buf[idx] = 16;
        buf[idx + 1] = 185;
        buf[idx + 2] = 129;
        buf[idx + 3] = Math.round(255 * alpha);

        // White checkmark inside badge
        // Line 1: (0.67, 0.74) to (0.72, 0.79)
        // Line 2: (0.72, 0.79) to (0.82, 0.68)
        const inCheck = (
          (nx >= 0.66 && nx <= 0.73 && Math.abs(ny - (0.74 + (nx - 0.67) * 1.0)) < 0.035) ||
          (nx >= 0.72 && nx <= 0.83 && Math.abs(ny - (0.79 - (nx - 0.72) * 1.1)) < 0.035)
        );

        if (inCheck) {
          buf[idx] = 255;
          buf[idx + 1] = 255;
          buf[idx + 2] = 255;
        }
      } else if (inHandle || inBody) {
        if (inLatch1 || inLatch2) {
          // Gold accent for latches
          buf[idx] = 251;
          buf[idx + 1] = 191;
          buf[idx + 2] = 36;
        } else {
          // Crisp white briefcase
          buf[idx] = 245;
          buf[idx + 1] = 248;
          buf[idx + 2] = 255;
        }
      }
    }
  }

  return createPNG(size, size, buf);
}

const iconsDir = path.join(__dirname, 'chrome-extension', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 32, 48, 128].forEach((size) => {
  const pngBuf = renderIcon(size);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), pngBuf);
  console.log(`Generated icon${size}.png (${pngBuf.length} bytes)`);
});
