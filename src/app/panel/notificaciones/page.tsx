'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, Trash2, Settings, Users, Building2, FileText, CreditCard, ChevronRight, AlertTriangle, Star, BarChart3, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

// Notification types with their routes and colors
const notificationConfig: Record<string, { route: string; color: string }> = {
  'Pago': { route: '/panel', color: 'text-emerald-600' },
  'Aplicación': { route: '/panel/candidatos', color: 'text-blue-600' },
  'Contrato': { route: '/panel/contratos', color: 'text-purple-600' },
  'Mantenimiento': { route: '/panel', color: 'text-amber-600' },
  'Alerta': { route: '/panel', color: 'text-red-600' },
  'Verificación': { route: '/panel/candidatos', color: 'text-indigo-600' },
  'Propiedad': { route: '/panel/propiedades', color: 'text-teal-600' },
  'Reseña': { route: '/panel', color: 'text-yellow-600' },
  'Informe': { route: '/panel', color: 'text-gray-600' },
};

// Mock notifications data for landlords
const mockNotifications = [
  {
    id: '1',
    user: 'Carlos Martinez',
    action: 'completó el pago del arriendo',
    target: 'Apt. #203',
    time: '12 min',
    type: 'Pago',
    icon: CreditCard,
    unread: true,
  },
  {
    id: '2',
    user: 'Maria Garcia',
    action: 'envió una nueva aplicación para',
    target: 'Casa Providencia',
    time: '1 hora',
    type: 'Aplicación',
    icon: Users,
    unread: true,
  },
  {
    id: '3',
    user: 'Sistema',
    action: 'Recordatorio: Contrato por vencer en',
    target: '30 días - Depto. Las Condes',
    time: '3 horas',
    type: 'Contrato',
    icon: FileText,
    unread: true,
  },
  {
    id: '4',
    user: 'Roberto Silva',
    action: 'solicitó mantenimiento en',
    target: 'Baño principal - Apt. #105',
    time: '5 horas',
    type: 'Mantenimiento',
    icon: Building2,
    unread: false,
  },
  {
    id: '5',
    user: 'Ana Torres',
    action: 'firmó el contrato para',
    target: 'Oficina Santiago Centro',
    time: '1 día',
    type: 'Contrato',
    icon: FileText,
    unread: false,
  },
  {
    id: '6',
    user: 'Sistema',
    action: 'Pago atrasado detectado:',
    target: 'Juan Pérez - Casa Ñuñoa',
    time: '2 días',
    type: 'Alerta',
    icon: CreditCard,
    unread: false,
  },
  {
    id: '7',
    user: 'Diego Fernandez',
    action: 'completó la verificación de antecedentes',
    target: 'Puntuación: 85/100',
    time: '3 días',
    type: 'Verificación',
    icon: Users,
    unread: false,
  },
  {
    id: '8',
    user: 'Sistema',
    action: 'Nueva propiedad publicada:',
    target: 'Depto. Vitacura - $850.000/mes',
    time: '1 semana',
    type: 'Propiedad',
    icon: Building2,
    unread: false,
  },
  {
    id: '9',
    user: 'Laura Mendez',
    action: 'dejó una reseña en',
    target: 'Casa Providencia - ⭐⭐⭐⭐⭐',
    time: '1 semana',
    type: 'Reseña',
    icon: Users,
    unread: false,
  },
  {
    id: '10',
    user: 'Sistema',
    action: 'Informe mensual disponible:',
    target: 'Resumen Diciembre 2025',
    time: '2 semanas',
    type: 'Informe',
    icon: FileText,
    unread: false,
  },
];

type FilterType = 'all' | 'unread' | 'payments' | 'applications' | 'contracts' | 'properties';

export default function NotificacionesPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(mockNotifications);
  const [filter, setFilter] = useState<FilterType>('all');

  const unreadCount = notifications.filter(n => n.unread).length;

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return n.unread;
    if (filter === 'payments') return n.type === 'Pago' || n.type === 'Alerta';
    if (filter === 'applications') return n.type === 'Aplicación' || n.type === 'Verificación';
    if (filter === 'contracts') return n.type === 'Contrato';
    if (filter === 'properties') return n.type === 'Propiedad' || n.type === 'Mantenimiento';
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-[#111827]">Notificaciones</h1>
          <p className="text-[13px] text-[#6B7280] mt-1">
            {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todas leídas'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 text-[13px] text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB] transition-colors"
            >
              <Check className="w-4 h-4" />
              Marcar todo como leído
            </button>
          )}
          <button className="p-2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[#F3F4F6]">
        {[
          { id: 'all', label: 'Todas' },
          { id: 'unread', label: 'Sin leer' },
          { id: 'payments', label: 'Pagos' },
          { id: 'applications', label: 'Candidatos' },
          { id: 'contracts', label: 'Contratos' },
          { id: 'properties', label: 'Propiedades' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as FilterType)}
            className={cn(
              'px-4 py-2 text-[13px] font-medium transition-colors',
              filter === f.id
                ? 'bg-[#111827] text-white'
                : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="bg-white border border-[#E5E7EB]">
        {filteredNotifications.length === 0 ? (
          <div className="py-16 text-center">
            <Bell className="w-12 h-12 text-[#D1D5DB] mx-auto mb-4" />
            <p className="text-[15px] font-medium text-[#374151]">No hay notificaciones</p>
            <p className="text-[13px] text-[#9CA3AF] mt-1">
              {filter === 'all'
                ? 'Cuando tengas nuevas notificaciones aparecerán aquí'
                : 'No hay notificaciones en esta categoría'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification, index) => {
            const IconComponent = notification.icon;
            const config = notificationConfig[notification.type] || { route: '/panel', color: 'text-gray-600' };

            return (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={cn(
                  'flex items-start gap-4 px-5 py-4 hover:bg-[#FAFAFA] transition-colors cursor-pointer group',
                  index !== filteredNotifications.length - 1 && 'border-b border-[#F3F4F6]',
                  notification.unread && 'bg-[#F9FAFB]'
                )}
              >
                {/* Icon */}
                <div className={cn(
                  'w-10 h-10 flex items-center justify-center flex-shrink-0 rounded-lg',
                  notification.unread ? 'bg-[#111827]' : 'bg-[#F3F4F6]'
                )}>
                  <IconComponent className={cn(
                    'w-5 h-5',
                    notification.unread ? 'text-white' : config.color
                  )} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[#111827]">
                    <span className="font-medium">{notification.user}</span>
                    {' '}{notification.action}{' '}
                    {notification.target && (
                      <span className="font-medium">{notification.target}</span>
                    )}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[12px] text-[#9CA3AF]">{notification.time}</span>
                    <span className="text-[12px] text-[#9CA3AF]">•</span>
                    <span className={cn(
                      'text-[12px] font-medium',
                      config.color
                    )}>
                      {notification.type}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {notification.unread && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="p-2 text-[#9CA3AF] hover:text-[#22C55E] hover:bg-[#F0FDF4] rounded-lg transition-colors"
                      title="Marcar como leído"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="p-2 text-[#9CA3AF] hover:text-[#EF4444] hover:bg-[#FEF2F2] rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Arrow indicator and unread dot */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {notification.unread && (
                    <div className="w-2 h-2 bg-[#3B82F6] rounded-full" />
                  )}
                  <ChevronRight className="w-4 h-4 text-[#D1D5DB] group-hover:text-[#9CA3AF] transition-colors" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
