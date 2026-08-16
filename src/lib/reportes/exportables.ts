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

  // El extracto es POR propietario y sale del flujo de dispersiones: no hay un
  // archivo único que represente «todos los extractos».
  'extractos-propietarios': {
    disponible: false,
    motivo: 'El extracto se arma por propietario, desde la dispersión de su mes.',
    dondeSiHay: { label: 'Ir a dispersiones', href: '/panel/inmobiliaria/dispersiones' },
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

/** `cartera-edades-2026-08-12.csv` */
export function nombreDelArchivo(tipo: TipoDeExport, hoy: string): string {
  return `${tipo}-${hoy}.csv`
}
