// Room settings for network-kit (plain data; also read by the kit's smoke test).
// A host-run room: one player's browser runs the match and passes the active
// player's inputs on to everyone, and every browser computes the same match.
export default {
  mode: 'host',
  takeover: true,            // another player continues if the host's phone drops out
  takeoverMs: 15000,         // turn-based: tolerate a short switch to another app
  places: { lag1: 4, lag2: 4 },
  roles: { player: { seats: 8 }, viewer: { seats: 4 } },
  lateJoin: 'now',           // late joiners watch, and may pick a team for coming turns
  countdownMs: 2000,
  basePath: '/rooms',
};
