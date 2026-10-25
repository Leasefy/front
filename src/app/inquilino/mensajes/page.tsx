'use client';

import { useOnboardingStatus } from '@/lib/hooks/use-onboarding-status';
import { CompleteProfileFirst } from '@/components/tenant/CompleteProfileFirst';
import { MessagesWidget } from '@/components/messages/MessagesWidget';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';

export default function MensajesPage() {
  const { isComplete: isOnboardingComplete, isLoading: isOnboardingLoading } = useOnboardingStatus();

  if (isOnboardingLoading) {
    return (
      <div className="min-h-screen bg-bg">
        {/* Dentro del panel va el esqueleto, no el logo (Nico, 01-10: «el logo sólo en cargas de pantalla completa»). */}
        <EsqueletoDePagina variante="list" className="mx-auto max-w-7xl" />
      </div>
    );
  }

  if (!isOnboardingComplete) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="p-6 lg:p-8">
          <CompleteProfileFirst context="messages" />
        </div>
      </div>
    );
  }

  // Pantalla completa, igual que en la inmobiliaria (Nico, 2026-09-15).
  return <MessagesWidget actor="tenant" pantallaCompleta />;
}
