'use client';

import * as React from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Buildings,
  MapPin,
  User,
  Envelope,
  Phone,
  WhatsappLogo,
  Copy,
  Calendar,
  CurrencyCircleDollar,
  CheckCircle,
  Clock,
  Warning,
  Bell,
  Receipt,
  ArrowRight,
  CaretRight,
  XCircle,
  Bank,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Cobro, CobroStatus } from '@/lib/types/inmobiliaria';
import { formatCurrency, getCobroStatusColor } from '@/lib/types/inmobiliaria';
import { MOCK_PROPIETARIOS, MOCK_CONSIGNACIONES } from '@/lib/data/mock-inmobiliaria';

interface CobroDetailProps {
  isOpen: boolean;
  onClose: () => void;
  cobro: Cobro | null;
  onRegisterPayment?: (cobro: Cobro) => void;
  onSendReminder?: (cobro: Cobro) => void;
}

// Status labels in Spanish
const STATUS_LABELS: Record<CobroStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  partial: 'Parcial',
  late: 'En mora',
  defaulted: 'Incobrable',
};

// Mock payment history for partial payments
function getMockPaymentHistory(cobro: Cobro) {
  if (cobro.status === 'paid') {
    return [
      {
        id: 'pay-1',
        date: cobro.paidDate || '',
        amount: cobro.paidAmount,
        method: cobro.paymentMethod || 'transferencia',
        reference: cobro.paymentReference || '',
      },
    ];
  }
  if (cobro.status === 'partial') {
    // For partial, simulate 1-2 partial payments
    return [
      {
        id: 'pay-1',
        date: new Date(cobro.dueDate).toISOString().split('T')[0],
        amount: Math.round(cobro.paidAmount * 0.6),
        method: 'transferencia',
        reference: 'TRF-001',
      },
      {
        id: 'pay-2',
        date: new Date().toISOString().split('T')[0],
        amount: Math.round(cobro.paidAmount * 0.4),
        method: 'efectivo',
        reference: 'EFE-002',
      },
    ];
  }
  return [];
}

// Mock reminder history
function getMockReminderHistory(cobro: Cobro) {
  if (cobro.remindersSent === 0) return [];

  const reminders = [];
  const channels = ['email', 'whatsapp'];
  const baseDate = new Date(cobro.dueDate);

  for (let i = 0; i < cobro.remindersSent; i++) {
    const reminderDate = new Date(baseDate);
    reminderDate.setDate(baseDate.getDate() + (i < 2 ? -3 + i : i));

    reminders.push({
      id: `reminder-${i + 1}`,
      date: reminderDate.toISOString(),
      channel: channels[i % channels.length],
      type: i < 2 ? 'pre' : 'mora',
      status: 'sent',
    });
  }

  return reminders;
}

/**
 * CopyButton - Button that copies text to clipboard
 */
function CopyButton({ text }: { text: string }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      title="Copiar"
    >
      <Copy className="w-4 h-4" />
    </button>
  );
}

/**
 * ContactAction - Action button for contact methods
 */
function ContactAction({
  icon: Icon,
  href,
  label,
  className,
}: {
  icon: React.ElementType;
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        className
      )}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </a>
  );
}

/**
 * StatusBadge - Badge showing cobro status with appropriate color
 */
function StatusBadge({ status }: { status: CobroStatus }) {
  return (
    <span className={cn('px-3 py-1.5 rounded-full text-sm font-medium', getCobroStatusColor(status))}>
      {STATUS_LABELS[status]}
    </span>
  );
}

/**
 * AmountRow - Row showing amount label and value
 */
function AmountRow({
  label,
  amount,
  isTotal,
  isWarning,
  isSuccess,
}: {
  label: string;
  amount: number;
  isTotal?: boolean;
  isWarning?: boolean;
  isSuccess?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span
        className={cn(
          'text-sm',
          isTotal ? 'font-semibold text-foreground' : 'text-muted-foreground'
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          isTotal ? 'text-lg font-bold' : 'text-sm font-medium',
          isWarning
            ? 'text-amber-600 dark:text-amber-400'
            : isSuccess
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-foreground'
        )}
      >
        {formatCurrency(amount)}
      </span>
    </div>
  );
}

/**
 * CobroDetail - Sheet drawer showing full cobro information
 * Includes property, tenant, propietario info, amounts, payment history, and actions
 */
export function CobroDetail({
  isOpen,
  onClose,
  cobro,
  onRegisterPayment,
  onSendReminder,
}: CobroDetailProps) {
  const [isSendingReminder, setIsSendingReminder] = React.useState(false);

  // Get related data
  const propietario = React.useMemo(() => {
    if (!cobro) return null;
    return MOCK_PROPIETARIOS.find((p) => p.id === cobro.propietarioId);
  }, [cobro]);

  const consignacion = React.useMemo(() => {
    if (!cobro) return null;
    return MOCK_CONSIGNACIONES.find((c) => c.id === cobro.consignacionId);
  }, [cobro]);

  // Get payment and reminder history
  const paymentHistory = React.useMemo(() => {
    if (!cobro) return [];
    return getMockPaymentHistory(cobro);
  }, [cobro]);

  const reminderHistory = React.useMemo(() => {
    if (!cobro) return [];
    return getMockReminderHistory(cobro);
  }, [cobro]);

  // Handle send reminder
  const handleSendReminder = async () => {
    if (!cobro || !onSendReminder) return;

    setIsSendingReminder(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    onSendReminder(cobro);
    toast.success('Recordatorio enviado', {
      description: `Se envio un recordatorio a ${cobro.tenantName}`,
    });
    setIsSendingReminder(false);
  };

  // Handle mark as defaulted
  const handleMarkDefaulted = () => {
    if (!cobro) return;
    toast.info('Marcar como incobrable', {
      description: 'Esta accion requiere aprobacion del administrador.',
    });
  };

  if (!cobro) return null;

  const isPending = cobro.status === 'pending' || cobro.status === 'late' || cobro.status === 'partial';
  const isLate = cobro.status === 'late';

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        {/* Header */}
        <SheetHeader className="p-6 pb-4 border-b border-border sticky top-0 bg-background z-10">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <SheetTitle className="text-lg font-semibold text-foreground">
                {cobro.propertyTitle}
              </SheetTitle>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {cobro.propertyAddress}
              </p>
            </div>
            <StatusBadge status={cobro.status} />
          </div>
        </SheetHeader>

        <div className="p-6 space-y-6">
          {/* Property Section */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Buildings className="w-4 h-4 text-indigo-600" />
              Propiedad
            </h3>
            <div className="p-4 rounded-xl border border-border bg-muted/30">
              {consignacion?.propertyThumbnail && (
                <div className="w-full h-32 rounded-lg overflow-hidden mb-3">
                  <img
                    src={consignacion.propertyThumbnail}
                    alt={cobro.propertyTitle}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="space-y-2">
                <p className="font-medium text-foreground">{cobro.propertyTitle}</p>
                <p className="text-sm text-muted-foreground">{cobro.propertyAddress}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="capitalize">{consignacion?.propertyType || 'Propiedad'}</span>
                  <span>•</span>
                  <span>{consignacion?.propertyZone || ''}</span>
                </div>
                {consignacion && (
                  <Link
                    href={`/panel/inmobiliaria/portafolio/${consignacion.id}`}
                    className="inline-flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline mt-2"
                  >
                    Ver consignacion
                    <CaretRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          </motion.section>

          {/* Tenant Section */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-3"
          >
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" />
              Inquilino
            </h3>
            <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <User className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{cobro.tenantName}</p>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Envelope className="w-3.5 h-3.5" />
                    <span>{cobro.tenantEmail}</span>
                    <CopyButton text={cobro.tenantEmail} />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <ContactAction
                  icon={Phone}
                  href={`tel:${cobro.tenantPhone}`}
                  label="Llamar"
                  className="bg-muted hover:bg-muted/80 text-foreground"
                />
                <ContactAction
                  icon={WhatsappLogo}
                  href={`https://wa.me/${cobro.tenantPhone.replace(/\D/g, '')}`}
                  label="WhatsApp"
                  className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-400"
                />
                <ContactAction
                  icon={Envelope}
                  href={`mailto:${cobro.tenantEmail}`}
                  label="Email"
                  className="bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400"
                />
              </div>
            </div>
          </motion.section>

          {/* Propietario Section */}
          {propietario && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="space-y-3"
            >
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Bank className="w-4 h-4 text-indigo-600" />
                Propietario
              </h3>
              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{propietario.name}</p>
                    <p className="text-sm text-muted-foreground">{propietario.email}</p>
                  </div>
                  <Link
                    href={`/panel/inmobiliaria/propietarios/${propietario.id}`}
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Ver perfil
                  </Link>
                </div>
              </div>
            </motion.section>
          )}

          {/* Amount Breakdown Section */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CurrencyCircleDollar className="w-4 h-4 text-indigo-600" />
              Desglose
            </h3>
            <div className="p-4 rounded-xl border border-border bg-muted/30">
              {/* Month and Due Date */}
              <div className="grid grid-cols-2 gap-4 pb-3 mb-3 border-b border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Mes</p>
                  <p className="font-medium text-foreground capitalize">
                    {new Date(cobro.month + '-01').toLocaleDateString('es-CO', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vencimiento</p>
                  <p className="font-medium text-foreground">
                    {new Date(cobro.dueDate).toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </div>
              </div>

              {/* Amounts */}
              <div className="divide-y divide-border">
                <AmountRow label="Arriendo" amount={cobro.rentAmount} />
                {cobro.adminAmount > 0 && (
                  <AmountRow label="Administracion" amount={cobro.adminAmount} />
                )}
                {cobro.lateFee > 0 && (
                  <AmountRow label="Interes por mora" amount={cobro.lateFee} isWarning />
                )}
                <AmountRow label="Total" amount={cobro.totalWithFees} isTotal />
              </div>

              {/* Paid/Pending */}
              {(cobro.status === 'paid' || cobro.status === 'partial') && (
                <div className="mt-3 pt-3 border-t border-border divide-y divide-border">
                  <AmountRow label="Pagado" amount={cobro.paidAmount} isSuccess />
                  {cobro.status === 'partial' && (
                    <AmountRow label="Pendiente" amount={cobro.pendingAmount} isWarning />
                  )}
                  {cobro.paidDate && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-muted-foreground">Fecha de pago</span>
                      <span className="text-sm text-foreground">
                        {new Date(cobro.paidDate).toLocaleDateString('es-CO', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Days Late Warning */}
              {isLate && (
                <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2">
                    <Warning className="w-4 h-4 text-red-600 dark:text-red-400" weight="fill" />
                    <span className="text-sm font-medium text-red-700 dark:text-red-400">
                      {cobro.daysLate} dias en mora
                    </span>
                  </div>
                </div>
              )}
            </div>
          </motion.section>

          {/* Payment History Section */}
          {paymentHistory.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="space-y-3"
            >
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Receipt className="w-4 h-4 text-indigo-600" />
                Historial de Pagos
              </h3>
              <div className="space-y-2">
                {paymentHistory.map((payment) => (
                  <div
                    key={payment.id}
                    className="p-3 rounded-xl border border-border bg-muted/30 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {formatCurrency(payment.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {payment.method} • {payment.reference}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(payment.date).toLocaleDateString('es-CO', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {/* Reminder History Section */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-600" />
              Recordatorios ({cobro.remindersSent})
            </h3>
            {reminderHistory.length > 0 ? (
              <div className="space-y-2">
                {reminderHistory.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="p-3 rounded-xl border border-border bg-muted/30 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                        {reminder.channel === 'email' ? (
                          <Envelope className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        ) : (
                          <WhatsappLogo className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground capitalize">
                          {reminder.channel}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {reminder.type === 'pre' ? 'Pre-vencimiento' : 'Mora'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(reminder.date).toLocaleDateString('es-CO', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                ))}
                {cobro.lastReminderDate && (
                  <p className="text-xs text-muted-foreground">
                    Ultimo recordatorio:{' '}
                    {new Date(cobro.lastReminderDate).toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-4 rounded-xl border border-dashed border-border text-center">
                No se han enviado recordatorios
              </p>
            )}
          </motion.section>
        </div>

        {/* Actions Footer */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="sticky bottom-0 p-6 border-t border-border bg-background space-y-3"
        >
          <div className="flex gap-3">
            {isPending && onRegisterPayment && (
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => onRegisterPayment(cobro)}
              >
                <CurrencyCircleDollar className="w-4 h-4 mr-2" />
                Registrar Pago
              </Button>
            )}
            {isPending && onSendReminder && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleSendReminder}
                disabled={isSendingReminder}
              >
                {isSendingReminder ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Enviando...
                  </span>
                ) : (
                  <>
                    <Bell className="w-4 h-4 mr-2" />
                    Enviar Recordatorio
                  </>
                )}
              </Button>
            )}
          </div>
          {isLate && (
            <Button
              variant="ghost"
              className="w-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={handleMarkDefaulted}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Marcar como incobrable
            </Button>
          )}
        </motion.div>
      </SheetContent>
    </Sheet>
  );
}

export default CobroDetail;
