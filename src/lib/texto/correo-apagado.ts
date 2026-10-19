/**
 * Por qué no salió un correo en una copia de pruebas de Leasefy (el back lo
 * retiene con su interruptor de correos). Espejo de
 * `back/src/common/texto/correo-apagado.ts`.
 *
 * QA de agentes 17-10 (Nico, «Frase clara, sin jerga»): una sola frase para
 * todo lo que avisa que un correo no salió; nada de «en este entorno».
 */
export const CORREO_APAGADO_EN_PRUEBAS =
  'No salió: el correo está apagado en esta copia de pruebas de Leasefy. En producción sí se manda.'

/** Lo mismo, para cuando no se manda nada y hay que pasar el enlace a mano. */
export const COPIA_DE_PRUEBAS_SIN_CORREOS = 'Esta copia de pruebas de Leasefy no manda correos'
