'use client';

import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/format';
import { useState } from 'react';
import { FileText, Buildings, User, Calendar, CreditCard, Shield, Lock, CaretDown, Download, SealCheck } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import type { Contract, ContractTemplate } from '@/lib/types/contract';
import type { SelectedInsurance } from '@/lib/types/insurance';
import { getInsuranceById } from '@/lib/constants/insurance-policies';
import { maskEmail, maskPhone, maskDocument } from '@/lib/utils/mask-data';
import { AuthenticityCertificate } from './AuthenticityCertificate';

// ============================================================================
// TextTs
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
  const [showAllClauses, setShowAllClauses] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const INITIAL_CLAUSES = 2;
  const hasMoreClauses = template.clauses.length > INITIAL_CLAUSES;
  const visibleClauses = showAllClauses ? template.clauses : template.clauses.slice(0, INITIAL_CLAUSES);
  // Get insurance policy details if selected
  const insurancePolicy =
    selectedInsurance?.policyId && selectedInsurance.tier !== 'none'
      ? getInsuranceById(selectedInsurance.policyId)
      : null;

  // Only reveal tenant sensitive data when contract is fully signed (active)
  const isContractSigned = contract.status === 'active';
  const tenantEmail = isContractSigned ? contract.tenantEmail : maskEmail(contract.tenantEmail);
  const tenantPhone = isContractSigned && contract.tenantPhone ? contract.tenantPhone : maskPhone(contract.tenantPhone || '');
  const tenantDocument = isContractSigned ? contract.tenantDocument : maskDocument(contract.tenantDocument);

  return (
    <div
      className={cn(
        'rounded-sm border border-border bg-card shadow-sm',
        className
      )}
    >
      {/* Accent bar */}
      <div className="h-[3px] bg-primary rounded-t-sm" />

      {/* Header */}
      <div className="border-b border-border px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Contrato de Arrendamiento
            </p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">
              {template.name}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">ID: {contract.id}</p>
          </div>
          {/* Certificate button - only show for active contracts */}
          {isContractSigned && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCertificate(true)}
              className="shrink-0"
            >
              <SealCheck className="mr-2 h-4 w-4 text-emerald-500" />
              Ver Certificado
            </Button>
          )}
        </div>
      </div>

      {/* Contract Summary */}
      <div className="border-b border-border p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          Resumen del Contrato
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-sm border border-border bg-muted p-3">
            <p className="text-xs text-muted-foreground">Canon mensual</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {formatCurrency(contract.monthlyRent)}
            </p>
          </div>
          <div className="rounded-sm border border-border bg-muted p-3">
            <p className="text-xs text-muted-foreground">Garantia</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {contract.guaranteeType === 'poliza' ? 'Poliza de arrendamiento' : 'Codeudor'}
            </p>
            {contract.guaranteeDetails && (
              <p className="mt-0.5 text-xs text-muted-foreground truncate">{contract.guaranteeDetails}</p>
            )}
          </div>
          <div className="rounded-sm border border-border bg-muted p-3">
            <p className="text-xs text-muted-foreground">Administracion</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {contract.adminFee > 0 ? formatCurrency(contract.adminFee) : 'Incluida'}
            </p>
          </div>
          <div className="rounded-sm border border-border bg-muted p-3">
            <p className="text-xs text-muted-foreground">Dia de pago</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              Dia {contract.paymentDueDay}
            </p>
          </div>
        </div>
      </div>

      {/* Insurance (if selected) */}
      {insurancePolicy && (
        <div className="border-b border-border p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Poliza de Seguro
          </h3>
          <div className="rounded-sm border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{insurancePolicy.name}</p>
                <p className="text-sm text-muted-foreground">{insurancePolicy.description}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-foreground">
                  {formatCurrency(insurancePolicy.monthlyPremium)}
                </p>
                <p className="text-xs text-muted-foreground">/mes</p>
              </div>
            </div>
            {insurancePolicy.features.length > 0 && (
              <ul className="mt-3 pt-3 border-t border-emerald-200 grid gap-1 text-sm text-muted-foreground">
                {insurancePolicy.features.slice(0, 4).map((feature, i) => (
                  <li key={i}>• {feature}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Property & Dates */}
      <div className="border-b border-border p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Buildings className="h-4 w-4 text-muted-foreground" />
          Inmueble y Vigencia
        </h3>
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-muted-foreground">Direccion</p>
            <p className="font-medium text-foreground">{contract.propertyAddress}</p>
            <p className="text-muted-foreground">{contract.propertyCity}</p>
          </div>
          <div className="flex gap-6">
            <div>
              <p className="text-muted-foreground">Inicio</p>
              <p className="font-medium text-foreground">{formatDate(contract.startDate)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Fin</p>
              <p className="font-medium text-foreground">{formatDate(contract.endDate)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Parties */}
      <div className="border-b border-border p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <User className="h-4 w-4 text-muted-foreground" />
          Partes del Contrato
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Landlord */}
          <div className="rounded-sm border border-border p-4">
            <p className="text-xs font-medium font-mono uppercase tracking-wider text-muted-foreground">
              Arrendador
            </p>
            <p className="mt-2 font-medium text-foreground">{contract.landlordName}</p>
            <p className="text-sm text-muted-foreground">CC: {contract.landlordDocument}</p>
            <p className="text-sm text-muted-foreground">{contract.landlordEmail}</p>
          </div>
          {/* Tenant */}
          <div className="rounded-sm border border-border p-4">
            <p className="text-xs font-medium font-mono uppercase tracking-wider text-muted-foreground">
              Arrendatario
            </p>
            <p className="mt-2 font-medium text-foreground">{contract.tenantName}</p>
            <p className={cn("text-sm", isContractSigned ? "text-muted-foreground" : "text-muted-foreground font-mono")}>
              CC: {tenantDocument}
            </p>
            <p className={cn("text-sm", isContractSigned ? "text-muted-foreground" : "text-muted-foreground font-mono")}>
              {tenantEmail}
            </p>
            {!isContractSigned && (
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-amber-600">
                <Lock className="h-3 w-3" />
                <span>Datos completos al firmar contrato</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clauses */}
      <div className="border-b border-border p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Clausulas del Contrato
        </h3>
        <div className="space-y-4">
          {visibleClauses.map((clause) => (
            <div key={clause.id} className="text-sm">
              <h4 className="font-medium text-foreground">{clause.title}</h4>
              <p className="mt-1 text-muted-foreground leading-relaxed">{clause.content}</p>
            </div>
          ))}
          {hasMoreClauses && !showAllClauses && (
            <button
              onClick={() => setShowAllClauses(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <CaretDown className="h-4 w-4" />
              Ver {template.clauses.length - INITIAL_CLAUSES} cláusulas más
            </button>
          )}
        </div>
      </div>

      {/* Non-Negotiable Clauses */}
      {contract.nonNegotiableClauses && contract.nonNegotiableClauses.length > 0 && (
        <div className="border-b border-border p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Lock className="h-4 w-4 text-primary" />
            Condiciones Innegociables del Arrendador
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Las siguientes condiciones fueron establecidas como requisitos innegociables por el arrendador
            y forman parte vinculante del presente contrato.
          </p>
          <div className="space-y-4">
            {contract.nonNegotiableClauses.map((clause) => (
              <div
                key={clause.id}
                className="text-sm rounded-sm border border-primary/20 bg-primary/5 p-4"
              >
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  {clause.title}
                </h4>
                <p className="mt-1.5 text-muted-foreground leading-relaxed pl-[22px]">
                  {clause.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Special Conditions */}
      {contract.specialConditions && (
        <div className="border-b border-border p-6">
          <h3 className="mb-2 text-sm font-semibold text-foreground">
            Condiciones Especiales
          </h3>
          <p className="text-sm text-muted-foreground">{contract.specialConditions}</p>
        </div>
      )}

      {/* Signatures */}
      <div className="p-6">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Firmas</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Landlord Signature */}
          <div
            className={cn(
              'rounded-sm border p-4',
              contract.landlordSignature
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-dashed border-border bg-muted'
            )}
          >
            <p className="text-xs font-medium font-mono uppercase tracking-wider text-muted-foreground">
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
              <p className="mt-2 text-sm text-muted-foreground">Pendiente</p>
            )}
          </div>

          {/* Tenant Signature */}
          <div
            className={cn(
              'rounded-sm border p-4',
              contract.tenantSignature
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-dashed border-border bg-muted'
            )}
          >
            <p className="text-xs font-medium font-mono uppercase tracking-wider text-muted-foreground">
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
              <p className="mt-2 text-sm text-muted-foreground">Pendiente</p>
            )}
          </div>
        </div>
      </div>

      {/* Legal Footer */}
      <div className="border-t border-border bg-muted p-4 text-center">
        <p className="text-xs text-muted-foreground">
          Este contrato se rige por la Ley 820 de 2003 y demás normas concordantes.
          <br />
          Las firmas electrónicas tienen validez legal según la Ley 527 de 1999.
        </p>
      </div>

      {/* Authenticity Certificate Modal */}
      <AuthenticityCertificate
        contract={contract}
        variant="full"
        isOpen={showCertificate}
        onClose={() => setShowCertificate(false)}
      />
    </div>
  );
}
