'use client';

import { DecisionProvider } from '@/lib/context/DecisionContext';

interface PanelLayoutProps {
  children: React.ReactNode;
}

/**
 * Panel Layout - Wraps the landlord dashboard with DecisionProvider
 *
 * This provides decision state management (localStorage persistence)
 * to all pages within /panel/*
 */
export default function PanelLayout({ children }: PanelLayoutProps) {
  return <DecisionProvider>{children}</DecisionProvider>;
}
