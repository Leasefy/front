'use client';

import * as React from 'react';
import { toast } from '@/components/ui/toast';
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
import { TablePagination } from '@/components/ui/pagination';
import {
  PAGE_SIZE_OPTIONS,
  useTablePagination,
} from '@/lib/hooks/use-table-pagination';
import type { ExtractoPropietario as ExtractoPropietarioType, CobroStatus } from '@/lib/types/inmobiliaria';
import { formatCurrency, getCobroStatusColor } from '@/lib/types/inmobiliaria';
import { usePropietarios, useInmobiliariaConfig } from '@/lib/hooks/useInmobiliaria';
import { nombreDelMes } from '@/lib/utils/mes';

interface ExtractoPropietarioProps {
  extracto: ExtractoPropietarioType;
  /** Baja el PDF. Sin esto el botón no se muestra: un botón que no hace nada es peor que ninguno. */
  onDownloadPDF?: () => void | Promise<void>;
  onPrint?: () => void;
  /** Manda el extracto al correo del propietario. Sin esto el botón no se muestra. */
  onEmail?: () => void | Promise<void>;
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
  // Sólo la inicial en mayúscula: con `capitalize` de CSS salía «Septiembre De 2026».
  const nombre = nombreDelMes(monthStr, loc === 'en' ? 'en' : 'es');
  return nombre.charAt(0).toUpperCase() + nombre.slice(1);
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

  /*
   * El detalle por inmueble se pagina; los TOTALES no. El pie de la tabla y el
   * resumen de abajo siguen leyendo `extracto.totals` y `extracto.lineItems`
   * completos: un extracto que sumara sólo la página que estás mirando estaría
   * diciendo que al propietario le corresponde menos plata de la que es.
   *
   * `resetKey` con propietario + mes: al abrir el extracto de otro propietario
   * (o de otro mes) se arranca en la página 1, no en la que quedó del anterior.
   */
  const {
    pageItems: lineasDeLaPagina,
    total: totalLineas,
    page,
    pageSize,
    setPage,
    setPageSize,
    shouldPaginate,
  } = useTablePagination(extracto.lineItems, {
    resetKey: `${extracto.propietarioId}|${extracto.month}`,
  });

  // Handle PDF download — se espera al handler: el «PDF descargado» se dice
  // cuando bajó, no cuando se apretó el botón.
  const handleDownloadPDF = async () => {
    if (!onDownloadPDF) return;
    setIsDownloading(true);
    try {
      await onDownloadPDF();
      toast.success(t('inmobiliaria.propietario.extracto.pdfDownloaded'), {
        description: `${t('inmobiliaria.propietario.extracto.extractOf')} ${extracto.propietarioName} - ${formatMonthYear(extracto.month, locale)}`,
      });
    } catch (error) {
      toast.error(t('inmobiliaria.propietario.extracto.pdfError'), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsDownloading(false);
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

  // Handle email — antes esperaba un segundo de mentira y decía «enviado»
  // sin mandar nada. Ahora se espera al handler y se informa lo que pasó.
  const handleEmail = async () => {
    if (!onEmail) return;
    setIsSendingEmail(true);
    try {
      await onEmail();
      toast.success(t('inmobiliaria.propietario.extracto.emailSent'), {
        description: `${t('inmobiliaria.propietario.extracto.emailSentTo')} ${propietario?.email || extracto.propietarioName}`,
      });
    } catch (error) {
      toast.error(t('inmobiliaria.propietario.extracto.emailError'), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsSendingEmail(false);
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
        'min-w-0 bg-surface dark:bg-card rounded-lg border border-border overflow-hidden print:shadow-none print:border-0',
        className
      )}
    >
      {/* Header - Inmobiliaria Info */}
      {/* Banda neutra: con el azul de marca de fondo, el nombre de la agencia
          (texto oscuro) y el NIT (gris) no se leían. Sin gradientes (DESIGN.md). */}
      <div className="p-6 border-b border-border bg-surface-muted print:bg-transparent">
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
                {[agencyConfig?.address, agencyConfig?.city].filter(Boolean).join(', ')}
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
              {t('inmobiliaria.propietario.extracto.period')}: <span className="font-medium text-foreground">{formatMonthYear(extracto.month, locale)}</span>
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
                  <p className="text-sm text-muted-foreground">{propietario.email ?? '—'}</p>
                  <p className="text-sm text-muted-foreground">{propietario.phone ?? '—'}</p>
                </>
              )}
            </div>
          </div>

          {/* Bank Account — sale del extracto mismo (`bankInfo`), no de la
              lista de propietarios: la lista llegaba con el banco plano y
              leer `bankAccount.bank` de ahí tumbaba el modal entero. */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Bank className="w-4 h-4 text-primary" />
              {t('inmobiliaria.propietario.extracto.bankAccount')}
            </div>
            <div className="pl-6 space-y-2" data-testid="extracto-banco">
              {extracto.bankInfo?.bankAccountNumber ? (
                <>
                  <p className="text-foreground font-medium">{extracto.bankInfo.bankName ?? '—'}</p>
                  <p className="text-sm text-muted-foreground">
                    {extracto.bankInfo.bankAccountType ?? ''}{extracto.bankInfo.bankAccountType ? ': ' : ''}{extracto.bankInfo.bankAccountNumber}
                  </p>
                  {extracto.bankInfo.bankAccountHolder && (
                    <p className="text-sm text-muted-foreground">{extracto.bankInfo.bankAccountHolder}</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{t('inmobiliaria.propietario.extracto.sinCuenta')}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Properties Table */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-4">
          <Receipt className="w-4 h-4 text-primary" />
          {t('inmobiliaria.propietario.extracto.propertyDetail')}
        </div>
        {/* El marco y el scroll horizontal van en capas separadas: si el pie
            viviera dentro del `overflow-x-auto`, se correría de lado con la
            tabla en vez de quedarse quieto abajo. */}
        <div className="rounded-md border border-border">
          <div className="overflow-x-auto" data-lenis-prevent>
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
                  <TableHead className="text-right">{t('inmobiliaria.propietario.extracto.thNet')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineasDeLaPagina.map((prop, index) => {
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

          {/* Pie: sólo si hay más de una página. */}
          {shouldPaginate && (
            <div className="border-t border-border px-4 py-3">
              <TablePagination
                total={totalLineas}
                page={page}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}
        </div>
      </div>

      {/* Summary Section */}
      <div className="p-6 border-b border-border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Net Amount Highlight */}
          <div className="p-6 rounded-lg bg-success-soft border border-success/30 dark:border-success/40">
            <div className="flex items-center gap-2 text-sm font-medium text-success mb-2">
              <CurrencyCircleDollar className="w-5 h-5" weight="fill" />
              {t('inmobiliaria.propietario.extracto.netToReceive')}
            </div>
            <p className="text-3xl font-bold text-success">
              {formatCurrency(extracto.totals.totalNet)}
            </p>
          </div>

          {/* Payment Details */}
          <div className="p-6 rounded-lg bg-muted/50 border border-border">
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
          {onEmail && (
            <Button
              variant="outline"
              onClick={handleEmail}
              disabled={isSendingEmail || !propietario?.email}
              title={!propietario?.email ? t('inmobiliaria.propietario.extracto.sinCorreo') : undefined}
              className="gap-2"
              data-testid="extracto-enviar"
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
          )}
          {onDownloadPDF && (
            <Button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="gap-2 bg-primary hover:opacity-90 text-primary-fg"
              data-testid="extracto-descargar"
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
          )}
        </div>
      </div>

      {/* Print Footer */}
      <div className="hidden print:block p-6 text-center text-xs text-muted-foreground border-t border-border">
        <p>{agencyConfig?.name} - NIT {agencyConfig?.nit}</p>
        <p>{[agencyConfig?.address, agencyConfig?.city].filter(Boolean).join(', ')}</p>
        <p className="mt-2">{t('inmobiliaria.propietario.extracto.documentGenerated')} {formatDate(extracto.generatedAt, locale)}</p>
      </div>
    </motion.div>
  );
}

export default ExtractoPropietario;
