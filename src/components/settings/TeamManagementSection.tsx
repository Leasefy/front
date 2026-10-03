'use client';

import { useState } from 'react';
import { Users, UserPlus, PencilSimple } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { toast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { confirmar } from '@/components/ui/confirmar';
import { useTeamMembers } from '@/lib/hooks/useSettings';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { errorDelCorreoDelEquipo, errorDelNombreDelEquipo } from '@/lib/perfil/limites-del-equipo';
import type { TeamRole } from '@/lib/types/team';
import { SettingsModal } from './SettingsModal';

export function TeamManagementSection(
  // `delay` ya no se usa (la entrada la pone el marco); se conserva para no
  // romper a quien lo pasa.
  _props: { delay?: number },
) {
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);

  // Real team data from backend.
  // ⚠️ El `isLoading` de arriba es el de ENVIAR el formulario, no el de traer
  // el equipo: dos cosas distintas con el mismo nombre. Por eso la lista decía
  // «No hay miembros en el equipo» mientras cargaba, y también cuando la
  // consulta moría — a alguien que sí tiene equipo.
  const {
    members: teamMembersList,
    isLoading: cargandoEquipo,
    errorCrudo: errorEquipo,
    refresh: recargarEquipo,
    invite,
    update,
    remove,
  } = useTeamMembers();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState<{ id: string; name?: string; email: string; role: TeamRole } | null>(null);
  const [inviteForm, setInviteForm] = useState<{ email: string; role: TeamRole }>({ email: '', role: 'viewer' });
  const [editMemberForm, setEditMemberForm] = useState<{ name: string; role: TeamRole }>({ name: '', role: 'viewer' });
  /** El error bajo el correo de la invitación y bajo el nombre del miembro (cliente o back). */
  const [errorDelCorreo, setErrorDelCorreo] = useState<string | undefined>();
  const [errorDelNombre, setErrorDelNombre] = useState<string | undefined>();

  // Handlers
  const handleInviteMember = async () => {
    // El correo mal escrito (o más largo que la columna) se dice debajo del
    // campo, con la frase del back, y no sale (02-10-2026; antes, un toast).
    const delCliente = errorDelCorreoDelEquipo(inviteForm.email);
    if (delCliente) {
      setErrorDelCorreo(delCliente);
      document.getElementById('equipo-correo')?.focus();
      return;
    }
    setIsLoading(true);
    try {
      await invite(inviteForm.email.trim(), inviteForm.role);
      setShowInviteModal(false);
      setInviteForm({ email: '', role: 'viewer' });
      setErrorDelCorreo(undefined);
      toast.success(t('landlordSettings.toasts.invitationSent', { email: inviteForm.email }));
    } catch (err) {
      // Lo del back sobre el correo (ya invitado, formato) va debajo del
      // campo; el resto, al toast con la regla de oro.
      const reparto = repartirErroresDelServidor(err, {
        mapa: { email: 'email' },
        campos: ['email'],
        porDefecto: 'No pudimos enviar la invitación. Prueba de nuevo en un momento.',
        accion: 'enviar la invitación',
      });
      if (reparto.porCampo.email) {
        setErrorDelCorreo(reparto.porCampo.email);
        document.getElementById('equipo-correo')?.focus();
      }
      if (reparto.sueltos.length > 0) toast.error(reparto.sueltos.join(' · '));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * «Eliminar» sacaba al miembro al primer clic, sin preguntar. Ahora pide
   * confirmación destructiva diciendo qué pasa: el back BORRA la membresía
   * (`DELETE /users/me/team/:id`), así que pierde el acceso al panel ya mismo
   * —y una invitación pendiente deja de servir—; para que vuelva hay que
   * invitarlo de nuevo.
   */
  const handleRemoveMember = async (member: { id: string; name?: string; email: string }) => {
    const ok = await confirmar({
      destructivo: true,
      titulo: t('landlordSettings.modals.removeMember.title', { name: member.name || member.email }),
      descripcion: t('landlordSettings.modals.removeMember.description'),
      accion: t('landlordSettings.modals.removeMember.confirm'),
      cancelar: t('landlordSettings.modals.cancel'),
    });
    if (!ok) return;
    const memberId = member.id;
    try {
      await remove(memberId);
      toast.success(t('landlordSettings.toasts.memberRemoved'));
    } catch (err) {
      // Antes: `err.message` crudo. Por el traductor, con la regla de oro.
      toast.error(
        mensajeParaLaPersona(err, {
          porDefecto: 'No pudimos quitar a este miembro. Prueba de nuevo en un momento.',
          accion: 'quitar a este miembro',
        }),
      );
    }
  };

  const handleEditMember = async () => {
    if (!editingMember) return;
    const delCliente = errorDelNombreDelEquipo(editMemberForm.name);
    if (delCliente) {
      setErrorDelNombre(delCliente);
      document.getElementById('equipo-nombre')?.focus();
      return;
    }
    setIsLoading(true);
    try {
      await update(editingMember.id, {
        name: editMemberForm.name || undefined,
        role: editMemberForm.role,
      });
      setShowEditMemberModal(false);
      setEditingMember(null);
      setEditMemberForm({ name: '', role: 'viewer' });
      setErrorDelNombre(undefined);
      toast.success(t('landlordSettings.toasts.memberUpdated'));
    } catch (err) {
      const reparto = repartirErroresDelServidor(err, {
        mapa: { name: 'name' },
        campos: ['name'],
        porDefecto: 'No pudimos guardar los cambios del miembro. Prueba de nuevo en un momento.',
        accion: 'guardar los cambios',
      });
      if (reparto.porCampo.name) {
        setErrorDelNombre(reparto.porCampo.name);
        document.getElementById('equipo-nombre')?.focus();
      }
      if (reparto.sueltos.length > 0) toast.error(reparto.sueltos.join(' · '));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Sin entrada propia (era un fundido que subía 20 px con retraso): la
          sección entra con el marco de Configuración, que ya anima el cambio
          de sección. */}
      <section
        // La tarjeta de Configuración de la inmobiliaria: el título «Equipo» ya
        // lo pone el marco, acá quedan el conteo y la acción (Nico, 2026-09-15).
        className="rounded-lg border border-border bg-surface overflow-hidden"
      >
        <div className="px-4 py-3 sm:px-5 border-b border-border">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-muted">
                <Users className="h-[18px] w-[18px] text-fg-muted" />
              </div>
              <p className="text-sm text-fg-muted">{teamMembersList.length} {teamMembersList.length !== 1 ? t('landlordSettings.team.members') : t('landlordSettings.team.member')}</p>
            </div>
            <Button
              hideArrow
              onClick={() => setShowInviteModal(true)}
              className="rounded-lg"
            >
              <UserPlus className="w-4 h-4" />
              {t('landlordSettings.team.invite')}
            </Button>
          </div>
        </div>
        <div className="divide-y divide-border">
          {teamMembersList.map((member) => (
            <div key={member.id} className="flex items-center justify-between px-4 py-4 sm:px-5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#EEF1FF] dark:bg-[#1A40FF]/15 flex items-center justify-center">
                  <span className="text-sm font-semibold text-[#1A40FF] dark:text-[#5570FF]">
                    {(member.name || member.email || '?').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-fg">{member.name || t('landlordSettings.team.pendingInvitation')}</p>
                  <p className="text-xs text-fg-subtle">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                  {member.role === 'admin' ? t('landlordSettings.team.roles.admin') : member.role === 'contador' ? t('landlordSettings.team.roles.accountant') : t('landlordSettings.team.roles.viewer')}
                </Badge>
                {member.role !== 'admin' && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setEditingMember(member);
                        setEditMemberForm({ name: member.name || '', role: member.role });
                        setShowEditMemberModal(true);
                      }}
                      className="text-xs text-[#1A40FF] dark:text-[#5570FF] hover:underline"
                    >
                      {t('landlordSettings.team.edit')}
                    </button>
                    <button
                      onClick={() => void handleRemoveMember(member)}
                      className="text-xs text-danger hover:underline"
                    >
                      {t('landlordSettings.team.remove')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {cargandoEquipo && teamMembersList.length === 0 && (
            <div className="flex items-center justify-center px-6 py-8">
              <Spinner size="md" variant="muted" />
            </div>
          )}
          {!cargandoEquipo && Boolean(errorEquipo) && (
            <FalloDeCarga
              error={errorEquipo}
              queEs="tu equipo"
              onReintentar={recargarEquipo}
              enmarcado={false}
              className="py-8"
            />
          )}
          {!cargandoEquipo && !errorEquipo && teamMembersList.length === 0 && (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-fg-subtle">{t('landlordSettings.team.noMembers')}</p>
            </div>
          )}
        </div>
      </section>

      {/* Invite Team Member Modal */}
      <SettingsModal
        open={showInviteModal}
        onClose={() => {
          setShowInviteModal(false);
          setErrorDelCorreo(undefined);
        }}
        title={t('landlordSettings.modals.inviteMember.title')}
        footer={
          <>
            <Button
              variant="outline"
              hideArrow
              disabled={isLoading}
              onClick={() => setShowInviteModal(false)}
            >
              {t('landlordSettings.modals.cancel')}
            </Button>
            <Button
              hideArrow
              onClick={handleInviteMember}
              isLoading={isLoading}
              disabled={isLoading || !inviteForm.email}
            >
              {!isLoading && <UserPlus className="w-4 h-4" />}
              {isLoading ? t('landlordSettings.modals.inviteMember.sending') : t('landlordSettings.modals.inviteMember.sendInvite')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg-muted mb-2">{t('landlordSettings.modals.inviteMember.email')}</label>
            <Input
              id="equipo-correo"
              type="email"
              value={inviteForm.email}
              onChange={(e) => {
                setInviteForm(prev => ({ ...prev, email: e.target.value }));
                setErrorDelCorreo(undefined);
              }}
              aria-invalid={errorDelCorreo ? true : undefined}
              aria-describedby={errorDelCorreo ? 'equipo-correo-error' : undefined}
              className="h-12 rounded-lg"
              placeholder="email@ejemplo.com"
            />
            <ErrorDelCampo id="equipo-correo-error" mensaje={errorDelCorreo} />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg-muted mb-2">{t('landlordSettings.modals.inviteMember.role')}</label>
            <div className="space-y-2">
              {([
                { value: 'admin' as TeamRole, label: t('landlordSettings.team.roles.admin'), desc: t('landlordSettings.modals.inviteMember.adminDesc') },
                { value: 'manager' as TeamRole, label: t('landlordSettings.team.roles.manager'), desc: t('landlordSettings.modals.inviteMember.managerDesc') },
                { value: 'accountant' as TeamRole, label: t('landlordSettings.team.roles.accountant'), desc: t('landlordSettings.modals.inviteMember.accountantDesc') },
                { value: 'viewer' as TeamRole, label: t('landlordSettings.team.roles.viewer'), desc: t('landlordSettings.modals.inviteMember.viewerDesc') },
              ]).map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setInviteForm(prev => ({ ...prev, role: role.value }))}
                  className={cn(
                    'w-full flex items-center gap-3 p-4 rounded-lg border transition-colors text-left',
                    inviteForm.role === role.value
                      ? 'border-[#1A40FF]/30 bg-[#1A40FF]/10 dark:bg-[#1A40FF]/20'
                      : 'border-border hover:border-border-strong bg-surface'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                    inviteForm.role === role.value
                      ? 'border-[#1A40FF]/30'
                      : 'border-border-strong'
                  )}>
                    {inviteForm.role === role.value && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#1A40FF]" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-fg">{role.label}</p>
                    <p className="text-xs text-fg-subtle">{role.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </SettingsModal>

      {/* Edit Team Member Modal */}
      <SettingsModal
        open={showEditMemberModal}
        onClose={() => {
          setShowEditMemberModal(false);
          setErrorDelNombre(undefined);
        }}
        title={t('landlordSettings.modals.editMember.title')}
        footer={
          <>
            <Button
              variant="outline"
              hideArrow
              disabled={isLoading}
              onClick={() => {
                setShowEditMemberModal(false);
                setEditingMember(null);
              }}
            >
              {t('landlordSettings.modals.cancel')}
            </Button>
            <Button
              hideArrow
              onClick={handleEditMember}
              isLoading={isLoading}
              disabled={isLoading}
            >
              {!isLoading && <PencilSimple className="w-4 h-4" />}
              {isLoading ? t('landlordSettings.modals.editMember.saving') : t('landlordSettings.modals.editMember.saveChanges')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg-muted mb-2">{t('landlordSettings.modals.editMember.name')}</label>
            <Input
              id="equipo-nombre"
              type="text"
              value={editMemberForm.name}
              onChange={(e) => {
                setEditMemberForm(prev => ({ ...prev, name: e.target.value }));
                setErrorDelNombre(undefined);
              }}
              aria-invalid={errorDelNombre ? true : undefined}
              aria-describedby={errorDelNombre ? 'equipo-nombre-error' : undefined}
              className="h-12 rounded-lg"
              placeholder={t('landlordSettings.modals.editMember.namePlaceholder')}
            />
            <ErrorDelCampo id="equipo-nombre-error" mensaje={errorDelNombre} />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg-muted mb-2">{t('landlordSettings.modals.editMember.role')}</label>
            <div className="space-y-2">
              {([
                { value: 'admin' as TeamRole, label: t('landlordSettings.team.roles.admin'), desc: t('landlordSettings.modals.inviteMember.adminDesc') },
                { value: 'manager' as TeamRole, label: t('landlordSettings.team.roles.manager'), desc: t('landlordSettings.modals.inviteMember.managerDesc') },
                { value: 'accountant' as TeamRole, label: t('landlordSettings.team.roles.accountant'), desc: t('landlordSettings.modals.inviteMember.accountantDesc') },
                { value: 'viewer' as TeamRole, label: t('landlordSettings.team.roles.viewer'), desc: t('landlordSettings.modals.inviteMember.viewerDesc') },
              ]).map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setEditMemberForm(prev => ({ ...prev, role: role.value }))}
                  className={cn(
                    'w-full flex items-center gap-3 p-4 rounded-lg border transition-colors text-left',
                    editMemberForm.role === role.value
                      ? 'border-[#1A40FF]/30 bg-[#1A40FF]/10 dark:bg-[#1A40FF]/20'
                      : 'border-border hover:border-border-strong bg-surface'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                    editMemberForm.role === role.value
                      ? 'border-[#1A40FF]/30'
                      : 'border-border-strong'
                  )}>
                    {editMemberForm.role === role.value && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#1A40FF]" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-fg">{role.label}</p>
                    <p className="text-xs text-fg-subtle">{role.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </SettingsModal>
    </>
  );
}
