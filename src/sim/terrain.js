// The maps as grids of solid and empty pixels, with a material per pixel.
// Integer math only, so every browser builds the same map from the same seed.
import { W, H } from './rules.js';
import { sin, isqrt } from './trig.js';

export const SOIL = 1, ROCK = 2, WOOD = 3;   // materials: ROCK takes half the crater, WOOD breaks easily

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

function blank(id, name, water) {
  return { id, name, water, solid: new Uint8Array(W * H), mat: new Uint8Array(W * H), cave: new Uint8Array(W * H), burnt: new Uint8Array(W * H), surface: new Int16Array(W), lamps: [], troll: null, roof: 0, spawns: [[], []] };
}
const fill = (m, x, y, mat) => { if (x >= 0 && x < W && y >= 0 && y < H) { const i = y * W + x; m.solid[i] = 1; m.mat[i] = mat; } };
function finish(m) {
  for (let x = 0; x < W; x++) { let y = 0; while (y < H && !m.solid[y * W + x]) y++; m.surface[x] = y; }
  return m;
}

/* ---------- Midsommarängen (Dalarna) ---------- */
const MEADOW = [[0, 266], [22, 262], [44, 228], [68, 184], [92, 152], [150, 152], [178, 170], [212, 196], [252, 206], [288, 190], [322, 150], [352, 124], [388, 120], [418, 140], [440, 186], [456, 236], [468, 262], [480, 266]];
function midsommar(seed) {
  const m = blank('midsommar', 'Midsommarängen', 246);
  const pts = MEADOW.map(([x, y], i) => [x, i === 0 || i >= MEADOW.length - 2 || i === 4 || i === 5 ? y : y + (hash32(i, 7, seed) % 13) - 6]);
  for (let x = 0; x < W; x++) {
    let i = 0;
    while (i < pts.length - 2 && x >= pts[i + 1][0]) i++;
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const t = Math.trunc(((x - x1) * 1024) / (x2 - x1));
    const e = Math.trunc((t * t * (3072 - 2 * t)) / 1048576);
    let y = y1 + Math.trunc(((y2 - y1) * e) / 1024);
    if (x < 90 || x > 152) y += Math.trunc(((noise(x, 0, 9, seed) - 512) * 5) / 1024);
    for (let yy = y; yy < H; yy++) fill(m, x, yy, SOIL);
  }
  carve(m, 118, 201, 24, 9, true); tunnel(m, 140, 201, 188, 177, 4);
  carve(m, 372, 161, 20, 8, true); tunnel(m, 390, 161, 431, 157, 4);
  m.spawns = [[[50, 150], [78, 130], [108, 200], [165, 140], [38, 170], [135, 120]], [[303, 150], [342, 100], [366, 158], [410, 100], [285, 160], [440, 120]]];
  return finish(m);
}

/* ---------- Kobbarna (Bohuslän): granite skerries, a wooden jetty and boathouse floor ---------- */
function kobbarna(seed) {
  const m = blank('kobbarna', 'Kobbarna', 204);
  const WL = m.water, isl = [[78, 78, 52], [248, 62, 74], [404, 70, 44]];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    for (const [cx, w, h] of isl) {
      const ww = w + Math.trunc((w * Math.max(0, y - WL)) / 200), dx = x - cx;
      if (Math.abs(dx) >= ww) continue;
      const t = Math.trunc((dx * 1024) / ww), f = isqrt(1048576 - t * t);
      const top = WL + 6 - Math.trunc((h * f) / 1024) + Math.trunc(((noise(x, 0, 13, seed) - 512) * 6) / 1024);
      if (y >= top) { fill(m, x, y, ROCK); break; }
    }
  }
  // jetty from the middle skerry, and the boathouse floor on poles
  for (let x = 160; x <= 196; x++) for (let y = WL - 6; y <= WL - 5; y++) if (!m.solid[y * W + x]) fill(m, x, y, WOOD);
  finish(m);
  const base = m.surface[116] - 1;
  for (let x = 110; x <= 144; x++) for (let y = base + 1; y <= base + 2; y++) if (!m.solid[y * W + x]) fill(m, x, y, WOOD);
  m.boathouse = { x: 112, base };
  m.spawns = [[[40, 120], [70, 110], [100, 120], [55, 110], [226, 90], [180, 150]], [[385, 120], [415, 100], [440, 120], [400, 110], [268, 90], [250, 80]]];
  return finish(m);
}

/* ---------- Trollskogen (Småland): moss, boulders, a stone wall and a sleeping troll ---------- */
function trollskogen(seed) {
  const m = blank('trollskogen', 'Trollskogen', 252);
  const ground = (x) => 206 + Math.trunc((14 * sin(Math.trunc((x * 99) / 100) + 57)) / 1024) + Math.trunc((8 * sin(Math.trunc((x * 249) / 100))) / 1024) + Math.trunc(((noise(x, 0, 11, seed) - 512) * 5) / 1024);
  for (let x = 0; x < W; x++) for (let y = ground(x); y < H; y++) fill(m, x, y, SOIL);
  const rocks = [[88, 176, 24], [222, 190, 17], [336, 156, 34], [440, 186, 20]];
  for (const [cx, cy, r] of rocks) for (let y = cy - r - 2; y <= cy + r + 2; y++) for (let x = cx - r; x <= cx + r; x++) {
    const dx = x - cx, dy = Math.trunc(((y - cy) * 115) / 100);
    if (dx * dx + dy * dy <= r * r) fill(m, x, y, ROCK);
  }
  for (let k = 0; k < 9; k++) {
    const sx = 150 + k * 7, gy = ground(sx + 3);
    for (const [ox, oy] of [[0, -4], [3, -9]]) {
      if (k === 8 && oy === -9) continue;
      for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) if (i * i * 10 + j * j * 14 <= 100) fill(m, sx + ox + i, gy + oy + j, ROCK);
    }
  }
  m.rocks = rocks;
  m.troll = { x: 336, y: 156, r: 34 };
  m.spawns = [[[40, 150], [70, 150], [110, 120], [176, 150], [200, 150], [130, 150]], [[275, 150], [300, 150], [400, 150], [455, 140], [420, 150], [250, 150]]];
  return finish(m);
}

/* ---------- Gruvan (Bergslagen): tunnels under a night sky, lanterns that can be shot out ---------- */
function gruvan() {
  const m = blank('gruvan', 'Gruvan', 252);
  const SURF = 46;
  for (let y = SURF; y < H; y++) for (let x = 0; x < W; x++) fill(m, x, y, SOIL);
  const open = (x, y) => { if (x >= 0 && x < W && y >= 0 && y < H) { const i = y * W + x; m.solid[i] = 0; m.cave[i] = 1; } };
  const dig = (x1, y1, x2, y2, h) => {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
      const fy = y1 + Math.trunc(((y2 - y1) * (x - x1)) / (x2 - x1 || 1));
      for (let y = fy - h; y < fy; y++) open(x, y);
    }
  };
  dig(26, 100, 458, 104, 22); dig(14, 168, 330, 166, 20); dig(120, 230, 470, 234, 24); dig(380, 168, 452, 150, 14); dig(150, 208, 196, 168, 12);
  for (let y = SURF - 2; y < 232; y++) for (let x = 296; x < 314; x++) open(x, y);
  for (let y = 168; y < 226; y++) for (let x = 50; x < 175; x++) { const dx = x - 112, dy = y - 196; if (dx * dx * 900 + dy * dy * 3844 < 3460000) open(x, y); }
  m.roof = SURF;
  m.lamps = [[70, 84], [190, 84], [420, 84], [100, 152], [270, 152], [390, 154], [150, 216], [300, 214], [450, 216], [80, 186]].map(([x, y]) => ({ x, y, on: 1 }));
  m.spawns = [[[60, 85], [200, 85], [90, 150], [150, 215], [110, 190], [130, 85]], [[400, 85], [390, 155], [260, 150], [420, 215], [440, 85], [340, 215]]];
  return finish(m);
}

export const MAPS = { midsommar, kobbarna, trollskogen, gruvan };
export const MAP_NAMES = { midsommar: 'Midsommarängen', kobbarna: 'Kobbarna', trollskogen: 'Trollskogen', gruvan: 'Gruvan' };
export function makeMap(seed, id = 'midsommar') { return (MAPS[id] || MAPS.midsommar)(seed); }

export const isSolid = (map, x, y) => x >= 0 && x < W && y >= 0 && y < H && map.solid[y * W + x] === 1;

// Ellipse used when building maps; asCave marks the hole as a dug room.
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

// An explosion: soil goes within r, rock within half of r, wood well beyond r.
export function blast(map, cx, cy, r) {
  const rh = r >> 1, rw = r + 6;
  for (let y = cy - rw; y <= cy + rw; y++) {
    if (y < 0 || y >= H) continue;
    for (let x = cx - rw; x <= cx + rw; x++) {
      if (x < 0 || x >= W) continue;
      const i = y * W + x;
      if (!map.solid[i]) continue;
      const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy), mt = map.mat[i];
      const reach = mt === ROCK ? rh : mt === WOOD ? rw : r;
      if (d2 <= reach * reach) map.solid[i] = 0;
      else if (d2 <= (reach + 3) * (reach + 3) && mt !== WOOD) map.burnt[i] = 1;
    }
  }
}
