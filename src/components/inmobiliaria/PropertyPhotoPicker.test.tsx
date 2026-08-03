/**
 * PropertyPhotoPicker.test.tsx — client-side photo validation on pick.
 *
 * Covers: valid files added via onChange, invalid type/size rejected with a
 * Spanish toast, and the max-photo cap.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}))

import { PropertyPhotoPicker } from './PropertyPhotoPicker'
import { toast } from 'sonner'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  // happy-dom lacks URL.createObjectURL
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock')
  globalThis.URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.clearAllMocks()
})

function render(props: Partial<React.ComponentProps<typeof PropertyPhotoPicker>> = {}) {
  const defaultProps: React.ComponentProps<typeof PropertyPhotoPicker> = {
    photos: [],
    onChange: vi.fn(),
    ...props,
  }
  act(() => {
    root.render(<PropertyPhotoPicker {...defaultProps} />)
  })
  return defaultProps
}

function makeFile(name: string, type: string, size = 1024): File {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

async function pickFiles(files: File[]) {
  const inputEl = container.querySelector(
    '[data-testid="property-photo-input"]',
  ) as HTMLInputElement
  expect(inputEl).toBeTruthy()
  Object.defineProperty(inputEl, 'files', { value: files, configurable: true })
  await act(async () => {
    inputEl.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe('<PropertyPhotoPicker>', () => {
  it('adds valid jpg/png/webp files via onChange', async () => {
    const props = render()
    const f1 = makeFile('a.jpg', 'image/jpeg')
    const f2 = makeFile('b.webp', 'image/webp')

    await pickFiles([f1, f2])

    expect(props.onChange).toHaveBeenCalledWith([f1, f2])
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('rejects unsupported formats with a Spanish toast and keeps valid ones', async () => {
    const props = render()
    const bad = makeFile('a.gif', 'image/gif')
    const ok = makeFile('b.png', 'image/png')

    await pickFiles([bad, ok])

    expect(toast.error).toHaveBeenCalledWith(
      'Algunas fotos no son válidas',
      expect.objectContaining({
        description: expect.stringContaining('Formato no soportado. Usa JPG, PNG o WebP.'),
      }),
    )
    expect(props.onChange).toHaveBeenCalledWith([ok])
  })

  it('rejects files over 5MB', async () => {
    const props = render()
    const big = makeFile('big.png', 'image/png', 5 * 1024 * 1024 + 1)

    await pickFiles([big])

    expect(toast.error).toHaveBeenCalledWith(
      'Algunas fotos no son válidas',
      expect.objectContaining({
        description: expect.stringContaining('El archivo excede el límite de 5MB.'),
      }),
    )
    expect(props.onChange).toHaveBeenCalledWith([])
  })

  it('caps the selection at max photos', async () => {
    const existing = [makeFile('1.jpg', 'image/jpeg'), makeFile('2.jpg', 'image/jpeg')]
    const props = render({ photos: existing, max: 3 })
    const extra = [makeFile('3.jpg', 'image/jpeg'), makeFile('4.jpg', 'image/jpeg')]

    await pickFiles(extra)

    expect(toast.error).toHaveBeenCalledWith('Máximo 3 fotos por propiedad.')
    const passed = (props.onChange as ReturnType<typeof vi.fn>).mock.calls[0][0] as File[]
    expect(passed).toHaveLength(3)
  })
})
