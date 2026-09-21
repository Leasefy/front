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
  /*
   * 🔴 19-09-2026 · Este test EXIGÍA una afirmación falsa.
   *
   * Decía: «dice que hoy ningún portal de afuera publica solo», y comprobaba
   * que la pantalla lo escribiera. Es mentira —Mercado Libre tiene API pública
   * documentada y su app de DevCenter es autoservicio en Colombia; Ciencuadras
   * también se conecta sin intermediario— y la mentira servía de excusa para no
   * construir ninguna integración. El back ya se corrigió el 19-09; el texto de
   * la pantalla y esta prueba se habían quedado con la versión vieja.
   *
   * Lo que la pantalla SÍ tiene que decir, porque es cierto y es lo que le
   * importa a quien está mirando: que la publicación la termina una persona
   * porque NOSOTROS no hemos construido la integración, y cuál portal pide qué.
   */
  it('🔴 P7 — la razón que da es la nuestra, no una afirmación falsa sobre los portales', async () => {
    await montar()
    const aviso = porTestId('aviso-sin-api')
    expect(aviso).not.toBeNull()
    expect(aviso!.textContent).toMatch(/no hemos construido ninguna de las integraciones/i)
    expect(aviso!.textContent).not.toMatch(/ning[uú]n portal de afuera publica solo/i)
  })

  /*
   * 🔴 19-09 · Visto en el navegador: las seis tarjetas decían EXACTAMENTE la
   * misma frase («Para publicar aquí necesitamos los datos de tu cuenta de este
   * portal»), así que la pantalla contestaba «lo mismo» a la pregunta de Nico
   * del 18: «creo que hasta para conectar con cada portal puede ser diferente
   * cada portal». El detalle por portal ya existía, pero vivía dentro del
   * diálogo: había que abrir seis para descubrir que piden cosas distintas.
   */
  it('🔴 P7d — cada tarjeta dice qué pide SU portal, sin abrir el diálogo', async () => {
    h.api.cuentas.mockResolvedValue({
      disponible: true,
      motivo: null,
      portales: [
        FINCARAIZ,
        { portal: 'MERCADO_LIBRE', nombre: 'Mercado Libre', tieneApi: false, cuenta: null },
        { portal: 'CIENCUADRAS', nombre: 'Ciencuadras', tieneApi: false, cuenta: null },
        { portal: 'PROPERATI', nombre: 'Properati', tieneApi: false, cuenta: null },
      ],
    })
    await montar()
    const dice = (portal: string) =>
      porTestId(`portal-${portal}`)!.textContent!.replace(/\s+/g, ' ')

    // Sólo los que NO tienen cuenta anotada: en este falso Metrocuadrado ya
    // tiene una, y esa tarjeta habla de su publicación, no de qué pedirle.
    expect(dice('FINCARAIZ')).toMatch(/ID de Cliente/i)
    expect(dice('MERCADO_LIBRE')).toMatch(/se autoriza con un bot[oó]n/i)
    expect(dice('CIENCUADRAS')).toMatch(/WS3/)
    expect(dice('PROPERATI')).toMatch(/Proppit/)

    // Y no vuelven a decir todas lo mismo.
    expect(dice('FINCARAIZ')).not.toMatch(/WS3/)
    expect(dice('CIENCUADRAS')).not.toMatch(/ID de Cliente/i)
  })

  it('🔴 P7e — «qué pide este portal» está en la tarjeta y detrás de un botón, no dentro del diálogo', async () => {
    /* 21-09-2026. Dos cosas se arreglan acá y las dos son de Nico:
         · la explicación vivía DENTRO del diálogo de la cuenta y encima
           plegada, o sea a dos clics de donde se decide si conectar el portal;
         · «hay muchas pantallas que colocamos información ahí dispuesta y eso
           llena las pantallas de carga cognitiva innecesaria» — de ahí que el
           contenido no esté montado hasta que alguien lo pida.
       Un `<details>` no servía para reemplazarlo: abierto crece dentro de la
       pantalla. Y no se podía dejar en el diálogo porque un modal encima de un
       modal no funciona. */
    await montar()

    // El botón está en la tarjeta del portal…
    const tarjeta = porTestId('portal-FINCARAIZ')!
    const boton = tarjeta.querySelector('[data-testid="para-entender-mas"]')
    expect(boton).not.toBeNull()
    expect(boton!.textContent).toMatch(/Qué pide Fincaraíz/)

    // …y lo que explica NO está puesto sobre la pantalla: nada de la lista
    // está en el documento mientras nadie la pida.
    expect(porTestId('que-pide-este-portal')).toBeNull()
    expect(document.body.textContent).not.toMatch(/ejecutivo comercial/)

    // Y ya no vive dentro del diálogo de la cuenta.
    await clic(porTestId('cuenta-FINCARAIZ'))
    const form = porTestId('form-de-cuenta')!
    expect(form.textContent).not.toMatch(/ejecutivo comercial/)
    expect(form.querySelector('details')).toBeNull()
    // El cuidado del portal SÍ se queda: no es explicación, es una advertencia
    // sobre el dato que se está escribiendo en ese instante.
    expect(form.textContent).toMatch(/dado de alta como asesor/)
  })

  it('nuestro propio catálogo no ofrece «qué pide»: la respuesta sería «nada»', async () => {
    h.api.cuentas.mockResolvedValue({
      disponible: true,
      motivo: null,
      portales: [
        { portal: 'SITIO_PROPIO', nombre: 'Sitio propio', tieneApi: true, cuenta: null },
      ],
    })
    await montar()
    expect(
      porTestId('portal-SITIO_PROPIO')!.querySelector('[data-testid="para-entender-mas"]'),
    ).toBeNull()
  })

  it('los nombres propios no se aplastan a minúsculas', async () => {
    // Un `toLowerCase()` los rompía: «mercado libre», «proppit», «ciencuadras».
    h.api.cuentas.mockResolvedValue({
      disponible: true,
      motivo: null,
      portales: [
        { portal: 'MERCADO_LIBRE', nombre: 'Mercado Libre', tieneApi: false, cuenta: null },
        { portal: 'PROPERATI', nombre: 'Properati', tieneApi: false, cuenta: null },
      ],
    })
    await montar()
    expect(porTestId('portal-MERCADO_LIBRE')!.textContent).toContain('Mercado Libre')
    expect(porTestId('portal-PROPERATI')!.textContent).toContain('Proppit')
  })

  it('P7c — y distingue a los que SÍ se conectan solos de los que piden acuerdo', async () => {
    await montar()
    const aviso = porTestId('aviso-sin-api')!.textContent ?? ''
    expect(aviso).toMatch(/Mercado Libre y Ciencuadras/i)
    expect(aviso).toMatch(/Fincara[ií]z y Metrocuadrado/i)
  })

  it('P7b — los cuatro pasos están, y numerados en orden', async () => {
    await montar()
    const pasos = porTestId('como-funciona')!.querySelectorAll('ol > li')
    expect(pasos.length).toBe(4)
    expect(pasos[0].textContent).toMatch(/Conecta tu cuenta/)
    expect(pasos[3].textContent).toMatch(/Confirma que ya salió/)
  })

  it('P1 — sin cuenta anotada dice que ese portal NO puede recibir avisos', async () => {
    await montar()
    const fila = porTestId('portal-FINCARAIZ')!
    // 🔴 19-09: acá se esperaba la frase genérica que decían los SEIS portales.
    // Ahora cada tarjeta nombra el dato que pide el suyo (ver P7d).
    expect(fila.textContent).toMatch(/necesitamos tu/i)
    // Y ofrece anotarla, que es lo que faltaba en todo el producto.
    expect(porTestId('cuenta-FINCARAIZ')!.textContent).toMatch(/Configurar/)
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
    expect(boton!.textContent).toMatch(/Descargar archivo \(2\)/)
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
    expect(porTestId('portal-FINCARAIZ')!.textContent).toContain('Sin configurar')
    expect(porTestId('portal-METROCUADRADO')!.textContent).toContain('Lista para publicar')
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
    expect(t).toContain('nuestro propio catálogo')
    expect(t).toContain('Se publica automático')
    // Y NO le dice que «no puede recibir avisos»: ese texto es de los de afuera.
    expect(t).not.toContain('necesitamos los datos de tu cuenta')
  })
})
