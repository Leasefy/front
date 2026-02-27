'use client';

import { useState, useEffect, useCallback } from 'react';
import { landlordApi } from '@/lib/api/landlord.service';
import type { Candidate } from '@/lib/types/candidate';
import type { LandlordCandidate, LandlordProperty, DashboardSummary } from '@/lib/types/landlord';
import type { RiskScore } from '@/lib/types/risk-score';
import type { BackendCandidateNote, CandidateDecisionDto, DashboardData } from '@/lib/api/landlord.types';

// ============================================================================
// useCandidates - list candidates with filters
// ============================================================================

export function useCandidates(params?: {
  propertyId?: string;
  status?: string;
  riskLevel?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}) {
  const [candidates, setCandidates] = useState<LandlordCandidate[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<{ total: number; pending: number; approved: number; rejected: number }>({
    total: 0, pending: 0, approved: 0, rejected: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const paramsKey = JSON.stringify(params ?? {});

  const fetchCandidates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const parsed = JSON.parse(paramsKey);
      const result = await landlordApi.getCandidates(parsed);
      setCandidates(result.candidates);
      setTotal(result.total);
      setStats(result.stats);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando candidatos';
      setError(message);
      setCandidates([]);
    } finally {
      setIsLoading(false);
    }
  }, [paramsKey]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  return { candidates, total, stats, isLoading, error, refetch: fetchCandidates };
}

// ============================================================================
// useCandidate - single candidate detail with risk score
// ============================================================================

export function useCandidate(id: string | null | undefined) {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setCandidate(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    landlordApi
      .getCandidate(id)
      .then((c) => {
        if (!cancelled) {
          setCandidate(c);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error cargando candidato');
          setCandidate(null);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { candidate, isLoading, error };
}

// ============================================================================
// useRiskScore - fetch risk score separately
// ============================================================================

export function useRiskScore(candidateId: string | null | undefined) {
  const [riskScore, setRiskScore] = useState<RiskScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!candidateId) {
      setRiskScore(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    landlordApi
      .getRiskScore(candidateId)
      .then((score) => {
        if (!cancelled) {
          setRiskScore(score);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error cargando score');
          setRiskScore(null);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [candidateId]);

  return { riskScore, isLoading, error };
}

// ============================================================================
// useCandidateDecision - make decisions on candidates
// ============================================================================

export function useCandidateDecision() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decide = useCallback(async (candidateId: string, decision: CandidateDecisionDto) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await landlordApi.decideCandidate(candidateId, decision);
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al tomar decision';
      setError(message);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return { decide, isSubmitting, error };
}

// ============================================================================
// useCandidateNotes - manage notes for a candidate
// ============================================================================

export function useCandidateNotes(candidateId: string | null | undefined) {
  const [notes, setNotes] = useState<BackendCandidateNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    if (!candidateId) {
      setNotes([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await landlordApi.getNotes(candidateId);
      setNotes(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando notas');
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const addNote = useCallback(async (content: string) => {
    if (!candidateId) return null;
    try {
      const note = await landlordApi.addNote(candidateId, content);
      setNotes(prev => [note, ...prev]);
      return note;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error agregando nota');
      return null;
    }
  }, [candidateId]);

  return { notes, isLoading, error, addNote, refetch: fetchNotes };
}

// ============================================================================
// useLandlordProperties - properties with candidate counts
// ============================================================================

export function useLandlordProperties() {
  const [properties, setProperties] = useState<LandlordProperty[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProperties = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await landlordApi.getMyProperties();
      setProperties(result.properties);
      setSummary(result.summary);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando propiedades';
      setError(message);
      setProperties([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  return { properties, summary, isLoading, error, refetch: fetchProperties };
}

// ============================================================================
// useLandlordProperty - single property with candidates
// ============================================================================

export function useLandlordProperty(propertyId: string | null | undefined) {
  const [property, setProperty] = useState<LandlordProperty | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!propertyId) {
      setProperty(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    landlordApi
      .getMyProperty(propertyId)
      .then((p) => {
        if (!cancelled) {
          setProperty(p);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error cargando propiedad');
          setProperty(null);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  return { property, isLoading, error };
}

// ============================================================================
// useLandlordDashboard - full dashboard data
// ============================================================================

export function useLandlordDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await landlordApi.getDashboardForDisplay();
      setDashboard(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando dashboard';
      setError(message);
      setDashboard(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { dashboard, isLoading, error, refetch: fetchDashboard };
}
