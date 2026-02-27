'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { SpinnerGap, WarningCircle, CheckCircle, Confetti, ArrowRight, Clock } from '@phosphor-icons/react';
import { toast } from 'sonner';

import { BackButton } from '@/components/ui/back-button';
import { ContractPreview } from '@/components/contract/ContractPreview';
import { SignatureForm } from '@/components/contract/SignatureForm';
import { AuditTrail } from '@/components/contract/AuditTrail';
import { useContract, useContractActions } from '@/lib/hooks/useContracts';
import { getTemplateById } from '@/lib/constants/contract-templates';
import { CONTRACT_STATUS_LABELS, CONTRACT_TYPE_LABELS } from '@/lib/types/contract';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Contract } from '@/lib/types/contract';

// ============================================================================
// Types
// ============================================================================

interface FirmarContractPageProps {
  params: {
    contractId: string;
  };
}

// ============================================================================
// Success State Component
// ============================================================================

function SigningSuccess({ locale }: { locale: string }) {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-lg mx-auto text-center py-16"
    >
      <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
        <Confetti className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
      </div>
      <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-3">
        {locale === 'es' ? '¡Contrato firmado exitosamente!' : 'Contract signed successfully!'}
      </h2>
      <p className="text-neutral-500 dark:text-neutral-400 mb-8 max-w-sm mx-auto">
        {locale === 'es'
          ? 'Ambas partes han firmado. Tu contrato está activo y puedes descargarlo en cualquier momento.'
          : 'Both parties have signed. Your contract is active and you can download it anytime.'}
      </p>
      <button
        onClick={() => router.push('/inquilino/contratos')}
        className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-semibold transition-colors shadow-lg shadow-indigo-500/25"
      >
        {locale === 'es' ? 'Ver mis contratos' : 'View my contracts'}
        <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

// ============================================================================
// Read-Only View (contract not in pending_tenant state)
// ============================================================================

function ReadOnlyView({ contract, locale }: { contract: Contract; locale: string }) {
  const template = getTemplateById(contract.templateId);

  return (
    <div>
      {/* Status Banner */}
      <div className={cn(
        'mb-6 rounded-2xl px-5 py-4 flex items-center gap-3',
        contract.status === 'active'
          ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50'
          : contract.status === 'pending_landlord'
            ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50'
            : 'bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700'
      )}>
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
          contract.status === 'active'
            ? 'bg-emerald-100 dark:bg-emerald-900/40'
            : contract.status === 'pending_landlord'
              ? 'bg-amber-100 dark:bg-amber-900/40'
              : 'bg-neutral-100 dark:bg-neutral-800'
        )}>
          {contract.status === 'active' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          ) : contract.status === 'pending_landlord' ? (
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          ) : (
            <Clock className="w-5 h-5 text-neutral-500" />
          )}
        </div>
        <div>
          <p className={cn(
            'text-sm font-medium',
            contract.status === 'active'
              ? 'text-emerald-800 dark:text-emerald-200'
              : contract.status === 'pending_landlord'
                ? 'text-amber-800 dark:text-amber-200'
                : 'text-neutral-700 dark:text-neutral-300'
          )}>
            {contract.status === 'active'
              ? (locale === 'es' ? 'Contrato activo — ambas partes firmaron' : 'Contract active — both parties signed')
              : contract.status === 'pending_landlord'
                ? (locale === 'es' ? 'Esperando firma del propietario' : 'Waiting for landlord signature')
                : CONTRACT_STATUS_LABELS[contract.status]}
          </p>
        </div>
      </div>

      {template && (
        <div className="space-y-6">
          <ContractPreview contract={contract} template={template} />
          <AuditTrail contract={contract} />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function FirmarContractPage({ params }: FirmarContractPageProps) {
  const { contractId } = params;
  const { locale } = useI18n();
  const router = useRouter();

  const { contract, isLoading, error } = useContract(contractId);
  const actions = useContractActions();

  const [localContract, setLocalContract] = useState<Contract | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signedSuccess, setSignedSuccess] = useState(false);

  // Use local contract if updated after signing, else use fetched
  const activeContract = localContract ?? contract;
  const template = activeContract ? getTemplateById(activeContract.templateId) : undefined;

  const isPendingTenant = activeContract?.status === 'pending_tenant';

  // Handle signing
  const handleSign = async (otpVerified: boolean) => {
    if (!activeContract) return;

    setIsSigning(true);
    const updated = await actions.sign(activeContract.id, { otpVerified });
    if (updated) {
      setLocalContract(updated);
      setSignedSuccess(true);
      toast.success(locale === 'es' ? 'Contrato firmado exitosamente' : 'Contract signed successfully');
    } else {
      toast.error(locale === 'es' ? 'Error al firmar el contrato' : 'Error signing contract');
    }
    setIsSigning(false);
  };

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0f0f10] flex items-center justify-center">
        <SpinnerGap className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  // Error or not found
  if (error || !activeContract) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0f0f10]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <BackButton href="/inquilino/contratos" label={locale === 'es' ? 'Volver a contratos' : 'Back to contracts'} />
          <div className="mt-8 text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4">
              <WarningCircle className="w-8 h-8 text-neutral-400" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              {locale === 'es' ? 'Contrato no encontrado' : 'Contract not found'}
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400">
              {error || (locale === 'es'
                ? 'No pudimos encontrar este contrato.'
                : 'We couldn\'t find this contract.')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success state after signing
  if (signedSuccess) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0f0f10]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <SigningSuccess locale={locale} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f0f10]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Back */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <BackButton href="/inquilino/contratos" label={locale === 'es' ? 'Volver a contratos' : 'Back to contracts'} />
        </motion.div>

        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">
            {isPendingTenant
              ? (locale === 'es' ? 'Firmar Contrato' : 'Sign Contract')
              : (locale === 'es' ? 'Contrato de Arrendamiento' : 'Rental Contract')}
          </h1>
          <p className="mt-1 text-neutral-500 dark:text-neutral-400">
            {activeContract.propertyAddress} — {activeContract.propertyCity}
          </p>
        </motion.div>

        {/* Non-signing state — read only */}
        {!isPendingTenant && (
          <ReadOnlyView contract={activeContract} locale={locale} />
        )}

        {/* Signing state — two column layout */}
        {isPendingTenant && template && (
          <>
            {/* Status Banner */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-6 rounded-2xl px-5 py-4 flex items-center gap-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/50"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                <WarningCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
                {locale === 'es'
                  ? 'Revisa las cláusulas del contrato y firma para completar el proceso'
                  : 'Review the contract clauses and sign to complete the process'}
              </p>
            </motion.div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Main — Contract Preview */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-2 space-y-6"
              >
                <ContractPreview contract={activeContract} template={template} />
                <AuditTrail contract={activeContract} />
              </motion.div>

              {/* Sidebar — Signature + info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="lg:col-span-1"
              >
                <div className="sticky top-6 space-y-4">
                  {/* Signing Form */}
                  <SignatureForm
                    onSign={handleSign}
                    isLandlord={false}
                    isLoading={isSigning}
                    signerName={activeContract.tenantName}
                    signerPhone={activeContract.tenantPhone || '+57 300 000 0000'}
                    requireOTP={true}
                  />

                  {/* Contract Info Card */}
                  <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#222224] p-4">
                    <h4 className="text-xs font-medium font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      {locale === 'es' ? 'Tipo de contrato' : 'Contract type'}
                    </h4>
                    <p className="mt-1 font-medium text-neutral-900 dark:text-white">
                      {CONTRACT_TYPE_LABELS[activeContract.type]}
                    </p>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                      {template.clauses.length} {locale === 'es' ? 'cláusulas' : 'clauses'}
                    </p>
                  </div>

                  {/* Landlord signed info */}
                  {activeContract.landlordSignature && (
                    <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                          {locale === 'es' ? 'Propietario ya firmó' : 'Landlord already signed'}
                        </span>
                      </div>
                      <p className="text-sm text-emerald-800 dark:text-emerald-200 font-medium">
                        {activeContract.landlordName}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
