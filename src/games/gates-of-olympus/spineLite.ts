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
  transform?: 'normal' | 'noRotationOrReflection'
}
type SlotData = {
  name: string
  bone: string
  attachment: string | null
  color: string
  blend: 'normal' | 'additive' | 'screen'
}
type TranslateConstraint = {
  order: number
  bones: string[]
  target: string
  x: number
  y: number
  translateMix: number
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
  constraints?: TranslateConstraint[]
  skin: Record<string, Record<string, Attachment>>
  regions: Record<string, [x: number, y: number, w: number, h: number]>
  anims: Record<string, Anim>
}

const DEG = Math.PI / 180
const CURVE_POINTS = 9
const curveCache = new WeakMap<object, Float32Array>()

function curvePoints(curve: [number, number, number, number]) {
  let points = curveCache.get(curve)
  if (points) return points
  const [cx1, cy1, cx2, cy2] = curve
  const tmpx = (-cx1 * 2 + cx2) * 0.03
  const tmpy = (-cy1 * 2 + cy2) * 0.03
  const dddfx = ((cx1 - cx2) * 3 + 1) * 0.006
  const dddfy = ((cy1 - cy2) * 3 + 1) * 0.006
  let ddfx = tmpx * 2 + dddfx
  let ddfy = tmpy * 2 + dddfy
  let dfx = cx1 * 0.3 + tmpx + dddfx * 0.16666667
  let dfy = cy1 * 0.3 + tmpy + dddfy * 0.16666667
  let x = dfx
  let y = dfy
  points = new Float32Array(CURVE_POINTS * 2)
  for (let i = 0; i < CURVE_POINTS * 2; i += 2) {
    points[i] = x
    points[i + 1] = y
    dfx += ddfx
    dfy += ddfy
    ddfx += dddfx
    ddfy += dddfy
    x += dfx
    y += dfy
  }
  curveCache.set(curve, points)
  return points
}

function curvePercent(curve: [number, number, number, number], p: number) {
  const points = curvePoints(curve)
  let x = 0
  for (let i = 0; i < points.length; i += 2) {
    x = points[i]!
    if (x >= p) {
      const prevX = i ? points[i - 2]! : 0
      const prevY = i ? points[i - 1]! : 0
      return prevY + ((points[i + 1]! - prevY) * (p - prevX)) / (x - prevX)
    }
  }
  const y = points[points.length - 1]!
  return y + ((1 - y) * (p - x)) / (1 - x)
}

const keyTime = (key: Key) => Math.fround(key.time ?? 0)

function frameAt(keys: Key[], t: number) {
  if (t < keyTime(keys[0]!)) return null
  let i = 0
  while (i + 1 < keys.length && keyTime(keys[i + 1]!) <= t) i++
  const from = keys[i]!
  const to = keys[i + 1]
  if (!to) return { from, to: from, p: 0 }
  const t0 = keyTime(from)
  const p = Math.min(1, Math.max(0, (t - t0) / (keyTime(to) - t0)))
  const curve = from.curve
  return {
    from,
    to,
    p: curve === 'stepped' ? 0 : Array.isArray(curve) ? curvePercent(curve, p) : p,
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
    const out = Array.from({ length: count }, () => 0)
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

export type SlotPose = {
  slot: SlotData
  attachment: Attachment
  region: [number, number, number, number]
  alpha: number
  world: Matrix
  deform: number[] | null
  points: number[]
  uvs: number[]
  triangles: number[]
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

type UpdateStep = { bone: BoneData } | { constraint: TranslateConstraint }
const updateOrders = new WeakMap<SpineData, UpdateStep[]>()

function updateOrder(data: SpineData) {
  let order = updateOrders.get(data)
  if (order) return order
  const byName = new Map(data.bones.map((bone) => [bone.name, bone]))
  const children = new Map<string, BoneData[]>()
  for (const bone of data.bones)
    if (bone.parent) children.set(bone.parent, [...(children.get(bone.parent) ?? []), bone])
  const steps: UpdateStep[] = []
  const sorted = new Set<string>()
  const sortBone = (bone: BoneData) => {
    if (sorted.has(bone.name)) return
    if (bone.parent) sortBone(byName.get(bone.parent)!)
    sorted.add(bone.name)
    steps.push({ bone })
  }
  const sortReset = (bones: BoneData[]) => {
    for (const bone of bones) {
      if (sorted.has(bone.name)) sortReset(children.get(bone.name) ?? [])
      sorted.delete(bone.name)
    }
  }
  const constraints = [...(data.constraints ?? [])].sort((a, b) => a.order - b.order)
  for (const constraint of constraints) {
    sortBone(byName.get(constraint.target)!)
    const bones = constraint.bones.map((name) => byName.get(name)!)
    for (const bone of bones) sortBone(bone)
    steps.push({ constraint })
    for (const bone of bones) sortReset(children.get(bone.name) ?? [])
    for (const bone of bones) sorted.add(bone.name)
  }
  for (const bone of data.bones) sortBone(bone)
  order = steps
  updateOrders.set(data, order)
  return order
}

function localMatrix(bone: BoneData, parent: Matrix | undefined, local: Omit<BoneData, 'name'>) {
  const { x, y, rotation, scaleX, scaleY } = local
  if (!parent) {
    const cos = Math.cos(rotation * DEG)
    const sin = Math.sin(rotation * DEG)
    return [cos * scaleX, sin * scaleX, -sin * scaleY, cos * scaleY, x, y] as Matrix
  }
  const [pa, pc, pb, pd] = parent
  const worldX = pa * x + pb * y + parent[4]
  const worldY = pc * x + pd * y + parent[5]
  if (bone.transform !== 'noRotationOrReflection') {
    const cos = Math.cos(rotation * DEG)
    const sin = Math.sin(rotation * DEG)
    const m = mul(parent, [cos * scaleX, sin * scaleX, -sin * scaleY, cos * scaleY, 0, 0])
    return [m[0], m[1], m[2], m[3], worldX, worldY] as Matrix
  }
  let s = pa * pa + pc * pc
  let a = pa
  let c = pc
  let b: number
  let d: number
  let parentRotation: number
  if (s > 0.0001) {
    s = Math.abs(pa * pd - pb * pc) / s
    b = pc * s
    d = pa * s
    parentRotation = Math.atan2(pc, pa) / DEG
  } else {
    a = 0
    c = 0
    b = pb
    d = pd
    parentRotation = 90 - Math.atan2(pd, pb) / DEG
  }
  const rx = (rotation - parentRotation) * DEG
  const ry = (rotation - parentRotation + 90) * DEG
  const la = Math.cos(rx) * scaleX
  const lb = Math.cos(ry) * scaleY
  const lc = Math.sin(rx) * scaleX
  const ld = Math.sin(ry) * scaleY
  return [
    a * la - b * lc,
    c * la + d * lc,
    a * lb - b * ld,
    c * lb + d * ld,
    worldX,
    worldY,
  ] as Matrix
}

function boneWorlds(data: SpineData, anim: string, t: number) {
  const a = data.anims[anim]
  const worlds = new Map<string, Matrix>()
  for (const step of updateOrder(data)) {
    if ('constraint' in step) {
      const { constraint } = step
      const target = worlds.get(constraint.target)!
      const tx = target[0] * constraint.x + target[2] * constraint.y + target[4]
      const ty = target[1] * constraint.x + target[3] * constraint.y + target[5]
      for (const name of constraint.bones) {
        const m = worlds.get(name)!
        m[4] += (tx - m[4]) * constraint.translateMix
        m[5] += (ty - m[5]) * constraint.translateMix
      }
      continue
    }
    const { bone } = step
    const tl = a?.bones?.[bone.name]
    const local = {
      ...bone,
      rotation: bone.rotation + (sampleAngle(tl?.rotate, t) ?? 0),
      x: bone.x + (sample(tl?.translate, t, 'x', 0) ?? 0),
      y: bone.y + (sample(tl?.translate, t, 'y', 0) ?? 0),
      scaleX: bone.scaleX * (sample(tl?.scale, t, 'x', 1) ?? 1),
      scaleY: bone.scaleY * (sample(tl?.scale, t, 'y', 1) ?? 1),
    }
    worlds.set(
      bone.name,
      localMatrix(bone, bone.parent ? worlds.get(bone.parent) : undefined, local),
    )
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

const QUAD = [0, 1, 2, 2, 3, 0]

function regionGeometry(att: RegionAttachment, world: Matrix) {
  const r = (att.rotation ?? 0) * DEG
  const sx = att.scaleX ?? 1
  const sy = att.scaleY ?? 1
  const local: Matrix = [
    Math.cos(r) * sx,
    Math.sin(r) * sx,
    -Math.sin(r) * sy,
    Math.cos(r) * sy,
    att.x ?? 0,
    att.y ?? 0,
  ]
  const m = mul(world, local)
  const w = att.width / 2
  const h = att.height / 2
  const corners = [-w, -h, -w, h, w, h, w, -h]
  const points: number[] = []
  for (let i = 0; i < 8; i += 2)
    points.push(
      m[0] * corners[i]! + m[2] * corners[i + 1]! + m[4],
      m[1] * corners[i]! + m[3] * corners[i + 1]! + m[5],
    )
  return { points, uvs: [0, 1, 0, 0, 1, 0, 1, 1], triangles: QUAD }
}

function meshPoints(
  att: MeshAttachment,
  world: Matrix,
  worlds: Map<string, Matrix>,
  bones: BoneData[],
  deform: number[] | null,
) {
  const v = att.vertices
  const points: number[] = []
  if (v.length === att.uvs.length) {
    for (let i = 0; i < v.length; i += 2) {
      const x = v[i]! + (deform?.[i] ?? 0)
      const y = v[i + 1]! + (deform?.[i + 1] ?? 0)
      points.push(world[0] * x + world[2] * y + world[4], world[1] * x + world[3] * y + world[5])
    }
    return points
  }
  let f = 0
  for (let i = 0; i < v.length;) {
    const count = v[i++]!
    let wx = 0
    let wy = 0
    for (let k = 0; k < count; k++, i += 4, f += 2) {
      const m = worlds.get(bones[v[i]!]!.name)!
      const x = v[i + 1]! + (deform?.[f] ?? 0)
      const y = v[i + 2]! + (deform?.[f + 1] ?? 0)
      const weight = v[i + 3]!
      wx += (m[0] * x + m[2] * y + m[4]) * weight
      wy += (m[1] * x + m[3] * y + m[5]) * weight
    }
    points.push(wx, wy)
  }
  return points
}

function deformLength(att: MeshAttachment) {
  if (att.vertices.length === att.uvs.length) return att.vertices.length
  let n = 0
  for (let i = 0; i < att.vertices.length;) {
    const count = att.vertices[i]!
    n += count * 2
    i += 1 + count * 4
  }
  return n
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
    const world = worlds.get(slot.bone)!
    if (attachment.type === 'mesh') {
      const deform = sampleDeform(
        a?.deform?.default[slot.name]?.[name],
        t,
        deformLength(attachment),
      )
      const points = meshPoints(attachment, world, worlds, data.bones, deform)
      out.push({
        slot,
        attachment,
        region,
        alpha,
        world,
        deform,
        points,
        uvs: attachment.uvs,
        triangles: attachment.triangles,
      })
    } else {
      out.push({
        slot,
        attachment,
        region,
        alpha,
        world,
        deform: null,
        ...regionGeometry(attachment, world),
      })
    }
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
  const [rx, ry, rw, rh] = s.region
  const p = s.points
  const px = (i: number) => base[0] * p[i * 2]! + base[2] * p[i * 2 + 1]! + base[4]
  const py = (i: number) => base[1] * p[i * 2]! + base[3] * p[i * 2 + 1]! + base[5]
  const u = (i: number) => rx + s.uvs[i * 2]! * rw
  const w = (i: number) => ry + s.uvs[i * 2 + 1]! * rh
  for (let k = 0; k < s.triangles.length; k += 3) {
    const [i0, i1, i2] = [s.triangles[k]!, s.triangles[k + 1]!, s.triangles[k + 2]!]
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
    const additive = s.slot.blend !== 'normal'
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
