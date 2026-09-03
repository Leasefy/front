'use client';

import * as React from 'react';
import { AlertaAccionable } from '@/components/ui/alerta-accionable';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
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
  Bank,
  ArrowRight,
  Lightning,
  ArrowClockwise,
  FileText,
  Receipt,
  Check,
  XCircle,
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
import type { Dispersion, DispersionStatus } from '@/lib/types/inmobiliaria';
import { usePropietarios, useInmobiliariaConfig } from '@/lib/hooks/useInmobiliaria';
import { apiClient } from '@/lib/api/client';
import { ComisionDesglose } from './ComisionDesglose';
import { nombreDelMes } from '@/lib/utils/mes';

interface DispersionDetailProps {
  isOpen: boolean;
  onClose: () => void;
  dispersion: Dispersion | null;
  onProcess?: (dispersion: Dispersion) => void;
  onViewExtracto?: (dispersion: Dispersion) => void;
  onRetry?: (dispersion: Dispersion) => void;
}

// Status icons
const STATUS_ICONS: Record<DispersionStatus, React.ElementType> = {
  pending: Clock,
  processing: ArrowClockwise,
  completed: CheckCircle,
  failed: XCircle,
};

/**
 * CopyButton - Button that copies text to clipboard
 */
function CopyButton({ text, toastLabel, tooltip }: { text: string; toastLabel: string; tooltip: string }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    toast.success(toastLabel);
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
 * StatusBadge - Badge showing dispersion status with appropriate color
 */
function StatusBadge({ status, label }: { status: DispersionStatus; label: string }) {
  const Icon = STATUS_ICONS[status];
  const STATUS_VARIANT = {
    pending: 'warning',
    processing: 'default',
    completed: 'success',
    failed: 'destructive',
  } as const;
  return (
    <Badge variant={STATUS_VARIANT[status]} className="gap-1.5">
      <Icon className="w-4 h-4" weight="fill" />
      {label}
    </Badge>
  );
}

/**
 * TimelineEvent - Single event in the status timeline
 */
function TimelineEvent({
  icon: Icon,
  title,
  date,
  formattedDate,
  description,
  isLast,
  isActive,
  isError,
}: {
  icon: React.ElementType;
  title: string;
  date?: string;
  formattedDate?: string;
  description?: string;
  isLast?: boolean;
  isActive?: boolean;
  isError?: boolean;
}) {
  return (
    <div className="flex gap-4">
      {/* Timeline dot and line */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center',
            isError
              ? 'bg-danger-soft'
              : isActive
              ? 'bg-success-soft'
              : date
              ? 'bg-primary-soft'
              : 'bg-muted'
          )}
        >
          <Icon
            className={cn(
              'w-4 h-4',
              isError
                ? 'text-danger'
                : isActive
                ? 'text-success'
                : date
                ? 'text-primary'
                : 'text-muted-foreground'
            )}
            weight={date || isActive || isError ? 'fill' : 'regular'}
          />
        </div>
        {!isLast && (
          <div
            className={cn(
              'w-0.5 flex-1 min-h-[24px]',
              date ? 'bg-primary-soft' : 'bg-muted'
            )}
          />
        )}
      </div>

      {/* Event content */}
      <div className="flex-1 pb-4">
        <p
          className={cn(
            'text-sm font-medium',
            isError
              ? 'text-danger'
              : date || isActive
              ? 'text-foreground'
              : 'text-muted-foreground'
          )}
        >
          {title}
        </p>
        {date && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {formattedDate || date}
          </p>
        )}
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    </div>
  );
}

/**
 * DispersionDetail - Sheet drawer showing full dispersion information
 * Includes propietario info, commission breakdown, status timeline, and actions
 */
export function DispersionDetail({
  isOpen,
  onClose,
  dispersion,
  onProcess,
  onViewExtracto,
  onRetry,
}: DispersionDetailProps) {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = React.useState(false);
  const { t, formatDate, formatCurrency } = useI18n();
  const { config } = useInmobiliariaConfig();

  // Get propietario details
  const { propietarios } = usePropietarios();
  const propietario = React.useMemo(() => {
    if (!dispersion) return null;
    return propietarios.find((p) => p.id === dispersion.propietarioId) ?? null;
  }, [dispersion, propietarios]);

  // Handle process dispersion
  const handleProcess = async () => {
    if (!dispersion || !onProcess) return;

    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    onProcess(dispersion);
    toast.success(t('inmobiliaria.dispersiones.toasts.dispersionProcessed'), {
      description: t('inmobiliaria.dispersiones.toasts.transferTo', { name: dispersion.propietarioName }),
    });
    setIsProcessing(false);
  };

  // Handle retry failed dispersion
  const handleRetry = async () => {
    if (!dispersion || !onRetry) return;

    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    onRetry(dispersion);
    toast.success(t('inmobiliaria.dispersiones.toasts.retryStarted'), {
      description: t('inmobiliaria.dispersiones.toasts.processingFor', { name: dispersion.propietarioName }),
    });
    setIsProcessing(false);
  };

  // Handle download PDF
  const handleDownloadPDF = async () => {
    if (!dispersion) return;

    setIsDownloadingPDF(true);
    try {
      const blob = await apiClient.getBlob(`/inmobiliaria/dispersiones/${dispersion.id}/extracto.pdf`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = dispersion.propietarioName.replace(/\s+/g, '-').toLowerCase();
      a.download = `extracto-${safeName}-${dispersion.month}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t('inmobiliaria.dispersiones.toasts.pdfDownloaded'), {
        description: t('inmobiliaria.dispersiones.toasts.pdfDownloadedDesc', { name: dispersion.propietarioName }),
      });
    } catch {
      toast.error(t('inmobiliaria.dispersiones.toasts.downloadError'));
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  // Handle view extracto
  const handleViewExtracto = () => {
    if (!dispersion || !onViewExtracto) return;
    onViewExtracto(dispersion);
  };

  if (!dispersion) return null;

  const isPending = dispersion.status === 'pending';
  const isFailed = dispersion.status === 'failed';
  const isCompleted = dispersion.status === 'completed';

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        {/* Header */}
        <SheetHeader className="p-6 pb-4 border-b border-border sticky top-0 bg-background z-10">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <SheetTitle className="text-lg font-semibold text-foreground">
                {dispersion.propietarioName}
              </SheetTitle>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 capitalize">
                <Calendar className="w-4 h-4" />
                {nombreDelMes(dispersion.month)}
              </p>
            </div>
            <StatusBadge status={dispersion.status} label={t(`inmobiliaria.dispersiones.statusLabels.${dispersion.status}`)} />
          </div>
        </SheetHeader>

        <div className="p-6 space-y-6">
          {/* Propietario Section */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              {t('inmobiliaria.dispersiones.detailView.propietario')}
            </h3>
            <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary-soft flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{dispersion.propietarioName}</p>
                  {propietario && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Envelope className="w-3.5 h-3.5" />
                      <span>{propietario.email ?? '—'}</span>
                      {propietario.email && (
                        <CopyButton text={propietario.email} toastLabel={t('inmobiliaria.dispersiones.toasts.copiedToClipboard')} tooltip={t('inmobiliaria.dispersiones.detailView.copyTooltip')} />
                      )}
                    </div>
                  )}
                </div>
              </div>
              {propietario && (
                <div className="flex flex-wrap gap-2">
                  {propietario.phone && (
                    <ContactAction
                      icon={Phone}
                      href={`tel:${propietario.phone}`}
                      label={t('inmobiliaria.dispersiones.detailView.call')}
                      className="bg-muted hover:bg-muted/80 text-foreground"
                    />
                  )}
                  {propietario.phone && (
                    <ContactAction
                      icon={WhatsappLogo}
                      href={`https://wa.me/${propietario.phone.replace(/\D/g, '')}`}
                      label="WhatsApp"
                      className="bg-success-soft hover:bg-success-soft text-success dark:bg-success/30 dark:hover:bg-success/50 dark:text-success"
                    />
                  )}
                  {propietario.email && (
                    <ContactAction
                      icon={Envelope}
                      href={`mailto:${propietario.email}`}
                      label={t('inmobiliaria.dispersiones.detailView.email')}
                      className="bg-primary-soft hover:bg-primary-soft text-primary dark:bg-primary/30 dark:hover:bg-primary/50 dark:text-primary"
                    />
                  )}
                </div>
              )}
            </div>
          </motion.section>

          {/* Bank Account Section */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="space-y-3"
          >
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Bank className="w-4 h-4 text-primary" />
              {t('inmobiliaria.dispersiones.detailView.bankAccount')}
            </h3>
            <div className="p-4 rounded-lg border border-border bg-muted/30">
              {!dispersion.propietarioBankAccount ? (
                /* Un propietario sin cuenta es normal y hay que decirlo: sin
                   esto no se le puede girar, y en blanco parece un error de
                   carga en vez de un dato que falta pedirle. */
                <AlertaAccionable
                  severidad="danger"
                  titulo="Sin cuenta bancaria: no se le puede girar"
                  accion={{
                    label: 'Cargar cuenta bancaria',
                    href: `/panel/inmobiliaria/propietarios/${dispersion.propietarioId}?volver=${encodeURIComponent('/panel/inmobiliaria/dispersiones')}`,
                  }}
                  data-testid="dispersion-sin-cuenta"
                >
                  Pedile al propietario banco, tipo, número y titular, y cargalos en su ficha. Hasta entonces
                  este giro queda esperando.
                </AlertaAccionable>
              ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">{t('inmobiliaria.dispersiones.detailView.bank')}</p>
                  <p className="text-sm font-medium text-foreground capitalize">
                    {dispersion.propietarioBankAccount.bank.replace(/_/g, ' ')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('inmobiliaria.dispersiones.detailView.accountType')}</p>
                  <p className="text-sm font-medium text-foreground capitalize">
                    {dispersion.propietarioBankAccount.accountType === 'savings' ? t('inmobiliaria.dispersiones.detailView.savings') : t('inmobiliaria.dispersiones.detailView.checking')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('inmobiliaria.dispersiones.detailView.accountNumber')}</p>
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium text-foreground font-mono">
                      {dispersion.propietarioBankAccount.accountNumber}
                    </p>
                    <CopyButton text={dispersion.propietarioBankAccount.accountNumber} toastLabel={t('inmobiliaria.dispersiones.toasts.copiedToClipboard')} tooltip={t('inmobiliaria.dispersiones.detailView.copyTooltip')} />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('inmobiliaria.dispersiones.detailView.accountHolder')}</p>
                  <p className="text-sm font-medium text-foreground truncate">
                    {dispersion.propietarioBankAccount.accountHolder}
                  </p>
                </div>
              </div>
              )}
            </div>
          </motion.section>

          {/* Amount Summary Section */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-3"
          >
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CurrencyCircleDollar className="w-4 h-4 text-primary" />
              {t('inmobiliaria.dispersiones.detailView.summaryTitle')}
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground mb-1">{t('inmobiliaria.dispersiones.detailView.collected')}</p>
                <p className="text-lg font-bold text-foreground">
                  {formatCurrency(dispersion.totalCollected)}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-primary-soft text-center">
                <p className="text-xs text-primary mb-1">{t('inmobiliaria.dispersiones.detailView.commission')}</p>
                <p className="text-lg font-bold text-primary">
                  {formatCurrency(dispersion.totalCommission)}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-success-soft text-center">
                <p className="text-xs text-success mb-1">{t('inmobiliaria.dispersiones.detailView.net')}</p>
                <p className="text-lg font-bold text-success">
                  {formatCurrency(dispersion.netToPropietario)}
                </p>
              </div>
            </div>
          </motion.section>

          {/* Commission Breakdown Section */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="space-y-3"
          >
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              {t('inmobiliaria.dispersiones.detailView.propertyBreakdown')}
            </h3>
            <ComisionDesglose
              items={dispersion.items}
              variant="compact"
              showPercentages={true}
            />
          </motion.section>

          {/* Status Timeline Section */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              {t('inmobiliaria.dispersiones.detailView.history')}
            </h3>
            <div className="p-4 rounded-lg border border-border bg-muted/30">
              <TimelineEvent
                icon={Calendar}
                title={t('inmobiliaria.dispersiones.detailView.created')}
                date={dispersion.createdAt}
                formattedDate={dispersion.createdAt ? formatDate(dispersion.createdAt, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : undefined}
              />
              {dispersion.approvedAt && (
                <TimelineEvent
                  icon={Check}
                  title={t('inmobiliaria.dispersiones.detailView.approved')}
                  date={dispersion.approvedAt}
                  formattedDate={dispersion.approvedAt ? formatDate(dispersion.approvedAt, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : undefined}
                  description={dispersion.approvedBy ? t('inmobiliaria.dispersiones.detailView.approvedBy', { name: dispersion.approvedBy }) : undefined}
                />
              )}
              {dispersion.processedAt && (
                <TimelineEvent
                  icon={CheckCircle}
                  title={t('inmobiliaria.dispersiones.detailView.processed')}
                  date={dispersion.processedAt}
                  formattedDate={dispersion.processedAt ? formatDate(dispersion.processedAt, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : undefined}
                  description={dispersion.transferReference ? t('inmobiliaria.dispersiones.detailView.transferRef', { ref: dispersion.transferReference }) : undefined}
                  isActive={isCompleted}
                />
              )}
              {isFailed && (
                <TimelineEvent
                  icon={XCircle}
                  title={t('inmobiliaria.dispersiones.detailView.failedEvent')}
                  date={dispersion.updatedAt}
                  formattedDate={dispersion.updatedAt ? formatDate(dispersion.updatedAt, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : undefined}
                  description={dispersion.failureReason || t('inmobiliaria.dispersiones.detailView.defaultFailureReason')}
                  isLast
                  isError
                />
              )}
              {isPending && (
                <TimelineEvent
                  icon={Clock}
                  title={t('inmobiliaria.dispersiones.detailView.pendingProcessing')}
                  isLast
                />
              )}
              {isCompleted && !dispersion.processedAt && (
                <TimelineEvent
                  icon={CheckCircle}
                  title={t('inmobiliaria.dispersiones.detailView.completedEvent')}
                  date={dispersion.updatedAt}
                  formattedDate={dispersion.updatedAt ? formatDate(dispersion.updatedAt, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : undefined}
                  isLast
                  isActive
                />
              )}
            </div>
          </motion.section>

          {/* Transfer Reference (if completed) */}
          {isCompleted && dispersion.transferReference && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="p-4 rounded-lg bg-success-soft border border-success/30 dark:border-success/40"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-success font-medium">
                    {t('inmobiliaria.dispersiones.detailView.transferReference')}
                  </p>
                  <p className="text-sm font-mono font-semibold text-success mt-0.5">
                    {dispersion.transferReference}
                  </p>
                </div>
                <CopyButton text={dispersion.transferReference} toastLabel={t('inmobiliaria.dispersiones.toasts.copiedToClipboard')} tooltip={t('inmobiliaria.dispersiones.detailView.copyTooltip')} />
              </div>
            </motion.section>
          )}

          {/* Error Message (if failed) */}
          {isFailed && dispersion.failureReason && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="p-4 rounded-lg bg-danger-soft border border-danger/30 dark:border-danger/40"
            >
              <div className="flex items-start gap-3">
                <Warning className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" weight="fill" />
                <div>
                  <p className="text-sm font-medium text-danger">
                    {t('inmobiliaria.dispersiones.detailView.transferError')}
                  </p>
                  <p className="text-sm text-danger mt-1">
                    {dispersion.failureReason}
                  </p>
                </div>
              </div>
            </motion.section>
          )}
        </div>

        {/* Actions Footer */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="sticky bottom-0 p-6 border-t border-border bg-background space-y-3"
        >
          <div className="flex gap-3">
            {/* View extracto button (secondary - left) */}
            {onViewExtracto && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleViewExtracto}
              >
                <FileText className="w-4 h-4 mr-2" />
                {t('inmobiliaria.dispersiones.detailView.viewExtracto')}
              </Button>
            )}

            {/* Process button (primary - right) */}
            {isPending && onProcess && (
              <Button
                className="flex-1 bg-primary hover:opacity-90 text-primary-fg"
                onClick={handleProcess}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <Spinner size="sm" variant="current" />
                    {t('inmobiliaria.dispersiones.detailView.processingAction')}
                  </span>
                ) : (
                  <>
                    <Lightning className="w-4 h-4 mr-2" weight="fill" />
                    {t('inmobiliaria.dispersiones.detailView.processDispersion')}
                  </>
                )}
              </Button>
            )}

            {/* Retry button (failed - right) */}
            {isFailed && onRetry && (
              <Button
                className="flex-1 bg-warning hover:bg-warning text-white"
                onClick={handleRetry}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <Spinner size="sm" variant="current" />
                    {t('inmobiliaria.dispersiones.detailView.retrying')}
                  </span>
                ) : (
                  <>
                    <ArrowClockwise className="w-4 h-4 mr-2" />
                    {t('inmobiliaria.dispersiones.detailView.retry')}
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Download PDF button */}
          <Button
            variant="ghost"
            className="w-full text-primary hover:text-primary dark:hover:text-primary hover:bg-primary-soft dark:hover:bg-primary/20"
            onClick={handleDownloadPDF}
            disabled={isDownloadingPDF}
          >
            {isDownloadingPDF ? (
              <span className="flex items-center gap-2">
                <Spinner size="sm" variant="current" />
                {t('inmobiliaria.dispersiones.detailView.downloading')}
              </span>
            ) : (
              <>
                <CurrencyCircleDollar className="w-4 h-4 mr-2" />
                {t('inmobiliaria.dispersiones.detailView.downloadPdfExtracto')}
              </>
            )}
          </Button>
        </motion.div>
      </SheetContent>
    </Sheet>
  );
}

export default DispersionDetail;
