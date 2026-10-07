/**
 * Los 409 que aparecen desde T-0128, cuando una ficha de propietario puede no
 * tener documento (la migración de terceros la crea incompleta a propósito).
 *
 *  - `PROPIETARIO_SIN_DOCUMENTO` — el mandato en PDF o la firma electrónica de
 *    la consignación se piden con un propietario al que le falta el documento
 *    o su tipo. Trae `details.faltantes` (`documento` / `tipoDocumento`).
 *  - `PAGARE_DATOS_INCOMPLETOS` — emitir el pagaré con datos que faltan; ahora
 *    también por el documento o el tipo del propietario beneficiario.
 *
 * El `message` del back ya viene en español, pero es una sola frase: acá se
 * arma la que dice QUÉ completar y DÓNDE, igual para todas las pantallas.
 */
import { ApiError } from '@/lib/api/client';

export const CODIGO_PROPIETARIO_SIN_DOCUMENTO = 'PROPIETARIO_SIN_DOCUMENTO';
export const CODIGO_PAGARE_DATOS_INCOMPLETOS = 'PAGARE_DATOS_INCOMPLETOS';

const FALTANTE_DEL_PROPIETARIO: Record<string, string> = {
  documento: 'el número de documento',
  tipoDocumento: 'el tipo de documento',
};

/** Cada `faltantes[]` del pagaré, en palabras. */
const FALTANTE_DEL_PAGARE: Record<string, string> = {
  INQUILINO: 'el inquilino del contrato',
  CORREO_DEL_INQUILINO: 'el correo del inquilino',
  DOCUMENTO_DEL_INQUILINO: 'el documento del inquilino',
  BENEFICIARIO: 'al menos un propietario beneficiario',
  DOCUMENTO_DEL_BENEFICIARIO: 'el número de documento del propietario',
  TIPO_DE_DOCUMENTO_DEL_BENEFICIARIO: 'el tipo de documento del propietario',
};

/** `details.faltantes` de un 409, tolerando que el filtro del back lo aplane. */
function faltantesDe(err: ApiError): string[] {
  const cuerpo = err.detalle ?? {};
  const anidado =
    cuerpo.details && typeof cuerpo.details === 'object'
      ? (cuerpo.details as Record<string, unknown>).faltantes
      : undefined;
  const lista = Array.isArray(anidado) ? anidado : cuerpo.faltantes;
  return Array.isArray(lista) ? lista.filter((f): f is string => typeof f === 'string') : [];
}

function enLista(partes: string[]): string {
  if (partes.length <= 1) return partes[0] ?? '';
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

/**
 * El mensaje en español para estos dos 409, o `null` si el error es otro (para
 * que quien llama siga con su camino de siempre).
 */
export function mensajeDeDocumentoFaltante(err: unknown): string | null {
  if (!(err instanceof ApiError) || err.status !== 409) return null;

  if (err.code === CODIGO_PROPIETARIO_SIN_DOCUMENTO) {
    const faltantes = faltantesDe(err);
    // El back nombra a la persona y dice para qué se necesita: es lo más útil.
    if (err.message && faltantes.length === 0) return err.message;
    const que = enLista(faltantes.map((f) => FALTANTE_DEL_PROPIETARIO[f] ?? f));
    return que
      ? `Al propietario le falta ${que}. Complétalo desde Propietarios (editar la ficha) y vuelve a intentarlo.`
      : 'Al propietario le falta su documento. Complétalo desde Propietarios (editar la ficha) y vuelve a intentarlo.';
  }

  if (err.code === CODIGO_PAGARE_DATOS_INCOMPLETOS) {
    const faltantes = faltantesDe(err);
    if (faltantes.length === 0) return err.message || null;
    const que = enLista([...new Set(faltantes.map((f) => FALTANTE_DEL_PAGARE[f] ?? f))]);
    const delPropietario = faltantes.some((f) => f.endsWith('_DEL_BENEFICIARIO'));
    return (
      `Para emitir el pagaré falta ${que}.` +
      (delPropietario ? ' El documento del propietario se completa desde Propietarios.' : '')
    );
  }

  return null;
}
