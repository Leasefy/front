"use client";

/**
 * Contrato vencido con el inquilino todavía adentro Y aviso de NO renovación
 * (D5, Nico 17-09 ~03:10): no se prorroga; se ofrecen las dos salidas y decide
 * el funcionario: renovar por los días que ocupó de más (hasta el día de
 * entrega, prorrateado) o por el término inicial. Sin aviso, el contrato se
 * prorroga (lo dice `ProrrogaDelContrato`) y esta tarjeta no aparece.
 *
 * Las fechas las calcula el back (`GET /contracts/vencidos` y
 * `GET /contracts/:id/prorroga`), no esta pantalla.
 */

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { cicloDeVidaApi, type ContratoVencido } from "@/lib/api/ciclo-de-vida.service";
import { ErrorDelCampo } from "@/components/estado/ErrorDelCampo";
import { repartirErroresDelServidor } from "@/lib/errores/errores-en-el-formulario";
import { diaLegible } from '@/lib/mandato/textos';

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
  // Lo que el back rechace del día de entrega va debajo de ese campo.
  const [errorDelDia, setErrorDelDia] = useState<string | undefined>(undefined);

  useEffect(() => {
    let vigente = true;
    Promise.all([cicloDeVidaApi.vencidos(), cicloDeVidaApi.prorroga(contractId)])
      .then(([r, plan]) => {
        if (!vigente) return;
        // Sólo con aviso de no renovación: sin aviso, se prorroga (D5).
        const conAviso = plan.accion === 'ALERTA_AVISO_DE_NO_RENOVACION';
        setVencido(conAviso ? (r.contratos.find((c) => c.id === contractId) ?? null) : null);
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [contractId]);

  if (!vencido) return null;

  const renovar = async (body: { modo: "DIAS_OCUPADOS" | "TERMINO_INICIAL"; hasta?: string }) => {
    setOcupado(true);
    setErrorDelDia(undefined);
    try {
      const r = await cicloDeVidaApi.extender(contractId, body);
      toast.success(`Contrato renovado hasta el ${diaLegible(r.finNuevo)}.`);
      setVencido(null);
      onRenovado();
    } catch (err) {
      // Un 400 del día va bajo el día; un 409 (ya no está vencido), un 5xx con
      // su referencia o la red van al toast, por el traductor.
      const { porCampo, sueltos } = repartirErroresDelServidor(err, {
        campos: ["hasta"],
        porDefecto: "No pudimos renovar el contrato.",
        accion: "renovar el contrato",
      });
      if (porCampo.hasta) {
        setErrorDelDia(porCampo.hasta);
        document.getElementById("fecha-de-entrega")?.focus();
      }
      if (sueltos.length) toast.error("No se pudo renovar.", { description: sueltos.join(" · ") });
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
        <strong>El contrato venció el {diaLegible(vencido.endDate)}</strong> con aviso de no renovación y el inquilino
        sigue adentro. No se prorroga: elige cómo renovarlo, o termínalo.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-caption" htmlFor="fecha-de-entrega">
          Día en que entrega
          <Input
            id="fecha-de-entrega"
            type="date"
            value={hasta}
            onChange={(e) => {
              setHasta(e.target.value);
              setErrorDelDia(undefined);
            }}
            className="mt-1"
            aria-invalid={errorDelDia ? true : undefined}
            aria-describedby="fecha-de-entrega-error"
          />
          <ErrorDelCampo id="fecha-de-entrega-error" mensaje={errorDelDia} />
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
      <p className="text-caption text-muted-foreground">
        Los días de más se cobran con la regla del contrato: prorrateados sobre un mes de 30, o fecha a fecha.
      </p>
      {vencido.renovarPorTerminoInicialHasta && (
        <Button
          size="sm"
          disabled={ocupado}
          onClick={() => void renovar({ modo: "TERMINO_INICIAL" })}
        >
          Renovar por el término inicial (hasta el {diaLegible(vencido.renovarPorTerminoInicialHasta)})
        </Button>
      )}
    </section>
  );
}
