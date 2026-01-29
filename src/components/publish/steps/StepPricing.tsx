'use client';

import { DollarSign, Receipt, Shield } from 'lucide-react';
import { usePublish } from '@/lib/context/PublishContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/format';

export function StepPricing() {
  const { draft, updateDraft } = usePublish();

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
        <h3 className="text-sm font-medium text-black mb-1">
          Define el precio de tu inmueble
        </h3>
        <p className="text-sm text-black/50">
          Establece el canon de arrendamiento y costos adicionales
        </p>
      </div>

      <div className="space-y-5">
        {/* Monthly Rent */}
        <div className="space-y-2">
          <Label htmlFor="monthlyRent" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-black/40" />
            Canon de arrendamiento mensual *
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40">$</span>
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
        <div className="space-y-2">
          <Label htmlFor="adminFee" className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-black/40" />
            Cuota de administracion
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40">$</span>
            <Input
              id="adminFee"
              type="text"
              placeholder="350,000"
              value={formatInputValue(draft.adminFee)}
              onChange={(e) => updateDraft({ adminFee: parseInputValue(e.target.value) })}
              className="pl-8"
            />
          </div>
          <p className="text-xs text-black/40">
            Deja en blanco si no aplica
          </p>
        </div>

        {/* Deposit */}
        <div className="space-y-2">
          <Label htmlFor="deposit" className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-black/40" />
            Deposito de garantia
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40">$</span>
            <Input
              id="deposit"
              type="text"
              placeholder="2,500,000"
              value={formatInputValue(draft.deposit)}
              onChange={(e) => updateDraft({ deposit: parseInputValue(e.target.value) })}
              className="pl-8"
            />
          </div>
          <p className="text-xs text-black/40">
            Generalmente equivale a 1-2 meses de arriendo
          </p>
        </div>
      </div>

      {/* Summary */}
      {draft.monthlyRent > 0 && (
        <div className="p-5 bg-black/[0.02] rounded-[2px] space-y-3">
          <h4 className="text-sm font-medium text-black">Resumen de costos</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-black/60">Canon mensual</span>
              <span className="text-black">{formatCurrency(draft.monthlyRent)}</span>
            </div>
            {draft.adminFee > 0 && (
              <div className="flex justify-between">
                <span className="text-black/60">Administracion</span>
                <span className="text-black">{formatCurrency(draft.adminFee)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-black/10">
              <span className="font-medium text-black">Total mensual</span>
              <span className="font-medium text-black">{formatCurrency(totalMonthly)}</span>
            </div>
          </div>
          {draft.deposit > 0 && (
            <div className="text-xs text-black/50 pt-2">
              + Deposito inicial de {formatCurrency(draft.deposit)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
