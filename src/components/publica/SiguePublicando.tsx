'use client';

/**
 * «Te falta publicar tu inmueble: sigue donde ibas» (Nico, 28-10-2026: quien crea la cuenta en /publica y se devuelve
 * sin publicar «que retome donde iba»). Si en este navegador quedó un borrador con algo escrito y sin publicar, el
 * panel lo dice arriba con «Seguir publicando» (vuelve a /publica, que lo recupera tal cual). Se oculta con la ✕ por
 * esta sesión. Sin borrador, nada.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from '@phosphor-icons/react';
import { Presence } from '@leasefy/cadence';

import { useAuth } from '@/lib/auth/use-auth';
import { leerBorrador, type InmuebleRapido } from '@/lib/publica/borrador';

const OCULTO = 'leasefy.sigue-publicando.oculto';

/** Una tarjeta con algo escrito, traído o con precio, que todavía no se publicó. */
export function quedoAMedias(i: InmuebleRapido): boolean {
  if (i.idCreado) return false;
  return Boolean(i.origen || i.direccion.trim() || i.precio || i.tipo || i.descripcion.trim());
}

export function SiguePublicando() {
  const { user } = useAuth();
  const [cuantos, setCuantos] = useState(0);
  useEffect(() => {
    if (!user?.id) return;
    try {
      if (window.sessionStorage.getItem(OCULTO) === user.id) return;
    } catch {
      /* sin almacenamiento: se muestra */
    }
    setCuantos((leerBorrador(user.id) ?? []).filter(quedoAMedias).length);
  }, [user?.id]);

  return (
    <Presence show={cuantos > 0}>
      <div className="mx-4 mt-4 flex items-center gap-4 rounded-2xl border border-border bg-surface px-4 py-3 sm:mx-6 lg:mx-8" role="status" data-testid="sigue-publicando">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-primary">Te falta publicar</p>
          <p className="mt-0.5 text-body-sm text-fg">
            {cuantos === 1 ? 'Dejaste un inmueble a medio llenar.' : `Dejaste ${cuantos.toLocaleString('es-CO')} inmuebles a medio llenar.`}{' '}
            <span className="text-fg-muted">Sigue donde ibas: lo guardamos tal cual.</span>
          </p>
        </div>
        <Link
          href="/publica"
          className="inline-flex h-10 shrink-0 items-center rounded-full bg-primary px-5 text-[14px] font-medium text-white transition-colors hover:bg-primary/90"
          data-testid="seguir-publicando"
        >
          Seguir publicando
        </Link>
        <button
          type="button"
          aria-label="Ocultar"
          onClick={() => {
            try {
              if (user?.id) window.sessionStorage.setItem(OCULTO, user.id);
            } catch {
              /* nada */
            }
            setCuantos(0);
          }}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-fg-subtle hover:bg-surface-muted hover:text-fg"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </Presence>
  );
}
