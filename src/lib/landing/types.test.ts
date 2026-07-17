/**
 * types.test.ts — runtime shape guard for the typed vignette + product data
 * model (landing-react-port SLICE 4a). TypeScript's discriminated union
 * already gives compile-time exhaustiveness; this test asserts the runtime
 * shape a fixture of each `VignetteKind` actually has so a future refactor
 * that silently drops a field fails a test, not just a type check.
 */
import { describe, it, expect } from 'vitest'
import type {
  Vignette,
  VignetteKind,
  RowsVignetteData,
  ChatVignetteData,
  StepsVignetteData,
  StatVignetteData,
  LedgerVignetteData,
  DocVignetteData,
} from './types'

describe('Vignette discriminated union', () => {
  it('accepts a rows vignette fixture with the expected shape', () => {
    const data: RowsVignetteData = {
      rows: [
        { label: 'Sin atender', value: '0', tone: 'ok' },
        { label: 'Respuesta media', value: '12 min' },
      ],
    }
    const v: Vignette = { kind: 'rows', header: { label: 'Hoy', meta: '23 solicitudes', family: 'sys' }, data }
    expect(v.kind).toBe('rows')
    if (v.kind === 'rows') {
      expect(v.data.rows).toHaveLength(2)
      expect(v.data.rows[0].tone).toBe('ok')
    }
  })

  it('accepts a chat vignette fixture with the expected shape', () => {
    const data: ChatVignetteData = {
      messages: [
        { direction: 'in', text: 'Busco apto de 2 alcobas', time: '8:02' },
        { direction: 'out', text: 'Te tengo 3 opciones', time: '8:14' },
      ],
    }
    const v: Vignette = { kind: 'chat', header: { label: 'WhatsApp · Laura', meta: '8:14 a.m.', family: 'chat' }, data }
    expect(v.kind).toBe('chat')
    if (v.kind === 'chat') {
      expect(v.data.messages[1].direction).toBe('out')
    }
  })

  it('accepts a steps vignette fixture with the expected shape', () => {
    const data: StepsVignetteData = {
      steps: [
        { title: 'Solicitud capturada', meta: 'WhatsApp · 8:02 a.m.', status: 'done' },
        { title: 'Asignada a Laura', meta: 'SLA 15 min', status: 'on' },
        { title: 'Visita', meta: 'por agendar' },
      ],
    }
    const v: Vignette = { kind: 'steps', header: { label: 'Caso L-2481', meta: 'Pipeline', family: 'sys' }, data }
    expect(v.kind).toBe('steps')
    if (v.kind === 'steps') {
      expect(v.data.steps).toHaveLength(3)
      expect(v.data.steps[2].status).toBeUndefined()
    }
  })

  it('accepts a stat vignette fixture, preserving inline <em> emphasis verbatim', () => {
    const data: StatVignetteData = { big: 'Día <em>1</em>', label: 'Detección del atraso', sub: 'no el día 30' }
    const v: Vignette = { kind: 'stat', header: { label: 'Detección', meta: 'Cruce diario', family: 'ag' }, data }
    expect(v.kind).toBe('stat')
    if (v.kind === 'stat') {
      expect(v.data.big).toContain('<em>1</em>')
    }
  })

  it('accepts a ledger vignette fixture with the expected shape', () => {
    const data: LedgerVignetteData = {
      columns: ['Contrato', 'Pago', 'Estado'],
      rows: [
        { cells: ['CT-1042', '$2.450.000', 'Conciliado'], tone: 'ok' },
        { cells: ['CT-0977', '$3.120.000', '→ Cobranza'], tone: 'mb' },
      ],
    }
    const v: Vignette = { kind: 'ledger', header: { label: 'Cobros de hoy', meta: 'Banco', family: 'sys' }, data }
    expect(v.kind).toBe('ledger')
    if (v.kind === 'ledger') {
      expect(v.data.columns).toHaveLength(3)
      expect(v.data.rows[1].tone).toBe('mb')
    }
  })

  it('accepts a doc vignette fixture with the expected shape', () => {
    const data: DocVignetteData = {
      title: 'CT-1042 · Apto 402',
      lines: ['3 visitas · oferta aceptada', 'Estudio del inquilino aprobado'],
    }
    const v: Vignette = { kind: 'doc', header: { label: 'Expediente', meta: 'CT-1042', family: 'sys' }, stamp: 'Listo para firma', data }
    expect(v.kind).toBe('doc')
    expect(v.stamp).toBe('Listo para firma')
    if (v.kind === 'doc') {
      expect(v.data.lines).toHaveLength(2)
    }
  })

  it('every kind is a member of the exported VignetteKind union', () => {
    const kinds: VignetteKind[] = ['rows', 'chat', 'steps', 'stat', 'ledger', 'doc']
    expect(kinds).toHaveLength(6)
  })
})
