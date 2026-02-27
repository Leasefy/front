'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { contractsApi } from '@/lib/api/contracts.service';
import type { Contract } from '@/lib/types/contract';
import type { CreateContractDto, SignContractDto } from '@/lib/api/contracts.types';

// ============================================================================
// useContracts - list contracts with stats and helpers
// ============================================================================

export function useContracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContracts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await contractsApi.getMine();
      setContracts(result);
    } catch (err) {
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

  return {
    contracts, stats, isLoading, error,
    refetch: fetchContracts,
    getPending, getActive, getForProperty, getByPropertyAndTenant,
  };
}

// ============================================================================
// useContract - single contract by id
// ============================================================================

export function useContract(id: string | null) {
  const [contract, setContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setContract(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    contractsApi
      .getById(id)
      .then((c) => {
        if (!cancelled) {
          setContract(c);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error cargando contrato');
          setContract(null);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { contract, isLoading, error };
}

// ============================================================================
// useContractActions - mutation actions on contracts
// ============================================================================

export function useContractActions() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const create = useCallback(async (dto: CreateContractDto): Promise<Contract | null> => {
    setIsSubmitting(true);
    try {
      const result = await contractsApi.create(dto);
      return result;
    } catch {
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const sign = useCallback(async (id: string, dto?: SignContractDto): Promise<Contract | null> => {
    setIsSubmitting(true);
    try {
      const result = await contractsApi.sign(id, dto);
      return result;
    } catch {
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const activate = useCallback(async (id: string): Promise<Contract | null> => {
    setIsSubmitting(true);
    try {
      const result = await contractsApi.activate(id);
      return result;
    } catch {
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const cancel = useCallback(async (id: string): Promise<Contract | null> => {
    setIsSubmitting(true);
    try {
      const result = await contractsApi.cancel(id);
      return result;
    } catch {
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return { create, sign, activate, cancel, isSubmitting };
}
