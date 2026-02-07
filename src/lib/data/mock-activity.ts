/**
 * Mock activity data for dashboard activity feed
 */

export type ActivityType = 'application' | 'status_change' | 'message' | 'document';

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string; // ISO date
  propertyId?: string;
  propertyTitle?: string;
  candidateId?: string;
  candidateName?: string;
  metadata?: Record<string, unknown>;
}

// Calculate relative timestamps
const now = new Date();
const hoursAgo = (hours: number) =>
  new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
const daysAgo = (days: number) =>
  new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

/**
 * Mock activities for the landlord dashboard
 */
export const MOCK_ACTIVITIES: Activity[] = [
  {
    id: 'act-001',
    type: 'application',
    title: 'Nueva aplicación',
    description: 'Nicolás Méndez aplicó para Apartamento en Chapinero',
    timestamp: hoursAgo(2),
    propertyId: 'prop-001',
    propertyTitle: 'Apartamento en Chapinero',
    candidateId: 'cand-003',
    candidateName: 'Nicolás Mendez',
  },
  {
    id: 'act-002',
    type: 'status_change',
    title: 'Candidato pre-aprobado',
    description: 'María García fue pre-aprobada para Casa en Usaquén',
    timestamp: hoursAgo(5),
    propertyId: 'prop-002',
    propertyTitle: 'Casa en Usaquén',
    candidateId: 'cand-001',
    candidateName: 'Maria Garcia',
    metadata: { newStatus: 'pre-approved' },
  },
  {
    id: 'act-003',
    type: 'message',
    title: 'Nuevo mensaje',
    description: 'Juan Rodríguez envió un mensaje sobre documentos',
    timestamp: hoursAgo(8),
    propertyId: 'prop-001',
    propertyTitle: 'Apartamento en Chapinero',
    candidateId: 'cand-004',
    candidateName: 'Juan Rodriguez',
  },
  {
    id: 'act-004',
    type: 'document',
    title: 'Documento recibido',
    description: 'Ana López subió comprobante de ingresos',
    timestamp: daysAgo(1),
    propertyId: 'prop-006',
    propertyTitle: 'Apartamento en El Poblado',
    candidateId: 'cand-006',
    candidateName: 'Ana Lopez',
  },
  {
    id: 'act-005',
    type: 'application',
    title: 'Nueva aplicación',
    description: 'Pedro Sánchez aplicó para Casa en Usaquén',
    timestamp: daysAgo(1),
    propertyId: 'prop-002',
    propertyTitle: 'Casa en Usaquén',
    candidateId: 'cand-008',
    candidateName: 'Pedro Sanchez',
  },
  {
    id: 'act-006',
    type: 'status_change',
    title: 'Candidato aprobado',
    description: 'Sofía Martínez fue aprobada para Casa en Usaquén',
    timestamp: daysAgo(2),
    propertyId: 'prop-002',
    propertyTitle: 'Casa en Usaquén',
    candidateId: 'cand-002',
    candidateName: 'Sofia Martinez',
    metadata: { newStatus: 'approved' },
  },
];

/**
 * Get recent activities (last N)
 */
export function getRecentActivities(limit: number = 5): Activity[] {
  return MOCK_ACTIVITIES.slice(0, limit);
}

/**
 * Get activities for a specific property
 */
export function getPropertyActivities(propertyId: string): Activity[] {
  return MOCK_ACTIVITIES.filter((a) => a.propertyId === propertyId);
}
