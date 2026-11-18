// Speech bubbles in dialect (F-033). Only for show: not part of the match, so it may
// differ between browsers. The line is picked from the event, so everyone sees the same one.
export const DIALECTS = {
  goteborgska: { name: 'Göteborgska', lines: {
    shoot: ['DET HÄR ÄR INGEN VÄTTENSKAP!', 'VÄTT DU VAD? PANG!', 'FETT GÖTT, DET HÄR!', 'HÖRRU, TA EMOT!', 'SPÅRVAGN TILL DIG, DIREKT!'],
    hurt: ['VA I HISINGEN?!', 'ENTE LATTJO!', 'AJ, DET SVED I VÄTTEN!', 'NU BLEV JAG VÄTTSKADAD!', 'DET VAR ENTE SNÄLLT, DET!'],
    turn: ['NÄMEN TJENARE!', 'NU ÄR DET MIN TUR, VÄTT JAG!', 'GÖTT MOS, NU KÖR VI!'],
    win: ['FETT GÖTT!', 'VI VÄTT VAD VI GÖR!', 'DET VAR VÄL ENTE SVÅRT, VÄL?']
  } },
  skanska: { name: 'Skånska', lines: {
    shoot: ['ÅLSÅ, TA DEN DÅ!', 'HÄR KOMMER ÄN, PÅG!', 'NU SKA DU FÅ!', 'GÖR DÄ, BARA GÖR DÄ!'],
    hurt: ['AJJEMEN!', 'DÄ VA MÖG!', 'NÄMEN SÖRRU!', 'HÖRRU, LUGNT!', 'AJ, ÅLSÅ!'],
    turn: ['NU ÄR DÄ MIN TUR!', 'HALLÅ, HÄR ÄR JAG!', 'NU ÅKER VI!'],
    win: ['DÄ VA RÄTT SÅ GOTT!', 'ÅLSÅ, VI VANN!', 'DÄ VA VÄL INTE SÅ SVÅRT!']
  } },
  norrlandska: { name: 'Norrländska', lines: {
    shoot: ['JO.', 'JO JO.', 'JO!'],
    hurt: ['JO...', 'JOJO.', 'JO?!'],
    turn: ['JO.', 'JOO.'],
    win: ['JO!', 'JOO.', 'JO JO JO.']
  } },
  tyst: { name: 'Tyst', lines: null }
};
export const DIALECT_KEYS = Object.keys(DIALECTS);
export const defaultDialect = (i) => (i % 2 === 0 ? 'goteborgska' : 'skanska');

const pickLine = (list, n) => list[((n * 2654435761) >>> 0) % list.length];

// Turns match events into bubbles: { unit, s, age }.
export function speechFrom(evs, w, bubbles) {
  const say = (u, kind, n, chance = 1) => {
    if (!u || !u.alive || u.away) return;
    const tm = w.teams[u.team], d = DIALECTS[tm.dialect] || DIALECTS[defaultDialect(u.team)];
    if (!d.lines) return;
    if (chance < 1 && ((n * 40503) >>> 0) % 100 >= chance * 100) return;
    const old = bubbles.findIndex((b) => b.unit === u.id);
    if (old >= 0) bubbles.splice(old, 1);
    bubbles.push({ unit: u.id, s: pickLine(d.lines[kind], n + u.id), age: 0 });
    if (bubbles.length > 3) bubbles.shift();
  };
  const byId = (id) => w.units.find((o) => o.id === id);
  let hurtOne = false;
  for (const e of evs) {
    if (e.t === 'fire' || e.t === 'cast') say(byId(w.turn.unit), 'shoot', w.tick, .7);
    else if (e.t === 'damage' && !hurtOne && e.n >= 8) { hurtOne = true; say(byId(e.unit), 'hurt', w.tick + e.n, .8); }
    else if (e.t === 'turn') say(byId(e.unit), 'turn', w.tick, .3);
    else if (e.t === 'over' && e.winner >= 0) { const u = w.units.find((o) => o.alive && !o.away && o.team === e.winner); say(u, 'win', w.tick); }
  }
}
