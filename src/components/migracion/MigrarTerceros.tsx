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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  CheckCircle,
  DownloadSimple,
  FileArrowUp,
  Info,
  UserCircle,
  Users,
  Warning,
} from '@phosphor-icons/react';
import { SegmentedControl } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
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
import { ApiError } from '@/lib/api/client';
import { parseSpreadsheetFile } from '@/components/inmobiliaria/import/lib/parseFile';
import {
  migracionTercerosApi,
  CODIGO_FILA_DESACTUALIZADA,
  celdasDemasiadoLargas,
  MAX_FILAS_POR_LOTE,
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
  columnasNoSoportadas,
  mapearColumnas,
  nombreDeLoteSugerido,
  obligatoriasSinMapear,
  remapear,
  type MapeoDeColumna,
} from '@/lib/migracion/columnas-de-tercero';
import { descargarPlantillaDeTerceros } from '@/lib/migracion/plantilla-de-terceros';
import {
  aplicarLoteDeTerceros,
  AplicacionInterrumpida,
  type ProgresoDeAplicacion,
} from '@/lib/migracion/aplicar-lote-de-terceros';
import { FilaDeTercero, type ResultadoDeAccion } from './FilaDeTercero';

/** Sentinel de Radix: un `<Select>` no admite `value=""`. */
const IGNORAR = '__ignorar__';

/**
 * Cuántas filas por página en la lista de trabajo.
 *
 * Con 400 pendientes, pintarlas todas son 400 tarjetas con sus propios
 * controles: la pestaña se arrastra y nadie llega a la última.
 */
const POR_PAGINA = 25;

type Fila = Record<string, unknown>;

const mensaje = (e: unknown, respaldo: string) =>
  e instanceof Error && e.message ? e.message : respaldo;

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
  onOcupado?: (ocupado: boolean) => void;
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
   * `useMemo` y no `plantilla?.columnas ?? []` suelto: ese `[]` es un array
   * nuevo en cada render, así que TODO lo que depende de `columnas` se
   * recalcula siempre — incluido `celdasDemasiadoLargas` sobre las 5.000 filas
   * del archivo, en cada tecla del nombre del lote.
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

  const leerArchivo = useCallback(
    async (archivo: File) => {
      setError(null);
      setAplicacion(null);
      try {
        const { rows, headers } = await parseSpreadsheetFile(archivo);
        setFilas(rows as Fila[]);
        setEncabezados(headers);
        setMapeo(mapearColumnas(columnas, headers));
        setNombreDeArchivo(archivo.name);
      } catch (e) {
        setError(mensaje(e, 'No pudimos leer el archivo.'));
        setFilas([]);
        setEncabezados([]);
        setMapeo([]);
      }
    },
    [columnas],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
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
  const celdasLargas = useMemo(() => celdasDemasiadoLargas(aMigrar), [aMigrar]);
  const noSoportadas = useMemo(() => columnasNoSoportadas(columnas), [columnas]);
  const faltanObligatorias = useMemo(
    () => obligatoriasSinMapear(columnas, mapeo),
    [columnas, mapeo],
  );

  const refrescar = useCallback(async (elLote: string, pag = 1) => {
    const [r, p] = await Promise.all([
      migracionTercerosApi.resumen(elLote),
      migracionTercerosApi.filas({
        lote: elLote,
        estado: 'REQUIERE_ATENCION',
        pagina: pag,
        porPagina: POR_PAGINA,
      }),
    ]);
    setResumen(r);
    setPendientes(p.filas);
    setTotalPendientes(p.total);
    setPagina(p.pagina);
    // `seleccion` sobrevive a propósito: se limpia sólo cuando cambia el LOTE.
    // Reiniciarla acá haría que resolver una fila borrara lo elegido en otras
    // páginas, y aplicar algo a 300 filas serían doce masivas repetidas.
  }, []);

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
      setError(mensaje(e, 'No pudimos preparar la carga.'));
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
    try {
      await refrescar(lote.trim());
    } catch {
      setError(
        'La carga quedó preparada, pero no pudimos leer sus filas. Toca «Actualizar la lista».',
      );
    }
    setCargando(false);
  }, [lote, tipo, aMigrar, refrescar, refrescarLotesAbiertos]);

  const retomar = useCallback(
    async (l: LoteDeTerceros) => {
      setError(null);
      setLoteEnConflicto(null);
      setTipo(l.tipo);
      setLoteAbierto(l.lote);
      setSeleccion(new Set());
      try {
        await refrescar(l.lote);
      } catch (e) {
        setError(mensaje(e, 'No pudimos abrir esa carga. Reintentá.'));
      }
    },
    [refrescar],
  );

  const volverAEmpezar = useCallback(() => {
    setResumen(null);
    setLoteAbierto(null);
    setPendientes([]);
    setTotalPendientes(0);
    setAplicacion(null);
    setSeleccion(new Set());
    setFilas([]);
    setEncabezados([]);
    setMapeo([]);
    setNombreDeArchivo('');
    setLote(nombreDeLoteSugerido(tipo));
    setError(null);
    setLoteEnConflicto(null);
    refrescarLotesAbiertos();
  }, [tipo, refrescarLotesAbiertos]);

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
    async (accion: () => Promise<unknown>, respaldo: string): Promise<ResultadoDeAccion> => {
      if (!loteAbierto) return { ok: false, mensaje: null };
      setCargando(true);
      setError(null);
      try {
        await accion();
      } catch (e) {
        const m = mensaje(e, respaldo);
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
        return { ok: false, mensaje: m };
      }
      try {
        await refrescar(loteAbierto, pagina);
      } catch {
        setError(AVISO_DE_REFRESCO);
      }
      setCargando(false);
      return { ok: true, mensaje: null };
    },
    [loteAbierto, pagina, refrescar],
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
   * «Le di crear inquilinos y siguió estando la lista, ¿para qué?» (Nico).
   *
   * Después de crear, lo que queda casi siempre es UNA sola cosa: filas de
   * personas que ya existen en la plataforma. Pedirle que decida 85 veces lo
   * mismo —fila por fila, o marcando 25 por página— es hacerle hacer a mano
   * un bucle. Esto recorre TODO el lote, junta las que sólo tienen ese
   * motivo, y las vincula en una sola masiva. Las que además tienen otro
   * problema (un dato que falta, un repetido en el archivo) no se tocan:
   * ésas sí necesitan una decisión.
   */
  const vincularTodasLasExistentes = useCallback(async () => {
    if (!loteAbierto) return;
    setCargando(true);
    setError(null);
    try {
      const ids: string[] = [];
      for (let pag = 1; pag < 100; pag++) {
        const p = await migracionTercerosApi.filas({
          lote: loteAbierto,
          estado: 'REQUIERE_ATENCION',
          pagina: pag,
          porPagina: 200,
        });
        for (const f of p.filas) {
          const errores = f.errores ?? [];
          if (errores.length > 0 && errores.every((e) => e.codigo === 'YA_EXISTE_EN_LA_AGENCIA')) {
            ids.push(f.id);
          }
        }
        if (p.filas.length < 200 || pag * 200 >= p.total) break;
      }
      if (ids.length === 0) {
        setAvisoMasivo('No hay filas que sean sólo «ya existe»: las que quedan necesitan otra decisión.');
        return;
      }
      const r = await migracionTercerosApi.resolverMasivo(ids, { vincularAExistente: true });
      if (r.fallidas.length > 0) {
        setSeleccion(new Set(r.fallidas.map((f) => f.id)));
        setError(resumenDeFallidas(r));
      } else {
        setSeleccion(new Set());
      }
      setAvisoMasivo(
        `${r.aplicadas} ${r.aplicadas === 1 ? 'fila vinculada' : 'filas vinculadas'} con las personas que ya existían: quedaron listas para crear con el botón de arriba.`,
      );
      await refrescar(loteAbierto, 1);
    } catch (e) {
      setError(mensaje(e, 'No pudimos vincular las filas que ya existen.'));
    } finally {
      setCargando(false);
    }
  }, [loteAbierto, refrescar]);

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
        (l) => migracionTercerosApi.aplicar(l),
        setProgreso,
      );
      setAplicacion(informe);
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
      setError(
        `${mensaje(e, 'No pudimos crear las fichas.')} ` +
          (hechas > 0
            ? `Alcanzaron a crearse ${hechas}: quedaron creadas. `
            : 'Lo que alcanzó a crearse quedó creado. ') +
          'Reintentá con el mismo botón y la carga sigue donde quedó, sin duplicar a nadie.',
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
  }, [loteAbierto, refrescar]);

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
        aplicacion={aplicacion}
        cargando={cargando}
        error={error}
        avisoMasivo={avisoMasivo}
        onVincularTodasLasExistentes={() => void vincularTodasLasExistentes()}
        onSeleccionCambia={setSeleccion}
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
        onDescartar={(id) =>
          conRefresco(
            () => migracionTercerosApi.descartar(id),
            'No pudimos descartar la fila.',
          )
        }
        onMasivo={(cambios) =>
          void conRefresco(async () => {
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
              const n = r.aplicadas;
              setAvisoMasivo(
                cambios.vincularAExistente
                  ? `${n} ${n === 1 ? 'fila vinculada' : 'filas vinculadas'} con las personas que ya existían: salieron de esta lista y quedaron listas para crear con el botón de arriba.`
                  : cambios.descartar
                    ? `${n} ${n === 1 ? 'fila descartada' : 'filas descartadas'}.`
                    : `Se aplicó el cambio a ${n} ${n === 1 ? 'fila' : 'filas'}.`,
              );
            }
          }, 'No pudimos aplicar el cambio a las filas seleccionadas.')
        }
        onAplicar={() => void aplicar()}
        onOtroArchivo={volverAEmpezar}
      />
    );
  }

  // ══ Entrada: elegir tipo, retomar, subir ══════════════════════════════════

  const demasiadasFilas = filas.length > MAX_FILAS_POR_LOTE;
  const puedePreparar =
    filas.length > 0 &&
    !demasiadasFilas &&
    celdasLargas.length === 0 &&
    lote.trim().length > 0 &&
    !cargando;

  // Con el tipo fijo, las cargas sin terminar del OTRO tipo son de otro paso.
  const lotesVisibles = tipoFijo ? lotesAbiertos.filter((l) => l.tipo === tipoFijo) : lotesAbiertos;

  // El 409 con salida: la carga que chocó está ahí para retomarla en un clic.
  const cargaEnConflicto = loteEnConflicto
    ? lotesVisibles.find((l) => l.lote === loteEnConflicto) ?? null
    : null;

  return (
    <div className="space-y-6">
      {fallaronLosLotes ? (
        <section
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-warning-soft p-4"
          data-testid="lotes-no-verificados"
        >
          <div className="flex items-start gap-2">
            <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p className="text-sm text-fg">
              No pudimos verificar si tienes una carga sin terminar. Puedes seguir igual — pero si
              dejaste una a medias, reintentá primero: volver a subir el mismo archivo duplica a
              las personas.
            </p>
          </div>
          <Button size="sm" variant="outline" hideArrow onClick={refrescarLotesAbiertos}>
            Reintentar
          </Button>
        </section>
      ) : null}

      {lotesVisibles.length > 0 ? (
        <section
          className="space-y-3 rounded-lg border border-primary/30 bg-surface p-5 shadow-sm"
          data-testid="lotes-abiertos"
        >
          <p className="text-sm font-medium text-fg">Tienes una carga sin terminar</p>
          {lotesVisibles.map((l) => (
            <div key={l.lote} className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-fg-muted">
                <span className="text-fg">{l.lote}</span>
                {' · '}
                {l.tipo === 'PROPIETARIO' ? 'propietarios' : 'inquilinos'}
                {' · '}
                <span className="font-mono tabular-nums">{l.requierenAtencion}</span>{' '}
                {l.requierenAtencion === 1 ? 'fila por revisar' : 'filas por revisar'}
                {l.listos > 0 ? (
                  <>
                    {' · '}
                    <span className="font-mono tabular-nums">{l.listos}</span> listas para crear
                  </>
                ) : null}
              </p>
              <Button size="sm" hideArrow disabled={cargando} onClick={() => void retomar(l)}>
                Retomar
              </Button>
            </div>
          ))}
          <p className="text-xs text-fg-subtle">
            Si vuelves a subir el mismo archivo con otro nombre, las personas se duplican y hay
            que resolver el duplicado una por una.
          </p>
        </section>
      ) : null}

      <section className="space-y-4 rounded-lg border border-border bg-surface p-6 shadow-sm">
        {tipoFijo ? (
          <div className="space-y-1" data-testid="tipo-fijo" data-tipo={tipoFijo}>
            <h2 className="text-sm font-medium text-fg">
              {tipoFijo === 'PROPIETARIO' ? 'El archivo de propietarios' : 'El archivo de inquilinos'}
            </h2>
            <p className="text-sm text-fg-muted">
              {tipoFijo === 'PROPIETARIO'
                ? 'Una fila por propietario: documento, nombre, y el banco, tipo y número de cuenta para poder girarle.'
                : 'Una fila por inquilino: documento, nombre y correo para poder invitarlo al portal. El contrato de cada uno entra en el paso 4.'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <h2 className="text-sm font-medium text-fg">¿Qué estás cargando?</h2>
            <p className="text-sm text-fg-muted">
              Van en archivos separados: a un propietario hay que poder pagarle (banco y cuenta) y
              a un inquilino hay que poder invitarlo (correo). No son las mismas columnas.
            </p>
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
          <div className="flex items-start gap-2 rounded-md border border-border bg-danger-soft p-3">
            <Warning className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            <div>
              <p className="text-sm font-medium text-danger">
                Hay columnas nuevas que esta pantalla todavía no sabe mandar
              </p>
              <p className="mt-0.5 text-sm text-fg-muted">
                {noSoportadas.map((c) => c.titulo).join(' · ')} — se van a ignorar. Avisale al
                equipo antes de seguir para no perder ese dato.
              </p>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            hideArrow
            disabled={!plantilla}
            onClick={() =>
              plantilla &&
              void descargarPlantillaDeTerceros(tipo, columnas).catch(() =>
                setError('No pudimos generar la plantilla para descargar. Reintentá.'),
              )
            }
          >
            <DownloadSimple className="mr-1.5 h-4 w-4" />
            Descargar la plantilla
          </Button>
          <p className="text-xs text-fg-subtle">
            O sube el archivo que ya tienes: abajo se muestra cómo entendimos tus columnas.
          </p>
        </div>

        {/* Sin plantilla no hay mapeo ni descarga: si su lectura falló, esta
            pantalla está muerta — el reintento tiene que estar ACÁ, no en
            recargar la página entera y perder dónde se estaba parado. */}
        {errorDePlantilla ? (
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-danger-soft p-3"
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
      </section>

      <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
        <div
          {...getRootProps()}
          className={`flex cursor-pointer flex-col items-center gap-3 rounded-md border border-dashed p-8 text-center transition-colors ${
            isDragActive ? 'border-primary bg-primary-soft' : 'border-border hover:bg-surface-muted'
          }`}
          data-testid="dropzone-terceros"
        >
          {/* allowlist: react-dropzone hidden file input (mecanismo canónico) */}
          <input {...getInputProps()} />
          <FileArrowUp className="h-8 w-8 text-fg-muted" />
          <div>
            <p className="text-sm font-medium text-fg">
              {/* Deshabilitado sin decir por qué = un dropzone que «no anda».
                  La espera y el fallo de la plantilla se dicen acá mismo. */}
              {plantilla
                ? nombreDeArchivo || 'Arrastra el archivo o haz clic para elegirlo'
                : errorDePlantilla
                  ? 'No se puede subir todavía — reintentá arriba la lectura de columnas.'
                  : 'Preparando la pantalla: leyendo las columnas esperadas…'}
            </p>
            <p className="text-xs text-fg-subtle">
              Excel o CSV exportado de tu sistema actual. Nada se crea todavía.
            </p>
          </div>
        </div>

        {error ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-danger-soft p-3">
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
                disabled={cargando}
                data-testid="retomar-conflicto"
                onClick={() => void retomar(cargaEnConflicto)}
              >
                Retomar esa carga
              </Button>
            ) : null}
          </div>
        ) : null}
      </section>

      {mapeo.length > 0 ? (
        <section className="space-y-4 rounded-lg border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-sm font-medium text-fg">Así entendimos tus columnas</h2>
              <p className="text-xs text-fg-muted">
                <span className="font-mono tabular-nums">{filas.length}</span> filas en el
                archivo. Revisa el mapeo antes de seguir: lo que se mapea mal no falla, se guarda
                en el campo de al lado.
              </p>
            </div>
            <Button
              variant="link"
              size="sm"
              hideArrow
              className="shrink-0 text-xs"
              onClick={() => setMapeo(mapearColumnas(columnas, encabezados))}
            >
              Restablecer
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Columna del archivo</TableHead>
                  <TableHead>Campo del tercero</TableHead>
                  <TableHead>Por qué</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mapeo.map((m) => (
                  <TableRow key={m.columna}>
                    <TableCell className="font-medium">{m.columna || '(sin nombre)'}</TableCell>
                    <TableCell>
                      <Select
                        value={m.campo ?? IGNORAR}
                        onValueChange={(v) =>
                          setMapeo((actual) =>
                            remapear(actual, m.columna, v === IGNORAR ? null : v),
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
                          {columnas.map((c) => (
                            <SelectItem key={c.campo} value={c.campo}>
                              {c.titulo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-fg-muted">
                      {/* Tres estados distintos, y decirlos importa: el empate
                          por parecido es el que se equivoca. */}
                      {m.isManual
                        ? 'elegido a mano'
                        : m.porque && m.exacto
                          ? `coincide con «${m.porque}»`
                          : m.porque
                            ? `se parece a «${m.porque}»`
                            : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {faltanObligatorias.length > 0 ? (
            <div className="flex items-start gap-2 rounded-md border border-border bg-info-soft p-3">
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

          {celdasLargas.length > 0 ? (
            <div className="flex items-start gap-2 rounded-md border border-border bg-danger-soft p-3">
              <Warning className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              <div>
                <p className="text-sm font-medium text-danger">
                  {celdasLargas.length === 1
                    ? 'Hay una celda más larga de lo que el sistema acepta'
                    : `Hay ${celdasLargas.length} celdas más largas de lo que el sistema acepta`}
                </p>
                <p className="mt-0.5 text-sm text-fg-muted">
                  {celdasLargas
                    .slice(0, 3)
                    .map((c) => `fila ${c.fila}: ${c.campo} (${c.largo} de ${c.maximo})`)
                    .join(' · ')}
                  {celdasLargas.length > 3 ? ` y ${celdasLargas.length - 3} más` : ''}. Corregilas
                  en el archivo y vuelve a subirlo — no las recortamos por ti.
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
              . Partilo en dos archivos.
            </p>
          ) : null}

          <label className="block max-w-sm space-y-1">
            <span className="text-sm text-fg-muted">Nombre de esta carga</span>
            <Input
              value={lote}
              maxLength={60}
              onChange={(e) => setLote(e.target.value)}
              data-testid="nombre-del-lote"
            />
            <span className="block text-xs text-fg-subtle">
              Sirve para volver a encontrarla si la dejas a medias. No se puede repetir.
            </span>
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
        </section>
      ) : null}
    </div>
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
  aplicacion,
  cargando,
  error,
  avisoMasivo = null,
  onVincularTodasLasExistentes,
  onSeleccionCambia,
  onPaginaCambia,
  onActualizar,
  onCorregir,
  onVincular,
  onDescartar,
  onMasivo,
  onAplicar,
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
  aplicacion: ResumenDeAplicacion | null;
  cargando: boolean;
  error: string | null;
  avisoMasivo?: string | null;
  onVincularTodasLasExistentes?: () => void;
  onSeleccionCambia: (s: Set<string>) => void;
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
  onMasivo: (cambios: {
    campos?: FilaTercero;
    vincularAExistente?: boolean;
    descartar?: boolean;
  }) => void;
  onAplicar: () => void;
  onOtroArchivo: () => void;
}) {
  const todasMarcadas = pendientes.length > 0 && pendientes.every((f) => seleccion.has(f.id));

  return (
    <div className="space-y-6" data-testid="lista-de-trabajo">
      <section className="space-y-4 rounded-lg border border-border bg-surface p-6 shadow-sm">
        <p className="text-sm text-fg-muted">
          Carga <span className="text-fg">{lote}</span> ·{' '}
          {tipo === 'PROPIETARIO' ? 'propietarios' : 'inquilinos'}
        </p>

        <div className="grid gap-3 sm:grid-cols-4">
          <Dato etiqueta="En el archivo" valor={resumen.total} />
          <Dato etiqueta="Listas para crear" valor={resumen.listos} tono="ok" />
          <Dato etiqueta="Les falta algo" valor={resumen.requierenAtencion} tono="mal" />
          <Dato etiqueta="Ya creadas" valor={resumen.aplicados} />
        </div>

        {resumen.listos > 0 ? (
          <>
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

            <p className="text-xs text-fg-subtle">
              {/* Decir de antemano qué pasa: el correo sale al aplicar, y una
                  invitación no se puede des-enviar. */}
              {tipo === 'INQUILINO'
                ? 'Se crean sólo las que no les falta nada, y a cada inquilino le llega la invitación al portal por correo. Se manda por tandas, no todo de golpe.'
                : 'Se crean sólo las que no les falta nada. Las demás quedan acá esperando.'}
            </p>
          </>
        ) : null}

        {resumen.listos === 0 && resumen.requierenAtencion > 0 ? (
          <p className="text-sm text-fg-muted">
            Todavía no hay ninguna lista. Resolvé lo de abajo y van pasando solas.
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
            <p className="text-sm text-danger">{error}</p>
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
          className="space-y-2 rounded-lg border border-border bg-surface p-6 shadow-sm"
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
          </p>
          {(aplicacion.sinInvitar ?? 0) > 0 ? (
            <p className="text-sm text-fg-muted" data-testid="sin-invitar">
              El proveedor de correo limitó los envíos: esas cuentas quedaron creadas y la
              invitación se manda después. No hace falta volver a subir nada.
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
          {aplicacion.fallidas > 0 ? (
            <ul className="space-y-1 text-sm text-fg-muted">
              {aplicacion.resultados
                .filter((r) => r.estado === 'fallido')
                .map((r) => (
                  <li key={r.id}>
                    Fila <span className="font-mono tabular-nums">{r.fila}</span>: {r.motivo}
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
      {totalPendientes > 0 ? (
        <div className="space-y-1 pt-2" data-testid="titulo-por-revisar">
          <h2 className="text-sm font-medium text-fg">
            {totalPendientes === 1
              ? 'Queda 1 fila del archivo por decidir'
              : `Quedan ${totalPendientes} filas del archivo por decidir`}
          </h2>
          <p className="text-sm text-fg-muted">
            {tipo === 'INQUILINO'
              ? 'No se crearon todavía: son personas que ya existen en la plataforma —quizá las subiste en Propietarios o ya tenían cuenta— o filas a las que les falta un dato. '
              : 'No se crearon todavía: son personas que ya existen en la plataforma, filas repetidas en el archivo, o a las que les falta un dato. '}
            Resolvé cada una acá, o marcá varias y resolvelas juntas: al decidir salen de esta
            lista y quedan listas para crear con el botón de arriba.
          </p>
          {/* El caso de casi todas: ya existen. Una decisión, no ochenta y cinco. */}
          {onVincularTodasLasExistentes &&
          pendientes.some((f) =>
            (f.errores ?? []).every((e) => e.codigo === 'YA_EXISTE_EN_LA_AGENCIA'),
          ) ? (
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                size="sm"
                hideArrow
                disabled={cargando}
                isLoading={cargando}
                onClick={onVincularTodasLasExistentes}
                data-testid="vincular-todas-las-existentes"
              >
                Son las mismas personas: vincular todas las que ya existen
              </Button>
              <p className="text-xs text-fg-muted">
                Recorre todo el archivo, no sólo esta página. Las que además les falta un dato
                se quedan acá para que las mires.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {pendientes.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/*
           * `aria-labelledby` y no un `<label>` alrededor: el `Checkbox` de
           * cadence es el de Radix, que renderiza un `<button role="checkbox">`.
           * Un `<button>` no es un elemento etiquetable, así que ni envolverlo
           * en un `<label>` ni un `htmlFor` le dan nombre — un lector de
           * pantalla anunciaría «casilla, sin marcar» y nada más.
           */}
          <div className="flex items-center gap-2 text-sm text-fg">
            <Checkbox
              aria-labelledby="seleccionar-pagina"
              checked={todasMarcadas}
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
          </div>
          {/* El total ya lo dice el título de arriba; repetirlo acá era ruido. */}
        </div>
      ) : null}

      {seleccion.size > 0 ? (
        <ResolucionMasiva
          cantidad={seleccion.size}
          columnas={columnas}
          cargando={cargando}
          onAplicar={onMasivo}
          onLimpiar={() => onSeleccionCambia(new Set())}
        />
      ) : null}

      {pendientes.map((fila) => (
        <div key={fila.id} className="flex items-start gap-3">
          {/* Sin texto al lado, así que el nombre va en `aria-label` — y no
              dice «seleccionar fila» a secas: con doscientas casillas
              idénticas, eso no le sirve a nadie que navegue por teclado. */}
          <Checkbox
            className="mt-6"
            aria-label={`Seleccionar la fila ${fila.datos._fila}${
              typeof fila.datos.nombre === 'string' && fila.datos.nombre
                ? `, ${fila.datos.nombre}`
                : ''
            }`}
            checked={seleccion.has(fila.id)}
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
              onCorregir={(campos) => onCorregir(fila.id, campos, fila.version)}
              onVincular={() => onVincular(fila.id, fila.version)}
              onDescartar={() => onDescartar(fila.id)}
            />
          </div>
        </div>
      ))}

      {pendientes.length === 0 && resumen.requierenAtencion === 0 ? (
        <p className="rounded-lg border border-border bg-surface p-6 text-sm text-fg-muted shadow-sm">
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

      {/* Pie del design system: dice cuántas filas quedan por decidir y en
          cuál página vas, no sólo «‹ 2 ›». Las páginas las sirve el back
          (`filas(lote, { pagina, porPagina })`), así que el tamaño de página
          no se ofrece: sin `pageSizeOptions` el selector no se monta y no
          queda un control que no hace nada. */}
      {totalPendientes > 0 ? (
        <div className="border-t border-border px-4 py-3">
          <TablePagination
            total={totalPendientes}
            page={pagina}
            pageSize={POR_PAGINA}
            onPageChange={onPaginaCambia}
          />
        </div>
      ) : null}

      <Button variant="outline" hideArrow onClick={onOtroArchivo}>
        Subir otro archivo
      </Button>
    </div>
  );
}

/**
 * La misma corrección a muchas filas.
 *
 * Un archivo real trae doscientas filas a las que les falta lo mismo: el mismo
 * banco mal escrito, el mismo tipo de documento vacío. Resolverlas de a una son
 * doscientas veces el mismo dato.
 */
function ResolucionMasiva({
  cantidad,
  columnas,
  cargando,
  onAplicar,
  onLimpiar,
}: {
  cantidad: number;
  columnas: readonly import('@/lib/api/migracion-terceros.service').ColumnaDePlantilla[];
  cargando: boolean;
  onAplicar: (cambios: {
    campos?: FilaTercero;
    vincularAExistente?: boolean;
    descartar?: boolean;
  }) => void;
  onLimpiar: () => void;
}) {
  /** Qué botón de abajo se apretó, para que gire ése y no los tres. */
  const [enVuelo, setEnVuelo] = useState<'vincular' | 'descartar' | null>(null);
  const [campo, setCampo] = useState<string>('');
  const [valor, setValor] = useState('');

  const columna = columnas.find((c) => c.campo === campo);

  return (
    <section className="space-y-3 rounded-lg border border-primary/30 bg-surface p-5 shadow-sm">
      <p className="text-sm font-medium text-fg">
        <span className="font-mono tabular-nums">{cantidad}</span>{' '}
        {cantidad === 1 ? 'fila seleccionada' : 'filas seleccionadas'}
      </p>

      {/*
       * `div` + `aria-labelledby`, no un `<label>` envolviendo el control: el
       * `SelectTrigger` de Radix es un `<button>`, y un `<button>` no es
       * etiquetable — el `<label>` no le presta su texto como nombre
       * accesible y un lector de pantalla anuncia «botón» a secas.
       */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <span id="masivo-campo-etiqueta" className="block text-xs text-fg-muted">
            Ponerles el mismo
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
              {columnas.map((c) => (
                <SelectItem key={c.campo} value={c.campo}>
                  {c.titulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {columna ? (
          <div className="space-y-1">
            <span id="masivo-valor-etiqueta" className="block text-xs text-fg-muted">
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
                placeholder={columna.ejemplo}
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
          onClick={() => {
            onAplicar({ campos: { [campo]: valor } as FilaTercero });
            setCampo('');
            setValor('');
          }}
        >
          Aplicar a las {cantidad}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        {/*
         * Nico, con 25 filas marcadas: «no mostró carga de nada y luego
         * apareció el botón de la nada». La masiva tardaba unos segundos y
         * los botones sólo se apagaban: nada decía que algo estaba pasando.
         * El que se apretó gira, y una línea dice qué se está haciendo.
         */}
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
        <Button
          size="sm"
          variant="outline"
          hideArrow
          disabled={cargando}
          isLoading={cargando && enVuelo === 'descartar'}
          className="text-danger hover:bg-danger-soft hover:text-danger"
          onClick={() => {
            setEnVuelo('descartar');
            onAplicar({ descartar: true });
          }}
        >
          No traer ninguna de estas
        </Button>
        {cargando && enVuelo ? (
          <p className="basis-full text-xs text-fg-muted" data-testid="masivo-progreso">
            {enVuelo === 'vincular'
              ? `Vinculando ${cantidad} ${cantidad === 1 ? 'fila' : 'filas'} con las personas que ya existen… al terminar salen de esta lista y quedan listas para crear.`
              : `Descartando ${cantidad} ${cantidad === 1 ? 'fila' : 'filas'}…`}
          </p>
        ) : null}
        <span className="flex-1" />
        <Button size="sm" variant="link" hideArrow className="text-xs" onClick={onLimpiar}>
          Quitar la selección
        </Button>
      </div>
    </section>
  );
}

function Dato({
  etiqueta,
  valor,
  tono,
}: {
  etiqueta: string;
  valor: number;
  tono?: 'ok' | 'mal';
}) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs text-fg-muted">{etiqueta}</p>
      <p
        className={`font-mono text-xl font-semibold tabular-nums ${
          tono === 'ok' && valor > 0
            ? 'text-success'
            : tono === 'mal' && valor > 0
              ? 'text-danger'
              : 'text-fg'
        }`}
      >
        {valor}
      </p>
    </div>
  );
}
