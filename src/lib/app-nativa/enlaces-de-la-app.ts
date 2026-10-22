/**
 * Qué enlaces de leasefy.co abren la app de iOS/Android en vez del navegador
 * (enlaces universales de Apple y App Links de Android).
 *
 * Los dos sistemas lo verifican contra lo que sirve leasefy.co:
 *  - iPhone: `/.well-known/apple-app-site-association` (necesita el Team ID de la
 *    cuenta de Apple: variable APPLE_TEAM_ID).
 *  - Android: `/.well-known/assetlinks.json` (necesita la huella SHA-256 de la llave
 *    con que Google Play firma la app: ANDROID_SHA256_CERT_FINGERPRINTS, separadas
 *    por coma).
 * Sin esas variables las dos rutas responden 404, como hoy, y los enlaces siguen
 * abriendo el navegador.
 *
 * 🔴 La misma lista vive en `android/app/src/main/AndroidManifest.xml` del repo
 * `app-movil` (pathPrefix): si se cambia acá, se cambia allá.
 */

export const ID_DE_LA_APP = 'co.leasefy.app'

/** Prefijos de ruta que abren la app (sin comodín). */
export const RUTAS_QUE_ABREN_LA_APP = [
  '/invitacion',
  '/firmar',
  '/confirmar-cuenta',
  '/auth/callback',
  '/auth/confirmar',
  '/auth/enlace',
  '/auth/update-password',
  '/panel',
  '/inquilino',
  '/mi-arriendo',
  '/estado-de-cuenta',
  '/propiedades',
  '/es/propiedades',
  '/en/propiedades',
  '/aplicar',
  '/mis-aplicaciones',
  '/aprobacion',
  '/mandato',
] as const

/** Las huellas SHA-256 del certificado de Android, en el formato que pide Google (AA:BB:…). */
export function huellasDeAndroid(valor: string | undefined): string[] {
  return (valor ?? '')
    .split(',')
    .map((h) => h.trim().toUpperCase())
    .filter((h) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(h))
}

export function asociacionDeApple(teamId: string) {
  const app = `${teamId}.${ID_DE_LA_APP}`
  return {
    applinks: {
      details: [
        {
          appIDs: [app],
          components: [
            // La ida a Google desde la app vuelve por aquí con ?app=1 y NO debe abrir
            // la app (la termina la hoja segura del sistema).
            { '/': '/auth/callback', '?': { app: '1' }, exclude: true, comment: 'Regreso de Google hacia la app' },
            ...RUTAS_QUE_ABREN_LA_APP.map((ruta) => ({ '/': `${ruta}*` })),
          ],
        },
      ],
    },
    // El llavero del iPhone ofrece en la app las contraseñas guardadas de leasefy.co.
    webcredentials: { apps: [app] },
  }
}

export function asociacionDeAndroid(huellas: string[]) {
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls', 'delegate_permission/common.get_login_creds'],
      target: { namespace: 'android_app', package_name: ID_DE_LA_APP, sha256_cert_fingerprints: huellas },
    },
  ]
}
