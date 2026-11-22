// Vehicles: build car meshes, traffic AI, player driving, theft, garage upgrades.
import * as THREE from 'three';
import { CAR_TYPES, TUNE } from './config.js';
import { mulberry32, range, pick } from './random.js';

function buildCarMesh(type, colorHex, isPolice) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: colorHex });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x181c22 });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x2a4a5a, emissive: 0x0a2a3a });
  const sizes = type === 'bike' ? { w: 1.0, l: 3.2, h: 0.9, cabW: 0.7, cabL: 1.2 } :
                type === 'van' ? { w: 2.4, l: 6.4, h: 2.2, cabW: 2.2, cabL: 4.6 } :
                { w: 2.1, l: 4.8, h: 1.0, cabW: 1.8, cabL: 2.4 };
  const body = new THREE.Mesh(new THREE.BoxGeometry(sizes.w, sizes.h, sizes.l), bodyMat);
  body.position.y = 0.55; g.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(sizes.cabW, sizes.h * 0.75, sizes.cabL), glassMat);
  cab.position.set(0, sizes.h + sizes.h * 0.32, type === 'van' ? 0.6 : -0.3); g.add(cab);
  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelPos = type === 'bike'
    ? [[0, 0.42, 1.2], [0, 0.42, -1.2]]
    : [[-sizes.w / 2, 0.42, sizes.l / 2 - 0.8], [sizes.w / 2, 0.42, sizes.l / 2 - 0.8],
       [-sizes.w / 2, 0.42, -sizes.l / 2 + 0.8], [sizes.w / 2, 0.42, -sizes.l / 2 + 0.8]];
  for (const [x, y, z] of wheelPos) {
    const w = new THREE.Mesh(wheelGeo, darkMat);
    w.position.set(x, y, z); g.add(w);
  }
  // Headlights + taillights
  const hlMat = new THREE.MeshLambertMaterial({ color: 0xfff8d0, emissive: 0xffeeb0, emissiveIntensity: 1.2 });
  const tlMat = new THREE.MeshLambertMaterial({ color: 0xff2211, emissive: 0xaa1100, emissiveIntensity: 1 });
  for (const sx of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.15), hlMat);
    hl.position.set(sx * (sizes.w / 2 - 0.35), 0.7, sizes.l / 2); g.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.15), tlMat);
    tl.position.set(sx * (sizes.w / 2 - 0.35), 0.7, -sizes.l / 2); g.add(tl);
  }
  let lightBar = null;
  if (isPolice) {
    const barMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 0.5), barMat);
    bar.position.set(0, sizes.h + sizes.h * 0.75 + 0.1, -0.3); g.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.5),
      new THREE.MeshLambertMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2 }));
    red.position.set(-0.35, sizes.h + sizes.h * 0.75 + 0.1, -0.3); g.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x0044ff, emissive: 0x0044ff, emissiveIntensity: 2 }));
    blue.position.set(0.35, sizes.h + sizes.h * 0.75 + 0.1, -0.3); g.add(blue);
    lightBar = { red, blue };
  }
  return { group: g, lightBar, sizes };
}

export function createVehicles(scene, city) {
  const rng = mulberry32(4242);
  const cars = [];       // traffic + police + player cars
  const traffic = [];
  const player = { car: null };

  function addCar(type, x, z, heading, opts = {}) {
    const color = opts.color ?? pick(rng, [0x8a2f2f, 0x2f4a8a, 0xd8d8d8, 0x2a2a2a, 0x8a6a2a, 0x3a7a5a]);
    const { group, lightBar, sizes } = buildCarMesh(type, opts.isPolice ? 0xf0f0f0 : color, !!opts.isPolice);
    group.position.set(x, 0, z);
    group.rotation.y = heading;
    scene.add(group);
    const car = {
      type, mesh: group, lightBar, sizes,
      x, z, heading, speed: 0, health: opts.isPolice ? 80 : 100,
      isPolice: !!opts.isPolice, isPlayer: false, isTraffic: !!opts.isTraffic,
      top: CAR_TYPES[type].top, accel: CAR_TYPES[type].accel,
      color, driver: opts.driver || null, id: cars.length,
      nitro: 0, burning: false, dead: false,
    };
    cars.push(car);
    return car;
  }

  // Traffic: 14 cars cruising the road grid
  for (let i = 0; i < TUNE.trafficCars; i++) {
    const p = city.roadPoint(rng);
    const axisX = rng() < 0.5;
    const dir = rng() < 0.5 ? 1 : -1;
    const lane = (rng() < 0.5 ? -2.5 : 2.5);
    const c = addCar(pick(rng, ['sedan', 'sedan', 'van', 'sport']), p.x + (axisX ? lane : 0), p.z + (axisX ? 0 : lane),
      axisX ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI), { isTraffic: true });
    c.traffic = { axisX, dir, speed: range(rng, 8, 14) };
    traffic.push(c);
  }

  // Parked stealable cars near the plaza
  const parked = [];
  const parkSpots = [
    ['sedan', -14, 44, 0.4], ['sport', 16, 44, -0.4], ['van', -30, 20, 1.2], ['bike', 30, 20, -1.2],
    ['sedan', -66, 66, 0.9], ['sport', 66, -66, 2.2], ['bike', -110, -22, 0.2], ['van', 110, 110, 1.6],
  ];
  for (const [type, x, z, h] of parkSpots) {
    const c = addCar(type, x, z, h, {});
    c.parked = true;
    parked.push(c);
  }

  function collideBuildings(x, z, r) {
    for (const b of city.colliders) {
      const dx = Math.max(Math.abs(x - b.x) - b.hx, 0);
      const dz = Math.max(Math.abs(z - b.z) - b.hz, 0);
      if (dx * dx + dz * dz < r * r) return b;
    }
    return null;
  }

  function resolveCar(car, dt) {
    // Move + collide with buildings and world bounds
    const nx = car.x + Math.sin(car.heading) * car.speed * dt;
    const nz = car.z + Math.cos(car.heading) * car.speed * dt;
    const r = Math.max(car.sizes.w, car.sizes.l) / 2;
    const hit = collideBuildings(nx, nz, r * 0.8);
    if (hit) {
      car.speed *= 0.4;
      car.health -= Math.abs(car.speed) * 0.4;
      if (car.isPlayer && Math.abs(car.speed) > 6) G_ref.audio.crash();
      // push out along the smaller penetration axis
      const px = Math.abs(nx - hit.x) - hit.hx;
      const pz = Math.abs(nz - hit.z) - hit.hz;
      if (px > pz) car.x = hit.x + Math.sign(nx - hit.x) * (hit.hx + r * 0.8);
      else car.z = hit.z + Math.sign(nz - hit.z) * (hit.hz + r * 0.8);
    } else {
      car.x = nx; car.z = nz;
    }
    car.x = Math.max(-215, Math.min(215, car.x));
    car.z = Math.max(-215, Math.min(215, car.z));
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
    if (car.health <= 0 && !car.dead) {
      car.dead = true;
      car.burning = true;
    }
  }

  let G_ref = null;
  function bind(G) { G_ref = G; }

  function updateTraffic(dt, G) {
    for (const c of traffic) {
      if (c.dead) continue;
      const t = c.traffic;
      // Flee slightly from the player car when very close
      const dx = c.x - G.player.x, dz = c.z - G.player.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < 100 && G.player.mode === 'car') t.speed = Math.min(t.speed + 8 * dt, 20);
      else t.speed += (12 - t.speed) * 0.2 * dt;
      c.speed = t.speed;
      c.heading = t.axisX ? (t.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (t.dir > 0 ? 0 : Math.PI);
      // At intersections, sometimes turn
      const nearLine = city.lines.some((v) => Math.abs((t.axisX ? c.z : c.x) - v) < 1.2);
      if (nearLine && rng() < dt * 0.25) {
        t.axisX = !t.axisX;
        t.dir = rng() < 0.5 ? 1 : -1;
      }
      resolveCar(c, dt);
    }
  }

  function drivePlayer(dt, G, input) {
    const car = player.car;
    if (!car) return;
    if (G.shotMode) {
      // Staged screenshot: hold the pose, just roll forward slowly.
      car.speed = 30;
      resolveCar(car, dt);
      G.player.x = car.x; G.player.z = car.z; G.player.heading = car.heading;
      G.player.speed = Math.abs(car.speed) * 3.6;
      return;
    }
    const up = G.save.garage.engine;
    const top = car.top * (1 + 0.18 * up);
    const nitro = G.save.garage.nitro > 0 && input.down('ShiftLeft');
    const boost = nitro && car.nitro > 0 ? 1.6 : 1;
    if (nitro && car.nitro > 0) car.nitro = Math.max(0, car.nitro - 30 * dt);
    else car.nitro = Math.min(100, car.nitro + 4 * dt);
    const fwd = input.axis('KeyS', 'KeyW');
    const steer = input.axis('KeyA', 'KeyD');
    car.speed += fwd * car.accel * boost * dt;
    car.speed -= car.speed * 0.9 * dt;
    car.speed = Math.max(-top * 0.45, Math.min(top * boost, car.speed));
    const turn = steer * (car.speed / top) * 2.4 * dt * (car.speed >= 0 ? 1 : -1);
    car.heading += turn;
    // Nitro flame visual: scale exhaust light
    resolveCar(car, dt);
    G.player.x = car.x; G.player.z = car.z; G.player.heading = car.heading;
    G.player.speed = Math.abs(car.speed) * 3.6; // km/h display
    G.audio.engine(Math.min(1, Math.abs(car.speed) / top), true);
    // Burning car explodes
    if (car.burning) {
      car.health -= 20 * dt;
      if (car.health <= -40) {
        G.combat.explode(car.x, car.z);
        car.health = 100; car.burning = false;
        if (car === player.car) { G.player.mode = 'foot'; player.car = null; G.player.health -= 25; }
      }
    }
  }

  function nearestStealable(G) {
    let best = null; let bd = 1e9;
    for (const c of cars) {
      if (c.isPolice || c.isTraffic || c.dead || c.isPlayer) continue;
      const dx = c.x - G.player.x, dz = c.z - G.player.z;
      const d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = c; }
    }
    return bd < 36 ? best : null;
  }

  function stealCar(G, car) {
    car.isPlayer = true;
    car.parked = false;
    player.car = car;
    G.player.mode = 'car';
    G.player.carType = car.type;
    if (car.color === undefined) car.color = 0x8a2f2f;
    return car;
  }

  function exitCar(G) {
    if (!player.car) return;
    const car = player.car;
    car.isPlayer = false;
    player.car = null;
    G.player.mode = 'foot';
    G.player.x = car.x + Math.sin(car.heading + Math.PI / 2) * 3;
    G.player.z = car.z + Math.cos(car.heading + Math.PI / 2) * 3;
    G.audio.engine(0, false);
  }

  function applyGarage(G) {
    if (!player.car) return;
    const car = player.car;
    car.health = Math.min(100 + 40 * G.save.garage.armor, car.health);
    if (G.save.garage.paint > 0) {
      car.mesh.children[0].material.color.setHex(0xd8a018);
    }
  }

  return {
    cars, traffic, parked, player,
    addCar, bind, updateTraffic, drivePlayer, nearestStealable, stealCar, exitCar, applyGarage, resolveCar,
    buildCarMesh,
  };
}
