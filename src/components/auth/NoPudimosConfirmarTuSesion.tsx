'use client'

/**
 * «No pudimos confirmar tu sesión»: la consulta del segundo factor no respondió
 * ni reintentando sola (`mfaCheckStatus === 'failed'`, ver
 * `lib/auth/con-reintentos.ts`).
 *
 * Nico, 02-10-2026: si no se puede saber si a la sesión le falta el código, NO
 * se entra a ninguna pantalla protegida. Pero tampoco se cierra la sesión ni se
 * manda al login: se espera a poder verificar. Por eso acá sólo hay
 * «Reintentar».
 *
 * Con la red caída convive con `<AvisoDeConexion>` sin repetirlo: la franja de
 * abajo ya dice que no hay conexión, así que esta pantalla no pinta otro error
 * —dice «Esperando la conexión…»— y reintenta sola apenas la conexión vuelve
 * (mismo criterio que `FalloDeCarga`).
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { HourglassMedium, ShieldWarning } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth/use-auth'
import { useEstadoDeConexion } from '@/lib/conexion/estado-de-conexion'

interface Props {
  /** `pantalla`: ocupa toda la vista (guardias). `tarjeta`: dentro del formulario de acceso. */
  variante?: 'pantalla' | 'tarjeta'
  /** Otra salida que la pantalla que lo usa quiera ofrecer (p.ej. «Entrar con otra cuenta»). */
  children?: ReactNode
}

export function NoPudimosConfirmarTuSesion({ variante = 'pantalla', children }: Props) {
  const { retryMfaCheck } = useAuth()
  const conexion = useEstadoDeConexion()
  const [reintentando, setReintentando] = useState(false)
  const vivo = useRef(true)
  useEffect(() => {
    vivo.current = true
    return () => {
      vivo.current = false
    }
  }, [])

  const enCurso = useRef(false)
  const reintentar = useCallback(async () => {
    if (enCurso.current || !retryMfaCheck) return
    enCurso.current = true
    setReintentando(true)
    try {
      await retryMfaCheck()
    } finally {
      enCurso.current = false
      if (vivo.current) setReintentando(false)
    }
  }, [retryMfaCheck])

  // Volvió la conexión: se reintenta sola, sin esperar el clic.
  const conexionAnterior = useRef(conexion)
  useEffect(() => {
    const antes = conexionAnterior.current
    conexionAnterior.current = conexion
    if (antes !== 'bien' && conexion === 'bien') void reintentar()
  }, [conexion, reintentar])

  const esperandoConexion = conexion !== 'bien'
  const titulo = esperandoConexion
    ? conexion === 'sin-internet'
      ? 'Esperando la conexión…'
      : 'Esperando a Leasefy…'
    : 'No pudimos confirmar tu sesión'
  const descripcion = esperandoConexion
    ? 'Apenas vuelva, confirmamos tu sesión y sigues donde ibas.'
    : 'Antes de mostrarte tu cuenta tenemos que confirmar tu sesión, y no respondió. Tu sesión sigue abierta: no tienes que volver a entrar.'
  const Icono = esperandoConexion ? HourglassMedium : ShieldWarning

  const contenido = (
    <div
      className="flex max-w-sm flex-col items-center gap-4 text-center"
      role="alert"
      data-testid="no-pudimos-confirmar-sesion"
    >
      <Icono className="h-10 w-10 text-muted-foreground" weight="light" aria-hidden="true" />
      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold text-foreground">{titulo}</h1>
        <p className="text-sm text-muted-foreground">{descripcion}</p>
      </div>
      <Button
        type="button"
        className="w-full"
        hideArrow
        onClick={() => void reintentar()}
        isLoading={reintentando}
        disabled={reintentando}
        data-testid="reintentar-confirmar-sesion"
      >
        Reintentar
      </Button>
      {children}
    </div>
  )

  if (variante === 'tarjeta') {
    return <div className="flex w-full justify-center py-6">{contenido}</div>
  }
  return <div className="min-h-screen flex items-center justify-center bg-muted p-6">{contenido}</div>
}
