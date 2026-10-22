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

import { useState } from 'react';
import Link from 'next/link';
import { toast } from '@/components/ui/toast';
import { Briefcase, Check } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAsesores, rolDelAsesor } from '@/lib/hooks/use-asesores';
import type { AsesorConCarga } from '@/lib/api/crm.service';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { consignacionesApi } from '@/lib/api/inmobiliaria.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';


export interface AsignarAgenteProps {
  abierto: boolean;
  onCerrar: () => void;
  /** Id de la CONSIGNACIÓN (el mandato), no del inmueble. */
  consignacionId: string;
  /** El `User.id` de quien está a cargo hoy: se marca «Actual». */
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
  /* `errorCrudo` y no `error`: el status distingue «no hay agentes» de «no
     pudimos preguntar», y sólo uno de los dos se puede reintentar. Sin esto la
     lista caída se pintaba como «No tienes agentes activos» — un vacío que
     miente y encima invita a irse a invitar gente que ya existe. */
  /* QA 17-10 (IMANA-1, Nico «Administradoras también»): los MISMOS que
     reciben leads (administradoras y asesores activos), no sólo el rol Asesor.
     Ya vienen sólo los activos: uno de baja sería una asignación que nadie
     atiende. */
  const { asesores: disponibles, isLoading, error: errorCrudo, refetch } = useAsesores(abierto);
  const [guardando, setGuardando] = useState<string | null>(null);

  const asignar = async (asesor: AsesorConCarga) => {
    const nombre = asesor.nombre?.trim() || 'La persona';
    setGuardando(asesor.userId);
    try {
      await consignacionesApi.assignAgent(consignacionId, asesor.userId);
      toast.success(`${nombre} queda a cargo del inmueble`);
      onAsignado();
      onCerrar();
    } catch (err) {
      // Por el traductor (sistema de errores, 02-10-2026): el motivo del back
      // si lo dio, un 5xx «de nuestro lado» con la referencia, y «conexión»
      // sólo sin respuesta. Antes iba `err.message` crudo.
      toast.error('No pudimos asignar el asesor', {
        description: mensajeParaLaPersona(err, { accion: 'asignar el asesor' }),
      });
    } finally {
      setGuardando(null);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Asignar asesor</DialogTitle>
          <DialogDescription>
            Queda a cargo de este inmueble: atiende las visitas y responde a los interesados.
          </DialogDescription>
        </DialogHeader>

        <EstadoDeDatos
          cargando={isLoading}
          error={errorCrudo}
          vacio={disponibles.length === 0}
          queEs="tu equipo"
          onReintentar={refetch}
          esqueleto={
            <div className="space-y-2 py-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-surface-muted" />
              ))}
            </div>
          }
          cuandoVacio={
            // Un vacío con salida: de acá se va a invitar (la página de Equipo
            // abre el formulario con `?invitar=1`). Nico, 2026-09-03: «cuando no
            // hay agentes deberíamos dar la posibilidad de ir a crear uno».
            <div
              className="rounded-lg border border-border bg-surface-muted px-4 py-6 text-center"
              data-testid="asignar-agente-vacio"
            >
              <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface text-fg-muted">
                <Briefcase className="h-6 w-6" weight="duotone" aria-hidden="true" />
              </span>
              <p className="text-sm font-medium text-fg">No tienes asesores activos</p>
              <p className="mt-1 text-xs text-fg-muted">
                Invita a alguien a tu equipo y después vuelve a asignarlo aquí.
              </p>
              <Button asChild size="sm" className="mt-4" data-testid="asignar-agente-invitar">
                <Link href="/panel/inmobiliaria/configuracion/equipo?invitar=1">Invitar a alguien</Link>
              </Button>
            </div>
          }
        >
          <ul className="max-h-80 space-y-1.5 overflow-y-auto" data-lenis-prevent>
            {disponibles.map((agente) => {
              const esActual = agente.userId === agenteActualId;
              const nombre = agente.nombre?.trim() || 'Sin nombre registrado';
              return (
                <li key={agente.userId}>
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
                      {nombre.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-fg">
                        {nombre}
                      </span>
                      <span className="block truncate text-caption text-fg-muted">
                        {rolDelAsesor(agente.rol)}
                        {agente.leadsActivos > 0 ? ` · ${agente.leadsActivos} ${agente.leadsActivos === 1 ? 'lead abierto' : 'leads abiertos'}` : ''}
                      </span>
                    </span>
                    {esActual ? (
                      <span className="shrink-0 text-xs font-medium text-primary">Actual</span>
                    ) : guardando === agente.userId ? (
                      <span className="shrink-0 text-xs text-fg-muted">Asignando…</span>
                    ) : (
                      <Check className="h-4 w-4 shrink-0 text-fg-subtle" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </EstadoDeDatos>

        <DialogFooter>
          <Button variant="outline" hideArrow onClick={onCerrar}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
