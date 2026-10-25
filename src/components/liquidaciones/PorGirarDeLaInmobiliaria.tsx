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

import { MasDetalles } from '@/components/pantalla/MasDetalles';
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

/**
 * Revisora r22 (Giros #3): con el mes elegido ya girado, «Por girar hasta octubre: $ X» al lado de «Octubre está girado
 * completo» se leía como una contradicción. Esa plata es de meses anteriores, y la cifra lo dice.
 */
export function PorGirarDeLaInmobiliaria({ mesGirado, nombreDelMes }: { mesGirado?: boolean; nombreDelMes?: string } = {}) {
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

  // Revisora r25 (Giros #1, C9): cada cifra con SUS decimales, como el neto y la tabla de al
  // lado. Con `plataPareja` (ronda 19) los centavos de «próximos giros» le ponían «,00» a
  // «Por girar» y la vista decía «$ 2.371.800,00» junto a «$ 6.783.700».
  const plataDeLaFranja = (v: number) => formatCurrency(v);
  return (
    <Presence show={cifra !== null} initial={false}>
      {cifra ? (
        <section
          className="grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-2"
          data-testid="por-girar-liquidaciones"
        >
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">
              {mesGirado && cifra.porGirarCop > 0 ? 'Por girar, de meses anteriores' : rotuloDePorGirar(cifra.hastaMes)}
            </p>
            <p
              className="mt-1 whitespace-nowrap font-mono text-2xl tabular-nums text-fg"
              data-testid="por-girar-cifra"
            >
              <AnimatedNumber value={cifra.porGirarCop} format={plataDeLaFranja} />
            </p>
            {/* Revisora r23 (Giros #3): el subtexto «{Mes} ya está girado: esta plata es de meses anteriores»
                repetía la tarjeta «Lo que falta del mes» y el rótulo de la cifra. Fuera. */}
            {/* GLOW UP (21-10): la cifra primero; lo que cuenta, plegado (la misma frase del Tablero y de Cartera). */}
            <MasDetalles etiqueta="Qué cuenta esta cifra" montadoSiempre className="mt-1">
              <p className="text-caption text-fg-muted">{definicionDePorGirar(cifra.hastaMes)}</p>
            </MasDetalles>
          </div>
          <div className="min-w-0 sm:border-l sm:border-border sm:pl-5">
            <p className="text-sm text-muted-foreground">
              {rotuloDeProximosGiros(cifra.proximosGiros.desdeMes, cifra.proximosGiros.hastaMes)}
            </p>
            <p
              className="mt-1 whitespace-nowrap font-mono text-2xl tabular-nums text-fg-muted"
              data-testid="proximos-giros"
            >
              <AnimatedNumber value={cifra.proximosGiros.totalCop} format={plataDeLaFranja} />
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
