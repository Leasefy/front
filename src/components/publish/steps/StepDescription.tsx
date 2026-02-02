'use client';

import { Type, FileText, Sparkles } from 'lucide-react';
import { usePublish } from '@/lib/context/PublishContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PROPERTY_TYPES } from '@/lib/types/publish';

export function StepDescription() {
  const { draft, updateDraft } = usePublish();

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
    parts.push(`Cuenta con ${draft.bedrooms} habitacion${draft.bedrooms > 1 ? 'es' : ''} y ${draft.bathrooms} bano${draft.bathrooms > 1 ? 's' : ''}.`);
    if (draft.amenities.length > 0) {
      parts.push(`Incluye ${draft.amenities.slice(0, 3).join(', ')}.`);
    }
    parts.push('Excelente ubicacion con facil acceso a transporte publico y comercio.');
    return parts.join(' ');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-black mb-1">
          Describe tu inmueble
        </h3>
        <p className="text-sm text-black/50">
          Un buen titulo y descripcion atraen mas inquilinos
        </p>
      </div>

      <div className="space-y-5">
        {/* Title */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="title" className="flex items-center gap-2">
              <Type className="w-4 h-4 text-black/40" />
              Titulo del anuncio *
            </Label>
            <button
              type="button"
              onClick={() => updateDraft({ title: generateTitle() })}
              className="flex items-center gap-1.5 text-xs text-black/50 hover:text-black transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              Generar
            </button>
          </div>
          <Input
            id="title"
            type="text"
            placeholder="Apartamento moderno en Chapinero"
            value={draft.title}
            onChange={(e) => updateDraft({ title: e.target.value })}
            maxLength={80}
          />
          <p className="text-xs text-black/40 text-right">
            {draft.title.length}/80 caracteres
          </p>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="description" className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-black/40" />
              Descripcion *
            </Label>
            <button
              type="button"
              onClick={() => updateDraft({ description: generateDescription() })}
              className="flex items-center gap-1.5 text-xs text-black/50 hover:text-black transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              Generar
            </button>
          </div>
          <Textarea
            id="description"
            placeholder="Describe las caracteristicas unicas de tu inmueble, la zona, accesibilidad, y cualquier detalle relevante..."
            value={draft.description}
            onChange={(e) => updateDraft({ description: e.target.value })}
            rows={6}
            maxLength={1000}
            className="resize-none"
          />
          <p className="text-xs text-black/40 text-right">
            {draft.description.length}/1000 caracteres
          </p>
        </div>
      </div>

      {/* Tips */}
      <div className="p-4 bg-black/[0.02] rounded-sm">
        <p className="text-sm font-medium text-black/70 mb-2">Tips para una mejor descripcion:</p>
        <ul className="text-sm text-black/50 space-y-1 list-disc list-inside">
          <li>Menciona caracteristicas unicas del inmueble</li>
          <li>Describe la ubicacion y accesibilidad</li>
          <li>Incluye informacion sobre servicios cercanos</li>
          <li>Se honesto sobre el estado del inmueble</li>
        </ul>
      </div>
    </div>
  );
}
