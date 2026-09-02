'use client';

import * as React from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { conRegreso } from '@/lib/nav/ruta-de-regreso';
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
  Clock,
  Warning,
  Bell,
  Receipt,
  ArrowRight,
  CaretRight,
  XCircle,
  Bank,
  Printer,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { IconButton } from '@leasefy/cadence';
import type { Cobro, CobroStatus } from '@/lib/types/inmobiliaria';
import { usePropietarios, useConsignaciones } from '@/lib/hooks/useInmobiliaria';
import { useLenis } from '@/components/providers/SmoothScroll';
import { useDetalleDeCobro } from '@/lib/hooks/useDetalleDeCobro';
import { recibosDeCajaApi } from '@/lib/api/recibos-de-caja.service';
import type { CobroConDesglose, ReciboDeCaja } from '@/lib/api/recibos-de-caja.types';
import { DesgloseAdeudado } from './DesgloseAdeudado';
import { RecibosDeCajaHistorial } from './RecibosDeCajaHistorial';

interface CobroDetailProps {
  isOpen: boolean;
  onClose: () => void;
  cobro: Cobro | null;
  onRegisterPayment?: (cobro: Cobro) => void;
  onSendReminder?: (cobro: Cobro) => void;
  /**
   * Anular un recibo devuelve el cobro recompuesto. Sin esto, la fila de la
   * tabla se queda con el saldo de antes y el usuario ve dos cifras distintas
   * para la misma plata en la misma pantalla.
   */
  onCobroActualizado?: (cobro: CobroConDesglose) => void;
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
function CopyButton({ text, tooltip }: { text: string; tooltip: string }) {
  const { t } = useI18n();

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    toast.success(t('inmobiliaria.cobros.toasts.copiedToClipboard'));
  };

  return (
    <IconButton
      variant="ghost"
      size="sm"
      icon={<Copy className="w-4 h-4" />}
      onClick={handleCopy}
      aria-label={tooltip}
      title={tooltip}
    />
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
        'inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
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
  const { t } = useI18n();

  const STATUS_LABELS: Record<CobroStatus, string> = {
    pending: t('inmobiliaria.cobros.status.pending'),
    paid: t('inmobiliaria.cobros.status.paid'),
    partial: t('inmobiliaria.cobros.status.partial'),
    late: t('inmobiliaria.cobros.status.late'),
    defaulted: t('inmobiliaria.cobros.status.defaulted'),
  };

  const STATUS_VARIANT = {
    pending: 'warning',
    paid: 'success',
    partial: 'default',
    late: 'destructive',
    defaulted: 'destructive',
  } as const;

  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABELS[status]}</Badge>;
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
  onCobroActualizado,
}: CobroDetailProps) {
  const { t, formatDate } = useI18n();
  const [isSendingReminder, setIsSendingReminder] = React.useState(false);
  const { stop: stopLenis, start: startLenis } = useLenis();

  /*
   * El desglose y los recibos NO vienen en la lista: la fila que abrió este
   * panel sólo tiene los totales. Se piden al abrir.
   */
  const {
    detalle,
    conceptos,
    recibos,
    cargando: cargandoDetalle,
    falloDesglose,
    falloRecibos,
    recargar,
    aplicarRespuesta,
  } = useDetalleDeCobro(cobro?.id ?? null, isOpen);

  // El cobro fresco manda sobre la fila de la lista en cuanto llega.
  const cobroVigente = detalle?.id === cobro?.id && detalle ? detalle : cobro;

  const anularRecibo = React.useCallback(
    async (recibo: ReciboDeCaja, motivo: string) => {
      const res = await recibosDeCajaApi.anular(recibo.id, motivo);
      aplicarRespuesta(res);
      onCobroActualizado?.(res.cobro);
    },
    [aplicarRespuesta, onCobroActualizado],
  );

  // Stop Lenis smooth scroll when sheet is open to allow native scroll
  React.useEffect(() => {
    if (isOpen) {
      stopLenis();
      return () => {
        startLenis();
      };
    }
  }, [isOpen, stopLenis, startLenis]);

  // Get related data
  const { propietarios } = usePropietarios();
  const { consignaciones } = useConsignaciones();

  const propietario = React.useMemo(() => {
    if (!cobro) return null;
    return propietarios.find((p) => p.id === cobro.propietarioId) ?? null;
  }, [cobro, propietarios]);

  const consignacion = React.useMemo(() => {
    if (!cobro) return null;
    return consignaciones.find((c) => c.id === cobro.consignacionId) ?? null;
  }, [cobro, consignaciones]);

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
    toast.success(t('inmobiliaria.cobros.toasts.reminderSent'), {
      description: t('inmobiliaria.cobros.toasts.reminderSentDesc', { name: cobro.tenantName }),
    });
    setIsSendingReminder(false);
  };

  // Handle mark as defaulted
  const handleMarkDefaulted = () => {
    if (!cobro) return;
    toast.info(t('inmobiliaria.cobros.toasts.markDefaulted'), {
      description: t('inmobiliaria.cobros.toasts.markDefaultedDesc'),
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

        <div className="p-6 space-y-6" onWheel={(e) => e.stopPropagation()}>
          {/* Property Section */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Buildings className="w-4 h-4 text-primary" />
              {t('inmobiliaria.cobros.detail.propertySection')}
            </h3>
            <div className="p-4 rounded-xl border border-border bg-muted/30">
              {consignacion?.propertyThumbnail && (
                <div className="w-full h-32 rounded-md overflow-hidden mb-3">
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
                  <span className="capitalize">{consignacion?.propertyType || t('inmobiliaria.cobros.detail.propertySection')}</span>
                  <span>&bull;</span>
                  <span>{consignacion?.propertyZone || ''}</span>
                </div>
                {consignacion && (
                  <Link
                    href={`/panel/inmobiliaria/inmuebles/${consignacion.id}`}
                    onClick={onClose}
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                  >
                    {t('inmobiliaria.cobros.detail.viewConsignacion')}
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
              <User className="w-4 h-4 text-primary" />
              {t('inmobiliaria.cobros.detail.tenantSection')}
            </h3>
            <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary-soft flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{cobro.tenantName}</p>
                  {cobro.tenantEmail && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Envelope className="w-3.5 h-3.5" />
                      <span>{cobro.tenantEmail}</span>
                      <CopyButton text={cobro.tenantEmail} tooltip={t('inmobiliaria.cobros.detail.copyTooltip')} />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {cobro.tenantPhone && (
                  <>
                    <ContactAction
                      icon={Phone}
                      href={`tel:${cobro.tenantPhone}`}
                      label={t('inmobiliaria.cobros.detail.callAction')}
                      className="bg-muted hover:bg-muted/80 text-foreground"
                    />
                    <ContactAction
                      icon={WhatsappLogo}
                      href={`https://wa.me/${cobro.tenantPhone.replace(/\D/g, '')}`}
                      label="WhatsApp"
                      className="bg-success-soft hover:bg-success-soft text-success dark:bg-success/30 dark:hover:bg-success/50 dark:text-success"
                    />
                  </>
                )}
                {cobro.tenantEmail && (
                  <ContactAction
                    icon={Envelope}
                    href={`mailto:${cobro.tenantEmail}`}
                    label="Email"
                    className="bg-primary-soft hover:bg-primary-soft text-primary dark:bg-primary/30 dark:hover:bg-primary/50 dark:text-primary"
                  />
                )}
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
                <Bank className="w-4 h-4 text-primary" />
                {t('inmobiliaria.cobros.detail.ownerSection')}
              </h3>
              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{propietario.name}</p>
                    <p className="text-sm text-muted-foreground">{propietario.email ?? '—'}</p>
                  </div>
                  <Link
                    href={conRegreso(`/panel/inmobiliaria/propietarios/${propietario.id}`, '/panel/inmobiliaria/cobros')}
                    className="text-sm text-primary hover:underline"
                  >
                    {t('inmobiliaria.cobros.detail.viewProfile')}
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
              <CurrencyCircleDollar className="w-4 h-4 text-primary" />
              {t('inmobiliaria.cobros.detail.breakdownSection')}
            </h3>
            {/* Mes y vencimiento. Va en su propia tarjeta: el desglose trae la
                suya, y una tarjeta dentro de otra con el mismo fondo y el
                mismo borde no se lee como jerarquía, se lee como un error. */}
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">{t('inmobiliaria.cobros.detail.monthLabel')}</p>
                  <p className="font-medium text-foreground capitalize">
                    {formatDate(new Date(cobro.month + '-01'), {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('inmobiliaria.cobros.detail.dueDateLabel')}</p>
                  <p className="font-medium text-foreground">
                    {formatDate(new Date(cobro.dueDate), {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/*
              🔴 Antes acá vivían cuatro filas fijas (canon, admin, mora,
              total). Eso es exactamente lo que la inmobiliaria dijo que no
              alcanza: no muestra el honorario de cobranza ni las retenciones,
              y con eso se acepta un abono parcial creyendo que el cliente
              quedó al día. Ahora manda el desglose del back, y cuando la
              agencia no lo tiene, la pantalla lo dice.
            */}
            <DesgloseAdeudado
              cobro={cobroVigente ?? cobro}
              conceptos={conceptos}
              cargando={cargandoDetalle}
              fallo={falloDesglose}
              onReintentar={recargar}
            />

            {isLate && (
              <div className="rounded-md border border-danger/30 bg-danger-soft p-3 dark:border-danger/40">
                <div className="flex items-center gap-2">
                  <Warning className="w-4 h-4 text-danger" weight="fill" />
                  <span className="text-sm font-medium text-danger">
                    {t('inmobiliaria.cobros.detail.daysLate', { count: cobro.daysLate })}
                  </span>
                </div>
              </div>
            )}
          </motion.section>

          {/* Recibos de caja — cada abono, su documento */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="space-y-3"
          >
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              {t('recibos.historial.titulo')}
            </h3>
            <RecibosDeCajaHistorial
              recibos={recibos}
              cargando={cargandoDetalle}
              fallo={falloRecibos}
              onReintentar={recargar}
              onAnular={anularRecibo}
            />
          </motion.section>

          {/* Reminder History Section */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              {t('inmobiliaria.cobros.detail.remindersSection')} ({cobro.remindersSent})
            </h3>
            {reminderHistory.length > 0 ? (
              <div className="space-y-2">
                {reminderHistory.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="p-3 rounded-xl border border-border bg-muted/30 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-soft flex items-center justify-center">
                        {reminder.channel === 'email' ? (
                          <Envelope className="w-4 h-4 text-primary" />
                        ) : (
                          <WhatsappLogo className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground capitalize">
                          {reminder.channel}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {reminder.type === 'pre' ? t('inmobiliaria.cobros.detail.preExpiry') : t('inmobiliaria.cobros.detail.overdue')}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(new Date(reminder.date), {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                ))}
                {cobro.lastReminderDate && (
                  <p className="text-xs text-muted-foreground">
                    {t('inmobiliaria.cobros.detail.lastReminder')}{' '}
                    {formatDate(new Date(cobro.lastReminderDate), {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-4 rounded-xl border border-dashed border-border text-center">
                {t('inmobiliaria.cobros.detail.noReminders')}
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
                className="flex-1 bg-success hover:bg-success text-white"
                onClick={() => onRegisterPayment(cobro)}
              >
                <Receipt className="w-4 h-4 mr-2" />
                {t('recibos.hacer')}
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
                    <Spinner size="sm" variant="current" />
                    {t('inmobiliaria.cobros.detail.sendingReminder')}
                  </span>
                ) : (
                  <>
                    <Bell className="w-4 h-4 mr-2" />
                    {t('inmobiliaria.cobros.detail.sendReminder')}
                  </>
                )}
              </Button>
            )}
          </div>
          {/* El documento del período, imprimible: la cuenta de cobro. */}
          <Button asChild variant="ghost" className="w-full">
            <Link
              href={`/panel/inmobiliaria/cobros/${cobro.id}/cuenta-de-cobro?volver=${encodeURIComponent('/panel/inmobiliaria/cobros')}`}
              data-testid="cuenta-de-cobro"
            >
              <Printer className="w-4 h-4 mr-2" />
              Cuenta de cobro
            </Link>
          </Button>
          {isLate && (
            <Button
              variant="ghost"
              className="w-full text-danger hover:bg-danger-soft dark:hover:bg-danger/20"
              onClick={handleMarkDefaulted}
            >
              <XCircle className="w-4 h-4 mr-2" />
              {t('inmobiliaria.cobros.detail.markDefaulted')}
            </Button>
          )}
        </motion.div>
      </SheetContent>
    </Sheet>
  );
}

export default CobroDetail;
