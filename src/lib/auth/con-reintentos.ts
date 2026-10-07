/**
 * Reintentos cortos para la consulta del segundo factor.
 *
 * Nico, 02-10-2026: cuando no se puede saber si a la sesión le falta el código,
 * NO se deja entrar. Antes `checkMfaLevel` tragaba cualquier error y seguía
 * como si no hubiera segundo factor («MFA not available — ignore»): un JWT
 * que auth-js no pudo leer, un lock de auth tomado por otra pestaña o una
 * renovación de token sin red dejaban pasar sin el código.
 *
 * Primero se reintenta sola, unas pocas veces y con espera corta (casi todos
 * esos fallos son de un instante). Si sigue sin respuesta, quien llama bloquea
 * hasta poder verificar.
 */

/** Las esperas entre intentos: cuatro intentos en total, ~4,6 s de espera. */
export const ESPERAS_DEL_CHEQUEO_MS: readonly number[] = [400, 1200, 3000]

/**
 * Lo máximo que se espera a un intento. La consulta es local (lee la sesión
 * guardada), salvo que haya que renovar el token; un intento que no vuelve es
 * casi siempre el lock de auth retenido, y esperarlo para siempre era dejar la
 * pantalla en «Verificando…» sin salida.
 */
export const TOPE_POR_INTENTO_MS = 3000

/** Un intento que no contestó dentro del tope. */
export class IntentoSinRespuesta extends Error {
  constructor(ms: number) {
    super(`La consulta no respondió en ${ms} ms`)
    this.name = 'IntentoSinRespuesta'
  }
}

function conTope<T>(promesa: Promise<T>, ms: number): Promise<T> {
  let reloj: ReturnType<typeof setTimeout> | undefined
  const vencida = new Promise<never>((_, rechazar) => {
    reloj = setTimeout(() => rechazar(new IntentoSinRespuesta(ms)), ms)
  })
  return Promise.race([promesa, vencida]).finally(() => clearTimeout(reloj))
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms))
}

/**
 * Corre `intento` hasta que devuelva algo, con `esperas.length + 1` intentos
 * como mucho. Un intento falla si lanza o si pasa el `tope`. Si fallan todos,
 * lanza el último error.
 *
 * `debeSeguir` corta los reintentos (la sesión que preguntaba ya terminó): se
 * lanza el último error sin esperar más.
 */
export async function conReintentos<T>(
  intento: () => Promise<T>,
  opciones: {
    esperas?: readonly number[]
    tope?: number
    debeSeguir?: () => boolean
  } = {},
): Promise<T> {
  const esperas = opciones.esperas ?? ESPERAS_DEL_CHEQUEO_MS
  const tope = opciones.tope ?? TOPE_POR_INTENTO_MS
  let ultimo: unknown = new Error('Sin intentos')
  for (let i = 0; i <= esperas.length; i++) {
    try {
      return await conTope(intento(), tope)
    } catch (error) {
      ultimo = error
    }
    if (i === esperas.length) break
    if (opciones.debeSeguir && !opciones.debeSeguir()) break
    await esperar(esperas[i])
  }
  throw ultimo
}
