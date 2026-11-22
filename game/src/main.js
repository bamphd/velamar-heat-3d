// VELAMAR 3D — game loop, state machine, player on foot, camera, time of day, saves.
import * as THREE from 'three';
import { WORLD, TUNE, districtAt, WEAPONS } from './config.js';
import { mulberry32 } from './random.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createCity } from './city.js';
import { createVehicles } from './vehicles.js';
import { createPolice } from './police.js';
import { createCombat } from './combat.js';
import { createCrew } from './crew.js';
import { createActivities } from './activities.js';
import { createMissions, MISSIONS } from './missions.js';
import { createHud } from './hud.js';
import { defaultSave, readSave, writeSave } from './save.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || 1);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 1200);
camera.position.set(0, 60, 120);

const input = createInput();
const audio = createAudio();
const city = createCity(scene);
const vehicles = createVehicles(scene, city);
const police = createPolice(scene, city, vehicles);
const combat = createCombat(scene, city);
const crew = createCrew(scene);
const activities = createActivities(scene, city);
const missions = createMissions();
const hud = createHud();

// Player on-foot mesh
const playerMesh = new THREE.Group();
{
  const shirt = new THREE.MeshLambertMaterial({ color: 0xffd24a });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2a3a5a });
  const skin = new THREE.MeshLambertMaterial({ color: 0xd8a878 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.3, 0.55), shirt);
  torso.position.y = 1.35; playerMesh.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), skin);
  head.position.y = 2.3; playerMesh.add(head);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.38, 1.0, 0.42), pants);
  legL.position.set(-0.25, 0.5, 0); playerMesh.add(legL);
  const legR = legL.clone(); legR.position.x = 0.25; playerMesh.add(legR);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.8),
    new THREE.MeshLambertMaterial({ color: 0x181818 }));
  gun.position.set(0.35, 1.5, 0.4); playerMesh.add(gun);
  playerMesh.userData.legs = [legL, legR];
}
scene.add(playerMesh);

const save = defaultSave();
const player = {
  x: city.spawn.x, z: city.spawn.z, heading: city.spawn.heading, speed: 0,
  health: TUNE.playerHealth, armor: 0, money: save.money, respect: save.respect,
  wanted: 0, weapon: 0, ammo: 120, mode: 'foot', carType: null,
};

const G = {
  scene, camera, renderer, city, vehicles, police, combat, crew, activities, missions, hud, audio, input,
  player, save, missionsList: MISSIONS,
  state: 'title',
  timeOfDay: 'dusk',
  slot: 0,
  get currentDistrict() { return districtAt(player.x, player.z); },
  setTimeOfDay,
  saveGame,
  loadSlot,
  buyUpgrade,
};
vehicles.bind(G);
window.__velamar = G;
window.__shotReady = false;

function setTimeOfDay(mode) {
  G.timeOfDay = mode;
  if (mode === 'night') {
    scene.background.setHex(0x0a1428);
    scene.fog.color.setHex(0x0a1428);
    scene.fog.near = 180; scene.fog.far = 520;
    city.sun.color.setHex(0x8aa8ff); city.sun.intensity = 0.5;
    city.sun.position.set(80, 160, -60);
    city.hemi.color.setHex(0x2a3a5a); city.hemi.intensity = 0.5;
    for (const m of city.lampHeads) m.emissiveIntensity = 2.2;
  } else if (mode === 'day') {
    scene.background.setHex(0x87b8d8);
    scene.fog.color.setHex(0x87b8d8);
    scene.fog.near = 260; scene.fog.far = 700;
    city.sun.color.setHex(0xfff0c0); city.sun.intensity = 2.4;
    city.sun.position.set(120, 220, 60);
    city.hemi.color.setHex(0xbfd8ff); city.hemi.intensity = 1.0;
    for (const m of city.lampHeads) m.emissiveIntensity = 0.1;
  } else { // dusk — golden hour
    scene.background.setHex(0xff9a4a);
    scene.fog.color.setHex(0xff9a4a);
    scene.fog.near = 260; scene.fog.far = 700;
    city.sun.color.setHex(0xffb060); city.sun.intensity = 2.2;
    city.sun.position.set(-180, 120, 90);
    city.hemi.color.setHex(0xffd8a0); city.hemi.intensity = 0.9;
    for (const m of city.lampHeads) m.emissiveIntensity = 0.6;
  }
}

function saveGame() {
  const data = {
    money: player.money, respect: player.respect, missionsDone: save.missionsDone,
    territory: save.territory, garage: save.garage, weaponsOwned: save.weaponsOwned,
    racesWon: save.racesWon, taxisDone: save.taxisDone, cratesFound: save.cratesFound,
    stunts: save.stunts, playSeconds: save.playSeconds,
  };
  writeSave(G.slot, data);
}

function loadSlot(slot) {
  const data = readSave(slot);
  G.slot = slot;
  if (data) {
    Object.assign(save, data);
    player.money = save.money; player.respect = save.respect;
  }
  hud.showOnly(null);
  hud.renderMissions(G);
  hud.setObjective('Free roam — press M for the next mission, R to race, T for taxi');
  G.state = 'playing';
  audio.unlock();
  audio.startRadio();
}

function buyUpgrade(id) {
  const def = { engine: [3000, 6000, 12000], armor: [2500, 5000, 9000], nitro: [4000, 8000], paint: [1500] }[id];
  const lvl = save.garage[id];
  if (lvl >= def.length || player.money < def[lvl]) return;
  player.money -= def[lvl];
  save.garage[id]++;
  vehicles.applyGarage(G);
  audio.pickup();
  hud.renderGarage(G);
  saveGame();
}

function collidePoint(x, z, r) {
  for (const b of city.colliders) {
    const dx = Math.max(Math.abs(x - b.x) - b.hx, 0);
    const dz = Math.max(Math.abs(z - b.z) - b.hz, 0);
    if (dx * dx + dz * dz < r * r) return true;
  }
  return false;
}

function moveOnFoot(dt) {
  const run = input.down('ShiftLeft') ? TUNE.playerRun : TUNE.playerWalk;
  const fwd = input.axis('KeyS', 'KeyW');
  const steer = input.axis('KeyA', 'KeyD');
  player.heading += steer * 2.6 * dt;
  const sp = fwd * run;
  player.speed = sp * 3.6;
  const nx = player.x + Math.sin(player.heading) * sp * dt;
  const nz = player.z + Math.cos(player.heading) * sp * dt;
  if (!collidePoint(nx, player.z, 0.7)) player.x = nx;
  if (!collidePoint(player.x, nz, 0.7)) player.z = nz;
  player.x = Math.max(-215, Math.min(215, player.x));
  player.z = Math.max(-215, Math.min(215, player.z));
  playerMesh.position.set(player.x, 0, player.z);
  playerMesh.rotation.y = player.heading;
  const bob = Math.abs(sp) > 0.5 ? Math.sin(performance.now() * 0.02) * 0.18 : 0;
  playerMesh.userData.legs[0].rotation.x = bob;
  playerMesh.userData.legs[1].rotation.x = -bob;
  audio.engine(0, false);
}

function updateCamera(dt) {
  const isCar = player.mode === 'car';
  const dist = isCar ? 13 : 8;
  const height = isCar ? 5.2 : 3.6;
  const bx = player.x - Math.sin(player.heading) * dist;
  const bz = player.z - Math.cos(player.heading) * dist;
  const k = 1 - Math.pow(0.001, dt);
  camera.position.x += (bx - camera.position.x) * k;
  camera.position.y += (height - camera.position.y) * k;
  camera.position.z += (bz - camera.position.z) * k;
  camera.lookAt(player.x + Math.sin(player.heading) * 6, 1.6, player.z + Math.cos(player.heading) * 6);
}

let titleAngle = 0;
function updateTitleCamera(dt) {
  titleAngle += dt * 0.05;
  camera.position.set(Math.cos(titleAngle) * 130, 55, Math.sin(titleAngle) * 130);
  camera.lookAt(0, 8, 0);
}

function trySteal() {
  const car = vehicles.nearestStealable(G);
  if (!car) return;
  vehicles.stealCar(G, car);
  playerMesh.visible = false;
  police.addHeat(G, 1, 'GRAND THEFT AUTO');
  hud.feed(`STOLE ${car.type.toUpperCase()} — ${car.type === 'sport' ? 'CORSA GT' : 'VELAMAR RIDE'}`, '#ffd24a');
  audio.pickup();
}

function handleKeys() {
  if (input.pressed('Enter') && G.state === 'title') { loadSlot(0); return; }
  if (input.pressed('Escape') || input.pressed('KeyP')) {
    if (G.state === 'playing') { G.state = 'paused'; hud.showOnly('pause'); saveGame(); }
    else if (G.state === 'paused') { G.state = 'playing'; hud.showOnly(null); }
    else if (G.state === 'garage') { G.state = 'playing'; hud.showOnly(null); }
    return;
  }
  if (G.state !== 'playing') return;
  if (input.pressed('KeyM')) missions.startNext(G);
  if (input.pressed('KeyR') && !activities.race.active) activities.startRace(G, save.racesWon % 3);
  if (input.pressed('KeyT') && !activities.taxi.active) activities.startTaxi(G);
  if (input.pressed('KeyG')) { G.state = 'garage'; hud.renderGarage(G); hud.showOnly('garage'); }
  if (input.pressed('KeyX')) crew.callDriver(G);
  if (input.pressed('KeyC')) crew.hackHeat(G);
  if (input.pressed('KeyQ')) {
    const show = hud.els.wheel.style.display !== 'flex';
    hud.toggleWheel(show, G);
  }
  if (input.pressed('Digit1')) player.weapon = 0;
  if (input.pressed('Digit2') && save.weaponsOwned.includes('smg')) player.weapon = 1;
  if (input.pressed('Digit3') && save.weaponsOwned.includes('shotgun')) player.weapon = 2;
  if (input.pressed('Digit4') && save.weaponsOwned.includes('rifle')) player.weapon = 3;
  if (input.pressed('KeyE')) {
    if (player.mode === 'car') { vehicles.exitCar(G); playerMesh.visible = true; }
    else trySteal();
  }
  if (input.mouse.pressed) combat.shoot(G);
  if (input.pressed('KeyB')) { // buy next weapon tier in the field (simple shop)
    const next = WEAPONS.find((w) => !save.weaponsOwned.includes(w.id));
    if (next && player.money >= next.price) {
      player.money -= next.price;
      save.weaponsOwned.push(next.id);
      player.weapon = WEAPONS.indexOf(next);
      player.ammo += 120;
      hud.feed(`BOUGHT ${next.name} — $${next.price}`, '#7aff9a');
      audio.pickup();
    }
  }
}

let elapsed = 0;
let shotFrames = 0;
const shotStart = performance.now();
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;
  elapsed += dt;
  save.playSeconds += dt;

  if (G.state === 'title') {
    handleKeys();
    updateTitleCamera(dt);
    vehicles.updateTraffic(dt, G);
  } else if (G.state === 'playing') {
    handleKeys();
    if (player.mode === 'car') vehicles.drivePlayer(dt, G, input);
    else moveOnFoot(dt);
    vehicles.updateTraffic(dt, G);
    police.update(dt, G, time);
    combat.update(dt, G, time);
    crew.update(dt, G);
    activities.update(dt, G);
    missions.update(dt, G);
    audio.siren(player.wanted > 0, time);
    hud.update(G, dt);
    updateCamera(dt);
    if (player.health <= 0) { G.state = 'dead'; hud.showOnly('dead'); audio.busted(); }
    if (player.mode === 'car' && vehicles.player.car && vehicles.player.car.health <= -40) {
      // car already handled in drivePlayer
    }
  } else if (G.state === 'busted') {
    handleKeys();
    hud.showOnly('busted');
  } else if (G.state === 'dead') {
    handleKeys();
    hud.showOnly('dead');
  } else if (G.state === 'paused' || G.state === 'garage') {
    handleKeys();
  }
  // Boats bob
  for (const b of city.boats) b.position.y = -0.2 + Math.sin(time * 0.8 + b.position.z) * 0.15;
  // HUD clock + wheel release
  if (input.pressed('KeyQ') === false && hud.els.wheel.style.display === 'flex' && !input.down('KeyQ')) {
    // wheel stays until Q pressed again — handled by toggle in handleKeys
  }
  renderer.render(scene, camera);
  input.endFrame();

  if (shotName && !window.__shotReady && performance.now() - shotStart > 5000) {
    window.__shotReady = true;
  }
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Boot
hud.renderSaves(G);
hud.renderMissions(G);
hud.setObjective('Free roam — press M for the next mission, R to race, T for taxi');
setTimeOfDay('dusk');
if (shotName) {
  G.shotMode = true;
  hud.showOnly(null);
  G.state = 'playing';
  audio.setMuted(true);
  stageShot(G, shotName);
  hud.update(G, 0.016);
  if (shotName === 'garage') hud.update(G, 0.016);
} else {
  hud.showOnly('title');
  hud.renderSaves(G);
}
animate();
