'use client';

/**
 * Pedir el motivo antes de cancelar o rechazar una visita.
 *
 * 🔴 El back guarda el motivo desde siempre (`PropertyVisit.cancellationReason`
 * + `cancelledBy`) y la pantalla nunca lo pedía: el controller de la agencia
 * rellenaba con la frase enlatada «Gestionada por la inmobiliaria», así que en
 * la base TODAS las cancelaciones de una inmobiliaria decían exactamente lo
 * mismo — un dato que existe y no explica nada (Nico, 2026-09-04: «que se
 * puedan cancelar y dejar nota de por qué»).
 *
 * El motivo es OBLIGATORIO y con mínimo, igual que en el DTO público de visitas
 * (`CancelVisitDto`/`RejectVisitDto`, `@MinLength(10)`): del lado del inquilino
 * ya se exige, y no tiene sentido que la inmobiliaria —que es quien deja al
 * otro esperando— pueda cancelar sin decir por qué.
 *
 * ── El error va bajo el campo (Nico, 02-10-2026) ───────────────────────────
 *
 * Dos cosas pueden estar mal y las dos se dicen DEBAJO del motivo, con
 * `ErrorDelCampo` (entra suave y reemplaza la ayuda gris con un cruce), nunca
 * en un toast que se va solo mientras el diálogo sigue abierto:
 *
 *  · el motivo es más largo que `maximo` (el tope de la columna del back):
 *    se dice mientras se escribe y el botón no manda;
 *  · el back lo rechazó (`error`): quien llama pasa la frase y el diálogo
 *    queda abierto con lo escrito. Apenas se edita el texto, ese error se
 *    borra: lo nuevo ya no es lo que el back rechazó.
 *
 * Antes el campo tenía `maxLength`: pegar un texto largo lo cortaba en
 * silencio, y quien llamaba repetía el tope en un toast que nadie veía llegar.
 *
 * ── Cada llamador dice dónde queda su motivo (Nico, 02-10-2026) ────────────
 *
 * La ayuda decía siempre «…queda en el historial de la visita», también al
 * marcar perdido a un candidato del embudo, donde no hay visita. Y el ejemplo
 * del campo prometía «Lo va a leer quien esperaba la visita», pero el aviso
 * que le llega (`VISIT_CANCELLED`/`VISIT_REJECTED`) no lleva el motivo. Ahora
 * `ayuda` y `ejemplo` son obligatorias: quien llama dice a dónde va el motivo
 * de verdad (la visita cancelada → `cancellationReason`; la rechazada →
 * `rejectionReason`; el lead perdido → `lostReason`, «Razón de pérdida»).
 */

import { useEffect, useState } from 'react';
import { XCircle } from '@phosphor-icons/react';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { ApiError } from '@/lib/api/client';
import { camposDelError, mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';

/** El mismo mínimo que exige el back en el flujo del inquilino. */
export const MINIMO_DEL_MOTIVO = 10;

/** El tope del back para el motivo (cita: `reason`; pipeline: `lostReason`, `VarChar(500)`). */
export const MAX_LARGO_DEL_MOTIVO = 500;

/** La frase del tope, la MISMA del back (`MENSAJES_DEL_PIPELINE.motivoLargo`). */
export function fraseDelMotivoLargo(maximo: number): string {
  return `El motivo puede tener hasta ${maximo.toLocaleString('es-CO')} caracteres.`;
}

export interface OpcionesDelRechazo {
  /**
   * Cómo se llama el motivo en el cuerpo que se mandó (`lostReason`,
   * `reason`). Si el back trae `campos` con ése, va SU frase.
   */
  campo: string;
  /** Lo que se dice si el error no trae nada legible. */
  porDefecto: string;
  /** Lo que se estaba haciendo, para el texto de un 5xx («marcar el lead como perdido»). */
  accion: string;
}

/**
 * La frase que va bajo el motivo cuando el back dice que no, o `null` si no
 * hay nada que decir (401: el cliente ya está cerrando la sesión).
 *
 * El diálogo tiene un solo campo, así que el pie del formulario y «bajo el
 * campo» son el mismo lugar: también un 409 de estado o un 5xx van ahí, por
 * el traductor (un 5xx dice que fue nuestro, con la referencia; «conexión»
 * sólo sin respuesta). Lo que se pierde con un toast es justo esto: el
 * diálogo sigue abierto con lo escrito y el porqué ya se fue.
 */
export function mensajeDelRechazoDelMotivo(
  error: unknown,
  { campo, porDefecto, accion }: OpcionesDelRechazo,
): string | null {
  if (error instanceof ApiError && error.status === 401) return null;
  const delMotivo = camposDelError(error).find((c) => (c.campo.split('.').pop() ?? c.campo) === campo);
  if (delMotivo) return delMotivo.mensaje;
  return mensajeParaLaPersona(error, { porDefecto, accion });
}

interface Props {
  abierto: boolean;
  titulo: string;
  descripcion: string;
  /** Qué dice el botón que confirma («Cancelar la visita», «Rechazarla»). */
  etiquetaConfirmar: string;
  enviando?: boolean;
  /**
   * La ayuda bajo el campo cuando el motivo ya sirve: DÓNDE queda guardado,
   * según quien llama (verificado en el back, nunca supuesto).
   */
  ayuda: string;
  /** El ejemplo dentro del campo vacío, propio de quien llama. */
  ejemplo: string;
  /** El tope del campo en el back. Por defecto, 500. */
  maximo?: number;
  /**
   * Lo que respondió el back al confirmar (ver `mensajeDelRechazoDelMotivo`),
   * o `null`. Quien llama lo limpia antes de volver a mandar.
   */
  error?: string | null;
  onCerrar: () => void;
  onConfirmar: (motivo: string) => void;
}

const ID_DEL_CAMPO = 'motivo-de-la-agenda';
const ID_DEL_ERROR = `${ID_DEL_CAMPO}-error`;

export function MotivoDialog({
  abierto,
  titulo,
  descripcion,
  etiquetaConfirmar,
  enviando = false,
  ayuda,
  ejemplo,
  maximo = MAX_LARGO_DEL_MOTIVO,
  error = null,
  onCerrar,
  onConfirmar,
}: Props) {
  const [motivo, setMotivo] = useState('');
  // El rechazo del back describe el texto que se mandó: al editarlo deja de
  // valer. Vuelve a verse con el próximo `error` que llegue.
  const [errorEditado, setErrorEditado] = useState(false);

  // Que no arrastre el texto de la vez anterior: si alguien cancela dos visitas
  // seguidas, el motivo de la primera no es el de la segunda.
  useEffect(() => {
    if (abierto) setMotivo('');
  }, [abierto]);

  useEffect(() => {
    setErrorEditado(false);
  }, [error]);

  const largo = motivo.trim().length;
  const falta = MINIMO_DEL_MOTIVO - largo;
  const sirve = falta <= 0;
  const muyLargo = largo > maximo ? fraseDelMotivoLargo(maximo) : null;
  const mensaje = muyLargo ?? (errorEditado ? null : error);

  return (
    <AlertDialog open={abierto} onOpenChange={(a) => !a && !enviando && onCerrar()}>
      {/* Rechazar o cancelar una visita y marcar perdido a un candidato: algo
          se cae, así que es destructiva (medallón y botón rojos). */}
      <AlertDialogContent
        variant="destructive"
        icon={<XCircle weight="bold" />}
        data-testid="motivo-dialog"
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descripcion}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-1.5">
          <label htmlFor={ID_DEL_CAMPO} className="text-sm font-medium text-fg">
            Motivo
          </label>
          <Textarea
            id={ID_DEL_CAMPO}
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              if (error) setErrorEditado(true);
            }}
            rows={3}
            disabled={enviando}
            placeholder={ejemplo}
            aria-invalid={mensaje ? true : undefined}
            aria-describedby={mensaje ? ID_DEL_ERROR : undefined}
            data-testid="motivo-texto"
          />
          {/* La ayuda dice cuánto FALTA, no cuánto va (el botón apagado sin
              explicación es un callejón); el error la reemplaza con un cruce. */}
          <ErrorDelCampo
            id={ID_DEL_ERROR}
            mensaje={mensaje}
            className="mt-0"
            pista={
              sirve
                ? ayuda
                : `Escribe ${falta} ${falta === 1 ? 'carácter' : 'caracteres'} más.`
            }
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={enviando}>Volver</AlertDialogCancel>
          <AlertDialogAction
            disabled={!sirve || muyLargo !== null}
            loading={enviando}
            onClick={(e) => {
              // El motivo se manda acá; sin `preventDefault` el diálogo se
              // cierra antes de que la llamada termine y el error no se ve.
              e.preventDefault();
              if (!sirve || muyLargo) return;
              onConfirmar(motivo.trim());
            }}
            data-testid="motivo-confirmar"
          >
            {etiquetaConfirmar}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
