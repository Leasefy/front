'use client';

import { AvaluoProvider, useAvaluo } from '@/components/avaluo/AvaluoContext';
import { AvaluoWizardShell } from '@/components/avaluo/AvaluoWizardShell';
import { StepInmueble } from '@/components/avaluo/StepInmueble';
import { StepContacto } from '@/components/avaluo/StepContacto';
import { StepFotos } from '@/components/avaluo/StepFotos';
import { StepConfirmacion } from '@/components/avaluo/StepConfirmacion';

// ---------------------------------------------------------------------------
// Step switcher — must be inside AvaluoProvider to use useAvaluo()
// ---------------------------------------------------------------------------

function AvaluoSteps() {
  const { currentStep } = useAvaluo();

  switch (currentStep) {
    case 1:
      return <StepInmueble />;
    case 2:
      return <StepContacto />;
    case 3:
      return <StepFotos />;
    case 4:
      return <StepConfirmacion />;
    default:
      return <StepInmueble />;
  }
}

// ---------------------------------------------------------------------------
// Page — anonymous (no initialEmail)
// ---------------------------------------------------------------------------

/**
 * /avaluo/nuevo — Public multi-step avalúo intake form.
 *
 * Wraps AvaluoProvider (anonymous) around AvaluoWizardShell.
 * Inner AvaluoSteps reads currentStep from context and renders the active step.
 */
export default function NuevoAvaluoPage() {
  return (
    <AvaluoProvider>
      <AvaluoWizardShell>
        <AvaluoSteps />
      </AvaluoWizardShell>
    </AvaluoProvider>
  );
}
