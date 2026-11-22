// Screenshot poses: ?shot=cover|onfoot|night|garage&seed=N stages a dense, readable scene.
// Deterministic fixed coordinates — the same shot every run.
export function stageShot(G, name) {
  const P = G.player;
  if (name === 'cover') {
    // Sunset chase down vertical road x=22 (grid roads sit on x = -198+44k):
    // player just past the z=110 crossroad so the chase camera sits over it.
    const car = G.vehicles.addCar('sport', 22, 100, Math.PI, {});
    G.vehicles.stealCar(G, car);
    car.speed = 34;
    P.money = 12480; P.respect = 42;
    G.police.setWanted(G, 4, 'HARBOR HEIST');
    const pit = G.police.spawnUnit(G, 26, 98);
    pit.heading = Math.PI; pit.speed = 34;
    const tail = G.police.spawnUnit(G, 18, 114);
    tail.heading = Math.PI; tail.speed = 32;
    G.police.placeRoadblock(G);
    G.police.placeSpikes(G);
    G.police.spawnHeli(G);
    G.hud.setObjective('MISSION 6: HARBOR HEIST — lose the cops');
    G.hud.feed('MISSION 6: HARBOR HEIST', '#ffd24a');
    G.hud.feed('VCPD ROADBLOCK AHEAD', '#ff5a3c');
    G.hud.feed('HELIX-1 AIR SUPPORT ON STATION', '#ffd24a');
    G.setTimeOfDay('dusk');
    return true;
  }
  if (name === 'onfoot') {
    // Downtown on foot, on road x=-110 in Old Town: camera sits over the road.
    P.x = -110; P.z = -88; P.heading = Math.PI; P.mode = 'foot';
    P.money = 3280; P.respect = 18;
    const car = G.vehicles.addCar('sedan', -106, -84, 0.8, {});
    car.parked = false;
    G.police.setWanted(G, 2, 'GRAND THEFT AUTO');
    G.police.spawnUnit(G, -118, -102);
    G.hud.setObjective('MISSION 3: NEON CUT — rob the Old Town shop');
    G.hud.toggleWheel(true, G);
    G.crew.members[0].active = true;
    G.crew.members[0].x = -114; G.crew.members[0].z = -84;
    G.setTimeOfDay('dusk');
    return true;
  }
  if (name === 'night') {
    // Mission 5 at night, on road z=110 by the Port: camera sits over the road,
    // shootout + burning van ahead, HELIX-1 above.
    G.setTimeOfDay('night');
    P.x = -176; P.z = 110; P.heading = Math.PI / 2; P.mode = 'foot';
    P.money = 9410; P.respect = 55; P.weapon = 3; P.ammo = 120;
    G.police.setWanted(G, 3, 'HELIX RISING');
    G.police.spawnHeli(G);
    G.combat.spawnEnemy(G, -168, 112, 70);
    G.combat.spawnEnemy(G, -160, 108, 70);
    G.combat.spawnEnemy(G, -168, 104, 70);
    G.combat.explode(-150, 110);
    const car = G.vehicles.addCar('van', -150, 110, 0.4, {});
    car.burning = true;
    G.crew.members[0].active = true;
    G.crew.members[0].x = -180; G.crew.members[0].z = 104;
    G.crew.members[1].active = true;
    G.crew.members[1].x = -172; G.crew.members[1].z = 116;
    G.hud.setObjective('MISSION 5: HELIX RISING — outrun HELIX-1, survive 30s at 3 stars');
    G.hud.feed('MISSION 5: HELIX RISING', '#ffd24a');
    return true;
  }
  if (name === 'garage') {
    // Garage upgrade screen over the golden-hour skyline.
    const car = G.vehicles.addCar('sport', 0, 30, Math.PI, {});
    G.vehicles.stealCar(G, car);
    P.money = 18400; P.respect = 60;
    G.save.garage = { engine: 1, armor: 1, nitro: 0, paint: 0 };
    G.save.weaponsOwned = ['pistol', 'smg', 'shotgun'];
    G.save.missionsDone = [1, 2, 3, 4, 5, 6];
    G.save.territory = { port: 35, oldtown: 40, beach: 25, financial: 20, marina: 65 };
    G.hud.renderGarage(G);
    G.hud.showOnly('garage');
    G.setTimeOfDay('dusk');
    return true;
  }
  return false;
}
