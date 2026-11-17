// The map as a grid of solid and empty pixels. Integer math only.
import { W, H } from './rules.js';

export function hash32(x, y, seed) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}
const floorDiv = (a, b) => (a - (((a % b) + b) % b)) / b;

// Value noise, 0..1023.
export function noise(x, y, s, seed) {
  const gx = floorDiv(x, s), gy = floorDiv(y, s);
  let fx = Math.trunc(((x - gx * s) * 1024) / s), fy = Math.trunc(((y - gy * s) * 1024) / s);
  fx = Math.trunc((fx * fx * (3072 - 2 * fx)) / 1048576);
  fy = Math.trunc((fy * fy * (3072 - 2 * fy)) / 1048576);
  const a = hash32(gx, gy, seed) & 1023, b = hash32(gx + 1, gy, seed) & 1023;
  const c = hash32(gx, gy + 1, seed) & 1023, d = hash32(gx + 1, gy + 1, seed) & 1023;
  const top = a + Math.trunc(((b - a) * fx) / 1024), bot = c + Math.trunc(((d - c) * fx) / 1024);
  return top + Math.trunc(((bot - top) * fy) / 1024);
}

// Midsommarängen: a hill with a plateau for the cottage, a valley, and a higher
// hill with the maypole. The seed varies the slopes a little; the plateau stays.
const POINTS = [[0, 266], [22, 262], [44, 228], [68, 184], [92, 152], [150, 152], [178, 170], [212, 196], [252, 206], [288, 190], [322, 150], [352, 124], [388, 120], [418, 140], [440, 186], [456, 236], [468, 262], [480, 266]];
const FIXED = new Set([4, 5]);

export function makeMap(seed) {
  const pts = POINTS.map(([x, y], i) => [x, i === 0 || i >= POINTS.length - 2 || FIXED.has(i) ? y : y + (hash32(i, 7, seed) % 13) - 6]);
  const surface = new Int16Array(W);
  for (let x = 0; x < W; x++) {
    let i = 0;
    while (i < pts.length - 2 && x >= pts[i + 1][0]) i++;
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const t = Math.trunc(((x - x1) * 1024) / (x2 - x1));
    const e = Math.trunc((t * t * (3072 - 2 * t)) / 1048576);
    let y = y1 + Math.trunc(((y2 - y1) * e) / 1024);
    if (x < 90 || x > 152) y += Math.trunc(((noise(x, 0, 9, seed) - 512) * 5) / 1024);
    surface[x] = y;
  }
  const solid = new Uint8Array(W * H), cave = new Uint8Array(W * H);
  for (let x = 0; x < W; x++) for (let y = surface[x]; y < H; y++) solid[y * W + x] = 1;
  const map = { surface, solid, cave, burnt: new Uint8Array(W * H) };
  // the two burrows under the hills, with a tunnel each
  carve(map, 118, 201, 24, 9, true); tunnel(map, 140, 201, 188, 177, 4);
  carve(map, 372, 161, 20, 8, true); tunnel(map, 390, 161, 431, 157, 4);
  return map;
}

export const isSolid = (map, x, y) => x >= 0 && x < W && y >= 0 && y < H && map.solid[y * W + x] === 1;

// Ellipse; asCave marks the hole as a dug room (drawn darker), otherwise the rim is scorched.
export function carve(map, cx, cy, rx, ry, asCave) {
  const rr = rx * rx * ry * ry;
  for (let y = cy - ry - 3; y <= cy + ry + 3; y++) {
    if (y < 0 || y >= H) continue;
    for (let x = cx - rx - 3; x <= cx + rx + 3; x++) {
      if (x < 0 || x >= W) continue;
      const dx = x - cx, dy = y - cy, i = y * W + x;
      const v = dx * dx * ry * ry + dy * dy * rx * rx;
      if (v <= rr) { if (map.solid[i]) { map.solid[i] = 0; if (asCave) map.cave[i] = 1; } }
      else if (!asCave && map.solid[i] && v <= (rx + 3) * (rx + 3) * (ry + 3) * (ry + 3)) map.burnt[i] = 1;
    }
  }
}

function tunnel(map, x1, y1, x2, y2, r) {
  const n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  for (let i = 0; i <= n; i++) carve(map, x1 + Math.trunc(((x2 - x1) * i) / n), y1 + Math.trunc(((y2 - y1) * i) / n), r, r, true);
}

// Places where vättar start: [x, y to drop from]. Left half for team 0, right half for team 1.
export const SPAWNS = [
  [[50, 150], [78, 130], [108, 200], [165, 140]],
  [[303, 150], [342, 100], [366, 158], [410, 100]]
];
