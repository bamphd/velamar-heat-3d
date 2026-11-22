// Crew + territory: RICO the driver, NOVA the hacker, and 5-district standing.
import * as THREE from 'three';
import { DISTRICTS } from './config.js';

export function createCrew(scene) {
  const members = [];
  const colors = { rico: 0xffc020, nova: 0x20c8ff };
  const defs = [
    { id: 'rico', name: 'RICO', role: 'DRIVER', ability: 'Getaway car on call (X)', cooldown: 25 },
    { id: 'nova', name: 'NOVA', role: 'HACKER', ability: 'Burns 1 wanted star (C)', cooldown: 40 },
  ];

  for (const d of defs) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.5, 0.5),
      new THREE.MeshLambertMaterial({ color: colors[d.id] }));
    body.position.y = 1.1; g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshLambertMaterial({ color: 0xd8a878 }));
    head.position.y = 2.1; g.add(head);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.08, 6, 20),
      new THREE.MeshBasicMaterial({ color: colors[d.id] }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.15; g.add(ring);
    g.position.set(4, 0, 34);
    scene.add(g);
    members.push({ ...d, mesh: g, x: 4, z: 34, cd: 0, active: false });
  }

  function update(dt, G) {
    for (const m of members) {
      m.cd = Math.max(0, m.cd - dt);
      if (!m.active) continue;
      // Follow the player at a loose offset
      const tx = G.player.x + Math.sin(G.player.heading + (m.id === 'rico' ? 2.4 : -2.4)) * 3;
      const tz = G.player.z + Math.cos(G.player.heading + (m.id === 'rico' ? 2.4 : -2.4)) * 3;
      const dx = tx - m.x, dz = tz - m.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.5) {
        const sp = Math.min(9, d * 2);
        m.x += (dx / d) * sp * dt;
        m.z += (dz / d) * sp * dt;
      }
      m.mesh.position.set(m.x, 0, m.z);
      m.mesh.rotation.y = Math.atan2(G.player.x - m.x, G.player.z - m.z);
      // Crew helps in fights: RICO shoots goons, NOVA spots crates
      if (m.id === 'rico' && G.combat.enemies.length > 0) {
        const e = G.combat.enemies[0];
        if (Math.hypot(e.x - m.x, e.z - m.z) < 30) e.hp -= 8 * dt;
      }
    }
  }

  function callDriver(G) {
    const rico = members[0];
    if (rico.cd > 0) { G.hud.feed(`RICO ON COOLDOWN — ${Math.ceil(rico.cd)}s`, '#ffd24a'); return false; }
    rico.cd = rico.cooldown;
    rico.active = true;
    const p = G.city.roadPoint ? { x: G.player.x + 12, z: G.player.z + 8 } : { x: 0, z: 0 };
    const car = G.vehicles.addCar('sport', p.x, p.z, G.player.heading, {});
    car.parked = true;
    G.hud.feed('RICO: "GETAWAY RIDE INBOUND — GOLD CORSA GT"', '#ffd24a');
    G.audio.pickup();
    return true;
  }

  function hackHeat(G) {
    const nova = members[1];
    if (nova.cd > 0) { G.hud.feed(`NOVA ON COOLDOWN — ${Math.ceil(nova.cd)}s`, '#ffd24a'); return false; }
    if (G.player.wanted === 0) { G.hud.feed('NOVA: "NO HEAT TO BURN"', '#ffd24a'); return false; }
    nova.cd = nova.cooldown;
    nova.active = true;
    G.police.setWanted(G, G.player.wanted - 1, 'NOVA SCRAMBLED THE CAMERAS');
    return true;
  }

  function gainTerritory(G, districtId, amount) {
    const t = G.save.territory;
    t[districtId] = Math.max(0, Math.min(100, (t[districtId] || 0) + amount));
    G.hud.feed(`${DISTRICTS.find((d) => d.id === districtId).name} STANDING ${t[districtId]}%`, '#7aff9a');
  }

  return { members, update, callDriver, hackHeat, gainTerritory };
}
