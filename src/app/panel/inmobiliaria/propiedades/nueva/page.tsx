'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { House } from '@phosphor-icons/react';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useAuth } from '@/lib/auth/use-auth';
import { propertiesApi } from '@/lib/api/properties.service';
import { PageGuard } from '@/components/auth/PageGuard';
import { Button, Input, Textarea, Spinner } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BackButton, SegmentedControl } from '@leasefy/cadence';
import { PropertyLocationField, type PropertyLocationValue } from '@/components/publicar/PropertyLocationField';
import { COLOMBIAN_CITIES } from '@/lib/types/property';
import type { PropertyType } from '@/lib/types/property';

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: 'apartment', label: 'Apartamento' },
  { value: 'house',     label: 'Casa' },
  { value: 'studio',    label: 'Estudio' },
  { value: 'room',      label: 'Habitación' },
];

function NuevaPropiedadContent() {
  const router = useRouter();
  const { isAdmin, isLoading: permissionsLoading } = usePermissions();
  const { user } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title:        '',
    description:  '',
    type:         'apartment' as PropertyType,
    city:         '',
    neighborhood: '',
    address:      '',
    latitude:     undefined as number | undefined,
    longitude:    undefined as number | undefined,
    monthlyRent:  '',
    bedrooms:     '',
    bathrooms:    '',
    area:         '',
    agentEmail:   '',
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const updateLocation = (partial: PropertyLocationValue) =>
    setForm((prev) => ({
      ...prev,
      address: partial.address ?? prev.address,
      latitude: partial.latitude,
      longitude: partial.longitude,
    }));

  const isValid =
    !!form.title &&
    !!form.description &&
    !!form.city &&
    !!form.neighborhood &&
    !!form.address &&
    Number(form.monthlyRent) > 0 &&
    Number(form.bedrooms) >= 0 &&
    Number(form.bathrooms) >= 0 &&
    Number(form.area) > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const property = await propertiesApi.create({
        title:        form.title,
        description:  form.description,
        type:         form.type,
        city:         form.city,
        neighborhood: form.neighborhood,
        address:      form.address,
        latitude:     form.latitude,
        longitude:    form.longitude,
        monthlyRent:  Number(form.monthlyRent),
        bedrooms:     Number(form.bedrooms),
        bathrooms:    Number(form.bathrooms),
        area:         Number(form.area),
      });

      // Admin: assign the entered agent email (optional)
      // Agent: auto-assign themselves
      if (isAdmin && form.agentEmail.trim()) {
        await propertiesApi.assignAgent(property.id, form.agentEmail.trim());
      } else if (!isAdmin && user?.email) {
        await propertiesApi.assignAgent(property.id, user.email);
      }

      router.push('/panel/inmobiliaria/propiedades');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la propiedad');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <BackButton
          label="Volver a propiedades"
          onClick={() => router.push('/panel/inmobiliaria/propiedades')}
        />

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
            <House className="w-6 h-6 text-primary" weight="duotone" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-fg">
              Nueva propiedad
            </h1>
            <p className="text-sm text-fg-muted">
              Registrá una nueva propiedad en el portafolio
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ── Información básica ────────────────────────── */}
        <section className="bg-card rounded-xl border border-border p-6 space-y-4">
          <h2 className="text-base font-semibold text-fg">Información básica</h2>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-fg">Título *</label>
            <Input
              type="text"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="Ej: Apartamento moderno en Chapinero"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-fg">Descripción *</label>
            <Textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Describí la propiedad..."
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-fg">Tipo de inmueble *</label>
            <SegmentedControl<PropertyType>
              aria-label="Tipo de inmueble"
              fullWidth
              value={form.type}
              onChange={(v) => update('type', v)}
              options={PROPERTY_TYPES.map((pt) => ({ value: pt.value, label: pt.label }))}
            />
          </div>
        </section>

        {/* ── Ubicación ─────────────────────────────────── */}
        <section className="bg-card rounded-xl border border-border p-6 space-y-4">
          <h2 className="text-base font-semibold text-fg">Ubicación</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg">Ciudad *</label>
              <Select value={form.city || undefined} onValueChange={(v) => update('city', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná una ciudad" />
                </SelectTrigger>
                <SelectContent>
                  {COLOMBIAN_CITIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg">Barrio / Zona *</label>
              <Input
                type="text"
                value={form.neighborhood}
                onChange={(e) => update('neighborhood', e.target.value)}
                placeholder="Ej: Chapinero Alto"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-fg">Dirección *</label>
            <PropertyLocationField
              address={form.address}
              city={form.city}
              latitude={form.latitude}
              longitude={form.longitude}
              onChange={updateLocation}
              placeholder="Ej: Calle 53 #13-45"
            />
          </div>
        </section>

        {/* ── Características y precio ───────────────────── */}
        <section className="bg-card rounded-xl border border-border p-6 space-y-4">
          <h2 className="text-base font-semibold text-fg">Características y precio</h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg">Habitaciones *</label>
              <Input
                type="number"
                min="0"
                value={form.bedrooms}
                onChange={(e) => update('bedrooms', e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg">Baños *</label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={form.bathrooms}
                onChange={(e) => update('bathrooms', e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg">Área (m²) *</label>
              <Input
                type="number"
                min="1"
                value={form.area}
                onChange={(e) => update('area', e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label className="text-sm font-medium text-fg">Canon mensual (COP) *</label>
              <Input
                type="number"
                min="1"
                value={form.monthlyRent}
                onChange={(e) => update('monthlyRent', e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        </section>

        {/* ── Asignación de agente ───────────────────────── */}
        {isAdmin ? (
          <section className="bg-card rounded-xl border border-border p-6 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-fg">Asignar agente</h2>
              <p className="text-sm text-fg-muted mt-0.5">
                Opcional. Podés asignarlo ahora o hacerlo desde la lista de propiedades.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg">Email del agente</label>
              <Input
                type="email"
                value={form.agentEmail}
                onChange={(e) => update('agentEmail', e.target.value)}
                placeholder="agente@inmobiliaria.com"
              />
              <p className="text-xs text-fg-muted">
                El usuario debe tener rol de Agente en el sistema.
              </p>
            </div>
          </section>
        ) : (
          <div className="rounded-xl border border-primary/30 bg-primary-soft px-4 py-3">
            <p className="text-sm text-primary">
              La propiedad quedará asignada a tu cuenta automáticamente.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger-soft p-4 text-danger text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center gap-3 pb-6">
          <Button
            type="button"
            variant="secondary"
            hideArrow
            onClick={() => router.push('/panel/inmobiliaria/propiedades')}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            hideArrow
            isLoading={isSubmitting}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? 'Creando...' : 'Crear propiedad'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NuevaPropiedadPage() {
  return (
    <PageGuard module="portafolio">
      <NuevaPropiedadContent />
    </PageGuard>
  );
}
