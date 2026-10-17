'use client'

/**
 * «Translate» / «Show original» para una conversación (Nico, 16-10-2026, la
 * recomendada: lo que escriben las personas se ve tal como lo escribieron y se
 * traduce sólo cuando se pide).
 *
 * Sólo existe con el panel en inglés y dentro de una inmobiliaria (el micro
 * traduce para sus miembros y lo cobra a su cupo de IA). Un clic traduce TODOS
 * los mensajes del hilo en un solo pedido; volver al original no borra lo
 * traducido, así que traducir otra vez no vuelve a gastar. Un mensaje nuevo que
 * llega con la conversación traducida se traduce en el siguiente clic.
 */

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { AuthContext } from '@/lib/auth/auth-context'
import { traducirAlIngles } from '@/lib/api/traducir'
import { useLocaleDelPanel } from './use-tr'

export interface MensajeParaTraducir {
  id: string
  texto: string
}

export interface TraduccionDeMensajes {
  /** ¿Se ofrece el botón? Panel en inglés + inmobiliaria + algo que traducir. */
  disponible: boolean
  /** ¿Se están mostrando las traducciones? */
  traducido: boolean
  cargando: boolean
  /** El error del último intento (para decirlo), o `null`. */
  error: unknown
  traducir: () => Promise<void>
  verOriginal: () => void
  /** El texto a pintar: la traducción si se está mostrando y existe; si no, el original. */
  textoDe: (id: string, original: string) => string
  /** ¿Este mensaje se está mostrando traducido (y cambió)? */
  estaTraducido: (id: string, original: string) => boolean
}

export function useTraducirMensajes(mensajes: readonly MensajeParaTraducir[]): TraduccionDeMensajes {
  const en = useLocaleDelPanel() === 'en'
  // Sin proveedor de sesión (una prueba, una vista pública) no hay botón: nunca lanza.
  const agencyId = useContext(AuthContext)?.agency?.id ?? null
  const [traducido, setTraducido] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<unknown>(null)
  // id → { original, inglés }: si el texto cambia, la traducción vieja ya no vale.
  const recuerdo = useRef(new Map<string, { original: string; en: string }>())
  const [, setVersion] = useState(0)

  const conTexto = useMemo(() => mensajes.filter((m) => m.texto.trim() !== ''), [mensajes])

  // Otra conversación (cambia su primer mensaje): vuelve al original. Lo ya
  // traducido queda guardado por id por si se vuelve a ella.
  const conversacion = mensajes[0]?.id ?? ''
  useEffect(() => {
    setTraducido(false)
    setError(null)
  }, [conversacion])
  const disponible = en && agencyId !== null && conTexto.length > 0

  const traducir = useCallback(async () => {
    if (!agencyId) return
    const faltan = conTexto.filter((m) => recuerdo.current.get(m.id)?.original !== m.texto)
    setError(null)
    if (faltan.length === 0) {
      setTraducido(true)
      return
    }
    setCargando(true)
    try {
      const r = await traducirAlIngles(
        agencyId,
        faltan.map((m) => m.texto),
      )
      faltan.forEach((m, i) => recuerdo.current.set(m.id, { original: m.texto, en: r.traducciones[i] ?? m.texto }))
      setVersion((v) => v + 1)
      setTraducido(true)
    } catch (e) {
      setError(e)
    } finally {
      setCargando(false)
    }
  }, [agencyId, conTexto])

  const verOriginal = useCallback(() => setTraducido(false), [])

  const textoDe = useCallback(
    (id: string, original: string) => {
      if (!traducido) return original
      const t = recuerdo.current.get(id)
      return t && t.original === original ? t.en : original
    },
    [traducido],
  )

  const estaTraducido = useCallback(
    (id: string, original: string) => traducido && textoDe(id, original) !== original,
    [traducido, textoDe],
  )

  return { disponible, traducido, cargando, error, traducir, verOriginal, textoDe, estaTraducido }
}
