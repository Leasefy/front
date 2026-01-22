'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Phone, FileText, Lock, X } from 'lucide-react';
import { useLenis } from '@/components/providers/SmoothScroll';
import { cn } from '@/lib/utils';
import {
  getDisplayEmail,
  getDisplayPhone,
  shouldRevealData,
  MASKED_DATA_MESSAGE,
} from '@/lib/utils/mask-data';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { RiskScoreDisplay } from '@/components/score/RiskScoreDisplay';
import { CandidateNotes } from './CandidateNotes';
import { DecisionButtons } from './DecisionButtons';
import { DecisionConfirmation } from './DecisionConfirmation';
import { ContractConfirmation } from './ContractConfirmation';
import { useDecisions } from '@/lib/context/DecisionContext';
import { CANDIDATE_STATUS_LABELS, CANDIDATE_STATUS_COLORS } from '@/lib/types/landlord';
import type { LandlordCandidateStatus } from '@/lib/types/landlord';
import type { Candidate } from '@/lib/types/candidate';

// ============================================================================
// Types
// ============================================================================

export interface CandidateDetailProps {
  candidate: Candidate | null;
  propertyId: string;
  isOpen: boolean;
  onClose: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function CandidateDetail({
  candidate,
  propertyId,
  isOpen,
  onClose,
}: CandidateDetailProps) {
  const router = useRouter();
  const { getDecision, setDecision } = useDecisions();
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showContractConfirm, setShowContractConfirm] = useState(false);
  const lenis = useLenis();

  // Stop Lenis smooth scroll when drawer opens to allow native scrolling inside
  useEffect(() => {
    if (isOpen) {
      lenis.stop();
    } else {
      lenis.start();
    }
    return () => {
      lenis.start();
    };
  }, [isOpen, lenis]);

  if (!candidate) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full sm:max-w-lg p-6">
          <div className="flex h-full items-center justify-center text-slate-500">
            No hay candidato seleccionado
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const decision = getDecision(candidate.id);
  const currentStatus = decision?.status || 'pending';

  const handleRejectConfirm = () => {
    setDecision(candidate.id, 'rejected');
    setShowRejectConfirm(false);
  };

  const handleDecision = (status: LandlordCandidateStatus) => {
    if (status === 'approved') {
      // Show contract generation dialog
      setShowContractConfirm(true);
    }
  };

  const initials = candidate.fullName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('');

  const isDataRevealed = shouldRevealData(currentStatus);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          hideCloseButton
          className="w-full sm:max-w-xl p-0 flex flex-col"
          style={{ height: '100vh', maxHeight: '100vh', overflow: 'hidden' }}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-50 w-8 h-8 flex items-center justify-center rounded-sm hover:bg-black/5 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
          </button>

          {/* Scrollable Content Area */}
          <div
            className="flex-1 overflow-y-auto"
            style={{ minHeight: 0, overscrollBehavior: 'contain' }}
            data-lenis-prevent
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-start gap-4 pr-10">
                {/* Photo */}
                <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-sm bg-slate-100">
                  {candidate.photo ? (
                    <div
                      className="h-full w-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${candidate.photo})` }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg font-medium text-slate-400">
                      {initials}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-slate-900 leading-tight">
                    {candidate.fullName}
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {candidate.occupation}, {candidate.age} anos
                  </p>

                  {/* Contact Info */}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" />
                      <span className={cn(!isDataRevealed && 'font-mono text-slate-400')}>
                        {getDisplayEmail(candidate.email, currentStatus)}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      <span className={cn(!isDataRevealed && 'font-mono text-slate-400')}>
                        {getDisplayPhone(candidate.phone, currentStatus)}
                      </span>
                    </span>
                  </div>

                  {/* Privacy Notice */}
                  {!isDataRevealed && (
                    <div className="flex items-center gap-1.5 mt-2 text-[11px] text-amber-600">
                      <Lock className="h-3 w-3" />
                      <span>{MASKED_DATA_MESSAGE}</span>
                    </div>
                  )}

                  {/* Status Badge */}
                  {currentStatus !== 'pending' && (
                    <div className="mt-3">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium',
                          CANDIDATE_STATUS_COLORS[currentStatus]
                        )}
                      >
                        {CANDIDATE_STATUS_LABELS[currentStatus]}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Risk Score Display */}
            <div className="p-6">
              <RiskScoreDisplay
                candidate={candidate}
                showAnimation={false}
                variant="embedded"
              />
            </div>

            {/* Notes Section */}
            <div className="border-t border-slate-100 p-6">
              <h3 className="text-sm font-medium text-slate-900 mb-3">
                Notas
              </h3>
              <CandidateNotes candidateId={candidate.id} variant="textarea" />
            </div>
          </div>

          {/* Footer: Decision Buttons (sticky) */}
          <div className="border-t border-slate-100 bg-white p-4 space-y-3">
            {/* Generate Contract Button - shown when approved */}
            {currentStatus === 'approved' && (
              <Link
                href={`/panel/${propertyId}/contract/${candidate.id}`}
                className="block"
              >
                <Button className="w-full" size="lg">
                  <FileText className="mr-2 h-4 w-4" />
                  Generar contrato
                </Button>
              </Link>
            )}

            <DecisionButtons
              candidateId={candidate.id}
              currentStatus={currentStatus}
              variant="detail"
              onDecision={handleDecision}
              onRejectConfirm={() => setShowRejectConfirm(true)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <DecisionConfirmation
        action="reject"
        candidateName={candidate.fullName}
        isOpen={showRejectConfirm}
        onConfirm={handleRejectConfirm}
        onCancel={() => setShowRejectConfirm(false)}
      />

      <ContractConfirmation
        candidateName={candidate.fullName}
        propertyId={propertyId}
        candidateId={candidate.id}
        isOpen={showContractConfirm}
        onClose={() => setShowContractConfirm(false)}
      />
    </>
  );
}
