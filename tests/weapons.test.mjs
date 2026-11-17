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

test('Jasså 39 drops five charges near the tap', () => {
  const { ev } = shoot(31, 'jas', { tx: 300 }, 500);
  const booms = ev.filter((e) => e.t === 'boom');
  assert.ok(booms.length >= 4 && booms.every((b) => Math.abs(b.x - 300) < 120));
});

test('Prinsesstårtan makes a very large crater', () => {
  const { ev } = shoot(32, 'tarta', { angle: 60, power: 55 }, 400);
  assert.ok(ev.some((e) => e.t === 'boom' && e.r === 40));
});

test('Plattpaketet puts a crooked wooden plank where you tap', () => {
  const w = settle(newMatch(33));
  step(w, { weapon: idx('platt') }); step(w, { fire: { tx: 240, ty: 60 } });
  let wood = 0; for (let y = 50; y < 75; y++) for (let x = 220; x < 262; x++) if (w.map.solid[y * R.W + x] && w.map.mat[y * R.W + x] === 3) wood++;
  assert.ok(wood > 60, `${wood} wood pixels`);
});

test('Halmbocken singes the vättar of the team whose turn begins nearby', () => {
  const w = settle(newMatch(34));
  const enemy = w.units.find((u) => u.team === 1);
  w.fires.push({ X: enemy.X, Y: enemy.Y, turns: R.FIRE_TURNS });
  const hp = enemy.hp;
  for (let i = 0; i < R.TURN_TICKS + 300 && w.turn.team === 0; i++) step(w);
  assert.equal(enemy.hp, hp - R.FIRE_DAMAGE);
});

test('Enkel biljett till Borås sends a vätte away for a round; it comes back wet with less life', () => {
  const w = settle(newMatch(35));
  const enemy = w.units.find((u) => u.team === 1), hp = enemy.hp;
  step(w, { weapon: idx('biljett') });
  step(w, { fire: { tx: enemy.X >> 10, ty: (enemy.Y >> 10) - 5 } });
  assert.ok(enemy.away > 0, 'away');
  let back = false;
  for (let i = 0; i < 20000 && !back; i++) { step(w); if (w.events.some((e) => e.t === 'back')) back = true; if (w.turn.phase === 'aim' && w.turn.number < 4) { /* turns run out by themselves */ } }
  assert.ok(back, 'came back');
  assert.ok(enemy.wet > 0, 'wet');
  assert.equal(enemy.hp, hp - R.TICKET_DAMAGE);
});

test('a crate falls every second round and can be picked up', () => {
  const w = settle(newMatch(36));
  let dropped = null;
  for (let i = 0; i < 40000 && !dropped; i++) { step(w); const e = w.events.find((x) => x.t === 'crate-drop'); if (e) dropped = e; }
  assert.ok(dropped, 'a crate was dropped');
  assert.ok(w.turn.round >= 3);
  for (let i = 0; i < 400; i++) step(w);
  const c = w.crates[0];
  if (c) {
    const u = w.units.find((o) => o.alive && !o.away);
    u.X = c.X; u.Y = c.Y; u.air = true;
    let got = false;
    for (let i = 0; i < 10; i++) { step(w); if (w.events.some((e) => e.t === 'crate')) got = true; }
    assert.ok(got, 'picked up');
  }
});

test('Skurhinken: the water runs, washes vättar along and puts out fire', () => {
  const w = settle(newMatch(41));
  const enemy = w.units.find((u) => u.team === 1);
  w.fires.push({ X: enemy.X, Y: enemy.Y, turns: 4 });
  const hp = enemy.hp, x0 = enemy.X;
  step(w, { weapon: idx('hink') }); step(w, { fire: { tx: enemy.X >> 10, ty: 10 } });
  let steam = false;
  for (let i = 0; i < 300; i++) { step(w); if (w.events.some((e) => e.t === 'steam')) steam = true; }
  assert.ok(steam, 'the fire went out');
  assert.equal(w.fires.length, 0);
  assert.ok(enemy.hp < hp, 'the water hurt (or washed the vätte away)');
  assert.ok(enemy.X !== x0 || !enemy.alive, 'washed along');
  assert.ok(w.projectiles.every((p) => p.kind !== 'drop'), 'the water is gone after a while');
});

test('Kräftskivan leaves crayfish that nip whoever walks by', () => {
  const { w } = shoot(42, 'kraft', { angle: 70, power: 40 }, 200);
  assert.equal(w.mines.length, 4);
  const m = w.mines[0], u = w.units.find((o) => o.alive);
  const hp = u.hp;
  u.X = m.X; u.Y = m.Y; u.air = true;
  for (let i = 0; i < 20; i++) step(w);
  assert.ok(u.hp <= hp - R.NIP_DAMAGE, 'nipped');
  assert.ok(w.mines.length < 4, 'a crayfish is used up');
});

test('Snöbollen rolls and leaves a heap of snow', () => {
  const { w, ev } = shoot(43, 'sno', { angle: 30, power: 50 }, 600);
  assert.ok(ev.some((e) => e.t === 'snow' || e.t === 'splash'));
  if (ev.some((e) => e.t === 'snow')) { let snow = 0; for (let i = 0; i < w.map.mat.length; i++) if (w.map.solid[i] && w.map.mat[i] === 4) snow++; assert.ok(snow > 10, `${snow} snow pixels`); }
});

test('Metspöt: hook on, swing, let go; it does not end the turn', () => {
  const w = settle(newMatch(61, { settings: { map: 'gruvan' } }));
  const u = activeUnit(w), n = w.turn.number;
  step(w, { weapon: idx('rope') });
  step(w, { fire: { angle: 70, power: 50 } });
  assert.ok(u.rope, 'hooked to the roof of the tunnel');
  for (let i = 0; i < 40; i++) step(w, { walk: 1 });
  const x1 = u.X;
  for (let i = 0; i < 40; i++) step(w, { walk: -1 });
  assert.notEqual(u.X, x1, 'swinging moves the vätte');
  step(w, { jump: true });
  assert.equal(u.rope, null, 'let go');
  assert.equal(w.turn.phase, 'aim'); assert.equal(w.turn.number, n, 'still the same turn');
});

test('Metspöt misses when nothing is in reach', () => {
  const w = settle(newMatch(62, { settings: { map: 'kobbarna' } }));
  const u = activeUnit(w);
  step(w, { weapon: idx('rope') });
  step(w, { fire: { angle: 90, power: 50 } });
  assert.ok(!u.rope);
  assert.equal(w.turn.phase, 'aim');
});
