'use client';

/**
 * OrigenDelInmueble — la pregunta que abre «Nueva consignación».
 *
 * ── Por qué existe (Nico, 2026-09-02) ─────────────────────────────────────
 * «Preguntarle si quiere asociar a un inmueble nuevo o uno existente; si es
 * a uno nuevo dejas el flujo que ya hay hoy y si es existente le muestras en
 * un drawer los que tenemos con un buscador.»
 *
 * Vive en el paso previo del asistente (no en un diálogo suelto) para que la
 * pregunta llegue por CUALQUIER puerta: el botón del sidebar, el del
 * portafolio y el de la ficha del propietario entran todos por
 * `/inmuebles/nuevo`.
 *
 * La opción «uno que ya tengo» dice cuántos hay y se deshabilita sola cuando
 * no hay ninguno: un camino que sólo lleva a una lista vacía es una promesa
 * que no se cumple.
 */

import { HouseLine, Buildings, CaretRight } from '@phosphor-icons/react';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const NS = 'inmobiliaria.consignaciones.origen';

export interface OrigenDelInmuebleProps {
  /** Cuántos inmuebles del portafolio están sin mandato. */
  disponibles: number;
  cargando?: boolean;
  onNuevo: () => void;
  onExistente: () => void;
}

export function OrigenDelInmueble({
  disponibles,
  cargando = false,
  onNuevo,
  onExistente,
}: OrigenDelInmuebleProps) {
  const { t } = useI18n();
  const hayExistentes = disponibles > 0;

  return (
    <div className="mx-auto max-w-3xl" data-testid="origen-del-inmueble">
      <div className="rounded-lg border border-border bg-surface p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-fg">{t(`${NS}.titulo`)}</h2>
        <p className="mt-1 text-sm text-fg-muted">{t(`${NS}.subtitulo`)}</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Opcion
            icono={Buildings}
            titulo={t(`${NS}.nuevo.titulo`)}
            detalle={t(`${NS}.nuevo.detalle`)}
            pie={t(`${NS}.nuevo.pie`)}
            onClick={onNuevo}
            testId="origen-nuevo"
          />
          <Opcion
            icono={HouseLine}
            titulo={t(`${NS}.existente.titulo`)}
            detalle={t(`${NS}.existente.detalle`)}
            pie={
              cargando
                ? t(`${NS}.existente.contando`)
                : hayExistentes
                  ? t(`${NS}.existente.pie`, { count: disponibles })
                  : t(`${NS}.existente.ninguno`)
            }
            cargando={cargando}
            // Sin inmuebles sin mandato el camino no lleva a ninguna parte.
            deshabilitada={!cargando && !hayExistentes}
            onClick={onExistente}
            testId="origen-existente"
          />
        </div>
      </div>
    </div>
  );
}

function Opcion({
  icono: Icono,
  titulo,
  detalle,
  pie,
  onClick,
  deshabilitada = false,
  cargando = false,
  testId,
}: {
  icono: React.ElementType;
  titulo: string;
  detalle: string;
  pie: string;
  onClick: () => void;
  deshabilitada?: boolean;
  cargando?: boolean;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitada}
      data-testid={testId}
      className={cn(
        'group flex h-full flex-col items-start gap-3 rounded-lg border p-5 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        deshabilitada
          ? 'cursor-not-allowed border-border-faint bg-surface-muted/40 opacity-60'
          : 'border-border bg-surface hover:border-primary hover:bg-primary-soft/40',
      )}
    >
      <span
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
          deshabilitada ? 'bg-surface-muted text-fg-subtle' : 'bg-primary-soft text-primary',
        )}
        aria-hidden
      >
        <Icono className="h-5 w-5" weight="duotone" />
      </span>
      <span className="flex-1 space-y-1">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-fg">
          {titulo}
          {!deshabilitada && (
            <CaretRight className="h-3.5 w-3.5 text-fg-subtle transition-transform group-hover:translate-x-0.5" />
          )}
        </span>
        <span className="block text-sm leading-snug text-fg-muted">{detalle}</span>
      </span>
      <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-fg-subtle">
        {cargando && <Spinner size="sm" />}
        {pie}
      </span>
    </button>
  );
}
