'use client';

import { useState } from 'react';
import {
  ChatEntityCard,
  EntityAmount,
  EntityField,
  StatusBadge,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  type SemanticTone,
} from '@leasefy/cadence';
import { CaretDown, Info, Warning } from '@phosphor-icons/react';
import { Button } from '@/components/ui';
import { tipoDeFichaDeLaEntidad } from '@/lib/chat/acciones-del-hilo';
import { CajaDelChat } from './CajaDelChat';
import { useBetaChatContext } from '@/lib/context/BetaChatContext';
import { useI18n } from '@/lib/i18n';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  esColumnaNumerica,
  esIdentificador,
  textoDeCelda,
  type BloqueDeRespuesta,
  type ContratoDeEntidad,
  type EntidadDelChat,
} from '@/lib/chat/bloques';

/**
 * RespuestaConForma — la parte de la respuesta que tiene FORMA, pintada con el
 * componente de Cadence que le corresponde (Nico, 23-09: «entregar siempre
 * respuestas usando alguno que haga match con cómo debe presentarse»):
 *
 *   lista de registros → `Table` (THead/TR/TH/TD) con cada columna en su formato
 *   una cifra          → `EntityAmount` / `EntityField` en su caja (sólo cuando la
 *                        pregunta ES una cifra; nunca suelta junto a una tarjeta)
 *   advertencia        → ícono + texto en su caja
 *
 * Cada bloque va en SU caja del chat (`CajaDelChat`, la cáscara de Cadence):
 * cabecera con qué es y cuántos, contenido y pie (Nico, 23-09, 23:48).
 *   persona / inmueble → `ChatEntityCard` + `EntityField` + `EntityAmount`,
 *                        con `StatusBadge` para el estado del contrato vigente
 *
 * El texto de la respuesta va arriba, como siempre; esto va debajo. Si no hay
 * nada con forma, no pinta nada.
 */
export function RespuestaConForma({
  bloques,
  entidades,
  turnoId,
  conAcciones = false,
  className,
}: {
  bloques?: BloqueDeRespuesta[];
  entidades?: EntidadDelChat[];
  /**
   * La respuesta trae la lista completa de lo que se puede hacer (la ficha,
   * 23-09): la tarjeta no repite sus dos atajos (la misma cosa dos veces).
   */
  conAcciones?: boolean;
  /**
   * El turno del micro al que pertenece esta respuesta: con él, abrir una
   * tarjeta o la tabla se le cuenta al cerebro de la inmobiliaria.
   */
  turnoId?: string;
  className?: string;
}) {
  const lista = bloques ?? [];
  const personas = (entidades ?? []).slice(0, 4);
  if (lista.length === 0 && personas.length === 0) return null;

  // Las cifras sueltas van juntas en UNA tarjeta de datos, en el orden en que
  // llegaron; tablas y avisos, cada uno en su lugar.
  //
  // Una cifra que es el conteo de una tabla de la misma respuesta ya la dice la
  // tabla («29 filas»): la misma frase no se dice dos veces (el molde).
  const totales = new Set(lista.flatMap((b) => (b.tipo === 'tabla' ? [b.total] : [])));
  const metricas = lista.filter(
    (b): b is Extract<BloqueDeRespuesta, { tipo: 'metrica' }> =>
      b.tipo === 'metrica' && !(b.formato === 'numero' && totales.has(b.valor)),
  );
  const resto = lista.filter((b) => b.tipo !== 'metrica');

  return (
    <div className={cn('space-y-3', className)} data-testid="respuesta-con-forma">
      {personas.map((e) => (
        <TarjetaDeEntidad key={`${e.tipo}-${e.id}`} entidad={e} turnoId={turnoId} sinAtajos={conAcciones} />
      ))}
      {/* Cada bloque en SU caja del chat (Nico, 23-09, 23:48): una sola
          familia visual — la de `ChatEntityCard` — para tarjeta, tabla, cifra
          y aviso. */}
      {metricas.length > 0 && (
        <CajaDelChat
          data-testid="bloque-metricas"
          // Una sola cifra no se estira a todo el ancho de la conversación.
          className={metricas.length === 1 ? 'max-w-[320px]' : undefined}
          titulo={metricas.length === 1 ? metricas[0].titulo : undefined}
        >
          {metricas.length === 1 ? (
            <EntityAmount>{valorDeMetrica(metricas[0])}</EntityAmount>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {metricas.map((m, i) => (
                <EntityField key={`${m.titulo}-${i}`} label={m.titulo}>
                  {valorDeMetrica(m)}
                </EntityField>
              ))}
            </div>
          )}
        </CajaDelChat>
      )}
      {resto.map((b, i) =>
        b.tipo === 'tabla' ? (
          <BloqueTabla key={`t-${i}`} bloque={b} turnoId={turnoId} />
        ) : b.tipo === 'aviso' ? (
          <CajaDelChat key={`a-${i}`} data-testid="bloque-aviso" role={b.tono === 'advertencia' ? 'alert' : 'note'}>
            <p className="flex items-start gap-2 font-body text-[14px] leading-relaxed text-fg">
              {b.tono === 'advertencia' ? (
                <Warning weight="duotone" className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              ) : (
                <Info weight="duotone" className="mt-0.5 size-4 shrink-0 text-fg-muted" aria-hidden />
              )}
              <span>{b.texto}</span>
            </p>
          </CajaDelChat>
        ) : null,
      )}
    </div>
  );
}

function valorDeMetrica(m: Extract<BloqueDeRespuesta, { tipo: 'metrica' }>): string {
  return m.formato === 'moneda' ? formatCurrency(m.valor) : formatNumber(m.valor);
}

// ── Tabla ───────────────────────────────────────────────────────────────────

/**
 * Los estados que el ERP guarda en inglés (`ACTIVE`, `LATE`…) con su nombre y
 * su tono de Cadence. Uno que no está acá se muestra legible («Renov pending»
 * → «renov pending») y en gris: nunca se inventa un significado.
 */
const ESTADOS: Record<string, { clave: string; tono: SemanticTone }> = {
  ACTIVE: { clave: 'beta.forma.estado.activo', tono: 'success' },
  ACTIVO: { clave: 'beta.forma.estado.activo', tono: 'success' },
  SIGNED: { clave: 'beta.forma.estado.firmado', tono: 'success' },
  EXPIRED: { clave: 'beta.forma.estado.vencido', tono: 'neutral' },
  VENCIDO: { clave: 'beta.forma.estado.vencido', tono: 'neutral' },
  TERMINATED: { clave: 'beta.forma.estado.terminado', tono: 'neutral' },
  TERMINADO: { clave: 'beta.forma.estado.terminado', tono: 'neutral' },
  CANCELLED: { clave: 'beta.forma.estado.cancelado', tono: 'neutral' },
  DRAFT: { clave: 'beta.forma.estado.borrador', tono: 'neutral' },
  PENDING: { clave: 'beta.forma.estado.pendiente', tono: 'warning' },
  PENDIENTE: { clave: 'beta.forma.estado.pendiente', tono: 'warning' },
  COBRO_PENDING: { clave: 'beta.forma.estado.pendiente', tono: 'warning' },
  PENDING_LANDLORD_SIGNATURE: { clave: 'beta.forma.estado.porFirmar', tono: 'warning' },
  PENDING_TENANT_SIGNATURE: { clave: 'beta.forma.estado.porFirmar', tono: 'warning' },
  PARTIAL: { clave: 'beta.forma.estado.parcial', tono: 'warning' },
  LATE: { clave: 'beta.forma.estado.enMora', tono: 'critical' },
  EN_MORA: { clave: 'beta.forma.estado.enMora', tono: 'critical' },
  DEFAULTED: { clave: 'beta.forma.estado.incumplido', tono: 'critical' },
  PAGADO: { clave: 'beta.forma.estado.pagado', tono: 'success' },
  PAID: { clave: 'beta.forma.estado.pagado', tono: 'success' },
  // Renovaciones (`chat.renovaciones`): la pregunta más común del piloto.
  RENOV_PENDING: { clave: 'beta.forma.estado.renovacionPendiente', tono: 'warning' },
  NOTIFIED: { clave: 'beta.forma.estado.notificado', tono: 'info' },
  NEGOTIATING: { clave: 'beta.forma.estado.enNegociacion', tono: 'info' },
  RENOV_APPROVED: { clave: 'beta.forma.estado.aprobada', tono: 'success' },
  RENOV_SIGNED: { clave: 'beta.forma.estado.firmada', tono: 'success' },
  RENOV_COMPLETED: { clave: 'beta.forma.estado.renovado', tono: 'success' },
  RENOV_TERMINATED: { clave: 'beta.forma.estado.noRenueva', tono: 'neutral' },
  // Mantenimientos y dispersiones.
  REPORTED: { clave: 'beta.forma.estado.reportado', tono: 'warning' },
  QUOTED: { clave: 'beta.forma.estado.cotizado', tono: 'info' },
  MAINT_APPROVED: { clave: 'beta.forma.estado.aprobado', tono: 'info' },
  IN_PROGRESS: { clave: 'beta.forma.estado.enCurso', tono: 'info' },
  PROCESSING: { clave: 'beta.forma.estado.enCurso', tono: 'info' },
  MAINT_COMPLETED: { clave: 'beta.forma.estado.terminado', tono: 'success' },
  MAINT_CANCELLED: { clave: 'beta.forma.estado.cancelado', tono: 'neutral' },
  DISP_PENDING: { clave: 'beta.forma.estado.pendiente', tono: 'warning' },
  DISP_COMPLETED: { clave: 'beta.forma.estado.girado', tono: 'success' },
  FAILED: { clave: 'beta.forma.estado.fallido', tono: 'critical' },
};

function Estado({ valor }: { valor: string }) {
  const { t } = useI18n();
  const conocido = ESTADOS[valor.toUpperCase()];
  return (
    <StatusBadge tone={conocido?.tono ?? 'neutral'}>
      {conocido ? t(conocido.clave) : valor.replace(/_/g, ' ').toLowerCase()}
    </StatusBadge>
  );
}

/**
 * Filas a la vista antes de «Ver todas». Una respuesta del chat no es la
 * pantalla de contratos: 50 filas de golpe empujan la conversación fuera de la
 * vista. Las primeras dicen de qué se trata; el resto, a un clic.
 */
export const FILAS_A_LA_VISTA = 8;

/**
 * No se esconde una fila por esconder (Nico, 23-09): si al cortar quedarían
 * menos de estas ocultas, se muestran todas. Antes, con 9 filas se veían 8 y
 * un botón «Ver las 9 filas» para UNA.
 */
export const MINIMO_DE_FILAS_OCULTAS = 3;

/** Cuántas filas quedan fuera al cortar (0 = no se corta). */
export function filasQueSeOcultan(viajaron: number): number {
  const ocultas = viajaron - FILAS_A_LA_VISTA;
  return ocultas >= MINIMO_DE_FILAS_OCULTAS ? ocultas : 0;
}

function BloqueTabla({ bloque, turnoId }: { bloque: Extract<BloqueDeRespuesta, { tipo: 'tabla' }>; turnoId?: string }) {
  const { t } = useI18n();
  const { anotarTarjetaAbierta } = useBetaChatContext();
  const [todas, setTodas] = useState(false);
  const viajaron = bloque.filas.length;
  const ocultas = filasQueSeOcultan(viajaron);
  const filas = todas || ocultas === 0 ? bloque.filas : bloque.filas.slice(0, FILAS_A_LA_VISTA);
  const titulo = bloque.titulo || t('beta.forma.resultados');
  return (
    <CajaDelChat
      data-testid="bloque-tabla"
      role="region"
      aria-label={titulo}
      // Cada bloque dice qué es (el molde): de qué son las filas y cuántas.
      titulo={titulo}
      conteo={
        bloque.total > viajaron
          ? t('beta.forma.filasDe', { n: formatNumber(viajaron), total: formatNumber(bloque.total) })
          : t(viajaron === 1 ? 'beta.forma.fila' : 'beta.forma.filas', { n: formatNumber(viajaron) })
      }
      pie={
        ocultas > 0 ? (
          // El «ver más» es parte del bloque: en su pie, como botón.
          <Button
            size="sm"
            variant="ghost"
            hideArrow
            className="h-auto min-h-9 max-w-full gap-1.5 whitespace-normal py-1.5 text-left"
            aria-expanded={todas}
            onClick={() => {
              // Abrir las filas es usar la respuesta (señal para el cerebro);
              // volver a cerrarlas no dice nada nuevo.
              if (!todas) anotarTarjetaAbierta(turnoId);
              setTodas((v) => !v);
            }}
          >
            {todas ? t('beta.forma.verMenos') : t('beta.forma.verFilasQueFaltan', { n: formatNumber(ocultas) })}
            <CaretDown
              aria-hidden
              className={cn(
                'size-4 transition-transform duration-200 motion-reduce:transition-none',
                todas && 'rotate-180',
              )}
            />
          </Button>
        ) : undefined
      }
    >
      {/* La tabla va de borde a borde de su caja: su propio marco (el de la
          tabla de Cadence) sería una caja dentro de otra. Se desplaza a lo
          ancho dentro de la caja en el teléfono. Sin pie, la tabla llega al
          borde de abajo de la caja (sin una franja vacía debajo de la última
          fila); con pie, lo separa el filete del pie.
          🔴 Sin scroll vertical propio (Nico, 24-09 00:15: «no deja hacer
          scroll interno en esa tabla»): `overflow-x: auto` convierte también
          el eje vertical en `auto` (así es CSS), y la tabla quedaba como un
          scroller anidado. Se fija `overflow-y: hidden`: la rueda vertical
          encima de la tabla mueve el chat; a lo ancho, en el teléfono, la tabla
          se desplaza dentro de su caja sin arrastrar la página (ni el gesto de
          «atrás» del trackpad). */}
      <div
        data-desplazamiento-de-la-tabla
        className={cn(
          '-mx-4 [&>div]:rounded-none [&>div]:border-x-0 [&>div]:border-b-0',
          '[&>div>div]:overflow-y-hidden [&>div>div]:overscroll-x-contain',
          ocultas === 0 && '-mb-4',
        )}
      >
        <Table>
          <THead>
            <TR className="hover:bg-transparent">
              {bloque.columnas.map((c) => (
                <TH key={c.clave} numeric={esColumnaNumerica(c.formato)} className="whitespace-nowrap px-3">
                  {c.titulo}
                </TH>
              ))}
            </TR>
          </THead>
          <TBody>
            {filas.map((fila, i) => (
              <TR key={i}>
                {bloque.columnas.map((c) => {
                  const valor = fila[c.clave] ?? null;
                  const numerica = esColumnaNumerica(c.formato);
                  // El texto largo (nombres, direcciones) parte línea para que la
                  // tabla quepa en la columna del chat; cifras, fechas y estados
                  // no se parten. Cifras e identificadores, en mono.
                  return (
                    <TD
                      key={c.clave}
                      numeric={numerica}
                      className={cn(
                        // Celdas un poco más juntas que en una pantalla: la tabla
                        // vive en la columna del chat, no a todo el ancho.
                        'px-3',
                        c.formato === 'texto' && !esIdentificador(c.clave)
                          ? 'min-w-[7rem] max-w-[13rem] whitespace-normal'
                          : 'whitespace-nowrap',
                        (numerica || esIdentificador(c.clave)) && 'font-mono text-[14px] tabular-nums',
                      )}
                    >
                      {c.formato === 'estado' && typeof valor === 'string' && valor ? (
                        <Estado valor={valor} />
                      ) : (
                        textoDeCelda(valor, c.formato)
                      )}
                    </TD>
                  );
                })}
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </CajaDelChat>
  );
}

// ── Tarjeta de entidad ──────────────────────────────────────────────────────

/** El semáforo del contrato vigente: mora primero, después el vencimiento. */
export function semaforoDelContrato(c: ContratoDeEntidad): {
  clave: string;
  vars?: Record<string, string | number>;
  tono: SemanticTone;
} {
  if (c.cartera.estado === 'ok' && c.cartera.carteraCop > 0) {
    return { clave: 'beta.forma.semaforo.mora', vars: { dias: c.cartera.diasDeMoraMaximo }, tono: 'critical' };
  }
  if (c.diasParaVencer !== null && c.diasParaVencer <= 90 && c.diasParaVencer >= 0) {
    return { clave: 'beta.forma.semaforo.vence', vars: { dias: c.diasParaVencer }, tono: 'warning' };
  }
  if (!c.vigente) return { clave: 'beta.forma.estado.vencido', tono: 'neutral' };
  return { clave: 'beta.forma.semaforo.alDia', tono: 'success' };
}

export function TarjetaDeEntidad({
  entidad,
  turnoId,
  sinAtajos = false,
}: {
  entidad: EntidadDelChat;
  turnoId?: string;
  sinAtajos?: boolean;
}) {
  const { t } = useI18n();
  const { sendMessage, isThinking, isStreaming, isAgentsRunning, anotarTarjetaAbierta } = useBetaChatContext();
  const ocupado = isThinking || isStreaming || isAgentsRunning;

  const vigente = entidad.contratos.find((c) => c.vigente) ?? null;
  const otros = Math.max(0, entidad.totalContratos - (vigente ? 1 : 0));
  const semaforo = vigente ? semaforoDelContrato(vigente) : null;
  const papeles = [entidad.tipo, ...entidad.otrosRoles.filter((r) => r !== entidad.tipo)]
    .map((r) => t(`beta.forma.papel.${r}`))
    .join(' · ');
  // P-7 (CEO): la renovación se propone 3 meses antes del fin.
  const tocaRenovar = vigente?.diasParaVencer != null && vigente.diasParaVencer <= 90 && !vigente.renovacion;
  const esPersonaDelContrato = entidad.tipo === 'inquilino' || entidad.tipo === 'coarrendatario';
  const tipoDeFicha = tipoDeFichaDeLaEntidad(entidad);

  return (
    <ChatEntityCard
      // Un clic en la tarjeta —en su cuerpo o en «Estado de cuenta» /
      // «Preparar renovación», que burbujean hasta acá— dice CUÁL de los
      // resultados era el que buscaba: el cerebro aprende así los apodos.
      // Sólo escucha; no es un control (los controles son los botones). Viaja
      // tipo + id, nunca el nombre ni el documento.
      onClick={() => anotarTarjetaAbierta(turnoId, { tipo: entidad.tipo, id: entidad.id })}
      eyebrow={papeles}
      status={semaforo ? <StatusBadge tone={semaforo.tono}>{t(semaforo.clave, semaforo.vars)}</StatusBadge> : undefined}
      actions={
        sinAtajos ? undefined : (
          <>
            {/* 23-09 («todo en el chat»): cada atajo es un mensaje de la
                persona CON su intención; el micro lo atiende con la ficha,
                sin adivinar el texto. Ninguno navega. */}
            {tipoDeFicha && (
              <Button
                size="sm"
                variant="outline"
                hideArrow
                disabled={ocupado}
                onClick={() =>
                  sendMessage(t('beta.enElChat.mensaje.verFicha', { titulo: entidad.titulo }), {
                    intencion: { accion: 'ver', entidad: { tipo: tipoDeFicha, id: entidad.id } },
                  })
                }
              >
                {t('beta.enElChat.verFicha')}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              hideArrow
              disabled={ocupado}
              onClick={() =>
                sendMessage(t('beta.forma.pedir.estadoDeCuenta', { nombre: entidad.titulo }), {
                  intencion: vigente
                    ? { accion: 'ver_estado_de_cuenta', entidad: { tipo: 'contrato', id: vigente.id } }
                    : null,
                })
              }
            >
              {t('beta.forma.accion.estadoDeCuenta')}
            </Button>
            {vigente && tocaRenovar && (
              <Button
                size="sm"
                hideArrow
                disabled={ocupado}
                onClick={() =>
                  sendMessage(t('beta.forma.pedir.renovar', { codigo: vigente.codigo }), {
                    intencion: { accion: 'abrir_renovacion', entidad: { tipo: 'contrato', id: vigente.id } },
                  })
                }
              >
                {t('beta.forma.accion.renovar')}
              </Button>
            )}
          </>
        )
      }
    >
      <div>
        <p className="font-body text-[17px] font-semibold leading-snug text-fg">{entidad.titulo}</p>
        {(entidad.documento || entidad.telefono || entidad.correo) && (
          <p className="mt-0.5 font-mono text-[13px] tabular-nums text-fg-muted">
            {[entidad.documento, entidad.telefono, entidad.correo].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      {vigente && (
        <div className="space-y-3 rounded-[11px] border border-border-faint bg-bg p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-body text-[14px] text-fg">
              <span className="font-mono tabular-nums">#{vigente.codigo}</span>
              {vigente.inmueble?.direccion ? ` · ${vigente.inmueble.direccion}` : ''}
            </span>
            {vigente.canonCop !== null && (
              <EntityAmount caption={t('beta.forma.canon')}>{formatCurrency(vigente.canonCop)}</EntityAmount>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {vigente.fin && <EntityField label={t('beta.forma.fin')}>{formatDate(vigente.fin)}</EntityField>}
            {/* La cadena completa: de un propietario o un inmueble se ve quién
                vive ahí; de un inquilino, de quién es. */}
            {vigente.inquilino && !esPersonaDelContrato && (
              <EntityField label={t('beta.forma.inquilino')}>
                <span className="font-body">{vigente.inquilino}</span>
              </EntityField>
            )}
            {vigente.propietarios[0] && entidad.tipo !== 'propietario' && (
              <EntityField label={t('beta.forma.propietario')}>
                <span className="font-body">{vigente.propietarios.map((p) => p.nombre).join(', ')}</span>
              </EntityField>
            )}
            <EntityField label={t('beta.forma.cartera')}>
              {vigente.cartera.estado === 'ok'
                ? formatCurrency(vigente.cartera.carteraCop)
                : t('beta.forma.sinCartera')}
              {/* El interés de mora va AQUÍ, junto a la cartera: no como cifra
                  suelta debajo de la tarjeta (Nico, 23-09, 23:47). */}
              {vigente.cartera.estado === 'ok' && vigente.cartera.interesDeMoraCop > 0 && (
                <span className="block font-body text-[14px] font-normal text-fg-muted">
                  {t('beta.forma.masInteres', { monto: formatCurrency(vigente.cartera.interesDeMoraCop) })}
                </span>
              )}
            </EntityField>
            {vigente.cartera.estado === 'ok' && vigente.cartera.porVencerCop > 0 && (
              <EntityField label={t('beta.forma.restaDelContrato')}>
                {formatCurrency(vigente.cartera.deudaTotalCop)}
              </EntityField>
            )}
          </div>
        </div>
      )}

      {otros > 0 && (
        <p className="font-body text-[14px] text-fg-muted">
          {t(otros === 1 ? 'beta.forma.otroContrato' : 'beta.forma.otrosContratos', { n: otros })}
        </p>
      )}
    </ChatEntityCard>
  );
}
