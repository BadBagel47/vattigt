// A match driven by an input log. The same code runs it on one phone and online:
//
// - The player's taps become small events: {walk:-1|0|1} (held until changed),
//   {jump:true}, {weapon:i}, {aim:{angle,power}}, {fire:{angle,power}|true}.
// - Whoever runs the match (the phone itself, or the room's host online) records
//   each event at the step it takes effect: [tick, event]. That log, with the
//   seed, is the whole match: anyone can replay it and get the same result.
// - Online, the other browsers get the log in small batches and step only as far
//   as the batches reach while someone is in control; while the match is settling
//   nobody can steer, so they step freely.
import { newMatch, step, fingerprint } from '../sim/world.js';

const CONTROL = new Set(['aim', 'retreat']);

export function createMatch(seed, opts = {}) {
  const world = newMatch(seed, opts);
  const log = [];                 // [tick, event] in order
  const byTick = new Map();       // tick -> [event]
  let walk = 0, turnNo = -1;
  let pending = [];               // events waiting for the next step (runner only)
  let reach = 0;                  // runner: steps covered by the log so far; others: as received
  const prints = new Map();       // tick -> fingerprint at the start of each turn

  function inputFor(evs) {
    if (world.turn.number !== turnNo) { turnNo = world.turn.number; walk = 0; }
    const inp = {};
    for (const e of evs) { if ('walk' in e) walk = e.walk; else Object.assign(inp, e); }
    if (walk) inp.walk = walk;
    return inp;
  }
  function stepWith(evs) {
    step(world, inputFor(evs));
    if (world.events.some((e) => e.t === 'turn')) prints.set(world.tick, fingerprint(world));
  }
  const inControl = () => CONTROL.has(world.turn.phase);

  return {
    world, log, prints,
    get reach() { return reach; },
    inControl,

    // Runner (local play, or the online host): queue an event for the next step.
    // Events outside a player's control are dropped, so every browser sees the same log.
    push(ev) { if (inControl()) pending.push(ev); },
    // Runner: take one step with the queued events, recording them.
    runStep() {
      const t = world.tick, evs = inControl() ? pending : [];
      pending = [];
      for (const e of evs) { log.push([t, e]); let a = byTick.get(t); if (!a) byTick.set(t, a = []); a.push(e); }
      stepWith(evs);
      reach = world.tick;
    },

    // Others: add a batch from the runner. Returns false if it does not follow on.
    addBatch(to, entries) {
      for (const [t, e] of entries) {
        if (t < reach) continue;               // already have it
        log.push([t, e]); let a = byTick.get(t); if (!a) byTick.set(t, a = []); a.push(e);
      }
      reach = Math.max(reach, to);
      return true;
    },
    // Others: may the next step be taken now?
    canStep() { return !inControl() || world.tick < reach; },
    // Others: take one step from the log.
    logStep() { stepWith(byTick.get(world.tick) || []); },

    // Steps known but not yet taken (others), for catching up.
    behind() { return reach - world.tick; },
  };
}

// Rebuild a match from its seed and log, up to `to` steps.
export function replay(seed, opts, entries, to) {
  const m = createMatch(seed, opts);
  m.addBatch(to, entries);
  while (m.world.tick < to && m.world.turn.phase !== 'over') m.logStep();
  return m;
}
