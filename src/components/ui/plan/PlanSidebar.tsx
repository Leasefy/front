'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Icon } from '@phosphor-icons/react';
import { CaretLeft, CaretRight, CaretDown, SignOut, Question, TrendUp, CheckCircle, Circle, ArrowUpRight } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { LeasefyMark, LeasefyLogo } from '@/components/brand';
import { useAuth } from '@/lib/auth';
import { useSidebar } from '@/lib/context/SidebarContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
// Real Cadence Sidebar building blocks. The collapse/expand rail, nested-group
// disclosure, disabled rows, `tag` pills and the collapse-aware brand are
// composed AROUND these (the primitive does not model them — see ## Gaps in
// CADENCE-COMPONENTS.md). Expanded leaf rows + group labels ARE the real
// components so they inherit the DS hover/active/focus states.
import { SidebarSection, SidebarItem } from '@leasefy/cadence';

// ─────────────────────────────────────────────────────────────────────────────
// Mobile sidebar opener — module-level pub-sub.
//
// The mobile menu trigger lives in PlanHeader (so it sits inline in the top
// bar instead of floating over it), but the Sheet + nav data live here.
// Every layout renders PlanSidebar + PlanHeader as siblings, so a tiny
// pub-sub avoids threading open-state through each layout. No-op when no
// PlanSidebar is mounted.
// ─────────────────────────────────────────────────────────────────────────────
type MobileSidebarListener = () => void;
const mobileSidebarListeners = new Set<MobileSidebarListener>();

/** Opens the PlanSidebar mobile navigation Sheet (called from PlanHeader). */
export function openPlanMobileSidebar() {
  mobileSidebarListeners.forEach((listener) => listener());
}

export interface NavItem {
  label: string;
  href: string;
  icon: Icon;
  exact?: boolean;
  disabled?: boolean;
  badge?: number;
  children?: NavItem[];
  /** When 'section', renders a non-interactive group label (desktop sidebar only). Additive — flat navs ignore it. */
  kind?: 'section';
  /** Small pill shown after the label (e.g. "Pronto" for not-yet-built sections). Additive. */
  tag?: string;
  /** data-tour-target attribute for Phase 38 PanelTour primitive. Additive — items without it render unchanged. */
  dataTourTarget?: string;
}

export interface ProfileCompletionStep {
  id: number;
  labelEs: string;
  labelEn: string;
  completed: boolean;
}

export interface ProfileCompletionConfig {
  percentage: number;
  href: string;
  label?: string;
  completedCount?: number;
  totalSteps?: number;
  steps?: ProfileCompletionStep[];
  locale?: 'es' | 'en';
}

export interface PlanSidebarProps {
  navItems: NavItem[];
  logo?: {
    title: string;
    href: string;
  };
  className?: string;
  defaultCollapsed?: boolean;
  showUpgrade?: boolean;
  upgradeHref?: string;
  upgradeLabel?: string;
  profileCompletion?: ProfileCompletionConfig;
  /** Optional element rendered between the logo and the nav (e.g. ⌘K trigger). */
  aboveNav?: React.ReactNode;
  /** When true, the nav list is replaced by a skeleton placeholder (e.g. while
   *  permissions load) so permission-gated items never flash in then disappear. */
  loading?: boolean;
}

interface NavItemComponentProps {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
  onClick?: () => void;
  depth?: number;
}

function NavItemComponent({ item, isActive, isCollapsed, onClick, depth = 0 }: NavItemComponentProps) {
  const Icon = item.icon;
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = item.children && item.children.length > 0;
  const pathname = usePathname();

  const checkChildActive = (children: NavItem[]) => {
    return children.some(child => {
      if (child.exact) return pathname === child.href;
      return pathname.startsWith(child.href);
    });
  };

  const isChildActive = hasChildren && checkChildActive(item.children!);

  // Group label. Collapsed → thin divider (the DS SidebarSection always shows
  // its label, so the icon-rail divider stays composed — see ## Gaps).
  // Expanded → the real Cadence SidebarSection (uppercase mono label).
  if (item.kind === 'section') {
    if (isCollapsed) {
      return <div className="mx-2 my-2 border-t border-plan-border/60" aria-hidden="true" />;
    }
    return <SidebarSection label={item.label} />;
  }

  if (item.disabled) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-2 text-[13px]',
          'text-muted-foreground/70 cursor-not-allowed',
          isCollapsed && 'justify-center px-2'
        )}
        title={isCollapsed ? `${item.label}${item.tag ? ` — ${item.tag}` : ''}` : undefined}
      >
        <Icon className="w-[18px] h-[18px] stroke-[1.5px]" />
        {!isCollapsed && <span className="flex-1">{item.label}</span>}
        {!isCollapsed && item.tag && (
          <span className="ml-auto text-[9px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-plan-border/60 text-plan-muted">
            {item.tag}
          </span>
        )}
      </div>
    );
  }

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          data-tour-target={item.dataTourTarget}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-2 text-[13px]',
            'transition-colors duration-100',
            (isActive || isChildActive)
              ? 'text-primary font-medium'
              : 'text-plan-secondary hover:text-plan-primary',
            isCollapsed && 'justify-center px-2'
          )}
        >
          <Icon
            weight={(isActive || isChildActive) ? 'fill' : 'regular'}
            className={cn(
              'w-[18px] h-[18px] stroke-[1.5px]',
              (isActive || isChildActive) ? 'text-primary' : 'text-plan-muted'
            )}
          />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              <CaretDown
                className={cn(
                  'w-4 h-4 text-plan-muted transition-transform duration-150',
                  isExpanded && 'rotate-180'
                )}
              />
            </>
          )}
        </button>
        {!isCollapsed && isExpanded && (
          <div className="ml-6 border-l border-plan-border">
            {item.children!.map((child) => (
              <NavItemComponent
                key={child.href}
                item={child}
                isActive={child.exact ? pathname === child.href : pathname.startsWith(child.href)}
                isCollapsed={false}
                onClick={onClick}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Collapsed icon-rail row: SidebarItem has no icon-only/collapsed mode, so the
  // rail row stays composed (see ## Gaps). title + data-tour-target preserved.
  if (isCollapsed) {
    return (
      <Link
        href={item.href}
        onClick={onClick}
        aria-current={isActive ? 'page' : undefined}
        data-tour-target={item.dataTourTarget}
        title={item.label}
        className={cn(
          'flex items-center justify-center px-2.5 py-2.5 rounded-full transition-colors',
          isActive
            ? 'text-primary bg-accent-soft'
            : 'text-fg-muted hover:text-fg hover:bg-surface-muted'
        )}
      >
        <Icon
          weight={isActive ? 'fill' : 'regular'}
          className={cn('w-[18px] h-[18px]', isActive ? 'text-primary' : 'text-fg-muted')}
        />
      </Link>
    );
  }

  // Expanded leaf row — the REAL Cadence SidebarItem (owns hover/active/focus).
  // legacyBehavior + passHref bridges Next client routing onto the DS anchor.
  // SidebarItemProps (HTMLAttributes) can't type data-*, so the PanelTour hook
  // rides on a minimal wrapper only when present.
  const row = (
    <Link href={item.href} legacyBehavior passHref>
      <SidebarItem
        icon={<Icon weight={isActive ? 'fill' : 'regular'} className="w-[18px] h-[18px]" />}
        label={item.label}
        active={isActive}
        count={item.badge !== undefined && item.badge > 0 ? item.badge : undefined}
        depth={depth}
        onClick={onClick}
      />
    </Link>
  );

  return item.dataTourTarget ? <div data-tour-target={item.dataTourTarget}>{row}</div> : row;
}

/**
 * Placeholder shown while permissions load. Mirrors the real nav's rhythm
 * (a group label + a few item rows) so the sidebar holds its shape and gated
 * items never flash in then disappear. Widths are fixed so the SSR markup and
 * the hydrated client markup match exactly (no hydration mismatch).
 */
function NavSkeleton({ isCollapsed }: { isCollapsed: boolean }) {
  const groups: number[][] = [[68, 52], [60, 74, 48, 56], [64, 50, 70]];
  return (
    <div className="space-y-3" aria-hidden="true" data-testid="sidebar-nav-skeleton">
      {groups.map((rows, gi) => (
        <div key={gi} className="space-y-1.5">
          {!isCollapsed && (
            <div className="ml-4 h-2 w-16 rounded bg-surface-muted animate-pulse" />
          )}
          {rows.map((w, ri) => (
            <div
              key={ri}
              className={cn(
                'flex items-center gap-3 py-2',
                isCollapsed ? 'justify-center px-2' : 'px-3'
              )}
            >
              <div className="h-[18px] w-[18px] flex-shrink-0 rounded-lg bg-surface-muted animate-pulse" />
              {!isCollapsed && (
                <div
                  className="h-3 rounded bg-surface-muted animate-pulse"
                  style={{ width: `${w}%` }}
                />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

interface SidebarContentProps {
  navItems: NavItem[];
  logo?: PlanSidebarProps['logo'];
  isCollapsed: boolean;
  onCollapse: () => void;
  onItemClick?: () => void;
  showUpgrade?: boolean;
  upgradeHref?: string;
  upgradeLabel?: string;
  showCollapseButton?: boolean;
  profileCompletion?: ProfileCompletionConfig;
  aboveNav?: React.ReactNode;
  loading?: boolean;
}

function SidebarContent({
  navItems,
  logo,
  isCollapsed,
  onCollapse,
  onItemClick,
  showCollapseButton = true,
  profileCompletion,
  aboveNav,
  loading = false,
}: SidebarContentProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (item: NavItem) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <div className="flex flex-col h-full bg-bg relative">
      {/* Collapse Button */}
      {showCollapseButton && (
        <button
          onClick={onCollapse}
          aria-label={isCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          aria-expanded={!isCollapsed}
          className={cn(
            'absolute top-6 -right-3 z-50',
            'w-6 h-6 rounded-full bg-surface',
            'border border-border',
            'flex items-center justify-center',
            'text-fg-subtle hover:text-fg-muted',
            'shadow-xs transition-colors',
            // ≥44px hit target without changing the 24px visual (24 + 2×10 = 44)
            "before:absolute before:-inset-2.5 before:rounded-full before:content-['']",
            'outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1'
          )}
        >
          {isCollapsed ? (
            <CaretRight className="w-3.5 h-3.5" />
          ) : (
            <CaretLeft className="w-3.5 h-3.5" />
          )}
        </button>
      )}

      {/* Logo */}
      <div className={cn(
        'h-[60px] flex items-center',
        isCollapsed ? 'justify-center px-2' : 'px-5'
      )}>
        <Link href="/" className="flex items-center" onClick={onItemClick}>
          {isCollapsed ? (
            <LeasefyMark variant="tile" size={32} />
          ) : (
            <LeasefyLogo orientation="horizontal" size={30} tone="auto" />
          )}
        </Link>
      </div>

      {/* ⌘K / above-nav slot */}
      {aboveNav && !isCollapsed && (
        <div className="px-3 pb-1">
          {aboveNav}
        </div>
      )}

      {/* Compass */}
      <nav
        aria-label="Navegación principal"
        // data-lenis-prevent + overscroll-contain: the grouped nav can overflow,
        // and Lenis otherwise hijacks the wheel so the sidebar never scrolls.
        data-lenis-prevent
        className={cn(
          'flex-1 overflow-y-auto py-2 [overscroll-behavior:contain]',
          isCollapsed ? 'px-2' : 'px-3'
        )}
      >
        {loading ? (
          <NavSkeleton isCollapsed={isCollapsed} />
        ) : (
          <div className="space-y-0.5">
            {navItems.map((item) => (
              <NavItemComponent
                key={item.href}
                item={item}
                isActive={isActive(item)}
                isCollapsed={isCollapsed}
                onClick={onItemClick}
              />
            ))}
          </div>
        )}
      </nav>

      {/* Profile Completion Widget */}
      {profileCompletion && !isCollapsed && (() => {
        const completedCount = profileCompletion.completedCount ?? 0;
        const totalSteps = profileCompletion.totalSteps ?? 2;
        const steps = profileCompletion.steps ?? [];
        const locale = profileCompletion.locale ?? 'es';
        const completedSteps = steps.filter(s => s.completed);
        const pendingSteps = steps.filter(s => !s.completed);
        const nextStep = pendingSteps[0];
        const isComplete = completedCount >= totalSteps;

        // Don't show widget if profile is complete
        if (isComplete) return null;

        return (
          <div className="px-3 pb-3">
            <Link
              href={profileCompletion.href}
              onClick={onItemClick}
              className="block p-3 rounded-xl bg-surface-muted border border-border-faint hover:bg-surface-hover transition-colors group"
            >
              {/* Header with progress */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-medium text-fg">
                  {profileCompletion.label || (locale === 'es' ? 'Completa tu perfil' : 'Complete your profile')}
                </p>
                <span className="text-[11px] font-medium font-mono tabular-nums text-fg-subtle">
                  {completedCount}/{totalSteps}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-border rounded-full overflow-hidden mb-3">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${profileCompletion.percentage}%` }}
                />
              </div>

              {/* Completed steps - compact (only show if there are completed steps) */}
              {completedSteps.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {completedSteps.map((step) => (
                    <span key={step.id} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-success-soft text-success text-[10px] font-medium rounded-md">
                      <CheckCircle className="w-2.5 h-2.5" weight="fill" />
                      {locale === 'es' ? step.labelEs : step.labelEn}
                    </span>
                  ))}
                </div>
              )}

              {/* Next step - highlighted */}
              {nextStep && (
                <div className="flex items-center gap-2 p-2 bg-surface rounded-lg border border-border group-hover:border-border-strong transition-colors">
                  <div className="w-5 h-5 rounded-full border-2 border-primary bg-accent-soft flex items-center justify-center flex-shrink-0">
                    <span className="font-mono text-[9px] font-bold text-primary">{completedCount + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-fg truncate">
                      {locale === 'es' ? nextStep.labelEs : nextStep.labelEn}
                    </p>
                    <p className="text-[10px] text-fg-subtle">
                      {locale === 'es' ? 'Siguiente paso' : 'Next step'}
                    </p>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-fg-subtle group-hover:text-fg-muted transition-colors flex-shrink-0" />
                </div>
              )}

              {/* If no completed steps and no next step, show a start message */}
              {completedSteps.length === 0 && !nextStep && (
                <div className="flex items-center gap-2 p-2 bg-surface rounded-lg border border-border">
                  <p className="text-[11px] text-fg-subtle">
                    {locale === 'es' ? 'Comienza configurando tu perfil' : 'Start by setting up your profile'}
                  </p>
                </div>
              )}
            </Link>
          </div>
        );
      })()}

      {/* Help Link */}
      <div className="px-3 pb-3">
        <Link
          href="/ayuda"
          onClick={onItemClick}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-full text-[13px] text-fg-muted hover:text-fg hover:bg-surface-muted transition-colors',
            isCollapsed && 'justify-center px-2'
          )}
        >
          <Question className="w-[18px] h-[18px]" />
          {!isCollapsed && <span>Ayuda</span>}
        </Link>
      </div>
    </div>
  );
}

export function PlanSidebar({
  navItems,
  logo,
  className,
  defaultCollapsed = false,
  showUpgrade = false,
  upgradeHref,
  upgradeLabel,
  profileCompletion,
  aboveNav,
  loading = false,
}: PlanSidebarProps) {
  const { isCollapsed, toggle } = useSidebar();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Register with the module-level opener so PlanHeader's menu button
  // (rendered in a sibling tree) can open this Sheet.
  useEffect(() => {
    const listener = () => setMobileOpen(true);
    mobileSidebarListeners.add(listener);
    return () => {
      mobileSidebarListeners.delete(listener);
    };
  }, []);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0',
          'bg-bg border-r border-border',
          'transition-all duration-200',
          isCollapsed ? 'lg:w-16' : 'lg:w-[240px]',
          className
        )}
      >
        <SidebarContent
          navItems={navItems}
          logo={logo}
          isCollapsed={isCollapsed}
          onCollapse={toggle}
          showUpgrade={showUpgrade}
          upgradeHref={upgradeHref}
          upgradeLabel={upgradeLabel}
          profileCompletion={profileCompletion}
          aboveNav={aboveNav}
          loading={loading}
        />
      </aside>

      {/* Mobile Sheet — opened from PlanHeader's inline menu button via
          openPlanMobileSidebar() (the old floating hamburger overlapped the
          header search input and was removed). */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] p-0 bg-bg border-r-0">
          <SheetHeader className="sr-only">
            <SheetTitle>List de navegacion</SheetTitle>
          </SheetHeader>
          <SidebarContent
            navItems={navItems}
            logo={logo}
            isCollapsed={false}
            onCollapse={() => {}}
            onItemClick={() => setMobileOpen(false)}
            showUpgrade={showUpgrade}
            upgradeHref={upgradeHref}
            upgradeLabel={upgradeLabel}
            showCollapseButton={false}
            profileCompletion={profileCompletion}
            aboveNav={aboveNav}
            loading={loading}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}

