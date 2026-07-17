'use client';

import { useEffect, useRef, useState } from 'react';
import { PaperPlaneTilt, ChatCircle, Check, Checks } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useChat } from '@/lib/hooks/useMessages';

interface ChatThreadProps {
  /** Application the conversation belongs to (one conversation per application). */
  applicationId: string;
  /** Height of the scrollable message area. */
  className?: string;
}

function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Compact, embeddable chat thread for a single application conversation.
 * Same data layer as MessagesWidget (useChat: fetch + 5s polling + optimistic
 * send) but sized to live inside drawers/panels without navigating away.
 */
export function ChatThread({ applicationId, className }: ChatThreadProps) {
  const { messages, isLoading, isSending, error, sendMessage, markAsRead } = useChat(applicationId);
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Opening the thread reads the conversation; incoming messages arriving
  // while it stays open are read too.
  useEffect(() => {
    if (messages.some((m) => !m.isMine && !m.readAt)) {
      void markAsRead();
    }
  }, [messages, markAsRead]);

  // Keep the latest message in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    const content = text.trim();
    if (!content || isSending) return;
    setText('');
    await sendMessage(content);
  };

  return (
    <div className={cn('flex flex-col rounded-xl border border-border bg-card overflow-hidden', className)}>
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 bg-muted/30 max-h-72"
        data-lenis-prevent
        style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Spinner size="sm" variant="muted" label="Cargando mensajes" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <ChatCircle className="w-6 h-6 text-muted-foreground mb-2" weight="duotone" />
            <p className="text-sm text-muted-foreground">
              Sin mensajes. Escribe el primero para iniciar la conversación.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <div key={message.id} className={cn('flex', message.isMine ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[80%] px-3 py-2 rounded-xl',
                    message.isMine
                      ? 'bg-primary-soft text-primary border border-primary/30 rounded-br-sm'
                      : 'bg-card text-foreground border border-border rounded-bl-sm',
                  )}
                >
                  <p className="text-sm leading-relaxed break-words">{message.content}</p>
                  <div
                    className={cn(
                      'flex items-center justify-end gap-1 mt-1',
                      message.isMine ? 'text-primary' : 'text-muted-foreground',
                    )}
                  >
                    <span className="text-[11px]">{formatMessageTime(message.createdAt)}</span>
                    {message.isMine &&
                      (message.readAt ? <Checks className="w-3 h-3" /> : <Check className="w-3 h-3" />)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="px-4 py-1.5 text-xs text-danger border-t border-border">{error}</p>
      )}

      <div className="flex items-center gap-2 px-3 py-2.5 border-t border-border bg-card">
        <Input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void handleSend()}
          placeholder="Escribe un mensaje..."
          aria-label="Escribe un mensaje"
          className="h-10 rounded-full bg-muted"
        />
        <Button
          size="icon"
          onClick={() => void handleSend()}
          disabled={!text.trim() || isSending}
          aria-label="Enviar mensaje"
          hideArrow
          className="rounded-full shrink-0"
        >
          <PaperPlaneTilt className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
