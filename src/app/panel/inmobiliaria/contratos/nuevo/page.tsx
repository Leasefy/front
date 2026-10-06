'use client';

import { nombreDelCandidato } from '@/lib/contratos/nombre-del-candidato';
import { NO_SE_PRORRATEA, PREGUNTA_DEL_PRORRATEO, SI_SE_PRORRATEA } from '@/lib/contratos/modo-de-cobro'
import { useState, useCallback, useMemo, useEffect, useRef, useId } from 'react';
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
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { MoneyInput } from '@/components/ui/money-input';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import {
  ANIOS_HACIA_ADELANTE,
  ANIOS_HACIA_ATRAS,
  dentroDe,
  finPorDefectoISO,
  hace,
  todayISO,
} from './fechas-y-topes';
import { ResumenDelContratoNuevo } from '@/components/contratos/ResumenDelContratoNuevo';
import { primerCanon } from '@/lib/contratos/primer-canon';
import { avanceDelContrato } from '@/lib/contratos/avance-del-contrato';
import { ritmoDePago } from '@/lib/contratos/ritmo-de-pago';
import { agencyApi } from '@/lib/api/inmobiliaria.service';
import type { AgenciaConTerminos } from '@/lib/contratos/terminos-por-defecto';
import { terminosPorDefectoDeLaAgencia } from '@/lib/contratos/terminos-por-defecto';
import {
  porQueSeProponeElProrrateo,
  terminosConLosValoresDelBack,
  type ValoresPorDefectoDelContrato,
} from '@/lib/contratos/valores-por-defecto';
import { usoPorElTipo } from '@/lib/contratos/uso-del-inmueble';
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
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { Spinner } from '@/components/ui/spinner';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CrossFade, IconButton, MotionIndicator, Presence } from '@leasefy/cadence';
import { PageGuard } from '@/components/auth/PageGuard';
import { RecorridoHilo } from '@/components/inmobiliaria/recorrido/RecorridoHilo';
import { RespaldoDelArriendo } from '@/components/inmobiliaria/RespaldoDelArriendo';
import {
  PARTES_VACIAS,
  PartesDelContratoManual,
  validarPartes,
  type PartesManuales,
  type PersonaDelInquilino,
} from '@/components/contratos/PartesDelContratoManual';
import Link from 'next/link';
import { useContractActions } from '@/lib/hooks/useContracts';
import {
  inmuebleOcupado,
  contratoDuplicado,
  isPermissionError,
  type InmuebleOcupado,
} from '@/lib/contratos/fallo-de-accion';
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
import { BloqueoPorInventario } from '@/components/inmobiliaria/inventario/BloqueoPorInventario';
import { inventarioDelInmuebleApi } from '@/lib/api/inventario-del-inmueble.service';
import { AvisoInmuebleSinCanon } from '@/components/inmobiliaria/CanonPorConfirmar';
import { esErrorInmuebleSinCanon } from '@/lib/inmuebles/canon-por-confirmar';
import { errorDelArchivoDelContrato } from '@/lib/contratos/archivo-del-contrato';
import {
  bloqueoDeLaConsulta,
  bloqueoDelError,
  type BloqueoPorInventario as BloqueoPorInventarioDatos,
} from '@/lib/inventario/bloqueo-por-inventario';

// ─── Types ───────────────────────────────────────────────────────────────────

type CreationMode = 'upload' | 'template' | 'generate';

interface FormState {
  mode: CreationMode;
  pdfFile: File | null;
  startDate: string;
  endDate: string;
  /** QA-CONT-95 C-16: desde cuándo se cobra (recibe el inmueble). Vacío = desde el inicio. */
  fechaDeCartera: string;
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


/**
 * QA-INQ I-30: lo que falta para crear, en palabras, al lado del botón
 * apagado. Antes la pantalla abría con «El canon no puede ser menor que
 * $100.000» y «Sube el PDF del contrato» en rojo, antes de escribir nada.
 */
const FALTA = {
  propertyId: 'el inmueble',
  tenantId: 'el inquilino',
  nombre: 'el nombre del inquilino',
  documento: 'el documento del inquilino',
  correo: 'el correo del inquilino',
  pdfFile: 'el PDF del contrato',
  contratoArmado: 'armar el contrato',
  startDate: 'la fecha de inicio',
  endDate: 'la fecha de fin',
  monthlyRent: 'el canon',
  paymentDay: 'el día de pago',
} as const;
/** Los del bloque «partes»: sus errores salen cuando se toca el bloque (como siempre). */
const DE_LAS_PARTES: ReadonlySet<string> = new Set(['propertyId', 'tenantId', 'nombre', 'documento', 'correo']);

/** «a», «a y b», «a, b y c». */
function enLista(cosas: readonly string[]): string {
  if (cosas.length <= 1) return cosas[0] ?? '';
  return `${cosas.slice(0, -1).join(', ')} y ${cosas[cosas.length - 1]}`;
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
  /*
   * 🔴 QA con avatares 04-10: `/contratos/nuevo` a secas (un marcador, un enlace
   * guardado) mostraba «fue un problema nuestro… falta applicationId». Sin
   * postulación es lo mismo que `?modo=manual`: se arma el contrato acá.
   */
  const esManual = !applicationId;
  /*
   * `?inquilino=<identidad>` (QA-INQ I-29): «Crear su contrato» desde
   * Inquilinos llega con la persona ya elegida. `PartesDelContratoManual` la
   * busca en su lista y, si no tiene cuenta del portal, pasa a «Nuevo» con sus
   * datos ya escritos.
   */
  const inquilinoPedido = esManual ? searchParams.get('inquilino') : null;
  /*
   * `?inmueble=<propertyId>` (QA con avatares, 04-10): la vuelta desde el
   * inventario de la ficha («Hacer el inventario» del bloqueo) llega con el
   * inmueble ya elegido, para no empezar de cero.
   */
  const inmueblePedido = esManual ? searchParams.get('inmueble') : null;
  const actions = useContractActions();
  const [partes, setPartes] = useState<PartesManuales>(() =>
    inquilinoPedido
      ? { ...PARTES_VACIAS, inquilino: { modo: 'existente', tenantId: inquilinoPedido } }
      : PARTES_VACIAS,
  );
  const [inmuebleElegido, setInmuebleElegido] = useState<string | null>(null);
  /** El nombre del inquilino ya elegido de la lista, para el resumen (C-22). */
  const [nombreDelInquilino, setNombreDelInquilino] = useState<string | null>(null);
  // QA-CONT-95: la persona de «Ya es inquilino», para el contrato de la plantilla.
  const [personaDelInquilino, setPersonaDelInquilino] = useState<PersonaDelInquilino | null>(null);
  /** El tipo del inmueble elegido a mano (de su consignación): decide si hay depósito. */
  const [tipoDelInmuebleElegido, setTipoDelInmuebleElegido] = useState<string | null>(null);
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
  /*
   * QA-INQ I-30 (regla de ARREGLOS-4 Q2): un campo VACÍO no se pinta rojo
   * antes de que la persona haga algo. Su error sale al dejar el campo; lo que
   * ya tiene algo escrito se revisa en vivo, como siempre.
   */
  const [camposDejados, setCamposDejados] = useState<ReadonlySet<string>>(new Set());

  const [application, setApplication] = useState<LandlordApplicationDetail | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  /*
   * 🔴 El error CRUDO, además del mensaje (auditoría 2026-09-13, C20). Con el
   * string suelto, `FalloDeCarga` no puede distinguir un 404 de un corte de
   * red y ofrece «Reintentar» sobre algo que no existe. `intento` es lo que
   * hace que ese botón vuelva a correr la carga: el efecto depende de él.
   */
  const [loadErrorCrudo, setLoadErrorCrudo] = useState<unknown>(null);
  const [intento, setIntento] = useState(0);
  /** El PDF que ya viajó al bucket, para que un reintento no suba otro (C19). */
  const pdfYaSubido = useRef<{ huella: string; path: string } | null>(null);

  const [form, setForm] = useState<FormState>(() => {
    const start = todayISO();
    return {
      mode: 'upload',
      pdfFile: null,
      startDate: start,
      // C-13: inicio + 12 meses − 1 día (del 3-oct al 2-oct), no 12 meses y un día.
      endDate: finPorDefectoISO(start),
      fechaDeCartera: '',
      monthlyRent: '',
      deposit: '',
      paymentDay: '1',
      prorratearPrimerMes: false,
      diasDePlazo: '',
      insuranceTier: 'NONE',
    };
  });

  const [submitError, setSubmitError] = useState<string | null>(null);
  /*
   * 02-10-2026 · Lo que el back rechazó, en SU campo (400 `DATOS_INVALIDOS`
   * con `campos`): el canon de once cifras bajo el canon, la fecha imposible
   * bajo la fecha. El de un campo se borra apenas se lo toca.
   */
  const [erroresDelServidor, setErroresDelServidor] = useState<
    Partial<Record<CampoDelContrato, string>>
  >({});
  // El 409 del back cuando el inmueble ya tiene contrato: vive al lado del
  // selector y se borra apenas se elige otro inmueble.
  const [errorDeInmueble, setErrorDeInmueble] = useState<InmuebleOcupado | null>(null);
  // T-0129 — el inmueble tiene el canon por confirmar: el 409 trae su id.
  const [errorSinCanon, setErrorSinCanon] = useState<unknown>(null);
  // El inmueble elegido a mano ya se sabe con canon por confirmar (flag de la consignación).
  const [inmuebleManualSinCanon, setInmuebleManualSinCanon] = useState<string | null>(null);
  /**
   * 🔴 Nico y Juan Camilo, 2026-09-16: iniciar un contrato exige el inventario
   * del inmueble completo y actualizado. Se pregunta al elegir el inmueble
   * (para no dejar llenar todo el formulario en vano) y se vuelve a leer del
   * 409 del back al crear, que es quien decide.
   */
  const [bloqueoDeInventario, setBloqueoDeInventario] = useState<BloqueoPorInventarioDatos | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  /*
   * QA-CONT-95 C-09 (ronda 3): el archivo rechazado (.docx, PDF de más de
   * 10 MB) lo dice JUNTO al campo. Antes el mensaje iba al aviso del final de
   * la página, lejos de donde la persona acababa de soltar el archivo, y
   * parecía que el archivo «sólo no se tomaba».
   */
  const [errorDelPdf, setErrorDelPdf] = useState<string | null>(null);
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
    setLoadError(null);
    setLoadErrorCrudo(null);

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
        setLoadErrorCrudo(err);
        setLoadError(mensajeParaLaPersona(err, { porDefecto: 'No se pudo cargar la postulación.', accion: 'cargar la postulación' }));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  // `intento` está acá para que «Reintentar» del `FalloDeCarga` vuelva a correr
  // esta carga: es el único disparador que tiene esa pantalla.
  }, [applicationId, esManual, intento]);

  /*
   * C-13 (Nico, 03-10-2026: «los de la inmobiliaria»): el día de pago y el
   * prorrateo por defecto salen de la configuración de la inmobiliaria. Se
   * aplican UNA vez, al llegar, y sólo sobre lo que la persona no tocó. Se
   * leen de `GET /inmobiliaria/agency` (lo ven todos los roles; la
   * configuración completa es sólo del administrador). Si falla, el formulario
   * se queda con lo de siempre.
   */
  const [agenciaConTerminos, setAgenciaConTerminos] = useState<AgenciaConTerminos | null>(null);
  useEffect(() => {
    let vivo = true;
    Promise.resolve()
      .then(() => agencyApi.getMyAgency())
      .then((a) => {
        if (vivo && a) setAgenciaConTerminos(a as unknown as AgenciaConTerminos);
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);
  /*
   * SEGUIMIENTO-FRONT (C-13, back ff282197): el prorrateo, los días de plazo y
   * el fin sugerido salen de `GET /contracts/valores-por-defecto` — los de la
   * inmobiliaria resueltos por el back—. `GET /inmobiliaria/agency` no publica
   * el prorrateo, así que el formulario abría «No» en una inmobiliaria que
   * prorratea. Si la ruta falla (un back anterior), queda lo de la agencia.
   */
  const [valoresDelBack, setValoresDelBack] = useState<ValoresPorDefectoDelContrato | null>(null);
  const inicioDeLosValores = useRef(form.startDate);
  useEffect(() => {
    let vivo = true;
    // Dentro de una promesa (como la agencia): si el servicio no está —un doble
    // de prueba, un back anterior—, el error queda en el `catch`.
    Promise.resolve()
      .then(() => contractsApi.valoresPorDefecto(inicioDeLosValores.current || undefined))
      .then((v) => {
        if (vivo && v) setValoresDelBack(v);
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);
  const porDefecto = useMemo(
    () => terminosConLosValoresDelBack(terminosPorDefectoDeLaAgencia(agenciaConTerminos), valoresDelBack),
    [agenciaConTerminos, valoresDelBack],
  );
  const tocados = useRef<Set<keyof FormState>>(new Set());
  const porDefectoAplicado = useRef(false);
  const valoresAplicados = useRef(false);
  useEffect(() => {
    if (!porDefecto || porDefectoAplicado.current) return;
    porDefectoAplicado.current = true;
    setForm((f) => ({
      ...f,
      paymentDay:
        porDefecto.diaDePago !== null && !tocados.current.has('paymentDay')
          ? String(porDefecto.diaDePago)
          : f.paymentDay,
      prorratearPrimerMes:
        porDefecto.prorratear !== null && !tocados.current.has('prorratearPrimerMes') && !valoresAplicados.current
          ? porDefecto.prorratear
          : f.prorratearPrimerMes,
    }));
  }, [porDefecto]);
  useEffect(() => {
    if (!valoresDelBack || valoresAplicados.current) return;
    valoresAplicados.current = true;
    setForm((f) => ({
      ...f,
      prorratearPrimerMes: tocados.current.has('prorratearPrimerMes') ? f.prorratearPrimerMes : valoresDelBack.prorratear,
      // El fin que sugiere el back para el inicio que se le preguntó, mientras
      // nadie haya tocado ni el inicio ni el fin (C-13: inicio + 12 meses − 1 día).
      endDate:
        valoresDelBack.finSugerido &&
        !tocados.current.has('endDate') &&
        f.startDate === inicioDeLosValores.current &&
        f.endDate === finPorDefectoISO(f.startDate)
          ? valoresDelBack.finSugerido
          : f.endDate,
    }));
  }, [valoresDelBack]);

  const updateForm = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    tocados.current.add(key);
    setForm((f) => {
      /*
       * C-13: la fecha de fin sigue al inicio mientras nadie la haya cambiado
       * a mano (inicio + 12 meses − 1 día). Una vez tocada, manda la persona.
       */
      if (key === 'startDate' && !tocados.current.has('endDate') && f.endDate === finPorDefectoISO(f.startDate)) {
        const inicio = value as string;
        return { ...f, startDate: inicio, endDate: inicio ? finPorDefectoISO(inicio) : f.endDate };
      }
      return { ...f, [key]: value };
    });
    setErroresDelServidor((e) => {
      if (!(key in e)) return e;
      const resto = { ...e };
      delete resto[key as CampoDelContrato];
      return resto;
    });
  }, []);

  // PDF handlers
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
    /*
     * 🔴 QA-CONT-95: también la persona de «Ya es inquilino» (antes sólo la
     * «Nueva»): sin su nombre y documento la plantilla nunca armaba.
     */
    const inquilino = !esManual
      ? null
      : partes.inquilino.modo === 'nuevo'
        ? partes.inquilino
        : personaDelInquilino;
    const texto = (v: string | null | undefined) => (v ?? '').trim() || undefined;
    return {
      consignacionId: consignacionElegida ?? undefined,
      propertyId: (esManual ? partes.propertyId : property?.id) || undefined,
      uso: uso || undefined,
      arrendatarioNombre: texto(inquilino?.nombre) || application?.tenantName || undefined,
      arrendatarioDocumento: texto(inquilino?.documento),
      arrendatarioEmail: texto(inquilino?.correo),
      arrendatarioTelefono: texto(inquilino?.telefono),
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
    personaDelInquilino,
  ]);

  const armadoPorElSistema = form.mode === 'template' || form.mode === 'generate';
  /*
   * Nico (03-10-2026): «Depósito: dejarlo sólo para comercial». En vivienda no
   * hay depósito en dinero (Ley 820, art. 16); el campo sólo aparece cuando el
   * contrato es comercial: por la respuesta de la persona (`uso`) o por el
   * tipo del inmueble, con la misma lista del back. Sin saberlo, no se pide.
   */
  const usoDelContrato = uso || usoPorElTipo(esManual ? tipoDelInmuebleElegido : property?.type);
  const pideDeposito = usoDelContrato === 'COMERCIAL';
  // La marca de la forma elegida se desliza de una tarjeta a otra.
  const marcaDelModo = `${useId()}-modo`;
  // Con el PDF propio se prepara UNA vez, para saber si la tarjeta de IA se
  // puede prender. Sólo dentro del panel se vuelve a preguntar en cada cambio.
  const plantilla = useContratoDesdePlantilla(borrador, { activo: armadoPorElSistema });

  // «Centavos en todo» (C3-FRONT): ¿la deuda ya se escribe al centavo?
  const deudaConCentavos = usePlataConCentavos(AREAS_DE_LA_DEUDA);

  // Validation
  const validation = useMemo(() => {
    const errors: Record<string, string> = {};
    if (form.mode === 'upload' && !form.pdfFile) {
      errors.pdfFile = 'Sube el PDF del contrato.';
    }
    /*
     * 🔴 Con el PDF armado por el sistema, «no hay contrato» y «el contrato
     * quedó viejo» bloquean igual: crear la fila con un PDF que dice otro canon
     * sería un documento firmado que no coincide con la cuenta.
     */
    if (armadoPorElSistema && !plantilla.generado) {
      errors.contratoArmado = 'Arma el contrato antes de crearlo.';
    }
    if (armadoPorElSistema && plantilla.generadoQuedoViejo) {
      errors.contratoArmado = 'Vuelve a armar el contrato: cambiaste datos después de generarlo.';
    }
    /*
     * 🔴 C22 (auditoría 2026-09-13) y 02-10-2026: había piso y no había techo,
     * y un canon de once cifras llegaba a `monthly_rent` (`int4`) y volvía
     * como un 500 ilegible. Los topes y las frases son ahora los MISMOS del
     * DTO del back (`lib/contratos/limites-del-contrato`): se ataja acá con la
     * frase que diría el back.
     */
    Object.assign(
      errors,
      revisarTerminosDelContrato(
        {
          startDate: form.startDate,
          endDate: form.endDate,
          monthlyRent: form.monthlyRent,
          // Sin depósito en vivienda: un valor que no se ve no puede trabar el botón.
          deposit: pideDeposito ? form.deposit : '',
          paymentDay: form.paymentDay,
        },
        // «Centavos en todo»: canon y depósito con centavos sólo con las dos
        // áreas de la deuda prendidas (`CreateContractDto`).
        { canonConCentavos: deudaConCentavos, depositoConCentavos: deudaConCentavos },
      ),
    );
    if (!form.startDate) errors.startDate = 'Requerido';
    if (!form.endDate) errors.endDate = 'Requerido';
    if (!form.monthlyRent.trim()) errors.monthlyRent = MENSAJES_DEL_CONTRATO.canonMinimo;

    /*
     * Y no había ningún tope de AÑO. Un «2016» o un «2036» tecleados por error
     * creaban un contrato con diez años de cartera vencida o diez años sin
     * cobrar, y nadie se enteraba hasta la primera corrida del mes. Retrofechar
     * sigue siendo legítimo —un contrato que empezó el mes pasado se carga
     * hoy—: lo que se bloquea es el año equivocado, no el pasado.
     */
    if (form.startDate && !errors.startDate) {
      if (form.startDate < hace(ANIOS_HACIA_ATRAS)) {
        errors.startDate = `No puede empezar hace más de ${anios(ANIOS_HACIA_ATRAS)}. Revisa el año.`;
      } else if (form.startDate > dentroDe(ANIOS_HACIA_ADELANTE)) {
        errors.startDate = `No puede empezar dentro de más de ${anios(ANIOS_HACIA_ADELANTE)}. Revisa el año.`;
      }
    }
    /*
     * QA-CONT-95 C-16 (`fecha-de-cartera.md`, regla 3): la fecha de cartera es
     * ≥ inicio SIEMPRE, y no después del fin. Vacía = se cobra desde el inicio.
     */
    if (form.fechaDeCartera) {
      if (form.startDate && form.fechaDeCartera < form.startDate) {
        errors.fechaDeCartera = 'No puede ser antes de la fecha de inicio: se cobra desde que recibe el inmueble.';
      } else if (form.endDate && form.fechaDeCartera > form.endDate) {
        errors.fechaDeCartera = 'No puede ser después de la fecha de fin.';
      }
    }
    if (!form.paymentDay.trim()) errors.paymentDay = MENSAJES_DEL_CONTRATO.diaDePago;
    const errorDePlazo = validarDiasDePlazo(form.diasDePlazo);
    if (errorDePlazo) errors.diasDePlazo = errorDePlazo;
    if (esManual) Object.assign(errors, validarPartes(partes));
    return errors;
  }, [
    form,
    esManual,
    partes,
    pideDeposito,
    armadoPorElSistema,
    plantilla.generado,
    plantilla.generadoQuedoViejo,
    deudaConCentavos,
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

  const inmuebleParaIniciar = (esManual ? partes.propertyId : property?.id) || null;
  useEffect(() => {
    setBloqueoDeInventario(null);
    if (!inmuebleParaIniciar) return;
    let vivo = true;
    // `Promise.resolve().then` y no la llamada suelta: un fallo síncrono del
    // cliente también cae en el `catch` en vez de tumbar el formulario.
    Promise.resolve()
      .then(() => inventarioDelInmuebleApi.paraIniciar(inmuebleParaIniciar))
      .then((r) => {
        if (vivo) setBloqueoDeInventario(bloqueoDeLaConsulta(r));
      })
      .catch(() => {
        /* Sin respuesta no se bloquea acá: al crear, el back decide. */
      });
    return () => {
      vivo = false;
    };
  }, [inmuebleParaIniciar]);

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || (!applicationId && !esManual)) return;
    setSubmitError(null);

    try {
      let uploadedPdfPath: string | undefined;
      let contractOrigin: ContractOrigin | undefined;

      if (form.mode === 'upload' && form.pdfFile) {
        /*
         * 🔴 C19 (auditoría 2026-09-13): subir el PDF y crear el contrato son
         * dos llamadas. Si la segunda falla —un 400 de canon, un corte— el
         * blob YA está en el bucket, y el reintento subía OTRO: un archivo
         * huérfano en Supabase por cada intento, ninguno referenciado por
         * nada. Se recuerda el que ya subió ESTE archivo (por nombre y tamaño,
         * que es lo que distingue un PDF de otro en un formulario) y se reusa.
         * Cambiar de archivo invalida el recuerdo y vuelve a subir, que es lo
         * correcto: es otro documento.
         */
        const huella = `${form.pdfFile.name}:${form.pdfFile.size}`;
        if (pdfYaSubido.current?.huella === huella) {
          uploadedPdfPath = pdfYaSubido.current.path;
        } else {
          const uploaded = await actions.uploadPdf(form.pdfFile);
          if (!uploaded) {
            setSubmitError('No pudimos guardar el PDF del contrato. Vuelve a crearlo en un momento.');
            return;
          }
          uploadedPdfPath = uploaded.uploadedPdfPath;
          pdfYaSubido.current = { huella, path: uploaded.uploadedPdfPath };
        }
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
          setSubmitError('Arma el contrato antes de crearlo.');
          return;
        }
        uploadedPdfPath = plantilla.generado.uploadedPdfPath;
        contractOrigin = plantilla.generado.contractOrigin;
      }

      const terminos = {
        startDate: form.startDate,
        endDate: form.endDate,
        // QA-CONT-95 C-16: sólo si la escribió; vacía = desde el inicio.
        ...(form.fechaDeCartera ? { fechaDeCartera: form.fechaDeCartera } : {}),
        monthlyRent: Number(form.monthlyRent),
        deposit: pideDeposito ? Number(form.deposit) : 0,
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
        if (creado.inquilino.invitado) {
          toast.success('Contrato creado. Le mandamos al inquilino la invitación para crear su cuenta.');
        } else if (creado.inquilino.userId === null) {
          // QA-CONT CR-14 (back 2a681c93): el borrador nace SIN la cuenta del
          // inquilino; para enviarlo a firmar hay que invitarlo desde el contrato.
          toast.success('Contrato creado como borrador.', {
            description: 'El inquilino todavía no tiene cuenta en el portal: invítalo desde el contrato («Invitar al portal») antes de enviarlo a firmar.',
          });
        } else {
          toast.success('Contrato creado.');
        }
        router.push(`/panel/inmobiliaria/contratos/${creado.contract.id}`);
        return;
      }

      const contract = await actions.create({ applicationId: applicationId!, ...terminos });
      router.push(`/panel/inmobiliaria/contratos/${contract.id}`);
    } catch (err) {
      /*
       * 🔴 Antes acá llegaba sólo lo que `run()` no tragaba (nada): el 409
       * «Ese inmueble ya tiene un contrato en curso (#1234)» se leía como
       * «Verifica los datos». Ahora el error VIENE y se reparte:
       *   - inmueble ocupado → al lado del selector, con el enlace al contrato;
       *   - postulación que ya tiene contrato → se recupera y se redirige;
       *   - el resto → el motivo del back en palabras.
       */
      if (esErrorInmuebleSinCanon(err)) {
        setErrorSinCanon(err);
        setSubmitError(null);
        return;
      }
      const bloqueo = bloqueoDelError(err);
      if (bloqueo) {
        setBloqueoDeInventario(bloqueo);
        setSubmitError(null);
        return;
      }
      const ocupado = inmuebleOcupado(err);
      if (ocupado && esManual) {
        setErrorDeInmueble(ocupado);
        setSubmitError(null);
        return;
      }
      if (!esManual && contratoDuplicado(err)) {
        // Race: el contrato pudo crearse desde otra pestaña o una ronda previa.
        const existing = await contractsApi.getByApplicationId(applicationId!).catch(() => null);
        if (existing) {
          toast.info('Esta aplicación ya tiene un contrato. Te llevamos al detalle.');
          router.replace(`/panel/inmobiliaria/contratos/${existing.id}`);
          return;
        }
      }
      if (isPermissionError(err)) {
        setSubmitError('No tienes permiso para crear contratos.');
        return;
      }
      /*
       * 02-10-2026 · Un 400 con `campos` (el DTO topado, la fecha de fin antes
       * del inicio) va a SU campo y ese campo recibe el foco; al pie queda
       * sólo lo que no tiene dónde ir. Sin campos (un 409, un 5xx, la red),
       * el motivo con la regla de oro: «conexión» sólo si no hubo respuesta.
       */
      const reparto = repartirErroresDelContrato(err, {
        porDefecto: 'No se pudo crear el contrato.',
        accion: 'crear el contrato',
      });
      if (reparto.orden.length > 0) {
        setErroresDelServidor(reparto.porCampo);
        setSubmitError(reparto.sueltos.length ? reparto.sueltos.join(' · ') : null);
        enfocarCampoDelContrato(reparto.orden[0]);
        return;
      }
      setSubmitError(
        motivoDelFalloDelContrato(err, {
          porDefecto: 'No se pudo crear el contrato.',
          accion: 'crear el contrato',
        }),
      );
    }
  };

  /** ¿El campo está vacío? (lo que decide si su error espera a que lo dejen). */
  const vacio = (campo: CampoDelContrato): boolean => {
    if (campo === 'pdfFile') return !form.pdfFile;
    const valor = (form as unknown as Record<string, unknown>)[campo];
    return typeof valor !== 'string' || valor.trim() === '';
  };
  /**
   * El error de un campo: el del servidor gana sobre el del formulario. El del
   * formulario, sólo si el campo tiene algo escrito o ya lo dejaron (I-30).
   */
  const errorDe = (campo: CampoDelContrato): string | undefined =>
    erroresDelServidor[campo] ??
    (!vacio(campo) || camposDejados.has(idDelCampoDelContrato(campo)) ? validation[campo] : undefined);
  /** React avisa el `blur` de cualquier campo de adentro: se anota cuál dejaron. */
  const alDejarUnCampo = (e: React.FocusEvent<HTMLElement>) => {
    const id = e.target?.id;
    if (!id) return;
    setCamposDejados((antes) => (antes.has(id) ? antes : new Set(antes).add(id)));
  };
  /*
   * El botón apagado dice por qué (R-29): lo que FALTA (vacío y todavía sin
   * error a la vista), en palabras y sin rojo. Lo que está mal escrito ya lo
   * dice su campo.
   */
  const loQueFalta = (Object.keys(FALTA) as Array<keyof typeof FALTA>).filter((clave) => {
    if (!validation[clave]) return false;
    if (clave === 'contratoArmado') return true;
    if (DE_LAS_PARTES.has(clave)) return !partesTocadas;
    return vacio(clave as CampoDelContrato) && !camposDejados.has(idDelCampoDelContrato(clave as CampoDelContrato));
  });

  /*
   * C-22: lo que dice el resumen de la derecha. Nada de negocio nuevo: el
   * primer canon es el espejo de la regla del back (sólo el canon), la frase
   * de cómo se cobra es la de la ficha y los bloqueos son los mismos avisos de
   * la izquierda, en una línea.
   */
  const canonDelResumen = Number(form.monthlyRent) > 0 ? Number(form.monthlyRent) : null;
  const primerCanonDelResumen = canonDelResumen
    ? primerCanon({ inicio: form.fechaDeCartera || form.startDate, canon: canonDelResumen, prorratear: form.prorratearPrimerMes })
    : null;
  const mesesDelResumen = avanceDelContrato({ inicio: form.startDate, fin: form.endDate, hoy: form.startDate || todayISO() }).meses;
  const comoSeCobra =
    form.startDate && !validation.diasDePlazo
      ? ritmoDePago(
          {
            prorratearPrimerMes: form.prorratearPrimerMes,
            startDate: form.startDate,
            paymentDueDay: Number(form.paymentDay) || null,
            diasDePlazo: form.diasDePlazo.trim() === '' ? null : Number(form.diasDePlazo),
          },
          porDefecto
            ? {
                diasDePlazo: porDefecto.diasDePlazo,
                diaDePago: porDefecto.diaDePago,
                // CR-31: sin plazo fijado no corre mora (lo dice el back).
                plazoSinFijar: valoresDelBack?.reglaDeCobro?.plazoSinFijar === true,
              }
            : null,
        )
      : null;
  const inquilinoDelResumen = esManual
    ? partes.inquilino.modo === 'nuevo'
      ? partes.inquilino.nombre.trim() || null
      : nombreDelInquilino
    : application?.tenantName ?? null;
  const documentoDelResumen =
    form.mode === 'upload'
      ? form.pdfFile
        ? `PDF propio · ${form.pdfFile.name}`
        : null
      : plantilla.generado && !plantilla.generadoQuedoViejo
        ? form.mode === 'generate'
          ? 'Generado con IA · listo'
          : 'Plantilla de ley · lista'
        : null;
  const bloqueosDelResumen: string[] = [
    // El motivo completo, con su enlace, está en el aviso debajo del inmueble.
    ...(bloqueoDeInventario ? ['El inventario del inmueble no está completo y al día.'] : []),
    ...(errorDeInmueble ? [errorDeInmueble.mensaje] : []),
    ...(errorSinCanon !== null || inmuebleManualSinCanon || (!esManual && property?.canonPorConfirmar)
      ? ['El inmueble tiene el canon por confirmar.']
      : []),
  ];

  // ─── UI ────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      // Dentro del panel va el esqueleto, no el logo (Nico, 01-10: «el logo sólo en cargas de pantalla completa»).
      <EsqueletoDePagina variante="wizard" className="mx-auto max-w-3xl" />
    );
  }

  /*
   * 🔴 C20 (auditoría 2026-09-13): esto era una tarjeta roja a mano, sin
   * «Reintentar» ni «Volver» — un corte de red dejaba a la persona en un
   * callejón sin salida, con el único camino de escribir la URL a mano.
   * `FalloDeCarga` es el patrón de la casa: clasifica el error (404 vs. red),
   * ofrece reintentar cuando tiene sentido y siempre da por dónde salir.
   */
  if (loadError || (!application && !esManual)) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <FalloDeCarga
          error={loadErrorCrudo ?? loadError ?? 'No se pudo cargar la postulación'}
          queEs="esta postulación"
          onReintentar={() => setIntento((n) => n + 1)}
          volverA={{ label: 'Contratos', href: '/panel/inmobiliaria/contratos' }}
        />
      </div>
    );
  }

  /*
   * 🔴 C-22 (Nico, 03-10-2026, captura de `?modo=manual`): «¿por qué no
   * utilizas mejor el ancho de la página? mira todo el espacio que tiene a los
   * lados... y mucha información en scroll». Era una columna de 768 px
   * centrada, con 2.142 px de alto a 1440. Ahora, desde `xl`, dos columnas:
   *   · a la IZQUIERDA lo que se elige —el inmueble y el inquilino (con sus
   *     avisos justo debajo, C-12), el tipo de contrato, el PDF o la plantilla
   *     y el respaldo—;
   *   · a la DERECHA los términos y un RESUMEN que se queda fijo al hacer
   *     scroll, con el canon, las fechas, el primer canon, lo que falta para
   *     poder crear y el botón.
   * Por debajo de `xl` (y a 390 px) es una sola columna, en el mismo orden.
   */
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-6 xl:max-w-[1600px] xl:px-8">
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
            Sin postulación: eliges el inmueble y el inquilino, y el resto es igual que cualquier contrato.
            {inmuebleElegido && (
              <> · Inmueble: <span className="font-medium text-foreground">{inmuebleElegido}</span></>
            )}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground mt-1">
            Candidato: <span className="font-medium text-foreground">{nombreDelCandidato(application)}</span>
            {property && (
              <> · Propiedad: <span className="font-medium text-foreground">{property.title}</span></>
            )}
          </p>
        )}
      </div>

      {/* Último paso del recorrido del inquilino (11). Ver src/lib/recorrido/pasos.ts.
          Un contrato manual no viene de ese recorrido: no se dibuja. */}
      {!esManual && <RecorridoHilo paso="contrato" className="mb-6" />}

      {/* Las columnas se estiran a la misma altura (sin `items-start`): así el
          resumen de la derecha tiene por dónde quedarse fijo mientras la
          izquierda —que con la plantilla es la larga— se recorre. */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 xl:grid-cols-2" data-testid="nuevo-contrato-columnas">
        {/* ── Izquierda: lo que se elige ── */}
        <div className="min-w-0 space-y-6" data-testid="nuevo-contrato-elegir">
        {esManual && (
          <PartesDelContratoManual
            inquilinoPedido={inquilinoPedido}
            inmueblePedido={inmueblePedido}
            valor={partes}
            onCambio={(v, opciones) => {
              if (!opciones?.automatico) setPartesTocadas(true);
              if (v.propertyId !== partes.propertyId) {
                setErrorDeInmueble(null);
                setErrorSinCanon(null);
              }
              setPartes(v);
            }}
            errores={{
              ...(partesTocadas ? validation : {}),
              ...erroresDelServidor,
              ...(errorDeInmueble ? { propertyId: errorDeInmueble.mensaje } : {}),
            }}
            onInmuebleElegido={(c) => {
              setInmuebleElegido(c.propertyTitle);
              setTipoDelInmuebleElegido(c.propertyType ?? null);
              // El mandato, para que el arrendador del contrato salga del
              // propietario que lo firmó y no haya que buscarlo otra vez.
              setConsignacionElegida(c.id);
              setInmuebleManualSinCanon(c.canonPorConfirmar ? c.propertyId : null);
              // El canon del mandato, si lo hay: una tecla menos y un número
              // que no se contradice con el de la consignación.
              if (!c.canonPorConfirmar && c.monthlyRent != null && c.monthlyRent > 0) {
                setForm((f) => ({ ...f, monthlyRent: String(c.monthlyRent) }));
              }
            }}
            onNombreDelInquilino={setNombreDelInquilino}
            onPersonaDelInquilino={setPersonaDelInquilino}
          />
        )}

        {/*
          🔴 C-12: lo que no deja crear por culpa del INMUEBLE sale apenas se
          elige, justo debajo del selector, y no al final del formulario
          después de llenarlo todo. El inventario se pregunta al elegir el
          inmueble (`para-iniciar`); el 409 del back al crear cae acá mismo.
          Entran y salen (no saltan).
        */}
        <Presence show={bloqueoDeInventario !== null} initial={false} distance="xs">
          {bloqueoDeInventario && (
            <BloqueoPorInventario
              bloqueo={bloqueoDeInventario}
              // Para volver acá con lo elegido cuando el inventario quede listo.
              volverA={
                esManual
                  ? inmuebleParaIniciar
                    ? `/panel/inmobiliaria/contratos/nuevo?inmueble=${encodeURIComponent(inmuebleParaIniciar)}`
                    : '/panel/inmobiliaria/contratos/nuevo'
                  : `/panel/inmobiliaria/contratos/nuevo?applicationId=${encodeURIComponent(applicationId ?? '')}`
              }
            />
          )}
        </Presence>
        <Presence
          show={Boolean(errorDeInmueble)}
          initial={false}
          role="alert"
          className="rounded-lg border border-warning/30 bg-warning-soft/40 p-4 flex items-start gap-2"
        >
          {errorDeInmueble && (
            <>
              <WarningCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-fg">{errorDeInmueble.mensaje}</p>
                {errorDeInmueble.contratoId && (
                  <Link
                    href={`/panel/inmobiliaria/contratos/${errorDeInmueble.contratoId}`}
                    className="mt-1 inline-block font-medium text-primary underline underline-offset-2"
                  >
                    Ver el contrato{errorDeInmueble.contratoNumero ? ` ${errorDeInmueble.contratoNumero}` : ''} que estorba
                  </Link>
                )}
              </div>
            </>
          )}
        </Presence>
        <Presence
          show={errorSinCanon !== null || Boolean(inmuebleManualSinCanon) || (!esManual && Boolean(property?.canonPorConfirmar))}
          initial={false}
          className="rounded-lg border border-warning/40 bg-warning/5 p-4"
        >
          <AvisoInmuebleSinCanon
            error={errorSinCanon}
            inmuebleId={!esManual ? property?.id : inmuebleManualSinCanon}
          />
        </Presence>

        {/* 1) Contract origin */}
        <section className="rounded-lg border border-border bg-card p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Tipo de contrato</h2>
          {/* C-14: «Generar con IA» sólo se ofrece cuando el backend dice que
              está configurada (`iaDisponible`). Apagada con «No disponible» era
              una promesa muerta en medio de las dos formas que sí sirven. */}
          <div className={cn('grid grid-cols-1 gap-3', plantilla.iaDisponible === true ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
            <ModeOption
              marca={marcaDelModo}
              active={form.mode === 'upload'}
              onClick={() => updateForm('mode', 'upload')}
              title="Subir PDF propio"
              desc="Usa un contrato que tu inmobiliaria ya tenga preparado."
              icon={UploadSimple}
            />
            <ModeOption
              marca={marcaDelModo}
              active={form.mode === 'template'}
              onClick={() => updateForm('mode', 'template')}
              title="Usar plantilla"
              desc="El contrato de ley, con las cláusulas opcionales que elijas."
              icon={Scales}
            />
            {plantilla.iaDisponible === true && (
              <ModeOption
                marca={marcaDelModo}
                active={form.mode === 'generate'}
                onClick={() => updateForm('mode', 'generate')}
                title="Generar con IA"
                desc="Cuentas qué quieres pactar y el asistente propone las cláusulas."
                icon={Sparkle}
              />
            )}
          </div>

          {/* Vivienda o comercial. Sólo aparece cuando el backend dice que no lo
              puede deducir del inmueble: de esa respuesta depende qué LEY rige
              el contrato, así que no se elige por defecto. */}
          {/* QA-CONT-95 C-12: después de elegir sigue a la vista, para poder
              cambiar de ley si se eligió mal (antes desaparecía al responder
              `preparar` y sólo se corregía recargando). */}
          {(plantilla.usoIndeterminado || uso) && armadoPorElSistema && (
            <div className="space-y-1.5" data-testid="nuevo-contrato-uso">
              <label className="block text-xs font-medium text-fg" htmlFor="contrato-uso">
                Uso del inmueble
              </label>
              <Select
                value={uso || undefined}
                onValueChange={(v) => setUso(v as UsoDelInmueble)}
              >
                <SelectTrigger id="contrato-uso" data-testid="contrato-uso">
                  <SelectValue placeholder="Elige vivienda o comercial" />
                </SelectTrigger>
                <SelectContent className="z-[400]">
                  <SelectItem value="VIVIENDA">Vivienda urbana (Ley 820 de 2003)</SelectItem>
                  <SelectItem value="COMERCIAL">
                    Local comercial (Código de Comercio, arts. 518 a 524)
                  </SelectItem>
                </SelectContent>
              </Select>
              {plantilla.usoIndeterminado ? (
                <p className="text-caption text-fg-muted">{plantilla.usoIndeterminado}</p>
              ) : null}
            </div>
          )}
        </section>

        {/* Cambiar de forma cruza lo de una con lo de la otra. `popLayout`:
            lo nuevo entra YA en su lugar y lo viejo se va por encima. */}
        <CrossFade
          swapKey={armadoPorElSistema ? 'armar' : form.mode === 'upload' ? 'subir' : 'ninguno'}
          mode="popLayout"
          className="empty:hidden"
        >
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
                <div className="flex items-center gap-3 p-3 rounded-lg border border-success/30 bg-success-soft">
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
                    <span className="font-medium">Haz clic para subir</span> o arrastra un PDF aquí
                  </p>
                  <p className="text-xs text-muted-foreground">Máx 10 MB</p>
                  <input
                    id="pdf-upload"
                    type="file"
                    accept="application/pdf"
                    aria-invalid={errorDelPdf ? true : undefined}
                    aria-describedby={`${idDelCampoDelContrato('pdfFile')}-error`}
                    onChange={(e) => {
                      onPickFile(e.target.files?.[0] ?? null);
                      // Volver a elegir el MISMO archivo (corregido afuera) dispara otra vez.
                      e.target.value = '';
                    }}
                    className="sr-only"
                  />
                </label>
              )}
              <ErrorDelCampo
                id={`${idDelCampoDelContrato('pdfFile')}-error`}
                mensaje={errorDelPdf ?? errorDe('pdfFile')}
                className="mt-0"
              />

              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted rounded-md p-3">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>
                  El propietario va a firmar digitalmente el contrato en Leasefy, independientemente
                  de si el PDF ya trae firma manuscrita. Esto garantiza la trazabilidad legal.
                </p>
              </div>
            </section>
          )}
        </CrossFade>

        {/* Paso 11 del recorrido: el respaldo (aseguradora y póliza). Vivía al
            pie de «Términos»; con dos columnas va con lo que se elige, y la
            derecha queda corta para que el resumen se vea entero. */}
        <section className="rounded-lg border border-border bg-card p-5" data-testid="nuevo-contrato-respaldo">
          <RespaldoDelArriendo
            valor={respaldo}
            onCambio={setRespaldo}
            opciones={evaluacion?.protection_options}
            errores={erroresRespaldo}
            conAnalisis={!esManual}
          />
        </section>
        </div>

        {/* ── Derecha: los términos y el resumen fijo ── */}
        <div className="min-w-0 space-y-6" data-testid="nuevo-contrato-terminos">
        {/* 3) Dates + amounts */}
        <section className="rounded-lg border border-border bg-card p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Términos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" onBlur={alDejarUnCampo}>
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
            {/* QA-CONT-95 C-16 (`fecha-de-cartera.md`): dos fechas, la de inicio y
                la de cartera; el primer mes se cobra desde la de cartera. */}
            <Field
              id={idDelCampoDelContrato('fechaDeCartera')}
              label="Desde cuándo se cobra (opcional)"
              error={errorDe('fechaDeCartera')}
              hint="El día en que recibe el inmueble. Vacío = desde la fecha de inicio."
            >
              <Input
                type="date"
                {...ariaDelCampoDelContrato('fechaDeCartera', errorDe('fechaDeCartera'))}
                value={form.fechaDeCartera}
                min={form.startDate || undefined}
                max={form.endDate || undefined}
                onChange={(e) => updateForm('fechaDeCartera', e.target.value)}
                data-testid="fecha-de-cartera"
              />
            </Field>
            {/* El monto se agrupa DENTRO del campo. La ayudita de abajo repetía
                la misma cifra formateada, que es donde nadie mira mientras
                escribe; ahora sólo queda el mínimo, que sí dice algo. */}
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
            {pideDeposito && (
              <Field id={idDelCampoDelContrato('deposit')} label="Depósito (COP)" error={errorDe('deposit')} hint="Sólo en comercial: en vivienda la ley no lo permite.">
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
              hint={
                valoresDelBack?.reglaDeCobro?.plazoSinFijar === true
                  ? 'Vacío = los de la inmobiliaria, que todavía no los fijó: hasta que los fije no corre mora. Días después del vencimiento en los que todavía no corre mora.'
                  : porDefecto?.diasDePlazo != null
                  ? `Vacío = los de la inmobiliaria (${porDefecto.diasDePlazo === 1 ? '1 día' : `${porDefecto.diasDePlazo} días`}). Días después del vencimiento en los que todavía no corre mora.`
                  : 'Vacío = los de la inmobiliaria. Días después del vencimiento en los que todavía no corre mora.'
              }
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
              {/* C-13: de dónde sale lo que se propone (mientras nadie lo cambie). */}
              {valoresDelBack && form.prorratearPrimerMes === valoresDelBack.prorratear ? (
                <p className="text-caption text-fg-subtle" data-testid="origen-del-prorrateo">
                  {porQueSeProponeElProrrateo(valoresDelBack)}
                </p>
              ) : null}
            </div>
            <Switch
              id="prorratear-primer-mes"
              data-testid="prorratear-primer-mes"
              checked={form.prorratearPrimerMes}
              onCheckedChange={(v) => updateForm('prorratearPrimerMes', v)}
            />
          </div>
        </section>

        {/* El resumen: fijo bajo el encabezado del panel mientras la columna
            de la izquierda se recorre. Errors + submit van adentro: el botón
            queda al lado de lo que falta para poder apretarlo. */}
        <ResumenDelContratoNuevo
          className="xl:sticky xl:top-20"
          inmueble={esManual ? inmuebleElegido : property?.title ?? null}
          inquilino={inquilinoDelResumen}
          documento={documentoDelResumen}
          canon={canonDelResumen}
          deposito={pideDeposito && Number(form.deposit) > 0 ? Number(form.deposit) : null}
          inicio={form.startDate}
          fin={form.endDate}
          meses={mesesDelResumen}
          primerCanon={primerCanonDelResumen}
          comoSeCobra={comoSeCobra}
          bloqueos={bloqueosDelResumen}
        >
          <Presence
            show={loQueFalta.length > 0}
            initial={false}
            distance="xs"
            as="p"
            className="text-sm text-fg-muted"
            data-testid="lo-que-falta"
          >
            Para crearlo falta {enLista(loQueFalta.map((clave) => FALTA[clave]))}.
          </Presence>
          <Presence
            show={Boolean(submitError)}
            initial={false}
            className="rounded-lg border border-danger/30 bg-danger-soft/40 p-4 flex items-start gap-2"
          >
            <WarningCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
            <p className="text-sm text-danger">{submitError}</p>
          </Presence>
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
              disabled={
                !isValid ||
                actions.isSubmitting ||
                bloqueoDeInventario !== null ||
                (!esManual && property?.canonPorConfirmar === true) ||
                (esManual && inmuebleManualSinCanon !== null)
              }
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
        </ResumenDelContratoNuevo>
        </div>
      </form>
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

function ModeOption({
  marca,
  active,
  disabled,
  onClick,
  title,
  desc,
  icon: Icon,
  badge,
}: {
  /** `layoutId` de la marca de la elegida: la misma en las tres tarjetas. */
  marca: string;
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
        'relative isolate text-left p-4 rounded-lg border transition-colors',
        active && 'border-transparent',
        !active && !disabled && 'border-border hover:border-primary/40 hover:bg-muted/50',
        disabled && 'border-border opacity-50 cursor-not-allowed'
      )}
    >
      {/* El borde y el fondo de la elegida son UNA marca que se desliza a la
          nueva (`MotionIndicator`), no un color que se prende y se apaga. */}
      {active && (
        <MotionIndicator
          layoutId={marca}
          className="-inset-px -z-10 rounded-lg border border-primary/40 bg-primary-soft/40"
        />
      )}
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

/** «5 años», «1 año»: sin el «año(s)» de antes. */
function anios(n: number): string {
  return `${n} ${n === 1 ? 'año' : 'años'}`;
}

// ─── Export ──────────────────────────────────────────────────────────────────

export default function NuevoContratoPage() {
  return (
    <PageGuard module="contratos" action="create">
      <NuevoContratoContent />
    </PageGuard>
  );
}
