'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAvaluo } from './AvaluoContext';

// ---------------------------------------------------------------------------
// Property type options
// ---------------------------------------------------------------------------

const PROPERTY_TYPES = [
  { value: 'apartamento', label: 'Apartamento' },
  { value: 'casa', label: 'Casa' },
  { value: 'local', label: 'Local comercial' },
  { value: 'oficina', label: 'Oficina' },
  { value: 'bodega', label: 'Bodega' },
  { value: 'lote', label: 'Lote' },
  { value: 'finca', label: 'Finca / Predio rural' },
] as const;

const ESTRATO_OPTIONS = [1, 2, 3, 4, 5, 6] as const;

// ---------------------------------------------------------------------------
// Form field wrapper
// ---------------------------------------------------------------------------

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StepInmueble — Step 1
// ---------------------------------------------------------------------------

/**
 * Step 1: Property data.
 * Required: address, city, propertyType, areaM2.
 * Optional: estrato, bedrooms, bathrooms.
 */
export function StepInmueble() {
  const { formData, updateFormData } = useAvaluo();

  return (
    <div className="space-y-5">
      {/* Address */}
      <Field label="Dirección del inmueble" required>
        <Input
          type="text"
          placeholder="Ej: Cra 7 # 32-16, apto 301"
          value={formData.address}
          onChange={(e) => updateFormData({ address: e.target.value })}
          autoComplete="street-address"
        />
      </Field>

      {/* City */}
      <Field label="Ciudad" required>
        <Input
          type="text"
          placeholder="Ej: Bogotá"
          value={formData.city}
          onChange={(e) => updateFormData({ city: e.target.value })}
          autoComplete="address-level2"
        />
      </Field>

      {/* Property type */}
      <Field label="Tipo de inmueble" required>
        <Select
          value={formData.propertyType}
          onValueChange={(v) => updateFormData({ propertyType: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccioná el tipo" />
          </SelectTrigger>
          <SelectContent>
            {PROPERTY_TYPES.map((pt) => (
              <SelectItem key={pt.value} value={pt.value}>
                {pt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Area */}
      <Field label="Área construida (m²)" required>
        <Input
          type="number"
          placeholder="Ej: 85"
          min={1}
          step={1}
          value={formData.areaM2 === '' ? '' : String(formData.areaM2)}
          onChange={(e) => {
            const raw = e.target.value;
            updateFormData({
              areaM2: raw === '' ? '' : Number(raw),
            });
          }}
        />
      </Field>

      {/* Optional fields */}
      <div className="pt-2 border-t border-border">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">
          Datos opcionales
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Estrato */}
          <Field label="Estrato">
            <Select
              value={formData.estrato !== undefined ? String(formData.estrato) : ''}
              onValueChange={(v) =>
                updateFormData({ estrato: v ? Number(v) : undefined })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {ESTRATO_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Bedrooms */}
          <Field label="Habitaciones">
            <Input
              type="number"
              placeholder="—"
              min={0}
              step={1}
              value={formData.bedrooms !== undefined ? String(formData.bedrooms) : ''}
              onChange={(e) =>
                updateFormData({
                  bedrooms: e.target.value !== '' ? Number(e.target.value) : undefined,
                })
              }
            />
          </Field>

          {/* Bathrooms */}
          <Field label="Baños">
            <Input
              type="number"
              placeholder="—"
              min={0}
              step={1}
              value={formData.bathrooms !== undefined ? String(formData.bathrooms) : ''}
              onChange={(e) =>
                updateFormData({
                  bathrooms: e.target.value !== '' ? Number(e.target.value) : undefined,
                })
              }
            />
          </Field>
        </div>
      </div>
    </div>
  );
}
