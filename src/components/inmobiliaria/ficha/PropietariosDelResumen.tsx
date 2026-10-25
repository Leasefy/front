'use client';

/**
 * Los dueños en el Resumen de la ficha (revisión de diseño, 21-10-2026: «el propietario
 * es la mitad del trabajo y no aparece ni en la portada ni en el Resumen»). Compacto:
 * quién es (o quiénes, con su parte) y a dónde se le gira; el detalle y lo que se
 * configura viven en «Mandato y giro».
 */

import Link from 'next/link';
import { User } from '@phosphor-icons/react';
import { Avatar } from '@leasefy/cadence';

import { TarjetaDeLaFicha } from '@/components/pantalla/TarjetaDeLaFicha';
import { BANK_NAMES } from '@/components/inmobiliaria/ConsignacionDetailSections';
import { formatParticipacion, type Copropietario, type Propietario } from '@/lib/types/inmobiliaria';

interface PropietariosDelResumenProps {
  consignacionId: string;
  propietario: Propietario | null | undefined;
  copropietarios: Copropietario[];
  participacionesDesconocidas?: boolean;
}

export function PropietariosDelResumen({
  consignacionId,
  propietario,
  copropietarios,
  participacionesDesconocidas = false,
}: PropietariosDelResumenProps) {
  const varios = copropietarios.length > 1;
  const filas = varios
    ? copropietarios.map((c) => ({ id: c.propietarioId, nombre: c.propietario?.name ?? 'Sin nombre registrado', parte: participacionesDesconocidas ? 'Sin %' : formatParticipacion(c.participacionBps) }))
    : propietario
      ? [{ id: propietario.id, nombre: propietario.name, parte: null as string | null }]
      : [];
  const cuenta = propietario?.bankAccount;

  return (
    <TarjetaDeLaFicha
      title={varios ? `Propietarios · ${copropietarios.length}` : 'Propietario'}
      icon={<User className="h-4 w-4" />}
      data-testid="propietarios-del-resumen"
      acciones={
        <Link
          href={`/panel/inmobiliaria/inmuebles/${consignacionId}?pestana=mandato#propietarios`}
          className="text-body-sm font-medium text-primary underline-offset-2 hover:underline"
        >
          Ver
        </Link>
      }
    >
      {filas.length === 0 ? (
        <p className="text-body-sm text-fg-muted">No pudimos traer al propietario.</p>
      ) : (
        <ul className="space-y-3">
          {filas.map((f) => (
            <li key={f.id} className="flex min-w-0 items-center gap-3">
              <Avatar name={f.nombre} size="sm" />
              <span className="min-w-0 flex-1 truncate text-[15px] text-fg" title={f.nombre}>
                {f.nombre}
              </span>
              {f.parte ? <span className="shrink-0 font-mono text-body-sm tabular-nums text-fg-muted">{f.parte}</span> : null}
            </li>
          ))}
        </ul>
      )}
      {cuenta ? (
        <p className="mt-4 border-t border-border-faint pt-4 text-body-sm text-fg-muted dark:border-border-strong">
          Se le gira a <span className="font-medium text-fg">{BANK_NAMES[cuenta.bank] || cuenta.bank}</span>
          {cuenta.accountNumber ? <span className="font-mono tabular-nums"> ****{cuenta.accountNumber.slice(-4)}</span> : null}
        </p>
      ) : null}
    </TarjetaDeLaFicha>
  );
}
