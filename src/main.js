import * as THREE from 'three'
import './style.css'
import { species, createCreature, animateModel } from './creatures.js'
import { initBattle } from './battle.js'
import { music } from './music.js'
import { createPlayerModel, animatePlayer } from './player.js'
import { buildEnvironment } from './environment.js'
import { buildCamp } from './camp.js'

const app = document.querySelector('#app')
app.innerHTML = `
  <main class="game-shell">
    <div id="world" aria-label="Three dimensional forest exploration scene"></div><div class="world-vignette"></div>
    <header class="topbar">
      <a class="wordmark" href="#"><span class="brand-mark"><i></i><i></i><i></i></span><span><small>FIELD JOURNAL 01</small><strong>VECTOR<span>MON</span></strong></span></a>
      <div class="location-chip"><i></i> THE GREAT FOREST <b></b> FIELD DAY 01</div>
      <nav class="top-actions" aria-label="Game menus">
        <button class="icon-button" id="music-button" aria-label="Toggle original RPG music"><svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13M9 18c0 1.1-1.6 2-3.5 2S2 19.1 2 18s1.6-2 3.5-2S9 16.9 9 18Zm12-2c0 1.1-1.6 2-3.5 2s-3.5-.9-3.5-2 1.6-2 3.5-2 3.5.9 3.5 2ZM9 9l12-2"/></svg><span>MUSIC <b id="music-state">OFF</b></span></button>
        <button class="icon-button" id="dex-button" aria-label="Open Vectodex"><svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5ZM4 17a2.5 2.5 0 0 1 2.5-2.5H20M8 7h8M8 10h5"/></svg><span>VECTODEX <b id="dex-count">00 / 50</b></span></button>
        <button class="icon-button" id="party-button" aria-label="Open party"><svg viewBox="0 0 24 24"><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.3"/><path d="M2.8 20v-1.5A5.2 5.2 0 0 1 8 13.3a5.2 5.2 0 0 1 5.2 5.2V20H2.8Zm11-.5a4.2 4.2 0 0 1 7.4-2.7V20h-7.4v-.5Z"/></svg><span>PARTY <b id="party-count">00 / 06</b></span></button>
        <button class="icon-button reset-game-button" id="new-game-button" aria-label="Start a new game and clear saved data" title="Start a new game"><svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 14h12l1-14M9 7V4h6v3"/></svg><span class="reset-game-label">NEW GAME</span></button>
      </nav>
    </header>
    <div class="scene-meta"><span>46° 18′ N <i>/</i> 12° 09′ W</span><span class="scene-weather"><b></b> CLEAR SKIES</span></div>
    <div class="reticle"><i></i><i></i><i></i><i></i><span></span></div>
    <div class="target-readout" id="target-readout" hidden><small><i></i> FIELD SIGNAL</small><strong id="target-name"></strong><span id="target-detail"></span></div>
    <div class="distance-readout" id="distance-readout" hidden><b id="distance-value">--</b><small>METERS</small></div>
    <div class="interaction-toast" id="interaction-toast" role="status"></div>
    <section class="intro-screen" id="intro-screen"><div class="intro-rule"><span>EXPEDITION 001</span><span>NEW FRONTIER</span></div><p class="intro-kicker">A FIELD NOTE FROM THE WILD</p><h1>THE GREAT<br><em>FOREST</em></h1><p class="intro-copy">Something is moving in the ferns.<br>Take it slow. See what finds you.</p><button class="begin-button" id="begin-button"><span>ENTER THE WILD</span><b>↗</b></button><div class="intro-foot"><span>12 SPECIES TRACKED</span><span>YOUR STORY STARTS HERE</span></div></section>
    <aside class="field-status"><div class="status-heading"><span>FIELD STATUS</span><b><i></i> EXPLORING</b></div><div class="stamina-row"><span>✳</span><div class="stamina-track"><i></i></div><small>VITALITY</small></div><div class="capsule-row"><span>◈</span><span>VECTOR CAPSULES</span><b id="capsule-count">12</b></div></aside>
    <div class="desktop-hints"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> MOVE</span><span><kbd>SHIFT</kbd> RUN</span><span><kbd>CTRL</kbd> SNEAK</span><span><kbd>G</kbd> CHALLENGE</span><span><kbd>F</kbd> / CLICK THROW</span><span>DRAG TO LOOK</span></div>
    <div class="mobile-controls" id="mobile-controls"><div class="joystick" id="joystick" role="application" aria-label="Movement joystick"><span class="joystick-ring"></span><span class="joystick-knob" id="joystick-knob"></span><small>MOVE</small></div><div class="touch-actions"><button class="touch-button" id="sneak-touch" aria-label="Toggle sneak"><span>⌄</span><small>SNEAK</small></button><button class="touch-button" id="run-touch" aria-label="Hold to run"><span>»</span><small>RUN</small></button><button class="throw-button" id="throw-touch" aria-label="Throw a Vector Capsule"><span>◈</span><small>THROW</small></button></div></div>
    <section class="collection-overlay" id="collection-overlay" aria-hidden="true"><div class="collection-panel"><div class="panel-topline"><span id="panel-kicker">FIELD TEAM</span><button class="close-button" id="close-panel" aria-label="Close panel">×</button></div><h2 id="panel-title">Your party <span id="party-panel-count">00 / 06</span></h2><div class="panel-tabs" role="tablist"><button class="panel-tab is-active" data-panel="party" role="tab">PARTY</button><button class="panel-tab" data-panel="dex" role="tab">VECTODEX <span id="panel-dex-count">00 / 50</span></button></div><div id="panel-content" class="panel-content"></div><div class="panel-footer"><span>FIELD JOURNAL / 001</span><span>LOCAL SAVE ACTIVE</span></div></div></section>
    <section class="orientation-gate" id="orientation-gate"><div class="rotate-glyph"><span></span><i>↻</i></div><p class="orientation-label">VECTORMON / FIELD MODE</p><h2>Turn your<br>world sideways.</h2><p class="orientation-copy">This expedition is built for landscape play.</p></section>
  </main>`

const $ = (selector) => document.querySelector(selector)
const world = $('#world')
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6))
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2
world.appendChild(renderer.domElement)
const scene = new THREE.Scene()
scene.background = new THREE.Color('#c7d0ad')
scene.fog = new THREE.FogExp2('#c7d0ad', 0.0042)
const camera = new THREE.PerspectiveCamera(57, innerWidth / innerHeight, 0.1, 360)
const clock = new THREE.Timer()
const raycaster = new THREE.Raycaster()
const GAME_DATA_PREFIX = 'vectormon-wilds-'
const SAVE_KEY = 'vectormon-wilds-save-v1'
let saved = {}
try { saved = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') } catch {}
const state = {
  player: { x: saved.player?.x ?? 0, z: saved.player?.z ?? 8, yaw: 0, pitch: 0.28 },
  keys: new Set(), touch: { x: 0, y: 0 }, run: false, sneak: false, started: false, panel: null,
  stamina: 1, capsules: saved.capsules ?? 12, caught: new Set(saved.caught ?? []), party: saved.party ?? [], storage: saved.storage ?? [], resetting: false,
  creatures: [], projectiles: [], particles: [], music: null, musicOn: false, lastSave: 0, fire: null,
}
const mat = (color, roughness = 0.9, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra })
const heightAt = (x, z) => Math.sin(x * 0.065) * 0.36 + Math.cos(z * 0.052) * 0.34 + Math.sin((x + z) * 0.035) * 0.55 - 1.15 * (1 - THREE.MathUtils.smoothstep(Math.abs(x - riverX(z)), 1.5, 10))
const riverX = (z) => 28 + Math.sin(z * 0.017) * 14
const add = (parent, geometry, material, pos, scale) => {
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(...pos)
  if (scale) mesh.scale.set(...scale)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}
const hasFighter = () => state.party.some((r) => (r.hp ?? 1) > 0)
// ---- Collision: circle colliders in a spatial grid (cheap), big ones (mountains) kept separately ----
const CELL = 8, PLAYER_R = 0.4, grid = new Map(), bigColliders = [], pushed = { x: 0, z: 0 }
const cellKey = (i, j) => i * 4096 + j
function addCollider(x, z, r) {
  const c = { x, z, r }
  if (r > 5) { bigColliders.push(c); return }
  const key = cellKey(Math.floor(x / CELL), Math.floor(z / CELL)), list = grid.get(key)
  if (list) list.push(c); else grid.set(key, [c])
}
function pushOut(x, z, radius, withBig = true, withCreatures = false) {
  const resolve = (cx, cz, cr) => {
    const dx = x - cx, dz = z - cz, min = cr + radius, d2 = dx * dx + dz * dz
    if (d2 >= min * min) return
    const d = Math.sqrt(d2), nx = d > 1e-4 ? dx / d : 1, nz = d > 1e-4 ? dz / d : 0
    x = cx + nx * min; z = cz + nz * min
  }
  for (let pass = 0; pass < 3; pass++) {
    const ci = Math.floor(x / CELL), cj = Math.floor(z / CELL)
    for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) {
      const list = grid.get(cellKey(i, j)); if (list) for (const c of list) resolve(c.x, c.z, c.r)
    }
    if (withBig) for (const c of bigColliders) resolve(c.x, c.z, c.r)
    if (withCreatures) for (const cr of state.creatures) if (!cr.caught && cr.model.visible) resolve(cr.model.position.x, cr.model.position.z, 0.9)
  }
  pushed.x = x; pushed.z = z
  return pushed
}
function capture(c, extra = {}) {
  c.caught = true; c.model.visible = false; state.caught.add(c.entry.id)
  const record = { id: c.entry.id, name: c.entry.name, type: c.entry.type, no: c.entry.no, color: `#${c.entry.color.toString(16).padStart(6, '0')}`, level: 5, ...extra }
  if (state.party.length < 6) state.party.push(record); else state.storage.push(record)
  updateHud(); save()
}
function flash() {
  const el = $('#screen-wipe'); el.style.transition = 'none'; el.style.opacity = 1; void el.offsetWidth; el.style.transition = 'opacity .7s'; el.style.opacity = 0
}
function wipe(whiteout) {
  flash(); state.battleCooldown = performance.now() + 5000
  if (whiteout) { state.player.x = 4; state.player.z = 10; toast('YOU WOKE UP AT CAMP · PARTY RESTORED') }
}
function startBattle(c) {
  if (state.battle || !state.started || state.panel) return
  if (battle.start(c)) {
    state.keys.clear(); state.run = false; state.touch.x = state.touch.y = 0; flash()
  }
}
function challengeNearestCreature() {
  if (!state.started || state.panel || state.battle) return
  if (!hasFighter()) { toast('YOUR PARTY NEEDS REST · VISIT THE CAMP'); return }
  if (performance.now() < (state.battleCooldown || 0)) { toast('CATCH YOUR BREATH BEFORE THE NEXT BATTLE'); return }
  const target = state.creatures
    .filter((c) => !c.caught && c.model.visible)
    .map((c) => ({ creature: c, distance: Math.hypot(state.player.x - c.model.position.x, state.player.z - c.model.position.z) }))
    .filter((item) => item.distance <= 10)
    .sort((a, b) => a.distance - b.distance)[0]
  if (!target) { toast('NO VECTORMON NEARBY'); return }
  startBattle(target.creature)
}
function save() {
  if (state.resetting) return
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ player: { x: state.player.x, z: state.player.z }, capsules: state.capsules, caught: [...state.caught], party: state.party, storage: state.storage })) } catch { toast('SAVE UNAVAILABLE') }
}
function resetGame() {
  if (!confirm('Start a new expedition? This clears your party, Vectodex, capsules and saved location.')) return
  state.resetting = true
  window.removeEventListener('pagehide', save)
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (key?.startsWith(GAME_DATA_PREFIX)) localStorage.removeItem(key)
    }
    for (let i = 0; i < localStorage.length; i++) {
      if (localStorage.key(i)?.startsWith(GAME_DATA_PREFIX)) throw new Error('Game data remains after reset')
    }
  } catch {
    state.resetting = false
    window.addEventListener('pagehide', save)
    toast('SAVE DATA COULD NOT BE CLEARED')
    return
  }
  location.reload()
}

function createWorld() {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color('#5f9fc8') }, mid: { value: new THREE.Color('#dfe3bd') } },
    vertexShader: 'varying float h; void main() { h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; varying float h; void main() { gl_FragColor = vec4(mix(mid, top, smoothstep(0.0, 0.55, h)), 1.0);\n #include <tonemapping_fragment>\n #include <colorspace_fragment>\n }',
  }))
  sky.renderOrder = -1; scene.add(sky); state.sky = sky
  const skirt = new THREE.Mesh(new THREE.CircleGeometry(600, 24), new THREE.MeshBasicMaterial({ color: 0x6d8453 }))
  skirt.rotation.x = -Math.PI / 2; skirt.position.y = -1.6; scene.add(skirt)
  scene.add(new THREE.HemisphereLight(0xf2e8c7, 0x526746, 2.15))
  const sun = new THREE.DirectionalLight(0xffe3a8, 3.25)
  sun.position.set(-48, 74, 35)
  sun.castShadow = true
  sun.shadow.mapSize.set(1280, 1280)
  Object.assign(sun.shadow.camera, { left: -74, right: 74, top: 74, bottom: -74 })
  sun.shadow.bias = -0.00018
  scene.add(sun, sun.target); state.sun = sun
  const terrainGeo = new THREE.PlaneGeometry(250, 250, 170, 170)
  const positions = terrainGeo.attributes.position
  for (let i = 0; i < positions.count; i++) positions.setZ(i, heightAt(positions.getX(i), -positions.getY(i)))
  terrainGeo.computeVertexNormals()
  const colors = new Float32Array(positions.count * 3), grassA = new THREE.Color(0x6a8a50), grassB = new THREE.Color(0x8c9b5b), sand = new THREE.Color(0xb9b27e), tmp = new THREE.Color(), mud = new THREE.Color(0x6b6048), dirt = new THREE.Color(0x9a845a)
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = -positions.getY(i), n = (Math.sin(x * 0.21) * Math.cos(z * 0.17) + Math.sin(x * 0.05 + z * 0.07) + 2) / 4
    const bank = THREE.MathUtils.clamp((11 - Math.abs(x - riverX(z))) / 5, 0, 1)
    tmp.copy(grassA).lerp(grassB, n).lerp(sand, bank * 0.75).lerp(mud, (1 - THREE.MathUtils.smoothstep(Math.abs(x - riverX(z)), 2.5, 7)) * 0.9).lerp(dirt, Math.max(Math.abs(x) < 3.4 && z > -7 && z < 86 ? 1 - THREE.MathUtils.smoothstep(Math.abs(x), 1.4, 3.4) : 0, 1 - THREE.MathUtils.smoothstep(Math.hypot(x - 8, z - 14), 4, 8)) * 0.8); colors.set([tmp.r, tmp.g, tmp.b], i * 3)
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const terrain = new THREE.Mesh(terrainGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }))
  terrain.rotation.x = -Math.PI / 2
  terrain.position.y = 0
  terrain.receiveShadow = true
  scene.add(terrain)
  state.env = buildEnvironment({ scene, heightAt, riverX, addCollider })
  createCamp()
  createMotes()
  createCreatures()
  createPlayer()
}
function createMotes() {
  const n = 420, pos = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { const x = (Math.random() - 0.5) * 150, z = (Math.random() - 0.5) * 150; pos.set([x, heightAt(x, z) + 0.7 + Math.random() * 3.6, z], i * 3) }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  state.motes = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xfff1b0, size: 0.17, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }))
  scene.add(state.motes)
}
function createCamp() { state.camp = buildCamp({ scene, heightAt, addCollider }) }
function createCreatures() {
  state.creatures = species.filter((entry) => !state.caught.has(entry.id)).map((entry, i) => {
    const model = createCreature(entry), [x, z] = entry.home
    model.position.set(x, heightAt(x, z), z); model.rotation.y = Math.atan2(state.player.x - x, state.player.z - z); scene.add(model)
    return { entry, model, homeX: x, homeZ: z, targetX: x, targetZ: z, phase: i * 2.1, awareness: 0, caught: false }
  })
}
function createPlayer() {
  const model = createPlayerModel()
  model.position.set(state.player.x, heightAt(state.player.x, state.player.z), state.player.z); scene.add(model); state.playerModel = model
}
function targetInSight() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera)
  const objects = []
  for (const creature of state.creatures) if (!creature.caught && creature.model.visible && creature.model.position.distanceTo(camera.position) < 36) creature.model.traverse((obj) => { if (obj.isMesh) objects.push(obj) })
  const hit = raycaster.intersectObjects(objects, false)[0]
  return hit && hit.distance < 32 ? state.creatures.find((creature) => !creature.caught && creature.model.getObjectById(hit.object.id)) : null
}
function throwCapsule() {
  if (!state.started || state.panel) return
  if (state.battle) return
  const target = targetInSight()
  if (!target) { toast('AIM AT A VECTORMON · NO CAPSULE SPENT'); return }
  if (hasFighter()) { startBattle(target); return }
  if (!state.capsules) { toast('OUT OF VECTOR CAPSULES'); return }
  state.capsules--; updateHud(); save()
  const origin = camera.position.clone(), destination = target.model.position.clone().add(new THREE.Vector3(0, 1, 0))
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.23, 1), new THREE.MeshStandardMaterial({ color: 0xf4d27d, metalness: 0.18, roughness: 0.28, emissive: 0xa56632, emissiveIntensity: 0.5 }))
  mesh.position.copy(origin); scene.add(mesh); state.projectiles.push({ mesh, origin, destination, target, start: performance.now() })
  toast(`VECTOR CAPSULE → ${target.entry.name.toUpperCase()}`)
}
function resolveThrow(projectile) {
  const target = projectile.target
  if (!target || target.caught) return
  const surprise = state.sneak && target.awareness < 0.46
  const chance = THREE.MathUtils.clamp(target.entry.chance + (surprise ? 0.13 : 0) - target.awareness * 0.2, 0.18, 0.94)
  if (camera.position.distanceTo(target.model.position) < 27 && Math.random() < chance) {
    capture(target)
    for (let i = 0; i < 18; i++) {
      const particle = new THREE.Mesh(new THREE.IcosahedronGeometry(0.08, 0), new THREE.MeshBasicMaterial({ color: target.entry.color, transparent: true }))
      particle.position.copy(target.model.position).add(new THREE.Vector3(0, 1, 0)); scene.add(particle)
      state.particles.push({ mesh: particle, velocity: new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 4 + 1, (Math.random() - 0.5) * 4), life: 1 })
    }
    toast(`${target.entry.name.toUpperCase()} JOINED YOUR PARTY`); updateHud(); save()
    if (state.caught.size === species.length) setTimeout(() => toast('EXPEDITION COMPLETE · ALL SPECIES DOCUMENTED'), 2300)
  } else { target.awareness = 1; toast(surprise ? 'IT SLIPPED AWAY · TRY AGAIN' : 'IT SAW THAT COMING · TRY SNEAKING') }
}
function updatePlayer(dt) {
  let f = (state.keys.has('KeyW') || state.keys.has('ArrowUp') ? 1 : 0) - (state.keys.has('KeyS') || state.keys.has('ArrowDown') ? 1 : 0) - state.touch.y
  let s = (state.keys.has('KeyD') || state.keys.has('ArrowRight') ? 1 : 0) - (state.keys.has('KeyA') || state.keys.has('ArrowLeft') ? 1 : 0) + state.touch.x
  if (state.panel || !state.started) { f = 0; s = 0 }
  const length = Math.hypot(f, s); if (length > 1) { f /= length; s /= length }
  const wantsRun = !state.sneak && length > 0.1 && (state.run || state.keys.has('ShiftLeft') || state.keys.has('ShiftRight'))
  if (state.stamina <= 0.02 && !state.winded) { state.winded = true; toast('OUT OF BREATH · CATCH YOUR BREATH') } else if (state.stamina > 0.3) state.winded = false
  const running = wantsRun && !state.winded
  state.stamina = THREE.MathUtils.clamp(state.stamina + dt * (running ? -0.2 : length > 0.1 ? 0.12 : 0.28), 0, 1)
  const wading = Math.abs(state.player.x - riverX(state.player.z)) < 5.2
  const speed = (state.sneak ? 2.3 : running ? 8.5 : 5.1) * (wading ? 0.62 : 1)
  const atCamp = Math.hypot(state.player.x - 6.7, state.player.z - 13.6) < 7
  if (state.started && state.capsules < 12 && atCamp) {
    state.campTimer = (state.campTimer || 0) + dt
    if (state.campTimer > 1.2) { state.campTimer = 0; state.capsules++; updateHud(); save(); toast('CAMP SUPPLIES · +1 CAPSULE') }
  } else state.campTimer = 0
  if (state.started && !state.battle) music.setTrack(atCamp ? 'camp' : 'explore')
  if (state.started && Math.hypot(state.player.x - 6.7, state.player.z - 13.6) < 7 && state.party.some((r) => r.hp != null)) {
    state.party.forEach((r) => delete r.hp); updateHud(); save(); toast('CAMP FIRE · PARTY RESTORED')
  }
  const yaw = state.player.yaw, dx = (-Math.sin(yaw) * f + Math.cos(yaw) * s) * speed * dt, dz = (-Math.cos(yaw) * f - Math.sin(yaw) * s) * speed * dt
  const prevX = state.player.x, prevZ = state.player.z
  const hit = pushOut(THREE.MathUtils.clamp(prevX + dx, -112, 112), THREE.MathUtils.clamp(prevZ + dz, -112, 112), PLAYER_R, true, true)
  state.player.x = hit.x; state.player.z = hit.z
  const actualSpeed = Math.hypot(state.player.x - prevX, state.player.z - prevZ) / Math.max(dt, 0.001)
  const y = heightAt(state.player.x, state.player.z)
  state.playerModel.position.set(state.player.x, y, state.player.z)
  if (length > 0.1) { let diff = Math.atan2(dx, dz) - state.playerModel.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff)); state.playerModel.rotation.y += diff * (1 - Math.exp(-dt * 14)) }
  animatePlayer(state.playerModel, dt, THREE.MathUtils.clamp(actualSpeed / 4.5, 0, 1), running, state.sneak)
  const d = 7.6, pitch = state.player.pitch
  camera.position.lerp(new THREE.Vector3(state.player.x + Math.sin(yaw) * Math.cos(pitch) * d, y + 1.35 + Math.sin(pitch) * d, state.player.z + Math.cos(yaw) * Math.cos(pitch) * d), 1 - Math.exp(-dt * 8))
  if (camera.position.y < y + 4.2) { const c = pushOut(camera.position.x, camera.position.z, 0.5, false); camera.position.x = c.x; camera.position.z = c.z }
  camera.position.y = Math.max(camera.position.y, heightAt(camera.position.x, camera.position.z) + 0.8)
  camera.lookAt(state.player.x, y + 1.48, state.player.z)
  state.sky.position.copy(camera.position)
  state.sun.position.set(state.player.x - 48, 74, state.player.z + 35); state.sun.target.position.set(state.player.x, 0, state.player.z); state.sun.target.updateMatrixWorld()
}
function updateCreatures(dt, now) {
  for (const c of state.creatures) {
    if (c.caught && c.respawn && now > c.respawn) {
      c.caught = false; c.respawn = 0; c.awareness = 0; c.model.visible = true
      c.model.position.set(c.homeX, heightAt(c.homeX, c.homeZ), c.homeZ)
    }
    if (c.caught) continue
    const dx = state.player.x - c.model.position.x, dz = state.player.z - c.model.position.z, dist = Math.hypot(dx, dz), radius = state.sneak ? 5.2 : 10
    c.model.visible = dist < 110
    if (!c.model.visible) continue
    if (dist < 2.8 && !state.battle && state.started && !state.panel && hasFighter() && now > (state.battleCooldown || 0)) { startBattle(c); return }
    animateModel(c.model, now / 1000 + c.phase)
    if (dist < radius) c.awareness = Math.min(1, c.awareness + dt * (state.sneak ? 0.3 : 0.6)); else c.awareness = Math.max(0, c.awareness - dt * 0.08)
    let mx = 0, mz = 0, speed = 0
    if (dist < radius && c.awareness > 0.42) { mx = -dx / Math.max(dist, 0.01); mz = -dz / Math.max(dist, 0.01); speed = 2.5 + c.awareness * 1.8 }
    else {
      if (Math.hypot(c.targetX - c.model.position.x, c.targetZ - c.model.position.z) < 1.2) { c.targetX = c.homeX + Math.sin(now * 0.00021 + c.phase) * 4.5; c.targetZ = c.homeZ + Math.cos(now * 0.00017 + c.phase) * 4.5 }
      mx = c.targetX - c.model.position.x; mz = c.targetZ - c.model.position.z; const n = Math.hypot(mx, mz); mx /= Math.max(n, 0.01); mz /= Math.max(n, 0.01); speed = n > 1.2 ? 0.72 : 0
    }
    c.model.userData.move = speed > 0.2 ? Math.min(1, speed / 3.6) : 0
    c.model.position.x += mx * speed * dt; c.model.position.z += mz * speed * dt
    const q = pushOut(c.model.position.x, c.model.position.z, 0.9); c.model.position.x = q.x; c.model.position.z = q.z
    const ox = c.model.position.x - c.homeX, oz = c.model.position.z - c.homeZ, off = Math.hypot(ox, oz)
    if (off > 30) { c.model.position.x = c.homeX + ox * 30 / off; c.model.position.z = c.homeZ + oz * 30 / off }
    c.model.position.y = heightAt(c.model.position.x, c.model.position.z) + (c.model.userData.hover || 0) + Math.sin(now * 0.004 + c.phase) * 0.07
    if (speed > 0.2) { let d = Math.atan2(mx, mz) - c.model.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); c.model.rotation.y += d * Math.min(1, dt * 9) }
    c.model.rotation.z = Math.sin(now * 0.006 + c.phase) * 0.035
  }
}
function updateFx(dt, now) {
  state.env?.update(now)
  if (state.motes) { state.motes.position.set(Math.sin(now * 0.0003) * 1.6, Math.sin(now * 0.0009) * 0.3, Math.cos(now * 0.00025) * 1.6) }
  state.camp?.update(now)
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i], t = Math.min(1, (now - p.start) / 560)
    if (p.target && !p.target.caught) p.destination.set(p.target.model.position.x, p.target.model.position.y + 1, p.target.model.position.z)
    p.mesh.position.lerpVectors(p.origin, p.destination, t); p.mesh.position.y += Math.sin(t * Math.PI) * 2.3; p.mesh.rotation.x += dt * 12
    if (t >= 1) { resolveThrow(p); scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); state.projectiles.splice(i, 1) }
  }
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i]; p.life -= dt; p.mesh.position.addScaledVector(p.velocity, dt); p.velocity.y -= dt * 3; p.mesh.material.opacity = Math.max(0, p.life)
    if (p.life <= 0) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); state.particles.splice(i, 1) }
  }
}
let toastTimer
function toast(message) { const el = $('#interaction-toast'); el.textContent = message; el.classList.add('is-visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2100) }
function updateHud() {
  $('#capsule-count').textContent = String(state.capsules).padStart(2, '0'); $('#party-count').textContent = `${String(state.party.length).padStart(2, '0')} / 06`; $('#dex-count').textContent = `${String(state.caught.size).padStart(2, '0')} / 50`
  $('#party-panel-count').textContent = `${String(state.party.length).padStart(2, '0')} / 06`; $('#panel-dex-count').textContent = `${String(state.caught.size).padStart(2, '0')} / 50`
}
function panel(mode) {
  if (state.battle) return
  if (document.pointerLockElement) document.exitPointerLock()
  state.panel = mode; const overlay = $('#collection-overlay'); overlay.classList.add('is-open'); overlay.setAttribute('aria-hidden', 'false'); renderPanel()
}
function closePanel() { state.panel = null; $('#collection-overlay').classList.remove('is-open'); $('#collection-overlay').setAttribute('aria-hidden', 'true') }
function renderPanel() {
  const dex = state.panel === 'dex'; $('#panel-kicker').textContent = dex ? 'FIELD ARCHIVE / 050' : 'FIELD TEAM / 006'; $('#panel-title').innerHTML = `${dex ? 'Vectodex' : 'Your party'} <span id="party-panel-count">${String(state.party.length).padStart(2, '0')} / 06</span>`
  document.querySelectorAll('.panel-tab').forEach((tab) => tab.classList.toggle('is-active', tab.dataset.panel === state.panel))
  if (dex) {
    const entries = species.map((entry) => { const caught = state.caught.has(entry.id); return `<article class="dex-entry ${caught ? '' : 'is-undiscovered'}"><span class="entry-number">NO. ${entry.no}</span><div class="entry-creature" style="--entry-color:#${entry.color.toString(16).padStart(6, '0')}"><span></span></div><div class="entry-copy"><h3>${caught ? entry.name : 'Undiscovered'}</h3><p>${caught ? `${entry.type} · ${entry.rarity}` : 'A signal in the field'}</p><small>${caught ? entry.note : 'Habitat unknown'}</small></div><span class="entry-status">${caught ? 'CAUGHT' : '???'}</span></article>` }).join('')
    $('#panel-content').innerHTML = `<div class="dex-summary"><b>${String(state.caught.size).padStart(2, '0')}</b><span>OF 50 SPECIES DOCUMENTED</span><i></i><span>47 FIELD NOTES SEALED</span></div><div class="entry-list">${entries}</div>`
  } else {
    const slots = state.party.map((entry, i) => `<article class="party-slot occupied"><span class="slot-number">0${i + 1}</span><div class="party-orb" style="--entry-color:${entry.color}"><span></span></div><div class="party-copy"><h3>${entry.name}</h3><p>${entry.type} · LV ${entry.level || 5}</p></div><span class="party-status">READY</span></article>`)
    for (let i = slots.length; i < 6; i++) slots.push(`<article class="party-slot empty"><span class="slot-number">0${i + 1}</span><div class="empty-orb">+</div><div class="party-copy"><h3>Open slot</h3><p>WAITING FOR A FRIEND</p></div><span class="party-status">EMPTY</span></article>`)
    const storage = state.storage.length ? `<div class="storage-heading">FIELD STORAGE <span>${state.storage.length} CREATURES</span></div><div class="storage-list">${state.storage.map((item) => `<span><i style="--entry-color:${item.color}"></i>${item.name}</span>`).join('')}</div>` : ''
    $('#panel-content').innerHTML = `<div class="party-grid">${slots.join('')}</div>${storage}<button class="reset-button" id="reset-save">NEW EXPEDITION</button>`
  }
  updateHud()
}
function musicToggle() {
  const on = music.toggle()
  if (on === null) { toast('AUDIO IS NOT AVAILABLE'); return }
  $('#music-button').classList.toggle('is-playing', on); $('#music-state').textContent = on ? 'ON' : 'OFF'
}
function orientation() { const touch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0; $('#orientation-gate').classList.toggle('is-visible', touch && matchMedia('(orientation: portrait)').matches) }
async function enterWorld() {
  if (state.started) return
  state.started = true; $('#intro-screen').classList.add('is-dismissed')
  if (matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0) {
    try { if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); if (screen.orientation?.lock) await screen.orientation.lock('landscape') } catch { orientation() }
  }
  orientation(); musicToggle(); toast('STAY QUIET. SOMETHING IS NEARBY.')
}
function look(dx, dy) { state.player.yaw -= dx * 0.0034; state.player.pitch = THREE.MathUtils.clamp(state.player.pitch + dy * 0.0022, -0.04, 0.78) }
function attachControls() {
  window.addEventListener('keydown', (e) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault()
    if (e.code === 'Escape') state.panel ? closePanel() : state.started ? panel('party') : enterWorld()
    if (e.code === 'KeyG' && !e.repeat) challengeNearestCreature()
    if (e.code === 'KeyF' && !e.repeat) throwCapsule()
    if (e.code === 'KeyV' && !e.repeat) panel('dex')
    if (e.code === 'Tab' && !e.repeat) { e.preventDefault(); panel('party') }
    if (e.code.startsWith('Key') || e.code.startsWith('Arrow') || e.code.startsWith('Shift')) state.keys.add(e.code)
    if (e.code === 'ControlLeft' || e.code === 'ControlRight') state.sneak = true
  })
  window.addEventListener('keyup', (e) => { state.keys.delete(e.code); if (e.code === 'ControlLeft' || e.code === 'ControlRight') state.sneak = false })
  window.addEventListener('blur', () => { state.keys.clear(); state.run = false })
  document.addEventListener('visibilitychange', () => { if (document.hidden) save() }); window.addEventListener('pagehide', save)
  let pointer = null, lookPointer = null
  renderer.domElement.addEventListener('pointerdown', (e) => {
    if (state.battle) return
    if (e.pointerType === 'mouse' && e.button === 0 && document.pointerLockElement === renderer.domElement) throwCapsule()
    if (e.pointerType === 'mouse') { if (state.started && !state.panel && renderer.domElement.requestPointerLock && document.pointerLockElement !== renderer.domElement) renderer.domElement.requestPointerLock(); pointer = { x: e.clientX, y: e.clientY } }
    else { lookPointer = { id: e.pointerId, x: e.clientX, y: e.clientY }; renderer.domElement.setPointerCapture(e.pointerId) }
  })
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (document.pointerLockElement === renderer.domElement) look(e.movementX, e.movementY)
    else if (pointer && e.pointerType === 'mouse') { look(e.clientX - pointer.x, e.clientY - pointer.y); pointer = { x: e.clientX, y: e.clientY } }
    else if (lookPointer?.id === e.pointerId) { look(e.clientX - lookPointer.x, e.clientY - lookPointer.y); lookPointer.x = e.clientX; lookPointer.y = e.clientY }
  })
  renderer.domElement.addEventListener('pointerup', () => { pointer = null; lookPointer = null })
  $('#begin-button').addEventListener('click', enterWorld); $('#music-button').addEventListener('click', musicToggle); $('#dex-button').addEventListener('click', () => panel('dex')); $('#party-button').addEventListener('click', () => panel('party')); $('#new-game-button').addEventListener('click', resetGame); $('#close-panel').addEventListener('click', closePanel)
  document.querySelectorAll('.panel-tab').forEach((tab) => tab.addEventListener('click', () => { state.panel = tab.dataset.panel; renderPanel() }))
  $('#panel-content').addEventListener('click', (e) => { if (e.target.closest('#reset-save')) resetGame() })
  $('#collection-overlay').addEventListener('pointerdown', (e) => { if (e.target.id === 'collection-overlay') closePanel() })
  $('#throw-touch').addEventListener('click', throwCapsule)
  $('#sneak-touch').addEventListener('click', () => { state.sneak = !state.sneak; $('#sneak-touch').classList.toggle('is-active', state.sneak); toast(state.sneak ? 'SNEAKING · MOVE QUIETLY' : 'STANDING TALL') })
  $('#run-touch').addEventListener('pointerdown', (e) => { e.preventDefault(); state.run = true; $('#run-touch').classList.add('is-active') })
  for (const type of ['pointerup', 'pointercancel', 'pointerleave']) $('#run-touch').addEventListener(type, () => { state.run = false; $('#run-touch').classList.remove('is-active') })
  const stick = $('#joystick'), knob = $('#joystick-knob'); let stickId = null
  const moveStick = (e) => {
    if (stickId !== e.pointerId) return
    const rect = stick.getBoundingClientRect(), max = rect.width * 0.31, dx = e.clientX - rect.left - rect.width / 2, dy = e.clientY - rect.top - rect.height / 2, factor = Math.min(1, max / Math.max(Math.hypot(dx, dy), 0.01)), x = dx * factor, y = dy * factor
    state.touch.x = x / max; state.touch.y = y / max; knob.style.transform = `translate(${x}px,${y}px)`
  }
  stick.addEventListener('pointerdown', (e) => { stickId = e.pointerId; stick.setPointerCapture(e.pointerId); moveStick(e) }); stick.addEventListener('pointermove', moveStick)
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) stick.addEventListener(type, () => { stickId = null; state.touch.x = state.touch.y = 0; knob.style.transform = 'translate(0,0)' })
  window.addEventListener('resize', resize); window.addEventListener('orientationchange', orientation); matchMedia('(orientation: portrait)').addEventListener?.('change', orientation)
}
function resize() { renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6)); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); battle.resize(); orientation() }
let lastUi = 0, inBattle = false
const setBattleMode = (on) => { if (on !== inBattle) { inBattle = on; $('.game-shell').classList.toggle('in-battle', on) } }
function animate() {
  clock.update()
  const dt = Math.min(clock.getDelta(), 0.04), now = performance.now()
  if (battle.active()) { setBattleMode(true); battle.render(now); return }
  setBattleMode(false)
  updatePlayer(dt); updateCreatures(dt, now); updateFx(dt, now)
  if (now - lastUi > 160) {
    const target = targetInSight()
    $('#target-readout').hidden = !target; $('#distance-readout').hidden = !target; $('.reticle').classList.toggle('is-targeting', !!target)
    if (target) { $('#target-name').textContent = target.entry.name.toUpperCase(); $('#target-detail').textContent = `${target.entry.type} · ${target.entry.rarity} · ${target.awareness < 0.2 ? 'CALM' : target.awareness < 0.42 ? 'WARY' : 'SPOOKED'}`; $('#distance-value').textContent = Math.round(camera.position.distanceTo(target.model.position)) }
    $('.stamina-track i').style.width = `${Math.round(state.stamina * 100)}%`
    lastUi = now
  }
  if (state.started && now - state.lastSave > 10000) { save(); state.lastSave = now }
  renderer.render(scene, camera)
}
$('.game-shell').insertAdjacentHTML('beforeend', '<div id="screen-wipe"></div>')
const battle = initBattle({ renderer, state, toast, save, updateHud, capture, music, wipe })
createWorld(); updateHud(); renderPanel(); attachControls(); orientation(); renderer.setAnimationLoop(animate)
