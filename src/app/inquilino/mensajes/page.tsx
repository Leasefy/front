'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
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
} from 'lucide-react';
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
}

// ============================================================================
// Mock Data
// ============================================================================

const initialConversations: Conversation[] = [
  {
    id: 'conv-1',
    name: 'Carlos Mendoza',
    avatar: 'CM',
    role: 'Propietario',
    property: 'Departamento Providencia',
    lastMessage: 'Perfecto, quedamos así entonces. Gracias!',
    timestamp: '10:30',
    unread: 2,
    online: true,
  },
  {
    id: 'conv-2',
    name: 'María López',
    avatar: 'ML',
    role: 'Administradora',
    property: 'Departamento Providencia',
    lastMessage: 'El técnico pasará mañana entre 10 y 12.',
    timestamp: 'Ayer',
    unread: 0,
    online: false,
  },
  {
    id: 'conv-3',
    name: 'Soporte Arriendo',
    avatar: 'SA',
    role: 'Sistema',
    property: '',
    lastMessage: 'Tu solicitud ha sido procesada correctamente.',
    timestamp: 'Ayer',
    unread: 0,
    online: true,
  },
  {
    id: 'conv-4',
    name: 'Pedro Gonzalez',
    avatar: 'PG',
    role: 'Propietario',
    property: 'Casa Las Condes',
    lastMessage: 'Te envío el inventario actualizado.',
    timestamp: 'Lun',
    unread: 1,
    online: false,
  },
];

const initialMessages: Record<string, Message[]> = {
  'conv-1': [
    { id: 'msg-1', senderId: 'other', content: 'Hola María, ¿cómo estás? Quería consultarte sobre el pago del próximo mes.', timestamp: '10:15', read: true },
    { id: 'msg-2', senderId: 'me', content: 'Hola Carlos! Todo bien, gracias. Sí, dime, ¿qué necesitas saber?', timestamp: '10:18', read: true },
    { id: 'msg-3', senderId: 'other', content: 'Quería confirmar si el monto será el mismo y la fecha de pago.', timestamp: '10:20', read: true },
    { id: 'msg-4', senderId: 'me', content: 'Sí, el monto es el mismo ($650.000) y el pago lo haré el día 5 como siempre.', timestamp: '10:25', read: true },
    { id: 'msg-5', senderId: 'other', content: 'Perfecto, también quería avisarte que el próximo mes viene el técnico a revisar la calefacción.', timestamp: '10:28', read: true },
    { id: 'msg-6', senderId: 'me', content: 'Genial, ¿ya tienen fecha definida? Para coordinar estar en casa.', timestamp: '10:29', read: true },
    { id: 'msg-7', senderId: 'other', content: 'Perfecto, quedamos así entonces. Gracias!', timestamp: '10:30', read: false },
  ],
  'conv-2': [
    { id: 'ml-1', senderId: 'other', content: 'Hola, te informo que reportamos el problema de la cañería al propietario.', timestamp: '09:00', read: true },
    { id: 'ml-2', senderId: 'me', content: 'Gracias María, ¿cuándo podrían enviar al técnico?', timestamp: '09:30', read: true },
    { id: 'ml-3', senderId: 'other', content: 'El técnico pasará mañana entre 10 y 12.', timestamp: '14:00', read: true },
  ],
  'conv-3': [
    { id: 'sa-1', senderId: 'other', content: 'Bienvenido a Arriendo. Tu cuenta ha sido creada exitosamente.', timestamp: '09:00', read: true },
    { id: 'sa-2', senderId: 'other', content: 'Tu solicitud ha sido procesada correctamente.', timestamp: '10:00', read: true },
  ],
  'conv-4': [
    { id: 'pg-1', senderId: 'other', content: 'Hola, soy Pedro. Quería coordinar la entrega del departamento.', timestamp: '11:00', read: true },
    { id: 'pg-2', senderId: 'me', content: 'Hola Pedro, claro. ¿Qué día le queda bien?', timestamp: '11:30', read: true },
    { id: 'pg-3', senderId: 'other', content: 'Te envío el inventario actualizado.', timestamp: '16:00', read: false },
  ],
};

const autoReplies: Record<string, string[]> = {
  'conv-1': [
    'Perfecto, quedo atento entonces.',
    'Gracias por la información.',
    'Entendido, cualquier cosa te aviso.',
    'Dale, nos coordinamos.',
  ],
  'conv-2': [
    'Listo, te confirmo el horario.',
    'Gracias, quedo pendiente.',
    'Perfecto, nos vemos mañana entonces.',
    'Entendido.',
  ],
  'conv-3': [],
  'conv-4': [
    'Perfecto, lo reviso.',
    'Gracias por enviarlo.',
    'Entendido, cualquier duda te escribo.',
    'Listo.',
  ],
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedConversation = conversations.find(c => c.id === selectedId)!;
  const messages = messagesMap[selectedId] || [];

  const filteredConversations = conversations.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.property.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSelectConversation = useCallback((id: string) => {
    setSelectedId(id);
    setMessagesMap(prev => {
      const msgs = prev[id];
      if (!msgs) return prev;
      return { ...prev, [id]: msgs.map(m => m.senderId === 'other' ? { ...m, read: true } : m) };
    });
    setConversations(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c));
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

    setMessagesMap(prev => ({
      ...prev,
      [selectedId]: [...(prev[selectedId] || []), newMsg],
    }));

    setConversations(prev => {
      const updated = prev.map(c =>
        c.id === selectedId ? { ...c, lastMessage: text, timestamp: now } : c
      );
      const target = updated.find(c => c.id === selectedId)!;
      return [target, ...updated.filter(c => c.id !== selectedId)];
    });

    setMessageText('');

    const replies = autoReplies[selectedId];
    if (replies && replies.length > 0) {
      const idx = (replyCounters[selectedId] || 0) % replies.length;
      const replyText = replies[idx];
      setReplyCounters(prev => ({ ...prev, [selectedId]: idx + 1 }));

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

        setMessagesMap(prev => ({
          ...prev,
          [selectedId]: [...(prev[selectedId] || []), replyMsg],
        }));

        setConversations(prev => {
          const updated = prev.map(c =>
            c.id === selectedId ? { ...c, lastMessage: replyText, timestamp: replyTime } : c
          );
          const target = updated.find(c => c.id === selectedId)!;
          return [target, ...updated.filter(c => c.id !== selectedId)];
        });

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
    <div className="h-[calc(100vh-56px)] bg-plan-page">
      <div className="px-4 pt-4 lg:hidden">
        <Link href="/inquilino" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>
      </div>
      <div className="h-full flex">
        {/* Conversations List */}
        <div className="w-80 bg-card border-r border-plan-border flex flex-col">
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
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 bg-muted flex items-center justify-center text-plan-secondary font-medium">
                    {conversation.avatar}
                  </div>
                  {conversation.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-plan-status-green border-2 border-white rounded-full" />
                  )}
                </div>

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
                  <p className="text-xs text-plan-secondary truncate">
                    {conversation.property ? `${conversation.role} • ${conversation.property}` : conversation.role}
                  </p>
                  <p className={cn(
                    'text-sm truncate mt-0.5',
                    conversation.unread > 0 ? 'text-plan-primary font-medium' : 'text-plan-secondary'
                  )}>
                    {conversation.lastMessage}
                  </p>
                </div>

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
        <div className="flex-1 flex flex-col bg-card">
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

          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-muted">
            <div className="flex items-center justify-center">
              <span className="px-3 py-1 bg-card text-xs text-plan-secondary border border-plan-border">
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
            <div ref={messagesEndRef} />
          </div>

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
