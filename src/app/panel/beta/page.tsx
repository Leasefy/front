'use client';

import { ChatContainer } from '@/components/beta/ChatContainer';

/**
 * Beta entry page for propietarios.
 * Shows ChatContainer: welcome state when empty, full chat when messages exist.
 */
export default function BetaPage() {
  return <ChatContainer />;
}
