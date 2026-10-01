import * as THREE from 'three'
import { TYPE_COLOR } from './creatures.js'

// Battle FX engine: one pooled additive particle system + a tiny task scheduler + per-move animation recipes.
const R = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a))
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)
const dirv = () => V(R(-1, 1), R(-1, 1), R(-1, 1)).normalize()
const col = (c) => (c instanceof THREE.Color ? c : new THREE.Color(c))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const sc = (o, s) => (o.scale.setScalar(s), o)
export const ease = { out: (t) => 1 - (1 - t) ** 3, in: (t) => t * t * t, io: (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2), back: (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2 }
export const MELEE = new Set(['tackle'])

const VERT = 'attribute float aSize; attribute float aAlpha; attribute vec3 aColor; uniform float uScale; varying float vA; varying vec3 vC; void main() { vA = aAlpha; vC = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = max(0.0, aSize * uScale / -mv.z); gl_Position = projectionMatrix * mv; }'
const FRAG = 'varying float vA; varying vec3 vC; void main() { float r = length(gl_PointCoord - 0.5) * 2.0; float a = 1.0 - smoothstep(0.0, 1.0, r); a = a * a * vA; if (a < 0.003) discard; gl_FragColor = vec4(vC, a);\n #include <colorspace_fragment>\n }'

export function createFx(scene) {
  const group = new THREE.Group(); scene.add(group)
  const live = new Set(), tasks = []
  let shakeAmt = 0, last = performance.now(), dt = 0.016
  const GY = 0.34
  const geo = {
    ico: new THREE.IcosahedronGeometry(1, 2), rock: new THREE.DodecahedronGeometry(1, 0), ring: new THREE.RingGeometry(0.86, 1, 64).rotateX(-Math.PI / 2),
    fang: new THREE.ConeGeometry(1, 1, 8).rotateX(Math.PI / 2), pillar: new THREE.CylinderGeometry(1, 1, 1, 32, 1, true).translate(0, 0.5, 0),
    blade: new THREE.TorusGeometry(1, 0.16, 6, 18, Math.PI).rotateX(Math.PI / 2), wave: new THREE.CylinderGeometry(1, 1, 1, 28, 1, true, -Math.PI / 2, Math.PI),
    box: new THREE.BoxGeometry(1, 1, 1), disc: new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2),
  }
  const glow = (c, op = 1) => new THREE.MeshBasicMaterial({ color: col(c).clone(), transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
  const solid = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o })
  const mesh = (g, m, p) => { const o = new THREE.Mesh(g, m); if (p) o.position.copy(p); return o }
  const put = (o) => { group.add(o); live.add(o); return o }
  const drop = (o) => { group.remove(o); live.delete(o); o.traverse((c) => c.material?.dispose?.()) }
  const run = (ms, fn) => new Promise((res) => tasks.push({ t0: performance.now(), ms, fn, res }))

  const N = 1400, P = Array.from({ length: N }, () => ({ life: 0 })), pos = new Float32Array(N * 3), cl = new Float32Array(N * 3), al = new Float32Array(N), sz = new Float32Array(N)
  const pg = new THREE.BufferGeometry()
  ;[['position', pos, 3], ['aColor', cl, 3], ['aAlpha', al, 1], ['aSize', sz, 1]].forEach(([n, a, s]) => pg.setAttribute(n, new THREE.BufferAttribute(a, s).setUsage(THREE.DynamicDrawUsage)))
  const pm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, uniforms: { uScale: { value: 600 } }, vertexShader: VERT, fragmentShader: FRAG })
  const pts = new THREE.Points(pg, pm); pts.frustumCulled = false; pts.renderOrder = 5; group.add(pts)
  let cur = 0; const tmp = new THREE.Color()
  const emit = (p, v, c, size, life, o = {}) => {
    const q = P[cur]; cur = (cur + 1) % N
    q.x = p.x; q.y = p.y; q.z = p.z; q.vx = v.x; q.vy = v.y; q.vz = v.z; q.life = q.max = life; q.size = size; q.grow = o.grow ?? 0; q.g = o.g || 0; q.d = o.d || 0; q.c = col(c); q.c2 = o.to ? col(o.to) : null; q.fade = o.fade ?? 1
  }
  const burst = (p, c, n = 20, o = {}) => {
    const { speed = 4, size = 0.28, life = 0.7, up = 0 } = o
    for (let i = 0; i < n; i++) { const v = dirv().multiplyScalar(speed * R(0.35, 1)); v.y += up; emit(p, v, c, size * R(0.6, 1.3), life * R(0.7, 1.25), o) }
  }
  const stream = (a, b, c, life = 0.35) => { const p = a.clone().add(V(R(-.25, .25), R(-.25, .25), R(-.25, .25))); emit(p, b.clone().sub(p).multiplyScalar(1 / life), c, 0.2, life, { grow: -0.4 }) }

  const ring = (p, c, { r0 = 0.3, r1 = 2.6, ms = 500, op = 0.9, y } = {}) => {
    const m = put(mesh(geo.ring, glow(c, op), p)); if (y !== undefined) m.position.y = y
    return run(ms, (t) => { m.scale.setScalar(r0 + (r1 - r0) * ease.out(t)); m.material.opacity = op * (1 - t) ** 1.5; if (t >= 1) drop(m) })
  }
  const ball = (p, c, r = 1, ms = 300, op = 0.8) => {
    const m = put(mesh(geo.ico, glow(c, op), p))
    return run(ms, (t) => { m.scale.setScalar(r * (0.4 + ease.out(t) * 0.9)); m.material.opacity = op * (1 - t); if (t >= 1) drop(m) })
  }
  const pillar = (p, c, { h = 9, r = 1, ms = 600 } = {}) => {
    const m = put(mesh(geo.pillar, glow(c, 0.6), V(p.x, GY, p.z)))
    return run(ms, (t) => { const w = r * (1 - ease.in(t)) + 0.05; m.scale.set(w, h, w); m.material.opacity = 0.6 * (1 - t * t); if (t >= 1) drop(m) })
  }
  const bolt = (a, b, c, { ms = 220, w = 0.07, jag = 0.5, n = 9 } = {}) => {
    const h = put(new THREE.Group()), segs = Array.from({ length: n }, () => { const g = mesh(geo.box, glow(c, 0.5)), k = mesh(geo.box, glow(0xffffff, 1)); h.add(g, k); return [g, k] }); let f = 0
    const jitter = () => {
      const pt = Array.from({ length: n + 1 }, (_, i) => { const u = i / n, p = a.clone().lerp(b, u); if (i > 0 && i < n) p.add(V(R(-1, 1), R(-1, 1), R(-1, 1)).multiplyScalar(Math.sin(u * Math.PI) * jag)); return p })
      segs.forEach(([g, k], i) => { const m = pt[i].clone().add(pt[i + 1]).multiplyScalar(0.5), L = pt[i].distanceTo(pt[i + 1]); for (const [o, s] of [[g, w * 3.2], [k, w]]) { o.position.copy(m); o.lookAt(pt[i + 1]); o.scale.set(s, s, L) } })
    }
    return run(ms, (t) => { if (f++ % 2 === 0) jitter(); h.children.forEach((o) => { o.material.opacity *= t > 0.7 ? 0.82 : 1 }); if (t >= 1) drop(h) })
  }
  const orb = (outer, inner, r, op = 0.9) => { const g = new THREE.Group(); g.add(sc(mesh(geo.ico, glow(outer, op)), r), sc(mesh(geo.ico, glow(inner, 1)), r * 0.55)); return g }
  const fly = (a, b, ms, make, { arc = 0.6, lat = 0, spin = [0.2, 0.3, 0], trail, rate = 2 } = {}) => {
    const m = put(make()), p = V(), d = b.clone().sub(a), side = V(-d.z, 0, d.x).normalize().multiplyScalar(lat)
    return run(ms, (t) => {
      p.lerpVectors(a, b, t); p.y += Math.sin(t * Math.PI) * arc; p.addScaledVector(side, Math.sin(t * Math.PI)); m.position.copy(p)
      m.rotation.x += spin[0]; m.rotation.y += spin[1]; m.rotation.z += spin[2]
      if (trail) for (let i = 0; i < rate; i++) emit(p, V(R(-.4, .4), R(-.2, .4), R(-.4, .4)), trail.c, trail.size, trail.life, { to: trail.to, g: trail.g || 0, grow: -0.6 })
      if (t >= 1) drop(m)
    })
  }
  const debris = (p, k = 1) => {
    for (let i = 0; i < Math.floor(7 * k); i++) {
      const s = R(0.07, 0.17) * k, m = put(mesh(geo.rock, solid(0x8a8470, { flatShading: true, roughness: 1 }), p)), v = dirv().multiplyScalar(R(2.5, 5)); v.y = Math.abs(v.y) + 2.5; sc(m, s)
      run(950, (t) => { m.position.addScaledVector(v, dt); v.y -= 11 * dt; m.rotation.x += 6 * dt; m.rotation.z += 4 * dt; if (m.position.y < GY) { m.position.y = GY; v.y *= -0.3; v.x *= 0.6; v.z *= 0.6 } sc(m, s * Math.min(1, (1 - t) / 0.3)); if (t >= 1) drop(m) })
    }
  }
  const scorch = (p, c) => {
    const m = put(mesh(geo.disc, new THREE.MeshBasicMaterial({ color: col(c).clone().multiplyScalar(0.22), transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), V(p.x, GY + 0.02, p.z))); sc(m, R(0.8, 1.3))
    return run(2600, (t) => { m.material.opacity = 0.5 * (1 - t); if (t >= 1) drop(m) })
  }

  const impact = (type, p, { k = 1 } = {}) => {
    const c = col(TYPE_COLOR[type] || '#ffffff')
    ball(p, 0xffffff, 0.55 * k, 180, 0.85); ring(p, c, { r1: 2.4 * k, ms: 460 }); ring(p, 0xffffff, { y: GY, r0: 0.4, r1: 3.2 * k, ms: 520, op: 0.5 })
    switch (type) {
      case 'FIRE': ball(p, 0xff8a3a, 1.1 * k, 480, 0.7); burst(p, 0xffb04a, Math.floor(26 * k), { speed: 4, size: 0.42, life: 0.8, g: -2.5, d: 1.2, to: 0xd8341f }); scorch(p, 0xff7a2a); break
      case 'WATER': burst(p, 0xcdf2ff, 24, { speed: 4.2, size: 0.26, life: 0.9, g: 9, d: 0.5, up: 3 }); burst(p, c, 14, { speed: 3, size: 0.4, life: 0.6, g: 3 }); break
      case 'GRASS': burst(p, c, 24, { speed: 4.5, size: 0.3, life: 0.9, g: 1.2, d: 1.2, up: 1.5, to: 0xd9f08a }); break
      case 'ELECTRIC': burst(p, 0xfff1a0, 28, { speed: 7, size: 0.2, life: 0.4, d: 3 }); for (let i = 0; i < 3; i++) bolt(p, p.clone().add(dirv().multiplyScalar(R(1.2, 2))), 0xffe66a, { ms: 200, w: 0.04, jag: 0.3, n: 5 }); scorch(p, 0x6a5a20); break
      case 'ROCK': debris(p, k); burst(p, 0xb8ae92, 18, { speed: 3, size: 0.55, life: 0.9, g: -0.3, d: 2, grow: 1.2, fade: 1.5 }); scorch(p, 0x4a4030); break
      case 'GHOST': burst(p, c, 18, { speed: 2, size: 0.45, life: 1.1, g: -1.8, d: 1.2, to: 0x7de8ff }); ring(p, 0x7de8ff, { r0: 3, r1: 0.3, ms: 520, op: 0.7 }); break
      default: burst(p, 0xffffff, 16, { speed: 6, size: 0.22, life: 0.4, d: 3 }); burst(p, 0xd8cfae, 10, { speed: 2.5, size: 0.5, life: 0.7, d: 2, grow: 1 })
    }
  }

  const volley = (n, gap, mk) => Promise.all(Array.from({ length: n }, (_, i) => sleep(i * gap).then(() => mk(i))))
  const CAST = {
    tackle: async () => {},
    vine: async (a, b) => {
      const n = 18, h = put(new THREE.Group()), m = solid(0x4f8f3a, { emissive: 0x1d4a1a, emissiveIntensity: 0.5 }), segs = Array.from({ length: n }, () => { const s = mesh(geo.ico, m); h.add(s); return s })
      const d = b.clone().sub(a), side = V(-d.z, 0, d.x).normalize(), p = V()
      run(780, (t) => {
        const head = ease.out(Math.min(1, t / 0.45)), tail = t > 0.72 ? (t - 0.72) / 0.28 : 0
        segs.forEach((s, i) => { const u = i / (n - 1), w = tail + (head - tail) * u; p.lerpVectors(a, b, w); p.y += Math.sin(w * Math.PI) * 0.55; p.addScaledVector(side, Math.sin(w * Math.PI * 3 + t * 16) * 0.4 * Math.sin(w * Math.PI)); s.position.copy(p); sc(s, head - tail > 0.03 ? 0.07 + 0.1 * (1 - u) : 0.001) })
        if (t < 0.6) { p.lerpVectors(a, b, head); emit(p, V(R(-1, 1), R(0, 1.5), R(-1, 1)), 0x9bd36f, 0.26, 0.6, { g: 1, to: 0xd9f08a }) }
        if (t >= 1) drop(h)
      })
      await new Promise((res) => setTimeout(res, 330))
    },
    leafblade: (a, b) => volley(5, 70, (i) => fly(a, b, 430, () => { const g = new THREE.Group(); g.add(sc(mesh(geo.blade, solid(0x8fd05a, { emissive: 0x4aa03a, emissiveIntensity: 1, side: THREE.DoubleSide })), 0.5)); return g }, { arc: 0.4, lat: (i - 2) * 0.7, spin: [0, 0.55, 0.05], trail: { c: 0x8fd05a, to: 0xe6f7a0, size: 0.22, life: 0.4 }, rate: 2 }).then(() => { if (i < 4) impact('GRASS', b, { k: 0.4 }) })),
    ember: (a, b) => volley(3, 130, (i) => fly(a, b, 460, () => orb(0xff7a2a, 0xffe08a, 0.26), { arc: 0.5 + i * 0.2, lat: (i - 1) * 0.5, trail: { c: 0xffa040, to: 0xd8341f, size: 0.3, life: 0.45, g: -2 }, rate: 3 }).then(() => { if (i < 2) impact('FIRE', b, { k: 0.45 }) })),
    flare: (a, b) => fly(a, b, 560, () => orb(0xff6a24, 0xffe08a, 0.55), { arc: 0.9, trail: { c: 0xffa040, to: 0xd8341f, size: 0.45, life: 0.55, g: -2 }, rate: 5 }),
    bubble: (a, b) => volley(7, 90, (i) => fly(a, b, 520, () => { const m = mesh(geo.ico, new THREE.MeshPhysicalMaterial({ color: 0xbfe8ff, roughness: 0.05, transparent: true, opacity: 0.55, emissive: 0x2a6a9a, emissiveIntensity: 0.35, clearcoat: 1 })); return sc(m, R(0.16, 0.3)) }, { arc: 1.1, lat: R(-0.6, 0.6), spin: [0, 0, 0], trail: { c: 0xcdf2ff, size: 0.14, life: 0.35, g: 2 }, rate: 1 }).then(() => { if (i < 6) impact('WATER', b, { k: 0.3 }) })),
    tide: async (a, b, c, g) => {
      const dir = b.clone().sub(a).setY(0).normalize(), w = put(mesh(geo.wave, new THREE.MeshStandardMaterial({ color: 0x58b4e8, transparent: true, opacity: 0.72, side: THREE.DoubleSide, emissive: 0x1d5f9a, emissiveIntensity: 0.55, roughness: 0.15 }))), ry = Math.atan2(dir.x, dir.z); w.rotation.y = ry
      const s0 = V(a.x, g, a.z), s1 = V(b.x, g, b.z), p = V()
      run(780, (t) => {
        p.lerpVectors(s0, s1, ease.io(t)); const h = (0.35 + 1.3 * Math.sin(Math.min(1, t * 1.4) * Math.PI / 2)) * (t > 0.85 ? (1 - t) / 0.15 : 1), sx = 1.1 + t * 0.45
        w.scale.set(sx, Math.max(0.01, h), 1.0); w.position.set(p.x, g + h / 2, p.z)
        for (let k = 0; k < 3; k++) { const th = R(-1.4, 1.4), lx = Math.sin(th) * sx, lz = Math.cos(th); emit(V(p.x + lx * Math.cos(ry) + lz * Math.sin(ry), g + h, p.z - lx * Math.sin(ry) + lz * Math.cos(ry)), V(R(-.5, .5), R(.5, 1.5), R(-.5, .5)), 0xe8fbff, 0.3, 0.5, { g: 3 }) }
        if (t >= 1) drop(w)
      })
      await new Promise((res) => setTimeout(res, 700))
    },
    zap: async (a, b) => { bolt(a, b, 0xffe66a, { ms: 240, w: 0.05, jag: 0.8 }); await new Promise((res) => setTimeout(res, 140)); bolt(V(b.x + 0.4, b.y + 10, b.z), b, 0xfff2a0, { ms: 260, w: 0.1, jag: 1.3, n: 12 }); await new Promise((res) => setTimeout(res, 120)) },
    fang: async (a, b) => {
      const ps = [0, 1, 2, 3].map((k) => ({ m: sc(put(mesh(geo.fang, glow(0xfff09a, 0.95))), 1), ang: k * Math.PI / 2 + 0.4 }))
      await run(380, (t) => ps.forEach(({ m, ang }) => { const e = ease.in(t), r = 1.7 * (1 - e) + 0.15; m.scale.set(0.26, 0.26, 1.5); m.position.set(b.x + Math.cos(ang) * r, b.y + 3.4 - e * 2.3, b.z + Math.sin(ang) * r); m.lookAt(b); if (t >= 1) drop(m) }))
      bolt(V(b.x, b.y + 10, b.z), b, 0xfff2a0, { ms: 280, w: 0.12, jag: 0.9, n: 12 }); await new Promise((res) => setTimeout(res, 130))
    },
    pebble: (a, b) => volley(3, 150, (i) => fly(a, b, 560, () => sc(mesh(geo.rock, solid(0x8a8470, { flatShading: true, roughness: 1 })), 0.3), { arc: 1.8, lat: (i - 1) * 0.5, spin: [0.15, 0.2, 0.1], trail: { c: 0xb8ae92, size: 0.2, life: 0.5 }, rate: 1 }).then(() => { if (i < 2) impact('ROCK', b, { k: 0.45 }) })),
    slam: async (a, b, c, g) => {
      ring(V(b.x, g, b.z), 0xa39a80, { y: g, r0: 1.8, r1: 1.2, ms: 700, op: 0.7 })
      const land = []; for (let i = 0; i < 6; i++) land.push(new Promise((res) => setTimeout(async () => { const off = V(R(-1.1, 1.1), 0, R(-1.1, 1.1)), top = V(b.x + off.x, b.y + 9, b.z + off.z), end = V(b.x + off.x, g + 0.3, b.z + off.z), s = R(0.4, 0.75), m = put(mesh(geo.rock, solid(0x8a8470, { flatShading: true, roughness: 1 }))); sc(m, s)
        await run(380, (t) => { m.position.lerpVectors(top, end, ease.in(t)); m.rotation.x += 0.12; if (t >= 1) drop(m) }); impact('ROCK', end, { k: 0.5 }); shakeAmt = Math.max(shakeAmt, 0.2); res() }, 240 + i * 80)))
      await Promise.all(land.slice(0, 4))
    },
    pulse: async (a, b) => {
      const g = put(new THREE.Group()), wisps = [0, 1, 2].map((i) => { const w = sc(mesh(geo.ico, glow(i ? 0x7de8ff : 0xd6b8ff, 0.95)), 0.12); g.add(w); return w }), p = V()
      g.add(sc(mesh(geo.ico, new THREE.MeshBasicMaterial({ color: 0x1b0f33 })), 0.3), sc(mesh(geo.ico, glow(0xa07cf0, 0.55)), 0.55))
      await run(760, (t) => {
        const u = ease.io(t); p.lerpVectors(a, b, u); p.y += Math.sin(u * Math.PI) * 0.7; g.position.copy(p); sc(g, 0.6 + 0.6 * t)
        wisps.forEach((w, i) => { const an = t * 16 + i * 2.094; w.position.set(Math.cos(an) * 0.62, Math.sin(an * 1.3) * 0.3, Math.sin(an) * 0.62) })
        emit(p, V(R(-.3, .3), R(-.1, .5), R(-.3, .3)), 0xa07cf0, 0.4, 0.5, { to: 0x7de8ff, grow: -0.5 }); if (t >= 1) drop(g)
      })
    },
    rush: (a, b) => volley(6, 55, (i) => fly(a, b, 340, () => orb(0xb89cf5, 0xffffff, 0.2), { arc: 0.3, lat: (i - 2.5) * 0.35, trail: { c: 0x9a78d0, to: 0x7de8ff, size: 0.3, life: 0.45 }, rate: 3 }).then(() => { if (i < 5) impact('GHOST', b, { k: 0.35 }) })),
  }

  const charge = (p, c) => {
    ring(p, c, { y: GY, r0: 2.6, r1: 0.5, ms: 520, op: 0.8 })
    for (let i = 0; i < 26; i++) setTimeout(() => { const s = dirv().multiplyScalar(R(1.4, 2.1)); emit(p.clone().add(s), s.clone().multiplyScalar(-2), c, 0.3, 0.5, { grow: -0.5 }) }, R(0, 320))
  }
  const sendOut = (p, c) => { pillar(p, 0xffffff, { h: 9, r: 1.2, ms: 560 }); ring(p, c, { y: GY, r0: 0.5, r1: 3.4, ms: 600 }); ball(p, 0xffffff, 1.2, 380); burst(p, 0xffffff, 26, { speed: 2.5, size: 0.3, life: 1, g: -1.2, up: 2, to: c }) }
  const recall = (p, c) => { ring(p, c, { y: GY, r0: 3, r1: 0.3, ms: 460 }); for (let i = 0; i < 24; i++) setTimeout(() => { const s = dirv().multiplyScalar(R(1, 1.7)); emit(p.clone().add(s), s.clone().multiplyScalar(-2.4), 0xffffff, 0.28, 0.42, { to: c, grow: -0.5 }) }, R(0, 280)); ball(p, c, 0.9, 380, 0.5) }
  const appear = (p, c) => { ring(p, 0x9bc66a, { y: GY, r0: 0.4, r1: 3, ms: 560 }); burst(V(p.x, GY + 0.2, p.z), 0x9bc66a, 28, { speed: 3.2, size: 0.4, life: 1, g: 1, up: 1.5, d: 1.2, to: 0xd9f08a }); burst(V(p.x, GY + 0.2, p.z), 0xd8cfae, 12, { speed: 1.6, size: 0.6, life: 0.9, grow: 1.2, d: 2 }) }
  const faint = (p, c) => { ring(p, 0xffffff, { y: GY, r0: 0.4, r1: 3.2, ms: 700, op: 0.7 }); burst(p, 0xeaffff, 22, { speed: 1.2, size: 0.4, life: 1.4, g: -1.4, up: 1, to: c, d: 0.8 }) }
  const levelUp = (p) => {
    const gold = col(0xffd36a)
    for (let i = 0; i < 3; i++) setTimeout(() => { const m = put(mesh(geo.ring, glow(gold, 0.85))); run(900, (t) => { m.position.set(p.x, GY + t * 3.2, p.z); m.scale.setScalar(1.6 + t * 0.4); m.material.opacity = 0.85 * (1 - t); if (t >= 1) drop(m) }) }, i * 220)
    pillar(p, gold, { h: 8, r: 1.3, ms: 900 }); burst(p, gold, 40, { speed: 3.5, size: 0.3, life: 1.2, g: 2, up: 3, to: 0xfff3c0, d: 1 })
  }
  const caught = (p, c) => { for (let i = 0; i < 3; i++) setTimeout(() => ring(p, i ? c : 0xffffff, { r0: 0.4, r1: 3 + i, ms: 600 }), i * 180); burst(p, 0xffe9a8, 40, { speed: 5, size: 0.3, life: 1.1, g: 3, up: 2 }); ball(p, c, 1.1, 450) }

  const flashModel = (model, c, ms = 280) => {
    const saved = []; model.traverse((o) => { if (o.isMesh && o.material?.emissive && !saved.some(([m]) => m === o.material)) saved.push([o.material, o.material.emissive.clone(), o.material.emissiveIntensity]) }); const f = col(c)
    return run(ms, (t) => { const k = (1 - t) ** 2; for (const [m, e, i] of saved) { m.emissive.copy(e).lerp(f, k); m.emissiveIntensity = i + (1 - i) * k * 0.9 } if (t >= 1) for (const [m, e, i] of saved) { m.emissive.copy(e); m.emissiveIntensity = i } })
  }

  const update = (now, viewScale) => {
    const t1 = performance.now(); dt = Math.min(0.05, (t1 - last) / 1000); last = t1; pm.uniforms.uScale.value = viewScale
    for (const k of tasks.slice()) { const t = k.ms <= 0 ? 1 : Math.min(1, Math.max(0, (t1 - k.t0) / k.ms)); k.fn(t, dt); if (t >= 1) { tasks.splice(tasks.indexOf(k), 1); k.res() } }
    for (let i = 0; i < N; i++) {
      const q = P[i]; if (q.life <= 0) { al[i] = 0; sz[i] = 0; continue }
      q.life -= dt; if (q.life <= 0) { al[i] = 0; sz[i] = 0; continue }
      const t = 1 - q.life / q.max, k = Math.max(0, 1 - q.d * dt)
      q.vx *= k; q.vz *= k; q.vy = q.vy * k - q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt
      pos[i * 3] = q.x; pos[i * 3 + 1] = q.y; pos[i * 3 + 2] = q.z
      const c = q.c2 ? tmp.copy(q.c).lerp(q.c2, t) : q.c; cl[i * 3] = c.r; cl[i * 3 + 1] = c.g; cl[i * 3 + 2] = c.b
      al[i] = Math.min(1, t * 12) * (1 - t) ** q.fade; sz[i] = Math.max(0.01, q.size * (1 + q.grow * t))
    }
    for (const n of ['position', 'aColor', 'aAlpha', 'aSize']) pg.attributes[n].needsUpdate = true
    shakeAmt *= Math.exp(-dt * 6.5)
  }

  return {
    group, add: (o) => { group.add(o); return o }, remove: (o) => { group.remove(o); return o }, run, update, ease, burst, ball, ring, impact, charge, sendOut, recall, appear, faint, levelUp, caught, flashModel, stream, GY,
    cast: (key, a, b, c, g) => (CAST[key] || CAST.tackle)(a, b, col(c), g ?? GY),
    shake: (a) => { shakeAmt = Math.max(shakeAmt, a) },
    shakeOffset: (v) => v.set(R(-1, 1), R(-1, 1), R(-1, 1)).multiplyScalar(shakeAmt * 0.5),
    clear: () => { [...live].forEach(drop); P.forEach((q) => { q.life = 0 }); tasks.length = 0; shakeAmt = 0 },
  }
}
