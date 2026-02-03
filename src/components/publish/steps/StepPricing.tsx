'use client';

import { useState } from 'react';
import { DollarSign, Receipt, Shield } from 'lucide-react';
import { usePublish } from '@/lib/context/PublishContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { formatCurrency } from '@/lib/format';

export function StepPricing() {
  const { draft, updateDraft } = usePublish();
  const [hasAdminFee, setHasAdminFee] = useState(draft.adminFee > 0);
  const [hasDeposit, setHasDeposit] = useState(draft.deposit > 0);

  const formatInputValue = (value: number) => {
    if (value === 0) return '';
    return value.toLocaleString('es-CO');
  };

  const parseInputValue = (value: string) => {
    return parseInt(value.replace(/\D/g, '')) || 0;
  };

  const totalMonthly = draft.monthlyRent + draft.adminFee;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-foreground mb-1">
          Define el precio de tu inmueble
        </h3>
        <p className="text-sm text-muted-foreground">
          Establece el canon de arrendamiento y costos adicionales
        </p>
      </div>

      <div className="space-y-5">
        {/* Monthly Rent */}
        <div className="space-y-2">
          <Label htmlFor="monthlyRent" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            Canon de arrendamiento mensual *
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="monthlyRent"
              type="text"
              placeholder="2,500,000"
              value={formatInputValue(draft.monthlyRent)}
              onChange={(e) => updateDraft({ monthlyRent: parseInputValue(e.target.value) })}
              className="pl-8"
            />
          </div>
        </div>

        {/* Admin Fee */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="adminFeeToggle" className="flex items-center gap-2 cursor-pointer">
              <Receipt className="w-4 h-4 text-muted-foreground" />
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
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="adminFee"
                type="text"
                placeholder="350,000"
                value={formatInputValue(draft.adminFee)}
                onChange={(e) => updateDraft({ adminFee: parseInputValue(e.target.value) })}
                className="pl-8"
              />
            </div>
          )}
        </div>

        {/* Deposit */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="depositToggle" className="flex items-center gap-2 cursor-pointer">
              <Shield className="w-4 h-4 text-muted-foreground" />
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
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="deposit"
                  type="text"
                  placeholder="2,500,000"
                  value={formatInputValue(draft.deposit)}
                  onChange={(e) => updateDraft({ deposit: parseInputValue(e.target.value) })}
                  className="pl-8"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Generalmente equivale a 1–2 meses de arriendo
              </p>
            </>
          )}
        </div>
      </div>

      {/* Summary */}
      {draft.monthlyRent > 0 && (
        <div className="p-5 bg-black/[0.02] rounded-sm space-y-3">
          <h4 className="text-sm font-medium text-foreground">Resumen de costos</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Canon mensual</span>
              <span className="text-foreground">{formatCurrency(draft.monthlyRent)}</span>
            </div>
            {draft.adminFee > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Administracion</span>
                <span className="text-foreground">{formatCurrency(draft.adminFee)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="font-medium text-foreground">Total mensual</span>
              <span className="font-medium text-foreground">{formatCurrency(totalMonthly)}</span>
            </div>
          </div>
          {draft.deposit > 0 && (
            <div className="text-xs text-muted-foreground pt-2">
              + Deposito inicial de {formatCurrency(draft.deposit)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
