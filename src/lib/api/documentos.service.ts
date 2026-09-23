/**
 * Documentos legales de la inmobiliaria.
 *
 * Es un servicio aparte de `documentosApi` (en `inmobiliaria.service.ts`) a
 * propósito: aquel devolvía la fila cruda del backend casteada a
 * `PropertyDocument` —un tipo con `propertyTitle`, `category` y un `status` en
 * minúsculas que el backend NUNCA mandó—, y su `generate(templateId, variables)`
 * armaba un cuerpo que el `ValidationPipe` rechazaba con 400 (`variables` no
 * está declarado en el DTO y `name` era obligatorio). Acá los tipos son los que
 * el backend responde de verdad.
 */

import { apiClient } from './client';

const BASE = '/inmobiliaria/documents';

// ============================================================================
// Tipos — el shape REAL de `AgencyDocument` / `AgencyDocumentTemplate`
// ============================================================================

/** `AgencyDocumentStatus` del backend, tal cual. */
export type EstadoDeDocumento =
  | 'DOC_DRAFT'
  | 'PENDING_SIGNATURE'
  | 'DOC_SIGNED'
  | 'DOC_EXPIRED';

/** `DocumentTemplateCategory` del backend, tal cual. */
export type CategoriaDeDocumento =
  | 'CONTRATO'
  | 'ACTA'
  | 'INVENTARIO'
  | 'POLIZA'
  | 'CARTA'
  | 'OTRO';

/** Los códigos de las plantillas legales del sistema. */
export type CodigoDeDocumentoLegal =
  | 'CONTRATO_VIVIENDA'
  | 'CONTRATO_COMERCIAL'
  | 'ACTA_ENTREGA'
  | 'ACTA_DEVOLUCION'
  | 'INVENTARIO'
  | 'CARTA_INCREMENTO'
  | 'PAZ_Y_SALVO'
  | 'CERTIFICADO_ESTAR_AL_DIA';

export interface FirmaDeDocumento {
  signerName: string;
  signerEmail: string;
  signedAt?: string;
}

export interface DocumentoGenerado {
  id: string;
  name: string;
  status: EstadoDeDocumento;
  createdAt: string;
  updatedAt: string;
  signatures: FirmaDeDocumento[];
  template: {
    id: string;
    name: string;
    category: CategoriaDeDocumento;
    codigo: CodigoDeDocumentoLegal | null;
  } | null;
  consignacion: { id: string; propertyTitle: string } | null;
  contract: {
    id: string;
    code: number;
    /** El número que la inmobiliaria conoce (el Nui) si el contrato es migrado. */
    externalId?: string | null;
    propertyAddress: string | null;
    propertyCity: string | null;
    tenantName: string | null;
    landlordName: string | null;
  } | null;
}

export interface PlantillaDeLaAgencia {
  id: string;
  name: string;
  category: CategoriaDeDocumento;
  version: string;
  variables: string[];
  codigo: CodigoDeDocumentoLegal | null;
  isActive: boolean;
  updatedAt: string;
  /** El HTML de la plantilla, con sus `{{variables}}` sin reemplazar. */
  content: string;
}

/** Un grupo del catálogo de variables, para no listar 36 en fila. */
export type GrupoDeVariable = 'inmobiliaria' | 'partes' | 'inmueble' | 'contrato';

/**
 * Una variable que una plantilla PROPIA de la inmobiliaria puede usar.
 *
 * 🔴 El catálogo lo sirve el back (`GET /templates/variables`) y no se escribe
 * acá a propósito: es la lista de lo que el sistema sabe llenar de verdad, y
 * duplicada en los dos repos se separa a la primera variable nueva. Una
 * variable ofrecida que el resolvedor no produce imprimiría «—» para siempre en
 * un documento que alguien firma.
 */
export interface VariableDePlantilla {
  nombre: string;
  etiqueta: string;
  grupo: GrupoDeVariable;
}

/** El cuerpo de crear o editar una plantilla propia. */
export interface PlantillaPropiaBody {
  name: string;
  category: CategoriaDeDocumento;
  content: string;
  version?: string;
}

export type TipoDeCampo =
  | 'texto'
  /**
   * Una ciudad de Colombia: se pinta con el selector de DIVIPOLA
   * (`CIUDADES_DE_COLOMBIA`) y no como campo libre. Escrita a mano, la misma
   * ciudad entra de cinco formas distintas y después no cruza con nada.
   */
  | 'ciudad'
  | 'parrafo'
  | 'fecha'
  | 'moneda'
  | 'numero'
  | 'porcentaje';

export interface CampoDeDocumento {
  nombre: string;
  etiqueta: string;
  tipo: TipoDeCampo;
  requerida: boolean;
  ayuda?: string;
  /** Prellenado por el backend con lo que pudo deducir. Puede venir vacío. */
  valor: string;
}

export interface PlantillaLegalDelSistema {
  codigo: CodigoDeDocumentoLegal;
  nombre: string;
  descripcion: string;
  categoria: CategoriaDeDocumento;
  version: string;
  /** `contrato` obliga a elegir un contrato; el otro acepta también un inmueble. */
  requiere: 'contrato' | 'contrato-o-inmueble';
  campos: Omit<CampoDeDocumento, 'valor'>[];
}

export interface RevisionDelIncremento {
  ipcAno: number | null;
  ipcValor: number | null;
  /** El tope del art. 20: 100 % del IPC del año calendario anterior. */
  topeLegal: number | null;
  canonVigente: number;
  canonEnElTope: number | null;
  mesesBajoElMismoPrecio: number;
  cumpleLosDoceMeses: boolean;
  fuente: string;
}

/**
 * El veredicto del libro para el paz y salvo y el certificado de estar al día.
 *
 * 🔴 Viaja en `preparar` y no sólo en el error de `generar` a propósito: la
 * pantalla tiene que poder decir «no se puede, y por esto» ANTES de que
 * alguien llene los campos. Descubrirlo con un 400 al final es hacerle perder
 * el tiempo a quien tiene un cliente esperando el papel.
 *
 * Las cifras NO están acá y no se pintan: las pone el back en el documento.
 * Un paz y salvo cuyo «$0» lo mostró el front es un número que el front no
 * puede defender.
 */
export interface RevisionDelCertificado {
  puedeEmitirse: boolean;
  impedimentos: { code: string; mensaje: string }[];
  /** `YYYY-MM-DD`: a qué día corresponde la lectura. */
  fechaDeCorte: string;
  hayActa: boolean;
}

export interface PreparacionDeDocumento {
  codigo: CodigoDeDocumentoLegal;
  nombre: string;
  descripcion: string;
  categoria: CategoriaDeDocumento;
  nombreSugerido: string;
  contrato: {
    id: string;
    /** Nuestro consecutivo. */
    codigo: number;
    /** El número que la inmobiliaria conoce (el Nui) si el contrato es migrado. */
    numeroExterno?: string | null;
    direccion: string | null;
    arrendatario: string | null;
    arrendador: string | null;
    canon: number | null;
    uso: 'VIVIENDA' | 'COMERCIAL';
  } | null;
  inmueble: { id: string; titulo: string; direccion: string } | null;
  itemsDeInventario: number;
  campos: CampoDeDocumento[];
  incremento: RevisionDelIncremento | null;
  /** Sólo en las dos plantillas de certificado; `null` en las otras seis. */
  certificado?: RevisionDelCertificado | null;
}

export interface GenerarDocumentoBody {
  codigo: CodigoDeDocumentoLegal;
  contractId?: string;
  consignacionId?: string;
  overrides: Record<string, string>;
  name?: string;
}

// ============================================================================
// Servicio
// ============================================================================

function lista<T>(res: { data: T[] } | T[]): T[] {
  return Array.isArray(res) ? res : res.data;
}

export const documentosLegalesApi = {
  /** Los documentos ya generados por la agencia. */
  async documentos(): Promise<DocumentoGenerado[]> {
    return lista(
      await apiClient.get<{ data: DocumentoGenerado[] } | DocumentoGenerado[]>(BASE),
    );
  },

  /**
   * Las plantillas de la agencia. El backend siembra las legales del sistema
   * la primera vez que se piden, así que esta llamada nunca devuelve cero en
   * una agencia recién creada.
   */
  async plantillas(): Promise<PlantillaDeLaAgencia[]> {
    return lista(
      await apiClient.get<{ data: PlantillaDeLaAgencia[] } | PlantillaDeLaAgencia[]>(
        `${BASE}/templates`,
      ),
    );
  },

  /** Las variables que puede usar una plantilla propia de la inmobiliaria. */
  async variablesDePlantilla(): Promise<VariableDePlantilla[]> {
    return lista(
      await apiClient.get<{ data: VariableDePlantilla[] } | VariableDePlantilla[]>(
        `${BASE}/templates/variables`,
      ),
    );
  },

  /**
   * Crear una plantilla propia. El back RECHAZA una `{{variable}}` que no sabe
   * llenar (400 `VARIABLE_DESCONOCIDA`) — el editor lo avisa antes, pero la
   * autoridad es el back.
   */
  async crearPlantilla(body: PlantillaPropiaBody): Promise<PlantillaDeLaAgencia> {
    return apiClient.post<PlantillaDeLaAgencia>(`${BASE}/templates`, body);
  },

  /** Editar una plantilla propia. Las del sistema responden 400. */
  async editarPlantilla(
    id: string,
    body: Partial<PlantillaPropiaBody>,
  ): Promise<PlantillaDeLaAgencia> {
    return apiClient.put<PlantillaDeLaAgencia>(`${BASE}/templates/${id}`, body);
  },

  /**
   * Copiar una plantilla —del sistema o propia— en una nueva de la agencia.
   * Es la salida de que las del sistema no se editen: la copia sí.
   */
  async duplicarPlantilla(id: string, name?: string): Promise<PlantillaDeLaAgencia> {
    return apiClient.post<PlantillaDeLaAgencia>(`${BASE}/templates/${id}/duplicar`, {
      ...(name ? { name } : {}),
    });
  },

  /** Archivar una plantilla propia (el back la marca inactiva, no la borra). */
  async borrarPlantilla(id: string): Promise<void> {
    await apiClient.delete<void>(`${BASE}/templates/${id}`);
  },

  /**
   * Generar un documento a partir de una plantilla PROPIA.
   *
   * Es otra llamada que `generar()`: aquella manda `codigo` —una de las ocho
   * legales del sistema, con sus campos escritos a mano— y ésta manda
   * `templateId`. El back reemplaza las variables con los datos del contrato o
   * del mandato; si la plantilla usa variables y no se elige ninguno de los
   * dos, responde 400 `FALTA_SOBRE_QUE_GENERARLO`.
   */
  async generarDePlantillaPropia(body: {
    templateId: string;
    contractId?: string;
    consignacionId?: string;
    name?: string;
  }): Promise<DocumentoGenerado> {
    return apiClient.post<DocumentoGenerado>(`${BASE}/generate`, body);
  },

  /** Qué documentos sabe armar el sistema y qué pide cada uno. */
  async plantillasLegales(): Promise<PlantillaLegalDelSistema[]> {
    return lista(
      await apiClient.get<
        { data: PlantillaLegalDelSistema[] } | PlantillaLegalDelSistema[]
      >(`${BASE}/plantillas-legales`),
    );
  },

  /** Los campos prellenados con datos reales del contrato o del inmueble. */
  async preparar(params: {
    codigo: CodigoDeDocumentoLegal;
    contractId?: string;
    consignacionId?: string;
    /**
     * Sólo la carta de incremento. El tope legal es el IPC del año calendario
     * anterior al de la vigencia (Ley 820 de 2003, art. 20), así que cambiar
     * esta fecha cambia el tope y hay que volver a preguntarlo.
     */
    fechaDeVigencia?: string;
  }): Promise<PreparacionDeDocumento> {
    const query = new URLSearchParams({ codigo: params.codigo });
    if (params.contractId) query.set('contractId', params.contractId);
    if (params.consignacionId) query.set('consignacionId', params.consignacionId);
    if (params.fechaDeVigencia) query.set('fechaDeVigencia', params.fechaDeVigencia);
    return apiClient.get<PreparacionDeDocumento>(`${BASE}/preparar?${query.toString()}`);
  },

  /** Genera el documento. El backend reemplaza las variables y guarda el HTML. */
  async generar(body: GenerarDocumentoBody): Promise<DocumentoGenerado> {
    return apiClient.post<DocumentoGenerado>(`${BASE}/generate`, body);
  },

  /**
   * El PDF. Va por `getBlob` y no por un `<a href>`: la ruta pide el token de
   * sesión en el encabezado, así que un enlace pelado responde 401.
   */
  async pdf(id: string): Promise<Blob> {
    return apiClient.getBlob(`${BASE}/${id}/pdf`);
  },
};
