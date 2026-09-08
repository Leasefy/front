import { NavigatorLockAcquireTimeoutError } from '@supabase/auth-js'
import type { LockFunc } from '@supabase/supabase-js'

/**
 * El lock que serializa las operaciones de auth de Supabase ENTRE PESTAÑAS.
 *
 * ── Por qué esto importa (y por qué el noop de antes era peligroso) ─────────
 *
 * Acá había un lock que resolvía al instante y corría el callback en línea, con
 * el argumento de que "tenemos UN solo cliente Supabase (singleton), no
 * necesitamos coordinación cross-tab". El singleton es por PESTAÑA, no por
 * origen: dos pestañas abiertas son dos clientes, y la sesión (cookies) es la
 * misma para las dos. `navigator.locks` es global al origen — es exactamente lo
 * que impide que las dos renueven a la vez.
 *
 * Con `Detect and revoke potentially compromised refresh tokens` activo en
 * Supabase y una ventana de reúso de 10s, dos renovaciones no coordinadas sobre
 * el mismo refresh token fuera de esa ventana no dan un error recuperable:
 * Supabase interpreta reúso y **revoca la familia entera**. La sesión se muere
 * de verdad, en todas las pestañas y dispositivos a la vez.
 *
 * ── Qué arregla respecto del lock nativo de auth-js ─────────────────────────
 *
 * El motivo real por el que se había desactivado el lock es un defecto de
 * `navigatorLock` en @supabase/auth-js: cuando vence el `acquireTimeout`, su
 * `AbortController` aborta y `navigator.locks.request` rechaza con un
 * `AbortError` CRUDO ("signal is aborted without reason"). auth-js no lo
 * atrapa ni lo convierte, así que ese error escapa sin la marca
 * `isAcquireTimeout` que su propio código busca — por ejemplo
 * `_autoRefreshTokenTick`, que sabe ignorar un timeout de lock pero re-lanza
 * cualquier otra cosa. Resultado: el cliente quedaba colgado.
 *
 * Este lock hace lo mismo que el nativo pero traduce ese abort al contrato
 * documentado de auth-js: un error con `isAcquireTimeout: true`. Así el timeout
 * vuelve a ser algo que auth-js sabe manejar, y NO perdemos la serialización.
 */

/**
 * Error de "no pude tomar el lock a tiempo".
 *
 * auth-js DOCUMENTA el contrato por propiedad («an error is a timeout if it
 * has `isAcquireTimeout` set to true»), pero su `_autoRefreshTokenTick`
 * (2.106) lo comprueba con `instanceof LockAcquireTimeoutError`. Un error
 * propio con la marca pasaba el contrato documentado y no el real: el tick
 * lo relanzaba, y cada carga con sesión dejaba un rechazo sin manejar en la
 * consola («1 error» en el overlay de Next, visto el 2026-09-07). Por eso se
 * hereda de la clase de auth-js —`@supabase/auth-js` es dependencia directa,
 * fijada a la MISMA versión que usa supabase-js, para que sea la misma clase—
 * que además trae la marca `isAcquireTimeout` por si alguna versión vuelve a
 * mirar la propiedad.
 */
class LockAcquireTimeout extends NavigatorLockAcquireTimeoutError {
  constructor(name: string) {
    super(`No se pudo tomar el lock de auth "${name}" a tiempo`)
    this.name = 'LockAcquireTimeoutError'
  }
}

/** ¿El entorno soporta la Web Locks API? (SSR y navegadores viejos no.) */
function haylocks(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.locks?.request === 'function'
  )
}

function esAbort(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError'
}

export const crossTabLock: LockFunc = async <R>(
  name: string,
  acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> => {
  // Sin Web Locks no hay nada que coordinar: correr es mejor que fallar. Es el
  // mismo criterio que toma auth-js cuando el navegador no sigue la spec.
  if (!haylocks()) return fn()

  // acquireTimeout === 0 significa "tómalo sólo si está libre AHORA, no
  // esperes". Lo usa el tick de auto-refresh: si otra pestaña ya está
  // renovando, esta se saltea el turno — que es justo lo que queremos.
  if (acquireTimeout === 0) {
    return navigator.locks.request(
      name,
      { mode: 'exclusive', ifAvailable: true },
      async (lock) => {
        if (!lock) throw new LockAcquireTimeout(name)
        return fn()
      },
    ) as Promise<R>
  }

  const controller = new AbortController()
  // acquireTimeout negativo = esperar sin límite (contrato de auth-js).
  const timer =
    acquireTimeout > 0
      ? setTimeout(() => controller.abort(), acquireTimeout)
      : null

  try {
    return (await navigator.locks.request(
      name,
      { mode: 'exclusive', signal: controller.signal },
      async (lock) => {
        // Un navegador que devuelve `null` sin `ifAvailable` está violando la
        // spec. auth-js decide correr igual en ese caso y hacemos lo mismo:
        // quedarse colgado sería peor que perder la exclusión mutua.
        if (!lock) {
          console.warn(
            '[Supabase] navigator.locks devolvió null sin ifAvailable — este navegador no sigue la spec de LockManager. Corriendo sin exclusión.',
          )
        }
        return fn()
      },
    )) as R
  } catch (err) {
    // Acá está el arreglo: el AbortError crudo se convierte en el timeout que
    // auth-js sabe reconocer. Sin esto, el cliente se cuelga.
    if (esAbort(err)) throw new LockAcquireTimeout(name)
    throw err
  } finally {
    if (timer !== null) clearTimeout(timer)
  }
}
