// Game modes (F-032): Kubb.
import test from 'node:test';
import assert from 'node:assert/strict';
import { newMatch, step, matchSettings, fingerprint } from '../src/sim/world.js';
import { createMatch } from '../src/net/match.js';
import { KUBBS } from '../src/sim/rules.js';

const px = (v) => Math.floor(v / 1024);
const settle = (w) => { for (let i = 0; i < 400 && w.turn.phase !== 'aim'; i++) step(w); };

test('settings: classic by default, kubb when asked, anything else is classic', () => {
  assert.equal(matchSettings({}).mode, 'klassiskt');
  assert.equal(matchSettings({ settings: { mode: 'kubb' } }).mode, 'kubb');
  assert.equal(matchSettings({ settings: { mode: 'boll' } }).mode, 'klassiskt');
  assert.equal(newMatch(3, {}).kubbs, undefined);
});

test('kubb: five kubbar per team and a king on every map, standing still', () => {
  for (const map of ['midsommar', 'kobbarna', 'trollskogen', 'gruvan', 'boras', 'fjallet', 'takasarna']) for (const seed of [1, 42]) {
    const w = newMatch(seed, { settings: { map, mode: 'kubb' } });
    for (const ti of [0, 1]) assert.equal(w.kubbs.filter((k) => k.team === ti).length, KUBBS, `${map}: team ${ti}`);
    assert.ok(w.king, `${map}: a king`);
    settle(w);
    assert.equal(w.kubbs.filter((k) => k.down).length, 0, `${map}: no kubb fell by itself`);
    assert.equal(w.king.down, 0, `${map}: the king stands`);
    // each team's kubbar are on its own half
    for (const k of w.kubbs) assert.ok(k.team === 0 ? px(k.X) < 300 : px(k.X) > 180, `${map}: kubb on its side`);
  }
});

function shootAt(w, x, y) {
  // put the blast right on (x, y): the simplest is a dynamite stick dropped there by the active vätte
  const u = w.units.find((o) => o.id === w.turn.unit);
  u.X = x * 1024; u.Y = y * 1024; u.air = true;
  for (let i = 0; i < 30; i++) step(w);
  step(w, { weapon: 2 }); step(w, { fire: true });
  for (let i = 0; i < 1500 && w.turn.phase !== 'aim' && w.turn.phase !== 'over'; i++) step(w);
}

test('kubb: knocking the king first loses, knocking it last wins', () => {
  for (const early of [true, false]) {
    const w = newMatch(5, { settings: { map: 'midsommar', mode: 'kubb', units: 3 } });
    settle(w);
    const shooter = w.turn.team, other = 1 - shooter;
    for (const u of w.units) u.hp = 1000;   // nobody dies here
    if (!early) for (const k of w.kubbs) if (k.team === other) k.down = 1;
    shootAt(w, px(w.king.X) + 1, px(w.king.Y));
    assert.equal(w.king.down, 1, 'the king fell');
    assert.equal(w.turn.phase, 'over');
    assert.equal(w.winner, early ? other : shooter, early ? 'too early: the other team wins' : 'in time: the shooter wins');
  }
});

test('kubb: a blast knocks kubbar over and the count goes down', () => {
  const w = newMatch(5, { settings: { map: 'midsommar', mode: 'kubb' } });
  settle(w);
  for (const u of w.units) u.hp = 1000;
  const k = w.kubbs.find((o) => o.team !== w.turn.team);
  const evs = [];
  const u = w.units.find((o) => o.id === w.turn.unit);
  u.X = k.X + 2048; u.Y = k.Y; u.air = true;
  for (let i = 0; i < 30; i++) step(w);
  step(w, { weapon: 2 }); step(w, { fire: true });
  for (let i = 0; i < 1500 && w.turn.phase !== 'aim'; i++) { step(w); evs.push(...w.events); }
  assert.equal(k.down, 1);
  assert.ok(evs.some((e) => e.t === 'kubb' && e.left < KUBBS));
  assert.notEqual(w.turn.phase, 'over', 'a kubb alone does not end the match');
});

test('kubb: the same inputs give the same match (fingerprints) and the computer finishes it', async () => {
  const { planTurn } = await import('../src/ai/ai.js');
  const opts = { settings: { mode: 'kubb', flood: 6 } };
  const m = createMatch(31, opts), prints = [];
  let lastTurn = -1, plan = [], kubbEvents = 0;
  for (let i = 0; i < 90000 && m.world.turn.phase !== 'over'; i++) {
    const w = m.world;
    if (w.turn.phase === 'aim' && w.turn.number !== lastTurn) { lastTurn = w.turn.number; plan = planTurn(w, 'svar').map(([, ev]) => ev); prints.push(fingerprint(w)); }
    if (plan.length && i % 20 === 0) m.push(plan.shift());
    m.runStep();
    for (const e of w.events) if (e.t === 'kubb' || e.t === 'king') kubbEvents++;
  }
  assert.equal(m.world.turn.phase, 'over');
  assert.ok(kubbEvents > 0, 'the computer knocked something over');
  const { replay } = await import('../src/net/match.js');
  const copy = replay(31, opts, JSON.parse(JSON.stringify(m.log)), m.reach);
  assert.equal(fingerprint(copy.world), fingerprint(m.world), 'a replay ends in the same state');
  assert.equal(copy.world.winner, m.world.winner);
  assert.ok(prints.length > 2);
});

test('boet: a nest per team on its own side; destroying one ends the match', () => {
  for (const map of ['midsommar', 'kobbarna', 'trollskogen', 'gruvan', 'boras', 'fjallet', 'takasarna']) {
    const w = newMatch(4, { settings: { map, mode: 'boet' } });
    assert.equal(w.nests.length, 2, map);
    assert.ok(px(w.nests[0].X) < 240 && px(w.nests[1].X) > 240, `${map}: nests on their sides`);
    settle(w);
    assert.ok(w.nests.every((n) => !n.down && n.hp > 0), `${map}: nests stand`);
  }
  const w = newMatch(4, { settings: { map: 'midsommar', mode: 'boet' } });
  settle(w);
  for (const u of w.units) u.hp = 1000;
  const shooter = w.turn.team, theirs = w.nests.find((n) => n.team !== shooter);
  theirs.hp = 5;
  shootAt(w, px(theirs.X) + 3, px(theirs.Y));
  assert.equal(theirs.down, 1);
  assert.equal(w.turn.phase, 'over');
  assert.equal(w.winner, shooter);
});

test('stången: the team with more vättar at the pole scores each round; five wins', () => {
  const w = newMatch(6, { settings: { map: 'midsommar', mode: 'stangen', flood: 0 } });
  assert.ok(w.pole);
  settle(w);
  // put team 0 at the pole and keep it there; team 1 stays away
  const evs = [];
  for (let turn = 0; turn < 14 && w.turn.phase !== 'over'; turn++) {
    for (const u of w.units) { u.hp = 1000; if (u.team === 0) { u.X = w.pole.x * 1024; u.Y = (w.pole.y - 2) * 1024; u.air = true; } }
    w.turn.timer = 1;
    for (let i = 0; i < 1500 && w.turn.phase !== 'over'; i++) { step(w); evs.push(...w.events); if (w.events.some((e) => e.t === 'turn')) break; }
  }
  assert.ok(evs.some((e) => e.t === 'pole' && e.team === 0));
  assert.equal(w.turn.phase, 'over');
  assert.equal(w.winner, 0);
  assert.equal(w.pole.points[0], 5);
});

test('boet and stången: the computer finishes matches and replays match', async () => {
  const { planTurn } = await import('../src/ai/ai.js');
  const { replay } = await import('../src/net/match.js');
  for (const mode of ['boet', 'stangen']) {
    const opts = { settings: { mode, flood: 6 } };
    const m = createMatch(17, opts);
    let lastTurn = -1, plan = [];
    for (let i = 0; i < 120000 && m.world.turn.phase !== 'over'; i++) {
      const w = m.world;
      if (w.turn.phase === 'aim' && w.turn.number !== lastTurn) { lastTurn = w.turn.number; plan = planTurn(w, 'lagom').map(([, ev]) => ev); }
      if (plan.length && i % 20 === 0) { const ev = plan.shift(); if (ev.replan) plan = planTurn(w, 'lagom', { moved: true }).map(([, e]) => e); else m.push(ev); }
      m.runStep();
    }
    assert.equal(m.world.turn.phase, 'over', mode);
    const copy = replay(17, opts, JSON.parse(JSON.stringify(m.log)), m.reach);
    assert.equal(fingerprint(copy.world), fingerprint(m.world), mode);
  }
});
