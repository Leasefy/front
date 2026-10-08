/**
 * Niti · calidad — lo que el micro le muestra a la inmobiliaria en la pestaña
 * «Calidad» de Inmuebles › Portales.
 *
 * Las formas están FIJADAS en el contrato entre repos (26-09-2026,
 * `sesion-2026-09-22/cierre-de-agentes/niti-contrato.json`, sección `panel`;
 * copia verbatim en `src/lib/api/__tests__/niti-contrato.json`). Acá sólo se
 * copian: los textos (`falta[].que`, `problemas[].texto`, `propuestas[].texto`,
 * `mensaje`) llegan en español listos para mostrar y el front NO traduce
 * códigos.
 *
 * Qué hace Niti (decisiones de Nico, `niti-spec.md`): audita los inmuebles
 * publicados, por publicar y arrendados con preaviso con la MISMA regla de
 * «mínimo para publicar» del back, le suma sus extras (coherencia, precio fuera
 * de rango, duplicados, «posible tomado», fotos con IA) y PROPONE. En los tres
 * modos, todo cambio al inmueble espera el clic de una persona, y no le escribe
 * al propietario.
 */

// ── GET /api/agency/{agencyId}/calidad/resumen ──────────────────────────────

/** Las fotos revisadas con IA en el mes, contra el tope de gasto de la inmobiliaria. */
export interface FotosIADelMes {
  /** ¿La IA de fotos está prendida para esta inmobiliaria? */
  activo: boolean;
  revisadasEsteMes: number;
  gastoEstimadoUsdEsteMes: number;
  topeUsdMes: number;
}

export interface ResumenDeCalidad {
  /** El interruptor de Niti para ESTA inmobiliaria. `false` ⇒ no se pide la lista. */
  activo: boolean;
  /** «Niti · calidad». */
  nombre: string;
  /**
   * ISO. `null` si nunca pasó (el contrato trae un ejemplo con valor; una
   * inmobiliaria recién prendida todavía no tiene pasada).
   */
  ultimaPasada: string | null;
  /** Por qué falló la última pasada, en español («sin conexión con el back»). */
  errorDeLaUltimaPasada: string | null;
  inmueblesAuditados: number;
  conProblemas: number;
  /** 0–100. `null` sin inmuebles auditados. */
  puntajePromedio: number | null;
  fotosIA: FotosIADelMes;
}

// ── GET /api/agency/{agencyId}/calidad/inmuebles ────────────────────────────

/** Los cuatro filtros de la lista, tal cual viajan en `?filtro=`. */
export type FiltroDeCalidad = 'todos' | 'con_problemas' | 'posible_tomado' | 'fotos';

export const FILTROS_DE_CALIDAD: readonly FiltroDeCalidad[] = [
  'todos',
  'con_problemas',
  'posible_tomado',
  'fotos',
];

export type TipoDeNegocioDeCalidad = 'arriendo' | 'venta';

/** Por qué el inmueble está en el universo de Niti (lo decide el back). */
export type MotivoDeCalidad = 'publicado' | 'por_publicar' | 'arrendado_con_preaviso';

/** Lo que falta para publicar: la salida VERBATIM de D-01 del back. */
export interface FaltaDeCalidad {
  campo: string;
  que: string;
}

/** Un extra de Niti. `texto` en español; `codigo` nunca se pinta. */
export interface ProblemaDeCalidad {
  codigo: string;
  /** «alta» | «media» | «baja» en el ejemplo del contrato; no se enumera. */
  severidad: string;
  texto: string;
}

export interface FotoSenalada {
  fotoId: string;
  url: string;
  motivo: string;
}

/**
 * `aplicable` — tiene valor concreto: aprobarla la aplica en el back.
 * `tarea` — es para el asesor: aprobarla es «la marqué hecha».
 */
export type TipoDePropuesta = 'aplicable' | 'tarea';

/**
 * Qué hace la propuesta al aprobarla. `desconocida` NO está en el contrato:
 * es lo que el cliente pone cuando el micro manda una acción nueva que este
 * front no sabe pintar — se muestra el texto y se puede rechazar, pero no se
 * ofrece un botón de aprobar que no se sabe qué hace.
 */
export type AccionDePropuesta = 'campo' | 'despublicar' | 'portada' | 'tarea' | 'desconocida';

export interface PropuestaDeCalidad {
  /** El `correccionId`: la llave de la decisión. */
  id: string;
  tipo: TipoDePropuesta;
  texto: string;
  accion: AccionDePropuesta;
}

export interface InmuebleAuditado {
  propertyId: string;
  codigo: number | null;
  titulo: string;
  barrio: string | null;
  ciudad: string | null;
  tipoDeNegocio: TipoDeNegocioDeCalidad;
  motivo: MotivoDeCalidad;
  /** 0–100. */
  puntaje: number;
  /** Publicado y arrendado sin preaviso: habría que despublicarlo. */
  posibleTomado: boolean;
  falta: FaltaDeCalidad[];
  problemas: ProblemaDeCalidad[];
  fotosSenaladas: FotoSenalada[];
  propuestas: PropuestaDeCalidad[];
  /** ISO. */
  auditadoEn: string;
  /** La ficha del inmueble en el panel. */
  href: string;
}

/** Ordenada de peor a mejor puntaje (el orden lo pone el micro). */
export interface PaginaDeCalidad {
  items: InmuebleAuditado[];
  total: number;
  page: number;
  limit: number;
}

export interface FiltrosDeCalidad {
  page?: number;
  limit?: number;
  filtro?: FiltroDeCalidad;
}

// ── POST /api/agency/{agencyId}/calidad/propuestas/{correccionId}/decision ──

export type DecisionDeCalidad = 'approve' | 'reject';

/**
 * propuesta → aplicada (approve de una aplicable) | fallida (el back no la
 * pudo aplicar; `mensaje` = el motivo) | rechazada | resuelta (el problema
 * desapareció solo) | hecha (approve de una tarea).
 */
export type EstadoDePropuesta = 'propuesta' | 'aplicada' | 'fallida' | 'rechazada' | 'resuelta' | 'hecha';

export interface RespuestaDeDecision {
  id: string;
  estado: EstadoDePropuesta;
  /** Listo para mostrar: «Listo: se puso el barrio «Chicó Norte».». */
  mensaje: string;
}
