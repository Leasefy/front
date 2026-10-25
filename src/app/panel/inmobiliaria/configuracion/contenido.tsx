'use client';

/**
 * De un id de sección a lo que se dibuja, y con qué permiso.
 *
 * Está en un solo lugar para que las cinco rutas de Configuración
 * (`/configuracion`, `/configuracion/<slug>`, `/configuracion/equipo`,
 * `/configuracion/ia` y el legado `?tab=`) no puedan divergir.
 */

import { SeccionTerminacionesConElPropietario } from './SeccionTerminacionesConElPropietario';
import { SeccionAvisos } from './SeccionAvisos';
import { SeccionSlaDePqrs } from './SeccionSlaDePqrs';
import { SeccionReparaciones } from './SeccionReparaciones';
import { SeccionBitacora } from './SeccionBitacora';
import { SeccionMovimientos } from './SeccionMovimientos';
import { SeccionProteccionDeDatos } from './SeccionProteccionDeDatos';
import { AGENCY_ROLES, type AgencyRole } from '@/lib/auth/agency-roles';
import { PageGuard } from '@/components/auth/PageGuard';
import { ChatLessonsPanel } from '@/components/inmobiliaria/ai/lessons/ChatLessonsPanel';

import { SeccionBranding } from './SeccionBranding';
import { SeccionTuPagina } from './SeccionTuPagina';
import { SeccionEquipo } from './SeccionEquipo';
import { SeccionFacturacion } from './SeccionFacturacion';
import { SeccionIntegraciones } from './SeccionIntegraciones';
import { SeccionMigracion } from './SeccionMigracion';
import { SeccionConceptos } from './SeccionConceptos';
import { SeccionMandato } from './SeccionMandato';
import { SeccionCostosDeLaPlata } from './SeccionCostosDeLaPlata';
import { DiferenciasConocidas } from './DiferenciasConocidas';
import { CuentasDeLasDiferencias } from './CuentasDeLasDiferencias';
import { CuentasDelTraslado } from './CuentasDelTraslado';
// D-CONCILIACION (ola 3): la alerta de partidas, el efectivo y la cuenta contable de cada cuenta bancaria.
import { ConciliacionCierreYEfectivo } from './ConciliacionCierreYEfectivo';
import { SeccionMediosDePago } from './SeccionMediosDePago';
import { SeccionMediosDeRecibo } from './SeccionMediosDeRecibo';
import { SeccionSedes } from './SeccionSedes';
import { SeccionNotificaciones } from './SeccionNotificaciones';
import { SeccionPerfil } from './SeccionPerfil';
import { SeccionPermisos } from './SeccionPermisos';
import { SeccionComercial } from './SeccionComercial';
import { SeccionPreferencias } from './SeccionPreferencias';
import { SeccionSeguridad } from './SeccionSeguridad';
import { seccionPorId, type SeccionId } from './secciones';
import { useRef } from 'react';
import { IndiceDeLaPagina } from '@/components/pantalla/IndiceDeLaPagina';

/**
 * Ronda 30: Costos de la plata son cinco bloques seguidos (más de tres pantallas);
 * «En esta sección» lleva a cada uno y marca en cuál vas.
 */
function CostosDeLaPlataConIndice() {
  const raiz = useRef<HTMLDivElement>(null);
  return (
    <div className="space-y-6" ref={raiz}>
      <IndiceDeLaPagina raiz={raiz} />
      <div id="costos-de-mover-la-plata" data-indice="El 4x1000 y la pasarela">
        <SeccionCostosDeLaPlata />
      </div>
      <div id="diferencias-conocidas" data-indice="Diferencias conocidas">
        <DiferenciasConocidas />
      </div>
      {/* C2-DESHACER (Nico, P1): las cuentas del asiento automático de las diferencias. */}
      <div id="cuentas-de-las-diferencias" data-indice="Sus cuentas">
        <CuentasDeLasDiferencias />
      </div>
      {/* E-03 (QA-PAGOS-95 r2): las cuentas del PUC del traslado de la comisión (no tenían pantalla). */}
      <div id="cuentas-del-traslado" data-indice="El traslado de la comisión">
        <CuentasDelTraslado />
      </div>
      {/* D-CONCILIACION (Nico, P9/P10/P12): alerta a los 30 días, efectivo y cuenta contable por cuenta bancaria. */}
      <div id="cierre-y-efectivo" data-indice="Cierre y efectivo">
        <ConciliacionCierreYEfectivo />
      </div>
    </div>
  );
}

export function ContenidoDeSeccion({ id }: { id: SeccionId }) {
  switch (id) {
    case 'perfil':
      return <SeccionPerfil />;
    case 'tu-pagina':
      return <SeccionTuPagina />;
    case 'branding':
      return <SeccionBranding />;
    case 'facturacion':
      return <SeccionFacturacion />;
    case 'equipo':
      return <SeccionEquipo />;
    case 'permisos':
      return <SeccionPermisos />;
    case 'comercial':
      return <SeccionComercial />;
    case 'medios-de-pago':
      return <SeccionMediosDePago />;
    case 'medios-de-recibo':
      return <SeccionMediosDeRecibo />;
    case 'costos-de-la-plata':
      // 02-10-2026 (S2-D): las diferencias conocidas de la conciliación (la
      // retención, la comisión) son de la misma familia: lo que cuesta mover
      // la plata. Misma puerta (sólo el administrador).
      return <CostosDeLaPlataConIndice />;
    case 'sedes':
      return <SeccionSedes />;
    case 'mandato':
      return (
        <div className="space-y-10">
          <SeccionMandato />
          {/* Portofino 22-10: qué terminaciones decide el propietario. */}
          <SeccionTerminacionesConElPropietario />
        </div>
      );
    case 'conceptos':
      return <SeccionConceptos />;
    case 'migracion':
      return <SeccionMigracion />;
    case 'integraciones':
      return <SeccionIntegraciones />;
    // 🔴 18-09-2026: qué le llega SOLO a tus clientes. Todo arranca apagado.
    // 🔴 18-09-2026: quién movió plata. Sólo lectura, para el dueño.
    case 'bitacora':
      return <SeccionBitacora />;
    // 🔴 22-09-2026: quién hizo qué en TODO el panel, con su rol.
    case 'movimientos':
      return <SeccionMovimientos />;
    // 🔴 23-09-2026: las solicitudes de habeas data de los titulares (Ley 1581).
    case 'proteccion-de-datos':
      return <SeccionProteccionDeDatos />;
    case 'avisos':
      return <SeccionAvisos />;
    case 'sla-de-pqrs':
      return <SeccionSlaDePqrs />;
    // Portofino 22-10: tiempos por prioridad y quién puede hacer la reparación.
    case 'reparaciones':
      return <SeccionReparaciones />;
    case 'notificaciones':
      return <SeccionNotificaciones />;
    case 'preferencias':
      return <SeccionPreferencias />;
    case 'seguridad':
      return <SeccionSeguridad />;
    case 'ia':
      // La certificación de lo que aprendió el asistente. Sin gate propio,
      // como cuando era `/configuracion/ia`: el panel se cuida solo.
      return <ChatLessonsPanel />;
  }
}

/** El mismo `PageGuard` que tenía la pantalla antes de unificarse. */
export function GuardaDeSeccion({ id, children }: { id: SeccionId; children: React.ReactNode }) {
  const { gate } = seccionPorId(id);
  if (gate.tipo === 'todos') {
    if (!gate.menos || gate.menos.length === 0) return <>{children}</>;
    // QA-IA-95: todos los roles menos los de `menos` (por URL tampoco entran).
    const roles = (Object.values(AGENCY_ROLES) as AgencyRole[]).filter((r) => !gate.menos!.includes(r));
    return <PageGuard roles={roles}>{children}</PageGuard>;
  }
  if (gate.tipo === 'admin') return <PageGuard adminOnly>{children}</PageGuard>;
  if (gate.tipo === 'roles') return <PageGuard roles={gate.roles as AgencyRole[]}>{children}</PageGuard>;
  return <PageGuard module={gate.module}>{children}</PageGuard>;
}

/** Sección completa: su guard y su contenido. */
export function SeccionCompleta({ id }: { id: SeccionId }) {
  return (
    <GuardaDeSeccion id={id}>
      <ContenidoDeSeccion id={id} />
    </GuardaDeSeccion>
  );
}
