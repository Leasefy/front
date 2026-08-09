/**
 * Comparación de candidatos, lado a lado.
 *
 * Poner dos fichas una al lado de la otra no es comparar: comparar es que el
 * ojo encuentre **dónde difieren** sin leer todo. Por eso cada fila sabe cuál
 * es el mejor valor y quién lo tiene.
 *
 * Reglas que importan:
 * - Un candidato sin evaluación todavía NO vale cero. Vale «todavía no».
 *   Confundir «no sabemos» con «malo» es el mismo error que confundir un 404
 *   con una lista vacía (ver src/lib/errores/clasificar.ts).
 * - Si nadie tiene el dato, la fila no se dibuja: una tabla de guiones no
 *   ayuda a decidir.
 * - `requiere revisión manual` no es un punto en contra, es un portón: no se
 *   puede aprobar hasta resolverlo. Se marca aparte.
 */

import type {
  LandlordCandidate,
  EvaluationResult,
  IntegrityFlag,
} from '@/lib/api/applications.types'

export interface CandidatoComparado {
  candidato: LandlordCandidate
  evaluacion: EvaluationResult | null
  /** true mientras el análisis sigue corriendo: no hay valores, y eso se dice. */
  evaluacionEnCurso: boolean
}

/** Cómo se ordena una fila para decidir quién va "mejor". */
export type Sentido = 'másEsMejor' | 'menosEsMejor' | 'sinOrden'

export interface CeldaComparacion {
  /** Lo que se muestra. `null` = no tenemos el dato para este candidato. */
  texto: string | null
  /** Para ordenar. `null` = no comparable. */
  valor: number | null
  /** Un matiz opcional bajo el texto (p. ej. el origen del dato). */
  detalle?: string | null
  /** Marca de alerta: pinta la celda como riesgo, no como "peor". */
  esAlerta?: boolean
}

export interface FilaComparacion {
  clave: string
  etiqueta: string
  /** Explica qué significa la fila; va en un tooltip, no en la tabla. */
  ayuda?: string
  sentido: Sentido
  celdas: CeldaComparacion[]
  /** Índices de los candidatos que tienen el mejor valor. Vacío si no aplica. */
  mejores: number[]
  /** true si todos los que tienen dato tienen el MISMO valor. */
  todosIguales: boolean
}

const NIVEL_A_NUMERO: Record<string, number> = { A: 4, B: 3, C: 2, D: 1 }

const RECOMENDACION: Record<string, string> = {
  approve: 'Aprobar',
  preapprove: 'Pasar a revisión',
  needs_info: 'Pedir más información',
  reject: 'Rechazar',
}

const ESTADO_CREDITO: Record<string, string> = {
  approved: 'Aprobado',
  rejected_credit: 'Rechazado por historial',
  rejected_income: 'Rechazado por ingresos',
  blocked_admin: 'Bloqueado',
  awaiting_authorization: 'Esperando autorización',
  error: 'No se pudo consultar',
  not_evaluated: 'Sin consultar',
}

const CREDITO_BUENO = new Set(['approved'])

function pesos(flags: IntegrityFlag[] | undefined): { alta: number; media: number; baja: number; total: number } {
  const f = flags ?? []
  return {
    alta: f.filter((x) => x.severity === 'high').length,
    media: f.filter((x) => x.severity === 'medium').length,
    baja: f.filter((x) => x.severity === 'low').length,
    total: f.length,
  }
}

function moneda(n: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)
}

/** Las claves de factor presentes en al menos un candidato, en orden estable. */
export function factoresPresentes(entradas: CandidatoComparado[]): string[] {
  const vistas = new Set<string>()
  const orden: string[] = []
  for (const e of entradas) {
    for (const clave of Object.keys(e.evaluacion?.score_breakdown ?? {})) {
      if (!vistas.has(clave)) {
        vistas.add(clave)
        orden.push(clave)
      }
    }
  }
  return orden
}

function marcarMejores(celdas: CeldaComparacion[], sentido: Sentido): { mejores: number[]; todosIguales: boolean } {
  const conValor = celdas
    .map((c, i) => ({ v: c.valor, i }))
    .filter((x): x is { v: number; i: number } => x.v !== null)

  if (sentido === 'sinOrden' || conValor.length < 2) {
    const iguales =
      conValor.length > 1 && conValor.every((x) => x.v === conValor[0].v)
    return { mejores: [], todosIguales: iguales }
  }

  const todosIguales = conValor.every((x) => x.v === conValor[0].v)
  if (todosIguales) return { mejores: [], todosIguales: true }

  const mejor =
    sentido === 'másEsMejor'
      ? Math.max(...conValor.map((x) => x.v))
      : Math.min(...conValor.map((x) => x.v))

  return { mejores: conValor.filter((x) => x.v === mejor).map((x) => x.i), todosIguales: false }
}

function fila(
  clave: string,
  etiqueta: string,
  sentido: Sentido,
  celdas: CeldaComparacion[],
  ayuda?: string,
): FilaComparacion | null {
  // Si nadie tiene el dato, la fila no aporta: no se dibuja.
  if (celdas.every((c) => c.texto === null)) return null
  const { mejores, todosIguales } = marcarMejores(celdas, sentido)
  return { clave, etiqueta, ayuda, sentido, celdas, mejores, todosIguales }
}

export function construirComparacion(entradas: CandidatoComparado[]): FilaComparacion[] {
  const filas: (FilaComparacion | null)[] = []

  // ── Nivel y puntaje ────────────────────────────────────────────────────────
  filas.push(
    fila(
      'nivel',
      'Nivel',
      'másEsMejor',
      entradas.map(({ candidato, evaluacion, evaluacionEnCurso }) => {
        const nivel = evaluacion?.level ?? candidato.riskScore?.level
        const puntaje = evaluacion?.totalScore ?? candidato.riskScore?.totalScore
        if (!nivel) {
          return {
            texto: evaluacionEnCurso ? 'Analizando…' : null,
            valor: null,
            detalle: evaluacionEnCurso ? 'todavía no hay resultado' : null,
          }
        }
        return {
          texto: nivel,
          valor: NIVEL_A_NUMERO[nivel] ?? null,
          detalle: puntaje !== undefined ? `${puntaje} / 100` : null,
        }
      }),
      'A es el mejor y D el más riesgoso. Sale del análisis del inquilino.',
    ),
  )

  // ── Recomendación ──────────────────────────────────────────────────────────
  filas.push(
    fila(
      'recomendacion',
      'Qué recomienda el análisis',
      'sinOrden',
      entradas.map(({ evaluacion }) => ({
        texto: evaluacion?.recommendation ? RECOMENDACION[evaluacion.recommendation] ?? null : null,
        valor: null,
        detalle:
          evaluacion?.confidence !== undefined
            ? `confianza ${Math.round(evaluacion.confidence * 100)}%`
            : null,
      })),
    ),
  )

  // ── Portón de revisión manual ──────────────────────────────────────────────
  filas.push(
    fila(
      'revisionManual',
      'Necesita revisión manual',
      'menosEsMejor',
      entradas.map(({ evaluacion }) => {
        if (!evaluacion) return { texto: null, valor: null }
        const requiere = evaluacion.requires_manual_review === true
        return {
          texto: requiere ? 'Sí, no se puede aprobar todavía' : 'No',
          valor: requiere ? 1 : 0,
          esAlerta: requiere,
        }
      }),
      'Cuando el análisis encuentra algo que no cuadra, la aprobación queda trabada hasta que alguien lo revise.',
    ),
  )

  // ── Señales de integridad ──────────────────────────────────────────────────
  filas.push(
    fila(
      'integridad',
      'Señales en los documentos',
      'menosEsMejor',
      entradas.map(({ evaluacion }) => {
        if (!evaluacion) return { texto: null, valor: null }
        const p = pesos(evaluacion.integrity_flags)
        if (p.total === 0) return { texto: 'Ninguna', valor: 0 }
        const partes = [
          p.alta ? `${p.alta} grave${p.alta > 1 ? 's' : ''}` : null,
          p.media ? `${p.media} media${p.media > 1 ? 's' : ''}` : null,
          p.baja ? `${p.baja} leve${p.baja > 1 ? 's' : ''}` : null,
        ].filter(Boolean)
        return {
          texto: `${p.total}`,
          // Una grave pesa más que tres leves: por eso no se comparan totales.
          valor: p.alta * 100 + p.media * 10 + p.baja,
          detalle: partes.join(' · '),
          esAlerta: p.alta > 0,
        }
      }),
      'Inconsistencias detectadas entre los soportes que subió el candidato.',
    ),
  )

  // ── Estudio de crédito ─────────────────────────────────────────────────────
  filas.push(
    fila(
      'credito',
      'Estudio de crédito',
      'másEsMejor',
      entradas.map(({ evaluacion }) => {
        const c = evaluacion?.credit_check
        if (!c) return { texto: null, valor: null }
        return {
          texto: ESTADO_CREDITO[c.status] ?? c.status,
          valor: CREDITO_BUENO.has(c.status) ? 1 : 0,
          detalle: c.bureauScore !== null ? `puntaje ${c.bureauScore}` : null,
          esAlerta: c.status.startsWith('rejected') || c.status === 'blocked_admin',
        }
      }),
    ),
  )

  // ── Capacidad mensual ──────────────────────────────────────────────────────
  filas.push(
    fila(
      'capacidad',
      'Capacidad de pago mensual',
      'másEsMejor',
      entradas.map(({ evaluacion }) => {
        const cap = evaluacion?.credit_check?.monthlyCapacity
        if (cap === null || cap === undefined) return { texto: null, valor: null }
        return { texto: moneda(cap), valor: cap }
      }),
      'Cuánto puede pagar al mes según el estudio, no lo que declaró.',
    ),
  )

  // ── Un renglón por factor del puntaje ──────────────────────────────────────
  for (const clave of factoresPresentes(entradas)) {
    filas.push(
      fila(
        `factor:${clave}`,
        etiquetaDeFactor(clave),
        'másEsMejor',
        entradas.map(({ evaluacion }) => {
          const f = evaluacion?.score_breakdown?.[clave]
          if (!f) return { texto: null, valor: null }
          return {
            texto: `${Math.round(f.value)}`,
            valor: f.value,
            detalle: `peso ${Math.round(f.weight * 100)}%`,
          }
        }),
      ),
    )
  }

  // ── Documentos analizados ──────────────────────────────────────────────────
  filas.push(
    fila(
      'documentos',
      'Documentos analizados',
      'másEsMejor',
      entradas.map(({ evaluacion }) => {
        const docs = evaluacion?.documentsAnalyzed
        if (!docs) return { texto: null, valor: null }
        return { texto: `${docs.length}`, valor: docs.length }
      }),
    ),
  )

  // ── Cuándo se postuló ──────────────────────────────────────────────────────
  filas.push(
    fila(
      'postulacion',
      'Se postuló',
      'sinOrden',
      entradas.map(({ candidato }) => {
        if (!candidato.submittedAt) return { texto: null, valor: null }
        const fecha = new Date(candidato.submittedAt)
        if (Number.isNaN(fecha.getTime())) return { texto: null, valor: null }
        return {
          texto: fecha.toLocaleDateString('es-CO', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }),
          valor: fecha.getTime(),
        }
      }),
    ),
  )

  // ── Nota privada ───────────────────────────────────────────────────────────
  filas.push(
    fila(
      'nota',
      'Tu nota privada',
      'sinOrden',
      entradas.map(({ candidato }) => ({
        texto: candidato.privateNote?.trim() || null,
        valor: null,
      })),
    ),
  )

  return filas.filter((f): f is FilaComparacion => f !== null)
}

/** Traduce la clave cruda del backend a algo que se pueda leer. */
export function etiquetaDeFactor(clave: string): string {
  const conocidas: Record<string, string> = {
    solvencia: 'Solvencia',
    credito: 'Historial de crédito',
    estabilidad: 'Estabilidad laboral',
    historial: 'Historial de arriendo',
    documentos: 'Verificación de documentos',
    perfil: 'Perfil personal',
    financialStability: 'Estabilidad financiera',
    rentalHistory: 'Historial de arriendo',
    documentVerification: 'Verificación de documentos',
    personalProfile: 'Perfil personal',
  }
  if (conocidas[clave]) return conocidas[clave]
  // snake_case o camelCase → «Primera palabra en mayúscula»
  const conEspacios = clave.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')
  return conEspacios.charAt(0).toUpperCase() + conEspacios.slice(1).toLowerCase()
}

/**
 * Cuántos candidatos se pueden comparar de una. Más de cuatro no entra en
 * pantalla sin scroll horizontal, y comparar con scroll no es comparar.
 */
export const MAXIMO_A_COMPARAR = 4
export const MINIMO_A_COMPARAR = 2
