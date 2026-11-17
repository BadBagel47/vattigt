// Game rules and tuning values (D-009). Described in plain words in docs/RULES.md;
// keep the two in step when a number changes.
//
// Units: the simulation runs 60 steps a second. Positions and speeds are whole
// numbers in 1/1024 of a pixel ("fp"), so every browser computes the same match.

export const TPS = 60;                 // simulation steps per second
export const FP = 1024;                // fixed-point scale

export const W = 480, H = 270;         // map size in pixels
export const WATER_START = 246;        // water surface, pixel row

export const UNITS_PER_TEAM = 3;
export const HP = 100;

export const TURN_TICKS = 45 * TPS;    // time for a turn
export const RETREAT_TICKS = 3 * TPS;  // time to get away after firing
export const SETTLE_QUIET_TICKS = 40;  // everything must be still this long before the next turn

export const GRAVITY = 160;            // fp per step², about 0.16 px
export const WIND_MAX = 10;            // wind is a whole number from -WIND_MAX to WIND_MAX
export const WIND_ACCEL = 3;           // fp per step² per wind unit, halved (see world.js)

export const WALK_EVERY = 2;           // one pixel every second step: 30 px a second
export const CLIMB = 3;                // highest step a vätte walks up
export const JUMP_VX = 1229;           // 1.2 px per step
export const JUMP_VY = -2253;          // 2.2 px per step upwards
export const FALL_SAFE_VY = 4608;      // landing faster than 4.5 px per step hurts
export const FALL_DAMAGE_PER_PX = 10;  // damage per px/step above the safe speed

export const FLOOD_ROUND = 8;          // from this round the spring flood raises the water
export const FLOOD_PX = 5;             // pixels per turn

export const CLOUD_DAMAGE = 5;         // surströmming cloud, per turn of the vätte's own team
export const CLOUD_RADIUS = 20;
export const CLOUD_TURNS = 6;          // three rounds with two teams

export const WEAPONS = [
  { id: 'gurra', name: 'Kalle Gurra', speed: 9 * FP, wind: true, radius: 16, damage: 50, force: 5 * FP, aim: true, ammo: -1 },
  { id: 'strom', name: 'Surströmming', speed: 7 * FP, wind: false, radius: 8, damage: 15, force: 2 * FP, aim: true, ammo: -1, fuse: 3 * TPS },
  { id: 'dyn', name: 'Dynamit-Alfred', speed: 0, wind: false, radius: 24, damage: 75, force: 6 * FP, aim: false, ammo: 2, fuse: 5 * TPS },
  // Köttbullar: a big one that splits into five small ones where it lands.
  { id: 'bullar', name: 'Köttbullar', speed: 7 * FP, wind: false, radius: 12, damage: 30, force: 3 * FP, aim: true, ammo: 2 },
  // Fallukorv: tap where on the map; five sausage rings fall, bounce and go off on the third bounce.
  { id: 'korv', name: 'Fallukorv', speed: 0, wind: false, radius: 12, damage: 30, force: 3 * FP, aim: false, target: true, ammo: 1, fuse: 6 * TPS },
  // Dalahästen: trots ahead, hops over what it cannot climb; tap again to set it off, or it goes off by itself.
  { id: 'hast', name: 'Dalahästen', speed: 0, wind: false, radius: 20, damage: 60, force: 5 * FP, aim: false, walker: true, ammo: 1, life: 10 * TPS },
  // Älgtestet: runs straight ahead, knocks over whoever is in the way, goes off at the first steep wall.
  { id: 'alg', name: 'Älgtestet', speed: 0, wind: false, radius: 22, damage: 60, force: 6 * FP, aim: false, walker: true, ammo: 1, life: 8 * TPS }
];
WEAPONS.push(
  // Jasså 39: a plane drops five charges in a row where you tap; they drift with the wind.
  { id: 'jas', name: 'Jasså 39', speed: 0, wind: true, radius: 12, damage: 30, force: 3 * FP, aim: false, target: true, ammo: 1 },
  // Prinsesstårtan: rare and enormous.
  { id: 'tarta', name: 'Prinsesstårtan', speed: 6 * FP, wind: false, radius: 40, damage: 100, force: 8 * FP, aim: true, ammo: 1 },
  // Plattpaketet: a wooden plank where you tap, a little crooked (a screw was left over).
  { id: 'platt', name: 'Plattpaketet', speed: 0, wind: false, radius: 0, damage: 0, force: 0, aim: false, target: true, build: true, ammo: 2 },
  // Halmbocken: set out where you stand; it burns for two rounds and singes whoever stands near it.
  { id: 'halm', name: 'Halmbocken', speed: 0, wind: false, radius: 6, damage: 10, force: FP, aim: false, ammo: 1 },
  // Enkel biljett till Borås: tap a vätte; it is gone for a round and comes back wet, with a little less life.
  { id: 'biljett', name: 'Enkel biljett till Borås', speed: 0, wind: false, radius: 0, damage: 0, force: 0, aim: false, target: true, ticket: true, ammo: 1 }
);
export const FIRE_DAMAGE = 10, FIRE_RADIUS = 16, FIRE_TURNS = 4;
export const TICKET_TURNS = 2, TICKET_DAMAGE = 10;
// Crates: one every second round; a post parcel with a weapon or a fika basket with life.
export const CRATE_EVERY = 2, FIKA_HP = 25, HP_MAX = 150;
export const CRATE_BOOM = { id: 'crate', name: 'Låda', wind: false, radius: 10, damage: 20, force: 2 * FP };

// The small meatballs from Köttbullar.
export const MEATBALL = { id: 'ball', name: 'Köttbulle', wind: false, radius: 8, damage: 20, force: 2 * FP };

// The troll in Trollskogen throws one of these back when it is woken at night.
export const TROLLSTONE = { id: 'troll', name: 'Trollsten', wind: false, radius: 14, damage: 40, force: 4 * FP };

export const TEAMS = [
  { name: 'Vettvillingarna', units: ['MÄRTA', 'STINA', 'GÖSTA', 'EBBE', 'AGDA'], color: 0, hat: 'toppig' },
  { name: 'Vättrundan', units: ['ALVA', 'VERA', 'SIXTEN', 'TAGE', 'KNUT'], color: 1, hat: 'tofs' }
];

// Settings for a match (eget spel). Everything that changes the match is here,
// so every browser in an online room builds the same match from the same settings.
export const DEFAULT_SETTINGS = { map: 'midsommar', night: true, units: UNITS_PER_TEAM, turn: 45, flood: FLOOD_ROUND, weapons: ['gurra', 'strom', 'dyn', 'bullar', 'korv', 'hast', 'alg', 'jas', 'tarta', 'platt', 'halm', 'biljett'], crates: true };
export const MAX_UNITS = 5;
