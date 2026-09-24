'use client';

import { useState } from 'react';
import {
  ChatDataCard,
  ChatEntityCard,
  EntityAmount,
  EntityField,
  Callout,
  StatusBadge,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  type SemanticTone,
} from '@leasefy/cadence';
import { Warning } from '@phosphor-icons/react';
import { Button } from '@/components/ui';
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
 *   una cifra          → `ChatDataCard` (tiles mono; varias cifras, una tarjeta)
 *   advertencia        → `Callout`
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
  className,
}: {
  bloques?: BloqueDeRespuesta[];
  entidades?: EntidadDelChat[];
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
  const totales = new Set(
    lista.flatMap((b) => (b.tipo === 'tabla' ? [b.total] : []))
  );
  const metricas = lista.filter(
    (b): b is Extract<BloqueDeRespuesta, { tipo: 'metrica' }> =>
      b.tipo === 'metrica' && !(b.formato === 'numero' && totales.has(b.valor))
  );
  const resto = lista.filter((b) => b.tipo !== 'metrica');

  return (
    <div className={cn('space-y-3', className)} data-testid="respuesta-con-forma">
      {personas.map((e) => (
        <TarjetaDeEntidad key={`${e.tipo}-${e.id}`} entidad={e} turnoId={turnoId} />
      ))}
      {metricas.length > 0 && (
        <ChatDataCard
          // Una sola cifra no se estira a todo el ancho de la conversación.
          className={metricas.length === 1 ? 'max-w-[280px]' : undefined}
          tiles={metricas.map((m) => ({
            label: m.titulo,
            value: m.formato === 'moneda' ? formatCurrency(m.valor) : formatNumber(m.valor),
          }))}
        />
      )}
      {resto.map((b, i) =>
        b.tipo === 'tabla' ? (
          <BloqueTabla key={`t-${i}`} bloque={b} turnoId={turnoId} />
        ) : b.tipo === 'aviso' ? (
          <Callout
            key={`a-${i}`}
            role={b.tono === 'advertencia' ? 'alert' : undefined}
            icon={
              b.tono === 'advertencia' ? (
                <Warning weight="duotone" className="mt-px size-4 shrink-0 text-warning" aria-hidden />
              ) : undefined
            }
            className="text-[14px] text-fg"
          >
            {b.texto}
          </Callout>
        ) : null
      )}
    </div>
  );
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

function BloqueTabla({
  bloque,
  turnoId,
}: {
  bloque: Extract<BloqueDeRespuesta, { tipo: 'tabla' }>;
  turnoId?: string;
}) {
  const { t } = useI18n();
  const { anotarTarjetaAbierta } = useBetaChatContext();
  const [todas, setTodas] = useState(false);
  const viajaron = bloque.filas.length;
  const filas = todas ? bloque.filas : bloque.filas.slice(0, FILAS_A_LA_VISTA);
  return (
    <section aria-label={bloque.titulo || t('beta.forma.resultados')} className="space-y-2">
      {/* Cada bloque dice qué es (el molde): de qué son las filas y cuántas. */}
      <header className="flex items-baseline justify-between gap-3 px-1">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
          {bloque.titulo || t('beta.forma.resultados')}
        </span>
        <span className="font-mono text-[13px] tabular-nums text-fg-muted">
          {bloque.total > viajaron
            ? t('beta.forma.filasDe', { n: formatNumber(viajaron), total: formatNumber(bloque.total) })
            : t(viajaron === 1 ? 'beta.forma.fila' : 'beta.forma.filas', { n: formatNumber(viajaron) })}
        </span>
      </header>
      {/* La tabla de Cadence ya es la tarjeta (borde, radio, desplazamiento
          horizontal en el teléfono): no va dentro de otra. */}
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
                      (numerica || esIdentificador(c.clave)) && 'font-mono text-[14px] tabular-nums'
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
      {viajaron > FILAS_A_LA_VISTA && (
        <Button
          size="sm"
          variant="ghost"
          hideArrow
          aria-expanded={todas}
          onClick={() => {
            // Abrir las filas es usar la respuesta (señal para el cerebro);
            // volver a cerrarlas no dice nada nuevo.
            if (!todas) anotarTarjetaAbierta(turnoId);
            setTodas((v) => !v);
          }}
        >
          {todas
            ? t('beta.forma.verMenos')
            : t('beta.forma.verTodas', { n: formatNumber(viajaron) })}
        </Button>
      )}
    </section>
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

export function TarjetaDeEntidad({ entidad, turnoId }: { entidad: EntidadDelChat; turnoId?: string }) {
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
        <>
          <Button
            size="sm"
            variant="outline"
            hideArrow
            disabled={ocupado}
            onClick={() => sendMessage(t('beta.forma.pedir.estadoDeCuenta', { nombre: entidad.titulo }))}
          >
            {t('beta.forma.accion.estadoDeCuenta')}
          </Button>
          {vigente && tocaRenovar && (
            <Button
              size="sm"
              hideArrow
              disabled={ocupado}
              onClick={() => sendMessage(t('beta.forma.pedir.renovar', { codigo: vigente.codigo }))}
            >
              {t('beta.forma.accion.renovar')}
            </Button>
          )}
        </>
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
            </EntityField>
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
