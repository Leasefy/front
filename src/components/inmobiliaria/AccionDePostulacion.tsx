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
 *
 * Sistema de errores (02-10-2026): lo que el back rechaza del texto (`message`
 * o `reason`, `MaxLength(1000)` en los DTO de `landlord/`) sale DEBAJO del
 * campo con `ErrorDelCampo` y el campo recibe el foco; lo demás va al pie por
 * el traductor —un 5xx dice que es nuestro, con la referencia; «conexión»
 * sólo sin respuesta—. Antes se pintaba `err.message` crudo.
 */

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { MAX_LARGO_DEL_TEXTO_AL_CANDIDATO } from '@/lib/postulaciones/limites-de-la-decision';
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

export { MAX_LARGO_DEL_TEXTO_AL_CANDIDATO };

/** Lo que se estaba haciendo, para el texto de un 5xx. */
const ACCION_EN_INFINITIVO: Record<ActionType, string> = {
  approve: 'aprobar al candidato',
  reject: 'rechazar la postulación',
  'request-info': 'pedir la información',
};

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
  // El error del texto (lo que el back dijo de `message`/`reason`) y el de la
  // acción (todo lo demás: un 409, un 5xx, la red), por el traductor.
  const [errorDelTexto, setErrorDelTexto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const campoRef = useRef<HTMLTextAreaElement>(null);
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
    setErrorDelTexto(null);
    try {
      await onConfirm(text.trim());
      onClose();
    } catch (err) {
      const reparto = repartirErroresDelServidor(err, {
        mapa: { message: 'texto', reason: 'texto' },
        campos: ['texto'],
        porDefecto: 'No se pudo completar la acción. Prueba de nuevo en un momento.',
        accion: ACCION_EN_INFINITIVO[type],
      });
      if (reparto.porCampo.texto) {
        setErrorDelTexto(reparto.porCampo.texto);
        campoRef.current?.focus();
      }
      setError(reparto.sueltos.length ? reparto.sueltos.join(' · ') : null);
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
              ref={campoRef}
              id="accion-postulacion-texto"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setErrorDelTexto(null);
              }}
              placeholder={cfg.placeholder}
              rows={3}
              autoFocus
              maxLength={MAX_LARGO_DEL_TEXTO_AL_CANDIDATO}
              className="resize-none"
              aria-invalid={errorDelTexto ? true : undefined}
              aria-describedby={errorDelTexto ? 'accion-postulacion-texto-error' : undefined}
            />
            <ErrorDelCampo id="accion-postulacion-texto-error" mensaje={errorDelTexto} className="mt-0" />
          </div>

          {/* Lo que no es del texto: un 409, un 5xx con su referencia, la red. */}
          <ErrorDelCampo id="accion-postulacion-error" mensaje={error} className="mt-0 text-sm" />

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
