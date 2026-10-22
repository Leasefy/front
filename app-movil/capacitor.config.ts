import type { CapacitorConfig } from '@capacitor/cli'

/*
 * La app de Leasefy abre la plataforma de siempre (leasefy.co) dentro de una
 * app nativa. Todo lo que cambia en la web llega a la app sin pasar por las
 * tiendas; lo nativo (notificaciones, entrar con Google/Apple, descargas,
 * botón atrás) lo resuelve el puente que el front usa en `src/lib/app-nativa`.
 *
 * LEASEFY_URL elige a qué Leasefy apunta la compilación:
 *   - sin variable           → https://leasefy.co (la de las tiendas)
 *   - LEASEFY_URL=http://…   → un front local o del lab, sólo para probar
 */
const URL_DE_LEASEFY = (process.env.LEASEFY_URL ?? 'https://leasefy.co').replace(/\/$/, '')
const esDePrueba = !URL_DE_LEASEFY.startsWith('https://leasefy.co')

const config: CapacitorConfig = {
  appId: 'co.leasefy.app',
  appName: 'Leasefy',
  webDir: 'www',
  // El front y el back reconocen la app por esta marca (LeasefyApp/1).
  appendUserAgent: 'LeasefyApp/1',
  backgroundColor: '#ffffff',
  server: {
    url: URL_DE_LEASEFY,
    cleartext: URL_DE_LEASEFY.startsWith('http://'),
    // Sin internet (o con leasefy.co caído) se muestra esta pantalla propia
    // en vez de la página de error del sistema.
    errorPath: 'sin-conexion.html',
    // Lo que se puede abrir DENTRO de la app. El resto (WhatsApp, Wompi,
    // enlaces de terceros) lo abre el front en el navegador del sistema.
    allowNavigation: ['leasefy.co', 'www.leasefy.co'],
  },
  ios: {
    // La web dibuja debajo de la hora y la isla; el front respeta el área
    // segura con env(safe-area-inset-*) en sus barras.
    contentInset: 'never',
    backgroundColor: '#ffffff',
    allowsLinkPreview: false,
    webContentsDebuggingEnabled: esDePrueba,
    preferredContentMode: 'mobile',
  },
  android: {
    backgroundColor: '#ffffff',
    allowMixedContent: false,
    webContentsDebuggingEnabled: esDePrueba,
  },
  plugins: {
    SplashScreen: {
      // El front la cierra apenas pinta (SplashScreen.hide); si eso no pasa
      // (sin internet, front viejo) se cierra sola a los 4 s.
      launchShowDuration: 4000,
      launchAutoHide: true,
      launchFadeOutDuration: 200,
      backgroundColor: '#ffffff',
      showSpinner: false,
      androidScaleType: 'CENTER_INSIDE',
      splashFullScreen: false,
      splashImmersive: false,
    },
    SystemBars: {
      // Android: inyecta --safe-area-inset-* (el env() de WebView < 140 miente).
      insetsHandling: 'css',
      style: 'DEFAULT',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}

export default config
