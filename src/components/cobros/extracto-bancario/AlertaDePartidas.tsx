'use client';

/**
 * 🔴 LA ALERTA DE PARTIDAS PENDIENTES (Nico, P10, 03-10-2026): «alerta a los
 * 30 días» (configurable por inmobiliaria en Configuración → Costos de la plata),
 * con los rangos 0–30, 31–60 y más de 60. Es un aviso en el panel: nada de
 * correos. Sin nada viejo, no se pinta.
 */

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { WarningCircle } from '@phosphor-icons/react';
import { cierreDeConciliacionApi, type AlertaDePartidas as Alerta } from '@/lib/api/cierre-de-conciliacion';
import { useAparecer } from './cuentas-del-extracto';
import { pesos } from './cierre-del-mes';

export function AlertaDePartidas({ version = 0 }: { version?: number }) {
  const aparecer = useAparecer();
  const [alerta, setAlerta] = useState<Alerta | null>(null);

  useEffect(() => {
    let vivo = true;
    cierreDeConciliacionApi
      .alertas()
      .then((a) => vivo && setAlerta(a))
      // Una alerta que no se pudo leer no tapa la pantalla: simplemente no sale.
      .catch(() => vivo && setAlerta(null));
    return () => {
      vivo = false;
    };
  }, [version]);

  return (
    <AnimatePresence initial={false}>
      {alerta?.hayAlerta && (
        <motion.div
          key="alerta-de-partidas"
          {...aparecer}
          role="status"
          className="flex flex-col gap-2 rounded-lg border border-warning/40 bg-warning/10 p-4 sm:flex-row sm:items-start"
          data-testid="alerta-de-partidas"
        >
          <WarningCircle className="h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-body-sm font-medium text-fg">{alerta.frase}</p>
            <p className="text-caption text-fg-muted">
              {alerta.rangos.map((r) => `${r.nombre}: ${r.n} (${pesos(r.valorAbsolutoCop)})`).join(' · ')}
            </p>
            {alerta.porCuenta.filter((c) => c.vencidas > 0).length > 1 && (
              <p className="text-caption text-fg-muted">
                {alerta.porCuenta
                  .filter((c) => c.vencidas > 0)
                  .map((c) => `${c.nombre}: ${c.vencidas}`)
                  .join(' · ')}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
