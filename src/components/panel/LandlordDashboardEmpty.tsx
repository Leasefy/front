'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Appear, MonoLabel } from '@leasefy/cadence';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { ListaParaEmpezar } from '@/components/pantalla/ListaParaEmpezar';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, CreditCard, Check, Shield, Lightning, Users, Buildings, VideoCamera, FileText, ChartBar, Lifebuoy } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useTimeGreeting } from '@/lib/hooks/use-time-greeting';

// ============================================================================
// TextTs
// ============================================================================

interface SetupStep {
  id: string;
  labelEs: string;
  labelEn: string;
  descriptionEs: string;
  descriptionEn: string;
  icon: React.ElementType;
  href?: string;
  action?: 'video' | 'modal';
  completed: boolean;
}

// ============================================================================
// Setup Steps Configuration
// ============================================================================

const getSetupSteps = (hasProperty: boolean): SetupStep[] => [
  {
    id: 'create_account',
    labelEs: 'Crear tu cuenta',
    labelEn: 'Create your account',
    descriptionEs: 'Te registraste en Leasefy',
    descriptionEn: 'You signed up for Leasefy',
    icon: Check,
    completed: true, // Always completed
  },
  {
    id: 'watch_intro',
    labelEs: 'Conoce la plataforma',
    labelEn: 'Learn the platform',
    descriptionEs: 'Qué hace Leasefy por ti, en tres puntos',
    descriptionEn: 'What Leasefy does for you, in three points',
    icon: VideoCamera,
    action: 'video',
    completed: false,
  },
  {
    id: 'publish_property',
    labelEs: 'Publica tu inmueble',
    labelEn: 'List your property',
    descriptionEs: 'Llega a miles de inquilinos verificados',
    descriptionEn: 'Reach thousands of verified tenants',
    icon: Plus,
    href: '/publicar?from=panel',
    completed: hasProperty,
  },
  {
    id: 'setup_payments',
    labelEs: 'Configura tus cobros',
    labelEn: 'Set up payments',
    descriptionEs: 'Recibe el arriendo automáticamente',
    descriptionEn: 'Receive rent automatically',
    icon: CreditCard,
    // Directo a la sección, no a la raíz de Configuración (que es «Tu plan»).
    href: '/panel/configuracion/cuentas-de-recaudo',
    completed: false,
  },
];

// ============================================================================
// VideoCamera Modal Component
// ============================================================================

/**
 * Informativo: el `Dialog` canónico con `variant="info"` (DESIGN.md §17). La ✕,
 * el velo y Esc cierran SIN marcar el paso; «Entendido, continuar» lo marca.
 */
const PUNTOS_DE_LEASEFY = [
  {
    icon: Shield,
    titleEs: 'Protegemos tu inversión',
    titleEn: 'We protect your investment',
    descEs: 'Seguro contra impago hasta 24 meses',
    descEn: 'Non-payment insurance up to 24 months',
  },
  {
    icon: Users,
    titleEs: 'Inquilinos verificados',
    titleEn: 'Verified tenants',
    descEs: 'Evaluación crediticia completa',
    descEn: 'Complete credit evaluation',
  },
  {
    icon: Lightning,
    titleEs: 'Cobros automáticos',
    titleEn: 'Automatic collection',
    descEs: 'Recibe el arriendo puntual cada mes',
    descEn: 'Receive rent on time every month',
  },
];

function VideoCameraModal({ open, onClose, onComplete }: { open: boolean; onClose: () => void; onComplete: () => void }) {
  const { locale } = useI18n();

  return (
    <Dialog
      open={open}
      onOpenChange={(abierto) => {
        if (!abierto) onClose();
      }}
    >
      <DialogContent size="xl" variant="info">
        <DialogHeader>
          <DialogTitle>
            {locale === 'es' ? 'Cómo funciona Leasefy' : 'How Leasefy works'}
          </DialogTitle>
          <DialogDescription>
            {locale === 'es'
              ? 'Publica tu inmueble, recibe postulaciones verificadas y cobra tu arriendo de forma segura.'
              : 'Learn how to list your property, receive verified applications, and collect rent securely.'}
          </DialogDescription>
        </DialogHeader>

        {/* GLOW UP 22-10: no hay video (era una caja negra con un «Video» de relleno): lo que se dice, en tres
            puntos. Son las tres tarjetas que antes llenaban el inicio vacío. */}
        <ul className="space-y-4">
          {PUNTOS_DE_LEASEFY.map((punto) => (
            <li key={punto.titleEs} className="flex items-start gap-3">
              <punto.icon className="mt-0.5 h-5 w-5 shrink-0 text-fg-muted" aria-hidden="true" />
              <span>
                <span className="block text-body text-fg">{locale === 'es' ? punto.titleEs : punto.titleEn}</span>
                <span className="block text-sm text-fg-muted">{locale === 'es' ? punto.descEs : punto.descEn}</span>
              </span>
            </li>
          ))}
        </ul>

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            hideArrow
            onClick={() => {
              onComplete();
              onClose();
            }}
          >
            {locale === 'es' ? 'Entendido, continuar' : 'Got it, continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function LandlordDashboardEmpty() {
  const { locale } = useI18n();
  const { user } = useAuth();
  const { greeting } = useTimeGreeting();
  const firstName = user?.name?.split(' ')[0] || (locale === 'es' ? 'Propietario' : 'Owner');

  const [videoModalOpen, setVideoCameraModalOpen] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>(['create_account']);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load progress from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('plan_getting_started');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCompletedSteps(parsed.completedSteps || ['create_account']);
        setIsCollapsed(parsed.isCollapsed || false);
      } catch (e) {
        console.error('Error loading progress:', e);
      }
    }
    setIsLoaded(true);
  }, []);

  // FloppyDisk progress to localStorage
  const saveProgress = (steps: string[], collapsed: boolean) => {
    localStorage.setItem('plan_getting_started', JSON.stringify({
      completedSteps: steps,
      isCollapsed: collapsed,
      lastUpdated: new Date().toISOString(),
    }));
  };

  const markStepComplete = (stepId: string) => {
    const updated = [...completedSteps, stepId];
    setCompletedSteps(updated);
    saveProgress(updated, isCollapsed);
  };


  // Check if user has any properties (in real app, this would come from API)
  const hasProperty = false; // TODO: Replace with actual check

  const steps = getSetupSteps(hasProperty).map(step => ({
    ...step,
    completed: completedSteps.includes(step.id) || step.id === 'create_account',
  }));


  if (!isLoaded) return null;

  const handleStepClick = (step: SetupStep) => {
    if (step.completed) return;

    if (step.action === 'video') {
      setVideoCameraModalOpen(true);
    } else if (step.href) {
      // Compass handled by Link
    }
  };

  /*
   * GLOW UP 22-10 (como el inicio del inquilino): el encabezado común con «publicar» como la acción principal,
   * lo que falta en la lista de la casa («Para empezar a arrendar te faltan N pasos», cada uno con su botón), el
   * vacío de los inmuebles y los atajos. Antes: un widget propio con barra y porcentaje, «¡Completado!», tres
   * tarjetas de beneficios con el ícono en caja, «Tu potencial mensual $0» fijo, recursos con flechas y una
   * tarjeta de ayuda.
   */
  const atajos = [
    { href: '/ayuda/propietarios', icon: FileText, label: locale === 'es' ? 'Guía para propietarios' : 'Landlord guide' },
    { href: '/propiedades', externo: true, icon: ChartBar, label: locale === 'es' ? 'Precios del mercado, en el marketplace' : 'Market prices, on the marketplace' },
    { href: '/productos/asegurabilidad', icon: Shield, label: locale === 'es' ? 'Cómo funciona el seguro' : 'How insurance works' },
    { href: '/ayuda', icon: Lifebuoy, label: locale === 'es' ? 'Centro de ayuda' : 'Help center' },
  ];

  return (
    <div className="bg-bg">
      {/* Llega después de cargar los inmuebles del inicio: entra UNA vez. */}
      <Appear className="space-y-6 p-6 lg:p-8">
        <EncabezadoDePantalla
          seccion={locale === 'es' ? 'Inicio' : 'Home'}
          titulo={`${greeting}, ${firstName}`}
          descripcion={locale === 'es' ? 'Publica tu primer inmueble y Leasefy te trae los candidatos y te cobra el arriendo.' : 'List your first property and Leasefy brings you applicants and collects your rent.'}
          accionPrincipal={
            <Button asChild size="sm" hideArrow className="max-lg:flex-1">
              <Link href="/publicar?from=panel">{locale === 'es' ? 'Publicar un inmueble' : 'List a property'}</Link>
            </Button>
          }
          data-testid="encabezado-del-propietario-sin-inmuebles"
        />

        <ListaParaEmpezar
          paraQue={locale === 'es' ? 'empezar a arrendar' : 'start renting'}
          requisitos={steps.map((step) => ({
            id: step.id,
            titulo: locale === 'es' ? step.labelEs : step.labelEn,
            detalle: locale === 'es' ? step.descriptionEs : step.descriptionEn,
            estado: step.completed ? ('listo' as const) : ('falta' as const),
            accion: step.completed ? undefined : step.action === 'video' ? (
              <Button size="sm" variant="outline" hideArrow onClick={() => handleStepClick(step)}>
                {locale === 'es' ? 'Ver' : 'See'}
              </Button>
            ) : step.href ? (
              <Button asChild size="sm" variant="outline" hideArrow>
                <Link href={step.href}>{locale === 'es' ? 'Ir' : 'Go'}</Link>
              </Button>
            ) : undefined,
          }))}
          data-testid="propietario-lo-que-falta"
        />

        <EmptyState
          icon={Buildings}
          title={locale === 'es' ? 'Todavía no tienes inmuebles publicados' : 'No published properties yet'}
          description={
            locale === 'es'
              ? // Ronda 30: dice qué va a aparecer aquí (antes repetía la descripción del encabezado: «Publica tu primer inmueble…»).
                'Aquí vas a ver tus inmuebles, quién se postuló a cada uno y sus visitas.'
              : 'Your properties, who applied to each one and their visits will show up here.'
          }
        />

        <section className="rounded-lg border border-border bg-surface p-5" data-testid="atajos-del-propietario-sin-inmuebles">
          <h2 className="mb-3 text-fg-subtle">
            <MonoLabel>{locale === 'es' ? 'Atajos' : 'Shortcuts'}</MonoLabel>
          </h2>
          <ul className="-mx-2 grid gap-0.5 sm:grid-cols-2">
            {atajos.map((a) => {
              const Icono = a.icon;
              const contenido = (
                <>
                  <Icono className="h-5 w-5 shrink-0 text-fg-muted" aria-hidden="true" />
                  <span className="text-sm text-fg">{a.label}</span>
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
      </Appear>

      {/* VideoCamera Modal */}
      <VideoCameraModal
        open={videoModalOpen}
        onClose={() => setVideoCameraModalOpen(false)}
        onComplete={() => markStepComplete('watch_intro')}
      />
    </div>
  );
}
