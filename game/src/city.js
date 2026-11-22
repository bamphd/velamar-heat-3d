// VELAMAR — procedural tropical island city: sea, beach, roads, buildings, palms, marina.
import * as THREE from 'three';
import { WORLD } from './config.js';
import { mulberry32, range, rangeInt } from './random.js';

function windowTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#20242c'; g.fillRect(0, 0, 64, 128);
  for (let y = 6; y < 122; y += 10) {
    for (let x = 5; x < 58; x += 9) {
      const lit = Math.random() < 0.42;
      g.fillStyle = lit ? (Math.random() < 0.7 ? '#ffd88a' : '#9ad8ff') : '#12151c';
      g.fillRect(x, y, 6, 7);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createCity(scene) {
  const rng = mulberry32(WORLD.seed);
  const colliders = [];
  const crates = [];
  const ramps = [];
  const boats = [];
  const lampHeads = [];
  const group = new THREE.Group();
  scene.add(group);

  // Sea, sand ring, city slab
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400),
    new THREE.MeshLambertMaterial({ color: 0x1a6a8a }));
  sea.rotation.x = -Math.PI / 2; sea.position.y = -0.6; group.add(sea);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.half * 2 + 24, WORLD.half * 2 + 24),
    new THREE.MeshLambertMaterial({ color: 0xd8b878 }));
  sand.rotation.x = -Math.PI / 2; sand.position.y = -0.05; group.add(sand);
  const core = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.half * 2 - 30, WORLD.half * 2 - 30),
    new THREE.MeshLambertMaterial({ color: 0x6a6f66 }));
  core.rotation.x = -Math.PI / 2; core.position.y = 0; group.add(core);

  // Roads: grid every 44 units, both axes
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x2c2f36 });
  const lineMat = new THREE.MeshLambertMaterial({ color: 0xc8a83a });
  const lines = [];
  for (let k = 0; k <= 9; k++) lines.push(-198 + k * WORLD.roadGap);
  for (const v of lines) {
    const rx = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.half * 2, WORLD.roadWidth), roadMat);
    rx.rotation.x = -Math.PI / 2; rx.position.set(0, 0.05, v); group.add(rx);
    const rz = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.roadWidth, WORLD.half * 2), roadMat);
    rz.rotation.x = -Math.PI / 2; rz.position.set(v, 0.05, 0); group.add(rz);
    const cx = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.half * 2, 0.35), lineMat);
    cx.rotation.x = -Math.PI / 2; cx.position.set(0, 0.07, v); group.add(cx);
    const cz = new THREE.Mesh(new THREE.PlaneGeometry(0.35, WORLD.half * 2), lineMat);
    cz.rotation.x = -Math.PI / 2; cz.position.set(v, 0.07, 0); group.add(cz);
  }

  // Buildings: one InstancedMesh, per-district heights, window texture
  const winTex = windowTexture();
  const bMat = new THREE.MeshLambertMaterial({
    map: winTex, emissive: 0xffc890, emissiveMap: winTex, emissiveIntensity: 0.55,
  });
  const spots = [];
  for (let i = 0; i < lines.length - 1; i++) {
    for (let j = 0; j < lines.length - 1; j++) {
      const x0 = lines[i] + 7, x1 = lines[i + 1] - 7;
      const z0 = lines[j] + 7, z1 = lines[j + 1] - 7;
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      // Marina plaza stays open; beachfront blocks near the sea stay low
      if (Math.abs(cx) < 24 && Math.abs(cz) < 24) continue;
      const n = rng() < 0.35 ? 2 : 1;
      for (let b = 0; b < n; b++) {
        const w = range(rng, 12, Math.min(24, x1 - x0 - 2));
        const d = range(rng, 12, Math.min(24, z1 - z0 - 2));
        const bx = cx + (n === 2 ? (b === 0 ? -7 : 7) : 0) + range(rng, -2, 2);
        const bz = cz + range(rng, -2, 2);
        let h = range(rng, 9, 22);
        if (bx > 88 && bz < -60) h = range(rng, 26, 62);        // Financial towers
        else if (Math.abs(bx) < 88 && Math.abs(bz) < 60) h = range(rng, 14, 34); // Marina mid-rise
        else if (bx > 88 && bz > 60) h = range(rng, 7, 14);      // Beachfront low
        spots.push({ x: bx, z: bz, w, d, h });
      }
    }
  }
  const bGeo = new THREE.BoxGeometry(1, 1, 1);
  bGeo.translate(0, 0.5, 0);
  const inst = new THREE.InstancedMesh(bGeo, bMat, spots.length);
  const m4 = new THREE.Matrix4();
  const col = new THREE.Color();
  spots.forEach((s, i) => {
    m4.makeScale(s.w, s.h, s.d);
    m4.setPosition(s.x, 0, s.z);
    inst.setMatrixAt(i, m4);
    const tint = 0.75 + rng() * 0.5;
    col.setRGB(tint, tint * (0.9 + rng() * 0.2), tint * (0.85 + rng() * 0.25));
    inst.setColorAt(i, col);
    colliders.push({ x: s.x, z: s.z, hx: s.w / 2, hz: s.d / 2 });
  });
  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  group.add(inst);

  // Landmark: three gold-glass towers in Financial
  const towerMat = new THREE.MeshLambertMaterial({ map: winTex, emissive: 0xffc860, emissiveMap: winTex, emissiveIntensity: 0.7 });
  [[150, -150, 78], [176, -120, 64], [128, -178, 58]].forEach(([x, z, h]) => {
    const t = new THREE.Mesh(new THREE.BoxGeometry(20, h, 20), towerMat);
    t.position.set(x, h / 2, z); group.add(t);
    colliders.push({ x, z, hx: 10, hz: 10 });
  });

  // Palms along the beach ring + plaza
  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 7, 6);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a34 });
  const leafGeo = new THREE.ConeGeometry(3.2, 4.5, 7);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f8a4a });
  const palmSpots = [];
  for (let i = 0; i < 90; i++) {
    const a = rng() * Math.PI * 2;
    const r = range(rng, WORLD.half - 6, WORLD.half + 6);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(x) < WORLD.half - 14 && Math.abs(z) < WORLD.half - 14) continue;
    palmSpots.push([x, z]);
  }
  for (let i = 0; i < 8; i++) palmSpots.push([range(rng, -20, 20), range(rng, -20, 20)]);
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, palmSpots.length);
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, palmSpots.length);
  palmSpots.forEach(([x, z], i) => {
    m4.makeRotationY(rng() * Math.PI * 2);
    m4.setPosition(x, 3.5, z); trunks.setMatrixAt(i, m4);
    m4.setPosition(x, 8.2, z); leaves.setMatrixAt(i, m4);
  });
  trunks.instanceMatrix.needsUpdate = true;
  leaves.instanceMatrix.needsUpdate = true;
  group.add(trunks); group.add(leaves);

  // Street lamps along roads
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.12, 6, 5);
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a3f46 });
  const headGeo = new THREE.SphereGeometry(0.45, 8, 6);
  const headMat = new THREE.MeshLambertMaterial({ color: 0xfff2c0, emissive: 0xffd880, emissiveIntensity: 0.2 });
  const lampPts = [];
  for (const v of lines) {
    for (let k = -4; k <= 4; k += 2) {
      const p = k * WORLD.roadGap;
      lampPts.push([v + 6.5, p]);
      lampPts.push([p, v + 6.5]);
    }
  }
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, lampPts.length);
  const heads = new THREE.InstancedMesh(headGeo, headMat, lampPts.length);
  lampPts.forEach(([x, z], i) => {
    m4.identity(); m4.setPosition(x, 3, z); poles.setMatrixAt(i, m4);
    m4.identity(); m4.setPosition(x, 6.1, z); heads.setMatrixAt(i, m4);
  });
  poles.instanceMatrix.needsUpdate = true;
  heads.instanceMatrix.needsUpdate = true;
  group.add(poles); group.add(heads);
  lampHeads.push(headMat);

  // Marina: docks + boats in the Port (west edge)
  const dockMat = new THREE.MeshLambertMaterial({ color: 0x8a6a42 });
  [[-208, 90, 26, 6], [-208, 130, 26, 6], [-208, 170, 26, 6]].forEach(([x, z, w, d]) => {
    const dock = new THREE.Mesh(new THREE.BoxGeometry(w, 1.2, d), dockMat);
    dock.position.set(x, 0.1, z); group.add(dock);
    colliders.push({ x, z, hx: w / 2, hz: d / 2 });
  });
  const boatMat = new THREE.MeshLambertMaterial({ color: 0xe8e8e8 });
  const boatMat2 = new THREE.MeshLambertMaterial({ color: 0x3a6a8a });
  for (let i = 0; i < 5; i++) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(4, 1.4, 10), i % 2 ? boatMat2 : boatMat);
    hull.position.y = 0.2; boat.add(hull);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.6, 3.4), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    cab.position.set(0, 1.6, -1); boat.add(cab);
    boat.position.set(-196 + i * 2, -0.2, 92 + i * 20);
    boat.rotation.y = 0.15 * (i % 2 ? 1 : -1);
    group.add(boat);
    boats.push(boat);
  }

  // Stunt ramps (4, fixed spots on open blocks)
  const rampMat = new THREE.MeshLambertMaterial({ color: 0xd8622a });
  [[-44, -110, 0.6], [66, 110, -0.5], [110, -22, 1.8], [-110, 66, 2.6]].forEach(([x, z, rot]) => {
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(8, 1, 10), rampMat);
    ramp.position.set(x, 0.8, z);
    ramp.rotation.x = -0.35;
    ramp.rotation.y = rot;
    group.add(ramp);
    ramps.push({ x, z, rot });
  });

  // Contraband crates: glowing boxes on sidewalks
  const crateMat = new THREE.MeshLambertMaterial({ color: 0x8a5a2a, emissive: 0xffb020, emissiveIntensity: 0.9 });
  for (let i = 0; i < 12; i++) {
    let x = 0, z = 0, tries = 0;
    do {
      x = Math.round(range(rng, -190, 190) / WORLD.roadGap) * WORLD.roadGap + 8;
      z = Math.round(range(rng, -190, 190) / WORLD.roadGap) * WORLD.roadGap + 8;
      tries++;
    } while (tries < 20 && crates.some((c) => Math.hypot(c.x - x, c.z - z) < 12));
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), crateMat);
    crate.position.set(x, 0.9, z);
    group.add(crate);
    crates.push({ x, z, mesh: crate, taken: false });
  }

  // Sunset sun + hemisphere + fog (golden hour). Night mode swaps these in main.js.
  const sun = new THREE.DirectionalLight(0xffb060, 2.2);
  sun.position.set(-180, 120, 90);
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0xffd8a0, 0x3a4a5a, 0.9);
  scene.add(hemi);
  scene.background = new THREE.Color(0xff9a4a);
  scene.fog = new THREE.Fog(0xff9a4a, 260, 700);

  return {
    group, colliders, crates, ramps, boats, lampHeads, sun, hemi,
    lines,
    roadPoint(rng2) {
      const v = lines[Math.floor(rng2() * lines.length)];
      const along = range(rng2, -190, 190);
      return rng2() < 0.5 ? { x: along, z: v } : { x: v, z: along };
    },
    spawn: { x: 0, z: 30, heading: Math.PI },
  };
}
