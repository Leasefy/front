'use client';

import { useOnboardingStatus } from '@/lib/hooks/use-onboarding-status';
import { CompleteProfileFirst } from '@/components/tenant/CompleteProfileFirst';
import { MessagesWidget } from '@/components/messages/MessagesWidget';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';

export default function MensajesPage() {
  const { isComplete: isOnboardingComplete, isLoading: isOnboardingLoading } = useOnboardingStatus();

  if (isOnboardingLoading) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] dark:bg-bg">
        {/* Dentro del panel va el esqueleto, no el logo (Nico, 01-10: «el logo sólo en cargas de pantalla completa»). */}
        <EsqueletoDePagina variante="list" className="mx-auto max-w-7xl" />
      </div>
    );
  }

  if (!isOnboardingComplete) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] dark:bg-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <CompleteProfileFirst context="messages" />
        </div>
      </div>
    );
  }

  // Pantalla completa, igual que en la inmobiliaria (Nico, 2026-09-15).
  return <MessagesWidget actor="tenant" pantallaCompleta />;
}
