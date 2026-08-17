'use client';

/**
 * Elegir quién lleva el inmueble.
 *
 * Antes no existía: la tarjeta «Agente asignado» sin agente mostraba «No hay
 * agente asignado» y nada más —un vacío sin salida—, y el botón «Reasignar»
 * de la tarjeta con agente sólo levantaba un toast de «próximamente». O sea
 * que **no había forma de asignar un agente a un inmueble**, ni la primera vez
 * ni después.
 *
 * El back sí lo tenía: `PUT /inmobiliaria/consignaciones/:id/assign-agent`.
 */

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Briefcase, Check } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAgentes } from '@/lib/hooks/useInmobiliaria';
import { consignacionesApi } from '@/lib/api/inmobiliaria.service';
import type { Agente } from '@/lib/types/inmobiliaria';

/** Los tres roles reales de `AgenteRole`. Escribí otros y salía la llave cruda. */
const ROLE_LABELS: Record<string, string> = {
  agent: 'Agente',
  coordinator: 'Coordinador',
  director: 'Director',
};

export interface AsignarAgenteProps {
  abierto: boolean;
  onCerrar: () => void;
  /** Id de la CONSIGNACIÓN (el mandato), no del inmueble. */
  consignacionId: string;
  /** Para marcar el actual y no ofrecerlo como novedad. */
  agenteActualId?: string;
  onAsignado: () => void;
}

export function AsignarAgente({
  abierto,
  onCerrar,
  consignacionId,
  agenteActualId,
  onAsignado,
}: AsignarAgenteProps) {
  const { agentes, isLoading } = useAgentes();
  const [guardando, setGuardando] = useState<string | null>(null);

  /* Sólo los que pueden recibir trabajo hoy. Un agente de baja o inactivo en la
     lista es una asignación que alguien va a hacer y nadie va a atender. */
  const disponibles = useMemo(
    () => (agentes as Agente[]).filter((a) => a.status === 'active'),
    [agentes],
  );

  const asignar = async (agente: Agente) => {
    if (!agente.userId) {
      // Sin `userId` no hay nada que mandar: el `id` del front es el del
      // miembro de la agencia y el back guarda el del usuario.
      toast.error('Ese agente no se puede asignar todavía', {
        description: 'Su usuario no está enlazado. Pedile a soporte que lo revise.',
      });
      return;
    }
    setGuardando(agente.id);
    try {
      await consignacionesApi.assignAgent(consignacionId, agente.userId);
      toast.success(`${agente.name} queda a cargo del inmueble`);
      onAsignado();
      onCerrar();
    } catch (err) {
      toast.error('No pudimos asignar el agente', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setGuardando(null);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Asignar agente</DialogTitle>
          <DialogDescription>
            Queda a cargo de este inmueble: atiende las visitas y responde a los candidatos.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2 py-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-surface-muted" />
            ))}
          </div>
        ) : disponibles.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface-muted px-4 py-6 text-center">
            <Briefcase className="mx-auto mb-2 h-6 w-6 text-fg-subtle" />
            <p className="text-sm text-fg">No tenés agentes activos</p>
            <p className="mt-1 text-xs text-fg-muted">
              Invitá a alguien a tu equipo y después volvé a asignarlo acá.
            </p>
          </div>
        ) : (
          <ul className="max-h-80 space-y-1.5 overflow-y-auto" data-lenis-prevent>
            {disponibles.map((agente) => {
              const esActual = agente.id === agenteActualId;
              return (
                <li key={agente.id}>
                  <button
                    type="button"
                    onClick={() => asignar(agente)}
                    disabled={esActual || guardando !== null}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                      esActual
                        ? 'border-primary bg-primary-soft'
                        : 'border-border hover:bg-surface-muted',
                      guardando !== null && !esActual && 'opacity-60',
                    )}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                      {agente.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-fg">
                        {agente.name}
                      </span>
                      <span className="block truncate text-xs text-fg-muted">
                        {ROLE_LABELS[agente.role] ?? agente.role}
                        {agente.zone && ` · ${agente.zone}`}
                      </span>
                    </span>
                    {esActual ? (
                      <span className="shrink-0 text-xs font-medium text-primary">Actual</span>
                    ) : guardando === agente.id ? (
                      <span className="shrink-0 text-xs text-fg-muted">Asignando…</span>
                    ) : (
                      <Check className="h-4 w-4 shrink-0 text-fg-subtle" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex justify-end pt-1">
          <Button variant="secondary" hideArrow onClick={onCerrar}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
