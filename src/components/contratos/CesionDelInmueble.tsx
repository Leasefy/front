"use client";

/**
 * Cambiar de propietario: registrar el punto de quiebre del contrato.
 *
 * ── Por qué existe (auditoría del 2026-09-13, N4) ──────────────────────────
 *
 * Cuando el dueño de un inmueble arrendado vende, el arriendo NO se acaba: el
 * comprador entra en la posición del arrendador con el mismo inquilino, el
 * mismo canon y el mismo plazo. Lo único que cambia es a quién se le gira la
 * plata. No había cómo registrarlo, y cambiar el dueño en el mandato reescribía
 * el pasado: las liquidaciones viejas pasaban a ser del comprador.
 *
 * ── La fecha es lo importante, y por eso es el primer campo ─────────────────
 *
 * Lo anterior a esa fecha sigue siendo del vendedor y no se toca. El back
 * rechaza cualquier fecha que caiga sobre un período ya cobrado, y ese mensaje
 * se muestra tal cual: dice qué mes es el problema, que es lo que hace falta
 * para corregirlo.
 *
 * ── Un solo dueño nuevo ────────────────────────────────────────────────────
 *
 * DECISIÓN DE PRODUCTO (conservadora; se puede cambiar): esta pantalla cede al
 * 100 % a UNA persona, que es el caso real de una venta. El back acepta la
 * lista completa con porcentajes —una venta a dos hermanos es representable—,
 * así que abrirlo acá es agregar filas al formulario, no cambiar el modelo.
 */

import { useEffect, useState } from "react";
import { ArrowRightLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { SelectorDePropietario } from "@/components/contratos/SelectorDePropietario";
import { cicloDeVidaApi } from "@/lib/api/ciclo-de-vida.service";
import { propietariosApi } from "@/lib/api/inmobiliaria.service";
import { isPermissionError, mensajeDelFallo } from "@/lib/contratos/fallo-de-accion";
import type { Propietario } from "@/lib/types/inmobiliaria";

/** 100 % en puntos básicos, el mismo lenguaje del mandato. */
const BPS_TOTAL = 10000;

function hoyComoInput(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface CesionDelInmuebleProps {
  contractId: string;
  /** Quién figura hoy, para poder decir «de X a Y». */
  propietarioActual?: string | null;
  abierto: boolean;
  onCerrar: () => void;
  onRegistrada: () => void;
}

export function CesionDelInmueble({
  contractId,
  propietarioActual,
  abierto,
  onCerrar,
  onRegistrada,
}: CesionDelInmuebleProps) {
  const [propietarios, setPropietarios] = useState<Propietario[]>([]);
  const [nuevo, setNuevo] = useState<Propietario | null>(null);
  const [desde, setDesde] = useState(hoyComoInput);
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    propietariosApi
      .getAll({ limit: 500 })
      .then(setPropietarios)
      .catch(() => setPropietarios([]));
  }, [abierto]);

  async function confirmar() {
    if (!nuevo) return;
    setGuardando(true);
    try {
      const r = await cicloDeVidaApi.registrarCesion(contractId, {
        desde,
        nuevosPropietarios: [
          { propietarioId: nuevo.id, participacionBps: BPS_TOTAL },
        ],
        nota: nota.trim() || undefined,
      });
      toast.success(`Cesión registrada desde el ${r.desde}.`, {
        description: `${r.cuotasReapuntadas} período(s) quedaron a nombre de ${r.propietarioNuevo}. Lo anterior sigue siendo de ${r.propietarioAnterior ?? "el dueño anterior"}.`,
      });
      onCerrar();
      onRegistrada();
    } catch (err) {
      toast.error(
        isPermissionError(err)
          ? "No tienes permisos para registrar una cesión."
          : "No se pudo registrar la cesión.",
        {
          description: isPermissionError(err)
            ? undefined
            : mensajeDelFallo(err, "Intenta de nuevo."),
        },
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="sm:max-w-lg" data-testid="cesion-del-inmueble">
        <DialogHeader>
          {/*
            🔴 20-09 · «Cambiar de propietario», no «El propietario vendió el
            inmueble» (Juan Camilo, 16-09). El botón de la ficha ya decía lo
            correcto y el diálogo que abre seguía diciendo lo viejo: se clickea
            «Cambiar de propietario» y arriba aparece «vendió».
            No es sólo el nombre: el cambio de dueño también pasa por herencia,
            donación o por corregir a quién se le venía girando, y un título que
            habla de una venta hace dudar de si sirve para eso.
          */}
          <DialogTitle>Cambiar de propietario</DialogTitle>
          <DialogDescription>
            Por una venta, una herencia o una corrección. El contrato sigue con
            el mismo inquilino, el mismo canon y el mismo plazo. Desde la fecha
            que elijas, las liquidaciones y el estado de cuenta le corresponden
            al nuevo dueño; lo anterior no se reescribe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="desde">Desde qué día es del nuevo dueño</Label>
            <Input
              id="desde"
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              data-testid="cesion-desde"
            />
            <p className="text-xs text-muted-foreground">
              Tiene que ser posterior al último período ya cobrado.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Nuevo propietario</Label>
            {propietarioActual && (
              <p className="text-xs text-muted-foreground">
                Hoy figura {propietarioActual}.
              </p>
            )}
            <SelectorDePropietario
              propietarios={propietarios}
              actualId={nuevo?.id ?? null}
              onElegir={setNuevo}
              disabled={guardando}
              testId="cesion-propietario"
            />
            <p className="text-xs text-muted-foreground">
              Si el comprador todavía no tiene ficha, créala en Propietarios
              antes de registrar la cesión.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nota-cesion">Nota (opcional)</Label>
            <Textarea
              id="nota-cesion"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={2}
              data-testid="nota-de-cesion"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onCerrar} disabled={guardando}>
            Volver
          </Button>
          <Button
            onClick={confirmar}
            disabled={guardando || !nuevo || !desde}
            data-testid="confirmar-cesion"
          >
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            {guardando ? "Registrando…" : "Registrar la cesión"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
