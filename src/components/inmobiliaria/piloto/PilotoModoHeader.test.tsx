/**
 * La píldora del header («Piloto · Copiloto») y su desplegable.
 *
 * Lo que se protege:
 *  1. La píldora dice el modo de la FLOTA que devolvió el micro, y desaparece
 *     (no inventa) cuando el endpoint no existe.
 *  2. Cambiar de modo es UN clic para bajar de autonomía, y una confirmación
 *     para subir a automático (el único cambio con el que el Piloto llama,
 *     escribe y emite recibos sin preguntar).
 *  3. Quien no es admin la ve pero no la mueve; con el Piloto apagado en el
 *     servidor, nadie la mueve y la píldora dice «apagado».
 *  4. Lo «en vivo» se muestra solo cuando hay algo (una llamada en curso).
 *  5. (02-10) El desplegable ancho: tarjetas en un radiogroup con foco
 *     itinerante (las flechas NO eligen), una línea de ayuda que dice el modo
 *     que se mira, «Cada agente» en grilla (una línea si todos van igual; la
 *     casilla distinta, teñida y con su modo) y los que todavía no actúan
 *     solos como chips. En el celular es una hoja que sube desde abajo.
 *  6. (02-10) El movimiento: un solo marco del modo elegido que se muda de
 *     tarjeta, sin parpadeo gris mientras viaja el cambio, y el escalonado
 *     con techo. (`vitest.setup.ts` salta las animaciones de framer: acá se
 *     prueba el estado final, no los cuadros.)
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { estado, setModoMock, toastMock, alternarMock } = vi.hoisted(() => ({
  estado: {
    data: null as unknown,
    isLoading: false,
    notAvailable: false,
    busy: false,
    isAdmin: true,
    movil: false,
  },
  setModoMock: vi.fn(
    async (_modo: string): Promise<{ ok: boolean; error?: string; fallo?: unknown; fallidos?: string[] }> => ({ ok: true }),
  ),
  toastMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
  alternarMock: vi.fn(),
}))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, vars?: Record<string, string>) =>
      vars ? `${k}(${Object.values(vars).join(',')})` : k,
    locale: 'es',
  }),
}))
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({ isAdmin: estado.isAdmin, agencyRole: estado.isAdmin ? 'OWNER' : 'VIEWER' }),
}))
vi.mock('@/lib/hooks/piloto/use-piloto-flota', () => ({
  usePilotoFlota: () => ({
    data: estado.data,
    isLoading: estado.isLoading,
    error: null,
    notAvailable: estado.notAvailable,
    busy: estado.busy,
    setModo: setModoMock,
    refetch: async () => {},
  }),
}))
vi.mock('@/lib/hooks/piloto/piloto-dock-context', () => ({
  usePilotoDock: () => ({ abierto: false, alternar: alternarMock, cerrar: () => {} }),
}))
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => estado.movil }))
vi.mock('sonner', () => ({ toast: toastMock }))
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children?: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))
// El Popover de Radix se monta en un portal; para leerlo se pinta plano.
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children?: React.ReactNode }) => <div data-testid="popover">{children}</div>,
}))
// Igual la hoja del celular (un Dialog de Radix, también en portal).
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SheetTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children, ...props }: { children?: React.ReactNode }) => (
    <div data-testid={(props as Record<string, string>)['data-testid']}>{children}</div>
  ),
  SheetTitle: ({ children }: { children?: React.ReactNode }) => <h2>{children}</h2>,
  SheetDescription: ({ children }: { children?: React.ReactNode }) => <p>{children}</p>,
}))
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild, hideArrow, variant, size, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => {
    void hideArrow; void variant; void size
    if (asChild) return <>{children}</>
    return <button {...(props as object)}>{children}</button>
  },
}))

import { PilotoModoHeader, retrasoEscalonado } from './PilotoModoHeader'
import { PilotoFlotaProvider } from '@/lib/hooks/piloto/piloto-flota-context'
import { falloDelMicro } from '@/lib/api/fallo-del-micro'

const FLOTA = (extra: Record<string, unknown> = {}) => ({
  activo: true,
  modo: 'copiloto',
  agentes: [
    { agente: 'cobranza', modo: 'copiloto', origen: 'piloto', corre: true },
    { agente: 'conciliacion', modo: 'copiloto', origen: 'piloto', corre: true },
  ],
  resumen: { sombra: 0, copiloto: 2, autonomo: 0 },
  enVivo: { llamadas: 0, conciliando: 0, esperando: 0 },
  tomadoAt: '2026-09-02T20:00:00Z',
  ...extra,
})

/** La flota que Nico ve hoy: 9 que actúan en copiloto y 5 que todavía no. */
const FLOTA_COMPLETA = (cambios: Record<string, string> = {}) => {
  const actuan = ['cobranza', 'conciliacion', 'matching', 'retencion', 'contratos', 'facturacion', 'propietarios', 'contabilidad', 'chat']
  const todaviaNo = ['cotizador', 'estudio', 'avaluos', 'calidad', 'mantenimiento']
  const distintos = Object.keys(cambios)
  return FLOTA({
    distintos,
    actuan: actuan.length,
    agentes: [
      ...actuan.map((agente) => ({ agente, modo: cambios[agente] ?? 'copiloto', origen: 'piloto', corre: true, actua: true, gobierna: true })),
      ...todaviaNo.map((agente) => ({ agente, modo: 'copiloto', origen: 'default', corre: true, actua: false, gobierna: false })),
    ],
  })
}

let container: HTMLDivElement
let root: Root

function render() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(
      <PilotoFlotaProvider>
        <PilotoModoHeader />
      </PilotoFlotaProvider>,
    )
  })
}
const q = (sel: string) => container.querySelector(sel)
const qa = (sel: string) => [...container.querySelectorAll(sel)]
const radio = (m: string) => q(`[data-testid="piloto-modo-${m}"]`) as HTMLButtonElement
const contar = (texto: string, aguja: string) => texto.split(aguja).length - 1

beforeEach(() => {
  estado.data = FLOTA()
  estado.isLoading = false
  estado.notAvailable = false
  estado.busy = false
  estado.isAdmin = true
  estado.movil = false
  setModoMock.mockClear()
  setModoMock.mockImplementation(async () => ({ ok: true }))
  toastMock.success.mockClear()
  toastMock.error.mockClear()
  toastMock.warning.mockClear()
  alternarMock.mockClear()
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('PilotoModoHeader', () => {
  it('dice el modo de la flota y marca la opción actual', () => {
    render()
    const pill = q('[data-testid="piloto-modo-header"]')!
    expect(pill.getAttribute('data-modo')).toBe('copiloto')
    expect(pill.textContent).toContain('inmobiliaria.piloto.flota.modo.copiloto')
    expect(radio('copiloto').getAttribute('aria-checked')).toBe('true')
    expect(radio('autonomo').getAttribute('aria-checked')).toBe('false')
    expect(q('[data-testid="piloto-modo-vivo"]')).toBeNull()
  })

  it('sin endpoint no hay píldora: no se inventa un estado', () => {
    estado.data = null
    estado.notAvailable = true
    render()
    expect(q('[data-testid="piloto-modo-header"]')).toBeNull()
  })

  it('bajar de autonomía es un clic; subir a automático pide confirmar', async () => {
    estado.data = FLOTA({ modo: 'autonomo' })
    render()
    await act(async () => {
      radio('sombra').click()
    })
    expect(setModoMock).toHaveBeenCalledWith('sombra')
    expect(toastMock.success).toHaveBeenCalledTimes(1)

    estado.data = FLOTA({ modo: 'copiloto' })
    act(() => root.unmount()); container.remove()
    render()
    await act(async () => {
      radio('autonomo').click()
    })
    // Todavía no se escribió: hay que confirmar.
    expect(setModoMock).toHaveBeenCalledTimes(1)
    expect(q('[data-testid="piloto-modo-confirmar"]')).not.toBeNull()
    // El foco cae en «Cancelar», no en confirmar.
    expect(document.activeElement?.textContent).toBe('inmobiliaria.piloto.flota.cancelar')
    await act(async () => {
      ;(q('[data-testid="piloto-modo-confirmar-si"]') as HTMLButtonElement).click()
    })
    expect(setModoMock).toHaveBeenLastCalledWith('autonomo')
    // El botón que tenía el foco desapareció: el foco vuelve a la tarjeta.
    expect(document.activeElement).toBe(radio('autonomo'))
  })

  it('si el micro no deja cambiar el modo, lo dice (toast de error) y no se queda callado', async () => {
    // Tanda 2 de errores (02-10-2026): antes salía «No se pudo cambiar el
    // modo: 500». Un 5xx dice «de nuestro lado» con la referencia.
    const fallo = await falloDelMicro({ status: 500, json: async () => ({ error: 'boom', requestId: 'a1b2c3d4-9999' }) })
    setModoMock.mockImplementation(async () => ({ ok: false, error: '500', fallo }))
    render()
    await act(async () => {
      radio('sombra').click()
    })
    expect(toastMock.error).toHaveBeenCalledTimes(1)
    const texto = String(toastMock.error.mock.calls[0]![0])
    expect(texto).toContain('No pudimos cambiar el modo del Piloto: algo falló de nuestro lado')
    expect(texto).toContain('a1b2c3d4')
    expect(texto).not.toMatch(/conexi|500/i)
    expect(toastMock.success).not.toHaveBeenCalled()
  })

  it('si el pedido ni salió (status 0) habla de la conexión; un 403 dice el `message`, no el status', async () => {
    const red = new TypeError('Failed to fetch')
    setModoMock.mockImplementation(async () => ({ ok: false, error: red.message, fallo: red }))
    render()
    await act(async () => {
      radio('sombra').click()
    })
    expect(String(toastMock.error.mock.calls[0]![0])).toMatch(/conexión/)

    const prohibido = await falloDelMicro({
      status: 403,
      json: async () => ({ code: 'SOLO_ADMINISTRADOR', message: 'Sólo un administrador mueve la flota.' }),
    })
    setModoMock.mockImplementation(async () => ({ ok: false, error: '403', fallo: prohibido }))
    await act(async () => {
      radio('sombra').click()
    })
    expect(toastMock.error).toHaveBeenLastCalledWith('Sólo un administrador mueve la flota.')
  })

  it('quien no es admin ve el modo pero las otras opciones no se ofrecen (y un clic no mueve nada)', async () => {
    estado.isAdmin = false
    render()
    expect(q('[data-testid="piloto-modo-header"]')).not.toBeNull()
    // `aria-disabled` y no `disabled`: se enfoca y se lee qué hace, no se elige.
    expect(radio('autonomo').getAttribute('aria-disabled')).toBe('true')
    expect(radio('copiloto').getAttribute('aria-disabled')).toBeNull() // la actual
    await act(async () => {
      radio('sombra').click()
    })
    expect(setModoMock).not.toHaveBeenCalled()
    expect(container.textContent).toContain('inmobiliaria.piloto.autonomia.soloAdmin')
  })

  it('con el Piloto apagado en el servidor la píldora dice «apagado» y no se mueve', async () => {
    estado.data = FLOTA({ activo: false })
    render()
    expect(q('[data-testid="piloto-modo-header"]')?.textContent).toContain('inmobiliaria.piloto.flota.apagado')
    expect(radio('sombra').getAttribute('aria-disabled')).toBe('true')
    expect(container.textContent).toContain('inmobiliaria.piloto.flota.apagadoHint')
    await act(async () => {
      radio('sombra').click()
    })
    expect(setModoMock).not.toHaveBeenCalled()
    // Apagado no se listan agentes: no corren.
    expect(q('[data-testid="piloto-modo-por-agente"]')).toBeNull()
  })

  it('cargando: la píldora no dice un modo, el desplegable dice que lee y nada se elige', () => {
    estado.data = null
    estado.isLoading = true
    render()
    const pill = q('[data-testid="piloto-modo-header"]')!
    expect(pill.getAttribute('data-modo')).toBe('cargando')
    expect(container.textContent).toContain('inmobiliaria.piloto.flota.cargando')
    expect(qa('[role="radio"][aria-checked="true"]')).toHaveLength(0)
    expect(radio('sombra').getAttribute('aria-disabled')).toBe('true')
    expect(q('[data-testid="piloto-modo-esqueleto"]')).not.toBeNull()
    // Sin datos no hay línea de ayuda que hable de un modo «actual».
    expect(q('[data-testid="piloto-modo-ayuda"]')).toBeNull()
  })

  it('con una llamada en curso, la píldora lo muestra y el desplegable lo lista', () => {
    estado.data = FLOTA({ enVivo: { llamadas: 1, conciliando: 0, esperando: 2 } })
    render()
    expect(q('[data-testid="piloto-modo-vivo"]')?.textContent).toContain('1')
    const ahora = q('[data-testid="piloto-modo-ahora"]')!
    expect(ahora.textContent).toContain('inmobiliaria.piloto.flota.llamadas(1)')
    expect(ahora.textContent).toContain('inmobiliaria.piloto.flota.esperando(2)')
  })

  it('🔴 P-1: nunca «Mixto» — dice el modo de la mayoría, cuántos difieren, y al abrirla el modo de cada uno', () => {
    estado.data = FLOTA({
      modo: 'copiloto',
      distintos: ['cobranza'],
      actuan: 2,
      agentes: [
        { agente: 'cobranza', modo: 'autonomo', origen: 'piloto', corre: true, actua: true, gobierna: true },
        { agente: 'conciliacion', modo: 'copiloto', origen: 'piloto', corre: true, actua: true, gobierna: true },
        { agente: 'cotizador', modo: 'copiloto', origen: 'default', corre: true, actua: false, gobierna: false },
      ],
    })
    render()
    expect(container.textContent).not.toMatch(/mixto/i)
    expect(q('[data-testid="piloto-modo-distintos"]')?.textContent).toContain(
      'inmobiliaria.piloto.flota.distintosCorto(1)',
    )
    const porAgente = q('[data-testid="piloto-modo-por-agente"]')?.textContent ?? ''
    expect(porAgente).toContain('inmobiliaria.piloto.flota.modo.autonomo')
    expect(porAgente).toContain('inmobiliaria.piloto.flota.modo.copiloto')
    // Los que todavía no actúan solos se nombran aparte.
    expect(q('[data-testid="piloto-modo-todavia-no"]')).not.toBeNull()
    // 🔴 No dice «2 actúan con este modo» cuando uno de los dos está en otro.
    expect(container.textContent).not.toContain('inmobiliaria.piloto.flota.corriendo(2)')
    expect(container.textContent).toContain('inmobiliaria.piloto.flota.corriendoConDistintos(2,1,1)')
  })

  it('🔴 «N agentes actúan»: cuenta los que de verdad actúan, no los apagados en el servidor', () => {
    estado.data = FLOTA({
      actuan: 1,
      agentes: [
        { agente: 'cobranza', modo: 'copiloto', origen: 'piloto', corre: true, actua: true, gobierna: true },
        { agente: 'pagos', modo: 'copiloto', origen: 'default', corre: false, actua: false, gobierna: true },
      ],
    })
    render()
    expect(container.textContent).toContain('inmobiliaria.piloto.flota.corriendo(1)')
  })
})

describe('el desplegable ancho (02-10)', () => {
  it('todos iguales: lo dice en una línea y no repite el modo por cada agente', () => {
    estado.data = FLOTA_COMPLETA()
    render()
    const seccion = q('[data-testid="piloto-modo-por-agente"]')!
    expect(q('[data-testid="piloto-modo-todos-igual"]')?.textContent).toBe(
      'inmobiliaria.piloto.flota.todosIgual(inmobiliaria.piloto.flota.modo.copiloto)',
    )
    // Los nueve nombres, ningún «Copiloto» al lado de cada uno.
    expect(seccion.querySelectorAll('li[data-agente]')).toHaveLength(9)
    expect(contar(seccion.textContent ?? '', 'inmobiliaria.piloto.flota.modo.copiloto')).toBe(1)
    expect(seccion.querySelector('[data-distinto]')).toBeNull()
  })

  it('algunos con otro modo: la grilla los tiñe y dice su modo (texto, no sólo color), sin reordenar', () => {
    estado.data = FLOTA_COMPLETA({ cobranza: 'autonomo', contratos: 'sombra' })
    render()
    const seccion = q('[data-testid="piloto-modo-por-agente"]')!
    expect(q('[data-testid="piloto-modo-todos-igual"]')).toBeNull()
    // La leyenda explica el teñido.
    expect(q('[data-testid="piloto-modo-leyenda"]')?.textContent).toBe('inmobiliaria.piloto.flota.otroModo')
    const casillas = [...seccion.querySelectorAll('li[data-agente]')]
    // El orden del micro: cambiar de modo no hace saltar casillas.
    expect(casillas.map((li) => li.getAttribute('data-agente'))).toEqual([
      'cobranza', 'conciliacion', 'matching', 'retencion', 'contratos', 'facturacion', 'propietarios', 'contabilidad', 'chat',
    ])
    const distintas = casillas.filter((li) => li.hasAttribute('data-distinto'))
    expect(distintas.map((li) => li.getAttribute('data-agente'))).toEqual(['cobranza', 'contratos'])
    expect(seccion.querySelector('li[data-agente="cobranza"]')?.textContent).toContain('inmobiliaria.piloto.flota.modo.autonomo')
    expect(seccion.querySelector('li[data-agente="contratos"]')?.textContent).toContain('inmobiliaria.piloto.flota.modo.sombra')
    // Las del modo general no lo repiten a la vista; el lector de pantalla sí lo oye.
    const conciliacion = seccion.querySelector('li[data-agente="conciliacion"]')!
    expect(conciliacion.querySelector('.sr-only')?.textContent).toBe(', inmobiliaria.piloto.flota.modo.copiloto')
    expect(conciliacion.querySelectorAll('span.block')).toHaveLength(1)
  })

  it('con un micro viejo que dice «mixto» no hay modo general: cada casilla dice el suyo y ninguna se tiñe', () => {
    estado.data = FLOTA_COMPLETA({ cobranza: 'autonomo' })
    ;(estado.data as { modo: string }).modo = 'mixto'
    render()
    const seccion = q('[data-testid="piloto-modo-por-agente"]')!
    expect(seccion.querySelector('[data-distinto]')).toBeNull()
    expect(q('[data-testid="piloto-modo-leyenda"]')).toBeNull()
    expect(seccion.querySelector('li[data-agente="matching"]')?.textContent).toContain('inmobiliaria.piloto.flota.modo.copiloto')
    expect(qa('[data-testid="piloto-modo-marco"]')).toHaveLength(0)
  })

  it('«Todavía no actúan solos» son chips con una nota corta, no un párrafo con la lista', () => {
    estado.data = FLOTA_COMPLETA()
    render()
    const seccion = q('[data-testid="piloto-modo-todavia-no"]')!
    expect(seccion.textContent).toContain('inmobiliaria.piloto.flota.todaviaNoTitulo')
    expect(seccion.textContent).toContain('inmobiliaria.piloto.flota.todaviaNoNota')
    expect([...seccion.querySelectorAll('li[data-agente]')].map((li) => li.getAttribute('data-agente'))).toEqual([
      'cotizador', 'estudio', 'avaluos', 'calidad', 'mantenimiento',
    ])
  })

  it('la línea de ayuda dice el modo actual y cambia al pasar el cursor o enfocar otro', () => {
    render()
    const ayuda = () => q('[data-testid="piloto-modo-ayuda"]')
    // Los tres textos viven en la misma celda (la caja no cambia de alto);
    // se ve el marcado `data-activo`.
    const visible = () => ayuda()?.querySelector('[data-activo]')?.textContent
    expect(ayuda()?.getAttribute('data-modo')).toBe('copiloto')
    expect(visible()).toContain('inmobiliaria.piloto.flota.que.copiloto')
    expect(ayuda()?.querySelectorAll('[data-activo]')).toHaveLength(1)
    act(() => {
      radio('autonomo').dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body }))
    })
    expect(ayuda()?.getAttribute('data-modo')).toBe('autonomo')
    expect(visible()).toContain('inmobiliaria.piloto.flota.que.autonomo')
    act(() => {
      radio('sombra').focus()
    })
    expect(ayuda()?.getAttribute('data-modo')).toBe('sombra')
    expect(visible()).toContain('inmobiliaria.piloto.flota.que.sombra')
    // Cada opción lleva su detalle completo como descripción accesible.
    const desc = document.getElementById(radio('sombra').getAttribute('aria-describedby')!)
    expect(desc?.textContent).toBe('inmobiliaria.piloto.flota.que.sombra')
  })

  it('teclado: foco itinerante; las flechas mueven el foco sin mover la flota; Enter elige', async () => {
    render()
    expect(radio('copiloto').tabIndex).toBe(0)
    expect(radio('sombra').tabIndex).toBe(-1)
    expect(radio('autonomo').tabIndex).toBe(-1)
    act(() => radio('copiloto').focus())
    act(() => {
      radio('copiloto').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    })
    expect(document.activeElement).toBe(radio('autonomo'))
    act(() => {
      radio('autonomo').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    })
    expect(document.activeElement).toBe(radio('sombra'))
    act(() => {
      radio('sombra').dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    })
    expect(document.activeElement).toBe(radio('autonomo'))
    expect(setModoMock).not.toHaveBeenCalled()
    // Enter/espacio en un <button> es un clic.
    await act(async () => {
      radio('sombra').click()
    })
    expect(setModoMock).toHaveBeenCalledWith('sombra')
  })

  it('«Ver procesos» abre el tray del Piloto y «Por agente» lleva a la página del Piloto', () => {
    render()
    act(() => {
      ;(q('[data-testid="piloto-modo-procesos"]') as HTMLButtonElement).click()
    })
    expect(alternarMock).toHaveBeenCalledTimes(1)
    expect(q('[data-testid="piloto-modo-por-agente-link"]')?.getAttribute('href')).toBe('/panel/inmobiliaria/piloto')
  })

  it('en el celular es una hoja que sube desde abajo, con lo mismo adentro', () => {
    estado.movil = true
    estado.data = FLOTA_COMPLETA({ cobranza: 'autonomo' })
    render()
    const hoja = q('[data-testid="piloto-modo-hoja"]')!
    expect(hoja).not.toBeNull()
    expect(q('[data-testid="popover"]')).toBeNull()
    expect(hoja.querySelector('h2')?.textContent).toBe('inmobiliaria.piloto.titulo')
    expect(hoja.querySelectorAll('[role="radio"]')).toHaveLength(3)
    expect(hoja.querySelector('[data-testid="piloto-modo-por-agente"] [data-distinto]')).not.toBeNull()
    // El asa la pone el Sheet de Cadence: acá no se dibuja otra.
    expect(hoja.querySelector('.h-1.w-10')).toBeNull()
  })
})

describe('el movimiento (02-10)', () => {
  const rerender = () =>
    act(() => {
      root.render(
        <PilotoFlotaProvider>
          <PilotoModoHeader />
        </PilotoFlotaProvider>,
      )
    })

  it('el marco del modo elegido es UNO solo y vive en la tarjeta actual; al cambiar de modo, se muda', () => {
    render()
    const marcos = () => qa('[data-testid="piloto-modo-marco"]')
    expect(marcos()).toHaveLength(1)
    expect(radio('copiloto').contains(marcos()[0]!)).toBe(true)
    // Lo que hace el optimista de `setModo`: la flota ya dice el modo nuevo.
    estado.data = FLOTA({ modo: 'sombra', agentes: [{ agente: 'cobranza', modo: 'sombra', origen: 'piloto', corre: true }] })
    rerender()
    expect(marcos()).toHaveLength(1)
    expect(radio('sombra').contains(marcos()[0]!)).toBe(true)
    expect(radio('sombra').getAttribute('aria-checked')).toBe('true')
  })

  it('mientras viaja un cambio las otras tarjetas no se eligen, pero tampoco se apagan a la vista', async () => {
    estado.busy = true
    render()
    // Para el lector: no se ofrecen ahora.
    expect(radio('sombra').getAttribute('aria-disabled')).toBe('true')
    // A la vista: sin el gris de «no disponible» (se leía como error).
    expect(radio('sombra').hasAttribute('data-apagada')).toBe(false)
    await act(async () => {
      radio('sombra').click()
    })
    expect(setModoMock).not.toHaveBeenCalled()
  })

  it('quien no puede elegir sí ve las otras tarjetas apagadas', () => {
    estado.isAdmin = false
    render()
    expect(radio('sombra').hasAttribute('data-apagada')).toBe(true)
    expect(radio('autonomo').hasAttribute('data-apagada')).toBe(true)
    // La actual nunca se apaga.
    expect(radio('copiloto').hasAttribute('data-apagada')).toBe(false)
  })

  it('el escalonado: 40 ms entre ítems y el último nunca espera más de 320 ms', () => {
    expect([0, 1, 2].map((i) => retrasoEscalonado(i, 3))).toEqual([0, 0.04, 0.08])
    // Nueve casillas que arrancan a los 120 ms: el paso se achica solo.
    expect(retrasoEscalonado(8, 9, 0.12)).toBeCloseTo(0.32)
    expect(retrasoEscalonado(199, 200)).toBeCloseTo(0.32)
    expect(retrasoEscalonado(0, 1, 0.2)).toBe(0.2)
  })
})
