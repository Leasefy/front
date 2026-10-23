'use client'

import { useState } from 'react'

import { modoDeLaAseguradora } from '@/lib/admin/textos-del-admin'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
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
import { Cajon, CajonCabecera, CajonCuerpo } from '@/components/ui/cajon'
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
  rest: 'Conexión directa',
  'form-rpa': 'Formulario automático',
  'email-broker': 'Por correo',
  'open-finance': 'Open finance',
}
const PRODUCTO: Record<string, string> = { seguro: 'Seguro', fianza: 'Fianza' }

/**
 * El nombre de la aseguradora para la persona: el que le pusieron; sin él, el código escrito como nombre
 * («seguros-bolivar» → «Seguros bolivar»). El código tal cual sólo va al Excel.
 */
function nombreDeLaAseguradora(c: Pick<CarrierRow, 'name' | 'displayName'>): string {
  if (c.displayName && c.displayName.trim()) return c.displayName.trim()
  const t = c.name.replace(/[-_]+/g, ' ').trim()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

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
  const activas = carriers.filter((c) => c.enabled).length
  const conCredenciales = carriers.filter((c) => c.has_config).length

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
      titulo: `¿Desactivar la aseguradora «${nombreDeLaAseguradora(carrier)}»?`,
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

  // Ronda 28 (revisora r27, bloqueante): una inactiva no se «desactiva»; se vuelve a prender con el mismo
  // PATCH del formulario (sólo `enabled`, el resto no se toca).
  async function handleActivar(carrier: CarrierRow) {
    setRowError(null)
    setBusyName(carrier.name)
    try {
      await updateCarrier(carrier.name, { enabled: true })
      refetch()
    } catch (err) {
      setRowError(carrierErrorMessage(err, 'No se pudo activar la aseguradora.', 'activar la aseguradora'))
    } finally {
      setBusyName(null)
    }
  }

  const columns: Column<CarrierRow>[] = [
    {
      header: 'Aseguradora',
      orden: (c) => nombreDeLaAseguradora(c),
      texto: (c) => nombreDeLaAseguradora(c),
      // Ronda 28 (revisora r27, bloqueante): el NOMBRE arriba; el código interno («sura», «fianly») sólo
      // va al Excel y al buscador.
      cell: (c) => <span className="text-body-sm font-medium text-fg">{nombreDeLaAseguradora(c)}</span>,
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
      texto: (c) => MODO[c.mode] ?? modoDeLaAseguradora(c.mode),
      cell: (c) => <Pill tone="neutral">{MODO[c.mode] ?? modoDeLaAseguradora(c.mode)}</Pill>,
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
          {/* Ronda 28 (revisora r27): lo destructivo como texto (antes 14 botones rojos llenos) y, en las
              inactivas, «Activar» (antes «Desactivar» también en ellas, que no hacía nada). */}
          {c.enabled ? (
            <Button variant="ghost" hideArrow className="h-8 px-2 text-error hover:text-error" onClick={() => handleDelete(c)}
              disabled={busyName === c.name}
            >
              {busyName === c.name ? '…' : 'Desactivar'}
            </Button>
          ) : (
            <Button variant="ghost" hideArrow className="h-8 px-2" onClick={() => handleActivar(c)}
              disabled={busyName === c.name}
            >
              {busyName === c.name ? '…' : 'Activar'}
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Cotizador"
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
          <Button size="sm" hideArrow onClick={openCreate} disabled={form.kind !== 'none'}>
            Nueva aseguradora
          </Button>
        }
      />

      {/* Ronda 28 (revisora r27): LA RESPUESTA, cuántas cotizan y cuántas tienen con qué conectarse. */}
      {data && carriers.length > 0 ? (
        <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
          <CifraHeroe
            rotulo="Aseguradoras que cotizan"
            cifra={`${activas.toLocaleString('es-CO')} de ${carriers.length.toLocaleString('es-CO')}`}
            contexto={
              conCredenciales === 0
                ? 'ninguna tiene credenciales puestas'
                : conCredenciales === carriers.length
                  ? 'todas con credenciales puestas'
                  : `${conCredenciales.toLocaleString('es-CO')} con credenciales puestas`
            }
            tamano="mediana"
            data-testid="cotizador-cifra"
          />
        </div>
      ) : null}

      {rowError ? <Alert variant="danger">{rowError}</Alert> : null}

      {/* Ronda 26 (decisión de Nico, 23-10): «Nueva aseguradora» y «Editar» en un CAJÓN, sin perder la lista. */}
      <Cajon abierto={form.kind !== 'none'} onOpenChange={(a) => (a ? null : closeForm())} tamano="lg">
        <CajonCabecera
          titulo={form.kind === 'edit' ? `Editar ${nombreDeLaAseguradora(form.carrier)}` : 'Nueva aseguradora'}
          descripcion="Las credenciales se guardan cifradas y nunca se vuelven a mostrar."
        />
        <CajonCuerpo>
          {form.kind !== 'none' ? (
            <CarrierForm
              key={form.kind === 'edit' ? form.carrier.id : 'nueva'}
              mode={form.kind}
              initialValues={form.kind === 'edit' ? carrierToFormValues(form.carrier) : undefined}
              hasConfig={form.kind === 'edit' ? form.carrier.has_config : undefined}
              isSubmitting={submitting}
              submitError={formError}
              onSubmit={handleSubmit}
              onCancel={closeForm}
            />
          ) : null}
        </CajonCuerpo>
      </Cajon>

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
          // Ronda 28 (revisora r27, T14): con ninguna (o todas) con credenciales, la pestaña repetía «Todas».
          ...(conCredenciales > 0 && conCredenciales < carriers.length
            ? [{ valor: 'sin-credenciales', nombre: 'Sin credenciales', cumple: (c: CarrierRow) => !c.has_config }]
            : []),
        ]}
        exportar="aseguradoras-del-cotizador"
        masEnElExcel={[{ header: 'Código', texto: (c) => c.name }]}
      />

      <PreScoringConfigCard />
    </div>
  )
}
