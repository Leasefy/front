import { describe, it, expect, vi, afterEach } from 'vitest'

import { crossTabLock } from './cross-tab-lock'

/**
 * Este lock es lo que impide que dos pestañas renueven el MISMO refresh token a
 * la vez. Con reuse detection activo en Supabase, esa carrera no da un error
 * recuperable: revoca la familia entera y mata la sesión en todos lados.
 *
 * Los tests cubren las tres cosas que hacen que sirva:
 *   1. serializa de verdad (dos titulares nunca se solapan),
 *   2. respeta `acquireTimeout === 0` (el tick de auto-refresh se saltea el
 *      turno en vez de esperar),
 *   3. traduce el AbortError crudo de la Web Locks API al timeout marcado que
 *      auth-js sabe reconocer — el defecto por el que el lock estaba apagado.
 */

/**
 * Implementación mínima de LockManager: una cola por nombre, con soporte de
 * `ifAvailable` y `signal`. happy-dom no trae `navigator.locks`.
 */
function instalarLockManager() {
  const tomados = new Set<string>()
  const esperando: Array<{ name: string; run: () => void }> = []

  function liberar(name: string) {
    tomados.delete(name)
    const i = esperando.findIndex((e) => e.name === name)
    if (i !== -1) {
      const siguiente = esperando.splice(i, 1)[0]
      siguiente.run()
    }
  }

  const request = vi.fn(
    async (
      name: string,
      opts: { ifAvailable?: boolean; signal?: AbortSignal },
      cb: (lock: { name: string } | null) => Promise<unknown>,
    ) => {
      if (!tomados.has(name)) {
        tomados.add(name)
        try {
          return await cb({ name })
        } finally {
          liberar(name)
        }
      }

      if (opts.ifAvailable) return cb(null)

      // Ocupado y hay que esperar: o nos toca el turno, o nos abortan.
      return new Promise((resolve, reject) => {
        const entrada = {
          name,
          run: () => {
            tomados.add(name)
            Promise.resolve(cb({ name }))
              .then(resolve, reject)
              .finally(() => liberar(name))
          },
        }
        esperando.push(entrada)
        opts.signal?.addEventListener('abort', () => {
          const i = esperando.indexOf(entrada)
          if (i !== -1) esperando.splice(i, 1)
          const err = new Error('signal is aborted without reason')
          err.name = 'AbortError'
          reject(err)
        })
      })
    },
  )

  Object.defineProperty(globalThis.navigator, 'locks', {
    value: { request },
    writable: true,
    configurable: true,
  })
  return { request }
}

function quitarLockManager() {
  Object.defineProperty(globalThis.navigator, 'locks', {
    value: undefined,
    writable: true,
    configurable: true,
  })
}

afterEach(() => {
  quitarLockManager()
  vi.restoreAllMocks()
})

describe('crossTabLock', () => {
  it('devuelve lo que devuelve el callback', async () => {
    instalarLockManager()
    await expect(crossTabLock('sesion', 5000, async () => 42)).resolves.toBe(42)
  })

  /**
   * La razón de ser del módulo: si dos titulares se solapan, dos pestañas
   * renuevan el mismo refresh token y Supabase revoca la familia.
   */
  it('serializa: el segundo no entra hasta que el primero terminó', async () => {
    instalarLockManager()
    const traza: string[] = []

    const primero = crossTabLock('sesion', 5000, async () => {
      traza.push('A entra')
      await new Promise((r) => setTimeout(r, 20))
      traza.push('A sale')
    })
    const segundo = crossTabLock('sesion', 5000, async () => {
      traza.push('B entra')
      traza.push('B sale')
    })

    await Promise.all([primero, segundo])

    expect(traza).toEqual(['A entra', 'A sale', 'B entra', 'B sale'])
  })

  it('locks de nombres distintos no se bloquean entre sí', async () => {
    instalarLockManager()
    let bEntro = false
    const a = crossTabLock('uno', 5000, async () => {
      await new Promise((r) => setTimeout(r, 20))
      // Si compartieran lock, B no habría podido entrar todavía.
      expect(bEntro).toBe(true)
    })
    const b = crossTabLock('dos', 5000, async () => {
      bEntro = true
    })
    await Promise.all([a, b])
  })

  describe('acquireTimeout === 0 (el tick de auto-refresh)', () => {
    it('corre cuando el lock está libre', async () => {
      instalarLockManager()
      await expect(crossTabLock('sesion', 0, async () => 'corrió')).resolves.toBe('corrió')
    })

    /**
     * Con el lock ocupado, el tick NO debe esperar ni —peor— renovar igual:
     * otra pestaña ya está renovando. Se saltea el turno con un error marcado
     * como timeout, que es justo lo que `_autoRefreshTokenTick` sabe ignorar.
     */
    it('NO corre el callback si otra pestaña tiene el lock', async () => {
      instalarLockManager()
      const fn = vi.fn()
      let liberar: () => void = () => {}
      const ocupado = crossTabLock(
        'sesion',
        5000,
        () => new Promise<void>((r) => (liberar = r)),
      )

      const err = await crossTabLock('sesion', 0, fn).catch((e) => e)

      expect(fn).not.toHaveBeenCalled()
      expect(err).toBeInstanceOf(Error)
      expect((err as { isAcquireTimeout?: boolean }).isAcquireTimeout).toBe(true)

      liberar()
      await ocupado
    })
  })

  /**
   * EL defecto por el que este lock estaba desactivado. auth-js no atrapa el
   * AbortError crudo de `navigator.locks.request`, así que escapa SIN la marca
   * `isAcquireTimeout` que su propio código busca (`_autoRefreshTokenTick`
   * ignora los timeouts pero re-lanza todo lo demás) y el cliente queda colgado.
   */
  it('convierte el AbortError crudo en un timeout marcado', async () => {
    instalarLockManager()
    let liberar: () => void = () => {}
    const ocupado = crossTabLock(
      'sesion',
      5000,
      () => new Promise<void>((r) => (liberar = r)),
    )

    const err = await crossTabLock('sesion', 20, async () => 'nunca').catch((e) => e)

    expect(err).toBeInstanceOf(Error)
    expect((err as Error).name).toBe('LockAcquireTimeoutError')
    expect((err as { isAcquireTimeout?: boolean }).isAcquireTimeout).toBe(true)
    // Y NO el AbortError crudo que auth-js no sabe manejar.
    expect((err as Error).name).not.toBe('AbortError')

    liberar()
    await ocupado
  })

  it('deja pasar tal cual un error del callback (no lo disfraza de timeout)', async () => {
    instalarLockManager()
    const propio = new Error('falló la renovación')
    await expect(
      crossTabLock('sesion', 5000, async () => {
        throw propio
      }),
    ).rejects.toBe(propio)
  })

  // SSR y navegadores viejos: correr sin exclusión es mejor que no correr.
  it('corre el callback si el entorno no tiene Web Locks', async () => {
    quitarLockManager()
    await expect(crossTabLock('sesion', 5000, async () => 'ok')).resolves.toBe('ok')
  })
})
