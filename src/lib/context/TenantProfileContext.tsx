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
  A: { bg: 'bg-[#2C7A53]/10', text: 'text-[#2C7A53]', border: 'border-[#2C7A53]/30' },
  B: { bg: 'bg-[#1A40FF]/10', text: 'text-[#1A40FF]', border: 'border-[#1A40FF]/30' },
  C: { bg: 'bg-[#B7791F]/10', text: 'text-[#B7791F]', border: 'border-[#B7791F]/30' },
  D: { bg: 'bg-[#C4503B]/10', text: 'text-[#C4503B]', border: 'border-[#C4503B]/30' },
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

interface TenantProfileContextValue {
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
// Mock Profile Data (for development)
// ============================================================================

const MOCK_TENANT_PROFILE: TenantProfile = {
  fullName: 'Maria Garcia Lopez',
  email: 'maria@ejemplo.com',
  phone: '+57 300 123 4567',

  monthlySalary: 4500000,
  additionalIncome: 500000,
  totalIncome: 5000000,
  monthlyObligations: 800000,
  availableForRent: 4200000,

  employmentStatus: 'employed',
  companyName: 'Tech Solutions SAS',
  timeAtJob: 24,
  contractType: 'indefinite',

  riskLevel: 'B',
  numericScore: 78,

  // Mock: Tenant has Arriendo Pass (60 days from purchase)
  subscription: {
    type: 'arriendo_pass',
    expiresAt: '2026-03-15T10:00:00Z', // ~60 days from lastUpdated
  },

  hasIdDocument: true,
  hasIncomeProof: true,
  hasEmploymentLetter: true,
  hasBankStatements: true,

  preferredCities: ['Bogotá', 'Medellín'],
  preferredBedrooms: 2,
  preferredPropertyTypes: ['apartment'],

  profileSource: 'application',
  lastUpdated: '2026-01-15T10:00:00Z',
};

// ============================================================================
// Storage Key
// ============================================================================

const STORAGE_KEY_PREFIX = 'arriendo-facil-application-';

// ============================================================================
// Provider Component
// ============================================================================

interface TenantProfileProviderProps {
  children: ReactNode;
}

export function TenantProfileProvider({ children }: TenantProfileProviderProps) {
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Extract profile from localStorage applications
  const extractProfileFromApplications = () => {
    setIsLoading(true);

    try {
      // Find all application keys in localStorage
      const applicationKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_KEY_PREFIX)) {
          applicationKeys.push(key);
        }
      }

      if (applicationKeys.length === 0) {
        // No applications found - use mock profile for demo
        // In production, this would return null
        setProfile(MOCK_TENANT_PROFILE);
        setIsLoading(false);
        return;
      }

      // Get the most recent application
      let mostRecentApp = null;
      let mostRecentDate = new Date(0);

      for (const key of applicationKeys) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const app = JSON.parse(stored);
            const updatedAt = new Date(app.updatedAt || app.createdAt);
            if (updatedAt > mostRecentDate && app.status === 'submitted') {
              mostRecentApp = app;
              mostRecentDate = updatedAt;
            }
          }
        } catch {
          // Skip invalid entries
        }
      }

      if (mostRecentApp) {
        // Extract profile from application data
        const extractedProfile: TenantProfile = {
          fullName: mostRecentApp.personal?.fullName || '',
          email: mostRecentApp.personal?.email || '',
          phone: mostRecentApp.personal?.phone || '',

          monthlySalary: mostRecentApp.income?.monthlySalary || 0,
          additionalIncome: mostRecentApp.income?.additionalIncome || 0,
          totalIncome: mostRecentApp.income?.totalMonthlyIncome || 0,
          monthlyObligations: mostRecentApp.income?.monthlyObligations || 0,
          availableForRent: mostRecentApp.income?.availableForRent || 0,

          employmentStatus: mostRecentApp.employment?.employmentStatus || 'employed',
          companyName: mostRecentApp.employment?.companyName,
          timeAtJob: mostRecentApp.employment?.timeAtJob,
          contractType: mostRecentApp.employment?.contractType,

          // Calculate risk score based on profile
          riskLevel: calculateRiskLevel(mostRecentApp),
          numericScore: calculateNumericScore(mostRecentApp),

          // Subscription - from stored subscription data or default to none
          subscription: mostRecentApp.subscription || { type: 'none' },

          hasIdDocument: !!mostRecentApp.documents?.idDocument?.fileName,
          hasIncomeProof: !!mostRecentApp.documents?.incomeProof?.fileName,
          hasEmploymentLetter: !!mostRecentApp.documents?.employmentLetter?.fileName,
          hasBankStatements: !!mostRecentApp.documents?.bankStatement?.fileName,

          // Infer preferences from applied properties
          preferredCities: [],
          preferredBedrooms: null,
          preferredPropertyTypes: [],

          profileSource: 'application',
          lastUpdated: mostRecentDate.toISOString(),
        };

        setProfile(extractedProfile);
      } else {
        // Use mock profile for demo
        setProfile(MOCK_TENANT_PROFILE);
      }
    } catch (error) {
      console.error('Failed to extract tenant profile:', error);
      // Fallback to mock profile
      setProfile(MOCK_TENANT_PROFILE);
    }

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
// Risk Calculation Helpers
// ============================================================================

interface ApplicationData {
  income?: {
    monthlySalary?: number;
    totalMonthlyIncome?: number;
    monthlyObligations?: number;
    availableForRent?: number;
  };
  employment?: {
    employmentStatus?: EmploymentStatus;
    timeAtJob?: number;
    contractType?: ContractType;
  };
  documents?: {
    idDocument?: { fileName?: string };
    incomeProof?: { fileName?: string };
    employmentLetter?: { fileName?: string };
    bankStatement?: { fileName?: string };
  };
}

/**
 * Calculate risk level based on application data
 */
function calculateRiskLevel(app: ApplicationData): RiskLevel {
  const score = calculateNumericScore(app);

  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  return 'D';
}

/**
 * Calculate numeric risk score (0-100)
 */
function calculateNumericScore(app: ApplicationData): number {
  let score = 50; // Base score

  // Income stability (+20 max)
  const income = app.income?.totalMonthlyIncome || 0;
  const obligations = app.income?.monthlyObligations || 0;
  const debtToIncome = income > 0 ? obligations / income : 1;

  if (debtToIncome < 0.2) score += 20;
  else if (debtToIncome < 0.3) score += 15;
  else if (debtToIncome < 0.4) score += 10;
  else if (debtToIncome < 0.5) score += 5;

  // Employment stability (+20 max)
  const timeAtJob = app.employment?.timeAtJob || 0;
  const contractType = app.employment?.contractType;

  if (contractType === 'indefinite') score += 10;
  else if (contractType === 'fixed-term') score += 5;

  if (timeAtJob >= 24) score += 10;
  else if (timeAtJob >= 12) score += 7;
  else if (timeAtJob >= 6) score += 3;

  // Documentation completeness (+10 max)
  const docs = app.documents;
  if (docs?.idDocument?.fileName) score += 2.5;
  if (docs?.incomeProof?.fileName) score += 2.5;
  if (docs?.employmentLetter?.fileName) score += 2.5;
  if (docs?.bankStatement?.fileName) score += 2.5;

  return Math.min(100, Math.max(0, Math.round(score)));
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
