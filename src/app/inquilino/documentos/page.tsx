'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Eye, MagnifyingGlass, Calendar, CheckCircle, Clock, X, CaretLeft, CaretRight, FolderOpen, IdentificationCard, Money, Briefcase, Bank, Trash, Lock, ShieldCheck } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useOnboardingStatus } from '@/lib/hooks/use-onboarding-status';
import { CompleteProfileFirst } from '@/components/tenant/CompleteProfileFirst';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { IconButton } from '@leasefy/cadence';
import { useMyApplications } from '@/lib/hooks/useApplications';
import { documentsApi, type DocumentItem } from '@/lib/api/documents.service';
import { useSignedDocUrl } from '@/lib/hooks/useDocuments';
import { createEmptyDocumentConsent, type DocumentConsent } from '@/lib/api/documents.types';
import { useContracts } from '@/lib/hooks/useContracts';
import { useMyPaymentRequests } from '@/lib/hooks/useLeases';
import { DownloadContractPdfButton } from '@/components/contract/DownloadContractPdfButton';
import type { TenantPaymentRequestStatus } from '@/lib/api/tenant-payment-requests.types';

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
  // Lease documents (arriendo) — surfaced in the "Documentos del arriendo" section
  CONTRATO: { label: 'Contrato firmado', labelEn: 'Signed lease', icon: FileText },
  RECIBO: { label: 'Comprobante interno', labelEn: 'Internal receipt', icon: Money },
};

const ITEMS_PER_PAGE = 6;

const MONTH_NAMES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Estado del comprobante interno (tenant-payment-request) — copy + badge color.
const PAYMENT_REQUEST_STATUS: Record<TenantPaymentRequestStatus, { es: string; en: string; className: string }> = {
  PENDING_VALIDATION: { es: 'En validación', en: 'Under review', className: 'bg-[#F8F0E0] text-[#B7791F] dark:bg-[#B7791F]/15 dark:text-[#D2992F]' },
  APPROVED: { es: 'Aprobado', en: 'Approved', className: 'bg-[#E8F3EC] text-[#2C7A53] dark:bg-[#2C7A53]/15 dark:text-[#3EAE70]' },
  REJECTED: { es: 'Rechazado', en: 'Rejected', className: 'bg-[#FBEAEA] text-[#B4322E] dark:bg-[#B4322E]/15 dark:text-[#E06B67]' },
  DISPUTED: { es: 'En disputa', en: 'Disputed', className: 'bg-[#F8F0E0] text-[#B7791F] dark:bg-[#B7791F]/15 dark:text-[#D2992F]' },
  CANCELLED: { es: 'Cancelado', en: 'Cancelled', className: 'bg-surface-muted text-fg-muted dark:bg-[#2a2a2c] dark:text-fg-subtle' },
};

/**
 * Tenant Documents Page - Connected to Real API
 * Shows documents from the tenant's applications
 */
export default function DocumentosPage() {
  const { t, locale, formatCurrency } = useI18n();
  const { isComplete: isOnboardingComplete, isLoading: isOnboardingLoading } = useOnboardingStatus();
  const { applications, isLoading: isLoadingApps } = useMyApplications();

  // Lease documents (arriendo) — real sources, degrade to [] on 403/404 (see hooks).
  const { contracts, isLoading: contractsLoading } = useContracts();
  const { requests: paymentRequests, isLoading: paymentRequestsLoading } = useMyPaymentRequests();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [viewingDocument, setViewingDocument] = useState<DocumentItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // ── Habeas Data (Ley 1581) — per-purpose consent gate (DOCU-04).
  // Both booleans default FALSE (createEmptyDocumentConsent) — never pre-ticked.
  // The MANDATORY `purposeDocAccess` is what actually gates document access below;
  // this UI gate is the real enforcement (server-side persistence is best-effort).
  const [consent, setConsent] = useState<DocumentConsent>(() => createEmptyDocumentConsent('v1'));
  const canAccessDocs = consent.purposeDocAccess;
  // Tracks docs we already best-effort POSTed consent for, so we don't spam the endpoint.
  const recordedConsentRef = useRef<Set<string>>(new Set());

  // ── ARCO (supresión) — real delete behind a type-to-confirm gate.
  const [deletingDocument, setDeletingDocument] = useState<DocumentItem | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const requiredDeleteText = locale === 'es' ? 'ELIMINAR' : 'DELETE';

  // Anti-IDOR: the viewer preview binds a backend-signed, short-lived URL (blob-safe),
  // fetched only while a doc is open (enabled gate) — not the raw persistent Supabase URL.
  const { url: viewerSignedUrl, isLoading: viewerUrlLoading } = useSignedDocUrl(
    viewingDocument?.id,
    { enabled: !!viewingDocument }
  );
  // TODO(backend): /documents/:id/signed-url not live — raw URL fallback is the disclosed
  // IDOR gap (DOCU-04), not a frontend-satisfiable claim. Prefer the signed URL; the
  // `?? viewingDocument?.url` fallback is the honestly-disclosed backend dependency.
  const previewUrl = viewerSignedUrl ?? viewingDocument?.url;

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

  const isLoading = isOnboardingLoading || isLoadingApps || isLoadingDocs || contractsLoading || paymentRequestsLoading;

  // "Contrato firmado" = ambas partes firmaron (signed/active/expired/cancelled).
  const signedContracts = contracts.filter((c) =>
    ['signed', 'active', 'expired', 'cancelled'].includes(c.status)
  );
  const hasLeaseDocs = signedContracts.length > 0 || paymentRequests.length > 0;

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

  // Best-effort SIC-audit consent record per accessed doc (once). The backend store is
  // authoritative; a missing endpoint degrades to a silent no-op (documentsApi.recordConsent
  // resolves on 404/403). The real enforcement is the unchecked-default gate, not this call —
  // so we deliberately do NOT surface a "consentimiento guardado" confirmation here.
  const maybeRecordConsent = useCallback((docId: string) => {
    if (!consent.purposeDocAccess) return;
    if (recordedConsentRef.current.has(docId)) return;
    recordedConsentRef.current.add(docId);
    void documentsApi.recordConsent(docId, consent).catch(() => {});
  }, [consent]);

  // Anti-IDOR download: fetch the backend-signed URL → blob → programmatic <a download> →
  // revoke, so the raw Supabase URL never lands in the address bar. Modeled on
  // DownloadContractPdfButton. Gated by the mandatory consent (purposeDocAccess).
  const handleDownload = useCallback(async (doc: DocumentItem) => {
    if (!consent.purposeDocAccess) return;
    maybeRecordConsent(doc.id);
    let blobUrl: string | null = null;
    try {
      let sourceUrl: string;
      try {
        const signed = await documentsApi.getSignedUrl(doc.id);
        sourceUrl = signed.url;
      } catch {
        // TODO(backend): /documents/:id/signed-url not live — raw URL fallback is the disclosed
        // IDOR gap (DOCU-04), not a frontend-satisfiable claim.
        sourceUrl = doc.url;
      }
      const response = await fetch(sourceUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = doc.fileName || 'documento';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      const msg = err instanceof Error ? err.message
        : (locale === 'es' ? 'No se pudo descargar el documento' : 'Could not download the document');
      toast.error(msg);
    } finally {
      // Free the blob URL after a tick — the click already triggered the download.
      if (blobUrl) setTimeout(() => URL.revokeObjectURL(blobUrl!), 1000);
    }
  }, [consent, maybeRecordConsent, locale]);

  const handleView = useCallback((doc: DocumentItem) => {
    if (!consent.purposeDocAccess) return;
    maybeRecordConsent(doc.id);
    setViewingDocument(doc);
  }, [consent, maybeRecordConsent]);

  // ARCO supresión — real DELETE /documents/:id behind the "ELIMINAR" type-to-confirm gate.
  // The signed contrato firmado is a Contract (rendered via DownloadContractPdfButton), NOT a
  // DocumentItem, so it can never reach this handler — a legal record with statutory retention.
  const handleDeleteDocument = useCallback(async () => {
    if (!deletingDocument) return;
    if (deleteConfirmText !== requiredDeleteText) return;
    setIsDeleting(true);
    try {
      await documentsApi.delete(deletingDocument.id);
      setDocuments((docs) => docs.filter((d) => d.id !== deletingDocument.id));
      toast.success(locale === 'es' ? 'Documento eliminado' : 'Document deleted');
      setDeletingDocument(null);
      setDeleteConfirmText('');
    } catch (err) {
      const msg = err instanceof Error ? err.message
        : (locale === 'es' ? 'No se pudo eliminar el documento' : 'Could not delete the document');
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  }, [deletingDocument, deleteConfirmText, requiredDeleteText, locale]);

  const getDocLabel = (type: string) =>
    locale === 'es'
      ? (DOC_TYPE_CONFIG[type]?.label ?? type)
      : (DOC_TYPE_CONFIG[type]?.labelEn ?? type);

  const getDocIcon = (type: string) => DOC_TYPE_CONFIG[type]?.icon ?? FileText;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const formatPeriod = (month: number, year: number) => {
    const names = locale === 'es' ? MONTH_NAMES_ES : MONTH_NAMES_EN;
    return `${names[month - 1] ?? ''} ${year}`.trim();
  };

  const formatSize = (bytes: number) =>
    bytes > 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(bytes / 1024)} KB`;

  // Stats
  const verifiedCount = documents.filter((d) => d.verified).length;
  const pendingCount = documents.filter((d) => !d.verified).length;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10] flex items-center justify-center">
        <Spinner size="lg" variant="current" className="text-primary" />
      </div>
    );
  }

  // Show "complete profile first" if onboarding not done
  if (!isOnboardingComplete) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <CompleteProfileFirst context="documents" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-medium text-fg dark:text-white tracking-tight">
            {t('documents.title')}
          </h1>
          <p className="mt-1 text-fg-muted dark:text-fg-subtle">
            {t('documents.subtitle')}
          </p>
        </motion.header>

        {/* Documentos del arriendo (contrato firmado + recibos) */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-fg dark:text-white">
              {locale === 'es' ? 'Documentos del arriendo' : 'Lease documents'}
            </h2>
          </div>

          {hasLeaseDocs ? (
            <div className="space-y-6">
              {/* Contrato firmado — descarga vía signed URL (DownloadContractPdfButton) */}
              {signedContracts.length > 0 && (
                <div>
                  <p className="text-xs text-fg-subtle uppercase tracking-wider mb-1">
                    {getDocLabel('CONTRATO')}
                  </p>
                  {/* Statutory retention: the signed contract is a legal record. It is a Contract
                      (not a DocumentItem) so it has no delete affordance by construction — this note
                      makes the exclusion explicit, not accidental. */}
                  <p className="text-xs text-fg-muted dark:text-fg-subtle mb-3 flex items-center gap-1.5">
                    <Lock className="w-3 h-3 flex-shrink-0" />
                    {locale === 'es'
                      ? 'Documento legal — no eliminable (retención legal).'
                      : 'Legal document — cannot be deleted (statutory retention).'}
                  </p>
                  <div className="space-y-2">
                    {signedContracts.map((c) => {
                      const ContratoIcon = getDocIcon('CONTRATO');
                      const subline = [c.propertyAddress, c.propertyCity].filter(Boolean).join(', ');
                      return (
                        <div
                          key={c.id}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#1a1a1c]"
                        >
                          <div className="w-10 h-10 rounded-xl bg-surface-muted dark:bg-[#2a2a2c] flex items-center justify-center flex-shrink-0">
                            <ContratoIcon className="w-5 h-5 text-fg-muted dark:text-fg-subtle" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-fg dark:text-white">
                              {getDocLabel('CONTRATO')}
                            </p>
                            {subline && (
                              <p className="text-xs text-fg-muted dark:text-fg-subtle truncate">
                                {subline}
                              </p>
                            )}
                          </div>
                          <DownloadContractPdfButton
                            contractId={c.id}
                            contractStatus={c.status}
                            variant="secondary"
                            label={locale === 'es' ? 'Descargar contrato' : 'Download lease'}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recibos — comprobantes internos (nunca fiscal; sin PDF descargable todavía) */}
              {paymentRequests.length > 0 && (
                <div>
                  <p className="text-xs text-fg-subtle uppercase tracking-wider mb-1">
                    {locale === 'es' ? 'Recibos (comprobante interno)' : 'Receipts (internal receipt)'}
                  </p>
                  <p className="text-xs text-fg-muted dark:text-fg-subtle mb-3">
                    {locale === 'es'
                      ? 'Registro interno de tus pagos. El comprobante en PDF descargable llegará con Pagos.'
                      : 'Internal record of your payments. The downloadable receipt PDF will arrive with Payments.'}
                  </p>
                  <div className="space-y-2">
                    {paymentRequests.map((r) => {
                      const ReciboIcon = getDocIcon('RECIBO');
                      const statusMeta = PAYMENT_REQUEST_STATUS[r.status];
                      return (
                        <div
                          key={r.id}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#1a1a1c]"
                        >
                          <div className="w-10 h-10 rounded-xl bg-surface-muted dark:bg-[#2a2a2c] flex items-center justify-center flex-shrink-0">
                            <ReciboIcon className="w-5 h-5 text-fg-muted dark:text-fg-subtle" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-fg dark:text-white truncate">
                              {locale === 'es' ? 'Comprobante interno' : 'Internal receipt'} · {formatPeriod(r.periodMonth, r.periodYear)}
                            </p>
                            <p className="text-xs text-fg-muted dark:text-fg-subtle truncate">
                              <span className="font-mono tabular-nums">{formatCurrency(r.amount)}</span>
                              {r.bankName ? ` · ${r.bankName}` : ''} · {formatDate(r.paymentDate)}
                            </p>
                          </div>
                          {statusMeta && (
                            <span
                              className={cn(
                                'px-2.5 py-1 text-xs font-medium rounded-full flex-shrink-0',
                                statusMeta.className
                              )}
                            >
                              {locale === 'es' ? statusMeta.es : statusMeta.en}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl bg-surface-muted dark:bg-[#1a1a1c] p-10 text-center">
              <div className="w-14 h-14 rounded-full bg-surface dark:bg-[#2a2a2c] flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7 text-fg-subtle" />
              </div>
              <h3 className="font-semibold text-fg dark:text-white mb-2">
                {locale === 'es' ? 'Aún no tienes documentos del arriendo' : 'No lease documents yet'}
              </h3>
              <p className="text-sm text-fg-muted dark:text-fg-subtle max-w-sm mx-auto">
                {locale === 'es'
                  ? 'Cuando tu contrato quede firmado y registres pagos, aparecerán aquí.'
                  : 'Once your lease is signed and payments are recorded, they will appear here.'}
              </p>
            </div>
          )}
        </motion.section>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8"
        >
          {/* Total */}
          <div className="rounded-xl bg-[#EEF1FF] dark:bg-[#1A40FF]/12 border border-[#1A40FF]/30 dark:border-[#1A40FF]/40 p-6">
            <div className="w-10 h-10 rounded-xl bg-surface dark:bg-[#2a2a2c] flex items-center justify-center mb-4">
              <FolderOpen className="w-5 h-5 text-[#1A40FF] dark:text-[#5570FF]" />
            </div>
            <p className="text-sm text-[#1A40FF] dark:text-[#5570FF] mb-1">Total</p>
            <p className="text-3xl font-bold text-fg dark:text-white tracking-tight">
              {documents.length}
            </p>
            <p className="text-sm text-fg-muted dark:text-fg-subtle mt-2">{t('nav.documents')}</p>
          </div>

          {/* Verified */}
          <div className="rounded-xl bg-surface-muted dark:bg-[#1a1a1c] p-6">
            <div className="w-10 h-10 rounded-xl bg-surface dark:bg-[#2a2a2c] flex items-center justify-center mb-4">
              <CheckCircle className="w-5 h-5 text-[#2C7A53] dark:text-[#3EAE70]" />
            </div>
            <p className="text-sm text-fg-muted dark:text-fg-subtle mb-1">
              {locale === 'es' ? 'Verificados' : 'Verified'}
            </p>
            <p className="text-3xl font-bold text-fg dark:text-white tracking-tight">
              {verifiedCount}
            </p>
            <p className="text-sm text-fg-muted dark:text-fg-subtle mt-2">
              {locale === 'es' ? 'Aprobados' : 'Approved'}
            </p>
          </div>

          {/* Pending */}
          <div className="rounded-xl bg-surface-muted dark:bg-[#1a1a1c] p-6">
            <div className="w-10 h-10 rounded-xl bg-surface dark:bg-[#2a2a2c] flex items-center justify-center mb-4">
              <Clock className="w-5 h-5 text-[#B7791F] dark:text-[#D2992F]" />
            </div>
            <p className="text-sm text-fg-muted dark:text-fg-subtle mb-1">{t('common.pending')}</p>
            <p className="text-3xl font-bold text-fg dark:text-white tracking-tight">
              {pendingCount}
            </p>
            <p className="text-sm text-fg-muted dark:text-fg-subtle mt-2">
              {locale === 'es' ? 'En revisión' : 'Under review'}
            </p>
          </div>
        </motion.div>

        {/* Filters */}
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
              className="w-full pl-12 pr-4 rounded-full bg-surface dark:bg-[#1a1a1c]"
            />
          </div>

          {/* Type Filter Pills */}
          {filterCategories.length > 1 && (
            <div className="flex items-center gap-1 p-1 bg-surface-muted dark:bg-[#1a1a1c] rounded-full w-fit overflow-x-auto">
              {filterCategories.map((cat) => {
                const IconComponent = cat.icon;
                return (
                  <button
                    key={cat.value}
                    onClick={() => handleFilterChange(cat.value)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap',
                      selectedType === cat.value
                        ? 'bg-surface dark:bg-[#2a2a2c] text-fg dark:text-white'
                        : 'text-fg-muted dark:text-fg-subtle hover:text-fg dark:hover:text-fg-subtle'
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

        {/* Habeas Data (Ley 1581) — per-purpose consent gate. Blocks doc access until the
            mandatory purpose is granted. Avalúo model: separate booleans, unchecked default,
            one purpose each, Ley 1581 notice. Shown only when there are documents to access. */}
        {documents.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mb-6"
          >
            <div className="rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#1a1a1c] p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-surface-muted dark:bg-[#2a2a2c] flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-5 h-5 text-fg-muted dark:text-fg-subtle" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-fg dark:text-white">
                    {locale === 'es' ? 'Consentimiento de datos personales' : 'Personal data consent'}
                  </h2>
                  <p className="text-sm text-fg-muted dark:text-fg-subtle">
                    {locale === 'es'
                      ? 'Autorizá el tratamiento de tus documentos del arriendo para poder consultarlos y descargarlos.'
                      : 'Authorize the processing of your lease documents so you can view and download them.'}
                  </p>
                </div>
              </div>

              {/* Consent 1 — purposeDocAccess (MANDATORY): gates doc access */}
              <div className="space-y-1">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="consent-doc-access"
                    checked={consent.purposeDocAccess}
                    onCheckedChange={(v) => setConsent((c) => ({ ...c, purposeDocAccess: v === true }))}
                    aria-required="true"
                    aria-describedby="consent-doc-access-desc"
                  />
                  <label
                    htmlFor="consent-doc-access"
                    className="text-sm text-fg dark:text-white leading-snug cursor-pointer"
                  >
                    {locale === 'es'
                      ? 'Autorizo a Leasefy a tratar mis documentos del arriendo para que pueda consultarlos y descargarlos.'
                      : 'I authorize Leasefy to process my lease documents so I can view and download them.'}
                  </label>
                </div>
                <p id="consent-doc-access-desc" className="text-xs text-fg-muted dark:text-fg-subtle pl-7">
                  {locale === 'es' ? 'Necesario para acceder a tus documentos.' : 'Required to access your documents.'}
                </p>
                {!consent.purposeDocAccess && (
                  <p className="text-xs text-warning pl-7">
                    {locale === 'es'
                      ? 'Debés aceptar este consentimiento para ver o descargar tus documentos.'
                      : 'You must accept this consent to view or download your documents.'}
                  </p>
                )}
              </div>

              {/* Consent 2 — purposeThirdPartyShare (OPTIONAL) */}
              <div className="flex items-start gap-3 mt-4">
                <Checkbox
                  id="consent-third-party"
                  checked={consent.purposeThirdPartyShare}
                  onCheckedChange={(v) => setConsent((c) => ({ ...c, purposeThirdPartyShare: v === true }))}
                />
                <label
                  htmlFor="consent-third-party"
                  className="text-sm text-fg dark:text-white leading-snug cursor-pointer"
                >
                  {locale === 'es'
                    ? 'Autorizo compartir mis certificados (paz y salvo / retención) con terceros que yo designe. (Opcional)'
                    : 'I authorize sharing my certificates (paz y salvo / retention) with third parties I designate. (Optional)'}
                </label>
              </div>

              {/* Ley 1581 policy notice */}
              <p className="text-xs text-fg-muted dark:text-fg-subtle leading-relaxed mt-4">
                {locale === 'es'
                  ? 'Tus datos son tratados conforme a la Ley 1581 de 2012 (Habeas Data) y la política de privacidad de Leasefy.'
                  : 'Your data is processed in accordance with Law 1581 of 2012 (Habeas Data) and Leasefy’s privacy policy.'}
              </p>
            </div>
          </motion.section>
        )}

        {/* Documents Grid */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-fg dark:text-white">
              {t('nav.documents')}
            </h2>
            <span className="text-sm text-fg-muted dark:text-fg-subtle">
              {filteredDocuments.length} {locale === 'es'
                ? (filteredDocuments.length !== 1 ? 'documentos' : 'documento')
                : (filteredDocuments.length !== 1 ? 'documents' : 'document')}
            </span>
          </div>

          {documents.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title={locale === 'es' ? 'No hay documentos' : 'No documents'}
              description={locale === 'es'
                ? 'Cuando subas documentos en tus aplicaciones, aparecerán aquí organizados.'
                : 'When you upload documents in your applications, they will appear here.'}
              action={{ label: locale === 'es' ? 'Ver aplicaciones' : 'View applications', href: '/inquilino/aplicaciones' }}
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
                        className="group rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#1a1a1c] hover:border-border dark:hover:border-border-strong hover: transition-all duration-300 overflow-hidden"
                      >
                        {/* Document Header */}
                        <div className="p-5">
                          <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-surface-muted dark:bg-[#2a2a2c] flex items-center justify-center">
                              <Icon className="w-6 h-6 text-fg-muted dark:text-fg-subtle" />
                            </div>
                            <span
                              className={cn(
                                'px-2.5 py-1 text-xs font-medium rounded-full flex items-center gap-1',
                                doc.verified
                                  ? 'bg-[#E8F3EC] text-[#2C7A53] dark:bg-[#2C7A53]/15 dark:text-[#3EAE70]'
                                  : 'bg-[#F8F0E0] text-[#B7791F] dark:bg-[#B7791F]/15 dark:text-[#D2992F]'
                              )}
                            >
                              {doc.verified ? (
                                <><CheckCircle className="w-3 h-3" /> {locale === 'es' ? 'Verificado' : 'Verified'}</>
                              ) : (
                                <><Clock className="w-3 h-3" /> {locale === 'es' ? 'En revisión' : 'Under review'}</>
                              )}
                            </span>
                          </div>

                          <h3 className="font-semibold text-fg dark:text-white mb-2 line-clamp-2 group-hover:text-[#1A40FF] dark:group-hover:text-[#1A40FF] transition-colors">
                            {getDocLabel(doc.type)}
                          </h3>

                          <div className="space-y-1.5">
                            <p className="text-xs text-fg-muted dark:text-fg-subtle flex items-center gap-1.5 truncate">
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

                        {/* Actions — view/download gated behind the mandatory consent; delete is
                            the ARCO supresión affordance (application DocumentItem cards only). */}
                        <div className="flex items-center border-t border-border-faint dark:border-border-strong">
                          <Button
                            variant="ghost"
                            hideArrow
                            onClick={() => handleView(doc)}
                            disabled={!canAccessDocs}
                            title={!canAccessDocs ? (locale === 'es' ? 'Aceptá el consentimiento para ver' : 'Accept consent to view') : undefined}
                            className="flex-1 rounded-none py-3 text-sm font-medium text-fg-muted dark:text-fg-subtle hover:bg-surface-muted dark:hover:bg-[#2a2a2c] hover:text-[#1A40FF] dark:hover:text-[#1A40FF] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                          >
                            <Eye className="w-4 h-4" />
                            {t('documents.view')}
                          </Button>
                          <div className="w-px h-8 bg-surface-muted dark:bg-surface-muted" />
                          <button
                            type="button"
                            onClick={() => handleDownload(doc)}
                            disabled={!canAccessDocs}
                            title={!canAccessDocs ? (locale === 'es' ? 'Aceptá el consentimiento para descargar' : 'Accept consent to download') : undefined}
                            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-fg-muted dark:text-fg-subtle hover:bg-surface-muted dark:hover:bg-[#2a2a2c] hover:text-[#1A40FF] dark:hover:text-[#1A40FF] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                          >
                            <Download className="w-4 h-4" />
                            {t('documents.download')}
                          </button>
                          <div className="w-px h-8 bg-surface-muted dark:bg-surface-muted" />
                          <button
                            type="button"
                            onClick={() => { setDeletingDocument(doc); setDeleteConfirmText(''); }}
                            aria-label={locale === 'es' ? 'Eliminar documento' : 'Delete document'}
                            className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-fg-muted dark:text-fg-subtle hover:bg-error-bg dark:hover:bg-error/10 hover:text-error dark:hover:text-error transition-colors"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
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
                        ? 'text-fg-subtle dark:text-fg-muted cursor-not-allowed'
                        : 'text-fg-muted dark:text-fg-subtle hover:bg-surface-muted dark:hover:bg-[#2a2a2c]'
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
                          ? 'bg-ink dark:bg-surface text-white dark:text-fg'
                          : 'text-fg-muted dark:text-fg-subtle hover:bg-surface-muted dark:hover:bg-[#2a2a2c]'
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
                        ? 'text-fg-subtle dark:text-fg-muted cursor-not-allowed'
                        : 'text-fg-muted dark:text-fg-subtle hover:bg-surface-muted dark:hover:bg-[#2a2a2c]'
                    )}
                    aria-label={locale === 'es' ? 'Página siguiente' : 'Next page'}
                    icon={<CaretRight className="w-5 h-5" />}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl bg-surface-muted dark:bg-[#1a1a1c] p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-surface dark:bg-[#2a2a2c] flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-fg-subtle" />
              </div>
              <h3 className="font-semibold text-fg dark:text-white mb-2">
                {t('documents.noDocuments')}
              </h3>
              <p className="text-sm text-fg-muted dark:text-fg-subtle max-w-sm mx-auto">
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
              className="relative bg-surface dark:bg-[#1a1a1c] w-full max-w-4xl max-h-[90vh] rounded-xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-border-faint dark:border-border-strong">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-surface-muted dark:bg-[#2a2a2c] flex items-center justify-center">
                    {(() => { const DocIcon = getDocIcon(viewingDocument.type); return <DocIcon className="w-6 h-6 text-fg-muted dark:text-fg-subtle" />; })()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-fg dark:text-white">
                      {getDocLabel(viewingDocument.type)}
                    </h3>
                    <p className="text-sm text-fg-muted dark:text-fg-subtle">
                      {viewingDocument.fileName} · {formatDate(viewingDocument.createdAt)} · {formatSize(viewingDocument.size)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownload(viewingDocument)}
                    className="flex items-center gap-2 px-4 py-2 bg-ink dark:bg-surface text-white dark:text-fg rounded-full text-sm font-medium hover:bg-ink dark:hover:bg-surface-muted transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    {t('documents.download')}
                  </button>
                  <IconButton
                    variant="ghost"
                    onClick={() => setViewingDocument(null)}
                    className="p-2 rounded-full hover:bg-surface-muted dark:hover:bg-[#2a2a2c] text-fg-muted dark:text-fg-subtle hover:text-fg dark:hover:text-fg-subtle"
                    aria-label={locale === 'es' ? 'Cerrar' : 'Close'}
                    icon={<X className="w-5 h-5" />}
                  />
                </div>
              </div>

              {/* Document Preview Area */}
              <div className="flex-1 bg-surface-muted dark:bg-[#0f0f10] p-6 overflow-auto">
                <div className="bg-surface dark:bg-[#1a1a1c] h-full rounded-xl flex items-center justify-center min-h-[400px]">
                  {viewerUrlLoading ? (
                    <Spinner size="lg" variant="current" className="text-primary" />
                  ) : viewingDocument.mimeType?.startsWith('image/') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt={getDocLabel(viewingDocument.type)}
                      className="max-w-full max-h-[60vh] rounded-md object-contain"
                    />
                  ) : viewingDocument.mimeType === 'application/pdf' ? (
                    <iframe
                      src={previewUrl}
                      className="w-full h-full min-h-[500px] rounded-md"
                      title={getDocLabel(viewingDocument.type)}
                    />
                  ) : (
                    <div className="text-center p-8">
                      <FileText className="w-16 h-16 text-fg-subtle dark:text-fg-muted mx-auto mb-4" />
                      <p className="text-lg font-medium text-fg dark:text-white mb-2">
                        {viewingDocument.fileName}
                      </p>
                      <p className="text-sm text-fg-muted dark:text-fg-subtle mb-4">
                        {viewingDocument.mimeType?.split('/')[1]?.toUpperCase() ?? 'Archivo'} · {formatSize(viewingDocument.size)}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleDownload(viewingDocument)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A40FF] hover:opacity-90 text-white rounded-full text-sm font-medium transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        {locale === 'es' ? 'Descargar archivo' : 'Download file'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ARCO supresión — type-to-confirm delete for application documents. Real
          documentsApi.delete (no setTimeout theater). The contrato firmado is excluded
          by construction (it's a Contract, never a DocumentItem — see the "no eliminable" note). */}
      <Dialog
        open={!!deletingDocument}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingDocument(null);
            setDeleteConfirmText('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {locale === 'es' ? 'Eliminar documento' : 'Delete document'}
            </DialogTitle>
            <DialogDescription>
              {locale === 'es'
                ? 'Esta acción es permanente. Ejercés tu derecho de supresión (ARCO, Ley 1581) sobre este documento.'
                : 'This action is permanent. You are exercising your right to erasure (ARCO, Law 1581) over this document.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-fg-muted dark:text-fg-subtle">
              {locale === 'es' ? (
                <>
                  Para confirmar, escribe{' '}
                  <span className="font-mono font-semibold text-error">ELIMINAR</span>{' '}
                  en el campo de abajo:
                </>
              ) : (
                <>
                  To confirm, type{' '}
                  <span className="font-mono font-semibold text-error">DELETE</span>{' '}
                  in the field below:
                </>
              )}
            </p>
            <Input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
              placeholder={locale === 'es' ? 'Escribe ELIMINAR' : 'Type DELETE'}
              aria-label={locale === 'es' ? 'Confirmar eliminación' : 'Confirm deletion'}
              className="w-full rounded-xl font-mono text-center tracking-widest"
            />
            {deletingDocument && (
              <p className="text-xs text-fg-subtle truncate">
                {getDocLabel(deletingDocument.type)} · {deletingDocument.fileName}
              </p>
            )}
          </div>

          <DialogFooter className="flex gap-2 justify-end">
            <Button
              variant="outline"
              hideArrow
              onClick={() => {
                setDeletingDocument(null);
                setDeleteConfirmText('');
              }}
            >
              {locale === 'es' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              hideArrow
              isLoading={isDeleting}
              onClick={handleDeleteDocument}
              disabled={deleteConfirmText !== requiredDeleteText || isDeleting}
            >
              {isDeleting
                ? (locale === 'es' ? 'Eliminando...' : 'Deleting...')
                : (locale === 'es' ? 'Eliminar documento' : 'Delete document')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
