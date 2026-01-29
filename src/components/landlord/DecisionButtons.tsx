'use client';

import { useState } from 'react';
import { Check, X, MessageCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useDecisions, MAX_PRE_APPROVALS } from '@/lib/context/DecisionContext';
import type { LandlordCandidateStatus } from '@/lib/types/landlord';

// ============================================================================
// Types
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
      toast.error(`Maximo ${MAX_PRE_APPROVALS} pre-aprobados`, {
        description: 'Debes rechazar o quitar la pre-aprobacion de otro candidato primero.',
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
          description: 'El candidato recibira una notificacion.',
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
            currentStatus === 'approved' && 'bg-emerald-600 hover:bg-emerald-700'
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
            currentStatus === 'pre-approved' && 'bg-blue-50 border-blue-200 text-blue-700'
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
          currentStatus === 'approved' && 'bg-emerald-600 hover:bg-emerald-700'
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
            currentStatus === 'pre-approved' && 'bg-blue-50 border-blue-200 text-blue-700'
          )}
          onClick={() => handleDecision('pre-approved')}
        >
          <Check className="mr-1.5 h-3.5 w-3.5" />
          Pre-aprobar
        </Button>

        <Button
          size="sm"
          variant="outline"
          disabled={isUpdating}
          className={cn(
            'w-full',
            currentStatus === 'rejected' && 'bg-red-50 border-red-200 text-red-700'
          )}
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
            'w-full text-slate-600',
            currentStatus === 'more-info' && 'bg-amber-50 border-amber-200 text-amber-700'
          )}
          onClick={() => handleDecision('more-info')}
        >
          <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
          Más info
        </Button>
      </div>
    </div>
  );
}
