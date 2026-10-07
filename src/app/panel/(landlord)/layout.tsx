'use client';

import { Toaster } from '@/components/ui/toast';
import { SquaresFour, Buildings, Users, Chat, Gear, FileText, House, CalendarBlank, Wallet, UsersThree, ChatCircleText, Bell, Receipt, SealCheck, Wrench, Lifebuoy, Tag } from '@phosphor-icons/react';
// Sparkle import removed — re-add when AI Beta nav item is uncommented
import { DecisionProvider } from '@/lib/context/DecisionContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PlanSidebar, NavItem, ProfileCompletionStep } from '@/components/ui/plan/PlanSidebar';
import { PlanHeader } from '@/components/ui/plan/PlanHeader';
import { SidebarProvider, useSidebar } from '@/lib/context/SidebarContext';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { useMySubscription } from '@/lib/hooks/useSubscription';
import { cn } from '@/lib/utils';
import { getRoleHomeRoute } from '@/lib/auth/role-routes';
import { useAuth } from '@/lib/auth';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useContratosAdministrados } from '@/components/landlord/ContratosConLaInmobiliaria';
import {
  PropietarioDeInmobiliariaProvider,
  esRutaDelPropietarioDeInmobiliaria,
} from '@/lib/context/PropietarioDeInmobiliariaContext';
import { pasosDelPerfilDelPropietario } from '@/lib/perfil/pasos-del-perfil-del-propietario';

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
  // Lo que la inmobiliaria le ha girado y lo que le falta por girar, contrato
  // por contrato. Es el papel que el propietario necesita para la exógena.
  {
    label: 'Estado de cuenta',
    href: '/panel/estado-de-cuenta',
    icon: Receipt,
  },
  // 🔴 D12 (17-09-2026): las reparaciones a su cargo las aprueba él, con un
  // clic. Es real (back), no un shell «Pronto».
  {
    label: 'Aprobar reparaciones',
    href: '/panel/aprobaciones',
    icon: Wrench,
  },
  // 🔴 #14 (MANOS-1, 04-10-2026): cuando su inmueble tiene candidatos, el
  // propietario escoge quién lo arrienda (Avali se lo pide y se lo recuerda).
  {
    label: 'Escoger inquilino',
    href: '/panel/escoger-inquilino',
    icon: UsersThree,
  },
  // MANOS-2 (04-10-2026): cuando su inmueble lleva más de un mes desocupado,
  // la inmobiliaria le pregunta si quiere revisar el canon; el número lo pone él.
  {
    label: 'Revisar el canon',
    href: '/panel/revisar-canon',
    icon: Tag,
  },
  // SO-27 (PQRS-FIX, 04-10-2026): el propietario radica sus PQRS y reporta
  // daños desde su portal (antes sólo podía escribir en Mensajes).
  {
    label: 'Solicitudes',
    href: '/panel/solicitudes',
    icon: Lifebuoy,
  },
  {
    label: 'Mensajes',
    href: '/panel/mensajes',
    icon: Chat,
    // Sin `badge`: el 3 estaba escrito a mano, no contaba nada.
  },
  /*
   * 🔴 (21-09-2026) Estas dos pantallas EXISTÍAN y nadie podía llegar a ellas:
   * `/panel/certificados` estaba construida desde el 17-09 y no figuraba en
   * ningún menú, así que sólo la veía quien escribiera la URL. «Mis informes»
   * es nueva (certificado anual de ingresos + historial de reparaciones con su
   * comprobante). Las dos son reales: sin `tag: 'Pronto'`.
   */
  {
    label: 'Mis informes',
    href: '/panel/informes',
    icon: Receipt,
  },
  {
    label: 'Certificados de retención',
    href: '/panel/certificados',
    icon: SealCheck,
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

/**
 * El menú de quien tiene a una INMOBILIARIA como administradora: sólo lo suyo.
 * Sin Candidatos, Visitas, Arriendos ni «Pronto» (eso es del propietario
 * independiente, y sus rutas responden «panel en pausa»), ni plan que mejorar.
 */
const AGENCY_OWNER_NAV_ITEMS: NavItem[] = [
  { label: 'Inicio', href: '/panel', icon: SquaresFour, exact: true },
  { label: 'Estado de cuenta', href: '/panel/estado-de-cuenta', icon: Receipt },
  { label: 'Aprobar reparaciones', href: '/panel/aprobaciones', icon: Wrench },
  // 🔴 #14 (MANOS-1, 04-10-2026): escoger entre los candidatos de su inmueble.
  { label: 'Escoger inquilino', href: '/panel/escoger-inquilino', icon: UsersThree },
  // MANOS-2 (04-10-2026): revisar el canon del inmueble desocupado (el número lo pone él).
  { label: 'Revisar el canon', href: '/panel/revisar-canon', icon: Tag },
  // SO-27 (PQRS-FIX, 04-10-2026): radicar PQRS y reportar daños desde su portal.
  { label: 'Solicitudes', href: '/panel/solicitudes', icon: Lifebuoy },
  { label: 'Mis informes', href: '/panel/informes', icon: Receipt },
  { label: 'Certificados de retención', href: '/panel/certificados', icon: SealCheck },
  { label: 'Mensajes', href: '/panel/mensajes', icon: Chat },
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
  // ¿Una inmobiliaria le administra los inmuebles? Mientras se sabe, se le da el
  // menú corto: ofrecerle «Mejorar plan» a quien no lo compra sería peor que
  // un menú que se completa un instante después.
  const administrados = useContratosAdministrados();
  const deInmobiliaria = administrados.cargando || administrados.doc !== null || Boolean(administrados.fichaSinContratos);
  const showUpgrade = !deInmobiliaria && subscription?.planId === 'starter';
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    // Las pantallas del propietario independiente no son suyas: de ahí vuelve a lo suyo.
    if (!administrados.cargando && administrados.doc && !esRutaDelPropietarioDeInmobiliaria(pathname)) {
      router.replace('/panel/estado-de-cuenta');
    }
  }, [administrados.cargando, administrados.doc, pathname, router]);

  /*
   * 🔴 ARREGLOS-4 (03-10-2026) · «Completa tu perfil» cuenta lo MISMO que la
   * tarjeta del perfil: lo que la persona ya guardó, del usuario de la sesión
   * (`lib/perfil/pasos-del-perfil-del-propietario.ts`). Antes contaba los
   * cuatro pasos del asistente de bienvenida guardados en el `localStorage` de
   * ESTE navegador: «0/4» en la barra contra «3 de 5» en el perfil, y en otro
   * navegador (o con la cuenta nacida de la migración) 0/4 para siempre.
   */
  const { user } = useAuth();
  const pasosDelPerfil = pasosDelPerfilDelPropietario(user);
  const onboardingSteps: ProfileCompletionStep[] = pasosDelPerfil.map((p, i) => ({
    id: i + 1,
    labelEs: p.etiquetaEs,
    labelEn: p.etiquetaEn,
    completed: p.completo,
  }));
  const completedCount = onboardingSteps.filter((s) => s.completed).length;
  const totalSteps = onboardingSteps.length;
  const percentage = Math.round((completedCount / totalSteps) * 100);
  const perfilCompleto = completedCount === totalSteps;

  return (
    <div className="min-h-screen bg-plan-page">
      {/* PLan CRM Sidebar */}
      <PlanSidebar
        navItems={deInmobiliaria ? AGENCY_OWNER_NAV_ITEMS : LANDLORD_NAV_ITEMS}
        logo={{
          title: 'PLan',
          // 🔴 Adentro de la plataforma el logo vuelve al inicio del panel, no
          // a la landing (Nico, 2026-09-04). Mismo criterio en los tres
          // paneles, y el destino sale de la única fuente de verdad de «dónde
          // vive el inicio de cada rol».
          href: getRoleHomeRoute('landlord'),
        }}
        showUpgrade={showUpgrade}
        upgradeHref="/panel/upgrade"
        upgradeLabel="Mejorar Plan"
        profileCompletion={user && !perfilCompleto ? {
          percentage,
          // Los pasos son los del perfil: ahí se completan.
          href: '/panel/perfil',
          label: locale === 'es' ? 'Completa tu perfil' : 'Complete your profile',
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
        <PropietarioDeInmobiliariaProvider value={deInmobiliaria}>
          <PlanHeader showMagnifyingGlass={!deInmobiliaria} />
        </PropietarioDeInmobiliariaProvider>
        <main id="main-content" tabIndex={-1}>
          {/* Una pantalla del propietario independiente no se monta para quien
              tiene inmobiliaria: ni pide datos (503) ni muestra ceros. */}
          {deInmobiliaria && !esRutaDelPropietarioDeInmobiliaria(pathname) ? null : children}
        </main>
      </div>

      {/* El <Toaster> es único y vive en el layout raíz (src/app/layout.tsx), fuera de
          <ProtectedRoute>: acá adentro se perdía todo toast emitido mientras el guard
          resuelve. No montes otro: sonner duplica el toast por cada Toaster montado. */}
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
