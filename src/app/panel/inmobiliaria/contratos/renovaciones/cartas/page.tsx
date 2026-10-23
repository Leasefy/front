'use client';

/**
 * La cola de cartas del incremento se volvió «Incrementos» (Portofino,
 * 22-10-2026): los enlaces viejos (correos, marcadores, la loseta de antes)
 * llegan allá con su `?estado=`, en «lo de ahora» (lo que contaba la cola).
 */

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { RUTA_DE_LAS_CARTAS } from '@/components/contratos/BandejaDeCartasDelIncremento';

function Redirigir() {
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    const destino = new URLSearchParams({ mes: 'proximos' });
    const estado = params?.get('estado');
    if (estado) destino.set('estado', estado);
    router.replace(`${RUTA_DE_LAS_CARTAS}?${destino.toString()}`);
  }, [router, params]);
  return null;
}

export default function CartasDelIncrementoPage() {
  return (
    <Suspense>
      <Redirigir />
    </Suspense>
  );
}
