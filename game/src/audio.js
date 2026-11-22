// WebAudio synth only — no audio files, no network. Engine, sirens, gunfire, radio.
import { RADIO_STATIONS } from './config.js';

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let radioTimer = null;
  let radioStep = 0;
  let station = 0;
  let muted = false;
  let radioOn = true;

  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 420;
      engineOsc.connect(lp); lp.connect(engineGain); engineGain.connect(master);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain); sirenGain.connect(master);
      sirenOsc.start();
      return true;
    } catch { ctx = null; return false; }
  }

  function blip(freq, dur, type, vol, slideTo) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, vol, lowpass) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = lowpass || 3000;
    const g = ctx.createGain();
    g.gain.value = vol || 0.3;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
  }

  function radioTick() {
    if (!ctx || muted || !radioOn) return;
    const st = RADIO_STATIONS[station];
    const stepDur = 60 / st.bpm / 2;
    const scale = st.scale;
    const note = scale[radioStep % scale.length] + 12 * Math.floor(radioStep / scale.length) % 24;
    const freq = st.base * Math.pow(2, note / 12);
    blip(freq, stepDur * 0.9, 'triangle', 0.07);
    if (radioStep % 4 === 0) blip(st.base / 2, stepDur * 1.8, 'sine', 0.12);
    radioStep++;
  }

  return {
    unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume(); },
    get ready() { return !!ctx; },
    setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.5; },
    setStation(i) { station = ((i % RADIO_STATIONS.length) + RADIO_STATIONS.length) % RADIO_STATIONS.length; radioStep = 0; },
    get stationName() { return RADIO_STATIONS[station].name; },
    setRadio(on) { radioOn = on; },
    startRadio() {
      if (!ensure() || radioTimer) return;
      radioTimer = setInterval(radioTick, (60 / RADIO_STATIONS[station].bpm / 2) * 1000);
    },
    engine(speed01, on) {
      if (!ctx || muted) return;
      engineGain.gain.setTargetAtTime(on ? 0.03 + speed01 * 0.06 : 0, ctx.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(55 + speed01 * 160, ctx.currentTime, 0.1);
    },
    siren(on, t) {
      if (!ctx || muted) return;
      sirenGain.gain.setTargetAtTime(on ? 0.035 : 0, ctx.currentTime, 0.2);
      if (on) sirenOsc.frequency.setTargetAtTime(650 + 250 * Math.sin(t * 4), ctx.currentTime, 0.05);
    },
    shoot() { noise(0.12, 0.35, 2200); blip(160, 0.08, 'square', 0.18, 60); },
    explosion() { noise(0.9, 0.6, 500); blip(70, 0.7, 'sine', 0.4, 30); },
    crash() { noise(0.25, 0.4, 900); },
    pickup() { blip(880, 0.1, 'sine', 0.2); blip(1320, 0.14, 'sine', 0.2); },
    missionOk() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.22, 'triangle', 0.22), i * 110)); },
    missionFail() { [400, 320, 240].forEach((f, i) => setTimeout(() => blip(f, 0.25, 'sawtooth', 0.15), i * 130)); },
    wantedUp() { blip(980, 0.12, 'square', 0.15); setTimeout(() => blip(980, 0.12, 'square', 0.15), 140); },
    busted() { [220, 180, 140].forEach((f, i) => setTimeout(() => blip(f, 0.4, 'sawtooth', 0.2), i * 200)); },
    click() { blip(700, 0.05, 'square', 0.12); },
  };
}
