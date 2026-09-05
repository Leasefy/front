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
  Scales,
  Sparkle,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { MoneyInput } from '@/components/ui/money-input';
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
import { RespaldoDelArriendo } from '@/components/inmobiliaria/RespaldoDelArriendo';
import {
  PARTES_VACIAS,
  PartesDelContratoManual,
  validarPartes,
  type PartesManuales,
} from '@/components/contratos/PartesDelContratoManual';
import { useContractActions } from '@/lib/hooks/useContracts';
import { contractsApi } from '@/lib/api/contracts.service';
import { landlordApplicationsApi } from '@/lib/api/applications.service';
import { propertiesApi } from '@/lib/api/properties.service';
import type { LandlordApplicationDetail } from '@/lib/api/applications.types';
import type { Property } from '@/lib/types/property';
import type { InsuranceTier, ContractOrigin } from '@/lib/api/contracts.types';
import {
  validarRespaldo,
  comoClausula,
  type Respaldo,
} from '@/lib/inmobiliaria/respaldo';
import type { EvaluationResult } from '@/lib/api/applications.types';
import {
  MAX_DIAS_DE_PLAZO,
  terminosDeCobro,
  validarDiasDePlazo,
} from '@/lib/contratos/terminos-de-cobro';
import { ArmarContratoDesdePlantilla } from '@/components/contratos/plantilla/ArmarContratoDesdePlantilla';
import { useContratoDesdePlantilla } from '@/lib/contratos/useContratoDesdePlantilla';
import type {
  BorradorDeContrato,
  UsoDelInmueble,
} from '@/lib/api/contratos-plantilla.service';

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
  /** Prorratear el primer cobro por los días realmente ocupados. */
  prorratearPrimerMes: boolean;
  /** Texto del input; vacío = hereda los días de plazo de la inmobiliaria. */
  diasDePlazo: string;
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
  /*
   * `?modo=manual`: sin postulación. El inmueble consignado y el inquilino se
   * eligen acá mismo; los términos y todo lo que sigue (envío, firma,
   * activación) son los mismos (Nico, 2026-09-03).
   */
  const esManual = !applicationId && searchParams.get('modo') === 'manual';
  const actions = useContractActions();
  const [partes, setPartes] = useState<PartesManuales>(PARTES_VACIAS);
  const [inmuebleElegido, setInmuebleElegido] = useState<string | null>(null);
  /*
   * El mandato del inmueble elegido a mano. De ahí sale el PROPIETARIO, que es
   * quien firma como arrendador: con sólo el `propertyId` el backend lo busca
   * igual, pero mandarlo cuando se lo tiene evita esa segunda consulta y deja
   * dicho de qué mandato salió el contrato.
   */
  const [consignacionElegida, setConsignacionElegida] = useState<string | null>(null);
  /*
   * Vivienda o comercial. Vacío = que lo decida el backend por el tipo de
   * inmueble; sólo se pregunta cuando responde que no puede (`USO_INDETERMINADO`).
   */
  const [uso, setUso] = useState<UsoDelInmueble | ''>('');
  // Los «falta esto» del bloque manual recién después de tocarlo: una pantalla
  // que abre en rojo antes de que la persona haga nada regaña por adelantado.
  const [partesTocadas, setPartesTocadas] = useState(false);

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
      prorratearPrimerMes: false,
      diasDePlazo: '',
      insuranceTier: 'NONE',
    };
  });

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  // Paso 11 del recorrido: qué aseguradora aprobó y con qué número. Antes no
  // se registraba en ningún lado, así que meses después nadie sabía a quién
  // reclamarle. Ver src/lib/inmobiliaria/respaldo.ts.
  const [respaldo, setRespaldo] = useState<Partial<Respaldo>>({ tipo: 'seguro' });
  const [evaluacion, setEvaluacion] = useState<EvaluationResult | null>(null);

  // Load application + property details
  useEffect(() => {
    if (!applicationId) {
      if (!esManual) setLoadError('Falta el parámetro applicationId en la URL.');
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

        // Las aseguradoras que evaluaron a este inquilino, para no pedir que
        // se escriban a mano. Aparte y tolerante: si el análisis no está o
        // falla, el contrato se arma igual y la aseguradora se escribe.
        void landlordApplicationsApi
          .getEvaluationResult(applicationId!)
          .then((r) => { if (!cancelled) setEvaluacion(r); })
          .catch(() => { /* sin lista: el bloque de respaldo lo dice y ofrece escribirla */ });

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
  }, [applicationId, esManual]);

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

  /*
   * El contrato que todavía no existe, tal como lo ve el backend.
   *
   * Se arma con los MISMOS valores del formulario de abajo —canon, plazo, día
   * de pago— y no con una copia aparte: el PDF que se genera y la fila que se
   * crea tienen que decir lo mismo. El hook vuelve a preparar cuando esto
   * cambia, y marca como viejo cualquier PDF armado antes del cambio.
   */
  const borrador = useMemo<BorradorDeContrato>(() => {
    const canon = Number(form.monthlyRent);
    const dia = Number(form.paymentDay);
    const inquilino = esManual && partes.inquilino.modo === 'nuevo' ? partes.inquilino : null;
    return {
      consignacionId: consignacionElegida ?? undefined,
      propertyId: (esManual ? partes.propertyId : property?.id) || undefined,
      uso: uso || undefined,
      arrendatarioNombre: inquilino?.nombre.trim() || application?.tenantName || undefined,
      arrendatarioDocumento: inquilino?.documento.trim() || undefined,
      arrendatarioEmail: inquilino?.correo.trim() || undefined,
      arrendatarioTelefono: inquilino?.telefono.trim() || undefined,
      canonMensual: Number.isFinite(canon) && canon > 0 ? canon : undefined,
      diaDePago: Number.isFinite(dia) && dia >= 1 && dia <= 31 ? dia : undefined,
      fechaInicio: form.startDate || undefined,
      fechaFin: form.endDate || undefined,
    };
  }, [
    form.monthlyRent,
    form.paymentDay,
    form.startDate,
    form.endDate,
    esManual,
    partes,
    property?.id,
    application?.tenantName,
    consignacionElegida,
    uso,
  ]);

  const armadoPorElSistema = form.mode === 'template' || form.mode === 'generate';
  // Con el PDF propio se prepara UNA vez, para saber si la tarjeta de IA se
  // puede prender. Sólo dentro del panel se vuelve a preguntar en cada cambio.
  const plantilla = useContratoDesdePlantilla(borrador, { activo: armadoPorElSistema });

  // Validation
  const validation = useMemo(() => {
    const errors: Record<string, string> = {};
    if (form.mode === 'upload' && !form.pdfFile) {
      errors.pdfFile = 'Subí el PDF del contrato.';
    }
    /*
     * 🔴 Con el PDF armado por el sistema, «no hay contrato» y «el contrato
     * quedó viejo» bloquean igual: crear la fila con un PDF que dice otro canon
     * sería un documento firmado que no coincide con la cuenta.
     */
    if (armadoPorElSistema && !plantilla.generado) {
      errors.contratoArmado = 'Armá el contrato antes de crearlo.';
    }
    if (armadoPorElSistema && plantilla.generadoQuedoViejo) {
      errors.contratoArmado = 'Volvé a armar el contrato: cambiaste datos después de generarlo.';
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
    const errorDePlazo = validarDiasDePlazo(form.diasDePlazo);
    if (errorDePlazo) errors.diasDePlazo = errorDePlazo;
    if (esManual) Object.assign(errors, validarPartes(partes));
    return errors;
  }, [
    form,
    esManual,
    partes,
    armadoPorElSistema,
    plantilla.generado,
    plantilla.generadoQuedoViejo,
  ]);

  // El respaldo es opcional —hay arriendos con codeudor y sin póliza— pero si
  // se empieza a llenar tiene que quedar completo: una aseguradora sin número
  // no sirve para reclamar.
  const respaldoEmpezado = Boolean(
    respaldo.aseguradora?.trim() || respaldo.identificador?.trim(),
  );
  const erroresRespaldo = useMemo(
    () => (respaldoEmpezado ? validarRespaldo(respaldo) : {}),
    [respaldo, respaldoEmpezado],
  );
  const respaldoValido = Object.keys(erroresRespaldo).length === 0;

  const isValid = Object.keys(validation).length === 0 && respaldoValido;

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || (!applicationId && !esManual)) return;
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

      /*
       * El contrato armado desde la plantilla legal entra por la MISMA puerta
       * que un PDF subido a mano: `generar` devuelve un `uploadedPdfPath` con
       * la convención de `POST /contracts/upload-pdf`, así que de acá para
       * abajo no hay ninguna rama nueva. Lo único que cambia es quién produjo
       * el archivo.
       */
      if (armadoPorElSistema) {
        if (!plantilla.generado || plantilla.generadoQuedoViejo) {
          setSubmitError('Armá el contrato antes de crearlo.');
          return;
        }
        uploadedPdfPath = plantilla.generado.uploadedPdfPath;
        contractOrigin = plantilla.generado.contractOrigin;
      }

      const terminos = {
        startDate: form.startDate,
        endDate: form.endDate,
        monthlyRent: Number(form.monthlyRent),
        deposit: Number(form.deposit),
        paymentDay: Number(form.paymentDay),
        ...terminosDeCobro(form),
        insuranceTier: form.insuranceTier,
        // El respaldo va como cláusula del contrato: es un campo real y
        // persistido, y una póliza de respaldo pertenece al texto que firman
        // las partes. Formato estable para poder migrarlo cuando el backend
        // tenga un campo propio (ver src/lib/inmobiliaria/respaldo.ts).
        customClauses:
          respaldoEmpezado && respaldoValido
            ? [comoClausula(respaldo as Respaldo)]
            : undefined,
        contractOrigin,
        uploadedPdfPath,
      };

      if (esManual) {
        const creado = await actions.createManual({
          ...terminos,
          propertyId: partes.propertyId,
          ...(partes.inquilino.modo === 'existente'
            ? { tenantId: partes.inquilino.tenantId }
            : {
                inquilino: {
                  nombre: partes.inquilino.nombre.trim(),
                  documento: partes.inquilino.documento.trim(),
                  correo: partes.inquilino.correo.trim(),
                  telefono: partes.inquilino.telefono.trim() || undefined,
                },
              }),
        });
        if (!creado) {
          setSubmitError(
            actions.lastError?.message
              ?? 'No se pudo crear el contrato. Verificá los datos e intentá de nuevo.'
          );
          return;
        }
        if (creado.inquilino.invitado) {
          toast.success('Contrato creado. Le mandamos al inquilino la invitación para crear su cuenta.');
        } else {
          toast.success('Contrato creado.');
        }
        router.push(`/panel/inmobiliaria/contratos/${creado.contract.id}`);
        return;
      }

      const contract = await actions.create({ applicationId: applicationId!, ...terminos });

      if (!contract) {
        // Race condition: el contrato puede haberse creado desde otra tab o ronda previa.
        // Si el backend rechazó por duplicado, recuperamos el existente y redirigimos.
        const errMsg = actions.lastError?.message?.toLowerCase() ?? '';
        if (errMsg.includes('ya existe un contrato') || errMsg.includes('already exists')) {
          const existing = await contractsApi.getByApplicationId(applicationId!);
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

  if (loadError || (!application && !esManual)) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="rounded-lg border border-danger/30 bg-danger-soft/40 p-5 flex items-start gap-3">
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
        <h1 className="text-h2 text-fg">Crear contrato</h1>
        {esManual ? (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2 max-w-2xl" data-testid="nuevo-contrato-manual">
            Sin postulación: elegís el inmueble y el inquilino, y el resto es igual que cualquier contrato.
            {inmuebleElegido && (
              <> · Inmueble: <span className="font-medium text-foreground">{inmuebleElegido}</span></>
            )}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground mt-1">
            Candidato: <span className="font-medium text-foreground">{application?.tenantName}</span>
            {property && (
              <> · Propiedad: <span className="font-medium text-foreground">{property.title}</span></>
            )}
          </p>
        )}
      </div>

      {/* Último paso del recorrido del inquilino (11). Ver src/lib/recorrido/pasos.ts.
          Un contrato manual no viene de ese recorrido: no se dibuja. */}
      {!esManual && <RecorridoHilo paso="contrato" className="mb-6" />}

      <form onSubmit={handleSubmit} className="space-y-6">
        {esManual && (
          <PartesDelContratoManual
            valor={partes}
            onCambio={(v) => {
              setPartesTocadas(true);
              setPartes(v);
            }}
            errores={partesTocadas ? validation : {}}
            onInmuebleElegido={(c) => {
              setInmuebleElegido(c.propertyTitle);
              // El mandato, para que el arrendador del contrato salga del
              // propietario que lo firmó y no haya que buscarlo otra vez.
              setConsignacionElegida(c.id);
              // El canon del mandato, si lo hay: una tecla menos y un número
              // que no se contradice con el de la consignación.
              if (c.monthlyRent != null && c.monthlyRent > 0) {
                setForm((f) => ({ ...f, monthlyRent: String(c.monthlyRent) }));
              }
            }}
          />
        )}

        {/* 1) Contract origin */}
        <section className="rounded-lg border border-border bg-card p-5 space-y-4">
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
              active={form.mode === 'template'}
              onClick={() => updateForm('mode', 'template')}
              title="Usar plantilla"
              desc="El contrato de ley, con las cláusulas opcionales que elijas."
              icon={Scales}
            />
            {/* 🔴 «Generar con IA» sólo se prende cuando el backend dice que
                está configurada (`iaDisponible`). Mientras no lo sepamos, o
                cuando dice que no, la tarjeta explica por qué — no promete un
                «próximamente» que nadie va a cumplir. */}
            <ModeOption
              active={form.mode === 'generate'}
              disabled={plantilla.iaDisponible !== true}
              onClick={() => updateForm('mode', 'generate')}
              title="Generar con IA"
              desc={
                plantilla.iaDisponible === true
                  ? 'Contás qué querés pactar y el asistente propone las cláusulas.'
                  : plantilla.iaDisponible === false
                    ? 'No está configurada en tu cuenta. Armalo con la plantilla.'
                    : 'Comprobando si está disponible en tu cuenta…'
              }
              icon={Sparkle}
              badge={plantilla.iaDisponible === false ? 'No disponible' : undefined}
            />
          </div>

          {/* Vivienda o comercial. Sólo aparece cuando el backend dice que no lo
              puede deducir del inmueble: de esa respuesta depende qué LEY rige
              el contrato, así que no se elige por defecto. */}
          {plantilla.usoIndeterminado && armadoPorElSistema && (
            <div className="space-y-1.5" data-testid="nuevo-contrato-uso">
              <label className="block text-xs font-medium text-fg" htmlFor="contrato-uso">
                Uso del inmueble
              </label>
              <Select
                value={uso || undefined}
                onValueChange={(v) => setUso(v as UsoDelInmueble)}
              >
                <SelectTrigger id="contrato-uso" data-testid="contrato-uso">
                  <SelectValue placeholder="Elegí vivienda o comercial" />
                </SelectTrigger>
                <SelectContent className="z-[400]">
                  <SelectItem value="VIVIENDA">Vivienda urbana (Ley 820 de 2003)</SelectItem>
                  <SelectItem value="COMERCIAL">
                    Local comercial (Código de Comercio, arts. 518 a 524)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-caption text-fg-muted">{plantilla.usoIndeterminado}</p>
            </div>
          )}
        </section>

        {armadoPorElSistema && (
          <ArmarContratoDesdePlantilla
            modo={form.mode === 'generate' ? 'generate' : 'template'}
            estado={plantilla}
          />
        )}

        {/* 2) PDF upload */}
        {form.mode === 'upload' && (
          <section className="rounded-lg border border-border bg-card p-5 space-y-3">
            <h2 className="text-base font-semibold text-foreground">PDF del contrato</h2>
            {form.pdfFile ? (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-600/30 bg-emerald-50/60 dark:bg-emerald-900/20">
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
                  'flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
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
        <section className="rounded-lg border border-border bg-card p-5 space-y-4">
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
            {/* El monto se agrupa DENTRO del campo. La ayudita de abajo repetía
                la misma cifra formateada, que es donde nadie mira mientras
                escribe; ahora sólo queda el mínimo, que sí dice algo. */}
            <Field
              label="Canon mensual (COP)"
              error={validation.monthlyRent}
              hint="Mínimo $ 100.000"
            >
              <MoneyInput
                value={form.monthlyRent}
                onChange={(crudo) => updateForm('monthlyRent', crudo)}
              />
            </Field>
            <Field label="Depósito (COP)" error={validation.deposit}>
              <MoneyInput value={form.deposit} onChange={(crudo) => updateForm('deposit', crudo)} />
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
            <Field
              label="Días de plazo antes de la mora"
              error={validation.diasDePlazo}
              hint="Vacío = los de la inmobiliaria. Días después de la fecha de pago en los que todavía no corre mora."
            >
              <Input
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

          {/* Prorrateo del primer mes: fuera de la grilla porque es un switch con explicación, no un campo más. */}
          <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-surface-muted p-4">
            <div className="space-y-1">
              <label htmlFor="prorratear-primer-mes" className="block text-sm font-medium text-foreground">
                Prorratear el primer mes
              </label>
              <p className="text-xs text-muted-foreground">
                El primer cobro se calcula por los días realmente ocupados del mes de inicio.
                Un contrato que arranca el 19 paga sólo lo que queda del mes; el siguiente ya sale completo.
              </p>
            </div>
            <Switch
              id="prorratear-primer-mes"
              data-testid="prorratear-primer-mes"
              checked={form.prorratearPrimerMes}
              onCheckedChange={(v) => updateForm('prorratearPrimerMes', v)}
            />
          </div>

          {/* Paso 11 del recorrido */}
          <div className="mt-6 border-t border-border pt-6">
            <RespaldoDelArriendo
              valor={respaldo}
              onCambio={setRespaldo}
              opciones={evaluacion?.protection_options}
              errores={erroresRespaldo}
            />
          </div>
        </section>

        {/* Errors + submit */}
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
        'relative text-left p-4 rounded-lg border transition-colors',
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
