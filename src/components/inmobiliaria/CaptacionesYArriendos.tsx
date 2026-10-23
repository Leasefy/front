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
 */

import { useCallback, useEffect, useState } from 'react';
import { Buildings, Handshake, Users } from '@phosphor-icons/react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { agentesApi } from '@/lib/api/inmobiliaria.service';
import type { CaptacionesYArriendos as Datos } from '@/lib/types/inmobiliaria';
import { diaLegible } from '@/lib/mandato/textos';
import { CampoDeDia } from '@/components/contabilidad/CampoDeDia';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { TablePagination } from '@/components/ui/pagination';
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination';

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
  const captaciones = (datos?.captaciones ?? []).filter(
    (c) => !userId || c.agenteUserId === userId,
  );
  const arriendos = (datos?.arriendos ?? []).filter((a) => !userId || a.agenteUserId === userId);
  // Ronda 30 (regla de Nico: listas con buscador y paginación): un año de captaciones no se lee de corrido.
  const [busqueda, setBusqueda] = useState('');
  const q = busqueda.trim().toLocaleLowerCase('es');
  const coincide = (f: { principal: string; secundario: string }) =>
    !q || `${f.principal} ${f.secundario}`.toLocaleLowerCase('es').includes(q);

  return (
    <section className={className} data-testid="captaciones-y-arriendos">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
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
            {/* Ronda 30: en la ficha de un asesor (userId) el resumen por asesor era una fila
                con sus mismos números (los de las listas de abajo) y una tabla con borde dentro
                de la tarjeta de la ficha: no se pinta. */}
            {!userId ? (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2 bg-muted/30 font-mono text-label uppercase text-muted-foreground">
                <span>Asesor</span>
                <span className="text-right">Captados</span>
                <span className="text-right">Arrendados</span>
              </div>
              {asesores.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">
                  Nadie del equipo tiene captaciones ni arriendos en este rango.
                </p>
              ) : (
                asesores.map((a) => (
                  <div
                    key={a.userId}
                    className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2 border-t border-border text-sm"
                    data-testid={`asesor-${a.userId}`}
                  >
                    <span className="text-foreground">
                      {a.nombre}
                      {a.activo ? '' : ' · ya no está en el equipo'}
                    </span>
                    <span className="text-right font-mono tabular-nums">{a.captados}</span>
                    <span className="text-right font-mono tabular-nums">{a.arrendados}</span>
                  </div>
                ))
              )}
              {!userId &&
              (datos.sinAsesor.captados > 0 || datos.sinAsesor.arrendados > 0) ? (
                <div
                  className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2 border-t border-border text-sm bg-warning-soft"
                  data-testid="sin-asesor"
                >
                  <span className="flex items-center gap-1.5 text-warning">
                    <Users className="w-4 h-4" aria-hidden="true" />
                    Sin asesor asignado
                  </span>
                  <span className="text-right font-mono tabular-nums text-warning">
                    {datos.sinAsesor.captados}
                  </span>
                  <span className="text-right font-mono tabular-nums text-warning">
                    {datos.sinAsesor.arrendados}
                  </span>
                </div>
              ) : null}
            </div>
            ) : null}

            {captaciones.length + arriendos.length > 0 ? (
              <div className="relative w-full sm:w-80">
                <MagnifyingGlass
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
                  aria-hidden="true"
                />
                <Input
                  className="pl-9"
                  placeholder="Buscar inmueble, persona o asesor"
                  aria-label="Buscar en las captaciones y los arriendos"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  data-testid="buscar-captaciones"
                />
              </div>
            ) : null}
            <Lista
              titulo="Captaciones"
              icono={<Buildings className="w-4 h-4 text-muted-foreground" aria-hidden="true" />}
              vacio="Ninguna en el rango."
              filas={captaciones.map((c) => ({
                id: c.consignacionId,
                principal: c.inmueble,
                secundario: [c.propietario, c.agenteNombre ?? 'sin asesor']
                  .filter(Boolean)
                  .join(' · '),
                fecha: c.fecha,
              })).filter(coincide)}
              buscando={q !== ''}
            />
            <Lista
              titulo="Arriendos cerrados"
              icono={<Handshake className="w-4 h-4 text-muted-foreground" aria-hidden="true" />}
              vacio="Ninguno en el rango."
              filas={arriendos.map((a) => ({
                id: a.pipelineItemId,
                principal: a.inmueble ?? 'Inmueble sin título',
                secundario: [a.inquilino, a.agenteNombre ?? 'sin asesor'].filter(Boolean).join(' · '),
                fecha: a.fecha,
              })).filter(coincide)}
              buscando={q !== ''}
            />
          </div>
        ) : null}
      </EstadoDeDatos>
    </section>
  );
}

function Lista({
  titulo,
  icono,
  vacio,
  filas,
  buscando = false,
}: {
  titulo: string;
  icono: React.ReactNode;
  vacio: string;
  filas: { id: string; principal: string; secundario: string; fecha: string }[];
  buscando?: boolean;
}) {
  const pag = useTablePagination(filas, {});
  return (
    <div className="space-y-2">
      <h4 className="flex items-center gap-2 text-sm font-medium text-foreground">
        {icono}
        {titulo} <span className="font-mono text-fg-muted">({filas.length})</span>
      </h4>
      {filas.length === 0 ? (
        <p className="text-sm text-muted-foreground">{buscando ? 'Nada coincide con la búsqueda.' : vacio}</p>
      ) : (
        <>
          <ul className="space-y-1">
            {pag.pageItems.map((f) => (
              <li key={f.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="text-foreground">{f.principal}</span>
                  <span className="block text-caption text-muted-foreground">{f.secundario}</span>
                </span>
                <span className="whitespace-nowrap font-mono text-caption text-muted-foreground">
                  {diaLegible(f.fecha)}
                </span>
              </li>
            ))}
          </ul>
          <TablePagination
            total={pag.total}
            page={pag.page}
            pageSize={pag.pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={pag.setPage}
            onPageSizeChange={pag.setPageSize}
          />
        </>
      )}
    </div>
  );
}
