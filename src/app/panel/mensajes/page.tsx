'use client';

import { useState } from 'react';
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
  Star,
  Archive,
  Trash2,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock conversations
const mockConversations = [
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

// Mock messages for selected conversation
const mockMessages = [
  {
    id: 'msg-1',
    senderId: 'other',
    content: 'Buenos días, me interesa mucho el apartamento en Chapinero Alto.',
    timestamp: '09:15',
    read: true,
  },
  {
    id: 'msg-2',
    senderId: 'me',
    content: 'Buenos días Carlos! Claro, el apartamento está disponible. ¿Te gustaría agendar una visita?',
    timestamp: '09:20',
    read: true,
  },
  {
    id: 'msg-3',
    senderId: 'other',
    content: 'Sí, me encantaría. ¿Tiene disponibilidad esta semana?',
    timestamp: '09:22',
    read: true,
  },
  {
    id: 'msg-4',
    senderId: 'me',
    content: 'Tengo disponible el jueves a las 4pm o el viernes a las 10am. ¿Cuál te conviene más?',
    timestamp: '09:25',
    read: true,
  },
  {
    id: 'msg-5',
    senderId: 'other',
    content: 'El jueves a las 4pm me queda perfecto.',
    timestamp: '09:30',
    read: true,
  },
  {
    id: 'msg-6',
    senderId: 'me',
    content: 'Excelente, queda agendada la visita para el jueves 30 de enero a las 4pm. Te enviaré un recordatorio.',
    timestamp: '09:32',
    read: true,
  },
  {
    id: 'msg-7',
    senderId: 'other',
    content: 'Muchas gracias! Ahí estaré puntual.',
    timestamp: '09:35',
    read: true,
  },
  {
    id: 'msg-8',
    senderId: 'other',
    content: 'Por cierto, ya completé todos los documentos que me solicitó en la plataforma.',
    timestamp: '10:15',
    read: true,
  },
  {
    id: 'msg-9',
    senderId: 'me',
    content: 'Perfecto, los revisaré hoy mismo y te confirmo si está todo en orden para proceder con el contrato.',
    timestamp: '10:20',
    read: true,
  },
  {
    id: 'msg-10',
    senderId: 'other',
    content: 'Perfecto, entonces quedamos así para la firma del contrato.',
    timestamp: '10:30',
    read: false,
  },
];

export default function MensajesPage() {
  const [selectedConversation, setSelectedConversation] = useState(mockConversations[0]);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = mockConversations.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.property.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = () => {
    if (messageText.trim()) {
      // Handle send message logic
      setMessageText('');
    }
  };

  return (
    <div className="h-[calc(100vh-56px)] bg-[#F7F8FA]">
      <div className="h-full flex">
        {/* Conversations List */}
        <div className="w-80 bg-white border-r border-[#E5E7EB] flex flex-col">
          {/* Header */}
          <div className="px-4 py-4 border-b border-[#E5E7EB]">
            <h2 className="text-lg font-semibold text-[#111827] mb-3">Mensajes</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar conversación..."
                className="w-full h-9 pl-10 pr-4 bg-[#F9FAFB] border border-[#E5E7EB] text-sm placeholder:text-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-[#111827]"
              />
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation)}
                className={cn(
                  'w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[#F9FAFB] transition-colors border-b border-[#F3F4F6]',
                  selectedConversation.id === conversation.id && 'bg-[#F9FAFB]'
                )}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 bg-[#F3F4F6] flex items-center justify-center text-[#6B7280] font-medium">
                    {conversation.avatar}
                  </div>
                  {conversation.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#22C55E] border-2 border-white rounded-full" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-[#111827] truncate">
                      {conversation.name}
                    </p>
                    <span className="text-xs text-[#9CA3AF] flex-shrink-0">
                      {conversation.timestamp}
                    </span>
                  </div>
                  {conversation.property && (
                    <p className="text-xs text-[#6B7280] truncate">
                      {conversation.role} • {conversation.property}
                    </p>
                  )}
                  <p className="text-sm text-[#6B7280] truncate mt-0.5">
                    {conversation.lastMessage}
                  </p>
                </div>

                {/* Unread Badge */}
                {conversation.unread > 0 && (
                  <span className="w-5 h-5 bg-[#111827] text-white text-xs font-medium flex items-center justify-center flex-shrink-0">
                    {conversation.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Chat Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-[#F3F4F6] flex items-center justify-center text-[#6B7280] font-medium">
                  {selectedConversation.avatar}
                </div>
                {selectedConversation.online && (
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#22C55E] border-2 border-white rounded-full" />
                )}
              </div>
              <div>
                <p className="font-medium text-[#111827]">{selectedConversation.name}</p>
                <p className="text-xs text-[#6B7280]">
                  {selectedConversation.online ? 'En línea' : 'Desconectado'}
                  {selectedConversation.property && ` • ${selectedConversation.property}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2 text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB] transition-colors">
                <Phone className="w-5 h-5" />
              </button>
              <button className="p-2 text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB] transition-colors">
                <Video className="w-5 h-5" />
              </button>
              <button className="p-2 text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB] transition-colors">
                <Info className="w-5 h-5" />
              </button>
              <button className="p-2 text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB] transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#F9FAFB]">
            {/* Date Separator */}
            <div className="flex items-center justify-center">
              <span className="px-3 py-1 bg-white text-xs text-[#6B7280] border border-[#E5E7EB]">
                Hoy
              </span>
            </div>

            {mockMessages.map((message) => (
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
                      ? 'bg-[#111827] text-white'
                      : 'bg-white text-[#111827] border border-[#E5E7EB]'
                  )}
                >
                  <p className="text-sm">{message.content}</p>
                  <div className={cn(
                    'flex items-center justify-end gap-1 mt-1',
                    message.senderId === 'me' ? 'text-[#9CA3AF]' : 'text-[#9CA3AF]'
                  )}>
                    <span className="text-[10px]">{message.timestamp}</span>
                    {message.senderId === 'me' && (
                      message.read ? (
                        <CheckCheck className="w-3 h-3 text-[#D4F934]" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div className="px-6 py-4 border-t border-[#E5E7EB]">
            <div className="flex items-center gap-3">
              <button className="p-2 text-[#6B7280] hover:text-[#111827] transition-colors">
                <Paperclip className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Escribe un mensaje..."
                className="flex-1 h-10 px-4 bg-[#F9FAFB] border border-[#E5E7EB] text-sm placeholder:text-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-[#111827]"
              />
              <button
                onClick={handleSendMessage}
                disabled={!messageText.trim()}
                className={cn(
                  'p-2 transition-colors',
                  messageText.trim()
                    ? 'bg-[#111827] text-white hover:bg-[#1F2937]'
                    : 'bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed'
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
