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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/50">
          {/* Sidebar */}
          <DashboardSidebar />

          {/* Main content area - updated for new sidebar width */}
          <main className="lg:pl-64">
            {children}
          </main>

          {/* Toast notifications - premium styling */}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              },
            }}
          />
        </div>
      </DecisionProvider>
    </ProtectedRoute>
  );
}
