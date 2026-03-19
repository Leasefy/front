'use client';

import { createContext, useContext, useState, useCallback, useMemo, useRef, ReactNode } from 'react';
import { PropertyDraft, PUBLISH_STEPS, initialPropertyDraft } from '@/lib/types/publish';
import { propertiesApi } from '@/lib/api/properties.service';
import { getCityCoordinates } from '@/lib/constants/map';

interface PublishContextTextT {
  // State
  draft: PropertyDraft;
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
  isSubmitting: boolean;
  isComplete: boolean;
  submissionError: string | null;
  createdPropertyId: string | null;

  // Photo files (File objects for upload)
  photoFiles: File[];
  addPhotoFiles: (files: File[]) => string[];
  removePhotoFile: (index: number) => void;
  reorderPhotoFiles: (fromIndex: number, toIndex: number) => void;

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
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null);
  const photoFilesRef = useRef<File[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  const totalSteps = PUBLISH_STEPS.length;

  // Photo file management (keeps File objects in sync with draft.photos blob URLs)
  const addPhotoFiles = useCallback((files: File[]): string[] => {
    const urls = files.map((f) => URL.createObjectURL(f));
    photoFilesRef.current = [...photoFilesRef.current, ...files];
    setPhotoFiles([...photoFilesRef.current]);
    return urls;
  }, []);

  const removePhotoFile = useCallback((index: number) => {
    photoFilesRef.current = photoFilesRef.current.filter((_, i) => i !== index);
    setPhotoFiles([...photoFilesRef.current]);
  }, []);

  const reorderPhotoFiles = useCallback((fromIndex: number, toIndex: number) => {
    const updated = [...photoFilesRef.current];
    const [removed] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, removed);
    photoFilesRef.current = updated;
    setPhotoFiles([...photoFilesRef.current]);
  }, []);

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
    setSubmissionError(null);
    try {
      // 1. Create property via API
      // Resolve city center coordinates as fallback (until address geocoding is implemented)
      const cityCoords = getCityCoordinates(draft.city);

      const created = await propertiesApi.create({
        title: draft.title,
        description: draft.description,
        type: draft.type,
        status: 'AVAILABLE',
        city: draft.city,
        neighborhood: draft.neighborhood,
        address: draft.address,
        latitude: cityCoords?.lat,
        longitude: cityCoords?.lng,
        monthlyRent: draft.monthlyRent,
        bedrooms: draft.bedrooms,
        bathrooms: draft.bathrooms,
        area: draft.area,
        adminFee: draft.adminFee || undefined,
        deposit: draft.deposit || undefined,
        floor: draft.floor || undefined,
        parkingSpaces: draft.parkingSpaces || undefined,
        stratum: draft.stratum || undefined,
        yearBuilt: draft.yearBuilt || undefined,
        amenities: draft.amenities.length > 0 ? draft.amenities : undefined,
      });

      // 2. Upload photos sequentially
      const files = photoFilesRef.current;
      for (const file of files) {
        try {
          await propertiesApi.uploadImage(created.id, file);
        } catch {
          // Continue uploading remaining photos even if one fails
          console.error(`Failed to upload image: ${file.name}`);
        }
      }

      setCreatedPropertyId(created.id);
      setIsComplete(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al publicar la propiedad';
      setSubmissionError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [draft]);

  const resetDraft = useCallback(() => {
    setDraft(initialPropertyDraft);
    setCurrentStep(1);
    setCompletedSteps([]);
    setSubmissionError(null);
    setCreatedPropertyId(null);
    setIsComplete(false);
    // Clean up blob URLs
    photoFilesRef.current = [];
    setPhotoFiles([]);
  }, []);

  const value: PublishContextTextT = {
    draft,
    currentStep,
    totalSteps,
    completedSteps,
    isSubmitting,
    isComplete,
    submissionError,
    createdPropertyId,
    photoFiles,
    addPhotoFiles,
    removePhotoFile,
    reorderPhotoFiles,
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
