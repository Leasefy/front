'use client';

import { MessagesWidget } from '@/components/messages/MessagesWidget';
import { AgencyRoleGuard } from '@/components/auth/AgencyRoleGuard';

export default function MensajesPage() {
  return (
    <AgencyRoleGuard allowed="managers">
      <MessagesWidget actor="landlord" pantallaCompleta />
    </AgencyRoleGuard>
  );
}
