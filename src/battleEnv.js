import * as THREE from 'three'
import { bake, mat, inst, ico, cyl, cone, up, mountain, setWindTime } from './environment.js'

// Battle arena: a forest clearing built from the same baked, vertex-coloured low-poly kit as the main overworld.
const { smoothstep, lerp } = THREE.MathUtils
export const ALLY_POS = new THREE.Vector3(-2.6, 0.3, 2.4)
export const FOE_POS = new THREE.Vector3(2.8, 0.3, -2.6)
const POND = [-21, -17], POND_R = 7.5, WATER_Y = -0.3
const pondD = (x, z) => Math.hypot(x - POND[0], z - POND[1])
export const arenaH = (x, z) => {
  const r = Math.hypot(x, z), k = smoothstep(r, 10, 36)
  const h = k * (2.4 + 1.8 * Math.sin(x * 0.09 + 1.3) * Math.cos(z * 0.11) + 1.1 * Math.sin(x * 0.21 + z * 0.17)) + 0.05 * Math.sin(x * 1.7) * Math.cos(z * 1.3) * (1 - k)
  return lerp(h, -0.9, 1 - smoothstep(pondD(x, z), 4.2, POND_R + 1.2))
}

const radial = (stops, size = 128) => {
  const c = document.createElement('canvas'); c.width = c.height = size
  const g = c.getContext('2d'), gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  stops.forEach(([o, a]) => gr.addColorStop(o, `rgba(255,255,255,${a})`)); g.fillStyle = gr; g.fillRect(0, 0, size, size)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}

export function buildArena(scene) {
  let seed = 1337
  const rnd = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646 }
  const tint = (v = 0.12) => new THREE.Color(1 - v + rnd() * v * 2, 1 - v + rnd() * v * 2, 1 - v + rnd() * v * 2)
  const put = (x, z, o = {}) => ({ p: [x, arenaH(x, z), z], ry: rnd() * 6.28, s: 0.8 + rnd() * 0.5, t: tint(), ...o })
  const scatter = (n, r0, r1, ok = () => true) => { const o = []; for (let k = 0; o.length < n && k < n * 10; k++) { const a = rnd() * 6.283, r = r0 + rnd() * (r1 - r0), x = Math.cos(a) * r, z = Math.sin(a) * r; if (ok(x, z)) o.push([x, z]) } return o }
  const camClear = (x, z) => Math.hypot(x + 6, z - 9) > 6.5 && pondD(x, z) > 10

  scene.background = new THREE.Color('#d5dcb8'); scene.fog = new THREE.FogExp2('#d5dcb8', 0.0065)

  // ---- Lighting: same palette as the main world ----
  scene.add(new THREE.HemisphereLight(0xf2e8c7, 0x526746, 2.15))
  const sun = new THREE.DirectionalLight(0xffe3a8, 3.25); sun.position.set(-10, 16, 11); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 60 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; scene.add(sun)

  // ---- Sky dome, distant peaks, skirt ----
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color('#4f93c4') }, mid: { value: new THREE.Color('#dfe3bd') }, sunCol: { value: new THREE.Color('#fff2c4') }, sunDir: { value: new THREE.Vector3(-0.5, 0.55, 0.62).normalize() } },
    vertexShader: 'varying vec3 vp; void main() { vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 sunCol; uniform vec3 sunDir; varying vec3 vp; void main() { vec3 c = mix(mid, top, smoothstep(0.0, 0.55, vp.y)); float s = max(dot(vp, sunDir), 0.0); c += sunCol * (pow(s, 600.0) * 1.6 + pow(s, 12.0) * 0.18); gl_FragColor = vec4(c, 1.0);\n #include <tonemapping_fragment>\n #include <colorspace_fragment>\n }',
  })); sky.renderOrder = -1; scene.add(sky)
  const skirt = new THREE.Mesh(new THREE.CircleGeometry(500, 24), new THREE.MeshBasicMaterial({ color: 0x6d8453 })); skirt.rotation.x = -Math.PI / 2; skirt.position.y = -1.6; scene.add(skirt)
  for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283 + 0.3, d = 135 + 20 * Math.sin(k * 2.3); mountain(scene, () => 0, Math.cos(a) * d, Math.sin(a) * d, 42 + 16 * Math.abs(Math.sin(k * 1.7)), 34 + 28 * Math.abs(Math.sin(k * 3.1)), 16, 44) }

  // ---- Terrain: mown arena, worn trail between the daises, pond sand ----
  const tg = new THREE.PlaneGeometry(190, 190, 150, 150); tg.rotateX(-Math.PI / 2)
  const P = tg.attributes.position, col = new Float32Array(P.count * 3), c = new THREE.Color(), t = new THREE.Color()
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), z = P.getZ(i); P.setY(i, arenaH(x, z))
    const r = Math.hypot(x, z), n = Math.sin(x * 0.31) * Math.cos(z * 0.27) * 0.5 + 0.5, n2 = Math.sin(x * 0.9 + z * 0.4) * 0.5 + 0.5, pd = pondD(x, z)
    const dl = Math.abs((x + 2.6) * 0.679 + (z - 2.4) * 0.734), s = (x + 2.6) * 0.734 - (z - 2.4) * 0.679
    c.set(0x6a8a50).lerp(t.set(0x8c9b5b), n * 0.8 + n2 * 0.2).lerp(t.set(0x86a95c), 1 - smoothstep(r, 5, 11))
    c.lerp(t.set(0x9a845a), 0.7 * (1 - smoothstep(dl, 0.6, 1.6)) * smoothstep(s, -1, 1.5) * (1 - smoothstep(s, 6, 8.5)))
    c.lerp(t.set(0xb9b27e), (1 - smoothstep(pd, 8.2, 10.8)) * 0.85).lerp(t.set(0x4d5a45), 1 - smoothstep(pd, 3, 6)).multiplyScalar(0.94 + 0.06 * n2)
    col.set([c.r, c.g, c.b], i * 3)
  }
  tg.setAttribute('color', new THREE.BufferAttribute(col, 3)); tg.computeVertexNormals()
  const ground = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })); ground.receiveShadow = true; scene.add(ground)

  // ---- Pond with ripple texture ----
  const rc = document.createElement('canvas'); rc.width = rc.height = 256; const g2 = rc.getContext('2d'); g2.fillStyle = '#d8ecec'; g2.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 260; i++) { g2.strokeStyle = `rgba(255,255,255,${0.15 + rnd() * 0.35})`; g2.lineWidth = 1 + rnd() * 2; const x = rnd() * 256, y = rnd() * 256; g2.beginPath(); g2.moveTo(x, y); g2.lineTo(x + (rnd() - 0.5) * 6, y + 8 + rnd() * 26); g2.stroke() }
  const ripple = new THREE.CanvasTexture(rc); ripple.wrapS = ripple.wrapT = THREE.RepeatWrapping; ripple.repeat.set(3, 3); ripple.colorSpace = THREE.SRGBColorSpace
  const water = new THREE.Mesh(new THREE.CircleGeometry(POND_R + 2.5, 48).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x3a9096, map: ripple, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.1, emissive: 0x0b2a2e, transparent: true, opacity: 0.86 }))
  water.position.set(POND[0], WATER_Y, POND[1]); scene.add(water)

  // ---- Baked foliage kit (same construction as the main overworld) ----
  const pine = bake([{ g: up(cyl(0.26, 0.5, 5.6), 5.6), c: [0x3e3022, 0x6a5539], j: 0.04 }, ...[0, 1, 2, 3, 4, 5].map((i) => ({ g: cone(2.7 - i * 0.4, 2.3, 8), p: [0, 1.9 + i * 1.05, 0], r: [0, i * 0.7, 0], c: [0x1f4331, 0x4a7d4c], j: 0.28 })), { g: cone(0.5, 1.5, 6), p: [0, 7.9, 0], c: [0x2c5a3c, 0x5e9358], j: 0.1 }])
  const oak = bake([{ g: up(cyl(0.3, 0.6, 3.6, 8), 3.6), c: [0x4a3a28, 0x6b5537], j: 0.05 }, ...[[0, 5, 0, 2.1], [1.7, 4.4, 0.5, 1.6], [-1.6, 4.5, -0.4, 1.7], [0.3, 4.3, 1.7, 1.5], [-0.4, 4.6, -1.7, 1.5], [1.4, 6, -0.6, 1.3], [-1, 6.1, 0.8, 1.3]].map(([x, y, z, r]) => ({ g: ico(r), p: [x, y, z], s: [1, 0.8, 1], c: [0x3a6a2c, 0x86ad4e], j: 0.3 }))])
  const birch = bake([{ g: up(cyl(0.11, 0.2, 5.4), 5.4), c: 0xe9e5d8, j: 0.02 }, ...[0.8, 1.7, 2.6, 3.5, 4.4].map((y) => ({ g: cyl(0.17, 0.17, 0.07), p: [0, y, 0], c: 0x2b2a27 })), ...[[0, 5.6, 0, 1.1], [0.7, 4.9, 0.3, 0.8], [-0.7, 5.1, -0.3, 0.85], [0.1, 6.4, 0.2, 0.7]].map(([x, y, z, r]) => ({ g: ico(r), p: [x, y, z], s: [1, 0.85, 1], c: [0x8cab3c, 0xd4d65e], j: 0.22 }))])
  const T = { pine: [], oak: [], birch: [] }, spots = []
  scatter(210, 13, 72, camClear).forEach(([x, z]) => { const r = rnd(), d = Math.hypot(x, z), k = d < 28 ? (r < 0.4 ? 'oak' : r < 0.65 ? 'birch' : 'pine') : (r < 0.85 ? 'pine' : r < 0.94 ? 'oak' : 'birch'); T[k].push(put(x, z, { s: 0.8 + rnd() * 0.55 })); spots.push([x, z]) })
  inst(scene, pine, mat(0.0016), T.pine); inst(scene, oak, mat(0.0022), T.oak); inst(scene, birch, mat(0.0026), T.birch)

  const tuft = bake([[0, 0, 0.3, 0], [0.08, 0.05, -0.35, 1.2], [-0.07, 0.04, 0.2, 2.4], [0.05, -0.07, -0.25, 3.6], [-0.06, -0.05, 0.4, 4.8]].map(([x, z, rz, ry]) => ({ g: cone(0.045, 0.8, 3), p: [x, 0, z], r: [0, ry, rz], c: [0x4a7438, 0xb7c76c], j: 0.02 })))
  inst(scene, tuft, mat(0.35), scatter(3200, 0, 46, (x, z) => pondD(x, z) > 8).map(([x, z]) => put(x, z, { s: Math.hypot(x, z) < 8.5 ? [0.7, 0.5 + rnd() * 0.4, 0.7] : [0.9 + rnd() * 0.5, 0.6 + rnd() * 0.9, 0.9 + rnd() * 0.5] })), false)
  const fern = bake([0, 1, 2, 3, 4, 5, 6].map((i) => ({ g: cone(0.2, 1.3, 4), p: [0, 0.05, 0], s: [1, 1, 0.16], r: [0, i * 0.9, 1 + (i % 2) * 0.25], c: [0x2d5c2e, 0x78ac4e] })))
  inst(scene, fern, mat(0.12), spots.slice(0, 120).map(([x, z]) => put(x + (rnd() - 0.5) * 6, z + (rnd() - 0.5) * 6, { s: 0.7 + rnd() * 0.7 })), false)
  const flower = (petal) => bake([{ g: up(cyl(0.012, 0.016, 0.5, 4), 0.5), c: [0x3f6a30, 0x6f9a44] }, ...[0, 1, 2, 3, 4].map((k) => ({ g: ico(0.07, 0), p: [Math.cos(k * 1.2566) * 0.07, 0.52, Math.sin(k * 1.2566) * 0.07], s: [1, 0.5, 1], c: petal })), { g: ico(0.045, 0), p: [0, 0.54, 0], c: 0xf2c230 }])
  ;[0xf4f0e6, 0xe85c8a, 0xf2c230, 0x8a6be0].forEach((pc) => inst(scene, flower(pc), mat(0.5), scatter(46, 3, 34, (x, z) => pondD(x, z) > 9 && Math.hypot(x + 2.6, z - 2.4) > 3 && Math.hypot(x - 2.8, z + 2.6) > 3).map(([x, z]) => put(x, z, { s: 0.9 + rnd() * 0.8 })), false))
  const bush = bake([...[[0, 0.5, 0, 0.8], [0.6, 0.4, 0.2, 0.6], [-0.55, 0.4, -0.1, 0.65], [0.1, 0.45, -0.6, 0.55]].map(([x, y, z, r]) => ({ g: ico(r), p: [x, y, z], s: [1, 0.8, 1], c: [0x2c5a33, 0x62924a], j: 0.14 })), ...[[0.4, 0.7, 0.5], [-0.5, 0.65, 0.4], [0.1, 0.95, -0.1], [-0.2, 0.5, -0.75], [0.65, 0.45, -0.2]].map(([x, y, z]) => ({ g: ico(0.06, 0), p: [x, y, z], c: 0xc23a3a }))])
  inst(scene, bush, mat(0.004), scatter(46, 11, 52, camClear).map(([x, z]) => put(x, z)))
  const shroom = bake([{ g: up(cyl(0.05, 0.07, 0.26, 6), 0.26), c: 0xeee4cf }, { g: ico(0.17), p: [0, 0.28, 0], s: [1, 0.55, 1], c: [0xa8261f, 0xe04b30], j: 0.02 }, ...[[0.08, 0.38, 0.05], [-0.07, 0.36, 0.08], [0, 0.4, -0.09]].map(([x, y, z]) => ({ g: ico(0.025, 0), p: [x, y, z], c: 0xf7f1e0 }))])
  inst(scene, shroom, mat(), scatter(70, 10, 36, camClear).map(([x, z]) => put(x, z, { s: 0.8 + rnd() * 1.1 })), false)
  const rock = bake([{ g: ico(1), s: [1.2, 0.75, 1], p: [0, 0.35, 0], c: [0x625f52, 0x9b9a86], j: 0.3 }, { g: ico(0.8), s: [1, 0.3, 1], p: [0, 0.82, 0], c: [0x4d6b36, 0x6f8f45], j: 0.18 }])
  inst(scene, rock, mat(), [...scatter(60, 10, 60, camClear), ...scatter(18, 5.6, 7.6).map(([x, z]) => [POND[0] + x * 0.8, POND[1] + z * 0.8])].map(([x, z]) => put(x, z, { s: 0.35 + rnd() * 1.1, p: [x, arenaH(x, z) - 0.05, z] })))
  const log = bake([{ g: cyl(0.36, 0.42, 3.4, 9), r: [0, 0, Math.PI / 2], p: [0, 0.4, 0], c: 0x5b4630, j: 0.03 }, ...[-1.71, 1.71].map((x) => ({ g: cyl(0.34, 0.34, 0.03, 9), r: [0, 0, Math.PI / 2], p: [x, 0.4, 0], c: 0xcba56e }))])
  inst(scene, log, mat(), scatter(5, 14, 30, camClear).map(([x, z]) => put(x, z, { s: 1 })))
  inst(scene, bake([{ g: up(cyl(0.42, 0.55, 0.65, 9), 0.65), c: [0x4d3b28, 0x6b5436], j: 0.04 }, { g: cyl(0.4, 0.4, 0.03, 9), p: [0, 0.66, 0], c: 0xcfae78 }]), mat(), scatter(7, 12, 30, camClear).map(([x, z]) => put(x, z, { s: 0.8 + rnd() * 0.6 })))
  // Pond life
  const reed = bake([...[[0, 0, 0.06, 0], [0.2, 0.1, -0.1, 0.5], [-0.2, 0.05, 0.12, -0.4], [0.1, -0.2, -0.05, 0.3]].map(([x, z, rx, rz], i) => ({ g: up(cyl(0.014, 0.03, 2.2 + i * 0.2, 5), 2.2 + i * 0.2), p: [x, 0, z], r: [rx, 0, rz * 0.3], c: [0x4f7a35, 0xa6b95e] })), { g: up(cyl(0.05, 0.05, 0.45, 6), 0.45), p: [0, 1.9, 0], c: 0x5a3a22 }])
  inst(scene, reed, mat(0.03), Array.from({ length: 70 }, () => { const a = rnd() * 6.283, d = 5.6 + rnd() * 2.4, x = POND[0] + Math.cos(a) * d, z = POND[1] + Math.sin(a) * d; return put(x, z) }), false)
  const lily = { g: new THREE.CircleGeometry(0.5, 12, 0.35, 5.6), r: [-Math.PI / 2, 0, 0], c: 0x4a8c3c }
  const water2 = (n, geo) => inst(scene, geo, mat(), Array.from({ length: n }, () => { const a = rnd() * 6.283, d = rnd() * 4.6; return { p: [POND[0] + Math.cos(a) * d, WATER_Y + 0.07, POND[1] + Math.sin(a) * d], ry: rnd() * 6.28, s: 0.7 + rnd() * 0.6 } }), false)
  water2(30, bake([lily])); water2(10, bake([lily, { g: cone(0.16, 0.3, 7), c: [0xe9a0bd, 0xfbe4ee] }]))

  // ---- Battle site: runed daises, standing stones, glowing sigils ----
  const glow = new THREE.MeshBasicMaterial({ color: 0x9be37a, transparent: true, opacity: 0.92 })
  const halo = new THREE.MeshBasicMaterial({ map: radial([[0, 0], [0.6, 0], [0.86, 0.6], [1, 0]]), color: 0x9be37a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })
  const daisGeo = bake([
    { g: cyl(1.2, 1.28, 0.46, 40), p: [0, -0.04, 0], c: [0x6b6a5a, 0x8d8a76] }, { g: cyl(1.0, 1.06, 0.12, 40), p: [0, 0.24, 0], c: [0x9a9a84, 0xbab69e] },
    ...Array.from({ length: 10 }, (_, k) => { const a = k / 10 * 6.283; return { g: new THREE.BoxGeometry(0.4, 0.32, 0.52), p: [Math.cos(a) * 1.14, 0.18, Math.sin(a) * 1.14], r: [0, -a, 0], c: [0x77735f, 0xa19d86], j: 0.05 } }),
  ])
  const runes = []
  ;[[ALLY_POS, 2.5], [FOE_POS, 2.3]].forEach(([pos, r]) => {
    const d = new THREE.Mesh(daisGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 })); d.scale.set(r, 1, r); d.position.set(pos.x, 0, pos.z); d.castShadow = d.receiveShadow = true; scene.add(d)
    const ring = new THREE.Group(); ring.position.set(pos.x, 0.315, pos.z)
    const tor = new THREE.Mesh(new THREE.TorusGeometry(r * 0.8, 0.03, 8, 72), glow); tor.rotation.x = Math.PI / 2; ring.add(tor)
    const tor2 = new THREE.Mesh(new THREE.TorusGeometry(r * 0.52, 0.02, 8, 56), glow); tor2.rotation.x = Math.PI / 2; ring.add(tor2)
    for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283, m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, k % 2 ? 0.36 : 0.22), glow); m.position.set(Math.cos(a) * r * 0.66, 0, Math.sin(a) * r * 0.66); m.rotation.y = -a; ring.add(m) }
    scene.add(ring); runes.push(ring)
    const h = new THREE.Mesh(new THREE.CircleGeometry(r * 1.12, 48), halo); h.rotation.x = -Math.PI / 2; h.position.set(pos.x, 0.32, pos.z); scene.add(h)
  })
  const stone = bake([{ g: up(cyl(0.45, 0.7, 3.2, 5), 3.2), c: [0x5f5d52, 0x8f8d7c], j: 0.12 }, { g: ico(0.5), p: [0, 3.1, 0], s: [1.1, 0.45, 1.1], c: [0x4d6b36, 0x6f8f45], j: 0.1 }])
  const menh = Array.from({ length: 12 }, (_, i) => { const a = -0.25 + i * (Math.PI + 0.5) / 11, r = 11.4 + rnd() * 1.6; return [Math.cos(a) * r, -Math.sin(a) * r, r] })
  inst(scene, stone, mat(), menh.map(([x, z]) => put(x, z, { s: 0.85 + rnd() * 0.5, ry: Math.atan2(-x, -z) + (rnd() - 0.5) * 0.4 })))
  const sigil = new THREE.OctahedronGeometry(0.17).scale(1, 1.9, 0.45)
  const sig = inst(scene, sigil, glow, menh.map(([x, z, r]) => ({ p: [x * (1 - 0.7 / r), arenaH(x, z) + 2.15, z * (1 - 0.7 / r)], ry: Math.atan2(-x, -z), s: 1 })), false); sig.castShadow = false

  // ---- Sky life: clouds, drifting fireflies, light shafts ----
  const cloudGeo = bake([[0, 0, 0, 9], [8, -1, 2, 7], [-8, -1, -1, 7.5], [3, 3, -4, 6], [-4, 2, 5, 6]].map(([x, y, z, r]) => ({ g: ico(r), p: [x, y, z], s: [1, 0.5, 1], c: [0xc9d3d8, 0xffffff], j: 1.2 })))
  const cloudMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, transparent: true, opacity: 0.92 })
  const clouds = Array.from({ length: 9 }, () => { const m = new THREE.Mesh(cloudGeo, cloudMat); m.position.set(0, 75 + rnd() * 25, rnd() * 360 - 180); m.scale.setScalar(0.8 + rnd() * 1.1); m.userData = { x0: rnd() * 480, sp: 0.004 + rnd() * 0.004 }; scene.add(m); return m })
  const NF = 160, fp = new Float32Array(NF * 3), fb = scatter(NF, 0, 17).map(([x, z]) => [x, 0.4 + rnd() * 5, z])
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fp, 3))
  const flies = new THREE.Points(fg, new THREE.PointsMaterial({ map: radial([[0, 1], [0.35, 0.55], [1, 0]], 64), color: 0xfff1a8, size: 0.26, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })); flies.frustumCulled = false; scene.add(flies)
  const rays = Array.from({ length: 5 }, (_, i) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 3.2 + i * 0.4, 42, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); m.position.set(-11 + i * 6.5, 20, -17 - (i % 2) * 7); m.rotation.set(-0.12, 0, 0.3); m.userData.ph = i * 1.3; scene.add(m); return m })

  return {
    setGlow(hex) { const k = new THREE.Color(hex); glow.color.copy(k).lerp(new THREE.Color(0xffffff), 0.25); halo.color.copy(k) },
    update(now) {
      const s = now / 1000; setWindTime(s); ripple.offset.y = -(now * 0.00012) % 1; ripple.offset.x = Math.sin(s * 0.2) * 0.05
      runes.forEach((g, i) => { g.rotation.y = s * (i ? -0.35 : 0.3) }); glow.opacity = 0.78 + Math.sin(s * 2.2) * 0.14; halo.opacity = 0.45 + Math.sin(s * 2.2 + 1) * 0.12
      for (const c of clouds) c.position.x = ((c.userData.x0 + now * c.userData.sp) % 480) - 240
      for (let i = 0; i < NF; i++) { const [bx, by, bz] = fb[i]; fp[i * 3] = bx + Math.sin(s * 0.5 + i * 1.7) * 0.7; fp[i * 3 + 1] = by + Math.sin(s * 0.8 + i) * 0.4; fp[i * 3 + 2] = bz + Math.cos(s * 0.45 + i * 2.1) * 0.7 }
      fg.attributes.position.needsUpdate = true; flies.material.opacity = 0.65 + Math.sin(s * 1.3) * 0.2
      for (const r of rays) r.material.opacity = 0.045 + (Math.sin(s * 0.5 + r.userData.ph) * 0.5 + 0.5) * 0.04
    },
  }
}
