import { deflateSync } from 'node:zlib';
import sharp from 'sharp';

/* A minimal PNG encoder: 8-bit RGBA, one IDAT, and per row the filter (none,
   sub, up or Paeth) whose output is smallest by the usual sum-of-bytes
   estimate. The pictures are drawn at double size with a grain on every
   block, and unfiltered they came out at twice the bytes. */

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc32 = (buf: Uint8Array) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

export function encodePng(width: number, height: number, rgba: Uint8Array): Uint8Array {
  const stride = width * 4;
  const raw = new Uint8Array((stride + 1) * height);
  const cand = [0, 1, 2, 4].map(() => new Uint8Array(stride));
  const paeth = (a: number, b: number, c: number) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
  for (let y = 0; y < height; y++) {
    const row = rgba.subarray(y * stride, (y + 1) * stride);
    const prev = y ? rgba.subarray((y - 1) * stride, y * stride) : null;
    let best = 0, bestCost = Infinity;
    [0, 1, 2, 4].forEach((f, k) => {
      const c = cand[k];
      let cost = 0;
      for (let i = 0; i < stride; i++) {
        const a = i >= 4 ? row[i - 4] : 0, b = prev ? prev[i] : 0, cc = prev && i >= 4 ? prev[i - 4] : 0;
        const v = (row[i] - (f === 0 ? 0 : f === 1 ? a : f === 2 ? b : paeth(a, b, cc))) & 255;
        c[i] = v; cost += v < 128 ? v : 256 - v;
      }
      if (cost < bestCost) { bestCost = cost; best = k; }
    });
    raw[y * (stride + 1)] = [0, 1, 2, 4][best];
    raw.set(cand[best], y * (stride + 1) + 1);
  }
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width); dv.setUint32(4, height);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const parts = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', new Uint8Array(deflateSync(raw, { level: 9 }))),
    chunk('IEND', new Uint8Array(0)),
  ];
  const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
  let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/** The same picture as a 256-colour palette PNG. The pictures are drawn at double size
    with a grain on every block, and as full RGBA a map came to 350-450KB;
    quantised it is a third of that and looks the same, because pixel art has
    few colours to begin with. The scripts keep using `encodePng`, which needs
    nothing installed. */
export async function encodePalettePng(width: number, height: number, rgba: Uint8Array): Promise<Uint8Array> {
  const buf = await sharp(Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength), { raw: { width, height, channels: 4 } })
    .png({ palette: true, colours: 256, effort: 6, dither: 0 }).toBuffer();
  return new Uint8Array(buf);
}
