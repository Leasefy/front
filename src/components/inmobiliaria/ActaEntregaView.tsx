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
import type { InventoryItem } from '@/lib/types/inmobiliaria';

interface ActaEntregaViewProps {
  inventoryItems: InventoryItem[] | undefined;
  contractDate: string;
  onAddItem?: () => void;
  onPrint?: () => void;
  onDownload?: () => void;
}

// Condition styling
const CONDITION_STYLES: Record<InventoryItem['condition'], { bg: string; text: string; label: string; icon: React.ElementType }> = {
  excellent: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    label: 'Excelente',
    icon: CheckCircle,
  },
  good: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
    label: 'Bueno',
    icon: CheckCircle,
  },
  fair: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
    label: 'Regular',
    icon: Warning,
  },
  poor: {
    bg: 'bg-rose-100 dark:bg-rose-900/30',
    text: 'text-rose-700 dark:text-rose-400',
    label: 'Malo',
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const hasItems = inventoryItems && inventoryItems.length > 0;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

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
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="font-semibold text-neutral-900 dark:text-white">Acta de Entrega</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onPrint}
              className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors opacity-50 cursor-not-allowed"
              disabled
              title="Próximamente"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onDownload}
              className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors opacity-50 cursor-not-allowed"
              disabled
              title="Próximamente"
            >
              <DownloadSimple className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Fecha de entrega: {formatDate(contractDate)}
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
                    <p className={cn('text-xs', style.text)}>{style.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Buscar item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#141416] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
              />
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-100 dark:border-neutral-800">
                    <th className="text-left py-3 px-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">
                      Item
                    </th>
                    <th className="text-center py-3 px-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">
                      Cant.
                    </th>
                    <th className="text-center py-3 px-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">
                      Estado
                    </th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">
                      Notas
                    </th>
                    <th className="text-center py-3 px-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">
                      Foto
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
                        className="border-b border-neutral-50 dark:border-neutral-800/50 last:border-0"
                      >
                        <td className="py-3 px-2">
                          <span className="font-medium text-neutral-900 dark:text-white text-sm">
                            {item.name}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className="text-neutral-600 dark:text-neutral-400 text-sm">
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
                              {style.label}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          {item.notes ? (
                            <span className="text-neutral-600 dark:text-neutral-400 text-sm line-clamp-1">
                              {item.notes}
                            </span>
                          ) : (
                            <span className="text-neutral-400 dark:text-neutral-500 text-sm">-</span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex justify-center">
                            {item.photoUrl ? (
                              <button
                                onClick={() => setSelectedImage(item.photoUrl!)}
                                className="w-8 h-8 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800 hover:ring-2 hover:ring-indigo-500 transition-all"
                              >
                                <img
                                  src={item.photoUrl}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ) : (
                              <span className="text-neutral-400 dark:text-neutral-500">-</span>
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
                    className="p-4 rounded-xl bg-neutral-50 dark:bg-[#141416]"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-white">{item.name}</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          Cantidad: {item.quantity}
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
                        {style.label}
                      </span>
                    </div>
                    {item.notes && (
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                        {item.notes}
                      </p>
                    )}
                    {item.photoUrl && (
                      <button
                        onClick={() => setSelectedImage(item.photoUrl!)}
                        className="w-16 h-16 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800"
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
            <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                Total: {filteredItems.length} items
              </span>
              <button
                onClick={onAddItem}
                className="inline-flex items-center gap-1.5 text-sm text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium opacity-50 cursor-not-allowed"
                disabled
                title="Próximamente"
              >
                <Plus className="w-4 h-4" />
                Agregar item
              </button>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <Package className="w-7 h-7 text-neutral-400" />
            </div>
            <p className="text-neutral-600 dark:text-neutral-400 font-medium mb-1">
              No hay inventario registrado
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
              Agrega items al acta de entrega para llevar control del estado de la propiedad
            </p>
            <button
              onClick={onAddItem}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors text-sm opacity-50 cursor-not-allowed"
              disabled
              title="Próximamente"
            >
              <Plus className="w-4 h-4" />
              Agregar inventario
            </button>
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
                alt="Vista ampliada"
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
