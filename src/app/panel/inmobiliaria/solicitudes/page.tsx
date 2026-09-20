'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Lifebuoy, Plus, Wrench, ArrowRight } from '@phosphor-icons/react';
import { lugarDeRegreso, rutaDeRegreso } from '@/lib/nav/ruta-de-regreso';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@leasefy/cadence';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useI18n } from '@/lib/i18n';
import { SectionLabel } from '@/components/ui/section-label';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/pagination';
import { useTablePagination, PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination';
import { PageGuard } from '@/components/auth/PageGuard';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { SinDatos } from '@/components/estado/SinDatos';
import { pqrsApi } from '@/lib/api/pqrs-agencia.service';
import { RESUMEN_PQRS_VACIO } from '@/lib/api/pqrs-agencia.types';
import type { Pqrs, PqrsEstado, PqrsListResponse } from '@/lib/api/pqrs-agencia.types';
import { PQRS_ESTADOS } from '@/lib/api/pqrs-agencia.types';
import { NuevaPqrsDrawer } from '@/components/inmobiliaria/pqrs/NuevaPqrsDrawer';
import { PqrsDrawer } from '@/components/inmobiliaria/pqrs/PqrsDrawer';
import { BandejaDePropuestas } from '@/components/inmobiliaria/pqrs/BandejaDePropuestas';
import {
  ESTADO_BADGE,
  ESTADO_LABEL,
  SOLICITANTE_LABEL,
  TIPO_LABEL,
  textoSla,
} from '@/components/inmobiliaria/pqrs/pqrs-reglas';

/** Resumen por estado del ciclo PQRS — color por estado (token semántico). */
const RESUMEN_ITEMS: { key: string; dot: string; field: keyof typeof RESUMEN_PQRS_VACIO }[] = [
  { key: 'recibidas', dot: 'bg-primary', field: 'recibidas' },
  { key: 'asignadas', dot: 'bg-primary', field: 'asignadas' },
  { key: 'enProceso', dot: 'bg-warning', field: 'enProceso' },
  { key: 'enCotizacion', dot: 'bg-warning', field: 'enCotizacion' },
  { key: 'resueltas', dot: 'bg-success', field: 'resueltas' },
  { key: 'cerradas', dot: 'bg-fg-subtle', field: 'cerradas' },
];

/**
 * Cómo se nombra la vuelta. Espeja `VUELVE_A` de la ficha del contrato: un
 * «Volver» mudo no dice a dónde, y a esta pantalla se llega desde la sección
 * PQRS de un contrato (Nico, 2026-09-12).
 */
const VUELVE_A: Record<ReturnType<typeof lugarDeRegreso>, string> = {
  contrato: 'Volver al contrato',
  inmueble: 'Volver al inmueble',
  cobro: 'Volver al cobro',
  propietario: 'Volver al propietario',
  dispersiones: 'Volver a dispersiones',
  lista: 'Volver',
  otro: 'Volver',
};

/**
 * Buscador y filtro de la tabla (S4 de la auditoría del 13-09: era la única
 * lista del panel sin ninguno de los dos, y `listar()` trae TODAS las
 * solicitudes de la agencia — con cien filas, encontrar una era scroll).
 *
 * Se filtra en el cliente a propósito: la consulta ya trajo todo y el resumen
 * de arriba sigue contando el total de la agencia, no lo que quedó filtrado.
 */
export interface FiltrosDePqrs {
  texto: string;
  estado: PqrsEstado | 'todos';
}

export const FILTROS_DE_PQRS_VACIOS: FiltrosDePqrs = { texto: '', estado: 'todos' };

export function filtrarPqrs(solicitudes: Pqrs[], filtros: FiltrosDePqrs): Pqrs[] {
  const texto = filtros.texto.trim().toLowerCase();
  return solicitudes.filter((p) => {
    if (filtros.estado !== 'todos' && p.estado !== filtros.estado) return false;
    if (!texto) return true;
    // Lo que alguien tiene en la mano cuando busca: el radicado que le dieron,
    // el nombre de quien reclamó, de qué se trata, o el inmueble.
    return [p.radicado, p.solicitanteNombre, p.asunto, p.inmuebleLabel, p.asignadoANombre]
      .filter((x): x is string => Boolean(x))
      .some((campo) => campo.toLowerCase().includes(texto));
  });
}

const COLUMNS = [
  'colRadicado', 'colSolicitante', 'colTipo', 'colInmueble',
  'colAsignado', 'colEstado', 'colSla',
];

function PqrsContent() {
  const { t } = useI18n();
  const k = (s: string) => `inmobiliaria.pqrs.${s}`;

  const [data, setData] = useState<PqrsListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // El error entero, no un booleano: `FalloDeCarga` decide si reintentar sirve.
  const [error, setError] = useState<unknown>(null);
  const [nuevaOpen, setNuevaOpen] = useState(false);
  const [seleccionada, setSeleccionada] = useState<Pqrs | null>(null);

  // Se llega acá desde la sección PQRS de un contrato, que manda la solicitud
  // en `?pqrs=` y su propia ruta en `?volver=`: el enlace tiene que abrir ESA
  // solicitud y poder devolver a la ficha, no dejar a la persona buscándola en
  // la tabla de toda la agencia.
  const searchParams = useSearchParams();
  const pqrsPedida = searchParams.get('pqrs');
  const volver = searchParams.get('volver');
  // Sólo se acepta un destino de adentro del panel: un regreso a cualquier URL
  // es un open redirect con otro nombre. `null` = no vino ninguno.
  const rutaDeVuelta = volver ? rutaDeRegreso(volver, '') : '';

  const load = useCallback(() => {
    setIsLoading(true);
    setError(null);
    pqrsApi
      .listar()
      .then(setData)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Abrir la pedida UNA sola vez: sin esta marca, cerrar el cajón lo volvería
  // a abrir en el siguiente render porque el `?pqrs=` sigue en la URL.
  const yaAbierta = useRef<string | null>(null);
  useEffect(() => {
    if (!pqrsPedida || yaAbierta.current === pqrsPedida) return;
    const encontrada = data?.solicitudes.find((p) => p.id === pqrsPedida);
    if (!encontrada) return;
    yaAbierta.current = pqrsPedida;
    setSeleccionada(encontrada);
  }, [pqrsPedida, data]);

  const resumen = data?.resumen ?? RESUMEN_PQRS_VACIO;
  const todas = data?.solicitudes ?? [];
  const [filtros, setFiltros] = useState<FiltrosDePqrs>(FILTROS_DE_PQRS_VACIOS);
  const hayFiltros = filtros.texto.trim() !== '' || filtros.estado !== 'todos';
  const solicitudes = useMemo(() => filtrarPqrs(todas, filtros), [todas, filtros]);
  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(solicitudes);

  // Mover de estado o reasignar devuelve la fila entera: se reemplaza en su
  // lugar y se recarga el resumen de fondo, sin borrar la tabla.
  const onActualizada = (p: Pqrs) => {
    setData((prev) =>
      prev ? { ...prev, solicitudes: prev.solicitudes.map((s) => (s.id === p.id ? p : s)) } : prev,
    );
    setSeleccionada(p);
    pqrsApi
      .listar()
      .then(setData)
      .catch(() => {
        // El cambio ya quedó guardado; lo que falló fue refrescar los
        // contadores. Callarlo dejaba el resumen viejo sin decirlo.
        toast.error('No se pudo actualizar el resumen', {
          description:
            'El cambio quedó guardado; los contadores pueden estar desactualizados hasta que recargues.',
        });
      });
  };

  // Se pidió una solicitud por URL y la lista cargó bien sin ella: decirlo,
  // no callarlo. Antes el `?pqrs=` que no estaba se ignoraba en silencio y la
  // persona quedaba mirando la tabla sin saber por qué no se abrió nada.
  const pedidaNoEsta =
    pqrsPedida !== null &&
    !isLoading &&
    !error &&
    data !== null &&
    !data.solicitudes.some((p) => p.id === pqrsPedida);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          {/* La vuelta va arriba a la izquierda: es de dónde viene la persona,
              no una acción de la pantalla. */}
          {rutaDeVuelta !== '' && (
            <Link
              href={rutaDeVuelta}
              className="inline-flex items-center gap-1.5 text-caption text-fg-muted hover:text-fg"
              data-testid="pqrs-volver"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {VUELVE_A[lugarDeRegreso(rutaDeVuelta)]}
            </Link>
          )}
          <SectionLabel>{t(k('label'))}</SectionLabel>
          <h1 className="text-h2 text-fg">{t(k('title'))}</h1>
          <p className="text-body text-fg-muted max-w-2xl line-clamp-2">{t(k('subtitle'))}</p>
        </div>
        <Button onClick={() => setNuevaOpen(true)} hideArrow className="shrink-0" data-testid="pqrs-nueva">
          <Plus className="w-4 h-4" weight="bold" />
          {t(k('new'))}
        </Button>
      </header>

      {/*
        🔴 I-02: lo que el agente detectó y espera confirmación. Va ARRIBA del
        resumen porque es lo único de esta pantalla que tiene un reloj legal
        corriendo desde antes de que alguien la abra. Si no hay nada pendiente
        no se dibuja.
      */}
      <BandejaDePropuestas onRadicada={load} />

      {/* Resumen por estado */}
      <section className="space-y-3">
        <SectionLabel>{t(k('resumenLabel'))}</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {RESUMEN_ITEMS.map((item) => (
            <div key={item.key} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-center gap-2">
                <span className={cn('w-2 h-2 rounded-full flex-shrink-0', item.dot)} />
                <span className="text-caption text-fg-muted truncate">{t(k(`estado_${item.key}`))}</span>
              </div>
              {/* Un 0 mientras carga o cuando la consulta falló afirma «no hay
                  ninguna», que no se sabe. Esqueleto mientras carga; raya y
                  motivo cuando falló. */}
              {isLoading ? (
                <div className="mt-2.5 h-7 w-10 rounded bg-surface-muted animate-pulse" aria-hidden="true" />
              ) : (
                <p
                  className="mt-1.5 text-2xl font-semibold tabular-nums text-fg"
                  data-testid="pqrs-resumen-valor"
                >
                  {error ? '—' : resumen[item.field]}
                </p>
              )}
              {!isLoading && error ? (
                <p className="text-caption text-fg-subtle">No se pudo traer</p>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {pedidaNoEsta ? (
        <FalloDeCarga
          error={new ApiError(404, `La solicitud ${pqrsPedida} no está en la lista`)}
          queEs="esa solicitud"
          volverA={
            rutaDeVuelta !== ''
              ? { label: VUELVE_A[lugarDeRegreso(rutaDeVuelta)], href: rutaDeVuelta }
              : undefined
          }
        />
      ) : null}

      {/* Reparación → cotización (PQRS-03) */}
      <Link
        href="/panel/inmobiliaria/mantenimientos"
        className="flex items-center gap-3 rounded-lg border border-border bg-surface hover:bg-surface-muted/50 transition-colors p-4"
      >
        <div className="w-9 h-9 rounded-md bg-surface-muted flex items-center justify-center flex-shrink-0">
          <Wrench className="w-[18px] h-[18px] text-fg-muted" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-body-sm font-medium text-fg">{t(k('repairFlowTitle'))}</p>
          <p className="text-caption text-fg-muted mt-0.5">{t(k('repairFlowDesc'))}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-fg-muted flex-shrink-0" />
      </Link>

      {/* Solicitudes — la tabla sola dentro de la tarjeta, sin título encima
          (Nico: «nosotros no nombramos las tablas»). */}
      <section className="rounded-lg border border-border bg-surface overflow-hidden">
        {/* Buscador + filtro por estado: la primera fila de la card, como en
            Documentos. Van DENTRO de la tarjeta y FUERA del `EstadoDeDatos`
            para que no desaparezcan mientras recarga. */}
        <div className="flex flex-col gap-2 border-b border-border p-4 sm:flex-row sm:items-center">
          <SearchInput
            value={filtros.texto}
            onChange={(e) => setFiltros((f) => ({ ...f, texto: e.target.value }))}
            onClear={() => setFiltros((f) => ({ ...f, texto: '' }))}
            placeholder="Radicado, solicitante, asunto o inmueble"
            inputSize="md"
            className="w-full sm:w-80"
            data-testid="pqrs-buscar"
          />
          <Select
            value={filtros.estado}
            onValueChange={(v) => setFiltros((f) => ({ ...f, estado: v as FiltrosDePqrs['estado'] }))}
          >
            <SelectTrigger className="w-full whitespace-nowrap sm:w-48" data-testid="pqrs-filtro-estado">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              {PQRS_ESTADOS.map((e) => (
                <SelectItem key={e} value={e}>
                  {ESTADO_LABEL[e]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hayFiltros && (
            <span className="text-caption text-fg-muted tabular-nums" data-testid="pqrs-cuantas-filtradas">
              {solicitudes.length} de {todas.length}
            </span>
          )}
        </div>

        {/* El vacío vive dentro del <TableBody> para que se sigan viendo los
            encabezados. Acá sólo carga y fallo. */}
        <EstadoDeDatos
          cargando={isLoading}
          error={error}
          queEs="las solicitudes"
          onReintentar={load}
          esqueleto={
            <div className="flex items-center justify-center py-16">
              <Spinner />
            </div>
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                {COLUMNS.map((c) => (
                  <TableHead key={c} className="whitespace-nowrap">
                    {t(k(c))}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {solicitudes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length} className="p-0">
                    {/* Filtrado a cero NO es «no hay solicitudes»: ofrecer
                        «Nueva solicitud» sobre un filtro que esconde 80 filas
                        es mandar a radicar una que ya existe. */}
                    <SinDatos
                      queSon="solicitudes"
                      icono={Lifebuoy}
                      hayFiltros={hayFiltros}
                      titulo={hayFiltros ? 'Ninguna coincide con la búsqueda' : t(k('emptyTitle'))}
                      descripcion={
                        hayFiltros
                          ? 'Prueba con otras palabras o quita el filtro de estado.'
                          : t(k('emptyDesc'))
                      }
                      {...(hayFiltros
                        ? { onLimpiarFiltros: () => setFiltros(FILTROS_DE_PQRS_VACIOS) }
                        : { crear: { label: t(k('new')), onClick: () => setNuevaOpen(true) } })}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((p) => {
                  const sla = textoSla(p.slaVenceAt, p.estado);
                  return (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer"
                      data-testid="pqrs-fila"
                      tabIndex={0}
                      onClick={() => setSeleccionada(p)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSeleccionada(p);
                        }
                      }}
                    >
                      <TableCell className="whitespace-nowrap font-mono text-fg">{p.radicado}</TableCell>
                      <TableCell className="max-w-[220px]">
                        <p className="text-fg font-medium truncate">{p.solicitanteNombre}</p>
                        <p className="text-caption text-fg-muted">{SOLICITANTE_LABEL[p.solicitanteTipo]}</p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-fg-muted">{TIPO_LABEL[p.tipo]}</TableCell>
                      <TableCell className="max-w-[240px]">
                        <span className="text-fg-muted truncate block">
                          {p.inmuebleLabel ?? t(k('sinInmueble'))}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-fg-muted">
                        {p.asignadoANombre ?? t(k('sinAsignar'))}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-caption font-medium', ESTADO_BADGE[p.estado])}>
                          {ESTADO_LABEL[p.estado]}
                        </span>
                      </TableCell>
                      <TableCell className={cn('whitespace-nowrap tabular-nums', sla.vencido ? 'text-danger font-medium' : 'text-fg-muted')}>
                        {sla.texto}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {shouldPaginate && (
            <div className="border-t border-border px-4 py-3">
              <TablePagination
                total={total}
                page={page}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}
        </EstadoDeDatos>
      </section>

      <NuevaPqrsDrawer open={nuevaOpen} onOpenChange={setNuevaOpen} onCreated={load} />
      <PqrsDrawer
        pqrs={seleccionada}
        open={seleccionada !== null}
        onOpenChange={(abierto) => {
          if (!abierto) setSeleccionada(null);
        }}
        onActualizado={onActualizada}
      />
    </div>
  );
}

export default function PqrsPage() {
  return (
    // El sidebar (`arquitectura-del-panel.ts`) ofrece esta pantalla a TODOS
    // los roles de agencia y el back la sirve con `operaciones:view`. Con
    // `adminOnly` el enlace existía y al tocarlo te sacaba, sin decir nada.
    <PageGuard module="operaciones">
      {/* `useSearchParams` obliga a un límite de Suspense: sin él, `next build`
          falla al prerenderizar esta ruta. */}
      <Suspense fallback={null}>
        <PqrsContent />
      </Suspense>
    </PageGuard>
  );
}
