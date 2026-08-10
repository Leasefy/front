'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { MagnifyingGlass, Bell, CaretDown, Lightning, List, UserPlus, User, Gear, SignOut, Question, CreditCard, Check, Crown, Envelope, X, FileText, House, Users, Buildings, Chat, Clock, Heart, Compass, Warning } from '@phosphor-icons/react';
import { SegmentedControl } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { getUserHomeRoute } from '@/lib/auth/role-routes';
import { type ActiveContext } from '@/lib/auth/active-context';
import { ContextSwitcher } from './ContextSwitcher';
import { useI18n } from '@/lib/i18n';
import { getPlanById, PLANS } from '@/lib/constants/subscription-plans';
import { useMySubscription } from '@/lib/hooks/useSubscription';
import { useAgencySubscription } from '@/lib/hooks/useAgencySubscription';
import { useLandlordNotifications, useTenantNotifications } from '@/lib/hooks/useNotifications';
import { useArcoAlerts } from '@/lib/hooks/cobranza/use-arco-alerts';
import { ArcoDeadlineAlert } from '@/components/inmobiliaria/cobranza/ArcoDeadlineAlert';
import { LANDLORD_CATEGORIES, TENANT_CATEGORIES, formatNotificationTime } from '@/lib/types/notification';
import type { BaseNotification, LandlordNotificationCategory, TenantNotificationCategory } from '@/lib/types/notification';
import { AvatarSubscriptionIndicator } from './SubscriptionBadge';
import { openPlanMobileSidebar } from './PlanSidebar';
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext';
import { usePanelPrefsSafe } from '@/lib/context/PanelPrefsContext';
import type { TenantSubscriptionTextT } from '@/lib/context/TenantProfileContext';
import { TEAM_ROLES, AGENTE_TEAM_ENTRY, type TeamRole } from '@/lib/types/team';
import { inmobiliariaConfigApi } from '@/lib/api/inmobiliaria.service';
import { useAgencyUsers } from '@/lib/hooks/useInmobiliaria';
import { toast } from 'sonner';
import {
  searchData,
  groupSearchResults,
  getCategoryLabel,
  getRecentSearches,
  getQuickLinks,
  type SearchCategory,
  type SearchResult,
} from '@/lib/constants/search-data';
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
  /** Optional element rendered in the empty left zone (e.g. a contextual
   *  breadcrumb). Sits after the mobile-menu trigger and before the right
   *  cluster. Self-hides when omitted. */
  leftSlot?: React.ReactNode;
}

// Get category label for notification popover
function getNotifCategoryLabel(category: string, isLandlord: boolean): string {
  if (isLandlord) {
    return LANDLORD_CATEGORIES[category as LandlordNotificationCategory]?.label ?? category;
  }
  return TENANT_CATEGORIES[category as TenantNotificationCategory]?.label ?? category;
}

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
  leftSlot,
}: PlanHeaderProps) {
  const { user, logout, agency, hasActiveAgencyMembership, activeContext, setActiveContext } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { t, locale } = useI18n();
  // Context switcher navigation: persist the chosen context, then route.
  const handleSwitchContext = (ctx: ActiveContext) => {
    setActiveContext(ctx);
    router.push(ctx === 'agency' ? '/panel/inmobiliaria' : getUserHomeRoute(user, 'personal'));
  };
  const [searchQuery, setMagnifyingGlassQuery] = useState('');
  const [searchFocused, setMagnifyingGlassFocused] = useState(false);
  // Mobile (<sm) search pattern: the inline input is hidden and replaced by an
  // icon button that toggles an absolute full-width search row under the header.
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [teamInviteOpen, setTeamInviteOpen] = useState(false);
  const [activeTab, setNotifTab] = useState<'all' | 'unread'>('all');
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteEmailError, setInviteEmailError] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('viewer');
  const [inviteSent, setInviteSent] = useState(false);
  // true when the member row was created but the invitation email failed to send.
  const [inviteEmailUndelivered, setInviteEmailUndelivered] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchBtnRef = useRef<HTMLButtonElement>(null);

  // Context detection — both landlord and inmobiliaria live under /panel.
  // `isLandlord` intentionally covers BOTH (same UI chrome: notifications, search, quick actions).
  // Use `isInmobiliaria` only where the two diverge — routing, plan CTAs, etc.
  const isInmobiliaria = pathname?.startsWith('/panel/inmobiliaria') ?? false;
  const isLandlord = pathname?.startsWith('/panel') ?? false;

  // In the inmobiliaria context, only admins can invite members or upgrade the plan.
  // Outside inmobiliaria (landlord/tenant), always show these actions.
  const permsCtx = usePermissionsContextSafe();
  const canShowAdminActions = !isInmobiliaria || (permsCtx?.isAdmin ?? false);

  // Phase 38 plan 38-06 (D-38-07) — PanelPrefsContext is only mounted under
  // /panel/inmobiliaria/*, so this header (rendered across multiple layouts)
  // must use the safe variant and gate the "Tour del panel" link on its
  // presence. relaunchTour is session-only (no localStorage / DB write).
  const panelPrefs = usePanelPrefsSafe();

  // Route destinations depend on context
  const upgradePlanHref = isInmobiliaria ? '/panel/inmobiliaria/upgrade' : '/panel/upgrade';
  const manageSubscriptionHref = isInmobiliaria ? '/panel/inmobiliaria/configuracion' : '/panel/configuracion';

  // Real notifications from API. Only the active role subscribes/fetches — the
  // inactive hook is disabled so we don't double-fetch or collide on the
  // `notifications:{userId}` realtime channel.
  const landlordNotifs = useLandlordNotifications({ enabled: isLandlord });
  const tenantNotifs = useTenantNotifications({ enabled: !isLandlord });
  const activeNotifs = isLandlord ? landlordNotifs : tenantNotifs;
  const notifications = activeNotifs.notifications as BaseNotification[];
  const unreadCount = activeNotifs.unreadCount;

  // Plazos ARCO (Habeas Data). Sólo en el panel de inmobiliaria y sólo con
  // acceso al módulo de cobranza — el hook ya se gatea solo y no dispara ni un
  // fetch fuera de ese caso, así que landlord/tenant no pagan nada por esto.
  // Van fijos arriba de la lista, no mezclados: ver ArcoDeadlineAlert.
  const arcoAlerts = useArcoAlerts(isInmobiliaria);

  const handleNotificationClick = (notification: BaseNotification) => {
    if (!notification.read) {
      activeNotifs.markAsRead(notification.id).catch(() => {
        toast.error(t('header.notificationActionError'));
      });
    }
    setNotificationsOpen(false);
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  // Get subscription data
  const {
    subscription,
    error: subscriptionError,
    refetch: subscriptionRefetch,
  } = useMySubscription();
  // In the agency context, read the REAL agency subscription (the system the
  // payment actually activates) instead of the legacy per-user /subscriptions/me,
  // so the header reflects the plan the agency pays for. Landlord/tenant keep the
  // legacy source (hook disabled there → no wasted /inmobiliaria/subscription call).
  const { currentPlanId: agencyPlanId, error: agencyError } =
    useAgencySubscription(isInmobiliaria);
  const effectiveSubError = isInmobiliaria ? agencyError : subscriptionError;

  // Keep 'starter' as a silent fallback for avatar badge styling only.
  // Never use planId for plan-name display when the subscription failed to load.
  const planId = isInmobiliaria
    ? agencyError
      ? 'starter'
      : agencyPlanId ?? 'starter'
    : subscription?.planId ?? 'starter';
  const currentPlan = getPlanById(planId);

  // Tier helpers — false when error to avoid asserting a tier we didn't load.
  const isBaseTier = !effectiveSubError && planId === 'starter';
  const isTopTier = !effectiveSubError && planId === 'flex';
  // Real agency roster (GET /inmobiliaria/agency/members) — matches the endpoint
  // the invite form below posts to. Only fetched in the inmobiliaria context;
  // `skip` avoids a wasted/failing call for landlord/tenant headers.
  const { users: teamMembers, refetch: refetchTeam } = useAgencyUsers(isInmobiliaria);
  const pendingInvites = teamMembers.filter((m) => m.status === 'invited');

  // MagnifyingGlass functionality
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const results = searchData(searchQuery, isLandlord);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
    // Reset keyboard navigation whenever the query / result set changes.
    setActiveIndex(-1);
  }, [searchQuery, isLandlord]);

  // Close search on click outside (the mobile toggle button is excluded so it
  // can toggle the row without the outside-click handler racing it closed).
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        searchRef.current &&
        !searchRef.current.contains(target) &&
        !mobileSearchBtnRef.current?.contains(target)
      ) {
        setMagnifyingGlassFocused(false);
        setMobileSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus the input when the mobile search row opens.
  useEffect(() => {
    if (mobileSearchOpen) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [mobileSearchOpen]);

  const handleMagnifyingGlass = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMagnifyingGlassQuery(value);
    onMagnifyingGlass?.(value);
  };

  const handleMagnifyingGlassSelect = (result: SearchResult) => {
    setMagnifyingGlassQuery('');
    setMagnifyingGlassFocused(false);
    setMobileSearchOpen(false);
    router.push(result.href);
  };

  const groupedResults = groupSearchResults(searchResults, isLandlord);
  const recentSearches = getRecentSearches(isLandlord);
  const quickLinks = getQuickLinks(isLandlord);

  // Flatten the navigable items in render order so ArrowUp/ArrowDown index math
  // matches what the listbox shows. When the query is < 2 chars we show quick
  // links; otherwise we show the grouped results (recent searches are not
  // included here because they re-fill the query rather than navigate).
  const flatResults: SearchResult[] =
    searchQuery.length >= 2
      ? Object.values(groupedResults).flat()
      : quickLinks;
  const activeOptionId =
    activeIndex >= 0 && flatResults[activeIndex]
      ? `plan-search-opt-${flatResults[activeIndex].id}`
      : undefined;

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (flatResults.length === 0) return;
      setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (flatResults.length === 0) return;
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && flatResults[activeIndex]) {
        e.preventDefault();
        handleMagnifyingGlassSelect(flatResults[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setMagnifyingGlassFocused(false);
      setMobileSearchOpen(false);
      setActiveIndex(-1);
      e.currentTarget.blur();
    }
  };

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

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      window.location.replace('/auth');
    }
  };

  return (
    <header className={cn('sticky top-0 z-30 bg-bg border-b border-border', className)}>
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        {/* Left: mobile menu trigger + MagnifyingGlass */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {/* Mobile nav trigger — opens PlanSidebar's Sheet (sidebar is hidden below lg) */}
          <button
            type="button"
            onClick={openPlanMobileSidebar}
            aria-label={locale === 'es' ? 'Abrir menú de navegación' : 'Open navigation menu'}
            className="lg:hidden flex h-11 w-11 flex-shrink-0 items-center justify-center -ml-1.5 rounded-xl text-fg-muted hover:text-fg hover:bg-surface-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <List className="w-5 h-5" />
          </button>

        {/* Contextual left slot (e.g. agent breadcrumb). Truncates so it never
            pushes the right-side cluster off-screen. */}
        {leftSlot && <div className="min-w-0 flex-1 truncate">{leftSlot}</div>}

        {showMagnifyingGlass && (
          <div
            ref={searchRef}
            className={cn(
              // sm+: inline relative container, exactly as before
              'sm:relative sm:inset-auto sm:top-auto sm:z-auto sm:block sm:w-full sm:max-w-[400px] sm:border-b-0 sm:bg-transparent sm:px-0 sm:py-0',
              // <sm: hidden behind an icon toggle; when open, an absolute
              // full-width row directly under the header (anchored to the
              // sticky <header>, the nearest positioned ancestor)
              mobileSearchOpen
                ? 'absolute inset-x-0 top-full z-40 border-b border-border bg-surface px-4 py-2'
                : 'hidden'
            )}
          >
            <div className="relative">
            <MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle z-10" />
            <input
              ref={searchInputRef}
              type="text"
              role="combobox"
              aria-expanded={searchFocused}
              aria-controls="plan-search-listbox"
              aria-autocomplete="list"
              aria-activedescendant={activeOptionId}
              aria-label={isLandlord
                ? (locale === 'es' ? "Buscar propiedades, candidatos..." : "Search properties, candidates...")
                : t('header.search')}
              value={searchQuery}
              onChange={handleMagnifyingGlass}
              onFocus={() => setMagnifyingGlassFocused(true)}
              onKeyDown={handleSearchKeyDown}
              placeholder={isLandlord
                ? (locale === 'es' ? "Buscar propiedades, candidatos..." : "Search properties, candidates...")
                : t('header.search')}
              className={cn(
                'w-full h-10 pl-10 pr-4',
                'bg-surface-muted border border-border rounded-full',
                'text-[14px] text-fg placeholder:text-fg-subtle',
                'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 focus:bg-surface',
                'transition-colors'
              )}
            />
            </div>

            {/* MagnifyingGlass Dropdown */}
            {searchFocused && (
              <div
                id="plan-search-listbox"
                role="listbox"
                className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border shadow-lg rounded-xl max-h-[min(400px,60dvh)] overflow-y-auto overscroll-contain z-50 overflow-hidden">
                {searchQuery.length >= 2 ? (
                  // Show search results
                  searchResults.length > 0 ? (
                    <div>
                      {Object.entries(groupedResults).map(([category, items]) => (
                        <div key={category}>
                          <div className="px-4 py-2.5 bg-surface-muted border-b border-border-faint">
                            <p className="text-[11px] font-medium text-fg-muted uppercase tracking-wider">
                              {getCategoryLabel(category as SearchCategory)}
                            </p>
                          </div>
                          {items.map((result) => {
                            const optIndex = flatResults.indexOf(result);
                            const isActive = optIndex === activeIndex;
                            return (
                            <button
                              key={result.id}
                              id={`plan-search-opt-${result.id}`}
                              role="option"
                              aria-selected={isActive}
                              onClick={() => handleMagnifyingGlassSelect(result)}
                              onMouseEnter={() => setActiveIndex(optIndex)}
                              className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 transition-colors text-left",
                                isActive ? "bg-surface-muted" : "hover:bg-surface-muted"
                              )}
                            >
                              <div className="w-9 h-9 bg-surface-muted rounded-full flex items-center justify-center text-fg-muted">
                                {getCategoryIcon(result.category)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-medium text-fg truncate">
                                  {result.title}
                                </p>
                                <p className="text-[11px] text-fg-muted truncate">
                                  {result.subtitle}
                                </p>
                              </div>
                            </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  ) : (
                    // No results
                    <div className="px-4 py-10 text-center">
                      <div className="w-12 h-12 bg-surface-muted rounded-full flex items-center justify-center mx-auto mb-3">
                        <MagnifyingGlass className="w-5 h-5 text-fg-subtle" />
                      </div>
                      <p className="text-[13px] text-fg-muted font-medium">
                        {t('common.noResults')}
                      </p>
                      <p className="text-[12px] text-fg-subtle mt-1">
                        {locale === 'es' ? `No encontramos "${searchQuery}"` : `We couldn't find "${searchQuery}"`}
                      </p>
                    </div>
                  )
                ) : (
                  // Show quick links and recent searches
                  <div>
                    {/* Quick Links */}
                    <div className="px-4 py-2.5 bg-surface-muted border-b border-border-faint">
                      <p className="text-[11px] font-medium text-fg-muted uppercase tracking-wider">
                        {locale === 'es' ? 'Accesos rápidos' : 'Quick Links'}
                      </p>
                    </div>
                    {quickLinks.map((link) => {
                      const optIndex = flatResults.indexOf(link);
                      const isActive = optIndex === activeIndex;
                      return (
                      <button
                        key={link.id}
                        id={`plan-search-opt-${link.id}`}
                        role="option"
                        aria-selected={isActive}
                        onClick={() => handleMagnifyingGlassSelect(link)}
                        onMouseEnter={() => setActiveIndex(optIndex)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 transition-colors text-left",
                          isActive ? "bg-surface-muted" : "hover:bg-surface-muted"
                        )}
                      >
                        <div className="w-9 h-9 bg-surface-muted rounded-full flex items-center justify-center text-fg-muted">
                          {getCategoryIcon(link.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-fg">
                            {link.title}
                          </p>
                          <p className="text-[11px] text-fg-muted">
                            {link.subtitle}
                          </p>
                        </div>
                      </button>
                      );
                    })}

                    {/* Recent MagnifyingGlasses */}
                    {recentSearches.length > 0 && (
                      <>
                        <div className="px-4 py-2.5 bg-surface-muted border-t border-b border-border-faint">
                          <p className="text-[11px] font-medium text-fg-muted uppercase tracking-wider">
                            {locale === 'es' ? 'Búsquedas recientes' : 'Recent searches'}
                          </p>
                        </div>
                        {recentSearches.map((search, index) => (
                          <button
                            key={index}
                            onClick={() => setMagnifyingGlassQuery(search)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-muted transition-colors text-left"
                          >
                            <Clock className="w-4 h-4 text-fg-subtle" />
                            <span className="text-[13px] text-fg-muted">{search}</span>
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
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
          {/* Mobile search toggle — replaces the inline input below sm */}
          {showMagnifyingGlass && (
            <button
              ref={mobileSearchBtnRef}
              type="button"
              onClick={() => setMobileSearchOpen((open) => !open)}
              aria-label={locale === 'es' ? 'Buscar' : 'Search'}
              aria-expanded={mobileSearchOpen}
              className="sm:hidden flex h-11 w-11 items-center justify-center rounded-xl text-fg-muted hover:text-fg hover:bg-surface-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <MagnifyingGlass className="w-5 h-5" />
            </button>
          )}
          {actions}

          {/* Quick Action Icons - Only for Landlords */}
          {isLandlord && (
            <>
              {/* Subscription Popover — admin-only in inmobiliaria context */}
              {canShowAdminActions && <Popover open={subscriptionOpen} onOpenChange={setSubscriptionOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label={locale === 'es' ? 'Tu suscripción' : 'Your subscription'}
                    className="relative inline-flex items-center justify-center p-2 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11 text-fg-muted hover:text-fg hover:bg-surface-muted rounded-xl transition-colors"
                  >
                    <Lightning className="w-5 h-5 stroke-[1.5px]" />
                    {isBaseTier && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-[#1A40FF] rounded-full" />
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[calc(100vw-2rem)] sm:w-[340px] p-0 bg-surface border border-border shadow-lg rounded-xl overflow-hidden"
                  align="end"
                  sideOffset={8}
                >
                  {/* Header */}
                  <div className="px-5 py-4 border-b border-border-faint bg-surface-muted">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[15px] font-semibold text-fg">Tu Suscripción</h3>
                      <button
                        onClick={() => setSubscriptionOpen(false)}
                        aria-label={t('common.close')}
                        className="text-fg-subtle hover:text-fg-muted transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Current Plan */}
                  <div className="p-5">
                    {subscriptionError ? (
                      /* Honest error state — do not assert a plan name we could not load */
                      <div className="flex flex-col items-center gap-3 py-2 text-center">
                        <p className="text-[13px] text-fg-muted">
                          No pudimos cargar tu plan
                        </p>
                        <button
                          type="button"
                          onClick={subscriptionRefetch}
                          className="text-[12px] font-medium text-[#1A40FF] dark:text-[#5570FF] hover:underline"
                        >
                          Reintentar
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 mb-4">
                          <div className={cn(
                            'w-10 h-10 flex items-center justify-center rounded-sm',
                            isBaseTier ? 'bg-muted' : 'bg-plan-primary'
                          )}>
                            {isBaseTier ? (
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
                              {isBaseTier
                                ? 'Funciones limitadas'
                                : `Facturación ${subscription?.billingCycle === 'monthly' ? 'mensual' : 'anual'}`
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
                                feature.included ? 'bg-plan-status-green-bg text-[#2C7A53]' : 'bg-muted text-plan-muted'
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

                        {/* Upgrade CTA — hide only when already on the top tier */}
                        {!isTopTier && (
                          <Link
                            href={upgradePlanHref}
                            onClick={() => setSubscriptionOpen(false)}
                            className="block w-full py-2.5 bg-[#1A40FF] hover:opacity-90 text-white text-[12px] font-semibold text-center rounded-xl transition-colors"
                          >
                            {isBaseTier ? 'Mejorar Plan' : 'Ver Planes'}
                          </Link>
                        )}
                      </>
                    )}

                    {/* Manage subscription — always visible */}
                    <Link
                      href={manageSubscriptionHref}
                      onClick={() => setSubscriptionOpen(false)}
                      className="block mt-3 text-center text-[13px] font-medium text-fg-muted hover:text-fg underline underline-offset-2 decoration-border-strong hover:decoration-fg-muted transition-colors"
                    >
                      Gestionar suscripción
                    </Link>
                  </div>
                </PopoverContent>
              </Popover>}

              {/* Team Invite Popover — admin-only in inmobiliaria context */}
              {canShowAdminActions && <Popover open={teamInviteOpen} onOpenChange={(open) => {
                setTeamInviteOpen(open);
                if (!open) {
                  setInviteEmail('');
                  setInviteRole('viewer');
                  setInviteSent(false);
                }
              }}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label={locale === 'es' ? 'Invitar a tu equipo' : 'Invite your team'}
                    className="relative inline-flex items-center justify-center p-2 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11 text-fg-muted hover:text-fg hover:bg-surface-muted rounded-xl transition-colors"
                  >
                    <UserPlus className="w-5 h-5 stroke-[1.5px]" />
                    {pendingInvites.length > 0 && (
                      <span className="absolute top-0 right-0 w-4 h-4 bg-[#1A40FF] text-white uppercase tracking-wide font-mono text-[9px] font-medium flex items-center justify-center rounded-full">
                        {pendingInvites.length}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[calc(100vw-2rem)] sm:w-[380px] p-0 bg-surface border border-border shadow-lg rounded-xl overflow-hidden"
                  align="end"
                  sideOffset={8}
                >
                  {/* Header */}
                  <div className="px-5 py-4 border-b border-border-faint bg-surface-muted">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[15px] font-semibold text-fg">Invitar al Equipo</h3>
                      <button
                        onClick={() => setTeamInviteOpen(false)}
                        aria-label={t('common.close')}
                        className="text-fg-subtle hover:text-fg-muted transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-[12px] text-fg-muted mt-1">
                      Colabora con tu equipo en la gestión de propiedades
                    </p>
                  </div>

                  <div className="p-5">
                    {inviteSent ? (
                      /* Result state — success or partial-success (email not delivered) */
                      <div className="text-center py-4">
                        {inviteEmailUndelivered ? (
                          <>
                            <div className="w-12 h-12 bg-warning-soft rounded-full flex items-center justify-center mx-auto mb-3">
                              <Warning className="w-6 h-6 text-warning" />
                            </div>
                            <p className="text-[14px] font-medium text-plan-primary">Invitación creada</p>
                            <p className="text-[12px] text-plan-secondary mt-1">
                              No pudimos enviar el correo a {inviteEmail}. Usa &quot;Reenviar invitación&quot; o verifica la dirección.
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="w-12 h-12 bg-plan-status-green-bg rounded-full flex items-center justify-center mx-auto mb-3">
                              <Check className="w-6 h-6 text-[#2C7A53]" />
                            </div>
                            <p className="text-[14px] font-medium text-plan-primary">Invitación enviada</p>
                            <p className="text-[12px] text-plan-secondary mt-1">
                              Se envió un correo a {inviteEmail}
                            </p>
                          </>
                        )}
                        <button
                          onClick={() => {
                            setInviteSent(false);
                            setInviteEmailUndelivered(false);
                            setInviteName('');
                            setInviteEmail('');
                            setInviteRole('viewer');
                          }}
                          className="mt-4 text-[13px] text-plan-secondary hover:text-plan-primary"
                        >
                          Invitar a otra persona
                        </button>
                      </div>
                    ) : (
                      /* Invite form */
                      <>
                        {/* Name input */}
                        <div className="mb-4">
                          <label className="block text-[12px] font-medium text-foreground mb-1.5">
                            Nombre
                          </label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-plan-muted" />
                            <input
                              type="text"
                              value={inviteName}
                              onChange={(e) => setInviteName(e.target.value)}
                              placeholder="Nombre del colaborador"
                              aria-label="Nombre del colaborador"
                              className="w-full h-10 pl-9 pr-4 bg-muted border border-plan-border rounded-xl text-[13px] placeholder:text-plan-muted focus:outline-none focus:ring-1 focus:ring-plan-primary"
                            />
                          </div>
                        </div>

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
                                "w-full h-10 pl-9 pr-4 bg-muted border rounded-xl text-[13px] placeholder:text-plan-muted focus:outline-none focus:ring-1",
                                inviteEmailError ? 'border-[#C4503B]/30 focus:ring-[#C4503B]' : 'border-plan-border focus:ring-plan-primary'
                              )}
                            />
                          </div>
                          {inviteEmailError && (
                            <p className="text-xs text-[#C4503B] mt-1">{inviteEmailError}</p>
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
                                  'w-full flex items-start gap-3 p-3 text-left border rounded-xl transition-all',
                                  inviteRole === role.id
                                    ? 'border-[#1A40FF]/30 dark:border-[#1A40FF]/40 bg-[#EEF1FF]/50 dark:bg-[#1A40FF]/20'
                                    : 'border-border hover:border-border-strong'
                                )}
                              >
                                <div className={cn(
                                  'w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 transition-colors',
                                  inviteRole === role.id ? 'border-[#1A40FF]/30 dark:border-[#1A40FF]/40' : 'border-border-strong'
                                )}>
                                  {inviteRole === role.id && (
                                    <div className="w-2 h-2 rounded-full bg-[#1A40FF] dark:bg-[#5570FF]" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="text-[13px] font-medium text-plan-primary">{role.name}</p>
                                  <p className="text-[11px] text-plan-secondary">{role.description}</p>
                                </div>
                              </button>
                            ))}

                            {/* Agente — redirige a /panel/inmobiliaria/agentes */}
                            <button
                              onClick={() => {
                                setTeamInviteOpen(false);
                                router.push(AGENTE_TEAM_ENTRY.redirectTo);
                              }}
                              className="w-full flex items-start gap-3 p-3 text-left border rounded-xl transition-all border-border hover:border-border-strong"
                            >
                              <div className="w-4 h-4 rounded-full border-2 border-border-strong flex items-center justify-center mt-0.5" />
                              <div className="flex-1">
                                <p className="text-[13px] font-medium text-plan-primary">{AGENTE_TEAM_ENTRY.name}</p>
                                <p className="text-[11px] text-plan-secondary">{AGENTE_TEAM_ENTRY.description}</p>
                              </div>
                            </button>
                          </div>
                        </div>

                        {/* Submit */}
                        <button
                          onClick={async () => {
                            if (!inviteEmail || !isValidEmail(inviteEmail)) return;
                            setInviteLoading(true);
                            try {
                              const result = await inmobiliariaConfigApi.inviteUser({
                                email: inviteEmail,
                                name: inviteName.trim(),
                                role: inviteRole,
                              });
                              setInviteEmailUndelivered(result.emailDelivered === false);
                              setInviteSent(true);
                              void refetchTeam();
                            } catch {
                              toast.error('No se pudo enviar la invitación. Intentá de nuevo.');
                            } finally {
                              setInviteLoading(false);
                            }
                          }}
                          disabled={!inviteEmail || !isValidEmail(inviteEmail) || inviteLoading}
                          className={cn(
                            'w-full py-2.5 text-[12px] font-semibold text-center rounded-xl transition-colors flex items-center justify-center gap-2',
                            inviteEmail && isValidEmail(inviteEmail) && !inviteLoading
                              ? 'bg-[#1A40FF] hover:opacity-90 text-white'
                              : 'bg-muted text-plan-muted cursor-not-allowed'
                          )}
                        >
                          {inviteLoading ? (
                            <>
                              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                              </svg>
                              Enviando...
                            </>
                          ) : (
                            'Enviar Invitación'
                          )}
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
                              className="w-8 h-8 rounded-full bg-muted border-2 border-surface-raised flex items-center justify-center text-[11px] font-medium text-plan-secondary"
                              title={member.name || member.email}
                            >
                              {(member.name || member.email).charAt(0).toUpperCase()}
                            </div>
                          ))}
                          {teamMembers.length > 5 && (
                            <div className="w-8 h-8 rounded-full bg-[#1A40FF] border-2 border-surface-raised flex items-center justify-center text-[10px] font-medium text-white uppercase tracking-wide font-mono">
                              +{teamMembers.length - 5}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>}
            </>
          )}

          {/* Notifications */}
          <Popover
            open={notificationsOpen}
            onOpenChange={(open) => {
              setNotificationsOpen(open);
              // Fetch fresh notifications whenever the popover opens
              if (open) activeNotifs.refetch();
            }}
          >
            <PopoverTrigger asChild>
              <button
                    type="button"
                    aria-label={locale === 'es' ? 'Notificaciones' : 'Notifications'}
                    className="relative inline-flex items-center justify-center p-2 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11 text-fg-muted hover:text-fg hover:bg-surface-muted rounded-xl transition-colors"
                  >
                <Bell className="w-5 h-5 stroke-[1.5px]" />
                {/* Un plazo ARCO vencido pinta el punto en rojo: es la única
                    condición del panel con consecuencia legal, así que gana
                    sobre el punto azul de "hay algo sin leer". */}
                {(arcoAlerts.all.length > 0 || unreadCount > 0) && (
                  <span
                    className={cn(
                      'absolute top-1 right-1 w-2.5 h-2.5 rounded-full ring-2 ring-bg',
                      arcoAlerts.hasOverdue
                        ? 'bg-danger'
                        : arcoAlerts.all.length > 0
                          ? 'bg-warning'
                          : 'bg-primary'
                    )}
                  />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[calc(100vw-2rem)] sm:w-[420px] p-0 bg-surface border border-border shadow-lg rounded-xl overflow-hidden"
              align="end"
              sideOffset={8}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border-faint bg-surface-muted">
                <h3 className="text-[15px] font-semibold text-fg">{t('header.notifications')}</h3>
                <button
                  onClick={() => setNotificationsOpen(false)}
                  aria-label={t('common.close')}
                  className="text-plan-muted hover:text-plan-secondary"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Plazos ARCO — fijos arriba, fuera de las pestañas leído/sin leer. */}
              <ArcoDeadlineAlert
                alerts={arcoAlerts}
                onNavigate={() => setNotificationsOpen(false)}
              />

              {/* Tabs — Cadence SegmentedControl */}
              <div className="px-5 py-3 border-b border-border-faint">
                <SegmentedControl
                  value={activeTab}
                  onChange={setNotifTab}
                  aria-label={locale === 'es' ? 'Filtrar notificaciones' : 'Filter notifications'}
                  options={[
                    {
                      value: 'all',
                      label: (
                        <span className="inline-flex items-center">
                          {locale === 'es' ? 'Todas' : 'All'}
                          {notifications.length > 0 && (
                            <span className="ml-1.5 px-1.5 py-0.5 bg-[#1A40FF] text-white uppercase tracking-wide font-mono text-[10px] rounded-full">
                              {notifications.length}
                            </span>
                          )}
                        </span>
                      ),
                    },
                    {
                      value: 'unread',
                      label: (
                        <span className="inline-flex items-center">
                          {locale === 'es' ? 'Sin leer' : 'Unread'}
                          {unreadCount > 0 && (
                            <span className="ml-1.5 px-1.5 py-0.5 bg-[#1A40FF] text-white uppercase tracking-wide font-mono text-[10px] rounded-full">
                              {unreadCount}
                            </span>
                          )}
                        </span>
                      ),
                    },
                  ]}
                />
              </div>

              {/* Notifications List */}
              <div className="max-h-[320px] overflow-y-auto overscroll-contain">
                {activeNotifs.isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-3 px-5 py-4 border-b border-border last:border-0 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-surface-muted flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 bg-surface-muted rounded w-3/4" />
                        <div className="h-3 bg-surface-muted rounded w-1/2" />
                      </div>
                    </div>
                  ))
                ) : (activeTab === 'unread' ? notifications.filter(n => !n.read) : notifications).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Bell className="w-8 h-8 text-fg-subtle mb-2" />
                    <p className="text-[13px] text-fg-muted">
                      {activeTab === 'unread'
                        ? (locale === 'es' ? 'No tienes notificaciones sin leer' : 'No unread notifications')
                        : (locale === 'es' ? 'No tienes notificaciones' : 'No notifications')}
                    </p>
                  </div>
                ) : (
                  (activeTab === 'unread' ? notifications.filter(n => !n.read) : notifications).map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      'group flex gap-3 px-5 py-4 hover:bg-muted transition-colors border-b border-border last:border-0',
                      !notification.read && 'bg-muted'
                    )}
                  >
                    {/* Avatar */}
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm flex-shrink-0 cursor-pointer',
                        !notification.read ? 'bg-primary text-primary-fg uppercase tracking-wide font-mono' : 'bg-muted text-plan-secondary'
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      {notification.title.charAt(0).toUpperCase()}
                    </div>

                    {/* Content */}
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <p className={cn(
                        'text-[13px] text-plan-primary line-clamp-2',
                        !notification.read && 'font-medium'
                      )}>
                        {notification.title}
                      </p>
                      {notification.message && (
                        <p className="text-[12px] text-plan-muted mt-0.5 line-clamp-1">
                          {notification.message}
                        </p>
                      )}
                      <p className="text-[12px] text-plan-muted mt-0.5">
                        {formatNotificationTime(notification.createdAt)}
                        {' • '}
                        <span>{getNotifCategoryLabel(notification.category, !!isLandlord)}</span>
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 flex items-center">
                      {!notification.read ? (
                        <div className="w-2 h-2 rounded-full bg-plan-status-blue" />
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            activeNotifs.deleteNotification(notification.id).catch(() => {
                              toast.error(t('header.notificationActionError'));
                            });
                          }}
                          className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-sm text-fg-subtle hover:text-danger hover:bg-danger-soft transition-all"
                          title="Eliminar"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))
                )}
              </div>

              {/* View all link */}
              <div className="px-5 py-3 border-t border-border-faint bg-surface-muted">
                <button
                  onClick={() => {
                    setNotificationsOpen(false);
                    router.push(isLandlord ? '/panel/notificaciones' : '/inquilino/notificaciones');
                  }}
                  className="w-full text-center text-[13px] font-medium text-[#1A40FF] dark:text-[#5570FF] hover:text-[#1A40FF] dark:hover:text-[#1A40FF] transition-colors"
                >
                  {t('header.viewAll')}
                </button>
              </div>
            </PopoverContent>
          </Popover>

          {/* User Account Container */}
          <DropdownList>
            <DropdownListTrigger asChild>
              <button className="flex items-center gap-2 py-1.5 pl-1.5 pr-2.5 rounded-xl bg-surface-muted hover:bg-border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full overflow-hidden bg-ink flex items-center justify-center">
                  <span className="text-ink-fg font-medium text-sm">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                {/* Subscription badge */}
                {isLandlord ? (
                  <AvatarSubscriptionIndicator
                    variant="landlord"
                    planId={planId}
                  />
                ) : tenantSubscription ? (
                  <AvatarSubscriptionIndicator
                    variant="tenant"
                    tenantSubscription={tenantSubscription}
                  />
                ) : null}
                <CaretDown className="w-4 h-4 text-fg-subtle" />
              </button>
            </DropdownListTrigger>
            <DropdownListContent
              className="w-56 bg-surface border border-border shadow-lg rounded-xl p-1.5"
              align="end"
              sideOffset={8}
            >
              <DropdownListLabel className="px-3 py-2">
                <p className="text-[14px] font-medium text-fg">{user?.name || 'Usuario'}</p>
                <p className="text-[12px] text-fg-muted">{user?.email}</p>
                <span className="inline-block mt-1.5 px-2 py-0.5 text-[11px] font-medium rounded-full bg-surface-muted text-fg-muted">
                  {user?.role === 'agency' ? 'Inmobiliaria' : user?.role === 'landlord' ? 'Propietario' : 'Inquilino'}
                </span>
              </DropdownListLabel>
              <DropdownListSeparator className="bg-surface-muted my-1" />
              <ContextSwitcher
                user={user}
                agencyName={agency?.name}
                activeContext={activeContext}
                hasActiveAgencyMembership={hasActiveAgencyMembership}
                locale={locale}
                onSwitch={handleSwitchContext}
              />
              <DropdownListItem asChild>
                <Link
                  href={user?.role === 'agency' ? "/panel/inmobiliaria/perfil" : isLandlord ? "/panel/perfil" : "/inquilino/perfil"}
                  className="flex items-center gap-3 px-3 py-2 text-[13px] text-fg hover:bg-surface-muted rounded-xl cursor-pointer"
                >
                  <User className="w-4 h-4 stroke-[1.5px] text-fg-muted" />
                  {t('header.profile')}
                </Link>
              </DropdownListItem>
              <DropdownListItem asChild>
                <Link
                  href={user?.role === 'agency' ? "/panel/inmobiliaria/configuracion" : isLandlord ? "/panel/configuracion" : "/inquilino/configuracion"}
                  className="flex items-center gap-3 px-3 py-2 text-[13px] text-fg hover:bg-surface-muted rounded-xl cursor-pointer"
                >
                  <Gear className="w-4 h-4 stroke-[1.5px] text-fg-muted" />
                  {t('header.settings')}
                </Link>
              </DropdownListItem>
              {!isLandlord && (
                <>
                  <DropdownListItem asChild>
                    <Link
                      href="/inquilino/pagos"
                      className="flex items-center gap-3 px-3 py-2 text-[13px] text-fg hover:bg-surface-muted rounded-xl cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4 stroke-[1.5px] text-fg-muted" />
                      {t('nav.payments')}
                    </Link>
                  </DropdownListItem>
                  <DropdownListItem asChild>
                    <Link
                      href="/inquilino/guardados"
                      className="flex items-center gap-3 px-3 py-2 text-[13px] text-fg hover:bg-surface-muted rounded-xl cursor-pointer"
                    >
                      <Heart className="w-4 h-4 stroke-[1.5px] text-fg-muted" />
                      {locale === 'es' ? 'Ver guardados' : 'Saved'}
                    </Link>
                  </DropdownListItem>
                </>
              )}
              {isLandlord && (
                <DropdownListItem asChild>
                  <Link
                    href={upgradePlanHref}
                    className="flex items-center gap-3 px-3 py-2 text-[13px] text-fg hover:bg-surface-muted rounded-xl cursor-pointer"
                  >
                    <Crown className="w-4 h-4 stroke-[1.5px] text-fg-muted" />
                    {locale === 'es' ? 'Mi Plan' : 'My Plan'}
                  </Link>
                </DropdownListItem>
              )}
              {/* Phase 38 plan 38-06 (XR-08) — "Tour del panel" relaunch link.
                  Only rendered for agency users on routes where PanelPrefsContext
                  is mounted (the inmobiliaria layout). Session-only flip; no
                  localStorage or DB write. */}
              {user?.role === 'agency' && panelPrefs && (
                <>
                  <DropdownListSeparator className="bg-surface-muted my-1" />
                  <DropdownListItem
                    onClick={() => panelPrefs.relaunchTour()}
                    className="flex items-center gap-3 px-3 py-2 text-[13px] text-fg hover:bg-surface-muted rounded-xl cursor-pointer"
                  >
                    <Compass className="w-4 h-4 stroke-[1.5px] text-fg-muted" aria-hidden="true" />
                    {t('inmobiliaria.ai.tour.relaunch')}
                  </DropdownListItem>
                </>
              )}
              <DropdownListSeparator className="bg-surface-muted my-1" />
              <DropdownListItem asChild>
                <Link
                  href="/ayuda"
                  className="flex items-center gap-3 px-3 py-2 text-[13px] text-fg hover:bg-surface-muted rounded-xl cursor-pointer"
                >
                  <Question className="w-4 h-4 stroke-[1.5px] text-fg-muted" />
                  {t('nav.help')}
                </Link>
              </DropdownListItem>
              <DropdownListSeparator className="bg-surface-muted my-1" />
              <DropdownListItem
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2 text-[13px] text-danger hover:bg-danger-soft rounded-xl cursor-pointer"
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
        <p className="text-[12px] text-fg-subtle mb-1.5">{breadcrumb}</p>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-[24px] font-semibold text-fg tracking-tight">{title}</h1>
          {count !== undefined && (
            <span className="text-[13px] text-fg-muted bg-surface-muted px-2.5 py-0.5 rounded-full">{count} items</span>
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
