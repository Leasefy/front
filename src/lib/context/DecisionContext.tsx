'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { LandlordCandidateStatus } from '@/lib/types/landlord';
import { StorageManager } from '@/lib/utils/storage';
import { contextLogger } from '@/lib/utils/logger';

// ============================================================================
// TextTs
// ============================================================================

/**
 * A decision record for a candidate
 */
export interface CandidateDecision {
  candidateId: string;
  status: LandlordCandidateStatus;
  changedAt: string;
}

/**
 * Internal state structure for decisions
 */
interface DecisionState {
  decisions: Record<string, CandidateDecision>;
  notes: Record<string, string>;
}

/**
 * Context value exposed to consumers
 */
interface DecisionContextValue {
  /** Get the decision for a specific candidate */
  getDecision: (candidateId: string) => CandidateDecision | null;
  /** Set a decision for a candidate */
  setDecision: (candidateId: string, status: LandlordCandidateStatus) => void;
  /** Get the note for a specific candidate */
  getNote: (candidateId: string) => string;
  /** Set a note for a candidate */
  setNote: (candidateId: string, note: string) => void;
  /** Clear the decision for a candidate (revert to pending) */
  clearDecision: (candidateId: string) => void;
  /** Check if state has been hydrated from localStorage */
  isHydrated: boolean;
  /** Get count of pre-approved candidates for a property */
  getPreApprovedCount: (candidateIds: string[]) => number;
  /** Check if can pre-approve more (max 3) */
  canPreApprove: (candidateIds: string[]) => boolean;
  /** Auto-reject all other candidates when contract is signed */
  autoRejectOthers: (approvedCandidateId: string, allCandidateIds: string[]) => void;
  /** Get all decisions */
  getAllDecisions: () => Record<string, CandidateDecision>;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'arriendo-facil-decisions';
export const MAX_PRE_APPROVALS = 3;

// Storage manager instance
const storage = new StorageManager<DecisionState>(STORAGE_KEY);

// ============================================================================
// Context
// ============================================================================

const DecisionContext = createContext<DecisionContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface DecisionProviderProps {
  children: ReactNode;
}

/**
 * DecisionProvider - Manages landlord decisions and notes with localStorage persistence
 *
 * Features:
 * - Persists decisions and notes to localStorage
 * - SSR-safe hydration (waits for client mount)
 * - Immediate state updates with background persistence
 */
export function DecisionProvider({ children }: DecisionProviderProps) {
  const [state, setState] = useState<DecisionState>({
    decisions: {},
    notes: {},
  });
  const [isHydrated, setIsHydrated] = useState(false);

  // ---------------------------------------------------------------------------
  // Hydrate from localStorage on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const stored = storage.get({
      onError: (error) => {
        contextLogger.error('Failed to load decisions from localStorage', error);
      },
    });

    if (stored) {
      setState(stored);
    }
    setIsHydrated(true);
  }, []);

  // ---------------------------------------------------------------------------
  // Persist to localStorage on state change
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isHydrated) return;

    storage.set(state, {
      onError: (error) => {
        contextLogger.error('Failed to save decisions to localStorage', error);
      },
    });
  }, [state, isHydrated]);

  // ---------------------------------------------------------------------------
  // Context Methods
  // ---------------------------------------------------------------------------

  const getDecision = useCallback(
    (candidateId: string): CandidateDecision | null => {
      return state.decisions[candidateId] || null;
    },
    [state.decisions]
  );

  const setDecision = useCallback(
    (candidateId: string, status: LandlordCandidateStatus) => {
      const decision: CandidateDecision = {
        candidateId,
        status,
        changedAt: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        decisions: {
          ...prev.decisions,
          [candidateId]: decision,
        },
      }));
    },
    []
  );

  const getNote = useCallback(
    (candidateId: string): string => {
      return state.notes[candidateId] || '';
    },
    [state.notes]
  );

  const setNote = useCallback((candidateId: string, note: string) => {
    setState((prev) => ({
      ...prev,
      notes: {
        ...prev.notes,
        [candidateId]: note,
      },
    }));
  }, []);

  const clearDecision = useCallback((candidateId: string) => {
    setState((prev) => {
      const { [candidateId]: _, ...remainingDecisions } = prev.decisions;
      return {
        ...prev,
        decisions: remainingDecisions,
      };
    });
  }, []);

  const getPreApprovedCount = useCallback(
    (candidateIds: string[]): number => {
      return candidateIds.filter((id) => {
        const decision = state.decisions[id];
        return decision?.status === 'pre-approved';
      }).length;
    },
    [state.decisions]
  );

  const canPreApprove = useCallback(
    (candidateIds: string[]): boolean => {
      return getPreApprovedCount(candidateIds) < MAX_PRE_APPROVALS;
    },
    [getPreApprovedCount]
  );

  const autoRejectOthers = useCallback(
    (approvedCandidateId: string, allCandidateIds: string[]) => {
      const now = new Date().toISOString();
      const newDecisions: Record<string, CandidateDecision> = {};

      allCandidateIds.forEach((id) => {
        if (id !== approvedCandidateId) {
          // Only reject if not already rejected
          const currentDecision = state.decisions[id];
          if (currentDecision?.status !== 'rejected') {
            newDecisions[id] = {
              candidateId: id,
              status: 'rejected',
              changedAt: now,
            };
          }
        }
      });

      if (Object.keys(newDecisions).length > 0) {
        setState((prev) => ({
          ...prev,
          decisions: {
            ...prev.decisions,
            ...newDecisions,
          },
        }));
      }
    },
    [state.decisions]
  );

  const getAllDecisions = useCallback(
    (): Record<string, CandidateDecision> => {
      return state.decisions;
    },
    [state.decisions]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const value: DecisionContextValue = {
    getDecision,
    setDecision,
    getNote,
    setNote,
    clearDecision,
    isHydrated,
    getPreApprovedCount,
    canPreApprove,
    autoRejectOthers,
    getAllDecisions,
  };

  return (
    <DecisionContext.Provider value={value}>
      {children}
    </DecisionContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * useDecisions - Access the decision context
 * @throws Error if used outside of DecisionProvider
 */
export function useDecisions(): DecisionContextValue {
  const context = useContext(DecisionContext);
  if (!context) {
    throw new Error('useDecisions must be used within a DecisionProvider');
  }
  return context;
}
