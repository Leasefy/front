'use client';

import { useState } from 'react';
import { Check, X, ChatCircle, Eye } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useDecisions, MAX_PRE_APPROVALS } from '@/lib/context/DecisionContext';
import type { LandlordCandidateStatus } from '@/lib/types/landlord';

// ============================================================================
// TextTs
// ============================================================================

export interface DecisionButtonsProps {
  candidateId: string;
  allCandidateIds?: string[];
  currentStatus?: LandlordCandidateStatus;
  variant: 'card' | 'detail';
  onDecision?: (status: LandlordCandidateStatus) => void;
  onRejectConfirm?: () => void;
  onViewMore?: () => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function DecisionButtons({
  candidateId,
  allCandidateIds = [],
  currentStatus = 'pending',
  variant,
  onDecision,
  onRejectConfirm,
  onViewMore,
  className,
}: DecisionButtonsProps) {
  const { setDecision, canPreApprove, getPreApprovedCount } = useDecisions();
  const [isUpdating, setIsUpdating] = useState(false);

  const preApprovedCount = getPreApprovedCount(allCandidateIds);
  const canStillPreApprove = canPreApprove(allCandidateIds);

  const handleDecision = (status: LandlordCandidateStatus) => {
    if (status === 'rejected' && onRejectConfirm) {
      onRejectConfirm();
      return;
    }

    if (status === 'pre-approved' && !canStillPreApprove && currentStatus !== 'pre-approved') {
      toast.error(`Máximo ${MAX_PRE_APPROVALS} pre-aprobados`, {
        description: 'Debes rechazar o quitar la pre-aprobación de otro candidato primero.',
      });
      return;
    }

    setIsUpdating(true);
    setDecision(candidateId, status);
    onDecision?.(status);

    switch (status) {
      case 'pre-approved':
        toast.success('Candidato pre-aprobado', {
          description: `${preApprovedCount + 1} de ${MAX_PRE_APPROVALS} pre-aprobados`,
        });
        break;
      case 'approved':
        toast.success('Candidato aprobado', {
          description: 'Ya puedes proceder con el contrato.',
        });
        break;
      case 'rejected':
        toast.info('Candidato rechazado');
        break;
      case 'more-info':
        toast.info('Solicitud enviada', {
          description: 'El candidato recibirá una notificación.',
        });
        break;
    }

    setTimeout(() => setIsUpdating(false), 300);
  };

  // ---------------------------------------------------------------------------
  // Card Variant (compact - for candidate cards)
  // ---------------------------------------------------------------------------

  if (variant === 'card') {
    return (
      <div className={cn('flex gap-2', className)}>
        {/* Primary: Aprobar (black) */}
        <Button
          size="sm"
          variant="default"
          disabled={isUpdating}
          className={cn(
            'flex-1',
            currentStatus === 'approved' && 'bg-[#2C7A53] hover:bg-[#2C7A53]'
          )}
          onClick={() => handleDecision('approved')}
        >
          <Check className="mr-1.5 h-3.5 w-3.5" />
          Aprobar
        </Button>
        {/* Secondary: Pre-aprobar */}
        <Button
          size="sm"
          variant="outline"
          disabled={isUpdating}
          className={cn(
            'flex-1',
            currentStatus === 'pre-approved' && 'bg-[#EEF1FF] border-[#1A40FF]/30 text-[#1A40FF]'
          )}
          onClick={() => handleDecision('pre-approved')}
        >
          <Check className="mr-1.5 h-3.5 w-3.5" />
          Pre-aprobar
        </Button>
        {/* Ver mas */}
        <Button
          size="sm"
          variant="outline"
          disabled={isUpdating}
          className="flex-1"
          onClick={onViewMore}
        >
          <Eye className="mr-1.5 h-3.5 w-3.5" />
          Ver más
        </Button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Detail Variant (full - for candidate detail drawer)
  // ---------------------------------------------------------------------------

  return (
    <div className={cn('space-y-3', className)}>
      {/* Primary Action - Aprobar (black primary) */}
      <Button
        size="lg"
        variant="default"
        disabled={isUpdating}
                className={cn(
          'w-full',
          currentStatus === 'approved' && 'bg-[#2C7A53] hover:bg-[#2C7A53]'
        )}
        onClick={() => handleDecision('approved')}
      >
        <Check className="mr-2 h-5 w-5" />
        Aprobar candidato
      </Button>

      {/* Secondary Actions - Row */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          size="sm"
          variant={currentStatus === 'pre-approved' ? 'secondary' : 'outline'}
          disabled={isUpdating}
          className={cn(
            'w-full',
            currentStatus === 'pre-approved' && 'bg-[#EEF1FF] border-[#1A40FF]/30 text-[#1A40FF]'
          )}
          onClick={() => handleDecision('pre-approved')}
        >
          <Check className="mr-1.5 h-3.5 w-3.5" />
          Pre-aprobar
        </Button>

        <Button
          size="sm"
          variant={currentStatus === 'rejected' ? 'destructive' : 'outline'}
          disabled={isUpdating}
          className="w-full"
          onClick={() => handleDecision('rejected')}
        >
          <X className="mr-1.5 h-3.5 w-3.5" />
          Rechazar
        </Button>

        <Button
          size="sm"
          variant="outline"
          disabled={isUpdating}
          className={cn(
            'w-full text-muted-foreground',
            currentStatus === 'more-info' && 'bg-[#F8F0E0] border-[#B7791F]/30 text-[#B7791F]'
          )}
          onClick={() => handleDecision('more-info')}
        >
          <ChatCircle className="mr-1.5 h-3.5 w-3.5" />
          Más info
        </Button>
      </div>
    </div>
  );
}
