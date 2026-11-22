// Free-roam activities: street race league, taxi fares, contraband crates, stunt jumps.
import * as THREE from 'three';
import { TUNE } from './config.js';
import { mulberry32, range } from './random.js';

export function createActivities(scene, city) {
  const rng = mulberry32(31337);
  const race = { active: false, points: [], idx: 0, timer: 0, name: '' };
  const taxi = { active: false, px: 0, pz: 0, dx: 0, dz: 0, fare: 0, passenger: false };
  let marker = null;
  let markerMat = null;

  function showMarker(x, z, color) {
    if (!marker) {
      markerMat = new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.75 });
      marker = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.3, 20), markerMat);
      scene.add(marker);
    }
    markerMat.color.setHex(color);
    marker.position.set(x, 0.2, z);
    marker.visible = true;
  }
  function hideMarker() { if (marker) marker.visible = false; }

  const RACE_COURSES = [
    { name: 'MARINA SPRINT', points: [[0, 66], [110, 66], [110, -66], [-22, -66], [-22, 66]] },
    { name: 'BEACHFRONT LOOP', points: [[154, 110], [154, -22], [66, -22], [66, 110]] },
    { name: 'PORT HAUL', points: [[-154, 110], [-154, -110], [-66, -110], [-66, 22]] },
  ];

  function startRace(G, idx) {
    const course = RACE_COURSES[idx % RACE_COURSES.length];
    race.active = true;
    race.points = course.points;
    race.idx = 0;
    race.timer = 0;
    race.name = course.name;
    showMarker(course.points[0][0], course.points[0][1], 0xffd24a);
    G.hud.setObjective(`RACE: ${course.name} — hit the gold gates in order`);
    G.hud.feed(`STREET RACE STARTED — ${course.name}`, '#ffd24a');
  }

  function startTaxi(G) {
    const a = city.roadPoint(rng);
    const b = city.roadPoint(rng);
    taxi.active = true;
    taxi.px = a.x; taxi.pz = a.z; taxi.dx = b.x; taxi.dz = b.z;
    taxi.passenger = false;
    taxi.fare = TUNE.taxiFare;
    showMarker(a.x, a.z, 0x2aff66);
    G.hud.setObjective('TAXI: pick up the fare at the green marker');
    G.hud.feed('TAXI FARE AVAILABLE — PICK UP THE PASSENGER', '#7aff9a');
  }

  function update(dt, G) {
    // Race gates
    if (race.active) {
      race.timer += dt;
      const [gx, gz] = race.points[race.idx];
      if (Math.hypot(G.player.x - gx, G.player.z - gz) < 8) {
        race.idx++;
        G.audio.pickup();
        if (race.idx >= race.points.length) {
          race.active = false;
          hideMarker();
          const bonus = Math.max(800, 2500 - Math.floor(race.timer) * 10);
          G.player.money += bonus;
          G.save.racesWon++;
          G.player.respect += 8;
          G.hud.feed(`RACE WON — ${race.name} +$${bonus}`, '#ffd24a');
          G.audio.missionOk();
          G.hud.setObjective('Free roam — start a mission (M) or race (R)');
        } else {
          showMarker(race.points[race.idx][0], race.points[race.idx][1], 0xffd24a);
          G.hud.setObjective(`RACE: ${race.name} — gate ${race.idx + 1}/${race.points.length}`);
        }
      }
    }
    // Taxi
    if (taxi.active) {
      const tx = taxi.passenger ? taxi.dx : taxi.px;
      const tz = taxi.passenger ? taxi.dz : taxi.pz;
      if (Math.hypot(G.player.x - tx, G.player.z - tz) < 7) {
        if (!taxi.passenger) {
          taxi.passenger = true;
          showMarker(taxi.dx, taxi.dz, 0x2aff66);
          G.hud.setObjective('TAXI: drop the passenger at the green marker');
          G.hud.feed('PASSENGER IN — DRIVE SMOOTH, NO COPS', '#7aff9a');
        } else {
          taxi.active = false;
          hideMarker();
          G.player.money += taxi.fare;
          G.save.taxisDone++;
          G.player.respect += 2;
          G.hud.feed(`FARE PAID +$${taxi.fare}`, '#7aff9a');
          G.audio.missionOk();
          G.hud.setObjective('Free roam — start a mission (M) or race (R)');
        }
      }
    }
    // Crates
    for (const c of city.crates) {
      if (c.taken) continue;
      if (Math.hypot(G.player.x - c.x, G.player.z - c.z) < 3) {
        c.taken = true;
        c.mesh.visible = false;
        G.player.money += TUNE.crateValue;
        G.save.cratesFound++;
        G.hud.feed(`CONTRABAND CRATE +$${TUNE.crateValue} (${G.save.cratesFound}/12)`, '#ffd24a');
        G.audio.pickup();
      }
    }
    // Stunt jumps: airtime off ramps at speed
    if (G.player.mode === 'car') {
      for (const r of city.ramps) {
        if (Math.hypot(G.player.x - r.x, G.player.z - r.z) < 4 && Math.abs(G.player.speed) > 55) {
          if (!r.cool || r.cool <= 0) {
            r.cool = 8;
            G.player.money += TUNE.stuntBonus;
            G.save.stunts++;
            G.player.respect += 3;
            G.hud.feed(`STUNT JUMP! +$${TUNE.stuntBonus}`, '#ffd24a');
            G.audio.pickup();
          }
        }
        if (r.cool) r.cool -= dt;
      }
    }
  }

  return { race, taxi, startRace, startTaxi, update, showMarker, hideMarker, RACE_COURSES,
    getMarker() { return marker && marker.visible ? { x: marker.position.x, z: marker.position.z } : null; } };
}
