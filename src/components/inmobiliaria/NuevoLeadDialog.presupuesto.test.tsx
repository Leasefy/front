/**
 * 02-10-2026 · «Presupuesto al mes (opcional)» en Nuevo lead (Nico).
 *
 * Lo que fija este test:
 *   · con el CRM habilitado el diálogo lo pide, y llega a `presupuestoCop` de
 *     `POST /inmobiliaria/leads` (el matching ya lo usa);
 *   · vacío no se manda (no lo dijo);
 *   · más de $2.000.000.000 se dice bajo el campo con la MISMA frase del back,
 *     y no se manda nada;
 *   · el rechazo del servidor (`campos` en `presupuestoCop`) va bajo el campo;
 *   · con el CRM sin habilitar no aparece: el camino viejo no lo guarda.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import * as React from 'react'

import { ApiError } from '@/lib/api/client'
import { MENSAJES_DEL_LEAD } from '@/lib/pipeline/limites-del-lead'
import type { Consignacion } from '@/lib/types/inmobiliaria'

const { crm, pipeline } = vi.hoisted(() => ({
  crm: {
    configuracion: (() => Promise.resolve(null)) as () => Promise<unknown>,
    entra: vi.fn(async (_cuerpo: Record<string, unknown>) => ({
      pipelineItemId: 'p-1',
      contactoId: 'c-1',
      origen: 'FINCARAIZ',
      asignadoA: null as string | null,
      porQueSeAsigno: 'TURNO' as const,
      contactoUnido: false,
      seReconocioPor: null,
    })),
  },
  pipeline: { create: vi.fn(async (_cuerpo: Record<string, unknown>) => ({ id: 'p-1' })) },
}))

// PL-07 (04-10-2026): el inmueble se escoge con el Combobox (buscador): cada opción es un botón.
vi.mock('@/components/ui/combobox', () => ({
  Combobox: ({ options, onChange }: { options: { value: string; label: string }[]; onChange: (v?: string) => void }) => (
    <div>
      {options.map((o) => (
        <button key={o.value} type="button" data-testid={`opcion-${o.value}`} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  ),
}));
vi.mock('@/lib/api/crm.service', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/crm.service')>('@/lib/api/crm.service')
  return { ...real, leadsApi: { configuracion: () => crm.configuracion(), entra: crm.entra } }
})
vi.mock('@/lib/api/inmobiliaria.service', () => ({ pipelineApi: { create: pipeline.create } }))
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('@/components/ui/dialog', () => {
  const Pasa = ({ children, ...rest }: React.ComponentProps<'div'>) => <div {...rest}>{children}</div>
  return {
    Dialog: ({ open, children }: { open: boolean; children?: React.ReactNode }) => (open ? <div>{children}</div> : null),
    DialogContent: Pasa,
    DialogHeader: Pasa,
    DialogFooter: Pasa,
    DialogTitle: Pasa,
    DialogDescription: Pasa,
  }
})
// El Select de Radix no se abre en happy-dom: cada opción es un botón.
vi.mock('@/components/ui/select', async () => {
  const R = await import('react')
  const Elegir = R.createContext<(v: string) => void>(() => {})
  return {
    Select: ({ children, onValueChange }: { children?: React.ReactNode; onValueChange: (v: string) => void }) => (
      <Elegir.Provider value={onValueChange}>{children}</Elegir.Provider>
    ),
    SelectTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    SelectContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    SelectItem: function Opcion({ value, children }: { value: string; children?: React.ReactNode }) {
      const elegir = R.useContext(Elegir)
      return (
        <button type="button" data-testid={`opcion-${value}`} onClick={() => elegir(value)}>
          {children}
        </button>
      )
    },
  }
})

import { NuevoLeadDialog } from './NuevoLeadDialog'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const CONFIG = {
  disponible: true,
  motivo: null,
  horasParaResponderLead: 24,
  origenesDeLead: ['FINCARAIZ', 'WHATSAPP'],
  minimoDeFotosParaPublicar: null,
  margenDeBajaDePrecioPct: null,
  horasDeAvisoAlInquilino: null,
  diasParaFirmarElContrato: null,
  pesosDelMatching: null,
}
const INMUEBLES = [{ id: 'cons-1', propertyTitle: 'Apto 402' } as unknown as Consignacion]

let root: Root
let contenedor: HTMLDivElement

beforeEach(() => {
  crm.configuracion = vi.fn(() => Promise.resolve(CONFIG))
  crm.entra.mockClear()
  pipeline.create.mockClear()
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(async () => {
  await act(async () => root.unmount())
  contenedor.remove()
})

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => contenedor.querySelector(sel) as T | null

async function pintar() {
  await act(async () => {
    root.render(<NuevoLeadDialog abierto consignaciones={INMUEBLES} onCerrar={() => {}} onCreado={() => {}} />)
  })
}

async function escribir(sel: string, valor: string) {
  const el = $<HTMLInputElement>(sel)!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, valor)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function clic(sel: string) {
  await act(async () => {
    $(sel)!.click()
  })
}

/** Inmueble, origen, nombre y teléfono: lo mínimo con el CRM habilitado. */
async function llenarLoMinimo() {
  await clic('[data-testid="opcion-cons-1"]')
  await clic('[data-testid="opcion-FINCARAIZ"]')
  await escribir('#nuevo-lead-nombre', 'Ana Restrepo')
  await escribir('#nuevo-lead-telefono', '3001234567')
}

const guardar = () => $<HTMLButtonElement>('[data-testid="nuevo-lead-guardar"]')!

describe('NuevoLeadDialog — el presupuesto al mes (Nico, 02-10-2026)', () => {
  it('🔴 lo pide y lo manda como `presupuestoCop`, en pesos enteros', async () => {
    await pintar()
    expect(contenedor.textContent).toContain('Presupuesto al mes')
    await llenarLoMinimo()
    // Lo que no es dígito no entra (puntos, signo, espacios).
    await escribir('#nuevo-lead-presupuesto', '$ 2.500.000')
    // PL-09 (04-10-2026): se ve con formato de la casa; viaja en pesos enteros.
    expect($<HTMLInputElement>('#nuevo-lead-presupuesto')!.value).toBe('$ 2.500.000')
    await act(async () => guardar().click())
    expect(crm.entra).toHaveBeenCalledWith(expect.objectContaining({ presupuestoCop: 2_500_000 }))
  })

  it('vacío no se manda: no lo dijo', async () => {
    await pintar()
    await llenarLoMinimo()
    await act(async () => guardar().click())
    expect(crm.entra).toHaveBeenCalledTimes(1)
    expect(crm.entra.mock.calls[0][0]).not.toHaveProperty('presupuestoCop')
  })

  it('🔴 más de $2.000.000.000 se dice bajo el campo con la frase del back, y no se manda', async () => {
    await pintar()
    await llenarLoMinimo()
    await escribir('#nuevo-lead-presupuesto', '25000000000')
    expect($('#nuevo-lead-presupuesto-error')?.textContent).toBe(MENSAJES_DEL_LEAD.presupuestoMaximo)
    expect($('#nuevo-lead-presupuesto')!.getAttribute('aria-invalid')).toBe('true')
    expect(guardar().disabled).toBe(true)
    // El tope exacto sí pasa.
    await escribir('#nuevo-lead-presupuesto', '2000000000')
    expect($('#nuevo-lead-presupuesto-error')?.textContent ?? '').toBe('')
    expect(guardar().disabled).toBe(false)
  })

  it('🔴 el rechazo del servidor en `presupuestoCop` va bajo el campo, con el foco', async () => {
    const frase = MENSAJES_DEL_LEAD.presupuestoMaximo
    crm.entra.mockRejectedValueOnce(
      new ApiError(400, [frase], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [frase],
        campos: [{ campo: 'presupuestoCop', regla: 'maximo', mensaje: frase }],
      }),
    )
    await pintar()
    await llenarLoMinimo()
    await escribir('#nuevo-lead-presupuesto', '1500000')
    await act(async () => guardar().click())
    expect($('#nuevo-lead-presupuesto-error')?.textContent).toBe(frase)
    expect(document.activeElement).toBe($('#nuevo-lead-presupuesto'))
    expect($('[data-testid="nuevo-lead-error"]')).toBeNull()
    // Al corregir, el rechazo viejo se va.
    await escribir('#nuevo-lead-presupuesto', '1400000')
    expect($('#nuevo-lead-presupuesto-error')?.textContent ?? '').toBe('')
  })

  it('con el CRM sin habilitar no aparece: el camino viejo no tiene dónde guardarlo', async () => {
    crm.configuracion = vi.fn(() => Promise.reject(new ApiError(503, ['falta aplicar la migración 20260918160000'])))
    await pintar()
    expect($('#nuevo-lead-presupuesto')).toBeNull()
    await clic('[data-testid="opcion-cons-1"]')
    await escribir('#nuevo-lead-nombre', 'Ana Restrepo')
    await act(async () => guardar().click())
    expect(pipeline.create).toHaveBeenCalledWith({ consignacionId: 'cons-1', candidateName: 'Ana Restrepo' })
  })
})
