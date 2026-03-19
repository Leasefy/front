'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Chat, ChatCircle, MagnifyingGlass, PaperPlaneTilt, Paperclip, DotsThreeVertical, Check, Checks, Info, Image, Smiley, ArrowLeft, X, House, Envelope, Archive, BellSlash, Flag } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useOnboardingStatus } from '@/lib/hooks/use-onboarding-status';
import { CompleteProfileFirst } from '@/components/tenant/CompleteProfileFirst';
import { EmptyState } from '@/components/ui/empty-state';
import { useConversations, useChat } from '@/lib/hooks/useMessages';
import type { ChatConversation } from '@/lib/api/messages.types';

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
    <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
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
            'h-12 rounded-2xl',
            i % 2 === 0
              ? 'w-3/5 bg-neutral-200 dark:bg-neutral-700 rounded-bl-md'
              : 'w-2/5 bg-indigo-100 dark:bg-indigo-900/30 rounded-br-md'
          )} />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export default function MensajesPage() {
  const { t, locale } = useI18n();
  const { isComplete: isOnboardingComplete, isLoading: isOnboardingLoading } = useOnboardingStatus();
  const { conversations, totalUnread, isLoading: isLoadingConversations, refetch: refetchConversations } = useConversations();

  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showOptionsList, setShowOptionsList] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionsListRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading: isLoadingMessages, isSending, sendMessage, markAsRead } = useChat(selectedApplicationId);

  // Auto-select first conversation
  useEffect(() => {
    if (!selectedApplicationId && conversations.length > 0) {
      setSelectedApplicationId(conversations[0].applicationId);
    }
  }, [conversations, selectedApplicationId]);

  const selectedConversation: ChatConversation | undefined = conversations.find(
    (c) => c.applicationId === selectedApplicationId,
  );

  const filteredConversations = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.property.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Close options menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        optionsListRef.current &&
        !optionsListRef.current.contains(event.target as Node)
      ) {
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

  const handleArchive = () => {
    setShowOptionsList(false);
    alert(locale === 'es'
      ? `Conversacion con ${selectedConversation?.name} archivada`
      : `Conversation with ${selectedConversation?.name} archived`);
  };

  const handleMute = () => {
    setShowOptionsList(false);
    alert(locale === 'es'
      ? `Notificaciones de ${selectedConversation?.name} silenciadas`
      : `Notifications from ${selectedConversation?.name} muted`);
  };

  const handleReport = () => {
    setShowOptionsList(false);
    alert(locale === 'es' ? 'Conversacion reportada' : 'Conversation reported');
  };

  // Loading state
  if (isOnboardingLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0f0f10] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show "complete profile first" if onboarding not done
  if (!isOnboardingComplete) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0f0f10]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <CompleteProfileFirst context="messages" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] bg-white dark:bg-[#0f0f10] overflow-hidden flex flex-col">
      <div className="flex-1 flex flex-col max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full overflow-hidden">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex-shrink-0"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-medium text-neutral-900 dark:text-white tracking-tight">
                {t('messages.title')}
              </h1>
              <p className="mt-1 text-neutral-500 dark:text-neutral-400">
                {t('messages.subtitle')}
              </p>
            </div>
            {totalUnread > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-full">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
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
          className="rounded-3xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] overflow-hidden shadow-sm flex-1 min-h-0"
        >
          <div className="h-full flex">
            {/* Conversations List */}
            <div
              className={cn(
                'w-full md:w-80 lg:w-96 border-r border-neutral-100 dark:border-neutral-700 flex flex-col bg-stone-50/50 dark:bg-[#0f0f10]/50',
                showMobileChat && 'hidden md:flex',
              )}
            >
              {/* Search Header */}
              <div className="p-4 border-b border-neutral-100 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
                <div className="relative">
                  <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={locale === 'es' ? 'Buscar conversacion...' : 'Search conversation...'}
                    aria-label={locale === 'es' ? 'Buscar conversacion' : 'Search conversation'}
                    className="w-full h-11 pl-11 pr-4 bg-stone-100 dark:bg-[#2a2a2c] text-neutral-900 dark:text-white rounded-full text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Conversations */}
              <div className="flex-1 overflow-y-auto">
                {isLoadingConversations ? (
                  <ConversationsSkeleton />
                ) : filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div className="w-14 h-14 rounded-full bg-stone-100 dark:bg-[#2a2a2c] flex items-center justify-center mb-4">
                      <Chat className="w-6 h-6 text-neutral-400" />
                    </div>
                    <p className="font-medium text-neutral-900 dark:text-white mb-1">
                      {locale === 'es' ? 'Sin conversaciones' : 'No conversations'}
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {searchQuery
                        ? (locale === 'es' ? 'No se encontraron conversaciones' : 'No conversations found')
                        : (locale === 'es' ? 'Cuando te comuniques con propietarios, tus conversaciones apareceran aqui.' : 'When you communicate with landlords, your conversations will appear here.')}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
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
                            ? 'bg-white dark:bg-[#1a1a1c] border-l-2 border-l-indigo-500'
                            : 'hover:bg-white/80 dark:hover:bg-[#1a1a1c]/80',
                        )}
                      >
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/50 dark:to-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold text-sm overflow-hidden">
                            {getInitials(conversation.name)}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <p
                              className={cn(
                                'truncate text-sm',
                                conversation.unreadCount > 0
                                  ? 'font-semibold text-neutral-900 dark:text-white'
                                  : 'font-medium text-neutral-900 dark:text-white',
                              )}
                            >
                              {conversation.name}
                            </p>
                            <span className="text-xs text-neutral-400 flex-shrink-0 ml-2">
                              {conversation.lastMessageTime}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mb-1">
                            {conversation.property
                              ? `${conversation.role} · ${conversation.property}`
                              : conversation.role}
                          </p>
                          <p
                            className={cn(
                              'text-sm truncate',
                              conversation.unreadCount > 0
                                ? 'text-neutral-900 dark:text-white font-medium'
                                : 'text-neutral-500 dark:text-neutral-400',
                            )}
                          >
                            {conversation.lastMessage}
                          </p>
                        </div>

                        {conversation.unreadCount > 0 && (
                          <span className="w-5 h-5 bg-indigo-500 text-white text-xs font-semibold rounded-full flex items-center justify-center flex-shrink-0">
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
                'flex-1 flex flex-col bg-white dark:bg-[#1a1a1c]',
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
                  <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-700">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setShowMobileChat(false)}
                        className="md:hidden p-2 -ml-2 rounded-full hover:bg-stone-100 dark:hover:bg-[#2a2a2c] text-neutral-600 dark:text-neutral-400"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/50 dark:to-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
                        {getInitials(selectedConversation.name)}
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-900 dark:text-white">
                          {selectedConversation.name}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {selectedConversation.role}
                          {selectedConversation.property &&
                            ` · ${selectedConversation.property}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setShowInfoPanel(!showInfoPanel)}
                        className={cn(
                          'p-2.5 rounded-full transition-colors',
                          showInfoPanel
                            ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                            : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-stone-100 dark:hover:bg-[#2a2a2c]',
                        )}
                        aria-label={locale === 'es' ? 'Informacion' : 'Information'}
                      >
                        <Info className="w-5 h-5" />
                      </button>

                      <div className="relative" ref={optionsListRef}>
                        <button
                          onClick={() => setShowOptionsList(!showOptionsList)}
                          className={cn(
                            'p-2.5 rounded-full transition-colors',
                            showOptionsList
                              ? 'bg-stone-100 dark:bg-[#2a2a2c] text-neutral-700 dark:text-neutral-300'
                              : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-stone-100 dark:hover:bg-[#2a2a2c]',
                          )}
                          aria-label={locale === 'es' ? 'Mas opciones' : 'More options'}
                        >
                          <DotsThreeVertical className="w-5 h-5" />
                        </button>

                        <AnimatePresence>
                          {showOptionsList && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              transition={{ duration: 0.15 }}
                              className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-[#1a1a1c] rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 py-2 z-50"
                            >
                              <button
                                onClick={handleArchive}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-stone-50 dark:hover:bg-[#2a2a2c] transition-colors"
                              >
                                <Archive className="w-4 h-4 text-neutral-400" />
                                {locale === 'es' ? 'Archivar conversacion' : 'Archive conversation'}
                              </button>
                              <button
                                onClick={handleMute}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-stone-50 dark:hover:bg-[#2a2a2c] transition-colors"
                              >
                                <BellSlash className="w-4 h-4 text-neutral-400" />
                                {locale === 'es' ? 'Silenciar notificaciones' : 'Mute notifications'}
                              </button>
                              <button
                                onClick={handleReport}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-stone-50 dark:hover:bg-[#2a2a2c] transition-colors"
                              >
                                <Flag className="w-4 h-4 text-neutral-400" />
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
                    <div
                      className={cn(
                        'flex-1 flex flex-col',
                        showInfoPanel && 'hidden lg:flex',
                      )}
                    >
                      <div className="flex-1 overflow-y-auto p-6 bg-stone-50/50 dark:bg-[#0f0f10]/50">
                        {isLoadingMessages ? (
                          <MessagesSkeleton />
                        ) : messages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                            <div className="w-14 h-14 rounded-full bg-white dark:bg-[#2a2a2c] flex items-center justify-center mb-4 shadow-sm border border-neutral-100 dark:border-neutral-700">
                              <ChatCircle className="w-6 h-6 text-neutral-400" />
                            </div>
                            <p className="font-medium text-neutral-900 dark:text-white mb-1">
                              {locale === 'es' ? 'Sin mensajes' : 'No messages'}
                            </p>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-xs">
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
                                  className={cn(
                                    'flex',
                                    message.isMine ? 'justify-end' : 'justify-start',
                                  )}
                                >
                                  <div
                                    className={cn(
                                      'max-w-[75%] px-4 py-3 rounded-2xl',
                                      message.isMine
                                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100 border border-indigo-200 dark:border-indigo-800/50 rounded-br-md'
                                        : 'bg-white dark:bg-[#2a2a2c] text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 rounded-bl-md shadow-sm',
                                    )}
                                  >
                                    <p className="text-sm leading-relaxed">{message.content}</p>
                                    <div
                                      className={cn(
                                        'flex items-center justify-end gap-1.5 mt-1.5',
                                        message.isMine
                                          ? 'text-indigo-500 dark:text-indigo-400'
                                          : 'text-neutral-400',
                                      )}
                                    >
                                      <span className="text-[11px]">
                                        {formatMessageTime(message.createdAt)}
                                      </span>
                                      {message.isMine &&
                                        (message.readAt ? (
                                          <Checks className="w-3.5 h-3.5 text-indigo-200" />
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
                      <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <button
                              className="p-2.5 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-stone-100 dark:hover:bg-[#2a2a2c] transition-colors"
                              aria-label={locale === 'es' ? 'Adjuntar archivo' : 'Attach file'}
                            >
                              <Paperclip className="w-5 h-5" />
                            </button>
                            <button
                              className="p-2.5 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-stone-100 dark:hover:bg-[#2a2a2c] transition-colors"
                              aria-label={locale === 'es' ? 'Enviar imagen' : 'Send image'}
                            >
                              <Image className="w-5 h-5" />
                            </button>
                          </div>
                          <div className="flex-1 relative">
                            <input
                              ref={inputRef}
                              type="text"
                              value={messageText}
                              onChange={(e) => setMessageText(e.target.value)}
                              onKeyDown={(e) =>
                                e.key === 'Enter' && handleSendMessage()
                              }
                              placeholder={locale === 'es' ? 'Escribe un mensaje...' : 'Type a message...'}
                              aria-label={locale === 'es' ? 'Escribe un mensaje' : 'Type a message'}
                              className="w-full h-12 pl-5 pr-12 bg-stone-100 dark:bg-[#2a2a2c] text-neutral-900 dark:text-white rounded-full text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            />
                            <button
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                              aria-label="Emoji"
                            >
                              <Smiley className="w-5 h-5" />
                            </button>
                          </div>
                          <button
                            onClick={handleSendMessage}
                            disabled={!messageText.trim() || isSending}
                            aria-label={locale === 'es' ? 'Enviar mensaje' : 'Send message'}
                            className={cn(
                              'p-3 rounded-full transition-all',
                              messageText.trim() && !isSending
                                ? 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-lg shadow-indigo-500/25'
                                : 'bg-stone-100 dark:bg-[#2a2a2c] text-neutral-300 dark:text-neutral-600 cursor-not-allowed',
                            )}
                          >
                            <PaperPlaneTilt className="w-5 h-5" />
                          </button>
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
                          className="w-full lg:w-80 border-l border-neutral-100 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] overflow-y-auto"
                        >
                          {/* Panel Header */}
                          <div className="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-neutral-700">
                            <h3 className="font-semibold text-neutral-900 dark:text-white">
                              {locale === 'es' ? 'Informacion' : 'Information'}
                            </h3>
                            <button
                              onClick={() => setShowInfoPanel(false)}
                              className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-[#2a2a2c] text-neutral-500 dark:text-neutral-400 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Contact Info */}
                          <div className="p-6">
                            <div className="text-center mb-6">
                              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/50 dark:to-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-2xl mx-auto mb-3">
                                {getInitials(selectedConversation.name)}
                              </div>
                              <h4 className="font-semibold text-neutral-900 dark:text-white text-lg">
                                {selectedConversation.name}
                              </h4>
                              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                {selectedConversation.role}
                              </p>
                            </div>

                            <div className="space-y-4">
                              {selectedConversation.property && (
                                <div className="flex items-start gap-3 p-3 bg-stone-50 dark:bg-[#2a2a2c] rounded-xl">
                                  <div className="w-9 h-9 rounded-lg bg-white dark:bg-[#1a1a1c] flex items-center justify-center shadow-sm">
                                    <House className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-0.5">
                                      {locale === 'es' ? 'Propiedad' : 'Property'}
                                    </p>
                                    <p className="text-sm font-medium text-neutral-900 dark:text-white">
                                      {selectedConversation.property}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {selectedConversation.email && (
                                <div className="flex items-start gap-3 p-3 bg-stone-50 dark:bg-[#2a2a2c] rounded-xl">
                                  <div className="w-9 h-9 rounded-lg bg-white dark:bg-[#1a1a1c] flex items-center justify-center shadow-sm">
                                    <Envelope className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-0.5">
                                      {locale === 'es' ? 'Correo' : 'Email'}
                                    </p>
                                    <p className="text-sm font-medium text-neutral-900 dark:text-white">
                                      {selectedConversation.email}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Quick Actions */}
                            <div className="mt-6 pt-6 border-t border-neutral-100 dark:border-neutral-700">
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">
                                {locale === 'es' ? 'Acciones rapidas' : 'Quick actions'}
                              </p>
                              <div className="space-y-2">
                                <button
                                  onClick={handleMute}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-stone-50 dark:hover:bg-[#2a2a2c] rounded-xl transition-colors"
                                >
                                  <BellSlash className="w-4 h-4 text-neutral-400" />
                                  {locale === 'es' ? 'Silenciar notificaciones' : 'Mute notifications'}
                                </button>
                                <button
                                  onClick={handleArchive}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-stone-50 dark:hover:bg-[#2a2a2c] rounded-xl transition-colors"
                                >
                                  <Archive className="w-4 h-4 text-neutral-400" />
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
