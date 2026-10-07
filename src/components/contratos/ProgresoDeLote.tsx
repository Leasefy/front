"use client";

/**
 * Ítem 1 del brief WU-4 — "que la carga se realice y mantenga al usuario
 * esperando, pero si cierra la ventana que la carga siga… y cuando termine
 * llegue una notificación" (el owner).
 *
 * Se muestra mientras un lote sigue `ENCOLADO`/`PROCESANDO`
 * (`use-estado-de-lote.ts`, contrato §3.2.A2). El sondeo que alimenta esto
 * es una CONVENIENCIA mientras la pestaña sigue abierta — nunca el
 * mecanismo de finalización, así que el mensaje de "puedes cerrar esta
 * pestaña" no es cosmético: es la garantía real (el lote es durable
 * server-side, WU-2, y la notificación llega igual — contrato §3.2.C).
 */

import { Queue, XCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { EstadoDeLote } from "@/lib/api/contracts.service";
import { Progress } from "@/components/ui/progress";

export function ProgresoDeLote({
  estado,
  agotado,
  verificando = false,
  onVerificarAhora,
  onVolverAEmpezar,
}: {
  estado: EstadoDeLote | null;
  agotado: boolean;
  /** El padre está preguntando por el lote ahora mismo. */
  verificando?: boolean;
  /** Con el sondeo agotado: preguntar UNA vez más, a pedido. */
  onVerificarAhora?: () => void;
  /** La salida del FALLIDO: volver al cargador. Sin esto la tarjeta era un
   *  callejón — el error se mostraba y no había ni un botón para seguir. */
  onVolverAEmpezar?: () => void;
}) {
  if (estado?.estado === "FALLIDO") {
    return (
      <Card className="space-y-3 p-6" data-testid="lote-fallido">
        <div className="flex items-center gap-2 text-destructive">
          <XCircle className="h-5 w-5" />
          <p className="text-sm font-medium">
            No pudimos preparar la migración
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {estado.error ?? "No pudimos preparar la migración."}
        </p>
        <p className="text-sm text-muted-foreground">
          Ningún contrato se creó. Tu archivo no se modifica: corrige lo que
          diga el error de arriba y vuelve a subirlo.
        </p>
        {onVolverAEmpezar ? (
          <Button
            variant="outline"
            hideArrow
            onClick={onVolverAEmpezar}
            data-testid="lote-fallido-volver"
          >
            Subir el archivo de nuevo
          </Button>
        ) : null}
      </Card>
    );
  }

  const total = estado?.total ?? 0;
  const procesadas = Math.min(estado?.procesadas ?? 0, total);
  const porcentaje = total > 0 ? Math.round((procesadas / total) * 100) : 0;

  /*
   * 🔴 06-10 (Nico, con captura): la migración NO va al centro de procesos
   * («todo al centro, menos migración, que allá sí pasa sólo allá», 01-10).
   * Esta tarjeta remitía al centro («el avance lo sigues en el centro de
   * procesos») porque el 23-09 la carga se movió allá; ahora el avance de la
   * carga se ve AQUÍ, en el paso, y en la lista de cargas del paso.
   */
  return (
    <Card className="space-y-4 p-6" data-testid="lote-progreso">
      <div className="flex items-center gap-2">
        <Queue className="h-5 w-5 text-primary" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">
          {total > 0
            ? `Estamos preparando los ${total.toLocaleString("es-CO")} contratos de tu migración`
            : "Estamos preparando tu migración"}
        </p>
      </div>

      {total > 0 ? (
        <div className="space-y-1.5" data-testid="lote-avance">
          <Progress value={porcentaje} size="sm" aria-label="Avance de la carga" />
          <p className="text-caption text-muted-foreground">
            <span className="font-mono tabular-nums">{procesadas.toLocaleString("es-CO")}</span> de{" "}
            <span className="font-mono tabular-nums">{total.toLocaleString("es-CO")}</span> filas revisadas.
            Cuando termine, la lista de trabajo aparece aquí.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Cuando termine, la lista de trabajo aparece aquí.</p>
      )}

      <p className="text-sm text-muted-foreground">
        Puedes cerrar esta pestaña — seguimos trabajando igual, y te avisamos con
        una notificación cuando termine.
      </p>

      {agotado ? (
        <div className="space-y-2 rounded-md border border-border bg-info-soft p-3">
          <p className="text-sm text-info">
            Esto está tardando más de lo esperado. Seguimos trabajando del lado
            del servidor — te avisamos apenas termine, no hace falta que esperes
            acá.
          </p>
          {onVerificarAhora ? (
            <Button
              size="sm"
              variant="outline"
              hideArrow
              disabled={verificando}
              isLoading={verificando}
              onClick={onVerificarAhora}
              data-testid="lote-verificar-ahora"
            >
              Ver si ya terminó
            </Button>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
