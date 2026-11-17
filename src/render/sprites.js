// Pixel sprites. One letter per pixel; '.' is see-through.
export const VATTE = ['....L....', '....LL...', '...LLLl..', '..LLLLLl.', '.LLLLLLLl', '..SSSSS..', '..SSeSe..', '..SSSNN..', '..WWWWW..', '.gGWWWGG.', '.gGGGGGG.', '..B...B..'];

// Weapon icons, in the order of WEAPONS in rules.js.
export const ICON_ROWS = [
  ['.......ooO', '......ooO.', '.....ooo..', '....ooo...', '...ooo....', '..ooow....', '.ooo.w....', 'ooo.......', 'oo........'],
  ['..g...g...', '...g...g..', '..yyyyyy..', '.yYYYYYYy.', '.rrrrrrrr.', '.rwwrrwwr.', '.rrrrrrrr.', '.yyyyyyyy.', '..yyyyyy..'],
  ['.......s..', '......f...', '.....f....', '...rrrr...', '...rrrr...', '...wwww...', '...rrrr...', '...rrrr...', '...rrrr...'],
  ['..........', '...bb.....', '..bBbb....', '..bbbb.bb.', '...bb.bBbb', '.bb...bbbb', 'bBbb...bb.', 'bbbb......', '.bb.......'],
  ['...rrrr...', '..rRRRRr..', '.rR....rr.', '.rR.....r.', '.rr.....r.', '.rr....rr.', '..rrrrrr..', '...rrrr...', '..........'],
  ['.......rr.', '......rrrr', '......rr..', '.rrrrrrr..', '.rwbrrgr..', '.rrrrrrr..', '.rr...rr..', '.rr...rr..', '.rr...rr..'],
  ['a..a..a..a', 'aa.a..a.aa', '.aaa..aaa.', '...bbbb...', '..bbbbbb..', '..bebbeb..', '...bbbb...', '...bnnb...', '....bb....'],
  ['....g.....', '...ggg....', 'g..ggg..g.', 'ggggggggg.', '...ggg....', '...ggg....', '..ggggg...', '....g.....', '..........'],
  ['....r.....', '...www....', '..ggggg...', '.ggGGGgg..', '.ggggggg..', '.ppppppp..', '.yyyyyyy..', '.ppppppp..', '..........'],
  ['..........', '.bbbbbbbb.', '.bBBBBBBb.', '.bbbbbbbb.', '..........', 'bbbbbbbbbb', 'bBBBBBBBBb', 'bbbbbbbbbb', '..........'],
  ['......yy..', '.....yyyy.', 'yyy..yy...', 'yyyyyyy...', 'yyyyyyy...', 'yry.yyy...', '.y...y....', '.y...y....', '.y...y....'],
  ['..........', 'tttttttttt', 'tTTTTTTTTt', 'tT.rrr..Tt', 'tT.rrr..Tt', 'tTTTTTTTTt', 'tttttttttt', '..........', '..........']
];
export const HORSE = ['......rr.', '.....rrrr', '.....rr..', 'rrrrrrr..', 'rwbrrgr..', 'rrrrrrr..', 'rr...rr..', 'rr...rr..'];
export const MOOSE = [['.........a.a', '.........aa.', '........bbb.', 'bbbbbbbbbbbn', 'bbbbbbbbbbb.', '.bbbbbbbbb..', '.b.b...b.b..', '.b.b...b.b..'], ['.........a.a', '.........aa.', '........bbb.', 'bbbbbbbbbbbn', 'bbbbbbbbbbb.', '.bbbbbbbbb..', '..b.b..b.b..', '.b...b.b...b']];
export const ICON_PAL = [
  { o: 0x8a9d55, O: 0x2a3020, w: 0xb07a4a },
  { y: 0xd8c060, Y: 0xf4e8a0, r: 0xc8382e, w: 0xffffff, g: 0x9bd45a },
  { r: 0xd8442a, w: 0xf4e8c0, f: 0xb0a080, s: 0xffe38a },
  { b: 0x9a6038, B: 0xd09a68 },
  { r: 0x8a3a2a, R: 0xc8604a },
  { r: 0xe5533d, w: 0xffffff, b: 0x4fa3ff, g: 0x9bd45a },
  { a: 0xd8c8a0, b: 0x6a4430, e: 0x1a1a1a, n: 0x3a2418 },
  { g: 0x9aa0aa },
  { r: 0xd8382a, w: 0xffffff, g: 0x8fd06a, G: 0xb6e88a, p: 0xf4c2d0, y: 0xffe8a0 },
  { b: 0x9a6a46, B: 0xc8925e },
  { y: 0xe8c860, r: 0xd8382a },
  { t: 0x4fa3ff, T: 0xd8e8ff, r: 0xd8382a }
];
