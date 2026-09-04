'use client';

/**
 * El distintivo de quién es quién dentro de una conversación.
 *
 * En la bandeja de la inmobiliaria conviven inquilinos, propietarios, agentes y
 * —desde el hilo directo— la propia inmobiliaria del otro lado. Sin una marca,
 * saber con quién se está hablando exige leer el mensaje, que es justo lo que
 * uno todavía no hizo cuando está eligiendo a cuál entrar.
 *
 * El color sale del ROL, no del tipo de hilo: el mismo propietario se ve igual
 * en un hilo de postulación que en uno directo.
 */

import { Buildings, House, IdentificationBadge, User } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { PerfilEnLaConversacion } from '@/lib/api/messages.types';

const PERFILES: Record<
  PerfilEnLaConversacion,
  { etiqueta: string; clases: string; Icono: React.ElementType }
> = {
  TENANT: {
    etiqueta: 'Inquilino',
    clases: 'bg-info-soft text-info',
    Icono: User,
  },
  LANDLORD: {
    etiqueta: 'Propietario',
    clases: 'bg-success-soft text-success',
    Icono: House,
  },
  AGENT: {
    etiqueta: 'Agente',
    clases: 'bg-warning-soft text-warning',
    Icono: IdentificationBadge,
  },
  AGENCY: {
    etiqueta: 'Inmobiliaria',
    clases: 'bg-primary-soft text-primary',
    Icono: Buildings,
  },
  // No se inventa un rol: si el back mandó algo que no conocemos, se dice.
  DESCONOCIDO: {
    etiqueta: 'Sin rol',
    clases: 'bg-surface-muted text-fg-muted',
    Icono: User,
  },
};

export function InsigniaDePerfil({
  perfil,
  className,
  conIcono = true,
}: {
  perfil: PerfilEnLaConversacion;
  className?: string;
  conIcono?: boolean;
}) {
  const { etiqueta, clases, Icono } = PERFILES[perfil] ?? PERFILES.DESCONOCIDO;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        clases,
        className,
      )}
      data-testid={`insignia-${perfil.toLowerCase()}`}
    >
      {conIcono && <Icono className="h-3 w-3" weight="fill" aria-hidden />}
      {etiqueta}
    </span>
  );
}
