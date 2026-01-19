'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { PropertyType } from '@/lib/types/property';

const USER_PROFILE_STORAGE_KEY = 'arriendo-facil-user-profile';

/**
 * User profile for personalization
 * In production, this would come from authentication and the application wizard
 */
export interface UserProfile {
  isLoggedIn: boolean;
  hasCompletedProfile: boolean;

  // Financial data (from wizard or manual entry)
  monthlyIncome: number;
  monthlyObligations: number;
  availableForRent: number; // income - obligations

  // Preferences (optional, for better matching)
  preferredCities: string[];
  preferredBedrooms: number | null;
  preferredPropertyTypes: PropertyType[];

  // Computed
  maxAffordableRent: number; // availableForRent * 0.30
}

interface UserProfileContextValue {
  profile: UserProfile | null;
  isSimulating: boolean;
  enableSimulation: () => void;
  disableSimulation: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

/**
 * Mock user profile for testing personalization features
 * Represents a user who has completed the application wizard
 */
const MOCK_USER_PROFILE: UserProfile = {
  isLoggedIn: true,
  hasCompletedProfile: true,

  // Financial (from wizard Step 3)
  monthlyIncome: 5500000, // $5.5M COP
  monthlyObligations: 800000, // $800K COP
  availableForRent: 4700000, // $4.7M COP
  maxAffordableRent: 1410000, // $1.41M COP (30% of available)

  // Preferences
  preferredCities: ['Medellin', 'Bogota'],
  preferredBedrooms: 2,
  preferredPropertyTypes: ['apartment', 'studio'],
};

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Load simulation state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.isSimulating) {
          setIsSimulating(true);
          setProfile(parsed.profile || MOCK_USER_PROFILE);
        }
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(
      USER_PROFILE_STORAGE_KEY,
      JSON.stringify({ isSimulating, profile })
    );
  }, [isSimulating, profile]);

  const enableSimulation = useCallback(() => {
    setIsSimulating(true);
    setProfile(MOCK_USER_PROFILE);
  }, []);

  const disableSimulation = useCallback(() => {
    setIsSimulating(false);
    setProfile(null);
  }, []);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      // Recalculate derived values
      updated.availableForRent =
        updated.monthlyIncome - updated.monthlyObligations;
      updated.maxAffordableRent = updated.availableForRent * 0.3;
      return updated;
    });
  }, []);

  return (
    <UserProfileContext.Provider
      value={{
        profile: isSimulating ? profile : null,
        isSimulating,
        enableSimulation,
        disableSimulation,
        updateProfile,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
}
