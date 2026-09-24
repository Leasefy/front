/**
 * P-4 en el panel: el ADMINISTRADOR no se confirma a sí mismo.
 *
 * Nico (24-09-2026, mañana): «si quien propone es ADMINISTRADOR, no se le
 * pide que se confirme a sí mismo: lo que él arma (lote de giros, lote de
 * egresos, castigo, giro devuelto) queda aprobado en el mismo paso, siempre,
 * con la bitácora diciendo que fue la misma persona. Sin código de aprobación
 * a sí mismo. El resto de los roles sigue necesitando otra persona».
 *
 * La regla y la escritura son del BACK (`doble-control/la-misma-persona.ts`):
 * el lote que arma un administrador ya vuelve APROBADO. Lo que vive acá es
 * cómo lo DICE la pantalla, en UN lugar para las tres (lotes de giros,
 * egresos, castigo), sin adivinar nada que el back no haya escrito:
 *
 *   · «lo armó y lo aprobó la misma persona» se LEE de la fila (quien aprobó
 *     = quien armó; en el castigo, la misma firma en los dos lados). Esa fila
 *     sólo existe si el back la dejó pasar, y el back sólo la deja pasar al
 *     administrador (P-4);
 *   · antes de eso (un lote suyo que quedó esperando), si quien mira lo armó y
 *     es administrador, el botón dice «Aprobar» y no se le pide código.
 */

/** Lo que manda el back en la respuesta de la mitad que propone. */
export interface MismoPaso {
  /** `true` = lo que armó quedó aprobado en esa misma llamada. */
  aprobadoEnElMismoPaso: boolean;
  /**
   * Si no: `NO_ES_ADMINISTRADOR` (lo de siempre), `FALTA_LA_MIGRACION` (es
   * administrador, pero la base todavía no lo admite) o `null`.
   */
  porQueNo: 'NO_ES_ADMINISTRADOR' | 'FALTA_LA_MIGRACION' | null;
  /** La frase del back, en tuteo. */
  nota: string;
}

/** El título de la nota cuando quien mira es quien armó y aprobó. */
export const APROBADO_POR_TI = 'Aprobado por ti como administrador (P-4)';
/** El título cuando lo mira otra persona. */
export const APROBADO_POR_LA_MISMA_PERSONA = 'Lo armó y lo aprobó la misma persona (P-4)';

/** Quién armó y quién aprobó, como los trae cualquier lote. */
export interface QuienArmoYAprobo {
  creadoPorUserId: string | null;
  aprobadoPorUserId: string | null;
}

/** PURA. ¿Lo aprobó quien lo armó? (sólo pasa con un administrador, P-4). */
export function aprobadoPorQuienLoArmo(l: QuienArmoYAprobo): boolean {
  return Boolean(l.aprobadoPorUserId) && l.aprobadoPorUserId === l.creadoPorUserId;
}

/** PURA. ¿Firmó los dos lados del castigo la misma persona? */
export function castigadoPorUnaSolaPersona(c: {
  admin: { userId: string } | null;
  contador: { userId: string } | null;
}): boolean {
  return c.admin !== null && c.contador !== null && c.admin.userId === c.contador.userId;
}

export interface NotaDeLaMismaPersona {
  titulo: string;
  detalle: string;
}

/**
 * PURA. La nota para un lote (de giros o de egresos) que armó y aprobó la
 * misma persona, o `null` si lo aprobó otra (o nadie todavía).
 */
export function notaDelLote(
  l: QuienArmoYAprobo,
  yo: string | null,
): NotaDeLaMismaPersona | null {
  if (!aprobadoPorQuienLoArmo(l)) return null;
  return yo !== null && yo === l.aprobadoPorUserId
    ? {
        titulo: APROBADO_POR_TI,
        detalle:
          'Lo armaste y quedó aprobado en el mismo paso, sin código: no tuviste que confirmarlo. En la bitácora queda que fuiste la misma persona.',
      }
    : {
        titulo: APROBADO_POR_LA_MISMA_PERSONA,
        detalle:
          'Un administrador de la inmobiliaria lo armó y quedó aprobado en el mismo paso. En la bitácora queda que fue la misma persona.',
      };
}

/** PURA. La nota para un castigo firmado por los dos lados por la misma persona. */
export function notaDelCastigo(
  c: { admin: { userId: string } | null; contador: { userId: string } | null },
  yo: string | null,
): NotaDeLaMismaPersona | null {
  if (!castigadoPorUnaSolaPersona(c)) return null;
  return yo !== null && yo === c.admin?.userId
    ? {
        titulo: 'Castigado por ti como administrador (P-4)',
        detalle:
          'Tu firma valió por el administrador y por el contador, en el mismo paso. En la bitácora queda que fuiste la misma persona.',
      }
    : {
        titulo: 'Lo castigó una sola persona, como administrador (P-4)',
        detalle:
          'Un administrador de la inmobiliaria firmó por los dos lados. En la bitácora queda que fue la misma persona.',
      };
}

/**
 * PURA. ¿Quien mira es el administrador que armó este lote? Entonces «pedir
 * la aprobación» lo deja aprobado en ese paso y «aprobar» no le pide código:
 * el botón no se le apaga ni se le promete a otra persona.
 */
export function loApruebaElQueLoArmo(
  l: Pick<QuienArmoYAprobo, 'creadoPorUserId'>,
  yo: string | null,
  esAdministrador: boolean,
): boolean {
  return esAdministrador && yo !== null && yo === l.creadoPorUserId;
}
