'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CaretLeft,
  UploadSimple,
  FileText,
  X,
  WarningCircle,
  CheckCircle,
  Info,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IconButton } from '@leasefy/cadence';
import { PageGuard } from '@/components/auth/PageGuard';
import { RecorridoHilo } from '@/components/inmobiliaria/recorrido/RecorridoHilo';
import { useContractActions } from '@/lib/hooks/useContracts';
import { contractsApi } from '@/lib/api/contracts.service';
import { landlordApplicationsApi } from '@/lib/api/applications.service';
import { propertiesApi } from '@/lib/api/properties.service';
import type { LandlordApplicationDetail } from '@/lib/api/applications.types';
import type { Property } from '@/lib/types/property';
import type { InsuranceTier, ContractOrigin } from '@/lib/api/contracts.types';

// ─── Types ───────────────────────────────────────────────────────────────────

type CreationMode = 'upload' | 'template' | 'generate';

interface FormState {
  mode: CreationMode;
  pdfFile: File | null;
  startDate: string;
  endDate: string;
  monthlyRent: string;    // string for input binding
  deposit: string;
  paymentDay: string;
  insuranceTier: InsuranceTier;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function oneYearAheadISO(from: string): string {
  const d = new Date(from);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

// ─── Page ────────────────────────────────────────────────────────────────────

function NuevoContratoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const applicationId = searchParams.get('applicationId');
  const actions = useContractActions();

  const [application, setApplication] = useState<LandlordApplicationDetail | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(() => {
    const start = todayISO();
    return {
      mode: 'upload',
      pdfFile: null,
      startDate: start,
      endDate: oneYearAheadISO(start),
      monthlyRent: '',
      deposit: '',
      paymentDay: '1',
      insuranceTier: 'NONE',
    };
  });

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Load application + property details
  useEffect(() => {
    if (!applicationId) {
      setLoadError('Falta el parámetro applicationId en la URL.');
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      try {
        // Si ya existe un contrato para esta app, redirigimos al detalle antes de seguir —
        // el backend rechaza con 400 "Contract already exists" si intentamos crear otro.
        const existingContract = await contractsApi.getByApplicationId(applicationId!);
        if (cancelled) return;
        if (existingContract) {
          toast.info('Esta aplicación ya tiene un contrato. Te llevamos al detalle.');
          router.replace(`/panel/inmobiliaria/contratos/${existingContract.id}`);
          return;
        }

        const app = await landlordApplicationsApi.getDetail(applicationId!);
        if (cancelled) return;
        setApplication(app);

        // Terminal: si el proceso ya se cerró (rechazo definitivo o cancelación), no se puede
        // crear otro contrato. El inquilino debe crear una nueva aplicación.
        if (app.status === 'CONTRACT_FAILED') {
          setLoadError(
            'El proceso de esta aplicación está cerrado (rechazo definitivo o cancelación previa). ' +
              'El inquilino debe crear una nueva aplicación para reintentar.'
          );
          return;
        }

        const appRent = app.property?.monthlyRent;
        if (appRent) {
          setForm((f) => ({ ...f, monthlyRent: String(appRent) }));
        }

        const propId = app.property?.id ?? '';
        if (propId) {
          const prop = await propertiesApi.getById(propId);
          if (cancelled) return;
          setProperty(prop);
          setForm((f) => ({
            ...f,
            monthlyRent: f.monthlyRent || String(prop.monthlyRent ?? ''),
            deposit: prop.deposit ? String(prop.deposit) : f.deposit,
          }));
        }
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'No se pudo cargar la aplicación');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [applicationId]);

  const updateForm = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  // PDF handlers
  const onPickFile = useCallback((file: File | null) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setSubmitError('Solo se permiten archivos PDF.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setSubmitError('El PDF no puede superar los 10 MB.');
      return;
    }
    setSubmitError(null);
    updateForm('pdfFile', file);
  }, [updateForm]);

  const onDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    onPickFile(e.dataTransfer.files[0] ?? null);
  }, [onPickFile]);

  // Validation
  const validation = useMemo(() => {
    const errors: Record<string, string> = {};
    if (form.mode === 'upload' && !form.pdfFile) {
      errors.pdfFile = 'Subí el PDF del contrato.';
    }
    if (!form.startDate) errors.startDate = 'Requerido';
    if (!form.endDate) errors.endDate = 'Requerido';
    if (form.startDate && form.endDate && form.endDate <= form.startDate) {
      errors.endDate = 'La fecha fin debe ser posterior a la de inicio';
    }
    const rent = Number(form.monthlyRent);
    if (!rent || rent < 100_000) errors.monthlyRent = 'Mínimo 100.000 COP';
    const dep = Number(form.deposit);
    if (isNaN(dep) || dep < 0) errors.deposit = 'Ingresá un valor válido';
    const day = Number(form.paymentDay);
    if (!day || day < 1 || day > 28) errors.paymentDay = 'Entre 1 y 28';
    return errors;
  }, [form]);

  const isValid = Object.keys(validation).length === 0;

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !applicationId) return;
    setSubmitError(null);

    try {
      let uploadedPdfPath: string | undefined;
      let contractOrigin: ContractOrigin | undefined;

      if (form.mode === 'upload' && form.pdfFile) {
        const uploaded = await actions.uploadPdf(form.pdfFile);
        if (!uploaded) {
          setSubmitError('No se pudo subir el PDF. Intentá de nuevo.');
          return;
        }
        uploadedPdfPath = uploaded.uploadedPdfPath;
        contractOrigin = 'UPLOADED_PDF';
      }

      const contract = await actions.create({
        applicationId,
        startDate: form.startDate,
        endDate: form.endDate,
        monthlyRent: Number(form.monthlyRent),
        deposit: Number(form.deposit),
        paymentDay: Number(form.paymentDay),
        insuranceTier: form.insuranceTier,
        contractOrigin,
        uploadedPdfPath,
      });

      if (!contract) {
        // Race condition: el contrato puede haberse creado desde otra tab o ronda previa.
        // Si el backend rechazó por duplicado, recuperamos el existente y redirigimos.
        const errMsg = actions.lastError?.message?.toLowerCase() ?? '';
        if (errMsg.includes('ya existe un contrato') || errMsg.includes('already exists')) {
          const existing = await contractsApi.getByApplicationId(applicationId);
          if (existing) {
            toast.info('Esta aplicación ya tiene un contrato. Te llevamos al detalle.');
            router.replace(`/panel/inmobiliaria/contratos/${existing.id}`);
            return;
          }
        }
        setSubmitError(
          actions.lastError?.message
            ?? 'No se pudo crear el contrato. Verificá los datos e intentá de nuevo.'
        );
        return;
      }

      router.push(`/panel/inmobiliaria/contratos/${contract.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al crear el contrato');
    }
  };

  // ─── UI ────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size="md" variant="muted" />
      </div>
    );
  }

  if (loadError || !application) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="rounded-xl border border-danger/30 bg-danger-soft/40 p-5 flex items-start gap-3">
          <WarningCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-danger">No se pudo cargar la aplicación</p>
            <p className="text-sm text-danger mt-1">{loadError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <Button
          onClick={() => router.back()}
          variant="link"
          hideArrow
          className="mb-3 h-auto gap-1 px-0 text-muted-foreground hover:text-foreground hover:no-underline"
        >
          <CaretLeft className="w-4 h-4" /> Volver
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Crear contrato</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Candidato: <span className="font-medium text-foreground">{application.tenantName}</span>
          {property && (
            <> · Propiedad: <span className="font-medium text-foreground">{property.title}</span></>
          )}
        </p>
      </div>

      {/* Último paso del recorrido del inquilino (11). Ver src/lib/recorrido/pasos.ts. */}
      <RecorridoHilo paso="contrato" className="mb-6" />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1) Contract origin */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Tipo de contrato</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ModeOption
              active={form.mode === 'upload'}
              onClick={() => updateForm('mode', 'upload')}
              title="Subir PDF propio"
              desc="Usá un contrato que tu inmobiliaria ya tenga preparado."
              icon={UploadSimple}
            />
            <ModeOption
              active={false}
              disabled
              title="Usar plantilla"
              desc="Plantillas prediseñadas de Leasefy."
              icon={FileText}
              badge="Próximamente"
            />
            <ModeOption
              active={false}
              disabled
              title="Generar con IA"
              desc="Generación automática según el perfil."
              icon={FileText}
              badge="Próximamente"
            />
          </div>
        </section>

        {/* 2) PDF upload */}
        {form.mode === 'upload' && (
          <section className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h2 className="text-base font-semibold text-foreground">PDF del contrato</h2>
            {form.pdfFile ? (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-emerald-600/30 bg-emerald-50/60 dark:bg-emerald-900/20">
                <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{form.pdfFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(form.pdfFile.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <IconButton
                  variant="ghost"
                  size="sm"
                  onClick={() => updateForm('pdfFile', null)}
                  aria-label="Quitar"
                  title="Quitar"
                  className="text-muted-foreground hover:text-danger"
                  icon={<X className="w-4 h-4" />}
                />
              </div>
            ) : (
              <label
                htmlFor="pdf-upload"
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors',
                  isDragging
                    ? 'border-primary/40 bg-primary-soft/40'
                    : 'border-border hover:border-primary/40 hover:bg-muted/50'
                )}
              >
                <UploadSimple className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm text-foreground">
                  <span className="font-medium">Hacé click para subir</span> o arrastrá un PDF aquí
                </p>
                <p className="text-xs text-muted-foreground">Máx 10 MB</p>
                <input
                  id="pdf-upload"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                  className="sr-only"
                />
              </label>
            )}
            {validation.pdfFile && (
              <p className="text-xs text-danger">{validation.pdfFile}</p>
            )}

            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted rounded-md p-3">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>
                El propietario va a firmar digitalmente el contrato en Leasefy, independientemente
                de si el PDF ya trae firma manuscrita. Esto garantiza la trazabilidad legal.
              </p>
            </div>
          </section>
        )}

        {/* 3) Dates + amounts */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Términos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Fecha de inicio" error={validation.startDate}>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => updateForm('startDate', e.target.value)}
              />
            </Field>
            <Field label="Fecha de fin" error={validation.endDate}>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => updateForm('endDate', e.target.value)}
              />
            </Field>
            <Field
              label="Canon mensual (COP)"
              error={validation.monthlyRent}
              hint={form.monthlyRent ? formatCurrency(Number(form.monthlyRent)) : 'Mínimo 100.000 COP'}
            >
              <Input
                type="number"
                inputMode="numeric"
                min={100_000}
                step={1000}
                value={form.monthlyRent}
                onChange={(e) => updateForm('monthlyRent', e.target.value)}
                className="tabular-nums"
              />
            </Field>
            <Field
              label="Depósito (COP)"
              error={validation.deposit}
              hint={form.deposit ? formatCurrency(Number(form.deposit)) : undefined}
            >
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                value={form.deposit}
                onChange={(e) => updateForm('deposit', e.target.value)}
                className="tabular-nums"
              />
            </Field>
            <Field label="Día de pago" error={validation.paymentDay} hint="Día del mes (1 a 28)">
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={28}
                value={form.paymentDay}
                onChange={(e) => updateForm('paymentDay', e.target.value)}
                className="tabular-nums"
              />
            </Field>
            <Field label="Seguro" hint="Opcional">
              <Select
                value={form.insuranceTier}
                onValueChange={(v) => updateForm('insuranceTier', v as InsuranceTier)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Sin seguro</SelectItem>
                  <SelectItem value="BASIC">Básico</SelectItem>
                  <SelectItem value="PREMIUM">Premium</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </section>

        {/* Errors + submit */}
        {submitError && (
          <div className="rounded-xl border border-danger/30 bg-danger-soft/40 p-4 flex items-start gap-2">
            <WarningCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
            <p className="text-sm text-danger">{submitError}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            hideArrow
            onClick={() => router.back()}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            hideArrow
            disabled={!isValid || actions.isSubmitting}
            className="gap-2"
          >
            {actions.isSubmitting ? (
              <Spinner size="sm" variant="current" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            Crear contrato
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

function ModeOption({
  active,
  disabled,
  onClick,
  title,
  desc,
  icon: Icon,
  badge,
}: {
  active: boolean;
  disabled?: boolean;
  onClick?: () => void;
  title: string;
  desc: string;
  icon: React.ElementType;
  badge?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        'relative text-left p-4 rounded-xl border transition-colors',
        active && 'border-primary/40 bg-primary-soft/40',
        !active && !disabled && 'border-border hover:border-primary/40 hover:bg-muted/50',
        disabled && 'border-border opacity-50 cursor-not-allowed'
      )}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={cn('w-4 h-4', active ? 'text-primary' : 'text-muted-foreground')} />
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      <p className="text-xs text-muted-foreground">{desc}</p>
      {badge && (
        <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-muted text-muted-foreground">
          {badge}
        </span>
      )}
    </button>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-foreground">{label}</label>
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

// ─── Export ──────────────────────────────────────────────────────────────────

export default function NuevoContratoPage() {
  return (
    <PageGuard module="contratos" action="create">
      <NuevoContratoContent />
    </PageGuard>
  );
}
