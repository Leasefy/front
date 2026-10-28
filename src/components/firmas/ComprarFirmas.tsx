'use client';

/**
 * Comprar un paquete de firmas (Nico, 28-10-2026: 10 × $29.000, 50 × $119.000, 200 × $399.000; más IVA; 12 meses).
 * Se paga en Wompi y, al aprobarse, las firmas quedan en la bolsa.
 */

import { useState } from 'react';
import { RadioCard, RadioCardGroup } from '@leasefy/cadence';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { firmasApi, type DondeFirma, type PaqueteDeFirmasALaVenta } from '@/lib/api/firmas.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { pesos } from '@/lib/firmas/reglas-de-firmas';

export function ComprarFirmas({
  abierta,
  alCerrar,
  donde,
  aLaVenta,
  porDocumento,
}: {
  abierta: boolean;
  alCerrar: () => void;
  donde: DondeFirma;
  aLaVenta: PaqueteDeFirmasALaVenta[];
  porDocumento: number;
}) {
  const [firmas, setFirmas] = useState(String(aLaVenta[1]?.firmas ?? aLaVenta[0]?.firmas ?? 10));
  const [pagando, setPagando] = useState(false);
  const elegido = aLaVenta.find((p) => String(p.firmas) === firmas);

  const comprar = async () => {
    if (!elegido) return;
    setPagando(true);
    try {
      const r = await firmasApi(donde).comprar(elegido.firmas);
      window.location.assign(r.paymentUrl);
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: 'No pudimos abrir el pago. Intenta de nuevo.', accion: 'comprar el paquete' }));
      setPagando(false);
    }
  };

  return (
    <Dialog open={abierta} onOpenChange={(v) => !v && !pagando && alCerrar()}>
      <DialogContent size="md" data-testid="comprar-firmas">
        <DialogHeader>
          <DialogTitle>Comprar firmas</DialogTitle>
          <DialogDescription>Cada firma es un documento con todas sus personas (hasta 5). Duran 12 meses.</DialogDescription>
        </DialogHeader>
        <RadioCardGroup value={firmas} onValueChange={setFirmas} className="grid gap-2" aria-label="Paquete de firmas">
          {aLaVenta.map((p, i) => {
            const ahorro = Math.round((1 - p.porFirma / porDocumento) * 100);
            return (
              <RadioCard
                key={p.firmas}
                value={String(p.firmas)}
                label={`${p.firmas} firmas · ${pesos(p.precio)} + IVA`}
                description={`${pesos(p.porFirma)} por documento${ahorro > 0 ? `, ${ahorro} % menos que sueltas` : ''}. Total con IVA: ${pesos(p.total)}.`}
                badge={i === 1 ? 'El más pedido' : undefined}
                data-testid={`paquete-${p.firmas}`}
              />
            );
          })}
        </RadioCardGroup>
        <DialogFooter className="gap-2">
          <Button variant="ghost" hideArrow disabled={pagando} onClick={alCerrar}>
            Ahora no
          </Button>
          <Button hideArrow isLoading={pagando} disabled={!elegido} onClick={() => void comprar()} data-testid="pagar-paquete">
            Pagar {elegido ? pesos(elegido.total) : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
