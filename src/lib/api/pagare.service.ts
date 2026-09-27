/**
 * T-0109 contract.md §3.1.E — cliente de codeudores y pagaré. Back WU-4 no
 * existe todavía — cada llamada puede responder 404 (endpoint ausente,
 * back anterior a WU-4) o los códigos de contract.md §3.3; el caller decide
 * cómo degradar (ver `src/lib/contratos/pagare.ts`), este archivo sólo
 * transporta.
 */

import { apiClient } from './client';
import type {
  CodeudorDto,
  CodeudorResponse,
  DocumentoDelPagareResponse,
  MiFirmaDelPagareResponse,
  PagareDelContratoResponse,
  PagareResponse,
  TipoDeDocumentoDelPagare,
} from './pagare.types';

export const codeudoresApi = {
  /** E1 */
  list(contractId: string): Promise<CodeudorResponse[]> {
    return apiClient.get<CodeudorResponse[]>(`/contracts/${contractId}/codeudores`);
  },

  /** E2 — 409 `CODEUDOR_DUPLICADO` / `PAGARE_EN_CURSO`; 400 `CELULAR_INVALIDO`. */
  create(contractId: string, dto: CodeudorDto): Promise<CodeudorResponse> {
    return apiClient.post<CodeudorResponse>(`/contracts/${contractId}/codeudores`, dto);
  },

  /** E3 — al menos un campo. */
  update(contractId: string, codeudorId: string, dto: Partial<CodeudorDto>): Promise<CodeudorResponse> {
    return apiClient.patch<CodeudorResponse>(`/contracts/${contractId}/codeudores/${codeudorId}`, dto);
  },

  /** E4 — 409 `CODEUDOR_EN_PAGARE` si es parte de un pagaré FIRMADO; `PAGARE_EN_CURSO` mientras uno está vivo. */
  remove(contractId: string, codeudorId: string): Promise<{ id: string }> {
    return apiClient.delete<{ id: string }>(`/contracts/${contractId}/codeudores/${codeudorId}`);
  },
};

export const pagareApi = {
  /** E5 */
  obtener(contractId: string): Promise<PagareDelContratoResponse> {
    return apiClient.get<PagareDelContratoResponse>(`/contracts/${contractId}/pagare`);
  },

  /** E6 — 503 `PAGARE_NO_DISPONIBLE`; 409 varios (ver contract.md §3.3); 502 `PROVEEDOR_DE_PAGARE_FALLO`. */
  emitir(contractId: string): Promise<PagareResponse> {
    return apiClient.post<PagareResponse>(`/contracts/${contractId}/pagare`, {});
  },

  /** E7 — 409 `PAGARE_NO_CANCELABLE` fuera de PENDIENTE_DE_FIRMA. */
  cancelar(contractId: string, motivo?: string): Promise<PagareResponse> {
    return apiClient.post<PagareResponse>(`/contracts/${contractId}/pagare/cancelar`, motivo ? { motivo } : {});
  },

  /** E8 */
  documento(contractId: string, tipo: TipoDeDocumentoDelPagare): Promise<DocumentoDelPagareResponse> {
    return apiClient.get<DocumentoDelPagareResponse>(`/contracts/${contractId}/pagare/documentos/${tipo}`);
  },

  /** E9 — sólo el inquilino del contrato. */
  miFirma(contractId: string): Promise<MiFirmaDelPagareResponse> {
    return apiClient.get<MiFirmaDelPagareResponse>(`/contracts/${contractId}/pagare/mi-firma`);
  },

  /**
   * E11 — dev only, `esSandbox` gatea si el front la ofrece. El endpoint no
   * existe en absoluto (404) fuera del gate positivo del back.
   */
  simular(pagareId: string, firmanteId: string, accion: 'FIRMAR' | 'RECHAZAR'): Promise<PagareResponse> {
    return apiClient.post<PagareResponse>(
      `/desarrollo/pagares/${pagareId}/firmantes/${firmanteId}/simular`,
      { accion },
    );
  },
};
