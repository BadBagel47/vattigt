// The maps and match settings.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newMatch, step, fingerprint, matchSettings } from '../src/sim/world.js';
import { makeMap, blast, ROCK, SOIL } from '../src/sim/terrain.js';
import * as R from '../src/sim/rules.js';

const settle = (w, max = 3000) => { for (let i = 0; i < max && w.turn.phase !== 'aim' && w.turn.phase !== 'over'; i++) step(w); return w; };

for (const map of ['midsommar', 'kobbarna', 'trollskogen', 'gruvan']) {
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
  assert.deepEqual(w.teams[0].ammo, [-1, 0, 0]);
  assert.equal(matchSettings({ settings: { units: 99, map: 'mars' } }).units, R.DEFAULT_SETTINGS.units);
});

test('team names and colours from the team builder', () => {
  const w = newMatch(4, { teams: [{ name: 'Tomtenissarna', units: ['Ada'], color: 3 }, {}] });
  assert.equal(w.teams[0].name, 'Tomtenissarna');
  assert.equal(w.teams[0].color, 3);
  assert.equal(w.units[0].name, 'ADA');
  assert.equal(w.teams[1].name, 'Vättrundan');
});
