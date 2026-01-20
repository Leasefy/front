'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  CandidateList,
  CandidateDetail,
  PropertyHeader,
  TabNavigation,
} from '@/components/landlord';
import { getLandlordProperty, getCandidatesForProperty } from '@/lib/data/mock-landlord-data';
import { getCandidateById } from '@/lib/data/mock-candidates';
import type { LandlordCandidateStatus } from '@/lib/types/landlord';
import type { Candidate } from '@/lib/types/candidate';
import type { Tab } from '@/components/landlord';

// ============================================================================
// Types
// ============================================================================

interface PropertyCandidatesPageProps {
  params: {
    propertyId: string;
  };
}

// Tab configuration
const TABS: Tab[] = [
  { id: 'candidates', label: 'Candidatos' },
  { id: 'documents', label: 'Documentos', disabled: true },
  { id: 'activity', label: 'Actividad', disabled: true },
];

// ============================================================================
// Component
// ============================================================================

export default function PropertyCandidatesPage({ params }: PropertyCandidatesPageProps) {
  const { propertyId } = params;

  // Get property and candidates data
  const property = getLandlordProperty(propertyId);
  const initialCandidates = getCandidatesForProperty(propertyId);

  // State for tabs
  const [activeTab, setActiveTab] = useState('candidates');

  // State for candidate list
  const [candidates, setCandidates] = useState(initialCandidates);

  // State for detail drawer
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Build tabs with counts
  const tabsWithCounts: Tab[] = TABS.map((tab) => {
    if (tab.id === 'candidates') {
      return { ...tab, count: candidates.length };
    }
    return tab;
  });

  // Handle view details - open drawer with full candidate data
  const handleViewDetails = useCallback((candidateId: string) => {
    const fullCandidate = getCandidateById(candidateId);
    if (fullCandidate) {
      setSelectedCandidate(fullCandidate);
      setIsDetailOpen(true);
    }
  }, []);

  // Handle close detail drawer
  const handleCloseDetail = useCallback(() => {
    setIsDetailOpen(false);
    // Clear selected candidate after animation completes
    setTimeout(() => setSelectedCandidate(null), 300);
  }, []);

  // Handle decision - update candidate status in local state
  const handleDecision = useCallback(
    (candidateId: string, newStatus: LandlordCandidateStatus) => {
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === candidateId
            ? { ...c, status: newStatus, statusChangedAt: new Date().toISOString() }
            : c
        )
      );
    },
    []
  );

  // Property not found
  if (!property) {
    return (
      <div className="min-h-screen">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">
              Propiedad no encontrada
            </h1>
            <p className="mt-2 text-slate-600">
              La propiedad que buscas no existe o no tienes acceso.
            </p>
            <Link href="/panel">
              <Button className="mt-4">Volver al panel</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Property Header */}
        <PropertyHeader property={property} candidates={candidates} />

        {/* Tab Navigation */}
        <TabNavigation
          tabs={tabsWithCounts}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          className="mt-6"
        />

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'candidates' && (
            <>
              {/* Section Header */}
              {candidates.length > 0 && (
                <p className="text-sm text-slate-500 mb-4">
                  Ordenados por puntuacion (mejor primero)
                </p>
              )}

              {/* Candidate List */}
              <CandidateList
                candidates={candidates}
                onViewDetails={handleViewDetails}
                onDecision={handleDecision}
                groupByLevel={false}
              />
            </>
          )}

          {activeTab === 'documents' && (
            <div className="text-center py-12 bg-white rounded-sm border border-slate-100">
              <p className="text-slate-500">
                La seccion de documentos estara disponible pronto
              </p>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="text-center py-12 bg-white rounded-sm border border-slate-100">
              <p className="text-slate-500">
                La seccion de actividad estara disponible pronto
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Candidate Detail Drawer */}
      <CandidateDetail
        candidate={selectedCandidate}
        propertyId={propertyId}
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
      />
    </div>
  );
}
