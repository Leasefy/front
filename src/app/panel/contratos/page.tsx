'use client';

import Link from 'next/link';
import { FileText, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SectionLabel } from '@/components/ui/section-label';
import { ContractExpandableItem } from '@/components/contract/ContractExpandableItem';
import {
  getContractsForLandlord,
  getPendingContracts,
  getActiveContracts,
} from '@/lib/data/mock-contracts';

/**
 * Contracts Management Page
 * Luxterra style - clean, minimal, elegant
 * Expandable rows with inline actions
 */
export default function ContratosPage() {
  const landlordId = 'landlord-001';
  const allContracts = getContractsForLandlord(landlordId);
  const pendingContracts = getPendingContracts(landlordId);
  const activeContracts = getActiveContracts(landlordId);

  const needsAction = pendingContracts.filter((c) => c.status === 'pending_landlord');
  const awaitingTenant = pendingContracts.filter((c) => c.status === 'pending_tenant');

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-8 md:py-12">
        {/* Header */}
        <header className="mb-12">
          <h1 className="text-[2rem] md:text-[2.5rem] font-light text-slate-900 tracking-[-0.02em]">
            Contratos
          </h1>
          <p className="text-slate-400 mt-2 text-sm tracking-[-0.01em]">
            Gestiona los contratos de tus propiedades
          </p>
        </header>

        {/* Stats - Dark hero section */}
        <div className="bg-[#0f0f0f] rounded-[2px] p-8 md:p-10 mb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <p className="text-[2rem] md:text-[2.5rem] font-light text-white tracking-[-0.02em]">
                {allContracts.length}
              </p>
              <p className="text-gray-500 text-xs mt-1">Contratos totales</p>
            </div>
            <div>
              <p
                className={cn(
                  'text-[2rem] md:text-[2.5rem] font-light tracking-[-0.02em]',
                  needsAction.length > 0 ? 'text-amber-400' : 'text-white'
                )}
              >
                {needsAction.length}
              </p>
              <p className="text-gray-500 text-xs mt-1">Por firmar</p>
            </div>
            <div>
              <p className="text-[2rem] md:text-[2.5rem] font-light text-white tracking-[-0.02em]">
                {awaitingTenant.length}
              </p>
              <p className="text-gray-500 text-xs mt-1">Esperando inquilino</p>
            </div>
            <div>
              <p className="text-[2rem] md:text-[2.5rem] font-light text-white tracking-[-0.02em]">
                {activeContracts.length}
              </p>
              <p className="text-gray-500 text-xs mt-1">Activos</p>
            </div>
          </div>
        </div>

        {/* Contracts requiring action */}
        {needsAction.length > 0 && (
          <section className="mb-12">
            <div className="mb-6">
              <SectionLabel className="text-slate-400 mb-2" dotVariant="warning">
                Accion requerida
              </SectionLabel>
              <h2 className="text-xl font-light text-slate-900 tracking-[-0.02em]">
                Requieren tu firma
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Haz clic para ver detalles y firmar
              </p>
            </div>
            <div className="border border-slate-100 rounded-[2px]">
              {needsAction.map((contract) => (
                <ContractExpandableItem key={contract.id} contract={contract} />
              ))}
            </div>
          </section>
        )}

        {/* Contracts awaiting tenant */}
        {awaitingTenant.length > 0 && (
          <section className="mb-12">
            <div className="mb-6">
              <SectionLabel className="text-slate-400 mb-2" dotVariant="info">
                En proceso
              </SectionLabel>
              <h2 className="text-xl font-light text-slate-900 tracking-[-0.02em]">
                Esperando firma del inquilino
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Ya firmaste, esperando al arrendatario
              </p>
            </div>
            <div className="border border-slate-100 rounded-[2px]">
              {awaitingTenant.map((contract) => (
                <ContractExpandableItem key={contract.id} contract={contract} />
              ))}
            </div>
          </section>
        )}

        {/* Active contracts */}
        {activeContracts.length > 0 && (
          <section className="mb-12">
            <div className="mb-6">
              <SectionLabel className="text-slate-400 mb-2" dotVariant="success">
                Vigentes
              </SectionLabel>
              <h2 className="text-xl font-light text-slate-900 tracking-[-0.02em]">
                Contratos activos
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Contratos firmados por ambas partes
              </p>
            </div>
            <div className="border border-slate-100 rounded-[2px]">
              {activeContracts.map((contract) => (
                <ContractExpandableItem key={contract.id} contract={contract} />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {allContracts.length === 0 && (
          <div className="text-center py-20 border border-slate-100 rounded-[2px]">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-light text-slate-900 mb-2">
              No tienes contratos
            </h3>
            <p className="text-slate-500 text-sm mb-6">
              Los contratos apareceran aqui cuando apruebes candidatos
            </p>
            <Link href="/panel">
              <Button variant="outline" className="rounded-[2px]">
                <Building2 className="mr-2 w-4 h-4" />
                Ver mis propiedades
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
