'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  HouseLine,
  Percent,
  UserCircle,
  ClipboardText,
  CheckCircle,
  CaretLeft,
  CaretRight,
  Check,
  X,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth/use-auth';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { propertiesApi } from '@/lib/api/properties.service';
import { uploadPropertyPhotos } from '@/lib/api/property-photos';
import { ApiError } from '@/lib/api/client';
import { TYPE_TO_BACKEND } from '@/lib/api/properties.mapper';
import { consignacionesApi, propietariosApi } from '@/lib/api/inmobiliaria.service';
import type { PropertyType } from '@/lib/types/property';
import type { Propietario, Agente, InventoryItem, PropietarioFormData } from '@/lib/types/inmobiliaria';
import {
  StepSelectPropietario,
  StepPropertyData,
  StepCommissionTerms,
  StepAssignAgent,
  StepActaEntrega,
  StepConfirmation,
  type WizardFormData,
} from './ConsignacionWizardSteps';

interface ConsignacionWizardProps {
  propietarios: Propietario[];
  agentes: Agente[];
}

const STEPS = [
  { id: 1, labelKey: 'inmobiliaria.consignaciones.wizard.steps.owner', icon: User },
  { id: 2, labelKey: 'inmobiliaria.consignaciones.wizard.steps.property', icon: HouseLine },
  { id: 3, labelKey: 'inmobiliaria.consignaciones.wizard.steps.commission', icon: Percent },
  { id: 4, labelKey: 'inmobiliaria.consignaciones.wizard.steps.agent', icon: UserCircle },
  { id: 5, labelKey: 'inmobiliaria.consignaciones.wizard.steps.inventory', icon: ClipboardText },
  { id: 6, labelKey: 'inmobiliaria.consignaciones.wizard.steps.confirm', icon: CheckCircle },
];

/**
 * ConsignacionWizard - 6-step wizard for creating new property consignments
 * Used at /panel/inmobiliaria/inmuebles/nuevo
 */

export function ConsignacionWizard({ propietarios, agentes }: ConsignacionWizardProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  // Agents skip the "Assign agent" step — they get auto-assigned
  const isAgentRole = !isAdmin;
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Form data state
  const [formData, setFormData] = useState<Partial<WizardFormData>>({
    propertyType: 'apartment',
    commissionPercent: 10,
    // contract-addendum-2.md §A.3 — a distinct field, only used on the sale
    // branch (step 3 renders one or the other, never both, §A.8).
    saleCommissionPercent: 3,
    minimumTerm: 12,
    inventoryItems: [],
    inventoryNotes: '',
    contractStartDate: new Date().toISOString().split('T')[0],
    photos: [],
    // contract.md T-0038 §3.2.2/§3.2.6 (D5, R6) — same today-default pattern
    // as contractStartDate, but a DIFFERENT field: consignedAt is the new
    // property-level column, contractStartDate stays the mandate's date.
    listingType: 'rent',
    consignedAt: new Date().toISOString().split('T')[0],
  });

  // Update form data helper
  const updateFormData = useCallback((data: Partial<WizardFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  }, []);

  // Step validation
  const isStepValid = useMemo(() => {
    switch (currentStep) {
      case 1:
        // Must have selected or created a propietario
        return Boolean(formData.propietarioId);
      case 2: {
        // Must have property details — thresholds mirror CreatePropertyDto
        // (contract.md §3.2): bedrooms 0-20, bathrooms 1-10, area 10-10000 m²,
        // description 20-5000 chars. T-0038: department is required in this
        // UI (§3.2.1), and the price field is conditional on listingType
        // (§3.2.2/§3.2.4) — a sale listing validates salePrice, not monthlyRent.
        const isSaleListing = formData.listingType === 'sale';
        const priceValid = isSaleListing
          ? Boolean(formData.salePrice && formData.salePrice > 0)
          : Boolean(formData.monthlyRent && formData.monthlyRent > 0);
        return Boolean(
          formData.propertyTitle &&
          formData.propertyAddress &&
          formData.propertyCity &&
          formData.propertyZone &&
          formData.department &&
          formData.propertyType &&
          priceValid &&
          formData.bedrooms != null && formData.bedrooms >= 0 && formData.bedrooms <= 20 &&
          formData.bathrooms != null && formData.bathrooms >= 1 && formData.bathrooms <= 10 &&
          formData.area != null && formData.area >= 10 && formData.area <= 10000 &&
          formData.propertyDescription &&
          formData.propertyDescription.length >= 20 &&
          formData.propertyDescription.length <= 5000
        );
      }
      case 3:
        // Commission terms always valid with defaults
        return true;
      case 4:
        // Agents skip this step. Admins may leave it unassigned too — an
        // unassigned consignment falls back to the creating user's own
        // profile in handleSubmit, so nothing here should block "Siguiente".
        return true;
      case 5:
        // Inventory is optional
        return true;
      case 6:
        // Confirmation step - agenteId is never required: an unassigned
        // consignment defaults to the profile that created it.
        return Boolean(
          formData.propietarioId &&
          formData.propertyTitle &&
          formData.propertyAddress &&
          formData.propertyCity &&
          formData.propertyZone &&
          formData.department
        );
      default:
        return false;
    }
  }, [currentStep, formData]);

  // Navigation helpers — agents skip step 4; a sale listing skips step 5
  // (contract-addendum-2.md §A.8 — "5 · Inventario / acta de entrega —
  // Skipped, the owner ruled it out"). Both skips compose: an agent
  // creating a sale mandate goes 3 → 6 directly.
  const isSaleListing = formData.listingType === 'sale';

  const getNextStep = useCallback((step: number) => {
    let next = step + 1;
    if (isAgentRole && next === 4) next = 5;
    if (isSaleListing && next === 5) next = 6;
    return next;
  }, [isAgentRole, isSaleListing]);

  const getPrevStep = useCallback((step: number) => {
    let prev = step - 1;
    if (isSaleListing && prev === 5) prev = 4;
    if (isAgentRole && prev === 4) prev = 3;
    return prev;
  }, [isAgentRole, isSaleListing]);

  // ── Step 1 → 2: persist the propietario on "Siguiente" ────────────────────
  const [isPersistingOwner, setIsPersistingOwner] = useState(false);
  const [ownerServerError, setOwnerServerError] = useState<
    { field: keyof PropietarioFormData; message: string } | null
  >(null);

  /**
   * "quiero que apenas le de a continuar cree el propietario" — the owner is
   * persisted the moment the user advances past step 1, not when the inner
   * "Crear propietario" form submits (that button only stages the data
   * locally — see PropietarioSelector.handleNewPropietarioSubmit).
   *
   * `propietarioId` doubles as the persistence marker: a `new-<timestamp>`
   * id means nothing has been sent yet (POST); a real id with
   * `newPropietarioData` still attached means this is OUR OWN
   * already-created owner potentially edited again via "Editar" (PUT, same
   * id — never a second POST, never a duplicate). A real id with no
   * `newPropietarioData` means an EXISTING propietario was picked from the
   * list — nothing to persist.
   *
   * Returns whether it's safe to advance.
   */
  const persistOwnerIfNeeded = useCallback(async (): Promise<boolean> => {
    const propietarioId = formData.propietarioId ?? '';
    const isTempId = propietarioId.startsWith('new-');
    const isOwnRecord = !isTempId && Boolean(propietarioId) && Boolean(formData.newPropietarioData);
    if (!isTempId && !isOwnRecord) return true;

    setIsPersistingOwner(true);
    setOwnerServerError(null);
    try {
      if (isTempId) {
        const created = await propietariosApi.create(formData.newPropietarioData!);
        updateFormData({ propietarioId: created.id });
      } else {
        await propietariosApi.update(propietarioId, formData.newPropietarioData!);
      }
      return true;
    } catch (error) {
      // 409 — contract.md §3.3: duplicate documentNumber in this agency.
      // Named on the field the user can actually fix; MUST NOT retry blindly.
      if (error instanceof ApiError && error.status === 409) {
        setOwnerServerError({ field: 'documentNumber', message: error.message });
      } else {
        const description =
          error instanceof Error && error.message
            ? error.message
            : t('inmobiliaria.consignaciones.wizard.toasts.errorDesc');
        toast.error(t('inmobiliaria.consignaciones.wizard.toasts.ownerErrorTitle'), { description });
      }
      return false;
    } finally {
      setIsPersistingOwner(false);
    }
  }, [formData.propietarioId, formData.newPropietarioData, updateFormData, t]);

  const goToNextStep = useCallback(async () => {
    if (currentStep >= 6 || !isStepValid || isPersistingOwner) return;

    if (currentStep === 1) {
      const ok = await persistOwnerIfNeeded();
      if (!ok) return; // stay on step 1, error is surfaced by persistOwnerIfNeeded
    }

    setCurrentStep(getNextStep(currentStep));
  }, [currentStep, isStepValid, isPersistingOwner, persistOwnerIfNeeded, getNextStep]);

  const goToPreviousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(getPrevStep(currentStep));
    }
  }, [currentStep, getPrevStep]);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= 6) {
      setCurrentStep(step);
    }
  }, []);

  /**
   * Crea el inmueble Y el mandato. Son dos cosas.
   *
   * Durante meses esto sólo creó el inmueble: las seis pantallas preguntaban
   * propietario, comisión, agente, fecha y término mínimo, y al final llamaba
   * a `propertiesApi.create` y navegaba diciendo «listo». Todo lo que hace que
   * una consignación sea una consignación se descartaba en silencio, y la
   * liquidación quedaba corriendo al 0% de comisión.
   *
   * Se veía perfecto porque el inmueble SÍ aparecía en el catálogo. Medido
   * antes de arreglarlo: de las 19 consignaciones de la base, 15 las había
   * creado el sincronizador del pipeline (con `commissionPercent: 0`, que es
   * el valor que hornea al auto-crear) y 4 la migración de cartera. Ninguna
   * salió de acá.
   *
   * El orden importa: primero el inmueble, porque el mandato lo referencia con
   * llave foránea. Si el segundo paso falla se avisa que el inmueble quedó
   * creado sin mandato en vez de decir «listo» — media verdad se lee como
   * mentira entera cuando aparece la factura.
   */
  const handleSubmit = useCallback(async () => {
    if (!isStepValid) return;
    setIsSubmitting(true);

    try {
      /**
       * Contract.md §3.2 (T-0011) — no silent coercion. The wizard's 6 UI
       * options (apartment/house/studio/commercial/office/warehouse) all
       * have an entry in TYPE_TO_BACKEND; an unmapped value is a bug that
       * must surface as an error, not get quietly rewritten to 'apartment'
       * the way it used to (a consigned warehouse was stored as an
       * apartment).
       */
      const wizardType = formData.propertyType as PropertyType | undefined;
      if (!wizardType || !(wizardType in TYPE_TO_BACKEND)) {
        throw new Error(
          `Tipo de inmueble no soportado: "${wizardType ?? ''}". Volvé al paso 2 y elegí un tipo válido.`,
        );
      }

      // contract.md T-0038 §3.2.2/§3.2.4 — a SALE listing sends
      // `monthlyRent: null` and `salePrice`; a RENT listing sends
      // `monthlyRent` and no `salePrice`. Never `monthlyRent: 0` on a sale
      // (C6) — this replaces the previous `formData.monthlyRent ?? 0`, which
      // was a live C6 violation on this exact path.
      const isSaleListing = formData.listingType === 'sale';

      const property = await propertiesApi.create({
        title:        formData.propertyTitle ?? '',
        description:  formData.propertyDescription ?? '',
        type:         wizardType,
        city:         formData.propertyCity ?? '',
        neighborhood: formData.propertyZone ?? '',
        address:      formData.propertyAddress ?? '',
        latitude:     formData.propertyLatitude,
        longitude:    formData.propertyLongitude,
        department:   formData.department,
        listingType:  formData.listingType ?? 'rent',
        monthlyRent:  isSaleListing ? null : (formData.monthlyRent ?? 0),
        salePrice:    isSaleListing ? (formData.salePrice ?? null) : null,
        consignedAt:  formData.consignedAt,
        bedrooms:     formData.bedrooms ?? 0,
        bathrooms:    formData.bathrooms ?? 1,
        area:         formData.area ?? 10,
        adminFee:     formData.adminFee,
      });

      // Photos are best-effort: the property already exists at this point,
      // so a failed upload must never abort the rest of the flow (same
      // partial-failure handling as PropertyEditModal.tsx). Unlike that
      // modal, a partial photo failure here gets its own toast instead of
      // replacing the final one below — the consignment's success message
      // carries owner/commission/agent info that a photo-only message
      // would otherwise bury, and "some photos didn't upload" must not
      // read as "the consignment failed".
      const photosToUpload = formData.photos ?? [];
      if (photosToUpload.length > 0) {
        setIsUploadingPhotos(true);
        try {
          const { uploaded, failed } = await uploadPropertyPhotos(property.id, photosToUpload);
          if (failed.length > 0) {
            toast.warning(t('inmobiliaria.consignaciones.wizard.toasts.photosPartialTitle'), {
              description: t('inmobiliaria.consignaciones.wizard.toasts.photosPartialDesc', {
                uploaded,
                total: photosToUpload.length,
              }),
            });
          }
        } finally {
          setIsUploadingPhotos(false);
        }
      }

      // Assign agent
      const selectedAgente = agentes.find((a) => a.id === formData.agenteId);
      if (isAgentRole && user?.email) {
        // Agent creating → auto-assign to themselves
        await propertiesApi.assignAgent(property.id, user.email);
      } else if (!isAgentRole && selectedAgente?.email) {
        // Admin → assign the selected agent by email
        await propertiesApi.assignAgent(property.id, selectedAgente.email);
      }

      /**
       * contract-addendum-2.md §A — the owner's ruling on W3-a reversed
       * WU-3's shipped behaviour: a sale listing DOES carry a mandate, in
       * reduced form (propietario + consignedAt + sale commission). No
       * canon, no minimumTerm, no adminFee, no acta de entrega (step 5 is
       * skipped entirely on this path, see `getNextStep` above).
       *
       * `saleCommissionPercent` is a DISTINCT field from `commissionPercent`
       * (§A.3) — never reused. `commissionPercent` is still required by the
       * DTO and is sent as `0` on a sale mandate, which is not a C6
       * violation because the row carries an explicit `listingType`
       * discriminator (derived server-side, never sent by this call).
       */

      // El mandato. `agenteUserId` es un User.id: el `Agente.id` del front es
      // un AgencyMember.id y mandarlo acá no falla, asigna a nadie.
      //
      // Sin agente elegido — porque el rol agente saltea el paso 4, o porque
      // el admin no seleccionó ninguno — el mandato cae en el mismo perfil
      // que lo está creando. No hace falta un assignAgent adicional acá:
      // properties.service.ts (back) ya le da PropertyAccess al creador
      // dentro de la misma transacción del create() de la propiedad.
      const agenteUserId = selectedAgente?.userId ?? user?.id;
      try {
        await consignacionesApi.create({
          propietarioId: formData.propietarioId ?? '',
          propertyId: property.id,
          ...(agenteUserId ? { agenteUserId } : {}),
          propertyTitle: formData.propertyTitle ?? '',
          propertyAddress: formData.propertyAddress ?? '',
          propertyCity: formData.propertyCity ?? '',
          propertyZone: formData.propertyZone ?? '',
          propertyType: formData.propertyType ?? 'apartment',
          // §A.7/§A.8 — monthlyRent/adminFee/minimumTerm are OMITTED on a
          // sale mandate (never null-with-a-value, never 0, R2/C6). A rent
          // mandate is unaffected — `isStepValid` already blocks step 2 from
          // advancing without a positive `monthlyRent`, so no `?? 0`
          // sentinel is needed here any more (the twin of the one WU-3
          // already removed from the property-create path).
          ...(isSaleListing
            ? { saleCommissionPercent: formData.saleCommissionPercent ?? 0 }
            : {
                monthlyRent: formData.monthlyRent as number,
                ...(formData.adminFee != null ? { adminFee: formData.adminFee } : {}),
                ...(formData.minimumTerm != null ? { minimumTerm: formData.minimumTerm } : {}),
              }),
          commissionPercent: isSaleListing ? 0 : (formData.commissionPercent ?? 0),
          // §A.2 — the sale mandate's contractDate is the SAME value sent as
          // Property.consignedAt above; the rent mandate keeps its own date.
          contractDate: isSaleListing
            ? (formData.consignedAt ?? new Date().toISOString().split('T')[0])
            : (formData.contractStartDate ?? new Date().toISOString().split('T')[0]),
          agenteId: formData.agenteId ?? '',
        });
      } catch (error) {
        // El inmueble YA existe. Decirlo es la diferencia entre que alguien lo
        // busque en la lista y lo complete, o que lo dé por perdido y lo cargue
        // de nuevo — y termine con dos.
        console.error('Error creating consignacion:', error);
        toast.error(t('inmobiliaria.consignaciones.wizard.toasts.mandateErrorTitle'), {
          description: t('inmobiliaria.consignaciones.wizard.toasts.mandateErrorDesc'),
        });
        router.push('/panel/inmobiliaria/inmuebles');
        return;
      }

      /**
       * Contract.md §3.4 (T-0018) — publish LAST, only once the mandate
       * exists. `POST /properties` above still creates the property as
       * DRAFT (unchanged); this step is what makes it visible to tenants
       * (`status: { not: DRAFT }` at
       * back/src/properties/properties.service.ts:429-431). Publishing any
       * earlier would show a property to tenants with no mandate behind it.
       */
      try {
        await propertiesApi.update(property.id, { status: 'AVAILABLE' });
      } catch (error) {
        // The property AND the mandate already exist — only the publish
        // step failed (most commonly a 402 plan-cap). Never claim success
        // here, and never fall back to DRAFT silently (contract.md §3.3
        // prohibits exactly that): say what happened and how to finish it,
        // the same reasoning the mandate-failure catch above already
        // applies.
        console.error('Error publishing property:', error);
        const reason =
          error instanceof ApiError && error.messages
            ? error.messages.join(' · ')
            : error instanceof Error && error.message
              ? error.message
              : t('inmobiliaria.consignaciones.wizard.toasts.publishErrorFallbackReason');
        toast.error(t('inmobiliaria.consignaciones.wizard.toasts.publishErrorTitle'), {
          description: t('inmobiliaria.consignaciones.wizard.toasts.publishErrorDesc', { reason }),
        });
        router.push('/panel/inmobiliaria/inmuebles');
        return;
      }

      toast.success(t('inmobiliaria.consignaciones.wizard.toasts.successTitle'), {
        description: t('inmobiliaria.consignaciones.wizard.toasts.successDesc', {
          title: formData.propertyTitle || '',
        }),
      });

      router.push('/panel/inmobiliaria/inmuebles');
    } catch (error) {
      console.error('Error creating property:', error);
      /**
       * Contract.md §3.3 — a 400 from the global ValidationPipe carries
       * `message` as a string[]. Before this, the fixed generic toast below
       * ran unconditionally and the real reason only ever showed up in
       * `console.error`, which is why the user had to open the network tab
       * to find out what was wrong. `ApiError.messages` (see client.ts)
       * preserves the array instead of losing it to `String(err.message)`
       * (which would render `"a,b,c"`).
       */
      const description =
        error instanceof ApiError && error.messages
          ? error.messages.join(' · ')
          : error instanceof Error && error.message
            ? error.message
            : t('inmobiliaria.consignaciones.wizard.toasts.errorDesc');
      toast.error(t('inmobiliaria.consignaciones.wizard.toasts.errorTitle'), { description });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isStepValid, isAgentRole, user, agentes, router, t]);

  // Cancel handler
  const handleCancel = useCallback(() => {
    setShowCancelDialog(true);
  }, []);

  const confirmCancel = useCallback(() => {
    router.push('/panel/inmobiliaria/inmuebles');
  }, [router]);

  // Render step content
  const renderStepContent = () => {
    const stepProps = {
      formData,
      updateFormData,
      propietarios,
      agentes,
    };

    switch (currentStep) {
      case 1:
        return <StepSelectPropietario {...stepProps} ownerServerError={ownerServerError} />;
      case 2:
        return <StepPropertyData {...stepProps} />;
      case 3:
        return <StepCommissionTerms {...stepProps} />;
      case 4:
        return <StepAssignAgent {...stepProps} />;
      case 5:
        return <StepActaEntrega {...stepProps} />;
      case 6:
        return <StepConfirmation {...stepProps} onGoToStep={goToStep} />;
      default:
        return null;
    }
  };

  // Calculate completed steps
  const getStepStatus = (stepId: number) => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'current';
    return 'upcoming';
  };

  // Visible steps depend on role (agents skip "Agent") and listing type (a
  // sale mandate skips "Inventory/acta de entrega" — §A.8).
  const visibleSteps = STEPS.filter((s) => {
    if (isAgentRole && s.id === 4) return false;
    if (isSaleListing && s.id === 5) return false;
    return true;
  });
  const totalVisible = visibleSteps.length;
  // Position of current step among visible steps (1-based)
  const currentVisibleIndex = visibleSteps.findIndex((s) => s.id === currentStep);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Step Indicator */}
      <div className="mb-8">
        {/* Desktop Steps */}
        <div className="hidden md:flex items-center justify-between">
          {visibleSteps.map((step, index) => {
            const status = getStepStatus(step.id);
            const StepIcon = step.icon;

            return (
              <div key={step.id} className="flex items-center">
                {/* allowlist: clickable wizard step-navigator (icon-per-step circle + label-below,
                    completed/current/upcoming). Cadence Stepper is display-only — can't model this. Native. */}
                <button
                  onClick={() => status !== 'upcoming' && goToStep(step.id)}
                  disabled={status === 'upcoming'}
                  className={cn(
                    'flex flex-col items-center gap-2 transition-all',
                    status === 'upcoming' ? 'cursor-not-allowed' : 'cursor-pointer'
                  )}
                >
                  <div className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center transition-all',
                    status === 'completed'
                      ? 'bg-success text-white'
                      : status === 'current'
                        ? 'bg-primary text-primary-fg uppercase tracking-wide font-mono ring-4 ring-primary/30'
                        : 'bg-surface-muted dark:bg-ink text-fg-subtle'
                  )}>
                    {status === 'completed' ? (
                      <Check className="w-5 h-5" weight="bold" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={cn(
                    'text-xs font-medium',
                    status === 'current'
                      ? 'text-primary'
                      : status === 'completed'
                        ? 'text-fg dark:text-white'
                        : 'text-fg-subtle'
                  )}>
                    {t(step.labelKey)}
                  </span>
                </button>

                {/* Connector Line */}
                {index < visibleSteps.length - 1 && (
                  <div className={cn(
                    'flex-1 h-0.5 mx-2',
                    step.id < currentStep
                      ? 'bg-success'
                      : 'bg-surface-muted dark:bg-ink'
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile Progress */}
        <div className="md:hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-fg dark:text-white">
              {t('inmobiliaria.consignaciones.wizard.mobileProgress', {
                current: currentVisibleIndex + 1,
                total: totalVisible,
                label: t(visibleSteps[currentVisibleIndex]?.labelKey ?? ''),
              })}
            </span>
            <span className="text-sm text-fg-muted">
              {Math.round(((currentVisibleIndex + 1) / totalVisible) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-surface-muted dark:bg-ink rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={false}
              animate={{ width: `${((currentVisibleIndex + 1) / totalVisible) * 100}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-surface dark:bg-[#14130F] rounded-xl border border-border dark:border-border-strong overflow-hidden">
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t border-border-faint dark:border-border-strong bg-surface-muted dark:bg-[#14130F] flex items-center justify-between">
          {/* Cancel Button */}
          <Button
            type="button"
            variant="ghost"
            hideArrow
            size="sm"
            onClick={handleCancel}
            className="text-fg-muted dark:text-fg-subtle"
          >
            {t('inmobiliaria.consignaciones.wizard.cancel')}
          </Button>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-3">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                hideArrow
                onClick={goToPreviousStep}
              >
                <CaretLeft className="w-4 h-4" />
                {t('inmobiliaria.consignaciones.wizard.previous')}
              </Button>
            )}

            {currentStep < 6 ? (
              <Button
                type="button"
                hideArrow
                onClick={goToNextStep}
                disabled={!isStepValid || isPersistingOwner}
                isLoading={isPersistingOwner}
              >
                {t('inmobiliaria.consignaciones.wizard.next')}
                <CaretRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="button"
                hideArrow
                onClick={handleSubmit}
                disabled={!isStepValid || isSubmitting}
                isLoading={isSubmitting}
              >
                {isSubmitting ? (
                  isUploadingPhotos
                    ? t('inmobiliaria.consignaciones.wizard.uploadingPhotos')
                    : t('inmobiliaria.consignaciones.wizard.creating')
                ) : (
                  <>
                    <Check className="w-4 h-4" weight="bold" />
                    {t('inmobiliaria.consignaciones.wizard.confirmConsignment')}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AnimatePresence>
        {showCancelDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowCancelDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md p-6 rounded-xl bg-surface dark:bg-[#14130F] border border-border dark:border-border-strong"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-warning-soft flex items-center justify-center">
                  <X className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold text-fg dark:text-white">
                    {t('inmobiliaria.consignaciones.wizard.cancelDialog.title')}
                  </h3>
                  <p className="text-sm text-fg-muted dark:text-fg-subtle">
                    {t('inmobiliaria.consignaciones.wizard.cancelDialog.description')}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  hideArrow
                  size="sm"
                  onClick={() => setShowCancelDialog(false)}
                >
                  {t('inmobiliaria.consignaciones.wizard.cancelDialog.continueEditing')}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  hideArrow
                  size="sm"
                  onClick={confirmCancel}
                >
                  {t('inmobiliaria.consignaciones.wizard.cancelDialog.yesCancel')}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ConsignacionWizard;
