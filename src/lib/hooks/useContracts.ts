'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { contractsApi, esContratoSinDocumento } from '@/lib/api/contracts.service';
import type { Contract, ContractRejection } from '@/lib/types/contract';
import type {
  CreateContractDto,
  SignContractDto,
  ContractPreview,
  UpdateContractDto,
  RejectContractDto,
  CancelContractDto,
  CrearContratoManualDto,
} from '@/lib/api/contracts.types';
import { useRefrescoAutomatico } from './use-refresco-automatico';

// ============================================================================
// useContracts - list contracts with stats and helpers
// ============================================================================

export function useContracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // El error entero: `FalloDeCarga` necesita el status, no el texto.
  const [errorCrudo, setErrorCrudo] = useState<unknown>(null);

  const fetchContracts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setErrorCrudo(null);
    try {
      const result = await contractsApi.getMine();
      setContracts(result);
    } catch (err) {
      setErrorCrudo(err);
      const message = err instanceof Error ? err.message : 'Error cargando contratos';
      setError(message);
      setContracts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const stats = useMemo(() => ({
    total: contracts.length,
    pendingLandlord: contracts.filter(c => c.status === 'pending_landlord').length,
    pendingTenant: contracts.filter(c => c.status === 'pending_tenant').length,
    active: contracts.filter(c => c.status === 'active').length,
    draft: contracts.filter(c => c.status === 'draft').length,
  }), [contracts]);

  const getPending = useCallback(() => {
    return contracts.filter(c =>
      c.status === 'pending_landlord' || c.status === 'pending_tenant' || c.status === 'draft'
    );
  }, [contracts]);

  const getActive = useCallback(() => {
    return contracts.filter(c => c.status === 'active');
  }, [contracts]);

  const getForProperty = useCallback((propertyId: string) => {
    return contracts.filter(c => c.propertyId === propertyId);
  }, [contracts]);

  const getByPropertyAndTenant = useCallback((propertyId: string, tenantId: string) => {
    return contracts.find(c => c.propertyId === propertyId && c.tenantId === tenantId) ?? null;
  }, [contracts]);

  const getByApplicationId = useCallback((applicationId: string) => {
    return contracts.find(c => c.applicationId === applicationId) ?? null;
  }, [contracts]);

  useRefrescoAutomatico(['contracts', 'contratos'], fetchContracts);

  return {
    contracts, stats, isLoading, error, errorCrudo,
    refetch: fetchContracts,
    getPending, getActive, getForProperty, getByPropertyAndTenant, getByApplicationId,
  };
}

// ============================================================================
// useContract - single contract by id
// ============================================================================

export function useContract(id: string | null) {
  const [contract, setContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // El error ENTERO, no su mensaje: `clasificarFallo` necesita el status para
  // distinguir un 404 (no reintentar, volver) de una red caída (reintentar).
  // `error` sigue siendo el string de siempre para los otros consumidores.
  const [errorCrudo, setErrorCrudo] = useState<unknown>(null);

  const load = useCallback(async () => {
    if (!id) {
      setContract(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    setErrorCrudo(null);
    try {
      const c = await contractsApi.getById(id);
      setContract(c);
    } catch (err) {
      setErrorCrudo(err);
      setError(err instanceof Error ? err.message : 'Error cargando contrato');
      setContract(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  return { contract, isLoading, error, errorCrudo, refetch: load, setContract };
}

// ============================================================================
// useContractByApplication - load the contract tied to an application
// ============================================================================

export function useContractByApplication(applicationId: string | null | undefined) {
  const [contract, setContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!applicationId) {
      setContract(null);
      return;
    }
    setIsLoading(true);
    try {
      const c = await contractsApi.getByApplicationId(applicationId);
      setContract(c);
    } catch {
      setContract(null);
    } finally {
      setIsLoading(false);
    }
  }, [applicationId]);

  useEffect(() => { load(); }, [load]);

  return { contract, isLoading, refetch: load };
}

// ============================================================================
// useContractPreview - load the preview (HTML or signed PDF URL)
// ============================================================================

/**
 * `sinDocumento` NO es un error: es el contrato migrado, que se cargó desde el
 * archivo de la inmobiliaria y nunca tuvo documento en Leasefy. Va aparte de
 * `error` para que la pantalla pueda contarlo en tono neutro en vez de pintar
 * un cartel rojo (ver `esContratoSinDocumento`).
 *
 * `errorCrudo` es el error entero —no su texto— porque `<FalloDeCarga>`
 * clasifica por status, no por mensaje. Mismo par que en `useContracts`.
 */
export function useContractPreview(id: string | null) {
  const [preview, setPreview] = useState<ContractPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCrudo, setErrorCrudo] = useState<unknown>(null);
  const [sinDocumento, setSinDocumento] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    setErrorCrudo(null);
    setSinDocumento(false);
    try {
      const p = await contractsApi.getPreview(id);
      setPreview(p);
    } catch (err) {
      if (esContratoSinDocumento(err)) {
        setSinDocumento(true);
      } else {
        setErrorCrudo(err);
        setError(err instanceof Error ? err.message : 'No se pudo cargar el contrato');
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  return { preview, isLoading, error, errorCrudo, sinDocumento, refetch: load };
}

// ============================================================================
// useSignedPdfUrl - load the signed URL for GET /contracts/:id/pdf
// ============================================================================

/**
 * Carga la signed URL del PDF actual via GET /contracts/:id/pdf. Útil para renderizar
 * el iframe del detalle con la versión más actualizada del contrato (incluye estampado
 * parcial/total según el estado).
 *
 * Usá `enabled` para evitar llamar al endpoint cuando sabes que no hay firmas todavía
 * (en DRAFT / PENDING_TENANT_SIGNATURE el `/preview` es más barato).
 */
export function useSignedPdfUrl(id: string | null | undefined, { enabled }: { enabled: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !enabled) {
      setUrl(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await contractsApi.getSignedPdfUrl(id);
      setUrl(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el PDF');
      setUrl(null);
    } finally {
      setIsLoading(false);
    }
  }, [id, enabled]);

  useEffect(() => { load(); }, [load]);

  return { url, isLoading, error, refetch: load };
}

// ============================================================================
// useContractRejections - load the rejection history for a contract
// ============================================================================

export function useContractRejections(id: string | null | undefined) {
  const [rejections, setRejections] = useState<ContractRejection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setRejections([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await contractsApi.getRejections(id);
      setRejections(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando historial de rechazos');
      setRejections([]);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  return { rejections, isLoading, error, refetch: load };
}

// ============================================================================
// useContractActions - mutation actions on contracts
// ============================================================================

export function useContractActions() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);

  /*
   * 🔴 Antes `run` hacía `catch { setLastError(err); return null }`, y las
   * pantallas leían `actions.lastError?.message` DESPUÉS del await: leían el
   * render viejo (closure), o sea `null`. Ningún 400/409 del back llegaba al
   * usuario: «Ese inmueble ya tiene un contrato en curso (#1234)» se
   * convertía en «No se pudo crear el contrato. Verifica los datos».
   * Ahora el fallo se RELANZA: quien llama lo atrapa con `try/catch` y lee
   * ESE error (`mensajeDelFallo`, `inmuebleOcupado`, `isPermissionError`).
   * `lastError` sigue existiendo para quien lo renderice.
   */
  const run = async <T>(op: () => Promise<T>): Promise<T> => {
    setIsSubmitting(true);
    setLastError(null);
    try {
      return await op();
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setLastError(e);
      throw e;
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadPdf = useCallback(
    (file: File) => run(() => contractsApi.uploadPdf(file)),
    []
  );

  const create = useCallback(
    (dto: CreateContractDto) => run(() => contractsApi.create(dto)),
    []
  );

  const createManual = useCallback(
    (dto: CrearContratoManualDto) => run(() => contractsApi.createManual(dto)),
    []
  );

  const send = useCallback(
    (id: string) => run(() => contractsApi.send(id)),
    []
  );

  const signAsLandlord = useCallback(
    (id: string, dto: SignContractDto) => run(() => contractsApi.signAsLandlord(id, dto)),
    []
  );

  const signAsTenant = useCallback(
    (id: string, dto: SignContractDto) => run(() => contractsApi.signAsTenant(id, dto)),
    []
  );

  const activate = useCallback(
    (id: string) => run(() => contractsApi.activate(id)),
    []
  );

  const remind = useCallback(
    (id: string) => run(() => contractsApi.remind(id)),
    []
  );

  const cancel = useCallback(
    (id: string, dto: CancelContractDto = {}) => run(() => contractsApi.cancel(id, dto)),
    []
  );

  const update = useCallback(
    (id: string, dto: UpdateContractDto) => run(() => contractsApi.update(id, dto)),
    []
  );

  const rejectAsTenant = useCallback(
    (id: string, dto: RejectContractDto) => run(() => contractsApi.rejectAsTenant(id, dto)),
    []
  );

  const getRejections = useCallback(
    (id: string): Promise<ContractRejection[]> => run(() => contractsApi.getRejections(id)),
    []
  );

  return {
    uploadPdf, create, createManual, send, signAsLandlord, signAsTenant, activate, remind,
    cancel, update, rejectAsTenant, getRejections,
    isSubmitting,
    lastError,
  };
}

/**
 * Cómo se lee el fallo de una acción (el 403, el motivo del back, el inmueble
 * ocupado). Viven en `@/lib/contratos/fallo-de-accion`; se reexportan acá
 * para quien ya importaba `isPermissionError` de este archivo.
 */
export {
  isPermissionError,
  mensajeDelFallo,
  estadoDelFallo,
  inmuebleOcupado,
  contratoDuplicado,
  type InmuebleOcupado,
} from '@/lib/contratos/fallo-de-accion';
