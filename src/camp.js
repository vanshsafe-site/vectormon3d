import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// Detailed camp: ridge tent, stone-ringed fire with animated flames / embers / smoke, tripod pot, seats, crates, lantern post, etc.
const { smoothstep, lerp } = THREE.MathUtils
const col = (h) => new THREE.Color(h)
const frac = (v) => v - Math.floor(v)
const V = (x, y, z) => new THREE.Vector3(x, y, z)
const cyl = (a, b, h, n = 8) => new THREE.CylinderGeometry(a, b, h, n)
const ico = (r, d = 1) => new THREE.IcosahedronGeometry(r, d)
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z)
const cone = (r, h, n = 7) => new THREE.ConeGeometry(r, h, n).translate(0, h / 2, 0)
const up = (g, h) => g.translate(0, h / 2, 0)

function bake(parts) {
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

// Cylinder oriented from point a to b (b = narrow end if r2 given).
const align = (g, a, b, at = 0.5) => {
  const A = V(...a), B = V(...b), d = B.clone().sub(A)
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize()))
  g.translate(lerp(A.x, B.x, at), lerp(A.y, B.y, at), lerp(A.z, B.z, at)); return g
}
const rod = (a, b, r, c, n = 6, r2 = r) => ({ g: align(cyl(r2, r, V(...b).distanceTo(V(...a)), n), a, b), c, j: 0.015 })

// Log lying along X, with bark gradient and ringed end grain.
const logParts = (len, r, [ox, oy, oz], c = [0x34261a, 0x6e5638], ry = 0) => [
  { g: cyl(r, r * 1.05, len, 9), p: [ox, oy, oz], r: [0, ry, Math.PI / 2], c, j: 0.035 },
  ...[-1, 1].flatMap((sd) => [[0.9, 0.03, 0xd6b87f], [0.62, 0.036, 0xb98f55], [0.32, 0.04, 0xcba46a], [0.12, 0.044, 0x7d5430]].map(([k, h, cc]) => ({ g: cyl(r * k, r * k, h, 9), p: [ox + Math.cos(ry) * sd * len / 2, oy, oz - Math.sin(ry) * sd * len / 2], r: [0, ry, Math.PI / 2], c: cc }))),
]

// Triangle / sagging panel helpers for canvas.
const tri = (a, b, c, cc) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c], 3)); return { g, c: cc } }
function panel(S, n, u0, u1, v0, v1, nu, nv, off, c) {
  const P = [], pos = []
  for (let i = 0; i <= nu; i++) for (let k = 0; k <= nv; k++) P.push(S(lerp(u0, u1, i / nu), lerp(v0, v1, k / nv)).addScaledVector(n, off))
  const at = (i, k) => P[i * (nv + 1) + k]
  for (let i = 0; i < nu; i++) for (let k = 0; k < nv; k++) for (const q of [at(i, k), at(i + 1, k), at(i, k + 1), at(i + 1, k), at(i + 1, k + 1), at(i, k + 1)]) pos.push(q.x, q.y, q.z)
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); return { g, c }
}

export function buildCamp({ scene, heightAt, addCollider }) {
  const cx = 8, cz = 14, F = [-1.3, -0.4], T = [3, 2]
  let seed = 4242
  const rnd = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646 }
  const root = new THREE.Group(); root.position.set(cx, 0, cz); scene.add(root)
  const gy = (x, z) => heightAt(cx + x, cz + z)
  const wood = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })
  const canvasM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide })
  const metal = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.45 })
  const glowM = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })
  const put = (geo, material, x, z, y = 0, ry = 0, parent = root, shadow = true) => {
    const m = new THREE.Mesh(geo, material); m.position.set(x, gy(x, z) + y, z); m.rotation.y = ry; m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m
  }

  // ---------- trampled ground, glow pool, pebbles ----------
  const disc = (R, rings, seg, lift, colorFn, wob = 0.12) => {
    const pos = [], colr = [], idx = [], c = new THREE.Color()
    for (let i = 0; i <= rings; i++) for (let j = 0; j < seg; j++) {
      const u = i / rings, th = j / seg * Math.PI * 2, rr = R * u * (1 + wob * Math.sin(th * 3 + 1) + wob * 0.6 * Math.sin(th * 7)), x = Math.cos(th) * rr, z = Math.sin(th) * rr
      pos.push(x, gy(x, z) + lift, z); colorFn(c, u, th); colr.push(c.r, c.g, c.b)
    }
    for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) { const a = i * seg + j, b = i * seg + (j + 1) % seg, d = (i + 1) * seg + j, e = (i + 1) * seg + (j + 1) % seg; idx.push(a, d, b, b, d, e) }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3)); g.setIndex(idx); g.computeVertexNormals(); return g
  }
  const dirt = new THREE.Mesh(disc(9, 14, 40, 0.07, (c, u, th) => { c.set(0x56452f).lerp(col(0x6e5a3d), (Math.sin(th * 9 + u * 6) + 1) / 2 * 0.5).lerp(col(0x9a845a), smoothstep(u, 0.55, 1)) }, 0.14), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }))
  dirt.position.set(-0.5, 0, 0.5); dirt.receiveShadow = true; root.add(dirt)
  const scorch = new THREE.Mesh(disc(1.9, 6, 20, 0.1, (c, u) => { c.set(0x15110e).lerp(col(0x3a2e22), smoothstep(u, 0.4, 1)) }, 0.1), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }))
  scorch.position.set(F[0], 0, F[1]); scorch.receiveShadow = true; root.add(scorch)
  const glowDisc = new THREE.Mesh(disc(6, 7, 28, 0.14, (c, u) => { c.setRGB(1, 0.5, 0.16).multiplyScalar(Math.pow(1 - u, 2.2) * 0.55) }, 0.02), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }))
  glowDisc.position.set(F[0], 0, F[1]); root.add(glowDisc)
  const pebbles = []
  for (let i = 0; i < 46; i++) { const a = rnd() * 6.28, r = 1.4 + rnd() * 7, x = Math.cos(a) * r - 0.5, z = Math.sin(a) * r + 0.5; pebbles.push({ g: ico(0.05 + rnd() * 0.1, 0), p: [x, gy(x, z) + 0.03, z], s: [1, 0.6, 1], c: [rnd() < 0.5 ? 0x6e6a60 : 0x8a8472, 0xaaa594], j: 0.04 }) }
  put(bake(pebbles), wood, 0, 0, 0, 0, root, false).position.y = 0

  // ---------- fire pit ----------
  const fg = new THREE.Group(); fg.position.set(F[0], gy(...F), F[1]); root.add(fg)
  const fparts = [{ g: cyl(1.0, 1.0, 0.05, 14), p: [0, 0.05, 0], c: [0x14100d, 0x2a231d], j: 0.05 }]
  const stonePal = [0x77746a, 0x8b8678, 0x66645c, 0x9a9484]
  for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28 + (rnd() - 0.5) * 0.12, r = 1.08 + (rnd() - 0.5) * 0.1; fparts.push({ g: ico(0.27 + rnd() * 0.12, 1), p: [Math.cos(a) * r, 0.13, Math.sin(a) * r], s: [1.1, 0.72, 1], r: [0, rnd() * 3, 0], c: [stonePal[i % 4] - 0x151515, stonePal[(i + 1) % 4]], j: 0.13 }) }
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + 0.3, r = 1.38 + rnd() * 0.15; fparts.push({ g: ico(0.12 + rnd() * 0.08, 1), p: [Math.cos(a) * r, 0.07, Math.sin(a) * r], s: [1, 0.6, 1], c: [0x6e6a60, 0x9d9888], j: 0.07 }) }
  for (let i = 0; i < 6; i++) { // teepee of logs, charred at the base
    const a = i / 6 * 6.28 + 0.2, A = [Math.cos(a) * 0.78, 0.1, Math.sin(a) * 0.78], B = [Math.cos(a) * 0.08, 1.0 - (i % 2) * 0.12, Math.sin(a) * 0.08]
    fparts.push(rod(A, B, 0.12, [0x1d1612, 0x6a5236], 8, 0.085))
  }
  fparts.push(...logParts(1.5, 0.12, [0, 0.19, 0.12], [0x241a13, 0x4a3a28], 0.5), ...logParts(1.4, 0.11, [0.05, 0.17, -0.2], [0x241a13, 0x4a3a28], -0.7))
  for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; fparts.push(rod([Math.cos(a) * 0.95, 0.07, Math.sin(a) * 0.95], [Math.cos(a + 0.15) * 0.5, 0.35, Math.sin(a + 0.15) * 0.5], 0.018, 0x7a5f3c, 4)) }
  fg.add(Object.assign(new THREE.Mesh(bake(fparts), wood), { castShadow: true, receiveShadow: true }))
  const coalGeo = bake(Array.from({ length: 9 }, (_, i) => { const a = i / 9 * 6.28, r = 0.15 + rnd() * 0.4; return { g: ico(0.09 + rnd() * 0.08, 1), p: [Math.cos(a) * r, 0.14 + rnd() * 0.06, Math.sin(a) * r], s: [1, 0.7, 1], c: [0xa81e0c, 0xff7a24], j: 0.05 } }))
  const coalMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }); fg.add(new THREE.Mesh(coalGeo, coalMat))

  // flames: layered teardrop tongues
  const flameMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })
  const flameGeo = (c) => bake([{ g: new THREE.LatheGeometry([[0, 0], [0.5, 0.08], [0.72, 0.3], [0.6, 0.62], [0.34, 0.95], [0.12, 1.2], [0, 1.38]].map(([x, y]) => new THREE.Vector2(x, y)), 8), c, j: 0.05 }])
  const GO = flameGeo([0xd8381a, 0xff9a3a]), GM = flameGeo([0xf0661e, 0xffc24d]), GC = flameGeo([0xffa83a, 0xfff2b5])
  const tongues = []
  const tongue = (geo, x, z, h, w, f) => { const m = new THREE.Mesh(geo, flameMat); m.position.set(x, 0.18, z); fg.add(m); tongues.push({ m, h, w, f, ph: rnd() * 6.28, x, z }) }
  tongue(GO, 0, 0, 1.25, 0.55, 1); tongue(GM, 0, 0, 1.0, 0.4, 1.3); tongue(GC, 0, 0, 0.6, 0.25, 1.7)
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28, r = 0.3 + rnd() * 0.12; tongue(i % 2 ? GM : GO, Math.cos(a) * r, Math.sin(a) * r, 0.55 + rnd() * 0.4, 0.3 + rnd() * 0.1, 1.1 + rnd() * 1.2) }
  for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28 + 0.6; tongue(GC, Math.cos(a) * 0.22, Math.sin(a) * 0.22, 0.4 + rnd() * 0.2, 0.18, 2 + rnd()) }
  const light = new THREE.PointLight(0xffa34f, 12, 26, 2); light.position.set(0, 1.5, 0); fg.add(light)

  // embers
  const EN = 70, ep = new Float32Array(EN * 3), ec = new Float32Array(EN * 3), es = Array.from({ length: EN }, () => ({ life: rnd(), sp: 0.5 + rnd(), a: rnd() * 6.28, r: rnd() * 0.4, ph: rnd() * 6.28 }))
  const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(ep, 3)); eg.setAttribute('color', new THREE.BufferAttribute(ec, 3))
  const embers = new THREE.Points(eg, new THREE.PointsMaterial({ size: 0.11, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); embers.frustumCulled = false; fg.add(embers)
  // smoke
  const smokeGeo = ico(0.55, 1), puffs = Array.from({ length: 12 }, (_, i) => { const m = new THREE.Mesh(smokeGeo, new THREE.MeshBasicMaterial({ color: 0x95918a, transparent: true, opacity: 0, depthWrite: false })); m.frustumCulled = false; fg.add(m); return { m, ph: i / 12, r: rnd() * 6.28 } })

  // tripod, hanging pot, fish skewers
  const tri3 = []
  for (let i = 0; i < 3; i++) { const a = i / 3 * 6.28 + 1.05; tri3.push(rod([Math.cos(a) * 1.7, 0, Math.sin(a) * 1.7], [0.1, 2.7, 0], 0.06, 0x5b4630, 6, 0.045)) }
  tri3.push({ g: cyl(0.075, 0.075, 0.16, 8), p: [0.1, 2.72, 0], c: 0x3b2d20 }, ...[0, 1, 2, 3, 4].map((k) => ({ g: new THREE.TorusGeometry(0.045, 0.012, 5, 8), p: [0.1, 2.62 - k * 0.17, 0], r: [k % 2 ? 0 : Math.PI / 2, 0, 0], c: 0x3a3a3c })))
  fg.add(Object.assign(new THREE.Mesh(bake(tri3), wood), { castShadow: true }))
  const pot = new THREE.Group(); pot.position.set(0.1, 1.55, 0); fg.add(pot)
  const potParts = [
    { g: new THREE.LatheGeometry([[0.0, 0], [0.27, 0.01], [0.35, 0.1], [0.38, 0.3], [0.36, 0.44], [0.3, 0.46]].map(([x, y]) => new THREE.Vector2(x, y)), 14), c: [0x15151a, 0x4a4a52] },
    { g: cyl(0.3, 0.3, 0.02, 14), p: [0, 0.37, 0], c: 0x7a3f22 }, { g: new THREE.TorusGeometry(0.37, 0.025, 5, 14), p: [0, 0.44, 0], r: [Math.PI / 2, 0, 0], c: 0x2a2a30 },
    { g: new THREE.TorusGeometry(0.37, 0.018, 5, 14, Math.PI), p: [0, 0.44, 0], c: 0x2a2a30 }, { g: ico(0.05, 0), p: [0, 0.82, 0], c: 0x3a3a3c },
  ]
  pot.add(new THREE.Mesh(bake(potParts), metal))
  const skew = []
  for (const a of [0.3, 2.2]) { const A = [Math.cos(a) * 1.45, 0.05, Math.sin(a) * 1.45], B = [Math.cos(a) * 0.42, 1.0, Math.sin(a) * 0.42]; skew.push(rod(A, B, 0.016, 0xb08d57, 4), { g: align(ico(0.12, 1).applyMatrix4(new THREE.Matrix4().makeScale(0.42, 1.9, 0.75)), A, B, 0.7), c: [0xd8d2c0, 0xe48a4a], j: 0.02 }) }
  fg.add(new THREE.Mesh(bake(skew), wood))
  addCollider(cx + F[0], cz + F[1], 0.95)

  // ---------- seating logs, cup ----------
  for (const a0 of [3.4, 4.6, 5.75]) {
    const x = F[0] + Math.cos(a0) * 2.7, z = F[1] + Math.sin(a0) * 2.7
    const parts = [...logParts(1.9, 0.23, [0, 0.24, 0], [0x30231a, 0x6a5234]), ...[-0.62, 0.55].map((o) => ({ g: ico(0.1, 0), p: [o, 0.4, 0.2], c: 0x5a4630, j: 0.06 })), { g: ico(0.07, 0), p: [0.3, 0.47, -0.15], c: 0x3f5a2e, s: [1.4, 0.4, 1] }]
    put(bake(parts), wood, x, z, 0, -(a0 + Math.PI / 2))
    if (a0 === 5.75) put(bake([{ g: cyl(0.075, 0.06, 0.14, 10), p: [0, 0.07, 0], c: [0x8e9096, 0xd8dade] }, { g: new THREE.TorusGeometry(0.045, 0.013, 5, 8, Math.PI), p: [0.08, 0.07, 0], r: [0, 0, -Math.PI / 2], c: 0x8e9096 }]), metal, x + 0.4, z - 0.1, 0.47)
  }

  // ---------- tent ----------
  const W = 1.8, H = 2.5, L = 2.2, yaw = Math.atan2(F[0] - T[0], F[1] - T[1]), cy = Math.cos(yaw), sy = Math.sin(yaw)
  const tg = new THREE.Group(); tg.position.set(T[0], gy(...T), T[1]); tg.rotation.y = yaw; root.add(tg)
  const tgy = (lx, lz) => gy(T[0] + lx * cy + lz * sy, T[1] - lx * sy + lz * cy) - tg.position.y
  const putT = (geo, material, lx, lz, y = 0, ry = 0) => { const m = new THREE.Mesh(geo, material); m.position.set(lx, tgy(lx, lz) + y, lz); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; tg.add(m); return m }
  const cv = []
  for (const s of [-1, 1]) {
    const n = V(s * H, W, 0).normalize(), S = (u, v) => V(s * W * (1 - v), H * v, lerp(-L, L, u)).addScaledVector(n, 0.08 * Math.sin(Math.PI * u) * Math.sin(Math.PI * v))
    cv.push(panel(S, n, 0, 1, 0, 1, 10, 8, 0, [0xa3865a, 0xe2ca98]), panel(S, n, 0, 1, 0, 0.1, 10, 1, 0.03, 0x5e4a31), panel(S, n, 0, 1, 0.58, 0.66, 10, 1, 0.03, 0x9c3f2b), panel(S, n, 0, 1, 0.27, 0.285, 10, 1, 0.025, 0x6e583a))
    for (const u of [0.25, 0.5, 0.75]) cv.push(panel(S, n, u - 0.006, u + 0.006, 0.02, 0.98, 1, 8, 0.022, 0x7d653f))
    cv.push(panel(S, n, 0.18, 0.38, 0.2, 0.42, 3, 3, 0.04, 0xb99a62), panel(S, n, 0.62, 0.8, 0.3, 0.46, 3, 3, 0.04, 0x8f7a4e), panel(S, n, 0.7, 0.74, 0.7, 0.9, 1, 3, 0.04, 0xcdb27a))
  }
  cv.push(tri([-W, 0, -L], [W, 0, -L], [0, H, -L], [0x9a7e52, 0xd8bf8a]), tri([-0.3, 0.9, -L - 0.01], [0.3, 0.9, -L - 0.01], [0, 1.35, -L - 0.01], 0x3a2e20), tri([-W, 0, L - 0.02], [W, 0, L - 0.02], [0, H, L - 0.02], [0x0f0b08, 0x241b13]))
  for (const s of [-1, 1]) cv.push(tri([s * W, 0, L + 0.03], [s * 0.5, 0, L + 0.03], [0, H, L + 0.03], [0xa78a5c, 0xe0c894]), tri([s * (W - 0.05), 0, L + 0.04], [s * (W - 0.4), 0, L + 0.04], [s * 0.45, 1.1, L + 0.04], 0x9c3f2b))
  put(bake(cv), canvasM, 0, 0, 0, 0, tg).position.set(0, -0.06, 0)
  const frame = [rod([0, H + 0.12, -L - 0.35], [0, H + 0.12, L + 0.35], 0.055, 0x5b4630, 7), { g: ico(0.1, 1), p: [0, H + 0.12, L + 0.38], c: 0x7a5d3a, j: 0.03 }, { g: ico(0.1, 1), p: [0, H + 0.12, -L - 0.38], c: 0x7a5d3a, j: 0.03 }]
  for (const z of [L + 0.12, -L - 0.12]) for (const s of [-1, 1]) frame.push(rod([s * (W + 0.12), 0, z], [s * 0.04, H + 0.1, z], 0.05, 0x5b4630, 6))
  for (const z of [L + 0.12, 0.3, -L * 0.6]) for (const s of [-1, 1]) frame.push({ g: box(0.12, 0.05, 0.08), p: [s * (W * 0.55 + 0.1 * 0), 0.4 * 0 + 0.02, z], c: 0x3a2e20 }) // hem pegs
  const stakes = [[0, H + 0.12, L + 0.38, 0, 0, L + 2.2], [0, H + 0.12, -L - 0.38, 0, 0, -L - 2.2], [W * 0.7, 0.9, 1.4, W + 1.7, 0, 1.8], [-W * 0.7, 0.9, 1.4, -W - 1.7, 0, 1.8], [W * 0.7, 0.9, -1.4, W + 1.7, 0, -1.8], [-W * 0.7, 0.9, -1.4, -W - 1.7, 0, -1.8]]
  for (const [ax, ay, az, bx, by, bz] of stakes) { frame.push(rod([ax, ay, az], [bx, by + 0.1, bz], 0.012, 0xc9b78a, 4), rod([bx, by + 0.28, bz], [bx + (bx - ax) * 0.1, by - 0.1, bz + (bz - az) * 0.1], 0.03, 0x6a5236, 5), { g: cyl(0.045, 0.045, 0.03, 5), p: [bx, by + 0.12, bz], c: 0xc9b78a }) }
  frame.push(rod([0, H + 0.2, L + 0.38], [0, H + 1.15, L + 0.38], 0.02, 0x3a2e20, 5), tri([0, H + 1.12, L + 0.38], [0, H + 0.72, L + 0.38], [0.1, H + 0.92, L + 1.1], [0xd9593b, 0xffc467]))
  put(bake(frame), wood, 0, 0, 0, 0, tg).position.set(0, -0.04, 0)
  // interior: groundsheet, sleeping bag, pillow, blanket; entrance rug; backpack
  const inside = [{ g: box(2 * W - 0.5, 0.04, 2 * L - 0.2), p: [0, 0.06, 0], c: 0x5d4d37 }, { g: ico(0.45, 1), p: [-0.55, 0.3, -0.35], s: [0.9, 0.42, 2.1], c: [0x3d6a86, 0x6f9db8], j: 0.04 }, { g: ico(0.24, 1), p: [-0.55, 0.38, 0.5], s: [1.5, 0.6, 1], c: 0xe9dfc4, j: 0.03 }, { g: box(0.6, 0.03, 0.9), p: [0.7, 0.1, -0.3], r: [0, 0.2, 0], c: 0x8e3d2c }]
  putT(bake(inside), wood, 0, 0, 0)
  const rug = [{ g: box(1.7, 0.04, 1.2), c: 0x7c3b2c }, ...[-0.4, 0, 0.4].map((z) => ({ g: box(1.7, 0.045, 0.07), p: [0, 0.003, z], c: z ? 0xe2c487 : 0x2f4a5a })), ...[-1, 1].flatMap((s) => [-0.5, -0.3, -0.1, 0.1, 0.3, 0.5].map((z) => ({ g: box(0.12, 0.03, 0.03), p: [s * 0.9, 0, z], c: 0xe2c487 })))]
  putT(bake(rug), wood, 0, L + 1.0, 0.04, 0.05)
  const pack = [{ g: ico(0.42, 1), p: [0, 0.5, 0], s: [1, 1.25, 0.72], c: [0x3f5a30, 0x6f8c52], j: 0.07 }, { g: ico(0.32, 1), p: [0, 0.98, 0.04], s: [1, 0.55, 0.8], c: [0x4a3a28, 0x6e5638], j: 0.05 }, { g: box(0.5, 0.3, 0.14), p: [0, 0.3, 0.3], c: [0x344d27, 0x4f6a3e] }, { g: cyl(0.2, 0.2, 0.9, 10), p: [0, 1.18, 0], r: [0, 0, Math.PI / 2], c: [0x8c5a3a, 0xb98258], j: 0.02 }, ...[-0.3, 0.3].map((x) => ({ g: box(0.05, 0.9, 0.04), p: [x, 0.55, 0.28], c: 0x2a2a28 })), ...[-0.35, 0.35].map((x) => ({ g: cyl(0.21, 0.21, 0.06, 10), p: [x, 1.18, 0], r: [0, 0, Math.PI / 2], c: 0x2a2a28 }))]
  putT(bake(pack), wood, W + 0.55, 0.4, 0, -0.5).rotation.z = 0.1
  addCollider(cx + T[0], cz + T[1], 2.2)

  // ---------- supplies: crates, sack, capsules ----------
  const crateParts = (w, h, d, o = [0, 0, 0]) => {
    const [ox, oy, oz] = o, ps = [{ g: box(w - 0.1, h - 0.06, d - 0.1), p: [ox, oy + h / 2, oz], c: 0x2e2216 }]
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) ps.push({ g: box(0.1, h, 0.1), p: [ox + sx * (w / 2 - 0.05), oy + h / 2, oz + sz * (d / 2 - 0.05)], c: [0x5a4228, 0x8a6a42] })
    for (let k = 0; k < 4; k++) for (const sd of [-1, 1]) { const y = oy + 0.1 + k * (h - 0.2) / 3; ps.push({ g: box(w, 0.13, 0.05), p: [ox, y, oz + sd * d / 2], c: [k % 2 ? 0x6a4f31 : 0x7c5c38, 0x9a7a4c], j: 0.012 }, { g: box(0.05, 0.13, d), p: [ox + sd * w / 2, y, oz], c: [k % 2 ? 0x7c5c38 : 0x6a4f31, 0x9a7a4c], j: 0.012 }) }
    return ps
  }
  put(bake(crateParts(1.4, 0.8, 0.95)), wood, -3, 2, 0, 0.15)
  put(bake([...crateParts(0.8, 0.55, 0.7), { g: ico(0.2, 1), p: [0, 0.6, 0], s: [1, 0.6, 1], c: [0x5b7a3a, 0x93b25a], j: 0.05 }]), wood, -4.3, 3.0, 0, -0.4)
  const caps = [[-0.3, 0.2], [0.1, -0.15], [0.35, 0.25], [-0.1, 0.0]].map(([x, z], i) => ({ g: ico(0.15, 1), p: [x, 0.86 + (i === 3 ? 0.15 : 0), z], c: [0xc89a45, 0xf4d27d] }))
  put(bake([{ g: box(1.28, 0.04, 0.83), p: [0, 0.74, 0], c: 0x3a2b1a }, ...caps]), metal, -3, 2, 0, 0.15)
  put(bake([{ g: ico(0.4, 1), p: [0, 0.42, 0], s: [1, 1.1, 0.88], c: [0xb6a27a, 0xe0d0a4], j: 0.1 }, { g: cone(0.12, 0.25, 6), p: [0, 0.85, 0], c: 0x8a7650, j: 0.04 }, { g: new THREE.TorusGeometry(0.1, 0.02, 5, 8), p: [0, 0.82, 0], r: [Math.PI / 2, 0, 0], c: 0x4a3a28 }]), wood, -1.9, 3.1, 0, 0.8)
  addCollider(cx - 3, cz + 2, 0.85)

  // ---------- firewood stack, stump and axe, water bucket ----------
  const stack = []
  const rows = [[0.14, [-0.45, -0.15, 0.15, 0.45]], [0.38, [-0.3, 0, 0.3]], [0.62, [-0.15, 0.15]]]
  rows.forEach(([y, zs], ri) => zs.forEach((z, k) => stack.push(...logParts(1.05 + ((ri * 3 + k) % 3) * 0.08, 0.14, [0, y, z], [0x34261a, 0x7a6040], (rnd() - 0.5) * 0.08))))
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) stack.push(rod([sx * 0.68, 0, sz * 0.58], [sx * 0.68, 0.95, sz * 0.58], 0.05, 0x4a3826, 6))
  put(bake(stack), wood, -5.4, -0.9, 0, 0.1); addCollider(cx - 5.4, cz - 0.9, 0.85)
  put(bake([{ g: cyl(0.42, 0.52, 0.55, 11), p: [0, 0.275, 0], c: [0x34261a, 0x5e4a30], j: 0.05 }, ...[0.4, 0.28, 0.16, 0.05].map((r, i) => ({ g: cyl(r, r, 0.03 + i * 0.002, 11), p: [0, 0.56, 0], c: i % 2 ? 0xb98f55 : 0xd2b27a })), rod([0.0, 0.55, 0], [0.62, 1.38, 0.1], 0.035, 0x7a5a36, 6), { g: box(0.34, 0.17, 0.05), p: [0.0, 0.66, 0.02], r: [0, 0, 0.55], c: [0x7a7e86, 0xc3c8d0] }, { g: ico(0.1, 0), p: [0.62, 1.4, 0.1], c: 0x5b4630 }]), metal, -5.0, -3.3)
  addCollider(cx - 5.0, cz - 3.3, 0.5)
  put(bake([...logParts(0.5, 0.12, [0, 0.12, 0], [0x3e2e1f, 0x7a6040], 0.4), ...logParts(0.45, 0.1, [0.3, 0.1, 0.3], [0x3e2e1f, 0x7a6040], 1.2)]), wood, -4.2, -2.6)
  put(bake([{ g: cyl(0.3, 0.24, 0.5, 12), p: [0, 0.25, 0], c: [0x4a3a28, 0x6e5638] }, ...[0.12, 0.38].map((y) => ({ g: new THREE.TorusGeometry(0.28 - y * 0.12, 0.018, 5, 12), p: [0, y, 0], r: [Math.PI / 2, 0, 0], c: 0x3a3a3c })), { g: cyl(0.27, 0.27, 0.02, 12), p: [0, 0.44, 0], c: 0x4f93a0 }, { g: new THREE.TorusGeometry(0.28, 0.012, 5, 10, Math.PI), p: [0, 0.5, 0], c: 0x3a3a3c }]), metal, 4.2, -3.6)

  // ---------- lantern post ----------
  const LP = [6.9, -2]
  const post = [rod([0, 0, 0], [0, 3.4, 0], 0.07, 0x5b4630, 7, 0.05), rod([0, 3.4, 0], [-0.9, 3.4, 0], 0.04, 0x4a3a28, 6), rod([0, 2.7, 0], [-0.45, 3.35, 0], 0.03, 0x4a3a28, 5), { g: ico(0.09, 1), p: [0, 3.45, 0], c: 0x7a5d3a }, { g: cyl(0.2, 0.3, 0.2, 7), p: [0, 0.1, 0], c: 0x6e6a60, j: 0.06 }, rod([-0.9, 3.4, 0], [-0.9, 3.25, 0], 0.012, 0x2b2b2b, 4)]
  put(bake(post), wood, LP[0], LP[1], 0)
  const lant = [{ g: cyl(0.2, 0.17, 0.07, 6), p: [-0.9, 2.78, 0], c: 0x2b2b2d }, { g: cone(0.23, 0.2, 6), p: [-0.9, 3.19, 0], c: 0x2b2b2d }, ...[0.78, 2.36, 3.93, 5.5].map((a) => rod([-0.9 + Math.cos(a) * 0.16, 2.8, Math.sin(a) * 0.16], [-0.9 + Math.cos(a) * 0.16, 3.2, Math.sin(a) * 0.16], 0.014, 0x2b2b2d, 4))]
  put(bake(lant), metal, LP[0], LP[1], 0)
  const lanternCore = put(bake([{ g: ico(0.15, 1), p: [-0.9, 3.0, 0], s: [1, 1.5, 1], c: [0xf0a038, 0xfff0b0] }]), glowM, LP[0], LP[1], 0, 0, root, false)
  const lLight = new THREE.PointLight(0xffca7a, 3, 12); lLight.position.set(LP[0] - 0.9, gy(...LP) + 3.0, LP[1]); root.add(lLight)
  addCollider(cx + LP[0], cz + LP[1], 0.25)

  // ---------- perimeter: boulders, grass tufts, flowers ----------
  const avoid = [[T[0], T[1], 3.4], [-3, 2, 1.4], [F[0], F[1], 3.3], [LP[0], LP[1], 1], [-5.4, -0.9, 1.2], [-5, -3.3, 1], [-4.3, 3, 1], [4.2, -3.6, 0.8]]
  const free = (x, z, m = 0) => avoid.every(([ax, az, ar]) => Math.hypot(x - ax, z - az) > ar + m)
  const instOn = (geo, mat2, items, shadow = false) => { const m = new THREE.InstancedMesh(geo, mat2, items.length), d = new THREE.Object3D(); items.forEach((it, i) => { d.position.set(...it.p); d.rotation.set(0, it.ry, 0); d.scale.setScalar(it.s); d.updateMatrix(); m.setMatrixAt(i, d.matrix); if (it.t) m.setColorAt(i, it.t) }); m.castShadow = shadow; m.receiveShadow = true; m.frustumCulled = false; root.add(m); return m }
  const ring = (n, r0, r1, make, tries = 5) => { const o = []; for (let k = 0; o.length < n && k < n * tries; k++) { const a = rnd() * 6.28, r = r0 + rnd() * (r1 - r0), x = -0.5 + Math.cos(a) * r, z = 0.5 + Math.sin(a) * r; if (free(x, z)) o.push(make(x, z)) } return o }
  const rockGeo = bake([{ g: ico(0.7, 1), s: [1, 0.65, 0.9], p: [0, 0.2, 0], c: [0x5f5c52, 0xaaa594], j: 0.3 }, { g: ico(0.35, 1), s: [1, 0.7, 1], p: [0.65, 0.05, 0.3], c: [0x6e6a5e, 0x9d9888], j: 0.2 }])
  instOn(rockGeo, wood, ring(8, 7.5, 9.5, (x, z) => ({ p: [x, gy(x, z) + 0.05, z], ry: rnd() * 6.28, s: 0.7 + rnd() * 0.8, t: new THREE.Color(0.9 + rnd() * 0.15, 0.9 + rnd() * 0.15, 0.9 + rnd() * 0.15) })), true)
  const tuftGeo = bake(Array.from({ length: 6 }, (_, i) => { const a = i / 6 * 6.28; return { g: cone(0.045, 0.55 + (i % 3) * 0.2, 4), p: [Math.cos(a) * 0.1, 0, Math.sin(a) * 0.1], r: [Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35], c: [0x4a6b34, 0xa5be5e], j: 0.03 } }))
  instOn(tuftGeo, wood, ring(110, 4.6, 10.5, (x, z) => ({ p: [x, gy(x, z) - 0.02, z], ry: rnd() * 6.28, s: 0.7 + rnd() * 0.9, t: new THREE.Color(0.85 + rnd() * 0.3, 0.9 + rnd() * 0.2, 0.8 + rnd() * 0.2) })))
  const stemGeo = bake([{ g: up(cyl(0.012, 0.018, 0.45, 4), 0.45), c: [0x3f6a2f, 0x6a9a44] }, { g: ico(0.05, 0), p: [0.05, 0.2, 0], s: [1.6, 0.4, 1], c: 0x4f8a3a }])
  const headGeo = bake([...Array.from({ length: 5 }, (_, i) => ({ g: ico(0.045, 0), p: [Math.cos(i / 5 * 6.28) * 0.06, 0.46, Math.sin(i / 5 * 6.28) * 0.06], s: [1, 0.55, 1], c: 0xffffff, j: 0.01 })), { g: ico(0.035, 0), p: [0, 0.47, 0], c: 0xf2c230 }])
  const fl = ring(22, 5, 10, (x, z) => ({ p: [x, gy(x, z), z], ry: rnd() * 6.28, s: 0.8 + rnd() * 0.6, t: col([0xf2f0e6, 0xf08cb4, 0xf5d24a, 0x8fb4f0][Math.floor(rnd() * 4)]) }))
  instOn(stemGeo, wood, fl); instOn(headGeo, wood, fl)

  // ---------- animation ----------
  let last = 0
  return {
    update(now) {
      const dt = Math.min(0.1, last ? (now - last) / 1000 : 0.016); last = now; const t = now / 1000
      const fk = 0.92 + 0.08 * Math.sin(t * 9) + 0.05 * Math.sin(t * 23.3)
      for (const f of tongues) {
        const s = fk * (0.86 + 0.2 * Math.sin(t * 7 * f.f + f.ph) + 0.08 * Math.sin(t * 17 * f.f + f.ph * 2))
        f.m.scale.set(f.w * (0.9 + 0.12 * Math.sin(t * 5 * f.f + f.ph + 1)), f.h * s, f.w * (0.9 + 0.12 * Math.cos(t * 6 * f.f + f.ph)))
        f.m.rotation.z = Math.sin(t * 3.1 * f.f + f.ph) * 0.1 - 0.05; f.m.rotation.x = Math.cos(t * 2.7 * f.f + f.ph) * 0.08; f.m.rotation.y = t * 0.8 * f.f
        f.m.position.x = f.x + Math.sin(t * 4 + f.ph) * 0.03
      }
      light.intensity = 10.5 + Math.sin(t * 20) * 1.6 + Math.sin(t * 31.7) * 1.1 + Math.sin(t * 7) * 0.8
      light.position.set(Math.sin(t * 13) * 0.12, 1.5 + Math.sin(t * 9) * 0.1, Math.cos(t * 11) * 0.12)
      coalMat.color.setScalar(0.8 + 0.22 * Math.sin(t * 3.2) + 0.1 * Math.sin(t * 11))
      glowDisc.material.opacity = 0.85 + Math.sin(t * 13) * 0.08; glowDisc.scale.setScalar(1 + Math.sin(t * 9) * 0.03)
      lLight.intensity = 3 + Math.sin(t * 5.1) * 0.25
      for (let i = 0; i < EN; i++) {
        const e = es[i]; e.life += dt * e.sp * 0.32
        if (e.life > 1) { e.life = 0; e.a = rnd() * 6.28; e.r = rnd() * 0.4 }
        const l = e.life, fade = Math.pow(1 - l, 1.6)
        ep[i * 3] = Math.cos(e.a) * e.r * (1 - l * 0.4) + l * 1.1 + Math.sin(t * 2 + e.ph) * 0.18 * l
        ep[i * 3 + 1] = 0.5 + l * 4.2; ep[i * 3 + 2] = Math.sin(e.a) * e.r * (1 - l * 0.4) + l * 0.35 + Math.cos(t * 2.3 + e.ph) * 0.18 * l
        ec[i * 3] = fade; ec[i * 3 + 1] = fade * (0.35 + 0.35 * (1 - l)); ec[i * 3 + 2] = fade * 0.08
      }
      eg.attributes.position.needsUpdate = true; eg.attributes.color.needsUpdate = true
      for (const p of puffs) {
        const k = (t * 0.1 + p.ph) % 1
        p.m.position.set(0.1 + k * 2.4 + Math.sin(p.r + t * 0.6) * 0.3 * k, 2.2 + k * 6.5, k * 0.9 + Math.cos(p.r + t * 0.5) * 0.3 * k)
        p.m.scale.setScalar(0.45 + k * 2.4); p.m.material.opacity = 0.2 * smoothstep(k, 0, 0.15) * (1 - smoothstep(k, 0.55, 1))
      }
    },
  }
}
