'use client'

/**
 * SesionYaAbierta — llegar a la pantalla de entrar cuando ya estás adentro.
 *
 * Pasa todo el tiempo: alguien toca «Postularme», la puerta lo manda a entrar,
 * y resulta que ya tenía sesión — o la tiene con OTRA cuenta, la del trabajo,
 * la de la inmobiliaria. Antes veía un formulario de login en blanco, sin una
 * sola señal de que ya estaba dentro y sin forma de simplemente continuar.
 *
 * No se decide por la persona. Se le muestra con qué cuenta está y se le dan
 * las dos salidas: seguir con esta, o entrar con otra.
 *
 * Rebotarla en silencio —mandarla directo al `returnUrl`— sería peor: quien
 * quería cambiar de cuenta se queda encerrado en la que tiene, sin entender
 * por qué la pantalla de login «no le sale».
 */

import { useCallback, useEffect, useState } from 'react'
import { SignOut, UserCircle } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth/use-auth'
import { rutaAlSegundoFactor } from '@/lib/auth/regreso-tras-el-segundo-factor'
import {
  anotarQueContinua,
  olvidarQueContinuo,
  volvioJustoDespuesDeContinuar,
} from '@/lib/auth/regreso-tras-continuar'

/** Por qué se pasa al formulario sin que la persona lo haya pedido. */
export type MotivoDelCambioDeCuenta = 'sesion-vencida'

interface Props {
  /** A dónde iba la persona. Se respeta al continuar. */
  destino: string
  /**
   * Se llama cuando elige entrar con otra cuenta: hay que mostrarle el
   * formulario. Con `sesion-vencida`, «Continuar» descubrió que la sesión ya
   * no servía (token vencido y la renovación falló): el formulario lo dice.
   */
  onCambiarDeCuenta: (motivo?: MotivoDelCambioDeCuenta) => void
}

export function SesionYaAbierta({ destino, onCambiarDeCuenta }: Props) {
  const { user, signOut, mfaRequired, mfaEnrollRequired, confirmarSesionVigente } = useAuth()
  const [saliendo, setSaliendo] = useState(false)
  // La recarga completa tarda (el destino arma todo el panel): mientras
  // tanto el botón carga y queda quieto, para que no parezca que el clic no
  // hizo nada ni se pueda apretar dos veces (Nico, 30-09).
  const [continuando, setContinuando] = useState(false)
  /*
   * 🔴 LOGIN-BUCLE (Nico, 06-10-2026): ¿vuelve justo después de «Continuar»?
   * Entonces el destino no la dejó entrar y ofrecerle «Continuar» otra vez es
   * el bucle. Se lee una vez (la marca se borra en el efecto) y se le dice.
   */
  const [rebote] = useState(() => volvioJustoDespuesDeContinuar())
  useEffect(() => {
    olvidarQueContinuo()
  }, [])

  const continuar = useCallback(async () => {
    setContinuando(true)
    /*
     * 🔴 LOGIN-BUCLE: «Continuar» sólo sigue con una sesión que Supabase da por
     * viva. Si el token venció y renovarla falla de verdad, se cierra la sesión
     * local y se muestra el formulario con el porqué, en vez de recargar el
     * destino para volver a caer acá. Sin respuesta (la red) se sigue: el
     * destino ya no rebota por un «todavía no sé», espera.
     */
    if (confirmarSesionVigente) {
      const vigencia = await confirmarSesionVigente()
      if (vigencia === 'muerta') {
        try {
          await signOut()
        } finally {
          setContinuando(false)
          onCambiarDeCuenta('sesion-vencida')
        }
        return
      }
    }
    anotarQueContinua(destino)
    // `window.location` y no el router: el resto del formulario ya navega así,
    // y una recarga completa deja el contexto de auth limpio en el destino.
    //
    // «Continuar» no salta el segundo factor (QA 01-10-2026): una sesión
    // abierta con la contraseña y sin el código (la de un enlace de
    // recuperación, o una que se quedó a medias) iba directo al destino, y si
    // el destino no tenía su propio ProtectedRoute —el selector de perfil, los
    // onboardings— quedaba adentro sin el código. Mismo orden que AuthForm.
    if (mfaEnrollRequired) {
      window.location.href = '/auth/mfa-enroll'
      return
    }
    window.location.href = mfaRequired ? rutaAlSegundoFactor(destino) : destino
  }, [destino, mfaRequired, mfaEnrollRequired, confirmarSesionVigente, signOut, onCambiarDeCuenta])

  const cambiar = useCallback(async () => {
    setSaliendo(true)
    try {
      await signOut()
    } finally {
      /*
       * Se muestra el formulario pase lo que pase. Si `signOut` falla, dejar a
       * la persona mirando un botón que gira para siempre es peor que dejarla
       * intentar entrar: el login con otra cuenta pisa la sesión anterior.
       */
      setSaliendo(false)
      onCambiarDeCuenta()
    }
  }, [signOut, onCambiarDeCuenta])

  /*
   * El nombre primero: es lo que la persona reconoce como «yo». El correo va
   * en la tarjeta de abajo, que es donde sirve para distinguir entre dos
   * cuentas. En el botón, un correo largo lo desborda y no aporta.
   */
  const comoQuien = user?.name?.trim() || user?.email || 'tu cuenta'

  const tarjetaDeLaCuenta = (
    <div className="mb-6 flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-4">
      <UserCircle className="h-8 w-8 shrink-0 text-muted-foreground" weight="light" />
      <div className="min-w-0">
        {user?.name ? (
          <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
        ) : null}
        <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
      </div>
    </div>
  )

  /*
   * 🔴 LOGIN-BUCLE: volvió justo después de «Continuar». La salida principal
   * pasa a ser entrar de nuevo (con esta cuenta u otra); «Intentar de nuevo»
   * queda, discreto, por si fue un tropiezo de una vez.
   */
  if (rebote) {
    return (
      <div className="w-full" data-testid="sesion-ya-abierta" data-rebote="true">
        <div className="mb-8">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
            Algo no salió bien
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            No pudimos abrir tu sesión
          </h1>
          <p className="mt-2 text-sm text-muted-foreground" data-testid="sesion-rebote-frase">
            Tocaste «Continuar» y volviste a esta pantalla. Para no dejarte dando vueltas, entra de
            nuevo con tu correo y tu contraseña: puede ser esta misma cuenta u otra.
          </p>
        </div>

        {tarjetaDeLaCuenta}

        <div className="flex flex-col gap-2">
          <Button
            className="w-full"
            hideArrow
            onClick={() => void cambiar()}
            isLoading={saliendo}
            disabled={saliendo || continuando}
            data-testid="sesion-rebote-otra-cuenta"
          >
            <SignOut className="mr-2 h-4 w-4" />
            Entrar con otra cuenta
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            hideArrow
            onClick={() => void continuar()}
            isLoading={continuando}
            disabled={saliendo || continuando}
            data-testid="sesion-rebote-intentar"
          >
            Intentar de nuevo
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full" data-testid="sesion-ya-abierta">
      <div className="mb-8">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
          Ya estás dentro
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          ¿Sigues con esta cuenta?
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Estás en Leasefy como <span className="font-medium text-foreground">{comoQuien}</span>.
          Puedes continuar así o entrar con otra cuenta.
        </p>
      </div>

      {tarjetaDeLaCuenta}

      <div className="flex flex-col gap-2">
        <Button
          className="w-full"
          hideArrow
          onClick={() => void continuar()}
          isLoading={continuando}
          disabled={saliendo || continuando}
          data-testid="sesion-continuar"
        >
          <span className="truncate">Continuar como {comoQuien}</span>
        </Button>
        <Button
          variant="ghost"
          className="w-full"
          hideArrow
          onClick={() => void cambiar()}
          isLoading={saliendo}
          disabled={saliendo || continuando}
        >
          <SignOut className="mr-2 h-4 w-4" />
          Entrar con otra cuenta
        </Button>
      </div>
    </div>
  )
}
