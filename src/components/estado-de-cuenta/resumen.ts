/**
 * El resumen del estado de cuenta: lo que va ARRIBA, antes de las tablas.
 *
 * CEO (vía Nico, 2026-09-13): «algo de lo importante y la magia está en qué tan
 * BONITO se exponga esta información». Lo bonito acá no es decoración: es que
 * quien abre el documento sepa en dos segundos cuánto debe, cuándo es lo
 * próximo y si está al día. Las tablas responden el detalle; esto responde la
 * pregunta.
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
  enMora: boolean;
  /** Días desde que venció `masVieja`. Cero si no hay mora. */
  diasDeMora: number;
  cuotasVencidas: number;
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

  const vencidas = pendientes.filter(
    ({ fila }) => fila.fechaVencimiento.slice(0, 10) < hoy,
  );
  const futuras = pendientes.filter(
    ({ fila }) => fila.fechaVencimiento.slice(0, 10) >= hoy,
  );

  const masVieja = vencidas[0] ? señalar(vencidas[0].fila, vencidas[0].contrato) : null;
  const proxima = futuras[0] ? señalar(futuras[0].fila, futuras[0].contrato) : null;

  return {
    cancelado: doc.totales.cancelado,
    pendiente: doc.totales.pendiente,
    restaPorPagar: doc.totales.restaPorPagar,
    proxima,
    masVieja,
    enMora: vencidas.length > 0,
    diasDeMora: masVieja ? Math.max(0, diasEntre(masVieja.fecha, hoy)) : 0,
    cuotasVencidas: vencidas.length,
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
  pactadoCop: number;
  /** 0–100. Lo que va pagado sobre lo pactado. */
  porcentaje: number;
  /** 0–100. Lo que trae el sistema anterior, para el segundo tramo de la barra. */
  porcentajeAnterior: number;
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
  const pactadoCop = filas.reduce((s, f) => s + f.valorNeto, 0);
  const total = filas.length;

  return {
    pagadas: pagadasFilas.length,
    anteriores,
    total,
    pagadoCop,
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
