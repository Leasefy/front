'use client';

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { PropertyDraft, PUBLISH_STEPS, initialPropertyDraft } from '@/lib/types/publish';

interface PublishContextTextT {
  // State
  draft: PropertyDraft;
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
  isSubmitting: boolean;
  isComplete: boolean;

  // Actions
  updateDraft: (updates: Partial<PropertyDraft>) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  submitProperty: () => Promise<void>;
  resetDraft: () => void;

  // Validation
  isStepValid: (step: number) => boolean;
  canProceed: boolean;
}

const PublishContext = createContext<PublishContextTextT | null>(null);

export function PublishProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<PropertyDraft>(initialPropertyDraft);
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const totalSteps = PUBLISH_STEPS.length;

  const updateDraft = useCallback((updates: Partial<PropertyDraft>) => {
    setDraft(prev => ({ ...prev, ...updates }));
  }, []);

  const isStepValid = useCallback((step: number): boolean => {
    switch (step) {
      case 1: // TextT
        return draft.type !== '';
      case 2: // Location
        return draft.city !== '' && draft.neighborhood !== '' && draft.address !== '';
      case 3: // Details
        return draft.bedrooms > 0 && draft.bathrooms > 0 && draft.area > 0;
      case 4: // Amenities
        return true; // Optional
      case 5: // Photos
        return draft.photos.length >= 1; // At least 1 photo
      case 6: // Pricing
        return draft.monthlyRent > 0;
      case 7: // Description
        return draft.title !== '' && draft.description !== '';
      case 8: // Tenant Requirements
        return true; // Optional - landlord can skip this step
      case 9: // Plan
        return draft.ownerType !== '' && draft.selectedPlan !== '';
      case 10: // Review
        return true;
      default:
        return false;
    }
  }, [draft]);

  const canProceed = useMemo(() => isStepValid(currentStep), [isStepValid, currentStep]);

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps && isStepValid(currentStep)) {
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps(prev => [...prev, currentStep]);
      }
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, totalSteps, isStepValid, completedSteps]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= totalSteps) {
      if (step <= currentStep || completedSteps.includes(step - 1) || step === 1) {
        setCurrentStep(step);
      }
    }
  }, [currentStep, totalSteps, completedSteps]);

  const submitProperty = useCallback(async () => {
    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      // In real app, would call API to create property
      setIsComplete(true);
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const resetDraft = useCallback(() => {
    setDraft(initialPropertyDraft);
    setCurrentStep(1);
    setCompletedSteps([]);
  }, []);

  const value: PublishContextTextT = {
    draft,
    currentStep,
    totalSteps,
    completedSteps,
    isSubmitting,
    isComplete,
    updateDraft,
    nextStep,
    prevStep,
    goToStep,
    submitProperty,
    resetDraft,
    isStepValid,
    canProceed,
  };

  return (
    <PublishContext.Provider value={value}>
      {children}
    </PublishContext.Provider>
  );
}

export function usePublish() {
  const context = useContext(PublishContext);
  if (!context) {
    throw new Error('usePublish must be used within a PublishProvider');
  }
  return context;
}
