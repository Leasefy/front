'use client'

/**
 * /ai/asegurabilidad/equipo — "Equipo IA" de asegurabilidad (visión §15–17).
 *
 * Muestra el FLUJO FUNCIONAL conectado del equipo de IA que consulta varias
 * aseguradoras a la vez por cada caso, SIN nombres humanos (los nodos son
 * funciones, no personas):
 *
 *   Preparador de consulta
 *        → (Consultores por aseguradora, en PARALELO)  ← fan-out visual
 *        → Comparador
 *        → Recomendador
 *        → Gestor de avance
 *
 * UX-only scaffold: cada nodo describe "Qué hace" (visión §16) y muestra una
 * grilla de "Resultados" en EMPTY-STATE ('—') porque la métrica real necesita
 * backend (no se inventan endpoints). Espeja los idioms de
 * /ai/estudio/page.tsx: PageGuard module="cotizador", MigaDePan, useI18n + tf().
 */

import {
  ArrowDown,
  ClipboardText,
  ShieldCheck,
  Scales,
  Lightbulb,
  PaperPlaneTilt,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { MonoLabel } from '@leasefy/cadence'
import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'

const NS = 'inmobiliaria.ai.asegurabilidad.equipo'

/** Acento de marca por familia de nodo (tokens semánticos del DS). */
const ACCENT = {
  blue: { fg: 'text-primary', chip: 'bg-primary-soft' },
  green: { fg: 'text-success', chip: 'bg-success-soft' },
  amber: { fg: 'text-warning', chip: 'bg-warning-soft' },
} as const

type Accent = keyof typeof ACCENT

type NodeDef = {
  id: string
  icon: Icon
  accent: Accent
  titleFb: string
  /** "Qué hace" — bullets (visión §16). */
  bulletsFb: string[]
  /** "Resultados" — etiquetas de métrica (valor siempre '—', empty-state). */
  metricsFb: string[]
}

/** Preparador → fan-out (consultores) → Comparador → Recomendador → Avance. */
const PREPARADOR: NodeDef = {
  id: 'preparador',
  icon: ClipboardText,
  accent: 'blue',
  titleFb: 'Preparador de consulta',
  bulletsFb: [
    'Reúne los datos del candidato y del inmueble en un solo paquete.',
    'Verifica que la información esté completa antes de consultar.',
    'Arma una consulta uniforme para enviar a todas las aseguradoras a la vez.',
  ],
  metricsFb: ['Consultas preparadas', 'Datos completos', 'Tiempo de armado'],
}

/** Los 3 consultores en PARALELO (uno por aseguradora). */
const CONSULTORES: NodeDef[] = [
  {
    id: 'consultorA',
    icon: ShieldCheck,
    accent: 'blue',
    titleFb: 'Consultor · Aseguradora A',
    bulletsFb: [
      'Consulta a la aseguradora con las reglas propias de ese aliado.',
      'Trae el veredicto, la prima y las condiciones.',
    ],
    metricsFb: ['Respuestas', 'Prima estimada'],
  },
  {
    id: 'consultorB',
    icon: ShieldCheck,
    accent: 'blue',
    titleFb: 'Consultor · Aseguradora B',
    bulletsFb: [
      'Consulta en paralelo, sin esperar a las demás aseguradoras.',
      'Normaliza la respuesta para poder compararla después.',
    ],
    metricsFb: ['Respuestas', 'Prima estimada'],
  },
  {
    id: 'consultorC',
    icon: ShieldCheck,
    accent: 'blue',
    titleFb: 'Consultor · Aseguradora C',
    bulletsFb: [
      'Aplica los requisitos específicos del producto de cada aliado.',
      'Marca exclusiones o condiciones que el operador debe revisar.',
    ],
    metricsFb: ['Respuestas', 'Prima estimada'],
  },
]

const COMPARADOR: NodeDef = {
  id: 'comparador',
  icon: Scales,
  accent: 'amber',
  titleFb: 'Comparador',
  bulletsFb: [
    'Pone lado a lado las respuestas de todas las aseguradoras.',
    'Iguala criterios (cobertura, prima, condiciones) para comparar de forma justa.',
    'Resalta diferencias relevantes entre cada opción.',
  ],
  metricsFb: ['Opciones comparadas', 'Aseguradoras viables'],
}

const RECOMENDADOR: NodeDef = {
  id: 'recomendador',
  icon: Lightbulb,
  accent: 'green',
  titleFb: 'Recomendador',
  bulletsFb: [
    'Ordena las opciones según conveniencia para el caso.',
    'Explica por qué sugiere una aseguradora sobre las demás.',
    'Deja la decisión final en manos del operador.',
  ],
  metricsFb: ['Recomendaciones', 'Aceptadas por el operador'],
}

const AVANCE: NodeDef = {
  id: 'avance',
  icon: PaperPlaneTilt,
  accent: 'green',
  titleFb: 'Gestor de avance',
  bulletsFb: [
    'Toma la opción elegida y la empuja al siguiente paso del proceso.',
    'Notifica a la inmobiliaria y deja registro del avance.',
    'Hace seguimiento hasta que el caso queda resuelto.',
  ],
  metricsFb: ['Casos en avance', 'Tiempo hasta resolución'],
}

/** Tarjeta de un nodo del flujo: título + "Qué hace" + "Resultados" ('—'). */
function FlowNode({ node, tf }: { node: NodeDef; tf: (k: string, fb: string) => string }) {
  const Ico = node.icon
  const accent = ACCENT[node.accent]

  return (
    <article className="rounded-xl border border-border bg-card p-5 h-full flex flex-col gap-4">
      {/* Encabezado del nodo */}
      <header className="flex items-start gap-3">
        <span
          className={`w-10 h-10 rounded-xl ${accent.chip} flex items-center justify-center shrink-0`}
        >
          <Ico className={`w-5 h-5 ${accent.fg}`} weight="duotone" aria-hidden="true" />
        </span>
        <h3 className="text-base font-semibold text-foreground leading-tight pt-1">
          {tf(`${NS}.nodes.${node.id}.title`, node.titleFb)}
        </h3>
      </header>

      {/* Qué hace */}
      <div className="space-y-2">
        <MonoLabel>
          {tf(`${NS}.queHace`, 'Qué hace')}
        </MonoLabel>
        <ul role="list" className="space-y-1.5">
          {node.bulletsFb.map((fb, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground leading-snug">
              <span
                aria-hidden="true"
                className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${accent.fg.replace('text-', 'bg-')}`}
              />
              <span>{tf(`${NS}.nodes.${node.id}.bullet${i + 1}`, fb)}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Resultados — EMPTY STATE ('—'), la métrica real necesita backend */}
      <div className="space-y-2 mt-auto">
        <MonoLabel>
          {tf(`${NS}.resultados`, 'Resultados')}
        </MonoLabel>
        <div className="grid grid-cols-2 gap-2">
          {node.metricsFb.map((fb, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-card px-3 py-2"
            >
              <p className="text-lg font-semibold text-fg-muted tabular-nums leading-none">
                —
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground leading-tight">
                {tf(`${NS}.nodes.${node.id}.metric${i + 1}`, fb)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </article>
  )
}

/** Conector vertical entre etapas (flecha hacia abajo). */
function FlowConnector({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 py-1" aria-hidden="true">
      <ArrowDown className="w-5 h-5 text-muted-foreground/60" weight="bold" />
      {label ? (
        <MonoLabel className="text-muted-foreground/70">
          {label}
        </MonoLabel>
      ) : null}
    </div>
  )
}

function EquipoAsegurabilidad() {
  const { t } = useI18n()

  /** i18n con fallback — nunca muestra la clave cruda. */
  const tf = (key: string, fallback: string): string => {
    const r = t(key)
    return r === key ? fallback : r
  }

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="min-w-0">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
          {tf(`${NS}.title`, 'Equipo IA')}
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 text-sm max-w-2xl">
          {tf(
            `${NS}.subtitle`,
            'Por cada caso, Leasefy consulta varias aseguradoras a la vez y luego compara y recomienda la mejor opción. Aquí ves cómo trabaja, paso a paso, el equipo de IA que hace ese trabajo.',
          )}
        </p>
      </header>

      {/* Flujo funcional conectado */}
      <section
        aria-label={tf(`${NS}.flow.aria`, 'Flujo del equipo de asegurabilidad')}
        className="max-w-5xl"
      >
        {/* 1 · Preparador */}
        <div className="max-w-xl mx-auto">
          <FlowNode node={PREPARADOR} tf={tf} />
        </div>

        {/* Conector: fan-out a consultores en paralelo */}
        <FlowConnector label={tf(`${NS}.flow.fanOut`, 'En paralelo, una por aseguradora')} />

        {/* 2 · Consultores (fan-out visual: 3 en fila) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CONSULTORES.map((c) => (
            <FlowNode key={c.id} node={c} tf={tf} />
          ))}
        </div>

        {/* Conector: fan-in al comparador */}
        <FlowConnector label={tf(`${NS}.flow.fanIn`, 'Se juntan las respuestas')} />

        {/* 3 · Comparador */}
        <div className="max-w-xl mx-auto">
          <FlowNode node={COMPARADOR} tf={tf} />
        </div>

        <FlowConnector />

        {/* 4 · Recomendador */}
        <div className="max-w-xl mx-auto">
          <FlowNode node={RECOMENDADOR} tf={tf} />
        </div>

        <FlowConnector />

        {/* 5 · Gestor de avance */}
        <div className="max-w-xl mx-auto">
          <FlowNode node={AVANCE} tf={tf} />
        </div>
      </section>

      {/* Nota de estado vacío — por qué las métricas están en '—' */}
      <p className="text-xs text-muted-foreground max-w-2xl">
        {tf(
          `${NS}.emptyNote`,
          'Los resultados aparecerán aquí a medida que el equipo procese casos. Por ahora se muestran en blanco (—).',
        )}
      </p>
    </main>
  )
}

export default function EquipoAsegurabilidadPage() {
  return (
    <PageGuard module="cotizador">
      <EquipoAsegurabilidad />
    </PageGuard>
  )
}
