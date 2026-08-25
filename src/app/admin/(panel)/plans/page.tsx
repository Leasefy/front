'use client'

import { useMemo, useState } from 'react'

import { PageHeader } from '@/components/admin/screen/PageHeader'
import { LoadingBlock, ErrorBlock, EmptyBlock } from '@/components/admin/screen/states'
import { Pill } from '@/components/admin/Pill'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { ApiError } from '@/lib/admin/api'
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

// ── Cell helpers ──────────────────────────────────────────────────────────────

/** Renders a limit sentinel: -1 = Ilimitado, 0 = Ninguno, N = the number. */
function sentinel(n: number): string {
  if (n === -1) return 'Ilimitado'
  if (n === 0) return 'Ninguno'
  return String(n)
}

/** The plan's headline price: fixed COP for FLAT, "% canon" for USAGE_CANON. */
function priceLabel(p: AdminPlan): string {
  return p.billingMode === 'USAGE_CANON' ? `${p.usageFeeBps / 100}% canon` : fmtCOP(p.monthlyPrice)
}

// ── Page ────────────────────────────────────────────────────────────────────

type FormMode =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'edit'; plan: AdminPlan }

/**
 * /admin/plans — CRUD del catálogo de planes AGENCY (contrato 29 · planes
 * dinámicos de inmobiliaria). Lista activos e inactivos; crea, edita, desactiva
 * (soft-delete) y reactiva planes. El form vive inline (el admin no tiene modal
 * system) sobre la tabla.
 */
export default function PlansPage() {
  const { data, isLoading, error, refetch } = useApiQuery<AdminPlan[]>(
    (signal) => listPlans('AGENCY', signal),
    [],
  )

  const [form, setForm] = useState<FormMode>({ kind: 'none' })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [busyId, setBusyId] = useState<string | null>(null)
  const [rowError, setRowError] = useState<string | null>(null)

  // Default OFF → la tabla muestra solo los planes activos ("los que se van a
  // usar"). Al activarlo, los inactivos reaparecen atenuados.
  const [showInactive, setShowInactive] = useState(false)

  const plans = useMemo(
    () =>
      (data ?? [])
        .slice()
        .sort((a, b) => (a.level ?? 999) - (b.level ?? 999) || a.name.localeCompare(b.name)),
    [data],
  )

  const inactiveCount = useMemo(() => plans.filter((p) => !p.isActive).length, [plans])
  const visiblePlans = useMemo(
    () => (showInactive ? plans : plans.filter((p) => p.isActive)),
    [plans, showInactive],
  )

  const editingId = form.kind === 'edit' ? form.plan.id : null
  const otherDefaultExists = plans.some(
    (p) => p.isDefault && p.isActive && p.id !== editingId,
  )

  function openCreate() {
    setFormError(null)
    setForm({ kind: 'create' })
  }

  function openEdit(plan: AdminPlan) {
    setFormError(null)
    setForm({ kind: 'edit', plan })
  }

  function closeForm() {
    setForm({ kind: 'none' })
    setFormError(null)
  }

  async function handleSubmit(values: PlanFormValues) {
    setSubmitting(true)
    setFormError(null)
    try {
      if (form.kind === 'create') {
        await createPlan(toCreatePlanBody(values))
      } else if (form.kind === 'edit') {
        await updatePlan(form.plan.id, toUpdatePlanBody(values))
      }
      refetch()
      closeForm()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'No se pudo guardar el plan.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeactivate(plan: AdminPlan) {
    if (
      !window.confirm(
        `¿Desactivar el plan "${plan.name}"?\n\n` +
          'Se quita de /upgrade (los clientes ya no podrán elegirlo), pero NO se ' +
          'borran datos ni se afectan las suscripciones actuales. Podés reactivarlo luego.',
      )
    )
      return
    setRowError(null)
    setBusyId(plan.id)
    try {
      await deletePlan(plan.id)
      refetch()
    } catch (err) {
      setRowError(err instanceof ApiError ? err.message : 'No se pudo desactivar el plan.')
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
      setRowError(err instanceof ApiError ? err.message : 'No se pudo reactivar el plan.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        label="30 · plans"
        title="Planes de inmobiliaria"
        description="Catálogo de planes AGENCY (contrato 29). Crea, edita y desactiva planes. Los inactivos quedan atenuados y se pueden reactivar. El slug es inmutable tras crear."
        right={
          form.kind === 'none' ? (
            <button className="btn btn-primary" onClick={openCreate}>
              Nuevo plan
            </button>
          ) : undefined
        }
      />

      {rowError && (
        <div className="card p-4 border-l-4 border-l-bad mb-6">
          <p className="text-sm text-bad">{rowError}</p>
        </div>
      )}

      {form.kind !== 'none' && (
        <div className="mb-8">
          <PlanForm
            mode={form.kind}
            initialValues={form.kind === 'edit' ? planToFormValues(form.plan) : undefined}
            otherDefaultExists={otherDefaultExists}
            isSubmitting={submitting}
            submitError={formError}
            onSubmit={handleSubmit}
            onCancel={closeForm}
          />
        </div>
      )}

      {isLoading ? (
        <LoadingBlock label="cargando planes" />
      ) : error ? (
        <ErrorBlock error={error} />
      ) : plans.length === 0 ? (
        <EmptyBlock title="Sin planes" hint="Creá el primer plan AGENCY con “Nuevo plan”." />
      ) : (
        <>
          {/* Filtro — por defecto solo activos (lista limpia con los que se usan). */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-xs text-fg-muted">
              Mostrando {visiblePlans.length} de {plans.length} planes
              {inactiveCount > 0 && !showInactive ? ` · ${inactiveCount} inactivo(s) oculto(s)` : ''}
            </p>
            <label className="flex items-center gap-2 text-xs text-fg-muted cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="accent-brand"
              />
              Mostrar inactivos
            </label>
          </div>

          {visiblePlans.length === 0 ? (
            <EmptyBlock
              title="Sin planes activos"
              hint="Todos los planes están inactivos. Activá “Mostrar inactivos” para verlos y reactivarlos."
            />
          ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm table-zebra">
            <thead>
              <tr className="border-b border-bg-border">
                {['Nombre', 'Slug', 'Nivel', 'Cobro', 'Precio', 'Propiedades', 'Usuarios', 'Eval/mes', 'Flags', 'Estado', ''].map(
                  (h, i) => (
                    <th
                      key={i}
                      className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle whitespace-nowrap text-left"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {visiblePlans.map((p) => (
                <tr key={p.id} className={p.isActive ? undefined : 'opacity-50'}>
                  <td className="px-3 py-2.5 align-top">
                    <div className="font-medium text-fg">{p.name}</div>
                    {p.description && (
                      <div className="text-[11px] text-fg-muted max-w-xs truncate">{p.description}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 align-top font-mono text-xs text-fg-muted">{p.tier}</td>
                  <td className="px-3 py-2.5 align-top tabular-nums text-xs">{p.level ?? '—'}</td>
                  <td className="px-3 py-2.5 align-top font-mono text-[10px] uppercase tracking-[0.12em] text-fg-muted">
                    {p.billingMode}
                  </td>
                  <td className="px-3 py-2.5 align-top tabular-nums font-mono text-xs">{priceLabel(p)}</td>
                  <td className="px-3 py-2.5 align-top tabular-nums text-xs">{sentinel(p.maxProperties)}</td>
                  <td className="px-3 py-2.5 align-top tabular-nums text-xs">{sentinel(p.maxUsers)}</td>
                  <td className="px-3 py-2.5 align-top tabular-nums text-xs">{sentinel(p.monthlyEvalCap)}</td>
                  <td className="px-3 py-2.5 align-top">
                    <div className="flex flex-wrap gap-1">
                      {p.scoringIncluded && <Pill tone="info">scoring</Pill>}
                      {p.isDefault && <Pill tone="ok">default</Pill>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <Pill tone={p.isActive ? 'ok' : 'bad'}>{p.isActive ? 'activo' : 'inactivo'}</Pill>
                  </td>
                  <td className="px-3 py-2.5 align-top whitespace-nowrap">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        className="btn btn-ghost h-8 px-2"
                        onClick={() => openEdit(p)}
                        disabled={busyId === p.id}
                      >
                        Editar
                      </button>
                      {p.isActive ? (
                        <button
                          className="btn btn-danger h-8 px-2"
                          onClick={() => handleDeactivate(p)}
                          disabled={busyId === p.id}
                          title="Quita el plan de /upgrade (los clientes ya no podrán elegirlo). No borra datos ni afecta suscripciones actuales; se puede reactivar."
                        >
                          {busyId === p.id ? '…' : 'Desactivar'}
                        </button>
                      ) : (
                        <button
                          className="btn h-8 px-2"
                          onClick={() => handleReactivate(p)}
                          disabled={busyId === p.id}
                        >
                          {busyId === p.id ? '…' : 'Reactivar'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          )}
        </>
      )}
    </div>
  )
}
