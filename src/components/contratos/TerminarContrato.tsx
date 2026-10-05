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
import { CalendarX, Warning } from "@phosphor-icons/react";

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
import { penalidadSegunElMotivo } from "@/lib/contratos/penalidad-segun-el-motivo";
import { isPermissionError } from "@/lib/contratos/fallo-de-accion";
import { ErrorDelCampo } from "@/components/estado/ErrorDelCampo";
import { repartirErroresDelServidor } from "@/lib/errores/errores-en-el-formulario";
import { MENSAJES_DEL_CONTRATO_VIGENTE, topeDePesos } from "@/lib/contratos/limites-del-contrato-vigente";
// QA-CONT C-10: las fechas con la fecha larga de la casa, nunca el ISO crudo.
import { diaLegible, mesLegible } from "@/lib/mandato/textos";
import { hoyEnColombia } from "@/lib/fechas/fecha-de-la-casa";
import { plataEnPantalla } from "@/lib/plata/escribir-plata";

/** `2026-09-15` — hoy, como lo espera un `<input type="date">`. */
function hoyComoInput(): string {
  // QA-CONT-95: hoy EN COLOMBIA. `toISOString()` es UTC: desde las 7 p. m. de
  // Bogotá ya daba mañana y la fecha precargada quedaba un día corrida.
  return hoyEnColombia();
}

const PESOS = plataEnPantalla("es-CO", {
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

/** Los campos de `TerminarContratoDto`, con el id del control que los pinta. */
type CampoDeLaTerminacion =
  | "terminadoEn"
  | "motivo"
  | "nota"
  | "penalidadCop"
  | "penalidadParaLaInmobiliariaCop";
const CAMPOS_DE_LA_TERMINACION: readonly CampoDeLaTerminacion[] = [
  "terminadoEn",
  "motivo",
  "nota",
  "penalidadCop",
  "penalidadParaLaInmobiliariaCop",
];
const ID_DEL_CAMPO: Record<CampoDeLaTerminacion, string> = {
  terminadoEn: "terminadoEn",
  motivo: "motivo",
  nota: "nota",
  penalidadCop: "penalidad",
  penalidadParaLaInmobiliariaCop: "penalidad-inmobiliaria",
};

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
  // Lo que el back rechazó de un campo va debajo de ESE campo.
  const [errores, setErrores] = useState<Partial<Record<CampoDeLaTerminacion, string>>>({});
  const limpiar = (campo: CampoDeLaTerminacion) =>
    setErrores((prev) => (prev[campo] ? { ...prev, [campo]: undefined } : prev));

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

  const elegido = motivos.find((m) => m.codigo === motivo);
  /*
   * 🔴 QA-CONT-95 (CR-10 · A-08, CEO 18-09): el motivo decide la penalidad. Con
   * venta o incumplimiento del arrendador NO se le cobra al inquilino (el campo
   * se apaga y lo dice); con mutuo acuerdo o fuerza mayor, sólo si se escribe;
   * con los demás, la por defecto. Antes se prellenaba siempre y el back
   * respondía 400 al confirmar.
   */
  const reglaDeLaPenalidad = motivo ? penalidadSegunElMotivo(elegido ?? { codigo: motivo }) : 'POR_DEFECTO';
  const sinPenalidadPorElMotivo = reglaDeLaPenalidad === 'NO_APLICA';

  // La penalidad por defecto (cánones del contrato o de la inmobiliaria) se
  // prellena —sólo con los motivos que la llevan—; la persona la puede cambiar
  // o borrar (17-09).
  useEffect(() => {
    if (penalidadTocada) return;
    const sugerida = vista?.penalidadSugerida;
    setPenalidad(reglaDeLaPenalidad === 'POR_DEFECTO' && sugerida ? String(sugerida.valorCop) : "");
  }, [vista?.penalidadSugerida, penalidadTocada, reglaDeLaPenalidad]);
  useEffect(() => {
    if (sinPenalidadPorElMotivo) {
      setPenalidad("");
      setParaLaInmobiliaria("");
    }
  }, [sinPenalidadPorElMotivo]);

  const faltaNota = elegido?.exigeNota === true && nota.trim().length === 0;
  const penalidadCop = penalidad.trim() === "" ? null : Number(penalidad.replace(/\D/g, ""));
  const paraLaInmobiliariaCop =
    paraLaInmobiliaria.trim() === "" ? 0 : Number(paraLaInmobiliaria.replace(/\D/g, ""));
  const repartoInvalido = penalidadCop !== null && paraLaInmobiliariaCop > penalidadCop;
  const penalidadInvalida = penalidadCop !== null && !(penalidadCop > 0);
  // El tope de la columna (`ConceptoDeUnaVez.valorCop`), con la frase del back.
  const topeDeLaPenalidad = topeDePesos(penalidadCop, MENSAJES_DEL_CONTRATO_VIGENTE.penalidadMaxima);
  const topeDeLaParte = topeDePesos(
    paraLaInmobiliariaCop,
    MENSAJES_DEL_CONTRATO_VIGENTE.penalidadParaLaInmobiliariaMaxima,
  );
  // 🔴 El tope de NEGOCIO lo define cada inmobiliaria (Nico, 02-10-2026): N
  // cánones del contrato o de la configuración. La frase es la del back (la
  // misma del 400 `PENALIDAD_SOBRE_EL_TOPE`), así que no hay dos redacciones.
  const topeDeLaInmobiliaria = vista?.penalidadMaxima ?? null;
  const sobreElTopeDeLaInmobiliaria =
    penalidadCop !== null && topeDeLaInmobiliaria !== null && penalidadCop > topeDeLaInmobiliaria.valorCop
      ? topeDeLaInmobiliaria.mensaje
      : null;
  const errorDeLaPenalidad = penalidadInvalida
    ? "La penalidad tiene que ser mayor que cero."
    : (topeDeLaPenalidad ?? sobreElTopeDeLaInmobiliaria ?? errores.penalidadCop);
  const errorDeLaParte = repartoInvalido
    ? "La parte de la inmobiliaria no puede ser mayor que la penalidad."
    : (topeDeLaParte ?? errores.penalidadParaLaInmobiliariaCop);
  const puedeConfirmar =
    !guardando &&
    !!terminadoEn &&
    !!motivo &&
    !faltaNota &&
    !penalidadInvalida &&
    !repartoInvalido &&
    !topeDeLaPenalidad &&
    !sobreElTopeDeLaInmobiliaria &&
    !topeDeLaParte &&
    vista?.puedeTerminarse !== false;

  async function confirmar() {
    setGuardando(true);
    setErrores({});
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
      toast.success(`Contrato terminado el ${diaLegible(r.terminadoEn)}.`, {
        description: r.inmuebleLiberado
          ? "El inmueble volvió a quedar disponible y no se le generan más cobros."
          : "No se le generan más cobros. El inmueble sigue ocupado por otro contrato.",
      });
      onCerrar();
      onTerminado();
    } catch (err) {
      if (isPermissionError(err)) {
        toast.error("No tienes permisos para terminar contratos.");
        return;
      }
      // Un 400 con `campos` va bajo su campo; lo demás (un 409, un 5xx con su
      // referencia, la red) al toast, por el traductor.
      const { porCampo, orden, sueltos } = repartirErroresDelServidor(err, {
        campos: CAMPOS_DE_LA_TERMINACION,
        porDefecto: "No pudimos terminar el contrato.",
        accion: "terminar el contrato",
      });
      setErrores(porCampo);
      const primero = orden[0];
      if (primero) document.getElementById(ID_DEL_CAMPO[primero])?.focus();
      if (sueltos.length) toast.error("No se pudo terminar el contrato.", { description: sueltos.join(" · ") });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && !guardando && onCerrar()}>
      <DialogContent
        variant="destructive"
        icon={<CalendarX weight="bold" />}
        size="md"
        data-testid="terminar-contrato"
      >
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
              onChange={(e) => {
                setTerminadoEn(e.target.value);
                limpiar("terminadoEn");
              }}
              data-testid="terminado-en"
              aria-invalid={errores.terminadoEn ? true : undefined}
              invalid={!!errores.terminadoEn}
              aria-describedby="terminadoEn-error"
            />
            <ErrorDelCampo id="terminadoEn-error" mensaje={errores.terminadoEn} className="mt-0" />
            {vista?.finPactado && (
              <p className="text-caption text-muted-foreground">
                Se había pactado hasta el {diaLegible(vista.finPactado)}. Ese plazo queda
                guardado.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="motivo">Motivo</Label>
            <select
              id="motivo"
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm aria-[invalid=true]:border-danger"
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                limpiar("motivo");
              }}
              data-testid="motivo-de-terminacion"
              aria-invalid={errores.motivo ? true : undefined}
              aria-describedby="motivo-error"
            >
              <option value="">Elige un motivo…</option>
              {motivos.map((m) => (
                <option key={m.codigo} value={m.codigo}>
                  {m.nombre}
                </option>
              ))}
            </select>
            <ErrorDelCampo id="motivo-error" mensaje={errores.motivo} className="mt-0" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nota">
              {elegido?.exigeNota ? "Cuál (obligatorio)" : "Nota (opcional)"}
            </Label>
            <Textarea
              id="nota"
              value={nota}
              maxLength={1000}
              onChange={(e) => {
                setNota(e.target.value);
                limpiar("nota");
              }}
              rows={2}
              data-testid="nota-de-terminacion"
              aria-invalid={errores.nota ? true : undefined}
              aria-describedby="nota-error"
            />
            <ErrorDelCampo id="nota-error" mensaje={errores.nota} className="mt-0" />
          </div>

          {/* Regla 9 (16-09): la penalidad pactada entra como un cobro más, en la cuota del último mes. */}
          <div className="space-y-1.5">
            <Label htmlFor="penalidad">Penalidad pactada (opcional)</Label>
            <Input
              id="penalidad"
              inputMode="numeric"
              placeholder="$ 0"
              value={penalidad}
              disabled={sinPenalidadPorElMotivo}
              onChange={(e) => {
                setPenalidadTocada(true);
                setPenalidad(e.target.value.replace(/[^\d]/g, ""));
                limpiar("penalidadCop");
              }}
              data-testid="penalidad-de-terminacion"
              aria-invalid={errorDeLaPenalidad ? true : undefined}
              // 🔴 03-10 (pruebas en el navegador): el borde rojo del DS sale de
              // `invalid`; con sólo `aria-invalid` el campo pasado del tope se veía
              // igual que uno bueno (lo mismo en la fecha y en la parte).
              invalid={!!errorDeLaPenalidad}
              aria-describedby="penalidad-error"
            />
            {/* La ayuda y el error se cruzan: nunca los dos a la vez. */}
            <ErrorDelCampo
              id="penalidad-error"
              mensaje={errorDeLaPenalidad}
              className="mt-0"
              pista={
                sinPenalidadPorElMotivo ? (
                  <span data-testid="penalidad-no-aplica">
                    Con el motivo «{elegido?.nombre ?? "elegido"}» no se le cobra penalidad al inquilino: la indemnización es del propietario.
                  </span>
                ) : <>
                  {penalidadCop
                    ? `Se le cobra al inquilino ${PESOS.format(penalidadCop)} una sola vez, en la cuota del último mes.`
                    : "Si el contrato pacta una penalidad por terminar antes, se le cobra al inquilino una sola vez, en la cuota del último mes."}
                  {topeDeLaInmobiliaria
                    ? ` ${topeDeLaInmobiliaria.descripcion}`
                    : vista?.penalidadSugerida &&
                      ` Por defecto: ${vista.penalidadSugerida.canones} cánones.`}
                  {penalidadCop ? " Le llega al propietario menos la comisión." : ""}
                </>
              }
            />
          </div>
          {penalidadCop ? (
            <div className="space-y-1.5">
              <Label htmlFor="penalidad-inmobiliaria">Parte para la inmobiliaria (reparto negociado, opcional)</Label>
              <Input
                id="penalidad-inmobiliaria"
                inputMode="numeric"
                placeholder="$ 0"
                value={paraLaInmobiliaria}
                onChange={(e) => {
                  setParaLaInmobiliaria(e.target.value.replace(/[^\d]/g, ""));
                  limpiar("penalidadParaLaInmobiliariaCop");
                }}
                data-testid="penalidad-para-la-inmobiliaria"
                aria-invalid={errorDeLaParte ? true : undefined}
                invalid={!!errorDeLaParte}
                aria-describedby="penalidad-inmobiliaria-error"
              />
              <ErrorDelCampo
                id="penalidad-inmobiliaria-error"
                mensaje={errorDeLaParte}
                className="mt-0"
                pista={`Al propietario le llegan ${PESOS.format(Math.max(0, penalidadCop - paraLaInmobiliariaCop))} menos la comisión.`}
              />
            </div>
          ) : null}

          {/* Lo que va a quedar cobrado. El número, antes de confirmar. */}
          {vista?.prorrateoDelUltimoMes && (
            <div
              className="rounded-[14px] border border-border p-3 text-sm"
              data-testid="prorrateo-del-ultimo-mes"
            >
              <p className="font-medium">Último mes ({mesLegible(vista.prorrateoDelUltimoMes.mes)})</p>
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
                  Se cobra hasta el {diaLegible(vista.prorrateoDelUltimoMes.ultimoDiaCobrado)} inclusive: la fecha del acta se
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
              <Warning className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {vista.garantiaDeServiciosPendiente}
            </p>
          )}
          {vista && !vista.prorrateoDelUltimoMes && vista.puedeTerminarse && (
            <p className="text-sm text-muted-foreground" data-testid="sin-prorrateo">
              Este contrato no tiene canon cargado, así que no se puede calcular
              qué paga el último mes.
            </p>
          )}

          {vista?.razon && vista.razon !== vista.garantiaDeServiciosPendiente && (
            <p
              className="flex items-start gap-2 text-sm text-plan-status-yellow"
              data-testid="razon-para-no-terminar"
            >
              <Warning className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {vista.razon}
            </p>
          )}
        </div>

        <DialogFooter>
          {/* QA-CONT-95: el porqué del botón apagado, junto al botón (antes
              quedaba al final del cuerpo, fuera de la vista). */}
          {vista?.puedeTerminarse === false && vista.razon && (
            <p className="mr-auto self-center text-caption text-plan-status-yellow" data-testid="por-que-no-se-puede-terminar">
              {vista.razon}
            </p>
          )}
          <Button variant="outline" hideArrow onClick={onCerrar} disabled={guardando}>
            Volver
          </Button>
          <Button
            variant="destructive"
            hideArrow
            onClick={confirmar}
            disabled={!puedeConfirmar}
            isLoading={guardando}
            data-testid="confirmar-terminacion"
          >
            {guardando ? "Terminando…" : "Terminar el arriendo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
