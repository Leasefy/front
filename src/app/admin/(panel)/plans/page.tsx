'use client'

import { useMemo, useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'

import { PageHeader } from '@/components/admin/screen/PageHeader'
import { LoadingBlock, ErrorBlock, EmptyBlock } from '@/components/admin/screen/states'
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
import { Card } from '@leasefy/cadence'
import { Button } from '@/components/ui/button'

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
  /** Los errores del back por campo, para el formulario (02-10-2026). */
  const [serverFieldErrors, setServerFieldErrors] = useState<Partial<Record<keyof PlanFormValues, string>>>({})

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
    if (
      !window.confirm(
        `¿Desactivar el plan "${plan.name}"?\n\n` +
          'Se quita de /upgrade (los clientes ya no podrán elegirlo), pero NO se ' +
          'borran datos ni se afectan las suscripciones actuales. Puedes reactivarlo luego.',
      )
    )
      return
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

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Planes de inmobiliaria"
        description="Catálogo de planes AGENCY (contrato 29). Crea, edita y desactiva planes. Los inactivos quedan atenuados y se pueden reactivar. El slug es inmutable tras crear."
        right={
          form.kind === 'none' ? (
            <Button hideArrow onClick={openCreate}>
              Nuevo plan
            </Button>
          ) : undefined
        }
      />

      {rowError && (
        <Card className="p-4  mb-6">
          <p className="text-sm text-danger">{rowError}</p>
        </Card>
      )}

      {form.kind !== 'none' && (
        <div className="mb-8">
          <PlanForm
            mode={form.kind}
            initialValues={form.kind === 'edit' ? planToFormValues(form.plan) : undefined}
            otherDefaultExists={otherDefaultExists}
            isSubmitting={submitting}
            submitError={formError}
            serverFieldErrors={serverFieldErrors}
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
        <EmptyBlock title="Sin planes" hint="Crea el primer plan AGENCY con “Nuevo plan”." />
      ) : (
        <>
          {/* Filtro — por defecto solo activos (lista limpia con los que se usan). */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-caption text-fg-muted">
              Mostrando {visiblePlans.length} de {plans.length} planes
              {inactiveCount > 0 && !showInactive ? ` · ${inactiveCount} inactivo(s) oculto(s)` : ''}
            </p>
            <label className="flex cursor-pointer select-none items-center gap-2.5 text-body-sm text-fg-muted">
              <Switch checked={showInactive} onCheckedChange={setShowInactive} aria-label="Mostrar inactivos" />
              Mostrar inactivos
            </label>
          </div>

          {visiblePlans.length === 0 ? (
            <EmptyBlock
              title="Sin planes activos"
              hint="Todos los planes están inactivos. Activa “Mostrar inactivos” para verlos y reactivarlos."
            />
          ) : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border">
                {['Nombre', 'Slug', 'Nivel', 'Cobro', 'Precio', 'Propiedades', 'Usuarios', 'Eval/mes', 'Flags', 'Estado', ''].map(
                  (h, i) => (
                    <TableHead
                      key={i}
                      
                    >
                      {h}
                    </TableHead>
                  ),
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiblePlans.map((p) => (
                <TableRow key={p.id} className={p.isActive ? undefined : 'opacity-50'}>
                  <TableCell className="align-top">
                    <div className="font-medium text-fg">{p.name}</div>
                    {p.description && (
                      <div className="text-[11px] text-fg-muted max-w-xs truncate">{p.description}</div>
                    )}
                  </TableCell>
                  <TableCell className="align-top font-mono text-caption text-fg-muted">{p.tier}</TableCell>
                  <TableCell className="align-top tabular-nums text-caption">{p.level ?? '—'}</TableCell>
                  <TableCell className="align-top font-mono text-[10px] uppercase tracking-[0.12em] text-fg-muted">
                    {p.billingMode}
                  </TableCell>
                  <TableCell className="align-top tabular-nums font-mono text-caption">{priceLabel(p)}</TableCell>
                  <TableCell className="align-top tabular-nums text-caption">{sentinel(p.maxProperties)}</TableCell>
                  <TableCell className="align-top tabular-nums text-caption">{sentinel(p.maxUsers)}</TableCell>
                  <TableCell className="align-top tabular-nums text-caption">{sentinel(p.monthlyEvalCap)}</TableCell>
                  <TableCell className="align-top">
                    <div className="flex flex-wrap gap-1">
                      {p.scoringIncluded && <Pill tone="info">scoring</Pill>}
                      {p.isDefault && <Pill tone="ok">default</Pill>}
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <Pill tone={p.isActive ? 'ok' : 'bad'}>{p.isActive ? 'activo' : 'inactivo'}</Pill>
                  </TableCell>
                  <TableCell className="align-top whitespace-nowrap">
                    <div className="flex items-center gap-2 justify-end">
                      <Button variant="ghost" hideArrow className="h-8 px-2" onClick={() => openEdit(p)}
                        disabled={busyId === p.id}
                      >
                        Editar
                      </Button>
                      {p.isActive ? (
                        <Button variant="destructive" hideArrow className="h-8 px-2" onClick={() => handleDeactivate(p)}
                          disabled={busyId === p.id}
                          title="Quita el plan de /upgrade (los clientes ya no podrán elegirlo). No borra datos ni afecta suscripciones actuales; se puede reactivar."
                        >
                          {busyId === p.id ? '…' : 'Desactivar'}
                        </Button>
                      ) : (
                        <Button variant="outline" hideArrow className="h-8 px-2" onClick={() => handleReactivate(p)}
                          disabled={busyId === p.id}
                        >
                          {busyId === p.id ? '…' : 'Reactivar'}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
          )}
        </>
      )}
    </div>
  )
}
