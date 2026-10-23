'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SquaresFour, House, Chat, MagnifyingGlass, ArrowsLeftRight, Gauge } from '@phosphor-icons/react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PlanSidebar, ProfileCompletionStep, type NavItem } from '@/components/ui/plan/PlanSidebar';
import { SeccionesDelPortal } from '@/components/portales/SeccionesDelPortal';
import { useArriendaHoy, ArriendaHoyDelPortalProvider } from '@/lib/hooks/use-arrienda-hoy';
import {
  BUSCAR_ARRIENDO,
  MI_ARRIENDO,
  filasDelMenu,
  rutasDeLaSeccion,
  seccionDeLaRuta,
  type FilaDelPortal,
} from '@/lib/nav/portal-del-inquilino';
import { PlanHeader } from '@/components/ui/plan/PlanHeader';
import { SidebarProvider, useSidebar } from '@/lib/context/SidebarContext';
import { TenantProfileProvider, useTenantProfile } from '@/lib/context/TenantProfileContext';
import { useUnreadMessages } from '@/lib/hooks/useMessages';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { getRoleHomeRoute } from '@/lib/auth/role-routes';
import { useTambienEsPropietario } from '@/lib/hooks/useTambienEsPropietario';

// Define the setup steps (2 steps: basic info + preferences. Income is collected during application)
const TENANT_SETUP_STEPS: ProfileCompletionStep[] = [
  { id: 1, labelEs: 'Info básica', labelEn: 'Basic info', completed: false },
  { id: 2, labelEs: 'Preferencias', labelEn: 'Preferences', completed: false },
];

const ONBOARDING_STORAGE_KEY = 'plan_onboarding_tenant';

/**
 * El menú del portal — Nico eligió «3 secciones» (21-10-2026). Antes eran 14
 * filas en vertical; ahora:
 *   · quien arrienda: Inicio · Mi arriendo · Mi calificación · Mensajes
 *   · quien no arrienda: Inicio · Buscar arriendo · Mensajes
 * Lo de cada sección va en pestañas arriba de la pantalla (`SeccionesDelPortal`).
 * Nada se borró: cada pantalla cae en su sección (`lib/nav/portal-del-inquilino.ts`).
 * Sin «Notificaciones», «Perfil» ni «Configuración»: viven en el header (Nico, 15-09).
 */
function useTenantNavItems(arrienda: boolean | null, pathname: string) {
  const { t, locale } = useI18n();
  const es = locale !== 'en';
  const { unreadCount } = useUnreadMessages();
  // AVALI-3 (Nico, 17-10): la misma cuenta entra también a su portal de
  // propietario si es dueño de un inmueble que administra una inmobiliaria.
  const tambienPropietario = useTambienEsPropietario();

  const fila: Record<FilaDelPortal['clave'], NavItem> = {
    inicio: { label: t('nav.panel'), href: '/inquilino', icon: SquaresFour, exact: true },
    'mi-arriendo': {
      label: es ? MI_ARRIENDO.es : MI_ARRIENDO.en,
      href: MI_ARRIENDO.pestanas[0].href,
      icon: House,
      tambienEn: rutasDeLaSeccion(MI_ARRIENDO),
    },
    buscar: {
      label: es ? BUSCAR_ARRIENDO.es : BUSCAR_ARRIENDO.en,
      href: BUSCAR_ARRIENDO.pestanas[0].href,
      icon: MagnifyingGlass,
      tambienEn: rutasDeLaSeccion(BUSCAR_ARRIENDO),
    },
    calificacion: { label: es ? 'Mi calificación' : 'My rating', href: '/inquilino/calificacion', icon: Gauge },
    // El conteo sale de useUnreadMessages (polling): el menú nunca promete no-leídos falsos.
    mensajes: {
      label: t('nav.messages'),
      href: '/inquilino/mensajes',
      icon: Chat,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
  };

  return [
    ...filasDelMenu(arrienda, pathname).map((clave) => fila[clave]),
    ...(tambienPropietario
      ? [{ label: locale === 'es' ? 'Mi portal de propietario' : 'My owner portal', href: '/panel', icon: ArrowsLeftRight }]
      : []),
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
  const arrienda = useArriendaHoy();
  const pathname = usePathname() ?? '';
  const navItems = useTenantNavItems(arrienda, pathname);

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
          // 🔴 Adentro de la plataforma el logo vuelve al inicio del panel, no
          // a la landing (Nico, 2026-09-04). Mismo criterio en los tres
          // paneles, y el destino sale de la única fuente de verdad de «dónde
          // vive el inicio de cada rol».
          href: getRoleHomeRoute('tenant'),
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
          <SeccionesDelPortal seccion={seccionDeLaRuta(pathname, arrienda === true)} />
          <ArriendaHoyDelPortalProvider value={arrienda}>{children}</ArriendaHoyDelPortalProvider>
        </main>
      </div>
      {/* El <Toaster> es único y vive en el layout raíz (src/app/layout.tsx), fuera de
          <ProtectedRoute>: aquí adentro se perdía todo toast emitido mientras el guard
          resuelve. No montes otro: sonner duplica el toast por cada Toaster montado. */}
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
