'use client'

/**
 * El cajón de UNA resolución cargada: lo que dice su papel, cuánto lleva
 * numerado y si es «de prueba».
 *
 * 🔴 Nico (03-10-2026): el ADMINISTRADOR puede marcar o desmarcar «de prueba» una
 * resolución ya cargada, sólo mientras no haya numerado nada (lo numerado con
 * una de prueba no se le entrega a ningún cliente; cambiarlo después cambiaría
 * qué documentos se entregaron). Al contador se le muestra el estado, sin el
 * interruptor; con algo ya numerado, el interruptor queda apagado con su motivo.
 * Sin la migración de la casilla (`marcaDePruebaDisponible`) o con un back sin
 * la ruta (`sePuedeMarcarDePrueba` ausente), no se ofrece.
 *
 * «Ya numeró» lo dice el back (`documentosNumerados`, lo numerado en Leasefy),
 * no `usados`: el «último número usado» puede venir del programa anterior y esa
 * resolución todavía no numeró nada aquí.
 */

import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon'
import { toast } from '@/components/ui/toast'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { useUltimoPresente } from '@/lib/hooks/use-ultimo-presente'
import {
  facturacionPorMesService,
  fechaLegible,
  type ResolucionDeFacturacion,
} from '@/lib/api/facturacion-por-mes.service'
import { cuantos, sinLaRutaDeFacturacion } from '@/lib/facturacion/por-facturar'

export interface CajonDelDetalleDeLaResolucionProps {
  /** `null` = cerrado. */
  resolucion: ResolucionDeFacturacion | null
  onCerrar: () => void
  /** La base guarda la casilla «de prueba». */
  marcaDePruebaDisponible: boolean
  /** Sólo el administrador cambia la marca. */
  esAdministrador: boolean
  /** El back confirmó el cambio: la pantalla vuelve a leer. */
  onCambio: () => void | Promise<void>
}

/** Un dato con su rótulo; los números en mono. */
function Dato({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-caption uppercase tracking-wide text-fg-muted">{rotulo}</dt>
      <dd className="text-body text-fg">{children}</dd>
    </div>
  )
}

export function CajonDelDetalleDeLaResolucion({
  resolucion: abierta,
  onCerrar,
  marcaDePruebaDisponible,
  esAdministrador,
  onCambio,
}: CajonDelDetalleDeLaResolucionProps) {
  // Mientras sale, sigue mostrando la que mostraba (como los demás cajones).
  const r = useUltimoPresente(abierta)
  const [guardando, setGuardando] = useState(false)

  /** El back conoce la ruta del cambio (y entonces dice si se puede). */
  const seOfrece = marcaDePruebaDisponible && typeof r?.sePuedeMarcarDePrueba === 'boolean'
  const numerados = r?.documentosNumerados ?? null
  const puedeCambiar =
    seOfrece && esAdministrador && !r?.anulada && r?.sePuedeMarcarDePrueba === true
  const motivo = !esAdministrador
    ? 'Sólo el administrador cambia esta marca.'
    : r?.anulada
      ? 'La resolución está anulada.'
      : r?.sePuedeMarcarDePrueba === true
        ? null
        : numerados !== null && numerados > 0
          ? `Ya numeró ${cuantos(numerados, 'documento', 'documentos')}: la marca no se cambia después de numerar. Si era de prueba, anúlala y carga la de verdad.`
          : 'No se pudo saber si ya numeró algún documento, así que la marca no se puede cambiar ahora. Vuelve a intentarlo en un rato.'

  async function cambiar(esDePrueba: boolean) {
    if (!r || !puedeCambiar || guardando) return
    setGuardando(true)
    try {
      const hecho = await facturacionPorMesService.marcarDePrueba(r.id, esDePrueba)
      toast.success(
        hecho?.explicacion ??
          (esDePrueba
            ? 'Quedó «de prueba»: lo que numere nunca se le entrega a un cliente.'
            : 'Quedó «de verdad»: lo que numere se le entrega al cliente.'),
      )
      await onCambio()
    } catch (e) {
      toast.error(
        mensajeParaLaPersona(e, {
          porDefecto: 'No se pudo cambiar la marca de prueba.',
          accion: 'cambiar la marca de prueba',
        }),
      )
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Cajon
      abierto={abierta !== null}
      onOpenChange={(v) => {
        if (!v && !guardando) onCerrar()
      }}
      ancho="sm:max-w-xl"
      data-testid="cajon-del-detalle-de-la-resolucion"
    >
      {r && (
        <>
          <CajonCabecera
            titulo={`Resolución ${r.numero}`}
            descripcion={r.tipoNombre || 'Cualquier tipo de documento'}
          >
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {r.anulada ? (
                <Badge variant="secondary">Anulada</Badge>
              ) : r.puedeNumerar ? (
                <Badge variant="success">Numerando · sigue el {r.siguiente}</Badge>
              ) : (
                <Badge variant="secondary">No numera hoy</Badge>
              )}
              {r.esDePrueba && <Badge variant="warning">De prueba</Badge>}
            </div>
          </CajonCabecera>
          <CajonCuerpo className="space-y-6">
            {!r.puedeNumerar && !r.anulada && r.explicacion && (
              <p className="text-sm text-fg-muted">{sinLaRutaDeFacturacion(r.explicacion)}</p>
            )}
            <dl className="grid gap-4 sm:grid-cols-2">
              <Dato rotulo="Fecha de la resolución">{fechaLegible(r.fechaResolucion)}</Dato>
              <Dato rotulo="Prefijo">
                <span className="font-mono">{r.prefijo || 'Sin prefijo'}</span>
              </Dato>
              <Dato rotulo="Rango">
                <span className="font-mono tabular-nums">
                  {r.desde.toLocaleString('es-CO')}–{r.hasta.toLocaleString('es-CO')}
                </span>
              </Dato>
              <Dato rotulo="Números usados">
                <span className="font-mono tabular-nums">{r.usados.toLocaleString('es-CO')}</span>
                <span className="text-fg-muted">
                  {' '}· quedan{' '}
                  <span className="font-mono tabular-nums">{r.disponibles.toLocaleString('es-CO')}</span>
                </span>
              </Dato>
              <Dato rotulo="Vigencia">
                {fechaLegible(r.vigenteDesde)} – {fechaLegible(r.vigenteHasta)}
              </Dato>
            </dl>

            {seOfrece && (
              <section
                className="flex items-start justify-between gap-4 rounded-lg border border-border p-4"
                data-testid="resolucion-de-prueba"
              >
                <div className="space-y-1">
                  <label htmlFor="resolucion-detalle-de-prueba" className="block text-sm font-medium text-fg">
                    Es una resolución de prueba
                  </label>
                  <p className="text-caption text-fg-muted">
                    Lo que numere se transmite, pero nunca se le entrega a un cliente. Se cambia
                    sólo mientras no haya numerado nada.
                  </p>
                  {motivo && (
                    <p className="text-caption text-fg-muted" data-testid="resolucion-de-prueba-motivo">
                      {motivo}
                    </p>
                  )}
                </div>
                <Switch
                  id="resolucion-detalle-de-prueba"
                  checked={r.esDePrueba === true}
                  disabled={!puedeCambiar || guardando}
                  onCheckedChange={(v) => void cambiar(v === true)}
                  data-testid="resolucion-de-prueba-interruptor"
                />
              </section>
            )}
          </CajonCuerpo>
          <CajonPie ayuda="Una resolución no se edita: si el rango o la vigencia cambian, se carga la nueva y se anula la anterior.">
            <Button variant="outline" hideArrow onClick={onCerrar} disabled={guardando} data-testid="resolucion-detalle-cerrar">
              Cerrar
            </Button>
          </CajonPie>
        </>
      )}
    </Cajon>
  )
}
