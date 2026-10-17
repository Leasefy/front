import { describe, expect, it } from 'vitest'

import { textoDelAviso } from './aviso-del-reporte'

/** Nico (16-10-2026): con el panel en inglés, el aviso del reporte en inglés; en español, el del micro tal cual. */
describe('el aviso del reporte diario en el idioma del panel', () => {
  const pkr = { code: 'PKR_LOW', message_es: 'Las promesas cumplidas de los últimos 7 días van en 62,5 %: por debajo del 75 % que fijaste.', current: 62.5, threshold: 75 }

  it('en español, la frase del micro sin tocar', () => {
    expect(textoDelAviso(pkr, 'es')).toBe(pkr.message_es)
  })

  it('en inglés, con las cifras del aviso', () => {
    expect(textoDelAviso(pkr, 'en')).toBe('Promises kept over the last 7 days are at 62.5%: below the 75% you set.')
    expect(
      textoDelAviso({ code: 'CALLS_OUTSIDE_WINDOW', message_es: 'x', current: 3, threshold: 1 }, 'en'),
    ).toBe('Contacts outside Ley 2300 hours today: 3 (threshold: 1).')
  })

  it('un código que no se conoce queda con el español: no se inventa', () => {
    expect(textoDelAviso({ code: 'NUEVO', message_es: 'Algo nuevo', current: 1, threshold: 2 }, 'en')).toBe('Algo nuevo')
  })
})
