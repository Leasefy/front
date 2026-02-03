'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Search,
  Send,
  Paperclip,
  MoreVertical,
  Check,
  CheckCheck,
  Phone,
  Video,
  Info,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/lib/context/SidebarContext';

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
}

// ============================================================================
// Mock Data
// ============================================================================

const initialConversations: Conversation[] = [
  {
    id: 'conv-1',
    name: 'Carlos Rodriguez',
    avatar: 'CR',
    role: 'Inquilino',
    property: 'Apartamento Chapinero Alto',
    lastMessage: 'Perfecto, entonces quedamos así para la firma del contrato.',
    timestamp: '10:30',
    unread: 2,
    online: true,
  },
  {
    id: 'conv-2',
    name: 'Maria Garcia',
    avatar: 'MG',
    role: 'Candidato',
    property: 'Casa en Usaquen',
    lastMessage: 'Buenos días, ¿podríamos agendar una visita para esta semana?',
    timestamp: 'Ayer',
    unread: 0,
    online: false,
  },
  {
    id: 'conv-3',
    name: 'Ana Sofia Lopez',
    avatar: 'AL',
    role: 'Inquilino',
    property: 'Estudio Teusaquillo',
    lastMessage: 'Ya realicé la transferencia del arriendo de este mes.',
    timestamp: 'Ayer',
    unread: 0,
    online: true,
  },
  {
    id: 'conv-4',
    name: 'Juan Martinez',
    avatar: 'JM',
    role: 'Candidato',
    property: 'Penthouse Rosales',
    lastMessage: 'Adjunto los documentos que me solicitó.',
    timestamp: 'Lun',
    unread: 1,
    online: false,
  },
  {
    id: 'conv-5',
    name: 'Soporte Arriendo',
    avatar: 'SA',
    role: 'Sistema',
    property: '',
    lastMessage: 'Su suscripción ha sido renovada exitosamente.',
    timestamp: 'Dom',
    unread: 0,
    online: true,
  },
];

const initialMessages: Record<string, Message[]> = {
  'conv-1': [
    { id: 'msg-1', senderId: 'other', content: 'Buenos días, me interesa mucho el apartamento en Chapinero Alto.', timestamp: '09:15', read: true },
    { id: 'msg-2', senderId: 'me', content: 'Buenos días Carlos! Claro, el apartamento está disponible. ¿Te gustaría agendar una visita?', timestamp: '09:20', read: true },
    { id: 'msg-3', senderId: 'other', content: 'Sí, me encantaría. ¿Tiene disponibilidad esta semana?', timestamp: '09:22', read: true },
    { id: 'msg-4', senderId: 'me', content: 'Tengo disponible el jueves a las 4pm o el viernes a las 10am. ¿Cuál te conviene más?', timestamp: '09:25', read: true },
    { id: 'msg-5', senderId: 'other', content: 'El jueves a las 4pm me queda perfecto.', timestamp: '09:30', read: true },
    { id: 'msg-6', senderId: 'me', content: 'Excelente, queda agendada la visita para el jueves 30 de enero a las 4pm. Te enviaré un recordatorio.', timestamp: '09:32', read: true },
    { id: 'msg-7', senderId: 'other', content: 'Muchas gracias! Ahí estaré puntual.', timestamp: '09:35', read: true },
    { id: 'msg-8', senderId: 'other', content: 'Por cierto, ya completé todos los documentos que me solicitó en la plataforma.', timestamp: '10:15', read: true },
    { id: 'msg-9', senderId: 'me', content: 'Perfecto, los revisaré hoy mismo y te confirmo si está todo en orden para proceder con el contrato.', timestamp: '10:20', read: true },
    { id: 'msg-10', senderId: 'other', content: 'Perfecto, entonces quedamos así para la firma del contrato.', timestamp: '10:30', read: false },
  ],
  'conv-2': [
    { id: 'mg-1', senderId: 'other', content: 'Hola, vi la publicación de la casa en Usaquen y me interesa mucho.', timestamp: '14:00', read: true },
    { id: 'mg-2', senderId: 'me', content: 'Hola Maria, gracias por tu interés. La casa está disponible, ¿te gustaría agendar una visita?', timestamp: '14:15', read: true },
    { id: 'mg-3', senderId: 'other', content: 'Buenos días, ¿podríamos agendar una visita para esta semana?', timestamp: '09:10', read: true },
  ],
  'conv-3': [
    { id: 'al-1', senderId: 'other', content: 'Hola, quería informarle que ya realicé el pago del arriendo de este mes.', timestamp: '11:00', read: true },
    { id: 'al-2', senderId: 'me', content: 'Gracias Ana Sofía, lo verifico y te confirmo.', timestamp: '11:30', read: true },
    { id: 'al-3', senderId: 'other', content: 'Ya realicé la transferencia del arriendo de este mes.', timestamp: '15:00', read: true },
  ],
  'conv-4': [
    { id: 'jm-1', senderId: 'other', content: 'Buenas tardes, estoy interesado en el penthouse en Rosales.', timestamp: '10:00', read: true },
    { id: 'jm-2', senderId: 'me', content: 'Buenas tardes Juan, claro. ¿Ya completaste tu aplicación en la plataforma?', timestamp: '10:30', read: true },
    { id: 'jm-3', senderId: 'other', content: 'Adjunto los documentos que me solicitó.', timestamp: '16:00', read: false },
  ],
  'conv-5': [
    { id: 'sa-1', senderId: 'other', content: 'Bienvenido a Arriendo. Su cuenta ha sido creada exitosamente.', timestamp: '09:00', read: true },
    { id: 'sa-2', senderId: 'other', content: 'Su suscripción ha sido renovada exitosamente.', timestamp: '10:00', read: true },
  ],
};

// Simulated auto-replies per conversation
const autoReplies: Record<string, string[]> = {
  'conv-1': [
    'Perfecto, quedo atento.',
    '¿A qué hora sería la firma?',
    'Entendido, muchas gracias por la información.',
    'Listo, nos vemos entonces.',
  ],
  'conv-2': [
    'Genial, ¿qué días tiene disponibles?',
    'Me queda bien en la tarde.',
    'Gracias, ahí estaré.',
    '¿Necesito llevar algún documento?',
  ],
  'conv-3': [
    'Perfecto, gracias por confirmar.',
    '¿Podría enviarme el comprobante?',
    'Entendido, quedo pendiente.',
    'Gracias por la pronta respuesta.',
  ],
  'conv-4': [
    'Claro, los subo de inmediato.',
    '¿Falta algún documento adicional?',
    'Entendido, quedo pendiente de su respuesta.',
    'Muchas gracias.',
  ],
  'conv-5': [],
};

function getTimeNow(): string {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

// ============================================================================
// Component
// ============================================================================

export default function MensajesPage() {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selectedId, setSelectedId] = useState('conv-1');
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(initialMessages);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyCounters, setReplyCounters] = useState<Record<string, number>>({});
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isCollapsed } = useSidebar();

  const selectedConversation = conversations.find(c => c.id === selectedId)!;
  const messages = messagesMap[selectedId] || [];

  const filteredConversations = conversations.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.property.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // Scroll to bottom instantly on conversation switch
  useEffect(() => {
    scrollToBottom('instant');
  }, [selectedId, scrollToBottom]);

  // Track scroll position for "scroll to bottom" button
  const handleMessagesScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 200);
  }, []);

  // Mark as read when selecting a conversation
  const handleSelectConversation = useCallback((id: string) => {
    setSelectedId(id);
    // Mark messages as read
    setMessagesMap(prev => {
      const msgs = prev[id];
      if (!msgs) return prev;
      return {
        ...prev,
        [id]: msgs.map(m => m.senderId === 'other' ? { ...m, read: true } : m),
      };
    });
    // Clear unread count
    setConversations(prev =>
      prev.map(c => c.id === id ? { ...c, unread: 0 } : c)
    );
    // Focus input
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Send message
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

    // Add message
    setMessagesMap(prev => ({
      ...prev,
      [selectedId]: [...(prev[selectedId] || []), newMsg],
    }));

    // Update conversation preview & move to top
    setConversations(prev => {
      const updated = prev.map(c =>
        c.id === selectedId
          ? { ...c, lastMessage: text, timestamp: now }
          : c
      );
      const target = updated.find(c => c.id === selectedId)!;
      return [target, ...updated.filter(c => c.id !== selectedId)];
    });

    setMessageText('');

    // Simulate auto-reply after 1-3s with typing indicator
    const replies = autoReplies[selectedId];
    if (replies && replies.length > 0) {
      const idx = (replyCounters[selectedId] || 0) % replies.length;
      const replyText = replies[idx];
      setReplyCounters(prev => ({ ...prev, [selectedId]: idx + 1 }));

      // Show typing indicator after a short pause
      const typingDelay = 500 + Math.random() * 500;
      setTimeout(() => setIsTyping(true), typingDelay);

      const delay = 1500 + Math.random() * 2000;
      setTimeout(() => {
        setIsTyping(false);
        const replyTime = getTimeNow();
        const replyMsg: Message = {
          id: `reply-${Date.now()}`,
          senderId: 'other',
          content: replyText,
          timestamp: replyTime,
          read: true,
        };

        setMessagesMap(prev => ({
          ...prev,
          [selectedId]: [...(prev[selectedId] || []), replyMsg],
        }));

        setConversations(prev => {
          const updated = prev.map(c =>
            c.id === selectedId
              ? { ...c, lastMessage: replyText, timestamp: replyTime }
              : c
          );
          const target = updated.find(c => c.id === selectedId)!;
          return [target, ...updated.filter(c => c.id !== selectedId)];
        });
        // Mark sent messages as read
        setMessagesMap(prev => ({
          ...prev,
          [selectedId]: (prev[selectedId] || []).map(m =>
            m.senderId === 'me' ? { ...m, read: true } : m
          ),
        }));
      }, delay);
    }
  }, [messageText, selectedId, replyCounters]);

  return (
    <div className="h-[calc(100vh-56px)] bg-plan-page overflow-hidden">
      <div className="h-full flex overflow-hidden">
        {/* Conversations List */}
        <div className="w-80 bg-card border-r border-plan-border flex flex-col">
          {/* Header */}
          <div className="px-4 py-4 border-b border-plan-border">
            <h2 className="text-lg font-semibold text-plan-primary mb-3">Mensajes</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-plan-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar conversación..."
                aria-label="Buscar conversación"
                className="w-full h-9 pl-10 pr-4 bg-muted border border-plan-border text-sm placeholder:text-plan-muted focus:outline-none focus:ring-1 focus:ring-plan-primary"
              />
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <MessageSquare className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-plan-primary mb-1">Sin conversaciones</p>
                <p className="text-xs text-plan-muted">
                  {searchQuery
                    ? 'No se encontraron conversaciones con ese término'
                    : 'Cuando tengas mensajes aparecerán aquí'}
                </p>
              </div>
            )}
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => handleSelectConversation(conversation.id)}
                className={cn(
                  'w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border',
                  selectedId === conversation.id && 'bg-muted'
                )}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 bg-muted flex items-center justify-center text-plan-secondary font-medium">
                    {conversation.avatar}
                  </div>
                  {conversation.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-plan-status-green border-2 border-white rounded-full" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={cn(
                      'truncate',
                      conversation.unread > 0 ? 'font-semibold text-plan-primary' : 'font-medium text-plan-primary'
                    )}>
                      {conversation.name}
                    </p>
                    <span className="text-xs text-plan-muted flex-shrink-0">
                      {conversation.timestamp}
                    </span>
                  </div>
                  {conversation.property && (
                    <p className="text-xs text-plan-secondary truncate">
                      {conversation.role} • {conversation.property}
                    </p>
                  )}
                  <p className={cn(
                    'text-sm truncate mt-0.5',
                    conversation.unread > 0 ? 'text-plan-primary font-medium' : 'text-plan-secondary'
                  )}>
                    {conversation.lastMessage}
                  </p>
                </div>

                {/* Unread Badge */}
                {conversation.unread > 0 && (
                  <span className="w-5 h-5 bg-primary text-white text-xs font-medium flex items-center justify-center flex-shrink-0">
                    {conversation.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-card min-h-0 relative">
          {/* Chat Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-plan-border">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-muted flex items-center justify-center text-plan-secondary font-medium">
                  {selectedConversation.avatar}
                </div>
                {selectedConversation.online && (
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-plan-status-green border-2 border-white rounded-full" />
                )}
              </div>
              <div>
                <p className="font-medium text-plan-primary">{selectedConversation.name}</p>
                <p className="text-xs text-plan-secondary">
                  {selectedConversation.online ? 'En línea' : 'Desconectado'}
                  {selectedConversation.property && ` • ${selectedConversation.property}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2 text-plan-secondary hover:text-plan-primary hover:bg-muted transition-colors" aria-label="Llamar">
                <Phone className="w-5 h-5" />
              </button>
              <button className="p-2 text-plan-secondary hover:text-plan-primary hover:bg-muted transition-colors" aria-label="Videollamada">
                <Video className="w-5 h-5" />
              </button>
              <button className="p-2 text-plan-secondary hover:text-plan-primary hover:bg-muted transition-colors" aria-label="Información">
                <Info className="w-5 h-5" />
              </button>
              <button className="p-2 text-plan-secondary hover:text-plan-primary hover:bg-muted transition-colors" aria-label="Más opciones">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={messagesContainerRef}
            onScroll={handleMessagesScroll}
            className="flex-1 overflow-y-auto p-6 space-y-4 bg-muted relative"
            data-lenis-prevent
            style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
          >
            {/* Date Separator */}
            <div className="flex items-center justify-center sticky top-0 z-10">
              <span className="px-3 py-1 bg-card text-xs text-plan-secondary border border-plan-border shadow-sm">
                Hoy
              </span>
            </div>

            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex',
                  message.senderId === 'me' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[70%] px-4 py-2',
                    message.senderId === 'me'
                      ? 'bg-primary text-white'
                      : 'bg-card text-plan-primary border border-plan-border'
                  )}
                >
                  <p className="text-sm">{message.content}</p>
                  <div className="flex items-center justify-end gap-1 mt-1 text-plan-muted">
                    <span className="text-[10px]">{message.timestamp}</span>
                    {message.senderId === 'me' && (
                      message.read ? (
                        <CheckCheck className="w-3 h-3 text-plan-accent" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-card border border-plan-border px-4 py-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-plan-muted rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-plan-muted rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-plan-muted rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to bottom button */}
          {showScrollBtn && (
            <div className="absolute bottom-20 right-8 z-10">
              <button
                onClick={() => scrollToBottom()}
                className="p-2 bg-card border border-plan-border shadow-md rounded-full text-plan-secondary hover:text-plan-primary transition-colors"
                aria-label="Ir al final"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Message Input */}
          <div className="px-6 py-4 border-t border-plan-border">
            <div className="flex items-center gap-3">
              <button className="p-2 text-plan-secondary hover:text-plan-primary transition-colors" aria-label="Adjuntar archivo">
                <Paperclip className="w-5 h-5" />
              </button>
              <input
                ref={inputRef}
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Escribe un mensaje..."
                aria-label="Escribe un mensaje"
                className="flex-1 h-10 px-4 bg-muted border border-plan-border text-sm placeholder:text-plan-muted focus:outline-none focus:ring-1 focus:ring-plan-primary"
              />
              <button
                onClick={handleSendMessage}
                disabled={!messageText.trim()}
                aria-label="Enviar mensaje"
                className={cn(
                  'p-2 transition-colors',
                  messageText.trim()
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : 'bg-muted text-plan-muted cursor-not-allowed'
                )}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
