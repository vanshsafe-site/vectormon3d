import * as THREE from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'

export const TYPE_COLOR = { GRASS: '#8fc060', FIRE: '#f08a4b', WATER: '#58a8d8', ELECTRIC: '#f2cf4a', ROCK: '#a39a80', GHOST: '#9a78d0', NORMAL: '#c8c4b4' }
export const CHART = {
  FIRE: { GRASS: 2, ROCK: 0.5, WATER: 0.5, FIRE: 0.5 }, WATER: { FIRE: 2, ROCK: 2, WATER: 0.5, GRASS: 0.5 },
  GRASS: { WATER: 2, ROCK: 2, FIRE: 0.5, GRASS: 0.5 }, ELECTRIC: { WATER: 2, GRASS: 0.5, ELECTRIC: 0.5, ROCK: 0.5 },
  ROCK: { FIRE: 2, ELECTRIC: 2, GRASS: 0.5 }, GHOST: { GHOST: 2, GRASS: 2, ROCK: 0.5 }, NORMAL: { ROCK: 0.5 },
}
export const MOVES = {
  tackle: ['Tackle', 'NORMAL', 40], vine: ['Vine Whip', 'GRASS', 55], leafblade: ['Leaf Blade', 'GRASS', 78],
  ember: ['Ember', 'FIRE', 55], flare: ['Flame Burst', 'FIRE', 78], bubble: ['Bubble Beam', 'WATER', 55], tide: ['Tidal Rush', 'WATER', 78],
  zap: ['Zap', 'ELECTRIC', 55], fang: ['Thunder Fang', 'ELECTRIC', 78], pebble: ['Rock Toss', 'ROCK', 55], slam: ['Boulder Slam', 'ROCK', 78],
  pulse: ['Shadow Pulse', 'GHOST', 55], rush: ['Spirit Rush', 'GHOST', 78],
}
// stats: [hp, atk, def, spd]
export const species = [
  { id: 'mosslet', no: '001', name: 'Mosslet', type: 'GRASS', rarity: 'COMMON', color: 0x91b965, accent: 0xe1b85e, chance: 0.79, home: [-10, -17], build: 'quad', o: { ears: 'leaf', tail: 'tuft', shell: 1 }, stats: [58, 46, 56, 36], moves: ['tackle', 'vine', 'leafblade', 'pebble'], note: 'A gentle wanderer that carries a tiny garden on its back.' },
  { id: 'embercub', no: '002', name: 'Embercub', type: 'FIRE', rarity: 'UNCOMMON', color: 0xe98555, accent: 0xffc467, chance: 0.61, home: [19, -33], build: 'quad', o: { ears: 'leaf', tail: 'flame', crest: 'flame', glow: 1 }, stats: [48, 60, 42, 56], moves: ['tackle', 'ember', 'flare', 'rush'], note: 'Warm sparks gather in its soft, leaf-shaped ears.' },
  { id: 'ripplefin', no: '003', name: 'Ripplefin', type: 'WATER', rarity: 'UNCOMMON', color: 0x60aeb2, accent: 0x9fe4d1, chance: 0.66, home: [31, 21], build: 'quad', o: { ears: 'round', tail: 'fin', fins: 1 }, stats: [56, 50, 52, 46], moves: ['tackle', 'bubble', 'tide', 'zap'], note: 'Its glassy fins shimmer when the river catches the light.' },
  { id: 'voltkit', no: '004', name: 'Voltkit', type: 'ELECTRIC', rarity: 'UNCOMMON', color: 0xf0cf52, accent: 0x3b3a4e, chance: 0.6, home: [-38, -8], build: 'quad', o: { ears: 'point', tail: 'bolt', glow: 1, cheeks: 0xe8553f }, stats: [44, 52, 40, 72], moves: ['tackle', 'zap', 'fang', 'pulse'], note: 'Static crackles through its fur whenever a storm is near.' },
  { id: 'cragback', no: '005', name: 'Cragback', type: 'ROCK', rarity: 'COMMON', color: 0x9b8f78, accent: 0x6fd0c4, chance: 0.74, home: [-45, 58], build: 'quad', o: { ears: 'round', tail: 'club', plates: 1 }, stats: [66, 58, 70, 24], moves: ['tackle', 'pebble', 'slam', 'vine'], note: 'Crystal plates grow along its spine, one ring for every winter.' },
  { id: 'pebblor', no: '006', name: 'Pebblor', type: 'ROCK', rarity: 'COMMON', color: 0x8e8b82, accent: 0xff9d4d, chance: 0.7, home: [-55, 22], build: 'rock', o: {}, stats: [70, 62, 76, 18], moves: ['tackle', 'pebble', 'slam', 'ember'], note: 'It sleeps in riverbeds and wakes up as a very grumpy boulder.' },
  { id: 'wispling', no: '007', name: 'Wispling', type: 'GHOST', rarity: 'RARE', color: 0xb9a2f0, accent: 0x7de8ff, chance: 0.5, home: [-20, -45], build: 'blob', o: {}, stats: [40, 58, 36, 64], moves: ['tackle', 'pulse', 'rush', 'zap'], note: 'A lost lantern flame that remembers the shape of a friend.' },
  { id: 'brookwyrm', no: '008', name: 'Brookwyrm', type: 'WATER', rarity: 'RARE', color: 0x4a8fd0, accent: 0xbdeeff, chance: 0.48, home: [16, -60], build: 'serpent', o: { fin: 1 }, stats: [60, 56, 48, 52], moves: ['tackle', 'bubble', 'tide', 'rush'], note: 'It braids itself through the current and never touches the banks.' },
  { id: 'sparkwyrm', no: '009', name: 'Sparkwyrm', type: 'ELECTRIC', rarity: 'RARE', color: 0xe8c040, accent: 0x6ad8ff, chance: 0.46, home: [58, 32], build: 'serpent', o: { rings: 1, glow: 1 }, stats: [52, 66, 44, 68], moves: ['tackle', 'zap', 'fang', 'tide'], note: 'Rings of lightning orbit its body like tiny halos.' },
  { id: 'emberwing', no: '010', name: 'Emberwing', type: 'FIRE', rarity: 'RARE', color: 0xd9593b, accent: 0xffd36a, chance: 0.44, home: [52, -12], build: 'bird', o: {}, stats: [50, 64, 44, 66], moves: ['tackle', 'ember', 'flare', 'fang'], note: 'Its tail feathers burn without ever turning to ash.' },
  { id: 'petalfly', no: '011', name: 'Petalfly', type: 'GRASS', rarity: 'UNCOMMON', color: 0x9bd36f, accent: 0xff8fb6, chance: 0.62, home: [-30, 36], build: 'flyer', o: {}, stats: [44, 44, 46, 62], moves: ['tackle', 'vine', 'leafblade', 'pulse'], note: 'Its wings open like flowers each morning, pink on the inside.' },
  { id: 'duskhood', no: '012', name: 'Duskhood', type: 'GHOST', rarity: 'RARE', color: 0x5a4a82, accent: 0xffd86a, chance: 0.4, home: [-72, -30], build: 'tall', o: {}, stats: [54, 66, 50, 50], moves: ['tackle', 'pulse', 'rush', 'slam'], note: 'It carries a small lantern and will not say who it is looking for.' },
]
export const byId = (id) => species.find((s) => s.id === id)
export const statsFor = (e, lv) => ({ hp: Math.floor(e.stats[0] * 2 * lv / 100) + lv + 10, atk: Math.floor(e.stats[1] * 2 * lv / 100) + 5, def: Math.floor(e.stats[2] * 2 * lv / 100) + 5, spd: Math.floor(e.stats[3] * 2 * lv / 100) + 5 })

const M = (c, r = 0.5, x = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...x })
const fur = (c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.62, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color(c).lerp(new THREE.Color(0xffffff), 0.5) })
const glow = (c, i = 1.1) => M(c, 0.35, { emissive: c, emissiveIntensity: i })
const sph = (r, w = 48, h = 32) => new THREE.SphereGeometry(r, w, h)
const cap = (r, l, s = 8, h = 20) => new THREE.CapsuleGeometry(r, l, s, h)
const lathe = (pts, seg = 48) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg)
const HORN = [[0, 0], [0.22, 0], [0.21, 0.2], [0.15, 0.5], [0.07, 0.82], [0, 1.05]]
const FLAME = [[0, 0], [0.2, 0.04], [0.34, 0.25], [0.3, 0.55], [0.17, 0.9], [0.05, 1.2], [0, 1.4]]
const BELL = [[0.02, 0], [0.5, 0.02], [0.62, 0.3], [0.56, 0.7], [0.4, 1.05], [0.24, 1.25], [0, 1.3]]
const sin = Math.sin, cos = Math.cos
const part = (g, geo, mat, p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0]) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(...p); m.scale.set(...s); m.rotation.set(...r)
  m.castShadow = m.receiveShadow = true; g.add(m); return m
}
const pivot = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g }
const tuft = (g, mat, p, s, r) => part(g, lathe(HORN, 14), mat, p, s, r)
const cream = (c, t = 0.6) => new THREE.Color(c).lerp(new THREE.Color(0xf5e0b4), t)
const shade = (c, k) => new THREE.Color(c).multiplyScalar(k)
const claw = M(0xf2ead8, 0.35)

// Eyes with sclera, iris, pupil, two highlights. Returns eye groups so they can blink.
function eyes(g, y, z, sp, s = 1, iris = 0x1c2230, ring = null) {
  return [-1, 1].map((k) => {
    const e = pivot(g, k * sp, y, z)
    part(e, sph(0.125 * s, 36, 26), M(0xffffff, 0.2), [0, 0, 0], [0.92, 1.08, 0.5])
    if (ring !== null) part(e, sph(0.092 * s, 28, 20), glow(ring, 0.35), [0, -0.005 * s, 0.035 * s], [1, 1.12, 0.55])
    part(e, sph(0.07 * s, 28, 20), M(iris, 0.15), [0, -0.01 * s, 0.052 * s], [1, 1.15, 0.6])
    part(e, sph(0.028 * s, 12, 10), glow(0xffffff, 1), [0.024 * s, 0.04 * s, 0.092 * s])
    part(e, sph(0.014 * s, 8, 6), glow(0xffffff, 1), [-0.02 * s, -0.03 * s, 0.097 * s])
    return e
  })
}
const blink = (g, es, ph = 0) => g.userData.anim.push((t) => {
  const c = (t + ph) % 3.7, b = c < 0.16 ? sin(c / 0.16 * Math.PI) : 0
  for (const e of es) e.scale.y = 1 - b * 0.92
})
// anim callbacks get (t, mv, gp): time, smoothed move amount 0..1, gait phase
const A = (g, f) => g.userData.anim.push(f)

function rockGeo(r, d, amp, seed = 0) {
  let geo = new THREE.IcosahedronGeometry(r, d); geo.deleteAttribute('normal'); geo.deleteAttribute('uv'); geo = mergeVertices(geo)
  const p = geo.attributes.position, v = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i)
    const n = sin(v.x * 3.1 + seed) * cos(v.y * 2.7) + sin(v.z * 4.3 + v.x * 1.7 + seed) * 0.6 + sin(v.x * 9 + v.y * 7 + seed) * 0.12
    v.multiplyScalar(1 + n * amp); p.setXYZ(i, v.x, v.y, v.z)
  }
  geo.computeVertexNormals(); return geo
}

function quad(g, e, o) {
  const coat = fur(e.color), belly = fur(cream(e.color)), dark = fur(shade(e.color, 0.72)), acc = o.glow ? glow(e.accent, 0.8) : M(e.accent, 0.5)
  const body = pivot(g), nose = M(0x2a2630, 0.25)
  const torso = part(body, sph(0.67, 72, 48), coat, [0, 0.83, 0], [0.86, 0.82, 0.78])
  part(body, sph(0.4, 48, 32), belly, [0, 0.7, 0.5], [0.78, 0.8, 0.3])
  part(body, sph(0.3, 32, 24), dark, [0, 1.1, -0.12], [1.3, 0.42, 1.5])
  if (!o.shell && !o.plates) for (let i = 0; i < 4; i++) tuft(body, dark, [0, 1.38 - i * 0.1, -0.22 - i * 0.17], [0.16, 0.2 + 0.02 * i, 0.16], [-0.7 - i * 0.15, 0, 0])
  for (let i = 0; i < 4; i++) tuft(body, belly, [(i - 1.5) * 0.14, 0.58, 0.62], [0.1, 0.12, 0.1], [1.9, 0, (1.5 - i) * 0.2]) // chest fluff
  const head = pivot(body, 0, 1.46, 0.1)
  part(head, sph(0.5, 72, 52), coat, [0, 0, 0], [1, 0.92, 0.95])
  part(head, sph(0.24, 36, 26), belly, [0, -0.13, 0.4], [1.15, 0.78, 0.85])
  part(head, sph(0.06, 20, 14), nose, [0, -0.04, 0.62], [1.25, 0.8, 0.8])
  part(head, new THREE.TorusGeometry(0.09, 0.012, 8, 24, Math.PI), M(0x3a2a2e, 0.5), [0, -0.2, 0.58], [1, 0.7, 0.6], [0, 0, Math.PI])
  const es = eyes(head, 0.05, 0.42, 0.2, 1, 0x1c2230, e.accent); blink(g, es, e.no * 0.7)
  for (const k of [-1, 1]) {
    if (o.cheeks) part(head, sph(0.09, 16, 12), glow(o.cheeks, 0.5), [k * 0.36, -0.1, 0.36], [1, 0.9, 0.4])
    tuft(head, coat, [k * 0.44, -0.12, 0.2], [0.12, 0.14, 0.12], [0, 0, -k * 1.5]); tuft(head, coat, [k * 0.42, -0.2, 0.12], [0.1, 0.12, 0.1], [0, 0, -k * 1.8])
    const ear = pivot(head, k * 0.3, 0.38, -0.03), ez = o.ears === 'round' ? 0 : -k * 0.3
    if (o.ears === 'leaf') { part(ear, lathe(HORN), acc, [0, 0, 0], [0.75, 0.85, 0.35], [0, 0, -k * 0.1]); part(ear, lathe(HORN), belly, [0, 0.03, 0.05], [0.45, 0.6, 0.22], [0, 0, -k * 0.1]) }
    else if (o.ears === 'point') { part(ear, lathe(HORN), coat, [0, 0, 0], [0.7, 1.15, 0.35]); part(ear, lathe(HORN), M(e.accent, 0.5), [0, 0.82, 0], [0.3, 0.28, 0.3]) }
    else { part(ear, sph(0.17, 28, 20), coat, [0, 0, 0], [1, 1, 0.8]); part(ear, sph(0.1, 20, 14), belly, [0, -0.01, 0.06], [1, 1, 0.5]) }
    ear.rotation.z = ez
    const arm = pivot(body, k * 0.56, 0.95, 0.18)
    part(arm, cap(0.1, 0.2), coat, [0, -0.2, 0]); part(arm, sph(0.13, 24, 18), coat, [0, -0.42, 0.03], [1, 0.9, 1.1])
    for (const j of [-1, 0, 1]) part(arm, sph(0.035, 10, 8), claw, [j * 0.06, -0.5, 0.12], [1, 1, 1.5])
    const leg = pivot(body, k * 0.34, 0.52, 0.05)
    part(leg, cap(0.17, 0.12), coat, [0, -0.1, -0.08], [1, 1, 1.1]); part(leg, sph(0.2, 32, 22), coat, [0, -0.38, 0.1], [1, 0.6, 1.4])
    for (const j of [-1, 0, 1]) { part(leg, sph(0.06, 14, 10), belly, [j * 0.1, -0.41, 0.34], [1, 0.7, 1.1]); part(leg, sph(0.028, 8, 6), claw, [j * 0.1, -0.41, 0.4], [1, 0.8, 1.6]) }
    if (o.fins) part(body, lathe(HORN), acc, [k * 0.66, 1.05, -0.02], [0.7, 0.8, 0.12], [0, 0, -k * 1.15])
    A(g, (t, mv, gp) => { arm.rotation.x = -k * sin(gp) * 0.65 * mv + sin(t * 1.7 + k) * 0.03; leg.rotation.x = k * sin(gp) * 0.75 * mv; ear.rotation.z = ez + sin(t * 2.2 + k + mv * sin(gp * 2)) * (0.06 + mv * 0.12) })
  }
  if (o.crest === 'flame') { const f = part(head, lathe(FLAME), glow(e.accent, 1.2), [0, 0.42, -0.02], [0.45, 0.45, 0.45]); A(g, (t) => f.scale.set(0.45 + sin(t * 7) * 0.03, 0.4 + sin(t * 9) * 0.06, 0.45)) }
  if (o.shell) { part(body, sph(0.5, 48, 32), M(0x7da85a, 0.85), [0, 1.18, -0.38], [1.05, 0.5, 1.2]); for (let i = 0; i < 7; i++) part(body, sph(0.1, 14, 10), glow(i % 2 ? 0xf08fb0 : e.accent, 0.4), [sin(i * 1.7) * 0.4, 1.4, -0.38 + cos(i * 1.7) * 0.45]); for (let i = 0; i < 5; i++) tuft(body, M(0x5f8a43, 0.8), [sin(i * 2.4) * 0.35, 1.38, -0.4 + cos(i * 2.4) * 0.4], [0.1, 0.16, 0.1], [0, 0, 0]) }
  if (o.plates) for (let i = 0; i < 5; i++) part(body, lathe(HORN), glow(e.accent, 0.5), [0, 1.35 - i * 0.14, -0.1 - i * 0.2], [0.55 - i * 0.04, 0.6 - i * 0.06, 0.4], [-0.5 - i * 0.12, 0, 0])
  const tail = pivot(body, 0, 0.5, -0.58), tail2 = pivot(tail, 0, 0.05, -0.2)
  if (o.tail === 'flame') { const f = part(tail2, lathe(FLAME), glow(e.accent, 1.3), [0, 0, -0.05], [0.55, 0.55, 0.55], [-1.2, 0, 0]); part(tail, sph(0.17, 24, 18), coat); part(tail2, sph(0.13, 20, 14), coat, [0, 0, -0.05]); A(g, (t) => f.scale.y = 0.5 + sin(t * 10) * 0.07) }
  else if (o.tail === 'bolt') { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.28, 0.3); s.lineTo(0.12, 0.34); s.lineTo(0.42, 0.78); s.lineTo(0.14, 0.62); s.lineTo(0.2, 0.9); s.lineTo(-0.2, 0.4); s.lineTo(-0.04, 0.38); s.closePath()
    part(tail2, new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 6 }), glow(e.accent === 0x3b3a4e ? 0xffe27a : e.accent, 0.7), [0, 0, 0], [1.2, 1.4, 1], [0.3, 0, 0]); part(tail, sph(0.12, 20, 14), coat) }
  else if (o.tail === 'fin') { part(tail2, lathe(HORN), acc, [0, 0, 0], [1.4, 0.8, 0.14], [-1.3, 0, 0]); part(tail, sph(0.15, 24, 16), coat) }
  else if (o.tail === 'club') { part(tail, sph(0.16, 24, 16), coat); part(tail2, sph(0.3, 40, 28), M(e.accent, 0.35, { emissive: e.accent, emissiveIntensity: 0.2 }), [0, 0.02, -0.2], [0.8, 0.8, 1]); for (let i = 0; i < 4; i++) tuft(tail2, claw, [sin(i * 1.6) * 0.2, 0.2, -0.2 + cos(i * 1.6) * 0.2], [0.07, 0.12, 0.07]) }
  else { part(tail, sph(0.2, 28, 20), belly, [0, 0.05, -0.08]); part(tail2, sph(0.24, 32, 22), belly, [0, 0.07, -0.12], [1, 1, 1.2]) }
  A(g, (t, mv, gp) => {
    const br = sin(t * 2.1)
    body.position.y = Math.abs(sin(gp)) * 0.08 * mv + br * 0.012; body.rotation.x = mv * 0.08; body.rotation.z = sin(gp) * 0.04 * mv
    torso.scale.set(0.86 + br * 0.012, 0.82 + br * 0.018, 0.78)
    head.rotation.y = sin(t * 0.7) * 0.2 * (1 - mv); head.rotation.x = -mv * 0.1 + sin(t * 1.1) * 0.03 - Math.abs(sin(gp)) * 0.05 * mv
    tail.rotation.y = sin(t * 3.2) * 0.3 + sin(gp) * 0.3 * mv; tail2.rotation.y = sin(t * 3.2 - 0.9) * 0.35; tail.rotation.x = mv * 0.25
  })
  g.userData.head = head
}

function rock(g, e) {
  const stone = M(e.color, 0.95), dk = M(0x6e6c64, 0.9), moss = M(0x6f8a4a, 0.95), body = pivot(g)
  const torso = part(body, rockGeo(0.85, 10, 0.085), stone, [0, 0.95, 0], [1.05, 0.9, 0.95])
  part(body, rockGeo(0.34, 8, 0.06, 2), dk, [0, 1.25, 0.62], [1.5, 0.75, 0.55])
  part(body, rockGeo(0.3, 7, 0.1, 4), moss, [-0.35, 1.7, -0.2], [1.4, 0.35, 1.2]); part(body, rockGeo(0.2, 6, 0.1, 5), moss, [0.4, 1.62, -0.3], [1.3, 0.35, 1.1])
  const es = eyes(body, 1.38, 0.78, 0.2, 1, 0xff9d4d, 0xffe0a0); blink(g, es, 1)
  const crystals = []
  for (let i = 0; i < 8; i++) { const a = i * 1.05, m = glow(e.accent, 0.9); crystals.push(m); part(body, lathe(HORN, 6), m, [sin(a) * 0.55, 1.62 + (i % 2) * 0.08, -0.35 + cos(a) * 0.3], [0.38, 0.5 + (i % 3) * 0.12, 0.38], [cos(a) * 0.3, 0, -sin(a) * 0.3]) }
  for (let i = 0; i < 3; i++) part(body, new THREE.BoxGeometry(0.02, 0.5, 0.02), glow(e.accent, 1.1), [-0.5 + i * 0.5, 0.9, 0.84 - Math.abs(i - 1) * 0.1], [1, 1, 1], [0.1, 0, 0.5 - i * 0.5]) // glowing cracks
  for (const k of [-1, 1]) {
    const arm = pivot(body, k * 0.95, 1.15, 0.15); part(arm, rockGeo(0.3, 7, 0.1, k), stone, [0, -0.4, 0], [0.8, 1.2, 0.9]); part(arm, rockGeo(0.22, 6, 0.12, k + 3), dk, [0, -0.85, 0.05])
    const leg = pivot(body, k * 0.45, 0.5, 0.1); part(leg, rockGeo(0.28, 7, 0.1, k + 6), stone, [0, -0.28, 0], [1, 0.8, 1.2])
    A(g, (t, mv, gp) => { arm.rotation.x = -k * sin(gp) * 0.5 * mv; arm.rotation.z = k * (0.05 + sin(t * 1.5) * 0.02); leg.rotation.x = k * sin(gp) * 0.55 * mv })
  }
  A(g, (t, mv, gp) => { body.position.y = Math.abs(sin(gp)) * 0.1 * mv + sin(t * 1.4) * 0.01; body.rotation.z = sin(gp) * 0.07 * mv; body.rotation.x = mv * 0.06; const p = 0.6 + sin(t * 3) * 0.35; for (const m of crystals) m.emissiveIntensity = p; torso.scale.y = 0.9 + sin(t * 1.4) * 0.01 })
}

function blob(g, e) {
  const bodyM = new THREE.MeshPhysicalMaterial({ color: e.color, roughness: 0.2, transmission: 0.25, transparent: true, opacity: 0.92, emissive: e.color, emissiveIntensity: 0.25 })
  const root = pivot(g), b = part(root, sph(0.62, 72, 52), bodyM, [0, 1.2, 0], [1, 1.05, 0.95])
  const core = part(root, sph(0.3, 32, 24), glow(e.accent, 0.9), [0, 1.15, -0.05]); core.material.transparent = true; core.material.opacity = 0.55
  const trail = []; for (let i = 0; i < 5; i++) trail.push(part(root, sph(0.5 - i * 0.08, 40, 28), bodyM, [0, 0.95 - i * 0.2, -i * 0.1], [1, 0.9, 1]))
  part(root, sph(0.5, 40, 28), M(0x2a2144, 0.3), [0, 1.22, 0.3], [1, 0.9, 0.7])
  const es = [-1, 1].map((k) => { const x = pivot(root, k * 0.22, 1.28, 0.62); part(x, sph(0.15, 28, 20), glow(e.accent, 1.5), [0, 0, 0], [1, 1.2, 0.5]); part(x, sph(0.05, 12, 10), M(0xffffff, 0.2), [0, 0.04, 0.12]); return x }); blink(g, es, 2)
  const arms = [-1, 1].map((k) => { const a = pivot(root, k * 0.58, 1.05, 0.1); part(a, cap(0.07, 0.2), bodyM, [k * 0.1, -0.1, 0.05], [1, 1, 1], [0, 0, k * 0.8]); part(a, sph(0.1, 20, 14), glow(e.accent, 0.5), [k * 0.22, -0.2, 0.08]); return a })
  const w = []; for (let i = 0; i < 4; i++) { const o = part(root, sph(0.1 - i * 0.008, 20, 14), glow(e.accent, 1.3)); w.push(o) }
  g.userData.hover = 0.35
  A(g, (t, mv) => {
    b.scale.set(1 + sin(t * 2) * 0.03, 1.05 + cos(t * 2) * 0.04, 0.95); root.rotation.x = mv * 0.3
    trail.forEach((m, i) => { m.position.x = sin(t * 3 - i * 0.8) * (0.06 + i * 0.05) * (1 + mv); m.position.z = -i * 0.1 - mv * i * 0.12 })
    arms.forEach((a, i) => a.rotation.z = (i ? 1 : -1) * sin(t * 2.5 + i) * 0.25)
    core.scale.setScalar(1 + sin(t * 4) * 0.12)
    w.forEach((o, i) => { const a = t * 1.4 + i * 1.57; o.position.set(cos(a) * 0.95, 1.3 + sin(t * 2 + i) * 0.25, sin(a) * 0.95) })
  })
}

function serpent(g, e, o) {
  const coat = fur(e.color), bel = fur(cream(e.color, 0.7)), N = 14, segs = [], ridge = M(e.accent, 0.4, o.glow ? { emissive: e.accent, emissiveIntensity: 0.6 } : {})
  for (let i = 0; i < N; i++) {
    const r = 0.46 - i * 0.025, s = pivot(g); part(s, sph(r, 40, 28), coat, [0, 0, 0], [1, 1, 1.1]); part(s, sph(r * 0.72, 24, 16), bel, [0, -r * 0.4, 0.06], [1, 0.7, 1]); tuft(s, ridge, [0, r * 0.85, 0], [0.12 * r / 0.4, 0.24 * r / 0.4, 0.14], [-0.2, 0, 0]); segs.push({ s, r })
  }
  const tip = pivot(g); part(tip, lathe(HORN), ridge, [0, 0, 0], [0.3, 1.0, 0.12], [-Math.PI / 2, 0, 0])
  const hg = pivot(g), head = part(hg, sph(0.5, 64, 44), coat, [0, 0, 0], [1, 0.9, 1.1])
  const es = eyes(hg, 0.1, 0.42, 0.22, 1.1, 0x1c2230, e.accent); blink(g, es, 3)
  part(hg, sph(0.22, 32, 22), bel, [0, -0.14, 0.42], [1.2, 0.7, 0.9]); for (const k of [-1, 1]) part(hg, sph(0.025, 8, 6), M(0x2a2630), [k * 0.07, -0.05, 0.65])
  const tongue = part(hg, cap(0.015, 0.16), M(0xe0587a, 0.4), [0, -0.2, 0.62], [1, 1, 0.5], [Math.PI / 2, 0, 0])
  const whisk = [-1, 1].map((k) => { const w = pivot(hg, k * 0.3, 0.0, 0.3); part(w, cap(0.016, 0.5), M(e.accent, 0.4), [k * 0.25, 0, -0.1], [1, 1, 1], [0, 0, Math.PI / 2]); return w })
  if (o.fin) { for (const k of [-1, 1]) part(hg, lathe(HORN), M(e.accent, 0.3, { transparent: true, opacity: 0.85 }), [k * 0.4, 0.05, -0.1], [0.8, 0.9, 0.12], [0, 0, -k * 1.2]); part(hg, lathe(HORN), M(e.accent, 0.3), [0, 0.45, -0.05], [0.3, 0.9, 0.12], [-0.4, 0, 0]) }
  const rings = []
  if (o.rings) for (let i = 0; i < 3; i++) rings.push(part(g, new THREE.TorusGeometry(0.75 + i * 0.12, 0.04, 14, 64), glow(e.accent, 1.4), [0, 0.5, -0.8 - i * 0.8], [1, 1, 1], [Math.PI / 2, 0, 0]))
  const posAt = (i, t, mv) => { const r = 0.46 - Math.max(i, 0) * 0.025; return [sin(t * 2.4 - i * 0.7) * (0.05 + Math.max(i, 0) * 0.045) * (1 + mv * 0.9), r + Math.max(0, 4 - i) * 0.17 + sin(t * 2.4 - i * 0.7 + 1) * 0.04 * (i > 0), -i * 0.38] }
  A(g, (t, mv) => {
    segs.forEach((q, i) => q.s.position.set(...posAt(i, t, mv)))
    const hp = posAt(-1, t, mv); hg.position.set(hp[0], hp[1] + 0.05 + sin(t * 2) * 0.04, hp[2] + 0.12); hg.rotation.x = 0.2 + sin(t * 1.3) * 0.05; hg.rotation.y = sin(t * 2.4) * 0.15
    tip.position.set(...posAt(N, t, mv)); tip.rotation.y = sin(t * 2.4 - N * 0.7) * 0.5
    tongue.scale.z = 0.4 + Math.max(0, sin(t * 2.5)) ** 8 * 1.4; whisk.forEach((w, i) => w.rotation.y = (i ? -1 : 1) * sin(t * 3 + i) * 0.2)
    rings.forEach((r, i) => { r.rotation.z = t * (2 + i); r.rotation.x = Math.PI / 2 + sin(t * 2 + i) * 0.2; r.position.x = sin(t * 2.4 - (2 + i * 2) * 0.7) * 0.2 })
  })
  g.userData.head = hg
}

function bird(g, e) {
  const coat = fur(e.color), pale = fur(cream(e.color, 0.7)), acc = glow(e.accent, 0.9), beak = M(0xf5c14a, 0.35), body = pivot(g)
  part(body, sph(0.55, 64, 44), coat, [0, 1.1, 0], [0.9, 0.95, 1.2]); part(body, sph(0.4, 40, 28), pale, [0, 1.0, 0.3], [0.8, 0.9, 0.5])
  for (let i = 0; i < 5; i++) tuft(body, pale, [(i - 2) * 0.12, 0.92 - Math.abs(i - 2) * 0.03, 0.52], [0.12, 0.18, 0.12], [Math.PI * 0.8, 0, (i - 2) * 0.12])
  const head = pivot(body, 0, 1.78, 0.25); part(head, sph(0.36, 56, 40), coat)
  part(head, lathe(HORN), beak, [0, 0.0, 0.3], [0.4, 0.5, 0.4], [Math.PI / 2, 0, 0]); part(head, lathe(HORN), M(0xd9a030, 0.4), [0, -0.1, 0.28], [0.3, 0.38, 0.28], [Math.PI / 2 + 0.1, 0, 0])
  const es = eyes(head, 0.08, 0.28, 0.15, 0.85, 0x2a1810, e.accent); blink(g, es, 4)
  const crest = []; for (let i = 0; i < 5; i++) crest.push(part(head, lathe(FLAME, 20), acc, [(i - 2) * 0.09, 0.34, -0.1 - Math.abs(i - 2) * 0.04], [0.14, 0.2 + (i === 2) * 0.14, 0.14], [-0.4, 0, (2 - i) * 0.28]))
  part(body, sph(0.3, 32, 22), pale, [0, 1.5, 0.15], [1, 0.8, 0.9])
  const wings = [-1, 1].map((k) => {
    const sh = pivot(body, k * 0.45, 1.3, 0), el = pivot(sh, k * 0.8, 0, -0.1)
    part(sh, sph(0.75, 48, 24), coat, [k * 0.35, 0, -0.1], [0.6, 0.1, 0.55]); part(el, sph(0.6, 40, 20), coat, [k * 0.3, 0, -0.05], [1, 0.08, 0.5])
    for (let i = 0; i < 5; i++) part(el, sph(0.3, 24, 12), i % 2 ? acc : coat, [k * (0.25 + i * 0.22), 0, -0.2 - i * 0.07], [1.3, 0.05, 0.35], [0, k * 0.2, 0])
    for (let i = 0; i < 3; i++) part(sh, sph(0.25, 20, 12), acc, [k * (0.25 + i * 0.22), 0.01, -0.45 - i * 0.04], [1.2, 0.05, 0.3])
    return { sh, el, k }
  })
  const legs = [-1, 1].map((k) => { const l = pivot(body, k * 0.2, 0.62, 0.05); part(l, new THREE.CylinderGeometry(0.04, 0.05, 0.45, 14), beak, [0, -0.2, 0]); for (const j of [-1, 0, 1]) part(l, cap(0.025, 0.14), beak, [j * 0.06, -0.42, 0.14], [1, 1, 1], [Math.PI / 2, 0, j * 0.2]); return l })
  const tail = pivot(body, 0, 0.95, -0.7), tf = []
  for (let i = 0; i < 5; i++) tf.push(part(tail, lathe(FLAME, 20), glow(i === 2 ? 0xffffff : e.accent, 1.1), [(i - 2) * 0.16, 0, 0], [0.26, 0.42 + (i === 2) * 0.12, 0.26], [-1.9, 0, (2 - i) * 0.3]))
  g.userData.hover = 0.6; g.userData.head = head
  A(g, (t, mv) => {
    const f = t * (6.5 + mv * 4), a = 0.5 + mv * 0.25
    for (const { sh, el, k } of wings) { sh.rotation.z = k * sin(f) * a; el.rotation.z = k * sin(f - 0.9) * a * 0.7; sh.rotation.y = k * -0.1 * cos(f) }
    body.position.y = -sin(f) * 0.05; body.rotation.x = mv * 0.25 + sin(f) * 0.03
    legs.forEach((l, i) => l.rotation.x = -0.5 - mv * 0.4 + sin(t * 2 + i) * 0.04)
    tail.rotation.x = sin(f - 1) * 0.1 - mv * 0.1; crest.forEach((c, i) => c.scale.y = (0.2 + (i === 2) * 0.14) * (1 + sin(t * 8 + i) * 0.12))
    head.rotation.y = sin(t * 0.8) * 0.25 * (1 - mv)
  })
}

function flyer(g, e) {
  const coat = fur(e.color), pet = M(e.accent, 0.4, { side: THREE.DoubleSide }), vein = M(shade(e.accent, 0.7), 0.5), body = pivot(g)
  const abd = part(body, sph(0.3, 40, 28), coat, [0, 1.1, 0], [0.85, 1.35, 0.85]); part(body, sph(0.2, 28, 20), fur(cream(e.color, 0.6)), [0, 1.0, 0.14], [0.8, 1.3, 0.5])
  for (let i = 0; i < 3; i++) part(body, new THREE.TorusGeometry(0.255 - i * 0.015, 0.012, 8, 32), M(e.accent, 0.5), [0, 0.95 + i * 0.16, 0], [1, 1, 0.9], [Math.PI / 2, 0, 0])
  const head = pivot(body, 0, 1.75, 0.08); part(head, sph(0.3, 56, 40), coat); part(head, sph(0.14, 24, 18), fur(cream(e.color, 0.6)), [0, -0.1, 0.22], [1.1, 0.7, 0.7]); part(head, sph(0.03, 10, 8), M(0x2a2630), [0, -0.06, 0.34])
  const es = eyes(head, 0.03, 0.2, 0.13, 0.9, 0x1c2230, e.accent); blink(g, es, 5)
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; part(head, sph(0.17, 24, 16), pet, [sin(a) * 0.26, 0.28 + cos(a) * 0.04, -0.1 + cos(a) * 0.2], [0.7, 0.4, 1.1], [0, a, 0]) }
  part(head, sph(0.1, 20, 14), glow(0xffe36a, 0.8), [0, 0.3, -0.1])
  const ants = [-1, 1].map((k) => { const a = pivot(head, k * 0.12, 0.28, 0.1); part(a, new THREE.CylinderGeometry(0.012, 0.015, 0.4, 8), M(0x3a5a30), [0, 0.2, 0]); part(a, sph(0.055, 16, 12), pet, [0, 0.42, 0]); a.rotation.z = -k * 0.4; return { a, k } })
  const wings = []
  for (const k of [-1, 1]) for (const [yy, sc, ph] of [[1.3, 1, 0], [1.0, 0.7, 0.6]]) {
    const w = pivot(body, k * 0.12, yy, -0.05)
    part(w, sph(0.7 * sc, 48, 32), pet, [k * 0.55 * sc, 0.1, -0.1], [1, 0.05, 0.75]); part(w, sph(0.35 * sc, 32, 22), glow(0xfff0c8, 0.25), [k * 0.5 * sc, 0.12, -0.1], [1, 0.06, 0.7])
    for (let i = 0; i < 3; i++) part(w, cap(0.01, 0.6 * sc), vein, [k * (0.4 + i * 0.15) * sc, 0.12, -0.1 - (i - 1) * 0.2 * sc], [1, 1, 1], [0, (i - 1) * 0.3 * k, Math.PI / 2])
    wings.push({ w, k, ph })
  }
  const legs = [-1, 0, 1].map((j) => { const l = pivot(body, j * 0.1, 0.9, 0.1); part(l, new THREE.CylinderGeometry(0.012, 0.012, 0.3, 8), vein, [0, -0.15, 0.05], [1, 1, 1], [0.3, 0, 0]); return l })
  g.userData.hover = 0.55
  A(g, (t, mv) => {
    const f = t * (9 + mv * 5)
    for (const { w, k, ph } of wings) w.rotation.z = k * (0.2 + sin(f + ph) * 0.55)
    body.position.y = sin(f) * 0.03; body.rotation.x = mv * 0.3; abd.scale.y = 1.35 + sin(t * 3) * 0.03; head.rotation.y = sin(t * 0.9) * 0.2 * (1 - mv)
    ants.forEach(({ a, k }) => a.rotation.x = sin(t * 3 + k) * 0.15 - mv * 0.3); legs.forEach((l, i) => l.rotation.x = sin(t * 2 + i) * 0.1)
  })
}

function tall(g, e) {
  const cloak = M(e.color, 0.8, { side: THREE.DoubleSide }), dark = M(0x1c1630, 0.5), trim = M(e.accent, 0.4, { emissive: e.accent, emissiveIntensity: 0.25 }), root = pivot(g)
  part(root, lathe(BELL, 64), cloak, [0, 0.4, 0], [1, 1.25, 1])
  const hem = []; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, p = pivot(root, sin(a) * 0.58, 0.46, cos(a) * 0.58); part(p, lathe(HORN, 10), cloak, [0, 0, 0], [0.22, -0.4, 0.12], [0, a, 0]); hem.push({ p, a }) }
  part(root, new THREE.TorusGeometry(0.6, 0.02, 8, 64), trim, [0, 0.45, 0], [1, 1, 1], [Math.PI / 2, 0, 0]); part(root, new THREE.TorusGeometry(0.4, 0.04, 10, 48), trim, [0, 1.3, 0], [1, 1, 1], [Math.PI / 2, 0, 0])
  const hood = part(root, lathe([[0.02, 0], [0.4, 0.02], [0.44, 0.25], [0.32, 0.55], [0.12, 0.85], [0, 1.0]], 64), cloak, [0, 1.65, -0.02], [1, 0.95, 1.05], [0.15, 0, 0])
  part(root, sph(0.33, 40, 28), dark, [0, 1.85, 0.12], [1, 1.05, 0.8])
  const es = [-1, 1].map((k) => { const x = pivot(root, k * 0.13, 1.88, 0.35); part(x, sph(0.09, 24, 16), glow(0xfff2b0, 1.8), [0, 0, 0], [1, 1.3, 0.5]); return x }); blink(g, es, 6)
  const arms = [-1, 1].map((k) => { const a = pivot(root, k * 0.5, 1.2, 0.1); part(a, cap(0.13, 0.35), cloak, [0, -0.25, 0.05], [1, 1, 1], [0.3, 0, 0]); part(a, sph(0.09, 20, 14), M(0xd8d0e0, 0.5), [0, -0.52, 0.2]); return { a, k } })
  const lampArm = arms[1].a, lamp = pivot(lampArm, 0, -0.55, 0.25)
  part(lamp, new THREE.CylinderGeometry(0.006, 0.006, 0.2, 6), M(0x2a2420), [0, -0.1, 0]); const bulb = part(lamp, sph(0.15, 32, 24), glow(e.accent, 1.8), [0, -0.3, 0]); part(lamp, new THREE.TorusGeometry(0.17, 0.02, 10, 32), M(0x2a2420, 0.4), [0, -0.16, 0], [1, 1, 1], [Math.PI / 2, 0, 0]); part(lamp, new THREE.TorusGeometry(0.16, 0.015, 8, 24), M(0x2a2420, 0.4), [0, -0.44, 0], [1, 1, 1], [Math.PI / 2, 0, 0])
  g.userData.hover = 0.3; g.userData.head = hood
  A(g, (t, mv) => {
    bulb.scale.setScalar(1 + sin(t * 6) * 0.1); hood.rotation.z = sin(t * 1.3) * 0.05; root.rotation.x = mv * 0.15; root.position.y = sin(t * 1.8) * 0.04
    lamp.rotation.z = sin(t * 2) * 0.12 + mv * 0.25; lamp.rotation.x = sin(t * 1.6) * 0.1
    arms.forEach(({ a, k }) => a.rotation.x = -k * sin(t * 2.6) * 0.1 * (1 + mv * 2) - 0.1)
    hem.forEach(({ p, a }, i) => { p.rotation.x = sin(t * 3 + i) * 0.12 * cos(a) + mv * 0.2; p.rotation.z = sin(t * 3 + i) * 0.12 * sin(a) })
  })
}

const BUILD = { quad, rock, blob, serpent, bird, flyer, tall }
export function createCreature(entry) {
  const g = new THREE.Group(); g.userData.anim = []; g.userData.hover = 0; g.userData.mv = 0; g.userData.gp = 0; g.userData.move = 0
  BUILD[entry.build](g, entry, entry.o)
  g.userData.base = g.children.length
  return g
}
// model.userData.move (0..1) = how fast the creature is moving; drives gait, lean, wing beat
export function animateModel(model, t) {
  const u = model.userData, dt = u.lt == null ? 0 : Math.min(0.1, Math.max(0, t - u.lt)); u.lt = t
  u.mv += ((u.move || 0) - u.mv) * Math.min(1, dt * 6); u.gp += dt * (3 + u.mv * 7)
  for (const f of u.anim) f(t, u.mv, u.gp)
}
