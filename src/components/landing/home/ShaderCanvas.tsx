'use client'

import { useEffect, useRef } from 'react'
import { LANDING_HERO_TEXTURE } from '@/lib/landing/assets'

const VERTEX_SHADER = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }'

// Ported verbatim from the standalone's `initFluid()` FRAG shader: FBM +
// domain-warped gradient field, sampled from the hero grain texture, with
// a soft vignette. Untouched math — only the JS harness around it changed.
const FRAGMENT_SHADER = [
  'precision highp float;',
  'uniform vec2 u_res;',
  'uniform float u_time;',
  'uniform vec2 u_mouse;',
  'uniform float u_mact;',
  'uniform sampler2D u_tex;',
  'uniform vec2 u_uvs;',
  'uniform vec2 u_uvo;',
  'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }',
  'float vnoise(vec2 p){',
  '  vec2 i = floor(p); vec2 f = fract(p);',
  '  f = f * f * (3.0 - 2.0 * f);',
  '  float a = hash(i);',
  '  float b = hash(i + vec2(1.0, 0.0));',
  '  float c = hash(i + vec2(0.0, 1.0));',
  '  float d = hash(i + vec2(1.0, 1.0));',
  '  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);',
  '}',
  'float fbm(vec2 p){',
  '  float v = 0.0; float a = 0.5;',
  '  for(int i = 0; i < 4; i++){ v += a * vnoise(p); p = p * 2.03 + 11.3; a *= 0.5; }',
  '  return v;',
  '}',
  'vec3 grad(vec2 uv){ vec2 s = uv * u_uvs + u_uvo; s = 1.0 - abs(1.0 - 2.0 * fract(s * 0.5)); return texture2D(u_tex, s).rgb; }',
  'void main(){',
  '  vec2 px = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y);',
  '  vec2 uv = px / u_res;',
  '  vec2 asp = vec2(u_res.x / u_res.y, 1.0);',
  '  vec2 p = uv * asp;',
  '  float t = u_time;',
  '  vec2 q = vec2(fbm(p * 1.6 + vec2(0.0, t * 0.055)), fbm(p * 1.6 + vec2(5.2, -t * 0.05)));',
  '  vec2 m = (u_mouse / u_res) * asp;',
  '  float md = length(p - m);',
  '  float mf = u_mact * exp(-md * md * 16.0);',
  '  vec2 r = vec2(fbm(p * 2.4 + 3.0 * q + vec2(1.7, 9.2) + t * 0.075),',
  '                fbm(p * 2.4 + 3.0 * q + vec2(8.3, 2.8) - t * 0.065));',
  '  vec2 dm = p - m;',
  '  vec2 warp = (q - 0.5) * 0.34 + (r - 0.5) * 0.22 + (vec2(-dm.y, dm.x) * 0.38 - dm * 0.14) * mf;',
  '  float ea = smoothstep(0.0, 0.20, uv.x) * smoothstep(0.0, 0.20, 1.0 - uv.x) * smoothstep(0.0, 0.14, uv.y) * smoothstep(0.0, 0.14, 1.0 - uv.y);',
  '  warp *= mix(0.12, 1.0, ea);',
  '  vec3 col = grad(uv + warp / asp);',
  '  float shade = fbm(p * 2.0 + r * 2.0 - t * 0.03);',
  '  col *= 0.78 + 0.44 * shade + mf * 0.07;',
  '  vec2 vc = uv - vec2(0.5, 0.42);',
  '  col *= 1.0 - dot(vc, vc) * 0.5;',
  '  gl_FragColor = vec4(col, 1.0);',
  '}',
].join('\n')

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type) as WebGLShader
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  return shader
}

/**
 * WebGL fluid-gradient field behind the hero heading. Ported from the
 * standalone's `initFluid()` — identical shader math, rewritten with
 * React-idiomatic scope: every mutable value that used to be a shared
 * module-level `var` (HANDOFF's "no shared scope in update()" rule) now
 * lives inside this effect's closure/refs, scoped to one mount instance.
 *
 * Only mounted by `ShaderHero` when WebGL is available and motion is not
 * reduced — this component assumes both are already true and does not
 * re-check them.
 */
export function ShaderCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      powerPreference: 'high-performance',
    }) as WebGLRenderingContext | null
    if (!gl) return

    let raf = 0
    let dead = false
    let time = 0
    let dpr = 1
    const pointer = { x: -1e4, y: -1e4, ex: 0, ey: 0, activity: 0 }

    const vertexShader = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
    const fragmentShader = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
    const program = gl.createProgram() as WebGLProgram
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const aLoc = gl.getAttribLocation(program, 'a')
    gl.enableVertexAttribArray(aLoc)
    gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0)

    const uniform = (name: string) => gl.getUniformLocation(program, name)
    const uRes = uniform('u_res')
    const uTime = uniform('u_time')
    const uMouse = uniform('u_mouse')
    const uMact = uniform('u_mact')

    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.uniform1i(uniform('u_tex'), 0)

    function resize() {
      const parent = canvas!.parentElement
      if (!parent) return
      const rect = parent.getBoundingClientRect()
      const w = Math.max(rect.width, 1)
      const h = Math.max(rect.height, 1)
      dpr = Math.min(window.devicePixelRatio || 1, 2) * 0.6
      const cw = Math.round(w * dpr)
      const ch = Math.round(h * dpr)
      canvas!.width = cw
      canvas!.height = ch
      canvas!.style.width = `${w}px`
      canvas!.style.height = `${h}px`
      gl!.viewport(0, 0, cw, ch)
      gl!.uniform2f(uRes, cw, ch)
    }

    function draw(tt: number) {
      if (dead) return
      pointer.ex += (pointer.x - pointer.ex) * 0.05
      pointer.ey += (pointer.y - pointer.ey) * 0.05
      pointer.activity += ((pointer.x > -9000 ? 1 : 0) - pointer.activity) * 0.045
      gl!.uniform1f(uTime, tt)
      gl!.uniform2f(uMouse, pointer.ex * dpr, pointer.ey * dpr)
      gl!.uniform1f(uMact, pointer.activity)
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4)
    }

    function loop() {
      raf = requestAnimationFrame(loop)
      if (dead) return
      time += 0.016
      draw(time)
    }

    const image = new Image()
    image.onload = () => {
      if (dead) return
      gl!.pixelStorei(gl!.UNPACK_FLIP_Y_WEBGL, false)
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGB, gl!.RGB, gl!.UNSIGNED_BYTE, image)
      resize()
      loop()
    }
    image.src = LANDING_HERO_TEXTURE.src

    function handleMouseMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect()
      pointer.x = e.clientX - rect.left
      pointer.y = e.clientY - rect.top
    }
    function handleMouseLeave() {
      pointer.x = -1e4
      pointer.y = -1e4
    }
    function handleResize() {
      resize()
    }
    function handleContextLost(e: Event) {
      e.preventDefault()
      dead = true
      cancelAnimationFrame(raf)
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseleave', handleMouseLeave)
    canvas.addEventListener('webglcontextlost', handleContextLost)
    window.addEventListener('resize', handleResize)

    return () => {
      dead = true
      cancelAnimationFrame(raf)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseleave', handleMouseLeave)
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      window.removeEventListener('resize', handleResize)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [])

  return <canvas ref={canvasRef} className="landing-hero__canvas" aria-hidden="true" />
}
