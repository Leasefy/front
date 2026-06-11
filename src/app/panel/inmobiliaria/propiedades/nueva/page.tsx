'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CaretLeft, House, Spinner } from '@phosphor-icons/react';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useAuth } from '@/lib/auth/use-auth';
import { propertiesApi } from '@/lib/api/properties.service';
import { PageGuard } from '@/components/auth/PageGuard';
import { cn } from '@/lib/utils';
import { COLOMBIAN_CITIES } from '@/lib/types/property';
import type { PropertyType } from '@/lib/types/property';

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: 'apartment', label: 'Apartamento' },
  { value: 'house',     label: 'Casa' },
  { value: 'studio',    label: 'Estudio' },
  { value: 'room',      label: 'Habitación' },
];

const inputClass =
  'w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#1A40FF]/20 focus:border-[#1A40FF]/30 text-sm transition-all';

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
    monthlyRent:  '',
    bedrooms:     '',
    bathrooms:    '',
    area:         '',
    agentEmail:   '',
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

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
        <div className="w-6 h-6 border-2 border-[#1A40FF]/30 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <button
          onClick={() => router.push('/panel/inmobiliaria/propiedades')}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <CaretLeft className="w-4 h-4" />
          Volver a propiedades
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#EEF1FF] dark:bg-[#1A40FF]/15 flex items-center justify-center">
            <House className="w-6 h-6 text-[#1A40FF] dark:text-[#5570FF]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
              Nueva propiedad
            </h1>
            <p className="text-muted-foreground text-sm">
              Registrá una nueva propiedad en el portafolio
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ── Información básica ────────────────────────── */}
        <section className="bg-card rounded-xl border border-border p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Información básica</h2>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Título *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="Ej: Apartamento moderno en Chapinero"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Descripción *</label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Describí la propiedad..."
              rows={3}
              className={cn(inputClass, 'resize-none')}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Tipo de inmueble *</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PROPERTY_TYPES.map((pt) => (
                <button
                  key={pt.value}
                  type="button"
                  onClick={() => update('type', pt.value)}
                  className={cn(
                    'px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-center',
                    form.type === pt.value
                      ? 'border-[#1A40FF]/30 bg-[#EEF1FF] dark:bg-[#1A40FF]/15 text-[#1A40FF] dark:text-[#5570FF]'
                      : 'border-border text-muted-foreground hover:border-[#1A40FF]/30 hover:text-foreground'
                  )}
                >
                  {pt.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Ubicación ─────────────────────────────────── */}
        <section className="bg-card rounded-xl border border-border p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Ubicación</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Ciudad *</label>
              <select
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                className={inputClass}
              >
                <option value="">Seleccioná una ciudad</option>
                {COLOMBIAN_CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Barrio / Zona *</label>
              <input
                type="text"
                value={form.neighborhood}
                onChange={(e) => update('neighborhood', e.target.value)}
                placeholder="Ej: Chapinero Alto"
                className={inputClass}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Dirección *</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              placeholder="Ej: Calle 53 #13-45"
              className={inputClass}
            />
          </div>
        </section>

        {/* ── Características y precio ───────────────────── */}
        <section className="bg-card rounded-xl border border-border p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Características y precio</h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Habitaciones *</label>
              <input
                type="number"
                min="0"
                value={form.bedrooms}
                onChange={(e) => update('bedrooms', e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Baños *</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={form.bathrooms}
                onChange={(e) => update('bathrooms', e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Área (m²) *</label>
              <input
                type="number"
                min="1"
                value={form.area}
                onChange={(e) => update('area', e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label className="text-sm font-medium text-foreground">Canon mensual (COP) *</label>
              <input
                type="number"
                min="1"
                value={form.monthlyRent}
                onChange={(e) => update('monthlyRent', e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* ── Asignación de agente ───────────────────────── */}
        {isAdmin ? (
          <section className="bg-card rounded-xl border border-border p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-foreground">Asignar agente</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Opcional. Podés asignarlo ahora o hacerlo desde la lista de propiedades.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email del agente</label>
              <input
                type="email"
                value={form.agentEmail}
                onChange={(e) => update('agentEmail', e.target.value)}
                placeholder="agente@inmobiliaria.com"
                className={inputClass}
              />
              <p className="text-xs text-muted-foreground">
                El usuario debe tener rol de Agente en el sistema.
              </p>
            </div>
          </section>
        ) : (
          <div className="rounded-xl border border-[#1A40FF]/30 dark:border-[#1A40FF]/40 bg-[#EEF1FF] dark:bg-[#1A40FF]/15 px-4 py-3">
            <p className="text-sm text-[#1A40FF] dark:text-[#5570FF]">
              La propiedad quedará asignada a tu cuenta automáticamente.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-[#C4503B]/30 dark:border-[#C4503B]/40 bg-[#F8EAE7] dark:bg-[#C4503B]/15 p-4 text-[#C4503B] dark:text-[#E0664D] text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center gap-3 pb-6">
          <button
            type="button"
            onClick={() => router.push('/panel/inmobiliaria/propiedades')}
            className="px-5 py-2.5 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-[#1A40FF] text-white text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Spinner className="w-4 h-4 animate-spin" />
                Creando...
              </>
            ) : (
              'Crear propiedad'
            )}
          </button>
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
