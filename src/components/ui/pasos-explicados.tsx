'use client';

/**
 * Los pasos de un «¿Cómo funciona?», explicados — lo que va DENTRO del cajón
 * de `ParaEntenderMas`.
 *
 * ── Por qué existe (Nico, 05-10-2026) ──────────────────────────────────────
 *
 * Mirando Avalúos, con el «¿Cómo funciona?» de cuatro pasos siempre a la
 * vista: «¿por qué no lo metemos en un botón arriba […]? eso no debe de estar
 * ahí siempre […] llévalas al botón que al dar clic abre drawer y explica mejor
 * cada cosa y más bonito».
 *
 * Cada pantalla tenía su propia tira de pasos —cuatro tarjetas en fila, un
 * título y una línea de 12 px— y ninguna decía QUIÉN hace cada paso, que es lo
 * primero que uno pregunta de un agente: ¿esto lo hago yo o lo hace solo? Acá
 * cada paso dice:
 *
 *   · su número y su ícono, en un riel vertical que se lee de arriba abajo;
 *   · quién lo hace (tú, el agente, Leasefy, tu cliente, el candidato);
 *   · qué pasa, en una explicación concreta;
 *   · y, si te toca algo, «Lo que haces tú», resaltado.
 *
 * Los pasos entran escalonados (`Stagger` de Cadence) cuando se abre el cajón;
 * con movimiento reducido, quietos (lo hace la primitiva).
 *
 * 🔴 Lo que se escribe acá tiene que ser verdad en el código: no se promete un
 * paso que nada hace.
 */

import type { ReactNode } from 'react';
import type { Icon } from '@phosphor-icons/react';
import { Buildings, HandPointing, Info, Robot, User } from '@phosphor-icons/react';
import { Stagger, StaggerItem } from '@leasefy/cadence';

// Directo del contexto, no de `@/lib/i18n`: muchas pruebas de pantalla moquean
// `@/lib/i18n` con sólo `useI18n`, y este componente tiene que poder pintarse
// igual (sin provider cae al respaldo en español).
import { useOptionalI18n } from '@/lib/i18n/i18n-context';
import { cn } from '@/lib/utils';

/** Quién hace el paso. `tu` es la persona de la inmobiliaria que está mirando. */
export type QuienLoHace = 'tu' | 'agente' | 'leasefy' | 'cliente' | 'candidato';

export interface PasoExplicado {
  /** Llave estable del paso (si no, el título). */
  id?: string;
  icono: Icon;
  titulo: string;
  /** Qué pasa en este paso, concreto. */
  explicacion: ReactNode;
  /** Quién lo hace. Sin `quien`, el paso no lleva marca (un hecho, no una tarea). */
  quien?: QuienLoHace;
  /** Lo que la persona tiene que hacer en este paso: va resaltado. */
  tuParte?: ReactNode;
}

const NS = 'common.comoFunciona';

/** Respaldo en español para cuando no hay `I18nProvider` (pruebas, rutas públicas). */
const RESPALDO: Record<string, string> = {
  paso: 'Paso {{n}}',
  tuParte: 'Lo que haces tú:',
  'quien.tu': 'Lo haces tú',
  'quien.agente': 'Lo hace el agente',
  'quien.leasefy': 'Lo hace Leasefy',
  'quien.cliente': 'Lo hace tu cliente',
  'quien.candidato': 'Lo hace el candidato',
};

const ICONO_DE_QUIEN: Record<QuienLoHace, Icon> = {
  tu: HandPointing,
  agente: Robot,
  leasefy: Buildings,
  cliente: User,
  candidato: User,
};

function useTextos() {
  const i18n = useOptionalI18n();
  return (clave: string, params?: Record<string, string | number>): string => {
    const completa = `${NS}.${clave}`;
    const traducido = i18n?.t(completa, params);
    if (traducido && traducido !== completa) return traducido;
    const respaldo = RESPALDO[clave] ?? clave;
    return params
      ? respaldo.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(params[k] ?? ''))
      : respaldo;
  };
}

function MarcaDeQuien({ quien }: { quien: QuienLoHace }) {
  const texto = useTextos();
  const IconoDeQuien = ICONO_DE_QUIEN[quien];
  return (
    <span
      // Sin `cn` a propósito: `tailwind-merge` no sabe que `text-caption` es un
      // TAMAÑO y lo borra al ver el color `text-primary` (los toma por la misma
      // clase de color). La marca salía en 16 px (QA 05-10).
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-medium ${
        quien === 'tu' ? 'bg-primary-soft text-primary' : 'bg-surface-muted text-fg-muted'
      }`}
      data-quien={quien}
    >
      <IconoDeQuien className="size-3.5" weight={quien === 'tu' ? 'fill' : 'duotone'} aria-hidden="true" />
      {texto(`quien.${quien}`)}
    </span>
  );
}

export interface PasosExplicadosProps {
  pasos: PasoExplicado[];
  /** Una nota al pie de los pasos (lo que vale para todos, p. ej. quién firma). */
  nota?: ReactNode;
  className?: string;
  'data-testid'?: string;
}

export function PasosExplicados({ pasos, nota, className, 'data-testid': testId }: PasosExplicadosProps) {
  const texto = useTextos();
  return (
    <div className={cn('space-y-6', className)} data-testid={testId}>
      <Stagger as="ol" layout={false} className="space-y-0" data-testid="pasos-explicados">
        {pasos.map((paso, i) => {
          const Icono = paso.icono;
          const ultimo = i === pasos.length - 1;
          return (
            <StaggerItem
              as="li"
              key={paso.id ?? paso.titulo}
              className={cn('relative flex gap-4', !ultimo && 'pb-6')}
              data-paso={i + 1}
            >
              {/* El riel que une un paso con el siguiente: se lee de arriba abajo. */}
              {!ultimo ? (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-5 top-12 w-px -translate-x-1/2 bg-border"
                />
              ) : null}
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <Icono className="size-5" weight="duotone" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-label tabular-nums text-fg-subtle">
                    {texto('paso', { n: i + 1 })}
                  </span>
                  {paso.quien ? <MarcaDeQuien quien={paso.quien} /> : null}
                </div>
                <h3 className="text-body-sm font-semibold leading-snug text-fg">{paso.titulo}</h3>
                <p className="text-body-sm text-fg-muted">{paso.explicacion}</p>
                {paso.tuParte ? (
                  <div
                    className="mt-2 flex items-start gap-2 rounded-lg bg-primary-soft px-3 py-2.5"
                    data-testid="tu-parte"
                  >
                    <HandPointing
                      className="mt-0.5 size-4 shrink-0 text-primary"
                      weight="fill"
                      aria-hidden="true"
                    />
                    <p className="text-body-sm text-fg">
                      <span className="font-semibold text-primary">{texto('tuParte')}</span>{' '}
                      {paso.tuParte}
                    </p>
                  </div>
                ) : null}
              </div>
            </StaggerItem>
          );
        })}
      </Stagger>
      {nota ? (
        <div
          className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-muted px-4 py-3"
          data-testid="pasos-nota"
        >
          <Info className="mt-0.5 size-4 shrink-0 text-fg-muted" weight="duotone" aria-hidden="true" />
          <div className="text-body-sm text-fg-muted">{nota}</div>
        </div>
      ) : null}
    </div>
  );
}

export default PasosExplicados;
