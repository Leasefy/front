'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';
import { Chat, ChatCircle, MagnifyingGlass, PaperPlaneTilt, Paperclip, DotsThreeVertical, Check, Checks, Info, Image, Smiley, ArrowLeft, X, House, Envelope, Calendar, Archive, BellSlash, TrashSimple, Flag, Buildings } from '@phosphor-icons/react';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface Message {
  id: string;
  senderId: 'me' | 'other';
  content: string;
  timestamp: string;
  read: boolean;
}

interface Conversation {
  id: string;
  name: string;
  avatar: string;
  role: string;
  property: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  online: boolean;
  email?: string;
  memberSince?: string;
}

// ============================================================================
// Mock Data (Agency perspective - communicating with owners, tenants, etc.)
// ============================================================================

const initialConversations: Conversation[] = [
  {
    id: 'conv-1',
    name: 'Carlos Mendoza',
    avatar: '/images/avatars/avatar-1.jpg',
    role: 'Propietario',
    property: 'Apartamento Chapinero Alto',
    lastMessage: 'Perfecto, entonces quedamos así para la firma del contrato.',
    timestamp: '10:30',
    unread: 2,
    online: true,
    email: 'carlos.mendoza@email.com',
    memberSince: 'Enero 2024',
  },
  {
    id: 'conv-2',
    name: 'María García',
    avatar: '/images/avatars/avatar-2.jpg',
    role: 'Inquilino',
    property: 'Casa en Usaquen',
    lastMessage: 'Ya realicé la transferencia del arriendo de este mes.',
    timestamp: 'Ayer',
    unread: 0,
    online: false,
    email: 'maria.garcia@email.com',
    memberSince: 'Marzo 2024',
  },
  {
    id: 'conv-3',
    name: 'Ana Sofia Lopez',
    avatar: '/images/avatars/avatar-3.jpg',
    role: 'Candidato',
    property: 'Estudio Teusaquillo',
    lastMessage: 'Buenos días, ¿podríamos agendar una visita para esta semana?',
    timestamp: 'Ayer',
    unread: 1,
    online: true,
    email: 'ana.lopez@email.com',
    memberSince: 'Febrero 2026',
  },
  {
    id: 'conv-4',
    name: 'Juan Martínez',
    avatar: '/images/avatars/avatar-4.jpg',
    role: 'Propietario',
    property: 'Penthouse Rosales',
    lastMessage: 'Adjunto los documentos de la propiedad que me solicitó.',
    timestamp: 'Lun',
    unread: 1,
    online: false,
    email: 'juan.martinez@email.com',
    memberSince: 'Diciembre 2023',
  },
  {
    id: 'conv-5',
    name: 'Servicios Técnicos',
    avatar: '/images/avatars/avatar-5.jpg',
    role: 'Proveedor',
    property: 'Múltiples propiedades',
    lastMessage: 'La reparación en Chapinero quedó completada.',
    timestamp: 'Dom',
    unread: 0,
    online: true,
    email: 'servicios@tecnicospro.co',
    memberSince: 'Aliado desde 2023',
  },
  {
    id: 'conv-6',
    name: 'Soporte Leasefy',
    avatar: '/images/avatars/avatar-6.jpg',
    role: 'Sistema',
    property: '',
    lastMessage: 'Su suscripción ha sido renovada exitosamente.',
    timestamp: 'Dom',
    unread: 0,
    online: true,
    email: 'soporte@leasefy.co',
    memberSince: 'Siempre disponible',
  },
];

const initialMessages: Record<string, Message[]> = {
  'conv-1': [
    { id: 'msg-1', senderId: 'other', content: 'Buenos días, quería consultarles sobre el estado del arriendo de mi apartamento.', timestamp: '09:15', read: true },
    { id: 'msg-2', senderId: 'me', content: 'Buenos días Don Carlos! El inquilino está al día con todos los pagos. El próximo arriendo vence el día 5.', timestamp: '09:20', read: true },
    { id: 'msg-3', senderId: 'other', content: 'Excelente, y ¿cómo va el proceso del nuevo candidato para el apartamento de la 85?', timestamp: '09:22', read: true },
    { id: 'msg-4', senderId: 'me', content: 'Ya tiene toda la documentación lista y pasó la verificación de antecedentes. Podemos agendar la firma del contrato.', timestamp: '09:25', read: true },
    { id: 'msg-5', senderId: 'other', content: '¿Qué día tendría disponible para la firma?', timestamp: '09:30', read: true },
    { id: 'msg-6', senderId: 'me', content: 'Tenemos disponibilidad el jueves a las 4pm o el viernes a las 10am. ¿Cuál le conviene más?', timestamp: '09:32', read: true },
    { id: 'msg-7', senderId: 'other', content: 'El jueves a las 4pm me queda perfecto.', timestamp: '09:35', read: true },
    { id: 'msg-8', senderId: 'me', content: 'Perfecto, queda agendada la firma para el jueves 30 de enero a las 4pm en nuestra oficina.', timestamp: '09:40', read: true },
    { id: 'msg-9', senderId: 'other', content: 'Muchas gracias por la gestión. Ahí estaré puntual.', timestamp: '10:15', read: true },
    { id: 'msg-10', senderId: 'other', content: 'Perfecto, entonces quedamos así para la firma del contrato.', timestamp: '10:30', read: false },
  ],
  'conv-2': [
    { id: 'mg-1', senderId: 'other', content: 'Hola, quería informarles que ya realicé el pago del arriendo de este mes.', timestamp: '14:00', read: true },
    { id: 'mg-2', senderId: 'me', content: 'Gracias María, verificamos el pago y todo está en orden. Le enviaremos el recibo por correo.', timestamp: '14:15', read: true },
    { id: 'mg-3', senderId: 'other', content: 'Ya realicé la transferencia del arriendo de este mes.', timestamp: '09:10', read: true },
  ],
  'conv-3': [
    { id: 'al-1', senderId: 'other', content: 'Hola, vi la publicación del estudio en Teusaquillo y me interesa mucho.', timestamp: '11:00', read: true },
    { id: 'al-2', senderId: 'me', content: 'Hola Ana Sofía, gracias por tu interés. El estudio está disponible, ¿te gustaría agendar una visita?', timestamp: '11:30', read: true },
    { id: 'al-3', senderId: 'other', content: 'Buenos días, ¿podríamos agendar una visita para esta semana?', timestamp: '15:00', read: false },
  ],
  'conv-4': [
    { id: 'jm-1', senderId: 'other', content: 'Buenas tardes, les envío los documentos actualizados del penthouse.', timestamp: '10:00', read: true },
    { id: 'jm-2', senderId: 'me', content: 'Buenas tardes Don Juan, muchas gracias. Los revisaremos y actualizaremos el expediente.', timestamp: '10:30', read: true },
    { id: 'jm-3', senderId: 'other', content: 'Adjunto los documentos de la propiedad que me solicitó.', timestamp: '16:00', read: false },
  ],
  'conv-5': [
    { id: 'st-1', senderId: 'other', content: 'Buenos días, ya terminamos la inspección del apartamento en Chapinero.', timestamp: '09:00', read: true },
    { id: 'st-2', senderId: 'me', content: 'Perfecto, ¿cuál fue el resultado?', timestamp: '09:30', read: true },
    { id: 'st-3', senderId: 'other', content: 'La reparación en Chapinero quedó completada.', timestamp: '14:00', read: true },
  ],
  'conv-6': [
    { id: 'sa-1', senderId: 'other', content: 'Bienvenido a Leasefy. Su cuenta empresarial ha sido activada.', timestamp: '09:00', read: true },
    { id: 'sa-2', senderId: 'other', content: 'Su suscripción ha sido renovada exitosamente.', timestamp: '10:00', read: true },
  ],
};

const autoReplies: Record<string, string[]> = {
  'conv-1': [
    'Perfecto, quedo atento.',
    '¿A qué hora sería la cita?',
    'Entendido, muchas gracias por la información.',
    'Listo, nos vemos entonces.',
  ],
  'conv-2': [
    'Gracias, quedo pendiente del recibo.',
    'Perfecto, cualquier cosa les aviso.',
    'Entendido.',
    'Muchas gracias.',
  ],
  'conv-3': [
    'Genial, ¿qué días tienen disponibles?',
    'Me queda bien en la tarde.',
    'Gracias, ahí estaré.',
    '¿Necesito llevar algún documento?',
  ],
  'conv-4': [
    'Claro, los subo de inmediato.',
    '¿Falta algún documento adicional?',
    'Entendido, quedo pendiente de su respuesta.',
    'Muchas gracias.',
  ],
  'conv-5': [
    'Listo, procedemos con la siguiente propiedad.',
    'Gracias por confirmar.',
    'Perfecto, enviamos el reporte al propietario.',
    'Entendido.',
  ],
  'conv-6': [],
};

function getTimeNow(): string {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ============================================================================
// Component
// ============================================================================

export default function MensajesPage() {
  const { t } = useI18n();
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selectedId, setSelectedId] = useState('conv-1');
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(initialMessages);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyCounters, setReplyCounters] = useState<Record<string, number>>({});
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showOptionsList, setShowOptionsList] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionsListRef = useRef<HTMLDivElement>(null);

  const selectedConversation = conversations.find((c) => c.id === selectedId)!;
  const messages = messagesMap[selectedId] || [];

  const filteredConversations = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.property.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

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

  const handleSelectConversation = useCallback((id: string) => {
    setSelectedId(id);
    setShowMobileChat(true);
    setShowInfoPanel(false);
    setShowOptionsList(false);
    setMessagesMap((prev) => {
      const msgs = prev[id];
      if (!msgs) return prev;
      return {
        ...prev,
        [id]: msgs.map((m) =>
          m.senderId === 'other' ? { ...m, read: true } : m
        ),
      };
    });
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c))
    );
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSendMessage = useCallback(() => {
    const text = messageText.trim();
    if (!text) return;

    const now = getTimeNow();
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      senderId: 'me',
      content: text,
      timestamp: now,
      read: false,
    };

    setMessagesMap((prev) => ({
      ...prev,
      [selectedId]: [...(prev[selectedId] || []), newMsg],
    }));

    setConversations((prev) => {
      const updated = prev.map((c) =>
        c.id === selectedId ? { ...c, lastMessage: text, timestamp: now } : c
      );
      const target = updated.find((c) => c.id === selectedId)!;
      return [target, ...updated.filter((c) => c.id !== selectedId)];
    });

    setMessageText('');

    const replies = autoReplies[selectedId];
    if (replies && replies.length > 0) {
      const idx = (replyCounters[selectedId] || 0) % replies.length;
      const replyText = replies[idx];
      setReplyCounters((prev) => ({ ...prev, [selectedId]: idx + 1 }));

      const delay = 1000 + Math.random() * 2000;
      setTimeout(() => {
        const replyTime = getTimeNow();
        const replyMsg: Message = {
          id: `reply-${Date.now()}`,
          senderId: 'other',
          content: replyText,
          timestamp: replyTime,
          read: true,
        };

        setMessagesMap((prev) => ({
          ...prev,
          [selectedId]: [...(prev[selectedId] || []), replyMsg],
        }));

        setConversations((prev) => {
          const updated = prev.map((c) =>
            c.id === selectedId
              ? { ...c, lastMessage: replyText, timestamp: replyTime }
              : c
          );
          const target = updated.find((c) => c.id === selectedId)!;
          return [target, ...updated.filter((c) => c.id !== selectedId)];
        });

        setMessagesMap((prev) => ({
          ...prev,
          [selectedId]: (prev[selectedId] || []).map((m) =>
            m.senderId === 'me' ? { ...m, read: true } : m
          ),
        }));
      }, delay);
    }
  }, [messageText, selectedId, replyCounters]);

  // List Actions
  const handleArchive = () => {
    setShowOptionsList(false);
    alert(`Conversación con ${selectedConversation.name} archivada`);
  };

  const handleMute = () => {
    setShowOptionsList(false);
    alert(`Notificaciones de ${selectedConversation.name} silenciadas`);
  };

  const handleReport = () => {
    setShowOptionsList(false);
    alert('Conversación reportada');
  };

  const handleDelete = () => {
    setShowOptionsList(false);
    if (confirm(`¿Eliminar conversación con ${selectedConversation.name}?`)) {
      setConversations((prev) => prev.filter((c) => c.id !== selectedId));
      const remaining = conversations.filter((c) => c.id !== selectedId);
      if (remaining.length > 0) {
        setSelectedId(remaining[0].id);
      }
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] bg-stone-50 dark:bg-[#0f0f10] overflow-hidden flex flex-col">
      <div className="flex-1 flex flex-col max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full overflow-hidden">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex-shrink-0"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <Chat className="w-5 h-5 text-indigo-600 dark:text-indigo-400" weight="duotone" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
                  {t('inmobiliaria.mensajes.title')}
                </h1>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {t('inmobiliaria.mensajes.subtitle')}
                </p>
              </div>
            </div>
            {totalUnread > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-full">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                  {t('inmobiliaria.mensajes.unreadCount', { count: totalUnread })}
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
          className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] overflow-hidden shadow-sm flex-1 min-h-0"
        >
          <div className="h-full flex">
            {/* Conversations List */}
            <div
              className={cn(
                'w-full md:w-80 lg:w-96 border-r border-neutral-100 dark:border-neutral-700 flex flex-col bg-stone-50/50 dark:bg-[#0f0f10]/50',
                showMobileChat && 'hidden md:flex'
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
                    placeholder={t('inmobiliaria.mensajes.search')}
                    aria-label={t('inmobiliaria.mensajes.search')}
                    className="w-full h-11 pl-11 pr-4 bg-stone-100 dark:bg-[#2a2a2c] text-neutral-900 dark:text-white rounded-full text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Conversations */}
              <div className="flex-1 overflow-y-auto">
                {filteredConversations.length === 0 ? (
                  <div className="p-4">
                    <EmptyState
                      icon={ChatCircle}
                      title={t('inmobiliaria.mensajes.noConversations')}
                      description={
                        searchQuery
                          ? t('inmobiliaria.mensajes.noConversationsSearch')
                          : t('inmobiliaria.mensajes.noMessagesDesc')
                      }
                    />
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
                    {filteredConversations.map((conversation, index) => (
                      <motion.button
                        key={conversation.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleSelectConversation(conversation.id)}
                        className={cn(
                          'w-full flex items-start gap-3 px-4 py-4 text-left transition-all',
                          selectedId === conversation.id
                            ? 'bg-white dark:bg-[#1a1a1c] border-l-2 border-l-indigo-500'
                            : 'hover:bg-white/80 dark:hover:bg-[#1a1a1c]/80'
                        )}
                      >
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/50 dark:to-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold text-sm overflow-hidden">
                            {getInitials(conversation.name)}
                          </div>
                          {conversation.online && (
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-[#1a1a1c] rounded-full" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <p
                              className={cn(
                                'truncate text-sm',
                                conversation.unread > 0
                                  ? 'font-semibold text-neutral-900 dark:text-white'
                                  : 'font-medium text-neutral-900 dark:text-white'
                              )}
                            >
                              {conversation.name}
                            </p>
                            <span className="text-xs text-neutral-400 flex-shrink-0 ml-2">
                              {conversation.timestamp}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mb-1">
                            {conversation.property
                              ? `${conversation.role} • ${conversation.property}`
                              : conversation.role}
                          </p>
                          <p
                            className={cn(
                              'text-sm truncate',
                              conversation.unread > 0
                                ? 'text-neutral-900 dark:text-white font-medium'
                                : 'text-neutral-500 dark:text-neutral-400'
                            )}
                          >
                            {conversation.lastMessage}
                          </p>
                        </div>

                        {conversation.unread > 0 && (
                          <span className="w-5 h-5 bg-indigo-500 text-white text-xs font-semibold rounded-full flex items-center justify-center flex-shrink-0">
                            {conversation.unread}
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
                !showMobileChat && 'hidden md:flex'
              )}
            >
              {/* Chat Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-700">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowMobileChat(false)}
                    className="md:hidden p-2 -ml-2 rounded-full hover:bg-stone-100 dark:hover:bg-[#2a2a2c] text-neutral-600 dark:text-neutral-400"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="relative">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/50 dark:to-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
                      {getInitials(selectedConversation.name)}
                    </div>
                    {selectedConversation.online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-[#1a1a1c] rounded-full" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">
                      {selectedConversation.name}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {selectedConversation.online ? (
                        <span className="text-emerald-600 dark:text-emerald-400">{t('inmobiliaria.mensajes.online')}</span>
                      ) : (
                        t('inmobiliaria.mensajes.offline')
                      )}
                      {selectedConversation.property &&
                        ` • ${selectedConversation.property}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {/* Info Button */}
                  <button
                    onClick={() => setShowInfoPanel(!showInfoPanel)}
                    className={cn(
                      'p-2.5 rounded-full transition-colors',
                      showInfoPanel
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-stone-100 dark:hover:bg-[#2a2a2c]'
                    )}
                    aria-label={t('inmobiliaria.mensajes.information')}
                  >
                    <Info className="w-5 h-5" />
                  </button>

                  {/* More Options Button */}
                  <div className="relative" ref={optionsListRef}>
                    <button
                      onClick={() => setShowOptionsList(!showOptionsList)}
                      className={cn(
                        'p-2.5 rounded-full transition-colors',
                        showOptionsList
                          ? 'bg-stone-100 dark:bg-[#2a2a2c] text-neutral-700 dark:text-neutral-300'
                          : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-stone-100 dark:hover:bg-[#2a2a2c]'
                      )}
                      aria-label={t('inmobiliaria.mensajes.moreOptions')}
                    >
                      <DotsThreeVertical className="w-5 h-5" />
                    </button>

                    {/* Options Dropdown */}
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
                            {t('inmobiliaria.mensajes.archiveConversation')}
                          </button>
                          <button
                            onClick={handleMute}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-stone-50 dark:hover:bg-[#2a2a2c] transition-colors"
                          >
                            <BellSlash className="w-4 h-4 text-neutral-400" />
                            {t('inmobiliaria.mensajes.muteNotifications')}
                          </button>
                          <button
                            onClick={handleReport}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-stone-50 dark:hover:bg-[#2a2a2c] transition-colors"
                          >
                            <Flag className="w-4 h-4 text-neutral-400" />
                            {t('inmobiliaria.mensajes.report')}
                          </button>
                          <div className="h-px bg-neutral-100 dark:bg-neutral-700 my-2" />
                          <button
                            onClick={handleDelete}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <TrashSimple className="w-4 h-4" />
                            {t('inmobiliaria.mensajes.deleteConversation')}
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
                    showInfoPanel && 'hidden lg:flex'
                  )}
                >
                  <div className="flex-1 overflow-y-auto p-6 bg-stone-50/50 dark:bg-[#0f0f10]/50">
                    {messages.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <EmptyState
                          icon={ChatCircle}
                          title={t('inmobiliaria.mensajes.noMessages')}
                          description={t('inmobiliaria.mensajes.noMessagesConversation')}
                        />
                      </div>
                    ) : (
                      <>
                        {/* Date Separator */}
                        <div className="flex items-center justify-center mb-6">
                          <span className="px-4 py-1.5 bg-white dark:bg-[#2a2a2c] text-xs text-neutral-500 dark:text-neutral-400 rounded-full shadow-sm border border-neutral-100 dark:border-neutral-700">
                            {t('common.today')}
                          </span>
                        </div>

                        {/* Messages */}
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
                                  message.senderId === 'me'
                                    ? 'justify-end'
                                    : 'justify-start'
                                )}
                              >
                                <div
                                  className={cn(
                                    'max-w-[75%] px-4 py-3 rounded-2xl',
                                    message.senderId === 'me'
                                      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100 border border-indigo-200 dark:border-indigo-800/50 rounded-br-md'
                                      : 'bg-white dark:bg-[#2a2a2c] text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 rounded-bl-md shadow-sm'
                                  )}
                                >
                                  <p className="text-sm leading-relaxed">
                                    {message.content}
                                  </p>
                                  <div
                                    className={cn(
                                      'flex items-center justify-end gap-1.5 mt-1.5',
                                      message.senderId === 'me'
                                        ? 'text-indigo-500 dark:text-indigo-400'
                                        : 'text-neutral-400'
                                    )}
                                  >
                                    <span className="text-[11px]">
                                      {message.timestamp}
                                    </span>
                                    {message.senderId === 'me' &&
                                      (message.read ? (
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
                      </>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <button
                          className="p-2.5 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-stone-100 dark:hover:bg-[#2a2a2c] transition-colors"
                          aria-label={t('inmobiliaria.mensajes.attachFile')}
                        >
                          <Paperclip className="w-5 h-5" />
                        </button>
                        <button
                          className="p-2.5 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-stone-100 dark:hover:bg-[#2a2a2c] transition-colors"
                          aria-label={t('inmobiliaria.mensajes.sendImage')}
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
                          placeholder={t('inmobiliaria.mensajes.typePlaceholder')}
                          aria-label={t('inmobiliaria.mensajes.typePlaceholder')}
                          className="w-full h-12 pl-5 pr-12 bg-stone-100 dark:bg-[#2a2a2c] text-neutral-900 dark:text-white rounded-full text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        />
                        <button
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                          aria-label={t('inmobiliaria.mensajes.emoji')}
                        >
                          <Smiley className="w-5 h-5" />
                        </button>
                      </div>
                      <button
                        onClick={handleSendMessage}
                        disabled={!messageText.trim()}
                        aria-label={t('inmobiliaria.mensajes.send')}
                        className={cn(
                          'p-3 rounded-full transition-all',
                          messageText.trim()
                            ? 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-lg shadow-indigo-500/25'
                            : 'bg-stone-100 dark:bg-[#2a2a2c] text-neutral-300 dark:text-neutral-600 cursor-not-allowed'
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
                          {t('inmobiliaria.mensajes.information')}
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
                        {/* Avatar & Name */}
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
                          {selectedConversation.online && (
                            <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium rounded-full">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                              {t('inmobiliaria.mensajes.online')}
                            </span>
                          )}
                        </div>

                        {/* Details */}
                        <div className="space-y-4">
                          {selectedConversation.property && (
                            <div className="flex items-start gap-3 p-3 bg-stone-50 dark:bg-[#2a2a2c] rounded-xl">
                              <div className="w-9 h-9 rounded-lg bg-white dark:bg-[#1a1a1c] flex items-center justify-center shadow-sm">
                                <Buildings className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                              </div>
                              <div>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-0.5">
                                  {t('inmobiliaria.mensajes.property')}
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
                                  {t('inmobiliaria.mensajes.email')}
                                </p>
                                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                                  {selectedConversation.email}
                                </p>
                              </div>
                            </div>
                          )}

                          {selectedConversation.memberSince && (
                            <div className="flex items-start gap-3 p-3 bg-stone-50 dark:bg-[#2a2a2c] rounded-xl">
                              <div className="w-9 h-9 rounded-lg bg-white dark:bg-[#1a1a1c] flex items-center justify-center shadow-sm">
                                <Calendar className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                              </div>
                              <div>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-0.5">
                                  {t('inmobiliaria.mensajes.memberSince')}
                                </p>
                                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                                  {selectedConversation.memberSince}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Quick Actions */}
                        <div className="mt-6 pt-6 border-t border-neutral-100 dark:border-neutral-700">
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">
                            {t('inmobiliaria.mensajes.quickActions')}
                          </p>
                          <div className="space-y-2">
                            <button
                              onClick={handleMute}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-stone-50 dark:hover:bg-[#2a2a2c] rounded-xl transition-colors"
                            >
                              <BellSlash className="w-4 h-4 text-neutral-400" />
                              {t('inmobiliaria.mensajes.muteNotifications')}
                            </button>
                            <button
                              onClick={handleArchive}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-stone-50 dark:hover:bg-[#2a2a2c] rounded-xl transition-colors"
                            >
                              <Archive className="w-4 h-4 text-neutral-400" />
                              {t('inmobiliaria.mensajes.archiveConversation')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
