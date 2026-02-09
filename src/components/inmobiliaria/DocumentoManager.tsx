'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  MagnifyingGlass,
  Funnel,
  GridFour,
  List,
  DotsThree,
  Eye,
  DownloadSimple,
  PaperPlaneTilt,
  SignIn,
  Copy,
  Trash,
  X,
  Clock,
  CheckCircle,
  Warning,
  XCircle,
  FilePlus,
  CaretDown,
  Calendar,
  Buildings,
  User,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListSeparator,
  DropdownListTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PropertyDocument, DocumentCategory, DocumentStatus } from '@/lib/types/inmobiliaria';
import {
  getDocumentCategoryLabel,
  getDocumentCategoryColor,
  getDocumentStatusLabel,
  getDocumentStatusColor,
  formatFileSize,
} from '@/lib/types/inmobiliaria';

// Status icon mapping
const STATUS_ICONS: Record<DocumentStatus, React.ElementType> = {
  draft: FileText,
  pending_signature: Clock,
  signed: CheckCircle,
  expired: Warning,
  cancelled: XCircle,
};

// Format relative date
function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} dias`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

// Get signature status display
function getSignatureStatus(doc: PropertyDocument): string {
  if (!doc.signatures || doc.signatures.length === 0) return '-';
  const signed = doc.signatures.filter((s) => s.status === 'signed').length;
  return `${signed}/${doc.signatures.length} firmado${signed === 1 ? '' : 's'}`;
}

interface DocumentoManagerProps {
  documents: PropertyDocument[];
  onView?: (document: PropertyDocument) => void;
  onDownload?: (document: PropertyDocument) => void;
  onSendForSignature?: (document: PropertyDocument) => void;
  onDuplicate?: (document: PropertyDocument) => void;
  onDelete?: (documentId: string) => void;
  onGenerateNew?: (templateId: string, propertyId: string) => void;
  isLoading?: boolean;
  /** Hide header and summary stats when embedded in a page with its own header */
  minimal?: boolean;
}

/**
 * DocumentoManager - Document list with filters and actions
 * Displays property documents in a filterable table/grid with bulk actions
 */
export function DocumentoManager({
  documents,
  onView,
  onDownload,
  onSendForSignature,
  onDuplicate,
  onDelete,
  onGenerateNew,
  isLoading = false,
  minimal = false,
}: DocumentoManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedCategories, setSelectedCategories] = useState<DocumentCategory[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<DocumentStatus[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Filter documents
  const filteredDocuments = useMemo(() => {
    let filtered = [...documents];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          d.propertyTitle.toLowerCase().includes(query) ||
          d.tenantName?.toLowerCase().includes(query) ||
          d.propietarioName.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((d) => selectedCategories.includes(d.category));
    }

    // Status filter
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((d) => selectedStatuses.includes(d.status));
    }

    // Sort by most recent
    return filtered.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [documents, searchQuery, selectedCategories, selectedStatuses]);

  // Calculate summary stats
  const stats = useMemo(() => {
    return {
      total: documents.length,
      pendingSignature: documents.filter((d) => d.status === 'pending_signature').length,
      signed: documents.filter((d) => d.status === 'signed').length,
      expired: documents.filter((d) => d.status === 'expired').length,
    };
  }, [documents]);

  // Toggle document selection
  const toggleDocSelection = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  // Select all visible documents
  const toggleSelectAll = () => {
    if (selectedDocIds.length === filteredDocuments.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(filteredDocuments.map((d) => d.id));
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
    setSelectedStatuses([]);
  };

  const hasActiveFilters = searchQuery || selectedCategories.length > 0 || selectedStatuses.length > 0;

  // Category options
  const categoryOptions: DocumentCategory[] = ['contrato', 'acta', 'inventario', 'poliza', 'carta', 'otro'];

  // Status options
  const statusOptions: DocumentStatus[] = ['draft', 'pending_signature', 'signed', 'expired', 'cancelled'];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {!minimal ? (
          <div>
            <h2 className="text-xl font-semibold text-foreground">Documentos</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredDocuments.length} de {documents.length} documentos
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                viewMode === 'list'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <List className="w-4 h-4" />
              Lista
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                viewMode === 'grid'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <GridFour className="w-4 h-4" />
              Tarjetas
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          {/* View Toggle - only in non-minimal mode */}
          {!minimal && (
            <div className="flex border rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-1.5 rounded',
                  viewMode === 'list'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1.5 rounded',
                  viewMode === 'grid'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <GridFour className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Generate Document Dropdown */}
          {onGenerateNew && (
            <DropdownList>
              <DropdownListTrigger asChild>
                <Button className={cn("gap-2", minimal && "bg-indigo-600 hover:bg-indigo-700")} hideArrow>
                  <FilePlus className="w-4 h-4" />
                  Generar Documento
                  <CaretDown className="w-4 h-4" />
                </Button>
              </DropdownListTrigger>
              <DropdownListContent align="end" className="w-48">
                <DropdownListItem onSelect={() => onGenerateNew('tpl-contrato-arrendamiento', '')}>
                  Contrato de Arrendamiento
                </DropdownListItem>
                <DropdownListItem onSelect={() => onGenerateNew('tpl-acta-entrega', '')}>
                  Acta de Entrega
                </DropdownListItem>
                <DropdownListItem onSelect={() => onGenerateNew('tpl-acta-devolucion', '')}>
                  Acta de Devolucion
                </DropdownListItem>
                <DropdownListSeparator />
                <DropdownListItem onSelect={() => onGenerateNew('tpl-inventario', '')}>
                  Inventario
                </DropdownListItem>
                <DropdownListItem onSelect={() => onGenerateNew('tpl-carta-incremento', '')}>
                  Carta de Incremento
                </DropdownListItem>
              </DropdownListContent>
            </DropdownList>
          )}
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[200px] max-w-md">
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar documento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tipo</label>
            <Select
              value={selectedCategories.length === 1 ? selectedCategories[0] : 'all'}
              onValueChange={(v) => {
                if (v === 'all') {
                  setSelectedCategories([]);
                } else {
                  setSelectedCategories([v as DocumentCategory]);
                }
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {categoryOptions.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {getDocumentCategoryLabel(cat)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Estado</label>
            <Select
              value={selectedStatuses.length === 1 ? selectedStatuses[0] : 'all'}
              onValueChange={(v) => {
                if (v === 'all') {
                  setSelectedStatuses([]);
                } else {
                  setSelectedStatuses([v as DocumentStatus]);
                }
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {getDocumentStatusLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 mb-0.5">
              <X className="w-4 h-4" />
              Limpiar
            </Button>
          )}
        </div>

        {/* Summary Stats - hidden in minimal mode */}
        {!minimal && (
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-medium">{stats.total}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">Pendientes firma:</span>
              <span className="font-medium text-amber-600">{stats.pendingSignature}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">Firmados:</span>
              <span className="font-medium text-emerald-600">{stats.signed}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-muted-foreground">Vencidos:</span>
              <span className="font-medium text-red-600">{stats.expired}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedDocIds.length > 0 && (onDownload || onDelete) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800/50"
        >
          <span className="text-sm font-medium">
            {selectedDocIds.length} seleccionado{selectedDocIds.length > 1 ? 's' : ''}
          </span>
          {onDownload && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                selectedDocIds.forEach((id) => {
                  const doc = documents.find((d) => d.id === id);
                  if (doc) onDownload(doc);
                });
              }}
            >
              <DownloadSimple className="w-4 h-4" />
              Descargar
            </Button>
          )}
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-destructive hover:text-destructive"
              onClick={() => {
                selectedDocIds.forEach((id) => onDelete(id));
                setSelectedDocIds([]);
              }}
            >
              <Trash className="w-4 h-4" />
              Eliminar
            </Button>
          )}
        </motion.div>
      )}

      {/* Document List/Grid */}
      {isLoading ? (
        <div className={cn(
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
            : 'space-y-2'
        )}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={cn(
                'bg-muted animate-pulse rounded-lg',
                viewMode === 'grid' ? 'h-40' : 'h-16'
              )}
            />
          ))}
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">
            No se encontraron documentos
          </h3>
          <p className="text-sm text-muted-foreground">
            {hasActiveFilters
              ? 'Intenta ajustar los filtros'
              : 'No hay documentos disponibles'}
          </p>
        </div>
      ) : viewMode === 'list' ? (
        // Table View
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedDocIds.length === filteredDocuments.length && filteredDocuments.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Inmueble</TableHead>
                <TableHead>Inquilino</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Firmas</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Tamano</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map((doc) => {
                const StatusIcon = STATUS_ICONS[doc.status];

                return (
                  <TableRow
                    key={doc.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onView?.(doc)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedDocIds.includes(doc.id)}
                        onCheckedChange={() => toggleDocSelection(doc.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate max-w-[150px]">
                          {doc.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Buildings className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate max-w-[120px]">{doc.propertyTitle}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {doc.tenantName ? (
                        <div className="flex items-center gap-1 text-sm">
                          <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[100px]">{doc.tenantName}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn('text-xs', getDocumentCategoryColor(doc.category))}
                      >
                        {getDocumentCategoryLabel(doc.category)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn('text-xs gap-1', getDocumentStatusColor(doc.status))}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {getDocumentStatusLabel(doc.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {getSignatureStatus(doc)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeDate(doc.updatedAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {doc.fileSize ? formatFileSize(doc.fileSize) : '-'}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownList>
                        <DropdownListTrigger asChild>
                          <button className="p-1.5 rounded hover:bg-muted">
                            <DotsThree className="w-4 h-4" />
                          </button>
                        </DropdownListTrigger>
                        <DropdownListContent align="end" className="w-48">
                          {onView && (
                            <DropdownListItem onSelect={() => onView(doc)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Ver documento
                            </DropdownListItem>
                          )}
                          {onDownload && (
                            <DropdownListItem onSelect={() => onDownload(doc)}>
                              <DownloadSimple className="w-4 h-4 mr-2" />
                              Descargar PDF
                            </DropdownListItem>
                          )}
                          {(onView || onDownload) && (onSendForSignature || onDuplicate || onDelete) && (
                            <DropdownListSeparator />
                          )}
                          {doc.status === 'draft' && onSendForSignature && (
                            <DropdownListItem onSelect={() => onSendForSignature(doc)}>
                              <PaperPlaneTilt className="w-4 h-4 mr-2" />
                              Enviar para firma
                            </DropdownListItem>
                          )}
                          {doc.status === 'pending_signature' && onView && (
                            <DropdownListItem onSelect={() => onView(doc)}>
                              <SignIn className="w-4 h-4 mr-2" />
                              Ver firmas
                            </DropdownListItem>
                          )}
                          {onDuplicate && (
                            <DropdownListItem onSelect={() => onDuplicate(doc)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Duplicar
                            </DropdownListItem>
                          )}
                          {onDelete && (onSendForSignature || onDuplicate) && (
                            <DropdownListSeparator />
                          )}
                          {onDelete && (
                            <DropdownListItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() => onDelete(doc.id)}
                            >
                              <Trash className="w-4 h-4 mr-2" />
                              Eliminar
                            </DropdownListItem>
                          )}
                        </DropdownListContent>
                      </DropdownList>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        // Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredDocuments.map((doc) => {
              const StatusIcon = STATUS_ICONS[doc.status];

              return (
                <motion.div
                  key={doc.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    className={cn(
                      'p-4 cursor-pointer hover:shadow-md transition-shadow',
                      selectedDocIds.includes(doc.id) && 'ring-2 ring-primary'
                    )}
                    onClick={() => onView?.(doc)}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDocSelection(doc.id);
                          }}
                        >
                          {selectedDocIds.includes(doc.id) ? (
                            <CheckCircle className="w-5 h-5 text-primary" weight="fill" />
                          ) : (
                            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" weight="duotone" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground truncate">
                            {doc.name}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {doc.propertyTitle}
                          </p>
                        </div>
                      </div>

                      <DropdownList>
                        <DropdownListTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <button className="p-1.5 rounded hover:bg-muted shrink-0">
                            <DotsThree className="w-4 h-4" />
                          </button>
                        </DropdownListTrigger>
                        <DropdownListContent align="end" className="w-48">
                          {onView && (
                            <DropdownListItem onSelect={() => onView(doc)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Ver documento
                            </DropdownListItem>
                          )}
                          {onDownload && (
                            <DropdownListItem onSelect={() => onDownload(doc)}>
                              <DownloadSimple className="w-4 h-4 mr-2" />
                              Descargar PDF
                            </DropdownListItem>
                          )}
                          {doc.status === 'draft' && onSendForSignature && (
                            <>
                              <DropdownListSeparator />
                              <DropdownListItem onSelect={() => onSendForSignature(doc)}>
                                <PaperPlaneTilt className="w-4 h-4 mr-2" />
                                Enviar para firma
                              </DropdownListItem>
                            </>
                          )}
                          {onDuplicate && (
                            <DropdownListItem onSelect={() => onDuplicate(doc)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Duplicar
                            </DropdownListItem>
                          )}
                          {onDelete && (
                            <>
                              <DropdownListSeparator />
                              <DropdownListItem
                                className="text-destructive focus:text-destructive"
                                onSelect={() => onDelete(doc.id)}
                              >
                                <Trash className="w-4 h-4 mr-2" />
                                Eliminar
                              </DropdownListItem>
                            </>
                          )}
                        </DropdownListContent>
                      </DropdownList>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Badge
                        variant="secondary"
                        className={cn('text-xs', getDocumentCategoryColor(doc.category))}
                      >
                        {getDocumentCategoryLabel(doc.category)}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={cn('text-xs gap-1', getDocumentStatusColor(doc.status))}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {getDocumentStatusLabel(doc.status)}
                      </Badge>
                    </div>

                    {/* Details */}
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {doc.tenantName && (
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5" />
                          <span className="truncate">{doc.tenantName}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatRelativeDate(doc.updatedAt)}</span>
                        {doc.fileSize && (
                          <>
                            <span className="text-muted-foreground/50">|</span>
                            <span>{formatFileSize(doc.fileSize)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Signature Status */}
                    {doc.signatures && doc.signatures.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center gap-2 text-sm">
                          <SignIn className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {getSignatureStatus(doc)}
                          </span>
                        </div>
                      </div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export default DocumentoManager;
