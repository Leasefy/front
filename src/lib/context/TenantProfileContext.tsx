'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from 'react';
import type { EmploymentStatus, ContractType } from '@/lib/types/application';
import type { PropertyType } from '@/lib/types/property';

// ============================================================================
// Risk Level TextTs
// ============================================================================

export type RiskLevel = 'A' | 'B' | 'C' | 'D';

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  A: 'Excelente',
  B: 'Bueno',
  C: 'Moderado',
  D: 'Alto riesgo',
};

export const RISK_LEVEL_COLORS: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  A: { bg: 'bg-success-soft', text: 'text-success', border: 'border-success/30' },
  B: { bg: 'bg-[#1A40FF]/10', text: 'text-[#1A40FF]', border: 'border-[#1A40FF]/30' },
  C: { bg: 'bg-warning-soft', text: 'text-warning', border: 'border-warning/30' },
  D: { bg: 'bg-danger-soft', text: 'text-danger', border: 'border-danger/30' },
};

// ============================================================================
// Tenant Profile Interface
// ============================================================================

// ============================================================================
// Tenant Subscription TextTs
// ============================================================================

export type TenantSubscriptionTextT = 'arriendo_pass' | 'none';

export interface TenantSubscription {
  type: TenantSubscriptionTextT;
  expiresAt?: string; // ISO date string
  applicationsRemaining?: number; // For limited plans
}

export interface TenantProfile {
  // Personal info
  fullName: string;
  email: string;
  phone: string;

  // Financial data (verified from application)
  monthlySalary: number;
  additionalIncome: number;
  totalIncome: number;
  monthlyObligations: number;
  availableForRent: number;

  // Employment
  employmentStatus: EmploymentStatus;
  companyName?: string;
  timeAtJob?: number; // months
  contractType?: ContractType;

  // Risk assessment (if evaluated)
  riskLevel?: RiskLevel;
  numericScore?: number; // 0-100

  // Subscription status
  subscription: TenantSubscription;

  // Documentation status
  hasIdDocument: boolean;
  hasIncomeProof: boolean;
  hasEmploymentLetter: boolean;
  hasBankStatements: boolean;

  // Preferences inferred from applications
  preferredCities: string[];
  preferredBedrooms: number | null;
  preferredPropertyTypes: PropertyType[];

  // Metadata
  profileSource: 'application' | 'evaluation' | 'manual';
  lastUpdated: string;
}

// ============================================================================
// Context Value Interface
// ============================================================================

export interface TenantProfileContextValue {
  profile: TenantProfile | null;
  hasVerifiedProfile: boolean;
  hasArriendoPass: boolean;
  isLoading: boolean;
  refreshProfile: () => void;
}

// ============================================================================
// Context
// ============================================================================

const TenantProfileContext = createContext<TenantProfileContextValue | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

interface TenantProfileProviderProps {
  children: ReactNode;
}

export function TenantProfileProvider({ children }: TenantProfileProviderProps) {
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /*
   * Antes esta función armaba un TenantProfile leyendo las aplicaciones
   * guardadas en localStorage (`arriendo-facil-application-*`) y lo mostraba
   * en /para-ti como "perfil verificado" (Score A/B/C/D, ingreso disponible,
   * tipo de contrato, 95% de acceso a propiedades). Nada de eso estaba
   * verificado: era texto que el propio inquilino tipeó en un form y que el
   * navegador nunca contrastó con nada. Mostrarlo como "verificado" era un
   * dato fabricado.
   *
   * Hasta que exista un endpoint real de perfil/score del inquilino, el
   * contexto expone `profile: null` siempre. Los consumidores (`/para-ti`,
   * `RecommendedProperties`, el layout vía `hasArriendoPass`) ya tienen
   * estados vacíos para `profile == null` — no fabricamos nada para
   * "rellenar" la UI.
   *
   * TODO(handoff): cablear el endpoint real de perfil/score del inquilino
   * acá cuando el back lo exponga.
   */
  const extractProfileFromApplications = () => {
    setIsLoading(true);
    setProfile(null);
    setIsLoading(false);
  };

  // Load profile on mount
  useEffect(() => {
    extractProfileFromApplications();
  }, []);

  // Computed values
  const hasVerifiedProfile = useMemo(() => {
    if (!profile) return false;
    // Consider verified if we have income data and at least one document
    return profile.totalIncome > 0 && profile.hasIdDocument;
  }, [profile]);

  const hasArriendoPass = useMemo(() => {
    if (!profile?.subscription) return false;
    if (profile.subscription.type !== 'arriendo_pass') return false;
    // Check if not expired
    if (profile.subscription.expiresAt) {
      const expiresAt = new Date(profile.subscription.expiresAt);
      return expiresAt > new Date();
    }
    return true;
  }, [profile]);

  const value: TenantProfileContextValue = {
    profile,
    hasVerifiedProfile,
    hasArriendoPass,
    isLoading,
    refreshProfile: extractProfileFromApplications,
  };

  return (
    <TenantProfileContext.Provider value={value}>
      {children}
    </TenantProfileContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useTenantProfile(): TenantProfileContextValue {
  const context = useContext(TenantProfileContext);
  if (!context) {
    throw new Error('useTenantProfile must be used within a TenantProfileProvider');
  }
  return context;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the percentage of properties accessible based on risk level
 */
export function getAccessiblePropertiesPercentage(riskLevel: RiskLevel): number {
  const percentages: Record<RiskLevel, number> = {
    A: 95,
    B: 85,
    C: 60,
    D: 30,
  };
  return percentages[riskLevel];
}

/**
 * Get recommendation text based on risk level
 */
export function getRiskRecommendation(riskLevel: RiskLevel): string {
  const recommendations: Record<RiskLevel, string> = {
    A: 'Tu perfil es excelente. Tienes acceso a casi todas las propiedades.',
    B: 'Tu perfil es bueno. La mayoría de propietarios te aceptarán.',
    C: 'Tu perfil es moderado. Te recomendamos propiedades con requisitos flexibles.',
    D: 'Tu perfil necesita mejorar. Considera agregar un codeudor o depósito adicional.',
  };
  return recommendations[riskLevel];
}
