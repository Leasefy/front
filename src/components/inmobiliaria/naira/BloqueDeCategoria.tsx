'use client'

/**
 * BloqueDeCategoria — DATO / INFERENCIA / RECOMENDACIÓN de lo que dice Naira (Fase 13, plan 13-02; D13-9, INV-03,
 * UI-SPEC §6.3).
 *
 * La categoría sale del CAMPO de origen —la sección de salida del agente o la procedencia de una memoria— con los puros
 * de 13-01 (`categoriaDeSeccion`, `categoriaDeProcedencia`), NUNCA de lo que dicen los hijos: un bloque INFERENCE que
 * habla de «un dato medido» sigue siendo una inferencia.
 *
 * Choque UI-SPEC §6.3 ↔ D13-9 (P2, manda el CONTEXT): el UI-SPEC rotula las seis secciones; D13-9 fija tres categorías
 * visibles. La etiqueta PRINCIPAL es la categoría (`data-categoria`); la sección sobrevive como sub-etiqueta
 * (CONOCIMIENTO / MEMORIA / ACCIÓN), como icono y como `data-seccion`. El BORDE va por categoría (dato y recomendación
 * sólido, inferencia discontinuo; Nico, 18-10-2026, quitó la línea gruesa de la recomendación: la distinguen su etiqueta y
 * su icono) y el FONDO por sección (la memoria en pozo); ninguna se distingue solo por color (docs/DESIGN.md §7).
 *
 * Un bloque sin hijos y sin razón de vacío no se pinta (no se inventa relleno).
 */

import type { JSX } from 'react'
import type { ReactNode } from 'react'
import { useId } from 'react'
import { BookOpen, Database, HandTap, Lightbulb, Notebook, Signpost, type Icon } from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import {
  categoriaDeProcedencia,
  categoriaDeSeccion,
  type CategoriaVisible,
  type SeccionDeSalida,
} from '@/lib/naira/categorias'

export type OrigenDeCategoria =
  | { readonly kind: 'seccion'; readonly seccion: Exclude<SeccionDeSalida, 'MEMORY'> }
  | { readonly kind: 'memoria'; readonly procedencia: Parameters<typeof categoriaDeProcedencia>[0] }

export interface BloqueDeCategoriaProps {
  readonly origen: OrigenDeCategoria
  readonly children?: ReactNode
  /** La razón que trae el contrato para una sección vacía; sin hijos y sin esto, el bloque no se pinta. */
  readonly razonDeVacio?: string
}

const ICONO_DE_SECCION = {
  KNOWLEDGE: BookOpen,
  LIVE_DATA: Database,
  MEMORY: Notebook,
  INFERENCE: Lightbulb,
  RECOMMENDATION: Signpost,
  ACTION: HandTap,
} as const satisfies Record<SeccionDeSalida, Icon>

const ETIQUETA_DE_CATEGORIA = {
  dato: 'inmobiliaria.ai.naira.categorias.dato',
  inferencia: 'inmobiliaria.ai.naira.categorias.inferencia',
  recomendacion: 'inmobiliaria.ai.naira.categorias.recomendacion',
} as const satisfies Record<CategoriaVisible, string>

const SUBETIQUETA_DE_SECCION = {
  KNOWLEDGE: 'inmobiliaria.ai.naira.categorias.conocimiento',
  LIVE_DATA: null,
  MEMORY: 'inmobiliaria.ai.naira.categorias.memoria',
  INFERENCE: null,
  RECOMMENDATION: null,
  ACTION: 'inmobiliaria.ai.naira.categorias.accion',
} as const satisfies Record<SeccionDeSalida, string | null>

const BORDE_DE_CATEGORIA = {
  dato: 'border border-border',
  inferencia: 'border border-dashed border-border-strong',
  // Nico (18-10-2026): sin la línea gruesa a la izquierda; la recomendación se dice con su etiqueta y su icono.
  recomendacion: 'border border-border',
} as const satisfies Record<CategoriaVisible, string>

const FONDO_DE_SECCION = {
  KNOWLEDGE: 'bg-surface',
  LIVE_DATA: 'bg-surface',
  MEMORY: 'bg-surface-muted',
  INFERENCE: 'bg-surface',
  RECOMMENDATION: 'bg-surface',
  ACTION: 'bg-surface',
} as const satisfies Record<SeccionDeSalida, string>

function categoriaDelOrigen(origen: OrigenDeCategoria): CategoriaVisible {
  switch (origen.kind) {
    case 'seccion':
      return categoriaDeSeccion(origen.seccion)
    case 'memoria':
      return categoriaDeProcedencia(origen.procedencia)
    default: {
      const _exhaustivo: never = origen
      return _exhaustivo
    }
  }
}

export function BloqueDeCategoria({ origen, children, razonDeVacio }: BloqueDeCategoriaProps): JSX.Element | null {
  const id = useId()
  const { t } = useI18n()
  const categoria = categoriaDelOrigen(origen)
  const seccion: SeccionDeSalida = origen.kind === 'seccion' ? origen.seccion : 'MEMORY'
  const sinHijos = children === null || children === undefined || children === false
  if (sinHijos && !razonDeVacio) return null

  const IconoDeSeccion = ICONO_DE_SECCION[seccion]
  const subetiqueta = SUBETIQUETA_DE_SECCION[seccion]
  return (
    <section
      data-categoria={categoria}
      data-seccion={seccion}
      aria-labelledby={id}
      className={['space-y-2 rounded-lg p-4 md:p-6', FONDO_DE_SECCION[seccion], BORDE_DE_CATEGORIA[categoria]].join(' ')}
    >
      <p id={id} className="flex items-center gap-1 text-overline text-fg-muted">
        <IconoDeSeccion className="h-4 w-4 text-fg-muted" aria-hidden="true" />
        <span>{t(ETIQUETA_DE_CATEGORIA[categoria])}</span>
        {subetiqueta !== null ? <span>{'· ' + t(subetiqueta)}</span> : null}
      </p>
      {sinHijos ? <p className="text-sm text-fg-muted">{razonDeVacio}</p> : children}
    </section>
  )
}
