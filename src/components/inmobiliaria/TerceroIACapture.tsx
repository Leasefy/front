'use client';

import { useState, useRef } from 'react';
import {
  Sparkle,
  UploadSimple,
  IdentificationCard,
  ArrowClockwise,
  WarningCircle,
  PencilSimple,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Spinner } from '@/components/ui/spinner';
import { PropietarioForm } from './PropietarioForm';
import {
  extractTerceroFromImage,
  extractedToPropietario,
  TerceroExtractUnavailableError,
} from '@/lib/api/terceros-extract.service';
import type { TerceroDocKind, TerceroExtraido } from '@/lib/api/terceros-extract.types';
import type { Propietario, PropietarioFormData } from '@/lib/types/inmobiliaria';

interface TerceroIACaptureProps {
  /** Reusa el handler de creación manual existente (TERC-04 sin cambios). */
  onCreated: (data: PropietarioFormData) => Promise<void>;
  onClose: () => void;
}

type Step = 'upload' | 'extracting' | 'review' | 'error';

const DOC_KINDS: { value: TerceroDocKind; labelKey: string }[] = [
  { value: 'cedula', labelKey: 'kindCedula' },
  { value: 'rut', labelKey: 'kindRut' },
];

/**
 * Captura de tercero por IA (v6-07): subir foto de cédula/RUT → el agente
 * extrae los datos → se prellena PropietarioForm → el usuario revisa y guarda
 * con el flujo de creación existente. Se renderiza dentro del Modal de la
 * página de propietarios; el flujo manual permanece intacto (TERC-04).
 */
export function TerceroIACapture({ onCreated, onClose }: TerceroIACaptureProps) {
  const { t } = useI18n();
  const k = (s: string) => `inmobiliaria.terceroIA.${s}`;

  const [step, setStep] = useState<Step>('upload');
  const [docKind, setDocKind] = useState<TerceroDocKind>('cedula');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<TerceroExtraido | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onPickFile = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      toast.error(t(k('errorImageOnly')));
      return;
    }
    setFile(f);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
  };

  const handleExtract = async () => {
    if (!file) return;
    setStep('extracting');
    setErrorMsg(null);
    try {
      const res = await extractTerceroFromImage(file, docKind);
      setExtracted(res.tercero);
      setConfidence(res.confidence);
      setStep('review');
    } catch (err) {
      if (err instanceof TerceroExtractUnavailableError) {
        setErrorMsg(t(k('errorUnavailable')));
      } else {
        setErrorMsg(err instanceof Error ? err.message : t(k('errorGeneric')));
      }
      setStep('error');
    }
  };

  const resetToUpload = () => {
    setStep('upload');
    setExtracted(null);
    setErrorMsg(null);
  };

  const fillManually = () => {
    setExtracted(null);
    setConfidence(0);
    setStep('review');
  };

  const handleSave = async (data: PropietarioFormData) => {
    await onCreated(data);
    onClose();
  };

  const prefill: Propietario | undefined = extracted ? extractedToPropietario(extracted) : undefined;
  const confidencePct = Math.round(confidence * 100);

  // ── Review step: prefilled (or blank) PropietarioForm ──────────────────────
  if (step === 'review') {
    return (
      <div className="space-y-4">
        {extracted ? (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 flex items-start gap-2.5">
            <PencilSimple className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" weight="fill" />
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                {t(k('reviewBannerTitle'))}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-300/90 mt-0.5">
                {t(k('reviewBannerDesc'), { confidence: String(confidencePct) })}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t(k('manualNote'))}</p>
        )}
        <PropietarioForm
          initialData={prefill}
          onSubmit={handleSave}
          onCancel={onClose}
          mode="create"
        />
      </div>
    );
  }

  // ── Extracting step ────────────────────────────────────────────────────────
  if (step === 'extracting') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
        <Spinner size="md" variant="muted" />
        <p className="text-sm text-muted-foreground">{t(k('extracting'))}</p>
      </div>
    );
  }

  // ── Error step ─────────────────────────────────────────────────────────────
  if (step === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-10 px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center">
          <WarningCircle className="w-7 h-7 text-rose-600 dark:text-rose-400" />
        </div>
        <div className="space-y-1">
          <h3 className="text-h4 font-semibold text-foreground">{t(k('errorTitle'))}</h3>
          <p className="text-body-sm text-muted-foreground max-w-sm">{errorMsg}</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={resetToUpload}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-mono uppercase tracking-wide text-xs transition-colors"
          >
            <ArrowClockwise className="w-4 h-4" />
            {t(k('retry'))}
          </button>
          <button
            onClick={fillManually}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-primary-foreground font-mono uppercase tracking-wide text-xs transition-transform active:scale-[0.97]"
          >
            <PencilSimple className="w-4 h-4" weight="bold" />
            {t(k('fillManual'))}
          </button>
        </div>
      </div>
    );
  }

  // ── Upload step (default) ────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center flex-shrink-0">
          <Sparkle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" weight="fill" />
        </div>
        <p className="text-body-sm text-muted-foreground">{t(k('intro'))}</p>
      </div>

      {/* Tipo de documento */}
      <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-muted">
        {DOC_KINDS.map((dk) => (
          <button
            key={dk.value}
            onClick={() => setDocKind(dk.value)}
            className={cn(
              'h-9 px-4 rounded-lg text-sm font-medium transition-colors',
              docKind === dk.value
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t(k(dk.labelKey))}
          </button>
        ))}
      </div>

      {/* Dropzone */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onPickFile(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="w-full rounded-2xl border-2 border-dashed border-border bg-muted/30 hover:bg-muted/50 hover:border-foreground/20 transition-colors p-6 flex flex-col items-center justify-center gap-2 text-center"
      >
        {previewUrl ? (
          <div
            className="w-full h-40 rounded-xl bg-center bg-cover border border-border"
            style={{ backgroundImage: `url(${previewUrl})` }}
            aria-label={file?.name}
          />
        ) : (
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center mb-1">
            <IdentificationCard className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
        )}
        <p className="text-body-sm font-medium text-foreground">
          {file ? file.name : t(k('uploadTitle'))}
        </p>
        <p className="text-caption text-muted-foreground inline-flex items-center gap-1">
          <UploadSimple className="w-3.5 h-3.5" />
          {file ? t(k('uploadChange')) : t(k('uploadHint'))}
        </p>
      </button>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          onClick={onClose}
          className="h-11 px-4 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-mono uppercase tracking-wide text-sm transition-colors"
        >
          {t(k('cancel'))}
        </button>
        <button
          onClick={handleExtract}
          disabled={!file}
          className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-primary text-primary-foreground font-mono uppercase tracking-wide text-sm transition-transform active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkle className="w-4 h-4" weight="fill" />
          {t(k('extract'))}
        </button>
      </div>
    </div>
  );
}
