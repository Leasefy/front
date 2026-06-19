'use client';

import { useRouter } from 'next/navigation';
import { FileText, X } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// ============================================================================
// TextTs
// ============================================================================

export interface ContractConfirmationProps {
  /** Name of the approved candidate */
  candidateName: string;
  /** Property ID for contract URL */
  propertyId: string;
  /** Candidate ID for contract URL */
  candidateId: string;
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog closes */
  onClose: () => void;
}

// ============================================================================
// Component
// ============================================================================

/**
 * ContractConfirmation - Dialog shown after approving a candidate
 *
 * Asks user if they want to proceed to generate the contract.
 * - "Si, generar" → navigates to contract page
 * - "Mas tarde" → closes dialog
 */
export function ContractConfirmation({
  candidateName,
  propertyId,
  candidateId,
  isOpen,
  onClose,
}: ContractConfirmationProps) {
  const router = useRouter();

  const firstName = candidateName.split(' ')[0];

  const handleGenerateContract = () => {
    router.push(`/panel/${propertyId}/contract/${candidateId}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E8F3EC]">
              <FileText className="h-5 w-5 text-[#2C7A53]" />
            </div>
            <DialogTitle className="text-lg">
              Candidato aprobado
            </DialogTitle>
          </div>
        </DialogHeader>

        <DialogDescription className="py-4 text-base">
          <strong>{firstName}</strong> ha sido aprobado. ¿Deseas generar el
          contrato de arriendo ahora?
        </DialogDescription>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            <X className="mr-1.5 h-4 w-4" />
            Mas tarde
          </Button>
          <Button
            onClick={handleGenerateContract}
            className="flex-1 bg-[#2C7A53] hover:bg-[#2C7A53]"
          >
            <FileText className="mr-1.5 h-4 w-4" />
            Si, generar contrato
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
