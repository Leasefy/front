'use client';
import { PageGuard } from '@/components/auth/PageGuard';

import { useState, useMemo, useCallback, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from '@/components/ui/toast';
import {
  Bank,
  PaperPlaneTilt,
  Table,
  SquaresFour,
  Lightning,
  DownloadSimple,
} from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useAutoRefresh } from '@/lib/hooks/use-auto-refresh';
import {
  useDispersiones,
  usePropietarios,
  dispersionesApi,
  propietariosApi,
} from '@/lib/hooks/useInmobiliaria';
import { agencyApi } from '@/lib/api/inmobiliaria.service';
import { ApiError } from '@/lib/api/client';
import type {
  AgencyProfile,
  Dispersion,
  DispersionSummary,
  ExtractoPropietario as ExtractoPropietarioData,
} from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import {
  DispersionResumen,
  DispersionFilters,
  DispersionTable,
  DispersionDetail,
  ExtractoPropietario,
  DispersionCard,
  type DispersionFiltersState,
} from '@/components/inmobiliaria';
import { apiClient } from '@/lib/api/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { AlertaAccionable } from '@/components/ui/alerta-accionable';
import { Button } from '@/components/ui/button';
import { TablePagination } from '@/components/ui/pagination';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { SinDatos } from '@/components/estado/SinDatos';
import {
  EsqueletoIndicadores,
  EsqueletoTabla,
  EsqueletoTarjetas,
} from '@/components/estado/EsqueletoTabla';
import { useTablePagination, PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination';
import {
  RUTA_LOTES,
  apruebaPorLote as apruebaPorLoteSegun,
  esAprobadorYEjecutor,
  esAprobarPorLote,
  motivoLegible,
} from '@/lib/api/dispersiones-errores';
import { mesEnTitulo } from '@/lib/utils/mes';
import { SegmentedControl } from '@leasefy/cadence';

// View modes
type ViewMode = 'table' | 'cards';

/**
 * Get current month in YYYY-MM format
 */
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Por qué falló UNA acción (aprobar, girar), en una frase que se puede leer.
 * Un 4xx trae su motivo escrito por el back; la red y el servidor, no.
 */
function motivoDeLaAccion(error: unknown): string {
  const motivo = motivoLegible(error);
  if (motivo) return motivo;
  if (error instanceof ApiError && error.status === 0) {
    return 'No llegó al servidor: revisa tu conexión y vuelve a intentarlo.';
  }
  return 'Falló de nuestro lado; vuelve a intentarlo en un momento.';
}

/**
 * «12 aprobadas · 3 con error».
 *
 * Sin `export`: un `page.tsx` de Next sólo puede exportar lo de la página, y
 * cualquier otro nombre rompe el build.
 */
function textoDelInforme(aprobadas: number, conError: number): string {
  const primera = `${aprobadas} ${aprobadas === 1 ? 'aprobada' : 'aprobadas'}`;
  return conError > 0 ? `${primera} · ${conError} con error` : primera;
}

interface InformeDeAprobacion {
  aprobadas: number;
  errores: { id: string; nombre: string; motivo: string }[];
}

/**
 * DispersionesPage - Main page for managing disbursements to property owners
 * Route: /panel/inmobiliaria/pagos/dispersiones
 *
 * Las dispersiones se auto-refrescan vía useAutoRefresh (30s + focus/visibility).
 */
function DispersionesContent() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  /*
   * `?mes=` abre la lista en ese mes. Lo usa el asistente al terminar: generar
   * las de julio y caer en agosto —vacío, «No hay dispersiones registradas»—
   * se lee como que no pasó nada.
   */
  const mesPedido = searchParams.get('mes');

  // State for filters
  const [filters, setFilters] = useState<DispersionFiltersState>({
    month: /^\d{4}-\d{2}$/.test(mesPedido ?? '')
      ? (mesPedido as string)
      : getCurrentMonth(),
    status: 'all',
    propietarioId: 'all',
    search: '',
  });
  /*
   * La barra de filtros guarda su propio texto de búsqueda y lo re-emite a los
   * 300 ms: limpiar `filters.search` desde afuera no la vacía. Cambiarle la
   * `key` la vuelve a montar limpia.
   */
  const [versionDeFiltros, setVersionDeFiltros] = useState(0);

  // Fetch dispersiones from API with current filters
  const {
    dispersiones: apiDispersiones,
    isLoading: dispersionesLoading,
    error: dispersionesError,
    errorCrudo: dispersionesErrorCrudo,
    refetch: refetchDispersiones,
  } = useDispersiones({
    month: filters.month,
    status: filters.status !== 'all' ? filters.status : undefined,
    propietarioId: filters.propietarioId !== 'all' ? filters.propietarioId : undefined,
  });

  useAutoRefresh(refetchDispersiones);

  // Fetch propietarios for dropdown
  const { propietarios } = usePropietarios();

  /*
   * `?? []` a secas crea un array NUEVO en cada render. Todo lo que dependa de
   * `dispersiones` —dos useMemo y un useEffect— se recalcula siempre, y el
   * efecto del resumen entraba en bucle: efecto → setState → render → array
   * nuevo → efecto. Mientras la ruta de resumen no existió, eso fueron ~2,5
   * peticiones por segundo contra el back, para siempre.
   */
  const dispersiones = useMemo(() => apiDispersiones ?? [], [apiDispersiones]);

  /*
   * ── D1: cargando → falló → vacío → datos ──────────────────────────────────
   *
   * Antes `isLoading` y `error` se destructuraban y no se usaban: con el back
   * caído la lista quedaba vacía y la pantalla decía «No hay dispersiones
   * registradas». Un fallo leído como «no tienes nada» es la peor mentira de
   * una pantalla de plata.
   *
   * El hook no sabe de qué filtros son los datos que guarda: al cambiar de mes
   * conserva las filas del mes anterior mientras pide las nuevas. Por eso se
   * anota para qué combinación terminó la última carga (`claveCargada`) y para
   * cuál trajo datos (`claveConDatos`). Así:
   *   - filtros nuevos todavía sin respuesta → esqueleto, no las filas viejas;
   *   - el refresco de cada 30 s sobre la misma combinación → no parpadea;
   *   - si ese refresco falla, se conservan las filas que sí son de acá.
   */
  const claveDeLaLista = `${filters.month}|${filters.status}|${filters.propietarioId}`;
  const [claveCargada, setClaveCargada] = useState<string | null>(() =>
    dispersionesLoading ? null : claveDeLaLista,
  );
  const [claveConDatos, setClaveConDatos] = useState<string | null>(() =>
    dispersionesLoading || dispersionesError ? null : claveDeLaLista,
  );
  const cargabaAntes = useRef(dispersionesLoading);
  useEffect(() => {
    if (cargabaAntes.current && !dispersionesLoading) {
      setClaveCargada(claveDeLaLista);
      if (!dispersionesError) setClaveConDatos(claveDeLaLista);
    }
    cargabaAntes.current = dispersionesLoading;
  }, [dispersionesLoading, dispersionesError, claveDeLaLista]);

  const cargandoLista = claveCargada !== claveDeLaLista;
  const errorDeLista = dispersionesError ? (dispersionesErrorCrudo ?? dispersionesError) : null;
  const conservarLista = claveConDatos === claveDeLaLista;
  const listaCaida = Boolean(errorDeLista) && !conservarLista && !cargandoLista;

  // State for view mode
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // State for modals
  const [selectedDispersion, setSelectedDispersion] = useState<Dispersion | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [extractoDispersion, setExtractoDispersion] = useState<Dispersion | null>(null);
  const [isExtractoOpen, setIsExtractoOpen] = useState(false);

  // Apply client-side search filter only (API already filters by month, status, propietarioId)
  const filteredDispersiones = useMemo(() => {
    if (!filters.search) return dispersiones;

    const query = filters.search.toLowerCase();
    return dispersiones.filter((d) =>
      d.propietarioName.toLowerCase().includes(query)
    );
  }, [dispersiones, filters.search]);

  const hayFiltros =
    Boolean(filters.search) || filters.status !== 'all' || filters.propietarioId !== 'all';

  const limpiarFiltros = useCallback(() => {
    setFilters((prev) => ({ ...prev, status: 'all', propietarioId: 'all', search: '' }));
    setVersionDeFiltros((v) => v + 1);
  }, []);

  // Paginación — el pie canónico del panel (`useTablePagination` +
  // `TablePagination`). Antes era un slice a mano de 6 por página con el
  // paginador de ventana: no decía cuántas dispersiones había en total ni
  // dejaba elegir cuántas filas ver. `resetKey` lleva los cuatro filtros:
  // mes, estado y propietario los resuelve la API, la búsqueda es de acá.
  const {
    pageItems: paginatedDispersiones,
    total,
    page,
    pageSize,
    setPage,
    setPageSize,
    shouldPaginate,
  } = useTablePagination(filteredDispersiones, {
    resetKey: `${filters.month}|${filters.status}|${filters.propietarioId}|${filters.search}`,
  });

  /*
   * ── D3: ¿la agencia aprueba por lote? ─────────────────────────────────────
   *
   * Con `dispersionExigePin` (prendido por defecto desde el 2026-09-05) el back
   * responde 409 `APROBAR_POR_LOTE` a aprobar Y a girar una dispersión suelta.
   * El botón «Aprobar» casi nunca funcionaba y la pantalla decía «Error».
   *
   * Se lee `GET /inmobiliaria/agency`, que responde a cualquier miembro —el de
   * `/config` pide permiso de configuración y un contador no lo tiene—. Sin la
   * fila (cargando o sin respuesta) se asume «por lote», como hace el back: el
   * camino de Lotes sirve en los dos casos; el de «Aprobar» suelto, no.
   */
  const [agencia, setAgencia] = useState<AgencyProfile | null>(null);
  const [loteConfirmadoPorElBack, setLoteConfirmadoPorElBack] = useState(false);
  useEffect(() => {
    let vivo = true;
    agencyApi
      .getMyAgency()
      .then((a) => {
        if (vivo) setAgencia(a);
      })
      .catch(() => {
        // Sin la fila de la agencia queda `apruebaPorLote(null) === true`: la
        // pantalla ofrece Lotes, que es lo que el back va a exigir igual.
      });
    return () => {
      vivo = false;
    };
  }, []);
  const porLote = loteConfirmadoPorElBack || apruebaPorLoteSegun(agencia);

  /** El 409 de aprobar por lote: se dice qué pasó y a dónde ir, no «Error». */
  const avisarQueEsPorLote = useCallback(
    (error: ApiError, id?: string) => {
      setLoteConfirmadoPorElBack(true);
      toast.error('Tu inmobiliaria aprueba por lote', {
        id,
        description: error.message,
        action: { label: 'Ir a Lotes', onClick: () => router.push(RUTA_LOTES) },
      });
    },
    [router],
  );

  /*
   * ── D5: el resumen del mes ────────────────────────────────────────────────
   *
   * Antes el `catch {}` lo reemplazaba en silencio por una cuenta sobre las
   * filas de la página, y esos totales se leían como los del mes. Ahora, si el
   * resumen no carga, los números de respaldo se rotulan «estimados» con un
   * reintento; y si tampoco cargó la lista, no hay nada que estimar: se dice
   * que falló.
   *
   * ⚠️ `cargarResumen` depende SÓLO del mes. Con `dispersiones` en sus
   * dependencias el efecto entraba en bucle (ver el comentario de arriba).
   */
  /*
   * Cada respuesta se guarda con el mes al que pertenece: al cambiar de mes lo
   * guardado deja de valer solo. Sin esto se veían los totales del mes
   * anterior hasta que llegara la respuesta. Un reintento no borra la
   * respuesta anterior: el estimado sigue a la vista mientras se intenta.
   */
  const [respuestaDeResumen, setRespuestaDeResumen] = useState<{
    mes: string;
    data: DispersionSummary | null;
    error: unknown;
  } | null>(null);
  const pedidoDeResumen = useRef(0);

  const cargarResumen = useCallback(async () => {
    const mes = filters.month;
    const este = ++pedidoDeResumen.current;
    try {
      const data = await dispersionesApi.getSummary(mes);
      if (este === pedidoDeResumen.current) setRespuestaDeResumen({ mes, data, error: null });
    } catch (error) {
      if (este === pedidoDeResumen.current) setRespuestaDeResumen({ mes, data: null, error });
    }
  }, [filters.month]);

  useEffect(() => {
    void cargarResumen();
  }, [cargarResumen]);

  const resumenDelMes = respuestaDeResumen?.mes === filters.month ? respuestaDeResumen : null;
  const resumenDelBack = resumenDelMes?.data ?? null;
  const resumenFallo = resumenDelMes?.error ?? null;

  const resumenEstimado = useMemo<DispersionSummary>(() => {
    const delMes = dispersiones.filter((d) => d.month === filters.month);
    return {
      month: filters.month,
      totalToDisburse: delMes.reduce((sum, d) => sum + d.netToPropietario, 0),
      totalCommissions: delMes.reduce((sum, d) => sum + d.totalCommission, 0),
      dispersionsPending: delMes.filter((d) => d.status === 'pending').length,
      dispersionsCompleted: delMes.filter((d) => d.status === 'completed').length,
      dispersionsFailed: delMes.filter((d) => d.status === 'failed').length,
    };
  }, [dispersiones, filters.month]);

  const summary: DispersionSummary = resumenDelBack ?? resumenEstimado;

  // Count dispersiones by status for tabs (hybrid: summary + calculated processing)
  const statusCounts = useMemo(() => {
    const processingCount = dispersiones.filter((d) => d.status === 'processing').length;
    const total = summary.dispersionsPending + summary.dispersionsCompleted + summary.dispersionsFailed + processingCount;
    return {
      all: total,
      pending: summary.dispersionsPending,
      processing: processingCount,
      completed: summary.dispersionsCompleted,
      failed: summary.dispersionsFailed,
    };
  }, [summary, dispersiones]);

  // Propietarios for filter dropdown
  const propietarioOptions = useMemo(() => {
    return propietarios.map((p) => ({
      id: p.id,
      name: p.name,
    }));
  }, [propietarios]);

  // Handle dispersion click - open detail modal
  const handleDispersionClick = useCallback((dispersion: Dispersion) => {
    setSelectedDispersion(dispersion);
    setIsDetailOpen(true);
  }, []);

  /**
   * Aprobar — el primer par de ojos.
   *
   * El front NUNCA llamaba a `approve`, así que toda dispersión seguía en
   * `pending` y cada «Procesar» moría con un 400 del back (que exige estado
   * `PROCESSING`). Sin este paso el circuito entero estaba muerto.
   */
  const handleApproveDispersion = useCallback(async (dispersion: Dispersion) => {
    const id = `approve-${dispersion.id}`;
    try {
      toast.loading(t('inmobiliaria.dispersiones.toasts.processing', { name: dispersion.propietarioName }), { id });
      await dispersionesApi.approve(dispersion.id);
      await refetchDispersiones();
      void cargarResumen();
      // El toast va DESPUÉS de la respuesta, y dice lo que de verdad pasó.
      toast.success(t('inmobiliaria.dispersiones.toasts.aprobada'), {
        id,
        description: t('inmobiliaria.dispersiones.toasts.aprobadaDesc'),
      });
    } catch (error) {
      await refetchDispersiones();
      if (esAprobarPorLote(error)) {
        avisarQueEsPorLote(error, id);
        return;
      }
      toast.error('No se pudo aprobar la dispersión', {
        id,
        description: motivoDeLaAccion(error),
      });
    }
  }, [t, refetchDispersiones, cargarResumen, avisarQueEsPorLote]);

  /**
   * El botón de la fila (tabla y tarjeta).
   *
   * Aprobar se puede desde la fila: no pide ningún dato. Marcar un giro NO —
   * necesita la referencia del banco— así que abre el cajón en vez de disparar
   * una llamada que el back rechaza. Antes la fila llamaba a `process` con
   * `{}` sobre una dispersión `pending`: 400 seguro, y el cartel decía que la
   * transferencia se había enviado.
   */
  const handleAccionDeFila = useCallback((dispersion: Dispersion) => {
    if (dispersion.status === 'pending') {
      void handleApproveDispersion(dispersion);
      return;
    }
    setSelectedDispersion(dispersion);
    setIsDetailOpen(true);
  }, [handleApproveDispersion]);

  /**
   * Anotar la referencia del giro — el segundo par de ojos.
   *
   * El sistema NO envía transferencias: registra la que alguien ya hizo por el
   * banco. Por eso la referencia es obligatoria (el back la exige) y el texto
   * dejó de prometer «Transferencia enviada».
   */
  const handleProcessDispersion = useCallback(async (dispersion: Dispersion, transferReference: string) => {
    const id = `process-${dispersion.id}`;
    try {
      toast.loading(t('inmobiliaria.dispersiones.toasts.processing', { name: dispersion.propietarioName }), { id });

      await dispersionesApi.process(dispersion.id, transferReference);
      await refetchDispersiones();
      void cargarResumen();

      toast.success(t('inmobiliaria.dispersiones.toasts.referenciaGuardada'), {
        id,
        description: t('inmobiliaria.dispersiones.toasts.referenciaGuardadaDesc', { name: dispersion.propietarioName }),
      });

      setIsDetailOpen(false);
    } catch (error) {
      await refetchDispersiones();
      if (esAprobarPorLote(error)) {
        avisarQueEsPorLote(error, id);
        return;
      }
      toast.error(
        esAprobadorYEjecutor(error)
          ? 'El giro lo anota otra persona'
          : 'No se pudo guardar la referencia del giro',
        { id, description: motivoDeLaAccion(error) },
      );
    }
  }, [t, refetchDispersiones, cargarResumen, avisarQueEsPorLote]);

  // Reintentar una fallida es el mismo camino: la referencia sigue siendo del banco.
  const handleRetryDispersion = useCallback(async (dispersion: Dispersion, transferReference: string) => {
    await handleProcessDispersion(dispersion, transferReference);
  }, [handleProcessDispersion]);

  /*
   * ── D2: «Aprobar todas» ───────────────────────────────────────────────────
   *
   * Antes: un clic, sin confirmación, y `Promise.all` — con que UNA fallara la
   * pantalla decía «Error» aunque las demás ya estuvieran aprobadas. Ahora hay
   * un diálogo que dice cuántas y cuánta plata, cada una se aprueba por su
   * lado (`allSettled`) y al final un informe dice cuántas salieron y por qué
   * no las otras.
   *
   * Marcar un giro NO se puede hacer en masa: cada uno lleva la referencia que
   * le dio el banco, y una referencia inventada es peor que un botón que no
   * está.
   */
  const pendientesEnPantalla = useMemo(
    () => filteredDispersiones.filter((d) => d.status === 'pending'),
    [filteredDispersiones],
  );
  const plataPendienteEnPantalla = useMemo(
    () => pendientesEnPantalla.reduce((s, d) => s + d.netToPropietario, 0),
    [pendientesEnPantalla],
  );
  const [confirmandoAprobarTodas, setConfirmandoAprobarTodas] = useState(false);
  const [aprobandoTodas, setAprobandoTodas] = useState(false);
  const [informe, setInforme] = useState<InformeDeAprobacion | null>(null);

  const handleProcessAll = useCallback(() => {
    if (pendientesEnPantalla.length === 0) return;
    setConfirmandoAprobarTodas(true);
  }, [pendientesEnPantalla.length]);

  const aprobarTodas = useCallback(async () => {
    const lote = pendientesEnPantalla;
    if (lote.length === 0 || aprobandoTodas) return;
    setAprobandoTodas(true);
    setInforme(null);

    const resultados = await Promise.allSettled(lote.map((d) => dispersionesApi.approve(d.id)));
    const errores = resultados.flatMap((r, i) =>
      r.status === 'rejected'
        ? [{ id: lote[i].id, nombre: lote[i].propietarioName, motivo: motivoDeLaAccion(r.reason) }]
        : [],
    );
    const aprobadas = lote.length - errores.length;
    const porLoteSegunElBack = resultados.find(
      (r): r is PromiseRejectedResult => r.status === 'rejected' && esAprobarPorLote(r.reason),
    );

    setAprobandoTodas(false);
    setConfirmandoAprobarTodas(false);
    if (errores.length > 0) setInforme({ aprobadas, errores });

    const titulo = textoDelInforme(aprobadas, errores.length);
    if (errores.length === 0) {
      toast.success(titulo, { description: t('inmobiliaria.dispersiones.toasts.aprobadasBatchDesc') });
    } else if (porLoteSegunElBack) {
      avisarQueEsPorLote(porLoteSegunElBack.reason as ApiError);
    } else {
      toast.error(titulo, { description: errores[0].motivo });
    }

    await Promise.all([refetchDispersiones(), cargarResumen()]);
  }, [pendientesEnPantalla, aprobandoTodas, t, refetchDispersiones, cargarResumen, avisarQueEsPorLote]);

  // Handle view extracto
  const handleViewExtracto = useCallback((dispersion: Dispersion) => {
    setExtractoDispersion(dispersion);
    setIsExtractoOpen(true);
    setIsDetailOpen(false);
  }, []);

  // Handle download extracto PDF
  const handleDownloadExtracto = useCallback(async (dispersion: Dispersion) => {
    try {
      const blob = await apiClient.getBlob(`/inmobiliaria/dispersiones/${dispersion.id}/extracto.pdf`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = dispersion.propietarioName.replace(/\s+/g, '-').toLowerCase();
      a.download = `extracto-${safeName}-${dispersion.month}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t('inmobiliaria.dispersiones.toasts.pdfDownloaded'), {
        description: t('inmobiliaria.dispersiones.detail.ownerStatement') + ` - ${dispersion.propietarioName}`,
      });
    } catch (error) {
      toast.error('No se pudo descargar el extracto', {
        description: motivoDeLaAccion(error),
      });
    }
  }, [t]);

  // La vuelta a la página 1 la hace `useTablePagination` por `resetKey`, no acá.
  const handleFilterChange = useCallback((newFilters: DispersionFiltersState) => {
    setFilters(newFilters);
  }, []);

  // Handle view pending filter
  const handleViewPending = useCallback(() => {
    setFilters((prev) => ({ ...prev, status: 'pending' }));
  }, []);

  // Handle detail modal close
  const handleDetailClose = useCallback(() => {
    setIsDetailOpen(false);
    setTimeout(() => setSelectedDispersion(null), 300);
  }, []);

  // Handle extracto modal close
  const handleExtractoClose = useCallback(() => {
    setIsExtractoOpen(false);
    setTimeout(() => setExtractoDispersion(null), 300);
  }, []);

  /*
   * ── D6: el extracto dentro del modal ──────────────────────────────────────
   *
   * Tipado, no `any`. Con `any` acá, el componente leía `extracto.properties`
   * —un campo que el back nunca envió, la respuesta trae `lineItems`— y tsc no
   * decía nada: el modal reventaba con un TypeError al abrirlo.
   *
   * Y el modal abría en blanco: `extractoLoading` no se pintaba, y si fallaba
   * quedaba un diálogo vacío con un toast por detrás. Ahora carga con esqueleto
   * y el fallo, con su reintento, va DENTRO del modal.
   */
  // Cada respuesta con la dispersión (y el intento) de la que es: abrir el
  // extracto de otro propietario no muestra el del anterior mientras carga.
  const [extracto, setExtracto] = useState<{
    clave: string;
    data: ExtractoPropietarioData | null;
    error: unknown;
  } | null>(null);
  const [intentoExtracto, setIntentoExtracto] = useState(0);
  const claveDelExtracto = extractoDispersion ? `${extractoDispersion.id}|${intentoExtracto}` : null;

  useEffect(() => {
    if (!extractoDispersion || !isExtractoOpen) return;
    let vivo = true;
    const clave = `${extractoDispersion.id}|${intentoExtracto}`;
    propietariosApi
      .getExtracto(extractoDispersion.propietarioId, extractoDispersion.month)
      .then((data) => {
        if (vivo) setExtracto({ clave, data, error: null });
      })
      .catch((error: unknown) => {
        if (vivo) setExtracto({ clave, data: null, error });
      });
    return () => {
      vivo = false;
    };
  }, [extractoDispersion, isExtractoOpen, intentoExtracto]);

  const extractoVigente = extracto && extracto.clave === claveDelExtracto ? extracto : null;
  const extractoCargando = !extractoVigente;
  const extractoData = extractoVigente?.data ?? null;
  const extractoError = extractoVigente?.error ?? null;
  const reintentarExtracto = useCallback(() => setIntentoExtracto((n) => n + 1), []);

  // Format month for display
  /*
   * `new Date('2026-08-01')` se parsea como medianoche UTC y se pinta en hora
   * local: en Colombia (UTC-5) retrocede al 31 de julio, y el título decía
   * «julio de 2026» sobre los datos de agosto. Partiendo el string se lee el
   * mes que dice, sin pasar por ningún huso.
   */
  const monthDisplay = mesEnTitulo(filters.month, locale === 'en' ? 'en' : 'es');

  const hasPendingDispersiones = summary.dispersionsPending > 0;

  /*
   * El resumen, en el mismo orden de cuatro estados:
   *   - llegó del back → el resumen;
   *   - todavía no llegó y no falló → esqueleto (no ceros);
   *   - falló y la lista tampoco está → el fallo con reintento de las dos;
   *   - falló y la lista sí está → estimado con las filas, rotulado.
   */
  let bloqueDeResumen: JSX.Element;
  if (resumenDelBack || (resumenFallo && !cargandoLista && !listaCaida)) {
    bloqueDeResumen = (
      <DispersionResumen
        summary={summary}
        onViewPending={handleViewPending}
        onProcessAll={
          !porLote && hasPendingDispersiones && pendientesEnPantalla.length > 0
            ? handleProcessAll
            : undefined
        }
        apruebaPorLote={porLote}
        estimado={resumenDelBack ? undefined : { onReintentar: cargarResumen }}
      />
    );
  } else if (resumenFallo && listaCaida) {
    bloqueDeResumen = (
      <FalloDeCarga
        error={resumenFallo}
        queEs="el resumen de dispersiones"
        onReintentar={() => Promise.all([cargarResumen(), refetchDispersiones()])}
      />
    );
  } else {
    bloqueDeResumen = <EsqueletoIndicadores cantidad={3} className="lg:grid-cols-3" />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-h2 text-fg">
            {t('inmobiliaria.dispersiones.title')}
          </h1>
          <p className="text-sm text-fg-muted max-w-2xl line-clamp-2">
            {t('inmobiliaria.dispersiones.subtitle')}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {/* Los lotes al banco: el archivo plano con doble aprobación. */}
          <Button asChild variant="secondary" hideArrow>
            <Link href={RUTA_LOTES}>
              <Bank className="w-4 h-4" />
              Lotes al banco
            </Link>
          </Button>
          <Button asChild hideArrow>
            <Link href="/panel/inmobiliaria/pagos/dispersiones/generar">
              <Lightning className="w-4 h-4" weight="fill" />
              {t('inmobiliaria.dispersiones.wizard.title')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        data-testid="dispersiones-resumen"
      >
        {bloqueDeResumen}
      </motion.div>

      {/* El informe de «Aprobar todas» cuando no salieron todas: queda hasta
          que se cierre, con el motivo de cada una. */}
      {informe && (
        <AlertaAccionable
          severidad="warning"
          titulo={textoDelInforme(informe.aprobadas, informe.errores.length)}
          secundaria={{ label: 'Cerrar', onClick: () => setInforme(null) }}
          data-testid="informe-aprobar-todas"
        >
          <ul className="mt-1 space-y-0.5">
            {informe.errores.map((e) => (
              <li key={e.id}>
                <span className="font-medium">{e.nombre}:</span> {e.motivo}
              </li>
            ))}
          </ul>
        </AlertaAccionable>
      )}

      {/* Unified Card - View Toggle + Filters + Content + Pagination */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-lg border border-border bg-card"
      >
        {/* View Toggle Header - FIRST (Primary hierarchy) */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/20">
          <SegmentedControl
            aria-label={t('inmobiliaria.dispersiones.viewTable')}
            value={viewMode}
            onChange={(v) => setViewMode(v as ViewMode)}
            options={[
              {
                value: 'table',
                label: (
                  <span className="flex items-center gap-2">
                    <Table className="w-4 h-4" />
                    {t('inmobiliaria.dispersiones.viewTable')}
                  </span>
                ),
                ariaLabel: t('inmobiliaria.dispersiones.viewTable'),
              },
              {
                value: 'cards',
                label: (
                  <span className="flex items-center gap-2">
                    <SquaresFour className="w-4 h-4" />
                    {t('inmobiliaria.dispersiones.viewCards')}
                  </span>
                ),
                ariaLabel: t('inmobiliaria.dispersiones.viewCards'),
              },
            ]}
          />
          {/* El conteo sólo cuando la lista es de verdad: «0 dispersiones»
              encima de un fallo es otro «no hay». */}
          {!cargandoLista && !listaCaida && (
            <span className="text-xs text-fg-muted tabular-nums">
              {filteredDispersiones.length} {t('inmobiliaria.nav.dispersiones').toLowerCase()}
            </span>
          )}
        </div>

        {/* Filters Section - SECOND */}
        <DispersionFilters
          key={versionDeFiltros}
          filters={filters}
          onFiltersChange={handleFilterChange}
          propietarios={propietarioOptions}
          statusCounts={statusCounts}
        />

        {/* Dispersiones List/Table */}
        <div data-testid="dispersiones-lista">
          <EstadoDeDatos
            cargando={cargandoLista}
            error={errorDeLista}
            conservarContenido={conservarLista}
            vacio={filteredDispersiones.length === 0}
            queEs="las dispersiones"
            onReintentar={refetchDispersiones}
            esqueleto={
              viewMode === 'table' ? (
                <EsqueletoTabla columnas={8} className="rounded-none border-0" />
              ) : (
                <EsqueletoTarjetas className="p-4" />
              )
            }
            cuandoVacio={
              <SinDatos
                hayFiltros={hayFiltros}
                // Con filtros, SinDatos arma «Ningún <queSon> coincide…»:
                // «resultado» concuerda, «dispersion» no.
                queSon={hayFiltros ? 'resultados' : 'dispersiones'}
                icono={PaperPlaneTilt}
                titulo={`Todavía no hay dispersiones de ${monthDisplay}`}
                descripcion="Se arman con los cobros pagados del mes. Genéralas desde el asistente cuando el mes tenga recaudo."
                crear={{
                  label: t('inmobiliaria.dispersiones.wizard.title'),
                  href: '/panel/inmobiliaria/pagos/dispersiones/generar',
                }}
                onLimpiarFiltros={limpiarFiltros}
              />
            }
          >
            {viewMode === 'table' ? (
              <DispersionTable
                dispersiones={paginatedDispersiones}
                onViewDetail={handleDispersionClick}
                // Con aprobación por lote la fila no ofrece aprobar ni girar:
                // las dos dan 409. «Ver detalle» sigue, y ahí está el enlace.
                onProcess={porLote ? undefined : handleAccionDeFila}
                onDownloadExtracto={handleDownloadExtracto}
                showSummary
              />
            ) : (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedDispersiones.map((dispersion) => (
                  <DispersionCard
                    key={dispersion.id}
                    dispersion={dispersion}
                    onViewDetail={handleDispersionClick}
                    onProcess={
                      !porLote && dispersion.status === 'pending'
                        ? () => handleAccionDeFila(dispersion)
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </EstadoDeDatos>
        </div>

        {/* Pie de tabla del design system: «X dispersiones · Filas por
            página · n/m». Se monta también con una sola fila. */}
        {shouldPaginate && !cargandoLista && !listaCaida && (
          <div className="border-t border-border px-4 py-3">
            <TablePagination
              total={total}
              page={page}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </motion.div>

      {/* Dispersion Detail Modal */}
      <DispersionDetail
        isOpen={isDetailOpen}
        onClose={handleDetailClose}
        dispersion={selectedDispersion}
        onApprove={handleApproveDispersion}
        onProcess={handleProcessDispersion}
        onViewExtracto={handleViewExtracto}
        onRetry={handleRetryDispersion}
        apruebaPorLote={porLote}
        usuarioActualId={user?.id ?? null}
      />

      {/* «Aprobar todas»: cuántas y cuánta plata, antes de tocar nada. */}
      <AlertDialog
        open={confirmandoAprobarTodas}
        onOpenChange={(abierto) => {
          if (!aprobandoTodas) setConfirmandoAprobarTodas(abierto);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Vas a aprobar {pendientesEnPantalla.length}{' '}
              {pendientesEnPantalla.length === 1 ? 'dispersión' : 'dispersiones'} por{' '}
              {formatCurrency(plataPendienteEnPantalla)}. ¿Seguimos?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Son las pendientes que ves en la lista de {monthDisplay}. Cada una queda lista para
              que otra persona anote la referencia del giro; el sistema no transfiere plata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={aprobandoTodas}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirmar-aprobar-todas"
              disabled={aprobandoTodas}
              onClick={(e) => {
                // El diálogo se cierra al terminar, con el informe: no antes.
                e.preventDefault();
                void aprobarTodas();
              }}
            >
              {aprobandoTodas ? 'Aprobando…' : `Aprobar ${pendientesEnPantalla.length}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Extracto Modal */}
      <Dialog open={isExtractoOpen} onOpenChange={(open) => !open && handleExtractoClose()}>
        {/*
          Más ancho porque el extracto tiene nueve columnas. El scroll vertical
          ya lo pone el primitivo del Dialog, así que NO se agrega otro acá:
          dos scrollers anidados se pelean el gesto.

          `data-lenis-prevent` sí es obligatorio — el scroll suave se come el
          de cualquier cosa flotante si no se le dice que no toque esto.
        */}
        <DialogContent className="max-w-5xl max-h-[90vh]" data-lenis-prevent>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{t('inmobiliaria.dispersiones.detail.ownerStatement')}</span>
              {extractoData && !extractoCargando && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => extractoDispersion && handleDownloadExtracto(extractoDispersion)}
                  className="flex items-center gap-2"
                >
                  <DownloadSimple className="w-4 h-4" />
                  {t('inmobiliaria.dispersiones.downloadPdf')}
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {/* : es hijo de un grid, y sin esto se estira al ancho de
              la tabla en vez de dejar que ella scrollee adentro. */}
          <div className="min-w-0 p-6 pt-4" data-testid="extracto-cuerpo">
            <EstadoDeDatos
              cargando={extractoCargando}
              error={extractoError}
              queEs="el extracto"
              onReintentar={reintentarExtracto}
              esqueleto={<EsqueletoTabla columnas={9} filas={4} />}
            >
              {extractoData && <ExtractoPropietario extracto={extractoData} />}
            </EstadoDeDatos>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DispersionesPage() {
  return (
    <PageGuard module="dispersiones">
      {/* `useSearchParams` obliga a un límite de Suspense: sin él, `next build`
          falla al prerenderizar la ruta. */}
      <Suspense fallback={null}>
        <DispersionesContent />
      </Suspense>
    </PageGuard>
  );
}
