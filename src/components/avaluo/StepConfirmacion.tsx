'use client';

import { useAvaluo } from './AvaluoContext';

// ---------------------------------------------------------------------------
// Helper to display property type in Spanish
// ---------------------------------------------------------------------------

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartamento: 'Apartamento',
  casa: 'Casa',
  local: 'Local comercial',
  oficina: 'Oficina',
  bodega: 'Bodega',
  lote: 'Lote',
  finca: 'Finca / Predio rural',
};

// ---------------------------------------------------------------------------
// Row component — key/value pair
// ---------------------------------------------------------------------------

function Row({ label, value }: { label: string; value: string | number | undefined | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex justify-between gap-4 py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
        {title}
      </p>
      <div className="bg-muted/40 rounded-xl px-4 py-0.5">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StepConfirmacion — Step 4
// ---------------------------------------------------------------------------

/**
 * Step 4: Read-only summary of all entered data.
 * No editable fields, no payment UI.
 */
export function StepConfirmacion() {
  const { formData } = useAvaluo();

  const consentsGranted: string[] = [];
  if (formData.purposeAvaluo) consentsGranted.push('Generación del avalúo');
  if (formData.purposeDataset) consentsGranted.push('Uso en dataset anónimo');
  if (formData.purposeContacto) consentsGranted.push('Contacto comercial');

  return (
    <div className="space-y-6">
      {/* Inmueble */}
      <Section title="Inmueble">
        <Row label="Dirección" value={formData.address} />
        <Row label="Ciudad" value={formData.city} />
        <Row
          label="Tipo"
          value={PROPERTY_TYPE_LABELS[formData.propertyType] ?? formData.propertyType}
        />
        <Row
          label="Área"
          value={formData.areaM2 !== '' ? `${formData.areaM2} m²` : undefined}
        />
        {formData.estrato !== undefined && (
          <Row label="Estrato" value={formData.estrato} />
        )}
        {formData.bedrooms !== undefined && (
          <Row label="Habitaciones" value={formData.bedrooms} />
        )}
        {formData.bathrooms !== undefined && (
          <Row label="Baños" value={formData.bathrooms} />
        )}
      </Section>

      {/* Contacto */}
      <Section title="Contacto">
        <Row label="Email" value={formData.identity} />
        <Row
          label="Consentimientos"
          value={
            consentsGranted.length > 0 ? consentsGranted.join(', ') : 'Ninguno'
          }
        />
      </Section>

      {/* Fotos */}
      <Section title="Fotos">
        <Row
          label="Fotos adjuntas"
          value={
            formData.photoKeys.length > 0
              ? `${formData.photoKeys.length} foto${formData.photoKeys.length !== 1 ? 's' : ''}`
              : 'Sin fotos (opcional)'
          }
        />
      </Section>

      {/* Notice */}
      <p className="text-sm text-muted-foreground text-center pt-2 leading-relaxed">
        Al enviar, recibirás un enlace para seguir el estado de tu avalúo.
      </p>
    </div>
  );
}
