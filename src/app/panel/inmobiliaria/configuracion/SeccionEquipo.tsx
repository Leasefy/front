'use client';

/**
 * Equipo: UNA sola lista de las personas de la inmobiliaria.
 *
 * Antes había dos —la pestaña «Usuarios» de Configuración (miembros, roles,
 * invitaciones) y la pantalla «Equipo» (los mismos agentes, con métricas)— con
 * dos formularios de invitación distintos que escribían al MISMO endpoint.
 * Nico: «hay algo de Equipo y Usuarios y eso pueden pelear». Quedó una:
 *
 *   · Miembros = el padrón (`GET /inmobiliaria/agency/members`): todos los
 *     roles, activos, inactivos e invitaciones sin aceptar. Es el único que
 *     invita, cambia rol, activa/desactiva y elimina.
 *   · Ranking y Carga = desempeño (`GET /inmobiliaria/agentes`, que sólo
 *     devuelve agentes ACTIVOS con usuario). No son listas de gestión: son
 *     números por agente, los mismos que ya se veían.
 *
 * La ficha de cada persona sigue en `/configuracion/equipo/<id>`.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from '@/components/ui/toast';
import { ChartBar, Trophy, UsersThree } from '@phosphor-icons/react';
import { SegmentedControl } from '@leasefy/cadence';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { useI18n } from '@/lib/i18n';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { ConfigUsuarios } from '@/components/inmobiliaria';
import { AgenteLeaderboard } from '@/components/inmobiliaria/AgenteLeaderboard';
import { AgenteWorkloadChart } from '@/components/inmobiliaria/AgenteWorkloadChart';
import { useAgencyUsers, useAgentes, inmobiliariaConfigApi } from '@/lib/hooks/useInmobiliaria';
import { agencyApi, permissionsApi } from '@/lib/api/inmobiliaria.service';
import type { AgencyInviteResult, AgencyRole, AgencyUser, UserInvite } from '@/lib/types/inmobiliaria';
import { EsqueletoDeSeccion } from './piezas';
import { RAIZ_CONFIGURACION } from './secciones';

type Vista = 'miembros' | 'ranking' | 'carga';

export function SeccionEquipo() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canAccess, isAdmin } = usePermissions();

  const [vista, setVista] = useState<Vista>('miembros');

  const { users, isLoading, errorCrudo, refetch } = useAgencyUsers();
  // Sólo para Ranking y Carga: métricas por agente activo. No es un padrón, y
  // no se pide hasta que se mira (`skip`): el 90% de las visitas es al padrón.
  const {
    agentes,
    isLoading: agentesCargando,
    errorCrudo: agentesError,
    refetch: recargarAgentes,
  } = useAgentes({ skip: vista === 'miembros' });

  /**
   * `?invitar=1` abre el formulario de una: es la puerta que ofrece el diálogo
   * «Asignar agente» de la ficha del inmueble cuando no hay equipo. Se limpia
   * la URL para que un refresh no lo vuelva a abrir.
   */
  const [invitarAlMontar, setInvitarAlMontar] = useState(false);
  useEffect(() => {
    if (searchParams.get('invitar') === '1') {
      setInvitarAlMontar(true);
      router.replace(`${RAIZ_CONFIGURACION}/equipo`, { scroll: false });
    }
  }, [searchParams, router]);

  const puedeInvitar = isAdmin || canAccess('agentes', 'create');

  const VISTAS: Array<{ id: Vista; label: string; icon: React.ElementType }> = useMemo(
    () => [
      { id: 'miembros', label: t('inmobiliaria.config.tabs.miembros'), icon: UsersThree },
      { id: 'ranking', label: t('inmobiliaria.agentes.leaderboard'), icon: Trophy },
      { id: 'carga', label: t('inmobiliaria.agentes.tabs.workload'), icon: ChartBar },
    ],
    [t],
  );

  /*
   * Cuando el correo no sale, la invitación igual quedó creada — lo que falta
   * es que la persona reciba el enlace. Sin una salida, el admin queda mirando
   * un aviso que no puede resolver: reintentar manda el mismo correo por el
   * mismo camino roto. El enlace es el mismo que manda el correo.
   */
  const copiarEnlace = useCallback(async (token: string, email: string) => {
    const enlace = `${window.location.origin}/invitacion/${token}`;
    try {
      await navigator.clipboard.writeText(enlace);
      toast.success('Enlace copiado', { description: `Pasáselo a ${email} por donde puedas. Vence en 7 días.` });
    } catch {
      toast.info('Copialo a mano', { description: enlace, duration: 30000 });
    }
  }, []);

  const accionDelCorreoCaido = useCallback(
    (result: AgencyInviteResult, email: string) =>
      result.invitationToken
        ? { label: 'Copiar enlace', onClick: () => void copiarEnlace(result.invitationToken!, email) }
        : undefined,
    [copiarEnlace],
  );

  const invitar = useCallback(
    async (invite: UserInvite) => {
      try {
        const result = await inmobiliariaConfigApi.inviteUser(invite);
        // La lista se recarga SIEMPRE que el back haya guardado la invitación
        // —aunque el correo no haya salido—: la fila ya existe.
        await refetch();
        if (result.emailDelivered === false) {
          // Si el servidor no tiene correo configurado, «reenviar» manda por el
          // mismo camino roto: el consejo cambia.
          const descripcion =
            result.emailStatus === 'not_configured'
              ? `${invite.name || invite.email} quedó invitado, pero el servidor todavía no manda correos. Pasale vos el enlace.`
              : `${invite.name || invite.email} quedó invitado, pero el correo no salió. Pasale vos el enlace.`;
          toast.warning(t('inmobiliaria.config.toasts.inviteEmailNotDelivered'), {
            description: descripcion,
            action: accionDelCorreoCaido(result, invite.email),
            duration: 12000,
          });
        } else {
          toast.success(t('inmobiliaria.config.toasts.inviteSent'), {
            description: t('inmobiliaria.config.toasts.inviteSentDesc'),
          });
        }
      } catch (error) {
        toast.error('Error al invitar', { description: error instanceof Error ? error.message : undefined });
      }
    },
    [refetch, t, accionDelCorreoCaido],
  );

  const cambiarRol = useCallback(
    async (userId: string, role: AgencyRole) => {
      try {
        await permissionsApi.updateMemberRole(userId, role.toUpperCase());
        await refetch();
        toast.success(t('inmobiliaria.config.toasts.roleUpdated'));
      } catch (error) {
        toast.error('Error al actualizar rol', {
          description: error instanceof Error ? error.message : undefined,
        });
      }
    },
    [refetch, t],
  );

  const alternarEstado = useCallback(
    async (userId: string) => {
      const user = users.find((u) => u.id === userId);
      if (!user) return;
      try {
        // `getMembers` devuelve estados en minúscula: «activo hoy» ⟹ desactivar.
        await permissionsApi.updateMemberStatus(userId, user.status !== 'active');
        await refetch();
        toast.success(t('inmobiliaria.config.toasts.userStatusUpdated'));
      } catch (error) {
        toast.error('Error al actualizar estado', {
          description: error instanceof Error ? error.message : undefined,
        });
      }
    },
    [users, refetch, t],
  );

  const reenviarInvitacion = useCallback(
    async (userId: string) => {
      const user = users.find((u) => u.id === userId);
      const email = user?.email ?? 'la persona';
      try {
        const result = await agencyApi.resendInvitation(userId);
        if (result.emailDelivered === false) {
          toast.warning('Invitación regenerada, el correo no salió', {
            description:
              result.emailStatus === 'not_configured'
                ? `El servidor todavía no tiene correo configurado. El enlace de ${email} es nuevo y sirve: pasáselo vos.`
                : `El enlace de ${email} es nuevo y sirve. Pasáselo vos.`,
            action: accionDelCorreoCaido(result, user?.email ?? ''),
            duration: 12000,
          });
        } else {
          toast.success(t('inmobiliaria.config.toasts.inviteResent'), {
            description: `Le mandamos un enlace nuevo a ${email}.`,
          });
        }
        await refetch();
      } catch (error) {
        toast.error('No pudimos reenviar la invitación', {
          description: error instanceof Error ? error.message : undefined,
        });
      }
    },
    [users, refetch, t, accionDelCorreoCaido],
  );

  const eliminar = useCallback(
    async (userId: string) => {
      try {
        await inmobiliariaConfigApi.deleteUser(userId);
        await refetch();
        toast.success(t('inmobiliaria.config.toasts.userDeleted'));
      } catch (error) {
        toast.error('Error al eliminar usuario', {
          description: error instanceof Error ? error.message : undefined,
        });
      }
    },
    [refetch, t],
  );

  /**
   * Una invitación pendiente no tiene ficha: `GET /agentes/:id` sólo encuentra
   * miembros ACTIVE, así que abrirla daría un 404. En vez de mandar a una
   * pantalla rota, se dice qué falta.
   */
  const verFicha = useCallback(
    (user: AgencyUser) => {
      if (user.status !== 'active') {
        toast.info('Todavía no aceptó la invitación', {
          description: `${user.email} va a tener ficha cuando cree su cuenta y entre.`,
        });
        return;
      }
      router.push(`${RAIZ_CONFIGURACION}/equipo/${user.id}`);
    },
    [router],
  );

  return (
    <div className="space-y-4">
      <SegmentedControl<Vista>
        value={vista}
        onChange={setVista}
        aria-label={t('inmobiliaria.config.tabs.equipo')}
        options={VISTAS.map((v) => {
          const Icono = v.icon;
          return {
            value: v.id,
            ariaLabel: v.label,
            label: (
              <span className="flex items-center gap-2">
                <Icono className="h-4 w-4" weight={vista === v.id ? 'fill' : 'regular'} />
                <span>{v.label}</span>
              </span>
            ),
          };
        })}
      />

      {vista === 'miembros' ? (
        <EstadoDeDatos
          cargando={isLoading}
          error={errorCrudo}
          queEs="el equipo"
          onReintentar={() => void refetch()}
          esqueleto={<EsqueletoDeSeccion filas={5} />}
        >
          <ConfigUsuarios
            users={users}
            onInvite={puedeInvitar ? invitar : undefined}
            onUpdateRole={cambiarRol}
            onToggleStatus={alternarEstado}
            onResendInvite={reenviarInvitacion}
            onDelete={eliminar}
            onVerFicha={verFicha}
            abrirInvitacion={invitarAlMontar}
          />
        </EstadoDeDatos>
      ) : (
        // Ranking y Carga leen otra fuente: su carga y su fallo son propios, y
        // mostrarlos con la lista del padrón diría «no hay nadie» mientras
        // todavía no llegaron los números.
        <EstadoDeDatos
          cargando={agentesCargando}
          error={agentesError}
          queEs="el desempeño del equipo"
          onReintentar={() => void recargarAgentes()}
          esqueleto={<EsqueletoDeSeccion filas={3} />}
        >
          {vista === 'ranking' ? (
            <AgenteLeaderboard agentes={agentes} />
          ) : (
            <AgenteWorkloadChart agentes={agentes} />
          )}
        </EstadoDeDatos>
      )}
    </div>
  );
}
