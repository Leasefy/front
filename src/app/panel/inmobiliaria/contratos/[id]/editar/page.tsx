'use client';

import { NO_SE_PRORRATEA, PREGUNTA_DEL_PRORRATEO, SI_SE_PRORRATEA } from '@/lib/contratos/modo-de-cobro'
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
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { MoneyInput } from '@/components/ui/money-input';
import { Spinner } from '@/components/ui/spinner';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';
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
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { BackButton } from '@/components/ui/back-button';
import { isPermissionError } from '@/lib/contratos/fallo-de-accion';
import { MENSAJES_DEL_CONTRATO, revisarTerminosDelContrato } from '@/lib/contratos/limites-del-contrato';
import { AREAS_DE_LA_DEUDA } from '@/lib/plata/con-centavos';
import { usePlataConCentavos } from '@/lib/plata/use-plata-con-centavos';
import {
  ariaDelCampoDelContrato,
  enfocarCampoDelContrato,
  idDelCampoDelContrato,
  motivoDelFalloDelContrato,
  repartirErroresDelContrato,
  type CampoDelContrato,
} from '@/lib/contratos/errores-del-contrato';
import { CampoDelTermino as Field } from '@/components/contract/CampoDelTermino';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { isoToInputDate } from './iso-to-input-date';
import { depositoAplica } from '@/lib/contratos/deposito-del-contrato';
import { errorDelArchivoDelContrato } from '@/lib/contratos/archivo-del-contrato';
import {
  MAX_DIAS_DE_PLAZO,
  diasDePlazoComoTexto,
  terminosDeCobro,
  validarDiasDePlazo,
} from '@/lib/contratos/terminos-de-cobro';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormState {
  pdfFile: File | null;
  startDate: string;
  endDate: string;
  monthlyRent: string;
  deposit: string;
  paymentDay: string;
  prorratearPrimerMes: boolean;
  /** Texto del input; vacío = hereda los días de plazo de la inmobiliaria. */
  diasDePlazo: string;
  insuranceTier: InsuranceTier;
}

// ─── Page ────────────────────────────────────────────────────────────────────

function EditarContratoContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const contractId = params.id;
  const { contract, isLoading, error, refetch } = useContract(contractId);
  const { rejections } = useContractRejections(contractId);
  const actions = useContractActions();

  const [form, setForm] = useState<FormState>({
    pdfFile: null,
    startDate: '',
    endDate: '',
    monthlyRent: '',
    deposit: '',
    paymentDay: '1',
    prorratearPrimerMes: false,
    diasDePlazo: '',
    insuranceTier: 'NONE',
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  /** 02-10-2026 · Lo que el back rechazó, en SU campo; se borra al tocarlo. */
  const [erroresDelServidor, setErroresDelServidor] = useState<
    Partial<Record<CampoDelContrato, string>>
  >({});
  const [isDragging, setIsDragging] = useState(false);
  // QA-CONT-95 C-09: el archivo rechazado se dice junto al campo (como al crear).
  const [errorDelPdf, setErrorDelPdf] = useState<string | null>(null);
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
      prorratearPrimerMes: contract.prorratearPrimerMes ?? false,
      diasDePlazo: diasDePlazoComoTexto(contract.diasDePlazo),
      insuranceTier: (contract.insuranceTier ?? 'NONE') as InsuranceTier,
    });
  }, [contract]);

  const updateForm = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErroresDelServidor((e) => {
      if (!(key in e)) return e;
      const resto = { ...e };
      delete resto[key as CampoDelContrato];
      return resto;
    });
  }, []);

  const onPickFile = useCallback((file: File | null) => {
    if (!file) return;
    const error = errorDelArchivoDelContrato(file);
    if (error) {
      setErrorDelPdf(error);
      return;
    }
    setErrorDelPdf(null);
    setSubmitError(null);
    updateForm('pdfFile', file);
  }, [updateForm]);

  const onDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    onPickFile(e.dataTransfer.files[0] ?? null);
  }, [onPickFile]);

  // «Centavos en todo» (C3-FRONT): el canon acepta centavos con las dos áreas
  // de la deuda prendidas; el depósito también desde C4 (`UpdateContractDto.deposit`
  // valida como al crear).
  const canonConCentavos = usePlataConCentavos(AREAS_DE_LA_DEUDA);

  const validation = useMemo(() => {
    // 02-10-2026: los MISMOS topes y frases del DTO del back
    // (`lib/contratos/limites-del-contrato`): el canon de once cifras se
    // ataja acá en vez de volver como un 500.
    const errors: Record<string, string> = {
      ...revisarTerminosDelContrato(
        {
          startDate: form.startDate,
          endDate: form.endDate,
          monthlyRent: form.monthlyRent,
          deposit: form.deposit,
          paymentDay: form.paymentDay,
        },
        { canonConCentavos, depositoConCentavos: canonConCentavos },
      ),
    };
    if (!form.startDate) errors.startDate = 'Requerido';
    if (!form.endDate) errors.endDate = 'Requerido';
    if (!form.monthlyRent.trim()) errors.monthlyRent = MENSAJES_DEL_CONTRATO.canonMinimo;
    if (!form.paymentDay.trim()) errors.paymentDay = MENSAJES_DEL_CONTRATO.diaDePago;
    const errorDePlazo = validarDiasDePlazo(form.diasDePlazo);
    if (errorDePlazo) errors.diasDePlazo = errorDePlazo;
    if (replacePdf && !form.pdfFile) {
      errors.pdfFile = 'Sube el PDF nuevo o desactiva el reemplazo.';
    }
    return errors;
  }, [form, replacePdf, canonConCentavos]);

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
          setSubmitError('No pudimos guardar el PDF nuevo. Vuelve a guardar en un momento.');
          return;
        }
        uploadedPdfPath = uploaded.uploadedPdfPath;
      }

      const dto: UpdateContractDto = {
        startDate: form.startDate,
        endDate: form.endDate,
        monthlyRent: Number(form.monthlyRent),
        paymentDay: Number(form.paymentDay),
        // `diasDePlazo: null` es un valor: vuelve a heredar los de la inmobiliaria.
        ...terminosDeCobro(form),
        insuranceTier: form.insuranceTier,
      };
      if (form.deposit) dto.deposit = Number(form.deposit);
      if (uploadedPdfPath) dto.uploadedPdfPath = uploadedPdfPath;

      // Si el back rechaza (400 con la lista de campos, 403, 409) el error se
      // relanza y lo lee el `catch` de abajo con su motivo, no un genérico.
      await actions.update(contractId, dto);

      /*
       * 🔴 Acá decía «Fírmalo para enviarlo al inquilino» y mandaba a
       * `/firmar`, que respondía «Este contrato no está pendiente de tu
       * firma»: un callejón sin salida en dos clics.
       *
       * El motivo está en el back (`contracts.service.ts` → `updateContract`):
       * CUALQUIER edición anula las DOS firmas y devuelve el contrato a
       * PENDING_TENANT_SIGNATURE, porque el inquilino tiene que volver a
       * firmar el documento corregido. Firmar no es el paso siguiente de
       * quien edita — es el del inquilino.
       *
       * Así que el mensaje dice lo que de verdad pasó (las firmas se cayeron)
       * y el destino es la ficha del contrato, que es donde se ve el estado y
       * se puede reenviar.
       */
      toast.success('Contrato actualizado', {
        description:
          'Al cambiar los términos se anularon las firmas: ahora le toca firmar al inquilino.',
      });
      router.push(`/panel/inmobiliaria/contratos/${contractId}`);
    } catch (err) {
      if (isPermissionError(err)) {
        setSubmitError('No tienes permiso para editar contratos.');
        return;
      }
      // 02-10-2026: un 400 con `campos` va a SU campo (y le da el foco); al
      // pie sólo lo que no tiene dónde ir, con la regla de oro.
      const reparto = repartirErroresDelContrato(err, {
        porDefecto: 'No se pudo actualizar el contrato.',
        accion: 'guardar los cambios del contrato',
      });
      if (reparto.orden.length > 0) {
        setErroresDelServidor(reparto.porCampo);
        setSubmitError(reparto.sueltos.length ? reparto.sueltos.join(' · ') : null);
        enfocarCampoDelContrato(reparto.orden[0]);
        return;
      }
      setSubmitError(
        motivoDelFalloDelContrato(err, {
          porDefecto: 'No se pudo actualizar el contrato.',
          accion: 'guardar los cambios del contrato',
        }),
      );
    }
  };

  /** El error de un campo: el del servidor gana sobre el del formulario. */
  const errorDe = (campo: CampoDelContrato): string | undefined =>
    erroresDelServidor[campo] ?? validation[campo];

  // ─── UI ────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      // Dentro del panel va el esqueleto, no el logo (Nico, 01-10: «el logo sólo en cargas de pantalla completa»).
      <EsqueletoDePagina variante="wizard" className="mx-auto max-w-3xl" />
    );
  }

    /*
   * «No existe» y «no se pudo cargar» eran la misma pantalla: `if (!x || error)`.
   * Le decía a alguien con mala conexión que este contrato había sido eliminado, y sin
   * ofrecer reintentar — porque sobre algo que no existe reintentar no tiene
   * sentido. Las dos señales ya estaban por separado; se juntaban a mano.
   */
  if (error) {
    return (
      <div className="space-y-6 p-6 lg:p-8">
        {/* 🔴 20-09 · El camino de vuelta va ARRIBA, no sólo dentro de la
            tarjeta: un fallo a pantalla completa sin encabezado no dice en qué
            parte del panel estás (Nico: «ni se entiende y no tiene navegación
            para recuperarse»). Ver `el-fallo-de-una-ficha-tiene-salida`. */}
        <BackButton href="/panel/inmobiliaria/contratos" label="Contratos" />
        <h1 className="text-h2 text-fg">Editar el contrato</h1>
        {/*
          🔴 C27 (auditoría 2026-09-13): sin `onReintentar`, un corte de red
          dejaba «Volver» como única salida — se perdía el camino y había que
          entrar de nuevo por el listado. `refetch` vuelve a pedir el contrato
          sin moverse de la pantalla.
        */}
        <FalloDeCarga
          error={error}
          queEs="este contrato"
          onReintentar={refetch}
          volverA={{ label: 'Contratos', href: '/panel/inmobiliaria/contratos' }}
        />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="rounded-lg border border-danger/30 bg-danger-soft/40 p-5 flex items-start gap-3">
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
        <div className="rounded-lg border border-warning/30 bg-warning-soft p-5 flex items-start gap-3">
          <WarningCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-warning">Este contrato no se puede editar</p>
            <p className="text-sm text-warning mt-1">
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
        <h1 className="text-h2 text-fg">Editar contrato</h1>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2 max-w-2xl">
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
        <div className="rounded-lg border border-warning/30 bg-warning-soft p-4 flex items-start gap-2">
          <Info className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-sm text-warning">
            Al guardar cambios, tu firma previa se invalida. Tendrás que volver a firmar el contrato.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* PDF replacement — only for UPLOADED_PDF contracts */}
        {isUploadedPdf && (
          <section className="rounded-lg border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">PDF del contrato</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Reemplaza el PDF sólo si cambiaste el documento. Si no, déjalo como está.
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
                <div className="flex items-center gap-3 p-3 rounded-lg border border-success/30 bg-success-soft">
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
                    'flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
                    isDragging
                      ? 'border-primary/40 bg-primary-soft/40'
                      : 'border-border hover:border-primary/40 hover:bg-muted/50'
                  )}
                >
                  <UploadSimple className="w-6 h-6 text-muted-foreground" />
                  <p className="text-sm text-foreground">
                    <span className="font-medium">Haz click para subir</span> o arrastra un PDF aquí
                  </p>
                  <p className="text-xs text-muted-foreground">Máx 10 MB</p>
                  <input
                    id="pdf-replace"
                    type="file"
                    accept="application/pdf"
                    aria-invalid={errorDelPdf ? true : undefined}
                    aria-describedby={`${idDelCampoDelContrato('pdfFile')}-error`}
                    onChange={(e) => {
                      onPickFile(e.target.files?.[0] ?? null);
                      e.target.value = '';
                    }}
                    className="sr-only"
                  />
                </label>
              )
            )}

            <ErrorDelCampo
              id={`${idDelCampoDelContrato('pdfFile')}-error`}
              mensaje={errorDelPdf ?? errorDe('pdfFile')}
              className="mt-0"
            />
          </section>
        )}

        {/* Terms */}
        <section className="rounded-lg border border-border bg-card p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Términos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field id={idDelCampoDelContrato('startDate')} label="Fecha de inicio" error={errorDe('startDate')}>
              <Input
                type="date"
                {...ariaDelCampoDelContrato('startDate', errorDe('startDate'))}
                value={form.startDate}
                onChange={(e) => updateForm('startDate', e.target.value)}
              />
            </Field>
            <Field id={idDelCampoDelContrato('endDate')} label="Fecha de fin" error={errorDe('endDate')}>
              <Input
                type="date"
                {...ariaDelCampoDelContrato('endDate', errorDe('endDate'))}
                value={form.endDate}
                onChange={(e) => updateForm('endDate', e.target.value)}
              />
            </Field>
            <Field
              id={idDelCampoDelContrato('monthlyRent')}
              label="Canon mensual (COP)"
              error={errorDe('monthlyRent')}
              hint="Mínimo $ 100.000"
            >
              <MoneyInput
                {...ariaDelCampoDelContrato('monthlyRent', errorDe('monthlyRent'))}
                areas={AREAS_DE_LA_DEUDA}
                value={form.monthlyRent}
                onChange={(crudo) => updateForm('monthlyRent', crudo)}
              />
            </Field>
            {/* Nico (03-10-2026): «Depósito: dejarlo sólo para comercial». Si
                aplica lo dice el back (`depositoDelContrato`); un back anterior,
                el uso del contrato. */}
            {contract && depositoAplica(contract) && (
              <Field
                id={idDelCampoDelContrato('deposit')}
                label="Depósito (COP)"
                error={errorDe('deposit')}
                hint="Opcional — dejar vacío si no aplica"
              >
                <MoneyInput
                  {...ariaDelCampoDelContrato('deposit', errorDe('deposit'))}
                  areas={AREAS_DE_LA_DEUDA}
                  value={form.deposit}
                  onChange={(crudo) => updateForm('deposit', crudo)}
                />
              </Field>
            )}
            <Field id={idDelCampoDelContrato('paymentDay')} label="Día de pago" error={errorDe('paymentDay')} hint={form.prorratearPrimerMes ? "Referencia del contrato (1 a 28). Prorrateado, el arriendo se genera el 1." : "Referencia del contrato (1 a 28). Fecha a fecha, vence el día en que empieza el período."}>
              <Input
                {...ariaDelCampoDelContrato('paymentDay', errorDe('paymentDay'))}
                type="number"
                inputMode="numeric"
                min={1}
                max={28}
                value={form.paymentDay}
                onChange={(e) => updateForm('paymentDay', e.target.value)}
                className="tabular-nums"
              />
            </Field>
            <Field
              id={idDelCampoDelContrato('diasDePlazo')}
              label="Días de plazo antes de la mora"
              error={errorDe('diasDePlazo')}
              hint="Vacío = los de la inmobiliaria. Días después del vencimiento en los que todavía no corre mora."
            >
              <Input
                {...ariaDelCampoDelContrato('diasDePlazo', errorDe('diasDePlazo'))}
                type="number"
                inputMode="numeric"
                min={0}
                max={MAX_DIAS_DE_PLAZO}
                step={1}
                placeholder="Los de la inmobiliaria"
                value={form.diasDePlazo}
                onChange={(e) => updateForm('diasDePlazo', e.target.value)}
                className="tabular-nums"
                data-testid="dias-de-plazo"
              />
            </Field>
            <Field id="contrato-seguro" label="Seguro" hint="Opcional">
              <Select
                value={form.insuranceTier}
                onValueChange={(v) => updateForm('insuranceTier', v as InsuranceTier)}
              >
                <SelectTrigger id="contrato-seguro">
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

          {/* Prorrateo del primer mes: fuera de la grilla porque es un switch con explicación, no un campo más. */}
          <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-surface-muted p-4">
            <div className="space-y-1">
              <label htmlFor="prorratear-primer-mes" className="block text-sm font-medium text-foreground">
                {PREGUNTA_DEL_PRORRATEO}
              </label>
              <p className="text-xs text-muted-foreground" data-testid="explicacion-del-prorrateo">
                {form.prorratearPrimerMes ? SI_SE_PRORRATEA : NO_SE_PRORRATEA}
              </p>
            </div>
            <Switch
              id="prorratear-primer-mes"
              data-testid="prorratear-primer-mes"
              checked={form.prorratearPrimerMes}
              onCheckedChange={(v) => updateForm('prorratearPrimerMes', v)}
            />
          </div>
        </section>

        {submitError && (
          <div className="rounded-lg border border-danger/30 bg-danger-soft/40 p-4 flex items-start gap-2">
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

// ─── Export ──────────────────────────────────────────────────────────────────

export default function EditarContratoPage() {
  return (
    <PageGuard module="contratos" action="edit">
      <EditarContratoContent />
    </PageGuard>
  );
}
