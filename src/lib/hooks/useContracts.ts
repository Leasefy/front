'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { contractsApi } from '@/lib/api/contracts.service';
import type { Contract, ContractRejection } from '@/lib/types/contract';
import type {
  CreateContractDto,
  SignContractDto,
  ContractPreview,
  UpdateContractDto,
  RejectContractDto,
  CancelContractDto,
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

  const load = useCallback(async () => {
    if (!id) {
      setContract(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const c = await contractsApi.getById(id);
      setContract(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando contrato');
      setContract(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  return { contract, isLoading, error, refetch: load, setContract };
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

export function useContractPreview(id: string | null) {
  const [preview, setPreview] = useState<ContractPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const p = await contractsApi.getPreview(id);
      setPreview(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el contrato');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  return { preview, isLoading, error, refetch: load };
}

// ============================================================================
// useSignedPdfUrl - load the signed URL for GET /contracts/:id/pdf
// ============================================================================

/**
 * Carga la signed URL del PDF actual via GET /contracts/:id/pdf. Útil para renderizar
 * el iframe del detalle con la versión más actualizada del contrato (incluye estampado
 * parcial/total según el estado).
 *
 * Usá `enabled` para evitar llamar al endpoint cuando sabés que no hay firmas todavía
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

  const run = async <T>(op: () => Promise<T>): Promise<T | null> => {
    setIsSubmitting(true);
    setLastError(null);
    try {
      return await op();
    } catch (err) {
      setLastError(err instanceof Error ? err : new Error(String(err)));
      return null;
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
    (id: string): Promise<ContractRejection[] | null> => run(() => contractsApi.getRejections(id)),
    []
  );

  return {
    uploadPdf, create, send, signAsLandlord, signAsTenant, activate, remind,
    cancel, update, rejectAsTenant, getRejections,
    isSubmitting,
    lastError,
  };
}

/**
 * Helper: detecta si un Error corresponde a un 403 del backend.
 * Los servicios del api client lanzan `Error` con el `message` del backend
 * (ej. "No tienes permiso para edit en contratos").
 */
export function isPermissionError(err: Error | null | undefined): boolean {
  if (!err) return false;
  const msg = err.message.toLowerCase();
  return msg.includes('no tienes permiso') || msg.includes('forbidden') || msg.includes('403');
}
