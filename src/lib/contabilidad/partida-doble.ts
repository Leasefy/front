/**
 * La partida doble, validada en el cliente antes de mandar nada.
 *
 * El back (`AsientosService.validar`) rechaza un asiento descuadrado con un
 * 400 y un mensaje en español. Se valida acá también, y no por desconfianza:
 * la persona que está escribiendo un asiento de ocho líneas quiere ver la
 * diferencia moverse mientras escribe, no descubrirla al final en un toast.
 *
 * Las reglas son las del DTO (`CrearAsientoDto` / `MovimientoDto`):
 *   - mínimo dos líneas
 *   - cada línea tiene cuenta, y débito XOR crédito (nunca los dos, nunca ninguno)
 *   - montos enteros, en pesos, positivos, hasta `MAX_COP_POR_MOVIMIENTO`
 *   - suma de débitos === suma de créditos
 */

import { MAX_COP_POR_MOVIMIENTO } from '@/lib/api/contabilidad.service';

/** Una línea tal como vive en el formulario: los montos pueden estar vacíos. */
export interface LineaDelFormulario {
  /** Llave local de React, no viaja al back. */
  clave: string;
  cuentaId: string;
  /** `null` = campo vacío. */
  debitoCop: number | null;
  creditoCop: number | null;
  descripcion: string;
}

export interface Totales {
  debitos: number;
  creditos: number;
  /** `debitos - creditos`. Cero cuando cuadra. */
  diferencia: number;
}

export type ErrorDeLinea =
  | 'SIN_CUENTA'
  | 'SIN_MONTO'
  | 'DOS_LADOS'
  | 'MONTO_INVALIDO'
  | 'MONTO_FUERA_DE_RANGO';

export interface Veredicto {
  /** Se puede mandar. */
  valido: boolean;
  totales: Totales;
  /** Errores por línea, indexados por `clave`. Sólo las líneas con problema. */
  porLinea: Record<string, ErrorDeLinea>;
  /** Errores del asiento entero. */
  generales: Array<'MUY_POCAS_LINEAS' | 'DESCUADRADO'>;
}

export const MINIMO_DE_LINEAS = 2;

function montoPresente(v: number | null): boolean {
  return v !== null && !Number.isNaN(v) && v !== 0;
}

function montoValido(v: number): boolean {
  return Number.isInteger(v) && v > 0 && v <= MAX_COP_POR_MOVIMIENTO;
}

/** Los totales, contando sólo los montos bien formados. */
export function totalesDe(lineas: readonly LineaDelFormulario[]): Totales {
  let debitos = 0;
  let creditos = 0;
  for (const l of lineas) {
    if (montoPresente(l.debitoCop) && montoValido(l.debitoCop as number)) {
      debitos += l.debitoCop as number;
    }
    if (montoPresente(l.creditoCop) && montoValido(l.creditoCop as number)) {
      creditos += l.creditoCop as number;
    }
  }
  return { debitos, creditos, diferencia: debitos - creditos };
}

export function validarPartidaDoble(lineas: readonly LineaDelFormulario[]): Veredicto {
  const porLinea: Record<string, ErrorDeLinea> = {};

  for (const l of lineas) {
    const hayDebito = montoPresente(l.debitoCop);
    const hayCredito = montoPresente(l.creditoCop);

    if (!l.cuentaId) {
      porLinea[l.clave] = 'SIN_CUENTA';
      continue;
    }
    if (hayDebito && hayCredito) {
      porLinea[l.clave] = 'DOS_LADOS';
      continue;
    }
    if (!hayDebito && !hayCredito) {
      porLinea[l.clave] = 'SIN_MONTO';
      continue;
    }
    const monto = (hayDebito ? l.debitoCop : l.creditoCop) as number;
    if (!Number.isInteger(monto) || monto < 0) {
      porLinea[l.clave] = 'MONTO_INVALIDO';
      continue;
    }
    if (monto > MAX_COP_POR_MOVIMIENTO) {
      porLinea[l.clave] = 'MONTO_FUERA_DE_RANGO';
    }
  }

  const totales = totalesDe(lineas);
  const generales: Veredicto['generales'] = [];
  if (lineas.length < MINIMO_DE_LINEAS) generales.push('MUY_POCAS_LINEAS');
  if (totales.diferencia !== 0) generales.push('DESCUADRADO');

  return {
    valido: Object.keys(porLinea).length === 0 && generales.length === 0,
    totales,
    porLinea,
    generales,
  };
}

export const TEXTO_DE_ERROR_DE_LINEA: Record<ErrorDeLinea, string> = {
  SIN_CUENTA: 'Elegí la cuenta.',
  SIN_MONTO: 'Falta el monto: débito o crédito.',
  DOS_LADOS: 'Una línea va por un solo lado: débito o crédito, no los dos.',
  MONTO_INVALIDO: 'El monto va en pesos enteros, en positivo.',
  MONTO_FUERA_DE_RANGO: 'Demasiado grande para una línea. Partilo en dos.',
};

/** Una línea nueva, vacía. */
export function lineaVacia(clave: string): LineaDelFormulario {
  return { clave, cuentaId: '', debitoCop: null, creditoCop: null, descripcion: '' };
}
