'use client';

import { useState, useCallback, useRef, useEffect, type KeyboardEvent } from 'react';
import { PaperPlaneTilt } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  /** Called when user sends a message */
  onSend: (text: string) => void;
  /** Disable input (e.g. while AI is streaming) */
  disabled?: boolean;
  className?: string;
}

/** Maximum rows the textarea can grow to */
const MAX_ROWS = 5;
/** Line height in pixels for row calculation */
const LINE_HEIGHT = 24;

/**
 * ChatInput - Auto-resizing textarea with send button.
 *
 * Enter sends the message, Shift+Enter adds a newline.
 * Send button disabled when empty or disabled prop is true.
 * Auto-resizes from 1 row to MAX_ROWS, then scrolls internally.
 */
export function ChatInput({ onSend, disabled = false, className }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isEmpty = value.trim().length === 0;
  const isDisabled = disabled || isEmpty;

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to recalculate
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const maxHeight = LINE_HEIGHT * MAX_ROWS + 16; // 16px for padding
    textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
  }, [value]);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;

    onSend(trimmed);
    setValue('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div
      className={cn(
        'flex items-end gap-2',
        'px-4 py-3',
        'border-t border-neutral-200 dark:border-border',
        'bg-white dark:bg-card',
        className
      )}
    >
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Escribe un mensaje..."
        disabled={disabled}
        rows={1}
        className={cn(
          'flex-1 resize-none',
          'bg-transparent',
          'text-[14px] text-foreground placeholder:text-muted-foreground',
          'focus:outline-none',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'py-2'
        )}
        style={{ lineHeight: `${LINE_HEIGHT}px` }}
      />

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={isDisabled}
        className={cn(
          'flex-shrink-0',
          'w-9 h-9 rounded-xl',
          'flex items-center justify-center',
          'transition-all duration-150',
          isDisabled
            ? 'bg-neutral-100 dark:bg-neutral-800 text-muted-foreground cursor-not-allowed'
            : 'bg-indigo-500 text-white hover:bg-indigo-600 active:scale-95'
        )}
        aria-label="Enviar mensaje"
      >
        <PaperPlaneTilt className="w-4 h-4" weight="fill" />
      </button>
    </div>
  );
}
