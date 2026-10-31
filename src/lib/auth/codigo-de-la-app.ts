/**
 * El código de seis cifras de la aplicación de autenticación, AHORA, para lo
 * que suelta plata (Nico, 31-10-2026: «no está pidiendo el código de auth al
 * generar totalmente el giro a propietarios, sí o sí lo autoriza un
 * administrador»).
 *
 * La sesión de un administrador ya es aal2 desde que entró (puede llevar
 * horas abierta), así que el back exige que el TOTP se haya verificado hace
 * poco (`amr` del token, 10 minutos) y responde 403 `SEGUNDO_FACTOR_RECIENTE`
 * si no. Acá se le pide a la persona, se verifica contra Supabase (el SDK
 * guarda la sesión con el `amr` nuevo) y quien llama repite la acción.
 *
 * Es el mismo reto que ya usa el Piloto para pasar a Automático
 * (`ConfirmarAutomatico`), sacado a un solo lugar.
 */
import { getSupabase } from '@/lib/supabase/client';
import { verificarConElSdk } from './inscripcion-del-segundo-factor';

export const CODIGO_SEGUNDO_FACTOR_RECIENTE = 'SEGUNDO_FACTOR_RECIENTE';
export const CODIGO_LO_AUTORIZA_UN_ADMINISTRADOR = 'GIRO_LO_AUTORIZA_UN_ADMINISTRADOR';

function codigoDelError(error: unknown): unknown {
  if (!error || typeof error !== 'object') return undefined;
  const e = error as { code?: unknown; detalle?: { code?: unknown } };
  return e.code ?? e.detalle?.code;
}

/** ¿El back pidió el código de la aplicación para esta acción? */
export function pideElCodigoDeLaApp(error: unknown): boolean {
  return codigoDelError(error) === CODIGO_SEGUNDO_FACTOR_RECIENTE;
}

/** ¿El back dijo que esto lo autoriza un administrador (y quien lo pidió no lo es)? */
export function loAutorizaUnAdministrador(error: unknown): boolean {
  return codigoDelError(error) === CODIGO_LO_AUTORIZA_UN_ADMINISTRADOR;
}

/** El id del factor TOTP verificado de la cuenta, o `null` si no tiene uno activo. */
export async function factorDeLaApp(): Promise<string | null> {
  try {
    const { data } = (await getSupabase()?.auth.mfa.listFactors()) ?? { data: null };
    return data?.totp?.find((f) => f.status === 'verified')?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Verifica las seis cifras. Lanza con una frase para la persona si el código
 * no sirvió; al volver, la sesión ya trae el `amr` reciente.
 */
export async function verificarElCodigoDeLaApp(factorId: string, codigo: string): Promise<void> {
  try {
    await verificarConElSdk(factorId, codigo);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    throw new Error(
      /invalid|expired|inválid|vencid|no es correcto|incorrect/i.test(msg)
        ? 'Ese código no sirvió. Mira tu aplicación de autenticación y escribe el de ahora.'
        : 'No pudimos verificar el código. Intenta de nuevo en un momento.',
    );
  }
}
