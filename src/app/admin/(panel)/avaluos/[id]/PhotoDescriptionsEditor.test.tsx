/**
 * PhotoDescriptionsEditor tests — the reviewer's per-photo caption editor.
 *
 * Strategy: mount in happy-dom via createRoot + act (repo convention; no
 * @testing-library). `savePhotoDescriptions` is mocked so no network runs; the
 * real types/constants stay via importActual.
 *
 * Covers: a textarea per photo prefilled from the draft; a successful save sends
 * the edits and confirms; a 422 Ley-1673 rejection surfaces the reserved-term
 * message against the offending photo and keeps the reviewer's text.
 */

import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import { ApiError } from '@/lib/admin/api'
import { PhotoDescriptionsEditor } from './PhotoDescriptionsEditor'
import { savePhotoDescriptions, type PhotoDetail } from '@/lib/admin/avaluos'

void React

vi.mock('@/lib/admin/avaluos', async (orig) => {
  const actual = await orig<typeof import('@/lib/admin/avaluos')>()
  return { ...actual, savePhotoDescriptions: vi.fn() }
})

const saveMock = savePhotoDescriptions as unknown as ReturnType<typeof vi.fn>

const PHOTOS: PhotoDetail[] = [
  { key: 'avaluo/sub-1/a.jpg', description: 'Fachada.' },
  { key: 'avaluo/sub-1/b.jpg', description: 'Cocina.' },
]

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  saveMock.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

/** Set a controlled textarea's value the React-tracked way, then fire input. */
function typeInto(el: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    'value',
  )?.set
  setter?.call(el, value)
  act(() => {
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function textareas(): HTMLTextAreaElement[] {
  return Array.from(container.querySelectorAll('textarea'))
}

function saveButton(): HTMLButtonElement {
  return Array.from(container.querySelectorAll('button')).find((b) =>
    b.textContent?.includes('Guardar descripciones'),
  ) as HTMLButtonElement
}

describe('PhotoDescriptionsEditor', () => {
  it('renders a prefilled textarea per photo', () => {
    act(() => root.render(<PhotoDescriptionsEditor id="cert-1" photos={PHOTOS} />))
    const tas = textareas()
    expect(tas).toHaveLength(2)
    expect(tas[0].value).toBe('Fachada.')
    expect(tas[1].value).toBe('Cocina.')
    // Nothing dirty yet → save disabled.
    expect(saveButton().disabled).toBe(true)
  })

  it('sends the edits and confirms on a successful save', async () => {
    saveMock.mockResolvedValue({ id: 'cert-1', drafts: [] })
    act(() => root.render(<PhotoDescriptionsEditor id="cert-1" photos={PHOTOS} />))

    typeInto(textareas()[0], 'Fachada en ladrillo a la vista.')
    expect(saveButton().disabled).toBe(false)

    await act(async () => {
      saveButton().click()
    })

    expect(saveMock).toHaveBeenCalledWith('cert-1', [
      { key: 'avaluo/sub-1/a.jpg', description: 'Fachada en ladrillo a la vista.' },
      { key: 'avaluo/sub-1/b.jpg', description: 'Cocina.' },
    ])
    expect(container.textContent).toContain('Descripciones guardadas.')
  })

  it('surfaces a Ley-1673 rejection against the offending photo', async () => {
    saveMock.mockRejectedValue(
      new ApiError(422, 'Error 422', {
        error: 'one or more descriptions were rejected',
        violations: [
          { key: 'avaluo/sub-1/b.jpg', reason: 'lexicon', violations: ['perito'] },
        ],
      }),
    )
    act(() => root.render(<PhotoDescriptionsEditor id="cert-1" photos={PHOTOS} />))

    typeInto(textareas()[1], 'Cocina inspeccionada por el perito.')
    await act(async () => {
      saveButton().click()
    })

    expect(container.textContent).toContain('Términos no permitidos (Ley 1673): perito.')
    // The reviewer's text is preserved so they can fix it.
    expect(textareas()[1].value).toBe('Cocina inspeccionada por el perito.')
  })
})
