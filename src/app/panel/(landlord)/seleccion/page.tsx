'use client';

import Link from 'next/link';
import { UsersThree, CaretRight, CheckCircle } from '@phosphor-icons/react';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { EmptyState } from '@/components/ui/empty-state';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';
import { useOwnerProcesos } from '@/lib/hooks/useOwnerPortal';
import { PortalPlaceholder } from '@/components/landlord/portal/PortalPlaceholder';

/**
 * Elegir inquilino (F2) — lista de procesos. Loading→Spinner; portal no cableado→"Próximamente";
 * con agencyId pero sin procesos → estado legítimo "no tienes procesos"; con procesos → lista.
 */
export default function SeleccionPage() {
  const { procesos, isLoading, unavailable } = useOwnerProcesos();

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        {/* Dentro del panel va el esqueleto, no el logo (Nico, 01-10: «el logo sólo en cargas de pantalla completa»). */}
        <EsqueletoDePagina variante="list" className="max-w-4xl" />
      </div>
    );
  }

  if (unavailable) {
    return (
      <PortalPlaceholder
        title="Elegir inquilino"
        subtitle="Compara los postulados asegurables y elige tú quién vive en tu inmueble."
        icon={UsersThree}
        emptyDescription="Vas a poder comparar lado a lado los postulados asegurables de tu inmueble y elegir con un clic —tu elección se auto-valida. Se activa cuando tu inmobiliaria habilite el Portal del Propietario."
      />
    );
  }

  // Lo pendiente primero (glow up, 21-10-2026): los que esperan tu elección van
  // arriba; los ya resueltos, abajo, en el orden de siempre.
  const ordenados = procesos
    .map((p, i) => ({ p, i }))
    .sort((a, b) => Number(a.p.chosenCandidacyId !== null) - Number(b.p.chosenCandidacyId !== null) || a.i - b.i)
    .map(({ p }) => p);

  return (
    <div>
      <div className="max-w-4xl p-6 lg:p-8">
        <EncabezadoDePantalla
          seccion="Mis inmuebles"
          titulo="Elegir inquilino"
          descripcion="Compara los postulados asegurables y elige tú quién vive en tu inmueble."
        />

        {procesos.length === 0 ? (
          <EmptyState
            ilustracion="casa"
            icon={UsersThree}
            title="No tienes elecciones abiertas"
            description="Cuando tu inmobiliaria reúna postulados asegurables para uno de tus inmuebles, aparece acá para que elijas."
          />
        ) : (
          <ul className="mt-6 space-y-3" data-testid="procesos-de-eleccion">
            {ordenados.map((p) => {
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
