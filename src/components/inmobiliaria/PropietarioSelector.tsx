'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlass,
  Plus,
  X,
  User,
  Buildings,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { Propietario, PropietarioFormData } from '@/lib/types/inmobiliaria';
import { PropietarioCard } from './PropietarioCard';
import { PropietarioForm } from './PropietarioForm';

interface PropietarioSelectorProps {
  propietarios: Propietario[];
  value: string | null;
  onChange: (id: string, data?: PropietarioFormData) => void;
  newPropietarioData?: PropietarioFormData;
  className?: string;
}

/**
 * PropietarioSelector - Selector for choosing existing propietario or creating new one
 * Used in ConsignacionWizard Step 1
 */
export function PropietarioSelector({
  propietarios,
  value,
  onChange,
  newPropietarioData,
  className,
}: PropietarioSelectorProps) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Filter propietarios by search
  const filteredPropietarios = useMemo(() => {
    if (!search.trim()) return propietarios;
    const query = search.toLowerCase();
    return propietarios.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.email.toLowerCase().includes(query) ||
        p.documentNumber.includes(query)
    );
  }, [propietarios, search]);

  const handleSelectPropietario = (propietario: Propietario) => {
    // If selecting the same propietario, do nothing
    if (value === propietario.id) return;

    // Close new form if open
    setShowNewForm(false);
    setIsCreating(false);

    // Select propietario
    onChange(propietario.id);
  };

  const handleStartNewPropietario = () => {
    // Clear any existing selection
    onChange('');
    setShowNewForm(true);
    setIsCreating(true);
  };

  const handleCancelNewPropietario = () => {
    setShowNewForm(false);
    setIsCreating(false);
  };

  const handleNewPropietarioSubmit = async (data: PropietarioFormData) => {
    // Generate a temporary ID for the new propietario
    const tempId = `new-${Date.now()}`;
    onChange(tempId, data);
    setShowNewForm(false);
    setIsCreating(true);
  };

  // Check if a new propietario was created
  const hasNewPropietario = isCreating && value?.startsWith('new-') && newPropietarioData;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and Add New */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('inmobiliaria.propietario.selector.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {!showNewForm && (
          <button
            onClick={handleStartNewPropietario}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 font-medium hover:border-indigo-400 hover:text-indigo-600 dark:hover:border-indigo-500 dark:hover:text-indigo-400 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">{t('inmobiliaria.propietario.selector.addNew')}</span>
          </button>
        )}
      </div>

      {/* New Propietario Created Card */}
      <AnimatePresence>
        {hasNewPropietario && newPropietarioData && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                newPropietarioData.documentType === 'NIT'
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                  : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
              )}>
                {newPropietarioData.documentType === 'NIT' ? (
                  <Buildings className="w-6 h-6" />
                ) : (
                  <User className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs font-medium">
                    {t('inmobiliaria.propietario.selector.newOwner')}
                  </span>
                </div>
                <h3 className="font-semibold text-neutral-900 dark:text-white truncate">
                  {newPropietarioData.name}
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {newPropietarioData.email} - {newPropietarioData.phone}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {newPropietarioData.documentType}: {newPropietarioData.documentNumber}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setShowNewForm(true);
                  onChange('');
                }}
                className="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
              >
                {t('inmobiliaria.propietario.selector.edit')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inline Form for New Propietario */}
      <AnimatePresence>
        {showNewForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-neutral-900 dark:text-white">
                  {t('inmobiliaria.propietario.selector.newOwner')}
                </h3>
                <button
                  onClick={handleCancelNewPropietario}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <PropietarioForm
                mode="create"
                onSubmit={handleNewPropietarioSubmit}
                onCancel={handleCancelNewPropietario}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Propietarios Grid */}
      {!showNewForm && !hasNewPropietario && (
        <>
          {filteredPropietarios.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredPropietarios.map((propietario) => (
                <PropietarioCard
                  key={propietario.id}
                  propietario={propietario}
                  variant="compact"
                  selected={value === propietario.id}
                  onClick={() => handleSelectPropietario(propietario)}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#141416]">
              <User className="w-12 h-12 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
              <p className="text-neutral-500 dark:text-neutral-400 mb-2">
                {search ? t('inmobiliaria.propietario.selector.noResults') : t('inmobiliaria.propietario.selector.noRegistered')}
              </p>
              <button
                onClick={handleStartNewPropietario}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white uppercase tracking-wide font-mono font-medium hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('inmobiliaria.propietario.selector.addNewOwner')}
              </button>
            </div>
          )}
        </>
      )}

      {/* Selected Count */}
      {!showNewForm && value && !hasNewPropietario && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <motion.svg
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </motion.svg>
          </span>
          {t('inmobiliaria.propietario.selector.ownerSelected')}
        </p>
      )}
    </div>
  );
}

export default PropietarioSelector;
