'use client'

import { useMemo, useState } from 'react'
import { Stack } from '@phosphor-icons/react'
import { confirmar } from '@/components/ui/confirmar'
import { adminApi } from '@/lib/admin/api'
import { fmtNumero } from '@/lib/admin/format'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import type { InmobiliariaDeLaLista } from '@/lib/admin/inmobiliarias-de-la-lista'

import { PageHeader } from '@/components/admin/screen/PageHeader'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { Pill } from '@/components/admin/Pill'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { mensajeDelAdmin } from '@/lib/admin/errores-del-admin'
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario'
import { fmtCOP } from '@/lib/admin/format'
import {
  listPlans,
  createPlan,
  updatePlan,
  deletePlan,
  type AdminPlan,
} from '@/lib/admin/plans'
import { PlanForm } from './PlanForm'
import {
  planToFormValues,
  toCreatePlanBody,
  toUpdatePlanBody,
  type PlanFormValues,
} from './plan-form-schema'
import { Alert } from '@leasefy/cadence'
import { Cajon, CajonCabecera, CajonCuerpo } from '@/components/ui/cajon'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { Button } from '@/components/ui/button'

// ── Cell helpers ──────────────────────────────────────────────────────────────

/** Un tope del plan: -1 = sin tope, 0 = ninguno, N = el número. */
function tope(n: number): string {
  if (n === -1) return 'Ilimitado'
  if (n === 0) return 'Ninguno'
  return fmtNumero(n)
}

/** El precio que se ve: la mensualidad, o el porcentaje del canon. */
function precioDelPlan(p: AdminPlan): string {
  return p.billingMode === 'USAGE_CANON'
    ? `${(p.usageFeeBps / 100).toLocaleString('es-CO', { maximumFractionDigits: 2 })} % del canon`
    : p.monthlyPrice === 0
      ? 'Gratis'
      : `${fmtCOP(p.monthlyPrice)} al mes`
}

const COBRO: Record<string, string> = { FLAT: 'Mensualidad fija', USAGE_CANON: 'Porcentaje del canon' }

// ── Page ────────────────────────────────────────────────────────────────────

type FormMode =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'edit'; plan: AdminPlan }

/**
 * Ronda 28 (revisora r27, bloqueante): la descripción del plan viene de la base y trae jerga («Scoring
 * premium»). Al mostrarla, en español; el dato se corrige en la base (anotado para Víctor).
 */
function descripcionLegible(texto: string): string {
  return texto
    .replace(/\bscoring\b/gi, (m) => (m[0] === 'S' ? 'Calificación del inquilino' : 'calificación del inquilino'))
    .replace(/\bscore\b/gi, (m) => (m[0] === 'S' ? 'Puntaje' : 'puntaje'))
    .replace(/\bdashboard\b/gi, (m) => (m[0] === 'D' ? 'Tablero' : 'tablero'))
    .replace(/\bmatching\b/gi, (m) => (m[0] === 'M' ? 'Afinidad' : 'afinidad'))
    .replace(/\bemail(s?)\b/gi, (m, plural: string) => `${m[0] === 'E' ? 'C' : 'c'}orreo${plural}`)
}

/**
 * /admin/plans — los planes que puede elegir una inmobiliaria (catálogo AGENCY,
 * contrato 29). Crea, edita, desactiva (sin borrar) y reactiva. El formulario
 * vive arriba de la tabla.
 *
 * 19-10-2026 (QA del admin): en español, sin desborde a 1440, «En uso» (cuántas
 * inmobiliarias tienen cada plan, de `GET /tenants`) y la confirmación de
 * Cadence en vez de `window.confirm`.
 */
export default function PlansPage() {
  const { data, isLoading, error, refetch } = useApiQuery<AdminPlan[]>(
    (signal) => listPlans('AGENCY', signal),
    [],
  )

  // Cuántas inmobiliarias tienen cada plan (si la lista no llega, la columna dice «—»).
  const inmobiliarias = useApiQuery<InmobiliariaDeLaLista[]>((signal) => adminApi('/tenants', { signal }), [])
  const enUso = useMemo(() => {
    if (!inmobiliarias.data) return null
    const cuenta = new Map<string, number>()
    for (const i of inmobiliarias.data) if (i.plan) cuenta.set(i.plan.tier, (cuenta.get(i.plan.tier) ?? 0) + 1)
    return cuenta
  }, [inmobiliarias.data])

  const [form, setForm] = useState<FormMode>({ kind: 'none' })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  /** Los errores del back por campo, para el formulario (02-10-2026). */
  const [serverFieldErrors, setServerFieldErrors] = useState<Partial<Record<keyof PlanFormValues, string>>>({})

  const [busyId, setBusyId] = useState<string | null>(null)
  const [rowError, setRowError] = useState<string | null>(null)


  const plans = useMemo(
    () =>
      (data ?? [])
        .slice()
        .sort((a, b) => (a.level ?? 999) - (b.level ?? 999) || a.name.localeCompare(b.name)),
    [data],
  )


  const editingId = form.kind === 'edit' ? form.plan.id : null
  const otherDefaultExists = plans.some(
    (p) => p.isDefault && p.isActive && p.id !== editingId,
  )

  function openCreate() {
    setFormError(null)
    setServerFieldErrors({})
    setForm({ kind: 'create' })
  }

  function openEdit(plan: AdminPlan) {
    setFormError(null)
    setServerFieldErrors({})
    setForm({ kind: 'edit', plan })
  }

  function closeForm() {
    setForm({ kind: 'none' })
    setFormError(null)
    setServerFieldErrors({})
  }

  async function handleSubmit(values: PlanFormValues) {
    setSubmitting(true)
    setFormError(null)
    setServerFieldErrors({})
    try {
      if (form.kind === 'create') {
        await createPlan(toCreatePlanBody(values))
      } else if (form.kind === 'edit') {
        await updatePlan(form.plan.id, toUpdatePlanBody(values))
      }
      refetch()
      closeForm()
    } catch (err) {
      // 02-10-2026 · Lo del back por campo va debajo de SU campo; lo demás,
      // al pie, con la regla de oro (antes: `err.message` crudo o fijo).
      const reparto = repartirErroresDelServidor<keyof PlanFormValues>(err, {
        mapa: { usageFeeBps: 'usageFeePct', tier: 'slug', planType: null },
        campos: Object.keys(values) as (keyof PlanFormValues)[],
        accion: 'guardar el plan',
        porDefecto: 'No se pudo guardar el plan.',
      })
      setServerFieldErrors(reparto.porCampo)
      setFormError(reparto.sueltos.length > 0 ? reparto.sueltos.join(' · ') : null)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeactivate(plan: AdminPlan) {
    const usan = enUso?.get(plan.tier) ?? 0
    const ok = await confirmar({
      tipo: 'advertencia',
      titulo: `¿Desactivar el plan «${plan.name}»?`,
      descripcion:
        'Deja de aparecer cuando una inmobiliaria elige o cambia de plan. No borra nada y no cambia a quien ya lo tiene; se puede reactivar.' +
        (usan > 0 ? ` Hoy lo ${usan === 1 ? 'tiene 1 inmobiliaria' : `tienen ${fmtNumero(usan)} inmobiliarias`}.` : ''),
      accion: 'Desactivar',
    })
    if (!ok) return
    setRowError(null)
    setBusyId(plan.id)
    try {
      await deletePlan(plan.id)
      refetch()
    } catch (err) {
      setRowError(mensajeDelAdmin(err, { accion: 'desactivar el plan', porDefecto: 'No se pudo desactivar el plan.' }))
    } finally {
      setBusyId(null)
    }
  }

  async function handleReactivate(plan: AdminPlan) {
    setRowError(null)
    setBusyId(plan.id)
    try {
      await updatePlan(plan.id, { isActive: true })
      refetch()
    } catch (err) {
      setRowError(mensajeDelAdmin(err, { accion: 'reactivar el plan', porDefecto: 'No se pudo reactivar el plan.' }))
    } finally {
      setBusyId(null)
    }
  }

  // Ronda 28 (revisora r27): la respuesta arriba (cuántas inmobiliarias tienen plan) y, si ninguna tiene
  // uno, sin la columna «En uso» de «—» en todas las filas (va al Excel siempre).
  const totalInmobiliarias = inmobiliarias.data?.length ?? 0
  const conPlan = inmobiliarias.data ? inmobiliarias.data.filter((i) => i.plan).length : 0
  const enUsoTodoEnCero = Boolean(enUso) && plans.every((p) => !(enUso?.get(p.tier) ?? 0))
  const hayDesactivados = plans.some((p) => !p.isActive)

  const todasLasColumnas: Column<AdminPlan>[] = [
    {
      header: 'Plan',
      className: 'min-w-[240px]',
      orden: (p) => p.level ?? 999,
      texto: (p) => p.name,
      cell: (p) => (
        <div className="min-w-0 max-w-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-fg">{p.name}</span>
            {p.isDefault ? <Pill tone="neutral">Por defecto</Pill> : null}
            {p.scoringIncluded ? <Pill tone="ok">Con calificación del inquilino</Pill> : null}
          </div>
          {/* Ronda 26: el código del plan (en inglés) va sólo al Excel. */}
          {p.level != null ? <div className="mt-0.5 text-caption text-fg-subtle">Nivel {p.level}</div> : null}
          {p.description ? <p className="mt-1 line-clamp-2 text-caption text-fg-muted">{descripcionLegible(p.description)}</p> : null}
        </div>
      ),
    },
    {
      header: 'Precio',
      orden: (p) => p.monthlyPrice,
      ordenPrimero: 'desc',
      texto: (p) => `${precioDelPlan(p)} · ${COBRO[p.billingMode] ?? 'Otro cobro'}`,
      cell: (p) => (
        <div>
          <div className="whitespace-nowrap font-mono text-body-sm tabular-nums text-fg">{precioDelPlan(p)}</div>
          <div className="text-caption text-fg-muted">{COBRO[p.billingMode] ?? 'Otro cobro'}</div>
        </div>
      ),
    },
    {
      header: 'Topes',
      cell: (p) => (
        // Ronda 28 (revisora r27, bloqueante): el tope DEBAJO de su rótulo, en tres columnas que se parten
        // (a 390 «Evaluaciones al mes Ilimi…» se cortaba en el borde); el valor en gris, sin competir con el precio.
        <dl className="grid min-w-0 grid-cols-3 gap-x-4 gap-y-1 text-caption">
          {(
            [
              ['Inmuebles', p.maxProperties],
              ['Usuarios', p.maxUsers],
              ['Evaluaciones al mes', p.monthlyEvalCap],
            ] as const
          ).map(([nombre, valor]) => (
            <div key={nombre} className="min-w-0">
              <dt className="text-fg-subtle">{nombre}</dt>
              <dd className="font-mono tabular-nums text-fg-muted">{tope(valor)}</dd>
            </div>
          ))}
        </dl>
      ),
    },
    {
      header: 'En uso',
      align: 'right',
      orden: (p) => enUso?.get(p.tier) ?? 0,
      ordenPrimero: 'desc',
      texto: (p) => enUso?.get(p.tier) ?? 0,
      cell: (p) => {
        const n = enUso?.get(p.tier)
        return enUso && !n ? (
          <span className="text-fg-subtle">—</span>
        ) : enUso ? (
          <span className="whitespace-nowrap text-fg">
            <span className="font-mono tabular-nums">{fmtNumero(n ?? 0)}</span> {n === 1 ? 'inmobiliaria' : 'inmobiliarias'}
          </span>
        ) : (
          <span className="text-fg-subtle">—</span>
        )
      },
    },
    {
      header: 'Estado',
      orden: (p) => (p.isActive ? 0 : 1),
      texto: (p) => (p.isActive ? 'Activo' : 'Inactivo'),
      cell: (p) => <Pill tone={p.isActive ? 'ok' : 'muted'}>{p.isActive ? 'Activo' : 'Inactivo'}</Pill>,
    },
    {
      header: '',
      align: 'right',
      cell: (p) => (
        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
          <Button size="sm" variant="ghost" hideArrow onClick={() => openEdit(p)} disabled={busyId === p.id}>
            Editar
          </Button>
          {p.isActive ? (
            <Button size="sm" variant="ghost" hideArrow onClick={() => handleDeactivate(p)} disabled={busyId === p.id}>
              {busyId === p.id ? 'Desactivando…' : 'Desactivar'}
            </Button>
          ) : (
            <Button size="sm" variant="outline" hideArrow onClick={() => handleReactivate(p)} disabled={busyId === p.id}>
              {busyId === p.id ? 'Reactivando…' : 'Reactivar'}
            </Button>
          )}
        </div>
      ),
    },
  ]

  const columnas = enUsoTodoEnCero ? todasLasColumnas.filter((c) => c.header !== 'En uso') : todasLasColumnas

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Planes de inmobiliaria"
        description="Los planes que puede elegir una inmobiliaria, con su precio y sus topes."
        ayuda={
          <ParaEntenderMas etiqueta="Cómo funciona" titulo="Los planes" variante="secundario">
            <div className="space-y-3 text-body-sm text-fg-muted">
              <p>Crea, edita y desactiva planes. Un plan desactivado no se borra: deja de aparecer al elegir o cambiar de plan y se puede reactivar. Quien ya lo tiene, lo conserva.</p>
              <p>El código de un plan no cambia después de crearlo. Sólo un plan activo puede ser el plan por defecto.</p>
            </div>
          </ParaEntenderMas>
        }
        principal={
          <Button size="sm" hideArrow onClick={openCreate}>
            Nuevo plan
          </Button>
        }
      />

      {inmobiliarias.data && totalInmobiliarias > 0 ? (
        <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
          <CifraHeroe
            rotulo="Inmobiliarias con plan"
            cifra={`${fmtNumero(conPlan)} de ${fmtNumero(totalInmobiliarias)}`}
            contexto={`en ${fmtNumero(plans.filter((p) => p.isActive).length)} ${plans.filter((p) => p.isActive).length === 1 ? 'plan activo' : 'planes activos'}`}
            tamano="mediana"
            esCero={conPlan === 0}
            cuandoEsCero={`Ninguna de las ${fmtNumero(totalInmobiliarias)} inmobiliarias tiene un plan todavía: los ${fmtNumero(plans.filter((p) => p.isActive).length)} de abajo están listos para elegir.`}
            data-testid="planes-cifra"
          />
        </div>
      ) : null}

      {rowError ? <Alert variant="danger">{rowError}</Alert> : null}

      <Cajon abierto={form.kind !== 'none'} onOpenChange={(a) => (a ? null : closeForm())}>
        <CajonCabecera
          titulo={form.kind === 'edit' ? `Editar «${form.plan.name}»` : 'Nuevo plan'}
          descripcion="Para inmobiliarias. El código no se puede cambiar después de crearlo."
        />
        <CajonCuerpo>
          {form.kind !== 'none' ? (
            <PlanForm
              key={form.kind === 'edit' ? form.plan.id : 'nuevo'}
              mode={form.kind}
              initialValues={form.kind === 'edit' ? planToFormValues(form.plan) : undefined}
              otherDefaultExists={otherDefaultExists}
              isSubmitting={submitting}
              submitError={formError}
              serverFieldErrors={serverFieldErrors}
              onSubmit={handleSubmit}
              onCancel={closeForm}
            />
          ) : null}
        </CajonCuerpo>
      </Cajon>

      <DataTable
        columns={columnas}
        rows={data ? plans : undefined}
        getKey={(p) => p.id}
        isLoading={isLoading}
        error={error}
        onReintentar={refetch}
        rowClassName={(p) => (p.isActive ? undefined : 'opacity-60')}
        emptyTitle="Todavía no hay planes"
        emptyHint="Crea el primero con «Nuevo plan»."
        emptyAction={
          <Button size="sm" variant="outline" hideArrow onClick={openCreate}>
            Nuevo plan
          </Button>
        }
        emptyIcon={<Stack weight="duotone" />}
        aria-label="Planes de inmobiliaria"
        queSon={['plan', 'planes']}
        buscar="Nombre, código o descripción"
        textoExtra={(p) => `${p.tier} ${p.description ?? ''}`}
        // Ronda 28 (revisora r27, T14): sin desactivados, «Activos 5 · Todos 5» decía lo mismo dos veces.
        segmentos={
          hayDesactivados
            ? [
                { valor: 'activos', nombre: 'Activos', cumple: (p) => p.isActive },
                { valor: 'desactivados', nombre: 'Desactivados', cumple: (p) => !p.isActive },
                { valor: 'todos', nombre: 'Todos', cumple: () => true },
              ]
            : undefined
        }
        exportar="planes-de-inmobiliaria"
        masEnElExcel={[
          { header: 'Código', texto: (p) => p.tier },
          { header: 'Precio al mes (pesos)', texto: (p) => p.monthlyPrice },
          { header: 'Inmuebles', texto: (p) => p.maxProperties },
          { header: 'Usuarios', texto: (p) => p.maxUsers },
          { header: 'Evaluaciones al mes', texto: (p) => p.monthlyEvalCap },
          { header: 'Por defecto', texto: (p) => p.isDefault },
          ...(enUsoTodoEnCero ? [{ header: 'En uso', texto: (p: AdminPlan) => enUso?.get(p.tier) ?? 0 }] : []),
        ]}
      />
    </div>
  )
}
