'use client';

/**
 * El avance de las metas del mes, arriba del ranking (COMERCIAL, Nico
 * 04-10-2026: «metas mensuales con avance en el ranking»). El asesor ve sólo
 * la suya (el back la recorta). Si las metas no están disponibles, no se pinta
 * nada: el ranking sigue igual.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Target } from '@phosphor-icons/react';
import { Appear } from '@leasefy/cadence';

import { cn } from '@/lib/utils';
import { comercialApi, mesDeHoy, nombreDelMes, type MetasDelMes } from '@/lib/comercial/comercial';

function Barra({ hecho, meta }: { hecho: number; meta: number }) {
  const pct = meta > 0 ? Math.min(100, (hecho / meta) * 100) : 0;
  return (
    <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden" aria-hidden="true">
      <div
        className={cn('h-full rounded-full transition-all duration-slow ease-enter', pct >= 100 ? 'bg-success' : 'bg-primary')}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function MetasEnElRanking() {
  const [datos, setDatos] = useState<MetasDelMes | null>(null);
  useEffect(() => {
    let vivo = true;
    comercialApi
      .metas(mesDeHoy())
      .then((d) => vivo && setDatos(d))
      .catch(() => vivo && setDatos(null));
    return () => {
      vivo = false;
    };
  }, []);

  const conMeta = (datos?.asesores ?? []).filter((a) => a.meta);
  if (!datos || conMeta.length === 0) return null;

  return (
    <Appear>
      <section className="rounded-lg border border-border bg-surface p-4 space-y-3" data-testid="metas-en-el-ranking">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Target className="w-4 h-4 text-primary" aria-hidden="true" />
            Metas de {nombreDelMes(datos.mes).toLowerCase()}
          </h3>
          <Link href="/panel/inmobiliaria/pipeline/comisiones" className="text-caption text-primary hover:underline underline-offset-2">
            Ver comisiones y metas
          </Link>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {conMeta.map((a) => (
            <li key={a.userId} className="space-y-2" data-testid={`avance-${a.userId}`}>
              <p className="text-sm font-medium truncate">{a.nombre}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-caption text-fg-muted">
                    Cierres <span className="font-mono tabular-nums text-fg">{a.avance.cierres} de {a.meta!.cierres}</span>
                  </p>
                  <Barra hecho={a.avance.cierres} meta={a.meta!.cierres} />
                </div>
                <div className="space-y-1">
                  <p className="text-caption text-fg-muted">
                    Captaciones <span className="font-mono tabular-nums text-fg">{a.avance.captaciones} de {a.meta!.captaciones}</span>
                  </p>
                  <Barra hecho={a.avance.captaciones} meta={a.meta!.captaciones} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </Appear>
  );
}
