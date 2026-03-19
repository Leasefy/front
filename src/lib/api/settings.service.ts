/**
 * Settings API service.
 * Handles notification preferences, data export, account deletion, and team management.
 */
import { apiClient } from './client'
import type { TeamMember, TeamRole } from '@/lib/types/team'

// ============================================================================
// Types
// ============================================================================

export interface NotificationSettings {
  emailApplications: boolean
  emailVisits: boolean
  emailContracts: boolean
  emailPayments: boolean
  emailMessages: boolean
  emailMarketing: boolean
  pushAll: boolean
  pushUrgent: boolean
}

export interface DataExportResponse {
  exportedAt: string
  user: Record<string, unknown>
  properties: unknown[]
  applications: unknown[]
  contracts: unknown[]
  leases: unknown[]
  payments: unknown[]
  wishlist: unknown[]
  preferences: unknown
}

export interface BackendTeamMember {
  id: string
  ownerId: string
  name: string | null
  email: string
  role: string
  status: string
  invitedAt: string
  acceptedAt: string | null
  createdAt: string
  updatedAt: string
}

// ============================================================================
// Mappers
// ============================================================================

function mapBackendTeamMember(m: BackendTeamMember): TeamMember {
  return {
    id: m.id,
    email: m.email,
    name: m.name ?? undefined,
    role: m.role as TeamRole,
    status: m.status as TeamMember['status'],
    invitedAt: m.invitedAt,
    acceptedAt: m.acceptedAt ?? undefined,
    invitedBy: m.ownerId,
  }
}

// ============================================================================
// API Methods
// ============================================================================

export const settingsApi = {
  // --- Notification Settings ---

  async getNotificationSettings(): Promise<NotificationSettings> {
    return apiClient.get<NotificationSettings>('/users/me/notification-settings')
  },

  async updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
    return apiClient.patch<NotificationSettings>('/users/me/notification-settings', settings)
  },

  // --- Data Export ---

  async requestDataExport(): Promise<DataExportResponse> {
    return apiClient.post<DataExportResponse>('/users/me/data-export')
  },

  // --- Account Deletion ---

  async deleteAccount(): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>('/users/me/account')
  },

  // --- Team Management ---

  async getTeamMembers(): Promise<TeamMember[]> {
    const raw = await apiClient.get<BackendTeamMember[]>('/users/me/team')
    return raw.map(mapBackendTeamMember)
  },

  async inviteTeamMember(data: { email: string; role?: string; name?: string }): Promise<TeamMember> {
    const raw = await apiClient.post<BackendTeamMember>('/users/me/team', data)
    return mapBackendTeamMember(raw)
  },

  async updateTeamMember(memberId: string, data: { name?: string; role?: string }): Promise<TeamMember> {
    const raw = await apiClient.patch<BackendTeamMember>(`/users/me/team/${memberId}`, data)
    return mapBackendTeamMember(raw)
  },

  async removeTeamMember(memberId: string): Promise<void> {
    await apiClient.delete(`/users/me/team/${memberId}`)
  },
}
