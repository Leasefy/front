'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, FloppyDisk, House, CurrencyCircleDollar, MapPin, Calendar, PawPrint, ChatCircle, Sparkle } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@leasefy/cadence';
import { aFechaIso, fechaLocal } from '@/lib/fechas-locales';
import {
  getTenantPreferences,
  updateTenantPreferences,
  preferencesFromSnapshot,
  formFromPreferences,
  payloadFromForm,
  type TenantPreferences,
  type PreferencesFormData,
} from '@/lib/api/tenant-preferences.service';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import {
  CAMPOS_DE_PREFERENCIAS,
  revisarPreferenciasDelPerfil,
  type CampoDePreferencia,
  type ErroresDePreferencia,
} from './preferencias-del-perfil';
import { MENSAJES_DEL_PERFIL } from '@/lib/onboarding/preferencias-del-inquilino';

const idDelCampo = (campo: CampoDePreferencia) => `preferencias-${campo}`;

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
  /**
   * El error de cada campo: el del cliente (los topes y frases del back, ver
   * `./preferencias-del-perfil`) o el que el back mandó en `campos[]`.
   */
  const [errores, setErrores] = useState<ErroresDePreferencia>({});

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
    setErrores({});
    setIsEditing(true);
  };

  /** Pone los errores en sus campos y le da el foco al primero. */
  const mostrarErrores = (porCampo: ErroresDePreferencia, primero?: CampoDePreferencia) => {
    setErrores(porCampo);
    if (primero && typeof document !== 'undefined') document.getElementById(idDelCampo(primero))?.focus();
  };

  const handleSave = async () => {
    // Belt and suspenders: saving is only meaningful after a successful load —
    // with an unknown `prefs`, the full-replacement PATCH would wipe the
    // non-edited fields. The Edit button is already gated on 'ready'.
    if (loadState !== 'ready') return;

    // Nico, 02-10-2026: el mismo tope ($100.000.000 al mes) y la misma frase
    // que el onboarding y el back, ANTES de mandar. Un negativo o un decimal
    // ya no se pierden en silencio (el PATCH de reemplazo borraba el valor).
    const delCliente = revisarPreferenciasDelPerfil(form);
    const primero = CAMPOS_DE_PREFERENCIAS.find((c) => delCliente[c] !== undefined);
    if (primero) {
      mostrarErrores(delCliente, primero);
      return;
    }

    setIsSaving(true);
    try {
      // Full-replacement PATCH: complete payload, untouched fields round-tripped.
      const saved = await updateTenantPreferences(payloadFromForm(form, prefs));
      setPrefs(saved);
      setErrores({});
      setIsEditing(false);
      toast.success(locale === 'es' ? 'Preferencias guardadas' : 'Preferences saved');
    } catch (err) {
      // Antes: `err.message` crudo. Ahora, por el traductor: lo del back por
      // campo va a SU campo; al toast, sólo lo suelto (un 5xx con su
      // referencia; «conexión», sólo si no hubo respuesta).
      const reparto = repartirErroresDelServidor<CampoDePreferencia>(err, {
        campos: CAMPOS_DE_PREFERENCIAS,
        accion: 'guardar tus preferencias',
        porDefecto:
          locale === 'es'
            ? 'No pudimos guardar tus preferencias. Prueba de nuevo en un momento.'
            : 'Could not save preferences',
      });
      mostrarErrores(reparto.porCampo, reparto.orden[0]);
      if (reparto.sueltos.length > 0) toast.error(reparto.sueltos.join(' · '));
    } finally {
      setIsSaving(false);
    }
  };

  const set = (patch: Partial<PreferencesFormData>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    // Lo que estaba mal deja de valer en cuanto la persona toca ese campo.
    setErrores((prev) => {
      const tocados = (Object.keys(patch) as string[]).flatMap((k) =>
        k === 'petFriendly' ? ['petDetails'] : [k],
      ) as CampoDePreferencia[];
      // «El máximo no puede ser menor que el mínimo» se corrige tocando
      // cualquiera de los dos presupuestos.
      if (tocados.includes('minBudget') && prev.maxBudget === MENSAJES_DEL_PERFIL.maximoMenorQueMinimo) {
        tocados.push('maxBudget');
      }
      if (!tocados.some((c) => prev[c] !== undefined)) return prev;
      const next = { ...prev };
      for (const c of tocados) delete next[c];
      return next;
    });
  };

  /** Las props de accesibilidad de un campo con su error debajo. */
  const propsDelCampo = (campo: CampoDePreferencia) => ({
    id: idDelCampo(campo),
    'aria-invalid': errores[campo] ? true : undefined,
    'aria-describedby': errores[campo] ? `${idDelCampo(campo)}-error` : undefined,
  });
  const errorDelCampo = (campo: CampoDePreferencia, pista?: React.ReactNode) => (
    <ErrorDelCampo id={`${idDelCampo(campo)}-error`} mensaje={errores[campo]} pista={pista} />
  );

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
              onClick={() => {
                setIsEditing(false);
                setErrores({});
              }}
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
            <>
              <Input
                type="number"
                min={0}
                {...propsDelCampo('minBudget')}
                value={form.minBudget}
                onChange={(e) => set({ minBudget: e.target.value })}
                placeholder="800000"
                className="w-full rounded-xl bg-surface-muted"
              />
              {errorDelCampo('minBudget')}
            </>
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
            <>
              <Input
                type="number"
                min={0}
                {...propsDelCampo('maxBudget')}
                value={form.maxBudget}
                onChange={(e) => set({ maxBudget: e.target.value })}
                placeholder="1500000"
                className="w-full rounded-xl bg-surface-muted"
              />
              {errorDelCampo('maxBudget')}
            </>
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
                {...propsDelCampo('preferredCities')}
                value={form.preferredCities}
                onChange={(e) => set({ preferredCities: e.target.value })}
                placeholder={locale === 'es' ? 'Chapinero, Usaquén' : 'Chapinero, Usaquén'}
                className="w-full rounded-xl bg-surface-muted"
              />
              {/* La ayuda y el error se cruzan (decisión 1): nunca los dos a la vez. */}
              {errorDelCampo('preferredCities', locale === 'es' ? 'Separadas por comas' : 'Comma-separated')}
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
                {...propsDelCampo('preferredAmenities')}
                value={form.preferredAmenities}
                onChange={(e) => set({ preferredAmenities: e.target.value })}
                placeholder={locale === 'es' ? 'parqueadero, gimnasio' : 'parking, gym'}
                className="w-full rounded-xl bg-surface-muted"
              />
              {errorDelCampo('preferredAmenities', locale === 'es' ? 'Separadas por comas' : 'Comma-separated')}
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
            // El calendario de cadence, igual que en el onboarding (Nico, 2026-09-15).
            <>
              <DatePicker
                value={fechaLocal(form.moveInDate)}
                onChange={(d) => set({ moveInDate: aFechaIso(d) })}
                placeholder={locale === 'es' ? 'Elige una fecha' : 'Pick a date'}
                className="h-10 w-full min-w-0 rounded-xl bg-surface-muted"
              />
              {errorDelCampo('moveInDate')}
            </>
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
            <>
            <select
              {...propsDelCampo('preferredContact')}
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
            {errorDelCampo('preferredContact')}
            </>
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
                <div>
                  <Input
                    type="text"
                    {...propsDelCampo('petDetails')}
                    value={form.petDetails}
                    onChange={(e) => set({ petDetails: e.target.value })}
                    placeholder={locale === 'es' ? 'Ej: un gato' : 'E.g. one cat'}
                    className="w-full rounded-xl bg-surface-muted"
                  />
                  {errorDelCampo('petDetails')}
                </div>
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
