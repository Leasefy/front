/**
 * asientosPorTandas — un archivo de 116.262 asientos entra sin partirlo a mano.
 *
 * 🔴 Nico, 2026-09-12, frente a «Son 116262 asientos y un lote admite hasta
 * 5000. Parte el archivo (por año, por ejemplo) y súbelo en tandas»:
 * «debemos ampliar lo del lote porque mira que pueden llegar a ser muchos».
 *
 * Ampliar el tope del back no es la salida y por eso no se hizo: el
 * body-parser está en 15 MB (`main.ts`) y 116.000 asientos con sus
 * movimientos no caben en un request pase lo que pase. El tope de 5.000 no es
 * una restricción arbitraria, es el tamaño de pedazo que se puede reintentar.
 *
 * Lo que estaba mal era quién partía el archivo. Partirlo a mano son 24
 * exportaciones de Excel, 24 nombres de lote y ninguna forma de saber dónde se
 * quedó. Acá se parte solo, con el MISMO nombre de lote para todas las tandas:
 * la idempotencia del back es por `(lote, clave)`, así que reenviar es seguro
 * y las tandas no se pisan entre ellas.
 *
 * Es exactamente lo que `DocumentosContables` ya hacía con `leerCsvEnTrozos`
 * desde el 2026-09-05 — el paso hermano, el mismo archivo de 116.469 filas.
 */

import {
  MAX_ASIENTOS_POR_LOTE,
  type AsientoMigrado,
  type CuentaFaltante,
  type InformeDeMigracion,
  type LoteDeAsientos,
  type MotivoDeRechazo,
  type RevisionDeLote,
} from '@/lib/api/contabilidad.service';
import {
  aplicarAsientosCompleto,
  type ProgresoDeAsientos,
} from './aplicarAsientosCompleto';

/**
 * Cuántas filas rechazadas se guardan para mostrar en la tabla.
 *
 * `revision.filas` trae TODAS las filas del lote con su veredicto. Con 116.000
 * asientos eso es una segunda copia entera del archivo en memoria, encima de
 * la que ya tiene el componente. Sólo se acumulan las RECHAZADAS —las únicas
 * que la pantalla dibuja— y hasta este tope.
 *
 * 🔴 Lo que se deja afuera se DICE (`rechazadasNoListadas`). Truncar en
 * silencio es cómo alguien concluye que ya revisó todo.
 */
export const TOPE_DE_RECHAZADAS = 2_000;

export interface ProgresoDeTandas {
  /** Asientos ya procesados, sumando las tandas. Lo que mide la barra. */
  hechos: number;
  total: number;
  /** En cuál va, 1-based, y de cuántas. Para poder decirlo en palabras. */
  tanda: number;
  tandas: number;
}

interface Corte {
  detenidoPorPersona: boolean;
}

export interface ResultadoDeRevision extends Corte {
  revision: RevisionDeLote;
  /** Rechazadas que no entraron en `revision.filas` por el tope. */
  rechazadasNoListadas: number;
}

export interface ResultadoDeAplicacion extends Corte {
  informe: InformeDeMigracion;
  /** Una tanda dejó de avanzar o topó el número de llamadas. */
  detenidoSinAvance: boolean;
}

/** En cuántas tandas se parte, con el tamaño real que se va a usar. */
export function tandasDe(total: number, tamano = MAX_ASIENTOS_POR_LOTE): number {
  return total <= 0 ? 0 : Math.ceil(total / tamano);
}

/**
 * Las tandas, con el índice de su primer asiento en el archivo (`desde`).
 *
 * MC-27 (MIG-C, 04-10): dos asientos SIN número con la misma fecha y la misma
 * descripción —las piezas de dos pagos idénticos del mismo día, que
 * `armarAsientos` ya no funde— no se separan entre dos tandas: el back los
 * distingue con un ordinal POR ENVÍO («#2»), y en envíos distintos el segundo
 * se tomaría por «ya migrado» y se perdería. El corte se corre hacia atrás
 * (nunca hacia adelante: el tope por envío es del back). Una racha más larga
 * que una tanda entera se corta igual (no hay otra forma de mandarla).
 */
export function trozosConInicio(
  todo: readonly AsientoMigrado[],
  tamano: number,
): { inicio: number; parte: AsientoMigrado[] }[] {
  const pieza = (a: AsientoMigrado | undefined) =>
    a && !a.numeroOriginal ? `${a.fecha}|${a.descripcion}` : null;
  const salida: { inicio: number; parte: AsientoMigrado[] }[] = [];
  let inicio = 0;
  while (inicio < todo.length) {
    let fin = Math.min(inicio + tamano, todo.length);
    if (fin < todo.length) {
      let corte = fin;
      while (corte > inicio + 1 && pieza(todo[corte - 1]) !== null && pieza(todo[corte - 1]) === pieza(todo[corte])) {
        corte -= 1;
      }
      // Toda la tanda es una sola racha: se corta en el tope.
      if (corte > inicio + 1 || pieza(todo[inicio]) !== pieza(todo[fin])) fin = corte;
    }
    salida.push({ inicio, parte: todo.slice(inicio, fin) });
    inicio = fin;
  }
  return salida;
}

/** Une dos listas de «X con las filas que lo usan» sin repetir la llave. */
function unirPorLlave<T extends { filas: number[] }>(
  acumulado: T[],
  nuevas: readonly T[],
  llave: (x: T) => string,
): T[] {
  const porLlave = new Map(acumulado.map((x) => [llave(x), x]));
  for (const nueva of nuevas) {
    const ya = porLlave.get(llave(nueva));
    if (ya) ya.filas = [...ya.filas, ...nueva.filas];
    else porLlave.set(llave(nueva), { ...nueva, filas: [...nueva.filas] });
  }
  return [...porLlave.values()];
}

/** La revisión de una tanda con los números de asiento del ARCHIVO entero. */
function conNumerosDelArchivo(r: RevisionDeLote, base: number): RevisionDeLote {
  if (base === 0) return r;
  const correr = <T extends { filas: number[] }>(xs: readonly T[] | undefined): T[] =>
    (xs ?? []).map((x) => ({ ...x, filas: x.filas.map((f) => f + base) }));
  return {
    ...r,
    cuentasFaltantes: correr(r.cuentasFaltantes),
    motivos: correr(r.motivos),
    avisos: correr(r.avisos),
    filas: r.filas.map((f) => ({ ...f, fila: f.fila + base })),
  };
}

const porCodigo = (c: CuentaFaltante) => c.codigo;
const porMotivo = (m: MotivoDeRechazo) => m.motivo;

/**
 * Revisa el archivo entero, tanda por tanda, y devuelve UNA revisión.
 *
 * Los conteos se suman; las cuentas que faltan y los motivos de rechazo se
 * unen por su llave para que «240805 no está en el PUC» no aparezca 24 veces,
 * una por tanda.
 */
export async function revisarPorTandas(
  lote: string,
  asientos: readonly AsientoMigrado[],
  revisar: (lote: { lote: string; asientos: AsientoMigrado[] }) => Promise<RevisionDeLote>,
  onProgreso?: (p: ProgresoDeTandas) => void,
  opciones: { debeParar?: () => boolean; tamano?: number } = {},
): Promise<ResultadoDeRevision> {
  const tamano = opciones.tamano ?? MAX_ASIENTOS_POR_LOTE;
  const tandas = trozosConInicio(asientos, tamano);
  const partes = tandas.map((t) => t.parte);

  const acumulada: RevisionDeLote = {
    lote,
    total: 0,
    listas: 0,
    rechazadas: 0,
    yaMigradas: 0,
    cuentasFaltantes: [],
    motivos: [],
    avisos: [],
    filas: [],
  };
  let rechazadasNoListadas = 0;
  let detenidoPorPersona = false;
  let hechos = 0;

  for (const [i, parte] of partes.entries()) {
    const r0 = await revisar({ lote, asientos: parte });
    /*
     * 🔴 QA-MIG-B (04-10): el back numera los asientos DENTRO de la tanda
     * (1…5.000). Sin correrlos, el asiento 9 de la segunda tanda se mostraba
     * como «9» y el contador buscaba en otro lado: es el 5.009 del archivo.
     */
    const r = conNumerosDelArchivo(r0, tandas[i].inicio);

    acumulada.total += r.total;
    acumulada.listas += r.listas;
    acumulada.rechazadas += r.rechazadas;
    acumulada.yaMigradas += r.yaMigradas;
    acumulada.cuentasFaltantes = unirPorLlave(acumulada.cuentasFaltantes, r.cuentasFaltantes, porCodigo);
    acumulada.motivos = unirPorLlave(acumulada.motivos, r.motivos, porMotivo);
    // QA-MIG-B: lo que entra con una nota se une igual que los motivos.
    acumulada.avisos = unirPorLlave(acumulada.avisos ?? [], r.avisos ?? [], porMotivo);

    // Sólo las rechazadas, y hasta el tope: son las únicas que se dibujan.
    for (const fila of r.filas) {
      if (fila.estado !== 'RECHAZADA') continue;
      if (acumulada.filas.length < TOPE_DE_RECHAZADAS) acumulada.filas.push(fila);
      else rechazadasNoListadas += 1;
    }

    hechos += parte.length;
    onProgreso?.({ hechos, total: asientos.length, tanda: i + 1, tandas: partes.length });

    // Se respeta DESPUÉS de la tanda en curso: revisar no escribe nada, así
    // que cortar a mitad no deja nada a medias — sólo una revisión parcial,
    // que es lo que el resultado dice.
    if (opciones.debeParar?.() === true && i < partes.length - 1) {
      detenidoPorPersona = true;
      break;
    }
  }

  return { revision: acumulada, rechazadasNoListadas, detenidoPorPersona };
}

/**
 * Aplica el archivo entero, tanda por tanda.
 *
 * Cada tanda va por `aplicarAsientosCompleto`, que es quien maneja el OTRO
 * corte: el del reloj del back, que devuelve a los 15 s con `restantes`. Son
 * dos particiones distintas y anidadas —por tamaño de request afuera, por
 * tiempo adentro— y ninguna reemplaza a la otra: sin la de afuera el request
 * no cabe; sin la de adentro la llamada no vuelve.
 *
 * T-0125 · CADA llamada declara de qué archivo es y en qué posición empieza
 * (`totalDelArchivo` = el archivo ENTERO, `desde` = índice de la primera fila
 * de la tanda). Así el back lleva un prefijo contiguo del archivo —cuánto de
 * este archivo está escrito— y, si el navegador se cierra o se cae la red, la
 * carga queda ABIERTA y la pantalla puede ofrecer continuarla. Las vueltas por
 * reloj de una misma tanda reenvían el mismo `desde`: reenviar no avanza el
 * prefijo, sólo lo hace terminar la tanda.
 */
export async function aplicarPorTandas(
  lote: string,
  asientos: readonly AsientoMigrado[],
  aplicar: (lote: LoteDeAsientos) => Promise<InformeDeMigracion>,
  onProgreso?: (p: ProgresoDeTandas & { dentroDeLaTanda: ProgresoDeAsientos | null }) => void,
  opciones: { debeParar?: () => boolean; tamano?: number } = {},
): Promise<ResultadoDeAplicacion> {
  const tamano = opciones.tamano ?? MAX_ASIENTOS_POR_LOTE;
  const tandas = trozosConInicio(asientos, tamano);
  const partes = tandas.map((t) => t.parte);

  const acumulado: InformeDeMigracion = {
    lote,
    total: 0,
    aplicados: 0,
    restantes: 0,
    omitidos: 0,
    yaMigrados: 0,
    primerNumero: null,
    ultimoNumero: null,
    cuentasFaltantes: [],
    motivos: [],
    fallasAlEscribir: [],
  };
  let detenidoPorPersona = false;
  let detenidoSinAvance = false;
  let hechos = 0;

  for (const [i, parte] of partes.entries()) {
    const vuelta = await aplicarAsientosCompleto(
      () =>
        aplicar({
          lote,
          asientos: parte,
          totalDelArchivo: asientos.length,
          desde: tandas[i].inicio,
        }),
      (dentro) =>
        onProgreso?.({
          /*
           * Lo de las tandas anteriores más lo que va de ésta: con 24 tandas,
           * una barra que sólo se mueve al cerrar cada una salta de a 5.000 y
           * parece trabada durante medio minuto.
           *
           * `restantes` es lo que el back dice que le queda a ESTA tanda, y
           * es una cota: cuenta sólo las filas LISTAS, así que en una tanda
           * con filas ya migradas el número arranca un poco adelantado. Se
           * acota a la tanda y cuadra exacto al cerrarla, que es cuando
           * `hechos` se recalcula con el largo real.
           */
          hechos: hechos + Math.min(parte.length, Math.max(0, parte.length - dentro.restantes)),
          total: asientos.length,
          tanda: i + 1,
          tandas: partes.length,
          dentroDeLaTanda: dentro,
        }),
      { debeParar: opciones.debeParar },
    );
    const r = vuelta.ultimo;

    /*
     * 🔴 De dónde sale cada número, que NO es todo del mismo lado.
     *
     * El back re-prepara la tanda entera en CADA vuelta, así que `ultimo`
     * describe la tanda completa (`total`, `omitidos`) pero sólo lo escrito en
     * la última vuelta (`aplicados`). Lo escrito por esta corrida es la suma
     * de las vueltas, y eso lo lleva `vuelta.aplicados`.
     *
     * `yaMigrados` es el que engaña: en la última vuelta ya incluye lo que
     * ESTA corrida escribió en las vueltas anteriores de la misma tanda. Si se
     * tomara tal cual, esas filas se contarían dos veces —una como aplicadas y
     * otra como «ya estaban»— y el informe sumaría más que el archivo. Se le
     * descuenta exactamente eso.
     */
    const escritoAntesEnEstaTanda = Math.max(0, vuelta.aplicados - r.aplicados);

    acumulado.total += r.total;
    acumulado.aplicados += vuelta.aplicados;
    acumulado.omitidos += r.omitidos;
    acumulado.yaMigrados += Math.max(0, r.yaMigrados - escritoAntesEnEstaTanda);
    acumulado.restantes = (acumulado.restantes ?? 0) + (r.restantes ?? 0);
    // QA-MIG-B: números de asiento del ARCHIVO, no de la tanda (ver revisar).
    const base = tandas[i].inicio;
    const correr = <T extends { filas: number[] }>(xs: readonly T[]): T[] =>
      base === 0 ? [...xs] : xs.map((x) => ({ ...x, filas: x.filas.map((f) => f + base) }));
    acumulado.cuentasFaltantes = unirPorLlave(acumulado.cuentasFaltantes, correr(r.cuentasFaltantes), porCodigo);
    acumulado.motivos = unirPorLlave(acumulado.motivos, correr(r.motivos), porMotivo);
    acumulado.fallasAlEscribir = [
      ...acumulado.fallasAlEscribir,
      ...r.fallasAlEscribir.map((f) => ({ ...f, fila: f.fila + base })),
    ];
    // El primero de todo el archivo y el último: los números de asiento los
    // emite el back en orden, así que el primero no nulo manda y el último
    // gana.
    if (acumulado.primerNumero === null) acumulado.primerNumero = r.primerNumero;
    if (r.ultimoNumero !== null) acumulado.ultimoNumero = r.ultimoNumero;
    // El avance guardado es el de la respuesta más reciente que lo trajo. Si el
    // back no lo manda, no se inventa: ausente es «no sé», no «0» ni «terminó».
    if (r.carga) acumulado.carga = r.carga;

    hechos += parte.length;
    onProgreso?.({
      hechos,
      total: asientos.length,
      tanda: i + 1,
      tandas: partes.length,
      dentroDeLaTanda: null,
    });

    if (vuelta.detenidoSinAvance || vuelta.detenidoPorLimite) {
      detenidoSinAvance = true;
      break;
    }
    /*
     * 🔴 El «Detener» se mira TAMBIÉN acá, no sólo adentro de la tanda.
     *
     * `aplicarAsientosCompleto` sólo llega a consultarlo cuando el back dice
     * que quedan filas: una tanda que entra completa en una sola llamada
     * vuelve con `restantes: 0` y sin haberlo preguntado nunca. Sin este
     * chequeo, tocar «Detener» en un archivo de 24 tandas no detenía nada —
     * seguían las 23 restantes.
     */
    if (vuelta.detenidoPorPersona || opciones.debeParar?.() === true) {
      detenidoPorPersona = true;
      break;
    }
  }

  return { informe: acumulado, detenidoPorPersona, detenidoSinAvance };
}
