/**
 * @vitest-environment happy-dom
 *
 * Laboratorio del maestro (Nico, 19-10-2026: «quiero que al final el maestro sea así de crack»; «Repetición + Correr
 * ahora»). Con movimiento reducido (la noche se ve entera de una vez): los contadores, la bitácora con el nombre donde
 * dice «I1», la mesa con lo «Por revisar» y su porqué, el campo de diferencias, el índice; «Correr ahora» pide confirmar
 * con el costo y el tope y, confirmado, abre la noche nueva; una noche corriendo se ve EN VIVO.
 */
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const red = vi.hoisted(() => ({ lab: vi.fn(), bitacora: vi.fn(), correr: vi.fn() }))
vi.mock('@/lib/admin/agent-api', () => ({
  getLaboratorioDelMaestro: red.lab,
  getBitacoraDelMaestro: red.bitacora,
  correrElMaestroAhora: red.correr,
}))
vi.mock('framer-motion', async (orig) => ({ ...(await orig<typeof import('framer-motion')>()), useReducedMotion: () => true }))

import { Laboratorio } from './Laboratorio'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const C1 = '50000000-0000-4000-8000-000000000001'
const ensayo = {
  version: 1,
  veredicto: 'empeora',
  resumen: 'En 3 inmobiliarias, de 150 decisiones de una persona en 30 días, 120 (80 %) se aprobaron tal cual.',
  cifras: { decisiones_que_se_ahorran: 150 },
  filas: ['I1', 'I2', 'I3'],
  dias: ['2026-10-16', '2026-10-17'],
  grillas: [{ medida: 'decisiones de una persona', referencia: [[5, 5], [5, 5], [5, 5]], conLaMejora: [[0, 0], [0, 0], [0, 0]] }],
  porInmobiliaria: [
    { alias: 'I1', veredicto: 'empeora', cifras: { descartadas: 10 } },
    { alias: 'I2', veredicto: 'mejora', cifras: {} },
    { alias: 'I3', veredicto: 'empeora', cifras: {} },
  ],
}
const LAB = {
  prendido: true,
  topeUsd: 0.5,
  costoEstimadoUsd: 0.084,
  enCurso: null,
  corridaId: C1,
  corrida: { id: C1, dia: '2026-10-18', origen: 'noche', pedidaPor: null, estado: 'listo', modelo: 'claude-sonnet-5-5', costoUsd: 0.084, diarios: 90, inmobiliarias: 3, insights: 1, creadaEn: '2026-10-19T06:31:00.000Z' },
  corridas: [{ id: C1, dia: '2026-10-18', origen: 'noche', estado: 'listo', costoUsd: 0.084, creadaEn: '2026-10-19T06:31:00.000Z' }],
  bitacora: [
    { orden: 0, en: '2026-10-19T06:30:00.000Z', rol: 'archivista', paso: 'inicio', texto: 'Empieza la noche.', detalle: {}, nombre: null },
    { orden: 1, en: '2026-10-19T06:30:01.000Z', rol: 'lector', paso: 'leyo', texto: 'Leyó I1: 30 diarios.', detalle: { alias: 'I1', tenantId: 'a' }, nombre: 'Portofino' },
    { orden: 2, en: '2026-10-19T06:30:40.000Z', rol: 'pensador', paso: 'insight', texto: 'Cobri se aprueba siempre en I1', detalle: {}, nombre: null },
    { orden: 3, en: '2026-10-19T06:30:41.000Z', rol: 'verificador', paso: 'ensayo', texto: 'Cobri en Automático → EMPEORA.', detalle: { huella: 'h1', veredicto: 'empeora' }, nombre: null },
    { orden: 4, en: '2026-10-19T06:30:50.000Z', rol: 'archivista', paso: 'fin', texto: 'Listo: 0 para aprobar, 1 por revisar.', detalle: {}, nombre: null },
  ],
  inmobiliarias: [
    { alias: 'I1', tenantId: 'a', nombre: 'Portofino', diarios: 30, preguntas: 12, categorias: { tamano: 'pequena', ciudad: 'medellin', negocio: 'arriendos' }, agentes: [{ agente: 'pagos', modo: 'copiloto', acciones30d: 50, malas30d: 10 }] },
    { alias: 'I2', tenantId: 'b', nombre: 'Casas del Valle', diarios: 30, preguntas: 4, categorias: { tamano: 'pequena', ciudad: 'medellin', negocio: 'arriendos' }, agentes: [] },
    { alias: 'I3', tenantId: 'c', nombre: 'Arrendamientos Sur', diarios: 30, preguntas: 0, categorias: { tamano: 'pequena', ciudad: 'medellin', negocio: 'arriendos' }, agentes: [] },
  ],
  propuestas: [
    {
      id: 'p1',
      huella: 'h1',
      tipo: 'modo',
      que: 'Cobri (pagos) en Automático',
      estado: 'por_revisar',
      veredicto: 'por_revisar',
      motivos: ['ensayo_empeora'],
      categoria: 'Pequeñas (hasta 149 contratos activos)',
      porque: 'Se aprueba casi todo en tres inmobiliarias pequeñas.',
      evidencia: [{ alias: 'I1', nombre: 'Portofino' }],
      alcance: 3,
      ensayo,
      revision: null,
      reparto: null,
      medicion: null,
    },
  ],
  mediciones: [],
  ontologia: { agentes: [{ id: 'pagos', nombre: 'Cobri', funcion: 'pagos' }], limites: 8 },
  generadoEn: '2026-10-19T07:00:00.000Z',
}

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  red.lab.mockReset()
  red.bitacora.mockReset()
  red.correr.mockReset()
  red.lab.mockResolvedValue(LAB)
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})
const asentar = async () => {
  for (let i = 0; i < 6; i++) await act(async () => await Promise.resolve())
}
const boton = (t: string) => [...container.querySelectorAll('button')].find((b) => b.textContent?.trim().startsWith(t))

describe('el laboratorio del maestro', () => {
  it('[LAB-F:noche] contadores, bitácora con nombres, mesa «por revisar», campo de diferencias e índice', async () => {
    await act(async () => root.render(<Laboratorio onVerMejoras={() => undefined} />))
    await asentar()
    const lab = container.querySelector('[data-maestro-laboratorio]')
    expect(lab?.textContent).toContain('Por revisar1')
    expect(lab?.textContent).toContain('US$0,084')
    const bitacora = container.querySelector('[data-maestro-bitacora]')
    expect(bitacora?.textContent).toContain('Leyó Portofino: 30 diarios.')
    expect(bitacora?.textContent).toContain('Listo: 0 para aprobar, 1 por revisar.')
    expect(container.textContent).toContain('por revisar · el ensayo dice que empeora')
    expect(container.textContent).toContain('120 (80 %) se aprobaron tal cual')
    // El campo de diferencias: lo que pasó, con la mejora y la diferencia (3 × 2 cada una).
    expect(container.querySelectorAll('[aria-label="lo que pasó"] span').length).toBe(6)
    expect(container.querySelectorAll('[aria-label="diferencia"] span').length).toBe(6)
    expect(container.querySelector('[data-maestro-indice="p1"]')?.textContent).toContain('Cobri (pagos) en Automático')
    expect(container.textContent).toContain('Cobri se aprueba siempre en Portofino')
    expect(red.lab).toHaveBeenCalledWith(null, expect.anything())
  })

  it('[LAB-F:correr] «Correr ahora» pide confirmar con el costo y el tope; confirmado, abre la noche nueva', async () => {
    red.correr.mockResolvedValue({ corridaId: 'c-nueva', como: 'inngest', mensaje: 'Empezó. La ves en vivo aquí.' })
    await act(async () => root.render(<Laboratorio onVerMejoras={() => undefined} />))
    await asentar()
    await act(async () => boton('Correr ahora')!.click())
    expect(red.correr).not.toHaveBeenCalled()
    expect(container.textContent).toContain('Las últimas noches costaron unos US$0,084; el tope es US$0,500.')
    await act(async () => boton('Sí, correrla ahora')!.click())
    await asentar()
    expect(red.correr).toHaveBeenCalledTimes(1)
    expect(red.lab).toHaveBeenLastCalledWith('c-nueva', expect.anything())
    expect(container.textContent).toContain('Empezó. La ves en vivo aquí.')
  })

  it('[LAB-F:vivo] una noche corriendo se ve EN VIVO y no deja correr otra', async () => {
    red.lab.mockResolvedValue({ ...LAB, enCurso: { corridaId: C1, desde: '2026-10-19T06:30:00.000Z' }, corrida: null, propuestas: [] })
    red.bitacora.mockResolvedValue({ pasos: [], terminada: false, guardada: false })
    await act(async () => root.render(<Laboratorio onVerMejoras={() => undefined} />))
    await asentar()
    expect(container.querySelector('[data-maestro-en-vivo]')).not.toBeNull()
    expect(boton('Correr ahora')?.disabled).toBe(true)
  })
})
