/**
 * Cómo se leen los conceptos de la cartera en pantalla: nombre de cada
 * columna, qué estado tiene un giro, y la aritmética de las filas que la
 * tabla necesita para cerrar.
 */

import type {
  EstadoDelGiro,
  FilaDeCarteraDelInquilino,
  InquilinoEnCartera,
  PorConcepto,
  PropietarioEnCartera,
  TipoDeConcepto,
  TotalesDeCartera,
} from '@/lib/api/cartera.types';

/** El nombre de cada columna. Corto: son once posibles y caben de a varias. */
export const NOMBRE_DEL_CONCEPTO: Record<TipoDeConcepto, string> = {
  CANON: 'Canon',
  ADMINISTRACION: 'Administración',
  CONCEPTO_DEL_CONTRATO: 'Otros del contrato',
  PRORRATEO: 'Prorrateo',
  INTERES_DE_MORA: 'Intereses de mora',
  GASTO_ADMINISTRATIVO: 'Gasto administrativo',
  IVA: 'IVA',
  RETEFUENTE: 'ReteFuente',
  RETEICA: 'ReteICA',
  RETEIVA: 'ReteIVA',
  AJUSTE_MANUAL: 'Ajustes',
};

/** Qué le pasó al giro de un mes, dicho como lo diría la persona de tesorería. */
export const NOMBRE_DEL_ESTADO_DEL_GIRO: Record<EstadoDelGiro, string> = {
  SIN_GENERAR: 'Sin generar la dispersión',
  DISP_PENDING: 'Dispersión pendiente de aprobar',
  PROCESSING: 'Aprobada, en proceso de giro',
  DISP_COMPLETED: 'Girado',
  FAILED: 'El giro falló',
};

/** Lo que se debe de un concepto en una fila: cero si no aparece. */
export function saldoDe(porConcepto: PorConcepto, tipo: TipoDeConcepto): number {
  return porConcepto[tipo] ?? 0;
}

/** Si alguna fila trae una diferencia sin desglose, la columna se muestra. */
export function haySinDesglose(filas: readonly FilaDeCarteraDelInquilino[]): boolean {
  return filas.some((f) => f.sinDesgloseCop !== 0);
}

/**
 * Filtra inquilinos por lo que se escribió: nombre, documento, inmueble o
 * número de contrato. Sin texto, todos.
 *
 * `soloEnMora` mira `enMoraCop`, que desde el 2026-09-15 es LA CARTERA: lo
 * vencido más allá de los días de plazo del contrato. Quien debe y está dentro
 * de su plazo NO entra — es justo lo que la cobranza no puede perseguir.
 */
export function filtrarInquilinos(
  inquilinos: readonly InquilinoEnCartera[],
  busqueda: string,
  soloEnMora: boolean,
): InquilinoEnCartera[] {
  const texto = normalizar(busqueda);
  return inquilinos.filter((i) => {
    if (soloEnMora && i.totales.enMoraCop <= 0) return false;
    if (!texto) return true;
    const campos = [
      i.nombre,
      i.documento,
      ...i.contratos.flatMap((c) => [c.contrato, c.inmueble]),
    ];
    return campos.some((c) => c && normalizar(c).includes(texto));
  });
}

/**
 * Suma los totales de los inquilinos que quedaron en pantalla.
 *
 * El pie de la tabla tiene que ser el total de LO QUE SE VE: con una búsqueda
 * puesta, repetir el total de toda la cartera convierte el pie en un número
 * que no corresponde a ninguna de las filas de arriba.
 */
export function sumarTotales(
  inquilinos: readonly InquilinoEnCartera[],
): TotalesDeCartera {
  const total: TotalesDeCartera = {
    porConcepto: {},
    saldoPorConcepto: {},
    facturadoCop: 0,
    sinDesgloseCop: 0,
    abonadoCop: 0,
    saldoCop: 0,
    enMoraCop: 0,
    vencidaEnPlazoCop: 0,
    porVencerCop: 0,
    enSiniestroCop: 0,
    cuotas: 0,
    cobros: 0,
  };
  for (const i of inquilinos) {
    acumular(total.porConcepto, i.totales.porConcepto);
    acumular(total.saldoPorConcepto, i.totales.saldoPorConcepto);
    total.facturadoCop += i.totales.facturadoCop;
    total.sinDesgloseCop += i.totales.sinDesgloseCop;
    total.abonadoCop += i.totales.abonadoCop;
    total.saldoCop += i.totales.saldoCop;
    /*
     * 🔴 Los tres cajones se suman POR SEPARADO y nunca entre sí: cartera,
     * vencido dentro del plazo y por vencer significan cosas distintas y
     * `cartera + vencidaEnPlazo + porVencer = saldoCop` sólo cierra si cada uno
     * conserva su propia cuenta.
     */
    total.enMoraCop += i.totales.enMoraCop;
    total.vencidaEnPlazoCop += i.totales.vencidaEnPlazoCop ?? 0;
    total.porVencerCop += i.totales.porVencerCop;
    total.enSiniestroCop += i.totales.enSiniestroCop;
    total.cuotas += i.totales.cuotas ?? i.totales.cobros;
  }
  // El alias deprecado sigue el mismo número, para que nada que todavía lea
  // `cobros` muestre un cero mientras se termina de renombrar.
  total.cobros = total.cuotas;
  return total;
}

function acumular(destino: PorConcepto, sumando: PorConcepto): void {
  for (const [tipo, valor] of Object.entries(sumando) as [TipoDeConcepto, number][]) {
    destino[tipo] = (destino[tipo] ?? 0) + valor;
  }
}

/** Filtra propietarios por nombre. Sin texto, todos. */
export function filtrarPropietarios(
  propietarios: readonly PropietarioEnCartera[],
  busqueda: string,
): PropietarioEnCartera[] {
  const texto = normalizar(busqueda);
  if (!texto) return [...propietarios];
  return propietarios.filter((p) => normalizar(p.nombre).includes(texto));
}

/** La suma de las columnas de concepto, tal como se pintan. */
export function saldoReconstruido(saldoPorConcepto: PorConcepto): number {
  let total = 0;
  for (const valor of Object.values(saldoPorConcepto)) total += valor ?? 0;
  return total;
}

/**
 * ¿Las columnas de esta fila explican su saldo?
 *
 * El invariante que Nico pidió medir —«la suma por concepto = el total del
 * mes = el total del inquilino»— se comprueba RECALCULÁNDOLO desde lo que se
 * pinta, no leyendo el `sinDesgloseCop` que manda el back: si el back cambiara
 * qué significa esa diferencia, la pantalla tiene que seguir sabiendo si sus
 * propias columnas suman su propio total. Una tabla de plata cuyas columnas no
 * suman su total es la forma más rápida de perderle la confianza al módulo.
 */
export function cuadra(fila: {
  saldoPorConcepto: PorConcepto;
  saldoCop: number;
}): boolean {
  return saldoReconstruido(fila.saldoPorConcepto) === fila.saldoCop;
}

function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
