/**
 * Static team data for collaboration features
 * Moved from mock-team.ts - no backend endpoint for team management yet
 */

import type { TeamMember } from '@/lib/types/team';

export const INITIAL_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'member-001',
    userId: 'user-001',
    email: 'landlord@example.com',
    name: 'Nicolás Rodriguez',
    role: 'admin',
    status: 'accepted',
    invitedAt: '2025-06-01T00:00:00Z',
    acceptedAt: '2025-06-01T00:00:00Z',
    invitedBy: 'system',
  },
  {
    id: 'member-002',
    userId: 'user-005',
    email: 'maria.contador@example.com',
    name: 'Maria Lopez',
    role: 'accountant',
    status: 'accepted',
    invitedAt: '2025-12-15T00:00:00Z',
    acceptedAt: '2025-12-16T00:00:00Z',
    invitedBy: 'member-001',
  },
  {
    id: 'member-003',
    email: 'pedro.gerente@example.com',
    role: 'manager',
    status: 'pending',
    invitedAt: '2026-01-20T00:00:00Z',
    invitedBy: 'member-001',
  },
];

export function getTeamMembers(): TeamMember[] {
  return INITIAL_TEAM_MEMBERS;
}

export function getActiveTeamMembers(): TeamMember[] {
  return INITIAL_TEAM_MEMBERS.filter((m) => m.status === 'accepted');
}

export function getPendingInvites(): TeamMember[] {
  return INITIAL_TEAM_MEMBERS.filter((m) => m.status === 'pending');
}
