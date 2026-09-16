'use client';

import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { usePermissionsContext } from '@/lib/context/PermissionsContext';
import { pasaGateDeFila } from '@/lib/nav/agency-nav-filter';
import { canSeeBusinessModule } from '@/lib/nav/agency-module-scope';
import {
  CARAS_DE_LA_PLATA,
  moduloDeLaRuta,
  pestanaActiva,
  pestanasDelModulo,
  type CaraDeLaPlata,
  type PantallaDelPanel,
} from '@/lib/nav/arquitectura-del-panel';
import { BarraDePestanas, type CaraDeLaBarra, type PestanaDeBarra } from './BarraDePestanas';

/**
 * SeccionesDelModulo — las secciones (N3) de un módulo, como cards chicas
 * dentro de un rectángulo debajo del header: [Contratos] [Renovaciones].
 *
 * Se monta UNA vez en `app/panel/inmobiliaria/layout.tsx` y se esconde sola:
 *
 *   · fuera de un módulo con ≥2 secciones visibles (Pipeline, Mensajes,
 *     Inmuebles, cualquier sala de «Agentes IA»…): una card sola no da a dónde
 *     pasar;
 *   · cuando ninguna sección coincide con la ruta —una ficha (`/contratos/7`),
 *     un flujo (`/inmuebles/nuevo`), la cuenta de cobro imprimible—: la ficha
 *     ya trae su cabecera y su «Volver», y la franja sólo sumaría ruido.
 *
 * Lo que NO hace, a propósito: esconderse al entrar en una sección. Antes, al
 * entrar en Avalúos las pestañas «Inmuebles · Avalúos» desaparecían y en su
 * mismo sitio aparecían las del agente (Resumen · Mis solicitudes ·
 * Configuración): dos niveles distintos con la misma cara, turnándose el
 * lugar (Nico, 2026-09-03). Ahora las secciones se quedan quietas y la
 * PROFUNDIDAD de la sección va DEBAJO, con otra cara (las pestañas propias de
 * la página). La regla vale para todos los módulos: las secciones son cards;
 * lo que hay dentro de cada una son pestañas.
 *
 * 🔴 Desde el 2026-09-16 ningún agente es una sección: tienen su propia fila
 * en «Agentes IA», con su URL de siempre. `moduloDeLaRuta` elige el módulo de
 * href más largo, así que en `/pagos/cobranza/…` el dueño es Cobranza —que no
 * tiene secciones— y el riel de Pagos no aparece. Una sala no se ve dentro de
 * dos lugares a la vez.
 *
 * Los gates son los MISMOS que tenía cada pantalla como entrada del sidebar
 * (`module`/`roles`/`scope`), resueltos con las mismas funciones que usa el
 * sidebar: nadie ve una card que no podía abrir antes. Eso vale también para
 * el módulo único de plata: quien no tiene `dispersiones` no ve la card de
 * Dispersiones aunque ahora viva en el mismo módulo que su cartera.
 *
 * ── 🔴 Las dos CARAS (Nico, 15 y 16-09) ─────────────────────────────────────
 *
 * Un módulo puede tener dos caras del mismo asunto (`cara` en
 * `arquitectura-del-panel.ts`; hoy sólo Pagos: lo que ENTRA de los inquilinos
 * y lo que SALE hacia los propietarios). Se dibujaban como dos rótulos en
 * versalitas metidos ENTRE las cards del mismo riel, y Nico no los entendía:
 * «eso de arriba de inquilinos y propietarios no se entiende, esa separación
 * de las tabs de arriba». Eran dos niveles distintos —de qué lado estoy y qué
 * pantalla abro— peleando por el mismo renglón.
 *
 * Ahora:
 *   1. **la cara es un selector explícito** en su propio renglón, arriba;
 *   2. **debajo van SÓLO las secciones de la cara elegida**;
 *   3. **la cara se deduce de la RUTA** —estás en Dispersiones ⇒ estás en
 *      Propietarios— y por defecto entra Inquilinos, que es donde se opera
 *      todos los días;
 *   4. cada cara es un ENLACE a su primera sección visible, así que viaja en
 *      la URL: se puede compartir y se puede volver.
 *
 * Una cara sin ninguna sección visible NO se ofrece, y con menos de dos caras
 * presentes no se dibuja el selector: no se anuncia una separación que, para
 * esa persona, no existe. Es lo que hace que quien sólo tiene `cobros` vea su
 * cara y ni se entere de la de propietarios.
 *
 * 🔴 Una sección SIN cara se dibuja en las dos, y eso es una puerta trasera al
 * mismo defecto: `/pagos` no tenía cara y aparecía como primera card también
 * en «Propietarios», mostrando la deuda de los inquilinos (Nico, 2026-09-16).
 * Ya no hay ninguna —la raíz de Pagos declara la suya—, pero el filtro sigue
 * aceptándolas: son legítimas sólo si la pantalla de verdad mira las dos.
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

  /*
   * Las caras que esta persona puede ver, con su primera sección visible como
   * destino. `CARAS_DE_LA_PLATA` manda el orden: primero lo que entra.
   */
  const carasPresentes = CARAS_DE_LA_PLATA.map((c) => ({
    ...c,
    primera: visibles.find((p) => p.cara === c.cara),
  })).filter((c): c is typeof c & { primera: PantallaDelPanel } => Boolean(c.primera));

  const hayDosCaras = carasPresentes.length > 1;

  /*
   * La cara activa sale de la RUTA. La Sala (una pantalla sin `cara`) mira las
   * dos, así que ahí se entra por la primera presente —Inquilinos—, que es
   * donde se opera todos los días.
   */
  const caraActiva: CaraDeLaPlata | null = hayDosCaras
    ? (activa.cara ?? carasPresentes[0]!.cara)
    : null;

  // Sin cara (la Sala) primero; después, sólo las de la cara elegida.
  const enPantalla = hayDosCaras
    ? visibles.filter((p) => !p.cara || p.cara === caraActiva)
    : visibles;

  const items: PestanaDeBarra[] = enPantalla.map((p) => ({
    href: p.href,
    label: etiqueta(p),
    icon: p.icon,
    active: activa.href === p.href,
    current: ruta === p.href,
    ia: p.ia,
    dataTourTarget: p.dataTourTarget,
  }));

  const caras: CaraDeLaBarra[] = carasPresentes.map((c) => ({
    clave: c.cara,
    label: t(c.labelKey),
    detalle: t(c.detalleKey),
    href: c.primera.href,
    icon: c.icon,
    activa: c.cara === caraActiva,
  }));

  /*
   * Con dos caras el riel de abajo NO son «las secciones de Pagos»: son las de
   * la cara elegida. Un lector de pantalla que oiga «Secciones de Pagos» en
   * los dos rieles no tiene cómo saber que cambió de lado.
   */
  const caraElegida = caras.find((c) => c.activa);
  const ariaDelRiel = caraElegida
    ? `${t(modulo.labelKey)} · ${caraElegida.label}`
    : `Secciones de ${t(modulo.labelKey)}`;

  return (
    <BarraDePestanas
      items={items}
      ariaLabel={ariaDelRiel}
      cssVar="--secciones-h"
      topClass="top-16"
      nivel="secciones"
      pathname={pathname}
      caras={caras}
      carasAriaLabel={`Caras de ${t(modulo.labelKey)}`}
    />
  );
}
