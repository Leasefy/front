'use client';

/**
 * Solicitudes del propietario (SO-27, PQRS-FIX 04-10-2026): las mismas PQRS que
 * radica el inquilino (`/pqrs/mine`), con SUS inmuebles. Antes leía una ruta
 * vieja del micro y decía «Próximamente».
 */
import { SolicitudesDelPropietario } from '@/components/landlord/portal/SolicitudesDelPropietario';

export default function SolicitudesPage() {
  return <SolicitudesDelPropietario />;
}
