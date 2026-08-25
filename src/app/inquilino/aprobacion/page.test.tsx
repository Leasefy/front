/**
 * Los seis estados de "Mi aprobación" (Slice 2 — fuente `usePreScoringCurrent`).
 *
 * Lo que se protege acá no es el markup, son las reglas de la experiencia:
 *  · sin tope NUNCA se pinta un número (mandaría a alguien a postularse a algo
 *    que no puede pagar)
 *  · el aprobado muestra la prima por aseguradora y el badge Demo cuando
 *    corresponde
 *  · el rechazo tiene salidas, no es un callejón
 *  · "en proceso" distingue consultando de esperando autorización
 *  · el vacío enseña el camino ANTES de pedir datos
 *  · expirado y error son estados nuevos, cada uno con su salida
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { hookMock } = vi.hoisted(() => ({
  hookMock: vi.fn(),
}))

vi.mock('@/lib/hooks/use-prescoring-current', () => ({
  usePreScoringCurrent: () => hookMock(),
}))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, locale: 'es' }),
  useOptionalI18n: () => ({ t: (key: string) => key, locale: 'es' }),
}))

import AprobacionPage from './page'
// `prescoring.types` NO está mockeado — solo el hook `usePreScoringCurrent`
// lo está. Se usa el `mapEstadoPreScoring` real para que el mock del hook no
// se desincronice del mapeo real (ya cubierto exhaustivamente en
// `prescoring.types.test.ts`; acá no se vuelve a testear, solo se reusa).
import { mapEstadoPreScoring, type PreScoringCurrent } from '@/lib/api/prescoring.types'

let container: HTMLDivElement
let root: Root

function montar(current: PreScoringCurrent | null, overrides: Partial<{ isLoading: boolean; error: string | null }> = {}) {
  hookMock.mockReturnValue({
    current,
    isLoading: overrides.isLoading ?? false,
    error: overrides.error ?? null,
    refetch: vi.fn(),
    estado: mapEstadoPreScoring(current),
  })
}

function texto(): string {
  return container.textContent ?? ''
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

function render() {
  act(() => {
    root.render(<AprobacionPage />)
  })
}

describe('aprobado', () => {
  it('muestra el tope como número formateado', () => {
    montar({
      order: { status: 'STUDY_STARTED', paymentStatus: 'APPROVED', expiresAt: null },
      evaluation: {
        status: 'completed',
        result: {
          carriers: [{ name: 'Fianly', productType: null, viable: true, primaMensualCop: 45000, stubMode: false, motivoRechazo: null }],
          fianly: { maxEntrenchmentValue: 2_800_000 },
          bureau: { minimumScore: null, monthlyCapacity: null },
        },
      },
    })
    render()
    expect(texto()).toContain('Estás aprobado hasta')
    expect(texto()).toMatch(/2\.800\.000/)
  })

  it('SIN tope no inventa un número: lo dice', () => {
    montar({
      order: { status: 'STUDY_STARTED', paymentStatus: 'APPROVED', expiresAt: null },
      evaluation: {
        status: 'completed',
        result: {
          carriers: [{ name: 'Fianly', productType: null, viable: true, primaMensualCop: null, stubMode: false, motivoRechazo: null }],
          fianly: { maxEntrenchmentValue: null },
          bureau: { minimumScore: null, monthlyCapacity: null },
        },
      },
    })
    render()
    expect(texto()).toContain('Estás aprobado')
    expect(texto()).not.toContain('Estás aprobado hasta')
    expect(texto()).toContain('Estamos terminando de calcular')
    expect(texto()).not.toMatch(/\$\s*0(?!\d)/)
  })

  it('muestra la prima mensual por aseguradora', () => {
    montar({
      order: { status: 'STUDY_STARTED', paymentStatus: 'APPROVED', expiresAt: null },
      evaluation: {
        status: 'completed',
        result: {
          carriers: [
            { name: 'Fianly', productType: null, viable: true, primaMensualCop: 52000, stubMode: false, motivoRechazo: null },
            { name: 'Sura', productType: null, viable: false, primaMensualCop: null, stubMode: false, motivoRechazo: 'Score de buró insuficiente' },
          ],
          fianly: { maxEntrenchmentValue: 2_800_000 },
          bureau: { minimumScore: null, monthlyCapacity: null },
        },
      },
    })
    render()
    const t = texto()
    expect(t).toContain('Fianly')
    expect(t).toMatch(/52\.000/)
    expect(t).toContain('Sura')
    expect(t).toContain('Score de buró insuficiente')
  })

  it('muestra el badge Demo cuando alguna aseguradora corre en modo demo', () => {
    montar({
      order: { status: 'STUDY_STARTED', paymentStatus: 'APPROVED', expiresAt: null },
      evaluation: {
        status: 'completed',
        result: {
          carriers: [{ name: 'Fianly', productType: null, viable: true, primaMensualCop: 30000, stubMode: true, motivoRechazo: null }],
          fianly: { maxEntrenchmentValue: 2_400_000 },
          bureau: { minimumScore: null, monthlyCapacity: null },
        },
      },
    })
    render()
    expect(container.querySelector('[data-testid="badge-demo"]')).not.toBeNull()
  })

  it('muestra el score de buró y la capacidad mensual cuando vienen', () => {
    montar({
      order: { status: 'STUDY_STARTED', paymentStatus: 'APPROVED', expiresAt: null },
      evaluation: {
        status: 'completed',
        result: {
          carriers: [{ name: 'Fianly', productType: null, viable: true, primaMensualCop: 30000, stubMode: false, motivoRechazo: null }],
          fianly: { maxEntrenchmentValue: 2_400_000 },
          bureau: { minimumScore: 650, monthlyCapacity: 3_000_000 },
        },
      },
    })
    render()
    const t = texto()
    expect(t).toContain('Score de buró')
    expect(t).toMatch(/650/)
    expect(t).toContain('Capacidad de pago mensual')
    expect(t).toMatch(/3\.000\.000/)
  })

  it('sin datos de buró no muestra la sección', () => {
    montar({
      order: { status: 'STUDY_STARTED', paymentStatus: 'APPROVED', expiresAt: null },
      evaluation: {
        status: 'completed',
        result: {
          carriers: [{ name: 'Fianly', productType: null, viable: true, primaMensualCop: 30000, stubMode: false, motivoRechazo: null }],
          fianly: { maxEntrenchmentValue: 2_400_000 },
          bureau: { minimumScore: null, monthlyCapacity: null },
        },
      },
    })
    render()
    expect(texto()).not.toContain('Score de buró')
  })
})

describe('rechazado — tiene salidas, no es un callejón', () => {
  const RECHAZADO: PreScoringCurrent = {
    order: { status: 'STUDY_STARTED', paymentStatus: 'APPROVED', expiresAt: null },
    evaluation: {
      status: 'completed',
      result: {
        carriers: [{ name: 'Sura', productType: null, viable: false, primaMensualCop: null, stubMode: false, motivoRechazo: 'Score bajo' }],
        fianly: { maxEntrenchmentValue: null },
        bureau: { minimumScore: null, monthlyCapacity: null },
      },
    },
  }

  it('ofrece la salida del familiar o amigo', () => {
    montar(RECHAZADO)
    render()
    expect(texto()).toContain('Alguien puede postularse por ti')
    expect(texto()).toContain('más de la mitad de los arriendos en Colombia')
  })

  it('deja claro que no es definitivo', () => {
    montar(RECHAZADO)
    render()
    expect(texto()).toContain('Vuelve a intentarlo más adelante')
  })

  it('no muestra el tope cuando fue rechazado', () => {
    montar(RECHAZADO)
    render()
    expect(texto()).not.toMatch(/2\.800\.000/)
  })
})

describe('en proceso', () => {
  it('consultando: no lo manda a irse ni le promete un correo', () => {
    montar({
      order: { status: 'STUDY_STARTED', paymentStatus: 'APPROVED', expiresAt: null },
      evaluation: { status: 'started', result: null },
    })
    render()
    const t = texto()
    expect(t).toContain('Estamos consultando a las aseguradoras')
    expect(t).not.toContain('puedes cerrar esta página')
  })

  it('esperando autorización: lo dice distinto de "consultando"', () => {
    montar({
      order: { status: 'PAID', paymentStatus: 'APPROVED', expiresAt: null },
      evaluation: { status: 'awaiting_authorization', result: null },
    })
    render()
    const t = texto()
    expect(t).toContain('Esperamos tu autorización')
    expect(t).not.toContain('Estamos consultando a las aseguradoras')
  })

  it('muestra la ventana de la orden cuando viene expiresAt', () => {
    const enDias = (n: number) => {
      const d = new Date()
      d.setDate(d.getDate() + n)
      return d.toISOString()
    }
    montar({
      order: { status: 'PAID', paymentStatus: 'APPROVED', expiresAt: enDias(2) },
      evaluation: { status: 'started', result: null },
    })
    render()
    expect(texto()).toContain('Vence en 2 días')
  })
})

describe('sin estudio — enseña el camino antes de pedir datos', () => {
  it('muestra los tres pasos', () => {
    montar({ order: { status: 'PENDING_PAYMENT', paymentStatus: null, expiresAt: null }, evaluation: null })
    render()
    const t = texto()
    expect(t).toContain('Te estudiamos')
    expect(t).toContain('Eliges')
    expect(t).toContain('El propietario decide')
  })

  it('sin order (nunca se consultó) también cae acá', () => {
    montar(null)
    render()
    expect(texto()).toContain('Todavía no tienes una aprobación')
  })

  it('el CTA por defecto va al flujo vigente de /aprobacion', () => {
    montar(null)
    render()
    const link = container.querySelector('a[href="/aprobacion"]')
    expect(link).not.toBeNull()
  })
})

describe('expirado', () => {
  it('ofrece volver a intentarlo', () => {
    montar({ order: { status: 'EXPIRED', paymentStatus: null, expiresAt: '2020-01-01T00:00:00Z' }, evaluation: null })
    render()
    const t = texto()
    expect(t).toContain('venció')
    const link = container.querySelector('a[href="/aprobacion"]')
    expect(link).not.toBeNull()
  })
})

describe('error', () => {
  it('ofrece reintentar cuando el estudio falló del lado del backend', () => {
    montar({ order: { status: 'ERROR', paymentStatus: 'APPROVED', expiresAt: null }, evaluation: null })
    render()
    expect(container.querySelector('[data-testid="reintentar-estudio"]')).not.toBeNull()
  })

  it('un fallo de RED al cargar (no del estudio) muestra FalloDeCarga y ofrece reintentar', () => {
    montar(null, { error: 'agente caído' })
    render()
    expect(container.querySelector('[data-testid="fallo-de-carga"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="reintentar"]')).not.toBeNull()
  })
})

describe('cargando', () => {
  it('muestra el spinner mientras isLoading', () => {
    montar(null, { isLoading: true })
    render()
    expect(texto()).toContain('Cargando tu aprobación')
  })
})
