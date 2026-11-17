// The four weapons added in F-023.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newMatch, step, activeUnit, fingerprint } from '../src/sim/world.js';
import * as R from '../src/sim/rules.js';

const settle = (w, max = 3000) => { for (let i = 0; i < max && w.turn.phase !== 'aim' && w.turn.phase !== 'over'; i++) step(w); return w; };
const idx = (id) => R.WEAPONS.findIndex((w) => w.id === id);
function shoot(seed, id, shot, ticks = 900) {
  const w = settle(newMatch(seed));
  step(w, { weapon: idx(id) });
  step(w, { fire: shot });
  const ev = [];
  for (let i = 0; i < ticks; i++) { step(w); ev.push(...w.events); }
  return { w, ev };
}

test('Köttbullar splits into five small ones', () => {
  const { ev } = shoot(21, 'bullar', { angle: 60, power: 60 });
  assert.ok(ev.filter((e) => e.t === 'boom').length >= 4, 'the big one and several small ones went off');
});

test('Fallukorv drops five rings where you tap, which go off after bouncing', () => {
  const { w, ev } = shoot(22, 'korv', { tx: 330 }, 600);
  const booms = ev.filter((e) => e.t === 'boom');
  assert.ok(booms.length >= 3, `${booms.length} went off`);
  assert.ok(booms.every((b) => Math.abs(b.x - 330) < 90), 'near the target');
  assert.equal(w.teams[0].ammo[idx('korv')], 0, 'one per match');
});

test('Dalahästen walks and goes off when tapped again', () => {
  const w = settle(newMatch(23));
  const u = activeUnit(w), x0 = u.X;
  step(w, { weapon: idx('hast') }); step(w, { fire: true });
  for (let i = 0; i < 60; i++) step(w);
  const horse = w.projectiles.find((p) => p.kind === 'hast');
  assert.ok(horse && horse.X !== x0, 'the horse has moved');
  let boom = false;
  step(w, { fire: true });
  if (w.events.some((e) => e.t === 'boom')) boom = true;
  for (let i = 0; i < 5; i++) { step(w); if (w.events.some((e) => e.t === 'boom')) boom = true; }
  assert.ok(boom, 'it went off on the second tap');
});

test('Älgtestet runs and goes off by itself', () => {
  const { ev } = shoot(24, 'alg', true, R.WEAPONS[idx('alg')].life + 30);
  assert.ok(ev.some((e) => e.t === 'boom' || e.t === 'splash'));
});

test('the new weapons keep the match the same in every browser', () => {
  const run = () => { const r = shoot(25, 'korv', { tx: 200 }, 300); step(r.w, { weapon: idx('bullar') }); return fingerprint(r.w); };
  assert.equal(run(), run());
});
