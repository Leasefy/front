'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Sparkle,
  UploadSimple,
  Receipt,
  ArrowClockwise,
  WarningCircle,
  PencilSimple,
  FilePdf,
  FileImage,
  X,
  Plus,
  ArrowSquareOut,
  UserPlus,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MoneyInput } from '@/components/ui/money-input';
import { Combobox } from '@/components/ui/combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertaAccionable } from '@/components/ui/alerta-accionable';
import { apApi, ApUnavailableError, mediaTypeDeFactura, validarArchivosFactura } from '@/lib/api/ap.service';
import { ApiError } from '@/lib/api/client';
import { FACTURA_MAX_ARCHIVOS, FACTURA_PDF_MEDIA_TYPE } from '@/lib/api/ap.types';
import type {
  ApBill,
  ApCostCenter,
  ApVendor,
  ApVendorCandidato,
  FacturaConflicto,
  FacturaDocumentoDetectado,
  FacturaExtraida,
  FacturaItem,
} from '@/lib/api/ap.types';

interface FacturaProveedorIACaptureProps {
  agencyId: string;
  /** La factura ya quedó registrada (pendiente de aprobación). */
  onRegistrada: (bill: ApBill) => void;
  onCancel: () => void;
}

type Step = 'upload' | 'extracting' | 'review' | 'error';

/** Lo que el `<input type="file">` deja elegir: fotos y PDF. */
const ACCEPT = ['image/*', FACTURA_PDF_MEDIA_TYPE, '.pdf'].join(',');

/** Estado del formulario de la factura. Montos como dígitos pelados (MoneyInput). */
interface FormFactura {
  vendorId: string;
  invoiceNumber: string;
  /** YYYY-MM-DD */
  issuedAt: string;
  /** YYYY-MM-DD */
  dueDate: string;
  subtotal: string;
  iva: string;
  total: string;
  concepto: string;
  costCenterCode: string;
}

const FORM_VACIO: FormFactura = {
  vendorId: '',
  invoiceNumber: '',
  issuedAt: '',
  dueDate: '',
  subtotal: '',
  iva: '',
  total: '',
  concepto: '',
  costCenterCode: '',
};

function tamano(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function digitos(n: number | null | undefined): string {
  return n === null || n === undefined || !Number.isFinite(n) ? '' : String(Math.round(n));
}

/** `2026-09-01T00:00:00.000Z` o `2026-09-01` → `2026-09-01`; cualquier otra cosa → ''. */
function aDia(iso: string | null | undefined): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : '';
}

/**
 * Día → ISO al mediodía UTC. Medianoche UTC se vería como el día anterior en
 * Colombia (UTC-5) al formatear la fecha en el detalle.
 */
function aIsoMediodia(dia: string): string {
  return new Date(`${dia}T12:00:00.000Z`).toISOString();
}

function IconoDeArchivo({ file }: { file: File }) {
  const cls = 'w-4 h-4 text-primary flex-shrink-0';
  return mediaTypeDeFactura(file) === FACTURA_PDF_MEDIA_TYPE ? <FilePdf className={cls} /> : <FileImage className={cls} />;
}

function mensajeDeError(err: unknown, generico: string): string {
  if (err instanceof ApiError || err instanceof Error) return err.message || generico;
  return generico;
}

/**
 * Captura de una factura de proveedor por IA: subir la foto/PDF, la IA la
 * lee (proveedor, número, montos, fechas), se empareja el proveedor y la
 * persona revisa un formulario prellenado antes de registrarla en cuentas
 * por pagar (`POST /ap/bills`, queda pendiente de aprobación). «Cargar a
 * mano» salta al mismo formulario vacío. Misma máquina que TerceroIACapture.
 */
export function FacturaProveedorIACapture({ agencyId, onRegistrada, onCancel }: FacturaProveedorIACaptureProps) {
  const { t } = useI18n();
  const k = useCallback((s: string) => `inmobiliaria.tesoreria.facturas.${s}`, []);

  const [step, setStep] = useState<Step>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [arrastrando, setArrastrando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Lo que devolvió la IA.
  const [extracted, setExtracted] = useState<FacturaExtraida | null>(null);
  const [items, setItems] = useState<FacturaItem[]>([]);
  const [conflictos, setConflictos] = useState<FacturaConflicto[]>([]);
  const [detectados, setDetectados] = useState<FacturaDocumentoDetectado[]>([]);
  const [confidence, setConfidence] = useState(0);
  const [candidatos, setCandidatos] = useState<ApVendorCandidato[]>([]);
  const [adjuntoUrl, setAdjuntoUrl] = useState<string | null>(null);

  // Catálogos de la agencia.
  const [vendors, setVendors] = useState<ApVendor[] | null>(null);
  const [costCenters, setCostCenters] = useState<ApCostCenter[] | null>(null);
  const [catalogosError, setCatalogosError] = useState<string | null>(null);

  // Formulario.
  const [form, setForm] = useState<FormFactura>(FORM_VACIO);
  const [nitNuevo, setNitNuevo] = useState('');
  const [creandoProveedor, setCreandoProveedor] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [erroresForm, setErroresForm] = useState<Partial<Record<keyof FormFactura, string>>>({});

  const set = <K extends keyof FormFactura>(campo: K, valor: FormFactura[K]) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  // Sólo depende de la agencia: si dependiera de `t` (que puede cambiar por
  // render) el efecto recargaría los catálogos y pisaría un proveedor recién
  // creado. `''` = falló sin mensaje → se muestra el genérico al pintar.
  const cargarCatalogos = useCallback(async () => {
    setCatalogosError(null);
    try {
      const [v, cc] = await Promise.all([apApi.listVendors(agencyId), apApi.listCostCenters(agencyId)]);
      setVendors(v);
      setCostCenters(cc);
    } catch (err) {
      setCatalogosError(mensajeDeError(err, ''));
    }
  }, [agencyId]);

  useEffect(() => {
    void cargarCatalogos();
  }, [cargarCatalogos]);

  // Miniatura del primer archivo si es imagen (URL local, se libera al cambiar).
  const primeraImagen = useMemo(
    () => files.find((f) => mediaTypeDeFactura(f) !== FACTURA_PDF_MEDIA_TYPE) ?? null,
    [files],
  );
  const [miniaturaUrl, setMiniaturaUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!primeraImagen || typeof URL.createObjectURL !== 'function') {
      setMiniaturaUrl(null);
      return;
    }
    const url = URL.createObjectURL(primeraImagen);
    setMiniaturaUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [primeraImagen]);

  // ── Archivos ────────────────────────────────────────────────────────────

  const agregar = (nuevos: File[]) => {
    if (nuevos.length === 0) return;
    const vistos = new Set(files.map((f) => `${f.name}:${f.size}`));
    const distintos = nuevos.filter((f) => !vistos.has(`${f.name}:${f.size}`));
    const candidatosArchivos = [...files, ...distintos];
    const error = validarArchivosFactura(candidatosArchivos);
    if (error) {
      toast.error(t(k(error), { max: String(FACTURA_MAX_ARCHIVOS) }));
      return;
    }
    setFiles(candidatosArchivos);
  };

  const quitar = (indice: number) => setFiles((prev) => prev.filter((_, i) => i !== indice));

  // ── Extraer ─────────────────────────────────────────────────────────────

  const handleExtract = async () => {
    if (files.length === 0) return;
    setStep('extracting');
    setErrorMsg(null);
    try {
      const res = await apApi.extractBill(agencyId, files);
      const { factura, sugerencia, proveedor } = res;
      setExtracted(factura);
      setItems(res.items);
      setConflictos(res.conflictos);
      setDetectados(res.documentos);
      setConfidence(res.confidence);
      setCandidatos(proveedor.match ? [] : proveedor.candidatos);
      setAdjuntoUrl(res.adjuntoUrl);
      setNitNuevo(factura.proveedorNit ?? '');
      setForm({
        vendorId: sugerencia.vendorId ?? '',
        invoiceNumber: sugerencia.invoiceNumber ?? '',
        issuedAt: aDia(sugerencia.issuedAt),
        dueDate: aDia(sugerencia.dueDate),
        subtotal: digitos(sugerencia.baseGravableCop),
        iva: digitos(sugerencia.ivaCop),
        total: digitos(sugerencia.amountCop),
        concepto: factura.concepto ?? '',
        costCenterCode: sugerencia.costCenterCode ?? '',
      });
      setErroresForm({});
      setStep('review');
    } catch (err) {
      if (err instanceof ApUnavailableError) {
        setErrorMsg(t(k('errorUnavailable')));
      } else if (err instanceof Error && /^error[A-Z]/.test(err.message)) {
        // Clave i18n de validarArchivosFactura.
        setErrorMsg(t(k(err.message), { max: String(FACTURA_MAX_ARCHIVOS) }));
      } else {
        setErrorMsg(mensajeDeError(err, t(k('errorGeneric'))));
      }
      setStep('error');
    }
  };

  const resetToUpload = () => {
    setStep('upload');
    setExtracted(null);
    setItems([]);
    setConflictos([]);
    setDetectados([]);
    setCandidatos([]);
    setAdjuntoUrl(null);
    setErrorMsg(null);
  };

  const fillManually = () => {
    setExtracted(null);
    setItems([]);
    setConflictos([]);
    setDetectados([]);
    setCandidatos([]);
    setConfidence(0);
    setForm(FORM_VACIO);
    setErroresForm({});
    setStep('review');
  };

  /** Un valor de un conflicto pasa a ser el del formulario (o de lo leído). */
  const usarValor = (campo: FacturaConflicto['campo'], valor: string) => {
    const soloDigitos = valor.replace(/\D/g, '');
    switch (campo) {
      case 'numeroFactura':
        set('invoiceNumber', valor);
        break;
      case 'totalCop':
        set('total', soloDigitos);
        break;
      case 'subtotalCop':
        set('subtotal', soloDigitos);
        break;
      case 'ivaCop':
        set('iva', soloDigitos);
        break;
      case 'fechaEmision':
        set('issuedAt', aDia(valor));
        break;
      case 'fechaVencimiento':
        set('dueDate', aDia(valor));
        break;
      case 'concepto':
        set('concepto', valor);
        break;
      case 'proveedorNit':
        setNitNuevo(soloDigitos);
        setExtracted((prev) => (prev ? { ...prev, proveedorNit: soloDigitos } : prev));
        break;
      default:
        setExtracted((prev) => (prev ? { ...prev, [campo]: valor } : prev));
    }
  };

  // ── Proveedor ───────────────────────────────────────────────────────────

  const vendorOptions = useMemo(
    () => (vendors ?? []).map((v) => ({ value: v.id, label: `${v.name} · ${v.documentNumber}` })),
    [vendors],
  );

  const crearProveedor = async () => {
    if (!extracted?.proveedorNombre) return;
    const nit = nitNuevo.replace(/\D/g, '');
    if (nit.length < 5) return;
    setCreandoProveedor(true);
    try {
      const creado = await apApi.createVendor(agencyId, {
        name: extracted.proveedorNombre,
        documentNumber: extracted.proveedorDv ? `${nit}-${extracted.proveedorDv}` : nit,
        ...(extracted.proveedorCorreo ? { email: extracted.proveedorCorreo } : {}),
        ...(extracted.proveedorTelefono ? { phone: extracted.proveedorTelefono } : {}),
      });
      setVendors((prev) => [creado, ...(prev ?? [])]);
      set('vendorId', creado.id);
      setCandidatos([]);
      toast.success(t(k('proveedorCreado')));
    } catch (err) {
      toast.error(mensajeDeError(err, t(k('errorGeneric'))));
    } finally {
      setCreandoProveedor(false);
    }
  };

  // ── Registrar ───────────────────────────────────────────────────────────

  const validar = (): boolean => {
    const errores: Partial<Record<keyof FormFactura, string>> = {};
    if (!form.vendorId) errores.vendorId = t(k('errorProveedor'));
    if (!form.invoiceNumber.trim()) errores.invoiceNumber = t(k('errorNumero'));
    if (!form.total || Number(form.total) <= 0) errores.total = t(k('errorTotal'));
    if (!form.issuedAt) errores.issuedAt = t(k('errorEmision'));
    if (!form.dueDate) errores.dueDate = t(k('errorVencimiento'));
    if (!form.costCenterCode) errores.costCenterCode = t(k('errorCentro'));
    setErroresForm(errores);
    return Object.keys(errores).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validar()) return;
    setGuardando(true);
    try {
      const bill = await apApi.createBill(agencyId, {
        vendorId: form.vendorId,
        invoiceNumber: form.invoiceNumber.trim(),
        amountCop: Number(form.total),
        ...(form.subtotal ? { baseGravableCop: Number(form.subtotal) } : {}),
        ...(form.iva ? { ivaCop: Number(form.iva) } : {}),
        costCenterCode: form.costCenterCode,
        issuedAt: aIsoMediodia(form.issuedAt),
        dueDate: aIsoMediodia(form.dueDate),
        ...(adjuntoUrl ? { adjuntoUrl } : {}),
        ...(form.concepto.trim() ? { concepto: form.concepto.trim() } : {}),
      });
      toast.success(t(k('successTitle')), { description: t(k('successDesc')) });
      onRegistrada(bill);
    } catch (err) {
      toast.error(mensajeDeError(err, t(k('errorGeneric'))));
    } finally {
      setGuardando(false);
    }
  };

  const confidencePct = Math.round(confidence * 100);

  // ── Review ──────────────────────────────────────────────────────────────
  if (step === 'review') {
    const detectadosLegibles = detectados
      .map((d) => (t(k(`tipos.${d.tipo}`)) === k(`tipos.${d.tipo}`) ? d.tipo : t(k(`tipos.${d.tipo}`))))
      .filter((v, i, arr) => arr.indexOf(v) === i);
    const proveedorSinMatch = extracted?.proveedorNombre && !form.vendorId;
    const nitParaCrear = nitNuevo.replace(/\D/g, '');

    return (
      <form onSubmit={handleSubmit} className="space-y-5" noValidate data-testid="factura-form">
        {extracted ? (
          <div className="rounded-xl bg-warning-soft border border-warning/30 p-3 flex items-start gap-2.5">
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
              {extracted.inmuebleReferencia ? (
                <p className="text-xs text-warning/90 mt-0.5">
                  {t(k('inmuebleLeido'), { inmueble: extracted.inmuebleReferencia })}
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t(k('manualNote'))}</p>
        )}

        {catalogosError !== null ? (
          <AlertaAccionable
            severidad="danger"
            titulo={catalogosError || t(k('errorGeneric'))}
            accion={{ label: t(k('retry')), onClick: () => void cargarCatalogos() }}
          />
        ) : null}

        {extracted && conflictos.length > 0 ? (
          <div className="rounded-xl border border-danger/30 bg-danger-soft p-3 space-y-2" data-testid="conflictos">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            {/* Proveedor */}
            <div className="space-y-1.5">
              <Label htmlFor="factura-proveedor">{t(k('proveedorLabel'))}</Label>
              {vendors === null && catalogosError === null ? (
                <p className="text-xs text-muted-foreground inline-flex items-center gap-2">
                  <Spinner size="sm" variant="muted" /> {t(k('proveedorCargando'))}
                </p>
              ) : (
                <Combobox
                  value={form.vendorId || undefined}
                  onChange={(v) => set('vendorId', v ?? '')}
                  options={vendorOptions}
                  placeholder={t(k('proveedorPlaceholder'))}
                  searchPlaceholder={t(k('proveedorBuscar'))}
                  invalid={Boolean(erroresForm.vendorId)}
                  className="w-full"
                />
              )}
              {erroresForm.vendorId ? <p className="text-xs text-danger">{erroresForm.vendorId}</p> : null}

              {proveedorSinMatch ? (
                <div
                  className="rounded-xl border border-primary/30 bg-primary-soft p-3 space-y-2"
                  data-testid="proveedor-nuevo"
                >
                  <p className="text-xs font-medium text-primary inline-flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4" weight="bold" />
                    {extracted?.proveedorNit
                      ? t(k('proveedorNuevo'), {
                          nombre: extracted.proveedorNombre ?? '',
                          nit: extracted.proveedorDv
                            ? `${extracted.proveedorNit}-${extracted.proveedorDv}`
                            : extracted.proveedorNit,
                        })
                      : t(k('proveedorNuevoSinNit'), { nombre: extracted?.proveedorNombre ?? '' })}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      aria-label={t(k('campos.proveedorNit'))}
                      value={nitNuevo}
                      onChange={(e) => setNitNuevo(e.target.value.replace(/\D/g, ''))}
                      inputMode="numeric"
                      placeholder="NIT"
                      className="h-9 w-44"
                      data-testid="proveedor-nuevo-nit"
                    />
                    <Button
                      type="button"
                      size="sm"
                      hideArrow
                      isLoading={creandoProveedor}
                      disabled={nitParaCrear.length < 5}
                      onClick={() => void crearProveedor()}
                      data-testid="proveedor-crear"
                    >
                      {t(k('proveedorCrear'))}
                    </Button>
                  </div>
                  {candidatos.length > 0 ? (
                    <div className="space-y-1" data-testid="proveedor-candidatos">
                      <p className="text-xs text-muted-foreground">{t(k('proveedorCandidatos'))}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {candidatos.map((c) => (
                          <button
                            key={c.vendorId}
                            type="button"
                            onClick={() => {
                              set('vendorId', c.vendorId);
                              setCandidatos([]);
                            }}
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-foreground hover:border-primary hover:text-primary"
                            data-testid={`candidato-${c.vendorId}`}
                          >
                            <span className="font-medium">{c.name}</span>
                            <span className="text-muted-foreground">· {c.documentNumber}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Número + fechas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="factura-numero">{t(k('numeroLabel'))}</Label>
                <Input
                  id="factura-numero"
                  value={form.invoiceNumber}
                  onChange={(e) => set('invoiceNumber', e.target.value)}
                  aria-invalid={Boolean(erroresForm.invoiceNumber)}
                  data-testid="factura-numero"
                />
                {erroresForm.invoiceNumber ? <p className="text-xs text-danger">{erroresForm.invoiceNumber}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="factura-emision">{t(k('emisionLabel'))}</Label>
                <Input
                  id="factura-emision"
                  type="date"
                  value={form.issuedAt}
                  onChange={(e) => set('issuedAt', e.target.value)}
                  aria-invalid={Boolean(erroresForm.issuedAt)}
                  data-testid="factura-emision"
                />
                {erroresForm.issuedAt ? <p className="text-xs text-danger">{erroresForm.issuedAt}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="factura-vencimiento">{t(k('vencimientoLabel'))}</Label>
                <Input
                  id="factura-vencimiento"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => set('dueDate', e.target.value)}
                  aria-invalid={Boolean(erroresForm.dueDate)}
                  data-testid="factura-vencimiento"
                />
                {erroresForm.dueDate ? (
                  <p className="text-xs text-danger">{erroresForm.dueDate}</p>
                ) : extracted && !form.dueDate ? (
                  <p className="text-xs text-muted-foreground">{t(k('vencimientoHint'))}</p>
                ) : null}
              </div>
            </div>

            {/* Montos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="factura-subtotal">{t(k('subtotalLabel'))}</Label>
                <MoneyInput
                  id="factura-subtotal"
                  value={form.subtotal}
                  onChange={(v) => set('subtotal', v)}
                  data-testid="factura-subtotal"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="factura-iva">{t(k('ivaLabel'))}</Label>
                <MoneyInput id="factura-iva" value={form.iva} onChange={(v) => set('iva', v)} data-testid="factura-iva" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="factura-total">{t(k('totalLabel'))}</Label>
                <MoneyInput
                  id="factura-total"
                  value={form.total}
                  onChange={(v) => set('total', v)}
                  aria-invalid={Boolean(erroresForm.total)}
                  data-testid="factura-total"
                />
                {erroresForm.total ? <p className="text-xs text-danger">{erroresForm.total}</p> : null}
              </div>
            </div>

            {/* Concepto */}
            <div className="space-y-1.5">
              <Label htmlFor="factura-concepto">{t(k('conceptoLabel'))}</Label>
              <Textarea
                id="factura-concepto"
                value={form.concepto}
                onChange={(e) => set('concepto', e.target.value)}
                placeholder={t(k('conceptoPlaceholder'))}
                rows={2}
                maxLength={500}
                data-testid="factura-concepto"
              />
            </div>

            {/* Centro de costo */}
            <div className="space-y-1.5">
              <Label htmlFor="factura-centro">{t(k('centroLabel'))}</Label>
              <Select value={form.costCenterCode || undefined} onValueChange={(v) => set('costCenterCode', v)}>
                <SelectTrigger id="factura-centro" aria-invalid={Boolean(erroresForm.costCenterCode)} data-testid="factura-centro">
                  <SelectValue placeholder={t(k('centroPlaceholder'))} />
                </SelectTrigger>
                <SelectContent>
                  {(costCenters ?? []).map((cc) => (
                    <SelectItem key={cc.code} value={cc.code}>
                      {cc.code} · {cc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {erroresForm.costCenterCode ? <p className="text-xs text-danger">{erroresForm.costCenterCode}</p> : null}
            </div>
          </div>

          {/* Adjunto + ítems */}
          <aside className="space-y-4">
            {files.length > 0 ? (
              <div className="rounded-xl border border-border bg-card p-3 space-y-2" data-testid="factura-adjunto">
                <p className="text-xs font-semibold text-foreground">{t(k('adjuntoLabel'))}</p>
                {miniaturaUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL local de un File, no una imagen remota optimizable
                  <img
                    src={miniaturaUrl}
                    alt={primeraImagen?.name ?? ''}
                    className="w-full max-h-64 object-contain rounded-md border border-border bg-muted/30"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <FilePdf className="w-6 h-6 text-primary" />
                    <span className="truncate" title={files[0].name}>
                      {files[0].name}
                    </span>
                  </div>
                )}
                {files.length > 1 ? (
                  <p className="text-xs text-muted-foreground">+{files.length - 1}</p>
                ) : null}
                {adjuntoUrl ? (
                  <a
                    href={adjuntoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    data-testid="factura-adjunto-ver"
                  >
                    <ArrowSquareOut className="w-3.5 h-3.5" />
                    {t(k('adjuntoVer'))}
                  </a>
                ) : extracted ? (
                  <p className="text-xs text-muted-foreground" data-testid="factura-adjunto-no-guardado">
                    {t(k('adjuntoNoGuardado'))}
                  </p>
                ) : null}
              </div>
            ) : null}

            {items.length > 0 ? (
              <div className="rounded-xl border border-border bg-card p-3 space-y-1.5" data-testid="factura-items">
                <p className="text-xs font-semibold text-foreground">{t(k('itemsLabel'))}</p>
                <ul className="space-y-1">
                  {items.map((it, i) => (
                    <li key={`${it.descripcion}:${i}`} className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="text-foreground min-w-0 truncate" title={it.descripcion}>
                        {it.cantidad !== null && it.cantidad !== 1 ? `${it.cantidad} × ` : ''}
                        {it.descripcion}
                      </span>
                      {it.valorCop !== null ? (
                        <span className="font-mono tabular-nums text-muted-foreground flex-shrink-0">
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(it.valorCop)}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1 border-t border-border">
          <Button type="button" variant="secondary" hideArrow onClick={onCancel} disabled={guardando}>
            {t(k('cancel'))}
          </Button>
          <Button type="submit" hideArrow isLoading={guardando} data-testid="factura-registrar">
            <Receipt className="w-4 h-4" weight="bold" />
            {guardando ? t(k('submitting')) : t(k('submit'))}
          </Button>
        </div>
      </form>
    );
  }

  // ── Extracting ──────────────────────────────────────────────────────────
  if (step === 'extracting') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
        <Spinner size="md" variant="muted" />
        <p className="text-sm text-muted-foreground">{t(k('extractingN'), { n: String(files.length) })}</p>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────
  if (step === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-10 px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-danger-soft flex items-center justify-center">
          <WarningCircle className="w-7 h-7 text-danger" />
        </div>
        <div className="space-y-1">
          <h3 className="text-h4 font-semibold text-foreground">{t(k('errorTitle'))}</h3>
          <p className="text-body-sm text-muted-foreground max-w-sm" data-testid="factura-error">
            {errorMsg}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Button variant="secondary" size="sm" hideArrow onClick={resetToUpload} data-testid="factura-reintentar">
            <ArrowClockwise className="w-4 h-4" />
            {t(k('retry'))}
          </Button>
          <Button size="sm" hideArrow onClick={fillManually}>
            <PencilSimple className="w-4 h-4" weight="bold" />
            {t(k('manual'))}
          </Button>
        </div>
      </div>
    );
  }

  // ── Upload (default) ────────────────────────────────────────────────────
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
        data-testid="factura-ia-input"
        onChange={(e) => {
          agregar(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />

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
        className={`w-full rounded-xl border-2 border-dashed bg-muted/30 hover:bg-muted/50 transition-colors p-6 flex flex-col items-center justify-center gap-2 text-center ${
          arrastrando ? 'border-primary bg-primary-soft/40' : 'border-border hover:border-foreground/20'
        }`}
        data-testid="factura-ia-dropzone"
      >
        <div className="w-12 h-12 rounded-xl bg-primary-soft flex items-center justify-center mb-1">
          <Receipt className="w-6 h-6 text-primary" />
        </div>
        <p className="text-body-sm font-medium text-foreground">
          {files.length === 0 ? t(k('uploadTitle')) : t(k('uploadMore'))}
        </p>
        <p className="text-caption text-muted-foreground inline-flex items-center gap-1">
          <UploadSimple className="w-3.5 h-3.5" />
          {t(k('uploadHint'), { max: String(FACTURA_MAX_ARCHIVOS) })}
        </p>
      </button>

      {files.length > 0 ? (
        <ul className="divide-y divide-border rounded-xl border border-border" data-testid="factura-ia-archivos">
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

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
        <Button variant="ghost" hideArrow onClick={fillManually} data-testid="factura-ia-manual">
          <PencilSimple className="w-4 h-4" weight="bold" />
          {t(k('manual'))}
        </Button>
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" hideArrow onClick={onCancel}>
            {t(k('cancel'))}
          </Button>
          <Button hideArrow onClick={() => void handleExtract()} disabled={files.length === 0} data-testid="factura-ia-extraer">
            <Sparkle className="w-4 h-4" weight="fill" />
            {files.length > 1 ? t(k('extractN'), { n: String(files.length) }) : t(k('extract'))}
          </Button>
        </div>
      </div>
    </div>
  );
}
