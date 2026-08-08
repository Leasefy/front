'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Eye, MagnifyingGlass, Calendar, CheckCircle, Clock, X, CaretLeft, CaretRight, FolderOpen, IdentificationCard, Money, Briefcase, Bank, XCircle, WarningCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useOnboardingStatus } from '@/lib/hooks/use-onboarding-status';
import { CompleteProfileFirst } from '@/components/tenant/CompleteProfileFirst';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { IconButton } from '@leasefy/cadence';
import { useMyApplications } from '@/lib/hooks/useApplications';
import { documentsApi, type DocumentItem } from '@/lib/api/documents.service';
import { deriveReviewCounts, getReviewStatusLabel } from '@/lib/documents/review-status';
import type { DocumentReviewStatus } from '@/lib/api/applications.types';

// Per-status visual config for the tenant-facing document badge.
// Color is always paired with an icon + label (never color alone) per a11y rules.
const REVIEW_STATUS_STYLE: Record<
  DocumentReviewStatus,
  { className: string; icon: typeof CheckCircle }
> = {
  APPROVED: { className: 'bg-success-soft text-success', icon: CheckCircle },
  IN_REVIEW: { className: 'bg-warning-soft text-warning', icon: Clock },
  REJECTED: { className: 'bg-danger-soft text-danger', icon: XCircle },
  PENDING: { className: 'bg-surface-muted text-fg-muted', icon: Clock },
};

// Document type labels and icons
const DOC_TYPE_CONFIG: Record<string, { label: string; labelEn: string; icon: typeof FileText }> = {
  // Legacy lowercase keys (kept for back-compat)
  id_document: { label: 'Documento de identidad', labelEn: 'ID Document', icon: IdentificationCard },
  income_proof: { label: 'Comprobante de ingresos', labelEn: 'Income Proof', icon: Money },
  employment_letter: { label: 'Carta laboral', labelEn: 'Employment Letter', icon: Briefcase },
  bank_statements: { label: 'Extractos bancarios', labelEn: 'Bank Statements', icon: Bank },
  credit_report: { label: 'Reporte crediticio', labelEn: 'Credit Report', icon: FileText },
  // Canonical UPPER_SNAKE backend keys
  ID_DOCUMENT: { label: 'Documento de identidad', labelEn: 'ID Document', icon: IdentificationCard },
  INCOME_PROOF: { label: 'Comprobante de ingresos', labelEn: 'Income Proof', icon: Money },
  EMPLOYMENT_LETTER: { label: 'Carta laboral', labelEn: 'Employment Letter', icon: Briefcase },
  BANK_STATEMENT: { label: 'Extracto bancario', labelEn: 'Bank Statement', icon: Bank },
  PAY_STUB: { label: 'Desprendible de nómina', labelEn: 'Pay Stub', icon: Money },
  CREDIT_REPORT: { label: 'Reporte crediticio', labelEn: 'Credit Report', icon: FileText },
  OTHER: { label: 'Otro documento', labelEn: 'Other Document', icon: FileText },
};

const ITEMS_PER_PAGE = 6;

/**
 * Tenant Documents Page - Connected to Real API
 * Shows documents from the tenant's applications
 */
export default function DocumentosPage() {
  const { t, locale } = useI18n();
  const { isComplete: isOnboardingComplete, isLoading: isOnboardingLoading } = useOnboardingStatus();
  const { applications, isLoading: isLoadingApps } = useMyApplications();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [viewingDocument, setViewingDocument] = useState<DocumentItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch documents for all applications
  const fetchAllDocuments = useCallback(async () => {
    if (!applications.length) {
      setDocuments([]);
      return;
    }
    setIsLoadingDocs(true);
    try {
      const allDocs = await Promise.all(
        applications.map((app) => documentsApi.getByApplication(app.id).catch(() => []))
      );
      setDocuments(allDocs.flat());
    } catch {
      setDocuments([]);
    } finally {
      setIsLoadingDocs(false);
    }
  }, [applications]);

  useEffect(() => {
    if (isOnboardingComplete && applications.length > 0) {
      fetchAllDocuments();
    }
  }, [isOnboardingComplete, applications, fetchAllDocuments]);

  const isLoading = isOnboardingLoading || isLoadingApps || isLoadingDocs;

  // Get unique document types for filter pills
  const docTypes = Array.from(new Set(documents.map((d) => d.type)));

  const filterCategories = [
    { value: 'all', label: t('documents.categories.all'), icon: FolderOpen },
    ...docTypes.map((type) => ({
      value: type,
      label: locale === 'es'
        ? (DOC_TYPE_CONFIG[type]?.label ?? type)
        : (DOC_TYPE_CONFIG[type]?.labelEn ?? type),
      icon: DOC_TYPE_CONFIG[type]?.icon ?? FileText,
    })),
  ];

  const filteredDocuments = documents.filter((doc) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (doc.fileName ?? '').toLowerCase().includes(query)
      || (DOC_TYPE_CONFIG[doc.type]?.label ?? '').toLowerCase().includes(query);
    const matchesType = selectedType === 'all' || doc.type === selectedType;
    return matchesSearch && matchesType;
  });

  // Pagination
  const totalPages = Math.ceil(filteredDocuments.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedDocuments = filteredDocuments.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleFilterChange = (type: string) => {
    setSelectedType(type);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const getDocLabel = (type: string) =>
    locale === 'es'
      ? (DOC_TYPE_CONFIG[type]?.label ?? type)
      : (DOC_TYPE_CONFIG[type]?.labelEn ?? type);

  const getDocIcon = (type: string) => DOC_TYPE_CONFIG[type]?.icon ?? FileText;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const formatSize = (bytes: number) =>
    bytes > 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(bytes / 1024)} KB`;

  // Stats — derived from the REAL review status the backend now returns
  // (reviewStatus), not the legacy `verified` boolean.
  const reviewCounts = deriveReviewCounts(documents);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Spinner size="lg" variant="current" className="text-primary" />
      </div>
    );
  }

  // Show "complete profile first" if onboarding not done
  if (!isOnboardingComplete) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <CompleteProfileFirst context="documents" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-medium text-fg tracking-tight">
            {t('documents.title')}
          </h1>
          <p className="mt-1 text-fg-muted">
            {t('documents.subtitle')}
          </p>
        </motion.header>

        {/* Stats Grid — solo con documentos. Cuatro contadores en cero no
            resumen nada y ocupan justo el lugar del único mensaje útil. */}
        {documents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
        >
          {/* Total */}
          <div className="rounded-xl bg-primary-soft border border-primary/30 p-6">
            <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center mb-4">
              <FolderOpen className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm text-primary mb-1">Total</p>
            <p className="text-3xl font-bold text-fg tracking-tight tabular-nums">
              {reviewCounts.total}
            </p>
            <p className="text-sm text-fg-muted mt-2">{t('nav.documents')}</p>
          </div>

          {/* Approved */}
          <div className="rounded-xl bg-surface-muted p-6">
            <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center mb-4">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <p className="text-sm text-fg-muted mb-1">
              {locale === 'es' ? 'Aprobados' : 'Approved'}
            </p>
            <p className="text-3xl font-bold text-fg tracking-tight tabular-nums">
              {reviewCounts.approved}
            </p>
            <p className="text-sm text-fg-muted mt-2">
              {locale === 'es' ? 'Verificados' : 'Verified'}
            </p>
          </div>

          {/* In review */}
          <div className="rounded-xl bg-surface-muted p-6">
            <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center mb-4">
              <Clock className="w-5 h-5 text-warning" />
            </div>
            <p className="text-sm text-fg-muted mb-1">
              {locale === 'es' ? 'En revisión' : 'Under review'}
            </p>
            <p className="text-3xl font-bold text-fg tracking-tight tabular-nums">
              {reviewCounts.inReview + reviewCounts.pending}
            </p>
            <p className="text-sm text-fg-muted mt-2">
              {locale === 'es' ? 'Pendientes' : 'Pending'}
            </p>
          </div>

          {/* Rejected */}
          <div className="rounded-xl bg-surface-muted p-6">
            <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center mb-4">
              <XCircle className="w-5 h-5 text-danger" />
            </div>
            <p className="text-sm text-fg-muted mb-1">
              {locale === 'es' ? 'Rechazados' : 'Rejected'}
            </p>
            <p className="text-3xl font-bold text-fg tracking-tight tabular-nums">
              {reviewCounts.rejected}
            </p>
            <p className="text-sm text-fg-muted mt-2">
              {locale === 'es' ? 'Requieren acción' : 'Need action'}
            </p>
          </div>
        </motion.div>
        )}

        {/* Filtros — sin documentos no hay nada que buscar ni que filtrar. */}
        {documents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 mb-6"
        >
          {/* Search */}
          <div className="relative flex-1">
            <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-fg-subtle" />
            <Input
              type="text"
              placeholder={locale === 'es' ? 'Buscar documento...' : 'Search document...'}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              aria-label={locale === 'es' ? 'Buscar documento' : 'Search document'}
              className="w-full pl-12 pr-4 rounded-full bg-surface"
            />
          </div>

          {/* Type Filter Pills */}
          {filterCategories.length > 1 && (
            <div className="flex items-center gap-1 p-1 bg-surface-muted rounded-full w-fit overflow-x-auto">
              {filterCategories.map((cat) => {
                const IconComponent = cat.icon;
                return (
                  <button
                    key={cat.value}
                    onClick={() => handleFilterChange(cat.value)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap',
                      selectedType === cat.value
                        ? 'bg-surface text-fg'
                        : 'text-fg-muted hover:text-fg'
                    )}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="hidden sm:inline">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>
        )}

        {/* Documents Grid */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {/* El encabezado con el contador tampoco va sobre el vacío: "0
              documentos" arriba de "No hay documentos" lo dice dos veces. */}
          {documents.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-fg">
                {t('nav.documents')}
              </h2>
              <span className="text-sm text-fg-muted">
                {filteredDocuments.length} {locale === 'es'
                  ? (filteredDocuments.length !== 1 ? 'documentos' : 'documento')
                  : (filteredDocuments.length !== 1 ? 'documents' : 'document')}
              </span>
            </div>
          )}

          {documents.length === 0 ? (
            /* "aplicaciones" está muerto (docs/VOCABULARIO.md) y además mandaba
               al historial. Lo siguiente que haría es postularse. */
            <EmptyState
              icon={FolderOpen}
              title={locale === 'es' ? 'No hay documentos' : 'No documents'}
              description={locale === 'es'
                ? 'Cuando te postules a una propiedad, los documentos que subas aparecerán aquí organizados.'
                : 'When you apply to a property, the documents you upload will appear here.'}
              action={{ label: locale === 'es' ? 'Ver propiedades para mí' : 'View properties for me', href: '/inquilino/para-ti' }}
            />
          ) : filteredDocuments.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {paginatedDocuments.map((doc, index) => {
                    const Icon = getDocIcon(doc.type);

                    return (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.05 }}
                        className="group rounded-xl border border-border bg-surface hover:border-border-strong transition-all duration-300 overflow-hidden"
                      >
                        {/* Document Header */}
                        <div className="p-5">
                          <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-surface-muted flex items-center justify-center">
                              <Icon className="w-6 h-6 text-fg-muted" />
                            </div>
                            {(() => {
                              const style = REVIEW_STATUS_STYLE[doc.reviewStatus];
                              const StatusIcon = style.icon;
                              return (
                                <span
                                  className={cn(
                                    'px-2.5 py-1 text-xs font-medium rounded-full flex items-center gap-1',
                                    style.className
                                  )}
                                >
                                  <StatusIcon className="w-3 h-3" />
                                  {getReviewStatusLabel(doc.reviewStatus)}
                                </span>
                              );
                            })()}
                          </div>

                          <h3 className="font-semibold text-fg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                            {getDocLabel(doc.type)}
                          </h3>

                          {doc.reviewStatus === 'REJECTED' && doc.rejectionReason && (
                            <div className="mb-3 rounded-md bg-danger-soft/60 border border-danger/20 p-2.5 flex items-start gap-2">
                              <WarningCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-danger">
                                  {locale === 'es' ? 'Motivo del rechazo' : 'Rejection reason'}
                                </p>
                                <p className="text-xs text-fg-muted mt-0.5 break-words">
                                  {doc.rejectionReason}
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="space-y-1.5">
                            <p className="text-xs text-fg-muted flex items-center gap-1.5 truncate">
                              <FileText className="w-3 h-3 flex-shrink-0" />
                              {doc.fileName}
                            </p>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-fg-subtle flex items-center gap-1.5">
                                <Calendar className="w-3 h-3" />
                                {formatDate(doc.createdAt)}
                              </p>
                              <span className="text-xs text-fg-subtle">
                                {formatSize(doc.size)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center border-t border-border-faint">
                          <Button
                            variant="ghost"
                            hideArrow
                            onClick={() => setViewingDocument(doc)}
                            className="flex-1 rounded-none py-3 text-sm font-medium text-fg-muted hover:bg-surface-muted hover:text-primary"
                          >
                            <Eye className="w-4 h-4" />
                            {t('documents.view')}
                          </Button>
                          <div className="w-px h-8 bg-surface-muted" />
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-fg-muted hover:bg-surface-muted hover:text-primary transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            {t('documents.download')}
                          </a>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <IconButton
                    variant="ghost"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={cn(
                      'p-2 rounded-full',
                      currentPage === 1
                        ? 'text-fg-subtle cursor-not-allowed'
                        : 'text-fg-muted hover:bg-surface-muted'
                    )}
                    aria-label={locale === 'es' ? 'Página anterior' : 'Previous page'}
                    icon={<CaretLeft className="w-5 h-5" />}
                  />
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant="ghost"
                      hideArrow
                      onClick={() => setCurrentPage(page)}
                      aria-current={currentPage === page ? 'page' : undefined}
                      className={cn(
                        'w-10 h-10 rounded-full p-0 text-sm font-medium',
                        currentPage === page
                          ? 'bg-primary text-primary-fg'
                          : 'text-fg-muted hover:bg-surface-muted'
                      )}
                    >
                      {page}
                    </Button>
                  ))}
                  <IconButton
                    variant="ghost"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={cn(
                      'p-2 rounded-full',
                      currentPage === totalPages
                        ? 'text-fg-subtle cursor-not-allowed'
                        : 'text-fg-muted hover:bg-surface-muted'
                    )}
                    aria-label={locale === 'es' ? 'Página siguiente' : 'Next page'}
                    icon={<CaretRight className="w-5 h-5" />}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl bg-surface-muted p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-fg-subtle" />
              </div>
              <h3 className="font-semibold text-fg mb-2">
                {t('documents.noDocuments')}
              </h3>
              <p className="text-sm text-fg-muted max-w-sm mx-auto">
                {locale === 'es' ? 'Intenta ajustar los filtros o el término de búsqueda' : 'Try adjusting the filters or search term'}
              </p>
            </div>
          )}
        </motion.section>
      </div>

      {/* Document Viewer Modal */}
      <AnimatePresence>
        {viewingDocument && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setViewingDocument(null)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative bg-surface w-full max-w-4xl max-h-[90vh] rounded-xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-border-faint">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-surface-muted flex items-center justify-center">
                    {(() => { const DocIcon = getDocIcon(viewingDocument.type); return <DocIcon className="w-6 h-6 text-fg-muted" />; })()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-fg">
                      {getDocLabel(viewingDocument.type)}
                    </h3>
                    <p className="text-sm text-fg-muted">
                      {viewingDocument.fileName} · {formatDate(viewingDocument.createdAt)} · {formatSize(viewingDocument.size)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={viewingDocument.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-fg rounded-full text-sm font-medium hover:bg-primary-hover transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    {t('documents.download')}
                  </a>
                  <IconButton
                    variant="ghost"
                    onClick={() => setViewingDocument(null)}
                    className="p-2 rounded-full hover:bg-surface-muted text-fg-muted hover:text-fg"
                    aria-label={locale === 'es' ? 'Cerrar' : 'Close'}
                    icon={<X className="w-5 h-5" />}
                  />
                </div>
              </div>

              {/* Document Preview Area */}
              <div className="flex-1 bg-surface-muted p-6 overflow-auto">
                <div className="bg-surface h-full rounded-xl flex items-center justify-center min-h-[400px]">
                  {viewingDocument.mimeType?.startsWith('image/') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={viewingDocument.url}
                      alt={getDocLabel(viewingDocument.type)}
                      className="max-w-full max-h-[60vh] rounded-md object-contain"
                    />
                  ) : viewingDocument.mimeType === 'application/pdf' ? (
                    <iframe
                      src={viewingDocument.url}
                      className="w-full h-full min-h-[500px] rounded-md"
                      title={getDocLabel(viewingDocument.type)}
                    />
                  ) : (
                    <div className="text-center p-8">
                      <FileText className="w-16 h-16 text-fg-subtle mx-auto mb-4" />
                      <p className="text-lg font-medium text-fg mb-2">
                        {viewingDocument.fileName}
                      </p>
                      <p className="text-sm text-fg-muted mb-4">
                        {viewingDocument.mimeType?.split('/')[1]?.toUpperCase() ?? 'Archivo'} · {formatSize(viewingDocument.size)}
                      </p>
                      <a
                        href={viewingDocument.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:opacity-90 text-white rounded-full text-sm font-medium transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        {locale === 'es' ? 'Descargar archivo' : 'Download file'}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
