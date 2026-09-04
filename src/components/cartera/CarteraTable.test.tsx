/**
 * La tabla de cartera. Nico (2026-09-02): «esto sabés que debe tener una tabla
 * como las que ya usamos, y hasta para los empty state, y cuando tenga datos
 * que tenga paginación».
 *
 * Lo que se protege acá:
 *  - las columnas muestran los datos que el back SÍ manda (incluidos los dos
 *    que la tabla vieja escondía: el vencimiento y el abono parcial);
 *  - los encabezados ordenan de verdad, y el orden por defecto es lo más
 *    vencido arriba;
 *  - un dato ausente se DICE. Ni un «0» que se lee como dato faltante ni un
 *    «—» que se lee como «vacío a propósito».
 */
import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { CarteraItem } from '@/lib/types/inmobiliaria'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    formatCurrency: (n: number) => `$${n.toLocaleString('es-CO')}`,
    formatDate: (d: string) => d,
  }),
}))
vi.mock('next/link', () => ({
  default: ({ children, href, ...r }: { children?: React.ReactNode; href: string }) =>
    React.createElement('a', { href, ...r }, children),
}))

import { CarteraTable, ordenarCartera } from './CarteraTable'

function deuda(p: Partial<CarteraItem> = {}): CarteraItem {
  return {
    cobroId: 'c1',
    consignacionId: 'cons1',
    propertyTitle: 'Apartamento 302',
    propertyAddress: 'Carrera 30a #25A-20',
    tenantName: 'Esteban López Quintero',
    tenantPhone: '3010082450',
    propietarioId: 'p1',
    propietarioName: 'Marta Cifuentes',
    agenteId: null,
    agenteName: null,
    month: '2026-08',
    dueDate: '2026-08-05',
    totalAmount: 3_750_000,
    paidAmount: 0,
    pendingAmount: 3_750_000,
    daysLate: 12,
    status: 'PENDING',
    remindersSent: 2,
    lastReminderDate: '2026-08-20',
    ...p,
  }
}

// Los tests de helpers no montan nada: el desmontaje tiene que tolerarlo.
let container: HTMLDivElement | undefined
let root: Root | undefined
afterEach(() => {
  const r = root
  if (r) act(() => r.unmount())
  container?.remove()
  root = undefined
  container = undefined
})

function montar(items: CarteraItem[]) {
  const c = document.createElement('div')
  document.body.appendChild(c)
  const r = createRoot(c)
  container = c
  root = r
  const onVerCobro = vi.fn()
  act(() => {
    r.render(<CarteraTable items={items} onVerCobro={onVerCobro} />)
  })
  return { onVerCobro }
}

const filas = () => Array.from(container!.querySelectorAll<HTMLElement>('[data-testid="cartera-fila"]'))

describe('ordenarCartera', () => {
  const vieja = deuda({ cobroId: 'vieja', daysLate: 95, pendingAmount: 100_000, dueDate: '2026-05-05', tenantName: 'Zoe' })
  const nueva = deuda({ cobroId: 'nueva', daysLate: 3, pendingAmount: 900_000, dueDate: '2026-08-05', tenantName: 'Ana' })

  it('ordena por mora, por monto, por vencimiento y por nombre', () => {
    const lista = [nueva, vieja]
    expect(ordenarCartera(lista, 'mora', 'desc').map((i) => i.cobroId)).toEqual(['vieja', 'nueva'])
    expect(ordenarCartera(lista, 'debe', 'desc').map((i) => i.cobroId)).toEqual(['nueva', 'vieja'])
    expect(ordenarCartera(lista, 'mes', 'asc').map((i) => i.cobroId)).toEqual(['vieja', 'nueva'])
    expect(ordenarCartera(lista, 'inquilino', 'asc').map((i) => i.cobroId)).toEqual(['nueva', 'vieja'])
  })

  it('no muta la lista que recibe', () => {
    const lista = [nueva, vieja]
    ordenarCartera(lista, 'mora', 'desc')
    expect(lista.map((i) => i.cobroId)).toEqual(['nueva', 'vieja'])
  })

  it('una deuda sin inquilino no rompe el orden por nombre', () => {
    const anonima = deuda({ cobroId: 'anon', tenantName: null })
    const ordenada = ordenarCartera([nueva, anonima], 'inquilino', 'asc')
    expect(ordenada.map((i) => i.cobroId)).toEqual(['anon', 'nueva'])
  })
})

describe('<CarteraTable>', () => {
  it('una fila por cobro, con los datos que el back manda en las columnas', () => {
    montar([deuda({ paidAmount: 250_000, pendingAmount: 3_500_000 })])
    expect(filas()).toHaveLength(1)
    const texto = filas()[0].textContent ?? ''

    expect(texto).toContain('Esteban López Quintero')
    expect(texto).toContain('3010082450')
    expect(texto).toContain('Carrera 30a #25A-20')
    expect(texto).toContain('Marta Cifuentes')
    expect(texto).toContain('2026-08')
    // El vencimiento y el abono parcial: dos datos que la tabla vieja tenía y
    // no pintaba.
    expect(texto).toContain('cartera.tabla.vence:2026-08-05')
    expect(texto).toContain('cartera.tabla.abonado:$250.000')
    expect(texto).toContain('$3.500.000')
    expect(texto).toContain('cartera.tabla.diasDeMora:12')
    expect(texto).toContain('cartera.tabla.recordatorios:2')

    // Y el enlace al cobro, con el id de ESTA fila.
    const link = filas()[0].querySelector('a[href^="/panel/inmobiliaria/cobros"]')
    expect(link?.getAttribute('href')).toBe('/panel/inmobiliaria/cobros?cobro=c1')
  })

  it('sin abono no inventa una línea de abono en $0', () => {
    montar([deuda({ paidAmount: 0 })])
    expect(filas()[0].textContent).not.toContain('cartera.tabla.abonado')
  })

  it('lo que aún no vence se dice «al día», no «0 días»', () => {
    montar([deuda({ daysLate: 0 })])
    const texto = filas()[0].textContent ?? ''
    expect(texto).toContain('cartera.tabla.alDia')
    expect(texto).not.toContain('cartera.tabla.diasDeMora')
  })

  it('un día de mora se dice en singular', () => {
    montar([deuda({ daysLate: 1, remindersSent: 1 })])
    const texto = filas()[0].textContent ?? ''
    expect(texto).toContain('cartera.tabla.unDiaDeMora')
    expect(texto).toContain('cartera.tabla.unRecordatorio')
  })

  it('ordena por mora descendente sin que nadie toque nada', () => {
    montar([
      deuda({ cobroId: 'temprana', daysLate: 5 }),
      deuda({ cobroId: 'juridica', daysLate: 120 }),
      deuda({ cobroId: 'media', daysLate: 45 }),
    ])
    expect(filas().map((f) => f.dataset.cobroId)).toEqual(['juridica', 'media', 'temprana'])
  })

  it('el encabezado ordena, y volver a tocarlo invierte', () => {
    montar([
      deuda({ cobroId: 'chica', pendingAmount: 100_000 }),
      deuda({ cobroId: 'grande', pendingAmount: 9_000_000 }),
    ])
    act(() => container!.querySelector<HTMLButtonElement>('[data-testid="ordenar-debe"]')!.click())
    expect(filas().map((f) => f.dataset.cobroId)).toEqual(['grande', 'chica'])

    act(() => container!.querySelector<HTMLButtonElement>('[data-testid="ordenar-debe"]')!.click())
    expect(filas().map((f) => f.dataset.cobroId)).toEqual(['chica', 'grande'])
  })

  it('sin deudas se monta la tabla vacía, sin filas ni fila fantasma', () => {
    montar([])
    expect(container!.querySelector('[data-testid="cartera-tabla"]')).not.toBeNull()
    expect(filas()).toHaveLength(0)
    // El encabezado sigue: el vacío de verdad lo pone la pantalla, no una
    // tabla que desaparece.
    expect(container!.textContent).toContain('cartera.tabla.inquilino')
  })

  it('la fila abre el cobro', () => {
    const { onVerCobro } = montar([deuda()])
    act(() => filas()[0].click())
    expect(onVerCobro).toHaveBeenCalledTimes(1)
    expect(onVerCobro.mock.calls[0][0].cobroId).toBe('c1')
  })

  describe('un dato que el back no manda se dice, no se disimula', () => {
    it('sin inquilino: no es «Sin nombre», es un cobro que nadie puede reclamar', () => {
      montar([deuda({ tenantName: null })])
      expect(filas()[0].textContent).toContain('cartera.tabla.sinInquilino')
    })

    it('sin teléfono: lo dice y no deja un enlace de WhatsApp roto', () => {
      montar([deuda({ tenantPhone: null })])
      const fila = filas()[0]
      expect(fila.textContent).toContain('cartera.tabla.sinTelefono')
      expect(fila.querySelector('a[href^="tel:"]')).toBeNull()
      expect(fila.querySelector('a[href^="https://wa.me"]')).toBeNull()
    })

    it('sin propietario: «Sin consignar», no una celda en blanco', () => {
      montar([deuda({ propietarioName: null })])
      expect(filas()[0].textContent).toContain('cartera.tabla.sinPropietario')
    })

    it('sin dirección ni título del inmueble lo dice en vez de dejar el hueco', () => {
      montar([deuda({ propertyAddress: null, propertyTitle: '' })])
      expect(filas()[0].textContent).toContain('cartera.tabla.sinDireccion')
    })

    it('cero recordatorios se escribe con palabras: un «0» se lee como dato faltante', () => {
      montar([deuda({ remindersSent: 0 })])
      const texto = filas()[0].textContent ?? ''
      expect(texto).toContain('cartera.tabla.sinRecordatorios')
      expect(texto).not.toContain('cartera.tabla.recordatorios:0')
    })
  })
})
