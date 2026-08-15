import { canOccupy } from "./arena.mjs";
import { hasLineOfSight } from "./raycaster.mjs";

export const EnemyState = Object.freeze({ PATROL: "patrol", INVESTIGATE: "investigate", ENGAGE: "engage", DEAD: "dead" });

export function createEnemy(spawn, id, waypoints = []) {
  return { id, x: spawn.x, z: spawn.z, yaw: 0, health: 100, state: EnemyState.PATROL,
    waypoints, waypoint: 0, lastKnown: null, awareness: 0, cooldown: 0, shotSequence: 0 };
}

function moveToward(enemy, target, arena, speed, dt) {
  const dx = target.x - enemy.x;
  const dz = target.z - enemy.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 0.05) return true;
  const step = Math.min(distance, speed * dt);
  enemy.yaw = Math.atan2(dz, dx);
  const nextX = enemy.x + dx / distance * step;
  const nextZ = enemy.z + dz / distance * step;
  if (canOccupy(arena, nextX, enemy.z)) enemy.x = nextX;
  if (canOccupy(arena, enemy.x, nextZ)) enemy.z = nextZ;
  return distance < 0.3;
}

/** Fixed-step friendly FSM. Returns combat events; the caller owns damage authority. */
export function updateEnemy(enemy, world, dt) {
  if (enemy.health <= 0) { enemy.state = EnemyState.DEAD; return []; }
  const events = [];
  const player = world.player;
  const distance = Math.hypot(player.x - enemy.x, player.z - enemy.z);
  const angle = Math.abs(Math.atan2(Math.sin(Math.atan2(player.z - enemy.z, player.x - enemy.x) - enemy.yaw), Math.cos(Math.atan2(player.z - enemy.z, player.x - enemy.x) - enemy.yaw)));
  const visible = distance <= (world.visionRange ?? 14) && angle <= (world.visionFov ?? 1.65) / 2
    && hasLineOfSight(world.arena, enemy, player);
  const heard = world.noise && world.noise.age < 1.2 && Math.hypot(world.noise.x - enemy.x, world.noise.z - enemy.z) < world.noise.radius;

  enemy.awareness = Math.max(0, Math.min(1, enemy.awareness + (visible ? dt * 2.5 : -dt * 0.34)));
  if (visible) enemy.lastKnown = { x: player.x, z: player.z };
  if (heard && enemy.state === EnemyState.PATROL) { enemy.lastKnown = { x: world.noise.x, z: world.noise.z }; enemy.state = EnemyState.INVESTIGATE; }
  if (enemy.awareness >= 0.55) enemy.state = EnemyState.ENGAGE;
  if (enemy.state === EnemyState.ENGAGE && !visible && enemy.awareness === 0) enemy.state = EnemyState.INVESTIGATE;

  enemy.cooldown = Math.max(0, enemy.cooldown - dt);
  if (enemy.state === EnemyState.PATROL && enemy.waypoints.length) {
    if (moveToward(enemy, enemy.waypoints[enemy.waypoint], world.arena, 1.35, dt)) enemy.waypoint = (enemy.waypoint + 1) % enemy.waypoints.length;
  } else if (enemy.state === EnemyState.INVESTIGATE && enemy.lastKnown) {
    if (moveToward(enemy, enemy.lastKnown, world.arena, 1.8, dt)) { enemy.state = EnemyState.PATROL; enemy.lastKnown = null; }
  } else if (enemy.state === EnemyState.ENGAGE) {
    enemy.yaw = Math.atan2(player.z - enemy.z, player.x - enemy.x);
    if (visible && distance < 12 && enemy.cooldown === 0) {
      enemy.shotSequence += 1;
      enemy.cooldown = 0.58 + (enemy.shotSequence % 3) * 0.09;
      const hitChance = Math.max(0.18, 0.72 - distance * 0.035);
      events.push({ type: "enemy-shot", enemyId: enemy.id, damage: 9, hitChance, origin: { x: enemy.x, z: enemy.z } });
    } else if ((!visible || distance > 8) && enemy.lastKnown) moveToward(enemy, enemy.lastKnown, world.arena, 2.15, dt);
  }
  return events;
}

export function damageEnemy(enemy, amount) {
  enemy.health = Math.max(0, enemy.health - Math.max(0, amount));
  if (enemy.health === 0) enemy.state = EnemyState.DEAD;
  else { enemy.awareness = 1; enemy.state = EnemyState.ENGAGE; }
  return enemy.state === EnemyState.DEAD;
}
