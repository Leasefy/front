import { describe, it, expect } from 'vitest'
import {
  construirComparacion,
  factoresPresentes,
  etiquetaDeFactor,
  type CandidatoComparado,
} from './comparacion'
import type { LandlordCandidate, EvaluationResult } from '@/lib/api/applications.types'

function candidato(over: Partial<LandlordCandidate> = {}): LandlordCandidate {
  return {
    id: 'c1',
    tenantName: 'Ana Gómez',
    tenantEmail: 'ana@example.com',
    status: 'SUBMITTED',
    submittedAt: '2026-08-01T10:00:00.000Z',
    ...over,
  }
}

function entrada(
  c: Partial<LandlordCandidate>,
  e: Partial<EvaluationResult> | null,
  enCurso = false,
): CandidatoComparado {
  return {
    candidato: candidato(c),
    evaluacion: e ? ({ applicationId: c.id ?? 'c1', ...e } as EvaluationResult) : null,
    evaluacionEnCurso: enCurso,
  }
}

const buscar = (filas: ReturnType<typeof construirComparacion>, clave: string) =>
  filas.find((f) => f.clave === clave)

describe('construirComparacion', () => {
  it('marca quién va mejor en nivel, que es el orden A > B > C > D', () => {
    const filas = construirComparacion([
      entrada({ id: 'a' }, { level: 'C', totalScore: 55 }),
      entrada({ id: 'b' }, { level: 'A', totalScore: 88 }),
      entrada({ id: 'c' }, { level: 'B', totalScore: 70 }),
    ])
    expect(buscar(filas, 'nivel')?.mejores).toEqual([1])
  })

  it('un candidato sin evaluación no vale cero: vale «todavía no»', () => {
    // Confundir «no sabemos» con «malo» haría que el peor puntaje se lo lleve
    // quien todavía no fue analizado.
    const filas = construirComparacion([
      entrada({ id: 'a' }, { level: 'C', totalScore: 55 }),
      entrada({ id: 'b' }, null, true),
    ])
    const nivel = buscar(filas, 'nivel')
    expect(nivel?.celdas[1].texto).toBe('Analizando…')
    expect(nivel?.celdas[1].valor).toBeNull()
    // y el único con dato no queda marcado como "el mejor" de una comparación
    // de uno solo
    expect(nivel?.mejores).toEqual([])
  })

  it('un análisis EN CURSO no se lee como un resultado bueno', () => {
    // El objeto llega con los campos vacíos mientras corre. Leer un `undefined`
    // como «No necesita revisión» le daba la mejor marca de la fila a quien ni
    // siquiera fue analizado — lo vi en pantalla, no en un test.
    const filas = construirComparacion([
      entrada({ id: 'a' }, { level: 'B', requires_manual_review: true, integrity_flags: [] }),
      entrada({ id: 'b' }, { status: 'running' }, true),
    ])
    const revision = buscar(filas, 'revisionManual')
    expect(revision?.celdas[1].texto).toBe('Analizando…')
    expect(revision?.celdas[1].valor).toBeNull()
    expect(revision?.mejores).toEqual([])

    const señales = buscar(filas, 'integridad')
    expect(señales?.celdas[1].texto).toBe('Analizando…')
  })

  it('una señal grave pesa más que tres leves', () => {
    const filas = construirComparacion([
      entrada({ id: 'a' }, {
        integrity_flags: [
          { doc_type: 'cedula', code: 'x', severity: 'high', source: 'visual', detail: '' },
        ],
      }),
      entrada({ id: 'b' }, {
        integrity_flags: [
          { doc_type: 'cedula', code: 'x', severity: 'low', source: 'visual', detail: '' },
          { doc_type: 'cedula', code: 'y', severity: 'low', source: 'visual', detail: '' },
          { doc_type: 'cedula', code: 'z', severity: 'low', source: 'visual', detail: '' },
        ],
      }),
    ])
    const f = buscar(filas, 'integridad')
    // b tiene MÁS señales pero ninguna grave: va mejor
    expect(f?.mejores).toEqual([1])
    expect(f?.celdas[0].esAlerta).toBe(true)
    expect(f?.celdas[1].esAlerta).toBe(false)
  })

  it('la revisión manual se marca como alerta, no como puntaje bajo', () => {
    const filas = construirComparacion([
      entrada({ id: 'a' }, { requires_manual_review: true }),
      entrada({ id: 'b' }, { requires_manual_review: false }),
    ])
    const f = buscar(filas, 'revisionManual')
    expect(f?.celdas[0].esAlerta).toBe(true)
    expect(f?.celdas[0].texto).toContain('no se puede aprobar')
    expect(f?.mejores).toEqual([1])
  })

  it('si nadie tiene el dato, la fila no se dibuja', () => {
    // Una tabla de guiones no ayuda a decidir.
    const filas = construirComparacion([
      entrada({ id: 'a' }, { level: 'A' }),
      entrada({ id: 'b' }, { level: 'B' }),
    ])
    expect(buscar(filas, 'credito')).toBeUndefined()
    expect(buscar(filas, 'capacidad')).toBeUndefined()
  })

  it('cuando todos tienen el mismo valor lo dice, en vez de marcar a todos', () => {
    const filas = construirComparacion([
      entrada({ id: 'a' }, { level: 'B', totalScore: 70 }),
      entrada({ id: 'b' }, { level: 'B', totalScore: 70 }),
    ])
    const f = buscar(filas, 'nivel')
    expect(f?.todosIguales).toBe(true)
    expect(f?.mejores).toEqual([])
  })

  it('arma una fila por cada factor del puntaje, aunque sólo uno lo traiga', () => {
    const filas = construirComparacion([
      entrada({ id: 'a' }, {
        score_breakdown: {
          solvencia: { weight: 0.4, value: 80, weighted: 32, source: 'x' },
          credito: { weight: 0.6, value: 50, weighted: 30, source: 'x' },
        },
      }),
      entrada({ id: 'b' }, {
        score_breakdown: {
          solvencia: { weight: 0.4, value: 90, weighted: 36, source: 'x' },
        },
      }),
    ])
    expect(buscar(filas, 'factor:solvencia')?.mejores).toEqual([1])
    const credito = buscar(filas, 'factor:credito')
    expect(credito?.celdas[1].texto).toBeNull()
  })

  it('menos capacidad de pago no es mejor', () => {
    const filas = construirComparacion([
      entrada({ id: 'a' }, { credit_check: { status: 'approved', bureauScore: 700, monthlyCapacity: 1_000_000, reasonCode: null, progressPercentage: null } }),
      entrada({ id: 'b' }, { credit_check: { status: 'approved', bureauScore: 650, monthlyCapacity: 3_000_000, reasonCode: null, progressPercentage: null } }),
    ])
    expect(buscar(filas, 'capacidad')?.mejores).toEqual([1])
  })

  it('no revienta con una fecha inválida', () => {
    const filas = construirComparacion([
      entrada({ id: 'a', submittedAt: 'no-es-fecha' }, { level: 'A' }),
      entrada({ id: 'b' }, { level: 'B' }),
    ])
    expect(buscar(filas, 'postulacion')?.celdas[0].texto).toBeNull()
  })
})

describe('factoresPresentes', () => {
  it('conserva el orden de aparición y no repite', () => {
    const orden = factoresPresentes([
      entrada({ id: 'a' }, { score_breakdown: { credito: { weight: 1, value: 1, weighted: 1, source: '' } } }),
      entrada({ id: 'b' }, {
        score_breakdown: {
          solvencia: { weight: 1, value: 1, weighted: 1, source: '' },
          credito: { weight: 1, value: 1, weighted: 1, source: '' },
        },
      }),
    ])
    expect(orden).toEqual(['credito', 'solvencia'])
  })
})

describe('etiquetaDeFactor', () => {
  it('traduce las conocidas y hace legibles las que no', () => {
    expect(etiquetaDeFactor('solvencia')).toBe('Solvencia')
    expect(etiquetaDeFactor('financialStability')).toBe('Estabilidad financiera')
    expect(etiquetaDeFactor('algo_nuevo_del_backend')).toBe('Algo nuevo del backend')
  })
})
