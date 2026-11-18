// The match: units, turns, weapons and physics. Pure and deterministic:
// the same seed and the same inputs give the same match in every browser
// (whole numbers only, no Math.random, no Math.sin), so online play can send
// inputs only (D-011).
import * as R from './rules.js';
import { makeMap, blast, isSolid, ROCK, SNOW, MAP_NAMES } from './terrain.js';
import { sin, cos, isqrt } from './trig.js';

const { FP, W, H } = R;
const px = (v) => Math.floor(v / FP);

/* ---------- random numbers kept in the state ---------- */
function rand(w) {
  w.rng = (w.rng + 0x6D2B79F5) >>> 0;
  let t = w.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}
const randInt = (w, n) => rand(w) % n;

/* ---------- setup ---------- */
// Normalise match settings so that every browser uses exactly the same values.
export function matchSettings(opts = {}) {
  const d = R.DEFAULT_SETTINGS, s = { ...d, ...(opts.settings || {}) };
  const clamp = (v, lo, hi, def) => (Number.isInteger(v) && v >= lo && v <= hi ? v : def);
  const weapons = Array.isArray(s.weapons) ? R.WEAPONS.map((w) => w.id).filter((id) => s.weapons.includes(id)) : d.weapons;
  return {
    map: Object.keys(MAP_NAMES).includes(s.map) ? s.map : d.map,
    night: !!s.night,
    units: clamp(s.units, 1, R.MAX_UNITS, d.units),
    turn: clamp(s.turn, 10, 120, d.turn),
    flood: clamp(s.flood, 0, 99, d.flood),
    weapons: weapons.length ? weapons : ['gurra'],
    crates: s.crates !== false,
    mode: R.MODES.includes(s.mode) ? s.mode : 'klassiskt'
  };
}

export function newMatch(seed, opts = {}) {
  const settings = matchSettings(opts);
  const src = R.TEAMS.map((def, i) => ({ ...def, ...((opts.teams || [])[i] || {}) }));
  const teams = src.map((t, i) => ({
    name: String(t.name || R.TEAMS[i].name).slice(0, 20), index: i, color: Number.isInteger(t.color) ? t.color : i, hat: t.hat || R.TEAMS[i].hat, dialect: typeof t.dialect === 'string' ? t.dialect.slice(0, 16) : '',
    ammo: R.WEAPONS.map((wp) => (settings.weapons.includes(wp.id) ? wp.ammo : 0)), next: 0
  }));
  const map = makeMap(seed, settings.map);
  const w = {
    seed: seed >>> 0, rng: seed >>> 0, tick: 0, settings,
    map, water: map.water, wind: 0, trollTurn: -1,
    knalle: map.knalle ? { X: map.knalle.x * FP, Y: map.knalle.y * FP, VY: 0, dir: 1, traded: [-1, -1] } : null,
    cart: map.cart ? { X: map.cart.x * FP, Y: map.cart.y * FP, VX: 0, VY: 0, air: 1, hit: -1 } : null,
    teams, units: [], projectiles: [], clouds: [], stones: [],
    spawn: [], crates: [], fires: [], mines: [],
    turn: { phase: 'start', team: -1, unit: -1, timer: 0, retreat: 0, quiet: 0, round: 0, weapon: 0, aim: { angle: 45, power: 60 }, number: 0 },
    winner: null, events: [], mapVersion: 0
  };
  let id = 0;
  teams.forEach((t, ti) => {
    const spots = map.spawns[ti].slice();
    for (let i = spots.length - 1; i > 0; i--) { const j = randInt(w, i + 1); [spots[i], spots[j]] = [spots[j], spots[i]]; }
    const names = src[ti].units || R.TEAMS[ti].units;
    for (let k = 0; k < settings.units; k++) {
      let [x, y] = spots[k % spots.length];
      x += Math.trunc(k / spots.length) * 6;
      // a free spot near the spawn point: first a little lower (tunnels), then higher
      let ok = bodyFree(w, x, y);
      for (let d = 1; !ok && d <= 24; d++) if (bodyFree(w, x, y + d)) { y += d; ok = true; }
      while (!ok && y > 3) { y--; ok = bodyFree(w, x, y); }
      const name = String(names[k] || R.TEAMS[ti].units[k] || 'VÄTTE').toUpperCase().slice(0, 10);
      w.units.push({ id: id++, team: ti, name, X: x * FP, Y: y * FP, VX: 0, VY: 0, air: true, hp: R.HP, alive: true, face: ti === 0 ? 1 : -1, walk: 0 });
    }
  });
  if (settings.mode === 'kubb') setupKubb(w);
  return w;
}

/* ---------- Fjället: avalanches (F-034) ---------- */
// After a blast, the snow in a box around it may slide: a snow pixel falls if the pixel
// under it is free, or slides one step down-left or down-right. The box follows the snow.
// A vätte in the way is hurt once and pushed along; the snow stops at its body.
function startSlide(w, x, y, r) {
  const b = { x1: Math.max(0, x - r - 44), x2: Math.min(W - 1, x + r + 44), y1: Math.max(0, y - r - 80), y2: Math.min(H - 1, y + r + 12) };
  if (w.slide) { const s = w.slide; s.x1 = Math.min(s.x1, b.x1); s.x2 = Math.max(s.x2, b.x2); s.y1 = Math.min(s.y1, b.y1); s.y2 = Math.max(s.y2, b.y2); s.quiet = 0; return; }
  w.slides = (w.slides || 0) + 1;
  w.slide = { ...b, quiet: 0, age: 0, id: w.slides, moved: 0, x, y };
}
function stepSlide(w) {
  const s = w.slide;
  if (!s) return;
  const m = w.map, sol = m.solid, mat = m.mat;
  const body = new Set();
  for (const u of w.units) if (u.alive && !u.away) { const ux = px(u.X), uy = px(u.Y); for (let yy = uy - 9; yy <= uy; yy++) for (let xx = ux - 2; xx <= ux + 2; xx++) body.add(yy * W + xx); }
  const free = (x, y) => x >= 0 && x < W && y < H && !sol[y * W + x] && !body.has(y * W + x);
  const bump = (x, y, dir) => {
    for (const u of w.units) {
      if (!u.alive || u.away || u.snowHit === s.id) continue;
      const ux = px(u.X), uy = px(u.Y);
      if (Math.abs(x - ux) > 2 || y < uy - 9 || y > uy) continue;
      u.snowHit = s.id; hurt(w, u, R.AVALANCHE_DAMAGE);
      if (u.alive) { u.VX = (dir || (x < ux ? 1 : -1)) * 1500; u.VY = -900; u.air = true; }
    }
  };
  let moved = 0, lo = s.y2, minX = W, maxX = -1;
  const hot = s.hot || new Set(), nowHot = new Set();
  const first = w.tick & 1 ? 1 : -1;
  for (let y = s.y2; y >= s.y1; y--) for (let k = 0; k <= s.x2 - s.x1; k++) {
    const x = first > 0 ? s.x1 + k : s.x2 - k, i = y * W + x;
    if (!sol[i] || mat[i] !== SNOW) continue;
    let tx = -1, ty = y + 1;
    if (free(x, y + 1)) tx = x;
    else for (const d of [first, -first]) if (free(x + d, y + 1) && free(x + d, y)) { tx = x + d; break; }
    if (tx < 0) {
      // only snow that is on the move can hit a vätte
      if (hot.has(i)) {
        if (y + 1 < H && body.has((y + 1) * W + x)) bump(x, y + 1, 0);
        else for (const d of [first, -first]) if (body.has((y + 1) * W + x + d) && !sol[y * W + x + d]) { bump(x + d, y + 1, d); break; }
      }
      continue;
    }
    sol[i] = 0; mat[i] = 0; moved++;
    if (ty >= w.water || ty >= H) continue;               // into the water: it melts away
    const j = ty * W + tx; sol[j] = 1; mat[j] = SNOW; nowHot.add(j);
    if (ty > lo) lo = ty;
    if (tx < minX) minX = tx; if (tx > maxX) maxX = tx;
  }
  s.age++; s.hot = nowHot;
  if (moved) {
    if (!s.moved) w.events.push({ t: 'avalanche', x: s.x, y: s.y });
    s.moved += moved; s.quiet = 0;
    s.y2 = Math.min(H - 1, Math.max(s.y2, lo + 2)); s.x1 = Math.max(0, Math.min(s.x1, minX - 2)); s.x2 = Math.min(W - 1, Math.max(s.x2, maxX + 2));
    if (s.age % 4 === 0) w.mapVersion++;
  } else s.quiet++;
  if (s.quiet >= 3 || s.age > R.AVALANCHE_MAX_TICKS) { if (s.moved) w.mapVersion++; w.slide = null; }
}

/* ---------- Takåsarna: the underground (F-034) ---------- */
// A vätte standing in a station rides to the next station in the way it faces.
function stepStations(w) {
  const st = w.map.stations;
  if (!st) return;
  for (const u of w.units) {
    if (!u.alive || u.away) continue;
    const ux = px(u.X), uy = px(u.Y);
    const at = u.air ? -1 : st.findIndex((p) => Math.abs(ux - p.x) <= 4 && Math.abs(uy - p.y) <= 3);
    if (at < 0) { if (!u.air) u.station = -1; continue; }
    if (u.station === at) continue;
    const to = (at + (u.face < 0 ? st.length - 1 : 1)) % st.length, p = st[to];
    u.X = p.x * FP; u.Y = p.y * FP; u.VX = 0; u.VY = 0; u.station = to; u.rope = null;
    w.events.push({ t: 'metro', unit: u.id, from: at, to, x: p.x, y: p.y });
  }
}

/* ---------- Kubb (F-032) ---------- */
// Kubbar and the king are loose pieces: they fall when the ground goes, and an
// explosion near them knocks them over. They are not part of the terrain.
function pieceFree(w, x, y, h, half) {
  for (let r = y - h; r <= y - 2; r++) for (let dx = -half; dx <= half; dx++) if (solidAt(w, x + dx, r)) return false;
  return !solidAt(w, x, y - 1) && !solidAt(w, x, y);
}
// A spot where a piece of height h stands, near (x, y): first lower, then higher.
function restSpot(w, x, y, h, half) {
  for (let d = 0; d <= 160; d++) for (const yy of d ? (d <= 40 ? [y + d, y - d] : [y + d]) : [y]) {
    if (yy > h + 1 && yy < w.water && pieceFree(w, x, yy, h, half) && solidAt(w, x, yy + 1)) return yy;
  }
  return null;
}
function setupKubb(w) {
  w.kubbs = [];
  w.teams.forEach((tm, ti) => {
    const side = ti === 0 ? 1 : -1;
    const spots = w.map.spawns[ti].slice().sort((a, b) => (a[0] - b[0]) * side);
    for (const [sx, sy] of spots) {
      if (w.kubbs.filter((k) => k.team === ti).length >= R.KUBBS) break;
      for (const off of [9, 14, -9, 4, 19, -14, 0, 24]) {
        const x = sx + off * side, y = restSpot(w, x, sy, R.KUBB_H, 1);
        if (y == null || w.kubbs.some((k) => Math.abs(px(k.X) - x) < 5 && Math.abs(px(k.Y) - y) < 10)) continue;
        w.kubbs.push({ team: ti, X: x * FP, Y: y * FP, VY: 0, air: 0, down: 0 });
        break;
      }
    }
  });
  // the king: on firm ground as near the middle as possible
  for (let d = 0; d < W / 2 - 20 && !w.king; d += 3) for (const x of d ? [W / 2 + d, W / 2 - d] : [W / 2]) {
    if (w.king) break;
    for (let y = (w.map.roof || 0) + R.KING_H + 2; y < w.water - 1; y++) {
      if (pieceFree(w, x, y, R.KING_H, 2) && solidAt(w, x, y + 1) && solidAt(w, x - 2, y + 1) && solidAt(w, x + 2, y + 1)) { w.king = { X: x * FP, Y: y * FP, VY: 0, air: 0, down: 0, king: 1, winner: null }; break; }
    }
  }
}
const pieces = (w) => (w.kubbs ? w.king ? [...w.kubbs, w.king] : w.kubbs : []);
const standingKubbs = (w, ti) => (w.kubbs || []).filter((k) => k.team === ti && !k.down).length;
function knock(w, k) {
  if (k.down) return;
  k.down = 1;
  const x = px(k.X), y = px(k.Y);
  if (!k.king) { w.events.push({ t: 'kubb', team: k.team, left: standingKubbs(w, k.team), x, y }); return; }
  // The king: the team whose turn it is wins if the other team's kubbar are all down, else it loses.
  const by = w.turn.team;
  const ready = by >= 0 && w.teams.every((tm) => tm.index === by || standingKubbs(w, tm.index) === 0);
  k.winner = by < 0 ? -1 : ready ? by : w.teams.length === 2 ? 1 - by : -1;
  k.by = by; k.early = ready ? 0 : 1;
  w.events.push({ t: 'king', by, early: !ready, winner: k.winner, x, y });
}
// Is (x, y) inside a standing kubb or the king?
function hitPiece(w, x, y) {
  for (const k of pieces(w)) {
    if (k.down) continue;
    const kx = px(k.X), ky = px(k.Y), half = k.king ? 2 : 1, h = k.king ? R.KING_H : R.KUBB_H;
    if (Math.abs(kx - x) <= half && y <= ky && y >= ky - h) return true;
  }
  return false;
}
function blastPieces(w, x, y, r) {
  for (const k of pieces(w)) {
    if (k.down) continue;
    const dx = px(k.X) - x, dy = px(k.Y) - (k.king ? 7 : 4) - y;
    if (dx * dx + dy * dy <= (r + 3) * (r + 3)) knock(w, k);
  }
}
function stepPieces(w) {
  for (const k of pieces(w)) {
    const x = px(k.X);
    if (!k.air && !solidAt(w, x, px(k.Y) + 1) && !solidAt(w, x - 1, px(k.Y) + 1) && !solidAt(w, x + 1, px(k.Y) + 1)) k.air = 1;
    if (!k.air) continue;
    k.VY = Math.min(k.VY + R.GRAVITY, 6 * FP); k.Y += k.VY;
    let y = px(k.Y);
    if (solidAt(w, x, y + 1) || solidAt(w, x - 1, y + 1) || solidAt(w, x + 1, y + 1)) { while (y > 0 && solidAt(w, x, y)) y--; k.Y = y * FP; k.VY = 0; k.air = 0; }
    if (y > w.water) { k.air = 0; k.gone = 1; w.events.push({ t: 'splash', x, y: w.water }); knock(w, k); }
  }
  if (w.kubbs) w.kubbs = w.kubbs.filter((k) => !k.gone);
}

/* ---------- bodies ---------- */
const solidAt = (w, x, y) => isSolid(w.map, x, y);
// A vätte is 5 px wide and 10 px tall; (x, y) is the pixel of its feet.
function bodyFree(w, x, y) {
  for (let r = y - 8; r <= y - 2; r += 2) if (solidAt(w, x - 2, r) || solidAt(w, x + 2, r)) return false;
  return !solidAt(w, x, y - 9) && !solidAt(w, x - 1, y) && !solidAt(w, x, y) && !solidAt(w, x + 1, y);
}
// Standing means the body cannot move one pixel down.
const standing = (w, x, y) => !bodyFree(w, x, y + 1);

function kill(w, u, why) {
  if (!u.alive) return;
  u.alive = false; u.hp = 0;
  w.events.push({ t: 'death', unit: u.id, why, x: px(u.X), y: px(u.Y) });
  if (why !== 'water' && why !== 'edge') w.stones.push({ X: u.X, Y: u.Y, VY: 0, team: u.team });
}
function hurt(w, u, n) {
  if (!u.alive || n <= 0) return;
  u.hp -= n;
  w.events.push({ t: 'damage', unit: u.id, n, x: px(u.X), y: px(u.Y) - 12 });
  if (u.hp <= 0) kill(w, u, 'hp');
}

function stepRope(w, u) {
  const r = u.rope;
  if (!solidAt(w, px(r.AX), px(r.AY))) { u.rope = null; return; }
  u.VY += R.GRAVITY;
  u.VX -= Math.trunc(u.VX / 160);
  u.VX = Math.max(-R.ROPE_MAX_SPEED, Math.min(R.ROPE_MAX_SPEED, u.VX));
  u.VY = Math.max(-R.ROPE_MAX_SPEED, Math.min(R.ROPE_MAX_SPEED, u.VY));
  let nx = u.X + u.VX, ny = u.Y + u.VY;
  const hand = 6 * FP, dx = nx - r.AX, dy = ny - hand - r.AY, d = isqrt(dx * dx + dy * dy);
  if (d > r.L && d > 0) {
    nx = r.AX + Math.trunc((dx * r.L) / d); ny = r.AY + Math.trunc((dy * r.L) / d) + hand;
    const vr = Math.trunc((u.VX * dx + u.VY * dy) / d);
    if (vr > 0) { u.VX -= Math.trunc((vr * dx) / d); u.VY -= Math.trunc((vr * dy) / d); }
  }
  if (bodyFree(w, px(nx), px(ny))) { u.X = nx; u.Y = ny; }
  else if (bodyFree(w, px(u.X), px(ny))) { u.Y = ny; u.VX = -Math.trunc(u.VX / 3); }
  else if (bodyFree(w, px(nx), px(u.Y))) { u.X = nx; u.VY = 0; }
  else { u.VX = Math.trunc(u.VX / 2); u.VY = 0; }
}

function stepUnit(w, u) {
  if (!u.alive || u.away) return;
  if (u.rope) {
    stepRope(w, u);
    const x = px(u.X), y = px(u.Y);
    if (y > w.water) { u.rope = null; kill(w, u, 'water'); w.events.push({ t: 'splash', x, y: w.water }); }
    else if (x < -20 || x > W + 20) { u.rope = null; kill(w, u, 'edge'); }
    return;
  }
  let x = px(u.X), y = px(u.Y);
  if (!u.air && !standing(w, x, y)) { u.air = true; u.VX = 0; u.VY = 0; }
  if (u.air) {
    u.VY += R.GRAVITY;
    const n = Math.max(1, Math.trunc((Math.max(Math.abs(u.VX), Math.abs(u.VY)) + FP - 1) / FP));
    const sx = Math.trunc(u.VX / n), sy = Math.trunc(u.VY / n);
    for (let i = 0; i < n && u.air; i++) {
      const nx = u.X + sx, ny = u.Y + sy;
      if (bodyFree(w, px(nx), px(ny))) { u.X = nx; u.Y = ny; }
      else if (bodyFree(w, px(u.X), px(ny))) { u.Y = ny; u.VX = -Math.trunc(u.VX / 3); }
      else if (bodyFree(w, px(nx), px(u.Y))) { u.X = nx; if (u.VY > 0) land(w, u); else u.VY = 0; }
      else if (u.VY > 0) land(w, u);
      else { u.VY = 0; u.VX = 0; }
      if (u.air && u.VY >= 0 && standing(w, px(u.X), px(u.Y)) && u.VY < 2 * R.GRAVITY) land(w, u);
    }
  }
  x = px(u.X); y = px(u.Y);
  if (y > w.water) { kill(w, u, 'water'); w.events.push({ t: 'splash', x, y: w.water }); }
  else if (x < -20 || x > W + 20) kill(w, u, 'edge');
}
function land(w, u) {
  const v = u.VY;
  u.air = false; u.VX = 0; u.VY = 0; u.Y = px(u.Y) * FP;
  if (v > R.FALL_SAFE_VY) hurt(w, u, Math.trunc(((v - R.FALL_SAFE_VY) * R.FALL_DAMAGE_PER_PX) / FP) + 2);
}
function walk(w, u, dir) {
  const x = px(u.X), y = px(u.Y);
  u.face = dir;
  for (let c = 0; c <= R.CLIMB; c++) {
    if (!bodyFree(w, x + dir, y - c)) continue;
    let ny = y - c;
    for (let k = 0; k < 5 && !standing(w, x + dir, ny); k++) ny++;
    u.X = (x + dir) * FP; u.Y = ny * FP;
    if (!standing(w, x + dir, ny)) { u.air = true; u.VX = dir * 300; u.VY = 0; }
    return;
  }
}

/* ---------- weapons ---------- */
function castRope(w, u, wp, shot) {
  const angle = ((shot.angle % 360) + 360) % 360, dx = cos(angle), dy = -sin(angle);
  const hx = px(u.X), hy = px(u.Y) - 6;
  for (let d = 6; d <= wp.reach; d++) {
    const x = hx + Math.trunc((dx * d) / 1024), y = hy + Math.trunc((dy * d) / 1024);
    if (x < 0 || x >= W || y < 0 || y >= H) break;
    if (!solidAt(w, x, y)) continue;
    const L = Math.max(10, isqrt((x - hx) * (x - hx) + (y - hy) * (y - hy)));
    u.rope = { AX: x * FP, AY: y * FP, L: L * FP }; u.air = true; u.face = dx < 0 ? -1 : 1;
    w.events.push({ t: 'rope', x, y });
    return true;
  }
  w.events.push({ t: 'rope-miss', x: hx, y: hy });
  return false;
}

function fire(w, u, shot) {
  const t = w.turn, wp = R.WEAPONS[t.weapon], team = w.teams[u.team];
  if (wp.tool) return castRope(w, u, wp, shot === true ? t.aim : shot);
  if (team.ammo[t.weapon] === 0) return false;
  if (team.ammo[t.weapon] > 0) team.ammo[t.weapon]--;
  const cx = u.X, cy = u.Y - 5 * FP;
  if (wp.ticket) {
    // the vätte nearest the tap, not the one using the ticket
    const tx = shot.tx | 0, ty = shot.ty | 0;
    let best = null, bd = 30 * 30;
    for (const o of w.units) { if (!o.alive || o.away || o.id === u.id) continue; const dx = px(o.X) - tx, dy = px(o.Y) - 5 - ty, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = o; } }
    if (!best) { team.ammo[t.weapon]++; return false; }
    w.events.push({ t: 'ticket', unit: best.id, x: px(best.X), y: px(best.Y) });
    best.away = R.TICKET_TURNS; best.X = -1000 * FP; best.Y = -1000 * FP; best.VX = 0; best.VY = 0; best.air = false;
  } else if (wp.build) {
    const tx = Math.max(14, Math.min(W - 15, shot.tx | 0)), ty = Math.max(4, Math.min(H - 4, shot.ty | 0)), tilt = u.face;
    for (let i = -14; i <= 14; i++) for (let j = 0; j < 3; j++) {
      const x = tx + i, y = ty + j + Math.trunc((i * tilt + 14) / 10) - 1;
      if (x >= 0 && x < W && y >= 0 && y < H && !w.map.solid[y * W + x]) { w.map.solid[y * W + x] = 1; w.map.mat[y * W + x] = 3; }
    }
    w.mapVersion++;
    w.events.push({ t: 'build', x: tx, y: ty });
  } else if (wp.id === 'halm') {
    w.fires.push({ X: u.X + u.face * 6 * FP, Y: u.Y, turns: R.FIRE_TURNS });
    w.events.push({ t: 'fire-start', x: px(u.X), y: px(u.Y) });
  } else if (wp.water) {
    const tx = Number.isInteger(shot.tx) ? Math.max(4, Math.min(W - 5, shot.tx)) : px(u.X) + u.face * 40;
    for (let k = 0; k < 36; k++) w.projectiles.push({ kind: 'drop', X: (tx + (k % 9) * 2 - 8) * FP, Y: (-6 - Math.trunc(k / 9) * 4 - (w.map.roof ? -w.map.roof - 8 : 0)) * FP, VX: 0, VY: 0, owner: u.id, age: 0, fuse: -1, rest: false, dir: 0, life: 240 });
    w.events.push({ t: 'pour', x: tx });
  } else if (wp.id === 'jas') {
    const tx = Number.isInteger(shot.tx) ? Math.max(0, Math.min(W - 1, shot.tx)) : px(u.X) + u.face * 60;
    for (let k = 0; k < 5; k++) w.projectiles.push({ kind: 'jas', X: (tx + (k - 2) * 14) * FP, Y: (-10 - k * 4) * FP, VX: 0, VY: 0, owner: u.id, age: 20, fuse: -1, rest: false });
    w.events.push({ t: 'plane', x: tx });
  } else if (wp.target) {
    const tx = Number.isInteger(shot.tx) ? Math.max(0, Math.min(W - 1, shot.tx)) : px(u.X) + u.face * 60;
    for (let k = 0; k < 5; k++) {
      w.projectiles.push({ kind: wp.id, X: (tx + (k - 2) * 10) * FP, Y: (-8 - k * 7) * FP, VX: randInt(w, 1201) - 600, VY: 0, owner: u.id, age: 0, fuse: wp.fuse + k * 6, rest: false, bounces: 0 });
    }
  } else if (wp.walker) {
    w.projectiles.push({ kind: wp.id, X: u.X, Y: u.Y, VX: 0, VY: 0, owner: u.id, age: 0, fuse: -1, rest: false, dir: u.face, hits: [u.id] });
  } else if (wp.aim) {
    const angle = ((shot.angle % 360) + 360) % 360, power = Math.max(0, Math.min(100, shot.power | 0));
    const v = Math.trunc((wp.speed * power) / 100);
    const dx = cos(angle), dy = -sin(angle);
    u.face = dx < 0 ? -1 : 1;
    w.projectiles.push({ kind: wp.id, X: cx + dx * 7, Y: cy + dy * 7, VX: Math.trunc((dx * v) / 1024), VY: Math.trunc((dy * v) / 1024), owner: u.id, age: 0, fuse: wp.fuse || -1, rest: false });
  } else {
    w.projectiles.push({ kind: wp.id, X: u.X + u.face * 4 * FP, Y: u.Y - 3 * FP, VX: u.face * 200, VY: 0, owner: u.id, age: 0, fuse: wp.fuse, rest: false });
  }
  w.events.push({ t: 'fire', kind: wp.id, x: px(cx), y: px(cy) });
  return true;
}

function explode(w, x, y, wp) {
  const r = wp.radius;
  blast(w.map, x, y, r);
  w.mapVersion++;
  w.events.push({ t: 'boom', x, y, r, kind: wp.id });
  for (const l of w.map.lamps) if (l.on && (l.x - x) * (l.x - x) + (l.y - y) * (l.y - y) <= (r + 6) * (r + 6)) { l.on = 0; w.events.push({ t: 'lamp', x: l.x, y: l.y }); }
  wakeTroll(w, x, y, r);
  w.mines = w.mines.filter((m) => { const dx = px(m.X) - x, dy = px(m.Y) - y; return dx * dx + dy * dy > (r + 3) * (r + 3); });
  const hit = w.crates.filter((c) => { const dx = px(c.X) - x, dy = px(c.Y) - 3 - y; return dx * dx + dy * dy <= (r + 5) * (r + 5); });
  if (hit.length) { w.crates = w.crates.filter((c) => !hit.includes(c)); for (const c of hit) if (c.kind === 'post') explode(w, px(c.X), px(c.Y) - 3, R.CRATE_BOOM); }
  const c = w.cart;
  if (c) {
    const dx = px(c.X) - x, dy = px(c.Y) - 4 - y, reach = r + 20;
    if (dx * dx + dy * dy < reach * reach) { const d = Math.max(1, isqrt(dx * dx + dy * dy)); c.VX += Math.trunc((dx * wp.force * (reach - d)) / (reach * d)); c.VY = -900; c.air = 1; c.hit = -1; }
  }
  for (const b of w.map.boulders) b.moving = 1;
  blastPieces(w, x, y, r);
  if (w.map.avalanche) startSlide(w, x, y, r);
  const reach = r + 12;
  for (const u of w.units) {
    if (!u.alive) continue;
    const dx = px(u.X) - x, dy = px(u.Y) - 5 - y, d2 = dx * dx + dy * dy;
    if (d2 >= reach * reach) continue;
    const d = isqrt(d2), k = reach - d;
    hurt(w, u, Math.max(1, Math.trunc((wp.damage * k) / reach)));
    if (!u.alive) continue;
    const f = Math.trunc((wp.force * k) / reach), dd = Math.max(d, 1);
    u.VX = Math.trunc((dx * f) / dd);
    u.VY = Math.trunc((dy * f) / dd) - Math.trunc(f / 3) - 400;
    u.air = true;
  }
  for (const p of w.projectiles) if (p.rest) { const dx = px(p.X) - x, dy = px(p.Y) - y; if (dx * dx + dy * dy < reach * reach) { p.rest = false; p.VY = -1500; } }
}

/* ---------- water, crayfish and snow ---------- */
function stepDrop(w, p) {
  if (++p.age > p.life) return false;
  const x = px(p.X), y = px(p.Y);
  if (y > w.water || x < 0 || x >= W) return false;
  if (!solidAt(w, x, y + 1)) {
    p.VY = Math.min(p.VY + R.GRAVITY, 4 * FP);
    let ny = p.Y + p.VY;
    while (px(ny) > y && solidAt(w, x, px(ny))) ny -= FP;
    p.Y = ny;
  } else {
    p.VY = 0;
    const down = (d) => !solidAt(w, x + d, y) && !solidAt(w, x + d, y + 1) ? 2 : !solidAt(w, x + d, y) ? 1 : 0;
    const l = down(-1), r = down(1);
    if (!p.dir || (p.dir === -1 ? l : r) === 0) p.dir = r > l ? 1 : l > r ? -1 : r ? (p.age & 1 ? 1 : -1) : 0;
    if (p.dir && down(p.dir)) p.X += p.dir * 2 * FP;
  }
  for (const f of w.fires) if (Math.abs(px(f.X) - x) < 12 && Math.abs(px(f.Y) - y) < 12) { f.turns = 0; w.events.push({ t: 'steam', x, y }); }
  w.fires = w.fires.filter((f) => f.turns > 0);
  for (const u of w.units) {
    if (!u.alive || u.away || Math.abs(px(u.X) - x) > 3 || y < px(u.Y) - 10 || y > px(u.Y) + 1) continue;
    if ((u.washed | 0) < R.WASH_MAX) { u.washed = (u.washed | 0) + 1; hurt(w, u, 1); }
    if (u.alive) { u.VX = (p.dir || 1) * 500; if (!u.air) { u.VY = -250; u.air = true; } }
    return false;
  }
  return true;
}
function stepRoll(w, p) {
  if (++p.age > 420) return snowHeap(w, p);
  const x = px(p.X), y = px(p.Y);
  if (y > w.water) { w.events.push({ t: 'splash', x, y: w.water }); return false; }
  if (!solidAt(w, x, y + 1)) { p.Y += FP; p.speed += 30; return true; }
  p.acc += p.speed;
  while (p.acc >= FP) {
    p.acc -= FP;
    const cx = px(p.X), cy = px(p.Y), nx = cx + p.dir;
    let ny = null;
    for (const dy of [1, 2, 3, 0, -1]) if (!solidAt(w, nx, cy + dy) && !solidAt(w, nx, cy + dy - p.size) && solidAt(w, nx, cy + dy + 1)) { ny = cy + dy; break; }
    if (ny === null) { if (!solidAt(w, nx, cy) && !solidAt(w, nx, cy - p.size)) ny = cy; else return snowHeap(w, p); }
    p.speed += ny > cy ? 60 : ny < cy ? -160 : -25;
    p.X = nx * FP; p.Y = ny * FP; p.travel = (p.travel | 0) + 1;
    if (p.travel % 9 === 0 && p.size < 9) p.size++;
    if (cx < 0 || cx >= W) return false;
  }
  for (const u of w.units) {
    if (!u.alive || u.away || p.hits.includes(u.id) || Math.abs(px(u.X) - px(p.X)) > p.size + 2 || Math.abs(px(u.Y) - px(p.Y)) > 10) continue;
    p.hits.push(u.id); hurt(w, u, 5 + p.size);
    if (u.alive) { u.VX = p.dir * (2 * FP + p.size * 150); u.VY = -2 * FP; u.air = true; }
    w.events.push({ t: 'bump', x: px(u.X), y: px(u.Y) });
  }
  if (p.speed <= 0) return snowHeap(w, p);
  return true;
}
function snowHeap(w, p) {
  const cx = px(p.X), cy = px(p.Y) - p.size + 1, r = p.size + 1;
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r - 2; x <= cx + r + 2; x++) {
    if (x < 0 || x >= W || y < 0 || y >= H) continue;
    const dx = x - cx, dy = y - cy, i = y * W + x;
    if (dx * dx * 10 + dy * dy * 16 <= r * r * 14 && !w.map.solid[i] && !w.units.some((u) => u.alive && !u.away && Math.abs(px(u.X) - x) <= 2 && y >= px(u.Y) - 9 && y <= px(u.Y))) { w.map.solid[i] = 1; w.map.mat[i] = SNOW; }
  }
  w.mapVersion++;
  w.events.push({ t: 'snow', x: cx, y: cy });
  return false;
}
function stepMines(w) {
  for (const m of w.mines) {
    if (m.arm > 0) m.arm--;
    const x = px(m.X), y = px(m.Y);
    if (!solidAt(w, x, y + 1)) m.Y += FP;
    if (y > w.water || y > H) { m.gone = 1; continue; }
    if (m.arm) continue;
    for (const u of w.units) {
      if (!u.alive || u.away || Math.abs(px(u.X) - x) > 5 || Math.abs(px(u.Y) - y) > 9) continue;
      m.gone = 1; hurt(w, u, R.NIP_DAMAGE);
      if (u.alive) { u.VX = (px(u.X) < x ? -1 : 1) * FP; u.VY = -FP; u.air = true; }
      w.events.push({ t: 'nip', x, y });
      break;
    }
  }
  w.mines = w.mines.filter((m) => !m.gone);
}

/* ---------- Knallen: a pedlar on the Borås map who swaps one weapon for another ---------- */
function stepKnalle(w) {
  const k = w.knalle;
  if (!k) return;
  const x = px(k.X), y = px(k.Y);
  trade(w, k);
  if (!solidAt(w, x, y + 1)) { k.VY = Math.min(k.VY + R.GRAVITY, 4 * FP); k.Y += k.VY; if (px(k.Y) > w.water) { w.knalle = null; w.events.push({ t: 'splash', x, y: w.water }); } return; }
  k.VY = 0;
  if (w.tick % 4 === 0) {
    let moved = false;
    for (let c = 0; c <= 3 && !moved; c++) {
      const nx = x + k.dir, ny = y - c;
      if (solidAt(w, nx, ny) || solidAt(w, nx, ny - 8)) continue;
      let fy = ny; for (let d = 0; d < 6 && !solidAt(w, nx, fy + 1); d++) fy++;
      if (!solidAt(w, nx, fy + 1) || fy >= w.water - 1 || nx < 4 || nx > W - 5) break;
      k.X = nx * FP; k.Y = fy * FP; moved = true;
    }
    if (!moved) k.dir = -k.dir;
  }
}
function trade(w, k) {
  const t = w.turn, u = w.units.find((o) => o.id === t.unit);
  if (!u || !u.alive || (t.phase !== 'aim' && t.phase !== 'retreat') || k.traded[u.team] === t.round) return;
  if (Math.abs(px(u.X) - px(k.X)) > 6 || Math.abs(px(u.Y) - px(k.Y)) > 10) return;
  const tm = w.teams[u.team], enabled = R.WEAPONS.map((wp, i) => i).filter((i) => R.WEAPONS[i].ammo >= 0 && w.settings.weapons.includes(R.WEAPONS[i].id));
  const have = enabled.filter((i) => tm.ammo[i] > 0);
  if (!enabled.length) return;
  k.traded[u.team] = t.round;
  const give = enabled[randInt(w, enabled.length)], take = have.length ? have[randInt(w, have.length)] : -1;
  if (take >= 0) tm.ammo[take]--;
  tm.ammo[give]++;
  w.events.push({ t: 'trade', give, take, x: px(k.X), y: px(k.Y) });
}

/* ---------- crates ---------- */
function dropCrate(w) {
  const limited = R.WEAPONS.map((wp, i) => i).filter((i) => R.WEAPONS[i].ammo >= 0 && w.settings.weapons.includes(R.WEAPONS[i].id));
  const post = limited.length && randInt(w, 10) < 6;
  let x, y;
  if (w.map.roof) { const all = w.map.spawns[0].concat(w.map.spawns[1]); [x, y] = all[randInt(w, all.length)]; y -= 8; }
  else { x = 30 + randInt(w, W - 60); y = -12; }
  const wrong = post && w.map.wrongGoods && randInt(w, 10) < w.map.wrongGoods;
  w.crates.push({ X: x * FP, Y: y * FP, VY: 0, rest: false, kind: post ? 'post' : 'fika', weapon: post && !wrong ? limited[randInt(w, limited.length)] : -1 });
  w.events.push({ t: 'crate-drop', x });
}
function stepCrates(w) {
  for (const c of w.crates) {
    const x = px(c.X), y = px(c.Y);
    if (c.rest && !solidAt(w, x - 2, y + 1) && !solidAt(w, x + 2, y + 1) && !solidAt(w, x, y + 1)) c.rest = false;
    if (!c.rest) {
      c.VY = Math.min(c.VY + (R.GRAVITY >> 2), 1200);
      const ny = c.Y + c.VY;
      if (solidAt(w, x, px(ny) + 1) || solidAt(w, x - 2, px(ny) + 1) || solidAt(w, x + 2, px(ny) + 1)) { let yy = px(ny); while (yy > 0 && solidAt(w, x, yy)) yy--; c.Y = yy * FP; c.VY = 0; c.rest = true; }
      else c.Y = ny;
    }
    for (const u of w.units) {
      if (!u.alive || u.away || c.taken || Math.abs(px(u.X) - x) > 6 || Math.abs(px(u.Y) - px(c.Y)) > 9) continue;
      c.taken = 1;
      if (c.kind === 'fika') { const n = Math.min(R.FIKA_HP, R.HP_MAX - u.hp); u.hp += n; w.events.push({ t: 'crate', kind: 'fika', unit: u.id, n, x, y: px(c.Y) }); }
      else if (c.weapon < 0) w.events.push({ t: 'crate', kind: 'wrong', unit: u.id, x, y: px(c.Y) });
      else { const tm = w.teams[u.team]; if (tm.ammo[c.weapon] >= 0) tm.ammo[c.weapon]++; w.events.push({ t: 'crate', kind: 'post', unit: u.id, weapon: c.weapon, x, y: px(c.Y) }); }
    }
    if (px(c.Y) > w.water) { c.taken = 1; w.events.push({ t: 'splash', x, y: w.water }); }
  }
  w.crates = w.crates.filter((c) => !c.taken);
}

/* ---------- loose things: boulders that fall and roll, the mine cart ---------- */
function stepBoulder(w, b) {
  if (b.gone || !b.moving || w.tick % 2) return;
  const m = w.map, own = new Set();
  const live = b.pts.filter(([dx, dy]) => { const x = b.cx + dx, y = b.cy + dy; return x >= 0 && x < W && y >= 0 && y < H && m.solid[y * W + x] && m.mat[y * W + x] === ROCK; });
  if (live.length < 20) { b.gone = 1; b.moving = 0; return; }
  for (const [dx, dy] of live) own.add((b.cy + dy) * W + b.cx + dx);
  let left = 0, right = 0;
  for (const [dx, dy] of live) {
    const x = b.cx + dx, y = b.cy + dy + 1;
    if (y < H && m.solid[y * W + x] && !own.has(y * W + x)) { if (dx < 0) left++; else if (dx > 0) right++; else { left++; right++; } }
  }
  let mx = 0, my = 0;
  if (left + right === 0) my = 1; else if (right === 0 && left < 6) mx = 1; else if (left === 0 && right < 6) mx = -1;
  if (!mx && !my) { b.moving = 0; return; }
  if (mx) my = 1;     // rolling: down and sideways
  const fits = (sx, sy) => live.every(([dx, dy]) => { const x = b.cx + dx + sx, y = b.cy + dy + sy; if (x < 0 || x >= W || y >= H) return true; const i = y * W + x; return !m.solid[i] || own.has(i); });
  if (!fits(mx, my)) { if (mx && fits(mx, 0)) my = 0; else if (mx && fits(0, 1)) mx = 0; else { b.moving = 0; return; } }
  for (const [dx, dy] of live) { const x = b.cx + dx, y = b.cy + dy; m.solid[y * W + x] = 0; m.mat[y * W + x] = 0; }
  b.cx += mx; b.cy += my;
  for (const [dx, dy] of live) { const x = b.cx + dx, y = b.cy + dy; if (x >= 0 && x < W && y >= 0 && y < H) { m.solid[y * W + x] = 1; m.mat[y * W + x] = ROCK; } }
  if (b.troll && m.troll) { m.troll.x = b.cx; m.troll.y = b.cy; }
  w.mapVersion++;
  for (const u of w.units) {
    if (!u.alive) continue;
    const ux = px(u.X), uy = px(u.Y);
    if (!own.has((uy - 4) * W + ux - mx) && !(m.solid[(uy - 4) * W + ux] && m.mat[(uy - 4) * W + ux] === ROCK)) continue;
    hurt(w, u, 30);
    if (u.alive) { let y = uy; while (y > 2 && !bodyFree(w, ux, y)) y--; u.Y = y * FP; u.VX = (ux < b.cx ? -2 : 2) * FP; u.VY = -2 * FP; u.air = true; }
  }
  if (b.cy - b.r > w.water) b.gone = 1;
}
function stepCart(w) {
  const c = w.cart;
  if (!c) return;
  const free = (x, y) => !solidAt(w, x - 6, y) && !solidAt(w, x + 6, y) && !solidAt(w, x, y) && !solidAt(w, x - 6, y - 5) && !solidAt(w, x + 6, y - 5);
  const x = px(c.X), y = px(c.Y);
  const onGround = !free(x, y + 1);
  if (!onGround) { c.VY = Math.min(c.VY + R.GRAVITY, 6 * FP); c.air = 1; }
  else if (c.VY > 0) { c.VY = 0; c.air = 0; }
  if (onGround && c.VX) c.VX = Math.abs(c.VX) <= 12 ? 0 : c.VX - Math.sign(c.VX) * 12;
  const n = Math.max(1, Math.trunc((Math.max(Math.abs(c.VX), Math.abs(c.VY)) + FP - 1) / FP));
  for (let i = 0; i < n; i++) {
    const nx = c.X + Math.trunc(c.VX / n), ny = c.Y + Math.trunc(c.VY / n);
    if (free(px(nx), px(ny))) { c.X = nx; c.Y = ny; continue; }
    if (free(px(nx), px(ny) - 2)) { c.X = nx; c.Y = ny - 2 * FP; continue; }
    if (free(px(c.X), px(ny))) { c.Y = ny; c.VX = -Math.trunc(c.VX / 3); continue; }
    if (c.VY > 0) { c.VY = 0; c.air = 0; } else c.VX = -Math.trunc(c.VX / 3);
    break;
  }
  if (Math.abs(c.VX) > 700) for (const u of w.units) {
    if (!u.alive || u.id === c.hit || Math.abs(px(u.X) - px(c.X)) > 8 || Math.abs(px(u.Y) - px(c.Y)) > 8) continue;
    c.hit = u.id; hurt(w, u, 25);
    if (u.alive) { u.VX = Math.sign(c.VX) * 3 * FP; u.VY = -2 * FP; u.air = true; }
    w.events.push({ t: 'bump', x: px(u.X), y: px(u.Y) });
  }
  if (px(c.Y) > w.water) { w.events.push({ t: 'splash', x: px(c.X), y: w.water }); w.cart = null; }
}

// Trollskogen at night: a blast on the troll wakes it, and it throws a stone at
// whoever's turn it is. Once a turn, aimed roughly, as trolls do.
function wakeTroll(w, x, y, r) {
  const tr = w.map.troll;
  if (!tr || !w.settings.night || w.trollTurn === w.turn.number) return;
  const dx0 = x - tr.x, dy0 = y - tr.y;
  if (dx0 * dx0 + dy0 * dy0 > (tr.r + r) * (tr.r + r)) return;
  const target = w.units.find((u) => u.id === w.turn.unit && u.alive) || w.units.find((u) => u.alive);
  if (!target) return;
  w.trollTurn = w.turn.number;
  const sx = tr.x, sy = tr.y - tr.r - 6, dx = px(target.X) - sx, dir = dx < 0 ? -1 : 1;
  const v = Math.max(2048, Math.min(10 * FP, isqrt(Math.abs(dx) * FP * R.GRAVITY)));
  w.spawn.push({ kind: 'troll', X: sx * FP, Y: sy * FP, VX: Math.trunc((dir * v * 724) / 1024), VY: -Math.trunc((v * 724) / 1024), owner: -1, age: 0, fuse: -1, rest: false });
  w.events.push({ t: 'troll', x: sx, y: sy });
}

// Dalahästen and Älgtestet walk along the ground.
function stepWalker(w, p, wp) {
  p.age++;
  if (p.age >= wp.life || (p.fuse > 0 && --p.fuse === 0)) { explode(w, px(p.X), px(p.Y) - 3, wp); return false; }
  const x = px(p.X), y = px(p.Y);
  const free = (xx, yy) => !solidAt(w, xx, yy) && !solidAt(w, xx, yy - 4) && !solidAt(w, xx, yy - 7);
  const ground = solidAt(w, x, y + 1) || solidAt(w, x - 1, y + 1) || solidAt(w, x + 1, y + 1);
  if (!ground || p.VY < 0) {
    p.VY = Math.min(p.VY + R.GRAVITY, 6 * FP);
    const nx = p.X + p.VX, ny = p.Y + p.VY;
    if (free(px(nx), px(ny))) { p.X = nx; p.Y = ny; }
    else if (free(px(p.X), px(ny))) { p.Y = ny; p.VX = 0; }
    else { p.Y = px(p.Y) * FP; p.VY = 0; p.VX = 0; }
  } else {
    p.VY = 0; p.VX = 0;
    const steps = p.kind === 'alg' ? 2 : (p.age % 2);
    for (let s = 0; s < steps; s++) {
      const cx = px(p.X), cy = px(p.Y), climb = p.kind === 'alg' ? 4 : 6;
      let moved = false;
      for (let c = 0; c <= climb && !moved; c++) if (free(cx + p.dir, cy - c)) {
        let ny = cy - c; for (let k = 0; k < 4 && free(cx + p.dir, ny + 1); k++) ny++;
        p.X = (cx + p.dir) * FP; p.Y = ny * FP; moved = true;
      }
      if (!moved) {
        if (p.kind === 'alg') { explode(w, cx, cy - 4, wp); return false; }
        if ((p.hops = (p.hops || 0) + 1) > 4) { p.dir = -p.dir; p.hops = 0; }
        else { p.VY = -2400; p.VX = p.dir * 700; }
        break;
      }
    }
  }
  if (p.kind === 'alg') {
    for (const u of w.units) {
      if (!u.alive || p.hits.includes(u.id) || Math.abs(px(u.X) - px(p.X)) > 5 || Math.abs(px(u.Y) - px(p.Y)) > 9) continue;
      p.hits.push(u.id); hurt(w, u, 10);
      if (u.alive) { u.VX = p.dir * 3 * FP; u.VY = -2 * FP; u.air = true; }
      w.events.push({ t: 'bump', x: px(u.X), y: px(u.Y) });
    }
  }
  const ix = px(p.X), iy = px(p.Y);
  if (iy > w.water) { w.events.push({ t: 'splash', x: ix, y: w.water }); return false; }
  if (ix < -20 || ix > W + 20) return false;
  return true;
}

function stepProjectile(w, p) {
  p.age++;
  const wp = p.kind === 'troll' ? R.TROLLSTONE : p.kind === 'ball' ? R.MEATBALL : R.WEAPONS.find((o) => o.id === p.kind);
  if (p.kind === 'drop') return stepDrop(w, p);
  if (p.kind === 'sno' && p.roll) return stepRoll(w, p);
  if (wp.walker) { p.age--; return stepWalker(w, p, wp); }
  if (p.fuse > 0 && --p.fuse === 0) { open(w, p, wp); return false; }
  if (p.rest) {
    if (!solidAt(w, px(p.X), px(p.Y) + 1)) p.rest = false; else return true;
  }
  if (wp.wind) p.VX += Math.trunc((w.wind * R.WIND_ACCEL) / 2);
  p.VY += R.GRAVITY;
  const n = Math.max(1, Math.trunc((Math.max(Math.abs(p.VX), Math.abs(p.VY)) + FP - 1) / FP));
  const sx = Math.trunc(p.VX / n), sy = Math.trunc(p.VY / n);
  for (let i = 0; i < n; i++) {
    const nx = p.X + sx, ny = p.Y + sy, ix = px(nx), iy = px(ny);
    if (iy > w.water) { w.events.push({ t: 'splash', x: ix, y: w.water }); return false; }
    if (ix < -60 || ix > W + 60 || iy > H + 20) return false;
    if (p.kind === 'kraft' && solidAt(w, ix, iy)) {
      for (let k = 0; k < 4; k++) w.mines.push({ X: (px(p.X) + k * 8 - 12) * FP, Y: (px(p.Y) - 2) * FP, arm: R.MINE_ARM });
      w.events.push({ t: 'kraft', x: px(p.X), y: px(p.Y) });
      return false;
    }
    if (p.kind === 'sno' && solidAt(w, ix, iy)) {
      p.roll = true; p.size = 2; p.dir = p.VX < 0 ? -1 : 1; p.speed = Math.min(4 * FP, Math.abs(p.VX) + 400); p.acc = 0; p.hits = [];
      let y = px(p.Y); while (y > 0 && solidAt(w, px(p.X), y)) y--; p.Y = y * FP; p.VX = 0; p.VY = 0;
      return true;
    }
    if (p.kind === 'gurra' || p.kind === 'troll' || p.kind === 'bullar' || p.kind === 'ball' || p.kind === 'jas' || p.kind === 'tarta') {
      const hitUnit = w.units.some((u) => u.alive && !(u.id === p.owner && p.age < 12) && Math.abs(px(u.X) - ix) <= 3 && iy >= px(u.Y) - 10 && iy <= px(u.Y));
      if (solidAt(w, ix, iy) || hitUnit || hitPiece(w, ix, iy)) {
        explode(w, ix, iy, wp);
        if (p.kind === 'bullar') for (let k = 0; k < 5; k++) w.spawn.push({ kind: 'ball', X: ix * FP, Y: (iy - 4) * FP, VX: randInt(w, 3001) - 1500, VY: -1500 - randInt(w, 1500), owner: -1, age: 0, fuse: -1, rest: false });
        return false;
      }
    } else if (solidAt(w, ix, iy)) {
      if (p.kind === 'korv' && ++p.bounces >= 3) { explode(w, px(p.X), px(p.Y), wp); return false; }
      const hx = solidAt(w, ix, px(p.Y)), vy = solidAt(w, px(p.X), iy);
      if (hx || !vy) p.VX = -Math.trunc((p.VX * 45) / 100);
      if (vy || !hx) { p.VY = -Math.trunc((p.VY * 40) / 100); p.VX = Math.trunc((p.VX * 80) / 100); }
      if (Math.abs(p.VY) < 400 && Math.abs(p.VX) < 200 && solidAt(w, px(p.X), px(p.Y) + 1)) { p.rest = true; p.VX = 0; p.VY = 0; }
      w.events.push({ t: 'bounce', kind: p.kind, x: px(p.X), y: px(p.Y), v: Math.abs(p.VX) + Math.abs(p.VY) });
      return true;
    }
    p.X = nx; p.Y = ny;
  }
  return true;
}
function open(w, p, wp) {
  const x = px(p.X), y = px(p.Y);
  explode(w, x, y, wp);
  if (p.kind === 'strom') { w.clouds.push({ X: p.X, Y: p.Y - 6 * FP, turns: R.CLOUD_TURNS }); w.events.push({ t: 'cloud', x, y }); }
}

/* ---------- turns ---------- */
const aliveIn = (w, ti) => w.units.filter((u) => u.alive && u.team === ti);

function nextTurn(w) {
  const t = w.turn;
  if (w.king && w.king.winner != null) return gameOver(w, w.king.winner >= 0 ? [w.teams[w.king.winner]] : []);
  const living = w.teams.filter((tm) => aliveIn(w, tm.index).length > 0);
  if (living.length <= 1 && t.phase !== 'start') return gameOver(w, living);
  // pick the next team with vättar left
  let team = t.team;
  for (let k = 0; k < w.teams.length; k++) {
    team = (team + 1) % w.teams.length;
    if (aliveIn(w, team).length) break;
  }
  if (team <= t.team || t.team < 0) t.round++;
  for (const u of w.units) u.washed = 0;
  // back from Borås: wet (an umbrella for two turns), with a little less life, somewhere on the own side
  for (const u of w.units) if (u.wet) u.wet--;
  for (const u of w.units) if (u.alive && u.away && --u.away === 0) {
    const spots = w.map.spawns[u.team], [sx, sy] = spots[randInt(w, spots.length)];
    let y = sy; while (y > 3 && !bodyFree(w, sx, y)) y--;
    u.X = sx * FP; u.Y = y * FP; u.air = true; u.wet = 2;
    w.events.push({ t: 'back', unit: u.id, x: sx, y });
    if (u.hp > R.TICKET_DAMAGE) hurt(w, u, R.TICKET_DAMAGE); else u.hp = 1;
  }
  // Halmbocken singes the vättar of the team whose turn begins
  for (const f of w.fires) for (const u of aliveIn(w, team)) {
    if (u.away) continue;
    const dx = px(u.X) - px(f.X), dy = px(u.Y) - px(f.Y);
    if (dx * dx + dy * dy <= R.FIRE_RADIUS * R.FIRE_RADIUS) hurt(w, u, R.FIRE_DAMAGE);
  }
  for (const f of w.fires) f.turns--;
  w.fires = w.fires.filter((f) => f.turns > 0);
  // a crate every second round
  const newRound = t.phase !== 'start' && team <= t.team;
  if (w.settings.crates && newRound && t.round % (w.map.crateEvery || R.CRATE_EVERY) === (w.map.crateEvery === 1 ? 0 : 1)) dropCrate(w);
  // Borås: it rains (fire goes out) and sinkholes open between rounds
  if (w.map.rain && w.fires.length) { for (const f of w.fires) w.events.push({ t: 'steam', x: px(f.X), y: px(f.Y) }); w.fires = []; }
  if (w.map.sinkholes && newRound && randInt(w, 2) === 0) {
    const x = 20 + randInt(w, W - 40); let y = 190; while (y < H && !solidAt(w, x, y)) y++;
    if (y < w.water) { blast(w.map, x, y + 6, 12); w.mapVersion++; w.events.push({ t: 'sinkhole', x, y }); }
  }
  // the surströmming cloud stings the vättar of the team whose turn begins
  for (const c of w.clouds) for (const u of aliveIn(w, team)) {
    const dx = px(u.X) - px(c.X), dy = px(u.Y) - 5 - px(c.Y);
    if (dx * dx + dy * dy <= R.CLOUD_RADIUS * R.CLOUD_RADIUS) hurt(w, u, R.CLOUD_DAMAGE);
  }
  for (const c of w.clouds) c.turns--;
  w.clouds = w.clouds.filter((c) => c.turns > 0);
  if (w.settings.flood && t.round >= w.settings.flood && t.phase !== 'start') { w.water -= R.FLOOD_PX; w.events.push({ t: 'flood', water: w.water }); }
  const left = w.teams.filter((tm) => aliveIn(w, tm.index).length > 0);
  if (left.length <= 1 && t.phase !== 'start') return gameOver(w, left);
  if (!aliveIn(w, team).length) { t.team = team; return nextTurn(w); }
  // the next vätte of that team, in turn
  const tm = w.teams[team], own = w.units.filter((u) => u.team === team);
  let pick = null;
  for (let k = 0; k < own.length; k++) { const u = own[(tm.next + k) % own.length]; if (u.alive && !u.away) { pick = u; tm.next = (own.indexOf(u) + 1) % own.length; break; } }
  if (!pick) { t.team = team; t.phase = 'settle'; t.quiet = 0; return; }   // all of this team is in Borås: the turn passes
  t.team = team; t.unit = pick.id; t.phase = 'aim'; t.timer = w.settings.turn * R.TPS; t.retreat = 0; t.quiet = 0; t.number++;
  if (tm.ammo[t.weapon] === 0) t.weapon = Math.max(0, tm.ammo.findIndex((a) => a !== 0));
  t.aim = { angle: pick.face > 0 ? 45 : 135, power: 60 };
  w.wind = randInt(w, R.WIND_MAX * 2 + 1) - R.WIND_MAX;
  w.events.push({ t: 'turn', team, unit: pick.id, wind: w.wind, round: t.round });
}
function gameOver(w, living) {
  w.turn.phase = 'over';
  w.winner = living.length === 1 ? living[0].index : -1;
  w.events.push({ t: 'over', winner: w.winner });
}

const busy = (w) => w.projectiles.length > 0 || w.units.some((u) => u.alive && u.air) || w.stones.some((s) => s.air !== false)
  || w.map.boulders.some((b) => b.moving) || (w.cart && (w.cart.VX !== 0 || w.cart.air)) || w.crates.some((c) => !c.rest) || pieces(w).some((k) => k.air) || !!w.slide;

/* ---------- one step ---------- */
// input: { walk: -1|0|1, jump: bool, weapon: index, aim: {angle, power}, fire: {angle, power} | true }
export function step(w, input = {}) {
  w.events = [];
  const t = w.turn;
  if (t.phase === 'over') { w.tick++; return w; }
  const u = w.units.find((o) => o.id === t.unit);
  const control = u && u.alive && (t.phase === 'aim' || t.phase === 'retreat');
  if (control) {
    if (t.phase === 'aim' && Number.isInteger(input.weapon) && input.weapon >= 0 && input.weapon < R.WEAPONS.length && w.teams[u.team].ammo[input.weapon] !== 0) t.weapon = input.weapon;
    if (input.aim && t.phase === 'aim') {
      t.aim = { angle: ((input.aim.angle | 0) % 360 + 360) % 360, power: Math.max(0, Math.min(100, input.aim.power | 0)) };
      u.face = cos(t.aim.angle) < 0 ? -1 : 1;
    }
    if (!u.air) {
      if (input.jump && standing(w, px(u.X), px(u.Y))) { u.air = true; u.VX = u.face * R.JUMP_VX; u.VY = R.JUMP_VY; w.events.push({ t: 'jump', x: px(u.X), y: px(u.Y) }); }
      else if (input.walk === 1 || input.walk === -1) { u.walk++; if (u.walk % R.WALK_EVERY === 0) walk(w, u, input.walk); }
      if (input.fire && t.phase === 'aim' && !u.air && !R.WEAPONS[t.weapon].tool) {
        const shot = input.fire === true ? t.aim : input.fire;
        if (fire(w, u, shot)) { t.phase = 'retreat'; t.retreat = R.WEAPONS[t.weapon].walker ? Math.max(R.RETREAT_TICKS, R.WEAPONS[t.weapon].life) : R.RETREAT_TICKS; }
      }
    }
    // Metspöt: cast (also in the air), swing with the arrows, jump to let go.
    if (u.rope) {
      if (input.jump) { u.rope = null; w.events.push({ t: 'rope-off', x: px(u.X), y: px(u.Y) }); }
      else if (input.walk === 1 || input.walk === -1) { u.VX += input.walk * R.ROPE_SWING; u.face = input.walk; }
    }
    if (input.fire && t.phase === 'aim' && R.WEAPONS[t.weapon].tool && typeof input.fire === 'object') fire(w, u, input.fire);
    // Dalahästen goes off when the player taps again.
    if (input.fire && t.phase === 'retreat') for (const p of w.projectiles) if (p.kind === 'hast' && p.owner === u.id && p.fuse < 0 && p.age > 6) p.fuse = 1;
  }
  stepCrates(w);
  stepMines(w);
  stepKnalle(w);
  for (const b of w.map.boulders) stepBoulder(w, b);
  stepCart(w);
  stepPieces(w);
  stepSlide(w);
  for (const o of w.units) stepUnit(w, o);
  stepStations(w);
  // Projectiles made during the step (meatballs, the troll's stone) join after it.
  w.projectiles = w.projectiles.filter((p) => stepProjectile(w, p));
  if (w.spawn.length) { w.projectiles.push(...w.spawn); w.spawn = []; }
  for (const c of w.clouds) c.X += w.wind * 2;
  for (const s of w.stones) {
    if (s.air === false && solidAt(w, px(s.X), px(s.Y) + 1)) continue;
    s.air = true; s.VY = Math.min(s.VY + R.GRAVITY, 6 * FP); s.Y += s.VY;
    while (solidAt(w, px(s.X), px(s.Y))) { s.Y -= FP; s.air = false; s.VY = 0; }
    if (solidAt(w, px(s.X), px(s.Y) + 1)) { s.air = false; s.VY = 0; }
    if (px(s.Y) > H + 10) s.air = false;
  }
  w.stones = w.stones.filter((s) => px(s.Y) <= w.water);

  if (t.phase === 'aim') { if (--t.timer <= 0) t.phase = 'settle'; }
  else if (t.phase === 'retreat') { t.timer = Math.max(0, t.timer - 1); if (--t.retreat <= 0) t.phase = 'settle'; }
  if ((t.phase === 'aim' || t.phase === 'retreat') && !(u && u.alive)) t.phase = 'settle';
  if (t.phase !== 'aim' && t.phase !== 'retreat') for (const o of w.units) if (o.rope) { o.rope = null; o.air = true; }
  if (t.phase === 'aim' && u && u.alive && u.air && px(u.Y) > w.water) t.phase = 'settle';
  if (t.phase === 'settle' || t.phase === 'start') {
    t.quiet = busy(w) ? 0 : t.quiet + 1;
    if (t.quiet >= R.SETTLE_QUIET_TICKS) nextTurn(w);
  }
  w.tick++;
  return w;
}

/* ---------- helpers for drawing, tests and online play ---------- */
export const activeUnit = (w) => w.units.find((u) => u.id === w.turn.unit) || null;
export const kubbsLeft = standingKubbs;
export const teamHp = (w, ti) => w.units.filter((u) => u.team === ti && u.alive).reduce((a, u) => a + u.hp, 0);
export { px };

// A short fingerprint of the whole match state, to compare two browsers.
export function fingerprint(w) {
  let h = 2166136261 >>> 0;
  const mix = (v) => { h ^= v & 0xffffffff; h = Math.imul(h, 16777619) >>> 0; };
  mix(w.tick); mix(w.rng); mix(w.water); mix(w.wind + 100);
  for (const u of w.units) { mix(u.X); mix(u.Y); mix(u.VX); mix(u.VY); mix(u.hp); mix(u.alive ? 1 : 0); }
  for (const p of w.projectiles) { mix(p.X); mix(p.Y); mix(p.VX); mix(p.VY); mix(p.fuse); }
  for (const c of w.clouds) { mix(c.X); mix(c.turns); }
  for (const l of w.map.lamps) mix(l.on);
  for (const b of w.map.boulders) { mix(b.cx); mix(b.cy); }
  if (w.cart) { mix(w.cart.X); mix(w.cart.Y); mix(w.cart.VX); }
  for (const c of w.crates) { mix(c.X); mix(c.Y); mix(c.weapon + 2); }
  for (const f of w.fires) { mix(f.X); mix(f.turns); }
  for (const u of w.units) { mix(u.away | 0); mix((u.station ?? -1) + 2); if (u.rope) { mix(u.rope.AX); mix(u.rope.AY); mix(u.rope.L); } }
  for (const m of w.mines) { mix(m.X); mix(m.Y); mix(m.arm); }
  for (const k of pieces(w)) { mix(k.X); mix(k.Y); mix(k.down); }
  if (w.knalle) { mix(w.knalle.X); mix(w.knalle.Y); mix(w.knalle.dir); }
  const s = w.map.solid;
  for (let i = 0; i < s.length; i += 7) mix(s[i] * (i + 1));
  mix(w.turn.team + 5); mix(w.turn.unit + 5); mix(w.turn.timer); mix(w.turn.round);
  return h.toString(16).padStart(8, '0');
}
