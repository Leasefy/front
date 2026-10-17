import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'

import { formatCurrency, formatCurrencyEnDocumento, formatNumber } from '@/lib/format'
import { plata } from '@/lib/contabilidad/plata'
import { I18nProvider } from './i18n-context'
import { CLAVE_DEL_IDIOMA_DEL_PANEL } from './idioma-del-panel'
import { useTr } from './use-tr'
import { avisarIdiomaDeLasCifras, idiomaDeLasCifras, localeDeLasCifras, soltarIdiomaDeLasCifras } from './idioma-de-las-cifras'

/**
 * Nico (16-10-2026): «Estilo EE. UU. en todo». Con el panel en inglés la plata
 * y los números de PANTALLA se escriben «$ 5,450,000»; lo que sale para afuera
 * (documentos, mensajes al inquilino) sigue como en Colombia.
 */
const NB = '\u00a0'

describe('la plata y los números siguen al idioma del panel', () => {
  afterEach(() => soltarIdiomaDeLasCifras('prueba'))

  it('sin que nadie diga nada, como en Colombia', () => {
    expect(idiomaDeLasCifras()).toBe('es')
    expect(formatCurrency(5_450_000)).toBe(`$${NB}5.450.000`)
    expect(formatNumber(1234)).toBe('1.234')
  })

  it('con el panel en inglés, estilo EE. UU.', () => {
    avisarIdiomaDeLasCifras('en', 'prueba')
    expect(localeDeLasCifras()).toBe('en-US')
    expect(formatCurrency(5_450_000)).toBe(`$${NB}5,450,000`)
    expect(formatNumber(1234)).toBe('1,234')
  })

  it('lo que sale para afuera sigue como en Colombia: el idioma explícito y los documentos', () => {
    avisarIdiomaDeLasCifras('en', 'prueba')
    expect(formatCurrency(5_450_000, 'es')).toBe(`$${NB}5.450.000`)
    expect(formatCurrencyEnDocumento(5_450_000, false)).toBe(`$${NB}5.450.000`)
    expect(formatCurrencyEnDocumento(5_450_000, true)).toBe(`$${NB}5.450.000,00`)
    expect(plata(-119_100, 'es')).toBe(`−$${NB}119.100`)
    expect(plata(-119_100)).toBe(`−$${NB}119,100`)
  })

  it('el proveedor que se desmonta no pisa al que ya habló después', () => {
    avisarIdiomaDeLasCifras('en', 'nuevo')
    soltarIdiomaDeLasCifras('viejo')
    expect(idiomaDeLasCifras()).toBe('en')
    soltarIdiomaDeLasCifras('nuevo')
    expect(idiomaDeLasCifras()).toBe('es')
  })
})

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('el I18nProvider avisa el idioma ya hidratado', () => {
  afterEach(() => window.localStorage.removeItem(CLAVE_DEL_IDIOMA_DEL_PANEL))

  // Como una página del panel: lee el idioma (`useTr`) y adentro pinta una
  // cifra con `formatCurrency` sin idioma. Al hidratar, la página se vuelve a
  // pintar y la cifra con ella.
  function Canon() {
    return <span data-testid="canon">{formatCurrency(2_350_000)}</span>
  }
  function Pagina() {
    const tr = useTr()
    return (
      <p>
        {tr('Canon')} <Canon />
      </p>
    )
  }

  async function montar() {
    const caja = document.createElement('div')
    document.body.appendChild(caja)
    const raiz = createRoot(caja)
    await act(async () => {
      raiz.render(
        <I18nProvider>
          <Pagina />
        </I18nProvider>,
      )
    })
    const canon = () => caja.querySelector('[data-testid="canon"]')?.textContent
    const desmontar = async () => {
      await act(async () => raiz.unmount())
      caja.remove()
    }
    return { canon, desmontar }
  }

  it('con el panel en inglés, la plata de un hijo sale estilo EE. UU.; al desmontarse, vuelve el español', async () => {
    window.localStorage.setItem(CLAVE_DEL_IDIOMA_DEL_PANEL, 'en')
    const { canon, desmontar } = await montar()
    expect(canon()).toBe(`$${NB}2,350,000`)
    await desmontar()
    expect(idiomaDeLasCifras()).toBe('es')
  })

  it('en español, como siempre', async () => {
    const { canon, desmontar } = await montar()
    expect(canon()).toBe(`$${NB}2.350.000`)
    await desmontar()
  })
})
