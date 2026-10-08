/**
 * La Bandeja del Piloto (auditoría del Piloto, 23-09-2026). Lo que se fija:
 *
 *  1. **Un solo camino.** Si la acción PREGUNTA algo (campos o una
 *     advertencia), el botón de la fila no ejecuta: abre el cajón con esa
 *     acción lista. Antes «Registrar el envío» salía sin datos (400) y
 *     «Aprobar y llamar» sin la advertencia (hallazgo 9).
 *  2. **P-9.** Si el micro dice que ESTE rol no puede (`permitida: false`),
 *     el botón se ve apagado y el porqué se lee debajo — no un botón que
 *     termina en 403 (hallazgo 10).
 *  3. **El total es el real.** «100 en total» era el tope de la consulta:
 *     con el total del micro dice «Mostrando 100 de 446» (hallazgo 6).
 *  4. **El toast dice lo que pasó** («programé la llamada para mañana a las
 *     8:00»), no «listo» (hallazgo 2).
 *  5. **Cada bloque dice qué es** (EL MOLDE, regla 6).
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { estado } = vi.hoisted(() => ({
  estado: {
    corridas: [] as unknown[],
    respuesta: { ok: true, mensaje: 'Aprobada: Laura llama a Ana en cuanto el marcador tome el turno.' } as {
      ok: boolean
      mensaje?: string
      error?: string
      fallo?: unknown
    },
    toasts: [] as string[],
  },
}))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, vars?: Record<string, string>) => (vars ? `${k}(${Object.values(vars).join(',')})` : k),
    locale: 'es',
  }),
}))
vi.mock('sonner', () => ({
  toast: {
    success: (m: string) => estado.toasts.push(m),
    error: (m: string) => estado.toasts.push(m),
  },
}))
vi.mock('@/lib/api/piloto', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/piloto')>('@/lib/api/piloto')
  return {
    ...real,
    runInboxAccion: async (accion: unknown) => {
      estado.corridas.push(accion)
      return estado.respuesta
    },
  }
})
vi.mock('@/components/inmobiliaria/ai/ColaHumana', () => ({ relativeTime: () => 'hace 2 h' }))
vi.mock('@/lib/format', () => ({ formatCurrency: (n: number) => `$${n}` }))

import { PilotoBandeja } from './PilotoBandeja'
import type { InboxItem } from '@/lib/api/piloto'
import { falloDelMicro } from '@/lib/api/fallo-del-micro'

/** Lo que `runInboxAccion` devuelve cuando el micro contesta mal: `fallo` sale del sobre. */
async function noSalio(status: number, cuerpo: Record<string, unknown>) {
  const fallo = await falloDelMicro({ status, json: async () => cuerpo })
  return { ok: false, error: typeof cuerpo.error === 'string' ? cuerpo.error : String(status), fallo }
}

const base = (extra: Partial<InboxItem> = {}): InboxItem => ({
  id: 'hold:r-1',
  fuente: 'retenido',
  agente: 'cobranza',
  prioridad: 'media',
  titulo: 'Llamar a Ana María Gómez',
  resumen: '22 días de mora · debe $1.430.502 hoy (1 cuota) · retenida en Copiloto.',
  desde: '2026-09-20T10:00:00.000-05:00',
  href: '/panel/inmobiliaria/piloto',
  ...extra,
})

let container: HTMLDivElement
let root: Root

function render(props: Partial<React.ComponentProps<typeof PilotoBandeja>> & { items: InboxItem[] }) {
  const onAbrir = vi.fn()
  const onRefetch = vi.fn(async () => {})
  act(() => {
    root.render(
      <PilotoBandeja isLoading={false} error={null} onRefetch={onRefetch} onAbrir={onAbrir} {...props} />,
    )
  })
  return { onAbrir, onRefetch }
}

beforeEach(() => {
  estado.corridas = []
  estado.toasts = []
  estado.respuesta = { ok: true, mensaje: 'Aprobada: Laura llama a Ana en cuanto el marcador tome el turno.' }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const boton = (id: string) =>
  container.querySelector(`[data-testid="piloto-bandeja-accion-${id}"]`) as HTMLButtonElement | null

describe('PilotoBandeja', () => {
  it('🔴 la fuente calidad se llama «Niti · calidad» en su chip (niti-spec.md: nombre visible)', () => {
    render({
      items: [
        base({ id: 'c-1', fuente: 'calidad', agente: 'calidad', accion: undefined }),
        base({ id: 'r-1' }),
      ],
    })
    expect(container.querySelector('[data-testid="piloto-chip-calidad"]')?.textContent).toContain('Niti · calidad')
  })

  it('🔴 una acción con advertencia NO se ejecuta desde la fila: abre el cajón con esa acción lista', async () => {
    const item = base({
      accion: {
        label: 'Aprobar y llamar',
        method: 'POST',
        path: '/api/agency/a/ai-hub/retenidos/r-1/aprobar',
        body: {},
        confirmacion: 'Laura va a llamar a Ana María Gómez, que debe $1.430.502 hoy.',
      },
    })
    const { onAbrir } = render({ items: [item] })
    await act(async () => boton(item.id)!.click())
    expect(estado.corridas).toHaveLength(0)
    expect(onAbrir).toHaveBeenCalledWith('hold:r-1', 'Aprobar y llamar')
  })

  it('🔴 una acción con campos (registrar el envío a centrales) tampoco se salta el formulario', async () => {
    const item = base({
      id: 'aviso:1',
      fuente: 'aviso_centrales',
      accion: {
        label: 'Registrar el envío',
        method: 'POST',
        path: '/x',
        campos: [{ id: 'canal', label: '¿Por dónde salió?', tipo: 'opcion', requerido: true }],
      },
    })
    const { onAbrir } = render({ items: [item] })
    await act(async () => boton(item.id)!.click())
    expect(estado.corridas).toHaveLength(0)
    expect(onAbrir).toHaveBeenCalledWith('aviso:1', 'Registrar el envío')
  })

  it('una acción de un clic sin advertencia se ejecuta y el toast dice lo que pasó (no «listo»)', async () => {
    const item = base({
      id: 'esc:1',
      fuente: 'escalacion',
      accion: { label: 'Tomar el caso', method: 'POST', path: '/claim', body: {} },
    })
    render({ items: [item] })
    await act(async () => boton(item.id)!.click())
    expect(estado.corridas).toHaveLength(1)
    expect(estado.toasts[0]).toBe('Aprobada: Laura llama a Ana en cuanto el marcador tome el turno.')
  })

  it('🔴 P-9: si el micro dice que este rol no puede, el botón se ve apagado y el porqué se lee', () => {
    const item = base({
      accion: {
        label: 'Aprobar y llamar',
        method: 'POST',
        path: '/x',
        confirmacion: 'x',
        permitida: false,
        porQueNo: 'Sólo un administrador de la inmobiliaria puede decidir esto.',
      },
    })
    render({ items: [item] })
    expect(boton(item.id)!.disabled).toBe(true)
    expect(container.querySelector(`[data-testid="piloto-bandeja-porqueno-${item.id}"]`)?.textContent).toContain(
      'Sólo un administrador',
    )
  })

  it('🔴 el total es el real: con más decisiones de las que caben dice «Mostrando N de M»', () => {
    render({ items: [base(), base({ id: 'hold:r-2' })], total: 446 })
    expect(container.textContent).toContain('inmobiliaria.piloto.bandeja.contadorParcial(2,446)')
  })

  it('dice qué es el bloque (EL MOLDE, regla 6)', () => {
    render({ items: [base()] })
    expect(container.textContent).toContain('inmobiliaria.piloto.bandeja.queEs')
  })
})

/*
 * Tanda 2 de errores (02-10-2026): el toast de una acción que no salió decía
 * «No se pudo: 500» o el código del micro («No se pudo: not_found»). Ahora
 * pasa por el traductor con la regla de oro.
 */
describe('PilotoBandeja — una acción que no sale', () => {
  const unClic = () =>
    base({
      id: 'esc:9',
      fuente: 'escalacion',
      accion: { label: 'Tomar el caso', method: 'POST', path: '/claim', body: {} },
    })

  it('un 5xx dice «de nuestro lado» con la referencia, sin culpar a la conexión ni mostrar el status', async () => {
    estado.respuesta = await noSalio(500, { error: 'Internal Server Error', requestId: 'abcdef12-3456-7890' })
    render({ items: [unClic()] })
    await act(async () => boton('esc:9')!.click())
    expect(estado.toasts).toHaveLength(1)
    expect(estado.toasts[0]).toContain('No pudimos tomar el caso: algo falló de nuestro lado')
    expect(estado.toasts[0]).toContain('abcdef12')
    expect(estado.toasts[0]).not.toMatch(/conexi|500/i)
  })

  it('si el pedido ni salió (status 0) habla de la conexión', async () => {
    const red = new TypeError('Failed to fetch')
    estado.respuesta = { ok: false, error: red.message, fallo: red }
    render({ items: [unClic()] })
    await act(async () => boton('esc:9')!.click())
    expect(estado.toasts[0]).toMatch(/conexión/)
    expect(estado.toasts[0]).not.toContain('Failed to fetch')
  })

  it('un 4xx dice el `message` del micro, nunca el código ni el status', async () => {
    estado.respuesta = await noSalio(409, {
      statusCode: 409,
      code: 'CASO_YA_TOMADO',
      message: 'Otra persona ya tomó este caso.',
      error: 'CASO_YA_TOMADO',
    })
    render({ items: [unClic()] })
    await act(async () => boton('esc:9')!.click())
    expect(estado.toasts[0]).toBe('Otra persona ya tomó este caso.')
  })

  it('un 4xx sin nada legible (el `error` en inglés del cuerpo viejo) dice qué no se pudo, no «403»', async () => {
    estado.respuesta = await noSalio(403, { error: 'Forbidden — no membership row' })
    render({ items: [unClic()] })
    await act(async () => boton('esc:9')!.click())
    expect(estado.toasts[0]).toBe('No se pudo tomar el caso.')
  })
})

/*
 * Fase 1 del director (28-09-2026, director-api-front.md «Bandeja»): la fila
 * dice por qué la pidió el director y a qué meta apunta, y SIEMPRE el motivo
 * de la perilla — que se guardaba NOT NULL y ninguna pantalla pintaba.
 */
describe('PilotoBandeja — el director', () => {
  const delDirector = (id: string, prioridad: number, desde: string): InboxItem =>
    base({
      id,
      desde,
      director: {
        prioridad,
        porQue: `Prioridad ${prioridad}: vence mañana.`,
        evidencia: [{ tipo: 'deteccion', ref: 'r', texto: 'Cuota vencida', enlace: null }],
        meta: { id: 'm-1', metrica: 'recaudo_a_tiempo', nombre: 'Recaudo a tiempo' },
        alternativaDescartada: null,
      },
      motivo: 'Fase 1 del director: toda orden del director espera tu clic.',
    })

  const filas = () =>
    [...container.querySelectorAll('[data-testid^="piloto-bandeja-fila-"]')].map((b) =>
      b.getAttribute('data-testid')!.replace('piloto-bandeja-fila-', ''),
    )

  it('la fila del director dice su por qué y su meta', () => {
    render({ items: [delDirector('acc:1', 80, '2026-09-28T10:00:00.000-05:00')] })
    const d = container.querySelector('[data-testid="piloto-bandeja-director-acc:1"]')
    expect(d?.textContent).toContain('Prioridad 80: vence mañana.')
    expect(d?.textContent).toContain('inmobiliaria.piloto.director.porQue.meta(Recaudo a tiempo)')
  })

  it('🔴 el motivo de la perilla se lee SIEMPRE que venga, también en filas que no son del director', () => {
    render({
      items: [
        delDirector('acc:1', 80, '2026-09-28T10:00:00.000-05:00'),
        base({ id: 'acc:2', motivo: 'Copiloto: espera tu clic antes de enviar.' }),
      ],
    })
    expect(container.querySelector('[data-testid="piloto-bandeja-motivo-acc:1"]')?.textContent).toContain(
      'Fase 1 del director: toda orden del director espera tu clic.',
    )
    expect(container.querySelector('[data-testid="piloto-bandeja-motivo-acc:2"]')?.textContent).toContain(
      'Copiloto: espera tu clic antes de enviar.',
    )
    expect(container.querySelector('[data-testid="piloto-bandeja-director-acc:2"]')).toBeNull()
  })

  it('🔴 04-10 noche: si el resumen ES el motivo, la fila lo dice UNA sola vez (antes salía dos veces)', () => {
    const motivo = 'Copiloto: queda listo en tu Bandeja y sale con tu clic.'
    render({ items: [base({ id: 'acc:9', resumen: motivo, motivo })] })
    const fila = container.querySelector('[data-testid="piloto-bandeja-fila-acc:9"]')!.closest('li')!
    expect(fila.textContent!.split(motivo).length - 1).toBe(1)
    expect(container.querySelector('[data-testid="piloto-bandeja-resumen-acc:9"]')).toBeNull()
    expect(container.querySelector('[data-testid="piloto-bandeja-motivo-acc:9"]')?.textContent).toContain(motivo)
  })

  it('con un resumen distinto del motivo se leen los dos', () => {
    render({ items: [base({ id: 'acc:8', resumen: 'Contrato #12 · vence en 80 días', motivo: 'Copiloto: espera tu clic.' })] })
    expect(container.querySelector('[data-testid="piloto-bandeja-resumen-acc:8"]')?.textContent).toContain('Contrato #12')
    expect(container.querySelector('[data-testid="piloto-bandeja-motivo-acc:8"]')?.textContent).toContain('Copiloto: espera tu clic.')
  })

  it('ordena primero lo del director (de mayor a menor prioridad) y después quien más espera', () => {
    render({
      items: [
        base({ id: 'viejo', desde: '2026-09-01T10:00:00.000-05:00' }),
        delDirector('dir-40', 40, '2026-09-28T10:00:00.000-05:00'),
        base({ id: 'nuevo', desde: '2026-09-27T10:00:00.000-05:00' }),
        delDirector('dir-80', 80, '2026-09-28T11:00:00.000-05:00'),
      ],
    })
    expect(filas()).toEqual(['dir-80', 'dir-40', 'viejo', 'nuevo'])
  })

  it('un `director` a medias (sin porQue) no pinta nada ni rompe la fila', () => {
    render({ items: [base({ id: 'acc:3', director: { prioridad: 10 } as never })] })
    expect(container.querySelector('[data-testid="piloto-bandeja-director-acc:3"]')).toBeNull()
    expect(filas()).toEqual(['acc:3'])
  })
})
