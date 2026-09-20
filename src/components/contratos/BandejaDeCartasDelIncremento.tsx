'use client';

/**
 * 🔴 D6 · Las cartas del incremento (Nico, 17-09 ~03:10): «el canon sube en la
 * fecha + la carta se genera sola 30 días antes (configurable) en una bandeja
 * para enviar con un clic + alerta roja si llega el aniversario sin
 * constancia».
 *
 * ── 🔴 De lista infinita a TABLERO (Nico, 19-09-2026) ───────────────────────
 *
 * «Es una lista enorme… quizás un tablero que contenga diferente información y
 * de ahí amplío la información si es que son urgentes, críticas etc… y poder
 * ir abriendo esos caminos en la navegación, porque es larguísima esa lista y
 * ni se ve la tabla que hay en la parte de abajo.»
 *
 * Tenía razón y el número lo dice: en la agencia migrada hay **57 cartas** (17
 * sin constancia + 40 por enviar), cada una de cuatro renglones. Eso son unos
 * 5.700 px de lista ENCIMA de la tabla de Renovaciones — la pantalla a la que
 * uno venía. Una cola de trabajo de 57 ítems no es un aviso: es una pantalla.
 *
 * Así que esto quedó como el TABLERO —tres losetas con su conteo, la roja
 * primero— y la cola se mudó a su propia ruta,
 * `/contratos/renovaciones/cartas`, con el buscador, el filtro por estado y la
 * paginación de la casa. Cada loseta es un ENLACE que abre la cola ya filtrada:
 * ése es el «camino» que pedía.
 *
 * Sin nada que enviar y sin vencidas es UNA línea. No desaparece: si
 * desapareciera, nadie sabría que las cartas existen ni que salen solas.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { EnvelopeSimple, WarningCircle } from '@phosphor-icons/react';

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

/** La cola completa. El tablero lleva acá, con el estado en la URL. */
export const RUTA_DE_LAS_CARTAS = '/panel/inmobiliaria/contratos/renovaciones/cartas';

/**
 * «20 ene 2026», leyendo la parte `YYYY-MM-DD`.
 *
 * 🔴 19-09 (visto en el navegador): la cola mostraba las fechas CRUDAS
 * —«desde el 2026-01-20», «Llegó el aniversario (2026-01-20)»— en la única
 * pantalla donde la fecha es el dato que decide si hay que correr. Ninguna
 * otra pantalla del panel escribe una fecha así.
 *
 * Se leen las partes en vez de `new Date(iso)` porque `desde` es un DATE que
 * viaja como medianoche UTC y en Bogotá cae al día anterior: la misma trampa
 * que ya mordió en Renovaciones y en el estado de cuenta.
 */
export function fechaCorta(iso: string | null | undefined): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!partes) return '—';
  return new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]))
    .toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
    .replace(/ de /g, ' ')
    .replace(/\.$/, '');
}

export const PESOS = new Intl.NumberFormat('es-CO', {
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
    <section
      className="space-y-4 rounded-lg border border-border bg-card p-5"
      data-testid="bandeja-de-cartas"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <EnvelopeSimple className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Cartas del incremento</h2>
        </div>
        <Link
          href={RUTA_DE_LAS_CARTAS}
          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          data-testid="abrir-cola-de-cartas"
        >
          Abrir la cola →
        </Link>
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

      {/* 🔴 El tablero: tres losetas, la roja primero, cada una un camino a la
          cola ya filtrada. Antes acá empezaban 57 cartas de cuatro renglones. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" data-testid="tablero-de-cartas">
        <Loseta
          testid="sin-constancia"
          rotulo="Sin constancia"
          cuantas={datos.vencidasSinConstancia}
          detalle="El aniversario ya pasó y no hay constancia."
          urgente
        />
        <Loseta
          testid="por-enviar"
          rotulo="Por enviar"
          cuantas={datos.porEnviar}
          detalle={`El aniversario llega en menos de ${datos.diasAntes} días.`}
        />
        <Loseta
          testid="enviadas"
          rotulo="Enviadas"
          cuantas={datos.enviadas}
          detalle="Con su constancia guardada."
        />
      </div>
    </section>
  );
}

/** Una loseta del tablero: el conteo ES el camino a esa parte de la cola. */
function Loseta({
  rotulo,
  cuantas,
  detalle,
  urgente = false,
  testid,
}: {
  rotulo: string;
  cuantas: number;
  detalle: string;
  urgente?: boolean;
  testid: string;
}) {
  return (
    <Link
      href={`${RUTA_DE_LAS_CARTAS}?estado=${testid}`}
      data-testid={`loseta-${testid}`}
      className={`block rounded-lg border p-3 transition-colors hover:bg-surface-muted ${
        urgente && cuantas > 0 ? 'border-destructive/40 bg-destructive/5' : 'border-border'
      }`}
    >
      <p className="text-xs text-muted-foreground">{rotulo}</p>
      <p
        className={`font-mono text-2xl font-semibold tabular-nums ${
          urgente && cuantas > 0 ? 'text-destructive' : 'text-foreground'
        }`}
      >
        {cuantas}
      </p>
      <p className="text-caption text-muted-foreground">{detalle}</p>
    </Link>
  );
}

export function Fila({
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
          {fechaCorta(carta.desde)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{carta.inmueble}</p>
      {carta.alertaRoja ? (
        <p className="flex items-start gap-1.5 text-xs font-medium text-destructive">
          {/* 🔴 Acá había un emoji 🔴 literal, el mismo que uso en los
              comentarios del código: se filtró a la cara del usuario. El panel
              marca las alertas con iconos, no con emojis. */}
          <WarningCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" weight="fill" aria-hidden="true" />
          <span>Llegó el aniversario ({fechaCorta(carta.desde)}) sin constancia de la carta.</span>
        </p>
      ) : carta.estado === 'ENVIADA' ? (
        <p className="text-xs text-muted-foreground">
          Enviada el {fechaCorta(carta.enviadaAt)}
          {carta.medio ? ` (${carta.medio.toLowerCase()})` : ''}.
        </p>
      ) : (
        <p className="text-xs text-plan-status-yellow">Faltan {carta.diasParaElAniversario} días para el aniversario.</p>
      )}
      {carta.ultimoIntento && carta.estado !== 'ENVIADA' && (
        <p className="text-xs text-muted-foreground">Último intento: {fechaCorta(carta.ultimoIntento)}</p>
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
