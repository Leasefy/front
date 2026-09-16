/**
 * La tabla de cartera. Nico (2026-09-02): «esto sabes que debe tener una tabla
 * como las que ya usamos, y hasta para los empty state, y cuando tenga datos
 * que tenga paginación».
 *
 * Lo que se protege acá:
 *  - las columnas muestran los datos que el back SÍ manda (incluidos los dos
 *    que la tabla vieja escondía: el vencimiento y el abono parcial);
 *  - los encabezados ordenan de verdad, y el orden por defecto es lo más
 *    GRAVE arriba — que ya no es «lo más vencido»: una cuota vencida dentro
 *    del plazo del contrato no es cartera y no se persigue;
 *  - un dato ausente se DICE. Ni un «0» que se lee como dato faltante ni un
 *    «—» que se lee como «vacío a propósito». Y `remindersSent: null` («no hay
 *    cobro emitido») no se disfraza de «no le hemos escrito».
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
    cuotaId: 'q1',
    cobroId: 'c1',
    contractId: 'ct-1',
    contrato: '1686',
    contratoDeLeasefy: 'Leasefy #12',
    propertyId: 'inm-1',
    consignacionId: 'cons1',
    propertyTitle: 'Apartamento 302',
    propertyAddress: 'Carrera 30a #25A-20',
    tenantName: 'Esteban López Quintero',
    tenantPhone: '3010082450',
    tenantDocument: '1020',
    propietarioId: 'p1',
    propietarioName: 'Marta Cifuentes',
    agenteId: null,
    agenteName: null,
    month: '2026-08',
    vence: '2026-08-05',
    estado: 'PENDIENTE',
    cajon: 'CARTERA',
    diasDeMora: 12,
    diasDePlazo: 3,
    esVencida: true,
    totalAmount: 3_750_000,
    paidAmount: 0,
    pendingAmount: 3_750_000,
    remindersSent: 2,
    lastReminderDate: '2026-08-20',
    ...p,
  }
}

/** Los dos cajones que NO son cartera, para no repetir los tres campos. */
const porVencer = (p: Partial<CarteraItem> = {}) =>
  deuda({ cajon: 'POR_VENCER', esVencida: false, diasDeMora: 0, ...p })
const enPlazo = (p: Partial<CarteraItem> = {}) =>
  deuda({ cajon: 'VENCIDA_EN_PLAZO', esVencida: true, diasDeMora: 0, ...p })

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
  const vieja = deuda({ cuotaId: 'vieja', diasDeMora: 95, pendingAmount: 100_000, vence: '2026-05-05', tenantName: 'Zoe' })
  const nueva = deuda({ cuotaId: 'nueva', diasDeMora: 3, pendingAmount: 900_000, vence: '2026-08-05', tenantName: 'Ana' })

  it('ordena por estado, por monto, por vencimiento y por nombre', () => {
    const lista = [nueva, vieja]
    expect(ordenarCartera(lista, 'estado', 'desc').map((i) => i.cuotaId)).toEqual(['vieja', 'nueva'])
    expect(ordenarCartera(lista, 'debe', 'desc').map((i) => i.cuotaId)).toEqual(['nueva', 'vieja'])
    expect(ordenarCartera(lista, 'mes', 'asc').map((i) => i.cuotaId)).toEqual(['vieja', 'nueva'])
    expect(ordenarCartera(lista, 'inquilino', 'asc').map((i) => i.cuotaId)).toEqual(['nueva', 'vieja'])
  })

  it('🔴 el orden por estado separa los cajones: dos ceros de mora NO son lo mismo', () => {
    // Sin el cajón, una cuota futura y una vencida en plazo tienen las dos 0
    // días de mora y quedarían mezcladas — y la de arriba es la que se mira.
    const futura = porVencer({ cuotaId: 'futura' })
    const gracia = enPlazo({ cuotaId: 'gracia' })
    const mora = deuda({ cuotaId: 'mora', diasDeMora: 1 })
    expect(ordenarCartera([futura, mora, gracia], 'estado', 'desc').map((i) => i.cuotaId)).toEqual([
      'mora',
      'gracia',
      'futura',
    ])
  })

  it('no muta la lista que recibe', () => {
    const lista = [nueva, vieja]
    ordenarCartera(lista, 'estado', 'desc')
    expect(lista.map((i) => i.cuotaId)).toEqual(['nueva', 'vieja'])
  })

  it('una deuda sin inquilino no rompe el orden por nombre', () => {
    const anonima = deuda({ cuotaId: 'anon', tenantName: null })
    const ordenada = ordenarCartera([nueva, anonima], 'inquilino', 'asc')
    expect(ordenada.map((i) => i.cuotaId)).toEqual(['anon', 'nueva'])
  })
})

describe('<CarteraTable>', () => {
  it('una fila por cuota, con los datos que el back manda en las columnas', () => {
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
    const link = filas()[0].querySelector('a[href^="/panel/inmobiliaria/pagos/cartera/cobros"]')
    expect(link?.getAttribute('href')).toBe('/panel/inmobiliaria/pagos/cartera/cobros?cobro=c1')
  })

  it('🔴 sin cobro emitido el enlace va al CONTRATO, no a un cobro que no existe', () => {
    montar([deuda({ cobroId: null })])
    // Por `data-testid` y no por `a[href^="/panel"]`: desde el 2026-09-16 la
    // fila tiene DOS enlaces al panel —el nombre del inquilino abre su estado
    // de cuenta— y el primero del DOM ya no es el de la acción.
    const link = filas()[0].querySelector('[data-testid="cartera-abrir-deuda"]')
    expect(link?.getAttribute('href')).toBe('/panel/inmobiliaria/contratos/ct-1')
    expect(filas()[0].textContent).toContain('cartera.tabla.verContrato')
  })

  describe('🔴 la puerta al estado de cuenta (Nico, 2026-09-16)', () => {
    it('el nombre del inquilino abre SU estado de cuenta, con el regreso puesto', () => {
      montar([deuda()])
      const link = filas()[0].querySelector('[data-testid="cartera-estado-de-cuenta"]')
      expect(link?.getAttribute('href')).toBe(
        '/panel/inmobiliaria/estado-de-cuenta/inquilino/1020?volver=%2Fpanel%2Finmobiliaria%2Fpagos%2Fcartera',
      )
      expect(link?.textContent).toContain('Esteban López Quintero')
    })

    it('sin documento el nombre va en texto plano: no se ofrece una puerta que da 404', () => {
      montar([deuda({ tenantDocument: null })])
      expect(filas()[0].querySelector('[data-testid="cartera-estado-de-cuenta"]')).toBeNull()
      expect(filas()[0].textContent).toContain('Esteban López Quintero')
    })
  })

  it('sin abono no inventa una línea de abono en $0', () => {
    montar([deuda({ paidAmount: 0 })])
    expect(filas()[0].textContent).not.toContain('cartera.tabla.abonado')
  })

  it('🔴 lo que aún no vence se dice «por vencer»', () => {
    montar([porVencer()])
    const texto = filas()[0].textContent ?? ''
    expect(texto).toContain('cartera.tabla.porVencer')
    expect(texto).not.toContain('cartera.tabla.diasDeMora')
  })

  it('🔴 vencido dentro del plazo NO dice «al día» ni «0 días»: dice por qué', () => {
    // «Al día» sería mentira (venció) y «0 días de mora» se lee como un error
    // del sistema. Lo que pasa es que el plazo del contrato sigue corriendo.
    montar([enPlazo({ diasDePlazo: 5 })])
    const texto = filas()[0].textContent ?? ''
    expect(texto).toContain('cartera.tabla.vencidoEnPlazo')
    expect(texto).toContain('cartera.tabla.diasDePlazo:5')
    expect(texto).not.toContain('cartera.tabla.diasDeMora')
  })

  it('un contrato sin días de plazo no pinta «0 días de plazo»', () => {
    montar([enPlazo({ diasDePlazo: 0 })])
    expect(filas()[0].textContent).not.toContain('cartera.tabla.diasDePlazo')
  })

  it('un día de mora y un día de plazo se dicen en singular', () => {
    montar([deuda({ diasDeMora: 1, remindersSent: 1 })])
    let texto = filas()[0].textContent ?? ''
    expect(texto).toContain('cartera.tabla.unDiaDeMora')
    expect(texto).toContain('cartera.tabla.unRecordatorio')

    act(() => root!.unmount())
    container!.remove()
    montar([enPlazo({ diasDePlazo: 1 })])
    texto = filas()[0].textContent ?? ''
    expect(texto).toContain('cartera.tabla.unDiaDePlazo')
  })

  it('ordena por gravedad descendente sin que nadie toque nada', () => {
    montar([
      deuda({ cuotaId: 'temprana', diasDeMora: 5 }),
      deuda({ cuotaId: 'juridica', diasDeMora: 120 }),
      porVencer({ cuotaId: 'futura' }),
      deuda({ cuotaId: 'media', diasDeMora: 45 }),
    ])
    expect(filas().map((f) => f.dataset.cuotaId)).toEqual([
      'juridica',
      'media',
      'temprana',
      'futura',
    ])
  })

  it('el encabezado ordena, y volver a tocarlo invierte', () => {
    montar([
      deuda({ cuotaId: 'chica', pendingAmount: 100_000 }),
      deuda({ cuotaId: 'grande', pendingAmount: 9_000_000 }),
    ])
    act(() => container!.querySelector<HTMLButtonElement>('[data-testid="ordenar-debe"]')!.click())
    expect(filas().map((f) => f.dataset.cuotaId)).toEqual(['grande', 'chica'])

    act(() => container!.querySelector<HTMLButtonElement>('[data-testid="ordenar-debe"]')!.click())
    expect(filas().map((f) => f.dataset.cuotaId)).toEqual(['chica', 'grande'])
  })

  it('sin deudas se monta la tabla vacía, sin filas ni fila fantasma', () => {
    montar([])
    expect(container!.querySelector('[data-testid="cartera-tabla"]')).not.toBeNull()
    expect(filas()).toHaveLength(0)
    // El encabezado sigue: el vacío de verdad lo pone la pantalla, no una
    // tabla que desaparece.
    expect(container!.textContent).toContain('cartera.tabla.inquilino')
  })

  it('la fila abre la deuda', () => {
    const { onVerCobro } = montar([deuda()])
    act(() => filas()[0].click())
    expect(onVerCobro).toHaveBeenCalledTimes(1)
    expect(onVerCobro.mock.calls[0][0].cuotaId).toBe('q1')
  })

  describe('un dato que el back no manda se dice, no se disimula', () => {
    it('sin inquilino: no es «Sin nombre», es una deuda que nadie puede reclamar', () => {
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

    it('🔴 sin cobro emitido NO dice «sin recordatorios»: no hay de dónde escribirle', () => {
      // Son dos hechos distintos: «no le hemos escrito» (0) y «no existe el
      // documento desde el cual escribirle» (null). Taparlos con el mismo
      // texto afirma una gestión que nunca se pudo hacer.
      montar([deuda({ cobroId: null, remindersSent: null })])
      const texto = filas()[0].textContent ?? ''
      expect(texto).toContain('cartera.tabla.sinCobroEmitido')
      expect(texto).not.toContain('cartera.tabla.sinRecordatorios')
    })
  })
})
