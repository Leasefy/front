'use client';

import { PublishProvider, usePublish } from '@/lib/context/PublishContext';
import { PublishShell } from '@/components/publish/PublishShell';
import { PublishSuccess } from '@/components/publish/PublishSuccess';
import {
  StepType,
  StepLocation,
  StepDetails,
  StepAmenities,
  StepPhotos,
  StepPricing,
  StepDescription,
  StepTenantRequirements,
  StepPlan,
  StepReview,
} from '@/components/publish/steps';

function PublishWizardContent() {
  const { currentStep, isComplete } = usePublish();

  // Show success screen after submission
  if (isComplete) {
    return <PublishSuccess />;
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepType />;
      case 2:
        return <StepLocation />;
      case 3:
        return <StepDetails />;
      case 4:
        return <StepAmenities />;
      case 5:
        return <StepPhotos />;
      case 6:
        return <StepPricing />;
      case 7:
        return <StepDescription />;
      case 8:
        return <StepTenantRequirements />;
      case 9:
        return <StepPlan />;
      case 10:
        return <StepReview />;
      default:
        return <StepType />;
    }
  };

  return (
    <PublishShell>
      {renderStep()}
    </PublishShell>
  );
}

export default function PublicarPage() {
  return (
    <PublishProvider>
      <PublishWizardContent />
    </PublishProvider>
  );
}
