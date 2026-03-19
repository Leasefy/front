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
        'p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Bank className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h4 className="font-semibold text-neutral-900 dark:text-white">
              {t('inmobiliaria.propietario.bankInfo.bankAccount')}
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {t('inmobiliaria.propietario.bankInfo.forDispersions')}
            </p>
          </div>
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <PencilSimple className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Bank Info */}
      <div className="space-y-3">
        {/* Bank */}
        <div className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800">
          <span className="text-sm text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.propietario.bankInfo.bank')}</span>
          <span className="font-medium text-neutral-900 dark:text-white">
            {bank?.name || bankAccount.bank}
          </span>
        </div>

        {/* Account Type */}
        <div className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800">
          <span className="text-sm text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.propietario.bankInfo.type')}</span>
          <span className="font-medium text-neutral-900 dark:text-white">
            {accountTypeLabel}
          </span>
        </div>

        {/* Account Number */}
        <div className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800">
          <span className="text-sm text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.propietario.bankInfo.number')}</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-medium text-neutral-900 dark:text-white">
              {showAccount ? bankAccount.accountNumber : maskAccount(bankAccount.accountNumber)}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowAccount(!showAccount)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                title={showAccount ? t('inmobiliaria.propietario.bankInfo.hide') : t('inmobiliaria.propietario.bankInfo.show')}
              >
                {showAccount ? (
                  <EyeSlash className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
              {showAccount && (
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  title={t('inmobiliaria.propietario.bankInfo.copy')}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Account Holder */}
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.propietario.bankInfo.holder')}</span>
          <span className="font-medium text-neutral-900 dark:text-white">
            {bankAccount.accountHolder}
          </span>
        </div>
      </div>

      {/* Verification Badge */}
      <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
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
      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
        <Bank className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
          {bank?.name || bankAccount.bank} {maskAccount(bankAccount.accountNumber)}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {accountTypeLabel} • {bankAccount.accountHolder}
        </p>
      </div>
    </div>
  );
}

export default PropietarioBankInfo;
