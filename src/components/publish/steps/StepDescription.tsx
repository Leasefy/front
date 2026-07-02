'use client';

import { useState, useRef, useCallback } from 'react';
import { TextT, FileText, Sparkle, SpinnerGap } from '@phosphor-icons/react';
import { usePublish } from '@/lib/context/PublishContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
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
        <h3 className="text-sm font-medium text-fg mb-1">
          Describe tu inmueble
        </h3>
        <p className="text-sm text-fg-muted">
          Un buen título y descripción atraen más inquilinos
        </p>
      </div>

      <div className="space-y-5">
        {/* Title */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="title" className="flex items-center gap-2 text-fg">
              <TextT className="w-4 h-4 text-fg-subtle" />
              Título del anuncio *
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              hideArrow
              onClick={handleGenerateTitle}
              disabled={generatingField === 'description' || descTextTr.isTyping}
              className={cn(
                "h-auto gap-1.5 px-2 py-1 text-xs font-medium disabled:opacity-40",
                titleTextTr.isTyping
                  ? "text-warning hover:text-warning"
                  : "text-primary hover:text-primary"
              )}
            >
              {generatingField === 'title' ? (
                <SpinnerGap className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkle className={cn("w-3 h-3", titleTextTr.isTyping && "animate-pulse")} />
              )}
              {titleTextTr.isTyping ? 'Detener' : generatingField === 'title' ? 'Generando...' : 'Generar'}
            </Button>
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
                titleTextTr.isTyping && "border-primary/40 bg-primary-soft/50"
              )}
            />
            {titleTextTr.isTyping && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary animate-pulse" />
            )}
          </div>
          <p className="text-xs text-fg-subtle text-right font-mono tabular-nums">
            {draft.title.length}/80 caracteres
          </p>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="description" className="flex items-center gap-2 text-fg">
              <FileText className="w-4 h-4 text-fg-subtle" />
              Descripción *
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              hideArrow
              onClick={handleGenerateDescription}
              disabled={generatingField === 'title' || titleTextTr.isTyping}
              className={cn(
                "h-auto gap-1.5 px-2 py-1 text-xs font-medium disabled:opacity-40",
                descTextTr.isTyping
                  ? "text-warning hover:text-warning"
                  : "text-primary hover:text-primary"
              )}
            >
              {generatingField === 'description' ? (
                <SpinnerGap className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkle className={cn("w-3 h-3", descTextTr.isTyping && "animate-pulse")} />
              )}
              {descTextTr.isTyping ? 'Detener' : generatingField === 'description' ? 'Generando...' : 'Generar'}
            </Button>
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
                "resize-none",
                descTextTr.isTyping && "border-primary/40 bg-primary-soft/50"
              )}
              readOnly={descTextTr.isTyping}
            />
            {descTextTr.isTyping && (
              <span className="absolute right-3 bottom-3 w-0.5 h-4 bg-primary animate-pulse" />
            )}
          </div>
          <p className="text-xs text-fg-subtle text-right font-mono tabular-nums">
            {draft.description.length}/1000 caracteres
          </p>
        </div>
      </div>

      {/* Tips */}
      <div className="p-4 bg-surface-muted rounded-[20px] border border-border">
        <p className="text-sm font-medium text-fg mb-2">Tips para una mejor descripción:</p>
        <ul className="text-sm text-fg-muted space-y-1 list-disc list-inside">
          <li>Menciona características únicas del inmueble</li>
          <li>Describe la ubicación y accesibilidad</li>
          <li>Incluye información sobre servicios cercanos</li>
          <li>Sé honesto sobre el estado del inmueble</li>
        </ul>
      </div>
    </div>
  );
}
