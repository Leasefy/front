'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Search,
  Bell,
  ChevronDown,
  Zap,
  UserPlus,
  User,
  Settings,
  LogOut,
  HelpCircle,
  CreditCard,
  Check,
  Crown,
  Mail,
  X,
  FileText,
  Home,
  Users,
  Building2,
  MessageSquare,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { getPlanById, MOCK_SUBSCRIPTION, PLANS } from '@/lib/data/mock-subscriptions';
import { TEAM_ROLES, type TeamRole } from '@/lib/types/team';
import { getTeamMembers, getPendingInvites } from '@/lib/data/mock-team';
import {
  searchData,
  groupSearchResults,
  getCategoryLabel,
  getRecentSearches,
  getQuickLinks,
  type SearchCategory,
  type SearchResult,
} from '@/lib/data/mock-search';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface PlanHeaderProps {
  title?: string;
  subtitle?: string;
  breadcrumb?: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  actions?: React.ReactNode;
  className?: string;
}

// Notification type routing config
const notificationRoutes: Record<string, { landlord: string; tenant: string }> = {
  'Pago': { landlord: '/panel', tenant: '/inquilino/pagos' },
  'Aplicación': { landlord: '/panel/candidatos', tenant: '/inquilino/aplicaciones' },
  'Contrato': { landlord: '/panel/contratos', tenant: '/inquilino/documentos' },
  'Mantenimiento': { landlord: '/panel', tenant: '/inquilino' },
  'Verificación': { landlord: '/panel/candidatos', tenant: '/inquilino/aplicaciones' },
  'Actualización': { landlord: '/panel', tenant: '/inquilino' },
};

// Mock notifications
const initialNotifications = [
  {
    id: '1',
    user: 'Carlos Martinez',
    action: 'completó el pago del arriendo',
    target: 'Apt. #203',
    time: 'hace 12 min',
    type: 'Pago',
    unread: true,
  },
  {
    id: '2',
    user: 'Maria Garcia',
    action: 'envió una aplicación para',
    target: 'Casa Providencia',
    time: 'hace 12 min',
    type: 'Aplicación',
    unread: true,
  },
  {
    id: '3',
    user: 'Sistema',
    action: 'te envió un recordatorio',
    message: 'Renovación de contrato pendiente para 3 propiedades.',
    time: 'hace 12 min',
    type: 'Contrato',
    hasReply: true,
    replyColor: 'bg-green-100',
    unread: false,
  },
  {
    id: '4',
    user: 'Roberto Silva',
    action: 'envió documentos',
    file: 'Contrato_Arriendo.pdf',
    fileSize: '2 MB',
    time: 'hace 12 min',
    type: 'Contrato',
    unread: false,
  },
  {
    id: '5',
    user: 'Ana Torres',
    action: 'firmó el contrato de',
    target: 'Oficina Santiago Centro',
    time: 'hace 1 hora',
    type: 'Contrato',
    unread: false,
  },
  {
    id: '6',
    user: 'Diego Fernandez',
    action: 'solicitó mantenimiento en',
    target: 'Depto. Las Condes',
    time: 'hace 2 horas',
    type: 'Mantenimiento',
    unread: false,
  },
  {
    id: '7',
    user: 'Sistema',
    action: 'envió recordatorio',
    message: 'Pago pendiente en 3 propiedades.',
    time: 'hace 3 horas',
    type: 'Pago',
    replyColor: 'bg-plan-status-yellow-bg',
    unread: false,
  },
  {
    id: '8',
    user: 'Laura Mendez',
    action: 'completó la verificación para',
    target: 'Casa Ñuñoa',
    time: 'hace 5 horas',
    type: 'Verificación',
    unread: false,
  },
  {
    id: '9',
    user: 'Pedro Gonzalez',
    action: 'actualizó información de',
    target: 'Apt. #105',
    time: 'Ayer',
    type: 'Actualización',
    unread: false,
  },
  {
    id: '10',
    user: 'Sistema',
    action: 'envió documentos',
    file: 'Informe_Mensual.pdf',
    fileSize: '1.5 MB',
    time: 'Ayer',
    type: 'Contrato',
    unread: false,
  },
];

export function PlanHeader({
  title,
  subtitle,
  breadcrumb,
  showSearch = true,
  searchPlaceholder = 'Buscar o escribir un comando',
  onSearch,
  actions,
  className,
}: PlanHeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [teamInviteOpen, setTeamInviteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'mentions'>('all');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('viewer');
  const [inviteSent, setInviteSent] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const searchRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => n.unread).length;

  // Notification actions
  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n =>
      n.id === id ? { ...n, unread: false } : n
    ));
  };

  const handleNotificationClick = (notification: typeof initialNotifications[0]) => {
    // Mark as read
    if (notification.unread) {
      markAsRead(notification.id);
    }
    // Close the popover
    setNotificationsOpen(false);
    // Navigate to relevant page
    const routes = notificationRoutes[notification.type || ''];
    if (routes) {
      router.push(isLandlord ? routes.landlord : routes.tenant);
    }
  };

  // Check if user is landlord (on /panel routes)
  const isLandlord = pathname?.startsWith('/panel');

  // Get subscription data
  const currentPlan = getPlanById(MOCK_SUBSCRIPTION.planId);
  const teamMembers = getTeamMembers();
  const pendingInvites = getPendingInvites();

  // Search functionality
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const results = searchData(searchQuery, isLandlord);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, isLandlord]);

  // Close search on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch?.(value);
  };

  const handleSearchSelect = (result: SearchResult) => {
    setSearchQuery('');
    setSearchFocused(false);
    router.push(result.href);
  };

  const groupedResults = groupSearchResults(searchResults, isLandlord);
  const recentSearches = getRecentSearches(isLandlord);
  const quickLinks = getQuickLinks(isLandlord);

  const getCategoryIcon = (category: SearchCategory) => {
    const icons: Record<SearchCategory, React.ReactNode> = {
      property: <Building2 className="w-4 h-4" />,
      candidate: <Users className="w-4 h-4" />,
      contract: <FileText className="w-4 h-4" />,
      lease: <Home className="w-4 h-4" />,
      payment: <CreditCard className="w-4 h-4" />,
      application: <FileText className="w-4 h-4" />,
      document: <FileText className="w-4 h-4" />,
      message: <MessageSquare className="w-4 h-4" />,
    };
    return icons[category];
  };

  const handleLogout = () => {
    logout();
    router.push('/auth');
  };

  return (
    <header className={cn('sticky top-0 z-30 bg-white border-b border-border', className)}>
      <div className="flex items-center justify-between h-14 px-6">
        {/* Left: Search */}
        {showSearch && (
          <div ref={searchRef} className="relative w-[400px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-plan-muted z-10" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              onFocus={() => setSearchFocused(true)}
              placeholder={isLandlord ? "Buscar propiedades, candidatos..." : "Buscar pagos, documentos..."}
              className={cn(
                'w-full h-9 pl-9 pr-4',
                'bg-muted border-none rounded-sm',
                'text-[13px] text-plan-primary placeholder:text-plan-muted',
                'focus:outline-none focus:ring-1 focus:ring-plan-primary focus:bg-white',
                'transition-all duration-100'
              )}
            />

            {/* Search Dropdown */}
            {searchFocused && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-plan-border shadow-lg max-h-[400px] overflow-y-auto z-50">
                {searchQuery.length >= 2 ? (
                  // Show search results
                  searchResults.length > 0 ? (
                    <div>
                      {Object.entries(groupedResults).map(([category, items]) => (
                        <div key={category}>
                          <div className="px-4 py-2 bg-muted border-b border-border">
                            <p className="text-[11px] font-medium text-plan-secondary uppercase tracking-wide">
                              {getCategoryLabel(category as SearchCategory)}
                            </p>
                          </div>
                          {items.map((result) => (
                            <button
                              key={result.id}
                              onClick={() => handleSearchSelect(result)}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                            >
                              <div className="w-8 h-8 bg-muted flex items-center justify-center text-plan-secondary">
                                {getCategoryIcon(result.category)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-medium text-plan-primary truncate">
                                  {result.title}
                                </p>
                                <p className="text-[11px] text-plan-muted truncate">
                                  {result.subtitle}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    // No results
                    <div className="px-4 py-8 text-center">
                      <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-[13px] text-plan-secondary">
                        No se encontraron resultados para &quot;{searchQuery}&quot;
                      </p>
                    </div>
                  )
                ) : (
                  // Show quick links and recent searches
                  <div>
                    {/* Quick Links */}
                    <div className="px-4 py-2 bg-muted border-b border-border">
                      <p className="text-[11px] font-medium text-plan-secondary uppercase tracking-wide">
                        Accesos rapidos
                      </p>
                    </div>
                    {quickLinks.map((link) => (
                      <button
                        key={link.id}
                        onClick={() => handleSearchSelect(link)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                      >
                        <div className="w-8 h-8 bg-muted flex items-center justify-center text-plan-secondary">
                          {getCategoryIcon(link.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-plan-primary">
                            {link.title}
                          </p>
                          <p className="text-[11px] text-plan-muted">
                            {link.subtitle}
                          </p>
                        </div>
                      </button>
                    ))}

                    {/* Recent Searches */}
                    {recentSearches.length > 0 && (
                      <>
                        <div className="px-4 py-2 bg-muted border-t border-b border-border">
                          <p className="text-[11px] font-medium text-plan-secondary uppercase tracking-wide">
                            Busquedas recientes
                          </p>
                        </div>
                        {recentSearches.map((search, index) => (
                          <button
                            key={index}
                            onClick={() => setSearchQuery(search)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors text-left"
                          >
                            <Clock className="w-4 h-4 text-plan-muted" />
                            <span className="text-[13px] text-plan-secondary">{search}</span>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-1 ml-auto">
          {actions}

          {/* Quick Action Icons - Only for Landlords */}
          {isLandlord && (
            <>
              {/* Subscription Popover */}
              <Popover open={subscriptionOpen} onOpenChange={setSubscriptionOpen}>
                <PopoverTrigger asChild>
                  <button className="relative p-2 text-plan-muted hover:text-plan-secondary transition-colors">
                    <Zap className="w-5 h-5 stroke-[1.5px]" />
                    {MOCK_SUBSCRIPTION.planId === 'free' && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-plan-accent rounded-full" />
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[320px] p-0 bg-white border border-plan-border shadow-lg rounded-none"
                  align="end"
                  sideOffset={8}
                >
                  {/* Header */}
                  <div className="px-5 py-4 border-b border-border">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[15px] font-semibold text-plan-primary">Tu Suscripcion</h3>
                      <button
                        onClick={() => setSubscriptionOpen(false)}
                        className="text-plan-muted hover:text-plan-secondary"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Current Plan */}
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={cn(
                        'w-10 h-10 flex items-center justify-center rounded-sm',
                        MOCK_SUBSCRIPTION.planId === 'free' ? 'bg-muted' : 'bg-plan-primary'
                      )}>
                        {MOCK_SUBSCRIPTION.planId === 'free' ? (
                          <Zap className="w-5 h-5 text-plan-secondary" />
                        ) : (
                          <Crown className="w-5 h-5 text-plan-accent" />
                        )}
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-plan-primary">
                          Plan {currentPlan.name}
                        </p>
                        <p className="text-[12px] text-plan-secondary">
                          {MOCK_SUBSCRIPTION.planId === 'free'
                            ? 'Funciones limitadas'
                            : `Facturacion ${MOCK_SUBSCRIPTION.billingCycle === 'monthly' ? 'mensual' : 'anual'}`
                          }
                        </p>
                      </div>
                    </div>

                    {/* Features preview */}
                    <div className="space-y-2 mb-4">
                      {currentPlan.features.slice(0, 4).map((feature) => (
                        <div key={feature.id} className="flex items-center gap-2">
                          <div className={cn(
                            'w-4 h-4 flex items-center justify-center rounded-sm',
                            feature.included ? 'bg-plan-status-green-bg text-green-800' : 'bg-muted text-plan-muted'
                          )}>
                            <Check className="w-3 h-3" />
                          </div>
                          <span className={cn(
                            'text-[12px]',
                            feature.included ? 'text-foreground' : 'text-plan-muted'
                          )}>
                            {feature.name}
                            {feature.limit && feature.limit !== 'unlimited' && ` (${feature.limit})`}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Upgrade CTA */}
                    {MOCK_SUBSCRIPTION.planId !== 'business' && (
                      <Link
                        href="/panel/upgrade"
                        onClick={() => setSubscriptionOpen(false)}
                        className="block w-full py-2.5 bg-plan-primary text-white text-[13px] font-medium text-center hover:bg-foreground transition-colors"
                      >
                        {MOCK_SUBSCRIPTION.planId === 'free' ? 'Mejorar Plan' : 'Ver Planes'}
                      </Link>
                    )}

                    {/* Manage subscription */}
                    <Link
                      href="/panel/configuracion"
                      onClick={() => setSubscriptionOpen(false)}
                      className="block mt-2 text-center text-[12px] text-plan-secondary hover:text-plan-primary"
                    >
                      Gestionar suscripcion
                    </Link>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Team Invite Popover */}
              <Popover open={teamInviteOpen} onOpenChange={(open) => {
                setTeamInviteOpen(open);
                if (!open) {
                  setInviteEmail('');
                  setInviteRole('viewer');
                  setInviteSent(false);
                }
              }}>
                <PopoverTrigger asChild>
                  <button className="relative p-2 text-plan-muted hover:text-plan-secondary transition-colors">
                    <UserPlus className="w-5 h-5 stroke-[1.5px]" />
                    {pendingInvites.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-plan-primary text-white text-[9px] font-medium flex items-center justify-center rounded-full">
                        {pendingInvites.length}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[360px] p-0 bg-white border border-plan-border shadow-lg rounded-none"
                  align="end"
                  sideOffset={8}
                >
                  {/* Header */}
                  <div className="px-5 py-4 border-b border-border">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[15px] font-semibold text-plan-primary">Invitar al Equipo</h3>
                      <button
                        onClick={() => setTeamInviteOpen(false)}
                        className="text-plan-muted hover:text-plan-secondary"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-[12px] text-plan-secondary mt-1">
                      Colabora con tu equipo en la gestion de propiedades
                    </p>
                  </div>

                  <div className="p-5">
                    {inviteSent ? (
                      /* Success state */
                      <div className="text-center py-4">
                        <div className="w-12 h-12 bg-plan-status-green-bg rounded-full flex items-center justify-center mx-auto mb-3">
                          <Check className="w-6 h-6 text-green-800" />
                        </div>
                        <p className="text-[14px] font-medium text-plan-primary">Invitacion enviada</p>
                        <p className="text-[12px] text-plan-secondary mt-1">
                          Se envio un correo a {inviteEmail}
                        </p>
                        <button
                          onClick={() => {
                            setInviteSent(false);
                            setInviteEmail('');
                          }}
                          className="mt-4 text-[13px] text-plan-secondary hover:text-plan-primary"
                        >
                          Invitar a otra persona
                        </button>
                      </div>
                    ) : (
                      /* Invite form */
                      <>
                        {/* Email input */}
                        <div className="mb-4">
                          <label className="block text-[12px] font-medium text-foreground mb-1.5">
                            Correo electronico
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-plan-muted" />
                            <input
                              type="email"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              placeholder="correo@ejemplo.com"
                              className="w-full h-10 pl-9 pr-4 bg-muted border border-plan-border text-[13px] placeholder:text-plan-muted focus:outline-none focus:ring-1 focus:ring-plan-primary"
                            />
                          </div>
                        </div>

                        {/* Role selector */}
                        <div className="mb-4">
                          <label className="block text-[12px] font-medium text-foreground mb-1.5">
                            Rol
                          </label>
                          <div className="space-y-2">
                            {TEAM_ROLES.map((role) => (
                              <button
                                key={role.id}
                                onClick={() => setInviteRole(role.id)}
                                className={cn(
                                  'w-full flex items-start gap-3 p-3 text-left border transition-colors',
                                  inviteRole === role.id
                                    ? 'border-plan-primary bg-muted'
                                    : 'border-plan-border hover:border-border'
                                )}
                              >
                                <div className={cn(
                                  'w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5',
                                  inviteRole === role.id ? 'border-plan-primary' : 'border-border'
                                )}>
                                  {inviteRole === role.id && (
                                    <div className="w-2 h-2 rounded-full bg-plan-primary" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="text-[13px] font-medium text-plan-primary">{role.name}</p>
                                  <p className="text-[11px] text-plan-secondary">{role.description}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Submit */}
                        <button
                          onClick={() => {
                            if (inviteEmail) {
                              setInviteSent(true);
                            }
                          }}
                          disabled={!inviteEmail}
                          className={cn(
                            'w-full py-2.5 text-[13px] font-medium text-center transition-colors',
                            inviteEmail
                              ? 'bg-plan-primary text-white hover:bg-foreground'
                              : 'bg-muted text-plan-muted cursor-not-allowed'
                          )}
                        >
                          Enviar Invitacion
                        </button>
                      </>
                    )}

                    {/* Current team preview */}
                    {teamMembers.length > 1 && !inviteSent && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-[11px] font-medium text-plan-muted uppercase tracking-wide mb-2">
                          Equipo actual ({teamMembers.length})
                        </p>
                        <div className="flex -space-x-2">
                          {teamMembers.slice(0, 5).map((member) => (
                            <div
                              key={member.id}
                              className="w-8 h-8 rounded-full bg-muted border-2 border-white flex items-center justify-center text-[11px] font-medium text-plan-secondary"
                              title={member.name || member.email}
                            >
                              {(member.name || member.email).charAt(0).toUpperCase()}
                            </div>
                          ))}
                          {teamMembers.length > 5 && (
                            <div className="w-8 h-8 rounded-full bg-plan-primary border-2 border-white flex items-center justify-center text-[10px] font-medium text-white">
                              +{teamMembers.length - 5}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </>
          )}

          {/* Notifications */}
          <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <PopoverTrigger asChild>
              <button className="relative p-2 text-plan-muted hover:text-plan-secondary transition-colors">
                <Bell className="w-5 h-5 stroke-[1.5px]" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-plan-status-blue rounded-full" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[400px] p-0 bg-white border border-plan-border shadow-lg rounded-none"
              align="end"
              sideOffset={8}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-[15px] font-semibold text-plan-primary">Notificaciones</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setNotificationsOpen(false);
                      router.push(isLandlord ? '/panel/notificaciones' : '/inquilino/notificaciones');
                    }}
                    className="text-plan-muted hover:text-plan-secondary"
                    title="Ver todas las notificaciones"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setNotificationsOpen(false)}
                    className="text-plan-muted hover:text-plan-secondary"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
                {(['all', 'unread', 'mentions'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'px-3 py-1.5 text-[12px] font-medium rounded-sm transition-colors',
                      activeTab === tab
                        ? 'bg-muted text-plan-primary'
                        : 'text-plan-secondary hover:text-plan-primary'
                    )}
                  >
                    {tab === 'all' && 'Todas'}
                    {tab === 'unread' && 'Sin leer'}
                    {tab === 'mentions' && 'Menciones'}
                    {tab === 'all' && (
                      <span className="ml-1.5 px-1.5 py-0.5 bg-plan-primary text-white text-[10px] rounded-sm">
                        7
                      </span>
                    )}
                  </button>
                ))}
                <button className="ml-auto text-plan-muted hover:text-plan-secondary">
                  <Settings className="w-4 h-4" />
                </button>
              </div>

              {/* Notifications List */}
              <div className="max-h-[320px] overflow-y-auto overscroll-contain">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      'flex gap-3 px-5 py-4 hover:bg-muted transition-colors border-b border-border last:border-0 cursor-pointer',
                      notification.unread && 'bg-muted'
                    )}
                  >
                    {/* Avatar */}
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm flex-shrink-0',
                      notification.unread ? 'bg-plan-primary text-white' : 'bg-muted text-plan-secondary'
                    )}>
                      {notification.user.charAt(0)}
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
                      <p className="text-[12px] text-plan-muted mt-0.5">
                        {notification.time}
                        {notification.type && (
                          <>
                            {' • '}
                            <span>{notification.type}</span>
                          </>
                        )}
                      </p>

                      {/* Message reply */}
                      {notification.message && (
                        <div className={cn(
                          'mt-2 px-3 py-2 rounded-sm flex items-center justify-between',
                          notification.replyColor || 'bg-muted'
                        )}>
                          <p className="text-[12px] text-foreground">{notification.message}</p>
                          {notification.hasReply && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setNotificationsOpen(false);
                                router.push(isLandlord ? '/panel/mensajes' : '/inquilino/mensajes');
                              }}
                              className="px-3 py-1 bg-white text-[11px] font-medium text-plan-primary rounded-sm border border-plan-border hover:bg-muted transition-colors"
                            >
                              Responder
                            </button>
                          )}
                        </div>
                      )}

                      {/* File */}
                      {notification.file && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setNotificationsOpen(false);
                            router.push(isLandlord ? '/panel/contratos' : '/inquilino/documentos');
                          }}
                          className="mt-2 px-3 py-2 bg-muted rounded-sm flex items-center justify-between hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-plan-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            <span className="text-[12px] text-foreground">{notification.file}</span>
                          </div>
                          <span className="text-[11px] text-plan-muted">{notification.fileSize}</span>
                        </div>
                      )}
                    </div>

                    {/* Unread indicator */}
                    {notification.unread && (
                      <div className="w-2 h-2 rounded-full bg-plan-status-blue flex-shrink-0 mt-2" />
                    )}
                  </div>
                ))}
              </div>

              {/* View all link */}
              <div className="px-5 py-3 border-t border-border">
                <button
                  onClick={() => {
                    setNotificationsOpen(false);
                    router.push(isLandlord ? '/panel/notificaciones' : '/inquilino/notificaciones');
                  }}
                  className="w-full text-center text-[13px] font-medium text-plan-primary hover:text-plan-secondary transition-colors"
                >
                  Ver todas las notificaciones
                </button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Separator */}
          <div className="w-px h-6 bg-muted mx-2" />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 p-1 outline-none">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                  <span className="text-plan-secondary font-medium text-sm">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-plan-muted" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-56 bg-white border border-plan-border shadow-lg rounded-none p-1"
              align="end"
              sideOffset={8}
            >
              <DropdownMenuLabel className="px-3 py-2">
                <p className="text-[13px] font-medium text-plan-primary">{user?.name || 'Usuario'}</p>
                <p className="text-[12px] text-plan-secondary">{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-muted" />
              <DropdownMenuItem asChild>
                <Link
                  href={isLandlord ? "/panel/perfil" : "/inquilino/perfil"}
                  className="flex items-center gap-2 px-3 py-2 text-[13px] text-foreground hover:bg-muted cursor-pointer"
                >
                  <User className="w-4 h-4 stroke-[1.5px]" />
                  Mi Perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={isLandlord ? "/panel/configuracion" : "/inquilino/configuracion"}
                  className="flex items-center gap-2 px-3 py-2 text-[13px] text-foreground hover:bg-muted cursor-pointer"
                >
                  <Settings className="w-4 h-4 stroke-[1.5px]" />
                  Configuración
                </Link>
              </DropdownMenuItem>
              {!isLandlord && (
                <DropdownMenuItem asChild>
                  <Link
                    href="/inquilino/pagos"
                    className="flex items-center gap-2 px-3 py-2 text-[13px] text-foreground hover:bg-muted cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4 stroke-[1.5px]" />
                    Mis Pagos
                  </Link>
                </DropdownMenuItem>
              )}
              {isLandlord && (
                <DropdownMenuItem asChild>
                  <Link
                    href="/panel/upgrade"
                    className="flex items-center gap-2 px-3 py-2 text-[13px] text-foreground hover:bg-muted cursor-pointer"
                  >
                    <Crown className="w-4 h-4 stroke-[1.5px]" />
                    Mi Plan
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-muted" />
              <DropdownMenuItem asChild>
                <Link
                  href="/ayuda"
                  className="flex items-center gap-2 px-3 py-2 text-[13px] text-foreground hover:bg-muted cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4 stroke-[1.5px]" />
                  Ayuda
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-muted" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-[13px] text-plan-status-red hover:bg-red-50 cursor-pointer"
              >
                <LogOut className="w-4 h-4 stroke-[1.5px]" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

// Page header variant with breadcrumb and title
export function PlanPageHeader({
  breadcrumb,
  title,
  count,
  actions,
  className,
}: {
  breadcrumb?: string;
  title: string;
  count?: number;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('px-6 py-4', className)}>
      {breadcrumb && (
        <p className="text-[12px] text-plan-muted mb-1">{breadcrumb}</p>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-semibold text-plan-primary">{title}</h1>
          {count !== undefined && (
            <span className="text-[13px] text-plan-muted">{count} items</span>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
