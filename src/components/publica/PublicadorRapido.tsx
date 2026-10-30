'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, SpinnerGap } from '@phosphor-icons/react';
import { Pagination, SearchInput, motionDuration, motionEase } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { confirmar } from '@/components/ui/confirmar';
import { autoMapColumns } from '@/components/inmobiliaria/import/lib/columnMapping';
import { mapRowsToProperties } from '@/components/inmobiliaria/import/lib/gapFiller';
import { parseSpreadsheetFile } from '@/components/inmobiliaria/import/lib/parseFile';
import { propertiesApi } from '@/lib/api/properties.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { useAvisoAlSalir } from '@/lib/hooks/use-aviso-al-salir';
import { aImportProperty, leerEnlaces, traerFotoComoArchivo } from '@/lib/inmuebles/enlaces.service';
import { normalizarDireccionCo } from '@/lib/inmuebles/normalizar-direccion-co';
import { ESPERA_ENTRE_BUSQUEDAS_MS, ubicarDireccion } from '@/lib/inmuebles/ubicar-direccion';
import {
  MAX_FOTOS,
  MAX_INMUEBLES,
  TIPOS,
  borrarBorrador,
  desdeImportProperty,
  direccionesRepetidas,
  guardarBorrador,
  inmuebleVacio,
  leerBorrador,
  loQueFalta,
  nuevaLlave,
  paraCrear,
  type InmuebleRapido,
  type Operacion,
  type TipoRapido,
} from '@/lib/publica/borrador';
import { acomodarCarpetas, agruparPorCarpeta, type ArchivoConRuta } from '@/lib/publica/carpetas';
import { prepararFoto, soloImagenes } from '@/lib/publica/fotos';
import { almacenDeFotos, porInmueble, type FotoGuardada } from '@/lib/publica/fotos-guardadas';
import { anotarPorUbicar, leerPorUbicar, quitarPorUbicar } from '@/lib/publica/por-ubicar';
import { limitador, publicarEnTandas } from '@/lib/publica/publicar-en-tandas';
import { cn } from '@/lib/utils';

import { FilaDeInmueble } from './FilaDeInmueble';
import { LoQueFaltaParaPublicar, type InmuebleConFaltantes } from './LoQueFaltaParaPublicar';
import { Pastilla, TarjetaDeInmueble, type EstadoDeLaTarjeta, type LlegandoALaTarjeta } from './TarjetaDeInmueble';
import { TodoPublicado } from './TodoPublicado';
import { TraerMuchos, type CaminoParaMuchos, type ResultadoDeCarpetas, type ResultadoDeEnlaces, type ResultadoDelExcel } from './TraerMuchos';
import { VacioChico } from '@/components/estado/VacioChico';

/**
 * ══ EL PUBLICADOR RÁPIDO ════════════════════════════════════════════════════
 *
 * Juan y Nico (19-10-2026): «que lo deje crear la propiedad o las propiedades
 * en un flujo diferente al que está dentro de la plataforma», «que pueda
 * publicar muy rápido uno o muchos, que se sienta rápido».
 *
 * Una tarjeta por inmueble con lo justo para salir en el marketplace: fotos,
 * arriendo o venta, tipo, dirección, precio, habitaciones, baños y área.
 *
 * Escala (Nico, 20-10-2026: «si llegan a ser muchísimos inmuebles, ¿cómo
 * escala esto?»):
 * - **Traerlos de una**: pegar los enlaces de sus avisos, leer su Excel (cada
 *   fila una tarjeta) o arrastrar sus carpetas de fotos (una por inmueble; si
 *   se llaman como el código o la dirección de una fila, se acomodan solas).
 * - **Con más de 3, la lista se pliega**: cada inmueble es una línea y se abre
 *   uno a la vez; filtros por lo que falta, y completar en bloque el tipo y la
 *   ciudad que les falte a varios.
 * - **Publicar no duplica ni se pierde**: fotos achicadas en el navegador y
 *   guardadas en IndexedDB, 4 inmuebles a la vez, la llave anti-duplicados de
 *   cada tarjeta y el id de lo ya creado guardado: si la pestaña se cierra,
 *   al volver sigue donde iba.
 */
type Estado = EstadoDeLaTarjeta;

/** Con más de esto, la lista se pliega a una línea por inmueble. */
/**
 * Desde 2 inmuebles, lista compacta con UNO abierto a la vez (Nico, 28-10: «imagínate el scroll si suben 1.000»): la
 * página mide lo mismo con 2 que con 500. El buscador, los filtros y completar en bloque, sólo con muchos (o con errores).
 */
const POCOS = 1;
const MUCHOS = 8;
/** Cuántos se ven por página cuando son muchos. */
const POR_PAGINA = 25;

/** Para buscar sin que importen tildes ni mayúsculas. */
function sinTildes(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

type Filtro = 'todos' | 'faltan' | 'listos' | 'error' | 'publicados';

const MOTIVO_A_MEDIAS = 'Quedó a medias: ya está publicado y faltan fotos por subir. Toca «Publicar» para terminar.';

/** La tarjeta tal como nace: nada escrito, nada creado, de ningún lado. */
function esVirgen(i: InmuebleRapido): boolean {
  return !i.idCreado && !i.origen && !i.direccion.trim() && !i.precio && !i.descripcion.trim() && !i.barrio.trim() && i.habitaciones === null && i.banos === null && i.area === null;
}

function hostDe(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'el enlace';
  }
}

export function PublicadorRapido({
  usuario,
  alTerminar,
  paginaPublica = null,
  caminoInicial = null,
  operacionInicial = null,
  alCambiarDeMomento,
}: {
  usuario: string;
  /** Avisa cuando todo quedó publicado (para los pasos de arriba de la página). */
  alCambiarDeMomento?: (todoPublicado: boolean) => void;
  /** Dónde sigue después de publicar (su cuenta). */
  alTerminar: { href: string; texto: string };
  /** La página de la inmobiliaria en el marketplace, para compartirlos todos de una. */
  paginaPublica?: string | null;
  /** Con qué camino abre «¿Son muchos?» (p. ej. «Cargar muchos desde un archivo» → el Excel). */
  caminoInicial?: CaminoParaMuchos | null;
  /**
   * Arriendo o venta, si ya se sabe (`/publica?operacion=venta`). Sin ella y
   * sin borrador guardado, la tarjeta arranca en arriendo y se cambia ahí mismo.
   */
  operacionInicial?: Operacion | null;
}) {
  const contador = useRef(0);
  const nuevaClave = () => `i${Date.now().toString(36)}${(contador.current += 1)}`;
  const [inmuebles, setInmuebles] = useState<InmuebleRapido[]>(() => [
    inmuebleVacio('i0', operacionInicial ? { operacion: operacionInicial } : undefined),
  ]);
  /**
   * «¿Lo publicas para arriendo o para venta?» (Nico, 21-10-2026). Sólo al
   * empezar de cero: con un borrador guardado, cada tarjeta ya dice la suya.
   */
  /**
   * 28-10-2026 (Nico: «había llegado al 3 y me preguntó eso de arriendo o venta y le di continuar y me sale lo de subir
   * inmuebles, qué raro»): ya no hay una pantalla aparte para la pregunta. Lo primero de la tarjeta es «Lo publicas
   * para: Arriendo · Venta · Arriendo y venta» (arriendo de entrada).
   *
   * Con «ambos»: la publicación de venta de cada una de arriendo (para subirle las mismas fotos y el punto).
   */
  const gemelos = useRef<Record<string, string>>({});
  /** Lo que respondió: lo toman las filas del Excel o los enlaces que no dicen si son arriendo o venta. */
  const operacionElegida = useRef<Operacion | null>(operacionInicial);
  /**
   * Lo que toman las filas del Excel o los enlaces que no dicen si son arriendo o venta: lo que dice la primera tarjeta
   * (o el enlace con `?operacion=`). «Arriendo y venta» no se le impone a una fila: ahí decide la fila.
   */
  const operacionPorDefecto = (): Operacion | null => {
    const op = inmueblesRef.current[0]?.operacion ?? operacionElegida.current;
    return op === 'ambos' ? null : (op ?? null);
  };
  const [fotos, setFotos] = useState<Record<string, FotoGuardada[]>>({});
  const [llegando, setLlegando] = useState<Record<string, LlegandoALaTarjeta>>({});
  const [estados, setEstados] = useState<Record<string, Estado>>({});
  const [publicando, setPublicando] = useState(false);
  const [corrida, setCorrida] = useState<string[] | null>(null);
  const [cargado, setCargado] = useState(false);
  const [recuperado, setRecuperado] = useState<{ inmuebles: number; fotos: number } | null>(null);
  const [intento, setIntento] = useState(false);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  // Con muchos (Nico, 28-10: «que se vea bien si carga uno o si carga 1.000»): buscador y páginas de 25, como las tablas.
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [recortados, setRecortados] = useState(0);
  /** El panel de «lo que falta» (Nico, 28-10) y cuántos sí salieron en la última corrida. */
  const [verQueFalta, setVerQueFalta] = useState(false);
  const [publicadosAhora, setPublicadosAhora] = useState(0);
  /** «¿Tienes muchos?» abierto (va arriba, donde dice «más abajo» con razón). */
  // Nico 29-10-2026: «deja esto como estaba, de entrada abierto sin pedir que lo abra»: «¿Son muchos? Tráelos de una»
  // sale arriba desde el principio (la línea «¿Tienes muchos inmuebles? · Traerlos» ya no hace falta).
  const [verTraer, setVerTraer] = useState(true);

  // Lo último, para lo que corre por fuera del render (fotos que llegan, publicar).
  const inmueblesRef = useRef(inmuebles);
  inmueblesRef.current = inmuebles;
  const fotosRef = useRef(fotos);
  fotosRef.current = fotos;
  const llegandoRef = useRef(llegando);
  llegandoRef.current = llegando;
  const ordenRef = useRef<Record<string, number>>({});
  const yaHuboAlgo = useRef(false);
  /** Las que se crearon CON su punto en el mapa; a las demás se les pone después. */
  const creadoConPunto = useRef<Record<string, boolean>>({});

  const prepararDeAPocas = useMemo(() => limitador(2), []);
  // El buscador de direcciones va de a una búsqueda, con su pausa (el techo de LocationIQ).
  const ubicarDeAUna = useMemo(() => limitador(1), []);
  const traerDeAPocos = useMemo(() => limitador(3), []);
  const almacen = useMemo(() => almacenDeFotos(), []);

  // ── Lo que dejó la última vez: los datos (localStorage) y las fotos (IndexedDB) ──
  useEffect(() => {
    let vivo = true;
    const guardado = leerBorrador(usuario);
    void (async () => {
      // Con tiempo máximo: si IndexedDB no contesta, se recupera lo escrito igual (sin las fotos).
      const todas = await Promise.race([
        almacen.leerTodas(usuario).catch(() => [] as FotoGuardada[]),
        new Promise<FotoGuardada[]>((listo) => window.setTimeout(() => listo([]), 8000)),
      ]);
      if (!vivo) return;
      if (guardado) {
        const claves = new Set(guardado.map((i) => i.clave));
        const huerfanas = todas.filter((f) => !claves.has(f.inmueble)).map((f) => f.id);
        if (huerfanas.length) void almacen.borrar(huerfanas);
        const grupos = porInmueble(todas.filter((f) => claves.has(f.inmueble)));
        for (const [c, lista] of Object.entries(grupos)) ordenRef.current[c] = Math.max(...lista.map((f) => f.orden)) + 1;
        setInmuebles(guardado);
        setFotos(grupos);
        setEstados(
          Object.fromEntries(
            guardado
              .filter((i) => i.idCreado)
              .map((i): [string, Estado] =>
                (grupos[i.clave] ?? []).some((f) => !f.subida)
                  ? [i.clave, { que: 'fallo', id: i.idCreado, motivo: MOTIVO_A_MEDIAS }]
                  : [i.clave, { que: 'publicado', id: i.idCreado as string }],
              ),
          ),
        );
        setRecuperado({ inmuebles: guardado.length, fotos: todas.length - huerfanas.length });
      }
      // Sin borrador, las fotos que hubiera NO se borran: perder un borrador no
      // puede llevarse también las fotos. Quedan como huérfanas y se limpian la
      // próxima vez que haya un borrador con qué compararlas.
      setCargado(true);
    })();
    return () => {
      vivo = false;
    };
  }, [usuario, almacen]);

  // Lo que quedó publicado sin punto en una visita anterior: se ubica en segundo plano.
  useEffect(() => {
    if (!cargado) return;
    for (const p of leerPorUbicar(usuario)) {
      if (inmueblesRef.current.some((i) => i.idCreado === p.id)) continue;
      void ubicarDeAUna(async () => {
        const u = await ubicarDireccion({ direccion: p.direccion, ciudad: p.ciudad }).catch(() => null);
        await new Promise((r) => window.setTimeout(r, ESPERA_ENTRE_BUSQUEDAS_MS));
        if (!u) return; // El buscador no contestó: queda anotado para la próxima.
        if (u.lat == null || u.lng == null) {
          quitarPorUbicar(usuario, p.id);
          return;
        }
        await propertiesApi
          .update(p.id, { latitude: u.lat, longitude: u.lng })
          .then(() => quitarPorUbicar(usuario, p.id))
          .catch(() => undefined);
      });
    }
  }, [cargado, usuario, ubicarDeAUna]);

  useEffect(() => {
    if (!cargado) return;
    const pendientes = inmuebles.filter((i) => estados[i.clave]?.que !== 'publicado');
    if (pendientes.length === 0) {
      borrarBorrador(usuario);
      return;
    }
    // Una sola tarjeta en blanco no es un borrador. Al abrir, guardarla podría
    // pisar uno de verdad; si en esta sesión ya hubo algo y la persona lo quitó
    // todo, sí se borra lo guardado.
    if (pendientes.length === 1 && esVirgen(pendientes[0]) && !(fotosRef.current[pendientes[0].clave]?.length)) {
      if (yaHuboAlgo.current) borrarBorrador(usuario);
      return;
    }
    yaHuboAlgo.current = true;
    guardarBorrador(usuario, pendientes);
  }, [inmuebles, estados, usuario, cargado]);

  const cambiar = useCallback(
    (clave: string, parcial: Partial<InmuebleRapido>) =>
      setInmuebles((lista) => lista.map((i) => (i.clave === clave ? { ...i, ...parcial } : i))),
    [],
  );

  // ── Fotos ────────────────────────────────────────────────────────────────
  const sumarLlegando = useCallback((clave: string, delta: number, trayendo?: LlegandoALaTarjeta['trayendo'] | null) => {
    setLlegando((todo) => {
      const antes = todo[clave] ?? { fotos: 0 };
      const despues: LlegandoALaTarjeta = {
        fotos: Math.max(0, antes.fotos + delta),
        ...(trayendo === null ? {} : trayendo ? { trayendo } : antes.trayendo ? { trayendo: antes.trayendo } : {}),
      };
      const { [clave]: _fuera, ...resto } = todo;
      return despues.fotos === 0 && !despues.trayendo ? resto : { ...todo, [clave]: despues };
    });
  }, []);

  /** Prepara (achica) y guarda una foto en su lugar de la tarjeta. */
  const ponerFoto = useCallback(
    async (clave: string, archivo: File, orden: number) => {
      const lista = await prepararDeAPocas(() => prepararFoto(archivo));
      const foto: FotoGuardada = { id: nuevaLlave(), usuario, inmueble: clave, orden, archivo: lista.archivo, miniatura: lista.miniatura, subida: false };
      // La tarjeta pudo haberse quitado mientras tanto.
      if (!inmueblesRef.current.some((i) => i.clave === clave)) return;
      setFotos((todas) => ({ ...todas, [clave]: [...(todas[clave] ?? []), foto].sort((a, b) => a.orden - b.orden) }));
      void almacen.guardar([foto]);
    },
    [almacen, prepararDeAPocas, usuario],
  );

  const reservarOrden = (clave: string, cuantas: number) => {
    const desde = ordenRef.current[clave] ?? 0;
    ordenRef.current[clave] = desde + cuantas;
    return desde;
  };

  const agregarFotos = useCallback(
    (clave: string, archivos: File[]) => {
      const libres = MAX_FOTOS - (fotosRef.current[clave]?.length ?? 0) - (llegandoRef.current[clave]?.fotos ?? 0);
      const tomadas = soloImagenes(archivos).slice(0, Math.max(0, libres));
      if (tomadas.length === 0) return;
      const desde = reservarOrden(clave, tomadas.length);
      sumarLlegando(clave, tomadas.length);
      tomadas.forEach((archivo, k) => {
        void ponerFoto(clave, archivo, desde + k).finally(() => sumarLlegando(clave, -1));
      });
    },
    [ponerFoto, sumarLlegando],
  );

  /** Baja las fotos de un aviso o de la celda del Excel, en orden, y las pone. */
  const traerFotos = useCallback(
    (clave: string, urls: string[]) => {
      const todas = urls.slice(0, MAX_FOTOS);
      if (todas.length === 0) return;
      sumarLlegando(clave, 0, { listas: 0, total: todas.length });
      void traerDeAPocos(async () => {
        const desde = reservarOrden(clave, todas.length);
        for (let k = 0; k < todas.length; k += 1) {
          if (!inmueblesRef.current.some((i) => i.clave === clave)) break;
          const archivo = await traerFotoComoArchivo(todas[k], `foto-${k + 1}`);
          if (archivo) {
            sumarLlegando(clave, 1);
            await ponerFoto(clave, archivo, desde + k).finally(() => sumarLlegando(clave, -1));
          }
          sumarLlegando(clave, 0, { listas: k + 1, total: todas.length });
        }
        sumarLlegando(clave, 0, null);
      });
    },
    [ponerFoto, sumarLlegando, traerDeAPocos],
  );

  const quitarFoto = useCallback(
    (clave: string, id: string) => {
      setFotos((todas) => ({ ...todas, [clave]: (todas[clave] ?? []).filter((f) => f.id !== id) }));
      void almacen.borrar([id]);
    },
    [almacen],
  );

  const marcarSubida = useCallback(
    (clave: string, id: string) => {
      setFotos((todas) => {
        const lista = (todas[clave] ?? []).map((f) => (f.id === id ? { ...f, subida: true } : f));
        const foto = lista.find((f) => f.id === id);
        if (foto) void almacen.guardar([foto]);
        return { ...todas, [clave]: lista };
      });
    },
    [almacen],
  );

  // ── El punto en el mapa ──────────────────────────────────────────────────
  /** Le pone el punto a un inmueble ya publicado. Si falla, queda anotado para la próxima: nunca frena nada. */
  const ponerPunto = useCallback(
    (id: string, clave: string, i: InmuebleRapido) => {
      if (i.latitud == null || i.longitud == null) {
        // No se encontró en el mapa: no hay punto que poner.
        quitarPorUbicar(usuario, id);
        return;
      }
      creadoConPunto.current[clave] = true;
      const gemela = gemelos.current[id] ?? i.idGemelo;
      if (gemela) void propertiesApi.update(gemela, { latitude: i.latitud, longitude: i.longitud }).catch(() => undefined);
      void propertiesApi
        .update(id, { latitude: i.latitud, longitude: i.longitud })
        .then(() => quitarPorUbicar(usuario, id))
        .catch(() => {
          creadoConPunto.current[clave] = false;
        });
    },
    [usuario],
  );

  /**
   * Ubica UNA tarjeta con la regla del importador del panel (`ubicarDireccion`:
   * nunca un punto en otro departamento). Devuelve la tarjeta con su punto; si
   * la dirección cambió mientras se buscaba, no pisa lo nuevo.
   */
  const ubicar = useCallback(
    (clave: string): Promise<InmuebleRapido | null> =>
      ubicarDeAUna(async () => {
        const i = inmueblesRef.current.find((x) => x.clave === clave);
        if (!i) return null;
        if (i.ubicado || (i.latitud != null && i.longitud != null) || !i.direccion.trim()) return i;
        const buscada = i.direccion;
        const u = await ubicarDireccion({ direccion: i.direccion, ciudad: i.ciudad }).catch(() => ({ precision: 'ninguna' as const, lat: undefined, lng: undefined }));
        await new Promise((r) => window.setTimeout(r, ESPERA_ENTRE_BUSQUEDAS_MS));
        const ahora = inmueblesRef.current.find((x) => x.clave === clave);
        if (!ahora || ahora.direccion !== buscada) return ahora ?? null;
        const conPunto: InmuebleRapido = {
          ...ahora,
          ubicado: u.precision,
          ...(u.lat != null && u.lng != null ? { latitud: u.lat, longitud: u.lng } : {}),
        };
        cambiar(clave, { ubicado: conPunto.ubicado, latitud: conPunto.latitud, longitud: conPunto.longitud });
        // Ya publicado sin punto (no se lo hizo esperar): el punto se le pone ahora.
        if (ahora.idCreado && !creadoConPunto.current[clave]) ponerPunto(ahora.idCreado, clave, conPunto);
        return conPunto;
      }),
    [cambiar, ponerPunto, ubicarDeAUna],
  );

  const ubicarEnSegundoPlano = (claves: string[]) => {
    for (const c of claves) void ubicar(c);
  };

  // ── Tarjetas ─────────────────────────────────────────────────────────────
  const esVacia = (i: InmuebleRapido) =>
    !i.idCreado && !i.origen && !i.direccion.trim() && !i.precio && !i.descripcion.trim() && !(fotosRef.current[i.clave]?.length) && !llegandoRef.current[i.clave];

  /** Suma tarjetas; si sólo hay una y está en blanco, la reemplaza. Devuelve cuántas entraron. */
  const sumarTarjetas = (nuevas: InmuebleRapido[]): InmuebleRapido[] => {
    const actuales = inmueblesRef.current;
    const base = actuales.length === 1 && esVacia(actuales[0]) ? [] : actuales;
    const caben = Math.max(0, MAX_INMUEBLES - base.length);
    const entran = nuevas.slice(0, caben);
    setRecortados(nuevas.length - entran.length);
    const lista = [...base, ...entran];
    inmueblesRef.current = lista;
    setInmuebles(lista);
    setFiltro('todos');
    setAbierta(null);
    return entran;
  };

  const agregar = () => {
    if (inmuebles.length >= MAX_INMUEBLES) return;
    const ultimo = inmuebles[inmuebles.length - 1];
    const nueva = inmuebleVacio(nuevaClave(), { operacion: ultimo?.operacion, tipo: ultimo?.tipo, ciudad: ultimo?.ciudad });
    setInmuebles((lista) => [...lista, nueva]);
    setAbierta(nueva.clave);
    setFiltro('todos');
  };

  /**
   * Quitar una tarjeta (Nico, 28-10: «ya al llenar el inmueble no se puede borrar»). Siempre se puede: si era la única,
   * queda una en blanco. Con datos o fotos, se confirma primero; lo ya publicado no se toca (su tarjeta no lo ofrece).
   */
  const quitar = async (clave: string) => {
    const i = inmueblesRef.current.find((x) => x.clave === clave);
    const conAlgo = (i && !esVirgen(i)) || (fotosRef.current[clave]?.length ?? 0) > 0;
    if (conAlgo) {
      const ok = await confirmar({
        tipo: 'destructivo',
        titulo: '¿Quitamos este inmueble?',
        descripcion: 'Se borran de aquí sus datos y sus fotos. Si quieres, lo vuelves a traer o a llenar.',
        accion: 'Quitar',
      });
      if (!ok) return;
    }
    setInmuebles((lista) => (lista.length === 1 ? [inmuebleVacio(nuevaClave(), { operacion: lista[0].operacion })] : lista.filter((x) => x.clave !== clave)));
    const ids = (fotosRef.current[clave] ?? []).map((f) => f.id);
    setFotos((f) => {
      const { [clave]: _fuera, ...resto } = f;
      return resto;
    });
    if (ids.length) void almacen.borrar(ids);
    if (abierta === clave) setAbierta(null);
  };

  // ── Los tres caminos para traer muchos ──────────────────────────────────
  const traerEnlaces = async (urls: string[], alAvanzar: (l: number, t: number) => void): Promise<ResultadoDeEnlaces> => {
    const resultados = await leerEnlaces(urls, alAvanzar);
    const nuevas: Array<{ inmueble: InmuebleRapido; fotos: string[] }> = [];
    resultados.forEach((r, k) => {
      if (!r.ok) return;
      nuevas.push(
        desdeImportProperty(
          aImportProperty(r.inmueble, k),
          nuevaClave(),
          { tipo: 'enlace', etiqueta: hostDe(r.url), url: r.url },
          operacionPorDefecto(),
        ),
      );
    });
    const entraron = new Set(sumarTarjetas(nuevas.map((n) => n.inmueble)).map((i) => i.clave));
    for (const n of nuevas) if (entraron.has(n.inmueble.clave)) traerFotos(n.inmueble.clave, n.fotos);
    ubicarEnSegundoPlano([...entraron]);
    return { creados: entraron.size, fallidos: resultados.filter((r): r is Extract<typeof r, { ok: false }> => !r.ok) };
  };

  const leerExcel = async (archivo: File): Promise<ResultadoDelExcel> => {
    const { rows, headers } = await parseSpreadsheetFile(archivo);
    const mapeos = autoMapColumns(headers, rows);
    const destinos = new Set(mapeos.map((m) => m.targetField).filter(Boolean));
    const columnasQueFaltan = [
      ...(destinos.has('propertyAddress') ? [] : ['la dirección']),
      ...(destinos.has('monthlyRent') || destinos.has('salePrice') ? [] : ['el precio']),
    ];
    const nuevas = mapRowsToProperties(rows, mapeos)
      .filter((p) => p.propertyAddress || p.monthlyRent || p.salePrice || p.propertyType || p.externalId)
      .map((p) => desdeImportProperty(p, nuevaClave(), { tipo: 'excel', etiqueta: `Fila ${p._rowIndex + 1}` }, operacionPorDefecto()));
    const entraron = new Set(sumarTarjetas(nuevas.map((n) => n.inmueble)).map((i) => i.clave));
    let conFotosEnLaCelda = 0;
    for (const n of nuevas) {
      if (!entraron.has(n.inmueble.clave) || n.fotos.length === 0) continue;
      conFotosEnLaCelda += 1;
      traerFotos(n.inmueble.clave, n.fotos);
    }
    ubicarEnSegundoPlano([...entraron]);
    const conFaltantes = nuevas.filter((n) => entraron.has(n.inmueble.clave) && loQueFalta(n.inmueble, 1).length > 0).length;
    return { filas: rows.length, creados: entraron.size, conFaltantes, conFotosEnLaCelda, columnasQueFaltan };
  };

  const soltarCarpetas = async (archivos: ArchivoConRuta[]): Promise<ResultadoDeCarpetas> => {
    const carpetas = agruparPorCarpeta(archivos);
    const { asignadas, nuevas } = acomodarCarpetas(
      carpetas,
      inmueblesRef.current,
      (c) => (fotosRef.current[c]?.length ?? 0) + (llegandoRef.current[c]?.fotos ?? 0),
    );
    for (const a of asignadas) agregarFotos(a.clave, a.carpeta.fotos);
    const ultimo = inmueblesRef.current[inmueblesRef.current.length - 1];
    const tarjetas = nuevas.map((c) => ({
      inmueble: {
        ...inmuebleVacio(nuevaClave(), { operacion: ultimo?.operacion, tipo: ultimo?.tipo, ciudad: ultimo?.ciudad }),
        // Si la carpeta se llama como una dirección («Cra 76 # 34-21»), ésa es la dirección.
        ...(normalizarDireccionCo(c.nombre) ? { direccion: c.nombre.slice(0, 300) } : {}),
        origen: { tipo: 'carpeta' as const, etiqueta: c.nombre },
      },
      carpeta: c,
    }));
    const entraron = new Set(sumarTarjetas(tarjetas.map((t) => t.inmueble)).map((i) => i.clave));
    for (const t of tarjetas) if (entraron.has(t.inmueble.clave)) agregarFotos(t.inmueble.clave, t.carpeta.fotos);
    ubicarEnSegundoPlano([...entraron]);
    return { carpetas: carpetas.length, acomodadas: asignadas.length, nuevas: entraron.size };
  };

  // ── Lo que se cuenta ─────────────────────────────────────────────────────
  const cuantasFotos = (clave: string) => fotos[clave]?.length ?? 0;
  const llega = (clave: string) => (llegando[clave]?.fotos ?? 0) > 0 || !!llegando[clave]?.trayendo;
  const porPublicar = inmuebles.filter((i) => estados[i.clave]?.que !== 'publicado');
  const listos = porPublicar.filter((i) => !llega(i.clave) && (i.idCreado || loQueFalta(i, cuantasFotos(i.clave)).length === 0));
  const publicados = inmuebles.filter((i) => estados[i.clave]?.que === 'publicado');
  const todosPublicados = inmuebles.length > 0 && publicados.length === inmuebles.length;
  const avisarMomento = useRef(alCambiarDeMomento);
  avisarMomento.current = alCambiarDeMomento;
  useEffect(() => {
    avisarMomento.current?.(todosPublicados);
  }, [todosPublicados]);
  const repetidas = useMemo(() => direccionesRepetidas(inmuebles), [inmuebles]);
  const numeroDe = useMemo(() => new Map(inmuebles.map((i, n) => [i.clave, n + 1])), [inmuebles]);
  const pendientesConFaltantes: InmuebleConFaltantes[] = porPublicar
    .filter((i) => !i.idCreado && !llega(i.clave))
    .map((i) => ({ inmueble: i, numero: numeroDe.get(i.clave) ?? 0, faltan: loQueFalta(i, cuantasFotos(i.clave)) }))
    .filter((p) => p.faltan.length > 0);
  /** Lleva al inmueble al que le falta algo: en la lista lo abre; con uno solo, baja hasta su tarjeta. */
  const irALoQueFalta = (clave: string) => {
    if (modoLista) {
      setFiltro('faltan');
      setBusqueda('');
      setAbierta(clave);
    }
    const n = numeroDe.get(clave);
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`[data-testid="tarjeta-inmueble-${n}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };
  const hayLlegando = Object.keys(llegando).length > 0;
  const porUbicar = inmuebles.filter((i) => i.direccion.trim() && !i.ubicado && (i.latitud == null || i.longitud == null)).length;
  const modoLista = inmuebles.length > POCOS;
  /** «Traer muchos» va arriba si se llegó por ese camino, si se abrió o si ya se trajo algo; si no, una línea abajo. */
  const traerArriba = Boolean(caminoInicial) || verTraer || inmuebles.some((i) => Boolean(i.origen));

  const enCadaFiltro = useMemo(() => {
    const cuenta: Record<Filtro, number> = { todos: inmuebles.length, faltan: 0, listos: 0, error: 0, publicados: 0 };
    for (const i of inmuebles) {
      const e = estados[i.clave]?.que;
      if (e === 'publicado') cuenta.publicados += 1;
      else if (e === 'fallo') cuenta.error += 1;
      else if (loQueFalta(i, fotos[i.clave]?.length ?? 0).length === 0) cuenta.listos += 1;
      else cuenta.faltan += 1;
    }
    return cuenta;
  }, [inmuebles, estados, fotos]);
  /** Buscador, filtros y completar en bloque: con muchos, o cuando algo falló (para ver sólo esos). */
  const conHerramientas = inmuebles.length > MUCHOS || enCadaFiltro.error > 0;

  const visibles = inmuebles.filter((i) => {
    // La que se está editando no desaparece al completarse: se queda hasta plegarla.
    if (!modoLista || filtro === 'todos' || i.clave === abierta) return true;
    const e = estados[i.clave]?.que;
    if (filtro === 'publicados') return e === 'publicado';
    if (filtro === 'error') return e === 'fallo';
    if (e === 'publicado' || e === 'fallo') return false;
    const completo = loQueFalta(i, cuantasFotos(i.clave)).length === 0;
    return filtro === 'listos' ? completo : !completo;
  });

  const buscados = useMemo(() => {
    const q = sinTildes(busqueda);
    if (!modoLista || !q) return visibles;
    return visibles.filter((i) => i.clave === abierta || sinTildes(`${i.direccion} ${i.barrio} ${i.ciudad} ${i.codigo ?? ''}`).includes(q));
  }, [visibles, busqueda, modoLista, abierta]);
  const paginaReal = Math.min(pagina, Math.max(1, Math.ceil(buscados.length / POR_PAGINA)));
  const enPantalla = modoLista ? buscados.slice((paginaReal - 1) * POR_PAGINA, paginaReal * POR_PAGINA) : buscados;

  // Publicado ya está; lo que falta es el punto en el mapa de algunos: también se avisa.
  useAvisoAlSalir(publicando || hayLlegando || (cargado && porUbicar > 0 && publicados.length > 0));

  // ── Publicar ─────────────────────────────────────────────────────────────
  const publicarTodos = async () => {
    setIntento(true);
    if (publicando) return;
    setPublicadosAhora(0);
    if (listos.length === 0) {
      if (modoLista) setFiltro('faltan');
      setVerQueFalta(true);
      return;
    }
    setPublicando(true);
    setCorrida(listos.map((i) => i.clave));
    ubicarEnSegundoPlano(listos.filter((i) => !i.ubicado && (i.latitud == null || i.longitud == null)).map((i) => i.clave));
    setAbierta(null);
    const trabajos = listos.map((i) => ({
      clave: i.clave,
      llave: i.llave,
      datos: i.clave,
      idCreado: i.idCreado,
      fotos: (fotos[i.clave] ?? []).map((f) => ({ id: f.id, archivo: f.archivo, subida: f.subida })),
    }));
    const resultados = await publicarEnTandas(
      trabajos,
      {
        // Se crea con lo que haya YA: el mapa no hace esperar a nadie. Si todavía no
        // tiene punto, se lo pone `ubicar` apenas lo encuentre.
        crear: async (clave, llave) => {
          const i = inmueblesRef.current.find((x) => x.clave === clave);
          if (!i) throw new Error('La tarjeta ya no está.');
          creadoConPunto.current[clave] = i.latitud != null && i.longitud != null;
          type Crear = Parameters<typeof propertiesApi.create>[0];
          if (i.operacion !== 'ambos') return propertiesApi.create(paraCrear(i) as Crear, { idempotencyKey: llave });
          // «Arriendo y venta» (Nico, 28-10): dos publicaciones con las mismas fotos. La de venta tiene su propia llave,
          // derivada de la de la tarjeta: reintentar no crea otra.
          const arriendo = await propertiesApi.create(paraCrear(i, 'rent') as Crear, { idempotencyKey: llave });
          const venta = await propertiesApi.create(paraCrear(i, 'sale') as Crear, { idempotencyKey: `${llave}-venta` });
          gemelos.current[arriendo.id] = venta.id;
          cambiar(clave, { idGemelo: venta.id });
          return arriendo;
        },
        subirFoto: async (id, archivo) => {
          const subida = await propertiesApi.uploadImage(id, archivo);
          // La misma foto a la publicación de venta. Si ésa falla, la de arriendo ya quedó: se intenta otra vez y, si no,
          // la de venta queda con menos fotos (se agregan desde el panel) en vez de repetir la foto en la de arriendo.
          const gemela = gemelos.current[id] ?? inmueblesRef.current.find((x) => x.idCreado === id)?.idGemelo;
          if (gemela) {
            await propertiesApi.uploadImage(gemela, archivo).catch(() => propertiesApi.uploadImage(gemela, archivo).catch(() => undefined));
          }
          return subida;
        },
        cuantasTiene: async (id) => (await propertiesApi.getImages(id)).length,
        motivo: (error, que) =>
          que === 'crear'
            ? mensajeParaLaPersona(error, { porDefecto: 'No se pudo publicar. Intenta de nuevo.', accion: 'publicar el inmueble' })
            : mensajeParaLaPersona(error, { porDefecto: 'No se pudo subir', accion: 'subir la foto' }),
      },
      {
        alEmpezar: (c) => setEstados((e) => ({ ...e, [c]: { que: 'publicando' } })),
        alCrear: (c, id) => {
          cambiar(c, { idCreado: id });
          const ahora = inmueblesRef.current.find((x) => x.clave === c);
          // El punto llegó mientras se creaba: se le pone ya.
          if (ahora && !creadoConPunto.current[c] && ahora.latitud != null && ahora.longitud != null) ponerPunto(id, c, ahora);
        },
        alSubirFoto: marcarSubida,
        alTerminar: (c, r) => {
          setEstados((e) => ({ ...e, [c]: r }));
          if (r.que !== 'publicado') return;
          void almacen.borrar((fotosRef.current[c] ?? []).map((f) => f.id));
          const i = inmueblesRef.current.find((x) => x.clave === c);
          // Publicado sin punto: queda anotado por si la pestaña se cierra antes de ubicarlo.
          if (i && !i.ubicado && (i.latitud == null || i.longitud == null) && i.direccion.trim()) {
            anotarPorUbicar(usuario, { id: r.id, direccion: i.direccion, ciudad: i.ciudad });
          }
        },
      },
      { aLaVez: 4 },
    );
    setPublicando(false);
    setCorrida(null);
    // Si algo falló, lo primero que se ve es eso.
    if (modoLista) setFiltro([...resultados.values()].some((r) => r.que === 'fallo') ? 'error' : 'todos');
    // Los que no estaban listos se quedaron: se dice cuáles y qué les falta.
    setPublicadosAhora([...resultados.values()].filter((r) => r.que === 'publicado').length);
    setVerQueFalta(true);
  };

  // El que publicó todo vuelve a empezar con una tarjeta en blanco.
  const publicarMas = () => {
    const ultimo = inmuebles[inmuebles.length - 1];
    const nueva = inmuebleVacio(nuevaClave(), { operacion: ultimo?.operacion, tipo: ultimo?.tipo, ciudad: ultimo?.ciudad });
    setInmuebles([nueva]);
    setFotos({});
    setEstados({});
    setIntento(false);
    setFiltro('todos');
    setAbierta(null);
    window.scrollTo({ top: 0 });
  };

  if (todosPublicados) {
    return (
      <TodoPublicado
        inmuebles={publicados}
        idDe={(c) => {
          const e = estados[c];
          return e && e.que === 'publicado' ? e.id : null;
        }}
        fotosDe={(c) => fotos[c] ?? []}
        paginaPublica={paginaPublica}
        porUbicar={porUbicar}
        alTerminar={alTerminar}
        alPublicarMas={publicarMas}
      />
    );
  }

  // El avance de la corrida en curso.
  const enLaCorrida = corrida ? inmuebles.filter((i) => corrida.includes(i.clave)) : [];
  const hechos = enLaCorrida.filter((i) => ['publicado', 'fallo'].includes(estados[i.clave]?.que ?? '')).length;
  const fotosDeLaCorrida = enLaCorrida.flatMap((i) => fotos[i.clave] ?? []);
  const fotosArriba = fotosDeLaCorrida.filter((f) => f.subida).length;
  // Cada inmueble terminado y cada foto arriba cuentan como un paso.
  const pasos = enLaCorrida.length + fotosDeLaCorrida.length;
  const porcentaje = pasos ? Math.round(((hechos + fotosArriba) / pasos) * 100) : 0;

  const tarjeta = (i: InmuebleRapido) => (
    <TarjetaDeInmueble
      numero={numeroDe.get(i.clave) ?? 0}
      inmueble={i}
      fotos={fotos[i.clave] ?? []}
      llegando={llegando[i.clave]}
      estado={estados[i.clave] ?? { que: 'borrador' }}
      repetidaCon={repetidas.get(i.clave)}
      mostrarFaltantes={intento}
      alCambiar={(p) => cambiar(i.clave, p)}
      alAgregarFotos={(f) => agregarFotos(i.clave, f)}
      alQuitarFoto={(id) => quitarFoto(i.clave, id)}
      alQuitar={inmuebles.length > 1 || !esVirgen(i) || (fotos[i.clave]?.length ?? 0) > 0 ? () => void quitar(i.clave) : undefined}
      alPlegar={modoLista ? () => setAbierta(null) : undefined}
    />
  );

  return (
    <div className="mx-auto w-full max-w-[760px] pb-40" data-testid="publicador-rapido">
      <p className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-fg-subtle">
        <i className="inline-block size-2 rounded-[2px] bg-primary" aria-hidden="true" />
        Publica gratis
      </p>
      <h1 className="mt-4 text-[30px] font-medium leading-[1.08] tracking-[-0.03em] text-fg sm:text-[36px]" data-testid="titulo-publicador">
        {inmuebles.length > 1 ? `Tus ${inmuebles.length.toLocaleString('es-CO')} inmuebles` : 'Tu inmueble'}
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-fg-subtle">Lo justo para salir en el marketplace. Lo demás lo completas cuando quieras.</p>
      {recuperado && (
        <p className="mt-4 rounded-md bg-info-soft px-4 py-2.5 text-[13px] text-info" role="status">
          Recuperamos lo que dejaste: {recuperado.inmuebles === 1 ? '1 inmueble' : `${recuperado.inmuebles} inmuebles`}
          {recuperado.fotos > 0 ? ` y ${recuperado.fotos === 1 ? '1 foto' : `${recuperado.fotos} fotos`}` : ''}.
        </p>
      )}
      {recortados > 0 && (
        <p className="mt-4 rounded-md bg-warning-soft px-4 py-2.5 text-[13px] text-warning" role="status">
          Caben {MAX_INMUEBLES} por vez: quedaron {recortados.toLocaleString('es-CO')} afuera. Publica estos y tráelos después.
        </p>
      )}

      {traerArriba && (
        <div className="mt-6">
          <TraerMuchos inicial={caminoInicial} alTraerEnlaces={traerEnlaces} alLeerExcel={leerExcel} alSoltarCarpetas={soltarCarpetas} />
        </div>
      )}

      {modoLista ? (
        <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface" data-testid="lista-de-muchos">
          {/* La barra va unida a la lista: buscar, agregar y los filtros con su conteo (con muchos o con errores). */}
          {conHerramientas && (
          <>
          <div className="flex flex-col gap-2.5 border-b border-border p-3 sm:flex-row sm:items-center">
            <SearchInput
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPagina(1);
              }}
              onClear={() => {
                setBusqueda('');
                setPagina(1);
              }}
              placeholder="Buscar por dirección, barrio o código"
              aria-label="Buscar en tus inmuebles"
              className="min-w-0 flex-1"
              data-testid="buscar-en-la-lista"
            />
            {inmuebles.length < MAX_INMUEBLES && (
              <Button type="button" variant="secondary" onClick={agregar} className="shrink-0" data-testid="agregar-otro-inmueble">
                <Plus size={16} weight="bold" aria-hidden="true" className="mr-1.5" />
                Agregar otro
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 px-3 pt-3" role="tablist" aria-label="Filtrar">
            {(
              [
                ['todos', 'Todos'],
                ['faltan', 'Les falta algo'],
                ['listos', 'Listos'],
                ['error', 'Con error'],
                ['publicados', 'Publicados'],
              ] as const
            )
              // El filtro puesto se ve aunque quede en 0: si no, no se sabe por qué la lista está corta.
              .filter(([f]) => f === 'todos' || f === filtro || enCadaFiltro[f] > 0)
              .map(([f, t]) => (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  aria-selected={filtro === f}
                  onClick={() => {
                    setFiltro(f);
                    setPagina(1);
                  }}
                  className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors duration-fast',
                    filtro === f ? 'border-fg bg-fg text-bg' : 'border-border bg-surface text-fg-muted hover:text-fg',
                    f === 'error' && filtro !== f && 'text-danger',
                  )}
                  data-testid={`filtro-${f}`}
                >
                  {t}
                  <span className="font-mono text-[11.5px] opacity-70">{enCadaFiltro[f].toLocaleString('es-CO')}</span>
                </button>
              ))}
          </div>
          </>
          )}
          <div className="px-3">
            <CompletarEnBloque
              pendientes={porPublicar.filter((i) => !i.idCreado)}
              alPonerTipo={(claves, tipo) => setInmuebles((l) => l.map((i) => (claves.has(i.clave) ? { ...i, tipo } : i)))}
              alPonerCiudad={(claves, ciudad) => setInmuebles((l) => l.map((i) => (claves.has(i.clave) ? { ...i, ciudad } : i)))}
            />
          </div>
          <div className="space-y-2 p-3" data-testid="lista-de-inmuebles">
            {enPantalla.map((i) =>
              abierta === i.clave ? (
                <div key={i.clave}>{tarjeta(i)}</div>
              ) : (
                <FilaDeInmueble
                  key={i.clave}
                  numero={numeroDe.get(i.clave) ?? 0}
                  inmueble={i}
                  fotos={fotos[i.clave] ?? []}
                  llegando={llegando[i.clave]}
                  estado={estados[i.clave] ?? { que: 'borrador' }}
                  repetidaCon={repetidas.get(i.clave)}
                  mostrarFaltantes={intento}
                  alAbrir={() => setAbierta(i.clave)}
                />
              ),
            )}
            {enPantalla.length === 0 && (
              <VacioChico
                className="justify-center py-8"
                titulo={busqueda ? 'Ninguno coincide con lo que buscas.' : 'No hay inmuebles en este filtro.'}
                ilustracion="lupa"
              />
            )}
          </div>
          {buscados.length > POR_PAGINA && (
            <div className="border-t border-border px-3 py-2.5">
              <Pagination total={buscados.length} page={paginaReal} pageSize={POR_PAGINA} onPageChange={setPagina} data-testid="paginas-de-la-lista" />
            </div>
          )}
        </section>
      ) : (
        <div className="mt-8 space-y-5">
          <AnimatePresence initial={false}>
            {inmuebles.map((i) => (
              <motion.div
                key={i.clave}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8, transition: { duration: motionDuration.fast, ease: motionEase.exit } }}
                transition={{ duration: motionDuration.slow, ease: motionEase.enter }}
              >
                {tarjeta(i)}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {!conHerramientas && inmuebles.length < MAX_INMUEBLES && (
        <button
          type="button"
          onClick={agregar}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong py-5 text-[15px] font-medium text-fg-muted transition-colors duration-fast hover:border-primary hover:bg-primary-soft hover:text-primary"
          data-testid="agregar-otro-inmueble"
        >
          <Plus size={18} weight="bold" aria-hidden="true" />
          Agregar otro inmueble
        </button>
      )}

      {!traerArriba && (
        <button
          type="button"
          onClick={() => {
            setVerTraer(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="group mt-8 flex w-full items-center justify-between gap-4 rounded-2xl border border-border bg-surface px-5 py-4 text-left transition-colors duration-fast hover:border-primary/40"
          data-testid="abrir-traer-muchos"
        >
          <span>
            <span className="block text-[15px] font-medium text-fg">¿Tienes muchos inmuebles?</span>
            <span className="mt-0.5 block text-[13.5px] text-fg-subtle">Tráelos de tu página web, de un Excel o de carpetas con fotos.</span>
          </span>
          <span className="shrink-0 text-[14px] font-medium text-primary group-hover:underline">Traerlos</span>
        </button>
      )}

      {/* El pie fijo: cuántos van y publicar; mientras publica, el avance. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
        <LoQueFaltaParaPublicar
          abierto={verQueFalta && !publicando}
          pendientes={pendientesConFaltantes}
          publicadosAhora={publicadosAhora}
          alIr={irALoQueFalta}
          alCerrar={() => setVerQueFalta(false)}
        />
        {publicando && (
          <div className="absolute inset-x-0 top-0 h-[3px] bg-surface-muted" aria-hidden="true">
            <div className="h-full bg-primary transition-[width] duration-500 ease-out" style={{ width: `${porcentaje}%` }} data-testid="barra-de-avance" />
          </div>
        )}
        <div className="mx-auto flex w-full max-w-[760px] items-center justify-between gap-4">
          {publicando ? (
            <p className="text-[14px] text-fg-muted" role="status" data-testid="avance-publicando">
              Publicando <span className="font-mono font-medium text-fg">{hechos.toLocaleString('es-CO')}</span> de{' '}
              <span className="font-mono">{enLaCorrida.length.toLocaleString('es-CO')}</span>
              {fotosDeLaCorrida.length > 0 && (
                <span className="hidden sm:inline">
                  {' '}
                  · <span className="font-mono">{fotosArriba.toLocaleString('es-CO')}</span> de{' '}
                  <span className="font-mono">{fotosDeLaCorrida.length.toLocaleString('es-CO')}</span> fotos
                </span>
              )}
            </p>
          ) : (
            <p className="text-[14px] text-fg-muted" data-testid="cuantos-listos">
              <span className="font-mono font-medium text-fg">{listos.length.toLocaleString('es-CO')}</span> de{' '}
              <span className="font-mono">{porPublicar.length.toLocaleString('es-CO')}</span> {porPublicar.length === 1 ? 'listo' : 'listos'} para publicar
              {hayLlegando && <span className="hidden sm:inline"> · preparando fotos…</span>}
            </p>
          )}
          <Button
            type="button"
            onClick={() => void publicarTodos()}
            disabled={publicando}
            className="h-12 shrink-0 rounded-full px-7 text-[15px] shadow-[0_12px_32px_-12px_rgba(26,64,255,0.65)]"
            data-testid="publicar-todos"
          >
            {publicando ? (
              <>
                <SpinnerGap className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Publicando…
              </>
            ) : listos.length > 1 ? (
              `Publicar los ${listos.length.toLocaleString('es-CO')}`
            ) : (
              'Publicar'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Completar en bloque lo que se repite (el tipo, la ciudad) cuando les falta a
 * varios. La dirección y el precio nunca: son distintos en cada inmueble.
 */
function CompletarEnBloque({
  pendientes,
  alPonerTipo,
  alPonerCiudad,
}: {
  pendientes: InmuebleRapido[];
  alPonerTipo: (claves: Set<string>, tipo: TipoRapido) => void;
  alPonerCiudad: (claves: Set<string>, ciudad: string) => void;
}) {
  const sinTipo = pendientes.filter((i) => !i.tipo);
  const sinCiudad = pendientes.filter((i) => !i.ciudad.trim());
  const [ciudad, setCiudad] = useState('');
  if (sinTipo.length < 2 && sinCiudad.length < 2) return null;
  return (
    <div className="mt-4 space-y-3 rounded-lg border border-border bg-surface-muted/50 p-4" data-testid="completar-en-bloque">
      {sinTipo.length >= 2 && (
        <div>
          <p className="text-[13px] font-medium text-fg-muted">
            A {sinTipo.length.toLocaleString('es-CO')} les falta el tipo. ¿Son todos iguales?
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {TIPOS.map((t) => (
              <Pastilla
                key={t.valor}
                activa={false}
                onClick={() => alPonerTipo(new Set(sinTipo.map((i) => i.clave)), t.valor)}
                testId={`bloque-tipo-${t.valor}`}
              >
                {t.nombre}
              </Pastilla>
            ))}
          </div>
        </div>
      )}
      {sinCiudad.length >= 2 && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (ciudad.trim()) alPonerCiudad(new Set(sinCiudad.map((i) => i.clave)), ciudad.trim().slice(0, 50));
          }}
        >
          <span className="text-[13px] font-medium text-fg-muted">A {sinCiudad.length.toLocaleString('es-CO')} les falta la ciudad:</span>
          <input
            value={ciudad}
            onChange={(e) => setCiudad(e.target.value)}
            placeholder="Medellín"
            maxLength={50}
            className="h-9 w-44 rounded-full border border-border bg-surface px-3.5 text-[13.5px] text-fg focus:border-primary focus:outline-none"
            data-testid="bloque-ciudad"
          />
          <Button type="submit" variant="secondary" disabled={!ciudad.trim()} className="h-9 rounded-full px-4 text-[13px]">
            Ponerla a los {sinCiudad.length.toLocaleString('es-CO')}
          </Button>
        </form>
      )}
    </div>
  );
}
