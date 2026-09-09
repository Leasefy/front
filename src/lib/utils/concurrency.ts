/**
 * concurrency.ts — corre una lista de tareas async con un tope de cuántas
 * van EN VUELO a la vez, en vez de todas juntas.
 *
 * T-0076: `usePilotoAutonomia` disparaba `Promise.allSettled(items.map(fn))`
 * contra los 12 agentes del roster — 12 peticiones simultáneas al agente, el
 * mayor contribuyente al burst que tumbaba `/panel/inmobiliaria/piloto`
 * contra el `agents_limit` de NGINX (5 r/s, burst 10; ver ledger de la
 * tarea). `mapWithConcurrency` devuelve exactamente lo mismo que
 * `Promise.allSettled` —un `PromiseSettledResult<R>` por ítem, en el mismo
 * orden de entrada, fail-soft por ítem— pero en tandas acotadas.
 */

export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limite: number,
  tarea: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const resultados: PromiseSettledResult<R>[] = new Array(items.length)
  if (items.length === 0) return resultados

  const tope = Math.max(1, Math.min(limite, items.length))
  let siguiente = 0

  async function trabajador() {
    for (;;) {
      const i = siguiente
      siguiente += 1
      if (i >= items.length) return
      try {
        const value = await tarea(items[i] as T, i)
        resultados[i] = { status: 'fulfilled', value }
      } catch (reason) {
        resultados[i] = { status: 'rejected', reason }
      }
    }
  }

  await Promise.all(Array.from({ length: tope }, () => trabajador()))
  return resultados
}
