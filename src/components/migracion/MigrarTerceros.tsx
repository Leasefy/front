'use client';

/**
 * Paso 1 de la migración: los terceros.
 *
 * ── preparar → corregir → aplicar ───────────────────────────────────────────
 *
 * Tres pasos y no uno, por la misma razón que en la migración de contratos: un
 * import que crea o falla obliga a corregir el Excel y volver a subirlo por
 * cada dato que falte, y en 600 propietarios siempre falta uno. Acá la fila
 * entra SIEMPRE, se revisa en pantalla, y sólo lo que quedó `LISTO` se
 * convierte en una ficha real.
 *
 * ── Cuatro cosas que esta pantalla hace a propósito ─────────────────────────
 *
 * 1. **Las columnas las manda el back.** `GET /plantilla` alimenta el mapeo Y
 *    la descarga de la plantilla vacía. Una lista escrita en el front se queda
 *    vieja sin un solo error.
 * 2. **Muestra POR QUÉ mapeó cada columna, y deja corregirlo.** Y distingue el
 *    empate exacto del parecido: «coincide con» no es «se parece a».
 * 3. **Ningún archivo se rechaza por lo que le falta.** Lo que falte se
 *    completa fila por fila, sin volver a subir nada.
 * 4. **Un duplicado se pregunta.** Nunca se fusiona solo.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  ArrowRight,
  CheckCircle,
  DownloadSimple,
  Info,
  Trash,
  UserCircle,
  Users,
  Warning,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Presence, SegmentedControl, Stagger, StaggerItem } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { TarjetaDeArchivo } from '@/components/migracion/TarjetaDeArchivo';
import { ZonaDeArchivo } from '@/components/migracion/ZonaDeArchivo';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { TablePagination } from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { ApiError } from '@/lib/api/client';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { useAvisoAlSalir } from '@/lib/hooks/use-aviso-al-salir';
import {
  leerPrimerasFilasDeCadaHoja,
  parseSpreadsheetFile,
} from '@/components/inmobiliaria/import/lib/parseFile';
import { elegirDondeEstaLaTabla, fraseDeDondeSeLeyo } from '@/lib/migracion/donde-esta-la-tabla';
import { fraseDeFilasDeTotales } from '@/lib/migracion/fila-de-totales';
import { MENSAJES_DE_LA_MIGRACION } from './limites-de-la-migracion';
import {
  migracionTercerosApi,
  CAMPOS_NO_MASIVOS,
  CODIGO_CAMPO_NO_MASIVO,
  CODIGO_FILA_DESACTUALIZADA,
  MAX_FILAS_POR_LOTE,
  type CambiosMasivos,
  type CodigoDeError,
  type FiltroDeFilas,
  type MotivosDelLote,
  type ProgresoDeMasivo,
  type FilaDeStaging,
  type FilaTercero,
  type LoteDeTerceros,
  type PlantillaDeTerceros,
  type ResumenDeAplicacion,
  type ResumenDeLote,
  type TipoDeTercero,
} from '@/lib/api/migracion-terceros.service';
import {
  armarFila,
  columnasDelNombrePorPartes,
  columnasNoSoportadas,
  ETIQUETA_DE_PARTE,
  mapearColumnas,
  nombreDeLoteSugerido,
  obligatoriasSinMapear,
  PARTES_DEL_NOMBRE,
  placeholderDeEjemplo,
  remapear,
  VALOR_A_NOTAS,
  valorDeParte,
  type MapeoDeColumna,
} from '@/lib/migracion/columnas-de-tercero';
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext';
import { descargarPlantillaDeTerceros } from '@/lib/migracion/plantilla-de-terceros';
import { fraseDelMotivo, motivosConFilas } from '@/lib/migracion/motivos-de-fila';
import {
  aplicarLoteDeTerceros,
  AplicacionInterrumpida,
  type ProgresoDeAplicacion,
} from '@/lib/migracion/aplicar-lote-de-terceros';
import { AvanceDeRetomar, type FaseDeRetomar } from './AvanceDeRetomar';
import { FilaDeTercero, type ResultadoDeAccion } from './FilaDeTercero';
import { TercerosYaCargados, type EstadoDeLoCargado } from './TercerosYaCargados';

/** Sentinel de Radix: un `<Select>` no admite `value=""`. */
const IGNORAR = '__ignorar__';

/**
 * Cuántas filas por página en la lista de trabajo.
 *
 * Con 400 pendientes, pintarlas todas son 400 tarjetas con sus propios
 * controles: la pestaña se arrastra y nadie llega a la última.
 */
const POR_PAGINA = 25;

/**
 * Cuánto se espera al «Retomar» antes de decir que está tardando más de lo
 * normal. Con la base sana abrir una carga de 1.729 filas toma pocos segundos;
 * pasado esto, la persona merece saber que puede soltar la espera.
 */
export const MS_PARA_DECIR_QUE_RETOMAR_TARDA = 15_000;

type Fila = Record<string, unknown>;

/**
 * T-0128 · el 400 de poner en masa un campo que identifica a la persona. La
 * pantalla ya no los ofrece, pero un back que cambie la lista, o una pestaña
 * vieja, pueden llegar acá: se explica en vez de mostrar el código.
 */
const MENSAJE_CAMPO_NO_MASIVO =
  'Ese dato identifica a cada persona (documento, dígito de verificación, nombre, correo o id del sistema anterior) ' +
  'y no se puede poner igual en varias filas. Corrígelo fila por fila.';

/**
 * El fallo de una acción, dicho para la persona (sistema de errores,
 * 02-10-2026): por el traductor — un 4xx dice qué está mal, un 5xx que fue de
 * nuestro lado con su referencia, y «conexión» SÓLO si no hubo respuesta.
 * Antes devolvía el `message` crudo de cualquier `Error` (un 5xx en inglés,
 * un `TypeError`). `CAMPO_NO_MASIVO` conserva su texto propio.
 */
const mensaje = (e: unknown, respaldo: string, accion?: string) => {
  if (e instanceof ApiError && e.code === CODIGO_CAMPO_NO_MASIVO) return MENSAJE_CAMPO_NO_MASIVO;
  return mensajeParaLaPersona(e, { porDefecto: respaldo, accion });
};

/**
 * T-0128 · a quién le aplica una acción masiva: a las filas marcadas una por
 * una (`ids`, el camino de siempre), a TODAS las que requieren atención
 * (`todas`) o a todas las que traen un motivo (`motivo`). Las dos últimas no
 * necesitan que las filas estén en pantalla: van por `PATCH filas/masivo`.
 */
export type Alcance =
  | { tipo: 'ids' }
  | { tipo: 'todas' }
  | { tipo: 'motivo'; codigo: CodigoDeError };

const SOLO_IDS: Alcance = { tipo: 'ids' };

/** Cuántas filas alcanza la acción masiva con la selección de ahora. */
export function cantidadDelAlcance(
  alcance: Alcance,
  seleccionadas: number,
  totalPendientes: number,
  motivos: MotivosDelLote | null,
): number {
  if (alcance.tipo === 'ids') return seleccionadas;
  if (alcance.tipo === 'todas') return totalPendientes;
  return motivos?.porMotivo.find((m) => m.codigo === alcance.codigo)?.filas ?? 0;
}

function filtroDelAlcance(alcance: Exclude<Alcance, { tipo: 'ids' }>): FiltroDeFilas {
  return alcance.tipo === 'todas'
    ? { estado: 'REQUIERE_ATENCION' }
    : { estado: 'REQUIERE_ATENCION', motivo: alcance.codigo };
}

/** Qué se dice cuando una acción masiva terminó bien. */
function avisoDeMasivo(cambios: CambiosMasivos, n: number, listasAhora?: number): string {
  const filas = n === 1 ? 'fila' : 'filas';
  if (cambios.vincularAExistente) {
    return `${n} ${n === 1 ? 'fila vinculada' : 'filas vinculadas'} con las personas que ya existían: salieron de esta lista y quedaron listas para crear con el botón de arriba.`;
  }
  if (cambios.descartar) return `${n} ${n === 1 ? 'fila descartada' : 'filas descartadas'}.`;
  if (cambios.crearIncompleta) {
    const listas = listasAhora ?? n;
    return (
      `${listas} ${listas === 1 ? 'fila quedó lista' : 'filas quedaron listas'} para crearse con datos por completar: ` +
      'crea las fichas con el botón de arriba y completa lo que falte después, desde Propietarios o Inquilinos.' +
      (listasAhora !== undefined && n > listasAhora
        ? ` Las otras ${(n - listasAhora).toLocaleString('es-CO')} siguen acá porque les falta algo más.`
        : '')
    );
  }
  if (cambios.campos) {
    return cambios.sobrescribir
      ? `Se aplicó el valor a ${n.toLocaleString('es-CO')} ${filas}, también donde ya había otro.`
      : `Se aplicó el valor por defecto a ${n.toLocaleString('es-CO')} ${filas}: sólo se llenó lo que estaba vacío.`;
  }
  return `Se aplicó el cambio a ${n.toLocaleString('es-CO')} ${filas}.`;
}

/**
 * T-0125 · botar una carga o una fila exige `configuracion:delete` en el back,
 * que sólo tiene el administrador. Desde que una fila LISTO sin aplicar frena
 * el paso, un CONTADOR puede quedar detrás del muro con una fila que no puede
 * quitar: el «Forbidden» pelado no le dice a quién pedírselo. Los permisos NO
 * se tocan; se dice qué hacer.
 */
const SOLO_EL_ADMINISTRADOR_DESCARTA =
  'Descartar una carga o una fila requiere permisos de administración y tu rol no los tiene. ' +
  'Pídele a un administrador de tu inmobiliaria que lo haga: mientras tanto, esta carga sigue pendiente.';

const mensajeDeDescarte = (e: unknown, respaldo: string, accion?: string) =>
  e instanceof ApiError && e.status === 403 ? SOLO_EL_ADMINISTRADOR_DESCARTA : mensaje(e, respaldo, accion);

/**
 * El parte de una masiva parcial: TODOS los motivos distintos con sus filas,
 * no sólo el primero. Con 200 filas y cuatro causas, mostrar una sola manda a
 * la persona a resolver a ciegas las otras tres.
 */
export function resumenDeFallidas(r: {
  pedidas: number;
  aplicadas: number;
  fallidas: { id: string; fila: number | null; motivo: string }[];
}): string {
  const porMotivo = new Map<string, number[]>();
  for (const f of r.fallidas) {
    const filas = porMotivo.get(f.motivo) ?? [];
    if (f.fila != null) filas.push(f.fila);
    porMotivo.set(f.motivo, filas);
  }
  const partes = [...porMotivo].map(([motivo, filas]) => {
    if (filas.length === 0) return motivo;
    const ref = filas.slice(0, 6).join(', ') + (filas.length > 6 ? '…' : '');
    return `${motivo} (${filas.length === 1 ? 'fila' : 'filas'} ${ref})`;
  });
  const n = r.fallidas.length;
  const quedaron =
    n === 1
      ? 'La que no se pudo quedó seleccionada para que la reintentes'
      : `Las ${n} que no se pudieron quedaron seleccionadas para que las reintentes`;
  return `Se aplicaron ${r.aplicadas} de ${r.pedidas}. ${quedaron}: ${partes.join(' · ')}`;
}

export interface MigrarTercerosProps {
  /**
   * Adentro del muro cada tipo es un paso: se fija el tipo y desaparece el
   * switch «¿Qué estás cargando?» — Nico vio que nadie iba a entender que
   * cambiando esa pestaña cambiaba lo que subía.
   */
  tipoFijo?: TipoDeTercero;
  /** Con qué tipo arranca la pantalla suelta (`/migracion/terceros?tipo=…`). */
  tipoInicial?: TipoDeTercero;
  /**
   * Aviso hacia el muro: `true` mientras se están CREANDO las fichas.
   * Sin esto, el pie ofrecía «Seguir con Inquilinos» apenas el conteo del
   * estado pasaba de cero, con la creación todavía corriendo (Nico lo vio).
   */
  onOcupado?: (ocupado: boolean, cancelar?: () => void) => void;
}

/**
 * Cuándo se tocó por última vez una carga sin terminar, en palabras.
 *
 * El nombre del lote ya lleva la fecha (`inquilinos-2026-09-02-0230`), pero
 * como slug no se lee: hay que decirlo aparte para que se note que es vieja.
 */
function fechaDeLote(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'desconocida';
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
}

/** Las filas que la revisión vuelve a mirar: las que todavía no se crearon ni se botaron. */
function filasVivas(l: LoteDeTerceros): number {
  return l.borradores + l.requierenAtencion + l.listos;
}

/** MG-28: el back dice así a la fila «misma persona» que no se volvió a crear. */
function esLaMismaPersonaYaCargada(motivo?: string): boolean {
  return Boolean(motivo?.startsWith('Es la misma persona'));
}

export function MigrarTerceros({ tipoFijo, tipoInicial, onOcupado }: MigrarTercerosProps = {}) {
  const [tipo, setTipo] = useState<TipoDeTercero>(tipoFijo ?? tipoInicial ?? 'PROPIETARIO');
  const [plantilla, setPlantilla] = useState<PlantillaDeTerceros | null>(null);
  /**
   * Error PROPIO de la plantilla, separado del `error` general: el general lo
   * limpia cualquier acción siguiente, y sin plantilla no hay pantalla — el
   * dropzone y la descarga quedan muertos. Con error propio hay un cartel
   * estable con su «Reintentar», en vez de una pantalla muda para siempre.
   */
  const [errorDePlantilla, setErrorDePlantilla] = useState<string | null>(null);
  const [intentoDePlantilla, setIntentoDePlantilla] = useState(0);

  /** El archivo tal cual. `null` = no hay nada subido; ver TarjetaDeArchivo. */
  const [archivo, setArchivo] = useState<File | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [encabezados, setEncabezados] = useState<string[]>([]);
  const [mapeo, setMapeo] = useState<MapeoDeColumna[]>([]);
  const [nombreDeArchivo, setNombreDeArchivo] = useState('');
  const [lote, setLote] = useState('');

  const [loteAbierto, setLoteAbierto] = useState<string | null>(null);
  const [resumen, setResumen] = useState<ResumenDeLote | null>(null);
  const [pendientes, setPendientes] = useState<FilaDeStaging[]>([]);
  const [totalPendientes, setTotalPendientes] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  /** T-0128 · `ids` = las marcadas una por una; si no, todas las de un filtro. */
  const [alcance, setAlcance] = useState<Alcance>(SOLO_IDS);
  /** T-0128 · cuántas filas hay por motivo, para «a las 2.895 que les falta el documento». */
  const [motivos, setMotivos] = useState<MotivosDelLote | null>(null);
  /** Avance de una acción masiva por filtro: `null` mientras no hay una corriendo. */
  const [progresoMasivo, setProgresoMasivo] = useState<ProgresoDeMasivo | null>(null);
  const [aplicacion, setAplicacion] = useState<ResumenDeAplicacion | null>(null);

  const [lotesAbiertos, setLotesAbiertos] = useState<LoteDeTerceros[]>([]);
  /** Avance de la creación por tandas: `null` mientras no hay una corriendo. */
  const [progreso, setProgreso] = useState<ProgresoDeAplicacion | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Qué hizo la última masiva, EN la página: un cambio silencioso en los
   *  contadores se lee como «apareció de la nada». */
  const [avisoMasivo, setAvisoMasivo] = useState<string | null>(null);

  /*
   * 🔴 Lo que ya está en Leasefy, adentro del muro (Nico, 01-10: «si ya subí
   * el archivo y me devuelvo a propietarios, ¿por qué no me muestra lo que ya
   * subí?»). Con personas ya creadas el paso abre con ELLAS y la subida queda
   * detrás de «Subir otro archivo». Ver `TercerosYaCargados`.
   */
  const [loCargado, setLoCargado] = useState<EstadoDeLoCargado>({ cargando: true });
  const [subiendoOtro, setSubiendoOtro] = useState(false);
  const subidaRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (subiendoOtro) subidaRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [subiendoOtro]);

  /*
   * `useMemo` y no `plantilla?.columnas ?? []` suelto: ese `[]` es un array
   * nuevo en cada render, así que TODO lo que depende de `columnas` se
   * recalcula siempre — incluido `armarFila` sobre las 5.000 filas del
   * archivo, en cada tecla del nombre del lote.
   */
  const columnas = useMemo(() => plantilla?.columnas ?? [], [plantilla]);

  // ── La plantilla, por tipo ────────────────────────────────────────────────

  useEffect(() => {
    let vigente = true;
    setPlantilla(null);
    setErrorDePlantilla(null);
    migracionTercerosApi
      .plantilla(tipo)
      .then((p) => vigente && setPlantilla(p))
      .catch(
        (e) =>
          vigente &&
          setErrorDePlantilla(mensaje(e, 'No pudimos leer las columnas esperadas.')),
      );
    return () => {
      vigente = false;
    };
  }, [tipo, intentoDePlantilla]);

  // Cambiar de tipo invalida el mapeo: las columnas de un inquilino no son las
  // de un propietario, y remapear contra la plantilla vieja guardaría el banco
  // en un campo que ya no existe.
  useEffect(() => {
    setFilas([]);
    setEncabezados([]);
    setMapeo([]);
    setNombreDeArchivo('');
  }, [tipo]);

  useEffect(() => {
    setLote(nombreDeLoteSugerido(tipo));
  }, [tipo]);

  // ── Migraciones a medias ──────────────────────────────────────────────────

  /**
   * `true` cuando la lista de cargas abiertas no se pudo leer. No frena nada
   * —empezar una carga nueva sigue permitido—, pero se DICE: si la persona
   * dejó una a medias y no lo ve, vuelve a subir el mismo archivo y duplica
   * a todo el mundo. Antes este fallo era mudo a propósito, y el silencio
   * escondía justo ese riesgo.
   */
  const [fallaronLosLotes, setFallaronLosLotes] = useState(false);

  const refrescarLotesAbiertos = useCallback(() => {
    migracionTercerosApi
      .lotesAbiertos()
      .then((lotes) => {
        setLotesAbiertos(lotes);
        setFallaronLosLotes(false);
      })
      .catch(() => {
        // No poder listarlos no puede impedir empezar uno nuevo.
        setFallaronLosLotes(true);
      });
  }, []);

  useEffect(refrescarLotesAbiertos, [refrescarLotesAbiertos]);

  // ── Leer el archivo ───────────────────────────────────────────────────────

  /** Dónde se leyó la tabla, si no fue A1 de la primera hoja (MG-01/02). */
  const [dondeSeLeyo, setDondeSeLeyo] = useState<string | null>(null);

  const leerArchivo = useCallback(
    async (archivo: File) => {
      setError(null);
      setDondeSeLeyo(null);
      setAplicacion(null);
      setArchivo(archivo);
      setNombreDeArchivo(archivo.name);
      setLeyendo(true);
      try {
        /*
         * En qué hoja y en qué fila empieza la tabla (QA-MIG-A, MG-01/02): un
         * Excel hecho a mano con el título arriba dejaba todas las filas
         * vacías, y un libro con «Instrucciones» primero creaba a un
         * propietario llamado «No modificar.». Si la exploración falla, se lee
         * como siempre: es una mejora, no un requisito.
         */
        let donde: { hoja?: string; fila: number } = { fila: 0 };
        try {
          donde = elegirDondeEstaLaTabla(
            await leerPrimerasFilasDeCadaHoja(archivo, 15),
            (celdas) => mapearColumnas(columnas, celdas).filter((m) => m.campo).length,
          );
        } catch {
          donde = { fila: 0 };
        }
        const { rows, headers, filasDeTotales } = await parseSpreadsheetFile(archivo, donde.hoja, {
          filaDeEncabezado: donde.fila,
        });
        setDondeSeLeyo(
          [fraseDeDondeSeLeyo(donde), fraseDeFilasDeTotales(filasDeTotales ?? [])].filter(Boolean).join(' ') || null,
        );
        if (rows.length === 0) {
          setError(MENSAJES_DE_LA_MIGRACION.archivoSinFilas(archivo.name));
          setFilas([]);
          setEncabezados([]);
          setMapeo([]);
          return;
        }
        setFilas(rows as Fila[]);
        setEncabezados(headers);
        setMapeo(mapearColumnas(columnas, headers));
      } catch (e) {
        setError(mensaje(e, 'No pudimos leer el archivo.'));
        setFilas([]);
        setEncabezados([]);
        setMapeo([]);
      } finally {
        setLeyendo(false);
      }
    },
    [columnas],
  );

  /**
   * Suelta el archivo y TODO lo que salió de él. Es el mismo camino que corre
   * «Descartar» en la tarjeta: un solo lugar donde acordarse de limpiar.
   */
  const soltarArchivo = useCallback(() => {
    setArchivo(null);
    setLeyendo(false);
    setDondeSeLeyo(null);
    setNombreDeArchivo('');
    setFilas([]);
    setEncabezados([]);
    setMapeo([]);
    setAplicacion(null);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: (aceptados) => {
      const archivo = aceptados[0];
      if (archivo) void leerArchivo(archivo);
    },
    maxFiles: 1,
    multiple: false,
    disabled: !plantilla,
  });

  // ── Preparar ──────────────────────────────────────────────────────────────

  const aMigrar = useMemo(
    () => filas.map((fila) => armarFila(fila, mapeo)),
    [filas, mapeo],
  );
  const noSoportadas = useMemo(() => columnasNoSoportadas(columnas), [columnas]);
  const faltanObligatorias = useMemo(
    () => obligatoriasSinMapear(columnas, mapeo),
    [columnas, mapeo],
  );

  /*
   * 🔴 Leer la lista NO revisa el lote (02-10-2026). Antes cada refresco —cada
   * página, cada corrección, «Actualizar la lista», después de crear— pedía
   * primero `POST revisar`, que con reglas viejas reescribe el lote ENTERO en el
   * back. Revisar es cosa de abrir la carga: lo hace `retomar`, una vez.
   */
  const leerLista = useCallback(async (elLote: string, pag = 1) => {
    // T-0128 · los conteos por motivo son una AYUDA para elegir de golpe: si no
    // llegan, la lista funciona igual y simplemente no se ofrecen.
    const contarMotivos = async (): Promise<MotivosDelLote | null> => {
      try {
        return await migracionTercerosApi.motivos(elLote);
      } catch {
        return null;
      }
    };
    const [r, p, m] = await Promise.all([
      migracionTercerosApi.resumen(elLote),
      migracionTercerosApi.filas({
        lote: elLote,
        estado: 'REQUIERE_ATENCION',
        pagina: pag,
        porPagina: POR_PAGINA,
      }),
      contarMotivos(),
    ]);
    return { resumen: r, pagina: p, motivos: m };
  }, []);

  const mostrarLista = useCallback((l: Awaited<ReturnType<typeof leerLista>>) => {
    setMotivos(l.motivos);
    setResumen(l.resumen);
    setPendientes(l.pagina.filas);
    setTotalPendientes(l.pagina.total);
    setPagina(l.pagina.pagina);
    // `seleccion` sobrevive a propósito: se limpia sólo cuando cambia el LOTE.
    // Reiniciarla acá haría que resolver una fila borrara lo elegido en otras
    // páginas, y aplicar algo a 300 filas serían doce masivas repetidas.
  }, []);

  const refrescar = useCallback(
    async (elLote: string, pag = 1) => mostrarLista(await leerLista(elLote, pag)),
    [leerLista, mostrarLista],
  );

  /**
   * El nombre que chocó con una carga que ya existe. Vive aparte del mensaje
   * de error porque habilita una salida distinta: si esa carga está en la
   * lista de abiertas, el botón «Retomar esa carga» resuelve el choque en un
   * clic — que es EXACTAMENTE lo que pasa cuando la red se cortó después de
   * que el back preparó: el reintento da 409 y la salida es retomar, no
   * renombrar.
   */
  const [loteEnConflicto, setLoteEnConflicto] = useState<string | null>(null);

  /*
   * Aviso al muro mientras HAY una operación en vuelo — preparar, crear en
   * masa, vincular/descartar en masa, cada corrección con refresco. Antes
   * sólo `aplicar` lo marcaba a mano: «todos son la misma persona» y las
   * masivas corrían con la pantalla editable y el pie del muro ofreciendo
   * seguir (Nico, 2026-09-01). Derivado de `cargando`, que es el único
   * interruptor que TODAS las operaciones largas de este paso ya prenden.
   */
  useEffect(() => {
    onOcupado?.(cargando);
  }, [cargando, onOcupado]);
  useEffect(() => () => onOcupado?.(false), [onOcupado]);

  /*
   * T-0125 · aviso nativo antes de cerrar la pestaña. Un archivo leído en el
   * navegador y todavía sin preparar existe SÓLO ahí; y crear las fichas es un
   * bucle del navegador. Preparada la carga vive en el back (se retoma), así
   * que sin operación en vuelo no hay nada que avisar.
   */
  useAvisoAlSalir(cargando || (filas.length > 0 && !loteAbierto));

  const preparar = useCallback(async () => {
    setCargando(true);
    setError(null);
    setLoteEnConflicto(null);
    let r: ResumenDeLote;
    try {
      r = await migracionTercerosApi.preparar(lote.trim(), tipo, aMigrar);
    } catch (e) {
      // El 409 `LOTE_YA_EXISTE` trae su propio mensaje con el nombre adentro;
      // se muestra tal cual en vez de traducirlo a «error al preparar».
      if (e instanceof ApiError && e.code === 'LOTE_YA_EXISTE') {
        setLoteEnConflicto(lote.trim());
        refrescarLotesAbiertos();
      }
      setError(mensaje(e, 'No pudimos preparar la carga.', 'preparar la carga'));
      setCargando(false);
      return;
    }
    // La carga YA existe en el back: pase lo que pase de acá en adelante, la
    // pantalla es la lista de trabajo. Meter el refresco en el mismo try
    // hacía que un fallo de red DESPUÉS de preparar dijera «no pudimos
    // preparar» — y el reintento chocara con un 409 inexplicable.
    setResumen(r);
    setLoteAbierto(lote.trim());
    setSeleccion(new Set());
    setAlcance(SOLO_IDS);
    try {
      await refrescar(lote.trim());
    } catch {
      setError(
        'La carga quedó preparada, pero no pudimos leer sus filas. Toca «Actualizar la lista».',
      );
    }
    setCargando(false);
  }, [lote, tipo, aMigrar, refrescar, refrescarLotesAbiertos]);

  /*
   * ── Retomar una carga ──────────────────────────────────────────────────────
   *
   * 🔴 Nico, 02-10-2026 (paso Inquilinos, 1.729 filas): «no está dejando
   * retomar un archivo que fue trabajado». «Retomar» no prendía nada —ni
   * `cargando`, ni el botón ocupado— y la pantalla no cambiaba hasta que
   * volvían el `revisar` y las tres lecturas. Con un lote grande eso tarda, la
   * persona vuelve a tocar, y cada toque era otro `POST revisar` reescribiendo
   * el lote entero en el back: siete colgados a la vez, y el centro de procesos
   * esperando detrás. Ahora:
   *  - un toque mientras se retoma no hace nada (`retomandoRef`, no el estado:
   *    dos clics en el mismo tick verían el estado viejo);
   *  - se ve QUÉ está pasando (`retomando.fase`) y, si tarda, se dice;
   *  - «Dejar de esperar» es la salida: suelta la espera (lo que el back
   *    alcance a poner al día queda guardado y no se repite) y la tarjeta vuelve
   *    con «Retomar» y «No la voy a seguir»;
   *  - la carga se abre (`loteAbierto`) sólo cuando llegó su lista: cortar o
   *    fallar no deja nada a medias.
   * NO se avisa al muro (`onOcupado`): no se está creando nada, y el muro
   * congela el paso entero mientras está ocupado — la salida quedaría tapada.
   */
  const [retomando, setRetomando] = useState<{
    lote: string;
    fase: FaseDeRetomar;
    /** Cuántas filas puso al día la revisión; `null` si todavía no vuelve o falló. */
    puestasAlDia: number | null;
  } | null>(null);
  const [retomarTarda, setRetomarTarda] = useState(false);
  const retomandoRef = useRef(false);
  /** Sube con cada intento y con «Dejar de esperar»: lo que vuelve tarde de un intento viejo se ignora. */
  const intentoDeRetomar = useRef(0);
  useEffect(
    () => () => {
      intentoDeRetomar.current += 1;
    },
    [],
  );
  // El reloj corre desde el toque, no desde cada fase.
  const loteQueSeRetoma = retomando?.lote ?? null;
  useEffect(() => {
    setRetomarTarda(false);
    if (!loteQueSeRetoma) return;
    const t = setTimeout(() => setRetomarTarda(true), MS_PARA_DECIR_QUE_RETOMAR_TARDA);
    return () => clearTimeout(t);
  }, [loteQueSeRetoma]);

  const retomar = useCallback(
    async (l: LoteDeTerceros) => {
      if (retomandoRef.current) return;
      retomandoRef.current = true;
      const intento = ++intentoDeRetomar.current;
      const vigente = () => intentoDeRetomar.current === intento;
      setError(null);
      setLoteEnConflicto(null);
      setAvisoMasivo(null);
      setRetomando({ lote: l.lote, fase: 'poniendo-al-dia', puestasAlDia: null });
      try {
        // Las reglas del back cambian; las filas guardadas no. Al abrir la
        // carga se le pide al back que la mire con las reglas de hoy (no hace
        // nada si ya está al día). Si falla, se lista igual.
        let puestasAlDia: number | null = null;
        try {
          puestasAlDia = (await migracionTercerosApi.revisar(l.lote)).revisadas;
        } catch {
          // Se lista igual.
        }
        if (!vigente()) return;
        setRetomando({ lote: l.lote, fase: 'leyendo', puestasAlDia });
        const lista = await leerLista(l.lote);
        if (!vigente()) return;
        setTipo(l.tipo);
        setLoteAbierto(l.lote);
        setSeleccion(new Set());
        setAlcance(SOLO_IDS);
        mostrarLista(lista);
      } catch (e) {
        if (vigente()) {
          setError(
            `${mensaje(e, 'No pudimos abrir esa carga.')} Reintenta con «Retomar»: lo que ya estaba en la carga sigue ahí.`,
          );
        }
      } finally {
        if (vigente()) {
          retomandoRef.current = false;
          setRetomando(null);
        }
      }
    },
    [leerLista, mostrarLista],
  );

  const dejarDeEsperar = useCallback(() => {
    intentoDeRetomar.current += 1;
    retomandoRef.current = false;
    setRetomando(null);
  }, []);

  const volverAEmpezar = useCallback(() => {
    setResumen(null);
    setLoteAbierto(null);
    setPendientes([]);
    setTotalPendientes(0);
    setAplicacion(null);
    setSeleccion(new Set());
    setAlcance(SOLO_IDS);
    setMotivos(null);
    setArchivo(null);
    setFilas([]);
    setEncabezados([]);
    setMapeo([]);
    setNombreDeArchivo('');
    setLote(nombreDeLoteSugerido(tipo));
    setError(null);
    setLoteEnConflicto(null);
    refrescarLotesAbiertos();
  }, [tipo, refrescarLotesAbiertos]);

  /**
   * Botar una carga sin terminar desde la propia lista, sin retomarla.
   *
   * 🔴 Nico (2026-09-08): «yo también debería poder eliminar esos de retomar
   * uno por uno, si es que no quiero que me siga apareciendo eso». Antes la
   * única salida era retomarla y resolver sus filas una por una; una carga
   * abandonada se quedaba ofreciéndose para siempre, igual que la de hace un
   * rato. Las filas ya aplicadas no se tocan — son el rastro de gente que
   * existe— y por eso el aviso dice cuántas quedaron.
   */
  const [lotePorDescartar, setLotePorDescartar] = useState<LoteDeTerceros | null>(null);
  const descartarLote = useCallback(
    async (l: LoteDeTerceros) => {
      setCargando(true);
      setError(null);
      try {
        const r = await migracionTercerosApi.descartarLote(l.lote);
        setAvisoMasivo(
          r.aplicadasIntactas > 0
            ? `Carga «${l.lote}» descartada: ${r.descartadas} ${r.descartadas === 1 ? 'fila salió' : 'filas salieron'} de la lista. Las ${r.aplicadasIntactas} que ya se habían creado quedan como están.`
            : `Carga «${l.lote}» descartada: ${r.descartadas} ${r.descartadas === 1 ? 'fila salió' : 'filas salieron'} de la lista. No se creó ni se borró ninguna ficha.`,
        );
        // Si la carga botada era la que estaba abierta, se sale de ella.
        if (loteAbierto === l.lote) volverAEmpezar();
        else refrescarLotesAbiertos();
      } catch (e) {
        setError(mensajeDeDescarte(e, 'No pudimos descartar esa carga.', 'descartar esa carga'));
      } finally {
        setCargando(false);
        setLotePorDescartar(null);
      }
    },
    [loteAbierto, refrescarLotesAbiertos, volverAEmpezar],
  );

  // ── Acciones sobre filas ──────────────────────────────────────────────────

  /** El aviso de cuando la acción SÍ pasó y lo que falló fue releer la lista. */
  const AVISO_DE_REFRESCO =
    'El cambio se guardó, pero no pudimos refrescar la lista. Toca «Actualizar la lista» para verla al día.';

  /**
   * Devuelve qué pasó, para que la fila que disparó la acción pueda mostrar
   * el error AL LADO del botón que se apretó — el cartel de arriba no se ve
   * desde la tarjeta 200 — y conservar lo tecleado.
   *
   * La acción y el refresco se atrapan POR SEPARADO: si la acción pasó y lo
   * que falló fue releer, decirle «no pudimos guardar» a algo que se guardó
   * es mentirle a la persona (y empujarla a repetir la acción).
   */
  const conRefresco = useCallback(
    async (
      accion: () => Promise<unknown>,
      respaldo: string,
      /** Con una acción sobre todo un filtro la página de antes puede ya no existir. */
      paginaAlTerminar?: number,
    ): Promise<ResultadoDeAccion> => {
      if (!loteAbierto) return { ok: false, mensaje: null };
      setCargando(true);
      setError(null);
      try {
        await accion();
      } catch (e) {
        /*
         * Sistema de errores (02-10-2026): un 400 con `campos` del back
         * (`CorregirFilaTerceroDto.campos.<campo>`) va a SU celda en la
         * tarjeta de la fila; al aviso va sólo lo que no tiene celda.
         */
        const reparto = repartirErroresDelServidor(e, {
          campos: columnas.map((c) => c.campo),
          porDefecto: respaldo,
        });
        const porCampo = reparto.porCampo as Record<string, string>;
        const conCampo = reparto.orden.length > 0;
        const m = conCampo
          ? reparto.sueltos.length > 0
            ? reparto.sueltos.join(' · ')
            : 'Revisa lo marcado en la fila.'
          : // «No pudimos guardar la corrección.» → un 5xx dice «No pudimos
            // guardar la corrección: algo falló de nuestro lado…».
            mensaje(e, respaldo, /^No pudimos (.+?)\.?$/.exec(respaldo)?.[1]);
        /*
         * 🔴 «Otra pestaña guardó primero» es el único fallo donde SÍ se
         * relee: lo que la persona tiene en pantalla ya no es lo que hay, y
         * pedirle que corrija a ciegas sobre un dato viejo es cómo se pisa
         * dos veces el mismo trabajo. El borrador tecleado NO se toca —
         * `FilaDeTercero` lo conserva cuando la acción devuelve `ok: false`—
         * así que puede releer, comparar y volver a guardar sin retipear.
         */
        if (e instanceof ApiError && e.code === CODIGO_FILA_DESACTUALIZADA) {
          try {
            await refrescar(loteAbierto, pagina);
          } catch {
            // El mensaje de arriba ya cuenta lo importante.
          }
        }
        setError(m);
        setCargando(false);
        return { ok: false, mensaje: m, porCampo };
      }
      try {
        await refrescar(loteAbierto, paginaAlTerminar ?? pagina);
      } catch {
        setError(AVISO_DE_REFRESCO);
      }
      setCargando(false);
      return { ok: true, mensaje: null };
    },
    [loteAbierto, pagina, refrescar, columnas],
  );

  /** Cambiar de página también puede fallar; que lo diga, no que se quede muda. */
  const cambiarPagina = useCallback(
    async (p: number) => {
      if (!loteAbierto) return;
      setCargando(true);
      setError(null);
      try {
        await refrescar(loteAbierto, p);
      } catch (e) {
        setError(mensaje(e, 'No pudimos traer esa página. Toca «Actualizar la lista».'));
      } finally {
        setCargando(false);
      }
    },
    [loteAbierto, refrescar],
  );

  /**
   * ¿Se les manda la invitación al portal a los inquilinos, ahora?
   *
   * 🔴 Nico, 2026-09-09: «debemos crear la posibilidad también, si es que dice
   * no a la hora de migrar, de enviar todos los correos de invitación de los
   * inquilinos en ese momento; que lo pueda hacer en otro momento».
   *
   * 🔴 Arranca en `false` (QA 22-09). Son correos a personas de verdad y una
   * invitación no se des-envía: tiene que ser una decisión, no lo que pasa
   * por no desmarcar una casilla. Las cuentas quedan pendientes y se mandan
   * desde Inquilinos cuando quiera — nadie se pierde.
   */
  const [invitarAlCrear, setInvitarAlCrear] = useState(false);

  const aplicar = useCallback(async () => {
    if (!loteAbierto) return;
    setCargando(true);
    setError(null);
    setProgreso(null);
    try {
      /*
       * Por tandas, no de un saque: crear 600 inquilinos son 600 invitaciones
       * por correo, y en UNA petición HTTP eso es un timeout de proxy con el
       * servidor todavía trabajando. El loop pide de a poco y muestra avance
       * real en vez de una rueda girando cinco minutos.
       */
      const informe = await aplicarLoteDeTerceros(
        loteAbierto,
        // Sólo pesa para inquilinos; en propietarios el back lo ignora.
        (l) => migracionTercerosApi.aplicar(l, { invitar: invitarAlCrear }),
        setProgreso,
      );
      setAplicacion(informe);
      // El aviso de la última decisión («…se crea con el botón de arriba»)
      // ya se cumplió: dejarlo después de crear dice lo contrario de lo que
      // pasó (QA-MIG-A, MG-20).
      setAvisoMasivo(null);
      await refrescar(loteAbierto, 1);
    } catch (e) {
      /*
       * Nada de lo creado se deshace si la conexión se corta a mitad:
       * reintentar retoma donde quedó, sin duplicar (las filas aplicadas ya
       * no están LISTO). Decirlo —y decir CUÁNTAS alcanzaron— es lo que evita
       * que la persona abandone creyendo que se rompió todo, o que vuelva a
       * subir el archivo «por las dudas».
       */
      const hechas = e instanceof AplicacionInterrumpida ? e.parcial.aplicadas : 0;
      // La causa de verdad (el `ApiError`) viaja en `causa`: el traductor la
      // lee entera — con su referencia si fue un 5xx — en vez del texto copiado.
      const causa = e instanceof AplicacionInterrumpida ? e.causa : e;
      setError(
        `${mensaje(causa, 'No pudimos crear las fichas.', 'crear las fichas')} ` +
          (hechas > 0
            ? `Alcanzaron a crearse ${hechas}: quedaron creadas. `
            : 'Lo que alcanzó a crearse quedó creado. ') +
          'Reintenta con el mismo botón y la carga sigue donde quedó, sin duplicar a nadie.',
      );
      // Mejor esfuerzo: que los contadores muestren lo que el back SÍ hizo.
      try {
        await refrescar(loteAbierto, 1);
      } catch {
        // El error de arriba ya cuenta la historia.
      }
    } finally {
      setCargando(false);
      setProgreso(null);
    }
  }, [loteAbierto, refrescar, invitarAlCrear]);

  // ══ Lista de trabajo ══════════════════════════════════════════════════════

  if (resumen && loteAbierto) {
    return (
      <ListaDeTrabajo
        lote={loteAbierto}
        tipo={tipo}
        enElMuro={Boolean(tipoFijo)}
        resumen={resumen}
        progreso={progreso}
        columnas={columnas}
        pendientes={pendientes}
        totalPendientes={totalPendientes}
        pagina={pagina}
        seleccion={seleccion}
        alcance={alcance}
        motivos={motivos}
        progresoMasivo={progresoMasivo}
        aplicacion={aplicacion}
        cargando={cargando}
        error={error}
        avisoMasivo={avisoMasivo}
        onSeleccionCambia={(s) => {
          // Marcar filas sueltas devuelve la selección al camino de siempre.
          setAlcance(SOLO_IDS);
          setSeleccion(s);
        }}
        onAlcanceCambia={(a) => {
          setSeleccion(new Set());
          setAlcance(a);
        }}
        onPaginaCambia={(p) => void cambiarPagina(p)}
        onActualizar={() => void cambiarPagina(pagina)}
        onCorregir={(id, campos, version) =>
          conRefresco(
            () => migracionTercerosApi.corregir(id, { campos, version }),
            'No pudimos guardar la corrección.',
          )
        }
        onVincular={(id, version) =>
          conRefresco(
            () => migracionTercerosApi.corregir(id, { vincularAExistente: true, version }),
            'No pudimos vincular la fila.',
          )
        }
        onCrearIncompleta={async (id, version) => {
          const r = await conRefresco(
            () => migracionTercerosApi.corregir(id, { crearIncompleta: true, version }),
            'No pudimos dejar la fila lista para crear con datos por completar.',
          );
          if (r.ok) {
            setAvisoMasivo(
              'La fila quedó lista para crearse con datos por completar: se crea con el botón de arriba y el documento se completa después, desde Propietarios o Inquilinos.',
            );
          }
          return r;
        }}
        onDescartar={(id) =>
          conRefresco(
            async () => {
              try {
                return await migracionTercerosApi.descartar(id);
              } catch (e) {
                throw e instanceof ApiError && e.status === 403
                  ? new Error(SOLO_EL_ADMINISTRADOR_DESCARTA)
                  : e;
              }
            },
            'No pudimos descartar la fila.',
          )
        }
        onMasivo={(cambios) =>
          void conRefresco(
            async () => {
              /*
               * T-0128 · dos caminos. Con filas marcadas una por una, el de
               * siempre (`PATCH filas` en tandas de 200 ids). Con «todas» o con
               * un motivo, `PATCH filas/masivo`: el back recorre el lote entero
               * por cursor y acá se dan vueltas hasta que no quede nada —sin
               * esto, «seleccionar las 2.895» eran catorce clics por página.
               */
              if (alcance.tipo === 'ids') {
                const r = await migracionTercerosApi.resolverMasivo(
                  Array.from(seleccion),
                  cambios,
                );
                if (r.fallidas.length > 0) {
                  /*
                   * Las que NO se pudieron quedan SELECCIONADAS: son exactamente
                   * el conjunto a reintentar, y volver a marcarlas a mano entre
                   * doscientas casillas es perder el trabajo de la selección.
                   * Una masiva que dice «listo» tapando lo que no pudo es la
                   * mentira que este diseño evita — y un solo motivo tapando los
                   * otros cuatro, la mitad de esa mentira.
                   */
                  setSeleccion(new Set(r.fallidas.map((f) => f.id)));
                  setError(resumenDeFallidas(r));
                } else {
                  setSeleccion(new Set());
                  setAvisoMasivo(avisoDeMasivo(cambios, r.aplicadas));
                }
                return;
              }

              if (!loteAbierto) return;
              const cantidad = cantidadDelAlcance(alcance, seleccion.size, totalPendientes, motivos);
              setProgresoMasivo({ procesadas: 0, total: cantidad });
              try {
                const r = await migracionTercerosApi.resolverPorFiltro(
                  loteAbierto,
                  filtroDelAlcance(alcance),
                  cambios,
                  setProgresoMasivo,
                );
                if (r.interrumpida) {
                  // Lo ya aplicado quedó aplicado: repetir la acción sigue donde quedó.
                  setError(
                    `Se cortó a mitad: ${r.interrumpida.motivo} Alcanzaron a procesarse ${r.procesadas.toLocaleString('es-CO')} de ${r.totalAlEmpezar.toLocaleString('es-CO')}; lo hecho quedó hecho. Repite la acción y sigue con lo que falta.`,
                  );
                } else if (r.fallidas.length > 0) {
                  setAlcance(SOLO_IDS);
                  setSeleccion(new Set(r.fallidas.map((f) => f.id)));
                  setError(
                    resumenDeFallidas({
                      pedidas: r.procesadas,
                      aplicadas: r.aplicadas,
                      fallidas: r.fallidas,
                    }),
                  );
                } else {
                  setAlcance(SOLO_IDS);
                  setSeleccion(new Set());
                  setAvisoMasivo(avisoDeMasivo(cambios, r.procesadas, r.listasAhora));
                }
              } finally {
                setProgresoMasivo(null);
              }
            },
            'No pudimos aplicar el cambio a las filas seleccionadas.',
            alcance.tipo === 'ids' ? undefined : 1,
          )
        }
        onAplicar={() => void aplicar()}
        invitarAlCrear={invitarAlCrear}
        onCambiarInvitar={setInvitarAlCrear}
        onOtroArchivo={() => {
          volverAEmpezar();
          // Pidió subir otro: la subida abre aunque ya haya personas cargadas.
          setSubiendoOtro(true);
        }}
      />
    );
  }

  // ══ Entrada: elegir tipo, retomar, subir ══════════════════════════════════

  const demasiadasFilas = filas.length > MAX_FILAS_POR_LOTE;
  const puedePreparar =
    filas.length > 0 &&
    !demasiadasFilas &&
    lote.trim().length > 0 &&
    !cargando &&
    // Mientras se abre una carga, no se prepara otra: la que vuelva tarde
    // pisaría a la recién subida.
    retomando === null;

  // Con el tipo fijo, las cargas sin terminar del OTRO tipo son de otro paso.
  const lotesVisibles = tipoFijo ? lotesAbiertos.filter((l) => l.tipo === tipoFijo) : lotesAbiertos;

  // El 409 con salida: la carga que chocó está ahí para retomarla en un clic.
  const cargaEnConflicto = loteEnConflicto
    ? lotesVisibles.find((l) => l.lote === loteEnConflicto) ?? null
    : null;

  /*
   * ¿La subida va abierta? Fuera del muro, siempre (la pantalla suelta es
   * sólo para subir). Adentro, cuando todavía no hay nadie cargado, cuando la
   * lista no se pudo leer (no saber quién está no puede frenar una carga),
   * cuando la persona pidió subir otro, o cuando ya hay algo en curso que vive
   * en esta tarjeta — un archivo leído o un error que contar.
   */
  const hayCargados = !loCargado.cargando && !loCargado.fallo && loCargado.total > 0;
  const subidaAbierta =
    !tipoFijo ||
    subiendoOtro ||
    archivo !== null ||
    error !== null ||
    (!loCargado.cargando && !hayCargados);
  const cancelarSubida = () => {
    soltarArchivo();
    setSubiendoOtro(false);
  };

  return (
    <div className="space-y-5">
      {fallaronLosLotes ? (
        <section
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-warning-soft p-4"
          data-testid="lotes-no-verificados"
        >
          <div className="flex items-start gap-2">
            <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p className="text-sm text-fg">
              No pudimos verificar si tienes una carga sin terminar. Puedes seguir igual — pero si
              dejaste una a medias, reintenta primero: volver a subir el mismo archivo duplica a
              las personas.
            </p>
          </div>
          <Button size="sm" variant="outline" hideArrow onClick={refrescarLotesAbiertos}>
            Reintentar
          </Button>
        </section>
      ) : null}

      {lotesVisibles.length > 0 ? (
        /*
         * Cabecera + filas con filete = UNA tarjeta (glow-up 30-09): antes era
         * un bloque con las cargas sueltas una debajo de otra y la advertencia
         * colgando al final.
         */
        <section
          className="overflow-hidden rounded-lg border border-border-faint bg-surface shadow-sm"
          data-testid="lotes-abiertos"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-6 pb-3 pt-4">
            <h2 className="text-sm font-medium text-fg">
              {lotesVisibles.length === 1 ? 'Tienes una carga sin terminar' : 'Tienes cargas sin terminar'}
            </h2>
            <p className="text-caption text-fg-subtle">
              Volver a subir el mismo archivo con otro nombre duplica a las personas.
            </p>
          </div>
          {/* Las cargas entran escalonadas y la que se descarta SALE
              (ARREGLOS-8, MOV-A6). */}
          <Stagger
            as="ul"
            layout={false}
            distance="xs"
            className="divide-y divide-border-faint border-t border-border-faint"
          >
            {lotesVisibles.map((l) => (
              <StaggerItem as="li" key={l.lote} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-fg" title={l.lote}>
                    {l.lote}
                  </p>
                  {/* 🔴 Cuándo se tocó por última vez. Sin esto, una carga
                      abandonada hace seis días se ofrece igual que la de hace un
                      rato, y retomarla parece «seguir con lo mío»: Nico
                      (2026-09-08) terminó revisando 170 filas de dos cargas del 2
                      de septiembre cuyas personas ya había creado después. */}
                  <p className="mt-0.5 text-caption text-fg-muted">
                    {l.tipo === 'PROPIETARIO' ? 'Propietarios' : 'Inquilinos'}
                    {' · '}
                    <span className="font-mono tabular-nums">{l.requierenAtencion}</span>{' '}
                    {l.requierenAtencion === 1 ? 'fila por revisar' : 'filas por revisar'}
                    {l.listos > 0 ? (
                      <>
                        {' · '}
                        <span className="font-mono tabular-nums">{l.listos}</span> listas para crear
                      </>
                    ) : null}
                    {' · '}última actividad: {fechaDeLote(l.actualizado)}
                  </p>
                  {/* En qué va «Retomar»: entra y sale con su animación. */}
                  <Presence show={retomando?.lote === l.lote}>
                    {retomando?.lote === l.lote ? (
                      <AvanceDeRetomar
                        lote={l.lote}
                        fase={retomando.fase}
                        filas={filasVivas(l)}
                        puestasAlDia={retomando.puestasAlDia}
                        tarda={retomarTarda}
                      />
                    ) : null}
                  </Presence>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    hideArrow
                    disabled={cargando || (retomando !== null && retomando.lote !== l.lote)}
                    isLoading={retomando?.lote === l.lote}
                    onClick={() => void retomar(l)}
                    data-testid={`retomar-lote-${l.lote}`}
                  >
                    {retomando?.lote === l.lote ? 'Retomando…' : 'Retomar'}
                  </Button>
                  {retomando?.lote === l.lote ? (
                    /* La salida mientras se espera: soltar la espera. El back
                       termina lo que empezó; nada se pierde ni se duplica. */
                    <Button
                      size="sm"
                      variant="ghost"
                      hideArrow
                      onClick={dejarDeEsperar}
                      data-testid={`dejar-de-esperar-${l.lote}`}
                    >
                      Dejar de esperar
                    </Button>
                  ) : (
                    /* La segunda salida, que no existía: botarla. Sin esto una
                       carga a medias se quedaba ofreciéndose para siempre. */
                    <Button
                      size="sm"
                      variant="ghost"
                      hideArrow
                      disabled={cargando || retomando !== null}
                      onClick={() => setLotePorDescartar(l)}
                      data-testid={`descartar-lote-${l.lote}`}
                    >
                      <Trash className="h-4 w-4" />
                      No la voy a seguir
                    </Button>
                  )}
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      ) : null}

      {/* Botar una carga es terminal: se confirma diciendo qué se lleva y qué
          NO. Lo que ya se creó no se toca, y eso es justo lo que alguien
          necesita saber antes de apretar. */}
      <AlertDialog
        open={lotePorDescartar !== null}
        onOpenChange={(abierto) => {
          if (!abierto) setLotePorDescartar(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {lotePorDescartar ? `¿Botar la carga «${lotePorDescartar.lote}»?` : 'Botar la carga'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {lotePorDescartar ? (
                <>
                  Salen de la lista{' '}
                  <strong className="font-medium text-fg">
                    {lotePorDescartar.borradores +
                      lotePorDescartar.requierenAtencion +
                      lotePorDescartar.listos}
                  </strong>{' '}
                  filas que todavía no se crearon.
                  {lotePorDescartar.aplicados > 0 ? (
                    <>
                      {' '}
                      Las{' '}
                      <strong className="font-medium text-fg">{lotePorDescartar.aplicados}</strong>{' '}
                      que ya se crearon NO se tocan: siguen en tu inmobiliaria.
                    </>
                  ) : (
                    ' No se creó nada de esta carga, así que no se borra ninguna ficha.'
                  )}{' '}
                  Puedes volver a subir el archivo cuando quieras.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirmar-descartar-lote"
              onClick={() => {
                const l = lotePorDescartar;
                if (l) void descartarLote(l);
              }}
            >
              Sí, botarla
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/*
        🔴 Subir, entender las columnas y ponerle nombre a la carga son UNA
        tarea, así que viven en UNA tarjeta con filetes entre fases (glow-up
        30-09). Antes eran tres bloques sueltos y «quedaban como separadas».
      */}
      {subidaAbierta ? (
      <section
        ref={subidaRef}
        className="scroll-mt-4 rounded-lg border border-border-faint bg-surface shadow-sm"
        data-testid="subida-de-terceros"
      >
        <div className="space-y-4 p-6">
        {tipoFijo ? (
          <div
            className="flex flex-wrap items-start justify-between gap-3"
            data-testid="tipo-fijo"
            data-tipo={tipoFijo}
          >
            <div className="min-w-0 space-y-1">
              <h2 className="text-sm font-medium text-fg">
                {hayCargados
                  ? tipoFijo === 'PROPIETARIO'
                    ? 'Otro archivo de propietarios'
                    : 'Otro archivo de inquilinos'
                  : tipoFijo === 'PROPIETARIO'
                    ? 'El archivo de propietarios'
                    : 'El archivo de inquilinos'}
              </h2>
              {/* Acá se habla del ARCHIVO. Qué hace falta del propietario ya lo
                  dice la columna del paso: decirlo dos veces, casi igual, era
                  una de las cosas que Nico señaló en la captura. */}
              <p className="max-w-prose text-sm text-fg-muted">
                {hayCargados
                  ? tipoFijo === 'PROPIETARIO'
                    ? 'Para sumar los propietarios que no venían en el primero. Lo que falte se completa acá, fila por fila, sin volver a subir el archivo.'
                    : 'Para sumar los inquilinos que no venían en el primero. Lo que falte se completa acá, fila por fila, sin volver a subir el archivo.'
                  : tipoFijo === 'PROPIETARIO'
                    ? 'Una fila por propietario, tal como la exporta tu sistema actual. Lo que falte se completa acá, fila por fila, sin volver a subir el archivo.'
                    : 'Una fila por inquilino, tal como la exporta tu sistema actual. Lo que falte se completa acá, fila por fila, sin volver a subir el archivo.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Abierta a pedido, se cierra igual: la tabla de abajo es lo
                  que ya está, y arrepentirse no puede exigir recargar. */}
              {hayCargados && !cargando ? (
                <Button
                  size="sm"
                  variant="ghost"
                  hideArrow
                  onClick={cancelarSubida}
                  data-testid="cancelar-subida"
                >
                  Cancelar
                </Button>
              ) : null}
              <BotonDePlantilla
                deshabilitado={!plantilla}
                onDescargar={() =>
                  plantilla &&
                  void descargarPlantillaDeTerceros(tipo, columnas).catch(() =>
                    setError('No pudimos generar la plantilla para descargar. Reintenta.'),
                  )
                }
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h2 className="text-sm font-medium text-fg">¿Qué estás cargando?</h2>
              <p className="max-w-prose text-sm text-fg-muted">
                Van en archivos separados: a un propietario hay que poder pagarle (banco y cuenta) y
                a un inquilino hay que poder invitarlo (correo). No son las mismas columnas.
              </p>
            </div>
            <BotonDePlantilla
              deshabilitado={!plantilla}
              onDescargar={() =>
                plantilla &&
                void descargarPlantillaDeTerceros(tipo, columnas).catch(() =>
                  setError('No pudimos generar la plantilla para descargar. Reintenta.'),
                )
              }
            />
          </div>
        )}

        {tipoFijo ? null : (
        <SegmentedControl<TipoDeTercero>
          value={tipo}
          onChange={setTipo}
          aria-label="Tipo de tercero"
          options={[
            {
              value: 'PROPIETARIO',
              label: (
                <span className="flex items-center gap-2">
                  <UserCircle className="h-4 w-4" />
                  Propietarios
                </span>
              ),
              ariaLabel: 'Propietarios',
            },
            {
              value: 'INQUILINO',
              label: (
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Inquilinos
                </span>
              ),
              ariaLabel: 'Inquilinos',
            },
          ]}
        />
        )}

        {noSoportadas.length > 0 ? (
          <div className="flex items-start gap-2 rounded-md bg-danger-soft p-3">
            <Warning className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            <div>
              <p className="text-sm font-medium text-danger">
                Hay columnas nuevas que esta pantalla todavía no sabe mandar
              </p>
              <p className="mt-0.5 text-sm text-fg-muted">
                {noSoportadas.map((c) => c.titulo).join(' · ')} — se van a ignorar. Avísale al
                equipo antes de seguir para no perder ese dato.
              </p>
            </div>
          </div>
        ) : null}

        {/* Sin plantilla no hay mapeo ni descarga: si su lectura falló, esta
            pantalla está muerta — el reintento tiene que estar ACÁ, no en
            recargar la página entera y perder dónde se estaba parado. */}
        {errorDePlantilla ? (
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-danger-soft p-3"
            data-testid="error-de-plantilla"
          >
            <div className="flex items-start gap-2">
              <Warning className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              <p className="text-sm text-fg">{errorDePlantilla}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              hideArrow
              onClick={() => setIntentoDePlantilla((n) => n + 1)}
            >
              Reintentar
            </Button>
          </div>
        ) : null}

        {archivo ? (
          <TarjetaDeArchivo
            nombre={archivo.name}
            peso={archivo.size}
            detalle={
              leyendo
                ? 'leyendo\u2026'
                : filas.length > 0
                  ? `${filas.length.toLocaleString('es-CO')} ${filas.length === 1 ? 'fila' : 'filas'}`
                  : undefined
            }
            inputProps={getInputProps()}
            onSubirOtro={open}
            onDescartar={soltarArchivo}
            ocupado={leyendo || cargando}
            testid="archivo-de-terceros"
          />
        ) : (
          <ZonaDeArchivo
            rootProps={getRootProps()}
            inputProps={getInputProps()}
            activo={isDragActive}
            testid="dropzone-terceros"
            /* Deshabilitado sin decir por qué = un dropzone que «no anda».
               La espera y el fallo de la plantilla se dicen acá mismo. */
            titulo={
              plantilla
                ? 'Arrastra el archivo o haz clic para elegirlo'
                : errorDePlantilla
                  ? 'No se puede subir todavía — reintenta arriba la lectura de columnas.'
                  : 'Preparando la pantalla: leyendo las columnas esperadas…'
            }
            detalle="Excel o CSV exportado de tu sistema actual. Nada se crea todavía."
          />
        )}

        {error ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-danger-soft p-3">
            <div className="flex items-start gap-2">
              <Warning className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              <p className="text-sm text-fg">{error}</p>
            </div>
            {/* El 409 de «ya existe» con su salida al lado: si la carga que
                chocó está abierta, retomarla es UN clic — el caso típico es la
                red que se cortó DESPUÉS de que el back preparó. */}
            {cargaEnConflicto ? (
              <Button
                size="sm"
                hideArrow
                disabled={cargando || retomando !== null}
                isLoading={retomando?.lote === cargaEnConflicto.lote}
                data-testid="retomar-conflicto"
                onClick={() => void retomar(cargaEnConflicto)}
              >
                {retomando?.lote === cargaEnConflicto.lote ? 'Retomando…' : 'Retomar esa carga'}
              </Button>
            ) : null}
          </div>
        ) : null}
        </div>

      {mapeo.length > 0 ? (
        <div className="space-y-4 border-t border-border-faint p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-sm font-medium text-fg">Así entendimos tus columnas</h2>
              <p className="text-caption text-fg-muted">
                <span className="font-mono tabular-nums">{filas.length}</span> filas en el
                archivo. Revisa el mapeo antes de seguir: lo que se mapea mal no falla, se guarda
                en el campo de al lado.
              </p>
              {dondeSeLeyo ? (
                <p className="text-caption text-fg-muted" data-testid="donde-se-leyo">
                  {dondeSeLeyo}
                </p>
              ) : null}
            </div>
            <Button
              variant="link"
              size="sm"
              hideArrow
              className="shrink-0 text-caption"
              onClick={() => setMapeo(mapearColumnas(columnas, encabezados))}
            >
              Restablecer
            </Button>
          </div>

          {/* El mapeo como lo que es: tu columna → nuestro campo, pareja por
              pareja. La tabla de tres columnas con «POR QUÉ: —» leía como un
              admin crudo (Nico, 30-09: «haz algo hermoso»); el porqué ahora
              vive debajo del campo, con su color: verde el empate exacto,
              ámbar el parecido (el que se equivoca), gris lo elegido a mano. */}
          <div className="overflow-hidden rounded-md border border-border-faint">
            <div className="hidden items-center justify-between gap-4 border-b border-border-faint bg-surface-muted/60 px-4 py-2.5 sm:flex">
              <span className="text-label text-fg-subtle">Columna del archivo</span>
              <span className="w-[280px] text-label text-fg-subtle">Campo del tercero</span>
            </div>
            <ul className="divide-y divide-border-faint">
              {mapeo.map((m) => {
                const valor =
                  m.campo ?? (m.parte ? valorDeParte(m.parte) : m.aNotas ? VALOR_A_NOTAS : IGNORAR);
                const ignorada = valor === IGNORAR;
                return (
                  <li
                    key={m.columna}
                    className="grid grid-cols-1 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,max-content)_minmax(2.5rem,1fr)_280px] sm:items-start"
                  >
                    {/* La columna, el conector y el campo comparten la altura
                        del select (h-11) para quedar en el mismo renglón; el
                        porqué cuelga debajo del campo. */}
                    <span className="flex min-h-11 items-center">
                      <span
                        className={cn(
                          'rounded-md px-2.5 py-1.5 font-mono text-caption leading-snug [overflow-wrap:anywhere]',
                          ignorada ? 'bg-surface-muted/60 text-fg-subtle line-through decoration-border' : 'bg-surface-muted text-fg',
                        )}
                      >
                        {m.columna || '(sin nombre)'}
                      </span>
                    </span>
                    <span aria-hidden className="hidden h-11 items-center px-3 sm:flex">
                      <span
                        className={cn(
                          'h-px flex-1 border-t border-dashed',
                          ignorada ? 'border-border-faint' : 'border-border',
                        )}
                      />
                      <ArrowRight
                        weight="bold"
                        className={cn('-ml-0.5 h-3.5 w-3.5 shrink-0', ignorada ? 'text-border' : 'text-fg-subtle')}
                      />
                    </span>
                    <div className="space-y-1">
                      <Select
                        value={valor}
                        onValueChange={(v) =>
                          setMapeo((actual) =>
                            remapear(actual, m.columna, v === IGNORAR ? null : v),
                          )
                        }
                      >
                        <SelectTrigger
                          className="w-full whitespace-nowrap [&>span]:truncate"
                          data-testid={`mapeo-${m.columna}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={IGNORAR}>Ignorar</SelectItem>
                          {columnas.map((c) => (
                            <SelectItem key={c.campo} value={c.campo}>
                              {c.titulo}
                            </SelectItem>
                          ))}
                          {/* El nombre partido como lo traen los sistemas
                              viejos: se pega en «Nombre completo». */}
                          {columnas.some((c) => c.campo === 'nombre')
                            ? PARTES_DEL_NOMBRE.map((p) => (
                                <SelectItem key={p} value={valorDeParte(p)}>
                                  Nombre completo · {ETIQUETA_DE_PARTE[p]}
                                </SelectItem>
                              ))
                            : null}
                          {/* Lo que no tiene campo pero no se tira («Otro
                              Teléfono»): se pega a las notas de la ficha. */}
                          {columnas.some((c) => c.campo === 'notas') ? (
                            <SelectItem value={VALOR_A_NOTAS}>Notas · agregar esta columna</SelectItem>
                          ) : null}
                        </SelectContent>
                      </Select>
                      {/* Tres estados distintos, y decirlos importa: el empate
                          por parecido es el que se equivoca. */}
                      {m.isManual ? (
                        <p className="text-caption text-fg-subtle">Elegido a mano.</p>
                      ) : m.aNotas ? (
                        <p className="text-caption text-fg-subtle">Se guarda en las notas de la ficha.</p>
                      ) : m.porque && m.exacto ? (
                        <p className="text-caption text-success">Coincide con «{m.porque}».</p>
                      ) : m.porque ? (
                        <p className="text-caption text-warning">Se parece a «{m.porque}» — revísalo.</p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {faltanObligatorias.length > 0 ? (
            <div className="flex items-start gap-2 rounded-md bg-info-soft p-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
              <div>
                <p className="text-sm font-medium text-info">
                  {faltanObligatorias.length === 1
                    ? 'Falta una columna obligatoria'
                    : `Faltan ${faltanObligatorias.length} columnas obligatorias`}
                </p>
                <p className="mt-0.5 text-sm text-fg-muted">
                  {faltanObligatorias.map((c) => c.titulo).join(' · ')} — igual puedes seguir: las
                  filas van a quedar marcadas y se completan acá mismo, sin volver a subir nada.
                </p>
              </div>
            </div>
          ) : null}

          {columnasDelNombrePorPartes(mapeo).length > 0 ? (
            <div
              className="flex items-start gap-2 rounded-md bg-info-soft p-3"
              data-testid="nombre-por-partes"
            >
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
              <div>
                <p className="text-sm font-medium text-info">El nombre completo se arma con varias columnas</p>
                <p className="mt-0.5 text-sm text-fg-muted">
                  {columnasDelNombrePorPartes(mapeo)
                    .map((c) => `«${c}»`)
                    .join(' + ')}
                  , nombres primero y apellidos después
                  {mapeo.some((m) => m.campo === 'nombre')
                    ? `, sólo en las filas que no traen «${mapeo.find((m) => m.campo === 'nombre')?.columna}»`
                    : ''}
                  .
                </p>
              </div>
            </div>
          ) : null}

          {demasiadasFilas ? (
            <p className="text-sm text-danger">
              El archivo tiene{' '}
              <span className="font-mono tabular-nums">{filas.length.toLocaleString('es-CO')}</span>{' '}
              filas y el máximo por carga es{' '}
              <span className="font-mono tabular-nums">
                {MAX_FILAS_POR_LOTE.toLocaleString('es-CO')}
              </span>
              . Pártelo en dos archivos.
            </p>
          ) : null}

          {/* El cierre de la fase: nombre y botón en el mismo renglón, con su
              filete — es la salida de la tarjeta, no un bloque más. */}
          <div className="border-t border-border-faint pt-5">
            <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
              <label className="block w-full max-w-sm space-y-1.5">
                <span className="block text-caption font-semibold text-fg">Nombre de esta carga</span>
                <Input
                  value={lote}
                  maxLength={60}
                  onChange={(e) => setLote(e.target.value)}
                  data-testid="nombre-del-lote"
                />
              </label>

              {/* No dice «importar»: todavía no se crea nada. */}
              <Button
                hideArrow
                disabled={!puedePreparar}
                isLoading={cargando}
                onClick={() => void preparar()}
                data-testid="revisar-terceros"
              >
                Revisar {filas.length} {tipo === 'PROPIETARIO' ? 'propietarios' : 'inquilinos'}
              </Button>
            </div>
            <p className="mt-1.5 text-caption text-fg-subtle">
              Sirve para volver a encontrarla si la dejas a medias. No se puede repetir.
            </p>
          </div>
        </div>
      ) : null}
      </section>
      ) : null}

      {tipoFijo ? (
        <TercerosYaCargados
          tipo={tipoFijo}
          onEstado={setLoCargado}
          subiendoOtro={subidaAbierta}
          onSubirOtro={() => setSubiendoOtro(true)}
        />
      ) : null}
    </div>
  );
}

/** El botón de la plantilla, igual en las dos cabeceras (con y sin switch). */
function BotonDePlantilla({
  deshabilitado,
  onDescargar,
}: {
  deshabilitado: boolean;
  onDescargar: () => void;
}) {
  return (
    <Button variant="outline" size="sm" hideArrow disabled={deshabilitado} onClick={onDescargar}>
      <DownloadSimple className="mr-1.5 h-4 w-4" />
      Descargar la plantilla
    </Button>
  );
}

// ══ La lista de trabajo ═════════════════════════════════════════════════════

/**
 * En vez de un reporte de lo que falló, una lista de lo que falta con la
 * salida al lado. Nada se perdió y nada se creó todavía.
 */
function ListaDeTrabajo({
  lote,
  tipo,
  enElMuro,
  resumen,
  progreso,
  columnas,
  pendientes,
  totalPendientes,
  pagina,
  seleccion,
  alcance,
  motivos,
  progresoMasivo,
  aplicacion,
  cargando,
  error,
  avisoMasivo = null,
  onSeleccionCambia,
  onAlcanceCambia,
  onPaginaCambia,
  onActualizar,
  onCorregir,
  onVincular,
  onDescartar,
  onCrearIncompleta,
  onMasivo,
  onAplicar,
  invitarAlCrear,
  onCambiarInvitar,
  onOtroArchivo,
}: {
  lote: string;
  tipo: TipoDeTercero;
  /** Adentro del asistente hay un pie con el botón de seguir; suelto, no. */
  enElMuro: boolean;
  resumen: ResumenDeLote;
  /** Avance de la creación por tandas mientras corre. */
  progreso: ProgresoDeAplicacion | null;
  columnas: readonly import('@/lib/api/migracion-terceros.service').ColumnaDePlantilla[];
  pendientes: FilaDeStaging[];
  totalPendientes: number;
  pagina: number;
  seleccion: Set<string>;
  /** T-0128 · a quién le aplica la acción masiva: filas marcadas, o todo un filtro. */
  alcance: Alcance;
  motivos: MotivosDelLote | null;
  /** Avance de una acción masiva por filtro, mientras corre. */
  progresoMasivo: ProgresoDeMasivo | null;
  aplicacion: ResumenDeAplicacion | null;
  cargando: boolean;
  error: string | null;
  avisoMasivo?: string | null;
  onSeleccionCambia: (s: Set<string>) => void;
  onAlcanceCambia: (a: Alcance) => void;
  onPaginaCambia: (p: number) => void;
  /** Reintenta la lectura de la página actual — la salida de un refresco caído. */
  onActualizar: () => void;
  /**
   * `version` es la que traía la fila cuando se pintó: el back la usa para
   * rechazar la corrección si otra pestaña guardó primero.
   */
  onCorregir: (
    id: string,
    campos: FilaTercero,
    version: number | undefined,
  ) => Promise<ResultadoDeAccion>;
  onVincular: (id: string, version: number | undefined) => Promise<ResultadoDeAccion>;
  onDescartar: (id: string) => Promise<ResultadoDeAccion>;
  /** T-0128 · crear la ficha con los datos del documento en blanco. */
  onCrearIncompleta: (id: string, version: number | undefined) => Promise<ResultadoDeAccion>;
  onMasivo: (cambios: CambiosMasivos) => void;
  onAplicar: () => void;
  /** Sólo pesa con `tipo === 'INQUILINO'`. */
  invitarAlCrear: boolean;
  onCambiarInvitar: (valor: boolean) => void;
  onOtroArchivo: () => void;
}) {
  // Descartar exige `configuracion:delete` (sólo ADMIN): sin el permiso la acción no se ofrece.
  const permisos = usePermissionsContextSafe();
  const puedeDescartar = permisos === null || permisos.canAccess('configuracion', 'delete');
  const porFiltro = alcance.tipo !== 'ids';
  const todasMarcadas = pendientes.length > 0 && pendientes.every((f) => seleccion.has(f.id));
  const cantidad = cantidadDelAlcance(alcance, seleccion.size, totalPendientes, motivos);
  const losMotivos = motivosConFilas(motivos);
  /** Una acción masiva por filtro corriendo: se bloquea elegir otra cosa. */
  const hayBandaDeSeleccion = seleccion.size > 0 || porFiltro;

  const cosas = tipo === 'PROPIETARIO' ? 'propietarios' : 'inquilinos';

  return (
    <div className="space-y-5" data-testid="lista-de-trabajo">
      <section className="space-y-4 rounded-lg border border-border-faint bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="min-w-0 truncate text-sm text-fg-muted" title={lote}>
            Carga <span className="text-fg">{lote}</span> · {cosas}
          </p>
          <Button variant="ghost" size="sm" hideArrow onClick={onOtroArchivo}>
            Subir otro archivo
          </Button>
        </div>

        {/*
         * El resumen es una FRASE, no cuatro fichas sueltas (el molde de la
         * casa). Los números van en mono y el color acompaña al estado, pero
         * la oración se lee de corrido: qué trajo el archivo y en qué va.
         */}
        <p className="max-w-prose text-body text-fg" data-testid="resumen-del-lote">
          El archivo trae{' '}
          <span className="font-mono tabular-nums">{resumen.total}</span>{' '}
          {resumen.total === 1 ? 'fila' : 'filas'}:{' '}
          <span className={resumen.listos > 0 ? 'text-success' : undefined}>
            <span className="font-mono tabular-nums">{resumen.listos}</span>{' '}
            {resumen.listos === 1 ? 'lista' : 'listas'} para crear
          </span>
          {', '}
          <span className={resumen.requierenAtencion > 0 ? 'text-warning' : undefined}>
            a <span className="font-mono tabular-nums">{resumen.requierenAtencion}</span>{' '}
            {resumen.requierenAtencion === 1 ? 'le' : 'les'} falta algo
          </span>{' '}
          y <span className="font-mono tabular-nums">{resumen.aplicados}</span> ya se{' '}
          {resumen.aplicados === 1 ? 'creó' : 'crearon'}.
        </p>

        {resumen.listos > 0 ? (
          <>
            {/*
              * 🔴 La decisión de mandar 600 correos no puede ser un efecto
              * secundario de apretar «Crear» (Nico, 2026-09-09). Va ANTES del
              * botón porque después no sirve de nada: una invitación no se
              * des-envía.
              *
              * Sólo para inquilinos: un propietario no recibe invitación por
              * esta vía, y ofrecer la casilla ahí prometería algo que no pasa.
              */}
            {tipo === 'INQUILINO' ? (
              <label
                className="flex cursor-pointer items-start gap-3 rounded-md bg-surface-muted p-3"
                data-testid="invitar-al-crear"
              >
                <Checkbox
                  className="mt-0.5"
                  checked={invitarAlCrear}
                  disabled={cargando}
                  onCheckedChange={(c) => onCambiarInvitar(c === true)}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-fg">
                    Mandarles la invitación al portal ahora
                  </span>
                  <span className="block text-caption text-fg-muted">
                    {invitarAlCrear
                      ? 'A cada inquilino con correo le llega el enlace para poner su contraseña. Sale por tandas, no todo de golpe.'
                      : 'Las cuentas se crean igual, sin mandar nada. Las invitaciones quedan pendientes en Inquilinos y las mandas cuando quieras.'}
                  </span>
                </span>
              </label>
            ) : null}

            <Button hideArrow disabled={cargando} isLoading={cargando} onClick={onAplicar}>
              Crear {resumen.listos}{' '}
              {tipo === 'PROPIETARIO'
                ? resumen.listos === 1
                  ? 'propietario'
                  : 'propietarios'
                : resumen.listos === 1
                  ? 'inquilino'
                  : 'inquilinos'}
            </Button>

            {/*
             * El avance real mientras corre. Una rueda girando cinco minutos
             * sin un número es indistinguible de algo colgado: es cuando la
             * gente recarga la página a mitad de una creación.
             */}
            {progreso ? (
              <p className="text-sm text-fg" data-testid="progreso-de-aplicacion" aria-live="polite">
                Creando…{' '}
                <span className="font-mono tabular-nums">{progreso.aplicadas}</span> creadas
                {progreso.restantes > 0 ? (
                  <>
                    {', '}
                    <span className="font-mono tabular-nums">{progreso.restantes}</span> por crear
                  </>
                ) : null}
                . No cierres esta pestaña.
              </p>
            ) : null}

            <p className="text-caption text-fg-subtle">
              Se crean sólo las que no les falta nada. Las demás quedan acá esperando.
            </p>
          </>
        ) : null}

        {resumen.listos === 0 && resumen.requierenAtencion > 0 ? (
          <p className="text-sm text-fg-muted">
            Todavía no hay ninguna lista. Resuelve lo de abajo y van pasando solas.
          </p>
        ) : null}

        {avisoMasivo && !error ? (
          <p className="flex items-center gap-2 text-sm text-fg" data-testid="aviso-masivo">
            <CheckCircle className="h-4 w-4 shrink-0 text-success" weight="fill" />
            {avisoMasivo}
          </p>
        ) : null}

        {error ? (
          <div className="flex flex-wrap items-center gap-3" data-testid="error-de-lista">
            <p className="text-sm text-danger" role="alert">{error}</p>
            {/* Releer es un GET: siempre es seguro ofrecerlo. Es la salida
                tanto del refresco caído como de la página que no llegó. */}
            <Button size="sm" variant="outline" hideArrow disabled={cargando} onClick={onActualizar}>
              Actualizar la lista
            </Button>
          </div>
        ) : null}
      </section>

      {aplicacion ? (
        <section
          className="space-y-2 rounded-lg border border-border-faint bg-surface p-6 shadow-sm"
          data-testid="informe-aplicacion"
        >
          <p className="flex items-center gap-2 text-sm font-medium text-fg">
            <CheckCircle className="h-4 w-4 text-success" weight="fill" />
            <span className="font-mono tabular-nums">{aplicacion.aplicadas}</span> creadas
            {aplicacion.invitados > 0 ? (
              <>
                {' · '}
                <span className="font-mono tabular-nums">{aplicacion.invitados}</span> invitados al
                portal
              </>
            ) : null}
            {(aplicacion.sinInvitar ?? 0) > 0 ? (
              <>
                {' · '}
                <span className="font-mono tabular-nums">{aplicacion.sinInvitar}</span> sin
                invitación todavía
              </>
            ) : null}
            {(aplicacion.sinCorreo ?? 0) > 0 ? (
              <>
                {' · '}
                <span className="font-mono tabular-nums">{aplicacion.sinCorreo}</span> sin
                correo
              </>
            ) : null}
          </p>
          {(aplicacion.incompletas ?? 0) > 0 ? (
            /*
             * T-0128 · las que se crearon SIN su documento. No es un fallo ni
             * una advertencia: es el trabajo que queda, y se dice dónde se hace.
             */
            <p className="text-sm text-fg-muted" data-testid="incompletas">
              {aplicacion.incompletas === 1
                ? 'Una ficha se creó con datos por completar (le falta el documento o su tipo).'
                : `${aplicacion.incompletas} fichas se crearon con datos por completar (les falta el documento o su tipo).`}{' '}
              Las completas desde{' '}
              <Link
                href={
                  tipo === 'PROPIETARIO'
                    ? '/panel/inmobiliaria/propietarios'
                    : '/panel/inmobiliaria/inquilinos'
                }
                className="text-primary underline underline-offset-2"
              >
                {tipo === 'PROPIETARIO' ? 'Propietarios' : 'Inquilinos'}
              </Link>
              : cada una trae la marca «Datos por completar».
            </p>
          ) : null}
          {(aplicacion.sinCorreo ?? 0) > 0 ? (
            <p className="text-sm text-fg-muted" data-testid="sin-correo">
              {aplicacion.sinCorreo === 1
                ? 'Un inquilino venía sin correo: quedó creado con su documento, sin cuenta del portal. La cuenta nace cuando le cargues el correo desde su ficha.'
                : `${aplicacion.sinCorreo} inquilinos venían sin correo: quedaron creados con su documento, sin cuenta del portal. La cuenta nace cuando les cargues el correo desde su ficha.`}
            </p>
          ) : null}
          {(aplicacion.sinInvitar ?? 0) > 0 ? (
            /*
             * 🔴 Dos cosas MUY distintas llegan con el mismo número, y decirlas
             * igual manda a alguien a buscar un problema que no existe:
             *
             *   · destildó la casilla  → es su decisión, salió como pidió;
             *   · la casilla iba puesta → el envío falló y hay algo que mirar.
             *
             * En los dos casos la salida es la misma pantalla, así que se
             * nombra dónde está.
             */
            <p className="text-sm text-fg-muted" data-testid="sin-invitar">
              {invitarAlCrear
                ? 'El correo no pudo salir para todas: esas cuentas quedaron creadas y la invitación se manda después. No hace falta volver a subir nada. '
                : `${aplicacion.sinInvitar === 1 ? 'Esa cuenta quedó creada' : 'Esas cuentas quedaron creadas'} sin mandar ningún correo, como pediste. `}
              Las tienes en{' '}
              <Link
                href="/panel/inmobiliaria/inquilinos"
                className="text-primary underline underline-offset-2"
              >
                Inquilinos
              </Link>
              , para mandarlas cuando quieras.
            </p>
          ) : null}
          {/* El puente que faltaba: sin esta línea, «25 creadas» arriba y 85
              tarjetas abajo parecen contradecirse (Nico no entendió qué eran). */}
          {totalPendientes > 0 ? (
            <p className="text-sm text-fg-muted" data-testid="puente-por-revisar">
              {totalPendientes === 1 ? (
                <>Queda 1 fila del archivo sin crear: está acá abajo esperando tu decisión.</>
              ) : (
                <>
                  Quedan <span className="font-mono tabular-nums">{totalPendientes}</span> filas
                  del archivo sin crear: están acá abajo esperando tu decisión.
                </>
              )}
            </p>
          ) : null}
          {aplicacion.resultados.some((r) => r.estado === 'omitido' && !esLaMismaPersonaYaCargada(r.motivo)) ? (
            /* Otra pestaña o un reintento ya la había creado: ni fallo ni aviso. */
            <p className="text-sm text-fg-muted" data-testid="omitidas">
              {aplicacion.resultados.filter((r) => r.estado === 'omitido' && !esLaMismaPersonaYaCargada(r.motivo)).length} ya las había creado
              otra pestaña o un reintento: no se repitieron.
            </p>
          ) : null}
          {/* MG-28 (MIG-C, 04-10): «es la misma persona» que ya estaba cargada
              sin correo en otra carga: no se creó otra vez, y se dice por qué. */}
          {aplicacion.resultados.some((r) => r.estado === 'omitido' && esLaMismaPersonaYaCargada(r.motivo)) ? (
            <ul className="space-y-1 text-sm text-fg-muted" data-testid="ya-estaban-cargadas">
              {aplicacion.resultados
                .filter((r) => r.estado === 'omitido' && esLaMismaPersonaYaCargada(r.motivo))
                .map((r) => (
                  <li key={r.id}>{`Fila ${r.fila}: ${r.motivo}`}</li>
                ))}
            </ul>
          ) : null}
          {aplicacion.fallidas > 0 ? (
            <ul className="space-y-2 text-sm text-fg-muted" data-testid="fallidas-de-aplicacion">
              {aplicacion.resultados
                .filter((r) => r.estado === 'fallido')
                .map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {r.pasaARevisar ? (
                      /* Ya está abajo, en «por decidir», con su motivo. */
                      <span data-testid="paso-a-revisar">
                        La fila <span className="font-mono tabular-nums">{r.fila}</span> pasó a «por
                        decidir»: corrige el dato que se señala y vuelve a crear. {r.motivo}
                      </span>
                    ) : (
                      <>
                        <span>
                          Fila <span className="font-mono tabular-nums">{r.fila}</span>: {r.motivo}{' '}
                          Puedes reintentar con el botón de arriba.
                        </span>
                        {/*
                         * Nunca dejar a la persona sin una acción tras un fallo:
                         * la fila sigue lista para crear, así que se puede
                         * reintentar o, si no, no traerla.
                         */}
                        <Button
                          size="sm"
                          variant="outline"
                          hideArrow
                          disabled={cargando}
                          onClick={onAplicar}
                          data-testid="reintentar-fallida"
                        >
                          Reintentar
                        </Button>
                        {puedeDescartar ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            hideArrow
                            disabled={cargando}
                            className="text-danger hover:bg-danger-soft hover:text-danger"
                            onClick={() => void onDescartar(r.id)}
                            data-testid="descartar-fallida"
                          >
                            No traer esta fila
                          </Button>
                        ) : null}
                      </>
                    )}
                  </li>
                ))}
            </ul>
          ) : null}
          {/* Se aplicaron, pero con algo que mirar: la cuenta ya tenía otro
              documento. No es un fallo — la persona quedó vinculada — pero
              dos documentos para un mismo correo no se callan. */}
          {aplicacion.resultados.some((r) => r.advertencia) ? (
            <ul className="space-y-1 text-sm text-warning" data-testid="advertencias-aplicacion">
              {aplicacion.resultados
                .filter((r) => r.advertencia)
                .map((r) => (
                  <li key={r.id}>
                    Fila <span className="font-mono tabular-nums">{r.fila}</span>: {r.advertencia}
                  </li>
                ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {/*
       * El título que le dice a la persona QUÉ es esta lista. Sin él, después
       * de crear las primeras fichas quedaban 85 tarjetas sueltas debajo del
       * «25 creadas» y nadie sabía si eran un error, un pendiente o un
       * repetido (Nico lo vio). El conteo baja en vivo a medida que resuelve.
       */}
      {/*
       * Cabecera + selección + filas + paginación = UNA tarjeta (glow-up
       * 30-09). Antes el título flotaba como texto suelto, cada fila era su
       * propia tarjetita con la casilla colgando afuera, y el pie de página
       * quedaba huérfano entre dos bloques.
       */}
      {totalPendientes > 0 ? (
        <section className="overflow-hidden rounded-lg border border-border-faint bg-surface shadow-sm">
          <div className="space-y-3 p-6 pb-4" data-testid="titulo-por-revisar">
            <div className="space-y-1">
              <h2 className="text-sm font-medium text-fg">
                {totalPendientes === 1
                  ? 'Queda 1 fila del archivo por decidir'
                  : `Quedan ${totalPendientes} filas del archivo por decidir`}
              </h2>
              <p className="max-w-prose text-sm text-fg-muted">
                {tipo === 'INQUILINO'
                  ? 'No se crearon todavía: son personas que ya existen en la plataforma —quizá las subiste en Propietarios o ya tenían cuenta— o filas a las que les falta un dato. '
                  : 'No se crearon todavía: son personas que ya existen en la plataforma, filas repetidas en el archivo, o a las que les falta un dato. '}
                Resuelve cada una acá, o marca varias y resuélvelas juntas: al decidir salen de esta
                lista y quedan listas para crear con el botón de arriba.
              </p>
            </div>
            {/* 🔴 Acá había «Son las mismas personas: vincular todas las que ya
                existen», que recorría el lote entero y las enganchaba de un
                clic. Tenía sentido cuando «ya existe» se marcaba SIEMPRE que la
                llave estuviera ocupada: casi todas eran la misma persona y
                preguntarlo ochenta y cinco veces era hacerle un bucle a mano.

                Desde el 2026-09-08 el back ya no pregunta cuando la identidad
                está corroborada —mismo documento, o mismo nombre—: esas filas
                entran solas. Las que SIGUEN marcadas son exactamente las que
                parecen de OTRA persona (un correo que pertenece a otra cuenta,
                un documento que cae sobre la ficha de otro dueño). Vincularlas
                todas de un clic es justo el daño que este chequeo existe para
                evitar, así que el botón se retira: se deciden de a una, o se
                marcan las que uno mire y se resuelven con la barra de selección. */}
            {pendientes.length > 0 ? (
              <div className="space-y-3">
                {/*
                 * `aria-labelledby` y no un `<label>` alrededor: el `Checkbox` de
                 * cadence es el de Radix, que renderiza un `<button role="checkbox">`.
                 * Un `<button>` no es un elemento etiquetable, así que ni envolverlo
                 * en un `<label>` ni un `htmlFor` le dan nombre — un lector de
                 * pantalla anunciaría «casilla, sin marcar» y nada más.
                 */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-fg">
                  <span className="flex items-center gap-2">
                    <Checkbox
                      aria-labelledby="seleccionar-pagina"
                      checked={porFiltro ? true : todasMarcadas}
                      disabled={porFiltro}
                      onCheckedChange={(c) => {
                        // Sólo agrega o quita las de ESTA página: reemplazar toda la
                        // selección borraría lo elegido en las otras.
                        const s = new Set(seleccion);
                        if (c === true) pendientes.forEach((f) => s.add(f.id));
                        else pendientes.forEach((f) => s.delete(f.id));
                        onSeleccionCambia(s);
                      }}
                    />
                    <span id="seleccionar-pagina">
                      Seleccionar las {pendientes.length} de esta página
                    </span>
                  </span>
                  {/*
                   * T-0128 · «seleccionar todos los registros, no sólo los 25
                   * de la página» (dueño del producto). Sólo aparece cuando hay
                   * más de las que se ven.
                   */}
                  {totalPendientes > pendientes.length ? (
                    <Button
                      size="sm"
                      variant={alcance.tipo === 'todas' ? 'default' : 'outline'}
                      hideArrow
                      disabled={cargando}
                      aria-pressed={alcance.tipo === 'todas'}
                      onClick={() => onAlcanceCambia({ tipo: 'todas' })}
                      data-testid="seleccionar-todas"
                    >
                      Seleccionar las {totalPendientes.toLocaleString('es-CO')} de la carga
                    </Button>
                  ) : null}
                </div>

                {losMotivos.length > 1 || (losMotivos.length === 1 && totalPendientes > pendientes.length) ? (
                  <div className="space-y-1.5" data-testid="seleccionar-por-motivo">
                    <p className="text-caption text-fg-muted">O elige todas las que tienen el mismo problema</p>
                    <div className="flex flex-wrap gap-2">
                      {losMotivos.map((m) => {
                        const activo = alcance.tipo === 'motivo' && alcance.codigo === m.codigo;
                        return (
                          <Button
                            key={m.codigo}
                            size="sm"
                            variant={activo ? 'default' : 'outline'}
                            hideArrow
                            disabled={cargando}
                            aria-pressed={activo}
                            onClick={() => onAlcanceCambia({ tipo: 'motivo', codigo: m.codigo })}
                            data-testid={`seleccionar-motivo-${m.codigo}`}
                          >
                            {fraseDelMotivo(m.codigo, m.filas)}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {hayBandaDeSeleccion ? (
            <ResolucionMasiva
              cantidad={cantidad}
              alcance={alcance}
              motivos={motivos}
              progreso={progresoMasivo}
              tipo={tipo}
              puedeDescartar={puedeDescartar}
              columnas={columnas}
              cargando={cargando}
              onAplicar={onMasivo}
              onLimpiar={() => onSeleccionCambia(new Set())}
            />
          ) : null}

          {pendientes.length > 0 ? (
            /* Las filas entran escalonadas y la que se decide SALE (ARREGLOS-8,
               MOV-A6). Cada página es una lista nueva; sin `layout`: una fila
               se abre para corregirla y medirlas todas la deformaría. */
            <Stagger
              as="ul"
              key={pagina}
              layout={false}
              distance="xs"
              className="divide-y divide-border-faint border-t border-border-faint"
            >
              {pendientes.map((fila) => (
                <StaggerItem as="li" key={fila.id} className="flex items-start gap-3 px-6 py-5">
                  {/* Sin texto al lado, así que el nombre va en `aria-label` — y no
                      dice «seleccionar fila» a secas: con doscientas casillas
                      idénticas, eso no le sirve a nadie que navegue por teclado. */}
                  <Checkbox
                    className="mt-0.5"
                    aria-label={`Seleccionar la fila ${fila.datos._fila}${
                      typeof fila.datos.nombre === 'string' && fila.datos.nombre
                        ? `, ${fila.datos.nombre}`
                        : ''
                    }`}
                    checked={porFiltro ? incluidaPorElAlcance(fila, alcance) : seleccion.has(fila.id)}
                    disabled={porFiltro}
                    onCheckedChange={(c) => {
                      const s = new Set(seleccion);
                      if (c === true) s.add(fila.id);
                      else s.delete(fila.id);
                      onSeleccionCambia(s);
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <FilaDeTercero
                      fila={fila}
                      columnas={columnas}
                      guardando={cargando}
                      tipo={tipo}
                      onCorregir={(campos) => onCorregir(fila.id, campos, fila.version)}
                      onVincular={() => onVincular(fila.id, fila.version)}
                      onDescartar={() => onDescartar(fila.id)}
                      onCrearIncompleta={() => onCrearIncompleta(fila.id, fila.version)}
                    />
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          ) : null}

          {/* Pie del design system: dice cuántas filas quedan por decidir y en
              cuál página vas, no sólo «‹ 2 ›». Las páginas las sirve el back
              (`filas(lote, { pagina, porPagina })`), así que el tamaño de página
              no se ofrece: sin `pageSizeOptions` el selector no se monta y no
              queda un control que no hace nada. */}
          <div className="border-t border-border-faint px-6 py-3">
            <TablePagination
              total={totalPendientes}
              page={pagina}
              pageSize={POR_PAGINA}
              onPageChange={onPaginaCambia}
            />
          </div>
        </section>
      ) : null}

      {pendientes.length === 0 && resumen.requierenAtencion === 0 ? (
        <p className="rounded-lg border border-border-faint bg-surface p-6 text-sm text-fg-muted shadow-sm">
          No queda nada por revisar en esta carga.
          {/* El empujón al paso siguiente sólo adentro del asistente: la
              pantalla suelta no tiene ese pie. */}
          {resumen.listos > 0
            ? ' Ya puedes crear las que quedaron listas con el botón de arriba.'
            : enElMuro
              ? ' Puedes seguir con el paso siguiente desde el botón de abajo.'
              : ''}
        </p>
      ) : null}
    </div>
  );
}

/**
 * ¿Esta fila de la página está dentro del alcance de una selección por filtro?
 * Sólo sirve para pintar la casilla: la acción la resuelve el back sobre TODO
 * el lote, no sobre lo que se ve.
 */
function incluidaPorElAlcance(fila: FilaDeStaging, alcance: Alcance): boolean {
  if (alcance.tipo === 'todas') return true;
  if (alcance.tipo === 'motivo') {
    return (fila.errores ?? []).some((e) => e.codigo === alcance.codigo);
  }
  return false;
}

/**
 * La misma corrección a muchas filas.
 *
 * Un archivo real trae doscientas —o dos mil— filas a las que les falta lo
 * mismo: el mismo tipo de documento vacío, la misma ciudad, el mismo banco mal
 * escrito. Resolverlas de a una son miles de veces el mismo dato.
 *
 * T-0128 (dueño del producto): «que me deje poner valores en masa por defecto y
 * después si los quieren cambiar que lo hagan», y «no quiero descartar
 * registros, prefiero que queden incompletos». Por eso hay tres cosas y en este
 * orden de importancia:
 *
 *   1. **Poner un valor por defecto** a cualquier campo —menos los que
 *      identifican a la persona—. Llena sólo lo vacío, salvo que se pida pisar.
 *   2. **Crear con datos por completar**: la ficha nace ya, el documento se
 *      completa después.
 *   3. Las salidas que sacan filas de la lista (vincular, no traer): discretas.
 */
function ResolucionMasiva({
  cantidad,
  alcance,
  motivos,
  progreso,
  tipo,
  puedeDescartar,
  columnas,
  cargando,
  onAplicar,
  onLimpiar,
}: {
  cantidad: number;
  alcance: Alcance;
  motivos: MotivosDelLote | null;
  progreso: ProgresoDeMasivo | null;
  tipo: TipoDeTercero;
  /** `false` = sin `configuracion:delete`: el back respondería 403, así que no se ofrece. */
  puedeDescartar: boolean;
  columnas: readonly import('@/lib/api/migracion-terceros.service').ColumnaDePlantilla[];
  cargando: boolean;
  onAplicar: (cambios: CambiosMasivos) => void;
  onLimpiar: () => void;
}) {
  /** Qué botón de abajo se apretó, para que gire ése y no todos. */
  const [enVuelo, setEnVuelo] = useState<
    'valor' | 'vincular' | 'descartar' | 'incompleta' | null
  >(null);
  const [campo, setCampo] = useState<string>('');
  const [valor, setValor] = useState('');
  const [sobrescribir, setSobrescribir] = useState(false);
  const [confirmaDescarte, setConfirmaDescarte] = useState(false);

  const porFiltro = alcance.tipo !== 'ids';
  const seccionDeLaFicha = tipo === 'PROPIETARIO' ? 'Propietarios' : 'Inquilinos';

  /** Los que identifican a la persona no se ofrecen: el back responde 400 si llegan. */
  const camposPosibles = useMemo(
    () => columnas.filter((c) => !CAMPOS_NO_MASIVOS.includes(c.campo)),
    [columnas],
  );
  const columna = camposPosibles.find((c) => c.campo === campo);

  /**
   * Cuántas de las del alcance quedarían listas al crearlas incompletas: el back
   * lo cuenta (`completables`). Con filas marcadas una por una no se sabe de
   * antemano — el back decide fila por fila — y entonces es `null`.
   */
  const completables =
    alcance.tipo === 'todas'
      ? (motivos?.completables ?? null)
      : alcance.tipo === 'motivo'
        ? motivos?.porMotivo.find((m) => m.codigo === alcance.codigo)?.completable
          ? cantidad
          : 0
        : null;

  const filas = cantidad === 1 ? 'fila' : 'filas';
  const aLas = cantidad === 1 ? 'a la fila' : `a las ${cantidad.toLocaleString('es-CO')}`;

  return (
    /*
     * Banda de selección DENTRO de la tarjeta de la lista, con el tinte
     * cobalto de «seleccionado»: antes era otra tarjeta suelta entre el
     * título y las filas.
     */
    <section
      className="space-y-4 border-t border-border-faint bg-primary-soft px-6 py-4"
      data-testid="resolucion-masiva"
    >
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-fg">
          <span className="font-mono tabular-nums">{cantidad.toLocaleString('es-CO')}</span>{' '}
          {cantidad === 1 ? 'fila seleccionada' : 'filas seleccionadas'}
          {porFiltro ? ' en toda la carga' : ''}
        </p>
        {alcance.tipo === 'motivo' ? (
          <p className="text-caption text-fg-muted" data-testid="alcance-motivo">
            {fraseDelMotivo(alcance.codigo, cantidad)}.
          </p>
        ) : null}
        {porFiltro ? (
          <p className="text-caption text-fg-muted" data-testid="alcance-aviso">
            Lo que hagas acá se aplica a todas, también a las que no ves en esta página.
          </p>
        ) : null}
      </div>

      {/* ── 1. El valor por defecto ───────────────────────────────────────── */}
      <div className="space-y-2" data-testid="valor-por-defecto">
        <h3 className="text-sm font-medium text-fg">Poner un valor por defecto</h3>
        {/*
         * `div` + `aria-labelledby`, no un `<label>` envolviendo el control: el
         * `SelectTrigger` de Radix es un `<button>`, y un `<button>` no es
         * etiquetable — el `<label>` no le presta su texto como nombre
         * accesible y un lector de pantalla anuncia «botón» a secas.
         */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <span id="masivo-campo-etiqueta" className="block text-caption text-fg-muted">
              Campo
            </span>
            <Select
              value={campo || IGNORAR}
              onValueChange={(v) => {
                setCampo(v === IGNORAR ? '' : v);
                setValor('');
              }}
            >
              <SelectTrigger
                className="w-56"
                aria-labelledby="masivo-campo-etiqueta"
                data-testid="masivo-campo"
              >
                <SelectValue placeholder="Elige un campo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={IGNORAR}>Elige un campo</SelectItem>
                {camposPosibles.map((c) => (
                  <SelectItem key={c.campo} value={c.campo}>
                    {c.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {columna ? (
            <div className="space-y-1">
              <span id="masivo-valor-etiqueta" className="block text-caption text-fg-muted">
                Valor
              </span>
              {columna.opciones ? (
                <Select value={valor} onValueChange={setValor}>
                  <SelectTrigger
                    className="w-56"
                    aria-labelledby="masivo-valor-etiqueta"
                    data-testid="masivo-valor"
                  >
                    <SelectValue placeholder="Elige" />
                  </SelectTrigger>
                  <SelectContent>
                    {columna.opciones.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="w-56"
                  value={valor}
                  placeholder={placeholderDeEjemplo(columna.ejemplo)}
                  aria-labelledby="masivo-valor-etiqueta"
                  data-testid="masivo-valor"
                  onChange={(e) => setValor(e.target.value)}
                />
              )}
            </div>
          ) : null}

          <Button
            size="sm"
            hideArrow
            disabled={!campo || !valor || cargando}
            isLoading={cargando && enVuelo === 'valor'}
            onClick={() => {
              setEnVuelo('valor');
              onAplicar({ campos: { [campo]: valor } as FilaTercero, sobrescribir });
              setCampo('');
              setValor('');
              setSobrescribir(false);
            }}
            data-testid="masivo-aplicar-valor"
          >
            {sobrescribir ? 'Reemplazar en' : 'Aplicar a'} {cantidad === 1 ? 'la fila' : `las ${cantidad.toLocaleString('es-CO')}`}
          </Button>
        </div>

        {/* El valor por defecto es eso: un valor para lo que está vacío. Pisar lo
            que la persona ya tiene es otra decisión y se pide aparte. */}
        <p className="max-w-prose text-caption text-fg-muted">
          Sólo se llena donde ese campo está vacío; lo que ya trae valor no se toca. Después puedes
          cambiarlo fila por fila.
        </p>
        {campo ? (
          <label className="flex cursor-pointer items-start gap-2 text-sm text-fg">
            <Checkbox
              className="mt-0.5"
              checked={sobrescribir}
              disabled={cargando}
              onCheckedChange={(c) => setSobrescribir(c === true)}
              data-testid="masivo-sobrescribir"
            />
            <span>
              También reemplazar los que ya tienen valor
              {sobrescribir ? (
                <span className="block text-caption text-warning">
                  Ojo: el valor que ya traían {aLas} se pierde.
                </span>
              ) : null}
            </span>
          </label>
        ) : null}
      </div>

      {/* ── 2. Crear incompletas ──────────────────────────────────────────── */}
      <div className="space-y-2 border-t border-primary/15 pt-3" data-testid="masivo-incompletas">
        <h3 className="text-sm font-medium text-fg">Crear con datos por completar</h3>
        <p className="max-w-prose text-sm text-fg-muted">
          Se crea la ficha ahora, con el documento en blanco, y queda marcada como «Datos por
          completar». Tu inmobiliaria la completa después desde {seccionDeLaFicha}. No se pierde a
          nadie.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            hideArrow
            disabled={cargando || completables === 0}
            isLoading={cargando && enVuelo === 'incompleta'}
            onClick={() => {
              setEnVuelo('incompleta');
              onAplicar({ crearIncompleta: true });
            }}
            data-testid="masivo-crear-incompletas"
          >
            Crear con datos por completar
          </Button>
          <span className="text-caption text-fg-muted" data-testid="masivo-incompletas-alcance">
            {completables === null
              ? `Sólo cambia las ${filas} a las que únicamente les falta el documento o su tipo; las demás siguen acá.`
              : completables === 0
                ? 'Ninguna de éstas se puede crear así: tienen otro problema que hay que resolver.'
                : completables === cantidad
                  ? `Alcanza a ${completables === 1 ? 'la fila' : `las ${completables.toLocaleString('es-CO')}`}.`
                  : `Alcanza a ${completables.toLocaleString('es-CO')} de ${cantidad.toLocaleString('es-CO')}: las que sólo les falta el documento o su tipo. Las demás siguen acá.`}
          </span>
        </div>
      </div>

      {/* ── Avance de una acción por filtro ───────────────────────────────── */}
      {progreso && cargando ? (
        <div className="space-y-1.5" data-testid="masivo-avance" aria-live="polite">
          <div
            role="progressbar"
            aria-label="Avance de la acción"
            aria-valuemin={0}
            aria-valuemax={progreso.total}
            aria-valuenow={Math.min(progreso.procesadas, progreso.total)}
            className="h-2 overflow-hidden rounded-full bg-surface"
          >
            <div
              className="h-full bg-primary transition-[width]"
              style={{
                width: `${
                  progreso.total > 0
                    ? Math.min(100, Math.round((progreso.procesadas / progreso.total) * 100))
                    : 0
                }%`,
              }}
            />
          </div>
          <p className="text-caption text-fg">
            Procesadas{' '}
            <span className="font-mono tabular-nums">
              {progreso.procesadas.toLocaleString('es-CO')}
            </span>{' '}
            de{' '}
            <span className="font-mono tabular-nums">{progreso.total.toLocaleString('es-CO')}</span>.
            No cierres esta pestaña: si se corta, lo hecho queda hecho y repites la acción.
          </p>
        </div>
      ) : null}

      {/* ── 3. Las salidas que sacan filas de la lista ────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 border-t border-primary/15 pt-3">
        {/*
         * Nico, con 25 filas marcadas: «no mostró carga de nada y luego
         * apareció el botón de la nada». La masiva tardaba unos segundos y
         * los botones sólo se apagaban: nada decía que algo estaba pasando.
         * El que se apretó gira, y una línea dice qué se está haciendo.
         *
         * «Son las mismas personas» sólo con filas marcadas a mano: vincular
         * por filtro enganchar miles de fichas de un clic es justo el daño que
         * la verificación de identidad existe para evitar.
         */}
        {porFiltro ? null : (
          <Button
            size="sm"
            variant="outline"
            hideArrow
            disabled={cargando}
            isLoading={cargando && enVuelo === 'vincular'}
            onClick={() => {
              setEnVuelo('vincular');
              onAplicar({ vincularAExistente: true });
            }}
            data-testid="masivo-vincular"
          >
            Son las mismas personas que ya existen
          </Button>
        )}
        {/* La salida discreta: descartar nunca es el camino por defecto. */}
        {puedeDescartar ? (
        <Button
          size="sm"
          variant="ghost"
          hideArrow
          disabled={cargando}
          isLoading={cargando && enVuelo === 'descartar'}
          className="text-danger hover:bg-danger-soft hover:text-danger"
          onClick={() => {
            // Descartar miles de filas que no se ven pide confirmación.
            if (porFiltro) {
              setConfirmaDescarte(true);
              return;
            }
            setEnVuelo('descartar');
            onAplicar({ descartar: true });
          }}
          data-testid="masivo-descartar"
        >
          No traer {cantidad === 1 ? 'esta fila' : 'ninguna de estas'}
        </Button>
        ) : (
          <span className="text-caption text-fg-subtle" data-testid="masivo-sin-permiso-descartar">
            Solo un administrador puede descartar filas.
          </span>
        )}
        {cargando && enVuelo === 'vincular' ? (
          <p className="basis-full text-caption text-fg-muted" data-testid="masivo-progreso">
            {`Vinculando ${cantidad} ${filas} con las personas que ya existen… al terminar salen de esta lista y quedan listas para crear.`}
          </p>
        ) : null}
        {cargando && enVuelo === 'descartar' ? (
          <p className="basis-full text-caption text-fg-muted" data-testid="masivo-progreso">
            {`Descartando ${cantidad.toLocaleString('es-CO')} ${filas}…`}
          </p>
        ) : null}
        <span className="flex-1" />
        <Button size="sm" variant="link" hideArrow className="text-caption" onClick={onLimpiar}>
          Quitar la selección
        </Button>
      </div>

      <AlertDialog open={confirmaDescarte} onOpenChange={setConfirmaDescarte}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {`¿No traer ${cantidad.toLocaleString('es-CO')} ${filas}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Salen de la carga y no se crea ninguna ficha con ellas; queda el rastro de que se
              descartaron. Si lo que les falta es el documento, mejor «Crear con datos por
              completar»: así no se pierde a nadie.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              data-testid="masivo-confirmar-descartar"
              onClick={() => {
                setConfirmaDescarte(false);
                setEnVuelo('descartar');
                onAplicar({ descartar: true });
              }}
            >
              Sí, no traerlas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
