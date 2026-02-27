'use client';

import { useState, useRef, useCallback } from 'react';
import { TextT, FileText, Sparkle, SpinnerGap } from '@phosphor-icons/react';
import { usePublish } from '@/lib/context/PublishContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PROPERTY_TYPES } from '@/lib/types/publish';
import { cn } from '@/lib/utils';

function useTextTwriter() {
  const [isTyping, setIsTyping] = useState(false);
  const cancelRef = useRef(false);

  const typeText = useCallback(
    (text: string, onUpdate: (partial: string) => void): Promise<void> => {
      cancelRef.current = false;
      setIsTyping(true);

      return new Promise((resolve) => {
        let i = 0;
        const interval = setInterval(() => {
          if (cancelRef.current) {
            clearInterval(interval);
            onUpdate(text); // fill the rest immediately
            setIsTyping(false);
            resolve();
            return;
          }
          i++;
          onUpdate(text.slice(0, i));
          if (i >= text.length) {
            clearInterval(interval);
            setIsTyping(false);
            resolve();
          }
        }, 18);
      });
    },
    []
  );

  const cancel = useCallback(() => {
    cancelRef.current = true;
  }, []);

  return { isTyping, typeText, cancel };
}

export function StepDescription() {
  const { draft, updateDraft } = usePublish();
  const [generatingField, setGeneratingField] = useState<'title' | 'description' | null>(null);
  const titleTextTr = useTextTwriter();
  const descTextTr = useTextTwriter();

  const typeLabel = PROPERTY_TYPES.find(t => t.value === draft.type)?.label || 'Inmueble';

  const generateTitle = () => {
    const parts = [];
    if (typeLabel) parts.push(typeLabel);
    if (draft.bedrooms) parts.push(`${draft.bedrooms} hab`);
    if (draft.neighborhood) parts.push(`en ${draft.neighborhood}`);
    return parts.join(' ') || '';
  };

  const generateDescription = () => {
    const parts = [];
    parts.push(`Hermoso ${typeLabel.toLowerCase()} de ${draft.area}m² ubicado en ${draft.neighborhood}, ${draft.city}.`);
    parts.push(`Cuenta con ${draft.bedrooms} habitación${draft.bedrooms > 1 ? 'es' : ''} y ${draft.bathrooms} baño${draft.bathrooms > 1 ? 's' : ''}.`);
    if (draft.amenities.length > 0) {
      parts.push(`Incluye ${draft.amenities.slice(0, 3).join(', ')}.`);
    }
    parts.push('Excelente ubicación con fácil acceso a transporte público y comercio.');
    return parts.join(' ');
  };

  const handleGenerateTitle = async () => {
    if (titleTextTr.isTyping) { titleTextTr.cancel(); return; }
    setGeneratingField('title');
    updateDraft({ title: '' });
    // Simulate AI thinking delay
    await new Promise(r => setTimeout(r, 600));
    const text = generateTitle();
    setGeneratingField(null);
    await titleTextTr.typeText(text, (partial) => updateDraft({ title: partial }));
  };

  const handleGenerateDescription = async () => {
    if (descTextTr.isTyping) { descTextTr.cancel(); return; }
    setGeneratingField('description');
    updateDraft({ description: '' });
    await new Promise(r => setTimeout(r, 800));
    const text = generateDescription();
    setGeneratingField(null);
    await descTextTr.typeText(text, (partial) => updateDraft({ description: partial }));
  };

  const isBusy = generatingField !== null || titleTextTr.isTyping || descTextTr.isTyping;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-1">
          Describe tu inmueble
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Un buen título y descripción atraen más inquilinos
        </p>
      </div>

      <div className="space-y-5">
        {/* Title */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="title" className="flex items-center gap-2 text-neutral-900 dark:text-white">
              <TextT className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
              Título del anuncio *
            </Label>
            <button
              type="button"
              onClick={handleGenerateTitle}
              disabled={generatingField === 'description' || descTextTr.isTyping}
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium transition-colors disabled:opacity-40",
                titleTextTr.isTyping
                  ? "text-amber-600 hover:text-amber-700"
                  : "text-indigo-600 hover:text-indigo-800"
              )}
            >
              {generatingField === 'title' ? (
                <SpinnerGap className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkle className={cn("w-3 h-3", titleTextTr.isTyping && "animate-pulse")} />
              )}
              {titleTextTr.isTyping ? 'Detener' : generatingField === 'title' ? 'Generando...' : 'Generar'}
            </button>
          </div>
          <div className="relative">
            <Input
              id="title"
              type="text"
              placeholder="Apartamento moderno en Chapinero"
              value={draft.title}
              onChange={(e) => { if (!titleTextTr.isTyping) updateDraft({ title: e.target.value }); }}
              maxLength={80}
              readOnly={titleTextTr.isTyping}
              className={cn(
                "rounded-xl border-neutral-200 dark:border-neutral-700",
                titleTextTr.isTyping && "border-indigo-300 bg-indigo-50/30 dark:bg-indigo-900/10"
              )}
            />
            {titleTextTr.isTyping && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-indigo-600 animate-pulse" />
            )}
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 text-right">
            {draft.title.length}/80 caracteres
          </p>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="description" className="flex items-center gap-2 text-neutral-900 dark:text-white">
              <FileText className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
              Descripción *
            </Label>
            <button
              type="button"
              onClick={handleGenerateDescription}
              disabled={generatingField === 'title' || titleTextTr.isTyping}
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium transition-colors disabled:opacity-40",
                descTextTr.isTyping
                  ? "text-amber-600 hover:text-amber-700"
                  : "text-indigo-600 hover:text-indigo-800"
              )}
            >
              {generatingField === 'description' ? (
                <SpinnerGap className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkle className={cn("w-3 h-3", descTextTr.isTyping && "animate-pulse")} />
              )}
              {descTextTr.isTyping ? 'Detener' : generatingField === 'description' ? 'Generando...' : 'Generar'}
            </button>
          </div>
          <div className="relative">
            <Textarea
              id="description"
              placeholder="Describe las características únicas de tu inmueble, la zona, accesibilidad, y cualquier detalle relevante..."
              value={draft.description}
              onChange={(e) => { if (!descTextTr.isTyping) updateDraft({ description: e.target.value }); }}
              rows={6}
              maxLength={1000}
              className={cn(
                "resize-none rounded-xl border-neutral-200 dark:border-neutral-700",
                descTextTr.isTyping && "border-indigo-300 bg-indigo-50/30 dark:bg-indigo-900/10"
              )}
              readOnly={descTextTr.isTyping}
            />
            {descTextTr.isTyping && (
              <span className="absolute right-3 bottom-3 w-0.5 h-4 bg-indigo-600 animate-pulse" />
            )}
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 text-right">
            {draft.description.length}/1000 caracteres
          </p>
        </div>
      </div>

      {/* Tips */}
      <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700">
        <p className="text-sm font-medium text-neutral-900 dark:text-white mb-2">Tips para una mejor descripción:</p>
        <ul className="text-sm text-neutral-500 dark:text-neutral-400 space-y-1 list-disc list-inside">
          <li>Menciona características únicas del inmueble</li>
          <li>Describe la ubicación y accesibilidad</li>
          <li>Incluye información sobre servicios cercanos</li>
          <li>Sé honesto sobre el estado del inmueble</li>
        </ul>
      </div>
    </div>
  );
}
