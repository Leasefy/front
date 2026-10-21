import { ApiError } from '@/lib/api/client';

/**
 * El correo de a quien se invita ya es la cuenta de OTRA persona (19-10-2026,
 * Nico, dos casos de Portofino). Lo dice el back de dos formas, con el MISMO
 * cuerpo:
 *
 *   · antes de enviar: `GET /inmobiliaria/agency/members/revisar-correo`, al
 *     salir del correo o del nombre;
 *   · al enviar: el 409 de `POST /inmobiliaria/agency/members`.
 *
 * `CORREO_DE_OTRA_PERSONA` se puede pasar con «Es la misma persona, invitar
 * igual» (`mismaPersona: true`); `ACTIVO_EN_OTRA_INMOBILIARIA`, no: cada
 * persona está en una sola inmobiliaria.
 */
export type AvisoDelCorreo =
  | {
      code: 'CORREO_DE_OTRA_PERSONA';
      message: string;
      /** Sólo si esa persona ya tiene que ver con la inmobiliaria. */
      nombreDeLaCuenta: string | null;
      relacion: 'inquilino' | 'propietario' | 'equipo' | null;
      sePuedeInvitarIgual: true;
      /**
       * 🔴 21-10-2026 (Portofino, Laura): el correo quedó como usuario de un
       * inquilino que nunca entró. Se le puede DAR a quien se invita
       * (`elCorreoEsDelInvitado: true`): el inquilino sigue con su contrato y
       * queda sin correo; la persona invitada crea su propia cuenta.
       */
      sePuedeDarAlInvitado: boolean;
    }
  | {
      code: 'ACTIVO_EN_OTRA_INMOBILIARIA';
      message: string;
      creoSuPropiaInmobiliaria: boolean;
      sePuedeInvitarIgual: false;
    };

const RELACIONES = new Set(['inquilino', 'propietario', 'equipo']);

/** Lee el aviso de un cuerpo cualquiera; `null` si no es uno. */
export function leerAvisoDelCorreo(cuerpo: unknown): AvisoDelCorreo | null {
  if (typeof cuerpo !== 'object' || cuerpo === null) return null;
  const c = cuerpo as Record<string, unknown>;
  const message = typeof c.message === 'string' ? c.message.trim() : '';
  if (!message) return null;
  if (c.code === 'CORREO_DE_OTRA_PERSONA') {
    return {
      code: 'CORREO_DE_OTRA_PERSONA',
      message,
      nombreDeLaCuenta: typeof c.nombreDeLaCuenta === 'string' ? c.nombreDeLaCuenta : null,
      relacion:
        typeof c.relacion === 'string' && RELACIONES.has(c.relacion)
          ? (c.relacion as 'inquilino' | 'propietario' | 'equipo')
          : null,
      sePuedeInvitarIgual: true,
      sePuedeDarAlInvitado: c.sePuedeDarAlInvitado === true,
    };
  }
  if (c.code === 'ACTIVO_EN_OTRA_INMOBILIARIA') {
    return {
      code: 'ACTIVO_EN_OTRA_INMOBILIARIA',
      message,
      creoSuPropiaInmobiliaria: c.creoSuPropiaInmobiliaria === true,
      sePuedeInvitarIgual: false,
    };
  }
  return null;
}

/** El aviso que trae un 409 de invitar; `null` si el error es otro. */
export function avisoDelError(error: unknown): AvisoDelCorreo | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null;
  return leerAvisoDelCorreo({ ...error.detalle, code: error.code ?? error.detalle?.code, message: error.message });
}

/** Lo que decidió quien invita frente al aviso. */
export type DecisionDelCorreo = 'misma-persona' | 'es-del-invitado';

/** Lo que va en la invitación según esa decisión. */
export function camposDeLaDecision(
  decision: DecisionDelCorreo | null | undefined,
): { mismaPersona?: true; elCorreoEsDelInvitado?: true } {
  if (decision === 'misma-persona') return { mismaPersona: true };
  if (decision === 'es-del-invitado') return { elCorreoEsDelInvitado: true };
  return {};
}
