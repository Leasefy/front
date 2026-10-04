'use client';

/**
 * 🔴 «Por girar» → UNA sola cifra: hasta el mes en curso; lo de los meses
 * siguientes aparte como «Próximos giros» (Nico, 04-10-2026, tal cual).
 *
 * Liquidaciones muestra el neto de UN mes (el que se elige arriba). Encima va
 * la cifra de la inmobiliaria entera, la MISMA del Tablero y de «Cartera → Por
 * pagar» (`GET /inmobiliaria/dispersiones/por-girar`, la misma función del
 * back): antes esta pantalla era la tercera cifra distinta de «Por girar».
 * Si la ruta no responde (un back anterior), no se pinta nada.
 */

import { useEffect, useState } from 'react';
import { AnimatedNumber, Presence } from '@leasefy/cadence';

import { dispersionesApi } from '@/lib/api/inmobiliaria.service';
import {
  definicionDePorGirar,
  rotuloDePorGirar,
  rotuloDeProximosGiros,
  type PorGirarDelBack,
} from '@/lib/propietarios/por-girar';
import { formatCurrency } from '@/lib/types/inmobiliaria';

export function PorGirarDeLaInmobiliaria() {
  const [cifra, setCifra] = useState<PorGirarDelBack | null>(null);

  useEffect(() => {
    let vivo = true;
    // `Promise.resolve().then`: un cliente sin el método (un doble viejo) cae
    // en el `catch` en vez de tumbar la pantalla.
    Promise.resolve()
      .then(() => dispersionesApi.porGirar())
      .then((r) => {
        if (vivo && r && typeof r.porGirarCop === 'number') setCifra(r);
      })
      .catch(() => {
        // Un back anterior no tiene la ruta: la pantalla queda como antes.
      });
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <Presence show={cifra !== null} initial={false}>
      {cifra ? (
        <section
          className="grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-2"
          data-testid="por-girar-liquidaciones"
        >
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{rotuloDePorGirar(cifra.hastaMes)}</p>
            <p
              className="mt-1 whitespace-nowrap font-mono text-2xl font-semibold tabular-nums text-fg"
              data-testid="por-girar-cifra"
            >
              <AnimatedNumber value={cifra.porGirarCop} format={formatCurrency} />
            </p>
            <p className="mt-1 text-caption text-fg-muted">{definicionDePorGirar(cifra.hastaMes)}</p>
          </div>
          <div className="min-w-0 sm:border-l sm:border-border sm:pl-5">
            <p className="text-sm text-muted-foreground">
              {rotuloDeProximosGiros(cifra.proximosGiros.desdeMes, cifra.proximosGiros.hastaMes)}
            </p>
            <p
              className="mt-1 whitespace-nowrap font-mono text-2xl font-semibold tabular-nums text-fg-muted"
              data-testid="proximos-giros"
            >
              <AnimatedNumber value={cifra.proximosGiros.totalCop} format={formatCurrency} />
            </p>
            <p className="mt-1 text-caption text-fg-muted">
              Todavía no se debe girar: va aparte y no se suma a «Por girar».
            </p>
          </div>
        </section>
      ) : null}
    </Presence>
  );
}
