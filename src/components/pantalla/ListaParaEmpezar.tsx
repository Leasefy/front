'use client';

/**
 * «Para <hacer X> te faltan N pasos» — GLOW UP (Nico, 20-10-2026).
 *
 * Nico: «cada caso de uso tiene que optimizar el flujo desde lo que haría un
 * usuario al inicio para que entienda todo lo que debe de hacer desde el inicio
 * hasta que ya tiene información». Lo que una pantalla necesita ANTES de poder
 * trabajar (la resolución de la DIAN, una cuenta, un convenio, un correo) vivía
 * regado: un banner arriba, otro dentro de una pestaña, una frase roja en una
 * barra, a veces el mismo aviso tres veces con tres colores. Nadie sabía qué
 * hacer primero ni cuándo había terminado.
 *
 * Esta tarjeta los junta en UN lugar, en orden:
 *   · el título dice cuánto falta («Para facturar te faltan 2 pasos») y el
 *     anillo lo muestra;
 *   · cada requisito dice qué es, en qué está y trae SU botón;
 *   · el primero que falta va marcado como «Sigue»: es lo que hay que hacer ya;
 *   · lo hecho queda con su visto, callado; lo opcional no cuenta;
 *   · con todo listo, la tarjeta se pliega en una línea («Todo listo para
 *     facturar») que se puede volver a abrir.
 *
 * Plegar o abrir lo recuerda el navegador de quien mira (`recordarComo`), con
 * try/catch: sin almacenamiento, la tarjeta funciona igual.
 *
 * 🔴 Lo que dice cada requisito tiene que salir de un dato real (lo que el back
 * respondió). Un requisito que no se pudo revisar va como `desconocido`: no
 * cuenta como hecho ni como pendiente, y no se inventa su estado.
 */

import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { CaretDown, Check, CircleDashed, WarningCircle } from '@phosphor-icons/react';
import { Collapse, ProgressRing, Stagger, StaggerItem } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { useTr } from '@/lib/i18n/use-tr';

export type EstadoDelRequisito = 'listo' | 'falta' | 'opcional' | 'cargando' | 'desconocido';

export interface Requisito {
  id: string;
  titulo: ReactNode;
  /** En qué está, en una línea: «Cargada, vence el 3 de marzo» · «5 contratos sin confirmar». */
  detalle?: ReactNode;
  estado: EstadoDelRequisito;
  /** El botón que lo resuelve (un `Button size="sm"`). Sólo se pinta si no está listo. */
  accion?: ReactNode;
  /** Lo que se ve en lugar de la acción cuando ya está listo («Ver», «Cambiar»). */
  accionListo?: ReactNode;
  /** El rótulo de un requisito `opcional` (por defecto «Opcional»): «No frena la factura». */
  etiqueta?: string;
}

export interface ListaParaEmpezarProps {
  /** El verbo de la pantalla, en infinitivo: «facturar», «recaudar con el banco». */
  paraQue: string;
  requisitos: Requisito[];
  /** Una línea bajo el título mientras falte algo. */
  descripcion?: ReactNode;
  /** Llave para recordar si la persona la dejó plegada (por pantalla). */
  recordarComo?: string;
  className?: string;
  'data-testid'?: string;
}

const PREFIJO = 'leasefy-lista-para-empezar:';

function leerPlegada(llave: string | undefined): boolean | null {
  if (!llave) return null;
  try {
    const v = window.localStorage.getItem(PREFIJO + llave);
    return v === null ? null : v === '1';
  } catch {
    return null;
  }
}

function guardarPlegada(llave: string | undefined, plegada: boolean) {
  if (!llave) return;
  try {
    window.localStorage.setItem(PREFIJO + llave, plegada ? '1' : '0');
  } catch {
    /* sin almacenamiento: no se recuerda, nada más */
  }
}

export function ListaParaEmpezar({
  paraQue,
  requisitos,
  descripcion,
  recordarComo,
  className,
  'data-testid': testId,
}: ListaParaEmpezarProps) {
  const tr = useTr();
  const idDelCuerpo = useId();
  const cuentan = requisitos.filter((r) => r.estado === 'listo' || r.estado === 'falta');
  const listos = cuentan.filter((r) => r.estado === 'listo').length;
  const faltan = cuentan.length - listos;
  const revisando = requisitos.some((r) => r.estado === 'cargando');
  /** 🔴 Lo que no se pudo revisar no deja decir «Todo listo»: no lo sabemos. */
  const sinRevisar = requisitos.some((r) => r.estado === 'desconocido');
  const todoListo = faltan === 0 && !revisando && !sinRevisar;
  const siguiente = useMemo(() => requisitos.find((r) => r.estado === 'falta')?.id ?? null, [requisitos]);

  /*
   * Abierta mientras falte algo; plegada con todo listo. Si la persona la plegó
   * o la abrió a mano, se respeta lo que eligió (hasta que cambie el estado de
   * «todo listo»: un requisito nuevo que falta la vuelve a abrir).
   */
  const [abierta, setAbierta] = useState(!todoListo);
  useEffect(() => {
    const recordada = leerPlegada(recordarComo);
    if (todoListo) setAbierta(recordada === false);
    else setAbierta(true);
  }, [todoListo, recordarComo]);

  const titulo = todoListo
    ? tr('Todo listo para {que}', { que: paraQue })
    : revisando && faltan === 0
      ? tr('Revisando lo que necesitas para {que}…', { que: paraQue })
      : faltan === 0
        ? tr('No pudimos revisar todo lo que necesitas para {que}', { que: paraQue })
        : faltan === 1
        ? tr('Para {que} te falta 1 paso', { que: paraQue })
        : tr('Para {que} te faltan {n} pasos', { que: paraQue, n: faltan });

  const porcentaje = cuentan.length === 0 ? 0 : Math.round((listos / cuentan.length) * 100);

  return (
    <section
      className={cn(
        'rounded-lg border bg-surface shadow-sm transition-colors duration-base',
        todoListo ? 'border-border-faint' : 'border-border',
        className,
      )}
      data-testid={testId}
      data-estado={todoListo ? 'listo' : 'pendiente'}
      aria-label={titulo}
    >
      <button
        type="button"
        className="flex w-full items-center gap-4 rounded-lg px-5 py-4 text-left transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-expanded={abierta}
        aria-controls={idDelCuerpo}
        onClick={() => {
          const nueva = !abierta;
          setAbierta(nueva);
          if (todoListo) guardarPlegada(recordarComo, !nueva);
        }}
      >
        {todoListo ? (
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-soft text-success"
            aria-hidden="true"
          >
            <Check className="h-5 w-5" weight="bold" />
          </span>
        ) : (
          <ProgressRing
            value={porcentaje}
            size="sm"
            color="primary"
            label={
              <span className="font-mono text-[12px] font-medium text-fg">
                {listos}/{cuentan.length}
              </span>
            }
            aria-label={tr('{n} de {total} listos', { n: listos, total: cuentan.length })}
            className="shrink-0"
          />
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-body font-semibold text-fg">{titulo}</span>
          {!todoListo && descripcion ? (
            <span className="mt-0.5 block text-body-sm text-fg-muted">{descripcion}</span>
          ) : null}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-body-sm text-fg-muted">
          <span className="hidden sm:inline">{abierta ? tr('Ocultar') : todoListo ? tr('Ver') : tr('Ver lo que falta')}</span>
          <CaretDown
            className={cn('h-4 w-4 transition-transform duration-base ease-emphasis', abierta && 'rotate-180')}
            aria-hidden="true"
          />
        </span>
      </button>

      <Collapse open={abierta} id={idDelCuerpo}>
        <Stagger as="ol" className="divide-y divide-border-faint border-t border-border-faint">
          {requisitos.map((r, i) => (
            <StaggerItem
              as="li"
              key={r.id}
              className={cn(
                'flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center',
                r.id === siguiente && 'bg-primary-soft',
              )}
              data-testid={testId ? `${testId}-${r.id}` : undefined}
              data-estado={r.estado}
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <MarcaDelRequisito estado={r.estado} numero={i + 1} esSiguiente={r.id === siguiente} />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'flex flex-wrap items-center gap-2 text-body-sm font-medium',
                      r.estado === 'listo' ? 'text-fg-muted' : 'text-fg',
                    )}
                  >
                    {r.titulo}
                    {r.id === siguiente ? (
                      <span className="rounded-full bg-primary px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide text-primary-fg">
                        {tr('Sigue')}
                      </span>
                    ) : null}
                    {r.estado === 'opcional' ? (
                      <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-fg-muted">
                        {r.etiqueta ?? tr('Opcional')}
                      </span>
                    ) : null}
                  </p>
                  {r.detalle ? (
                    <p className="mt-0.5 text-caption text-fg-muted">{r.detalle}</p>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 pl-9 sm:pl-0">
                {r.estado === 'listo' ? r.accionListo : r.estado === 'cargando' ? null : r.accion}
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </Collapse>
    </section>
  );
}

function MarcaDelRequisito({
  estado,
  numero,
  esSiguiente,
}: {
  estado: EstadoDelRequisito;
  numero: number;
  esSiguiente: boolean;
}) {
  const tr = useTr();
  const base = 'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full';
  if (estado === 'listo') {
    return (
      <span className={cn(base, 'bg-success-soft text-success')} aria-label={tr('Listo')}>
        <Check className="h-3.5 w-3.5" weight="bold" aria-hidden="true" />
      </span>
    );
  }
  if (estado === 'cargando') {
    return (
      <span className={cn(base, 'text-fg-subtle')} aria-label={tr('Revisando')}>
        <CircleDashed className="h-5 w-5 animate-spin [animation-duration:1.6s]" aria-hidden="true" />
      </span>
    );
  }
  if (estado === 'desconocido') {
    return (
      <span className={cn(base, 'text-fg-subtle')} aria-label={tr('No se pudo revisar')}>
        <WarningCircle className="h-5 w-5" aria-hidden="true" />
      </span>
    );
  }
  if (estado === 'opcional') {
    return (
      <span
        className={cn(base, 'border border-dashed border-border-strong font-mono text-[11px] text-fg-muted')}
        aria-hidden="true"
      >
        {numero}
      </span>
    );
  }
  return (
    <span
      className={cn(
        base,
        'font-mono text-[12px] font-medium',
        esSiguiente
          ? 'bg-primary text-primary-fg ring-4 ring-primary-soft'
          : 'border border-border-strong text-fg-muted',
      )}
      aria-label={tr('Paso {n}, falta', { n: numero })}
    >
      {numero}
    </span>
  );
}
