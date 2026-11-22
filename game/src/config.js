// VELAMAR 3D — tuning, districts, names. All original, written for the gta6-01 bounty.
export const WORLD = {
  half: 220,          // island half-size in metres
  roadGap: 44,        // distance between road centrelines
  roadWidth: 10,
  seed: 1337,
};

export const DISTRICTS = [
  { id: 'port',      name: 'PORT VELAMAR',   rect: [-220, 60, -88, 220],  color: '#7a5a3a' },
  { id: 'oldtown',   name: 'OLD TOWN',       rect: [-220, -220, -88, -60], color: '#a8845a' },
  { id: 'beach',     name: 'BEACHFRONT',     rect: [88, 60, 220, 220],     color: '#e8c98a' },
  { id: 'financial', name: 'FINANCIAL',      rect: [88, -220, 220, -60],   color: '#5a7a9a' },
  { id: 'marina',    name: 'MARINA DISTRICT',rect: [-88, -60, 88, 60],     color: '#3a7a8a' },
];

export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.rect[0] && x <= d.rect[2] && z >= d.rect[1] && z <= d.rect[3]) return d;
  }
  return DISTRICTS[4];
}

export const CAR_TYPES = {
  sedan:  { name: 'Velamar Sedan',  top: 26, accel: 14, grip: 2.6, price: 0,    color: 0x8a2f2f },
  sport:  { name: 'Corsa GT',       top: 38, accel: 22, grip: 3.4, price: 12000, color: 0xd8a018 },
  van:    { name: 'Dockside Van',   top: 21, accel: 10, grip: 2.2, price: 4000,  color: 0x3a5a7a },
  bike:   { name: 'Marina Bike',    top: 34, accel: 26, grip: 4.2, price: 8000,  color: 0x2f8a5a },
  boat:   { name: 'Harbor Skiff',   top: 24, accel: 12, grip: 2.0, price: 0,    color: 0xd8d8d8 },
};

export const WEAPONS = [
  { id: 'pistol',  name: 'P9 Pistol',   damage: 22, rate: 0.28, range: 55,  spread: 0.02, price: 0 },
  { id: 'smg',     name: 'VK-9 SMG',    damage: 13, rate: 0.09, range: 48,  spread: 0.06, price: 2500 },
  { id: 'shotgun', name: 'Breacher 12', damage: 34, rate: 0.85, range: 26,  spread: 0.16, price: 6000 },
  { id: 'rifle',   name: 'AR-77 Rifle', damage: 42, rate: 0.14, range: 90,  spread: 0.015, price: 14000 },
];

export const RESPECT_RANKS = ['Nobody', 'Street Rat', 'Hustler', 'Shot Caller', 'Kingpin', 'Crown of Velamar'];

export const GARAGE_UPGRADES = [
  { id: 'engine', name: 'Turbo Engine',  levels: 3, costs: [3000, 6000, 12000], desc: '+18% top speed per level' },
  { id: 'armor',  name: 'Plated Armor',  levels: 3, costs: [2500, 5000, 9000],  desc: '+40 car health per level' },
  { id: 'nitro',  name: 'Nitro Boost',   levels: 2, costs: [4000, 8000],       desc: 'Shift = nitro burst' },
  { id: 'paint',  name: 'Custom Paint',  levels: 1, costs: [1500],             desc: 'Repaint in crew gold' },
];

export const RADIO_STATIONS = [
  { id: 'velamar-fm', name: 'VELAMAR FM 88.1', bpm: 112, scale: [0, 3, 5, 7, 10], base: 220 },
  { id: 'neon-nights', name: 'NEON NIGHTS 104.5', bpm: 96, scale: [0, 2, 3, 7, 8], base: 196 },
  { id: 'harbor-jazz', name: 'HARBOR JAZZ 91.7', bpm: 78, scale: [0, 4, 5, 9, 11], base: 174 },
];

export const TUNE = {
  playerWalk: 7, playerRun: 11, playerHealth: 100, playerArmor: 100,
  stealTime: 0.9, wantedDecayHide: 14, wantedDecayDrive: 22,
  policeMax: 6, heliAt: 3, swatAt: 4, spikeAt: 3, roadblockAt: 3,
  trafficCars: 14, pedestrians: 10, crates: 12,
  raceLaps: 1, taxiFare: 180, crateValue: 350, stuntBonus: 250,
};
