// Combat: weapon wheel (4 tiers), shooting, explosions, health/armor pickups, enemy goons.
import * as THREE from 'three';
import { WEAPONS } from './config.js';
import { mulberry32, range } from './random.js';

export function createCombat(scene, city) {
  const rng = mulberry32(99);
  const bullets = [];
  const enemies = [];
  const pickups = [];
  const booms = [];
  let cooldown = 0;

  const bulletMat = new THREE.MeshBasicMaterial({ color: 0xffe080 });
  const bulletGeo = new THREE.SphereGeometry(0.14, 6, 4);

  function spawnEnemy(G, x, z, hp) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.5, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x8a2f2f }));
    body.position.y = 1.1; g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshLambertMaterial({ color: 0xd8a878 }));
    head.position.y = 2.1; g.add(head);
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.9),
      new THREE.MeshLambertMaterial({ color: 0x222222 }));
    gun.position.set(0.3, 1.4, 0.5); g.add(gun);
    g.position.set(x, 0, z);
    scene.add(g);
    const e = { mesh: g, x, z, hp: hp || 60, speed: range(rng, 3, 5), shootT: range(rng, 1, 2) };
    enemies.push(e);
    return e;
  }

  function spawnPickup(kind, x, z) {
    const color = kind === 'health' ? 0x2aff66 : 0x4aa8ff;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.9 }));
    mesh.position.set(x, 0.8, z);
    scene.add(mesh);
    pickups.push({ kind, x, z, mesh, bob: rng() * 6 });
  }

  function explode(x, z) {
    const light = new THREE.PointLight(0xff8822, 400, 40, 1.5);
    light.position.set(x, 3, z);
    scene.add(light);
    const fire = new THREE.Mesh(new THREE.SphereGeometry(2.2, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffaa22, transparent: true, opacity: 0.95 }));
    fire.position.set(x, 1.5, z);
    scene.add(fire);
    booms.push({ light, fire, ttl: 0.7 });
  }

  function shoot(G) {
    const w = WEAPONS[G.player.weapon];
    if (cooldown > 0 || G.player.ammo <= 0) return;
    cooldown = w.rate;
    G.player.ammo--;
    G.audio.shoot();
    const ox = G.player.x, oz = G.player.z;
    const dir = G.player.heading + (Math.random() - 0.5) * w.spread * 2;
    const dx = Math.sin(dir), dz = Math.cos(dir);
    // Muzzle flash + tracer
    const b = new THREE.Mesh(bulletGeo, bulletMat);
    b.position.set(ox + dx * 1.5, 1.4, oz + dz * 1.5);
    scene.add(b);
    bullets.push({ mesh: b, x: ox + dx * 1.5, z: oz + dz * 1.5, dx, dz, ttl: w.range / 60, damage: w.damage });
    // Crime heat: firing in public
    if (G.player.wanted < 2) G.police.addHeat(G, 1, 'SHOTS FIRED');
  }

  function update(dt, G, time) {
    cooldown -= dt;
    // Bullets fly, hit enemies / cars / buildings
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.dx * 60 * dt;
      b.z += b.dz * 60 * dt;
      b.mesh.position.set(b.x, 1.4, b.z);
      b.ttl -= dt;
      let dead = b.ttl <= 0;
      for (const e of enemies) {
        if (Math.hypot(e.x - b.x, e.z - b.z) < 1.2) {
          e.hp -= b.damage;
          if (e.hp <= 0) {
            explode(e.x, e.z);
            scene.remove(e.mesh);
            enemies.splice(enemies.indexOf(e), 1);
            G.missions.onKill(G);
            G.player.money += 150;
          }
          dead = true;
          break;
        }
      }
      if (!dead) {
        for (const c of G.vehicles.cars) {
          if (c.isPlayer || c.dead) continue;
          if (Math.hypot(c.x - b.x, c.z - b.z) < 2.2) {
            c.health -= b.damage;
            if (c.health <= 0 && !c.dead) { c.dead = true; explode(c.x, c.z); G.audio.explosion(); }
            dead = true;
            break;
          }
        }
      }
      if (dead) { scene.remove(b.mesh); bullets.splice(i, 1); }
    }
    // Enemies advance and shoot back
    for (const e of enemies) {
      const dx = G.player.x - e.x, dz = G.player.z - e.z;
      const d = Math.hypot(dx, dz);
      if (d > 3) {
        e.x += (dx / d) * e.speed * dt;
        e.z += (dz / d) * e.speed * dt;
      }
      e.mesh.position.set(e.x, 0, e.z);
      e.mesh.rotation.y = Math.atan2(dx, dz);
      e.shootT -= dt;
      if (e.shootT <= 0 && d < 45) {
        e.shootT = range(rng, 1.2, 2.4);
        G.player.health -= 6;
        G.audio.shoot();
        if (G.player.health <= 0) G.state = 'dead';
      }
    }
    // Pickups bob + collect
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      p.bob += dt * 3;
      p.mesh.position.y = 0.8 + Math.sin(p.bob) * 0.25;
      p.mesh.rotation.y += dt;
      if (Math.hypot(p.x - G.player.x, p.z - G.player.z) < 2.2) {
        if (p.kind === 'health') G.player.health = Math.min(100, G.player.health + 40);
        else G.player.armor = Math.min(100, G.player.armor + 50);
        G.audio.pickup();
        G.hud.feed(p.kind === 'health' ? '+40 HEALTH' : '+50 ARMOR', '#7aff9a');
        scene.remove(p.mesh);
        pickups.splice(i, 1);
      }
    }
    // Explosions fade
    for (let i = booms.length - 1; i >= 0; i--) {
      const b = booms[i];
      b.ttl -= dt;
      b.fire.scale.setScalar(1 + (0.7 - b.ttl) * 2);
      b.fire.material.opacity = Math.max(0, b.ttl / 0.7);
      b.light.intensity = 400 * Math.max(0, b.ttl / 0.7);
      if (b.ttl <= 0) { scene.remove(b.fire); scene.remove(b.light); booms.splice(i, 1); }
    }
  }

  // Starter pickups scattered around the plaza
  spawnPickup('health', 8, 22);
  spawnPickup('armor', -8, 22);
  spawnPickup('health', 44, -44);
  spawnPickup('armor', -44, -44);

  return { enemies, pickups, spawnEnemy, spawnPickup, explode, shoot, update };
}
