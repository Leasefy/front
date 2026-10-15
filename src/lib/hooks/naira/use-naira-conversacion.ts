'use client'

/**
 * use-naira-conversacion.ts — la conversación ON-DEMAND con Naira (Fase 13, plan 13-06; D13-4, D13-13, P2, P3, P11-P13).
 *
 * El hilo vive SOLO en el estado de este hook (la memoria del componente): al recargar la página la conversación empieza
 * vacía. No toca el almacenamiento del navegador ni la consola (D13-13: el agente tampoco guarda el texto de la pregunta).
 *
 * Por qué NO se monta sobre `useLecturaDeNaira` (P2): la pregunta es un POST con efectos en el agente —registra la pregunta
 * y su desenlace y reserva cupo—. Una lectura pide al montar y su `recargar` reenvía: una pregunta que nadie hizo, o
 * repetida, gastaría cupo y escribiría el registro. Acá nada se envía al montar, al re-renderizar ni al volver al foco;
 * solo `preguntar` (un gesto) y `reintentar` (otro gesto, sobre un turno que no se pudo enviar). Una pregunta a la vez.
 *
 * Lo que conserva de 13-01: la agencia sale de `useAuth` (sin agencia ⇒ `cargando`, sin red); un cambio de agencia vacía el
 * hilo y descarta lo que estaba en vuelo (generación numérica); un 403 o un 404 de la pregunta se llevan el hilo ENTERO
 * (`conDesenlace`, P3), y la vista se entrega como `LecturaDeNaira` para que `VistaDeNaira` la evalúe antes que los hijos.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { preguntarANaira, type EstadoNaira } from '@/lib/api/naira/cliente'
import type { NairaConversationAnswer } from '@/lib/api/naira/contrato'
import { useAuth } from '@/lib/auth'
import type { LecturaDeNaira } from '@/lib/hooks/naira/use-lectura-de-naira'
import {
  CONVERSACION_VACIA,
  conDesenlace,
  conTurnoConsultando,
  desenlaceDelEnvio,
  preguntaLista,
  type EstadoDeLaConversacion,
  type HiloDeNaira,
} from '@/lib/naira/conversacion'

export interface ConversacionConNaira {
  /** cargando (sin agencia) | ok { turnos } con su origen | sin_permiso | apagada; nunca otro. */
  readonly vista: LecturaDeNaira<HiloDeNaira>
  /** Hay una pregunta esperando respuesta (una a la vez). */
  readonly enCurso: boolean
  /** Envía la pregunta recortada; vacía, larga, sin agencia, con otra en curso o con la vista cerrada ⇒ no hace NADA. */
  readonly preguntar: (pregunta: string) => void
  /** Solo un turno `no_enviada`: reenvía SU pregunta en SU lugar. */
  readonly reintentar: (turnoId: number) => void
}

const CARGANDO = { kind: 'cargando' } as const
/** El cliente nunca rechaza (13-01); si lo hiciera por un bug, el turno queda sin enviar en vez de colgar el compositor. */
const NO_DISPONIBLE: EstadoNaira<NairaConversationAnswer> = { kind: 'no_disponible' }

export function useNairaConversacion(): ConversacionConNaira {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [conversacion, setConversacion] = useState<EstadoDeLaConversacion>(CONVERSACION_VACIA)
  const [enCurso, setEnCurso] = useState(false)
  const generacion = useRef(0)
  const enCursoRef = useRef(false)
  const siguienteId = useRef(1)
  /** El hilo vigente, para `enviar` y `reintentar` (se actualiza tras cada render). */
  const conversacionRef = useRef<EstadoDeLaConversacion>(conversacion)

  useEffect(() => {
    conversacionRef.current = conversacion
  })

  // Montaje o agencia nueva ⇒ hilo vacío; lo que estaba en vuelo ya no aterriza.
  useEffect(() => {
    generacion.current += 1
    enCursoRef.current = false
    setEnCurso(false)
    setConversacion(CONVERSACION_VACIA)
    conversacionRef.current = CONVERSACION_VACIA
  }, [agencyId])

  // Desmontado ⇒ nada de lo que llegue después aterriza.
  useEffect(
    () => () => {
      generacion.current += 1
    },
    [],
  )

  const enviar = useCallback(
    (pregunta: string, turnoId: number | null) => {
      if (agencyId === null || enCursoRef.current) return
      if (conversacionRef.current.kind !== 'abierta') return
      const id = turnoId ?? siguienteId.current++
      const miGeneracion = generacion.current
      enCursoRef.current = true
      setEnCurso(true)
      setConversacion((e) => conTurnoConsultando(e, id, pregunta))
      void preguntarANaira(agencyId, pregunta)
        .catch(() => NO_DISPONIBLE)
        .then((resultado) => {
          if (miGeneracion !== generacion.current) return
          enCursoRef.current = false
          setEnCurso(false)
          setConversacion((e) => conDesenlace(e, id, desenlaceDelEnvio(resultado)))
        })
    },
    [agencyId],
  )

  const preguntar = useCallback(
    (textoCrudo: string) => {
      const pregunta = preguntaLista(textoCrudo)
      if (pregunta === null) return
      enviar(pregunta, null)
    },
    [enviar],
  )

  const reintentar = useCallback(
    (turnoId: number) => {
      const actual = conversacionRef.current
      if (actual.kind !== 'abierta') return
      const turno = actual.turnos.find((t) => t.id === turnoId)
      if (turno === undefined || turno.estado.kind !== 'no_enviada') return
      enviar(turno.pregunta, turno.id)
    },
    [enviar],
  )

  const vista: LecturaDeNaira<HiloDeNaira> =
    agencyId === null
      ? CARGANDO
      : conversacion.kind === 'abierta'
        ? { kind: 'ok', data: { turnos: conversacion.turnos }, origen: conversacion.origen }
        : { kind: conversacion.kind }

  return { vista, enCurso, preguntar, reintentar }
}
