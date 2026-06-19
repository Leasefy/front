'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, UserPlus, PencilSimple, SpinnerGap } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';
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
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-[#1A40FF] hover:opacity-90 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              {t('landlordSettings.team.invite')}
            </button>
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
                <span className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium',
                  member.role === 'admin' ? 'bg-[#EEF1FF] dark:bg-[#1A40FF]/15 text-[#1A40FF] dark:text-[#5570FF]' :
                  'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                )}>
                  {member.role === 'admin' ? t('landlordSettings.team.roles.admin') : member.role === 'contador' ? t('landlordSettings.team.roles.accountant') : t('landlordSettings.team.roles.viewer')}
                </span>
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
            <input
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
              className="w-full h-12 px-4 border border-neutral-200 dark:border-neutral-600 rounded-xl text-sm bg-white dark:bg-[#1f1f21] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#1A40FF]/20 focus:border-[#1A40FF]/30 dark:focus:border-[#1A40FF]/30 transition-all"
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
            <button
              onClick={() => setShowInviteModal(false)}
              className="flex-1 py-3 border border-neutral-200 dark:border-neutral-600 text-sm font-medium text-neutral-600 dark:text-neutral-300 rounded-xl hover:bg-neutral-50 dark:hover:bg-[#1f1f21] transition-colors"
            >
              {t('landlordSettings.modals.cancel')}
            </button>
            <button
              onClick={handleInviteMember}
              disabled={isLoading || !inviteForm.email}
              className="flex-1 py-3 bg-[#1A40FF] text-white text-sm font-medium rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? <SpinnerGap className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {isLoading ? t('landlordSettings.modals.inviteMember.sending') : t('landlordSettings.modals.inviteMember.sendInvite')}
            </button>
          </div>
        </div>
      </SettingsModal>

      {/* Edit Team Member Modal */}
      <SettingsModal open={showEditMemberModal} onClose={() => setShowEditMemberModal(false)} title={t('landlordSettings.modals.editMember.title')}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{t('landlordSettings.modals.editMember.name')}</label>
            <input
              type="text"
              value={editMemberForm.name}
              onChange={(e) => setEditMemberForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full h-12 px-4 border border-neutral-200 dark:border-neutral-600 rounded-xl text-sm bg-white dark:bg-[#1f1f21] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#1A40FF]/20 focus:border-[#1A40FF]/30 dark:focus:border-[#1A40FF]/30 transition-all"
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
            <button
              onClick={() => {
                setShowEditMemberModal(false);
                setEditingMember(null);
              }}
              className="flex-1 py-3 border border-neutral-200 dark:border-neutral-600 text-sm font-medium text-neutral-600 dark:text-neutral-300 rounded-xl hover:bg-neutral-50 dark:hover:bg-[#1f1f21] transition-colors"
            >
              {t('landlordSettings.modals.cancel')}
            </button>
            <button
              onClick={handleEditMember}
              disabled={isLoading}
              className="flex-1 py-3 bg-[#1A40FF] text-white text-sm font-medium rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? <SpinnerGap className="w-4 h-4 animate-spin" /> : <PencilSimple className="w-4 h-4" />}
              {isLoading ? t('landlordSettings.modals.editMember.saving') : t('landlordSettings.modals.editMember.saveChanges')}
            </button>
          </div>
        </div>
      </SettingsModal>
    </>
  );
}
