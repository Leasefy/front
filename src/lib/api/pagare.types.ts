/**
 * T-0109 contract.md §3.1.E — codeudores del contrato y el pagaré con carta
 * de instrucciones. Back WU-4 no existe todavía (front y back corren en
 * paralelo sobre el contrato congelado): estos tipos son la ÚNICA fuente de
 * verdad hasta que se integre.
 *
 * Degradación (contract.md §3.2, última fila): un 404 en E1/E5 (back
 * anterior a WU-4) oculta la sección de codeudores/pagaré entera; un
 * `disponible:false` en E5 (flag apagado, o sin proveedor) la muestra en
 * modo lectura con el motivo — nunca un crash ni un reintento en bucle.
 */

export type TipoDeDocumentoDelCodeudor = 'CC' | 'CE' | 'PASSPORT' | 'PPT';

export interface CodeudorDto {
  nombre: string;
  tipoDeDocumento: TipoDeDocumentoDelCodeudor;
  documento: string;
  email: string;
  /** E.164 en la respuesta; en el request lo que digite la persona (el back valida). */
  celular: string;
}

export interface CodeudorResponse {
  id: string;
  contractId: string;
  nombre: string;
  tipoDeDocumento: TipoDeDocumentoDelCodeudor;
  documento: string;
  email: string;
  celular: string;
  /** Parte de un pagaré CREANDO | PENDIENTE_DE_FIRMA | FIRMADO — no se puede borrar mientras esto sea true en un pagaré FIRMADO. */
  enPagare: boolean;
  createdAt: string;
  updatedAt: string;
}

export type EstadoDelPagare =
  | 'CREANDO'
  | 'PENDIENTE_DE_FIRMA'
  | 'FIRMADO'
  | 'RECHAZADO'
  | 'VENCIDO'
  | 'CANCELADO'
  | 'ERROR_AL_CREAR';

export type TipoDeFirmanteDelPagare = 'INQUILINO' | 'CODEUDOR';
export type EstadoDelFirmanteDelPagare = 'PENDIENTE' | 'FIRMADO' | 'RECHAZADO' | 'VENCIDO';

export interface FirmanteDelPagareResponse {
  id: string;
  tipo: TipoDeFirmanteDelPagare;
  codeudorId: string | null;
  nombre: string;
  tipoDeDocumento: string;
  documento: string;
  email: string;
  estado: EstadoDelFirmanteDelPagare;
  firmadoAt: string | null;
}

export interface PagareResponse {
  id: string;
  contractId: string;
  estado: EstadoDelPagare;
  proveedor: string;
  /** La UI DEBE mostrar el aviso "Sandbox — sin validez jurídica" cuando esto es true. */
  esSandbox: boolean;
  emitidoAt: string;
  emitidoPor: { id: string; nombre: string } | null;
  firmadoAt: string | null;
  canceladoAt: string | null;
  motivoDeCancelacion: string | null;
  ultimoError: string | null;
  beneficiarios: { nombre: string; tipoDeDocumento: string; documento: string }[];
  /** INQUILINO primero, después codeudores por createdAt. */
  firmantes: FirmanteDelPagareResponse[];
  documentos: { pagare: { firmado: boolean }; cartaDeInstrucciones: { firmado: boolean } };
}

/** E5 — el último pagaré vivo (o el último de cualquier estado si no hay uno vivo). */
export interface PagareDelContratoResponse {
  pagare: PagareResponse | null;
  /** `PAGARE_ENABLED` y un proveedor resoluble. `false` → sección de sólo lectura. */
  disponible: boolean;
}

export type TipoDeDocumentoDelPagare = 'pagare' | 'carta-de-instrucciones';

/** E8 */
export interface DocumentoDelPagareResponse {
  url: string;
  expiresAt: string;
  firmado: boolean;
}

/** E9 — la pantalla "mi firma" del inquilino. */
export interface MiFirmaDelPagareResponse {
  pagareId: string | null;
  estado: EstadoDelPagare | null;
  miEstado: EstadoDelFirmanteDelPagare | null;
  urlDeFirma: string | null;
  esSandbox: boolean;
}
