/**
 * ShaderCanvas.test.tsx — WebGL fluid-gradient field behind the hero
 * heading. Per Strict TDD testing architecture, WebGL shader internals
 * (uniforms, draw calls, shader compilation) are explicitly UNTESTED —
 * they are brittle and headless GL stubs don't validate real rendering.
 * Coverage here is structural only: the canvas element mounts, and
 * unmounting doesn't throw (cleanup discipline: cancelAnimationFrame +
 * WEBGL_lose_context, per HANDOFF "no shared scope in update()").
 *
 * `ShaderHero` is the component responsible for deciding WHETHER to mount
 * this component (WebGL support + reduced-motion gate) — that decision is
 * tested there, not here.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

// Minimal fake WebGL context — just enough surface area for ShaderCanvas's
// setup code to run without throwing. No assertions are made against it;
// it exists purely so the structural mount/unmount test doesn't crash in
// happy-dom (which has no real WebGL implementation).
function createFakeGl() {
  return {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    ARRAY_BUFFER: 3,
    STATIC_DRAW: 4,
    TEXTURE_2D: 5,
    TEXTURE_WRAP_S: 6,
    TEXTURE_WRAP_T: 7,
    CLAMP_TO_EDGE: 8,
    TEXTURE_MIN_FILTER: 9,
    TEXTURE_MAG_FILTER: 10,
    LINEAR: 11,
    RGB: 12,
    UNSIGNED_BYTE: 13,
    TRIANGLE_STRIP: 14,
    FLOAT: 15,
    UNPACK_FLIP_Y_WEBGL: 16,
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    useProgram: vi.fn(),
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    getAttribLocation: vi.fn(() => 0),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    getUniformLocation: vi.fn(() => ({})),
    createTexture: vi.fn(() => ({})),
    bindTexture: vi.fn(),
    texParameteri: vi.fn(),
    uniform1i: vi.fn(),
    uniform1f: vi.fn(),
    uniform2f: vi.fn(),
    pixelStorei: vi.fn(),
    texImage2D: vi.fn(),
    viewport: vi.fn(),
    drawArrays: vi.fn(),
    getExtension: vi.fn(() => ({ loseContext: vi.fn() })),
  }
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => createFakeGl() as unknown as RenderingContext,
  )
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
})

import { ShaderCanvas } from './ShaderCanvas'

describe('<ShaderCanvas>', () => {
  it('renders a canvas element', () => {
    act(() => {
      root.render(<ShaderCanvas />)
    })
    expect(container.querySelector('canvas')).toBeTruthy()
  })

  it('unmounts without throwing (cleans up raf + GL context)', () => {
    act(() => {
      root.render(<ShaderCanvas />)
    })
    expect(() => {
      act(() => {
        root.unmount()
      })
    }).not.toThrow()
  })

  it('calls onError when the hero texture image fails to load', async () => {
    class FakeImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      private _src = ''
      get src() {
        return this._src
      }
      set src(value: string) {
        this._src = value
        queueMicrotask(() => this.onerror?.())
      }
    }
    vi.stubGlobal('Image', FakeImage as unknown as typeof Image)

    const onError = vi.fn()
    act(() => {
      root.render(<ShaderCanvas onError={onError} />)
    })

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(onError).toHaveBeenCalledTimes(1)
    vi.unstubAllGlobals()
  })
})
