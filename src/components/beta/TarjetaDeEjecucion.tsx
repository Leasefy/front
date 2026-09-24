'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Progress, StatusBadge, type SemanticTone } from '@leasefy/cadence';
import {
  ArrowCounterClockwise,
  CalendarBlank,
  CaretDown,
  CheckCircle,
  CurrencyCircleDollar,
  HourglassMedium,
  Info,
  PaperPlaneTilt,
  Receipt,
  ShieldCheck,
  Stack,
  UsersThree,
  WarningCircle,
  WarningOctagon,
  XCircle,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { CasillasDeCodigo } from '@/components/ui/casillas-de-codigo';
import { useAuth } from '@/lib/auth/use-auth';
import { useBetaChatContext } from '@/lib/context/BetaChatContext';
import { useI18n } from '@/lib/i18n';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';
import { getSupabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { respuestaDeLaPropuesta, type IntencionDelChat } from '@/lib/chat/acciones-del-hilo';
import {
  elTextoRepiteLaTarjeta,
  hitoDeLaCuenta,
  relojDeLaCuenta,
  riesgosNombrados,
  segundosQueFaltan,
  vistaPreviaLegible,
  type BotonDeLaTarjeta,
  type DatoDeLaVistaPrevia,
  type DobleControlDeLaEjecucion,
  type RiesgoDeLaEjecucion,
  type RiesgoNombrado,
  type TablaDeLaVistaPrevia,
  type TarjetaDeEjecucion as Tarjeta,
  type TarjetaEnCurso,
  type TarjetaError,
  type TarjetaProgramada,
  type TarjetaPropuesta,
  type TarjetaResultado,
  type VistaPreviaDeLaEjecucion,
} from '@/lib/chat/tarjetas-de-ejecucion';
import { esEstadoFinal, useProcesoDelChat } from '@/lib/chat/use-proceso-del-chat';
import type { ChatMessage } from '@/lib/types/beta-chat';
import { CajaDelChat } from './CajaDelChat';
import { FILAS_A_LA_VISTA, filasQueSeOcultan } from './RespuestaConForma';

/**
 * TarjetaDeEjecucion — lo que el EJECUTOR del chat hizo o va a hacer, en UNA
 * caja del chat (24-09-2026, paquete F del chat piloto; §4.1 de la
 * arquitectura).
 *
 *   Propuesta   — la frase, la vista previa (lo que va a quedar), los riesgos
 *                 con su palabra, el doble control de P-4 y «Hacerlo» / «No».
 *   En curso    — la barra `hechos / total` del Centro de procesos y
 *                 «Cancelar» si el back dice que se puede.
 *   Resultado   — lo que pasó y «Deshacer» si la tarjeta lo trae; en la gracia
 *                 de P-10, la cuenta regresiva («Se envía en 0:45 · Deshacer»).
 *   Programada  — «Lo programé para mañana a las 8:00 a. m.», con el botón de
 *                 no mandarlo si el micro lo ofrece.
 *   Error       — el mensaje del back tal cual, quién sí puede y el segundo
 *                 factor, que se confirma AQUÍ y vuelve a pedir la acción.
 *
 * Reglas de Nico que esto no puede romper:
 *   · Todo dentro del chat: cada botón es un MENSAJE DE LA PERSONA con su
 *     intención (o, en «Cancelar» del proceso, la misma llamada del Centro de
 *     procesos). Nada navega (guardián `chat-sin-salidas`).
 *   · Cada bloque en UNA caja con cabecera, contenido y pie; sin scroll
 *     vertical propio (guardián `chat-sin-scroll-anidado`).
 *   · La respuesta se lee desde su comienzo: nada de esto mueve el scroll, y
 *     la cuenta y la barra cambian sin cambiar de alto.
 *   · Ningún botón se inventa: «Deshacer», «Cancelar» y el segundo factor
 *     salen sólo si la tarjeta (o el Centro de procesos) los trae; el micro ya
 *     filtró por permiso.
 */

// ── Mandar un mensaje de la persona ─────────────────────────────────────────

export function useMandar() {
  const { sendMessage, isThinking, isStreaming, isAgentsRunning } = useBetaChatContext();
  const ocupado = isThinking || isStreaming || isAgentsRunning;
  return {
    ocupado,
    mandar: (texto: string, intencion: IntencionDelChat) => {
      if (ocupado) return;
      sendMessage(texto, { intencion });
    },
  };
}

/** El `propuestaId` sobre el que actúa un botón (para saber si ya se contestó). */
function propuestaDelBoton(b: BotonDeLaTarjeta | null, respaldo: string): string {
  return b && 'propuestaId' in b.intencion ? b.intencion.propuestaId : respaldo;
}

export function TarjetaDeEjecucion({
  tarjeta,
  message,
  posteriores,
}: {
  tarjeta: Tarjeta;
  message: Pick<ChatMessage, 'id' | 'content' | 'ensayo'>;
  posteriores: ChatMessage[];
}) {
  // El texto de la respuesta ya dijo el resumen: la tarjeta no lo repite.
  const repite = elTextoRepiteLaTarjeta(message.content, tarjeta);
  const comun = { messageId: message.id, posteriores, ensayo: message.ensayo === true, repite };
  switch (tarjeta.tipo) {
    case 'propuesta':
      return <TarjetaDePropuesta t={tarjeta} {...comun} />;
    case 'en_curso':
      return <TarjetaEnCursoDelHilo t={tarjeta} {...comun} />;
    case 'resultado':
      return <TarjetaDeResultadoDelHilo t={tarjeta} {...comun} />;
    case 'programada':
      return <TarjetaProgramadaDelHilo t={tarjeta} {...comun} />;
    case 'error':
      return <TarjetaDeErrorDelHilo t={tarjeta} {...comun} />;
  }
}

interface PropsComunes {
  messageId: string;
  posteriores: ChatMessage[];
  ensayo: boolean;
  /** El texto de la respuesta ya dice el resumen de la tarjeta. */
  repite: boolean;
}

// ── La cabecera: qué es y en qué estado está ────────────────────────────────

export function Estado({ tono, texto, pulso, ensayo }: { tono: SemanticTone; texto: string; pulso?: boolean; ensayo?: boolean }) {
  const { t } = useI18n();
  return (
    <span className="flex flex-wrap items-center justify-end gap-1.5">
      {ensayo && <StatusBadge tone="neutral">{t('beta.enElChat.tarjeta.estado.ensayo')}</StatusBadge>}
      {/* El estado nunca sólo con color: el punto va con su palabra. */}
      <StatusBadge tone={tono} pulse={pulso}>
        {texto}
      </StatusBadge>
    </span>
  );
}

/** El pie con alto fijo: cambiar la cuenta por «Enviándolo…» o quitar un botón no mueve lo de abajo. */
export function Pie({ children }: { children: ReactNode }) {
  return <div className="flex min-h-9 w-full flex-wrap items-center gap-2">{children}</div>;
}

// ── Propuesta ───────────────────────────────────────────────────────────────

function TarjetaDePropuesta({ t: p, posteriores, ensayo }: PropsComunes & { t: TarjetaPropuesta }) {
  const { t } = useI18n();
  const { mandar, ocupado } = useMandar();
  const respuesta = respuestaDeLaPropuesta(p.ejecucionId, posteriores);
  const vencida = !respuesta && p.venceEn !== null && Date.parse(p.venceEn) < Date.now();
  const abierta = !respuesta && !vencida;
  const enEnsayo = ensayo || p.ensayo;

  return (
    <CajaDelChat
      role="region"
      aria-label={p.titulo || p.frase}
      data-testid="tarjeta-de-ejecucion"
      data-tipo="propuesta"
      data-estado={respuesta ?? (vencida ? 'vencida' : 'abierta')}
      titulo={p.titulo}
      conteo={
        <Estado
          tono={abierta ? 'info' : 'neutral'}
          texto={t(
            abierta
              ? 'beta.enElChat.tarjeta.estado.propuesta'
              : vencida
                ? 'beta.enElChat.tarjeta.estado.vencida'
                : 'beta.enElChat.tarjeta.estado.respondida',
          )}
          ensayo={enEnsayo}
        />
      }
      pie={
        <Pie>
          {abierta ? (
            <>
              <Button
                size="sm"
                hideArrow
                disabled={ocupado}
                onClick={() =>
                  mandar(t('beta.enElChat.mensaje.si'), { accion: 'confirmar', propuestaId: p.ejecucionId })
                }
              >
                {t('beta.enElChat.tarjeta.propuesta.hacerlo')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                hideArrow
                disabled={ocupado}
                onClick={() =>
                  mandar(t('beta.enElChat.mensaje.no'), { accion: 'cancelar', propuestaId: p.ejecucionId })
                }
              >
                {t('beta.enElChat.tarjeta.propuesta.no')}
              </Button>
            </>
          ) : (
            <p className="font-body text-[14px] text-fg-muted">
              {vencida
                ? t('beta.enElChat.confirmacion.vencida')
                : t(
                    respuesta === 'confirmar'
                      ? 'beta.enElChat.tarjeta.propuesta.dijisteSi'
                      : 'beta.enElChat.tarjeta.propuesta.dijisteNo',
                  )}
            </p>
          )}
        </Pie>
      }
    >
      <p className="font-body text-[15px] leading-relaxed text-fg">
        {p.frase} <strong className="font-semibold">{p.pregunta}</strong>
      </p>
      {p.porQue && <p className="mt-1.5 font-body text-[14px] leading-snug text-fg-muted">{p.porQue}</p>}
      {/* §4.1: la frase, lo que va a quedar, lo que implica… y justo encima
          de «Hacerlo», los riesgos, para decidir con ellos a la vista. */}
      {p.vistaPrevia && <VistaPrevia vista={p.vistaPrevia} />}
      <RiesgosDeLaAccion riesgo={p.riesgo} />
      {p.dobleControl && <DobleControl dc={p.dobleControl} />}
      {p.siConfirmas.sale === 'programada' && p.siConfirmas.cuando && (
        <p className="mt-3 flex items-start gap-2 font-body text-[14px] leading-snug text-fg">
          <CalendarBlank className="mt-0.5 size-4 shrink-0 text-fg-muted" aria-hidden />
          {t('beta.enElChat.tarjeta.propuesta.programada', { cuando: p.siConfirmas.cuando })}
        </p>
      )}
      {enEnsayo && (
        <p className="mt-3 flex items-start gap-2 font-body text-[14px] leading-snug text-fg-muted">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t('beta.enElChat.tarjeta.propuesta.ensayo')}
        </p>
      )}
    </CajaDelChat>
  );
}

// ── Los riesgos, con su palabra ─────────────────────────────────────────────

const ICONO_DEL_RIESGO: Record<RiesgoNombrado, ReactNode> = {
  irreversible: <WarningOctagon weight="duotone" className="size-4 shrink-0" aria-hidden />,
  plata: <CurrencyCircleDollar weight="duotone" className="size-4 shrink-0" aria-hidden />,
  fiscal: <Receipt weight="duotone" className="size-4 shrink-0" aria-hidden />,
  terceros: <PaperPlaneTilt weight="duotone" className="size-4 shrink-0" aria-hidden />,
  masiva: <Stack weight="duotone" className="size-4 shrink-0" aria-hidden />,
  dobleControl: <UsersThree weight="duotone" className="size-4 shrink-0" aria-hidden />,
};

export function RiesgosDeLaAccion({ riesgo }: { riesgo: RiesgoDeLaEjecucion }) {
  const { t } = useI18n();
  const lista = riesgosNombrados(riesgo);
  if (lista.length === 0) return null;
  return (
    <ul
      aria-label={t('beta.enElChat.tarjeta.riesgo.titulo')}
      data-testid="riesgos-de-la-accion"
      className="mt-3 flex flex-wrap gap-2"
    >
      {lista.map((r) => (
        <li
          key={r}
          data-riesgo={r}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-body text-[13px] leading-none',
            // Gris primero; lo que no tiene vuelta atrás, en rojo (y con su palabra).
            r === 'irreversible' ? 'bg-danger-soft text-danger' : 'bg-surface-muted text-fg',
          )}
        >
          {ICONO_DEL_RIESGO[r]}
          {r === 'masiva' && riesgo.tope !== null
            ? t('beta.enElChat.tarjeta.riesgo.masivaConTope', { tope: formatNumber(riesgo.tope) })
            : t(`beta.enElChat.tarjeta.riesgo.${r}`)}
        </li>
      ))}
    </ul>
  );
}

// ── Doble control (P-4) ─────────────────────────────────────────────────────

function DobleControl({ dc }: { dc: DobleControlDeLaEjecucion }) {
  const { t } = useI18n();
  const principal = t(
    dc.laOtraMitad === 'la_puedes_hacer_tu'
      ? 'beta.enElChat.tarjeta.dobleControl.laPuedesHacerTu'
      : 'beta.enElChat.tarjeta.dobleControl.otraPersona',
  );
  return (
    <div data-testid="doble-control" data-otra-mitad={dc.laOtraMitad} className="mt-3 flex items-start gap-2">
      {dc.laOtraMitad === 'la_puedes_hacer_tu' ? (
        <ShieldCheck weight="duotone" className="mt-0.5 size-4 shrink-0 text-fg-muted" aria-hidden />
      ) : (
        <UsersThree weight="duotone" className="mt-0.5 size-4 shrink-0 text-fg-muted" aria-hidden />
      )}
      <div className="min-w-0 font-body text-[14px] leading-snug">
        <p className="font-medium text-fg">{principal}</p>
        {dc.frase && dc.frase !== principal && <p className="mt-0.5 text-fg-muted">{dc.frase}</p>}
      </div>
    </div>
  );
}

// ── La vista previa: lo que va a quedar ─────────────────────────────────────

function valorLegible(
  v: string | number | boolean | null,
  formato: DatoDeLaVistaPrevia['formato'],
  t: (k: string) => string,
): string {
  if (v === null) return '—';
  switch (formato) {
    case 'moneda':
      return typeof v === 'number' ? formatCurrency(v) : String(v);
    case 'numero':
      return typeof v === 'number' ? formatNumber(v) : String(v);
    case 'fecha':
      return typeof v === 'string' ? formatDate(v) : String(v);
    case 'booleano':
      return v === true ? t('beta.enElChat.tarjeta.vistaPrevia.si') : t('beta.enElChat.tarjeta.vistaPrevia.no');
    default:
      return String(v);
  }
}

const esCifra = (f: DatoDeLaVistaPrevia['formato']) => f === 'moneda' || f === 'numero' || f === 'fecha';

/** «Ver N más» dentro de la caja: sólo si quedarían 3 o más escondidas (nunca una sola). */
function VerMas({ ocultas, abierto, onClick, controla }: { ocultas: number; abierto: boolean; onClick: () => void; controla: string }) {
  const { t } = useI18n();
  return (
    <Button
      size="sm"
      variant="outline"
      hideArrow
      className="mt-2 h-auto min-h-9 max-w-full gap-1.5 whitespace-normal py-1.5 text-left"
      aria-expanded={abierto}
      aria-controls={controla}
      onClick={onClick}
    >
      {abierto
        ? t('beta.enElChat.tarjeta.vistaPrevia.verMenos')
        : t('beta.enElChat.tarjeta.vistaPrevia.verMas', { n: formatNumber(ocultas) })}
      <CaretDown
        aria-hidden
        className={cn('size-4 transition-transform duration-200 motion-reduce:transition-none', abierto && 'rotate-180')}
      />
    </Button>
  );
}

function VistaPrevia({ vista }: { vista: VistaPreviaDeLaEjecucion }) {
  const { t } = useI18n();
  const legible = vista.estado === 'ok' && !vista.recortada ? vistaPreviaLegible(vista.datos) : { datos: [], tablas: [] };
  const vacia = legible.datos.length === 0 && legible.tablas.length === 0;
  const idDeLosDatos = useId();
  const [todos, setTodos] = useState(false);
  const ocultos = filasQueSeOcultan(legible.datos.length);
  const datos = todos || ocultos === 0 ? legible.datos : legible.datos.slice(0, FILAS_A_LA_VISTA);

  return (
    <section
      aria-label={t('beta.enElChat.tarjeta.vistaPrevia.titulo')}
      data-testid="vista-previa"
      className="mt-4 border-t border-border-faint pt-3"
    >
      <h3 className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
        {t('beta.enElChat.tarjeta.vistaPrevia.titulo')}
      </h3>
      {vacia ? (
        <p className="mt-2 flex items-start gap-2 font-body text-[14px] leading-snug text-fg-muted">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          {vista.explicacion ?? t('beta.enElChat.tarjeta.vistaPrevia.sinVistaPrevia')}
        </p>
      ) : (
        <>
          {datos.length > 0 && (
            // Dos columnas que parten línea: un valor largo no empuja la caja a 390 px.
            <dl id={idDeLosDatos} className="mt-2 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-4 gap-y-1.5 font-body text-[14px]">
              {datos.map((d) => (
                <div key={d.clave} className="contents">
                  <dt className="min-w-0 break-words text-fg-muted">{d.etiqueta}</dt>
                  <dd className={cn('min-w-0 break-words text-right text-fg', esCifra(d.formato) && 'font-mono tabular-nums')}>
                    {valorLegible(d.valor, d.formato, t)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {ocultos > 0 && (
            <VerMas ocultas={ocultos} abierto={todos} controla={idDeLosDatos} onClick={() => setTodos((v) => !v)} />
          )}
          {legible.tablas.map((tabla) => (
            <TablaDeLaVista key={tabla.clave} tabla={tabla} />
          ))}
        </>
      )}
    </section>
  );
}

function TablaDeLaVista({ tabla }: { tabla: TablaDeLaVistaPrevia }) {
  const { t } = useI18n();
  const id = useId();
  const [todas, setTodas] = useState(false);
  const ocultas = filasQueSeOcultan(tabla.filas.length);
  const filas = todas || ocultas === 0 ? tabla.filas : tabla.filas.slice(0, FILAS_A_LA_VISTA);
  return (
    <div className="mt-3">
      <p className="font-body text-[14px] font-medium text-fg">
        {tabla.titulo} <span className="font-mono text-[13px] font-normal tabular-nums text-fg-muted">· {formatNumber(tabla.filas.length)}</span>
      </p>
      {/* A lo ancho, dentro de la caja (390 px); 🔴 nunca en vertical: la
          rueda encima de la tabla mueve el chat (Nico, 24-09 00:15). */}
      <div className="-mx-4 mt-1.5 overflow-x-auto overflow-y-hidden overscroll-x-contain">
        <table id={id} className="w-full border-collapse font-body text-[14px]">
          <thead>
            <tr className="border-b border-border-faint">
              {tabla.columnas.map((c) => (
                <th
                  key={c.clave}
                  scope="col"
                  className={cn(
                    'whitespace-nowrap px-4 py-1.5 font-mono text-[11px] font-normal uppercase tracking-[0.06em] text-fg-subtle',
                    esCifra(c.formato) ? 'text-right' : 'text-left',
                  )}
                >
                  {c.titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={i} className="border-b border-border-faint last:border-b-0">
                {tabla.columnas.map((c) => (
                  <td
                    key={c.clave}
                    className={cn(
                      'px-4 py-1.5 text-fg',
                      esCifra(c.formato) ? 'whitespace-nowrap text-right font-mono tabular-nums' : 'min-w-[7rem] max-w-[13rem]',
                    )}
                  >
                    {valorLegible(f[c.clave] ?? null, c.formato, t)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {ocultas > 0 && <VerMas ocultas={ocultas} abierto={todas} controla={id} onClick={() => setTodas((v) => !v)} />}
    </div>
  );
}

// ── En curso ────────────────────────────────────────────────────────────────

function TarjetaEnCursoDelHilo({ t: c, messageId, ensayo, repite }: PropsComunes & { t: TarjetaEnCurso }) {
  const { t } = useI18n();
  const { refrescarEjecucion } = useBetaChatContext();
  const [sinResultado, setSinResultado] = useState(false);
  const alTerminar = useCallback(() => {
    // El proceso terminó: el micro cierra la ejecución y deja la tarjeta final.
    refrescarEjecucion(messageId, c.ejecucionId).catch(() => setSinResultado(true));
  }, [refrescarEjecucion, messageId, c.ejecucionId]);
  const seguimiento = useProcesoDelChat(c.procesoId, { alTerminar });
  const p = seguimiento.proceso;
  const hechos = p?.hechos ?? c.proceso?.hechos ?? 0;
  const total = p ? p.total : (c.proceso?.total ?? null);
  const porcentaje = p?.porcentaje ?? c.proceso?.porcentaje ?? (total ? Math.round((hechos / total) * 100) : null);
  const mensaje = p?.mensaje ?? c.proceso?.mensaje ?? null;
  const sePuedeCancelar = !!p && p.sePuedeCancelar && !p.cancelacionPedida && !esEstadoFinal(p.estado);

  return (
    <CajaDelChat
      // 🔴 `region`, no `status`: `status` es una región VIVA y el lector de
      // pantalla releería la tarjeta entera con cada avance de la barra.
      role="region"
      aria-label={c.titulo || t('beta.enElChat.tarjeta.estado.en_curso')}
      data-testid="tarjeta-de-ejecucion"
      data-tipo="en_curso"
      titulo={c.titulo}
      conteo={<Estado tono="neutral" texto={t('beta.enElChat.tarjeta.estado.en_curso')} pulso ensayo={ensayo} />}
      pie={
        sePuedeCancelar || p?.cancelacionPedida || seguimiento.errorAlCancelar ? (
          <Pie>
            {sePuedeCancelar && (
              <Button
                size="sm"
                variant="outline"
                hideArrow
                isLoading={seguimiento.cancelando}
                disabled={seguimiento.cancelando}
                onClick={() => void seguimiento.cancelar()}
              >
                {t('beta.enElChat.tarjeta.enCurso.cancelar')}
              </Button>
            )}
            {p?.cancelacionPedida && !esEstadoFinal(p.estado) && (
              <p className="font-body text-[14px] text-fg-muted">{t('beta.enElChat.tarjeta.enCurso.cancelacionPedida')}</p>
            )}
            {seguimiento.errorAlCancelar && (
              <p role="alert" className="font-body text-[14px] text-danger">
                {t('beta.enElChat.tarjeta.enCurso.noPudeCancelar', { motivo: seguimiento.errorAlCancelar })}
              </p>
            )}
          </Pie>
        ) : undefined
      }
    >
      {!repite && c.resumen && (
        <p className="flex items-start gap-2.5 font-body text-[15px] leading-relaxed text-fg">
          <HourglassMedium weight="duotone" className="mt-1 size-4 shrink-0 text-fg-muted" aria-hidden />
          {c.resumen}
        </p>
      )}
      {c.procesoId && (
        <div className={cn(!repite && c.resumen && 'mt-3')} data-testid="avance-del-proceso">
          {porcentaje !== null ? (
            <Progress
              value={Math.min(100, Math.max(0, porcentaje))}
              size="sm"
              label={t('beta.enElChat.tarjeta.enCurso.barra', { titulo: c.titulo })}
            />
          ) : (
            // Sin total no hay porcentaje: la barra no finge uno.
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border" aria-hidden>
              <div className="h-full w-1/3 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
            </div>
          )}
          {/* Una sola línea de alto fijo: el número cambia sin mover nada. */}
          <p className="mt-1.5 truncate font-body text-[14px] text-fg-muted">
            <span className="font-mono tabular-nums text-fg">
              {total !== null
                ? t('beta.enElChat.tarjeta.enCurso.avance', { hechos: formatNumber(hechos), total: formatNumber(total) })
                : t('beta.enElChat.tarjeta.enCurso.avanceSinTotal', { hechos: formatNumber(hechos) })}
            </span>
            {mensaje ? ` · ${mensaje}` : ''}
          </p>
        </div>
      )}
      {seguimiento.error && !p && (
        <p className="mt-2 font-body text-[14px] text-fg-muted">{t('beta.enElChat.tarjeta.enCurso.noPudeLeer')}</p>
      )}
      {sinResultado && <p className="mt-2 font-body text-[14px] text-fg-muted">{t('beta.enElChat.tarjeta.enCurso.sinResultado')}</p>}
    </CajaDelChat>
  );
}

// ── Resultado (y la gracia de P-10) ─────────────────────────────────────────

const PRESENTACION_DEL_RESULTADO: Record<
  TarjetaResultado['estado'],
  { tono: SemanticTone; icono: ReactNode; pulso?: boolean }
> = {
  en_gracia: {
    tono: 'info',
    pulso: true,
    icono: <PaperPlaneTilt weight="duotone" className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />,
  },
  hecha: { tono: 'success', icono: <CheckCircle weight="fill" className="mt-0.5 size-5 shrink-0 text-success" aria-hidden /> },
  cancelada: { tono: 'neutral', icono: <XCircle weight="duotone" className="mt-0.5 size-5 shrink-0 text-fg-muted" aria-hidden /> },
  deshecha: {
    tono: 'neutral',
    icono: <ArrowCounterClockwise weight="duotone" className="mt-0.5 size-5 shrink-0 text-fg-muted" aria-hidden />,
  },
  vencida: { tono: 'warning', icono: <WarningCircle weight="duotone" className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden /> },
};

/** Cuántas veces se vuelve a preguntar si el micro todavía no la mandó al terminar la cuenta. */
const INTENTOS_AL_TERMINAR_LA_GRACIA = 3;
const ESPERA_ENTRE_INTENTOS_MS = 2000;

function TarjetaDeResultadoDelHilo({ t: r, messageId, posteriores, ensayo, repite }: PropsComunes & { t: TarjetaResultado }) {
  const { t } = useI18n();
  const { mandar, ocupado } = useMandar();
  const { refrescarEjecucion } = useBetaChatContext();
  const p = PRESENTACION_DEL_RESULTADO[r.estado];
  const pidioDeshacer = respuestaDeLaPropuesta(propuestaDelBoton(r.deshacer, r.ejecucionId), posteriores) === 'deshacer';
  const enGracia = r.estado === 'en_gracia' && r.gracia !== null;
  const [terminoLaCuenta, setTerminoLaCuenta] = useState(() =>
    enGracia ? segundosQueFaltan(r.gracia!.hasta, Date.now()) === 0 : false,
  );
  const [sinConfirmar, setSinConfirmar] = useState(false);
  // Lo que se ANUNCIA de la cuenta: tres momentos, no cada segundo.
  const [hito, setHito] = useState<'inicio' | 10 | 0>(() =>
    enGracia ? hitoDeLaCuenta(segundosQueFaltan(r.gracia!.hasta, Date.now())) : 'inicio',
  );
  const segundosAlMontar = useRef(enGracia ? segundosQueFaltan(r.gracia!.hasta, Date.now()) : 0);
  const montada = useRef(true);
  useEffect(() => {
    montada.current = true;
    return () => {
      montada.current = false;
    };
  }, []);

  const alTerminarLaGracia = useCallback(async () => {
    setTerminoLaCuenta(true);
    // Salió en Automático: la tarjeta de hoy la da el micro (y si todavía no
    // la mandó, la manda con esta pregunta). Unas pocas veces, nunca un bucle.
    for (let i = 0; i < INTENTOS_AL_TERMINAR_LA_GRACIA && montada.current; i++) {
      try {
        const hoy = await refrescarEjecucion(messageId, r.ejecucionId);
        if (hoy && !(hoy.tipo === 'resultado' && hoy.estado === 'en_gracia')) return;
      } catch {
        // Se vuelve a intentar abajo.
      }
      await new Promise((res) => setTimeout(res, ESPERA_ENTRE_INTENTOS_MS));
    }
    if (montada.current) setSinConfirmar(true);
  }, [refrescarEjecucion, messageId, r.ejecucionId]);

  const botonDeshacer =
    r.deshacer && !pidioDeshacer && !(enGracia && terminoLaCuenta) ? (
      <Button
        size="sm"
        variant="outline"
        hideArrow
        disabled={ocupado}
        className="gap-1.5"
        // El mensaje de la persona es lo que tocó («Anular el recibo», «Deshacer»).
        onClick={() => mandar(r.deshacer!.etiqueta, r.deshacer!.intencion)}
      >
        <ArrowCounterClockwise className="size-4" aria-hidden />
        {r.deshacer.etiqueta}
      </Button>
    ) : null;

  // Lo que va en la fila de abajo: la cuenta y «Deshacer», o lo que pasó con él.
  const fila: ReactNode =
    enGracia && !pidioDeshacer ? (
      <>
        {terminoLaCuenta ? (
          <p className="font-body text-[14px] text-fg" data-testid="gracia-enviando">
            {t(sinConfirmar ? 'beta.enElChat.tarjeta.gracia.sinConfirmar' : 'beta.enElChat.tarjeta.gracia.enviando')}
          </p>
        ) : (
          <CuentaRegresiva hasta={r.gracia!.hasta} alCambiarDeHito={setHito} alTerminar={() => void alTerminarLaGracia()} />
        )}
        {botonDeshacer}
        {/* La región viva dura toda la gracia (también después del cero),
            para que el último aviso alcance a leerse. */}
        <span className="sr-only" aria-live="polite" aria-atomic="true" data-testid="anuncio-de-la-cuenta">
          {terminoLaCuenta || hito === 0
            ? t('beta.enElChat.tarjeta.gracia.anuncioFinal')
            : hito === 10
              ? t('beta.enElChat.tarjeta.gracia.anuncioDiez')
              : t('beta.enElChat.tarjeta.gracia.anuncioInicio', { segundos: segundosAlMontar.current })}
        </span>
      </>
    ) : pidioDeshacer ? (
      <p className="font-body text-[14px] text-fg-muted">{t('beta.enElChat.tarjeta.gracia.pedisteDeshacer')}</p>
    ) : (
      botonDeshacer
    );
  // Con el resumen en el texto de arriba, la fila ES el contenido («Se envía
  // en 0:45 · Deshacer»): un pie bajo un cuerpo vacío sería un filete suelto.
  const conResumen = !repite && !!r.resumen;

  // Volver a una tarjeta en gracia cuya cuenta ya terminó (recargar, cambiar
  // de conversación): se pide su versión de hoy una vez.
  const pedidaAlMontar = useRef(false);
  useEffect(() => {
    if (!enGracia || pidioDeshacer || pedidaAlMontar.current) return;
    if (segundosQueFaltan(r.gracia!.hasta, Date.now()) === 0) {
      pedidaAlMontar.current = true;
      void alTerminarLaGracia();
    }
    // Sólo al montar: la cuenta viva avisa sola al llegar a cero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <CajaDelChat
      // 🔴 `region`, no `status`: con la cuenta regresiva adentro, una región
      // viva se releería cada segundo. Lo que se anuncia va aparte (abajo).
      role="region"
      aria-label={r.titulo || t(`beta.enElChat.tarjeta.estado.${r.estado}`)}
      data-testid="tarjeta-de-ejecucion"
      data-tipo="resultado"
      data-estado={r.estado}
      titulo={r.titulo}
      conteo={<Estado tono={p.tono} pulso={p.pulso} texto={t(`beta.enElChat.tarjeta.estado.${r.estado}`)} ensayo={ensayo} />}
      pie={conResumen && fila ? <Pie>{fila}</Pie> : undefined}
    >
      {conResumen ? (
        <div className="flex items-start gap-2.5">
          {p.icono}
          <p className="min-w-0 font-body text-[15px] leading-relaxed text-fg">{r.resumen}</p>
        </div>
      ) : (
        <div className="flex items-center gap-2.5">
          {p.icono}
          {fila ? <Pie>{fila}</Pie> : <span className="sr-only">{t(`beta.enElChat.tarjeta.estado.${r.estado}`)}</span>}
        </div>
      )}
    </CajaDelChat>
  );
}

/**
 * «Se envía en 0:45». El reloj cambia cada segundo en un `role="timer"`, que
 * los lectores de pantalla NO anuncian solos; lo que sí se anuncia (en una
 * región `polite` aparte, en el pie) son tres momentos: al empezar, a los 10
 * segundos y al terminar. Así el lector no se pasa un minuto leyendo números.
 */
function CuentaRegresiva({
  hasta,
  alTerminar,
  alCambiarDeHito,
}: {
  hasta: string;
  alTerminar: () => void;
  alCambiarDeHito: (h: 'inicio' | 10 | 0) => void;
}) {
  const { t } = useI18n();
  const [ahora, setAhora] = useState(() => Date.now());
  const quedan = segundosQueFaltan(hasta, ahora);
  const avisado = useRef(false);
  const alTerminarRef = useRef(alTerminar);
  alTerminarRef.current = alTerminar;
  const alCambiarRef = useRef(alCambiarDeHito);
  alCambiarRef.current = alCambiarDeHito;
  const viva = quedan > 0;
  const hito = hitoDeLaCuenta(quedan);

  useEffect(() => {
    if (!viva) return;
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [viva]);

  useEffect(() => {
    alCambiarRef.current(hito);
  }, [hito]);

  useEffect(() => {
    if (!viva && !avisado.current) {
      avisado.current = true;
      alTerminarRef.current();
    }
  }, [viva]);

  return (
    <p className="font-body text-[14px] text-fg" data-testid="cuenta-regresiva">
      {t('beta.enElChat.tarjeta.gracia.seEnviaEn')}{' '}
      {/* Ancho fijo y cifras tabulares: el reloj no empuja el botón al cambiar. */}
      <span role="timer" className="inline-block min-w-[4ch] font-mono font-medium tabular-nums">
        {relojDeLaCuenta(quedan)}
      </span>
    </p>
  );
}

// ── Programada (fuera del horario de ley, P-10) ─────────────────────────────

function TarjetaProgramadaDelHilo({ t: g, messageId, posteriores, ensayo, repite }: PropsComunes & { t: TarjetaProgramada }) {
  const { t } = useI18n();
  const { mandar, ocupado } = useMandar();
  const { refrescarEjecucion } = useBetaChatContext();
  const pidioDeshacer = respuestaDeLaPropuesta(propuestaDelBoton(g.deshacer, g.ejecucionId), posteriores) === 'deshacer';

  // Volver a una programada cuya hora ya pasó: el micro la manda ahora (con
  // la sesión recién verificada) o dice qué pasó con ella. Una vez por montaje.
  const pedida = useRef(false);
  useEffect(() => {
    if (pedida.current || pidioDeshacer) return;
    const desde = Date.parse(g.ejecutarDesde);
    if (!Number.isNaN(desde) && desde <= Date.now()) {
      pedida.current = true;
      refrescarEjecucion(messageId, g.ejecucionId).catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <CajaDelChat
      role="region"
      aria-label={g.titulo || t('beta.enElChat.tarjeta.estado.programada')}
      data-testid="tarjeta-de-ejecucion"
      data-tipo="programada"
      titulo={g.titulo}
      conteo={<Estado tono="info" texto={t('beta.enElChat.tarjeta.estado.programada')} ensayo={ensayo} />}
      pie={
        g.deshacer && !pidioDeshacer ? (
          <Pie>
            <Button
              size="sm"
              variant="outline"
              hideArrow
              disabled={ocupado}
              className="gap-1.5"
              onClick={() => mandar(g.deshacer!.etiqueta, g.deshacer!.intencion)}
            >
              <XCircle className="size-4" aria-hidden />
              {g.deshacer.etiqueta}
            </Button>
          </Pie>
        ) : pidioDeshacer ? (
          <Pie>
            <p className="font-body text-[14px] text-fg-muted">{t('beta.enElChat.tarjeta.gracia.pedisteDeshacer')}</p>
          </Pie>
        ) : undefined
      }
    >
      <p className="flex items-start gap-2.5 font-body text-[15px] font-medium leading-relaxed text-fg">
        <CalendarBlank weight="duotone" className="mt-1 size-4 shrink-0 text-fg-muted" aria-hidden />
        {t('beta.enElChat.tarjeta.programada.cuando', { cuando: g.cuando })}
      </p>
      {!repite && g.resumen && <p className="mt-1.5 font-body text-[14px] leading-snug text-fg-muted">{g.resumen}</p>}
      {!g.saleSola && (
        <p className="mt-1.5 font-body text-[14px] leading-snug text-fg-muted">
          {t('beta.enElChat.tarjeta.programada.saleConTuSesion')}
        </p>
      )}
    </CajaDelChat>
  );
}

// ── Error explicado (§4.3) ──────────────────────────────────────────────────

function TarjetaDeErrorDelHilo({ t: e, ensayo, repite }: PropsComunes & { t: TarjetaError }) {
  const { t } = useI18n();
  const [pidiendoCodigo, setPidiendoCodigo] = useState(false);
  const [reintentado, setReintentado] = useState(false);
  const factor = e.segundoFactor;

  return (
    <CajaDelChat
      // `region` y no `alert`: con las casillas del código adentro, una región
      // asertiva se releería con cada dígito. El fallo del código sí es `alert`.
      role="region"
      aria-label={e.titulo || t('beta.enElChat.tarjeta.estado.error')}
      data-testid="tarjeta-de-ejecucion"
      data-tipo="error"
      titulo={e.titulo}
      conteo={<Estado tono="critical" texto={t('beta.enElChat.tarjeta.estado.error')} ensayo={ensayo} />}
      pie={
        factor && !reintentado && !pidiendoCodigo ? (
          <Pie>
            <Button size="sm" hideArrow className="gap-1.5" onClick={() => setPidiendoCodigo(true)}>
              <ShieldCheck className="size-4" aria-hidden />
              {factor.etiqueta}
            </Button>
          </Pie>
        ) : undefined
      }
    >
      {!repite && (
        <div className="flex items-start gap-2.5">
          <WarningCircle weight="fill" className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
          {/* El mensaje del back, tal cual (ya viene en español y tuteando). */}
          <p className="min-w-0 font-body text-[15px] leading-relaxed text-fg">{e.explicacion}</p>
        </div>
      )}
      {e.permiso && (
        <p className="mt-2 font-mono text-[13px] text-fg-muted">
          {t('beta.enElChat.tarjeta.error.permiso', { modulo: e.permiso.modulo, accion: e.permiso.accion })}
        </p>
      )}
      {e.quienesPueden && (
        <p className="mt-2 flex items-start gap-2 font-body text-[14px] leading-snug text-fg" data-testid="quienes-pueden">
          <UsersThree weight="duotone" className="mt-0.5 size-4 shrink-0 text-fg-muted" aria-hidden />
          {e.quienesPueden.length > 0
            ? t('beta.enElChat.tarjeta.error.quienesPueden', { nombres: e.quienesPueden.join(', ') })
            : t('beta.enElChat.tarjeta.error.nadiePuede')}
        </p>
      )}
      {factor && pidiendoCodigo && !reintentado && (
        <SegundoFactorEnElChat
          titulo={e.titulo}
          reintento={factor.intencion}
          alReintentar={() => {
            setReintentado(true);
            setPidiendoCodigo(false);
          }}
        />
      )}
    </CajaDelChat>
  );
}

/**
 * El segundo factor, AQUÍ (nunca la pantalla `/auth/mfa-verify`): las seis
 * casillas, el mismo reto de Supabase que esa pantalla y, con el código
 * bueno, la MISMA acción otra vez como mensaje de la persona (el reintento
 * que trajo la tarjeta).
 */
function SegundoFactorEnElChat({
  titulo,
  reintento,
  alReintentar,
}: {
  titulo: string;
  reintento: IntencionDelChat;
  alReintentar: () => void;
}) {
  const { t } = useI18n();
  const { setMfaVerified } = useAuth();
  const { mandar, ocupado } = useMandar();
  const [codigo, setCodigo] = useState('');
  const [factorId, setFactorId] = useState<string | null | undefined>(undefined);
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const supabase = getSupabase();
        const { data } = (await supabase?.auth.mfa.listFactors()) ?? { data: null };
        const verificado = data?.totp?.find((f) => f.status === 'verified');
        if (vigente) setFactorId(verificado?.id ?? null);
      } catch {
        if (vigente) setFactorId(null);
      }
    })();
    return () => {
      vigente = false;
    };
  }, []);

  const verificar = async (c: string) => {
    if (!factorId || c.length !== 6 || verificando || ocupado) return;
    setVerificando(true);
    setError(null);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('sin sesión');
      const { data: reto, error: errorDelReto } = await supabase.auth.mfa.challenge({ factorId });
      if (errorDelReto) throw errorDelReto;
      const { error: errorDelCodigo } = await supabase.auth.mfa.verify({ factorId, challengeId: reto.id, code: c });
      if (errorDelCodigo) throw errorDelCodigo;
      setMfaVerified();
      alReintentar();
      mandar(t('beta.enElChat.mensaje.reintentar', { titulo }), reintento);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(
        /invalid|expired/i.test(msg)
          ? t('beta.enElChat.tarjeta.error.codigoIncorrecto')
          : t('beta.enElChat.tarjeta.error.noPudeVerificar', { motivo: msg || '—' }),
      );
      setCodigo('');
    } finally {
      setVerificando(false);
    }
  };

  if (factorId === null) {
    return (
      <p className="mt-3 flex items-start gap-2 font-body text-[14px] leading-snug text-fg-muted" data-testid="segundo-factor">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        {t('beta.enElChat.tarjeta.error.sinFactor')}
      </p>
    );
  }

  return (
    <div className="mt-3 border-t border-border-faint pt-3" data-testid="segundo-factor">
      <p className="font-body text-[14px] font-medium text-fg">{t('beta.enElChat.tarjeta.error.codigo')}</p>
      <CasillasDeCodigo
        className="mt-2"
        value={codigo}
        onChange={(v) => {
          setCodigo(v);
          if (error) setError(null);
        }}
        onCompleto={(c) => void verificar(c)}
        disabled={verificando || factorId === undefined}
        hayError={error !== null}
        aria-label={t('beta.enElChat.tarjeta.error.codigo')}
        autoFocus
      />
      {error && (
        <p role="alert" className="mt-2 font-body text-[14px] text-danger">
          {error}
        </p>
      )}
      <Button
        size="sm"
        hideArrow
        className="mt-3"
        isLoading={verificando}
        disabled={codigo.length !== 6 || verificando || !factorId || ocupado}
        onClick={() => void verificar(codigo)}
      >
        {t('beta.enElChat.tarjeta.error.verificar')}
      </Button>
    </div>
  );
}
