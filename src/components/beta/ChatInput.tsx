'use client';

import { useState, useCallback, useRef, useEffect, type KeyboardEvent } from 'react';
import { ArrowUp } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  className?: string;
  /**
   * default: compact bar docked at the bottom of an active conversation.
   * hero: the big Manus-style centered card used in the welcome state.
   */
  variant?: 'default' | 'hero';
}

const MAX_ROWS = 5;
const LINE_HEIGHT = 24;

/**
 * ChatInput - Clean bordered input with auto-resizing textarea.
 * Enter sends, Shift+Enter for newline. Minimal design.
 */
export function ChatInput({ onSend, disabled = false, className, variant = 'default' }: ChatInputProps) {
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

  if (variant === 'hero') {
    // Manus-style hero card: tall rounded input with the send button anchored
    // bottom-right. Used centered in the welcome state.
    return (
      <div className={cn('w-full', className)}>
        <div
          className={cn(
            'flex flex-col',
            'px-4 pt-3.5 pb-3',
            'rounded-[22px]',
            'bg-white dark:bg-[#18181b]',
            'border border-neutral-200 dark:border-neutral-700/80',
            'shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.35)]',
            'focus-within:border-neutral-300 dark:focus-within:border-neutral-500',
            'focus-within:shadow-[0_4px_32px_rgba(0,0,0,0.09)] dark:focus-within:shadow-[0_4px_32px_rgba(0,0,0,0.5)]',
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
            rows={2}
            className={cn(
              'w-full resize-none min-h-[56px]',
              'bg-transparent',
              'text-[15px] leading-relaxed',
              'text-foreground',
              'placeholder:text-neutral-400 dark:placeholder:text-neutral-500',
              'focus:outline-none',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            style={{ lineHeight: `${LINE_HEIGHT}px` }}
          />
          <div className="flex items-center justify-end pt-1">
            <button
              onClick={handleSend}
              disabled={isDisabled}
              className={cn(
                'flex-shrink-0',
                'w-9 h-9 rounded-full',
                'flex items-center justify-center',
                "relative before:absolute before:-inset-1.5 before:content-['']",
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

  return (
    // pb resolves to 1rem (= pb-4) on desktop; on devices with a home
    // indicator the safe-area inset wins so the input clears it.
    <div className={cn('px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2', className)}>
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
              // ≥44px hit target (32 + 2×6) without growing the visual button
              "relative before:absolute before:-inset-1.5 before:content-['']",
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
