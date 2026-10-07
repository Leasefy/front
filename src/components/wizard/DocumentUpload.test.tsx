/**
 * DocumentUpload — quitar un documento que ya está en el servidor (02-10-2026).
 *
 * Antes `StepDocuments` convertía el fallo del DELETE en `false` y el
 * documento se quedaba sin decir por qué; si el hook lanzaba, salía el
 * `message` crudo y la vista de «error» escondía el documento que seguía
 * ahí. Ahora el motivo va debajo, con la regla de oro, y el documento sigue
 * a la vista.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

void React

import { ApiError } from '@/lib/api/client'
import { DocumentUpload } from './DocumentUpload'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function quitarCon(onDelete: (id: string) => Promise<boolean | void>, onChange = vi.fn()) {
  act(() => {
    root.render(
      <DocumentUpload
        id="cedula"
        label="Documento de identidad"
        hint="Por ambos lados"
        value={{ file: null, fileName: 'cedula.pdf', remoteId: 'doc-1' }}
        onChange={onChange}
        onDelete={onDelete}
      />,
    )
  })
  const quitar = container.querySelector('[aria-label="Eliminar"]') as HTMLButtonElement
  await act(async () => {
    quitar.click()
    await new Promise((r) => setTimeout(r, 0))
  })
  return onChange
}

const error = () => container.querySelector('#cedula-error')?.textContent ?? ''

describe('DocumentUpload — quitar un documento del servidor (02-10-2026)', () => {
  it('🔴 si el back no lo deja borrar, dice por qué y el documento sigue a la vista', async () => {
    const onChange = await quitarCon(() =>
      Promise.reject(new ApiError(409, 'Sólo se pueden quitar documentos de una postulación en borrador.')),
    )
    expect(error()).toBe('Sólo se pueden quitar documentos de una postulación en borrador.')
    expect(container.textContent).toContain('cedula.pdf')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('un 5xx dice que fue nuestro, con la referencia', async () => {
    await quitarCon(() =>
      Promise.reject(new ApiError(500, 'Internal server error', 'ERROR_INTERNO', { referencia: 'ab12cd34' })),
    )
    expect(error()).toMatch(/^No pudimos eliminar el documento: algo falló de nuestro lado/)
    expect(error()).toContain('ab12cd34')
  })

  it('sin respuesta: habla de la conexión', async () => {
    await quitarCon(() => Promise.reject(new ApiError(0, 'Failed to fetch')))
    expect(error()).toMatch(/conexión/)
  })

  it('si se borra, se quita de la vista', async () => {
    const onChange = await quitarCon(() => Promise.resolve(true))
    expect(onChange).toHaveBeenCalledWith(null)
  })
})
