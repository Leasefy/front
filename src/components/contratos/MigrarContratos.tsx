"use client";

/**
 * MigrarContratos — traer la cartera viva desde otro sistema.
 *
 * Es la puerta por la que entra una inmobiliaria que ya viene arrendando: sus
 * contratos activos nunca pasaron por una postulación acá, así que el flujo
 * normal no les sirve.
 *
 * ── Tres cosas que la pantalla hace a propósito ─────────────────────────────
 *
 * 1. **Muestra POR QUÉ mapeó cada columna, y deja corregirlo a mano.** El
 *    auto-mapeo se equivoca con confianza alta —«Celular arrendatario» ya
 *    terminó guardado como teléfono del propietario— y un mapeo sin
 *    explicación sólo se puede aceptar o rechazar entero.
 * 2. **No exige ninguna columna para poder revisar.** «No puedo exigir un
 *    archivo estándar porque todos los clientes pueden subir Excel
 *    diferentes» (el owner). Lo que no se mapeó se avisa — información, no
 *    una pared — y se completa fila por fila en la lista de trabajo.
 * 3. **El reporte final distingue creado / omitido / fallido, con la fila.**
 *    Un "1.200 procesados" que esconde 300 saltados es peor que un error.
 */

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useDropzone } from "react-dropzone";
import {
  ArrowRight,
  CheckCircle,
  Clock,
  FileArrowUp,
  Info,
  Warning,
  XCircle,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseSpreadsheetFile } from "@/components/inmobiliaria/import/lib/parseFile";
import {
  mapearColumnas,
  remapear,
  sinMapear,
  type CampoDeContrato,
  type MapeoDeColumna,
} from "@/lib/contratos/columnas-de-contrato";
import { armarFilaAMigrar } from "@/lib/contratos/armar-fila";
import { documentoComoLlave } from "@/lib/contratos/leer-celdas";
import { generarIdempotencyKey } from "@/lib/contratos/idempotencia";
import {
  contractsApi,
  type FilaDeMigracion,
  type LoteAbierto,
  type ResumenActivacion,
  type ResumenLote,
} from "@/lib/api/contracts.service";
import { useEstadoDeLote } from "@/lib/hooks/use-estado-de-lote";
import { FaltantesDeFila } from "./FaltantesDeFila";
import { ResolucionMasiva } from "./ResolucionMasiva";
import { ProgresoDeLote } from "./ProgresoDeLote";
import { Pagination } from "@/components/ui/pagination";

const NOMBRE_DE_CAMPO: Record<CampoDeContrato, string> = {
  direccionInmueble: "Dirección del inmueble",
  inquilinoNombre: "Nombre del inquilino",
  inquilinoCorreo: "Correo del inquilino",
  inquilinoTelefono: "Teléfono del inquilino",
  inquilinoDocumento: "Documento del inquilino",
  fechaInicio: "Fecha de inicio",
  fechaFin: "Fecha de terminación",
  canon: "Canon",
  deposito: "Depósito",
  diaDePago: "Día de pago",
  uso: "Uso del inmueble",
  periodicidad: "Periodicidad",
  comision: "Comisión",
  propietarioNombre: "Nombre del propietario",
  propietarioDocumento: "Documento del propietario",
  propietarioCorreo: "Correo del propietario",
  propietarioTelefono: "Teléfono del propietario",
};

/** Todos los campos posibles, para ofrecerlos en el selector de remapeo. */
const CAMPOS = Object.keys(NOMBRE_DE_CAMPO) as CampoDeContrato[];

/** Sentinel de Radix: un `<Select>` no admite `value=""`. */
const IGNORAR = "__ignorar__";

type Fila = Record<string, unknown>;

/**
 * Cuántas filas pendientes se piden por página.
 *
 * Antes se pedían todas: con 1.200 la pantalla pintaba 1.200 tarjetas, cada
 * una con sus propios controles de resolución.
 */
const POR_PAGINA = 25;

/** El propietario que trae una fila del archivo, si lo trae. */
type DuenoDelArchivo = {
  nombre: string;
  documento: string;
  correo?: string;
  telefono?: string;
};

/**
 * Los propietarios del archivo, por número de fila (0 = primera de datos, el
 * mismo `fila` que devuelve el back). Sólo cuentan las filas con documento:
 * sin documento no hay a quién enlazar y el nombre solo crearía homónimos.
 */
function duenosDe(
  filas: Fila[],
  mapeo: MapeoDeColumna[],
): Map<number, DuenoDelArchivo> {
  const col = (campo: CampoDeContrato) =>
    mapeo.find((m) => m.campo === campo)?.columna;
  const cNombre = col("propietarioNombre");
  const cDoc = col("propietarioDocumento");
  const cCorreo = col("propietarioCorreo");
  const cTel = col("propietarioTelefono");
  const out = new Map<number, DuenoDelArchivo>();
  if (!cDoc) return out;
  filas.forEach((fila, i) => {
    const texto = (c?: string) => (c ? String(fila[c] ?? "").trim() : "");
    // La MISMA llave que usa la migración de terceros: «1.004.997.858» del
    // archivo de contratos tiene que caer en el propietario que terceros ya
    // creó como «1004997858», no crear un duplicado.
    const documento = documentoComoLlave(texto(cDoc));
    if (!documento) return;
    out.set(i, {
      nombre: texto(cNombre) || documento,
      documento,
      correo: texto(cCorreo) || undefined,
      telefono: texto(cTel) || undefined,
    });
  });
  return out;
}

export interface MigrarContratosProps {
  /** Aviso hacia el muro: `true` mientras se están ACTIVANDO los contratos. */
  onOcupado?: (ocupado: boolean) => void;
}

export function MigrarContratos({ onOcupado }: MigrarContratosProps = {}) {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [encabezados, setEncabezados] = useState<string[]>([]);
  const [mapeo, setMapeo] = useState<MapeoDeColumna[]>([]);
  const [invitar, setInvitar] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lote, setLote] = useState<string | null>(null);
  const [resumen, setResumen] = useState<ResumenLote | null>(null);
  const [pendientes, setPendientes] = useState<FilaDeMigracion[]>([]);
  const [totalPendientes, setTotalPendientes] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [activacion, setActivacion] = useState<ResumenActivacion | null>(null);
  // T-0036 §3.2.C — descartar el lote entero, no fila por fila.
  const [descartandoLote, setDescartandoLote] = useState(false);

  const [lotesAbiertos, setLotesAbiertos] = useState<LoteAbierto[]>([]);

  /**
   * T-0039 — descartar un lote directamente desde la tarjeta "Tenés una
   * migración sin terminar", sin tener que abrirlo primero (`retomar`). El
   * owner lo pidió así: un lote que no se quiere continuar hoy obliga a
   * entrar a él sólo para llegar al botón de T-0036, que vive adentro de
   * `ListaDeTrabajo`.
   *
   * `resumenTarjeta` guarda de qué lote es la confirmación abierta y el
   * `ResumenLote` fresco que la sostiene — se pide recién al clickear
   * "Descartar", nunca antes, porque la tarjeta sólo tiene `LoteAbierto`
   * (pendientes/listos/activables), no el desglose que la confirmación
   * necesita mostrar (activados incluidos).
   */
  const [resumenTarjeta, setResumenTarjeta] = useState<{
    lote: string;
    resumen: ResumenLote;
  } | null>(null);
  const [cargandoResumenDe, setCargandoResumenDe] = useState<string | null>(
    null,
  );
  const [descartandoTarjeta, setDescartandoTarjeta] = useState(false);
  const [errorTarjeta, setErrorTarjeta] = useState<string | null>(null);

  // Ítem 1 del brief WU-4: sondeo mientras el lote sigue ENCOLADO/PROCESANDO
  // (contrato §11-J9) — es una conveniencia mientras la pestaña sigue
  // abierta, nunca el mecanismo de finalización.
  const { estado: estadoLote, agotado } = useEstadoDeLote(lote);

  // La consignación automática corre un loop largo de peticiones: es una
  // operación en vuelo como cualquier otra y el muro tiene que saberlo.
  const [consignando, setConsignando] = useState(false);

  /*
   * Aviso al muro mientras HAY una operación en vuelo — preparar, el job del
   * servidor, la consignación automática, activar o descartar. Antes sólo se
   * marcaba `activar()` a mano, y el pie del muro ofrecía «Seguir con Plan de
   * cuentas» con el job todavía procesando (la misma carrera que Nico vio en
   * Propiedades). Un job FALLIDO o un sondeo agotado NO son «ocupado»: nadie
   * está esperando nada y el muro no puede quedar clavado.
   */
  const esperandoElJob =
    Boolean(lote) && !resumen && !agotado && estadoLote?.estado !== "FALLIDO";
  const hayOperacionEnVuelo =
    cargando || descartandoLote || consignando || esperandoElJob;
  useEffect(() => {
    onOcupado?.(hayOperacionEnVuelo);
  }, [hayOperacionEnVuelo, onOcupado]);
  // Al desmontar (cambio de paso en el muro), el pie recupera sus botones.
  useEffect(() => () => onOcupado?.(false), [onOcupado]);

  /**
   * Una clave por archivo leído (no por click): si `preparar()` se reintenta
   * para ESTE mismo archivo, cae en el mismo lote en vez de duplicarlo.
   */
  const [idempotencyKey, setIdempotencyKey] = useState("");

  const noMapeados = useMemo(() => sinMapear(mapeo), [mapeo]);

  const cambiarMapeo = useCallback(
    (columna: string, campo: CampoDeContrato | null) => {
      setMapeo((actual) => remapear(actual, columna, campo));
    },
    [],
  );

  const restablecerMapeo = useCallback(() => {
    setMapeo(mapearColumnas(encabezados));
  }, [encabezados]);

  const leerArchivo = useCallback(async (archivo: File) => {
    setError(null);
    setActivacion(null);
    try {
      const { rows, headers } = await parseSpreadsheetFile(archivo);
      setFilas(rows as Fila[]);
      setEncabezados(headers);
      setMapeo(mapearColumnas(headers));
      setIdempotencyKey(generarIdempotencyKey());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos leer el archivo.");
      setFilas([]);
      setEncabezados([]);
      setMapeo([]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (aceptados) => {
      const archivo = aceptados[0];
      if (archivo) void leerArchivo(archivo);
    },
    maxFiles: 1,
    multiple: false,
  });

  /**
   * Trae UNA página de pendientes.
   *
   * El filtro por estado va en la consulta, no acá: filtrar la página después
   * de recibirla daría páginas vacías —las primeras 50 de 1.200 pueden ser
   * todas LISTO— y parecería que no queda nada por resolver.
   */
  const refrescar = useCallback(async (elLote: string, pag = 1) => {
    const [r, p] = await Promise.all([
      contractsApi.migracion.resumen(elLote),
      contractsApi.migracion.filas(elLote, {
        pagina: pag,
        porPagina: POR_PAGINA,
        estado: "PENDIENTE",
      }),
    ]);
    setResumen(r);
    setPendientes(p.filas);
    setTotalPendientes(p.total);
    setPagina(p.pagina);
    // T-0033 §3.2.G4 — antes reseteaba `seleccion` acá, así que cambiar de
    // página (o refrescar tras resolver una fila) borraba la selección. La
    // única forma de aplicar algo a más de una página era repetir la masiva
    // 55 veces. `seleccion` ahora sobrevive: se resetea explícitamente en
    // los puntos donde el LOTE cambia (`preparar`, `retomar`,
    // `onOtroArchivo`), nunca acá.
  }, []);

  /**
   * Paso 1: preparar. NO crea contratos.
   *
   * La dirección viaja como texto, no como uuid: el sistema del que se migra
   * no conoce nuestros ids, y resolverla es justamente lo que el back hace con
   * cuidado —pidiendo desempatar cuando dos inmuebles comparten dirección en
   * vez de elegir uno y quedar perfecto y equivocado.
   */
  /*
   * Lo que el archivo dice del propietario no viaja al back (el DTO no lo
   * admite): se guarda acá y, con el lote listo, se consigna solo. Se pierde
   * si la persona recarga a mitad — esas filas quedan con su formulario.
   */
  const duenosDelArchivo = useRef<Map<number, DuenoDelArchivo>>(new Map());
  const lotesConsignados = useRef<Set<string>>(new Set());

  /**
   * Consigna, sin que nadie escriba nada, cada inmueble pendiente cuya fila
   * trajo el propietario en el archivo. Es el trabajo que antes le tocaba a
   * la persona fila por fila; lo que falle queda igual que antes, con su
   * formulario y su buscador.
   */
  const consignarDesdeElArchivo = useCallback(
    async (elLote: string) => {
      const duenos = duenosDelArchivo.current;
      if (duenos.size === 0 || lotesConsignados.current.has(elLote)) return;
      lotesConsignados.current.add(elLote);
      setConsignando(true);
      const candidatas: FilaDeMigracion[] = [];
      try {
        for (let pag = 1; pag < 200; pag++) {
          const p = await contractsApi.migracion.filas(elLote, {
            pagina: pag,
            porPagina: POR_PAGINA,
            estado: "PENDIENTE",
          });
          candidatas.push(
            ...p.filas.filter(
              (f) =>
                f.faltantes.includes("propietario") &&
                !f.propietarioId &&
                duenos.has(f.fila),
            ),
          );
          if (p.filas.length < POR_PAGINA || pag * POR_PAGINA >= p.total)
            break;
        }
      } catch {
        /*
         * No llegamos ni a saber cuáles filas consignar (falló el listado).
         * Se DESMARCA el lote: la próxima entrada a esta lista lo reintenta
         * solo. Y se dice — un fallo acá era invisible: la persona veía las
         * filas sin propietario sin saber que la automática nunca corrió.
         */
        lotesConsignados.current.delete(elLote);
        setConsignando(false);
        toast.error(
          "No pudimos consignar los propietarios del archivo automáticamente. Las filas quedaron con su formulario — completalas a mano o volvé a entrar para reintentar.",
        );
        return;
      }
      if (candidatas.length === 0) {
        setConsignando(false);
        return;
      }
      const aviso = toast.loading(
        `Consignando con el propietario del archivo… 0 de ${candidatas.length}`,
      );
      let hechas = 0;
      let fallidas = 0;
      for (const f of candidatas) {
        const d = duenos.get(f.fila)!;
        try {
          await contractsApi.migracion.registrarPropietario(f.id, {
            nombre: d.nombre,
            documento: d.documento,
            correo: d.correo,
            telefono: d.telefono,
            comisionPorcentaje: f.datos.comisionPorcentaje,
          });
        } catch {
          fallidas += 1;
        }
        hechas += 1;
        toast.loading(
          `Consignando con el propietario del archivo… ${hechas} de ${candidatas.length}`,
          { id: aviso },
        );
      }
      toast.dismiss(aviso);
      if (fallidas === 0)
        toast.success(
          `${hechas} inmuebles consignados con el propietario del archivo`,
        );
      else
        toast.warning(
          `${hechas - fallidas} consignados; ${fallidas} quedaron para revisar a mano`,
        );
      setConsignando(false);
      // Si el refresco falla, lo consignado ya está consignado: se avisa y
      // el paginador o recargar traen la lista fresca.
      await refrescar(elLote).catch(() => {
        toast.error(
          "Se consignó, pero no pudimos refrescar la lista. Cambiá de página o recargá para verla al día.",
        );
      });
    },
    [refrescar],
  );

  const preparar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      // Cada campo mapeado viaja; lo que no se mapeó (o quedó vacío) viaja
      // ausente, nunca un default inventado — ver `armar-fila.ts`.
      duenosDelArchivo.current = duenosDe(filas, mapeo);
      const aMigrar = filas.map((fila) => armarFilaAMigrar(fila, mapeo));

      const r = await contractsApi.migracion.preparar(aMigrar, idempotencyKey);
      // El lote es SIEMPRE del servidor (contrato §3.2.A2) — generarlo acá
      // podía colisionar entre dos archivos parecidos (N2).
      //
      // OJO: no se llama a `refrescar()` acá. `preparar()` encola el job —
      // recién resuelto, la lista de trabajo está prácticamente vacía
      // (`procesadas: 0`). Mostrarla así era el hueco que WU-1 dejó
      // explícito para WU-4: la pantalla de espera (`<ProgresoDeLote>`,
      // debajo) se muestra en su lugar hasta que `estadoLote.estado ===
      // 'LISTO'`, momento en el que el efecto de abajo llama a `refrescar`.
      setResumen(null);
      setLote(r.lote);
      // Nuevo lote entrando: una selección de un lote anterior no puede
      // sobrevivir acá (§3.2.G4) — se resetea en los puntos donde el LOTE
      // cambia, no en cada refresco de página.
      setSeleccion(new Set());
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No pudimos preparar la migración.",
      );
    } finally {
      setCargando(false);
    }
  }, [filas, mapeo, idempotencyKey]);

  const activar = useCallback(async () => {
    if (!lote) return;
    setCargando(true);
    setError(null);
    // `onOcupado` ya no se llama a mano acá: lo cubre el efecto derivado de
    // `hayOperacionEnVuelo` (cargando ⊃ activar), junto con preparar, el job
    // y la consignación — que antes quedaban afuera.
    try {
      setActivacion(await contractsApi.migracion.activar(lote, invitar));
      await refrescar(lote);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos activar.");
    } finally {
      setCargando(false);
    }
  }, [lote, invitar, refrescar]);

  /**
   * El sondeo llegó a su techo (10 min) y la persona quedó mirando la
   * pantalla de espera: este botón pregunta UNA vez más, a pedido. Si el
   * lote ya está LISTO, `refrescar` puebla la lista de trabajo y la pantalla
   * avanza sola; si sigue procesando, el back responde 409 con su mensaje y
   * se muestra tal cual — nunca un reintento silencioso.
   */
  const verificarAhora = useCallback(async () => {
    if (!lote) return;
    setCargando(true);
    try {
      await refrescar(lote);
      await consignarDesdeElArchivo(lote);
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Todavía no está listo — seguimos trabajando del lado del servidor.",
      );
    } finally {
      setCargando(false);
    }
  }, [lote, refrescar, consignarDesdeElArchivo]);

  /** Volver al cargador soltando el lote actual. Nada del servidor se toca. */
  const volverAEmpezar = useCallback(() => {
    setResumen(null);
    setLote(null);
    setFilas([]);
    setEncabezados([]);
    setMapeo([]);
    setActivacion(null);
    setIdempotencyKey("");
    setSeleccion(new Set());
    setError(null);
    contractsApi.migracion
      .lotesAbiertos()
      .then(setLotesAbiertos)
      .catch(() => {
        // No poder listarlos no debe impedir empezar uno nuevo.
      });
  }, []);

  /**
   * Descartar el lote entero (contract.md T-0036 §3.2.C). Nunca reintenta ni
   * se traga un error — un 409 (`LOTE_EN_PROCESO`) o un 404 (lote
   * desconocido) se muestra tal cual en la línea de error existente y el
   * usuario se queda en la vista del lote. Sólo en éxito se abandona: el
   * lote ya no tiene nada que mostrar, y quedarse sería la forma de
   * apretar el botón dos veces.
   */
  const descartarLote = useCallback(async () => {
    if (!lote) return;
    setDescartandoLote(true);
    setError(null);
    try {
      await contractsApi.migracion.descartarLote(lote);
      setResumen(null);
      setLote(null);
      setActivacion(null);
      setSeleccion(new Set());
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No pudimos descartar el lote.",
      );
    } finally {
      setDescartandoLote(false);
      // Tanto en éxito como en el 404 de E6 la lista de "Retomar" puede
      // haber cambiado — refrescarla es inofensivo en el resto de los casos
      // (E5: un lote ENCOLADO/PROCESANDO no tiene filas propias todavía y
      // no aparecía en esta lista de todos modos, §12-Y1).
      contractsApi.migracion
        .lotesAbiertos()
        .then(setLotesAbiertos)
        .catch(() => {
          // No poder listarlos no debe impedir seguir.
        });
    }
  }, [lote]);

  /**
   * T-0039 — abre la confirmación de "Descartar" desde la tarjeta. Pide el
   * `resumen()` del lote ANTES de mostrar el modal: la tarjeta sólo tiene
   * `LoteAbierto`, y la confirmación necesita el desglose completo
   * (pendientes + listos + activados) para decir, antes de que el usuario
   * confirme, qué se pierde y qué sobrevive — la misma copia que ya usa el
   * modal de adentro del lote (§3.2.C6).
   */
  const abrirDescarteDesdeTarjeta = useCallback(async (elLote: string) => {
    setErrorTarjeta(null);
    setCargandoResumenDe(elLote);
    try {
      const r = await contractsApi.migracion.resumen(elLote);
      setResumenTarjeta({ lote: elLote, resumen: r });
    } catch (e) {
      setErrorTarjeta(
        e instanceof Error ? e.message : "No pudimos abrir ese lote.",
      );
    } finally {
      setCargandoResumenDe(null);
    }
  }, []);

  /**
   * Confirma el descarte pedido desde la tarjeta. Nunca deja la tarjeta en
   * un estado inconsistente: en éxito Y en error el modal se cierra (mismo
   * patrón que `descartarLote` de arriba) y se refresca `lotesAbiertos()`
   * — un 409/404 puede significar que el lote cambió de estado mientras el
   * modal estaba abierto.
   */
  const confirmarDescarteDesdeTarjeta = useCallback(async () => {
    if (!resumenTarjeta) return;
    setDescartandoTarjeta(true);
    setErrorTarjeta(null);
    try {
      await contractsApi.migracion.descartarLote(resumenTarjeta.lote);
    } catch (e) {
      setErrorTarjeta(
        e instanceof Error ? e.message : "No pudimos descartar el lote.",
      );
    } finally {
      setResumenTarjeta(null);
      setDescartandoTarjeta(false);
      contractsApi.migracion
        .lotesAbiertos()
        .then(setLotesAbiertos)
        .catch(() => {
          // No poder listarlos no debe impedir seguir.
        });
    }
  }, [resumenTarjeta]);

  /*
   * Al entrar, buscar migraciones a medias. La lista de trabajo vivía sólo en
   * el estado del componente: recargar la borraba y la única salida era subir
   * el archivo otra vez, duplicando todas las filas. Una cartera de 1.200
   * contratos no se resuelve de una sentada.
   */
  /**
   * `true` cuando la lista de migraciones a medias no se pudo leer. No frena
   * nada — empezar de cero sigue permitido — pero se DICE: si hay una a
   * medias y la persona no la ve, resube el mismo archivo y duplica las
   * filas. El silencio escondía justo ese riesgo (misma regla que terceros).
   */
  const [fallaronLosLotes, setFallaronLosLotes] = useState(false);

  useEffect(() => {
    let vigente = true;
    contractsApi.migracion
      .lotesAbiertos()
      .then((l) => {
        if (vigente) {
          setLotesAbiertos(l);
          setFallaronLosLotes(false);
        }
      })
      .catch(() => {
        // No poder listarlos no debe impedir empezar uno nuevo.
        if (vigente) setFallaronLosLotes(true);
      });
    return () => {
      vigente = false;
    };
  }, []);

  const retomar = useCallback((elLote: string) => {
    setError(null);
    // Igual que en `preparar()`: si el lote retomado todavía está
    // ENCOLADO/PROCESANDO (p.ej. se reabrió el importador mientras el job
    // seguía corriendo), no hay lista de trabajo que mostrar todavía — el
    // efecto de abajo llama a `refrescar` recién cuando `estadoLote.estado
    // === 'LISTO'`.
    setResumen(null);
    setLote(elLote);
    // Otro lote: la selección del anterior no aplica acá (§3.2.G4).
    setSeleccion(new Set());
  }, []);

  /*
   * El lote pasó a LISTO (por el sondeo de `useEstadoDeLote`, o porque ya
   * lo estaba desde `lotesAbiertos()`): recién ahí tiene sentido cargar la
   * lista de trabajo real.
   */
  useEffect(() => {
    if (!lote) return;
    if (estadoLote?.estado === "LISTO") {
      refrescar(lote)
        .then(() => consignarDesdeElArchivo(lote))
        .catch((e) => {
          setError(
            e instanceof Error ? e.message : "No pudimos abrir ese lote.",
          );
        });
    }
  }, [lote, estadoLote?.estado, refrescar, consignarDesdeElArchivo]);

  // ── Hay un lote pero todavía no está LISTO: pantalla de espera ───────────
  // Ítem 1 del brief — mostrar progreso mientras el usuario elige esperar, y
  // dejar explícito que cerrar la pestaña es seguro (el lote es durable
  // server-side; la notificación avisa igual — contrato §3.2.C).
  if (lote && !resumen) {
    return (
      <ProgresoDeLote
        estado={estadoLote}
        agotado={agotado}
        verificando={cargando}
        onVerificarAhora={() => void verificarAhora()}
        onVolverAEmpezar={volverAEmpezar}
      />
    );
  }

  // ── Ya se preparó: lista de trabajo ──────────────────────────────────────
  if (resumen && lote) {
    return (
      <ListaDeTrabajo
        lote={lote}
        resumen={resumen}
        pendientes={pendientes}
        totalPendientes={totalPendientes}
        pagina={pagina}
        seleccion={seleccion}
        activacion={activacion}
        invitar={invitar}
        setInvitar={setInvitar}
        cargando={cargando}
        error={error}
        onActivar={() => void activar()}
        descartando={descartandoLote}
        onDescartarLote={descartarLote}
        // 🔴 `.catch` y no `void` pelado: un refresco que falla con `void`
        // es un fallo MUDO — la persona resuelve una fila, la lista no se
        // mueve, y no hay ni un cartel que diga por qué.
        onPaginaCambia={(p) =>
          refrescar(lote, p).catch((e) =>
            setError(
              e instanceof Error
                ? e.message
                : "No pudimos traer esa página. Probá de nuevo.",
            ),
          )
        }
        onSeleccionCambia={setSeleccion}
        onFilaResuelta={() =>
          refrescar(lote, pagina).catch((e) =>
            setError(
              e instanceof Error
                ? e.message
                : "Se guardó, pero no pudimos refrescar la lista. Cambiá de página para verla al día.",
            ),
          )
        }
        onOtroArchivo={volverAEmpezar}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Migraciones a medias. Volver a subir el archivo duplicaría las filas:
          por eso se ofrece retomar ANTES del cargador, no después. */}
      {lotesAbiertos.length > 0 ? (
        <Card
          className="space-y-3 border-primary/30 p-5"
          data-testid="lotes-abiertos"
        >
          <p className="text-sm font-medium text-foreground">
            Tenés una migración sin terminar
          </p>
          {lotesAbiertos.map((l) => {
            // F1 (contrato §3.2.A3) — `estado` ausente es un lote anterior
            // a T-0031 (sin fila `MigracionLote`): se trata como LISTO,
            // igual que hoy.
            const procesando =
              l.estado === "ENCOLADO" || l.estado === "PROCESANDO";
            return (
              <div
                key={l.lote}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <p className="text-sm text-muted-foreground">
                  <span className="text-foreground">{l.lote}</span>
                  {procesando ? (
                    <span className="inline-flex items-center gap-1 text-primary">
                      {" · "}
                      <Clock className="h-3 w-3" />
                      {l.total != null
                        ? `procesando ${l.pendientes + l.listos} / ${l.total}`
                        : "procesando"}
                    </span>
                  ) : (
                    <>
                      {" · "}
                      {l.pendientes}{" "}
                      {l.pendientes === 1
                        ? "fila pendiente"
                        : "filas pendientes"}
                      {/*
                       * T-0035 — leía `l.listos`: con el modo sparse prendido
                       * eso daba SIEMPRE 0 en un lote real (todo quedaba
                       * PENDIENTE por falta de inmueble) y la tarjeta nunca
                       * decía que había algo para activar, aunque el back sí
                       * podía. `activables` es la cuenta real — y evitamos
                       * la palabra «listas», que en modo sparse incluye
                       * filas todavía incompletas.
                       */}
                      {l.activables > 0
                        ? ` · ${l.activables} para activar`
                        : ""}
                    </>
                  )}
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  {/*
                   * T-0039 — "Descartar" secundario, al lado de "Retomar"
                   * (primario). El owner lo pidió para un lote que NO quiere
                   * continuar: obligarlo a apretar "Retomar" primero para
                   * llegar al botón de T-0036 era exactamente lo que había
                   * que resolver. `variant="outline"` + tinte destructivo lo
                   * mantiene secundario a propósito — esta tarjeta puede
                   * listar varios lotes y "Retomar" sigue siendo el click
                   * fácil, no éste.
                   */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    hideArrow
                    disabled={procesando || cargandoResumenDe === l.lote}
                    isLoading={cargandoResumenDe === l.lote}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      // Guarda además del `disabled`: un lote PROCESANDO
                      // devuelve 409 LOTE_EN_PROCESO si se le pide `resumen()`
                      // igual, y el owner pidió explícitamente no dejar
                      // llegar al usuario a ese error — se explica en la
                      // propia tarjeta en vez (arriba, "procesando N / total").
                      if (procesando) return;
                      void abrirDescarteDesdeTarjeta(l.lote);
                    }}
                    data-testid={`descartar-lote-lista-${l.lote}`}
                  >
                    Descartar
                  </Button>
                  <Button
                    size="sm"
                    hideArrow
                    disabled={cargando}
                    onClick={() => retomar(l.lote)}
                  >
                    Retomar
                  </Button>
                </div>
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">
            Si volvés a subir el mismo archivo, las filas se duplican.
          </p>
          {errorTarjeta ? (
            <p
              className="text-xs text-destructive"
              data-testid="error-descartar-lote-tarjeta"
            >
              {errorTarjeta}
            </p>
          ) : null}
        </Card>
      ) : null}

      {fallaronLosLotes ? (
        <p
          className="rounded-md border border-border bg-warning-soft p-3 text-sm text-fg"
          data-testid="lotes-abiertos-fallo"
        >
          No pudimos verificar si tenés una migración sin terminar. Si dejaste
          una a medias, retomala antes de volver a subir el archivo — resubirlo
          duplica las filas.
        </p>
      ) : null}

      {resumenTarjeta ? (
        <DialogoDescartarLote
          lote={resumenTarjeta.lote}
          resumen={resumenTarjeta.resumen}
          descartando={descartandoTarjeta}
          onOpenChange={(o) => {
            if (!o && !descartandoTarjeta) setResumenTarjeta(null);
          }}
          onConfirmar={() => void confirmarDescarteDesdeTarjeta()}
        />
      ) : null}

      <Card className="p-6">
        {/*
         * Zona de arrastre, no un `<label>` con un input escondido.
         *
         * Este paso era el ÚNICO de los seis sin `useDropzone`: los otros
         * cinco reciben el archivo arrastrado y este se quedaba mirando —
         * arrastrar encima no hacía nada y, peor, soltarlo fuera de un
         * dropzone hace que el navegador ABRA el archivo y se lleve la
         * pestaña con la migración a medias. Nico lo probó y creyó que se
         * había roto (2026-09-01); nunca había existido.
         *
         * `react-dropzone` limpia el input después de cada selección, así
         * que volver a elegir EL MISMO archivo (corregido, con el mismo
         * nombre) sigue disparando la lectura — que es lo que el reset
         * manual de antes garantizaba a mano.
         */}
        <div
          {...getRootProps()}
          className={`flex cursor-pointer flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center transition-colors ${
            isDragActive
              ? "border-primary bg-primary/10"
              : "border-border hover:bg-muted/40"
          }`}
          data-testid="dropzone-contratos"
        >
          {/* allowlist: react-dropzone hidden file input (mecanismo canónico) */}
          {/* El `data-testid` va aparte: `DropzoneInputProps` no lo tipa. */}
          <input {...getInputProps()} data-testid="archivo-contratos" />
          <FileArrowUp className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {isDragActive
                ? "Soltá el archivo acá"
                : "Arrastrá el archivo de contratos o hacé clic para elegirlo"}
            </p>
            <p className="text-xs text-muted-foreground">
              Excel o CSV exportado de tu sistema actual
            </p>
          </div>
        </div>

        {error ? (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <Warning className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-sm text-foreground">{error}</p>
          </div>
        ) : null}
      </Card>

      {mapeo.length > 0 ? (
        <Card className="space-y-4 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-sm font-medium text-foreground">
                Así entendimos tus columnas
              </h2>
              <p className="text-xs text-muted-foreground">
                {filas.length} contratos en el archivo. Revisá el mapeo antes de
                seguir, y corregí a mano lo que haga falta: «arrendador» es el
                propietario y «arrendatario» es el inquilino, y se parecen
                demasiado.
              </p>
            </div>
            <Button
              type="button"
              variant="link"
              size="sm"
              hideArrow
              onClick={restablecerMapeo}
              className="shrink-0 text-xs"
            >
              Restablecer
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Columna del archivo</TableHead>
                  <TableHead>Campo del contrato</TableHead>
                  <TableHead>Por qué</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mapeo.map((m) => (
                  <TableRow key={m.columna}>
                    <TableCell className="font-medium">{m.columna}</TableCell>
                    <TableCell>
                      <Select
                        value={m.campo ?? IGNORAR}
                        onValueChange={(v) =>
                          cambiarMapeo(
                            m.columna,
                            v === IGNORAR ? null : (v as CampoDeContrato),
                          )
                        }
                      >
                        <SelectTrigger
                          className="w-full min-w-[200px]"
                          data-testid={`mapeo-${m.columna}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={IGNORAR}>Ignorar</SelectItem>
                          {CAMPOS.map((c) => (
                            <SelectItem key={c} value={c}>
                              {NOMBRE_DE_CAMPO[c]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {m.isManual
                        ? "elegido a mano"
                        : m.porque
                          ? `coincidió con «${m.porque}»`
                          : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Informativo, no bloquea: cualquier archivo se puede revisar. */}
          {noMapeados.length > 0 ? (
            <div className="flex items-start gap-2 rounded-md border border-border bg-info-soft p-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
              <div>
                <p className="text-sm font-medium text-info">
                  {noMapeados.length === 1
                    ? "Una columna no se mapeó"
                    : `${noMapeados.length} columnas no se mapearon`}
                </p>
                <p className="mt-0.5 text-body-sm text-fg-muted">
                  {noMapeados.map((c) => NOMBRE_DE_CAMPO[c]).join(" · ")} —
                  podés completarlos fila por fila después de revisar.
                </p>
              </div>
            </div>
          ) : null}

          {/* No dice "importar": todavía no se crea nada. Sin gate de
              columnas: cualquier archivo llega a la lista de trabajo. */}
          <Button
            onClick={() => void preparar()}
            disabled={filas.length === 0 || cargando}
            isLoading={cargando}
            hideArrow
          >
            Revisar {filas.length} contratos
          </Button>
        </Card>
      ) : null}
    </div>
  );
}

/**
 * El modal de confirmación de "Descartar este lote" — copia y anatomía
 * congeladas por contract.md T-0036 §3.2.C6. Dos call sites lo necesitan
 * idéntico: `ListaDeTrabajo` (T-0036, el lote ya abierto) y la tarjeta
 * "Tenés una migración sin terminar" (T-0039, sin abrirlo). Antes de T-0039
 * vivía inline dentro de `ListaDeTrabajo`; se extrajo acá para que ningún
 * call site pueda divergir por accidente — un dato o una frase que cambia en
 * uno y no en el otro es exactamente el tipo de drift que este componente
 * evita por construcción.
 *
 * `lote` se muestra en el título: la tarjeta puede listar varios lotes a la
 * vez, así que la confirmación tiene que nombrar CUÁL se está por descartar.
 */
function DialogoDescartarLote({
  lote,
  resumen,
  descartando,
  onOpenChange,
  onConfirmar,
}: {
  lote: string;
  resumen: ResumenLote;
  /** Nunca rechaza — ver `descartarLote`/`confirmarDescarteDesdeTarjeta`. */
  descartando: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmar: () => void;
}) {
  return (
    // AlertDialog — shadcn, NUNCA window.confirm(). Sin type-to-confirm a
    // propósito (§11-L7): es recuperable resubiendo el archivo.
    <AlertDialog
      open
      onOpenChange={(o) => {
        if (!descartando) onOpenChange(o);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Descartar el lote {lote}?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 text-left">
            <span className="block">
              Se van a descartar {resumen.pendientes + resumen.listos}{" "}
              {resumen.pendientes + resumen.listos === 1 ? "fila" : "filas"} de
              este lote — las que todavía no están completas y las que ya están
              listas pero sin activar. No se van a convertir en contratos, y se
              pierde el trabajo ya hecho en ellas: inmueble asignado,
              propietario registrado, fechas y canon corregidos.
            </span>
            {resumen.activados > 0 ? (
              <span className="block">
                Los {resumen.activados}{" "}
                {resumen.activados === 1 ? "contrato" : "contratos"} que ya se
                activaron de este lote no se tocan — siguen siendo contratos
                reales.
              </span>
            ) : null}
            <span className="block">
              Los inmuebles y propietarios que ya se crearon a partir de este
              archivo tampoco se borran: vas a seguir viéndolos en tu
              portafolio.
            </span>
            <span className="block">
              Podés volver a intentarlo subiendo el mismo archivo otra vez — el
              archivo original no se modifica.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={descartando}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            tone="danger"
            disabled={descartando}
            onClick={(e) => {
              e.preventDefault();
              onConfirmar();
            }}
          >
            {descartando ? "Descartando..." : "Descartar este lote"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * La lista de trabajo.
 *
 * Es el corazón del rediseño: en vez de un reporte de lo que falló, una lista
 * de lo que falta con la salida al lado. Nada se perdió y nada se creó todavía.
 */
function ListaDeTrabajo({
  lote,
  resumen,
  pendientes,
  totalPendientes,
  pagina,
  seleccion,
  activacion,
  invitar,
  setInvitar,
  cargando,
  error,
  onActivar,
  descartando,
  onDescartarLote,
  onFilaResuelta,
  onOtroArchivo,
  onPaginaCambia,
  onSeleccionCambia,
}: {
  lote: string;
  resumen: ResumenLote;
  pendientes: FilaDeMigracion[];
  totalPendientes: number;
  pagina: number;
  seleccion: Set<string>;
  activacion: ResumenActivacion | null;
  invitar: boolean;
  setInvitar: (v: boolean) => void;
  cargando: boolean;
  error: string | null;
  onActivar: () => void;
  /** T-0036 §3.2.C — nunca rechaza: los errores se reflejan en `error`. */
  descartando: boolean;
  onDescartarLote: () => Promise<void>;
  onFilaResuelta: () => void;
  onOtroArchivo: () => void;
  onPaginaCambia: (p: number) => void;
  onSeleccionCambia: (s: Set<string>) => void;
}) {
  const totalPaginas = Math.max(1, Math.ceil(totalPendientes / POR_PAGINA));
  const todasMarcadas =
    pendientes.length > 0 && pendientes.every((f) => seleccion.has(f.id));

  // T-0033 §3.2.G1 — "Seleccionar las {total} del lote": trae todo el
  // conjunto de ids vía `GET migrar/filas/ids`, sin descargar el `datos` JSON
  // de cada fila. Estado local: sólo le importa a este control.
  const [seleccionandoTodo, setSeleccionandoTodo] = useState(false);
  const [notaSeleccion, setNotaSeleccion] = useState<string | null>(null);

  // T-0036 §3.2.C6 — el modal de confirmación de "Descartar este lote".
  // Vive acá (no en el padre): en éxito el padre desmonta este componente
  // entero (deja `lote`/`resumen`), así que el modal se va con él sin
  // necesidad de cerrarlo a mano; en error, `onDescartarLote` resuelve
  // igual (nunca rechaza) y el `.then` de abajo lo cierra.
  const [confirmarDescarte, setConfirmarDescarte] = useState(false);
  const puedeDescartarLote = resumen.pendientes + resumen.listos > 0;

  async function seleccionarTodoElLote() {
    setSeleccionandoTodo(true);
    setNotaSeleccion(null);
    try {
      const r = await contractsApi.migracion.idsDeFilas(lote, "PENDIENTE");
      onSeleccionCambia(new Set(r.ids));
      // §3.2.G1 — un lote más grande que `MAX_IDS_MASIVA` nunca se aplica en
      // silencio a un subconjunto: se dice explícitamente cuántas de cuántas.
      setNotaSeleccion(
        r.truncado
          ? `Se seleccionaron las primeras ${r.ids.length} de ${r.total} — hay más de las que caben a la vez.`
          : null,
      );
    } catch (e) {
      setNotaSeleccion(
        e instanceof Error ? e.message : "No pudimos seleccionar todo el lote.",
      );
    } finally {
      setSeleccionandoTodo(false);
    }
  }

  return (
    <div className="space-y-6" data-testid="lista-de-trabajo">
      <Card className="space-y-4 p-6">
        <div className="grid gap-3 sm:grid-cols-4">
          <Dato etiqueta="En el archivo" valor={resumen.total} />
          <Dato etiqueta="Listos" valor={resumen.listos} tono="ok" />
          <Dato
            etiqueta="Les falta algo"
            valor={resumen.pendientes}
            tono="mal"
          />
          <Dato etiqueta="Ya activados" valor={resumen.activados} />
        </div>

        {/*
         * T-0035 — este bloque leía `resumen.listos`, que es exactamente lo
         * que `activar()` toma con el modo sparse APAGADO. Con el modo
         * sparse PRENDIDO (el default desde T-0033 WU-3), `activar()`
         * también toma las filas PENDIENTE — y un lote real donde todas las
         * filas quedaron sin inmueble tiene `listos: 0` con las 1.365
         * igualmente activables. Mirar `listos` acá era el bug: el botón
         * jamás aparecía aunque el back sí podía activarlas. `activables`
         * (contract T-0035 §1) es la cuenta real, sea cual sea el flag —
         * el front no necesita saber su nombre ni su valor.
         */}
        {resumen.activables > 0 ? (
          <>
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3">
              <Checkbox
                id="invitar-inquilinos"
                checked={invitar}
                onCheckedChange={(c) => setInvitar(c === true)}
                className="mt-0.5"
              />
              <span className="text-sm text-foreground/80">
                Invitar a los inquilinos al portal
                <span className="block text-xs text-muted-foreground">
                  Se manda por tandas, no todo de golpe.
                </span>
              </span>
            </label>

            {/*
             * T-0036 §3.2.A6 — destildado, esta línea antes no decía nada de
             * lo que en realidad pasa. Surface A dejó de crear una cuenta
             * silenciosa (I1): sin invitar, el contrato se crea igual y el
             * correo queda guardado, pero nadie se entera hasta que alguien
             * invite desde el contrato. Frozen: no puede insinuar nada de
             * cobros — `CobrosService.generate` factura desde
             * `Consignacion.monthlyRent`, no depende de un `Lease`.
             */}
            {!invitar ? (
              <p
                className="text-xs text-muted-foreground"
                data-testid="aviso-sin-invitar"
              >
                No se crea ninguna cuenta: el correo del inquilino queda
                guardado en cada contrato, y podés invitarlo cuando quieras
                desde ahí.
              </p>
            ) : null}

            {/*
             * `resumen.listos` son las que no les falta NADA. Todo lo que
             * `activables` suma por encima de eso son filas PENDIENTE que
             * el modo sparse va a activar igual, con lo que les falte —
             * la advertencia es honesta sobre qué va a pasar, no presenta
             * el lote como si ya estuviera resuelto (T-0035 brief, punto 2).
             */}
            {resumen.activables > resumen.listos ? (
              <p
                className="text-xs text-muted-foreground"
                data-testid="aviso-incompletos"
              >
                {resumen.activables - resumen.listos} de estos contratos todavía
                tienen algo pendiente — por ejemplo, sin inmueble asignado. Se
                van a crear igual, van a decir «Sin inmueble» (o lo que les
                falte), y vas a poder completarlos después.
              </p>
            ) : null}

            <Button
              onClick={onActivar}
              disabled={cargando}
              isLoading={cargando}
              hideArrow
            >
              Activar {resumen.activables} contratos
            </Button>
          </>
        ) : null}

        {resumen.activables === 0 && resumen.pendientes > 0 ? (
          <p className="text-sm text-muted-foreground">
            Ninguno se puede activar todavía. Resolvé lo de abajo y van pasando
            a listos solos.
          </p>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {/*
         * T-0036 §3.2.C6 — visualmente separado de Activar: uno es el
         * camino feliz, el otro es irreversible. Sólo vive acá adentro,
         * nunca en la tarjeta "Retomar" (§11-L5) — descartar 1.365 filas de
         * un resumen que nadie abrió es un mis-click esperando a pasar.
         */}
        {puedeDescartarLote ? (
          <div className="border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              hideArrow
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmarDescarte(true)}
              data-testid="descartar-lote"
            >
              Descartar este lote
            </Button>
          </div>
        ) : null}
      </Card>

      {confirmarDescarte ? (
        <DialogoDescartarLote
          lote={lote}
          resumen={resumen}
          descartando={descartando}
          onOpenChange={setConfirmarDescarte}
          onConfirmar={() =>
            void onDescartarLote().then(() => setConfirmarDescarte(false))
          }
        />
      ) : null}

      {activacion ? (
        <Card className="space-y-2 p-6" data-testid="resultado-activacion">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <CheckCircle className="h-4 w-4 text-success" weight="fill" />
            {activacion.activadas} contratos activados
            {activacion.invitados > 0
              ? ` · ${activacion.invitados} inquilinos invitados`
              : ""}
          </p>
          {/*
           * T-0036 §3.2.A4/A6 — el producto entero del cambio: cuántos
           * correos se guardaron sin invitar a nadie. Ausente o `0` ⇒ sin
           * línea, nunca "0 pendientes" (un back viejo que todavía no manda
           * el campo no puede afirmar un conteo que no tiene).
           */}
          {activacion.porInvitar ? (
            <p
              className="text-sm text-muted-foreground"
              data-testid="aviso-pendientes-de-invitar"
            >
              {activacion.porInvitar}{" "}
              {activacion.porInvitar === 1
                ? "inquilino queda"
                : "inquilinos quedan"}{" "}
              pendiente{activacion.porInvitar === 1 ? "" : "s"} de invitar — se
              hace desde cada contrato.
            </p>
          ) : null}
          {activacion.fallidas > 0 ? (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {activacion.resultados
                .filter((r) => r.estado === "fallido")
                .map((r) => (
                  <li key={r.fila}>
                    Fila {r.fila + 2}: {r.motivo}
                  </li>
                ))}
            </ul>
          ) : null}
        </Card>
      ) : null}

      {pendientes.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <Checkbox
                checked={todasMarcadas}
                onCheckedChange={(c) => {
                  // T-0033 §3.2.G4 — antes reemplazaba TODA la selección por
                  // la de esta página. Con selección across-pages eso borraba
                  // lo elegido en otras páginas; ahora sólo agrega/quita las
                  // de ESTA página, sin tocar el resto.
                  const s = new Set(seleccion);
                  if (c === true) pendientes.forEach((f) => s.add(f.id));
                  else pendientes.forEach((f) => s.delete(f.id));
                  onSeleccionCambia(s);
                }}
              />
              Seleccionar las {pendientes.length} de esta página
            </label>
            {/* Sólo tiene sentido si hay más de lo que cabe en una página —
                si ya está todo a la vista, el control de arriba alcanza. */}
            {totalPendientes > pendientes.length ? (
              <Button
                type="button"
                variant="link"
                size="sm"
                hideArrow
                disabled={seleccionandoTodo}
                isLoading={seleccionandoTodo}
                onClick={() => void seleccionarTodoElLote()}
                className="text-xs"
              >
                Seleccionar las {totalPendientes} del lote
              </Button>
            ) : null}
          </div>
          {/* El total viene del back: contar lo recibido diría «quedan 25». */}
          <p className="text-xs text-muted-foreground">
            {totalPendientes} pendientes en total
          </p>
        </div>
      ) : null}

      {notaSeleccion ? (
        <p
          className="text-xs text-muted-foreground"
          data-testid="nota-seleccion"
        >
          {notaSeleccion}
        </p>
      ) : null}

      {seleccion.size > 0 ? (
        <ResolucionMasiva
          ids={Array.from(seleccion)}
          seleccionadas={pendientes.filter((f) => seleccion.has(f.id))}
          onListo={onFilaResuelta}
        />
      ) : null}

      {pendientes.map((f) => (
        <Card key={f.id} className="space-y-3 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
              <Checkbox
                checked={seleccion.has(f.id)}
                onCheckedChange={(c) => {
                  const s = new Set(seleccion);
                  if (c === true) s.add(f.id);
                  else s.delete(f.id);
                  onSeleccionCambia(s);
                }}
              />
              {/* +2: en el archivo la primera fila de datos es la 2. */}
              Fila {f.fila + 2} · {f.datos.inquilino?.nombre || "sin nombre"}
            </label>
            <p className="text-xs text-muted-foreground">{f.datos.direccion}</p>
          </div>
          <FaltantesDeFila fila={f} onResuelta={onFilaResuelta} />
        </Card>
      ))}

      {totalPaginas > 1 ? (
        <Pagination
          currentPage={pagina}
          totalPages={totalPaginas}
          onPageChange={onPaginaCambia}
        />
      ) : null}

      <Button variant="outline" onClick={onOtroArchivo} hideArrow>
        Subir otro archivo
        <ArrowRight className="ml-1.5 h-4 w-4" />
      </Button>
    </div>
  );
}

function Dato({
  etiqueta,
  valor,
  tono,
}: {
  etiqueta: string;
  valor: number;
  tono?: "ok" | "mal";
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
      <p
        className={`text-xl font-semibold tabular-nums ${
          tono === "ok" && valor > 0
            ? "text-success"
            : tono === "mal" && valor > 0
              ? "text-destructive"
              : "text-foreground"
        }`}
      >
        {valor}
      </p>
    </div>
  );
}
