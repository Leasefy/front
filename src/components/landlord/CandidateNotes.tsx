'use client';

import { useState, useEffect, useCallback } from 'react';
import { Pencil, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useDecisions } from '@/lib/context/DecisionContext';

// ============================================================================
// Types
// ============================================================================

export interface CandidateNotesProps {
  /** ID of the candidate */
  candidateId: string;
  /** Display variant: inline = preview, textarea = full editing */
  variant?: 'inline' | 'textarea';
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_CHARACTERS = 500;
const PLACEHOLDER = 'Agrega notas sobre este candidato...';

// ============================================================================
// Component
// ============================================================================

/**
 * CandidateNotes - Notes functionality for landlord annotations
 *
 * Variants:
 * - inline: Shows note preview, click to expand
 * - textarea: Full editing interface with character count
 *
 * Features:
 * - Auto-save on blur
 * - Character count
 * - Uses DecisionContext for persistence
 */
export function CandidateNotes({
  candidateId,
  variant = 'textarea',
  className,
}: CandidateNotesProps) {
  const { getNote, setNote, isHydrated } = useDecisions();

  // Local state for editing
  const [localNote, setLocalNote] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Sync with context when hydrated
  useEffect(() => {
    if (isHydrated) {
      setLocalNote(getNote(candidateId));
    }
  }, [isHydrated, candidateId, getNote]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      if (value.length <= MAX_CHARACTERS) {
        setLocalNote(value);
        setIsSaved(false);
      }
    },
    []
  );

  const handleSave = useCallback(() => {
    setNote(candidateId, localNote);
    setIsSaved(true);
    setIsEditing(false);

    // Reset saved indicator after a brief delay
    setTimeout(() => setIsSaved(false), 2000);
  }, [candidateId, localNote, setNote]);

  const handleBlur = useCallback(() => {
    // Auto-save on blur
    if (localNote !== getNote(candidateId)) {
      handleSave();
    }
  }, [localNote, candidateId, getNote, handleSave]);

  // ---------------------------------------------------------------------------
  // Render: Inline Variant
  // ---------------------------------------------------------------------------

  if (variant === 'inline') {
    const hasNote = localNote.trim().length > 0;

    if (!isEditing) {
      return (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className={cn(
            'flex items-start gap-2 text-left text-sm transition-colors',
            hasNote
              ? 'text-slate-600 hover:text-slate-800'
              : 'text-muted-foreground hover:text-foreground',
            className
          )}
        >
          <Pencil className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span className={cn('line-clamp-2', !hasNote && 'italic')}>
            {hasNote ? localNote : PLACEHOLDER}
          </span>
        </button>
      );
    }

    return (
      <div className={cn('space-y-2', className)}>
        <Textarea
          value={localNote}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={PLACEHOLDER}
          className="min-h-[80px] resize-none text-sm"
          autoFocus
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {localNote.length}/{MAX_CHARACTERS}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSave}
            className="h-7 px-2"
          >
            <Check className="mr-1 h-3.5 w-3.5" />
            Guardar
          </Button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Textarea Variant
  // ---------------------------------------------------------------------------

  return (
    <div className={cn('space-y-2', className)}>
      <Textarea
        value={localNote}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={PLACEHOLDER}
        className="min-h-[100px] resize-none text-sm"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {localNote.length}/{MAX_CHARACTERS}
        </span>
        <div className="flex items-center gap-2">
          {isSaved && (
            <span className="flex items-center gap-1 text-xs text-emerald-600">
              <Check className="h-3 w-3" />
              Guardado
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleSave}
            disabled={localNote === getNote(candidateId)}
            className="h-7 px-3"
          >
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}
