'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Eye, MagnifyingGlass, Calendar, CheckCircle, Clock, X, CaretLeft, CaretRight, FolderOpen, IdentificationCard, Money, Briefcase, Bank } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useOnboardingStatus } from '@/lib/hooks/use-onboarding-status';
import { CompleteProfileFirst } from '@/components/tenant/CompleteProfileFirst';
import { EmptyState } from '@/components/ui/empty-state';
import { useMyApplications } from '@/lib/hooks/useApplications';
import { documentsApi, type DocumentItem } from '@/lib/api/documents.service';

// Document type labels and icons
const DOC_TYPE_CONFIG: Record<string, { label: string; labelEn: string; icon: typeof FileText }> = {
  id_document: { label: 'Documento de identidad', labelEn: 'ID Document', icon: IdentificationCard },
  income_proof: { label: 'Comprobante de ingresos', labelEn: 'Income Proof', icon: Money },
  employment_letter: { label: 'Carta laboral', labelEn: 'Employment Letter', icon: Briefcase },
  bank_statements: { label: 'Extractos bancarios', labelEn: 'Bank Statements', icon: Bank },
  credit_report: { label: 'Reporte crediticio', labelEn: 'Credit Report', icon: FileText },
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

  // Stats
  const verifiedCount = documents.filter((d) => d.verified).length;
  const pendingCount = documents.filter((d) => !d.verified).length;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0f0f10] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show "complete profile first" if onboarding not done
  if (!isOnboardingComplete) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0f0f10]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <CompleteProfileFirst context="documents" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f0f10]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-medium text-neutral-900 dark:text-white tracking-tight">
            {t('documents.title')}
          </h1>
          <p className="mt-1 text-neutral-500 dark:text-neutral-400">
            {t('documents.subtitle')}
          </p>
        </motion.header>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8"
        >
          {/* Total */}
          <div className="rounded-3xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/60 dark:to-indigo-900/40 border border-indigo-100 dark:border-indigo-800/60 p-6">
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center shadow-sm mb-4">
              <FolderOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <p className="text-sm text-indigo-600 dark:text-indigo-400 mb-1">Total</p>
            <p className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
              {documents.length}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">{t('nav.documents')}</p>
          </div>

          {/* Verified */}
          <div className="rounded-3xl bg-stone-50 dark:bg-[#1a1a1c] p-6">
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center shadow-sm mb-4">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
              {locale === 'es' ? 'Verificados' : 'Verified'}
            </p>
            <p className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
              {verifiedCount}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
              {locale === 'es' ? 'Aprobados' : 'Approved'}
            </p>
          </div>

          {/* Pending */}
          <div className="rounded-3xl bg-stone-50 dark:bg-[#1a1a1c] p-6">
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center shadow-sm mb-4">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">{t('common.pending')}</p>
            <p className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
              {pendingCount}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
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
            <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder={locale === 'es' ? 'Buscar documento...' : 'Search document...'}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              aria-label={locale === 'es' ? 'Buscar documento' : 'Search document'}
              className="w-full pl-12 pr-4 py-3 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Type Filter Pills */}
          {filterCategories.length > 1 && (
            <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-[#1a1a1c] rounded-full w-fit overflow-x-auto">
              {filterCategories.map((cat) => {
                const IconComponent = cat.icon;
                return (
                  <button
                    key={cat.value}
                    onClick={() => handleFilterChange(cat.value)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap',
                      selectedType === cat.value
                        ? 'bg-white dark:bg-[#2a2a2c] text-neutral-900 dark:text-white shadow-sm'
                        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
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

        {/* Documents Grid */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
              {t('nav.documents')}
            </h2>
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
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
                        className="group rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] hover:border-neutral-300 dark:hover:border-neutral-600 hover:shadow-lg transition-all duration-300 overflow-hidden"
                      >
                        {/* Document Header */}
                        <div className="p-5">
                          <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-[#2a2a2c] flex items-center justify-center">
                              <Icon className="w-6 h-6 text-neutral-600 dark:text-neutral-400" />
                            </div>
                            <span
                              className={cn(
                                'px-2.5 py-1 text-xs font-medium rounded-full flex items-center gap-1',
                                doc.verified
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-amber-100 text-amber-700'
                              )}
                            >
                              {doc.verified ? (
                                <><CheckCircle className="w-3 h-3" /> {locale === 'es' ? 'Verificado' : 'Verified'}</>
                              ) : (
                                <><Clock className="w-3 h-3" /> {locale === 'es' ? 'En revisión' : 'Under review'}</>
                              )}
                            </span>
                          </div>

                          <h3 className="font-semibold text-neutral-900 dark:text-white mb-2 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {getDocLabel(doc.type)}
                          </h3>

                          <div className="space-y-1.5">
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 truncate">
                              <FileText className="w-3 h-3 flex-shrink-0" />
                              {doc.fileName}
                            </p>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-neutral-400 flex items-center gap-1.5">
                                <Calendar className="w-3 h-3" />
                                {formatDate(doc.createdAt)}
                              </p>
                              <span className="text-xs text-neutral-400">
                                {formatSize(doc.size)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center border-t border-neutral-100 dark:border-neutral-700">
                          <button
                            onClick={() => setViewingDocument(doc)}
                            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-stone-50 dark:hover:bg-[#2a2a2c] hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            {t('documents.view')}
                          </button>
                          <div className="w-px h-8 bg-neutral-100 dark:bg-neutral-700" />
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-stone-50 dark:hover:bg-[#2a2a2c] hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
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
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={cn(
                      'p-2 rounded-full transition-all',
                      currentPage === 1
                        ? 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-stone-100 dark:hover:bg-[#2a2a2c]'
                    )}
                  >
                    <CaretLeft className="w-5 h-5" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        'w-10 h-10 rounded-full text-sm font-medium transition-all',
                        currentPage === page
                          ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-stone-100 dark:hover:bg-[#2a2a2c]'
                      )}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={cn(
                      'p-2 rounded-full transition-all',
                      currentPage === totalPages
                        ? 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-stone-100 dark:hover:bg-[#2a2a2c]'
                    )}
                  >
                    <CaretRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-3xl bg-stone-50 dark:bg-[#1a1a1c] p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-white dark:bg-[#2a2a2c] flex items-center justify-center mx-auto mb-4 shadow-sm">
                <FileText className="w-8 h-8 text-neutral-400" />
              </div>
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">
                {t('documents.noDocuments')}
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
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
              className="relative bg-white dark:bg-[#1a1a1c] w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 dark:border-neutral-700">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-[#2a2a2c] flex items-center justify-center">
                    {(() => { const DocIcon = getDocIcon(viewingDocument.type); return <DocIcon className="w-6 h-6 text-neutral-600 dark:text-neutral-400" />; })()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900 dark:text-white">
                      {getDocLabel(viewingDocument.type)}
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
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
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    {t('documents.download')}
                  </a>
                  <button
                    onClick={() => setViewingDocument(null)}
                    className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-[#2a2a2c] text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Document Preview Area */}
              <div className="flex-1 bg-stone-50 dark:bg-[#0f0f10] p-6 overflow-auto">
                <div className="bg-white dark:bg-[#1a1a1c] h-full rounded-2xl shadow-sm flex items-center justify-center min-h-[400px]">
                  {viewingDocument.mimeType?.startsWith('image/') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={viewingDocument.url}
                      alt={getDocLabel(viewingDocument.type)}
                      className="max-w-full max-h-[60vh] rounded-lg object-contain"
                    />
                  ) : viewingDocument.mimeType === 'application/pdf' ? (
                    <iframe
                      src={viewingDocument.url}
                      className="w-full h-full min-h-[500px] rounded-lg"
                      title={getDocLabel(viewingDocument.type)}
                    />
                  ) : (
                    <div className="text-center p-8">
                      <FileText className="w-16 h-16 text-neutral-400 dark:text-neutral-500 mx-auto mb-4" />
                      <p className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                        {viewingDocument.fileName}
                      </p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                        {viewingDocument.mimeType?.split('/')[1]?.toUpperCase() ?? 'Archivo'} · {formatSize(viewingDocument.size)}
                      </p>
                      <a
                        href={viewingDocument.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white uppercase tracking-wide font-mono rounded-full text-sm font-medium transition-colors"
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
