// Drawing: 480×270 pixels in one image, plus a soft light layer screened on top.
// Nothing here affects the match; it only reads the simulation state.
import { W, H, WEAPONS, FLOOD_ROUND, CLOUD_RADIUS } from '../sim/rules.js';
import { px, activeUnit, teamHp } from '../sim/world.js';
import { text, textW } from './font.js';
import { VATTE, ICON_PAL, ICON_ROWS } from './sprites.js';

export const TEAM_COLORS = [{ c: 0xe5533d, d: 0xa5342a, css: '#e5533d' }, { c: 0x4fa3ff, d: 0x2a6fd0, css: '#4fa3ff' }];

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
  function buildBase() {
    T = base; tintCache = new Map();
    const S = mood.sky, n = S.length - 1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) set(x, y, S[Math.min(n, Math.floor(Math.min(1, y / 205) * n + bay(x, y) * .999))]);
    for (let i = 0; i < 110; i++) if (hash(i, 3) < mood.stars) set(hash(i, 1) * W, hash(i, 2) * 130, hash(i, 5) < .3 ? 0xffffff : 0xb8c4e8);
    if (mood.aurora) aurora();
    if (mood.clouds) { cloud(90, 44, 1.4); cloud(250, 28, 1); cloud(350, 70, 1.2); cloud(30, 96, .8); }
    if (mood.sun) disc(mood.sun.x, mood.sun.y, mood.sun.r, mood.sun.c);
    if (mood.moon) { const m = mood.moon; disc(m.x, m.y, m.r, m.c); disc(m.x + 4, m.y - 3, m.r - 1, S[1]); }
    for (let x = 0; x < W; x++) {
      const y1 = Math.round(156 + 10 * Math.sin(x / 50) + 7 * Math.sin(x / 23 + 2) + 3 * Math.sin(x / 11));
      const y2 = Math.round(176 + 8 * Math.sin(x / 37 + 1) + 5 * Math.sin(x / 17));
      const k = Math.floor(x / 7), y3 = Math.round(192 + 6 * Math.sin(x / 29 + 4) - (3.5 - Math.abs(x % 7 - 3)) * (1.5 + hash(k, 9) * 2.5));
      for (let y = y1; y < H; y++) set(x, y, y < y1 + 2 && mood.snow ? 0x9fb4d8 : mood.hill[0]);
      for (let y = y2; y < H; y++) set(x, y, mix(mood.hill[1], mood.hill[0], Math.max(0, .5 - (y - y2) / 16) * (bay(x, y) > .5 ? 1 : 0)));
      for (let y = y3; y < H; y++) set(x, y, mood.forest);
    }
    const cv = world.map.cave;
    for (let i = 0; i < W * H; i++) if (cv[i] && !world.map.solid[i]) { const x = i % W, y = (i / W) | 0; set(x, y, tn((x + y * 2) % 7 === 0 ? 0x4a302a : 0x3a2520)); }
    tree(49, 'bjork'); tree(205, 'bjork'); tree(318, 'gran'); tree(434, 'bjork');
    house(); maypole(); fence(218, 246); mushroom(158); mushroom(412); mushroom(330);
    const s = world.map.solid;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (s[y * W + x]) set(x, y, terrainColor(x, y));
    burrowInside(118, 209, -1); burrowInside(372, 168, 1);
    for (const [lx, ly] of LAMPS) if (!solid(lx, ly - 2)) { wp(lx, ly - 4, 0x8a8f9a); wp(lx, ly - 3, 0x8a8f9a); rect(lx - 1, ly - 2, 3, 3, 0xffd66b); set(lx, ly - 1, 0xfff6c8); }
    T = buf;
  }

  /* ---------- effects from simulation events ---------- */
  let parts = [], flashes = [], floaters = [], banner = null, shake = 0;
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
        banner = { s: possessive(u.name) + ' TUR', c: TEAM_COLORS[u.team].c, age: 0 };
      } else if (e.t === 'cloud') {
        for (let i = 0; i < 16; i++) { const a = rnd() * 6.283, v = rnd() * 1.2; parts.push({ x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - .3, g: -.005, life: 50, c: 0xb8d45a, kind: 'smoke', r: 2 }); }
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
  }

  /* ---------- dynamic layer ---------- */
  let lights = [];
  function drawUnit(u, t, active, w, view) {
    const tm = TEAM_COLORS[u.team], x = px(u.X), y = px(u.Y), sx = x - 4, sy = y - 11;
    const beard = u.id % 2 === 1;
    const pal = { L: tm.c, l: tm.d, S: 0xf2c9a2, N: 0xe89a80, e: 0x2a2030, W: beard ? 0xf4f4f0 : 0x9aa0aa, G: 0x9aa0aa, g: 0x6a707c, B: 0x3a2c28 };
    const rows = VATTE.slice();
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
  function drawAim(w, view) {
    const u = activeUnit(w), wp0 = WEAPONS[w.turn.weapon];
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
      wp(x, y - 5, TEAM_COLORS[s.team].d); wp(x - 1, y - 3, TEAM_COLORS[s.team].d); wp(x + 1, y - 4, TEAM_COLORS[s.team].d); wp(x, y - 2, TEAM_COLORS[s.team].d);
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
      const y = 6 + i * 16, c = TEAM_COLORS[i].c, hp = teamHp(w, i), max = 300;
      text(P, tm.name.toUpperCase(), 6, y, c);
      rect(5, y + 7, 66, 5, 0x0c1022); rect(6, y + 8, Math.round(64 * hp / max), 3, c); rect(6, y + 8, Math.round(64 * hp / max), 1, mix(c, 0xffffff, .45));
      text(P, String(hp), 75, y + 7, 0xffffff);
    });
    const tr = w.turn, u = activeUnit(w);
    if (tr.phase === 'aim') {
      const s = Math.ceil(tr.timer / 60);
      text(P, String(s), W / 2, 6, s <= 10 && (t & 4) ? 0xff6a5a : 0xffffff, 2, 1);
      if (u) text(P, possessive(u.name) + ' TUR', W / 2, 24, TEAM_COLORS[u.team].c, 1, 1);
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
    const key = [w.mapVersion, w.water, mood.name].join('|');
    if (key !== builtKey) { buildBase(); builtKey = key; }
    const t = Math.floor(tms / 100);
    stepEffects();
    buf.set(base); T = buf; lights = [];
    if (mood.sun) lights.push([mood.sun.x, mood.sun.y, 70, mood.sun.c === 0xfffbe0 ? '255,250,220' : '255,200,120', .5]);
    if (mood.moon) lights.push([mood.moon.x, mood.moon.y, 44, '200,215,255', .35]);
    if (mood.aurora) { lights.push([150, 50, 120, '70,240,160', .16]); lights.push([360, 40, 110, '120,110,240', .14]); }
    if (lit() && anchored(120)) lights.push([124, 142, 30, '255,200,95', .7]);
    for (const [lx, ly] of LAMPS) if (!solid(lx, ly - 2)) lights.push([lx, ly, 26, '255,205,100', .75]);
    drawStones(w);
    const act = activeUnit(w);
    for (const u of w.units) if (u.alive) drawUnit(u, t, act && u.id === act.id, w, view);
    drawProjectiles(w, t);
    drawClouds(w, t);
    water(w, t);
    ambient(t);
    drawParts();
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
