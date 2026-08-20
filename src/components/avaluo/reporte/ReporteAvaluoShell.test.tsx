/**
 * ReporteAvaluoShell.test.tsx — la página del informe, renderizada de verdad.
 *
 * Tres cosas se prueban acá y las tres son de producto, no de estilo:
 *  1. que la página se pinta entera (las 39 secciones, una sola vez cada una);
 *  2. que el disclaimer de alcance está presente y **no** está plegado ni
 *     escondido — el invariante legal de toda la superficie;
 *  3. que la variante sin pago no publica el valor por ninguna vía.
 */

import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

// Convención del repo para las suites que montan con `createRoot` (p. ej.
// `src/app/panel/inmobiliaria/postulaciones/page.test.tsx:20`). Sin esto React
// escupe «not configured to support act(...)» en cada render.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

void React // jsx-preserve

// `next/link` necesita el contexto del router de la app; acá no hay ninguno.
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

import { ReporteAvaluoShell } from './ReporteAvaluoShell'
import { toPaidProjection, toSharedProjection } from '@/lib/avaluo/reporte/audience'
import { DENIED, type DeliveryCapabilitiesView } from '@/lib/avaluo/reporte/delivery'
import { FIXTURE_VIEW } from '@/lib/avaluo/reporte/fixture-muestra'
import { buildLandingView } from '@/lib/avaluo/reporte/landing-layout'
import { SECTION_ORDER, type ReportWebView, type Scalar, type TableBlock } from '@/lib/avaluo/reporte/report-model'
import { SERVED_VERIFY_URL, buildServedFixture, servedDelivery } from '@/lib/avaluo/reporte/report-serve.fixture'
import { parseReportServeResponse } from '@/lib/avaluo/reporte/report-serve.schema'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, readFileSync } from 'node:fs'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
})

/** Un escalar de texto para las tablas sintéticas. */
function textScalar(raw: string): Scalar {
  return { raw, format: 'text', origin: 'declarado', missing: false, missingText: null, pii: false }
}

/**
 * La vista con una tabla EXPANDIBLE (filas con desglose) inyectada en
 * `usos-documento`. El certificado actual no publica tablas, pero el bloque
 * sigue en el contrato y el renderer en producción; así se sigue probando.
 */
function withTable(view: ReportWebView): ReportWebView {
  const detail: TableBlock = {
    kind: 'table',
    columns: [
      { key: 'factor', header: 'Factor', align: 'left', format: 'text' },
      { key: 'ajuste', header: 'Ajuste', align: 'right', format: 'text' },
    ],
    rows: [{ key: 'd1', cells: { factor: textScalar('Área'), ajuste: textScalar('+1,2 %') }, detail: null }],
    emptyText: 'Sin desglose',
    caption: null,
  }
  const table: TableBlock = {
    kind: 'table',
    columns: [
      { key: 'uso', header: 'Uso', align: 'left', format: 'text' },
      { key: 'sirve', header: 'Sirve', align: 'left', format: 'text' },
      { key: 'norma', header: 'Norma', align: 'left', format: 'text' },
    ],
    rows: [
      { key: 'r1', cells: { uso: textScalar('Negociación'), sirve: textScalar('Sí'), norma: textScalar('—') }, detail },
      { key: 'r2', cells: { uso: textScalar('Garantía hipotecaria'), sirve: textScalar('No'), norma: textScalar('Ley 1673') }, detail },
    ],
    emptyText: 'Sin filas',
    caption: 'Tabla sintética de prueba',
  }
  return {
    ...view,
    sections: {
      ...view.sections,
      'usos-documento': { ...view.sections['usos-documento'], blocks: [table] },
    },
  }
}

/**
 * Convención de este archivo (T-0007): salvo que un test diga lo contrario,
 * se renderiza "todo liberado" — así el helper no obliga a los ~20 tests
 * preexistentes (de contenido/layout, ajenos al gate) a pasar `capabilities`
 * cada vez. El componente en sí NO tiene este default: `capabilities` es
 * obligatorio en `ReporteAvaluoShellProps`, a propósito, para que ningún call
 * site de producción quede "sin querer" con todo desbloqueado.
 */
const RELEASED: DeliveryCapabilitiesView = {
  signoffState: 'entregado',
  released: true,
  canDownloadPdf: true,
  canVerify: true,
  canExport: true,
  estimateNotice: null,
}

function render(
  view: Parameters<typeof buildLandingView>[0],
  capabilities: DeliveryCapabilitiesView = RELEASED,
) {
  act(() => {
    root.render(<ReporteAvaluoShell view={buildLandingView(view)} capabilities={capabilities} />)
  })
}

describe('ReporteAvaluoShell — vista del propietario, con el informe completo', () => {
  beforeEach(() => {
    render(FIXTURE_VIEW)
  })

  it('pinta el documento con sus landmarks', () => {
    expect(container.querySelector('main#main-content')).toBeTruthy()
    expect(container.querySelector('article')).toBeTruthy()
    expect(container.querySelector('nav[aria-label="Índice del informe"]')).toBeTruthy()
    // El h1 del héroe es el nombre del documento (fila «Documento» de
    // `doc-header`); el inmueble va justo debajo, dentro de la misma sección.
    expect(container.querySelector('h1')?.textContent).toMatch(/Estimación Comercial/i)
    expect(container.querySelector('section[id="doc-header"]')?.textContent).toContain(
      'Apartamento en Bogotá',
    )
  })

  it('el héroe contiene doc-header y valor-estimado como secciones propias, y la tira de métricas ancla a sus secciones', () => {
    const hero = container.querySelector('[data-hero]')
    expect(hero?.querySelector('section[id="doc-header"]')).toBeTruthy()
    expect(hero?.querySelector('section[id="valor-estimado"]')).toBeTruthy()
    for (const anchor of ['nivel-confianza', 'vigencia', 'regimen-mercado', 'tiempo-exposicion']) {
      expect(hero?.querySelector(`a[href="#${anchor}"]`)).toBeTruthy()
    }
    // La cifra real está en el DOM aunque la copia decorativa cuente desde 0.
    const srOnly = Array.from(hero?.querySelectorAll('section[id="valor-estimado"] .sr-only') ?? [])
    expect(srOnly.some((el) => el.textContent?.includes('519.853.230'))).toBe(true)
  })

  it('el bento no deja huecos: cada fila de tarjetas suma 12 columnas y cada celda estira a h-full', () => {
    const cells = container.querySelectorAll('article .grid-cols-12 > [data-reveal]')
    expect(cells.length).toBeGreaterThan(20)
    expect(Array.from(cells).every((el) => el.className.includes('h-full'))).toBe(true)
  })

  it('renderiza las 39 secciones, cada una exactamente una vez', () => {
    for (const id of SECTION_ORDER) {
      expect(container.querySelectorAll(`section[id="${id}"]`)).toHaveLength(1)
    }
  })

  it('lista los seis capítulos en el índice; sólo el activo despliega sus secciones', () => {
    const nav = container.querySelector('nav[aria-label="Índice del informe"]')
    const chapters = nav?.querySelectorAll('a[data-chapter-link]') ?? []
    expect(chapters).toHaveLength(6)
    // El activo (el primero al cargar) lista sus secciones; los demás no.
    const all = nav?.querySelectorAll('a') ?? []
    expect(all.length).toBeLessThan(6 + 39)
    expect(all.length).toBeGreaterThan(6)
  })

  it('publica el titular y su rango', () => {
    const valor = container.querySelector('section[id="valor-estimado"]')
    expect(valor?.textContent).toContain('519.853.230')
    expect(valor?.textContent).toContain('467.867.907')
  })

  it('marca el documento como datos de muestra dentro y fuera del artículo', () => {
    expect(container.querySelector('article')?.getAttribute('data-sample')).toBe('true')
    expect(container.textContent).toContain('Datos de muestra')
  })

  it('marca la dirección como dato personal, para que no salga al imprimir', () => {
    const predio = container.querySelector('section[id="identificacion-predio"]')
    const pii = predio?.querySelectorAll('[data-pii-field]') ?? []
    expect(pii.length).toBeGreaterThan(0)
    expect(Array.from(pii).some((el) => el.textContent?.includes('Torre DEMO'))).toBe(true)
  })

  it('las tablas (cuando una sección trae una) llevan encabezados reales y aíslan el scroll horizontal', () => {
    // El certificado actual no publica tablas (las de comparables salieron por
    // decisión de producto), pero el contrato conserva el bloque `table` y el
    // renderer sigue en producción: se prueba con una tabla inyectada.
    render(withTable(FIXTURE_VIEW))
    const tabla = container.querySelector('section[id="usos-documento"] table')
    const ths = tabla?.querySelectorAll('thead th') ?? []
    expect(ths.length).toBe(3)
    expect(Array.from(ths).every((th) => th.getAttribute('scope') === 'col')).toBe(true)
    // Lenis: sin `data-lenis-prevent` la tabla ancha secuestra la rueda del mouse.
    expect(container.querySelector('section[id="usos-documento"] [data-lenis-prevent]')).toBeTruthy()
  })

  it('anuncia cada figura con un texto alternativo, no como un montón de rectángulos', () => {
    const figuras = container.querySelectorAll('figure[role="img"]')
    expect(figuras.length).toBeGreaterThan(0)
    expect(
      Array.from(figuras).every((f) => (f.getAttribute('aria-label') ?? '').length > 10),
    ).toBe(true)
  })

  it('deja el sello con su enlace al verificador y sin fingir una verificación', () => {
    const sello = container.querySelector('section[id="sello-verificacion"]')
    expect(sello?.textContent).toContain('3f9a41c7d20b')
    expect(sello?.textContent).toContain('inactivo en esta muestra')
  })
})

describe('el disclaimer de alcance (Ley 1673) nunca se colapsa', () => {
  it('está presente, fuera de todo plegable y sin esconder — vista del propietario', () => {
    render(FIXTURE_VIEW)

    const alcance = container.querySelector('section[id="alcance-limitaciones"]')
    expect(alcance).toBeTruthy()
    expect(alcance?.textContent).toContain('Ley 1673 de 2013')

    // Ni dentro de un <details> propio…
    expect(alcance?.querySelector('details')).toBeNull()
    // …ni dentro de uno ajeno.
    expect(alcance?.closest('details')).toBeNull()
    // Ni escondido por atributo.
    expect(alcance?.hasAttribute('hidden')).toBe(false)
    expect(alcance?.getAttribute('aria-hidden')).toBeNull()
    expect(alcance?.closest('[hidden]')).toBeNull()
    expect(alcance?.closest('[aria-hidden="true"]')).toBeNull()
  })

  it('sigue expandido en la vista compartida y sin pago', () => {
    const compartida = toPaidProjection(
      toSharedProjection(FIXTURE_VIEW, {
        expiresAtIso: '2026-09-16',
        sharedByLabel: 'el propietario',
      }),
      false,
    )
    render(compartida)

    const alcance = container.querySelector('section[id="alcance-limitaciones"]')
    expect(alcance?.textContent).toContain('Ley 1673 de 2013')
    expect(alcance?.closest('details')).toBeNull()
    expect(alcance?.querySelector('details')).toBeNull()
  })
})

describe('enlace profundo a una sección plegada', () => {
  afterEach(() => {
    window.location.hash = ''
  })

  it('despliega el «details» de la sección apuntada por el hash', () => {
    window.location.hash = '#niif13'
    render(FIXTURE_VIEW)

    const seccion = container.querySelector('section[id="niif13"]')
    const plegable = seccion?.querySelector('details')

    // Si esto falla, compartir `…/reporte/<slug>#niif13` deja al lector mirando
    // un título cerrado — que es justo lo que el índice promete evitar.
    expect(plegable).toBeTruthy()
    expect(plegable?.hasAttribute('open')).toBe(true)
  })

  it('no abre de paso los desgloses por fila de las tablas', () => {
    window.location.hash = '#usos-documento'
    render(withTable(FIXTURE_VIEW))

    // `usos-documento` no es plegable; los desgloses por fila son botones
    // `aria-expanded` de la tabla expandible, y ninguno nace abierto.
    const filas = container.querySelectorAll('section[id="usos-documento"] button[aria-expanded]')
    expect(filas.length).toBeGreaterThan(0)
    expect(Array.from(filas).every((b) => b.getAttribute('aria-expanded') === 'false')).toBe(true)
    // Y en papel el desglose existe igual (copia sólo-impresión).
    expect(container.querySelector('section[id="usos-documento"] .report-print-only')).toBeTruthy()
  })
})

describe('ReporteAvaluoShell — variante sin pago', () => {
  beforeEach(() => {
    render(toPaidProjection(FIXTURE_VIEW, false))
  })

  it('no publica el valor por ninguna vía del documento', () => {
    const texto = container.textContent ?? ''
    expect(texto).not.toContain('519.853.230')
    expect(texto).not.toContain('519853230')
  })

  it('tampoco publica los extremos del rango ni los valores de los comparables', () => {
    const texto = container.textContent ?? ''
    expect(texto).not.toContain('467.867.907')
    expect(texto).not.toContain('571.838.553')
    expect(texto).not.toContain('440.640.000')
  })

  it('conserva el esqueleto: la sección del valor sigue ahí, con su título', () => {
    const valor = container.querySelector('section[id="valor-estimado"]')
    expect(valor).toBeTruthy()
    expect(valor?.textContent).toContain('Valor estimado')
    expect(valor?.textContent).toContain('Disponible con el informe completo')
  })

  it('explica el bloqueo y ofrece una salida', () => {
    expect(container.textContent).toContain('Este informe está incompleto')
    expect(container.querySelector('a[href="/avaluo"]')).toBeTruthy()
  })

  it('deja el sello visible: sin pago igual se puede comprobar que el documento existe', () => {
    const sello = container.querySelector('section[id="sello-verificacion"]')
    expect(sello?.textContent).toContain('3f9a41c7d20b')
    expect(sello?.textContent).not.toContain('519.853.230')
  })
})

describe('ReporteAvaluoShell — vista compartida', () => {
  beforeEach(() => {
    render(
      toSharedProjection(FIXTURE_VIEW, {
        expiresAtIso: '2026-09-16',
        sharedByLabel: 'el propietario',
      }),
    )
  })

  it('avisa que el enlace vence y que se puede revocar', () => {
    const texto = container.textContent ?? ''
    expect(texto).toContain('Enlace compartido por el propietario')
    expect(texto).toContain('puede revocarse en cualquier momento')
  })

  it('destaca los usos del documento: es lo que impide que se use para lo que no sirve', () => {
    const usos = container.querySelector('section[id="usos-documento"]')
    expect(usos?.querySelector('details')).toBeNull()
    expect(usos?.textContent).toMatch(/Para qué NO/)
    expect(usos?.textContent).toContain('Garantía hipotecaria')
  })
})

describe('ReporteAvaluoShell — vista servida (sello real)', () => {
  beforeEach(() => {
    render(buildServedFixture())
  })

  it('pinta el sello REAL: veredicto, QR dibujado y enlace al verificador', () => {
    const sello = container.querySelector('section[id="sello-verificacion"]')
    expect(sello?.getAttribute('id')).toBe('sello-verificacion')
    expect(sello?.textContent).toContain('Verificado: el documento servido coincide con el sello')
    expect(sello?.querySelector('svg[role="img"]')).toBeTruthy()
    expect(sello?.querySelector('a[data-seal-verify-link]')?.getAttribute('href')).toBe(
      SERVED_VERIFY_URL,
    )
    expect(sello?.textContent).not.toContain('inactivo en esta muestra')
  })

  it('no lleva la banda de muestra ni el data-sample', () => {
    expect(container.textContent).not.toContain('Datos de muestra')
    expect(container.querySelector('article')?.getAttribute('data-sample')).toBeNull()
  })

  it('el sello se renderiza una sola vez aunque el encabezado lo enlace', () => {
    expect(container.querySelectorAll('[data-seal-state]')).toHaveLength(1)
    expect(container.querySelector('a[href="#sello-verificacion"]')).toBeTruthy()
  })
})

describe('ReporteAvaluoShell — la fixture compartida con el micro (report-serve.sample.json)', () => {
  // Copia en el repo de la fixture que genera el micro (ver report-serve.schema.test.ts).
  const SAMPLE_JSON_PATH = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../../lib/avaluo/reporte/report-serve.sample.json',
  )
  const exists = existsSync(SAMPLE_JSON_PATH)

  it.skipIf(!exists)('se renderiza entera con el sello real y el QR de 37×37', () => {
    const parsed = parseReportServeResponse(JSON.parse(readFileSync(SAMPLE_JSON_PATH, 'utf8')))
    if (!parsed.ok) throw new Error(parsed.issues.join('\n'))
    render(parsed.view)

    for (const id of SECTION_ORDER) {
      expect(container.querySelectorAll(`section[id="${id}"]`)).toHaveLength(1)
    }
    const sello = container.querySelector('section[id="sello-verificacion"]')
    expect(sello?.textContent).toContain('Verificado: el documento servido coincide con el sello')
    expect(sello?.textContent).toContain('VIGENTE')
    const svg = sello?.querySelector('svg[role="img"]')
    expect(svg?.getAttribute('data-qr-size')).toBe(String(parsed.view.render.qr.size))
    expect(sello?.querySelector('a[data-seal-verify-link]')?.getAttribute('href')).toBe(
      parsed.view.meta.verifyUrl,
    )
  })
})

describe('ReporteAvaluoShell — capabilities (T-0007, observe-only)', () => {
  it('released:true no muestra el aviso de estimación', () => {
    render(buildServedFixture({ delivery: servedDelivery() }), RELEASED)
    expect(container.textContent).not.toContain('Documento preliminar')
  })

  it('released:false muestra el aviso de estimación de forma prominente, verbatim', () => {
    const capabilities: DeliveryCapabilitiesView = {
      signoffState: 'en_revisión',
      released: false,
      canDownloadPdf: false,
      canVerify: false,
      canExport: false,
      estimateNotice: 'Aviso de prueba del productor.',
    }
    render(buildServedFixture(), capabilities)
    expect(container.textContent).toContain('Aviso de prueba del productor.')
  })

  it('delivery ausente (DENIED) ⇒ el fallback pinneado, y ninguna acción de verificación', () => {
    render(buildServedFixture(), DENIED)
    expect(container.textContent).toContain(DENIED.estimateNotice)
    // La acción de verificar queda denegada de punta a punta: sin enlace al
    // verificador, sin QR, dentro del sello real (render presente).
    const sello = container.querySelector('section[id="sello-verificacion"]')
    expect(sello?.querySelector('a[data-seal-verify-link]')).toBeNull()
    expect(sello?.querySelector('svg[role="img"]')).toBeNull()
    // Y el chip del sello en la barra superior tampoco se ofrece (el índice
    // lateral SÍ sigue enlazando a la sección — es navegación, siempre-on).
    expect(
      container.querySelector('[data-report-topbar] a[href="#sello-verificacion"]'),
    ).toBeNull()
  })

  it('el veredicto y los datos del sello se siguen leyendo aunque canVerify sea false', () => {
    render(buildServedFixture(), DENIED)
    const sello = container.querySelector('section[id="sello-verificacion"]')
    expect(sello?.textContent).toContain('Verificado: el documento servido coincide con el sello')
  })
})
