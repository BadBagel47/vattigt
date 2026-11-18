// The maps and match settings.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newMatch, step, fingerprint, matchSettings, px } from '../src/sim/world.js';
import { makeMap, blast, ROCK, SOIL } from '../src/sim/terrain.js';
import * as R from '../src/sim/rules.js';

const settle = (w, max = 3000) => { for (let i = 0; i < max && w.turn.phase !== 'aim' && w.turn.phase !== 'over'; i++) step(w); return w; };

for (const map of ['midsommar', 'kobbarna', 'trollskogen', 'gruvan', 'boras', 'fjallet', 'takasarna', 'raukarna', 'slatten', 'alven', 'villa']) {
  test(`${map}: every vätte lands on the map and the first turn starts`, () => {
    for (const units of [1, 3, 5]) {
      const w = settle(newMatch(99, { settings: { map, units } }));
      assert.equal(w.turn.phase, 'aim', `units ${units}`);
      assert.equal(w.units.length, units * 2);
      assert.ok(w.units.every((u) => u.alive && !u.air), `all standing with ${units} per team`);
      if (map === 'gruvan') assert.ok(w.units.every((u) => (u.Y >> 10) > w.map.roof + 4), 'everyone starts below ground');
    }
  });
  test(`${map}: the same seed gives the same map and match`, () => {
    const a = settle(newMatch(5, { settings: { map } })), b = settle(newMatch(5, { settings: { map } }));
    assert.equal(fingerprint(a), fingerprint(b));
  });
}

test('rock takes half the crater', () => {
  const m = makeMap(1, 'kobbarna');
  const x = 248, y = m.surface[248] + 20;
  assert.equal(m.mat[y * R.W + x], ROCK);
  blast(m, x, y, 16);
  assert.equal(m.solid[(y + 10) * R.W + x], 1, 'rock 10 px away is still there');
  const s = makeMap(1, 'midsommar'), sy = s.surface[120] + 20;
  assert.equal(s.mat[sy * R.W + 120], SOIL);
  blast(s, 120, sy, 16);
  assert.equal(s.solid[(sy + 10) * R.W + 120], 0, 'soil 10 px away is gone');
});

test('a lantern in the mine goes out when a blast reaches it', () => {
  const w = settle(newMatch(3, { settings: { map: 'gruvan' } }));
  const lamp = w.map.lamps[0];
  const u = w.units.find((o) => o.id === w.turn.unit);
  u.X = (lamp.x + 4) * R.FP; u.Y = (lamp.y + 12) * R.FP;
  for (let i = 0; i < 60; i++) step(w);
  step(w, { weapon: 2 }); step(w, { fire: true });
  for (let i = 0; i < 400; i++) step(w);
  assert.equal(lamp.on, 0);
});

test('the troll throws a stone back at night, not by day', () => {
  for (const night of [true, false]) {
    const w = settle(newMatch(8, { settings: { map: 'trollskogen', night } }));
    const tr = w.map.troll;
    w.projectiles.push({ kind: 'gurra', X: (tr.x - tr.r - 2) * R.FP, Y: tr.y * R.FP, VX: 2000, VY: 0, owner: -1, age: 50, fuse: -1, rest: false });
    let thrown = false;
    for (let i = 0; i < 30; i++) { step(w); if (w.events.some((e) => e.t === 'troll')) thrown = true; }
    assert.equal(thrown, night, `night ${night}`);
  }
});

test('settings: turn time, flood off and weapons left out', () => {
  const s = matchSettings({ settings: { turn: 30, flood: 0, weapons: ['gurra'] } });
  assert.deepEqual([s.turn, s.flood, s.weapons], [30, 0, ['gurra']]);
  const w = settle(newMatch(4, { settings: s }));
  assert.equal(w.turn.timer, 30 * R.TPS);
  assert.equal(w.teams[0].ammo[0], -1);
  assert.ok(w.teams[0].ammo.slice(1).every((a) => a === 0));
  assert.equal(matchSettings({ settings: { units: 99, map: 'mars' } }).units, R.DEFAULT_SETTINGS.units);
});

test('team names and colours from the team builder', () => {
  const w = newMatch(4, { teams: [{ name: 'Tomtenissarna', units: ['Ada'], color: 3 }, {}] });
  assert.equal(w.teams[0].name, 'Tomtenissarna');
  assert.equal(w.teams[0].color, 3);
  assert.equal(w.units[0].name, 'ADA');
  assert.equal(w.teams[1].name, 'Vättrundan');
});

test('a boulder falls when the ground under it is blown away', () => {
  const w = settle(newMatch(12, { settings: { map: 'trollskogen' } }));
  const b = w.map.boulders[3], y0 = b.cy;
  for (let y = b.cy; y < b.cy + b.r + 30; y++) for (let x = b.cx - b.r - 2; x <= b.cx + b.r + 2; x++) { const i = y * R.W + x; if (w.map.mat[i] !== 2 || y > b.cy + b.r + 2) { w.map.solid[i] = 0; } }
  b.moving = 1;
  for (let i = 0; i < 200; i++) step(w);
  assert.ok(b.cy > y0 + 5, `moved from ${y0} to ${b.cy}`);
});

test('the mine cart rolls when a blast pushes it', () => {
  const w = settle(newMatch(13, { settings: { map: 'gruvan' } }));
  for (let i = 0; i < 120; i++) step(w);
  const x0 = w.cart.X;
  w.projectiles.push({ kind: 'gurra', X: (232 - 14) * R.FP, Y: 160 * R.FP, VX: 0, VY: 3000, owner: -1, age: 50, fuse: -1, rest: false });
  for (let i = 0; i < 120; i++) step(w);
  assert.ok(w.cart === null || Math.abs(w.cart.X - x0) > 5 * R.FP, 'the cart moved');
});

test('Borås: rain puts fire out, sinkholes open, crates every round, Knallen trades', () => {
  const w = settle(newMatch(51, { settings: { map: 'boras' } }));
  w.fires.push({ X: 100 * R.FP, Y: 205 * R.FP, turns: 4 });
  const seen = new Set();
  for (let i = 0; i < 60000 && w.turn.round < 8 && w.turn.phase !== 'over'; i++) { step(w); for (const e of w.events) seen.add(e.t); }
  assert.equal(w.fires.length, 0, 'the rain put the fire out');
  assert.ok(seen.has('sinkhole'), 'a sinkhole opened');
  assert.ok(seen.has('crate-drop'), 'crates fell');
  // Knallen: put the active vätte next to him
  const k = w.knalle;
  if (k && w.turn.phase === 'aim') {
    const u = w.units.find((o) => o.id === w.turn.unit);
    u.X = k.X; u.Y = k.Y; u.air = true;
    let traded = false;
    for (let i = 0; i < 30; i++) { step(w); if (w.events.some((e) => e.t === 'trade')) traded = true; }
    assert.ok(traded, 'Knallen traded');
  }
});

test('fjallet: a blast on the steep face sets off an avalanche that moves snow and hurts', () => {
  const w = settle(newMatch(5, { settings: { map: 'fjallet' } }));
  assert.ok(w.map.avalanche);
  const snowBelow = (w) => { let n = 0; for (let y = 170; y < R.H; y++) for (let x = 170; x < 240; x++) if (w.map.solid[y * R.W + x] && w.map.mat[y * R.W + x] === 4) n++; return n; };
  const before = snowBelow(w);
  // a vätte of the other team waits at the foot of the face
  const u = w.units.find((o) => o.id === w.turn.unit), other = w.units.find((o) => o.team !== u.team);
  other.X = 182 * 1024; other.Y = 150 * 1024; other.air = true;
  u.X = 150 * 1024; u.Y = 100 * 1024; u.air = true;
  for (let i = 0; i < 60; i++) step(w);
  step(w, { weapon: 2 }); step(w, { fire: true });
  const evs = [];
  for (let i = 0; i < 3000 && w.turn.phase !== 'aim' && w.turn.phase !== 'over'; i++) { step(w); evs.push(...w.events); }
  assert.ok(evs.some((e) => e.t === 'avalanche'), 'an avalanche started');
  assert.ok(snowBelow(w) > before, 'snow slid down the slope');
  assert.equal(w.slide, null, 'and it stopped');
});

test('fjallet: avalanches are the same in every browser', () => {
  const run = () => {
    const w = settle(newMatch(8, { settings: { map: 'fjallet' } }));
    const u = w.units.find((o) => o.id === w.turn.unit); u.X = 330 * 1024; u.Y = 100 * 1024; u.air = true;
    for (let i = 0; i < 60; i++) step(w);
    step(w, { weapon: 2 }); step(w, { fire: true });
    return settle(w);
  };
  assert.equal(fingerprint(run()), fingerprint(run()));
});

test('takasarna: the underground takes a vätte to the next station the way it faces', () => {
  const w = settle(newMatch(5, { settings: { map: 'takasarna' } }));
  const st = w.map.stations;
  assert.equal(st.length, 3);
  for (const s of st) assert.ok(w.map.solid[(s.y + 1) * R.W + s.x], 'stations stand on the street');
  const u = w.units.find((o) => o.id === w.turn.unit);
  u.X = (st[0].x - 6) * 1024; u.Y = st[0].y * 1024; u.air = true;
  for (let i = 0; i < 60; i++) step(w);
  const evs = [];
  for (let i = 0; i < 400; i++) { step(w, { walk: 1 }); evs.push(...w.events); if (evs.some((e) => e.t === 'metro')) break; }
  const ride = evs.find((e) => e.t === 'metro');
  assert.ok(ride, 'it rode');
  assert.equal(ride.to, 1, 'facing right: the next station to the right');
  assert.ok(Math.abs((u.X >> 10) - st[1].x) <= 4, 'it came out at that station');
  // standing still at the arrival does not ride again
  for (let i = 0; i < 60; i++) step(w, { walk: 0 });
  assert.ok(Math.abs((u.X >> 10) - st[1].x) <= 4);
  // facing left from the first station: round to the last one
  const w2 = settle(newMatch(5, { settings: { map: 'takasarna' } }));
  const v = w2.units.find((o) => o.id === w2.turn.unit);
  v.X = st[0].x * 1024; v.Y = (st[0].y - 3) * 1024; v.face = -1; v.air = true; v.station = -1;
  const e2 = [];
  for (let i = 0; i < 60; i++) { step(w2); e2.push(...w2.events); }
  assert.equal(e2.find((e) => e.t === 'metro')?.to, 2);
});

test('the new maps are allowed in the settings', () => {
  assert.equal(matchSettings({ settings: { map: 'fjallet' } }).map, 'fjallet');
  assert.equal(matchSettings({ settings: { map: 'takasarna' } }).map, 'takasarna');
});

test('raukarna: cutting the foot of a stack topples it, the same way every time', () => {
  const run = () => {
    const w = settle(newMatch(3, { settings: { map: 'raukarna' } }));
    const r = w.map.raukar[1], u = w.units.find((o) => o.id === w.turn.unit);
    u.X = (r.x - 6) * 1024; u.Y = (r.base - 2) * 1024; u.air = true;
    for (let i = 0; i < 60; i++) step(w);
    step(w, { weapon: 2 }); step(w, { fire: true });
    const evs = [];
    for (let i = 0; i < 2000 && w.turn.phase !== 'aim' && w.turn.phase !== 'over'; i++) { step(w); evs.push(...w.events); }
    return { w, r, evs };
  };
  const a = run(), b = run();
  assert.equal(a.r.fallen, 1, 'it fell');
  assert.ok(a.evs.some((e) => e.t === 'rauk'));
  assert.equal(fingerprint(a.w), fingerprint(b.w));
  // the stack now lies to the right of its foot
  let right = 0; for (let y = 150; y < a.w.water; y++) for (let x = a.r.x + 20; x < a.r.x + 80; x++) if (a.w.map.solid[y * R.W + x] && a.w.map.mat[y * R.W + x] === 5) right++;
  assert.ok(right > 200, 'lying down beside it');
});

test('slatten: the sails turn with the wind and hit a shot back', async () => {
  const { sailAt } = await import('../src/sim/world.js');
  const w = settle(newMatch(3, { settings: { map: 'slatten' } }));
  assert.equal(w.map.windScale, 2);
  const s0 = w.sail;
  for (let i = 0; i < 10; i++) step(w);
  assert.notEqual(w.sail, s0, 'the sails turn');
  const mi = w.map.mill;
  // a point on a blade
  const a = w.sail, x = mi.x + Math.round((Math.cos(a * Math.PI / 180) * 20)), y = mi.y - Math.round(Math.sin(a * Math.PI / 180) * 20);
  assert.ok(sailAt(w, x, y) >= 0, 'a point on a blade is a sail');
  assert.equal(sailAt(w, mi.x + 60, mi.y), -1);
  // a shot flying into the mill comes back
  const u = w.units.find((o) => o.id === w.turn.unit);
  const evs = [];
  w.projectiles.push({ kind: 'gurra', X: (mi.x - 40) * 1024, Y: mi.y * 1024, VX: 3 * 1024, VY: -170, owner: -1, age: 20, fuse: -1, rest: false });
  w.wind = 0;
  for (let i = 0; i < 60 && w.projectiles.length; i++) { step(w); evs.push(...w.events); }
  assert.ok(evs.some((e) => e.t === 'sail' || e.t === 'boom'), 'it hit a sail or the mill');
});

test('alven: logs drift between turns and carry who stands on them; blowing the dam raises the water', () => {
  const w = settle(newMatch(3, { settings: { map: 'alven', flood: 0 } }));
  const lg = w.map.logs[1], x0 = lg.x;
  // a vätte on the log
  const v = w.units.find((o) => o.team !== w.turn.team);
  v.X = (lg.x + 10) * 1024; v.Y = (lg.y - 4) * 1024; v.air = true;
  for (let i = 0; i < 60; i++) step(w);
  assert.equal(px(v.Y), lg.y - 1, 'standing on the log');
  const vx = px(v.X);
  w.turn.timer = 1;
  for (let i = 0; i < 1500 && !w.events.some((e) => e.t === 'turn'); i++) step(w);
  assert.notEqual(lg.x, x0, 'the log drifted');
  assert.equal(px(v.X) - vx, lg.x - x0, 'the rider came along');
  // shoot at the dam's face from the river side until a hole goes through
  const d = w.map.dam, water0 = w.water, evs = [];
  for (let k = 0; k < 6 && !d.broken; k++) {
    w.projectiles.push({ kind: 'gurra', X: (d.x1 - 12) * 1024, Y: 205 * 1024, VX: 3 * 1024, VY: -160, owner: -1, age: 20, fuse: -1, rest: false });
    for (let i = 0; i < 40 && w.projectiles.length; i++) { step(w); evs.push(...w.events); }
  }
  assert.equal(d.broken, 1, 'the dam broke');
  assert.equal(w.water, water0 - d.rise, 'the water rose');
  assert.ok(evs.some((e) => e.t === 'dam'));
});

test('villa: the trampoline throws back vättar and shots; the mower nips', () => {
  const w = settle(newMatch(3, { settings: { map: 'villa' } }));
  const tr = w.map.trampoline, u = w.units.find((o) => o.id === w.turn.unit);
  u.X = ((tr.x1 + tr.x2) >> 1) * 1024; u.Y = (tr.y - 60) * 1024; u.air = true; u.VY = 0;
  const evs = [];
  for (let i = 0; i < 80; i++) { step(w); evs.push(...w.events); }
  assert.ok(evs.some((e) => e.t === 'boing'), 'the vätte bounced');
  assert.equal(u.hp, 100, 'no fall damage on the trampoline');
  // a falling shot bounces instead of going off
  const ev2 = [];
  w.projectiles.push({ kind: 'gurra', X: ((tr.x1 + tr.x2) >> 1) * 1024, Y: (tr.y - 30) * 1024, VX: 0, VY: 2000, owner: -1, age: 20, fuse: -1, rest: false });
  for (let i = 0; i < 20; i++) { step(w); ev2.push(...w.events); }
  assert.ok(ev2.some((e) => e.t === 'boing'), 'the shot bounced');
  // the mower moves and nips a vätte in its way
  const mo = w.mower, x0 = mo.x;
  for (let i = 0; i < 60; i++) step(w);
  assert.notEqual(mo.x, x0, 'the mower moves');
  const v = w.units.find((o) => o.id !== u.id && o.alive);
  v.X = (mo.x + mo.dir * 3) * 1024; v.Y = mo.y * 1024; v.air = false; v.VX = 0; v.VY = 0;
  const hp = v.hp, ev3 = [];
  for (let i = 0; i < 40; i++) { step(w); ev3.push(...w.events); }
  assert.ok(ev3.some((e) => e.t === 'mow'), 'nipped');
  assert.ok(v.hp < hp);
});
