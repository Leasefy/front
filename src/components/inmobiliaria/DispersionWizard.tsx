'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  CurrencyCircleDollar,
  Percent,
  Calculator,
  CheckCircle,
  PaperPlaneTilt,
  CaretLeft,
  CaretRight,
  Check,
  X,
  SpinnerGap,
  Warning,
  Buildings,
  User,
  ArrowRight,
  Lightning,
  CheckSquare,
  Square,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Dispersion, Cobro, DispersionItem, DispersionStatus } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import {
  MOCK_COBROS,
  MOCK_PROPIETARIOS,
  MOCK_CONSIGNACIONES,
  MOCK_DISPERSIONES,
} from '@/lib/data/mock-inmobiliaria';
import { ComisionDesglose } from './ComisionDesglose';

interface DispersionWizardProps {
  initialMonth?: string;
  onComplete?: (dispersiones: Dispersion[]) => void;
  onCancel?: () => void;
}

interface WizardState {
  month: string;
  cobrosRecibidos: Cobro[];
  dispersionDrafts: DispersionDraft[];
  selectedForApproval: string[];
  generatedDispersiones: Dispersion[];
}

interface DispersionDraft {
  propietarioId: string;
  propietarioName: string;
  items: {
    cobroId: string;
    propertyTitle: string;
    rentCollected: number;
    commissionPercent: number;
    commissionAmount: number;
    netAmount: number;
  }[];
  totalCollected: number;
  totalCommission: number;
  netToPropietario: number;
}

const STEPS = [
  { id: 1, label: 'Mes', icon: Calendar },
  { id: 2, label: 'Cobros', icon: CurrencyCircleDollar },
  { id: 3, label: 'Comisiones', icon: Percent },
  { id: 4, label: 'Netos', icon: Calculator },
  { id: 5, label: 'Aprobar', icon: CheckCircle },
  { id: 6, label: 'Confirmar', icon: PaperPlaneTilt },
];

/**
 * Get current month in YYYY-MM format
 */
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get last N months including current month
 */
function getRecentMonths(count: number): { value: string; label: string }[] {
  const months: { value: string; label: string }[] = [];
  const today = new Date();

  for (let i = 0; i < count; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('es-CO', {
      month: 'long',
      year: 'numeric',
    });
    months.push({ value, label });
  }

  return months;
}

/**
 * Format month for display
 */
function formatMonth(month: string): string {
  return new Date(month + '-01').toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Group cobros by propietario and calculate commissions
 */
function calculateDispersionDrafts(cobros: Cobro[]): DispersionDraft[] {
  // Group paid cobros by propietario
  const grouped = cobros
    .filter((c) => c.status === 'paid')
    .reduce((acc, cobro) => {
      const key = cobro.propietarioId;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(cobro);
      return acc;
    }, {} as Record<string, Cobro[]>);

  // Calculate drafts
  return Object.entries(grouped).map(([propietarioId, propCobros]) => {
    const propietario = MOCK_PROPIETARIOS.find((p) => p.id === propietarioId);

    const items = propCobros.map((cobro) => {
      const consignacion = MOCK_CONSIGNACIONES.find((c) => c.id === cobro.consignacionId);
      const commissionPercent = consignacion?.commissionPercent || 10;
      const commissionAmount = Math.round(cobro.paidAmount * (commissionPercent / 100));
      const netAmount = cobro.paidAmount - commissionAmount;

      return {
        cobroId: cobro.id,
        propertyTitle: cobro.propertyTitle,
        rentCollected: cobro.paidAmount,
        commissionPercent,
        commissionAmount,
        netAmount,
      };
    });

    const totalCollected = items.reduce((sum, i) => sum + i.rentCollected, 0);
    const totalCommission = items.reduce((sum, i) => sum + i.commissionAmount, 0);
    const netToPropietario = items.reduce((sum, i) => sum + i.netAmount, 0);

    return {
      propietarioId,
      propietarioName: propietario?.name || 'Propietario desconocido',
      items,
      totalCollected,
      totalCommission,
      netToPropietario,
    };
  });
}

/**
 * DispersionWizard - 6-step wizard for generating monthly dispersions
 */
export function DispersionWizard({
  initialMonth,
  onComplete,
  onCancel,
}: DispersionWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const recentMonths = useMemo(() => getRecentMonths(12), []);

  // Wizard state
  const [state, setState] = useState<WizardState>(() => {
    const month = initialMonth || getCurrentMonth();
    const cobrosRecibidos = MOCK_COBROS.filter(
      (c) => c.month === month && c.status === 'paid'
    );
    const dispersionDrafts = calculateDispersionDrafts(cobrosRecibidos);

    return {
      month,
      cobrosRecibidos,
      dispersionDrafts,
      selectedForApproval: [],
      generatedDispersiones: [],
    };
  });

  // Check if dispersiones already exist for the month
  const existingDispersiones = useMemo(() => {
    return MOCK_DISPERSIONES.filter((d) => d.month === state.month);
  }, [state.month]);

  const hasExistingDispersiones = existingDispersiones.length > 0;

  // Update cobros when month changes
  const handleMonthChange = useCallback((month: string) => {
    const cobrosRecibidos = MOCK_COBROS.filter(
      (c) => c.month === month && c.status === 'paid'
    );
    const dispersionDrafts = calculateDispersionDrafts(cobrosRecibidos);

    setState((prev) => ({
      ...prev,
      month,
      cobrosRecibidos,
      dispersionDrafts,
      selectedForApproval: [],
      generatedDispersiones: [],
    }));
  }, []);

  // Step validation
  const isStepValid = useMemo(() => {
    switch (currentStep) {
      case 1:
        return Boolean(state.month);
      case 2:
        return state.cobrosRecibidos.length > 0;
      case 3:
        return state.dispersionDrafts.length > 0;
      case 4:
        return state.dispersionDrafts.length > 0;
      case 5:
        return state.selectedForApproval.length > 0;
      case 6:
        return state.generatedDispersiones.length > 0;
      default:
        return false;
    }
  }, [currentStep, state]);

  // Generate dispersiones from drafts
  const generateDispersiones = useCallback(() => {
    const newDispersiones: Dispersion[] = state.dispersionDrafts.map((draft, index) => {
      const propietario = MOCK_PROPIETARIOS.find((p) => p.id === draft.propietarioId);

      return {
        id: `disp-gen-${state.month}-${index + 1}`,
        propietarioId: draft.propietarioId,
        propietarioName: draft.propietarioName,
        propietarioBankAccount: propietario?.bankAccount || {
          bank: 'bancolombia',
          accountType: 'savings',
          accountNumber: '****0000',
          accountHolder: draft.propietarioName,
        },
        month: state.month,
        items: draft.items.map((item) => ({
          cobroId: item.cobroId,
          propertyTitle: item.propertyTitle,
          rentCollected: item.rentCollected,
          commissionPercent: item.commissionPercent,
          commissionAmount: item.commissionAmount,
          netAmount: item.netAmount,
        })),
        totalCollected: draft.totalCollected,
        totalCommission: draft.totalCommission,
        netToPropietario: draft.netToPropietario,
        status: 'pending' as DispersionStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    setState((prev) => ({
      ...prev,
      generatedDispersiones: newDispersiones,
      selectedForApproval: newDispersiones.map((d) => d.id),
    }));

    setCurrentStep(5);
  }, [state.dispersionDrafts, state.month]);

  // Toggle selection for approval
  const toggleSelection = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      selectedForApproval: prev.selectedForApproval.includes(id)
        ? prev.selectedForApproval.filter((s) => s !== id)
        : [...prev.selectedForApproval, id],
    }));
  }, []);

  // Select all
  const selectAll = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedForApproval: prev.generatedDispersiones.map((d) => d.id),
    }));
  }, []);

  // Deselect all
  const deselectAll = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedForApproval: [],
    }));
  }, []);

  // Approve selected dispersiones
  const approveSelected = useCallback(() => {
    setState((prev) => ({
      ...prev,
      generatedDispersiones: prev.generatedDispersiones.map((d) =>
        prev.selectedForApproval.includes(d.id)
          ? {
              ...d,
              status: 'processing' as DispersionStatus,
              approvedAt: new Date().toISOString(),
              approvedBy: 'agent-007',
            }
          : d
      ),
    }));

    setCurrentStep(6);
  }, []);

  // Navigation handlers
  const goToNextStep = useCallback(() => {
    if (currentStep === 4 && isStepValid) {
      generateDispersiones();
    } else if (currentStep === 5 && isStepValid) {
      approveSelected();
    } else if (currentStep < 6 && isStepValid) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, isStepValid, generateDispersiones, approveSelected]);

  const goToPreviousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= currentStep) {
      setCurrentStep(step);
    }
  }, [currentStep]);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mark as completed
      const completedDispersiones = state.generatedDispersiones.map((d) =>
        state.selectedForApproval.includes(d.id)
          ? {
              ...d,
              status: 'completed' as DispersionStatus,
              processedAt: new Date().toISOString(),
              transferReference: `TRF-${state.month.replace('-', '')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
            }
          : d
      );

      toast.success('Dispersiones generadas correctamente', {
        description: `Se generaron ${completedDispersiones.length} dispersiones para ${formatMonth(state.month)}`,
      });

      onComplete?.(completedDispersiones);
    } catch {
      toast.error('Error al generar dispersiones');
    } finally {
      setIsSubmitting(false);
    }
  }, [state.generatedDispersiones, state.selectedForApproval, state.month, onComplete]);

  // Cancel handler
  const handleCancel = useCallback(() => {
    setShowCancelDialog(true);
  }, []);

  const confirmCancel = useCallback(() => {
    onCancel?.();
  }, [onCancel]);

  // Step status helper
  const getStepStatus = (stepId: number) => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'current';
    return 'upcoming';
  };

  // Calculate totals
  const totals = useMemo(() => {
    return state.dispersionDrafts.reduce(
      (acc, d) => ({
        totalCollected: acc.totalCollected + d.totalCollected,
        totalCommission: acc.totalCommission + d.totalCommission,
        totalNet: acc.totalNet + d.netToPropietario,
      }),
      { totalCollected: 0, totalCommission: 0, totalNet: 0 }
    );
  }, [state.dispersionDrafts]);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Seleccionar Mes
              </h3>
              <p className="text-sm text-muted-foreground">
                Elige el mes para generar las dispersiones a propietarios
              </p>
            </div>

            {/* Month Grid */}
            <div className="grid grid-cols-3 gap-3">
              {recentMonths.map((month) => {
                const isSelected = state.month === month.value;
                const hasExisting = MOCK_DISPERSIONES.some(
                  (d) => d.month === month.value
                );

                return (
                  <button
                    key={month.value}
                    onClick={() => handleMonthChange(month.value)}
                    className={cn(
                      'p-4 rounded-xl border-2 text-left transition-all relative',
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-border bg-card hover:border-indigo-300'
                    )}
                  >
                    <p
                      className={cn(
                        'font-medium capitalize',
                        isSelected
                          ? 'text-indigo-700 dark:text-indigo-300'
                          : 'text-foreground'
                      )}
                    >
                      {month.label}
                    </p>
                    {hasExisting && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Warning if dispersiones exist */}
            {hasExistingDispersiones && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
              >
                <div className="flex items-start gap-3">
                  <Warning
                    className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
                    weight="fill"
                  />
                  <div>
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                      Ya existen dispersiones para este mes
                    </p>
                    <p className="text-sm text-amber-600 dark:text-amber-300 mt-1">
                      Se encontraron {existingDispersiones.length} dispersiones creadas.
                      Puedes continuar para regenerarlas si es necesario.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Cobros Recibidos
              </h3>
              <p className="text-sm text-muted-foreground">
                Cobros pagados en {formatMonth(state.month)} que se incluiran en las
                dispersiones
              </p>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">
                  Total Cobros
                </p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  {state.cobrosRecibidos.length}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20">
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-1">
                  Total Recaudado
                </p>
                <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                  {formatCurrency(totals.totalCollected)}
                </p>
              </div>
            </div>

            {/* Grouped by Propietario */}
            <div className="space-y-4">
              {state.dispersionDrafts.map((draft) => (
                <div
                  key={draft.propietarioId}
                  className="p-4 rounded-xl border border-border bg-card"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {draft.propietarioName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {draft.items.length} propiedad
                        {draft.items.length > 1 ? 'es' : ''}
                      </p>
                    </div>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(draft.totalCollected)}
                    </p>
                  </div>
                  {/* Property list */}
                  <div className="space-y-2 ml-13">
                    {draft.items.map((item) => (
                      <div
                        key={item.cobroId}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Buildings className="w-4 h-4" />
                          {item.propertyTitle}
                        </span>
                        <span className="font-medium text-foreground">
                          {formatCurrency(item.rentCollected)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Empty state */}
            {state.cobrosRecibidos.length === 0 && (
              <div className="p-12 text-center rounded-xl border border-dashed border-border">
                <CurrencyCircleDollar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Sin cobros pagados
                </h3>
                <p className="text-muted-foreground">
                  No hay cobros pagados para {formatMonth(state.month)}.
                  Selecciona otro mes o espera a que se registren pagos.
                </p>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Calcular Comisiones
              </h3>
              <p className="text-sm text-muted-foreground">
                Desglose de comisiones por propiedad
              </p>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground mb-1">Recaudado</p>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(totals.totalCollected)}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-center">
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-1">
                  Comisiones
                </p>
                <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(totals.totalCommission)}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-center">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">
                  Neto
                </p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totals.totalNet)}
                </p>
              </div>
            </div>

            {/* Commission breakdown by propietario */}
            <div className="space-y-4">
              {state.dispersionDrafts.map((draft) => (
                <div
                  key={draft.propietarioId}
                  className="rounded-xl border border-border bg-card overflow-hidden"
                >
                  <div className="p-4 border-b border-border bg-muted/30">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-foreground">
                        {draft.propietarioName}
                      </p>
                      <p className="font-bold text-indigo-600 dark:text-indigo-400">
                        -{formatCurrency(draft.totalCommission)}
                      </p>
                    </div>
                  </div>
                  <ComisionDesglose
                    items={draft.items.map((i) => ({
                      cobroId: i.cobroId,
                      propertyTitle: i.propertyTitle,
                      rentCollected: i.rentCollected,
                      commissionPercent: i.commissionPercent,
                      commissionAmount: i.commissionAmount,
                      netAmount: i.netAmount,
                    }))}
                    variant="compact"
                    showPercentages
                  />
                </div>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Generar Netos
              </h3>
              <p className="text-sm text-muted-foreground">
                Resumen de montos netos a dispersar por propietario
              </p>
            </div>

            {/* Total Card */}
            <div className="p-6 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-2">
                Total a Dispersar
              </p>
              <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                {formatCurrency(totals.totalNet)}
              </p>
              <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">
                {state.dispersionDrafts.length} propietario
                {state.dispersionDrafts.length > 1 ? 's' : ''}
              </p>
            </div>

            {/* Propietario Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {state.dispersionDrafts.map((draft) => (
                <motion.div
                  key={draft.propietarioId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 rounded-xl border border-border bg-card"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <User className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {draft.propietarioName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {draft.items.length} propiedad
                        {draft.items.length > 1 ? 'es' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Recaudado</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(draft.totalCollected)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Comision</span>
                      <span className="font-medium text-indigo-600 dark:text-indigo-400">
                        -{formatCurrency(draft.totalCommission)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-border flex items-center justify-between">
                      <span className="font-medium text-foreground">Neto</span>
                      <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(draft.netToPropietario)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Aprobar Dispersiones
              </h3>
              <p className="text-sm text-muted-foreground">
                Selecciona las dispersiones a aprobar para procesamiento
              </p>
            </div>

            {/* Select All Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    state.selectedForApproval.length ===
                    state.generatedDispersiones.length
                      ? deselectAll()
                      : selectAll()
                  }
                  className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  {state.selectedForApproval.length ===
                  state.generatedDispersiones.length ? (
                    <CheckSquare
                      className="w-5 h-5 text-indigo-600 dark:text-indigo-400"
                      weight="fill"
                    />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                  Seleccionar todas
                </button>
              </div>
              <span className="text-sm text-muted-foreground">
                {state.selectedForApproval.length} de{' '}
                {state.generatedDispersiones.length} seleccionadas
              </span>
            </div>

            {/* Dispersion List */}
            <div className="space-y-3">
              {state.generatedDispersiones.map((dispersion) => {
                const isSelected = state.selectedForApproval.includes(
                  dispersion.id
                );

                return (
                  <motion.button
                    key={dispersion.id}
                    onClick={() => toggleSelection(dispersion.id)}
                    className={cn(
                      'w-full p-4 rounded-xl border-2 text-left transition-all',
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-border bg-card hover:border-indigo-300'
                    )}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex items-center gap-4">
                      {isSelected ? (
                        <CheckSquare
                          className="w-6 h-6 text-indigo-600 dark:text-indigo-400"
                          weight="fill"
                        />
                      ) : (
                        <Square className="w-6 h-6 text-muted-foreground" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {dispersion.propietarioName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {dispersion.items.length} propiedad
                          {dispersion.items.length > 1 ? 'es' : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(dispersion.netToPropietario)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {dispersion.propietarioBankAccount.accountNumber}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle
                  className="w-10 h-10 text-emerald-600 dark:text-emerald-400"
                  weight="fill"
                />
              </motion.div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Dispersiones Listas
              </h3>
              <p className="text-muted-foreground">
                Se generaron {state.selectedForApproval.length} dispersiones
                para {formatMonth(state.month)}
              </p>
            </div>

            {/* Summary Card */}
            <div className="p-6 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-1">
                    Dispersiones
                  </p>
                  <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                    {state.selectedForApproval.length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-1">
                    Total a Dispersar
                  </p>
                  <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(
                      state.generatedDispersiones
                        .filter((d) => state.selectedForApproval.includes(d.id))
                        .reduce((sum, d) => sum + d.netToPropietario, 0)
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border">
                <Lightning className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <p className="text-sm text-foreground">
                  Al confirmar, las dispersiones quedaran listas para procesamiento
                </p>
              </div>
            </div>
          </div>
        );

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
          {STEPS.map((step, index) => {
            const status = getStepStatus(step.id);
            const StepIcon = step.icon;

            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => status !== 'upcoming' && goToStep(step.id)}
                  disabled={status === 'upcoming'}
                  className={cn(
                    'flex flex-col items-center gap-2 transition-all',
                    status === 'upcoming' ? 'cursor-not-allowed' : 'cursor-pointer'
                  )}
                >
                  <div
                    className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center transition-all',
                      status === 'completed'
                        ? 'bg-emerald-500 text-white'
                        : status === 'current'
                          ? 'bg-indigo-500 text-white ring-4 ring-indigo-500/20'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
                    )}
                  >
                    {status === 'completed' ? (
                      <Check className="w-5 h-5" weight="bold" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-xs font-medium',
                      status === 'current'
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : status === 'completed'
                          ? 'text-neutral-900 dark:text-white'
                          : 'text-neutral-400'
                    )}
                  >
                    {step.label}
                  </span>
                </button>

                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 mx-2',
                      step.id < currentStep
                        ? 'bg-emerald-500'
                        : 'bg-neutral-200 dark:bg-neutral-700'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile Progress */}
        <div className="md:hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-neutral-900 dark:text-white">
              Paso {currentStep} de 6: {STEPS[currentStep - 1]?.label}
            </span>
            <span className="text-sm text-neutral-500">
              {Math.round((currentStep / 6) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-indigo-500"
              initial={false}
              animate={{ width: `${(currentStep / 6) * 100}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white dark:bg-[#1a1a1c] rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
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
        <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-[#141416] flex items-center justify-between">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 rounded-xl text-neutral-600 dark:text-neutral-400 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-3">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={goToPreviousStep}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <CaretLeft className="w-4 h-4" />
                Anterior
              </button>
            )}

            {currentStep < 6 ? (
              <button
                type="button"
                onClick={goToNextStep}
                disabled={!isStepValid}
                className={cn(
                  'inline-flex items-center gap-2 px-5 py-2 rounded-xl font-medium transition-all',
                  isStepValid
                    ? currentStep === 4
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/25'
                      : currentStep === 5
                        ? 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-lg shadow-indigo-500/25'
                        : 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-lg shadow-indigo-500/25'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                )}
              >
                {currentStep === 4 ? (
                  <>
                    Generar Dispersiones
                    <Lightning className="w-4 h-4" />
                  </>
                ) : currentStep === 5 ? (
                  <>
                    Aprobar Seleccionadas
                    <CheckCircle className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Siguiente
                    <CaretRight className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isStepValid || isSubmitting}
                className={cn(
                  'inline-flex items-center gap-2 px-6 py-2 rounded-xl font-medium transition-all',
                  isStepValid && !isSubmitting
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/25'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                )}
              >
                {isSubmitting ? (
                  <>
                    <SpinnerGap className="w-4 h-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" weight="bold" />
                    Confirmar Dispersiones
                  </>
                )}
              </button>
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
              className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-[#1a1a1c] border border-neutral-200 dark:border-neutral-700 shadow-xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <X className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white">
                    Cancelar generacion?
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Se perdera el progreso actual
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowCancelDialog(false)}
                  className="px-4 py-2 rounded-xl text-neutral-600 dark:text-neutral-400 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  Continuar editando
                </button>
                <button
                  onClick={confirmCancel}
                  className="px-4 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
                >
                  Si, cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DispersionWizard;
