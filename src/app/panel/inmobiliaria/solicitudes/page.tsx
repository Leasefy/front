'use client';

import { useFilasMarcadas } from '@/lib/hooks/use-filas-marcadas';
import { CasillaDeLaFila, CasillaDeLaPagina } from '@/components/masivas/CasillasDeLaTabla';
import { PqrsMarcadas } from '@/components/pqrs/PqrsMarcadas';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Lifebuoy, Plus } from '@phosphor-icons/react';
import { lugarDeRegreso, rutaDeRegreso } from '@/lib/nav/ruta-de-regreso';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SearchInput, type TonoDeCifra } from '@leasefy/cadence';
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado';
import { sinElNumeroRepetido } from '@/lib/pantalla/pestanas-sin-repetir';

import { useI18n } from '@/lib/i18n';
import { SectionLabel } from '@/components/ui/section-label';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableHeader, TableBodyAnimado, TableRow, TableRowAnimada, TableHead, TableCell } from '@/components/ui/table';
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
import {
  filtrarPqrs,
  FILTROS_DE_PQRS_VACIOS,
  type FiltrosDePqrs,
} from './filtrar-pqrs';
import { PQRS_ESTADOS } from '@/lib/api/pqrs-agencia.types';
import { NuevaPqrsDrawer } from '@/components/inmobiliaria/pqrs/NuevaPqrsDrawer';
import { PqrsDrawer } from '@/components/inmobiliaria/pqrs/PqrsDrawer';
import { BandejaDePropuestas } from '@/components/inmobiliaria/pqrs/BandejaDePropuestas';
import {
  ESTADO_BADGE,
  ESTADO_LABEL,
  SOLICITANTE_LABEL,
  inmuebleSinRepetir,
  nombreDelTipo,
  textoSla,
} from '@/components/inmobiliaria/pqrs/pqrs-reglas';
import { AvisoDeVencidas } from '@/components/inmobiliaria/pqrs/AvisoDeVencidas';

/** Resumen por estado del ciclo PQRS — color por estado (token semántico). */
/** La franja de la tabla: primero lo urgente (el plazo es lo que se cumple o no), luego los estados. */
const CIFRAS_DE_PQRS: {
  key: string;
  etiqueta?: string;
  field: keyof typeof RESUMEN_PQRS_VACIO;
  filtro: FiltrosDePqrs['estado'];
  tono?: TonoDeCifra;
}[] = [
  { key: 'vencidas', etiqueta: 'Vencidas', field: 'vencidas', filtro: 'vencidas', tono: 'peligro' },
  { key: 'porVencer', etiqueta: 'Por vencer', field: 'porVencer', filtro: 'porVencer', tono: 'aviso' },
  { key: 'recibidas', field: 'recibidas', filtro: 'RECIBIDA', tono: 'voltaje' },
  { key: 'asignadas', field: 'asignadas', filtro: 'ASIGNADA' },
  { key: 'enProceso', field: 'enProceso', filtro: 'EN_PROCESO' },
  { key: 'enCotizacion', field: 'enCotizacion', filtro: 'EN_COTIZACION' },
  { key: 'resueltas', field: 'resueltas', filtro: 'RESUELTA' },
  { key: 'cerradas', field: 'cerradas', filtro: 'CERRADA' },
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

// 🔴 El buscador y el filtro viven en `filtrar-pqrs.ts`: un archivo de página
// no puede exportar nada fuera del juego que Next admite, y estaban exportados
// para poder probarlos. Ver la cabecera de ese archivo.

const COLUMNS = [
  'colRadicado', 'colSolicitante', 'colTipo', 'colInmueble',
  'colAsignado', 'colEstado', 'colSla',
];

function PqrsContent() {
  const { t } = useI18n();
  const k = (s: string) => `inmobiliaria.pqrs.${s}`;

  const [data, setData] = useState<PqrsListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // ¿Se vio la carga? Entonces las cifras del resumen que llegan cuentan desde 0.
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
  // Acciones masivas (Nico, 10-10-2026). Con otro filtro, lo marcado se suelta.
  const { marcadas, marcar, quitar: quitarLaSeleccion } = useFilasMarcadas(JSON.stringify(filtros));
  const pqrsMarcadas = useMemo(() => todas.filter((p) => marcadas.has(p.id)), [todas, marcadas]);

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

      {/* SO-25/SO-26: vencidas y por vencer, y a quién se le escalan. */}
      {!isLoading && !error ? (
        <AvisoDeVencidas
          vencidas={resumen.vencidas ?? 0}
          porVencer={resumen.porVencer ?? 0}
          onVer={(estado) => setFiltros((f) => ({ ...f, estado }))}
        />
      ) : null}

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

      {/* Solicitudes — la tabla sola dentro de la tarjeta, sin título encima
          (Nico: «nosotros no nombramos las tablas»). */}
      <section className="rounded-lg border border-border bg-surface overflow-hidden">
        {/* Buscador + filtro por estado: la primera fila de la card, como en
            Documentos. Van DENTRO de la tarjeta y FUERA del `EstadoDeDatos`
            para que no desaparezcan mientras recarga. */}
        {/* GLOW UP 21-10 · el trabajo de esta pantalla es RESPONDER CADA PQRS DENTRO DEL PLAZO: la
            franja empieza por lo urgente (vencidas, por vencer) y sigue con los estados; cada cifra
            filtra la tabla y se vuelve a tocar para quitar el filtro. Antes los estados eran una
            franja aparte que sólo informaba y un desplegable con lo mismo. */}
        {/* Revisión de Operación (21-10): ocho cifras grandes —siete en cero— pasan a pestañas
            de estado con su conteo; las en cero no salen (salvo «Todas» y la elegida), y la de
            vencidas lleva el punto. Mientras carga o si falló, sin números: nunca un 0 inventado. */}
        <div className="border-b border-border px-4 py-3" data-testid="pqrs-por-estado">
          <PestanasDeEstado
            etiqueta="Filtrar por plazo y estado"
            valor={filtros.estado}
            onCambio={(v) => setFiltros((f) => ({ ...f, estado: v }))}
            // R2 (revisora r27): «Todas 1 · Asignadas 1» decía el número dos veces.
            pestanas={sinElNumeroRepetido<FiltrosDePqrs['estado']>([
              { valor: 'todos' as FiltrosDePqrs['estado'], etiqueta: 'Todas', cuantos: isLoading || error ? null : resumen.total, fija: true, testid: 'pqrs-pestana-todas' }, // r25: «Todas» con su número, como las demás
              ...CIFRAS_DE_PQRS.map((item) => ({
                valor: item.filtro,
                etiqueta: item.etiqueta ?? t(k(`estado_${item.key}`)),
                cuantos: isLoading || error ? null : resumen[item.field],
                tono: item.key === 'vencidas' ? ('aviso' as const) : undefined,
                testid: `pqrs-pestana-${item.key}`,
              })),
            ], 'todos', filtros.estado)}
          />
          {!isLoading && error ? <p className="mt-2 text-caption text-fg-muted">No se pudo traer el resumen.</p> : null}
        </div>
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
          {hayFiltros && (
            <span className="text-caption text-fg-muted tabular-nums" data-testid="pqrs-cuantas-filtradas">
              {solicitudes.length} de {todas.length}
            </span>
          )}
        </div>

        {/* El vacío vive dentro del <TableBody> para que se sigan viendo los
            encabezados. Aquí sólo carga y fallo. */}
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
          {/* Revisora r25 (§25.1 4b): a 390 cada solicitud es una tarjeta (patrón de Deuda del mes), no una
              tabla encogida que se corre a los lados. Arriba de md, la tabla de siempre. */}
          <Table className="max-md:block">
            <TableHeader className="max-md:hidden">
              <TableRow>
                <TableHead className="w-10 pl-4 pr-0">
                  <CasillaDeLaPagina ids={pageItems.map((p) => p.id)} marcadas={marcadas} onMarcar={marcar} queSon="solicitudes" />
                </TableHead>
                {COLUMNS.map((c) => (
                  <TableHead key={c} className="whitespace-nowrap">
                    {t(k(c))}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            {/* Buscar, filtrar, paginar o radicar: las filas entran
                escalonadas y las que sobran salen. */}
            <TableBodyAnimado className="max-md:block">
              {solicitudes.length === 0 ? (
                <TableRowAnimada key="vacio" className="max-md:block">
                  <TableCell colSpan={COLUMNS.length + 1} className="p-0 max-md:block">
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
                </TableRowAnimada>
              ) : (
                pageItems.map((p) => {
                  const sla = textoSla(p.slaVenceAt, p.estado);
                  return (
                    <TableRowAnimada
                      key={p.id}
                      className="cursor-pointer max-md:grid max-md:grid-cols-[auto_minmax(0,1fr)_auto] max-md:gap-x-3 max-md:gap-y-1 max-md:border-b max-md:border-border max-md:px-4 max-md:py-3 max-md:last:border-0"
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
                      <TableCell className="w-10 pl-4 pr-0 max-md:col-start-1 max-md:row-span-3 max-md:row-start-1 max-md:block max-md:w-auto max-md:p-0 max-md:pt-0.5" onKeyDown={(e) => e.stopPropagation()}>
                        <CasillaDeLaFila id={p.id} nombre={`la solicitud ${p.radicado}`} marcadas={marcadas} onMarcar={marcar} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-fg max-md:col-start-2 max-md:row-start-1 max-md:block max-md:p-0 max-md:text-caption max-md:text-fg-muted">{p.radicado}</TableCell>
                      <TableCell className="max-w-[220px] max-md:col-start-2 max-md:row-start-2 max-md:block max-md:max-w-none max-md:p-0">
                        <p className="text-fg font-medium truncate">{p.solicitanteNombre}</p>
                        <p className="text-caption text-fg-muted">{SOLICITANTE_LABEL[p.solicitanteTipo]}</p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-fg-muted max-md:hidden">{nombreDelTipo(p)}</TableCell>
                      <TableCell className="max-w-[240px] max-md:hidden">
                        <span className="text-fg-muted truncate block">
                          {inmuebleSinRepetir(p.inmuebleLabel) ?? t(k('sinInmueble'))}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-fg-muted max-md:hidden">
                        {p.asignadoANombre ?? t(k('sinAsignar'))}
                      </TableCell>
                      <TableCell className="whitespace-nowrap max-md:col-start-3 max-md:row-start-1 max-md:block max-md:p-0 max-md:text-right">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-caption font-medium', ESTADO_BADGE[p.estado])}>
                          {ESTADO_LABEL[p.estado]}
                        </span>
                      </TableCell>
                      <TableCell className={cn('whitespace-nowrap tabular-nums max-md:col-span-2 max-md:col-start-2 max-md:row-start-3 max-md:block max-md:p-0 max-md:text-caption', sla.vencido ? 'text-danger font-medium' : 'text-fg-muted')}>
                        {sla.texto}
                      </TableCell>
                    </TableRowAnimada>
                  );
                })
              )}
            </TableBodyAnimado>
          </Table>

          {/* Acciones masivas: el pie de la MISMA tabla donde se marca. */}
          {todas.length > 0 && (
            <PqrsMarcadas
              marcadas={pqrsMarcadas}
              onQuitar={quitarLaSeleccion}
              onCambiaron={() => {
                pqrsApi.listar().then(setData).catch(() => undefined);
              }}
            />
          )}

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

      {/* Reparación → cotización (PQRS-03): una línea bajo la tabla, no una tarjeta con flecha. */}
      <p className="text-caption text-fg-muted">
        {t(k('repairFlowDesc'))}{' '}
        <Link href="/panel/inmobiliaria/mantenimientos" className="font-medium text-fg underline decoration-border-strong underline-offset-2 hover:decoration-fg">
          Ver mantenimientos
        </Link>
      </p>

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
