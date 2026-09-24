"use client";

/**
 * Terminar un arriendo antes de tiempo.
 *
 * ── Por qué existe (auditoría del 2026-09-13, N1 · P0 y C8) ────────────────
 *
 * Un contrato vigente no tenía NINGUNA acción: `ActionPanel` devolvía `null`
 * en `active` («no hay nada que hacer») y `cancelar` no sirve — el back sólo
 * admite cancelar hasta la firma. La única forma de cerrar un arriendo que se
 * rompe antes de tiempo era borrar cosas o esperar el vencimiento.
 *
 * ── Por qué NO es un botón a un clic ───────────────────────────────────────
 *
 * La misma auditoría marcó como P1 que las acciones destructivas de este panel
 * se disparan sin decir qué se llevan por delante (C11, C12, M5). Terminar un
 * arriendo corta los cobros del mes siguiente y libera el inmueble: acá se
 * pide fecha y motivo, y ANTES de confirmar se muestra lo que va a quedar
 * cobrado del último mes, calculado por el back con la misma cuenta con la que
 * después lo va a cobrar. La persona ve el número, no se lo imagina.
 */

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CalendarX } from "lucide-react";

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
import {
  cicloDeVidaApi,
  type MotivoDeTerminacion,
  type VistaPreviaDeTerminacion,
} from "@/lib/api/ciclo-de-vida.service";
import { isPermissionError, mensajeDelFallo } from "@/lib/contratos/fallo-de-accion";

/** `2026-09-15` — hoy, como lo espera un `<input type="date">`. */
function hoyComoInput(): string {
  return new Date().toISOString().slice(0, 10);
}

const PESOS = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export interface TerminarContratoProps {
  contractId: string;
  abierto: boolean;
  onCerrar: () => void;
  /** Se llama con la terminación ya hecha, para recargar la ficha. */
  onTerminado: () => void;
}

export function TerminarContrato({
  contractId,
  abierto,
  onCerrar,
  onTerminado,
}: TerminarContratoProps) {
  const [motivos, setMotivos] = useState<MotivoDeTerminacion[]>([]);
  const [terminadoEn, setTerminadoEn] = useState(hoyComoInput);
  const [motivo, setMotivo] = useState("");
  const [nota, setNota] = useState("");
  /** La penalidad pactada, sólo dígitos. Vacío = no hay. */
  const [penalidad, setPenalidad] = useState("");
  /** Reparto negociado (17-09): la parte de la penalidad para la inmobiliaria. */
  const [paraLaInmobiliaria, setParaLaInmobiliaria] = useState("");
  const [penalidadTocada, setPenalidadTocada] = useState(false);
  const [vista, setVista] = useState<VistaPreviaDeTerminacion | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    cicloDeVidaApi
      .motivosDeTerminacion()
      .then((r) => setMotivos(r.motivos))
      .catch(() => setMotivos([]));
  }, [abierto]);

  /*
   * La vista previa se pide al back y NO se calcula acá: el prorrateo del
   * último mes es la misma cuenta con la que después se va a cobrar, y dos
   * implementaciones de la misma cuenta terminan dando números distintos en
   * la pantalla y en la factura.
   */
  const pedirVistaPrevia = useCallback(
    async (fecha: string) => {
      if (!fecha) return;
      try {
        setVista(await cicloDeVidaApi.vistaPreviaDeTerminacion(contractId, fecha));
      } catch {
        // Que la vista previa no cargue no puede tapar el formulario: el back
        // vuelve a validar al confirmar y ahí sí dice qué pasa.
        setVista(null);
      }
    },
    [contractId],
  );

  useEffect(() => {
    if (abierto) void pedirVistaPrevia(terminadoEn);
  }, [abierto, terminadoEn, pedirVistaPrevia]);

  // La penalidad por defecto (cánones del contrato o de la inmobiliaria) se
  // prellena una vez; la persona la puede cambiar o borrar (17-09).
  useEffect(() => {
    const sugerida = vista?.penalidadSugerida;
    if (sugerida && !penalidadTocada) setPenalidad(String(sugerida.valorCop));
  }, [vista?.penalidadSugerida, penalidadTocada]);

  const elegido = motivos.find((m) => m.codigo === motivo);
  const faltaNota = elegido?.exigeNota === true && nota.trim().length === 0;
  const penalidadCop = penalidad.trim() === "" ? null : Number(penalidad.replace(/\D/g, ""));
  const paraLaInmobiliariaCop =
    paraLaInmobiliaria.trim() === "" ? 0 : Number(paraLaInmobiliaria.replace(/\D/g, ""));
  const repartoInvalido = penalidadCop !== null && paraLaInmobiliariaCop > penalidadCop;
  const penalidadInvalida = penalidadCop !== null && !(penalidadCop > 0);
  const puedeConfirmar =
    !guardando && !!terminadoEn && !!motivo && !faltaNota && !penalidadInvalida && !repartoInvalido && vista?.puedeTerminarse !== false;

  async function confirmar() {
    setGuardando(true);
    try {
      const r = await cicloDeVidaApi.terminar(contractId, {
        terminadoEn,
        motivo,
        nota: nota.trim() || undefined,
        // Explícito siempre: vacío = sin penalidad (el back aplicaría la por defecto si faltara).
        penalidadCop,
        ...(penalidadCop !== null && paraLaInmobiliariaCop > 0
          ? { penalidadParaLaInmobiliariaCop: paraLaInmobiliariaCop }
          : {}),
      });
      toast.success(`Contrato terminado el ${r.terminadoEn}.`, {
        description: r.inmuebleLiberado
          ? "El inmueble volvió a quedar disponible y no se le generan más cobros."
          : "No se le generan más cobros. El inmueble sigue ocupado por otro contrato.",
      });
      onCerrar();
      onTerminado();
    } catch (err) {
      toast.error(
        isPermissionError(err)
          ? "No tienes permisos para terminar contratos."
          : "No se pudo terminar el contrato.",
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
      <DialogContent className="sm:max-w-lg" data-testid="terminar-contrato">
        <DialogHeader>
          <DialogTitle>Terminar el arriendo antes de tiempo</DialogTitle>
          <DialogDescription>
            El contrato queda terminado con su fecha y su motivo. Lo ya cobrado
            o pagado no se toca, no se le generan cobros nuevos y el inmueble
            vuelve a quedar disponible. El mandato del propietario sigue activo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="terminadoEn">Fecha de terminación</Label>
            <Input
              id="terminadoEn"
              type="date"
              value={terminadoEn}
              onChange={(e) => setTerminadoEn(e.target.value)}
              data-testid="terminado-en"
            />
            {vista?.finPactado && (
              <p className="text-caption text-muted-foreground">
                Se había pactado hasta el {vista.finPactado}. Ese plazo queda
                guardado.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="motivo">Motivo</Label>
            <select
              id="motivo"
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              data-testid="motivo-de-terminacion"
            >
              <option value="">Elige un motivo…</option>
              {motivos.map((m) => (
                <option key={m.codigo} value={m.codigo}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nota">
              {elegido?.exigeNota ? "Cuál (obligatorio)" : "Nota (opcional)"}
            </Label>
            <Textarea
              id="nota"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={2}
              data-testid="nota-de-terminacion"
            />
          </div>

          {/* Regla 9 (16-09): la penalidad pactada entra como un cobro más, en la cuota del último mes. */}
          <div className="space-y-1.5">
            <Label htmlFor="penalidad">Penalidad pactada (opcional)</Label>
            <Input
              id="penalidad"
              inputMode="numeric"
              placeholder="$ 0"
              value={penalidad}
              onChange={(e) => {
                setPenalidadTocada(true);
                setPenalidad(e.target.value.replace(/[^\d]/g, ""));
              }}
              data-testid="penalidad-de-terminacion"
            />
            <p className="text-caption text-muted-foreground">
              {penalidadInvalida
                ? "La penalidad tiene que ser mayor que cero."
                : penalidadCop
                  ? `Se le cobra al inquilino ${PESOS.format(penalidadCop)} una sola vez, en la cuota del último mes.`
                  : "Si el contrato pacta una penalidad por terminar antes, se le cobra al inquilino una sola vez, en la cuota del último mes."}
              {vista?.penalidadSugerida &&
                ` Por defecto: ${vista.penalidadSugerida.canones} cánones.`}
              {penalidadCop ? " Le llega al propietario menos la comisión." : ""}
            </p>
          </div>
          {penalidadCop ? (
            <div className="space-y-1.5">
              <Label htmlFor="penalidad-inmobiliaria">Parte para la inmobiliaria (reparto negociado, opcional)</Label>
              <Input
                id="penalidad-inmobiliaria"
                inputMode="numeric"
                placeholder="$ 0"
                value={paraLaInmobiliaria}
                onChange={(e) => setParaLaInmobiliaria(e.target.value.replace(/[^\d]/g, ""))}
                data-testid="penalidad-para-la-inmobiliaria"
              />
              <p className="text-caption text-muted-foreground">
                {repartoInvalido
                  ? "La parte de la inmobiliaria no puede ser mayor que la penalidad."
                  : `Al propietario le llegan ${PESOS.format(Math.max(0, penalidadCop - paraLaInmobiliariaCop))} menos la comisión.`}
              </p>
            </div>
          ) : null}

          {/* Lo que va a quedar cobrado. El número, antes de confirmar. */}
          {vista?.prorrateoDelUltimoMes && (
            <div
              className="rounded-md bg-muted p-3 text-sm"
              data-testid="prorrateo-del-ultimo-mes"
            >
              <p className="font-medium">Último mes ({vista.prorrateoDelUltimoMes.mes})</p>
              <p className="text-muted-foreground">
                {/* Mes comercial de 30 (16-09): «20 días de 30». Fecha a fecha, el período completo. */}
                {vista.prorrateoDelUltimoMes.diasOcupados >= vista.prorrateoDelUltimoMes.diasDelMes
                  ? "Se cobra el período completo: "
                  : `Se cobran ${vista.prorrateoDelUltimoMes.diasOcupados} días de ${vista.prorrateoDelUltimoMes.diasDelMes}: `}
                <strong className="text-foreground">
                  {PESOS.format(vista.prorrateoDelUltimoMes.valorCop)}
                </strong>{" "}
                de {PESOS.format(vista.prorrateoDelUltimoMes.canonMensualCop)}.
              </p>
              {vista.prorrateoDelUltimoMes.ultimoDiaCobrado && (
                /*
                 * 🔴 La fecha del acta es LITERAL (Nico, 17-09, segunda vuelta):
                 * «si el acta dice que entrega el 5, se cobra hasta el 5
                 * inclusive». D8 —terminar un día antes— es la regla del
                 * TÉRMINO del contrato, no la de la entrega.
                 */
                <p className="mt-1 text-caption text-muted-foreground" data-testid="ultimo-dia-cobrado">
                  Se cobra hasta el {vista.prorrateoDelUltimoMes.ultimoDiaCobrado} inclusive: la fecha del acta se
                  cobra completa, porque ese día ocupó el inmueble.
                </p>
              )}
            </div>
          )}
          {vista?.garantiaDeServiciosPendiente && (
            <p
              className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              data-testid="garantia-de-servicios-pendiente"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {vista.garantiaDeServiciosPendiente}
            </p>
          )}
          {vista && !vista.prorrateoDelUltimoMes && vista.puedeTerminarse && (
            <p className="text-sm text-muted-foreground" data-testid="sin-prorrateo">
              Este contrato no tiene canon cargado, así que no se puede calcular
              qué paga el último mes.
            </p>
          )}

          {vista?.razon && (
            <p
              className="flex items-start gap-2 text-sm text-plan-status-yellow"
              data-testid="razon-para-no-terminar"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {vista.razon}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onCerrar} disabled={guardando}>
            Volver
          </Button>
          <Button
            variant="destructive"
            onClick={confirmar}
            disabled={!puedeConfirmar}
            data-testid="confirmar-terminacion"
          >
            <CalendarX className="mr-2 h-4 w-4" />
            {guardando ? "Terminando…" : "Terminar el arriendo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
