/**
 * ConfigBranding.test.tsx — logo upload wired to POST /inmobiliaria/agency/logo.
 *
 * Covers: current-logo rendering from agency.logoUrl, client-side validation
 * (type jpeg/png/webp, ≤5MB) with Spanish messages, successful multipart upload
 * (service call + local state + onLogoUpdated), and backend error surfacing.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

vi.mock('@/lib/api/inmobiliaria.service', () => ({
  agencyApi: {
    uploadAgencyLogo: vi.fn(),
    updateAgency: vi.fn(),
  },
}))

import { ConfigBranding } from './ConfigBranding'
import { agencyApi } from '@/lib/api/inmobiliaria.service'
import { toast } from 'sonner'
import type { AgencyProfile } from '@/lib/types/inmobiliaria'

const uploadAgencyLogo = agencyApi.uploadAgencyLogo as unknown as ReturnType<typeof vi.fn>
const updateAgency = agencyApi.updateAgency as unknown as ReturnType<typeof vi.fn>

const AGENCY: AgencyProfile = {
  id: 'ag-1',
  name: 'Inmobiliaria ABC',
  logoUrl: 'https://cdn.test/current-logo.png',
  memberRole: 'ADMIN',
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.clearAllMocks()
})

function render(props: Partial<React.ComponentProps<typeof ConfigBranding>> = {}) {
  const defaultProps: React.ComponentProps<typeof ConfigBranding> = {
    agency: AGENCY,
    onLogoUpdated: vi.fn(),
    ...props,
  }
  act(() => {
    root.render(<ConfigBranding {...defaultProps} />)
  })
  return defaultProps
}

async function selectFile(file: File) {
  const input = container.querySelector(
    '[data-testid="branding-logo-input"]',
  ) as HTMLInputElement
  expect(input).toBeTruthy()
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise((r) => setTimeout(r, 0))
  })
}

function errorBox(): HTMLElement | null {
  return container.querySelector('[data-testid="branding-upload-error"]')
}

describe('<ConfigBranding>', () => {
  it('shows the current logo from agency.logoUrl', () => {
    render()
    const img = container.querySelector('img[alt="Logo"]') as HTMLImageElement
    expect(img).toBeTruthy()
    expect(img.getAttribute('src')).toBe('https://cdn.test/current-logo.png')
  })

  it('rejects unsupported file types with a Spanish message and does NOT upload', async () => {
    render()
    await selectFile(new File(['x'], 'logo.gif', { type: 'image/gif' }))

    expect(uploadAgencyLogo).not.toHaveBeenCalled()
    expect(errorBox()?.textContent).toContain('Formato no soportado. Usa JPG, PNG o WebP.')
  })

  it('rejects files over 5MB with a Spanish message and does NOT upload', async () => {
    render()
    const bigFile = new File(['x'], 'logo.png', { type: 'image/png' })
    Object.defineProperty(bigFile, 'size', { value: 5 * 1024 * 1024 + 1 })
    await selectFile(bigFile)

    expect(uploadAgencyLogo).not.toHaveBeenCalled()
    expect(errorBox()?.textContent).toContain('El archivo excede el límite de 5MB.')
  })

  it('uploads a valid file, updates the preview with the returned logoUrl and notifies the parent', async () => {
    uploadAgencyLogo.mockResolvedValueOnce({ logoUrl: 'https://cdn.test/new-logo.webp' })
    const props = render()

    const file = new File(['bytes'], 'logo.webp', { type: 'image/webp' })
    await selectFile(file)

    expect(uploadAgencyLogo).toHaveBeenCalledTimes(1)
    expect(uploadAgencyLogo).toHaveBeenCalledWith(file)
    expect(props.onLogoUpdated).toHaveBeenCalledWith('https://cdn.test/new-logo.webp')
    expect(toast.success).toHaveBeenCalled()

    const img = container.querySelector('img[alt="Logo"]') as HTMLImageElement
    expect(img.getAttribute('src')).toBe('https://cdn.test/new-logo.webp')
    expect(errorBox()).toBeNull()
  })

  it('surfaces the backend error message when the upload fails (no silent failure)', async () => {
    uploadAgencyLogo.mockRejectedValueOnce(
      new Error('Solo los administradores pueden actualizar la agencia'),
    )
    const props = render()

    await selectFile(new File(['bytes'], 'logo.png', { type: 'image/png' }))

    expect(errorBox()?.textContent).toContain(
      'Solo los administradores pueden actualizar la agencia',
    )
    expect(toast.error).toHaveBeenCalled()
    expect(props.onLogoUpdated).not.toHaveBeenCalled()
  })

  it('disables the upload input for non-admins', () => {
    render({ canEdit: false })
    const input = container.querySelector(
      '[data-testid="branding-logo-input"]',
    ) as HTMLInputElement
    expect(input.disabled).toBe(true)
  })

  describe('brand colors', () => {
    function hexInput(name: 'primary' | 'secondary'): HTMLInputElement {
      const input = container.querySelector(
        `[data-testid="branding-${name}-hex"]`,
      ) as HTMLInputElement
      expect(input).toBeTruthy()
      return input
    }

    function setValue(input: HTMLInputElement, value: string) {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )!.set!
      setter.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }

    function saveColorsButton(): HTMLButtonElement {
      const btn = Array.from(container.querySelectorAll('button')).find((b) =>
        (b.textContent ?? '').includes('Guardar colores'),
      )
      expect(btn).toBeTruthy()
      return btn as HTMLButtonElement
    }

    it('seeds the pickers from agency.branding', () => {
      render({
        agency: { ...AGENCY, branding: { primaryColor: '#112233', secondaryColor: '#445566' } },
      })
      expect(hexInput('primary').value).toBe('#112233')
      expect(hexInput('secondary').value).toBe('#445566')
    })

    it('saves only the changed color via PUT /inmobiliaria/agency', async () => {
      updateAgency.mockResolvedValueOnce({})
      render({
        agency: { ...AGENCY, branding: { primaryColor: '#112233', secondaryColor: '#445566' } },
      })

      act(() => {
        setValue(hexInput('primary'), '#aabbcc')
      })
      await act(async () => {
        saveColorsButton().click()
        await new Promise((r) => setTimeout(r, 0))
      })

      expect(updateAgency).toHaveBeenCalledTimes(1)
      expect(updateAgency).toHaveBeenCalledWith({
        branding: { primaryColor: '#aabbcc' },
      })
      expect(toast.success).toHaveBeenCalled()
    })

    it('rejects an invalid hex client-side and does NOT call the API', async () => {
      render({
        agency: { ...AGENCY, branding: { primaryColor: '#112233', secondaryColor: '#445566' } },
      })

      act(() => {
        setValue(hexInput('primary'), '#12')
      })
      await act(async () => {
        saveColorsButton().click()
        await new Promise((r) => setTimeout(r, 0))
      })

      expect(updateAgency).not.toHaveBeenCalled()
      expect(container.textContent).toContain('Color inválido. Usa el formato #RRGGBB.')
    })

    it('does not call the API when nothing changed', async () => {
      render({
        agency: { ...AGENCY, branding: { primaryColor: '#112233', secondaryColor: '#445566' } },
      })

      await act(async () => {
        saveColorsButton().click()
        await new Promise((r) => setTimeout(r, 0))
      })

      expect(updateAgency).not.toHaveBeenCalled()
    })

    it('disables the color inputs for non-admins', () => {
      render({ canEdit: false })
      expect(hexInput('primary').disabled).toBe(true)
      expect(hexInput('secondary').disabled).toBe(true)
    })
  })
})
