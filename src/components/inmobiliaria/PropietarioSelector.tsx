'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui';
import { IconButton } from '@leasefy/cadence';
import type { Propietario, PropietarioFormData } from '@/lib/types/inmobiliaria';
import { PropietarioCard } from './PropietarioCard';
import { PropietarioForm } from './PropietarioForm';

interface PropietarioSelectorProps {
  propietarios: Propietario[];
  value: string | null;
  onChange: (id: string, data?: PropietarioFormData) => void;
  newPropietarioData?: PropietarioFormData;
  className?: string;
  /**
   * A persist error from the wizard's "Siguiente" (T-0011: create/update
   * happens on the step transition, not on this form's own submit). When
   * set, the create form is force-reopened so the error is visible on the
   * right field (e.g. a 409 duplicate-document conflict).
   */
  serverError?: { field: keyof PropietarioFormData; message: string } | null;
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
  serverError,
}: PropietarioSelectorProps) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);

  // Reopen the form so a persist failure (409 duplicate document, etc.) is
  // visible next to the field it names instead of getting lost behind the
  // collapsed "new owner" summary card.
  useEffect(() => {
    if (serverError) setShowNewForm(true);
  }, [serverError]);

  // Filter propietarios by search
  const filteredPropietarios = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtrados = query
      ? propietarios.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            (p.email?.toLowerCase().includes(query) ?? false) ||
            p.documentNumber.includes(query)
        )
      : propietarios;
    // El elegido va primero: cuando se llega con el propietario ya marcado
    // (desde su ficha) tiene que verse arriba, no en la página 4 de 200.
    const elegido = value ? filtrados.find((p) => p.id === value) : undefined;
    if (!elegido) return filtrados;
    return [elegido, ...filtrados.filter((p) => p.id !== elegido.id)];
  }, [propietarios, search, value]);

  const handleSelectPropietario = (propietario: Propietario) => {
    // Close new form if open
    setShowNewForm(false);

    // Tocar el que ya está elegido lo suelta. Antes «no hacía nada»: una vez
    // elegido un propietario no había forma de quedarse sin ninguno (Nico,
    // 2026-09-01). `''` es lo que los formularios ya leen como «sin
    // propietario» — es lo mismo que manda «Agregar nuevo» al empezar.
    onChange(value === propietario.id ? '' : propietario.id);
  };

  const handleStartNewPropietario = () => {
    // Clear any existing selection
    onChange('');
    setShowNewForm(true);
  };

  const handleCancelNewPropietario = () => {
    setShowNewForm(false);
  };

  /**
   * Stages the form data locally — this button's role stays "collect and
   * stage"; persistence happens on the wizard's "Siguiente" (T-0011, see
   * ConsignacionWizard.persistOwnerIfNeeded).
   *
   * If `value` is already a REAL id (not a `new-*` temp id) with staged
   * `newPropietarioData`, this is an edit of an owner the wizard already
   * created in this session (reopened via "Editar", below) — keep the same
   * id so the next "Siguiente" PUTs an update instead of POSTing a
   * duplicate. Otherwise it's a fresh create: generate a temp id.
   */
  const handleNewPropietarioSubmit = async (data: PropietarioFormData) => {
    const isEditingPersisted = Boolean(value) && !value?.startsWith('new-');
    const id = isEditingPersisted ? (value as string) : `new-${Date.now()}`;
    onChange(id, data);
    setShowNewForm(false);
  };

  // True whenever the current selection came from OUR OWN create/edit form
  // — independent of whether it's been persisted yet (`value` may still be
  // a temp `new-*` id, or the real UUID once "Siguiente" persists it) and
  // independent of remounts (this component unmounts when the wizard moves
  // off step 1, so any local "just created" flag would reset on return).
  const hasNewPropietario = Boolean(value) && Boolean(newPropietarioData);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and Add New */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('inmobiliaria.propietario.selector.searchPlaceholder')}
            className="w-full pl-10 pr-4"
          />
          {search && (
            <IconButton
              variant="ghost"
              size="sm"
              onClick={() => setSearch('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              icon={<X className="w-4 h-4" />}
            />
          )}
        </div>

        {!showNewForm && (
          <Button
            variant="secondary"
            hideArrow
            onClick={handleStartNewPropietario}
            className="shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">{t('inmobiliaria.propietario.selector.addNew')}</span>
          </Button>
        )}
      </div>

      {/* New Propietario Created Card */}
      <AnimatePresence>
        {hasNewPropietario && newPropietarioData && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl border-2 border-primary/30 bg-primary-soft"
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                newPropietarioData.documentType === 'NIT'
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-card text-primary'
              )}>
                {newPropietarioData.documentType === 'NIT' ? (
                  <Buildings className="w-6 h-6" />
                ) : (
                  <User className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-full bg-card text-primary text-xs font-medium">
                    {t('inmobiliaria.propietario.selector.newOwner')}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-foreground truncate">
                  {newPropietarioData.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {newPropietarioData.email} - {newPropietarioData.phone}
                </p>
                <p className="text-sm text-muted-foreground">
                  {newPropietarioData.documentType}: {newPropietarioData.documentNumber}
                </p>
              </div>
              <Button
                variant="link"
                hideArrow
                onClick={() => {
                  // Reopen the form WITHOUT clearing `value` — keeping the
                  // same id (temp or already-persisted) is what lets a
                  // resubmit update instead of creating a duplicate.
                  setShowNewForm(true);
                }}
                className="shrink-0"
              >
                {t('inmobiliaria.propietario.selector.edit')}
              </Button>
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
            <div className="p-5 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-foreground">
                  {t('inmobiliaria.propietario.selector.newOwner')}
                </h3>
                <IconButton
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelNewPropietario}
                  aria-label="Cerrar"
                  icon={<X className="w-5 h-5" />}
                />
              </div>
              <PropietarioForm
                mode="create"
                initialFormData={newPropietarioData}
                onSubmit={handleNewPropietarioSubmit}
                onCancel={handleCancelNewPropietario}
                serverError={serverError}
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
            <div className="p-8 text-center rounded-xl border border-border bg-muted/40">
              <User className="w-12 h-12 mx-auto mb-3 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground mb-3">
                {search ? t('inmobiliaria.propietario.selector.noResults') : t('inmobiliaria.propietario.selector.noRegistered')}
              </p>
              <Button hideArrow onClick={handleStartNewPropietario}>
                <Plus className="w-4 h-4" />
                {t('inmobiliaria.propietario.selector.addNewOwner')}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Selected Count */}
      {!showNewForm && value && !hasNewPropietario && (
        <p className="text-sm text-success flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-success-soft flex items-center justify-center">
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
