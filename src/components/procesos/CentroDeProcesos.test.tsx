/**
 * El CENTRO DE PROCESOS (Nico, 22-09-2026): el botón de la barra de arriba, su
 * panel, la fila de un proceso y el historial.
 *
 * Lo que se protege:
 *  1. Quieto, el botón es un ícono más: sin anillo ni número. Con algo en
 *     curso, anillo + cuántos van — y el nombre accesible lo dice.
 *  2. Cada estado se dice en palabras: «En curso» con «120 de 800» y su barra,
 *     «Listo» con «Descargar», «Falló» con el porqué, «Se interrumpió».
 *  3. «Descargar» firma la URL en el back y navega a ella; «Cancelar» sólo
 *     aparece si el back dice que se puede.
 *  4. Sin la migración del back, el panel dice por qué está vacío.
 *  5. El historial: la frase dice de quién son; el filtro por persona es sólo
 *     del administrador.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import type { ListaDeProcesos, Proceso } from '@/lib/api/procesos.types'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() } }))
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children?: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))
// El Popover de Radix se monta en un portal; para leerlo se pinta plano.
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children, open }: { children?: React.ReactNode; open?: boolean }) => (
    <div data-testid="popover-raiz" data-open={open ? '1' : '0'}>
      {children}
    </div>
  ),
  PopoverTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children?: React.ReactNode }) => <div data-testid="popover">{children}</div>,
}))
const { bus, toastMock, reprocesarMock } = vi.hoisted(() => ({
  bus: new Set<(e: Record<string, unknown>) => void>(),
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  reprocesarMock: vi.fn(),
}))
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }))
vi.mock('@/lib/api/contabilidad.service', () => ({
  contabilidadApi: { asientos: { reprocesar: reprocesarMock } },
}))
vi.mock('@/lib/api/procesos.service', () => ({
  RECURSO_DE_PROCESOS: 'procesos',
  RECURSO_LOTE: 'LOTE_DE_DISPERSION',
  anunciarProceso: (a: Record<string, unknown> = {}) => bus.forEach((cb) => cb({ tipo: 'anuncio', ...a })),
  abrirCentroDeProcesos: (a: Record<string, unknown> = {}) => bus.forEach((cb) => cb({ tipo: 'abrir', ...a })),
  alEventoDelCentro: (cb: (e: Record<string, unknown>) => void) => {
    bus.add(cb)
    return () => bus.delete(cb)
  },
  procesosApi: {
    listar: vi.fn(),
    descarga: vi.fn(),
    cancelar: vi.fn(),
  },
}))

import { procesosApi, anunciarProceso } from '@/lib/api/procesos.service'
import { BotonDelCentroDeProcesos, resumenDelCentro } from './BotonDelCentroDeProcesos'
import { FilaDeProceso } from './FilaDeProceso'
import { HistorialDeProcesos, fraseDelHistorial } from './HistorialDeProcesos'

const AHORA = Date.parse('2026-09-22T20:00:00.000Z')

function proceso(extra: Partial<Proceso> = {}): Proceso {
  return {
    id: 'p-1',
    tipo: 'EMISION_DE_FACTURAS',
    titulo: 'Emitir las facturas de Septiembre de 2026',
    estado: 'CORRIENDO',
    hechos: 120,
    total: 800,
    porcentaje: 15,
    mensaje: null,
    lanzadoPor: { id: 'u-ana', nombre: 'Ana Pérez', rol: 'CONTADOR' },
    esMio: false,
    recurso: null,
    archivo: null,
    sePuedeCancelar: false,
    cancelacionPedida: false,
    interrumpido: false,
    createdAt: '2026-09-22T19:57:00.000Z',
    iniciadoAt: '2026-09-22T19:57:00.000Z',
    terminadoAt: null,
    actualizadoAt: '2026-09-22T19:59:50.000Z',
    ...extra,
  }
}

const TERMINADO_CON_ARCHIVO = proceso({
  id: 'p-2',
  tipo: 'ARCHIVO_DEL_LOTE',
  titulo: 'Archivo del lote de Septiembre de 2026 · Bancolombia',
  estado: 'TERMINADO',
  hechos: 1,
  total: 1,
  porcentaje: 100,
  mensaje: '3 pagos en el archivo.',
  esMio: true,
  archivo: { nombre: 'lote-2026-09.txt', tipo: 'text/plain', bytes: 2048, venceAt: '2026-09-29T00:00:00.000Z', vencido: false },
  terminadoAt: '2026-09-22T19:30:00.000Z',
})

const FALLIDO = proceso({
  id: 'p-3',
  tipo: 'REPROCESAR_ASIENTOS',
  titulo: 'Reprocesar los asientos que faltan',
  estado: 'FALLO',
  total: null,
  porcentaje: null,
  mensaje: 'Falta mapear la cuenta del canon.',
  terminadoAt: '2026-09-22T18:00:00.000Z',
})

function lista(procesos: Proceso[], extra: Partial<ListaDeProcesos> = {}): ListaDeProcesos {
  return {
    disponible: true,
    motivo: null,
    procesos,
    activos: procesos.filter((p) => p.estado === 'CORRIENDO' || p.estado === 'EN_COLA').length,
    veTodos: false,
    ...extra,
  }
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

async function montar(el: React.ReactElement) {
  await act(async () => {
    root.render(el)
    await new Promise((r) => setTimeout(r, 0))
  })
}

const q = (id: string) => container.querySelector(`[data-testid="${id}"]`)
const todas = (id: string) => Array.from(container.querySelectorAll(`[data-testid="${id}"]`))

describe('<BotonDelCentroDeProcesos>', () => {
  it('quieto: un ícono sin anillo ni número', async () => {
    vi.mocked(procesosApi.listar).mockResolvedValue(lista([TERMINADO_CON_ARCHIVO]))
    await montar(<BotonDelCentroDeProcesos />)

    const boton = q('centro-de-procesos-boton') as HTMLButtonElement
    expect(boton.getAttribute('aria-label')).toBe('Centro de procesos')
    expect(q('centro-de-procesos-anillo')).toBeNull()
    expect(q('centro-de-procesos-cuantos')).toBeNull()
    expect(q('centro-de-procesos-resumen')?.textContent).toBe('Nada en curso. Estos son los últimos tuyos.')
    expect(procesosApi.listar).toHaveBeenCalledWith({ limite: 12 })
  })

  it('con algo en curso: anillo, cuántos van, y el nombre accesible lo dice', async () => {
    vi.mocked(procesosApi.listar).mockResolvedValue(
      lista([proceso(), proceso({ id: 'p-9', estado: 'EN_COLA', hechos: 0, porcentaje: 0 }), TERMINADO_CON_ARCHIVO]),
    )
    await montar(<BotonDelCentroDeProcesos />)

    const boton = q('centro-de-procesos-boton') as HTMLButtonElement
    expect(boton.getAttribute('aria-label')).toBe('Centro de procesos: 2 en curso')
    expect(q('centro-de-procesos-anillo')).not.toBeNull()
    expect(q('centro-de-procesos-cuantos')?.textContent).toBe('2')
    expect(q('centro-de-procesos-resumen')?.textContent).toBe('2 procesos en curso.')
    // El panel pinta cada proceso con la misma fila del centro.
    expect(todas('fila-de-proceso').map((f) => f.getAttribute('data-estado'))).toEqual(['CORRIENDO', 'EN_COLA', 'TERMINADO'])
    expect(q('centro-de-procesos-ver-todo')?.getAttribute('href')).toBe('/panel/inmobiliaria/procesos')
  })

  it('sin la migración del back dice por qué está vacío', async () => {
    vi.mocked(procesosApi.listar).mockResolvedValue(
      lista([], { disponible: false, motivo: 'El centro de procesos espera la migración 20260922230000_centro_de_procesos.' }),
    )
    await montar(<BotonDelCentroDeProcesos />)
    expect(q('centro-de-procesos-resumen')?.textContent).toContain('20260922230000_centro_de_procesos')
    expect(todas('fila-de-proceso')).toHaveLength(0)
  })
})

describe('<BotonDelCentroDeProcesos> — se hace presente (22-09)', () => {
  it('🔴 lanzar un proceso ABRE el centro solo, con ese proceso arriba y resaltado', async () => {
    vi.mocked(procesosApi.listar).mockResolvedValue(lista([proceso(), TERMINADO_CON_ARCHIVO]))
    await montar(<BotonDelCentroDeProcesos />)
    expect(q('popover-raiz')?.getAttribute('data-open')).toBe('0')

    await act(async () => {
      anunciarProceso({ titulo: 'Emitiendo 450 facturas' })
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(q('popover-raiz')?.getAttribute('data-open')).toBe('1')
    const filas = todas('fila-de-proceso')
    expect(filas[0].getAttribute('data-proceso-id')).toBe('p-1')
    expect(filas[0].getAttribute('data-resaltado')).toBe('1')
    expect(container.textContent).toContain('En curso')
    expect(container.textContent).toContain('Recientes')
  })

  it('con un diálogo abierto no se le mete encima: avisa con «Ver en el centro»', async () => {
    vi.mocked(procesosApi.listar).mockResolvedValue(lista([]))
    const dialogo = document.createElement('div')
    dialogo.setAttribute('role', 'dialog')
    dialogo.setAttribute('data-state', 'open')
    document.body.appendChild(dialogo)
    try {
      await montar(<BotonDelCentroDeProcesos />)
      await act(async () => {
        anunciarProceso({ titulo: 'Archivo del lote' })
      })
      expect(q('popover-raiz')?.getAttribute('data-open')).toBe('0')
      expect(toastMock.info).toHaveBeenCalledWith(
        'Archivo del lote',
        expect.objectContaining({ action: expect.objectContaining({ label: 'Ver en el centro' }) }),
      )
    } finally {
      dialogo.remove()
    }
  })

  it('vacío útil: sin nada en curso muestra los últimos 5 con sus acciones', async () => {
    const viejos = Array.from({ length: 7 }, (_, i) =>
      proceso({ id: `v-${i}`, estado: 'TERMINADO', terminadoAt: '2026-09-22T10:00:00.000Z', mensaje: 'ok' }),
    )
    vi.mocked(procesosApi.listar).mockResolvedValue(lista(viejos))
    await montar(<BotonDelCentroDeProcesos />)
    expect(todas('fila-de-proceso')).toHaveLength(5)
    expect(todas('ver-resultado-proceso')).toHaveLength(5)
  })
})

describe('<FilaDeProceso> — acciones según el estado', () => {
  it('terminado: «Ver en Facturación» lleva a su pantalla; falló: «Reintentar» relanza el reproceso', async () => {
    reprocesarMock.mockResolvedValue({ asentados: 1, sinResolver: 0, motivos: [] })
    const onCambio = vi.fn()
    await montar(
      <ul>
        <FilaDeProceso
          proceso={proceso({ estado: 'TERMINADO', recurso: { tipo: 'FACTURACION_DEL_MES', id: '2026-09' } })}
          ahora={AHORA}
        />
        <FilaDeProceso proceso={FALLIDO} onCambio={onCambio} ahora={AHORA} />
      </ul>,
    )
    expect(q('ver-resultado-proceso')?.getAttribute('href')).toBe('/panel/inmobiliaria/facturacion')
    await act(async () => {
      ;(q('reintentar-proceso') as HTMLButtonElement).click()
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(reprocesarMock).toHaveBeenCalled()
    expect(onCambio).toHaveBeenCalled()
  })

  it('la etapa se lee aparte del resumen: «Armando el ZIP» con su «0 de 1», sin contradecirse', async () => {
    await montar(
      <ul>
        <FilaDeProceso
          proceso={proceso({
            hechos: 0,
            total: 1,
            porcentaje: 0,
            mensaje: 'Etapa: Armando el ZIP. 1 factura emitida · $1.326.782.',
          })}
          ahora={AHORA}
        />
      </ul>,
    )
    expect(container.textContent).toContain('Armando el ZIP')
    expect(q('mensaje-del-proceso')?.textContent).toBe('1 factura emitida · $1.326.782.')
  })
})

describe('<FilaDeProceso>', () => {
  it('en curso: «En curso», quién, «120 de 800» y la barra con su porcentaje', async () => {
    await montar(
      <ul>
        <FilaDeProceso proceso={proceso()} ahora={AHORA} />
      </ul>,
    )
    expect(q('estado-del-proceso')?.textContent).toBe('En curso')
    expect(container.textContent).toContain('Ana Pérez · contador')
    expect(container.textContent).toContain('hace 3 min')
    expect(q('avance-del-proceso')?.textContent).toBe('120 de 800')
    expect(container.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('15')
    expect(q('descargar-proceso')).toBeNull()
    expect(q('cancelar-proceso')).toBeNull()
  })

  it('listo con archivo: «Descargar» firma la URL en el back y navega a ella', async () => {
    vi.mocked(procesosApi.descarga).mockResolvedValue({
      url: 'https://storage/firmada?download=lote-2026-09.txt',
      nombre: 'lote-2026-09.txt',
      venceAt: null,
    })
    const navegar = vi.fn()
    await montar(
      <ul>
        <FilaDeProceso proceso={TERMINADO_CON_ARCHIVO} navegar={navegar} ahora={AHORA} />
      </ul>,
    )
    expect(q('estado-del-proceso')?.textContent).toBe('Listo')
    expect(container.textContent).toContain('Tú')
    expect(q('descargar-proceso')?.textContent).toContain('2 KB')
    expect(container.querySelector('[role="progressbar"]')).toBeNull()

    await act(async () => {
      ;(q('descargar-proceso') as HTMLButtonElement).click()
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(procesosApi.descarga).toHaveBeenCalledWith('p-2')
    expect(navegar).toHaveBeenCalledWith('https://storage/firmada?download=lote-2026-09.txt')
  })

  it('un archivo vencido no ofrece descargar: dice qué hacer', async () => {
    await montar(
      <ul>
        <FilaDeProceso
          proceso={{ ...TERMINADO_CON_ARCHIVO, archivo: { ...TERMINADO_CON_ARCHIVO.archivo!, vencido: true } }}
          ahora={AHORA}
        />
      </ul>,
    )
    expect(q('descargar-proceso')).toBeNull()
    expect(q('archivo-vencido')?.textContent).toContain('Vuelve a lanzarlo')
  })

  it('falló: «Falló» y el porqué en rojo; interrumpido: «Se interrumpió»', async () => {
    await montar(
      <ul>
        <FilaDeProceso proceso={FALLIDO} ahora={AHORA} />
        <FilaDeProceso proceso={proceso({ id: 'p-4', estado: 'FALLO', interrumpido: true, mensaje: 'Se interrumpió: no avanzó en 20 minutos.' })} ahora={AHORA} />
      </ul>,
    )
    const [fallo, interrumpido] = todas('fila-de-proceso')
    expect(fallo.querySelector('[data-testid="estado-del-proceso"]')?.textContent).toBe('Falló')
    const mensaje = fallo.querySelector('[data-testid="mensaje-del-proceso"]')
    expect(mensaje?.textContent).toBe('Falta mapear la cuenta del canon.')
    expect(mensaje?.className).toContain('text-danger')
    expect(interrumpido.querySelector('[data-testid="estado-del-proceso"]')?.textContent).toBe('Se interrumpió')
  })

  it('«Cancelar» sólo si el back dice que se puede, y avisa a quien pinta la lista', async () => {
    vi.mocked(procesosApi.cancelar).mockResolvedValue(proceso({ cancelacionPedida: true }))
    const onCambio = vi.fn()
    await montar(
      <ul>
        <FilaDeProceso proceso={proceso({ sePuedeCancelar: true })} onCambio={onCambio} ahora={AHORA} />
      </ul>,
    )
    await act(async () => {
      ;(q('cancelar-proceso') as HTMLButtonElement).click()
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(procesosApi.cancelar).toHaveBeenCalledWith('p-1')
    expect(onCambio).toHaveBeenCalled()
  })
})

describe('<HistorialDeProcesos>', () => {
  it('la frase dice de quién son y cuántos corren; sin administrador no hay filtro por persona', async () => {
    vi.mocked(procesosApi.listar).mockResolvedValue(lista([proceso(), TERMINADO_CON_ARCHIVO, FALLIDO]))
    await montar(<HistorialDeProcesos />)

    expect(q('historial-frase')?.textContent).toBe('Los procesos que lanzaste: 3 en esta vista, 1 está corriendo ahora.')
    expect(todas('fila-de-proceso')).toHaveLength(3)
    expect(q('filtro-tipo')).not.toBeNull()
    expect(q('filtro-estado')).not.toBeNull()
    expect(q('filtro-persona')).toBeNull()
    expect(procesosApi.listar).toHaveBeenCalledWith({ limite: 30 })
  })

  it('el administrador ve lo del equipo y puede filtrar por persona', async () => {
    vi.mocked(procesosApi.listar).mockResolvedValue(lista([proceso(), FALLIDO], { veTodos: true }))
    await montar(<HistorialDeProcesos />)
    expect(q('historial-frase')?.textContent).toContain('Los procesos de todo el equipo')
    expect(q('filtro-persona')).not.toBeNull()
  })

  it('vacío, dice qué aparece acá', async () => {
    vi.mocked(procesosApi.listar).mockResolvedValue(lista([]))
    await montar(<HistorialDeProcesos />)
    expect(q('historial-vacio')?.textContent).toContain('Todavía no hay procesos')
  })
})

describe('las frases', () => {
  it('resumenDelCentro y fraseDelHistorial', () => {
    expect(resumenDelCentro(null)).toBe('Leyendo…')
    expect(resumenDelCentro(lista([]))).toContain('Aquí aparecen')
    expect(resumenDelCentro(lista([proceso()]))).toBe('1 proceso en curso.')
    expect(fraseDelHistorial({ veTodos: true, activos: 0, cuantos: 30, hayMas: true })).toBe(
      'Los procesos de todo el equipo: 30 o más en esta vista, ninguno está corriendo ahora.',
    )
  })
})
