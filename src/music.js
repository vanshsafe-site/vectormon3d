// Procedural music + sound effects (no audio files). Music is toggleable; SFX use their own gain so they work either way.
let ctx = null, master = null, sfxBus = null, timer = null, index = 0, on = false, track = 'explore'

const NOTES = [130.81, 146.83, 164.81, 174.61, 196, 220, 246.94, 261.63, 293.66, 329.63, 349.23, 392, 440, 493.88, 523.25, 587.33, 659.25, 783.99, 880, 1046.5]
const TRACKS = {
  explore: {
    bpm: 92, wave: 'triangle',
    melody: [0, 2, 4, 7, 9, 7, 4, 2, 0, 2, 4, 7, 9, 11, 9, 7, 4, 2, 4, 7, 9, 7, 4, 2, 0, 2, 4, 7, 9, 7, 4, 2],
    bass: [0, 0, 2, 2, 4, 4, 2, 2, 0, 0, 2, 2, 4, 4, 7, 7, 0, 0, 2, 2, 4, 4, 2, 2, 0, 0, 2, 0, 4, 2, 0, 0],
    chords: [[196, 246.94, 293.66], [174.61, 220, 261.63], [146.83, 174.61, 220], [130.81, 164.81, 196]],
    arp: [293.66, 349.23, 392, 349.23],
    accent: [0, 4, 7, 9],
  },
  camp: {
    bpm: 86, wave: 'sine',
    melody: [7, 9, 11, 9, 7, 4, 2, 4, 7, 9, 11, 9, 7, 4, 2, 0, 2, 4, 7, 9, 11, 9, 7, 4, 4, 2, 4, 5, 7, 5, 4, 2],
    bass: [0, 0, 2, 2, 4, 4, 2, 2, 0, 0, 2, 2, 4, 4, 2, 2, 0, 0, 2, 2, 4, 4, 2, 2, 4, 4, 2, 2, 0, 0, 2, 2],
    chords: [[130.81, 164.81, 196], [146.83, 174.61, 220], [164.81, 196, 246.94], [146.83, 196, 220]],
    arp: [220, 261.63, 293.66, 261.63],
    accent: [0, 2, 4, 7],
  },
  battle: {
    bpm: 148, wave: 'square',
    melody: [12, 14, 16, 14, 12, 14, 17, 16, 12, 14, 16, 19, 17, 16, 14, 12, 12, 14, 16, 14, 12, 14, 17, 19, 17, 16, 14, 12, 10, 12, 14, 10],
    bass: [0, 0, 4, 4, 2, 2, 0, 0, 0, 0, 4, 4, 2, 2, 0, 0, 4, 4, 2, 2, 0, 0, 4, 4, 2, 2, 0, 0, 4, 4, 2, 2],
    chords: [[110, 130.81, 164.81], [82.41, 103.83, 123.47], [98, 123.47, 146.83], [73.42, 92.5, 110]],
    arp: [220, 261.63, 329.63, 261.63],
    accent: [0, 3, 5, 7],
  },
  victory: {
    bpm: 128, wave: 'triangle',
    melody: [7, 9, 11, 12, 11, 9, 7, 4, 7, 9, 11, 12, 14, 12, 11, 9, 7, 7, 9, 11, 12, 11, 9, 7, 4, 5, 7, 9, 11, 9, 7, 4],
    bass: [4, 4, 4, 4, 7, 7, 7, 7, 4, 4, 4, 4, 7, 7, 7, 7, 4, 4, 4, 4, 7, 7, 7, 7, 4, 4, 4, 4, 2, 2, 0, 0],
    chords: [[196, 246.94, 293.66], [220, 261.63, 329.63], [174.61, 220, 261.63], [146.83, 196, 220]],
    arp: [392, 493.88, 587.33, 659.25],
    accent: [4, 7, 9, 11],
  },
  defeat: {
    bpm: 100, wave: 'sawtooth',
    melody: [7, 9, 7, 5, 4, 2, 0, 2, 4, 5, 4, 2, 0, 0, 2, 4, 4, 2, 0, 0, 2, 4, 5, 4, 2, 0, 2, 4, 4, 2, 0, 0],
    bass: [0, 0, 2, 2, 4, 4, 2, 2, 0, 0, 2, 2, 4, 4, 2, 2, 0, 0, 2, 2, 4, 4, 2, 2, 0, 0, 2, 2, 4, 4, 2, 2],
    chords: [[146.83, 174.61, 196], [130.81, 164.81, 196], [110, 130.81, 164.81], [98, 123.47, 146.83]],
    arp: [196, 174.61, 146.83, 130.81],
    accent: [0, 2, 4, 7],
  },
}

function ensureContext() {
  if (ctx) return true
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return false
  ctx = new AC()
  master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination)
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.5; sfxBus.connect(ctx.destination)
  return true
}

function tone(freq, start, dur, wave, volume, bus = master, endFreq) {
  const osc = ctx.createOscillator(), env = ctx.createGain()
  osc.type = wave
  osc.frequency.setValueAtTime(freq, start)
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + dur)
  env.gain.setValueAtTime(0.0001, start)
  env.gain.exponentialRampToValueAtTime(volume, start + 0.012)
  env.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.connect(env); env.connect(bus); osc.start(start); osc.stop(start + dur + 0.04)
}

function tick() {
  const t = TRACKS[track], start = ctx.currentTime + 0.035, i = index % 32
  const leadIndex = t.melody[i % t.melody.length]
  const bassIndex = t.bass[i % t.bass.length]
  const accent = t.accent[(index / 4) % t.accent.length]
  if (leadIndex != null && i % (track === 'battle' ? 2 : 1) === 0) {
    const freq = NOTES[leadIndex % NOTES.length] * (track === 'battle' ? 2 : leadIndex > 11 && track === 'victory' ? 1.25 : 1)
    tone(freq, start, track === 'battle' ? 0.11 : 0.17, t.wave, track === 'battle' ? 0.15 : 0.2)
  }
  if (i % 8 === 0) {
    const chord = t.chords[Math.floor(index / 8) % t.chords.length]
    chord.forEach((n, j) => tone(n * (j === 2 ? 2 : 1), start, track === 'battle' ? 1.1 : 1.5, 'sine', 0.05))
  }
  if (i % (track === 'battle' ? 2 : 4) === 0) {
    const root = t.chords[Math.floor(index / 8) % t.chords.length][0] / (track === 'explore' ? 2.1 : 2)
    tone(root, start, 0.32, 'triangle', 0.12)
  }
  const bassFreq = NOTES[bassIndex % NOTES.length] / 2
  if (i % 2 === 0) tone(bassFreq, start, track === 'battle' ? 0.2 : 0.25, track === 'battle' ? 'sawtooth' : 'triangle', 0.07)
  if (i % 4 === 0) tone(NOTES[accent % NOTES.length], start, 0.18, 'triangle', 0.05)
  if (track === 'battle' && i % 4 === 0) tone(i % 8 === 0 ? 220 : 164.81, start + 0.035, 0.07, 'square', 0.07)
  index++
}

function startLoop() {
  clearInterval(timer)
  index = 0; tick()
  timer = setInterval(tick, 60000 / TRACKS[track].bpm / 2)
}

const SFX = {
  hit: (t) => { tone(220, t, 0.16, 'square', 0.35, sfxBus, 70) },
  super: (t) => { tone(260, t, 0.16, 'square', 0.35, sfxBus, 60); tone(520, t + 0.08, 0.22, 'sawtooth', 0.22, sfxBus, 1040) },
  shake: (t) => { tone(340, t, 0.09, 'triangle', 0.4, sfxBus, 180) },
  catch: (t) => { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, t + i * 0.1, 0.3, 'triangle', 0.3, sfxBus)) },
  win: (t) => { [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, t + i * 0.12, 0.35, 'square', 0.18, sfxBus)) },
  lose: (t) => { [392, 349.23, 311.13, 261.63].forEach((f, i) => tone(f, t + i * 0.22, 0.4, 'triangle', 0.3, sfxBus)) },
}

export const music = {
  get isOn() { return on },
  // Returns true/false for the new state, or null if audio is unavailable.
  toggle() {
    if (!ensureContext()) return null
    if (on) {
      clearInterval(timer)
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.14)
      on = false
    } else {
      ctx.resume()
      master.gain.setTargetAtTime(0.19, ctx.currentTime, 0.18)
      on = true
      startLoop()
    }
    return on
  },
  setTrack(name) {
    if (!TRACKS[name] || name === track) return
    track = name
    if (on) startLoop()
  },
  sfx(name) {
    if (!ctx || !SFX[name]) return
    if (ctx.state === 'suspended') ctx.resume()
    SFX[name](ctx.currentTime + 0.01)
  },
}
