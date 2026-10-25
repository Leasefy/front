'use client';

import Link from 'next/link';
import { UsersThree, CheckCircle } from '@phosphor-icons/react';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { EmptyState } from '@/components/ui/empty-state';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { useOwnerProcesos } from '@/lib/hooks/useOwnerPortal';
import { PortalPlaceholder } from '@/components/landlord/portal/PortalPlaceholder';
import { useLlevarALoSuyo } from '@/components/portales/use-llevar-a-lo-suyo';

/**
 * Elegir inquilino (F2) — lista de procesos. Loading→Spinner; portal no cableado→"Próximamente";
 * con agencyId pero sin procesos → estado legítimo "no tienes procesos"; con procesos → lista.
 */
/** «EN_COMPARACION» → «En comparacion»: la frase con mayúscula inicial (la clase `capitalize` subía cada palabra). */
function estadoEnFrase(estado: string): string {
  const texto = estado.replace(/_/g, ' ').toLowerCase().trim();
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;
}

export default function SeleccionPage() {
  const { procesos, isLoading, unavailable, error, refetch } = useOwnerProcesos();
  // Ronda 28: al independiente, directo a sus candidatos (antes «Tus candidatos están en Candidatos»).
  const llevando = useLlevarALoSuyo(!isLoading && unavailable, '/panel/candidatos');

  if (isLoading || llevando) {
    return (
      <div className="p-6 lg:p-8">
        {/* Dentro del panel va el esqueleto, no el logo (Nico, 01-10: «el logo sólo en cargas de pantalla completa»). */}
        <EsqueletoDePagina variante="list" className="max-w-4xl" />
      </div>
    );
  }

  if (unavailable) {
    return (
      // Revisora r25: sólo la ve el independiente; sin jerga («auto-valida») ni «tu inmobiliaria». Lo suyo: sus candidatos.
      <PortalPlaceholder
        seccion="Mis inmuebles"
        title="Elegir inquilino"
        subtitle="Compara a los candidatos y elige tú quién vive en tu inmueble."
        icon={UsersThree}
        tituloDelVacio="Tus candidatos están en Candidatos"
        emptyDescription="Ahí ves quién se postuló a cada inmueble, su calificación y sus documentos, y lo eliges. La comparación lado a lado con los asegurables llega cuando una inmobiliaria te administra los inmuebles en Leasefy."
        accion={{ label: 'Ver mis candidatos', href: '/panel/candidatos' }}
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

        {error ? (
          /* Con el micro caído no se dice «no tienes elecciones»: no se pudo traer la lista. */
          <div className="mt-6">
            <FalloDeCarga error={error} queEs="tus elecciones de inquilino" onReintentar={refetch} />
          </div>
        ) : procesos.length === 0 ? (
          <EmptyState
            ilustracion="casa"
            icon={UsersThree}
            title="No tienes elecciones abiertas"
            description="Cuando tu inmobiliaria reúna postulados asegurables para uno de tus inmuebles, aparece aquí para que elijas."
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
                      <p className="text-sm text-fg-muted">
                        {resuelto ? 'Inquilino elegido' : estadoEnFrase(p.status)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {resuelto ? (
                        <CheckCircle className="w-5 h-5 text-primary" weight="fill" />
                      ) : (
                        <span className="text-caption font-medium text-primary">Comparar</span>
                      )}
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
