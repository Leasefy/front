'use client';

import { Envelope, UserCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export type AgencyMemberRoleOption = 'AGENTE' | 'CONTADOR' | 'ADMIN' | 'VIEWER';

const ROLE_OPTIONS: { value: AgencyMemberRoleOption; label: string; description: string }[] = [
  { value: 'AGENTE', label: 'Agente', description: 'Gestiona propiedades y candidatos asignados' },
  { value: 'CONTADOR', label: 'Contador', description: 'Acceso a cobros, dispersiones y reportes financieros' },
  { value: 'ADMIN', label: 'Administrador', description: 'Acceso completo al panel, puede gestionar el equipo' },
  { value: 'VIEWER', label: 'Solo lectura', description: 'Puede ver información pero no realizar cambios' },
];

export interface InviteFirstMemberFormData {
  email: string;
  role: AgencyMemberRoleOption;
}

interface InviteFirstMemberFormProps {
  data: InviteFirstMemberFormData;
  onChange: (updates: Partial<InviteFirstMemberFormData>) => void;
}

/**
 * InviteFirstMemberForm - Step 3 of AgencySetupWizard
 * Optional step to invite the first team member
 */
export function InviteFirstMemberForm({ data, onChange }: InviteFirstMemberFormProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Invita a tu primer colaborador. Recibirán un correo para unirse a tu agencia. Este paso es completamente opcional.
      </p>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
          <span className="flex items-center gap-1.5">
            <Envelope className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
            Email del miembro
          </span>
        </label>
        <input
          type="email"
          value={data.email}
          onChange={(e) => onChange({ email: e.target.value })}
          placeholder="colaborador@tuagencia.com"
          className="w-full px-4 py-3 text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/60 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
        />
      </div>

      {/* Role */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          <span className="flex items-center gap-1.5">
            <UserCircle className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
            Rol
          </span>
        </label>
        <div className="space-y-2">
          {ROLE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange({ role: option.value })}
              className={cn(
                'w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all',
                data.role === option.value
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                  : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-transparent hover:border-neutral-300 dark:hover:border-neutral-600'
              )}
            >
              <div className={cn(
                'w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 transition-colors',
                data.role === option.value
                  ? 'border-indigo-600 bg-indigo-600'
                  : 'border-neutral-300 dark:border-neutral-600'
              )} />
              <div>
                <p className={cn(
                  'text-sm font-medium',
                  data.role === option.value ? 'text-indigo-900 dark:text-indigo-300' : 'text-neutral-800 dark:text-neutral-200'
                )}>
                  {option.label}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{option.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
