'use client';

import { MessagesWidget } from '@/components/messages/MessagesWidget';

/**
 * Mensajes del propietario: pantalla completa, la misma de la inmobiliaria y
 * del inquilino (Nico, 11-10-2026: «mensajes debe tener la misma tipo de ui que
 * la de inquilinos y de inmobiliaria»). El sidebar ya dice «Mensajes».
 */
export default function MensajesPage() {
  return <MessagesWidget actor="landlord" pantallaCompleta />;
}
