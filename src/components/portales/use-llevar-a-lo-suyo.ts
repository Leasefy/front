'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useEsPropietarioDeInmobiliaria } from '@/lib/context/PropietarioDeInmobiliariaContext';

/**
 * Ronda 28 (revisora r27, «las tres pantallas puente»): Elegir inquilino, Mi plata
 * y Novedades son del propietario al que una inmobiliaria le administra los
 * inmuebles. Al independiente le decían sólo «esto está en otra parte», y en dos
 * casos la pestaña encendida YA era esa otra parte. Ahora lo llevan directo a lo
 * suyo (Candidatos, Arriendos, Solicitudes), sin la pantalla de paso.
 *
 * Sólo cuando se sabe que es independiente: mientras el layout averigua si tiene
 * inmobiliaria, el contexto dice que sí y no se mueve a nadie.
 *
 * @returns si lo está llevando (la página pinta su esqueleto mientras tanto).
 */
export function useLlevarALoSuyo(sinEstaPantalla: boolean, destino: string): boolean {
  const deInmobiliaria = useEsPropietarioDeInmobiliaria();
  const router = useRouter();
  const lleva = sinEstaPantalla && !deInmobiliaria;
  useEffect(() => {
    if (lleva) router.replace(destino);
  }, [lleva, destino, router]);
  return lleva;
}
