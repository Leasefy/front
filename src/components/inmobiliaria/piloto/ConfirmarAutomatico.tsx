'use client'

/**
 * ConfirmarAutomatico — pasar a Automático se confirma y queda a tu nombre.
 *
 * 🔴 PI-23 (QA-PILOTO, 04-10-2026): en «Autonomía» bastaba un clic para poner
 * un agente en Automático, sin decir qué iba a pasar y sin código, aunque
 * «¿Opera sola?» promete que se hace «con su sesión y su segundo factor (así
 * queda a su nombre)». Desde Automático el Piloto actúa a nombre de quien lo
 * puso: llama, escribe y genera documentos.
 *
 * Ahora:
 *   1. Dice qué va a pasar: qué hace solo, qué sigue pidiendo el clic y, si el
 *      Piloto está apagado, que la elección se guarda pero no actúa todavía.
 *   2. Si el micro responde `SEGUNDO_FACTOR_RECIENTE` (el segundo factor no se
 *      verificó en los últimos minutos), pide las seis cifras ahí mismo —el
 *      mismo reto de Supabase que la pantalla del segundo factor— y repite el
 *      cambio. Nunca manda a otra pantalla.
 *
 * Lo usan la hoja de «Autonomía» (un agente, o la perilla propia de un
 * proceso) y la píldora del encabezado (la flota entera).
 */

import { useContext, useEffect, useState, type ReactNode } from 'react'
import { ShieldCheck } from '@phosphor-icons/react'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { CasillasDeCodigo } from '@/components/ui/casillas-de-codigo'
import { AuthContext } from '@/lib/auth/auth-context'
import { getSupabase } from '@/lib/supabase/client'

/** El código que manda el micro cuando falta el segundo factor de hace poco. */
export const CODIGO_SEGUNDO_FACTOR_RECIENTE = 'SEGUNDO_FACTOR_RECIENTE'

/** ¿Este fallo pide el segundo factor de ahora? (un `ApiError` del micro o su cuerpo). */
export function pideSegundoFactor(fallo: unknown): boolean {
  if (!fallo || typeof fallo !== 'object') return false
  const f = fallo as { code?: unknown; detalle?: { code?: unknown } }
  return f.code === CODIGO_SEGUNDO_FACTOR_RECIENTE || f.detalle?.code === CODIGO_SEGUNDO_FACTOR_RECIENTE
}

export interface ConfirmarAutomaticoProps {
  abierto: boolean
  /** «Contratos», «Todos los agentes», «Conciliar por un alias confirmado». */
  quien: string
  /** ¿El Piloto automático está activo para la inmobiliaria? */
  pilotoActivo: boolean
  /** Lo que hace solo ESE agente en Automático, si se sabe (la frase del micro). */
  queHaceSolo?: string | null
  /** Hace el cambio. Devuelve `fallo` tal cual para saber si pide el código. */
  onConfirmar: () => Promise<{ ok: boolean; fallo?: unknown }>
  onCerrar: () => void
  /**
   * Por dónde empieza. La píldora del encabezado ya confirmó en línea con lo
   * que pasa («¿Lo pasamos?»): si el micro pide el código, abre directo en él
   * (no se confirma dos veces).
   */
  pasoInicial?: 'explicar' | 'codigo'
  /**
   * PI-01 (PILOTO-ACTIVO, 04-10-2026): el mismo diálogo —qué va a pasar y el
   * código de ahora— sirve para PRENDER el Piloto automático de la
   * inmobiliaria. Sin estas, dice lo de pasar un agente a Automático.
   */
  titulo?: string
  descripcion?: ReactNode
  explicacion?: ReactNode
  textoSi?: string
  textoVerificar?: string
}

type Paso = 'explicar' | 'codigo'

export function ConfirmarAutomatico({
  abierto,
  quien,
  pilotoActivo,
  queHaceSolo,
  onConfirmar,
  onCerrar,
  pasoInicial = 'explicar',
  titulo,
  descripcion,
  explicacion,
  textoSi = 'Sí, pasar a Automático',
  textoVerificar = 'Verificar y pasar',
}: ConfirmarAutomaticoProps) {
  // Sin `useAuth` a propósito: el diálogo vive montado (cerrado) en el
  // encabezado y en la hoja, y fuera de un AuthProvider (pruebas, vistas
  // sueltas) no debe tumbar la pantalla. Sin sesión no hay a quién marcarle
  // el factor: el micro igual vuelve a pedirlo.
  const auth = useContext(AuthContext)
  const [paso, setPaso] = useState<Paso>(pasoInicial)
  const [ocupado, setOcupado] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null | undefined>(undefined)

  // Cada vez que se abre, empieza por la explicación.
  useEffect(() => {
    if (!abierto) return
    setPaso(pasoInicial)
    setCodigo('')
    setError(null)
    setOcupado(false)
  }, [abierto, pasoInicial])

  // El factor de la persona se busca sólo cuando hace falta pedir el código.
  useEffect(() => {
    if (paso !== 'codigo') return
    let vigente = true
    ;(async () => {
      try {
        const { data } = (await getSupabase()?.auth.mfa.listFactors()) ?? { data: null }
        const verificado = data?.totp?.find((f) => f.status === 'verified')
        if (vigente) setFactorId(verificado?.id ?? null)
      } catch {
        if (vigente) setFactorId(null)
      }
    })()
    return () => {
      vigente = false
    }
  }, [paso])

  const confirmar = async () => {
    setOcupado(true)
    setError(null)
    const r = await onConfirmar()
    setOcupado(false)
    if (r.ok) {
      onCerrar()
      return
    }
    if (pideSegundoFactor(r.fallo)) {
      setPaso('codigo')
      return
    }
    // Otro fallo: el que llama ya lo dice (toast); el diálogo se cierra.
    onCerrar()
  }

  const verificar = async (c: string) => {
    if (!factorId || c.length !== 6 || ocupado) return
    setOcupado(true)
    setError(null)
    try {
      const supabase = getSupabase()
      if (!supabase) throw new Error('sin sesión')
      const { data: reto, error: errorDelReto } = await supabase.auth.mfa.challenge({ factorId })
      if (errorDelReto) throw errorDelReto
      const { error: errorDelCodigo } = await supabase.auth.mfa.verify({ factorId, challengeId: reto.id, code: c })
      if (errorDelCodigo) throw errorDelCodigo
      auth?.setMfaVerified()
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      setError(
        /invalid|expired/i.test(msg)
          ? 'Ese código no sirvió. Mira tu aplicación de autenticación y escribe el de ahora.'
          : 'No pudimos verificar el código. Intenta de nuevo en un momento.',
      )
      setCodigo('')
      setOcupado(false)
      return
    }
    // Con el factor recién verificado, el mismo cambio otra vez.
    const r = await onConfirmar()
    setOcupado(false)
    if (r.ok) {
      onCerrar()
      return
    }
    if (pideSegundoFactor(r.fallo)) {
      setError('Tu sesión todavía no tiene el código nuevo. Vuelve a escribirlo.')
      setCodigo('')
      return
    }
    onCerrar()
  }

  return (
    <AlertDialog open={abierto} onOpenChange={(o) => !o && !ocupado && onCerrar()}>
      <AlertDialogContent icon={<ShieldCheck weight="bold" />} data-testid="confirmar-automatico">
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo ?? `¿Pasar ${quien} a Automático?`}</AlertDialogTitle>
          <AlertDialogDescription>
            {descripcion ??
              'Desde ese momento el Piloto actúa a tu nombre: hace solo lo que ya sabe hacer, dentro de tus topes y del horario de ley, y te cuenta en la Actividad en vivo lo que hizo.'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {paso === 'explicar' && explicacion ? (
          <div className="space-y-3 text-body-sm text-fg" data-testid="confirmar-automatico-explicacion">
            {explicacion}
          </div>
        ) : paso === 'explicar' ? (
          <div className="space-y-3 text-body-sm text-fg" data-testid="confirmar-automatico-explicacion">
            {queHaceSolo && <p className="text-fg-muted">{queHaceSolo}</p>}
            <p className="text-fg-muted">
              Lo que sale de la inmobiliaria sin vuelta atrás o mueve plata (giros, la DIAN, centrales de
              riesgo, terminaciones, propuestas al inquilino) te lo sigue dejando en la Bandeja con su clic.
            </p>
            {!pilotoActivo && (
              <p className="rounded-md border border-warning bg-warning-soft px-3 py-2 text-fg" data-testid="confirmar-automatico-apagado">
                El Piloto automático no está activo en tu inmobiliaria: guardo tu elección, pero no actuará
                solo hasta que lo actives en la página del Piloto. Mientras tanto, prepara todo y te pide el clic.
              </p>
            )}
            <p className="text-fg-muted">
              Si no confirmaste hace poco el código de tu aplicación de autenticación, te lo pedimos aquí mismo: así
              queda a tu nombre.
            </p>
          </div>
        ) : (
          <div className="space-y-2" data-testid="confirmar-automatico-codigo">
            {factorId === null ? (
              <p className="text-body-sm text-fg">
                Tu cuenta no tiene una aplicación de autenticación activa. Actívala en tu perfil (Seguridad)
                y vuelve a intentarlo.
              </p>
            ) : (
              <>
                <p className="text-body-sm font-medium text-fg">Escribe el código de seis cifras de tu aplicación</p>
                <CasillasDeCodigo
                  value={codigo}
                  onChange={(v) => {
                    setCodigo(v)
                    if (error) setError(null)
                  }}
                  onCompleto={(c) => void verificar(c)}
                  disabled={ocupado || factorId === undefined}
                  hayError={error !== null}
                  aria-label="Código de tu aplicación de autenticación"
                  autoFocus
                />
                {error && (
                  <p role="alert" className="text-body-sm text-danger">
                    {error}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={ocupado}>Cancelar</AlertDialogCancel>
          {paso === 'explicar' ? (
            <Button hideArrow isLoading={ocupado} onClick={() => void confirmar()} data-testid="confirmar-automatico-si">
              {textoSi}
            </Button>
          ) : (
            <Button
              hideArrow
              isLoading={ocupado}
              disabled={codigo.length !== 6 || !factorId}
              onClick={() => void verificar(codigo)}
              data-testid="confirmar-automatico-verificar"
            >
              {textoVerificar}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
