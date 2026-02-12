'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { MagnifyingGlass, Bell, CaretDown, Lightning, UserPlus, User, Gear, SignOut, Question, CreditCard, Check, Crown, Envelope, X, FileText, House, Users, Buildings, Chat, Clock, Heart } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { getPlanById, MOCK_SUBSCRIPTION, PLANS } from '@/lib/data/mock-subscriptions';
import { AvatarSubscriptionIndicator } from './SubscriptionBadge';
import type { TenantSubscriptionTextT } from '@/lib/context/TenantProfileContext';
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
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListLabel,
  DropdownListSeparator,
  DropdownListTrigger,
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
  showMagnifyingGlass?: boolean;
  searchPlaceholder?: string;
  onMagnifyingGlass?: (query: string) => void;
  actions?: React.ReactNode;
  className?: string;
  /** For tenant dashboards - pass subscription type */
  tenantSubscription?: TenantSubscriptionTextT;
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
    user: 'Nicolás Martinez',
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
  showMagnifyingGlass = true,
  searchPlaceholder = 'Buscar o escribir un comando',
  onMagnifyingGlass,
  actions,
  className,
  tenantSubscription,
}: PlanHeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { t, locale } = useI18n();
  const [searchQuery, setMagnifyingGlassQuery] = useState('');
  const [searchFocused, setMagnifyingGlassFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [teamInviteOpen, setTeamInviteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'mentions'>('all');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteEmailError, setInviteEmailError] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('viewer');
  const [inviteSent, setInviteSent] = useState(false);

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

  // MagnifyingGlass functionality
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
        setMagnifyingGlassFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMagnifyingGlass = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMagnifyingGlassQuery(value);
    onMagnifyingGlass?.(value);
  };

  const handleMagnifyingGlassSelect = (result: SearchResult) => {
    setMagnifyingGlassQuery('');
    setMagnifyingGlassFocused(false);
    router.push(result.href);
  };

  const groupedResults = groupSearchResults(searchResults, isLandlord);
  const recentSearches = getRecentSearches(isLandlord);
  const quickLinks = getQuickLinks(isLandlord);

  const getCategoryIcon = (category: SearchCategory) => {
    const icons: Record<SearchCategory, React.ReactNode> = {
      property: <Buildings className="w-4 h-4" />,
      candidate: <Users className="w-4 h-4" />,
      contract: <FileText className="w-4 h-4" />,
      lease: <House className="w-4 h-4" />,
      payment: <CreditCard className="w-4 h-4" />,
      application: <FileText className="w-4 h-4" />,
      document: <FileText className="w-4 h-4" />,
      message: <Chat className="w-4 h-4" />,
    };
    return icons[category];
  };

  const handleLogout = () => {
    logout();
    router.push('/auth');
  };

  return (
    <header className={cn('sticky top-0 z-30 bg-white dark:bg-card border-b border-neutral-200 dark:border-border', className)}>
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left: MagnifyingGlass */}
        {showMagnifyingGlass && (
          <div ref={searchRef} className="relative w-full max-w-[400px]">
            <MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 z-10" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleMagnifyingGlass}
              onFocus={() => setMagnifyingGlassFocused(true)}
              placeholder={isLandlord
                ? (locale === 'es' ? "Buscar propiedades, candidatos..." : "MagnifyingGlass properties, candidates...")
                : t('header.search')}
              className={cn(
                'w-full h-10 pl-10 pr-4',
                'bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-full',
                'text-[14px] text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/30 focus:border-indigo-300 dark:focus:border-indigo-500/50 focus:bg-white dark:focus:bg-white/10',
                'transition-colors'
              )}
            />

            {/* MagnifyingGlass Dropdown */}
            {searchFocused && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1a1a1c] border border-neutral-200 dark:border-white/10 shadow-lg rounded-2xl max-h-[400px] overflow-y-auto z-50 overflow-hidden">
                {searchQuery.length >= 2 ? (
                  // Show search results
                  searchResults.length > 0 ? (
                    <div>
                      {Object.entries(groupedResults).map(([category, items]) => (
                        <div key={category}>
                          <div className="px-4 py-2.5 bg-neutral-50 dark:bg-white/5 border-b border-neutral-100 dark:border-white/10">
                            <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                              {getCategoryLabel(category as SearchCategory)}
                            </p>
                          </div>
                          {items.map((result) => (
                            <button
                              key={result.id}
                              onClick={() => handleMagnifyingGlassSelect(result)}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors text-left"
                            >
                              <div className="w-9 h-9 bg-neutral-100 dark:bg-white/10 rounded-full flex items-center justify-center text-neutral-500 dark:text-neutral-400">
                                {getCategoryIcon(result.category)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-medium text-neutral-900 dark:text-white truncate">
                                  {result.title}
                                </p>
                                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
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
                    <div className="px-4 py-10 text-center">
                      <div className="w-12 h-12 bg-neutral-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <MagnifyingGlass className="w-5 h-5 text-neutral-400" />
                      </div>
                      <p className="text-[13px] text-neutral-600 dark:text-neutral-300 font-medium">
                        {t('common.noResults')}
                      </p>
                      <p className="text-[12px] text-neutral-400 mt-1">
                        {locale === 'es' ? `No encontramos "${searchQuery}"` : `We couldn't find "${searchQuery}"`}
                      </p>
                    </div>
                  )
                ) : (
                  // Show quick links and recent searches
                  <div>
                    {/* Quick Links */}
                    <div className="px-4 py-2.5 bg-neutral-50 dark:bg-white/5 border-b border-neutral-100 dark:border-white/10">
                      <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        {locale === 'es' ? 'Accesos rápidos' : 'Quick Links'}
                      </p>
                    </div>
                    {quickLinks.map((link) => (
                      <button
                        key={link.id}
                        onClick={() => handleMagnifyingGlassSelect(link)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors text-left"
                      >
                        <div className="w-9 h-9 bg-neutral-100 dark:bg-white/10 rounded-full flex items-center justify-center text-neutral-500 dark:text-neutral-400">
                          {getCategoryIcon(link.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-neutral-900 dark:text-white">
                            {link.title}
                          </p>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                            {link.subtitle}
                          </p>
                        </div>
                      </button>
                    ))}

                    {/* Recent MagnifyingGlasses */}
                    {recentSearches.length > 0 && (
                      <>
                        <div className="px-4 py-2.5 bg-neutral-50 dark:bg-white/5 border-t border-b border-neutral-100 dark:border-white/10">
                          <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            {locale === 'es' ? 'Búsquedas recientes' : 'Recent MagnifyingGlasses'}
                          </p>
                        </div>
                        {recentSearches.map((search, index) => (
                          <button
                            key={index}
                            onClick={() => setMagnifyingGlassQuery(search)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors text-left"
                          >
                            <Clock className="w-4 h-4 text-neutral-400" />
                            <span className="text-[13px] text-neutral-600 dark:text-neutral-300">{search}</span>
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
        <div className="flex items-center gap-1.5 ml-auto">
          {actions}

          {/* Quick Action Icons - Only for Landlords */}
          {isLandlord && (
            <>
              {/* Subscription Popover */}
              <Popover open={subscriptionOpen} onOpenChange={setSubscriptionOpen}>
                <PopoverTrigger asChild>
                  <button className="relative p-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/10 rounded-full transition-colors">
                    <Lightning className="w-5 h-5 stroke-[1.5px]" />
                    {MOCK_SUBSCRIPTION.planId === 'free' && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full" />
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[calc(100vw-2rem)] sm:w-[340px] p-0 bg-white dark:bg-[#1a1a1c] border border-neutral-200 dark:border-neutral-700 shadow-lg rounded-2xl overflow-hidden"
                  align="end"
                  sideOffset={8}
                >
                  {/* Header */}
                  <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-[#222224]">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[15px] font-semibold text-neutral-900 dark:text-white">Tu Suscripción</h3>
                      <button
                        onClick={() => setSubscriptionOpen(false)}
                        className="text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 transition-colors"
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
                          <Lightning className="w-5 h-5 text-plan-secondary" />
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
                            : `Facturación ${MOCK_SUBSCRIPTION.billingCycle === 'monthly' ? 'mensual' : 'anual'}`
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
                        className="block w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-medium text-center rounded-xl transition-colors"
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
                      Gestionar suscripción
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
                  <button className="relative p-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/10 rounded-full transition-colors">
                    <UserPlus className="w-5 h-5 stroke-[1.5px]" />
                    {pendingInvites.length > 0 && (
                      <span className="absolute top-0 right-0 w-4 h-4 bg-indigo-500 text-white text-[9px] font-medium flex items-center justify-center rounded-full">
                        {pendingInvites.length}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[calc(100vw-2rem)] sm:w-[380px] p-0 bg-white dark:bg-[#1a1a1c] border border-neutral-200 dark:border-neutral-700 shadow-lg rounded-2xl overflow-hidden"
                  align="end"
                  sideOffset={8}
                >
                  {/* Header */}
                  <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-[#222224]">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[15px] font-semibold text-neutral-900 dark:text-white">Invitar al Equipo</h3>
                      <button
                        onClick={() => setTeamInviteOpen(false)}
                        className="text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-[12px] text-neutral-500 dark:text-neutral-400 mt-1">
                      Colabora con tu equipo en la gestión de propiedades
                    </p>
                  </div>

                  <div className="p-5">
                    {inviteSent ? (
                      /* Success state */
                      <div className="text-center py-4">
                        <div className="w-12 h-12 bg-plan-status-green-bg rounded-full flex items-center justify-center mx-auto mb-3">
                          <Check className="w-6 h-6 text-green-800" />
                        </div>
                        <p className="text-[14px] font-medium text-plan-primary">Invitación enviada</p>
                        <p className="text-[12px] text-plan-secondary mt-1">
                          Se envió un correo a {inviteEmail}
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
                            Correo electrónico
                          </label>
                          <div className="relative">
                            <Envelope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-plan-muted" />
                            <input
                              type="email"
                              value={inviteEmail}
                              onChange={(e) => { setInviteEmail(e.target.value); setInviteEmailError(''); }}
                              onBlur={() => { if (inviteEmail && !isValidEmail(inviteEmail)) setInviteEmailError('Ingresa un correo válido'); }}
                              placeholder="correo@ejemplo.com"
                              aria-label="Correo electrónico para invitación"
                              className={cn(
                                "w-full h-10 pl-9 pr-4 bg-muted border text-[13px] placeholder:text-plan-muted focus:outline-none focus:ring-1",
                                inviteEmailError ? 'border-red-400 focus:ring-red-400' : 'border-plan-border focus:ring-plan-primary'
                              )}
                            />
                          </div>
                          {inviteEmailError && (
                            <p className="text-xs text-red-500 mt-1">{inviteEmailError}</p>
                          )}
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
                                    <div className="w-2 h-2 rounded-full bg-primary" />
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
                            if (!inviteEmail || !isValidEmail(inviteEmail)) return;
                            setInviteSent(true);
                          }}
                          disabled={!inviteEmail || !isValidEmail(inviteEmail)}
                          className={cn(
                            'w-full py-2.5 text-[13px] font-medium text-center rounded-xl transition-colors',
                            inviteEmail && isValidEmail(inviteEmail)
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                              : 'bg-muted text-plan-muted cursor-not-allowed'
                          )}
                        >
                          Enviar Invitación
                        </button>
                      </>
                    )}

                    {/* Current team preview */}
                    {teamMembers.length > 1 && !inviteSent && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-[11px] font-normal text-plan-muted font-mono uppercase tracking-wide mb-2">
                          Equipo actual ({teamMembers.length})
                        </p>
                        <div className="flex -space-x-2">
                          {teamMembers.slice(0, 5).map((member) => (
                            <div
                              key={member.id}
                              className="w-8 h-8 rounded-full bg-muted border-2 border-white dark:border-[#1a1a1c] flex items-center justify-center text-[11px] font-medium text-plan-secondary"
                              title={member.name || member.email}
                            >
                              {(member.name || member.email).charAt(0).toUpperCase()}
                            </div>
                          ))}
                          {teamMembers.length > 5 && (
                            <div className="w-8 h-8 rounded-full bg-indigo-600 border-2 border-white dark:border-[#1a1a1c] flex items-center justify-center text-[10px] font-medium text-white">
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
              <button className="relative p-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/10 rounded-full transition-colors">
                <Bell className="w-5 h-5 stroke-[1.5px]" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full ring-2 ring-white" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[calc(100vw-2rem)] sm:w-[420px] p-0 bg-white dark:bg-[#1a1a1c] border border-neutral-200 dark:border-white/10 shadow-lg rounded-2xl overflow-hidden"
              align="end"
              sideOffset={8}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-white/10 bg-neutral-50 dark:bg-white/5">
                <h3 className="text-[15px] font-semibold text-neutral-900 dark:text-white">{t('header.notifications')}</h3>
                <button
                  onClick={() => setNotificationsOpen(false)}
                  className="text-plan-muted hover:text-plan-secondary"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1.5 px-5 py-3 border-b border-neutral-100 dark:border-white/10">
                {(['all', 'unread', 'mentions'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'px-3 py-1.5 text-[12px] font-medium rounded-full transition-colors',
                      activeTab === tab
                        ? 'bg-neutral-100 dark:bg-white/10 text-neutral-900 dark:text-white'
                        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-white/5'
                    )}
                  >
                    {tab === 'all' && (locale === 'es' ? 'Todas' : 'All')}
                    {tab === 'unread' && (locale === 'es' ? 'Sin leer' : 'Unread')}
                    {tab === 'mentions' && (locale === 'es' ? 'Menciones' : 'Mentions')}
                    {tab === 'all' && (
                      <span className="ml-1.5 px-1.5 py-0.5 bg-indigo-500 text-white text-[10px] rounded-full">
                        7
                      </span>
                    )}
                  </button>
                ))}
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
                      notification.unread ? 'bg-primary text-white' : 'bg-muted text-plan-secondary'
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
                        <div className="mt-2 px-3 py-2 rounded-sm flex items-center justify-between bg-neutral-100 dark:bg-white/10">
                          <p className="text-[12px] text-neutral-700 dark:!text-white">{notification.message}</p>
                          {notification.hasReply && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setNotificationsOpen(false);
                                router.push(isLandlord ? '/panel/mensajes' : '/inquilino/mensajes');
                              }}
                              className="px-3 py-1 bg-white dark:bg-neutral-700 text-[11px] font-medium text-neutral-900 dark:text-white rounded-sm border border-neutral-200 dark:border-white/20 hover:bg-neutral-50 dark:hover:bg-neutral-600 transition-colors"
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
                          className="mt-2 px-3 py-2 bg-neutral-100 dark:bg-white/10 rounded-sm flex items-center justify-between hover:bg-neutral-200 dark:hover:bg-white/15 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-neutral-500 dark:text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            <span className="text-[12px] text-neutral-700 dark:text-white">{notification.file}</span>
                          </div>
                          <span className="text-[11px] text-neutral-500 dark:text-neutral-400">{notification.fileSize}</span>
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
              <div className="px-5 py-3 border-t border-neutral-100 dark:border-white/10 bg-neutral-50 dark:bg-white/5">
                <button
                  onClick={() => {
                    setNotificationsOpen(false);
                    router.push(isLandlord ? '/panel/notificaciones' : '/inquilino/notificaciones');
                  }}
                  className="w-full text-center text-[13px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                >
                  {t('header.viewAll')}
                </button>
              </div>
            </PopoverContent>
          </Popover>

          {/* User Account Container */}
          <DropdownList>
            <DropdownListTrigger asChild>
              <button className="flex items-center gap-2 py-1.5 pl-1.5 pr-2.5 rounded-full bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/15 transition-colors outline-none">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-900 flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                {/* Subscription badge */}
                {isLandlord ? (
                  <AvatarSubscriptionIndicator
                    variant="landlord"
                    planId={MOCK_SUBSCRIPTION.planId}
                  />
                ) : tenantSubscription ? (
                  <AvatarSubscriptionIndicator
                    variant="tenant"
                    tenantSubscription={tenantSubscription}
                  />
                ) : null}
                <CaretDown className="w-4 h-4 text-neutral-400" />
              </button>
            </DropdownListTrigger>
            <DropdownListContent
              className="w-56 bg-white dark:bg-[#1a1a1c] border border-neutral-200 dark:border-white/10 shadow-lg rounded-2xl p-1.5"
              align="end"
              sideOffset={8}
            >
              <DropdownListLabel className="px-3 py-2">
                <p className="text-[14px] font-medium text-neutral-900 dark:text-white">{user?.name || 'Usuario'}</p>
                <p className="text-[12px] text-neutral-500 dark:text-neutral-400">{user?.email}</p>
                <span className="inline-block mt-1.5 px-2 py-0.5 text-[11px] font-medium rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                  {user?.role === 'agency' ? 'Inmobiliaria' : user?.role === 'landlord' ? 'Propietario' : 'Inquilino'}
                </span>
              </DropdownListLabel>
              <DropdownListSeparator className="bg-neutral-100 dark:bg-white/10 my-1" />
              <DropdownListItem asChild>
                <Link
                  href={user?.role === 'agency' ? "/panel/inmobiliaria/configuracion" : isLandlord ? "/panel/configuracion" : "/inquilino/configuracion"}
                  className="flex items-center gap-3 px-3 py-2 text-[13px] text-neutral-700 dark:!text-white hover:bg-neutral-50 dark:hover:bg-white/10 rounded-full cursor-pointer"
                >
                  <User className="w-4 h-4 stroke-[1.5px] text-neutral-500 dark:!text-neutral-300" />
                  {t('header.profile')}
                </Link>
              </DropdownListItem>
              <DropdownListItem asChild>
                <Link
                  href={user?.role === 'agency' ? "/panel/inmobiliaria/configuracion" : isLandlord ? "/panel/configuracion" : "/inquilino/configuracion"}
                  className="flex items-center gap-3 px-3 py-2 text-[13px] text-neutral-700 dark:!text-white hover:bg-neutral-50 dark:hover:bg-white/10 rounded-full cursor-pointer"
                >
                  <Gear className="w-4 h-4 stroke-[1.5px] text-neutral-500 dark:!text-neutral-300" />
                  {t('header.settings')}
                </Link>
              </DropdownListItem>
              {!isLandlord && (
                <>
                  <DropdownListItem asChild>
                    <Link
                      href="/inquilino/pagos"
                      className="flex items-center gap-3 px-3 py-2 text-[13px] text-neutral-700 dark:!text-white hover:bg-neutral-50 dark:hover:bg-white/10 rounded-full cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4 stroke-[1.5px] text-neutral-500 dark:!text-neutral-300" />
                      {t('nav.payments')}
                    </Link>
                  </DropdownListItem>
                  <DropdownListItem asChild>
                    <Link
                      href="/inquilino/guardados"
                      className="flex items-center gap-3 px-3 py-2 text-[13px] text-neutral-700 dark:!text-white hover:bg-neutral-50 dark:hover:bg-white/10 rounded-full cursor-pointer"
                    >
                      <Heart className="w-4 h-4 stroke-[1.5px] text-neutral-500 dark:!text-neutral-300" />
                      {locale === 'es' ? 'Ver guardados' : 'Saved'}
                    </Link>
                  </DropdownListItem>
                </>
              )}
              {isLandlord && (
                <DropdownListItem asChild>
                  <Link
                    href="/panel/upgrade"
                    className="flex items-center gap-3 px-3 py-2 text-[13px] text-neutral-700 dark:!text-white hover:bg-neutral-50 dark:hover:bg-white/10 rounded-full cursor-pointer"
                  >
                    <Crown className="w-4 h-4 stroke-[1.5px] text-neutral-500 dark:!text-neutral-300" />
                    {locale === 'es' ? 'Mi Plan' : 'My Plan'}
                  </Link>
                </DropdownListItem>
              )}
              <DropdownListSeparator className="bg-neutral-100 dark:bg-white/10 my-1" />
              <DropdownListItem asChild>
                <Link
                  href="/ayuda"
                  className="flex items-center gap-3 px-3 py-2 text-[13px] text-neutral-700 dark:!text-white hover:bg-neutral-50 dark:hover:bg-white/10 rounded-full cursor-pointer"
                >
                  <Question className="w-4 h-4 stroke-[1.5px] text-neutral-500 dark:!text-neutral-300" />
                  {t('nav.help')}
                </Link>
              </DropdownListItem>
              <DropdownListSeparator className="bg-neutral-100 dark:bg-white/10 my-1" />
              <DropdownListItem
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2 text-[13px] text-red-600 dark:!text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full cursor-pointer"
              >
                <SignOut className="w-4 h-4 stroke-[1.5px]" />
                {t('nav.logout')}
              </DropdownListItem>
            </DropdownListContent>
          </DropdownList>
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
    <div className={cn('px-6 py-5', className)}>
      {breadcrumb && (
        <p className="text-[12px] text-neutral-400 mb-1.5">{breadcrumb}</p>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-[24px] font-semibold text-neutral-900 tracking-tight">{title}</h1>
          {count !== undefined && (
            <span className="text-[13px] text-neutral-500 bg-neutral-100 px-2.5 py-0.5 rounded-full">{count} items</span>
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
