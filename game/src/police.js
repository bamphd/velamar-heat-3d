// VCPD — 5-star wanted system: dispatch board, PIT maneuvers, spike strips, roadblocks, HELIX-1.
import * as THREE from 'three';
import { TUNE } from './config.js';
import { mulberry32, range } from './random.js';

const DISPATCH_NAMES = ['UNIT 7', 'UNIT 12', 'UNIT 23', 'UNIT 31', 'UNIT 44', 'UNIT 58'];

export function createPolice(scene, city, vehicles) {
  const rng = mulberry32(777);
  const units = [];      // police cars
  const spikes = [];     // spike strips on the road
  const blocks = [];     // roadblock car pairs
  let heli = null;
  let heliLight = null;
  let swat = null;
  let spikeTimer = 0;
  let blockTimer = 0;
  let hideTimer = 0;

  function spawnUnit(G, nearX, nearZ) {
    const p = city.roadPoint(rng);
    const x = nearX !== undefined ? nearX + range(rng, -30, 30) : p.x;
    const z = nearZ !== undefined ? nearZ + range(rng, -30, 30) : p.z;
    const car = vehicles.addCar('sedan', x, z, rng() * Math.PI * 2, { isPolice: true });
    car.unitName = DISPATCH_NAMES[units.length % DISPATCH_NAMES.length];
    car.pitCooldown = 0;
    units.push(car);
    return car;
  }

  function spawnHeli(G) {
    if (heli) return;
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1a2a3a });
    const body = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 6), bodyMat);
    g.add(body);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 7), bodyMat);
    tail.position.set(0, 0.4, -6); g.add(tail);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(12, 0.15, 0.8),
      new THREE.MeshLambertMaterial({ color: 0x222222 }));
    rotor.position.y = 1.4; g.add(rotor);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0xffffcc, emissive: 0xffffaa, emissiveIntensity: 2 }));
    lamp.position.set(0, -1.2, 2); g.add(lamp);
    heliLight = new THREE.SpotLight(0xfff2b0, 300, 90, 0.35, 0.4, 1.2);
    heliLight.position.set(0, -1, 2);
    heliLight.target = new THREE.Object3D();
    g.add(heliLight); g.add(heliLight.target);
    g.position.set(G.player.x + 20, 42, G.player.z - 20);
    scene.add(g);
    heli = { mesh: g, rotor, angle: 0 };
    G.hud.feed('HELIX-1 AIR SUPPORT ON STATION', '#ffd24a');
  }

  function spawnSwat(G) {
    if (swat) return;
    const car = vehicles.addCar('van', G.player.x + 25, G.player.z + 25, 0, { isPolice: true });
    car.mesh.children[0].material.color.setHex(0x1a1a22);
    car.unitName = 'SWAT VAN';
    car.top = 24;
    swat = car;
    units.push(car);
    G.hud.feed('SWAT VAN DEPLOYED — 4 STARS', '#ff5a3c');
  }

  function placeSpikes(G) {
    if (spikes.length > 0) return;
    const px = G.player.x, pz = G.player.z;
    const ahead = 26;
    const hx = Math.sin(G.player.heading), hz = Math.cos(G.player.heading);
    const mat = new THREE.MeshLambertMaterial({ color: 0x333333, emissive: 0x881111, emissiveIntensity: 0.8 });
    for (let i = -1; i <= 1; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 5), mat);
      const x = px + hx * ahead - hz * i * 2.6;
      const z = pz + hz * ahead + hx * i * 2.6;
      s.position.set(x, 0.2, z);
      s.rotation.y = G.player.heading;
      scene.add(s);
      spikes.push({ mesh: s, x, z });
    }
    G.hud.feed('SPIKE STRIP AHEAD — SLOW DOWN OR SWERVE', '#ff5a3c');
  }

  function placeRoadblock(G) {
    if (blocks.length > 0) return;
    const hx = Math.sin(G.player.heading), hz = Math.cos(G.player.heading);
    const bx = G.player.x + hx * 34, bz = G.player.z + hz * 34;
    const pair = [];
    for (const side of [-1, 1]) {
      const car = vehicles.addCar('sedan', bx - hz * side * 4, bz + hx * side * 4,
        G.player.heading + Math.PI / 2, { isPolice: true });
      car.unitName = 'ROADBLOCK';
      car.blocked = true;
      pair.push(car);
      units.push(car);
    }
    blocks.push({ cars: pair, x: bx, z: bz, ttl: 40 });
    G.hud.feed('VCPD ROADBLOCK AHEAD', '#ff5a3c');
  }

  function clearFieldProps() {
    for (const s of spikes) scene.remove(s.mesh);
    spikes.length = 0;
    for (const b of blocks) {
      for (const c of b.cars) {
        c.blocked = false;
        c.dead = true;
        scene.remove(c.mesh);
        const i = units.indexOf(c);
        if (i >= 0) units.splice(i, 1);
      }
    }
    blocks.length = 0;
  }

  function setWanted(G, level, reason) {
    const old = G.player.wanted;
    G.player.wanted = Math.max(0, Math.min(5, level));
    if (G.player.wanted > old) {
      G.audio.wantedUp();
      G.hud.feed(`WANTED LEVEL ${G.player.wanted} — ${reason || 'CRIME REPORTED'}`, '#ff5a3c');
    }
    if (G.player.wanted === 0) clearFieldProps();
  }

  function addHeat(G, n, reason) { setWanted(G, G.player.wanted + n, reason); }

  function update(dt, G, time) {
    const w = G.player.wanted;
    // Target unit count = wanted level (capped)
    const target = Math.min(w, TUNE.policeMax);
    while (units.filter((u) => !u.blocked && !u.dead).length < target) spawnUnit(G, G.player.x, G.player.z);
    // Heli at 3+, SWAT at 4+
    if (w >= TUNE.heliAt && !heli) spawnHeli(G);
    if (w < TUNE.heliAt && heli) {
      scene.remove(heli.mesh); heli = null; heliLight = null;
    }
    if (w >= TUNE.swatAt && !swat) spawnSwat(G);
    if (w < TUNE.swatAt && swat) { swat = null; }
    // Spikes + roadblocks on timers while wanted >= 3
    if (w >= TUNE.spikeAt) {
      spikeTimer -= dt;
      if (spikeTimer <= 0) { placeSpikes(G); spikeTimer = 18; }
      blockTimer -= dt;
      if (blockTimer <= 0) { placeRoadblock(G); blockTimer = 26; }
    }
    // Wanted decays when hidden (on foot, slow, no police near) or after long clean driving
    const nearestCop = units.reduce((m, u) => Math.min(m, Math.hypot(u.x - G.player.x, u.z - G.player.z)), 1e9);
    if (w > 0 && nearestCop > 55 && G.player.speed < 4) {
      hideTimer += dt;
      if (hideTimer > TUNE.wantedDecayHide) { setWanted(G, w - 1, 'HEAT COOLING OFF'); hideTimer = 0; }
    } else hideTimer = 0;

    // Police chase AI
    for (const u of units) {
      if (u.dead || u.blocked) continue;
      u.pitCooldown -= dt;
      const dx = G.player.x - u.x, dz = G.player.z - u.z;
      const dist = Math.hypot(dx, dz);
      const targetHeading = Math.atan2(dx, dz);
      let dh = targetHeading - u.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      u.heading += Math.max(-2.6 * dt, Math.min(2.6 * dt, dh));
      // PIT maneuver: when alongside and close, ram the player's rear quarter
      if (dist < 9 && u.pitCooldown <= 0 && G.player.mode === 'car') {
        u.pitCooldown = 4;
        const pitDir = Math.sign(dh || 1);
        u.heading += pitDir * 0.55;
        u.speed = Math.min(u.top * 1.15, u.speed + 10);
        if (G.vehicles.player.car) {
          G.vehicles.player.car.speed *= 0.55;
          G.vehicles.player.car.heading += pitDir * 0.22;
          G.hud.feed(`${u.unitName} — PIT MANEUVER!`, '#ff5a3c');
          G.audio.crash();
        }
      } else {
        u.speed += ((dist > 60 ? u.top * 1.1 : u.top * 0.92) - u.speed) * 0.5 * dt;
      }
      vehicles.resolveCar(u, dt);
      // Flash light bar
      if (u.lightBar) {
        const on = Math.floor(time * 6) % 2 === 0;
        u.lightBar.red.material.emissiveIntensity = on ? 3 : 0.2;
        u.lightBar.blue.material.emissiveIntensity = on ? 0.2 : 3;
      }
      // Bust: police touches player on foot at low speed
      if (G.player.mode === 'foot' && dist < 2.6 && Math.abs(u.speed) < 6) {
        G.state = 'busted';
      }
    }

    // Spike strips: pop the player car
    if (G.player.mode === 'car' && G.vehicles.player.car) {
      const car = G.vehicles.player.car;
      for (const s of spikes) {
        if (Math.hypot(car.x - s.x, car.z - s.z) < 3.4) {
          car.speed *= 0.25;
          car.health -= 12;
          G.hud.feed('SPIKE STRIP — TIRES SHREDDED', '#ff5a3c');
          G.audio.crash();
          scene.remove(s.mesh);
          spikes.splice(spikes.indexOf(s), 1);
          break;
        }
      }
    }

    // Heli follows + searchlight tracks the player
    if (heli) {
      heli.angle += dt * 0.35;
      const hx = G.player.x + Math.cos(heli.angle) * 24;
      const hz = G.player.z + Math.sin(heli.angle) * 24;
      heli.mesh.position.set(hx, 42 + Math.sin(time * 0.7) * 2, hz);
      heli.mesh.lookAt(G.player.x, 0, G.player.z);
      heli.rotor.rotation.y += dt * 22;
      heliLight.target.position.set(G.player.x - heli.mesh.position.x, -42, G.player.z - heli.mesh.position.z);
      heliLight.target.updateMatrixWorld();
    }

    // Roadblock expiry
    for (const b of blocks) {
      b.ttl -= dt;
      if (b.ttl <= 0) {
        for (const c of b.cars) { c.blocked = false; }
        blocks.splice(blocks.indexOf(b), 1);
      }
    }
  }

  return {
    units, spikes, blocks,
    get heli() { return heli; },
    setWanted, addHeat, update, spawnUnit, clearFieldProps, placeSpikes, placeRoadblock, spawnHeli, spawnSwat,
  };
}
