'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Plus,
  DownloadSimple,
  Printer,
  MagnifyingGlass,
  CheckCircle,
  Warning,
  Info,
  X,
  Image,
  PencilSimple,
  Trash,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { TablePagination } from '@/components/ui/pagination';
import {
  PAGE_SIZE_OPTIONS,
  useTablePagination,
} from '@/lib/hooks/use-table-pagination';
import { IconButton } from '@leasefy/cadence';
import type { InventoryItem } from '@/lib/types/inmobiliaria';

interface ActaEntregaViewProps {
  inventoryItems: InventoryItem[] | undefined;
  contractDate: string;
  /**
   * Sin `onAddItem` la vista es de sólo lectura (p. ej. un rol que no edita).
   * Con él, agregar / editar / quitar están vivos: el inventario se carga
   * desde que el inmueble entra a la agencia, no hace falta entrega ni acta.
   */
  onAddItem?: () => void;
  onEditItem?: (item: InventoryItem) => void;
  onDeleteItem?: (item: InventoryItem) => void;
  onPrint?: () => void;
  onDownload?: () => void;
}

// Condition styling
const CONDITION_STYLES: Record<
  InventoryItem['condition'],
  {
    bg: string;
    text: string;
    variant: 'success' | 'default' | 'warning' | 'destructive';
    labelKey: string;
    icon: React.ElementType;
  }
> = {
  excellent: {
    bg: 'bg-success-soft',
    text: 'text-success',
    variant: 'success',
    labelKey: 'inmobiliaria.acta.condExcellent',
    icon: CheckCircle,
  },
  good: {
    bg: 'bg-primary-soft',
    text: 'text-primary',
    variant: 'default',
    labelKey: 'inmobiliaria.acta.condGood',
    icon: CheckCircle,
  },
  fair: {
    bg: 'bg-warning-soft',
    text: 'text-warning',
    variant: 'warning',
    labelKey: 'inmobiliaria.acta.condFair',
    icon: Warning,
  },
  poor: {
    bg: 'bg-danger-soft',
    text: 'text-danger',
    variant: 'destructive',
    labelKey: 'inmobiliaria.acta.condPoor',
    icon: Warning,
  },
};

/**
 * ActaEntregaView - Inventory/handover document view
 * Displays inventory items table with conditions and photos
 */
export function ActaEntregaView({
  inventoryItems,
  contractDate,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onPrint,
  onDownload,
}: ActaEntregaViewProps) {
  const { t, formatDate: fmtDate } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const hasItems = inventoryItems && inventoryItems.length > 0;

  // Filter items by search term
  const filteredItems = useMemo(
    () =>
      inventoryItems?.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      ) ?? [],
    [inventoryItems, searchTerm]
  );

  // `resetKey` con la búsqueda: buscar estando en la página 3 dejaría la tabla
  // en blanco sobre un resultado que sí tiene ítems.
  const {
    pageItems,
    total: totalFiltrado,
    page,
    pageSize,
    setPage,
    setPageSize,
    shouldPaginate,
  } = useTablePagination(filteredItems, { resetKey: searchTerm });

  // Count by condition
  const conditionCounts = hasItems
    ? {
        excellent: inventoryItems.filter((i) => i.condition === 'excellent').length,
        good: inventoryItems.filter((i) => i.condition === 'good').length,
        fair: inventoryItems.filter((i) => i.condition === 'fair').length,
        poor: inventoryItems.filter((i) => i.condition === 'poor').length,
      }
    : { excellent: 0, good: 0, fair: 0, poor: 0 };

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-success-soft flex items-center justify-center">
              <Package className="w-4 h-4 text-success" />
            </div>
            <h3 className="text-base font-semibold text-fg">{t('inmobiliaria.acta.title')}</h3>
          </div>
          <div className="flex items-center gap-2">
            {/* Imprimir abre la hoja del acta (`/inmuebles/[id]/acta`); sin
                `onPrint` (sólo lectura) el botón no se muestra. */}
            {onPrint && (
              <Button
                variant="ghost"
                size="icon"
                hideArrow
                onClick={onPrint}
                className="h-8 w-8 text-fg-muted"
                title={t('inmobiliaria.acta.print')}
                aria-label={t('inmobiliaria.acta.print')}
              >
                <Printer className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              hideArrow
              onClick={onDownload}
              className="h-8 w-8 text-fg-muted opacity-50 cursor-not-allowed"
              disabled
              title={t('inmobiliaria.acta.comingSoon')}
            >
              <DownloadSimple className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-fg-muted">
          {t('inmobiliaria.acta.deliveryDateLabel')}: {fmtDate(contractDate)}
        </p>
      </div>

      {/* Content */}
      <div className="p-5">
        {hasItems ? (
          <div className="space-y-4">
            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.entries(CONDITION_STYLES) as [InventoryItem['condition'], typeof CONDITION_STYLES[InventoryItem['condition']]][]).map(([condition, style]) => {
                const count = conditionCounts[condition];
                return (
                  <div
                    key={condition}
                    className={cn(
                      'px-3 py-2 rounded-lg text-center',
                      style.bg
                    )}
                  >
                    <p className={cn('text-lg font-bold', style.text)}>{count}</p>
                    <p className={cn('text-xs', style.text)}>{t(style.labelKey)}</p>
                  </div>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted z-10" />
              <Input
                type="text"
                placeholder={t('inmobiliaria.acta.searchItem')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="border-b border-border">
                    <TableHead className="text-left py-3 px-2">
                      {t('inmobiliaria.acta.thItem')}
                    </TableHead>
                    <TableHead className="text-center py-3 px-2">
                      {t('inmobiliaria.acta.thQty')}
                    </TableHead>
                    <TableHead className="text-center py-3 px-2">
                      {t('inmobiliaria.acta.thCondition')}
                    </TableHead>
                    <TableHead className="text-left py-3 px-2">
                      {t('inmobiliaria.acta.thNotes')}
                    </TableHead>
                    <TableHead className="text-center py-3 px-2">
                      {t('inmobiliaria.acta.thPhoto')}
                    </TableHead>
                    {(onEditItem || onDeleteItem) && (
                      <TableHead className="py-3 px-2">
                        <span className="sr-only">{t('inmobiliaria.acta.thActions')}</span>
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((item, index) => {
                    const style = CONDITION_STYLES[item.condition];
                    const Icon = style.icon;
                    return (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-border/60 last:border-0"
                      >
                        <TableCell className="py-3 px-2">
                          <span className="font-medium text-fg text-sm">
                            {item.name}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 px-2 text-center">
                          <span className="text-fg-muted text-sm">
                            {item.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 px-2">
                          <div className="flex justify-center">
                            <Badge variant={style.variant} className="gap-1">
                              <Icon className="w-3 h-3" />
                              {t(style.labelKey)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-2">
                          {item.notes ? (
                            <span className="text-fg-muted text-sm line-clamp-1">
                              {item.notes}
                            </span>
                          ) : (
                            <span className="text-fg-subtle text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3 px-2">
                          <div className="flex justify-center">
                            {item.photoUrl ? (
                              // allowlist: clickable image-tile thumbnail (wraps an <img>) opening a
                              // lightbox — Button/IconButton can't host a fill image without breaking it
                              <button
                                type="button"
                                onClick={() => setSelectedImage(item.photoUrl!)}
                                aria-label={item.name}
                                className="w-8 h-8 rounded-md overflow-hidden bg-surface-muted hover:ring-2 hover:ring-primary transition-all"
                              >
                                <img
                                  src={item.photoUrl}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ) : (
                              <span className="text-fg-subtle">-</span>
                            )}
                          </div>
                        </TableCell>
                        {(onEditItem || onDeleteItem) && (
                          <TableCell className="py-3 px-2">
                            <div className="flex items-center justify-end gap-1">
                              {onEditItem && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  hideArrow
                                  className="h-8 w-8"
                                  onClick={() => onEditItem(item)}
                                  aria-label={t('inmobiliaria.acta.editItem')}
                                  data-testid={`inventario-editar-${item.id}`}
                                >
                                  <PencilSimple className="w-4 h-4" />
                                </Button>
                              )}
                              {onDeleteItem && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  hideArrow
                                  className="h-8 w-8 text-danger"
                                  onClick={() => onDeleteItem(item)}
                                  aria-label={t('inmobiliaria.acta.deleteItem')}
                                  data-testid={`inventario-quitar-${item.id}`}
                                >
                                  <Trash className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </motion.tr>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards — la misma página que la tabla de escritorio: si
                cada uno recortara distinto, el pie contaría otra cosa según el
                ancho de la ventana. */}
            <div className="md:hidden space-y-3">
              {pageItems.map((item, index) => {
                const style = CONDITION_STYLES[item.condition];
                const Icon = style.icon;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 rounded-lg bg-surface-muted"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-fg">{item.name}</p>
                        <p className="text-sm text-fg-muted">
                          {t('inmobiliaria.acta.quantity')}: {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant={style.variant} className="gap-1">
                          <Icon className="w-3 h-3" />
                          {t(style.labelKey)}
                        </Badge>
                        {onEditItem && (
                          <Button
                            variant="ghost"
                            size="icon"
                            hideArrow
                            className="h-8 w-8"
                            onClick={() => onEditItem(item)}
                            aria-label={t('inmobiliaria.acta.editItem')}
                          >
                            <PencilSimple className="w-4 h-4" />
                          </Button>
                        )}
                        {onDeleteItem && (
                          <Button
                            variant="ghost"
                            size="icon"
                            hideArrow
                            className="h-8 w-8 text-danger"
                            onClick={() => onDeleteItem(item)}
                            aria-label={t('inmobiliaria.acta.deleteItem')}
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {item.notes && (
                      <p className="text-sm text-fg-muted mb-2">
                        {item.notes}
                      </p>
                    )}
                    {item.photoUrl && (
                      // allowlist: clickable image-tile thumbnail (wraps an <img>) opening a
                      // lightbox — Button/IconButton can't host a fill image without breaking it
                      <button
                        type="button"
                        onClick={() => setSelectedImage(item.photoUrl!)}
                        aria-label={item.name}
                        className="w-16 h-16 rounded-md overflow-hidden bg-surface-muted"
                      >
                        <img
                          src={item.photoUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Pie: sólo si hay más de una página. */}
            {shouldPaginate && (
              <div className="pt-3 border-t border-border">
                <TablePagination
                  total={totalFiltrado}
                  page={page}
                  pageSize={pageSize}
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}

            {/* Total Count — el total del filtro completo, no el de la página. */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-sm text-fg-muted">
                {t('inmobiliaria.acta.total')}: {totalFiltrado} items
              </span>
              {onAddItem && (
                <Button
                  variant="link"
                  size="sm"
                  hideArrow
                  onClick={onAddItem}
                  className="h-auto gap-1.5 px-0"
                  data-testid="inventario-agregar-item"
                >
                  <Plus className="w-4 h-4" />
                  {t('inmobiliaria.acta.addItem')}
                </Button>
              )}
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center gap-4">
            <EmptyState
              icon={Package}
              title={t('inmobiliaria.acta.noInventory')}
              description={t('inmobiliaria.acta.noInventoryDesc')}
              className="py-10"
            />
            {onAddItem && (
              <Button
                hideArrow
                onClick={onAddItem}
                className="gap-2"
                data-testid="inventario-agregar"
              >
                <Plus className="w-4 h-4" />
                {t('inmobiliaria.acta.addInventory')}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Image Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-3xl max-h-[80vh] rounded-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedImage}
                alt={t('inmobiliaria.acta.expandedView')}
                className="max-w-full max-h-[80vh] object-contain"
              />
              <IconButton
                variant="ghost"
                onClick={() => setSelectedImage(null)}
                aria-label="Cerrar"
                icon={<X className="w-5 h-5" />}
                className="absolute top-3 right-3 rounded-full bg-black/50 text-white hover:bg-black/70"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ActaEntregaView;
