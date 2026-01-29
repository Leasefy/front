/**
 * Team member types and roles for account collaboration
 * @module lib/types/team
 */

export type TeamRole = 'admin' | 'manager' | 'accountant' | 'viewer';

export interface TeamRoleInfo {
  id: TeamRole;
  name: string;
  description: string;
  permissions: string[];
}

export const TEAM_ROLES: TeamRoleInfo[] = [
  {
    id: 'admin',
    name: 'Administrador',
    description: 'Acceso completo a todas las funciones',
    permissions: [
      'Gestionar equipo y roles',
      'Facturacion y suscripcion',
      'Todas las propiedades',
      'Candidatos y contratos',
      'Reportes financieros',
    ],
  },
  {
    id: 'manager',
    name: 'Gerente',
    description: 'Gestiona propiedades y candidatos',
    permissions: [
      'Ver y editar propiedades',
      'Gestionar candidatos',
      'Crear y firmar contratos',
      'Comunicacion con inquilinos',
    ],
  },
  {
    id: 'accountant',
    name: 'Contador',
    description: 'Acceso a finanzas y reportes',
    permissions: [
      'Ver reportes financieros',
      'Historial de pagos',
      'Exportar datos contables',
      'Ver arriendos activos',
    ],
  },
  {
    id: 'viewer',
    name: 'Visualizador',
    description: 'Solo lectura en todo',
    permissions: [
      'Ver propiedades',
      'Ver candidatos',
      'Ver contratos',
      'Ver reportes',
    ],
  },
];

export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface TeamMember {
  id: string;
  userId?: string;
  email: string;
  name?: string;
  role: TeamRole;
  status: InviteStatus;
  invitedAt: string;
  acceptedAt?: string;
  invitedBy: string;
}

export interface TeamInvite {
  email: string;
  role: TeamRole;
  message?: string;
}

export function getRoleById(roleId: TeamRole): TeamRoleInfo | undefined {
  return TEAM_ROLES.find((r) => r.id === roleId);
}
