'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, Check, Trash2, Settings, CreditCard, MessageSquare, FileText, Calendar, ClipboardCheck, Info, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// Notification types with their icons and routes
const notificationConfig: Record<string, { icon: typeof Bell; route: string; color: string }> = {
  'Pago': { icon: CreditCard, route: '/inquilino/pagos', color: 'text-emerald-600' },
  'Mensaje': { icon: MessageSquare, route: '/inquilino/mensajes', color: 'text-blue-600' },
  'Recordatorio': { icon: Calendar, route: '/inquilino/pagos', color: 'text-amber-600' },
  'Documento': { icon: FileText, route: '/inquilino/documentos', color: 'text-purple-600' },
  'Aplicación': { icon: ClipboardCheck, route: '/inquilino/aplicaciones', color: 'text-green-600' },
  'Visita': { icon: Calendar, route: '/inquilino/arriendo', color: 'text-indigo-600' },
  'Aviso': { icon: Info, route: '/inquilino', color: 'text-muted-foreground' },
};

// Mock notifications data
const mockNotifications = [
  {
    id: '1',
    user: 'Sistema',
    action: 'Tu pago fue procesado exitosamente',
    target: 'Arriendo Enero 2026',
    time: 'hace 12 min',
    type: 'Pago',
    unread: true,
  },
  {
    id: '2',
    user: 'Propietario',
    action: 'respondió a tu mensaje sobre',
    target: 'Reparación cocina',
    time: '1 hora',
    type: 'Mensaje',
    unread: true,
  },
  {
    id: '3',
    user: 'Sistema',
    action: 'Recordatorio: Tu próximo pago vence en',
    target: '5 días',
    time: '3 horas',
    type: 'Recordatorio',
    unread: false,
  },
  {
    id: '4',
    user: 'Administración',
    action: 'ha actualizado los términos del',
    target: 'Contrato de arriendo',
    time: '1 día',
    type: 'Documento',
    unread: false,
  },
  {
    id: '5',
    user: 'Sistema',
    action: 'Tu aplicación ha sido',
    target: 'Aprobada',
    time: '2 días',
    type: 'Aplicación',
    unread: false,
  },
  {
    id: '6',
    user: 'Propietario',
    action: 'programó una visita para',
    target: 'Inspección anual',
    time: '3 días',
    type: 'Visita',
    unread: false,
  },
  {
    id: '7',
    user: 'Sistema',
    action: 'Nuevo documento disponible:',
    target: 'Recibo de pago Diciembre',
    time: '1 semana',
    type: 'Documento',
    unread: false,
  },
  {
    id: '8',
    user: 'Administración',
    action: 'Aviso: Mantenimiento programado en',
    target: 'Áreas comunes',
    time: '1 semana',
    type: 'Aviso',
    unread: false,
  },
];

type FilterType = 'all' | 'unread' | 'payments' | 'messages' | 'documents';

export default function NotificacionesPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(mockNotifications);
  const [filter, setFilter] = useState<FilterType>('all');

  const unreadCount = notifications.filter(n => n.unread).length;

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return n.unread;
    if (filter === 'payments') return n.type === 'Pago';
    if (filter === 'messages') return n.type === 'Mensaje';
    if (filter === 'documents') return n.type === 'Documento';
    return true;
  });

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n =>
      n.id === id ? { ...n, unread: false } : n
    ));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const handleNotificationClick = (notification: typeof mockNotifications[0]) => {
    // Mark as read when clicked
    if (notification.unread) {
      markAsRead(notification.id);
    }
    // Navigate to the relevant page
    const config = notificationConfig[notification.type];
    if (config) {
      router.push(config.route);
    }
  };

  return (
    <div className="p-6">
      <Link href="/inquilino" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 lg:hidden">
        <ArrowLeft className="w-4 h-4" />
        Dashboard
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-plan-primary">Notificaciones</h1>
          <p className="text-[13px] text-plan-secondary mt-1">
            {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todas leídas'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 text-[13px] text-plan-secondary hover:text-plan-primary hover:bg-muted transition-colors"
            >
              <Check className="w-4 h-4" />
              Marcar todo como leído
            </button>
          )}
          <button className="p-2 text-plan-muted hover:text-plan-secondary transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border">
        {[
          { id: 'all', label: 'Todas' },
          { id: 'unread', label: 'Sin leer' },
          { id: 'payments', label: 'Pagos' },
          { id: 'messages', label: 'Mensajes' },
          { id: 'documents', label: 'Documentos' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as FilterType)}
            className={cn(
              'px-4 py-2 text-[13px] font-medium transition-colors',
              filter === f.id
                ? 'bg-primary text-white'
                : 'bg-muted text-plan-secondary hover:bg-muted'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="bg-card border border-plan-border">
        {filteredNotifications.length === 0 ? (
          <div className="py-16 text-center">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-[15px] font-medium text-foreground">No hay notificaciones</p>
            <p className="text-[13px] text-plan-muted mt-1">
              {filter === 'all'
                ? 'Cuando tengas nuevas notificaciones aparecerán aquí'
                : 'No hay notificaciones en esta categoría'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification, index) => {
            const config = notificationConfig[notification.type] || { icon: Bell, route: '/inquilino', color: 'text-muted-foreground' };
            const IconComponent = config.icon;

            return (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={cn(
                  'flex items-start gap-4 px-5 py-4 hover:bg-muted transition-colors cursor-pointer group',
                  index !== filteredNotifications.length - 1 && 'border-b border-border',
                  notification.unread && 'bg-muted'
                )}
              >
                {/* Icon based on type */}
                <div className={cn(
                  'w-10 h-10 flex items-center justify-center flex-shrink-0 rounded-sm',
                  notification.unread ? 'bg-primary' : 'bg-muted'
                )}>
                  <IconComponent className={cn(
                    'w-5 h-5',
                    notification.unread ? 'text-white' : config.color
                  )} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-plan-primary">
                    <span className="font-medium">{notification.user}</span>
                    {' '}{notification.action}{' '}
                    {notification.target && (
                      <span className="font-medium">{notification.target}</span>
                    )}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[12px] text-plan-muted">{notification.time}</span>
                    <span className="text-[12px] text-plan-muted">•</span>
                    <span className={cn('text-[12px] font-medium', config.color)}>{notification.type}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {notification.unread && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="p-2 text-plan-muted hover:text-plan-status-green hover:bg-green-50 rounded-sm transition-colors"
                      title="Marcar como leído"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="p-2 text-plan-muted hover:text-plan-status-red hover:bg-red-50 rounded-sm transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Arrow indicator and unread dot */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {notification.unread && (
                    <div className="w-2 h-2 bg-plan-status-blue rounded-full" />
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-plan-muted transition-colors" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
