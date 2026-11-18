// 3×5 pixel font with Swedish letters (the ring and dots sit two rows above).
const F = { A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111',
  0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110', 4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001110',
  ' ': '000000000000000', ':': '000010000010000', '-': '000000111000000', '.': '000000000000010', '!': '010010010000010', '>': '100010001010100', '+': '000010111010000', '%': '101001010100101', ',': '000000000010100', '?': '110001010000010', "'": '010010000000000' };
const ACC = { 'Å': ['A', '010'], 'Ä': ['A', '101'], 'Ö': ['O', '101'] };

function glyphs(P, str, x, y, c, s) {
  for (const ch0 of str) {
    let ch = ch0, acc = null;
    if (ACC[ch]) { acc = ACC[ch][1]; ch = ACC[ch][0]; }
    const g = F[ch] || F[' '];
    for (let i = 0; i < 15; i++) if (g[i] === '1') P.rect(x + (i % 3) * s, y + Math.floor(i / 3) * s, s, s, c);
    if (acc) for (let i = 0; i < 3; i++) if (acc[i] === '1') P.rect(x + i * s, y - 2 * s, s, s, c);
    x += 4 * s;
  }
}
// Plain letters without the dark outline (for speech bubbles).
export const plain = (P, str, x, y, c) => glyphs(P, str, Math.round(x), Math.round(y), c, 1);
export const textW = (str, s = 1) => [...str].length * 4 * s - s;

// align: 0 left, 1 centre, 2 right. Drawn with a dark outline so it reads on any background.
export function text(P, str, x, y, c, s = 1, align = 0) {
  x = Math.round(x - (align === 1 ? textW(str, s) / 2 : align === 2 ? textW(str, s) : 0));
  y = Math.round(y);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [-1, 1]]) glyphs(P, str, x + dx * s, y + dy * s, 0x0c1022, s);
  glyphs(P, str, x, y, c, s);
}
