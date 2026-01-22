'use client';

import { Toaster } from 'sonner';
import { DecisionProvider } from '@/lib/context/DecisionContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardSidebar } from '@/components/landlord/DashboardSidebar';

interface PanelLayoutProps {
  children: React.ReactNode;
}

/**
 * Panel Layout - Wraps the landlord dashboard with DecisionProvider
 *
 * Layout structure:
 * +------------------+------------------------------+
 * | Sidebar (240px)  |   Main Content               |
 * |                  |   - Header                   |
 * | - Logo           |   - Page Content             |
 * | - Nav Items      |                              |
 * | - User Menu      |                              |
 * +------------------+------------------------------+
 *
 * Mobile: Sidebar becomes sheet drawer
 */
export default function PanelLayout({ children }: PanelLayoutProps) {
  return (
    <ProtectedRoute allowedRoles={['landlord']}>
      <DecisionProvider>
        <div className="min-h-screen bg-white">
          {/* Sidebar */}
          <DashboardSidebar />

          {/* Main content area */}
          <main className="lg:pl-60">
            {children}
          </main>

          {/* Toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                borderRadius: '2px',
              },
            }}
          />
        </div>
      </DecisionProvider>
    </ProtectedRoute>
  );
}
