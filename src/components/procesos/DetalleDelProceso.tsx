'use client'

/**
 * «Ver detalle» de un proceso del centro (Nico, 23-09): un cajón con el
 * REGISTRO de lo que pasó —cuándo se lanzó, cuándo empezó y terminó, en qué
 * etapa iba, qué salió, qué no y por qué— y el archivo que dejó.
 *
 * El registro se arma con lo que el proceso YA trae (fechas, avance, etapa y
 * el mensaje del back partido en frases): el cajón no le pide nada nuevo al
 * back (el molde). Cada frase del mensaje es un renglón; las que dicen que
 * algo NO salió («quedaron sin número», «no se pudo») se marcan como error.
 */

import { CheckCircle, Circle, WarningCircle } from '@phosphor-icons/react'

import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon'
import type { Proceso } from '@/lib/api/procesos.types'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  NOMBRE_DEL_ESTADO,
  NOMBRE_DEL_TIPO,
  avanceEnPalabras,
  etapaYMensaje,
  quienLoLanzo,
  tamanoDelArchivo,
  tiempoDelProceso,
} from './estado-del-proceso'

export type TonoDelPaso = 'ok' | 'error' | 'neutro'

export interface PasoDelProceso {
  cuando: string | null
  texto: string
  tono: TonoDelPaso
}

const DICE_QUE_FALLO = /(no se pudo|no salió|quedaron? sin|falló|fallaron|pero el|rechaz|venció|interrump)/i

/** El registro de pasos del proceso, en orden. Puro: se prueba solo. */
export function registroDelProceso(p: Proceso): PasoDelProceso[] {
  const pasos: PasoDelProceso[] = [
    {
      cuando: p.createdAt,
      texto: p.esMio ? 'Lo lanzaste tú.' : `Lo lanzó ${quienLoLanzo(p)}.`,
      tono: 'neutro',
    },
  ]
  if (p.iniciadoAt && p.iniciadoAt !== p.createdAt) {
    pasos.push({ cuando: p.iniciadoAt, texto: 'Empezó a correr.', tono: 'neutro' })
  }
  const { etapa, mensaje } = etapaYMensaje(p)
  if (etapa && (p.estado === 'CORRIENDO' || p.estado === 'EN_COLA')) {
    const avance = avanceEnPalabras(p)
    pasos.push({ cuando: p.actualizadoAt, texto: `${etapa}${avance ? ` · ${avance}` : ''}.`, tono: 'neutro' })
  }
  const frases = (mensaje ?? '')
    .split(/(?<=\.)\s+(?=[A-ZÁÉÍÓÚÑ0-9¿«])/)
    .map((f) => f.trim())
    .filter(Boolean)
  const cierre = p.terminadoAt ?? null
  for (const f of frases) {
    pasos.push({
      cuando: cierre,
      texto: f,
      tono: p.estado === 'FALLO' || DICE_QUE_FALLO.test(f) ? 'error' : p.estado === 'TERMINADO' ? 'ok' : 'neutro',
    })
  }
  if (p.archivo) {
    pasos.push({
      cuando: cierre,
      texto: p.archivo.vencido
        ? `Dejó ${p.archivo.nombre}, que ya venció.`
        : `Dejó ${p.archivo.nombre}${p.archivo.bytes != null ? ` (${tamanoDelArchivo(p.archivo.bytes)})` : ''}${p.archivo.venceAt ? `; se puede bajar hasta el ${formatDateTime(p.archivo.venceAt)}` : '.'}`,
      tono: p.archivo.vencido ? 'neutro' : 'ok',
    })
  }
  if (p.terminadoAt) {
    const tiempo = tiempoDelProceso(p)
    pasos.push({
      cuando: p.terminadoAt,
      texto: `${p.interrumpido ? 'Se interrumpió' : NOMBRE_DEL_ESTADO[p.estado]}${tiempo ? ` · ${tiempo}` : ''}.`,
      tono: p.estado === 'TERMINADO' ? 'ok' : p.estado === 'FALLO' ? 'error' : 'neutro',
    })
  }
  return pasos
}

export function DetalleDelProceso({
  proceso,
  onCerrar,
  acciones,
}: {
  proceso: Proceso | null
  onCerrar: () => void
  /** Las mismas acciones de la fila, para no tener que volver a ella. */
  acciones?: React.ReactNode
}) {
  const pasos = proceso ? registroDelProceso(proceso) : []
  return (
    <Cajon abierto={proceso !== null} onOpenChange={(v) => !v && onCerrar()} data-testid="detalle-del-proceso">
      {proceso && (
        <>
          <CajonCabecera
            titulo={proceso.titulo}
            descripcion={`${NOMBRE_DEL_TIPO[proceso.tipo] ?? proceso.tipo} · ${NOMBRE_DEL_ESTADO[proceso.estado]}`}
          />
          <CajonCuerpo className="space-y-4">
            <p className="text-label uppercase text-fg-subtle">Registro</p>
            <ol className="space-y-3" data-testid="registro-del-proceso">
              {pasos.map((paso, i) => (
                <li key={i} className="flex gap-3" data-tono={paso.tono}>
                  {paso.tono === 'ok' ? (
                    <CheckCircle weight="fill" className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  ) : paso.tono === 'error' ? (
                    <WarningCircle weight="fill" className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
                  ) : (
                    <Circle weight="bold" className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                  )}
                  <div className="min-w-0">
                    <p className={cn('text-body-sm', paso.tono === 'error' ? 'text-danger' : 'text-fg')}>{paso.texto}</p>
                    {paso.cuando && (
                      <p className="font-mono text-caption tabular-nums text-fg-subtle">{formatDateTime(paso.cuando)}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </CajonCuerpo>
          {acciones && <CajonPie>{acciones}</CajonPie>}
        </>
      )}
    </Cajon>
  )
}
