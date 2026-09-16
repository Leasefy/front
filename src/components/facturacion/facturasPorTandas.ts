/**
 * facturasPorTandas — 3.824 facturas no viajan en un solo request.
 *
 * 🔴 Auditoría de casos de error, 13-09 (F3): el DTO del back acepta hasta
 * 5.000 claves (`GenerarFacturasDto`, `ArrayMaxSize(5000)`), y la cartera real
 * de Nico son 1.912 contratos = 3.824 facturas. Mandarlas juntas es un request
 * que el back recorre en tandas de 100 transacciones, cada una recalculando el
 * listado: minutos colgado de una conexión HTTP, con un spinner sin número y a
 * merced del timeout del gateway. Si el gateway corta, la pantalla dice
 * «falló» sobre facturas que SÍ quedaron emitidas.
 *
 * Acá se parte desde el front, con el mismo molde que
 * `migracion/asientosPorTandas.ts`: tandas chicas, progreso real y un
 * «Detener» que se respeta al cerrar la tanda en curso.
 *
 * ── Por qué reenviar es seguro ─────────────────────────────────────────────
 *
 * El back es idempotente por la llave única `(contract_id, mes,
 * destinatario)`: una factura que ya salió vuelve como «ya estaba» o
 * directamente no figura como por emitir. Por eso el informe puede decir, sin
 * mentir, «vuelve a apretar Generar: las que ya salieron no se duplican».
 *
 * ── De dónde sale cada número (F2) ─────────────────────────────────────────
 *
 * El back devuelve, por request, `emitidas`, `yaEstaban`, `sinNumero` y
 * `motivo`. NO devuelve una lista de las que fallaron: una tanda es todo o
 * nada del lado del back. Lo que el front sí sabe es cuántas claves mandó en
 * cada tanda, así que:
 *
 *   · lo que el back no contó en ninguno de sus tres números son claves que al
 *     llegar la orden ya no estaban por emitir (otra persona las emitió, o el
 *     contrato dejó de tocar el mes) → `yaNoEstabanPorEmitir`;
 *   · la tanda que tiró un error pudo quedar emitida EN PARTE (el back la
 *     parte en transacciones de a 100) → `sinConfirmar`, dicho así;
 *   · lo que no llegó a salir → `sinEnviar`.
 */

import type { ResultadoDeGeneracion } from '@/lib/api/facturacion-por-mes.service'

/**
 * Cuántas claves por request. Dos transacciones del back (`FACTURAS_POR_TANDA
 * = 100` en `facturacion.service.ts`): vuelve en segundos, y con 3.824 son 20
 * llamadas, suficientes para que la barra se mueva.
 */
export const FACTURAS_POR_TANDA = 200

export interface ProgresoDeFacturas {
  /** Claves ya enviadas y respondidas, sumando las tandas. Lo que mide la barra. */
  hechas: number
  total: number
  /** En cuál va, 1-based, y de cuántas. */
  tanda: number
  tandas: number
}

export interface InformeDeFacturas {
  mes: string
  /** Las elegidas, todas. */
  pedidas: number
  emitidas: number
  /** Las que el back encontró ya emitidas al escribir (la llave única). */
  yaEstaban: number
  /** Las que no se numeraron porque el rango de la resolución no alcanzó. */
  sinNumero: number
  /** Enviadas que al llegar ya no figuraban como por emitir. No es un error. */
  yaNoEstabanPorEmitir: number
  /** Las de la tanda que falló: pueden haber quedado emitidas en parte. */
  sinConfirmar: number
  /** No llegaron a salir: se detuvo, se agotó el rango o falló una tanda antes. */
  sinEnviar: number
  totalCop: number
  /** Los motivos del back, sin repetir. */
  motivos: string[]
}

/** Por qué terminó la corrida. */
export type CorteDeLaCorrida = 'completa' | 'detenida' | 'rangoAgotado' | 'fallo'

export interface ResultadoDeLaCorrida {
  informe: InformeDeFacturas
  corte: CorteDeLaCorrida
  /** Lo que tiró la tanda que falló, entero. `null` si ninguna falló. */
  error: unknown
}

/** En cuántas tandas se parte, con el tamaño real que se va a usar. */
export function tandasDeFacturas(total: number, tamano = FACTURAS_POR_TANDA): number {
  return total <= 0 ? 0 : Math.ceil(total / Math.max(1, tamano))
}

/** ¿Quedó algo sin emitir que valga la pena volver a intentar o revisar? */
export function quedaronPendientes(informe: InformeDeFacturas): boolean {
  return informe.sinNumero + informe.sinConfirmar + informe.sinEnviar > 0
}

function trozos<T>(todo: readonly T[], tamano: number): T[][] {
  const salida: T[][] = []
  for (let i = 0; i < todo.length; i += tamano) salida.push(todo.slice(i, i + tamano))
  return salida
}

/**
 * Emite las claves elegidas, tanda por tanda, y devuelve UN informe.
 *
 * Nunca rechaza: un fallo de una tanda es un resultado (`corte: 'fallo'`, con
 * el error entero), porque lo que ya salió en las tandas anteriores tiene que
 * llegar al informe igual. Tirar la excepción hacia arriba era exactamente el
 * defecto: «No se pudieron emitir las facturas» sobre 3.600 que sí salieron.
 */
export async function generarPorTandas(
  mes: string,
  claves: readonly string[],
  generar: (mes: string, claves: string[]) => Promise<ResultadoDeGeneracion>,
  onProgreso?: (p: ProgresoDeFacturas) => void,
  opciones: { debeParar?: () => boolean; tamano?: number } = {},
): Promise<ResultadoDeLaCorrida> {
  const tamano = Math.max(1, opciones.tamano ?? FACTURAS_POR_TANDA)
  const partes = trozos(claves, tamano)

  const informe: InformeDeFacturas = {
    mes,
    pedidas: claves.length,
    emitidas: 0,
    yaEstaban: 0,
    sinNumero: 0,
    yaNoEstabanPorEmitir: 0,
    sinConfirmar: 0,
    sinEnviar: 0,
    totalCop: 0,
    motivos: [],
  }
  let corte: CorteDeLaCorrida = 'completa'
  let error: unknown = null
  let enviadas = 0

  for (const [i, parte] of partes.entries()) {
    let r: ResultadoDeGeneracion
    try {
      r = await generar(mes, parte)
    } catch (e) {
      corte = 'fallo'
      error = e
      informe.sinConfirmar = parte.length
      informe.sinEnviar = claves.length - enviadas - parte.length
      break
    }

    enviadas += parte.length
    informe.emitidas += r.emitidas
    informe.yaEstaban += r.yaEstaban
    informe.sinNumero += r.sinNumero
    informe.totalCop += r.totalCop
    informe.yaNoEstabanPorEmitir += Math.max(
      0,
      parte.length - r.emitidas - r.yaEstaban - r.sinNumero,
    )
    if (r.motivo && !informe.motivos.includes(r.motivo)) informe.motivos.push(r.motivo)

    onProgreso?.({ hechas: enviadas, total: claves.length, tanda: i + 1, tandas: partes.length })

    const quedan = claves.length - enviadas

    /*
     * El rango de la resolución se acabó: las tandas siguientes caerían en el
     * 400 «no hay resolución vigente» una por una. Se corta y se dice cuántas
     * no salieron, con el motivo del back.
     */
    if (r.sinNumero > 0) {
      corte = 'rangoAgotado'
      informe.sinEnviar = quedan
      break
    }

    // «Detener» se respeta al cerrar la tanda en curso: cortar a mitad de un
    // request no deshace lo que el back ya escribió, sólo lo esconde.
    if (quedan > 0 && opciones.debeParar?.() === true) {
      corte = 'detenida'
      informe.sinEnviar = quedan
      break
    }
  }

  return { informe, corte, error }
}
