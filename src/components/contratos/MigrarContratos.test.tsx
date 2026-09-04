/**
 * El importador de contratos, de punta a punta.
 *
 * Dos reglas que se ven contradictorias y no lo son:
 *
 *  1. El owner no puede exigir un archivo estándar: cualquier Excel tiene que
 *     poder llegar a la lista de trabajo. El viejo gate de 8 columnas
 *     (`OBLIGATORIOS`/`faltantes()`) apagaba «Revisar» si faltaba una sola —
 *     el archivo real del owner no tenía `uso`, así que nunca llegaba.
 *  2. Pero un archivo del que NO se entiende nada tampoco puede pasar. El
 *     2026-09-03 entró uno de 110 contratos con todas las columnas en
 *     «Ignorar» y creó 110 filas `{"direccion":"","inquilino":{...}}`.
 *
 * Lo que las concilia es el tamaño de la exigencia: `faltantesEsenciales` pide
 * lo mínimo para que una fila SIRVA (identificar el inmueble, identificar al
 * inquilino, poder cobrarle) y nada más. `uso`, depósito, comisión y
 * periodicidad siguen sin bloquear.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // evita que el transform de JSX tree-shakee el import

vi.mock('@/components/inmobiliaria/import/lib/parseFile', () => ({
  parseSpreadsheetFile: vi.fn(),
  // El componente explora las primeras filas para saber DÓNDE están los
  // encabezados (un export puede traer un título arriba). Sin filas de
  // muestra se queda en la primera, que es el caso de estos tests.
  leerPrimerasFilas: vi.fn(async () => [] as string[][]),
}))

vi.mock('@/lib/api/contracts.service', () => ({
  contractsApi: {
    migracion: {
      preparar: vi.fn(),
      filas: vi.fn(),
      resolverMasivo: vi.fn(),
      resumen: vi.fn(),
      lotesAbiertos: vi.fn(),
      resolver: vi.fn(),
      crearInmueble: vi.fn(),
      registrarPropietario: vi.fn(),
      descartar: vi.fn(),
      descartarLote: vi.fn(),
      activar: vi.fn(),
      estadoDeLote: vi.fn(),
      idsDeFilas: vi.fn(),
      inmueblesFaltantes: vi.fn(),
      crearInmueblesFaltantes: vi.fn(),
    },
  },
}))

import {
  leerPrimerasFilas,
  parseSpreadsheetFile,
} from '@/components/inmobiliaria/import/lib/parseFile'
import { contractsApi, type FilaDeMigracion } from '@/lib/api/contracts.service'
import { MigrarContratos } from './MigrarContratos'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  vi.mocked(contractsApi.migracion.lotesAbiertos).mockResolvedValue([])
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
})

function render() {
  act(() => {
    root.render(<MigrarContratos />)
  })
}

async function esperar() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

function subirArchivo(headers: string[], filas: Record<string, unknown>[]) {
  const rows = filas.map((fila, i) => ({ _rowIndex: i, ...fila }))
  vi.mocked(parseSpreadsheetFile).mockResolvedValue({ rows, headers, sheetNames: ['Sheet1'] })
  const input = container.querySelector(
    '[data-testid="archivo-contratos"]',
  ) as HTMLInputElement
  const file = new File(['contenido'], 'contratos.csv', { type: 'text/csv' })
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
  return act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise((r) => setTimeout(r, 0))
  })
}

/**
 * Los encabezados mínimos que la compuerta deja pasar: identificar el
 * inmueble, identificar al inquilino y poder cobrarle.
 *
 * Antes estos tests subían `['Columna A']` —cero columnas reconocidas— porque
 * el importador dejaba continuar con todo en «Ignorar». Eso es exactamente lo
 * que el 2026-09-03 creó 110 filas vacías, así que ya no se puede: un test
 * que llega a la lista de trabajo tiene que subir un archivo que sirva, igual
 * que una persona.
 */
const ENCABEZADOS_MINIMOS = [
  'Dirección del inmueble',
  'Nombre del arrendatario',
  'Correo del arrendatario',
  'Fecha de inicio',
  'Fecha de terminación',
  'Canon',
  'Día de pago',
]

function filaMinima(i = 0): Record<string, unknown> {
  return {
    'Dirección del inmueble': `Calle ${10 + i} # 20-30`,
    'Nombre del arrendatario': `Inquilino ${i}`,
    'Correo del arrendatario': `inquilino${i}@correo.co`,
    'Fecha de inicio': '2026-01-01',
    'Fecha de terminación': '2027-01-01',
    Canon: '1800000',
    'Día de pago': '5',
  }
}

function subirArchivoMinimo(cuantas = 1) {
  return subirArchivo(
    ENCABEZADOS_MINIMOS,
    Array.from({ length: cuantas }, (_, i) => filaMinima(i)),
  )
}

function botonRevisar() {
  return Array.from(container.querySelectorAll('button')).find((b) =>
    b.textContent?.includes('Revisar'),
  ) as HTMLButtonElement | undefined
}

function boton(texto: string) {
  return Array.from(container.querySelectorAll('button')).find((b) =>
    b.textContent?.includes(texto),
  ) as HTMLButtonElement | undefined
}

function labelConTexto(texto: string) {
  return Array.from(container.querySelectorAll('label')).find((l) =>
    l.textContent?.includes(texto),
  )
}

function checkboxDentroDe(el: Element | undefined) {
  return el?.querySelector('button[role="checkbox"]') as HTMLButtonElement | undefined
}

/**
 * Tilda «Revisé estos contratos».
 *
 * El bloque de activación entero (invitar, avisos, botón) vive detrás de este
 * check desde que la revisión existe: activar crea los contratos y las
 * consignaciones de verdad, y antes bastaba un click sin haber mirado una
 * sola fila. Los tests de activación tienen que pasar por acá, igual que una
 * persona.
 */
async function confirmarRevision() {
  const check = container.querySelector(
    '[data-testid="confirmar-revision"]',
  ) as HTMLButtonElement | null
  await act(async () => {
    check?.click()
    await new Promise((r) => setTimeout(r, 0))
  })
}

/** Una `FilaDeMigracion` mínima, para las pruebas de selección (§3.2.G). */
function filaDeMigracion(over: Partial<FilaDeMigracion> = {}): FilaDeMigracion {
  const n = over.fila ?? 0
  return {
    id: `f-${n}`,
    lote: 'lote-1',
    fila: n,
    datos: { direccion: `Cra ${n}`, inquilino: { nombre: `Inquilino ${n}`, correo: 'a@x.co' } },
    propertyId: 'prop-1',
    propietarioId: null,
    tenantId: null,
    candidatos: [],
    estado: 'PENDIENTE',
    faltantes: ['propietario'],
    contractId: null,
    ...over,
  }
}

/**
 * Lleva el componente hasta la lista de trabajo con 30 pendientes (25 en la
 * página 1, 5 en la página 2) — el mínimo para que aparezcan tanto la
 * paginación como el control "Seleccionar las {total} del lote".
 */
async function avanzarAListaDeTrabajo(activables = 0) {
  await subirArchivoMinimo()
  const b = botonRevisar()

  vi.mocked(contractsApi.migracion.preparar).mockResolvedValue({
    lote: 'lote-1',
    estado: 'ENCOLADO',
    total: 30,
    procesadas: 0,
    pendientes: 0,
    listos: 0,
    activados: 0,
    descartados: 0,
  })
  vi.mocked(contractsApi.migracion.estadoDeLote).mockResolvedValue({
    lote: 'lote-1',
    estado: 'LISTO',
    total: 30,
    procesadas: 30,
    pendientes: 30,
    listos: 0,
    activados: 0,
    descartados: 0,
  })
  vi.mocked(contractsApi.migracion.resumen).mockResolvedValue({
    lote: 'lote-1',
    total: 30,
    pendientes: 30,
    listos: 0,
    activados: 0,
    descartados: 0,
    activables,
  })
  vi.mocked(contractsApi.migracion.filas).mockResolvedValue({
    filas: Array.from({ length: 25 }, (_, i) => filaDeMigracion({ fila: i })),
    total: 30,
    pagina: 1,
    porPagina: 25,
  })

  await act(async () => {
    b?.click()
    for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0))
  })
}

/**
 * 🔴 La compuerta.
 *
 * El 2026-09-03 este mismo componente dejó continuar con TODAS las columnas
 * en «Ignorar»: se crearon 110 filas
 * `{"direccion":"","inquilino":{"correo":"","nombre":""}}` y el aviso llegó
 * después. No es el viejo gate de 8 columnas obligatorias —el archivo real
 * del owner no tenía `uso` y tiene que poder entrar—: es el mínimo para que
 * una fila SIRVA.
 */
describe('<MigrarContratos> — la compuerta de lo esencial', () => {
  it('un archivo cuyas columnas no mapean nada NO deja continuar', async () => {
    render()
    await esperar()

    await subirArchivo(['Columna A', 'Columna B'], [{ 'Columna A': 'x', 'Columna B': 'y' }])

    // Antes: `disabled === false` y 110 filas basura del otro lado.
    expect(botonRevisar()?.disabled).toBe(true)
    expect(container.querySelector('[data-testid="faltan-esenciales"]')).toBeTruthy()
  })

  it('dice CUÁLES faltan, no «faltan datos»', async () => {
    render()
    await esperar()
    await subirArchivo(['Columna A'], [{ 'Columna A': 'x' }])

    const aviso = container.querySelector('[data-testid="faltan-esenciales"]')
    const texto = aviso?.textContent ?? ''
    // Los siete requisitos, cada uno nombrado.
    for (const clave of [
      'inmueble',
      'inquilino',
      'contactoInquilino',
      'fechaInicio',
      'fechaFin',
      'canon',
      'diaDePago',
    ]) {
      expect(container.querySelector(`[data-testid="falta-${clave}"]`)).toBeTruthy()
    }
    // Y dice qué hacer: el archivo no las trae, no es que haya que elegirlas.
    expect(texto).toContain('Tu archivo no trae ninguna columna de canon')
    expect(texto).toContain('volvé a subirlo')
  })

  it('cuando la columna existe pero no se reconoció, manda al desplegable', async () => {
    render()
    await esperar()
    // «Corte facturación» no se reconoce, pero habla de un corte de cobro:
    // hay una columna que elegir, así que el consejo no es «volvé a subirlo».
    await subirArchivo(
      [...ENCABEZADOS_MINIMOS.filter((h) => h !== 'Día de pago'), 'Corte facturación'],
      [{ ...filaMinima(), 'Corte facturación': '5' }],
    )

    const texto =
      container.querySelector('[data-testid="faltan-esenciales"]')?.textContent ?? ''
    expect(texto).toContain(
      'Elegí en el desplegable la columna de tu archivo que trae el día de pago',
    )
    expect(texto).not.toContain('volvé a subirlo')
    expect(botonRevisar()?.disabled).toBe(true)
    // La columna sigue estando, con su desplegable, para elegirla.
    expect(
      container.querySelector('[data-testid="mapeo-Corte facturación"]'),
    ).toBeTruthy()
  })

  it('con lo esencial mapeado sigue de largo, y no inventa lo que no está', async () => {
    render()
    await esperar()

    // Sin `uso`, sin depósito, sin comisión: eso NO bloquea (se completa en la
    // lista de trabajo). Lo esencial sí está.
    await subirArchivoMinimo()

    const boton = botonRevisar()
    expect(boton?.disabled).toBe(false)

    vi.mocked(contractsApi.migracion.preparar).mockResolvedValue({
      lote: 'lote-servidor-1',
      estado: 'ENCOLADO',
      total: 1,
      procesadas: 0,
      pendientes: 0,
      listos: 0,
      activados: 0,
      descartados: 0,
    })
    // WU-4, ítem 1: `preparar()` sólo encola el job — el sondeo
    // (`useEstadoDeLote`) es quien decide cuándo ya hay lista de trabajo.
    vi.mocked(contractsApi.migracion.estadoDeLote).mockResolvedValue({
      lote: 'lote-servidor-1',
      estado: 'LISTO',
      total: 1,
      procesadas: 1,
      pendientes: 1,
      listos: 0,
      activados: 0,
      descartados: 0,
    })
    vi.mocked(contractsApi.migracion.resumen).mockResolvedValue({
      lote: 'lote-servidor-1',
      total: 1,
      pendientes: 1,
      listos: 0,
      activados: 0,
      descartados: 0,
      activables: 0,
    })
    vi.mocked(contractsApi.migracion.filas).mockResolvedValue({
      filas: [],
      total: 0,
      pagina: 1,
      porPagina: 25,
    })

    await act(async () => {
      boton?.click()
      // Varias vueltas de microtask: preparar() → efecto de sondeo →
      // estadoDeLote() → efecto de refrescar() → resumen()+filas().
      for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0))
    })

    // Server-issued lote: la fila que llega a `preparar()` no debe llevar un
    // `lote` armado en el cliente.
    expect(contractsApi.migracion.preparar).toHaveBeenCalledTimes(1)
    const [filasEnviadas] = vi.mocked(contractsApi.migracion.preparar).mock.calls[0]
    expect(filasEnviadas).toHaveLength(1)
    // Lo mapeado viaja…
    expect(filasEnviadas[0].direccion).toBe('Calle 10 # 20-30')
    expect(filasEnviadas[0].monthlyRent).toBe(1800000)
    expect(filasEnviadas[0].paymentDay).toBe(5)
    // …y lo que no se mapeó viaja ausente, nunca un default inventado.
    expect(filasEnviadas[0].usoInmueble).toBeUndefined()
    expect(filasEnviadas[0].deposit).toBeUndefined()

    expect(container.querySelector('[data-testid="lista-de-trabajo"]')).toBeTruthy()
  })

  it('un archivo sin nada reconocible nunca llega a crear filas', async () => {
    // Los mocks del factory viven todo el archivo: `restoreAllMocks` restaura
    // spies, no borra el historial de un `vi.fn()`.
    vi.mocked(contractsApi.migracion.preparar).mockClear()
    render()
    await esperar()
    await subirArchivo(['Columna A', 'Columna B'], [{ 'Columna A': 'x', 'Columna B': 'y' }])

    await act(async () => {
      botonRevisar()?.click()
      for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0))
    })

    // Cero llamadas: las 110 filas vacías del incidente no se crean.
    expect(contractsApi.migracion.preparar).not.toHaveBeenCalled()
    expect(container.querySelector('[data-testid="lista-de-trabajo"]')).toBeNull()
  })

  it('mientras el lote sigue ENCOLADO/PROCESANDO, muestra progreso — nunca la lista de trabajo vacía', async () => {
    render()
    await esperar()
    await subirArchivoMinimo()
    const boton = botonRevisar()

    vi.mocked(contractsApi.migracion.preparar).mockResolvedValue({
      lote: 'lote-servidor-2',
      estado: 'ENCOLADO',
      total: 1,
      procesadas: 0,
      pendientes: 0,
      listos: 0,
      activados: 0,
      descartados: 0,
    })
    // El job sigue corriendo — nunca resuelve LISTO en este test.
    vi.mocked(contractsApi.migracion.estadoDeLote).mockResolvedValue({
      lote: 'lote-servidor-2',
      estado: 'PROCESANDO',
      total: 1,
      procesadas: 0,
      pendientes: 0,
      listos: 0,
      activados: 0,
      descartados: 0,
    })

    await act(async () => {
      boton?.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    // WU-1 dejó este hueco explícito: sin espera, acá se hubiera mostrado
    // una lista de trabajo con "0 pendientes" — indistinguible de "no queda
    // nada por hacer" cuando en realidad el job ni terminó.
    expect(container.querySelector('[data-testid="lote-progreso"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="lista-de-trabajo"]')).toBeNull()
    // `resumen()` no se llama para ESTE lote mientras no hay nada que
    // mostrar todavía.
    expect(contractsApi.migracion.resumen).not.toHaveBeenCalledWith('lote-servidor-2')
  })

  it('muestra un selector de remapeo por columna y un botón para restablecer', async () => {
    render()
    await esperar()

    await subirArchivo(['Propiedad', 'Canon de arrendamiento'], [
      { Propiedad: 'x', 'Canon de arrendamiento': '1000000' },
    ])

    // "Propiedad" está deliberadamente excluida del auto-mapeo (F5) — sigue
    // siendo elegible a mano, vía el selector.
    expect(container.querySelector('[data-testid="mapeo-Propiedad"]')).toBeTruthy()
    expect(
      container.querySelector('[data-testid="mapeo-Canon de arrendamiento"]'),
    ).toBeTruthy()

    const restablecer = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Restablecer'),
    )
    expect(restablecer).toBeTruthy()
  })
})

/**
 * T-0033 contract.md §3.2.G4 — la selección sobrevive un cambio de página
 * (antes se reseteaba en `refrescar()`, la única razón por la que "las 25 de
 * esta página" era la única forma de seleccionar algo), y un segundo control
 * explícito trae TODA la selección del lote vía `GET migrar/filas/ids`.
 */
describe('<MigrarContratos> — selección across pages (§3.2.G)', () => {
  it('la selección sobrevive un cambio de página', async () => {
    render()
    await esperar()
    await avanzarAListaDeTrabajo()

    // Selecciona las 25 de la página 1.
    const checkboxPagina = checkboxDentroDe(labelConTexto('Seleccionar las 25 de esta página'))
    await act(async () => {
      checkboxPagina?.click()
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(
      container.querySelector('[data-testid="resolucion-masiva"]')?.textContent,
    ).toContain('25 filas seleccionadas')

    // Página 2: 5 filas distintas.
    vi.mocked(contractsApi.migracion.filas).mockResolvedValue({
      filas: Array.from({ length: 5 }, (_, i) => filaDeMigracion({ fila: 25 + i })),
      total: 30,
      pagina: 2,
      porPagina: 25,
    })

    await act(async () => {
      const siguiente = container.querySelector(
        '[aria-label="Página siguiente"]',
      ) as HTMLButtonElement | null
      siguiente?.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    // Antes: refrescar() reseteaba `seleccion` en cada página → la masiva
    // desaparecía acá. Ahora la selección de la página 1 sigue viva aunque
    // esas 25 filas ya no estén a la vista.
    expect(
      container.querySelector('[data-testid="resolucion-masiva"]')?.textContent,
    ).toContain('25 filas seleccionadas')
  })

  it('"Seleccionar las {total} del lote" trae TODOS los ids con GET migrar/filas/ids', async () => {
    render()
    await esperar()
    await avanzarAListaDeTrabajo()

    vi.mocked(contractsApi.migracion.idsDeFilas).mockResolvedValue({
      ids: Array.from({ length: 30 }, (_, i) => `f-${i}`),
      total: 30,
      truncado: false,
    })

    const seleccionarTodo = boton('Seleccionar las 30 del lote')
    expect(seleccionarTodo).toBeTruthy()

    await act(async () => {
      seleccionarTodo?.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    // Sin filtro de estado: la lista visible es TODO el lote (la revisión),
    // así que «seleccionar todo» tiene que traer lo mismo que se está viendo.
    expect(contractsApi.migracion.idsDeFilas).toHaveBeenCalledWith('lote-1')
    expect(
      container.querySelector('[data-testid="resolucion-masiva"]')?.textContent,
    ).toContain('30 filas seleccionadas')
  })

  it('un lote truncado avisa explícitamente cuántas se seleccionaron', async () => {
    render()
    await esperar()
    await avanzarAListaDeTrabajo()

    vi.mocked(contractsApi.migracion.idsDeFilas).mockResolvedValue({
      ids: Array.from({ length: 5_000 }, (_, i) => `f-${i}`),
      total: 6_500,
      truncado: true,
    })

    await act(async () => {
      boton('Seleccionar las 30 del lote')?.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    // Nunca en silencio: el front tiene que decir explícitamente que no
    // trajo todas.
    expect(container.textContent).toContain('5')
    expect(container.textContent).toMatch(/6[.,]?500|truncad|primeras/i)
  })
})

/**
 * T-0035 — reproduce el defecto reportado contra una corrida real: el dueño
 * importó 1.365 filas, todas quedaron `PENDIENTE` por falta de inmueble
 * (`listos: 0`), y con el modo sparse prendido el back YA podía activarlas
 * todas (`activar()` toma `LISTO` + `PENDIENTE`) — pero el front decidía si
 * ofrecer el botón mirando `resumen.listos`, que daba 0. El botón nunca
 * aparecía, aunque el back sí podía. `resumen.activables` es la proyección
 * que el back expone para que el front no tenga que adivinar la política
 * del flag (contract.md T-0035 §1).
 */
describe('<MigrarContratos> — activables, el botón de activar (T-0035)', () => {
  it('con el modo sparse APAGADO (activables=0, listos=0, pendientes>0): sin botón, mensaje "ninguno se puede activar"', async () => {
    render()
    await esperar()
    await avanzarAListaDeTrabajo(0)

    expect(boton('Activar')).toBeUndefined()
    expect(container.textContent).toContain('Ninguno se puede activar todavía')
  })

  it('con el modo sparse PRENDIDO (activables=30, listos=0): el botón aparece con la cuenta real, no con `listos`', async () => {
    render()
    await esperar()
    await avanzarAListaDeTrabajo(30)
    await confirmarRevision()

    const btn = boton('Activar 30 contratos')
    expect(btn).toBeTruthy()
    expect(btn?.disabled).toBe(false)
    // El mensaje de "ninguno se puede activar" no puede convivir con el botón.
    expect(container.textContent).not.toContain('Ninguno se puede activar todavía')
  })

  it('cuando activables > listos, avisa CUÁNTOS quedan incompletos y qué va a pasar — no lo presenta como resuelto', async () => {
    render()
    await esperar()
    await avanzarAListaDeTrabajo(30)
    await confirmarRevision()

    const aviso = container.querySelector('[data-testid="aviso-incompletos"]')
    expect(aviso).toBeTruthy()
    expect(aviso?.textContent).toContain('30')
    expect(aviso?.textContent).toMatch(/sin inmueble/i)
    expect(aviso?.textContent).toMatch(/completar/i)
  })

  it('cuando activables === listos (nada incompleto), no muestra el aviso de incompletos', async () => {
    render()
    await esperar()
    await subirArchivoMinimo()
    const b = botonRevisar()

    vi.mocked(contractsApi.migracion.preparar).mockResolvedValue({
      lote: 'lote-completo',
      estado: 'ENCOLADO',
      total: 5,
      procesadas: 0,
      pendientes: 0,
      listos: 0,
      activados: 0,
      descartados: 0,
    })
    vi.mocked(contractsApi.migracion.estadoDeLote).mockResolvedValue({
      lote: 'lote-completo',
      estado: 'LISTO',
      total: 5,
      procesadas: 5,
      pendientes: 0,
      listos: 5,
      activados: 0,
      descartados: 0,
    })
    vi.mocked(contractsApi.migracion.resumen).mockResolvedValue({
      lote: 'lote-completo',
      total: 5,
      pendientes: 0,
      listos: 5,
      activados: 0,
      descartados: 0,
      activables: 5,
    })
    vi.mocked(contractsApi.migracion.filas).mockResolvedValue({
      filas: [],
      total: 0,
      pagina: 1,
      porPagina: 25,
    })

    await act(async () => {
      b?.click()
      for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0))
    })

    await confirmarRevision()

    expect(boton('Activar 5 contratos')).toBeTruthy()
    expect(container.querySelector('[data-testid="aviso-incompletos"]')).toBeNull()
  })
})

/**
 * T-0035 — la tarjeta "Tenés una migración sin terminar" tenía la misma
 * ceguera: leía `l.listos` para decidir si mostrar "N para activar".
 */
describe('<MigrarContratos> — lotesAbiertos usa activables, no listos (T-0035)', () => {
  it('un lote con listos:0 y activables>0 (sparse) SÍ dice cuántas se pueden activar', async () => {
    vi.mocked(contractsApi.migracion.lotesAbiertos).mockResolvedValue([
      {
        lote: 'lote-viejo',
        pendientes: 1365,
        listos: 0,
        activables: 1365,
        estado: 'LISTO',
        total: 1365,
        creadoEn: new Date().toISOString(),
      },
    ])

    render()
    await esperar()

    const tarjeta = container.querySelector('[data-testid="lotes-abiertos"]')
    expect(tarjeta?.textContent).toContain('1365 para activar')
  })

  it('un lote con activables:0 (sparse apagado, nada listo) no dice nada de activar', async () => {
    vi.mocked(contractsApi.migracion.lotesAbiertos).mockResolvedValue([
      {
        lote: 'lote-viejo',
        pendientes: 30,
        listos: 0,
        activables: 0,
        estado: 'LISTO',
        total: 30,
        creadoEn: new Date().toISOString(),
      },
    ])

    render()
    await esperar()

    const tarjeta = container.querySelector('[data-testid="lotes-abiertos"]')
    expect(tarjeta?.textContent).not.toContain('para activar')
  })
})

/**
 * T-0036 contract.md §3.2.C6 — el botón para cancelar un lote entero en vez
 * de descartar fila por fila. Vive dentro del lote abierto (§11-L5), pide
 * confirmación (§L7: sin type-to-confirm) y, tras confirmar, deja la vista
 * del lote — el lote desaparece de "Retomar" por el mecanismo de §3.2.C5.
 */
describe('<MigrarContratos> — descartar un lote entero (T-0036 §3.2.C)', () => {
  it('el botón aparece cuando quedan pendientes/listos, y abre un modal de confirmación al click', async () => {
    render()
    await esperar()
    await avanzarAListaDeTrabajo()

    const descartar = boton('Descartar este lote')
    expect(descartar).toBeTruthy()
    expect(document.querySelector('[role="alertdialog"]')).toBeNull()

    await act(async () => {
      descartar?.click()
    })

    const dialogo = document.querySelector('[role="alertdialog"]')
    expect(dialogo).toBeTruthy()
    // §3.2.C6 — la confirmación tiene que decir qué se destruye y qué
    // sobrevive antes de que el usuario la confirme.
    expect(dialogo?.textContent).toContain('30')
    expect(dialogo?.textContent?.toLowerCase()).toContain('archivo')
  })

  it('confirmar llama a descartarLote(lote) y deja la vista del lote', async () => {
    render()
    await esperar()
    await avanzarAListaDeTrabajo()
    vi.mocked(contractsApi.migracion.descartarLote).mockResolvedValue({
      lote: 'lote-1',
      descartadas: 30,
      activadas: 0,
      yaDescartadas: 0,
    })
    const llamadasPrevias = vi.mocked(contractsApi.migracion.lotesAbiertos).mock.calls.length

    await act(async () => {
      boton('Descartar este lote')?.click()
    })
    const confirmar = Array.from(
      document.querySelectorAll('[role="alertdialog"] button'),
    ).find((b) => b.textContent?.includes('Descartar este lote')) as HTMLButtonElement

    await act(async () => {
      confirmar.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(contractsApi.migracion.descartarLote).toHaveBeenCalledWith('lote-1')
    // Se fue de la vista del lote: ni la lista de trabajo ni el modal siguen.
    expect(container.querySelector('[data-testid="lista-de-trabajo"]')).toBeNull()
    expect(document.querySelector('[role="alertdialog"]')).toBeNull()
    // §3.2.C6 — "Retomar" se refresca: el lote ya no debería aparecer ahí.
    expect(
      vi.mocked(contractsApi.migracion.lotesAbiertos).mock.calls.length,
    ).toBeGreaterThan(llamadasPrevias)
  })

  it('un 409 LOTE_EN_PROCESO no se traga en silencio: cierra el modal, muestra el mensaje, y NO deja la vista del lote', async () => {
    render()
    await esperar()
    await avanzarAListaDeTrabajo()
    vi.mocked(contractsApi.migracion.descartarLote).mockRejectedValue(
      new Error('Ese lote todavía se está preparando. Esperá a que termine.'),
    )

    await act(async () => {
      boton('Descartar este lote')?.click()
    })
    const confirmar = Array.from(
      document.querySelectorAll('[role="alertdialog"] button'),
    ).find((b) => b.textContent?.includes('Descartar este lote')) as HTMLButtonElement

    await act(async () => {
      confirmar.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(document.querySelector('[role="alertdialog"]')).toBeNull()
    // Sigue en la vista del lote — no se abandona ante un error.
    expect(container.querySelector('[data-testid="lista-de-trabajo"]')).toBeTruthy()
    expect(container.textContent).toContain(
      'Ese lote todavía se está preparando. Esperá a que termine.',
    )
  })

  it('cancelar cierra el modal sin llamar a la API', async () => {
    render()
    await esperar()
    await avanzarAListaDeTrabajo()
    // `restoreAllMocks` no limpia las llamadas de un `vi.fn()` de fábrica
    // (sólo restaura spies reales) — otros tests de este archivo ya
    // llamaron `descartarLote`, así que se compara contra una foto previa
    // en vez de un `not.toHaveBeenCalled()` absoluto.
    const llamadasPrevias = vi.mocked(contractsApi.migracion.descartarLote).mock.calls.length

    await act(async () => {
      boton('Descartar este lote')?.click()
    })
    const cancelar = Array.from(
      document.querySelectorAll('[role="alertdialog"] button'),
    ).find((b) => b.textContent?.includes('Cancelar')) as HTMLButtonElement

    await act(async () => {
      cancelar.click()
    })

    expect(document.querySelector('[role="alertdialog"]')).toBeNull()
    expect(vi.mocked(contractsApi.migracion.descartarLote).mock.calls.length).toBe(
      llamadasPrevias,
    )
    // Sigue en la vista del lote — cancelar no navega a ningún lado.
    expect(container.querySelector('[data-testid="lista-de-trabajo"]')).toBeTruthy()
  })

  it('sin nada pendiente ni listo (todo activado o descartado), el botón no aparece', async () => {
    render()
    await esperar()
    await subirArchivoMinimo()
    const b = botonRevisar()

    vi.mocked(contractsApi.migracion.preparar).mockResolvedValue({
      lote: 'lote-cerrado',
      estado: 'ENCOLADO',
      total: 5,
      procesadas: 0,
      pendientes: 0,
      listos: 0,
      activados: 0,
      descartados: 0,
    })
    vi.mocked(contractsApi.migracion.estadoDeLote).mockResolvedValue({
      lote: 'lote-cerrado',
      estado: 'LISTO',
      total: 5,
      procesadas: 5,
      pendientes: 0,
      listos: 0,
      activados: 5,
      descartados: 0,
    })
    vi.mocked(contractsApi.migracion.resumen).mockResolvedValue({
      lote: 'lote-cerrado',
      total: 5,
      pendientes: 0,
      listos: 0,
      activados: 5,
      descartados: 0,
      activables: 0,
    })
    vi.mocked(contractsApi.migracion.filas).mockResolvedValue({
      filas: [],
      total: 0,
      pagina: 1,
      porPagina: 25,
    })

    await act(async () => {
      b?.click()
      for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0))
    })

    expect(container.querySelector('[data-testid="lista-de-trabajo"]')).toBeTruthy()
    expect(boton('Descartar este lote')).toBeFalsy()
  })
})

/**
 * T-0039 — el owner lo pidió así: «quiero que también salga un botón para
 * cancelar las importaciones de contratos por si queda una en espera y no
 * la quiero continuar». El botón de T-0036 vive adentro de `ListaDeTrabajo`,
 * que sólo se monta DESPUÉS de apretar "Retomar" — para descartar un lote
 * que no se quiere continuar había que abrirlo primero. Estos tests cubren
 * la tarjeta "Tenés una migración sin terminar" ofreciendo "Descartar" junto
 * a "Retomar", sin entrar al lote.
 */
describe('<MigrarContratos> — descartar un lote sin abrirlo primero (T-0039)', () => {
  it('la tarjeta ofrece un botón "Descartar" por lote, además de "Retomar"', async () => {
    vi.mocked(contractsApi.migracion.lotesAbiertos).mockResolvedValue([
      { lote: 'lote-a', pendientes: 10, listos: 0, activables: 10, estado: 'LISTO' },
      { lote: 'lote-b', pendientes: 5, listos: 2, activables: 7, estado: 'LISTO' },
    ])

    render()
    await esperar()

    expect(
      container.querySelector('[data-testid="descartar-lote-lista-lote-a"]'),
    ).toBeTruthy()
    expect(
      container.querySelector('[data-testid="descartar-lote-lista-lote-b"]'),
    ).toBeTruthy()
    // Retomar sigue siendo la acción primaria — sigue existiendo tal cual.
    expect(boton('Retomar')).toBeTruthy()
  })

  it('clickear "Descartar" pide el resumen del lote y abre la confirmación nombrándolo', async () => {
    vi.mocked(contractsApi.migracion.lotesAbiertos).mockResolvedValue([
      { lote: 'lote-a', pendientes: 10, listos: 0, activables: 10, estado: 'LISTO' },
      { lote: 'lote-b', pendientes: 5, listos: 2, activables: 7, estado: 'LISTO' },
    ])
    vi.mocked(contractsApi.migracion.resumen).mockResolvedValue({
      lote: 'lote-b',
      total: 7,
      pendientes: 5,
      listos: 2,
      activados: 3,
      descartados: 0,
      activables: 7,
    })

    render()
    await esperar()

    const btn = container.querySelector(
      '[data-testid="descartar-lote-lista-lote-b"]',
    ) as HTMLButtonElement

    expect(document.querySelector('[role="alertdialog"]')).toBeNull()

    await act(async () => {
      btn.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(contractsApi.migracion.resumen).toHaveBeenCalledWith('lote-b')
    const dialogo = document.querySelector('[role="alertdialog"]')
    expect(dialogo).toBeTruthy()
    // Nombra el lote específico — la tarjeta puede listar varios.
    expect(dialogo?.textContent).toContain('lote-b')
    // pendientes + listos = 7, y el activados = 3 — la misma copia que ya
    // existe adentro del lote abierto, no una versión reducida.
    expect(dialogo?.textContent).toContain('7')
    expect(dialogo?.textContent).toContain('3')
  })

  it('confirmar llama a descartarLote(lote) sin haber entrado a la lista de trabajo, y la tarjeta se refresca', async () => {
    vi.mocked(contractsApi.migracion.lotesAbiertos)
      .mockResolvedValueOnce([
        { lote: 'lote-a', pendientes: 10, listos: 0, activables: 10, estado: 'LISTO' },
      ])
      .mockResolvedValueOnce([])
    vi.mocked(contractsApi.migracion.resumen).mockResolvedValue({
      lote: 'lote-a',
      total: 10,
      pendientes: 10,
      listos: 0,
      activados: 0,
      descartados: 0,
      activables: 10,
    })
    vi.mocked(contractsApi.migracion.descartarLote).mockResolvedValue({
      lote: 'lote-a',
      descartadas: 10,
      activadas: 0,
      yaDescartadas: 0,
    })

    render()
    await esperar()

    const btn = container.querySelector(
      '[data-testid="descartar-lote-lista-lote-a"]',
    ) as HTMLButtonElement
    await act(async () => {
      btn.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    const confirmar = Array.from(
      document.querySelectorAll('[role="alertdialog"] button'),
    ).find((b) => b.textContent?.includes('Descartar este lote')) as HTMLButtonElement

    await act(async () => {
      confirmar.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(contractsApi.migracion.descartarLote).toHaveBeenCalledWith('lote-a')
    // Nunca entró a la lista de trabajo.
    expect(container.querySelector('[data-testid="lista-de-trabajo"]')).toBeNull()
    expect(document.querySelector('[role="alertdialog"]')).toBeNull()
    // La tarjeta se refrescó y el lote descartado ya no aparece.
    expect(
      container.querySelector('[data-testid="descartar-lote-lista-lote-a"]'),
    ).toBeNull()
  })

  it('un lote ENCOLADO/PROCESANDO tiene "Descartar" deshabilitado y no pide el resumen al click', async () => {
    vi.mocked(contractsApi.migracion.lotesAbiertos).mockResolvedValue([
      {
        lote: 'lote-c',
        pendientes: 0,
        listos: 0,
        activables: 0,
        estado: 'PROCESANDO',
        total: 1365,
      },
    ])

    render()
    await esperar()

    const btn = container.querySelector(
      '[data-testid="descartar-lote-lista-lote-c"]',
    ) as HTMLButtonElement
    expect(btn.disabled).toBe(true)

    const llamadasPrevias = vi.mocked(contractsApi.migracion.resumen).mock.calls.length
    await act(async () => {
      btn.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(vi.mocked(contractsApi.migracion.resumen).mock.calls.length).toBe(
      llamadasPrevias,
    )
    expect(document.querySelector('[role="alertdialog"]')).toBeNull()
  })

  it('cancelar la confirmación no llama a descartarLote y el lote sigue en la tarjeta', async () => {
    vi.mocked(contractsApi.migracion.lotesAbiertos).mockResolvedValue([
      { lote: 'lote-a', pendientes: 10, listos: 0, activables: 10, estado: 'LISTO' },
    ])
    vi.mocked(contractsApi.migracion.resumen).mockResolvedValue({
      lote: 'lote-a',
      total: 10,
      pendientes: 10,
      listos: 0,
      activados: 0,
      descartados: 0,
      activables: 10,
    })
    const llamadasPrevias = vi.mocked(contractsApi.migracion.descartarLote).mock.calls
      .length

    render()
    await esperar()

    const btn = container.querySelector(
      '[data-testid="descartar-lote-lista-lote-a"]',
    ) as HTMLButtonElement
    await act(async () => {
      btn.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    const cancelar = Array.from(
      document.querySelectorAll('[role="alertdialog"] button'),
    ).find((b) => b.textContent?.includes('Cancelar')) as HTMLButtonElement

    await act(async () => {
      cancelar.click()
    })

    expect(document.querySelector('[role="alertdialog"]')).toBeNull()
    expect(vi.mocked(contractsApi.migracion.descartarLote).mock.calls.length).toBe(
      llamadasPrevias,
    )
    expect(
      container.querySelector('[data-testid="descartar-lote-lista-lote-a"]'),
    ).toBeTruthy()
  })
})

/**
 * T-0036 contract.md §3.2.A6 — el checkbox de invitar tiene que dejar de
 * mentir: destildado, hoy no dice nada sobre lo que realmente pasa (Surface
 * A dejó de crear una cuenta silenciosa). Y el resumen de activación tiene
 * que contar cuántos correos quedaron retenidos sin invitar — es el
 * producto entero del cambio, y `invitados` sólo cuenta lo que SÍ se mandó.
 */
describe('<MigrarContratos> — invitar:false ya no crea nada, y el resumen lo dice (T-0036 Surface A)', () => {
  it('con el checkbox destildado, avisa: no se crea cuenta, se guarda el correo, se invita después desde el contrato', async () => {
    render()
    await esperar()
    await avanzarAListaDeTrabajo(30)
    await confirmarRevision()

    const label = labelConTexto('Invitar a los inquilinos al portal')
    const checkbox = checkboxDentroDe(label)
    await act(async () => {
      checkbox?.click()
    })

    const aviso = container.querySelector('[data-testid="aviso-sin-invitar"]')
    const texto = aviso?.textContent ?? ''
    expect(texto).toMatch(/no se crea (ninguna )?cuenta/i)
    expect(texto.toLowerCase()).toContain('correo')
    expect(texto.toLowerCase()).toMatch(/despu[eé]s.*(contrato|invitar)|invitar.*despu[eé]s|desde ahí/i)
    // Frozen: CobrosService.generate no depende de un Lease — este aviso no
    // puede insinuar nada de cobros/facturación (sería falso).
    expect(texto.toLowerCase()).not.toMatch(/cobro|factura/)
  })

  it('con el checkbox tildado (default), NO muestra el aviso de "no se crea cuenta"', async () => {
    render()
    await esperar()
    await avanzarAListaDeTrabajo(30)

    expect(container.textContent).not.toMatch(/no se crea (ninguna )?cuenta/i)
  })

  it('el resumen de activación suma una línea de "pendientes de invitar" cuando porInvitar > 0', async () => {
    render()
    await esperar()
    await avanzarAListaDeTrabajo(1)
    await confirmarRevision()
    vi.mocked(contractsApi.migracion.activar).mockResolvedValue({
      intentadas: 1,
      activadas: 1,
      fallidas: 0,
      invitados: 0,
      porInvitar: 1,
      resultados: [
        {
          fila: 0,
          estado: 'creado',
          contratoId: 'c-1',
          inquilinoInvitado: false,
          inquilinoPendienteDeInvitar: true,
        },
      ],
    })

    await act(async () => {
      boton('Activar 1 contratos')?.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    const tarjeta = container.querySelector('[data-testid="resultado-activacion"]')
    const texto = (tarjeta?.textContent ?? '').toLowerCase()
    expect(texto).toContain('1')
    expect(texto).toMatch(/pendient.*invitar|invitar.*pendient/)
    expect(texto).toContain('contrato')
  })

  it('el resumen de activación NO suma la línea cuando porInvitar está ausente (back viejo)', async () => {
    render()
    await esperar()
    await avanzarAListaDeTrabajo(1)
    vi.mocked(contractsApi.migracion.activar).mockResolvedValue({
      intentadas: 1,
      activadas: 1,
      fallidas: 0,
      invitados: 1,
      resultados: [
        { fila: 0, estado: 'creado', contratoId: 'c-1', inquilinoInvitado: true },
      ],
    })

    await act(async () => {
      boton('Activar 1 contratos')?.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    const tarjeta = container.querySelector('[data-testid="resultado-activacion"]')
    expect((tarjeta?.textContent ?? '').toLowerCase()).not.toMatch(
      /pendient.*invitar|invitar.*pendient/,
    )
  })

  it('el resumen de activación NO suma la línea cuando porInvitar es 0 — nunca "0 pendientes"', async () => {
    render()
    await esperar()
    await avanzarAListaDeTrabajo(1)
    vi.mocked(contractsApi.migracion.activar).mockResolvedValue({
      intentadas: 1,
      activadas: 1,
      fallidas: 0,
      invitados: 1,
      porInvitar: 0,
      resultados: [
        { fila: 0, estado: 'creado', contratoId: 'c-1', inquilinoInvitado: true },
      ],
    })

    await act(async () => {
      boton('Activar 1 contratos')?.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    const tarjeta = container.querySelector('[data-testid="resultado-activacion"]')
    expect((tarjeta?.textContent ?? '').toLowerCase()).not.toMatch(
      /pendient.*invitar|invitar.*pendient/,
    )
  })

  it('con el modo sparse apagado, el resumen dice cuántas quedaron sin activar por no tener inmueble', async () => {
    render()
    await esperar()
    await avanzarAListaDeTrabajo(1)
    await confirmarRevision()
    vi.mocked(contractsApi.migracion.activar).mockResolvedValue({
      intentadas: 1,
      activadas: 1,
      fallidas: 0,
      invitados: 1,
      sinInmueble: 89,
      sparse: false,
      resultados: [
        { fila: 0, estado: 'creado', contratoId: 'c-1', inquilinoInvitado: true },
      ],
    })

    await act(async () => {
      boton('Activar 1 contratos')?.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    const aviso = container.querySelector('[data-testid="aviso-sin-inmueble"]')
    const texto = (aviso?.textContent ?? '').toLowerCase()
    expect(texto).toContain('89')
    expect(texto).toMatch(/sin activar/)
    expect(texto).not.toMatch(/se activaron/)
  })

  it('con el modo sparse prendido, el resumen dice cuántas se activaron sin inmueble y que no cobran', async () => {
    render()
    await esperar()
    await avanzarAListaDeTrabajo(1)
    await confirmarRevision()
    vi.mocked(contractsApi.migracion.activar).mockResolvedValue({
      intentadas: 1,
      activadas: 1,
      fallidas: 0,
      invitados: 0,
      sinInmueble: 1,
      sparse: true,
      resultados: [
        { fila: 0, estado: 'creado', contratoId: 'c-1', inquilinoInvitado: false },
      ],
    })

    await act(async () => {
      boton('Activar 1 contratos')?.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    const texto = (
      container.querySelector('[data-testid="aviso-sin-inmueble"]')?.textContent ?? ''
    ).toLowerCase()
    expect(texto).toMatch(/se activó sin inmueble/)
    expect(texto).toMatch(/cobros/)
  })

  it('sin `sinInmueble` (back viejo) o en 0, el resumen no dice nada de inmuebles', async () => {
    render()
    await esperar()
    await avanzarAListaDeTrabajo(1)
    await confirmarRevision()
    vi.mocked(contractsApi.migracion.activar).mockResolvedValue({
      intentadas: 1,
      activadas: 1,
      fallidas: 0,
      invitados: 1,
      sinInmueble: 0,
      sparse: false,
      resultados: [
        { fila: 0, estado: 'creado', contratoId: 'c-1', inquilinoInvitado: true },
      ],
    })

    await act(async () => {
      boton('Activar 1 contratos')?.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(container.querySelector('[data-testid="resultado-activacion"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="aviso-sin-inmueble"]')).toBeNull()
  })
})

/**
 * Los casos de error del flujo — cada fallo tiene que verse y tener salida
 * EN EL LUGAR, sin recargar la página ni pedir soporte.
 */
/**
 * Después de activar, la lista de revisión no tiene nada más que hacer.
 *
 * Nico, mirando la pantalla recién activada: «si el usuario le da activar
 * contratos, ¿ya para qué la lista?». Quedaban noventa filas con sus casillas
 * de selección —algunas marcadas, otras no— sobre contratos que ya existían y
 * que desde ahí no se podían tocar.
 */
describe('<MigrarContratos> — «Crear los N inmuebles que faltan» vive en el resumen del lote', () => {
  it('con filas sin inmueble aparece el botón con el número del back; sin ellas, no', async () => {
    render()
    await esperar()
    vi.mocked(contractsApi.migracion.inmueblesFaltantes).mockResolvedValue({
      candidatas: 90,
      activadas: 90,
      ambiguas: 0,
      sinDireccion: 0,
    })
    await avanzarAListaDeTrabajo()
    await act(async () => {})

    expect(contractsApi.migracion.inmueblesFaltantes).toHaveBeenCalledWith('lote-1')
    const abrir = container.querySelector(
      '[data-testid="crear-inmuebles-faltantes-abrir"]',
    )
    expect(abrir?.textContent).toContain('90')
    // Vive en la tarjeta del resumen, no abajo con la selección.
    expect(container.querySelector('[data-testid="lista-de-trabajo"]')?.contains(abrir)).toBe(true)
  })

  it('sin inmuebles faltantes no hay botón', async () => {
    render()
    await esperar()
    vi.mocked(contractsApi.migracion.inmueblesFaltantes).mockResolvedValue({
      candidatas: 0,
      activadas: 0,
      ambiguas: 0,
      sinDireccion: 0,
    })
    await avanzarAListaDeTrabajo()
    await act(async () => {})

    expect(container.querySelector('[data-testid="crear-inmuebles-faltantes"]')).toBeNull()
  })
})

describe('<MigrarContratos> — activados sin propietario (2026-09-02)', () => {
  /**
   * El hueco que deja «Crear los N inmuebles que faltan» sobre un archivo sin
   * propietario: contratos activos, con inmueble e inquilino, que no cobran.
   * El número lo trae el back en el resumen; la lista lo dice con la acción.
   */
  async function conActivadosSinPropietario(n: number, enPagina: number) {
    render()
    await esperar()
    await avanzarAListaDeTrabajo()
    vi.mocked(contractsApi.migracion.resumen).mockResolvedValue({
      lote: 'lote-1',
      total: 30,
      pendientes: 0,
      listos: 0,
      activados: 30,
      descartados: 0,
      activables: 0,
      activadosSinPropietario: n,
    })
    vi.mocked(contractsApi.migracion.filas).mockResolvedValue({
      filas: Array.from({ length: 25 }, (_, i) =>
        filaDeMigracion({
          fila: i,
          estado: 'ACTIVADO',
          faltantes: [],
          contractId: `ct-${i}`,
          propietario:
            i < enPagina ? null : { id: 'po-1', nombre: 'Jorge', documento: '712' },
        }),
      ),
      total: 30,
      pagina: 1,
      porPagina: 25,
    })
  }

  it('el aviso dice cuántos, por qué no cobran, y selecciona los de la página', async () => {
    await conActivadosSinPropietario(90, 3)
    // Forzar el refresco: la lista se vuelve a pedir al cambiar de página y volver.
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[aria-label="Página siguiente"]')?.click()
      await new Promise((r) => setTimeout(r, 0))
    })
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[aria-label="Página anterior"]')?.click()
      for (let i = 0; i < 3; i++) await new Promise((r) => setTimeout(r, 0))
    })

    const aviso = container.querySelector('[data-testid="aviso-activados-sin-propietario"]')
    expect(aviso?.textContent).toContain('90 contratos ya activados no tienen propietario')
    expect(aviso?.textContent).toMatch(/no generan cobros/i)

    await act(async () => {
      boton('Seleccionar los 3 de esta página')?.click()
      await new Promise((r) => setTimeout(r, 0))
    })
    // La masiva aparece con exactamente esas tres.
    expect(container.textContent).toContain('3 filas seleccionadas')
    // Las activadas que YA tienen propietario no entran en «seleccionar la página».
    const label = labelConTexto('de esta página')
    expect(label?.textContent).toContain('Seleccionar las 3 de esta página')
  })
})

describe('<MigrarContratos> — activar apaga la lista', () => {
  const activarTodo = async (activables: number) => {
    render()
    await esperar()
    await avanzarAListaDeTrabajo(activables)
    await confirmarRevision()
    vi.mocked(contractsApi.migracion.activar).mockResolvedValue({
      intentadas: activables,
      activadas: activables,
      fallidas: 0,
      invitados: activables,
      resultados: [],
    })
    await act(async () => {
      boton(`Activar ${activables} contratos`)?.click()
      await new Promise((r) => setTimeout(r, 0))
    })
  }

  it('con todo activado la lista desaparece y sólo queda el resultado', async () => {
    // `resumen` sigue mockeado con activables=30, así que la rama honesta es
    // la de "quedaron 30 sin activar" — lo que importa acá es que las FILAS
    // ya no están.
    await activarTodo(30)

    expect(container.querySelector('[data-testid="resultado-activacion"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="fila-revision-0"]')).toBeNull()
    expect(container.textContent).not.toContain('Seleccionar las')
  })

  it('si quedó algo sin activar lo dice, y deja volver a la lista', async () => {
    await activarTodo(30)

    const volver = container.querySelector(
      '[data-testid="ver-lista-igual"]',
    ) as HTMLButtonElement | null
    expect(volver).toBeTruthy()
    expect(container.textContent).toMatch(/quedaron 30 sin activar/i)

    await act(async () => {
      volver?.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(container.querySelector('[data-testid="fila-revision-0"]')).toBeTruthy()
  })
})

describe('<MigrarContratos> — errores visibles y recuperables', () => {
  it('un job FALLIDO ofrece volver al cargador, y el botón funciona', async () => {
    render()
    await esperar()
    await subirArchivoMinimo()
    vi.mocked(contractsApi.migracion.preparar).mockResolvedValue({
      lote: 'lote-f',
      estado: 'ENCOLADO',
      total: 1,
      procesadas: 0,
      pendientes: 0,
      listos: 0,
      activados: 0,
      descartados: 0,
    })
    vi.mocked(contractsApi.migracion.estadoDeLote).mockResolvedValue({
      lote: 'lote-f',
      estado: 'FALLIDO',
      total: 1,
      procesadas: 0,
      pendientes: 0,
      listos: 0,
      activados: 0,
      descartados: 0,
      error: 'El archivo trae una fila imposible.',
    })

    await act(async () => {
      botonRevisar()?.click()
      for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0))
    })

    expect(container.querySelector('[data-testid="lote-fallido"]')).not.toBeNull()
    expect(container.textContent).toContain('El archivo trae una fila imposible.')

    const volver = container.querySelector(
      '[data-testid="lote-fallido-volver"]',
    ) as HTMLButtonElement
    expect(volver).not.toBeNull()
    await act(async () => {
      volver.click()
      await new Promise((r) => setTimeout(r, 0))
    })
    // De vuelta en el cargador: se puede subir el archivo corregido.
    expect(container.querySelector('[data-testid="archivo-contratos"]')).not.toBeNull()
  })

  it('avisa ocupado al muro mientras el job procesa, y suelta al llegar la lista', async () => {
    const onOcupado = vi.fn()
    act(() => {
      root.render(<MigrarContratos onOcupado={onOcupado} />)
    })
    await esperar()
    // Sin nada en vuelo, el muro quedó libre.
    expect(onOcupado).toHaveBeenLastCalledWith(false)

    await subirArchivoMinimo()
    vi.mocked(contractsApi.migracion.preparar).mockResolvedValue({
      lote: 'lote-1',
      estado: 'ENCOLADO',
      total: 1,
      procesadas: 0,
      pendientes: 0,
      listos: 0,
      activados: 0,
      descartados: 0,
    })
    // El sondeo nunca contesta: la pantalla queda esperando el job.
    vi.mocked(contractsApi.migracion.estadoDeLote).mockReturnValue(
      new Promise(() => {}),
    )

    await act(async () => {
      botonRevisar()?.click()
      for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0))
    })

    expect(container.querySelector('[data-testid="lote-progreso"]')).not.toBeNull()
    expect(onOcupado).toHaveBeenLastCalledWith(true)
  })

  it('con la lista de trabajo cargada, el muro queda libre', async () => {
    const onOcupado = vi.fn()
    act(() => {
      root.render(<MigrarContratos onOcupado={onOcupado} />)
    })
    await esperar()
    await avanzarAListaDeTrabajo()
    expect(container.querySelector('[data-testid="lista-de-trabajo"]')).not.toBeNull()
    expect(onOcupado).toHaveBeenLastCalledWith(false)
  })

  it('un cambio de página que falla se DICE — antes era un fallo mudo', async () => {
    render()
    await esperar()
    await avanzarAListaDeTrabajo()
    vi.mocked(contractsApi.migracion.resumen).mockRejectedValue(
      new Error('No pudimos conectarnos al servidor.'),
    )

    const pagina2 = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === '2',
    )
    expect(pagina2).toBeTruthy()
    await act(async () => {
      pagina2?.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(container.textContent).toContain('No pudimos conectarnos al servidor.')
  })
})

describe('<MigrarContratos> — la lista de migraciones a medias que falla se dice', () => {
  it('el fallo no bloquea subir, pero avisa del riesgo de duplicar', async () => {
    vi.mocked(contractsApi.migracion.lotesAbiertos).mockRejectedValue(
      new Error('red caída'),
    )
    render()
    await esperar()

    expect(container.querySelector('[data-testid="lotes-abiertos-fallo"]')).not.toBeNull()
    // El cargador sigue disponible: avisar no es frenar.
    expect(container.querySelector('[data-testid="archivo-contratos"]')).not.toBeNull()
  })

  it('cuando la lista responde, el aviso no aparece', async () => {
    render()
    await esperar()
    expect(container.querySelector('[data-testid="lotes-abiertos-fallo"]')).toBeNull()
  })
})

describe('<MigrarContratos> — el archivo se puede ARRASTRAR', () => {
  /*
   * Este paso era el único de los seis sin zona de arrastre: un `<label>` con
   * un input escondido, que sólo respondía al clic. Arrastrar encima no hacía
   * nada, y soltar el archivo fuera de un dropzone hace que el navegador lo
   * ABRA y se lleve la pestaña con la migración a medias. Nico lo probó y
   * creyó que se había roto.
   */
  function soltar(nombre = 'contratos.csv') {
    const zona = container.querySelector(
      '[data-testid="dropzone-contratos"]',
    ) as HTMLElement
    const file = new File(['contenido'], nombre, { type: 'text/csv' })
    const dataTransfer = {
      files: [file],
      items: [{ kind: 'file', type: 'text/csv', getAsFile: () => file }],
      types: ['Files'],
    }
    return act(async () => {
      const evento = new Event('drop', { bubbles: true, cancelable: true })
      Object.defineProperty(evento, 'dataTransfer', { value: dataTransfer })
      zona.dispatchEvent(evento)
      await new Promise((r) => setTimeout(r, 0))
    })
  }

  it('la zona de arrastre existe y el input sigue adentro para el clic', async () => {
    render()
    await esperar()

    expect(container.querySelector('[data-testid="dropzone-contratos"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="archivo-contratos"]')).not.toBeNull()
  })

  it('soltar un archivo encima lo lee, igual que elegirlo con el clic', async () => {
    render()
    await esperar()

    // `mockClear` acá: el contador del mock del módulo se acumula entre los
    // tests del archivo, así que sólo el delta de ESTE drop significa algo.
    vi.mocked(parseSpreadsheetFile).mockClear()
    vi.mocked(parseSpreadsheetFile).mockResolvedValue({
      rows: [{ _rowIndex: 0, Inquilino: 'Ana', Canon: '1000000' }],
      headers: ['Inquilino', 'Canon'],
      sheetNames: ['Sheet1'],
    })
    await soltar()

    expect(parseSpreadsheetFile).toHaveBeenCalledTimes(1)
    // Y llegó a la pantalla de mapeo: la lectura no se quedó en el aire.
    expect(container.textContent).toContain('Así entendimos tus columnas')
  })

  it('un archivo ilegible soltado se explica igual que uno elegido', async () => {
    render()
    await esperar()

    vi.mocked(parseSpreadsheetFile).mockRejectedValue(
      new Error('El archivo está dañado o no es una planilla.'),
    )
    await soltar('roto.xlsx')

    expect(container.textContent).toContain('El archivo está dañado')
  })
})

/**
 * La vista previa y los avisos de contenido. La compuerta cubre «el archivo no
 * trae la columna»; esto cubre el otro medio incidente: la columna está, se
 * mapeó bien, y las celdas vienen vacías. Sin esto, eso se descubre con los
 * contratos ya creados.
 */
describe('<MigrarContratos> — vista previa honesta antes de guardar', () => {
  it('muestra las tres primeras filas ya interpretadas, no la celda cruda', async () => {
    render()
    await esperar()
    await subirArchivoMinimo(5)

    const previa = container.querySelector('[data-testid="vista-previa-migracion"]')
    expect(previa).toBeTruthy()
    const texto = previa?.textContent ?? ''
    // Sale de `armarFilaAMigrar`: lo mismo que va a viajar al back.
    expect(texto).toContain('$ 1.800.000')
    expect(texto).toContain('el 5 de cada mes')
    expect(texto).toContain('Calle 10 # 20-30')
    // Tres filas, aunque el archivo traiga cinco.
    expect(texto).toContain('Fila 3')
    expect(texto).not.toContain('Fila 4')
  })

  it('un dato que no se pudo leer se ve como «sin dato», nunca como un cero', async () => {
    render()
    await esperar()
    // El día 30 no existe en todos los meses: viaja ausente.
    await subirArchivo(ENCABEZADOS_MINIMOS, [{ ...filaMinima(), 'Día de pago': '30' }])

    const texto =
      container.querySelector('[data-testid="vista-previa-migracion"]')?.textContent ?? ''
    expect(texto).toContain('sin dato')
  })

  it('lee los encabezados de la fila donde están de verdad, no siempre de la primera', async () => {
    render()
    await esperar()
    // Un export con el título de la inmobiliaria arriba y una fila en blanco.
    vi.mocked(leerPrimerasFilas).mockResolvedValue([
      ['INMOBILIARIA X — CONTRATOS VIGENTES', '', '', ''],
      ['', '', '', ''],
      ['Dirección', 'Arrendatario', 'Canon', 'Fecha de inicio'],
      ['Calle 1', 'Ana', '1800000', '2026-01-01'],
    ])
    await subirArchivoMinimo()

    // Sin esto, los encabezados serían «INMOBILIARIA X…» y «(sin nombre)»:
    // cero columnas reconocidas y todas las filas vacías.
    expect(vi.mocked(parseSpreadsheetFile).mock.calls.at(-1)?.[2]).toEqual({
      filaDeEncabezado: 2,
    })
    // Y lo dice: saltarse dos filas en silencio es indistinguible de perder
    // dos contratos.
    expect(
      container.querySelector('[data-testid="fila-de-encabezado"]')?.textContent,
    ).toContain('fila 3')
  })

  it('cuando los encabezados están en la primera fila no dice nada', async () => {
    render()
    await esperar()
    vi.mocked(leerPrimerasFilas).mockResolvedValue([])
    await subirArchivoMinimo()
    expect(container.querySelector('[data-testid="fila-de-encabezado"]')).toBeNull()
  })

  it('avisa con el número exacto cuántas filas quedan sin un dato esencial', async () => {
    render()
    await esperar()
    await subirArchivo(ENCABEZADOS_MINIMOS, [
      ...Array.from({ length: 38 }, (_, i) => ({ ...filaMinima(i), Canon: '' })),
      ...Array.from({ length: 72 }, (_, i) => filaMinima(i + 38)),
    ])

    const aviso = container.querySelector('[data-testid="avisos-del-archivo"]')
    expect(aviso?.textContent).toContain('38 de 110 filas quedan sin canon')
    // Avisa, no bloquea: esas filas piden el dato en la lista de trabajo.
    expect(botonRevisar()?.disabled).toBe(false)
  })

  it('no avisa cuando el archivo viene completo', async () => {
    render()
    await esperar()
    await subirArchivoMinimo(10)
    expect(container.querySelector('[data-testid="avisos-del-archivo"]')).toBeNull()
  })

  it('marca en la tabla la columna que se entendió por una palabra genérica', async () => {
    render()
    await esperar()
    // «Ciudad» a secas puede ser la del inmueble o la del propietario.
    await subirArchivo(
      [...ENCABEZADOS_MINIMOS, 'Ciudad'],
      [{ ...filaMinima(), Ciudad: 'Bogotá' }],
    )

    expect(container.querySelector('[data-testid="dudosa-Ciudad"]')).toBeTruthy()
    expect(
      container.querySelector('[data-testid="mapeos-dudosos"]')?.textContent,
    ).toContain('«Ciudad»')
    // Una columna dudosa NO frena: se confirma, no se exige.
    expect(botonRevisar()?.disabled).toBe(false)
  })

  it('lo que se entendió sin dudas no lleva marca', async () => {
    render()
    await esperar()
    await subirArchivoMinimo()
    expect(container.querySelector('[data-testid="mapeos-dudosos"]')).toBeNull()
    expect(
      container.querySelector('[data-testid="dudosa-Dirección del inmueble"]'),
    ).toBeNull()
  })
})

/**
 * La cuota de administración: Nico confirmó que en sus archivos es el
 * porcentaje de la inmobiliaria, pero en el mercado suele ser la cuota del
 * edificio EN PESOS. Mapea, pide confirmación, y avisa si los valores tienen
 * cara de plata.
 */
describe('<MigrarContratos> — la cuota de administración', () => {
  it('se mapea a comisión, marcada para confirmar', async () => {
    render()
    await esperar()
    await subirArchivo(
      [...ENCABEZADOS_MINIMOS, 'Cuota de administración'],
      [{ ...filaMinima(), 'Cuota de administración': '10' }],
    )

    expect(
      container.querySelector('[data-testid="dudosa-Cuota de administración"]'),
    ).toBeTruthy()
    expect(botonRevisar()?.disabled).toBe(false)
  })

  it('si el archivo también trae «Comisión», ésa gana y la cuota queda en Ignorar', async () => {
    render()
    await esperar()
    await subirArchivo(
      [...ENCABEZADOS_MINIMOS, 'Cuota de administración', 'Comisión'],
      [{ ...filaMinima(), 'Cuota de administración': '350.000', Comisión: '10' }],
    )

    const previa =
      container.querySelector('[data-testid="vista-previa-migracion"]')?.textContent ?? ''
    // La comisión que viaja es el 10 %, no los $350.000.
    expect(previa).toContain('10 %')
    expect(previa).not.toContain('350.000')
    // Y la cuota, al no quedarse con el campo, no se marca como dudosa.
    expect(
      container.querySelector('[data-testid="dudosa-Cuota de administración"]'),
    ).toBeNull()
  })

  it('avisa con el valor exacto cuando la cuota trae pesos', async () => {
    render()
    await esperar()
    await subirArchivo(
      [...ENCABEZADOS_MINIMOS, 'Cuota de administración'],
      Array.from({ length: 110 }, (_, i) => ({
        ...filaMinima(i),
        'Cuota de administración': '350.000',
      })),
    )

    const aviso = container.querySelector('[data-testid="aviso-comision"]')?.textContent ?? ''
    expect(aviso).toContain('«Cuota de administración»')
    expect(aviso).toContain('«350.000»')
    expect(aviso).toContain('110 de 110 filas')
    expect(aviso).toContain('no parecen un porcentaje')
    // Aviso, no bloqueo.
    expect(botonRevisar()?.disabled).toBe(false)
  })

  it('con porcentajes de verdad no aparece ningún aviso', async () => {
    render()
    await esperar()
    await subirArchivo(
      [...ENCABEZADOS_MINIMOS, 'Cuota de administración'],
      Array.from({ length: 10 }, (_, i) => ({
        ...filaMinima(i),
        'Cuota de administración': '10',
      })),
    )
    expect(container.querySelector('[data-testid="aviso-comision"]')).toBeNull()
    expect(container.querySelector('[data-testid="avisos-del-archivo"]')).toBeNull()
  })
})
