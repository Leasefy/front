/**
 * El contrato armado desde la plantilla legal, ANTES de que el contrato exista.
 *
 * `/inmobiliaria/contratos/plantilla/*`. Son tres pasos y ninguno se saltea:
 *
 *   1. `preparar`  — qué campos hay que llenar, qué cláusulas ofrece el
 *                    catálogo cerrado y cuáles son los topes legales.
 *   2. `redactar`  — OPCIONAL. Una propuesta del modelo, ya revisada por el
 *                    validador del backend. Es una propuesta: no genera nada.
 *   3. `generar`   — el PDF. Devuelve un `uploadedPdfPath` idéntico al que
 *                    produce `POST /contracts/upload-pdf`, así que de ahí en
 *                    adelante el camino es el mismo que el de un PDF subido a
 *                    mano: `POST /contracts` con `contractOrigin=UPLOADED_PDF`.
 *
 * 🔴 Nada de esto crea ni activa un contrato. El paso 3 produce un archivo;
 * crear el contrato con él lo hace una persona apretando el botón de siempre.
 *
 * 🔴 Los cuerpos se arman clave por clave y no con un spread: el backend valida
 * con `forbidNonWhitelisted: true`, así que una clave de más no se ignora —
 * devuelve 400. `contratos-plantilla.service.test.ts` fija el juego exacto.
 */

import { ApiError, apiClient } from './client';

const BASE = '/inmobiliaria/contratos/plantilla';

// ============================================================================
// Tipos — el shape REAL de los DTOs del backend
// ============================================================================

/** `USOS_DE_INMUEBLE` del backend. Decide la LEY que rige el contrato. */
export type UsoDelInmueble = 'VIVIENDA' | 'COMERCIAL';

/** `TipoDeCampo` de `plantillas-legales/tipos.ts`. */
export type TipoDeCampo =
  | 'texto'
  | 'parrafo'
  | 'fecha'
  | 'moneda'
  | 'numero'
  | 'porcentaje';

export type PeriodicidadDelCanon =
  | 'MENSUAL'
  | 'BIMESTRAL'
  | 'TRIMESTRAL'
  | 'SEMESTRAL'
  | 'ANUAL';

export type QuienPagaElConcepto =
  | 'INQUILINO'
  | 'PROPIETARIO'
  | 'INMOBILIARIA'
  | 'TERCERO';

export type TipoDeDocumentoDePersona = 'CC' | 'CE' | 'NIT' | 'PASSPORT';

/** `TipoDocumentoLegal`, acotado a las dos plantillas de contrato. */
export type CodigoDePlantillaDeContrato = 'CONTRATO_VIVIENDA' | 'CONTRATO_COMERCIAL';

export interface ConceptoDelBorrador {
  nombre: string;
  valorCop: number;
  paga: QuienPagaElConcepto;
  recurrente?: boolean;
}

/**
 * El contrato que TODAVÍA NO EXISTE — `BorradorContratoDto`.
 *
 * No hay `contractId` porque la pantalla está justamente creando el contrato:
 * el inmueble se identifica por el mandato (`consignacionId`) o por la
 * propiedad (`propertyId`), que es de donde salen el propietario y la
 * dirección.
 */
export interface BorradorDeContrato {
  consignacionId?: string;
  propertyId?: string;
  /**
   * 🔴 Sin esto —y sin un tipo de inmueble que lo resuelva— el backend
   * responde 400 `USO_INDETERMINADO`. No adivina, y con razón: emitir un local
   * con la plantilla de vivienda invocaría la Ley 820 sobre un contrato que se
   * rige por el Código de Comercio.
   */
  uso?: UsoDelInmueble;
  arrendatarioNombre?: string;
  arrendatarioDocumento?: string;
  arrendatarioTipoDocumento?: TipoDeDocumentoDePersona;
  arrendatarioEmail?: string;
  arrendatarioTelefono?: string;
  arrendadorNombre?: string;
  arrendadorDocumento?: string;
  canonMensual?: number;
  periodicidad?: PeriodicidadDelCanon;
  diaDePago?: number;
  /** `YYYY-MM-DD`. */
  fechaInicio?: string;
  /** `YYYY-MM-DD`. */
  fechaFin?: string;
  destinacion?: string;
  adminFee?: number;
  conceptos?: ConceptoDelBorrador[];
  /** Reajuste anual pactado, en %. El art. 20 lo topa en el IPC del año anterior. */
  reajustePorcentaje?: number;
  /** Valor comercial del inmueble, para el tope del art. 18. */
  valorComercial?: number;
  /** Avalúo catastral vigente, para el tope del art. 18. */
  avaluoCatastral?: number;
}

/** Un campo del formulario, con lo que el backend pudo prellenar. */
export interface CampoDelContrato {
  nombre: string;
  etiqueta: string;
  tipo: TipoDeCampo;
  requerida: boolean;
  ayuda?: string;
  valor: string;
}

/**
 * Una cláusula del catálogo CERRADO.
 *
 * `campos` viene vacío mientras la cláusula no esté elegida: el backend sólo
 * pide las variables de las cláusulas que de verdad van a entrar.
 */
export interface ClausulaDelCatalogo {
  codigo: string;
  titulo: string;
  resumen: string;
  /** La cita corta. Es lo que va a mirar un abogado. */
  norma: string;
  incompatibleCon: string[];
  campos: CampoDelContrato[];
}

export interface TopesLegales {
  /** 1 % del valor comercial (art. 18). `null` si la agencia no lo tiene cargado. */
  canonMaximo: number | null;
  /** Dos veces el avalúo catastral (art. 18). */
  valorComercialMaximo: number | null;
  ipcAno: number | null;
  ipcValor: number | null;
  fuente: string;
}

export interface PreparacionDeContrato {
  codigo: CodigoDePlantillaDeContrato;
  nombre: string;
  descripcion: string;
  uso: UsoDelInmueble;
  nombreSugerido: string;
  inmueble: { id: string | null; titulo: string; direccion: string } | null;
  campos: CampoDelContrato[];
  clausulas: ClausulaDelCatalogo[];
  /** `false` cuando al backend le falta `ANTHROPIC_API_KEY`. */
  iaDisponible: boolean;
  topes: TopesLegales;
}

export interface ContratoGeneradoDesdePlantilla {
  /** Va tal cual en `POST /contracts`. El mismo valor que `upload-pdf`. */
  uploadedPdfPath: string;
  contractOrigin: 'UPLOADED_PDF';
  codigo: CodigoDePlantillaDeContrato;
  uso: UsoDelInmueble;
  nombreSugerido: string;
  /** Los códigos de las cláusulas que quedaron impresas. */
  clausulas: string[];
}

/**
 * Un motivo de rechazo del validador, con la norma que lo sostiene.
 *
 * 🔴 Esto se muestra COMPLETO y en su lenguaje. Es la parte más valiosa de la
 * respuesta: dice qué cláusula es ilegal y por qué artículo. Resumirlo a «hubo
 * un error, revisá los datos» tira a la basura lo único que le sirve a quien
 * tiene que arreglarlo.
 */
export interface MotivoDeRechazo {
  /** Llave estable: `DEPOSITO_EN_DINERO`, `CANON_SOBRE_EL_TOPE`, … */
  codigo: string;
  /** Qué cláusula, qué variable o qué campo lo provocó. */
  donde: string;
  mensaje: string;
  norma: string;
}

export interface PropuestaDeLaIa {
  /** Códigos del catálogo que el modelo eligió. Ya filtrados por el validador. */
  clausulas: string[];
  /** Lo que el modelo dedujo del texto libre. */
  variables: Record<string, string>;
  estipulacionesEspeciales?: string;
  /** Lo ILEGAL. Con uno solo de estos el contrato no se emite. */
  motivos: MotivoDeRechazo[];
  /** Lo que todavía FALTA (los siete puntos del art. 3). No es un rechazo. */
  pendientes: MotivoDeRechazo[];
  /** `true` cuando no hay nada ilegal. Puede haber `pendientes` igual. */
  aplicable: boolean;
}

// ============================================================================
// Cuerpos — clave por clave, porque el backend rechaza las de más
// ============================================================================

/** Deja fuera `undefined`, `null` y la cadena vacía. El `0` sí pasa. */
function poner(
  cuerpo: Record<string, unknown>,
  clave: string,
  valor: unknown,
): void {
  if (valor === undefined || valor === null || valor === '') return;
  cuerpo[clave] = valor;
}

function cuerpoDelBorrador(b: BorradorDeContrato): Record<string, unknown> {
  const cuerpo: Record<string, unknown> = {};
  poner(cuerpo, 'consignacionId', b.consignacionId);
  poner(cuerpo, 'propertyId', b.propertyId);
  poner(cuerpo, 'uso', b.uso);
  poner(cuerpo, 'arrendatarioNombre', b.arrendatarioNombre);
  poner(cuerpo, 'arrendatarioDocumento', b.arrendatarioDocumento);
  poner(cuerpo, 'arrendatarioTipoDocumento', b.arrendatarioTipoDocumento);
  poner(cuerpo, 'arrendatarioEmail', b.arrendatarioEmail);
  poner(cuerpo, 'arrendatarioTelefono', b.arrendatarioTelefono);
  poner(cuerpo, 'arrendadorNombre', b.arrendadorNombre);
  poner(cuerpo, 'arrendadorDocumento', b.arrendadorDocumento);
  poner(cuerpo, 'canonMensual', b.canonMensual);
  poner(cuerpo, 'periodicidad', b.periodicidad);
  poner(cuerpo, 'diaDePago', b.diaDePago);
  poner(cuerpo, 'fechaInicio', b.fechaInicio);
  poner(cuerpo, 'fechaFin', b.fechaFin);
  poner(cuerpo, 'destinacion', b.destinacion);
  poner(cuerpo, 'adminFee', b.adminFee);
  poner(cuerpo, 'reajustePorcentaje', b.reajustePorcentaje);
  poner(cuerpo, 'valorComercial', b.valorComercial);
  poner(cuerpo, 'avaluoCatastral', b.avaluoCatastral);
  if (b.conceptos?.length) {
    cuerpo.conceptos = b.conceptos.map((c) => {
      const fila: Record<string, unknown> = {
        nombre: c.nombre,
        valorCop: c.valorCop,
        paga: c.paga,
      };
      if (c.recurrente !== undefined) fila.recurrente = c.recurrente;
      return fila;
    });
  }
  return cuerpo;
}

/** Sólo las claves con texto: una variable vacía no pisa el prellenado. */
function soloConTexto(valores: Record<string, string>): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const [k, v] of Object.entries(valores)) {
    if (typeof v === 'string' && v.trim() !== '') salida[k] = v;
  }
  return salida;
}

// ============================================================================
// Leer los errores del validador
// ============================================================================

function esArregloDeMotivos(x: unknown): x is MotivoDeRechazo[] {
  return (
    Array.isArray(x) &&
    x.every(
      (m) =>
        typeof m === 'object' &&
        m !== null &&
        typeof (m as MotivoDeRechazo).mensaje === 'string' &&
        typeof (m as MotivoDeRechazo).norma === 'string',
    )
  );
}

/**
 * Los `motivos[]` de un `400 CONTRATO_NO_VALIDO`, o `[]` si el error es otro.
 *
 * El backend los manda en el cuerpo; `ApiError.detalle` los conserva. Sin este
 * camino la pantalla sólo tendría el `message`, que es los mismos motivos
 * concatenados en un párrafo — legible para una persona apurada, inútil para
 * arreglar la cláusula que lo causó.
 */
export function motivosDelRechazo(err: unknown): MotivoDeRechazo[] {
  if (!(err instanceof ApiError)) return [];
  const motivos = err.detalle?.motivos;
  return esArregloDeMotivos(motivos) ? motivos : [];
}

/**
 * Las etiquetas de un `400 VARIABLES_FALTANTES` — «Lugar de pago», «Destinación».
 *
 * Es distinto de un rechazo: acá no hay nada ilegal, falta completar.
 */
export function etiquetasFaltantes(err: unknown): string[] {
  if (!(err instanceof ApiError)) return [];
  const etiquetas = err.detalle?.etiquetasFaltantes;
  if (!Array.isArray(etiquetas)) return [];
  return etiquetas.filter((e): e is string => typeof e === 'string');
}

/** ¿El backend no pudo decidir si es vivienda o comercial? */
export function esUsoIndeterminado(err: unknown): boolean {
  return err instanceof ApiError && err.code === 'USO_INDETERMINADO';
}

/**
 * ¿La redacción asistida no está disponible AHORA?
 *
 * Cubre los cinco `503` del backend: sin clave, inalcanzable, error del
 * proveedor, respuesta ilegible y rechazo del modelo. Los cinco significan lo
 * mismo para la pantalla —el contrato se arma igual con el catálogo—, y el
 * `message` de cada uno ya lo explica, así que se muestra tal cual.
 */
export function esIaCaida(err: unknown): boolean {
  return err instanceof ApiError && err.status === 503;
}

// ============================================================================
// API
// ============================================================================

export const contratosPlantillaApi = {
  /**
   * Los campos prellenados, el catálogo de cláusulas y los topes legales.
   *
   * Puede fallar con `400 USO_INDETERMINADO` cuando ni el formulario ni el
   * tipo de inmueble dicen si es vivienda o comercial.
   */
  async preparar(params: {
    borrador: BorradorDeContrato;
    /** Lo que la persona ya escribió, para no perderlo. */
    valores?: Record<string, string>;
    /** Cláusulas ya elegidas: el backend devuelve sus variables. */
    clausulas?: string[];
  }): Promise<PreparacionDeContrato> {
    const cuerpo = cuerpoDelBorrador(params.borrador);
    const valores = soloConTexto(params.valores ?? {});
    if (Object.keys(valores).length) cuerpo.valores = valores;
    if (params.clausulas?.length) cuerpo.clausulas = params.clausulas;
    return apiClient.post<PreparacionDeContrato>(`${BASE}/preparar`, cuerpo);
  },

  /**
   * El PDF. Devuelve el `uploadedPdfPath` que espera `POST /contracts`.
   *
   * Puede fallar con:
   *   - `400 CONTRATO_NO_VALIDO` + `motivos[]` — hay algo ilegal. Leelos con
   *     `motivosDelRechazo(err)` y mostralos completos.
   *   - `400 VARIABLES_FALTANTES` + `etiquetasFaltantes[]` — falta completar.
   *   - `400 USO_INDETERMINADO` — falta decir vivienda o comercial.
   */
  async generar(params: {
    borrador: BorradorDeContrato;
    valores?: Record<string, string>;
    clausulas?: string[];
    estipulacionesEspeciales?: string;
  }): Promise<ContratoGeneradoDesdePlantilla> {
    const cuerpo = cuerpoDelBorrador(params.borrador);
    const valores = soloConTexto(params.valores ?? {});
    if (Object.keys(valores).length) cuerpo.valores = valores;
    if (params.clausulas?.length) cuerpo.clausulas = params.clausulas;
    poner(cuerpo, 'estipulacionesEspeciales', params.estipulacionesEspeciales?.trim());
    return apiClient.post<ContratoGeneradoDesdePlantilla>(`${BASE}/generar`, cuerpo);
  },

  /**
   * Una PROPUESTA del modelo, ya revisada por el validador.
   *
   * 🔴 No genera nada. El modelo elige cláusulas de un catálogo cerrado y llena
   * variables; lo que vuelve lo mira una persona y recién después se genera.
   *
   * Puede fallar con `503` (ver `esIaCaida`): sin `ANTHROPIC_API_KEY`, el
   * modelo caído, o pasados los 25 s de tope del backend.
   */
  async redactarConIa(params: {
    borrador: BorradorDeContrato;
    /** Lo que la persona quiere pactar, en sus palabras. Mínimo 10 caracteres. */
    instrucciones: string;
  }): Promise<PropuestaDeLaIa> {
    const cuerpo = cuerpoDelBorrador(params.borrador);
    cuerpo.instrucciones = params.instrucciones.trim();
    return apiClient.post<PropuestaDeLaIa>(`${BASE}/ia/redactar`, cuerpo);
  },
};
