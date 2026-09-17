"use client";

/**
 * Los incrementos del canon del contrato y su carta (Nico, 17-09).
 *
 *   · Vivienda sube SOLA al 100 % del IPC del año anterior desde el aniversario.
 *   · Local comercial: el funcionario digita el incremento de un año, o la tasa
 *     pactada para cada año.
 *   · El canon sube SIEMPRE, aunque la carta no se haya enviado. La carta la
 *     genera el sistema, una persona la revisa y la envía; el envío va apagado.
 *
 * La regla vive en el back (`incrementos-del-contrato.ts`): acá no se calcula
 * ningún canon, sólo se muestra y se digita.
 */

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import {
  cicloDeVidaApi,
  type AniversarioDelContrato,
  type IncrementosDelContrato as Incrementos,
} from "@/lib/api/ciclo-de-vida.service";
import { mensajeDelFallo } from "@/lib/contratos/fallo-de-accion";

const PESOS = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const ORIGEN: Record<string, string> = {
  IPC: "IPC del año anterior (vivienda)",
  DIGITADO: "Digitado para este año",
  TASA_PACTADA: "Tasa pactada",
  RENOVACION: "Renovación",
};

const CARTA: Record<string, string> = {
  PENDIENTE_DE_REVISION: "Carta por revisar",
  REVISADA: "Carta revisada",
  ENVIADA: "Carta enviada",
};

function numeroOVacio(texto: string): number | null {
  const limpio = texto.replace(",", ".").trim();
  if (limpio === "") return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

export function IncrementosDelContrato({
  contractId,
  puedeEditar,
}: {
  contractId: string;
  puedeEditar: boolean;
}) {
  const [datos, setDatos] = useState<Incrementos | null>(null);
  const [fallo, setFallo] = useState(false);
  const [tasa, setTasa] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const r = await cicloDeVidaApi.incrementos(contractId);
      setDatos(r);
      setTasa(r.tasaAnualPactadaPct != null ? String(r.tasaAnualPactadaPct) : "");
      setFallo(false);
    } catch {
      setFallo(true);
    }
  }, [contractId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const accion = async (hacer: () => Promise<Incrementos>, exito: string) => {
    setOcupado(true);
    try {
      const r = await hacer();
      setDatos(r);
      toast.success(exito);
    } catch (err) {
      toast.error("No se pudo guardar.", { description: mensajeDelFallo(err, "Intenta de nuevo.") });
    } finally {
      setOcupado(false);
    }
  };

  if (fallo) {
    return (
      <section className="rounded-lg border border-border p-4 text-sm text-muted-foreground" data-testid="incrementos-del-contrato">
        No se pudieron traer los incrementos del canon.{" "}
        <button type="button" className="underline" onClick={() => void cargar()}>
          Reintentar
        </button>
      </section>
    );
  }
  if (!datos) return null;

  const comercial = datos.uso === "COMERCIAL";
  const editable = puedeEditar && datos.disponible && !ocupado;

  return (
    <section className="space-y-3 rounded-lg border border-border p-4" data-testid="incrementos-del-contrato">
      <div>
        <h3 className="text-sm font-medium">Incrementos del canon</h3>
        <p className="text-xs text-muted-foreground">
          {datos.uso === "VIVIENDA"
            ? "Vivienda: sube sola al 100 % del IPC del año anterior en cada aniversario. El mes del aniversario se cobra prorrateado."
            : comercial
              ? "Local comercial: digita el incremento de un año o la tasa pactada para cada año. El mes del aniversario se cobra prorrateado."
              : "El contrato no dice si es vivienda o local comercial: define el uso para saber cómo sube."}{" "}
          El canon sube aunque la carta no se haya enviado.
        </p>
        {!datos.disponible && (
          <p className="mt-1 text-xs text-plan-status-yellow">
            Falta una actualización de la base: todavía no se puede digitar ni generar cartas.
          </p>
        )}
      </div>

      {comercial && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs" htmlFor="tasa-pactada">
            Tasa pactada para cada año (%)
            <Input
              id="tasa-pactada"
              inputMode="decimal"
              value={tasa}
              onChange={(e) => setTasa(e.target.value)}
              disabled={!editable}
              data-testid="tasa-pactada"
              className="mt-1 w-32"
            />
          </label>
          <Button
            size="sm"
            variant="outline"
            disabled={!editable}
            onClick={() =>
              void accion(
                () => cicloDeVidaApi.fijarTasaAnual(contractId, numeroOVacio(tasa)),
                "Tasa pactada guardada. La tabla se recalcula.",
              )
            }
          >
            Guardar tasa
          </Button>
        </div>
      )}

      {datos.aniversarios.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay aniversarios dentro del contrato.</p>
      ) : (
        <ul className="divide-y divide-border">
          {datos.aniversarios.map((a) => (
            <Aniversario
              key={a.desde}
              a={a}
              comercial={comercial}
              editable={editable}
              envioHabilitado={datos.envioHabilitado}
              onDigitar={(body) =>
                void accion(
                  () => cicloDeVidaApi.digitarIncremento(contractId, a.desde, body),
                  "Incremento guardado. La tabla se recalcula.",
                )
              }
              onGenerarCarta={() =>
                void accion(() => cicloDeVidaApi.generarCarta(contractId, a.desde), "Carta generada: queda por revisar.")
              }
              onRevisar={(contenido) =>
                void accion(() => cicloDeVidaApi.revisarCarta(contractId, a.desde, contenido), "Carta revisada.")
              }
              onEnviar={() =>
                void accion(() => cicloDeVidaApi.enviarCarta(contractId, a.desde), "Carta enviada.")
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function Aniversario({
  a,
  comercial,
  editable,
  envioHabilitado,
  onDigitar,
  onGenerarCarta,
  onRevisar,
  onEnviar,
}: {
  a: AniversarioDelContrato;
  comercial: boolean;
  editable: boolean;
  envioHabilitado: boolean;
  onDigitar: (body: { porcentaje?: number | null; canonNuevoCop?: number | null }) => void;
  onGenerarCarta: () => void;
  onRevisar: (contenido?: string) => void;
  onEnviar: () => void;
}) {
  const [porcentaje, setPorcentaje] = useState("");
  const [texto, setTexto] = useState(a.carta?.contenido ?? "");
  useEffect(() => setTexto(a.carta?.contenido ?? ""), [a.carta?.contenido]);
  const sube = a.origen !== null && a.canonNuevoCop !== a.canonAnteriorCop;

  return (
    <li className="space-y-2 py-3 text-sm" data-testid={`aniversario-${a.desde}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">Desde el {a.desde}</span>
        {sube ? (
          <span>
            {PESOS.format(a.canonAnteriorCop)} → <strong>{PESOS.format(a.canonNuevoCop)}</strong>
            {a.porcentaje != null && ` (${a.porcentaje} %)`}
          </span>
        ) : (
          <span className="text-muted-foreground">Sin incremento</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {sube ? ORIGEN[a.origen as string] : a.motivo}
        {a.carta && ` · ${CARTA[a.carta.estado]}`}
      </p>

      {comercial && editable && (
        <div className="flex flex-wrap items-end gap-2">
          <Input
            inputMode="decimal"
            placeholder="% de este año"
            value={porcentaje}
            onChange={(e) => setPorcentaje(e.target.value)}
            className="w-32"
            aria-label={`Incremento del ${a.desde} en porcentaje`}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={numeroOVacio(porcentaje) === null}
            onClick={() => onDigitar({ porcentaje: numeroOVacio(porcentaje) })}
          >
            Digitar incremento
          </Button>
        </div>
      )}

      {sube && editable && (
        <div className="space-y-2">
          {!a.carta || a.carta.estado === "PENDIENTE_DE_REVISION" ? (
            <Button size="sm" variant="outline" onClick={onGenerarCarta}>
              {a.carta ? "Volver a generar la carta" : "Generar la carta"}
            </Button>
          ) : null}
          {a.carta && a.carta.estado !== "ENVIADA" && (
            <>
              <Textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={6}
                aria-label={`Carta del incremento del ${a.desde}`}
              />
              <div className="flex flex-wrap items-center gap-2">
                {a.carta.estado === "PENDIENTE_DE_REVISION" && (
                  <Button size="sm" onClick={() => onRevisar(texto)}>
                    Marcar como revisada
                  </Button>
                )}
                {a.carta.estado === "REVISADA" && (
                  <Button size="sm" onClick={onEnviar} disabled={!envioHabilitado}>
                    Enviar la carta
                  </Button>
                )}
                {!envioHabilitado && (
                  <span className="text-xs text-muted-foreground">
                    El envío de cartas está apagado: no sale nada. El canon sube igual.
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </li>
  );
}
