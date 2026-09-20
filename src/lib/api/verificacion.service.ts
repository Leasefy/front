/**
 * `/evaluations/verificar/{codigo}` — «¿este estudio es de verdad?».
 *
 * ── Por qué NO usa `apiClient` ─────────────────────────────────────────────
 *
 * Porque esta pregunta la hace alguien SIN CUENTA: el propietario que recibió
 * el certificado por correo. `apiClient` está construido alrededor de la
 * sesión —espera a que Supabase conteste, adjunta el Bearer, y trata un 401
 * como «se cayó la sesión»—, y acá no hay sesión que esperar ni que perder.
 * Un `fetch` desnudo es lo correcto y además es lo más rápido: la página no
 * tiene que esperar a un proveedor de auth que no va a usar.
 */

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export interface EstudioVerificado {
  /** `true` sólo si existe, está terminado y no venció. */
  autentico: boolean;
  /** Por qué no, cuando no. `null` cuando sí. */
  motivo: 'NO_EXISTE' | 'SIN_TERMINAR' | 'VENCIDO' | null;
  /** «Nic*** Gar***». El back enmascara; acá nunca llega el nombre completo. */
  nombreEnmascarado: string | null;
  /** A · B · C · D. El puntaje exacto NO viaja: es de quien lo pagó. */
  nivel: string | null;
  emitidoEl: string | null;
  venceEl: string | null;
}

/** Lo que se muestra cuando ni siquiera se pudo preguntar. */
export const NO_SE_PUDO_PREGUNTAR: EstudioVerificado = {
  autentico: false,
  motivo: null,
  nombreEnmascarado: null,
  nivel: null,
  emitidoEl: null,
  venceEl: null,
};

export async function verificarEstudio(codigo: string): Promise<EstudioVerificado> {
  const r = await fetch(
    `${BACKEND}/evaluations/verificar/${encodeURIComponent(codigo)}`,
    { headers: { Accept: 'application/json' }, cache: 'no-store' },
  );
  if (!r.ok) throw new Error(`No se pudo verificar (${r.status})`);
  return (await r.json()) as EstudioVerificado;
}
