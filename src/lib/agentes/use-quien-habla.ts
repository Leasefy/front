'use client'

import { useMemo } from 'react'

import type { TurnStep } from '@/lib/types/beta-chat'

import { leerElTurno, type LecturaDelTurno, type MensajeDelChat } from './agente-que-habla'

/**
 * `leerElTurno` con memo, para usar dentro de la burbuja del asistente:
 *
 *   const turno = useQuienHabla(mensaje, { pasos: turnSteps, enCurso: esElUltimo && isStreaming })
 *   <OrbeDeAgente agente={turno.orquestador.agente} estado={turno.orquestador.estado} tamano="sm" />
 *   {turno.delegaciones.map((d) => <OrbeDeAgente agente={d.agente ?? turno.orquestador.agente} estado={d.estado} … />)}
 */
export function useQuienHabla(
  mensaje: MensajeDelChat | null,
  { pasos, enCurso = false }: { pasos?: readonly TurnStep[]; enCurso?: boolean } = {},
): LecturaDelTurno {
  return useMemo(
    () => leerElTurno({ mensaje, pasos: enCurso ? pasos : [], enCurso }),
    [mensaje, pasos, enCurso],
  )
}
