'use client';

/**
 * La franja del modo demo (Nico 29-10-2026: «Ver con datos demo», sólo en lo cerrado). Arriba de la sección pintada
 * con datos de ejemplo: dice que es de ejemplo y que no se guarda nada, deja salir y deja abrir Leasefy de verdad.
 */

import Link from 'next/link';
import { Sparkle } from '@phosphor-icons/react';
import { Presence } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { salirDelModoDemo } from '@/lib/demo/modo-demo';

/**
 * «Así se ven los contratos», «Así se ve la cobranza»: el verbo concuerda con lo que se nombra (30-10-2026, la franja
 * decía «Así se ven la cobranza» y «Así se ven el cobro de tu arriendo»).
 */
export function asiSeVe(queEs: string | null): string {
  if (!queEs) return 'Así se ve con Leasefy.';
  const plural = /^(los|las|tus|sus|mis)\s/i.test(queEs.trim());
  return `Así se ${plural ? 'ven' : 've'} ${queEs} con Leasefy.`;
}

/** `pagar`: dónde se abre todo (la inmobiliaria y el agente en su panel; el propietario independiente en el suyo). */
export function FranjaDeLaDemo({ queEs, pagar = '/panel/inmobiliaria/upgrade' }: { queEs: string | null; pagar?: string }) {
  return (
    <Presence show direction="down">
      <div
        className="mx-4 mt-4 flex flex-col gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3 sm:mx-6 sm:flex-row sm:items-center sm:justify-between lg:mx-8"
        role="status"
        data-testid="franja-de-la-demo"
      >
        <p className="flex items-start gap-2 text-body-sm text-fg">
          <Sparkle className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" weight="fill" aria-hidden="true" />
          <span>
            <span className="font-mono text-caption uppercase tracking-[0.08em] text-fg-muted">Datos de ejemplo</span>
            <span className="block">
              {asiSeVe(queEs)} No se guarda nada de lo que hagas aquí.
            </span>
          </span>
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" variant="ghost" size="sm" hideArrow onClick={salirDelModoDemo} data-testid="salir-de-la-demo">
            Salir de la demo
          </Button>
          {/* Secundario: la acción principal de la pantalla es la de la sección (DESIGN.md: una sola en voltaje). */}
          <Button asChild variant="secondary" size="sm" hideArrow>
            <Link href={pagar}>Abrir todo Leasefy</Link>
          </Button>
        </div>
      </div>
    </Presence>
  );
}
