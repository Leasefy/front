'use client';

import { Check } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { usePublish } from '@/lib/context/PublishContext';
import { PROPERTY_TYPES } from '@/lib/types/publish';
import { motion } from 'framer-motion';
import { motionSpring } from '@leasefy/cadence';
import type { PropertyDraft } from '@/lib/types/publish';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { ariaDelGrupo, idDelCampo, idDelError } from '../campos-con-error';

const ILLUSTRATIONS = {
  apartment: '🏢',
  house: '🏠',
  studio: '🛋️',
  room: '🚪',
};

export function StepType() {
  const { draft, updateDraft, erroresDelServidor } = usePublish();
  const error = erroresDelServidor.type;
  const tituloId = `${idDelCampo('type')}-titulo`;

  return (
    <div className="space-y-6">
      <div className="text-center pb-2">
        <h3 id={tituloId} className="text-lg font-semibold text-fg">
          ¿Qué tipo de inmueble vas a publicar?
        </h3>
        <p className="text-sm text-fg-muted mt-1">
          Selecciona el tipo que mejor describe tu propiedad
        </p>
      </div>

      <div>
        <div
          role="group"
          aria-labelledby={tituloId}
          {...ariaDelGrupo('type', error)}
          className="grid grid-cols-2 gap-4"
        >
          {PROPERTY_TYPES.map((type) => {
            const emoji = ILLUSTRATIONS[type.value as keyof typeof ILLUSTRATIONS];
            const isSelected = draft.type === type.value;

            return (
              <button
                key={type.value}
                type="button"
                onClick={() => updateDraft({ type: type.value as PropertyDraft['type'] })}
                aria-pressed={isSelected}
                style={isSelected ? { boxShadow: '0 0 0 3px rgba(26,64,255,0.12)' } : undefined}
                className={cn(
                  'relative group p-6 rounded-[20px] transition-[background-color,border-color,box-shadow] duration-base',
                  isSelected
                    ? 'border-2 border-primary bg-primary-soft'
                    : 'border border-border hover:border-border-strong bg-surface'
                )}
              >
                {/* Selection indicator */}
                <div className={cn(
                  'absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors duration-base',
                  isSelected
                    ? 'border-primary bg-primary'
                    : 'border-border-strong'
                )}>
                  {isSelected && (
                    // El visto «llega» con el resorte de rebote leve del sistema.
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={motionSpring.bouncy}>
                      <Check className="w-3 h-3 text-primary-fg" weight="bold" />
                    </motion.div>
                  )}
                </div>

                {/* Emoji illustration */}
                <div className={cn(
                  'text-4xl mb-3 transition-transform duration-base',
                  isSelected && 'scale-110'
                )}>
                  {emoji}
                </div>

                {/* Text */}
                <p className={cn(
                  'font-semibold text-[15px]',
                  isSelected ? 'text-fg' : 'text-fg-muted'
                )}>
                  {type.label}
                </p>
                <p className={cn(
                  'text-xs mt-1',
                  isSelected ? 'text-primary' : 'text-fg-subtle'
                )}>
                  {type.description}
                </p>
              </button>
            );
          })}
        </div>
        <ErrorDelCampo id={idDelError('type')} mensaje={error} />
      </div>
    </div>
  );
}
