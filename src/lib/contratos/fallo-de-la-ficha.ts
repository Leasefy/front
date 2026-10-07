import { ApiError } from '@/lib/api/client';

/**
 * QA-CONT-95 (B-04, B-05, CR-21): abrir la ficha de un contrato que no se puede
 * ver dice lo MISMO, en español, sea cual sea la causa:
 *  - `/contratos/abc` respondía 400 «Validation failed (uuid is expected)» y la
 *    pantalla decía «No pudimos cargar esto — fue un problema nuestro»;
 *  - el de OTRA inmobiliaria respondía 403 «You do not have access to this
 *    contract»: en inglés y delatando que existe;
 *  - el que no existe, 404 «Contract not found».
 * Los tres son «no existe en tu inmobiliaria». Un 5xx o la red siguen como
 * estaban (ahí sí sirve reintentar).
 */
export const MENSAJE_CONTRATO_NO_EXISTE = 'Ese contrato no existe en tu inmobiliaria, o el enlace está mal.';

export function falloDeLaFicha(error: unknown): unknown {
  if (!(error instanceof ApiError)) return error;
  const uuidMalo = error.status === 400 && /uuid is expected/i.test(error.message);
  const ajeno = error.status === 403 && /do not have access to this contract/i.test(error.message);
  const noExiste = error.status === 404;
  if (uuidMalo || ajeno || noExiste) {
    return new ApiError(404, MENSAJE_CONTRATO_NO_EXISTE, 'CONTRATO_NO_EXISTE');
  }
  return error;
}
