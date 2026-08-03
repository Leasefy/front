'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { IconButton, Checkbox } from '@leasefy/cadence';
import { PageGuard } from '@/components/auth/PageGuard';
import { RejectionsHistory } from '@/components/contract/RejectionsHistory';
import {
  useContract,
  useContractActions,
  useContractRejections,
} from '@/lib/hooks/useContracts';
import type { InsuranceTier, UpdateContractDto } from '@/lib/api/contracts.types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormState {
  pdfFile: File | null;
  startDate: string;
  endDate: string;
  monthlyRent: string;
  deposit: string;
  paymentDay: string;
  insuranceTier: InsuranceTier;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isoToInputDate(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

// ─── Page ────────────────────────────────────────────────────────────────────

function EditarContratoContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const contractId = params.id;
  const { contract, isLoading, error } = useContract(contractId);
  const { rejections } = useContractRejections(contractId);
  const actions = useContractActions();

  const [form, setForm] = useState<FormState>({
    pdfFile: null,
    startDate: '',
    endDate: '',
    monthlyRent: '',
    deposit: '',
    paymentDay: '1',
    insuranceTier: 'NONE',
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [replacePdf, setReplacePdf] = useState(false);

  const isUploadedPdf = contract?.contractOrigin === 'UPLOADED_PDF';
  const canEdit = contract && (
    contract.status === 'draft' ||
    contract.status === 'pending_landlord' ||
    contract.status === 'rejected_pending_modifications'
  );

  useEffect(() => {
    if (!contract) return;
    setForm({
      pdfFile: null,
      startDate: isoToInputDate(contract.startDate),
      endDate: isoToInputDate(contract.endDate),
      monthlyRent: String(contract.monthlyRent ?? ''),
      deposit: '',
      paymentDay: String(contract.paymentDueDay ?? '1'),
      insuranceTier: (contract.insuranceTier ?? 'NONE') as InsuranceTier,
    });
  }, [contract]);

  const updateForm = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

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

  const validation = useMemo(() => {
    const errors: Record<string, string> = {};
    if (!form.startDate) errors.startDate = 'Requerido';
    if (!form.endDate) errors.endDate = 'Requerido';
    if (form.startDate && form.endDate && form.endDate <= form.startDate) {
      errors.endDate = 'La fecha fin debe ser posterior a la de inicio';
    }
    const rent = Number(form.monthlyRent);
    if (!rent || rent < 100_000) errors.monthlyRent = 'Mínimo 100.000 COP';
    if (form.deposit) {
      const dep = Number(form.deposit);
      if (isNaN(dep) || dep < 0) errors.deposit = 'Ingresá un valor válido';
    }
    const day = Number(form.paymentDay);
    if (!day || day < 1 || day > 28) errors.paymentDay = 'Entre 1 y 28';
    if (replacePdf && !form.pdfFile) {
      errors.pdfFile = 'Subí el PDF nuevo o desactivá el reemplazo.';
    }
    return errors;
  }, [form, replacePdf]);

  const isValid = Object.keys(validation).length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !contractId || !contract) return;
    setSubmitError(null);

    try {
      let uploadedPdfPath: string | undefined;
      if (replacePdf && form.pdfFile) {
        const uploaded = await actions.uploadPdf(form.pdfFile);
        if (!uploaded) {
          setSubmitError('No se pudo subir el PDF. Intentá de nuevo.');
          return;
        }
        uploadedPdfPath = uploaded.uploadedPdfPath;
      }

      const dto: UpdateContractDto = {
        startDate: form.startDate,
        endDate: form.endDate,
        monthlyRent: Number(form.monthlyRent),
        paymentDay: Number(form.paymentDay),
        insuranceTier: form.insuranceTier,
      };
      if (form.deposit) dto.deposit = Number(form.deposit);
      if (uploadedPdfPath) dto.uploadedPdfPath = uploadedPdfPath;

      const updated = await actions.update(contractId, dto);
      if (!updated) {
        setSubmitError('No se pudo actualizar el contrato. Verificá los datos e intentá de nuevo.');
        return;
      }

      toast.success('Contrato actualizado. Firmalo para enviarlo al inquilino.');
      router.push(`/panel/inmobiliaria/contratos/${contractId}/firmar`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al actualizar el contrato');
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

  if (error || !contract) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="rounded-xl border border-danger/30 bg-danger-soft/40 p-5 flex items-start gap-3">
          <WarningCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-danger">No se pudo cargar el contrato</p>
            <p className="text-sm text-danger mt-1">{error ?? 'Contrato no encontrado'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="max-w-2xl mx-auto p-8 space-y-4">
        <Button
          onClick={() => router.back()}
          variant="link"
          hideArrow
          className="h-auto gap-1 px-0 text-muted-foreground hover:text-foreground hover:no-underline"
        >
          <CaretLeft className="w-4 h-4" /> Volver
        </Button>
        <div className="rounded-xl border border-amber-600/30 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-900/15 p-5 flex items-start gap-3">
          <WarningCircle className="w-5 h-5 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-700 dark:text-amber-400">Este contrato no se puede editar</p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
              Solo se permite editar contratos en borrador, pendientes de firma del propietario,
              o cuando el inquilino solicitó modificaciones.
            </p>
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
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Editar contrato</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Inquilino: <span className="font-medium text-foreground">{contract.tenantName}</span> ·
          Propiedad: <span className="font-medium text-foreground">{contract.propertyAddress}</span>
        </p>
      </div>

      {/* Rejection context — show latest tenant requests when editing after rejection */}
      {rejections.length > 0 && contract.status === 'rejected_pending_modifications' && (
        <RejectionsHistory rejections={rejections} />
      )}

      {/* Warning about signature invalidation */}
      {contract.landlordSignature && (
        <div className="rounded-xl border border-amber-600/30 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-900/15 p-4 flex items-start gap-2">
          <Info className="w-5 h-5 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Al guardar cambios, tu firma previa se invalida. Tendrás que volver a firmar el contrato.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* PDF replacement — only for UPLOADED_PDF contracts */}
        {isUploadedPdf && (
          <section className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">PDF del contrato</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Reemplazá el PDF sólo si cambiaste el documento. Sino dejalo como está.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={replacePdf}
                  onCheckedChange={(c) => {
                    const checked = c === true;
                    setReplacePdf(checked);
                    if (!checked) updateForm('pdfFile', null);
                  }}
                />
                <span className="text-xs font-medium text-foreground">Reemplazar PDF</span>
              </label>
            </div>

            {replacePdf && (
              form.pdfFile ? (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-emerald-600/30 bg-emerald-50/60 dark:bg-emerald-900/20">
                  <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{form.pdfFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(form.pdfFile.size / 1024).toFixed(0)} KB</p>
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
                  htmlFor="pdf-replace"
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onDrop}
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors',
                    isDragging
                      ? 'border-primary/40 bg-primary-soft/40'
                      : 'border-border hover:border-primary/40 hover:bg-muted/50'
                  )}
                >
                  <UploadSimple className="w-6 h-6 text-muted-foreground" />
                  <p className="text-sm text-foreground">
                    <span className="font-medium">Hacé click para subir</span> o arrastrá un PDF aquí
                  </p>
                  <p className="text-xs text-muted-foreground">Máx 10 MB</p>
                  <input
                    id="pdf-replace"
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                    className="sr-only"
                  />
                </label>
              )
            )}

            {validation.pdfFile && (
              <p className="text-xs text-danger">{validation.pdfFile}</p>
            )}
          </section>
        )}

        {/* Terms */}
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
              hint={form.deposit ? formatCurrency(Number(form.deposit)) : 'Opcional — dejar vacío si no aplica'}
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
            {actions.isSubmitting ? <Spinner size="sm" variant="current" /> : <CheckCircle className="w-4 h-4" />}
            Guardar y firmar
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

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

export default function EditarContratoPage() {
  return (
    <PageGuard module="contratos" action="edit">
      <EditarContratoContent />
    </PageGuard>
  );
}
