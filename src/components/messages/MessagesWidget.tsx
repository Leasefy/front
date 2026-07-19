'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Chat,
  ChatCircle,
  MagnifyingGlass,
  PaperPlaneTilt,
  Paperclip,
  DotsThreeVertical,
  Check,
  Checks,
  Info,
  Image,
  Smiley,
  ArrowLeft,
  X,
  House,
  Envelope,
  Archive,
  BellSlash,
  Flag,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { IconButton, MonoLabel } from '@leasefy/cadence';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { useConversations, useChat } from '@/lib/hooks/useMessages';
import type { ChatConversation } from '@/lib/api/messages.types';

// ============================================================================
// Widget props
// ============================================================================

export type MessagesActor = 'tenant' | 'landlord';

export interface MessagesWidgetProps {
  /**
   * Rol del usuario actual. Cambia copy de empty states ("propietario" vs "inquilino")
   * y las i18n keys (namespace `messages.*` para tenant, `landlord.messages.*` para landlord/agency).
   */
  actor: MessagesActor;
}

// ============================================================================
// Helpers
// ============================================================================

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatMessageTime(isoStr: string): string {
  const date = new Date(isoStr);
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

// ============================================================================
// Loading skeletons
// ============================================================================

function ConversationsSkeleton() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-4 animate-pulse">
          <div className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-700 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 bg-neutral-200 dark:bg-neutral-700 rounded" />
              <div className="h-3 w-10 bg-neutral-200 dark:bg-neutral-700 rounded" />
            </div>
            <div className="h-3 w-36 bg-neutral-200 dark:bg-neutral-700 rounded" />
            <div className="h-3 w-48 bg-neutral-200 dark:bg-neutral-700 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MessagesSkeleton() {
  return (
    <div className="space-y-4 p-6 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-start' : 'justify-end')}>
          <div className={cn(
            'h-12 rounded-xl',
            i % 2 === 0
              ? 'w-3/5 bg-neutral-200 dark:bg-neutral-700 rounded-bl-sm'
              : 'w-2/5 bg-primary-soft rounded-br-sm'
          )} />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main widget
// ============================================================================

export function MessagesWidget({ actor }: MessagesWidgetProps) {
  const { t, locale } = useI18n();
  const { conversations, totalUnread, isLoading: isLoadingConversations, refetch: refetchConversations } = useConversations();

  const searchParams = useSearchParams();
  const urlApplicationId = searchParams.get('applicationId');

  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(urlApplicationId);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showOptionsList, setShowOptionsList] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionsListRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading: isLoadingMessages, isSending, sendMessage, markAsRead } = useChat(selectedApplicationId);

  // Copy por actor (tenant ve "propietarios", landlord/agency ve "inquilinos").
  const isTenant = actor === 'tenant';
  const otherParty = isTenant
    ? (locale === 'es' ? 'propietarios' : 'landlords')
    : (locale === 'es' ? 'inquilinos' : 'tenants');
  const headerTitle = isTenant ? t('messages.title') : t('landlord.messages.title');
  const headerSubtitle = isTenant ? t('messages.subtitle') : t('landlord.messages.subtitle');

  // Auto-select: URL > current selection > first available.
  // Abre el panel mobile cuando el usuario llega vía deep-link desde otra pantalla.
  useEffect(() => {
    if (urlApplicationId && urlApplicationId !== selectedApplicationId) {
      setSelectedApplicationId(urlApplicationId);
      setShowMobileChat(true);
      return;
    }
    if (!selectedApplicationId && conversations.length > 0) {
      setSelectedApplicationId(conversations[0].applicationId);
    }
  }, [conversations, selectedApplicationId, urlApplicationId]);

  const selectedConversation: ChatConversation | undefined = conversations.find(
    (c) => c.applicationId === selectedApplicationId,
  );

  const filteredConversations = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.property.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsListRef.current && !optionsListRef.current.contains(event.target as Node)) {
        setShowOptionsList(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectConversation = useCallback(
    (conv: ChatConversation) => {
      setSelectedApplicationId(conv.applicationId);
      setShowMobileChat(true);
      setShowInfoPanel(false);
      setShowOptionsList(false);
      markAsRead();
      setTimeout(() => refetchConversations(), 500);
      setTimeout(() => inputRef.current?.focus(), 100);
    },
    [markAsRead, refetchConversations],
  );

  const handleSendMessage = useCallback(async () => {
    const text = messageText.trim();
    if (!text || isSending) return;
    setMessageText('');
    await sendMessage(text);
    refetchConversations();
  }, [messageText, isSending, sendMessage, refetchConversations]);

  // Acciones placeholder (backend no las soporta aún — mantenemos alert con copy i18n).
  const handleArchive = () => {
    setShowOptionsList(false);
    alert(
      locale === 'es'
        ? `Conversacion con ${selectedConversation?.name ?? ''} archivada`
        : `Conversation with ${selectedConversation?.name ?? ''} archived`,
    );
  };

  const handleMute = () => {
    setShowOptionsList(false);
    alert(
      locale === 'es'
        ? `Notificaciones de ${selectedConversation?.name ?? ''} silenciadas`
        : `Notifications from ${selectedConversation?.name ?? ''} muted`,
    );
  };

  const handleReport = () => {
    setShowOptionsList(false);
    alert(locale === 'es' ? 'Conversacion reportada' : 'Conversation reported');
  };

  return (
    <div className="h-[calc(100vh-64px)] bg-bg overflow-hidden flex flex-col">
      <div className="flex-1 flex flex-col max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full overflow-hidden">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex-shrink-0"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                {headerTitle}
              </h1>
              <p className="text-sm text-muted-foreground max-w-2xl">
                {headerSubtitle}
              </p>
            </div>
            {totalUnread > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-primary-soft rounded-full shrink-0">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-sm font-medium text-primary">
                  {totalUnread} {locale === 'es' ? 'sin leer' : 'unread'}
                </span>
              </div>
            )}
          </div>
        </motion.header>

        {/* Chat Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-border bg-card overflow-hidden flex-1 min-h-0"
        >
          <div className="h-full flex">
            {/* Conversations List */}
            <div
              className={cn(
                'w-full md:w-80 lg:w-96 border-r border-border flex flex-col bg-muted/30',
                showMobileChat && 'hidden md:flex',
              )}
            >
              {/* Search Header */}
              <div className="p-4 border-b border-border bg-card">
                <div className="relative">
                  <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={locale === 'es' ? 'Buscar conversacion...' : 'Search conversation...'}
                    aria-label={locale === 'es' ? 'Buscar conversacion' : 'Search conversation'}
                    className="h-11 pl-11 rounded-full bg-muted"
                  />
                </div>
              </div>

              {/* Conversations */}
              <div className="flex-1 overflow-y-auto">
                {isLoadingConversations ? (
                  <ConversationsSkeleton />
                ) : filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                      <Chat className="w-6 h-6 text-muted-foreground" weight="duotone" />
                    </div>
                    <p className="text-sm font-semibold text-foreground mb-1">
                      {locale === 'es' ? 'Sin conversaciones' : 'No conversations'}
                    </p>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      {searchQuery
                        ? (locale === 'es' ? 'No se encontraron conversaciones' : 'No conversations found')
                        : (locale === 'es'
                            ? `Cuando te comuniques con ${otherParty}, tus conversaciones apareceran aqui.`
                            : `When you communicate with ${otherParty}, your conversations will appear here.`)}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredConversations.map((conversation, index) => (
                      <motion.button
                        key={conversation.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleSelectConversation(conversation)}
                        className={cn(
                          'w-full flex items-start gap-3 px-4 py-4 text-left transition-all',
                          selectedApplicationId === conversation.applicationId
                            ? 'bg-card border-l-2 border-l-primary'
                            : 'hover:bg-card/80',
                        )}
                      >
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 rounded-full bg-primary-soft flex items-center justify-center text-primary font-semibold text-sm overflow-hidden">
                            {getInitials(conversation.name)}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <p
                              className={cn(
                                'truncate text-sm text-foreground',
                                conversation.unreadCount > 0 ? 'font-semibold' : 'font-medium',
                              )}
                            >
                              {conversation.name}
                            </p>
                            <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                              {conversation.lastMessageTime}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mb-1">
                            {conversation.property
                              ? `${conversation.role} · ${conversation.property}`
                              : conversation.role}
                          </p>
                          <p
                            className={cn(
                              'text-sm truncate',
                              conversation.unreadCount > 0
                                ? 'text-foreground font-medium'
                                : 'text-muted-foreground',
                            )}
                          >
                            {conversation.lastMessage}
                          </p>
                        </div>

                        {conversation.unreadCount > 0 && (
                          <span className="min-w-5 h-5 px-1 bg-primary text-primary-foreground tabular-nums text-xs font-semibold rounded-full flex items-center justify-center flex-shrink-0">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div
              className={cn(
                'flex-1 flex flex-col bg-card',
                !showMobileChat && 'hidden md:flex',
              )}
            >
              {!selectedConversation ? (
                <div className="flex-1 flex items-center justify-center">
                  <EmptyState
                    icon={ChatCircle}
                    title={locale === 'es' ? 'Sin mensajes' : 'No messages'}
                    description={locale === 'es' ? 'Selecciona una conversacion para ver los mensajes.' : 'Select a conversation to view messages.'}
                  />
                </div>
              ) : (
                <>
                  {/* Chat Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <div className="flex items-center gap-3">
                      <IconButton
                        variant="ghost"
                        onClick={() => setShowMobileChat(false)}
                        aria-label={locale === 'es' ? 'Volver' : 'Back'}
                        icon={<ArrowLeft className="w-5 h-5" />}
                        className="md:hidden -ml-2 rounded-full text-muted-foreground"
                      />
                      <div className="w-11 h-11 rounded-full bg-primary-soft flex items-center justify-center text-primary font-semibold text-sm">
                        {getInitials(selectedConversation.name)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {selectedConversation.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedConversation.role}
                          {selectedConversation.property && ` · ${selectedConversation.property}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <IconButton
                        variant="ghost"
                        onClick={() => setShowInfoPanel(!showInfoPanel)}
                        className={cn(
                          'rounded-full',
                          showInfoPanel
                            ? 'bg-primary-soft text-primary'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                        aria-label={locale === 'es' ? 'Informacion' : 'Information'}
                        icon={<Info className="w-5 h-5" />}
                      />

                      <div className="relative" ref={optionsListRef}>
                        <IconButton
                          variant="ghost"
                          onClick={() => setShowOptionsList(!showOptionsList)}
                          className={cn(
                            'rounded-full',
                            showOptionsList
                              ? 'bg-muted text-foreground'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                          aria-label={locale === 'es' ? 'Mas opciones' : 'More options'}
                          icon={<DotsThreeVertical className="w-5 h-5" />}
                        />

                        <AnimatePresence>
                          {showOptionsList && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              transition={{ duration: 0.15 }}
                              className="absolute right-0 top-full mt-2 w-52 bg-card rounded-xl border border-border py-2 z-50"
                            >
                              <button
                                onClick={handleArchive}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                              >
                                <Archive className="w-4 h-4 text-muted-foreground" />
                                {locale === 'es' ? 'Archivar conversacion' : 'Archive conversation'}
                              </button>
                              <button
                                onClick={handleMute}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                              >
                                <BellSlash className="w-4 h-4 text-muted-foreground" />
                                {locale === 'es' ? 'Silenciar notificaciones' : 'Mute notifications'}
                              </button>
                              <button
                                onClick={handleReport}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                              >
                                <Flag className="w-4 h-4 text-muted-foreground" />
                                {locale === 'es' ? 'Reportar' : 'Report'}
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* Main Chat Content */}
                  <div className="flex-1 flex overflow-hidden">
                    {/* Messages Area */}
                    <div className={cn('flex-1 flex flex-col', showInfoPanel && 'hidden lg:flex')}>
                      {/*
                        Tenant-only arriendo context header (COMU-01). Ties the chat
                        VISUALLY to the arriendo NOW using the REAL `property` field —
                        never a fabricated arriendo. Renders nothing when `property`
                        is empty; landlord/agency (actor!=='tenant') see NOTHING new
                        (byte-identical). No presence/liveness indicators anywhere.
                      */}
                      {isTenant && selectedConversation.property && (
                        <div className="flex items-start gap-3 px-6 py-3 border-b border-border bg-muted/40">
                          <div className="w-8 h-8 rounded-md bg-card flex items-center justify-center flex-shrink-0 mt-0.5">
                            <House className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {locale === 'es'
                                ? `Sobre tu arriendo — ${selectedConversation.property}`
                                : `About your rental — ${selectedConversation.property}`}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {locale === 'es'
                                ? 'Estamos conectando cada chat a su arriendo; el hilo por arriendo llega próximamente.'
                                : "We're tying each chat to its rental; per-rental threads are coming soon."}
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="flex-1 overflow-y-auto p-6 bg-muted/30">
                        {isLoadingMessages ? (
                          <MessagesSkeleton />
                        ) : messages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4 border border-border">
                              <ChatCircle className="w-6 h-6 text-muted-foreground" weight="duotone" />
                            </div>
                            <p className="text-sm font-semibold text-foreground mb-1">
                              {locale === 'es' ? 'Sin mensajes' : 'No messages'}
                            </p>
                            <p className="text-sm text-muted-foreground max-w-xs">
                              {locale === 'es'
                                ? 'Envia un mensaje para iniciar la conversacion.'
                                : 'Send a message to start the conversation.'}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <AnimatePresence initial={false}>
                              {messages.map((message, index) => (
                                <motion.div
                                  key={message.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.02 }}
                                  className={cn('flex', message.isMine ? 'justify-end' : 'justify-start')}
                                >
                                  <div
                                    className={cn(
                                      'max-w-[75%] px-4 py-3 rounded-xl',
                                      message.isMine
                                        ? 'bg-primary-soft text-primary border border-primary/30 rounded-br-sm'
                                        : 'bg-card text-foreground border border-border rounded-bl-sm',
                                    )}
                                  >
                                    <p className="text-sm leading-relaxed">{message.content}</p>
                                    <div
                                      className={cn(
                                        'flex items-center justify-end gap-1.5 mt-1.5',
                                        message.isMine
                                          ? 'text-primary'
                                          : 'text-muted-foreground',
                                      )}
                                    >
                                      <span className="text-xs">{formatMessageTime(message.createdAt)}</span>
                                      {message.isMine && (message.readAt ? (
                                        <Checks className="w-3.5 h-3.5 text-primary" />
                                      ) : (
                                        <Check className="w-3.5 h-3.5" />
                                      ))}
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Message Input */}
                      <div className="px-6 py-4 border-t border-border bg-card">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <IconButton
                              variant="ghost"
                              className="rounded-full text-muted-foreground hover:text-foreground"
                              aria-label={locale === 'es' ? 'Adjuntar archivo' : 'Attach file'}
                              icon={<Paperclip className="w-5 h-5" />}
                            />
                            <IconButton
                              variant="ghost"
                              className="rounded-full text-muted-foreground hover:text-foreground"
                              aria-label={locale === 'es' ? 'Enviar imagen' : 'Send image'}
                              icon={<Image className="w-5 h-5" />}
                            />
                          </div>
                          <div className="flex-1 relative">
                            <Input
                              ref={inputRef}
                              type="text"
                              value={messageText}
                              onChange={(e) => setMessageText(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                              placeholder={locale === 'es' ? 'Escribe un mensaje...' : 'Type a message...'}
                              aria-label={locale === 'es' ? 'Escribe un mensaje' : 'Type a message'}
                              className="h-12 pl-5 pr-12 rounded-full bg-muted"
                            />
                            <IconButton
                              variant="ghost"
                              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full text-muted-foreground hover:text-foreground hover:bg-transparent"
                              aria-label="Emoji"
                              icon={<Smiley className="w-5 h-5" />}
                            />
                          </div>
                          <Button
                            size="icon"
                            onClick={handleSendMessage}
                            disabled={!messageText.trim() || isSending}
                            aria-label={locale === 'es' ? 'Enviar mensaje' : 'Send message'}
                            hideArrow
                            className="rounded-full shrink-0"
                          >
                            <PaperPlaneTilt className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Info Panel */}
                    <AnimatePresence>
                      {showInfoPanel && (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.2 }}
                          className="w-full lg:w-80 border-l border-border bg-card overflow-y-auto"
                        >
                          {/* Panel Header */}
                          <div className="flex items-center justify-between p-4 border-b border-border">
                            <h3 className="text-base font-semibold text-foreground">
                              {locale === 'es' ? 'Informacion' : 'Information'}
                            </h3>
                            <IconButton
                              variant="ghost"
                              aria-label={locale === 'es' ? 'Cerrar' : 'Close'}
                              onClick={() => setShowInfoPanel(false)}
                              icon={<X className="w-4 h-4" />}
                              className="rounded-full text-muted-foreground"
                            />
                          </div>

                          <div className="p-6">
                            <div className="text-center mb-6">
                              <div className="w-20 h-20 rounded-full bg-primary-soft flex items-center justify-center text-primary font-semibold text-2xl mx-auto mb-3">
                                {getInitials(selectedConversation.name)}
                              </div>
                              <h4 className="text-base font-semibold text-foreground">
                                {selectedConversation.name}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {selectedConversation.role}
                              </p>
                            </div>

                            <div className="space-y-4">
                              {selectedConversation.property && (
                                <div className="flex items-start gap-3 p-3 bg-muted rounded-xl">
                                  <div className="w-9 h-9 rounded-md bg-card flex items-center justify-center">
                                    <House className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-0.5">
                                      {locale === 'es' ? 'Propiedad' : 'Property'}
                                    </p>
                                    <p className="text-sm font-medium text-foreground">
                                      {selectedConversation.property}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {selectedConversation.email && (
                                <div className="flex items-start gap-3 p-3 bg-muted rounded-xl">
                                  <div className="w-9 h-9 rounded-md bg-card flex items-center justify-center">
                                    <Envelope className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-0.5">
                                      {locale === 'es' ? 'Correo' : 'Email'}
                                    </p>
                                    <p className="text-sm font-medium text-foreground">
                                      {selectedConversation.email}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Quick Actions */}
                            <div className="mt-6 pt-6 border-t border-border">
                              <MonoLabel className="block mb-3 text-muted-foreground">
                                {locale === 'es' ? 'Acciones rapidas' : 'Quick actions'}
                              </MonoLabel>
                              <div className="space-y-2">
                                <button
                                  onClick={handleMute}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted rounded-xl transition-colors"
                                >
                                  <BellSlash className="w-4 h-4 text-muted-foreground" />
                                  {locale === 'es' ? 'Silenciar notificaciones' : 'Mute notifications'}
                                </button>
                                <button
                                  onClick={handleArchive}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted rounded-xl transition-colors"
                                >
                                  <Archive className="w-4 h-4 text-muted-foreground" />
                                  {locale === 'es' ? 'Archivar conversacion' : 'Archive conversation'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
