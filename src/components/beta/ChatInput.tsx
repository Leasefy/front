'use client';

import { useState, useCallback, useRef, useEffect, type KeyboardEvent } from 'react';
import { ArrowUp } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

const MAX_ROWS = 5;
const LINE_HEIGHT = 24;

/**
 * ChatInput - Clean bordered input with auto-resizing textarea.
 * Enter sends, Shift+Enter for newline. Minimal design.
 */
export function ChatInput({ onSend, disabled = false, className }: ChatInputProps) {
  const { t } = useI18n();
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isEmpty = value.trim().length === 0;
  const isDisabled = disabled || isEmpty;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const maxHeight = LINE_HEIGHT * MAX_ROWS + 16;
    textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
  }, [value]);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
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
    <div className={cn('px-4 pb-4 pt-2', className)}>
      <div className="max-w-3xl mx-auto">
        <div
          className={cn(
            'flex items-end gap-2',
            'px-4 py-2',
            'rounded-2xl',
            'bg-white dark:bg-neutral-900',
            'border border-neutral-200 dark:border-neutral-700',
            'shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)]',
            'focus-within:border-neutral-400 dark:focus-within:border-neutral-500',
            'focus-within:shadow-[0_2px_20px_rgba(0,0,0,0.06)] dark:focus-within:shadow-[0_2px_20px_rgba(0,0,0,0.3)]',
            'transition-all duration-200'
          )}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('beta.chat.placeholder')}
            disabled={disabled}
            rows={1}
            className={cn(
              'flex-1 resize-none',
              'bg-transparent',
              'text-[15px] leading-relaxed',
              'text-foreground',
              'placeholder:text-neutral-400 dark:placeholder:text-neutral-500',
              'focus:outline-none',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'py-1.5'
            )}
            style={{ lineHeight: `${LINE_HEIGHT}px` }}
          />

          <button
            onClick={handleSend}
            disabled={isDisabled}
            className={cn(
              'flex-shrink-0',
              'w-8 h-8 rounded-lg',
              'flex items-center justify-center',
              'transition-all duration-150',
              isDisabled
                ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed'
                : 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 active:scale-95'
            )}
            aria-label={t('beta.chat.sendButton')}
          >
            <ArrowUp className="w-4 h-4" weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}
