'use client';

/**
 * El modal que confirma una acción sobre una postulación.
 *
 * Vivía dentro de `/inmuebles/[id]/candidatos/page.tsx`. Se sacó acá cuando
 * **Postulaciones** dejó de mandar al usuario a la pantalla del inmueble para
 * abrir el detalle: las dos pantallas ofrecen las mismas cuatro acciones y una
 * copia aparte se habría desincronizado en la primera corrección de copy.
 *
 * S6 — antes era un `<div className="fixed inset-0">` a mano: sin portal (lo
 * tapaba cualquier contenedor con `overflow` o `z-index` propio), sin
 * `role="dialog"` ni foco atrapado (un lector de pantalla seguía leyendo la
 * tabla de atrás), sin cerrar con Escape y sin frenar el scroll suave de Lenis,
 * que seguía corriendo la página debajo del modal. Ahora usa el patrón de la
 * casa (`ResponsiveDialog`, §17 de DESIGN.md), que además lo vuelve una hoja
 * desde abajo en móvil, como el resto de los diálogos del panel.
 */

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useLenis } from '@/components/providers/SmoothScroll';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from '@/components/ui/responsive-dialog';

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
  const lenis = useLenis();

  // El scroll suave seguía corriendo la página debajo del modal.
  useEffect(() => {
    lenis?.stop();
    return () => {
      lenis?.start();
    };
  }, [lenis]);

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
    <ResponsiveDialog
      open
      onOpenChange={(abierto) => {
        // Escape, clic afuera o la X: todos cierran por acá. Mientras se está
        // mandando no se cierra — la acción ya salió y cerrar dejaría a la
        // persona sin saber cómo terminó.
        if (!abierto && !isSubmitting) onClose();
      }}
    >
      <ResponsiveDialogContent
        className="max-w-md max-h-[90dvh] overflow-y-auto"
        data-lenis-prevent
        style={{ overscrollBehavior: 'contain' }}
      >
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{cfg.title}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>{candidateName}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-fg" htmlFor="accion-postulacion-texto">
              {cfg.label}
            </label>
            <Textarea
              id="accion-postulacion-texto"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={cfg.placeholder}
              rows={3}
              autoFocus
              className="resize-none"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <ResponsiveDialogFooter className="gap-2">
            <Button
              type="button"
              variant="secondary"
              hideArrow
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
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
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
