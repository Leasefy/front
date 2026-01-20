'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Phone, X, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { LevelBadge } from '@/components/score/LevelBadge';
import { RiskScoreDisplay } from '@/components/score/RiskScoreDisplay';
import { CandidateNotes } from './CandidateNotes';
import { DecisionButtons } from './DecisionButtons';
import { DecisionConfirmation } from './DecisionConfirmation';
import { useDecisions } from '@/lib/context/DecisionContext';
import { CANDIDATE_STATUS_LABELS } from '@/lib/types/landlord';
import type { Candidate } from '@/lib/types/candidate';

// ============================================================================
// Types
// ============================================================================

export interface CandidateDetailProps {
  /** Full candidate data with RiskScore */
  candidate: Candidate | null;
  /** Property ID for contract generation link */
  propertyId: string;
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Callback to close the drawer */
  onClose: () => void;
}

// ============================================================================
// Component
// ============================================================================

/**
 * CandidateDetail - Full candidate view drawer with RiskScoreDisplay
 *
 * Layout:
 * - Header: Photo, name, contact, risk badge
 * - Body: Full RiskScoreDisplay from Phase 4
 * - Notes: Textarea for landlord annotations
 * - Footer: Decision buttons (sticky)
 */
export function CandidateDetail({
  candidate,
  propertyId,
  isOpen,
  onClose,
}: CandidateDetailProps) {
  const { getDecision, setDecision } = useDecisions();
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  // Don't render content if no candidate
  if (!candidate) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full sm:max-w-lg">
          <div className="flex h-full items-center justify-center text-muted-foreground">
            No hay candidato seleccionado
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Get current decision from context
  const decision = getDecision(candidate.id);
  const currentStatus = decision?.status || 'pending';

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleRejectConfirm = () => {
    setDecision(candidate.id, 'rejected');
    setShowRejectConfirm(false);
  };

  // Extract initials for avatar fallback
  const initials = candidate.fullName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('');

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-xl">
          {/* Close Button */}
          <SheetClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 z-10 rounded-full"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </Button>
          </SheetClose>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Header */}
            <SheetHeader className="border-b border-border p-6">
              <div className="flex items-start gap-4 pr-8">
                {/* Photo */}
                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100">
                  {candidate.photo ? (
                    <div
                      className="h-full w-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${candidate.photo})` }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-slate-400">
                      {initials}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <SheetTitle className="text-lg font-semibold text-foreground">
                        {candidate.fullName}
                      </SheetTitle>
                      <p className="text-sm text-muted-foreground">
                        {candidate.occupation}, {candidate.age} anos
                      </p>
                    </div>
                    <LevelBadge level={candidate.riskLevel} size="md" />
                  </div>

                  {/* Contact Info */}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {candidate.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {candidate.phone}
                    </span>
                  </div>

                  {/* Current Status Badge */}
                  {currentStatus !== 'pending' && (
                    <div className="mt-2">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                          currentStatus === 'pre-approved' &&
                            'bg-blue-100 text-blue-700',
                          currentStatus === 'approved' &&
                            'bg-emerald-100 text-emerald-700',
                          currentStatus === 'rejected' &&
                            'bg-red-100 text-red-700',
                          currentStatus === 'more-info' &&
                            'bg-amber-100 text-amber-700'
                        )}
                      >
                        {CANDIDATE_STATUS_LABELS[currentStatus]}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </SheetHeader>

            {/* Risk Score Display */}
            <div className="p-6">
              <RiskScoreDisplay
                candidate={candidate}
                showAnimation
                variant="embedded"
              />
            </div>

            {/* Notes Section */}
            <div className="border-t border-border p-6">
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Notas
              </h3>
              <CandidateNotes candidateId={candidate.id} variant="textarea" />
            </div>
          </div>

          {/* Footer: Decision Buttons (sticky) */}
          <div className="border-t border-border bg-background p-4">
            {/* Generate Contract Button - shown when approved */}
            {currentStatus === 'approved' && (
              <Link
                href={`/panel/${propertyId}/contract/${candidate.id}`}
                className="mb-3 block"
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
              onRejectConfirm={() => setShowRejectConfirm(true)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Reject Confirmation Dialog */}
      <DecisionConfirmation
        action="reject"
        candidateName={candidate.fullName}
        isOpen={showRejectConfirm}
        onConfirm={handleRejectConfirm}
        onCancel={() => setShowRejectConfirm(false)}
      />
    </>
  );
}
