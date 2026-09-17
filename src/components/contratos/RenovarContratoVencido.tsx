"use client";

/**
 * Contrato vencido con el inquilino todavía adentro (Nico, 17-09): NO hay
 * prórroga automática. Se ofrecen las dos salidas y decide el funcionario:
 * renovar por los días que ocupó de más (hasta el día de entrega, prorrateado)
 * o por el término inicial. La fecha del término la calcula el back
 * (`GET /contracts/vencidos`), no esta pantalla.
 */

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { cicloDeVidaApi, type ContratoVencido } from "@/lib/api/ciclo-de-vida.service";
import { mensajeDelFallo } from "@/lib/contratos/fallo-de-accion";

export function RenovarContratoVencido({
  contractId,
  onRenovado,
}: {
  contractId: string;
  onRenovado: () => void;
}) {
  const [vencido, setVencido] = useState<ContratoVencido | null>(null);
  const [hasta, setHasta] = useState("");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let vigente = true;
    cicloDeVidaApi
      .vencidos()
      .then((r) => {
        if (vigente) setVencido(r.contratos.find((c) => c.id === contractId) ?? null);
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [contractId]);

  if (!vencido) return null;

  const renovar = async (body: { modo: "DIAS_OCUPADOS" | "TERMINO_INICIAL"; hasta?: string }) => {
    setOcupado(true);
    try {
      const r = await cicloDeVidaApi.extender(contractId, body);
      toast.success(`Contrato renovado hasta el ${r.finNuevo}.`);
      setVencido(null);
      onRenovado();
    } catch (err) {
      toast.error("No se pudo renovar.", { description: mensajeDelFallo(err, "Intenta de nuevo.") });
    } finally {
      setOcupado(false);
    }
  };

  return (
    <section
      className="space-y-3 rounded-lg border border-plan-status-yellow/40 bg-plan-status-yellow/5 p-4 text-sm"
      data-testid="renovar-contrato-vencido"
    >
      <p>
        <strong>El contrato venció el {vencido.endDate}</strong> y el inquilino sigue adentro. No se
        prorroga solo: elige cómo renovarlo.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs" htmlFor="fecha-de-entrega">
          Día en que entrega
          <Input
            id="fecha-de-entrega"
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="mt-1"
          />
        </label>
        <Button
          size="sm"
          variant="outline"
          disabled={ocupado || !hasta}
          onClick={() => void renovar({ modo: "DIAS_OCUPADOS", hasta })}
        >
          Renovar por los días ocupados
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Los días de más se cobran con la regla del contrato: prorrateados sobre un mes de 30, o fecha a fecha.
      </p>
      {vencido.renovarPorTerminoInicialHasta && (
        <Button
          size="sm"
          disabled={ocupado}
          onClick={() => void renovar({ modo: "TERMINO_INICIAL" })}
        >
          Renovar por el término inicial (hasta el {vencido.renovarPorTerminoInicialHasta})
        </Button>
      )}
    </section>
  );
}
