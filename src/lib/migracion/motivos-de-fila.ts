/**
 * T-0128 · los motivos por los que una fila de terceros sigue «por decidir», en
 * las palabras con que se ofrece elegirlas de golpe.
 *
 * El conteo viene del back (`GET filas/motivos`): una fila con dos motivos
 * cuenta en los dos. Acá sólo se escribe la frase — «A las 2.895 que les falta
 * el documento» — con el singular que le toca cuando es una sola.
 */
import type { CodigoDeError, MotivosDelLote } from '@/lib/api/migracion-terceros.service';

/** [una sola fila, varias filas]. El número ya viene formateado. */
const FRASES: Record<CodigoDeError, [string, (n: string) => string]> = {
  FALTA_NOMBRE: ['A la 1 que no trae nombre', (n) => `A las ${n} que no traen nombre`],
  FALTA_TIPO_DOCUMENTO: [
    'A la 1 que le falta el tipo de documento',
    (n) => `A las ${n} que les falta el tipo de documento`,
  ],
  TIPO_DOCUMENTO_DESCONOCIDO: [
    'A la 1 con un tipo de documento que no reconocemos',
    (n) => `A las ${n} con un tipo de documento que no reconocemos`,
  ],
  FALTA_DOCUMENTO: [
    'A la 1 que le falta el documento',
    (n) => `A las ${n} que les falta el documento`,
  ],
  DOCUMENTO_INVALIDO: [
    'A la 1 con un documento que no es válido',
    (n) => `A las ${n} con un documento que no es válido`,
  ],
  NIT_DV_INVALIDO: [
    'A la 1 con un dígito de verificación que no cuadra',
    (n) => `A las ${n} con un dígito de verificación que no cuadra`,
  ],
  CORREO_INVALIDO: [
    'A la 1 con un correo que no es válido',
    (n) => `A las ${n} con un correo que no es válido`,
  ],
  VARIAS_PERSONAS_EN_LA_FILA: [
    'A la 1 que trae varias personas en una sola fila',
    (n) => `A las ${n} que traen varias personas en una sola fila`,
  ],
  DUPLICADO_EN_EL_LOTE: [
    'A la 1 repetida en el archivo',
    (n) => `A las ${n} repetidas en el archivo`,
  ],
  CORREO_REPETIDO_EN_EL_LOTE: [
    'A la 1 con un correo repetido en el archivo',
    (n) => `A las ${n} con un correo repetido en el archivo`,
  ],
  YA_EXISTE_EN_LA_AGENCIA: [
    'A la 1 que ya existe en tu inmobiliaria',
    (n) => `A las ${n} que ya existen en tu inmobiliaria`,
  ],
  FALLO_AL_APLICAR: [
    'A la 1 que falló al crearse',
    (n) => `A las ${n} que fallaron al crearse`,
  ],
};

/** «A las 2.895 que les falta el documento». Un código nuevo del back se nombra tal cual. */
export function fraseDelMotivo(codigo: CodigoDeError, filas: number): string {
  const frase = FRASES[codigo];
  if (!frase) return `A las ${filas.toLocaleString('es-CO')} con el motivo ${codigo}`;
  return filas === 1 ? frase[0] : frase[1](filas.toLocaleString('es-CO'));
}

/** Los motivos con filas, de más a menos: lo que más pesa va primero. */
export function motivosConFilas(motivos: MotivosDelLote | null): MotivosDelLote['porMotivo'] {
  if (!motivos) return [];
  return [...motivos.porMotivo].filter((m) => m.filas > 0).sort((a, b) => b.filas - a.filas);
}
