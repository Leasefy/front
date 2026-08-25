'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkle,
  Microphone,
  Stop,
  ArrowClockwise,
  WarningCircle,
  ImageSquare,
  X,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Spinner } from '@/components/ui/spinner';
import { Button, Input, Textarea } from '@/components/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SegmentedControl, IconButton } from '@leasefy/cadence';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useAuth } from '@/lib/auth/use-auth';
import { propertiesApi, createPublishedWithDraftFallback } from '@/lib/api/properties.service';
import { uploadPropertyPhotos } from '@/lib/api/property-photos';
import { PropertyLocationField, type PropertyLocationValue } from '@/components/publicar/PropertyLocationField';
import { COLOMBIAN_CITIES } from '@/lib/types/property';
import type { PropertyType } from '@/lib/types/property';
import {
  extractPropertyFromCapture,
  PropertyExtractUnavailableError,
} from '@/lib/api/property-capture.service';
import type { PropertyFichaExtraida } from '@/lib/api/property-capture.types';

type Step = 'capture' | 'extracting' | 'review' | 'error';

const PROPERTY_TYPES: { value: PropertyType; labelKey: string }[] = [
  { value: 'apartment', labelKey: 'typeApartment' },
  { value: 'house', labelKey: 'typeHouse' },
  { value: 'studio', labelKey: 'typeStudio' },
  { value: 'room', labelKey: 'typeRoom' },
];

const MAX_PHOTOS = 4;
// ~4 min cap so a forgotten recorder can't produce an oversized upload, and a
// raw-size guard before sending (server caps the body at 28MB; webm voice is far
// smaller, but enforce a clear ceiling instead of a post-upload 413).
const MAX_RECORDING_SECONDS = 240;
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

interface ReviewForm {
  title: string;
  description: string;
  type: PropertyType;
  city: string;
  neighborhood: string;
  address: string;
  latitude?: number;
  longitude?: number;
  geocodePlaceId?: string;
  coordsSource?: 'geocoded' | 'city';
  monthlyRent: string;
  bedrooms: string;
  bathrooms: string;
  area: string;
  adminFee: string;
  stratum: string;
}

function fichaToForm(f: PropertyFichaExtraida): ReviewForm {
  const cityMatch = f.ciudad && COLOMBIAN_CITIES.includes(f.ciudad) ? f.ciudad : '';
  const description = [
    f.descripcionComercial ?? '',
    f.restricciones ? `Restricciones: ${f.restricciones}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
  const num = (n: number | null) => (n != null ? String(n) : '');
  return {
    title: f.titulo ?? '',
    description,
    type: f.tipo ?? 'apartment',
    city: cityMatch,
    neighborhood: f.barrio ?? '',
    address: f.direccion ?? '',
    monthlyRent: num(f.canon),
    bedrooms: num(f.habitaciones),
    bathrooms: num(f.banos),
    area: num(f.area),
    adminFee: num(f.administracion),
    stratum: num(f.estrato),
  };
}

/**
 * Captura de propiedad por IA (v6-08): grabar audio + fotos → el agente
 * transcribe (Whisper) y extrae la ficha (Claude) → el asesor revisa/corrige →
 * se crea con la API de creación existente. Flujo manual de /nueva intacto (CAPT-04).
 */
export function PropertyIACapture() {
  const { t } = useI18n();
  const k = (s: string) => `inmobiliaria.propertyIA.${s}`;
  const router = useRouter();
  const { isAdmin } = usePermissions();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>('capture');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);

  // ── Audio recording ──
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Photos ──
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // ── Review form ──
  const [form, setForm] = useState<ReviewForm | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  // Tracks manual edits so re-extracting (which overwrites the form) can confirm first.
  const formEditedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recorderRef.current?.stream?.getTracks().forEach((tr) => tr.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      photoUrls.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickMime = (): string => {
    if (typeof MediaRecorder === 'undefined') return '';
    for (const c of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']) {
      if (MediaRecorder.isTypeSupported(c)) return c;
    }
    return '';
  };

  const startRecording = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      toast.error(t(k('errorMicUnsupported')));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickMime();
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
        stream.getTracks().forEach((tr) => tr.stop());
      };
      mr.start();
      recorderRef.current = mr;
      setIsRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err) {
      const name = (err as { name?: string } | null)?.name;
      if (name === 'NotAllowedError' || name === 'SecurityError') toast.error(t(k('errorMicDenied')));
      else if (name === 'NotFoundError') toast.error(t(k('errorMicNotFound')));
      else toast.error(t(k('errorMic')));
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Auto-stop at the cap (a forgotten recorder shouldn't produce an oversized upload).
  useEffect(() => {
    if (isRecording && seconds >= MAX_RECORDING_SECONDS) {
      stopRecording();
      toast.info(t(k('autoStopped')));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, isRecording]);

  const reRecord = () => {
    setAudioBlob(null);
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setSeconds(0);
  };

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const all = Array.from(files).filter((f) => f.type.startsWith('image/'));
    // Only send formats Claude Vision accepts. HEIC (iPhone default) would be
    // mislabeled as jpeg and silently ignored — tell the user instead.
    const imgs = all.filter((f) => ALLOWED_PHOTO_TYPES.includes(f.type));
    if (imgs.length < all.length) toast.error(t(k('photoFormatUnsupported')));
    setPhotos((prev) => [...prev, ...imgs].slice(0, MAX_PHOTOS));
    setPhotoUrls((prev) => [...prev, ...imgs.map((f) => URL.createObjectURL(f))].slice(0, MAX_PHOTOS));
  };

  const removePhoto = (i: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
    setPhotoUrls((prev) => {
      const url = prev[i];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const handleExtract = async () => {
    if (!audioBlob) {
      toast.error(t(k('errorNoAudio')));
      return;
    }
    if (audioBlob.size > MAX_AUDIO_BYTES) {
      toast.error(t(k('errorAudioTooLarge')));
      return;
    }
    // Re-extracting overwrites the review form; confirm if the user edited it.
    if (form && formEditedRef.current && !window.confirm(t(k('confirmReextract')))) {
      return;
    }
    setStep('extracting');
    setErrorMsg(null);
    try {
      const res = await extractPropertyFromCapture(audioBlob, photos);
      setForm(fichaToForm(res.ficha));
      formEditedRef.current = false;
      setConfidence(res.confidence);
      setStep('review');
    } catch (err) {
      if (err instanceof PropertyExtractUnavailableError) setErrorMsg(t(k('errorUnavailable')));
      else setErrorMsg(err instanceof Error ? err.message : t(k('errorGeneric')));
      setStep('error');
    }
  };

  const updateForm = (field: keyof ReviewForm, value: string) => {
    formEditedRef.current = true;
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const updateLocation = (partial: PropertyLocationValue) => {
    formEditedRef.current = true;
    setForm((prev) =>
      prev
        ? {
            ...prev,
            ...(partial.address !== undefined ? { address: partial.address } : {}),
            latitude: partial.latitude,
            longitude: partial.longitude,
            geocodePlaceId: partial.geocodePlaceId,
            coordsSource: partial.coordsSource,
          }
        : prev,
    );
  };

  const isValid =
    !!form &&
    !!form.title &&
    !!form.description &&
    !!form.city &&
    !!form.neighborhood &&
    !!form.address &&
    Number(form.monthlyRent) > 0 &&
    Number(form.bedrooms) >= 0 &&
    Number(form.bathrooms) >= 0 &&
    Number(form.area) > 0;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !isValid || isCreating) return;
    setIsCreating(true);
    setErrorMsg(null);
    try {
      const payload: Parameters<typeof createPublishedWithDraftFallback>[0] = {
        title: form.title,
        description: form.description,
        type: form.type,
        city: form.city,
        neighborhood: form.neighborhood,
        address: form.address,
        monthlyRent: Number(form.monthlyRent),
        bedrooms: Number(form.bedrooms),
        bathrooms: Number(form.bathrooms),
        area: Number(form.area),
      };
      if (Number(form.adminFee) > 0) payload.adminFee = Number(form.adminFee);
      if (Number(form.stratum) > 0) payload.stratum = Number(form.stratum);
      if (typeof form.latitude === 'number' && typeof form.longitude === 'number') {
        payload.latitude = form.latitude;
        payload.longitude = form.longitude;
      }

      // Publish on create (marketplace contract); on the plan-limit 403 the
      // helper retries once as DRAFT so the reviewed ficha is never lost.
      const { property, publishBlocked } = await createPublishedWithDraftFallback(payload);

      if (publishBlocked) {
        toast.warning(t(k('planLimitDraft')));
      }

      // The property exists from here on: photo/assign failures must never be
      // surfaced as a creation error (a retry would duplicate the property).
      if (photos.length > 0) {
        const { failed } = await uploadPropertyPhotos(property.id, photos);
        if (failed.length > 0) {
          toast.warning(
            t(k('photosUploadPartial'), {
              failed: String(failed.length),
              total: String(photos.length),
            }),
          );
        }
      }

      if (isAdmin && form.title /* admin self-skip handled by manual page */) {
        // mirror /nueva: agents auto-assign themselves; admins assign later from the list
      }
      if (!isAdmin && user?.email) {
        try {
          await propertiesApi.assignAgent(property.id, user.email);
        } catch {
          // The property WAS created; only the auto-assign failed. Surfacing this
          // as a create error would tempt a retry that duplicates the property —
          // warn and continue to the list instead.
          toast.warning(t(k('assignWarning')));
        }
      }

      toast.success(t(k('created')));
      router.push('/panel/inmobiliaria/inmuebles');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t(k('createError')));
    } finally {
      setIsCreating(false);
    }
  };

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const confidencePct = Math.round(confidence * 100);

  // ── Review step ──
  if (step === 'review' && form) {
    return (
      <form onSubmit={handleCreate} className="space-y-5">
        <div className="rounded-xl bg-warning-soft border border-warning/30 p-3 flex items-start gap-2.5">
          <Sparkle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" weight="fill" />
          <div>
            <p className="text-xs font-semibold text-warning">{t(k('reviewBannerTitle'))}</p>
            <p className="text-xs text-warning/90 mt-0.5">
              {t(k('reviewBannerDesc'), { confidence: String(confidencePct) })}
            </p>
          </div>
        </div>

        <section className="bg-card rounded-xl border border-border p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-fg">{t(k('fTitle'))} *</label>
            <Input type="text" value={form.title} onChange={(e) => updateForm('title', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-fg">{t(k('fDescription'))} *</label>
            <Textarea value={form.description} onChange={(e) => updateForm('description', e.target.value)} rows={4} className="resize-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-fg">{t(k('fType'))} *</label>
            <SegmentedControl<PropertyType>
              aria-label={t(k('fType'))}
              fullWidth
              value={form.type}
              onChange={(v) => updateForm('type', v)}
              options={PROPERTY_TYPES.map((pt) => ({ value: pt.value, label: t(k(pt.labelKey)) }))}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg">{t(k('fCity'))} *</label>
              <Select value={form.city || undefined} onValueChange={(v) => updateForm('city', v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t(k('selectCity'))} />
                </SelectTrigger>
                <SelectContent>
                  {COLOMBIAN_CITIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg">{t(k('fNeighborhood'))} *</label>
              <Input type="text" value={form.neighborhood} onChange={(e) => updateForm('neighborhood', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-fg">{t(k('fAddress'))} *</label>
            <PropertyLocationField
              address={form.address}
              city={form.city}
              latitude={form.latitude}
              longitude={form.longitude}
              onChange={updateLocation}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg">{t(k('fBedrooms'))} *</label>
              <Input type="number" min="0" value={form.bedrooms} onChange={(e) => updateForm('bedrooms', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg">{t(k('fBathrooms'))} *</label>
              <Input type="number" min="0" step="0.5" value={form.bathrooms} onChange={(e) => updateForm('bathrooms', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg">{t(k('fArea'))} *</label>
              <Input type="number" min="1" value={form.area} onChange={(e) => updateForm('area', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg">{t(k('fRent'))} *</label>
              <Input type="number" min="1" value={form.monthlyRent} onChange={(e) => updateForm('monthlyRent', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg">{t(k('fAdminFee'))}</label>
              <Input type="number" min="0" value={form.adminFee} onChange={(e) => updateForm('adminFee', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg">{t(k('fStratum'))}</label>
              <Input type="number" min="1" max="6" value={form.stratum} onChange={(e) => updateForm('stratum', e.target.value)} />
            </div>
          </div>
        </section>

        {errorMsg && (
          <div className="rounded-xl border border-danger/30 bg-danger-soft p-4 text-danger text-sm">
            {errorMsg}
          </div>
        )}

        <div className="flex items-center gap-3 pb-6">
          <Button
            type="button"
            variant="secondary"
            hideArrow
            onClick={() => setStep('capture')}
          >
            {t(k('back'))}
          </Button>
          <Button
            type="submit"
            hideArrow
            isLoading={isCreating}
            disabled={!isValid || isCreating}
          >
            {isCreating ? t(k('creating')) : t(k('create'))}
          </Button>
        </div>
      </form>
    );
  }

  // ── Extracting step ──
  if (step === 'extracting') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Spinner size="md" variant="muted" />
        <p className="text-sm text-fg-muted">{t(k('processing'))}</p>
      </div>
    );
  }

  // ── Error step ──
  if (step === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-danger-soft flex items-center justify-center">
          <WarningCircle className="w-7 h-7 text-danger" weight="duotone" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-fg">{t(k('errorTitle'))}</h3>
          <p className="text-sm text-fg-muted max-w-sm">{errorMsg}</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Button variant="outline" hideArrow onClick={() => setStep('capture')}>
            <ArrowClockwise className="w-4 h-4" />
            {t(k('retry'))}
          </Button>
          {/* A mano = consignación. Una inmobiliaria nunca administra un
              inmueble sin propietario, y `/propiedades/nueva` no lo pide. */}
          <Button hideArrow onClick={() => router.push('/panel/inmobiliaria/inmuebles/nuevo')}>
            {t(k('manualFlow'))}
          </Button>
        </div>
      </div>
    );
  }

  // ── Capture step (default) ──
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center flex-shrink-0">
          <Sparkle className="w-5 h-5 text-primary" weight="duotone" />
        </div>
        <p className="text-sm text-fg-muted">{t(k('intro'))}</p>
      </div>

      {/* Audio recorder */}
      <section className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-fg">{t(k('recordTitle'))}</h2>
          {(isRecording || audioBlob) && (
            <span className={cn('text-sm font-mono tabular-nums', isRecording ? 'text-danger' : 'text-fg-muted')}>
              {mmss}
            </span>
          )}
        </div>

        {!audioBlob ? (
          // allowlist: custom audio-recorder control (full-width dashed zone with a
          // mic/stop icon-tile + animate-pulse recording state) — no Cadence recorder
          // primitive; Button can't host the recorder layout. Kept native.
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={cn(
              'w-full rounded-xl border-2 border-dashed transition-colors p-8 flex flex-col items-center justify-center gap-3 text-center',
              isRecording
                ? 'border-danger/30 bg-danger-soft/60'
                : 'border-border bg-surface-muted/40 hover:bg-surface-muted/70 hover:border-fg/20',
            )}
          >
            <div
              className={cn(
                'w-14 h-14 rounded-xl flex items-center justify-center',
                isRecording ? 'bg-danger-soft animate-pulse' : 'bg-primary-soft',
              )}
            >
              {isRecording ? (
                <Stop className="w-7 h-7 text-danger" weight="fill" />
              ) : (
                <Microphone className="w-7 h-7 text-primary" weight="duotone" />
              )}
            </div>
            <p className="text-sm font-medium text-fg">
              {isRecording ? t(k('stopRecording')) : t(k('startRecording'))}
            </p>
            <p className="text-xs text-fg-muted">{t(k('recordHint'))}</p>
          </button>
        ) : (
          <div className="space-y-3">
            {audioUrl && <audio controls src={audioUrl} className="w-full" aria-label={t(k('recordTitle'))} />}
            <Button
              type="button"
              variant="link"
              size="sm"
              hideArrow
              onClick={reRecord}
              className="gap-2 text-fg-muted"
            >
              <ArrowClockwise className="w-4 h-4" />
              {t(k('reRecord'))}
            </Button>
          </div>
        )}
      </section>

      {/* Photos (optional) */}
      <section className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-fg">{t(k('photosTitle'))}</h2>
          <p className="text-xs text-fg-muted mt-0.5">{t(k('photosHint'))}</p>
        </div>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => addPhotos(e.target.files)}
        />
        <div className="flex flex-wrap gap-3">
          {photoUrls.map((url, i) => (
            <div key={url} className="relative w-20 h-20 rounded-xl border border-border bg-center bg-cover" style={{ backgroundImage: `url(${url})` }}>
              <IconButton
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removePhoto(i)}
                aria-label={t(k('removePhoto'))}
                className="absolute -top-2 -right-2 h-6 w-6 min-h-0 min-w-0 rounded-full bg-card text-fg-muted"
                icon={<X className="w-3.5 h-3.5" />}
              />
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            // allowlist: custom photo-add tile (square dashed dropzone opening the hidden
            // file input) — image-tile/dropzone precedent; Button can't host the tile. Native.
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-border bg-surface-muted/40 hover:bg-surface-muted/70 flex flex-col items-center justify-center gap-1 text-fg-muted transition-colors"
            >
              <ImageSquare className="w-5 h-5" />
              <span className="text-[10px] font-medium">{t(k('addPhotos'))}</span>
            </button>
          )}
        </div>
      </section>

      <div className="flex items-center justify-end gap-2 pb-6">
        <Button
          type="button"
          variant="secondary"
          hideArrow
          onClick={() => router.push('/panel/inmobiliaria/inmuebles')}
        >
          {t(k('cancel'))}
        </Button>
        <Button
          type="button"
          hideArrow
          onClick={handleExtract}
          disabled={!audioBlob || isRecording}
        >
          <Sparkle className="w-4 h-4" weight="fill" />
          {t(k('process'))}
        </Button>
      </div>
    </div>
  );
}
