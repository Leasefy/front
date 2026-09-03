'use client';

import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { usePermissionsContext } from '@/lib/context/PermissionsContext';
import { pasaGateDeFila } from '@/lib/nav/agency-nav-filter';
import { canSeeBusinessModule } from '@/lib/nav/agency-module-scope';
import {
  moduloDeLaRuta,
  pestanaActiva,
  pestanasDelModulo,
  type PantallaDelPanel,
} from '@/lib/nav/arquitectura-del-panel';
import { BarraDePestanas, type PestanaDeBarra } from './BarraDePestanas';

/**
 * SeccionesDelModulo — las secciones (N3) de un módulo, como cards chicas
 * dentro de un rectángulo debajo del header: [Inmuebles] [Avalúos IA];
 * [Cobros] [Recaudo] [Cartera] [Cobranza IA].
 *
 * Se monta UNA vez en `app/panel/inmobiliaria/layout.tsx` y se esconde sola:
 *
 *   · fuera de un módulo con ≥2 secciones visibles (Pipeline, Mensajes,
 *     Conciliación…): una card sola no da a dónde pasar;
 *   · cuando ninguna sección coincide con la ruta —una ficha (`/contratos/7`),
 *     un flujo (`/inmuebles/nuevo`), la cuenta de cobro imprimible—: la ficha
 *     ya trae su cabecera y su «Volver», y la franja sólo sumaría ruido.
 *
 * Lo que NO hace, a propósito: esconderse dentro de un agente. Antes, al
 * entrar en Avalúos las pestañas «Inmuebles · Avalúos» desaparecían y en su
 * mismo sitio aparecían las del agente (Resumen · Mis solicitudes ·
 * Configuración): dos niveles distintos con la misma cara, turnándose el
 * lugar (Nico, 2026-09-03). Ahora las secciones se quedan quietas —Avalúos
 * sigue marcada en `/inmuebles/avaluos/cola`— y la PROFUNDIDAD de la sección
 * va DEBAJO, con otra cara: las pestañas del agente (`WorkspaceNav`) o las
 * pestañas propias de la página. La regla vale para todos los módulos: las
 * secciones son cards; lo que hay dentro de cada una son pestañas.
 *
 * Los gates son los MISMOS que tenía cada pantalla como entrada del sidebar
 * (`module`/`roles`/`scope`), resueltos con las mismas funciones que usa el
 * sidebar: nadie ve una card que no podía abrir antes.
 */
export function SeccionesDelModulo() {
  const pathname = usePathname() ?? '';
  const { t } = useI18n();
  const { canAccess, isAdmin, agencyRole, agentAccessStatus } = usePermissionsContext();

  const modulo = moduloDeLaRuta(pathname);
  if (!modulo) return null;

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
      ariaLabel={`Secciones de ${t(modulo.labelKey)}`}
      cssVar="--secciones-h"
      topClass="top-16"
      nivel="secciones"
      pathname={pathname}
    />
  );
}
