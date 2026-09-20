'use client';
import { AsignarAgente } from '@/components/inmobiliaria/AsignarAgente';
import { CandidatosDelInmueble } from '@/components/inmobiliaria/CandidatosDelInmueble';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { PageGuard } from '@/components/auth/PageGuard';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CaretLeft, Buildings, CalendarPlus, WifiSlash } from '@phosphor-icons/react';
import { toast } from '@/components/ui/toast';
import { motivosDelError } from '@/lib/errores/descripcion-del-error';
import { useI18n } from '@/lib/i18n';
import { Button, EmptyState } from '@/components/ui';
import { Skeleton } from '@/components/ui/skeleton';
import { FotosDelInmueble } from '@/components/inmobiliaria/FotosDelInmueble';
import { VisitasDelInmueble } from '@/components/inmobiliaria/VisitasDelInmueble';
import { ComprobantesDelSistemaAnterior } from '@/components/contabilidad/ComprobantesDelSistemaAnterior';
import { VisorDeFotos } from '@/components/inmobiliaria/inmueble/VisorDeFotos';
import { UbicacionDelInmueble } from '@/components/inmobiliaria/inmueble/UbicacionDelInmueble';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { consignacionesApi } from '@/lib/api/inmobiliaria.service';
import {
  useConsignacion,
  usePropietario,
  useAgenteDeConsignacion,
} from '@/lib/hooks/useInmobiliaria';
import { useProperty } from '@/lib/hooks/useProperties';
import type { PropertyAvailability, Consignacion } from '@/lib/types/inmobiliaria';

// Components
import { ConsignacionHeader } from '@/components/inmobiliaria/ConsignacionHeader';
import {
  PropertyInfoSection,
  PropietarioSection,
  AgenteSection,
  CurrentLeaseSection,
  DocumentsSection,
} from '@/components/inmobiliaria/ConsignacionDetailSections';
import { EditarPropietariosDialog } from '@/components/inmobiliaria/EditarPropietariosDialog';
import { InventarioDelInmueble } from '@/components/inmobiliaria/inventario/InventarioDelInmueble';
import { ConsignacionTimeline } from '@/components/inmobiliaria/ConsignacionTimeline';
import { ConsignacionEditForm } from '@/components/inmobiliaria/ConsignacionEditForm';
// 🔴 C-05 y la firma del mandato (18-09-2026): los papeles que hacen falta
// antes de publicar y antes del primer giro, y la firma en sus dos formas.
// Va al lado del inventario porque es el mismo tipo de dato: lo que el mandato
// necesita para poder operar.
import { MandatoDelInmueble } from '@/components/inmobiliaria/captacion/MandatoDelInmueble';
import { ModalidadDelMandato } from '@/components/inmobiliaria/mandato/ModalidadDelMandato';
import {
  RetiroDeLaAdministracionDialog,
  RetiroRegistrado,
} from '@/components/inmobiliaria/mandato/RetiroDeLaAdministracion';
import { ApiError } from '@/lib/api/client';
import { PedirCitaModal } from '@/components/inmobiliaria/agenda/PedirCitaModal';
import { usePuedeEditarInventario } from '@/lib/hooks/use-puede-editar-inventario';
import { useCopiaDeInmueble } from '@/lib/hooks/use-copia-de-inmueble';
import { useSinSenal } from '@/lib/hooks/use-sin-senal';
import { registrarServiceWorker } from '@/lib/inventario/sw-inventario';
import { cuando as cuandoSeGuardo } from '@/components/inmobiliaria/PrepararParaSinSenal';

/** La forma de la ficha, sin datos: cabecera con foto y dos columnas. */
function EsqueletoDeLaFicha() {
  return (
    <div className="p-4 md:p-6 space-y-6" data-testid="ficha-cargando" aria-busy="true">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>
      <div className="rounded-lg border border-border dark:border-border-strong bg-surface dark:bg-bg overflow-hidden">
        <div className="flex flex-col lg:flex-row">
          <Skeleton className="w-full lg:w-80 xl:w-96 h-48 lg:h-72 rounded-none" />
          <div className="flex-1 p-5 lg:p-6 space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-7 w-28 rounded-full" />
              <Skeleton className="h-7 w-40 rounded-full" />
            </div>
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-10 w-48" />
            <div className="flex gap-3 pt-2">
              <Skeleton className="h-11 w-28 rounded-full" />
              <Skeleton className="h-11 w-36 rounded-full" />
              <Skeleton className="h-11 w-40 rounded-full" />
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-56 rounded-lg" />
          <Skeleton className="h-72 rounded-lg" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/**
 * Consignacion Detail Page
 * Route: /panel/inmobiliaria/inmuebles/[id]
 */
function ConsignacionDetailContent() {
  const { t } = useI18n();
  const params = useParams();
  const router = useRouter();

  const consignacionId = params.id as string;

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [consignacionData, setConsignacionData] = useState<Consignacion | null>(null);
  const [showTerminateDialog, setShowTerminateDialog] = useState(false);
  /**
   * F5 — por qué NO se pudo terminar el mandato, dentro del propio diálogo.
   *
   * Antes el motivo del back viajaba en la descripción de un toast: se iba
   * solo a los pocos segundos, mientras el diálogo seguía abierto sin decir
   * nada. Y cuando el 400 venía del `ValidationPipe` (varios motivos
   * concatenados con « · »), el texto pasaba el tope del toast y ni siquiera
   * aparecía. Es el mismo trato que ya le da «Retirar» a su 409 en la lista de
   * Inmuebles: el motivo se queda al lado del botón que lo produjo.
   */
  const [motivoAlTerminar, setMotivoAlTerminar] = useState<string[]>([]);
  const [isTerminating, setIsTerminating] = useState(false);
  /**
   * 🔴 17-09: con contrato vigente, terminar OBLIGA a escoger qué pasa con él
   * (seguir hasta el fin o corte a una fecha). Ese diálogo reemplaza al de
   * siempre; el back además lo exige (409 RETIRO_SIN_ESCOGER).
   */
  const [showRetiro, setShowRetiro] = useState(false);
  const [showCitaModal, setShowCitaModal] = useState(false);
  const [showAsignarAgente, setShowAsignarAgente] = useState(false);
  const [showCambiarPropietario, setShowCambiarPropietario] = useState(false);
  // Visor de fotos: qué foto está abierta en grande (`null` = cerrado). La
  // abren la portada del encabezado y cada miniatura de la galería.
  const [fotoAbierta, setFotoAbierta] = useState<number | null>(null);

  // Fetch data
  // `errorCrudo`, no `error`: sin el status `FalloDeCarga` no distingue un 404
  // —donde reintentar es mentir— de un 500 o de la red caída (F1).
  const {
    consignacion: fetchedConsignacion,
    isLoading: cargandoConsignacion,
    errorCrudo: errorConsignacion,
    refetch: reintentarConsignacion,
  } = useConsignacion(consignacionId);

  /*
   * 🔴 Abrir la ficha YA estando sin señal.
   *
   * Nico, 2026-09-12: «hay muchos apartamentos donde no hay señal; la persona
   * que hace el inventario debería poder agregar todo sin señal y, cuando
   * tenga señal, cargarlo».
   *
   * Son dos piezas y hacen falta las dos. El service worker sirve el HTML de
   * esta ruta —sin él el navegador ni llega acá— y esta copia le da los
   * DATOS: sin ella la pantalla se arma vacía aunque el HTML sí llegue. La
   * copia se refresca sola en cada visita con señal, y el botón de la columna
   * derecha la baja a propósito antes de salir de la oficina.
   */
  const sinSenal = useSinSenal();
  const copiaLocal = useCopiaDeInmueble(consignacionId, fetchedConsignacion ?? undefined);

  // El worker se registra desde acá —no en el layout— porque es lo único que
  // cachea, y sólo en producción o con `NEXT_PUBLIC_SW_INVENTARIO=1`.
  useEffect(() => {
    void registrarServiceWorker();
  }, []);

  /*
   * El orden importa y es el mismo de siempre con un escalón más al final: lo
   * que se acaba de editar gana sobre lo que trajo el back, y lo del back gana
   * sobre la copia. La copia es la RED DE SEGURIDAD, nunca la fuente: en
   * cuanto el back contesta, manda él.
   */
  const consignacion = consignacionData || fetchedConsignacion || copiaLocal.copia?.consignacion;
  /** Se está mostrando lo guardado porque el back no contestó. */
  const mostrandoCopia = Boolean(
    !consignacionData && !fetchedConsignacion && copiaLocal.copia,
  );

  // `?editar=1` (el «Editar» del kebab de la lista) abre el formulario apenas
  // hay datos, y se limpia la URL para que un refresh no lo vuelva a abrir.
  const searchParams = useSearchParams();
  useEffect(() => {
    if (consignacion && searchParams.get('editar') === '1') {
      setShowEditModal(true);
      router.replace(`/panel/inmobiliaria/inmuebles/${consignacionId}`, { scroll: false });
    }
  }, [consignacion, searchParams, router, consignacionId]);

  const { propietario } = usePropietario(consignacion?.propietarioId);
  // Por `userId` o por `id`: el back guarda el del usuario y `getById`
  // esperaba el del miembro, así que nunca resolvía. Ver el hook.
  const { agente } = useAgenteDeConsignacion(consignacion?.agenteId);
  // The photos live on the Property entity, not on the consignación
  // (consignacion.propertyThumbnail is never populated by the back — see
  // ledger §2.1). A failed/loading fetch just leaves `property` unset, which
  // ConsignacionHeader already renders as its placeholder icon.
  const {
    property,
    isLoading: cargandoProperty,
    refetch: refetchProperty,
  } = useProperty(consignacion?.propertyId);

  // Después de adjuntar el contrato la ficha vuelve a leer el mandato. Va a
  // la copia local (`consignacionData`), que gana sobre lo que trae el hook:
  // refrescar el hook solo no cambiaba nada en pantalla.
  const recargarConsignacion = useCallback(async () => {
    try {
      setConsignacionData(await consignacionesApi.getById(consignacionId));
    } catch {
      // La subida ya avisó por su lado; si la relectura falla, el refresh la trae.
    }
  }, [consignacionId]);

  // Handlers
  const handleEdit = useCallback(() => {
    setShowEditModal(true);
  }, []);

  /*
   * El cajón «Editar» guarda solo (inmueble + mandato) y relee el mandato;
   * acá sólo se toma lo releído y se vuelve a pedir el inmueble, que es de
   * donde salen las fotos, las coordenadas y el resto de la ficha.
   */
  const handleEditGuardado = useCallback(
    (actualizada: Consignacion) => {
      setConsignacionData(actualizada);
      refetchProperty();
    },
    [refetchProperty],
  );

  /*
   * 🔴 Un mandato TERMINADO (Nico, 2026-09-13: «es súper raro» que la ficha
   * siguiera igual). La fecha en que terminó no tiene columna: sale del evento
   * `consignacion_terminada` del historial, que el back deja al terminar. Un
   * mandato terminado antes de que existiera ese evento no tiene fecha, y el
   * banner lo dice sin inventarla.
   */
  const terminada = consignacion?.status === 'terminated';
  const [fechaDeTerminacion, setFechaDeTerminacion] = useState<string | null>(null);
  useEffect(() => {
    if (!terminada || !consignacionId) {
      setFechaDeTerminacion(null);
      return;
    }
    let cancelado = false;
    consignacionesApi
      .getHistorial(consignacionId)
      .then((eventos) => {
        if (cancelado) return;
        const evento = eventos.find((e) => e.tipo === 'consignacion_terminada');
        setFechaDeTerminacion(evento?.fecha ?? null);
      })
      .catch(() => {
        // Sin historial el banner sale sin fecha; no es un error de la ficha.
      });
    return () => {
      cancelado = true;
    };
  }, [terminada, consignacionId]);
  // «Arrendado» de verdad = contrato vigente: `arrendado` lo calcula el back
  // mirando los contratos ACTIVE; `propertyStatus` lo pone el ciclo de vida
  // del contrato; `currentLeaseId` es el arriendo vigente del mandato.
  // `availability` NO cuenta: es lo que alguien marcó a mano.
  const contratoVigente =
    consignacion?.arrendado === true ||
    consignacion?.propertyStatus === 'RENTED' ||
    !!consignacion?.currentLeaseId;

  // The header disables the button whenever propertyId is missing, but the
  // guard is repeated here in case that ever stops being true — a click that
  // opens a blank/broken tab is worse than one that silently does nothing.
  const handleViewPortal = useCallback(() => {
    if (!consignacion?.propertyId) return;
    window.open(`/propiedades/${consignacion.propertyId}`, '_blank', 'noopener,noreferrer');
  }, [consignacion]);

  const handleChangeStatus = useCallback(async (newStatus: PropertyAvailability) => {
    if (!consignacion) return;
    const statusLabels: Record<PropertyAvailability, string> = {
      available: t('inmobiliaria.portafolio.status.available'),
      rented: t('inmobiliaria.portafolio.status.rented'),
      in_process: t('inmobiliaria.portafolio.detail.statusLabels.inProcess'),
      maintenance: t('inmobiliaria.portafolio.status.maintenance'),
    };
    try {
      // PUT /inmobiliaria/consignaciones/:id { availability } (service uppercases)
      const updated = await consignacionesApi.update(consignacion.id, {
        availability: newStatus,
      });
      setConsignacionData(updated);
      toast.success(t('inmobiliaria.portafolio.detail.toasts.statusChanged', { status: statusLabels[newStatus] }), {
        description: t('inmobiliaria.portafolio.detail.toasts.changesSaved'),
      });
    } catch (err) {
      // F5: un 400 del back trae sus motivos sueltos y `ApiError` los pega con
      // « · ». El pegote pasa el tope del toast y se perdía entero; acá se
      // pinta el primero, que es el que dice qué hay que cambiar.
      const motivos = motivosDelError(err);
      toast.error(t('inmobiliaria.portafolio.detail.toasts.statusChangeError'), {
        description: motivos[0],
      });
    }
  }, [consignacion, t]);

  // Opens the destructive confirmation; the PUT happens in handleTerminateConfirm.
  // Con contrato vigente abre el retiro de la administración (17-09).
  const handleTerminate = useCallback(() => {
    if (contratoVigente) setShowRetiro(true);
    else setShowTerminateDialog(true);
  }, [contratoVigente]);

  const handleTerminateConfirm = useCallback(async () => {
    if (!consignacion || isTerminating) return;
    setIsTerminating(true);
    setMotivoAlTerminar([]);
    try {
      // PUT /inmobiliaria/consignaciones/:id { status: TERMINATED }
      const updated = await consignacionesApi.update(consignacion.id, {
        status: 'terminated',
      });
      setConsignacionData(updated);
      setShowTerminateDialog(false);
      toast.success(t('inmobiliaria.portafolio.detail.toasts.terminated'));
    } catch (err) {
      // El back descubrió un contrato vigente que la ficha no veía: se escoge.
      if (err instanceof ApiError && err.code === 'RETIRO_SIN_ESCOGER') {
        setShowTerminateDialog(false);
        setShowRetiro(true);
        return;
      }
      // El diálogo NO se cierra: el motivo se queda donde se apretó el botón.
      const motivos = motivosDelError(err);
      setMotivoAlTerminar(motivos);
      if (motivos.length === 0) {
        // Un 5xx o un corte de red no explican nada: ahí sí el texto genérico.
        toast.error(t('inmobiliaria.portafolio.detail.toasts.terminateError'));
      }
    } finally {
      setIsTerminating(false);
    }
  }, [consignacion, isTerminating, t]);

  /*
   * 🔴 Acá vivía `handleRenew`, que sólo hacía
   * `toast.info('Renovar consignación próximamente')`.
   *
   * No hay endpoint de renovación de consignación: `consignacionesApi` no lo
   * tiene y el back tampoco (`RenovacionesService` renueva CONTRATOS, que es
   * otra cosa — el mandato con el propietario no pasa por ahí). Un ítem de
   * menú que sólo se disculpa ocupa el lugar de la acción real y hace perder
   * un clic cada vez, así que se retiró junto con su renglón del menú
   * (`ConsignacionHeader`). Vuelve el día que exista la ruta.
   */

  /*
   * Antes esto era un toast de «próximamente». Con eso, un inmueble sin agente
   * no tenía forma de conseguir uno: el vacío no ofrecía nada y el botón de la
   * tarjeta con agente tampoco hacía nada. El back tenía la ruta desde hace
   * rato (`PUT /consignaciones/:id/assign-agent`).
   */
  const handleReassignAgent = useCallback(() => {
    setShowAsignarAgente(true);
  }, []);

  /**
   * El inventario vive en la consignación como lista completa (PUT
   * …/inventario), y se carga desde que el inmueble entra a la agencia — sin
   * contrato, entrega ni acta. Todo el flujo —tarjeta, diálogo, borrador sin
   * señal— vive en `InventarioDeLaConsignacion`, que es el MISMO que monta la
   * ficha del contrato desde que Nico pidió (2026-09-13) poder cargarlo desde
   * allá: dos copias del flujo se desincronizan al primer arreglo.
   */
  const puedeEditarInventario = usePuedeEditarInventario();

  // Mientras se pide, un esqueleto con la forma de la ficha. Antes esto
  // salía directo a «Consignación no encontrada» durante la carga y recién
  // después aparecía el inmueble (Nico, 2026-09-02: «primero sale esto y
  // luego carga, muy raro»).
  if (!consignacion && cargandoConsignacion) {
    return <EsqueletoDeLaFicha />;
  }

  /*
   * F1 (P0): cualquier fallo —un 500, un 403, la red caída— caía abajo en
   * «Consignación no encontrada» con un «Volver»: una afirmación sobre la base
   * que nadie verificó (quien la lee piensa que la borraron) y sin forma de
   * reintentar. `FalloDeCarga` clasifica el error: sobre un 404 real dice «no
   * existe» y no ofrece reintentar; sobre lo demás dice qué pasó y reintenta.
   * Mismo patrón que la ficha del propietario.
   *
   * Sin señal va primero su propio aviso («no la preparaste»): ahí el fallo
   * de red es lo esperado y ese cartel lo explica mejor.
   */
  if (!consignacion && errorConsignacion && !sinSenal) {
    return (
      <div className="p-4 md:p-6" data-testid="ficha-fallo">
        <div className="max-w-lg mx-auto py-16">
          <FalloDeCarga
            error={errorConsignacion}
            queEs="el inmueble"
            onReintentar={reintentarConsignacion}
            volverA={{
              label: t('inmobiliaria.portafolio.detail.backToPortfolio'),
              href: '/panel/inmobiliaria/inmuebles',
            }}
          />
        </div>
      </div>
    );
  }

  // Respondió sin error y sin consignación, o sin señal y sin copia.
  if (!consignacion) {
    return (
      <div className="p-4 md:p-6">
        <div className="max-w-lg mx-auto py-16">
          {/* Sin señal y sin copia no es «no existe»: es «no lo preparaste».
              Decir «Consignación no encontrada» ahí manda a buscar un
              problema que no existe. */}
          <EmptyState
            icon={sinSenal ? WifiSlash : Buildings}
            title={
              sinSenal
                ? t('inmobiliaria.sinSenal.sinCopia')
                : t('inmobiliaria.portafolio.detail.notFound')
            }
            description={
              sinSenal
                ? t('inmobiliaria.sinSenal.explicacion')
                : t('inmobiliaria.portafolio.detail.notFoundDesc')
            }
            action={{
              label: t('inmobiliaria.portafolio.detail.backToPortfolio'),
              href: '/panel/inmobiliaria/inmuebles',
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Sin señal la ficha se arma con lo guardado. Decirlo con la FECHA es
          lo único honesto: las tarjetas que piden otras llamadas —fotos,
          propietario, candidatos— van a salir vacías, y sin este cartel eso
          se lee como «el inmueble no tiene nada». */}
      {mostrandoCopia && copiaLocal.guardadoEn && (
        <div
          role="status"
          className="rounded-md bg-warning-soft border border-border p-3 text-sm text-warning"
          data-testid="viendo-copia-sin-senal"
        >
          {t('inmobiliaria.sinSenal.viendoCopia', {
            cuando: cuandoSeGuardo(copiaLocal.guardadoEn),
          })}
        </div>
      )}

      {/* Breadcrumb + agendar cita */}
      <div className="flex items-center justify-between gap-4">
        <nav className="flex items-center gap-2 text-sm min-w-0">
          <Link
            href="/panel/inmobiliaria/inmuebles"
            className="flex items-center gap-1.5 text-fg-muted hover:text-primary transition-colors"
          >
            <CaretLeft className="w-4 h-4" />
            {t('inmobiliaria.portafolio.title')}
          </Link>
          <span className="text-border">/</span>
          <span className="text-fg font-medium truncate max-w-[200px]">
            {consignacion.propertyTitle}
          </span>
        </nav>
        <Button
          hideArrow
          className="shrink-0"
          onClick={() => setShowCitaModal(true)}
          // F11: sin inmueble asociado no hay a dónde agendar la visita.
          disabled={terminada || !consignacion.propertyId}
          title={
            terminada
              ? t('inmobiliaria.consignaciones.header.terminada.pedirCita')
              : !consignacion.propertyId
                ? 'Esta consignación no tiene un inmueble asociado: no hay a dónde agendar la visita.'
                : undefined
          }
          data-testid="pedir-cita"
        >
          <CalendarPlus className="w-4 h-4" />
          {t('inmobiliaria.agenda.pedirCita')}
        </Button>
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <ConsignacionHeader
          consignacion={consignacion}
          propertyThumbnailUrl={property?.thumbnailUrl}
          fotos={property?.images}
          onVerFotos={() => setFotoAbierta(0)}
          onEdit={handleEdit}
          onViewPortal={handleViewPortal}
          onChangeStatus={handleChangeStatus}
          onTerminate={handleTerminate}
          fechaDeTerminacion={fechaDeTerminacion}
          contratoVigente={contratoVigente}
        />
      </motion.div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <PropertyInfoSection consignacion={consignacion} />
          </motion.div>

          {/* Las coordenadas viven en el Property (la consignación no las
              tiene). Sin propertyId no hay mapa que mostrar. */}
          {consignacion.propertyId && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.11 }}
            >
              <UbicacionDelInmueble
                property={property}
                cargando={cargandoProperty}
                consignacion={consignacion}
                onActualizado={refetchProperty}
              />
            </motion.div>
          )}

          {/* Las fotos viven en el Property; sin propertyId (mandato sin
              inmueble) no hay galería que mostrar. */}
          {consignacion.propertyId && (
            <motion.div
              id="fotos"
              className="scroll-mt-20"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
            >
              <FotosDelInmueble propertyId={consignacion.propertyId} onCambio={refetchProperty} onVer={setFotoAbierta} />
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <PropietarioSection
              propietario={propietario ?? undefined}
              copropietarios={consignacion.copropietarios}
              onCambiar={() => setShowCambiarPropietario(true)}
              rutaDeOrigen={`/panel/inmobiliaria/inmuebles/${consignacionId}`}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <AgenteSection
              agente={agente ?? undefined}
              commissionPercent={consignacion.commissionPercent}
              isSaleListing={consignacion.listingType === 'sale'}
              onReassign={handleReassignAgent}
            />
          </motion.div>

          {/* D1 y D2 (17-09): con qué modalidad se le gira al propietario y de
              quién son los intereses de mora. */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.21 }}
          >
            <ModalidadDelMandato
              consignacionId={consignacion.id}
              esVenta={consignacion.listingType === 'sale'}
              terminada={terminada}
            />
          </motion.div>

          {terminada ? <RetiroRegistrado consignacionId={consignacion.id} /> : null}

          {/* Quién se postuló. Vive acá, antes del contrato vigente: es lo que
              pasa mientras el inmueble está disponible. */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
          >
            <CandidatosDelInmueble
              propertyId={consignacion.propertyId}
              consignacionId={consignacion.id}
            />
          </motion.div>

          {/* Cuándo se puede visitar. Va junto a los candidatos porque es lo
              otro que pasa mientras el inmueble está disponible — y sin esto
              el aviso del marketplace dice «Sin disponibilidad» siempre. */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.23 }}
          >
            <VisitasDelInmueble propertyId={consignacion.propertyId} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <CurrentLeaseSection consignacion={consignacion} />
          </motion.div>

          {/* La historia contable ANTERIOR a Leasefy de este inmueble: los
              comprobantes del sistema viejo que el back colgó de sus
              contratos, en tres pestañas (ingresos · egresos · facturas).
              Después del contrato vigente porque ése es el orden real —
              arriba lo de hoy, abajo lo que quedó registrado antes. */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.27 }}
          >
            <ComprobantesDelSistemaAnterior propertyId={consignacion.propertyId} />
          </motion.div>

          <motion.div
            id="documentos"
            className="scroll-mt-20"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <DocumentsSection consignacion={consignacion} onActualizado={() => void recargarConsignacion()} />
          </motion.div>
        </div>

        {/* Right Column - Sidebar (1/3) */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            {/* 🔴 Nico y Juan Camilo, 2026-09-16: el inventario es del inmueble,
                por versiones; sin la migración del back monta la tarjeta de siempre. */}
            <InventarioDelInmueble
              consignacion={consignacion}
              puedeEditar={puedeEditarInventario}
              copiaLocal={copiaLocal}
              sinSenal={sinSenal}
              onActualizada={setConsignacionData}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 }}
          >
            <MandatoDelInmueble
              consignacionId={consignacion.id}
              propietarioNombre={propietario?.name ?? null}
              puedeEditar={puedeEditarInventario}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <ConsignacionTimeline
              consignacion={consignacion}
              agenteName={agente?.name}
            />
          </motion.div>
        </div>
      </div>

      <VisorDeFotos
        fotos={property?.images ?? []}
        indice={fotoAbierta}
        onCerrar={() => setFotoAbierta(null)}
        onCambiar={setFotoAbierta}
        titulo={consignacion.propertyTitle}
      />

      {/* El cajón «Editar»: inmueble + mandato en un solo lugar. */}
      <ConsignacionEditForm
        abierto={showEditModal}
        onCerrar={() => setShowEditModal(false)}
        consignacion={consignacion}
        property={property}
        cargandoProperty={cargandoProperty}
        onGuardado={handleEditGuardado}
      />

      {/* Los dueños y su reparto (uno o varios, con su % del canon): edita la
          lista del mandato, no lo tumba. Es el mismo diálogo que abre la
          tarjeta «Partes» del contrato. */}
      {consignacion && (
        <EditarPropietariosDialog
          open={showCambiarPropietario}
          consignacion={consignacion}
          onClose={() => setShowCambiarPropietario(false)}
          onGuardado={(actualizada) => setConsignacionData(actualizada)}
        />
      )}

      {/* Terminate confirmation — shadcn AlertDialog, NOT browser confirm() */}
      <AlertDialog
        open={showTerminateDialog}
        onOpenChange={(open) => {
          if (!open && !isTerminating) {
            setShowTerminateDialog(false);
            setMotivoAlTerminar([]);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('inmobiliaria.portafolio.detail.terminateDialog.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('inmobiliaria.portafolio.detail.terminateDialog.body', {
                property: consignacion.propertyTitle,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {motivoAlTerminar.length > 0 && (
            <div
              role="alert"
              data-testid="terminar-rechazo"
              className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
            >
              {motivoAlTerminar.length === 1 ? (
                motivoAlTerminar[0]
              ) : (
                <ul className="list-disc space-y-1 pl-4">
                  {motivoAlTerminar.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isTerminating}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              tone="danger"
              onClick={handleTerminateConfirm}
              disabled={isTerminating}
            >
              {t('inmobiliaria.portafolio.detail.terminateDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RetiroDeLaAdministracionDialog
        consignacionId={consignacion.id}
        titulo={consignacion.propertyTitle}
        abierto={showRetiro}
        onCerrar={() => setShowRetiro(false)}
        onRetirado={() => {
          setShowRetiro(false);
          // Relee el mandato: el back lo dejó terminado.
          setConsignacionData(null);
          void recargarConsignacion();
        }}
      />

      <PedirCitaModal
        isOpen={showCitaModal}
        onClose={() => setShowCitaModal(false)}
        // Vacío a propósito: esta pantalla no lista citas, así que no hay nada
        // que recargar. Las citas viven en /panel/inmobiliaria/agenda, que las
        // relee al montar.
        onCreated={() => {}}
        presetPropertyId={consignacion.propertyId}
        presetPropertyTitle={consignacion.propertyTitle}
      />

      <AsignarAgente
        abierto={showAsignarAgente}
        onCerrar={() => setShowAsignarAgente(false)}
        consignacionId={consignacion.id}
        agenteActualId={consignacion.agenteId}
        // La copia local gana sobre lo que trae el hook (`consignacionData ||
        // fetchedConsignacion`), así que hay que soltarla: si no, el refresco
        // llega y la pantalla sigue mostrando el agente viejo.
        onAsignado={() => setConsignacionData(null)}
      />
    </div>
  );
}

export default function ConsignacionDetailPage() {
  return (
    <PageGuard module="portafolio">
      <ConsignacionDetailContent />
    </PageGuard>
  );
}
