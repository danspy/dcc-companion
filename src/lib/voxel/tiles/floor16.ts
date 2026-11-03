import { Vox, slab } from '../vox.ts';

/* Floor 16's homepage tile. The crawl has not reached it, so it has no page map. */

/* ---- 16. the Agony of Mirrors: a giant empty room with one mirror in it ----
   Drawn from the AI's announcement at 7:87: the sixteenth floor is a giant
   empty room holding one ordinary mirror from a motel. So the room is the
   picture: tall plain walls at the back, the near walls low so the eye gets in,
   a floor of big pale flags with nothing on them, and in the middle of the far
   wall one small framed mirror. The joke is the emptiness, so nothing else is
   drawn. The island under it is ragged and stepped like every other, with a
   loose chunk drifting off. */

const flags = (x: number, y: number) => {
  // big flagstones, four blocks square, each a slightly different stone
  const h = ((x >> 2) * 31 + (y >> 2) * 17) % 5;
  return h === 0 || h === 3 ? 'tile' : 'plaster';
};

export function tile16(): Vox {
  const v = new Vox();
  const X1 = 33, Y1 = 21, H = 10;
  slab(v, 0, 0, X1, Y1, 0, { depth: 8, seed: 161, crust: 'stone', under: ['dirt', 'dirtDark'], top: flags,
    shape: (x, y) => !(x >= X1 - 1 && y >= Y1 - 1) });
  // a step down off the near side, a ledge broken off the left, a chunk drifting off the right
  slab(v, 6, 22, 21, 25, -3, { depth: 5, seed: 164, crust: 'stone', under: ['dirt', 'dirtDark'], top: flags, shape: (x, y) => !(y >= 24 && (x <= 8 || x >= 18)) });
  slab(v, -7, 12, -3, 18, -4, { depth: 5, seed: 162, crust: 'stone', under: ['dirt', 'dirtDark'], top: 'stone' });
  slab(v, 34, 8, 37, 11, -4, { depth: 3, seed: 163, crust: 'stone', under: ['dirt', 'dirtDark'], top: 'stone' });

  /* the back walls: blocks of plaster bigger than the floor's, stained here and there, a stone coping */
  v.chunk = 3;
  const wallMat = (a: number, z: number) => ((Math.floor(a / 3) * 13 + Math.floor(z / 3) * 7) % 5 === 0 ? 'sand' : 'plaster');
  v.box(0, 0, 1, X1, 1, H, (x, _y, z) => wallMat(x, z));
  v.box(0, 2, 1, 1, Y1, H, (_x, y, z) => wallMat(y + 6, z));
  v.chunk = 1;
  v.box(0, 0, H + 1, X1, 1, H + 1, 'stone'); v.box(0, 2, H + 1, 1, Y1, H + 1, 'stone');

  /* posts: square stone pilasters with caps, at the corners and along the walls */
  const post = (x: number, y: number, h: number) => {
    v.chunk = 2; v.box(x, y, 1, x + 1, y + 1, h, 'stone'); v.chunk = 1;
    v.box(x, y, h + 1, x + 1, y + 1, h + 1, 'stoneDark');
  };
  post(0, 0, H + 2); post(X1 - 1, 0, H); post(0, Y1 - 1, H);
  post(10, 0, H); post(22, 0, H); post(0, 10, H);

  /* the near walls: knocked low so the room shows, posts at intervals */
  v.chunk = 2;
  v.box(2, Y1 - 1, 1, X1 - 3, Y1, 2, 'stone');
  v.box(X1 - 1, 2, 1, X1, Y1 - 3, 2, 'stone');
  v.chunk = 1;
  for (const x of [8, 16, 24]) post(x, Y1 - 1, 4);
  for (const y of [8, 14]) post(X1 - 1, y, 4);
  post(X1 - 3, Y1 - 3, 4);
  v.box(2, Y1 - 2, 1, X1 - 3, Y1 - 2, 1, 'stone');           // a kerb inside the low wall, where the corner is cut
  v.box(X1 - 2, 2, 1, X1 - 2, Y1 - 3, 1, 'stone');

  /* the mirror, alone in the middle of the far wall: a brown frame, silver glass, one glint */
  const MX = 15, MZ = 4, MW = 5, MH = 5;
  v.box(MX - 1, 2, MZ - 1, MX + MW, 2, MZ + MH, 'woodDark');
  v.box(MX, 2, MZ, MX + MW - 1, 2, MZ + MH - 1, (x, _y, z) => {
    const d = (x - MX) - (z - MZ);
    return d === -1 || d === 0 && z > MZ + 1 ? 'white' : (x - MX) + (z - MZ) < 3 ? 'metal' : 'rail';
  });
  return v;
}
