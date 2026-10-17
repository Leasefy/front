/**
 * El botón «Translate» (Nico, 16-10-2026, la recomendada): lo que escribieron
 * las personas se ve tal como lo escribieron; un clic lo traduce todo en un
 * pedido; «Show original» vuelve sin borrar lo traducido (no se paga dos veces).
 */
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const H = vi.hoisted(() => ({ locale: 'en' as 'es' | 'en', llamadas: [] as string[][] }))

vi.mock('@/lib/i18n/use-tr', async (orig) => {
  const real = await orig<typeof import('@/lib/i18n/use-tr')>()
  return {
    ...real,
    useLocaleDelPanel: () => H.locale,
    useTr: () => (es: string, vars?: Record<string, string | number>) => real.traducir(es, H.locale, vars),
  }
})
vi.mock('@/lib/api/traducir', () => ({
  traducirAlIngles: async (_agencyId: string, textos: string[]) => {
    H.llamadas.push([...textos])
    return { traducciones: textos.map((t) => (t === 'Mañana le pago' ? "I'll pay tomorrow" : t)), traducidos: 1 }
  },
}))

import { AuthContext } from '@/lib/auth/auth-context'
import { useTraducirMensajes } from '@/lib/i18n/use-traducir-mensajes'
import { BotonTraducirLaConversacion, MarcaDeTraducido } from './BotonTraducirLaConversacion'

const MENSAJES = [
  { id: 'm1', texto: 'Mañana le pago' },
  { id: 'm2', texto: '' },
]

function Hilo() {
  const traduccion = useTraducirMensajes(MENSAJES)
  return (
    <div>
      {MENSAJES.map((m) => (
        <p key={m.id} data-testid={m.id}>
          {traduccion.textoDe(m.id, m.texto)}
          {traduccion.estaTraducido(m.id, m.texto) ? <MarcaDeTraducido /> : null}
        </p>
      ))}
      <BotonTraducirLaConversacion traduccion={traduccion} />
    </div>
  )
}

let contenedor: HTMLDivElement
let root: Root
beforeEach(() => {
  H.locale = 'en'
  H.llamadas = []
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})
afterEach(() => {
  act(() => root.unmount())
  contenedor.remove()
})

async function pintar(conAgencia = true) {
  const auth = (conAgencia ? { agency: { id: 'ag-1' } } : { agency: null }) as unknown as React.ContextType<typeof AuthContext>
  await act(async () => {
    root.render(
      <AuthContext.Provider value={auth}>
        <Hilo />
      </AuthContext.Provider>,
    )
  })
}

const boton = () => contenedor.querySelector<HTMLButtonElement>('[data-testid="traducir-la-conversacion"]')
const clic = async () => {
  await act(async () => {
    boton()!.click()
    for (let i = 0; i < 5; i++) await Promise.resolve()
  })
}

describe('«Translate» de una conversación', () => {
  it('se ve tal como lo escribieron hasta que se pide; un pedido traduce el hilo', async () => {
    await pintar()
    expect(contenedor.querySelector('[data-testid="m1"]')!.textContent).toBe('Mañana le pago')
    expect(boton()!.textContent).toContain('Translate')
    await clic()
    expect(contenedor.querySelector('[data-testid="m1"]')!.textContent).toBe("I'll pay tomorrowTranslated")
    // El mensaje vacío no viaja.
    expect(H.llamadas).toEqual([['Mañana le pago']])
    expect(boton()!.textContent).toContain('Show original')
  })

  it('«Show original» vuelve, y traducir otra vez no vuelve a pedir', async () => {
    await pintar()
    await clic()
    await clic()
    expect(contenedor.querySelector('[data-testid="m1"]')!.textContent).toBe('Mañana le pago')
    await clic()
    expect(contenedor.querySelector('[data-testid="m1"]')!.textContent).toBe("I'll pay tomorrowTranslated")
    expect(H.llamadas.length).toBe(1)
  })

  it('con el panel en español, o fuera de una inmobiliaria, no hay botón', async () => {
    H.locale = 'es'
    await pintar()
    expect(boton()).toBeNull()
    H.locale = 'en'
    await pintar(false)
    expect(boton()).toBeNull()
  })
})
