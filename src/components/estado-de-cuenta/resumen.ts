/**
 * El resumen del estado de cuenta: lo que va ARRIBA, antes de las tablas.
 *
 * CEO (vía Nico, 2026-09-13): «algo de lo importante y la magia está en qué tan
 * BONITO se exponga esta información». Lo bonito acá no es decoración: es que
 * quien abre el documento sepa en dos segundos cuánto debe, cuándo es lo
 * próximo y si está al día. Las tablas responden el detalle; esto responde la
 * pregunta.
 *
 * 🔴 La MORA no se cuenta acá (bug C de la prueba en navegador, 16-09): el
 * contrato #77 decía 100 días en la ficha y 105 en este documento, que contaba
 * desde el vencimiento sin el plazo del contrato y llamaba «En mora» a lo que
 * todavía estaba en plazo. Cada fila trae ahora `cajon` y `diasDeMora` con la
 * regla ÚNICA del back (`cuotaEsCartera`), y el resumen los lee: CARTERA es
 * mora, VENCIDA_EN_PLAZO es «Vencido, en plazo». Sólo con un back anterior que
 * no los manda se vuelve a mirar la fecha.
 *
 * 🔴 Todo se DERIVA de las filas que el back ya manda. No se inventa ningún
 * campo nuevo ni se pide otro endpoint: si el número de la tarjeta no puede
 * rastrearse hasta una fila de la tabla de abajo, el documento se contradice a
 * sí mismo. Puro y exportado para fijarlo con pruebas.
 */

import type {
  ContratoDelEstadoDeCuenta,
  EstadoDeCuenta,
  FilaDelEstadoDeCuenta,
} from '@/lib/types/estado-de-cuenta';

/** Un día en milisegundos. */
const UN_DIA = 24 * 60 * 60 * 1000;

/**
 * Días entre dos `YYYY-MM-DD`, sin zona horaria.
 *
 * Se arma el `Date` en UTC a mano: `new Date('2026-09-13')` ya se lee como UTC,
 * pero `new Date(2026, 8, 13)` se lee local, y mezclarlos da un día de
 * diferencia según la hora a la que uno mire la pantalla.
 */
export function diasEntre(desde: string, hasta: string): number {
  const a = Date.parse(`${desde.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${hasta.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / UN_DIA);
}

export interface CuotaSeñalada {
  /** `YYYY-MM-DD`. */
  fecha: string;
  valor: number;
  concepto: string;
  /** El número del contrato al que pertenece. */
  contrato: string;
}

export interface ResumenDelCliente {
  cancelado: number;
  pendiente: number;
  restaPorPagar: number;
  /** La primera cuota que todavía NO ha vencido. `null` si no queda ninguna. */
  proxima: CuotaSeñalada | null;
  /** La cuota vencida más vieja: la que define la mora. */
  masVieja: CuotaSeñalada | null;
  /** 🔴 Hay filas en CARTERA: pasó el vencimiento MÁS el plazo del contrato. */
  enMora: boolean;
  /** Días de mora DESPUÉS del plazo, los del back. Cero si no hay mora. */
  diasDeMora: number;
  /** Vencido, pero todo dentro del plazo del contrato: todavía no es mora. */
  enPlazo: boolean;
  /** Cuántas filas vencidas siguen dentro del plazo. */
  cuotasEnPlazo: number;
  cuotasVencidas: number;
  /**
   * Lo vencido y no pagado, sumado de las FILAS. No se toma de
   * `doc.totales.pendiente`: bajo un filtro los totales se recalculan sobre
   * lo visible y ahí «pendiente» pasa a ser todo lo que se debe, vencido o no.
   */
  vencidoCop: number;
}

function todasLasFilas(doc: EstadoDeCuenta): { fila: FilaDelEstadoDeCuenta; contrato: string }[] {
  return doc.contratos.flatMap((c) =>
    [...c.secciones.arriendos, ...c.secciones.otrosConceptos].map((fila) => ({
      fila,
      contrato: c.numero,
    })),
  );
}

function señalar(
  fila: FilaDelEstadoDeCuenta,
  contrato: string,
): CuotaSeñalada {
  return {
    fecha: fila.fechaVencimiento.slice(0, 10),
    valor: fila.valorNeto,
    concepto: fila.concepto,
    contrato,
  };
}

/**
 * El resumen del cliente entero.
 *
 * «Próxima cuota» es la primera que todavía no vence. Si TODAS las pendientes
 * ya vencieron no hay próxima: lo que hay es mora, y eso es lo que la tarjeta
 * dice. Inventar una «próxima» con una cuota vencida sería tranquilizar a quien
 * está atrasado.
 */
export function resumirElCliente(
  doc: EstadoDeCuenta,
  hoy: string,
): ResumenDelCliente {
  const pendientes = todasLasFilas(doc)
    .filter(({ fila }) => fila.estado === 'PENDIENTE')
    .sort((a, b) =>
      a.fila.fechaVencimiento.slice(0, 10).localeCompare(b.fila.fechaVencimiento.slice(0, 10)),
    );

  /*
   * Con el cajón del back, «vencida» es lo que él dice (CARTERA o en plazo).
   * Sin él —back anterior—, la fecha, como antes.
   */
  const esVencida = (fila: FilaDelEstadoDeCuenta) =>
    fila.cajon !== undefined
      ? fila.cajon === 'CARTERA' || fila.cajon === 'VENCIDA_EN_PLAZO'
      : fila.fechaVencimiento.slice(0, 10) < hoy;
  const vencidas = pendientes.filter(({ fila }) => esVencida(fila));
  const futuras = pendientes.filter(({ fila }) => !esVencida(fila));
  const conCajon = pendientes.some(({ fila }) => fila.cajon !== undefined);
  const enCartera = conCajon
    ? vencidas.filter(({ fila }) => fila.cajon === 'CARTERA')
    : vencidas;
  const enPlazo = conCajon
    ? vencidas.filter(({ fila }) => fila.cajon === 'VENCIDA_EN_PLAZO')
    : [];

  const masVieja = vencidas[0] ? señalar(vencidas[0].fila, vencidas[0].contrato) : null;
  const proxima = futuras[0] ? señalar(futuras[0].fila, futuras[0].contrato) : null;

  return {
    cancelado: doc.totales.cancelado,
    pendiente: doc.totales.pendiente,
    restaPorPagar: doc.totales.restaPorPagar,
    proxima,
    masVieja,
    enMora: enCartera.length > 0,
    diasDeMora: conCajon
      ? enCartera.reduce((max, { fila }) => Math.max(max, fila.diasDeMora ?? 0), 0)
      : masVieja
        ? Math.max(0, diasEntre(masVieja.fecha, hoy))
        : 0,
    enPlazo: enCartera.length === 0 && enPlazo.length > 0,
    cuotasEnPlazo: enPlazo.length,
    cuotasVencidas: vencidas.length,
    vencidoCop: vencidas.reduce((s, { fila }) => s + fila.valorNeto, 0),
  };
}

export interface AmortizacionDelContrato {
  /** Cuotas de arriendo canceladas en NUESTRO sistema. */
  pagadas: number;
  /** Cuotas traídas del sistema viejo: ocurrieron, pero no las respondemos. */
  anteriores: number;
  /** Todas las cuotas del contrato menos las anuladas. */
  total: number;
  pagadoCop: number;
  /**
   * 🔴 19-09-2026 · Lo que valen las cuotas del sistema anterior.
   *
   * La barra ya pintaba ese tramo en gris, pero su plata NO se decía en
   * ninguna parte. Visto en el navegador con un contrato real: arriba
   * «$ 0 de $ 142.350.000» y abajo «Resta por pagar $ 98.550.000». Faltaban
   * $ 43.800.000 —las 4 cuotas del sistema anterior— que no estaban ni
   * pagadas ni pendientes, y este documento se le manda al cliente: alguien
   * que suma no lo puede cuadrar.
   */
  anterioresCop: number;
  pactadoCop: number;
  /** 0–100. Lo que va pagado sobre lo pactado. */
  porcentaje: number;
  /** 0–100. Lo que trae el sistema anterior, para el segundo tramo de la barra. */
  porcentajeAnterior: number;
  /**
   * 🔴 21-09-2026 · CUÁNTAS CUOTAS ESTÁN CUBIERTAS, venga de donde venga.
   *
   * Nico, con el estado de cuenta de una inquilina delante: «que haya pagado en
   * el sistema anterior quiere decir que PAGÓ, y tú dices que 0 de 13, no tiene
   * sentido si esta persona pagó 3 que se trajeron del sistema anterior».
   *
   * Tenía razón, y el defecto era del CONTADOR, no de la plata: `pagadas` sólo
   * cuenta lo cancelado en Leasefy, así que el encabezado decía «Pagadas 0 de
   * 13 · 3 del sistema anterior» y «$ 0 de $ 132.000.000» sobre un contrato al
   * que ya le habían pagado $ 29.700.000. Para quien lo lee —y este documento
   * se le manda al cliente— eso dice que no ha pagado nada.
   *
   * Se agregan estos dos en vez de cambiar `pagadas` y `pagadoCop`: la BARRA y
   * su leyenda siguen necesitando la distinción (verde = lo que recaudamos
   * nosotros, gris = lo que vino migrado), porque pintarlas iguales sí diría
   * que respondemos por un recaudo que no registramos.
   */
  cubiertas: number;
  cubiertoCop: number;
}

/**
 * La tabla de amortización de un contrato, en dos números: «14 de 24 cuotas».
 *
 * CEO: «Funciona como una tabla de amortización.» La barra tiene DOS tramos y
 * no uno: lo cancelado acá (verde) y lo que viene del sistema anterior (gris).
 * Meterlos en el mismo tramo diría que respondemos por un recaudo que no
 * registramos; dejarlos fuera del total diría que el contrato tiene menos
 * cuotas de las que tiene. Las `ANULADA` sí quedan fuera: esas dejaron de
 * existir.
 */
export function amortizacionDe(
  contrato: ContratoDelEstadoDeCuenta,
): AmortizacionDelContrato {
  const filas = contrato.secciones.arriendos.filter((f) => f.estado !== 'ANULADA');
  const pagadasFilas = filas.filter((f) => f.estado === 'CANCELADA');
  const anteriores = filas.filter((f) => f.estado === 'ANTERIOR').length;

  const pagadoCop = pagadasFilas.reduce((s, f) => s + f.valorNeto, 0);
  const anterioresCop = filas
    .filter((f) => f.estado === 'ANTERIOR')
    .reduce((s, f) => s + f.valorNeto, 0);
  const pactadoCop = filas.reduce((s, f) => s + f.valorNeto, 0);
  const total = filas.length;

  return {
    pagadas: pagadasFilas.length,
    anteriores,
    total,
    pagadoCop,
    anterioresCop,
    // Lo que el inquilino ya no debe: lo de acá más lo que vino pagado.
    cubiertas: pagadasFilas.length + anteriores,
    cubiertoCop: pagadoCop + anterioresCop,
    pactadoCop,
    porcentaje: total === 0 ? 0 : Math.round((pagadasFilas.length / total) * 100),
    porcentajeAnterior: total === 0 ? 0 : Math.round((anteriores / total) * 100),
  };
}

/** La próxima cuota de UN contrato. Misma regla que la del cliente. */
export function proximaCuotaDe(
  contrato: ContratoDelEstadoDeCuenta,
  hoy: string,
): CuotaSeñalada | null {
  const futuras = [...contrato.secciones.arriendos, ...contrato.secciones.otrosConceptos]
    .filter(
      (f) =>
        f.estado === 'PENDIENTE' &&
        f.fechaVencimiento.slice(0, 10) >= hoy,
    )
    .sort((a, b) =>
      a.fechaVencimiento.slice(0, 10).localeCompare(b.fechaVencimiento.slice(0, 10)),
    );
  const primera = futuras[0];
  return primera ? señalar(primera, contrato.numero) : null;
}
