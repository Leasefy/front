"use client";

/**
 * Los incrementos del canon del contrato y su carta (Nico, 17-09).
 *
 *   · Vivienda sube SOLA al 100 % del IPC del año anterior desde el aniversario.
 *   · Local comercial: el funcionario digita el incremento de un año, o la tasa
 *     pactada para cada año.
 *   · El canon sube SIEMPRE, aunque la carta no se haya enviado.
 *   · 🔴 D6 (17-09 ~03:10): la carta se genera SOLA N días antes del aniversario
 *     (30 por defecto) y se envía con UN clic (el clic es la revisión). Sólo un
 *     correo que salió deja constancia; si no se puede por correo, se registra
 *     la constancia de otro medio. Sin constancia al llegar el aniversario:
 *     alerta roja.
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
      if (r.ultimoEnvio?.resultado === 'SIMULADA') {
        toast.error('La carta no salió.', { description: r.ultimoEnvio.mensaje });
      } else {
        toast.success(r.ultimoEnvio?.mensaje ?? exito);
      }
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
        <p className="mt-1 text-xs text-muted-foreground">
          La carta aparece sola {datos.diasAntesDeLaCarta ?? 30} días antes del aniversario y se envía con un clic.
        </p>
        {datos.correoSaleDeVerdad === false && (
          <p className="mt-1 text-xs text-plan-status-yellow" data-testid="correo-simulado">
            En este entorno el correo no sale: enviar simula y no deja constancia.
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
              onEnviar={(contenido) =>
                void accion(() => cicloDeVidaApi.enviarCarta(contractId, a.desde, contenido), "Carta enviada.")
              }
              onVerSoporte={() =>
                void (async () => {
                  try {
                    const { url } = await cicloDeVidaApi.soporteDeLaConstancia(contractId, a.desde);
                    window.open(url, "_blank", "noopener,noreferrer");
                  } catch (e) {
                    toast.error("No se pudo abrir el soporte.", {
                      description: mensajeDelFallo(e, "Intenta de nuevo."),
                    });
                  }
                })()
              }
              onConstancia={(body) =>
                void accion(
                  () => cicloDeVidaApi.registrarConstancia(contractId, a.desde, body),
                  "Constancia registrada: la carta queda enviada.",
                )
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
}

const MEDIO: Record<string, string> = {
  CORREO: "por correo",
  FISICO: "en físico",
  WHATSAPP: "por WhatsApp",
  OTRO: "por otro medio",
};

function Aniversario({
  a,
  comercial,
  editable,
  envioHabilitado,
  onDigitar,
  onGenerarCarta,
  onRevisar,
  onEnviar,
  onConstancia,
  onVerSoporte,
}: {
  a: AniversarioDelContrato;
  comercial: boolean;
  editable: boolean;
  envioHabilitado: boolean;
  onDigitar: (body: { porcentaje?: number | null; canonNuevoCop?: number | null }) => void;
  onGenerarCarta: () => void;
  onRevisar: (contenido?: string) => void;
  onEnviar: (contenido?: string) => void;
  onConstancia: (body: {
    medio: "FISICO" | "WHATSAPP" | "OTRO";
    fecha: string;
    nota: string;
    /** 🔴 OPCIONAL (Nico, 17-09): la constancia vale igual sin adjunto. */
    soporte?: File | null;
  }) => void;
  onVerSoporte: () => void;
}) {
  const [porcentaje, setPorcentaje] = useState("");
  const [texto, setTexto] = useState(a.carta?.contenido ?? "");
  const [constancia, setConstancia] = useState(false);
  const [medio, setMedio] = useState<"FISICO" | "WHATSAPP" | "OTRO">("FISICO");
  const [fecha, setFecha] = useState("");
  const [nota, setNota] = useState("");
  const [soporte, setSoporte] = useState<File | null>(null);
  useEffect(() => setTexto(a.carta?.contenido ?? ""), [a.carta?.contenido]);
  const sube = a.origen !== null && a.canonNuevoCop !== a.canonAnteriorCop;
  const enviada = a.carta?.estado === "ENVIADA";
  const enVentana =
    a.bandeja?.estado === "POR_ENVIAR" || a.bandeja?.estado === "VENCIDA_SIN_CONSTANCIA";

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
        {enviada && a.carta?.enviadaAt && ` el ${a.carta.enviadaAt.slice(0, 10)}${a.carta.medio ? ` ${MEDIO[a.carta.medio]}` : ""}`}
        {enviada && a.carta?.soporteNombre && (
          <>
            {" · "}
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={onVerSoporte}
              data-testid={`ver-soporte-constancia-${a.desde}`}
            >
              soporte: {a.carta.soporteNombre}
            </button>
          </>
        )}
      </p>

      {a.bandeja?.alertaRoja && (
        <p
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
          data-testid={`alerta-sin-constancia-${a.desde}`}
        >
          Llegó el aniversario sin constancia de la carta. El canon subió igual: envíala o registra cómo se entregó.
        </p>
      )}
      {a.bandeja?.estado === "POR_ENVIAR" && (
        <p className="text-xs text-plan-status-yellow" data-testid={`carta-por-enviar-${a.desde}`}>
          Carta por enviar: faltan {a.bandeja.diasParaElAniversario} días para el aniversario.
        </p>
      )}
      {a.carta?.ultimoIntento && !enviada && (
        <p className="text-xs text-muted-foreground">Último intento: {a.carta.ultimoIntento}</p>
      )}

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

      {sube && editable && !enviada && (
        <div className="space-y-2">
          {a.carta ? (
            <Textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={6}
              aria-label={`Carta del incremento del ${a.desde}`}
            />
          ) : (
            <Button size="sm" variant="outline" onClick={onGenerarCarta}>
              Ver y editar la carta
            </Button>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {(enVentana || a.carta) && (
              <Button
                size="sm"
                onClick={() => onEnviar(a.carta ? texto : undefined)}
                disabled={!envioHabilitado}
                data-testid={`enviar-carta-${a.desde}`}
              >
                Enviar la carta
              </Button>
            )}
            {a.carta?.estado === "PENDIENTE_DE_REVISION" && (
              <Button size="sm" variant="outline" onClick={() => onRevisar(texto)}>
                Guardar el texto
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setConstancia((v) => !v)} disabled={!envioHabilitado}>
              Se entregó por otro medio
            </Button>
            {!envioHabilitado && (
              <span className="text-xs text-muted-foreground">
                Falta una actualización de la base para enviar y dejar constancia. El canon sube igual.
              </span>
            )}
          </div>
          {constancia && (
            <div className="flex flex-wrap items-end gap-2 rounded-md border border-border p-2" data-testid={`constancia-${a.desde}`}>
              <label className="text-xs">
                Medio
                <select
                  className="mt-1 block rounded-md border border-border bg-background px-2 py-1 text-sm"
                  value={medio}
                  onChange={(e) => setMedio(e.target.value as "FISICO" | "WHATSAPP" | "OTRO")}
                >
                  <option value="FISICO">En físico</option>
                  <option value="WHATSAPP">Por WhatsApp</option>
                  <option value="OTRO">Otro</option>
                </select>
              </label>
              <label className="text-xs">
                Fecha
                <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="mt-1" />
              </label>
              <label className="text-xs">
                Cómo se entregó
                <Input value={nota} onChange={(e) => setNota(e.target.value)} className="mt-1 w-64" placeholder="A quién, guía de envío…" />
              </label>
              {/* 🔴 El soporte es OPCIONAL (Nico, 17-09): una entrega en
                  portería sin papel también vale como constancia. */}
              <label className="text-xs">
                Soporte (opcional)
                <Input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => setSoporte(e.target.files?.[0] ?? null)}
                  className="mt-1"
                  data-testid={`constancia-soporte-${a.desde}`}
                />
              </label>
              <Button
                size="sm"
                variant="outline"
                disabled={!fecha || nota.trim().length < 3}
                onClick={() => onConstancia({ medio, fecha, nota: nota.trim(), soporte })}
                data-testid={`registrar-constancia-${a.desde}`}
              >
                Registrar constancia
              </Button>
              <p className="w-full text-xs text-muted-foreground">
                La guía del correo certificado o el acta de entrega ayudan, pero no son obligatorias: con la fecha, el
                medio y quién la entregó la constancia ya vale.
              </p>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
