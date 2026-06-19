'use client'

/**
 * /ai/asegurabilidad/integraciones — Integraciones, trazabilidad y métricas de
 * negocio de Asegurabilidad (visión §19–20 trazabilidad + §23 integraciones +
 * §24 métricas).
 *
 * UX-only scaffold. Tres secciones:
 *
 *   1) Integraciones (§23): tarjetas de los sistemas con los que se conecta el
 *      cotizador (CRM, Propiedades, Estudio del inquilino, Contratos, Matching,
 *      Reportes). Cada una en estado "conectar" (placeholder): el cableado real
 *      necesita backend, así que NO se inventan endpoints — el CTA es un botón
 *      deshabilitado con la etiqueta "Próximamente".
 *
 *   2) Trazabilidad (§19–20): explica las tres procedencias de un resultado
 *      —Estimado (Prevalidación Leasefy), Confirmado (Respuesta de entidad) y
 *      Manual— reutilizando el componente <BadgeFuente> real para que el badge
 *      que se ve aquí sea EXACTAMENTE el que verá en la matriz/veredicto.
 *
 *   3) Métricas de negocio (§24): las 10 métricas en EMPTY-STATE ('—') porque
 *      el dato real necesita backend (no se inventan endpoints).
 *
 * Espeja los idioms de /ai/asegurabilidad/equipo/page.tsx y /ai/estudio/page.tsx:
 * PageGuard module="cotizador", MigaDePan, useI18n + tf(), card
 * 'rounded-xl border border-border bg-card p-5', EmptyState '—'.
 */

import {
  Buildings,
  FileText,
  GitMerge,
  HouseLine,
  IdentificationCard,
  ChartLineUp,
  Sparkle,
  SealCheck,
  UserFocus,
  PlugsConnected,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { MigaDePan } from '@/components/inmobiliaria/ai/MigaDePan'
import { BadgeFuente } from '@/components/inmobiliaria/cotizador/BadgeFuente'
import type { FuenteVariant } from '@/components/inmobiliaria/cotizador/BadgeFuente'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'

const NS = 'inmobiliaria.ai.asegurabilidad.integraciones'

// ── 1 · Integraciones (§23) ────────────────────────────────────────────────

type IntegracionDef = {
  id: string
  icon: Icon
  titleFb: string
  descFb: string
}

/** Los 6 sistemas con los que se conecta el cotizador de asegurabilidad. */
const INTEGRACIONES: IntegracionDef[] = [
  {
    id: 'crm',
    icon: IdentificationCard,
    titleFb: 'CRM',
    descFb: 'Trae candidatos y contactos del CRM para iniciar la consulta sin volver a digitar datos.',
  },
  {
    id: 'propiedades',
    icon: HouseLine,
    titleFb: 'Propiedades',
    descFb: 'Toma los datos del inmueble (ciudad, canon, tipo) directamente del inventario de propiedades.',
  },
  {
    id: 'estudio',
    icon: IdentificationCard,
    titleFb: 'Estudio del inquilino',
    descFb: 'Conecta el resultado del estudio con la asegurabilidad para decidir con la información completa.',
  },
  {
    id: 'contratos',
    icon: FileText,
    titleFb: 'Contratos',
    descFb: 'Envía la opción aprobada a contratos para avanzar al siguiente paso del arriendo.',
  },
  {
    id: 'matching',
    icon: GitMerge,
    titleFb: 'Matching',
    descFb: 'Comparte la asegurabilidad con matching para emparejar candidatos y propiedades con más certeza.',
  },
  {
    id: 'reportes',
    icon: ChartLineUp,
    titleFb: 'Reportes',
    descFb: 'Lleva las métricas de asegurabilidad a los reportes del negocio para verlas junto al resto.',
  },
]

/** Tarjeta de una integración: ícono + título + descripción + botón "conectar". */
function IntegracionCard({
  integ,
  tf,
}: {
  integ: IntegracionDef
  tf: (k: string, fb: string) => string
}) {
  const Ico = integ.icon
  return (
    <article className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
          <Ico className="w-5 h-5 text-foreground" weight="duotone" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground leading-tight">
            {tf(`${NS}.integraciones.${integ.id}.title`, integ.titleFb)}
          </h3>
          <p className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground mt-0.5">
            {tf(`${NS}.estado.desconectado`, 'Sin conectar')}
          </p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-snug flex-1">
        {tf(`${NS}.integraciones.${integ.id}.desc`, integ.descFb)}
      </p>

      {/* Placeholder "conectar": deshabilitado — el cableado real necesita backend. */}
      <Button
        variant="outline"
        size="sm"
        hideArrow
        disabled
        aria-disabled="true"
        title={tf(`${NS}.estado.proximamente`, 'Próximamente')}
        className="w-full"
      >
        <PlugsConnected className="w-4 h-4" weight="duotone" aria-hidden="true" />
        {tf(`${NS}.estado.conectar`, 'Conectar')}
      </Button>
    </article>
  )
}

// ── 2 · Trazabilidad (§19–20) ──────────────────────────────────────────────

type FuenteFila = {
  variant: FuenteVariant
  icon: Icon
  titleFb: string
  descFb: string
}

/** Las tres procedencias de un resultado, en el orden de la visión. */
const FUENTES: FuenteFila[] = [
  {
    variant: 'estimado',
    icon: Sparkle,
    titleFb: 'Estimado · Prevalidación Leasefy',
    descFb:
      'Es una guía generada por Leasefy con las reglas conocidas de cada aseguradora. Orienta la decisión, pero todavía NO es el veredicto oficial de la entidad.',
  },
  {
    variant: 'confirmado',
    icon: SealCheck,
    titleFb: 'Confirmado · Respuesta de entidad',
    descFb:
      'Es la respuesta oficial de la aseguradora a la consulta. Cuando aparece, el resultado deja de ser una estimación y pasa a ser el veredicto real.',
  },
  {
    variant: 'manual',
    icon: UserFocus,
    titleFb: 'Manual · Revisión del operador',
    descFb:
      'El operador ajustó o cargó el resultado a mano. Queda marcado como manual para mantener la trazabilidad de quién decidió qué.',
  },
]

/** Fila de trazabilidad: badge real (BadgeFuente) + ícono + explicación. */
function TrazabilidadFila({
  fuente,
  tf,
}: {
  fuente: FuenteFila
  tf: (k: string, fb: string) => string
}) {
  const Ico = fuente.icon
  return (
    <li className="flex items-start gap-4 px-5 py-4">
      <span className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 mt-0.5">
        <Ico className="w-4.5 h-4.5 text-foreground" weight="duotone" aria-hidden="true" />
      </span>
      <div className="min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-foreground">
            {tf(`${NS}.trazabilidad.${fuente.variant}.title`, fuente.titleFb)}
          </h3>
          {/* El badge REAL que se ve en la matriz/veredicto. */}
          <BadgeFuente fuente={fuente.variant} />
        </div>
        <p className="text-sm text-muted-foreground leading-snug">
          {tf(`${NS}.trazabilidad.${fuente.variant}.desc`, fuente.descFb)}
        </p>
      </div>
    </li>
  )
}

// ── 3 · Métricas de negocio (§24) ──────────────────────────────────────────

/** Las 10 métricas de negocio (§24), todas en EMPTY-STATE ('—'). */
const METRICAS: { id: string; labelFb: string }[] = [
  { id: 'consultas', labelFb: 'Consultas' },
  { id: 'asegurables', labelFb: 'Asegurables' },
  { id: 'noAsegurables', labelFb: 'No asegurables' },
  { id: 'multiOpcion', labelFb: 'Con varias opciones' },
  { id: 'recuperadosAlternativa', labelFb: 'Recuperados por alternativa' },
  { id: 'tiempoPromedio', labelFb: 'Tiempo promedio de respuesta' },
  { id: 'entidadMejorAprobacion', labelFb: 'Entidad con mejor aprobación' },
  { id: 'entidadMasRapida', labelFb: 'Entidad más rápida' },
  { id: 'enviadosContrato', labelFb: 'Enviados a contrato' },
  { id: 'valorAsegurado', labelFb: 'Valor asegurado' },
]

function MetricaCard({
  id,
  labelFb,
  tf,
}: {
  id: string
  labelFb: string
  tf: (k: string, fb: string) => string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-2xl font-semibold text-fg-muted tabular-nums leading-none">
        —
      </p>
      <p className="mt-2 text-xs text-muted-foreground leading-tight">
        {tf(`${NS}.metricas.${id}`, labelFb)}
      </p>
    </div>
  )
}

// ── Página ──────────────────────────────────────────────────────────────────

function IntegracionesAsegurabilidad() {
  const { t } = useI18n()

  /** i18n con fallback — nunca muestra la clave cruda. */
  const tf = (key: string, fallback: string): string => {
    const r = t(key)
    return r === key ? fallback : r
  }

  return (
    <main className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <header className="min-w-0">
        <MigaDePan
          backHref="/panel/inmobiliaria/ai/asegurabilidad"
          icon={GitMerge}
          className="mb-2"
          crumbs={[
            { label: tf('inmobiliaria.nav.secAgentes', 'Agentes'), href: '/panel/inmobiliaria/ai' },
            {
              label: tf('inmobiliaria.ai.workspace.agente.cotizador', 'Asegurabilidad'),
              href: '/panel/inmobiliaria/ai/asegurabilidad',
            },
            { label: tf(`${NS}.title`, 'Integraciones') },
          ]}
        />
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
          {tf(`${NS}.title`, 'Integraciones')}
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 text-sm max-w-2xl">
          {tf(
            `${NS}.subtitle`,
            'Cómo se conecta la asegurabilidad con el resto de la plataforma, qué significa cada procedencia de un resultado y qué métricas de negocio podrás seguir.',
          )}
        </p>
      </header>

      {/* 1 · Integraciones (§23) */}
      <section aria-label={tf(`${NS}.integraciones.title`, 'Integraciones')} className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {tf(`${NS}.integraciones.title`, 'Integraciones')}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
            {tf(
              `${NS}.integraciones.desc`,
              'Conecta la asegurabilidad con los sistemas que ya usas para que la información fluya sin volver a digitarla.',
            )}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {INTEGRACIONES.map((integ) => (
            <IntegracionCard key={integ.id} integ={integ} tf={tf} />
          ))}
        </div>
      </section>

      {/* 2 · Trazabilidad (§19–20) */}
      <section aria-label={tf(`${NS}.trazabilidad.title`, 'Trazabilidad')} className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {tf(`${NS}.trazabilidad.title`, 'Trazabilidad')}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
            {tf(
              `${NS}.trazabilidad.desc`,
              'Cada resultado de asegurabilidad lleva una etiqueta de procedencia para que siempre sepas de dónde viene y cuánto puedes confiar en él.',
            )}
          </p>
        </div>
        <ul
          role="list"
          className="rounded-xl border border-border bg-card divide-y divide-neutral-200/70 dark:divide-neutral-800"
        >
          {FUENTES.map((fuente) => (
            <TrazabilidadFila key={fuente.variant} fuente={fuente} tf={tf} />
          ))}
        </ul>
      </section>

      {/* 3 · Métricas de negocio (§24) */}
      <section aria-label={tf(`${NS}.metricas.title`, 'Métricas de negocio')} className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {tf(`${NS}.metricas.title`, 'Métricas de negocio')}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
            {tf(
              `${NS}.metricas.desc`,
              'El pulso del negocio de asegurabilidad. Cada métrica se llenará a medida que proceses casos; por ahora se muestran en blanco (—).',
            )}
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {METRICAS.map((m) => (
            <MetricaCard key={m.id} id={m.id} labelFb={m.labelFb} tf={tf} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground max-w-2xl">
          {tf(
            `${NS}.metricas.emptyNote`,
            'Las métricas en blanco (—) aún no tienen datos. Aparecerán automáticamente cuando la asegurabilidad procese casos.',
          )}
        </p>
      </section>
    </main>
  )
}

export default function IntegracionesAsegurabilidadPage() {
  return (
    <PageGuard module="cotizador">
      <IntegracionesAsegurabilidad />
    </PageGuard>
  )
}
