'use client';

import Link from 'next/link';
import { UsersThree, CaretRight, CheckCircle } from '@phosphor-icons/react';
import { PageHeader } from '@leasefy/cadence';
import { Card, Spinner } from '@/components/ui';
import { useOwnerProcesos } from '@/lib/hooks/useOwnerPortal';
import { PortalPlaceholder } from '@/components/landlord/portal/PortalPlaceholder';

/**
 * Elegir inquilino (F2) — lista de procesos. Loading→Spinner; portal no cableado→"Próximamente";
 * con agencyId pero sin procesos → estado legítimo "no tenés procesos"; con procesos → lista.
 */
export default function SeleccionPage() {
  const { procesos, isLoading, unavailable } = useOwnerProcesos();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (unavailable) {
    return (
      <PortalPlaceholder
        title="Elegir inquilino"
        subtitle="Compará los postulados asegurables y elegí vos quién vive en tu inmueble."
        icon={UsersThree}
        emptyDescription="Vas a poder comparar lado a lado los postulados asegurables de tu inmueble y elegir con un clic —tu elección se auto-valida. Se activa cuando tu inmobiliaria habilite el Portal del Propietario."
      />
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <PageHeader
          title="Elegir inquilino"
          subtitle="Compará los postulados asegurables y elegí vos quién vive en tu inmueble."
        />

        {procesos.length === 0 ? (
          <Card className="p-6 mt-8">
            <p className="text-sm text-fg-muted">
              No tenés procesos de elección abiertos. Cuando tu inmobiliaria reúna postulados
              asegurables para uno de tus inmuebles, aparecerá acá para que elijas.
            </p>
          </Card>
        ) : (
          <ul className="mt-8 space-y-3">
            {procesos.map((p) => {
              const resuelto = p.chosenCandidacyId !== null;
              return (
                <li key={p.id}>
                  <Link
                    href={`/panel/seleccion/${p.id}`}
                    className="flex items-center justify-between gap-4 p-4 rounded-lg bg-surface border border-border hover:bg-surface-muted transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{p.propertyLabel}</p>
                      <p className="text-sm text-fg-muted capitalize">
                        {resuelto ? 'Inquilino elegido' : p.status.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {resuelto ? (
                        <CheckCircle className="w-5 h-5 text-primary" weight="fill" />
                      ) : (
                        <span className="text-xs font-medium text-primary">Comparar</span>
                      )}
                      <CaretRight className="w-4 h-4 text-fg-muted" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
