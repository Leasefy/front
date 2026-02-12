'use client';

import { useState } from 'react';
import { CurrencyDollar, Receipt, Shield } from '@phosphor-icons/react';
import { usePublish } from '@/lib/context/PublishContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { formatCurrency } from '@/lib/format';

export function StepPricing() {
  const locale = 'es';
  const { draft, updateDraft } = usePublish();
  const [hasAdminFee, setHasAdminFee] = useState(draft.adminFee > 0);
  const [hasDeposit, setHasDeposit] = useState(draft.deposit > 0);

  const formatInputValue = (value: number) => {
    if (value === 0) return '';
    return value.toLocaleString(locale === 'es' ? 'es-CL' : 'en-US');
  };

  const parseInputValue = (value: string) => {
    return parseInt(value.replace(/\D/g, '')) || 0;
  };

  const totalMonthly = draft.monthlyRent + draft.adminFee;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-1">
          Define el precio de tu inmueble
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Establece el canon de arrendamiento y costos adicionales
        </p>
      </div>

      <div className="space-y-5">
        {/* Monthly Rent */}
        <div className="space-y-2">
          <Label htmlFor="monthlyRent" className="flex items-center gap-2 text-neutral-900 dark:text-white">
            <CurrencyDollar className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
            Canon de arrendamiento mensual *
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">$</span>
            <Input
              id="monthlyRent"
              type="text"
              placeholder="2,500,000"
              value={formatInputValue(draft.monthlyRent)}
              onChange={(e) => updateDraft({ monthlyRent: parseInputValue(e.target.value) })}
              className="pl-8 rounded-xl border-neutral-200 dark:border-neutral-700"
            />
          </div>
        </div>

        {/* Admin Fee */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="adminFeeToggle" className="flex items-center gap-2 cursor-pointer text-neutral-900 dark:text-white">
              <Receipt className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
              Cuota de administración
            </Label>
            <Switch
              id="adminFeeToggle"
              checked={hasAdminFee}
              onCheckedChange={(checked) => {
                setHasAdminFee(checked);
                if (!checked) updateDraft({ adminFee: 0 });
              }}
            />
          </div>
          {hasAdminFee && (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">$</span>
              <Input
                id="adminFee"
                type="text"
                placeholder="350,000"
                value={formatInputValue(draft.adminFee)}
                onChange={(e) => updateDraft({ adminFee: parseInputValue(e.target.value) })}
                className="pl-8 rounded-xl border-neutral-200 dark:border-neutral-700"
              />
            </div>
          )}
        </div>

        {/* Deposit */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="depositToggle" className="flex items-center gap-2 cursor-pointer text-neutral-900 dark:text-white">
              <Shield className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
              Depósito de garantía
            </Label>
            <Switch
              id="depositToggle"
              checked={hasDeposit}
              onCheckedChange={(checked) => {
                setHasDeposit(checked);
                if (!checked) updateDraft({ deposit: 0 });
              }}
            />
          </div>
          {hasDeposit && (
            <>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">$</span>
                <Input
                  id="deposit"
                  type="text"
                  placeholder="2,500,000"
                  value={formatInputValue(draft.deposit)}
                  onChange={(e) => updateDraft({ deposit: parseInputValue(e.target.value) })}
                  className="pl-8 rounded-xl border-neutral-200 dark:border-neutral-700"
                />
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Generalmente equivale a 1–2 meses de arriendo
              </p>
            </>
          )}
        </div>
      </div>

      {/* Summary */}
      {draft.monthlyRent > 0 && (
        <div className="p-5 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-3">
          <h4 className="text-sm font-medium text-neutral-900 dark:text-white">Resumen de costos</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-500 dark:text-neutral-400">Canon mensual</span>
              <span className="text-neutral-900 dark:text-white">{formatCurrency(draft.monthlyRent)}</span>
            </div>
            {draft.adminFee > 0 && (
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Administración</span>
                <span className="text-neutral-900 dark:text-white">{formatCurrency(draft.adminFee)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700">
              <span className="font-medium text-neutral-900 dark:text-white">Total mensual</span>
              <span className="font-medium text-neutral-900 dark:text-white">{formatCurrency(totalMonthly)}</span>
            </div>
          </div>
          {draft.deposit > 0 && (
            <div className="text-xs text-neutral-500 dark:text-neutral-400 pt-2">
              + Depósito inicial de {formatCurrency(draft.deposit)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
