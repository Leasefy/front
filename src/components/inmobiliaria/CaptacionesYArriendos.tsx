'use client';

/**
 * Quién captó y quién arrendó — SIN PLATA.
 *
 * 🔴 17-09 (Nico): «la comisión de los asesores va por fuera de Leasefy». Lo
 * que sí es de Leasefy es el hecho: qué mandatos trajo cada asesor (la
 * consignación que tiene su nombre) y qué arriendos cerró (el proceso del
 * embudo que él llevó a COMPLETED). Con eso la inmobiliaria liquida la
 * comisión donde la liquide hoy; acá no se le atribuye un peso a nadie.
 *
 * Lo que no tiene asesor se cuenta aparte y se dice: sin eso, un equipo con
 * todo sin asignar se leería como un equipo que no hizo nada.
 *
 * Nico (23-10-2026: «¿esto no debería ser una tabla?»): las captaciones y los arriendos son UNA tabla con su
 * barra adentro —las dos pestañas con su conteo, el buscador y el asesor— y la paginación al pie; el resumen por
 * asesor, también en tabla. El rango de fechas queda arriba porque vuelve a pedir los datos.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MagnifyingGlass, Users } from '@phosphor-icons/react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SinDatos } from '@/components/estado/SinDatos';
import { agentesApi } from '@/lib/api/inmobiliaria.service';
import type { CaptacionesYArriendos as Datos } from '@/lib/types/inmobiliaria';
import { fechaCorta } from '@/lib/fechas/fecha-de-la-casa';
import { CampoDeDia } from '@/components/contabilidad/CampoDeDia';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/pagination';
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado';
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination';

type Pestana = 'captaciones' | 'arriendos';
/** `todos`, `sin` (sin asesor) o el userId del asesor. */
type FiltroDeAsesor = string;

interface Fila {
  id: string;
  inmueble: string;
  persona: string;
  asesorId: string | null;
  asesor: string | null;
  fecha: string;
}

export function CaptacionesYArriendos({
  /** Sólo este asesor (su ficha). Sin él, todo el equipo. */
  userId,
  className,
}: {
  userId?: string;
  className?: string;
}) {
  const anio = new Date().getFullYear();
  const [desde, setDesde] = useState(`${anio}-01-01`);
  const [hasta, setHasta] = useState(`${anio}-12-31`);
  const [datos, setDatos] = useState<Datos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setDatos(await agentesApi.captacionesYArriendos({ desde, hasta }));
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [desde, hasta]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const asesores = (datos?.asesores ?? []).filter((a) => !userId || a.userId === userId);
  const captaciones: Fila[] = useMemo(
    () =>
      (datos?.captaciones ?? [])
        .filter((c) => !userId || c.agenteUserId === userId)
        .map((c) => ({
          id: c.consignacionId,
          inmueble: c.inmueble,
          persona: c.propietario ?? '',
          asesorId: c.agenteUserId ?? null,
          asesor: c.agenteNombre ?? null,
          fecha: c.fecha,
        })),
    [datos, userId],
  );
  const arriendos: Fila[] = useMemo(
    () =>
      (datos?.arriendos ?? [])
        .filter((a) => !userId || a.agenteUserId === userId)
        .map((a) => ({
          id: a.pipelineItemId,
          inmueble: a.inmueble ?? 'Inmueble sin título',
          persona: a.inquilino ?? '',
          asesorId: a.agenteUserId ?? null,
          asesor: a.agenteNombre ?? null,
          fecha: a.fecha,
        })),
    [datos, userId],
  );

  return (
    <section className={className} data-testid="captaciones-y-arriendos">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-base font-medium text-foreground">Captaciones y arriendos</h3>
          <p className="text-sm text-muted-foreground">
            Quién trajo el mandato y quién cerró el arriendo. Lo que gana cada asesor está en
            Captación y arriendo › Comisiones y metas.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <label className="text-caption text-muted-foreground">
            Desde
            <CampoDeDia
              id="captaciones-y-arriendos-fecha-1"
              value={desde}
              onChange={(v) => setDesde(v)}
              max={hasta}
              className="mt-1"
            />
          </label>
          <label className="text-caption text-muted-foreground">
            Hasta
            <CampoDeDia
              id="captaciones-y-arriendos-fecha-2"
              value={hasta}
              onChange={(v) => setHasta(v)}
              min={desde}
              className="mt-1"
            />
          </label>
        </div>
      </div>

      <EstadoDeDatos
        cargando={cargando}
        error={error}
        vacio={!datos}
        queEs="las captaciones y los arriendos"
        onReintentar={cargar}
      >
        {datos ? (
          <div className="space-y-6">
            {/* Ronda 30: en la ficha de un asesor (userId) el resumen por asesor repetía sus números: no se pinta. */}
            {!userId ? <ResumenPorAsesor asesores={asesores} sinAsesor={datos.sinAsesor} /> : null}
            <TablaDelPeriodo captaciones={captaciones} arriendos={arriendos} asesores={asesores} conFiltroDeAsesor={!userId} />
          </div>
        ) : null}
      </EstadoDeDatos>
    </section>
  );
}

function ResumenPorAsesor({
  asesores,
  sinAsesor,
}: {
  asesores: Datos['asesores'];
  sinAsesor: Datos['sinAsesor'];
}) {
  const conSinAsesor = sinAsesor.captados > 0 || sinAsesor.arrendados > 0;
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface" aria-label="Por asesor">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="p-3 pl-4 text-left">Asesor</TableHead>
            <TableHead className="p-3 text-right">Captados</TableHead>
            <TableHead className="p-3 pr-4 text-right">Arrendados</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {asesores.length === 0 && !conSinAsesor ? (
            <TableRow>
              <TableCell colSpan={3} className="p-0">
                <SinDatos
                  queSon="captaciones ni arriendos del equipo"
                  titulo="Nadie del equipo tiene captaciones ni arriendos en este rango"
                  descripcion="Cuando un asesor traiga una consignación o cierre un arriendo, aparece aquí con su conteo."
                  ilustracion="equipo"
                  className="py-10"
                />
              </TableCell>
            </TableRow>
          ) : null}
          {asesores.map((a) => (
            <TableRow key={a.userId} className="border-t border-border" data-testid={`asesor-${a.userId}`}>
              <TableCell className="p-3 pl-4 text-fg [overflow-wrap:anywhere]">
                {a.nombre}
                {a.activo ? '' : ' · ya no está en el equipo'}
              </TableCell>
              <TableCell className="p-3 text-right font-mono tabular-nums">{a.captados}</TableCell>
              <TableCell className="p-3 pr-4 text-right font-mono tabular-nums">{a.arrendados}</TableCell>
            </TableRow>
          ))}
          {conSinAsesor ? (
            <TableRow className="border-t border-border bg-warning-soft" data-testid="sin-asesor">
              <TableCell className="p-3 pl-4">
                <span className="flex items-center gap-1.5 text-warning">
                  <Users className="h-4 w-4" aria-hidden="true" />
                  Sin asesor asignado
                </span>
              </TableCell>
              <TableCell className="p-3 text-right font-mono tabular-nums text-warning">{sinAsesor.captados}</TableCell>
              <TableCell className="p-3 pr-4 text-right font-mono tabular-nums text-warning">{sinAsesor.arrendados}</TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </section>
  );
}

function TablaDelPeriodo({
  captaciones,
  arriendos,
  asesores,
  conFiltroDeAsesor,
}: {
  captaciones: Fila[];
  arriendos: Fila[];
  asesores: Datos['asesores'];
  conFiltroDeAsesor: boolean;
}) {
  const [pestana, setPestana] = useState<Pestana>('captaciones');
  const [busqueda, setBusqueda] = useState('');
  const [asesor, setAsesor] = useState<FiltroDeAsesor>('todos');
  const q = busqueda.trim().toLocaleLowerCase('es');
  const hayFiltros = q !== '' || asesor !== 'todos';
  const deLaPestana = pestana === 'captaciones' ? captaciones : arriendos;
  const filas = useMemo(
    () =>
      deLaPestana.filter((f) => {
        if (asesor === 'sin' ? f.asesorId !== null : asesor !== 'todos' && f.asesorId !== asesor) return false;
        return !q || `${f.inmueble} ${f.persona} ${f.asesor ?? 'sin asesor'}`.toLocaleLowerCase('es').includes(q);
      }),
    [deLaPestana, asesor, q],
  );
  const pag = useTablePagination(filas, { resetKey: `${pestana}|${asesor}|${q}` });
  const quien = pestana === 'captaciones' ? 'Propietario' : 'Inquilino';

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface" data-testid="tabla-de-captaciones">
      <div className="border-b border-border px-4 py-2.5">
        <PestanasDeEstado<Pestana>
          etiqueta="Captaciones o arriendos"
          valor={pestana}
          onCambio={setPestana}
          data-testid="captaciones-pestanas"
          pestanas={[
            { valor: 'captaciones', etiqueta: 'Captaciones', cuantos: captaciones.length, fija: true, testid: 'pestana-captaciones' },
            { valor: 'arriendos', etiqueta: 'Arriendos cerrados', cuantos: arriendos.length, fija: true, testid: 'pestana-arriendos' },
          ]}
        />
      </div>
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <MagnifyingGlass
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
            aria-hidden="true"
          />
          <Input
            type="search"
            className="pl-9"
            placeholder="Buscar inmueble, persona o asesor"
            aria-label="Buscar en las captaciones y los arriendos"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            data-testid="buscar-captaciones"
          />
        </div>
        {conFiltroDeAsesor ? (
          <Select value={asesor} onValueChange={setAsesor}>
            <SelectTrigger className="sm:w-[220px]" aria-label="Asesor" data-testid="filtro-de-asesor">
              <SelectValue placeholder="Todos los asesores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los asesores</SelectItem>
              {asesores.map((a) => (
                <SelectItem key={a.userId} value={a.userId}>
                  {a.nombre}
                </SelectItem>
              ))}
              <SelectItem value="sin">Sin asesor asignado</SelectItem>
            </SelectContent>
          </Select>
        ) : null}
      </div>
      {/* En el celular cada fila es una tarjeta: el inmueble, debajo la persona y el asesor, y la fecha a la derecha. */}
      <Table className="md:min-w-[720px] max-md:block">
        <TableHeader className="max-md:hidden">
          <TableRow className="border-b border-border-faint">
            <TableHead className="p-3 pl-4 text-left">Inmueble</TableHead>
            <TableHead className="p-3 text-left">{quien}</TableHead>
            <TableHead className="p-3 text-left">Asesor</TableHead>
            <TableHead className="p-3 pr-4 text-right">Fecha</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="max-md:block">
          {pag.pageItems.length === 0 ? (
            <TableRow className="max-md:block">
              <TableCell colSpan={4} className="p-0 max-md:block">
                <SinDatos
                  hayFiltros={hayFiltros}
                  queSon={pestana === 'captaciones' ? 'captaciones' : 'arriendos cerrados'}
                  titulo={pestana === 'captaciones' ? 'Ninguna captación en el rango' : 'Ningún arriendo cerrado en el rango'}
                  descripcion={
                    pestana === 'captaciones'
                      ? 'Cuando el equipo traiga una consignación en estas fechas, aparece aquí con quién lo trajo.'
                      : 'Cuando el equipo cierre un arriendo en estas fechas, aparece aquí con quién lo cerró.'
                  }
                  ilustracion={pestana === 'captaciones' ? 'megafono' : 'llaves'}
                  onLimpiarFiltros={() => {
                    setBusqueda('');
                    setAsesor('todos');
                  }}
                  className="py-10"
                />
              </TableCell>
            </TableRow>
          ) : (
            pag.pageItems.map((f) => (
              <TableRow
                key={f.id}
                className="border-b border-border last:border-b-0 max-md:flex max-md:items-start max-md:justify-between max-md:gap-3 max-md:px-4 max-md:py-3"
                data-testid={`fila-${pestana}-${f.id}`}
              >
                <TableCell className="p-3 pl-4 text-fg max-md:block max-md:min-w-0 max-md:p-0">
                  {f.inmueble}
                  <span className="mt-0.5 block text-caption text-fg-muted md:hidden">
                    {[f.persona, f.asesor ?? 'sin asesor'].filter(Boolean).join(' · ')}
                  </span>
                </TableCell>
                <TableCell className="p-3 text-fg-muted max-md:hidden">{f.persona || '—'}</TableCell>
                <TableCell className="p-3 max-md:hidden">
                  {f.asesor ? <span className="text-fg">{f.asesor}</span> : <span className="text-fg-subtle">Sin asesor</span>}
                </TableCell>
                <TableCell className="whitespace-nowrap p-3 pr-4 text-right font-mono text-caption text-fg-muted max-md:block max-md:shrink-0 max-md:p-0">
                  {fechaCorta(f.fecha)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {filas.length > 0 ? (
        <div className="border-t border-border px-4 py-2">
          <TablePagination
            total={pag.total}
            page={pag.page}
            pageSize={pag.pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={pag.setPage}
            onPageSizeChange={pag.setPageSize}
          />
        </div>
      ) : null}
    </section>
  );
}
