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

import { useCallback, useState } from 'react'
import { SignOut, UserCircle } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth/use-auth'

interface Props {
  /** A dónde iba la persona. Se respeta al continuar. */
  destino: string
  /** Se llama cuando elige entrar con otra cuenta: hay que mostrarle el formulario. */
  onCambiarDeCuenta: () => void
}

export function SesionYaAbierta({ destino, onCambiarDeCuenta }: Props) {
  const { user, signOut } = useAuth()
  const [saliendo, setSaliendo] = useState(false)

  const continuar = useCallback(() => {
    // `window.location` y no el router: el resto del formulario ya navega así,
    // y una recarga completa deja el contexto de auth limpio en el destino.
    window.location.href = destino
  }, [destino])

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

  return (
    <div className="w-full" data-testid="sesion-ya-abierta">
      <div className="mb-8">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
          Ya estás dentro
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          ¿Seguís con esta cuenta?
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Estás en Leasefy como <span className="font-medium text-foreground">{comoQuien}</span>.
          Podés continuar así o entrar con otra cuenta.
        </p>
      </div>

      <div className="mb-6 flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-4">
        <UserCircle className="h-8 w-8 shrink-0 text-muted-foreground" weight="light" />
        <div className="min-w-0">
          {user?.name ? (
            <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
          ) : null}
          <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button className="w-full" hideArrow onClick={continuar} disabled={saliendo}>
          <span className="truncate">Continuar como {comoQuien}</span>
        </Button>
        <Button
          variant="ghost"
          className="w-full"
          hideArrow
          onClick={() => void cambiar()}
          isLoading={saliendo}
          disabled={saliendo}
        >
          <SignOut className="mr-2 h-4 w-4" />
          Entrar con otra cuenta
        </Button>
      </div>
    </div>
  )
}
