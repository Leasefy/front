'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bank,
  PencilSimple,
  Eye,
  EyeSlash,
  Copy,
  Check,
  ShieldCheck,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { IconButton } from '@leasefy/cadence';
import { useI18n } from '@/lib/i18n';
import type { PropietarioBankAccount } from '@/lib/types/inmobiliaria';
import { COLOMBIAN_BANKS } from '@/lib/types/payment-accounts';

interface PropietarioBankInfoProps {
  bankAccount: PropietarioBankAccount;
  onEdit?: () => void;
  showFullDetails?: boolean;
  className?: string;
}

/**
 * PropietarioBankInfo - Display and manage bank account information
 * Shows masked account number by default with toggle to reveal
 */
export function PropietarioBankInfo({
  bankAccount,
  onEdit,
  showFullDetails = false,
  className,
}: PropietarioBankInfoProps) {
  const { t } = useI18n();
  const [showAccount, setShowAccount] = useState(showFullDetails);
  const [copied, setCopied] = useState(false);

  const bank = COLOMBIAN_BANKS.find((b) => b.code === bankAccount.bank);
  const accountTypeLabel = bankAccount.accountType === 'savings' ? t('inmobiliaria.propietario.bankInfo.savings') : t('inmobiliaria.propietario.bankInfo.checking');

  const maskAccount = (account: string) => {
    // If already masked (starts with ****)
    if (account.startsWith('****')) {
      return account;
    }
    // Mask all but last 4 digits
    const lastFour = account.slice(-4);
    return `****${lastFour}`;
  };

  const handleCopy = async () => {
    if (!showAccount) return;

    try {
      await navigator.clipboard.writeText(bankAccount.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div
      className={cn(
        'p-4 rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#14130F]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-success-soft flex items-center justify-center">
            <Bank className="w-5 h-5 text-success" />
          </div>
          <div>
            <h4 className="font-semibold text-fg dark:text-white">
              {t('inmobiliaria.propietario.bankInfo.bankAccount')}
            </h4>
            <p className="text-xs text-fg-muted dark:text-fg-subtle">
              {t('inmobiliaria.propietario.bankInfo.forDispersions')}
            </p>
          </div>
        </div>
        {onEdit && (
          <IconButton
            variant="ghost"
            size="md"
            onClick={onEdit}
            aria-label="Editar datos bancarios"
            icon={<PencilSimple className="w-4 h-4" />}
          />
        )}
      </div>

      {/* Bank Info */}
      <div className="space-y-3">
        {/* Bank */}
        <div className="flex items-center justify-between py-2 border-b border-border-faint dark:border-border-strong">
          <span className="text-sm text-fg-muted dark:text-fg-subtle">{t('inmobiliaria.propietario.bankInfo.bank')}</span>
          <span className="font-medium text-fg dark:text-white">
            {bank?.name || bankAccount.bank}
          </span>
        </div>

        {/* Account Type */}
        <div className="flex items-center justify-between py-2 border-b border-border-faint dark:border-border-strong">
          <span className="text-sm text-fg-muted dark:text-fg-subtle">{t('inmobiliaria.propietario.bankInfo.type')}</span>
          <span className="font-medium text-fg dark:text-white">
            {accountTypeLabel}
          </span>
        </div>

        {/* Account Number */}
        <div className="flex items-center justify-between py-2 border-b border-border-faint dark:border-border-strong">
          <span className="text-sm text-fg-muted dark:text-fg-subtle">{t('inmobiliaria.propietario.bankInfo.number')}</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-medium text-fg dark:text-white">
              {showAccount ? bankAccount.accountNumber : maskAccount(bankAccount.accountNumber)}
            </span>
            <div className="flex items-center gap-1">
              <IconButton
                variant="ghost"
                size="sm"
                onClick={() => setShowAccount(!showAccount)}
                title={showAccount ? t('inmobiliaria.propietario.bankInfo.hide') : t('inmobiliaria.propietario.bankInfo.show')}
                aria-label={showAccount ? t('inmobiliaria.propietario.bankInfo.hide') : t('inmobiliaria.propietario.bankInfo.show')}
                icon={showAccount ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              />
              {showAccount && (
                <IconButton
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  title={t('inmobiliaria.propietario.bankInfo.copy')}
                  aria-label={t('inmobiliaria.propietario.bankInfo.copy')}
                  icon={copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                />
              )}
            </div>
          </div>
        </div>

        {/* Account Holder */}
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-fg-muted dark:text-fg-subtle">{t('inmobiliaria.propietario.bankInfo.holder')}</span>
          <span className="font-medium text-fg dark:text-white">
            {bankAccount.accountHolder}
          </span>
        </div>
      </div>

      {/* Verification Badge */}
      <div className="mt-4 pt-3 border-t border-border-faint dark:border-border-strong">
        <div className="flex items-center gap-2 text-success">
          <ShieldCheck className="w-4 h-4" />
          <span className="text-xs font-medium">{t('inmobiliaria.propietario.bankInfo.verified')}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact version for lists and inline display
 */
export function PropietarioBankInfoCompact({
  bankAccount,
  className,
}: {
  bankAccount: PropietarioBankAccount;
  className?: string;
}) {
  const { t } = useI18n();
  const bank = COLOMBIAN_BANKS.find((b) => b.code === bankAccount.bank);
  const accountTypeLabel = bankAccount.accountType === 'savings' ? t('inmobiliaria.propietario.bankInfo.savings') : t('inmobiliaria.propietario.bankInfo.checking');

  const maskAccount = (account: string) => {
    if (account.startsWith('****')) return account;
    return `****${account.slice(-4)}`;
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="w-8 h-8 rounded-md bg-success-soft flex items-center justify-center shrink-0">
        <Bank className="w-4 h-4 text-success" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-fg dark:text-white truncate">
          {bank?.name || bankAccount.bank} {maskAccount(bankAccount.accountNumber)}
        </p>
        <p className="text-xs text-fg-muted dark:text-fg-subtle">
          {accountTypeLabel} • {bankAccount.accountHolder}
        </p>
      </div>
    </div>
  );
}

export default PropietarioBankInfo;
