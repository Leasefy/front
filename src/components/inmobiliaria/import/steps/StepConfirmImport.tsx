"use client";

import { useState, useContext, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle,
  FileArrowUp,
  UserCircle,
  WarningCircle,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TablePagination } from "@/components/ui/pagination";
import { MonoLabel } from "@leasefy/cadence";
import { toast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { faltantesParaElBack } from "../lib/requisitosDelBack";
import { toImportarInmuebleDto } from "../lib/toImportarInmuebleDto";
import {
  geocodeImportRow,
  GEOCODE_ROW_DELAY_MS,
} from "../lib/geocodeImportRow";
import { generarIdempotencyKey } from "../lib/idempotencia";
import {
  activarLoteCompleto,
  ActivacionInterrumpida,
} from "../lib/activarLoteCompleto";
import { emparejarFilasConFotos, subirFotosDelLote } from "../lib/subirFotosDelLote";
import { traerFotoComoArchivo } from "@/lib/inmuebles/enlaces.service";
import { uploadPropertyPhotos } from "@/lib/api/property-photos";
import { CompletarMandatosLoteDialog } from "../CompletarMandatosLoteDialog";
import {
  agentesApi,
  inmueblesApi,
  propietariosApi,
} from "@/lib/api/inmobiliaria.service";
import type {
  Agente,
  InmuebleSinConsignacion,
  Propietario,
} from "@/lib/types/inmobiliaria";
import { RanuraDelPie, type ImportStepProps } from "../ImportWizard";
import { FilaImportacionRow } from "../FilaImportacionRow";
import { ProgresoDeLoteInmuebles } from "../ProgresoDeLoteInmuebles";
import { useEstadoDeLoteInmuebles } from "@/lib/hooks/use-estado-de-lote-inmuebles";
import {
  inmueblesImportacionApi,
  type FilaDeImportacion,
  type ResolverInmuebleDto,
  type ResumenLoteInmuebles,
  type FilaOmitida,
  type ImportarInmuebleDto,
} from "@/lib/api/inmuebles-importacion.service";

/**
 * StepConfirmImport — WU-6: wires the durable backend (WU-4,
 * wu-4-report.md §6) instead of fanning out client-side to
 * `POST /properties`, one call per row. Closing the tab now loses nothing:
 * the batch is staged server-side from the moment `preparar()` returns, and
 * `PROPERTY_IMPORT_COMPLETED` — not this component — is the completion
 * mechanism. Polling (`useEstadoDeLoteInmuebles`) is only a bounded
 * convenience while the tab stays open.
 *
 * Scope cuts made explicitly, not silently (see wu-6-report.md §8 for the
 * full reasoning):
 *  - The end-of-import mandate dialog (R1, `CompletarMandatosLoteDialog`)
 *    is NOT offered here any more. Properties do not exist until
 *    `activar()` succeeds — asynchronously, at a time the agency chooses —
 *    so there is no `Property[]` to hand the dialog at the point this
 *    component used to call it. Imported properties stay mandate-less by
 *    design (C5/C13) and are surfaced by the grid-view fix (W4-b).
 *  - Photo upload from the "enlaces" import method is deferred: the old
 *    flow uploaded to a property id it had just created; the new flow does
 *    not have one until activation. Not wired in this pass — flagged as a
 *    real, known gap, not silently dropped.
 */

const POR_PAGINA = 25;

export function StepConfirmImport({
  state,
  updateState,
  onSalir,
  onOcupado,
}: ImportStepProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const ranuraDelPie = useContext(RanuraDelPie);

  const properties = state.properties;
  const selectedProperties = properties.filter(
    (p) => p.selected && !p.hasErrors,
  );
  const excludedCount = properties.filter((p) => !p.selected).length;
  const acceptedSuggestionsCount = properties.reduce(
    (sum, p) => sum + p.suggestions.filter((s) => s.accepted === true).length,
    0,
  );
  const remainingErrorsCount = properties.filter(
    (p) => p.selected && p.hasErrors,
  ).length;

  // Las que el back va a rechazar, separadas ANTES de empezar.
  const bloqueadas = selectedProperties
    .map((p) => ({ p, faltan: faltantesParaElBack(p) }))
    .filter((x) => x.faltan.length > 0);
  const importables = selectedProperties.filter(
    (p) => faltantesParaElBack(p).length === 0,
  );
  const motivosBloqueo = [
    ...new Set(
      bloqueadas.flatMap((x) => x.faltan.map((f) => f.etiqueta.toLowerCase())),
    ),
  ];
  const importCount = importables.length;

  // ── Phase 1: geocode (client-side, unchanged from before) + preparar() ──
  const [geocodificando, setGeocodificando] = useState(false);
  const [geoProgress, setGeoProgress] = useState(0);
  const [geoCurrent, setGeoCurrent] = useState(0);
  const [preparando, setPreparando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lote, setLote] = useState<string | null>(
    // El ?lote= (la notificación) gana; sin él, el lote que el wizard guardó
    // en su estado — sobrevive a «Anterior»/«Siguiente» y a la tarjeta de
    // «retomar» del arranque. Antes, volver un paso perdía el lote y la
    // persona re-subía el archivo: un lote duplicado por cada vuelta atrás.
    () => searchParams?.get("lote") ?? state.loteRetomado ?? null,
  );
  /*
   * Con setter a propósito: tras un lote FALLIDO, reintentar con la MISMA
   * clave le pediría al back el MISMO lote fallido (la clave es la identidad
   * del intento). «Preparar de nuevo» genera una clave nueva; el doble clic
   * dentro de UN intento sigue cubierto porque la clave sólo cambia ahí.
   */
  const [idempotencyKey, setIdempotencyKey] = useState(() => generarIdempotencyKey());

  const { estado: estadoSondeado, agotado } = useEstadoDeLoteInmuebles(lote);

  /*
   * La re-consulta manual de cuando el sondeo se agotó (10 min). El sondeo
   * vive en su hook y no se puede «revivir» sin tocarlo; esto es más simple:
   * una consulta puntual cuyo resultado — si es más nuevo — le gana al del
   * sondeo detenido. Se limpia al cambiar de lote.
   */
  const [estadoManual, setEstadoManual] = useState<
    typeof estadoSondeado | null
  >(null);
  const [consultando, setConsultando] = useState(false);
  useEffect(() => {
    setEstadoManual(null);
  }, [lote]);
  const estadoLote = estadoManual ?? estadoSondeado;

  const handleConsultarDeNuevo = async () => {
    if (!lote) return;
    setConsultando(true);
    try {
      const r = await inmueblesImportacionApi.estadoDeLote(lote);
      setEstadoManual(r);
      if (r.estado === "ENCOLADO" || r.estado === "PROCESANDO") {
        toast.info("Sigue en proceso", {
          description: `${r.procesadas} de ${r.total} filas procesadas. Podés cerrar esta pestaña — te avisamos al terminar.`,
        });
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "No pudimos consultar el estado del lote.",
      );
    } finally {
      setConsultando(false);
    }
  };

  // ── Phase 2: review ──────────────────────────────────────────────────
  const [resumenLote, setResumenLote] = useState<ResumenLoteInmuebles | null>(
    null,
  );
  const [pendientes, setPendientes] = useState<FilaDeImportacion[]>([]);
  const [totalPendientes, setTotalPendientes] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [filaBusy, setFilaBusy] = useState<string | null>(null);
  const [descartandoLote, setDescartandoLote] = useState(false);

  // ── Phase 3: activation ──────────────────────────────────────────────
  const [activando, setActivando] = useState(false);
  const [resultadoActivacion, setResultadoActivacion] = useState<{
    activados: number;
    omitidas: FilaOmitida[];
  } | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  /**
   * Las fotos de los inmuebles traídos por ENLACE se suben después de que el
   * lote los creó (ver `subirFotosDelLote`). `fotosSubidas` guarda a qué
   * inmuebles ya se les subió, para no repetir en una segunda tanda.
   */
  const [fotosProgreso, setFotosProgreso] = useState<{ hechos: number; total: number } | null>(null);
  const [fotosSubidas] = useState(() => new Set<string>());
  const subirFotosDeLosActivados = useCallback(
    async (elLote: string) => {
      // Sin los inmuebles del asistente (lote retomado por URL) no hay de
      // dónde sacar las URLs de las fotos: se salta sin ruido.
      if (importables.length === 0) return;
      const filas: FilaDeImportacion[] = [];
      for (let pagina = 1; pagina <= 25; pagina++) {
        const p = await inmueblesImportacionApi.filas(elLote, { pagina, porPagina: 200, estado: 'ACTIVADO' });
        filas.push(...p.filas);
        if (p.filas.length < 200) break;
      }
      const pares = emparejarFilasConFotos(filas, importables).filter((x) => !fotosSubidas.has(x.propertyId));
      if (pares.length === 0) return;
      setFotosProgreso({ hechos: 0, total: pares.length });
      try {
        const r = await subirFotosDelLote(
          pares,
          {
            traer: traerFotoComoArchivo,
            subir: uploadPropertyPhotos,
            alAvanzar: (hechos, total) => setFotosProgreso({ hechos, total }),
          },
          fotosSubidas,
        );
        if (r.subidas > 0) {
          toast.success("Fotos listas", {
            description: `${r.subidas} ${r.subidas === 1 ? "foto subida" : "fotos subidas"} a ${r.inmuebles} ${r.inmuebles === 1 ? "inmueble" : "inmuebles"}${r.fallidas > 0 ? ` · ${r.fallidas} no se pudieron bajar` : ""}.`,
          });
        } else if (r.fallidas > 0) {
          toast.warning("Las fotos no se pudieron traer", {
            description: `Ninguna de las ${r.fallidas} fotos de la ficha se pudo bajar. Podés subirlas desde cada inmueble.`,
          });
        }
      } finally {
        setFotosProgreso(null);
      }
    },
    [importables, fotosSubidas],
  );

  /*
   * El mandato, al terminar.
   *
   * Un inmueble importado nace DRAFT y SIN consignación (publicar exige
   * mandato), y la grilla del portafolio no muestra los que no lo tienen: una
   * importación de 300 filas terminaba en un portafolio aparentemente vacío.
   * El diálogo de mandatos ya existía pero se había desconectado en WU-6,
   * porque en ese momento del flujo los `Property` todavía no existían.
   * Ahora sí: `activar()` ya corrió, así que se pregunta por los que quedaron
   * sin mandato y se ofrece completarlo. NUNCA se inventa un canon — cada
   * fila la escribe la persona en el diálogo.
   */
  const [sinMandato, setSinMandato] = useState<InmuebleSinConsignacion[]>([]);
  const [propietarios, setPropietarios] = useState<Propietario[]>([]);
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [ofrecerMandatos, setOfrecerMandatos] = useState(false);

  /**
   * Los `Property` que ESTE lote acaba de crear. `getSinConsignacion()`
   * devuelve todos los inmuebles sin propietario de la agencia — medido en la
   * agencia de QA, el diálogo ofrecía «guardar para todos» sobre 113
   * inmuebles después de importar UNO. El propietario elegido acá es para lo
   * que se acaba de traer, no para todo el portafolio.
   */
  const propertyIdsDelLote = useCallback(async (elLote: string): Promise<Set<string>> => {
    const ids = new Set<string>();
    for (let pagina = 1; pagina <= 50; pagina += 1) {
      const p = await inmueblesImportacionApi.filas(elLote, { pagina, porPagina: 200, estado: 'ACTIVADO' });
      for (const f of p.filas) if (f.propertyId) ids.add(f.propertyId);
      if (p.filas.length < 200 || ids.size >= p.total) break;
    }
    return ids;
  }, []);

  const buscarSinMandato = useCallback(async (elLote: string) => {
    try {
      const [inm, props, ags, delLote] = await Promise.all([
        inmueblesApi.getSinConsignacion(),
        propietariosApi.getAll(),
        agentesApi.getAll(),
        propertyIdsDelLote(elLote),
      ]);
      const soloDelLote = inm.filter((i) => delLote.has(i.propertyId));
      setSinMandato(soloDelLote);
      setPropietarios(props);
      setAgentes(ags);
      setOfrecerMandatos(soloDelLote.length > 0);
    } catch {
      // Que no se pueda ofrecer el mandato no puede ensuciar una importación
      // que salió bien: los inmuebles están creados y el mandato se completa
      // después desde el portafolio.
    }
  }, [propertyIdsDelLote]);

  /*
   * Aviso al muro mientras hay una operación larga en vuelo — la
   * geocodificación fila a fila, el `preparar`, el job del servidor y la
   * activación por tandas. Sin esto, el pie del muro ofrecía «Seguir con
   * Contratos» con el «Activando…» todavía girando (Nico lo vio). El job
   * cuenta como ocupado sólo mientras el sondeo sigue vivo: con el sondeo
   * agotado nadie está mirando el job, y el muro no puede quedar clavado en
   * «ocupado» para siempre.
   */
  const jobCorriendo =
    !agotado &&
    (estadoLote?.estado === 'ENCOLADO' || estadoLote?.estado === 'PROCESANDO');
  const hayOperacionEnVuelo =
    geocodificando || preparando || activando || descartandoLote || jobCorriendo;
  useEffect(() => {
    onOcupado?.(hayOperacionEnVuelo);
  }, [hayOperacionEnVuelo, onOcupado]);
  // Al desmontar (cambio de paso, «cancelar») el muro recupera sus botones.
  useEffect(() => () => onOcupado?.(false), [onOcupado]);

  const refrescarRevision = useCallback(async (elLote: string, pag = 1) => {
    try {
      const [r, p] = await Promise.all([
        inmueblesImportacionApi.resumen(elLote),
        inmueblesImportacionApi.filas(elLote, {
          pagina: pag,
          porPagina: POR_PAGINA,
          estado: "PENDIENTE",
        }),
      ]);
      setResumenLote(r);
      setPendientes(p.filas);
      setTotalPendientes(p.total);
      setPagina(p.pagina);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos abrir ese lote.");
    }
  }, []);

  // El lote pasó a LISTO (por el sondeo, o porque llegamos por el ?lote= de
  // la notificación con el batch ya terminado): recién ahí tiene sentido
  // cargar la lista de trabajo real.
  useEffect(() => {
    if (!lote) return;
    if (estadoLote?.estado === "LISTO") {
      refrescarRevision(lote);
    }
  }, [lote, estadoLote?.estado, refrescarRevision]);

  const handlePreparar = async () => {
    if (importCount === 0) return;
    setError(null);
    setGeocodificando(true);
    setGeoProgress(0);
    setGeoCurrent(0);

    // Geocodificación secuencial — respeta el límite de LocationIQ. Va antes
    // de `preparar()` porque el back de importación (WU-4) no geocodifica;
    // sin esto, todo inmueble importado caería al centro de la ciudad.
    //
    // `geocodeImportRow` ya degrada sola (centro de la ciudad) cuando la
    // dirección no aparece o LocationIQ falla; acá sólo se CUENTA cuántas
    // cayeron ahí para decirlo — sin el aviso, un LocationIQ caído dejaba
    // todo el lote apilado en el centro del mapa y nadie se enteraba. El
    // try/finally de afuera es la red de seguridad: un throw inesperado en
    // esta fase dejaba «Preparando…» girando para siempre, sin error y sin
    // botón.
    const dtos: ImportarInmuebleDto[] = [];
    let sinUbicar = 0;
    try {
      for (let i = 0; i < importables.length; i++) {
        const p = importables[i];
        setGeoCurrent(i + 1);
        const coords = await geocodeImportRow(p);
        if (coords.source !== "geocoded") sinUbicar += 1;
        dtos.push({
          ...toImportarInmuebleDto(p),
          ...(coords.lat != null && coords.lng != null
            ? { latitude: coords.lat, longitude: coords.lng }
            : {}),
        });
        setGeoProgress(Math.round(((i + 1) / importables.length) * 100));
        if (i < importables.length - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, GEOCODE_ROW_DELAY_MS),
          );
        }
      }
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? e.message
          : "No pudimos preparar los datos del archivo. Intentá de nuevo.",
      );
      return;
    } finally {
      setGeocodificando(false);
    }

    setPreparando(true);
    try {
      const r = await inmueblesImportacionApi.preparar(dtos, idempotencyKey);
      // El lote es SIEMPRE del servidor — nunca uno generado acá.
      setLote(r.lote);
      // Persistido en el estado del wizard: sobrevive a «Anterior» y a un
      // remount del paso. Sin esto, volver un paso perdía el lote.
      updateState({ loteRetomado: r.lote });
      if (sinUbicar > 0) {
        toast.info("Direcciones sin ubicar", {
          description: `${sinUbicar} de ${dtos.length} direcciones no se encontraron en el mapa: esos inmuebles quedan en el centro de su ciudad y podés ajustar el pin después, en cada ficha.`,
        });
      }
    } catch (e) {
      setError(
        e instanceof ApiError && e.messages
          ? e.messages.join(" · ")
          : e instanceof Error
            ? e.message
            : "No pudimos preparar la importación.",
      );
    } finally {
      setPreparando(false);
    }
  };

  const handleResolver = async (id: string, cambios: ResolverInmuebleDto) => {
    if (!lote) return;
    setFilaBusy(id);
    try {
      await inmueblesImportacionApi.resolver(id, cambios);
      await refrescarRevision(lote, pagina);
    } catch (e) {
      if (e instanceof ApiError && e.code === "FILA_YA_ACTIVADA") {
        toast.error(
          "Esta fila ya se activó — no se puede editar. La lista se actualizó.",
        );
        // La fila que se ve es vieja: refrescar la saca de la lista en vez
        // de dejar a la persona editando un fantasma que siempre da 409.
        await refrescarRevision(lote, pagina);
      } else {
        toast.error(
          e instanceof Error ? e.message : "No pudimos guardar los cambios.",
        );
      }
    } finally {
      setFilaBusy(null);
    }
  };

  const handleDescartarFila = async (id: string) => {
    if (!lote) return;
    setFilaBusy(id);
    try {
      await inmueblesImportacionApi.descartarFila(id);
      await refrescarRevision(lote, pagina);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "No pudimos descartar la fila.",
      );
    } finally {
      setFilaBusy(null);
    }
  };

  /**
   * Nunca reintenta ni se traga un error — un 409 (`LOTE_EN_PROCESO`, el
   * job todavía está corriendo) o un 404 (lote desconocido) se muestran tal
   * cual. El 409 NO es un fallo del usuario: es la señal de "esperá a que
   * termine", nunca se reintenta silenciosamente (wu-4-report.md §6).
   */
  const handleDescartarLote = async () => {
    if (!lote) return;
    setDescartandoLote(true);
    setError(null);
    try {
      await inmueblesImportacionApi.descartarLote(lote);
      if (onSalir) onSalir();
      else router.push("/panel/inmobiliaria/inmuebles");
    } catch (e) {
      if (e instanceof ApiError && e.code === "LOTE_EN_PROCESO") {
        setError(
          "El lote todavía se está procesando — esperá a que termine antes de descartarlo.",
        );
      } else {
        setError(
          e instanceof Error ? e.message : "No pudimos descartar el lote.",
        );
      }
    } finally {
      setDescartandoLote(false);
    }
  };

  /**
   * `POST .../activar` es resumible — 500 filas por llamada. El loop vive
   * en `activarLoteCompleto` (testeable aparte); acá sólo se orquesta el
   * estado de pantalla mientras corre.
   */
  const handleActivar = async () => {
    if (!lote) return;
    setActivando(true);
    setError(null);
    try {
      const resultado = await activarLoteCompleto(
        lote,
        inmueblesImportacionApi.activar,
      );
      /*
       * El techo de llamadas NO es éxito: quedan filas sin activar. Decir
       * «¡Importación completada!» acá le mentiría a la persona con filas
       * vivas en el lote. Se refresca el resumen (las tandas que sí pasaron
       * cuentan) y se ofrece seguir — reintentar continúa donde quedó.
       */
      if (resultado.detenidoPorLimite) {
        await refrescarRevision(lote, pagina);
        setError(
          `Se activaron ${resultado.activados} inmuebles y quedaron más por activar. ` +
            `Nada se repite ni se duplica: tocá «Activar» de nuevo para seguir donde quedó.`,
        );
        return;
      }
      setResultadoActivacion(resultado);
      updateState({ importedCount: resultado.activados, importProgress: 100 });
      setIsComplete(true);
      // Adentro del muro NO se ofrece el diálogo de «mandato»: el dueño y la
      // comisión de cada inmueble se asocian en el paso Contratos, contrato
      // por contrato (y con un selector por fila). El diálogo pone UN
      // propietario a todos los inmuebles del lote — para una migración de
      // dueños distintos es la asociación equivocada, y «mandato» es una
      // palabra que la inmobiliaria no usa (Nico, 2026-09-01).
      if (resultado.activados > 0 && !onSalir) void buscarSinMandato(lote);
      // Las fotos van después de crear: el back no ve archivos.
      if (resultado.activados > 0) void subirFotosDeLosActivados(lote);
      if (resultado.omitidas.length > 0) {
        toast.warning("Importación parcial", {
          description: `${resultado.activados} activadas, ${resultado.omitidas.length} todavía con datos pendientes.`,
        });
      } else {
        toast.success("Importación exitosa", {
          description: `${resultado.activados} propiedades importadas correctamente`,
        });
      }
    } catch (e) {
      /*
       * Un corte a mitad de las tandas trae su progreso: sin esto, la
       * pantalla decía «no pudimos activar» habiendo activado 1.000, y la
       * persona no sabía si reintentar duplicaba. No duplica — el back no
       * repite filas — y hay que decirlo.
       */
      if (e instanceof ActivacionInterrumpida) {
        await refrescarRevision(lote, pagina);
        setError(
          e.progreso.activados > 0
            ? `Se activaron ${e.progreso.activados} inmuebles antes del corte (${e.message}). ` +
              `Nada se pierde ni se duplica: tocá «Activar» de nuevo y sigue donde quedó.`
            : `${e.message} No se activó ninguno todavía — tocá «Activar» de nuevo para reintentar.`,
        );
      } else {
        setError(e instanceof Error ? e.message : "No pudimos activar el lote.");
      }
    } finally {
      setActivando(false);
    }
  };

  const botonImportar = (
    <Button
      type="button"
      hideArrow
      onClick={handlePreparar}
      disabled={importCount === 0 || geocodificando || preparando}
      className="gap-2"
    >
      <FileArrowUp className="w-4 h-4" />
      {geocodificando || preparando
        ? "Preparando..."
        : t("inmobiliaria.import.confirm.importButton", { count: importCount })}
    </Button>
  );

  // ── Success state ────────────────────────────────────────────────────
  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
        <div className="animate-scale-in">
          <div className="w-20 h-20 rounded-full bg-success-soft flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-success" weight="fill" />
          </div>
        </div>

        <div className="animate-fade-in-up space-y-2">
          <h2 className="text-2xl font-semibold text-fg dark:text-white">
            ¡Importación completada!
          </h2>
          <p className="text-fg-muted dark:text-fg-subtle">
            Se importaron{" "}
            <span className="font-semibold text-fg dark:text-white">
              {state.importedCount} propiedades
            </span>{" "}
            a tu portafolio
          </p>
          {fotosProgreso && (
            <p className="text-sm text-fg-muted" data-testid="fotos-progreso" aria-live="polite">
              Subiendo las fotos de las fichas… {fotosProgreso.hechos} de {fotosProgreso.total}{" "}
              {fotosProgreso.total === 1 ? "inmueble" : "inmuebles"}. No cierres esta pestaña.
            </p>
          )}
          {resultadoActivacion && resultadoActivacion.omitidas.length > 0 && (
            <p className="text-sm text-warning">
              {resultadoActivacion.omitidas.length} filas quedaron pendientes de
              datos — volvé a «Revisión» para completarlas.
            </p>
          )}
          {/*
           * Sin mandato, un inmueble importado no se puede publicar Y NO SALE
           * en la grilla del portafolio: la importación parecía no haber
           * hecho nada. Se dice acá, con la salida al lado.
           */}
          {sinMandato.length > 0 && !ofrecerMandatos && (
            <p className="text-sm text-warning" data-testid="aviso-sin-mandato">
              {sinMandato.length === 1
                ? '1 inmueble quedó sin propietario: hasta que lo tenga no se puede publicar ni aparece en el portafolio.'
                : `${sinMandato.length} inmuebles quedaron sin propietario: hasta que lo tengan no se pueden publicar ni aparecen en el portafolio.`}{' '}
              <button
                type="button"
                className="underline underline-offset-2"
                onClick={() => setOfrecerMandatos(true)}
              >
                Asignar el propietario
              </button>
            </p>
          )}
          {/* Adentro del muro, qué sigue con el dueño de cada inmueble — en
              las palabras del muro, no en las del back. */}
          {onSalir && (state.importedCount ?? 0) > 0 && (
            <p className="text-sm text-fg-muted dark:text-fg-subtle" data-testid="aviso-propietario-en-contratos">
              El propietario y la comisión de cada inmueble los asociás en el paso
              Contratos, contrato por contrato. Los inmuebles que no tengan contrato
              los asociás después desde el portafolio.
            </p>
          )}
        </div>

        {ofrecerMandatos && sinMandato.length > 0 && (
          <CompletarMandatosLoteDialog
            inmuebles={sinMandato}
            propietarios={propietarios}
            agentes={agentes}
            onClose={() => setOfrecerMandatos(false)}
            onDone={() => {
              setOfrecerMandatos(false);
              // Relee: los que quedaron sin propietario siguen avisando.
              if (lote) void buscarSinMandato(lote);
            }}
          />
        )}

        <div className="flex items-center gap-3 animate-fade-in-up">
          {/* Adentro del muro de migración no hay portafolio que ver todavía
              (el muro tapa esa ruta): queda sólo «Importar más». */}
          {onSalir ? null : (
            <Button
              type="button"
              size="lg"
              hideArrow
              onClick={() => router.push("/panel/inmobiliaria/inmuebles")}
            >
              Ver portafolio
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="lg"
            hideArrow
            onClick={() => {
              updateState({
                method: null,
                file: null,
                fileName: "",
                rawRows: [],
                headers: [],
                sheetNames: [],
                selectedSheet: "",
                columnMappings: [],
                properties: [],
                aiAnalyzed: false,
                importProgress: 0,
                importedCount: 0,
              });
              router.push("/panel/inmobiliaria/inmuebles/importar");
            }}
          >
            Importar más
          </Button>
        </div>
      </div>
    );
  }

  // ── Batch staged, still ENCOLADO/PROCESANDO ─────────────────────────
  if (
    lote &&
    estadoLote?.estado !== "LISTO" &&
    estadoLote?.estado !== "FALLIDO"
  ) {
    return (
      <div className="space-y-6">
        <ProgresoDeLoteInmuebles
          estado={estadoLote}
          // Con la consulta manual el sondeo «revive» a ojos de la persona:
          // el cartel de agotado sólo tiene sentido si además no hay botón.
          agotado={agotado && estadoManual === null}
        />
        {agotado && (
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              hideArrow
              disabled={consultando}
              isLoading={consultando}
              onClick={handleConsultarDeNuevo}
              data-testid="consultar-de-nuevo"
            >
              ¿Ya terminó? Consultar de nuevo
            </Button>
            <p className="text-xs text-fg-subtle">
              El proceso sigue del lado del servidor — nada se perdió.
            </p>
          </div>
        )}
        {error && (
          <div
            className="rounded-md bg-danger-soft border border-border p-3"
            role="alert"
          >
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}
      </div>
    );
  }

  // ── Batch FALLIDO ─────────────────────────────────────────────────────
  if (lote && estadoLote?.estado === "FALLIDO") {
    return (
      <div className="space-y-6">
        <ProgresoDeLoteInmuebles estado={estadoLote} agotado={agotado} />
        {/*
         * La salida que faltaba: sin este botón, el FALLIDO era un callejón
         * — «Anterior» volvía a un paso cuyo «Siguiente» aterrizaba otra vez
         * acá, con el mismo lote muerto. Los datos del archivo siguen en el
         * wizard: preparar de nuevo arranca un lote NUEVO (clave de
         * idempotencia nueva — la vieja identifica al intento fallido) sin
         * re-subir nada.
         */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            hideArrow
            data-testid="preparar-de-nuevo"
            onClick={() => {
              setIdempotencyKey(generarIdempotencyKey());
              setError(null);
              setEstadoManual(null);
              updateState({ loteRetomado: null });
              setLote(null);
            }}
          >
            Preparar de nuevo
          </Button>
          <p className="text-xs text-fg-subtle">
            Tus datos siguen acá — no hace falta volver a subir el archivo.
          </p>
        </div>
      </div>
    );
  }

  // ── Batch LISTO — review + activate ─────────────────────────────────
  if (lote) {
    const puedeActivar = (resumenLote?.listos ?? 0) > 0;

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-fg dark:text-white mb-1">
            Revisá lo que falta antes de activar
          </h2>
          <p className="text-sm text-fg-muted dark:text-fg-subtle">
            Las filas listas se activan cuando quieras — cerrar esta pestaña no
            pierde nada.
          </p>
        </div>

        {resumenLote && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-md bg-surface-muted dark:bg-ink p-4">
              <MonoLabel className="block text-xs text-fg-muted mb-1">
                Total
              </MonoLabel>
              <p className="text-2xl font-bold text-fg">{resumenLote.total}</p>
            </div>
            <div className="rounded-md bg-warning-soft p-4">
              <MonoLabel className="block text-xs text-warning mb-1">
                Pendientes
              </MonoLabel>
              <p className="text-2xl font-bold text-warning">
                {resumenLote.pendientes}
              </p>
            </div>
            <div className="rounded-md bg-success-soft p-4">
              <MonoLabel className="block text-xs text-success mb-1">
                Listas
              </MonoLabel>
              <p className="text-2xl font-bold text-success">
                {resumenLote.listos}
              </p>
            </div>
            <div className="rounded-md bg-primary-soft p-4">
              <MonoLabel className="block text-xs text-primary mb-1">
                Activadas
              </MonoLabel>
              <p className="text-2xl font-bold text-primary">
                {resumenLote.activados}
              </p>
            </div>
          </div>
        )}

        {pendientes.length > 0 && (
          <div className="space-y-3">
            {pendientes.map((fila) => (
              <FilaImportacionRow
                key={fila.id}
                fila={fila}
                onResolver={handleResolver}
                onDescartar={handleDescartarFila}
                isBusy={filaBusy === fila.id}
              />
            ))}
            {/* Pie del design system: dice cuántas filas quedan por revisar
                y en cuál vas, no sólo «‹ 2 ›». Las páginas las sirve el back
                (`filas(lote, { pagina, porPagina })`), así que el tamaño de
                página no se ofrece: sin `pageSizeOptions` el selector no se
                monta y no queda un control que no hace nada. */}
            <div className="border-t border-border px-4 py-3">
              <TablePagination
                total={totalPendientes}
                page={pagina}
                pageSize={POR_PAGINA}
                onPageChange={(p) => void refrescarRevision(lote, p)}
              />
            </div>
          </div>
        )}

        {error && (
          <div
            className="flex flex-wrap items-center gap-3 rounded-md bg-danger-soft border border-border p-3"
            role="alert"
          >
            <p className="min-w-0 flex-1 text-sm text-danger">{error}</p>
            {/* La lista pudo quedar vieja detrás del error (una página que no
                cargó, una activación cortada): refrescar es siempre una
                salida segura — no muta nada. */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              hideArrow
              disabled={filaBusy !== null || activando || descartandoLote}
              onClick={() => void refrescarRevision(lote, pagina)}
              data-testid="revision-actualizar"
            >
              Actualizar la lista
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            hideArrow
            disabled={descartandoLote}
            isLoading={descartandoLote}
            onClick={handleDescartarLote}
          >
            Descartar lote completo
          </Button>
          <Button
            type="button"
            hideArrow
            disabled={!puedeActivar || activando}
            isLoading={activando}
            onClick={handleActivar}
          >
            {activando
              ? "Activando..."
              : `Activar ${resumenLote?.listos ?? 0} ${resumenLote?.listos === 1 ? "inmueble" : "inmuebles"}`}
          </Button>
        </div>
      </div>
    );
  }

  // ── Pre-import summary (no lote yet) ─────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-fg dark:text-white mb-1">
          Resumen de importación
        </h2>
        <p className="text-sm text-fg-muted dark:text-fg-subtle">
          Revisa el resumen antes de ejecutar la importación.
        </p>
      </div>

      <div className="rounded-lg border border-border dark:border-border-strong p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
            <FileArrowUp className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-fg dark:text-white">
              {t("inmobiliaria.import.confirm.title")}
            </h3>
            <p className="text-sm text-fg-muted dark:text-fg-subtle">
              {state.fileName}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="rounded-md bg-primary-soft p-4">
            <MonoLabel className="block text-xs text-primary mb-1">
              {t("inmobiliaria.import.confirm.propertiesToImport")}
            </MonoLabel>
            <p className="text-3xl font-bold text-primary">{importCount}</p>
          </div>

          <div className="rounded-md bg-surface-muted dark:bg-ink p-4">
            <MonoLabel className="block text-xs text-fg-muted dark:text-fg-subtle mb-1">
              {t("inmobiliaria.import.confirm.propertiesExcluded")}
            </MonoLabel>
            <p className="text-3xl font-bold text-fg-muted dark:text-fg-subtle">
              {excludedCount}
            </p>
          </div>

          <div className="rounded-md bg-success-soft p-4">
            <MonoLabel className="block text-xs text-success mb-1">
              {t("inmobiliaria.import.confirm.suggestionsAccepted")}
            </MonoLabel>
            <p className="text-3xl font-bold text-success">
              {acceptedSuggestionsCount}
            </p>
          </div>

          <div
            className={cn(
              "rounded-md p-4",
              remainingErrorsCount > 0 ? "bg-danger-soft" : "bg-success-soft",
            )}
          >
            <MonoLabel
              className={cn(
                "block text-xs mb-1",
                remainingErrorsCount > 0 ? "text-danger" : "text-success",
              )}
            >
              {t("inmobiliaria.import.confirm.remainingErrors")}
            </MonoLabel>
            <p
              className={cn(
                "text-3xl font-bold",
                remainingErrorsCount > 0 ? "text-danger" : "text-success",
              )}
            >
              {remainingErrorsCount}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border dark:border-border-strong bg-surface-muted dark:bg-white/[0.02] p-5">
        <div className="flex items-start gap-3">
          <UserCircle className="w-5 h-5 text-fg-subtle dark:text-fg-muted mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-fg dark:text-white text-sm">
              Asignación de agentes
            </h3>
            <p className="text-sm text-fg-muted dark:text-fg-subtle mt-1">
              Las propiedades se importarán sin agente asignado. Podrás asignar
              agentes individualmente o en lote desde el portafolio después de
              importar.
            </p>
          </div>
        </div>
      </div>

      {geocodificando && (
        <div className="space-y-2">
          <p className="text-sm text-fg-muted dark:text-fg-subtle">
            Buscando las direcciones en el mapa — {geoCurrent} de {importCount}
          </p>
          <Progress value={geoProgress} size="xs" />
          <p className="text-xs text-right font-mono text-fg-subtle dark:text-fg-muted">
            {geoProgress}%
          </p>
        </div>
      )}

      {bloqueadas.length > 0 && !geocodificando && (
        <div
          className="rounded-md bg-warning-soft border border-border p-3 flex items-start gap-2"
          data-testid="import-bloqueadas"
        >
          <WarningCircle
            className="w-5 h-5 text-warning flex-shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-warning">
              {bloqueadas.length === 1
                ? "1 inmueble no se puede importar"
                : `${bloqueadas.length} inmuebles no se pueden importar`}
            </p>
            <p className="text-body-sm text-fg-muted mt-0.5">
              Les falta {motivosBloqueo.join(", ")}. Volvé a{" "}
              <span className="font-medium text-fg">Revisión</span> con
              «Anterior» y completalos ahí en cada inmueble; el resto se importa
              igual.
            </p>
          </div>
        </div>
      )}

      {error && !geocodificando && (
        <div
          className="rounded-md bg-danger-soft border border-border p-3 flex items-start gap-2"
          role="alert"
          data-testid="import-error"
        >
          <WarningCircle
            className="w-5 h-5 text-danger flex-shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-danger">
              No se pudo preparar la importación
            </p>
            <p className="text-body-sm text-fg-muted mt-0.5 break-words">
              El servidor respondió: {error}
            </p>
          </div>
        </div>
      )}

      {ranuraDelPie ? (
        createPortal(botonImportar, ranuraDelPie)
      ) : (
        <div className="flex justify-end">{botonImportar}</div>
      )}
    </div>
  );
}
