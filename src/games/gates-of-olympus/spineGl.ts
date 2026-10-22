import type { SlotPose } from '@/games/gates-of-olympus/spineLite'

type Matrix = [a: number, b: number, c: number, d: number, e: number, f: number]
type Blend = SlotPose['slot']['blend']

const VERTEX = `
attribute vec2 a_pos;
attribute vec2 a_uv;
attribute float a_alpha;
uniform vec2 u_size;
varying vec2 v_uv;
varying float v_alpha;
void main() {
  v_uv = a_uv;
  v_alpha = a_alpha;
  gl_Position = vec4(a_pos.x / u_size.x * 2.0 - 1.0, 1.0 - a_pos.y / u_size.y * 2.0, 0.0, 1.0);
}`

const FRAGMENT = `
precision highp float;
uniform sampler2D u_tex;
varying vec2 v_uv;
varying float v_alpha;
void main() {
  gl_FragColor = texture2D(u_tex, v_uv) * v_alpha;
}`

export type SpineTexture = { texture: WebGLTexture; width: number; height: number }

export type SpineRenderer = ReturnType<typeof createSpineRenderer>

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(shader) ?? 'shader')
  return shader
}

export function createSpineRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    preserveDrawingBuffer: false,
  })
  if (!gl) throw new Error('WebGL unavailable')
  const program = gl.createProgram()!
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX))
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT))
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(program) ?? 'program')
  gl.useProgram(program)
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  const stride = 5 * 4
  const attrib = (name: string, size: number, offset: number) => {
    const loc = gl.getAttribLocation(program, name)
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, offset)
  }
  attrib('a_pos', 2, 0)
  attrib('a_uv', 2, 8)
  attrib('a_alpha', 1, 16)
  const sizeLoc = gl.getUniformLocation(program, 'u_size')
  gl.enable(gl.BLEND)
  let data = new Float32Array(4096)

  const blendFactors: Record<Blend, [number, number, number, number]> = {
    normal: [gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA],
    additive: [gl.ONE, gl.ONE, gl.ZERO, gl.ONE],
    screen: [gl.SRC_ALPHA, gl.ONE, gl.ZERO, gl.ONE],
  }

  function upload(image: TexImageSource): SpineTexture {
    const texture = gl!.createTexture()!
    gl!.bindTexture(gl!.TEXTURE_2D, texture)
    gl!.pixelStorei(gl!.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, image)
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR)
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR)
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE)
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE)
    const { width, height } = image as { width: number; height: number }
    return { texture, width, height }
  }

  function clear() {
    gl!.viewport(0, 0, canvas.width, canvas.height)
    gl!.clearColor(0, 0, 0, 0)
    gl!.clear(gl!.COLOR_BUFFER_BIT)
    gl!.uniform2f(sizeLoc, canvas.width, canvas.height)
  }

  function flush(count: number, blend: Blend) {
    if (!count) return
    gl!.blendFuncSeparate(...blendFactors[blend])
    gl!.bufferData(gl!.ARRAY_BUFFER, data.subarray(0, count * 5), gl!.STREAM_DRAW)
    gl!.drawArrays(gl!.TRIANGLES, 0, count)
  }

  function draw(poses: SlotPose[], tex: SpineTexture, base: Matrix, opacity = 1) {
    gl!.bindTexture(gl!.TEXTURE_2D, tex.texture)
    let count = 0
    let blend: Blend = 'normal'
    for (const s of poses) {
      if (s.slot.blend !== blend) {
        flush(count, blend)
        count = 0
        blend = s.slot.blend
      }
      const need = (count + s.triangles.length) * 5
      if (need > data.length) {
        const grown = new Float32Array(Math.max(need, data.length * 2))
        grown.set(data.subarray(0, count * 5))
        data = grown
      }
      const [rx, ry, rw, rh] = s.region
      const alpha = s.alpha * opacity
      for (const i of s.triangles) {
        const x = s.points[i * 2]!
        const y = s.points[i * 2 + 1]!
        const o = count * 5
        data[o] = base[0] * x + base[2] * y + base[4]
        data[o + 1] = base[1] * x + base[3] * y + base[5]
        data[o + 2] = (rx + s.uvs[i * 2]! * rw) / tex.width
        data[o + 3] = (ry + s.uvs[i * 2 + 1]! * rh) / tex.height
        data[o + 4] = alpha
        count++
      }
    }
    flush(count, blend)
  }

  function dispose() {
    gl!.getExtension('WEBGL_lose_context')?.loseContext()
  }

  return { gl, upload, clear, draw, dispose }
}
