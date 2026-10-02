'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowClockwise, Copy, DotsThree, Trash } from '@phosphor-icons/react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListSeparator,
  DropdownListTrigger,
} from '@/components/ui/dropdown-menu';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { cn } from '@/lib/utils';
import { getRoleLabel, ROLES_DEL_SISTEMA, type AgencyUser } from '@/lib/types/inmobiliaria';
import { estadoDeLaInvitacion, type EstadoDelCorreo } from './estado-de-la-invitacion';
import { COLOR_DEL_TONO, ICONO_DEL_TONO } from './EnlaceDeInvitacion';
import { REACOMODAR, useMovimiento } from './movimiento';

/**
 * «Con acceso (N)»: quién está en el equipo y quién tiene una invitación sin
 * aceptar (02-10-2026). Una tarjeta por persona —avatar, nombre, correo y su
 * rol en una pastilla—, como la referencia que trajo Nico.
 *
 * Los desactivados no salen: no tienen acceso. Se reactivan en Configuración →
 * Equipo, que sigue siendo la lista completa.
 *
 * Movimiento: lo que ya estaba al abrir no se anima. Una invitación recién
 * hecha entra subiendo (una vez), una cancelada se va, y las demás filas se
 * corren a su lugar en vez de saltar (`movimiento.ts`).
 */

export interface LoDeEstaVisita {
  correo?: EstadoDelCorreo;
  enlace?: string | null;
}

export interface ConAccesoProps {
  miembros: AgencyUser[];
  cargando: boolean;
  error: unknown;
  onReintentar: () => unknown;
  correoPropio?: string;
  puedeInvitar: boolean;
  /** Lo que se sabe de invitaciones hechas o reenviadas en esta visita. */
  deEstaVisita: Record<string, LoDeEstaVisita>;
  /** Invitaciones de esta visita que todavía no se vieron en la lista: entran animadas. */
  recienLlegadas?: ReadonlySet<string>;
  /** La fila ya entró: no vuelve a animarse si se cambia de pestaña. */
  onYaSeVio?: (id: string) => void;
  /** El miembro con una acción en curso (reenviar o cancelar). */
  ocupado: string | null;
  onCopiarEnlace: (miembro: AgencyUser) => void;
  onReenviar: (miembro: AgencyUser) => void;
  onCancelar: (miembro: AgencyUser) => Promise<boolean>;
  onIrAInvitar: () => void;
  onIrAConfiguracion: () => void;
}

/** Los que cuentan en «Con acceso»: activos e invitaciones pendientes. */
export function quienesTienenAcceso(miembros: AgencyUser[]): AgencyUser[] {
  return miembros.filter((m) => m.status === 'active' || m.status === 'invited');
}

const ORDEN_DEL_ROL = new Map(ROLES_DEL_SISTEMA.map((rol, i) => [rol, i]));

function esLaMisma(a: string | undefined, b: string | undefined): boolean {
  return !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
}

function PastillaDeRol({ rol, className }: { rol: AgencyUser['role']; className?: string }) {
  return (
    <span
      className={cn(
        'shrink-0 items-center whitespace-nowrap rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-medium text-fg-muted',
        className,
      )}
    >
      {getRoleLabel(rol)}
    </span>
  );
}

function TarjetaDePersona({
  miembro,
  esTu,
  puedeInvitar,
  deEstaVisita,
  recienLlegada,
  onYaSeVio,
  ocupado,
  onCopiarEnlace,
  onReenviar,
  onCancelar,
}: {
  miembro: AgencyUser;
  esTu: boolean;
  puedeInvitar: boolean;
  deEstaVisita?: LoDeEstaVisita;
  recienLlegada: boolean;
  onYaSeVio?: (id: string) => void;
  ocupado: boolean;
  onCopiarEnlace: (m: AgencyUser) => void;
  onReenviar: (m: AgencyUser) => void;
  onCancelar: (m: AgencyUser) => Promise<boolean>;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const mov = useMovimiento();
  // Sólo importa al montarse: `initial` no se vuelve a mirar después.
  const [entraAnimada] = useState(recienLlegada);
  useEffect(() => {
    if (entraAnimada) onYaSeVio?.(miembro.id);
  }, [entraAnimada, onYaSeVio, miembro.id]);
  const invitada = miembro.status === 'invited';
  const nombre = miembro.name?.trim() || miembro.email;
  const mostrarCorreo = !esLaMisma(nombre, miembro.email);
  const estado = invitada
    ? estadoDeLaInvitacion({ correo: deEstaVisita?.correo, venceEl: miembro.invitationExpiresAt })
    : null;
  const IconoDelEstado = estado ? ICONO_DEL_TONO[estado.tono] : null;

  return (
    <motion.li
      layout={mov.reacomodo}
      transition={{ layout: REACOMODAR }}
      initial={entraAnimada ? mov.llega.initial : false}
      animate={mov.llega.animate}
      exit={mov.llega.exit}
      className="rounded-md border border-border bg-surface px-3.5 py-3 sm:px-4"
      data-testid={`persona-${miembro.id}`}
    >
      <div className="flex items-center gap-3">
        <Avatar name={nombre} size="md" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-fg">
            {nombre}
            {esTu && <span className="font-normal text-fg-muted"> (tú)</span>}
          </p>
          {mostrarCorreo && <p className="truncate text-[13px] text-fg-muted">{miembro.email}</p>}
          {estado && IconoDelEstado && (
            // Sin `cn`: tailwind-merge toma `text-caption` y el color del tono
            // por el mismo grupo y se queda sólo con el color (16 px).
            <p className={`mt-1 flex items-center gap-1.5 text-caption ${COLOR_DEL_TONO[estado.tono]}`}>
              <IconoDelEstado className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0">{estado.texto}</span>
            </p>
          )}
          {/* En el celular la pastilla baja: a la derecha no deja leer el correo. */}
          <PastillaDeRol rol={miembro.role} className="mt-1.5 inline-flex sm:hidden" />
        </div>
        <PastillaDeRol rol={miembro.role} className="hidden sm:inline-flex" />
        {invitada && puedeInvitar && (
          <DropdownList>
            <DropdownListTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 rounded-full text-fg-muted"
                aria-label={`Opciones de la invitación de ${miembro.email}`}
                disabled={ocupado}
              >
                {ocupado ? (
                  <Spinner className="size-4" />
                ) : (
                  <DotsThree className="size-5" weight="bold" aria-hidden="true" />
                )}
              </Button>
            </DropdownListTrigger>
            <DropdownListContent align="end" className="w-60">
              {deEstaVisita?.enlace && (
                <DropdownListItem onSelect={() => onCopiarEnlace(miembro)} className="gap-2">
                  <Copy className="size-4" aria-hidden="true" />
                  Copiar enlace
                </DropdownListItem>
              )}
              <DropdownListItem onSelect={() => onReenviar(miembro)} className="gap-2">
                <ArrowClockwise className="size-4" aria-hidden="true" />
                Reenviar y copiar enlace
              </DropdownListItem>
              <DropdownListSeparator />
              <DropdownListItem onSelect={() => setConfirmando(true)} className="gap-2 text-danger">
                <Trash className="size-4" aria-hidden="true" />
                Cancelar invitación
              </DropdownListItem>
            </DropdownListContent>
          </DropdownList>
        )}
      </div>
      <AnimatePresence initial={false}>
      {confirmando && (
        <motion.div
          key="confirmar"
          initial={mov.cambia.initial}
          animate={mov.cambia.animate}
          exit={{ opacity: 0, transition: mov.cambia.exit.transition }}
          role="group"
          aria-label={`Cancelar la invitación de ${miembro.email}`}
          className="mt-3 flex flex-col gap-2 rounded-sm bg-danger-soft px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-caption text-fg">
            ¿Cancelar la invitación de {miembro.email}? Su enlace deja de servir.
          </p>
          <div className="flex shrink-0 justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmando(false)} disabled={ocupado}>
              No
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              isLoading={ocupado}
              onClick={async () => {
                if (await onCancelar(miembro)) setConfirmando(false);
              }}
            >
              Sí, cancelar
            </Button>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </motion.li>
  );
}

function Esqueleto() {
  return (
    <div className="space-y-2" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-[66px] rounded-md" />
      ))}
    </div>
  );
}

export function ConAcceso({
  miembros,
  cargando,
  error,
  onReintentar,
  correoPropio,
  puedeInvitar,
  deEstaVisita,
  recienLlegadas,
  onYaSeVio,
  ocupado,
  onCopiarEnlace,
  onReenviar,
  onCancelar,
  onIrAInvitar,
  onIrAConfiguracion,
}: ConAccesoProps) {
  const activos = miembros
    .filter((m) => m.status === 'active')
    .sort((a, b) => {
      // Tú primero; después por rol (administradores arriba) y por nombre.
      const tuA = esLaMisma(a.email, correoPropio) ? 0 : 1;
      const tuB = esLaMisma(b.email, correoPropio) ? 0 : 1;
      if (tuA !== tuB) return tuA - tuB;
      const rol = (ORDEN_DEL_ROL.get(a.role) ?? 99) - (ORDEN_DEL_ROL.get(b.role) ?? 99);
      if (rol !== 0) return rol;
      return (a.name || a.email).localeCompare(b.name || b.email, 'es');
    });
  // Las más recientes arriba: es la que se acaba de mandar la que se busca.
  const pendientes = miembros
    .filter((m) => m.status === 'invited')
    .sort((a, b) => (b.invitedAt ?? b.createdAt).localeCompare(a.invitedAt ?? a.createdAt));
  const soloTu = activos.length <= 1 && pendientes.length === 0;
  const mov = useMovimiento();

  const tarjeta = (m: AgencyUser) => (
    <TarjetaDePersona
      key={m.id}
      miembro={m}
      esTu={esLaMisma(m.email, correoPropio)}
      puedeInvitar={puedeInvitar}
      deEstaVisita={deEstaVisita[m.id]}
      recienLlegada={recienLlegadas?.has(m.id) ?? false}
      onYaSeVio={onYaSeVio}
      ocupado={ocupado === m.id}
      onCopiarEnlace={onCopiarEnlace}
      onReenviar={onReenviar}
      onCancelar={onCancelar}
    />
  );

  return (
    <EstadoDeDatos
      cargando={cargando && miembros.length === 0}
      error={miembros.length === 0 ? error : null}
      queEs="tu equipo"
      onReintentar={onReintentar}
      esqueleto={<Esqueleto />}
    >
      <div className="space-y-5">
        <ul className="space-y-2" aria-label="Miembros con acceso">
          {/* Sin `initial={false}`: anularía la entrada de una fila recién
              invitada, que se monta justo al volver a esta pestaña. Las que ya
              estaban no se animan porque su `initial` es `false`. */}
          <AnimatePresence>{activos.map(tarjeta)}</AnimatePresence>
        </ul>

        {soloTu && (
          <div className="rounded-md border border-dashed border-border px-4 py-5 text-center">
            <p className="text-sm font-medium text-fg">Por ahora estás sólo tú.</p>
            <p className="mt-1 text-caption text-fg-muted">
              Invita a tu equipo para repartir el trabajo de la inmobiliaria.
            </p>
            {puedeInvitar && (
              <Button type="button" size="sm" variant="secondary" className="mt-3" onClick={onIrAInvitar}>
                Invitar a alguien
              </Button>
            )}
          </div>
        )}

        {/* La sección entera se va con la última invitación cancelada: si no,
            esa última fila desaparecería sin su salida. */}
        <AnimatePresence initial={false}>
        {pendientes.length > 0 && (
          <motion.section
            key="pendientes"
            initial={mov.llega.initial}
            animate={mov.llega.animate}
            exit={mov.llega.exit}
            aria-labelledby="invitaciones-pendientes"
            className="space-y-2"
          >
            <h3 id="invitaciones-pendientes" className="text-overline text-fg-muted">
              Invitaciones pendientes · <span className="tabular-nums">{pendientes.length}</span>
            </h3>
            <ul className="space-y-2">
              <AnimatePresence>{pendientes.map(tarjeta)}</AnimatePresence>
            </ul>
          </motion.section>
        )}
        </AnimatePresence>

        <p className="text-caption text-fg-muted">
          Cada persona ve sólo lo que su rol le permite. Los permisos de cada una se cambian en{' '}
          <button
            type="button"
            onClick={onIrAConfiguracion}
            className="font-medium text-fg underline decoration-border-strong underline-offset-2 hover:decoration-fg-muted"
          >
            Configuración → Equipo
          </button>
          .
        </p>
      </div>
    </EstadoDeDatos>
  );
}
