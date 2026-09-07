/**
 * Qué reporte se puede bajar de verdad, y cuál no.
 *
 * ── El problema que resuelve ───────────────────────────────────────────────
 *
 * «Generar» no generaba nada:
 *
 *     await new Promise((resolve) => setTimeout(resolve, 1500));   // simular
 *     setReports(... lastGenerated: now ...);                      // estado local
 *     toast.success('Reporte generado');                           // mentira
 *
 * Un segundo y medio de espera, una fecha guardada en memoria y un cartel
 * verde. Nada salía a la red. Recién después aparecía el botón de descarga, y
 * ese avisaba «PDF en desarrollo». Dos afirmaciones falsas seguidas para
 * terminar en un callejón.
 *
 * ── Lo que hay de verdad ───────────────────────────────────────────────────
 *
 * El back arma el CSV a pedido en `GET /inmobiliaria/reports/export?type=…`.
 * No existe un paso de «generar» separado del de bajar: son la misma acción.
 * Lo que sí existe es una lista finita de tipos que sabe producir —está en
 * `reports.service.ts`, el `switch` de `exportCsv`— y fuera de esa lista el
 * back responde 400.
 *
 * Este archivo es la única fuente de esa lista en el front. Antes estaba
 * repartida en un `EXPORT_TYPE_MAP` dentro del handler, y ahí se habían colado
 * dos errores que sólo se ven comparando contra el back:
 *
 *   · `ocupacion-portafolio` figuraba como PDF, así que el botón caía en la
 *     rama «PDF en desarrollo» — cuando el back SÍ lo produce en CSV. Un
 *     reporte que funcionaba, inalcanzable por una etiqueta de formato.
 *
 *   · `rendimiento-agentes` mapeaba a `comisiones-agente`. Eso no es «no
 *     disponible»: es bajar OTRO reporte con el nombre del que pediste.
 */

import type { ReportId } from '@/lib/types/inmobiliaria'

/** Los tipos que `reports.service.ts` sabe producir. No inventar. */
export type TipoDeExport =
  | 'cartera-edades'
  | 'comisiones-agente'
  | 'vencimientos'
  | 'flujo-caja'
  | 'ocupacion-portafolio'
  | 'rentabilidad-inmueble'

export interface SePuedeBajar {
  disponible: true
  /** El `?type=` que entiende el back. */
  tipo: TipoDeExport
}

export interface NoSePuedeBajar {
  disponible: false
  /** Qué decirle a quien lo intenta. En español, sin jerga. */
  motivo: string
  /** A dónde mandarlo, si hay a dónde. */
  dondeSiHay?: { label: string; href: string }
}

export type Exportable = SePuedeBajar | NoSePuedeBajar

const CATALOGO: Record<ReportId, Exportable> = {
  'cartera-edades': { disponible: true, tipo: 'cartera-edades' },
  'comisiones-agente': { disponible: true, tipo: 'comisiones-agente' },
  'vencimientos': { disponible: true, tipo: 'vencimientos' },
  'flujo-caja': { disponible: true, tipo: 'flujo-caja' },
  'ocupacion-portafolio': { disponible: true, tipo: 'ocupacion-portafolio' },
  // Acepta `desde`/`hasta` (`YYYY-MM`); sin rango el back toma los últimos
  // 12 meses. La pantalla propia los manda; la tarjeta baja el default.
  'rentabilidad-inmueble': { disponible: true, tipo: 'rentabilidad-inmueble' },

  // El extracto es POR propietario y sale del flujo de dispersiones: no hay un
  // archivo único que represente «todos los extractos».
  'extractos-propietarios': {
    disponible: false,
    motivo: 'El extracto se arma por propietario, desde la dispersión de su mes.',
    dondeSiHay: { label: 'Ir a dispersiones', href: '/panel/inmobiliaria/pagos/dispersiones' },
  },

  // Tenía el mapeo a `comisiones-agente`, que devuelve otro reporte. Mejor
  // decir que todavía no está que entregar el equivocado.
  'rendimiento-agentes': {
    disponible: false,
    motivo: 'Todavía no lo generamos. Mientras tanto, Comisiones por Agente trae el detalle por persona.',
    dondeSiHay: undefined,
  },
}

export function comoSeBaja(id: ReportId): Exportable {
  return (
    CATALOGO[id] ?? {
      disponible: false,
      motivo: 'Este reporte todavía no se puede descargar.',
    }
  )
}

/** Para pintar el botón sin repetir la lógica en cada tarjeta. */
export function sePuedeBajar(id: ReportId): boolean {
  return comoSeBaja(id).disponible
}

/**
 * Qué formato tiene el archivo que se va a bajar. `null` = no hay archivo.
 *
 * La tarjeta y el cajón mostraban una insignia con `report.format`, que es un
 * literal de `inmobiliaria-data.ts` («EXCEL» en seis de los ocho, «PDF» en dos)
 * escrito antes de que existiera el export. El botón de al lado dice
 * «Descargar CSV» y lo que baja ES un CSV: `/inmobiliaria/reports/export`
 * responde `text/csv` y `nombreDelArchivo` termina en `.csv`. O sea: la
 * insignia y el botón, pegados, se contradecían — y la que mentía era la
 * insignia.
 *
 * Para los que NO se pueden bajar no hay archivo del cual declarar formato:
 * ahí devuelve `null` y quien lo pinte omite la insignia, en vez de prometer
 * un XLSX que nadie produce.
 */
export function formatoDelArchivo(id: ReportId): 'CSV' | null {
  return comoSeBaja(id).disponible ? 'CSV' : null
}

/** `cartera-edades-2026-08-12.csv` */
export function nombreDelArchivo(tipo: TipoDeExport, hoy: string): string {
  return `${tipo}-${hoy}.csv`
}

/**
 * La ruta del CSV, con los parámetros que el tipo acepte. Los vacíos no
 * viajan: `?type=rentabilidad-inmueble` a secas es «el rango por defecto».
 */
export function rutaDeExport(
  tipo: TipoDeExport,
  params: Record<string, string | undefined> = {},
): string {
  const query = new URLSearchParams({ type: tipo })
  for (const [clave, valor] of Object.entries(params)) {
    if (valor) query.set(clave, valor)
  }
  return `/inmobiliaria/reports/export?${query.toString()}`
}

/**
 * Dispara la descarga en el navegador. Es el mismo baile de `<a download>`
 * que ya hacía `reportes/page.tsx`; sacado acá para que la pantalla de
 * rentabilidad no lo repita.
 */
export function descargarBlob(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revocar en el mismo tick puede cancelar la descarga en Safari/Firefox: el
  // navegador todavía no leyó el blob cuando la URL deja de existir.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
