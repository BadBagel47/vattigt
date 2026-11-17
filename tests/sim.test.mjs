// Tests for the match simulation: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newMatch, step, fingerprint, activeUnit, px } from '../src/sim/world.js';
import * as R from '../src/sim/rules.js';

const settle = (w, max = 2000) => { for (let i = 0; i < max && w.turn.phase !== 'aim' && w.turn.phase !== 'over'; i++) step(w); return w; };

// A scripted match: walk, aim, fire, jump, every weapon, many turns.
function scripted(seed, turns = 14) {
  const w = settle(newMatch(seed));
  const events = [];
  for (let n = 0; n < turns && w.turn.phase !== 'over'; n++) {
    const k = w.turn.number;
    const weapon = k % 3, angle = (k * 37) % 180, power = 40 + (k * 13) % 60;
    for (let i = 0; i < 30; i++) step(w, { walk: k % 2 ? 1 : -1 });
    step(w, { jump: true });
    for (let i = 0; i < 40; i++) step(w);
    step(w, { weapon });
    step(w, { aim: { angle, power } });
    step(w, { fire: { angle, power } });
    for (let i = 0; i < 4000 && w.turn.number === k && w.turn.phase !== 'over'; i++) { step(w); events.push(...w.events); }
  }
  return { w, events };
}

test('the same seed and inputs give the same match', () => {
  const a = scripted(12345), b = scripted(12345);
  assert.equal(fingerprint(a.w), fingerprint(b.w));
  assert.equal(a.w.tick, b.w.tick);
  assert.ok(a.events.some((e) => e.t === 'boom'), 'something exploded');
});

test('a different seed gives a different match', () => {
  assert.notEqual(fingerprint(scripted(1, 4).w), fingerprint(scripted(2, 4).w));
});

test('the match starts with team 0 aiming and all vättar on the ground', () => {
  const w = settle(newMatch(7));
  assert.equal(w.turn.phase, 'aim');
  assert.equal(w.turn.team, 0);
  assert.equal(w.units.length, 2 * R.UNITS_PER_TEAM);
  assert.ok(w.units.every((u) => u.alive && !u.air && u.hp === R.HP));
});

test('Kalle Gurra fired at the ground makes a crater and hurts the shooter standing next to it', () => {
  const w = settle(newMatch(7));
  const u = activeUnit(w), solidBefore = w.map.solid.reduce((a, v) => a + v, 0);
  step(w, { weapon: 0 });
  step(w, { fire: { angle: 270, power: 30 } });
  for (let i = 0; i < 200; i++) step(w);
  assert.ok(w.map.solid.reduce((a, v) => a + v, 0) < solidBefore, 'terrain was removed');
  assert.ok(u.hp < R.HP, 'the shooter got hurt');
});

test('a vätte that falls in the water is out', () => {
  const w = settle(newMatch(7));
  const u = activeUnit(w);
  u.X = 5 * R.FP; u.Y = 200 * R.FP; u.air = true; u.VX = -2000;
  for (let i = 0; i < 300; i++) step(w);
  assert.equal(u.alive, false);
});

test('the turn passes to the other team after firing', () => {
  const w = settle(newMatch(9));
  step(w, { fire: { angle: 80, power: 50 } });
  settle(w, 3000);
  assert.equal(w.turn.team, 1);
});

test('the turn passes when the time runs out', () => {
  const w = settle(newMatch(9));
  for (let i = 0; i < R.TURN_TICKS + 200; i++) step(w);
  assert.equal(w.turn.team, 1);
});

test('dynamite is limited and explodes after its fuse', () => {
  const w = settle(newMatch(5));
  step(w, { weapon: 2 });
  step(w, { fire: true });
  assert.equal(w.teams[0].ammo[2], 1);
  let boom = false;
  for (let i = 0; i < R.WEAPONS[2].fuse + 20; i++) { step(w); if (w.events.some((e) => e.t === 'boom')) boom = true; }
  assert.ok(boom);
});

test('surströmming leaves a cloud that stings', () => {
  const w = settle(newMatch(5));
  const target = w.units.find((u) => u.team === 1);
  w.clouds.push({ X: target.X, Y: target.Y - 5 * R.FP, turns: R.CLOUD_TURNS });
  w.wind = 0;
  const hp = target.hp;
  for (let i = 0; i < R.TURN_TICKS + 200; i++) { w.wind = 0; step(w); }
  assert.equal(target.hp, hp - R.CLOUD_DAMAGE);
});

test('the last team standing wins', () => {
  const w = settle(newMatch(3));
  for (const u of w.units) if (u.team === 1) { u.alive = false; u.hp = 0; }
  step(w, { fire: { angle: 90, power: 10 } });
  settle(w, 3000);
  assert.equal(w.turn.phase, 'over');
  assert.equal(w.winner, 0);
});

test('the simulation uses whole numbers only', () => {
  const { w } = scripted(99, 6);
  for (const u of w.units) for (const k of ['X', 'Y', 'VX', 'VY', 'hp']) assert.ok(Number.isInteger(u[k]), `${k} = ${u[k]}`);
  for (const p of w.projectiles) for (const k of ['X', 'Y', 'VX', 'VY']) assert.ok(Number.isInteger(p[k]));
  assert.ok(Number.isInteger(px(w.units[0].X)));
});

test('a match played with random inputs ends, thanks to the spring flood', () => {
  const w = settle(newMatch(424242));
  let r = 7;
  const rnd = (n) => { r = (Math.imul(r, 1103515245) + 12345) >>> 0; return r % n; };
  for (let i = 0; i < 60 * 60 * 60 && w.turn.phase !== 'over'; i++) {
    const inp = {};
    if (rnd(4) === 0) inp.walk = rnd(2) ? 1 : -1;
    if (rnd(200) === 0) inp.jump = true;
    if (rnd(300) === 0) inp.weapon = rnd(3);
    if (rnd(240) === 0) inp.fire = { angle: rnd(360), power: 20 + rnd(80) };
    step(w, inp);
  }
  assert.equal(w.turn.phase, 'over');
  assert.ok(w.turn.round >= 2);
});
