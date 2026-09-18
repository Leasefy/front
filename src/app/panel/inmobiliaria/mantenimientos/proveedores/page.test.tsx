/**
 * page.test.tsx — El registro de proveedores (H-04).
 *
 * Lo que sostiene, que son decisiones y no detalles de pintura:
 *
 * P1 — Los AVISOS salen del back tal cual. La pantalla no los reordena, no los
 *      resume y no inventa los suyos: la regla de «sin RUT no se le puede
 *      pagar» vive en un solo lado.
 * P2 — Sin permiso de `edit` no hay botones de escribir. No es cosmética: el
 *      back responde 403 y un botón visible es un 403 disfrazado de error.
 * P3 — Desactivar NO borra. Un proveedor con historial no desaparece porque
 *      alguien deje de llamarlo, y la pantalla lo dice.
 * P4 — El 503 del back (falta la migración) se muestra CON su motivo. Un
 *      «algo salió mal» deja a la persona sin saber que falta desplegar.
 * P5 — Calificar no se ofrece desde acá: el back exige la solicitud del trabajo
 *      que se califica, y en esta lista no hay ningún trabajo a la vista.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const h = vi.hoisted(() => ({
  canAccess: vi.fn((_m: string, _a: string) => true),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  api: {
    listar: vi.fn(),
    ver: vi.fn(),
    calificaciones: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    desactivar: vi.fn(),
    calificar: vi.fn(),
  },
}))

vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: h.canAccess }),
}))
vi.mock('@/components/ui/toast', () => ({ toast: h.toast }))
vi.mock('@/lib/api/proveedores-de-mantenimiento.service', () => ({
  proveedoresDeMantenimientoApi: h.api,
}))
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children: React.ReactNode }) => children,
}))
vi.mock('@/components/ui/back-button', () => ({
  BackButton: () => null,
}))

import ProveedoresPage from './page'

const UNO = {
  id: 'p-1',
  nombre: 'Plomería El Rayo',
  documento: '900123456',
  telefono: '3001112233',
  correo: null,
  especialidades: ['PLUMBING'],
  rut: null,
  seguridadSocial: null,
  calificacion: 4.5,
  trabajosCalificados: 2,
  reaperturasPorGarantia: 0,
  activo: true,
  notas: null,
  avisos: [
    'Falta el RUT: sin él no se le puede facturar ni retener.',
    'Falta la seguridad social: si se accidenta dentro del inmueble, el riesgo es de la inmobiliaria.',
  ],
}

let contenedor: HTMLDivElement
let raiz: Root

async function montar() {
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
  await act(async () => {
    raiz.render(<ProveedoresPage />)
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  h.canAccess.mockReturnValue(true)
  h.api.listar.mockResolvedValue([UNO])
  h.api.calificaciones.mockResolvedValue([])
})

afterEach(() => {
  act(() => raiz?.unmount())
  contenedor?.remove()
})

describe('Registro de proveedores', () => {
  it('P1 — muestra los avisos del back palabra por palabra, sin resumirlos', async () => {
    await montar()
    const avisos = contenedor.querySelector('[data-testid="avisos-del-proveedor"]')
    expect(avisos).not.toBeNull()
    const textos = Array.from(avisos!.querySelectorAll('li')).map((li) =>
      li.textContent?.trim(),
    )
    expect(textos).toEqual(UNO.avisos)
  })

  it('P1b — no inventa avisos: sin avisos del back no dibuja la lista', async () => {
    h.api.listar.mockResolvedValue([{ ...UNO, avisos: [] }])
    await montar()
    expect(
      contenedor.querySelector('[data-testid="avisos-del-proveedor"]'),
    ).toBeNull()
  })

  it('P2 — sin permiso de edit no aparece ningún botón de escribir', async () => {
    h.canAccess.mockImplementation((_m: string, a: string) => a !== 'edit')
    await montar()
    const textos = Array.from(contenedor.querySelectorAll('button')).map((b) =>
      b.textContent?.trim(),
    )
    expect(textos).not.toContain('Registrar proveedor')
    expect(textos).not.toContain('Editar')
    expect(textos).not.toContain('Desactivar')
  })

  it('P2b — con permiso de edit sí aparecen', async () => {
    await montar()
    const textos = Array.from(contenedor.querySelectorAll('button')).map((b) =>
      b.textContent?.trim(),
    )
    expect(textos.some((t) => t?.includes('Registrar proveedor'))).toBe(true)
    expect(textos).toContain('Editar')
    expect(textos).toContain('Desactivar')
  })

  it('P3 — desactivar llama a desactivar (no a borrar) y dice que el historial se conserva', async () => {
    h.api.desactivar.mockResolvedValue({ ...UNO, activo: false })
    await montar()
    const boton = Array.from(contenedor.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Desactivar',
    )
    await act(async () => {
      boton!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(h.api.desactivar).toHaveBeenCalledWith('p-1')
    expect(h.toast.success).toHaveBeenCalledWith(
      expect.stringContaining('historial se conserva'),
    )
  })

  it('P4 — el 503 del back se muestra con SU motivo, no con un genérico', async () => {
    h.api.desactivar.mockRejectedValue({
      message:
        'Falta la migración de proveedores: pídele a tu administrador que la aplique.',
    })
    await montar()
    const boton = Array.from(contenedor.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Desactivar',
    )
    await act(async () => {
      boton!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(h.toast.error).toHaveBeenCalledWith(
      'Falta la migración de proveedores: pídele a tu administrador que la aplique.',
    )
  })

  it('P5 — no ofrece calificar: la estrella se pone al cerrar el trabajo', async () => {
    await montar()
    const textos = Array.from(contenedor.querySelectorAll('button')).map((b) =>
      b.textContent?.trim(),
    )
    expect(textos.some((t) => t?.toLowerCase().includes('calificar'))).toBe(false)
    expect(h.api.calificar).not.toHaveBeenCalled()
  })

  it('los inactivos no salen hasta que se piden, y entonces se pueden reactivar', async () => {
    h.api.listar.mockResolvedValue([{ ...UNO, activo: false }])
    await montar()
    expect(contenedor.querySelectorAll('[data-testid="proveedor"]').length).toBe(0)

    const casilla = contenedor.querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    )
    // Un `new Event('click')` no le sirve a React: el delegado de eventos sólo
    // reconoce un MouseEvent, y sin él la casilla controlada nunca cambia.
    await act(async () => {
      casilla!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(contenedor.querySelectorAll('[data-testid="proveedor"]').length).toBe(1)
    const textos = Array.from(contenedor.querySelectorAll('button')).map((b) =>
      b.textContent?.trim(),
    )
    expect(textos.some((t) => t?.includes('Reactivar'))).toBe(true)
  })
})
