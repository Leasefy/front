"use client";

import {
  useState,
  useContext,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { useRanuraViva } from "@/components/migracion/ranura-viva";
import { BarraDeTrabajo } from "@/components/migracion/BarraDeTrabajo";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle,
  FileArrowUp,
  UserCircle,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TablePagination } from "@/components/ui/pagination";
import { MonoLabel } from "@leasefy/cadence";
import { toast } from "@/components/ui/toast";
import { ApiError, asegurarSesionVigente } from "@/lib/api/client";
import { useAvisoAlSalir } from "@/lib/hooks/use-aviso-al-salir";
import { ubicarDireccion, ESPERA_ENTRE_BUSQUEDAS_MS } from "@/lib/inmuebles/ubicar-direccion";
import { faltantesParaElBack, tipoEfectivo } from "../lib/requisitosDelBack";
import { toImportarInmuebleDto } from "../lib/toImportarInmuebleDto";
import { resumenDeLecturaDeInmuebles } from "../lib/resumenDeLectura";
import type { ImportProperty } from "../lib/importTypes";
import { subirPorTandas, SubidaInterrumpida } from "../lib/subirPorTandas";
import { ubicarPorTandas, UbicacionInterrumpida } from "../lib/ubicarPorTandas";
import {
  etapaDeLaCarga,
  pasoVisibleDeLaCarga,
  ubicacionCompleta,
  type PasoVisible,
} from "../lib/describirCargaAbierta";
import {
  guardarClaveDeCarga,
  guardarClaveEnCurso,
  guardarHuellaDeCarga,
  leerClaveDeCarga,
  leerClaveEnCurso,
  leerHuellaDeCarga,
  olvidarClaveDeCarga,
  olvidarClaveEnCurso,
} from "../lib/claveDeCarga";
import { huellaDelArchivo } from "../lib/huellaDelArchivo";
import { mensajeDeCarga, MENSAJE_SESION_TERMINADA, esSesionMuerta } from "../lib/mensajeDeCarga";
import { traeErroresPorCampo } from "@/lib/errores/errores-en-el-formulario";
import { generarIdempotencyKey } from "../lib/idempotencia";
import { revisarLoteCompleto, type ProgresoDeRevision } from "../lib/revisarLoteCompleto";
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
import { LoteInmueblesMasivo } from "../LoteInmueblesMasivo";
import { ProgresoDeLoteInmuebles } from "../ProgresoDeLoteInmuebles";
import { useEstadoDeLoteInmuebles } from "@/lib/hooks/use-estado-de-lote-inmuebles";
import {
  inmueblesImportacionApi,
  type FilaDeImportacion,
  type ResolverInmuebleDto,
  type ResumenLoteInmuebles,
  type EstadoDeLoteInmuebles,
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
const MENSAJE_CREANDO_NO_SE_EDITA =
  "Se están creando las propiedades; espera a que termine para editar.";
/** T-0131 — cada cuánto se pregunta cómo va la creación en el servidor. */
const INTERVALO_DE_CREACION_MS = 4_000;

/**
 * Lo que la pantalla de cierre puede afirmar de la comisión: sólo lo que el
 * archivo traía. Exportada para probarla sin montar el paso.
 */
export function fraseDeLaComision(
  enviadas: ReadonlyArray<ImportProperty>,
): string {
  const deArriendo = enviadas.filter((p) => tipoEfectivo(p) !== "sale");
  const sinComision = deArriendo.filter(
    (p) => typeof p.commissionPercent !== "number" || !Number.isFinite(p.commissionPercent),
  ).length;
  if (deArriendo.length === 0 || sinComision === 0) {
    return "El propietario y la comisión salieron del archivo, inmueble por inmueble.";
  }
  if (sinComision === deArriendo.length) {
    return "El propietario salió del archivo, inmueble por inmueble. La comisión no venía en el archivo: queda vacía hasta que la traiga el contrato vigente o la escribas.";
  }
  return `El propietario salió del archivo, inmueble por inmueble. La comisión también, salvo en ${sinComision} ${sinComision === 1 ? "inmueble que no la traía: queda vacía" : "inmuebles que no la traían: quedan vacías"} hasta que la traiga el contrato vigente o la escribas.`;
}
export function StepConfirmImport({
  state,
  updateState,
  onSalir,
  onContinuar,
  onOcupado,
  onPasoVisible,
}: ImportStepProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const ranuraDelPie = useContext(RanuraDelPie);

  const properties = state.properties;
  /*
   * 🔴 QUÉ VIAJA AL BACK (QA 22-09: 14 de 145 inmuebles desaparecían).
   *
   * La revisión deja DESELECCIONADA sola toda fila con un error (sin precio,
   * sin dirección) y su casilla ni siquiera se puede marcar
   * (`AISuggestionCard`): nadie la excluyó, la excluyó la pantalla. Filtrar
   * acá por `selected` las tiraba en silencio mientras el resumen decía
   * «se importan igual y se completan en la revisión».
   *
   * Ahora: lo que la persona dejó marcado, MÁS toda fila con un error, que
   * entra PENDIENTE con su faltante a la vista. Excluida es sólo la que la
   * persona desmarcó teniendo cómo marcarla.
   */
  const selectedProperties = properties.filter(
    (p) => p.hasErrors || p.selected,
  );
  // Las que entran PENDIENTES: van al back con lo que les falta a la vista.
  const remainingErrorsCount = properties.filter((p) => p.hasErrors).length;

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
  /*
   * TODO lo seleccionado viaja al back, también lo que le falta algo. Antes
   * las «bloqueadas» se separaban acá y no se mandaban: 31 filas del archivo
   * real (sin precio) desaparecían en silencio del lote, y 10 contratos se
   * quedaron apuntando a inmuebles que nunca entraron. El staging existe
   * justo para eso: entran PENDIENTES con su faltante a la vista, se
   * completan fila por fila, y nada del archivo se pierde.
   */
  const aEnviar = [...importables, ...bloqueadas.map((x) => x.p)];
  const totalAEnviar = aEnviar.length;

  /*
   * El nodo del muro que queda FUERA del `inert`. `null` en la página suelta
   * `/inmuebles/importar`, donde no hay muro y nada se congela.
   */
  const ranuraViva = useRanuraViva();

  /*
   * ── Fase 1: subir el archivo por tandas, y ubicar las direcciones ─────────
   *
   * T-0130. Antes todo esto era UN bucle del navegador —buscar cada dirección
   * en el mapa (media hora para 2.864 filas) y recién después mandar el lote
   * entero—, así que un corte a mitad tiraba todo. Ahora:
   *
   *  1. SUBIR: el archivo viaja en tandas de 500 con la misma clave; el servidor
   *     guarda lo que llega y, si se corta, se sigue desde `siguienteDesde`.
   *  2. UBICAR: el navegador busca las direcciones (mismo proveedor, misma
   *     pausa que siempre), pero las que faltan salen del SERVIDOR de a 50 y
   *     cada tanda se guarda apenas termina. Un corte pierde a lo sumo 50.
   *
   * Los dos pasos paran con «Detener» y se retoman solos, sin el archivo.
   */
  const [subiendo, setSubiendo] = useState(false);
  const [subida, setSubida] = useState<{ enviadas: number; total: number } | null>(null);
  const [deteniendoSubida, setDeteniendoSubida] = useState(false);
  /*
   * `useRef` y no `useState` a propósito: los bucles ya están corriendo y leen
   * la bandera en cada vuelta. Un `state` les quedaría congelado en el valor que
   * tenía cuando arrancaron —el clásico stale closure— y el botón no haría nada.
   */
  const detenerSubidaRef = useRef(false);
  const [ubicando, setUbicando] = useState(false);
  const ubicandoRef = useRef(false);
  const detenerUbicacionRef = useRef(false);
  const [deteniendoUbicacion, setDeteniendoUbicacion] = useState(false);
  const [progresoUbicacion, setProgresoUbicacion] = useState<{
    ubicadas: number;
    total: number;
  } | null>(null);
  /* La persona paró (o se cortó): no se reanuda sola hasta que lo pida. */
  const [ubicacionEnPausa, setUbicacionEnPausa] = useState(false);
  /* Reinicia el sondeo del lote al terminar de ubicar: el back encola la revisión. */
  const [reinicioDelSondeo, setReinicioDelSondeo] = useState(0);
  const [reintentando, setReintentando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* El aviso nativo de cerrar la pestaña, SÓLO mientras algo vive en el navegador. */
  const hayFotosPorEnlace = properties.some((p) => (p.imagenes?.length ?? 0) > 0);
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

  const { estado: estadoSondeado, agotado } = useEstadoDeLoteInmuebles(lote, reinicioDelSondeo);

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
  /* Lo que el sondeo trae es más nuevo que una consulta puntual anterior. */
  useEffect(() => {
    if (estadoSondeado) setEstadoManual(null);
  }, [estadoSondeado]);
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
        mensajeDeCarga(e, "No pudimos consultar el estado del lote.", "consultar el estado de la carga"),
      );
    } finally {
      setConsultando(false);
    }
  };

  // ── Phase 2: review ──────────────────────────────────────────────────
  const [resumenLote, setResumenLote] = useState<ResumenLoteInmuebles | null>(
    null,
  );
  /* T-0129 — cuántas de las listas se crean con el canon por confirmar. */
  const [sinCanon, setSinCanon] = useState(0);
  const [pendientes, setPendientes] = useState<FilaDeImportacion[]>([]);
  const [totalPendientes, setTotalPendientes] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [filaBusy, setFilaBusy] = useState<string | null>(null);
  const [descartandoLote, setDescartandoLote] = useState(false);
  /* «Actualizar la lista» en vuelo: el botón gira en vez de verse muerto. */
  const [refrescando, setRefrescando] = useState(false);
  /*
   * 🔴 LAS OTRAS CARGAS, porque son las que deciden si se puede seguir.
   *
   * El paso de inmuebles del muro se queda «pendiente» mientras EXISTA una
   * fila LISTO en CUALQUIER lote de la agencia, no sólo en el que se está
   * mirando. Nico, 2026-09-11, con su lote entero activado (2.824 de 2.864, 0
   * listas) en pantalla: «no hay nada de cómo continuar, cómo pasar de ahí a
   * contratos». Lo frenaban 3.270 filas de cuatro cargas anteriores que ni
   * siquiera se veían desde acá.
   *
   * Se consultan al terminar el lote para poder decir la verdad: o queda
   * trabajo en otra parte —y se ofrece ir— o no queda nada y se ofrece seguir.
   */
  const [otrasCargas, setOtrasCargas] = useState<EstadoDeLoteInmuebles[] | null>(null);

  // ── Phase 3: «Crear todas» (T-0131) ─────────────────────────────────
  const [iniciandoCreacion, setIniciandoCreacion] = useState(false);
  /* El paso 4 antes de tocar «Crear todas»: se llega con «Continuar» desde la revisión. */
  const [irACrear, setIrACrear] = useState(false);
  /* Con una carga TERMINADA que aún tiene filas por revisar: volver a la lista. */
  const [verRevisionDeNuevo, setVerRevisionDeNuevo] = useState(false);
  const [revisando, setRevisando] = useState(false);
  /* Lo que va mirando «Volver a revisar»: con 1.654 pendientes son varios
     minutos, y un botón que sólo gira no dice si avanza. */
  const [progresoDeRevision, setProgresoDeRevision] = useState<ProgresoDeRevision | null>(null);
  /* La salida de la re-revisión. Vive en un ref porque el bucle la lee entre
     llamadas, y en estado sólo para que el botón diga «Deteniendo…». */
  const detenerRevisionRef = useRef(false);
  const [deteniendoRevision, setDeteniendoRevision] = useState(false);

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
      try {
        for (let pagina = 1; pagina <= 25; pagina++) {
          const p = await inmueblesImportacionApi.filas(elLote, { pagina, porPagina: 200, estado: 'ACTIVADO' });
          filas.push(...p.filas);
          if (p.filas.length < 200) break;
        }
      } catch (e) {
        // Antes esto quedaba como un rechazo sin atrapar (`void` en el efecto) y
        // las fotos no se subían sin que nadie lo supiera. Los inmuebles ya están
        // creados: se avisa y se dice dónde subirlas.
        toast.warning("Las fotos no se subieron", {
          description: `${mensajeDeCarga(e, "No pudimos leer los inmuebles creados.", "preparar las fotos")} Puedes subirlas desde cada inmueble.`,
        });
        return;
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
   * Pide parar la subida. No corta a mitad de una tanda: la que está en vuelo
   * llega y el bucle sale en la siguiente vuelta. Lo que llegó queda guardado y
   * «Continuar subiendo» sigue donde quedó.
   */
  const detenerSubida = useCallback(() => {
    detenerSubidaRef.current = true;
    setDeteniendoSubida(true);
  }, []);

  /**
   * Pide parar la búsqueda de direcciones. Deja terminar la fila en vuelo,
   * GUARDA lo que ya se buscó de la tanda y sale: no se pierde nada.
   */
  const detenerUbicacion = useCallback(() => {
    detenerUbicacionRef.current = true;
    setDeteniendoUbicacion(true);
  }, []);

  /*
   * T-0130 — el job del servidor (la revisión) ya NO cuenta como «ocupado»: no
   * hay nada del navegador que proteger ni que parar, y congelar el paso entero
   * mientras corre le quitaba a la persona «Anterior», «Cancelar» y la tarjeta
   * de cargas — justo cuando puede irse tranquila. Sólo congela lo que vive acá.
   */
  const hayOperacionEnVuelo =
    subiendo || ubicando || iniciandoCreacion || revisando || descartandoLote || reintentando;
  const detenerLoQueCorre = ubicando ? detenerUbicacion : detenerSubida;
  useEffect(() => {
    /*
     * Se manda también CÓMO parar — pero SÓLO como respaldo.
     *
     * Desde el 2026-09-10 la barra sale por la ranura viva del muro, con su
     * botón al lado y fuera del `inert`, así que el del pie sobra y tener dos
     * botones para lo mismo a dos secciones de distancia es peor que tener
     * uno. El respaldo cubre el primer render —cuando la ranura todavía no
     * existe— y cualquier caso en que el muro no la ofrezca.
     */
    onOcupado?.(
      hayOperacionEnVuelo,
      (subiendo || ubicando) && !ranuraViva ? detenerLoQueCorre : undefined,
    );
  }, [hayOperacionEnVuelo, subiendo, ubicando, ranuraViva, detenerLoQueCorre, onOcupado]);
  // Al desmontar (cambio de paso, «cancelar») el muro recupera sus botones.
  useEffect(() => () => onOcupado?.(false), [onOcupado]);
  /*
   * 🔴 Irse del paso PARA los bucles.
   *
   * El 2026-09-11 quedó un lote fantasma de 2.864 filas sin título: el primer
   * bucle siguió corriendo detrás, en un componente que ya no existía, y 26
   * minutos después mandó datos viejos. Un bucle que nadie ve no puede seguir
   * mandando cosas al servidor. Subir y ubicar se cortan en la siguiente vuelta
   * (guardando lo hecho: es reanudable); la revisión también.
   */
  useEffect(
    () => () => {
      detenerSubidaRef.current = true;
      detenerUbicacionRef.current = true;
      detenerRevisionRef.current = true;
    },
    [],
  );

  /*
   * T-0130 — las filas que no se pudieron CREAR al activar, con su motivo. Salen
   * de `GET filas` (cada una trae `errorDeActivacion`); una fila fallida sigue
   * LISTO pero el back la aparta del conteo de «por crear», así que se buscan
   * entre las LISTO. Sólo se piden cuando el lote dice que hay.
   */
  const [filasFallidas, setFilasFallidas] = useState<FilaDeImportacion[]>([]);
  const cargarFallidas = useCallback(async (elLote: string) => {
    try {
      const encontradas: FilaDeImportacion[] = [];
      for (let pag = 1; pag <= 25; pag += 1) {
        const p = await inmueblesImportacionApi.filas(elLote, {
          pagina: pag,
          porPagina: 200,
          estado: "LISTO",
        });
        encontradas.push(...p.filas.filter((f) => f.errorDeActivacion));
        if (p.filas.length < 200) break;
      }
      setFilasFallidas(encontradas);
    } catch {
      // La lista es un detalle: el conteo y «Reintentar» siguen ahí.
    }
  }, []);

  const refrescarRevision = useCallback(async (elLote: string, pag = 1) => {
    try {
      const [r, p, e, m] = await Promise.all([
        inmueblesImportacionApi.resumen(elLote),
        inmueblesImportacionApi.filas(elLote, {
          pagina: pag,
          porPagina: POR_PAGINA,
          estado: "PENDIENTE",
        }),
        // T-0130: «X de Y creadas» y las fallidas salen del lote, no de las filas.
        // Si esta lectura falla no tumba la revisión.
        inmueblesImportacionApi.estadoDeLote(elLote).catch(() => null),
        // El aviso del canon por confirmar es informativo: si no llega, no se afirma nada.
        inmueblesImportacionApi.motivos(elLote).catch(() => null),
      ]);
      if (e) setEstadoManual(e);
      setSinCanon(m?.sinCanon ?? 0);
      setResumenLote(r);
      setPendientes(p.filas);
      setTotalPendientes(p.total);
      setPagina(p.pagina);
      if ((e?.fallidas ?? 0) > 0) void cargarFallidas(elLote);
      else setFilasFallidas([]);
      /*
       * 🔴 Borrar el aviso viejo. Nico, 2026-09-11: «le doy ahí a actualizar
       * lista y no funciona». Sí funcionaba —la consulta salía y volvía— pero
       * el cartel rojo se quedaba puesto porque nadie lo bajaba nunca, así
       * que en pantalla el botón no hacía absolutamente nada. Un error que
       * sobrevive a su propia solución es un error que miente.
       *
       * Va al final a propósito: si algo de arriba falla, el `catch` pone el
       * mensaje nuevo y este `null` no llega a correr.
       */
      setError(null);
    } catch (e) {
      setError(mensajeDeCarga(e, "No pudimos abrir ese lote.", "abrir esta carga"));
    }
  }, [cargarFallidas]);

  /*
   * Las otras cargas: se preguntan cuando ESTE lote ya no tiene nada que
   * activar, que es justo cuando la pregunta importa («¿puedo seguir?»). No
   * se sondean: `lotesAbiertos` recorre hasta 50 lotes y cuenta filas de cada
   * uno, y la respuesta sólo cambia cuando alguien activa o descarta algo.
   */
  const sinNadaQueActivar =
    resumenLote !== null && resumenLote.listos === 0 && resumenLote.activados > 0;
  useEffect(() => {
    if (!sinNadaQueActivar) {
      setOtrasCargas(null);
      return;
    }
    let vivo = true;
    inmueblesImportacionApi
      .lotesAbiertos()
      .then((ls) => {
        if (vivo) setOtrasCargas(ls);
      })
      // Un fallo acá no puede tapar la pantalla: se calla y no se afirma nada.
      .catch(() => {
        if (vivo) setOtrasCargas(null);
      });
    return () => {
      vivo = false;
    };
  }, [sinNadaQueActivar, lote]);

  /* El aviso de «carga terminada» se puede cerrar (Nico, 2026-09-12). El
     botón NO: vive al pie y es la salida del paso. */
  const [avisoDeCargaCerrado, setAvisoDeCargaCerrado] = useState(false);
  /** ¿Ya sabemos qué hay en las otras cargas? `null` = la consulta no volvió. */
  const sabemosDeOtrasCargas = otrasCargas !== null;
  /** Filas LISTO que viven en OTRO lote: son las que frenan el paso del muro. */
  const listosEnOtrasCargas = (otrasCargas ?? [])
    .filter((l) => l.lote !== lote)
    .reduce((suma, l) => suma + (l.listas ?? l.listos), 0);
  const cuantasOtrasCargas = (otrasCargas ?? []).filter(
    (l) => l.lote !== lote && (l.listas ?? l.listos) > 0,
  ).length;

  // El lote pasó a LISTO (por el sondeo, o porque llegamos por el ?lote= de
  // la notificación con el batch ya terminado): recién ahí tiene sentido
  // cargar la lista de trabajo real. T-0131: también al llegar a un lote
  // TERMINADA, y al terminar de crear (para contar lo que quedó por revisar).
  const faseDelLote = estadoLote?.fase;
  useEffect(() => {
    if (!lote) return;
    if (faseDelLote === "CREANDO") return;
    if (
      estadoLote?.estado === "LISTO" ||
      faseDelLote === "LISTA" ||
      faseDelLote === "TERMINADA"
    ) {
      refrescarRevision(lote);
    }
  }, [lote, estadoLote?.estado, faseDelLote, refrescarRevision]);

  /*
   * ── T-0131 · mientras el servidor CREA ───────────────────────────────────
   *
   * La creación es UN proceso del servidor: la página no hace nada salvo mirar
   * cómo va. El sondeo del lote (`useEstadoDeLoteInmuebles`) se detiene en
   * LISTO, que puede ser el estado de este job, así que acá hay uno propio que
   * corre sólo mientras `fase === CREANDO` y entrega el estado completo.
   */
  const creandoEnElServidor = faseDelLote === "CREANDO";
  /* El proceso se rindió tras sus reintentos (`FALLIDO` + `error`): nadie lo está creando. */
  const creacionFallida = creandoEnElServidor && estadoLote?.estado === "FALLIDO";
  const creandoActivo = creandoEnElServidor && !creacionFallida;
  /*
   * Las fotos por ENLACE se suben desde ESTA pestaña cuando termina la creación
   * (el back no ve archivos): con ellas pendientes —esperando o subiendo—,
   * cerrar la pestaña las pierde. El aviso nativo sigue activo hasta que acaban.
   */
  useAvisoAlSalir(
    subiendo ||
      ubicando ||
      fotosProgreso !== null ||
      (hayFotosPorEnlace && (iniciandoCreacion || creandoActivo)),
  );
  useEffect(() => {
    if (!lote || !creandoActivo) return;
    let vigente = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const vuelta = async () => {
      try {
        await asegurarSesionVigente();
        const e = await inmueblesImportacionApi.estadoDeLote(lote);
        if (!vigente) return;
        setEstadoManual(e);
        if (e.fase !== "CREANDO" || e.estado === "FALLIDO") return;
      } catch (err) {
        // Sin sesión no hay a quién preguntarle; el resto es un corte pasajero.
        if (esSesionMuerta(err)) return;
        // El lote ya no existe (se descartó en otra pestaña): se vuelve al inicio.
        if (err instanceof ApiError && err.status === 404) {
          toast.error("Esta carga ya no existe", {
            description: "Se descartó o se cerró. Empieza de nuevo cuando quieras.",
          });
          updateState({ loteRetomado: null, subidaRetomada: null });
          if (onSalir) onSalir();
          else router.push("/panel/inmobiliaria/inmuebles/importar");
          return;
        }
      }
      if (vigente) timeoutId = setTimeout(() => void vuelta(), INTERVALO_DE_CREACION_MS);
    };
    timeoutId = setTimeout(() => void vuelta(), INTERVALO_DE_CREACION_MS);
    return () => {
      vigente = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [lote, creandoActivo, updateState, onSalir, router]);

  /* Lo que ya se creó o falló, según el lote (nunca según lo que hay en pantalla). */
  const creacion = estadoLote?.creacion ?? null;
  const nFallidas = creacion?.fallidas ?? estadoLote?.fallidas ?? 0;
  const nCreadas = creacion?.creadas ?? estadoLote?.activadas ?? 0;
  const terminadaSinFallas =
    faseDelLote === "TERMINADA" && nFallidas === 0 && !verRevisionDeNuevo;
  const terminadaConFallas =
    faseDelLote === "TERMINADA" && nFallidas > 0 && !verRevisionDeNuevo;
  /*
   * Las que de verdad se pueden crear: `listas` ya descuenta las fallidas (que
   * siguen LISTO pero sólo se retoman con «Reintentar», nunca con `crear`).
   */
  const listasParaCrear = estadoLote?.listas ?? resumenLote?.listos ?? 0;
  /* Ya se crearon algunas (el lote volvió a LISTA porque se corrigió una fila). */
  const yaSeCrearonAlgunas = (creacion?.creadas ?? 0) > 0;

  /*
   * Volver a una carga que ya creó algunas y tiene más listas (una fila corregida
   * después de TERMINADA): se cae directo en el paso 4 con «Crear las N que
   * faltan». Sólo la PRIMERA vez que se lee el lote: quien está corrigiendo no
   * puede ser arrastrado fuera de la lista a mitad.
   */
  const entradaResuelta = useRef(false);
  useEffect(() => {
    if (entradaResuelta.current || !estadoLote) return;
    entradaResuelta.current = true;
    if (
      estadoLote.fase === "LISTA" &&
      (estadoLote.creacion?.creadas ?? 0) > 0 &&
      (estadoLote.listas ?? 0) > 0
    ) {
      setIrACrear(true);
    }
  }, [estadoLote]);
  const cierreAplicado = useRef<string | null>(null);

  /* En cuál de los 4 pasos visibles va la carga: el asistente lo dibuja en su indicador. */
  const pasoVisible: PasoVisible = subiendo
    ? 1
    : ubicando
      ? 2
      : irACrear
        ? 4
        : verRevisionDeNuevo
          ? 3
          : pasoVisibleDeLaCarga(lote ? estadoLote : null);
  useEffect(() => {
    onPasoVisible?.(pasoVisible);
  }, [pasoVisible, onPasoVisible]);

  /*
   * ── Subir el archivo ─────────────────────────────────────────────────────
   *
   * El lote que se está subiendo, si ya existe: o uno que se retomó desde la
   * tarjeta de cargas, o uno que quedó a medias en esta misma pantalla. En los
   * dos casos se sigue con SU clave (guardada al llegar la primera tanda) y
   * desde `siguienteDesde`; nunca se abre otro lote con el mismo archivo.
   */
  const loteEnSubida =
    state.subidaRetomada?.lote ??
    (lote && estadoLote?.fase === "RECIBIENDO" ? lote : null);

  const handlePreparar = async () => {
    if (totalAEnviar === 0 || subiendo) return;
    setError(null);
    setSubiendo(true);
    setSubida({ enviadas: 0, total: totalAEnviar });
    setDeteniendoSubida(false);
    detenerSubidaRef.current = false;
    let loteConocido: string | null = loteEnSubida;
    try {
      const dtos = aEnviar.map((p) => toImportarInmuebleDto(p));
      const huella = await huellaDelArchivo(dtos);
      let clave = idempotencyKey;
      let desdeInicial = 0;

      if (loteEnSubida) {
        const guardada = leerClaveDeCarga(loteEnSubida);
        if (!guardada) {
          setError(
            "No podemos seguir subiendo esta carga desde este navegador. Descártala y sube el archivo otra vez.",
          );
          return;
        }
        // Mismo conteo de filas NO basta: otro archivo se mezclaría con el
        // primero. Si se guardó la huella de la carga, tiene que coincidir.
        const huellaGuardada = leerHuellaDeCarga(loteEnSubida);
        if (huella && huellaGuardada && huella !== huellaGuardada) {
          setError(mensajeDeCarga(new ApiError(409, "", "ARCHIVO_DISTINTO"), ""));
          return;
        }
        clave = guardada;
        const e = await inmueblesImportacionApi.estadoDeLote(loteEnSubida);
        if (e.total !== dtos.length) {
          setError(
            `El archivo tiene ${dtos.length.toLocaleString("es-CO")} filas y la carga que dejaste a medias tenía ${e.total.toLocaleString("es-CO")}. Sube el mismo archivo para continuar.`,
          );
          return;
        }
        setEstadoManual(e);
        if (e.fase !== "RECIBIENDO" || e.siguienteDesde === null) {
          // Ya llegó todo mientras tanto: no hay nada que subir.
          updateState({ subidaRetomada: null });
          olvidarClaveDeCarga(loteEnSubida);
          return;
        }
        desdeInicial = e.siguienteDesde ?? 0;
      } else {
        // Un intento cortado antes de la primera respuesta pudo crear el lote:
        // con el MISMO archivo se reusa su clave y el back devuelve ese lote.
        clave = leerClaveEnCurso(huella) ?? idempotencyKey;
      }
      // Antes de la primera petición: si la respuesta no llega, la clave sigue.
      if (!loteEnSubida) guardarClaveEnCurso(clave, huella);

      const r = await subirPorTandas({
        filas: dtos,
        claveDeIdempotencia: clave,
        desdeInicial,
        huella,
        enviar: (tanda, k, opciones) =>
          inmueblesImportacionApi.preparar(tanda, k, opciones),
        antesDeCada: asegurarSesionVigente,
        debeParar: () => detenerSubidaRef.current,
        alAvanzar: (p) => {
          setSubida({ enviadas: p.enviadas, total: p.total });
          setEstadoManual(p.estado);
          // El lote es SIEMPRE del servidor — nunca uno generado acá. Se guarda
          // desde la primera respuesta: en el estado del asistente (sobrevive a
          // «Anterior» y a un remount) y, con su clave, en el navegador (sobrevive
          // a una recarga: sin la clave no se puede seguir subiendo).
          if (loteConocido !== p.lote) {
            loteConocido = p.lote;
            setLote(p.lote);
            updateState({ loteRetomado: p.lote });
            guardarClaveDeCarga(p.lote, clave);
            if (huella) guardarHuellaDeCarga(p.lote, huella);
            olvidarClaveEnCurso();
          }
        },
      });

      if (r.detenidaPorPersona) {
        toast.info("Subida detenida", {
          description: `Llegaron ${(r.estado?.recibidas ?? 0).toLocaleString("es-CO")} de ${totalAEnviar.toLocaleString("es-CO")} filas. Nada se pierde: toca «Continuar subiendo» cuando quieras.`,
        });
        return;
      }
      if (r.estado) {
        // Todo llegó: la clave ya no hace falta y lo que sigue es ubicar.
        olvidarClaveDeCarga(r.estado.lote);
        updateState({ subidaRetomada: null, loteRetomado: r.estado.lote });
        setUbicacionEnPausa(false);
        setEstadoManual(r.estado);
      }
    } catch (e) {
      const causa = e instanceof SubidaInterrumpida ? (e.causa ?? e) : e;
      const cortada = e instanceof SubidaInterrumpida;
      if (cortada && e.lote) {
        // Llegó parte: el lote existe y se retoma. Se refresca para decir cuánto.
        try {
          setEstadoManual(await inmueblesImportacionApi.estadoDeLote(e.lote));
        } catch {
          // Sin el estado la pantalla igual ofrece seguir.
        }
      }
      setError(
        esSesionMuerta(causa)
          ? MENSAJE_SESION_TERMINADA
          : `${mensajeDeCarga(causa, "No pudimos subir el archivo.", "subir el archivo")}${cortada && e.lote ? " Lo que ya llegó está guardado: toca «Continuar subiendo» para seguir donde quedó." : ""}`,
      );
    } finally {
      setSubiendo(false);
      setDeteniendoSubida(false);
    }
  };

  /*
   * ── Ubicar las direcciones ────────────────────────────────────────────────
   *
   * Corre en el navegador pero sale del servidor y se guarda en el servidor, de
   * a 50. Arranca sola cuando el lote está en esa etapa (recién subido, o
   * retomado desde la tarjeta) salvo que la persona la haya parado.
   */
  const handleUbicar = useCallback(async () => {
    if (!lote || ubicandoRef.current) return;
    ubicandoRef.current = true;
    setUbicando(true);
    setUbicacionEnPausa(false);
    setDeteniendoUbicacion(false);
    detenerUbicacionRef.current = false;
    setError(null);
    const e0 = estadoLote;
    try {
      const r = await ubicarPorTandas({
        lote,
        desdeInicial: e0?.ubicacion?.siguienteDesde ?? 0,
        ubicadasAlEmpezar: e0?.ubicacion?.ubicadas ?? 0,
        totalAlEmpezar: e0?.ubicacion?.total ?? e0?.total ?? 0,
        traer: (l, d) => inmueblesImportacionApi.porUbicar(l, d),
        // La MISMA búsqueda de siempre: proveedor, regla y pausa no cambian.
        ubicar: (f) =>
          ubicarDireccion({
            direccion: f.direccion,
            ciudad: f.ciudad,
            departamento: f.departamento,
          }),
        guardar: (l, filas) => inmueblesImportacionApi.guardarUbicaciones(l, filas),
        alAvanzar: setProgresoUbicacion,
        debeParar: () => detenerUbicacionRef.current,
        antesDeCada: asegurarSesionVigente,
        pausaMs: ESPERA_ENTRE_BUSQUEDAS_MS,
      });
      if (r.detenidaPorPersona) {
        setUbicacionEnPausa(true);
        toast.info("Búsqueda detenida", {
          description: `Van ${r.ubicadas.toLocaleString("es-CO")} de ${r.total.toLocaleString("es-CO")} direcciones, ya guardadas. Toca «Continuar ubicando» cuando quieras.`,
        });
      } else if (r.terminada) {
        /*
         * 🔴 Lo que NO se encontró se dice, y se dice distinto según en qué
         * quedó: «en el centro de su ciudad» era falso para las que no
         * quedaban en ningún lado (1.442 en el portafolio de Nico).
         */
        const notas = [
          r.enElMunicipio > 0
            ? `${r.enElMunicipio} quedan en el centro de su municipio, porque la dirección es una referencia («detrás de la escuela») o no apareció`
            : null,
          r.sinUbicar > 0
            ? `${r.sinUbicar} quedan sin punto en el mapa: no pudimos ubicar ni su municipio`
            : null,
        ].filter(Boolean);
        if (notas.length > 0) {
          toast.info(`${r.enElMunicipio + r.sinUbicar} de ${r.total} sin dirección exacta`, {
            description: `${notas.join(" · ")}. El pin se ajusta después en cada ficha.`,
          });
        }
        // El servidor encola solo la revisión: hay que volver a mirarlo. Y no se
        // reanuda sola otra vez aunque la lectura del estado falle.
        setUbicacionEnPausa(true);
        setReinicioDelSondeo((n) => n + 1);
      }
    } catch (e) {
      const causa = e instanceof UbicacionInterrumpida ? (e.causa ?? e) : e;
      setUbicacionEnPausa(true);
      setError(
        esSesionMuerta(causa)
          ? MENSAJE_SESION_TERMINADA
          : `${mensajeDeCarga(causa, "Se cortó la búsqueda de direcciones.", "guardar las direcciones")} Lo que ya se ubicó está guardado: toca «Continuar ubicando» para seguir.`,
      );
    } finally {
      ubicandoRef.current = false;
      setUbicando(false);
      setDeteniendoUbicacion(false);
      setProgresoUbicacion(null);
      // Lo que dice el servidor es la verdad: de ahí salen el «X de Y» y la etapa.
      try {
        setEstadoManual(await inmueblesImportacionApi.estadoDeLote(lote));
      } catch {
        // Con el sondeo basta.
      }
    }
  }, [lote, estadoLote]);

  const etapaDelLote = estadoLote ? etapaDeLaCarga(estadoLote) : null;
  useEffect(() => {
    if (
      lote &&
      etapaDelLote === "ubicando" &&
      !ubicando &&
      !subiendo &&
      !ubicacionEnPausa &&
      !ubicandoRef.current &&
      // Con todas ubicadas no hay nada que buscar: la persona da el paso.
      !(estadoLote && ubicacionCompleta(estadoLote))
    ) {
      void handleUbicar();
    }
  }, [lote, etapaDelLote, ubicando, subiendo, ubicacionEnPausa, handleUbicar, estadoLote]);

  /** «Continuar sin ubicar en el mapa» y «Reintentar» (job muerto / filas fallidas). */
  const handleReintentar = async (omitirUbicacion = false) => {
    if (!lote) return;
    setReintentando(true);
    setError(null);
    try {
      await asegurarSesionVigente();
      const r = await inmueblesImportacionApi.reintentar(lote, { omitirUbicacion });
      setEstadoManual(r.lote);
      setUbicacionEnPausa(false);
      setReinicioDelSondeo((n) => n + 1);
      if (!omitirUbicacion && r.lote.fase === "CREANDO") {
        // T-0131: reintentar las fallidas re-encola la creación en el servidor.
        toast.success("Seguimos creando las que fallaron", {
          description: "Puedes cerrar esta página: las seguimos creando.",
        });
      } else if (r.accion === "FILAS_LIBERADAS") {
        toast.success(
          `${r.filasLiberadas} ${r.filasLiberadas === 1 ? "fila liberada" : "filas liberadas"}`,
          { description: "Quedaron listas: toca «Continuar» y «Crear todas» para intentarlas de nuevo." },
        );
        await refrescarRevision(lote, pagina);
      }
    } catch (e) {
      setError(mensajeDeCarga(e, "No pudimos reintentar esta carga.", "reintentar esta carga"));
    } finally {
      setReintentando(false);
    }
  };

  const handleResolver = async (id: string, cambios: ResolverInmuebleDto) => {
    if (!lote) return;
    setFilaBusy(id);
    try {
      await inmueblesImportacionApi.resolver(id, cambios);
      await refrescarRevision(lote, pagina);
    } catch (e) {
      if (e instanceof ApiError && e.code === "LOTE_EN_PROCESO") {
        toast.error(MENSAJE_CREANDO_NO_SE_EDITA);
        await refrescarRevision(lote, pagina);
      } else if (e instanceof ApiError && e.code === "FILA_YA_ACTIVADA") {
        toast.error(
          "Esta fila ya se activó — no se puede editar. La lista se actualizó.",
        );
        // La fila que se ve es vieja: refrescar la saca de la lista en vez
        // de dejar a la persona editando un fantasma que siempre da 409.
        await refrescarRevision(lote, pagina);
      } else if (traeErroresPorCampo(e)) {
        // Un 400 con `campos` (un canon de once cifras, una fecha mal
        // escrita): lo pinta la FILA debajo de su campo, con el foco ahí.
        // Un toast suelto la dejaría adivinando cuál de los diez inputs era.
        throw e;
      } else {
        toast.error(mensajeDeCarga(e, "No pudimos guardar los cambios.", "guardar la fila"));
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
        e instanceof ApiError && e.code === "LOTE_EN_PROCESO"
          ? MENSAJE_CREANDO_NO_SE_EDITA
          : mensajeDeCarga(e, "No pudimos descartar la fila.", "descartar la fila"),
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
      // `LOTE_EN_PROCESO` es «espera a que termine», no un fallo de la persona.
      setError(mensajeDeCarga(e, "No pudimos descartar el lote.", "descartar la carga"));
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
    setProgresoDeRevision(null);
    detenerRevisionRef.current = false;
    setDeteniendoRevision(false);
    setError(null);
    try {
      // Una vuelta completa por cursor — NO «mientras restantes > 0»: una
      // fila que sigue pendiente por un motivo real (un `tipo` que no mapea)
      // cuenta en `restantes` para siempre y ese bucle no terminaba nunca
      // (2026-09-11: 151 llamadas sobre una sola fila).
      const r = await revisarLoteCompleto(
        lote,
        (l, desdeFila) => inmueblesImportacionApi.revisarDeNuevo(l, desdeFila),
        setProgresoDeRevision,
        { debeParar: () => detenerRevisionRef.current },
      );
      await refrescarRevision(lote, pagina);
      if (r.detenidoPorPersona) {
        toast.info("Revisión detenida", {
          description: `Miramos ${r.revisadas} filas y liberamos ${r.liberadas}; lo liberado no se pierde.`,
        });
      } else if (r.detenidoSinAvance || r.detenidoPorLimite) {
        setError(
          `Miramos ${r.revisadas} filas y liberamos ${r.liberadas}, pero no ` +
            "pudimos terminar la vuelta. Vuelve a intentarlo: lo liberado no se pierde.",
        );
      } else if (r.liberadas === 0) {
        setError(
          "Volvimos a revisar y no se liberó ninguna: lo que queda pendiente " +
            "necesita que corrijas algo o que decidas.",
        );
      }
    } catch (e) {
      setError(
        mensajeDeCarga(e, "No pudimos volver a revisar el lote.", "volver a revisar la carga"),
      );
    } finally {
      setRevisando(false);
      setProgresoDeRevision(null);
      setDeteniendoRevision(false);
    }
  };

  /*
   * La barra de la re-revisión, con su salida. Sale por la ranura viva del
   * muro (fuera del `inert`) por la misma razón que la de geocodificación:
   * mientras se revisa, el paso entero está congelado y un «Detener» adentro
   * se vería vivo y estaría muerto.
   */
  const barraDeRevision = (
    <div
      className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
      data-testid="revision-progreso"
      aria-live="polite"
    >
      <p className="text-sm text-fg-muted dark:text-fg-subtle">
        Volviendo a revisar lo pendiente
        {progresoDeRevision
          ? ` — ${progresoDeRevision.revisadas} miradas · ${progresoDeRevision.liberadas} liberadas · quedan ${progresoDeRevision.restantes}`
          : "…"}
      </p>
      <Button
        type="button"
        variant="ghost"
        hideArrow
        onClick={() => {
          detenerRevisionRef.current = true;
          setDeteniendoRevision(true);
        }}
        disabled={deteniendoRevision}
        data-testid="revision-detener"
      >
        {deteniendoRevision ? "Deteniendo…" : "Detener"}
      </Button>
    </div>
  );

  const avisoDeCargaTerminada = (
    <div
      className="flex items-start gap-3 rounded-lg border border-border bg-surface-muted p-4 dark:border-border-strong dark:bg-white/[0.02]"
      data-testid="lote-terminado"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium text-fg dark:text-white">
          Los inmuebles de esta carga ya se crearon — {resumenLote?.activados}{" "}
          {resumenLote?.activados === 1 ? "inmueble" : "inmuebles"} en tu
          portafolio.
        </p>
        {(resumenLote?.pendientes ?? 0) > 0 && (
          <p className="text-sm text-fg-muted dark:text-fg-subtle">
            Quedan {resumenLote?.pendientes} filas con datos por corregir. No
            frenan nada: puedes arreglarlas acá o dejarlas fuera y seguir.
          </p>
        )}
        {!sabemosDeOtrasCargas ? (
          <p className="text-sm text-fg-subtle" data-testid="mirando-otras-cargas">
            Revisando si queda algo pendiente en otras cargas…
          </p>
        ) : listosEnOtrasCargas > 0 ? (
          <p className="text-sm text-fg-muted dark:text-fg-subtle">
            Antes de seguir: {cuantasOtrasCargas}{" "}
            {cuantasOtrasCargas === 1 ? "carga anterior tiene" : "cargas anteriores tienen"}{" "}
            {listosEnOtrasCargas} inmuebles preparados que todavía no existen.
            Mientras falten, este paso no se da por terminado.
          </p>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Cerrar el aviso"
        data-testid="cerrar-aviso-carga"
        onClick={() => setAvisoDeCargaCerrado(true)}
        className="rounded-sm p-1 text-fg-subtle transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );

  /* La salida del paso, para el pie. `null` mientras no se sepa cuál es: un
     botón que cambia de identidad debajo del dedo no se puede usar. */
  const salidaDelPaso =
    !sinNadaQueActivar || !sabemosDeOtrasCargas ? null : listosEnOtrasCargas >
      0 ? (
      onSalir ? (
        <Button
          type="button"
          hideArrow
          data-testid="ir-a-otras-cargas"
          onClick={() => onSalir()}
        >
          {cuantasOtrasCargas === 1
            ? "Ver y descartar esa carga"
            : "Ver y descartar las otras cargas"}
        </Button>
      ) : null
    ) : onContinuar ? (
      <Button
        type="button"
        hideArrow
        data-testid="seguir-con-contratos"
        onClick={() => onContinuar()}
      >
        Seguir con Contratos
      </Button>
    ) : null;

  /**
   * T-0131 — «Crear todas»: UN `POST` que encola el proceso del servidor. No hay
   * bucle acá: la persona puede cerrar la página. Es idempotente, así que un
   * doble clic o un reintento tras un corte devuelve el mismo lote CREANDO.
   */
  const handleCrearTodas = async () => {
    if (!lote) return;
    setIniciandoCreacion(true);
    setError(null);
    try {
      await asegurarSesionVigente();
      const r = await inmueblesImportacionApi.crear(lote);
      setEstadoManual((previo) => {
        const base = previo ?? estadoLote;
        return base ? { ...base, fase: r.fase, creacion: r.creacion } : previo;
      });
      setIrACrear(false);
      setVerRevisionDeNuevo(false);
      cierreAplicado.current = null;
      updateState({ importedCount: 0 });
      setReinicioDelSondeo((n) => n + 1);
    } catch (e) {
      if (e instanceof ApiError && e.code === "NADA_PARA_CREAR") {
        // La lista que se veía estaba vieja: se vuelve a la revisión con lo de hoy.
        setIrACrear(false);
        await refrescarRevision(lote, pagina);
      }
      setError(
        esSesionMuerta(e)
          ? MENSAJE_SESION_TERMINADA
          : mensajeDeCarga(e, "No pudimos empezar a crear los inmuebles.", "empezar a crear los inmuebles"),
      );
    } finally {
      setIniciandoCreacion(false);
    }
  };

  /* Al llegar a TERMINADA sin fallas: lo que se hace una sola vez por lote. */
  useEffect(() => {
    if (!lote || !terminadaSinFallas || cierreAplicado.current === lote) return;
    cierreAplicado.current = lote;
    updateState({ importedCount: nCreadas, importProgress: 100 });
    // Adentro del muro NO se ofrece el diálogo de «mandato»: el dueño y la
    // comisión salen del propio archivo, fila por fila (Nico, 2026-09-01).
    if (nCreadas > 0 && !onSalir) void buscarSinMandato(lote);
    // Las fotos van después de crear: el back no ve archivos. Sólo si esta
    // pestaña conserva los inmuebles leídos (enlaces); al volver a una carga
    // TERMINADA no hay de dónde sacar las URLs y se salta sin ruido.
    if (nCreadas > 0) void subirFotosDeLosActivados(lote);
  }, [lote, terminadaSinFallas, nCreadas, updateState, onSalir, buscarSinMandato, subirFotosDeLosActivados]);

  /*
   * ── Las barras de lo que corre en el navegador ───────────────────────────
   *
   * Subir el archivo y ubicar las direcciones son esperas largas (la segunda,
   * media hora para 2.864 filas) y las dos necesitan un «Detener» VIVO. Salen por
   * la ranura viva del muro —fuera del `inert`, pegadas al contenido— y, sin
   * muro, se dibujan donde caen. Ver `migracion/ranura-viva.ts`.
   */
  const ub = progresoUbicacion ?? estadoLote?.ubicacion ?? null;
  const barraEnVuelo = subiendo ? (
    <BarraDeTrabajo
      testid="subida"
      titulo="Subiendo tu archivo"
      hechas={subida?.enviadas ?? 0}
      total={subida?.total ?? totalAEnviar}
      onDetener={detenerSubida}
      deteniendo={deteniendoSubida}
      nota="Deja esta página abierta mientras sube. Si se corta, sigues desde donde quedó."
    />
  ) : ubicando ? (
    <BarraDeTrabajo
      testid="ubicacion"
      titulo="Ubicando direcciones"
      hechas={ub?.ubicadas ?? 0}
      total={ub?.total ?? estadoLote?.total ?? 0}
      onDetener={detenerUbicacion}
      deteniendo={deteniendoUbicacion}
      nota="Se guardan de a 50. Mantén esta página abierta mientras se buscan: si la cierras, sigues desde donde quedó."
    />
  ) : null;
  const portalDeBarra = barraEnVuelo
    ? ranuraViva
      ? createPortal(barraEnVuelo, ranuraViva)
      : barraEnVuelo
    : null;

  const botonImportar = (
    <Button
      type="button"
      hideArrow
      onClick={handlePreparar}
      disabled={totalAEnviar === 0 || subiendo}
      className="gap-2"
    >
      <FileArrowUp className="w-4 h-4" />
      {subiendo
        ? "Subiendo..."
        : `Subir ${totalAEnviar.toLocaleString("es-CO")} ${totalAEnviar === 1 ? "inmueble" : "inmuebles"} y ubicar direcciones`}
    </Button>
  );

  /*
   * T-0131 — las filas que no se pudieron crear, con su motivo, y la salida.
   * Se usa en la vista de creación y, para una carga vieja con fallidas, en la
   * revisión. El back re-encola TODAS a la vez: no hay reintento fila por fila.
   */
  const panelDeFallidas =
    nFallidas > 0 ? (
      <div
        className="space-y-3 rounded-lg border border-border bg-danger-soft p-4"
        data-testid="filas-fallidas"
        role="region"
        aria-label="Inmuebles que no se pudieron crear"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-danger">
            {nFallidas === 1
              ? "1 inmueble no se pudo crear"
              : `${nFallidas.toLocaleString("es-CO")} inmuebles no se pudieron crear`}
          </p>
          {!creandoActivo ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              hideArrow
              disabled={reintentando || revisando || descartandoLote}
              isLoading={reintentando}
              onClick={() => void handleReintentar()}
              data-testid="reintentar-fallidas"
            >
              Reintentar las fallidas
            </Button>
          ) : null}
        </div>
        {creandoActivo ? (
          <p className="text-xs text-fg-muted">
            Cuando termine ves el motivo de cada una y puedes reintentarlas.
          </p>
        ) : (
          <>
            <ul className="max-h-64 space-y-2 overflow-y-auto" data-lenis-prevent>
              {filasFallidas.map((f) => (
                <li
                  key={f.id}
                  className="flex flex-wrap items-start justify-between gap-2 text-sm"
                  data-testid={`fila-fallida-${f.fila}`}
                >
                  <span className="min-w-0 text-fg">
                    <span className="font-mono tabular-nums">Fila {f.fila}</span>
                    {" · "}
                    {f.datos?.title ?? f.datos?.address ?? "Sin dirección"}
                    <span className="block text-xs text-danger">{f.errorDeActivacion}</span>
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    hideArrow
                    disabled={filaBusy === f.id}
                    onClick={() => void handleDescartarFila(f.id)}
                  >
                    Descartar
                  </Button>
                </li>
              ))}
            </ul>
            {filasFallidas.length > 0 && filasFallidas.length < nFallidas ? (
              <p className="text-xs text-fg-muted">
                Mostramos {filasFallidas.length} de {nFallidas.toLocaleString("es-CO")}.
              </p>
            ) : null}
          </>
        )}
      </div>
    ) : null;

  // ── Success state: el lote TERMINÓ sin fallidas ──────────────────────
  if (lote && terminadaSinFallas) {
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
          {/*
           * 🔴 LA VERDAD COMPLETA, NO LA MITAD.
           *
           * Nico, 2026-09-11: «¿por qué dices que se importaron 679
           * propiedades si le subí 2800 y algo y dijo que estaban listas como
           * 2700 y algo?». Porque 679 eran NUEVAS y 2.145 ya tenían su
           * inmueble —mismo «Código», de la carga anterior— así que se
           * re-apuntaron en vez de duplicarse. Las 2.824 filas de su archivo
           * entraron; decir sólo las nuevas hacía ver una importación
           * completa como un fracaso de 679.
           */}
          <p className="text-fg-muted dark:text-fg-subtle" data-testid="resumen-creadas">
            {lineaDeCreados(creacion, nCreadas)}
          </p>
          {detalleDeReusados(creacion) ? (
            <p className="text-sm text-fg-muted dark:text-fg-subtle" data-testid="resumen-reusados">
              {detalleDeReusados(creacion)}
            </p>
          ) : null}
          {(resumenLote?.pendientes ?? 0) > 0 && (
            <div className="space-y-2" data-testid="quedan-por-revisar">
              <p className="text-sm text-warning">
                Quedan {(resumenLote?.pendientes ?? 0).toLocaleString("es-CO")}{" "}
                {resumenLote?.pendientes === 1 ? "fila" : "filas"} con datos por
                corregir. No frenan nada: puedes arreglarlas ahora o dejarlas fuera.
              </p>
              <Button
                type="button"
                variant="outline"
                hideArrow
                data-testid="revisar-las-que-faltan"
                onClick={() => {
                  setVerRevisionDeNuevo(true);
                  updateState({ importedCount: 0 });
                }}
              >
                Revisar las que faltan
              </Button>
            </div>
          )}
          {fotosProgreso && (
            <p className="text-sm text-fg-muted" data-testid="fotos-progreso" aria-live="polite">
              Subiendo las fotos de las fichas… {fotosProgreso.hechos} de {fotosProgreso.total}{" "}
              {fotosProgreso.total === 1 ? "inmueble" : "inmuebles"}. No cierres esta pestaña.
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
          {/*
            🔴 QA 22-09: decía «la comisión salió del archivo» sobre 280
            inmuebles cuya comisión era el 10 % por defecto de la agencia. La
            frase ahora dice lo que el archivo traía, contado: la comisión que
            no venía queda VACÍA («no venía en el archivo») y la llena el
            contrato vigente al activarlo, o una persona en la ficha.
          */}
          {onSalir && aEnviar.length > 0 && nCreadas > 0 && (
            <p className="text-sm text-fg-muted dark:text-fg-subtle" data-testid="aviso-propietario-en-contratos">
              {fraseDeLaComision(aEnviar)} Los puedes cambiar cuando quieras
              desde la ficha de cada inmueble.
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
            variant={onSalir ? undefined : "outline"}
            size="lg"
            hideArrow
            data-testid="importar-mas"
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
              /*
               * 🔴 ADENTRO DEL MURO ESTE BOTÓN NO ERA UN BOTÓN.
               *
               * Nico, 2026-09-11: «no aparece nada para continuar, ningún
               * cta o algo, se queda ahí». Éste era el único control de la
               * pantalla de éxito, y hacía `router.push` a
               * `/inmuebles/importar` — una ruta que el muro TAPA. La
               * navegación ocurría, la pantalla no cambiaba, y no había
               * ninguna otra salida: un callejón sin salida al final de una
               * importación de 40 minutos.
               *
               * `onSalir` es justamente el camino de vuelta del muro (remonta
               * el asistente, que al arrancar lista las cargas sin terminar).
               * Existía y este botón no lo usaba.
               */
              if (onSalir) onSalir();
              else router.push("/panel/inmobiliaria/inmuebles/importar");
            }}
          >
            {onSalir ? "Seguir con las demás cargas" : "Importar más"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Paso 4: el servidor está creando (o terminó con fallidas) ─────────
  if (lote && estadoLote && (creandoEnElServidor || terminadaConFallas)) {
    const total = creacion?.total ?? estadoLote.total;
    const hechas = nCreadas;
    const pct = total > 0 ? Math.min(100, Math.round((hechas / total) * 100)) : 0;
    return (
      <div className="space-y-6" data-testid="creacion-progreso">
        <div>
          <h2 className="text-xl font-semibold text-fg dark:text-white mb-1">
            {creacionFallida
              ? "La creación se detuvo"
              : creandoEnElServidor
                ? "Creando tus inmuebles"
                : "Terminamos, pero algunos no se pudieron crear"}
          </h2>
          {creacionFallida ? (
            <p className="text-sm text-danger" data-testid="creacion-detenida">
              {estadoLote.error ?? "El proceso se detuvo por un error."} Lo que ya se creó está en tu
              portafolio y no se repite: toca «Reintentar» para que siga donde quedó.
            </p>
          ) : creandoEnElServidor ? (
            <p className="text-sm text-fg-muted dark:text-fg-subtle" data-testid="creacion-puedes-cerrar">
              Puedes cerrar esta página: las seguimos creando.
            </p>
          ) : (
            <p className="text-sm text-fg-muted dark:text-fg-subtle">
              Los que se crearon ya están en tu portafolio. Abajo ves el motivo de cada fallida.
            </p>
          )}
        </div>

        <div
          className="space-y-3 rounded-lg border border-border bg-surface-muted p-4"
          aria-live="polite"
          data-testid="creacion-avance"
        >
          <p className="text-sm text-fg">
            <span className="font-mono text-2xl font-semibold tabular-nums">
              {hechas.toLocaleString("es-CO")}
            </span>{" "}
            de{" "}
            <span className="font-mono tabular-nums">{total.toLocaleString("es-CO")}</span>{" "}
            creadas
            {/* Nico, 2026-09-11: «debemos mostrar acá el % en que va de avance».
                La vista de T-0131 lo había perdido: el «N de M» solo no dice
                cuánto falta de un vistazo. */}
            <span
              className="ml-2 font-mono text-sm tabular-nums text-fg-muted"
              data-testid="creacion-porcentaje"
            >
              {pct}%
            </span>
          </p>
          <Progress value={pct} size="xs" />
          {(creacion?.pendientes ?? 0) > 0 && creandoActivo ? (
            <p className="text-xs text-fg-muted">
              Faltan {(creacion?.pendientes ?? 0).toLocaleString("es-CO")}.
            </p>
          ) : null}
        </div>

        {hayFotosPorEnlace ? (
          <p className="text-sm text-warning" data-testid="fotos-por-enlace-aviso">
            Las fotos por enlace se suben mientras esta página esté abierta: si la cierras, los
            inmuebles se crean igual pero las fotos las subes después desde cada ficha.
          </p>
        ) : null}

        {creacionFallida && estadoLote.puedeReintentar ? (
          <Button
            type="button"
            hideArrow
            disabled={reintentando}
            isLoading={reintentando}
            onClick={() => void handleReintentar()}
            data-testid="reintentar-lote"
          >
            Reintentar
          </Button>
        ) : null}

        {panelDeFallidas}

        {(resumenLote?.pendientes ?? 0) > 0 && !creandoEnElServidor ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-fg-muted">
              Además quedan {(resumenLote?.pendientes ?? 0).toLocaleString("es-CO")} filas con datos por
              corregir.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              hideArrow
              data-testid="revisar-las-que-faltan"
              onClick={() => setVerRevisionDeNuevo(true)}
            >
              Revisar las que faltan
            </Button>
          </div>
        ) : null}

        {error && (
          <div className="rounded-md bg-danger-soft border border-border p-3" role="alert" data-testid="import-error">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}
      </div>
    );
  }

  // ── Lote subiéndose, ubicándose o en revisión del servidor ────────────
  if (
    lote &&
    estadoLote?.estado !== "LISTO" &&
    estadoLote?.estado !== "FALLIDO"
  ) {
    const recibidas = subida?.enviadas ?? estadoLote?.recibidas ?? 0;
    const totalDelLote = estadoLote?.total ?? totalAEnviar;
    return (
      <div className="space-y-6">
        {portalDeBarra}

        {etapaDelLote === "subiendo" || subiendo ? (
          <div
            className="rounded-lg border border-border p-6 space-y-3"
            data-testid="carga-subiendo"
          >
            <p className="text-sm font-medium text-fg">
              {subiendo ? "Subiendo tu archivo" : "La subida quedó a medias"}
            </p>
            <p className="text-sm text-fg-muted">
              Llegaron{" "}
              <span className="font-mono tabular-nums">{recibidas.toLocaleString("es-CO")}</span>{" "}
              de{" "}
              <span className="font-mono tabular-nums">{totalDelLote.toLocaleString("es-CO")}</span>{" "}
              filas.{" "}
              {subiendo
                ? "Deja esta página abierta hasta que termine."
                : "Lo que llegó está guardado: no se vuelve a subir."}
            </p>
            {!subiendo ? (
              <div className="flex flex-wrap items-center gap-3">
                {totalAEnviar === totalDelLote ? (
                  <Button
                    type="button"
                    hideArrow
                    onClick={handlePreparar}
                    data-testid="continuar-subiendo"
                  >
                    Continuar subiendo
                  </Button>
                ) : (
                  <p className="text-sm text-fg-muted" data-testid="subida-pide-el-archivo">
                    Para seguir, vuelve con «Anterior» al paso de subir el archivo, selecciona el
                    MISMO archivo (tiene que tener {totalDelLote.toLocaleString("es-CO")} filas) y
                    avanza hasta acá: retomamos desde donde quedó.
                  </p>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  hideArrow
                  disabled={descartandoLote}
                  isLoading={descartandoLote}
                  onClick={handleDescartarLote}
                >
                  Descartar esta carga
                </Button>
              </div>
            ) : null}
          </div>
        ) : etapaDelLote === "ubicando" ? (
          <div
            className="rounded-lg border border-border p-6 space-y-3"
            data-testid="carga-ubicando"
          >
            <p className="text-sm font-medium text-fg">
              {ubicando
                ? "Ubicando las direcciones en el mapa"
                : estadoLote && ubicacionCompleta(estadoLote)
                  ? "Todas las direcciones están ubicadas"
                  : "Faltan direcciones por ubicar"}
            </p>
            <p className="text-sm text-fg-muted">
              <span className="font-mono tabular-nums">
                {(ub?.ubicadas ?? 0).toLocaleString("es-CO")}
              </span>{" "}
              de{" "}
              <span className="font-mono tabular-nums">
                {(ub?.total ?? totalDelLote).toLocaleString("es-CO")}
              </span>{" "}
              ubicadas, y se guardan de a 50. Las busca esta página: mantenla abierta mientras
              tanto. Si la cierras, la carga queda guardada y sigues desde donde quedó.
            </p>
            {!ubicando ? (
              <div className="flex flex-wrap items-center gap-3">
                {estadoLote && ubicacionCompleta(estadoLote) ? (
                  // Todo ubicado: «Continuar» da el paso a la revisión.
                  <Button
                    type="button"
                    hideArrow
                    disabled={reintentando}
                    isLoading={reintentando}
                    onClick={() => void handleReintentar(true)}
                    data-testid="continuar-ubicando"
                  >
                    Continuar
                  </Button>
                ) : (
                  <Button
                    type="button"
                    hideArrow
                    onClick={() => void handleUbicar()}
                    data-testid="continuar-ubicando"
                  >
                    Continuar ubicando
                  </Button>
                )}
                {estadoLote?.puedeOmitirUbicacion !== false &&
                !(estadoLote && ubicacionCompleta(estadoLote)) ? (
                  <Button
                    type="button"
                    variant="outline"
                    hideArrow
                    disabled={reintentando}
                    isLoading={reintentando}
                    onClick={() => void handleReintentar(true)}
                    data-testid="continuar-sin-ubicar"
                  >
                    Continuar sin ubicar en el mapa
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <ProgresoDeLoteInmuebles
            estado={estadoLote}
            // Con la consulta manual el sondeo «revive» a ojos de la persona:
            // el cartel de agotado sólo tiene sentido si además no hay botón.
            agotado={agotado && estadoManual === null}
          />
        )}

        {agotado && etapaDelLote === "revision" && (
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
        {error && !subiendo && (
          <div
            className="rounded-md bg-danger-soft border border-border p-3"
            role="alert"
            data-testid="import-error"
          >
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}
      </div>
    );
  }

  // ── Lote FALLIDO ──────────────────────────────────────────────────────
  if (lote && estadoLote?.estado === "FALLIDO") {
    return (
      <div className="space-y-6">
        {portalDeBarra}
        <ProgresoDeLoteInmuebles estado={estadoLote} agotado={agotado} />
        {error && !subiendo && (
          <div className="rounded-md bg-danger-soft border border-border p-3" role="alert">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}
        {/*
         * T-0130 — un lote FALLIDO ya no es un callejón: el back guarda las
         * filas, así que «Reintentar» lo retoma donde quedó. Sólo cuando NO se
         * puede (un lote viejo que nunca guardó sus filas) queda «Preparar de
         * nuevo», que abre un lote NUEVO con otra clave sin re-subir el archivo.
         */}
        <div className="flex flex-wrap items-center gap-3">
          {estadoLote.puedeReintentar ? (
            <Button
              type="button"
              hideArrow
              disabled={reintentando}
              isLoading={reintentando}
              data-testid="reintentar-lote"
              onClick={() => void handleReintentar()}
            >
              Reintentar
            </Button>
          ) : totalAEnviar > 0 ? (
            <Button
              type="button"
              hideArrow
              data-testid="preparar-de-nuevo"
              onClick={() => {
                setIdempotencyKey(generarIdempotencyKey());
                setError(null);
                setEstadoManual(null);
                updateState({ loteRetomado: null, subidaRetomada: null });
                setLote(null);
              }}
            >
              Preparar de nuevo
            </Button>
          ) : null}
          {estadoLote.puedeOmitirUbicacion === true ? (
            <Button
              type="button"
              variant="outline"
              hideArrow
              disabled={reintentando}
              onClick={() => void handleReintentar(true)}
              data-testid="continuar-sin-ubicar"
            >
              Continuar sin ubicar en el mapa
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            hideArrow
            disabled={descartandoLote}
            isLoading={descartandoLote}
            onClick={handleDescartarLote}
          >
            Descartar esta carga
          </Button>
        </div>
        {!estadoLote.puedeReintentar && totalAEnviar > 0 ? (
          <p className="text-xs text-fg-subtle">
            Tus datos siguen acá — no hace falta volver a subir el archivo.
          </p>
        ) : null}
      </div>
    );
  }

  // ── Paso 4 antes del clic: «Crear todas» ──────────────────────────────
  if (lote && irACrear && listasParaCrear > 0) {
    const listas = listasParaCrear;
    const porRevisar = resumenLote?.pendientes ?? 0;
    return (
      <div className="space-y-6" data-testid="crear-todas-paso">
        <div>
          <h2 className="text-xl font-semibold text-fg dark:text-white mb-1">
            {yaSeCrearonAlgunas
              ? `Faltan ${listas.toLocaleString("es-CO")} por crear`
              : "Todo listo para crear"}
          </h2>
          <p className="text-sm text-fg-muted dark:text-fg-subtle">
            Se crean{" "}
            <span className="font-mono tabular-nums font-medium text-fg">
              {listas.toLocaleString("es-CO")}
            </span>{" "}
            {listas === 1 ? "inmueble" : "inmuebles"} en un solo proceso del servidor. Puedes cerrar
            esta página: las seguimos creando.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-md bg-success-soft p-4">
            <MonoLabel className="block text-xs text-success mb-1">Listas para crear</MonoLabel>
            <p className="text-2xl font-bold text-success">{listas.toLocaleString("es-CO")}</p>
          </div>
          <div className="rounded-md bg-surface-muted dark:bg-ink p-4">
            <MonoLabel className="block text-xs text-fg-muted mb-1">Por revisar (no se tocan)</MonoLabel>
            <p className="text-2xl font-bold text-fg-muted">{porRevisar.toLocaleString("es-CO")}</p>
          </div>
        </div>

        {hayFotosPorEnlace ? (
          <p className="text-sm text-warning" data-testid="fotos-por-enlace-aviso">
            Las fotos por enlace se suben mientras esta página esté abierta: si la cierras, los
            inmuebles se crean igual pero las fotos las subes después desde cada ficha.
          </p>
        ) : null}

        {sinCanon > 0 ? (
          <p className="text-sm text-fg-muted" data-testid="listas-sin-canon">
            {sinCanon === 1
              ? "1 inmueble se crea con el canon por confirmar"
              : `${sinCanon.toLocaleString("es-CO")} inmuebles se crean con el canon por confirmar`}
            : no se usa para contratos, cobros ni facturas hasta que lo pongas a mano en el inmueble.
          </p>
        ) : null}
        {porRevisar > 0 ? (
          <p className="text-sm text-fg-muted">
            Las filas por revisar no se crean ahora: se quedan en la carga y las completas cuando
            quieras.
          </p>
        ) : null}

        {error && (
          <div className="rounded-md bg-danger-soft border border-border p-3" role="alert" data-testid="import-error">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            hideArrow
            disabled={iniciandoCreacion}
            onClick={() => {
              setIrACrear(false);
              setError(null);
            }}
          >
            Volver a la revisión
          </Button>
          <Button
            type="button"
            hideArrow
            disabled={iniciandoCreacion}
            isLoading={iniciandoCreacion}
            onClick={handleCrearTodas}
            data-testid="crear-todas"
          >
            {yaSeCrearonAlgunas
              ? `Crear las ${listas.toLocaleString("es-CO")} que faltan`
              : "Crear todas"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Paso 3: revisar lo que falta ─────────────────────────────────────
  if (lote) {
    const listas = listasParaCrear;
    const puedeContinuar = listas > 0 && estadoLote?.fase !== "REVISANDO";

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-fg dark:text-white mb-1">
            Revisa lo que falta
          </h2>
          <p className="text-sm text-fg-muted dark:text-fg-subtle">
            Una sola lista con todo lo que necesita una decisión. Lo que ya está completo no aparece:
            se crea al final, todo junto. Cerrar esta pestaña no pierde nada.
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
                Por revisar
              </MonoLabel>
              <p className="text-2xl font-bold text-warning">
                {resumenLote.pendientes}
              </p>
            </div>
            <div className="rounded-md bg-success-soft p-4">
              <MonoLabel className="block text-xs text-success mb-1">
                Listas para crear
              </MonoLabel>
              <p className="text-2xl font-bold text-success">
                {listasParaCrear}
              </p>
            </div>
            <div className="rounded-md bg-primary-soft p-4">
              <MonoLabel className="block text-xs text-primary mb-1">
                Ya creadas
              </MonoLabel>
              <p className="text-2xl font-bold text-primary">
                {resumenLote.activados}
              </p>
            </div>
          </div>
        )}

        {sinCanon > 0 ? (
          <p
            className="rounded-lg border border-border bg-surface-muted p-3 text-sm text-fg-muted"
            data-testid="aviso-canon-por-confirmar"
          >
            {sinCanon === 1
              ? "1 inmueble no trae canon: se crea con el canon por confirmar."
              : `${sinCanon.toLocaleString("es-CO")} inmuebles no traen canon: se crean con el canon por confirmar.`}{" "}
            No bloquea nada; el canon se completa después, en bloque o en cada inmueble.
          </p>
        ) : null}

        {/* Una carga vieja pudo dejar fallidas: se ven y se reintentan acá también. */}
        {panelDeFallidas}

        <LoteInmueblesMasivo
          lote={lote}
          deshabilitado={revisando || descartandoLote || iniciandoCreacion}
          onCambio={() => void refrescarRevision(lote, 1)}
        />

        {pendientes.length > 0 && (
          <div className="space-y-3">
            {pendientes.map((fila) => (
              <FilaImportacionRow
                key={fila.id}
                fila={fila}
                onResolver={handleResolver}
                onDescartar={handleDescartarFila}
                isBusy={filaBusy === fila.id || creandoEnElServidor}
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
              disabled={
                filaBusy !== null || descartandoLote || refrescando
              }
              /* Gira mientras consulta: sin esto, un back que tarda dos
                 segundos se ve igual que un botón muerto. */
              isLoading={refrescando}
              onClick={async () => {
                setRefrescando(true);
                try {
                  await refrescarRevision(lote, pagina);
                } finally {
                  setRefrescando(false);
                }
              }}
              data-testid="revision-actualizar"
            >
              Actualizar la lista
            </Button>
          </div>
        )}

        {/*
         * ── ESTE LOTE YA NO TIENE NADA QUE CREAR ────────────────────────
         *
         * 🔴 Nico, 2026-09-11, mirando 2.864 total · 40 pendientes · 0 listas
         * · 2.824 activadas: «no hay nada de cómo continuar, cómo pasar de
         * ahí a contratos, no se muestra un cta».
         *
         * Tenía razón dos veces. La pantalla no ofrecía salida, y el pie del
         * muro tampoco: sólo dibuja «Seguir con…» cuando el paso está LISTO,
         * y el paso se queda «pendiente» mientras exista UNA fila sin activar
         * en CUALQUIER carga de la agencia. Lo frenaban 3.270 filas de cuatro
         * cargas viejas que ni se veían desde acá.
         *
         * Entonces se dice qué pasó y cuál es el siguiente paso REAL: si
         * queda trabajo en otra carga se manda ahí; si no queda nada, se
         * ofrece Contratos.
         */}

        {revisando && !ranuraViva ? barraDeRevision : null}
        {revisando && ranuraViva
          ? createPortal(barraDeRevision, ranuraViva)
          : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              hideArrow
              // Congelado se ve congelado: mientras se revisa o se activa el
              // paso entero está `inert`, y un botón que se ve vivo y está
              // muerto cuesta media hora de clics.
              disabled={descartandoLote || revisando || reintentando || iniciandoCreacion}
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
                disabled={revisando || descartandoLote}
                isLoading={revisando}
                onClick={handleRevisarDeNuevo}
                data-testid="revisar-de-nuevo"
              >
                {revisando
                  ? progresoDeRevision
                    ? `Revisando… ${progresoDeRevision.revisadas} miradas · ${progresoDeRevision.liberadas} liberadas`
                    : "Revisando…"
                  : "Volver a revisar lo pendiente"}
              </Button>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-1">
            <p className="text-sm text-fg-muted" data-testid="listas-para-crear">
              <span className="font-mono font-medium tabular-nums text-fg">
                {listas.toLocaleString("es-CO")}
              </span>{" "}
              {listas === 1 ? "lista para crear" : "listas para crear"}
            </p>
            <Button
              type="button"
              hideArrow
              disabled={!puedeContinuar || revisando || descartandoLote}
              onClick={() => {
                setError(null);
                setIrACrear(true);
              }}
              data-testid="continuar-a-crear"
            >
              Continuar
            </Button>
          </div>
        </div>

        {/* El aviso, último del cuerpo: queda pegado al pie gris, que es donde
            Nico lo pidió. Se cierra y no vuelve en esta visita al paso. */}
        {sinNadaQueActivar && !avisoDeCargaCerrado ? avisoDeCargaTerminada : null}

        {/* Y la acción, al pie, a la derecha de «Anterior» — donde vivió el
            botón primario en todos los pasos anteriores. */}
        {ranuraDelPie && salidaDelPaso
          ? createPortal(salidaDelPaso, ranuraDelPie)
          : null}
        {/* Sin pie montado (primer render, o la página suelta) la salida no se
            puede perder: se dibuja acá. */}
        {!ranuraDelPie && salidaDelPaso ? (
          <div className="flex justify-end">{salidaDelPaso}</div>
        ) : null}
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
          Subimos tu archivo, ubicamos las direcciones en el mapa y te mostramos lo que falta.
          Los inmuebles se crean al final, todos juntos.
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
              Inmuebles del archivo
            </MonoLabel>
            <p className="text-3xl font-bold text-primary">{totalAEnviar}</p>
          </div>

          <div
            className={cn(
              "rounded-md p-4",
              remainingErrorsCount > 0 ? "bg-warning-soft" : "bg-success-soft",
            )}
          >
            <MonoLabel
              className={cn(
                "block text-xs mb-1",
                remainingErrorsCount > 0 ? "text-warning" : "text-success",
              )}
            >
              Con datos por completar
            </MonoLabel>
            <p
              className={cn(
                "text-3xl font-bold",
                remainingErrorsCount > 0 ? "text-warning" : "text-success",
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
        La barra de la subida: con muro sale por la ranura viva (fuera del
        `inert`, con su «Detener» vivo) y sin muro, acá mismo.

        🔴 Acá NO va la barra de la re-revisión, aunque vivió acá hasta el
        2026-09-11. Este `return` es el resumen PREVIO a subir: sólo se llega
        con `lote === null`, y revisar exige un lote. Vive con la de activación,
        dentro del `if (lote)`.
      */}
      {portalDeBarra}

      {bloqueadas.length > 0 && !subiendo && (
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
                ? "1 inmueble entra pendiente"
                : `${bloqueadas.length} inmuebles entran pendientes`}
            </p>
            <p className="text-body-sm text-fg-muted mt-0.5">
              Les falta {motivosBloqueo.join(", ")}. Entran igual, marcados con
              lo que les falta, y los completas en{" "}
              <span className="font-medium text-fg">Revisar lo que falta</span>.
              Nada del archivo se queda por fuera.
            </p>
          </div>
        </div>
      )}

      {error && !subiendo && (
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
              No se pudo subir el archivo
            </p>
            <p className="text-body-sm text-fg-muted mt-0.5 break-words">
              {error}
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

/**
 * «Se crearon N inmuebles» contaba FILAS: una reimportación de 4 inmuebles que
 * ya estaban decía «4 creados» con 0 nuevos, y dos filas con el mismo código
 * decían 2 donde quedó 1 (QA-MIG-A, MG-36). Con un back que manda `nuevos`,
 * la frase dice los nuevos y el detalle dice el resto; con uno anterior, lo de
 * siempre.
 */
export function lineaDeCreados(
  creacion: { creadas: number; nuevos?: number } | null | undefined,
  nCreadas: number,
): string {
  const n = typeof creacion?.nuevos === 'number' ? creacion.nuevos : nCreadas
  const cifra = n.toLocaleString('es-CO')
  if (typeof creacion?.nuevos === 'number') {
    return n === 1 ? 'Se creó 1 inmueble nuevo en tu portafolio' : `Se crearon ${cifra} inmuebles nuevos en tu portafolio`
  }
  return `Se crearon ${cifra} ${n === 1 ? 'inmueble' : 'inmuebles'} en tu portafolio`
}

export function detalleDeReusados(
  creacion: { creadas: number; inmuebles?: number; nuevos?: number } | null | undefined,
): string | null {
  if (typeof creacion?.nuevos !== 'number' || typeof creacion.inmuebles !== 'number') return null
  const yaEstaban = Math.max(0, creacion.inmuebles - creacion.nuevos)
  const repetidas = Math.max(0, creacion.creadas - creacion.inmuebles)
  const partes: string[] = []
  if (yaEstaban > 0) {
    partes.push(
      yaEstaban === 1
        ? '1 ya estaba en tu portafolio con el mismo código: no se duplicó.'
        : `${yaEstaban.toLocaleString('es-CO')} ya estaban en tu portafolio con el mismo código: no se duplicaron.`,
    )
  }
  if (repetidas > 0) {
    partes.push(
      repetidas === 1
        ? '1 fila repetía el código de otra fila del archivo: quedaron en el mismo inmueble.'
        : `${repetidas.toLocaleString('es-CO')} filas repetían el código de otra fila del archivo: quedaron en el mismo inmueble.`,
    )
  }
  return partes.length > 0 ? partes.join(' ') : null
}
