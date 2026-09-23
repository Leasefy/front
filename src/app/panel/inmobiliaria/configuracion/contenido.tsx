'use client';

/**
 * De un id de sección a lo que se dibuja, y con qué permiso.
 *
 * Está en un solo lugar para que las cinco rutas de Configuración
 * (`/configuracion`, `/configuracion/<slug>`, `/configuracion/equipo`,
 * `/configuracion/ia` y el legado `?tab=`) no puedan divergir.
 */

import { SeccionAvisos } from './SeccionAvisos';
import { SeccionSlaDePqrs } from './SeccionSlaDePqrs';
import { SeccionBitacora } from './SeccionBitacora';
import { SeccionMovimientos } from './SeccionMovimientos';
import { PageGuard } from '@/components/auth/PageGuard';
import { ChatLessonsPanel } from '@/components/inmobiliaria/ai/lessons/ChatLessonsPanel';

import { SeccionBranding } from './SeccionBranding';
import { SeccionEquipo } from './SeccionEquipo';
import { SeccionFacturacion } from './SeccionFacturacion';
import { SeccionIntegraciones } from './SeccionIntegraciones';
import { SeccionMigracion } from './SeccionMigracion';
import { SeccionMandato } from './SeccionMandato';
import { SeccionCostosDeLaPlata } from './SeccionCostosDeLaPlata';
import { SeccionMediosDePago } from './SeccionMediosDePago';
import { SeccionMediosDeRecibo } from './SeccionMediosDeRecibo';
import { SeccionSedes } from './SeccionSedes';
import { SeccionNotificaciones } from './SeccionNotificaciones';
import { SeccionPerfil } from './SeccionPerfil';
import { SeccionPermisos } from './SeccionPermisos';
import { SeccionPreferencias } from './SeccionPreferencias';
import { SeccionSeguridad } from './SeccionSeguridad';
import { seccionPorId, type SeccionId } from './secciones';

export function ContenidoDeSeccion({ id }: { id: SeccionId }) {
  switch (id) {
    case 'perfil':
      return <SeccionPerfil />;
    case 'branding':
      return <SeccionBranding />;
    case 'facturacion':
      return <SeccionFacturacion />;
    case 'equipo':
      return <SeccionEquipo />;
    case 'permisos':
      return <SeccionPermisos />;
    case 'medios-de-pago':
      return <SeccionMediosDePago />;
    case 'medios-de-recibo':
      return <SeccionMediosDeRecibo />;
    case 'costos-de-la-plata':
      return <SeccionCostosDeLaPlata />;
    case 'sedes':
      return <SeccionSedes />;
    case 'mandato':
      return <SeccionMandato />;
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
    case 'avisos':
      return <SeccionAvisos />;
    case 'sla-de-pqrs':
      return <SeccionSlaDePqrs />;
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
  if (gate.tipo === 'todos') return <>{children}</>;
  if (gate.tipo === 'admin') return <PageGuard adminOnly>{children}</PageGuard>;
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
