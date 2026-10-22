'use client';
import { AvisoDelMandatoQueVence } from '@/components/comercial/SituacionComercial';
import { useVacanciaYMandatos } from '@/lib/comercial/use-vacancia-y-mandatos';
import { esVacanciaLarga } from '@/lib/comercial/comercial';
import { FranjaDelArriendo } from '@/components/inmobiliaria/ficha/FranjaDelArriendo';
import { FichaDelInmueble, caracteristicasDelInmueble } from '@/components/inmobiliaria/ficha/FichaDelInmueble';
import { CandidatosQueEsperan } from '@/components/inmobiliaria/ficha/CandidatosQueEsperan';
import { LoQueFaltaDelInmueble } from '@/components/inmobiliaria/ficha/LoQueFaltaDelInmueble';
import { PropietariosDelResumen } from '@/components/inmobiliaria/ficha/PropietariosDelResumen';
import { tieneCoordenadas } from '@/components/map/coordenadas';
import { AsignarAgente } from '@/components/inmobiliaria/AsignarAgente';
import { useAsesores, rolDelAsesor } from '@/lib/hooks/use-asesores';
import { CandidatosDelInmueble } from '@/components/inmobiliaria/CandidatosDelInmueble';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { BackButton } from '@/components/ui/back-button';
import { PageGuard } from '@/components/auth/PageGuard';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PestanasDeLaFicha } from '@/components/pantalla/PestanasDeLaFicha';
import { MasDetalles } from '@/components/pantalla/MasDetalles';
import { portadaDelInmueble } from '@/lib/inmuebles/titulo-de-la-ficha';
import { CrossFade } from '@leasefy/cadence';
import { CaretLeft, Buildings, CalendarPlus, WifiSlash, Prohibit } from '@phosphor-icons/react';
import { toast } from '@/components/ui/toast';
import { motivosDelError } from '@/lib/errores/descripcion-del-error';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { useI18n } from '@/lib/i18n';
import { Button, EmptyState } from '@/components/ui';
import { Skeleton } from '@/components/ui/skeleton';
import { FotosDelInmueble } from '@/components/inmobiliaria/FotosDelInmueble';
import { PublicadoEnElMarketplace } from '@/components/inmobiliaria/marketplace/PublicadoEnElMarketplace';
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
import { usePermissions } from '@/lib/hooks/usePermissions';
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
  TerminosDelMandatoSection,
  PropietarioSection,
  AgenteSection,
  DocumentsSection,
} from '@/components/inmobiliaria/ConsignacionDetailSections';
import { FirmaElectronicaDeConsignacionSection } from '@/components/inmobiliaria/consignacion/FirmaElectronicaDeConsignacionSection';
import { EditarPropietariosDialog } from '@/components/inmobiliaria/EditarPropietariosDialog';
import { InventarioDelInmueble } from '@/components/inmobiliaria/inventario/InventarioDelInmueble';
import { rutaDeRegreso } from '@/lib/nav/ruta-de-regreso';
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
import { BitacoraDelRecurso } from '@/components/movimientos/BitacoraDelRecurso';

/**
 * La forma de la ficha, sin datos (revisión 21-10: el esqueleto tiene la forma de
 * lo que llega): la fila de las migas con las acciones, la portada con su franja
 * de tres datos, las pestañas y el Resumen en 2/3 + 1/3.
 */
function EsqueletoDeLaFicha() {
  return (
    <div className="space-y-6 p-6 lg:p-8" data-testid="ficha-cargando" aria-busy="true">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-5 w-40 sm:w-64" />
        <div className="flex gap-2">
          <Skeleton className="hidden h-9 w-40 rounded-full sm:block" />
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>
      <div className="overflow-hidden rounded-[28px] border border-border-faint bg-surface dark:border-border-strong dark:bg-bg">
        <div className="flex flex-col lg:flex-row">
          <Skeleton className="h-44 w-full rounded-none sm:h-56 lg:h-[320px] lg:w-[340px] xl:w-[380px]" />
          <div className="flex-1 space-y-4 p-6 lg:p-8">
            <div className="flex gap-2">
              <Skeleton className="h-[22px] w-24 rounded-[6px]" />
              <Skeleton className="h-[22px] w-28 rounded-[6px]" />
            </div>
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-10 w-56" />
            <div className="grid grid-cols-1 gap-5 border-t border-border-faint pt-6 sm:grid-cols-3 dark:border-border-strong">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex gap-6 border-b border-border-faint pb-3 dark:border-border-strong">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-4 w-20" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-44 rounded-[24px] lg:col-span-2" />
        <Skeleton className="h-44 rounded-[24px]" />
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
  /*
   * Fuera de la migración (QA-MIGRACION-95, pedido de main, 06-10): quien sólo
   * tiene el id del INMUEBLE (la ficha del contrato, el cajón del candidato)
   * entra con `?por=inmueble`. Así se busca el mandato por el inmueble, sin el
   * `GET /consignaciones/<id del inmueble>` que daba 404 en cada ficha, y
   * después la URL pasa a la del mandato (la que usan Editar, Candidatos, el
   * acta…).
   */
  const parametrosDeEntrada = useSearchParams();
  const entraPorInmueble = parametrosDeEntrada.get('por') === 'inmueble';
  const {
    consignacion: fetchedConsignacion,
    isLoading: cargandoConsignacion,
    errorCrudo: errorConsignacion,
    refetch: reintentarConsignacion,
  } = useConsignacion(consignacionId, { porInmueble: entraPorInmueble });
  useEffect(() => {
    if (entraPorInmueble && fetchedConsignacion?.id && fetchedConsignacion.id !== consignacionId) {
      // Lo demás de la URL se queda (`volver`, `editar`): sin eso «Volver al
      // contrato» y «Ponerle el canon» se perdían en el cambio de dirección.
      const resto = new URLSearchParams(parametrosDeEntrada.toString());
      resto.delete('por');
      const consulta = resto.toString();
      router.replace(
        `/panel/inmobiliaria/inmuebles/${fetchedConsignacion.id}${consulta ? `?${consulta}` : ''}`,
        { scroll: false },
      );
    }
  }, [entraPorInmueble, fetchedConsignacion?.id, consignacionId, router, parametrosDeEntrada]);
  /*
   * 🔴 QA de Portofino (14-10-2026): con `?por=inmueble` el id de la URL es el
   * del INMUEBLE hasta que la dirección cambia. Lo que se pide por el id del
   * MANDATO (historial, situación comercial, releer) espera a tenerlo: antes
   * un mandato terminado pedía `consignaciones/<id del inmueble>/historial` →
   * 404 en cada ficha abierta desde el contrato.
   */
  const idDelMandato = fetchedConsignacion?.id ?? (entraPorInmueble ? null : consignacionId);

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
  // T-0109 contract.md §3.1.C — la sección de firma electrónica sólo ofrece
  // sus acciones (iniciar, cancelar, reenviar) con `portafolio:edit`.
  const { canAccess, agencyRole } = usePermissions();
  const puedeEditarPortafolio = canAccess('portafolio', 'edit');
  // P-03 (seguimiento): elegir el principal en un empate lo hacen el administrador o el contador.
  const puedeElegirPrincipal = agencyRole === 'ADMIN' || agencyRole === 'CONTADOR';
  /** Se está mostrando lo guardado porque el back no contestó. */
  const mostrandoCopia = Boolean(
    !consignacionData && !fetchedConsignacion && copiaLocal.copia,
  );

  // `?editar=1` (el «Editar» del kebab de la lista) abre el formulario apenas
  // hay datos, y se limpia la URL para que un refresh no lo vuelva a abrir.
  const searchParams = useSearchParams();
  // QA con avatares (04-10): desde «Nuevo contrato» («Hacer el inventario») se
  // llega con `?volver=`; el inventario ofrece regresar al contrato.
  const volverAlContrato = (() => {
    const ruta = rutaDeRegreso(searchParams.get('volver'), '');
    return ruta.startsWith('/panel/inmobiliaria/contratos') ? ruta : null;
  })();
  useEffect(() => {
    if (consignacion && searchParams.get('editar') === '1') {
      setShowEditModal(true);
      router.replace(`/panel/inmobiliaria/inmuebles/${consignacionId}`, { scroll: false });
    }
  }, [consignacion, searchParams, router, consignacionId]);

  const { propietario } = usePropietario(consignacion?.propietarioId);
  // Por `userId` o por `id`: el back guarda el del usuario y `getById`
  // esperaba el del miembro, así que nunca resolvía. Ver el hook.
  const { agente, isLoading: cargandoAgentes } = useAgenteDeConsignacion(consignacion?.agenteId);
  // QA 17-10 (IMANA-1): a cargo puede quedar una administradora, que no está
  // en la lista de agentes: su nombre sale de la de asesores (la de los leads).
  const { asesores, isLoading: cargandoAsesores } = useAsesores(Boolean(consignacion?.agenteId) && !cargandoAgentes && !agente);
  const encargado = useMemo(() => {
    if (agente || !consignacion?.agenteId) return null;
    const a = asesores.find((x) => x.userId === consignacion.agenteId);
    return a ? { nombre: a.nombre?.trim() || 'Sin nombre registrado', rol: rolDelAsesor(a.rol) } : null;
  }, [agente, asesores, consignacion?.agenteId]);
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
      if (!idDelMandato) return;
      setConsignacionData(await consignacionesApi.getById(idDelMandato));
    } catch {
      // La subida ya avisó por su lado; si la relectura falla, el refresh la trae.
    }
  }, [idDelMandato]);

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
  /*
   * Días vacante y mandato que se vence (COMERCIAL, 04-10): UNA lectura para
   * la ficha. La vacancia va en la franja de la portada; el mandato por vencer,
   * en un renglón sobre las pestañas. Fuente aparte: si falla, la ficha sigue.
   */
  const { porConsignacion: situaciones } = useVacanciaYMandatos(Boolean(consignacion) && !terminada);
  const situacion = idDelMandato ? situaciones[idDelMandato] : undefined;
  const [fechaDeTerminacion, setFechaDeTerminacion] = useState<string | null>(null);
  useEffect(() => {
    if (!terminada || !idDelMandato) {
      setFechaDeTerminacion(null);
      return;
    }
    let cancelado = false;
    consignacionesApi
      .getHistorial(idDelMandato)
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
  }, [terminada, idDelMandato]);
  // «Arrendado» de verdad = contrato vigente: `arrendado` lo calcula el back
  // mirando los contratos ACTIVE; `propertyStatus` lo pone el ciclo de vida
  // del contrato; `currentLeaseId` es el arriendo vigente del mandato.
  // `availability` NO cuenta: es lo que alguien marcó a mano.
  /** Cuántos candidatos esperan decisión (lo dice CandidatosQueEsperan); decide la acción azul. */
  const [candidatosEsperando, setCandidatosEsperando] = useState(0);
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
      // F5: un 400 del back trae sus motivos sueltos. Antes se pintaba sólo el
      // primero; ahora van todos, por el traductor (sistema de errores,
      // 02-10-2026): un 5xx dice «de nuestro lado» con la referencia y
      // «conexión» sólo si no hubo respuesta.
      toast.error(t('inmobiliaria.portafolio.detail.toasts.statusChangeError'), {
        description: mensajeParaLaPersona(err, { accion: 'cambiar el estado del inmueble' }),
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
  //
  // Esqueleto → ficha (o → fallo, → no existe): cada salida va en un
  // `CrossFade` con su clave, así lo que llega DESPUÉS de cargar entra con su
  // fundido. Lo que ya estaba al montarse (la ficha en caché) no se anima: la
  // página ya entra con su `template.tsx`, y las secciones no tienen entradas
  // propias ni retrasos a mano.
  if (!consignacion && cargandoConsignacion) {
    return (
      <CrossFade swapKey="esqueleto">
        <EsqueletoDeLaFicha />
      </CrossFade>
    );
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
    /*
     * 🔴 20-09 · Mismo arreglo que la ficha del contrato (ver su comentario):
     * el camino de vuelta va ARRIBA, donde vive en todas las pantallas del
     * panel, y no sólo adentro de la tarjeta. Sin encabezado, un fallo a
     * pantalla completa no dice en qué parte del panel estás.
     */
    return (
      <CrossFade swapKey="fallo">
      <div className="space-y-6 p-6 lg:p-8" data-testid="ficha-fallo">
        <BackButton
          href="/panel/inmobiliaria/inmuebles"
          label={t('inmobiliaria.portafolio.detail.backToPortfolio')}
        />
        {/* «Inmueble», no la clave `portafolio.detail.title` («Detalle de
            Propiedad»): el menú dice Inmuebles y el producto no llama
            «propiedad» a nada. */}
        <h1 className="text-h2 text-fg">Inmueble</h1>
        <div className="max-w-2xl">
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
      </CrossFade>
    );
  }

  // Respondió sin error y sin consignación, o sin señal y sin copia.
  if (!consignacion) {
    // Sin `CrossFade`: el `EmptyState` ya entra solo (8 px y fundido).
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

  const conMapa = !!property && tieneCoordenadas(property.latitude, property.longitude);

  return (
    <CrossFade swapKey="ficha">
    <div className="space-y-6 p-6 lg:p-8">
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

      {/*
        La portada (revisión de diseño 21-10): migas y acciones en una fila —UNA
        azul, «Editar»—, y la franja con quién vive, hasta cuándo y quién lo lleva.
      */}
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
        vacanciaLarga={esVacanciaLarga(situacion?.vacancia)}
        precioDeVenta={property?.salePrice ?? null}
        migas={
          <nav aria-label={t('inmobiliaria.portafolio.title')} className="flex min-w-0 items-center gap-2 text-sm">
            <Link
              href="/panel/inmobiliaria/inmuebles"
              className="flex min-w-0 items-center gap-1.5 text-fg-muted transition-colors hover:text-fg"
            >
              <CaretLeft className="h-4 w-4 shrink-0" />
              <span className="truncate">{t('inmobiliaria.portafolio.title')}</span>
            </Link>
            <span className="hidden text-fg-subtle sm:inline" aria-hidden="true">/</span>
            <span className="hidden max-w-[min(60ch,40vw)] truncate font-medium text-fg sm:inline">
              {portadaDelInmueble(consignacion, t(`inmobiliaria.consignaciones.propertyType.${consignacion.propertyType}`)).titulo}
            </span>
          </nav>
        }
        accionPrevia={
          /*
           * «Agendar visita» sólo donde se puede (revisión 21-10, «lo que no se puede, no se
           * ofrece»): un inmueble arrendado no recibe visitas —el back las rechaza con 409— y
           * uno terminado ya no se administra. En el celular vive en el menú ⋯.
           */
          !terminada && !contratoVigente && consignacion.propertyId ? (
            <Button
              variant="secondary"
              size="sm"
              hideArrow
              className="hidden shrink-0 sm:inline-flex"
              onClick={() => setShowCitaModal(true)}
              data-testid="pedir-cita"
            >
              <CalendarPlus className="h-4 w-4" />
              Agendar visita
            </Button>
          ) : null
        }
        onAgendarVisita={!terminada && !contratoVigente && consignacion.propertyId ? () => setShowCitaModal(true) : undefined}
        franja={
          <FranjaDelArriendo
            consignacion={consignacion}
            asesor={
              agente
                ? { nombre: agente.name, rol: t(`inmobiliaria.consignaciones.roles.${agente.role}`) }
                : encargado
            }
            cargandoAsesor={Boolean(consignacion.agenteId) && !agente && !encargado && (cargandoAgentes || cargandoAsesores)}
            onAsignarAsesor={terminada ? undefined : handleReassignAgent}
            vacancia={situacion?.vacancia}
          />
        }
      />

      {/* El mandato que se vence (faltan 30 días o ya venció): un renglón con su salida. */}
      {!terminada ? <AvisoDelMandatoQueVence datos={situacion} onPonerFecha={handleEdit} /> : null}

      {/*
        GLOW UP (21-10-2026, Nico eligió «Pestañas por tarea»): Resumen · Arrendarlo ·
        Mandato y giro (lo configurable) · Historial. Todas se montan (cada bloque
        carga como antes) y un enlace con #fotos, #propietarios o #documentos abre
        la pestaña donde vive.
      */}
      <PestanasDeLaFicha
        etiqueta="Secciones del inmueble"
        pestanas={[
          {
            id: 'resumen',
            etiqueta: 'Resumen',
            contenido: (
              <>
                {/*
                  Resumen (revisión 21-10): lo que la portada no dice —cómo es el
                  inmueble y dónde queda—, en 2/3 + 1/3. Quién vive, hasta cuándo y
                  quién lo lleva ya están arriba, en la franja.
                */}
                {/* Lo pendiente PRIMERO (revisión 21-10): vencimiento, firma, papeles, mapa y fotos,
                    cada uno con su botón. Con el mandato terminado no hay nada que poner en regla. */}
                {/* 22-10 (revisión): disponible, lo primero es quién espera una decisión. */}
                {!terminada && !contratoVigente ? (
                  <CandidatosQueEsperan propertyId={consignacion.propertyId} consignacionId={consignacion.id} onCuantos={setCandidatosEsperando} />
                ) : null}
                {!terminada ? (
                  <LoQueFaltaDelInmueble
                    consignacion={consignacion}
                    property={property}
                    cargandoProperty={cargandoProperty}
                    arrendado={contratoVigente}
                    onEditar={handleEdit}
                    onActualizado={refetchProperty}
                    puedeEditar={puedeEditarPortafolio}
                    // UNA azul: «Revisar las postulaciones» si alguien espera; si no, el paso que sigue.
                    siguienteEnAzul={candidatosEsperando === 0}
                  />
                ) : null}
                {consignacion.propertyId ? (
                  (() => {
                    const laFicha = (clase?: string) => (
                      <FichaDelInmueble
                        property={property}
                        cargando={cargandoProperty}
                        onEditar={terminada ? undefined : handleEdit}
                        loQueFaltaEnLaLista={!terminada && !contratoVigente}
                        className={clase}
                        // Sin coordenadas, la ubicación es un renglón de «Lo que falta» (arriba);
                        // con el mandato terminado se dice aquí, sin acción que ofrecer.
                        ubicacion={
                          !terminada || conMapa || (cargandoProperty && !property) ? undefined : (
                            <UbicacionDelInmueble
                              variante="fila"
                              property={property}
                              cargando={cargandoProperty}
                              consignacion={consignacion}
                              onActualizado={refetchProperty}
                            />
                          )
                        }
                      />
                    );
                    const losDuenos = (
                      <PropietariosDelResumen
                        consignacionId={consignacion.id}
                        propietario={propietario}
                        copropietarios={consignacion.copropietarios ?? []}
                        participacionesDesconocidas={consignacion.participacionesDesconocidas === true}
                      />
                    );
                    const elMapa = conMapa ? (
                      <UbicacionDelInmueble
                        property={property}
                        cargando={cargandoProperty}
                        consignacion={consignacion}
                        onActualizado={refetchProperty}
                      />
                    ) : null;
                    // 22-10 (revisión, 1440): con dos características o menos la ficha es
                    // corta y la columna izquierda terminaba 400 px antes; entonces el mapa
                    // va a la columna ancha y la ficha, a la derecha bajo el propietario.
                    const pocas = !!property && conMapa && caracteristicasDelInmueble(property, (x) => x).length <= 2;
                    return pocas ? (
                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
                        <div className="lg:col-span-2">{elMapa}</div>
                        <div className="space-y-6">
                          {losDuenos}
                          {laFicha()}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
                        {laFicha('lg:col-span-2')}
                        {/* La columna derecha: quién es el dueño y, si está ubicado, el mapa. */}
                        <div className="space-y-6">
                          {losDuenos}
                          {elMapa}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  // Cartera migrada sin inmueble detrás: no hay ficha ni mapa que mostrar, y se dice.
                  <p className="rounded-[16px] border border-border-faint px-5 py-4 text-body-sm text-fg-muted dark:border-border-strong" data-testid="resumen-sin-inmueble">
                    Este mandato no tiene un inmueble asociado: no hay características ni ubicación que mostrar.
                  </p>
                )}
                {terminada ? <RetiroRegistrado consignacionId={consignacion.id} /> : null}
              </>
            ),
          },
          // 22-10 (revisión): con el mandato terminado no hay nada que arrendar;
          // en venta, la pestaña es «Venderlo».
          ...(terminada ? [] : [{
            id: 'arrendarlo',
            etiqueta: consignacion.listingType === 'sale' ? 'Venderlo' : 'Arrendarlo',
            contenido: (
              <>
                {/* 22-10 (revisión): el orden del trabajo —candidatos que esperan,
                    fotos, publicar, visitas, inventario—, no el de los datos. */}
                <div>
                  <CandidatosDelInmueble
                    propertyId={consignacion.propertyId}
                    consignacionId={consignacion.id}
                  />
                </div>
                {/* Las fotos viven en el Property; sin propertyId (mandato sin
                    inmueble) no hay galería que mostrar. */}
                {consignacion.propertyId && (
                  <div id="fotos" className="scroll-mt-20">
                    <FotosDelInmueble propertyId={consignacion.propertyId} onCambio={refetchProperty} onVer={setFotoAbierta} compacta={contratoVigente} />
                  </div>
                )}
                {/* 🔴 (10-10-2026, Nico) Publicado en el marketplace, aparte de
                    disponible. Se oculta solo sin la migración. */}
                {consignacion.propertyId && (
                  <PublicadoEnElMarketplace
                    propertyId={consignacion.propertyId}
                    consignacionId={consignacion.id}
                    puedeCambiar={puedeEditarPortafolio}
                    onVerAviso={terminada ? undefined : handleViewPortal}
                  />
                )}
                {/* Cuándo se puede visitar. Va junto a los candidatos porque es lo
                    otro que pasa mientras el inmueble está disponible — y sin esto
                    el aviso del marketplace dice «Sin disponibilidad» siempre. */}
                <div>
                  <VisitasDelInmueble
                    propertyId={consignacion.propertyId}
                    arrendado={Boolean(consignacion.arrendado)}
                    arrendadoHasta={consignacion.leaseEndDate ?? null}
                    agenteId={consignacion.agenteId ?? null}
                  />
                </div>
                {/* Revisión 21-10: el inventario va con lo de arrendar (se necesita antes del próximo contrato), no en el historial. */}
                <div>
                  {/* 🔴 Nico y Juan Camilo, 2026-09-16: el inventario es del inmueble,
                      por versiones; sin la migración del back monta la tarjeta de siempre. */}
                  <InventarioDelInmueble
                    consignacion={consignacion}
                    puedeEditar={puedeEditarInventario}
                    copiaLocal={copiaLocal}
                    sinSenal={sinSenal}
                    onActualizada={setConsignacionData}
                    volverAlContrato={volverAlContrato}
                  />
                </div>
              </>
            ),
          }]),
          {
            id: 'mandato',
            // 22-10 (revisión): sin el punto ámbar —se leía sólo por color y el
            // Resumen ya dice lo que falta—.
            etiqueta: 'Mandato y giro',
            contenido: (
              <>
                {/* 22-10 (revisión): primero lo que falta hacer —papeles y firma—,
                    con la firma reforzada (opcional) en el mismo lugar; después los
                    términos y lo configurable. */}
                <div id="papeles" className="scroll-mt-20">
                  <MandatoDelInmueble
                    consignacionId={consignacion.id}
                    propietarioNombre={propietario?.name ?? null}
                    propietarioCorreo={propietario?.email ?? null}
                    direccionDelInmueble={consignacion.propertyAddress ?? null}
                    puedeEditar={puedeEditarInventario}
                  />
                </div>
                {/* T-0109 contract.md §3.1.C — vía ADICIONAL a C9 (arriba): firma
                    electrónica reforzada del contrato de consignación. Revisión 21-10: la
                    firma del mandato vivía en tres bloques; ésta, que es la opcional, va
                    plegada debajo de «Papeles y firma». Se oculta sola sin WU-3. */}
                <MasDetalles etiqueta="Firma electrónica reforzada (con el PDF del contrato)" montadoSiempre>
                  <FirmaElectronicaDeConsignacionSection
                    consignacionId={consignacion.id}
                    puedeEditar={puedeEditarPortafolio}
                  />
                </MasDetalles>
                <TerminosDelMandatoSection consignacion={consignacion} onEditar={terminada ? undefined : handleEdit} />
                <div id="propietarios" className="scroll-mt-20">
                  <PropietarioSection
                    propietario={propietario ?? undefined}
                    copropietarios={consignacion.copropietarios}
                    participacionesDesconocidas={consignacion.participacionesDesconocidas === true}
                    onCambiar={() => setShowCambiarPropietario(true)}
                    rutaDeOrigen={`/panel/inmobiliaria/inmuebles/${consignacionId}`}
                    onElegirPrincipal={
                      puedeElegirPrincipal
                        ? async (propietarioId) => {
                            await consignacionesApi.elegirPrincipal(consignacion.id, propietarioId);
                            // La copia local gana sobre el hook: se relee ahí (como al adjuntar el contrato).
                            await recargarConsignacion();
                          }
                        : undefined
                    }
                  />
                </div>
                {/* D1 y D2 (17-09): con qué modalidad se le gira al propietario y de
                    quién son los intereses de mora. */}
                <div>
                  <ModalidadDelMandato
                    consignacionId={consignacion.id}
                    esVenta={consignacion.listingType === 'sale'}
                    terminada={terminada}
                  />
                </div>
                {/* Con un agente asignado, cómo se reparte la comisión (el nombre ya está en la portada). */}
                {agente ? (
                  <AgenteSection
                    agente={agente}
                    commissionPercent={consignacion.commissionPercent}
                    isSaleListing={consignacion.listingType === 'sale'}
                    onReassign={handleReassignAgent}
                  />
                ) : null}
                <div id="documentos" className="scroll-mt-20">
                  <DocumentsSection consignacion={consignacion} onActualizado={() => void recargarConsignacion()} />
                </div>
              </>
            ),
          },
          {
            id: 'historial',
            etiqueta: 'Historial',
            contenido: (
              <>
                {/* Historial (revisión 21-10): primero lo que pasó; después lo del sistema anterior. */}
                <div>
                  <ConsignacionTimeline
                    consignacion={consignacion}
                    agenteName={agente?.name}
                    titulo="Lo que pasó"
                  />
                </div>
                {/* La historia contable ANTERIOR a Leasefy de este inmueble: los
                    comprobantes del sistema viejo que el back colgó de sus
                    contratos, en tres pestañas (ingresos · egresos · facturas).
                    Después del contrato vigente porque ése es el orden real —
                    arriba lo de hoy, abajo lo que quedó registrado antes. */}
                <div>
                  <ComprobantesDelSistemaAnterior propertyId={consignacion.propertyId} ocultarSinComprobantes />
                </div>
                {/* 🔴 22-09: quién tocó este inmueble, con su rol. Son DOS recursos
                    en el back —el inmueble (`/properties/:id`: fotos, datos,
                    ubicación) y su mandato (`/inmobiliaria/consignaciones/:id`:
                    estado, canon, terminación)— y aquí se leen como una sola lista. */}
                {/* 22-10 (revisión: «un solo historial»): la bitácora de quién
                    cambió qué dato va plegada debajo de lo que pasó. */}
                <MasDetalles etiqueta="Ver quién cambió los datos" etiquetaAbierto="Ocultar quién cambió los datos">
                  <BitacoraDelRecurso
                    recursos={[
                      { tipo: 'inmueble', id: consignacion.propertyId },
                      { tipo: 'consignacion', id: consignacion.id },
                    ]}
                  />
                </MasDetalles>
              </>
            ),
          },
        ]}
      />

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
        <AlertDialogContent variant="destructive" icon={<Prohibit weight="bold" />}>
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
              // `preventDefault`: sin él Radix cierra el diálogo al apretar y,
              // si el back lo rechaza, el motivo (`terminar-rechazo`) se va con
              // él. `handleTerminateConfirm` lo cierra sólo si salió bien.
              onClick={(e) => {
                e.preventDefault();
                void handleTerminateConfirm();
              }}
              loading={isTerminating}
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
    </CrossFade>
  );
}

export default function ConsignacionDetailPage() {
  return (
    <PageGuard module="portafolio">
      <ConsignacionDetailContent />
    </PageGuard>
  );
}
