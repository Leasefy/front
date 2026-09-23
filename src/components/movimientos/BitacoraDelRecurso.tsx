'use client';

/**
 * «Movimientos»: quién hizo qué sobre ESTE recurso, con su rol y cuándo.
 *
 * Nico (22-09-2026): «cada uno de los features debería tener bitácora de
 * uso/movimiento, del usuario que haga algo, su rol, etc.… debe estar en todo
 * lado». Esta es la pieza que se mete en los cajones (dispersión, lote,
 * egreso, factura, contrato, propietario, inmueble).
 *
 * ── Tres decisiones ─────────────────────────────────────────────────────────
 *
 * 1. **Plegada, y pide los datos al ABRIRSE.** El cajón no le pide nada nuevo
 *    al back sin necesidad: quien abre un egreso para corregirle la fecha no
 *    necesita la bitácora, y cada cajón abierto no tiene que costar una
 *    consulta más.
 * 2. **Sin permiso no se abre, y dice por qué.** Ver la bitácora es el permiso
 *    `bitacora:view` (de fábrica, sólo el administrador). Un botón que se abre
 *    para responder «403» es un cable muerto; uno apagado con el porqué no.
 * 3. **Convive con la bitácora de dominio, no la reemplaza.** El historial del
 *    egreso dice QUÉ cambió (de qué fecha a cuál, con qué motivo); ésta dice
 *    QUIÉN tocó el recurso, con qué rol, y también lo que intentó sin permiso.
 *    Son dos preguntas: no se duplica, se complementa.
 */

import { useCallback, useEffect, useState } from 'react';
import { CaretDown, ClockCounterClockwise } from '@phosphor-icons/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ApiError } from '@/lib/api/client';
import { movimientosApi, type MovimientosDelRecurso } from '@/lib/api/movimientos.service';
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext';
import {
  RESULTADO_EN_PALABRAS,
  cuandoEnBogota,
  quienFue,
  resultadoDe,
  rolEnPalabras,
} from '@/lib/movimientos/en-palabras';
import { cn } from '@/lib/utils';

export const SIN_PERMISO_DE_BITACORA =
  'Ver quién hizo qué es el permiso «Bitácora». Pídeselo a un administrador.';

const TONO = { exito: 'secondary', negado: 'warning', error: 'destructive' } as const;

export interface RecursoDeLaBitacora {
  /** Tipo canónico del back: `lote`, `dispersion`, `egreso`, `factura`, `contrato`, `propietario`, `inmueble`… */
  tipo: string;
  id: string | null | undefined;
}

/**
 * Un recurso (`tipo` + `id`) o varios (`recursos`): la ficha del inmueble es a
 * la vez el INMUEBLE (`/properties/:id`) y su MANDATO
 * (`/inmobiliaria/consignaciones/:id`), y quien la mira quiere una sola lista.
 */
export function BitacoraDelRecurso({
  tipo,
  id,
  recursos,
  className,
}: {
  tipo?: string;
  id?: string | null;
  recursos?: RecursoDeLaBitacora[];
  className?: string;
}) {
  const lista = (recursos ?? [{ tipo: tipo ?? '', id }]).filter(
    (r): r is { tipo: string; id: string } => !!r.tipo && !!r.id,
  );
  const llave = lista.map((r) => `${r.tipo}:${r.id}`).join('|');
  const tipoPrincipal = lista[0]?.tipo ?? tipo ?? 'recurso';
  const permisos = usePermissionsContextSafe();
  // Fuera del panel (sin proveedor de permisos) no se niega de antemano: decide
  // el back y, si dice 403, se dice acá.
  const puede = permisos ? permisos.canAccess('bitacora', 'view') : true;

  const [abierta, setAbierta] = useState(false);
  const [datos, setDatos] = useState<MovimientosDelRecurso | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const pedidos = llave
      .split('|')
      .filter(Boolean)
      .map((par) => {
        const i = par.indexOf(':');
        return { tipo: par.slice(0, i), id: par.slice(i + 1) };
      });
    if (pedidos.length === 0) return;
    setCargando(true);
    setError(null);
    try {
      const respuestas = await Promise.all(
        pedidos.map((r) => movimientosApi.delRecurso(r.tipo, r.id)),
      );
      // Una sola lista, de lo más nuevo a lo más viejo.
      setDatos({
        disponible: respuestas.every((r) => r.disponible),
        motivo: respuestas.find((r) => !r.disponible)?.motivo ?? null,
        filas: respuestas
          .flatMap((r) => r.filas)
          .sort((a, b) => b.fecha.localeCompare(a.fecha)),
      });
    } catch (e) {
      setDatos(null);
      setError(
        e instanceof ApiError && e.status === 403
          ? SIN_PERMISO_DE_BITACORA
          : 'No se pudieron leer los movimientos.',
      );
    } finally {
      setCargando(false);
    }
  }, [llave]);

  // El mismo cajón se reusa para otra fila: lo leído era de la anterior.
  useEffect(() => {
    setDatos(null);
    setError(null);
    setAbierta(false);
  }, [llave]);

  if (lista.length === 0) return null;

  const alternar = () => {
    const ahora = !abierta;
    setAbierta(ahora);
    if (ahora && datos === null && !cargando) void cargar();
  };

  return (
    <section
      className={cn('rounded-md border border-border', className)}
      aria-label="Movimientos"
      data-testid={`movimientos-del-recurso-${tipoPrincipal}`}
    >
      <button
        type="button"
        onClick={alternar}
        disabled={!puede}
        aria-expanded={abierta}
        title={puede ? undefined : SIN_PERMISO_DE_BITACORA}
        className={cn(
          'flex w-full items-center justify-between gap-3 px-4 py-3 text-left',
          puede ? 'hover:bg-surface-hover' : 'cursor-not-allowed opacity-60',
        )}
        data-testid="movimientos-abrir"
      >
        <span className="flex items-center gap-2">
          <ClockCounterClockwise className="h-4 w-4 text-fg-muted" aria-hidden="true" />
          <span className="text-sm font-medium text-fg">Movimientos</span>
          <span className="text-caption text-fg-muted">quién hizo qué, con su rol</span>
        </span>
        <CaretDown
          className={cn('h-4 w-4 text-fg-muted transition-transform', abierta && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {!puede ? (
        <p className="border-t border-border px-4 py-2 text-caption text-fg-muted" data-testid="movimientos-sin-permiso">
          {SIN_PERMISO_DE_BITACORA}
        </p>
      ) : null}

      {abierta && puede ? (
        <div className="border-t border-border px-4 py-3" data-testid="movimientos-contenido">
          {cargando ? (
            <p className="flex items-center gap-2 text-sm text-fg-muted">
              <Spinner size="sm" /> Leyendo los movimientos…
            </p>
          ) : error ? (
            <div className="space-y-2">
              <p className="text-sm text-danger" data-testid="movimientos-error">
                {error}
              </p>
              {error !== SIN_PERMISO_DE_BITACORA ? (
                <Button variant="outline" size="sm" hideArrow onClick={() => void cargar()}>
                  Reintentar
                </Button>
              ) : null}
            </div>
          ) : datos && !datos.disponible ? (
            <p className="text-sm text-fg-muted" data-testid="movimientos-sin-migrar" title={datos.motivo ?? undefined}>
              La bitácora todavía no guarda movimientos: falta un paso de la base de datos que nuestro
              equipo está habilitando.
            </p>
          ) : datos && datos.filas.length === 0 ? (
            <p className="text-sm text-fg-muted" data-testid="movimientos-vacio">
              Nadie ha hecho nada sobre esto desde que la bitácora empezó a registrar.
            </p>
          ) : datos ? (
            <ol className="space-y-3" data-testid="movimientos-lista">
              {datos.filas.map((m) => {
                const r = resultadoDe(m.resultado);
                return (
                  <li key={m.id} className="text-sm" data-testid={`movimiento-${m.id}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-fg">{m.accion}</span>
                      {r !== 'exito' ? (
                        <Badge variant={TONO[r]}>{RESULTADO_EN_PALABRAS[r]}</Badge>
                      ) : null}
                    </div>
                    <p className="text-caption text-fg-muted">
                      {quienFue(m)} · {rolEnPalabras(m.actor.rol)} ·{' '}
                      <span className="font-mono">{cuandoEnBogota(m.fecha)}</span>
                    </p>
                  </li>
                );
              })}
            </ol>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
