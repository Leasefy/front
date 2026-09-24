'use client';

/**
 * Darle un inmueble a un asesor, desde la ficha del asesor.
 *
 * ── Por qué existe ─────────────────────────────────────────────────────────
 *
 * `AsignarAgente.tsx` ya había destapado la mitad de esta trampa: desde el
 * INMUEBLE se puede elegir quién lo lleva. Pero desde la ficha del ASESOR el
 * botón «Asignar propiedad» seguía DESHABILITADO con el título «Disponible
 * próximamente», y el de la página levantaba un aviso de lo mismo — sobre la
 * misma ruta que ya andaba: `PUT /inmobiliaria/consignaciones/:id/assign-agent`.
 *
 * ── 🔴 La ruta que NO es ───────────────────────────────────────────────────
 *
 * Existe también `POST /properties/:propertyId/agents`, y es la tentación
 * obvia: el front hasta tiene `propertiesApi.assignAgent`. **No sirve acá**:
 * está marcada `@Roles(Role.LANDLORD)` — es el mecanismo con el que un
 * PROPIETARIO comparte su inmueble, no el de la inmobiliaria. Llamarla desde el
 * panel devuelve 403. En el modelo de la agencia el asesor cuelga de la
 * CONSIGNACIÓN (`Consignacion.agenteUserId`), que es lo que esta ruta escribe.
 *
 * ── Lo que se manda es el `userId` ─────────────────────────────────────────
 *
 * `AssignAgentDto.agenteUserId` es el id de USUARIO, no el de miembro de la
 * agencia. Mandar el otro no falla ni avisa: asigna a nadie.
 */

import { useMemo, useState } from 'react';
import { toast } from '@/components/ui/toast';
import { Buildings, Check, MagnifyingGlass } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button, Input } from '@/components/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAgentes, useConsignaciones } from '@/lib/hooks/useInmobiliaria';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { consignacionesApi } from '@/lib/api/inmobiliaria.service';
import type { Agente, Consignacion } from '@/lib/types/inmobiliaria';

/**
 * Cuántas filas se pintan.
 *
 * La agencia migrada tiene 2.824 inmuebles. Una lista completa dentro de un
 * diálogo no se lee, no se desplaza bien y tarda en pintar, así que se muestran
 * las primeras y el pie dice cuántas quedaron por fuera — con el buscador como
 * la forma de llegar a una en particular. Un tope silencioso sería peor que no
 * tener tope: el asesor buscaría un inmueble que sí está y no aparece.
 */
const CUANTAS_SE_PINTAN = 30;

export interface AsignarInmuebleAlAsesorProps {
  abierto: boolean;
  onCerrar: () => void;
  /** El id de USUARIO del asesor (`Agente.userId`), que es lo que guarda el back. */
  agenteUserId: string | undefined;
  agenteNombre: string;
  onAsignado: () => void;
}

export function AsignarInmuebleAlAsesor({
  abierto,
  onCerrar,
  agenteUserId,
  agenteNombre,
  onAsignado,
}: AsignarInmuebleAlAsesorProps) {
  /* `errorCrudo` y no `error`: «no tienes inmuebles» y «no pudimos preguntar»
     se ven igual en pantalla y sólo uno se puede reintentar. */
  const { consignaciones, isLoading, errorCrudo, refetch } = useConsignaciones();
  /* Los nombres del equipo, para poder decir QUIÉN lleva hoy cada inmueble: sin
     eso, asignar sería quitárselo a alguien sin enterarse. */
  const { agentes } = useAgentes();
  const [busqueda, setBusqueda] = useState('');
  const [guardando, setGuardando] = useState<string | null>(null);

  const nombrePorId = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const a of agentes as Agente[]) {
      // `Consignacion.agenteId` sale de `agenteId ?? agenteUserId`, así que
      // puede traer cualquiera de los dos. Se indexan los dos y se acabó.
      if (a.userId) mapa.set(a.userId, a.name);
      mapa.set(a.id, a.name);
    }
    return mapa;
  }, [agentes]);

  /** Las que NO lleva ya este asesor: ofrecerle lo que ya tiene no es una opción. */
  const candidatas = useMemo(
    () =>
      (consignaciones as Consignacion[]).filter(
        (c) => !agenteUserId || c.agenteId !== agenteUserId,
      ),
    [consignaciones, agenteUserId],
  );

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (q === '') return candidatas;
    return candidatas.filter((c) =>
      [c.propertyTitle, c.propertyAddress, c.propertyCity, c.propertyZone]
        .filter(Boolean)
        .some((campo) => campo.toLowerCase().includes(q)),
    );
  }, [candidatas, busqueda]);

  const visibles = filtradas.slice(0, CUANTAS_SE_PINTAN);
  const ocultas = filtradas.length - visibles.length;

  const asignar = async (consignacion: Consignacion) => {
    if (!agenteUserId) {
      // Sin `userId` no hay nada que mandar. Pasa con miembros viejos cuya
      // membresía no quedó enlazada a un usuario.
      toast.error(`${agenteNombre} no se puede asignar todavía`, {
        description: 'Su usuario no está enlazado. Pídele a soporte que lo revise.',
      });
      return;
    }
    setGuardando(consignacion.id);
    try {
      await consignacionesApi.assignAgent(consignacion.id, agenteUserId);
      toast.success(`${consignacion.propertyTitle} queda a cargo de ${agenteNombre}`);
      onAsignado();
      onCerrar();
    } catch (err) {
      toast.error('No pudimos asignar el inmueble', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setGuardando(null);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="sm:max-w-lg" data-testid="asignar-inmueble-al-asesor">
        <DialogHeader>
          <DialogTitle>Asignar un inmueble</DialogTitle>
          <DialogDescription>
            {agenteNombre} queda a cargo: atiende las visitas y responde a los candidatos.
          </DialogDescription>
        </DialogHeader>

        <EstadoDeDatos
          cargando={isLoading}
          error={errorCrudo}
          vacio={candidatas.length === 0}
          queEs="tu portafolio"
          onReintentar={refetch}
          esqueleto={
            <div className="space-y-2 py-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-surface-muted" />
              ))}
            </div>
          }
          cuandoVacio={
            <div
              className="rounded-lg border border-border bg-surface-muted px-4 py-6 text-center"
              data-testid="asignar-inmueble-vacio"
            >
              <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface text-fg-muted">
                <Buildings className="h-6 w-6" weight="duotone" aria-hidden="true" />
              </span>
              <p className="text-sm font-medium text-fg">
                No hay otro inmueble para darle
              </p>
              <p className="mt-1 text-xs text-fg-muted">
                O ya los lleva todos, o tu portafolio todavía está vacío.
              </p>
            </div>
          }
        >
          <div className="space-y-2">
            <div className="relative">
              <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por título, dirección o barrio"
                className="pl-9"
                aria-label="Buscar un inmueble"
              />
            </div>

            {filtradas.length === 0 ? (
              <p
                className="rounded-lg border border-border bg-surface-muted px-4 py-6 text-center text-sm text-fg-muted"
                data-testid="asignar-inmueble-sin-resultados"
              >
                Ningún inmueble de tu portafolio coincide con «{busqueda.trim()}».
              </p>
            ) : (
              <ul className="max-h-80 space-y-1.5 overflow-y-auto" data-lenis-prevent>
                {visibles.map((c) => {
                  const loLleva = c.agenteId ? nombrePorId.get(c.agenteId) : undefined;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => asignar(c)}
                        disabled={guardando !== null}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-left transition-colors hover:bg-surface-muted',
                          guardando !== null && 'opacity-60',
                        )}
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-muted text-fg-muted">
                          <Buildings className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-fg">
                            {c.propertyTitle}
                          </span>
                          <span className="block truncate text-xs text-fg-muted">
                            {[c.propertyAddress, c.propertyCity].filter(Boolean).join(' · ')}
                          </span>
                          {/* Que se lo estás quitando a alguien tiene que decirse
                              ANTES del clic, no después en el aviso de éxito. */}
                          {loLleva && (
                            <span className="block truncate text-xs text-warning">
                              Hoy lo lleva {loLleva}
                            </span>
                          )}
                        </span>
                        {guardando === c.id ? (
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

            {ocultas > 0 && (
              <p className="text-xs text-fg-muted" data-testid="asignar-inmueble-hay-mas">
                Se muestran {visibles.length} de {filtradas.length}. Busca para llegar a los
                otros {ocultas}.
              </p>
            )}
          </div>
        </EstadoDeDatos>

        <div className="flex justify-end pt-1">
          <Button variant="secondary" hideArrow onClick={onCerrar}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AsignarInmuebleAlAsesor;
