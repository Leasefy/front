/**
 * «¿Opera sola?» en pantalla (24-09-2026). Se prueba el CONTENIDO del cajón
 * (abrir un Sheet por clic bajo happy-dom colgó la corrida: ver
 * `PilotoAutonomia.test.tsx`). Lo que se fija, con la inmobiliaria como está
 * hoy (el Gerente prendido en Copiloto, sin pases, el chat pidiendo el clic):
 *   · la frase dice si opera sola; nunca verde si el micro dice que no;
 *   · lo que falta va agrupado por QUIÉN lo destraba, y la misma falta en dos
 *     agentes se dice UNA vez con a quiénes afecta;
 *   · un agente apagado no aparece como «falta», pero sí en su fila;
 *   · cada interruptor: encendido, apagado o «no se ve desde aquí», con el
 *     nombre de la variable y nunca un valor;
 *   · por agente: modo, «nadie eligió», estado y sus procesos con sus límites;
 *   · cargando, falló, sin fuente y lista son estados distintos.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, vars?: Record<string, string>) => (vars ? `${k}(${Object.values(vars).join(',')})` : k),
    locale: 'es',
  }),
}))

import { PilotoOperaSolaContenido, faltasPorQuien } from './PilotoOperaSola'
import type {
  AgenteEnAutomatico,
  FaltaParaAutomatico,
  PilotoLoQueHizoResponse,
  PilotoQueFaltaResponse,
} from '@/lib/api/piloto'
import type { LecturaDelPiloto } from '@/lib/hooks/piloto/use-piloto-opera-sola'

const PASES: FaltaParaAutomatico = {
  id: 'interruptor:PILOTO_PASES_ENABLED',
  tipo: 'pases',
  que: 'No sé si los pases del Piloto están prendidos en el ERP.',
  quien: 'leasefy',
  como: 'Los prende Leasefy en el ERP.',
}
const falta = (id: string, quien: FaltaParaAutomatico['quien'], que: string): FaltaParaAutomatico => ({
  id,
  tipo: quien === 'programar' ? 'sin_cablear' : quien === 'leasefy' ? 'interruptor' : 'sin_modo',
  que,
  quien,
  como: `Cómo: ${que}`,
})

function agente(a: Partial<AgenteEnAutomatico> & Pick<AgenteEnAutomatico, 'agente' | 'nombre'>): AgenteEnAutomatico {
  return {
    modo: 'copiloto',
    modoElegido: true,
    corre: true,
    delegacion: { necesaria: false, estado: 'no_aplica', quien: null, desde: null },
    estado: 'listo',
    faltas: [],
    procesos: [],
    ...a,
  }
}

const HOY: PilotoQueFaltaResponse = {
  listo: false,
  frase: 'Todavía no opera sola: de 37 procesos, 0 ya operan solos, 12 siempre piden un clic y 25 están frenados.',
  conteo: { procesos: 38, operanSolos: 0, siempreHumanos: 12, frenados: 25, apagados: 1 },
  pendientes: { leasefy: 3, administrador: 3, programar: 1 },
  interruptores: [
    { id: 'PILOTO_GERENTE_V2', nombre: 'El Gerente del Piloto para tu inmobiliaria', donde: 'micro', variables: ['PILOTO_GERENTE_V2'], queHabilita: 'Recorre la operación.', encendido: true, detalle: 'Encendido para tu inmobiliaria.', quien: 'leasefy' },
    { id: 'PILOTO_PASES_ENABLED', nombre: 'Los pases del Piloto', donde: 'back', variables: ['PILOTO_PASES_ENABLED', 'PILOTO_CREDENCIAL_SECRET'], queHabilita: 'Actúa a nombre de quien lo puso en Automático.', encendido: null, detalle: 'Viven en el ERP: desde aquí no se ve.', quien: 'leasefy' },
    { id: 'CHAT_EJECUCION_SIN_CLIC_ENABLED', nombre: 'El chat actúa sin clic', donde: 'micro', variables: ['CHAT_EJECUCION_SIN_CLIC_ENABLED'], queHabilita: 'El chat hace lo que el modo deja.', encendido: false, detalle: 'Apagado: el chat pide el clic para todo. Lo prende Leasefy.', quien: 'leasefy' },
  ],
  migraciones: [
    { id: '20260924030000_perilla_del_piloto', donde: 'micro', queHabilita: 'Guardar tus topes.', aplicada: true },
    { id: '20260924110000_chat_ejecuciones', donde: 'micro', queHabilita: 'Que el chat ejecute sin clic.', aplicada: false },
  ],
  topes: { topeMontoCop: 5_000_000, topeDestinatarios: 10, graciaSegundos: 60, porDefecto: true },
  agentes: [
    agente({
      agente: 'contratos',
      nombre: 'contratos',
      modoElegido: false,
      estado: 'frenado',
      delegacion: { necesaria: true, estado: 'falta', quien: null, desde: null },
      faltas: [falta('modo:contratos', 'administrador', 'Nadie eligió su modo: nació en Copiloto.'), PASES],
      procesos: [
        { id: 'contratos.prorroga', agente: 'contratos', queHace: 'Prorroga el contrato vencido.', estado: 'frenado', faltas: [], siempreHumano: null, limites: [] },
        { id: 'contratos.cierre_del_arriendo', agente: 'contratos', queHace: 'Cierra el arriendo.', estado: 'siempre_humano', faltas: [], siempreHumano: 'Terminar un contrato es irreversible.', limites: [] },
        { id: 'gerente.renovacion_abrir', agente: 'contratos', queHace: 'Abre la renovación.', estado: 'frenado', faltas: [PASES], siempreHumano: null, limites: [] },
      ],
    }),
    agente({
      agente: 'cobranza',
      nombre: 'cobranza',
      estado: 'frenado',
      faltas: [falta('modo:cobranza', 'administrador', 'Está en Copiloto: prepara todo y te pide un clic.'), PASES],
    }),
    agente({
      agente: 'propietarios',
      nombre: 'propietarios',
      estado: 'frenado',
      faltas: [falta('cableado:propietarios.resumen_del_portal', 'programar', 'Todavía no obedece la perilla.')],
    }),
    agente({
      agente: 'retencion',
      nombre: 'retención',
      corre: false,
      estado: 'apagado',
      faltas: [{ id: 'apagado:retencion', tipo: 'agente_apagado', que: 'Está apagado en el servidor (RETENCION_ENABLED).', quien: 'leasefy', como: 'Lo prende Leasefy.' }],
    }),
    agente({ agente: 'mantenimiento', nombre: 'mantenimiento', estado: 'siempre_humano' }),
    agente({
      agente: 'chat',
      nombre: 'el chat',
      modoElegido: false,
      estado: 'frenado',
      faltas: [falta('interruptor:CHAT_EJECUCION_SIN_CLIC_ENABLED', 'leasefy', 'El chat actúa sin clic está apagado.')],
    }),
  ],
  tomadoAt: '2026-09-24T17:00:00.000Z',
}

function lectura<T>(data: T | null, extra: Partial<LecturaDelPiloto<T>> = {}): LecturaDelPiloto<T> {
  return { data, isLoading: false, error: null, notAvailable: false, refetch: vi.fn(async () => undefined), ...extra }
}
const HIZO: PilotoLoQueHizoResponse = {
  disponible: true,
  desde: '2026-08-25T00:00:00.000Z',
  dias: 30,
  frase: 'En los últimos 30 días el Piloto encontró 208 cosas por hacer: hizo solo 0, 0 con tu clic, 208 esperan tu clic.',
}

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const pintar = (queFalta: LecturaDelPiloto<PilotoQueFaltaResponse>, loQueHizo = lectura<PilotoLoQueHizoResponse>(HIZO)) =>
  act(() => root.render(<PilotoOperaSolaContenido queFalta={queFalta} loQueHizo={loQueHizo} />))
const q = (sel: string) => container.querySelector(sel)

describe('faltasPorQuien', () => {
  it('la misma falta en dos agentes, una vez con los dos; lo apagado no es una falta', () => {
    const g = faltasPorQuien(HOY.agentes)
    expect(g.leasefy.map((x) => x.falta.id)).toEqual(['interruptor:PILOTO_PASES_ENABLED', 'interruptor:CHAT_EJECUCION_SIN_CLIC_ENABLED'])
    expect(g.leasefy[0].agentes).toEqual(['contratos', 'cobranza'])
    expect(g.administrador.map((x) => x.falta.id)).toEqual(['modo:contratos', 'modo:cobranza'])
    expect(g.programar).toHaveLength(1)
    expect(JSON.stringify(g)).not.toContain('RETENCION_ENABLED')
  })
})

describe('PilotoOperaSolaContenido — la inmobiliaria de hoy', () => {
  it('la frase dice que todavía no opera sola, con lo que dice el micro', () => {
    pintar(lectura(HOY))
    const frase = q('[data-testid="piloto-opera-sola-frase"]')!
    expect(frase.textContent).toContain('inmobiliaria.piloto.operaSola.estadoNoListo')
    expect(frase.textContent).toContain('Todavía no opera sola: de 37 procesos')
    expect(frase.className).toContain('bg-warning-soft')
  })

  it('qué falta, por quién lo destraba, cada cosa una vez con a quiénes afecta', () => {
    pintar(lectura(HOY))
    const leasefy = q('[data-testid="piloto-opera-sola-quien-leasefy"]')!
    expect(leasefy.textContent).toContain('inmobiliaria.piloto.operaSola.quien.leasefy')
    expect(leasefy.querySelectorAll('li')).toHaveLength(2)
    expect(leasefy.textContent).toContain('inmobiliaria.piloto.operaSola.afecta(contratos, cobranza)')
    expect(leasefy.textContent).toContain('Los prende Leasefy en el ERP.')
    expect(q('[data-testid="piloto-opera-sola-quien-administrador"]')!.querySelectorAll('li')).toHaveLength(2)
    expect(q('[data-testid="piloto-opera-sola-quien-programar"]')!.textContent).toContain('Todavía no obedece la perilla.')
    // Retención está apagada: se dice en su fila, no como algo que falta.
    expect(q('[data-testid="piloto-opera-sola-que-falta"]')!.textContent).not.toContain('RETENCION_ENABLED')
    expect(q('[data-testid="piloto-opera-sola-agente-retencion"]')!.textContent).toContain('RETENCION_ENABLED')
    expect(q('[data-testid="piloto-opera-sola-agente-retencion"]')!.textContent).toContain('inmobiliaria.piloto.operaSola.estadoAgente.apagado')
  })

  it('los interruptores: encendido, apagado o «no se ve desde aquí», con el nombre de la variable', () => {
    pintar(lectura(HOY))
    const gerente = q('[data-testid="piloto-opera-sola-interruptor-PILOTO_GERENTE_V2"]')!
    expect(gerente.textContent).toContain('inmobiliaria.piloto.operaSola.interruptor.encendido')
    expect(gerente.textContent).toContain('Encendido para tu inmobiliaria.')
    const pases = q('[data-testid="piloto-opera-sola-interruptor-PILOTO_PASES_ENABLED"]')!
    expect(pases.textContent).toContain('inmobiliaria.piloto.operaSola.interruptor.noSeVe')
    expect(pases.textContent).toContain('PILOTO_PASES_ENABLED · PILOTO_CREDENCIAL_SECRET')
    expect(pases.textContent).toContain('inmobiliaria.piloto.operaSola.interruptor.donde.back')
    expect(q('[data-testid="piloto-opera-sola-interruptor-CHAT_EJECUCION_SIN_CLIC_ENABLED"]')!.textContent).toContain(
      'inmobiliaria.piloto.operaSola.interruptor.apagado',
    )
    // Sólo la migración que falta, no la aplicada.
    const migraciones = q('[data-testid="piloto-opera-sola-migraciones"]')!
    expect(migraciones.textContent).toContain('20260924110000_chat_ejecuciones')
    expect(migraciones.textContent).not.toContain('20260924030000_perilla_del_piloto')
  })

  it('por agente: modo, «nadie eligió», a nombre de quién, y sus procesos con su estado', () => {
    pintar(lectura(HOY))
    const contratos = q('[data-testid="piloto-opera-sola-agente-contratos"]')!
    expect(contratos.textContent).toContain('Contratos')
    expect(contratos.textContent).toContain('inmobiliaria.piloto.autonomia.modo.copiloto')
    expect(contratos.textContent).toContain('inmobiliaria.piloto.operaSola.sinModoElegido')
    expect(contratos.textContent).toContain('inmobiliaria.piloto.operaSola.estadoAgente.frenado')
    // En Copiloto no se habla de delegación: primero el modo.
    expect(contratos.textContent).not.toContain('inmobiliaria.piloto.operaSola.delegacion')
    expect(q('[data-testid="piloto-opera-sola-proceso-contratos.prorroga"]')).toBeNull()
    act(() => (q('[data-testid="piloto-opera-sola-ver-contratos"]') as HTMLButtonElement).click())
    expect(q('[data-testid="piloto-opera-sola-proceso-contratos.cierre_del_arriendo"]')!.textContent).toContain(
      'Terminar un contrato es irreversible.',
    )
    expect(q('[data-testid="piloto-opera-sola-proceso-gerente.renovacion_abrir"]')!.textContent).toContain(
      'No sé si los pases del Piloto están prendidos',
    )
    expect(q('[data-testid="piloto-opera-sola-agente-mantenimiento"]')!.textContent).toContain(
      'inmobiliaria.piloto.operaSola.estadoAgente.siempre_humano',
    )
  })

  it('en Automático con su delegación, dice a nombre de quién; sus límites se ven', () => {
    const listo: PilotoQueFaltaResponse = {
      ...HOY,
      listo: true,
      frase: 'Tu inmobiliaria puede operar sola en Automático.',
      pendientes: { leasefy: 0, administrador: 0, programar: 0 },
      agentes: [
        agente({
          agente: 'contratos',
          nombre: 'contratos',
          modo: 'autonomo',
          delegacion: { necesaria: true, estado: 'registrada', quien: 'Nico García', desde: '2026-09-24T10:00:00Z' },
          procesos: [
            {
              id: 'gerente.firma_por_vencer',
              agente: 'contratos',
              queHace: 'Recuerda firmar.',
              estado: 'opera_solo',
              faltas: [],
              siempreHumano: null,
              limites: ['Solo hasta 10 personas por envío; más, te pide un clic.'],
            },
          ],
        }),
      ],
    }
    pintar(lectura(listo))
    const frase = q('[data-testid="piloto-opera-sola-frase"]')!
    expect(frase.textContent).toContain('inmobiliaria.piloto.operaSola.estadoListo')
    expect(frase.className).toContain('bg-success-soft')
    expect(q('[data-testid="piloto-opera-sola-que-falta"]')!.textContent).toContain('inmobiliaria.piloto.operaSola.nadaQueFalta')
    expect(q('[data-testid="piloto-opera-sola-agente-contratos"]')!.textContent).toContain(
      'inmobiliaria.piloto.operaSola.delegacion.registrada(Nico García)',
    )
    act(() => (q('[data-testid="piloto-opera-sola-ver-contratos"]') as HTMLButtonElement).click())
    expect(q('[data-testid="piloto-opera-sola-proceso-gerente.firma_por_vencer"]')!.textContent).toContain('10 personas por envío')
  })

  it('lo que hizo: la frase del micro, o que no se pudo leer', () => {
    pintar(lectura(HOY))
    expect(q('[data-testid="piloto-opera-sola-lo-que-hizo"]')!.textContent).toContain('208 esperan tu clic')
    pintar(lectura(HOY), lectura<PilotoLoQueHizoResponse>(null, { error: '503' }))
    expect(q('[data-testid="piloto-opera-sola-lo-que-hizo"] [data-testid="fallo-de-carga"]')).not.toBeNull()
  })
})

describe('PilotoOperaSolaContenido — estados', () => {
  it('cargando, falló y sin fuente son distintos, y ninguno se pinta como «lista»', () => {
    pintar(lectura<PilotoQueFaltaResponse>(null, { isLoading: true }))
    expect(q('[data-testid="piloto-opera-sola-cargando"]')).not.toBeNull()
    pintar(lectura<PilotoQueFaltaResponse>(null, { error: '503' }))
    expect(q('[data-testid="fallo-de-carga"]')).not.toBeNull()
    pintar(lectura<PilotoQueFaltaResponse>(null, { notAvailable: true }))
    expect(q('[data-testid="piloto-opera-sola-sin-fuente"]')).not.toBeNull()
    expect(container.textContent).not.toContain('estadoListo')
  })
})
