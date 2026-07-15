import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

// Mock BEFORE importing the component under test.
const sha256HexMock = vi.fn()
const uploadPdfToPresignedUrlMock = vi.fn()
vi.mock('@/lib/onboarding/habeas-data-upload', async () => {
  const actual = await vi.importActual<typeof import('@/lib/onboarding/habeas-data-upload')>(
    '@/lib/onboarding/habeas-data-upload',
  )
  return {
    ...actual,
    sha256Hex: (...args: unknown[]) => sha256HexMock(...args),
    uploadPdfToPresignedUrl: (...args: unknown[]) => uploadPdfToPresignedUrlMock(...args),
  }
})

import { HabeasDataStepForm } from './HabeasDataStepForm'
import { HabeasDataUploadError } from '@/lib/onboarding/habeas-data-upload'
import type {
  OnboardingSessionHabeasDataConfirmResponse,
  OnboardingSessionHabeasDataPresignResponse,
} from '@/lib/api/generated/agency'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  sha256HexMock.mockReset()
  uploadPdfToPresignedUrlMock.mockReset()
  sha256HexMock.mockResolvedValue('a'.repeat(64))
  uploadPdfToPresignedUrlMock.mockResolvedValue(undefined)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
})

const PRESIGN_RESPONSE: OnboardingSessionHabeasDataPresignResponse = {
  presignedUrl: 'https://s3.example.com/bucket/key?sig=abc',
  s3Key: 'tenants/t1/habeas-data/doc.pdf',
  expiresIn: 900,
}

const CONFIRM_RESPONSE: OnboardingSessionHabeasDataConfirmResponse = {
  sessionId: 'session-1',
  currentStep: 'complete',
  nextStep: null,
  draft: {},
}

function render(props: Partial<React.ComponentProps<typeof HabeasDataStepForm>> = {}) {
  const defaultProps: React.ComponentProps<typeof HabeasDataStepForm> = {
    isSubmitting: false,
    presignHabeasData: vi.fn().mockResolvedValue(PRESIGN_RESPONSE),
    confirmHabeasData: vi.fn().mockResolvedValue(CONFIRM_RESPONSE),
    submitError: null,
    ...props,
  }
  act(() => {
    root.render(<HabeasDataStepForm {...defaultProps} />)
  })
  return defaultProps
}

function byTestId(testId: string): HTMLElement {
  const el = container.querySelector(`[data-testid="${testId}"]`)
  if (!el) throw new Error(`Element with data-testid="${testId}" not found`)
  return el as HTMLElement
}

function byId(id: string): HTMLInputElement {
  const el = container.querySelector(`[id="${id}"]`)
  if (!el) throw new Error(`Element with id="${id}" not found`)
  return el as HTMLInputElement
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  act(() => {
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function pdfFile(name = 'habeas-data.pdf', sizeBytes = 1024): File {
  const file = new File(['%PDF-1.4 fake'], name, { type: 'application/pdf' })
  Object.defineProperty(file, 'size', { value: sizeBytes, configurable: true })
  return file
}

function selectFile(file: File) {
  const input = container.querySelector('[data-testid="habeas-data-file-input"]') as HTMLInputElement
  act(() => {
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

function fillIdentityFields() {
  setInputValue(byId('signedByFullName'), 'Juan Pérez')
  setInputValue(byId('signedByCedula'), '1234567890')
}

async function clickSubmit() {
  const submitBtn = container.querySelector(
    '[data-testid="habeas-data-step-form"] button[type="submit"]',
  ) as HTMLButtonElement
  await act(async () => {
    submitBtn.click()
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe('<HabeasDataStepForm>', () => {
  it('renders the file input and the two identity fields', () => {
    render()

    expect(byTestId('habeas-data-file-input')).toBeTruthy()
    expect(byId('signedByFullName')).toBeTruthy()
    expect(byId('signedByCedula')).toBeTruthy()
  })

  it('rejects a non-PDF file and blocks submit', async () => {
    const presignHabeasData = vi.fn().mockResolvedValue(PRESIGN_RESPONSE)
    render({ presignHabeasData })

    selectFile(
      Object.defineProperty(new File(['plain text'], 'doc.txt', { type: 'text/plain' }), 'size', {
        value: 1024,
      }),
    )
    fillIdentityFields()
    await clickSubmit()

    expect(container.textContent).toContain('El archivo debe ser un PDF.')
    expect(presignHabeasData).not.toHaveBeenCalled()
  })

  it('rejects a PDF larger than 10MB and blocks submit', async () => {
    const presignHabeasData = vi.fn().mockResolvedValue(PRESIGN_RESPONSE)
    render({ presignHabeasData })

    selectFile(pdfFile('big.pdf', 11 * 1024 * 1024))
    fillIdentityFields()
    await clickSubmit()

    expect(container.textContent).toContain('El archivo no puede superar 10MB.')
    expect(presignHabeasData).not.toHaveBeenCalled()
  })

  it('requires signedByFullName and signedByCedula', async () => {
    const presignHabeasData = vi.fn().mockResolvedValue(PRESIGN_RESPONSE)
    render({ presignHabeasData })

    selectFile(pdfFile())
    await clickSubmit()

    expect(container.textContent).toContain('El nombre completo del firmante es obligatorio.')
    expect(container.textContent).toContain('La cédula del firmante es obligatoria.')
    expect(presignHabeasData).not.toHaveBeenCalled()
  })

  it('happy path: calls sha256Hex → presign → upload → confirm in order with correct data', async () => {
    const presignHabeasData = vi.fn().mockResolvedValue(PRESIGN_RESPONSE)
    const confirmHabeasData = vi.fn().mockResolvedValue(CONFIRM_RESPONSE)
    const file = pdfFile('habeas-data.pdf', 2048)
    sha256HexMock.mockResolvedValue('b'.repeat(64))

    render({ presignHabeasData, confirmHabeasData })

    selectFile(file)
    fillIdentityFields()
    await clickSubmit()

    expect(sha256HexMock).toHaveBeenCalledWith(file)
    expect(presignHabeasData).toHaveBeenCalledWith({
      fileName: 'habeas-data.pdf',
      contentType: 'application/pdf',
      fileSize: 2048,
    })
    expect(uploadPdfToPresignedUrlMock).toHaveBeenCalledWith(PRESIGN_RESPONSE.presignedUrl, file)
    expect(confirmHabeasData).toHaveBeenCalledWith({
      s3Key: PRESIGN_RESPONSE.s3Key,
      sha256: 'b'.repeat(64),
      signedByFullName: 'Juan Pérez',
      signedByCedula: '1234567890',
    })

    // Call order: presign before upload, upload before confirm.
    const presignOrder = presignHabeasData.mock.invocationCallOrder[0]
    const uploadOrder = uploadPdfToPresignedUrlMock.mock.invocationCallOrder[0]
    const confirmOrder = confirmHabeasData.mock.invocationCallOrder[0]
    expect(presignOrder).toBeLessThan(uploadOrder)
    expect(uploadOrder).toBeLessThan(confirmOrder)
  })

  it('stops after presign failure — does not upload or confirm', async () => {
    const presignHabeasData = vi.fn().mockResolvedValue(null)
    const confirmHabeasData = vi.fn().mockResolvedValue(CONFIRM_RESPONSE)
    render({ presignHabeasData, confirmHabeasData })

    selectFile(pdfFile())
    fillIdentityFields()
    await clickSubmit()

    expect(presignHabeasData).toHaveBeenCalledTimes(1)
    expect(uploadPdfToPresignedUrlMock).not.toHaveBeenCalled()
    expect(confirmHabeasData).not.toHaveBeenCalled()
  })

  it('shows an upload error and does not confirm when the S3 PUT fails', async () => {
    const presignHabeasData = vi.fn().mockResolvedValue(PRESIGN_RESPONSE)
    const confirmHabeasData = vi.fn().mockResolvedValue(CONFIRM_RESPONSE)
    uploadPdfToPresignedUrlMock.mockRejectedValue(new HabeasDataUploadError('La subida del documento falló (403).'))
    render({ presignHabeasData, confirmHabeasData })

    selectFile(pdfFile())
    fillIdentityFields()
    await clickSubmit()

    expect(presignHabeasData).toHaveBeenCalledTimes(1)
    expect(uploadPdfToPresignedUrlMock).toHaveBeenCalledTimes(1)
    expect(confirmHabeasData).not.toHaveBeenCalled()
    expect(byTestId('habeas-data-upload-error').textContent).toContain('La subida del documento falló (403).')
  })

  it('renders the session-level submitError banner (validation kind)', () => {
    render({ submitError: 'La sesión rechazó el documento.' })

    expect(byTestId('habeas-data-step-form-error').textContent).toContain('La sesión rechazó el documento.')
  })
})
