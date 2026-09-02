'use client';

/**
 * El modal que confirma una acción sobre una postulación.
 *
 * Vivía dentro de `/inmuebles/[id]/candidatos/page.tsx`. Se sacó acá cuando
 * **Postulaciones** dejó de mandar al usuario a la pantalla del inmueble para
 * abrir el detalle: las dos pantallas ofrecen las mismas cuatro acciones y una
 * copia aparte se habría desincronizado en la primera corrección de copy.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export type ActionType = 'approve' | 'reject' | 'request-info';

type ConfirmVariant = 'default' | 'destructive';

export const ACTION_CONFIG: Record<
  ActionType,
  {
    title: string;
    label: string;
    placeholder: string;
    required: boolean;
    confirmLabel: string;
    confirmVariant: ConfirmVariant;
  }
> = {
  approve: {
    title: 'Aprobar candidato',
    label: 'Mensaje al candidato (opcional)',
    placeholder: 'Mensaje que verá el candidato...',
    required: false,
    confirmLabel: 'Aprobar',
    confirmVariant: 'default',
  },
  reject: {
    title: 'Rechazar postulación',
    label: 'Motivo del rechazo',
    placeholder: 'Explica el motivo del rechazo al candidato...',
    required: true,
    confirmLabel: 'Rechazar',
    confirmVariant: 'destructive',
  },
  'request-info': {
    title: 'Solicitar información',
    label: 'Mensaje al candidato',
    placeholder: '¿Qué información adicional necesitas?',
    required: true,
    confirmLabel: 'Enviar solicitud',
    confirmVariant: 'default',
  },
};

export function AccionDePostulacion({
  type,
  candidateName,
  onConfirm,
  onClose,
}: {
  type: ActionType;
  candidateName: string;
  onConfirm: (text: string) => Promise<void>;
  onClose: () => void;
}) {
  const cfg = ACTION_CONFIG[type];
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Error de una ACCIÓN, no de carga: acá el mensaje sí se muestra tal cual,
  // porque describe lo que la persona acaba de intentar hacer.
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cfg.required && !text.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(text.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar la acción');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card rounded-xl border border-border">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-fg">{cfg.title}</h2>
          <p className="text-sm text-fg-muted mt-0.5">{candidateName}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-fg">{cfg.label}</label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={cfg.placeholder}
              rows={3}
              autoFocus
              className="resize-none"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" hideArrow onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button
              type="submit"
              variant={cfg.confirmVariant}
              hideArrow
              isLoading={isSubmitting}
              disabled={(cfg.required && !text.trim()) || isSubmitting}
              className="flex-1"
            >
              {cfg.confirmLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
