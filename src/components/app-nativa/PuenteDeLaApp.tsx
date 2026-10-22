'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { esLaApp, escucharALaApp, llamarALaApp, plataformaDeLaApp } from '@/lib/app-nativa/puente'
import { instalarAbrirYDescargar } from '@/lib/app-nativa/abrir-y-descargar'
import { hayUnaEntradaConGoogleEnCurso, rutaDelRegresoDeLaApp } from '@/lib/app-nativa/entrar'
import { escucharAvisosDeLaApp } from '@/lib/app-nativa/avisos'
import { manejarBotonAtras, rutaInternaDeLeasefy } from '@/lib/app-nativa/navegacion'

/**
 * Lo nativo de la app de iOS/Android, montado UNA vez en el layout raíz. En el
 * navegador no hace nada (no hay `window.Capacitor`).
 *
 * - Cierra la pantalla de inicio de la app apenas la plataforma pinta.
 * - Descargas y enlaces externos (`abrir-y-descargar.ts`).
 * - Botón «atrás» de Android: cierra el cajón o diálogo abierto; si no hay, vuelve.
 * - Enlaces que abren la app (correo, WhatsApp, regreso de Google).
 * - Tocar un aviso lleva a su pantalla; con la app abierta en Android, un toast.
 * - La hora y la batería en el color que se lee sobre el tema (claro u oscuro).
 */
export function PuenteDeLaApp() {
  const router = useRouter()

  useEffect(() => {
    if (!esLaApp()) return
    const plataforma = plataformaDeLaApp()
    if (plataforma) document.documentElement.dataset.app = plataforma

    void llamarALaApp('SplashScreen', 'hide', { fadeOutDuration: 200 }).catch(() => {})

    const quitarDescargas = instalarAbrirYDescargar({ avisar: (mensaje) => toast.error(mensaje) })

    const quitarAtras = escucharALaApp<{ canGoBack?: boolean }>('App', 'backButton', (datos) =>
      manejarBotonAtras(Boolean(datos?.canGoBack)),
    )

    const irA = (direccion: string) => {
      const regresoDeGoogle = rutaDelRegresoDeLaApp(direccion)
      if (regresoDeGoogle) {
        // Si la entrada sigue en curso, ella misma canjea el código (Android lo
        // entrega dos veces). Si no (la app se reinició mientras Google estaba
        // abierto), se termina de entrar acá, en /auth/callback con las cookies de la app.
        if (!hayUnaEntradaConGoogleEnCurso()) window.location.assign(regresoDeGoogle)
        return
      }
      const ruta = rutaInternaDeLeasefy(direccion)
      if (ruta) router.push(ruta)
    }

    const quitarEnlaces = escucharALaApp<{ url?: string }>('App', 'appUrlOpen', (datos) => {
      if (datos?.url) irA(datos.url)
    })

    // El enlace que ABRIÓ la app (estaba cerrada). Se atiende una sola vez: la app
    // lo sigue devolviendo mientras viva, y la página puede recargarse.
    void llamarALaApp<{ url?: string } | undefined>('App', 'getLaunchUrl')
      .then((arranque) => {
        const url = arranque?.url
        if (!url) return
        const CLAVE = 'leasefy-app-enlace-de-arranque'
        try {
          if (window.sessionStorage.getItem(CLAVE) === url) return
          window.sessionStorage.setItem(CLAVE, url)
        } catch {
          // Sin sessionStorage: se atiende igual.
        }
        irA(url)
      })
      .catch(() => {})

    const quitarAvisos = escucharAvisosDeLaApp({
      alTocar: irA,
      alLlegarConLaAppAbierta: (aviso) =>
        toast(aviso.titulo, {
          description: aviso.cuerpo || undefined,
          action: aviso.url ? { label: 'Ver', onClick: () => irA(aviso.url!) } : undefined,
        }),
    })

    // La hora, la batería y la señal: claras sobre el tema oscuro, oscuras sobre el claro.
    const raiz = document.documentElement
    let estiloActual = ''
    const pintarBarras = () => {
      const estilo = raiz.classList.contains('dark') ? 'DARK' : 'LIGHT'
      if (estilo === estiloActual) return
      estiloActual = estilo
      void llamarALaApp('SystemBars', 'setStyle', { style: estilo }).catch(() => {})
    }
    pintarBarras()
    const observador = new MutationObserver(pintarBarras)
    observador.observe(raiz, { attributes: true, attributeFilter: ['class'] })

    return () => {
      quitarDescargas()
      quitarAtras()
      quitarEnlaces()
      quitarAvisos()
      observador.disconnect()
    }
  }, [router])

  return null
}
