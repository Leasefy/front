'use client';

import { Envelope, UserCircle } from '@phosphor-icons/react';
import { Input } from '@/components/ui';
import { RadioCardGroup, RadioCard } from '@leasefy/cadence';

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
      <p className="text-sm text-fg-muted dark:text-fg-subtle">
        Invita a tu primer colaborador. Recibirán un correo para unirse a tu agencia. Este paso es completamente opcional.
      </p>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-fg dark:text-fg-subtle mb-1.5">
          <span className="flex items-center gap-1.5">
            <Envelope className="w-4 h-4 text-fg-subtle dark:text-fg-muted" />
            Email del miembro
          </span>
        </label>
        <Input
          type="email"
          value={data.email}
          onChange={(e) => onChange({ email: e.target.value })}
          placeholder="colaborador@tuagencia.com"
          className="w-full"
        />
      </div>

      {/* Role */}
      <div>
        <label className="block text-sm font-medium text-fg dark:text-fg-subtle mb-2">
          <span className="flex items-center gap-1.5">
            <UserCircle className="w-4 h-4 text-fg-subtle dark:text-fg-muted" />
            Rol
          </span>
        </label>
        <RadioCardGroup
          orientation="vertical"
          value={data.role}
          onValueChange={(value) => onChange({ role: value as AgencyMemberRoleOption })}
        >
          {ROLE_OPTIONS.map((option) => (
            <RadioCard
              key={option.value}
              value={option.value}
              label={option.label}
              description={option.description}
            />
          ))}
        </RadioCardGroup>
      </div>
    </div>
  );
}
