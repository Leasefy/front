'use client';

import { useOnboardingStatus } from '@/lib/hooks/use-onboarding-status';
import { CompleteProfileFirst } from '@/components/tenant/CompleteProfileFirst';
import { MessagesWidget } from '@/components/messages/MessagesWidget';
import { Spinner } from '@/components/ui/spinner';

export default function MensajesPage() {
  const { isComplete: isOnboardingComplete, isLoading: isOnboardingLoading } = useOnboardingStatus();

  if (isOnboardingLoading) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isOnboardingComplete) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <CompleteProfileFirst context="messages" />
        </div>
      </div>
    );
  }

  // Pantalla completa, igual que en la inmobiliaria (Nico, 2026-09-15).
  return <MessagesWidget actor="tenant" pantallaCompleta />;
}
