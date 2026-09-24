'use client';

import { useState, type ReactNode } from 'react';
import { StatusBadge, type SemanticTone } from '@leasefy/cadence';
import { ArrowCounterClockwise, CheckCircle, HourglassMedium, Info, WarningCircle, XCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { respuestaDeLaPropuesta, respuestaDelPlan } from '@/lib/chat/acciones-del-hilo';
import { faltanDatos, type EstadoDelPaso, type EstadoDelPlan, type PasoDelPlan, type TarjetaDePlan as Plan } from '@/lib/chat/plan-del-chat';
import type { BotonDeLaTarjeta } from '@/lib/chat/tarjetas-de-ejecucion';
import type { ChatMessage } from '@/lib/types/beta-chat';
import { CajaDelChat } from './CajaDelChat';
import { CamposEnElChat, datosDeLosCampos, valoresIniciales } from './CamposEnElChat';
import { Estado, Pie, RiesgosDeLaAccion, useMandar } from './TarjetaDeEjecucion';

/**
 * TarjetaDePlan — varias acciones del registro pedidas en UNA frase, con UNA
 * confirmación (24-09-2026, paquete H; arquitectura §4.1 y §5).
 *
 *   Propuesto  — la lista numerada, el riesgo de cada paso con su palabra, lo
 *                que falta llenar (en la misma caja) y un solo «Hacer todo».
 *   Después    — la MISMA tarjeta al día en la respuesta: el estado de cada
 *                paso, «Deshacer» en cada paso hecho (si su tarjeta lo trajo)
 *                y dónde y por qué se detuvo, con «Reintentar / Seguir desde
 *                aquí».
 *
 * Reglas de Nico que esto no puede romper:
 *   · Todo dentro del chat: cada botón es un MENSAJE DE LA PERSONA con la
 *     intención que trajo la tarjeta (`hacer_plan`, `seguir_plan`,
 *     `cancelar_plan`, `deshacer`). Nada navega (guardián `chat-sin-salidas`).
 *   · UNA caja con cabecera, contenido y pie; sin scroll vertical propio
 *     (guardián `chat-sin-scroll-anidado`); lo secundario, en outline.
 *   · La respuesta se lee desde su comienzo: nada de esto mueve el scroll.
 *   · Ningún botón se inventa: «Hacer todo», «Deshacer» y «Seguir» salen sólo
 *     si la tarjeta los trae (el micro ya filtró por permiso).
 */

const TONO_DEL_PLAN: Record<EstadoDelPlan, SemanticTone> = {
  propuesto: 'info',
  ejecutando: 'neutral',
  hecho: 'success',
  detenido: 'warning',
  cancelado: 'neutral',
  vencido: 'warning',
};

const TONO_DEL_PASO: Record<EstadoDelPaso, SemanticTone> = {
  pendiente: 'neutral',
  hecho: 'success',
  fallido: 'critical',
  en_curso: 'info',
  omitido: 'neutral',
};

const ICONO_DEL_PASO: Record<EstadoDelPaso, ReactNode> = {
  pendiente: null,
  hecho: <CheckCircle weight="fill" className="size-4 shrink-0 text-success" aria-hidden />,
  fallido: <WarningCircle weight="fill" className="size-4 shrink-0 text-danger" aria-hidden />,
  en_curso: <HourglassMedium weight="duotone" className="size-4 shrink-0 text-fg-muted" aria-hidden />,
  omitido: <XCircle weight="duotone" className="size-4 shrink-0 text-fg-muted" aria-hidden />,
};

export function TarjetaDePlan({
  plan: p,
  message,
  posteriores,
}: {
  plan: Plan;
  message: Pick<ChatMessage, 'id' | 'ensayo'>;
  posteriores: ChatMessage[];
}) {
  const { t } = useI18n();
  const { mandar, ocupado } = useMandar();
  const respuesta = respuestaDelPlan(p.planId, posteriores);
  const enEnsayo = message.ensayo === true || p.ensayo;
  const vencido = p.estado === 'propuesto' && !respuesta && p.venceEn !== null && Date.parse(p.venceEn) < Date.now();
  const campos = p.pasos.flatMap((x) => x.campos);
  const [valores, setValores] = useState<Record<string, string>>(() => valoresIniciales(campos));
  const poner = (clave: string, v: string) => setValores((x) => ({ ...x, [clave]: v }));
  const esperando = !respuesta && !vencido && !enEnsayo;
  const faltan = faltanDatos(campos, valores);

  /** El botón del plan, con lo que la persona llenó en la tarjeta. */
  const tocar = (b: BotonDeLaTarjeta, texto: string) => {
    const datos = datosDeLosCampos(campos, valores);
    mandar(texto, 'planId' in b.intencion && Object.keys(datos).length > 0 ? { ...b.intencion, datos } : b.intencion);
  };

  const estado: EstadoDelPlan | 'contestado' = p.estado === 'propuesto' && respuesta ? 'contestado' : vencido ? 'vencido' : p.estado;
  const n = p.detenido?.n ?? 0;

  const pie: ReactNode =
    p.estado === 'propuesto' && esperando && p.hacerTodo ? (
      <Pie>
        <Button size="sm" hideArrow disabled={ocupado || faltan} onClick={() => tocar(p.hacerTodo!, t('beta.enElChat.plan.mensaje.hacerTodo'))}>
          {t('beta.enElChat.plan.hacerTodo')}
        </Button>
        {p.cancelar && (
          <Button size="sm" variant="outline" hideArrow disabled={ocupado} onClick={() => mandar(t('beta.enElChat.plan.mensaje.no'), p.cancelar!.intencion)}>
            {t('beta.enElChat.plan.no')}
          </Button>
        )}
        {faltan && <p className="font-body text-[14px] text-fg-muted">{t('beta.enElChat.plan.llenaLoQueFalta')}</p>}
      </Pie>
    ) : p.estado === 'detenido' && !respuesta && !enEnsayo && (p.seguir || p.cancelar) ? (
      <Pie>
        {p.seguir && (
          <Button size="sm" hideArrow disabled={ocupado || faltan} onClick={() => tocar(p.seguir!, t('beta.enElChat.plan.mensaje.seguir', { n }))}>
            {t(p.detenido?.tipo === 'fallo' ? 'beta.enElChat.plan.reintentarDesde' : 'beta.enElChat.plan.seguirDesde', { n })}
          </Button>
        )}
        {p.cancelar && (
          <Button size="sm" variant="outline" hideArrow disabled={ocupado} onClick={() => mandar(t('beta.enElChat.plan.mensaje.noSeguir'), p.cancelar!.intencion)}>
            {t('beta.enElChat.plan.noSeguir')}
          </Button>
        )}
      </Pie>
    ) : respuesta ? (
      <Pie>
        <p className="font-body text-[14px] text-fg-muted">{t(`beta.enElChat.plan.yaRespondiste.${respuesta}`)}</p>
      </Pie>
    ) : vencido ? (
      <Pie>
        <p className="font-body text-[14px] text-fg-muted">{t('beta.enElChat.plan.vencido')}</p>
      </Pie>
    ) : undefined;

  return (
    <CajaDelChat
      role="region"
      aria-label={p.titulo || t('beta.enElChat.plan.pasos')}
      data-testid="tarjeta-de-plan"
      data-estado={estado}
      titulo={p.titulo}
      conteo={<Estado tono={estado === 'contestado' ? 'neutral' : TONO_DEL_PLAN[estado]} pulso={estado === 'ejecutando'} texto={t(`beta.enElChat.plan.estado.${estado}`)} ensayo={enEnsayo} />}
      pie={pie}
    >
      {p.cita && <p className="font-body text-[14px] leading-snug text-fg-muted">{t('beta.enElChat.plan.loQuePediste', { cita: p.cita })}</p>}
      {p.estado === 'propuesto' && esperando && p.porQue && (
        <p className="mt-1.5 font-body text-[15px] leading-relaxed text-fg">
          {p.porQue} <strong className="font-semibold">{p.pregunta}</strong>
        </p>
      )}
      <ol aria-label={t('beta.enElChat.plan.pasos')} data-testid="pasos-del-plan" className="mt-3 space-y-4">
        {p.pasos.map((x) => (
          <PasoEnElHilo
            key={x.n}
            paso={x}
            planId={p.planId}
            posteriores={posteriores}
            pedirDatos={x.campos.length > 0 && (esperando || (p.estado === 'detenido' && !respuesta)) && !enEnsayo}
            valores={valores}
            poner={poner}
          />
        ))}
      </ol>
      {p.seDetieneAntesDe && (
        <div data-testid="se-detiene-antes" className="mt-4 flex items-start gap-2 border-t border-border-faint pt-3 font-body text-[14px] leading-snug">
          <WarningCircle weight="duotone" className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <p className="min-w-0 text-fg">
            <span className="font-medium">{t('beta.enElChat.plan.seDetieneAntesDe', { n: p.seDetieneAntesDe.n, que: p.seDetieneAntesDe.que })}</span>{' '}
            <span className="text-fg-muted">{p.seDetieneAntesDe.porQue}</span>
          </p>
        </div>
      )}
      {p.detenido && (
        <div data-testid="plan-detenido" className="mt-4 flex items-start gap-2 border-t border-border-faint pt-3 font-body text-[14px] leading-snug">
          <WarningCircle weight="duotone" className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <p className="min-w-0 text-fg">
            <span className="font-medium">{t('beta.enElChat.plan.detenidoEn', { n: p.detenido.n })}</span>{' '}
            <span className="text-fg-muted">{p.detenido.porQue}</span>
          </p>
        </div>
      )}
      {enEnsayo && (
        <p className="mt-3 flex items-start gap-2 font-body text-[14px] leading-snug text-fg-muted">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t('beta.enElChat.plan.ensayo')}
        </p>
      )}
    </CajaDelChat>
  );
}

function PasoEnElHilo({
  paso: x,
  planId,
  posteriores,
  pedirDatos,
  valores,
  poner,
}: {
  paso: PasoDelPlan;
  planId: string;
  posteriores: ChatMessage[];
  pedirDatos: boolean;
  valores: Record<string, string>;
  poner: (clave: string, v: string) => void;
}) {
  const { t } = useI18n();
  const { mandar, ocupado } = useMandar();
  const pidioDeshacer = x.ejecucionId ? respuestaDeLaPropuesta(x.ejecucionId, posteriores) === 'deshacer' : false;
  return (
    <li data-testid="paso-del-plan" data-estado={x.estado} className="flex gap-3">
      {/* El número se ve; el lector de pantalla ya lo dice por la lista ordenada. */}
      <span
        aria-hidden
        className={cn(
          'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-[13px] tabular-nums',
          x.estado === 'hecho' ? 'bg-success-soft text-success' : x.estado === 'fallido' ? 'bg-danger-soft text-danger' : 'bg-surface-muted text-fg',
        )}
      >
        {x.n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="min-w-0 font-body text-[15px] font-medium leading-snug text-fg">{x.titulo || x.frase}</p>
          {/* El estado nunca sólo con color: ícono + palabra. */}
          <span className="inline-flex items-center gap-1.5">
            {ICONO_DEL_PASO[x.estado]}
            <StatusBadge tone={TONO_DEL_PASO[x.estado]}>{t(`beta.enElChat.plan.paso.estado.${x.estado}`)}</StatusBadge>
          </span>
        </div>
        <p className="mt-0.5 font-body text-[14px] leading-snug text-fg-muted">{x.frase}</p>
        {x.dependeDe !== null && x.estado === 'pendiente' && (
          <p className="mt-0.5 font-body text-[14px] leading-snug text-fg-muted">{t('beta.enElChat.plan.paso.dependeDe', { n: x.dependeDe })}</p>
        )}
        <RiesgosDeLaAccion riesgo={x.riesgo} />
        {x.resumen && x.estado !== 'pendiente' && <p className="mt-2 font-body text-[14px] leading-snug text-fg">{x.resumen}</p>}
        {pedirDatos && (
          <div className="mt-3" data-testid="datos-del-paso">
            <CamposEnElChat campos={x.campos} valores={valores} onCambiar={poner} idBase={`${planId}-${x.n}`} />
          </div>
        )}
        {x.deshacer && x.estado === 'hecho' && (
          <div className="mt-2">
            {pidioDeshacer ? (
              <p className="font-body text-[14px] text-fg-muted">{t('beta.enElChat.plan.paso.pedisteDeshacer')}</p>
            ) : (
              <Button
                size="sm"
                variant="outline"
                hideArrow
                disabled={ocupado}
                className="gap-1.5"
                onClick={() => mandar(x.deshacer!.etiqueta, x.deshacer!.intencion)}
              >
                <ArrowCounterClockwise className="size-4" aria-hidden />
                {x.deshacer.etiqueta}
              </Button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
