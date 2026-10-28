'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { useAuth } from '@/lib/auth/use-auth';
import { PANTALLA_DE_LAS_RECARGAS, verBolsaDePreguntas, type BolsaDePreguntas } from '@/lib/api/recargas-de-preguntas.service';
import { cn } from '@/lib/utils';

const numero = (n: number) => n.toLocaleString('es-CO');

/**
 * «Llevan 40 de 50 preguntas este mes» (MODELO-DE-NEGOCIO.md §3.4: «todos ven cuánto llevan»). Sólo con el freno
 * prendido en el micro (`prendida`); apagado o sin la ruta, no se pinta nada. Se vuelve a leer al terminar cada turno.
 * Recargar lo hace el administrador; los demás ven a quién pedírselo.
 */
export function PreguntasDelMes({ ocupado = false }: { ocupado?: boolean }) {
  const { agency, agencyRole } = useAuth();
  const [bolsa, setBolsa] = useState<BolsaDePreguntas | null>(null);
  const agencyId = agency?.id ?? null;

  useEffect(() => {
    if (!agencyId || ocupado) return;
    let vivo = true;
    void verBolsaDePreguntas(agencyId).then((b) => {
      if (vivo) setBolsa(b);
    });
    return () => {
      vivo = false;
    };
  }, [agencyId, ocupado]);

  if (!bolsa?.prendida) return null;
  const total = bolsa.incluidas + bolsa.recargas;
  const esAdmin = agencyRole === 'ADMIN';
  return (
    <p
      className={cn('mt-1.5 text-center text-caption tabular-nums', bolsa.aviso ? 'text-warning' : 'text-fg-subtle')}
      data-testid="preguntas-del-mes"
    >
      {bolsa.agotada ? 'Se acabaron las preguntas de este mes' : `Llevan ${numero(bolsa.usadas)} de ${numero(total)} preguntas este mes`}
      {bolsa.aviso ? (
        esAdmin ? (
          <>
            {' · '}
            <Link href={PANTALLA_DE_LAS_RECARGAS} className="font-medium text-primary hover:underline" data-testid="recargar-preguntas">
              Recargar
            </Link>
          </>
        ) : (
          ' · pídele a tu administrador que recargue'
        )
      ) : null}
    </p>
  );
}
