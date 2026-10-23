'use client';

import { FileText } from '@phosphor-icons/react';
import { Button } from '@/components/ui';
import { CifraHeroe } from '@/components/pantalla/CifraHeroe';
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado';
import { useTr } from '@/lib/i18n/use-tr';
import { ContractExpandableItem } from '@/components/contract/ContractExpandableItem';
import { EmptyState } from '@/components/ui/empty-state';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';
import { useContracts } from '@/lib/hooks/useContracts';
import { useState, useMemo } from 'react';
import { useI18n } from '@/lib/i18n';
import {
  ContratosConLaInmobiliaria,
  useContratosAdministrados,
} from '@/components/landlord/ContratosConLaInmobiliaria';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';

// ============================================================================
// TextTs
// ============================================================================

type PestanaDeContratos = 'all' | 'needs_action' | 'awaiting' | 'active';

interface TabConfig {
  id: PestanaDeContratos;
  label: string;
  count: number;
}

// ============================================================================
// Main Component
// ============================================================================

export default function ContratosPage() {
  const { t } = useI18n();
  const tr = useTr();
  const { contracts: allContracts, isLoading, error, errorCrudo, refetch } = useContracts();
  // Los contratos que le administra una inmobiliaria no salen por `landlordId`
  // (QA 22-09: «TOTAL CONTRATOS 0» con cuatro contratos en su estado de cuenta).
  const administrados = useContratosAdministrados();

  const pendingContracts = useMemo(() =>
    allContracts.filter(c => c.status === 'pending_landlord' || c.status === 'pending_tenant' || c.status === 'draft'),
    [allContracts]
  );
  const activeContracts = useMemo(() =>
    allContracts.filter(c => c.status === 'active'),
    [allContracts]
  );

  const needsAction = useMemo(() =>
    pendingContracts.filter((c) => c.status === 'pending_landlord'),
    [pendingContracts]
  );
  const awaitingTenant = useMemo(() =>
    pendingContracts.filter((c) => c.status === 'pending_tenant'),
    [pendingContracts]
  );

  const [activeTab, setTab] = useState<PestanaDeContratos>('all');

  // Funnel contracts by tab
  const filteredContracts = useMemo(() => {
    if (activeTab === 'all') return allContracts;
    if (activeTab === 'needs_action') return needsAction;
    if (activeTab === 'awaiting') return awaitingTenant;
    if (activeTab === 'active') return activeContracts;
    return allContracts;
  }, [activeTab, allContracts, needsAction, awaitingTenant, activeContracts]);

  // Tabs configuration
  const tabs: TabConfig[] = [
    { id: 'all', label: t('landlord.contracts.tabAll'), count: allContracts.length },
    { id: 'needs_action', label: t('landlord.contracts.tabNeedsAction'), count: needsAction.length },
    { id: 'awaiting', label: t('landlord.contracts.tabAwaiting'), count: awaitingTenant.length },
    { id: 'active', label: t('landlord.contracts.tabActive'), count: activeContracts.length },
  ];

  if (isLoading || (allContracts.length === 0 && administrados.cargando)) {
    return (
      <div className="p-6 lg:p-8">
        {/* Dentro del panel va el esqueleto, no el logo (Nico, 01-10: «el logo sólo en cargas de pantalla completa»). */}
        <EsqueletoDePagina variante="list" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <FalloDeCarga
          error={errorCrudo ?? error}
          queEs="tus contratos"
          onReintentar={refetch}
        />
      </div>
    );
  }

  // Sin contratos propios pero con contratos de inmobiliaria: se dicen ésos,
  // no «0 contratos» ni «Firma tu primer contrato».
  if (allContracts.length === 0 && administrados.doc) {
    return (
      <div className="p-6 lg:p-8 space-y-8">
        {/* Propietario de una inmobiliaria: aquí no hay sección del independiente. */}
        <EncabezadoDePantalla
          titulo={t('landlord.contracts.title')}
          descripcion={t('landlord.contracts.subtitle')}
        />
        <ContratosConLaInmobiliaria doc={administrados.doc} />
      </div>
    );
  }

  /*
   * Ronda 28 (revisora r27): LA RESPUESTA arriba, en una cifra: cuántos contratos esperan TU firma, con su botón.
   * Antes, cuatro conteos del mismo peso con subrótulos de relleno («En el sistema») y «Por firmar» dicho dos
   * veces (la franja y el aviso amarillo). Lo demás va en las pestañas con su conteo, dentro de la lista.
   */
  const porFirmar = needsAction.length;
  return (
    <div className="p-6 lg:p-8">
        <EncabezadoDePantalla
          className="mb-6"
          seccion="Contratos y plata"
          titulo={t('landlord.contracts.title')}
          descripcion={t('landlord.contracts.subtitle')}
        />

        <section className="mb-6 rounded-lg border border-border bg-surface p-5 sm:p-6" data-testid="cifras-de-contratos">
          <CifraHeroe
            rotulo={t('landlord.contracts.toSign')}
            cifra={porFirmar}
            contexto={porFirmar === 1 ? tr('contrato espera tu firma') : tr('contratos esperan tu firma')}
            esCero={porFirmar === 0}
            cuandoEsCero={tr('Ningún contrato espera tu firma.')}
            total={allContracts.length}
            tramos={[
              { clave: 'por-firmar', etiqueta: t('landlord.contracts.toSign'), monto: porFirmar, tono: 'aviso', cifra: porFirmar },
              { clave: 'esperando', etiqueta: t('landlord.contracts.tabAwaiting'), monto: awaitingTenant.length, tono: 'neutro', cifra: awaitingTenant.length },
              { clave: 'activos', etiqueta: t('landlord.contracts.tabActive'), monto: activeContracts.length, tono: 'exito', cifra: activeContracts.length },
            ]}
            pie={
              porFirmar > 0 ? (
                <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <Button size="sm" hideArrow onClick={() => setTab('needs_action')} data-testid="ver-por-firmar">
                    {tr('Ver los que esperan tu firma')}
                  </Button>
                  <span>{t('landlord.contracts.urgentBannerHint')}</span>
                </span>
              ) : undefined
            }
          />
        </section>

        <section className="bg-surface rounded-lg border border-border overflow-hidden">
          {/* Las pestañas con su conteo DENTRO de la lista (como Visitas). */}
          <div className="border-b border-border px-4 py-3 sm:px-5 empty:hidden">
            <PestanasDeEstado
              etiqueta={t('landlord.contracts.title')}
              valor={activeTab}
              onCambio={setTab}
              pestanas={tabs.map((tab) => ({
                valor: tab.id,
                etiqueta: tab.label,
                cuantos: tab.count,
                fija: tab.id === 'all',
                tono: tab.id === 'needs_action' ? ('aviso' as const) : undefined,
              }))}
            />
          </div>
              {filteredContracts.length > 0 ? (
                <div className="divide-y divide-border-faint">
                  {filteredContracts.map((contract) => (
                    <ContractExpandableItem key={contract.id} contract={contract} />
                  ))}
                </div>
              ) : (
                <div className="p-6">
                  <EmptyState
                    icon={FileText}
                    ilustracion="casa"
                    title={t('landlord.contracts.emptyTitle')}
                    description={t('landlord.contracts.emptyDescription')}
                    action={{ label: t('landlord.contracts.emptyAction'), href: "/panel/candidatos" }}
                  />
                </div>
              )}
        </section>
    </div>
  );
}
