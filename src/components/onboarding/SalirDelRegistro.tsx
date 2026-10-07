'use client'

/**
 * SalirDelRegistro — la salida del registro, con su confirmación.
 *
 * Vive en las pantallas de onboarding, que no tienen barra de navegación ni
 * botón del navegador que sirva: una vez adentro, la única forma de salir era
 * cerrar la pestaña. Esto la vuelve explícita y le dice a la persona lo único
 * que le importa antes de irse: que no pierde lo que ya llenó.
 *
 * Salir cierra la sesión a propósito. La promesa que hace el diálogo —volver
 * a donde quedaste— la cumple el reingreso, no la pestaña abierta: el punto de
 * retorno se lee del back con el correo (`GET /users/me/onboarding/session`).
 */

import { useContext, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SignOut } from '@phosphor-icons/react'
import { AuthContext } from '@/lib/auth/auth-context'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

/**
 * A dónde se puede volver sin salir del registro. Depende de dónde está la
 * persona (Nico, 01-10-2026: «deberíamos de tener dos opciones, el devolverse
 * a lo de formulario de inmobiliaria o seleccionar rol, dependiendo de en qué
 * pasos estaba, y también la opción de salir por si se quiere salir del todo»).
 */
export interface VolverDelRegistro {
  /** El botón: «Volver a los datos de la inmobiliaria», «Volver a elegir tu perfil»… */
  etiqueta: string
  /** Una frase sobre para qué sirve volver ahí. */
  descripcion?: string
  onVolver: () => void
}

export interface SalirDelRegistroProps {
  /**
   * Se corre antes de cerrar sesión — para soltar el borrador local, si la
   * pantalla guarda alguno. No debe lanzar: salir nunca puede quedar trabado.
   */
  onAntesDeSalir?: () => void
  /**
   * Con esto el diálogo ofrece volver un paso atrás además de salir. Antes la
   * única salida cerraba la sesión: quien quería corregir la razón social
   * terminaba en el login (Alexis, 01-10-2026).
   */
  volver?: VolverDelRegistro
}

export function SalirDelRegistro({ onAntesDeSalir, volver }: SalirDelRegistroProps) {
  const router = useRouter()
  // A propósito el contexto crudo y no `useAuth()`: ese lanza si no hay
  // AuthProvider arriba, y el botón de salir no puede ser lo que tumba la
  // pantalla. Sin proveedor simplemente navega, que es lo que se le pidió.
  const auth = useContext(AuthContext)
  const [abierto, setAbierto] = useState(false)
  const [saliendo, setSaliendo] = useState(false)

  const salir = async () => {
    setSaliendo(true)
    try {
      onAntesDeSalir?.()
    } catch {
      // Limpiar un borrador es cortesía; que falle no puede retener a nadie.
    }
    try {
      await auth?.signOut()
    } catch {
      // Cerrar la sesión en Supabase puede fallar (la red): salir igual. Sin
      // este `catch` el rechazo quedaba sin atrapar (02-10-2026). Al entrar a
      // /auth la sesión vieja se vuelve a revisar.
    } finally {
      router.replace('/auth')
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        data-testid="salir-del-registro"
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-body-sm font-medium text-fg transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        <SignOut className="h-4 w-4" weight="bold" aria-hidden />
        Salir
      </button>

      <AlertDialog open={abierto} onOpenChange={setAbierto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{volver ? '¿Qué quieres hacer?' : '¿Salir del registro?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {volver?.descripcion ? `${volver.descripcion} ` : ''}
              {volver ? 'Si sales, guardamos' : 'Guardamos'} lo que ya llenaste. Cuando vuelvas a
              entrar con tu correo, sigues justo donde quedaste.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* Con tres salidas no caben en una fila (la primera quedaba cortada):
              van una debajo de otra, a lo ancho. */}
          <AlertDialogFooter className={volver ? 'sm:flex-col-reverse sm:justify-start [&>*]:w-full' : undefined}>
            <AlertDialogCancel disabled={saliendo}>Seguir aquí</AlertDialogCancel>
            {volver ? (
              // Volver no cierra la sesión: cierra el diálogo y lleva al paso.
              <AlertDialogCancel
                disabled={saliendo}
                onClick={() => volver.onVolver()}
                data-testid="volver-del-registro"
              >
                {volver.etiqueta}
              </AlertDialogCancel>
            ) : null}
            <AlertDialogAction
              onClick={(event) => {
                // Sin esto Radix cierra el diálogo y desmonta el botón antes
                // de que `signOut` resuelva, y el estado de «saliendo» no se ve.
                event.preventDefault()
                void salir()
              }}
              disabled={saliendo}
            >
              {saliendo ? 'Saliendo...' : volver ? 'Salir del registro' : 'Salir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
