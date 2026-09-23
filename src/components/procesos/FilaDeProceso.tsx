'use client'

/**
 * Un proceso del centro, en una fila: qué es, quién lo lanzó y hace cuánto,
 * en qué ETAPA va y cuánto le falta, cómo terminó, y lo que se puede HACER
 * con él según su estado.
 *
 * Es LA pieza del centro de procesos (Nico, 22-09-2026): la misma fila se
 * pinta en el panel del header, en la página del historial, en el detalle del
 * lote y en la línea de avance de Facturación. Una espera que se dibuja igual
 * en todas partes es una espera que se aprende una vez.
 *
 * 22-09, segunda vuelta («¿sí sabes qué es un centro de procesos?»): la fila
 * dejó de ser un rótulo con una píldora. Ícono por tipo con el estado encima,
 * el estado en palabras sin píldora gruesa, la etapa con su «120 de 450» y una
 * barra fina, el resumen en verde o el porqué en rojo, y las ACCIONES:
 * Descargar · Ver resultado · Reintentar · Detener.
 */

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowClockwise,
  ArrowRight,
  ListBullets,
  Books,
  CheckCircle,
  Clock,
  DownloadSimple,
  FileArrowDown,
  FileZip,
  Prohibit,
  Receipt,
  Stop,
  UploadSimple,
  Bank,
  WarningCircle,
  type Icon,
} from '@phosphor-icons/react'

import { toast } from '@/components/ui/toast'
import { procesosApi } from '@/lib/api/procesos.service'
import { contabilidadApi } from '@/lib/api/contabilidad.service'
import { lotesDeDispersionApi } from '@/lib/api/lotes-de-dispersion.service'
import type { Proceso } from '@/lib/api/procesos.types'
import { cn } from '@/lib/utils'
import { descargarArchivoDelProceso, type Navegar } from './descargar-archivo-del-proceso'
import { DetalleDelProceso } from './DetalleDelProceso'
import {
  NOMBRE_DEL_ESTADO,
  avanceEnPalabras,
  estaActivo,
  etapaYMensaje,
  haceCuanto,
  quienLoLanzo,
  resultadoDe,
  tamanoDelArchivo,
  tiempoDelProceso,
} from './estado-del-proceso'

const ICONO_DEL_TIPO: Record<string, Icon> = {
  EMISION_DE_FACTURAS: Receipt,
  ARCHIVO_DEL_LOTE: Bank,
  REPROCESAR_ASIENTOS: Books,
  MIGRACION_CONTRATOS: UploadSimple,
  MIGRACION_INMUEBLES: UploadSimple,
  EXPORTACION: FileArrowDown,
}

/** El color del estado en palabras: texto, sin píldora. */
const COLOR_DEL_ESTADO: Record<Proceso['estado'], string> = {
  EN_COLA: 'text-fg-muted',
  CORRIENDO: 'text-primary',
  TERMINADO: 'text-success',
  FALLO: 'text-danger',
  CANCELADO: 'text-fg-muted',
}

/** Los tipos que se pueden relanzar desde la fila misma. */
function reintentoDirecto(p: Proceso): (() => Promise<unknown>) | null {
  if (p.tipo === 'REPROCESAR_ASIENTOS') return () => contabilidadApi.asientos.reprocesar()
  if (p.tipo === 'ARCHIVO_DEL_LOTE' && p.recurso?.id) {
    const id = p.recurso.id
    return () => lotesDeDispersionApi.generarArchivo(id)
  }
  return null
}

export interface FilaDeProcesoProps {
  proceso: Proceso
  /** `compacta` en el panel del header: el mensaje en dos líneas. */
  compacta?: boolean
  /** El proceso que se acaba de lanzar: se resalta. */
  resaltado?: boolean
  /** Tras cancelar o reintentar: quien pinta la lista la vuelve a pedir. */
  onCambio?: () => void
  /**
   * Un «Detener» que no es del back: la corrida de Facturación se detiene en
   * el navegador, entre tandas.
   */
  onDetener?: () => void
  deteniendo?: boolean
  /** Para las pruebas: cómo se «navega» a la URL firmada. */
  navegar?: Navegar
  /** Para las pruebas: el reloj. */
  ahora?: number
  /** Sin acciones de navegación (la línea de Facturación ya está en su pantalla). */
  sinVerResultado?: boolean
  as?: 'li' | 'div'
  /**
   * Quién abre el cajón de «Ver detalle». El panel del header lo abre FUERA
   * del popover (si no, el clic en el cajón cerraría el popover y con él la
   * fila). Sin esto, la fila abre su propio cajón.
   */
  onVerDetalle?: (p: Proceso) => void
}

export function FilaDeProceso({
  proceso: p,
  compacta = false,
  resaltado = false,
  onCambio,
  onDetener,
  deteniendo = false,
  navegar,
  ahora,
  sinVerResultado = false,
  as: Contenedor = 'li',
  onVerDetalle,
}: FilaDeProcesoProps) {
  const [detalleAbierto, setDetalleAbierto] = useState(false)
  const esLocal = p.id === 'corrida-local'
  const verDetalle = () => (onVerDetalle ? onVerDetalle(p) : setDetalleAbierto(true))
  const [bajando, setBajando] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const [reintentando, setReintentando] = useState(false)
  const activo = estaActivo(p)
  const { etapa, mensaje } = etapaYMensaje(p)
  const avance = avanceEnPalabras(p)
  const cuando = haceCuanto(p.terminadoAt ?? p.createdAt, ahora)
  const tiempo = tiempoDelProceso(p, ahora)
  const tamano = p.archivo ? tamanoDelArchivo(p.archivo.bytes) : null
  const resultado = sinVerResultado ? null : resultadoDe(p)
  const reintentar = p.estado === 'FALLO' ? reintentoDirecto(p) : null
  const IconoTipo = ICONO_DEL_TIPO[p.tipo] ?? (p.archivo?.tipo === 'application/zip' ? FileZip : FileArrowDown)

  const estadoEnPalabras = p.interrumpido
    ? 'Se interrumpió'
    : p.cancelacionPedida && activo
      ? 'Deteniendo…'
      : deteniendo
        ? 'Deteniendo…'
        : NOMBRE_DEL_ESTADO[p.estado]

  const descargar = async () => {
    setBajando(true)
    try {
      const nombre = await descargarArchivoDelProceso(p.id, navegar)
      toast.success('Descargando', { description: nombre })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo descargar el archivo.')
    } finally {
      setBajando(false)
    }
  }

  const cancelar = async () => {
    setCancelando(true)
    try {
      await procesosApi.cancelar(p.id)
      toast.success(
        p.estado === 'EN_COLA'
          ? 'Cancelado.'
          : 'Se va a detener en su próximo paso. Lo que alcanzó a hacerse queda hecho.',
      )
      onCambio?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo detener.')
    } finally {
      setCancelando(false)
    }
  }

  const volverALanzar = async () => {
    if (!reintentar) return
    setReintentando(true)
    try {
      await reintentar()
      onCambio?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo volver a lanzar.')
    } finally {
      setReintentando(false)
    }
  }

  const hayAcciones =
    !esLocal ||
    (p.archivo && !p.archivo.vencido && p.estado === 'TERMINADO') ||
    resultado ||
    p.sePuedeCancelar ||
    (onDetener && activo) ||
    p.estado === 'FALLO'

  return (
    <Contenedor
      className={cn(
        'relative flex gap-3 px-4 py-3.5 transition-colors',
        resaltado && 'bg-primary-soft',
      )}
      data-testid="fila-de-proceso"
      data-estado={p.estado}
      data-proceso-id={p.id}
      data-resaltado={resaltado ? '1' : undefined}
    >
      {/* El ícono del tipo, con el estado encima. */}
      <div className="relative mt-0.5 h-9 w-9 shrink-0">
        <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface-muted text-fg-muted">
          <IconoTipo className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <span
          className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-surface"
          aria-hidden="true"
        >
          {p.estado === 'CORRIENDO' ? (
            <span className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent motion-safe:animate-spin" />
          ) : p.estado === 'TERMINADO' ? (
            <CheckCircle weight="fill" className="h-4 w-4 text-success" />
          ) : p.estado === 'FALLO' ? (
            <WarningCircle weight="fill" className="h-4 w-4 text-danger" />
          ) : p.estado === 'CANCELADO' ? (
            <Prohibit weight="bold" className="h-3.5 w-3.5 text-fg-subtle" />
          ) : (
            <Clock weight="bold" className="h-3.5 w-3.5 text-fg-subtle" />
          )}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="min-w-0 flex-1 truncate text-body-sm font-medium text-fg" title={p.titulo}>
            {p.titulo}
          </p>
          <span
            className={cn('shrink-0 text-caption font-medium', COLOR_DEL_ESTADO[p.estado])}
            data-testid="estado-del-proceso"
          >
            {estadoEnPalabras}
          </span>
        </div>

        <p className="mt-0.5 text-caption text-fg-subtle">
          {quienLoLanzo(p)}
          <span aria-hidden="true"> · </span>
          {cuando}
          {tiempo && (
            <>
              <span aria-hidden="true"> · </span>
              {tiempo}
            </>
          )}
        </p>

        {activo && (
          <div className="mt-2 space-y-1.5">
            <p className="flex items-baseline justify-between gap-2 text-caption text-fg-muted">
              <span className="truncate">{etapa ?? (p.estado === 'EN_COLA' ? 'Esperando turno' : 'En curso')}</span>
              {avance && (
                <span className="shrink-0 font-mono tabular-nums text-fg" data-testid="avance-del-proceso">
                  {avance}
                </span>
              )}
            </p>
            <div
              className="h-1 overflow-hidden rounded-full bg-surface-muted"
              role="progressbar"
              aria-label={p.titulo}
              aria-valuemin={0}
              aria-valuemax={100}
              {...(p.porcentaje != null ? { 'aria-valuenow': p.porcentaje } : {})}
            >
              {p.porcentaje != null && p.porcentaje > 0 ? (
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500"
                  style={{ width: `${Math.max(3, p.porcentaje)}%` }}
                />
              ) : (
                <div className="h-full w-1/4 rounded-full bg-primary motion-safe:animate-indeterminate" />
              )}
            </div>
          </div>
        )}

        {mensaje && (
          <p
            className={cn(
              'mt-1.5 text-caption',
              p.estado === 'FALLO' ? 'text-danger' : p.estado === 'TERMINADO' ? 'text-fg' : 'text-fg-muted',
              compacta && 'line-clamp-2',
            )}
            title={compacta ? mensaje : undefined}
            data-testid="mensaje-del-proceso"
          >
            {mensaje}
          </p>
        )}

        {p.archivo?.vencido && (
          <p className="mt-1.5 text-caption text-fg-subtle" data-testid="archivo-vencido">
            El archivo venció. Vuelve a lanzarlo para tener uno nuevo.
          </p>
        )}

        {hayAcciones && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {p.archivo && !p.archivo.vencido && p.estado === 'TERMINADO' && (
              <button
                type="button"
                onClick={() => void descargar()}
                disabled={bajando}
                className="inline-flex h-7 items-center gap-1.5 rounded-full bg-primary px-3 text-caption font-medium text-primary-fg transition-opacity hover:opacity-90 disabled:opacity-60"
                data-testid="descargar-proceso"
                title={p.archivo.nombre}
              >
                <DownloadSimple weight="bold" className="h-3.5 w-3.5" aria-hidden="true" />
                {bajando ? 'Descargando…' : 'Descargar'}
                {tamano && <span className="font-mono tabular-nums opacity-80">{tamano}</span>}
              </button>
            )}
            {p.estado === 'FALLO' &&
              (reintentar ? (
                <AccionSuave
                  onClick={() => void volverALanzar()}
                  disabled={reintentando}
                  testId="reintentar-proceso"
                  icono={ArrowClockwise}
                >
                  {reintentando ? 'Reintentando…' : 'Reintentar'}
                </AccionSuave>
              ) : resultado ? (
                <Link
                  href={resultado.href}
                  className={CLASE_ACCION_SUAVE}
                  data-testid="reintentar-proceso"
                >
                  <ArrowClockwise className="h-3.5 w-3.5" aria-hidden="true" />
                  Reintentar
                </Link>
              ) : null)}
            {resultado && (
              <Link href={resultado.href} className={CLASE_ACCION_SUAVE} data-testid="ver-resultado-proceso">
                {resultado.texto}
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            )}
            {(p.sePuedeCancelar || (onDetener && activo)) && (
              <AccionSuave
                onClick={() => (onDetener ? onDetener() : void cancelar())}
                disabled={cancelando || deteniendo}
                testId="cancelar-proceso"
                icono={Stop}
              >
                {cancelando || deteniendo ? 'Deteniendo…' : 'Detener'}
              </AccionSuave>
            )}
            {!esLocal && (
              <AccionSuave onClick={verDetalle} testId="ver-detalle-proceso" icono={ListBullets}>
                Ver detalle
              </AccionSuave>
            )}
          </div>
        )}
      </div>
      {!onVerDetalle && !esLocal && (
        <DetalleDelProceso proceso={detalleAbierto ? p : null} onCerrar={() => setDetalleAbierto(false)} />
      )}
    </Contenedor>
  )
}

const CLASE_ACCION_SUAVE =
  'inline-flex h-7 items-center gap-1 rounded-full border border-border bg-surface px-2.5 text-caption font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg disabled:opacity-60'

function AccionSuave({
  onClick,
  disabled,
  testId,
  icono: IconoAccion,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  testId: string
  icono: Icon
  children: React.ReactNode
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={CLASE_ACCION_SUAVE} data-testid={testId}>
      <IconoAccion className="h-3.5 w-3.5" aria-hidden="true" />
      {children}
    </button>
  )
}
