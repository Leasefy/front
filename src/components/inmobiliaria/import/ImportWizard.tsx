'use client';

import { useState, useCallback, useMemo, useEffect, useRef, createContext } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileArrowUp,
  UploadSimple,
  ArrowsLeftRight,
  MagicWand,
  CheckCircle,
  CaretLeft,
  CaretRight,
  Check,
  X,
  LinkSimple,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { StepChooseMethod } from './steps/StepChooseMethod';
import { StepUploadFile } from './steps/StepUploadFile';
import { StepColumnMapping } from './steps/StepColumnMapping';
import { StepAIReview } from './steps/StepAIReview';
import { StepConfirmImport } from './steps/StepConfirmImport';
import { StepSoftwareMigration } from './steps/StepSoftwareMigration';
import { StepPortalImport } from './steps/StepPortalImport';
import { StepPasteLinks } from './steps/StepPasteLinks';
import { TARGET_FIELDS } from './lib/importTypes';
import type { ImportWizardState } from './lib/importTypes';

const STEPS = [
  { id: 1, labelKey: 'inmobiliaria.import.steps.method', icon: FileArrowUp },
  { id: 2, labelKey: 'inmobiliaria.import.steps.upload', icon: UploadSimple },
  { id: 3, labelKey: 'inmobiliaria.import.steps.mapping', icon: ArrowsLeftRight },
  { id: 4, labelKey: 'inmobiliaria.import.steps.review', icon: MagicWand },
  { id: 5, labelKey: 'inmobiliaria.import.steps.confirm', icon: CheckCircle },
];


const INITIAL_STATE: ImportWizardState = {
  method: null,
  file: null,
  fileName: '',
  enlacesPegados: '',
  rawRows: [],
  headers: [],
  sheetNames: [],
  selectedSheet: '',
  columnMappings: [],
  properties: [],
  aiAnalyzed: false,
  importProgress: 0,
  importedCount: 0,
};

export interface ImportStepProps {
  state: ImportWizardState;
  updateState: (partial: Partial<ImportWizardState>) => void;
  /** Adentro del muro de migración: qué hacer en vez de navegar al portafolio. */
  onSalir?: () => void;
}

/**
 * Dónde va la acción principal del último paso: al pie, a la derecha de
 * «Anterior», que es donde estuvo el botón primario en todos los pasos
 * anteriores. `null` mientras el pie no está montado — el paso entonces
 * dibuja su botón donde caiga, para no quedarse sin acción.
 */
export const RanuraDelPie = createContext<HTMLElement | null>(null);

/**
 * `onSalir`: adentro del muro de migración no hay portafolio al que volver —
 * el muro tapa todo hasta que la migración termine. El muro pasa un callback
 * que reinicia el asistente; sin él (la ruta suelta) se navega como siempre.
 */
export function ImportWizard({ onSalir }: { onSalir?: () => void } = {}) {
  const router = useRouter();
  const { t } = useI18n();
  const [currentStep, setCurrentStep] = useState(1);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [ranuraDelPie, setRanuraDelPie] = useState<HTMLDivElement | null>(null);
  const [wizardState, setWizardState] = useState<ImportWizardState>(INITIAL_STATE);

  const updateState = useCallback((partial: Partial<ImportWizardState>) => {
    setWizardState((prev) => ({ ...prev, ...partial }));
  }, []);

  // Cambiar de método vuelve al paso 1 — salvo cuando el cambio ES el atajo.
  //
  // Los dos pasos guiados —«Desde software» y «Desde portales»— terminan en
  // «ya tengo el archivo», que pone method='excel'. Eso no es cambiar de idea
  // sobre el método: es decir «saltemos las instrucciones». Mandarlo al paso 1
  // lo devuelve al principio, que es justo lo que esos botones prometen evitar.
  const prevMethodRef = useRef(wizardState.method);
  useEffect(() => {
    if (prevMethodRef.current !== wizardState.method && wizardState.method !== null) {
      const veniaDeUnaGuia =
        prevMethodRef.current === 'software' || prevMethodRef.current === 'portal';
      // Los dos destinos posibles de un atajo tienen pantalla propia en el
      // paso 2: subir el archivo, o pegar los enlaces. Antes sólo contemplaba
      // `excel`, así que «pegar enlaces» desde la guía de portales devolvía al
      // paso 1 — justo lo que el botón promete evitar.
      const elAtajoTienePantalla =
        wizardState.method === 'excel' || wizardState.method === 'enlaces';
      prevMethodRef.current = wizardState.method;
      setCurrentStep(veniaDeUnaGuia && elAtajoTienePantalla ? 2 : 1);
    }
  }, [wizardState.method]);

  // Visible steps based on method
  //
  // ⚠️ `currentStep` es la POSICIÓN dentro de esta lista, no el id del paso.
  // Mientras los métodos usaban 1-2-3-4-5 o 1-2 las dos cosas coincidían y no
  // se notaba; «Desde enlaces» usa los pasos 1-2-4-5 (no hay columnas que
  // mapear) y ahí la posición 3 es el paso 4. Todo lo que decide QUÉ se dibuja
  // pasa por `pasoActual`; lo que decide DÓNDE estamos usa la posición.
  const visibleSteps = useMemo(() => {
    if (wizardState.method === 'portal') return STEPS.slice(0, 2);
    if (wizardState.method === 'enlaces') {
      return [
        STEPS[0],
        { ...STEPS[1], labelKey: 'inmobiliaria.import.steps.enlaces', icon: LinkSimple },
        STEPS[3],
        STEPS[4],
      ];
    }
    return STEPS;
  }, [wizardState.method]);

  const pasoActual = visibleSteps[currentStep - 1]?.id ?? 1;

  // Step validation
  const isStepValid = useMemo(() => {
    switch (pasoActual) {
      case 1:
        return wizardState.method !== null;
      case 2:
        // Software and portal steps are always "valid" for navigation purposes
        if (wizardState.method === 'software') return true;
        if (wizardState.method === 'portal') return true;
        // Los enlaces no dejan filas: lo que habilita seguir es que al menos
        // un enlace se haya podido leer.
        if (wizardState.method === 'enlaces') return wizardState.properties.length > 0;
        return wizardState.rawRows.length > 0;
      case 3: {
        // All required TARGET_FIELDS must be mapped.
        //
        // T-0038 §3.8/C13 — `monthlyRent` stays `required: true` in
        // TARGET_FIELDS (the overwhelming common case is a rent-only file,
        // and catching a forgotten "Canon" column here beats catching it
        // per-row at the final submit). But a SALE-only file has no canon
        // column at all — its price is `salePrice`. Treating the two as
        // alternatives (at least one mapped) is what makes a sale-only
        // import possible; every other required field stays mandatory.
        const mappings = wizardState.columnMappings;
        const isMapped = (key: string) => mappings.some((m) => m.targetField === key);
        const requiredKeys = TARGET_FIELDS.filter((f) => f.required).map((f) => f.key);
        const priceAlternativeOk = isMapped('monthlyRent') || isMapped('salePrice');
        return (
          priceAlternativeOk &&
          requiredKeys.filter((key) => key !== 'monthlyRent').every(isMapped)
        );
      }
      case 4:
        // Valid when analysis is done and at least 1 property is selected
        return wizardState.aiAnalyzed && wizardState.properties.some((p) => p.selected && !p.hasErrors);
      case 5:
        // Always valid — step manages its own submit
        return true;
      default:
        return false;
    }
  }, [pasoActual, wizardState]);

  // Navigation handlers
  const goToNextStep = useCallback(() => {
    if (currentStep < visibleSteps.length && isStepValid) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, isStepValid, visibleSteps.length]);

  // Salir de la revisión hacia atrás descarta el análisis para que se rehaga
  // con lo que la persona vaya a cambiar. Con «Desde enlaces» NO: ahí las
  // propiedades no salen de filas de un archivo que sigue cargado, salen de
  // haber leído las páginas. Borrarlas obligaría a leer los veinte enlaces de
  // nuevo por haber tocado «Anterior».
  const debeDescartarAnalisis = useCallback(
    (desde: number) => visibleSteps[desde - 1]?.id === 4 && wizardState.method !== 'enlaces',
    [visibleSteps, wizardState.method],
  );

  const goToPreviousStep = useCallback(() => {
    if (currentStep > 1) {
      if (debeDescartarAnalisis(currentStep)) {
        updateState({ aiAnalyzed: false, properties: [] });
      }
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep, debeDescartarAnalisis, updateState]);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= currentStep) {
      if (debeDescartarAnalisis(currentStep) && step < currentStep) {
        updateState({ aiAnalyzed: false, properties: [] });
      }
      setCurrentStep(step);
    }
  }, [currentStep, debeDescartarAnalisis, updateState]);

  const handleCancel = useCallback(() => {
    setShowCancelDialog(true);
  }, []);

  const confirmCancel = useCallback(() => {
    if (onSalir) {
      setShowCancelDialog(false);
      onSalir();
      return;
    }
    router.push('/panel/inmobiliaria/inmuebles');
  }, [router, onSalir]);

  // Step status helper — recibe la POSICIÓN, no el id (ver `visibleSteps`).
  const getStepStatus = (posicion: number) => {
    if (posicion < currentStep) return 'completed';
    if (posicion === currentStep) return 'current';
    return 'upcoming';
  };

  // Render step content
  const renderStepContent = () => {
    const stepProps: ImportStepProps = {
      state: wizardState,
      updateState,
      onSalir,
    };

    switch (pasoActual) {
      case 1:
        return <StepChooseMethod {...stepProps} />;
      case 2:
        if (wizardState.method === 'software') return <StepSoftwareMigration {...stepProps} />;
        if (wizardState.method === 'portal') return <StepPortalImport {...stepProps} />;
        if (wizardState.method === 'enlaces') return <StepPasteLinks {...stepProps} />;
        return <StepUploadFile {...stepProps} />;
      case 3:
        return <StepColumnMapping {...stepProps} />;
      case 4:
        return <StepAIReview {...stepProps} />;
      case 5:
        return <StepConfirmImport {...stepProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Step Indicator */}
      <div className="mb-8">
        {/* Desktop Steps */}
        <div className="hidden md:flex items-center justify-between">
          {visibleSteps.map((step, index) => {
            const posicion = index + 1;
            const status = getStepStatus(posicion);
            const StepIcon = step.icon;

            return (
              <div key={step.id} className="flex items-center flex-1">
                {/* allowlist: clickable wizard step navigator (icon-per-step, label-below,
                    done/active/upcoming) — Cadence Stepper is display-only; kept native */}
                <button
                  onClick={() => status !== 'upcoming' && goToStep(posicion)}
                  disabled={status === 'upcoming'}
                  className={cn(
                    'flex flex-col items-center gap-2 transition-all shrink-0',
                    status === 'upcoming' ? 'cursor-not-allowed' : 'cursor-pointer'
                  )}
                >
                  <div className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center transition-all',
                    status === 'completed'
                      ? 'bg-success text-white'
                      : status === 'current'
                        ? 'bg-primary text-primary-fg ring-4 ring-primary/30'
                        // Sin `dark:bg-ink`: ese override daba rgb(20,19,15) sobre
                        // un fondo de página rgb(17,17,19) — el círculo desaparecía.
                        // `bg-surface-muted` ya es sensible al tema y da
                        // rgb(36,34,28), más separado del fondo que en claro.
                        : 'bg-surface-muted text-fg-subtle'
                  )}>
                    {status === 'completed' ? (
                      <Check className="w-5 h-5" weight="bold" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={cn(
                    'text-xs font-medium whitespace-nowrap',
                    status === 'current'
                      ? 'text-primary'
                      : status === 'completed'
                        ? 'text-fg dark:text-white'
                        : 'text-fg-subtle'
                  )}>
                    {t(step.labelKey)}
                  </span>
                </button>

                {/* Connector Line — es un divisor de 2px, así que necesita más
                    contraste que una superficie grande: va con `bg-border`. */}
                {index < visibleSteps.length - 1 && (
                  <div className={cn(
                    'flex-1 h-0.5 mx-2',
                    posicion < currentStep
                      ? 'bg-success'
                      : 'bg-border'
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
              {t('inmobiliaria.import.wizard.mobileProgress', {
                current: currentStep,
                total: visibleSteps.length,
                label: t(visibleSteps[currentStep - 1]?.labelKey ?? ''),
              })}
            </span>
            <span className="text-sm text-fg-muted">{Math.round((currentStep / visibleSteps.length) * 100)}%</span>
          </div>
          {/* Misma razón que los círculos: el riel se perdía contra el fondo. */}
          <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={false}
              animate={{ width: `${(currentStep / visibleSteps.length) * 100}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-surface dark:bg-[#14130F] rounded-xl border border-border dark:border-border-strong">
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <RanuraDelPie.Provider value={ranuraDelPie}>
                {renderStepContent()}
              </RanuraDelPie.Provider>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Navigation — hidden when import is complete */}
        {!(pasoActual === 5 && wizardState.importedCount > 0) && (
          // El pie tiene fondo propio: sin `rounded-b-xl` pinta por encima de
          // las esquinas del card y las dos de abajo quedan cuadradas.
          <div className="px-6 py-4 rounded-b-xl border-t border-border-faint dark:border-border-strong bg-surface-muted dark:bg-[#14130F] flex items-center justify-between">
            {/* Cancel Button */}
            <Button
              type="button"
              variant="ghost"
              hideArrow
              onClick={handleCancel}
            >
              {t('inmobiliaria.import.wizard.cancel')}
            </Button>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-3">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  hideArrow
                  onClick={goToPreviousStep}
                  className="gap-2"
                >
                  <CaretLeft className="w-4 h-4" />
                  {t('inmobiliaria.import.wizard.previous')}
                </Button>
              )}

              {/* Portal terminal step: show "Volver al portafolio" instead of "Siguiente" */}
              {wizardState.method === 'portal' && pasoActual === 2 ? (
                <Button
                  type="button"
                  variant="outline"
                  hideArrow
                  onClick={confirmCancel}
                >
                  {t('inmobiliaria.import.portal.backToPortfolio')}
                </Button>
              ) : currentStep < visibleSteps.length ? (
                <Button
                  type="button"
                  hideArrow
                  onClick={goToNextStep}
                  disabled={!isStepValid}
                  className="gap-2"
                >
                  {t('inmobiliaria.import.wizard.next')}
                  <CaretRight className="w-4 h-4" />
                </Button>
              ) : (
                // Ranura del último paso. El botón principal vivió al pie,
                // a la derecha de «Anterior», en los cuatro pasos anteriores;
                // en el último se caía adentro de la tarjeta y quedaba raro.
                // El paso pone su acción acá por portal.
                <div ref={setRanuraDelPie} className="flex items-center" />
              )}
            </div>
          </div>
        )}
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
                    {t('inmobiliaria.import.wizard.cancelDialog.title')}
                  </h3>
                  <p className="text-sm text-fg-muted dark:text-fg-subtle">
                    {t('inmobiliaria.import.wizard.cancelDialog.description')}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  hideArrow
                  onClick={() => setShowCancelDialog(false)}
                >
                  {t('inmobiliaria.import.wizard.cancelDialog.continueEditing')}
                </Button>
                <Button
                  variant="destructive"
                  hideArrow
                  onClick={confirmCancel}
                >
                  {t('inmobiliaria.import.wizard.cancelDialog.yesCancel')}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ImportWizard;
