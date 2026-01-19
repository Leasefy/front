'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { WizardShell } from '@/components/wizard/WizardShell';
import { ApplicationProvider, useApplication } from '@/lib/context/ApplicationContext';
import { mockProperties } from '@/lib/data/mock-properties';
import { WIZARD_STEPS } from '@/lib/types/application';

// Step components
import { StepPersonal } from '@/components/wizard/steps/StepPersonal';
import { StepEmployment } from '@/components/wizard/steps/StepEmployment';
import { StepIncome } from '@/components/wizard/steps/StepIncome';

// ============================================================================
// Page props
// ============================================================================

interface AplicarPageProps {
  params: Promise<{ propertyId: string }>;
}

// ============================================================================
// Page component
// ============================================================================

/**
 * Application wizard page
 * Route: /aplicar/[propertyId]
 */
export default function AplicarPage({ params }: AplicarPageProps) {
  const resolvedParams = use(params);
  const property = mockProperties.find((p) => p.id === resolvedParams.propertyId);

  // 404 handling
  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center px-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Propiedad no encontrada
          </h1>
          <p className="mt-2 text-gray-500">
            La propiedad que buscas no existe o ha sido removida.
          </p>
          <Link href="/propiedades">
            <Button className="mt-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Ver propiedades disponibles
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Property not available for applications
  if (property.status !== 'available') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center px-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Propiedad no disponible
          </h1>
          <p className="mt-2 text-gray-500">
            Esta propiedad ya no esta disponible para aplicaciones.
          </p>
          <Link href="/propiedades">
            <Button className="mt-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Ver propiedades disponibles
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ApplicationProvider propertyId={property.id}>
      <WizardShell property={property}>
        <WizardStepContent />
      </WizardShell>
    </ApplicationProvider>
  );
}

// ============================================================================
// Step content component
// ============================================================================

/**
 * Renders the appropriate step component based on current step
 */
function WizardStepContent() {
  const { currentStep, application } = useApplication();
  const stepConfig = WIZARD_STEPS[currentStep - 1];

  return (
    <div className="space-y-6">
      {/* Step 1: Personal Information */}
      {currentStep === 1 && <StepPersonal />}

      {/* Step 2: Employment Information */}
      {currentStep === 2 && <StepEmployment />}

      {/* Step 3: Income Information */}
      {currentStep === 3 && <StepIncome />}

      {/* Step 4: References - Placeholder */}
      {currentStep === 4 && (
        <StepPlaceholder
          title="Referencias"
          description="Aqui iran los campos para referencias: arrendatarios anteriores, referencias laborales, referencias personales."
          fields={[
            'Arrendatarios anteriores (nombre, telefono, direccion, duracion)',
            'Referencias laborales (nombre, telefono, empresa, relacion)',
            'Referencias personales (nombre, telefono, relacion)',
          ]}
        />
      )}

      {/* Step 5: Documents - Placeholder */}
      {currentStep === 5 && (
        <StepPlaceholder
          title="Documentos"
          description="Aqui ira el formulario de carga de documentos: cedula, certificacion de ingresos, carta laboral, extractos bancarios."
          fields={[
            'Documento de identidad (requerido)',
            'Certificado de ingresos (requerido)',
            'Carta laboral (opcional)',
            'Extractos bancarios (opcional)',
            'Reporte de credito (opcional)',
          ]}
        />
      )}

      {/* Step 6: Review - Placeholder */}
      {currentStep === 6 && (
        <StepPlaceholder
          title="Revision y Envio"
          description="Aqui se mostrara un resumen de toda la informacion ingresada para revision antes del envio."
          fields={[
            'Resumen de datos personales',
            'Resumen de empleo',
            'Resumen de ingresos',
            'Resumen de referencias',
            'Lista de documentos cargados',
            'Checkbox de terminos y condiciones',
          ]}
        />
      )}
    </div>
  );
}

// ============================================================================
// Placeholder component for future steps
// ============================================================================

interface StepPlaceholderProps {
  title: string;
  description: string;
  fields: string[];
}

function StepPlaceholder({ title, description, fields }: StepPlaceholderProps) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-sm">
        <p className="text-sm text-blue-800">
          <strong>Proximamente:</strong> {description}
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700">Campos a implementar:</p>
        <ul className="grid gap-2">
          {fields.map((field, index) => (
            <li
              key={index}
              className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-sm text-sm text-gray-600"
            >
              <span className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded-sm text-xs font-medium">
                {index + 1}
              </span>
              {field}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
