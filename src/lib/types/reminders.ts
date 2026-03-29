/**
 * Reminder types for the automatic reminder system.
 * Covers pre-payment, overdue, escalation, and contract expiry reminders.
 */

export type ReminderType = 'pre-payment' | 'overdue' | 'escalation' | 'contract-expiry';
export type ReminderStatus = 'scheduled' | 'sent' | 'failed' | 'cancelled';
export type ReminderChannel = 'email' | 'whatsapp' | 'push' | 'sms';

export interface ReminderTypeConfig {
  type: ReminderType;
  enabled: boolean;
  days: number; // days before (pre-payment, contract) or after (overdue, escalation)
  channels: ReminderChannel[];
}

export interface ReminderConfig {
  types: ReminderTypeConfig[];
  globalEnabled: boolean;
}

export interface ReminderLogEntry {
  id: string;
  type: ReminderType;
  recipientName: string;
  recipientType: 'tenant' | 'landlord';
  propertyTitle: string;
  scheduledAt: Date;
  sentAt?: Date;
  status: ReminderStatus;
  channel: ReminderChannel;
  message: string;
  amount?: number; // for payment reminders (COP)
  daysReference?: number; // days before/after due
}
