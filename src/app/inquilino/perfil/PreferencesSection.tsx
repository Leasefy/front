'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, FloppyDisk, House, CurrencyCircleDollar, MapPin, Calendar, PawPrint, ChatCircle, Sparkle } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getTenantPreferences,
  updateTenantPreferences,
  preferencesFromSnapshot,
  formFromPreferences,
  payloadFromForm,
  type TenantPreferences,
  type PreferencesFormData,
} from '@/lib/api/tenant-preferences.service';

/**
 * Housing preferences card for /inquilino/perfil.
 *
 * Source of truth: `GET /users/me/preferences` (tenant_preferences table).
 * When no row exists yet, the legacy wizard snapshot
 * (`user.tenantOnboardingData`) is shown as a display fallback. Saves go
 * through `PATCH /users/me/preferences` with the COMPLETE merged payload
 * (full-replacement semantics) — `payloadFromForm` round-trips the fields
 * this card does not edit (bedrooms, property types).
 */
export function PreferencesSection() {
  const { user } = useAuth();
  const { t, locale, formatCurrency } = useI18n();

  const [prefs, setPrefs] = useState<TenantPreferences | null>(null);
  // Three distinct states — a transient GET failure must NOT be conflated
  // with a genuine no-row state: with `prefs` null, a save would omit the
  // non-edited fields (bedrooms, property types) and the backend's
  // full-replacement PATCH would permanently wipe them. Editing is only
  // enabled after a SUCCESSFUL load ('ready'); failures show a retry.
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<PreferencesFormData>(formFromPreferences(null));

  const load = useCallback(() => {
    let cancelled = false;
    setLoadState('loading');
    getTenantPreferences()
      .then((row) => {
        if (cancelled) return;
        // Row or genuine no-row (null / defensive 404) — both are real states.
        setPrefs(row);
        setLoadState('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setLoadState('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => load(), [load]);

  // Display source: authoritative row, else the legacy wizard snapshot.
  const display = prefs ?? preferencesFromSnapshot(user?.tenantOnboardingData);

  const notSet = locale === 'es' ? 'No establecido' : 'Not set';

  const contactLabel = (value: string | null) => {
    switch (value) {
      case 'whatsapp':
        return 'WhatsApp';
      case 'email':
        return locale === 'es' ? 'Correo' : 'Email';
      case 'phone':
        return locale === 'es' ? 'Llamada' : 'Phone call';
      default:
        return notSet;
    }
  };

  const startEdit = () => {
    setForm(formFromPreferences(prefs ?? display));
    setIsEditing(true);
  };

  const handleSave = async () => {
    // Belt and suspenders: saving is only meaningful after a successful load —
    // with an unknown `prefs`, the full-replacement PATCH would wipe the
    // non-edited fields. The Edit button is already gated on 'ready'.
    if (loadState !== 'ready') return;
    setIsSaving(true);
    try {
      // Full-replacement PATCH: complete payload, untouched fields round-tripped.
      const saved = await updateTenantPreferences(payloadFromForm(form, prefs));
      setPrefs(saved);
      setIsEditing(false);
      toast.success(locale === 'es' ? 'Preferencias guardadas' : 'Preferences saved');
    } catch (err) {
      const message = err instanceof Error && err.message
        ? err.message
        : (locale === 'es' ? 'No se pudieron guardar las preferencias' : 'Could not save preferences');
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const set = (patch: Partial<PreferencesFormData>) => setForm((prev) => ({ ...prev, ...patch }));

  const readonlyBox = (icon: React.ReactNode, value: string) => (
    <div className="flex items-center gap-3 px-4 py-3 bg-surface-muted rounded-xl">
      {icon}
      <span className="text-sm text-fg">{value}</span>
    </div>
  );

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-fg">
          {locale === 'es' ? 'Preferencias de vivienda' : 'Housing preferences'}
        </h3>
        {!isEditing ? (
          <Button
            variant="ghost"
            size="sm"
            hideArrow
            onClick={startEdit}
            disabled={loadState !== 'ready'}
            className="gap-1.5 rounded-md text-fg-muted hover:text-fg"
          >
            <Pencil className="w-3.5 h-3.5" />
            {locale === 'es' ? 'Editar' : 'Edit'}
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              hideArrow
              onClick={() => setIsEditing(false)}
              className="rounded-md"
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              hideArrow
              isLoading={isSaving}
              onClick={handleSave}
              disabled={isSaving}
              className="gap-1.5 rounded-md bg-primary text-primary-fg hover:bg-primary-hover"
            >
              {!isSaving && <FloppyDisk className="w-3.5 h-3.5" />}
              {t('common.save')}
            </Button>
          </div>
        )}
      </div>

      {loadState === 'error' && (
        <div className="mb-4 flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-warning-soft">
          <p className="text-sm text-warning">
            {locale === 'es'
              ? 'No pudimos cargar tus preferencias. Reintenta para poder editarlas.'
              : 'We could not load your preferences. Retry to be able to edit them.'}
          </p>
          <Button variant="ghost" size="sm" hideArrow onClick={load} className="rounded-md flex-shrink-0">
            {locale === 'es' ? 'Reintentar' : 'Retry'}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Budget min */}
        <div>
          <label className="block text-sm font-medium text-fg-muted mb-2">
            {locale === 'es' ? 'Presupuesto mínimo' : 'Minimum budget'}
          </label>
          {isEditing ? (
            <Input
              type="number"
              min={0}
              value={form.minBudget}
              onChange={(e) => set({ minBudget: e.target.value })}
              placeholder="800000"
              className="w-full rounded-xl bg-surface-muted"
            />
          ) : (
            readonlyBox(
              <CurrencyCircleDollar className="w-4 h-4 text-fg-subtle" />,
              display.minBudget != null ? formatCurrency(display.minBudget) : notSet,
            )
          )}
        </div>

        {/* Budget max */}
        <div>
          <label className="block text-sm font-medium text-fg-muted mb-2">
            {locale === 'es' ? 'Presupuesto máximo' : 'Maximum budget'}
          </label>
          {isEditing ? (
            <Input
              type="number"
              min={0}
              value={form.maxBudget}
              onChange={(e) => set({ maxBudget: e.target.value })}
              placeholder="1500000"
              className="w-full rounded-xl bg-surface-muted"
            />
          ) : (
            readonlyBox(
              <CurrencyCircleDollar className="w-4 h-4 text-fg-subtle" />,
              display.maxBudget != null ? formatCurrency(display.maxBudget) : notSet,
            )
          )}
        </div>

        {/* Zones / cities */}
        <div>
          <label className="block text-sm font-medium text-fg-muted mb-2">
            {locale === 'es' ? 'Zonas de interés' : 'Preferred areas'}
          </label>
          {isEditing ? (
            <>
              <Input
                type="text"
                value={form.preferredCities}
                onChange={(e) => set({ preferredCities: e.target.value })}
                placeholder={locale === 'es' ? 'Chapinero, Usaquén' : 'Chapinero, Usaquén'}
                className="w-full rounded-xl bg-surface-muted"
              />
              <p className="mt-2 text-xs text-fg-subtle">
                {locale === 'es' ? 'Separadas por comas' : 'Comma-separated'}
              </p>
            </>
          ) : (
            readonlyBox(
              <MapPin className="w-4 h-4 text-fg-subtle" />,
              display.preferredCities.length ? display.preferredCities.join(', ') : notSet,
            )
          )}
        </div>

        {/* Amenities */}
        <div>
          <label className="block text-sm font-medium text-fg-muted mb-2">
            {locale === 'es' ? 'Amenidades' : 'Amenities'}
          </label>
          {isEditing ? (
            <>
              <Input
                type="text"
                value={form.preferredAmenities}
                onChange={(e) => set({ preferredAmenities: e.target.value })}
                placeholder={locale === 'es' ? 'parqueadero, gimnasio' : 'parking, gym'}
                className="w-full rounded-xl bg-surface-muted"
              />
              <p className="mt-2 text-xs text-fg-subtle">
                {locale === 'es' ? 'Separadas por comas' : 'Comma-separated'}
              </p>
            </>
          ) : (
            readonlyBox(
              <Sparkle className="w-4 h-4 text-fg-subtle" />,
              display.preferredAmenities.length ? display.preferredAmenities.join(', ') : notSet,
            )
          )}
        </div>

        {/* Move-in date */}
        <div>
          <label className="block text-sm font-medium text-fg-muted mb-2">
            {locale === 'es' ? 'Fecha de mudanza' : 'Move-in date'}
          </label>
          {isEditing ? (
            <Input
              type="date"
              value={form.moveInDate}
              onChange={(e) => set({ moveInDate: e.target.value })}
              className="w-full rounded-xl bg-surface-muted"
            />
          ) : (
            readonlyBox(
              <Calendar className="w-4 h-4 text-fg-subtle" />,
              display.moveInDate ? display.moveInDate.slice(0, 10) : notSet,
            )
          )}
        </div>

        {/* Preferred contact */}
        <div>
          <label className="block text-sm font-medium text-fg-muted mb-2">
            {locale === 'es' ? 'Contacto preferido' : 'Preferred contact'}
          </label>
          {isEditing ? (
            <select
              value={form.preferredContact}
              onChange={(e) => set({ preferredContact: e.target.value })}
              aria-label={locale === 'es' ? 'Contacto preferido' : 'Preferred contact'}
              className="w-full h-10 px-4 rounded-xl bg-surface-muted border border-border text-sm text-fg"
            >
              <option value="">{notSet}</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">{locale === 'es' ? 'Correo' : 'Email'}</option>
              <option value="phone">{locale === 'es' ? 'Llamada' : 'Phone call'}</option>
            </select>
          ) : (
            readonlyBox(
              <ChatCircle className="w-4 h-4 text-fg-subtle" />,
              contactLabel(display.preferredContact),
            )
          )}
        </div>

        {/* Pets */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-fg-muted mb-2">
            {locale === 'es' ? 'Mascotas' : 'Pets'}
          </label>
          {isEditing ? (
            <div className="space-y-3">
              <label className="flex items-center gap-3 px-4 py-3 bg-surface-muted rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.petFriendly}
                  onChange={(e) => set({ petFriendly: e.target.checked })}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm text-fg">
                  {locale === 'es' ? 'Tengo mascotas' : 'I have pets'}
                </span>
              </label>
              {form.petFriendly && (
                <Input
                  type="text"
                  value={form.petDetails}
                  onChange={(e) => set({ petDetails: e.target.value })}
                  placeholder={locale === 'es' ? 'Ej: un gato' : 'E.g. one cat'}
                  className="w-full rounded-xl bg-surface-muted"
                />
              )}
            </div>
          ) : (
            readonlyBox(
              <PawPrint className="w-4 h-4 text-fg-subtle" />,
              display.petFriendly
                ? display.petDetails || (locale === 'es' ? 'Con mascotas' : 'Has pets')
                : (locale === 'es' ? 'Sin mascotas' : 'No pets'),
            )
          )}
        </div>

        {/* Bedrooms / property types — not edited here; values round-trip on save */}
        {(display.preferredBedrooms != null || display.preferredPropertyTypes.length > 0) && (
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 px-4 py-3 bg-surface-muted rounded-xl">
              <House className="w-4 h-4 text-fg-subtle" />
              <span className="text-xs text-fg-muted">
                {[
                  display.preferredBedrooms != null
                    ? (locale === 'es'
                        ? `${display.preferredBedrooms} habitaciones`
                        : `${display.preferredBedrooms} bedrooms`)
                    : null,
                  display.preferredPropertyTypes.length
                    ? display.preferredPropertyTypes.join(', ')
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
