/**
 * Los documentos que la inmobiliaria sube a un contrato (Nico, 10-10-2026:
 * «el usuario debería de poder agregar documentos al contrato»).
 *
 * Espeja `DocumentosDelContratoController` del back. Sólo los ve la
 * inmobiliaria; quitar uno lo ARCHIVA (no se borra).
 */

import { apiClient } from './client';
import { enviarFormulario } from './ciclo-de-vida.service';

export const TIPOS_DE_DOCUMENTO_DEL_CONTRATO = [
  'CONTRATO_FIRMADO',
  'OTROSI',
  'INVENTARIO',
  'PAGARE',
  'POLIZA',
  'IDENTIDAD',
  'OTRO',
] as const;

export type TipoDeDocumentoDelContrato = (typeof TIPOS_DE_DOCUMENTO_DEL_CONTRATO)[number];

/** Los mismos nombres que el back (`NOMBRE_DEL_TIPO`). */
export const NOMBRE_DEL_TIPO_DE_DOCUMENTO: Record<TipoDeDocumentoDelContrato, string> = {
  CONTRATO_FIRMADO: 'Contrato firmado',
  OTROSI: 'Otrosí',
  INVENTARIO: 'Inventario o acta de entrega',
  PAGARE: 'Pagaré',
  POLIZA: 'Póliza o afianzadora',
  IDENTIDAD: 'Documento de identidad',
  OTRO: 'Otro documento',
};

export const MAX_LARGO_DE_LA_NOTA_DEL_DOCUMENTO = 300;
export const MAX_BYTES_DEL_DOCUMENTO = 10 * 1024 * 1024;
export const TIPOS_DE_ARCHIVO_DEL_DOCUMENTO = 'application/pdf,image/jpeg,image/png,image/webp';

export interface DocumentoDelContrato {
  id: string;
  tipo: string;
  tipoNombre: string;
  nota: string | null;
  archivoNombre: string;
  archivoTipo: string;
  archivoBytes: number;
  subidoPorNombre: string;
  /** ISO. */
  subidoEl: string;
}

export interface DocumentosDelContrato {
  /** `false` = la base todavía no tiene la tabla (migración sin aplicar). */
  disponible: boolean;
  documentos: DocumentoDelContrato[];
  archivados: number;
}

export const documentosDelContratoApi = {
  listar: (contractId: string) =>
    apiClient.get<DocumentosDelContrato>(`/contracts/${contractId}/documentos`),

  subir: (
    contractId: string,
    datos: { tipo: TipoDeDocumentoDelContrato; nota?: string; archivo: File },
  ) => {
    const formulario = new FormData();
    formulario.append('tipo', datos.tipo);
    const nota = datos.nota?.trim();
    if (nota) formulario.append('nota', nota);
    formulario.append('archivo', datos.archivo);
    return enviarFormulario<DocumentoDelContrato>(`/contracts/${contractId}/documentos`, formulario);
  },

  url: (contractId: string, documentoId: string) =>
    apiClient.get<{ url: string }>(`/contracts/${contractId}/documentos/${documentoId}/url`),

  archivar: (contractId: string, documentoId: string) =>
    apiClient.post<{ archivado: true }>(
      `/contracts/${contractId}/documentos/${documentoId}/archivar`,
      {},
    ),
};
