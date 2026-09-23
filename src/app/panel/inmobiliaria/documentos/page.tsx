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

import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ClipboardText, FileText, Plus } from '@phosphor-icons/react';
import { toast } from '@/components/ui/toast';
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
import { Spinner } from '@/components/ui/spinner';
import { SearchInput } from '@leasefy/cadence';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { TablePagination } from '@/components/ui/pagination';
import { useTablePagination, PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination';
import { useUltimoPresente } from '@/lib/hooks/use-ultimo-presente';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SinDatos } from '@/components/estado/SinDatos';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import { ActaEntregaForm, ActaEntregaViewer } from '@/components/inmobiliaria';
import {
  CerrarActaSinFirma,
  sePuedeCerrarSinFirma,
} from '@/components/inmobiliaria/CerrarActaSinFirma';
import type { ActaEntrega } from '@/lib/types/inmobiliaria';
import { useActasEntrega, useConsignaciones, actasApi } from '@/lib/hooks/useInmobiliaria';
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
import {
  CATEGORIA_LABEL,
  ESTADO_BADGE,
  ESTADO_LABEL,
  FILTROS_VACIOS,
  etiquetaDePartes,
  etiquetaDelInmueble,
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

const ACTA_ESTADO_LABEL: Record<ActaEntrega['status'], string> = {
  draft: 'Borrador',
  in_progress: 'En progreso',
  pending_signatures: 'Por firmar',
  completed: 'Completada',
};

const ACTA_ESTADO_BADGE: Record<ActaEntrega['status'], string> = {
  draft: 'bg-surface-muted text-fg-muted',
  in_progress: 'bg-primary-soft text-primary',
  pending_signatures: 'bg-warning-soft text-warning',
  completed: 'bg-success-soft text-success',
};

function fechaCorta(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function DocumentosContent() {
  const { t, locale } = useI18n();
  const k = (s: string) => `inmobiliaria.documentos.legales.${s}`;

  const searchParams = useSearchParams();
  const tabInicial = searchParams.get('tab');
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
  const { canAccess } = usePermissions();
  const puedeCrearDocumentos = canAccess('documentos', 'create');
  const puedeCrearActas = canAccess('portafolio', 'create');
  /* Editar y borrar plantillas son permisos PROPIOS en el back
     (`documentos:edit`, `documentos:delete`): un AGENTE puede tener `create` y
     no `delete`, y un botón visible sin permiso es un 403 disfrazado. */
  const puedeEditarPlantillas = canAccess('documentos', 'edit');
  const puedeBorrarPlantillas = canAccess('documentos', 'delete');

  const [filtros, setFiltros] = useState<FiltrosDeDocumentos>(FILTROS_VACIOS);
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

  /*
   * Los dos cajones se cerraban EN BLANCO. `open` ya estaba bien puesto
   * (`x !== null`), así que Radix animaba la salida — pero el cuerpo leía la
   * variable cruda, y en el mismo render en que se cierra ya vale `null`: el
   * contenido desaparecía de golpe y lo que se deslizaba afuera era un panel
   * vacío. `useUltimoPresente` lo sostiene mientras dura la animación.
   */
  const plantillaVisible = useUltimoPresente(plantillaAbierta);
  const actaVisible = useUltimoPresente(actaAbierta);

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
          description: e instanceof Error ? e.message : undefined,
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
          description: e instanceof Error ? e.message : undefined,
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
          description: e instanceof Error ? e.message : undefined,
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
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBorrando(null);
    }
  }, [borrando, recargar]);

  const guardarActa = async (data: ActaEntrega) => {
    try {
      await actasApi.create(data);
      await recargarActas();
      setNuevaActaAbierta(false);
      toast.success(t('inmobiliaria.documentos.toasts.actaCreated'));
    } catch (e) {
      // Lo que dijo el backend, no una clave fija: «El inmueble ya tiene un
      // acta de entrega abierta» sirve; «No se pudo guardar» no.
      toast.error(t('inmobiliaria.documentos.toasts.actaError'), {
        description: e instanceof Error ? e.message : t('inmobiliaria.documentos.toasts.actaErrorDesc'),
      });
      throw e;
    }
  };

  const COLUMNAS: Record<Pestana, string[]> = {
    documentos: [
      'colDocumento',
      'colTipo',
      'colInmueble',
      'colPartes',
      'colFecha',
      'colEstado',
      'colAcciones',
    ],
    plantillas: ['colPlantilla', 'colCategoria', 'colVersion', 'colVariables', 'colAcciones'],
    actas: ['colInmueble', 'colTipo', 'colInquilino', 'colFecha', 'colEstado'],
  };

  const columnas = COLUMNAS[pestana];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-h2 text-fg">{t('inmobiliaria.documentos.title')}</h1>
          <p className="text-body text-fg-muted max-w-2xl">{t(k('subtitle'))}</p>
        </div>
        {/* Un CONTADOR o un VIEWER sólo tienen `documentos:view`, y el back
            responde 403 al preparar. El botón no se dibuja si no se puede. */}
        <PermissionGate module="documentos" action="create" fallback={null}>
          <div className="flex shrink-0 flex-wrap gap-2">
            {/* Escribir una plantilla es una acción de SU pestaña: en la de
                documentos sería un botón que no tiene nada que ver con lo que
                se está mirando. */}
            {pestana === 'plantillas' && (
              <Button
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
            )}
            <Button
              onClick={() => setGenerarAbierto(true)}
              hideArrow
              data-testid="documentos-generar"
            >
              <Plus className="w-4 h-4" weight="bold" />
              {t(k('generar'))}
            </Button>
          </div>
        </PermissionGate>
      </header>

      <section className="rounded-lg border border-border bg-surface overflow-hidden">
        {/* Pestañas + buscador + filtros: la primera fila de la card. */}
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <Tabs value={pestana} onValueChange={(v) => setPestana(v as Pestana)}>
            <TabsList variant="segmented">
              <TabsTrigger value="documentos" className="gap-2 whitespace-nowrap">
                {t('inmobiliaria.documentos.title')}
                <span className="ml-1.5 inline-flex min-w-[1.25rem] justify-center rounded-full bg-surface-muted px-1.5 text-caption tabular-nums text-fg-muted">{documentos.length}</span>
              </TabsTrigger>
              <TabsTrigger value="plantillas" className="gap-2 whitespace-nowrap">
                {t('inmobiliaria.documentos.filters.templates')}
                <span className="ml-1.5 inline-flex min-w-[1.25rem] justify-center rounded-full bg-surface-muted px-1.5 text-caption tabular-nums text-fg-muted">{plantillas.length}</span>
              </TabsTrigger>
              {/* 🔴 20-09 · «Actas de entrega», no «Actas». La pestaña decía
                  «Actas 0» al lado de una lista que mostraba dos actas: son dos
                  cosas distintas con el mismo nombre —el ACTA firmada con su
                  inventario (`ActaEntrega`) y el PDF de acta generado desde una
                  plantilla legal, que vive en Documentos—. Un cero que
                  contradice lo que se ve al lado se lee como un error de
                  cuentas, y no lo era. */}
              <TabsTrigger value="actas" className="gap-2 whitespace-nowrap">
                {t('inmobiliaria.documentos.filters.actas')}
                {/* Con las actas caídas (un 403 para quien no tiene
                    `portafolio:view`) el chip decía «0»: raya, no cero. */}
                <span
                  className="ml-1.5 inline-flex min-w-[1.25rem] justify-center rounded-full bg-surface-muted px-1.5 text-caption tabular-nums text-fg-muted"
                  data-testid="chip-actas"
                >
                  {errorActas ? '—' : actas.length}
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {pestana === 'documentos' && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <SearchInput
                value={filtros.texto}
                onChange={(e) => setFiltros((f) => ({ ...f, texto: e.target.value }))}
                onClear={() => setFiltros((f) => ({ ...f, texto: '' }))}
                placeholder={t(k('buscar'))}
                inputSize="md"
                className="w-full sm:w-64"
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
              <Select
                value={filtros.estado}
                onValueChange={(v) =>
                  setFiltros((f) => ({ ...f, estado: v as FiltrosDeDocumentos['estado'] }))
                }
              >
                <SelectTrigger className="w-full whitespace-nowrap sm:w-44" data-testid="documentos-filtro-estado">
                  <SelectValue placeholder={t(k('estado'))} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">{t(k('todosLosEstados'))}</SelectItem>
                  {ESTADOS.map((e) => (
                    <SelectItem key={e} value={e}>
                      {ESTADO_LABEL[e]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <EstadoDeDatos
          cargando={pestana === 'actas' ? cargandoActas : cargando}
          error={pestana === 'actas' ? errorActas : error}
          queEs={pestana === 'actas' ? 'las actas' : 'los documentos'}
          onReintentar={
            pestana === 'actas' ? () => void recargarActas() : () => void recargar()
          }
          esqueleto={
            <div className="flex items-center justify-center py-16">
              <Spinner />
            </div>
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                {columnas.map((c) => (
                  <TableHead key={c} className="whitespace-nowrap">
                    {t(k(c))}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* ── Documentos ─────────────────────────────────────────── */}
              {pestana === 'documentos' &&
                (visibles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columnas.length} className="p-0">
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
                    </TableCell>
                  </TableRow>
                ) : (
                  paginaDocumentos.pageItems.map((doc) => (
                    <TableRow
                      key={doc.id}
                      data-testid="documento-fila"
                      onClick={() => setDocumentoAbierto(doc)}
                      className="cursor-pointer"
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
                      <TableCell className="max-w-[280px]">
                        <p className="truncate font-medium text-fg">{doc.name}</p>
                        {doc.template?.name && (
                          <p className="truncate text-caption text-fg-muted">{doc.template.name}</p>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-fg-muted">
                        {doc.template ? CATEGORIA_LABEL[doc.template.category] : '—'}
                      </TableCell>
                      <TableCell className="max-w-[240px]">
                        <span className="block truncate text-fg-muted">
                          {etiquetaDelInmueble(doc) ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        <span className="block truncate text-fg-muted">
                          {etiquetaDePartes(doc) ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums text-fg-muted">
                        {fechaCorta(doc.createdAt, locale)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-caption font-medium',
                            ESTADO_BADGE[doc.status],
                          )}
                        >
                          {ESTADO_LABEL[doc.status]}
                        </span>
                      </TableCell>
                      {/* Las acciones de la fila actúan; el clic no sube a la fila. */}
                      <TableCell
                        className="whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            hideArrow
                            onClick={() => void verPdf(doc)}
                            data-testid="documento-ver"
                          >
                            {t(k('verPdf'))}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            hideArrow
                            onClick={() => void descargarPdf(doc)}
                            data-testid="documento-descargar"
                          >
                            {t(k('descargar'))}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ))}

              {/* ── Plantillas ─────────────────────────────────────────── */}
              {pestana === 'plantillas' &&
                (plantillas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columnas.length} className="p-0">
                      <SinDatos
                        queSon="plantillas"
                        icono={FileText}
                        titulo={t(k('vacioPlantillas'))}
                        descripcion={t(k('vacioPlantillasDesc'))}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  paginaPlantillas.pageItems.map((p) => (
                    <TableRow
                      key={p.id}
                      data-testid="plantilla-fila"
                      // La fila hace lo mismo que «Ver plantilla» (el molde, regla 5).
                      onClick={() => setPlantillaAbierta(p)}
                      className="cursor-pointer"
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
                        className="whitespace-nowrap"
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
                              guardar un cambio acá cambiaría sólo la vista
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
                    </TableRow>
                  ))
                ))}

              {/* ── Actas ──────────────────────────────────────────────── */}
              {pestana === 'actas' &&
                (actas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columnas.length} className="p-0">
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
                            ? {
                                label: t('inmobiliaria.documentos.newActa'),
                                onClick: () => {
                                  if (errorConsignaciones) {
                                    toast.error('No se pudieron traer los inmuebles arrendados', {
                                      description:
                                        'Sin ellos no se puede levantar un acta. Prueba de nuevo en un momento.',
                                    });
                                    return;
                                  }
                                  setNuevaActaAbierta(true);
                                },
                              }
                            : undefined
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  paginaActas.pageItems.map((acta) => (
                    <TableRow
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
                        {fechaCorta(acta.deliveryDate, locale)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-caption font-medium',
                            ACTA_ESTADO_BADGE[acta.status],
                          )}
                        >
                          {ACTA_ESTADO_LABEL[acta.status]}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ))}
            </TableBody>
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
        <AlertDialogContent>
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
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-caption font-medium',
                      ESTADO_BADGE[documentoAbierto.status],
                    )}
                  >
                    {ESTADO_LABEL[documentoAbierto.status]}
                  </span>
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
                dos temas porque es lo que se va a imprimir. */}
            <iframe
              title={plantillaVisible.name}
              srcDoc={plantillaVisible.content}
              className="min-h-0 w-full flex-1 rounded-lg border border-border bg-white"
              sandbox=""
            />
          </CajonCuerpo>
        )}
      </Cajon>

      <Cajon abierto={nuevaActaAbierta} onOpenChange={setNuevaActaAbierta} ancho="sm:max-w-2xl">
        <CajonCabecera titulo={t('inmobiliaria.documentos.newActa')} />
        <CajonCuerpo>
          {arrendados.length === 0 ? (
            <p className="text-body-sm text-fg-muted" data-testid="acta-sin-arrendados">
              {errorConsignaciones
                ? 'No se pudieron traer los inmuebles arrendados. Prueba de nuevo en un momento.'
                : 'Ninguno de tus inmuebles está arrendado ahora mismo. Un acta de entrega se levanta sobre un arriendo en curso, así que todavía no hay sobre cuál hacerla.'}
            </p>
          ) : (
            <>
              {noArrendados > 0 && (
                <p className="mb-4 text-caption text-fg-muted" data-testid="acta-solo-arrendados">
                  Se listan los {arrendados.length} inmuebles arrendados: un acta de entrega se
                  levanta sobre un arriendo en curso. Los otros {noArrendados} del portafolio no
                  aparecen por eso, no porque falten.
                </p>
              )}
              <ActaEntregaForm
                initialData={{ type: 'entrega' }}
                consignaciones={arrendados}
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
              <ActaEntregaViewer acta={actaVisible} />
              {/*
                🔴 I-03: el inquilino no firma y el acta queda abierta para
                siempre. El botón sólo aparece cuando de verdad se puede —si el
                inquilino firmó, se cierra por el camino normal— para que nadie
                consiga un testigo y descubra después que no hacía falta.
              */}
              {actaVisible.status !== 'completed' &&
                sePuedeCerrarSinFirma(actaVisible) && (
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
