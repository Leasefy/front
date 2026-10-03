'use client';

/**
 * 🔴 La conciliación POR CUENTA (Nico, P3, 02-10-2026): «la conciliación, el
 * saldo y el cierre van por cuenta».
 *
 * Arriba de la tabla: una pastilla por cuenta de la inmobiliaria (con sus
 * pendientes), más «Sin cuenta» (lo cargado antes de que la cuenta fuera
 * obligatoria) y «Pasarela» (los pagos en línea, y los que no calzaron con el
 * canon). Elegir una filtra la tabla y los números. Debajo, la ficha de la
 * cuenta elegida: cuánto está conciliado (por número y por valor), el saldo
 * que dice el banco frente al de los movimientos cargados, la última carga y
 * los días sin extracto.
 *
 * Sin la migración del back (`disponible: false`) no hay filtro: se dice por
 * qué y la tabla sigue como siempre.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, Warning } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type {
  CuentasDeLaConciliacion,
  FiltroDeCuenta,
  IndicadoresDeLaCuenta,
  ResumenDeUnaCuenta,
} from '@/lib/api/conciliacion-bancaria.types';
import { diaLegible, plata } from './formato';
import { nombreDeLaCuenta, porcentajeLegible, useAparecer } from './cuentas-del-extracto';

interface Props {
  datos: CuentasDeLaConciliacion;
  filtro: FiltroDeCuenta | null;
  onFiltro: (filtro: FiltroDeCuenta | null) => void;
}

interface Pastilla {
  filtro: FiltroDeCuenta | null;
  nombre: string;
  pendientes: number | null;
}

export function PorCuenta({ datos, filtro, onFiltro }: Props) {
  const mov = useAparecer();
  if (!datos.disponible) {
    return (
      <p className="text-caption text-fg-muted" data-testid="por-cuenta-no-disponible">
        {datos.motivo}
      </p>
    );
  }

  const pastillas: Pastilla[] = [
    { filtro: null, nombre: 'Todas', pendientes: null },
    ...datos.cuentas.map((c) => ({ filtro: c.id, nombre: nombreDeLaCuenta(c), pendientes: c.indicadores.pendientes })),
    ...(datos.sinCuenta ? [{ filtro: 'sin-cuenta' as const, nombre: 'Sin cuenta', pendientes: datos.sinCuenta.pendientes }] : []),
    ...(datos.pasarela ? [{ filtro: 'pasarela' as const, nombre: 'Pasarela de pagos', pendientes: datos.pasarela.pendientes }] : []),
  ];
  const elegida = datos.cuentas.find((c) => c.id === filtro) ?? null;
  const indicadores: IndicadoresDeLaCuenta | null =
    filtro === 'sin-cuenta' ? datos.sinCuenta : filtro === 'pasarela' ? datos.pasarela : (elegida?.indicadores ?? null);

  return (
    <section className="space-y-3" data-testid="por-cuenta">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cuenta">
        {pastillas.map((p) => {
          const activa = p.filtro === filtro;
          return (
            <button
              key={p.filtro ?? 'todas'}
              type="button"
              role="radio"
              aria-checked={activa}
              onClick={() => onFiltro(p.filtro)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors [transition-duration:var(--motion-duration-fast)] motion-reduce:transition-none',
                activa ? 'border-primary bg-primary-soft text-fg' : 'border-border bg-surface text-fg-muted hover:text-fg',
              )}
              data-testid={`cuenta-${p.filtro ?? 'todas'}`}
            >
              {p.nombre}
              {p.pendientes !== null && p.pendientes > 0 && (
                <span className="rounded-full bg-surface-muted px-1.5 text-caption tabular-nums text-fg">{p.pendientes}</span>
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {indicadores && (
          <motion.div
            key={filtro ?? 'todas'}
            {...mov}
            className="grid gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4"
            data-testid="ficha-de-la-cuenta"
          >
            <Dato etiqueta="Conciliado" valor={porcentajeLegible(indicadores)} />
            <Dato
              etiqueta="Pendiente de conciliar"
              valor={`${indicadores.pendientes} ${indicadores.pendientes === 1 ? 'entrada' : 'entradas'} · ${plata(indicadores.pendienteCop)}`}
              detalle={
                indicadores.salidasPendientes > 0
                  ? `${indicadores.salidasPendientes} ${indicadores.salidasPendientes === 1 ? 'salida' : 'salidas'} sin revisar`
                  : undefined
              }
            />
            {elegida ? (
              <>
                <CuadreDeLaCuenta cuenta={elegida} />
                <UltimaCarga cuenta={elegida} />
              </>
            ) : (
              <p className="text-caption text-fg-muted sm:col-span-2">
                {filtro === 'sin-cuenta'
                  ? 'Movimientos cargados antes de que la cuenta fuera obligatoria. Toman su cuenta cuando vuelves a subir ese extracto eligiendo la cuenta.'
                  : 'Pagos en línea: no están en una cuenta de la inmobiliaria (Leasefy recauda y gira). Aquí quedan también los que no calzaron con el canon, para que los resuelvas.'}
              </p>
            )}
            {elegida && elegida.huecos.length > 0 && (
              <p className="flex items-start gap-1.5 text-caption font-medium text-warning sm:col-span-2 lg:col-span-4" data-testid="huecos-de-la-cuenta">
                <Warning className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                Falta el extracto de{' '}
                {elegida.huecos
                  .slice(0, 3)
                  .map((h) => (h.desde === h.hasta ? `el ${diaLegible(h.desde)}` : `del ${diaLegible(h.desde)} al ${diaLegible(h.hasta)}`))
                  .join(', ')}
                {elegida.huecos.length > 3 ? ` y ${elegida.huecos.length - 3} más` : ''}: lo que pasó esos días no está en la conciliación.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function Dato({ etiqueta, valor, detalle }: { etiqueta: string; valor: string; detalle?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-caption text-fg-muted">{etiqueta}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-fg">{valor}</p>
      {detalle && <p className="text-caption text-fg-muted">{detalle}</p>}
    </div>
  );
}

/** El saldo que dice el banco frente al que dan los movimientos cargados. */
function CuadreDeLaCuenta({ cuenta }: { cuenta: ResumenDeUnaCuenta }) {
  const c = cuenta.cuadre;
  if (c.saldoSegunElBancoCop === null) {
    return (
      <Dato
        etiqueta="Saldo según el banco"
        valor="Sin saldo"
        detalle="Carga el extracto con su saldo final para cuadrar la cuenta."
      />
    );
  }
  return (
    <div className="min-w-0" data-testid="cuadre-de-la-cuenta">
      <p className="text-caption text-fg-muted">Saldo según el banco{c.hasta ? ` (${diaLegible(c.hasta)})` : ''}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-fg">{plata(c.saldoSegunElBancoCop)}</p>
      {c.cuadra === true && (
        <p className="flex items-center gap-1 text-caption font-medium text-success">
          <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" /> Cuadra con los movimientos cargados
        </p>
      )}
      {c.cuadra === false && c.diferenciaCop !== null && (
        <p className="flex items-center gap-1 text-caption font-medium text-warning">
          <Warning className="h-3.5 w-3.5" aria-hidden="true" /> Los movimientos dan {plata(c.saldoSegunLosMovimientosCop ?? 0)}: no cuadra por{' '}
          {plata(Math.abs(c.diferenciaCop))}
        </p>
      )}
      {c.cuadra === null && <p className="text-caption text-fg-muted">Falta un saldo inicial para comparar.</p>}
    </div>
  );
}

function UltimaCarga({ cuenta }: { cuenta: ResumenDeUnaCuenta }) {
  const u = cuenta.ultimaCarga;
  if (!u) return <Dato etiqueta="Última carga" valor="Ninguna" />;
  return (
    <Dato
      etiqueta="Última carga"
      valor={`${diaLegible(u.desde)} → ${diaLegible(u.hasta)}`}
      detalle={`${u.nombreArchivo}${u.cuadra === false ? ' · no cuadró' : u.cuadra === true ? ' · cuadró' : ''}`}
    />
  );
}
