'use client';

import { useState, useEffect } from 'react';
import { Toaster } from '@/components/ui/toast';
import { SquaresFour, House, FileMagnifyingGlass, Handshake, CreditCard, FileText, Chat, MagnifyingGlass, SealCheck, Target } from '@phosphor-icons/react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PlanSidebar, ProfileCompletionStep } from '@/components/ui/plan/PlanSidebar';
import { PlanHeader } from '@/components/ui/plan/PlanHeader';
import { SidebarProvider, useSidebar } from '@/lib/context/SidebarContext';
import { TenantProfileProvider, useTenantProfile } from '@/lib/context/TenantProfileContext';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// Define the setup steps (2 steps: basic info + preferences. Income is collected during application)
const TENANT_SETUP_STEPS: ProfileCompletionStep[] = [
  { id: 1, labelEs: 'Info básica', labelEn: 'Basic info', completed: false },
  { id: 2, labelEs: 'Preferencias', labelEn: 'Preferences', completed: false },
];

const ONBOARDING_STORAGE_KEY = 'plan_onboarding_tenant';

/**
 * Hook to generate translated nav items
 */
function useTenantNavItems() {
  const { t, locale } = useI18n();

  return [
    { label: t('nav.panel'), href: '/inquilino', icon: SquaresFour, exact: true },
    // Su catálogo va ANTES de Explorar: lo primero es lo que puede tomar,
    // y hasta ahora no había forma de llegar acá sin saberse la URL.
    // `Target` y no `Sparkle`: las chispas están reservadas para lo que hace
    // IA en todo el producto, y esto no la usa — es un filtro por su tope.
    { label: locale === 'es' ? 'Para ti' : 'For you', href: '/inquilino/para-ti', icon: Target },
    { label: locale === 'es' ? 'Explorar' : 'Explore', href: '/inquilino/explorar', icon: MagnifyingGlass },
    // Va temprano a propósito: la aprobación es lo primero del recorrido —
    // sin ella no se puede postular a nada (docs/VOCABULARIO.md).
    { label: t('nav.approval'), href: '/inquilino/aprobacion', icon: SealCheck },
    { label: t('nav.myRental'), href: '/inquilino/arriendo', icon: House },
    { label: t('nav.applications'), href: '/inquilino/aplicaciones', icon: FileMagnifyingGlass },
    { label: t('nav.contracts'), href: '/inquilino/contratos', icon: Handshake },
    { label: t('nav.payments'), href: '/inquilino/pagos', icon: CreditCard },
    { label: t('nav.documents'), href: '/inquilino/documentos', icon: FileText },
    // Sin `badge`: el 2 estaba escrito a mano. La pantalla de Mensajes dice
    // "Sin conversaciones" mientras el sidebar prometía dos sin leer.
    { label: t('nav.messages'), href: '/inquilino/mensajes', icon: Chat },
  ];
}

interface InquilinoLayoutProps {
  children: React.ReactNode;
}

/**
 * Inner layout that uses sidebar context, tenant profile, and i18n
 */
function InquilinoLayoutInner({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  const { hasArriendoPass } = useTenantProfile();
  const { t, locale } = useI18n();
  const navItems = useTenantNavItems();

  // Onboarding progress state
  const [onboardingSteps, setOnboardingSteps] = useState<ProfileCompletionStep[]>(TENANT_SETUP_STEPS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load onboarding progress from localStorage
  useEffect(() => {
    const loadOnboardingProgress = () => {
      const saved = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const completedStepIds = (parsed.completedSteps || []).filter((id: number) => id <= 2);
          setOnboardingSteps(TENANT_SETUP_STEPS.map(step => ({
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

  // Determine tenant subscription type
  const tenantSubscription = hasArriendoPass ? 'arriendo_pass' as const : undefined;

  // Calculate profile completion
  const completedCount = onboardingSteps.filter(s => s.completed).length;
  const totalSteps = onboardingSteps.length;
  const percentage = Math.round((completedCount / totalSteps) * 100);

  return (
    <div className="min-h-screen bg-plan-page">
      <PlanSidebar
        navItems={navItems}
        logo={{
          title: 'Arriendo',
          href: '/inquilino',
        }}
        profileCompletion={isLoaded ? {
          percentage,
          href: '/onboarding/inquilino',
          label: t('dashboard.completeProfile'),
          completedCount,
          totalSteps,
          steps: onboardingSteps,
          locale: locale as 'es' | 'en',
        } : undefined}
      />
      <div className={cn(
        'transition-all duration-200',
        isCollapsed ? 'lg:pl-16' : 'lg:pl-[240px]'
      )}>
        <PlanHeader tenantSubscription={tenantSubscription} />
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}

/**
 * Inquilino (Tenant) Layout - PLan CRM style
 */
export default function InquilinoLayout({ children }: InquilinoLayoutProps) {
  return (
    <ProtectedRoute allowedRoles={['tenant']}>
      <I18nProvider>
        <TenantProfileProvider>
          <SidebarProvider>
            <InquilinoLayoutInner>{children}</InquilinoLayoutInner>
          </SidebarProvider>
        </TenantProfileProvider>
      </I18nProvider>
    </ProtectedRoute>
  );
}
