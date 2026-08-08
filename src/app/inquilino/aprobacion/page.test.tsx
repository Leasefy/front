/**
 * Los cuatro estados de "Mi aprobación".
 *
 * Lo que se protege acá no es el markup, son las reglas de la experiencia:
 *  · sin tope NUNCA se pinta un número (mandaría a alguien a postularse a algo
 *    que no puede pagar)
 *  · el rechazo tiene salidas, no es un callejón
 *  · "en proceso" libera al usuario en vez de retenerlo
 *  · el vacío enseña el camino ANTES de pedir datos, y jamás dice "estúdiate ahora"
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as mockReact from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }))

vi.mock('@/lib/api/aprobacion.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/aprobacion.service')>()
  return { ...actual, fetchAprobacion: () => fetchMock() }
})

/*
 * La página lee por `useAprobacion`, la misma fuente que el resto del recorrido
 * (antes hacía su propio fetch y era la única que no veía el respaldo local).
 * El mock replica ese contrato apoyándose en el mismo `fetchMock` de siempre.
 */
vi.mock('@/lib/hooks/use-aprobacion', () => ({
  useAprobacion: () => {
    const [estado, set] = mockReact.useState<{ a: unknown; e: string | null; cargando: boolean }>({
      a: null, e: null, cargando: true,
    })
    mockReact.useEffect(() => {
      Promise.resolve()
        .then(() => fetchMock())
        .then((a) => set({ a, e: null, cargando: false }))
        .catch((err) => set({ a: null, e: err?.message ?? 'error', cargando: false }))
    }, [])
    return {
      aprobacion: estado.a,
      cargando: estado.cargando,
      error: estado.e,
      vigente: (estado.a as { estado?: string } | null)?.estado === 'aprobado',
      recargar: () => {},
    }
  },
}))

vi.mock('@/lib/i18n', () => ({
  // Devolver la clave hace que `tf` caiga en el texto de respaldo: el test lee
  // exactamente la copy que ve el usuario.
  useI18n: () => ({ t: (key: string) => key, locale: 'es' }),
  useOptionalI18n: () => ({ t: (key: string) => key, locale: 'es' }),
}))

import AprobacionPage from './page'
import type { Aprobacion } from '@/lib/api/aprobacion.service'

const BASE: Aprobacion = {
  estado: 'aprobado',
  topeAprobadoCop: 2_400_000,
  aseguradoras: [
    { nombre: 'Fianli', aprobada: true },
    { nombre: 'Sura', aprobada: false },
  ],
  vigenteHasta: null,
  resueltoEn: null,
  condicionada: false,
  canonConsultadoCop: null,
}

function enDias(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString()
}

let container: HTMLDivElement
let root: Root

async function montar(a: Partial<Aprobacion>) {
  fetchMock.mockResolvedValue({ ...BASE, ...a })
  await act(async () => {
    root.render(<AprobacionPage />)
  })
}

/** Texto plano de la pantalla, para aserciones legibles. */
function texto(): string {
  return container.textContent ?? ''
}

beforeEach(() => {
  fetchMock.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

describe('aprobado', () => {
  it('muestra el tope como número formateado', async () => {
    await montar({ topeAprobadoCop: 2_400_000 })
    expect(texto()).toContain('Estás aprobado hasta')
    expect(texto()).toMatch(/2\.400\.000/)
  })

  it('dice que puede postularse a varias sin volver a pagar', async () => {
    await montar({})
    expect(texto()).toContain('no vuelves a pagar')
  })

  it('SIN tope no inventa un número: lo dice', async () => {
    await montar({ topeAprobadoCop: null })
    expect(texto()).toContain('Estás aprobado')
    expect(texto()).not.toContain('Estás aprobado hasta')
    expect(texto()).toContain('Estamos terminando de calcular')
    // Ni un cero haciéndose pasar por monto.
    expect(texto()).not.toMatch(/\$\s*0/)
  })

  it('lista las aseguradoras consultadas, aprueben o no', async () => {
    await montar({})
    expect(texto()).toContain('Fianli')
    expect(texto()).toContain('Sura')
    // Concordancia: con UNA aprobada es "te aprobó", no "te aprobaron".
    expect(texto()).toContain('2 consultadas · 1 te aprobó')
  })

  it('con una sola aseguradora no dice "varias" ni pluraliza', async () => {
    await montar({ aseguradoras: [{ nombre: 'Fianli', aprobada: true }] })
    const t = texto()
    expect(t).toContain('1 consultada')
    expect(t).not.toContain('1 consultadas')
    expect(t).not.toContain('Consultamos varias')
  })
})

describe('vigencia', () => {
  it('muestra los días que faltan', async () => {
    await montar({ vigenteHasta: enDias(12) })
    expect(texto()).toContain('Vence en 12 días')
  })

  it('sin fecha no inventa una vigencia', async () => {
    await montar({ vigenteHasta: null })
    expect(texto()).not.toContain('Vence')
  })
})

describe('rechazado — tiene salidas, no es un callejón', () => {
  it('ofrece la salida del familiar o amigo', async () => {
    await montar({ estado: 'rechazado' })
    expect(texto()).toContain('Alguien puede postularse por ti')
    expect(texto()).toContain('más de la mitad de los arriendos en Colombia')
  })

  it('deja claro que no es definitivo', async () => {
    await montar({ estado: 'rechazado' })
    expect(texto()).toContain('Vuelve a intentarlo más adelante')
  })

  it('no muestra el tope cuando fue rechazado', async () => {
    await montar({ estado: 'rechazado', topeAprobadoCop: 2_400_000 })
    expect(texto()).not.toMatch(/2\.400\.000/)
  })
})

describe('en proceso — libera al usuario', () => {
  it('le dice que puede cerrar la página', async () => {
    await montar({ estado: 'en_proceso' })
    expect(texto()).toContain('puedes cerrar esta página')
  })
})

describe('sin estudio — enseña el camino antes de pedir datos', () => {
  it('muestra los tres pasos', async () => {
    await montar({ estado: 'sin_estudio' })
    expect(texto()).toContain('Te estudiamos')
    expect(texto()).toContain('Eliges')
    expect(texto()).toContain('El propietario decide')
  })

  it('usa el copy acordado y NUNCA "estúdiate ahora"', async () => {
    await montar({ estado: 'sin_estudio' })
    expect(texto()).toContain('Conoce hasta cuánto te arrendamos')
    expect(texto().toLowerCase()).not.toContain('estúdiate ahora')
  })
})

describe('error', () => {
  it('muestra el estado de error en vez de una pantalla vacía', async () => {
    fetchMock.mockRejectedValue(new Error('agente caído'))
    await act(async () => {
      root.render(<AprobacionPage />)
    })
    expect(texto()).toContain('No pudimos cargar tu aprobación')
  })
})
