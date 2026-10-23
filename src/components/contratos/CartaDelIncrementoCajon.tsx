'use client';

/**
 * 🔴 La carta del incremento, tal como le llega al inquilino (19-10-2026).
 *
 * Juan (Portofino): «por ahí me salió lo de enviar las cartas de incrementos a
 * los clientes, pero no me salió qué tipo de carta enviamos… y ya la
 * enviamos». Y el CEO de Portofino quería ver qué fue lo que se envió.
 *
 * Antes «Enviar la carta» mandaba el correo con UN clic y el texto quedaba
 * escondido detrás de «Ver o corregir la carta»; una carta enviada decía sólo
 * «Enviada el …». Ahora las dos cosas pasan por este cajón:
 *
 *   · POR ENVIAR: el correo como sale —para, asunto y el texto en su papel—,
 *     la diferencia del mes ya facturado si la hay, «Corregir el texto» y
 *     «Enviar a <correo>». Lo que se ve es exactamente lo que se manda.
 *   · ENVIADA: lo que salió, a quién, cuándo y quién la envió (o la nota de
 *     quien la entregó por otro medio).
 */

import { useCallback, useEffect, useState } from 'react';
import { Collapse, CrossFade } from '@leasefy/cadence';
import { EnvelopeSimple, PaperPlaneTilt, PencilSimple } from '@phosphor-icons/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { useUltimoPresente } from '@/lib/hooks/use-ultimo-presente';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { plataEnPantalla } from '@/lib/plata/escribir-plata';
import { localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras';
import {
  cicloDeVidaApi,
  type CartaParaVer,
  type MedioDeLaCarta,
} from '@/lib/api/ciclo-de-vida.service';

/** La carta que se abre: de qué contrato y de qué aniversario. */
export interface CartaQueSeAbre {
  contractId: string;
  /** El aniversario, `AAAA-MM-DD`. */
  desde: string;
  /** «#1049 · Jesus David Rodriguez Rodriguez». */
  titulo: string;
  /**
   * Para enviar el texto que la persona ya está corrigiendo en otra pantalla
   * (la ficha del contrato): se muestra ese y no el guardado.
   */
  texto?: string;
}

const PESOS = plataEnPantalla(localeDeLasCifras, {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 2,
});

const MEDIO: Record<MedioDeLaCarta, string> = {
  CORREO: 'por correo',
  FISICO: 'en físico',
  WHATSAPP: 'por WhatsApp',
  OTRO: 'por otro medio',
};

/** «noviembre de 2026», desde `AAAA-MM`. */
function mesEnPalabras(mes: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(mes);
  if (!m) return mes;
  return new Date(Number(m[1]), Number(m[2]) - 1, 1).toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
  });
}

/** «19 de octubre de 2026», leyendo la parte `AAAA-MM-DD` (un día, no un instante). */
function diaEnPalabras(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** «19 de octubre de 2026, 4:12 p. m.», en la hora de Colombia. */
function momentoEnBogota(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

/** Un dato del encabezado del correo: «Para», «Asunto». */
function Dato({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-x-3 py-1.5 text-sm">
      <dt className="text-fg-muted">{rotulo}</dt>
      <dd className="min-w-0 break-words text-fg">{children}</dd>
    </div>
  );
}

export function CartaDelIncrementoCajon({
  carta: abierta,
  onCerrar,
  puedeEnviar,
  onEnviada,
}: {
  /** `null` = cerrado. */
  carta: CartaQueSeAbre | null;
  onCerrar: () => void;
  /** `contratos:edit`: sin él la carta se ve pero no se envía. */
  puedeEnviar: boolean;
  /** El correo salió: la pantalla de atrás vuelve a leer. */
  onEnviada?: () => void | Promise<void>;
}) {
  // Mientras sale, sigue mostrando la que mostraba (como los demás cajones).
  const carta = useUltimoPresente(abierta);
  const [datos, setDatos] = useState<CartaParaVer | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [texto, setTexto] = useState('');
  const [corrigiendo, setCorrigiendo] = useState(false);
  const [errorDelTexto, setErrorDelTexto] = useState<string | undefined>(undefined);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    if (!abierta) return;
    setError(null);
    setDatos(null);
    try {
      const leida = await cicloDeVidaApi.verCarta(abierta.contractId, abierta.desde);
      setDatos(leida);
      setTexto(leida.estado === 'POR_ENVIAR' && abierta.texto?.trim() ? abierta.texto : leida.contenido);
    } catch (e) {
      setError(e);
    }
  }, [abierta]);

  useEffect(() => {
    if (!abierta) return;
    setCorrigiendo(false);
    setErrorDelTexto(undefined);
    void cargar();
  }, [abierta, cargar]);

  const porEnviar = datos?.estado === 'POR_ENVIAR';
  const corregidaAqui = porEnviar && datos !== null && texto !== datos.contenido;

  const enviar = async () => {
    if (!carta || !datos) return;
    setEnviando(true);
    setErrorDelTexto(undefined);
    try {
      // Siempre el texto que se está viendo: lo que se ve es lo que sale.
      const r = await cicloDeVidaApi.enviarCarta(carta.contractId, carta.desde, texto);
      if (r.ultimoEnvio?.resultado === 'SIMULADA') {
        toast.error('La carta no salió.', { description: r.ultimoEnvio.mensaje });
      } else {
        toast.success(r.ultimoEnvio?.mensaje ?? 'Carta enviada.');
      }
      await onEnviada?.();
      await cargar();
    } catch (e) {
      const { porCampo, sueltos } = repartirErroresDelServidor(e, {
        campos: ['contenido'],
        porDefecto: 'No se pudo enviar la carta.',
        accion: 'enviar la carta',
      });
      if (porCampo.contenido) {
        setCorrigiendo(true);
        setErrorDelTexto(porCampo.contenido);
      }
      if (sueltos.length) {
        toast.error('No se pudo enviar la carta.', { description: sueltos.join(' · ') });
      }
    } finally {
      setEnviando(false);
    }
  };

  const sinCorreo = porEnviar && !datos?.para;
  const motivoParaNoEnviar = !puedeEnviar
    ? 'Para enviarla hace falta permiso para editar contratos.'
    : datos && !datos.envioHabilitado
      ? 'Falta una actualización de la base para enviar cartas.'
      : sinCorreo
        ? 'El contrato no tiene correo del inquilino: entrégala por otro medio y registra la constancia en el contrato.'
        : null;

  return (
    <Cajon
      abierto={abierta !== null}
      onOpenChange={(o) => !o && onCerrar()}
      tamano="lg"
      data-testid="cajon-carta-del-incremento"
    >
      <CajonCabecera titulo="Carta del incremento" descripcion={carta?.titulo}>
        {datos && (
          <div className="mt-2">
            {datos.estado === 'ENVIADA' ? (
              <Badge variant="success">Enviada</Badge>
            ) : (
              <Badge variant="warning">Por enviar</Badge>
            )}
          </div>
        )}
      </CajonCabecera>

      <CajonCuerpo className="space-y-5">
        <CrossFade swapKey={error ? 'error' : datos ? 'carta' : 'cargando'} direction="none">
          {error ? (
            <FalloDeCarga error={error} queEs="la carta" onReintentar={cargar} enmarcado={false} />
          ) : !datos ? (
            <div className="space-y-3" aria-busy="true" aria-label="Cargando la carta">
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
              <div className="h-48 animate-pulse rounded-lg bg-muted" />
            </div>
          ) : (
            <div className="space-y-5">
              {/* Qué fue, a quién y cuándo: lo primero que pregunta quien la abre. */}
              {datos.enviada && (
                <p className="rounded-lg border border-success/30 bg-success-soft px-4 py-3 text-sm text-fg" data-testid="carta-enviada-cuando">
                  {datos.enviada.medio === 'CORREO' || datos.enviada.medio === null ? (
                    <>
                      Salió por correo
                      {datos.enviada.at ? ` el ${momentoEnBogota(datos.enviada.at)}` : ''}
                      {datos.enviada.por ? `, la envió ${datos.enviada.por}` : ''}.
                    </>
                  ) : (
                    <>
                      Se entregó {MEDIO[datos.enviada.medio]}
                      {datos.enviada.at ? ` el ${diaEnPalabras(datos.enviada.at)}` : ''}
                      {datos.enviada.por ? `; lo registró ${datos.enviada.por}` : ''}.
                      {datos.enviada.constancia ? ` «${datos.enviada.constancia}»` : ''}
                    </>
                  )}
                </p>
              )}

              {/* El encabezado del correo. */}
              <dl className="divide-y divide-border rounded-lg border border-border px-4">
                <Dato rotulo="Para">
                  {datos.para ?? <span className="text-fg-muted">Sin correo del inquilino</span>}
                </Dato>
                <Dato rotulo="Asunto">{datos.asunto}</Dato>
                {datos.canonAnteriorCop !== null && datos.canonNuevoCop !== null && (
                  <Dato rotulo="Canon">
                    <span className="font-mono tabular-nums">
                      {PESOS.format(datos.canonAnteriorCop)} → {PESOS.format(datos.canonNuevoCop)}
                    </span>{' '}
                    desde el {diaEnPalabras(datos.desde)}
                  </Dato>
                )}
              </dl>

              {/* 🔴 La diferencia del mes ya facturado (Nico, 19-10-2026). */}
              {datos.reajuste && (
                <div
                  className="rounded-lg border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-fg"
                  data-testid="carta-reajuste"
                >
                  <p className="font-medium">
                    Diferencia de {mesEnPalabras(datos.reajuste.deMes)}:{' '}
                    <span className="font-mono tabular-nums">{PESOS.format(datos.reajuste.valorCop)}</span>
                  </p>
                  <p className="mt-1 text-fg-muted">
                    La factura de {mesEnPalabras(datos.reajuste.deMes)} ya salió con el canon anterior. Los días
                    que corren con el canon nuevo se suman a la factura de {mesEnPalabras(datos.reajuste.enMes)}, y
                    al propietario se le giran con ella. La carta se lo avisa al inquilino.
                  </p>
                </div>
              )}

              {/* El texto: en su papel, o para corregir. */}
              {porEnviar && corrigiendo ? (
                <div className="space-y-1">
                  <Textarea
                    id="texto-de-la-carta"
                    value={texto}
                    maxLength={10_000}
                    rows={14}
                    onChange={(e) => {
                      setTexto(e.target.value);
                      setErrorDelTexto(undefined);
                    }}
                    aria-label="Texto de la carta"
                    aria-invalid={errorDelTexto ? true : undefined}
                    aria-describedby="texto-de-la-carta-error"
                  />
                  <ErrorDelCampo id="texto-de-la-carta-error" mensaje={errorDelTexto} className="mt-0" />
                </div>
              ) : (
                <article
                  className="whitespace-pre-line rounded-lg border border-border bg-surface p-4 text-sm leading-6 text-fg sm:p-5"
                  aria-label="Texto de la carta"
                  data-testid="texto-de-la-carta"
                >
                  {texto || <span className="text-fg-muted">La carta no guardó su texto.</span>}
                </article>
              )}

              <Collapse open={porEnviar && (corregidaAqui || datos.corregida)}>
                <p className="text-caption text-fg-muted">
                  {corregidaAqui
                    ? 'Sale con tus cambios.'
                    : 'Este texto lo guardó una persona del equipo: sale tal cual.'}
                </p>
              </Collapse>

              {porEnviar && !datos.correoSaleDeVerdad && (
                <p className="text-caption text-warning-700 dark:text-warning-100">
                  El correo está apagado en esta copia de pruebas de Leasefy: enviarla no le llega a nadie ni deja
                  constancia. En producción sí se manda.
                </p>
              )}
            </div>
          )}
        </CrossFade>
      </CajonCuerpo>

      {porEnviar ? (
        <CajonPie
          ayuda={motivoParaNoEnviar ?? undefined}
          izquierda={
            puedeEnviar && datos?.envioHabilitado ? (
              corrigiendo ? (
                <Button
                  variant="ghost"
                  hideArrow
                  onClick={() => {
                    setTexto(datos?.contenido ?? '');
                    setCorrigiendo(false);
                    setErrorDelTexto(undefined);
                  }}
                >
                  Deshacer los cambios
                </Button>
              ) : (
                <Button variant="ghost" hideArrow className="gap-2" onClick={() => setCorrigiendo(true)}>
                  <PencilSimple className="h-4 w-4" aria-hidden="true" />
                  Corregir el texto
                </Button>
              )
            ) : undefined
          }
        >
          <Button
            hideArrow
            className="gap-2"
            onClick={() => void enviar()}
            disabled={enviando || motivoParaNoEnviar !== null || texto.trim() === ''}
            data-testid="enviar-la-carta"
          >
            <PaperPlaneTilt className="h-4 w-4" weight="bold" aria-hidden="true" />
            {enviando ? 'Enviando…' : datos?.para ? `Enviar a ${datos.para}` : 'Enviar la carta'}
          </Button>
        </CajonPie>
      ) : (
        <CajonPie>
          <Button variant="outline" hideArrow className="gap-2" onClick={onCerrar}>
            <EnvelopeSimple className="h-4 w-4" aria-hidden="true" />
            Cerrar
          </Button>
        </CajonPie>
      )}
    </Cajon>
  );
}
