'use client';

/**
 * Días de vacancia y mandato que se vence (COMERCIAL, Nico 04-10-2026):
 *
 *   · `SituacionComercialCorta` — la línea de la lista y de la tarjeta.
 *   · `SituacionComercialDelInmueble` — el bloque de la ficha, con el porqué.
 *
 * «Vacante hace 42 días» desde la fecha REAL en que quedó disponible; si no se
 * sabe, lo dice. El mandato avisa cuando faltan 30 días o ya venció.
 */

import { CalendarX, HourglassMedium, WarningCircle } from '@phosphor-icons/react';
import { Appear } from '@leasefy/cadence';

import { cn } from '@/lib/utils';
import {
  detalleDeLaVacancia,
  esVacanciaLarga,
  mandatoPorVencerOVencido,
  textoCortoDelMandato,
  textoDeLaVacancia,
  textoDelMandato,
  type VacanciaYMandato,
} from '@/lib/comercial/comercial';
import { useVacanciaYMandatos } from '@/lib/comercial/use-vacancia-y-mandatos';

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

export function SituacionComercialDelInmueble({ consignacionId }: { consignacionId: string }) {
  const { porConsignacion, cargado } = useVacanciaYMandatos();
  const datos = porConsignacion[consignacionId];
  if (!cargado || !datos) return null;
  const vacancia = textoDeLaVacancia(datos.vacancia);
  const mandato =
    textoDelMandato(datos.mandato) ??
    (datos.mandato.estado === 'SIN_FECHA' ? 'El mandato no tiene fecha de vencimiento' : null);
  const avisoDelMandato = mandatoPorVencerOVencido(datos.mandato);
  if (!vacancia && !mandato) return null;
  return (
    <Appear>
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="situacion-comercial-ficha">
        {vacancia ? (
          <div
            className={cn(
              'rounded-lg border border-border p-4 flex items-start gap-3',
              esVacanciaLarga(datos.vacancia) ? 'bg-warning-soft' : 'bg-surface',
            )}
          >
            <HourglassMedium className={cn('w-5 h-5 shrink-0 mt-0.5', esVacanciaLarga(datos.vacancia) ? 'text-warning' : 'text-fg-muted')} aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-medium" data-testid="ficha-dias-vacante">{vacancia}</p>
              <p className="text-caption text-fg-muted mt-0.5">{detalleDeLaVacancia(datos.vacancia)}</p>
            </div>
          </div>
        ) : null}
        {mandato ? (
          <div
            className={cn(
              'rounded-lg border border-border p-4 flex items-start gap-3',
              datos.mandato.estado === 'VENCIDO' ? 'bg-danger-soft' : avisoDelMandato ? 'bg-warning-soft' : 'bg-surface',
            )}
            data-testid="ficha-mandato"
          >
            {datos.mandato.estado === 'VENCIDO' ? (
              <CalendarX className="w-5 h-5 shrink-0 mt-0.5 text-danger" aria-hidden="true" />
            ) : (
              <WarningCircle className={cn('w-5 h-5 shrink-0 mt-0.5', avisoDelMandato ? 'text-warning' : 'text-fg-muted')} aria-hidden="true" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium">{mandato}</p>
              <p className="text-caption text-fg-muted mt-0.5">
                {avisoDelMandato
                  ? 'Habla con el propietario para renovarlo y cambia la fecha en «Editar». Al asesor y al gerente les llega el aviso en el panel.'
                  : datos.mandato.estado === 'SIN_FECHA'
                    ? 'Ponla en «Editar» para que Leasefy le avise al asesor y al gerente 30 días antes.'
                    : 'El aviso al asesor y al gerente sale cuando falten 30 días.'}
              </p>
            </div>
          </div>
        ) : null}
      </section>
    </Appear>
  );
}
