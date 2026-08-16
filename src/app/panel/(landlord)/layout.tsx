'use client';

import { useState, useEffect } from 'react';
import { Toaster } from '@/components/ui/toast';
import { SquaresFour, Buildings, Users, Chat, Gear, FileText, House, CalendarBlank, Wallet, UsersThree, ChatCircleText, Bell } from '@phosphor-icons/react';
// Sparkle import removed — re-add when AI Beta nav item is uncommented
import { DecisionProvider } from '@/lib/context/DecisionContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PlanSidebar, NavItem, ProfileCompletionStep } from '@/components/ui/plan/PlanSidebar';
import { PlanHeader } from '@/components/ui/plan/PlanHeader';
import { SidebarProvider, useSidebar } from '@/lib/context/SidebarContext';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { useMySubscription } from '@/lib/hooks/useSubscription';
import { cn } from '@/lib/utils';

// Define the setup steps - same as LandlordDashboardEmpty
const LANDLORD_SETUP_STEPS: ProfileCompletionStep[] = [
  { id: 1, labelEs: 'Info personal', labelEn: 'Personal info', completed: false },
  { id: 2, labelEs: 'Propiedad', labelEn: 'Property', completed: false },
  { id: 3, labelEs: 'Inquilino ideal', labelEn: 'Ideal tenant', completed: false },
  { id: 4, labelEs: 'Cobros', labelEn: 'Payments', completed: false },
];

const ONBOARDING_STORAGE_KEY = 'plan_onboarding_landlord';

const LANDLORD_NAV_ITEMS: NavItem[] = [
  {
    label: 'Panel',
    href: '/panel',
    icon: SquaresFour,
    exact: true,
  },
  {
    label: 'Mis Propiedades',
    href: '/panel/propiedades',
    icon: Buildings,
  },
  {
    label: 'Candidatos',
    href: '/panel/candidatos',
    icon: Users,
  },
  {
    label: 'Visitas',
    href: '/panel/visitas',
    icon: CalendarBlank,
  },
  {
    label: 'Contratos',
    href: '/panel/contratos',
    icon: FileText,
  },
  {
    label: 'Arriendos',
    href: '/panel/leases',
    icon: House,
  },
  {
    label: 'Mensajes',
    href: '/panel/mensajes',
    icon: Chat,
    // Sin `badge`: el 3 estaba escrito a mano, no contaba nada.
  },
  // --- Portal del Propietario (post-firma) — capa aditiva v8.0 ---
  // Shells "Pronto" hasta que cada ola (v8-02..v8-05) los llene con la vista real
  // cableada al back owner-facing. El `tag` se quita cuando la ola aterriza.
  {
    kind: 'section',
    label: 'Mi arriendo',
    href: '#sec-mi-arriendo',
    icon: House,
  },
  {
    label: 'Mi plata',
    href: '/panel/portafolio',
    icon: Wallet,
    tag: 'Pronto',
  },
  {
    label: 'Elegir inquilino',
    href: '/panel/seleccion',
    icon: UsersThree,
    tag: 'Pronto',
  },
  {
    label: 'Solicitudes',
    href: '/panel/solicitudes',
    icon: ChatCircleText,
    tag: 'Pronto',
  },
  {
    label: 'Novedades',
    href: '/panel/novedades',
    icon: Bell,
    tag: 'Pronto',
  },
  // --- AI Beta section (hidden — re-enable when ready) ---
  // {
  //   label: 'AI Beta',
  //   href: '/panel/beta',
  //   icon: Sparkle,
  // },
];

interface PanelLayoutProps {
  children: React.ReactNode;
}

/**
 * Inner layout that uses sidebar context
 */
function PanelLayoutInner({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  const { t, locale } = useI18n();
  const { subscription } = useMySubscription();
  const showUpgrade = subscription?.planId === 'starter';

  // Onboarding progress state
  const [onboardingSteps, setOnboardingSteps] = useState<ProfileCompletionStep[]>(LANDLORD_SETUP_STEPS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  // Load onboarding progress from localStorage
  useEffect(() => {
    const loadOnboardingProgress = () => {
      const saved = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);

          // If onboarding was fully completed, hide the widget
          if (parsed.isComplete) {
            setOnboardingComplete(true);
            setIsLoaded(true);
            return;
          }

          const completedStepIds = parsed.completedSteps || [];
          setOnboardingSteps(LANDLORD_SETUP_STEPS.map(step => ({
            ...step,
            completed: completedStepIds.includes(step.id),
          })));
        } catch (e) {
          console.error('Error loading onboarding progress:', e);
        }
      }
      setIsLoaded(true);
    };

    loadOnboardingProgress();

    // Listen for storage changes (for cross-tab sync and manual updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === ONBOARDING_STORAGE_KEY) {
        loadOnboardingProgress();
      }
    };

    // Custom event for same-tab updates
    const handleOnboardingUpdate = () => {
      loadOnboardingProgress();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('onboarding-updated', handleOnboardingUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('onboarding-updated', handleOnboardingUpdate);
    };
  }, []);

  // Calculate profile completion
  const completedCount = onboardingSteps.filter(s => s.completed).length;
  const totalSteps = onboardingSteps.length;
  const percentage = Math.round((completedCount / totalSteps) * 100);

  return (
    <div className="min-h-screen bg-plan-page">
      {/* PLan CRM Sidebar */}
      <PlanSidebar
        navItems={LANDLORD_NAV_ITEMS}
        logo={{
          title: 'PLan',
          href: '/panel',
        }}
        showUpgrade={showUpgrade}
        upgradeHref="/panel/upgrade"
        upgradeLabel="Mejorar Plan"
        profileCompletion={isLoaded && !onboardingComplete ? {
          percentage,
          href: '/onboarding/propietario',
          label: locale === 'es' ? 'Completa tu cuenta' : 'Complete your account',
          completedCount,
          totalSteps,
          steps: onboardingSteps,
          locale: locale as 'es' | 'en',
        } : undefined}
      />

      {/* Main content area */}
      <div className={cn(
        'transition-all duration-200',
        isCollapsed ? 'lg:pl-16' : 'lg:pl-[240px]'
      )}>
        <PlanHeader />
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>

      {/* Toast notifications - Premium style */}
      <Toaster position="top-right" />
    </div>
  );
}

/**
 * Panel Layout - PLan CRM style
 */
export default function PanelLayout({ children }: PanelLayoutProps) {
  return (
    <ProtectedRoute allowedRoles={['landlord']}>
      <I18nProvider>
        <DecisionProvider>
          <SidebarProvider>
            <PanelLayoutInner>{children}</PanelLayoutInner>
          </SidebarProvider>
        </DecisionProvider>
      </I18nProvider>
    </ProtectedRoute>
  );
}
