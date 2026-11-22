// 3 save slots in localStorage. Pure data, no secrets.
const KEY = (slot) => `velamar-save-${slot}`;

export function listSaves() {
  const out = [];
  for (let s = 0; s < 3; s++) {
    try {
      const raw = localStorage.getItem(KEY(s));
      out.push(raw ? JSON.parse(raw) : null);
    } catch { out.push(null); }
  }
  return out;
}

export function writeSave(slot, data) {
  try {
    localStorage.setItem(KEY(slot), JSON.stringify({ ...data, savedAt: Date.now() }));
    return true;
  } catch { return false; }
}

export function readSave(slot) {
  try {
    const raw = localStorage.getItem(KEY(slot));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function defaultSave() {
  return {
    money: 500, respect: 0, missionsDone: [], territory: { port: 0, oldtown: 0, beach: 0, financial: 0, marina: 10 },
    garage: { engine: 0, armor: 0, nitro: 0, paint: 0 }, weaponsOwned: ['pistol'],
    racesWon: 0, taxisDone: 0, cratesFound: 0, stunts: 0, playSeconds: 0,
  };
}
