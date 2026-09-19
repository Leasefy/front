'use client';

/**
 * 🔴 D6 · La bandeja de cartas del incremento (Nico, 17-09 ~03:10): «el canon
 * sube en la fecha + la carta se genera sola 30 días antes (configurable) en
 * una bandeja para enviar con un clic + alerta roja si llega el aniversario sin
 * constancia».
 *
 * Arriba las alertas rojas, después las por enviar, al final las enviadas del
 * último mes. Enviar es un clic (el clic es la revisión); se puede abrir la
 * carta para corregirla antes. La lista y el texto los arma el back.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { EnvelopeSimple } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import {
  cicloDeVidaApi,
  type BandejaDeCartas,
  type CartaEnLaBandeja,
} from '@/lib/api/ciclo-de-vida.service';
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion';

const PESOS = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export function BandejaDeCartasDelIncremento({ puedeEditar }: { puedeEditar: boolean }) {
  const [datos, setDatos] = useState<BandejaDeCartas | null>(null);
  const [error, setError] = useState<unknown>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setDatos(await cicloDeVidaApi.bandejaDeCartas());
    } catch (e) {
      setError(e);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (error) {
    return (
      <section className="rounded-lg border border-border bg-card p-5" data-testid="bandeja-de-cartas">
        <FalloDeCarga error={error} queEs="la bandeja de cartas del incremento" onReintentar={cargar} enmarcado={false} />
      </section>
    );
  }
  if (!datos) return null;

  /*
   * 🔴 Sin nada que enviar, esto es UNA LÍNEA y no una tarjeta (19-09-2026).
   *
   * Vive encima de la tabla de Renovaciones —183 filas en la agencia migrada—
   * y ocupaba una tarjeta entera para decir «No hay cartas por enviar», con su
   * título, sus tres contadores en cero y su párrafo explicativo. Reservarle el
   * lugar más valioso de la pantalla a un vacío estructural es lo mismo que le
   * pasaba a la bandeja del agente en `/pagos`, y se resuelve igual.
   *
   * No desaparece: si desapareciera, nadie sabría que las cartas existen ni que
   * salen solas. Se dice en un renglón, que es lo que el hecho pesa.
   */
  const nadaQueHacer = datos.cartas.length === 0 && datos.vencidasSinConstancia === 0;
  if (nadaQueHacer) {
    return (
      <p
        className="flex items-start gap-2 rounded-lg border border-border bg-card px-4 py-3 text-xs text-muted-foreground"
        data-testid="bandeja-de-cartas-vacia"
      >
        <EnvelopeSimple className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <span>
          <span className="font-medium text-foreground">Cartas del incremento:</span> ninguna por
          enviar. Cada carta aparece sola {datos.diasAntes} días antes del aniversario; el canon
          sube igual en la fecha, la carta es transparencia.
          {!datos.disponible && ' Falta una actualización de la base para poder enviarlas.'}
        </span>
      </p>
    );
  }

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-5" data-testid="bandeja-de-cartas">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <EnvelopeSimple className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Cartas del incremento</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          {datos.vencidasSinConstancia > 0 && (
            <span className="font-medium text-destructive">{datos.vencidasSinConstancia} sin constancia · </span>
          )}
          {datos.porEnviar} por enviar · {datos.enviadas} enviadas
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Cada carta aparece sola {datos.diasAntes} días antes del aniversario. El canon sube igual en la fecha; la carta
        es transparencia.
      </p>
      {!datos.disponible && (
        <p className="text-xs text-plan-status-yellow">
          Falta una actualización de la base: se ven las cartas, pero todavía no se pueden enviar.
        </p>
      )}
      {datos.cartas.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay cartas por enviar.</p>
      ) : (
        <ul className="divide-y divide-border">
          {datos.cartas.map((c) => (
            <Fila
              key={`${c.contractId}-${c.desde}`}
              carta={c}
              editable={puedeEditar && datos.disponible}
              onEnviada={cargar}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function Fila({
  carta,
  editable,
  onEnviada,
}: {
  carta: CartaEnLaBandeja;
  editable: boolean;
  onEnviada: () => Promise<void>;
}) {
  const [abierta, setAbierta] = useState(false);
  const [texto, setTexto] = useState(carta.contenido);
  const [ocupado, setOcupado] = useState(false);

  const enviar = async () => {
    setOcupado(true);
    try {
      const r = await cicloDeVidaApi.enviarCarta(
        carta.contractId,
        carta.desde,
        abierta && texto !== carta.contenido ? texto : undefined,
      );
      if (r.ultimoEnvio?.resultado === 'SIMULADA') {
        toast.error('La carta no salió.', { description: r.ultimoEnvio.mensaje });
      } else {
        toast.success(r.ultimoEnvio?.mensaje ?? 'Carta enviada.');
      }
      await onEnviada();
    } catch (e) {
      toast.error('No se pudo enviar la carta.', { description: mensajeDelFallo(e, 'Intenta de nuevo.') });
    } finally {
      setOcupado(false);
    }
  };

  return (
    <li
      className={`space-y-2 py-3 text-sm ${carta.alertaRoja ? 'rounded-md bg-destructive/5 px-2' : ''}`}
      data-testid={`carta-${carta.contractId}-${carta.desde}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Link href={`/panel/inmobiliaria/contratos/${carta.contractId}`} className="font-medium underline-offset-2 hover:underline">
          #{carta.externalId ?? carta.code} · {carta.inquilino ?? 'Sin inquilino'}
        </Link>
        <span>
          {PESOS.format(carta.canonAnteriorCop)} → <strong>{PESOS.format(carta.canonNuevoCop)}</strong> desde el{' '}
          {carta.desde}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{carta.inmueble}</p>
      {carta.alertaRoja ? (
        <p className="text-xs font-medium text-destructive">
          🔴 Llegó el aniversario ({carta.desde}) sin constancia de la carta.
        </p>
      ) : carta.estado === 'ENVIADA' ? (
        <p className="text-xs text-muted-foreground">
          Enviada el {carta.enviadaAt?.slice(0, 10)}
          {carta.medio ? ` (${carta.medio.toLowerCase()})` : ''}.
        </p>
      ) : (
        <p className="text-xs text-plan-status-yellow">Faltan {carta.diasParaElAniversario} días para el aniversario.</p>
      )}
      {carta.ultimoIntento && carta.estado !== 'ENVIADA' && (
        <p className="text-xs text-muted-foreground">Último intento: {carta.ultimoIntento}</p>
      )}
      {!carta.correoDelInquilino && carta.estado !== 'ENVIADA' && (
        <p className="text-xs text-muted-foreground">
          Sin correo del inquilino: entrégala por otro medio y registra la constancia en el contrato.
        </p>
      )}
      {editable && carta.estado !== 'ENVIADA' && (
        <div className="space-y-2">
          {abierta && (
            <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={7} aria-label="Texto de la carta" />
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => void enviar()}
              disabled={ocupado || !carta.correoDelInquilino}
              data-testid={`enviar-${carta.contractId}`}
            >
              Enviar la carta
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAbierta((v) => !v)}>
              {abierta ? 'Cerrar la carta' : 'Ver o corregir la carta'}
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
