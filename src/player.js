import * as THREE from 'three'

const M = (color, roughness = 0.8, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra })
const lerp = THREE.MathUtils.lerp

// Detailed explorer character. Faces +Z, feet at y = 0, ~2 units tall with beanie.
export function createPlayerModel() {
  const m = {
    skin: M(0xe2b48e, 0.55), skinDark: M(0xc98f6c, 0.6),
    jacket: M(0x3f7d6a, 0.7), jacketDark: M(0x2f5f50, 0.75), trim: M(0xe9b24a, 0.45, { metalness: 0.3 }),
    pants: M(0x3b4250, 0.85), leather: M(0x7a5434, 0.6), leatherDark: M(0x4a3322, 0.7),
    beanie: M(0xd9552f, 0.92), scarf: M(0xf2d27a, 0.92), bedroll: M(0x7f8f5c, 0.95), canvas: M(0xb59a6a, 0.95),
    hair: M(0x3a2b22, 0.65), white: M(0xf7f4ea, 0.25), iris: M(0x4f6b45, 0.3), pupil: M(0x120e0c, 0.2),
    mouth: M(0x9a4f43, 0.5), capsule: M(0xf4d27d, 0.3, { emissive: 0xa56632, emissiveIntensity: 0.45 }),
  }
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body)
  const part = (parent, geo, mat, pos = [0, 0, 0], scale = [1, 1, 1], rot = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(...pos); mesh.scale.set(...scale); mesh.rotation.set(...rot)
    parent.add(mesh); return mesh
  }
  const pivot = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g }
  const cap = (r, len) => new THREE.CapsuleGeometry(r, len, 8, 20)
  const ball = (r, w = 24, h = 16) => new THREE.SphereGeometry(r, w, h)

  // Legs: thigh -> knee -> shin, boots
  const legs = [-1, 1].map((side) => {
    const hip = pivot(body, side * 0.125, 0.98, 0)
    part(hip, cap(0.1, 0.3), m.pants, [0, -0.24, 0])
    const knee = pivot(hip, 0, -0.47, 0)
    part(knee, cap(0.082, 0.3), m.pants, [0, -0.22, 0])
    part(knee, ball(0.095), m.leatherDark, [0, 0.0, 0.055], [1, 0.9, 0.65])
    part(knee, new THREE.CylinderGeometry(0.092, 0.1, 0.2, 24), m.leather, [0, -0.36, 0])
    part(knee, new THREE.CylinderGeometry(0.104, 0.104, 0.035, 24), m.leatherDark, [0, -0.27, 0])
    part(knee, ball(0.1, 24, 14), m.leather, [0, -0.43, 0.05], [1, 0.72, 1.75])
    part(knee, ball(0.1, 24, 10), m.leatherDark, [0, -0.49, 0.05], [1.02, 0.28, 1.8])
    return { hip, knee }
  })

  // Torso (smooth lathe jacket), arms, head
  const torso = pivot(body, 0, 0.98, 0)
  const profile = [[0, -0.04], [0.19, -0.04], [0.2, 0.05], [0.185, 0.2], [0.2, 0.36], [0.225, 0.46], [0.2, 0.54], [0.11, 0.6], [0, 0.6]].map(([r, y]) => new THREE.Vector2(r, y))
  const jacket = part(torso, new THREE.LatheGeometry(profile, 44), m.jacket, [0, 0, 0], [1.2, 1, 0.78])
  jacket.material.side = THREE.DoubleSide
  part(torso, new THREE.BoxGeometry(0.014, 0.5, 0.01), m.trim, [0, 0.28, 0.158])
  for (const s of [-1, 1]) part(torso, new THREE.BoxGeometry(0.09, 0.07, 0.02), m.jacketDark, [s * 0.1, 0.38, 0.152], [1, 1, 1], [0, 0, s * -0.1])
  part(torso, new THREE.TorusGeometry(0.2, 0.028, 12, 44), m.leatherDark, [0, 0.04, 0], [1.2, 0.78, 1], [Math.PI / 2, 0, 0])
  part(torso, new THREE.BoxGeometry(0.06, 0.05, 0.02), m.trim, [0, 0.04, 0.165])
  part(torso, ball(0.048, 20, 14), m.capsule, [0.24, -0.01, 0.1]) // vector capsule on belt
  part(torso, ball(0.048, 20, 14), m.capsule, [-0.24, -0.01, 0.1])
  for (const s of [-1, 1]) part(torso, cap(0.05, 0.06), m.leather, [s * 0.24, 0.05, -0.06], [1, 1, 1.3])
  part(torso, new THREE.CylinderGeometry(0.065, 0.072, 0.1, 18), m.skin, [0, 0.64, 0])
  part(torso, new THREE.TorusGeometry(0.105, 0.036, 14, 32), m.jacketDark, [0, 0.58, 0], [1.15, 0.9, 1], [Math.PI / 2, 0, 0])
  part(torso, new THREE.TorusGeometry(0.11, 0.05, 14, 36), m.scarf, [0, 0.64, 0.01], [1.15, 0.95, 1], [Math.PI / 2, 0, 0])
  const scarfTail = pivot(torso, 0.09, 0.62, -0.12)
  part(scarfTail, cap(0.04, 0.2), m.scarf, [0, -0.15, 0], [1, 1, 0.45])
  part(scarfTail, new THREE.BoxGeometry(0.085, 0.03, 0.02), m.trim, [0, -0.29, 0])

  // Backpack + bedroll
  part(torso, cap(0.14, 0.2), m.canvas, [0, 0.3, -0.26], [1.2, 1, 0.78])
  part(torso, new THREE.CylinderGeometry(0.075, 0.075, 0.46, 20), m.bedroll, [0, 0.58, -0.26], [1, 1, 1], [0, 0, Math.PI / 2])
  part(torso, new THREE.BoxGeometry(0.2, 0.05, 0.03), m.leather, [0, 0.4, -0.355])
  for (const s of [-1, 1]) part(torso, new THREE.BoxGeometry(0.045, 0.44, 0.02), m.leather, [s * 0.115, 0.33, 0.1], [1, 1, 1], [0.12, 0, s * 0.05])

  const arms = [-1, 1].map((side) => {
    const shoulder = pivot(torso, side * 0.285, 0.5, 0)
    part(shoulder, ball(0.085), m.jacket, [0, 0, 0], [1, 0.9, 1])
    part(shoulder, cap(0.068, 0.2), m.jacket, [0, -0.16, 0])
    const elbow = pivot(shoulder, 0, -0.33, 0)
    part(elbow, cap(0.06, 0.18), m.jacket, [0, -0.15, 0])
    part(elbow, new THREE.CylinderGeometry(0.067, 0.067, 0.04, 22), m.leatherDark, [0, -0.28, 0])
    part(elbow, ball(0.063, 22, 16), m.leather, [0, -0.35, 0.01], [1, 1.1, 1])
    part(elbow, ball(0.026, 12, 10), m.leather, [side * -0.05, -0.33, 0.035])
    return { shoulder, elbow }
  })

  const head = pivot(torso, 0, 0.76, 0)
  part(head, ball(0.2, 40, 28), m.skin, [0, 0, 0], [0.92, 1.05, 0.98])
  part(head, ball(0.12, 28, 18), m.skin, [0, -0.09, 0.05], [1.05, 0.85, 0.95])
  part(head, ball(0.032, 16, 12), m.skin, [0, -0.05, 0.195], [0.9, 1.1, 1.2])
  for (const s of [-1, 1]) {
    part(head, ball(0.036, 20, 14), m.white, [s * 0.075, -0.01, 0.172], [1, 1.1, 0.5])
    part(head, ball(0.022, 18, 12), m.iris, [s * 0.075, -0.01, 0.184], [1, 1, 0.4])
    part(head, ball(0.012, 12, 8), m.pupil, [s * 0.075, -0.01, 0.19], [1, 1, 0.4])
    part(head, ball(0.005, 8, 6), m.white, [s * 0.082, 0.0, 0.197])
    part(head, new THREE.BoxGeometry(0.062, 0.013, 0.013), m.hair, [s * 0.075, 0.045, 0.178], [1, 1, 1], [0, 0, s * -0.12])
    part(head, ball(0.04, 14, 10), m.skin, [s * 0.185, -0.01, 0], [0.5, 1, 0.8])
    part(head, ball(0.05, 14, 10), m.hair, [s * 0.165, 0.05, 0.02])
    part(head, ball(0.018, 10, 8), m.skinDark, [s * 0.1, -0.085, 0.165], [1.4, 0.8, 0.5]) // cheeks
  }
  part(head, new THREE.TorusGeometry(0.03, 0.005, 8, 18, Math.PI), m.mouth, [0, -0.095, 0.182], [1, 0.8, 0.6], [0, 0, Math.PI])
  const hairBack = part(head, new THREE.SphereGeometry(0.205, 32, 20, Math.PI, Math.PI, 0, 2.0), m.hair, [0, 0.0, -0.01], [0.94, 1.05, 1])
  hairBack.material.side = THREE.DoubleSide
  part(head, new THREE.SphereGeometry(0.218, 36, 20, 0, Math.PI * 2, 0, 1.55), m.beanie, [0, 0.1, 0], [0.98, 1, 1.0], [-0.12, 0, 0])
  part(head, new THREE.TorusGeometry(0.212, 0.032, 14, 44), m.jacketDark, [0, 0.092, -0.005], [0.98, 1.0, 1], [Math.PI / 2 - 0.12, 0, 0])
  part(head, ball(0.06, 18, 14), m.beanie, [0, 0.32, -0.04])

  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true } })
  root.userData.rig = { body, legs, arms, torso, head, scarfTail, phase: 0, amt: 0, crouch: 0, t: 0 }
  return root
}

// amount 0..1 = how much the character is really moving (0 when blocked by a collider)
export function animatePlayer(model, dt, amount, run, sneak) {
  const r = model.userData.rig
  r.t += dt
  r.amt = lerp(r.amt, amount, 1 - Math.exp(-dt * 12))
  r.crouch = lerp(r.crouch, sneak ? 1 : 0, 1 - Math.exp(-dt * 9))
  r.phase += dt * (run ? 12 : sneak ? 5.5 : 8.5) * Math.max(0.35, r.amt)
  const a = r.amt, c = r.crouch, amp = run ? 0.95 : sneak ? 0.35 : 0.62
  const idle = Math.sin(r.t * 1.8)
  r.legs.forEach(({ hip, knee }, i) => {
    const ph = r.phase + (i ? Math.PI : 0), s = Math.sin(ph), fwd = Math.max(0, Math.cos(ph))
    hip.rotation.x = -s * amp * a - c * 0.35
    knee.rotation.x = a * (0.12 + (run ? 1.2 : 0.75) * fwd) + c * 0.7
  })
  r.arms.forEach(({ shoulder, elbow }, i) => {
    const s = Math.sin(r.phase + (i ? Math.PI : 0)), side = i ? 1 : -1
    shoulder.rotation.x = s * amp * 0.9 * a + c * -0.15
    shoulder.rotation.z = side * (0.06 + idle * 0.01 + a * 0.04)
    elbow.rotation.x = -(0.18 + a * (run ? 0.9 : 0.35) + c * 0.2)
  })
  const lean = a * (run ? 0.2 : 0.06) + c * 0.28, twist = Math.sin(r.phase) * 0.14 * a
  r.torso.rotation.x = lean; r.torso.rotation.y = twist
  r.torso.scale.y = 1 + idle * 0.008
  r.head.rotation.x = -lean * 0.7 + Math.sin(r.t * 0.7) * 0.02; r.head.rotation.y = -twist * 0.8
  r.scarfTail.rotation.x = 0.18 + a * (run ? 0.75 : 0.28) + Math.sin(r.t * 4 + r.phase * 0.5) * 0.06
  r.body.position.y = -c * 0.02 + Math.abs(Math.sin(r.phase)) * 0.045 * a
}
