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
import { Input } from '@/components/ui/input';
import { agentesApi } from '@/lib/api/inmobiliaria.service';
import type { CaptacionesYArriendos as Datos } from '@/lib/types/inmobiliaria';
import { diaLegible } from '@/lib/mandato/textos';

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

  return (
    <section className={className} data-testid="captaciones-y-arriendos">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Captaciones y arriendos</h3>
          <p className="text-sm text-muted-foreground">
            Quién trajo el mandato y quién cerró el arriendo. La comisión de los asesores se
            liquida por fuera de Leasefy: acá no hay pesos.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <label className="text-xs text-muted-foreground">
            Desde
            <Input
              type="date"
              value={desde}
              max={hasta}
              onChange={(e) => setDesde(e.target.value)}
              className="mt-1"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Hasta
            <Input
              type="date"
              value={hasta}
              min={desde}
              onChange={(e) => setHasta(e.target.value)}
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
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2 bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
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
                    <span className="text-right tabular-nums">{a.captados}</span>
                    <span className="text-right tabular-nums">{a.arrendados}</span>
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
                  <span className="text-right tabular-nums text-warning">
                    {datos.sinAsesor.captados}
                  </span>
                  <span className="text-right tabular-nums text-warning">
                    {datos.sinAsesor.arrendados}
                  </span>
                </div>
              ) : null}
            </div>

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
              }))}
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
              }))}
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
}: {
  titulo: string;
  icono: React.ReactNode;
  vacio: string;
  filas: { id: string; principal: string; secundario: string; fecha: string }[];
}) {
  return (
    <div className="space-y-2">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icono}
        {titulo} ({filas.length})
      </h4>
      {filas.length === 0 ? (
        <p className="text-sm text-muted-foreground">{vacio}</p>
      ) : (
        <ul className="space-y-1">
          {filas.map((f) => (
            <li key={f.id} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0">
                <span className="text-foreground">{f.principal}</span>
                <span className="block text-xs text-muted-foreground">{f.secundario}</span>
              </span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {diaLegible(f.fecha)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
