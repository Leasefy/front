'use client';

import { useState, useCallback, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CandidateList, CandidateDetail } from '@/components/landlord';
import { formatCurrency } from '@/lib/format';
import { getLandlordProperty, getCandidatesForProperty } from '@/lib/data/mock-landlord-data';
import { getCandidateById } from '@/lib/data/mock-candidates';
import type { LandlordCandidateStatus } from '@/lib/types/landlord';
import type { Candidate } from '@/lib/types/candidate';

// ============================================================================
// Types
// ============================================================================

interface PropertyCandidatesPageProps {
  params: Promise<{
    propertyId: string;
  }>;
}

// ============================================================================
// Component
// ============================================================================

export default function PropertyCandidatesPage({ params }: PropertyCandidatesPageProps) {
  const { propertyId } = use(params);

  // Get property and candidates data
  const property = getLandlordProperty(propertyId);
  const initialCandidates = getCandidatesForProperty(propertyId);

  // State for candidate list
  const [candidates, setCandidates] = useState(initialCandidates);

  // State for detail drawer
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

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
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-8">
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
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        {/* Back Navigation */}
        <Link
          href="/panel"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors mb-6"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          Volver a mis propiedades
        </Link>

        {/* Property Header Card */}
        <Card className="mb-8">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-start gap-4">
              {/* Property Thumbnail */}
              <div className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-slate-200 sm:h-20 sm:w-32">
                {property.thumbnailUrl && (
                  <Image
                    src={property.thumbnailUrl}
                    alt={property.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 96px, 128px"
                  />
                )}
              </div>

              {/* Property Info */}
              <div>
                <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">
                  {property.title}
                </h1>
                <p className="text-sm text-slate-600">
                  {property.neighborhood}, {property.city}
                </p>
                <div className="mt-1 flex items-center gap-3 text-sm">
                  <span className="font-medium text-slate-900">
                    {formatCurrency(property.monthlyRent)}/mes
                  </span>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-600">
                    {property.bedrooms} hab. | {property.area} m²
                  </span>
                </div>
              </div>
            </div>

            {/* Candidate Count Badge */}
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                {candidates.length} {candidates.length === 1 ? 'candidato' : 'candidatos'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Candidatos
          </h2>
          {candidates.length > 0 && (
            <p className="text-sm text-slate-500">
              Ordenados por puntuacion (mejor primero)
            </p>
          )}
        </div>

        {/* Candidate List */}
        <CandidateList
          candidates={candidates}
          onViewDetails={handleViewDetails}
          onDecision={handleDecision}
          groupByLevel={false}
        />
      </div>

      {/* Candidate Detail Drawer */}
      <CandidateDetail
        candidate={selectedCandidate}
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
      />
    </div>
  );
}
