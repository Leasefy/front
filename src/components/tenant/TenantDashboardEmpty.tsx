'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MonoLabel } from '@leasefy/cadence';
import { Button } from '@/components/ui/button';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { ListaParaEmpezar } from '@/components/pantalla/ListaParaEmpezar';
import { RUTA_DEL_MARKETPLACE } from '@/lib/nav/portal-del-inquilino';
import { useEntradaTrasCargar } from '@/components/portales/use-entrada-tras-cargar';
import { User, House, MagnifyingGlass, Heart, Lifebuoy } from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useTimeGreeting } from '@/lib/hooks/use-time-greeting';
import {
  deriveTenantOnboardingStatus,
  readTenantOnboardingCacheStatus,
} from '@/lib/onboarding/tenant-onboarding-status';

interface SetupStep {
  id: number;
  key: string;
  labelEs: string;
  labelEn: string;
  descriptionEs: string;
  descriptionEn: string;
  icon: React.ElementType;
  href: string;
  completed: boolean;
}

const SETUP_STEPS: SetupStep[] = [
  {
    id: 1,
    key: 'basic',
    labelEs: 'Información básica',
    labelEn: 'Basic information',
    descriptionEs: 'Nombre, teléfono y contacto',
    descriptionEn: 'Name, phone, and contact',
    icon: User,
    href: '/onboarding/inquilino',
    completed: false,
  },
  {
    id: 2,
    key: 'preferences',
    labelEs: 'Preferencias de vivienda',
    labelEn: 'Housing preferences',
    descriptionEs: 'Presupuesto, zona y amenidades',
    descriptionEn: 'Budget, area, and amenities',
    icon: House,
    href: '/onboarding/inquilino',
    completed: false,
  },
];


export function TenantDashboardEmpty() {
  const { locale } = useI18n();
  const { user } = useAuth();
  const { greeting } = useTimeGreeting();
  const firstName = user?.name?.split(' ')[0] || (locale === 'es' ? 'Usuario' : 'User');

  const [localCache, setLocalCache] = useState<{ completedSteps: number[]; isComplete: boolean }>({
    completedSteps: [],
    isComplete: false,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Local wizard progress cache (in-progress drafts only; migrates old 3-step
  // data). Scoped to the current user: another account's payload reads as absent.
  const userId = user?.id;
  useEffect(() => {
    const loadProgress = () => {
      setLocalCache(readTenantOnboardingCacheStatus(userId));
      setIsLoaded(true);
    };

    // Load on mount
    loadProgress();

    // Listen for onboarding updates (dispatched by TenantOnboardingContext)
    window.addEventListener('onboarding-updated', loadProgress);

    return () => {
      window.removeEventListener('onboarding-updated', loadProgress);
    };
  }, [userId]);

  // Step status: the backend profile (name+phone / saved housing preferences)
  // is the source of truth; the local cache only adds in-progress wizard steps
  // that were passed locally but not yet submitted to the backend.
  // A cache claiming FULL completion while the authoritative backend flag says
  // the wizard never completed is stale (a real submit always stamps the flag):
  // ignore it entirely so the checklist and its Continue CTA stay actionable.
  const backendStatus = deriveTenantOnboardingStatus(user);
  const staleCompleteCache =
    user?.profileSource === 'backend' && !user.onboardingCompleted && localCache.isComplete;
  const localCompletedSteps = staleCompleteCache ? [] : localCache.completedSteps;
  const steps = SETUP_STEPS.map(step => ({
    ...step,
    completed:
      localCompletedSteps.includes(step.id) ||
      (step.key === 'basic'
        ? backendStatus.basicInfoComplete
        : backendStatus.preferencesComplete),
  }));

  const completedCount = steps.filter(s => s.completed).length;
  const totalSteps = steps.length;
  const allComplete = completedCount >= totalSteps;
  const nextIncompleteStep = allComplete ? null : steps.find(s => !s.completed);

  // Llega después del esqueleto del inicio (y de leer el avance): entra con 4 px.
  const entrada = useEntradaTrasCargar(!isLoaded);

  if (!isLoaded) return null;

  /*
   * GLOW UP 22-10 (como el inicio del inquilino): el encabezado común, lo que falta en la lista de la casa
   * («Para completar tu perfil te faltan N pasos», cada uno con su botón) y los atajos. Antes, una tarjeta de
   * progreso con barra y porcentaje, otra lista de los mismos pasos con sus íconos en caja, una fila de
   * beneficios, un consejo y una tarjeta de ayuda, sobre un fondo gris a mano.
   */
  const atajos = [
    {
      // Buscar se hace en el marketplace, en OTRA pestaña (reunión 21-10).
      href: RUTA_DEL_MARKETPLACE,
      externo: true,
      icon: MagnifyingGlass,
      label: locale === 'es' ? 'Buscar en el marketplace' : 'Search the marketplace',
      desc: locale === 'es' ? 'Con tus filtros, en otra pestaña' : 'With your filters, in a new tab',
    },
    {
      href: '/inquilino/guardados',
      icon: Heart,
      label: locale === 'es' ? 'Ver mis guardados' : 'See my saved homes',
      desc: locale === 'es' ? 'Los inmuebles que marcaste' : 'The homes you marked',
    },
    {
      href: '/ayuda',
      icon: Lifebuoy,
      label: locale === 'es' ? 'Centro de ayuda' : 'Help center',
      desc: locale === 'es' ? 'Cómo funciona Leasefy' : 'How Leasefy works',
    },
  ];

  return (
    <div className="min-h-screen bg-bg">
      <motion.div {...entrada} className="space-y-6 p-6 lg:p-8">
        <EncabezadoDePantalla
          seccion={locale === 'es' ? 'Inicio' : 'Home'}
          titulo={`${greeting}, ${firstName}`}
          descripcion={
            /* "aplicar" está muerto: docs/VOCABULARIO.md */
            locale === 'es'
              ? 'Completa tu perfil para postularte más rápido.'
              : 'Complete your profile to apply to homes faster.'
          }
          data-testid="encabezado-del-inicio-sin-perfil"
        />

        <ListaParaEmpezar
          paraQue={locale === 'es' ? 'completar tu perfil' : 'complete your profile'}
          requisitos={steps.map((step) => ({
            id: String(step.id),
            titulo: locale === 'es' ? step.labelEs : step.labelEn,
            detalle: locale === 'es' ? step.descriptionEs : step.descriptionEn,
            estado: step.completed ? ('listo' as const) : ('falta' as const),
            accion: (
              <Button asChild size="sm" variant={step.id === nextIncompleteStep?.id ? 'default' : 'outline'} hideArrow>
                <Link href={step.href}>{locale === 'es' ? 'Completar' : 'Complete'}</Link>
              </Button>
            ),
          }))}
          data-testid="inicio-lo-que-falta"
        />

        <section className="rounded-lg border border-border bg-surface p-5" data-testid="atajos-del-inicio-sin-perfil">
          <h2 className="mb-3 text-fg-subtle">
            <MonoLabel>{locale === 'es' ? 'Atajos' : 'Shortcuts'}</MonoLabel>
          </h2>
          <ul className="-mx-2 space-y-0.5">
            {atajos.map((a) => {
              const Icono = a.icon;
              const contenido = (
                <>
                  <Icono className="h-5 w-5 shrink-0 text-fg-muted" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-sm text-fg">{a.label}</span>
                    <span className="block text-caption text-fg-muted">{a.desc}</span>
                  </span>
                </>
              );
              return (
                <li key={a.href}>
                  {a.externo ? (
                    <a href={a.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-surface-muted">
                      {contenido}
                    </a>
                  ) : (
                    <Link href={a.href} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-surface-muted">
                      {contenido}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </motion.div>
    </div>
  );
}
