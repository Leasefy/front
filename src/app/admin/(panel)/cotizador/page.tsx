'use client'

import { useState } from 'react'

import { legible } from '@/lib/admin/textos-del-admin'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Pill } from '@/components/admin/Pill'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { ApiError } from '@/lib/admin/api'
import { mensajeDelAdmin } from '@/lib/admin/errores-del-admin'
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
import { Alert } from '@leasefy/cadence'
import { Button } from '@/components/ui/button'
import { confirmar } from '@/components/ui/confirmar'

/**
 * El mensaje real del micro (`{ success:false, error }`), con la regla de oro
 * (02-10-2026): delega en `mensajeDelAdmin`. Antes, todo lo que no era un
 * `ApiError` —también la red— caía en el texto fijo, y un `error` que era un
 * objeto (el sobre nuevo del micro) llegaba tal cual a la pantalla.
 */
function carrierErrorMessage(err: unknown, fallback: string, accion: string): string {
  return mensajeDelAdmin(err, { porDefecto: fallback, accion })
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
const MODO: Record<string, string> = {
  stub: 'De prueba',
  rest: 'API',
  'form-rpa': 'Formulario automático',
  'email-broker': 'Por correo',
  'open-finance': 'Open finance',
}
const PRODUCTO: Record<string, string> = { seguro: 'Seguro', fianza: 'Fianza' }

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
      setFormError(carrierErrorMessage(err, 'No se pudo guardar el carrier.', 'guardar el carrier'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(carrier: CarrierRow) {
    const ok = await confirmar({
      tipo: 'advertencia',
      titulo: `¿Desactivar la aseguradora «${carrier.displayName || carrier.name}»?`,
      descripcion: 'Deja de cotizar. No se borran sus datos ni sus credenciales.',
      accion: 'Desactivar',
    })
    if (!ok) return
    setRowError(null)
    setBusyName(carrier.name)
    try {
      await deleteCarrier(carrier.name)
      refetch()
    } catch (err) {
      setRowError(carrierErrorMessage(err, 'No se pudo eliminar el carrier.', 'eliminar el carrier'))
    } finally {
      setBusyName(null)
    }
  }

  const columns: Column<CarrierRow>[] = [
    {
      header: 'Aseguradora',
      orden: (c) => c.displayName || c.name,
      texto: (c) => c.displayName || c.name,
      cell: (c) => (
        <div>
          <div className="font-medium text-fg">{c.name}</div>
          {c.displayName && <div className="text-[11px] text-fg-muted">{c.displayName}</div>}
        </div>
      ),
    },
    {
      header: 'Producto',
      orden: (c) => c.productType,
      texto: (c) => PRODUCTO[c.productType] ?? c.productType,
      cell: (c) => <span className="text-caption text-fg-muted">{PRODUCTO[c.productType] ?? c.productType}</span>,
    },
    {
      header: 'Conexión',
      orden: (c) => c.mode,
      texto: (c) => MODO[c.mode] ?? legible(c.mode),
      cell: (c) => <Pill tone="neutral">{MODO[c.mode] ?? legible(c.mode)}</Pill>,
    },
    {
      header: 'Estado',
      orden: (c) => (c.enabled ? 0 : 1),
      texto: (c) => (c.enabled ? 'Activa' : 'Inactiva'),
      cell: (c) => <Pill tone={c.enabled ? 'ok' : 'muted'}>{c.enabled ? 'Activa' : 'Inactiva'}</Pill>,
    },
    {
      header: 'Credenciales',
      orden: (c) => (c.has_config ? 0 : 1),
      texto: (c) => (c.has_config ? 'Puestas' : 'Sin credenciales'),
      cell: (c) => (c.has_config ? <Pill tone="ok">Puestas</Pill> : <Pill tone="warn">Sin credenciales</Pill>),
    },
    {
      header: '',
      align: 'right',
      cell: (c) => (
        <div className="flex items-center gap-2 justify-end">
          <Button variant="ghost" hideArrow className="h-8 px-2" onClick={() => openEdit(c)}
            disabled={busyName === c.name}
          >
            Editar
          </Button>
          <Button variant="destructive" hideArrow className="h-8 px-2" onClick={() => handleDelete(c)}
            disabled={busyName === c.name}
          >
            {busyName === c.name ? '…' : 'Desactivar'}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Aseguradoras"
        description="Las aseguradoras del cotizador: la ruta, cómo se conecta y sus credenciales."
        ayuda={
          <ParaEntenderMas etiqueta="Cómo funciona" titulo="Las aseguradoras del cotizador" variante="secundario">
            <p className="text-body-sm text-fg-muted">
              Empezando por Fianly. Las credenciales se guardan cifradas y nunca se vuelven a mostrar: al editar una
              aseguradora sólo se ve si están puestas.
            </p>
          </ParaEntenderMas>
        }
        principal={
          form.kind === 'none' ? (
            <Button size="sm" hideArrow onClick={openCreate}>
              Nueva aseguradora
            </Button>
          ) : undefined
        }
      />

      {rowError ? <Alert variant="danger">{rowError}</Alert> : null}

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
        onReintentar={refetch}
        emptyTitle="Todavía no hay aseguradoras"
        emptyHint="Crea la primera con «Nueva aseguradora»."
        aria-label="Aseguradoras del cotizador"
        queSon={['aseguradora', 'aseguradoras']}
        buscar="Nombre de la aseguradora"
        textoExtra={(c) => c.name}
        segmentos={[
          { valor: 'todas', nombre: 'Todas', cumple: () => true },
          { valor: 'activas', nombre: 'Activas', cumple: (c) => c.enabled },
          { valor: 'inactivas', nombre: 'Inactivas', cumple: (c) => !c.enabled },
          { valor: 'sin-credenciales', nombre: 'Sin credenciales', cumple: (c) => !c.has_config },
        ]}
        exportar="aseguradoras-del-cotizador"
        masEnElExcel={[{ header: 'Código', texto: (c) => c.name }]}
      />

      <PreScoringConfigCard />
    </div>
  )
}
