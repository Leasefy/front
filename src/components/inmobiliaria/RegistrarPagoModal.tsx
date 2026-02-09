'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Buildings,
  MapPin,
  User,
  CurrencyCircleDollar,
  Calendar,
  Receipt,
  Note,
  Warning,
  CreditCard,
  Bank,
  Money,
  Wallet,
  FileText,
  DotsThree,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Cobro } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';

// Payment methods with their icons
const PAYMENT_METHODS = [
  { value: 'transferencia', label: 'Transferencia', icon: Bank },
  { value: 'efectivo', label: 'Efectivo', icon: Money },
  { value: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
  { value: 'cheque', label: 'Cheque', icon: FileText },
  { value: 'pse', label: 'PSE', icon: Wallet },
  { value: 'otro', label: 'Otro', icon: DotsThree },
] as const;

interface PaymentFormData {
  amount: string;
  method: string;
  date: string;
  reference: string;
  notes: string;
}

interface RegistrarPagoModalProps {
  isOpen: boolean;
  onClose: () => void;
  cobro: Cobro | null;
  /** Optional list of cobros to select from when no cobro is pre-selected */
  cobrosList?: Cobro[];
  onSubmit: (data: {
    amount: number;
    method: string;
    date: string;
    reference?: string;
    notes?: string;
  }, cobroId: string) => Promise<void> | void;
}

/**
 * RegistrarPagoModal - Dialog to register a payment for a cobro
 * Handles full and partial payments with validation
 * Supports cobro selection when cobrosList is provided
 */
export function RegistrarPagoModal({
  isOpen,
  onClose,
  cobro: preselectedCobro,
  cobrosList,
  onSubmit,
}: RegistrarPagoModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showConfirmation, setShowConfirmation] = React.useState(false);
  const [selectedCobroId, setSelectedCobroId] = React.useState<string | null>(
    preselectedCobro?.id || null
  );

  // Determine the active cobro (preselected or selected from list)
  const cobro = preselectedCobro || cobrosList?.find((c) => c.id === selectedCobroId) || null;

  // Filter pending cobros for selection
  const pendingCobros = React.useMemo(() => {
    if (!cobrosList) return [];
    return cobrosList.filter((c) => c.status === 'pending' || c.status === 'late' || c.status === 'partial');
  }, [cobrosList]);

  // Show cobro selector when no preselected cobro and list is provided
  const showCobroSelector = !preselectedCobro && cobrosList && cobrosList.length > 0;

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid },
  } = useForm<PaymentFormData>({
    mode: 'onChange',
    defaultValues: {
      amount: '',
      method: '',
      date: today,
      reference: '',
      notes: '',
    },
  });

  // Watch amount for partial payment detection
  const watchedAmount = watch('amount');

  // Parse amount (handles locale-formatted numbers)
  const parseAmount = (value: string): number => {
    // Remove all non-numeric characters except comma and dot
    const cleaned = value.replace(/[^\d.,]/g, '');
    // Replace comma with dot for parsing
    const normalized = cleaned.replace(',', '.');
    return parseFloat(normalized) || 0;
  };

  // Format number for input display
  const formatInputAmount = (value: number): string => {
    return new Intl.NumberFormat('es-CO', {
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Check if this is a partial payment
  const parsedAmount = parseAmount(watchedAmount);
  const isPartialPayment = cobro && parsedAmount > 0 && parsedAmount < cobro.pendingAmount;
  const isOverPayment = cobro && parsedAmount > cobro.pendingAmount;

  // Reset form when cobro changes
  React.useEffect(() => {
    if (cobro) {
      reset({
        amount: formatInputAmount(cobro.pendingAmount),
        method: '',
        date: today,
        reference: '',
        notes: '',
      });
    }
  }, [cobro, reset, today]);

  // Handle "Pago total" button
  const handleFullPayment = () => {
    if (cobro) {
      setValue('amount', formatInputAmount(cobro.pendingAmount), { shouldValidate: true });
    }
  };

  // Handle form submission
  const handleFormSubmit = async (data: PaymentFormData) => {
    if (!cobro) return;

    if (isPartialPayment && !showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        amount: parseAmount(data.amount),
        method: data.method,
        date: data.date,
        reference: data.reference || undefined,
        notes: data.notes || undefined,
      }, cobro.id);

      toast.success('Pago registrado', {
        description: `Se registro un pago de ${formatCurrency(parseAmount(data.amount))}`,
      });

      reset();
      setShowConfirmation(false);
      setSelectedCobroId(null);
      onClose();
    } catch (error) {
      toast.error('Error al registrar pago', {
        description: 'Por favor intenta de nuevo',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle close
  const handleClose = () => {
    reset();
    setShowConfirmation(false);
    setSelectedCobroId(null);
    onClose();
  };

  // Handle cancel confirmation
  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
  };

  // Show nothing if no cobro and no list
  if (!cobro && !showCobroSelector) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="p-6 pb-0 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <CurrencyCircleDollar className="w-5 h-5 text-indigo-600" />
            Registrar Pago
          </DialogTitle>
          <DialogDescription>
            {cobro ? `${cobro.propertyTitle} - ${cobro.tenantName}` : 'Selecciona un cobro pendiente'}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-4">
        {/* Cobro Selector - shown when no preselected cobro */}
        {showCobroSelector && !cobro && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Selecciona el cobro para registrar el pago:
            </p>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {pendingCobros.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm rounded-xl border border-dashed border-border">
                  No hay cobros pendientes
                </div>
              ) : (
                pendingCobros.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCobroId(c.id)}
                    className={cn(
                      'w-full p-3 rounded-xl border text-left transition-all',
                      selectedCobroId === c.id
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-border hover:border-foreground/30 bg-background'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {c.propertyTitle}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {c.tenantName}
                        </p>
                      </div>
                      <div className="text-right ml-3">
                        <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                          {formatCurrency(c.pendingAmount)}
                        </p>
                        <p className={cn(
                          'text-xs',
                          c.status === 'late' ? 'text-red-500' : 'text-muted-foreground'
                        )}>
                          {c.status === 'late' ? 'Vencido' : c.status === 'partial' ? 'Parcial' : 'Pendiente'}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Payment Form - shown when cobro is selected */}
        {cobro && (
        <AnimatePresence mode="wait">
          {showConfirmation ? (
            // Partial Payment Confirmation
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="flex gap-3">
                  <Warning className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" weight="fill" />
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      Pago Parcial
                    </h4>
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      Estas registrando un pago parcial de{' '}
                      <span className="font-semibold">{formatCurrency(parsedAmount)}</span>.
                      Quedara un saldo pendiente de{' '}
                      <span className="font-semibold">
                        {formatCurrency(cobro.pendingAmount - parsedAmount)}
                      </span>.
                    </p>
                    <p className="text-sm text-amber-600 dark:text-amber-500">
                      ¿Deseas continuar con este pago parcial?
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleCancelConfirmation}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={handleSubmit(handleFormSubmit)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Registrando...
                    </span>
                  ) : (
                    'Confirmar Pago Parcial'
                  )}
                </Button>
              </div>
            </motion.div>
          ) : (
            // Main Form
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit(handleFormSubmit)}
              className="space-y-6"
            >
              {/* Cobro Summary Section */}
              <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
                {/* Property & Tenant */}
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Buildings className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-foreground truncate">
                      {cobro.propertyTitle}
                    </h4>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="truncate">{cobro.propertyAddress}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <User className="w-3.5 h-3.5" />
                      <span>{cobro.tenantName}</span>
                    </div>
                  </div>
                </div>

                {/* Amount Details */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Mes</p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(cobro.month + '-01').toLocaleDateString('es-CO', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Vencimiento</p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(cobro.dueDate).toLocaleDateString('es-CO', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  </div>
                </div>

                {/* Amounts Row */}
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-sm font-medium text-foreground">
                      {formatCurrency(cobro.totalWithFees)}
                    </p>
                  </div>
                  {cobro.paidAmount > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground">Abonado</p>
                      <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                        {formatCurrency(cobro.paidAmount)}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Pendiente</p>
                    <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                      {formatCurrency(cobro.pendingAmount)}
                    </p>
                  </div>
                </div>

                {/* Late Fee Warning */}
                {cobro.lateFee > 0 && (
                  <div className="flex items-center gap-2 pt-2 text-xs text-orange-600 dark:text-orange-400">
                    <Warning className="w-4 h-4" />
                    <span>Incluye {formatCurrency(cobro.lateFee)} de interes por mora</span>
                  </div>
                )}
              </div>

              {/* Payment Form */}
              <div className="space-y-4">
                {/* Amount Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">
                      Monto a registrar
                    </label>
                    <button
                      type="button"
                      onClick={handleFullPayment}
                      className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Pago total
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <input
                      {...register('amount', {
                        required: 'El monto es requerido',
                        validate: {
                          positive: (v) => parseAmount(v) > 0 || 'El monto debe ser mayor a 0',
                          notOver: (v) =>
                            parseAmount(v) <= cobro.pendingAmount ||
                            `El monto no puede superar ${formatCurrency(cobro.pendingAmount)}`,
                        },
                      })}
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      className={cn(
                        'w-full h-12 pl-8 pr-4 rounded-xl border bg-background text-foreground text-lg font-semibold',
                        'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
                        errors.amount
                          ? 'border-destructive'
                          : isPartialPayment
                          ? 'border-amber-500'
                          : 'border-border'
                      )}
                    />
                  </div>
                  {errors.amount && (
                    <p className="text-xs text-destructive">{errors.amount.message}</p>
                  )}
                  {isPartialPayment && !errors.amount && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Warning className="w-3.5 h-3.5" />
                      Pago parcial - quedara saldo de {formatCurrency(cobro.pendingAmount - parsedAmount)}
                    </p>
                  )}
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Metodo de pago
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_METHODS.map((method) => {
                      const Icon = method.icon;
                      const isSelected = watch('method') === method.value;
                      return (
                        <button
                          key={method.value}
                          type="button"
                          onClick={() => setValue('method', method.value, { shouldValidate: true })}
                          className={cn(
                            'flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all',
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                              : 'border-border hover:border-foreground/30 bg-background'
                          )}
                        >
                          <Icon
                            className={cn(
                              'w-5 h-5',
                              isSelected
                                ? 'text-indigo-600 dark:text-indigo-400'
                                : 'text-muted-foreground'
                            )}
                          />
                          <span
                            className={cn(
                              'text-xs font-medium',
                              isSelected
                                ? 'text-indigo-600 dark:text-indigo-400'
                                : 'text-muted-foreground'
                            )}
                          >
                            {method.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="hidden"
                    {...register('method', { required: 'Selecciona un metodo de pago' })}
                  />
                  {errors.method && (
                    <p className="text-xs text-destructive">{errors.method.message}</p>
                  )}
                </div>

                {/* Date Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    Fecha del pago
                  </label>
                  <input
                    {...register('date', { required: 'La fecha es requerida' })}
                    type="date"
                    max={today}
                    className={cn(
                      'w-full h-11 px-4 rounded-xl border bg-background text-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
                      errors.date ? 'border-destructive' : 'border-border'
                    )}
                  />
                  {errors.date && (
                    <p className="text-xs text-destructive">{errors.date.message}</p>
                  )}
                </div>

                {/* Reference Input (Optional) */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-muted-foreground" />
                    Referencia / Comprobante
                    <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
                  </label>
                  <input
                    {...register('reference')}
                    type="text"
                    placeholder="Ej: TRF-123456"
                    className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* Notes Input (Optional) */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Note className="w-4 h-4 text-muted-foreground" />
                    Notas
                    <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={2}
                    placeholder="Notas adicionales sobre este pago..."
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={isSubmitting || !isValid}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Registrando...
                    </span>
                  ) : (
                    'Registrar Pago'
                  )}
                </Button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default RegistrarPagoModal;
