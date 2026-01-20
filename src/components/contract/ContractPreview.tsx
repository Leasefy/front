'use client';

import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/format';
import { FileText, Building2, User, Calendar, CreditCard, Shield } from 'lucide-react';
import type { Contract, ContractTemplate } from '@/lib/types/contract';
import type { SelectedInsurance } from '@/lib/types/insurance';
import { getInsuranceById } from '@/lib/data/mock-insurance';

// ============================================================================
// Types
// ============================================================================

export interface ContractPreviewProps {
  /** Contract instance with terms and parties */
  contract: Contract;
  /** Contract template with clauses */
  template: ContractTemplate;
  /** Selected insurance policy (optional) */
  selectedInsurance?: SelectedInsurance;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * ContractPreview - Document preview showing contract details
 *
 * Layout:
 * - Header with contract title and type
 * - Summary grid with key terms
 * - Parties section (landlord and tenant)
 * - Clauses section with all terms
 * - Signature section showing signing status
 */
export function ContractPreview({ contract, template, selectedInsurance, className }: ContractPreviewProps) {
  // Get insurance policy details if selected
  const insurancePolicy =
    selectedInsurance?.policyId && selectedInsurance.tier !== 'none'
      ? getInsuranceById(selectedInsurance.policyId)
      : null;

  return (
    <div
      className={cn(
        'rounded-sm border border-slate-200 bg-white shadow-sm',
        className
      )}
    >
      {/* Header */}
      <div className="border-b border-slate-100 p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">
          CONTRATO DE ARRENDAMIENTO
        </h2>
        <p className="mt-1 text-sm text-slate-500">{template.name}</p>
        <p className="mt-2 text-xs text-slate-400">ID: {contract.id}</p>
      </div>

      {/* Contract Summary */}
      <div className="border-b border-slate-100 p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <CreditCard className="h-4 w-4 text-slate-400" />
          Resumen del Contrato
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-sm border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Canon mensual</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {formatCurrency(contract.monthlyRent)}
            </p>
          </div>
          <div className="rounded-sm border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Deposito</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {formatCurrency(contract.depositAmount)}
            </p>
          </div>
          <div className="rounded-sm border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Administracion</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {contract.adminFee > 0 ? formatCurrency(contract.adminFee) : 'Incluida'}
            </p>
          </div>
          <div className="rounded-sm border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Dia de pago</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              Dia {contract.paymentDueDay}
            </p>
          </div>
        </div>
      </div>

      {/* Insurance (if selected) */}
      {insurancePolicy && (
        <div className="border-b border-slate-100 p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Shield className="h-4 w-4 text-slate-400" />
            Poliza de Seguro
          </h3>
          <div className="rounded-sm border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">{insurancePolicy.name}</p>
                <p className="text-sm text-slate-600">{insurancePolicy.description}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-slate-900">
                  {formatCurrency(insurancePolicy.monthlyPremium)}
                </p>
                <p className="text-xs text-slate-500">/mes</p>
              </div>
            </div>
            {insurancePolicy.features.length > 0 && (
              <ul className="mt-3 pt-3 border-t border-emerald-200 grid gap-1 text-sm text-slate-600">
                {insurancePolicy.features.slice(0, 4).map((feature, i) => (
                  <li key={i}>• {feature}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Property & Dates */}
      <div className="border-b border-slate-100 p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Building2 className="h-4 w-4 text-slate-400" />
          Inmueble y Vigencia
        </h3>
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-slate-500">Direccion</p>
            <p className="font-medium text-slate-900">{contract.propertyAddress}</p>
            <p className="text-slate-600">{contract.propertyCity}</p>
          </div>
          <div className="flex gap-6">
            <div>
              <p className="text-slate-500">Inicio</p>
              <p className="font-medium text-slate-900">{formatDate(contract.startDate)}</p>
            </div>
            <div>
              <p className="text-slate-500">Fin</p>
              <p className="font-medium text-slate-900">{formatDate(contract.endDate)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Parties */}
      <div className="border-b border-slate-100 p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <User className="h-4 w-4 text-slate-400" />
          Partes del Contrato
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Landlord */}
          <div className="rounded-sm border border-slate-100 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Arrendador
            </p>
            <p className="mt-2 font-medium text-slate-900">{contract.landlordName}</p>
            <p className="text-sm text-slate-600">CC: {contract.landlordDocument}</p>
            <p className="text-sm text-slate-500">{contract.landlordEmail}</p>
          </div>
          {/* Tenant */}
          <div className="rounded-sm border border-slate-100 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Arrendatario
            </p>
            <p className="mt-2 font-medium text-slate-900">{contract.tenantName}</p>
            <p className="text-sm text-slate-600">CC: {contract.tenantDocument}</p>
            <p className="text-sm text-slate-500">{contract.tenantEmail}</p>
          </div>
        </div>
      </div>

      {/* Clauses */}
      <div className="border-b border-slate-100 p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Calendar className="h-4 w-4 text-slate-400" />
          Clausulas del Contrato
        </h3>
        <div className="space-y-4">
          {template.clauses.map((clause) => (
            <div key={clause.id} className="text-sm">
              <h4 className="font-medium text-slate-900">{clause.title}</h4>
              <p className="mt-1 text-slate-600 leading-relaxed">{clause.content}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Special Conditions */}
      {contract.specialConditions && (
        <div className="border-b border-slate-100 p-6">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">
            Condiciones Especiales
          </h3>
          <p className="text-sm text-slate-600">{contract.specialConditions}</p>
        </div>
      )}

      {/* Signatures */}
      <div className="p-6">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Firmas</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Landlord Signature */}
          <div
            className={cn(
              'rounded-sm border p-4',
              contract.landlordSignature
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-dashed border-slate-300 bg-slate-50'
            )}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Firma Arrendador
            </p>
            {contract.landlordSignature ? (
              <>
                <p className="mt-2 font-medium text-emerald-700">
                  {contract.landlordSignature.signedBy}
                </p>
                <p className="text-xs text-emerald-600">
                  Firmado: {formatDate(contract.landlordSignature.signedAt)}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-400">Pendiente</p>
            )}
          </div>

          {/* Tenant Signature */}
          <div
            className={cn(
              'rounded-sm border p-4',
              contract.tenantSignature
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-dashed border-slate-300 bg-slate-50'
            )}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Firma Arrendatario
            </p>
            {contract.tenantSignature ? (
              <>
                <p className="mt-2 font-medium text-emerald-700">
                  {contract.tenantSignature.signedBy}
                </p>
                <p className="text-xs text-emerald-600">
                  Firmado: {formatDate(contract.tenantSignature.signedAt)}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-400">Pendiente</p>
            )}
          </div>
        </div>
      </div>

      {/* Legal Footer */}
      <div className="border-t border-slate-100 bg-slate-50 p-4 text-center">
        <p className="text-xs text-slate-400">
          Este contrato se rige por la Ley 820 de 2003 y demas normas concordantes.
          <br />
          Las firmas electronicas tienen validez legal segun la Ley 527 de 1999.
        </p>
      </div>
    </div>
  );
}
