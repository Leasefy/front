'use client';

/**
 * Documentos — la pantalla al estándar del panel.
 *
 * Nico, mirando la versión anterior: «esa tabla tampoco es la que realmente
 * usamos nosotros, ¿y para qué el icono al lado del título? si no lo hacemos de
 * esa manera».
 *
 * Lo que cambió:
 *   · el título es `text-h2` y no lleva icono al lado;
 *   · las tres pestañas viven DENTRO de la card, como su primera fila, junto al
 *     buscador y los filtros — antes flotaban arriba, sueltas;
 *   · las tres listas son la tabla estándar (`@/components/ui/table`) con su
 *     paginación en el pie, no tarjetas ni una lista propia;
 *   · el vacío va dentro del `<TableBody>`, así los encabezados siguen a la
 *     vista y se entiende qué columnas tiene la tabla;
 *   · «Generar documento» abre un diálogo que genera de verdad: antes el menú
 *     listaba cinco tipos y cuatro respondían «próximamente».
 *
 * La vista de tarjetas se retiró: mostraba los mismos campos que la tabla, sin
 * paginación y sin acciones.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Archive, ClipboardText, DownloadSimple, Eye, FileText, Plus } from '@phosphor-icons/react';
import { toast } from '@/components/ui/toast';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { PageGuard } from '@/components/auth/PageGuard';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui';
import { IconButton, Presence, SearchInput } from '@leasefy/cadence';
import { Badge } from '@/components/ui/badge';
import { CifraHeroe } from '@/components/pantalla/CifraHeroe';
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla';
import { useTr } from '@/lib/i18n/use-tr';
import { localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado';
import { sinElNumeroRepetido } from '@/lib/pantalla/pestanas-sin-repetir';

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableCell,
  TableBodyAnimado,
  TableRowAnimada,
} from '@/components/ui/table';
import { TablePagination } from '@/components/ui/pagination';
import { useTablePagination, PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination';
import { useUltimoPresente } from '@/lib/hooks/use-ultimo-presente';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SinDatos } from '@/components/estado/SinDatos';
import { AlAnchoVisible } from '@/components/ui/al-ancho-visible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import { ActaEntregaForm, ActaEntregaViewer } from '@/components/inmobiliaria';
import { FotosYFirmasDelActa } from '@/components/inmobiliaria/FotosYFirmasDelActa';
import {
  CerrarActaSinFirma,
  sePuedeCerrarSinFirma,
} from '@/components/inmobiliaria/CerrarActaSinFirma';
import type { ActaEntrega } from '@/lib/types/inmobiliaria';
import { useActasEntrega, useConsignaciones, actasApi } from '@/lib/hooks/useInmobiliaria';
import { cuandoFueLaEntrega, type CuerpoParaCrearElActa } from '@/lib/actas/acta-del-back';
import {
  documentosLegalesApi,
  type CategoriaDeDocumento,
  type DocumentoGenerado,
  type EstadoDeDocumento,
  type PlantillaDeLaAgencia,
} from '@/lib/api/documentos.service';
import { GenerarDocumentoDialog } from '@/components/documentos/GenerarDocumentoDialog';
import { EditorDePlantilla } from '@/components/documentos/EditorDePlantilla';
import { useDocumentosLegales } from '@/components/documentos/useDocumentosLegales';
import { elAuxiliarNoFirma } from '@/lib/auth/lo-que-no-hacen-los-auxiliares';
import {
  CATEGORIA_LABEL,
  ESTADO_LABEL,
  FILTROS_VACIOS,
  etiquetaDePartes,
  etiquetaDelInmueble,
  identidadDelDocumento,
  filtrarDocumentos,
  hayFiltros,
  type FiltrosDeDocumentos,
} from '@/components/documentos/reglas';

type Pestana = 'documentos' | 'plantillas' | 'actas';

const CATEGORIAS: CategoriaDeDocumento[] = [
  'CONTRATO',
  'ACTA',
  'INVENTARIO',
  'CARTA',
  'POLIZA',
  'OTRO',
];

const ESTADOS: EstadoDeDocumento[] = [
  'DOC_DRAFT',
  'PENDING_SIGNATURE',
  'DOC_SIGNED',
  'DOC_EXPIRED',
];

/** El estado con el badge del sistema: color sólo en lo que pide algo (por firmar, vencido) y en lo firmado. */
const ESTADO_TONO: Record<EstadoDeDocumento, 'neutral' | 'warning' | 'success' | 'critical'> = {
  DOC_DRAFT: 'neutral',
  PENDING_SIGNATURE: 'warning',
  DOC_SIGNED: 'success',
  DOC_EXPIRED: 'critical',
};

const ACTA_ESTADO_LABEL: Record<ActaEntrega['status'], string> = {
  draft: 'Borrador',
  in_progress: 'En progreso',
  pending_signatures: 'Por firmar',
  completed: 'Completada',
};

/**
 * Ronda 30 (revisora r27, Documentos): el estado con el `Badge` de la casa, en tipo oración («Borrador»), como en
 * Inmuebles y Contratos (antes «● BORRADOR» en mayúsculas y en mono).
 */
const VARIANTE_DEL_TONO = {
  neutral: 'secondary',
  warning: 'warning',
  success: 'success',
  critical: 'destructive',
} as const;

const ACTA_ESTADO_TONO: Record<ActaEntrega['status'], 'neutral' | 'warning' | 'success'> = {
  draft: 'neutral',
  in_progress: 'neutral',
  pending_signatures: 'warning',
  completed: 'success',
};

/**
 * QA 20-10: a 1440 la tabla de documentos no cabe y «Ver PDF» y «Descargar»
 * quedaban escondidos a la derecha. La columna de acciones se queda fija (como
 * en Facturación) y la tabla se desliza por detrás; al pasar el mouse por la
 * fila, la celda fija toma el mismo fondo.
 */
const ACCIONES_FIJAS =
  'sticky right-0 z-10 bg-card group-hover:bg-surface-muted';
const ACCIONES_FIJAS_CABECERA =
  'sticky right-0 z-20 bg-bg';

function fechaCorta(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  // VOZ §4: «20 oct 2026», sin «de» ni punto.
  if (locale === 'es') return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]} ${d.getFullYear()}`;
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const;

const ESTADOS_DE_LA_URL = new Set<string>(['todos', ...ESTADOS]);

function DocumentosContent() {
  const { t, locale } = useI18n();
  const k = (s: string) => `inmobiliaria.documentos.legales.${s}`;

  const tr = useTr();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabInicial = searchParams.get('tab');
  const estadoInicial = searchParams.get('estado');
  const [pestana, setPestana] = useState<Pestana>(
    tabInicial === 'plantillas' || tabInicial === 'actas' ? tabInicial : 'documentos',
  );

  const { documentos, plantillas, cargando, error, recargar, agregar } = useDocumentosLegales();
  /*
   * 🔴 El error de las actas se PINTA, no se traga.
   *
   * Las actas se leen de `GET /inmobiliaria/actas`, que pide `portafolio:view`
   * — no `documentos:view`, que es lo que abre esta pantalla. Un CONTADOR tiene
   * `documentos: ['view']` y `portafolio: []`: entra acá, abre la pestaña y el
   * backend responde 403. Antes esta pantalla le pasaba `null` como error a
   * `EstadoDeDatos`, así que el 403 se veía como «Todavía no hay actas» — la
   * pantalla afirmando que la agencia no tiene actas cuando lo único cierto es
   * que esa persona no las puede ver.
   */
  const {
    actas,
    isLoading: cargandoActas,
    errorCrudo: errorActas,
    refetch: recargarActas,
  } = useActasEntrega();
  // El error de las consignaciones también se lee: el formulario del acta
  // elige el inmueble entre las arrendadas, y con la consulta caída el
  // selector salía vacío y filtrado en silencio.
  const { consignaciones, errorCrudo: errorConsignaciones } = useConsignaciones({ status: 'active' });
  /*
   * 🔴 D3 de la auditoría del 13-09, la mitad que faltaba: el selector del acta
   * SÓLO ofrece inmuebles arrendados —un acta de entrega se levanta sobre un
   * arriendo en curso, no sobre un inmueble disponible—, pero eso se filtraba
   * en silencio: quien tiene 40 inmuebles y ve 6 en la lista no sabe si el
   * resto se cayó, si no tiene permiso o si es a propósito. Ahora se dice, con
   * los dos números, y el caso «ninguno arrendado» tiene su propio texto en vez
   * de un selector vacío.
   */
  const arrendados = useMemo(
    () => consignaciones.filter((c) => c.availability === 'rented'),
    [consignaciones],
  );
  const noArrendados = consignaciones.length - arrendados.length;

  /*
   * Los dos permisos que gobiernan los botones de esta pantalla, y son
   * DISTINTOS: generar un documento pide `documentos:create`, levantar un acta
   * pide `portafolio:create` (`POST /inmobiliaria/actas`). Un CONTADOR no tiene
   * ninguno de los dos; un VIEWER, tampoco.
   */
  const { canAccess, agencyRole: agencyRoleDeLaPagina } = usePermissions();
  const puedeCrearDocumentos = canAccess('documentos', 'create');
  const puedeCrearActas = canAccess('portafolio', 'create');
  /* Editar y borrar plantillas son permisos PROPIOS en el back
     (`documentos:edit`, `documentos:delete`): un AGENTE puede tener `create` y
     no `delete`, y un botón visible sin permiso es un 403 disfrazado. */
  const puedeEditarPlantillas = canAccess('documentos', 'edit');
  const puedeBorrarPlantillas = canAccess('documentos', 'delete');

  /* GLOW UP 22-10 (revisora r24, Documentos #4): la pestaña, el estado y el texto viven en la URL —volver
     mañana o compartir el enlace deja la misma vista—, y sin estado en la URL se abre en lo que espera a
     alguien («Por firmar», si hay). */
  const [filtros, setFiltros] = useState<FiltrosDeDocumentos>(() => ({
    ...FILTROS_VACIOS,
    texto: searchParams.get('q') ?? '',
    estado:
      estadoInicial && ESTADOS_DE_LA_URL.has(estadoInicial)
        ? (estadoInicial as FiltrosDeDocumentos['estado'])
        : FILTROS_VACIOS.estado,
  }));
  const yaSeEligioElEstado = useRef(Boolean(estadoInicial));
  useEffect(() => {
    if (yaSeEligioElEstado.current || cargando) return;
    yaSeEligioElEstado.current = true;
    if (documentos.some((d) => d.status === 'PENDING_SIGNATURE')) {
      setFiltros((f) => ({ ...f, estado: 'PENDING_SIGNATURE' }));
    }
  }, [cargando, documentos]);
  useEffect(() => {
    const params = new URLSearchParams();
    if (pestana !== 'documentos') params.set('tab', pestana);
    if (pestana === 'documentos' && filtros.estado !== 'todos') params.set('estado', filtros.estado);
    if (pestana === 'documentos' && filtros.texto.trim()) params.set('q', filtros.texto.trim());
    const qs = params.toString();
    if (qs === (typeof window !== 'undefined' ? window.location.search.replace(/^\?/, '') : qs)) return;
    router.replace(qs ? `?${qs}` : '?', { scroll: false });
  }, [pestana, filtros.estado, filtros.texto, router]);
  /* La respuesta de la pantalla: lo que espera a alguien. */
  const cuenta = useMemo(() => {
    const de = (e: EstadoDeDocumento) => documentos.filter((d) => d.status === e).length;
    const borradores = de('DOC_DRAFT');
    const porFirmar = de('PENDING_SIGNATURE');
    const vencidos = de('DOC_EXPIRED');
    const firmados = de('DOC_SIGNED');
    return { borradores, porFirmar, vencidos, firmados, pendientes: borradores + porFirmar + vencidos };
  }, [documentos]);
  const cifra = (n: number) => n.toLocaleString(localeDeLasCifras());
  const [generarAbierto, setGenerarAbierto] = useState(false);
  const [plantillaAbierta, setPlantillaAbierta] = useState<PlantillaDeLaAgencia | null>(null);
  /** El molde (regla 5): la fila del documento abre su cajón. */
  const [documentoAbierto, setDocumentoAbierto] = useState<DocumentoGenerado | null>(null);
  /* El editor: `abierto` aparte de la plantilla porque una NUEVA es `null`, y
     `null` no puede significar a la vez «cerrado» y «una nueva». */
  const [editorAbierto, setEditorAbierto] = useState(false);
  const [plantillaEnEdicion, setPlantillaEnEdicion] = useState<PlantillaDeLaAgencia | null>(null);
  const [borrando, setBorrando] = useState<PlantillaDeLaAgencia | null>(null);
  const [actaAbierta, setActaAbierta] = useState<ActaEntrega | null>(null);
  const [cerrandoSinFirma, setCerrandoSinFirma] = useState<ActaEntrega | null>(null);
  const [nuevaActaAbierta, setNuevaActaAbierta] = useState(false);
  /** «Nueva acta» (el vacío de la pestaña y su botón de la cabecera). */
  const abrirNuevaActa = () => {
    if (errorConsignaciones) {
      toast.error('No se pudieron traer los inmuebles arrendados', {
        description: 'Sin ellos no se puede levantar un acta. Prueba de nuevo en un momento.',
      });
      return;
    }
    setNuevaActaAbierta(true);
  };

  /*
   * Los dos cajones se cerraban EN BLANCO. `open` ya estaba bien puesto
   * (`x !== null`), así que Radix animaba la salida — pero el cuerpo leía la
   * variable cruda, y en el mismo render en que se cierra ya vale `null`: el
   * contenido desaparecía de golpe y lo que se deslizaba afuera era un panel
   * vacío. `useUltimoPresente` lo sostiene mientras dura la animación.
   */
  const plantillaVisible = useUltimoPresente(plantillaAbierta);
  const actaVisible = useUltimoPresente(actaAbierta);
  /** ARREGLOS-3: después de una firma, el acta del cajón y la lista se vuelven a leer. */
  const refrescarElActa = async (id: string) => {
    void recargarActas();
    try {
      const nueva = await actasApi.getById(id);
      setActaAbierta((abierta) => (abierta && abierta.id === id ? nueva : abierta));
    } catch {
      // El cajón se queda con lo que tenía; la lista ya se pidió de nuevo.
    }
  };

  /* Las que escribió la inmobiliaria: `codigo === null`. Las del sistema se
     generan por su código y no se editan (el back responde 400), así que la
     distinción gobierna tanto los botones de la fila como lo que se ofrece al
     generar. */
  const propias = useMemo(() => plantillas.filter((p) => p.codigo === null), [plantillas]);

  const visibles = useMemo(() => filtrarDocumentos(documentos, filtros), [documentos, filtros]);

  const paginaDocumentos = useTablePagination(visibles, {
    resetKey: `${filtros.texto}|${filtros.categoria}|${filtros.estado}`,
  });
  const paginaPlantillas = useTablePagination(plantillas);
  const paginaActas = useTablePagination(actas);

  // El PDF va por `getBlob` porque la ruta pide el token en el encabezado: un
  // `<a href>` pelado responde 401. La pestaña se abre ANTES del await, o el
  // navegador la bloquea por no venir de un gesto directo.
  const verPdf = useCallback(
    async (doc: DocumentoGenerado) => {
      const ventana = window.open('', '_blank');
      try {
        const blob = await documentosLegalesApi.pdf(doc.id);
        const url = URL.createObjectURL(blob);
        if (ventana) {
          ventana.location.href = url;
        } else {
          window.location.href = url;
        }
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } catch (e: unknown) {
        ventana?.close();
        toast.error(t(k('errorPdf')), {
          description: mensajeParaLaPersona(e, { accion: 'abrir el PDF' }),
        });
      }
    },
    [t],
  );

  const descargarPdf = useCallback(
    async (doc: DocumentoGenerado) => {
      try {
        const blob = await documentosLegalesApi.pdf(doc.id);
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `${doc.name}.pdf`;
        document.body.appendChild(enlace);
        enlace.click();
        document.body.removeChild(enlace);
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } catch (e: unknown) {
        toast.error(t(k('errorPdf')), {
          description: mensajeParaLaPersona(e, { accion: 'descargar el PDF' }),
        });
      }
    },
    [t],
  );

  const duplicarPlantilla = useCallback(
    async (plantilla: PlantillaDeLaAgencia) => {
      try {
        const copia = await documentosLegalesApi.duplicarPlantilla(plantilla.id);
        await recargar();
        toast.success(`Se creó «${copia.name}»`, {
          description: 'La copia es tuya: ya se puede editar.',
        });
        // Se abre derecho en el editor: duplicar sin editar no sirve para nada,
        // y el nombre «(copia)» hay que cambiarlo igual.
        setPlantillaEnEdicion(copia);
        setEditorAbierto(true);
      } catch (e: unknown) {
        toast.error('No se pudo duplicar la plantilla', {
          description: mensajeParaLaPersona(e, { accion: 'duplicar la plantilla' }),
        });
      }
    },
    [recargar],
  );

  const borrarPlantilla = useCallback(async () => {
    if (!borrando) return;
    try {
      await documentosLegalesApi.borrarPlantilla(borrando.id);
      await recargar();
      toast.success(`«${borrando.name}» se archivó`);
    } catch (e: unknown) {
      toast.error('No se pudo archivar la plantilla', {
        description: mensajeParaLaPersona(e, { accion: 'archivar la plantilla' }),
      });
    } finally {
      setBorrando(null);
    }
  }, [borrando, recargar]);

  // 🔴 02-10-2026: recibe EXACTAMENTE el cuerpo de `CreateActaDto` (antes un
  // `ActaEntrega` entero, que el back rechazaba siempre con un 400).
  const guardarActa = async (cuerpo: CuerpoParaCrearElActa) => {
    try {
      await actasApi.create(cuerpo);
      await recargarActas();
      setNuevaActaAbierta(false);
      toast.success(t('inmobiliaria.documentos.toasts.actaCreated'));
    } catch (e) {
      // Lo que dijo el backend, no una clave fija: «El inmueble ya tiene un
      // acta de entrega abierta» sirve; «No se pudo guardar» no. Por el
      // traductor (02-10-2026): «conexión» sólo sin respuesta, un 5xx con su
      // referencia. Es el ÚNICO aviso: el formulario ya no pone otro.
      toast.error(t('inmobiliaria.documentos.toasts.actaError'), {
        description: mensajeParaLaPersona(e, {
          porDefecto: 'Prueba de nuevo en un momento.',
          accion: 'crear el acta',
        }),
      });
      throw e;
    }
  };

  const COLUMNAS: Record<Pestana, string[]> = {
    /* Revisora r24 #5: fuera «Tipo» (ya está el filtro) y «Partes» (va en el cajón): lo que identifica
       —contrato, inquilino y dirección— primero, y nada se corta a 1440. */
    documentos: ['colInmueble', 'colDocumento', 'colFecha', 'colEstado', 'colAcciones'],
    plantillas: ['colPlantilla', 'colCategoria', 'colVersion', 'colVariables', 'colAcciones'],
    actas: ['colInmueble', 'colTipo', 'colInquilino', 'colFecha', 'colEstado'],
  };

  const columnas = COLUMNAS[pestana];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* GLOW UP 22-10 (UX): el encabezado común de las pantallas por tarea —sección, título, una línea,
          las acciones de la pestaña en secundario y UNA principal, «Generar documento»—, como Inquilinos. */}
      <EncabezadoDePantalla
        seccion={t('inmobiliaria.nav.secDirectorio')}
        titulo={t('inmobiliaria.documentos.title')}
        descripcion={t(k('subtitle'))}
        acciones={
          <>
            {/* GLOW UP 22-10 (revisora r24 #1): las plantillas se configuran una vez; no son un estado de la
                lista. Salen de la fila de pestañas y abren su vista desde aquí. */}
            <Presence show={pestana !== 'plantillas'} initial={false} direction="right" distance="xs">
              <Button size="sm" variant="outline" hideArrow onClick={() => setPestana('plantillas')} data-testid="tab-plantillas">
                {t('inmobiliaria.documentos.filters.templates')}
                <span className="font-mono text-caption tabular-nums text-fg-subtle">{cifra(plantillas.length)}</span>
              </Button>
            </Presence>
            {/* 🔴 03-10 (pruebas en el navegador): «Nueva acta» vivía SÓLO en el vacío
                de la pestaña: con un acta en la lista no había cómo levantar otra.
                Es acción de SU pestaña (como «Nueva plantilla») y pide su permiso,
                `portafolio:create`, no el de los documentos: va fuera de ese gate. */}
            <Presence
              show={pestana === 'actas' && puedeCrearActas && actas.length > 0}
              initial={false}
              direction="right"
              distance="xs"
            >
              <Button size="sm" variant="outline" hideArrow onClick={abrirNuevaActa} data-testid="acta-nueva">
                <Plus className="w-4 h-4" weight="bold" />
                {t('inmobiliaria.documentos.newActa')}
              </Button>
            </Presence>
            {/* Escribir una plantilla es una acción de SU pestaña: en la de
                documentos sería un botón que no tiene nada que ver con lo que
                se está mirando. */}
            <PermissionGate module="documentos" action="create" fallback={null}>
              <Presence show={pestana === 'plantillas'} initial={false} direction="right" distance="xs">
                <Button
                  size="sm"
                  variant="outline"
                  hideArrow
                  onClick={() => {
                    setPlantillaEnEdicion(null);
                    setEditorAbierto(true);
                  }}
                  data-testid="plantilla-nueva"
                >
                  <Plus className="w-4 h-4" weight="bold" />
                  Nueva plantilla
                </Button>
              </Presence>
            </PermissionGate>
          </>
        }
        accionPrincipal={
          /* Un CONTADOR o un VIEWER sólo tienen `documentos:view`, y el back
             responde 403 al preparar. El botón no se dibuja si no se puede. */
          <PermissionGate module="documentos" action="create" fallback={null}>
            <Button size="sm" onClick={() => setGenerarAbierto(true)} hideArrow data-testid="documentos-generar">
              <Plus className="w-4 h-4" weight="bold" />
              {t(k('generar'))}
            </Button>
          </PermissionGate>
        }
      />

      <section className="rounded-lg border border-border bg-surface overflow-hidden">
        {/* GLOW UP 22-10 (revisora r24 #2): arriba, LA RESPUESTA —lo que espera a alguien—, como Deuda del mes. */}
        {pestana === 'documentos' && !cargando && !error && documentos.length > 0 ? (
          <div className="border-b border-border px-4 py-4 lg:px-5" data-testid="documentos-cifra">
            {cuenta.pendientes > 0 ? (
              (() => {
                /* Revisora r25: el 2 se decía siete veces. «de N» sólo si no son todos; los borradores
                   los dice la leyenda (no también el contexto); y con todo en UN estado, la cifra lo
                   dice y no lleva barra ni leyenda («2 borradores sin mandar a firmar»). */
                const enUnSoloEstado =
                  [cuenta.borradores, cuenta.porFirmar, cuenta.vencidos, cuenta.firmados].filter((n) => n > 0).length === 1;
                const todosBorradores = enUnSoloEstado && cuenta.borradores === documentos.length;
                return (
                  <CifraHeroe
                    tamano="mediana"
                    rotulo={tr('Por terminar')}
                    /* Ronda 30 (revisora r27): la cifra es el NÚMERO; la frase va en el contexto, como en las
                       demás CifraHeroe (antes «2 borradores sin mandar a firmar» entero en DM Mono grande). */
                    cifra={cifra(todosBorradores ? cuenta.borradores : cuenta.pendientes)}
                    contexto={
                      todosBorradores
                        ? cuenta.borradores === 1
                          ? tr('borrador sin mandar a firmar')
                          : tr('borradores sin mandar a firmar')
                        : `${cuenta.pendientes === 1 ? tr('documento') : tr('documentos')}${
                            cuenta.pendientes !== documentos.length ? ` ${tr('de')} ${cifra(documentos.length)}` : ''
                          }`
                    }
                    total={documentos.length}
                    tramos={
                      enUnSoloEstado
                        ? undefined
                        : [
                            { clave: 'borrador', etiqueta: tr('Borrador'), monto: cuenta.borradores, tono: 'neutro', cifra: cifra(cuenta.borradores) },
                            { clave: 'por-firmar', etiqueta: tr('Por firmar'), monto: cuenta.porFirmar, tono: 'aviso', cifra: cifra(cuenta.porFirmar) },
                            { clave: 'vencido', etiqueta: tr('Vencido'), monto: cuenta.vencidos, tono: 'critico', cifra: cifra(cuenta.vencidos) },
                            { clave: 'firmados', etiqueta: tr('Firmados'), monto: cuenta.firmados, tono: 'exito', cifra: cifra(cuenta.firmados) },
                          ]
                    }
                  />
                );
              })()
            ) : (
              <p className="text-body-sm text-fg-muted">
                <span className="font-medium text-fg">{tr('Todo firmado')}</span>
                {` · ${cifra(documentos.length)} ${documentos.length === 1 ? tr('documento') : tr('documentos')}`}
              </p>
            )}
          </div>
        ) : null}

        {/* GLOW UP 22-10 (revisora r24 #1): UNA sola fila de pestañas —los estados con su conteo y, al final,
            las actas de entrega— junto al buscador. Antes eran dos filas (un segmentado arriba y los estados
            debajo) y el mismo «2» cuatro veces. */}
        {pestana === 'plantillas' ? (
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 className="text-body font-medium text-fg">
              {t('inmobiliaria.documentos.filters.templates')}
              <span className="ml-2 font-mono text-caption tabular-nums text-fg-subtle">{cifra(plantillas.length)}</span>
            </h2>
            <Button size="sm" variant="ghost" hideArrow onClick={() => setPestana('documentos')} data-testid="tab-documentos">
              {tr('Volver a los documentos')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div data-testid="documentos-por-estado" className="min-w-0">
              <PestanasDeEstado<FiltrosDeDocumentos['estado'] | 'actas'>
                etiqueta={tr('Filtrar por estado')}
                valor={pestana === 'actas' ? 'actas' : filtros.estado}
                onCambio={(v) => {
                  if (v === 'actas') {
                    setPestana('actas');
                    return;
                  }
                  setPestana('documentos');
                  setFiltros((f) => ({ ...f, estado: v }));
                }}
                pestanas={[
                  // R2 (revisora r27): «Todos 2 · Borrador 2» decía el número dos veces. Las actas
                  // son otra lista: no entran a la comparación.
                  ...sinElNumeroRepetido<FiltrosDeDocumentos['estado'] | 'actas'>([
                  { valor: 'todos', etiqueta: tr('Todos'), cuantos: documentos.length, fija: true, testid: 'documentos-estado-todos' },
                  ...ESTADOS.map((e) => ({
                    valor: e as FiltrosDeDocumentos['estado'] | 'actas',
                    etiqueta: ESTADO_LABEL[e],
                    cuantos: documentos.filter((d) => d.status === e).length,
                    tono: e === 'PENDING_SIGNATURE' || e === 'DOC_EXPIRED' ? ('aviso' as const) : undefined,
                    testid: `documentos-estado-${e}`,
                  })),
                  ], 'todos', pestana === 'actas' ? 'actas' : filtros.estado),
                  /* Sin número en cero; con las actas caídas (un 403 para quien no tiene `portafolio:view`)
                     tampoco: un «0» ahí sería mentir que no hay actas. */
                  {
                    valor: 'actas',
                    etiqueta: t('inmobiliaria.documentos.filters.actas'),
                    cuantos: errorActas || actas.length === 0 ? null : actas.length,
                    fija: true,
                    testid: 'tab-actas',
                  },
                ]}
              />
            </div>

            <Presence
              show={pestana === 'documentos'}
              initial={false}
              direction="none"
              className="flex flex-col gap-2 sm:flex-row sm:items-center"
            >
              <SearchInput
                value={filtros.texto}
                onChange={(e) => setFiltros((f) => ({ ...f, texto: e.target.value }))}
                onClear={() => setFiltros((f) => ({ ...f, texto: '' }))}
                placeholder={t(k('buscar'))}
                inputSize="md"
                className="w-full sm:w-72"
                data-testid="documentos-buscar"
              />
              <Select
                value={filtros.categoria}
                onValueChange={(v) =>
                  setFiltros((f) => ({ ...f, categoria: v as FiltrosDeDocumentos['categoria'] }))
                }
              >
                <SelectTrigger className="w-full whitespace-nowrap sm:w-44" data-testid="documentos-filtro-tipo">
                  <SelectValue placeholder={t(k('tipo'))} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">{t(k('todosLosTipos'))}</SelectItem>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORIA_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Presence>
          </div>
        )}

        <EstadoDeDatos
          cargando={pestana === 'actas' ? cargandoActas : cargando}
          error={pestana === 'actas' ? errorActas : error}
          queEs={pestana === 'actas' ? 'las actas' : 'los documentos'}
          onReintentar={
            pestana === 'actas' ? () => void recargarActas() : () => void recargar()
          }
          esqueleto={<EsqueletoTabla columnas={columnas.length} className="rounded-none border-0" />}
        >
          {/* GLOW UP 22-10 (UX): en el celular, los documentos van en TARJETAS (como Deuda del mes):
              nombre y estado arriba, inmueble y fecha debajo; la tarjeta abre el cajón con las acciones. */}
          <Table className={cn(pestana === 'documentos' && 'max-md:block')}>
            <TableHeader className={cn(pestana === 'documentos' && 'max-md:hidden')}>
              <TableRow>
                {columnas.map((c) => (
                  <TableHead key={c} className={cn('whitespace-nowrap', c === 'colAcciones' && ACCIONES_FIJAS_CABECERA)}>
                    {t(k(c))}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            {/* Filas que entran escalonadas (techo de 320 ms) y salen al buscar
                o filtrar (`key` = el id). Al cambiar de pestaña el cuerpo se
                monta de nuevo: las de la pestaña nueva entran, sin esperar a
                que se vayan las de la vieja. */}
            <TableBodyAnimado key={pestana} className={cn(pestana === 'documentos' && 'max-md:block')}>
              {/* ── Documentos ─────────────────────────────────────────── */}
              {pestana === 'documentos' &&
                (visibles.length === 0 ? (
                  <TableRowAnimada key="vacio-documentos" className="max-md:block">
                    <TableCell colSpan={columnas.length} className="p-0 max-md:block">
                      {/* 🔴 ARREGLOS-4: a 390 px la tabla es más ancha que la
                          pantalla; el vacío ocupa lo que SE VE, no la tabla. */}
                      <AlAnchoVisible>
                      <SinDatos
                        queSon="documentos"
                        icono={FileText}
                        hayFiltros={hayFiltros(filtros)}
                        titulo={t(k('vacioTitulo'))}
                        descripcion={t(k('vacioDesc'))}
                        // Mismo permiso que el botón de la cabecera: sin
                        // `documentos:create` el backend corta con 403 al
                        // preparar, y un botón que sólo lleva a un error no es
                        // una salida del vacío.
                        crear={
                          puedeCrearDocumentos
                            ? { label: t(k('generar')), onClick: () => setGenerarAbierto(true) }
                            : undefined
                        }
                        onLimpiarFiltros={() => setFiltros(FILTROS_VACIOS)}
                      />
                      </AlAnchoVisible>
                    </TableCell>
                  </TableRowAnimada>
                ) : (
                  paginaDocumentos.pageItems.map((doc) => (
                    <TableRowAnimada
                      key={doc.id}
                      data-testid="documento-fila"
                      onClick={() => setDocumentoAbierto(doc)}
                      className="group cursor-pointer max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-4 max-md:gap-y-1 max-md:border-b max-md:border-border max-md:px-4 max-md:py-4 max-md:last:border-0"
                      tabIndex={0}
                      role="button"
                      aria-label={`Ver ${doc.name}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setDocumentoAbierto(doc);
                        }
                      }}
                    >
                      {(() => {
                        const { titulo, direccion } = identidadDelDocumento(doc);
                        return (
                          <>
                            <TableCell className="max-w-[360px] max-md:col-start-1 max-md:row-start-1 max-md:block max-md:max-w-none max-md:p-0">
                              <p className="truncate font-medium text-fg" title={titulo ?? doc.name}>{titulo ?? doc.name}</p>
                              {direccion ? (
                                <p className="truncate text-caption text-fg-muted" title={direccion}>{direccion}</p>
                              ) : null}
                            </TableCell>
                            <TableCell className="max-w-[320px] max-md:col-start-1 max-md:row-start-2 max-md:block max-md:max-w-none max-md:p-0">
                              <span className="line-clamp-2 text-fg-muted max-md:text-caption" title={doc.name}>
                                {titulo ? doc.name : '—'}
                              </span>
                            </TableCell>
                          </>
                        );
                      })()}
                      <TableCell className="whitespace-nowrap font-mono tabular-nums text-fg-muted max-md:col-start-1 max-md:row-start-3 max-md:block max-md:p-0 max-md:text-caption">
                        {fechaCorta(doc.createdAt, locale)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap max-md:col-start-2 max-md:row-start-1 max-md:block max-md:p-0 max-md:text-right">
                        <Badge variant={VARIANTE_DEL_TONO[ESTADO_TONO[doc.status]]}>{ESTADO_LABEL[doc.status]}</Badge>
                      </TableCell>
                      {/* Las acciones de la fila actúan; el clic no sube a la fila. */}
                      <TableCell
                        className={cn('whitespace-nowrap max-md:hidden', ACCIONES_FIJAS)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        {/* Atajos de la fila en íconos (con su nombre al pasar): el cajón que abre la
                            fila trae los mismos con texto. Así la tabla cabe y el nombre respira. */}
                        <div className="flex items-center gap-0.5">
                          <IconButton
                            variant="ghost"
                            size="sm"
                            icon={<Eye />}
                            aria-label={t(k('verPdf'))}
                            title={t(k('verPdf'))}
                            onClick={() => void verPdf(doc)}
                            data-testid="documento-ver"
                          />
                          <IconButton
                            variant="ghost"
                            size="sm"
                            icon={<DownloadSimple />}
                            aria-label={t(k('descargar'))}
                            title={t(k('descargar'))}
                            onClick={() => void descargarPdf(doc)}
                            data-testid="documento-descargar"
                          />
                        </div>
                      </TableCell>
                    </TableRowAnimada>
                  ))
                ))}

              {/* ── Plantillas ─────────────────────────────────────────── */}
              {pestana === 'plantillas' &&
                (plantillas.length === 0 ? (
                  <TableRowAnimada key="vacio-plantillas">
                    <TableCell colSpan={columnas.length} className="p-0">
                      <AlAnchoVisible>
                      <SinDatos
                        queSon="plantillas"
                        icono={FileText}
                        titulo={t(k('vacioPlantillas'))}
                        descripcion={t(k('vacioPlantillasDesc'))}
                      />
                      </AlAnchoVisible>
                    </TableCell>
                  </TableRowAnimada>
                ) : (
                  paginaPlantillas.pageItems.map((p) => (
                    <TableRowAnimada
                      key={p.id}
                      data-testid="plantilla-fila"
                      // La fila hace lo mismo que «Ver plantilla» (el molde, regla 5).
                      onClick={() => setPlantillaAbierta(p)}
                      className="group cursor-pointer"
                      tabIndex={0}
                      role="button"
                      aria-label={`Ver la plantilla ${p.name}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setPlantillaAbierta(p);
                        }
                      }}
                    >
                      <TableCell className="max-w-[320px]">
                        <p className="truncate font-medium text-fg">{p.name}</p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-fg-muted">
                        {CATEGORIA_LABEL[p.category]}
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums text-fg-muted">
                        {p.version}
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums text-fg-muted">
                        {p.variables.length}
                      </TableCell>
                      <TableCell
                        className={cn('whitespace-nowrap', ACCIONES_FIJAS)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            hideArrow
                            onClick={() => setPlantillaAbierta(p)}
                            data-testid="plantilla-ver"
                          >
                            {t(k('verPlantilla'))}
                          </Button>
                          {/* 🔴 Las del SISTEMA no se editan: el documento se
                              genera del texto que vive en el código, así que
                              guardar un cambio aquí cambiaría sólo la vista
                              previa. El back responde 400. Se DUPLICAN, y la
                              copia ya es de la inmobiliaria. */}
                          {p.codigo === null && puedeEditarPlantillas && (
                            <Button
                              variant="ghost"
                              size="sm"
                              hideArrow
                              onClick={() => {
                                setPlantillaEnEdicion(p);
                                setEditorAbierto(true);
                              }}
                              data-testid="plantilla-editar"
                            >
                              Editar
                            </Button>
                          )}
                          {puedeCrearDocumentos && (
                            <Button
                              variant="ghost"
                              size="sm"
                              hideArrow
                              onClick={() => void duplicarPlantilla(p)}
                              title={
                                p.codigo !== null
                                  ? 'Las plantillas del sistema se actualizan con la ley. Duplícala y la copia es tuya.'
                                  : undefined
                              }
                              data-testid="plantilla-duplicar"
                            >
                              Duplicar
                            </Button>
                          )}
                          {p.codigo === null && puedeBorrarPlantillas && (
                            <Button
                              variant="ghost"
                              size="sm"
                              hideArrow
                              onClick={() => setBorrando(p)}
                              data-testid="plantilla-borrar"
                            >
                              Archivar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRowAnimada>
                  ))
                ))}

              {/* ── Actas ──────────────────────────────────────────────── */}
              {pestana === 'actas' &&
                (actas.length === 0 ? (
                  <TableRowAnimada key="vacio-actas">
                    <TableCell colSpan={columnas.length} className="p-0">
                      <AlAnchoVisible>
                      <SinDatos
                        queSon="actas"
                        icono={ClipboardText}
                        titulo={t(k('vacioActas'))}
                        descripcion={t(k('vacioActasDesc'))}
                        // `POST /inmobiliaria/actas` pide `portafolio:create`,
                        // NO `documentos:create`. Un VIEWER —`portafolio:
                        // ['view']`— veía «Nueva acta», llenaba el formulario
                        // entero y recién ahí se comía un 403.
                        crear={
                          puedeCrearActas
                            ? { label: t('inmobiliaria.documentos.newActa'), onClick: abrirNuevaActa }
                            : undefined
                        }
                      />
                      </AlAnchoVisible>
                    </TableCell>
                  </TableRowAnimada>
                ) : (
                  paginaActas.pageItems.map((acta) => (
                    <TableRowAnimada
                      key={acta.id}
                      className="cursor-pointer"
                      data-testid="acta-fila"
                      tabIndex={0}
                      onClick={() => setActaAbierta(acta)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setActaAbierta(acta);
                        }
                      }}
                    >
                      <TableCell className="max-w-[280px]">
                        <p className="truncate font-medium text-fg">{acta.propertyTitle}</p>
                        <p className="truncate text-caption text-fg-muted">{acta.propertyAddress}</p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-fg-muted">
                        {acta.type === 'entrega'
                          ? t('inmobiliaria.documentos.actas.typeEntrega')
                          : t('inmobiliaria.documentos.actas.typeDevolucion')}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <span className="block truncate text-fg-muted">{acta.tenantName}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums text-fg-muted">
                        {/* La fecha y la hora de la entrega; sin ella, la de creación (02-10-2026). */}
                        {cuandoFueLaEntrega(acta, locale)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant={VARIANTE_DEL_TONO[ACTA_ESTADO_TONO[acta.status]]}>{ACTA_ESTADO_LABEL[acta.status]}</Badge>
                      </TableCell>
                    </TableRowAnimada>
                  ))
                ))}
            </TableBodyAnimado>
          </Table>

          {pestana === 'documentos' && paginaDocumentos.shouldPaginate && (
            <div className="border-t border-border px-4 py-3">
              <TablePagination
                total={paginaDocumentos.total}
                page={paginaDocumentos.page}
                pageSize={paginaDocumentos.pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={paginaDocumentos.setPage}
                onPageSizeChange={paginaDocumentos.setPageSize}
              />
            </div>
          )}
          {pestana === 'plantillas' && paginaPlantillas.shouldPaginate && (
            <div className="border-t border-border px-4 py-3">
              <TablePagination
                total={paginaPlantillas.total}
                page={paginaPlantillas.page}
                pageSize={paginaPlantillas.pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={paginaPlantillas.setPage}
                onPageSizeChange={paginaPlantillas.setPageSize}
              />
            </div>
          )}
          {pestana === 'actas' && paginaActas.shouldPaginate && (
            <div className="border-t border-border px-4 py-3">
              <TablePagination
                total={paginaActas.total}
                page={paginaActas.page}
                pageSize={paginaActas.pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={paginaActas.setPage}
                onPageSizeChange={paginaActas.setPageSize}
              />
            </div>
          )}
        </EstadoDeDatos>
      </section>

      <GenerarDocumentoDialog
        open={generarAbierto}
        onOpenChange={setGenerarAbierto}
        onGenerado={agregar}
        plantillasPropias={propias}
      />

      <EditorDePlantilla
        abierto={editorAbierto}
        plantilla={plantillaEnEdicion}
        onCerrar={() => setEditorAbierto(false)}
        onGuardado={() => void recargar()}
      />

      {/* Archivar: se pregunta. El back la marca inactiva —no se pierde el
          texto— pero los documentos ya generados con ella no cambian, y eso es
          lo que hay que decir para que la decisión se tome informada. */}
      <AlertDialog open={borrando !== null} onOpenChange={(o) => !o && setBorrando(null)}>
        <AlertDialogContent variant="destructive" icon={<Archive weight="bold" />}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {borrando ? `¿Archivar «${borrando.name}»?` : ''}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Deja de ofrecerse al generar documentos. Los documentos que ya se hicieron
              con ella no cambian.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void borrarPlantilla()} data-testid="plantilla-borrar-confirmar">
              Archivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* El cajón del documento generado: sus datos y sus dos acciones. No le
          pide nada al back hasta que se toca «Ver PDF» o «Descargar». */}
      <Cajon
        abierto={documentoAbierto !== null}
        onOpenChange={(o) => !o && setDocumentoAbierto(null)}
        data-testid="cajon-documento"
      >
        {documentoAbierto && (
          <>
            <CajonCabecera
              titulo={documentoAbierto.name}
              descripcion={documentoAbierto.template?.name ?? undefined}
            />
            <CajonCuerpo>
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
                <dt className="text-fg-muted">Tipo</dt>
                <dd className="text-fg">
                  {documentoAbierto.template ? CATEGORIA_LABEL[documentoAbierto.template.category] : '—'}
                </dd>
                <dt className="text-fg-muted">Inmueble</dt>
                <dd className="text-fg">{etiquetaDelInmueble(documentoAbierto) ?? '—'}</dd>
                <dt className="text-fg-muted">Partes</dt>
                <dd className="text-fg">{etiquetaDePartes(documentoAbierto) ?? '—'}</dd>
                <dt className="text-fg-muted">Generado</dt>
                <dd className="font-mono tabular-nums text-fg">{fechaCorta(documentoAbierto.createdAt, locale)}</dd>
                <dt className="text-fg-muted">Estado</dt>
                <dd>
                  <Badge variant={VARIANTE_DEL_TONO[ESTADO_TONO[documentoAbierto.status]]}>{ESTADO_LABEL[documentoAbierto.status]}</Badge>
                </dd>
              </dl>
            </CajonCuerpo>
            <CajonPie>
              <Button variant="outline" hideArrow onClick={() => void descargarPdf(documentoAbierto)}>
                {t(k('descargar'))}
              </Button>
              <Button hideArrow onClick={() => void verPdf(documentoAbierto)} data-testid="cajon-documento-ver">
                {t(k('verPdf'))}
              </Button>
            </CajonPie>
          </>
        )}
      </Cajon>

      {/* Vista previa de la plantilla: el mismo HTML que se imprime, con sus
          variables sin reemplazar. Va en un iframe aislado para que el estilo
          del documento no se mezcle con el del panel. */}
      <Cajon
        abierto={plantillaAbierta !== null}
        onOpenChange={(o) => !o && setPlantillaAbierta(null)}
        ancho="sm:max-w-3xl"
      >
        <CajonCabecera titulo={plantillaVisible?.name ?? t(k('plantillaTitulo'))} />
        {plantillaVisible && (
          /* El papel ocupa todo el cuerpo del cajón: la columna llena el alto
             que queda debajo de la cabecera, sin calcular el viewport a mano. */
          <CajonCuerpo className="flex flex-col gap-3">
            <p className="flex-none text-caption text-fg-muted">
              {plantillaVisible.variables.length} variables · {t(k('colVersion'))}{' '}
              {plantillaVisible.version}
            </p>
            {/* `bg-white` a propósito, NO `bg-surface`: esto no es una
                superficie del panel sino el PAPEL del documento. El srcDoc
                trae el HTML de la plantilla con su tinta oscura y sin fondo
                propio, así que con `bg-surface` (#0a0a0a en oscuro) la vista
                previa quedaría negro sobre negro. El papel es blanco en los
                dos temas porque es lo que se va a imprimir. El papel lleva el
                relleno de una tarjeta del cajón (`SheetSection`): sin él, el
                texto del documento quedaba pegado al borde (DESIGN.md §Drawers). */}
            <iframe
              title={plantillaVisible.name}
              srcDoc={plantillaVisible.content}
              className="min-h-0 w-full flex-1 rounded-lg border border-border bg-white p-4 sm:p-5"
              sandbox=""
            />
          </CajonCuerpo>
        )}
      </Cajon>

      <Cajon abierto={nuevaActaAbierta} onOpenChange={setNuevaActaAbierta} ancho="sm:max-w-2xl">
        <CajonCabecera titulo={t('inmobiliaria.documentos.newActa')} />
        <CajonCuerpo>
          {consignaciones.length === 0 ? (
            <p className="text-body-sm text-fg-muted" data-testid="acta-sin-arrendados">
              {errorConsignaciones
                ? 'No se pudieron traer los inmuebles. Prueba de nuevo en un momento.'
                : 'Todavía no tienes inmuebles con mandato vigente: un acta se levanta sobre uno de ellos, así que todavía no hay sobre cuál hacerla.'}
            </p>
          ) : (
            <>
              {noArrendados > 0 && (
                <p className="mb-4 text-caption text-fg-muted" data-testid="acta-solo-arrendados">
                  Para un acta de entrega se listan los {arrendados.length} inmuebles arrendados: se
                  levanta sobre un arriendo en curso. Los otros {noArrendados} del portafolio no
                  aparecen por eso, no porque falten. Para una de devolución se listan todos: el
                  inquilino suele entregar con el arriendo ya terminado.
                </p>
              )}
              <ActaEntregaForm
                initialData={{ type: 'entrega' }}
                consignaciones={arrendados}
                consignacionesDeDevolucion={consignaciones}
                onSave={guardarActa}
                onCancel={() => setNuevaActaAbierta(false)}
              />
            </>
          )}
        </CajonCuerpo>
      </Cajon>

      <Cajon
        abierto={actaAbierta !== null}
        onOpenChange={(o) => !o && setActaAbierta(null)}
        ancho="sm:max-w-2xl"
      >
        <CajonCabecera titulo={t('inmobiliaria.documentos.actaDetail')} />
        <CajonCuerpo>
          {actaVisible && (
            <>
              <ActaEntregaViewer acta={actaVisible} sinFirmas />
              {/*
                🔴 ARREGLOS-3 (03-10-2026): las fotos por espacio, la firma del
                asesor (dibujada) y el enlace para que el inquilino firme. Con
                las dos firmas el acta se cierra (y en una devolución, la cuota
                de cierre): se vuelve a leer para que el cajón y la lista lo digan.
              */}
              <div className="mt-6 border-t border-border pt-6">
                <FotosYFirmasDelActa
                  acta={actaVisible}
                  onCambio={() => void refrescarElActa(actaVisible.id)}
                />
              </div>
              {/*
                🔴 I-03: el inquilino no firma y el acta queda abierta para
                siempre. El botón sólo aparece cuando de verdad se puede —si el
                inquilino firmó, se cierra por el camino normal— para que nadie
                consiga un testigo y descubra después que no hacía falta.
              */}
              {actaVisible.status !== 'completed' &&
                sePuedeCerrarSinFirma(actaVisible) &&
                // Roles auxiliares (20-10-2026): el administrativo arma el acta; cerrarla no.
                !elAuxiliarNoFirma(agencyRoleDeLaPagina) && (
                  <div className="mt-4 border-t border-border pt-4">
                    <Button
                      variant="secondary"
                      hideArrow
                      onClick={() => setCerrandoSinFirma(actaVisible)}
                    >
                      Cerrar sin la firma del inquilino
                    </Button>
                  </div>
                )}
            </>
          )}
        </CajonCuerpo>
      </Cajon>

      {cerrandoSinFirma && (
        <CerrarActaSinFirma
          acta={cerrandoSinFirma}
          onCerrar={() => setCerrandoSinFirma(null)}
          onCerrada={() => {
            setCerrandoSinFirma(null);
            setActaAbierta(null);
            void recargarActas();
          }}
        />
      )}
    </div>
  );
}

export default function DocumentosPage() {
  return (
    <PageGuard module="documentos">
      <DocumentosContent />
    </PageGuard>
  );
}
