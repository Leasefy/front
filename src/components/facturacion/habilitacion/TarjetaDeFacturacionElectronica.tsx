'use client';

/**
 * La tarjeta fija de la barra lateral «Configura tu facturación electrónica» (Nico, 28-10-2026: «se le quede una de los
 * mismos modales de la sidebar pegado ahí con posibilidad de cerrar»). Misma lámina que el recordatorio de migración:
 * dibujo, avance por pasos, título, lo que sigue, «Seguir» y «Cerrar». Sale a la inmobiliaria que pagó y no ha
 * terminado (lo decide el back: `tarjeta.mostrar`); cerrada, vuelve a los 3 días. Sólo administrador y contador.
 */

import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ilustracion } from '@leasefy/cadence';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { AuthContext } from '@/lib/auth/auth-context';
import { habilitacionApi, type VistaDeLaHabilitacion } from '@/lib/api/habilitacion-de-facturacion.service';
import { cn } from '@/lib/utils';
import { PASOS_DE_LA_GUIA } from './pasos-de-la-guia';

export function TarjetaDeFacturacionElectronica() {
  const router = useRouter();
  const auth = useContext(AuthContext);
  const agencia = auth?.agency ?? null;
  const rol = auth?.agencyRole ?? null;
  const puede = rol === 'ADMIN' || rol === 'CONTADOR';
  const [vista, setVista] = useState<VistaDeLaHabilitacion | null>(null);
  const [cerrada, setCerrada] = useState(false);

  useEffect(() => {
    if (!puede) return;
    let vivo = true;
    habilitacionApi
      .vista()
      .then((v) => vivo && setVista(v))
      .catch(() => undefined); // Sin la ruta o sin permiso: no hay tarjeta, sin ruido.
    return () => {
      vivo = false;
    };
  }, [puede, agencia?.id]);

  if (!puede || !vista || cerrada || !vista.tarjeta.mostrar) return null;
  const { hechos, total } = vista.avance;
  const sigue = vista.siguiente ? PASOS_DE_LA_GUIA[vista.siguiente] : null;
  const esperando = vista.pasos.find((p) => p.clave === vista.siguiente)?.estado === 'esperando';

  const cerrar = async () => {
    setCerrada(true);
    try {
      await habilitacionApi.cerrarTarjeta();
      toast.success('La guardamos por ahora', {
        description: 'Vuelve en 3 días si no has terminado. La guía sigue en Facturación.',
      });
    } catch {
      setCerrada(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface" data-testid="sidebar-facturacion">
      <div className="flex items-center gap-3 px-3.5 pt-3">
        <Ilustracion nombre="factura" tamano={44} />
        <div className="min-w-0 flex-1">
          <div className="flex gap-[3px]" aria-hidden="true">
            {vista.pasos.map((p) => (
              <span
                key={p.clave}
                className={cn(
                  'h-1.5 flex-1 rounded-full',
                  p.estado === 'hecho' || p.estado === 'no-aplica' ? 'bg-primary' : p.clave === vista.siguiente ? 'bg-primary/25 ring-1 ring-inset ring-primary' : 'bg-surface-muted',
                )}
              />
            ))}
          </div>
          <p className="mt-1 font-mono text-caption tabular-nums text-fg-muted">
            {hechos} de {total}
          </p>
        </div>
      </div>
      <div className="px-3.5 pb-3 pt-2">
        <p className="text-body leading-snug text-fg">Configura tu facturación electrónica</p>
        <p className="mt-1 text-body-sm leading-snug text-fg-muted" data-testid="sidebar-facturacion-sigue">
          {esperando ? 'Feel está trabajando en lo tuyo. Te avisamos.' : sigue ? `Sigue: ${sigue.titulo.toLowerCase()}.` : 'Te llevamos paso a paso con la DIAN.'}
        </p>
      </div>
      <div className="flex flex-col gap-1 border-t border-border-faint p-2.5">
        <Button type="button" variant="outline" size="sm" hideArrow className="w-full" onClick={() => router.push('/panel/inmobiliaria/facturacion/activar')} data-testid="sidebar-facturacion-seguir">
          {hechos > 0 ? 'Seguir' : 'Empezar'}
        </Button>
        <Button type="button" variant="ghost" size="sm" hideArrow className="w-full text-fg-muted" onClick={() => void cerrar()} data-testid="sidebar-facturacion-cerrar">
          Cerrar
        </Button>
      </div>
    </div>
  );
}
