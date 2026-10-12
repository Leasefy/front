/**
 * Sistema de errores, tanda 2 (02-10-2026) — la modalidad del mandato y el
 * retiro de la administración.
 *
 * Lo que fija:
 *   · el espejo del DTO del back (`mandato.dto.ts`) se ataja antes de mandar,
 *     debajo de su campo y con el foco ahí: el porcentaje del reparto (0,01 a
 *     99,99, dos decimales) y el motivo del retiro (≤ 500);
 *   · un 400 con `campos` va debajo de su campo; un 4xx del cálculo del corte
 *     es un error de la FECHA;
 *   · lo que no es de un campo (un 5xx, la red) es un aviso de bloque con la
 *     regla de oro: «de nuestro lado» con la referencia, o la conexión.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// 10-10-2026: las fechas son campos de Cadence (se eligen, no se escriben); en la
// prueba, un <input> con el mismo id y data-testid (`campos-de-fecha.doble-de-prueba`).
vi.mock('@/components/contabilidad/CampoDeDia', () => import('@/components/ui/campos-de-fecha.doble-de-prueba'))
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const h = vi.hoisted(() => ({
  delMandato: vi.fn(),
  guardarMandato: vi.fn(),
  estadoDelRetiro: vi.fn(),
  previsualizarRetiro: vi.fn(),
  registrarRetiro: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

vi.mock('@/lib/api/mandato.service', () => ({
  mandatoApi: {
    delMandato: (...a: unknown[]) => h.delMandato(...a),
    guardarMandato: (...a: unknown[]) => h.guardarMandato(...a),
    estadoDelRetiro: (...a: unknown[]) => h.estadoDelRetiro(...a),
    previsualizarRetiro: (...a: unknown[]) => h.previsualizarRetiro(...a),
    registrarRetiro: (...a: unknown[]) => h.registrarRetiro(...a),
  },
}))
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: () => true, isLoading: false }),
}))
vi.mock('@/components/ui/toast', () => ({ toast: h.toast }))
vi.mock('@/components/providers/SmoothScroll', () => ({
  useLenis: () => ({ stop: vi.fn(), start: vi.fn() }),
}))

import { ApiError } from '@/lib/api/client'
import { ModalidadDelMandato } from './ModalidadDelMandato'
import { RetiroDeLaAdministracionDialog } from './RetiroDeLaAdministracion'
import { MENSAJES_DEL_MANDATO } from '@/lib/mandato/limites-de-la-modalidad-y-el-retiro'

function errorDelBack(status: number, cuerpo: Record<string, unknown>) {
  return new ApiError(status, cuerpo.message as string | string[], cuerpo.code as string, cuerpo)
}

const MANDATO = {
  disponible: true,
  motivo: null,
  consignacionId: 'cons-1',
  modalidad: null,
  destinoDeLosIntereses: null,
  interesesAlPropietarioPct: null,
  modalidadDesde: null,
  efectivo: {
    modalidad: { modalidad: null, fuente: null, desde: null },
    intereses: { destino: 'INMOBILIARIA', porcentajeAlPropietario: 0, fuente: 'HOY', desde: null },
  },
  inmobiliaria: { modalidadDeMandato: null },
}

const ESTADO_DEL_RETIRO = {
  disponible: true,
  motivo: null,
  consignacionId: 'cons-1',
  terminada: false,
  contratoVigente: { id: 'c-1', code: 14, tenantName: 'Ana', startDate: '2026-01-01', endDate: '2027-01-01' },
  retiro: null,
}

let contenedor: HTMLDivElement
let raiz: Root

beforeEach(() => {
  vi.clearAllMocks()
  h.delMandato.mockResolvedValue(MANDATO)
  h.estadoDelRetiro.mockResolvedValue(ESTADO_DEL_RETIRO)
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
})

afterEach(() => {
  act(() => raiz.unmount())
  contenedor.remove()
})

const $ = <T extends Element = HTMLElement>(sel: string) => document.body.querySelector<T>(sel)

function escribir(el: HTMLInputElement | HTMLTextAreaElement, valor: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  act(() => {
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, valor)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function clic(el: Element | null) {
  await act(async () => {
    el?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await Promise.resolve()
  })
}

// ── Modalidad ───────────────────────────────────────────────────────────────

async function abrirLaModalidadEnReparto() {
  await act(async () => {
    raiz.render(<ModalidadDelMandato consignacionId="cons-1" esVenta={false} terminada={false} />)
  })
  const cambiar = [...contenedor.querySelectorAll('button')].find((b) => b.textContent === 'Cambiar')
  await clic(cambiar ?? null)
  const destino = $<HTMLSelectElement>('[data-testid="destino-de-los-intereses"]')!
  await act(async () => {
    destino.value = 'REPARTO'
    destino.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

describe('<ModalidadDelMandato> — el porcentaje del reparto', () => {
  it('🔴 150 no viaja: el error va debajo del porcentaje, con el foco', async () => {
    await abrirLaModalidadEnReparto()
    const pct = $<HTMLInputElement>('[data-testid="pct-propietario"]')!
    escribir(pct, '150')
    await clic($('[data-testid="guardar-modalidad"]'))

    expect(h.guardarMandato).not.toHaveBeenCalled()
    expect($('#pct-propietario-error')?.textContent).toBe(MENSAJES_DEL_MANDATO.porcentajeFueraDeRango)
    expect(pct.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(pct)
    // No es un aviso de bloque.
    expect($('[data-testid="modalidad-error"]')).toBeNull()
  })

  it('tres decimales tampoco: el back pide `maxDecimalPlaces: 2`', async () => {
    await abrirLaModalidadEnReparto()
    escribir($<HTMLInputElement>('[data-testid="pct-propietario"]')!, '33,333')
    await clic($('[data-testid="guardar-modalidad"]'))
    expect(h.guardarMandato).not.toHaveBeenCalled()
    expect($('#pct-propietario-error')?.textContent).toBe(MENSAJES_DEL_MANDATO.porcentajeConDecimales)
  })

  it('🔴 un 400 en `interesesAlPropietarioPct` va debajo del porcentaje', async () => {
    h.guardarMandato.mockRejectedValue(
      errorDelBack(400, {
        code: 'DATOS_INVALIDOS',
        message: ['El porcentaje al propietario no puede ser mayor que 99,99.'],
        campos: [
          {
            campo: 'interesesAlPropietarioPct',
            regla: 'maximo',
            mensaje: 'El porcentaje al propietario no puede ser mayor que 99,99.',
          },
        ],
      }),
    )
    await abrirLaModalidadEnReparto()
    escribir($<HTMLInputElement>('[data-testid="pct-propietario"]')!, '50')
    await clic($('[data-testid="guardar-modalidad"]'))

    expect($('#pct-propietario-error')?.textContent).toBe('El porcentaje al propietario no puede ser mayor que 99,99.')
    expect(document.activeElement).toBe($('[data-testid="pct-propietario"]'))
    expect($('[data-testid="modalidad-error"]')).toBeNull()
  })

  it('un 5xx es un aviso de bloque con la referencia; sin respuesta, la conexión', async () => {
    h.guardarMandato.mockRejectedValueOnce(
      errorDelBack(500, { code: 'ERROR_INTERNO', message: 'Error interno del servidor.', referencia: 'aa11bb22' }),
    )
    await abrirLaModalidadEnReparto()
    escribir($<HTMLInputElement>('[data-testid="pct-propietario"]')!, '50')
    await clic($('[data-testid="guardar-modalidad"]'))
    const aviso = $('[data-testid="modalidad-error"]')!.textContent ?? ''
    expect(aviso).toMatch(/de nuestro lado/)
    expect(aviso).toContain('aa11bb22')
    expect(aviso).not.toMatch(/conexi[oó]n/)

    h.guardarMandato.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await clic($('[data-testid="guardar-modalidad"]'))
    expect($('[data-testid="modalidad-error"]')!.textContent).toMatch(/conexión/)
  })
})

// ── Retiro ──────────────────────────────────────────────────────────────────

async function abrirElRetiro() {
  await act(async () => {
    raiz.render(
      <RetiroDeLaAdministracionDialog
        consignacionId="cons-1"
        titulo="Apto 301"
        abierto
        onCerrar={() => {}}
        onRetirado={() => {}}
      />,
    )
  })
  await act(async () => {
    await Promise.resolve()
  })
}

describe('<RetiroDeLaAdministracionDialog> — la fecha y el motivo', () => {
  it('🔴 un motivo de más de 500 no viaja: el error va debajo del motivo', async () => {
    await abrirElRetiro()
    await clic($('[data-testid="retiro-hasta-fin"]'))
    const motivo = $<HTMLTextAreaElement>('#motivo-del-retiro')!
    escribir(motivo, 'x'.repeat(501))
    await clic($('[data-testid="confirmar-retiro"]'))

    expect(h.registrarRetiro).not.toHaveBeenCalled()
    expect($('#motivo-del-retiro-error')?.textContent).toBe(MENSAJES_DEL_MANDATO.motivoLargo)
    expect(document.activeElement).toBe(motivo)
  })

  it('🔴 un 400 en `motivo` va debajo del motivo, no al aviso del diálogo', async () => {
    h.registrarRetiro.mockRejectedValue(
      errorDelBack(400, {
        code: 'DATOS_INVALIDOS',
        message: ['El motivo puede tener hasta 500 caracteres.'],
        campos: [{ campo: 'motivo', regla: 'longitud_maxima', mensaje: 'El motivo puede tener hasta 500 caracteres.' }],
      }),
    )
    await abrirElRetiro()
    await clic($('[data-testid="retiro-hasta-fin"]'))
    escribir($<HTMLTextAreaElement>('#motivo-del-retiro')!, 'El propietario vendió.')
    await clic($('[data-testid="confirmar-retiro"]'))

    expect($('#motivo-del-retiro-error')?.textContent).toBe('El motivo puede tener hasta 500 caracteres.')
    expect(document.activeElement).toBe($('#motivo-del-retiro'))
    expect($('[data-testid="retiro-error"]')).toBeNull()
  })

  it('🔴 si el back dice que la fecha de corte no sirve (4xx), el error va debajo de la FECHA', async () => {
    h.previsualizarRetiro.mockRejectedValue(
      errorDelBack(400, { code: 'FECHA_DE_CORTE_INVALIDA', message: 'La fecha de corte no puede ser anterior al inicio del contrato.' }),
    )
    await abrirElRetiro()
    await clic($('[data-testid="retiro-corte"]'))
    await act(async () => {
      await Promise.resolve()
    })

    expect($('#fecha-de-corte-error')?.textContent).toBe('La fecha de corte no puede ser anterior al inicio del contrato.')
    expect($('[data-testid="fecha-de-corte"]')?.getAttribute('aria-invalid')).toBe('true')
    expect($('[data-testid="retiro-error-de-previa"]')).toBeNull()
  })

  it('si el cálculo del corte cae por la red, es un aviso de bloque y la fecha NO se marca', async () => {
    h.previsualizarRetiro.mockRejectedValue(new TypeError('Failed to fetch'))
    await abrirElRetiro()
    await clic($('[data-testid="retiro-corte"]'))
    await act(async () => {
      await Promise.resolve()
    })

    expect($('[data-testid="retiro-error-de-previa"]')?.textContent).toMatch(/conexión/)
    expect($('[data-testid="fecha-de-corte"]')?.getAttribute('aria-invalid')).toBeNull()
  })

  it('un 5xx al confirmar dice «de nuestro lado» con la referencia', async () => {
    h.registrarRetiro.mockRejectedValue(
      errorDelBack(500, { code: 'ERROR_INTERNO', message: 'Error interno del servidor.', referencia: 'c0ffee00' }),
    )
    await abrirElRetiro()
    await clic($('[data-testid="retiro-hasta-fin"]'))
    await clic($('[data-testid="confirmar-retiro"]'))

    const aviso = $('[data-testid="retiro-error"]')!.textContent ?? ''
    expect(aviso).toMatch(/de nuestro lado/)
    expect(aviso).toContain('c0ffee00')
    expect(aviso).not.toMatch(/conexi[oó]n/)
  })
})
