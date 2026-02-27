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
  return new Date(monthStr + '-01').toLocaleDateString(loc === 'es' ? 'es-CL' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });
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
  const { config: agencyConfig } = useInmobiliariaConfig();
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
        'bg-white dark:bg-card rounded-xl border border-border overflow-hidden print:shadow-none print:border-0',
        className
      )}
    >
      {/* Header - Inmobiliaria Info */}
      <div className="p-6 border-b border-border bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 print:bg-transparent">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-indigo-600 flex items-center justify-center">
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
            <Badge variant="outline" className="text-indigo-600 border-indigo-300 dark:border-indigo-800">
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
              <User className="w-4 h-4 text-indigo-600" />
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
                <Bank className="w-4 h-4 text-indigo-600" />
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
          <Receipt className="w-4 h-4 text-indigo-600" />
          {t('inmobiliaria.propietario.extracto.propertyDetail')}
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
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
                <TableHead className="text-right font-semibold">{t('inmobiliaria.propietario.extracto.thNet')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {extracto.properties.map((prop, index) => {
                const StatusIcon = getStatusIcon(prop.paymentStatus);
                return (
                  <motion.tr
                    key={prop.propertyId}
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
                      {prop.tenantName}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatCurrency(prop.rentAmount)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {prop.adminAmount > 0 ? formatCurrency(prop.adminAmount) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {formatCurrency(prop.totalCollected)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                        getCobroStatusColor(prop.paymentStatus)
                      )}>
                        <StatusIcon className="w-3 h-3" weight="fill" />
                        {t(STATUS_LABEL_KEYS[prop.paymentStatus])}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-xs font-medium text-muted-foreground">
                        {prop.commissionPercent}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm text-indigo-600 dark:text-indigo-400">
                      {formatCurrency(prop.commissionAmount)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(prop.netAmount)}
                    </TableCell>
                  </motion.tr>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={4} className="text-foreground">
                  {t('inmobiliaria.propietario.extracto.total')} ({extracto.summary.totalProperties} {t('inmobiliaria.propietario.extracto.properties')})
                </TableCell>
                <TableCell className="text-right text-foreground">
                  {formatCurrency(extracto.summary.totalCollected)}
                </TableCell>
                <TableCell />
                <TableCell />
                <TableCell className="text-right text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(extracto.summary.totalCommissions)}
                </TableCell>
                <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(extracto.summary.netToPropietario)}
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
          <div className="p-6 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-2">
              <CurrencyCircleDollar className="w-5 h-5" weight="fill" />
              {t('inmobiliaria.propietario.extracto.netToReceive')}
            </div>
            <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
              {formatCurrency(extracto.summary.netToPropietario)}
            </p>
            {extracto.summary.paymentReference && (
              <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-2">
                {t('inmobiliaria.propietario.extracto.reference')}: {extracto.summary.paymentReference}
              </p>
            )}
          </div>

          {/* Payment Details */}
          <div className="p-6 rounded-xl bg-muted/50 border border-border">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('inmobiliaria.propietario.extracto.totalCollected')}</span>
                <span className="text-sm font-medium text-foreground">
                  {formatCurrency(extracto.summary.totalCollected)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('inmobiliaria.propietario.extracto.agencyCommissions')}</span>
                <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                  -{formatCurrency(extracto.summary.totalCommissions)}
                </span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{t('inmobiliaria.propietario.extracto.totalNet')}</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(extracto.summary.netToPropietario)}
                  </span>
                </div>
              </div>
              {extracto.summary.paymentDate && (
                <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
                  <span>{t('inmobiliaria.propietario.extracto.paymentDate')}</span>
                  <span>{formatDate(extracto.summary.paymentDate, locale)}</span>
                </div>
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
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isDownloading ? (
              <>
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
