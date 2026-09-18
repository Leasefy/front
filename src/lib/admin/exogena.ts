/**
 * exogena.ts (admin) — los conceptos de exógena y el tope de cuantías menores,
 * cargados por Leasefy y heredados por las inmobiliarias.
 *
 * Contrato (admin backend, `NEXT_PUBLIC_ADMIN_API_URL` + `/api/v1/admin`,
 * `AdminAllowlistGuard`; back-erp/src/admin/resources/exogena/):
 *   GET  /exogena/anios             → { disponible, anios[] }
 *   GET  /exogena/anios/:anio       → un año con todos sus conceptos (sin usar
 *                                     todavía: el listado ya trae el conteo)
 *   PUT  /exogena/anios             → crea o corrige el año. NO publica
 *   PUT  /exogena/conceptos         → REEMPLAZA los conceptos del año (sin usar
 *                                     todavía: la pantalla siembra y publica)
 *   POST /exogena/conceptos/semilla → siembra con el preset del código
 *   POST /exogena/publicar          → publica o despublica
 *
 * ── 🔴 Publicar es un acto aparte, y ése es el punto ───────────────────────
 *
 * Un año sin publicar NO lo hereda nadie. Sin eso, media carga a medio hacer ya
 * estaría rigiendo en 300 inmobiliarias — y un código de concepto equivocado no
 * se ve: pasa el prevalidador y llega mal a la DIAN. Por eso ni `guardarAnio`
 * ni `sembrarConceptos` publican, y publicar tiene su propia llamada.
 *
 * ── 🔴 Un desajuste del back, envuelto acá y NO adivinado ──────────────────
 *
 * `POST /exogena/conceptos/semilla` está declarado con `PublicarDto`, que exige
 * `publicado: boolean`. El servicio lo IGNORA (sólo usa `anio`), pero el
 * `ValidationPipe` corre con `whitelist` + `forbidNonWhitelisted`, así que un
 * cuerpo de `{ anio }` a secas es un 400 «publicado must be a boolean value».
 * `sembrar()` manda `publicado: false` para pasar la validación, que es lo
 * único que no cambia nada del lado del servidor — sembrar no publica. Está
 * reportado; cuando el back tenga su propio DTO, esta línea se borra.
 */

import { adminApi } from './api'

const PATH = '/exogena'

export interface AnioDeExogenaRow {
  anio: number
  /** Qué resolución de la DIAN rige el año. `null` = no se cargó. */
  resolucion: string | null
  /**
   * 🔴 `null` = no se agrupa NADA, y no es cero: agrupar con un tope inventado
   * esconde terceros que había que declarar uno por uno.
   */
  topeCuantiasMenoresCop: number | null
  nitCuantiasMenores: string | null
  publicado: boolean
  publicadoAt: string | null
  notas: string | null
  actualizadoPor: string | null
}

/** Una fila del listado: la del año más cuántos conceptos tiene cargados. */
export interface AnioEnLaLista extends AnioDeExogenaRow {
  conceptos: number
}

/** `disponible: false` = faltan las tablas (migración 69) y no hay nada cargado. */
export interface ListaDeAnios {
  disponible: boolean
  anios: AnioEnLaLista[]
}

/** Lo que el preset NO puede proponer: hay que leerlo en la resolución. */
export interface SinSugerencia {
  formato: string | null
  codigoPuc: string
  nombre: string
}

export interface ResultadoDeLaSemilla {
  sembrados: number
  sinSugerencia: SinSugerencia[]
  /** El texto del back: el preset es de uso corriente, no la resolución. */
  aviso: string
}

/** `GuardarAnioDto`. `anio` obligatorio; el resto opcional. NO publica. */
export interface AnioNuevo {
  anio: number
  resolucion?: string
  topeCuantiasMenoresCop?: number
  nitCuantiasMenores?: string
  notas?: string
}

/** Los años cargados, con cuántos conceptos tiene cada uno y si está publicado. */
export function listarAnios(signal?: AbortSignal): Promise<ListaDeAnios> {
  return adminApi<ListaDeAnios>(`${PATH}/anios`, { signal })
}

/**
 * Crea o corrige el año. **No publica**: cargar y soltar no son el mismo clic.
 *
 * Las claves van explícitas y sólo si tienen valor — el `ValidationPipe` del
 * back corre con `forbidNonWhitelisted` y una clave de más es un 400.
 */
export function guardarAnio(datos: AnioNuevo): Promise<AnioDeExogenaRow> {
  const body: Record<string, unknown> = { anio: datos.anio }
  if (datos.resolucion !== undefined) body.resolucion = datos.resolucion
  if (datos.topeCuantiasMenoresCop !== undefined) {
    body.topeCuantiasMenoresCop = datos.topeCuantiasMenoresCop
  }
  if (datos.nitCuantiasMenores !== undefined) body.nitCuantiasMenores = datos.nitCuantiasMenores
  if (datos.notas !== undefined) body.notas = datos.notas
  return adminApi<AnioDeExogenaRow>(`${PATH}/anios`, { method: 'PUT', body })
}

/**
 * Siembra el año con el preset del código y devuelve los que nadie puede
 * proponer. No publica.
 *
 * 🔴 `publicado: false` va porque el back declara esta ruta con `PublicarDto`
 * y sin esa clave la validación responde 400. El servicio no la lee.
 */
export function sembrarConceptos(anio: number): Promise<ResultadoDeLaSemilla> {
  return adminApi<ResultadoDeLaSemilla>(`${PATH}/conceptos/semilla`, {
    method: 'POST',
    body: { anio, publicado: false },
  })
}

/** Publica o despublica. 400 si el año no tiene ningún concepto cargado. */
export function publicarAnio(anio: number, publicado: boolean): Promise<AnioDeExogenaRow> {
  return adminApi<AnioDeExogenaRow>(`${PATH}/publicar`, {
    method: 'POST',
    body: { anio, publicado },
  })
}
