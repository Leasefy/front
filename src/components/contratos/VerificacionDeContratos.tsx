"use client";

/**
 * VerificacionDeContratos — la segunda opinión, en pantalla.
 *
 * Nico, 2026-09-15: «que haya una doble verificación del trabajo, ya que el
 * contrato es supremamente importante porque todo queda asociado ahí» · «en la
 * pantalla de migración de contratos, junto al resultado del lote — cuántas
 * coinciden, cuántas difieren y cuáles, con el detalle abierto por fila».
 *
 * ── Las tres reglas de presentación ────────────────────────────────────────
 *
 * 1. **Cada número dice QUÉ cuenta.** Nunca un porcentaje suelto ni un «todo
 *    bien»: «1.785 coinciden · 51 difieren · 0 sin verificar».
 * 2. **«Sin verificar» NO es «bien»**, y se pinta distinto de «coincide». Un
 *    conteo que mezcle los dos convierte un hueco en una aprobación.
 * 3. **El detalle de una diferencia va ABIERTO**, no detrás de un clic: si
 *    hace falta tocar algo para enterarse de que un contrato quedó con el
 *    inmueble equivocado, la mitad de las veces nadie se entera.
 */

import { useCallback, useRef, useState } from "react";
import { CheckCircle, Question, Warning } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { contractsApi } from "@/lib/api/contracts.service";
import type { VeredictoDeFila } from "@/lib/api/contracts.service";
import {
  verificarLoteCompleto,
  type ProgresoDeVerificacion,
  type ResultadoVerificacionCompleta,
} from "./verificarLoteCompleto";

interface Props {
  /** El lote recién activado. Sin lote se verifica toda la cartera migrada. */
  lote?: string;
  /**
   * Lo que la activación ya verificó por su cuenta, si lo hizo. Es el punto de
   * partida de la pantalla: sin tocar nada, la persona ya ve si lo que acaba
   * de entrar cuadra.
   */
  deLaActivacion?: ResultadoVerificacionCompleta | null;
  /**
   * Por qué la activación no pudo verificar. 🔴 Se muestra: sin este aviso,
   * «no hay diferencias» y «no se verificó» se ven exactamente igual.
   */
  aviso?: string;
}

/** La fila del archivo tal como la ve la persona: el Excel empieza en 1 y
 * tiene encabezado, así que la fila 0 del back es la 2 de su pantalla. */
function filaHumana(fila: number): number {
  return fila + 2;
}

export function VerificacionDeContratos({ lote, deLaActivacion, aviso }: Props) {
  const [resultado, setResultado] = useState<ResultadoVerificacionCompleta | null>(
    deLaActivacion ?? null,
  );
  const [progreso, setProgreso] = useState<ProgresoDeVerificacion | null>(null);
  const [corriendo, setCorriendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pararRef = useRef(false);

  const verificar = useCallback(async () => {
    pararRef.current = false;
    setCorriendo(true);
    setError(null);
    setProgreso(null);
    try {
      const r = await verificarLoteCompleto(
        lote,
        (l, desdeFila) => contractsApi.migracion.verificar(l, desdeFila),
        setProgreso,
        { debeParar: () => pararRef.current },
      );
      setResultado(r);
    } catch {
      /*
       * Un fallo del verificador NO puede leerse como «los contratos están
       * mal» ni como «están bien»: se dice que no se pudo comprobar y se
       * ofrece reintentar. Los contratos ya están migrados; esto sólo los
       * mira.
       */
      setError(
        "No pudimos contrastar los contratos contra el archivo. Los contratos que ya se activaron no cambiaron: vuelve a intentarlo.",
      );
    } finally {
      setCorriendo(false);
      setProgreso(null);
    }
  }, [lote]);

  const difieren = resultado?.veredictos.filter((v) => v.veredicto === "difiere") ?? [];
  const sinVerificar =
    resultado?.veredictos.filter((v) => v.veredicto === "no_verificable") ?? [];

  return (
    <Card className="space-y-3 p-6" data-testid="resultado-verificacion">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">
            Doble verificación: lo que quedó guardado contra el archivo
          </h3>
          <p className="text-caption text-muted-foreground">
            Se vuelve a leer el archivo por otro camino y se contrasta campo por
            campo: inmueble, inquilino, propietario, fechas, canon y cuotas.
            Nada se corrige solo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {corriendo ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              hideArrow
              onClick={() => {
                pararRef.current = true;
              }}
              data-testid="detener-verificacion"
            >
              Detener
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            hideArrow
            isLoading={corriendo}
            disabled={corriendo}
            onClick={() => void verificar()}
            data-testid="verificar-lote"
          >
            {resultado ? "Volver a verificar el lote" : "Verificar el lote completo"}
          </Button>
        </div>
      </div>

      {/* 🔴 El aviso de la activación va arriba de todo: si no se pudo
       * verificar, ningún número de abajo significa nada. */}
      {aviso && !resultado ? (
        <p className="text-sm text-warning" data-testid="aviso-sin-verificar">
          {aviso}
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-danger" data-testid="error-verificacion">
          {error}
        </p>
      ) : null}

      {corriendo && progreso ? (
        <p className="text-sm text-muted-foreground" data-testid="progreso-verificacion">
          Contrastando… {progreso.verificadas}{" "}
          {progreso.verificadas === 1 ? "contrato mirado" : "contratos mirados"}
          {progreso.restantes > 0 ? ` · quedan ${progreso.restantes}` : ""}
        </p>
      ) : null}

      {resultado ? (
        <>
          <p className="text-sm" data-testid="conteo-verificacion">
            <span className="inline-flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-success" weight="fill" />
              {resultado.coinciden}{" "}
              {resultado.coinciden === 1 ? "coincide" : "coinciden"}
            </span>
            {" · "}
            <span className="inline-flex items-center gap-1">
              <Warning
                className={
                  resultado.difieren > 0 ? "h-4 w-4 text-danger" : "h-4 w-4 text-muted-foreground"
                }
                weight="fill"
              />
              {resultado.difieren}{" "}
              {resultado.difieren === 1 ? "difiere" : "difieren"}
            </span>
            {" · "}
            {/* 🔴 «No se pudo verificar» se dice SIEMPRE, incluso en cero: es
             * la única forma de que el número de arriba se lea como lo que es.
             * Omitirlo cuando es 0 haría que su ausencia pareciera un «bien». */}
            <span className="inline-flex items-center gap-1">
              <Question className="h-4 w-4 text-muted-foreground" weight="fill" />
              {resultado.noVerificables} sin verificar
            </span>
            {resultado.restantes > 0 ? (
              <span className="text-muted-foreground">
                {" "}
                · quedan {resultado.restantes} por mirar
              </span>
            ) : null}
          </p>

          {resultado.guardado === false ? (
            <p className="text-caption text-muted-foreground" data-testid="verificacion-no-guardada">
              Este resultado no quedó guardado en el servidor (falta aplicar una
              migración de base): al recargar la página hay que volver a
              verificar. Las filas que difieren sí quedaron marcadas.
            </p>
          ) : null}

          {resultado.detenidoPorPersona ? (
            <p className="text-caption text-muted-foreground">
              Se detuvo a mitad: el número es de lo que alcanzó a mirar.
            </p>
          ) : null}
          {resultado.detenidoSinAvance ? (
            <p className="text-caption text-warning">
              El servidor dejó de avanzar, así que se cortó. El número es de lo
              que alcanzó a mirar, no del lote completo.
            </p>
          ) : null}

          {difieren.length > 0 ? (
            <div className="space-y-3" data-testid="verificacion-difieren">
              <p className="text-sm font-medium text-danger">
                {difieren.length === 1
                  ? "Este contrato no quedó como dice el archivo. Está frenado hasta que alguien lo revise:"
                  : `Estos ${difieren.length} contratos no quedaron como dice el archivo. Están frenados hasta que alguien los revise:`}
              </p>
              <ul className="space-y-3">
                {difieren.map((v) => (
                  <li
                    key={v.fila}
                    className="rounded-md border border-danger/30 bg-danger/5 p-3"
                  >
                    <p className="text-sm font-medium">Fila {filaHumana(v.fila)}</p>
                    <ul className="mt-1 space-y-1">
                      {v.diferencias.map((d, i) => (
                        <li key={`${d.campo}-${i}`} className="text-sm">
                          {d.frase}{" "}
                          <span className="text-caption text-muted-foreground">
                            (según {d.fuente})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {sinVerificar.length > 0 ? (
            <div className="space-y-2" data-testid="verificacion-sin-verificar">
              <p className="text-sm font-medium">
                {sinVerificar.length === 1
                  ? "De este contrato no se pudo comprobar nada —no es que esté bien—:"
                  : `De estos ${sinVerificar.length} contratos no se pudo comprobar nada —no es que estén bien—:`}
              </p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {sinVerificar.map((v) => (
                  <li key={v.fila}>
                    Fila {filaHumana(v.fila)}: {v.motivo ?? "no se pudo contrastar."}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {resultado.veredictosTruncados ? (
            <p className="text-caption text-muted-foreground">
              Se muestran las primeras; los conteos de arriba sí son del total
              mirado.
            </p>
          ) : null}

          {resultado.difieren === 0 && resultado.verificadas > 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="verificacion-sin-diferencias">
              Todo lo que el archivo afirma quedó guardado igual en los{" "}
              {resultado.verificadas} contratos mirados.
            </p>
          ) : null}
        </>
      ) : null}

      {!resultado && !corriendo && !aviso ? (
        <p className="text-sm text-muted-foreground">
          Todavía no se ha contrastado nada. Tocar «Verificar el lote completo»
          no cambia ningún contrato: sólo los mira.
        </p>
      ) : null}
    </Card>
  );
}

/** Lo que la activación trajo, con la forma que usa esta pantalla. */
export function deLaActivacion(
  verificacion:
    | {
        verificadas: number;
        coinciden: number;
        difieren: number;
        noVerificables: number;
        veredictos: VeredictoDeFila[];
        veredictosTruncados: boolean;
        restantes: number;
        guardado: boolean;
      }
    | undefined,
): ResultadoVerificacionCompleta | null {
  if (!verificacion) return null;
  return {
    verificadas: verificacion.verificadas,
    coinciden: verificacion.coinciden,
    difieren: verificacion.difieren,
    noVerificables: verificacion.noVerificables,
    llamadas: 1,
    restantes: verificacion.restantes ?? 0,
    veredictos: verificacion.veredictos ?? [],
    veredictosTruncados: verificacion.veredictosTruncados === true,
    guardado: verificacion.guardado !== false,
    detenidoPorLimite: false,
    detenidoSinAvance: false,
    detenidoPorPersona: false,
  };
}
