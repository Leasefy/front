/**
 * El castigo de cartera — lo que manda el back
 * (`back-erp/src/inmobiliaria/cartera/castigo/`).
 *
 * Nico y Juan Camilo, 17-09-2026: «cartera incobrable: **se castiga** con
 * aprobación del administrador y el contador; sale del informe de cartera
 * activa y queda en un listado de castigada; si alguna vez paga, entra como
 * recuperación».
 *
 * 🔴 Castigar NO es provisionar. La provisión estima cuánto no va a entrar y
 * la cobranza sigue llamando; el castigo es la decisión de dejar de
 * perseguirla. Acá no se decide nada: el back manda los veredictos y los
 * totales, y la pantalla los pinta.
 */

export type EstadoDelCastigo =
  | 'PROPUESTO'
  | 'CASTIGADA'
  | 'RECHAZADO'
  | 'REVERSADO';

export interface FirmaDelCastigo {
  userId: string;
  /** `null` cuando el usuario ya no existe: se dice, no se inventa. */
  nombre: string | null;
  at: string;
}

export interface CastigoDeCartera {
  id: string;
  contractId: string;
  estado: EstadoDelCastigo;
  /** El capital CONGELADO al proponer. Las dos firmas aprueban este número. */
  capitalCop: number;
  interesCop: number;
  cuotas: number;
  motivo: string;
  propuestoPor: FirmaDelCastigo;
  admin: FirmaDelCastigo | null;
  contador: FirmaDelCastigo | null;
  castigadaAt: string | null;
  rechazo: { por: FirmaDelCastigo; motivo: string } | null;
  reversa: { por: FirmaDelCastigo; motivo: string } | null;
  notas: string | null;
  /** Lo que entró DESPUÉS de castigar. Sólo tiene sentido en los CASTIGADA. */
  recuperadoCop: number;
  /** Lo que desapareció por cuotas anuladas. NO es plata que entró. */
  anuladoCop: number;
  sinRecuperarCop: number;
  /** Qué le falta para quedar castigada, en palabras. `null` = ya no espera. */
  queFalta: string | null;
}

export interface ListaDeCastigos {
  /** `false` = la base todavía no tiene la migración del castigo. */
  disponible: boolean;
  motivo: string | null;
  castigos: CastigoDeCartera[];
  castigadoCop: number;
  recuperadoCop: number;
  sinRecuperarCop: number;
  propuestoCop: number;
}

/** Una cuota del contrato, con el veredicto de si se puede castigar. */
export interface CuotaCandidataACastigo {
  cuotaId: string;
  /** `YYYY-MM`. */
  mes: string;
  capitalCop: number;
  interesCop: number;
  diasDeMora: number;
  /** `null` = se puede castigar. Si no, por qué no, en palabras. */
  porQueNo: string | null;
}

export interface CandidatasACastigo {
  disponible: boolean;
  motivo: string | null;
  contractId: string;
  inquilino: string | null;
  cuotas: CuotaCandidataACastigo[];
  capitalCop: number;
  interesCop: number;
  elegibles: number;
  diasDeLaMasVieja: number;
}
