import { TILE, tileAt } from "./arena.mjs";

/** Grid DDA: exact wall distance, side and texture coordinate without allocations per step. */
export function castRay(arena, originX, originZ, angle, maxDistance = 30) {
  const directionX = Math.cos(angle);
  const directionZ = Math.sin(angle);
  let mapX = Math.floor(originX);
  let mapZ = Math.floor(originZ);
  const deltaX = Math.abs(1 / (directionX || 1e-12));
  const deltaZ = Math.abs(1 / (directionZ || 1e-12));
  const stepX = directionX < 0 ? -1 : 1;
  const stepZ = directionZ < 0 ? -1 : 1;
  let sideX = (directionX < 0 ? originX - mapX : mapX + 1 - originX) * deltaX;
  let sideZ = (directionZ < 0 ? originZ - mapZ : mapZ + 1 - originZ) * deltaZ;
  let side = 0;

  while (Math.min(sideX, sideZ) <= maxDistance) {
    if (sideX < sideZ) { mapX += stepX; sideX += deltaX; side = 0; }
    else { mapZ += stepZ; sideZ += deltaZ; side = 1; }
    const tile = tileAt(arena, mapX, mapZ);
    if (tile !== TILE.FLOOR) {
      const distance = side === 0 ? sideX - deltaX : sideZ - deltaZ;
      const intersection = side === 0 ? originZ + distance * directionZ : originX + distance * directionX;
      return { distance, side, tile, mapX, mapZ, textureX: intersection - Math.floor(intersection) };
    }
  }
  return { distance: maxDistance, side, tile: TILE.FLOOR, mapX, mapZ, textureX: 0 };
}

export function hasLineOfSight(arena, from, to, padding = 0.08) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const distance = Math.hypot(dx, dz);
  if (distance <= padding) return true;
  return castRay(arena, from.x, from.z, Math.atan2(dz, dx), distance).distance >= distance - padding;
}

export function renderWalls(context, arena, camera, options = {}) {
  const width = context.canvas.width;
  const height = context.canvas.height;
  const fov = options.fov ?? Math.PI / 2.8;
  const columns = options.columns ?? width;
  const stripe = width / columns;
  for (let column = 0; column < columns; column += 1) {
    const cameraX = (column + 0.5) / columns - 0.5;
    const offset = cameraX * fov;
    const hit = castRay(arena, camera.x, camera.z, camera.yaw + offset, options.maxDistance ?? 28);
    const corrected = Math.max(0.01, hit.distance * Math.cos(offset));
    const wallHeight = Math.min(height * 1.7, height / corrected);
    const light = Math.max(18, 76 - hit.distance * 2.2 - hit.side * 9);
    const hue = hit.tile === TILE.COVER ? 34 : 205;
    context.fillStyle = `hsl(${hue} 28% ${light}%)`;
    context.fillRect(column * stripe, (height - wallHeight) / 2, Math.ceil(stripe), wallHeight);
  }
}
