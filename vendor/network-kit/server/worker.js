// Cloudflare glue: a Worker fetch handler and a Durable Object class built
// around RoomCore. A game's own Worker uses it like this:
//
//   import { createRoomServer } from './vendor/network-kit/server/index.js';
//   const rooms = createRoomServer({ mode: 'host', takeover: true, places: ['captain', 'gunner'] });
//   export const Room = rooms.RoomObject;          // class_name in wrangler config
//   export default { fetch: rooms.fetch };
//
// HTTP API (prefix `basePath`, default /rooms):
//   POST /rooms               create a room → { code, ownerKey, keys }
//   GET  /rooms/CODE          room info → { code, phase, access, participants }
//   GET  /rooms/CODE/ws       WebSocket into the room (first message: hello)

import {
  CLOSE, CODE_LENGTH, CODE_MAX_LENGTH, CODE_MIN_LENGTH, isValidCode, normalizeCode,
} from '../shared/protocol.js';
import { VERSION } from '../version.js';
import { RoomCore, resolveOptions } from './room-core.js';
import { newRoomCode } from './random.js';

const SERVER_OPTIONS = {
  binding: 'ROOMS', // Durable Object namespace binding name in the wrangler config
  basePath: '/rooms',
  codeLength: CODE_LENGTH, // characters in a room code, 4 to 12
  allowedOrigins: '*', // '*' or a list such as ['https://badbagel47.github.io']
  jurisdiction: null, // 'eu' keeps rooms in the EU; may be a function (env) => 'eu' | null
  gate: null, // experimental: async ({ request, env, action }) => true | { open: false, reason }
  fallback: null, // async (request, env, ctx) => Response for other paths
};

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

/** A WebSocket that closes at once with a reason, without waking a room. */
function closedSocket(code, reason) {
  // eslint-disable-next-line no-undef
  const pair = new WebSocketPair();
  pair[1].accept();
  pair[1].send(JSON.stringify({ t: 'denied', code, reason }));
  pair[1].close(code, reason);
  return new Response(null, { status: 101, webSocket: pair[0] });
}

export function createRoomServer(gameOptions = {}) {
  const serverOptions = {};
  const coreOptions = {};
  for (const [key, value] of Object.entries(gameOptions)) {
    if (key in SERVER_OPTIONS) serverOptions[key] = value;
    else coreOptions[key] = value;
  }
  const opts = { ...SERVER_OPTIONS, ...serverOptions };
  if (!Number.isInteger(opts.codeLength) || opts.codeLength < CODE_MIN_LENGTH || opts.codeLength > CODE_MAX_LENGTH) {
    throw new Error(`network-kit: codeLength must be a whole number from ${CODE_MIN_LENGTH} to ${CODE_MAX_LENGTH}`);
  }
  resolveOptions(coreOptions); // fail early on bad options

  function namespace(env) {
    const ns = env[opts.binding];
    if (!ns) throw new Error(`network-kit: missing Durable Object binding "${opts.binding}"`);
    const where = typeof opts.jurisdiction === 'function' ? opts.jurisdiction(env) : opts.jurisdiction;
    return where ? ns.jurisdiction(where) : ns;
  }

  const stub = (env, code) => {
    const ns = namespace(env);
    return ns.get(ns.idFromName(code));
  };

  function corsHeaders(request) {
    const origin = request.headers.get('origin');
    if (!origin) return {};
    if (opts.allowedOrigins === '*' || opts.allowedOrigins.includes(origin)) {
      return {
        'access-control-allow-origin': origin,
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': 'content-type',
        'access-control-max-age': '86400',
        vary: 'origin',
      };
    }
    return null;
  }

  async function makeRoom(env, { settings = {}, open = false } = {}) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const code = newRoomCode(opts.codeLength);
      const res = await stub(env, code).fetch('https://room/create', {
        method: 'POST',
        body: JSON.stringify({ code, settings, open }),
      });
      if (res.status === 409) continue;
      return { status: res.status, body: await res.json() };
    }
    return { status: 503, body: { error: 'no-free-code' } };
  }

  /**
   * For the game's own server code: create a room nobody in it created, e.g.
   * for an invitation two people open (F-029). The first participant who may
   * lead becomes owner and host. Returns { code, keys } (no owner key).
   */
  async function createRoom(env, { settings = {} } = {}) {
    const made = await makeRoom(env, { settings, open: true });
    if (made.status !== 200) throw new Error(`network-kit: could not create a room (${made.body.error ?? made.status})`);
    return made.body;
  }

  async function gate(request, env, action) {
    if (!opts.gate) return { open: true };
    const result = await opts.gate({ request, env, action });
    if (result === true || result?.open) return { open: true };
    return { open: false, reason: result?.reason || 'game-closed' };
  }

  async function fetch(request, env, ctx) {
    const url = new URL(request.url);
    const base = opts.basePath.replace(/\/$/, '');
    if (url.pathname !== base && !url.pathname.startsWith(`${base}/`)) {
      return opts.fallback ? opts.fallback(request, env, ctx) : json({ error: 'not-found' }, 404);
    }
    const cors = corsHeaders(request);
    if (cors === null) return json({ error: 'origin-not-allowed' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const parts = url.pathname.slice(base.length).split('/').filter(Boolean);

    if (parts.length === 0 && request.method === 'POST') {
      const open = await gate(request, env, 'create');
      if (!open.open) return json({ error: open.reason }, 503, cors);
      let body = {};
      try {
        body = (await request.json()) ?? {};
      } catch {
        body = {};
      }
      const made = await makeRoom(env, { settings: body.settings ?? {} });
      return json(made.body, made.status, cors);
    }

    if (parts.length === 0 && request.method === 'GET') {
      return json({ name: 'network-kit', version: VERSION, codeLength: opts.codeLength }, 200, cors);
    }

    const code = normalizeCode(parts[0]);
    // A code of the wrong length cannot be one of this game's rooms: answer without waking a room.
    // A WebSocket gets a proper "Room not found", so the player is told at once.
    if (!isValidCode(code, opts.codeLength)) {
      const ws = parts.length === 2 && parts[1] === 'ws' && request.headers.get('upgrade')?.toLowerCase() === 'websocket';
      return ws ? closedSocket(CLOSE.NOT_FOUND, 'not-found') : json({ error: 'not-found' }, 404, cors);
    }

    if (parts.length === 1 && request.method === 'GET') {
      const res = await stub(env, code).fetch('https://room/info');
      return json(await res.json(), res.status, cors);
    }

    if (parts.length === 2 && parts[1] === 'ws') {
      if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
        return json({ error: 'websocket-expected' }, 426, cors);
      }
      const open = await gate(request, env, 'join');
      if (!open.open) return closedSocket(CLOSE.GAME_CLOSED, open.reason);
      return stub(env, code).fetch('https://room/ws', { headers: { upgrade: 'websocket' } });
    }

    return json({ error: 'not-found' }, 404, cors);
  }

  class RoomObject {
    constructor(ctx, env) {
      this.ctx = ctx;
      this.env = env;
      const attachments = new WeakMap();
      const host = {
        now: () => Date.now(),
        storage: {
          get: (key) => ctx.storage.get(key),
          put: (key, value) => ctx.storage.put(key, value),
          delete: (key) => ctx.storage.delete(key),
          deleteAll: () => ctx.storage.deleteAll(),
        },
        setAlarm: (at) => (at === null ? ctx.storage.deleteAlarm() : ctx.storage.setAlarm(at)),
        // A pending timer keeps the room in memory, so this is only for short waits.
        defer(ms, fn) {
          const timer = setTimeout(() => ctx.waitUntil(Promise.resolve().then(fn).catch(() => {})), ms);
          return () => clearTimeout(timer);
        },
        env,
        sockets: () => ctx.getWebSockets(),
        getAttachment(ws) {
          if (!attachments.has(ws)) attachments.set(ws, ws.deserializeAttachment() ?? null);
          return attachments.get(ws);
        },
        setAttachment(ws, value) {
          attachments.set(ws, value);
          ws.serializeAttachment(value);
        },
        send(ws, text) {
          try {
            ws.send(text);
          } catch {
            // the socket is already closing
          }
        },
        close(ws, code, reason) {
          try {
            ws.close(code, reason);
          } catch {
            // already closed
          }
        },
        lastPingAt(ws) {
          // When the platform last answered this socket's heartbeat for us (F-051).
          return ctx.getWebSocketAutoResponseTimestamp?.(ws)?.getTime() ?? null;
        },
      };
      this.core = new RoomCore(host, coreOptions);
      // Heartbeats are answered without waking the room (no cost).
      // eslint-disable-next-line no-undef
      if (typeof WebSocketRequestResponsePair === 'function') {
        // eslint-disable-next-line no-undef
        ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
      }
      ctx.blockConcurrencyWhile(() => this.core.load());
    }

    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname === '/create') {
        const body = await request.json();
        const result = await this.core.create(body.settings, body.code, { open: body.open === true });
        return json(result, result.error ? 409 : 200);
      }
      if (url.pathname === '/info') {
        const info = this.core.info();
        if (!info) return json({ error: 'not-found' }, 404);
        return json({ ...info, where: await this.where() }, info.closed ? 410 : 200);
      }
      if (url.pathname === '/ws') {
        // eslint-disable-next-line no-undef
        const pair = new WebSocketPair();
        this.ctx.acceptWebSocket(pair[1]);
        this.core.opened(pair[1]);
        return new Response(null, { status: 101, webSocket: pair[0] });
      }
      return json({ error: 'not-found' }, 404);
    }

    /**
     * The data centre this room runs in (e.g. "FRA"), asked once per wake-up
     * from Cloudflare's trace page; null if that fails (D-046). A room stays
     * where it was created: near the first visitor, inside the jurisdiction.
     */
    async where() {
      this.whereAt ??= (async () => {
        try {
          const res = await globalThis.fetch('https://www.cloudflare.com/cdn-cgi/trace', { signal: AbortSignal.timeout(2_000) });
          return /^colo=(\w+)$/m.exec(await res.text())?.[1] ?? null;
        } catch {
          return null;
        }
      })();
      return this.whereAt;
    }

    async webSocketMessage(ws, message) {
      await this.core.message(ws, message);
    }

    async webSocketClose(ws, code, reason) {
      await this.core.closed(ws);
      try {
        ws.close(code === 1005 ? 1000 : code, reason);
      } catch {
        // already closed
      }
    }

    async webSocketError(ws) {
      await this.core.closed(ws);
    }

    async alarm() {
      await this.core.alarm();
    }
  }

  return { fetch, createRoom, RoomObject, options: opts };
}
