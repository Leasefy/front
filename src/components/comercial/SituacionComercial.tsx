'use client';

/**
 * Días de vacancia y mandato que se vence (COMERCIAL, Nico 04-10-2026):
 *
 *   · `SituacionComercialCorta` — la línea de la lista y de la tarjeta.
 *   · `AvisoDelMandatoQueVence` — el renglón de la ficha cuando el mandato se vence.
 *
 * «Vacante hace 42 días» desde la fecha REAL en que quedó disponible; si no se
 * sabe, lo dice. El mandato avisa cuando faltan 30 días o ya venció.
 */

import { CalendarX, HourglassMedium } from '@phosphor-icons/react';
import { Appear } from '@leasefy/cadence';

import { cn } from '@/lib/utils';
import {
  esVacanciaLarga,
  mandatoPorVencerOVencido,
  textoCortoDelMandato,
  textoDeLaVacancia,
  textoDelMandato,
  type VacanciaYMandato,
} from '@/lib/comercial/comercial';
import { Button } from '@/components/ui/button';

export function SituacionComercialCorta({ datos, className }: { datos?: VacanciaYMandato; className?: string }) {
  if (!datos) return null;
  const vacancia = textoDeLaVacancia(datos.vacancia);
  const aviso = mandatoPorVencerOVencido(datos.mandato);
  const mandato = aviso ? textoCortoDelMandato(datos.mandato) : null;
  if (!vacancia && !mandato) return null;
  return (
    <div className={cn('mt-1 space-y-0.5', className)} data-testid="situacion-comercial">
      {vacancia ? (
        <p
          className={cn('text-caption', esVacanciaLarga(datos.vacancia) ? 'text-warning font-medium' : 'text-fg-muted')}
          data-testid="dias-vacante"
        >
          {vacancia}
        </p>
      ) : null}
      {mandato ? (
        <p
          className={cn('text-caption', datos.mandato.estado === 'VENCIDO' ? 'text-danger font-medium' : 'text-warning')}
          data-testid="mandato-se-vence"
          title={textoDelMandato(datos.mandato) ?? undefined}
        >
          {mandato}
        </p>
      ) : null}
    </div>
  );
}

/**
 * El mandato que se vence, en UNA línea arriba de las pestañas de la ficha
 * (revisión de diseño, 21-10-2026). Sólo cuando faltan 30 días o ya venció:
 * es lo que hay que hacer ya, con su botón. La vacancia vive en la franja de
 * la portada y el mandato sin fecha, en «Mandato y giro» (antes eran dos
 * tarjetas sobre las pestañas que decían «ponla en Editar» sin traer el botón).
 */
export function AvisoDelMandatoQueVence({
  datos,
  onPonerFecha,
}: {
  datos?: VacanciaYMandato;
  onPonerFecha?: () => void;
}) {
  if (!datos || !mandatoPorVencerOVencido(datos.mandato)) return null;
  const vencido = datos.mandato.estado === 'VENCIDO';
  const texto = textoDelMandato(datos.mandato);
  if (!texto) return null;
  return (
    <Appear>
      <div
        role="status"
        className={cn(
          'flex flex-col gap-3 rounded-[16px] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-2.5',
          vencido ? 'bg-danger-soft' : 'bg-warning-soft',
        )}
        data-testid="ficha-mandato"
      >
        <p className="flex min-w-0 items-start gap-2.5 text-body-sm">
          {vencido ? (
            <CalendarX className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
          ) : (
            <HourglassMedium className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          )}
          <span>
            <span className={cn('font-medium', vencido ? 'text-danger' : 'text-warning')}>{texto}</span>
            <span className="text-fg-muted"> · Habla con el propietario para renovarlo.</span>
          </span>
        </p>
        {onPonerFecha ? (
          <Button variant="secondary" size="sm" hideArrow className="shrink-0 self-start sm:self-auto" onClick={onPonerFecha}>
            Poner la nueva fecha
          </Button>
        ) : null}
      </div>
    </Appear>
  );
}
