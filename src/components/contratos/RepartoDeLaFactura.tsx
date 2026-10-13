'use client'

/**
 * RepartoDeLaFactura — T-0163 (Anexo B4).
 *
 * Un contrato con varios inquilinos emite UNA factura electrónica por inquilino,
 * cada una por su parte. Esta sección muestra y edita esa parte. El titular es
 * el resto (100 % menos lo de los demás) y tiene que quedarse con algo.
 *
 * - Aquí no se divide plata: el back reparte cada línea con la misma función
 *   que usa en el lado del propietario. Acá sólo se valida lo que se escribe.
 * - Sólo aparece con 2+ inquilinos y si el back manda `participacionBps` (aun en
 *   `null`): contra un back anterior la sección no existe (un PUT sería un 404).
 * - Editar el reparto no reescribe meses ya facturados: aplica desde el próximo
 *   mes sin facturas generadas.
 */

import { useState } from 'react'
import { Equals, PencilSimple, Trash } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
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
import { contractsApi } from '@/lib/api/contracts.service'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import {
  bpsDelTitular,
  hayRepartoDeLaFactura,
  motivoDelReparto,
  partesIguales,
  porcentajeDeTexto,
  repartoEstaDefinido,
  textoDelPorcentaje,
} from '@/lib/contratos/reparto-de-la-factura'
import type { InquilinoDelContrato } from '@/lib/types/contract'

interface Props {
  contractId: string
  inquilinos: InquilinoDelContrato[]
  /** `canAccess('contratos', 'edit')`. */
  puedeEditar: boolean
  onListaNueva: (lista: InquilinoDelContrato[]) => void
}

export function RepartoDeLaFactura({ contractId, inquilinos, puedeEditar, onListaNueva }: Props) {
  const [editando, setEditando] = useState(false)
  // Lo que se escribe en cada campo, por id del coarrendatario.
  const [textos, setTextos] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmandoQuitar, setConfirmandoQuitar] = useState(false)
  const [quitando, setQuitando] = useState(false)

  if (!hayRepartoDeLaFactura(inquilinos)) return null

  const titular = inquilinos.find((i) => i.esPrincipal) ?? inquilinos[0]
  const otros = inquilinos.filter((i) => i !== titular)
  const definido = repartoEstaDefinido(inquilinos)

  const otrosBps = otros.map((i) => porcentajeDeTexto(textos[i.id ?? ''] ?? ''))
  const bpsTitular = bpsDelTitular(otrosBps)
  const problema = motivoDelReparto(otrosBps)

  function abrirEdicion() {
    const iniciales: Record<string, string> = {}
    if (definido) {
      for (const i of otros) iniciales[i.id ?? ''] = textoDelPorcentaje(i.participacionBps ?? 0)
    } else {
      // Un punto de partida razonable: partes iguales. No se guarda hasta que la persona lo confirme.
      const { otros: partes } = partesIguales(inquilinos.length)
      otros.forEach((i, n) => {
        iniciales[i.id ?? ''] = textoDelPorcentaje(partes[n] ?? 0)
      })
    }
    setTextos(iniciales)
    setError(null)
    setEditando(true)
  }

  function ponerPartesIguales() {
    const { otros: partes } = partesIguales(inquilinos.length)
    const siguiente: Record<string, string> = {}
    otros.forEach((i, n) => {
      siguiente[i.id ?? ''] = textoDelPorcentaje(partes[n] ?? 0)
    })
    setTextos(siguiente)
    setError(null)
  }

  async function guardar() {
    if (problema) return
    setGuardando(true)
    setError(null)
    try {
      const lista = await contractsApi.repartirFactura(contractId, [
        { inquilinoId: null, participacionBps: bpsTitular },
        ...otros.map((i, n) => ({ inquilinoId: i.id as string, participacionBps: otrosBps[n] })),
      ])
      onListaNueva(lista)
      setEditando(false)
      toast.success('Guardamos el reparto de la factura.')
    } catch (e) {
      const mensaje = mensajeParaLaPersona(e, {
        porDefecto: 'No pudimos guardar el reparto.',
        accion: 'guardar el reparto',
      })
      const codigo = (e as { code?: string }).code
      if (codigo === 'PARTICIPACIONES_DE_INQUILINOS_INVALIDAS') setError(mensaje)
      else toast.error(mensaje)
    } finally {
      setGuardando(false)
    }
  }

  async function quitarReparto() {
    setQuitando(true)
    try {
      onListaNueva(await contractsApi.quitarReparto(contractId))
      setConfirmandoQuitar(false)
      setEditando(false)
      toast.success('Quitamos el reparto: toda la factura va al titular.')
    } catch (e) {
      toast.error(
        mensajeParaLaPersona(e, {
          porDefecto: 'No pudimos quitar el reparto.',
          accion: 'quitar el reparto',
        }),
      )
    } finally {
      setQuitando(false)
    }
  }

  return (
    <div className="space-y-2 border-t border-border pt-3" data-testid="reparto-de-la-factura">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Reparto de la factura
        </p>
        {puedeEditar && !editando ? (
          <Button variant="ghost" size="sm" hideArrow onClick={abrirEdicion} data-testid="editar-reparto">
            <PencilSimple className="mr-1 h-4 w-4" />
            {definido ? 'Editar' : 'Repartir'}
          </Button>
        ) : null}
      </div>

      {!editando ? (
        definido ? (
          <ul className="space-y-1" data-testid="reparto-lectura">
            {inquilinos.map((i) => (
              <li
                key={i.id ?? 'principal'}
                className="flex items-baseline justify-between gap-3 text-sm"
                data-testid="reparto-linea"
              >
                <span className="min-w-0 break-words text-foreground">
                  {i.nombre || '—'}
                  {' · '}
                  <span className="font-mono tabular-nums">{textoDelPorcentaje(i.participacionBps ?? 0)} %</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground" data-testid="reparto-sin-reparto">
            Sin reparto: toda la factura va al titular.
          </p>
        )
      ) : (
        <div className="space-y-3" data-testid="reparto-edicion">
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            <li className="flex items-center justify-between gap-3 px-3 py-2.5">
              <span className="min-w-0 break-words text-sm text-foreground">
                {titular.nombre || '—'} <span className="text-muted-foreground">(titular, el resto)</span>
              </span>
              <span
                className={`shrink-0 font-mono text-sm tabular-nums ${bpsTitular > 0 ? 'text-foreground' : 'text-destructive'}`}
                data-testid="reparto-titular"
              >
                {textoDelPorcentaje(Math.max(bpsTitular, 0))} %
              </span>
            </li>
            {otros.map((i) => (
              <li key={i.id ?? 'x'} className="flex items-center justify-between gap-3 px-3 py-2">
                <label
                  className="min-w-0 break-words text-sm text-foreground"
                  htmlFor={`reparto-pct-${i.id}`}
                >
                  {i.nombre || '—'}
                </label>
                <span className="relative shrink-0">
                  <Input
                    id={`reparto-pct-${i.id}`}
                    data-testid={`reparto-pct-${i.id}`}
                    inputMode="decimal"
                    value={textos[i.id ?? ''] ?? ''}
                    onChange={(e) => {
                      setTextos((prev) => ({ ...prev, [i.id ?? '']: e.target.value }))
                      setError(null)
                    }}
                    className="h-9 w-28 pr-8 text-right font-mono tabular-nums"
                    aria-label={`Porcentaje de ${i.nombre}`}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    %
                  </span>
                </span>
              </li>
            ))}
          </ul>

          {problema ? (
            <p role="alert" className="text-sm text-destructive" data-testid="reparto-problema">
              {problema}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-destructive" data-testid="reparto-error">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              hideArrow
              disabled={guardando}
              onClick={ponerPartesIguales}
              data-testid="reparto-partes-iguales"
            >
              <Equals className="mr-1 h-4 w-4" />
              Partes iguales
            </Button>
            {definido ? (
              <Button
                variant="ghost"
                size="sm"
                hideArrow
                disabled={guardando}
                onClick={() => setConfirmandoQuitar(true)}
                data-testid="reparto-quitar"
              >
                <Trash className="mr-1 h-4 w-4" />
                Quitar reparto
              </Button>
            ) : null}
            <span className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              hideArrow
              disabled={guardando}
              onClick={() => setEditando(false)}
              data-testid="reparto-cancelar"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              hideArrow
              disabled={Boolean(problema) || guardando}
              isLoading={guardando}
              onClick={() => void guardar()}
              data-testid="reparto-guardar"
            >
              Guardar reparto
            </Button>
          </div>
        </div>
      )}

      <p className="text-caption text-muted-foreground" data-testid="reparto-nota">
        Se emite una factura por inquilino, cada una por su parte. Aplica desde el próximo mes sin
        facturas generadas: los meses ya facturados no cambian.
      </p>

      <AlertDialog open={confirmandoQuitar} onOpenChange={(abierto) => !quitando && setConfirmandoQuitar(abierto)}>
        <AlertDialogContent variant="destructive" icon={<Trash weight="bold" />}>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar el reparto de la factura?</AlertDialogTitle>
            <AlertDialogDescription>
              Desde el próximo mes sin facturas generadas, toda la factura vuelve al titular. Los meses ya
              facturados no cambian.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={quitando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              loading={quitando}
              data-testid="confirmar-quitar-reparto"
              onClick={(e) => {
                e.preventDefault()
                void quitarReparto()
              }}
            >
              {quitando ? 'Quitando…' : 'Quitar reparto'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
