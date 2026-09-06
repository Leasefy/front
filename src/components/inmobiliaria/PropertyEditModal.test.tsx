/**
 * PropertyEditModal.test.tsx — edit action wired to PATCH /properties/:id.
 *
 * Covers: form seeded from the property, submit calls propertiesApi.update
 * with numeric payload, success path (toast + onSuccess), backend error
 * surfaced inline (no silent failure), and photo management: existing images
 * listed with working remove (DELETE image endpoint), new photos uploaded on
 * save via uploadPropertyPhotos.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}))

vi.mock('@/lib/api/properties.service', () => ({
  propertiesApi: {
    update: vi.fn(),
    getImages: vi.fn(),
    deleteImage: vi.fn(),
  },
}))

vi.mock('@/lib/api/property-photos', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/property-photos')>()
  return { ...actual, uploadPropertyPhotos: vi.fn() }
})

import { PropertyEditModal } from './PropertyEditModal'
import { propertiesApi } from '@/lib/api/properties.service'
import { uploadPropertyPhotos } from '@/lib/api/property-photos'
import { toast } from '@/components/ui/toast'
import type { AgencyProperty } from '@/lib/types/property'

const update = propertiesApi.update as unknown as ReturnType<typeof vi.fn>
const getImages = propertiesApi.getImages as unknown as ReturnType<typeof vi.fn>
const deleteImage = propertiesApi.deleteImage as unknown as ReturnType<typeof vi.fn>
const uploadPhotos = uploadPropertyPhotos as unknown as ReturnType<typeof vi.fn>

const PROPERTY = {
  id: 'prop-1',
  title: 'Apto Chapinero',
  description: 'Luminoso',
  type: 'apartment',
  status: 'available',
  city: 'Bogotá',
  neighborhood: 'Chapinero',
  address: 'Calle 53 #13-45',
  latitude: 4.65,
  longitude: -74.06,
  monthlyRent: 3200000,
  bedrooms: 2,
  bathrooms: 1,
  area: 60,
  amenities: [],
  images: [],
  thumbnailUrl: '',
  landlordId: 'user-1',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  agents: [],
} as unknown as AgencyProperty

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  getImages.mockResolvedValue([])
  uploadPhotos.mockResolvedValue({ uploaded: 0, failed: [] })
  // happy-dom lacks URL.createObjectURL (used by PropertyPhotoPicker previews)
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

function render(props: Partial<React.ComponentProps<typeof PropertyEditModal>> = {}) {
  const defaultProps: React.ComponentProps<typeof PropertyEditModal> = {
    property: PROPERTY,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    ...props,
  }
  act(() => {
    root.render(<PropertyEditModal {...defaultProps} />)
  })
  return defaultProps
}

function input(testId: string): HTMLInputElement {
  const el = container.querySelector(`[data-testid="${testId}"]`) as HTMLInputElement
  expect(el).toBeTruthy()
  return el
}

async function submit() {
  const form = container.querySelector('form') as HTMLFormElement
  expect(form).toBeTruthy()
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await new Promise((r) => setTimeout(r, 0))
  })
}

function setValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  setter?.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('<PropertyEditModal>', () => {
  it('seeds the form with the current property data', () => {
    render()
    expect(input('edit-title').value).toBe('Apto Chapinero')
    expect(input('edit-neighborhood').value).toBe('Chapinero')
    expect(input('edit-address').value).toBe('Calle 53 #13-45')
    expect(input('edit-rent').value).toBe('3200000')
    expect(input('edit-area').value).toBe('60')
  })

  it('PATCHes the edited fields via propertiesApi.update and notifies success', async () => {
    update.mockResolvedValueOnce({ ...PROPERTY, title: 'Nuevo título' })
    const props = render()

    await act(async () => {
      setValue(input('edit-title'), 'Nuevo título')
    })
    await submit()

    expect(update).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledWith('prop-1', {
      title: 'Nuevo título',
      description: 'Luminoso',
      type: 'apartment',
      city: 'Bogotá',
      neighborhood: 'Chapinero',
      address: 'Calle 53 #13-45',
      monthlyRent: 3200000,
      bedrooms: 2,
      bathrooms: 1,
      area: 60,
    })
    expect(toast.success).toHaveBeenCalled()
    expect(props.onSuccess).toHaveBeenCalledTimes(1)
  })

  it('surfaces the backend error inline and does not call onSuccess', async () => {
    update.mockRejectedValueOnce(new Error('No tienes acceso a esta propiedad'))
    const props = render()

    await submit()

    const error = container.querySelector('[data-testid="edit-error"]')
    expect(error?.textContent).toContain('No tienes acceso a esta propiedad')
    expect(props.onSuccess).not.toHaveBeenCalled()
  })

  it('blocks submit when a required field is emptied', async () => {
    render()

    await act(async () => {
      setValue(input('edit-title'), '')
    })
    await submit()

    expect(update).not.toHaveBeenCalled()
  })
})

// ── Photos ─────────────────────────────────────────────────────────────────

async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe('<PropertyEditModal> photos', () => {
  const IMAGES = [
    { id: 'img-1', url: 'https://cdn.test/1.jpg', order: 0 },
    { id: 'img-2', url: 'https://cdn.test/2.jpg', order: 1 },
  ]

  it('lists the property existing images fetched with ids', async () => {
    getImages.mockResolvedValueOnce(IMAGES)
    render()
    await flush()

    expect(getImages).toHaveBeenCalledWith('prop-1')
    const tiles = container.querySelectorAll('[data-testid="edit-existing-image"]')
    expect(tiles.length).toBe(2)
  })

  it('removes an image via propertiesApi.deleteImage', async () => {
    getImages.mockResolvedValueOnce(IMAGES)
    deleteImage.mockResolvedValueOnce(undefined)
    render()
    await flush()

    const removeBtn = container.querySelector(
      '[data-testid="edit-remove-image-img-1"]',
    ) as HTMLButtonElement
    expect(removeBtn).toBeTruthy()
    await act(async () => {
      removeBtn.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(deleteImage).toHaveBeenCalledWith('prop-1', 'img-1')
    const tiles = container.querySelectorAll('[data-testid="edit-existing-image"]')
    expect(tiles.length).toBe(1)
  })

  it('uploads newly picked photos on save after the PATCH', async () => {
    getImages.mockResolvedValueOnce([])
    update.mockResolvedValueOnce({ ...PROPERTY })
    uploadPhotos.mockResolvedValueOnce({ uploaded: 1, failed: [] })
    const props = render()
    await flush()

    const file = new File(['x'], 'nueva.jpg', { type: 'image/jpeg' })
    const photoInput = container.querySelector(
      '[data-testid="property-photo-input"]',
    ) as HTMLInputElement
    expect(photoInput).toBeTruthy()
    Object.defineProperty(photoInput, 'files', { value: [file], configurable: true })
    await act(async () => {
      photoInput.dispatchEvent(new Event('change', { bubbles: true }))
      await new Promise((r) => setTimeout(r, 0))
    })

    await submit()

    expect(update).toHaveBeenCalledTimes(1)
    expect(uploadPhotos).toHaveBeenCalledWith('prop-1', [file])
    expect(props.onSuccess).toHaveBeenCalledTimes(1)
  })

  it('surfaces partial photo-upload failures truthfully (save still succeeds)', async () => {
    getImages.mockResolvedValueOnce([])
    update.mockResolvedValueOnce({ ...PROPERTY })
    uploadPhotos.mockResolvedValueOnce({
      uploaded: 0,
      failed: [{ name: 'nueva.jpg', reason: 'Upload failed: 500' }],
    })
    const props = render()
    await flush()

    const file = new File(['x'], 'nueva.jpg', { type: 'image/jpeg' })
    const photoInput = container.querySelector(
      '[data-testid="property-photo-input"]',
    ) as HTMLInputElement
    Object.defineProperty(photoInput, 'files', { value: [file], configurable: true })
    await act(async () => {
      photoInput.dispatchEvent(new Event('change', { bubbles: true }))
      await new Promise((r) => setTimeout(r, 0))
    })

    await submit()

    expect(toast.warning).toHaveBeenCalledWith(
      'Los cambios se guardaron, pero 1 de 1 fotos no se subieron.',
      expect.objectContaining({ description: 'Upload failed: 500' }),
    )
    expect(props.onSuccess).toHaveBeenCalledTimes(1)
  })
})
