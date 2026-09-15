'use client'

/**
 * Partes — quién es el dueño y quién el inquilino de este contrato.
 *
 * ── Los tres arreglos que pidió Nico (2026-09-12) ───────────────────────────
 *
 * 1. «En el contrato no está apareciendo el documento del inquilino. Sí trae
 *    el documento del propietario, pero el del inquilino no.»
 *    El dato SIEMPRE estuvo: `Contract.tenantDocument` está lleno en los 1.836
 *    contratos migrados y el back lo manda en `GET /contracts/:id`. Lo que
 *    faltaba era pintarlo — la fila del inquilino era un `InfoRow` con el
 *    nombre y nada más.
 *
 * 2. «Hay contratos que tienen tres propietarios y cada uno define cuál es el
 *    porcentaje de cada uno. Hay que dividir el canon entre los porcentajes
 *    que pidieron y tener la información de los tres propietarios.»
 *    Se listan TODOS, con su porcentaje y su parte del canon. El reparto lo
 *    hace el BACK con la misma función que la dispersión (`repartirLaLiquidacion`
 *    / `alocarEntreCopropietarios`): acá no se divide nada, porque una segunda
 *    cuenta es una cuenta que un día no coincide con la que gira la plata.
 *    Si las participaciones no suman 100 % se DICE, no se esconde.
 *
 * 3. «No se presentan tanto múltiples inquilinos, pero puede darse el caso.»
 *    El principal va marcado; los coarrendatarios se agregan y se quitan acá.
 *
 * ── Dónde se editan los porcentajes ─────────────────────────────────────────
 *
 * Los dueños y sus porcentajes viven en el MANDATO del inmueble
 * (`consignacion_propietarios`), no en el contrato: un inmueble tiene un
 * mandato y ese mandato tiene N dueños. Por eso «Agregar» y «Editar» de esta
 * tarjeta abren el MISMO diálogo que la ficha del inmueble
 * (`EditarPropietariosDialog`) sobre el mandato resuelto por `propertyId`, y
 * al guardar se relee el contrato para que el reparto que se pinta sea el que
 * calculó el back. Nico, 2026-09-13: «un inmueble puede tener múltiples
 * propietarios con diferentes % del canon» — y el propietario no tenía
 * «+ Agregar» mientras el inquilino sí.
 */

import { useState } from 'react'
import Link from 'next/link'
import { PencilSimple, Plus, Trash, Warning } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from '@/components/ui/toast'
import { conRegreso } from '@/lib/nav/ruta-de-regreso'
import { contractsApi } from '@/lib/api/contracts.service'
import { consignacionesApi } from '@/lib/api/inmobiliaria.service'
import { formatCurrency } from '@/lib/types/inmobiliaria'
import type { Consignacion } from '@/lib/types/inmobiliaria'
import type {
  Contract,
  InquilinoDelContrato,
  PropietarioDelContrato,
} from '@/lib/types/contract'
import { EditarPropietariosDialog } from '@/components/inmobiliaria/EditarPropietariosDialog'
import { InvitarInquilino } from './InvitarInquilino'

interface Props {
  contract: Contract
  /** `canAccess('contratos', 'create')` — el mismo que exige invitar. */
  puedeInvitar: boolean
  /** `canAccess('contratos', 'edit')` — el que exige el back para coarrendatarios. */
  puedeEditar: boolean
  onActualizado: (c: Contract) => void
  onConflicto: () => void
}

export function PartesDelContrato({
  contract,
  puedeInvitar,
  puedeEditar,
  onActualizado,
  onConflicto,
}: Props) {
  /*
   * La lista de inquilinos se guarda acá y no se relee el contrato entero:
   * agregar un coarrendatario no cambia ninguna otra cosa de la ficha, y los
   * tres endpoints devuelven la lista completa a propósito.
   */
  const [inquilinos, setInquilinos] = useState<InquilinoDelContrato[] | null>(null)
  const lista = inquilinos ?? contract.inquilinosDelContrato ?? inquilinoDelSnapshot(contract)

  return (
    <div className="space-y-4">
      <Propietarios contract={contract} puedeEditar={puedeEditar} onActualizado={onActualizado} />

      <div className="space-y-2 border-t border-border pt-3 first:border-0 first:pt-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {lista.length > 1 ? `Inquilinos (${lista.length})` : 'Inquilino'}
          </p>
          {puedeEditar ? (
            <AgregarInquilino
              contractId={contract.id}
              onListaNueva={setInquilinos}
            />
          ) : null}
        </div>

        {lista.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="sin-inquilino">
            Este contrato entró por migración sin inquilino.
          </p>
        ) : (
          <ul className="space-y-2" data-testid="inquilinos-del-contrato">
            {lista.map((i) => (
              <FilaDeInquilino
                key={i.id ?? 'principal'}
                inquilino={i}
                contractId={contract.id}
                puedeEditar={puedeEditar}
                onListaNueva={setInquilinos}
              />
            ))}
          </ul>
        )}

        {/* La salida de un contrato migrado sin cuenta de inquilino: se
            muestra sólo mientras `tenantId` siga null (T-0036 §3.2.B6). */}
        {contract.tenantId === null && (
          <div className="pt-1">
            <InvitarInquilino
              contract={contract}
              puedeInvitar={puedeInvitar}
              onActualizado={onActualizado}
              onConflicto={onConflicto}
            />
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * El inquilino del contrato cuando el back todavía no manda la lista.
 *
 * Es la MISMA regla del back (`armarInquilinosDelContrato`): sin nombre, ni
 * documento, ni cuenta no hay a quién mostrar. Duplicarla acá es lo que
 * permite que la pantalla no quede vacía contra un back viejo, y es el único
 * sitio donde se duplica.
 */
function inquilinoDelSnapshot(contract: Contract): InquilinoDelContrato[] {
  if (!contract.tenantName && !contract.tenantDocument && !contract.tenantId) return []
  return [
    {
      id: null,
      userId: contract.tenantId,
      nombre: contract.tenantName,
      documento: contract.tenantDocument,
      email: contract.tenantEmail || null,
      telefono: contract.tenantPhone || null,
      esPrincipal: true,
    },
  ]
}

function FilaDeInquilino({
  inquilino,
  contractId,
  puedeEditar,
  onListaNueva,
}: {
  inquilino: InquilinoDelContrato
  contractId: string
  puedeEditar: boolean
  onListaNueva: (lista: InquilinoDelContrato[]) => void
}) {
  const [quitando, setQuitando] = useState(false)
  // Quitar a alguien de un contrato no se hace a un clic: el ícono de la
  // basura queda a centímetros del nombre y un toque de más en el celular lo
  // sacaba sin preguntar (DESIGN.md §17: confirmación = AlertDialog).
  const [confirmando, setConfirmando] = useState(false)

  async function quitar() {
    if (!inquilino.id) return
    setQuitando(true)
    try {
      const lista = await contractsApi.quitarInquilino(contractId, inquilino.id)
      setConfirmando(false)
      onListaNueva(lista)
      toast.success('Lo quitamos del contrato.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No pudimos quitarlo.')
    } finally {
      setQuitando(false)
    }
  }

  return (
    <li className="flex items-start justify-between gap-3 text-sm">
      <div className="min-w-0">
        {/* `break-words`, no `truncate`: la columna es angosta y un nombre
            cortado a la mitad no identifica a nadie. */}
        <p className="break-words font-medium text-foreground">{inquilino.nombre || '—'}</p>
        {/* 🔴 Lo que faltaba: el documento. Es lo que identifica a la persona
            —el correo sólo le crea la cuenta—, así que va debajo del nombre
            igual que en la fila del propietario. */}
        <p className="text-xs text-muted-foreground" data-testid="documento-del-inquilino">
          {inquilino.documento || 'Sin documento'}
        </p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        {inquilino.esPrincipal ? (
          <span
            className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary"
            data-testid="inquilino-principal"
          >
            Principal
          </span>
        ) : puedeEditar ? (
          <button
            type="button"
            aria-label={`Quitar a ${inquilino.nombre}`}
            disabled={quitando}
            onClick={() => setConfirmando(true)}
            className="text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
          >
            <Trash className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <AlertDialog open={confirmando} onOpenChange={(abierto) => !quitando && setConfirmando(abierto)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar a {inquilino.nombre || 'este coarrendatario'} del contrato?</AlertDialogTitle>
            <AlertDialogDescription>
              {inquilino.nombre || 'Esta persona'}
              {inquilino.documento ? ` (documento ${inquilino.documento})` : ''} deja de
              figurar como coarrendatario de este contrato. El inquilino principal no
              cambia. Si fue un error, puedes volver a agregarlo desde esta misma sección.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={quitando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              tone="danger"
              disabled={quitando}
              data-testid="confirmar-quitar-inquilino"
              onClick={(e) => {
                // Se queda abierto mientras quita: el cierre lo decide la respuesta.
                e.preventDefault()
                void quitar()
              }}
            >
              {quitando ? 'Quitando…' : 'Quitar del contrato'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  )
}

function AgregarInquilino({
  contractId,
  onListaNueva,
}: {
  contractId: string
  onListaNueva: (lista: InquilinoDelContrato[]) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [documento, setDocumento] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')

  async function guardar() {
    setGuardando(true)
    setError(null)
    try {
      onListaNueva(
        await contractsApi.agregarInquilino(contractId, {
          nombre: nombre.trim(),
          documento: documento.trim(),
          email: email.trim() || undefined,
          telefono: telefono.trim() || undefined,
        }),
      )
      toast.success('Lo sumamos al contrato.')
      setAbierto(false)
      setNombre('')
      setDocumento('')
      setEmail('')
      setTelefono('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos agregarlo.')
    } finally {
      setGuardando(false)
    }
  }

  // Nombre y documento son lo mínimo: el documento es quien identifica.
  const listo = nombre.trim().length > 0 && documento.trim().length > 0

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        hideArrow
        onClick={() => setAbierto(true)}
        data-testid="agregar-inquilino"
      >
        <Plus className="mr-1 h-4 w-4" />
        Agregar
      </Button>

      <Dialog open={abierto} onOpenChange={(v) => !guardando && setAbierto(v)}>
        <DialogContent className="max-w-md" data-testid="agregar-inquilino-dialogo">
          <DialogHeader>
            <DialogTitle>Agregar un inquilino</DialogTitle>
            <DialogDescription>
              Un coarrendatario más en este contrato. El titular no cambia: los
              cobros, el portal y la firma siguen siendo del principal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Campo etiqueta="Nombre completo" valor={nombre} onChange={setNombre} testId="inquilino-nombre" />
            <Campo
              etiqueta="Documento"
              valor={documento}
              onChange={setDocumento}
              testId="inquilino-documento"
              ayuda="Es lo que identifica a la persona. El correo sólo sirve para crearle cuenta."
            />
            <Campo etiqueta="Correo (opcional)" valor={email} onChange={setEmail} testId="inquilino-email" />
            <Campo etiqueta="Teléfono (opcional)" valor={telefono} onChange={setTelefono} testId="inquilino-telefono" />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <DialogFooter>
            <Button variant="outline" hideArrow onClick={() => setAbierto(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button
              hideArrow
              disabled={!listo || guardando}
              isLoading={guardando}
              onClick={() => void guardar()}
              data-testid="guardar-inquilino"
            >
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Campo({
  etiqueta,
  valor,
  onChange,
  testId,
  ayuda,
}: {
  etiqueta: string
  valor: string
  onChange: (v: string) => void
  testId: string
  ayuda?: string
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground" htmlFor={testId}>
        {etiqueta}
      </label>
      <Input id={testId} data-testid={testId} value={valor} onChange={(e) => onChange(e.target.value)} />
      {ayuda ? <p className="text-[11px] text-muted-foreground">{ayuda}</p> : null}
    </div>
  )
}

/**
 * Los dueños del inmueble.
 *
 * `propietariosDelContrato` es la lista completa; `propietarioDeLaConsignacion`
 * es el principal derivado y se sigue usando cuando el back no manda la lista
 * (respuesta vieja). `landlordName` NO es el dueño en un contrato migrado: es
 * el usuario que corrió la migración — en QA los 99 contratos decían
 * «Propietario: victor ortiz».
 */
function Propietarios({
  contract,
  puedeEditar,
  onActualizado,
}: {
  contract: Contract
  puedeEditar: boolean
  onActualizado: (c: Contract) => void
}) {
  const lista = contract.propietariosDelContrato?.propietarios ?? []
  const sumanCien = contract.propietariosDelContrato?.sumanCien ?? true
  const varios = lista.length > 1
  // Sólo hay qué editar cuando hay un mandato detrás: la lista viene de él.
  const hayMandato = lista.length > 0 && Boolean(contract.propertyId)
  const fichaDelInmueble = contract.propertyId
    ? conRegreso(
        `/panel/inmobiliaria/inmuebles/${contract.propertyId}`,
        `/panel/inmobiliaria/contratos/${contract.id}`,
      )
    : null

  if (lista.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Propietario
        </p>
        <SinPropietarios contract={contract} />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {varios ? `Propietarios (${lista.length})` : 'Propietario'}
        </p>
        {puedeEditar && hayMandato ? (
          <EditarPropietarios contract={contract} onActualizado={onActualizado} />
        ) : null}
      </div>

      {!sumanCien ? (
        /* Nunca se esconde: con participaciones torcidas el back NO reparte el
           canon, y una lista sin el aviso se lee como si estuviera bien. */
        <p
          className="flex items-start gap-1.5 text-xs text-warning"
          data-testid="participaciones-no-suman"
        >
          <Warning className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <span>
            Los porcentajes suman {(contract.propietariosDelContrato?.sumaBps ?? 0) / 100} %, no
            100 %. Mientras no cuadren no se reparte el canon:{' '}
            {fichaDelInmueble ? (
              <Link
                href={fichaDelInmueble}
                className="underline underline-offset-2 hover:text-foreground"
                data-testid="corregir-en-el-inmueble"
              >
                corrígelos en el mandato del inmueble
              </Link>
            ) : (
              'corrígelos en el mandato del inmueble'
            )}
            .
          </span>
        </p>
      ) : null}

      <ul className="space-y-2" data-testid="propietarios-del-contrato">
        {lista.map((p) => (
          <li key={p.id} className="flex items-start justify-between gap-3 text-sm">
            <div className="min-w-0">
              <Link
                href={conRegreso(
                  `/panel/inmobiliaria/propietarios/${p.id}`,
                  `/panel/inmobiliaria/contratos/${contract.id}`,
                )}
                className="block break-words font-medium text-foreground hover:underline"
                data-testid="propietario-ficha"
              >
                {p.name}
              </Link>
              <span className="block text-xs text-muted-foreground">{p.documentNumber}</span>
            </div>
            {varios ? (
              /* El % y la plata de cada uno, y el chip en el mayoritario — el
                 mismo chip que lleva el inquilino principal más abajo. Con un
                 solo dueño nada de esto: «100 %» y «Principal» serían ruido. */
              <div className="flex flex-shrink-0 items-start gap-2">
                <div className="text-right">
                  <span className="block text-sm font-medium tabular-nums text-foreground">
                    {p.participacion}
                  </span>
                  {p.canonCop !== null ? (
                    <span
                      className="block text-xs tabular-nums text-muted-foreground"
                      data-testid="canon-del-propietario"
                    >
                      {formatCurrency(p.canonCop)} del canon
                    </span>
                  ) : null}
                </div>
                {p.esPrincipal ? (
                  <span
                    className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary"
                    data-testid="propietario-principal"
                  >
                    Principal
                  </span>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * «Agregar» y «Editar» del propietario, como los tiene el inquilino.
 *
 * Los dos abren el MISMO diálogo (`EditarPropietariosDialog`) sobre el mandato
 * del inmueble del contrato: el contrato sólo tiene `propertyId`, y
 * `agencyId + propertyId` es único, así que `getAll({ propertyId })` devuelve
 * cero o un mandato. Al guardar se relee el contrato entero — el reparto del
 * canon lo calcula el back con la misma función que la dispersión, y acá no
 * se recalcula nada por nuestra cuenta.
 */
function EditarPropietarios({
  contract,
  onActualizado,
}: {
  contract: Contract
  onActualizado: (c: Contract) => void
}) {
  const [consignacion, setConsignacion] = useState<Consignacion | null>(null)
  const [abierto, setAbierto] = useState(false)
  const [buscando, setBuscando] = useState(false)

  async function abrir() {
    if (!contract.propertyId || buscando) return
    setBuscando(true)
    try {
      const [mandato] = await consignacionesApi.getAll({ propertyId: contract.propertyId })
      if (!mandato) {
        toast.error('El inmueble no está consignado: registra al propietario en Inmuebles.')
        return
      }
      setConsignacion(mandato)
      setAbierto(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No pudimos abrir el mandato del inmueble.')
    } finally {
      setBuscando(false)
    }
  }

  async function guardado() {
    try {
      onActualizado(await contractsApi.getById(contract.id))
    } catch {
      // Los dueños ya quedaron guardados en el mandato; si la relectura del
      // contrato falla, el refresco de la página los trae.
    }
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          hideArrow
          onClick={() => void abrir()}
          disabled={buscando}
          data-testid="agregar-propietario"
        >
          <Plus className="mr-1 h-4 w-4" />
          Agregar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          hideArrow
          onClick={() => void abrir()}
          disabled={buscando}
          data-testid="editar-propietarios"
        >
          <PencilSimple className="mr-1 h-4 w-4" />
          Editar
        </Button>
      </div>
      {consignacion ? (
        <EditarPropietariosDialog
          open={abierto}
          consignacion={consignacion}
          onClose={() => setAbierto(false)}
          onGuardado={(actualizada) => {
            setConsignacion(actualizada)
            void guardado()
          }}
        />
      ) : null}
    </>
  )
}

/** Sin consignación no hay a quién mostrar: se dice, en vez de caer al nombre equivocado. */
function SinPropietarios({ contract }: { contract: Contract }) {
  const p = contract.propietarioDeLaConsignacion
  if (p) {
    return (
      <div className="flex items-start justify-between gap-3 text-sm">
        <div className="min-w-0">
          <Link
            href={conRegreso(
              `/panel/inmobiliaria/propietarios/${p.id}`,
              `/panel/inmobiliaria/contratos/${contract.id}`,
            )}
            className="block break-words font-medium text-foreground hover:underline"
            data-testid="propietario-ficha"
          >
            {p.name}
          </Link>
          <span className="block text-xs text-muted-foreground">{p.documentNumber}</span>
        </div>
      </div>
    )
  }
  if (contract.contractOrigin === 'MIGRATED') {
    return (
      <p className="text-xs text-muted-foreground" data-testid="propietario-sin-consignacion">
        {contract.propertyId
          ? 'El inmueble no está consignado: registra al propietario en Inmuebles.'
          : 'Se vincula con el inmueble.'}
      </p>
    )
  }
  return <p className="text-sm font-medium text-foreground">{contract.landlordName || '—'}</p>
}

export type { PropietarioDelContrato }
export default PartesDelContrato
