/**
 * Tipos de Vinci (retención) — lo que devuelven las rutas del micro con las
 * SEÑALES REALES del ERP (26-09-2026):
 *
 *   GET  /api/agency/:id/retencion/riesgo          quién está en riesgo y por qué
 *   GET  /api/agency/:id/retencion/metricas        lo retenido
 *   GET  /api/agency/:id/retencion/umbral          umbral y tope (sólo administrador)
 *   GET  /api/agency/:id/retencion/casos/:caseId/ofertas
 *   GET  /api/agency/:id/retencion/decisions       la cola (con lo que cada una dice)
 *
 * Reemplazan a los del tablero de la v1, que se alimentaba de un portafolio de
 * EJEMPLO (`mock-retencion.ts`, retirado).
 */

export type Poblacion = 'inquilino' | 'propietario';
export type ModoDelPiloto = 'sombra' | 'copiloto' | 'autonomo';

export type TipoDeOferta =
  | 'llamada_del_asesor'
  | 'visita_del_asesor'
  | 'resolver_pendiente'
  | 'congelar_incremento'
  | 'bajar_incremento'
  | 'descuento_comision';

/** Una señal del ERP y cuánto sumó al puntaje. */
export interface SenalDeVinci {
  clave: string;
  texto: string;
  puntos: number;
}

export interface OfertaSugerida {
  tipo: TipoDeOferta;
  nombre: string;
  porque: string;
  cuestaPlata: boolean;
  quienAprueba: string | null;
}

export type EstadoDeLaOferta = 'por_aprobar' | 'aprobada' | 'rechazada';

export interface DetalleDeLaOferta {
  descuentoPct?: number;
  meses?: number;
  incrementoPct?: number;
  aceptadaPorElPropietario?: boolean;
  nota?: string;
}

export interface OfertaDeVinci {
  id: string;
  caseId: string;
  poblacion: Poblacion;
  tipo: TipoDeOferta;
  nombre: string;
  detalle: DetalleDeLaOferta;
  cuestaPlata: boolean;
  estado: EstadoDeLaOferta;
  propuestaPor: string | null;
  resueltaPor: string | null;
  resueltaEn: string | null;
  /** P-4: el administrador la propuso y quedó aprobada en el mismo paso. */
  mismaPersona: boolean;
  creadaEn: string;
}

export interface ContratoDelCaso {
  contratoId: string;
  numero: string;
  inmueble: string | null;
  canonCop: number;
  fechaDeFin: string | null;
  diasParaVencer: number | null;
}

export interface PlanDelCaso {
  id: string;
  estado: string;
  objetivo: string;
  tareasAbiertas: number;
  resultado: string | null;
}

export interface CasoDeVinci {
  /** `inquilino:<contrato>` | `propietario:<id>`. */
  caseId: string;
  poblacion: Poblacion;
  nombre: string | null;
  puntaje: number;
  /** La suma sin tope (si pasa de 100, el tope recortó). */
  suma: number;
  umbral: number;
  enRiesgo: boolean;
  senales: SenalDeVinci[];
  contratos: ContratoDelCaso[];
  canonEnJuegoCop: number;
  tieneTelefono: boolean;
  tieneCorreo: boolean;
  ofertasSugeridas: OfertaSugerida[];
  ofertas: OfertaDeVinci[];
  plan: PlanDelCaso | null;
}

export interface RiesgoDeVinci {
  /** `false` = faltan vistas del ERP: no hay nada honesto que mostrar. */
  disponible: boolean;
  faltan: string[];
  notas: string[];
  leidoEn: string;
  /** `true` = lo midió el barrido de la mañana (a la hora de `leidoEn`). */
  deLoGuardado: boolean;
  umbral: number;
  modo: ModoDelPiloto | null;
  /** La llave de envío de Vinci (RETENCION_AUTONOMY_ENABLED). */
  envioHabilitado: boolean;
  contratosLeidos: number;
  propietariosLeidos: number;
  enRiesgo: { inquilinos: number; propietarios: number };
  casos: CasoDeVinci[];
}

export interface UmbralDeVinci {
  umbral: number;
  umbralPorDefecto: number;
  topeDescuentoComisionPct: number;
  guardable: boolean;
  actualizadaEn: string | null;
}

export interface MetricasDeVinci {
  enGestion: { inquilinos: number; propietarios: number };
  contratosRetenidos: number;
  propietariosQueSeQuedaron: number;
  inmueblesRetenidos: number;
  canonConservadoCop: number;
  perdidos: { inquilinos: number; propietarios: number; canonPerdidoCop: number };
  tasaDeRetencion: number | null;
}

export type ReviewOutcome = 'upheld' | 'overridden' | 'escalated';

/** Una fila de la cola de Vinci (`GET /retencion/decisions`). */
export interface DecisionDeVinci {
  id: string;
  caseId: string;
  ownerId: string | null;
  decisionType: string;
  tier: number;
  reviewable: boolean;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewOutcome: ReviewOutcome | null;
  createdAt: string;
  payload?: Record<string, unknown>;
}

export interface ResultadoDelClic {
  estado: 'programado' | 'mensaje_listo';
  mensaje: string;
  graciaId?: string;
  ejecutarEn?: string;
}

export interface TareaDelPlan {
  id: string;
  code: string;
  title: string;
  description: string | null;
  responsibleRole: string;
  dueDate: string | null;
  status: 'pendiente' | 'en_progreso' | 'completada' | 'cancelada';
  result: string | null;
}

export interface PlanConTareas {
  plan: {
    id: string;
    caseId: string;
    objective: string;
    expectedResult: string | null;
    actualResult: string | null;
    status: 'activo' | 'logrado' | 'perdido' | 'cancelado';
    createdAt: string;
  };
  tasks: TareaDelPlan[];
}

// ── P-7: lo que la renovación trae del back (`riesgoDeRetencion`) ────────────

export interface CasoEnLaRenovacion {
  puntaje: number;
  umbral: number;
  enRiesgo: boolean;
  senales: SenalDeVinci[];
  ofertaSugerida: OfertaSugerida | null;
}

/** `null` en una población = Vinci lo leyó y NO tiene señales. */
export interface RiesgoDeRetencion {
  inquilino: CasoEnLaRenovacion | null;
  propietario: CasoEnLaRenovacion | null;
  umbral: number;
  medidoEn: string | null;
}
