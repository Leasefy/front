'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePublish } from '@/lib/context/PublishContext';
import { PROPERTY_TYPES } from '@/lib/types/publish';
import { motion } from 'framer-motion';
import type { PropertyDraft } from '@/lib/types/publish';

const ILLUSTRATIONS = {
  apartment: '🏢',
  house: '🏠',
  studio: '🛋️',
  room: '🚪',
};

export function StepType() {
  const { draft, updateDraft } = usePublish();

  return (
    <div className="space-y-6">
      <div className="text-center pb-2">
        <h3 className="text-lg font-semibold text-foreground">
          Que tipo de inmueble vas a publicar?
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Selecciona el tipo que mejor describe tu propiedad
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {PROPERTY_TYPES.map((type, index) => {
          const emoji = ILLUSTRATIONS[type.value as keyof typeof ILLUSTRATIONS];
          const isSelected = draft.type === type.value;

          return (
            <motion.button
              key={type.value}
              type="button"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => updateDraft({ type: type.value as PropertyDraft['type'] })}
              className={cn(
                'relative group p-6 rounded-[1px] border transition-all duration-200',
                isSelected
                  ? 'border-primary/40 bg-primary/[0.06] shadow-[0_0_0_1px_rgba(91,95,239,0.15)]'
                  : 'border-border hover:border-border bg-card hover:shadow-sm'
              )}
            >
              {/* Selection indicator */}
              <div className={cn(
                'absolute top-3 right-3 w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-200',
                isSelected
                  ? 'border-primary bg-primary'
                  : 'border-border'
              )}>
                {isSelected && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </motion.div>
                )}
              </div>

              {/* Emoji illustration */}
              <div className={cn(
                'text-4xl mb-3 transition-transform duration-200',
                isSelected && 'scale-110'
              )}>
                {emoji}
              </div>

              {/* Text */}
              <p className={cn(
                'font-semibold text-[15px]',
                isSelected ? 'text-foreground' : 'text-foreground/80'
              )}>
                {type.label}
              </p>
              <p className={cn(
                'text-xs mt-1',
                isSelected ? 'text-primary' : 'text-muted-foreground'
              )}>
                {type.description}
              </p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
