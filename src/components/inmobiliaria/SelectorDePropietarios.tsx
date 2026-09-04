'use client';

/**
 * SelectorDePropietarios — elegir UNO O VARIOS dueños para un inmueble.
 *
 * Nico (2026-09-03): «te pedí que se pudiera seleccionar más de un
 * propietario para un inmueble, y que hicieras esto más grande porque ahí es
 * súper dificultoso poder seleccionar». El `PropietarioSelector` del wizard es
 * de UNO (tocar otro reemplaza) y escondía la opción de copropietarios detrás
 * de un enlace chico al final del formulario. Acá cada card se marca y
 * desmarca, la grilla tiene tres columnas y su propio scroll, y el reparto de
 * porcentajes se pide aparte (`RepartoEntreDuenos`) sólo cuando hay más de uno.
 *
 * El «Agregar nuevo» deja UN dueño pendiente de crear (id temporal `new-…`)
 * que se persiste al guardar, igual que en el wizard
 * (`persistPropietarioIfNeeded`).
 */

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlass, Plus, X, User, Check } from '@phosphor-icons/react';
import { IconButton } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui';
import type { Propietario, PropietarioFormData } from '@/lib/types/inmobiliaria';
import { PropietarioCard } from './PropietarioCard';
import { PropietarioForm } from './PropietarioForm';

/** Un dueño que todavía no existe en el back: se crea al guardar. */
export interface PropietarioPendiente {
  /** Id temporal `new-<ts>`; `persistPropietarioIfNeeded` lo vuelve real. */
  id: string;
  data: PropietarioFormData;
}

export interface SelectorDePropietariosProps {
  propietarios: Propietario[];
  /** Ids elegidos, en el orden en que se eligieron. El primero es el principal. */
  seleccion: string[];
  onCambiarSeleccion: (ids: string[]) => void;
  /** El dueño nuevo pendiente, si lo hay. */
  pendiente?: PropietarioPendiente;
  onPendiente: (pendiente: PropietarioPendiente | undefined) => void;
  className?: string;
}

export function SelectorDePropietarios({
  propietarios,
  seleccion,
  onCambiarSeleccion,
  pendiente,
  onPendiente,
  className,
}: SelectorDePropietariosProps) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [formAbierto, setFormAbierto] = useState(false);

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    const lista = q
      ? propietarios.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.email?.toLowerCase().includes(q) ?? false) ||
            p.documentNumber.includes(q),
        )
      : propietarios;
    // Los elegidos van primero: si se llegó con uno ya marcado (desde su
    // ficha) tiene que verse arriba, no en la página cuatro de doscientos.
    const elegidos = lista.filter((p) => seleccion.includes(p.id));
    const resto = lista.filter((p) => !seleccion.includes(p.id));
    return [...elegidos, ...resto];
  }, [propietarios, search, seleccion]);

  const alternar = (id: string) => {
    onCambiarSeleccion(seleccion.includes(id) ? seleccion.filter((x) => x !== id) : [...seleccion, id]);
  };

  const guardarNuevo = async (data: PropietarioFormData) => {
    // Editar el pendiente conserva su id temporal; uno nuevo recibe otro.
    const id = pendiente?.id ?? `new-${Date.now()}`;
    onPendiente({ id, data });
    if (!seleccion.includes(id)) onCambiarSeleccion([...seleccion, id]);
    setFormAbierto(false);
  };

  const quitarPendiente = () => {
    if (!pendiente) return;
    onCambiarSeleccion(seleccion.filter((x) => x !== pendiente.id));
    onPendiente(undefined);
  };

  const cuantos = seleccion.length;

  return (
    <div className={cn('space-y-3', className)} data-testid="selector-de-propietarios">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-fg-subtle" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('inmobiliaria.propietario.selector.searchPlaceholder')}
            className="w-full pl-10 pr-10"
            aria-label={t('inmobiliaria.propietario.selector.searchPlaceholder')}
          />
          {search && (
            <IconButton
              variant="ghost"
              size="sm"
              onClick={() => setSearch('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-subtle"
              icon={<X className="h-4 w-4" />}
            />
          )}
        </div>
        {!formAbierto && (
          <Button variant="secondary" hideArrow onClick={() => setFormAbierto(true)} className="shrink-0">
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">{t('inmobiliaria.propietario.selector.addNew')}</span>
          </Button>
        )}
      </div>

      <AnimatePresence>
        {formAbierto && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-fg">{t('inmobiliaria.propietario.selector.newOwner')}</h3>
                <IconButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setFormAbierto(false)}
                  aria-label="Cerrar"
                  icon={<X className="h-5 w-5" />}
                />
              </div>
              <PropietarioForm
                mode="create"
                initialFormData={pendiente?.data}
                onSubmit={guardarNuevo}
                onCancel={() => setFormAbierto(false)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!formAbierto && (
        <>
          {/* La grilla tiene SU scroll: el diálogo no crece con la agencia. */}
          <div
            className="max-h-[44vh] overflow-y-auto overscroll-contain pr-1"
            data-lenis-prevent
            data-testid="mandato-propietarios-grid"
          >
            {filtrados.length > 0 || pendiente ? (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pendiente && (
                  <li>
                    <div
                      className="flex w-full items-center gap-3 rounded-lg border border-primary/30 bg-primary-soft p-3 text-left"
                      data-testid="propietario-pendiente"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card text-primary">
                        <User className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-fg">{pendiente.data.name}</span>
                        <span className="block text-xs text-fg-muted">
                          {t('inmobiliaria.propietario.selector.newOwner')} ·{' '}
                          <button type="button" className="text-primary hover:underline" onClick={() => setFormAbierto(true)}>
                            {t('inmobiliaria.propietario.selector.edit')}
                          </button>
                        </span>
                      </span>
                      <IconButton
                        variant="ghost"
                        size="sm"
                        onClick={quitarPendiente}
                        aria-label={`Quitar a ${pendiente.data.name}`}
                        icon={<X className="h-4 w-4" />}
                      />
                    </div>
                  </li>
                )}
                {filtrados.map((p) => (
                  <li key={p.id}>
                    <PropietarioCard
                      propietario={p}
                      variant="compact"
                      selected={seleccion.includes(p.id)}
                      onClick={() => alternar(p.id)}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-lg border border-border bg-surface-muted p-8 text-center">
                <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface text-fg-muted">
                  <User className="h-6 w-6" weight="duotone" aria-hidden="true" />
                </span>
                <p className="mb-3 text-sm text-fg-muted">
                  {search
                    ? t('inmobiliaria.propietario.selector.noResults')
                    : t('inmobiliaria.propietario.selector.noRegistered')}
                </p>
                <Button hideArrow onClick={() => setFormAbierto(true)}>
                  <Plus className="h-4 w-4" />
                  {t('inmobiliaria.propietario.selector.addNewOwner')}
                </Button>
              </div>
            )}
          </div>

          <p
            className={cn('flex items-center gap-2 text-sm', cuantos > 0 ? 'text-success' : 'text-fg-muted')}
            data-testid="mandato-seleccionados"
          >
            {cuantos > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success-soft">
                <Check weight="bold" className="h-3 w-3" />
              </span>
            )}
            {cuantos === 0
              ? t('inmobiliaria.consignaciones.mandateDialog.propietarioHint')
              : cuantos === 1
                ? t('inmobiliaria.propietario.selector.ownerSelected')
                : t('inmobiliaria.consignaciones.mandateDialog.seleccionados', { n: cuantos })}
          </p>
        </>
      )}
    </div>
  );
}
