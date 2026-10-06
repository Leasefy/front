'use client';

/** Una solicitud del propietario (SO-27, PQRS-FIX 04-10-2026). */
import { useParams } from 'next/navigation';
import { SolicitudDelPropietario } from '@/components/landlord/portal/SolicitudDelPropietario';

export default function SolicitudDetallePage() {
  const params = useParams<{ requestId: string }>();
  return <SolicitudDelPropietario id={params?.requestId ?? ''} />;
}
