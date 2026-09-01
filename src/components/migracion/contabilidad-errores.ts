/**
 * Los códigos de error de `back-erp/src/inmobiliaria/contabilidad/*` en
 * palabras. El back manda `{ statusCode, code, message }`; el CÓDIGO es el
 * contrato y el mensaje es copy. Acá se traduce a lo que la persona tiene
 * que hacer, no a lo que el sistema no pudo.
 */

import { ApiError } from '@/lib/api/client';

const MENSAJES: Record<string, string> = {
  // puc.service.ts
  CODIGO_FUERA_DEL_ARBOL:
    'El código tiene que empezar con el código de la cuenta padre y ser más largo (1105 → 110505).',
  PADRE_DESCONOCIDO: 'La cuenta padre que elegiste ya no existe. Recargá el plan.',
  PADRE_CON_MOVIMIENTOS:
    'Esa cuenta ya tiene movimientos: no puede convertirse en cuenta mayor con subcuentas.',
  CODIGO_DUPLICADO: 'Ya hay una cuenta con ese código en tu plan.',
  NATURALEZA_CON_MOVIMIENTOS: 'La cuenta tiene movimientos: la naturaleza ya no se puede cambiar.',
  CUENTA_MAYOR: 'Una cuenta con subcuentas no puede recibir movimientos. Imputá en la subcuenta.',
  CUENTA_CON_MOVIMIENTOS: 'La cuenta tiene movimientos: se puede desactivar, pero no borrar ni dejar de ser imputable.',
  CUENTA_CON_SUBCUENTAS: 'La cuenta tiene subcuentas: primero borrá o desactivá las subcuentas.',
  // asientos.service.ts
  ASIENTO_INCOMPLETO: 'Un asiento necesita al menos dos líneas.',
  MOVIMIENTO_AMBIGUO: 'Una línea no puede tener débito y crédito a la vez.',
  MOVIMIENTO_VACIO: 'Hay una línea sin monto.',
  MONTO_NEGATIVO: 'Los montos van en positivo: el lado (débito o crédito) dice el signo.',
  MONTO_INVALIDO: 'Los montos van en pesos enteros, sin centavos.',
  MONTO_FUERA_DE_RANGO: 'Un monto es demasiado grande para una sola línea. Partila en dos.',
  ASIENTO_DESCUADRADO: 'El asiento no cuadra: los débitos tienen que ser iguales a los créditos.',
  CUENTA_NO_IMPUTABLE: 'Una de las cuentas es mayor (tiene subcuentas): imputá en la subcuenta.',
  CUENTA_INACTIVA: 'Una de las cuentas está inactiva.',
  CUENTA_DESCONOCIDA: 'Una de las cuentas no existe en tu plan.',
  FECHA_INVALIDA: 'La fecha tiene que ser un día real, en formato AAAA-MM-DD.',
  PERIODO_CERRADO: 'Esa fecha cae en un período que ya se cerró.',
  // migracion-contable.service.ts
  LOTE_DEMASIADO_GRANDE: 'El lote es demasiado grande: partí el archivo en tandas de 5.000 asientos.',
};

export function mensajeDeContabilidad(e: unknown, respaldo: string): string {
  if (e instanceof ApiError) {
    if (e.status === 403) {
      return 'Sólo el administrador o el contador de la inmobiliaria pueden mover la contabilidad.';
    }
    if (e.code && MENSAJES[e.code]) return MENSAJES[e.code];
  }
  return e instanceof Error && e.message ? e.message : respaldo;
}
