/**
 * FilaDeSeguimiento.test.tsx — la fila de un loop vivo y la línea «Seguimiento» del detalle de señal (13-04, Tarea 3).
 *
 * Qué prueba: la fila dice métrica, estado · forma, «Rol: …», huérfano, comunicación y fechas legibles en `<time>`; el dueño
 * es un rol y nunca una persona; los conteos de Naira no aparecen; los únicos botones son los 3 del voto del loop (sobre su
 * señal, solo si el rol vota); con datos de ejemplo se ve y no vota; una fecha ilegible no se muestra cruda; los enlaces son
 * los que da la página; y una métrica desconocida no muestra su id.
 *
 * Arnés: createRoot + act, stub de i18n real (es.json), `next/link` → `<a>`, `useAuth` con AGY-1, `votarSenal` y `toast`
 * simulados; `montar(props, origen)` envuelve en `ProveedorDeOrigen`. Los `href` los pone el test. Marcador en el TÍTULO.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  RESPUESTA_ESTRICTA_POR_ENDPOINT,
  type NairaOpenLoop,
  type NairaSignalFeedbackResult,
} from '@/lib/api/naira/contrato'
import type { EstadoNaira } from '@/lib/api/naira/cliente'
import { EJEMPLOS_DE_NAIRA, USER_IDS_DE_EJEMPLO } from '@/lib/data/mock-naira'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { votar } = vi.hoisted(() => ({
  votar: vi.fn(
    async (): Promise<EstadoNaira<NairaSignalFeedbackResult>> => ({ kind: 'no_disponible' }),
  ),
}))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.PropsWithChildren<{ href: string } & Record<string, unknown>>) =>
    React.createElement('a', { href, ...rest }, children),
}))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'AGY-1' } }) }))
vi.mock('@/lib/api/naira/cliente', () => ({ votarSenal: votar }))
vi.mock('@/components/ui/toast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import { FilaDeSeguimiento, LineaDeSeguimientoDeLaSenal, type FilaDeSeguimientoProps } from './FilaDeSeguimiento'
import { ProveedorDeOrigen, type OrigenDeLosDatos } from './OrigenDeNaira'

const BASE = EJEMPLOS_DE_NAIRA['seguimiento.lista'].loops[0]

function loopCon(over: Partial<NairaOpenLoop> = {}): NairaOpenLoop {
  return {
    ...BASE,
    loopId: 'LOOP-TOKEN-200',
    promocionId: 'PROMO-1',
    metricId: 'cartera.morosidad_rate',
    owner: 'role:cartera',
    ownerRazon: 'persona_espera_b5',
    estado: 'en_seguimiento',
    forma: 'impacto',
    ciclos: 4711,
    candidato: { kind: 'ninguno' },
    huerfanoDeRol: false,
    ultimoDiaVerificado: '2000-01-03',
    nextCheckAt: { kind: 'programada', en: '2000-01-04T11:25:00.000Z' },
    expiraEn: '2000-02-02T11:00:00.000Z',
    comunicacion: { kind: 'comunicado', primerDia: '2000-01-01' },
    ...over,
  }
}

const EN_CURSO: NairaOpenLoop['candidato'] = { kind: 'en_curso', desenlace: 'no_accionado', confirmaciones: 8317, desde: '2000-01-02' }

let contenedor: HTMLDivElement
let root: Root

function montar(over: Partial<FilaDeSeguimientoProps> = {}, origen: OrigenDeLosDatos = 'agente') {
  const props: FilaDeSeguimientoProps = {
    loop: loopCon(),
    hrefDeLaSenal: '/x/senal',
    hrefDeLaBitacora: '/x/bitacora',
    puedeVotar: true,
    ...over,
  }
  act(() => {
    root.render(
      <ProveedorDeOrigen origen={origen}>
        <FilaDeSeguimiento {...props} />
      </ProveedorDeOrigen>,
    )
  })
}

function enlace(texto: string): HTMLAnchorElement | null {
  return Array.from(contenedor.querySelectorAll('a')).find((a) => a.textContent === texto) ?? null
}

beforeEach(() => {
  votar.mockClear()
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(() => {
  act(() => root.unmount())
  contenedor.remove()
})

describe('FilaDeSeguimiento', () => {
  it('[N13:control-positivo] métrica, estado · forma, rol, fechas en <time>, enlaces y voto', () => {
    montar()
    const art = contenedor.querySelector('article[data-naira-loop]')
    expect(art).not.toBeNull()
    expect(contenedor.querySelector('h2')?.textContent).toBe('Índice de morosidad')
    const texto = contenedor.textContent ?? ''
    expect(texto).toContain('En seguimiento')
    expect(texto).toContain('Impacto')
    expect(texto).toContain('Rol: Cartera')
    expect(texto).toContain('Te lo avisamos el')
    expect(contenedor.querySelector('time[datetime="2000-01-01"]')).not.toBeNull()
    expect(texto).toContain('Última revisión:')
    expect(contenedor.querySelector('time[datetime="2000-01-03"]')).not.toBeNull()
    expect(texto).toContain('Próxima:')
    expect(contenedor.querySelector('time[datetime="2000-01-04T11:25:00.000Z"]')).not.toBeNull()
    expect(texto).toContain('Se cierra solo el')
    expect(contenedor.querySelector('time[datetime="2000-02-02T11:00:00.000Z"]')).not.toBeNull()
    expect(enlace('Ver la señal')?.getAttribute('href')).toBe('/x/senal')
    expect(enlace('Ver la bitácora')?.getAttribute('href')).toBe('/x/bitacora')
    expect(contenedor.querySelector('[data-naira-voto]')).not.toBeNull()
  })

  it('[N13:fixture-es-contrato] la lista con los loops del test pasa el esquema estricto', () => {
    const lista = {
      ...EJEMPLOS_DE_NAIRA['seguimiento.lista'],
      loops: [loopCon(), loopCon({ loopId: 'LOOP-2', candidato: EN_CURSO, huerfanoDeRol: true, owner: 'role:portafolio' })],
    }
    expect(() => RESPUESTA_ESTRICTA_POR_ENDPOINT['seguimiento.lista'].parse(lista)).not.toThrow()
  })

  it('[N13:rol-no-persona] el dueño es un rol del panel; el huérfano se avisa con el icono, no con el texto', () => {
    const casos = [
      ['role:cartera', 'Rol: Cartera'],
      ['role:portafolio', 'Rol: Inmuebles'],
      ['role:prospectos', 'Rol: Prospectos'],
    ] as const
    for (const [owner, esperado] of casos) {
      montar({ loop: loopCon({ owner }) })
      expect(contenedor.textContent).toContain(esperado)
      expect(contenedor.innerHTML).not.toContain('role:')
      expect(contenedor.innerHTML).not.toContain('persona_espera_b5')
    }
    montar({ loop: loopCon({ huerfanoDeRol: true }) })
    const banda = contenedor.querySelector('[data-naira-huerfano]')
    expect(banda).not.toBeNull()
    expect(banda?.textContent).toContain('Nadie tiene asignado este rol')
    expect(banda?.querySelector('svg')?.getAttribute('class') ?? '').toContain('text-warning')
    const conTexto = Array.from(banda?.querySelectorAll('span, p') ?? []).filter((n) =>
      (n.textContent ?? '').includes('Nadie tiene asignado este rol'),
    )
    expect(conTexto.length).toBeGreaterThan(0)
    for (const n of conTexto) expect(n.getAttribute('class') ?? '').not.toMatch(/text-warning/)
  })

  it('[N13:b5-sin-persona] ningún id de persona del ejemplo llega al DOM', () => {
    montar({ loop: loopCon({ candidato: EN_CURSO, huerfanoDeRol: true }) })
    for (const u of USER_IDS_DE_EJEMPLO) expect(contenedor.innerHTML).not.toContain(u)
  })

  it('[N13:conteos-sin-numeral] ni los ciclos ni las confirmaciones se escriben; el candidato se dice en palabras', () => {
    montar({ loop: loopCon({ candidato: EN_CURSO }) })
    expect(contenedor.innerHTML).not.toContain('4711')
    expect(contenedor.innerHTML).not.toContain('8317')
    expect(contenedor.textContent).toContain('Parece que nadie actuó: Naira lo confirmará en la próxima revisión.')
    expect(contenedor.querySelectorAll('[data-naira-numero]')).toHaveLength(0)
  })

  it('[N13:sin-quien-cerro] los únicos botones son los 3 del voto; sin voto no hay botones; nadie cierra ni reabre', () => {
    montar()
    const botones = Array.from(contenedor.querySelectorAll('button'))
    expect(botones).toHaveLength(3)
    for (const b of botones) expect(b.closest('[data-naira-voto]')).not.toBeNull()
    expect(contenedor.textContent ?? '').not.toMatch(/cerrado por|quién cerró|closed by|reabrir/i)
    montar({ puedeVotar: false })
    expect(contenedor.querySelectorAll('button')).toHaveLength(0)
    expect(contenedor.textContent ?? '').not.toMatch(/cerrado por|quién cerró|closed by|reabrir/i)
  })

  it('[N13:voto-del-loop] el voto es sobre la señal del loop y solo si el rol vota', async () => {
    montar()
    const util = Array.from(contenedor.querySelectorAll('button')).find((b) => (b.textContent ?? '').includes('Útil'))
    expect(util).toBeDefined()
    await act(async () => {
      util?.click()
    })
    expect(votar).toHaveBeenCalledWith('AGY-1', 'PROMO-1', 'util')
    votar.mockClear()
    montar({ puedeVotar: false })
    expect(contenedor.querySelector('[data-naira-voto]')).toBeNull()
    expect(votar).not.toHaveBeenCalled()
  })

  it('[N13:simulado-visible] con datos de ejemplo la última revisión lo dice y el voto queda deshabilitado', () => {
    montar({}, 'ejemplo')
    const marca = contenedor.querySelector('[data-naira-ejemplo="true"]')
    expect(marca?.textContent).toContain('Última revisión: DATO DE EJEMPLO')
    expect(contenedor.querySelector('time[datetime="2000-01-03"]')).toBeNull()
    const botones = Array.from(contenedor.querySelectorAll('button'))
    expect(botones).toHaveLength(3)
    for (const b of botones) expect(b.disabled).toBe(true)
  })

  it('[N13:fecha-ilegible] una fecha que no se lee no se muestra cruda; sin revisión y sin aviso se dicen', () => {
    montar({
      loop: loopCon({
        ultimoDiaVerificado: 'no-es-fecha',
        expiraEn: 'tampoco',
        nextCheckAt: { kind: 'ninguna' },
        comunicacion: { kind: 'sin_comunicar' },
      }),
    })
    const texto = contenedor.textContent ?? ''
    expect(texto).toContain('Última revisión: sin fecha legible')
    expect(contenedor.innerHTML).not.toContain('no-es-fecha')
    expect(contenedor.innerHTML).not.toContain('tampoco')
    expect(texto).toContain('Sin revisión programada')
    expect(texto).toContain('Todavía no se ha avisado a nadie.')
  })

  it('[N13:sin-href-del-agente] sin href no hay enlaces; con ids hostiles solo están los href de la página', () => {
    montar({ hrefDeLaSenal: null, hrefDeLaBitacora: null })
    expect(contenedor.querySelectorAll('a')).toHaveLength(0)
    montar({ loop: loopCon({ promocionId: 'https://evil.test', loopId: 'javascript:alert(1)' }) })
    const hrefs = Array.from(contenedor.querySelectorAll('a[href]')).map((a) => a.getAttribute('href'))
    expect(hrefs.length).toBeGreaterThan(0)
    for (const h of hrefs) expect(['/x/senal', '/x/bitacora']).toContain(h)
  })

  it('[N13:metrica-sin-nombre] una métrica que el panel no conoce no muestra su id', () => {
    montar({ loop: loopCon({ metricId: 'metrica.inventada' }) })
    expect(contenedor.querySelector('h2')?.textContent).toBe('Una métrica que esta versión del panel no reconoce')
    expect(contenedor.innerHTML).not.toContain('metrica.inventada')
  })

  it('[N13:linea-de-la-senal] la línea del detalle de señal dice el estado y enlaza la bitácora, nada más', () => {
    const loop = loopCon({ estado: 'escalado', ciclos: 4711 })
    act(() => {
      root.render(<LineaDeSeguimientoDeLaSenal loop={loop} hrefDeLaBitacora="/x/bitacora" />)
    })
    const linea = contenedor.querySelector('[data-naira-seguimiento-de-la-senal]')
    expect(linea?.textContent).toContain('Seguimiento: Escalado')
    expect(enlace('Ver la bitácora')?.getAttribute('href')).toBe('/x/bitacora')
    expect(contenedor.innerHTML).not.toContain('role:')
    expect(contenedor.innerHTML).not.toContain('4711')
    act(() => {
      root.render(<LineaDeSeguimientoDeLaSenal loop={loop} hrefDeLaBitacora={null} />)
    })
    expect(contenedor.querySelector('[data-naira-seguimiento-de-la-senal]')).not.toBeNull()
    expect(contenedor.querySelectorAll('a')).toHaveLength(0)
    expect(contenedor.innerHTML).not.toContain('role:')
    expect(contenedor.innerHTML).not.toContain('4711')
  })
})
