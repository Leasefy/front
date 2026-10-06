"use client";

/**
 * El cajón para corregir (o ELEGIR, si es ambigua) los recibos de un
 * movimiento — muchos a uno (02-10-2026).
 *
 * Al abrir trae `recibos-que-suman` del back: las combinaciones que suman y
 * los recibos candidatos. La persona puede tomar una combinación entera o
 * armar el conjunto a mano con casillas; la suma de lo marcado se ve en vivo
 * contra el valor del banco y «Conciliar» sólo se habilita cuando CALZA
 * exacto (o es una propuesta del back explicada por su regla). El servidor lo
 * vuelve a comprobar todo igual.
 *
 * Si es ambigua no llega nada marcado: obliga a elegir.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowsSplit, CheckCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Cajon,
  CajonCabecera,
  CajonCuerpo,
  CajonPie,
} from "@/components/ui/cajon";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { conciliacionBancariaApi } from "@/lib/api/conciliacion-bancaria.service";
import type {
  MovimientoBancario,
  RespuestaRecibosQueSuman,
} from "@/lib/api/conciliacion-bancaria.types";
import { mensajeParaLaPersona } from "@/lib/errores/traductor-de-errores";
import { diaLegible, plata } from "./formato";
import {
  combinacionesEnPalabras,
  estadoDeLaSuma,
  mismosIds,
  nombreDeLaDiferencia,
  recibosCandidatos,
  seDejaEnviar,
  sumaDe,
} from "./muchos-a-uno";
import { useMovimientoDeMuchosAUno } from "./movimiento-de-muchos-a-uno";
import {
  AvisoDelRechazo,
  AvisoSinTabla,
  Calza,
  CifraQueCuenta,
  ConfianzaDeLaPropuesta,
  ReciboEnLinea,
} from "./PiezasDeMuchosAUno";
import type { EnvioDeRecibos } from "./MuchosAUno";

interface Props {
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  movimiento: MovimientoBancario;
  puedeConciliar: boolean;
  sinTabla: boolean;
  onSinTabla: () => void;
  envio: EnvioDeRecibos;
}

export function CorregirLosRecibos({
  abierto,
  onOpenChange,
  movimiento: m,
  puedeConciliar,
  sinTabla,
  onSinTabla,
  envio,
}: Props) {
  const mov = useMovimientoDeMuchosAUno();
  const [respuesta, setRespuesta] = useState<RespuestaRecibosQueSuman | null>(
    null,
  );
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [seleccion, setSeleccion] = useState<string[]>([]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const r = await conciliacionBancariaApi.recibosQueSuman(m.id);
      setRespuesta(r);
      if (r.sePuedeAplicar === false) onSinTabla();
      // Ambigua: nada marcado, hay que elegir. Si no, la mejor ya viene puesta.
      setSeleccion(r.ambigua ? [] : [...(r.propuestas[0]?.reciboIds ?? [])]);
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [m.id, onSinTabla]);

  useEffect(() => {
    if (abierto) void cargar();
    else {
      setRespuesta(null);
      setSeleccion([]);
    }
    // Sólo al abrir: `cargar` cambia de identidad si cambia `onSinTabla`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, m.id]);

  const propuestas = useMemo(() => respuesta?.propuestas ?? [], [respuesta]);
  const parcial = respuesta?.parcial ?? null;
  const candidatos = useMemo(
    () => recibosCandidatos(propuestas, parcial),
    [propuestas, parcial],
  );
  const suma = sumaDe(candidatos, seleccion);
  const estado = estadoDeLaSuma(seleccion, suma, m.valorCop, propuestas);
  const noSeAplica = sinTabla || respuesta?.sePuedeAplicar === false;
  const sePuedeEnviar =
    puedeConciliar &&
    !noSeAplica &&
    !envio.enviando &&
    respuesta !== null &&
    seDejaEnviar(estado);

  const alternar = (id: string, marcado: boolean) =>
    setSeleccion((s) =>
      marcado ? (s.includes(id) ? s : [...s, id]) : s.filter((x) => x !== id),
    );

  const enviar = async () => {
    if (!sePuedeEnviar) return;
    const ok = await envio.aplicar(seleccion, suma);
    if (ok) onOpenChange(false);
  };

  const ambigua = Boolean(respuesta?.ambigua);
  const rechazo =
    envio.rechazo && envio.rechazo.tipo !== "sinTabla" ? envio.rechazo : null;

  return (
    <Cajon
      abierto={abierto}
      onOpenChange={onOpenChange}
      tamano="md"
      data-testid={`corregir-${m.id}`}
    >
      <CajonCabecera
        titulo={
          ambigua
            ? "Elige la combinación correcta"
            : "Corregir los recibos del movimiento"
        }
        descripcion={`${plata(m.valorCop)} del ${diaLegible(m.fecha)} — «${m.descripcion}».`}
      />
      <CajonCuerpo className="space-y-5">
        {cargando && !respuesta ? (
          <div
            className="flex flex-col items-center gap-3 py-10 text-center"
            data-testid="corregir-cargando"
          >
            <Spinner size="lg" />
            <p className="text-body-sm text-fg-muted">
              Buscando los recibos que suman este movimiento…
            </p>
          </div>
        ) : error ? (
          <div className="space-y-3" role="alert" data-testid="corregir-error">
            <p className="text-body-sm text-fg">
              {mensajeParaLaPersona(error, {
                porDefecto:
                  "No se pudieron traer los recibos que suman este movimiento.",
                accion: "buscar los recibos que suman este movimiento",
              })}
            </p>
            <Button
              size="sm"
              variant="secondary"
              hideArrow
              onClick={() => void cargar()}
            >
              Reintentar
            </Button>
          </div>
        ) : respuesta ? (
          <>
            <AnimatePresence initial={false}>
              {noSeAplica && <AvisoSinTabla key="sin-tabla" movimiento={mov} />}
            </AnimatePresence>

            {ambigua && (
              <p
                className="flex items-start gap-1.5 rounded-md border border-warning bg-warning-soft px-3 py-2 text-body-sm text-fg"
                role="note"
                data-testid="corregir-ambigua"
              >
                <ArrowsSplit
                  className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                  aria-hidden="true"
                />
                {propuestas.length === 2
                  ? "Hay dos combinaciones que suman lo mismo: elige la correcta."
                  : `Hay ${propuestas.length >= 2 ? combinacionesEnPalabras(propuestas.length) : "más de una combinación"} que suman lo mismo: elige la correcta.`}
              </p>
            )}
            {respuesta.agotada && (
              <p
                className="text-caption text-fg-muted"
                data-testid="corregir-agotada"
              >
                La búsqueda se detuvo antes de revisar todas las combinaciones
                posibles: revisa con cuidado antes de conciliar.
              </p>
            )}

            {propuestas.length === 0 && parcial && (
              <p
                className="text-body-sm text-fg"
                data-testid="corregir-parcial"
              >
                Ninguna combinación suma este movimiento: los recibos que más se
                acercan suman{" "}
                <span className="tabular-nums font-medium">
                  {plata(parcial.sumaCop)}
                </span>{" "}
                y sobran{" "}
                <span className="tabular-nums font-medium">
                  {plata(parcial.sobranteCop)}
                </span>{" "}
                en el banco. No se concilia hasta que la suma calce.
              </p>
            )}
            {propuestas.length === 0 && !parcial ? (
              <p
                className="text-body-sm text-fg-muted"
                data-testid="corregir-sin-propuestas"
              >
                Ya no hay una combinación de recibos sin conciliar que sume este
                movimiento. Puede que alguno se haya conciliado con otro
                movimiento.
              </p>
            ) : (
              <>
                {propuestas.length > 0 && (
                  <section
                    className="space-y-2"
                    aria-labelledby={`combinaciones-${m.id}`}
                  >
                    <h3
                      id={`combinaciones-${m.id}`}
                      className="text-body-sm font-semibold text-fg"
                    >
                      {propuestas.length === 1
                        ? "La combinación propuesta"
                        : "Las combinaciones propuestas"}
                    </h3>
                    <div
                      role="radiogroup"
                      aria-labelledby={`combinaciones-${m.id}`}
                      className="space-y-2"
                    >
                      {propuestas.map((p, i) => {
                        const elegida = mismosIds(p.reciboIds, seleccion);
                        return (
                          <motion.button
                            key={p.reciboIds.join("|")}
                            type="button"
                            role="radio"
                            aria-checked={elegida}
                            onClick={() => setSeleccion([...p.reciboIds])}
                            className={cn(
                              "w-full space-y-1 rounded-md border px-3 py-2 text-left transition-colors",
                              elegida
                                ? "border-primary bg-primary-soft"
                                : "border-border bg-surface hover:bg-surface-muted",
                            )}
                            data-testid={`combinacion-${i}`}
                            {...mov.recibo(i, propuestas.length)}
                          >
                            <span className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-body-sm font-medium text-fg">
                                Opción {i + 1} · {p.recibos.length}{" "}
                                {p.recibos.length === 1 ? "recibo" : "recibos"}{" "}
                                ·{" "}
                                <span className="tabular-nums">
                                  {plata(p.sumaCop)}
                                </span>
                              </span>
                              <ConfianzaDeLaPropuesta
                                nivel={p.nivel}
                                deCadaDiez={p.deCadaDiez}
                                movimiento={mov}
                              />
                            </span>
                            <span className="block text-caption text-fg-muted">
                              {p.recibos
                                .map((r) => `N.º ${String(r.numero)}`)
                                .join(", ")}
                            </span>
                            {p.diferencia && (
                              <span className="block text-caption text-warning">
                                Diferencia de {plata(p.diferencia.valorCop)} por{" "}
                                {nombreDeLaDiferencia(p.diferencia)}:{" "}
                                {p.diferencia.regla}
                              </span>
                            )}
                            {p.porQue.length > 0 && (
                              <span className="block text-caption text-fg-muted">
                                {p.porQue.join(" ")}
                              </span>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </section>
                )}

                <section
                  className="space-y-2"
                  aria-labelledby={`a-mano-${m.id}`}
                >
                  <h3
                    id={`a-mano-${m.id}`}
                    className="text-body-sm font-semibold text-fg"
                  >
                    O márcalos a mano
                  </h3>
                  <ul className="space-y-1.5">
                    {candidatos.map((r, i) => {
                      const id = `recibo-${m.id}-${r.id}`;
                      return (
                        <motion.li
                          key={r.id}
                          {...mov.recibo(i, candidatos.length)}
                        >
                          <label
                            htmlFor={id}
                            className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border px-2.5 py-2 hover:bg-surface-muted"
                          >
                            <Checkbox
                              id={id}
                              checked={seleccion.includes(r.id)}
                              onCheckedChange={(v: boolean | "indeterminate") =>
                                alternar(r.id, v === true)
                              }
                              className="mt-0.5"
                              data-testid={`casilla-${r.id}`}
                            />
                            <ReciboEnLinea recibo={r} />
                          </label>
                        </motion.li>
                      );
                    })}
                  </ul>
                </section>
              </>
            )}

            <AnimatePresence initial={false}>
              {rechazo && (
                <AvisoDelRechazo
                  key={`rechazo-${rechazo.tipo}`}
                  rechazo={rechazo}
                  movimiento={mov}
                />
              )}
            </AnimatePresence>
          </>
        ) : null}
      </CajonCuerpo>
      <CajonPie
        ayuda={
          respuesta && candidatos.length > 0 ? (
            <SumaEnVivo
              cuantos={seleccion.length}
              suma={suma}
              valor={m.valorCop}
              estado={estado}
              cuenta={mov.cuenta}
              mov={mov}
            />
          ) : undefined
        }
      >
        <Button
          variant="outline"
          hideArrow
          disabled={envio.enviando}
          onClick={() => onOpenChange(false)}
        >
          Cancelar
        </Button>
        <Button
          hideArrow
          disabled={!sePuedeEnviar}
          isLoading={envio.enviando}
          onClick={() => void enviar()}
          data-testid={`confirmar-recibos-${m.id}`}
        >
          <CheckCircle className="h-4 w-4" aria-hidden="true" />
          {seleccion.length > 0
            ? `Conciliar con ${seleccion.length} ${seleccion.length === 1 ? "recibo" : "recibos"}`
            : "Conciliar"}
        </Button>
      </CajonPie>
    </Cajon>
  );
}

function SumaEnVivo({
  cuantos,
  suma,
  valor,
  estado,
  cuenta,
  mov,
}: {
  cuantos: number;
  suma: number;
  valor: number;
  estado: ReturnType<typeof estadoDeLaSuma>;
  cuenta: boolean;
  mov: ReturnType<typeof useMovimientoDeMuchosAUno>;
}) {
  return (
    <div
      className="space-y-1"
      data-testid="suma-en-vivo"
      data-estado={estado.tipo}
      aria-live="polite"
    >
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-body-sm">
        <span className="text-fg-muted">
          {cuantos === 0
            ? "Nada marcado"
            : `${cuantos} ${cuantos === 1 ? "recibo marcado" : "recibos marcados"}`}
          :
        </span>
        <CifraQueCuenta
          valor={suma}
          cuenta={cuenta}
          className="font-semibold text-fg"
          testId="suma-marcada"
        />
        <span className="text-fg-muted">de {plata(valor)} del banco</span>
        <AnimatePresence mode="popLayout" initial={false}>
          {estado.tipo === "calza" && (
            <Calza key="calza" movimiento={mov}>
              Suma exacta
            </Calza>
          )}
        </AnimatePresence>
      </p>
      {estado.tipo === "conDiferencia" && (
        <p className="text-caption text-warning">
          Calza con la diferencia de {nombreDeLaDiferencia(estado.diferencia)}:{" "}
          {estado.diferencia.regla}
        </p>
      )}
      {estado.tipo === "falta" && (
        <p className="text-caption text-fg-muted">
          Faltan {plata(estado.cuanto)} para llegar al valor del banco.
        </p>
      )}
      {estado.tipo === "sobra" && (
        <p className="text-caption text-fg-muted">
          Te pasaste por {plata(estado.cuanto)} del valor del banco.
        </p>
      )}
    </div>
  );
}
