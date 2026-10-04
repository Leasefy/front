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
import { ChartBar, Handshake, Trophy, UsersThree } from '@phosphor-icons/react';
import { SegmentedControl } from '@leasefy/cadence';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { useI18n } from '@/lib/i18n';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { ConfigUsuarios } from '@/components/inmobiliaria';
import { PermisosDeLaPersona } from '@/components/inmobiliaria/PermisosDeLaPersona';
import { AgenteLeaderboard } from '@/components/inmobiliaria/AgenteLeaderboard';
import { MetasEnElRanking } from '@/components/comercial/MetasEnElRanking';
import { CaptacionesYArriendos } from '@/components/inmobiliaria/CaptacionesYArriendos';
import { AgenteWorkloadChart } from '@/components/inmobiliaria/AgenteWorkloadChart';
import { useAgencyUsers, useAgentes, inmobiliariaConfigApi } from '@/lib/hooks/useInmobiliaria';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { agencyApi, permissionsApi } from '@/lib/api/inmobiliaria.service';
import type { AgencyInviteResult, AgencyRole, AgencyUser, UserInvite } from '@/lib/types/inmobiliaria';
import { EsqueletoDeSeccion } from './piezas';
import { RAIZ_CONFIGURACION } from './secciones';

type Vista = 'miembros' | 'ranking' | 'carga' | 'captaciones';

export function SeccionEquipo() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canAccess, isAdmin } = usePermissions();

  /*
   * 🔴 03-10 (pruebas en el navegador): el padrón (`GET /inmobiliaria/agency/members`)
   * es `configuracion:view` en el back —ningún rol fuera del ADMIN lo trae por
   * defecto—, pero la sección se abre con el módulo `agentes`. La asesora
   * entraba a «Miembros», la primera pestaña, y lo primero que veía era «No
   * tienes acceso a Configuración» (Ranking, Carga y Captaciones sí le
   * funcionan). Quien no ve el padrón no tiene esa pestaña, entra a Ranking y
   * no se pide la lista.
   */
  const puedeVerElPadron = isAdmin || canAccess('configuracion', 'view');
  const [vistaElegida, setVista] = useState<Vista>('miembros');
  const vista: Vista = !puedeVerElPadron && vistaElegida === 'miembros' ? 'ranking' : vistaElegida;
  // 🔴 22-09 noche · «Permisos de esta persona». Las rutas del back son sólo
  // del ADMIN (`ensureAdmin`), así que el gate es `isAdmin` y no el de invitar.
  const [personaDePermisos, setPersonaDePermisos] = useState<AgencyUser | null>(null);

  const { users, isLoading, errorCrudo, refetch } = useAgencyUsers(puedeVerElPadron);
  // Sólo para Ranking y Carga: métricas por agente activo. No es un padrón, y
  // no se pide hasta que se mira (`skip`): el 90% de las visitas es al padrón.
  const {
    agentes,
    isLoading: agentesCargando,
    errorCrudo: agentesError,
    refetch: recargarAgentes,
  } = useAgentes({ skip: vista === 'miembros' || vista === 'captaciones' });

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

  /*
   * UN gate para todo lo que toca el padrón: invitar, cambiar rol, activar o
   * desactivar, reenviar la invitación y eliminar. El back marca esas rutas
   * «admin only»; un AGENTE veía los tres puntos igual y cada acción terminaba
   * en un 403 disfrazado de «Error al actualizar rol». Es el mismo permiso que
   * ya decidía el botón de invitar — no uno nuevo.
   */
  const puedeAdministrarEquipo = isAdmin || canAccess('agentes', 'create');

  const VISTAS: Array<{ id: Vista; label: string; icon: React.ElementType }> = useMemo(() => {
    const todas: Array<{ id: Vista; label: string; icon: React.ElementType }> = [
      { id: 'miembros', label: t('inmobiliaria.config.tabs.miembros'), icon: UsersThree },
      { id: 'ranking', label: t('inmobiliaria.agentes.leaderboard'), icon: Trophy },
      { id: 'carga', label: t('inmobiliaria.agentes.tabs.workload'), icon: ChartBar },
      // 17-09: quién captó y quién arrendó. Reemplaza a las comisiones por
      // asesor, que se liquidan por fuera de Leasefy.
      { id: 'captaciones', label: 'Captaciones y arriendos', icon: Handshake },
    ];
    return todas.filter((v) => v.id !== 'miembros' || puedeVerElPadron);
  }, [t, puedeVerElPadron]);

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
      toast.success('Enlace copiado', { description: `Pásaselo a ${email} por donde puedas. Vence en 7 días.` });
    } catch {
      toast.info('Cópialo a mano', { description: enlace, duration: 30000 });
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
              ? `${invite.name || invite.email} quedó invitado, pero el servidor todavía no manda correos. Pásale tú el enlace.`
              : result.emailStatus === 'suppressed'
                ? `${invite.name || invite.email} quedó invitado. Este entorno es de pruebas y no manda correos: pásale tú el enlace.`
                : `${invite.name || invite.email} quedó invitado, pero el correo no salió. Pásale tú el enlace.`;
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
        // 🔴 No se traga: el modal (`AgenteFormModal`) se queda abierto con lo
        // escrito y dice qué pasó, por campo si el 400 trae `campos`. Antes el
        // toast decía «Error al invitar» y el modal se cerraba y se reseteaba.
        throw error;
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
        toast.error(
          mensajeParaLaPersona(error, {
            porDefecto: 'No pudimos cambiar el rol. Prueba de nuevo en un momento.',
            accion: 'cambiar el rol',
          }),
        );
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
        toast.error(
          mensajeParaLaPersona(error, {
            porDefecto: 'No pudimos cambiar el estado de la persona. Prueba de nuevo en un momento.',
            accion: 'cambiar el estado de la persona',
          }),
        );
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
                ? `El servidor todavía no tiene correo configurado. El enlace de ${email} es nuevo y sirve: pásaselo tú.`
                : result.emailStatus === 'suppressed'
                  ? `Este entorno es de pruebas y no manda correos. El enlace de ${email} es nuevo y sirve: pásaselo tú.`
                  : `El enlace de ${email} es nuevo y sirve. Pásaselo tú.`,
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
        toast.error(
          mensajeParaLaPersona(error, {
            porDefecto: 'No pudimos reenviar la invitación. Prueba de nuevo en un momento.',
            accion: 'reenviar la invitación',
          }),
        );
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
        toast.error(
          mensajeParaLaPersona(error, {
            porDefecto: 'No pudimos quitar a la persona del equipo. Prueba de nuevo en un momento.',
            accion: 'quitar a la persona del equipo',
          }),
        );
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
      {/* 🔴 ARREGLOS-4 (03-10-2026): a 390 px las cuatro pestañas no cabían y
          empujaban la pantalla de lado. Se desplazan dentro de su riel, como el
          filtro de «Mis propiedades» y los comprobantes del sistema anterior. */}
      <div
        className="min-w-0 max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        data-testid="equipo-pestanas"
      >
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
                <span className="flex items-center gap-2 whitespace-nowrap">
                  <Icono className="h-4 w-4" weight={vista === v.id ? 'fill' : 'regular'} />
                  <span>{v.label}</span>
                </span>
              ),
            };
          })}
        />
      </div>

      {vista === 'captaciones' ? (
        <CaptacionesYArriendos />
      ) : vista === 'miembros' ? (
        <EstadoDeDatos
          cargando={isLoading}
          error={errorCrudo}
          queEs="el equipo"
          onReintentar={refetch}
          esqueleto={<EsqueletoDeSeccion filas={5} />}
        >
          <ConfigUsuarios
            users={users}
            onInvite={puedeAdministrarEquipo ? invitar : undefined}
            onUpdateRole={puedeAdministrarEquipo ? cambiarRol : undefined}
            onToggleStatus={puedeAdministrarEquipo ? alternarEstado : undefined}
            onResendInvite={puedeAdministrarEquipo ? reenviarInvitacion : undefined}
            onDelete={puedeAdministrarEquipo ? eliminar : undefined}
            onVerFicha={verFicha}
            onPermisos={setPersonaDePermisos}
            permisosApagadoPorque={
              isAdmin ? null : 'Sólo un administrador cambia los permisos de una persona.'
            }
            abrirInvitacion={invitarAlMontar}
          />
          <PermisosDeLaPersona
            persona={personaDePermisos}
            onCerrar={() => setPersonaDePermisos(null)}
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
          onReintentar={recargarAgentes}
          esqueleto={<EsqueletoDeSeccion filas={3} />}
        >
          {vista === 'ranking' ? (
            <div className="space-y-4">
              {/* COMERCIAL (04-10-2026): el avance de las metas del mes. */}
              <MetasEnElRanking />
              <AgenteLeaderboard agentes={agentes} />
            </div>
          ) : (
            <AgenteWorkloadChart agentes={agentes} />
          )}
        </EstadoDeDatos>
      )}
    </div>
  );
}
