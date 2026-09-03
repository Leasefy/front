'use client';

import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { usePermissionsContext } from '@/lib/context/PermissionsContext';
import { pasaGateDeFila } from '@/lib/nav/agency-nav-filter';
import { canSeeBusinessModule } from '@/lib/nav/agency-module-scope';
import { findAgentWorkspace } from '@/lib/nav/agentWorkspaceNav';
import {
  moduloDeLaRuta,
  pestanaActiva,
  pestanasDelModulo,
  type PantallaDelPanel,
} from '@/lib/nav/arquitectura-del-panel';
import { BarraDePestanas, type PestanaDeBarra } from './BarraDePestanas';

/**
 * ModuloTabs — las pantallas (N3) de un módulo, como pestañas debajo del
 * header: Cobros · Recaudo · Cartera · Cobranza.
 *
 * Se monta UNA vez en `app/panel/inmobiliaria/layout.tsx` y se esconde sola:
 *
 *   · fuera de un módulo con ≥2 pestañas visibles (Pipeline, Mensajes…);
 *   · cuando ninguna pestaña coincide con la ruta —una ficha (`/contratos/7`),
 *     un flujo (`/inmuebles/nuevo`), la cuenta de cobro imprimible—: la ficha
 *     ya trae su cabecera y su «Volver», y la barra sólo sumaría ruido;
 *   · dentro de un agente anidado (`/cobros/cobranza/**`): ahí manda la barra
 *     del agente (WorkspaceNav) y el breadcrumb del header ya dice
 *     «Cobros › Cobranza». Cuando el agente ES la raíz del módulo (Pagos,
 *     Conciliación) la barra se queda: es la única puerta a las hermanas.
 *
 * Los gates son los MISMOS que tenía cada pantalla como entrada del sidebar
 * (`module`/`roles`/`scope`), resueltos con las mismas funciones que usa el
 * sidebar: nadie ve una pestaña que no podía abrir antes.
 */
export function ModuloTabs() {
  const pathname = usePathname() ?? '';
  const { t } = useI18n();
  const { canAccess, isAdmin, agencyRole, agentAccessStatus } = usePermissionsContext();

  const modulo = moduloDeLaRuta(pathname);
  if (!modulo) return null;

  const agente = findAgentWorkspace(pathname);
  if (agente && agente.basePath !== modulo.href) return null;

  const ctx = { canAccess, isAdmin, agencyRole, agentUnverified: agentAccessStatus === 'sin-verificar' };
  const visibles = pestanasDelModulo(modulo).filter(
    (p) => pasaGateDeFila(p, ctx) && canSeeBusinessModule(p.scope, { isAdmin, agencyRole }),
  );
  if (visibles.length < 2) return null;

  const activa = pestanaActiva(visibles, pathname);
  if (!activa) return null;

  const ruta = pathname.split('?')[0] ?? pathname;
  const etiqueta = (p: PantallaDelPanel) => (p.hintKey ? `${t(p.labelKey)} · ${t(p.hintKey)}` : t(p.labelKey));

  const items: PestanaDeBarra[] = visibles.map((p) => ({
    href: p.href,
    label: etiqueta(p),
    icon: p.icon,
    active: activa.href === p.href,
    current: ruta === p.href,
    ia: p.ia,
    dataTourTarget: p.dataTourTarget,
  }));

  return (
    <BarraDePestanas
      items={items}
      ariaLabel={`Pantallas de ${t(modulo.labelKey)}`}
      cssVar="--modulo-tabs-h"
      topClass="top-16"
      nivel="modulo"
      pathname={pathname}
    />
  );
}
