/**
 * Static payment methods for the Colombian market.
 * Extracted from mock-leases.ts — these are configuration data, not mock data.
 */

import type { PaymentMethod, PaymentMethodOption } from '@/lib/types/lease';

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: 'pse',
    name: 'PSE',
    description: 'Transferencia bancaria directa',
    icon: '\u{1F3E6}',
    enabled: true,
    processingTime: 'Inmediato',
    fee: 0,
  },
  {
    id: 'credit_card',
    name: 'Tarjeta de credito',
    description: 'Visa, Mastercard, Amex',
    icon: '\u{1F4B3}',
    enabled: true,
    processingTime: 'Inmediato',
    fee: 2.5,
  },
  {
    id: 'debit_card',
    name: 'Tarjeta debito',
    description: 'Debito automatico mensual',
    icon: '\u{1F4B3}',
    enabled: true,
    processingTime: 'Inmediato',
    fee: 0,
  },
  {
    id: 'nequi',
    name: 'Nequi',
    description: 'Pago desde tu app Nequi',
    icon: '\u{1F4F1}',
    enabled: true,
    processingTime: 'Inmediato',
    fee: 0,
  },
  {
    id: 'daviplata',
    name: 'Daviplata',
    description: 'Pago desde tu Daviplata',
    icon: '\u{1F4F1}',
    enabled: true,
    processingTime: 'Inmediato',
    fee: 0,
  },
  {
    id: 'cash',
    name: 'Efectivo',
    description: 'Pago en punto fisico',
    icon: '\u{1F4B5}',
    enabled: false,
    processingTime: '24-48 horas',
    fee: 0,
  },
];

export function getPaymentMethodById(id: string): PaymentMethodOption | undefined {
  return PAYMENT_METHODS.find((m) => m.id === id);
}

export function getEnabledPaymentMethods(): PaymentMethodOption[] {
  return PAYMENT_METHODS.filter((m) => m.enabled);
}
