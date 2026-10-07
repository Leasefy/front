/**
 * Espejo de `back/src/inmobiliaria/doble-control/segunda-persona-por-monto.ts`
 * (decisión de Nico, 05-10-2026): desde este monto un lote de giros o de egresos
 * lo aprueba una SEGUNDA persona (quien lo armó no, aunque sea administrador).
 * Si la inmobiliaria no escogió un monto, rige el de Leasefy; «nunca» no viene
 * por defecto. Bajo el monto rige P-4.
 */
export const MONTO_DE_LA_SEGUNDA_PERSONA_POR_DEFECTO_COP = 20_000_000;

/**
 * Lo que el back dice de un lote que espera aprobación (campo aditivo
 * `segundaPersona` de la vista del lote de giros y del listado de lotes de
 * egresos). `null`/ausente = el lote ya no espera aprobación, o back anterior.
 */
export interface SegundaPersonaEnLaPantalla {
  montoCop: number;
  /** `true` = la inmobiliaria no escogió un monto y rige el de Leasefy. */
  porDefecto: boolean;
  /** El lote suma el monto o más. */
  exige: boolean;
  /** Hay alguien distinto de quien lo armó que lo puede aprobar. */
  hayOtra: boolean;
  /** La frase para quien armó el lote; `null` si este lote no la necesita. */
  nota: string | null;
}

/**
 * PURA. ¿Este lote lo tiene que aprobar otra persona por su monto? Entonces
 * P-4 no vale para quien lo armó: ni el administrador lo aprueba en un paso.
 * Sin el campo (back anterior) responde `false` y el back sigue siendo la
 * autoridad (403/409 `SEGUNDA_PERSONA_POR_MONTO`).
 */
export function laApruebaOtraPorElMonto(s: SegundaPersonaEnLaPantalla | null | undefined): boolean {
  return Boolean(s?.exige && s.hayOtra);
}
