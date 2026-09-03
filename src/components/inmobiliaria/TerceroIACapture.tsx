'use client';

import { useMemo, useRef, useState } from 'react';
import {
  Sparkle,
  UploadSimple,
  IdentificationCard,
  ArrowClockwise,
  WarningCircle,
  PencilSimple,
  FilePdf,
  FileDoc,
  FileImage,
  X,
  Plus,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { PropietarioForm } from './PropietarioForm';
import {
  extractTerceroFromFiles,
  extractedToPropietario,
  mediaTypeDeArchivo,
  validarArchivos,
  TerceroExtractUnavailableError,
} from '@/lib/api/terceros-extract.service';
import {
  TERCERO_DOC_MEDIA_TYPE,
  TERCERO_DOCX_MEDIA_TYPE,
  TERCERO_MAX_ARCHIVOS,
  TERCERO_PDF_MEDIA_TYPE,
} from '@/lib/api/terceros-extract.types';
import type {
  TerceroConflicto,
  TerceroDocumentoDetectado,
  TerceroExtraido,
} from '@/lib/api/terceros-extract.types';
import type { Propietario, PropietarioFormData } from '@/lib/types/inmobiliaria';

interface TerceroIACaptureProps {
  /** Reusa el handler de creación manual existente (TERC-04 sin cambios). */
  onCreated: (data: PropietarioFormData) => Promise<void>;
  onClose: () => void;
}

type Step = 'upload' | 'extracting' | 'review' | 'error';

/** Lo que el `<input type="file">` deja elegir: fotos, PDF y Word. */
const ACCEPT = [
  'image/*',
  TERCERO_PDF_MEDIA_TYPE,
  '.pdf',
  TERCERO_DOCX_MEDIA_TYPE,
  '.docx',
  TERCERO_DOC_MEDIA_TYPE,
  '.doc',
].join(',');

/** Qué documentos suele detectar el agente, en castellano. */
const TIPO_DETECTADO: Record<string, string> = {
  cedula: 'Cédula',
  rut: 'RUT',
  pasaporte: 'Pasaporte',
  certificacion_bancaria: 'Certificación bancaria',
  camara_comercio: 'Cámara de comercio',
  otro: 'Otro',
};

function tamano(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function IconoDeArchivo({ file }: { file: File }) {
  const tipo = mediaTypeDeArchivo(file);
  const cls = 'w-4 h-4 text-primary flex-shrink-0';
  if (tipo === TERCERO_PDF_MEDIA_TYPE) return <FilePdf className={cls} />;
  if (tipo === TERCERO_DOCX_MEDIA_TYPE || tipo === TERCERO_DOC_MEDIA_TYPE) return <FileDoc className={cls} />;
  return <FileImage className={cls} />;
}

/**
 * Captura de tercero por IA: subir la cédula, el RUT, la certificación
 * bancaria, la cámara de comercio… en foto, PDF o Word — varios a la vez — y
 * el agente arma UN propietario con todo (Nico, 2026-09-02: «pueden tener esa
 * información en múltiples lugares»). Se prellena PropietarioForm y el usuario
 * revisa y guarda con el flujo de creación existente (TERC-04 intacto).
 *
 * Ya no hay selector «Cédula | RUT»: con varios archivos el modelo detecta qué
 * es cada uno y lo devuelve (`documentos`), y una pista de un solo documento
 * era más un obstáculo («¿y si subo los dos?») que una ayuda.
 */
export function TerceroIACapture({ onCreated, onClose }: TerceroIACaptureProps) {
  const { t } = useI18n();
  const k = (s: string) => `inmobiliaria.terceroIA.${s}`;

  const [step, setStep] = useState<Step>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [extracted, setExtracted] = useState<TerceroExtraido | null>(null);
  const [conflictos, setConflictos] = useState<TerceroConflicto[]>([]);
  const [detectados, setDetectados] = useState<TerceroDocumentoDetectado[]>([]);
  const [confidence, setConfidence] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  /*
   * PropietarioForm copia `initialData` en su propio estado al montarse.
   * Elegir otro valor de un conflicto re-monta el formulario con la nueva
   * base — se hace al principio de la revisión, antes de editar a mano.
   */
  const [formKey, setFormKey] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const agregar = (nuevos: File[]) => {
    if (nuevos.length === 0) return;
    // El mismo archivo dos veces no aporta nada al modelo y sí cuesta.
    const vistos = new Set(files.map((f) => `${f.name}:${f.size}`));
    const distintos = nuevos.filter((f) => !vistos.has(`${f.name}:${f.size}`));
    const candidatos = [...files, ...distintos];
    const error = validarArchivos(candidatos);
    if (error) {
      toast.error(t(k(error), { max: String(TERCERO_MAX_ARCHIVOS) }));
      // Lo que ya estaba se queda; lo nuevo no entra.
      return;
    }
    setFiles(candidatos);
  };

  const quitar = (indice: number) => setFiles((prev) => prev.filter((_, i) => i !== indice));

  const handleExtract = async () => {
    if (files.length === 0) return;
    setStep('extracting');
    setErrorMsg(null);
    try {
      const res = await extractTerceroFromFiles(files);
      setExtracted(res.tercero);
      setConflictos(res.conflictos);
      setDetectados(res.documentos);
      setConfidence(res.confidence);
      setFormKey((n) => n + 1);
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
    setConflictos([]);
    setDetectados([]);
    setErrorMsg(null);
  };

  const fillManually = () => {
    setExtracted(null);
    setConflictos([]);
    setConfidence(0);
    setStep('review');
  };

  /** Un valor de un conflicto pasa a ser el del formulario. */
  const usarValor = (campo: TerceroConflicto['campo'], valor: string) => {
    setExtracted((prev) => {
      if (!prev) return prev;
      if (campo === 'tipoCuenta') {
        const v = valor.toLowerCase();
        return {
          ...prev,
          tipoCuenta: v.includes('ahorro') ? 'savings' : v.includes('corriente') ? 'checking' : prev.tipoCuenta,
        };
      }
      if (campo === 'banco') return { ...prev, bancoNombre: valor };
      if (campo === 'tipoDocumento') {
        const up = valor.toUpperCase();
        const tipo = up.includes('NIT') ? 'NIT' : up.includes('CE') ? 'CE' : up.includes('PASS') ? 'PASSPORT' : 'CC';
        return { ...prev, tipoDocumento: tipo };
      }
      if (campo === 'fieldConfidence') return prev;
      return { ...prev, [campo]: valor };
    });
    setFormKey((n) => n + 1);
  };

  const handleSave = async (data: PropietarioFormData) => {
    await onCreated(data);
    onClose();
  };

  const prefill: Propietario | undefined = useMemo(
    () => (extracted ? extractedToPropietario(extracted) : undefined),
    [extracted],
  );
  const confidencePct = Math.round(confidence * 100);

  // ── Review step: prefilled (or blank) PropietarioForm ──────────────────────
  if (step === 'review') {
    const detectadosLegibles = detectados
      .map((d) => TIPO_DETECTADO[d.tipo] ?? d.tipo)
      .filter((v, i, arr) => arr.indexOf(v) === i);
    return (
      <div className="space-y-4">
        {extracted ? (
          <div className="rounded-lg bg-warning-soft border border-warning/30 p-3 flex items-start gap-2.5">
            <PencilSimple className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" weight="fill" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-warning">{t(k('reviewBannerTitle'))}</p>
              <p className="text-xs text-warning/90 mt-0.5">
                {t(k('reviewBannerDesc'), { confidence: String(confidencePct) })}
              </p>
              {detectadosLegibles.length > 0 ? (
                <p className="text-xs text-warning/90 mt-0.5" data-testid="documentos-detectados">
                  {t(k('detectados'))}: {detectadosLegibles.join(' · ')}
                </p>
              ) : null}
              {extracted.bancoNombre && !extracted.banco ? (
                <p className="text-xs text-warning/90 mt-0.5" data-testid="banco-fuera-de-lista">
                  {t(k('bancoFueraDeLista'), { banco: extracted.bancoNombre })}
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t(k('manualNote'))}</p>
        )}

        {extracted && conflictos.length > 0 ? (
          <div
            className="rounded-lg border border-danger/30 bg-danger-soft p-3 space-y-2"
            data-testid="conflictos"
          >
            <div className="flex items-start gap-2.5">
              <WarningCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" weight="fill" />
              <div>
                <p className="text-xs font-semibold text-danger">{t(k('conflictosTitle'))}</p>
                <p className="text-xs text-danger/90 mt-0.5">{t(k('conflictosDesc'))}</p>
              </div>
            </div>
            <ul className="space-y-1.5 pl-7">
              {conflictos.map((c) => (
                <li key={c.campo} className="text-xs" data-testid={`conflicto-${c.campo}`}>
                  <span className="font-medium text-foreground">{t(k(`campos.${c.campo}`))}:</span>
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    {c.valores.map((v) => (
                      <button
                        key={`${v.documento}:${v.valor}`}
                        type="button"
                        onClick={() => usarValor(c.campo, v.valor)}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-foreground hover:border-primary hover:text-primary"
                        title={t(k('usarValorDe'), { documento: v.documento })}
                        data-testid={`usar-${c.campo}`}
                      >
                        <span className="font-medium">{v.valor}</span>
                        <span className="text-muted-foreground">· {v.documento}</span>
                      </button>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <PropietarioForm
          key={formKey}
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
        <p className="text-sm text-muted-foreground">
          {t(k('extractingN'), { n: String(files.length) })}
        </p>
      </div>
    );
  }

  // ── Error step ─────────────────────────────────────────────────────────────
  if (step === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-10 px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-danger-soft flex items-center justify-center">
          <WarningCircle className="w-7 h-7 text-danger" />
        </div>
        <div className="space-y-1">
          <h3 className="text-h4 font-semibold text-foreground">{t(k('errorTitle'))}</h3>
          <p className="text-body-sm text-muted-foreground max-w-sm">{errorMsg}</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Button variant="secondary" size="sm" hideArrow onClick={resetToUpload}>
            <ArrowClockwise className="w-4 h-4" />
            {t(k('retry'))}
          </Button>
          <Button size="sm" hideArrow onClick={fillManually}>
            <PencilSimple className="w-4 h-4" weight="bold" />
            {t(k('fillManual'))}
          </Button>
        </div>
      </div>
    );
  }

  // ── Upload step (default) ────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center flex-shrink-0">
          <Sparkle className="w-5 h-5 text-primary" weight="fill" />
        </div>
        <p className="text-body-sm text-muted-foreground">{t(k('intro'))}</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        data-testid="tercero-ia-input"
        onChange={(e) => {
          agregar(Array.from(e.target.files ?? []));
          // Volver a elegir el mismo archivo tiene que disparar onChange.
          e.target.value = '';
        }}
      />

      {/* Dropzone: click o arrastrar. Lo que ya está listado se queda. */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          agregar(Array.from(e.dataTransfer.files ?? []));
        }}
        className={`w-full rounded-lg border-2 border-dashed bg-muted/30 hover:bg-muted/50 transition-colors p-6 flex flex-col items-center justify-center gap-2 text-center ${
          arrastrando ? 'border-primary bg-primary-soft/40' : 'border-border hover:border-foreground/20'
        }`}
        data-testid="tercero-ia-dropzone"
      >
        <div className="w-12 h-12 rounded-xl bg-primary-soft flex items-center justify-center mb-1">
          <IdentificationCard className="w-6 h-6 text-primary" />
        </div>
        <p className="text-body-sm font-medium text-foreground">
          {files.length === 0 ? t(k('uploadTitle')) : t(k('uploadMore'))}
        </p>
        <p className="text-caption text-muted-foreground inline-flex items-center gap-1">
          <UploadSimple className="w-3.5 h-3.5" />
          {t(k('uploadHint'), { max: String(TERCERO_MAX_ARCHIVOS) })}
        </p>
      </button>

      {files.length > 0 ? (
        <ul className="divide-y divide-border rounded-lg border border-border" data-testid="tercero-ia-archivos">
          {files.map((f, i) => (
            <li key={`${f.name}:${f.size}`} className="flex items-center gap-3 px-3 py-2 text-sm">
              <IconoDeArchivo file={f} />
              <span className="min-w-0 flex-1 truncate text-foreground" title={f.name}>
                {f.name}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">{tamano(f.size)}</span>
              <button
                type="button"
                onClick={() => quitar(i)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={t(k('quitar'), { nombre: f.name })}
                data-testid={`quitar-${i}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
          <li className="px-3 py-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              {t(k('agregarOtro'))}
            </button>
          </li>
        </ul>
      ) : null}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="secondary" hideArrow onClick={onClose}>
          {t(k('cancel'))}
        </Button>
        <Button hideArrow onClick={handleExtract} disabled={files.length === 0} data-testid="tercero-ia-extraer">
          <Sparkle className="w-4 h-4" weight="fill" />
          {files.length > 1 ? t(k('extractN'), { n: String(files.length) }) : t(k('extract'))}
        </Button>
      </div>
    </div>
  );
}
