// Vättigt's Cloudflare Worker: serves the game's pages (static assets) and runs
// the rooms for online play (network-kit). Requests under /rooms that match no
// file reach the room server.
import { createRoomServer } from '../vendor/network-kit/server/index.js';
import options from '../rooms-options.js';

const rooms = createRoomServer({
  ...options,
  jurisdiction: (env) => env.ROOM_JURISDICTION || null,   // "eu" in production, empty locally
});

export const Room = rooms.RoomObject;
export default { fetch: rooms.fetch };
