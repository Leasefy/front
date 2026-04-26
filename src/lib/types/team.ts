/**
 * Team member types and roles for account collaboration
 * @module lib/types/team
 */

export type TeamRole = 'admin' | 'contador' | 'viewer';

export interface TeamRoleInfo {
  id: TeamRole;
  name: string;
  description: string;
  permissions: string[];
  /** Si está definido, el botón redirige a esta ruta en lugar de seleccionar el rol */
  redirectTo?: string;
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
    id: 'contador',
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

/** Entrada especial para "Agente" — no es un rol invitable, redirige a la gestión de agentes */
export const AGENTE_TEAM_ENTRY = {
  name: 'Agente',
  description: 'Gestiona propiedades y candidatos en su zona',
  redirectTo: '/panel/inmobiliaria/agentes',
} as const;

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
