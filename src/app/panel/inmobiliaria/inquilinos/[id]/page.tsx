'use client';

/**
 * La ficha propia del inquilino — Nico (21-10-2026) eligió «ficha propia con
 * pestañas»: Resumen · Arriendos y cobros · Datos y permisos · Historial. Antes
 * todo vivía en el cajón de la lista; el cajón queda como vista rápida con
 * «Abrir la ficha».
 *
 * Lo pinta el MISMO cuerpo del cajón (`CuerpoDelCajon` con `enFicha`): mismos
 * datos, mismas reglas, mismos avisos. La persona sale de la lista del
 * portafolio por su `tenantId` (puede ser una cuenta o `doc:`/`correo:`/
 * `contrato:`), así que no hay una ruta nueva en el back.
 */
import { use, useState } from 'react';

import { PageGuard } from '@/components/auth/PageGuard';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { CuerpoDelCajon } from '@/components/inmobiliaria/InquilinoDrawer';
import { NuevoInquilinoDrawer } from '@/components/inmobiliaria/NuevoInquilinoDrawer';
import { BackButton } from '@/components/ui/back-button';
import { EmptyState } from '@/components/ui/empty-state';
import { useInquilinoDetalle } from '@/lib/hooks/use-inquilino-detalle';
import { useInquilinos } from '@/lib/hooks/use-inquilinos';
import type { Inquilino } from '@/lib/api/inquilinos.service';
import { User } from '@phosphor-icons/react';

function FichaDelInquilino({ persona, onEditar, version }: { persona: Inquilino; onEditar: (p: Inquilino) => void; version: number }) {
  const detalle = useInquilinoDetalle(persona, version);
  if (!detalle) return <EsqueletoDePagina variante="detail" />;
  return (
    <div className="rounded-lg border border-border bg-surface" data-testid="ficha-del-inquilino">
      <CuerpoDelCajon detalle={detalle} onEditar={onEditar} enFicha />
    </div>
  );
}

export default function FichaDelInquilinoPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const tenantId = decodeURIComponent(id);
  const { inquilinos, cargando, error, refrescar } = useInquilinos({ buscar: '', estado: 'todos' });
  const [editando, setEditando] = useState<Inquilino | null>(null);
  const [version, setVersion] = useState(0);
  const persona = inquilinos.find((i) => i.tenantId === tenantId) ?? null;

  return (
    <PageGuard module="contratos" seccion="Inquilinos">
      <div className="space-y-6 p-6 lg:p-8">
        <div data-testid="ficha-inquilino-volver">
          <BackButton href="/panel/inmobiliaria/inquilinos" label="Volver a Inquilinos" />
        </div>
        {cargando && !persona ? (
          <EsqueletoDePagina variante="detail" />
        ) : error && !persona ? (
          <FalloDeCarga error={error} queEs="este inquilino" onReintentar={() => void refrescar()} />
        ) : !persona ? (
          <EmptyState
            icon={User}
            title="No encontramos a este inquilino"
            description="Puede que el enlace esté incompleto o que ya no esté en tu portafolio."
            action={{ label: 'Volver a Inquilinos', href: '/panel/inmobiliaria/inquilinos' }}
          />
        ) : (
          <FichaDelInquilino persona={persona} onEditar={setEditando} version={version} />
        )}
      </div>
      {/* E-16: el MISMO formulario de la lista, con sus datos. */}
      <NuevoInquilinoDrawer
        abierto={editando !== null}
        onOpenChange={(sigue) => !sigue && setEditando(null)}
        onCreado={() => {
          setEditando(null);
          setVersion((v) => v + 1);
          void refrescar();
        }}
        editando={editando}
      />
    </PageGuard>
  );
}
