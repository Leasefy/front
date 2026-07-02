'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, UserPlus, PencilSimple } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { useTeamMembers } from '@/lib/hooks/useSettings';
import type { TeamRole } from '@/lib/types/team';
import { SettingsModal } from './SettingsModal';

export function TeamManagementSection({ delay = 0.15 }: { delay?: number }) {
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);

  // Real team data from backend
  const { members: teamMembersList, invite, update, remove } = useTeamMembers();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState<{ id: string; name?: string; email: string; role: TeamRole } | null>(null);
  const [inviteForm, setInviteForm] = useState<{ email: string; role: TeamRole }>({ email: '', role: 'viewer' });
  const [editMemberForm, setEditMemberForm] = useState<{ name: string; role: TeamRole }>({ name: '', role: 'viewer' });

  // Handlers
  const handleInviteMember = async () => {
    if (!inviteForm.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteForm.email)) {
      toast.error(t('landlordSettings.toasts.invalidEmail'));
      return;
    }
    setIsLoading(true);
    try {
      await invite(inviteForm.email, inviteForm.role);
      setShowInviteModal(false);
      setInviteForm({ email: '', role: 'viewer' });
      toast.success(t('landlordSettings.toasts.invitationSent', { email: inviteForm.email }));
    } catch (err) {
      toast.error((err as Error).message || 'Error al enviar invitación');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await remove(memberId);
      toast.success(t('landlordSettings.toasts.memberRemoved'));
    } catch (err) {
      toast.error((err as Error).message || 'Error al eliminar miembro');
    }
  };

  const handleEditMember = async () => {
    if (!editingMember) return;
    setIsLoading(true);
    try {
      await update(editingMember.id, {
        name: editMemberForm.name || undefined,
        role: editMemberForm.role,
      });
      setShowEditMemberModal(false);
      setEditingMember(null);
      setEditMemberForm({ name: '', role: 'viewer' });
      toast.success(t('landlordSettings.toasts.memberUpdated'));
    } catch (err) {
      toast.error((err as Error).message || 'Error al actualizar miembro');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="rounded-xl bg-neutral-50 dark:bg-[#141416] overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-neutral-200/50 dark:border-[#2a2a2c]/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1f1f21] flex items-center justify-center">
                <Users className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
              </div>
              <div>
                <h2 className="font-semibold text-neutral-900 dark:text-white">{t('landlordSettings.team.title')}</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{teamMembersList.length} {teamMembersList.length !== 1 ? t('landlordSettings.team.members') : t('landlordSettings.team.member')}</p>
              </div>
            </div>
            <Button
              hideArrow
              onClick={() => setShowInviteModal(true)}
              className="rounded-xl"
            >
              <UserPlus className="w-4 h-4" />
              {t('landlordSettings.team.invite')}
            </Button>
          </div>
        </div>
        <div className="divide-y divide-neutral-200/50 dark:divide-neutral-700/50">
          {teamMembersList.map((member) => (
            <div key={member.id} className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#EEF1FF] dark:bg-[#1A40FF]/15 flex items-center justify-center">
                  <span className="text-sm font-semibold text-[#1A40FF] dark:text-[#5570FF]">
                    {(member.name || member.email || '?').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">{member.name || t('landlordSettings.team.pendingInvitation')}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{member.email}</p>
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
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-xs text-[#C4503B] dark:text-[#E0664D] hover:underline"
                    >
                      {t('landlordSettings.team.remove')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {teamMembersList.length === 0 && (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('landlordSettings.team.noMembers') || 'No hay miembros en el equipo'}</p>
            </div>
          )}
        </div>
      </motion.section>

      {/* Invite Team Member Modal */}
      <SettingsModal open={showInviteModal} onClose={() => setShowInviteModal(false)} title={t('landlordSettings.modals.inviteMember.title')}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{t('landlordSettings.modals.inviteMember.email')}</label>
            <Input
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
              className="h-12 rounded-xl"
              placeholder="email@ejemplo.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{t('landlordSettings.modals.inviteMember.role')}</label>
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
                    'w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left',
                    inviteForm.role === role.value
                      ? 'border-[#1A40FF]/30 bg-[#1A40FF]/10 dark:bg-[#1A40FF]/20'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-[#1f1f21]'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                    inviteForm.role === role.value
                      ? 'border-[#1A40FF]/30'
                      : 'border-neutral-300 dark:border-neutral-600'
                  )}>
                    {inviteForm.role === role.value && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#1A40FF]" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">{role.label}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{role.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              hideArrow
              onClick={() => setShowInviteModal(false)}
              className="flex-1 rounded-xl"
            >
              {t('landlordSettings.modals.cancel')}
            </Button>
            <Button
              hideArrow
              onClick={handleInviteMember}
              disabled={isLoading || !inviteForm.email}
              className="flex-1 rounded-xl"
            >
              {isLoading ? <Spinner size="xs" variant="current" /> : <UserPlus className="w-4 h-4" />}
              {isLoading ? t('landlordSettings.modals.inviteMember.sending') : t('landlordSettings.modals.inviteMember.sendInvite')}
            </Button>
          </div>
        </div>
      </SettingsModal>

      {/* Edit Team Member Modal */}
      <SettingsModal open={showEditMemberModal} onClose={() => setShowEditMemberModal(false)} title={t('landlordSettings.modals.editMember.title')}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{t('landlordSettings.modals.editMember.name')}</label>
            <Input
              type="text"
              value={editMemberForm.name}
              onChange={(e) => setEditMemberForm(prev => ({ ...prev, name: e.target.value }))}
              className="h-12 rounded-xl"
              placeholder={t('landlordSettings.modals.editMember.namePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{t('landlordSettings.modals.editMember.role')}</label>
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
                    'w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left',
                    editMemberForm.role === role.value
                      ? 'border-[#1A40FF]/30 bg-[#1A40FF]/10 dark:bg-[#1A40FF]/20'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-[#1f1f21]'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                    editMemberForm.role === role.value
                      ? 'border-[#1A40FF]/30'
                      : 'border-neutral-300 dark:border-neutral-600'
                  )}>
                    {editMemberForm.role === role.value && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#1A40FF]" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">{role.label}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{role.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              hideArrow
              onClick={() => {
                setShowEditMemberModal(false);
                setEditingMember(null);
              }}
              className="flex-1 rounded-xl"
            >
              {t('landlordSettings.modals.cancel')}
            </Button>
            <Button
              hideArrow
              onClick={handleEditMember}
              disabled={isLoading}
              className="flex-1 rounded-xl"
            >
              {isLoading ? <Spinner size="xs" variant="current" /> : <PencilSimple className="w-4 h-4" />}
              {isLoading ? t('landlordSettings.modals.editMember.saving') : t('landlordSettings.modals.editMember.saveChanges')}
            </Button>
          </div>
        </div>
      </SettingsModal>
    </>
  );
}
