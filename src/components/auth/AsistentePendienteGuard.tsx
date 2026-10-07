'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/use-auth'
import { CargaDeMarca } from '@/components/ui/carga-de-marca'
import {
  RUTA_DEL_ASISTENTE,
  useRegistroDeLaInmobiliaria,
} from '@/lib/auth/registro-de-la-inmobiliaria'

/**
 * 🔴 El candado del registro a medias: lo de adentro (el panel, el segundo
 * factor) NO se monta hasta que se sabe que el registro está terminado.
 *
 * Nico, 2026-09-30: creó la cuenta, llegó a «Miembros», lo sacó la
 * plataforma, volvió a entrar y aterrizó en el panel sin Habeas Data ni
 * Confirmar. Nico, 2026-10-01: «nos llevó luego de un rato a esta pantalla,
 * literal ingresó a la plataforma» — el panel con «Protege tu cuenta» encima,
 * con el registro sin terminar.
 *
 * Antes este guard era un hermano que devolvía `null` y redirigía cuando la
 * pregunta volvía: mientras tanto el layout ya montaba el panel y la escena
 * del segundo factor, y si la agencia no tenía sesión del asistente (el
 * traspaso al micro había fallado) ni siquiera redirigía. Ahora envuelve:
 *   - `verificando` → un cargador; ni panel ni segundo factor.
 *   - `a-medias` → a `/onboarding/inmobiliaria`, que retoma en el paso; el
 *     cargador se queda hasta que la navegación lo desmonte.
 *   - `terminado` → lo de adentro (y se recuerda: la próxima vez sin espera).
 *   - `no-se` → lo de adentro: fail-open, no se expulsa a nadie por no poder
 *     preguntar.
 *
 * El veredicto vive en `registro-de-la-inmobiliaria.ts`; «Selecciona tu
 * perfil» usa el mismo.
 */
export function AsistentePendienteGuard({ children }: { children?: ReactNode }) {
  const router = useRouter()
  const { user } = useAuth()
  const registro = useRegistroDeLaInmobiliaria(user?.id ?? null)

  useEffect(() => {
    if (registro === 'a-medias') router.replace(RUTA_DEL_ASISTENTE)
  }, [registro, router])

  if (registro === 'verificando' || registro === 'a-medias') {
    return (
      <div
        className="min-h-screen bg-bg flex items-center justify-center p-6"
        data-testid="asistente-pendiente-verificando"
      >
        <CargaDeMarca tamano="lg" />
      </div>
    )
  }

  return <>{children}</>
}
