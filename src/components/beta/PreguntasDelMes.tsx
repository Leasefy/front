'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/lib/auth/use-auth';
import { PANTALLA_DE_LAS_RECARGAS, verBolsaDePreguntas, type BolsaDePreguntas } from '@/lib/api/recargas-de-preguntas.service';
import { cn } from '@/lib/utils';

const numero = (n: number) => n.toLocaleString('es-CO');

/**
 * «Llevan 40 de 50 preguntas este mes» (MODELO-DE-NEGOCIO.md §3.4: «todos ven cuánto llevan»). La cuenta gratis (Nico,
 * 30-10-2026: 5 preguntas de una vez, `periodo: 'siempre'`) dice «Te quedan 3 de tus 5 preguntas gratis» y, desde el
 * aviso, ofrece recargar o abrir todo. Sólo con el freno prendido en el micro (`prendida`); apagado o sin la ruta, no se
 * pinta nada. Se vuelve a leer al terminar cada turno. Recargar lo hace el administrador; los demás ven a quién
 * pedírselo.
 */
export function PreguntasDelMes({ ocupado = false }: { ocupado?: boolean }) {
  // Sin sesión (el compositor suelto, sus pruebas) no hay bolsa que mostrar: no revienta por el proveedor.
  let sesion: ReturnType<typeof useAuth> | null = null;
  try {
    sesion = useAuth();
  } catch {
    sesion = null;
  }
  const agency = sesion?.agency ?? null;
  const agencyRole = sesion?.agencyRole ?? null;
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
  // Las 5 de la cuenta gratis, sin recargas: se cuentan las que quedan (lo que importa con tan pocas).
  const gratis = bolsa.periodo === 'siempre';
  const texto = gratis
    ? bolsa.agotada
      ? 'Se acabaron tus preguntas gratis'
      : bolsa.recargas > 0
        ? `Te quedan ${numero(bolsa.disponibles)} de ${numero(total)} preguntas`
        : `Te ${bolsa.disponibles === 1 ? 'queda' : 'quedan'} ${numero(bolsa.disponibles)} de tus ${numero(total)} preguntas gratis`
    : bolsa.agotada
      ? 'Se acabaron las preguntas de este mes'
      : `Llevan ${numero(bolsa.usadas)} de ${numero(total)} preguntas este mes`;
  return (
    <p
      className={cn('mt-1.5 text-center text-caption tabular-nums', bolsa.aviso ? 'text-warning' : 'text-fg-subtle')}
      data-testid="preguntas-del-mes"
    >
      {texto}
      {bolsa.aviso ? (
        esAdmin ? (
          <>
            {' · '}
            {/* En otra pestaña: el chat no tiene salidas (comprar no le quita la conversación a nadie). */}
            <a href={PANTALLA_DE_LAS_RECARGAS} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline" data-testid="recargar-preguntas">
              {gratis ? 'Recargar o abrir todo' : 'Recargar'}
            </a>
          </>
        ) : (
          ' · pídele a tu administrador que recargue'
        )
      ) : null}
    </p>
  );
}
