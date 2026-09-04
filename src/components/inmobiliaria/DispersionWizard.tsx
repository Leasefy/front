'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
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
  Warning,
  Buildings,
  User,
  ArrowRight,
  Lightning,
  CheckSquare,
  Square,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { RadioCardGroup, RadioCard } from '@leasefy/cadence';
import { toast } from 'sonner';
import type { Dispersion } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { useDispersiones } from '@/lib/hooks/useInmobiliaria';
import { dispersionesApi } from '@/lib/api/inmobiliaria.service';
import { ComisionDesglose } from './ComisionDesglose';
import { mesEnTitulo } from '@/lib/utils/mes';

interface DispersionWizardProps {
  initialMonth?: string;
  /** `month` es el que se acaba de generar: la lista tiene que abrir ahí. */
  onComplete?: (dispersiones: Dispersion[], month?: string) => void;
  onCancel?: () => void;
}

interface WizardState {
  month: string;
  dispersionDrafts: DispersionDraft[];
  /**
   * A quiénes se les va a generar, por `propietarioId`.
   *
   * Son ids REALES del back, no de objetos fabricados acá: esta lista viaja en
   * el `POST /dispersiones/generate` y decide a quién se le gira. Antes se
   * guardaban ids de dispersiones inventadas en el navegador
   * (`disp-gen-2026-08-1`) y no salían de esta pantalla.
   */
  seleccionados: string[];
}

interface DispersionDraft {
  propietarioId: string;
  propietarioName: string;
  /** Viene de la vista previa. `null` = sin cuenta registrada, y se dice. */
  propietarioBankAccount: string | null;
  /** Lo que el propietario paga: predial, reparaciones a su cargo. */
  totalConceptosACargo: number;
  /** Lo que la inmobiliaria le abona: devoluciones, reajustes. */
  totalConceptosAFavor: number;
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
  // «Aprobar» prometía una aprobación que no ocurría en ninguna parte: el paso
  // elige a quiénes se les genera este mes.
  { id: 5, label: 'A quién', icon: CheckCircle },
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
    const label = date.toLocaleDateString('es-CL', {
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
  return mesEnTitulo(month);
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

  /*
   * Acá se pedían además cobros, propietarios y consignaciones: eran los
   * insumos del cálculo que hacía el navegador. Con la cuenta en el back, tres
   * peticiones que nadie leía — y `usePropietarios` sólo se usaba para sacar
   * una cuenta bancaria que la vista previa ya trae.
   */
  const { dispersiones: allDispersiones } = useDispersiones();

  // Wizard state
  const [state, setState] = useState<WizardState>({
    month: initialMonth || getCurrentMonth(),
    dispersionDrafts: [],
    seleccionados: [],
  });

  /*
   * Los borradores los calcula EL BACK, con la misma función que usa al
   * generar: lo que se ve acá es lo que se va a guardar.
   *
   * Antes se calculaban en el navegador y daban otros números — la comisión
   * sobre lo pagado en vez de sobre el canon, un 10% inventado cuando no
   * encontraba la consignación, sin descontar los conceptos del propietario, y
   * el nombre como «Propietario desconocido».
   */
  const [cargandoPrevia, setCargandoPrevia] = useState(false);
  const [errorPrevia, setErrorPrevia] = useState<string | null>(null);
  /** Cuántas ya existen: sin esto, «no hay nada» tapa «ya se generaron». */
  const [yaGenerados, setYaGenerados] = useState(0);

  useEffect(() => {
    let cancelado = false;
    setCargandoPrevia(true);
    setErrorPrevia(null);

    dispersionesApi
      .preview(state.month)
      .then((previa) => {
        if (cancelado) return;
        setYaGenerados(previa.yaGenerados);
        const borradores = previa.propietarios
          .filter((p) => !p.yaExiste)
          .map((p) => ({
            propietarioId: p.propietarioId,
            propietarioName: p.propietarioName,
            propietarioBankAccount: p.propietarioBankAccount,
            items: p.items,
            totalCollected: p.totalCollected,
            totalCommission: p.totalCommission,
            totalConceptosACargo: p.totalConceptosACargo,
            totalConceptosAFavor: p.totalConceptosAFavor,
            netToPropietario: p.netToPropietario,
          }));
        setState((prev) => ({
          ...prev,
          dispersionDrafts: borradores,
          // Todos marcados por defecto: lo normal es girarle a todo el mundo, y
          // el paso 5 está para sacar a alguien, no para tener que armar la
          // lista desde cero.
          seleccionados: borradores.map((b) => b.propietarioId),
        }));
      })
      .catch(() => {
        if (!cancelado) {
          setErrorPrevia('No pudimos calcular las dispersiones de este mes.');
        }
      })
      .finally(() => {
        if (!cancelado) setCargandoPrevia(false);
      });

    return () => {
      cancelado = true;
    };
  }, [state.month]);

  // Check if dispersiones already exist for the month
  const existingDispersiones = useMemo(() => {
    return allDispersiones.filter((d) => d.month === state.month);
  }, [state.month, allDispersiones]);

  const hasExistingDispersiones = existingDispersiones.length > 0;

  /*
   * Cambiar de mes sólo cambia el mes: el efecto de arriba vuelve a pedirle la
   * cuenta al back. Antes acá se recalculaba todo en el navegador, con una
   * fórmula distinta a la del back.
   */
  const handleMonthChange = useCallback((month: string) => {
    setState((prev) => ({
      ...prev,
      month,
      seleccionados: [],
    }));
  }, []);

  // Step validation
  const isStepValid = useMemo(() => {
    switch (currentStep) {
      case 1:
        return Boolean(state.month);
      case 2:
        return state.dispersionDrafts.length > 0;
      case 3:
        return state.dispersionDrafts.length > 0;
      case 4:
        return state.dispersionDrafts.length > 0;
      case 5:
        return state.seleccionados.length > 0;
      case 6:
        return state.seleccionados.length > 0;
      default:
        return false;
    }
  }, [currentStep, state]);

  /*
   * Lo que se muestra sale de los MISMOS borradores que se van a mandar: el
   * total del paso 6 es la suma de los seleccionados, no una cuenta aparte.
   */
  const totalSeleccionado = useMemo(
    () =>
      state.dispersionDrafts
        .filter((d) => state.seleccionados.includes(d.propietarioId))
        .reduce((suma, d) => suma + d.netToPropietario, 0),
    [state.dispersionDrafts, state.seleccionados],
  );

  const sinSeleccionar =
    state.dispersionDrafts.length - state.seleccionados.length;

  /* Con la lista vacía no están «todos»: sin esto, un mes sin borradores
     mostraría el tilde de «todas seleccionadas» sobre cero filas. */
  const todosSeleccionados =
    state.dispersionDrafts.length > 0 &&
    state.seleccionados.length === state.dispersionDrafts.length;

  /*
   * Acá vivían dos pasos de teatro.
   *
   * `generateDispersiones` fabricaba objetos `Dispersion` en el navegador —con
   * ids inventados (`disp-gen-2026-08-1`) y los conceptos en cero— para que el
   * paso 5 tuviera algo que listar. No guardaba nada.
   *
   * `approveSelected` les ponía `status: 'processing'`, `approvedAt` de ahora y
   * `approvedBy: 'agent-007'`, un usuario que no existe. Tampoco aprobaba nada
   * en ninguna parte.
   *
   * Lo que se lista en el paso 5 son los borradores que ya mandó el back, con
   * sus ids de verdad, y lo único que hace el paso es elegir cuáles entran.
   */

  const alternarSeleccion = useCallback((propietarioId: string) => {
    setState((prev) => ({
      ...prev,
      seleccionados: prev.seleccionados.includes(propietarioId)
        ? prev.seleccionados.filter((s) => s !== propietarioId)
        : [...prev.seleccionados, propietarioId],
    }));
  }, []);

  const seleccionarTodos = useCallback(() => {
    setState((prev) => ({
      ...prev,
      seleccionados: prev.dispersionDrafts.map((d) => d.propietarioId),
    }));
  }, []);

  const deseleccionarTodos = useCallback(() => {
    setState((prev) => ({ ...prev, seleccionados: [] }));
  }, []);

  // Navigation handlers
  const goToNextStep = useCallback(() => {
    if (currentStep < 6 && isStepValid) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, isStepValid]);

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
      /*
       * El back genera y calcula. Antes acá se armaba el payload con los
       * totales YA calculados en el navegador y se posteaba a `POST
       * /dispersiones` — una ruta que no existe, así que nunca guardó nada.
       *
       * Y de haber existido habría sido peor: los montos del cliente no
       * descuentan lo que paga el propietario ni sacan la administración de la
       * copropiedad. La cuenta vive en el back, en un solo lugar.
       */
      const resultado = await dispersionesApi.generate(
        state.month,
        state.seleccionados,
      );

      if (resultado.created === 0) {
        toast.info('No se generó ninguna dispersión', {
          description:
            resultado.skipped > 0
              ? `Ya existían las ${resultado.skipped} dispersiones de ${formatMonth(state.month)}.`
              : `No hay cobros pagados en ${formatMonth(state.month)}.`,
        });
      } else {
        toast.success('Dispersiones generadas correctamente', {
          description:
            // Los que quedaron fuera se dicen: sin esto, «se generaron 3» se
            // lee igual en un mes de 3 propietarios que en uno de 40 donde
            // alguien destildó 37 sin darse cuenta.
            resultado.noElegidos > 0
              ? `${resultado.created} para ${formatMonth(state.month)}. ${resultado.noElegidos} quedaron fuera de la selección.`
              : `Se generaron ${resultado.created} dispersiones para ${formatMonth(state.month)}`,
        });
      }

      onComplete?.([], state.month);
    } catch {
      toast.error('Error al generar dispersiones');
    } finally {
      setIsSubmitting(false);
    }
    // El back hace la cuenta; de acá sólo viajan el mes y a quiénes.
  }, [state.month, state.seleccionados, onComplete]);

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
            <RadioCardGroup
              className="grid grid-cols-3 gap-3"
              value={state.month}
              onValueChange={handleMonthChange}
            >
              {recentMonths.map((month) => {
                const hasExisting = allDispersiones.some(
                  (d) => d.month === month.value
                );

                return (
                  <RadioCard
                    key={month.value}
                    value={month.value}
                    label={<span className="font-medium">{month.label}</span>}
                    badge={hasExisting ? <span className="w-2 h-2 rounded-full bg-foreground" /> : undefined}
                  />
                );
              })}
            </RadioCardGroup>

            {/* Warning if dispersiones exist */}
            {hasExistingDispersiones && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-lg bg-warning-soft border border-warning/30 dark:border-warning/40"
              >
                <div className="flex items-start gap-3">
                  <Warning
                    className="w-5 h-5 text-warning flex-shrink-0 mt-0.5"
                    weight="fill"
                  />
                  <div>
                    <p className="text-sm font-medium text-warning">
                      Ya existen dispersiones para este mes
                    </p>
                    <p className="text-sm text-warning mt-1">
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

            {/* Summary Stats */}
            <div className="flex items-center gap-8 pb-4 border-b border-border">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Inmuebles</p>
                <p className="text-xl font-semibold text-foreground tabular-nums">
                  {state.dispersionDrafts.reduce((n, d) => n + d.items.length, 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Recaudado</p>
                <p className="text-xl font-semibold text-foreground tabular-nums">
                  {formatCurrency(totals.totalCollected)}
                </p>
              </div>
            </div>

            {/* Grouped by Propietario */}
            <div className="space-y-4">
              {state.dispersionDrafts.map((draft) => (
                <div
                  key={draft.propietarioId}
                  className="p-4 rounded-lg border border-border bg-card"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
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
                    <p className="font-semibold text-foreground tabular-nums">
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
            {/* Tres estados, no uno: cargando, error y vacío dicen cosas
                distintas, y el vacío tiene DOS causas — o nadie pagó, o ya se
                generaron todas. Meterlas en el mismo cartel manda a buscar el
                problema donde no está. */}
            {cargandoPrevia ? (
              <div className="p-12 text-center rounded-lg border border-dashed border-border">
                <p className="text-muted-foreground">Calculando…</p>
              </div>
            ) : errorPrevia ? (
              <div className="p-12 text-center rounded-lg border border-dashed border-destructive/40">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No pudimos calcular este mes
                </h3>
                <p className="text-muted-foreground">{errorPrevia}</p>
              </div>
            ) : state.dispersionDrafts.length === 0 ? (
              <div className="p-12 text-center rounded-lg border border-dashed border-border">
                <CurrencyCircleDollar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {yaGenerados > 0
                    ? 'Ya están generadas'
                    : 'Sin cobros pagados'}
                </h3>
                <p className="text-muted-foreground">
                  {yaGenerados > 0
                    ? `Las ${yaGenerados} dispersiones de ${formatMonth(state.month)} ya existen. Buscalas en la lista.`
                    : `No hay cobros pagados en ${formatMonth(state.month)}. Elegí otro mes o esperá a que se registren pagos.`}
                </p>
              </div>
            ) : null}
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

            {/* Summary Stats */}
            <div className="flex items-center gap-8 pb-4 border-b border-border">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Recaudado</p>
                <p className="text-xl font-semibold text-foreground tabular-nums">
                  {formatCurrency(totals.totalCollected)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Comisiones</p>
                <p className="text-xl font-semibold text-foreground tabular-nums">
                  {formatCurrency(totals.totalCommission)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Neto</p>
                <p className="text-xl font-semibold text-foreground tabular-nums">
                  {formatCurrency(totals.totalNet)}
                </p>
              </div>
            </div>

            {/* Commission breakdown by propietario */}
            <div className="space-y-3">
              {state.dispersionDrafts.map((draft) => (
                <div
                  key={draft.propietarioId}
                  className="rounded-lg border border-border bg-card overflow-hidden"
                >
                  {/* Propietario Header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/20">
                    <p className="font-medium text-foreground">
                      {draft.propietarioName}
                    </p>
                    <p className="font-semibold text-foreground tabular-nums">
                      -{formatCurrency(draft.totalCommission)}
                    </p>
                  </div>
                  {/* Expandable Detail */}
                  <ComisionDesglose
                    items={draft.items.map((i) => ({
                      cobroId: i.cobroId,
                      propertyTitle: i.propertyTitle,
                      rentCollected: i.rentCollected,
                      commissionPercent: i.commissionPercent,
                      commissionAmount: i.commissionAmount,
                      netAmount: i.netAmount,
                      conceptosAFavor: 0,
                      conceptosACargo: 0,
                      deTerceros: 0,
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
            <div className="p-6 rounded-lg bg-muted/30 border border-border">
              <p className="text-sm text-muted-foreground mb-2">
                Total a Dispersar
              </p>
              <p className="text-3xl font-bold text-foreground tabular-nums">
                {formatCurrency(totals.totalNet)}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
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
                  className="p-5 rounded-lg border border-border bg-card"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary-soft flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
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
                      <span className="font-medium text-primary">
                        -{formatCurrency(draft.totalCommission)}
                      </span>
                    </div>
                    {/* Sin estos renglones la tarjeta se contradice:
                        1.000.000 − 100.000 no da 0. Un total que no cuadra con
                        sus partes no se puede defender delante del dueño. */}
                    {draft.totalConceptosAFavor > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Conceptos a su favor
                        </span>
                        <span className="font-medium text-foreground">
                          {formatCurrency(draft.totalConceptosAFavor)}
                        </span>
                      </div>
                    )}
                    {draft.totalConceptosACargo > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Conceptos a su cargo
                        </span>
                        <span className="font-medium text-destructive">
                          -{formatCurrency(draft.totalConceptosACargo)}
                        </span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-border flex items-center justify-between">
                      <span className="font-medium text-foreground">Neto</span>
                      <span className="text-lg font-semibold text-foreground tabular-nums">
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
                ¿A quién le generás este mes?
              </h3>
              <p className="text-sm text-muted-foreground">
                Están todos marcados. Destildá a quien quieras dejar para
                después — un pago que todavía no acredita, una cuenta sin
                confirmar.
              </p>
            </div>

            {/* Select All Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  hideArrow
                  onClick={() =>
                    todosSeleccionados ? deseleccionarTodos() : seleccionarTodos()
                  }
                  className="h-auto gap-2 p-0 text-sm font-medium text-foreground hover:bg-transparent hover:text-primary"
                >
                  {todosSeleccionados ? (
                    <CheckSquare
                      className="w-5 h-5 text-primary"
                      weight="fill"
                    />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                  Seleccionar todas
                </Button>
              </div>
              <span className="text-sm text-muted-foreground">
                {state.seleccionados.length} de{' '}
                {state.dispersionDrafts.length} seleccionadas
              </span>
            </div>

            {/* Dispersion List */}
            <div className="space-y-3">
              {state.dispersionDrafts.map((draft) => {
                const isSelected = state.seleccionados.includes(
                  draft.propietarioId
                );

                return (
                  <motion.button
                    key={draft.propietarioId}
                    onClick={() => alternarSeleccion(draft.propietarioId)}
                    aria-pressed={isSelected}
                    className={cn(
                      'w-full p-4 rounded-lg border-2 text-left transition-all',
                      isSelected
                        ? 'border-primary/30 bg-primary-soft'
                        : 'border-border bg-card hover:border-primary/30'
                    )}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex items-center gap-4">
                      {isSelected ? (
                        <CheckSquare
                          className="w-6 h-6 text-primary"
                          weight="fill"
                        />
                      ) : (
                        <Square className="w-6 h-6 text-muted-foreground" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {draft.propietarioName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {draft.items.length} propiedad
                          {draft.items.length > 1 ? 'es' : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground tabular-nums">
                          {formatCurrency(draft.netToPropietario)}
                        </p>
                        {/*
                          Sin cuenta registrada se dice. Antes se fabricaba una
                          —banco «bancolombia», cuenta «****0000»—: en una
                          pantalla sobre A DÓNDE GIRAR PLATA, un dato inventado
                          se ve igual que uno real.
                        */}
                        <p className="text-xs text-muted-foreground">
                          {draft.propietarioBankAccount ??
                            'Sin cuenta registrada'}
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
                className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle
                  className="w-8 h-8 text-foreground"
                  weight="fill"
                />
              </motion.div>
              {/* Este paso es la CONFIRMACIÓN, no el resultado: acá todavía
                  no se guardó nada. Decía «Se generaron N dispersiones»
                  antes de que existiera ninguna. */}
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Todo listo para generar
              </h3>
              <p className="text-muted-foreground">
                Se van a generar {state.seleccionados.length}{' '}
                {state.seleccionados.length === 1
                  ? 'dispersión'
                  : 'dispersiones'}{' '}
                para {formatMonth(state.month)}.
                {sinSeleccionar > 0 && (
                  <>
                    {' '}
                    <span className="text-foreground">
                      {sinSeleccionar}{' '}
                      {sinSeleccionar === 1 ? 'queda' : 'quedan'} fuera.
                    </span>
                  </>
                )}
              </p>
            </div>

            {/* Summary Stats */}
            <div className="flex items-center justify-center gap-12 py-6 border-y border-border">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">
                  Dispersiones
                </p>
                <p className="text-3xl font-bold text-foreground tabular-nums">
                  {state.seleccionados.length}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">
                  Total a Dispersar
                </p>
                <p className="text-3xl font-bold text-foreground tabular-nums">
                  {formatCurrency(totalSeleccionado)}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 border border-border">
                <Lightning className="w-5 h-5 text-primary" />
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
                  {/*
                    Tres estados, tres colores, y cada uno significa algo:
                    verde = hecho, azul = acá estás, gris = todavía no.
                    Estaban los tres en negro salvo un anillo, así que el paso
                    actual y los ya cumplidos se leían igual — un indicador de
                    avance que no indica el avance.
                  */}
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-full transition-all',
                      status === 'completed'
                        ? 'bg-success text-white'
                        : status === 'current'
                          ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                          : 'bg-muted text-muted-foreground'
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
                        ? 'text-primary'
                        : status === 'completed'
                          ? 'text-success'
                          : 'text-fg-subtle'
                    )}
                  >
                    {step.label}
                  </span>
                </button>

                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'mx-2 h-0.5 flex-1',
                      step.id < currentStep
                        ? 'bg-success'
                        : 'bg-border'
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
            <span className="text-sm font-medium text-fg dark:text-white">
              Paso {currentStep} de 6: {STEPS[currentStep - 1]?.label}
            </span>
            <span className="text-sm text-fg-muted">
              {Math.round((currentStep / 6) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-surface-muted dark:bg-ink rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={false}
              animate={{ width: `${(currentStep / 6) * 100}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-surface dark:bg-card rounded-lg border border-border dark:border-border-strong overflow-hidden">
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
        <div className="px-6 py-4 border-t border-border-faint dark:border-border-strong bg-surface-muted dark:bg-muted/20 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            hideArrow
            onClick={handleCancel}
            className="text-fg-muted dark:text-fg-subtle"
          >
            Cancelar
          </Button>

          <div className="flex items-center gap-3">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                hideArrow
                onClick={goToPreviousStep}
              >
                <CaretLeft className="w-4 h-4" />
                Anterior
              </Button>
            )}

            {currentStep < 6 ? (
              <Button
                type="button"
                hideArrow
                onClick={goToNextStep}
                disabled={!isStepValid}
              >
                {/*
                  «Generar Dispersiones» y «Aprobar Seleccionadas» prometían dos
                  cosas que este botón no hace: acá todavía no se genera nada
                  —eso pasa al confirmar, en el paso 6— y no hay ninguna
                  aprobación en el flujo. Un botón nombra lo que hace.
                */}
                {currentStep === 4 ? (
                  <>
                    Elegir a quién
                    <CaretRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Siguiente
                    <CaretRight className="w-4 h-4" />
                  </>
                )}
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
                  'Procesando...'
                ) : (
                  <>
                    <Check className="w-4 h-4" weight="bold" />
                    Confirmar Dispersiones
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
              className="w-full max-w-md p-6 rounded-lg bg-surface dark:bg-card border border-border dark:border-border-strong"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-warning-soft flex items-center justify-center">
                  <X className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold text-fg dark:text-white">
                    Cancelar generacion?
                  </h3>
                  <p className="text-sm text-fg-muted dark:text-fg-subtle">
                    Se perdera el progreso actual
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  hideArrow
                  onClick={() => setShowCancelDialog(false)}
                  className="text-fg-muted dark:text-fg-subtle"
                >
                  Continuar editando
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  hideArrow
                  onClick={confirmCancel}
                >
                  Si, cancelar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DispersionWizard;
