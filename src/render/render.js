// Drawing: 480×270 pixels in one image, plus a soft light layer screened on top.
// Nothing here affects the match; it only reads the simulation state.
import { W, H, WEAPONS, FLOOD_ROUND, CLOUD_RADIUS } from '../sim/rules.js';
import { px, activeUnit, teamHp } from '../sim/world.js';
import { text, textW } from './font.js';
import { VATTE, ICON_PAL, ICON_ROWS, HORSE, MOOSE } from './sprites.js';

// Team colours to choose from in the team builder; teams 0 and 1 default to red and blue.
export const TEAM_COLORS = [
  { c: 0xe5533d, d: 0xa5342a, css: '#e5533d', name: 'Röd' }, { c: 0x4fa3ff, d: 0x2a6fd0, css: '#4fa3ff', name: 'Blå' },
  { c: 0x5fae3a, d: 0x3b7d34, css: '#5fae3a', name: 'Grön' }, { c: 0xf2c43c, d: 0xc8962a, css: '#f2c43c', name: 'Gul' },
  { c: 0xb06ad8, d: 0x7a3fa0, css: '#b06ad8', name: 'Lila' }, { c: 0xeeeae0, d: 0xb8b0a0, css: '#eeeae0', name: 'Vit' }
];
export const teamColor = (w, ti) => TEAM_COLORS[(w && w.teams[ti] && w.teams[ti].color) ?? ti] || TEAM_COLORS[ti % 2];
export const HATS = { toppig: 'Toppig', tofs: 'Tofs', stickad: 'Stickad' };
export function hatRows(rows, hat) {
  if (hat === 'tofs') { rows[0] = '....h....'; rows[1] = '...hLL...'; }
  else if (hat === 'stickad') { rows[0] = '.........'; rows[1] = '.........'; rows[2] = '...LlL...'; rows[4] = '.hhhhhhh.'; }
  return rows;
}

/* ---------- moods ---------- */
export const MOODS = {
  midsommar: { name: 'Midsommarnatt', sky: [0x1d2b53, 0x2f4a7a, 0x5a6fa0, 0x9a86ad, 0xe39a8c, 0xffc27a, 0xffe3a1], amb: [.80, .82, 1], hill: [0x56699a, 0x33466e], forest: 0x18294a,
    water: [0x4a6aa0, 0x1f3358], sun: { x: 322, y: 172, r: 9, c: 0xfff1b8 }, stars: .25, glow: 1, part: 'fly', grass: [0x9bd45a, 0x5fae3a, 0x3b7d34], leaf: [0xb6e06a, 0x6fba45, 0x3f8a3c] },
  dag: { name: 'Sommardag', sky: [0x3f8fd8, 0x58a8e8, 0x7cc0f0, 0xa6d8f6, 0xd0ecfa], amb: [1, 1, 1], hill: [0x8fb6d6, 0x5f9f86], forest: 0x2f6b4a,
    water: [0x4f9fe0, 0x2a5fa0], sun: { x: 412, y: 36, r: 10, c: 0xfffbe0 }, stars: 0, glow: .3, part: 'pollen', clouds: 1, grass: [0xa8e060, 0x62b53c, 0x3b7d34], leaf: [0xc2ea70, 0x76c24a, 0x3f8a3c] },
  host: { name: 'Höstskymning', sky: [0x2a1f3d, 0x4a2c50, 0x8a3f55, 0xc85a4a, 0xf08c3a, 0xffc14d], amb: [.98, .80, .74], hill: [0x6a3a58, 0x43253f], forest: 0x26152c,
    water: [0x8a4a5a, 0x2f1c3a], sun: { x: 118, y: 174, r: 11, c: 0xffd27a }, stars: .1, glow: 1, part: 'leaf', grass: [0xd9c25a, 0xa89a3c, 0x6f6a30], leaf: [0xffc94d, 0xe8892f, 0xb8502a] },
  vinter: { name: 'Vinternatt', sky: [0x0b1026, 0x0f1836, 0x14244a, 0x1b335e, 0x27496f], amb: [.60, .72, 1], hill: [0x22365f, 0x182746], forest: 0x0d1833,
    water: [0x1c3058, 0x0b1530], moon: { x: 132, y: 62, r: 9, c: 0xf4f6ff }, stars: 1, glow: 1.2, part: 'snow', snow: 1, aurora: 1, grass: [0xffffff, 0xeef4fb, 0xc4d3ea], leaf: null }
};

/* ---------- pixel helpers ---------- */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (BAYER[(x & 3) + (y & 3) * 4] + .5) / 16;
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const vnoise = (x, y, s) => {
  const gx = Math.floor(x / s), gy = Math.floor(y / s);
  let fx = x / s - gx, fy = y / s - gy; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = hash(gx, gy), b = hash(gx + 1, gy), c = hash(gx, gy + 1), d = hash(gx + 1, gy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
};
export const mix = (a, b, t) => {
  const r = (a >> 16 & 255) + ((b >> 16 & 255) - (a >> 16 & 255)) * t,
        g = (a >> 8 & 255) + ((b >> 8 & 255) - (a >> 8 & 255)) * t,
        l = (a & 255) + ((b & 255) - (a & 255)) * t;
  return (r << 16) | (g << 8) | l;
};

export function createRenderer(scene, glow) {
  const ctx = scene.getContext('2d'), gctx = glow.getContext('2d');
  scene.width = W; scene.height = H;
  const img = ctx.createImageData(W, H), buf = new Uint32Array(img.data.buffer), base = new Uint32Array(W * H);
  let T = buf, mood = MOODS.midsommar, tintCache = new Map(), builtKey = '', world = null;
  const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const abgr = (c) => (0xff000000 | ((c & 255) << 16) | (c & 0xff00) | (c >> 16 & 255)) >>> 0;
  const set = (x, y, c) => { x |= 0; y |= 0; if (x >= 0 && x < W && y >= 0 && y < H) T[y * W + x] = abgr(c); };
  const get = (x, y) => { x |= 0; y |= 0; if (x < 0 || x >= W || y < 0 || y >= H) return 0; const v = T[y * W + x]; return ((v & 255) << 16) | (v & 0xff00) | (v >> 16 & 255); };
  const blend = (x, y, c, t) => { x |= 0; y |= 0; if (x >= 0 && x < W && y >= 0 && y < H) set(x, y, mix(get(x, y), c, t)); };
  const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, c); };
  const disc = (cx, cy, r, c) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + r * .6) set(cx + i, cy + j, c); };
  const tn = (c) => {
    let v = tintCache.get(c);
    if (v === undefined) { const a = mood.amb; v = (Math.min(255, (c >> 16 & 255) * a[0]) << 16) | (Math.min(255, (c >> 8 & 255) * a[1]) << 8) | Math.min(255, (c & 255) * a[2]); tintCache.set(c, v); }
    return v;
  };
  const wp = (x, y, c) => set(x, y, tn(c));
  const lit = () => mood.glow >= 1;
  const P = { set, rect, get };
  const solid = (x, y) => x >= 0 && x < W && y >= 0 && y < H && world.map.solid[y * W + x] === 1;
  const surf = (x) => world.map.surface[Math.max(0, Math.min(W - 1, x))];

  function sprite(rows, pal, x, y, flip, raw) {
    for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) {
      const ch = rows[j][flip ? rows[j].length - 1 - i : i];
      if (ch !== '.') (raw ? set : wp)(x + i, y + j, pal[ch]);
    }
  }

  /* ---------- the still picture: sky, hills, decor, terrain ---------- */
  const SOIL = [0x8a5a3a, 0x6d4330, 0x4e2f28], RIM = 0xb07a4a, ROCK = [0xb3b8bd, 0x8b8f98, 0x646874];
  function terrainColor(x, y) {
    const d = y - surf(x), i = y * W + x;
    const up = !solid(x, y - 1), down = !solid(x, y + 1);
    const r = vnoise(x, y, 15) * .65 + vnoise(x + 40, y, 6) * .35;
    let c;
    if (d <= 1) c = mood.grass[d <= 0 ? 0 : 1];
    else if (d <= 3 || (d === 4 && hash(x, 7) > .5)) c = mood.grass[d === 2 ? 1 : 2];
    else if (r > .67 && d > 7) c = up || (!solid(x - 1, y) && d > 4) ? ROCK[0] : (vnoise(x, y, 3) > .55 ? ROCK[1] : ROCK[2]);
    else {
      const k = d < 14 ? 0 : d < 36 ? (d - 14) / 22 : 1 + Math.min(1, (d - 36) / 30);
      c = SOIL[Math.min(2, Math.floor(k + bay(x, y) * .999))];
      if (hash(x, y) < .025) c = RIM;
      if (up) c = RIM; else if (down) c = SOIL[2];
    }
    if (world.map.burnt[i]) c = mix(c, 0x241816, .62);
    c = tn(c);
    if (y >= world.water) c = mix(c, mood.water[1], .6);
    return c;
  }
  const anchored = (x) => solid(x, surf(x)) || solid(x, surf(x) + 1);
  function tree(x, kind) {
    if (!anchored(x)) return;
    const gy = surf(x);
    if (kind === 'gran') {
      const c = mood.snow ? [0x2f5a4a, 0x1f4038] : [0x2f6b4a, 0x1f4a38];
      rect(x, gy - 4, 2, 5, tn(0x5a3a2a));
      for (let k = 0; k < 4; k++) for (let j = 0; j < 7; j++) { const w = 1 + j + k; for (let i = -w; i <= w + 1; i++) wp(x + i, gy - 30 + k * 6 + j, i < 0 ? c[1] : c[0]); }
      if (mood.snow) for (let k = 0; k < 4; k++) for (let i = -2 - k; i <= 1 + k; i++) wp(x + i, gy - 30 + k * 6 + (Math.abs(i) > 1 ? 3 : 1), 0xeef4fb);
      return;
    }
    const hgt = 30 + (x % 7);
    for (let j = 0; j < hgt; j++) { wp(x, gy - j, 0xeeeae0); wp(x + 1, gy - j, hash(x, j) < .22 ? 0x2a2630 : 0xc9c4b8); }
    if (!mood.leaf) {
      for (const [dx, dy, n] of [[-1, -1, 9], [1, -1, 10], [-1, -2, 6], [1, -2, 7]]) for (let k = 1; k <= n; k++) { wp(x + dx * k, gy - hgt + 8 + dy * k * .6, 0xc9c4b8); if (k % 3 === 0) wp(x + dx * k, gy - hgt + 7 + dy * k * .6, 0xffffff); }
      return;
    }
    const L = mood.leaf;
    for (const [dx, dy, r] of [[0, -2, 7], [-7, 3, 5], [7, 2, 6], [-3, 8, 5], [5, 9, 4], [-9, 9, 3]]) {
      const cx = x + dx, cy = gy - hgt + dy;
      for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r) {
        const sh = (i + j) / (2 * r) + (bay(cx + i, cy + j) - .5) * .7;
        wp(cx + i, cy + j, sh < -.25 ? L[0] : sh < .3 ? L[1] : L[2]);
      }
    }
  }
  function house() {
    if (!(anchored(104) && anchored(120) && anchored(136))) return;
    const x = 100, gy = 152, top = gy - 18;
    for (let j = 0; j < 18; j++) for (let i = 0; i < 40; i++) wp(x + i, top + j, i % 4 === 3 ? 0x8a2a24 : 0xa5342a);
    rect(x, top, 2, 18, tn(0xf2efe6)); rect(x + 38, top, 2, 18, tn(0xf2efe6)); rect(x, gy - 2, 40, 2, tn(0x6a6470));
    for (let j = 0; j < 9; j++) for (let i = -3 + j; i < 43 - j; i++) wp(x + i, top - 1 - j, j === 0 ? 0x2a2630 : (i + j) % 3 === 0 ? 0x4a3f48 : 0x5a4d55);
    if (mood.snow) for (let j = 0; j < 9; j++) for (let i = -3 + j; i < 43 - j; i++) if (j === 8 || i < -1 + j || i > 40 - j) wp(x + i, top - 2 - j, 0xf4f8ff);
    rect(x + 28, top - 14, 5, 8, tn(0x8a4a3a)); rect(x + 27, top - 15, 7, 2, tn(0x5a3028));
    rect(x + 5, gy - 14, 8, 12, tn(0xf2efe6)); rect(x + 6, gy - 13, 6, 11, tn(0x2f5a3a)); wp(x + 10, gy - 8, 0xffd66b);
    rect(x + 19, gy - 14, 11, 10, tn(0xf2efe6));
    for (let j = 0; j < 8; j++) for (let i = 0; i < 9; i++) if (i !== 4 && j !== 3) set(x + 20 + i, gy - 13 + j, lit() ? (j < 3 ? 0xffe9a0 : 0xffc85a) : tn(0x9fc8e0));
    for (let j = 0; j < 34; j++) wp(92, gy - j, 0xf2efe6);
    wp(92, gy - 34, 0xffd66b);
  }
  function maypole() {
    const x = 372; if (!anchored(x)) return;
    const gy = surf(x), top = gy - 46, bare = !!mood.snow;
    const g = bare ? [0x8a6a4a, 0x6a4e38] : [0x6fba45, 0x3f8a3c], fl = [0xffe38a, 0xffffff, 0x8ab8ff, 0xffa0b8];
    const leafy = (px2, py) => { wp(px2, py, g[(px2 + py) & 1]); if (!bare && hash(px2, py) < .16) wp(px2, py, fl[Math.floor(hash(py, px2) * 4)]); };
    for (let j = 0; j < 46; j++) { leafy(x, top + j); leafy(x + 1, top + j); }
    for (let i = -12; i <= 13; i++) { leafy(x + i, top + 9); leafy(x + i, top + 10); }
    for (let j = 0; j < 5; j++) for (let i = -2 + (j >> 1); i <= 3 - (j >> 1); i++) leafy(x + i, top - j + 4);
    if (!bare) for (const cx of [x - 10, x + 11]) for (let a = 0; a < 28; a++) leafy(Math.round(cx + Math.cos(a / 28 * 6.283) * 4.4), Math.round(top + 16 + Math.sin(a / 28 * 6.283) * 4.4));
  }
  function fence(x1, x2) {
    for (let x = x1; x <= x2; x++) { if (!anchored(x)) continue; const gy = surf(x); if ((x - x1) % 8 < 2) for (let j = 1; j <= 8; j++) wp(x, gy - j, 0x9a8f80); }
    for (let x = x1 - 3; x <= x2 + 3; x++) { if (!anchored(x)) continue; const k = ((x - x1) % 8 + 8) % 8; wp(x, surf(x) - 2 - k * .6, 0xb5aa98); wp(x, surf(x) - 5 - k * .6, 0x85796a); }
  }
  function mushroom(x) { if (!anchored(x)) return; const gy = surf(x); rect(x + 1, gy - 2, 2, 2, tn(0xf2efe6)); rect(x, gy - 4, 4, 2, tn(0xd8442a)); rect(x + 1, gy - 5, 2, 1, tn(0xd8442a)); wp(x + 1, gy - 4, 0xffffff); wp(x + 3, gy - 3, 0xffffff); }
  function burrowInside(cx, fy, dir) {
    if (solid(cx, fy - 3)) return;
    rect(cx + dir * 14 - 4, fy - 3, 9, 3, tn(0xc8382e)); rect(cx + dir * 14 + (dir > 0 ? 3 : -4), fy - 4, 2, 2, tn(0xf2efe6));
    rect(cx - dir * 13 - 2, fy - 5, 5, 1, tn(0xb07a4a)); rect(cx - dir * 13 - 1, fy - 4, 1, 4, tn(0x8a5a3a)); rect(cx - dir * 13 + 1, fy - 4, 1, 4, tn(0x8a5a3a));
  }
  const LAMPS = [[118, 196], [372, 157]];
  function aurora() {
    for (let k = 0; k < 3; k++) for (let x = 0; x < W; x++) {
      const env = Math.max(0, Math.sin(x / 95 + k * 1.9) * .6 + .5) * (.45 + .55 * vnoise(x + k * 50, 3, 5));
      const y0 = 26 + k * 16 + Math.sin(x / 38 + k * 2.1) * 12, hgt = 20 + 12 * Math.sin(x / 21 + k);
      for (let j = 0; j < hgt; j++) { const a = (1 - j / hgt) * env; if (a > bay(x, Math.round(y0 + j)) * .95) blend(x, y0 + j, j < hgt * .55 ? 0x58f0a8 : 0x8a7cf0, .32 + a * .3); }
    }
  }
  function cloud(cx, cy, s) {
    for (const [dx, dy, r] of [[0, 0, 6], [8, 2, 5], [-8, 3, 4], [15, 4, 3], [3, -4, 4]]) disc(cx + dx * s, cy + dy * s, Math.round(r * s), 0xffffff);
    for (let i = -12 * s; i < 18 * s; i++) for (let j = 4 * s; j < 8 * s; j++) if (get(cx + i, cy + j) === 0xffffff && get(cx + i, cy + j + 2) !== 0xffffff) set(cx + i, cy + j, 0xcfe4f6);
  }
  /* ---------- the four maps: background, terrain colours and decor ---------- */
  function meadowHills() {
    for (let x = 0; x < W; x++) {
      const y1 = Math.round(156 + 10 * Math.sin(x / 50) + 7 * Math.sin(x / 23 + 2) + 3 * Math.sin(x / 11));
      const y2 = Math.round(176 + 8 * Math.sin(x / 37 + 1) + 5 * Math.sin(x / 17));
      const k = Math.floor(x / 7), y3 = Math.round(192 + 6 * Math.sin(x / 29 + 4) - (3.5 - Math.abs(x % 7 - 3)) * (1.5 + hash(k, 9) * 2.5));
      for (let y = y1; y < H; y++) set(x, y, y < y1 + 2 && mood.snow ? 0x9fb4d8 : mood.hill[0]);
      for (let y = y2; y < H; y++) set(x, y, mix(mood.hill[1], mood.hill[0], Math.max(0, .5 - (y - y2) / 16) * (bay(x, y) > .5 ? 1 : 0)));
      for (let y = y3; y < H; y++) set(x, y, mood.forest);
    }
  }
  const depthAt = (x, y) => { let d = 0; while (d < 9 && solid(x, y - d - 1)) d++; return d; };
  const snowCap = (x, y, c) => (mood.snow && !solid(x, y - 1) ? 0xf4f8ff : mood.snow && !solid(x, y - 2) ? 0xdfe8f6 : c);
  const GRANITE = [0xe2b7aa, 0xcfa196, 0xb48a86, 0x8d6d74];
  const WOODC = [0x9a6a46, 0x6a4430];
  function rockColor(x, y) {
    const n = vnoise(x, y, 14) * .6 + vnoise(x, y, 5) * .4;
    let c = n < .35 ? 0x4a4048 : n < .55 ? 0x3a3238 : n < .75 ? 0x2f292f : 0x262126;
    const vein = Math.abs(Math.sin(x * .05 - y * .11 + vnoise(x, y, 30) * 5));
    if (vein < .05) c = 0x8a4a3a; if (vein < .015 && hash(x, y) < .4) c = 0xd8b46a;
    if (!solid(x, y - 1)) c = 0x6a5e62; else if (!solid(x, y + 1)) c = 0x241f24;
    return c;
  }
  const ART = {
    midsommar: {
      background: meadowHills,
      decor() { tree(49, 'bjork'); tree(205, 'bjork'); tree(318, 'gran'); tree(434, 'bjork'); house(); maypole(); fence(218, 246); mushroom(158); mushroom(412); mushroom(330); },
      color: terrainColor,
      after() {
        burrowInside(118, 209, -1); burrowInside(372, 168, 1);
        for (const [lx, ly] of LAMPS) if (!solid(lx, ly - 2)) { wp(lx, ly - 4, 0x8a8f9a); wp(lx, ly - 3, 0x8a8f9a); rect(lx - 1, ly - 2, 3, 3, 0xffd66b); set(lx, ly - 1, 0xfff6c8); }
      },
      lights(L) {
        if (lit() && anchored(120)) L.push([124, 142, 30, '255,200,95', .7]);
        for (const [lx, ly] of LAMPS) if (!solid(lx, ly - 2)) L.push([lx, ly, 26, '255,205,100', .75]);
      }
    },
    kobbarna: {
      background() {
        for (let x = 0; x < W; x++) { const h = Math.max(0, 6 + 5 * Math.sin(x / 31) + 3 * Math.sin(x / 9)) * (x % 160 < 110 ? 1 : 0); for (let y = Math.round(world.map.water - h); y < world.map.water; y++) set(x, y, mood.hill[0]); }
        for (const [gx, gy] of [[150, 60], [170, 52], [330, 96], [205, 110]]) for (const [dx, dy] of [[-2, 0], [-1, -1], [0, 0], [1, -1], [2, 0]]) set(gx + dx, gy + dy, mood.snow ? 0xd8dde8 : 0x3a3a4a);
      },
      color(x, y) {
        const i = y * W + x;
        if (world.map.mat[i] === 3) return tn(y % 2 ? WOODC[1] : (x % 4 === 0 ? WOODC[1] : WOODC[0]));
        const d = y - surf(x);
        const band = vnoise(x * .6, y * 1.2, 9) * .7 + vnoise(x, y, 4) * .3 + d / 120;
        let c = GRANITE[Math.min(3, Math.floor(band * 3 + bay(x, y) * .6))];
        if (Math.abs(Math.sin(x * .09 + y * .045 + vnoise(x, y, 20) * 4)) < .035 && d > 2) c = 0x6e5560;
        if (!solid(x, y - 1)) c = 0xf3d2c6; else if (!solid(x - 1, y) || !solid(x + 1, y)) c = mix(c, 0xffffff, .15);
        if (d < 7 && hash(x, y) < .035) c = hash(y, x) < .5 ? 0xe0a040 : 0xc9c46a;
        if (world.map.burnt[i]) c = mix(c, 0x3a2a2a, .5);
        c = tn(snowCap(x, y, c));
        if (y > world.water - 3 && y < world.water) c = mix(c, 0x3a3a4a, .4);
        if (y >= world.water) c = mix(c, y - world.water < 2 ? mood.water[0] : mix(mood.water[0], mood.water[1], Math.min(1, (y - world.water) / 50)), .8);
        return c;
      },
      decor() {},
      after() {
        const bh = world.map.boathouse;
        if (bh && solid(bh.x + 8, bh.base + 1) && solid(bh.x + 24, bh.base + 1)) {
          const x = bh.x, base = bh.base, top = base - 22;
          for (let j = 0; j < 22; j++) for (let i = 0; i < 30; i++) wp(x + i, top + j, i % 4 === 3 ? 0x8a2a24 : 0xa5342a);
          rect(x, top, 2, 22, tn(0xf2efe6)); rect(x + 28, top, 2, 22, tn(0xf2efe6));
          for (let j = 0; j < 9; j++) for (let i = -2 + j; i < 32 - j; i++) wp(x + i, top - 1 - j, j === 0 ? 0x2a2630 : mood.snow ? 0xf4f8ff : 0x4a3f48);
          rect(x + 10, base - 13, 10, 13, tn(0x5a1e1a)); rect(x + 14, base - 13, 2, 13, tn(0xf2efe6));
          for (const px2 of [x + 2, x + 14, x + 27]) for (let y = base + 3; y < world.map.water + 8; y++) if (!solid(px2, y)) wp(px2, y, 0x5a3a2a);
        }
        for (const x of [162, 172, 182, 192]) if (solid(x, world.map.water - 6)) for (let yy = world.map.water - 4; yy < world.map.water + 10; yy++) if (!solid(x, yy)) wp(x, yy, 0x4a3022);
        const lx = 418;
        if (anchored(lx)) {
          const base = surf(lx);
          for (let j = 0; j < 40; j++) { const wdt = 4 + Math.floor(j / 10); for (let i = -wdt; i <= wdt; i++) wp(lx + i, base - 40 + j, (j > 12 && j < 20) ? 0xc8382e : (i < -wdt + 2 ? 0xd8dde8 : 0xffffff)); }
          rect(lx - 5, base - 46, 11, 6, tn(0x2a2630)); rect(lx - 3, base - 45, 7, 4, 0xfff1b0); rect(lx - 6, base - 48, 13, 2, tn(0xc8382e));
        }
      },
      lights(L) { if (anchored(418)) L.push([418, surf(418) - 43, 34, '255,240,170', lit() ? .9 : .4]); }
    },
    trollskogen: {
      background() {
        const sp = (x, base, h, c, c2) => { for (let j = 0; j < h; j++) { const wd = Math.floor((j / h) * h * .28) + ((j % 6) < 2 ? 0 : 1); for (let i = -wd; i <= wd; i++) set(x + i, base - h + j, i < 0 ? c2 : c); } };
        const far = mix(mood.hill[0], mood.forest, .5), near = mood.forest;
        for (let k = 0; k < 26; k++) sp(k * 19 + (k % 3) * 5, 210 + (k % 4) * 3, 54 + (k * 7) % 30, far, mix(far, 0x000000, .12));
        for (let k = 0; k < 18; k++) sp(k * 28 + 9, 228, 70 + (k * 11) % 34, near, mix(near, 0x000000, .15));
      },
      color(x, y) {
        const i = y * W + x, m = world.map;
        let c;
        if (m.mat[i] === 2) {
          let cx = x, cy = y, r = 4;
          for (const b of m.boulders) { if (b.gone) continue; const dx = x - b.cx, dy = y - b.cy; if (dx * dx + dy * dy <= (b.r + 3) * (b.r + 3)) { cx = b.cx; cy = b.cy; r = b.r; break; } }
          const sh = ((x - cx) + (y - cy)) / (2 * r) + (bay(x, y) - .5) * .4;
          c = sh < -.35 ? 0xa4a8b0 : sh < .1 ? 0x868a94 : sh < .45 ? 0x686c78 : 0x4e5260;
          const d = depthAt(x, y);
          if (d < 3 && bay(x, y) < .8 - d * .25 && !(m.troll && cx === m.troll.x && Math.abs(x - cx) < 16 && y > cy - 14)) c = mood.snow ? (d ? 0xdfe8f6 : 0xf4f8ff) : d === 0 ? 0x9fd06a : 0x5f9a4a;
        } else {
          const d = depthAt(x, y);
          c = d === 0 ? (mood.snow ? 0xf4f8ff : mood.grass[0]) : d < 3 ? mood.grass[1] : d < 5 + (bay(x, y) > .5) ? mood.grass[2] : (vnoise(x, y, 7) > .6 ? 0x3b2f2a : 0x2b221f);
          if (d > 8 && hash(x, y) < .02) c = 0x6a4a34;
        }
        if (m.burnt[i]) c = mix(c, 0x241816, .6);
        c = tn(c);
        if (y >= world.water) c = mix(c, mood.water[1], .6);
        return c;
      },
      decor() {
        for (const x of [30, 64, 128, 190, 262, 300, 396, 470]) if (anchored(x)) { const g = surf(x); for (let k = 0; k < 6; k++) { wp(x - k, g - 1 - (k >> 1), 0x4f8a4b); wp(x + k, g - 1 - (k >> 1), 0x5f9a52); } }
        for (const x of [118, 248, 288, 410]) mushroom(x);
      },
      after() {
        const tr = world.map.troll;
        if (tr && solid(tr.x, tr.y)) {
          const f = (x, y, c) => wp(tr.x + x, tr.y + y, c), awake = world.settings && world.settings.night && world.trollTurn === world.turn.number;
          for (const ex of [-12, 4]) {
            if (awake) { f(ex + 1, -7, 0xffffff); f(ex + 2, -7, 0xffe38a); f(ex + 3, -7, 0xffffff); f(ex + 2, -6, 0x2a2630); }
            else { f(ex, -6, 0x2a2630); f(ex + 1, -5, 0x2a2630); f(ex + 2, -5, 0x2a2630); f(ex + 3, -5, 0x2a2630); f(ex + 4, -6, 0x2a2630); }
          }
          for (let j = 0; j < 7; j++) for (let i = -3; i <= 3 - (j > 4 ? 1 : 0); i++) if (i * i + (j - 3) * (j - 3) <= 10) f(i - 3, -2 + j, j < 2 ? 0xa8acb6 : 0x8e929c);
          for (let i = -10; i <= 8; i++) f(i, 9 + Math.round(Math.abs(i) / 6), 0x3a3e4a);
          if (!awake) { text(P, 'Z', tr.x + 22, tr.y - 34, 0xd8dde8); text(P, 'Z', tr.x + 28, tr.y - 41, 0xd8dde8); }
        }
        for (let y = 180; y < 232; y++) for (let x = 0; x < W; x++) { if (solid(x, y)) continue; const a = Math.max(0, 1 - Math.abs(y - 214 + 10 * Math.sin(x / 70)) / 18) * (.55 + .45 * vnoise(x, y, 23)); if (a > bay(x, y) * 1.1 + .1) blend(x, y, 0xc8d4d8, .3); }
      },
      lights(L, t) { L.push([268 + Math.sin(t * .05) * 20, 160 + Math.cos(t * .07) * 8, 26, '150,210,255', .8]); }
    },
    gruvan: {
      background() {
        const r = world.map.roof;
        const x = 305, b = r;
        for (let j = 0; j < 38; j++) { const o = Math.floor(j / 3); set(x - 14 + o, b - j, 0x6a4a34); set(x + 14 - o, b - j, 0x6a4a34); if (j % 8 === 0) for (let i = -14 + o; i <= 14 - o; i++) set(x + i, b - j, 0x5a3a2a); }
        for (let a = 0; a < 40; a++) set(x + Math.round(Math.cos(a / 40 * 6.283) * 6), b - 40 + Math.round(Math.sin(a / 40 * 6.283) * 6), 0x9aa0aa);
        rect(x + 22, b - 14, 34, 14, tn(0xa5342a)); for (let j = 0; j < 6; j++) rect(x + 20 + j, b - 15 - j, 38 - 2 * j, 1, mood.snow ? 0xf4f8ff : 0x3a2f38);
        rect(x + 30, b - 9, 6, 5, lit() ? 0xffd66b : tn(0x9fc8e0));
      },
      color(x, y) {
        const i = y * W + x;
        let c = y <= world.map.roof + 1 ? (y === world.map.roof ? (mood.snow ? 0xf4f8ff : mood.grass[1]) : mood.grass[2]) : rockColor(x, y);
        if (world.map.burnt[i]) c = mix(c, 0x120c10, .5);
        if (y >= world.water) c = mix(c, mood.water[1], .6);
        return c;
      },
      decor() {},
      cave(x, y) { return (x + y * 3) % 9 === 0 ? 0x1c1820 : 0x161219; },
      after() {
        for (let y = world.map.roof; y < 232; y++) { if (solid(299, y)) continue; set(299, y, 0x8a5a3a); set(311, y, 0x8a5a3a); if (y % 5 === 0) for (let x = 299; x <= 311; x++) if (!solid(x, y)) set(x, y, 0xa86a42); }
        const floor = (x, from) => { for (let y = from; y < H; y++) if (solid(x, y)) return y; return H; };
        for (const [x, from] of [[60, 80], [140, 80], [220, 80], [380, 80], [440, 80], [40, 150], [250, 150], [200, 210], [360, 210], [430, 210]]) {
          if (solid(x, from)) continue;
          const fy = floor(x, from); let ty = fy - 1; while (ty > from - 30 && !solid(x, ty - 1)) ty--;
          for (let y = ty; y < fy; y++) { set(x - 6, y, 0x7a5236); set(x + 6, y, 0x7a5236); } for (let i = -7; i <= 7; i++) set(x + i, ty, 0x9a6a46);
        }
        for (const [x1, x2, from] of [[20, 320, 150], [130, 470, 210]]) for (let x = x1; x <= x2; x++) { if (solid(x, from)) continue; const fy = floor(x, from); if (fy >= H) continue; set(x, fy - 1, x % 5 === 0 ? 0x6a4a34 : 0x9aa0aa); }
        for (const l of world.map.lamps) { set(l.x, l.y - 2, 0x8a8f9a); rect(l.x - 1, l.y - 1, 3, 3, l.on ? 0xffd66b : 0x3a3238); if (l.on) set(l.x, l.y, 0xfff6c8); }
      },
      lights(L) { for (const l of world.map.lamps) if (l.on) L.push([l.x, l.y, 40, '255,190,90', .85]); L.push([333, world.map.roof - 7, 22, '255,200,100', lit() ? .7 : .2]); },
      dark: true
    }
  };
  ART.boras = {
    background() {
      for (let y = 0; y < 230; y++) for (let x = 0; x < W; x++) blend(x, y, 0x5a6070, .45);
      for (let k = 0; k < 16; k++) {
        const bx = k * 31 - 6 + (k % 3) * 4, bw = 18 + (k * 7) % 12, bh = 34 + (k * 13) % 40, top = 214 - bh;
        for (let y = top; y < H; y++) for (let x = bx; x < bx + bw; x++) set(x, y, k % 2 ? 0x3a3f4e : 0x444a5a);
        for (let y = top + 4; y < 206; y += 7) for (let x = bx + 3; x < bx + bw - 3; x += 5) if (hash(x, y) < .45) rect(x, y, 2, 3, lit() || hash(y, x) < .4 ? 0xffd68a : 0x6a7088);
      }
      const cx = 252;
      for (let y = 118; y < H; y++) for (let x = cx - 7; x <= cx + 7; x++) set(x, y, x < cx - 4 ? 0x5a5060 : 0x6a6070);
      for (let j = 0; j < 22; j++) for (let i = -Math.trunc((22 - j) / 3); i <= Math.trunc((22 - j) / 3); i++) set(cx + i, 96 + j, 0x3a3440);
      for (let k = 0; k < 40; k++) { const fx = cx - 6 + (k * 7) % 13, fy = 112 - (k * 11) % 26; set(fx, fy, k % 3 ? 0xffa040 : 0xffe38a); if (k % 2) set(fx, fy + 1, 0xd8442a); }
      rect(cx - 2, 130, 4, 6, 0x2a2430);
    },
    color(x, y) {
      const i = y * W + x, m = world.map, st = m.statue;
      let c;
      if (m.mat[i] === 2 && st && x >= st.x - 9 && x <= st.x + 14 && y >= st.top && y <= st.base) c = hash(x, y) < .08 ? 0x5a9a7a : (x - st.x) + (y - st.top) * .2 < 2 ? 0xb08a4a : 0x8a6a3a;
      else if (m.mat[i] === 2) { c = bay(x, y) > .55 ? 0x8a8c90 : 0x9a9ca0; if (!solid(x, y - 1)) c = 0xb4b6ba; else if (hash(x, y) < .03) c = 0x6a6064; }
      else if (m.mat[i] === 3) c = y % 2 ? WOODC[1] : WOODC[0];
      else { const d = depthAt(x, y); c = d < 3 ? (d === 0 && x % 12 < 5 && x < 196 ? 0xd8d8c8 : 0x3a3a42) : (vnoise(x, y, 7) > .55 ? 0x5a4a3a : 0x4a3a30); }
      if (m.burnt[i]) c = mix(c, 0x241816, .55);
      c = tn(c);
      if (y >= world.water) c = mix(c, mood.water[1], .6);
      return c;
    },
    decor() {},
    after() {
      rect(28, 98, 11, 11, 0x2a6fd0); text(P, 'P', 33, 101, 0xffffff, 1, 1);
      for (const lx of [16, 186, 292, 428]) { const gy = surf(lx); if (!anchored(lx)) continue; for (let j = 1; j < 20; j++) wp(lx, gy - j, 0x5a5a62); rect(lx - 1, gy - 21, 4, 2, tn(0x5a5a62)); set(lx + 1, gy - 19, 0xffd68a); }
      for (let x = 196; x <= 284; x += 4) if (solid(x, 200)) for (let j = 1; j <= 4; j++) wp(x, 200 - j, 0x8a8c90);
    },
    lights(L, t) {
      L.push([252, 106, 34 + (still ? 0 : Math.sin(t * .9) * 4), '255,150,60', .9]);
      for (const lx of [16, 186, 292, 428]) if (anchored(lx)) L.push([lx + 1, surf(lx) - 19, 20, '255,215,140', .7]);
    }
  };
  const art = () => ART[world.map.id] || ART.midsommar;

  // Gruvan: everything below ground is dark except where light reaches.
  let lightBase = null, lightKey = '';
  function darkness(dyn) {
    const m = world.map, top = m.roof + 2;
    const key = world.mapVersion + '|' + m.lamps.map((l) => l.on).join('');
    if (key !== lightKey) {
      lightKey = key; lightBase = new Float32Array(W * H);
      for (const l of m.lamps) if (l.on) addLight(lightBase, l.x, l.y, 46);
    }
    const L = lightBase.slice();
    for (const [x, y, r] of dyn) addLight(L, x, y, r);
    for (let y = top; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, step = Math.floor((Math.min(1, L[i]) + bay(x, y) * .25) * 4) / 4;
      if (step < 1) T[i] = abgr(mix(get(x, y), 0x040308, Math.min(.92, (1 - step) * .95)));
    }
  }
  function addLight(A, lx, ly, r) {
    lx = Math.round(lx); ly = Math.round(ly);
    for (let y = Math.max(0, ly - r); y <= Math.min(H - 1, ly + r); y++) for (let x = Math.max(0, lx - r); x <= Math.min(W - 1, lx + r); x++) {
      const d = ((x - lx) * (x - lx) + (y - ly) * (y - ly)) / (r * r);
      if (d < 1) { const i = y * W + x, v = 1 - d; if (v > A[i]) A[i] = v; }
    }
  }

  function buildBase() {
    T = base; tintCache = new Map();
    const S = mood.sky, n = S.length - 1, A = art();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) set(x, y, S[Math.min(n, Math.floor(Math.min(1, y / (world.map.roof ? Math.max(30, world.map.roof) : 205)) * n + bay(x, y) * .999))]);
    for (let i = 0; i < 110; i++) if (hash(i, 3) < mood.stars) set(hash(i, 1) * W, hash(i, 2) * (world.map.roof || 130), hash(i, 5) < .3 ? 0xffffff : 0xb8c4e8);
    if (mood.aurora && !world.map.roof) aurora();
    if (mood.clouds) { cloud(90, 44, 1.4); cloud(250, 28, 1); cloud(350, 70, 1.2); cloud(30, 96, .8); }
    if (mood.sun && !world.map.roof) disc(mood.sun.x, mood.sun.y, mood.sun.r, mood.sun.c);
    if (mood.moon) { const m = mood.moon, my = world.map.roof ? 18 : m.y, mx = world.map.roof ? 200 : m.x; disc(mx, my, m.r - (world.map.roof ? 2 : 0), m.c); disc(mx + 4, my - 3, m.r - (world.map.roof ? 3 : 1), S[1]); }
    A.background();
    const cv = world.map.cave;
    for (let i = 0; i < W * H; i++) if (cv[i] && !world.map.solid[i]) { const x = i % W, y = (i / W) | 0; set(x, y, A.cave ? A.cave(x, y) : tn((x + y * 2) % 7 === 0 ? 0x4a302a : 0x3a2520)); }
    A.decor();
    const s = world.map.solid;
    const mt = world.map.mat;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (s[y * W + x]) set(x, y, mt[y * W + x] === 4 ? tn(!solid(x, y - 1) ? 0xffffff : bay(x, y) > .7 ? 0xc4d3ea : 0xeef4fb) : A.color(x, y));
    A.after();
    T = buf;
  }

  /* ---------- effects from simulation events ---------- */
  let parts = [], flashes = [], floaters = [], banner = null, shake = 0, plane = null;
  const rnd = Math.random;
  function onEvents(evs, w) {
    for (const e of evs) {
      if (e.t === 'boom') {
        flashes.push({ x: e.x, y: e.y, r: e.r, age: 0 });
        shake = Math.max(shake, Math.min(10, e.r / 2.5));
        for (let i = 0; i < e.r * 2; i++) { const a = rnd() * 6.283, v = .6 + rnd() * 2.6; parts.push({ x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.2, g: .09, life: 30 + rnd() * 30, c: [0x8a5a3a, 0x6d4330, 0xb07a4a, 0x5fae3a][i % 4], kind: 'dirt' }); }
        for (let i = 0; i < 10; i++) { const a = rnd() * 6.283, v = rnd() * 1.6; parts.push({ x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - .4, g: -.01, life: 50 + rnd() * 40, c: 0x6a707c, kind: 'smoke', r: 1 + rnd() * 2 }); }
        for (let i = 0; i < 12; i++) { const a = rnd() * 6.283, v = 1 + rnd() * 2; parts.push({ x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: .03, life: 12 + rnd() * 10, c: 0xffd66b, kind: 'spark' }); }
      } else if (e.t === 'splash') {
        for (let i = 0; i < 14; i++) parts.push({ x: e.x + (rnd() - .5) * 6, y: e.y, vx: (rnd() - .5) * 1.6, vy: -1 - rnd() * 2.2, g: .12, life: 40, c: 0xbfe6f4, kind: 'drop' });
      } else if (e.t === 'damage') {
        floaters.push({ x: e.x, y: e.y, s: '-' + e.n, c: 0xff6a5a, age: 0 });
      } else if (e.t === 'turn') {
        const u = w.units.find((o) => o.id === e.unit);
        banner = { s: possessive(u.name) + ' TUR', c: teamColor(w, u.team).c, age: 0 };
      } else if (e.t === 'cloud') {
        for (let i = 0; i < 16; i++) { const a = rnd() * 6.283, v = rnd() * 1.2; parts.push({ x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - .3, g: -.005, life: 50, c: 0xb8d45a, kind: 'smoke', r: 2 }); }
      } else if (e.t === 'crate') {
        floaters.push({ x: e.x, y: e.y - 10, s: e.kind === 'fika' ? '+' + e.n : e.kind === 'wrong' ? 'FEL VARA' : WEAPONS[e.weapon].name.toUpperCase(), c: e.kind === 'fika' ? 0x9bd45a : e.kind === 'wrong' ? 0xff6a5a : 0xffd66b, age: 0 });
      } else if (e.t === 'trade') {
        floaters.push({ x: e.x, y: e.y - 26, s: 'BYTE: ' + WEAPONS[e.give].name.toUpperCase(), c: 0xffd66b, age: 0 });
      } else if (e.t === 'sinkhole') {
        floaters.push({ x: e.x, y: e.y - 10, s: 'SLUKHÅL!', c: 0xff6a5a, age: 0 }); shake = Math.max(shake, 5);
      } else if (e.t === 'ticket') {
        banner = { s: 'ENKEL BILJETT', c: 0x8ad0ff, age: 0 };
        for (let i = 0; i < 12; i++) parts.push({ x: e.x, y: e.y - 6, vx: (rnd() - .5) * 1.5, vy: -rnd() * 1.5, g: -.01, life: 40, c: 0xd8e8ff, kind: 'smoke', r: 1 });
      } else if (e.t === 'back') {
        floaters.push({ x: e.x, y: e.y - 20, s: 'TILLBAKA FRÅN BORÅS', c: 0x8ad0ff, age: 0 });
      } else if (e.t === 'plane') {
        plane = { x: -20, y: 14, tx: e.x };
      } else if (e.t === 'flood') {
        banner = { s: 'VÅRFLODEN STIGER', c: 0x8ad0ff, age: 0 };
      }
    }
  }
  function stepEffects() {
    for (const p of parts) { p.vy += p.g; p.x += p.vx; p.y += p.vy; p.life--; if (p.kind === 'smoke') { p.vx *= .97; p.r += .03; } if ((p.kind === 'dirt' || p.kind === 'drop') && (solid(p.x | 0, p.y | 0) || p.y > world.water)) p.life = 0; }
    parts = parts.filter((p) => p.life > 0 && p.y < H + 5);
    for (const f of flashes) f.age++; flashes = flashes.filter((f) => f.age < 9);
    for (const f of floaters) { f.age++; f.y -= .35; } floaters = floaters.filter((f) => f.age < 75);
    if (banner) { banner.age++; if (banner.age > 100) banner = null; }
    shake *= .85; if (shake < .3) shake = 0;
    if (plane) { plane.x += 5; if (plane.x > W + 30) plane = null; }
  }

  /* ---------- dynamic layer ---------- */
  let lights = [];
  function drawUnit(u, t, active, w, view) {
    const tm = teamColor(w, u.team), x = px(u.X), y = px(u.Y), sx = x - 4, sy = y - 11;
    const beard = u.id % 2 === 1;
    const pal = { L: tm.c, l: tm.d, h: 0xf4f4f0, S: 0xf2c9a2, N: 0xe89a80, e: 0x2a2030, W: beard ? 0xf4f4f0 : 0x9aa0aa, G: 0x9aa0aa, g: 0x6a707c, B: 0x3a2c28 };
    const rows = hatRows(VATTE.slice(), w.teams[u.team].hat);
    if (!beard) rows[8] = '..SSSSS..';
    if (!still && (t + u.id * 7) % 41 < 2) rows[6] = '..SSSSS..';
    if (u.air && !still) rows[11] = (t & 2) ? '.B.....B.' : '..B...B..';
    sprite(rows, pal, sx, sy, u.face < 0);
    const wp0 = WEAPONS[w.turn.weapon];
    if (active && (w.turn.phase === 'aim') && wp0.aim && !u.air) {
      const a = (view.aim ? view.aim.angle : w.turn.aim.angle) * Math.PI / 180;
      for (let k = 0; k < 8; k++) { set(x + Math.cos(a) * (k - 1), y - 5 - Math.sin(a) * (k - 1), tn(k > 5 ? 0x4a5530 : 0x8a9d55)); }
    }
    text(P, u.name, x, sy - 14, tm.c, 1, 1);
    text(P, String(u.hp), x, sy - 7, 0xffffff, 1, 1);
    if (active && (w.turn.phase === 'aim' || w.turn.phase === 'retreat')) {
      const b = still ? 0 : [0, 1, 2, 1][(t >> 1) & 3];
      for (let j = 0; j < 4; j++) for (let i = -3 + j; i <= 3 - j; i++) set(x + i, sy - 27 + j - b, 0xffd66b);
      rect(x - 1, sy - 31 - b, 3, 4, 0xffd66b);
    }
  }
  // Trollskogen: the mist in the hollows hides the other team's vättar while a turn is on.
  function inFog(w, u, act) {
    if (w.map.id !== 'trollskogen' || !act || u.team === act.team || (w.turn.phase !== 'aim' && w.turn.phase !== 'retreat')) return false;
    const x = px(u.X), y = px(u.Y) - 5;
    return Math.abs(y - (214 - 10 * Math.sin(x / 70))) < 11;
  }
  function drawAim(w, view) {
    const u = activeUnit(w), wp0 = WEAPONS[w.turn.weapon];
    if (view.target != null && wp0.target && w.turn.phase === 'aim' && (wp0.build || wp0.ticket)) {
      const x = Math.round(view.target), y = Math.round(view.targetY || 0);
      if (wp0.build) { const tilt = u ? u.face : 1; for (let i = -14; i <= 14; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2 === 0) set(x + i, y + j + Math.trunc((i * tilt + 14) / 10) - 1, 0xc8925e); }
      else for (let a = 0; a < 24; a++) set(x + Math.round(Math.cos(a / 24 * 6.283) * 9), y + Math.round(Math.sin(a / 24 * 6.283) * 9), 0x8ad0ff);
      return;
    }
    if (view.target != null && wp0.target && w.turn.phase === 'aim') {
      const x = Math.round(view.target);
      for (let y = 4; y < H; y += 4) if (!solid(x, y)) set(x, y, 0xff6a5a);
      for (let j = 0; j < 4; j++) for (let i = -3 + j; i <= 3 - j; i++) set(x + i, 4 + j, 0xff6a5a);
      return;
    }
    if (!u || !u.alive || u.air || w.turn.phase !== 'aim' || !wp0.aim) return;
    const aim = view.aim || w.turn.aim, a = aim.angle * Math.PI / 180;
    const cx = px(u.X), cy = px(u.Y) - 5, len = 12 + aim.power * .5;
    for (let d = 10; d < len; d += 3) {
      const k = (d - 10) / Math.max(1, len - 10), c = mix(0xffe38a, 0xff5a3a, k);
      const x = cx + Math.cos(a) * d, y = cy - Math.sin(a) * d;
      set(x, y, c); set(x + 1, y, c);
    }
    const ex = Math.round(cx + Math.cos(a) * (len + 3)), ey = Math.round(cy - Math.sin(a) * (len + 3));
    for (const [dx, dy] of [[-3, 0], [-2, 0], [2, 0], [3, 0], [0, -3], [0, -2], [0, 2], [0, 3]]) set(ex + dx, ey + dy, 0xffffff);
    if (view.aim) text(P, aim.power + '%', cx, cy - 32, 0xffe38a, 1, 1);
  }
  function drawProjectiles(w, t) {
    for (const p of w.projectiles) {
      const x = px(p.X), y = px(p.Y);
      if (p.kind === 'gurra') {
        const n = Math.hypot(p.VX, p.VY) || 1, ux = p.VX / n, uy = p.VY / n;
        for (let k = -3; k <= 3; k++) { set(x + ux * k, y + uy * k, tn(k > 1 ? 0x4a5530 : 0x8a9d55)); set(x + ux * k, y + uy * k + 1, tn(0x5a6b3a)); }
        for (let k = 4; k <= 6 + (still ? 0 : t % 3); k++) set(x - ux * k, y - uy * k + (k & 1), k < 6 ? 0xfff6c8 : 0xffa040);
        if (!still || t % 2) parts.push({ x: x - ux * 6, y: y - uy * 6, vx: (rnd() - .5) * .3, vy: -.15, g: -.004, life: 30, c: 0xe8ecf4, kind: 'smoke', r: 1 });
        lights.push([x - ux * 5, y - uy * 5, 18, '255,170,70', .9]);
      } else if (p.kind === 'strom') {
        rect(x - 2, y - 2, 5, 4, 0xd8c060); rect(x - 2, y - 1, 5, 2, 0xc8382e); set(x - 1, y - 1, 0xffffff); set(x + 1, y - 1, 0xffffff);
        if (p.fuse < 60 && (t & 1)) set(x, y - 3, 0x9bd45a);
      } else if (p.kind === 'bullar' || p.kind === 'ball') {
        const r = p.kind === 'bullar' ? 2 : 1;
        disc(x, y, r, 0x9a6038); set(x - 1, y - 1, 0xd09a68);
      } else if (p.kind === 'korv') {
        const k = (t + x) % 4;
        for (const [dx, dy] of [[-1, -2], [0, -2], [1, -2], [2, -1], [2, 0], [2, 1], [1, 2], [0, 2], [-1, 2], [-2, 1], [-2, 0], [-2, -1]]) set(x + dx, y + dy, (dx + dy + k) % 3 ? 0x8a3a2a : 0xc8604a);
      } else if (p.kind === 'hast') {
        sprite(HORSE, { r: 0xe5533d, w: 0xffffff, b: 0x4fa3ff, g: 0x9bd45a }, x - 4, y - 7 - (still ? 0 : (t >> 1) % 2), p.dir < 0, true);
      } else if (p.kind === 'alg') {
        sprite(MOOSE[still ? 0 : (t >> 1) % 2], { a: 0xd8c8a0, b: 0x6a4430, n: 0x3a2418 }, x - 6, y - 7, p.dir < 0);
      } else if (p.kind === 'drop') {
        set(x, y, 0x8ad0ff); if (p.VY > 600) set(x, y - 1, 0xbfe6f4);
      } else if (p.kind === 'kraft') {
        rect(x - 2, y - 1, 5, 3, 0xd8382a); set(x - 3, y - 2, 0xd8382a); set(x + 3, y - 2, 0xd8382a);
      } else if (p.kind === 'sno') {
        const r = p.roll ? p.size : 2; disc(x, y - r, r, 0xffffff); for (let i = -r + 1; i < r; i++) set(x + i, y, 0xc4d3ea);
      } else if (p.kind === 'jas') {
        rect(x - 1, y - 3, 3, 6, tn(0x6a707c)); set(x, y + 3, 0xffe38a); set(x - 1, y - 4, tn(0x9aa0aa)); set(x + 1, y - 4, tn(0x9aa0aa));
      } else if (p.kind === 'tarta') {
        disc(x, y, 3, 0x8fd06a); set(x, y - 4, 0xd8382a); rect(x - 3, y + 1, 7, 1, 0xf4c2d0);
      } else if (p.kind === 'troll') {
        disc(x, y, 3, tn(0x868a94)); set(x - 1, y - 1, tn(0xa4a8b0));
      } else {
        rect(x - 1, y - 4, 3, 5, 0xd8442a); rect(x - 1, y - 2, 3, 1, 0xf4e8c0);
        set(x + 1, y - 5, 0xb0a080);
        if (still || t % 2) { set(x + 2, y - 6, 0xffe38a); lights.push([x + 2, y - 6, 10, '255,220,120', .8]); }
        text(P, String(Math.ceil(p.fuse / 60)), x + 6, y - 5, 0xffe38a, 1, 0);
      }
    }
  }
  function drawClouds(w, t) {
    for (const c of w.clouds) {
      const cx = px(c.X), cy = px(c.Y), R = CLOUD_RADIUS;
      for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) {
        const d = Math.hypot(i, j * 1.3) / R + (vnoise(cx + i + t * .3, cy + j, 6) - .5) * .5;
        if (d < 1 && bay(cx + i, cy + j) > d * .9 + .15) blend(cx + i, cy + j, d < .5 ? 0xc8e06a : 0x8aa83a, .55);
      }
    }
  }
  function drawStones(w) {
    for (const s of w.stones) {
      const x = px(s.X), y = px(s.Y);
      rect(x - 2, y - 6, 5, 7, tn(0x8b8f98)); rect(x - 1, y - 7, 3, 1, tn(0x8b8f98)); rect(x - 2, y - 6, 1, 7, tn(0xb3b8bd));
      const rc = teamColor(w, s.team).d; wp(x, y - 5, rc); wp(x - 1, y - 3, rc); wp(x + 1, y - 4, rc); wp(x, y - 2, rc);
    }
  }
  function water(w, t) {
    const A = mood.water, ice = !!mood.snow, WL = w.water;
    for (let y = Math.max(0, WL); y < H; y++) for (let x = 0; x < W; x++) {
      if (solid(x, y)) continue;
      const d = y - WL; let c;
      if (ice) c = d < 1 ? 0xe4eefa : d < 3 ? 0x9fb4d8 : mix(A[0], A[1], Math.min(1, d / 14));
      else {
        const wave = Math.sin((x + t * 1.5) / 9) + Math.sin((x - t) / 4.3) * .5;
        if (d === 0) { if (wave < .1) continue; c = mix(A[0], 0xffffff, .55); }
        else {
          c = d / 22 + bay(x, y) * .5 > .62 ? A[1] : A[0];
          if (d > 1 && d % 4 === 2 && ((x * 3 + d * 11 + (t >> 1)) % 37) < 5) c = mix(c, 0xffffff, .28);
          const s = mood.sun; if (s && Math.abs(x - s.x) < 10 - d / 2 && (x + d + (t >> 1)) % 3 === 0) c = mix(c, s.c, .6);
        }
      }
      set(x, y, c);
    }
  }
  function ambient(t) {
    const p = mood.part;
    if (p === 'fly') for (let i = 0; i < 12; i++) {
      const x = hash(i, 11) * W + Math.sin(t * .11 + i) * 7, y = 96 + hash(i, 12) * 90 + Math.cos(t * .08 + i * 2) * 5;
      if (!solid(x | 0, y | 0) && (t + i * 5) % 23 < 15) { set(x, y, 0xf2ff9a); lights.push([x, y, 7, '242,255,140', .55]); }
    } else if (p === 'snow') for (let i = 0; i < 80; i++) {
      const y = (hash(i, 21) * H + t * (.6 + hash(i, 22) * .8)) % H, x = (hash(i, 23) * W + Math.sin(t * .07 + i) * 4 + t * world.wind * .06 + W * 99) % W;
      if (!solid(x | 0, y | 0)) set(x, y, i % 3 ? 0xffffff : 0xb8c8e8);
    } else if (p === 'leaf') for (let i = 0; i < 22; i++) {
      const y = (hash(i, 31) * 230 + t * (.5 + hash(i, 32) * .5)) % 230, x = (hash(i, 33) * W + t * (.3 + world.wind * .08) + Math.sin(t * .15 + i) * 5 + W * 99) % W;
      if (!solid(x | 0, y | 0)) set(x, y, [0xffc94d, 0xe8892f, 0xb8502a][i % 3]);
    } else for (let i = 0; i < 16; i++) {
      const x = (hash(i, 41) * W + t * (.2 + world.wind * .05) + W * 99) % W, y = 60 + hash(i, 42) * 120 + Math.sin(t * .06 + i) * 6;
      if (!solid(x | 0, y | 0)) set(x, y, 0xffffff);
    }
  }
  function drawParts() {
    for (const p of parts) {
      if (p.kind === 'smoke') {
        const r = Math.round(p.r);
        for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + 1 && bay((p.x + i) | 0, (p.y + j) | 0) < p.life / 70) blend(p.x + i, p.y + j, p.c, .6);
      } else set(p.x, p.y, p.c);
    }
    for (const f of flashes) {
      const a = f.age, r = Math.round(f.r * .6 + a * 2.2);
      for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const d = Math.hypot(i, j); if (d <= r && (a < 2 || d > r - 4 - a * .3 || bay(f.x + i | 0, f.y + j | 0) > a / 7)) set(f.x + i, f.y + j, a < 2 ? 0xffffff : a < 4 ? 0xffe38a : a < 6 ? 0xffa040 : 0x6a707c); }
      lights.push([f.x, f.y, f.r * 4 - a * 4, '255,200,120', 1 - a / 9]);
    }
    for (const f of floaters) text(P, f.s, f.x, f.y, f.c, 1, 1);
  }
  function hud(w, t) {
    w.teams.forEach((tm, i) => {
      const y = 6 + i * 16, c = teamColor(w, i).c, hp = teamHp(w, i), max = (w.settings ? w.settings.units : 3) * 100;
      text(P, tm.name.toUpperCase(), 6, y, c);
      rect(5, y + 7, 66, 5, 0x0c1022); rect(6, y + 8, Math.round(64 * hp / max), 3, c); rect(6, y + 8, Math.round(64 * hp / max), 1, mix(c, 0xffffff, .45));
      text(P, String(hp), 75, y + 7, 0xffffff);
    });
    const tr = w.turn, u = activeUnit(w);
    if (tr.phase === 'aim') {
      const s = Math.ceil(tr.timer / 60);
      text(P, String(s), W / 2, 6, s <= 10 && (t & 4) ? 0xff6a5a : 0xffffff, 2, 1);
      if (u) text(P, possessive(u.name) + ' TUR', W / 2, 24, teamColor(w, u.team).c, 1, 1);
      const wn = WEAPONS[tr.weapon], am = w.teams[u ? u.team : 0].ammo[tr.weapon];
      text(P, wn.name.toUpperCase() + (am >= 0 ? ' (' + am + ')' : ''), W / 2, 33, 0xd8dde8, 1, 1);
    } else if (tr.phase === 'retreat') {
      text(P, String(Math.ceil(tr.retreat / 60)), W / 2, 6, 0xffe38a, 2, 1);
      text(P, 'SPRING!', W / 2, 24, 0xffe38a, 1, 1);
    }
    text(P, 'VIND', W - 6, 6, 0xd8dde8, 1, 2);
    rect(W - 52, 13, 47, 7, 0x0c1022);
    const n = Math.ceil(Math.abs(w.wind) / 2), dir = Math.sign(w.wind);
    for (let k = 0; k < 5; k++) {
      const on = dir > 0 ? k < n : dir < 0 ? 4 - k < n : false, c = on ? 0x8ad0ff : 0x2e3763, x = W - 50 + k * 9;
      for (let j = 0; j < 5; j++) { const o = j < 3 ? j : 4 - j; rect(x + (dir < 0 ? 2 - o : o), 14 + j, 3, 1, c); }
    }
    text(P, 'RUNDA ' + Math.max(1, tr.round), W - 6, 25, 0xaab1cb, 1, 2);
    if (tr.round >= FLOOD_ROUND) text(P, 'VÅRFLOD', W - 6, 35, 0x8ad0ff, 1, 2);
    if (banner && tr.phase !== 'over') {
      const a = banner.age;
      if (a < 90 && (a > 6 || (a & 2))) text(P, banner.s, W / 2, 56, banner.c, 2, 1);
    }
  }

  function frame(w, view = {}, tms = 0) {
    world = w;
    const key = [w.map.id, w.seed, w.mapVersion, w.water, mood.name, w.map.lamps.map((l) => l.on).join(''), w.trollTurn === w.turn.number].join('|');
    if (key !== builtKey) { buildBase(); builtKey = key; }
    const t = Math.floor(tms / 100);
    stepEffects();
    buf.set(base); T = buf; lights = [];
    if (mood.sun) lights.push([mood.sun.x, mood.sun.y, 70, mood.sun.c === 0xfffbe0 ? '255,250,220' : '255,200,120', .5]);
    if (mood.moon) lights.push([mood.moon.x, mood.moon.y, 44, '200,215,255', .35]);
    if (mood.aurora) { lights.push([150, 50, 120, '70,240,160', .16]); lights.push([360, 40, 110, '120,110,240', .14]); }
    art().lights(lights, t);
    drawStones(w);
    const act = activeUnit(w);
    if (w.cart) {
      const x = px(w.cart.X), y = px(w.cart.Y);
      rect(x - 7, y - 7, 15, 5, tn(0x6a707c)); rect(x - 6, y - 6, 13, 1, tn(0x9aa0aa)); rect(x - 6, y - 5, 13, 1, tn(0xb07a4a));
      disc(x - 4, y - 1, 1, tn(0x3a3238)); disc(x + 4, y - 1, 1, tn(0x3a3238));
    }
    for (const f of w.fires) {
      const x = px(f.X), y = px(f.Y);
      sprite(['......yy.', '.....yyyy', 'yyy..yy..', 'yyyyyyy..', 'yyyyyyy..', 'yry.yyy..', '.y...y...', '.y...y...'], { y: 0xe8c860, r: 0xd8382a }, x - 4, y - 8, false);
      for (let k = 0; k < 6; k++) { const fx = x - 4 + ((k * 3 + (still ? 0 : t)) % 9), fy = y - 9 - ((k * 5 + (still ? 0 : t * 2)) % 7); set(fx, fy, k % 2 ? 0xffa040 : 0xffe38a); }
      lights.push([x, y - 6, 22, '255,160,60', .9]);
    }
    for (const m of w.mines) {
      const x = px(m.X), y = px(m.Y), k = still ? 0 : (t >> 2) % 2;
      rect(x - 2, y - 2, 5, 2, tn(0xd8382a)); set(x - 1, y - 3, tn(0x2a2030)); set(x + 1, y - 3, tn(0x2a2030));
      set(x - 3, y - 3 - k, tn(0xd8382a)); set(x + 3, y - 3 - (1 - k), tn(0xd8382a)); set(x - 2, y, tn(0xa82a20)); set(x + 2, y, tn(0xa82a20));
    }
    for (const c of w.crates) {
      const x = px(c.X), y = px(c.Y);
      if (!c.rest) { for (let i = -5; i <= 5; i++) set(x + i, y - 14 + Math.round(i * i / 9), 0xffffff); for (const i of [-5, 0, 5]) for (let j = -12 + Math.round(i * i / 9); j < -6; j++) set(x + i * (1 - (j + 12) / 8), y + j, 0xd8dde8); }
      if (c.kind === 'post') { rect(x - 3, y - 6, 7, 6, tn(0xb07a4a)); rect(x - 3, y - 4, 7, 1, tn(0xffd23a)); rect(x, y - 6, 1, 6, tn(0xffd23a)); }
      else { rect(x - 3, y - 5, 7, 5, tn(0xd8b06a)); rect(x - 2, y - 7, 5, 1, tn(0x8a6a3a)); for (let i = -3; i <= 3; i += 2) set(x + i, y - 5, tn(0xd8382a)); }
    }
    for (const u of w.units) if (u.alive && !u.away && u.rope) {
      const x0 = px(u.X), y0 = px(u.Y) - 6, x1 = px(u.rope.AX), y1 = px(u.rope.AY), n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let k = 0; k <= n; k++) set(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, k % 3 ? 0xd8dde8 : 0xa8b0c0);
      set(x1, y1, 0xe5533d); set(x1 + 1, y1 + 1, 0x9aa0aa);
    }
    for (const u of w.units) if (u.alive && !u.away && !inFog(w, u, act)) drawUnit(u, t, act && u.id === act.id, w, view);
    if (w.knalle) {
      const k = w.knalle, x = px(k.X), y = px(k.Y);
      sprite(['..hhhh...', '.hhhhhh..', '..SSSS...', '..SeSe.bb', '..SSSSbbb', '..WWWWbbb', '.ccccccbb', '.cccccccb', '.cccccc..', '..c..c...', '..B..B...'], { h: 0x2a2630, S: 0xf2c9a2, e: 0x2a2030, W: 0xd8d8d0, b: 0x8a5a3a, c: 0x4a6a3a, B: 0x3a2c28 }, x - 4, y - 10, k.dir < 0);
      text(P, 'KNALLEN', x, y - 24, 0xffd66b, 1, 1);
    }
    for (const u of w.units) if (u.alive && !u.away && u.wet) { const x = px(u.X), y = px(u.Y) - 15; for (let i = -5; i <= 5; i++) set(x + i, y + Math.round(i * i / 10), i % 2 ? 0x4fa3ff : 0x2a6fd0); for (let j = 1; j < 6; j++) set(x, y + j, 0x3a2c28); }
    drawProjectiles(w, t);
    drawClouds(w, t);
    water(w, t);
    if (w.map.rain) for (let i = 0; i < 140; i++) { const x = (hash(i, 61) * W + (still ? 0 : t * 3) + W * 9) % W, y = (hash(i, 62) * H + (still ? 0 : t * 9)) % H; if (!solid(x | 0, y | 0)) { blend(x, y, 0xbcd0e8, .6); blend(x - 1, y - 2, 0xbcd0e8, .4); } }
    else if (!w.map.roof) ambient(t);
    drawParts();
    if (plane) { const x = plane.x, y = plane.y; rect(x - 8, y, 16, 2, tn(0x8a8f9a)); rect(x - 2, y - 3, 3, 8, tn(0x6a707c)); rect(x - 8, y - 2, 2, 2, tn(0x6a707c)); set(x + 8, y, 0xd8dde8); }
    if (art().dark) {
      const dyn = [];
      for (const u of w.units) if (u.alive) dyn.push([px(u.X), px(u.Y) - 8, 22]);
      for (const p of w.projectiles) dyn.push([px(p.X), px(p.Y), p.kind === 'gurra' || p.kind === 'troll' ? 26 : 12]);
      for (const f of flashes) dyn.push([f.x, f.y, Math.round(f.r * 3 - f.age * 3)]);
      darkness(dyn);
      for (const u of w.units) if (u.alive) { text(P, u.name, px(u.X), px(u.Y) - 25, teamColor(w, u.team).c, 1, 1); text(P, String(u.hp), px(u.X), px(u.Y) - 18, 0xffffff, 1, 1); }
    }
    drawAim(w, view);
    hud(w, t);
    ctx.putImageData(img, 0, 0);
    const sc = glow.width / W, g = mood.glow;
    gctx.clearRect(0, 0, glow.width, glow.height);
    for (const [x, y, r, rgb, al] of lights) {
      if (r <= 0) continue;
      const gr = gctx.createRadialGradient(x * sc, y * sc, 0, x * sc, y * sc, r * sc), a = Math.min(1, al * g);
      gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(.4, `rgba(${rgb},${a * .35})`); gr.addColorStop(1, `rgba(${rgb},0)`);
      gctx.fillStyle = gr; gctx.fillRect((x - r) * sc, (y - r) * sc, r * 2 * sc, r * 2 * sc);
    }
    return still ? 0 : shake;
  }

  return {
    frame, onEvents,
    setMood(name) { mood = MOODS[name] || MOODS.midsommar; builtKey = ''; },
    reset() { parts = []; flashes = []; floaters = []; banner = null; shake = 0; builtKey = ''; }
  };
}

// "GÖSTA" -> "GÖSTAS", "MÄRTA" -> "MÄRTAS"; names ending in s get no extra s.
export const possessive = (name) => /S$/i.test(name) ? name : name + 'S';

// Draws one weapon icon into a small canvas (for the buttons).
export function drawIcon(canvas, index) {
  const c = canvas.getContext('2d'), rows = ICON_ROWS[index], pal = ICON_PAL[index];
  canvas.width = 10; canvas.height = 9;
  c.clearRect(0, 0, 10, 9);
  for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) {
    const ch = rows[j][i]; if (ch === '.') continue;
    c.fillStyle = '#' + pal[ch].toString(16).padStart(6, '0'); c.fillRect(i, j, 1, 1);
  }
}
export { textW };
