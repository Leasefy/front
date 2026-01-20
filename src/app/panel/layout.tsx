'use client';

import { DecisionProvider } from '@/lib/context/DecisionContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

interface PanelLayoutProps {
  children: React.ReactNode;
}

/**
 * Panel Layout - Wraps the landlord dashboard with DecisionProvider
 *
 * This layout:
 * 1. Protects all /panel/* routes (landlord only)
 * 2. Provides decision state management (localStorage persistence)
 */
export default function PanelLayout({ children }: PanelLayoutProps) {
  return (
    <ProtectedRoute allowedRoles={['landlord']}>
      <DecisionProvider>{children}</DecisionProvider>
    </ProtectedRoute>
  );
}
