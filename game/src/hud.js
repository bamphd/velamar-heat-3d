// HUD: stars, bars, minimap canvas, objective, feed, menus, garage, weapon wheel.
import { WEAPONS, RESPECT_RANKS, GARAGE_UPGRADES, DISTRICTS } from './config.js';
import { listSaves } from './save.js';

export function createHud() {
  const $ = (id) => document.getElementById(id);
  const els = {
    stars: $('stars'), healthFill: $('health-fill'), armorFill: $('armor-fill'),
    healthText: $('health-text'), money: $('money'), respect: $('respect'),
    clock: $('clock'), radio: $('radio'), district: $('district'),
    speed: $('speed'), weapon: $('weapon'), ammo: $('ammo'),
    objective: $('objective'), feed: $('feed'), prompt: $('prompt'),
    minimap: $('minimap'), territory: $('territory'),
    title: $('title-screen'), pause: $('pause-menu'), garage: $('garage-screen'),
    dead: $('dead-screen'), busted: $('busted-screen'), wheel: $('wheel'),
    garageList: $('garage-list'), garageMoney: $('garage-money'),
    saveSlots: $('save-slots'), missionList: $('mission-list'),
  };
  const mm = els.minimap.getContext('2d');
  let feedItems = [];
  let clockMin = 17 * 60 + 42; // golden hour start

  function setObjective(text) { els.objective.textContent = text; }
  function setPrompt(text) { els.prompt.textContent = text || ''; }

  function feed(msg, color) {
    feedItems.unshift({ msg, color: color || '#ffffff', t: 0 });
    if (feedItems.length > 5) feedItems.pop();
    els.feed.innerHTML = feedItems.map((f) =>
      `<div style="color:${f.color}">${f.msg}</div>`).join('');
  }

  function starsHtml(n) {
    let s = '';
    for (let i = 0; i < 5; i++) s += `<span class="star${i < n ? ' on' : ''}">★</span>`;
    return s;
  }

  function drawMinimap(G) {
    const W = 180, S = W / 460;
    mm.clearRect(0, 0, W, W);
    mm.fillStyle = '#0a2030';
    mm.fillRect(0, 0, W, W);
    mm.fillStyle = '#3a4a42';
    mm.fillRect(6, 6, W - 12, W - 12);
    // Roads
    mm.strokeStyle = '#22262c';
    mm.lineWidth = 4;
    for (const v of G.city.lines) {
      const p = (v + 220) * S;
      mm.beginPath(); mm.moveTo(p, 0); mm.lineTo(p, W); mm.stroke();
      mm.beginPath(); mm.moveTo(0, p); mm.lineTo(W, p); mm.stroke();
    }
    // District tint: current district border
    const d = G.currentDistrict;
    mm.strokeStyle = '#ffd24a'; mm.lineWidth = 1.5;
    mm.strokeRect((d.rect[0] + 220) * S, (d.rect[1] + 220) * S,
      (d.rect[2] - d.rect[0]) * S, (d.rect[3] - d.rect[1]) * S);
    const dot = (x, z, color, r) => {
      mm.fillStyle = color;
      mm.beginPath(); mm.arc((x + 220) * S, (z + 220) * S, r || 3, 0, Math.PI * 2); mm.fill();
    };
    // Crates
    for (const c of G.city.crates) if (!c.taken) dot(c.x, c.z, '#ffd24a', 2);
    // Mission / activity marker
    const mk = G.activities.getMarker();
    if (mk) dot(mk.x, mk.z, '#ff5a3c', 5);
    // Police
    for (const u of G.police.units) if (!u.dead) dot(u.x, u.z, '#ff2a2a', 3);
    // Crew
    for (const m of G.crew.members) if (m.active) dot(m.x, m.z, m.id === 'rico' ? '#ffc020' : '#20c8ff', 3);
    // Player arrow
    const px = (G.player.x + 220) * S, pz = (G.player.z + 220) * S;
    mm.save();
    mm.translate(px, pz);
    mm.rotate(-G.player.heading);
    mm.fillStyle = '#ffffff';
    mm.beginPath(); mm.moveTo(0, -7); mm.lineTo(5, 6); mm.lineTo(-5, 6); mm.closePath(); mm.fill();
    mm.restore();
    // North
    mm.fillStyle = '#ffffff';
    mm.font = 'bold 10px monospace';
    mm.fillText('N', W / 2 - 3, 12);
  }

  function update(G, dt) {
    clockMin = (clockMin + dt * 0.35) % (24 * 60);
    const hh = String(Math.floor(clockMin / 60)).padStart(2, '0');
    const mn = String(Math.floor(clockMin % 60)).padStart(2, '0');
    els.clock.textContent = `${hh}:${mn}`;
    els.stars.innerHTML = starsHtml(G.player.wanted);
    els.healthFill.style.width = `${G.player.health}%`;
    els.armorFill.style.width = `${G.player.armor}%`;
    els.healthText.textContent = `HP ${Math.ceil(G.player.health)}  ARMOR ${Math.ceil(G.player.armor)}`;
    els.money.textContent = `$${G.player.money.toLocaleString()}`;
    const rank = RESPECT_RANKS[Math.min(RESPECT_RANKS.length - 1, Math.floor(G.player.respect / 20))];
    els.respect.textContent = `${rank} · ${G.player.respect} REP`;
    els.district.textContent = G.currentDistrict.name;
    els.radio.textContent = G.audio.stationName;
    els.speed.textContent = G.player.mode === 'car' ? `${Math.round(G.player.speed)} km/h` : 'ON FOOT';
    const w = WEAPONS[G.player.weapon];
    els.weapon.textContent = w.name;
    els.ammo.textContent = `AMMO ${G.player.ammo} · [1-4] weapon · [Q] wheel`;
    // Territory bars
    els.territory.innerHTML = DISTRICTS.map((d) =>
      `<div class="terr"><span>${d.name}</span><div class="terr-bar"><div style="width:${G.save.territory[d.id] || 0}%"></div></div><b>${G.save.territory[d.id] || 0}%</b></div>`
    ).join('');
    drawMinimap(G);
    // Feed fade
    for (const f of feedItems) f.t += dt;
    feedItems = feedItems.filter((f) => f.t < 6);
    if (feedItems.length === 0) els.feed.innerHTML = '';
  }

  function showOnly(name) {
    for (const k of ['title', 'pause', 'garage', 'dead', 'busted']) {
      els[k].style.display = (k === name) ? 'flex' : 'none';
    }
    $('hud').style.display = name ? 'none' : 'block';
  }

  function renderSaves(G) {
    const saves = listSaves();
    els.saveSlots.innerHTML = saves.map((s, i) =>
      `<button data-slot="${i}" class="slot-btn">${s ? `SLOT ${i + 1} — $${s.money} · ${s.missionsDone.length}/10 missions · ${new Date(s.savedAt).toLocaleDateString()}` : `SLOT ${i + 1} — EMPTY`}</button>`
    ).join('');
    els.saveSlots.querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', () => G.loadSlot(Number(b.dataset.slot)));
    });
  }

  function renderMissions(G) {
    els.missionList.innerHTML = '<b>MISSIONS</b>' + G.missionsList.map((m) =>
      `<div class="${G.save.missionsDone.includes(m.id) ? 'done' : ''}">${m.id}. ${m.title}${G.save.missionsDone.includes(m.id) ? ' ✓' : ''}</div>`
    ).join('');
  }

  function renderGarage(G) {
    els.garageMoney.textContent = `CASH $${G.player.money.toLocaleString()} — CAR: ${G.player.carType || 'NONE'}`;
    els.garageList.innerHTML = GARAGE_UPGRADES.map((u) => {
      const lvl = G.save.garage[u.id];
      const maxed = lvl >= u.levels;
      const cost = maxed ? 0 : u.costs[lvl];
      return `<div class="upg"><div><b>${u.name}</b> — ${u.desc}<br>Level ${lvl}/${u.levels}</div>
        <button data-upg="${u.id}" ${maxed || G.player.money < cost ? 'disabled' : ''}>${maxed ? 'MAXED' : `BUY $${cost}`}</button></div>`;
    }).join('');
    els.garageList.querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', () => G.buyUpgrade(b.dataset.upg));
    });
  }

  function toggleWheel(show, G) {
    els.wheel.style.display = show ? 'flex' : 'none';
    if (show && G) {
      els.wheel.innerHTML = WEAPONS.map((w, i) => {
        const owned = G.save.weaponsOwned.includes(w.id);
        return `<div class="wheel-slot ${i === G.player.weapon ? 'sel' : ''} ${owned ? '' : 'locked'}">
          <b>${i + 1}</b><span>${w.name}</span><em>${owned ? `DMG ${w.damage}` : `$${w.price} — buy in garage`}</em></div>`;
      }).join('');
    }
  }

  return {
    setObjective, setPrompt, feed, update, showOnly, renderSaves, renderMissions, renderGarage, toggleWheel,
    els,
  };
}
