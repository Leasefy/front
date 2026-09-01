"use client";

/**
 * Ítem 1 del brief WU-4 — "que la carga se realice y mantenga al usuario
 * esperando, pero si cierra la ventana que la carga siga… y cuando termine
 * llegue una notificación" (el owner).
 *
 * Se muestra mientras un lote sigue `ENCOLADO`/`PROCESANDO`
 * (`use-estado-de-lote.ts`, contrato §3.2.A2). El sondeo que alimenta esto
 * es una CONVENIENCIA mientras la pestaña sigue abierta — nunca el
 * mecanismo de finalización, así que el mensaje de "podés cerrar esta
 * pestaña" no es cosmético: es la garantía real (el lote es durable
 * server-side, WU-2, y la notificación llega igual — contrato §3.2.C).
 */

import { Clock, XCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { EstadoDeLote } from "@/lib/api/contracts.service";

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
          Ningún contrato se creó. Tu archivo no se modifica: corregí lo que
          diga el error de arriba y volvé a subirlo.
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
  const procesadas = estado?.procesadas ?? 0;
  const porcentaje = total > 0 ? Math.round((procesadas / total) * 100) : 0;

  return (
    <Card className="space-y-4 p-6" data-testid="lote-progreso">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 animate-pulse text-primary" />
        <p className="text-sm font-medium text-foreground">
          Estamos preparando tu migración
        </p>
      </div>

      {total > 0 ? (
        <div className="space-y-1.5">
          {/* El back escribe `procesadas` recién al terminar el lote: hasta
              entonces una barra en 0 % parece colgada. Se muestra movimiento
              sin inventar un número. */}
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
            {procesadas > 0 ? (
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${porcentaje}%` }}
              />
            ) : (
              <div
                className="h-full w-1/3 animate-pulse rounded-full bg-primary"
                data-testid="lote-progreso-indeterminado"
              />
            )}
          </div>
          <p className="text-xs tabular-nums text-muted-foreground">
            {procesadas > 0
              ? `${procesadas} / ${total} filas procesadas`
              : `Preparando ${total} filas — el conteo aparece cuando termine.`}
          </p>
        </div>
      ) : null}

      <p className="text-sm text-muted-foreground">
        Podés cerrar esta pestaña — seguimos trabajando igual, y te avisamos con
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
