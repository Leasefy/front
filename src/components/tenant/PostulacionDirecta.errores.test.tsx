/**
 * PostulacionDirecta — los errores con la regla de oro (02-10-2026).
 *
 * Antes: cualquier fallo que no fuera `IDENTIDAD_NO_COINCIDE` ni
 * `PROPIEDAD_EN_VENTA` pintaba `e.message` crudo (un 5xx en inglés) y, si
 * fallaba adjuntar los documentos, decía lo mismo aunque la postulación YA
 * estaba creada. Esta pantalla no tiene campos editables: un 400 lista lo que
 * el back rechazó y la salida es el formulario.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

void React

const { createMock, reuseMock } = vi.hoisted(() => ({ createMock: vi.fn(), reuseMock: vi.fn() }))

vi.mock('@/lib/api/applications.service', () => ({
  applicationsApi: {
    create: (...a: unknown[]) => createMock(...a),
    reuseDocuments: (...a: unknown[]) => reuseMock(...a),
  },
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

import { ApiError } from '@/lib/api/client'
import { PostulacionDirecta } from './PostulacionDirecta'

const PROPERTY = { id: 'prop-1', title: 'Apto Laureles', city: 'Medellín', price: 2_000_000 } as never
const PREFILL = {
  hasPreviousApplication: true,
  fullName: 'Ana Pérez',
  documentType: 'CC',
  documentNumber: '1020304050',
  email: 'ana@correo.com',
  references: { previousLandlords: [], employmentReferences: [], personalReferences: [] },
  documents: [],
} as never
const CONSENT = { version: 'v1', title: 'Autorización', text: 'Autorizo…' } as never

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  createMock.mockReset()
  reuseMock.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function postular(prefill = PREFILL) {
  act(() => {
    root.render(
      <PostulacionDirecta
        property={PROPERTY}
        prefill={prefill}
        consentText={CONSENT}
        onPostulada={() => undefined}
        hrefFormulario="/aplicar/prop-1?formulario=1"
      />,
    )
  })
  act(() => (container.querySelector('#acepta-terminos') as HTMLButtonElement).click())
  act(() => (container.querySelector('#autoriza-datos') as HTMLButtonElement).click())
  const boton = Array.from(container.querySelectorAll('button')).find((b) =>
    b.textContent?.includes('Postularme a este inmueble'),
  ) as HTMLButtonElement
  await act(async () => {
    boton.click()
    await new Promise((r) => setTimeout(r, 0))
  })
}

const aviso = () => container.querySelector('[role="alert"]')?.textContent ?? ''

describe('PostulacionDirecta — errores (02-10-2026)', () => {
  it('🔴 un 5xx dice que fue nuestro, con la referencia, sin el texto crudo ni «conexión»', async () => {
    createMock.mockRejectedValue(
      new ApiError(500, 'Internal server error', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Internal server error',
        referencia: 'ab12cd34',
      }),
    )
    await postular()
    expect(aviso()).toMatch(/No pudimos enviar tu postulación: algo falló de nuestro lado/)
    expect(aviso()).toContain('ab12cd34')
    expect(aviso()).not.toMatch(/Internal server error|conexi[oó]n/)
  })

  it('un 400 con campos lista lo que el back rechazó', async () => {
    createMock.mockRejectedValue(
      new ApiError(400, ['El correo no es válido.'], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: ['El correo no es válido.'],
        campos: [{ campo: 'email', regla: 'formato', mensaje: 'El correo no es válido.' }],
      }),
    )
    await postular()
    expect(aviso()).toContain('El correo no es válido.')
  })

  it('sin respuesta (status 0): ahí sí se habla de la conexión', async () => {
    createMock.mockRejectedValue(new ApiError(0, 'Failed to fetch'))
    await postular()
    expect(aviso()).toMatch(/conexión/)
  })

  it('🔴 si falla adjuntar los documentos, dice que la postulación quedó creada', async () => {
    createMock.mockResolvedValue({ id: 'app-1' })
    reuseMock.mockRejectedValue(new ApiError(500, 'boom', 'ERROR_INTERNO', { referencia: 'ff00ee11' }))
    await postular()
    expect(aviso()).toMatch(/^Tu postulación quedó creada, pero no pudimos adjuntar tus documentos\./)
    expect(aviso()).toContain('ff00ee11')
  })

  it('🔴 más de 10 arrendadores anteriores no se mandan: la frase del back', async () => {
    const conDeMas = {
      ...(PREFILL as object),
      references: {
        previousLandlords: Array.from({ length: 11 }, (_, i) => ({
          name: `A${i}`,
          phone: '1',
          address: 'x',
          duration: 1,
          relationship: 'landlord',
        })),
      },
    } as never
    await postular(conDeMas)
    expect(createMock).not.toHaveBeenCalled()
    expect(aviso()).toContain('Puedes agregar hasta 10 arrendadores anteriores.')
  })
})
