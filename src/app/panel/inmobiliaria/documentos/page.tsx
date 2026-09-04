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
import { toast } from 'sonner';
import { PageGuard } from '@/components/auth/PageGuard';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SinDatos } from '@/components/estado/SinDatos';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ActaEntregaForm, ActaEntregaViewer } from '@/components/inmobiliaria';
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
  const { actas, isLoading: cargandoActas, refetch: recargarActas } = useActasEntrega();
  const { consignaciones } = useConsignaciones({ status: 'active' });

  const [filtros, setFiltros] = useState<FiltrosDeDocumentos>(FILTROS_VACIOS);
  const [generarAbierto, setGenerarAbierto] = useState(false);
  const [plantillaAbierta, setPlantillaAbierta] = useState<PlantillaDeLaAgencia | null>(null);
  const [actaAbierta, setActaAbierta] = useState<ActaEntrega | null>(null);
  const [nuevaActaAbierta, setNuevaActaAbierta] = useState(false);

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

  const guardarActa = async (data: ActaEntrega) => {
    try {
      await actasApi.create(data);
      await recargarActas();
      setNuevaActaAbierta(false);
      toast.success(t('inmobiliaria.documentos.toasts.actaCreated'));
    } catch (e) {
      toast.error(t('inmobiliaria.documentos.toasts.actaError'), {
        description: t('inmobiliaria.documentos.toasts.actaErrorDesc'),
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
          <Button
            onClick={() => setGenerarAbierto(true)}
            hideArrow
            className="shrink-0"
            data-testid="documentos-generar"
          >
            <Plus className="w-4 h-4" weight="bold" />
            {t(k('generar'))}
          </Button>
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
              <TabsTrigger value="actas" className="gap-2 whitespace-nowrap">
                {t('inmobiliaria.documentos.filters.actas')}
                <span className="ml-1.5 inline-flex min-w-[1.25rem] justify-center rounded-full bg-surface-muted px-1.5 text-caption tabular-nums text-fg-muted">{actas.length}</span>
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
          error={pestana === 'actas' ? null : error}
          queEs="los documentos"
          onReintentar={() => void recargar()}
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
                        crear={{ label: t(k('generar')), onClick: () => setGenerarAbierto(true) }}
                        onLimpiarFiltros={() => setFiltros(FILTROS_VACIOS)}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  paginaDocumentos.pageItems.map((doc) => (
                    <TableRow key={doc.id} data-testid="documento-fila">
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
                      <TableCell className="whitespace-nowrap">
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
                    <TableRow key={p.id} data-testid="plantilla-fila">
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
                      <TableCell className="whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          hideArrow
                          onClick={() => setPlantillaAbierta(p)}
                          data-testid="plantilla-ver"
                        >
                          {t(k('verPlantilla'))}
                        </Button>
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
                        crear={{
                          label: t('inmobiliaria.documentos.newActa'),
                          onClick: () => setNuevaActaAbierta(true),
                        }}
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
      />

      {/* Vista previa de la plantilla: el mismo HTML que se imprime, con sus
          variables sin reemplazar. Va en un iframe aislado para que el estilo
          del documento no se mezcle con el del panel. */}
      <Sheet open={plantillaAbierta !== null} onOpenChange={(o) => !o && setPlantillaAbierta(null)}>
        <SheetContent className="w-full sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle className="text-lg">{plantillaAbierta?.name ?? t(k('plantillaTitulo'))}</SheetTitle>
          </SheetHeader>
          {plantillaAbierta && (
            <div className="mt-4 flex h-[calc(100vh-8rem)] flex-col gap-3">
              <p className="text-caption text-fg-muted">
                {plantillaAbierta.variables.length} variables · {t(k('colVersion'))}{' '}
                {plantillaAbierta.version}
              </p>
              <iframe
                title={plantillaAbierta.name}
                srcDoc={plantillaAbierta.content}
                className="h-full w-full rounded-lg border border-border bg-white"
                sandbox=""
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={nuevaActaAbierta} onOpenChange={setNuevaActaAbierta}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="text-lg">{t('inmobiliaria.documentos.newActa')}</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <ActaEntregaForm
              initialData={{ type: 'entrega' }}
              consignaciones={consignaciones.filter((c) => c.availability === 'rented')}
              onSave={guardarActa}
              onCancel={() => setNuevaActaAbierta(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={actaAbierta !== null} onOpenChange={(o) => !o && setActaAbierta(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="text-lg">{t('inmobiliaria.documentos.actaDetail')}</SheetTitle>
          </SheetHeader>
          <div className="mt-6">{actaAbierta && <ActaEntregaViewer acta={actaAbierta} />}</div>
        </SheetContent>
      </Sheet>
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
