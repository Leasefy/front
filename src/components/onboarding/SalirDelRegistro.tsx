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

export interface SalirDelRegistroProps {
  /**
   * Se corre antes de cerrar sesión — para soltar el borrador local, si la
   * pantalla guarda alguno. No debe lanzar: salir nunca puede quedar trabado.
   */
  onAntesDeSalir?: () => void
}

export function SalirDelRegistro({ onAntesDeSalir }: SalirDelRegistroProps) {
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
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-body-sm text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        <SignOut className="h-4 w-4" weight="bold" aria-hidden />
        Salir
      </button>

      <AlertDialog open={abierto} onOpenChange={setAbierto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Salir del registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Guardamos lo que ya llenaste. Cuando vuelvas a entrar con tu correo, sigues
              justo donde quedaste.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saliendo}>Seguir aquí</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                // Sin esto Radix cierra el diálogo y desmonta el botón antes
                // de que `signOut` resuelva, y el estado de «saliendo» no se ve.
                event.preventDefault()
                void salir()
              }}
              disabled={saliendo}
            >
              {saliendo ? 'Saliendo...' : 'Salir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
