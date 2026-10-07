'use client';

/**
 * 🔴 ELEGIR LA SALIDA DEL EXTRACTO (seguimiento 6, pendiente técnico de las
 * salidas): la pantalla de Egresos ya no pide el id del movimiento a mano. La
 * persona busca y elige la línea de una lista; primero las que calzan con el
 * NETO del egreso (lo único que el back concilia), después las más cercanas en
 * días.
 *
 * Es un grupo de radios: una sola salida elegida, se mueve con las flechas
 * como cualquier radio del navegador. La búsqueda va al back (palabras sin
 * tildes o el valor), con una pausa para no preguntar en cada tecla.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { CrossFade } from '@leasefy/cadence';
import { MagnifyingGlass } from '@phosphor-icons/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { salidasDelEgresoApi, type SalidasParaElEgreso } from '@/lib/api/salidas-del-egreso';
import { diaLegible } from '@/lib/contabilidad/fechas';
import { Monto } from '../Monto';

/** La pausa antes de buscar (ms). */
export const PAUSA_DE_LA_BUSQUEDA_MS = 300;

export function ElegirLaSalidaDelExtracto({
  egresoId,
  elegido,
  onElegir,
  idDeLaBusqueda,
  invalido = false,
  describirError,
}: {
  egresoId: string;
  elegido: string;
  onElegir: (movimientoId: string) => void;
  /** El id del campo de búsqueda: es al que se lleva el foco cuando el back rechaza. */
  idDeLaBusqueda: string;
  invalido?: boolean;
  /** `aria-describedby` del error del campo, si lo hay. */
  describirError?: string;
}) {
  const nombreDelGrupo = useId();
  const [busqueda, setBusqueda] = useState('');
  const [datos, setDatos] = useState<SalidasParaElEgreso | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const turno = useRef(0);

  const leer = useCallback(
    async (q: string) => {
      const mio = ++turno.current;
      setCargando(true);
      setError(null);
      try {
        const r = await salidasDelEgresoApi.listar(egresoId, q);
        if (mio === turno.current) setDatos(r);
      } catch (e) {
        if (mio === turno.current) {
          setError(
            mensajeParaLaPersona(e, {
              porDefecto: 'No se pudieron leer las salidas del extracto.',
              accion: 'buscar las salidas del extracto',
            }),
          );
        }
      } finally {
        if (mio === turno.current) setCargando(false);
      }
    },
    [egresoId],
  );

  useEffect(() => {
    // Sin búsqueda se lee de una (lo primero que ve la persona); escribiendo, con una pausa.
    if (!busqueda) {
      void leer('');
      return;
    }
    const t = setTimeout(() => void leer(busqueda), PAUSA_DE_LA_BUSQUEDA_MS);
    return () => clearTimeout(t);
  }, [busqueda, leer]);

  const salidas = datos?.salidas ?? [];

  return (
    <div className="space-y-2" data-testid="elegir-la-salida">
      <Label htmlFor={idDeLaBusqueda}>La salida del extracto</Label>
      <div className="relative">
        <MagnifyingGlass
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
          aria-hidden="true"
        />
        <Input
          id={idDeLaBusqueda}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Busca por la descripción del banco o por el valor"
          className="pl-9"
          autoComplete="off"
          aria-invalid={invalido || undefined}
          aria-describedby={describirError}
          data-testid="buscar-la-salida"
        />
      </div>
      {datos && (
        <p className="text-caption text-fg-muted">
          El neto del egreso es <Monto valor={datos.egreso.netoCop} className="inline text-caption" />: sólo una salida
          por ese valor se puede conciliar.
        </p>
      )}

      {/* Buscando → la lista / vacío / fallo se cruzan con `CrossFade` (antes
          un `AnimatePresence mode="wait"` armado a mano). */}
      <CrossFade
        swapKey={error ? 'error' : cargando && !datos ? 'cargando' : salidas.length === 0 ? 'vacio' : 'lista'}
      >
        {error ? (
          <div className="space-y-2" data-testid="salidas-del-egreso-error">
            <p className="text-body-sm text-danger">{error}</p>
            <Button size="sm" variant="secondary" hideArrow onClick={() => void leer(busqueda)}>
              Volver a intentar
            </Button>
          </div>
        ) : cargando && !datos ? (
          <p
            className="flex items-center gap-2 text-body-sm text-fg-muted"
            data-testid="salidas-del-egreso-cargando"
          >
            <Spinner size="sm" /> Buscando las salidas del extracto…
          </p>
        ) : salidas.length === 0 ? (
          <p className="text-body-sm text-fg-muted" data-testid="salidas-del-egreso-vacio">
            {busqueda
              ? 'Ninguna salida pendiente del extracto coincide con esa búsqueda.'
              : 'No hay salidas pendientes del extracto cerca de la fecha de este egreso. Carga el extracto de la cuenta o busca por otra palabra o por el valor.'}
          </p>
        ) : (
          <div
            role="radiogroup"
            aria-label="Las salidas del extracto"
            className={cn(
              'max-h-64 space-y-1 overflow-y-auto rounded-md border p-1 transition-opacity duration-fast',
              invalido ? 'border-danger' : 'border-border',
              cargando && 'opacity-60',
            )}
            data-testid="salidas-del-egreso"
          >
            {salidas.map((s) => {
              const marcada = elegido === s.id;
              return (
                <label
                  key={s.id}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-md px-3 py-2 text-body-sm transition-colors duration-fast',
                    marcada ? 'bg-primary-soft' : 'hover:bg-surface-muted',
                  )}
                  data-testid={`salida-del-egreso-${s.id}`}
                  data-marcada={marcada}
                >
                  <input
                    type="radio"
                    name={nombreDelGrupo}
                    value={s.id}
                    checked={marcada}
                    onChange={() => onElegir(s.id)}
                    className="mt-1 accent-[hsl(var(--primary))]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-fg" title={s.descripcion}>
                      {s.descripcion}
                    </span>
                    <span className="block text-caption text-fg-muted">
                      {diaLegible(s.fecha)}
                      {s.cuenta ? ` · ${s.cuenta.nombre}` : ''}
                      {s.referencia ? ` · Ref. ${s.referencia}` : ''}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <Monto valor={s.valorCop} className="text-body-sm" />
                    {s.calza && <Badge variant="success">Calza con el neto</Badge>}
                  </span>
                </label>
              );
            })}
            {datos && datos.total > salidas.length && (
              <p className="px-3 py-1 text-caption text-fg-muted">
                Y {datos.total - salidas.length} más: afina la búsqueda para verlas.
              </p>
            )}
          </div>
        )}
      </CrossFade>
    </div>
  );
}
