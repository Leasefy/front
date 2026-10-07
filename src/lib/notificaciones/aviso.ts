/**
 * Ícono y categoría de un aviso de la campana (QA de notificaciones 04-10, NO-03/NO-04).
 *
 * Antes el círculo de cada aviso era la primera letra del título («N», «T»,
 * «F») y las categorías salían mezcladas en inglés y español («general»,
 * «Aplicaciones»). El ícono sale del TIPO (el código de la plantilla) y la
 * categoría la manda el back (`categoriaDelAviso`, misma regla en los dos).
 */
import {
  Bell,
  Bank,
  CalendarBlank,
  ChatCircle,
  Check,
  Clock,
  CurrencyCircleDollar,
  FileArrowUp,
  FileText,
  HouseLine,
  PenNib,
  Receipt,
  UserPlus,
  Warning,
  WarningCircle,
  type Icon,
} from '@phosphor-icons/react';

const POR_TIPO: Readonly<Record<string, Icon>> = {
  APPLICATION_RECEIVED: UserPlus,
  APPLICATION_APPROVED: Check,
  APPLICATION_REJECTED: Warning,
  APPLICATION_INFO_REQUESTED: FileText,
  APPLICATION_INFO_PROVIDED: FileText,
  PAYMENT_RECEIPT_UPLOADED: Receipt,
  PAYMENT_APPROVED: Check,
  PAYMENT_REJECTED: Warning,
  PAYMENT_DISPUTE_OPENED: Warning,
  PAYMENT_REMINDER: Clock,
  PAYMENT_OVERDUE: Warning,
  PAYMENT_RECEIVED: CurrencyCircleDollar,
  RECIBO_DE_CAJA_AL_INQUILINO: Receipt,
  COBRO_GENERATED: CurrencyCircleDollar,
  COBRO_VENCIDO: WarningCircle,
  DISPERSION_GIRADA: Bank,
  DISPERSION_DEVUELTA: Warning,
  VISIT_REQUESTED: CalendarBlank,
  VISIT_ACCEPTED: Check,
  VISIT_REJECTED: CalendarBlank,
  VISIT_CANCELLED: CalendarBlank,
  VISIT_RESCHEDULED: CalendarBlank,
  VISIT_REMINDER_24H: Bell,
  CONTRACT_READY_TO_SIGN: PenNib,
  CONTRACT_LANDLORD_SIGNED: PenNib,
  CONTRACT_TENANT_SIGNED: PenNib,
  CONTRACT_COMPLETED: Check,
  CONTRACT_MIGRATION_COMPLETED: FileArrowUp,
  PROPERTY_IMPORT_COMPLETED: HouseLine,
  LEASE_EXPIRING_SOON: Clock,
  LEASE_EXPIRED: Warning,
  NEW_CHAT_MESSAGE: ChatCircle,
};

const POR_CATEGORIA: Readonly<Record<string, Icon>> = {
  payment: CurrencyCircleDollar,
  application: UserPlus,
  visit: CalendarBlank,
  contract: PenNib,
  lease: Clock,
  property: HouseLine,
  document: FileText,
  message: ChatCircle,
};

/** El aviso genérico se reconoce por lo que dice su metadata. */
function porMetadata(metadata: unknown): Icon | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const m = metadata as Record<string, unknown>;
  if (m.aviso === 'plazo-sin-fijar') return WarningCircle;
  if (m.aviso === 'plazo-fijado-revisado') return Check;
  if (typeof m.pqrsId === 'string') return ChatCircle;
  return null;
}

export function iconoDelAviso(tipo: string, categoria?: string, metadata?: unknown): Icon {
  return POR_TIPO[tipo] ?? porMetadata(metadata) ?? (categoria ? POR_CATEGORIA[categoria] : undefined) ?? Bell;
}

/** Las categorías en español (el back manda la clave). */
export const ETIQUETA_DE_CATEGORIA: Readonly<Record<string, string>> = {
  payment: 'Pagos',
  application: 'Postulaciones',
  visit: 'Visitas',
  contract: 'Contratos',
  lease: 'Arriendos',
  property: 'Inmuebles',
  document: 'Documentos',
  message: 'Mensajes',
  system: 'Avisos',
  general: 'Avisos',
  alert: 'Alertas',
};

export function etiquetaDeCategoria(categoria: string): string {
  return ETIQUETA_DE_CATEGORIA[categoria] ?? 'Avisos';
}

/** Los filtros de la página de notificaciones de la inmobiliaria, en orden. */
export const FILTROS_DE_CATEGORIA: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'payment', label: 'Pagos' },
  { id: 'application', label: 'Postulaciones' },
  { id: 'contract', label: 'Contratos' },
  { id: 'visit', label: 'Visitas' },
  { id: 'message', label: 'Mensajes' },
  { id: 'property', label: 'Inmuebles' },
  { id: 'system', label: 'Avisos' },
];
