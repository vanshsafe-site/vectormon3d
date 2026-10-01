import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const { smoothstep } = THREE.MathUtils
const time = { value: 0 }
export const setWindTime = (t) => { time.value = t }
const col = (h) => new THREE.Color(h)
const frac = (v) => v - Math.floor(v)
export const ico = (r, d = 1) => new THREE.IcosahedronGeometry(r, d)
export const cyl = (a, b, h, n = 7) => new THREE.CylinderGeometry(a, b, h, n)
export const cone = (r, h, n = 7) => new THREE.ConeGeometry(r, h, n).translate(0, h / 2, 0)
export const up = (g, h) => g.translate(0, h / 2, 0)

// Merge parts into ONE faceted, vertex-coloured geometry. c = hex or [bottom, top] gradient, j = jitter for organic shapes.
export function bake(parts) {
  return mergeGeometries(parts.map(({ g, c, p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0], j = 0 }) => {
    const geo = g.index ? g.toNonIndexed() : g.clone(); geo.deleteAttribute('uv')
    const a = geo.attributes.position
    if (j) for (let i = 0; i < a.count; i++) {
      const x = a.getX(i), y = a.getY(i), z = a.getZ(i)
      a.setXYZ(i, x + (frac(Math.sin(x * 12.9 + y * 78.2 + z * 37.7) * 43758.5) - 0.5) * j, y + (frac(Math.sin(x * 93.9 + y * 67.3 + z * 12.3) * 24634.6) - 0.5) * j, z + (frac(Math.sin(x * 26.6 + y * 21.1 + z * 83.1) * 31415.9) - 0.5) * j)
    }
    geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s)))
    geo.computeVertexNormals(); geo.computeBoundingBox()
    const { min, max } = geo.boundingBox, [lo, hi] = [].concat(c, c).map(col), out = new Float32Array(a.count * 3), t = new THREE.Color()
    for (let i = 0; i < a.count; i++) { t.lerpColors(lo, hi, (a.getY(i) - min.y) / Math.max(max.y - min.y, 1e-3)); out.set([t.r, t.g, t.b], i * 3) }
    geo.setAttribute('color', new THREE.BufferAttribute(out, 3)); return geo
  }))
}

// Vertex-colour material; amp > 0 adds wind sway in the shader (instanced meshes only).
export const mat = (amp = 0, extra = {}) => {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, ...extra })
  if (amp) m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = time
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
float ph = uTime * 1.7 + instanceMatrix[3].x * 0.35 + instanceMatrix[3].z * 0.3;
transformed.x += sin(ph) * ${amp} * position.y * position.y;
transformed.z += cos(ph * 0.8) * ${(amp * 0.6).toFixed(5)} * position.y * position.y;
#endif`)
  }
  return m
}

export function inst(scene, geo, material, items, shadow = true) {
  const m = new THREE.InstancedMesh(geo, material, items.length), d = new THREE.Object3D()
  items.forEach((it, i) => {
    d.position.set(...it.p); d.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0)
    const s = it.s ?? 1; typeof s === 'number' ? d.scale.setScalar(s) : d.scale.set(...s)
    d.updateMatrix(); m.setMatrixAt(i, d.matrix); if (it.t) m.setColorAt(i, it.t)
  })
  m.castShadow = shadow; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); return m
}

// A real mountain: ridged-noise heightfield with forest line, strata, bare rock on steep faces and snow on flat high ground.
export function mountain(scene, heightAt, x, z, R, H, rings = 44, seg = 96) {
  const sd = x * 0.37 + z * 0.11, pos = [], idx = []
  const ridge = (a, b) => { let v = 0, f = 1, w = 1; for (let k = 0; k < 4; k++) { v += w * (1 - Math.abs(Math.sin(a * f + k * 1.7 + sd) * Math.cos(b * f * 1.13 - k * 2.3 + sd))); f *= 2.05; w *= 0.5 } return v / 1.875 }
  for (let i = 0; i <= rings; i++) for (let j = 0; j < seg; j++) {
    const u = i / rings, th = j / seg * Math.PI * 2, rr = R * u * (1 + 0.12 * Math.sin(th * 3 + sd) + 0.06 * Math.sin(th * 7)), px = Math.cos(th) * rr, pz = Math.sin(th) * rr
    pos.push(px, H * Math.pow(1 - u, 1.35) * (0.45 + 0.75 * ridge(px * 0.045, pz * 0.045)), pz)
  }
  for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) {
    const a = i * seg + j, b = i * seg + (j + 1) % seg, c = (i + 1) * seg + j, d = (i + 1) * seg + (j + 1) % seg
    idx.push(a, b, c, b, d, c)
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx)
  const flat = g.toNonIndexed(); flat.computeVertexNormals()
  const P = flat.attributes.position, N = flat.attributes.normal, out = new Float32Array(P.count * 3), c = new THREE.Color(), rock = new THREE.Color(), tmp = new THREE.Color(), snow = new THREE.Color(0xf1f5f3)
  for (let i = 0; i < P.count; i++) {
    const y = P.getY(i), ny = N.getY(i), t = y / H, n = Math.sin(P.getX(i) * 0.31) * Math.cos(P.getZ(i) * 0.27) * 0.5 + 0.5
    c.set(0x6a8a50).lerp(tmp.set(0x3d6049), smoothstep(t, 0.1, 0.22)).lerp(tmp.set(0x8a8f66), smoothstep(t, 0.35, 0.5))
    rock.set(0x7a7462).lerp(tmp.set(0x5a5649), n)
    c.lerp(rock, 1 - smoothstep(ny, 0.55, 0.85)).multiplyScalar(0.92 + 0.08 * Math.sin(y * 0.9))
    c.lerp(snow, smoothstep(t + (n - 0.5) * 0.12, 0.6, 0.7) * smoothstep(ny, 0.4, 0.62))
    out.set([c.r, c.g, c.b], i * 3)
  }
  flat.setAttribute('color', new THREE.BufferAttribute(out, 3))
  const mesh = new THREE.Mesh(flat, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }))
  mesh.position.set(x, heightAt(x, z) - 0.8, z); mesh.receiveShadow = true; scene.add(mesh)
}

export function buildEnvironment({ scene, heightAt, riverX, addCollider }) {
  let seed = 90210
  const rnd = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646 }
  const waterY = (z) => heightAt(riverX(z), z) + 0.72
  const riverD = (x, z) => Math.abs(x - riverX(z))
  const MTN = [[-62, -63, 40, 66], [-25, -87, 26, 46]]
  const onPath = (x, z) => Math.abs(x) < 3 && z > -7 && z < 85
  const blocked = (x, z) => (Math.abs(x) < 8.2 && z > -7 && z < 85) || Math.hypot(x, z - 8) < 9 || Math.hypot(x - 8, z - 14) < 8 || MTN.some(([mx, mz, r]) => Math.hypot(x - mx, z - mz) < r * 0.85)
  const tint = (v = 0.12) => new THREE.Color(1 - v + rnd() * v * 2, 1 - v + rnd() * v * 2, 1 - v + rnd() * v * 2)
  const spot = (n, area, ok, make = (x, z) => [x, z]) => { const o = []; for (let k = 0; o.length < n && k < n * 8; k++) { const x = (rnd() - 0.5) * area, z = (rnd() - 0.5) * area; if (ok(x, z)) o.push(make(x, z)) } return o }
  const bank = (n, d0, d1) => Array.from({ length: n }, () => { const z = -112 + rnd() * 224, x = riverX(z) + (rnd() < 0.5 ? -1 : 1) * (d0 + rnd() * (d1 - d0)); return [x, z] })
  const at = ([x, z], extra = {}) => ({ p: [x, heightAt(x, z), z], ry: rnd() * 6.28, s: 0.8 + rnd() * 0.5, t: tint(), ...extra })

  // ---- Mountains: two near, ring of distant peaks ----
  MTN.forEach(([x, z, R, H]) => { mountain(scene, heightAt, x, z, R, H); addCollider(x, z, R * 0.85) })
  for (let k = 0; k < 16; k++) {
    const a = k / 16 * Math.PI * 2, d = 175 + 22 * Math.sin(k * 2.3)
    mountain(scene, heightAt, Math.cos(a) * d, Math.sin(a) * d, 48 + 18 * Math.abs(Math.sin(k * 1.7)), 38 + 32 * Math.abs(Math.sin(k * 3.1)), 16, 44)
  }

  // ---- Tree models ----
  const pine = bake([
    { g: up(cyl(0.26, 0.5, 5.6), 5.6), c: [0x3e3022, 0x6a5539], j: 0.04 },
    ...[0, 1, 2, 3, 4, 5].map((i) => ({ g: cone(2.7 - i * 0.4, 2.3, 8), p: [0, 1.9 + i * 1.05, 0], r: [0, i * 0.7, 0], c: [0x1f4331, 0x4a7d4c], j: 0.28 })),
    { g: cone(0.5, 1.5, 6), p: [0, 7.9, 0], c: [0x2c5a3c, 0x5e9358], j: 0.1 },
  ])
  const oak = bake([
    { g: up(cyl(0.3, 0.6, 3.6, 8), 3.6), c: [0x4a3a28, 0x6b5537], j: 0.05 },
    { g: up(cyl(0.12, 0.2, 2.2, 6), 2.2), p: [0, 2.6, 0], r: [0, 0, 0.7], c: 0x5a4630 },
    { g: up(cyl(0.12, 0.2, 2.2, 6), 2.2), p: [0, 2.8, 0], r: [0, 0, -0.8], c: 0x5a4630 },
    ...[[0, 5, 0, 2.1], [1.7, 4.4, 0.5, 1.6], [-1.6, 4.5, -0.4, 1.7], [0.3, 4.3, 1.7, 1.5], [-0.4, 4.6, -1.7, 1.5], [1.4, 6, -0.6, 1.3], [-1, 6.1, 0.8, 1.3]].map(([x, y, z, r]) => ({ g: ico(r), p: [x, y, z], s: [1, 0.8, 1], c: [0x3a6a2c, 0x86ad4e], j: 0.3 })),
  ])
  const birch = bake([
    { g: up(cyl(0.11, 0.2, 5.4), 5.4), c: 0xe9e5d8, j: 0.02 },
    ...[0.8, 1.7, 2.6, 3.5, 4.4].map((y) => { const r = 0.2 - 0.09 * y / 5.4 + 0.012; return { g: cyl(r, r, 0.07), p: [0, y, 0], c: 0x2b2a27 } }),
    ...[[0, 5.6, 0, 1.1], [0.7, 4.9, 0.3, 0.8], [-0.7, 5.1, -0.3, 0.85], [0.1, 6.4, 0.2, 0.7]].map(([x, y, z, r]) => ({ g: ico(r), p: [x, y, z], s: [1, 0.85, 1], c: [0x8cab3c, 0xd4d65e], j: 0.22 })),
  ])
  const trees = { pine: [], oak: [], birch: [] }, treeSpots = []
  spot(340, 228, (x, z) => riverD(x, z) > 10.5 && !blocked(x, z)).forEach(([x, z]) => {
    const near = riverD(x, z) < 26, r = rnd(), kind = near ? (r < 0.4 ? 'oak' : r < 0.65 ? 'birch' : 'pine') : (r < 0.88 ? 'pine' : r < 0.95 ? 'oak' : 'birch')
    const s = 0.75 + rnd() * 0.5
    trees[kind].push(at([x, z], { s })); addCollider(x, z, 0.8 * s); treeSpots.push([x, z])
  })
  inst(scene, pine, mat(0.0016), trees.pine); inst(scene, oak, mat(0.0022), trees.oak); inst(scene, birch, mat(0.0026), trees.birch)

  // ---- Rocks (mossy tops), boulders in the river, pebbles on the banks ----
  const rock = bake([
    { g: ico(1), s: [1.2, 0.75, 1], p: [0, 0.35, 0], c: [0x625f52, 0x9b9a86], j: 0.3 },
    { g: ico(0.8), s: [1, 0.3, 1], p: [0, 0.82, 0], c: [0x4d6b36, 0x6f8f45], j: 0.18 },
  ])
  inst(scene, rock, mat(), spot(110, 200, (x, z) => !blocked(x, z) && riverD(x, z) > 7, (x, z) => { const s = 0.35 + rnd(); if (s > 0.55) addCollider(x, z, s); return at([x, z], { s, p: [x, heightAt(x, z) - 0.05, z] }) }))
  inst(scene, rock, mat(), Array.from({ length: 26 }, () => { const z = -112 + rnd() * 224, x = riverX(z) + (rnd() - 0.5) * 8, s = 0.6 + rnd() * 0.8; return at([x, z], { s, p: [x, waterY(z) - 0.35 * s, z] }) }))
  const pebble = bake([{ g: ico(0.12, 0), s: [1.3, 0.7, 1], c: [0x76746a, 0xa8a698], j: 0.04 }])
  inst(scene, pebble, mat(), bank(280, 4.8, 10).map((q) => at(q, { s: 0.6 + rnd() * 1.4 })), false)

  // ---- Waterside: reeds with cattails, lily pads and lotus flowers ----
  const brown = 0x5a3a22
  const reed = bake([
    ...[[0, 0, 0.06, 0], [0.2, 0.1, -0.1, 0.5], [-0.2, 0.05, 0.12, -0.4], [0.1, -0.2, -0.05, 0.3]].map(([x, z, rx, rz], i) => ({ g: up(cyl(0.014, 0.03, 2.2 + i * 0.2, 5), 2.2 + i * 0.2), p: [x, 0, z], r: [rx, 0, rz * 0.3], c: [0x4f7a35, 0xa6b95e] })),
    { g: up(cyl(0.05, 0.05, 0.45, 6), 0.45), p: [0, 1.9, 0], c: brown }, { g: up(cyl(0.05, 0.05, 0.45, 6), 0.45), p: [0.2, 1.8, 0.1], r: [0, 0, -0.12], c: brown },
  ])
  inst(scene, reed, mat(0.03), bank(240, 5.6, 9.5).map((q) => at(q)), false)
  const pad = { g: new THREE.CircleGeometry(0.5, 12, 0.35, 5.6), r: [-Math.PI / 2, 0, 0], c: 0x4a8c3c }
  const water = (n, geo) => inst(scene, geo, mat(), Array.from({ length: n }, () => { const z = -110 + rnd() * 220, x = riverX(z) + (rnd() - 0.5) * 8.5; return { p: [x, waterY(z) + 0.07, z], ry: rnd() * 6.28, s: 0.7 + rnd() * 0.6 } }), false)
  water(44, bake([pad]))
  water(14, bake([pad, { g: cone(0.16, 0.3, 7), c: [0xe9a0bd, 0xfbe4ee] }]))

  // ---- Meadow: grass tufts, ferns, flowers, bushes ----
  const tuft = bake([[0, 0, 0.3, 0], [0.08, 0.05, -0.35, 1.2], [-0.07, 0.04, 0.2, 2.4], [0.05, -0.07, -0.25, 3.6], [-0.06, -0.05, 0.4, 4.8]].map(([x, z, rz, ry]) => ({ g: cone(0.045, 0.8, 3), p: [x, 0, z], r: [0, ry, rz], c: [0x4a7438, 0xb7c76c], j: 0.02 })))
  inst(scene, tuft, mat(0.35), spot(3600, 210, (x, z) => riverD(x, z) > 7.2 && !onPath(x, z), (x, z) => at([x, z], { s: [0.9 + rnd() * 0.5, 0.6 + rnd() * 0.9, 0.9 + rnd() * 0.5] })), false)
  const fern = bake([0, 1, 2, 3, 4, 5, 6].map((i) => ({ g: cone(0.2, 1.3, 4), p: [0, 0.05, 0], s: [1, 1, 0.16], r: [0, i * 0.9, 1 + (i % 2) * 0.25], c: [0x2d5c2e, 0x78ac4e] })))
  const ferns = []
  for (let k = 0; k < 900 && ferns.length < 520; k++) { const [tx, tz] = treeSpots[(rnd() * treeSpots.length) | 0], x = tx + (rnd() - 0.5) * 9, z = tz + (rnd() - 0.5) * 9; if (riverD(x, z) > 8 && !blocked(x, z)) ferns.push(at([x, z], { s: 0.7 + rnd() * 0.7 })) }
  inst(scene, fern, mat(0.12), ferns, false)
  const flower = (petal) => bake([
    { g: up(cyl(0.012, 0.016, 0.5, 4), 0.5), c: [0x3f6a30, 0x6f9a44] },
    ...[0, 1, 2, 3, 4].map((k) => ({ g: ico(0.07, 0), p: [Math.cos(k * 1.2566) * 0.07, 0.52, Math.sin(k * 1.2566) * 0.07], s: [1, 0.5, 1], c: petal })),
    { g: ico(0.045, 0), p: [0, 0.54, 0], c: 0xf2c230 },
  ])
  ;[0xf4f0e6, 0xe85c8a, 0xf2c230, 0x8a6be0].forEach((petal) => inst(scene, flower(petal), mat(0.5), spot(36, 150, (x, z) => riverD(x, z) > 7.5 && !blocked(x, z), (x, z) => at([x, z], { s: 0.8 + rnd() * 0.7 })), false))
  const bush = bake([
    ...[[0, 0.5, 0, 0.8], [0.6, 0.4, 0.2, 0.6], [-0.55, 0.4, -0.1, 0.65], [0.1, 0.45, -0.6, 0.55]].map(([x, y, z, r]) => ({ g: ico(r), p: [x, y, z], s: [1, 0.8, 1], c: [0x2c5a33, 0x62924a], j: 0.14 })),
    ...[[0.4, 0.7, 0.5], [-0.5, 0.65, 0.4], [0.1, 0.95, -0.1], [-0.2, 0.5, -0.75], [0.65, 0.45, -0.2]].map(([x, y, z]) => ({ g: ico(0.06, 0), p: [x, y, z], c: 0xc23a3a })),
  ])
  inst(scene, bush, mat(0.004), spot(70, 200, (x, z) => riverD(x, z) > 9 && !blocked(x, z), (x, z) => { const s = 0.8 + rnd() * 0.7; addCollider(x, z, 0.85 * s); return at([x, z], { s }) }))

  // ---- Forest floor: mushrooms, fallen logs, stumps ----
  const shroom = bake([
    { g: up(cyl(0.05, 0.07, 0.26, 6), 0.26), c: 0xeee4cf },
    { g: ico(0.17), p: [0, 0.28, 0], s: [1, 0.55, 1], c: [0xa8261f, 0xe04b30], j: 0.02 },
    ...[[0.08, 0.38, 0.05], [-0.07, 0.36, 0.08], [0, 0.4, -0.09], [-0.1, 0.3, -0.06]].map(([x, y, z]) => ({ g: ico(0.025, 0), p: [x, y, z], c: 0xf7f1e0 })),
  ])
  const shrooms = []
  for (let k = 0; k < 400 && shrooms.length < 70; k++) { const [tx, tz] = treeSpots[(rnd() * treeSpots.length) | 0], a = rnd() * 6.28, d = 1.2 + rnd() * 1.6; shrooms.push(at([tx + Math.cos(a) * d, tz + Math.sin(a) * d], { s: 0.8 + rnd() * 1.1 })) }
  inst(scene, shroom, mat(), shrooms, false)
  const cap = (x) => ({ g: cyl(0.34, 0.34, 0.03, 9), r: [0, 0, Math.PI / 2], p: [x, 0.4, 0], c: 0xcba56e })
  inst(scene, bake([{ g: cyl(0.36, 0.42, 3.4, 9), r: [0, 0, Math.PI / 2], p: [0, 0.4, 0], c: 0x5b4630, j: 0.03 }, cap(-1.71), cap(1.71)]), mat(),
    spot(14, 200, (x, z) => !blocked(x, z) && riverD(x, z) > 9, (x, z) => { addCollider(x, z, 0.9); return at([x, z], { s: 1 }) }))
  inst(scene, bake([{ g: up(cyl(0.42, 0.55, 0.65, 9), 0.65), c: [0x4d3b28, 0x6b5436], j: 0.04 }, { g: cyl(0.4, 0.4, 0.03, 9), p: [0, 0.66, 0], c: 0xcfae78 }]), mat(),
    spot(18, 200, (x, z) => !blocked(x, z) && riverD(x, z) > 9, (x, z) => { addCollider(x, z, 0.55); return at([x, z], { s: 0.8 + rnd() * 0.6 }) }))

  // ---- River: banded colour (deep centre, clear shallows), flowing ripple texture, gentle waves ----
  const cols = 8, steps = 170, W = 7, verts = [], uvs = [], colors = [], index = [], deep = col(0x2b7a84), shallow = col(0x93d2c2), cc = new THREE.Color()
  for (let i = 0; i <= steps; i++) {
    const z = -118 + 236 * i / steps, cx = riverX(z), wy = waterY(z)
    for (let j = 0; j <= cols; j++) { const u = j / cols * 2 - 1; verts.push(cx + u * W, wy, z); uvs.push(j / cols, z * 0.09); cc.lerpColors(deep, shallow, smoothstep(Math.abs(u), 0.35, 1)); colors.push(cc.r, cc.g, cc.b) }
  }
  for (let i = 0; i < steps; i++) for (let j = 0; j < cols; j++) { const a = i * (cols + 1) + j, b = a + 1, c = a + cols + 1, d = c + 1; index.push(a, c, b, b, c, d) }
  const wg = new THREE.BufferGeometry()
  wg.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); wg.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); wg.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); wg.setIndex(index); wg.computeVertexNormals()
  const cv = document.createElement('canvas'); cv.width = cv.height = 256
  const g2 = cv.getContext('2d'); g2.fillStyle = '#d8ecec'; g2.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 260; i++) { g2.strokeStyle = `rgba(255,255,255,${0.15 + rnd() * 0.35})`; g2.lineWidth = 1 + rnd() * 2; const x = rnd() * 256, y = rnd() * 256; g2.beginPath(); g2.moveTo(x, y); g2.lineTo(x + (rnd() - 0.5) * 6, y + 8 + rnd() * 26); g2.stroke() }
  const tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(2, 1); tex.colorSpace = THREE.SRGBColorSpace
  scene.add(new THREE.Mesh(wg, new THREE.MeshPhysicalMaterial({ vertexColors: true, map: tex, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.1, emissive: 0x0b2a2e, transparent: true, opacity: 0.88, side: THREE.DoubleSide })))
  const wp = wg.attributes.position, by = Float32Array.from(verts)

  // ---- Clouds ----
  const cloudGeo = bake([[0, 0, 0, 9], [8, -1, 2, 7], [-8, -1, -1, 7.5], [3, 3, -4, 6], [-4, 2, 5, 6]].map(([x, y, z, r]) => ({ g: ico(r), p: [x, y, z], s: [1, 0.5, 1], c: [0xc9d3d8, 0xffffff], j: 1.2 })))
  const cloudMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, transparent: true, opacity: 0.92 })
  const clouds = Array.from({ length: 12 }, () => { const m = new THREE.Mesh(cloudGeo, cloudMat); m.position.set(0, 80 + rnd() * 30, rnd() * 400 - 200); m.scale.setScalar(0.8 + rnd() * 1.1); m.userData = { x0: rnd() * 480, sp: 0.004 + rnd() * 0.004 }; scene.add(m); return m })

  return {
    update(now) {
      time.value = now / 1000
      for (let i = 0; i < wp.count; i++) wp.setY(i, by[i * 3 + 1] + Math.sin(now * 0.0019 + by[i * 3 + 2] * 0.13 + by[i * 3] * 0.09) * 0.05)
      wp.needsUpdate = true; tex.offset.y = -(now * 0.00012) % 1
      for (const c of clouds) c.position.x = ((c.userData.x0 + now * c.userData.sp) % 480) - 240
    },
  }
}
