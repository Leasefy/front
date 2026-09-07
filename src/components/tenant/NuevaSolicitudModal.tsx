'use client';

/**
 * NuevaSolicitudModal — v7-06-03 (SOLI-01 / SOLI-02) tenant "abrir solicitud" Dialog.
 *
 * ONE shared entity for two honest flows: a maintenance request (`tipo:'reparacion'`
 * with a description + real photos) AND a formal PQRS (petición / queja / reclamo /
 * sugerencia / solicitud). The shell is copied from `PayRentModal` (AnimatePresence
 * backdrop, `useLenis().stop()/start()` per DESIGN §8, `data-lenis-prevent` scroll
 * body, header/body/footer, `Button isLoading`, `toast`).
 *
 * Honest-degrade contract (T-v7-06-08):
 *   - Submit calls `pqrsApi.create(input)`. On success it uploads each photo via
 *     (pendiente de backend: ruta pqrs-scoped de adjuntos; el POST /documents genérico se retiró) — photos
 *     attach ONLY after a real create id, so there is never an orphaned upload.
 *   - On `PqrsUnavailableError` (backend not live) it shows an honest "Próximamente"
 *     toast and keeps the form intact — it NEVER fabricates a radicado and NEVER
 *     uploads photos with no entityId.
 *
 * Compliance (T-v7-06-09 / T-v7-06-10, Ley 2300 / Ley 1480 / Ley 820):
 *   - The requester role is set server-side from the JWT (assigned 'inquilino'); the
 *     client never claims it, so it is absent from the submitted body.
 *   - No provider-assignment, no cost input, no estado field, no motive-of-arrears
 *     prompt — the tenant only OPENS a request.
 *   - Any FUTURE retrieval/display of these photos must use a short-lived signed URL
 *     (`documentsApi.getSignedUrl`), never a raw persistent URL (anti-IDOR).
 *
 * Buttons are sentence case (DESIGN §4). Zero new npm packages.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/components/ui/toast';
import { X, Lifebuoy, Paperclip, ImageSquare, FileText } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/lib/i18n';
import { useLenis } from '@/components/providers/SmoothScroll';
import { pqrsApi, PqrsUnavailableError, type NuevaSolicitudInput } from '@/lib/api/pqrs.service';
import type { PqrsTipo } from '@/lib/api/pqrs.types';

interface NuevaSolicitudModalProps {
  open: boolean;
  onClose: () => void;
  /** Fired after a real create (+ photo uploads) so the list can refetch. */
  onCreated?: () => void;
  /** Suggested associations passed straight through to the create body. */
  prefill?: {
    contratoId?: string;
    propiedadId?: string;
  };
}

/** 10 MB per-file cap (mirrors the MessagesWidget photo picker). */
const MAX_BYTES = 10 * 1024 * 1024;
const ASUNTO_MAX = 120;
const DESCRIPCION_MAX = 1000;

/** The 6 shared `PqrsTipo` values with es-CO / en labels. Maintenance leads. */
const TIPO_OPTIONS: { value: PqrsTipo; es: string; en: string }[] = [
  { value: 'reparacion', es: 'Reparación / mantenimiento', en: 'Repair / maintenance' },
  { value: 'peticion', es: 'Petición', en: 'Petition' },
  { value: 'queja', es: 'Queja', en: 'Complaint' },
  { value: 'reclamo', es: 'Reclamo', en: 'Claim' },
  { value: 'sugerencia', es: 'Sugerencia', en: 'Suggestion' },
  { value: 'solicitud', es: 'Solicitud', en: 'Request' },
];

export function NuevaSolicitudModal({ open, onClose, onCreated, prefill }: NuevaSolicitudModalProps) {
  const { locale } = useI18n();
  const lenis = useLenis();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tipo, setTipo] = useState<PqrsTipo>('reparacion');
  const [asunto, setAsunto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pause Lenis smooth scroll while the modal is open (DESIGN §8).
  useEffect(() => {
    if (open) lenis.stop();
    else lenis.start();
    return () => lenis.start();
  }, [open, lenis]);

  // Reset the form when the modal closes so a re-open starts clean.
  useEffect(() => {
    if (!open) {
      setTipo('reparacion');
      setAsunto('');
      setDescripcion('');
      setFiles([]);
      setIsSubmitting(false);
    }
  }, [open]);

  const openPicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFilesSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const picked = Array.from(e.target.files ?? []);
      // Reset so re-selecting the SAME file re-fires onChange.
      e.target.value = '';
      const accepted: File[] = [];
      for (const f of picked) {
        if (f.size > MAX_BYTES) {
          toast.error(
            locale === 'es'
              ? `"${f.name}" supera el límite de 10 MB.`
              : `"${f.name}" exceeds the 10 MB limit.`,
          );
          continue;
        }
        accepted.push(f);
      }
      if (accepted.length > 0) setFiles((prev) => [...prev, ...accepted]);
    },
    [locale],
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    const asuntoTrim = asunto.trim();
    const descripcionTrim = descripcion.trim();
    if (!asuntoTrim || !descripcionTrim) {
      toast.error(
        locale === 'es'
          ? 'Completa el asunto y la descripción.'
          : 'Please fill in the subject and description.',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // The requester role is set server-side from the JWT — the client never claims it.
      const input: NuevaSolicitudInput = {
        tipo,
        asunto: asuntoTrim,
        descripcion: descripcionTrim,
        ...(prefill?.contratoId ? { contratoId: prefill.contratoId } : {}),
        ...(prefill?.propiedadId ? { propiedadId: prefill.propiedadId } : {}),
      };

      await pqrsApi.create(input);

      // Adjuntos: el upload genérico POST /documents se retiró del front (las
      // mutaciones de documentos vigentes son application-scoped) y todavía no
      // existe una ruta pqrs-scoped para evidencia. Honesto: la solicitud SÍ se
      // creó; las fotos avisan "próximamente" — nunca un upload huérfano ni un
      // "adjuntado" fabricado.
      if (files.length > 0) {
        toast.info(
          locale === 'es'
            ? 'Tu solicitud se envió sin las fotos: los adjuntos estarán disponibles próximamente.'
            : 'Your request was sent without the photos: attachments will be available soon.',
        );
      }

      toast.success(
        locale === 'es'
          ? 'Solicitud enviada. Te avisamos cuando avance.'
          : 'Request submitted. We will let you know as it progresses.',
      );
      onCreated?.();
      onClose();
    } catch (err) {
      if (err instanceof PqrsUnavailableError) {
        // Backend not live → honest "Próximamente". No fabricated radicado, no upload.
        toast.info(
          locale === 'es'
            ? 'Estamos habilitando las solicitudes. Vuelve a intentarlo pronto.'
            : 'We are enabling requests. Please try again soon.',
        );
      } else {
        toast.error(
          locale === 'es'
            ? 'No pudimos enviar tu solicitud. Intenta de nuevo.'
            : 'We could not submit your request. Please try again.',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [asunto, descripcion, tipo, files, prefill, locale, onCreated, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={isSubmitting ? undefined : onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface rounded-[22px] w-full max-w-lg border border-border shadow-lg"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[14px] bg-primary-soft flex items-center justify-center">
                  <Lifebuoy className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-fg">
                    {locale === 'es' ? 'Nueva solicitud' : 'New request'}
                  </h2>
                  <p className="text-xs text-fg-muted mt-0.5">
                    {locale === 'es'
                      ? 'Cuéntanos qué necesitas; la inmobiliaria le hará seguimiento.'
                      : 'Tell us what you need; your agency will follow up.'}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                disabled={isSubmitting}
                aria-label={locale === 'es' ? 'Cerrar' : 'Close'}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Body */}
            <div
              className="p-5 max-h-[70vh] overflow-y-auto space-y-4"
              data-lenis-prevent
              style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
            >
              {/* Tipo */}
              <div>
                <label htmlFor="solicitud-tipo" className="block text-sm font-medium text-fg mb-1.5">
                  {locale === 'es' ? 'Tipo de solicitud' : 'Request type'}
                </label>
                <select
                  id="solicitud-tipo"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as PqrsTipo)}
                  disabled={isSubmitting}
                  className="w-full h-11 px-4 text-base md:text-sm rounded-lg border border-border bg-surface text-fg focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
                >
                  {TIPO_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {locale === 'es' ? opt.es : opt.en}
                    </option>
                  ))}
                </select>
              </div>

              {/* Asunto */}
              <div>
                <label htmlFor="solicitud-asunto" className="block text-sm font-medium text-fg mb-1.5">
                  {locale === 'es' ? 'Asunto' : 'Subject'}
                </label>
                <Input
                  id="solicitud-asunto"
                  value={asunto}
                  onChange={(e) => setAsunto(e.target.value)}
                  maxLength={ASUNTO_MAX}
                  disabled={isSubmitting}
                  placeholder={
                    locale === 'es'
                      ? 'Ej.: Fuga en el baño principal'
                      : 'e.g. Leak in the main bathroom'
                  }
                  aria-label={locale === 'es' ? 'Asunto' : 'Subject'}
                />
              </div>

              {/* Descripción */}
              <div>
                <label
                  htmlFor="solicitud-descripcion"
                  className="block text-sm font-medium text-fg mb-1.5"
                >
                  {locale === 'es' ? 'Descripción' : 'Description'}
                </label>
                <Textarea
                  id="solicitud-descripcion"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  maxLength={DESCRIPCION_MAX}
                  rows={4}
                  disabled={isSubmitting}
                  placeholder={
                    locale === 'es'
                      ? 'Describe con detalle lo que sucede.'
                      : 'Describe in detail what is happening.'
                  }
                  aria-label={locale === 'es' ? 'Descripción' : 'Description'}
                />
              </div>

              {/* Fotos / evidencia */}
              <div>
                <span className="block text-sm font-medium text-fg mb-1.5">
                  {locale === 'es' ? 'Fotos o documentos (opcional)' : 'Photos or documents (optional)'}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleFilesSelected}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={openPicker}
                  disabled={isSubmitting}
                  hideArrow
                  className="inline-flex items-center gap-2"
                >
                  <Paperclip className="w-4 h-4" />
                  {locale === 'es' ? 'Agregar fotos' : 'Add photos'}
                </Button>
                <p className="text-xs text-fg-muted mt-1.5">
                  {locale === 'es'
                    ? 'Imágenes o PDF, hasta 10 MB cada uno.'
                    : 'Images or PDF, up to 10 MB each.'}
                </p>

                {files.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {files.map((file, index) => {
                      const isImage = file.type.startsWith('image/');
                      const ChipIcon = isImage ? ImageSquare : FileText;
                      return (
                        <li
                          key={`${file.name}-${index}`}
                          className="flex items-center gap-2 rounded-lg border border-border bg-surface-muted px-3 py-2"
                        >
                          <ChipIcon className="w-4 h-4 text-fg-muted flex-shrink-0" aria-hidden="true" />
                          <span className="text-sm text-fg truncate flex-1 min-w-0">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            disabled={isSubmitting}
                            className="text-fg-subtle hover:text-fg transition-colors flex-shrink-0"
                            aria-label={locale === 'es' ? `Quitar ${file.name}` : `Remove ${file.name}`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-border flex items-center justify-between gap-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
                {locale === 'es' ? 'Cancelar' : 'Cancel'}
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                isLoading={isSubmitting}
                disabled={isSubmitting}
                hideArrow
              >
                {locale === 'es' ? 'Enviar solicitud' : 'Submit request'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
