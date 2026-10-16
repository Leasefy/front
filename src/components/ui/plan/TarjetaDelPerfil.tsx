'use client';

/**
 * «Completa tu perfil» del menú, con la forma de la tarjeta de migración de la
 * inmobiliaria (`RecordatorioDeMigracion`): una lámina con su dibujo y UNA
 * pastilla de avance, el título, qué sigue y el botón.
 *
 * Nico, 11-10-2026, sobre la tarjeta vieja (lista de pastillas verdes + «4 ·
 * Dirección · Siguiente paso»): «esos modales que queden así de hermosos como
 * el de migración de la sidebar». La comparten el propietario y el inquilino.
 *
 * Lo que dice sale de los pasos que le pasa su layout (los del perfil guardado,
 * no del navegador); con todo hecho no se pinta.
 */

import Link from 'next/link';
import { ArrowRight, Check, UserCircle } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ProfileCompletionConfig } from './PlanSidebar';

/** El dibujo: a la izquierda la ficha de la persona, a la derecha sus pasos. Es dibujo, no dato. */
function IlustracionDelPerfil({ hechos, total }: { hechos: number; total: number }) {
  const filas = Math.min(Math.max(total, 3), 5);
  return (
    <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[84px]">
      {/* La ficha: foto y renglones. */}
      <div className="absolute left-3 top-3.5 flex h-[66px] w-[66px] flex-col items-center justify-center gap-1.5 rounded-md bg-surface shadow-sm ring-1 ring-border">
        <UserCircle weight="duotone" className="h-6 w-6 text-primary" />
        <span className="h-1 w-9 rounded-full bg-border" />
        <span className="h-1 w-6 rounded-full bg-surface-muted" />
      </div>

      {/* Los datos llegando a los pasos. */}
      <div className="absolute left-[86px] right-[86px] top-[42px] flex items-center">
        <span className="h-px flex-1 border-t-[1.5px] border-dashed border-primary/40" />
        <ArrowRight weight="bold" className="-ml-0.5 h-3 w-3 shrink-0 text-primary/70" />
      </div>

      {/* Los pasos: llenos los hechos. */}
      <div className="absolute right-3 top-3.5 flex h-[66px] w-[66px] flex-col justify-center gap-[5px] rounded-md bg-surface px-2 shadow-sm ring-1 ring-border">
        {Array.from({ length: filas }, (_, i) => (
          <span key={i} className="flex items-center gap-1">
            <span
              className={cn(
                'flex h-2 w-2 shrink-0 items-center justify-center rounded-full',
                i < hechos ? 'bg-primary' : 'ring-1 ring-inset ring-border',
              )}
            >
              {i < hechos && <Check weight="bold" className="h-1.5 w-1.5 text-primary-foreground" />}
            </span>
            <span className={cn('h-1 flex-1 rounded-full', i < hechos ? 'bg-primary/40' : 'bg-surface-muted')} />
          </span>
        ))}
      </div>
    </div>
  );
}

export function TarjetaDelPerfil({
  config,
  onIr,
}: {
  config: ProfileCompletionConfig;
  /** Cierra el menú del celular al ir al perfil. */
  onIr?: () => void;
}) {
  const es = (config.locale ?? 'es') === 'es';
  const pasos = config.steps ?? [];
  const total = config.totalSteps ?? pasos.length;
  const hechos = config.completedCount ?? pasos.filter((p) => p.completed).length;
  if (total > 0 && hechos >= total) return null;
  const siguiente = pasos.find((p) => !p.completed);
  const nombreDelSiguiente = siguiente ? (es ? siguiente.labelEs : siguiente.labelEn) : null;
  const n = Math.min(hechos + 1, Math.max(total, 1));

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-border bg-surface"
      data-testid="sidebar-perfil"
      data-hechos={hechos}
      data-total={total}
    >
      <div className="p-1.5">
        <div className="relative h-[112px] overflow-hidden rounded-lg bg-primary-soft ring-1 ring-primary/10">
          <IlustracionDelPerfil hechos={hechos} total={total} />
          {/* UNA pastilla: un tramo por paso, lleno lo hecho y marcado el que sigue. */}
          <div
            className="absolute bottom-2 left-2 right-2 flex items-center gap-2.5 rounded-full bg-surface py-1 pl-2.5 pr-3 shadow-sm ring-1 ring-border"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={hechos}
            aria-label={es ? 'Avance del perfil' : 'Profile progress'}
            data-testid="sidebar-perfil-avance"
          >
            <span className="flex flex-1 gap-[3px]" aria-hidden="true">
              {Array.from({ length: total }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    'h-1.5 flex-1 rounded-full',
                    (pasos[i]?.completed ?? i < hechos)
                      ? 'bg-primary'
                      : i === n - 1
                        ? 'bg-primary/25 ring-1 ring-inset ring-primary'
                        : 'bg-surface-muted',
                  )}
                />
              ))}
            </span>
            <span className="shrink-0 text-caption font-semibold tabular-nums text-fg">
              {hechos} {es ? 'de' : 'of'} {total}
            </span>
          </div>
        </div>
      </div>

      <div className="px-3.5 pb-3 pt-2">
        <p className="text-body font-semibold leading-snug text-fg">
          {config.label || (es ? 'Completa tu perfil' : 'Complete your profile')}
        </p>
        <p className="mt-1 text-body-sm leading-snug text-fg-muted" data-testid="sidebar-perfil-detalle">
          {nombreDelSiguiente
            ? es
              ? `Sigue: ${nombreDelSiguiente.toLowerCase()}.`
              : `Next up: ${nombreDelSiguiente.toLowerCase()}.`
            : es
              ? 'Empieza por tus datos básicos.'
              : 'Start with your basic details.'}
        </p>
      </div>

      <div className="border-t border-border-faint p-2.5">
        <Button asChild type="button" variant="outline" size="sm" hideArrow className="w-full">
          <Link href={config.href} onClick={onIr} data-testid="sidebar-perfil-ir">
            {es ? 'Completar mi perfil' : 'Complete my profile'}
          </Link>
        </Button>
      </div>
    </div>
  );
}
