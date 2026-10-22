type Curve = 'stepped' | [number, number, number, number]
type Key = { time?: number; curve?: Curve } & Record<string, unknown>
type Matrix = [a: number, b: number, c: number, d: number, e: number, f: number]

type BoneData = {
  name: string
  parent?: string
  x: number
  y: number
  rotation: number
  scaleX: number
  scaleY: number
}
type SlotData = {
  name: string
  bone: string
  attachment: string | null
  color: string
  blend: 'normal' | 'additive'
}
type RegionAttachment = {
  type?: 'region'
  path?: string
  x?: number
  y?: number
  rotation?: number
  scaleX?: number
  scaleY?: number
  width: number
  height: number
}
type MeshAttachment = {
  type: 'mesh'
  path?: string
  uvs: number[]
  triangles: number[]
  vertices: number[]
}
type Attachment = RegionAttachment | MeshAttachment
type BoneTimelines = { rotate?: Key[]; translate?: Key[]; scale?: Key[] }
type SlotTimelines = { color?: Key[]; attachment?: Key[] }
type Anim = {
  bones?: Record<string, BoneTimelines>
  slots?: Record<string, SlotTimelines>
  deform?: { default: Record<string, Record<string, Key[]>> }
}

export type SpineData = {
  bones: BoneData[]
  slots: SlotData[]
  skin: Record<string, Record<string, Attachment>>
  regions: Record<string, [x: number, y: number, w: number, h: number]>
  anims: Record<string, Anim>
}

const DEG = Math.PI / 180

function bezierAt([cx1, cy1, cx2, cy2]: [number, number, number, number], p: number) {
  let lo = 0
  let hi = 1
  let u = p
  for (let i = 0; i < 24; i++) {
    const x = 3 * (1 - u) * (1 - u) * u * cx1 + 3 * (1 - u) * u * u * cx2 + u * u * u
    if (Math.abs(x - p) < 1e-5) break
    if (x < p) lo = u
    else hi = u
    u = (lo + hi) / 2
  }
  return 3 * (1 - u) * (1 - u) * u * cy1 + 3 * (1 - u) * u * u * cy2 + u * u * u
}

function frameAt(keys: Key[], t: number) {
  if (t < (keys[0]!.time ?? 0)) return null
  let i = 0
  while (i + 1 < keys.length && (keys[i + 1]!.time ?? 0) <= t) i++
  const from = keys[i]!
  const to = keys[i + 1]
  if (!to) return { from, to: from, p: 0 }
  const t0 = from.time ?? 0
  const p = (t - t0) / ((to.time ?? 0) - t0)
  const curve = from.curve
  return {
    from,
    to,
    p: curve === 'stepped' ? 0 : Array.isArray(curve) ? bezierAt(curve, p) : p,
  }
}

const num = (key: Key, field: string, fallback: number) =>
  typeof key[field] === 'number' ? (key[field] as number) : fallback

function sample(keys: Key[] | undefined, t: number, field: string, fallback: number) {
  if (!keys?.length) return null
  const frame = frameAt(keys, t)
  if (!frame) return null
  const a = num(frame.from, field, fallback)
  return a + (num(frame.to, field, fallback) - a) * frame.p
}

function sampleAngle(keys: Key[] | undefined, t: number) {
  if (!keys?.length) return null
  const frame = frameAt(keys, t)
  if (!frame) return null
  const a = num(frame.from, 'angle', 0)
  let diff = num(frame.to, 'angle', 0) - a
  diff -= (16384 - ((16384.499999999996 - diff / 360) | 0)) * 360
  return a + diff * frame.p
}

const channels = (hex: string) => [0, 2, 4, 6].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)

function sampleAlpha(keys: Key[] | undefined, t: number) {
  if (!keys?.length) return null
  const frame = frameAt(keys, t)
  if (!frame) return null
  const a = channels(frame.from.color as string)[3]!
  return a + (channels(frame.to.color as string)[3]! - a) * frame.p
}

function sampleAttachment(keys: Key[] | undefined, t: number) {
  if (!keys?.length) return undefined
  const frame = frameAt(keys, t)
  if (!frame) return undefined
  return (frame.from.name as string | null | undefined) ?? null
}

function sampleDeform(keys: Key[] | undefined, t: number, count: number) {
  if (!keys?.length) return null
  const frame = frameAt(keys, t)
  if (!frame) return null
  const values = (key: Key) => {
    const out = new Array<number>(count).fill(0)
    const vertices = (key.vertices as number[] | undefined) ?? []
    const offset = num(key, 'offset', 0)
    vertices.forEach((v, i) => (out[offset + i] = v))
    return out
  }
  const a = values(frame.from)
  const b = values(frame.to)
  return a.map((v, i) => v + (b[i]! - v) * frame.p)
}

const mul = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
]

type SlotPose = {
  slot: SlotData
  attachment: Attachment
  region: [number, number, number, number]
  alpha: number
  world: Matrix
  deform: number[] | null
}

export function animationLength(data: SpineData, anim: string) {
  let end = 0
  const scan = (groups: Record<string, Record<string, Key[]>> | undefined) => {
    for (const timelines of Object.values(groups ?? {}))
      for (const keys of Object.values(timelines))
        for (const key of keys) end = Math.max(end, key.time ?? 0)
  }
  const a = data.anims[anim]
  scan(a?.bones as Record<string, Record<string, Key[]>> | undefined)
  scan(a?.slots as Record<string, Record<string, Key[]>> | undefined)
  scan(a?.deform?.default)
  return end
}

function boneWorlds(data: SpineData, anim: string, t: number) {
  const a = data.anims[anim]
  const worlds = new Map<string, Matrix>()
  for (const bone of data.bones) {
    const tl = a?.bones?.[bone.name]
    const rotation = bone.rotation + (sampleAngle(tl?.rotate, t) ?? 0)
    const x = bone.x + (sample(tl?.translate, t, 'x', 0) ?? 0)
    const y = bone.y + (sample(tl?.translate, t, 'y', 0) ?? 0)
    const sx = bone.scaleX * (sample(tl?.scale, t, 'x', 1) ?? 1)
    const sy = bone.scaleY * (sample(tl?.scale, t, 'y', 1) ?? 1)
    const cos = Math.cos(rotation * DEG)
    const sin = Math.sin(rotation * DEG)
    const local: Matrix = [cos * sx, sin * sx, -sin * sy, cos * sy, x, y]
    const parent = bone.parent ? worlds.get(bone.parent) : undefined
    worlds.set(bone.name, parent ? mul(parent, local) : local)
  }
  return worlds
}

export function boneOffset(data: SpineData, anim: string, t: number, bone: string) {
  const rest = boneWorlds(data, '', 0).get(bone)!
  const now = boneWorlds(data, anim, t).get(bone)!
  return {
    x: now[4] - rest[4],
    y: now[5] - rest[5],
    scale: Math.hypot(now[0], now[1]) / Math.hypot(rest[0], rest[1]),
  }
}

export function pose(data: SpineData, anim: string, t: number): SlotPose[] {
  const a = data.anims[anim]
  const worlds = boneWorlds(data, anim, t)
  const out: SlotPose[] = []
  for (const slot of data.slots) {
    const tl = a?.slots?.[slot.name]
    const sampled = sampleAttachment(tl?.attachment, t)
    const name = sampled === undefined ? slot.attachment : sampled
    if (!name) continue
    const alpha = sampleAlpha(tl?.color, t) ?? channels(slot.color)[3]!
    if (alpha <= 0) continue
    const attachment = data.skin[slot.name]?.[name]
    const region = attachment && data.regions[attachment.path ?? name]
    if (!attachment || !region) continue
    const deform =
      attachment.type === 'mesh'
        ? sampleDeform(a?.deform?.default[slot.name]?.[name], t, attachment.vertices.length)
        : null
    out.push({ slot, attachment, region, alpha, world: worlds.get(slot.bone)!, deform })
  }
  return out
}

function drawRegion(
  g: CanvasRenderingContext2D,
  img: CanvasImageSource,
  s: SlotPose,
  base: Matrix,
) {
  const att = s.attachment as RegionAttachment
  const r = (att.rotation ?? 0) * DEG
  const cos = Math.cos(r)
  const sin = Math.sin(r)
  const sx = att.scaleX ?? 1
  const sy = att.scaleY ?? 1
  const local: Matrix = [cos * sx, sin * sx, sin * sy, -cos * sy, att.x ?? 0, att.y ?? 0]
  const m = mul(mul(base, s.world), local)
  const [rx, ry, rw, rh] = s.region
  g.setTransform(m[0], m[1], m[2], m[3], m[4], m[5])
  g.drawImage(img, rx, ry, rw, rh, -att.width / 2, -att.height / 2, att.width, att.height)
}

function drawMesh(g: CanvasRenderingContext2D, img: CanvasImageSource, s: SlotPose, base: Matrix) {
  const att = s.attachment as MeshAttachment
  const m = mul(base, s.world)
  const [rx, ry, rw, rh] = s.region
  const v = att.vertices.map((value, i) => value + (s.deform?.[i] ?? 0))
  const px = (i: number) => m[0] * v[i * 2]! + m[2] * v[i * 2 + 1]! + m[4]
  const py = (i: number) => m[1] * v[i * 2]! + m[3] * v[i * 2 + 1]! + m[5]
  const u = (i: number) => rx + att.uvs[i * 2]! * rw
  const w = (i: number) => ry + att.uvs[i * 2 + 1]! * rh
  for (let k = 0; k < att.triangles.length; k += 3) {
    const [i0, i1, i2] = [att.triangles[k]!, att.triangles[k + 1]!, att.triangles[k + 2]!]
    const [x0, y0, x1, y1, x2, y2] = [px(i0), py(i0), px(i1), py(i1), px(i2), py(i2)]
    const [u0, v0, u1, v1, u2, v2] = [u(i0), w(i0), u(i1), w(i1), u(i2), w(i2)]
    const cx = (x0 + x1 + x2) / 3
    const cy = (y0 + y1 + y2) / 3
    const grow = (x: number, y: number) => {
      const dx = x - cx
      const dy = y - cy
      const len = Math.hypot(dx, dy) || 1
      return [x + (dx / len) * 0.6, y + (dy / len) * 0.6] as const
    }
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.save()
    g.beginPath()
    g.moveTo(...grow(x0, y0))
    g.lineTo(...grow(x1, y1))
    g.lineTo(...grow(x2, y2))
    g.closePath()
    g.clip()
    const du1 = u1 - u0
    const dv1 = v1 - v0
    const du2 = u2 - u0
    const dv2 = v2 - v0
    const det = du1 * dv2 - du2 * dv1
    if (det) {
      const a = ((x1 - x0) * dv2 - (x2 - x0) * dv1) / det
      const b = ((y1 - y0) * dv2 - (y2 - y0) * dv1) / det
      const c = ((x2 - x0) * du1 - (x1 - x0) * du2) / det
      const d = ((y2 - y0) * du1 - (y1 - y0) * du2) / det
      g.setTransform(a, b, c, d, x0 - a * u0 - c * v0, y0 - b * u0 - d * v0)
      g.drawImage(img, 0, 0)
    }
    g.restore()
  }
}

export function draw(
  poses: SlotPose[],
  img: CanvasImageSource,
  base: Matrix,
  normal: CanvasRenderingContext2D,
  light: CanvasRenderingContext2D,
) {
  let lit = false
  for (const s of poses) {
    const additive = s.slot.blend === 'additive'
    if (!additive && !lit) {
      normal.globalAlpha = s.alpha
      normal.globalCompositeOperation = 'source-over'
      paint(normal, img, s, base)
      continue
    }
    if (additive) {
      lit = true
      light.globalAlpha = s.alpha
      light.globalCompositeOperation = 'lighter'
      paint(light, img, s, base)
      continue
    }
    normal.globalAlpha = s.alpha
    normal.globalCompositeOperation = 'source-over'
    paint(normal, img, s, base)
    light.globalAlpha = s.alpha
    light.globalCompositeOperation = 'destination-out'
    paint(light, img, s, base)
  }
  for (const g of [normal, light]) {
    g.globalAlpha = 1
    g.globalCompositeOperation = 'source-over'
    g.setTransform(1, 0, 0, 1, 0, 0)
  }
}

function paint(g: CanvasRenderingContext2D, img: CanvasImageSource, s: SlotPose, base: Matrix) {
  if (s.attachment.type === 'mesh') drawMesh(g, img, s, base)
  else drawRegion(g, img, s, base)
}
