"use client";

import {
  useState,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { useRanuraViva } from "@/components/migracion/ranura-viva";
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
import { resumenDeLecturaDeInmuebles } from "../lib/resumenDeLectura";
import type { ImportProperty } from "../lib/importTypes";
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

  /*
   * El nodo del muro que queda FUERA del `inert`. `null` en la página suelta
   * `/inmuebles/importar`, donde no hay muro y nada se congela.
   */
  const ranuraViva = useRanuraViva();

  // ── Phase 1: geocode (client-side, unchanged from before) + preparar() ──
  const [geocodificando, setGeocodificando] = useState(false);
  /*
   * 🔴 PARAR LA BÚSQUEDA DE DIRECCIONES.
   *
   * Son 2.883 filas a 550 ms cada una: media hora larga con el pie del muro
   * inerte (Nico, 2026-09-09: «le di cancelar o anterior y no deja»). Una
   * espera así SIEMPRE tiene que poder abandonarse.
   *
   * `useRef` y no `useState` a propósito: el bucle ya está corriendo y lee la
   * bandera en cada vuelta. Un `state` le quedaría congelado en el valor que
   * tenía cuando arrancó —el clásico stale closure— y el botón no haría nada,
   * que es justo el síntoma que venimos a arreglar.
   */
  const cancelarRef = useRef(false);
  /* Cuándo arrancó la búsqueda: la estimación sale de lo que de verdad está
   * tardando, no de multiplicar por la pausa entre filas —que ignora lo que
   * demora cada consulta y da un número que no se cumple. */
  const inicioGeoRef = useRef<number | null>(null);
  const [cancelandoGeo, setCancelandoGeo] = useState(false);
  const [geoCancelada, setGeoCancelada] = useState(false);
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
          description: `${r.procesadas} de ${r.total} filas procesadas. Puedes cerrar esta pestaña — te avisamos al terminar.`,
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
  const [revisando, setRevisando] = useState(false);
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
            description: `Ninguna de las ${r.fallidas} fotos de la ficha se pudo bajar. Puedes subirlas desde cada inmueble.`,
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
  /**
   * Cuántos minutos faltan, medidos.
   *
   * Sale del ritmo REAL de esta corrida (tiempo transcurrido ÷ filas hechas),
   * no de la pausa entre filas: la pausa ignora lo que demora cada consulta y
   * daría un número que no se cumple. Se calla hasta la quinta fila —con dos
   * o tres el promedio es ruido— y se calla también si da cero.
   *
   * Media hora de espera sin decir cuánto falta es la mitad de la razón por la
   * que alguien busca el botón de cancelar.
   */
  const minutosQueFaltan = useMemo(() => {
    if (!geocodificando || inicioGeoRef.current == null || geoCurrent < 5) {
      return null;
    }
    const porFila = (Date.now() - inicioGeoRef.current) / geoCurrent;
    const minutos = Math.ceil(
      (Math.max(0, importCount - geoCurrent) * porFila) / 60_000,
    );
    return minutos > 0 ? minutos : null;
  }, [geocodificando, geoCurrent, importCount]);

  /**
   * Pide parar. No corta a mitad de una fila: deja terminar la que está en
   * vuelo y sale en la siguiente vuelta, así no queda una dirección a medias.
   */
  const cancelarGeocodificacion = useCallback(() => {
    cancelarRef.current = true;
    setCancelandoGeo(true);
  }, []);

  const jobCorriendo =
    !agotado &&
    (estadoLote?.estado === 'ENCOLADO' || estadoLote?.estado === 'PROCESANDO');
  const hayOperacionEnVuelo =
    geocodificando ||
    preparando ||
    activando ||
    revisando ||
    descartandoLote ||
    jobCorriendo;
  useEffect(() => {
    /*
     * Se manda también CÓMO parar — pero SÓLO como respaldo.
     *
     * Desde el 2026-09-10 la barra sale por la ranura viva del muro, con su
     * botón al lado y fuera del `inert`, así que el del pie sobra y tener dos
     * botones para lo mismo a dos secciones de distancia es peor que tener
     * uno. El respaldo cubre el primer render —cuando la ranura todavía no
     * existe— y cualquier caso en que el muro no la ofrezca: una espera de
     * 53 minutos no se puede quedar sin salida por un detalle de montaje.
     */
    onOcupado?.(
      hayOperacionEnVuelo,
      geocodificando && !ranuraViva ? cancelarGeocodificacion : undefined,
    );
  }, [
    hayOperacionEnVuelo,
    geocodificando,
    ranuraViva,
    cancelarGeocodificacion,
    onOcupado,
  ]);
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
    // Cada intento arranca limpio: una cancelación vieja no puede matar la
    // siguiente antes de la primera fila.
    cancelarRef.current = false;
    inicioGeoRef.current = Date.now();
    setCancelandoGeo(false);
    setGeoCancelada(false);

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
    let cancelada = false;
    try {
      for (let i = 0; i < importables.length; i++) {
        // La salida. Se mira ANTES de pedir la fila siguiente: lo que ya se
        // buscó se descarta entero, así que no queda medio lote geocodificado
        // esperando a que alguien adivine qué pasó con él.
        if (cancelarRef.current) {
          cancelada = true;
          break;
        }
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
          : "No pudimos preparar los datos del archivo. Intenta de nuevo.",
      );
      return;
    } finally {
      setGeocodificando(false);
      setCancelandoGeo(false);
    }

    if (cancelada) {
      /*
       * Cortar acá, antes de `preparar()`: nada viajó al servidor todavía, así
       * que no hay lote a medias ni fila que limpiar. La persona vuelve a
       * tener sus botones y el paso queda exactamente como estaba.
       */
      setGeoProgress(0);
      setGeoCurrent(0);
      setGeoCancelada(true);
      return;
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
          description: `${sinUbicar} de ${dtos.length} direcciones no se encontraron en el mapa: esos inmuebles quedan en el centro de su ciudad y puedes ajustar el pin después, en cada ficha.`,
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
   * `POST .../activar` es resumible: el back devuelve lo que alcanzó a hacer
   * en su presupuesto de tiempo y cuántas filas quedan. El loop vive en
   * `activarLoteCompleto` (testeable aparte); acá sólo se orquesta el estado
   * de pantalla mientras corre.
   */
  /**
   * Volver a revisar lo pendiente. Reanudable igual que activar: se llama
   * mientras el servidor diga que quedan filas y siga liberando alguna.
   */
  const handleRevisarDeNuevo = async () => {
    if (!lote) return;
    setRevisando(true);
    setError(null);
    try {
      let liberadas = 0;
      for (let vuelta = 0; vuelta < 1_000; vuelta += 1) {
        const r = await inmueblesImportacionApi.revisarDeNuevo(lote);
        liberadas += r.liberadas;
        // Una tanda que no mira ninguna fila es una tanda que no va a cambiar
        // nada en la siguiente: se corta, igual que en la activación.
        if (r.restantes <= 0 || r.revisadas === 0) break;
      }
      await refrescarRevision(lote, pagina);
      if (liberadas === 0) {
        setError(
          "Volvimos a revisar y no se liberó ninguna: lo que queda pendiente " +
            "necesita que corrijas algo o que decidas.",
        );
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No pudimos volver a revisar el lote.",
      );
    } finally {
      setRevisando(false);
    }
  };

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
      if (resultado.detenidoPorLimite || resultado.detenidoSinAvance) {
        await refrescarRevision(lote, pagina);
        setError(
          resultado.detenidoSinAvance
            ? `Se activaron ${resultado.activados} inmuebles y el lote dejó de avanzar: ` +
              `la última tanda no movió ninguna fila. Nada se repite ni se duplica — ` +
              `revisa lo que quedó pendiente abajo y vuelve a tocar «Activar».`
            : `Se activaron ${resultado.activados} inmuebles y quedaron más por activar. ` +
              `Nada se repite ni se duplica: toca «Activar» de nuevo para seguir donde quedó.`,
        );
        return;
      }
      setResultadoActivacion(resultado);
      updateState({ importedCount: resultado.activados, importProgress: 100 });
      setIsComplete(true);
      // Adentro del muro NO se ofrece el diálogo de «mandato»: el dueño y la
      // comisión salen del propio archivo, fila por fila, y lo que quede sin
      // dueño se resuelve con el selector por fila. El diálogo pone UN
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
              `Nada se pierde ni se duplica: toca «Activar» de nuevo y sigue donde quedó.`
            : `${e.message} No se activó ninguno todavía — toca «Activar» de nuevo para reintentar.`,
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
              datos — vuelve a «Revisión» para completarlas.
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
          {/*
            🔴 Este texto decía lo contrario de lo que acababa de pasar
            (auditoría 2026-09-05): «el propietario y la comisión los asocias
            en el paso Contratos» sobre una importación que YA los asoció
            —`propietarioId` resuelto por la cédula del archivo y
            `commissionPercent` leído de la columna— y mandaba a la persona a
            repetir un trabajo hecho. Los que quedaron sin dueño los nombra el
            aviso de arriba (`aviso-sin-mandato`), uno por uno.
          */}
          {onSalir && (state.importedCount ?? 0) > 0 && (
            <p className="text-sm text-fg-muted dark:text-fg-subtle" data-testid="aviso-propietario-en-contratos">
              El propietario y la comisión salieron del archivo, inmueble por inmueble.
              Los puedes cambiar cuando quieras desde la ficha de cada inmueble.
            </p>
          )}
        </div>

        {/* Montado siempre y gobernado por `abierto`: sacarlo del árbol para
            cerrarlo dejaba a Radix sin nada que animar y el diálogo
            desaparecía de golpe. */}
        <CompletarMandatosLoteDialog
          abierto={ofrecerMandatos}
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
            Revisa lo que falta antes de activar
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

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
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
            {/*
             * Volver a revisar lo pendiente con las reglas de HOY.
             *
             * `faltantes` se calcula al preparar y se GUARDA, así que una fila
             * frenada por un motivo que ya no existe se quedaba frenada, y la
             * única salida era resubir el archivo: 53 minutos de
             * geocodificación para 2.864 inmuebles.
             */}
            {(resumenLote?.pendientes ?? 0) > 0 ? (
              <Button
                type="button"
                variant="ghost"
                hideArrow
                disabled={revisando || activando || descartandoLote}
                isLoading={revisando}
                onClick={handleRevisarDeNuevo}
                data-testid="revisar-de-nuevo"
              >
                {revisando ? "Revisando…" : "Volver a revisar lo pendiente"}
              </Button>
            ) : null}
          </div>
          <Button
            type="button"
            hideArrow
            disabled={!puedeActivar || activando || revisando}
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

  /*
   * ── La barra de la geocodificación, y por qué se define acá ──────────────
   *
   * Buscar 2.864 direcciones en el mapa toma ~53 minutos, así que la barra
   * necesita un botón para parar. Dentro del muro ese botón nacía MUERTO: el
   * muro pone `inert` sobre todo el paso mientras hay algo en vuelo, y `inert`
   * no se puede desactivar en un descendiente. Por eso la salida vivía en el
   * pie del muro — el único sitio fuera del `inert`— a dos secciones de la
   * barra que controlaba. Nico, 2026-09-10: «ese detener carga está súper mal
   * ubicado, debería estar mucho más cerca de la progress bar y quizás hacer
   * parte de la progress bar».
   *
   * La ranura viva invierte la solución: en vez de mandar el botón lejos, se
   * manda el BLOQUE ENTERO a un nodo que el muro dibuja fuera del `inert`,
   * pegado al contenido. Barra, conteo, minutos y botón viajan juntos y los
   * dos quedan vivos. Ver `migracion/ranura-viva.ts`.
   */
  const barraDeGeocodificacion = (
    <div className="space-y-2" data-testid="geo-progreso">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm text-fg-muted dark:text-fg-subtle">
          Buscando las direcciones en el mapa — {geoCurrent} de {importCount}
          {minutosQueFaltan != null && !cancelandoGeo ? (
            <span className="text-fg-subtle">
              {" "}
              · faltan unos {minutosQueFaltan} min
            </span>
          ) : null}
        </p>
        <Button
          type="button"
          variant="ghost"
          hideArrow
          onClick={cancelarGeocodificacion}
          disabled={cancelandoGeo}
          data-testid="geo-cancelar"
        >
          {cancelandoGeo ? "Deteniendo…" : "Detener la carga"}
        </Button>
      </div>
      <Progress value={geoProgress} size="xs" />
      <p className="text-xs text-right font-mono text-fg-subtle dark:text-fg-muted">
        {geoProgress}%
      </p>
    </div>
  );

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

      {/*
        El resumen honesto del paso: qué trae el archivo, con el número
        exacto. El bloque de arriba cuenta filas; éste responde la pregunta con
        la que alguien termina el paso — «¿cuántos quedaron con propietario?».
      */}
      <ResumenDeLoQueSeLeyo inmuebles={state.properties} />

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

      {/*
        La barra vive acá sólo cuando NO hay muro. Dentro del muro sale por la
        ranura viva — ver `barraDeGeocodificacion` arriba.
      */}
      {geocodificando && !ranuraViva ? barraDeGeocodificacion : null}
      {/*
        Con muro, la barra sale por la ranura viva: fuera del `inert`, pegada
        al contenido y con su botón de parar VIVO.
      */}
      {geocodificando && ranuraViva
        ? createPortal(barraDeGeocodificacion, ranuraViva)
        : null}

      {geoCancelada && (
        <div
          className="rounded-md bg-surface-muted border border-border p-3"
          data-testid="geo-cancelada"
        >
          <p className="text-sm font-medium text-fg">Se detuvo la búsqueda</p>
          <p className="text-body-sm text-fg-muted mt-0.5">
            No se importó nada y no quedó nada a medias en el servidor. Puedes
            volver atrás, cambiar lo que necesites, y arrancar de nuevo cuando
            quieras.
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
              Les falta {motivosBloqueo.join(", ")}. Vuelve a{" "}
              <span className="font-medium text-fg">Revisión</span> con
              «Anterior» y complétalos ahí en cada inmueble; el resto se importa
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

/**
 * Qué trae el archivo, con el número exacto y el motivo de lo que falta.
 *
 * No promete asociación —a qué ficha va cada propietario lo decide el back al
 * activar—: dice cuántas filas traen con qué buscar. Un archivo puede tener
 * 2.895 filas perfectas y ninguna cédula, y entonces nacen 2.895 inmuebles sin
 * dueño sin un solo error a la vista.
 */
function ResumenDeLoQueSeLeyo({ inmuebles }: { inmuebles: ImportProperty[] }) {
  const resumen = resumenDeLecturaDeInmuebles(inmuebles);
  if (resumen.total === 0) return null;

  return (
    <section
      className="rounded-lg border border-border bg-surface-muted p-5"
      data-testid="resumen-de-lectura-inmuebles"
    >
      <h3 className="text-sm font-semibold text-fg">
        Qué trae el archivo, de sus {resumen.total}{" "}
        {resumen.total === 1 ? "fila" : "filas"}
      </h3>
      <p className="mt-0.5 text-xs text-fg-muted">
        Esto es lo que se pudo LEER. A qué propietario y a qué contrato queda
        cada inmueble lo resuelve el servidor al activarlos, y lo dice fila por
        fila.
      </p>
      <ul className="mt-3 space-y-2">
        {resumen.renglones.map((r) => (
          <li key={r.que} className="text-sm">
            <span className="font-mono tabular-nums text-fg">{r.con}</span>
            <span className="text-fg-muted"> de {resumen.total} · </span>
            <span className="text-fg">{r.que}</span>
            {r.porque ? (
              <span className="block text-xs text-fg-muted">{r.porque}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
