// The computer opponent (F-030). It plans a turn by trying many shots in its
// head (a quick copy of the projectile physics) and picks one that hurts the
// other team most and itself least. The level decides how much it misses.
// Only used on one phone, so it may use Math.random; online play has no computer players.
import { W, H, FP, GRAVITY, WIND_ACCEL, WEAPONS, KUBB_H, KING_H } from '../sim/rules.js';
import { sin, cos } from '../sim/trig.js';

export const LEVELS = {
  latt: { name: 'Lätt', angleErr: 14, powerErr: 18, pickTop: 6, think: 1600 },
  lagom: { name: 'Lagom', angleErr: 5, powerErr: 7, pickTop: 3, think: 1300 },
  svar: { name: 'Svår', angleErr: 1, powerErr: 2, pickTop: 1, think: 1000 }
};

const px = (v) => Math.floor(v / FP);
const idx = (id) => WEAPONS.findIndex((w) => w.id === id);

// Where a shot lands: [x, y] of the hit, or null if it leaves the map or drowns.
function flight(w, u, wp, angle, power) {
  const solid = w.map.solid;
  const isSolid = (x, y) => x >= 0 && x < W && y >= 0 && y < H && solid[y * W + x] === 1;
  const v = Math.trunc((wp.speed * power) / 100), dx = cos(angle), dy = -sin(angle);
  let X = u.X + dx * 7, Y = u.Y - 5 * FP + dy * 7, VX = Math.trunc((dx * v) / 1024), VY = Math.trunc((dy * v) / 1024);
  for (let t = 0; t < 420; t++) {
    if (wp.wind) VX += Math.trunc((w.wind * WIND_ACCEL) / 2);
    VY += GRAVITY;
    const n = Math.max(1, Math.trunc((Math.max(Math.abs(VX), Math.abs(VY)) + FP - 1) / FP));
    for (let i = 0; i < n; i++) {
      X += Math.trunc(VX / n); Y += Math.trunc(VY / n);
      const x = px(X), y = px(Y);
      if (y > w.water || x < -60 || x > W + 60) return null;
      if (isSolid(x, y)) return [x, y];
      if (t > 8) for (const o of w.units) if (o.alive && !o.away && Math.abs(px(o.X) - x) <= 3 && y >= px(o.Y) - 10 && y <= px(o.Y)) return [x, y];
      for (const k of pieces(w)) if (!k.down && Math.abs(px(k.X) - x) <= (k.king ? 2 : 1) && y <= px(k.Y) && y >= px(k.Y) - (k.king ? KING_H : KUBB_H)) return [x, y];
    }
  }
  return null;
}

const pieces = (w) => (w.kubbs ? [...w.kubbs, ...(w.king ? [w.king] : [])] : []);

// How good a blast at (x, y) is for the team: damage to the others minus twice the damage to its own.
function score(w, team, x, y, wp) {
  const reach = wp.radius + 12;
  let s = 0;
  for (const o of w.units) {
    if (!o.alive || o.away) continue;
    const dx = px(o.X) - x, dy = px(o.Y) - 5 - y, d = Math.sqrt(dx * dx + dy * dy);
    if (d >= reach) continue;
    let dmg = Math.min(o.hp, wp.damage * (reach - d) / reach);
    if (dmg >= o.hp) dmg += 30;                          // a kill is worth extra
    if (px(o.Y) > w.water - 30) dmg += 8;                // near the water: the push may drown it
    s += o.team === team ? -2 * dmg : dmg;
  }
  // Kubb: the other team's kubbar are worth a lot; the king only once they are all down.
  if (w.kubbs) {
    const theirs = w.kubbs.filter((k) => k.team !== team && !k.down).length;
    for (const k of pieces(w)) {
      if (k.down) continue;
      const dx = px(k.X) - x, dy = px(k.Y) - (k.king ? 7 : 4) - y, d2 = dx * dx + dy * dy;
      // keep well away from the king while it must stand: shots do not land exactly where planned
      if (k.king && theirs > 0) { const safe = wp.radius + 30; if (d2 < safe * safe) s -= 400; continue; }
      if (d2 > (wp.radius + 3) * (wp.radius + 3)) continue;
      s += k.king ? 400 : k.team === team ? -45 : 45;
    }
  }
  return s;
}

// Plan one turn: returns a list of [delay in ms, input event].
export function planTurn(w, level = 'lagom') {
  const L = LEVELS[level] || LEVELS.lagom, t = w.turn, u = w.units.find((o) => o.id === t.unit);
  if (!u || !u.alive) return [];
  const team = u.team, ammo = w.teams[team].ammo;
  const enemies = w.units.filter((o) => o.alive && !o.away && o.team !== team);
  if (!enemies.length) return [];
  const near = enemies.find((o) => Math.abs(px(o.X) - px(u.X)) < 16 && Math.abs(px(o.Y) - px(u.Y)) < 12);

  // Right next to someone: dynamite, then walk away.
  if (near && ammo[idx('dyn')] > 0 && level !== 'latt' && score(w, team, px(u.X), px(u.Y) - 4, WEAPONS[idx('dyn')]) > 0) {
    const away = px(near.X) > px(u.X) ? -1 : 1;
    return [[L.think, { weapon: idx('dyn') }], [300, { fire: true }], [200, { walk: away }], [2200, { walk: 0 }]];
  }

  // Try the aimed weapons it has over many angles and powers.
  const options = [];
  for (const id of ['gurra', 'bullar', 'tarta']) {
    const i = idx(id);
    if (ammo[i] === 0 || !w.settings.weapons.includes(id)) continue;
    const wp = WEAPONS[i];
    if (id === 'tarta' && enemies.length < 2 && level !== 'svar') continue;
    for (let angle = 10; angle <= 170; angle += 4) for (let power = 25; power <= 100; power += 5) {
      const hit = flight(w, u, wp, angle, power);
      if (!hit) continue;
      const s = score(w, team, hit[0], hit[1], wp) - (id === 'gurra' ? 0 : 10);
      if (s > 0) options.push({ weapon: i, angle, power, s });
    }
  }
  // Strikes from the sky at the enemy that is easiest to reach.
  for (const id of ['korv', 'jas']) {
    const i = idx(id);
    if (ammo[i] <= 0 || level === 'latt' || !w.settings.weapons.includes(id) || w.map.roof) continue;
    for (const o of enemies) {
      if (w.king && !w.king.down && w.kubbs.some((k) => k.team !== team && !k.down) && Math.abs(px(o.X) - px(w.king.X)) < 50) continue;
      options.push({ weapon: i, tx: px(o.X), s: 18 + Math.random() * 8 });
    }
  }
  options.sort((a, b) => b.s - a.s);
  // Kubb: a shot that could knock the king over if it goes a little wrong is not worth it.
  const king = w.king && !w.king.down && w.kubbs.some((k) => k.team !== team && !k.down) ? w.king : null;
  if (king) {
    const near = (hit, wp) => { if (!hit) return false; const dx = hit[0] - px(king.X), dy = hit[1] - px(king.Y) + 7, r = wp.radius + 6; return dx * dx + dy * dy < r * r; };
    const ea = Math.max(2, L.angleErr), ep = Math.max(2, L.powerErr), safe = [];
    for (const o of options) {
      if (safe.length >= L.pickTop || o.angle == null) { if (o.angle == null) safe.push(o); if (safe.length >= L.pickTop) break; continue; }
      const wp = WEAPONS[o.weapon];
      let ok = true;
      for (const [da, dp] of [[-ea, 0], [ea, 0], [0, -ep], [0, ep], [-ea, -ep], [ea, ep], [-ea, ep], [ea, -ep]]) if (near(flight(w, u, wp, o.angle + da, Math.max(15, Math.min(100, o.power + dp))), wp)) { ok = false; break; }
      if (ok) safe.push(o);
    }
    options.length = 0; options.push(...safe);
  }
  let pick = options[Math.floor(Math.random() * Math.min(L.pickTop, options.length))];
  if (!pick) {
    // Nothing reaches: shoot roughly towards the nearest enemy.
    const o = enemies.reduce((a, b) => (Math.abs(px(b.X) - px(u.X)) < Math.abs(px(a.X) - px(u.X)) ? b : a));
    pick = { weapon: idx('gurra'), angle: px(o.X) > px(u.X) ? 55 : 125, power: 70 };
    // Kubb: rather waste the shot than risk the king. Throw it gently away from the king.
    if (king) pick = { weapon: idx('gurra'), angle: px(king.X) > px(u.X) ? 160 : 20, power: 20 };
  }
  const plan = [[L.think, { weapon: pick.weapon }]];
  if (pick.tx != null) { plan.push([600, { fire: { tx: pick.tx, ty: 20 } }]); return plan; }
  const err = (e) => Math.round((Math.random() * 2 - 1) * e);
  const angle = ((pick.angle + err(L.angleErr)) % 360 + 360) % 360, power = Math.max(15, Math.min(100, pick.power + err(L.powerErr)));
  // Sweep the aim a little so the player can see it think, then fire.
  const from = angle + (angle < 90 ? 20 : -20);
  for (let k = 0; k <= 5; k++) plan.push([90, { aim: { angle: Math.round(from + ((angle - from) * k) / 5), power: Math.round(power * (0.6 + 0.08 * k)) } }]);
  plan.push([350, { fire: { angle, power } }]);
  return plan;
}
