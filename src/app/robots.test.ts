import { describe, it, expect } from 'vitest'
import robots from './robots'
import { IDIOMAS } from '@/lib/idioma/idioma'

const PRIVADAS = [
  '/avaluo/reporte/',
  '/avaluo/estado/',
  '/avaluo/verificar/',
  '/arco/',
]

function disallowDeTodos(): string[] {
  const reglas = robots().rules
  const lista = Array.isArray(reglas) ? reglas : [reglas]
  return lista.flatMap((r) => (r.userAgent === '*' ? ([] as string[]).concat(r.disallow ?? []) : []))
}

describe('robots.txt keeps private avaluo and ARCO pages out of search engines', () => {
  it.each(PRIVADAS)('disallows %s unprefixed and under every language prefix', (ruta) => {
    const bloqueadas = disallowDeTodos()
    expect(bloqueadas).toContain(ruta)
    for (const idioma of IDIOMAS) {
      expect(bloqueadas).toContain(`/${idioma}${ruta}`)
    }
  })
})
