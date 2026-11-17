// Online play through network-kit (D-011, F-015).
//
// The room's host runs the match: it steps in real time, records the active
// player's inputs in the log and sends the log on in batches about ten times a
// second. Everyone else steps the same match from the log, a moment behind.
// A fingerprint of the match at the start of each turn lets a browser notice if
// it has gone wrong; it then asks the host for the whole log and replays it.
import { NetworkRoom } from '../../vendor/network-kit/client/index.js';
import { createMatch, replay } from './match.js';
import { TPS } from '../sim/rules.js';

export const TEAM_PLACES = ['lag1', 'lag2'];
const NIGHT = new Set(['midsommar', 'vinter']);
// The match settings come from the room's shared data, set by the owner in the lobby.
export const optsFrom = (data) => ({ settings: { map: data?.map || 'midsommar', night: data?.mood ? NIGHT.has(data.mood) : true } });
const BATCH_STEPS = 6;            // a batch every 0.1 s
const SNAPSHOT_MS = 10000;        // the host's kept copy for a takeover or a reload

export function createOnline(server, hooks = {}) {
  let room = null, match = null, round = 0, seed = 0, ctl = null, mood = 'midsommar', opts = optsFrom(null);
  let sent = 0, sinceBatch = 0, sentPrints = new Set(), lastSnapshot = 0, endedRound = 0;
  const theirPrints = new Map();  // tick -> fingerprint from the host
  let futureBatches = [];
  let acc = 0;

  const emit = (name, ...a) => hooks[name]?.(...a);
  const isHost = () => !!room?.isHost;
  const me = () => room?.me;

  /* ---------- who steers ---------- */
  // The vätte's team, then the players in that team's place in joining order,
  // taking turns. Every host works it out the same way from the match itself.
  function controllerFor() {
    const w = match?.world;
    if (!w || !room?.room) return null;
    const place = TEAM_PLACES[w.turn.team];
    const ids = (room.room.places?.[place] || []).filter((id) => room.player(id)?.status === 'online');
    if (!ids.length) return null;
    const k = Math.floor(Math.max(0, w.turn.number - 1) / w.teams.length);
    return ids[k % ids.length];
  }

  /* ---------- starting and rebuilding a match ---------- */
  function startMatch(r, s, data) {
    round = r; seed = s; mood = data?.mood || mood; opts = optsFrom(data);
    match = createMatch(seed, opts);
    sent = 0; sinceBatch = 0; sentPrints = new Set(); theirPrints.clear(); acc = 0; ctl = null;
    emit('onMatch', match, mood);
    const later = futureBatches.filter((b) => b.r === round); futureBatches = futureBatches.filter((b) => b.r > round);
    for (const b of later) takeBatch(b);
  }
  function rebuild(full) {
    round = full.r; seed = full.seed; mood = full.mood || mood; opts = full.opts || optsFrom({ mood });
    match = replay(seed, opts, full.log, full.to);
    sent = match.log.length; sentPrints = new Set(match.prints.keys()); theirPrints.clear(); ctl = full.ctl ?? null;
    emit('onMatch', match, mood);
  }
  const fullState = () => ({ t: 'full', r: round, seed, mood, opts, to: match.reach, log: match.log, ctl });

  /* ---------- messages ---------- */
  function takeBatch(b) {
    if (!match || b.r !== round) { if (b.r > round) futureBatches.push(b); return; }
    match.addBatch(b.to, b.ev);
    if (b.ctl !== undefined && b.ctl !== ctl) { ctl = b.ctl; emit('onControl', ctl); }
    for (const [tick, fp] of b.fp || []) theirPrints.set(tick, fp);
  }
  function onMessage({ from, data }) {
    if (!data || typeof data !== 'object') return;
    if (isHost()) {
      if (data.t === 'in' && data.r === round && match && from === ctl && data.ev) match.push(data.ev);
      else if (data.t === 'need' && match) room.send(fullState(), { to: [from] });
      return;
    }
    if (data.t === 'b') takeBatch(data);
    else if (data.t === 'full') rebuild(data);
  }

  /* ---------- the room ---------- */
  function wire(r) {
    room = r;
    r.on('room', (rm) => {
      if (rm.data?.mood && rm.data.mood !== mood) { mood = rm.data.mood; emit('onMood', mood); }
      if (rm.phase === 'playing' && rm.round !== round && rm.seed != null) startMatch(rm.round, rm.seed >>> 0, rm.data);
      emit('onRoom', rm);
    });
    r.on('message', onMessage);
    r.on('host', ({ snapshot }) => {
      // This browser runs the match now (from the start, after a reload, or taking over).
      const ph = r.room?.phase;
      if (ph !== 'playing') return;
      if (match && round === r.room.round) {
        while (match.world.tick < match.reach && match.world.turn.phase !== 'over') { match.logStep(); }
      } else if (snapshot && snapshot.r === r.room.round) rebuild(snapshot);
      else startMatch(r.room.round, r.room.seed >>> 0, r.room.data);
      sent = match.log.length; sinceBatch = 0;
      emit('onRole');
    });
    r.on('role', ({ isHost: h }) => { if (!h && match) r.send({ t: 'need' }); emit('onRole'); });
    r.on('peer', ({ event, id }) => {
      if (isHost() && match && (event === 'join' || event === 'back')) r.send(fullState(), { to: [id] });
      if (isHost() && match && event === 'drop' && id === ctl) match.push({ walk: 0 });
      if (!isHost() && event === 'back' && id === r.room?.hostId && match) r.send({ t: 'need' });
      emit('onRoom', r.room);
    });
    r.on('status', (s) => emit('onStatus', s));
    r.on('closed', (info) => emit('onClosed', info));
    r.on('error', (e) => emit('onError', e));
  }

  /* ---------- each frame ---------- */
  function hostFrame(dt, events) {
    acc += dt;
    let n = 0;
    while (acc >= 1 / TPS && n < 8) {
      acc -= 1 / TPS; n++;
      if (match.world.turn.phase === 'over') break;
      match.runStep();
      events.push(...match.world.events);
      const c = controllerFor();
      if (c !== ctl) { ctl = c; emit('onControl', ctl); }
      if (++sinceBatch >= BATCH_STEPS) sendBatch();
    }
    if (acc > 1) acc = 0;
    const now = Date.now();
    if (now - lastSnapshot > SNAPSHOT_MS) { lastSnapshot = now; room.sendSnapshot({ ...fullState(), t: undefined }); }
    if (match.world.turn.phase === 'over' && endedRound !== round && room.phase === 'playing') {
      endedRound = round; sendBatch(); room.sendSnapshot({ ...fullState(), t: undefined }, { force: true });
      setTimeout(() => { if (isHost() && room.phase === 'playing') room.end(); }, 2500);
    }
  }
  function sendBatch() {
    sinceBatch = 0;
    const ev = match.log.slice(sent); sent = match.log.length;
    const fp = [...match.prints].filter(([t]) => !sentPrints.has(t));
    for (const [t] of fp) sentPrints.add(t);
    room.send({ t: 'b', r: round, to: match.reach, ev, ctl, fp: fp.length ? fp : undefined });
  }
  function clientFrame(dt, events) {
    acc += dt;
    const behind = match.behind();
    // Stay about 0.2 s behind the host; catch up a little faster when further back.
    let budget = Math.floor(acc * TPS);
    if (behind > 18) budget += Math.min(6, behind - 12);
    acc -= Math.floor(acc * TPS) / TPS;
    if (acc > 1) acc = 0;
    for (let i = 0; i < budget && match.canStep() && match.world.turn.phase !== 'over'; i++) {
      match.logStep();
      events.push(...match.world.events);
      const mine = match.prints.get(match.world.tick), theirs = theirPrints.get(match.world.tick);
      if (mine && theirs && mine !== theirs) { theirPrints.clear(); room.send({ t: 'need' }); emit('onResync'); break; }
    }
  }

  return {
    get room() { return room; },
    get match() { return match; },
    get ctl() { return ctl; },
    get mood() { return mood; },
    get me() { return me(); },
    isHost,
    myTurn() { return !!room && ctl != null && ctl === me(); },

    async create(name) { const r = await NetworkRoom.create(server, { name }); wire(r); return r; },
    async join(code, key, name) { const r = await NetworkRoom.join(server, { code, key, name }); wire(r); return r; },

    // A tap from this player, while it is their turn.
    input(ev) {
      if (!match || ctl !== me()) return;
      if (isHost()) match.push(ev);
      else room.send({ t: 'in', r: round, ev }, ev.aim ? { latest: 'aim' } : undefined);
    },

    // Advance the match for this frame; returns the match events to draw and play.
    frame(dt) {
      const events = [];
      if (!room || !match || room.phase !== 'playing' && room.phase !== 'ended') return events;
      if (room.room?.paused) { acc = 0; return events; }
      if (isHost()) hostFrame(dt, events); else clientFrame(dt, events);
      return events;
    },
    setMood(m) { mood = m; if (room?.isOwner || isHost()) room.setData({ ...(room.room?.data || {}), mood: m }); },
    setMap(m) { if (room?.isOwner || isHost()) room.setData({ ...(room.room?.data || {}), map: m }); },
    leave() { try { room?.leave(); } catch (e) { /* already gone */ } room = null; match = null; round = 0; },
  };
}
