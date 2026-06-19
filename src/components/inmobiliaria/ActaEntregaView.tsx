'use client';

import { useState } from 'react';
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
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import type { InventoryItem } from '@/lib/types/inmobiliaria';

interface ActaEntregaViewProps {
  inventoryItems: InventoryItem[] | undefined;
  contractDate: string;
  onAddItem?: () => void;
  onPrint?: () => void;
  onDownload?: () => void;
}

// Condition styling
const CONDITION_STYLES: Record<InventoryItem['condition'], { bg: string; text: string; labelKey: string; icon: React.ElementType }> = {
  excellent: {
    bg: 'bg-success-soft',
    text: 'text-success',
    labelKey: 'inmobiliaria.acta.condExcellent',
    icon: CheckCircle,
  },
  good: {
    bg: 'bg-primary-soft',
    text: 'text-primary',
    labelKey: 'inmobiliaria.acta.condGood',
    icon: CheckCircle,
  },
  fair: {
    bg: 'bg-warning-soft',
    text: 'text-warning',
    labelKey: 'inmobiliaria.acta.condFair',
    icon: Warning,
  },
  poor: {
    bg: 'bg-danger-soft',
    text: 'text-danger',
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
  onPrint,
  onDownload,
}: ActaEntregaViewProps) {
  const { t, formatDate: fmtDate } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const hasItems = inventoryItems && inventoryItems.length > 0;

  // Filter items by search term
  const filteredItems = hasItems
    ? inventoryItems.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

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
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-success-soft flex items-center justify-center">
              <Package className="w-4 h-4 text-success" />
            </div>
            <h3 className="text-base font-semibold text-foreground">{t('inmobiliaria.acta.title')}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              hideArrow
              onClick={onPrint}
              className="h-8 w-8 text-muted-foreground opacity-50 cursor-not-allowed"
              disabled
              title={t('inmobiliaria.acta.comingSoon')}
            >
              <Printer className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              hideArrow
              onClick={onDownload}
              className="h-8 w-8 text-muted-foreground opacity-50 cursor-not-allowed"
              disabled
              title={t('inmobiliaria.acta.comingSoon')}
            >
              <DownloadSimple className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
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
                      'px-3 py-2 rounded-xl text-center',
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
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('inmobiliaria.acta.searchItem')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/40 text-sm"
              />
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase">
                      {t('inmobiliaria.acta.thItem')}
                    </th>
                    <th className="text-center py-3 px-2 text-xs font-medium text-muted-foreground uppercase">
                      {t('inmobiliaria.acta.thQty')}
                    </th>
                    <th className="text-center py-3 px-2 text-xs font-medium text-muted-foreground uppercase">
                      {t('inmobiliaria.acta.thCondition')}
                    </th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase">
                      {t('inmobiliaria.acta.thNotes')}
                    </th>
                    <th className="text-center py-3 px-2 text-xs font-medium text-muted-foreground uppercase">
                      {t('inmobiliaria.acta.thPhoto')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, index) => {
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
                        <td className="py-3 px-2">
                          <span className="font-medium text-foreground text-sm">
                            {item.name}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className="text-muted-foreground text-sm">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex justify-center">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                                style.bg,
                                style.text
                              )}
                            >
                              <Icon className="w-3 h-3" />
                              {t(style.labelKey)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          {item.notes ? (
                            <span className="text-muted-foreground text-sm line-clamp-1">
                              {item.notes}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/70 text-sm">-</span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex justify-center">
                            {item.photoUrl ? (
                              <button
                                onClick={() => setSelectedImage(item.photoUrl!)}
                                className="w-8 h-8 rounded-md overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all"
                              >
                                <img
                                  src={item.photoUrl}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ) : (
                              <span className="text-muted-foreground/70">-</span>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {filteredItems.map((item, index) => {
                const style = CONDITION_STYLES[item.condition];
                const Icon = style.icon;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 rounded-xl bg-surface-muted"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-foreground">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {t('inmobiliaria.acta.quantity')}: {item.quantity}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                          style.bg,
                          style.text
                        )}
                      >
                        <Icon className="w-3 h-3" />
                        {t(style.labelKey)}
                      </span>
                    </div>
                    {item.notes && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {item.notes}
                      </p>
                    )}
                    {item.photoUrl && (
                      <button
                        onClick={() => setSelectedImage(item.photoUrl!)}
                        className="w-16 h-16 rounded-md overflow-hidden bg-muted"
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

            {/* Total Count */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-sm text-muted-foreground">
                {t('inmobiliaria.acta.total')}: {filteredItems.length} items
              </span>
              <Button
                variant="link"
                size="sm"
                hideArrow
                onClick={onAddItem}
                className="h-auto gap-1.5 px-0 opacity-50 cursor-not-allowed hover:no-underline"
                disabled
                title={t('inmobiliaria.acta.comingSoon')}
              >
                <Plus className="w-4 h-4" />
                {t('inmobiliaria.acta.addItem')}
              </Button>
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
            <Button
              hideArrow
              onClick={onAddItem}
              className="gap-2 opacity-50 cursor-not-allowed"
              disabled
              title={t('inmobiliaria.acta.comingSoon')}
            >
              <Plus className="w-4 h-4" />
              {t('inmobiliaria.acta.addInventory')}
            </Button>
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
              className="relative max-w-3xl max-h-[80vh] rounded-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedImage}
                alt={t('inmobiliaria.acta.expandedView')}
                className="max-w-full max-h-[80vh] object-contain"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ActaEntregaView;
