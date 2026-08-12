export const TILE = Object.freeze({ FLOOR: 0, WALL: 1, COVER: 2 });

const blueprint = [
  "########################",
  "#P....#......#.........#",
  "#.....#..c...#..c......#",
  "#.....#......#.........#",
  "#............####..#####",
  "#..c.................E.#",
  "#........c.............#",
  "#####..####............#",
  "#..............c.......#",
  "#..E...................#",
  "#.........####.........#",
  "#..c......#..#.....c...#",
  "#.........#..#.........#",
  "#.........####......E..#",
  "########################",
];

/** A deliberately compact, three-lane combat bowl with sightline breaks. */
export function createCombatArena() {
  const enemySpawns = [];
  let playerSpawn = null;
  const tiles = blueprint.map((row, z) => [...row].map((symbol, x) => {
    if (symbol === "P") playerSpawn = { x: x + 0.5, z: z + 0.5, yaw: 0 };
    if (symbol === "E") enemySpawns.push({ x: x + 0.5, z: z + 0.5 });
    if (symbol === "#") return TILE.WALL;
    if (symbol === "c") return TILE.COVER;
    return TILE.FLOOR;
  }));

  return Object.freeze({
    name: "Blacksite Relay",
    width: tiles[0].length,
    height: tiles.length,
    tiles,
    playerSpawn,
    enemySpawns,
    extraction: { x: 21.5, z: 2.5, radius: 1.25 },
    objective: "Clear the relay guards and reach extraction.",
  });
}

export function tileAt(arena, x, z) {
  const column = Math.floor(x);
  const row = Math.floor(z);
  if (row < 0 || row >= arena.height || column < 0 || column >= arena.width) return TILE.WALL;
  return arena.tiles[row][column];
}

export function isSolid(arena, x, z) {
  return tileAt(arena, x, z) !== TILE.FLOOR;
}

export function canOccupy(arena, x, z, radius = 0.25) {
  return !isSolid(arena, x - radius, z - radius)
    && !isSolid(arena, x + radius, z - radius)
    && !isSolid(arena, x - radius, z + radius)
    && !isSolid(arena, x + radius, z + radius);
}
