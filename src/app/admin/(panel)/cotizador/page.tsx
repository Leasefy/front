'use client'

import { useState } from 'react'

import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Pill } from '@/components/admin/Pill'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { ApiError } from '@/lib/admin/api'
import {
  listCarriers,
  createCarrier,
  updateCarrier,
  deleteCarrier,
  type CarrierRow,
} from '@/lib/admin/cotizador'
import { CarrierForm } from './CarrierForm'
import { PreScoringConfigCard } from './PreScoringConfigCard'
import {
  carrierToFormValues,
  toCreateCarrierBody,
  toUpdateCarrierBody,
  type CarrierFormValues,
} from './carrier-form-schema'

/** Extrae el mensaje real del micro (`{ success:false, error }`), no `.message`. */
function carrierErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const body = err.body as { error?: string } | undefined
    return body?.error ?? err.message
  }
  return fallback
}

type FormMode =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'edit'; carrier: CarrierRow }

/**
 * /admin/cotizador — registry de carriers de cotización (empezando por
 * Fianly). CRUD sobre `cotizador.ts`; el form vive inline sobre la tabla (el
 * admin no tiene modal system, mismo patrón que /admin/plans). Las
 * credenciales son write-only: nunca se leen del backend, solo se escriben
 * cuando el admin las completa explícitamente.
 */
export default function CotizadorPage() {
  const { data, isLoading, error, refetch } = useApiQuery<CarrierRow[]>(
    (signal) => listCarriers(signal),
    [],
  )

  const [form, setForm] = useState<FormMode>({ kind: 'none' })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [busyName, setBusyName] = useState<string | null>(null)
  const [rowError, setRowError] = useState<string | null>(null)

  const carriers = data ?? []

  function openCreate() {
    setFormError(null)
    setForm({ kind: 'create' })
  }

  function openEdit(carrier: CarrierRow) {
    setFormError(null)
    setForm({ kind: 'edit', carrier })
  }

  function closeForm() {
    setForm({ kind: 'none' })
    setFormError(null)
  }

  async function handleSubmit(values: CarrierFormValues) {
    setSubmitting(true)
    setFormError(null)
    try {
      if (form.kind === 'create') {
        await createCarrier(toCreateCarrierBody(values))
      } else if (form.kind === 'edit') {
        await updateCarrier(form.carrier.name, toUpdateCarrierBody(values))
      }
      refetch()
      closeForm()
    } catch (err) {
      setFormError(carrierErrorMessage(err, 'No se pudo guardar el carrier.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(carrier: CarrierRow) {
    if (
      !window.confirm(
        `¿Eliminar el carrier "${carrier.name}"?\n\n` +
          'Se desactiva (soft-delete): deja de cotizar pero no se borran datos ni credenciales.',
      )
    )
      return
    setRowError(null)
    setBusyName(carrier.name)
    try {
      await deleteCarrier(carrier.name)
      refetch()
    } catch (err) {
      setRowError(carrierErrorMessage(err, 'No se pudo eliminar el carrier.'))
    } finally {
      setBusyName(null)
    }
  }

  const columns: Column<CarrierRow>[] = [
    {
      header: 'Nombre',
      cell: (c) => (
        <div>
          <div className="font-medium text-fg">{c.name}</div>
          {c.displayName && <div className="text-[11px] text-fg-muted">{c.displayName}</div>}
        </div>
      ),
    },
    {
      header: 'Producto',
      cell: (c) => <span className="text-xs text-fg-muted">{c.productType}</span>,
    },
    {
      header: 'Modo',
      cell: (c) => <Pill tone="info">{c.mode}</Pill>,
    },
    {
      header: 'Estado',
      cell: (c) => <Pill tone={c.enabled ? 'ok' : 'bad'}>{c.enabled ? 'activo' : 'inactivo'}</Pill>,
    },
    {
      header: 'Credenciales',
      cell: (c) =>
        c.has_config ? (
          <Pill tone="ok">configurado ✓</Pill>
        ) : (
          <Pill tone="warn">sin credenciales</Pill>
        ),
    },
    {
      header: '',
      align: 'right',
      cell: (c) => (
        <div className="flex items-center gap-2 justify-end">
          <button
            className="btn btn-ghost h-8 px-2"
            onClick={() => openEdit(c)}
            disabled={busyName === c.name}
          >
            Editar
          </button>
          <button
            className="btn btn-danger h-8 px-2"
            onClick={() => handleDelete(c)}
            disabled={busyName === c.name}
          >
            {busyName === c.name ? '…' : 'Eliminar'}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        label="31 · cotizador"
        title="Aseguradoras"
        description="Registry de carriers del cotizador (empezando por Fianly). Configurá la ruta, el modo de integración y las credenciales — se guardan encriptadas y nunca se muestran de vuelta."
        right={
          form.kind === 'none' ? (
            <button className="btn btn-primary" onClick={openCreate}>
              Nuevo carrier
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
          <CarrierForm
            mode={form.kind}
            initialValues={form.kind === 'edit' ? carrierToFormValues(form.carrier) : undefined}
            hasConfig={form.kind === 'edit' ? form.carrier.has_config : undefined}
            isSubmitting={submitting}
            submitError={formError}
            onSubmit={handleSubmit}
            onCancel={closeForm}
          />
        </div>
      )}

      <DataTable
        columns={columns}
        rows={carriers}
        getKey={(c) => c.id}
        isLoading={isLoading}
        error={error}
        emptyTitle="Sin carriers"
        emptyHint='Creá el primero con "Nuevo carrier".'
      />

      <div className="mt-8">
        <PreScoringConfigCard />
      </div>
    </div>
  )
}
