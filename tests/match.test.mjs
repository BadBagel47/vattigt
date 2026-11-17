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
