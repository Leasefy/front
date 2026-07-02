'use client';

// TEMP verification route — renders the REAL <BetaWelcome> (the exact component
// ChatContainer shows in its empty state) with no auth / no agent service, so the
// live cadence §33 state-0 design can be screenshot-verified. Safe to delete.

import { BetaWelcome } from '@/components/beta/BetaWelcome';
import { I18nProvider } from '@/lib/i18n';

// BetaWelcome reads localStorage-backed locale on mount → render dynamically.
export const dynamic = 'force-dynamic';

export default function BetaWelcomePreviewPage() {
  return (
    <I18nProvider>
      <div className="flex h-screen flex-col bg-bg">
        {/* Mirror ChatContainer's empty-state wrapper */}
        <div className="relative flex-1 overflow-y-auto">
          <BetaWelcome onPromptClick={(p) => console.log('prompt:', p)} />
        </div>
      </div>
    </I18nProvider>
  );
}
