/**
 * La tarjeta del director (fase 1, FASE-1.md §5) con dobles de la API.
 *
 * Lo que se fija, por estado y por rol:
 *  1. `encendido:false` → una frase, sin error y sin pestañas.
 *  2. En curso → lo dice y el botón queda en «Planeando…».
 *  3. Sin modelo → dice que planeó con reglas fijas y POR QUÉ.
 *  4. Fallido → lo dice; sólo al administrador le sugiere volver a planear.
 *  5. «Volver a planear» es SÓLO del administrador; 202, 409 y 403 dicen cosas
 *     distintas.
 *  6. Una orden: a quién (con enlace), la evidencia enlazada, la meta, lo
 *     descartado, el estado, y el botón al cajón con su `accionId`.
 *  7. «Cómo lo pensó» y «Lo que el director quiso y la regla no dejó» van
 *     plegados (`<details>`), no ausentes.
 */
import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { toasts } = vi.hoisted(() => ({ toasts: [] as Array<[string, string]> }))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, vars?: Record<string, string>) => (vars ? `${k}(${Object.values(vars).join(',')})` : k),
    locale: 'es',
  }),
}))
vi.mock('sonner', () => ({
  toast: {
    success: (m: string) => toasts.push(['success', m]),
    error: (m: string) => toasts.push(['error', m]),
    info: (m: string) => toasts.push(['info', m]),
  },
}))

import { PilotoDirectorVista } from './PilotoDirector'
import { normalizarHoy, normalizarSemana, type DirectorHoy, type ResultadoDeReplanear } from '@/lib/api/piloto-director'
import type { UseDirectorHoy, UseDirectorMetas } from '@/lib/hooks/piloto/use-piloto-director'

const HOY_BOGOTA = '2026-09-29'

const PLAN = {
  encendido: true,
  fecha: '2026-09-29',
  ciclo: {
    id: 'c-1',
    tipo: 'dia',
    estado: 'listo',
    inicio: '2026-09-29T10:02:11.000Z',
    fin: '2026-09-29T10:03:40.000Z',
    modelo: 'claude-fable-5-1',
    esfuerzo: 'medium',
    costoCop: 1_722,
    sinModeloPorque: null,
  },
  resumen: 'Hoy el foco es el recaudo: 12 cuotas vencen mañana.',
  pensamiento: 'Primero miré las cuotas que vencen mañana.\nDespués, las renovaciones.',
  prioridades: [
    { meta: { id: 'm-1', metrica: 'recaudo_a_tiempo', nombre: 'Recaudo a tiempo' }, porQue: 'Va 4 puntos debajo de su trayectoria.' },
  ],
  ordenes: [
    {
      ordenId: 'o-1',
      agente: 'contratos',
      agenteNombre: 'Contratos',
      proceso: 'gerente.renovacion_abrir',
      procesoNombre: 'Abrir la renovación',
      entidad: { tipo: 'contrato', id: 'k-1', nombre: 'Contrato #1617 · Apto 101', enlace: '/panel/inmobiliaria/contratos/k-1' },
      cuando: 'hoy',
      prioridad: 80,
      porQue: 'Vence en 88 días y Vinci lo marca con riesgo alto.',
      evidencia: [{ tipo: 'deteccion', ref: 'renovaciones:contrato:k-1', texto: 'Renovación P-7: faltan 88 días', enlace: '/panel/inmobiliaria/contratos/renovaciones' }],
      meta: { id: 'm-4', metrica: 'renovacion', nombre: 'Renovación' },
      alternativaDescartada: 'Esperar a la carta de incremento.',
      conflictoResuelto: null,
      estado: 'en_bandeja',
      accionId: 'a-1',
      motivoDeLaPerilla: 'Fase 1 del director: toda orden del director espera tu clic.',
    },
    {
      ordenId: 'o-2',
      agente: 'laura',
      agenteNombre: 'Laura',
      proceso: 'director.priorizar',
      procesoNombre: 'Priorizar en la cobranza',
      entidad: { tipo: 'deudor', id: 'd-1', nombre: 'Marta Gómez', enlace: null },
      cuando: 'hoy',
      prioridad: 40,
      porQue: 'Promesa rota ayer.',
      evidencia: [],
      meta: null,
      alternativaDescartada: null,
      conflictoResuelto: null,
      estado: 'la_hace_el_agente',
      accionId: null,
      motivoDeLaPerilla: 'Fase 1 del director: toda orden del director espera tu clic.',
    },
  ],
  retenciones: [
    {
      retencionId: 'r-1',
      entidad: { tipo: 'deudor', id: 'd-2', nombre: 'Luis Pérez', enlace: null },
      agentes: ['laura', 'cobri'],
      hasta: '2026-10-02T23:59:59.000-05:00',
      porQue: 'Prometió pagar el jueves por WhatsApp.',
      evidencia: [],
      estado: 'en_bandeja',
      accionId: 'a-9',
    },
  ],
  sugerencias: [{ agente: 'niti', agenteNombre: 'Niti', que: 'Revisar las fotos del inmueble', porQue: 'Lleva 45 días vacío.' }],
  propuestasDeAutonomia: [{ agente: 'contratos', agenteNombre: 'Contratos', de: 'copiloto', a: 'autonomo', evidencia: [] }],
  alertas: [{ nivel: 'atencion', que: 'Tres PQRS vencen hoy', porQue: 'Nadie las ha tomado.' }],
  rechazadas: [
    {
      ordenId: 'x-1',
      proceso: 'gerente.renovacion_abrir',
      entidad: { tipo: 'contrato', id: 'k-9', nombre: 'Contrato #2001' },
      motivo: 'La entidad no es de esta inmobiliaria',
    },
  ],
  grupoDeControl: { activo: true, omitidas: 3 },
}

function hoyCon(plan: unknown, extra: Partial<UseDirectorHoy> = {}): UseDirectorHoy {
  return {
    data: plan === null ? null : normalizarHoy(plan),
    isLoading: false,
    error: null,
    notAvailable: false,
    refetch: vi.fn(async () => {}),
    esperando: false,
    seCansoDeEsperar: false,
    pidiendoReplan: false,
    replanear: vi.fn(async (): Promise<ResultadoDeReplanear> => ({ estado: 'arranco', cicloId: 'c-2' })),
    ...extra,
  }
}

const METAS: UseDirectorMetas = {
  data: { encendido: true, metas: [] },
  isLoading: false,
  error: null,
  notAvailable: false,
  refetch: async () => {},
  enVuelo: null,
  actuar: async () => ({ ok: false, status: 500, error: 'x' }),
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  toasts.length = 0
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function render(hoy: UseDirectorHoy, { isAdmin = true, onAbrirAccion = vi.fn() } = {}) {
  act(() => {
    root.render(
      <PilotoDirectorVista hoy={hoy} metas={METAS} isAdmin={isAdmin} onAbrirAccion={onAbrirAccion} hoyEnBogota={HOY_BOGOTA} />,
    )
  })
  return { onAbrirAccion }
}

const q = (testid: string) => container.querySelector(`[data-testid="${testid}"]`)
const texto = () => container.textContent ?? ''
/** El plan con otro ciclo. Tipado suelto a propósito: es lo que manda el micro, sin normalizar. */
const conCiclo = (ciclo: Record<string, unknown>, resto: Record<string, unknown> = {}): unknown => ({
  ...PLAN,
  ...resto,
  ciclo: { ...PLAN.ciclo, ...ciclo },
})

describe('PilotoDirector — estados', () => {
  it('🔴 encendido:false: la frase de la especificación, sin error y sin pestañas', () => {
    render(hoyCon({ encendido: false }))
    expect(q('piloto-director-apagado')?.textContent).toContain('inmobiliaria.piloto.director.apagado')
    expect(q('fallo-de-carga')).toBeNull()
    expect(q('piloto-director-pestana-hoy')).toBeNull()
    expect(q('piloto-director-replanear')).toBeNull()
  })

  it('🔴 sin Piloto automático activo (04-10-2026): lo dice en una línea, muestra el último plan y no ofrece «Volver a planear»', () => {
    render(hoyCon({ ...PLAN, pilotoActivo: false }))
    expect(q('piloto-director-piloto-apagado')?.textContent).toContain('inmobiliaria.piloto.director.pilotoApagado')
    expect(q('piloto-director-replanear')).toBeNull()
    expect(q('piloto-director-pestana-hoy')).not.toBeNull()
  })

  it('un micro que no manda `pilotoActivo` cuenta como activo (como antes): sin la línea y con el botón', () => {
    render(hoyCon(PLAN))
    expect(q('piloto-director-piloto-apagado')).toBeNull()
    expect(q('piloto-director-replanear')).not.toBeNull()
  })

  it('«Volver a planear» con el Piloto apagado (409 piloto_apagado) lo dice, no «ya hay uno en curso»', async () => {
    render(
      hoyCon(PLAN, {
        replanear: vi.fn(async (): Promise<ResultadoDeReplanear> => ({ estado: 'error', status: 409, error: 'piloto_apagado' })),
      }),
    )
    await act(async () => {
      ;(q('piloto-director-replanear') as HTMLButtonElement).click()
    })
    expect(toasts).toEqual([['error', 'inmobiliaria.piloto.director.pilotoApagado']])
  })

  it('🔴 la pestaña «Semana» muestra el informe a la gerencia (#59)', () => {
    act(() => {
      root.render(
        <PilotoDirectorVista
          hoy={hoyCon(PLAN)}
          metas={METAS}
          isAdmin
          onAbrirAccion={vi.fn()}
          hoyEnBogota={HOY_BOGOTA}
          pestanaInicial="semana"
          semana={{
            data: normalizarSemana({ encendido: true, desde: '2026-09-29', hasta: '2026-10-05', resumen: ['El Piloto hizo solo 4 cosas.'] }),
            isLoading: false,
            error: null,
            notAvailable: false,
            refetch: async () => {},
          }}
        />,
      )
    })
    expect(q('piloto-director-pestana-semana')).not.toBeNull()
    expect(q('piloto-director-semana-resumen')?.textContent).toContain('El Piloto hizo solo 4 cosas.')
  })

  it('un 404 (un micro sin estas rutas) no pinta nada', () => {
    render(hoyCon(null, { notAvailable: true }))
    expect(container.innerHTML).toBe('')
  })

  it('cargando dice qué está leyendo', () => {
    render(hoyCon(null, { isLoading: true }))
    expect(q('piloto-director-cargando')?.textContent).toContain('inmobiliaria.piloto.director.cargando')
  })

  it('un fallo al leer se dice con FalloDeCarga (y no como «apagado»)', () => {
    render(hoyCon(null, { error: new Error('500') }))
    expect(q('piloto-director-fallo')).not.toBeNull()
    expect(q('fallo-de-carga')).not.toBeNull()
    expect(q('piloto-director-apagado')).toBeNull()
  })

  it('listo: a qué hora planeó, con qué y cuánto costó', () => {
    render(hoyCon(PLAN))
    const ciclo = q('piloto-director-ciclo')?.textContent ?? ''
    expect(ciclo).toContain('inmobiliaria.piloto.director.ciclo.listo(las 5:03')
    expect(ciclo).toContain('Claude Fable 5.1')
    expect(q('piloto-director-costo')?.textContent).toMatch(/\$\s1\.722/)
    expect(q('piloto-director-costo')?.textContent).not.toMatch(/US/)
    expect(q('piloto-director-resumen')?.textContent).toBe('Hoy el foco es el recaudo: 12 cuotas vencen mañana.')
    expect(q('piloto-director')?.getAttribute('data-estado')).toBe('listo')
  })

  it('en curso: lo dice y «Volver a planear» queda en «Planeando…»', () => {
    render(hoyCon(conCiclo({ estado: 'en_curso', fin: null, costoCop: null })))
    expect(q('piloto-director')?.getAttribute('data-estado')).toBe('en_curso')
    expect(q('piloto-director-ciclo')?.textContent).toContain('inmobiliaria.piloto.director.ciclo.enCurso')
    const boton = q('piloto-director-replanear') as HTMLButtonElement
    expect(boton.disabled).toBe(true)
    expect(boton.textContent).toContain('inmobiliaria.piloto.director.replanear.planeando')
  })

  it('🔴 sin modelo: planeó con reglas fijas, y dice POR QUÉ', () => {
    render(hoyCon(conCiclo({ estado: 'sin_modelo', modelo: null, costoCop: 0, sinModeloPorque: 'tope de IA al 92 %' })))
    expect(q('piloto-director-sin-modelo')?.textContent).toContain('inmobiliaria.piloto.director.ciclo.sinModeloTitulo')
    expect(q('piloto-director-sin-modelo')?.textContent).toContain('tope de IA al 92 %')
    // No se nombra un modelo que no se usó.
    expect(q('piloto-director-ciclo')?.textContent).not.toContain('Claude')
  })

  it('fallido: lo dice; sólo al administrador le sugiere volver a planear', () => {
    const plan = conCiclo({ estado: 'fallido', costoCop: null }, { resumen: null, ordenes: [] })
    render(hoyCon(plan), { isAdmin: true })
    expect(q('piloto-director-fallido')?.textContent).toContain('inmobiliaria.piloto.director.ciclo.fallidoAdmin')
    act(() => root.unmount())
    root = createRoot(container)
    render(hoyCon(plan), { isAdmin: false })
    expect(q('piloto-director-fallido')?.textContent).toContain('inmobiliaria.piloto.director.ciclo.fallidoTexto')
    expect(q('piloto-director-fallido')?.textContent).not.toContain('fallidoAdmin')
  })

  it('un plan de otro día lo dice', () => {
    render(hoyCon({ ...PLAN, fecha: '2026-09-27' }))
    expect(q('piloto-director-otro-dia')?.textContent).toContain('inmobiliaria.piloto.director.ciclo.otroDia')
  })

  it('pasados los 3 minutos de espera lo dice, sin error', () => {
    render(hoyCon(PLAN, { seCansoDeEsperar: true }))
    expect(q('piloto-director-se-canso')?.textContent).toContain('inmobiliaria.piloto.director.replanear.seCanso')
  })
})

describe('PilotoDirector — «Volver a planear» es sólo del administrador', () => {
  it('quien no es administrador no ve el botón', () => {
    render(hoyCon(PLAN), { isAdmin: false })
    expect(q('piloto-director-replanear')).toBeNull()
  })

  it.each([
    [{ estado: 'arranco', cicloId: 'c-2' }, 'success', 'arranco'],
    [{ estado: 'en_curso', cicloId: 'c-1' }, 'info', 'enCurso'],
    [{ estado: 'error', status: 403, error: 'solo_admin' }, 'error', 'soloAdmin'],
    [{ estado: 'error', status: 500, error: '500' }, 'error', 'fallo'],
  ] as const)('%o → toast %s', async (respuesta, tipo, clave) => {
    const hoy = hoyCon(PLAN, { replanear: vi.fn(async () => respuesta as ResultadoDeReplanear) })
    render(hoy)
    await act(async () => (q('piloto-director-replanear') as HTMLButtonElement).click())
    expect(hoy.replanear).toHaveBeenCalledTimes(1)
    expect(toasts).toEqual([[tipo, `inmobiliaria.piloto.director.replanear.${clave}`]])
  })
})

describe('PilotoDirector — el plan', () => {
  it('una orden: a quién (con enlace), la evidencia enlazada, la meta, lo descartado y el estado', () => {
    render(hoyCon(PLAN))
    const orden = q('piloto-director-orden-o-1')!
    expect(orden.textContent).toContain('Contratos')
    expect(orden.textContent).toContain('Abrir la renovación')
    const aQuien = [...orden.querySelectorAll('a')].find((a) => a.textContent === 'Contrato #1617 · Apto 101')
    expect(aQuien?.getAttribute('href')).toBe('/panel/inmobiliaria/contratos/k-1')
    expect(q('piloto-director-evidencia-o-1')?.querySelector('a')?.getAttribute('href')).toBe(
      '/panel/inmobiliaria/contratos/renovaciones',
    )
    expect(orden.textContent).toContain('inmobiliaria.piloto.director.porQue.meta(Renovación)')
    expect(orden.textContent).toContain('inmobiliaria.piloto.director.porQue.descarto(Esperar a la carta de incremento.)')
    expect(orden.textContent).toContain('inmobiliaria.piloto.director.orden.estado.en_bandeja')
    expect(orden.textContent).toContain('inmobiliaria.piloto.director.orden.cuando(hoy)')
  })

  it('las órdenes van de mayor a menor prioridad, y el motivo repetido se dice una sola vez', () => {
    render(hoyCon({ ...PLAN, ordenes: [...PLAN.ordenes].reverse() }))
    const ids = [...container.querySelectorAll('[data-testid^="piloto-director-orden-"]')].map((e) =>
      e.getAttribute('data-testid'),
    )
    expect(ids).toEqual(['piloto-director-orden-o-1', 'piloto-director-orden-o-2'])
    expect(q('piloto-director-motivo-comun')?.textContent).toContain('Fase 1 del director')
    expect(texto().split('Fase 1 del director').length - 1).toBe(1)
  })

  it('el botón de la orden abre el cajón de la Bandeja con su accionId y su por qué', async () => {
    const { onAbrirAccion } = render(hoyCon(PLAN))
    await act(async () => (q('piloto-director-abrir-o-1') as HTMLButtonElement).click())
    expect(onAbrirAccion).toHaveBeenCalledWith('a-1', {
      director: expect.objectContaining({
        porQue: 'Vence en 88 días y Vinci lo marca con riesgo alto.',
        meta: expect.objectContaining({ nombre: 'Renovación' }),
      }),
      motivo: 'Fase 1 del director: toda orden del director espera tu clic.',
    })
    // Sin fila en la Bandeja (la hace el agente solo), no hay botón.
    expect(q('piloto-director-abrir-o-2')).toBeNull()
  })

  it('retenciones, sugerencias, propuestas de autonomía, alertas y el grupo de control', () => {
    render(hoyCon(PLAN))
    const ret = q('piloto-director-retencion-r-1')!
    expect(ret.textContent).toContain('Luis Pérez')
    expect(ret.textContent).toContain('inmobiliaria.piloto.director.retencion.agentes(Laura, Cobri)')
    expect(q('piloto-director-abrir-retencion-r-1')).not.toBeNull()
    expect(q('piloto-director-sugerencias')?.textContent).toContain('Revisar las fotos del inmueble')
    expect(q('piloto-director-propuestas')?.textContent).toContain(
      'inmobiliaria.piloto.director.propuesta.cambio(inmobiliaria.piloto.autonomia.modo.copiloto,inmobiliaria.piloto.autonomia.modo.autonomo)',
    )
    expect(q('piloto-director-alertas')?.textContent).toContain('Tres PQRS vencen hoy')
    expect(q('piloto-director-control')?.textContent).toContain('inmobiliaria.piloto.director.grupoDeControl.omitidas(3)')
  })

  it('«Cómo lo pensó» va plegado con el pensamiento tal cual', () => {
    render(hoyCon(PLAN))
    const plegable = q('piloto-director-pensamiento') as HTMLDetailsElement
    expect(plegable.tagName).toBe('DETAILS')
    expect(plegable.open).toBe(false)
    expect(plegable.textContent).toContain('inmobiliaria.piloto.director.secciones.pensamiento')
    expect(plegable.textContent).toContain('Primero miré las cuotas que vencen mañana.')
  })

  it('sin pensamiento (planeó sin modelo), no hay plegable vacío', () => {
    render(hoyCon({ ...PLAN, pensamiento: null }))
    expect(q('piloto-director-pensamiento')).toBeNull()
  })

  it('«Lo que el director quiso y la regla no dejó» va plegado, con el motivo y el nombre del proceso', () => {
    render(hoyCon(PLAN))
    const plegable = q('piloto-director-rechazadas') as HTMLDetailsElement
    expect(plegable.tagName).toBe('DETAILS')
    expect(plegable.textContent).toContain('inmobiliaria.piloto.director.secciones.rechazadas')
    expect(plegable.textContent).toContain('Contrato #2001')
    expect(plegable.textContent).toContain('La entidad no es de esta inmobiliaria')
    // El proceso con su nombre (el de las órdenes), nunca el id técnico.
    expect(plegable.textContent).toContain('Abrir la renovación')
    expect(plegable.textContent).not.toContain('gerente.renovacion_abrir')
  })

  it('más de cinco órdenes: se ven cinco y un «Ver las N órdenes»', async () => {
    const ordenes = Array.from({ length: 7 }, (_, i) => ({ ...PLAN.ordenes[0], ordenId: `o-${i}`, prioridad: 100 - i }))
    render(hoyCon({ ...PLAN, ordenes }))
    expect(container.querySelectorAll('[data-testid^="piloto-director-orden-"]')).toHaveLength(5)
    await act(async () => (q('piloto-director-ver-todas') as HTMLButtonElement).click())
    expect(container.querySelectorAll('[data-testid^="piloto-director-orden-"]')).toHaveLength(7)
  })

  it('sin plan todavía (encendido, sin ciclo) lo dice', () => {
    render(hoyCon({ encendido: true, ciclo: null }))
    expect(q('piloto-director-sin-plan')?.textContent).toContain('inmobiliaria.piloto.director.sinPlan')
  })

  it('las pestañas: Hoy y Metas, con cuántas metas esperan', () => {
    const hoy = hoyCon(PLAN)
    act(() => {
      root.render(
        <PilotoDirectorVista
          hoy={hoy}
          metas={{
            ...METAS,
            data: {
              encendido: true,
              metas: [
                { id: 'm', metrica: 'r', nombre: 'R', estado: 'propuesta', direccion: 'subir', unidad: 'porcentaje', lineaBase: null, objetivo: null, actual: null, desde: null, hasta: null, estimada: false, porQue: null, serie: [], historial: [] },
              ],
            },
          }}
          isAdmin
          onAbrirAccion={() => {}}
          hoyEnBogota={HOY_BOGOTA}
        />,
      )
    })
    expect(q('piloto-director-pestana-hoy')?.textContent).toContain('inmobiliaria.piloto.director.pestanas.hoy')
    expect(q('piloto-director-pestana-metas')?.textContent).toContain('inmobiliaria.piloto.director.pestanas.porAceptar(1)')
  })
})

// Para que el tipo del plan de prueba no se aleje del contrato.
void (PLAN as unknown as DirectorHoy)
