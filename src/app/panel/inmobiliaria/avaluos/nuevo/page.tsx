'use client';

import { useContext } from 'react';
import { AvaluoProvider, useAvaluo } from '@/components/avaluo/AvaluoContext';
import { AvaluoWizardShell } from '@/components/avaluo/AvaluoWizardShell';
import { StepInmueble } from '@/components/avaluo/StepInmueble';
import { StepContacto } from '@/components/avaluo/StepContacto';
import { StepFotos } from '@/components/avaluo/StepFotos';
import { StepConfirmacion } from '@/components/avaluo/StepConfirmacion';
import { AuthContext } from '@/lib/auth/auth-context';

// ---------------------------------------------------------------------------
// Step switcher — must be inside AvaluoProvider to call useAvaluo()
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
// Page
// ---------------------------------------------------------------------------

/**
 * /panel/inmobiliaria/avaluos/nuevo
 *
 * Authenticated avalúo intake wizard — identical components as the public
 * /avaluo/nuevo page, with the user's email pre-filled via AuthContext so
 * StepContacto can render it as read-only.
 *
 * The parent layout provides AuthProvider + agency sidebar — do NOT add
 * ForceLightMode here.
 *
 * On submit, AvaluoContext routes to /avaluo/estado/[id] (public status page
 * works for authenticated users in v1).
 */
export default function PanelNuevoAvaluoPage() {
  // Read the authenticated user's email from AuthContext.
  // Safe null-check: authCtx may be null in edge cases (unauthenticated render).
  const authCtx = useContext(AuthContext);
  const email = authCtx?.user?.email ?? '';

  return (
    <AvaluoProvider initialEmail={email}>
      <AvaluoWizardShell>
        <AvaluoSteps />
      </AvaluoWizardShell>
    </AvaluoProvider>
  );
}
