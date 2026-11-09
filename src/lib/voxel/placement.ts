/* Where everything on a map goes, so nothing collides: the title plate, then each
   numbered marker on the first free spot near what it points at (above and to the
   outside first, so it does not cover the thing it names), then each name beside its
   number, kept inside the picture. A name is only ever shown one at a time, so names
   may cover other numbers but never the edge of the picture. Shared by MapVoxel.astro
   and the iOS art pack, so the app's markers stand where the site's do. */
export interface PlaceScene { width: number; height: number; points: Record<string, [number, number]> }
export interface PlaceCallout { n: number; id: string; label: string }
export interface Placed extends PlaceCallout { tx: number; ty: number; x: number; y: number; lw: number; tl: number; lx: number; ly: number }
export type Box = { x: number; y: number; w: number; h: number };

export function placeCallouts<C extends PlaceCallout>(scene: PlaceScene, callouts: C[], title: string): { titleText: string; titleBox: Box; placed: (C & Placed)[] } {
const W = scene.width, H = scene.height;
const hit = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const inside = (b: Box) => b.x >= 3 && b.y >= 3 && b.x + b.w <= W - 3 && b.y + b.h <= H - 3;
/** Monospace at 7px with the label's tracking: the text is also told this length, so it always fits. */
const CHAR = 3.8;
const titleText = title.toUpperCase();
const titleBox: Box = { x: 6, y: 6, w: Math.ceil(titleText.length * 4.5) + 12, h: 14 };
const NUM = 13, GAP = 2;
const taken: Box[] = [titleBox];
/** Does the leader from (x, y) to the target pass through a marker already placed? */
const crosses = (x: number, y: number, tx: number, ty: number) => {
  for (let i = 1; i < 10; i++) {
    const px = x + ((tx - x) * i) / 10, py = y + ((ty - y) * i) / 10;
    if (taken.slice(1).some(b => px > b.x && px < b.x + b.w && py > b.y && py < b.y + b.h)) return true;
  }
  return false;
};
const OFFSETS: [number, number][] = [];
for (const d of [24, 32, 18, 42, 54]) for (const [dx, dy] of [[1, -0.75], [1, 0], [0.4, -1], [1, 0.75], [0, -1.1], [0.4, 1], [0, 1.1]]) OFFSETS.push([dx * d, dy * d]);
const placed = callouts.filter(c => scene.points[c.id]).map(c => {
  const [tx, ty] = scene.points[c.id];
  const out = tx < W / 2 ? -1 : 1;
  let best: { x: number; y: number; cost: number } | null = null;
  for (const [i, [dx, dy]] of OFFSETS.entries()) for (const side of [out, -out]) {
    const x = Math.round(tx + dx * side), y = Math.round(ty + dy);
    const b = { x: x - NUM / 2 - GAP, y: y - NUM / 2 - GAP, w: NUM + 2 * GAP, h: NUM + 2 * GAP };
    if (!inside(b)) continue;
    const cost = i * 2 + (side === out ? 0 : 1) + taken.filter(t => hit(t, b)).length * 1000 + (crosses(x, y, tx, ty) ? 40 : 0);
    if (!best || cost < best.cost) best = { x, y, cost };
    if (cost < 2) break;
  }
  const { x, y } = best ?? { x: Math.max(10, Math.min(W - 10, tx)), y: Math.max(10, ty - 18) };
  taken.push({ x: x - NUM / 2 - GAP, y: y - NUM / 2 - GAP, w: NUM + 2 * GAP, h: NUM + 2 * GAP });
  return { ...c, tx, ty, x, y };
}).map(c => {
  /* The name: right of its number, else left, else on the row above or below
     — whichever fits inside the picture and clear of the title. */
  const tl = Math.ceil(c.label.length * CHAR), w = tl + 10, h = 13;
  const spots: [number, number][] = [
    [c.x + 9, c.y - 6.5], [c.x - 9 - w, c.y - 6.5],
    [c.x - w / 2, c.y - 22], [c.x - w / 2, c.y + 9],
  ];
  const ok = (lx: number, ly: number) => { const b = { x: lx, y: ly, w, h }; return inside(b) && !hit(b, titleBox); };
  let [lx, ly] = spots.find(([a, b]) => ok(a, b)) ?? spots[0];
  lx = Math.max(3, Math.min(W - 3 - w, lx)); ly = Math.max(3, Math.min(H - 3 - h, ly));
  return { ...c, lw: w, tl, lx, ly };
});
return { titleText, titleBox, placed };
}
