'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Eye, MagnifyingGlass, Calendar, CheckCircle, Clock, File, SealCheck, House, X, CaretLeft, CaretRight, FolderOpen, ArrowUpRight } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useOnboardingStatus } from '@/lib/hooks/use-onboarding-status';
import { CompleteProfileFirst } from '@/components/tenant/CompleteProfileFirst';
import { EmptyState } from '@/components/ui/empty-state';

// Mock documents data
const mockDocuments = [
  {
    id: '1',
    name: 'Contrato de Arriendo',
    type: 'contract',
    property: 'Departamento Providencia',
    date: '2024-01-15',
    size: '2.4 MB',
    status: 'signed',
    icon: SealCheck,
    previewUrl: '/documents/contrato-arriendo.pdf',
  },
  {
    id: '2',
    name: 'Comprobante de Pago - Enero 2024',
    type: 'receipt',
    property: 'Departamento Providencia',
    date: '2024-01-05',
    size: '156 KB',
    status: 'available',
    icon: FileText,
    previewUrl: '/documents/comprobante-enero-2024.pdf',
  },
  {
    id: '3',
    name: 'Comprobante de Pago - Diciembre 2023',
    type: 'receipt',
    property: 'Departamento Providencia',
    date: '2023-12-05',
    size: '148 KB',
    status: 'available',
    icon: FileText,
    previewUrl: '/documents/comprobante-diciembre-2023.pdf',
  },
  {
    id: '4',
    name: 'Anexo de Contrato - Mascotas',
    type: 'contract',
    property: 'Departamento Providencia',
    date: '2024-01-20',
    size: '890 KB',
    status: 'pending',
    icon: File,
    previewUrl: '/documents/anexo-mascotas.pdf',
  },
  {
    id: '5',
    name: 'Inventario de Entrega',
    type: 'inventory',
    property: 'Departamento Providencia',
    date: '2024-01-15',
    size: '3.1 MB',
    status: 'signed',
    icon: SealCheck,
    previewUrl: '/documents/inventario-entrega.pdf',
  },
  {
    id: '6',
    name: 'Comprobante de Pago - Noviembre 2023',
    type: 'receipt',
    property: 'Departamento Providencia',
    date: '2023-11-05',
    size: '152 KB',
    status: 'available',
    icon: FileText,
    previewUrl: '/documents/comprobante-noviembre-2023.pdf',
  },
  {
    id: '7',
    name: 'Comprobante de Pago - Octubre 2023',
    type: 'receipt',
    property: 'Departamento Providencia',
    date: '2023-10-05',
    size: '149 KB',
    status: 'available',
    icon: FileText,
    previewUrl: '/documents/comprobante-octubre-2023.pdf',
  },
  {
    id: '8',
    name: 'Comprobante de Pago - Septiembre 2023',
    type: 'receipt',
    property: 'Departamento Providencia',
    date: '2023-09-05',
    size: '151 KB',
    status: 'available',
    icon: FileText,
    previewUrl: '/documents/comprobante-septiembre-2023.pdf',
  },
  {
    id: '9',
    name: 'Comprobante de Pago - Agosto 2023',
    type: 'receipt',
    property: 'Departamento Providencia',
    date: '2023-08-05',
    size: '147 KB',
    status: 'available',
    icon: FileText,
    previewUrl: '/documents/comprobante-agosto-2023.pdf',
  },
  {
    id: '10',
    name: 'Comprobante de Pago - Julio 2023',
    type: 'receipt',
    property: 'Departamento Providencia',
    date: '2023-07-05',
    size: '153 KB',
    status: 'available',
    icon: FileText,
    previewUrl: '/documents/comprobante-julio-2023.pdf',
  },
  {
    id: '11',
    name: 'Comprobante de Pago - Junio 2023',
    type: 'receipt',
    property: 'Departamento Providencia',
    date: '2023-06-05',
    size: '150 KB',
    status: 'available',
    icon: FileText,
    previewUrl: '/documents/comprobante-junio-2023.pdf',
  },
  {
    id: '12',
    name: 'Inventario de Entrega - Anexo Fotos',
    type: 'inventory',
    property: 'Departamento Providencia',
    date: '2024-01-15',
    size: '8.2 MB',
    status: 'signed',
    icon: SealCheck,
    previewUrl: '/documents/inventario-fotos.pdf',
  },
];

const ITEMS_PER_PAGE = 6;

type Document = (typeof mockDocuments)[number];

// documentTextTs moved inside component to access translations

/**
 * Tenant Documents Page - Leasefy Brand Style
 */
export default function DocumentosPage() {
  const { t, locale } = useI18n();
  const { isComplete: isOnboardingComplete, isLoading: isOnboardingLoading } = useOnboardingStatus();
  const [searchQuery, setMagnifyingGlassQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Only show real documents if onboarding is complete
  const documents = isOnboardingComplete ? mockDocuments : [];

  const documentTextTs = [
    { value: 'all', label: t('documents.categories.all'), icon: FolderOpen },
    { value: 'contract', label: t('documents.categories.contracts'), icon: SealCheck },
    { value: 'receipt', label: t('documents.categories.receipts'), icon: FileText },
    { value: 'inventory', label: locale === 'es' ? 'Inventarios' : 'Inventories', icon: File },
  ];

  const filteredDocuments = documents.filter((doc) => {
    const matchesMagnifyingGlass = doc.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || doc.type === selectedType;
    return matchesMagnifyingGlass && matchesType;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredDocuments.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedDocuments = filteredDocuments.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleFunnelChange = (type: string) => {
    setSelectedType(type);
    setCurrentPage(1);
  };

  const handleMagnifyingGlassChange = (query: string) => {
    setMagnifyingGlassQuery(query);
    setCurrentPage(1);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'signed':
        return {
          label: locale === 'es' ? 'Firmado' : 'Signed',
          bgColor: 'bg-emerald-100',
          textColor: 'text-emerald-700',
          icon: CheckCircle,
        };
      case 'pending':
        return {
          label: t('common.pending'),
          bgColor: 'bg-amber-100',
          textColor: 'text-amber-700',
          icon: Clock,
        };
      default:
        return {
          label: locale === 'es' ? 'Disponible' : 'Available',
          bgColor: 'bg-indigo-100',
          textColor: 'text-indigo-700',
          icon: FileText,
        };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Count stats
  const signedCount = documents.filter((d) => d.status === 'signed').length;
  const pendingCount = documents.filter(
    (d) => d.status === 'pending'
  ).length;
  const availableCount = documents.filter(
    (d) => d.status === 'available'
  ).length;

  // Loading state
  if (isOnboardingLoading) {
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
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
        >
          {/* Total Documents */}
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

          {/* Signed */}
          <div className="rounded-3xl bg-stone-50 dark:bg-[#1a1a1c] p-6">
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center shadow-sm mb-4">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">{locale === 'es' ? 'Firmados' : 'Signed'}</p>
            <p className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
              {signedCount}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">{locale === 'es' ? 'Completos' : 'Complete'}</p>
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
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">{locale === 'es' ? 'Por firmar' : 'To sign'}</p>
          </div>

          {/* Available */}
          <div className="rounded-3xl bg-stone-50 dark:bg-[#1a1a1c] p-6">
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center shadow-sm mb-4">
              <FileText className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">{locale === 'es' ? 'Disponibles' : 'Available'}</p>
            <p className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
              {availableCount}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">{locale === 'es' ? 'Para descargar' : 'To download'}</p>
          </div>
        </motion.div>

        {/* Funnels */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 mb-6"
        >
          {/* MagnifyingGlass */}
          <div className="relative flex-1">
            <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder={locale === 'es' ? 'Buscar documento...' : 'MagnifyingGlass document...'}
              value={searchQuery}
              onChange={(e) => handleMagnifyingGlassChange(e.target.value)}
              aria-label={locale === 'es' ? 'Buscar documento' : 'MagnifyingGlass document'}
              className="w-full pl-12 pr-4 py-3 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-[#1a1a1c] rounded-full w-fit">
            {documentTextTs.map((type) => {
              const IconComponent = type.icon;
              return (
                <button
                  key={type.value}
                  onClick={() => handleFunnelChange(type.value)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
                    selectedType === type.value
                      ? 'bg-white dark:bg-[#2a2a2c] text-neutral-900 dark:text-white shadow-sm'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
                  )}
                >
                  <IconComponent className="w-4 h-4" />
                  <span className="hidden sm:inline">{type.label}</span>
                </button>
              );
            })}
          </div>
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
              title="No hay documentos"
              description="Cuando subas documentos o recibas contratos, aparecerán aquí organizados."
              action={{ label: "Ver aplicaciones", href: "/inquilino/aplicaciones" }}
            />
          ) : filteredDocuments.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {paginatedDocuments.map((doc, index) => {
                    const Icon = doc.icon;
                    const statusConfig = getStatusConfig(doc.status);
                    const StatusIcon = statusConfig.icon;

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
                                statusConfig.bgColor,
                                statusConfig.textColor
                              )}
                            >
                              <StatusIcon className="w-3 h-3" />
                              {statusConfig.label}
                            </span>
                          </div>

                          <h3 className="font-semibold text-neutral-900 dark:text-white mb-2 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {doc.name}
                          </h3>

                          <div className="space-y-1.5">
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                              <House className="w-3 h-3" />
                              {doc.property}
                            </p>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-neutral-400 flex items-center gap-1.5">
                                <Calendar className="w-3 h-3" />
                                {formatDate(doc.date)}
                              </p>
                              <span className="text-xs text-neutral-400">
                                {doc.size}
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
                          <button className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-stone-50 dark:hover:bg-[#2a2a2c] hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                            <Download className="w-4 h-4" />
                            {t('documents.download')}
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
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
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
                    )
                  )}
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
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
            /* No results from search/filter */
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
                    <viewingDocument.icon className="w-6 h-6 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900 dark:text-white">
                      {viewingDocument.name}
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {viewingDocument.property} •{' '}
                      {formatDate(viewingDocument.date)} • {viewingDocument.size}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      alert((locale === 'es' ? 'Descarga iniciada: ' : 'Download started: ') + viewingDocument.name);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    {t('documents.download')}
                  </button>
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
                <div className="bg-white dark:bg-[#1a1a1c] h-full rounded-2xl shadow-sm p-8">
                  <div className="w-full max-w-2xl mx-auto">
                    {/* Document Header */}
                    <div className="text-center mb-8 pb-6 border-b border-neutral-200 dark:border-neutral-700">
                      <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
                        {viewingDocument.name}
                      </h2>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {locale === 'es' ? 'Propiedad' : 'Property'}: {viewingDocument.property}
                      </p>
                    </div>

                    {/* Mock Document Content */}
                    {viewingDocument.type === 'contract' && (
                      <div className="space-y-4 text-sm text-neutral-700 dark:text-neutral-300">
                        <p className="font-semibold text-center text-neutral-900 dark:text-white mb-6">
                          {locale === 'es' ? 'CONTRATO DE ARRENDAMIENTO' : 'LEASE AGREEMENT'}
                        </p>
                        <p>
                          {locale === 'es'
                            ? `En Santiago de Chile, a ${formatDate(viewingDocument.date)}, entre el ARRENDADOR y el ARRENDATARIO, se ha convenido el siguiente contrato de arrendamiento:`
                            : `In Santiago, Chile, on ${formatDate(viewingDocument.date)}, between the LANDLORD and the TENANT, the following lease agreement has been entered into:`}
                        </p>
                        <p>
                          <strong>{locale === 'es' ? 'PRIMERO' : 'FIRST'}:</strong> {locale === 'es'
                            ? `El arrendador entrega en arrendamiento al arrendatario la propiedad ubicada en ${viewingDocument.property}.`
                            : `The landlord leases to the tenant the property located at ${viewingDocument.property}.`}
                        </p>
                        <p>
                          <strong>{locale === 'es' ? 'SEGUNDO' : 'SECOND'}:</strong> {locale === 'es'
                            ? 'El precio del arrendamiento será pagado mensualmente dentro de los primeros 5 días de cada mes.'
                            : 'The rent shall be paid monthly within the first 5 days of each month.'}
                        </p>
                        <p>
                          <strong>{locale === 'es' ? 'TERCERO' : 'THIRD'}:</strong> {locale === 'es'
                            ? 'El presente contrato tendrá una duración de 12 meses, renovable de forma automática por períodos iguales.'
                            : 'This contract shall have a duration of 12 months, automatically renewable for equal periods.'}
                        </p>
                        <div className="pt-8 mt-8 border-t border-neutral-200 dark:border-neutral-700">
                          <div className="grid grid-cols-2 gap-8 text-center">
                            <div>
                              <div className="border-t border-neutral-900 dark:border-white pt-2 mx-8">
                                <p className="font-medium text-neutral-900 dark:text-white">
                                  {locale === 'es' ? 'Arrendador' : 'Landlord'}
                                </p>
                              </div>
                            </div>
                            <div>
                              <div className="border-t border-neutral-900 dark:border-white pt-2 mx-8">
                                <p className="font-medium text-neutral-900 dark:text-white">
                                  {locale === 'es' ? 'Arrendatario' : 'Tenant'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {viewingDocument.type === 'receipt' && (
                      <div className="space-y-4">
                        <div className="text-center">
                          <p className="font-semibold text-lg text-neutral-900 dark:text-white mb-1">
                            {locale === 'es' ? 'COMPROBANTE DE PAGO' : 'PAYMENT RECEIPT'}
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {locale === 'es' ? 'N°' : 'No.'} {viewingDocument.id.padStart(6, '0')}
                          </p>
                        </div>
                        <div className="bg-stone-50 dark:bg-[#2a2a2c] rounded-2xl p-5 space-y-3">
                          <div className="flex justify-between">
                            <span className="text-neutral-500 dark:text-neutral-400">{locale === 'es' ? 'Propiedad' : 'Property'}:</span>
                            <span className="font-medium text-neutral-900 dark:text-white">
                              {viewingDocument.property}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-500 dark:text-neutral-400">
                              {locale === 'es' ? 'Fecha de pago' : 'Payment date'}:
                            </span>
                            <span className="font-medium text-neutral-900 dark:text-white">
                              {formatDate(viewingDocument.date)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-500 dark:text-neutral-400">{locale === 'es' ? 'Concepto' : 'Concept'}:</span>
                            <span className="font-medium text-neutral-900 dark:text-white">
                              {locale === 'es' ? 'Arriendo mensual' : 'Monthly rent'}
                            </span>
                          </div>
                          <div className="flex justify-between pt-3 border-t border-neutral-200 dark:border-neutral-700">
                            <span className="font-semibold text-neutral-900 dark:text-white">
                              {locale === 'es' ? 'Total pagado' : 'Total paid'}:
                            </span>
                            <span className="font-bold text-xl text-neutral-900 dark:text-white">
                              $850.000
                            </span>
                          </div>
                        </div>
                        <div className="text-center pt-4">
                          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-2">
                            <CheckCircle className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                            {locale === 'es' ? 'Pago confirmado' : 'Payment confirmed'}
                          </p>
                        </div>
                      </div>
                    )}

                    {viewingDocument.type === 'inventory' && (
                      <div className="space-y-4 text-sm">
                        <p className="font-semibold text-center text-neutral-900 dark:text-white mb-6">
                          {locale === 'es' ? 'INVENTARIO DE ENTREGA' : 'DELIVERY INVENTORY'}
                        </p>
                        <p className="text-neutral-500 dark:text-neutral-400 text-center mb-4">
                          {locale === 'es' ? 'Fecha' : 'Date'}: {formatDate(viewingDocument.date)}
                        </p>
                        <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-700">
                          <table className="w-full min-w-[320px]">
                            <thead>
                              <tr className="bg-stone-50 dark:bg-[#2a2a2c]">
                                <th className="px-4 py-3 text-left font-semibold text-neutral-900 dark:text-white">
                                  {locale === 'es' ? 'Item' : 'Item'}
                                </th>
                                <th className="px-4 py-3 text-center font-semibold text-neutral-900 dark:text-white">
                                  {locale === 'es' ? 'Cantidad' : 'Quantity'}
                                </th>
                                <th className="px-4 py-3 text-left font-semibold text-neutral-900 dark:text-white">
                                  {locale === 'es' ? 'Estado' : 'Condition'}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                              <tr>
                                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                                  {locale === 'es' ? 'Llaves' : 'Keys'}
                                </td>
                                <td className="px-4 py-3 text-center text-neutral-700 dark:text-neutral-300">
                                  3
                                </td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full">
                                    {locale === 'es' ? 'Buen estado' : 'Good condition'}
                                  </span>
                                </td>
                              </tr>
                              <tr>
                                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                                  {locale === 'es' ? 'Control remoto portón' : 'Gate remote control'}
                                </td>
                                <td className="px-4 py-3 text-center text-neutral-700 dark:text-neutral-300">
                                  1
                                </td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full">
                                    {locale === 'es' ? 'Buen estado' : 'Good condition'}
                                  </span>
                                </td>
                              </tr>
                              <tr>
                                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                                  {locale === 'es' ? 'Refrigerador' : 'Refrigerator'}
                                </td>
                                <td className="px-4 py-3 text-center text-neutral-700 dark:text-neutral-300">
                                  1
                                </td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full">
                                    {locale === 'es' ? 'Funcionando' : 'Working'}
                                  </span>
                                </td>
                              </tr>
                              <tr>
                                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                                  {locale === 'es' ? 'Cocina' : 'Stove'}
                                </td>
                                <td className="px-4 py-3 text-center text-neutral-700 dark:text-neutral-300">
                                  1
                                </td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full">
                                    {locale === 'es' ? 'Funcionando' : 'Working'}
                                  </span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
