'use client';
import { PageGuard } from '@/components/auth/PageGuard';

import { useState, useMemo } from 'react';
import { useI18n } from '@/lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  FileText,
  FolderOpen,
  FilePlus,
  ClipboardText,
  Plus,
  MagnifyingGlass,
  Funnel,
  GridFour,
  List,
  Calendar,
  Buildings,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import {
  DocumentoTemplates,
  DocumentoManager,
  ActaEntregaForm,
  ActaEntregaViewer,
} from '@/components/inmobiliaria';
import type { DocumentTemplate, PropertyDocument, ActaEntrega } from '@/lib/types/inmobiliaria';
import {
  useDocumentTemplates,
  usePropertyDocuments,
  useActasEntrega,
  useConsignaciones,
  documentosApi,
  actasApi,
} from '@/lib/hooks/useInmobiliaria';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

// ============================================================================
// Types
// ============================================================================

type DocTab = 'documentos' | 'plantillas' | 'actas';

interface TabConfig {
  id: DocTab;
  label: string;
  icon: React.ElementType;
  count?: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getDocumentStats(documents: PropertyDocument[], actas: ActaEntrega[]) {
  const total = documents.length;
  const signed = documents.filter((d) => d.status === 'signed').length;
  const pending = documents.filter((d) => d.status === 'pending_signature').length;
  const actasCompleted = actas.filter((a) => a.status === 'completed').length;
  const actasPending = actas.filter((a) => a.status === 'draft' || a.status === 'in_progress').length;

  return { total, signed, pending, actasCompleted, actasPending };
}

// ============================================================================
// Stat Card Component
// ============================================================================

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  bgColor: string;
  iconColor: string;
}

function StatCard({ icon: Icon, label, value, bgColor, iconColor }: StatCardProps) {
  return (
    <div className="p-4 rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', bgColor)}>
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Acta Card Component
// ============================================================================

interface ActaCardProps {
  acta: ActaEntrega;
  onClick: () => void;
}

function ActaCard({ acta, onClick }: ActaCardProps) {
  const { t, locale } = useI18n();
  const statusConfig: Record<ActaEntrega['status'], { label: string; className: string }> = {
    draft: {
      label: t('inmobiliaria.documentos.actas.status.draft'),
      className: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
    },
    in_progress: {
      label: t('inmobiliaria.documentos.actas.status.inProgress'),
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    },
    pending_signatures: {
      label: t('inmobiliaria.documentos.actas.status.pendingSignatures'),
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    },
    completed: {
      label: t('inmobiliaria.documentos.actas.status.completed'),
      className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
  };

  const config = statusConfig[acta.status];

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="w-full p-4 rounded-xl border border-border bg-card hover:shadow-md transition-shadow text-left"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardText className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {acta.type === 'entrega' ? t('inmobiliaria.documentos.actas.typeEntrega') : t('inmobiliaria.documentos.actas.typeDevolucion')}
            </span>
          </div>
          <p className="font-medium text-foreground truncate">{acta.propertyTitle}</p>
          <p className="text-sm text-muted-foreground truncate">{acta.tenantName}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>{new Date(acta.deliveryDate).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US')}</span>
          </div>
        </div>
        <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', config.className)}>
          {config.label}
        </span>
      </div>
    </motion.button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * DocumentosPage - Document management center
 * Route: /panel/inmobiliaria/documentos
 */
function DocumentosContent() {
  const { t, locale } = useI18n();

  // API Hooks
  const { documents, isLoading: isLoadingDocuments } = usePropertyDocuments();
  const { templates, isLoading: isLoadingTemplates } = useDocumentTemplates();
  const { actas, isLoading: isLoadingActas, setData: setActas } = useActasEntrega();
  const { consignaciones, isLoading: isLoadingConsignaciones } = useConsignaciones({ status: 'active' });

  // State
  const [activeTab, setActiveTab] = useState<DocTab>('documentos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActa, setSelectedActa] = useState<ActaEntrega | null>(null);
  const [isActaFormOpen, setIsActaFormOpen] = useState(false);
  const [isActaViewerOpen, setIsActaViewerOpen] = useState(false);
  const [actaFormType, setActaFormType] = useState<'entrega' | 'devolucion'>('entrega');

  // Stats
  const stats = useMemo(() => getDocumentStats(documents, actas), [documents, actas]);

  // Filtered actas
  const filteredActas = useMemo(() => {
    if (!searchQuery.trim()) return actas;
    const query = searchQuery.toLowerCase();
    return actas.filter(
      (acta) =>
        acta.propertyTitle.toLowerCase().includes(query) ||
        acta.tenantName.toLowerCase().includes(query)
    );
  }, [actas, searchQuery]);

  // Tabs configuration
  const TABS: TabConfig[] = useMemo(() => [
    { id: 'documentos', label: t('inmobiliaria.documentos.title'), icon: FolderOpen, count: documents.length },
    { id: 'plantillas', label: t('inmobiliaria.documentos.filters.templates'), icon: FilePlus, count: templates.length },
    { id: 'actas', label: t('inmobiliaria.documentos.filters.actas'), icon: ClipboardText, count: actas.length },
  ], [t, documents.length, templates.length, actas.length]);

  // -------------------------------------------------------------------------
  // Handlers - Templates
  // -------------------------------------------------------------------------

  const handlePreviewTemplate = (template: DocumentTemplate) => {
    toast.info(t('inmobiliaria.documentos.toasts.preview'), {
      description: t('inmobiliaria.documentos.toasts.openingPreview', { name: template.name }),
    });
  };

  const handleUseTemplate = (template: DocumentTemplate) => {
    toast.success(t('inmobiliaria.documentos.toasts.usingTemplate'), {
      description: t('inmobiliaria.documentos.toasts.creatingDocument', { name: template.name }),
    });
  };

  // -------------------------------------------------------------------------
  // Handlers - Documents
  // -------------------------------------------------------------------------

  const handleViewDocument = (doc: PropertyDocument) => {
    if (doc.fileUrl) {
      window.open(doc.fileUrl, '_blank');
    } else {
      toast.info(t('inmobiliaria.documentos.toasts.previewNotAvailable'), {
        description: t('inmobiliaria.documentos.toasts.noFileAssociated'),
      });
    }
  };

  const handleDownloadDocument = (doc: PropertyDocument) => {
    if (doc.fileUrl) {
      const link = document.createElement('a');
      link.href = doc.fileUrl;
      link.download = doc.name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(t('inmobiliaria.documentos.toasts.downloadStarted'), {
        description: doc.name,
      });
    } else {
      toast.error(t('inmobiliaria.documentos.toasts.cannotDownload'), {
        description: t('inmobiliaria.documentos.toasts.noFileAssociated'),
      });
    }
  };

  const handleSendForSignature = (doc: PropertyDocument) => {
    toast.success(t('inmobiliaria.documentos.toasts.sentForSignature'), {
      description: t('inmobiliaria.documentos.toasts.sentToSigners', { name: doc.name }),
    });
  };

  const handleDuplicateDocument = (doc: PropertyDocument) => {
    toast.success(t('inmobiliaria.documentos.toasts.documentDuplicated'), {
      description: t('inmobiliaria.documentos.toasts.copyCreated', { name: doc.name }),
    });
  };

  const handleDeleteDocument = (documentId: string) => {
    const doc = documents.find((d) => d.id === documentId);
    toast.success(t('inmobiliaria.documentos.toasts.documentDeleted'), {
      description: doc?.name || documentId,
    });
  };

  const handleGenerateNew = (templateId: string, _propertyId: string) => {
    switch (templateId) {
      case 'tpl-acta-entrega':
        setActaFormType('entrega');
        setIsActaFormOpen(true);
        break;
      case 'tpl-acta-devolucion':
        setActaFormType('devolucion');
        setIsActaFormOpen(true);
        break;
      case 'tpl-contrato-arrendamiento':
        toast.info(t('inmobiliaria.documentos.templates.contract'), {
          description: t('inmobiliaria.documentos.toasts.comingSoon'),
        });
        break;
      case 'tpl-inventario':
        toast.info(t('inmobiliaria.documentos.toasts.inventory'), {
          description: t('inmobiliaria.documentos.toasts.comingSoon'),
        });
        break;
      case 'tpl-carta-incremento':
        toast.info(t('inmobiliaria.documentos.toasts.incrementLetter'), {
          description: t('inmobiliaria.documentos.toasts.comingSoon'),
        });
        break;
      default:
        toast.info(t('inmobiliaria.documentos.title'), {
          description: t('inmobiliaria.documentos.toasts.comingSoon'),
        });
    }
  };

  // -------------------------------------------------------------------------
  // Handlers - Actas
  // -------------------------------------------------------------------------

  const handleViewActa = (acta: ActaEntrega) => {
    setSelectedActa(acta);
    setIsActaViewerOpen(true);
  };

  const handleCreateActa = () => {
    setIsActaFormOpen(true);
  };

  const handleSaveActa = async (data: ActaEntrega) => {
    try {
      // Persist via the real API. The form builds the acta object; the backend
      // assigns the canonical id/timestamps and returns the persisted record.
      const created = await actasApi.create(data);

      // Update the local list with the persisted record returned by the API
      // (not a client-fabricated object).
      setActas((prev) => [created, ...(prev ?? [])]);

      setIsActaFormOpen(false);
      toast.success(t('inmobiliaria.documentos.toasts.actaCreated'), {
        description: t('inmobiliaria.documentos.toasts.actaSaved', { type: created.type === 'entrega' ? t('inmobiliaria.documentos.actas.typeEntrega').toLowerCase() : t('inmobiliaria.documentos.actas.typeDevolucion').toLowerCase() }),
      });
    } catch (error) {
      // Real failure: surface an error and keep the form open so the user can retry.
      console.error('Error creating acta:', error);
      toast.error(t('inmobiliaria.documentos.toasts.actaError'), {
        description: t('inmobiliaria.documentos.toasts.actaErrorDesc'),
      });
      // Re-throw so the form's submit handler can react (clear isSubmitting / skip its own success toast).
      throw error;
    }
  };

  const handleCancelActa = () => {
    setIsActaFormOpen(false);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <FileText className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            {t('inmobiliaria.documentos.title')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('inmobiliaria.documentos.subtitle')}
          </p>
        </div>
        <button
          onClick={handleCreateActa}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white uppercase tracking-wide font-mono hover:bg-indigo-700 font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          {t('inmobiliaria.documentos.newActa')}
        </button>
      </div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <StatCard
          icon={FolderOpen}
          label={t('inmobiliaria.documentos.stats.totalDocuments')}
          value={stats.total}
          bgColor="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-600 dark:text-blue-400"
        />
        <StatCard
          icon={FileText}
          label={t('inmobiliaria.documentos.stats.signed')}
          value={stats.signed}
          bgColor="bg-emerald-100 dark:bg-emerald-900/30"
          iconColor="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          icon={ClipboardText}
          label={t('inmobiliaria.documentos.stats.pendingSignature')}
          value={stats.pending}
          bgColor="bg-amber-100 dark:bg-amber-900/30"
          iconColor="text-amber-600 dark:text-amber-400"
        />
        <StatCard
          icon={Buildings}
          label={t('inmobiliaria.documentos.stats.actasCompleted')}
          value={stats.actasCompleted}
          bgColor="bg-violet-100 dark:bg-violet-900/30"
          iconColor="text-violet-600 dark:text-violet-400"
        />
      </motion.div>

      {/* Main Content Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-border bg-card overflow-hidden"
      >
        {/* Tabs Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-muted">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count !== undefined && (
                    <span
                      className={cn(
                        'px-1.5 py-0.5 text-xs rounded-full',
                        isActive
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400'
                          : 'bg-muted-foreground/20'
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search (for actas tab) */}
          {activeTab === 'actas' && (
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('inmobiliaria.documentos.searchActas')}
                className="pl-9 pr-4 py-2 w-full sm:w-64 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          )}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="p-4"
          >
            {/* Documentos Tab */}
            {activeTab === 'documentos' && (
              <>
                {isLoadingDocuments ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                ) : (
                  <DocumentoManager
                    documents={documents}
                    onView={handleViewDocument}
                    onDownload={handleDownloadDocument}
                    onSendForSignature={handleSendForSignature}
                    onDuplicate={handleDuplicateDocument}
                    onDelete={handleDeleteDocument}
                    onGenerateNew={handleGenerateNew}
                    minimal
                  />
                )}
              </>
            )}

            {/* Plantillas Tab */}
            {activeTab === 'plantillas' && (
              <>
                {isLoadingTemplates ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                ) : (
                  <DocumentoTemplates
                    templates={templates}
                    onPreview={handlePreviewTemplate}
                    onUseTemplate={handleUseTemplate}
                  />
                )}
              </>
            )}

            {/* Actas Tab */}
            {activeTab === 'actas' && (
              <>
                {isLoadingActas ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredActas.length === 0 ? (
                      <div className="rounded-2xl bg-neutral-50/80 dark:bg-white/[0.03] py-14 px-6 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-white dark:bg-white/[0.06] flex items-center justify-center mx-auto mb-5 shadow-sm dark:shadow-none">
                          <ClipboardText className="w-6 h-6 text-neutral-400 dark:text-neutral-500" />
                        </div>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                          {searchQuery ? t('inmobiliaria.documentos.noActasFound') : t('inmobiliaria.documentos.noActas')}
                        </p>
                        <button
                          onClick={handleCreateActa}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white uppercase tracking-wide font-mono hover:bg-indigo-700 text-sm font-medium transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          {t('inmobiliaria.documentos.createFirstActa')}
                        </button>
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredActas.map((acta) => (
                          <ActaCard key={acta.id} acta={acta} onClick={() => handleViewActa(acta)} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Acta Form Sheet */}
      <Sheet open={isActaFormOpen} onOpenChange={setIsActaFormOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ClipboardText className="w-5 h-5 text-indigo-600" />
              {t('inmobiliaria.documentos.newActaOf', { type: actaFormType === 'entrega' ? t('inmobiliaria.documentos.actas.typeEntrega') : t('inmobiliaria.documentos.actas.typeDevolucion') })}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <ActaEntregaForm
              initialData={{ type: actaFormType }}
              consignaciones={consignaciones.filter((c) => c.availability === 'rented')}
              onSave={handleSaveActa}
              onCancel={handleCancelActa}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Acta Viewer Sheet */}
      <Sheet open={isActaViewerOpen} onOpenChange={setIsActaViewerOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ClipboardText className="w-5 h-5 text-indigo-600" />
              {t('inmobiliaria.documentos.actaDetail')}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {selectedActa && <ActaEntregaViewer acta={selectedActa} />}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function DocumentosPage() {
  return (
    <PageGuard module="documentos">
      <DocumentosContent />
    </PageGuard>
  );
}
