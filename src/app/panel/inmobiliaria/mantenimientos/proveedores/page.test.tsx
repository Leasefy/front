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
 *
 * 🔴 19-09-2026 · T1-T6: es una TABLA, con el chasis de la casa. Nico: «esto
 * parece ser una tabla; si es una tabla, organízala y colócale todo lo que
 * tienen nuestras tablas». Lo que se rompía antes y estas pruebas sostienen:
 * los controles vivían FUERA de la tabla, «ver los inactivos» era una casilla
 * pelada, no había orden ni alcance, y el vacío era un cartel suelto.
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

/** Al día y con los papeles completos: el que NO pide nada hoy. */
const AL_DIA = {
  ...UNO,
  id: 'p-2',
  nombre: 'Aseo Andes',
  documento: '901222333',
  especialidades: ['PAINTING'],
  rut: { ruta: null, nombre: 'rut.pdf', vigenteHasta: '2027-03-31', vencido: false },
  seguridadSocial: { ruta: null, nombre: 'pila.pdf', vigenteHasta: '2026-12-31', vencido: false },
  calificacion: null,
  trabajosCalificados: 0,
  avisos: [] as string[],
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

const $ = (id: string) =>
  contenedor.querySelector(`[data-testid="${id}"]`) as HTMLElement | null

const botones = () =>
  Array.from(contenedor.querySelectorAll('button')).map((b) => b.textContent?.trim())

const nombresEnOrden = () =>
  Array.from(contenedor.querySelectorAll('[data-testid="proveedor"]')).map(
    (fila) => fila.querySelector('td')?.textContent?.trim(),
  )

async function clic(el: Element | null | undefined) {
  await act(async () => {
    el!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

async function escribir(input: HTMLInputElement, texto: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    setter.call(input, texto)
    input.dispatchEvent(new Event('input', { bubbles: true }))
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
    const avisos = $('avisos-del-proveedor')
    expect(avisos).not.toBeNull()
    const textos = Array.from(avisos!.querySelectorAll('li')).map((li) =>
      li.textContent?.trim(),
    )
    expect(textos).toEqual(UNO.avisos)
  })

  it('P1b — no inventa avisos: sin avisos del back no dibuja la lista', async () => {
    h.api.listar.mockResolvedValue([{ ...UNO, avisos: [] }])
    await montar()
    expect($('avisos-del-proveedor')).toBeNull()
  })

  it('P2 — sin permiso de edit no aparece ningún botón de escribir', async () => {
    h.canAccess.mockImplementation((_m: string, a: string) => a !== 'edit')
    await montar()
    const textos = botones()
    expect(textos).not.toContain('Registrar proveedor')
    expect(textos).not.toContain('Editar')
    expect(textos).not.toContain('Desactivar')
  })

  it('P2b — con permiso de edit sí aparecen', async () => {
    await montar()
    const textos = botones()
    expect(textos.some((t) => t?.includes('Registrar proveedor'))).toBe(true)
    expect(textos).toContain('Editar')
    expect(textos).toContain('Desactivar')
  })

  it('P3 — desactivar llama a desactivar (no a borrar) y dice que el historial se conserva', async () => {
    h.api.desactivar.mockResolvedValue({ ...UNO, activo: false })
    await montar()
    await clic(
      Array.from(contenedor.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Desactivar',
      ),
    )
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
    await clic(
      Array.from(contenedor.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Desactivar',
      ),
    )
    expect(h.toast.error).toHaveBeenCalledWith(
      'Falta la migración de proveedores: pídele a tu administrador que la aplique.',
    )
  })

  it('P5 — no ofrece calificar: la estrella se pone al cerrar el trabajo', async () => {
    await montar()
    expect(botones().some((t) => t?.toLowerCase().includes('calificar'))).toBe(false)
    expect(h.api.calificar).not.toHaveBeenCalled()
  })
})

/**
 * 🔴 El chasis de la casa. Antes de esto el buscador y la casilla de inactivos
 * flotaban sobre el fondo de la página, encima de una pila de tarjetas.
 */
describe('Proveedores — la tabla, con lo que tienen todas nuestras tablas', () => {
  it('T1 — los controles viven DENTRO de la tarjeta de la tabla, no flotando encima', async () => {
    await montar()
    const tabla = $('proveedores-tabla')
    expect(tabla).not.toBeNull()
    for (const id of [
      'buscar-proveedores',
      'cajon-activos',
      'cajon-inactivos',
      'cajon-todos',
      'filtro-especialidad',
    ]) {
      expect(tabla!.querySelector(`[data-testid="${id}"]`), id).not.toBeNull()
    }
    // Ni un control suelto por fuera: los `<input>` de la pantalla son los de
    // la tabla (el formulario sólo existe con el modal abierto).
    const fuera = Array.from(contenedor.querySelectorAll('input')).filter(
      (i) => !tabla!.contains(i),
    )
    expect(fuera).toEqual([])
  })

  it('T2 — «ver los inactivos» es un cajón de la tabla, no una casilla suelta', async () => {
    h.api.listar.mockResolvedValue([{ ...UNO, activo: false }])
    await montar()
    expect(contenedor.querySelector('input[type="checkbox"]')).toBeNull()
    // Arranca en «Activos»: el inactivo no está.
    expect(nombresEnOrden()).toEqual([])

    await clic($('cajon-inactivos'))
    expect(nombresEnOrden().length).toBe(1)
    expect(botones().some((t) => t?.includes('Reactivar'))).toBe(true)
  })

  it('T3 — el orden por defecto sube a los que tienen papeles pendientes', async () => {
    // `AL_DIA` va primero en la lista que manda el back y alfabéticamente
    // ('Aseo Andes' < 'Plomería El Rayo'): si el orden no fuera por papeles,
    // quedaría arriba en los dos casos.
    h.api.listar.mockResolvedValue([AL_DIA, UNO])
    await montar()
    expect(nombresEnOrden()[0]).toContain('Plomería El Rayo')

    await clic($('ordenar-por-nombre'))
    expect(nombresEnOrden()[0]).toContain('Aseo Andes')
  })

  it('T4 — el alcance sale sólo con filtros puestos, y se quitan desde ahí', async () => {
    h.api.listar.mockResolvedValue([AL_DIA, UNO])
    await montar()
    expect($('alcance-de-proveedores')).toBeNull()

    await escribir($('buscar-proveedores') as HTMLInputElement, 'andes')
    expect(nombresEnOrden().length).toBe(1)
    expect($('alcance-de-proveedores')!.textContent).toContain('1 de 2')

    await clic($('limpiar-filtros-proveedores'))
    expect(nombresEnOrden().length).toBe(2)
    expect($('alcance-de-proveedores')).toBeNull()
  })

  it('T4b — el buscador también encuentra por documento y por oficio', async () => {
    h.api.listar.mockResolvedValue([AL_DIA, UNO])
    await montar()
    const buscador = $('buscar-proveedores') as HTMLInputElement

    await escribir(buscador, '900123456')
    expect(nombresEnOrden()).toEqual([expect.stringContaining('Plomería El Rayo')])

    // Sin tilde: nadie escribe «Plomería» con tilde en un buscador.
    await escribir(buscador, 'plomeria')
    expect(nombresEnOrden()).toEqual([expect.stringContaining('Plomería El Rayo')])
  })

  it('T4c — los oficios van como TEXTO, no como pastillas', async () => {
    // 🔴 Visto en el navegador, en tema oscuro: `Badge variant="secondary"`
    // es casi blanco en oscuro, y con una o dos por fila lo más brillante de
    // la tabla terminaba siendo el oficio y no el nombre del proveedor.
    h.api.listar.mockResolvedValue([UNO])
    await montar()
    const fila = contenedor.querySelector('[data-testid="proveedor"]')!
    const celdas = Array.from(fila.querySelectorAll('td'))
    const queHace = celdas[2]
    expect(queHace.textContent).toBe('Plomería')
    expect(queHace.querySelector('[class*="rounded-full"]')).toBeNull()
  })

  it('T4d — con varios oficios los separa, sin una pastilla por cada uno', async () => {
    h.api.listar.mockResolvedValue([
      { ...UNO, especialidades: ['PLUMBING', 'STRUCTURAL'] },
    ])
    await montar()
    const celdas = Array.from(
      contenedor.querySelector('[data-testid="proveedor"]')!.querySelectorAll('td'),
    )
    expect(celdas[2].textContent).toBe('Plomería · Estructural')
  })

  it('T5 — el vacío vive DENTRO de la tabla y ofrece registrar al primero', async () => {
    h.api.listar.mockResolvedValue([])
    await montar()
    const vacio = $('sin-datos')
    expect(vacio).not.toBeNull()
    expect($('proveedores-tabla')!.contains(vacio!)).toBe(true)
    expect(vacio!.getAttribute('data-caso')).toBe('vacio')
    expect($('crear-el-primero')).not.toBeNull()
  })

  it('T5b — buscar y no encontrar NO se dice como «todavía no hay proveedores»', async () => {
    await montar()
    await escribir($('buscar-proveedores') as HTMLInputElement, 'zzzz')
    expect($('sin-datos')!.getAttribute('data-caso')).toBe('filtros')
    expect($('crear-el-primero')).toBeNull()
  })

  it('T6 — si la carga falla, la tabla lo dice; no lo pinta como «no hay»', async () => {
    h.api.listar.mockRejectedValue(new Error('network'))
    await montar()
    expect($('fallo-de-carga')).not.toBeNull()
    expect($('sin-datos')).toBeNull()
    expect(contenedor.textContent).not.toContain('Todavía no hay proveedores')
  })
})
