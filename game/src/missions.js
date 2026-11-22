// 10 story missions for VELAMAR: a small step engine (goto / steal / shoot / survive / deliver / race).
export const MISSIONS = [
  { id: 1, title: 'First Keys', brief: 'Steal your first car and bring it to the Marina safehouse.',
    steps: [{ type: 'steal', text: 'Steal a parked car (walk up, press E)' }, { type: 'goto', x: 0, z: 66, text: 'Drive to the Marina safehouse' }],
    reward: 800, respect: 5, territory: ['marina', 10] },
  { id: 2, title: 'Dockside Debt', brief: 'Collect the debt at the Port, then run the cash to Marina before the heat arrives.',
    steps: [{ type: 'goto', x: -170, z: 130, text: 'Reach the Port docks' }, { type: 'deliver', x: 0, z: 66, time: 75, text: 'Deliver the cash to Marina — 75s' }],
    reward: 1500, respect: 8, territory: ['port', 15] },
  { id: 3, title: 'Neon Cut', brief: 'Rob the Old Town shop, then lose the two-star heat.',
    steps: [{ type: 'goto', x: -154, z: -110, text: 'Reach the Old Town shop' }, { type: 'shoot', n: 3, x: -154, z: -110, text: 'Deal with the shop guards (3)' }, { type: 'survive', time: 20, wanted: 2, text: 'Lose the cops — survive 20s at 2 stars' }],
    reward: 2200, respect: 10, territory: ['oldtown', 15] },
  { id: 4, title: 'Marina Hustle', brief: 'Run contraband across Beachfront. Roadblocks are out — keep moving.',
    steps: [{ type: 'deliver', x: 110, z: 110, time: 60, text: 'Deliver the package to Beachfront — 60s' }],
    reward: 2000, respect: 8, territory: ['beach', 15] },
  { id: 5, title: 'HELIX Rising', brief: 'Night run through the Financial tunnel while HELIX-1 hunts you from the sky.',
    steps: [{ type: 'goto', x: -66, z: -154, night: true, text: 'Reach the Financial tunnel (night)' }, { type: 'survive', time: 30, wanted: 3, night: true, text: 'Outrun HELIX-1 — survive 30s at 3 stars' }],
    reward: 3500, respect: 14, territory: ['financial', 20] },
  { id: 6, title: 'Harbor Heist', brief: 'Hit the Port bank, then run four stars across town to the safehouse.',
    steps: [{ type: 'goto', x: -180, z: 90, text: 'Reach the Port bank' }, { type: 'shoot', n: 4, x: -180, z: 90, text: 'Clear the bank guards (4)' }, { type: 'goto', x: 66, z: 66, wanted: 4, text: 'Escape to the Beachfront safehouse at 4 stars' }],
    reward: 5000, respect: 18, territory: ['port', 20] },
  { id: 7, title: 'Street Kings', brief: 'Win the Marina Sprint and take the street race crown.',
    steps: [{ type: 'race', course: 0, text: 'Win the Marina Sprint race' }],
    reward: 3000, respect: 14, territory: ['marina', 15] },
  { id: 8, title: "Kingpin's Call", brief: 'RICO is pinned by a SWAT raid in Old Town. Get him out.',
    steps: [{ type: 'goto', x: -110, z: -66, text: 'Reach the SWAT raid' }, { type: 'shoot', n: 5, x: -110, z: -66, text: 'Take down the SWAT team (5)' }],
    reward: 4500, respect: 16, territory: ['oldtown', 20] },
  { id: 9, title: 'District War', brief: 'Take Marina back from the rival crew, block by block.',
    steps: [{ type: 'goto', x: 66, z: 22, text: 'Reach the Marina turf' }, { type: 'shoot', n: 6, x: 66, z: 22, text: 'Clear the rival crew (6)' }],
    reward: 5000, respect: 18, territory: ['marina', 40] },
  { id: 10, title: 'Velamar Crown', brief: 'Five stars. The whole island is hunting you. Make it to the safehouse and take the crown.',
    steps: [{ type: 'survive', time: 45, wanted: 5, text: 'Survive 45s at 5 stars — the whole VCPD is out' }, { type: 'goto', x: 0, z: 30, wanted: 5, text: 'Reach the Marina safehouse and take the Crown' }],
    reward: 10000, respect: 25, territory: ['marina', 30] },
];

export function createMissions() {
  let current = -1;      // index into MISSIONS, -1 = none
  let stepIdx = 0;
  let timer = 0;
  let kills = 0;
  let killsNeeded = 0;
  let raceStart = 0;
  let spawned = false;

  function step(G) {
    if (current < 0) return null;
    return MISSIONS[current].steps[stepIdx] || null;
  }

  function start(G, idx) {
    current = idx;
    stepIdx = 0;
    kills = 0;
    spawned = false;
    const m = MISSIONS[idx];
    G.hud.setObjective(`MISSION ${m.id}: ${m.title} — ${m.steps[0].text}`);
    G.hud.feed(`MISSION ${m.id}: ${m.title}`, '#ffd24a');
    G.hud.feed(m.brief, '#ffffff');
    G.audio.pickup();
    enterStep(G);
  }

  function enterStep(G) {
    const s = step(G);
    if (!s) return;
    spawned = false;
    timer = s.time || 0;
    if (s.night) G.setTimeOfDay('night');
    if (s.type === 'goto' || s.type === 'deliver') {
      G.activities.showMarker(s.x, s.z, s.type === 'deliver' ? 0x2aff66 : 0xffd24a);
      if (s.wanted) G.police.setWanted(G, s.wanted, 'MISSION HEAT');
    } else if (s.type === 'shoot') {
      killsNeeded = s.n;
      kills = 0;
      G.activities.showMarker(s.x, s.z, 0xff5a3c);
    } else if (s.type === 'survive') {
      if (s.wanted) G.police.setWanted(G, s.wanted, 'MISSION HEAT');
      G.activities.hideMarker();
    } else if (s.type === 'race') {
      raceStart = G.save.racesWon;
      G.activities.startRace(G, s.course);
    }
    G.hud.setObjective(`MISSION ${MISSIONS[current].id}: ${MISSIONS[current].title} — ${s.text}`);
  }

  function nextStep(G) {
    stepIdx++;
    if (stepIdx >= MISSIONS[current].steps.length) complete(G);
    else enterStep(G);
  }

  function complete(G) {
    const m = MISSIONS[current];
    G.player.money += m.reward;
    G.player.respect += m.respect;
    G.crew.gainTerritory(G, m.territory[0], m.territory[1]);
    if (!G.save.missionsDone.includes(m.id)) G.save.missionsDone.push(m.id);
    G.hud.feed(`MISSION COMPLETE — ${m.title} +$${m.reward} +${m.respect} RESPECT`, '#7aff9a');
    G.audio.missionOk();
    G.activities.hideMarker();
    current = -1;
    G.setTimeOfDay('dusk');
    G.hud.setObjective('Free roam — press M for the next mission, R to race, T for taxi');
    G.saveGame();
  }

  function fail(G, why) {
    const m = MISSIONS[current];
    G.hud.feed(`MISSION FAILED — ${m.title}: ${why}`, '#ff5a3c');
    G.audio.missionFail();
    G.activities.hideMarker();
    current = -1;
    G.setTimeOfDay('dusk');
    G.hud.setObjective('Free roam — press M to retry the mission');
  }

  function onKill(G) {
    if (current < 0) return;
    const s = step(G);
    if (s && s.type === 'shoot') {
      kills++;
      G.hud.setObjective(`MISSION ${MISSIONS[current].id}: ${MISSIONS[current].title} — guards down ${kills}/${killsNeeded}`);
      if (kills >= killsNeeded) nextStep(G);
    }
  }

  function update(dt, G) {
    if (current < 0) return;
    const s = step(G);
    if (!s) return;
    const dist = (x, z) => Math.hypot(G.player.x - x, G.player.z - z);
    if (s.type === 'goto') {
      if (dist(s.x, s.z) < 9) { G.audio.pickup(); nextStep(G); }
    } else if (s.type === 'deliver') {
      timer -= dt;
      G.hud.setObjective(`MISSION ${MISSIONS[current].id}: ${MISSIONS[current].title} — ${s.text} (${Math.ceil(timer)}s)`);
      if (dist(s.x, s.z) < 9) { G.audio.pickup(); nextStep(G); }
      else if (timer <= 0) fail(G, 'ran out of time');
    } else if (s.type === 'shoot') {
      if (!spawned) {
        spawned = true;
        const left = killsNeeded - kills;
        for (let i = 0; i < left; i++) {
          G.combat.spawnEnemy(G, s.x + (Math.random() - 0.5) * 24, s.z + (Math.random() - 0.5) * 24, 70);
        }
      }
    } else if (s.type === 'survive') {
      timer -= dt;
      G.hud.setObjective(`MISSION ${MISSIONS[current].id}: ${MISSIONS[current].title} — ${s.text} (${Math.ceil(timer)}s)`);
      if (timer <= 0) nextStep(G);
    } else if (s.type === 'steal') {
      if (G.player.mode === 'car') nextStep(G);
    } else if (s.type === 'race') {
      if (G.save.racesWon > raceStart) nextStep(G);
    }
  }

  function startNext(G) {
    const done = G.save.missionsDone;
    const next = MISSIONS.findIndex((m) => !done.includes(m.id));
    if (next === -1) {
      G.hud.feed('ALL 10 MISSIONS COMPLETE — YOU OWN VELAMAR', '#ffd24a');
      return false;
    }
    start(G, next);
    return true;
  }

  return {
    get current() { return current; },
    get currentDef() { return current >= 0 ? MISSIONS[current] : null; },
    start, startNext, update, onKill, fail,
  };
}
