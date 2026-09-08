import { describe, it, expect } from 'vitest'
import { mapWithConcurrency } from './concurrency'

/**
 * T-0076: `usePilotoAutonomia` disparaba los 12 agentes del roster con
 * `Promise.allSettled(items.map(fn))` — 12 peticiones simultáneas al agente,
 * el mayor contribuyente al burst que tumbaba `/panel/inmobiliaria/piloto`
 * contra el `agents_limit` de NGINX (5 r/s, burst 10). `mapWithConcurrency`
 * es el mismo resultado (un `PromiseSettledResult` por ítem, en el mismo
 * orden) sin el burst: nunca hay más de `limite` promesas en vuelo a la vez.
 */
describe('mapWithConcurrency', () => {
  it('nunca corre más de `limite` tareas al mismo tiempo', async () => {
    const items = Array.from({ length: 12 }, (_, i) => i)
    let enVuelo = 0
    let picoDeVuelo = 0

    const tarea = async (i: number) => {
      enVuelo += 1
      picoDeVuelo = Math.max(picoDeVuelo, enVuelo)
      // Cede el microtask para que las demás tareas de la misma tanda
      // alcancen a arrancar antes de que ésta termine.
      await new Promise((r) => setTimeout(r, 5))
      enVuelo -= 1
      return i * 2
    }

    const resultados = await mapWithConcurrency(items, 3, tarea)

    expect(picoDeVuelo).toBeLessThanOrEqual(3)
    expect(resultados).toHaveLength(12)
    resultados.forEach((r, i) => {
      expect(r.status).toBe('fulfilled')
      expect(r.status === 'fulfilled' && r.value).toBe(i * 2)
    })
  })

  it('conserva el orden de entrada aunque las tareas terminen en otro orden', async () => {
    const demoras = [30, 5, 20, 1]
    const resultados = await mapWithConcurrency(demoras, 4, async (ms, i) => {
      await new Promise((r) => setTimeout(r, ms))
      return i
    })
    expect(resultados.map((r) => (r.status === 'fulfilled' ? r.value : undefined))).toEqual([
      0, 1, 2, 3,
    ])
  })

  it('un rechazo se refleja como `rejected` sin tumbar a los demás (fail-soft por ítem)', async () => {
    const items = [1, 2, 3]
    const resultados = await mapWithConcurrency(items, 2, async (i) => {
      if (i === 2) throw new Error('boom')
      return i
    })
    expect(resultados[0]).toEqual({ status: 'fulfilled', value: 1 })
    expect(resultados[1]?.status).toBe('rejected')
    expect(resultados[2]).toEqual({ status: 'fulfilled', value: 3 })
  })

  it('con `limite` >= tamaño de la lista, se comporta como Promise.allSettled', async () => {
    const items = [1, 2, 3]
    const resultados = await mapWithConcurrency(items, 99, async (i) => i * 10)
    expect(resultados.map((r) => (r.status === 'fulfilled' ? r.value : undefined))).toEqual([
      10, 20, 30,
    ])
  })

  it('lista vacía devuelve un arreglo vacío sin llamar la tarea', async () => {
    let llamadas = 0
    const resultados = await mapWithConcurrency([], 3, async () => {
      llamadas += 1
      return null
    })
    expect(resultados).toEqual([])
    expect(llamadas).toBe(0)
  })
})
