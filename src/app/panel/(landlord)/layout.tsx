'use client';

import { Toaster } from '@/components/ui/toast';
import { SquaresFour, Buildings, Chat, FileText, Wallet, Lifebuoy, ArrowsLeftRight } from '@phosphor-icons/react';
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
import { ModuloConDemo } from '@/components/venta/ModuloConDemo';
import { demoDelPropietario } from '@/lib/venta/demos-del-panel';
import { abiertaParaElPropietarioGratis, claveDeDemoDelPropietario } from '@/lib/venta/propietario-gratis';
import { esLaPestana } from '@/lib/nav/portal-del-inquilino';
import { enlaceDeWhatsApp } from '@/lib/venta/whatsapp-de-leasefy';
import {
  PropietarioDeInmobiliariaProvider,
  esRutaDelPropietarioDeInmobiliaria,
} from '@/lib/context/PropietarioDeInmobiliariaContext';
import { pasosDelPerfilDelPropietario } from '@/lib/perfil/pasos-del-perfil-del-propietario';
import { useUnreadMessages } from '@/lib/hooks/useMessages';
import { SeccionesDelPortal } from '@/components/portales/SeccionesDelPortal';
import {
  CONTRATOS_Y_PLATA,
  MIS_INMUEBLES,
  MI_PLATA,
  SOLICITUDES_DEL_INDEPENDIENTE,
  SOLICITUDES_DEL_PROPIETARIO,
  rutasDelPropietario,
  seccionDelIndependiente,
  seccionDelPropietario,
} from '@/lib/nav/portal-del-propietario';

/**
 * El menú del propietario INDEPENDIENTE — Nico eligió «el mismo criterio»
 * (21-10-2026): de 14 filas y una sección de «Pronto» a cinco, con las
 * pestañas de cada sección arriba (`lib/nav/portal-del-propietario.ts`). Las
 * pantallas que eran «Pronto» siguen en su pestaña; nada se borró.
 */
const LANDLORD_NAV_ITEMS: NavItem[] = [
  { label: 'Inicio', href: '/panel', icon: SquaresFour, exact: true },
  { label: MIS_INMUEBLES.es, href: MIS_INMUEBLES.pestanas[0].href, icon: Buildings, tambienEn: rutasDelPropietario(MIS_INMUEBLES) },
  { label: CONTRATOS_Y_PLATA.es, href: CONTRATOS_Y_PLATA.pestanas[0].href, icon: FileText, tambienEn: rutasDelPropietario(CONTRATOS_Y_PLATA) },
  {
    label: SOLICITUDES_DEL_INDEPENDIENTE.es,
    href: SOLICITUDES_DEL_INDEPENDIENTE.pestanas[0].href,
    icon: Lifebuoy,
    tambienEn: rutasDelPropietario(SOLICITUDES_DEL_INDEPENDIENTE),
  },
  { label: 'Mensajes', href: '/panel/mensajes', icon: Chat },
];

/**
 * El menú de quien tiene a una INMOBILIARIA como administradora: sólo lo suyo.
 * Sin Candidatos, Visitas, Arriendos ni «Pronto» (eso es del propietario
 * independiente, y sus rutas responden «panel en pausa»), ni plan que mejorar.
 *
 * Nico eligió «Tablero + 3 secciones» (21-10-2026): de 10 filas a cuatro. Lo de
 * cada sección va en pestañas arriba (`SeccionesDelPortal`, mapa en
 * `lib/nav/portal-del-propietario.ts`); nada se borró.
 */
const AGENCY_OWNER_NAV_ITEMS: NavItem[] = [
  { label: 'Inicio', href: '/panel', icon: SquaresFour, exact: true },
  {
    label: MI_PLATA.es,
    href: MI_PLATA.pestanas[0].href,
    icon: Wallet,
    tambienEn: rutasDelPropietario(MI_PLATA),
  },
  {
    label: SOLICITUDES_DEL_PROPIETARIO.es,
    href: SOLICITUDES_DEL_PROPIETARIO.pestanas[0].href,
    icon: Lifebuoy,
    tambienEn: rutasDelPropietario(SOLICITUDES_DEL_PROPIETARIO),
  },
  { label: 'Mensajes', href: '/panel/mensajes', icon: Chat },
];

/** El número de no leídos en la fila de Mensajes (la reunión: «mensajes, más visible»). */
function conNoLeidos(filas: NavItem[], noLeidos: number): NavItem[] {
  return filas.map((f) => (f.href === '/panel/mensajes' && noLeidos > 0 ? { ...f, badge: noLeidos } : f));
}

/**
 * AVALI-3 (QA de agentes 17-10; Nico: «una cuenta, dos portales»): el
 * propietario que además es inquilino entra con su cuenta de inquilino. Ve el
 * menú del propietario de inmobiliaria y, al final, el camino a su portal de
 * inquilino.
 */
const PORTAL_DEL_INQUILINO: NavItem = { label: 'Mi portal de inquilino', href: '/inquilino', icon: ArrowsLeftRight };

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
  // AVALI-3: una cuenta de inquilino entra sólo si es propietario de inmobiliaria.
  // «Cambiar de cuenta» (21-10-2026): igual una cuenta de inmobiliaria que es
  // propietaria (la regla es la misma: no nació como propietario).
  const { user } = useAuth();
  const esCuentaDeInquilino = user?.role !== 'landlord';
  const esPropietarioConfirmado =
    !administrados.cargando && (administrados.doc !== null || Boolean(administrados.fichaSinContratos));
  const showUpgrade = !deInmobiliaria && subscription?.planId === 'starter';
  // El propietario independiente en el plan gratis (Nico, 20-10-2026): sus
  // inmuebles, candidatos y visitas abiertos; lo demás en demo con WhatsApp.
  const propietarioGratis = showUpgrade && !administrados.cargando;
  const pathname = usePathname();
  const router = useRouter();
  const { unreadCount } = useUnreadMessages();
  useEffect(() => {
    // AVALI-3: una cuenta de inquilino que NO es propietario no tiene nada acá.
    if (esCuentaDeInquilino && !administrados.cargando && !esPropietarioConfirmado) {
      router.replace(getRoleHomeRoute(user?.role));
    }
  }, [esCuentaDeInquilino, administrados.cargando, esPropietarioConfirmado, router, user?.role]);
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
        navItems={conNoLeidos(
          deInmobiliaria
            ? esCuentaDeInquilino
              ? [...AGENCY_OWNER_NAV_ITEMS, PORTAL_DEL_INQUILINO]
              : AGENCY_OWNER_NAV_ITEMS
            : propietarioGratis
              ? LANDLORD_NAV_ITEMS.map((f) => (abiertaParaElPropietarioGratis(f.href) ? f : { ...f, tag: 'Demo' }))
              : LANDLORD_NAV_ITEMS,
          unreadCount,
        )}
        logo={{
          title: 'PLan',
          // 🔴 Adentro de la plataforma el logo vuelve al inicio del panel, no
          // a la landing (Nico, 2026-09-04). Mismo criterio en los tres
          // paneles, y el destino sale de la única fuente de verdad de «dónde
          // vive el inicio de cada rol».
          href: getRoleHomeRoute('landlord'),
        }}
        showUpgrade={showUpgrade}
        upgradeHref={
          propietarioGratis
            ? enlaceDeWhatsApp({ quien: 'propietario', nombre: user?.firstName ?? null })
            : '/panel/upgrade'
        }
        upgradeLabel={propietarioGratis ? 'Que Leasefy lo administre' : 'Mejorar Plan'}
        // Ronda 28 (revisora r27): en Mi perfil no sale: ahí la misma lista ya dice lo que falta (eran dos).
        profileCompletion={user && !perfilCompleto && pathname !== '/panel/perfil' ? {
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
        {/* Revisora r25: las pantallas también saben si quien mira tiene inmobiliaria (Por decidir no le habla
            de «tu inmobiliaria» al independiente). Sólo se lee; no cambia qué se monta. */}
        <PropietarioDeInmobiliariaProvider value={deInmobiliaria}>
        <main id="main-content" tabIndex={-1}>
          <SeccionesDelPortal
            seccion={deInmobiliaria ? seccionDelPropietario(pathname ?? '') : rielDelIndependiente(seccionDelIndependiente(pathname ?? ''), pathname ?? '', propietarioGratis)}
          />
          {/* Una pantalla del propietario independiente no se monta para quien
              tiene inmobiliaria: ni pide datos (503) ni muestra ceros. */}
          {(deInmobiliaria && !esRutaDelPropietarioDeInmobiliaria(pathname)) ||
          (esCuentaDeInquilino && !esPropietarioConfirmado)
            ? null
            : propietarioGratis && !abiertaParaElPropietarioGratis(pathname ?? '')
              ? (
                <ModuloConDemo
                  demo={demoDelPropietario(claveDeDemoDelPropietario(pathname ?? ''))}
                  quien="propietario"
                  nombre={user?.firstName ?? null}
                  empresa={[user?.firstName, user?.lastName].filter(Boolean).join(' ') || null}
                />
              )
              : children}
        </main>
        </PropietarioDeInmobiliariaProvider>
      </div>

      {/* El <Toaster> es único y vive en el layout raíz (src/app/layout.tsx), fuera de
          <ProtectedRoute>: aquí adentro se perdía todo toast emitido mientras el guard
          resuelve. No montes otro: sonner duplica el toast por cada Toaster montado. */}
    </div>
  );
}

/**
 * Panel Layout - PLan CRM style
 */
export default function PanelLayout({ children }: PanelLayoutProps) {
  return (
    // AVALI-3: también la cuenta de inquilino (si no es propietario, el layout la devuelve a /inquilino).
    <ProtectedRoute allowedRoles={['landlord', 'tenant']}>
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

/**
 * Ronda 28 (revisora r27, CE): en el plan gratis, el riel no ofrece pestañas que llevan a la venta
 * («Elegir inquilino» abría `escoger-inquilino`, que es demo). La pestaña en la que se está se queda,
 * para que la ruta abierta desde el menú siga marcada. Sin el plan gratis, el riel de siempre.
 */
function rielDelIndependiente<S extends { pestanas: readonly { href: string; tambienEn?: readonly string[] }[] }>(
  seccion: S | null,
  pathname: string,
  propietarioGratis: boolean,
): S | null {
  if (!seccion || !propietarioGratis) return seccion;
  return {
    ...seccion,
    pestanas: seccion.pestanas.filter((p) => abiertaParaElPropietarioGratis(p.href) || esLaPestana(p, pathname)),
  };
}
