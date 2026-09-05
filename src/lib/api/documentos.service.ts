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
  | 'CARTA_INCREMENTO';

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

export interface PreparacionDeDocumento {
  codigo: CodigoDeDocumentoLegal;
  nombre: string;
  descripcion: string;
  categoria: CategoriaDeDocumento;
  nombreSugerido: string;
  contrato: {
    id: string;
    codigo: number;
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
