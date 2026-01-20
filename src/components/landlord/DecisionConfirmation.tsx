'use client';

import { AlertTriangle, Check, X } from 'lucide-react';
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
// Types
// ============================================================================

export interface DecisionConfirmationProps {
  /** Type of action requiring confirmation */
  action: 'reject' | 'approve';
  /** Name of the candidate */
  candidateName: string;
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when user confirms the action */
  onConfirm: () => void;
  /** Callback when user cancels */
  onCancel: () => void;
}

// ============================================================================
// Component
// ============================================================================

/**
 * DecisionConfirmation - Confirmation dialog for important decisions
 *
 * Used for:
 * - Reject: "Esta seguro de rechazar a {name}?"
 * - Approve: "Esta seguro de aprobar a {name}?"
 */
export function DecisionConfirmation({
  action,
  candidateName,
  isOpen,
  onConfirm,
  onCancel,
}: DecisionConfirmationProps) {
  const isReject = action === 'reject';

  // First name only for a friendlier message
  const firstName = candidateName.split(' ')[0];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                isReject ? 'bg-red-100' : 'bg-emerald-100'
              }`}
            >
              {isReject ? (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              ) : (
                <Check className="h-5 w-5 text-emerald-600" />
              )}
            </div>
            <DialogTitle className="text-lg">
              {isReject ? 'Rechazar candidato' : 'Aprobar candidato'}
            </DialogTitle>
          </div>
        </DialogHeader>

        <DialogDescription className="py-4 text-base">
          {isReject ? (
            <>
              Esta seguro de rechazar a <strong>{firstName}</strong>? Esta
              accion cambiara el estado del candidato y sera visible en su
              historial.
            </>
          ) : (
            <>
              Esta seguro de aprobar a <strong>{firstName}</strong>? Esto
              indicara que el candidato ha sido seleccionado para el arriendo.
            </>
          )}
        </DialogDescription>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            <X className="mr-1.5 h-4 w-4" />
            Cancelar
          </Button>
          <Button
            variant={isReject ? 'destructive' : 'default'}
            onClick={onConfirm}
            className={`flex-1 ${
              !isReject ? 'bg-emerald-600 hover:bg-emerald-700' : ''
            }`}
          >
            <Check className="mr-1.5 h-4 w-4" />
            {isReject ? 'Si, rechazar' : 'Si, aprobar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
