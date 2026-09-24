/**
 * RequisitosClient.test.tsx — los requisitos que define cada inmobiliaria (F-05).
 *
 * Lo que sostienen, que son decisiones y no detalles de pintura:
 *
 * P1 — 🔴 «Los define cada inmobiliaria» tiene que ser cierto: se puede AGREGAR
 *      un requisito propio y QUITAR el que no se pide. Antes sólo se podía
 *      mover el interruptor de obligatorio/opcional, porque `crearRequisito` y
 *      `borrarRequisito` no tenían consumidor: la inmobiliaria heredaba nuestra
 *      lista y no definía nada.
 * P2 — En «Todos» la lista va AGRUPADA por perfil. Plana, «Cédula» aparecía una
 *      vez por perfil, seguidas, y parecía que la pantalla repetía filas.
 * P3 — F-08: el estudio de Leasefy no lleva interruptor ni botón de quitar. Un
 *      control que después devuelve 409 enseña a desconfiar de la pantalla.
 * P4 — Mientras es el preset no se edita nada: primero se guarda como propia.
 *      Un botón que edita la lista de todos sería peor que no tenerlo.
 * P5 — Cada requisito dice qué tiene que HACER el candidato. «Hace algo» —lo
 *      que decía `ACCION`— no es una instrucción: el propio estudio de Leasefy
 *      caía ahí y quedaba descrito como «EMPLEADO · Hace algo».
 * P6 — Quitar un requisito PREGUNTA. Es la política de riesgo: sin el papel, el
 *      candidato entra sin que nadie lo note.
 * P7 — Sin permiso de `configuracion:edit` no hay un botón de escribir.
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
    requisitos: vi.fn(),
    sembrarPreset: vi.fn(),
    crearRequisito: vi.fn(),
    editarRequisito: vi.fn(),
    borrarRequisito: vi.fn(),
  },
}))

vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: h.canAccess }),
}))
vi.mock('@/components/ui/toast', () => ({ toast: h.toast }))
vi.mock('@/lib/api/crm.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/crm.service')>()),
  postulacionesApi: h.api,
}))
vi.mock('@/lib/api/refresco-de-datos', () => ({
  invalidar: vi.fn(),
  alCambiar: () => () => {},
  descartarEnVuelo: vi.fn(),
}))
vi.mock('@/components/providers/SmoothScroll', () => ({
  useLenis: () => ({ stop: vi.fn(), start: vi.fn() }),
}))

import { RequisitosClient } from './RequisitosClient'

const PERFILES = [
  { perfil: 'EMPLEADO', nombre: 'Empleado' },
  { perfil: 'INDEPENDIENTE', nombre: 'Independiente' },
]

const CEDULA_EMPLEADO = {
  id: 'r-1',
  perfil: 'EMPLEADO',
  etiqueta: 'Cédula por las dos caras',
  detalle: null,
  clase: 'DOCUMENTO' as const,
  obligatorio: true,
  orden: 1,
  activo: true,
}
const ESTUDIO = {
  id: 'r-2',
  perfil: 'EMPLEADO',
  etiqueta: 'Estudio de arrendamiento de Leasefy',
  detalle: 'Lo paga el solicitante.',
  clase: 'ACCION' as const,
  obligatorio: true,
  orden: 2,
  activo: true,
  esElEstudio: true,
}
const CEDULA_INDEPENDIENTE = {
  ...CEDULA_EMPLEADO,
  id: 'r-3',
  perfil: 'INDEPENDIENTE',
}

function respuesta(esElPreset = false) {
  return {
    disponible: true,
    motivo: null,
    esElPreset,
    perfiles: PERFILES,
    requisitos: [CEDULA_EMPLEADO, ESTUDIO, CEDULA_INDEPENDIENTE],
  }
}

let contenedor: HTMLDivElement
let raiz: Root

async function montar() {
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
  await act(async () => {
    raiz.render(<RequisitosClient />)
  })
}

function porTestId(id: string) {
  return contenedor.querySelector(`[data-testid="${id}"]`)
}

async function clic(el: Element | null) {
  await act(async () => {
    el?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  h.canAccess.mockReturnValue(true)
  h.api.requisitos.mockResolvedValue(respuesta())
})

afterEach(() => {
  act(() => raiz?.unmount())
  contenedor?.remove()
})

describe('Requisitos por tipo de inquilino', () => {
  it('P2 — en «Todos» la lista va agrupada por perfil, no plana', async () => {
    await montar()
    const empleado = porTestId('grupo-EMPLEADO')
    const independiente = porTestId('grupo-INDEPENDIENTE')
    expect(empleado).not.toBeNull()
    expect(independiente).not.toBeNull()
    // Cada «Cédula» vive bajo su perfil, no una detrás de la otra sin contexto.
    expect(empleado!.textContent).toContain('Cédula por las dos caras')
    expect(independiente!.textContent).toContain('Cédula por las dos caras')
    expect(empleado!.textContent).toContain('Empleado')
  })

  it('P5 — dice qué tiene que HACER el candidato, nunca «hace algo»', async () => {
    await montar()
    expect(contenedor.textContent).not.toContain('Hace algo')
    expect(porTestId('requisito-r-2')!.textContent).toContain('Hace un trámite')
    expect(porTestId('requisito-r-1')!.textContent).toContain('Sube un archivo')
  })

  it('P3 — el estudio no lleva interruptor ni botón de quitar', async () => {
    await montar()
    expect(porTestId('estudio-candado-r-2')).not.toBeNull()
    expect(porTestId('alternar-r-2')).toBeNull()
    expect(porTestId('borrar-r-2')).toBeNull()
    // Pero los demás sí.
    expect(porTestId('alternar-r-1')).not.toBeNull()
    expect(porTestId('borrar-r-1')).not.toBeNull()
  })

  it('P4 — mientras es el preset no se edita: primero se guarda como propia', async () => {
    h.api.requisitos.mockResolvedValue(respuesta(true))
    await montar()
    expect(porTestId('aviso-preset')).not.toBeNull()
    expect(porTestId('sembrar-preset')).not.toBeNull()
    expect(porTestId('abrir-agregar')).toBeNull()
    expect(porTestId('alternar-r-1')).toBeNull()
    expect(porTestId('borrar-r-1')).toBeNull()
  })

  it('P1 — se puede agregar un requisito propio, con su perfil', async () => {
    h.api.crearRequisito.mockResolvedValue({})
    await montar()
    await clic(porTestId('abrir-agregar'))
    const etiqueta = porTestId('req-etiqueta') as HTMLInputElement
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )!.set!
      setter.call(etiqueta, 'Certificado de contador')
      etiqueta.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => {
      porTestId('form-requisito')!.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      )
    })
    expect(h.api.crearRequisito).toHaveBeenCalledWith(
      expect.objectContaining({
        perfil: 'EMPLEADO',
        etiqueta: 'Certificado de contador',
        obligatorio: true,
      }),
    )
  })

  it('P1b — y quitar el que no se pide', async () => {
    h.api.borrarRequisito.mockResolvedValue(undefined)
    await montar()
    await clic(porTestId('borrar-r-1'))
    await clic(porTestId('confirmar-borrado-si'))
    expect(h.api.borrarRequisito).toHaveBeenCalledWith('r-1')
  })

  it('P6 — quitar PREGUNTA antes, y sin el diálogo del navegador', async () => {
    await montar()
    await clic(porTestId('borrar-r-1'))
    const dialogo = porTestId('confirmar-borrado')
    expect(dialogo).not.toBeNull()
    expect(dialogo!.getAttribute('role')).toBe('alertdialog')
    expect(dialogo!.textContent).toContain('Cédula por las dos caras')
    // Preguntar y nada más: sin confirmar, no se borró.
    expect(h.api.borrarRequisito).not.toHaveBeenCalled()
  })

  it('P7 — sin permiso de configuracion:edit no hay botones de escribir', async () => {
    h.canAccess.mockImplementation((_m: string, a: string) => a !== 'edit')
    await montar()
    expect(porTestId('abrir-agregar')).toBeNull()
    expect(porTestId('alternar-r-1')).toBeNull()
    expect(porTestId('borrar-r-1')).toBeNull()
  })

  it('el 503 se muestra CON su motivo, no como un error que se reintenta', async () => {
    const { ApiError } = await import('@/lib/api/client')
    h.api.requisitos.mockRejectedValue(
      new ApiError(503, 'Falta aplicar la migración de postulaciones.'),
    )
    await montar()
    const aviso = porTestId('requisitos-no-habilitados')
    expect(aviso).not.toBeNull()
    expect(aviso!.textContent).toContain('Falta aplicar la migración')
  })
})

describe('los cambios del 18-09 de noche', () => {
  it('🔴 las pestañas de perfil van PEGADAS a la tarjeta, no flotando', async () => {
    await montar()
    const tabs = porTestId('filtro-perfiles')!
    expect(tabs.getAttribute('role')).toBe('tablist')
    // Pegadas = dentro de la tarjeta y separadas por su borde inferior.
    expect(tabs.className).toContain('border-b')
    expect(porTestId('perfil-todos')!.getAttribute('aria-selected')).toBe('true')
    expect(porTestId('perfil-EMPLEADO')!.getAttribute('aria-selected')).toBe('false')
  })

  it('🔴 Obligatorio/Opcional es un control con las dos opciones a la vista', async () => {
    // Antes era una etiqueta muerta y un botón que decía «Volver opcional»:
    // había que adivinar el estado actual y en qué se convertía.
    await montar()
    expect(porTestId('poner-obligatorio-r-1')!.getAttribute('aria-pressed')).toBe('true')
    expect(porTestId('poner-opcional-r-1')!.getAttribute('aria-pressed')).toBe('false')
  })

  it('tocar la opción que ya está NO llama al back', async () => {
    await montar()
    await clic(porTestId('poner-obligatorio-r-1'))
    expect(h.api.editarRequisito).not.toHaveBeenCalled()
    await clic(porTestId('poner-opcional-r-1'))
    expect(h.api.editarRequisito).toHaveBeenCalledWith('r-1', { obligatorio: false })
  })

  it('el estudio sigue sin control: etiqueta fija y su porqué', async () => {
    await montar()
    expect(porTestId('poner-opcional-r-2')).toBeNull()
    expect(porTestId('estudio-candado-r-2')).not.toBeNull()
  })
})
