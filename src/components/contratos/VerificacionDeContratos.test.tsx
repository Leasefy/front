/**
 * La segunda opinión, en pantalla.
 *
 * Lo que se congela acá es lo que Nico pidió explícitamente: que una
 * diferencia se VEA (con el detalle abierto, no detrás de un clic), que «no se
 * pudo verificar» NO se lea como aprobado, y que cuando el verificador no
 * estuvo disponible la pantalla lo diga en vez de callarlo.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

vi.mock('@/lib/api/contracts.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/contracts.service')>(
    '@/lib/api/contracts.service',
  )
  return {
    ...actual,
    contractsApi: { migracion: { verificar: vi.fn() } },
  }
})

import { contractsApi } from '@/lib/api/contracts.service'
import type { VeredictoDeFila } from '@/lib/api/contracts.service'
import {
  VerificacionDeContratos,
  deLaActivacion,
} from './VerificacionDeContratos'
import type { ResultadoVerificacionCompleta } from './verificarLoteCompleto'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  vi.clearAllMocks()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function render(props: Parameters<typeof VerificacionDeContratos>[0]) {
  act(() => {
    root.render(<VerificacionDeContratos {...props} />)
  })
}

function texto(testid: string): string {
  return container.querySelector(`[data-testid="${testid}"]`)?.textContent ?? ''
}

function boton(etiqueta: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll('button')).find((b) =>
    (b.textContent ?? '').includes(etiqueta),
  ) as HTMLButtonElement | undefined
}

function completa(
  over: Partial<ResultadoVerificacionCompleta> = {},
): ResultadoVerificacionCompleta {
  return {
    verificadas: 0,
    coinciden: 0,
    difieren: 0,
    noVerificables: 0,
    llamadas: 1,
    restantes: 0,
    veredictos: [],
    veredictosTruncados: false,
    guardado: true,
    detenidoPorLimite: false,
    detenidoSinAvance: false,
    detenidoPorPersona: false,
    ...over,
  }
}

function difiere(fila: number, frase: string): VeredictoDeFila {
  return {
    fila,
    veredicto: 'difiere',
    contratoId: 'c-1',
    diferencias: [
      {
        campo: 'inmueble',
        etiqueta: 'Inmueble',
        fuente: 'el código que trae la celda «Propiedad»',
        diceElArchivo: 'el inmueble de código 301',
        quedoGuardado: 'el inmueble de código 302',
        frase,
      },
    ],
    sinCotejar: [],
    cotejados: [],
  }
}

describe('VerificacionDeContratos', () => {
  it('muestra los tres números, y «sin verificar» SIEMPRE — incluso en cero', () => {
    render({
      deLaActivacion: completa({ verificadas: 10, coinciden: 10 }),
    })
    const t = texto('conteo-verificacion')
    expect(t).toContain('10 coinciden')
    expect(t).toContain('0 difieren')
    // 🔴 Omitir este cero haría que su ausencia se leyera como un «bien».
    expect(t).toContain('0 sin verificar')
  })

  it('🔴 una diferencia se ve ABIERTA, con la frase y de dónde sale la verdad', () => {
    render({
      deLaActivacion: completa({
        verificadas: 2,
        coinciden: 1,
        difieren: 1,
        veredictos: [
          difiere(
            0,
            'Inmueble: el contrato quedó con el inmueble de código 302 y el archivo dice el inmueble de código 301.',
          ),
        ],
      }),
    })
    const t = texto('verificacion-difieren')
    // La fila del archivo tal como la ve la persona (encabezado + base 1).
    expect(t).toContain('Fila 2')
    expect(t).toContain('302')
    expect(t).toContain('301')
    expect(t).toContain('celda «Propiedad»')
    // Y se dice que está frenada: es lo que pidió Nico, no que se arregle sola.
    expect(t.toLowerCase()).toContain('frenado')
  })

  it('«no se pudo verificar» se dice como lo que es, no como un visto bueno', () => {
    render({
      deLaActivacion: completa({
        verificadas: 1,
        noVerificables: 1,
        veredictos: [
          {
            fila: 5,
            veredicto: 'no_verificable',
            contratoId: null,
            diferencias: [],
            sinCotejar: [],
            cotejados: [],
            motivo: 'Esta fila no llegó a crear un contrato.',
          },
        ],
      }),
    })
    const t = texto('verificacion-sin-verificar')
    expect(t).toContain('Fila 7')
    expect(t).toContain('no llegó a crear un contrato')
    expect(t.toLowerCase()).toContain('no es que est')
  })

  it('🔴 sin verificación, la pantalla lo DICE — no se queda callada', () => {
    render({
      deLaActivacion: null,
      aviso:
        'Los contratos se activaron, pero la doble verificación contra el archivo no está disponible en este servidor.',
    })
    expect(texto('aviso-sin-verificar')).toContain('no está disponible')
    // Y no pinta ningún conteo que se pueda leer como aprobación.
    expect(container.querySelector('[data-testid="conteo-verificacion"]')).toBeNull()
  })

  it('el botón recorre el LOTE COMPLETO con el cursor y pinta el total', async () => {
    vi.mocked(contractsApi.migracion.verificar)
      .mockResolvedValueOnce({
        verificadas: 50,
        coinciden: 49,
        difieren: 1,
        noVerificables: 0,
        veredictos: [difiere(3, 'Canon: el contrato quedó con $900.000 y el archivo dice $1.008.403.')],
        veredictosTruncados: false,
        ultimaFila: 49,
        terminado: false,
        restantes: 10,
        guardado: true,
      })
      .mockResolvedValueOnce({
        verificadas: 10,
        coinciden: 10,
        difieren: 0,
        noVerificables: 0,
        veredictos: [],
        veredictosTruncados: false,
        ultimaFila: 59,
        terminado: true,
        restantes: 0,
        guardado: true,
      })

    render({ lote: 'lote-1' })
    await act(async () => {
      boton('Verificar el lote completo')?.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(vi.mocked(contractsApi.migracion.verificar).mock.calls).toEqual([
      ['lote-1', 0],
      ['lote-1', 50],
    ])
    const t = texto('conteo-verificacion')
    expect(t).toContain('59 coinciden')
    expect(t).toContain('1 difiere')
    expect(texto('verificacion-difieren')).toContain('$900.000')
  })

  it('un fallo del verificador no dice ni que están bien ni que están mal', async () => {
    vi.mocked(contractsApi.migracion.verificar).mockRejectedValue(new Error('500'))

    render({ lote: 'lote-1' })
    await act(async () => {
      boton('Verificar el lote completo')?.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(texto('error-verificacion')).toContain('No pudimos contrastar')
    // Lo importante: se dice que los contratos NO cambiaron.
    expect(texto('error-verificacion')).toContain('no cambiaron')
    expect(container.querySelector('[data-testid="conteo-verificacion"]')).toBeNull()
  })

  it('avisa cuando el veredicto no quedó guardado, en vez de callarlo', () => {
    render({
      deLaActivacion: completa({ verificadas: 3, coinciden: 3, guardado: false }),
    })
    expect(texto('verificacion-no-guardada')).toContain('migración de base')
  })

  it('sin diferencias lo dice con el número mirado, nunca con un «todo bien» suelto', () => {
    render({ deLaActivacion: completa({ verificadas: 1_785, coinciden: 1_785 }) })
    expect(texto('verificacion-sin-diferencias')).toContain('1785')
  })

  it('deLaActivacion sin verificación devuelve null: ausente no es aprobado', () => {
    expect(deLaActivacion(undefined)).toBeNull()
  })
})
