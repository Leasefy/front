'use client';

import { Building2, Home, Maximize2, DoorOpen, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePublish } from '@/lib/context/PublishContext';
import { PROPERTY_TYPES } from '@/lib/types/publish';
import { motion } from 'framer-motion';
import type { PropertyDraft } from '@/lib/types/publish';

const ICONS = {
  apartment: Building2,
  house: Home,
  studio: Maximize2,
  room: DoorOpen,
};

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
        <h3 className="text-lg font-semibold text-black">
          Que tipo de inmueble vas a publicar?
        </h3>
        <p className="text-sm text-black/50 mt-1">
          Selecciona el tipo que mejor describe tu propiedad
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {PROPERTY_TYPES.map((type, index) => {
          const Icon = ICONS[type.value as keyof typeof ICONS];
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
                'relative group p-6 rounded-sm border-2 text-center transition-all',
                isSelected
                  ? 'border-black bg-black text-white'
                  : 'border-black/10 hover:border-black/30 bg-white'
              )}
            >
              {/* Selection check */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white flex items-center justify-center"
                >
                  <Check className="w-4 h-4 text-black" strokeWidth={3} />
                </motion.div>
              )}

              {/* Emoji illustration */}
              <div className="text-4xl mb-3">
                {emoji}
              </div>

              {/* Icon */}
              <div className={cn(
                'w-10 h-10 rounded-full mx-auto flex items-center justify-center mb-3 transition-all',
                isSelected
                  ? 'bg-white/20'
                  : 'bg-black/5 group-hover:bg-black/10'
              )}>
                <Icon className={cn(
                  'w-5 h-5',
                  isSelected ? 'text-white' : 'text-black/40'
                )} />
              </div>

              {/* Text */}
              <p className={cn(
                'font-semibold text-base',
                isSelected ? 'text-white' : 'text-black'
              )}>
                {type.label}
              </p>
              <p className={cn(
                'text-xs mt-1',
                isSelected ? 'text-white/70' : 'text-black/50'
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
