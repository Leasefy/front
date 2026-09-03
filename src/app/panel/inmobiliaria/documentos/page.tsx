'use client';
import { PageGuard } from '@/components/auth/PageGuard';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  FileText,
  FolderOpen,
  FilePlus,
  ClipboardText,
  Plus,
  Funnel,
  GridFour,
  List,
  Calendar,
  Buildings,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button, Spinner } from '@/components/ui';
import { SearchInput, StatusBadge } from '@leasefy/cadence';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmptyState as DSEmptyState } from '@/components/ui/empty-state';
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
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';

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
}

// Neutral icon tile per DS golden rule (blue = actionable only).
function StatCard({ icon: Icon, label, value }: StatCardProps) {
  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-surface-muted flex items-center justify-center">
          <Icon className="w-5 h-5 text-fg-muted" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-semibold tabular-nums text-fg">{value}</p>
          <p className="text-xs text-fg-muted">{label}</p>
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
      className: 'bg-muted text-muted-foreground',
    },
    in_progress: {
      label: t('inmobiliaria.documentos.actas.status.inProgress'),
      className: 'bg-primary-soft text-primary',
    },
    pending_signatures: {
      label: t('inmobiliaria.documentos.actas.status.pendingSignatures'),
      className: 'bg-warning-soft text-warning',
    },
    completed: {
      label: t('inmobiliaria.documentos.actas.status.completed'),
      className: 'bg-success-soft text-success',
    },
  };

  const config = statusConfig[acta.status];

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="w-full p-4 rounded-lg border border-border bg-card hover:border-fg/20 transition-colors text-left"
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
        <StatusBadge
          tone={acta.status === 'completed' ? 'success' : acta.status === 'pending_signatures' ? 'warning' : acta.status === 'in_progress' ? 'info' : 'neutral'}
          dot={false}
        >
          {config.label}
        </StatusBadge>
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
  const { documents, isLoading: isLoadingDocuments, errorCrudo: errorDocuments, refetch: recargarDocuments } = usePropertyDocuments();
  const { templates, isLoading: isLoadingTemplates, errorCrudo: errorTemplates, refetch: recargarTemplates } = useDocumentTemplates();
  const { actas, isLoading: isLoadingActas, refetch: recargarActas } = useActasEntrega();
  const { consignaciones, isLoading: isLoadingConsignaciones } = useConsignaciones({ status: 'active' });

  // State
  // `?tab=plantillas|actas` abre en esa pestaña: la ficha del inmueble manda
  // acá a generar el contrato desde una plantilla.
  const searchParams = useSearchParams();
  const tabInicial = searchParams.get('tab');
  const [activeTab, setTab] = useState<DocTab>(
    tabInicial === 'plantillas' || tabInicial === 'actas' ? tabInicial : 'documentos',
  );
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

      // Y se relee la lista. Prepender el objeto creado alcanzaba para verlo,
      // pero deja la lista ordenada por el cliente y sin lo que el backend
      // recalcule. Releer es la misma regla que en el resto del panel.
      await recargarActas();

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
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-fg flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface-muted flex items-center justify-center">
              <FileText className="w-5 h-5 text-fg-muted" />
            </div>
            {t('inmobiliaria.documentos.title')}
          </h1>
          <p className="text-sm text-fg-muted max-w-2xl">
            {t('inmobiliaria.documentos.subtitle')}
          </p>
        </div>
        <Button onClick={handleCreateActa} hideArrow className="shrink-0">
          <Plus className="w-4 h-4" />
          {t('inmobiliaria.documentos.newActa')}
        </Button>
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
        />
        <StatCard
          icon={FileText}
          label={t('inmobiliaria.documentos.stats.signed')}
          value={stats.signed}
        />
        <StatCard
          icon={ClipboardText}
          label={t('inmobiliaria.documentos.stats.pendingSignature')}
          value={stats.pending}
        />
        <StatCard
          icon={Buildings}
          label={t('inmobiliaria.documentos.stats.actasCompleted')}
          value={stats.actasCompleted}
        />
      </motion.div>

      {/* Main Content Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-lg border border-border bg-card overflow-hidden"
      >
        <Tabs value={activeTab} onValueChange={(v) => setTab(v as DocTab)}>
        {/* Tabs Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-border bg-muted/30">
          <TabsList variant="segmented">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.id} value={tab.id} className="group inline-flex items-center gap-2 whitespace-nowrap">
                  <Icon className="w-4 h-4 shrink-0" />
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="px-1.5 py-0.5 text-xs rounded-full tabular-nums bg-muted-foreground/20 group-data-[state=active]:bg-primary-soft group-data-[state=active]:text-primary">
                      {tab.count}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Search (for actas tab) */}
          {activeTab === 'actas' && (
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              placeholder={t('inmobiliaria.documentos.searchActas')}
              inputSize="md"
              className="w-full sm:w-64"
            />
          )}
        </div>

        {/* Tab Content */}
        <TabsContent value={activeTab} className="mt-0">
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
                {/* Sin esto, un fallo de carga se veía igual que «no hay
                    documentos» — y sobre eso nadie reintenta. El error ya
                    venía del hook; la pantalla lo dejaba caer. */}
                {isLoadingDocuments ? (
                  <div className="flex items-center justify-center py-12">
                    <Spinner size="lg" />
                  </div>
                ) : errorDocuments ? (
                  <FalloDeCarga
                    error={errorDocuments}
                    queEs="los documentos"
                    onReintentar={() => void recargarDocuments()}
                    enmarcado={false}
                  />
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
                    <Spinner size="lg" />
                  </div>
                ) : errorTemplates ? (
                  <FalloDeCarga
                    error={errorTemplates}
                    queEs="las plantillas"
                    onReintentar={() => void recargarTemplates()}
                    enmarcado={false}
                  />
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
                    <Spinner size="lg" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredActas.length === 0 ? (
                      searchQuery ? (
                        <DSEmptyState
                          icon={ClipboardText}
                          title={t('inmobiliaria.documentos.noActasFound')}
                          description={t('inmobiliaria.documentos.noActasFound')}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-muted">
                            <ClipboardText weight="duotone" className="h-6 w-6 text-fg-muted" aria-hidden="true" />
                          </div>
                          <p className="max-w-sm text-sm leading-relaxed text-fg-muted">
                            {t('inmobiliaria.documentos.noActas')}
                          </p>
                          <Button onClick={handleCreateActa} size="sm" hideArrow className="mt-1">
                            <Plus className="w-4 h-4" />
                            {t('inmobiliaria.documentos.createFirstActa')}
                          </Button>
                        </div>
                      )
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
        </TabsContent>
        </Tabs>
      </motion.div>

      {/* Acta Form Sheet */}
      <Sheet open={isActaFormOpen} onOpenChange={setIsActaFormOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-lg font-semibold text-fg">
              <ClipboardText className="w-5 h-5 text-primary" />
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
            <SheetTitle className="flex items-center gap-2 text-lg font-semibold text-fg">
              <ClipboardText className="w-5 h-5 text-primary" />
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
