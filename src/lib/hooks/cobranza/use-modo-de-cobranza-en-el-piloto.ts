'use client';

/**
 * ¿La cobranza sigue el modo que la inmobiliaria eligió en el Piloto? (QA-IA-95, 05-10-2026)
 *
 * Cobranza › Configuración tiene su propio «nivel de autonomía» de cuatro
 * peldaños (`AgencyPolicy.autonomyLevel`). El micro sólo lo usa cuando NO hay
 * fila del Piloto para la cobranza (`piloto/autonomia.ts → modoEfectivo`): en
 * cuanto alguien elige Manual / Copiloto / Automático en Inicio › Autonomía,
 * ese modo manda y el nivel de cuatro peldaños deja de decidir nada. La
 * pantalla seguía ofreciendo cambiarlo como si decidiera.
 *
 * Devuelve el modo del Piloto SÓLO si es de una elección (`origen: 'piloto'`);
 * `null` mientras carga, si falla o si la cobranza todavía sigue el nivel (y
 * entonces la pantalla queda como siempre). Fuera del proveedor de sesión
 * (pruebas viejas, previsualizaciones) no pregunta nada.
 */

import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '@/lib/auth/auth-context';
import { fetchPilotoFlota, type AutonomiaModo } from '@/lib/api/piloto';

export function useModoDeCobranzaEnElPiloto(): AutonomiaModo | null {
  const agencyId = useContext(AuthContext)?.agency?.id ?? null;
  const [modo, setModo] = useState<AutonomiaModo | null>(null);
  useEffect(() => {
    if (!agencyId || !process.env.NEXT_PUBLIC_AGENT_URL) return;
    const controller = new AbortController();
    fetchPilotoFlota(agencyId, controller.signal)
      .then((r) => {
        const cobranza = r.data?.agentes.find((a) => a.agente === 'cobranza');
        setModo(cobranza && cobranza.origen === 'piloto' ? cobranza.modo : null);
      })
      .catch(() => setModo(null));
    return () => controller.abort();
  }, [agencyId]);
  return modo;
}

/** El nombre del modo como lo dice el Piloto. */
export const NOMBRE_DEL_MODO: Record<AutonomiaModo, string> = {
  sombra: 'Manual',
  copiloto: 'Copiloto',
  autonomo: 'Automático',
};
