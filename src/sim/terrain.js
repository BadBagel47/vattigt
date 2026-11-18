// The maps as grids of solid and empty pixels, with a material per pixel.
// Integer math only, so every browser builds the same map from the same seed.
import { W, H } from './rules.js';
import { sin, isqrt } from './trig.js';

export const SOIL = 1, ROCK = 2, WOOD = 3, SNOW = 4, LIME = 5;   // materials: ROCK takes half the crater, WOOD breaks easily, LIME (limestone) like soil

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
  return { id, name, water, solid: new Uint8Array(W * H), mat: new Uint8Array(W * H), cave: new Uint8Array(W * H), burnt: new Uint8Array(W * H), surface: new Int16Array(W), lamps: [], troll: null, roof: 0, spawns: [[], []], boulders: [], cart: null, rain: 0, sinkholes: 0, crateEvery: 0, wrongGoods: 0, knalle: null, statue: null, avalanche: 0, stations: null, raukar: null, mill: null, windScale: 1 };
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
  // the boulders as loose pieces that can fall and roll (offsets of their pixels)
  m.boulders = rocks.map(([cx, cy, r], k) => {
    const pts = [];
    for (let y = cy - r - 2; y <= cy + r + 2; y++) for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx, dy = Math.trunc(((y - cy) * 115) / 100);
      if (dx * dx + dy * dy <= r * r) pts.push([x - cx, y - cy]);
    }
    return { cx, cy, r, troll: k === 2 ? 1 : 0, pts, moving: 0, gone: 0 };
  });
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
  m.cart = { x: 232, y: 165 };
  m.lamps = [[70, 84], [190, 84], [420, 84], [100, 152], [270, 152], [390, 154], [150, 216], [300, 214], [450, 216], [80, 186]].map(([x, y]) => ({ x, y, on: 1 }));
  m.spawns = [[[60, 85], [200, 85], [90, 150], [150, 215], [110, 190], [130, 85]], [[400, 85], [390, 155], [260, 150], [420, 215], [440, 85], [340, 215]]];
  return finish(m);
}

/* ---------- Borås: a parking garage, the river, concrete blocks and a bronze statue; it always rains ---------- */
function boras(seed) {
  const m = blank('boras', 'Borås', 246);
  const ground = (x) => {
    if (x < 196) return 206;
    if (x < 204) return 206 + Math.trunc(((x - 196) * 52) / 8);
    if (x < 276) return 258;
    if (x < 284) return 258 - Math.trunc(((x - 276) * 48) / 8);
    return 210 - Math.trunc(((x - 284) * 20) / 196) + Math.trunc(((noise(x, 0, 17, seed) - 512) * 3) / 1024);
  };
  for (let x = 0; x < W; x++) for (let y = ground(x); y < H; y++) fill(m, x, y, SOIL);
  const block = (x1, y1, x2, y2, mat) => { for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) fill(m, x, y, mat); };
  // parking garage: three decks on pillars at the ends
  for (const y of [112, 146, 178]) block(26, y, 170, y + 3, ROCK);
  for (const x of [26, 167]) block(x, 112, x + 3, 205, ROCK);
  // the bridge over the river, two concrete blocks, the statue on its plinth
  block(196, 200, 284, 203, ROCK);
  for (let x = 300; x <= 336; x++) block(x, 170, x, ground(x) - 1, ROCK);
  for (let x = 440; x <= 472; x++) block(x, 150, x, ground(x) - 1, ROCK);
  const sx = 386, sb = ground(sx);
  block(sx - 9, sb - 8, sx + 9, sb - 1, ROCK);
  block(sx - 4, sb - 40, sx + 4, sb - 9, ROCK);                  // body
  block(sx - 6, sb - 28, sx + 6, sb - 18, ROCK);                 // coat
  block(sx - 3, sb - 52, sx + 3, sb - 41, ROCK);                 // head and hat
  block(sx - 1, sb - 62, sx + 1, sb - 53, ROCK);
  block(sx + 4, sb - 47, sx + 14, sb - 45, ROCK);                // the long nose
  m.statue = { x: sx, base: sb, top: sb - 62 };
  m.rain = 1; m.sinkholes = 1; m.crateEvery = 1; m.wrongGoods = 3;
  m.knalle = { x: 250, y: 190 };
  m.spawns = [[[50, 100], [110, 100], [60, 135], [130, 135], [80, 170], [150, 195]], [[300, 150], [350, 195], [420, 195], [455, 130], [318, 160], [295, 195]]];
  return finish(m);
}

/* ---------- Fjället (Lappland): two fells with steep snowy faces; the snow slides as avalanches ---------- */
const FELL = [[0, 150], [40, 122], [80, 98], [112, 88], [140, 102], [176, 168], [206, 202], [240, 212], [274, 202], [304, 168], [340, 98], [372, 80], [404, 92], [440, 122], [480, 150]];
function fjallet(seed) {
  const m = blank('fjallet', 'Fjället', 246);
  for (let x = 0; x < W; x++) {
    let i = 0;
    while (i < FELL.length - 2 && x >= FELL[i + 1][0]) i++;
    const [x1, y1] = FELL[i], [x2, y2] = FELL[i + 1];
    const t = Math.trunc(((x - x1) * 1024) / (x2 - x1)), e = Math.trunc((t * t * (3072 - 2 * t)) / 1048576);
    const top = y1 + Math.trunc(((y2 - y1) * e) / 1024) + Math.trunc(((noise(x, 0, 10, seed) - 512) * 6) / 1024);
    // snow lies thicker higher up; under it heath, then rock and gravel
    const snow = top < 204 ? Math.min(12, 3 + Math.trunc((204 - top) / 11)) + Math.trunc((noise(x, 3, 7, seed) * 3) / 1024) : 1;
    for (let y = top; y < H; y++) {
      const d = y - top;
      fill(m, x, y, d < snow ? SNOW : d < snow + 5 ? SOIL : noise(x, y, 14, seed) > 470 ? ROCK : SOIL);
    }
  }
  m.avalanche = 1;
  m.spawns = [[[30, 110], [60, 95], [95, 80], [125, 85], [200, 180], [150, 110]], [[450, 110], [420, 95], [390, 70], [355, 80], [280, 180], [330, 100]]];
  return finish(m);
}

/* ---------- Takåsarna (Stockholm): copper roofs, chimneys, a church tower, canals between the blocks ---------- */
// Three blocks of houses on stone quays with water between. In a narrow alley in each block is an
// underground station: walk in and you come out at the next station (F-034).
const STREET = 206;
function takasarna(seed) {
  const m = blank('takasarna', 'Takåsarna', 236);
  const box = (x1, y1, x2, y2, mat) => { for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) fill(m, x, y, mat); };
  const blocks = [[4, 150], [176, 304], [330, 476]];
  for (const [a, b] of blocks) box(a, STREET, b, H - 1, ROCK);
  // the open places: an alley with a station in the outer blocks, the square in the middle one
  const gaps = [[86, 100], [222, 262], [380, 394]];
  m.stations = [{ x: 93, y: STREET - 1 }, { x: 256, y: STREET - 1 }, { x: 387, y: STREET - 1 }];
  m.square = { x1: 222, x2: 262 };
  m.houses = [];
  for (const [a, b] of blocks) {
    let x = a, k = 0;
    while (x < b - 8) {
      const gap = gaps.find(([g1, g2]) => x >= g1 - 2 && x < g2);
      if (gap) { x = gap[1] + 1; continue; }
      const next = gaps.find(([g1]) => g1 > x && g1 < x + 40);
      let wdt = 22 + (hash32(x, 5, seed) % 13);
      if (next) wdt = Math.min(wdt, next[0] - 1 - x);
      if (x + wdt > b - 6) wdt = b - x;
      const h = 46 + (hash32(x, 9, seed) % 40), y0 = STREET - h;
      box(x, y0, x + wdt - 1, STREET - 1, SOIL);
      // a copper roof: a low gable, two pixels thick
      const half = wdt >> 1;
      for (let i = 0; i < wdt; i++) { const rise = Math.trunc(Math.min(i, wdt - 1 - i) / 2); for (let j = 0; j <= rise + 1; j++) fill(m, x + i, y0 - j, WOOD); }
      const cx = x + 4 + (hash32(x, 11, seed) % Math.max(1, wdt - 8)), crise = Math.trunc(Math.min(cx - x, x + wdt - 1 - cx) / 2);
      if (wdt > 14) box(cx, y0 - crise - 8, cx + 2, y0 - crise, ROCK);
      m.houses.push({ x1: x, x2: x + wdt - 1, top: y0, half, k: k++ });
      x += wdt;
    }
  }
  // the church tower beside the square: stone tower, copper spire
  const tx = 206;
  box(tx, 96, tx + 13, STREET - 1, ROCK);
  for (let j = 0; j < 46; j++) { const hw = Math.trunc((j * 7) / 46); for (let i = -hw; i <= hw; i++) fill(m, tx + 6 + i, 96 - 46 + j, WOOD); }
  m.tower = { x: tx, top: 96 };
  finish(m);
  // on the roofs, just above them (a fall from the sky would hurt)
  m.spawns = [[20, 50, 120, 140, 190, 70], [460, 430, 350, 340, 290, 410]].map((xs) => xs.map((x) => [x, m.surface[x] - 1]));
  return m;
}

/* ---------- Raukarna (Gotland): limestone stacks in the sea, a shore with a town wall, a cliff ---------- */
// A stack whose foot is cut through topples (F-036, see world.js).
function raukarna(seed) {
  const m = blank('raukarna', 'Raukarna', 238);
  const WL = m.water;
  // the shore on the left: a low limestone shelf; the cliff (klint) on the right
  for (let x = 0; x < W; x++) {
    let top = H;
    if (x < 132) top = 190 + Math.trunc((x * 6) / 132) + Math.trunc(((noise(x, 0, 12, seed) - 512) * 4) / 1024);
    else if (x < 150) top = 196 + Math.trunc(((x - 132) * 52) / 18);
    else if (x > 392) top = 150 + Math.trunc(((480 - x) * 4) / 88) + Math.trunc(((noise(x, 1, 9, seed) - 512) * 6) / 1024);
    else if (x > 376) top = 150 + Math.trunc(((392 - x) * 96) / 16);
    for (let y = top; y < H; y++) fill(m, x, y, y - top < 3 && x < 150 ? SOIL : LIME);
  }
  // the town wall on the shore, with battlements
  for (let x = 14; x <= 70; x++) { const top = x % 8 < 4 ? 160 : 164; for (let y = top; y < 192; y++) fill(m, x, y, ROCK); }
  for (let y = 176; y < 192; y++) for (let x = 36; x <= 46; x++) { m.solid[y * W + x] = 0; m.mat[y * W + x] = 0; }   // the gate
  // the stacks: [foot x, height, width at the top, width at the foot]; the sea floor under them
  const stacks = [[178, 70, 16, 8], [222, 92, 20, 10], [266, 60, 14, 8], [310, 84, 18, 9], [350, 66, 15, 8]];
  m.raukar = [];
  for (const [cx, h0, wt, wf] of stacks) {
    const h = h0 + Math.trunc(((hash32(cx, 3, seed) & 15) - 8)), base = WL - 4, pts = [];
    for (let y = base + 1; y < H; y++) for (let x = cx - wf - 4; x <= cx + wf + 4; x++) fill(m, x, y, ROCK);   // the shelf it stands on
    for (let j = 0; j <= h; j++) {
      const t = Math.trunc((j * 1024) / h), hw = Math.trunc((wf * (1024 - t) + wt * t) / 2048) + (j > h - 8 ? 1 : 0) + ((hash32(cx, j >> 2, seed) & 3) === 0 ? 1 : 0);
      const off = Math.trunc((sin(j * 3 + cx) * 2) / 1024);
      for (let x = cx - hw + off; x <= cx + hw + off; x++) { fill(m, x, base - j, LIME); pts.push([x - cx, j]); }
    }
    let foot0 = 0;
    for (let j = 1; j <= 6; j++) for (let x = cx - 12; x <= cx + 12; x++) if (m.mat[(base - j) * W + x] === LIME) foot0++;
    m.raukar.push({ x: cx, base, h, foot0, fallen: 0 });
  }
  m.spawns = [[[30, 150], [60, 150], [100, 180], [120, 180], [178, 100], [222, 80]], [[420, 130], [450, 130], [400, 130], [465, 130], [310, 100], [350, 110]]];
  m.spawns = m.spawns.map((list) => list.map(([x]) => [x, 0]));
  finish(m);
  m.spawns = m.spawns.map((list) => list.map(([x]) => [x, m.surface[x] - 1]));
  return m;
}

/* ---------- Slätten (Skåne): rapeseed fields, pollard willows, a windmill whose sails hit shots back ---------- */
function slatten(seed) {
  const m = blank('slatten', 'Slätten', 246);
  const ground = (x) => {
    let y = 206 + Math.trunc(((noise(x, 0, 40, seed) - 512) * 10) / 1024) + Math.trunc(((noise(x, 2, 9, seed) - 512) * 3) / 1024);
    const d = Math.abs(x - 240); if (d < 46) y -= Math.trunc(((46 - d) * (46 - d) * 22) / 2116);   // the mill hill
    if (x > 120 && x < 132) y += 10 - Math.abs(x - 126);                                          // a ditch
    return y;
  };
  for (let x = 0; x < W; x++) for (let y = ground(x); y < H; y++) fill(m, x, y, SOIL);
  // the windmill: a tarred wooden body on the hill; the sails turn on the cap
  const mx = 240, mb = ground(mx);
  for (let j = 0; j < 46; j++) { const hw = 10 - Math.trunc((j * 4) / 46); for (let x = mx - hw; x <= mx + hw; x++) fill(m, x, mb - j, WOOD); }
  for (let j = 46; j < 52; j++) { const hw = 6 - (j - 46); for (let x = mx - hw; x <= mx + hw; x++) fill(m, x, mb - j, WOOD); }
  m.mill = { x: mx, y: mb - 44, len: 30, base: mb };
  m.windScale = 2;
  m.spawns = [[[20, 150], [50, 150], [80, 150], [110, 150], [150, 150], [180, 150]], [[460, 150], [430, 150], [400, 150], [370, 150], [330, 150], [300, 150]]];
  finish(m);
  m.spawns = m.spawns.map((list) => list.map(([x]) => [x, m.surface[x] - 1]));
  return m;
}

export const MAPS = { midsommar, kobbarna, trollskogen, gruvan, boras, fjallet, takasarna, raukarna, slatten };
export const MAP_NAMES = { midsommar: 'Midsommarängen', kobbarna: 'Kobbarna', trollskogen: 'Trollskogen', gruvan: 'Gruvan', boras: 'Borås', fjallet: 'Fjället', takasarna: 'Takåsarna', raukarna: 'Raukarna', slatten: 'Slätten' };
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
