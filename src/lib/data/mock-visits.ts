/**
 * Mock visit data for property viewings
 */

import type { Visit, VisitStatus } from '@/lib/types/visit';

export const MOCK_VISITS: Visit[] = [
  {
    id: 'visit-001',
    candidateId: 'cand-003',
    candidateName: 'Laura Martínez',
    propertyId: 'prop-001',
    propertyTitle: 'Apartamento Chapinero Alto',
    requestedDate: '2026-02-03',
    requestedTime: '10:00',
    status: 'requested',
    candidateMessage: 'Me gustaría visitar el apartamento lo antes posible. Tengo disponibilidad por las mañanas.',
    createdAt: '2026-01-30T14:00:00Z',
  },
  {
    id: 'visit-002',
    candidateId: 'cand-005',
    candidateName: 'Andrés Rodríguez',
    propertyId: 'prop-001',
    propertyTitle: 'Apartamento Chapinero Alto',
    requestedDate: '2026-02-04',
    requestedTime: '15:00',
    status: 'requested',
    candidateMessage: 'Prefiero visitar en la tarde después de las 2pm.',
    createdAt: '2026-01-31T09:30:00Z',
  },
  {
    id: 'visit-003',
    candidateId: 'cand-006',
    candidateName: 'Camila Torres',
    propertyId: 'prop-002',
    propertyTitle: 'Casa Usaquén',
    requestedDate: '2026-02-05',
    requestedTime: '11:00',
    status: 'requested',
    candidateMessage: 'Quisiera conocer la casa y el barrio.',
    createdAt: '2026-02-01T08:15:00Z',
  },
  {
    id: 'visit-004',
    candidateId: 'cand-001',
    candidateName: 'Carlos Mendoza',
    propertyId: 'prop-001',
    propertyTitle: 'Apartamento Chapinero Alto',
    requestedDate: '2026-02-02',
    requestedTime: '09:00',
    status: 'confirmed',
    landlordNotes: 'Candidato con score alto, priorizar.',
    createdAt: '2026-01-28T10:00:00Z',
  },
  {
    id: 'visit-005',
    candidateId: 'cand-002',
    candidateName: 'María García',
    propertyId: 'prop-002',
    propertyTitle: 'Casa Usaquén',
    requestedDate: '2026-02-02',
    requestedTime: '14:00',
    status: 'confirmed',
    createdAt: '2026-01-29T11:00:00Z',
  },
  {
    id: 'visit-006',
    candidateId: 'cand-007',
    candidateName: 'Santiago Herrera',
    propertyId: 'prop-001',
    propertyTitle: 'Apartamento Chapinero Alto',
    requestedDate: '2026-01-25',
    requestedTime: '10:00',
    status: 'completed',
    landlordNotes: 'Muy interesado, buen perfil. Pidió más información sobre gastos comunes.',
    createdAt: '2026-01-20T16:00:00Z',
  },
  {
    id: 'visit-007',
    candidateId: 'cand-004',
    candidateName: 'Valentina Díaz',
    propertyId: 'prop-002',
    propertyTitle: 'Casa Usaquén',
    requestedDate: '2026-01-26',
    requestedTime: '16:00',
    status: 'completed',
    landlordNotes: 'Visitó con su pareja. Les gustó la distribución.',
    createdAt: '2026-01-22T13:00:00Z',
  },
  {
    id: 'visit-008',
    candidateId: 'cand-009',
    candidateName: 'Felipe Morales',
    propertyId: 'prop-001',
    propertyTitle: 'Apartamento Chapinero Alto',
    requestedDate: '2026-01-24',
    requestedTime: '11:00',
    status: 'cancelled',
    candidateMessage: 'Ya encontré otra opción, gracias.',
    createdAt: '2026-01-18T09:00:00Z',
  },
  {
    id: 'visit-009',
    candidateId: 'cand-010',
    candidateName: 'Isabella Rojas',
    propertyId: 'prop-002',
    propertyTitle: 'Casa Usaquén',
    requestedDate: '2026-01-23',
    requestedTime: '09:30',
    status: 'cancelled',
    landlordNotes: 'Cancelado por el candidato un día antes.',
    createdAt: '2026-01-17T15:00:00Z',
  },
  {
    id: 'visit-010',
    candidateId: 'cand-012',
    candidateName: 'Daniela Peña',
    propertyId: 'prop-001',
    propertyTitle: 'Apartamento Chapinero Alto',
    requestedDate: '2026-01-27',
    requestedTime: '14:00',
    status: 'no_show',
    landlordNotes: 'No se presentó ni dio aviso.',
    createdAt: '2026-01-21T10:00:00Z',
  },
];

export function getVisitsForProperty(propertyId: string): Visit[] {
  return MOCK_VISITS.filter(v => v.propertyId === propertyId);
}

export function getVisitById(id: string): Visit | undefined {
  return MOCK_VISITS.find(v => v.id === id);
}

export function getVisitStats() {
  return {
    total: MOCK_VISITS.length,
    requested: MOCK_VISITS.filter(v => v.status === 'requested').length,
    confirmed: MOCK_VISITS.filter(v => v.status === 'confirmed').length,
    completed: MOCK_VISITS.filter(v => v.status === 'completed').length,
    cancelled: MOCK_VISITS.filter(v => v.status === 'cancelled').length,
    noShow: MOCK_VISITS.filter(v => v.status === 'no_show').length,
  };
}

export function getUpcomingVisits(): Visit[] {
  return MOCK_VISITS
    .filter(v => v.status === 'confirmed' || v.status === 'requested')
    .sort((a, b) => a.requestedDate.localeCompare(b.requestedDate));
}

export function getPendingVisitCount(): number {
  return MOCK_VISITS.filter(v => v.status === 'requested').length;
}
