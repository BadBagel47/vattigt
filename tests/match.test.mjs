// The input log: the runner and a follower that gets the log in batches end up identical.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMatch, replay } from '../src/net/match.js';
import { fingerprint } from '../src/sim/world.js';

function play(runner, onStep) {
  let r = 11;
  const rnd = (n) => { r = (Math.imul(r, 1103515245) + 12345) >>> 0; return r % n; };
  for (let i = 0; i < 40000 && runner.world.turn.phase !== 'over'; i++) {
    if (rnd(30) === 0) runner.push({ walk: rnd(3) - 1 });
    if (rnd(250) === 0) runner.push({ jump: true });
    if (rnd(400) === 0) runner.push({ weapon: rnd(3) });
    if (rnd(50) === 0) runner.push({ aim: { angle: rnd(360), power: rnd(100) } });
    if (rnd(300) === 0) runner.push({ fire: { angle: rnd(360), power: 20 + rnd(80) } });
    runner.runStep();
    onStep(i);
  }
}

test('a follower with batches matches the runner step for step', () => {
  const host = createMatch(777), guest = createMatch(777);
  let sent = 0;
  play(host, (i) => {
    if (i % 6 === 5) { guest.addBatch(host.reach, host.log.slice(sent)); sent = host.log.length; }
    while (guest.canStep() && guest.world.tick < host.world.tick - 12) guest.logStep();
  });
  guest.addBatch(host.reach, host.log.slice(sent));
  while (guest.world.tick < host.world.tick && guest.canStep()) guest.logStep();
  assert.equal(guest.world.tick, host.world.tick);
  assert.equal(fingerprint(guest.world), fingerprint(host.world));
  assert.ok(host.log.length > 100, 'the log has inputs');
  for (const [t, fp] of host.prints) assert.equal(guest.prints.get(t), fp);
});

test('a replay of the log rebuilds the same match', () => {
  const host = createMatch(4242);
  play(host, () => {});
  const copy = replay(4242, {}, JSON.parse(JSON.stringify(host.log)), host.reach);
  assert.equal(fingerprint(copy.world), fingerprint(host.world));
});

test('a follower waits for the log while someone is in control', () => {
  const host = createMatch(5), guest = createMatch(5);
  for (let i = 0; i < 400; i++) host.runStep();
  let n = 0;
  while (guest.canStep() && n < 1000) { guest.logStep(); n++; }
  assert.equal(guest.world.turn.phase, 'aim', 'stops at the first turn');
  assert.ok(guest.world.tick < host.world.tick);
});

test('online settings from the room data reach the match', async () => {
  const { optsFrom } = await import('../src/net/online.js').catch(() => ({}));
  if (!optsFrom) return; // the online module needs a browser for the kit; covered in the browser test
  const m = createMatch(9, optsFrom({ map: 'gruvan', mood: 'dag' }));
  assert.equal(m.world.map.id, 'gruvan');
  assert.equal(m.world.settings.night, false);
});

test('the computer opponent plays whole matches without getting stuck', async () => {
  const { planTurn } = await import('../src/ai/ai.js');
  for (const level of ['latt', 'svar']) {
    const m = createMatch(77, { settings: { flood: 4 } });
    let lastTurn = -1, plan = [], hurtOthers = 0;
    for (let i = 0; i < 80000 && m.world.turn.phase !== 'over'; i++) {
      const w = m.world;
      if (w.turn.phase === 'aim' && w.turn.number !== lastTurn) { lastTurn = w.turn.number; plan = planTurn(w, level).map(([d, ev]) => ev); }
      if (plan.length && i % 20 === 0) m.push(plan.shift());
      m.runStep();
      for (const e of w.events) if (e.t === 'damage') hurtOthers++;
    }
    assert.equal(m.world.turn.phase, 'over', `${level}: the match ended`);
    assert.ok(hurtOthers > 3, `${level}: shots hit something`);
  }
});
