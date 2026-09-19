/**
 * PortalesClient.test.tsx — la pantalla de publicación en portales.
 *
 * 🔴 El defecto que estas pruebas cierran (18-09-2026): la pantalla era una
 * ventana de SÓLO LECTURA a un proceso que no se podía empezar. Cuatro de los
 * ocho endpoints de publicación del back no tenían un solo consumidor
 * (`guardarCuenta`, `publicar`, `despublicar`, `revision`), y `publicar` exige
 * una cuenta ACTIVA en el portal — que no había forma de anotar en ninguna
 * parte del producto.
 *
 * Lo que sostienen, que son decisiones y no detalles de pintura:
 *
 * P1 — Sin cuenta anotada, la pantalla lo dice como lo que es: ese portal no
 *      puede recibir avisos. No como una etiqueta gris sin consecuencia.
 * P2 — «Descargar» sólo aparece si hay algo que descargar, y dice cuántos. Un
 *      botón que baja un CSV vacío es una promesa falsa, y eran seis.
 * P3 — Al publicar sólo se ofrecen los portales con cuenta AL DÍA: el back
 *      responde `SIN_CUENTA_EN_EL_PORTAL` para los demás, así que ofrecerlos
 *      sería ofrecer un error.
 * P4 — Antes de publicar se le pregunta al back qué le falta al inmueble, y lo
 *      que falta se muestra tal cual. La regla vive en un solo lado.
 * P5 — Sin permiso de `edit` no hay botones de escribir: el back responde 403 y
 *      un botón visible es un 403 disfrazado de error.
 * P6 — Lo que pide mano —«por subir», «por bajar»— se ordena primero.
 * P7 — La pantalla dice que hoy ningún portal de afuera publica solo. Es lo más
 *      importante que tiene que entender quien llega acá.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const h = vi.hoisted(() => ({
  canAccess: vi.fn((_m: string, _a: string) => true),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  api: {
    cuentas: vi.fn(),
    guardarCuenta: vi.fn(),
    tablero: vi.fn(),
    revision: vi.fn(),
    publicar: vi.fn(),
    despublicar: vi.fn(),
    confirmar: vi.fn(),
    exportarUrl: (p: string) => `/inmobiliaria/publicacion/exportar/${p}`,
  },
  consignaciones: vi.fn(() => ({ consignaciones: [] as unknown[] })),
}))

vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: h.canAccess }),
}))
vi.mock('@/components/ui/toast', () => ({ toast: h.toast }))
// `use-crm` importa `resultadoDelCrm` del mismo módulo —es quien traduce el 503
// en «noHabilitado»—, así que el mock conserva el resto del módulo y sólo
// reemplaza el API.
vi.mock('@/lib/api/crm.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/crm.service')>()),
  publicacionApi: h.api,
}))
vi.mock('@/lib/api/refresco-de-datos', () => ({
  invalidar: vi.fn(),
  alCambiar: () => () => {},
}))
vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useConsignaciones: () => h.consignaciones(),
}))
vi.mock('@/components/providers/SmoothScroll', () => ({
  useLenis: () => ({ stop: vi.fn(), start: vi.fn() }),
}))

import { ApiError } from '@/lib/api/client'
import { PortalesClient } from './PortalesClient'

const FINCARAIZ = {
  portal: 'FINCARAIZ',
  nombre: 'Fincaraíz',
  tieneApi: false,
  cuenta: null as null | Record<string, unknown>,
}
const METRO = {
  portal: 'METROCUADRADO',
  nombre: 'Metrocuadrado',
  tieneApi: false,
  cuenta: {
    id: 'c-1',
    portal: 'METROCUADRADO',
    etiqueta: 'Plan 2026',
    modo: 'EXPORTACION',
    modoEfectivo: 'EXPORTACION',
    activa: true,
    identificadorEnElPortal: 'inmobiliaria@correo.co',
    notas: null,
  },
}

const POR_SUBIR = {
  id: 'f-1',
  propertyId: 'prop-1',
  portal: 'METROCUADRADO',
  nombreDelPortal: 'Metrocuadrado',
  estado: 'POR_EXPORTAR' as const,
  viva: true,
  urlExterna: null,
  ultimoError: null,
  publicadaEl: null,
  exportadaEl: null,
  inmueble: {
    id: 'prop-1',
    title: 'Apartaestudio en El Socorro',
    code: 812,
    neighborhood: 'El Socorro',
    city: 'Caldas',
    status: 'AVAILABLE',
  },
}
const PUBLICADA = {
  ...POR_SUBIR,
  id: 'f-2',
  estado: 'PUBLICADA' as const,
  urlExterna: 'https://metrocuadrado.com/aviso/1',
}

let contenedor: HTMLDivElement
let raiz: Root

async function montar() {
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
  await act(async () => {
    raiz.render(<PortalesClient />)
  })
}

function texto() {
  return contenedor.textContent ?? ''
}

function porTestId(id: string) {
  return contenedor.querySelector(`[data-testid="${id}"]`)
}

async function clic(el: Element | null) {
  await act(async () => {
    el?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  h.canAccess.mockReturnValue(true)
  h.consignaciones.mockReturnValue({ consignaciones: [] })
  h.api.cuentas.mockResolvedValue({
    disponible: true,
    motivo: null,
    portales: [FINCARAIZ, METRO],
  })
  h.api.tablero.mockResolvedValue({ disponible: true, motivo: null, filas: [] })
})

afterEach(() => {
  act(() => raiz?.unmount())
  contenedor?.remove()
})

describe('Publicación en portales', () => {
  it('P7 — dice que hoy ningún portal de afuera publica solo', async () => {
    await montar()
    const aviso = porTestId('aviso-sin-api')
    expect(aviso).not.toBeNull()
    expect(aviso!.textContent).toMatch(/ning[uú]n portal de afuera publica solo/i)
  })

  it('P7b — los cuatro pasos están, y numerados en orden', async () => {
    await montar()
    const pasos = porTestId('como-funciona')!.querySelectorAll('ol > li')
    expect(pasos.length).toBe(4)
    expect(pasos[0].textContent).toMatch(/Anota tu cuenta/)
    expect(pasos[3].textContent).toMatch(/Marca «ya la subí»/)
  })

  it('P1 — sin cuenta anotada dice que ese portal NO puede recibir avisos', async () => {
    await montar()
    const fila = porTestId('portal-FINCARAIZ')!
    expect(fila.textContent).toMatch(/no puede recibir avisos/i)
    // Y ofrece anotarla, que es lo que faltaba en todo el producto.
    expect(porTestId('cuenta-FINCARAIZ')!.textContent).toMatch(/Anotar la cuenta/)
  })

  it('P1b — anotar la cuenta llama al back con ese portal', async () => {
    h.api.guardarCuenta.mockResolvedValue({ aviso: null })
    await montar()
    await clic(porTestId('cuenta-FINCARAIZ'))
    expect(porTestId('form-de-cuenta')).not.toBeNull()
    await act(async () => {
      porTestId('form-de-cuenta')!.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      )
    })
    expect(h.api.guardarCuenta).toHaveBeenCalledWith(
      expect.objectContaining({ portal: 'FINCARAIZ', activa: true }),
    )
  })

  it('P2 — sin nada por subir NO ofrece descargar el archivo', async () => {
    await montar()
    expect(porTestId('exportar-METROCUADRADO')).toBeNull()
    expect(porTestId('exportar-FINCARAIZ')).toBeNull()
  })

  it('P2b — con avisos por subir ofrece descargar, y dice cuántos', async () => {
    h.api.tablero.mockResolvedValue({
      disponible: true,
      motivo: null,
      filas: [POR_SUBIR, { ...POR_SUBIR, id: 'f-3', propertyId: 'prop-2' }],
    })
    await montar()
    const boton = porTestId('exportar-METROCUADRADO')
    expect(boton).not.toBeNull()
    expect(boton!.textContent).toMatch(/Descargar 2 avisos/)
  })

  it('P3 — al publicar sólo se ofrecen los portales con cuenta al día', async () => {
    h.consignaciones.mockReturnValue({
      consignaciones: [
        {
          propertyId: 'prop-1',
          propertyTitle: 'Apartaestudio en El Socorro',
          propertyCode: 812,
          propertyZone: 'El Socorro',
          propertyCity: 'Caldas',
        },
      ],
    })
    h.api.revision.mockResolvedValue({
      propertyId: 'prop-1',
      estado: 'AVAILABLE',
      fotos: 8,
      fotosMinimas: 4,
      falta: [],
      sePuedePublicar: true,
      ocupacion: { puede: true, disponibleDesde: null, porQue: '', motivo: null },
    })
    await montar()
    await clic(porTestId('abrir-publicar'))
    await clic(porTestId('elegir-prop-1'))
    // Metrocuadrado tiene cuenta activa; Fincaraíz no tiene ninguna.
    expect(porTestId('marcar-METROCUADRADO')).not.toBeNull()
    expect(porTestId('marcar-FINCARAIZ')).toBeNull()
  })

  it('P4 — lo que le falta al inmueble lo dice el back, y se muestra tal cual', async () => {
    h.consignaciones.mockReturnValue({
      consignaciones: [
        {
          propertyId: 'prop-1',
          propertyTitle: 'Apartaestudio en El Socorro',
          propertyCode: 812,
          propertyZone: 'El Socorro',
          propertyCity: 'Caldas',
        },
      ],
    })
    h.api.revision.mockResolvedValue({
      propertyId: 'prop-1',
      estado: 'DRAFT',
      fotos: 1,
      fotosMinimas: 4,
      falta: [
        { campo: 'fotos', que: 'Faltan 3 fotos: los portales piden mínimo 4.' },
        { campo: 'descripcion', que: 'Falta la descripción del inmueble.' },
      ],
      sePuedePublicar: false,
      ocupacion: { puede: true, disponibleDesde: null, porQue: '', motivo: null },
    })
    await montar()
    await clic(porTestId('abrir-publicar'))
    await clic(porTestId('elegir-prop-1'))
    const falta = porTestId('le-falta')
    expect(falta).not.toBeNull()
    const items = Array.from(falta!.querySelectorAll('li')).map((li) => li.textContent)
    expect(items).toEqual([
      'Faltan 3 fotos: los portales piden mínimo 4.',
      'Falta la descripción del inmueble.',
    ])
    // Y no se ofrece publicar algo que el back va a rechazar.
    expect(
      (porTestId('confirmar-publicar') as HTMLButtonElement).disabled,
    ).toBe(true)
  })

  it('P5 — sin permiso de edit no hay un solo botón de escribir', async () => {
    h.api.tablero.mockResolvedValue({
      disponible: true,
      motivo: null,
      filas: [POR_SUBIR],
    })
    h.canAccess.mockImplementation((_m: string, a: string) => a !== 'edit')
    await montar()
    expect(porTestId('abrir-publicar')).toBeNull()
    expect(porTestId('cuenta-FINCARAIZ')).toBeNull()
    expect(porTestId('confirmar-f-1')).toBeNull()
    expect(porTestId('bajar-f-1')).toBeNull()
    // Pero descargar el archivo sigue: leer no es escribir.
    expect(porTestId('exportar-METROCUADRADO')).not.toBeNull()
  })

  it('P6 — lo que pide mano se ordena primero', async () => {
    h.api.tablero.mockResolvedValue({
      disponible: true,
      motivo: null,
      filas: [PUBLICADA, POR_SUBIR],
    })
    await montar()
    const filas = porTestId('tabla-publicaciones')!.querySelectorAll('tbody tr')
    expect(filas[0].getAttribute('data-testid')).toBe('publicacion-f-1')
  })

  it('bajar del portal llama a despublicar con ese portal', async () => {
    h.api.tablero.mockResolvedValue({
      disponible: true,
      motivo: null,
      filas: [PUBLICADA],
    })
    h.api.despublicar.mockResolvedValue({ porBajarAMano: ['METROCUADRADO'] })
    await montar()
    await clic(porTestId('bajar-f-2'))
    expect(h.api.despublicar).toHaveBeenCalledWith('prop-1', ['METROCUADRADO'])
  })

  it('el 503 del back se muestra CON su motivo, no como un error', async () => {
    h.api.cuentas.mockRejectedValue(
      new ApiError(503, 'Falta aplicar la migración 20260917 de publicación.'),
    )
    await montar()
    // `useCrm` traduce el 503 en `noHabilitado`; la pantalla lo dice como
    // «próximamente» CON el motivo, no como algo que se arregle reintentando.
    const aviso = porTestId('cuentas-no-habilitadas')
    expect(aviso).not.toBeNull()
    expect(aviso!.textContent).toMatch(/Falta aplicar la migración 20260917/)
    // Y no ofrece un botón de reintentar, que no resolvería nada.
    expect(porTestId('reintentar')).toBeNull()
  })
})

describe('las tarjetas de portal', () => {
  it('cada portal es su propia tarjeta, con monograma', async () => {
    await montar()
    const grilla = porTestId('lista-de-portales')!
    expect(grilla.className).toContain('grid')
    // Fincaraíz ya tiene su logo real, así que no lleva monograma.
    // Metrocuadrado todavía no: «ME». Dos letras, siempre.
    expect(porTestId('portal-METROCUADRADO')!.textContent).toContain('ME')
    expect(porTestId('portal-FINCARAIZ')!.querySelector('img')).not.toBeNull()
  })

  it('🔴 usa el logo REAL cuando lo tenemos, con su procedencia escrita', async () => {
    // Los cuatro que tienen archivo salen con su logo; los dos que no, con
    // monograma. Lo que NUNCA se hace es aproximar el logo de una empresa que
    // existe —redibujarlo o teñir un cuadrado «más o menos de su color»—:
    // sería una marca falsa en la pantalla que dice dónde se publica el
    // inmueble de un cliente. Cada archivo tiene su fila en
    // `public/portales/PROCEDENCIA.md` con su licencia.
    await montar()
    const deFincaraiz = porTestId('portal-FINCARAIZ')!.querySelector('img')
    expect(deFincaraiz?.getAttribute('src')).toBe('/portales/fincaraiz.png')
    // Metrocuadrado no tiene archivo: monograma, sin imagen inventada.
    expect(porTestId('portal-METROCUADRADO')!.querySelector('img')).toBeNull()
    expect(porTestId('portal-METROCUADRADO')!.textContent).toContain('ME')
  })

  it('🔴 todo logo declarado tiene su fila en PROCEDENCIA.md', async () => {
    // El guardián del acuerdo: agregar un archivo a `LOGOS` sin decir de dónde
    // salió y con qué licencia deja de ser posible en silencio.
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const marca = readFileSync(
      join(process.cwd(), 'src/lib/portales/marca.ts'),
      'utf8',
    )
    const procedencia = readFileSync(
      join(process.cwd(), 'public/portales/PROCEDENCIA.md'),
      'utf8',
    )
    const archivos = [...marca.matchAll(/'\/portales\/([^']+)'/g)].map((m) => m[1])
    expect(archivos.length).toBeGreaterThan(0)
    const sinProcedencia = archivos.filter((a) => !procedencia.includes(a))
    expect(sinProcedencia).toEqual([])
  })

  it('el estado se lee de un vistazo, portal por portal', async () => {
    await montar()
    expect(porTestId('portal-FINCARAIZ')!.textContent).toContain('Sin cuenta anotada')
    expect(porTestId('portal-METROCUADRADO')!.textContent).toContain('Cuenta al día')
  })

  it('«Sitio propio» dice que es el nuestro y que sale solo', async () => {
    h.api.cuentas.mockResolvedValue({
      disponible: true,
      motivo: null,
      portales: [
        { portal: 'SITIO_PROPIO', nombre: 'Sitio propio', tieneApi: true, cuenta: null },
      ],
    })
    await montar()
    const t = porTestId('portal-SITIO_PROPIO')!.textContent ?? ''
    expect(t).toContain('catálogo de Leasefy')
    expect(t).toContain('Sale solo')
    // Y NO le dice que «no puede recibir avisos»: ese texto es de los de afuera.
    expect(t).not.toContain('no puede recibir avisos')
  })
})
