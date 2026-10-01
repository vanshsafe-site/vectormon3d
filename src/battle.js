import * as THREE from 'three'
import { buildArena, ALLY_POS, FOE_POS } from './battleEnv.js'
import { CHART, MOVES, TYPE_COLOR, byId, createCreature, animateModel, statsFor } from './creatures.js'
import { createFx } from './fx.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const eff = (mt, dt) => CHART[mt]?.[dt] ?? 1
export function initBattle({ renderer, state, toast, save, updateHud, capture, music, wipe }) {
  const root = document.createElement('section'); root.className = 'battle-ui'; root.hidden = true
  root.innerHTML = `<div class="b-card b-foe"><div><strong id="bf-name"></strong><em id="bf-type"></em></div><span id="bf-lv"></span><div class="b-bar"><i id="bf-hp"></i></div></div>
  <div class="b-card b-ally"><div><strong id="ba-name"></strong><em id="ba-type"></em></div><span id="ba-lv"></span><div class="b-bar"><i id="ba-hp"></i></div><small id="ba-txt"></small><div class="b-bar xp"><i id="ba-xp"></i></div></div>
  <div class="b-log" id="b-log"></div><div class="b-menu" id="b-menu"></div>`
  document.querySelector('.game-shell').appendChild(root)
  const $ = (s) => root.querySelector(s), log = $('#b-log'), menu = $('#b-menu')

  const scene = new THREE.Scene()
  const cam = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 700)
  const arena = buildArena(scene)
  const fx = createFx(scene)
  let B = null

  const fighter = (rec, e, lv, side) => {
    const s = statsFor(e, lv), f = { rec, e, lv, ...s, maxHp: s.hp, side }
    f.hp = rec?.hp != null ? Math.min(rec.hp, s.hp) : s.hp; f.model = createCreature(e); f.model.scale.setScalar(side === 'ally' ? 1.25 : 1.1)
    const home = side === 'ally' ? ALLY_POS.clone() : FOE_POS.clone(); f.home = home; f.model.position.copy(home)
    scene.add(f.model); return f
  }
  const face = (a, b) => { a.model.rotation.y = Math.atan2(b.home.x - a.home.x, b.home.z - a.home.z) }
  const say = (t) => { log.textContent = t; log.classList.add('show') }
  const setCard = (f) => {
    const p = f.side === 'ally' ? 'ba' : 'bf', pct = Math.max(0, f.hp / f.maxHp * 100)
    $(`#${p}-name`).textContent = f.e.name; $(`#${p}-type`).textContent = f.e.type; $(`#${p}-type`).style.background = TYPE_COLOR[f.e.type]; $(`#${p}-lv`).textContent = `Lv ${f.lv}`
    const bar = $(`#${p}-hp`); bar.style.width = pct + '%'; bar.dataset.low = pct < 25 ? 2 : pct < 50 ? 1 : 0
    if (f.side === 'ally') { $('#ba-txt').textContent = `${Math.max(0, Math.ceil(f.hp))} / ${f.maxHp}`; $('#ba-xp').style.width = ((f.rec.xp || 0) / (f.lv * 8) * 100) + '%' }
  }
  const burst = (pos, color, n = 22) => fx.burst(pos, color, n)
  const tween = (ms, fn) => new Promise((res) => { const t0 = performance.now(); const loop = () => { const t = Math.min(1, (performance.now() - t0) / ms); fn(t); t < 1 ? requestAnimationFrame(loop) : res() }; loop() })

  async function attack(a, d, key) {
    const [name, type, power] = MOVES[key]; say(`${a.e.name} used ${name}!`); await sleep(500)
    const from = a.model.position.clone(), to = d.model.position.clone().lerp(from, 0.35)
    a.model.userData.move = 1
    await tween(260, (t) => a.model.position.lerpVectors(from, to, Math.sin(t * Math.PI / 2)).y += Math.sin(t * Math.PI) * 0.5)
    a.model.userData.move = 0
    if (Math.random() > 0.95) { say(`${a.e.name}'s attack missed!`); await tween(240, (t) => a.model.position.lerpVectors(to, a.home, t)); return }
    const e = eff(type, d.e.type), stab = type === a.e.type ? 1.5 : 1, crit = Math.random() < 0.0625 ? 1.5 : 1
    const dmg = Math.max(1, Math.floor(((2 * a.lv / 5 + 2) * power * a.atk / d.def / 50 + 2) * stab * e * crit * (0.85 + Math.random() * 0.15)))
    const impactPos = d.model.position.clone().add(new THREE.Vector3(0, 1.1, 0))
    fx.cast(key, a.model.position.clone(), impactPos, type, d.model.position.y)
    fx.impact(type, impactPos, { k: e > 1 ? 1.3 : 1 })
    burst(impactPos, new THREE.Color(TYPE_COLOR[type]), e > 1 ? 36 : 22); music.sfx(e > 1 ? 'super' : 'hit')
    const dp = d.model.position.clone(); tween(300, (t) => { d.model.position.x = dp.x + Math.sin(t * 40) * 0.18 * (1 - t) })
    d.hp = Math.max(0, d.hp - dmg); if (d.rec) d.rec.hp = d.hp; setCard(d)
    await tween(240, (t) => a.model.position.lerpVectors(to, a.home, t)); a.model.position.copy(a.home)
    const msg = [crit > 1 ? 'A critical hit!' : '', e > 1 ? "It's super effective!" : e < 1 ? "It's not very effective…" : ''].filter(Boolean).join(' ')
    if (msg) { say(msg); await sleep(750) }
  }
  const faint = async (f) => { say(`${f.e.name} fainted!`); await tween(600, (t) => { f.model.position.y = f.home.y - t * 1.4; f.model.scale.setScalar((f.side === 'ally' ? 1.25 : 1.1) * (1 - t * 0.6)) }); f.model.visible = false; await sleep(400) }
  const pickAI = () => { const f = B.foe; if (Math.random() < 0.3) return f.e.moves[Math.floor(Math.random() * 4)]; return f.e.moves.map((k) => [k, MOVES[k][2] * eff(MOVES[k][1], B.ally.e.type) * (MOVES[k][1] === f.e.type ? 1.5 : 1)]).sort((x, y) => y[1] - x[1])[0][0] }

  async function turn(action) {
    B.busy = true; menu.innerHTML = ''; const { ally, foe } = B
    const order = []
    if (action.k === 'move') order.push([ally, foe, action.m], [foe, ally, pickAI()]); else order.push([foe, ally, pickAI()])
    if (action.k === 'move' && foe.spd > ally.spd + (Math.random() < 0.1 ? 40 : 0)) order.reverse()
    for (const [a, d, m] of order) {
      if (a.hp <= 0 || d.hp <= 0) continue
      await attack(a, d, m)
      if (d.hp <= 0) { if (d === foe) return win(); await faint(d); return allyDown() }
    }
    B.busy = false; mainMenu()
  }
  async function win() {
    const { ally, foe } = B; await faint(foe); music.sfx('win'); music.setTrack('victory'); const xp = 6 + foe.lv * 2; say(`${foe.e.name} was defeated! ${ally.e.name} gained ${xp} XP.`)
    const r = ally.rec; r.level = r.level || 5; r.xp = (r.xp || 0) + xp; await sleep(1400)
    while (r.xp >= r.level * 8 && r.level < 50) { r.xp -= r.level * 8; r.level++; say(`${ally.e.name} grew to level ${r.level}!`); const s = statsFor(ally.e, r.level); r.hp = Math.min(s.hp, (r.hp ?? s.hp) + 6); await sleep(1400) }
    B.foeRef.respawn = performance.now() + 50000; B.foeRef.caught = true; B.foeRef.model.visible = false; end()
  }
  async function allyDown() {
    const next = state.party.find((r) => (r.hp ?? 1) > 0 && r !== B.ally.rec)
    if (!next) { music.sfx('lose'); music.setTrack('defeat'); say('You have no Vectormon left! You rush back to camp…'); await sleep(1800); state.party.forEach((r) => delete r.hp); end(true); return }
    B.busy = false; switchMenu(true)
  }
  function end(whiteout) {
    root.hidden = true; scene.remove(B.ally?.model, B.foe.model); state.battle = null; B = null; music.setTrack('explore'); wipe?.(whiteout); updateHud(); save()
  }
  const hpOf = (r) => { const e = byId(r.id), s = statsFor(e, r.level || 5); return [r.hp ?? s.hp, s.hp] }
  const btn = (act, label, sub = '', extra = '') => `<button data-act="${act}" ${extra}><b>${label}</b><small>${sub}</small></button>`
  function mainMenu() {
    say(`What will ${B.ally.e.name} do?`)
    menu.innerHTML = btn('fight', 'FIGHT', 'Use a move') + btn('capsule', 'CAPSULE', `${state.capsules} left`) + btn('switch', 'SWITCH', 'Change partner') + btn('run', 'RUN', 'Flee the fight')
  }
  function moveMenu() { menu.innerHTML = B.ally.e.moves.map((k) => { const [n, t, p] = MOVES[k], x = eff(t, B.foe.e.type); return `<button data-act="move" data-m="${k}" style="--c:${TYPE_COLOR[t]}"><b>${n}</b><small>${t} · ${p}${x > 1 ? ' · ▲' : x < 1 ? ' · ▼' : ''}</small></button>` }).join('') + btn('back', '‹ BACK') }
  function switchMenu(forced) { menu.innerHTML = state.party.map((r, i) => { const [h, m] = hpOf(r), e = byId(r.id); return btn('sw', e.name, `Lv ${r.level || 5} · ${h}/${m}`, `data-i="${i}" ${h <= 0 || r === B.ally.rec ? 'disabled' : ''}`) }).join('') + (forced ? '' : btn('back', '‹ BACK')) }
  async function swapIn(i) {
    B.busy = true; menu.innerHTML = ''; const old = B.ally, rec = state.party[i]; say(`Come back, ${old.e.name}!`); await sleep(500); scene.remove(old.model)
    B.ally = fighter(rec, byId(rec.id), rec.level || 5, 'ally'); face(B.ally, B.foe); face(B.foe, B.ally); setCard(B.ally); say(`Go, ${B.ally.e.name}!`); burst(B.ally.home.clone().add(new THREE.Vector3(0, 1, 0)), 0xffffff, 18); await sleep(800)
    if (old.hp > 0) await turn({ k: 'swap' }); else { B.busy = false; mainMenu() }
  }
  async function throwCapsule() {
    if (!state.capsules) { say('Out of Vector Capsules!'); return }
    B.busy = true; menu.innerHTML = ''; state.capsules--; updateHud(); save(); const { foe } = B; say('You threw a Vector Capsule!')
    const cap = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 3), new THREE.MeshStandardMaterial({ color: 0xf4d27d, metalness: 0.3, roughness: 0.25, emissive: 0xa56632, emissiveIntensity: 0.5 })); fx.add(cap)
    const a = new THREE.Vector3(-2.6, 1.6, 3.4), b = foe.model.position.clone().add(new THREE.Vector3(0, 1, 0)); await tween(600, (t) => { cap.position.lerpVectors(a, b, t); cap.position.y += Math.sin(t * Math.PI) * 2; cap.rotation.x += 0.3 })
    foe.model.visible = false; cap.position.copy(foe.home).add(new THREE.Vector3(0, 0.45, 0))
    const p = THREE.MathUtils.clamp(foe.e.chance * 0.5 + (1 - foe.hp / foe.maxHp) * 0.6 + 0.05, 0.08, 0.97)
    let ok = false
    for (let i = 0; i < 3; i++) {
      await sleep(650); music.sfx('shake'); await tween(300, (t) => cap.rotation.z = Math.sin(t * Math.PI * 2) * 0.5)
      const roll = Math.random()
      say(['…', '… …', '… … …'][i])
      if (roll < p) { ok = true; break }
      ok = false
    }
    fx.remove(cap)
    if (ok) { music.sfx('catch'); burst(cap.position, foe.e.color, 30); say(`Gotcha! ${foe.e.name} was caught!`); capture(B.foeRef, { level: foe.lv, hp: foe.hp }); await sleep(1800); end() }
    else { foe.model.visible = true; burst(foe.home.clone().add(new THREE.Vector3(0, 1, 0)), 0xffffff, 14); say(`${foe.e.name} broke free!`); await sleep(900); await turn({ k: 'capsule' }) }
  }
  async function run() { B.busy = true; menu.innerHTML = ''; const p = 0.45 + (B.ally.spd - B.foe.spd) * 0.02; if (Math.random() < p) { say('Got away safely!'); await sleep(900); end() } else { say("Can't escape!"); await sleep(800); await turn({ k: 'run' }) } }
  menu.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || b.disabled || !B || B.busy) return; const a = b.dataset.act
    if (a === 'fight') moveMenu(); else if (a === 'back') mainMenu(); else if (a === 'move') turn({ k: 'move', m: b.dataset.m })
    else if (a === 'capsule') throwCapsule(); else if (a === 'switch') switchMenu(false); else if (a === 'sw') swapIn(+b.dataset.i); else if (a === 'run') run()
  })

  return {
    start(c) {
      if (B || !state.party.length) return false
      const rec = state.party.find((r) => (r.hp ?? 1) > 0) || null; if (!rec) { toast('YOUR PARTY NEEDS REST · VISIT THE CAMP'); return false }
      document.exitPointerLock?.(); const lv = Math.max(2, (rec.level || 5) + Math.floor(Math.random() * 3) - 1)
      arena.setGlow(TYPE_COLOR[c.entry.type]); B = { foeRef: c, busy: true }; state.battle = B; B.foe = fighter(null, c.entry, lv, 'foe'); B.ally = fighter(rec, byId(rec.id), rec.level || 5, 'ally')
      face(B.ally, B.foe); face(B.foe, B.ally); setCard(B.foe); setCard(B.ally); root.hidden = false; music.setTrack('battle'); B.t0 = performance.now()
      say(`A wild ${c.entry.name} appeared!`); menu.innerHTML = ''; setTimeout(() => { if (B) { B.busy = false; mainMenu() } }, 1500); return true
    },
    active: () => !!B,
    render(now) {
      if (!B) return
      arena.update(now); const t = now / 1000, k = Math.min(1, (now - B.t0) / 1400), e = 1 - (1 - k) ** 3
      cam.position.set(-7 + e * 1.6 + Math.sin(t * 0.3) * 0.35, 3.6 + (1 - e) * 4, 8.5 - (1 - e) * 4); cam.lookAt(0.2, 1.3, -0.3)
      for (const f of [B.ally, B.foe]) { if (!f.model.visible) continue; animateModel(f.model, t + (f.side === 'ally' ? 0 : 3)); f.model.position.y = f.home.y + (f.model.userData.hover || 0) * f.model.scale.x + Math.sin(t * 2.4 + (f.side === 'ally' ? 0 : 2)) * 0.04 }
      fx.update(now, 1)
      renderer.render(scene, cam)
    },
    resize() { cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix() },
  }
}