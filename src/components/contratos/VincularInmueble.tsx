'use client'

/**
 * Vincular un inmueble a un contrato migrado que se activó sin uno.
 *
 * Sin inmueble el contrato no tiene consignación, y sin consignación no
 * genera cobros: la administración, los conceptos, el perfil tributario, todo
 * lo que se configure acá se queda escrito y no mueve un peso. El endpoint
 * (`PATCH /contracts/:id/inmueble`) existía desde la migración y ninguna
 * pantalla lo llamaba: un contrato sin inmueble quedaba así para siempre.
 *
 * Sólo llena un `propertyId` vacío; no hay «desvincular».
 */

import { useEffect, useMemo, useState } from 'react'
import { LinkSimple } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { consignacionesApi } from '@/lib/api/inmobiliaria.service'
import { contractsApi } from '@/lib/api/contracts.service'
import type { Consignacion } from '@/lib/types/inmobiliaria'
import type { Contract } from '@/lib/types/contract'

interface Props {
  contract: Contract
  puedeVincular: boolean
  onActualizado: (contract: Contract) => void
}

export function VincularInmueble({ contract, puedeVincular, onActualizado }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [consignaciones, setConsignaciones] = useState<Consignacion[] | null>(null)
  const [elegido, setElegido] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!abierto || consignaciones !== null) return
    let vigente = true
    consignacionesApi
      .getAll({ status: 'ACTIVE' })
      .then((lista) => {
        if (vigente) setConsignaciones(lista)
      })
      .catch((e: unknown) => {
        if (!vigente) return
        setError(e instanceof Error ? e.message : 'No pudimos traer los inmuebles.')
        setConsignaciones([])
      })
    return () => {
      vigente = false
    }
  }, [abierto, consignaciones])

  /*
   * Primero los que están libres; los arrendados van al final y marcados,
   * porque un inmueble con otro contrato vivo casi nunca es el que se busca —
   * pero un contrato migrado a veces ES ese contrato vivo.
   */
  const opciones = useMemo(() => {
    const lista = [...(consignaciones ?? [])]
    lista.sort((a, b) => {
      const ra = a.availability === 'rented' ? 1 : 0
      const rb = b.availability === 'rented' ? 1 : 0
      if (ra !== rb) return ra - rb
      return a.propertyTitle.localeCompare(b.propertyTitle)
    })
    return lista
  }, [consignaciones])

  async function vincular() {
    if (!elegido) return
    setGuardando(true)
    setError(null)
    try {
      const actualizado = await contractsApi.asignarInmueble(contract.id, elegido)
      onActualizado(actualizado)
      setAbierto(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo vincular el inmueble.')
    } finally {
      setGuardando(false)
    }
  }

  if (!puedeVincular) return null

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        hideArrow
        onClick={() => setAbierto(true)}
        data-testid="vincular-inmueble"
      >
        <LinkSimple className="mr-1 h-3.5 w-3.5" />
        Vincular inmueble
      </Button>

      <Dialog open={abierto} onOpenChange={(v) => !guardando && setAbierto(v)}>
        <DialogContent className="max-w-lg" data-testid="vincular-inmueble-dialog">
          <DialogHeader>
            <DialogTitle>¿Cuál es el inmueble de este contrato?</DialogTitle>
            <DialogDescription>
              {contract.propertyAddress
                ? `El contrato dice «${contract.propertyAddress}». `
                : ''}
              Con el inmueble vinculado, el contrato queda sobre su consignación y
              empieza a generar cobros con sus conceptos e impuestos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Inmueble</label>
            {consignaciones === null ? (
              <p className="text-sm text-muted-foreground">Cargando inmuebles…</p>
            ) : opciones.length === 0 && !error ? (
              <p className="text-sm text-muted-foreground">
                No hay inmuebles consignados. Primero hay que cargar el inmueble en
                Inmuebles y consignarlo.
              </p>
            ) : opciones.length === 0 ? null : (
              <Select value={elegido} onValueChange={setElegido}>
                <SelectTrigger data-testid="vincular-inmueble-select">
                  <SelectValue placeholder="Elegí el inmueble" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {opciones.map((c) => (
                    <SelectItem key={c.propertyId} value={c.propertyId}>
                      {c.propertyTitle}
                      {c.propertyAddress ? ` · ${c.propertyAddress}` : ''}
                      {c.availability === 'rented' ? ' · arrendado' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <DialogFooter>
            <Button variant="ghost" hideArrow onClick={() => setAbierto(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button
              hideArrow
              onClick={() => void vincular()}
              disabled={!elegido || guardando}
              isLoading={guardando}
              data-testid="vincular-inmueble-guardar"
            >
              Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
