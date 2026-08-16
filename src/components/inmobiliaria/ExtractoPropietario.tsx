'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Download,
  Printer,
  Envelope,
  Calendar,
  Buildings,
  User,
  CurrencyCircleDollar,
  CheckCircle,
  Clock,
  Warning,
  Bank,
  Receipt,
  FileText,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import type { ExtractoPropietario as ExtractoPropietarioType, CobroStatus } from '@/lib/types/inmobiliaria';
import { formatCurrency, getCobroStatusColor } from '@/lib/types/inmobiliaria';
import { usePropietarios, useInmobiliariaConfig } from '@/lib/hooks/useInmobiliaria';
import { nombreDelMes } from '@/lib/utils/mes';

interface ExtractoPropietarioProps {
  extracto: ExtractoPropietarioType;
  onDownloadPDF?: () => void;
  onPrint?: () => void;
  onEmail?: () => void;
  className?: string;
}

// Status label keys for i18n
const STATUS_LABEL_KEYS: Record<CobroStatus, string> = {
  pending: 'inmobiliaria.propietario.extracto.statusPending',
  paid: 'inmobiliaria.propietario.extracto.statusPaid',
  partial: 'inmobiliaria.propietario.extracto.statusPartial',
  late: 'inmobiliaria.propietario.extracto.statusLate',
  defaulted: 'inmobiliaria.propietario.extracto.statusDefaulted',
};

/**
 * El estado del cobro llega del back en MAYÚSCULAS y con el prefijo del enum
 * (`COBRO_PENDING`). Las etiquetas y los colores del front se indexan por el
 * nombre en minúscula: sin traducirlo, `STATUS_LABEL_KEYS[status]` devuelve
 * undefined y la celda queda en blanco.
 */
function aCobroStatus(status: string): CobroStatus {
  switch (status) {
    case 'PAID':
      return 'paid';
    case 'PARTIAL':
      return 'partial';
    case 'LATE':
      return 'late';
    case 'DEFAULTED':
      return 'defaulted';
    default:
      return 'pending';
  }
}

/**
 * Los conceptos de una línea, con signo.
 *
 * Un guión cuando no hay ninguno: la celda vacía se lee como «falta el dato»
 * cuando lo que pasa es que no hay nada que sumar ni descontar.
 */
function ConceptosDeLaLinea({
  aFavor,
  aCargo,
}: {
  aFavor: number;
  aCargo: number;
}) {
  if (aFavor === 0 && aCargo === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      {aFavor > 0 && (
        <span className="tabular-nums text-foreground">
          {formatCurrency(aFavor)}
        </span>
      )}
      {aCargo > 0 && (
        <span className="tabular-nums text-destructive">
          -{formatCurrency(aCargo)}
        </span>
      )}
    </span>
  );
}

/**
 * Get status icon
 */
function getStatusIcon(status: CobroStatus) {
  switch (status) {
    case 'paid':
      return CheckCircle;
    case 'partial':
    case 'pending':
      return Clock;
    case 'late':
    case 'defaulted':
      return Warning;
    default:
      return Clock;
  }
}

/**
 * Format month for display
 */
function formatMonthYear(monthStr: string, loc: string): string {
  // `new Date('2026-08-01')` es medianoche UTC: al pintarlo en hora local
  // (Colombia, UTC-5) retrocede al 31 de julio y el extracto decía «Julio de
  // 2026» sobre los cobros de agosto. Ver lib/utils/mes.
  return nombreDelMes(monthStr, loc === 'en' ? 'en' : 'es');
}

/**
 * Format date for display
 */
function formatDate(dateStr: string, loc: string): string {
  return new Date(dateStr).toLocaleDateString(loc === 'es' ? 'es-CL' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format date short
 */
function formatDateShort(dateStr: string | undefined, loc: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString(loc === 'es' ? 'es-CL' : 'en-US', {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * ExtractoPropietario - Owner statement view with printable styling
 * Shows property breakdown, commissions, and net amounts
 */
export function ExtractoPropietario({
  extracto,
  onDownloadPDF,
  onPrint,
  onEmail,
  className,
}: ExtractoPropietarioProps) {
  const { t, locale } = useI18n();
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [isSendingEmail, setIsSendingEmail] = React.useState(false);

  // Get propietario details for bank info
  const { propietarios } = usePropietarios();
  const { config } = useInmobiliariaConfig();
  // Real agency profile lives under the `agency` key of GET /inmobiliaria/config.
  const agencyConfig = config?.agency;
  const propietario = React.useMemo(() => {
    return propietarios.find((p) => p.id === extracto.propietarioId);
  }, [extracto.propietarioId, propietarios]);

  // Handle PDF download
  const handleDownloadPDF = async () => {
    if (onDownloadPDF) {
      setIsDownloading(true);
      try {
        onDownloadPDF();
        toast.success(t('inmobiliaria.propietario.extracto.pdfDownloaded'), {
          description: `${t('inmobiliaria.propietario.extracto.extractOf')} ${extracto.propietarioName} - ${formatMonthYear(extracto.month, locale)}`,
        });
      } catch {
        toast.error(t('inmobiliaria.propietario.extracto.pdfError'));
      } finally {
        setIsDownloading(false);
      }
    }
  };

  // Handle print
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  // Handle email
  const handleEmail = async () => {
    if (onEmail) {
      setIsSendingEmail(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
        onEmail();
        toast.success(t('inmobiliaria.propietario.extracto.emailSent'), {
          description: `${t('inmobiliaria.propietario.extracto.emailSentTo')} ${propietario?.email || extracto.propietarioName}`,
        });
      } catch {
        toast.error(t('inmobiliaria.propietario.extracto.emailError'));
      } finally {
        setIsSendingEmail(false);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        /*
         * `min-w-0` NO es decorativo: dentro de un grid o un flex, un hijo no
         * encoge por debajo de su contenido salvo que se le diga. Sin esto la
         * tarjeta medía más que el modal (1059px en 1024) y la tabla se salía
         * por la derecha en vez de scrollear en su propio contenedor.
         */
        'min-w-0 bg-surface dark:bg-card rounded-xl border border-border overflow-hidden print:shadow-none print:border-0',
        className
      )}
    >
      {/* Header - Inmobiliaria Info */}
      <div className="p-6 border-b border-border bg-gradient-to-r from-primary to-primary dark:from-primary/30 dark:to-primary/30 print:bg-transparent">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center">
              <Buildings className="w-7 h-7 text-white" weight="fill" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {agencyConfig?.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                NIT: {agencyConfig?.nit}
              </p>
              <p className="text-sm text-muted-foreground">
                {agencyConfig?.address}, {agencyConfig?.city}
              </p>
            </div>
          </div>
          <div className="text-right">
            <Badge variant="outline" className="text-primary border-primary/30 dark:border-primary/40">
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              {t('inmobiliaria.propietario.extracto.statement')}
            </Badge>
          </div>
        </div>
      </div>

      {/* Title & Period */}
      <div className="p-6 border-b border-border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {t('inmobiliaria.propietario.extracto.ownerStatement')}
            </h2>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {t('inmobiliaria.propietario.extracto.period')}: <span className="font-medium text-foreground capitalize">{formatMonthYear(extracto.month, locale)}</span>
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>{t('inmobiliaria.propietario.extracto.generated')}: {formatDate(extracto.generatedAt, locale)}</p>
          </div>
        </div>
      </div>

      {/* Propietario Info */}
      <div className="p-6 border-b border-border bg-muted/30">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <User className="w-4 h-4 text-primary" />
              {t('inmobiliaria.propietario.extracto.ownerInfo')}
            </div>
            <div className="pl-6 space-y-2">
              <p className="text-foreground font-medium">{extracto.propietarioName}</p>
              {propietario && (
                <>
                  <p className="text-sm text-muted-foreground">
                    {propietario.documentType}: {propietario.documentNumber}
                  </p>
                  <p className="text-sm text-muted-foreground">{propietario.email}</p>
                  <p className="text-sm text-muted-foreground">{propietario.phone}</p>
                </>
              )}
            </div>
          </div>

          {/* Bank Account */}
          {propietario && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Bank className="w-4 h-4 text-primary" />
                {t('inmobiliaria.propietario.extracto.bankAccount')}
              </div>
              <div className="pl-6 space-y-2">
                <p className="text-foreground font-medium capitalize">
                  {propietario.bankAccount.bank.replace(/_/g, ' ')}
                </p>
                <p className="text-sm text-muted-foreground capitalize">
                  {propietario.bankAccount.accountType === 'savings' ? t('inmobiliaria.propietario.extracto.savings') : t('inmobiliaria.propietario.extracto.checking')}: {propietario.bankAccount.accountNumber}
                </p>
                <p className="text-sm text-muted-foreground">
                  {propietario.bankAccount.accountHolder}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Properties Table */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-4">
          <Receipt className="w-4 h-4 text-primary" />
          {t('inmobiliaria.propietario.extracto.propertyDetail')}
        </div>
        <div
          className="overflow-x-auto rounded-md border border-border"
          data-lenis-prevent
        >
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-muted/50">
                <TableHead className="w-[25%]">{t('inmobiliaria.propietario.extracto.thProperty')}</TableHead>
                <TableHead>{t('inmobiliaria.propietario.extracto.thTenant')}</TableHead>
                <TableHead className="text-right">{t('inmobiliaria.propietario.extracto.thRent')}</TableHead>
                <TableHead className="text-right">{t('inmobiliaria.propietario.extracto.thAdmin')}</TableHead>
                <TableHead className="text-right">{t('inmobiliaria.propietario.extracto.thCollected')}</TableHead>
                <TableHead className="text-center">{t('inmobiliaria.propietario.extracto.thStatus')}</TableHead>
                <TableHead className="text-center">{t('inmobiliaria.propietario.extracto.thCommPct')}</TableHead>
                <TableHead className="text-right">{t('inmobiliaria.propietario.extracto.thCommission')}</TableHead>
                <TableHead className="text-right">Conceptos</TableHead>
                <TableHead className="text-right font-semibold">{t('inmobiliaria.propietario.extracto.thNet')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {extracto.lineItems.map((prop, index) => {
                const estado = aCobroStatus(prop.status);
                const StatusIcon = getStatusIcon(estado);
                return (
                  <motion.tr
                    key={prop.cobroId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-muted/30"
                  >
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="text-foreground text-sm truncate max-w-[180px]">
                          {prop.propertyTitle}
                        </span>
                        <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {prop.propertyAddress}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {prop.tenantName ?? '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatCurrency(prop.rentAmount)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {prop.adminAmount > 0 ? formatCurrency(prop.adminAmount) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {/* El canon recaudado, NO todo lo que puso el inquilino:
                          la administración es de la copropiedad. */}
                      {formatCurrency(prop.rentCollected)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                        getCobroStatusColor(estado)
                      )}>
                        <StatusIcon className="w-3 h-3" weight="fill" />
                        {t(STATUS_LABEL_KEYS[estado])}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-xs font-medium text-muted-foreground">
                        {prop.commissionPercent}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm text-primary">
                      {formatCurrency(prop.commissionAmount)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      <ConceptosDeLaLinea
                        aFavor={prop.conceptosAFavor}
                        aCargo={prop.conceptosACargo}
                      />
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold text-success">
                      {formatCurrency(prop.netAmount)}
                    </TableCell>
                  </motion.tr>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={4} className="text-foreground">
                  {t('inmobiliaria.propietario.extracto.total')} ({extracto.lineItems.length} {t('inmobiliaria.propietario.extracto.properties')})
                </TableCell>
                <TableCell className="text-right text-foreground">
                  {formatCurrency(extracto.totals.totalNet + extracto.totals.totalCommission + extracto.totals.totalConceptosACargo - extracto.totals.totalConceptosAFavor)}
                </TableCell>
                <TableCell />
                <TableCell />
                <TableCell className="text-right text-primary">
                  {formatCurrency(extracto.totals.totalCommission)}
                </TableCell>
                <TableCell className="text-right">
                  <ConceptosDeLaLinea
                    aFavor={extracto.totals.totalConceptosAFavor}
                    aCargo={extracto.totals.totalConceptosACargo}
                  />
                </TableCell>
                <TableCell className="text-right text-success">
                  {formatCurrency(extracto.totals.totalNet)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </div>

      {/* Summary Section */}
      <div className="p-6 border-b border-border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Net Amount Highlight */}
          <div className="p-6 rounded-xl bg-success-soft border border-success/30 dark:border-success/40">
            <div className="flex items-center gap-2 text-sm font-medium text-success mb-2">
              <CurrencyCircleDollar className="w-5 h-5" weight="fill" />
              {t('inmobiliaria.propietario.extracto.netToReceive')}
            </div>
            <p className="text-3xl font-bold text-success">
              {formatCurrency(extracto.totals.totalNet)}
            </p>
          </div>

          {/* Payment Details */}
          <div className="p-6 rounded-xl bg-muted/50 border border-border">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Canon recaudado</span>
                <span className="text-sm font-medium text-foreground">
                  {formatCurrency(
                    extracto.lineItems.reduce((s, l) => s + l.rentCollected, 0),
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('inmobiliaria.propietario.extracto.agencyCommissions')}</span>
                <span className="text-sm font-medium text-primary">
                  -{formatCurrency(extracto.totals.totalCommission)}
                </span>
              </div>
              {extracto.totals.totalConceptosAFavor > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Conceptos a su favor</span>
                  <span className="text-sm font-medium text-foreground">
                    {formatCurrency(extracto.totals.totalConceptosAFavor)}
                  </span>
                </div>
              )}
              {extracto.totals.totalConceptosACargo > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Conceptos a su cargo</span>
                  <span className="text-sm font-medium text-destructive">
                    -{formatCurrency(extracto.totals.totalConceptosACargo)}
                  </span>
                </div>
              )}
              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{t('inmobiliaria.propietario.extracto.totalNet')}</span>
                  <span className="text-sm font-bold text-success">
                    {formatCurrency(extracto.totals.totalNet)}
                  </span>
                </div>
              </div>
              {extracto.totals.totalDeTerceros > 0 && (
                /* Nombrar lo que entró y no es suyo. Sin esto, un propietario
                   que sabe que su inquilino pagó $1.230.000 ve $900.000 y
                   asume que le están robando la diferencia. */
                <p className="border-t border-border pt-3 text-xs text-muted-foreground">
                  Además se recaudaron{' '}
                  <strong className="text-foreground">
                    {formatCurrency(extracto.totals.totalDeTerceros)}
                  </strong>{' '}
                  de administración y otros conceptos que no son del
                  propietario: se giran a la copropiedad o a quien corresponda.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions Footer - Hide on print */}
      <div className="p-6 bg-muted/30 print:hidden">
        <div className="flex flex-wrap gap-3 justify-end">
          <Button
            variant="outline"
            onClick={handlePrint}
            className="gap-2"
          >
            <Printer className="w-4 h-4" />
            {t('inmobiliaria.propietario.extracto.print')}
          </Button>
          <Button
            variant="outline"
            onClick={handleEmail}
            disabled={isSendingEmail || !propietario?.email}
            className="gap-2"
          >
            {isSendingEmail ? (
              <>
                <Spinner size="sm" variant="current" />
                {t('inmobiliaria.propietario.extracto.sending')}
              </>
            ) : (
              <>
                <Envelope className="w-4 h-4" />
                {t('inmobiliaria.propietario.extracto.sendEmail')}
              </>
            )}
          </Button>
          <Button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="gap-2 bg-primary hover:opacity-90 text-primary-fg"
          >
            {isDownloading ? (
              <>
                <Spinner size="sm" variant="current" />
                {t('inmobiliaria.propietario.extracto.downloading')}
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                {t('inmobiliaria.propietario.extracto.downloadPDF')}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Print Footer */}
      <div className="hidden print:block p-6 text-center text-xs text-muted-foreground border-t border-border">
        <p>{agencyConfig?.name} - NIT {agencyConfig?.nit}</p>
        <p>{agencyConfig?.address}, {agencyConfig?.city}</p>
        <p className="mt-2">{t('inmobiliaria.propietario.extracto.documentGenerated')} {formatDate(extracto.generatedAt, locale)}</p>
      </div>
    </motion.div>
  );
}

export default ExtractoPropietario;
