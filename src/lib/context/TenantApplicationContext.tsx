'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { MOCK_TENANT_APPLICATIONS } from '@/lib/data/mock-tenant-applications';
import type {
  TenantApplication,
  TenantApplicationStatus,
  ApplicationEvent,
} from '@/lib/types/tenant-application';

// ============================================================================
// Types
// ============================================================================

/**
 * Context value exposed to consumers
 */
interface TenantApplicationContextValue {
  /** All applications for the current tenant */
  applications: TenantApplication[];
  /** Withdraw an application (changes status to 'withdrawn') */
  withdrawApplication: (id: string) => void;
  /** Get a specific application by ID */
  getApplicationById: (id: string) => TenantApplication | undefined;
  /** Check if state has been hydrated from localStorage */
  isHydrated: boolean;
  /** Summary stats */
  summary: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'arriendo-facil-tenant-apps';

// ============================================================================
// Context
// ============================================================================

const TenantApplicationContext = createContext<TenantApplicationContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface TenantApplicationProviderProps {
  children: ReactNode;
}

/**
 * TenantApplicationProvider - Manages tenant application state with localStorage persistence
 *
 * Features:
 * - Persists application state changes (withdrawals) to localStorage
 * - SSR-safe hydration (waits for client mount)
 * - Merges localStorage state with mock data
 * - Provides withdraw functionality that updates status and adds event
 */
export function TenantApplicationProvider({ children }: TenantApplicationProviderProps) {
  const [applications, setApplications] = useState<TenantApplication[]>(MOCK_TENANT_APPLICATIONS);
  const [isHydrated, setIsHydrated] = useState(false);

  // ---------------------------------------------------------------------------
  // Hydrate from localStorage on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const savedApps = JSON.parse(stored) as TenantApplication[];
        // Merge saved state with mock data (saved state takes precedence)
        const mergedApps = MOCK_TENANT_APPLICATIONS.map((mockApp) => {
          const savedApp = savedApps.find((app) => app.id === mockApp.id);
          return savedApp || mockApp;
        });
        setApplications(mergedApps);
      }
    } catch (error) {
      console.error('Failed to load tenant applications from localStorage:', error);
    }
    setIsHydrated(true);
  }, []);

  // ---------------------------------------------------------------------------
  // Persist to localStorage on state change
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isHydrated) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
    } catch (error) {
      console.error('Failed to save tenant applications to localStorage:', error);
    }
  }, [applications, isHydrated]);

  // ---------------------------------------------------------------------------
  // Context Methods
  // ---------------------------------------------------------------------------

  const getApplicationById = useCallback(
    (id: string): TenantApplication | undefined => {
      return applications.find((app) => app.id === id);
    },
    [applications]
  );

  const withdrawApplication = useCallback((id: string) => {
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== id) return app;

        // Only allow withdrawal if not already in a final state
        const finalStates: TenantApplicationStatus[] = ['approved', 'rejected', 'withdrawn'];
        if (finalStates.includes(app.status)) {
          return app;
        }

        // Create withdrawal event
        const withdrawnEvent: ApplicationEvent = {
          id: `event-withdraw-${Date.now()}`,
          type: 'withdrawn',
          timestamp: new Date().toISOString(),
          description: 'Solicitud retirada por el inquilino',
        };

        return {
          ...app,
          status: 'withdrawn' as TenantApplicationStatus,
          updatedAt: withdrawnEvent.timestamp,
          events: [...app.events, withdrawnEvent],
        };
      })
    );
  }, []);

  // ---------------------------------------------------------------------------
  // Calculate Summary
  // ---------------------------------------------------------------------------
  const summary = {
    total: applications.length,
    pending: applications.filter((app) =>
      ['submitted', 'under_review', 'pre_approved'].includes(app.status)
    ).length,
    approved: applications.filter((app) => app.status === 'approved').length,
    rejected: applications.filter((app) => app.status === 'rejected').length,
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const value: TenantApplicationContextValue = {
    applications,
    withdrawApplication,
    getApplicationById,
    isHydrated,
    summary,
  };

  return (
    <TenantApplicationContext.Provider value={value}>
      {children}
    </TenantApplicationContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * useTenantApplications - Access the tenant application context
 * @throws Error if used outside of TenantApplicationProvider
 */
export function useTenantApplications(): TenantApplicationContextValue {
  const context = useContext(TenantApplicationContext);
  if (!context) {
    throw new Error('useTenantApplications must be used within a TenantApplicationProvider');
  }
  return context;
}
