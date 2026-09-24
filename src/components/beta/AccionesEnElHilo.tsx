'use client';

import { useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { CurrencyInput, QuickActionChips, SensitiveActionConfirm, StatusBadge } from '@leasefy/cadence';
import {
  ArrowCounterClockwise,
  CaretDown,
  CheckCircle,
  CurrencyCircleDollar,
  Eye,
  PaperPlaneTilt,
  WarningCircle,
  WarningOctagon,
  XCircle,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SelectorDeMes } from '@/components/finanzas/SelectorDeMes';
import { mesActual } from '@/lib/recaudo/meses';
import { useBetaChatContext } from '@/lib/context/BetaChatContext';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import {
  fechaCivilLarga,
  respuestaDeLaPropuesta,
  textoDelFormulario,
  type AccionDelHilo,
  type ConfirmacionEnElHilo,
  type FormularioEnElHilo,
  type ResultadoEnElHilo,
  type RiesgoDeLaAccion,
} from '@/lib/chat/acciones-del-hilo';
import type { ChatMessage } from '@/lib/types/beta-chat';
import { CajaDelChat } from './CajaDelChat';
import { TarjetaDeEjecucion, useMandar } from './TarjetaDeEjecucion';

/**
 * AccionesEnElHilo — la parte del hilo que ACTÚA (Nico, 23-09-2026, 22:51:
 * «Debe todo funcionar dentro del chat… ya te había dicho que sí para todas las
 * acciones»).
 *
 *   · Lo que se puede hacer → chips; cada uno es un MENSAJE DE LA PERSONA con
 *     su intención (aparece en el hilo como si ella lo hubiera escrito).
 *   · Lo que no se puede → detrás de un botón, cada uno con su porqué y sin
 *     botón (nunca un control muerto).
 *   · «Voy a … ¿Lo hago?» → `SensitiveActionConfirm` de Cadence, la tarjeta
 *     del chat para «confirmar antes de lo irreversible o lo que sale hacia
 *     otra persona». «Sí, hazlo» y «No» son, otra vez, mensajes de la persona.
 *   · El resultado, con su explicación, y «Deshacer» cuando se puede.
 *   · Los datos que faltan, pedidos en el hilo.
 *   · Desde el 24-09, la tarjeta del EJECUTOR (`TarjetaDeEjecucion`):
 *     propuesta con vista previa, en curso, resultado con la gracia de
 *     «Deshacer», programada y error explicado. Con ella a la vista, la
 *     `confirmacion` y el `resultado` de siempre —la MISMA ejecución, que el
 *     micro sigue mandando para un panel viejo— no se pintan: serían la misma
 *     tarjeta dos veces. Sin ella (un micro de antes), todo queda como estaba.
 *
 * Nada de esto navega: el guardián `chat-sin-salidas.guardian.test.ts` lo
 * vigila sobre todo `src/components/beta/`.
 */
export function AccionesEnElHilo({ message, className }: { message: ChatMessage; className?: string }) {
  const { messages } = useBetaChatContext();
  const posteriores = useMemo(() => {
    const lista = messages ?? [];
    const i = lista.findIndex((m) => m.id === message.id);
    return i < 0 ? [] : lista.slice(i + 1);
  }, [messages, message.id]);

  const { acciones, confirmacion, resultado, formulario, ejecucion } = message;
  if (!acciones?.length && !confirmacion && !resultado && !formulario && !ejecucion) return null;

  return (
    <div className={cn('space-y-3', className)} data-testid="acciones-en-el-hilo">
      {formulario && (
        <FormularioDeLaAccion formulario={formulario} yaEnviado={posteriores.some((m) => m.role === 'user')} />
      )}
      {ejecucion ? (
        <TarjetaDeEjecucion tarjeta={ejecucion} message={message} posteriores={posteriores} />
      ) : (
        <>
          {confirmacion && <TarjetaDeConfirmacion confirmacion={confirmacion} posteriores={posteriores} />}
          {resultado && <TarjetaDeResultado resultado={resultado} posteriores={posteriores} />}
        </>
      )}
      {acciones && acciones.length > 0 && <AccionesDeLaFicha acciones={acciones} turnoId={message.turnoId} />}
    </div>
  );
}

// ── Lo que se puede hacer ───────────────────────────────────────────────────

function IconoDelRiesgo({ riesgo, lectura }: { riesgo: RiesgoDeLaAccion; lectura: boolean }) {
  if (lectura) return <Eye weight="duotone" aria-hidden />;
  if (riesgo.irreversible) return <WarningOctagon weight="duotone" aria-hidden />;
  if (riesgo.muevePlata) return <CurrencyCircleDollar weight="duotone" aria-hidden />;
  if (riesgo.escribeATerceros) return <PaperPlaneTilt weight="duotone" aria-hidden />;
  return null;
}

function AccionesDeLaFicha({ acciones, turnoId }: { acciones: AccionDelHilo[]; turnoId?: string }) {
  const { t } = useI18n();
  const { anotarTarjetaAbierta } = useBetaChatContext();
  const { mandar, ocupado } = useMandar();
  const [verNo, setVerNo] = useState(false);
  const yaSeAbrio = useRef(false);
  const idDeLaLista = useId();
  const disponibles = acciones.filter((a) => a.disponible);
  const no = acciones.filter((a) => !a.disponible);

  const botonNo =
    no.length > 0 ? (
      // Nico (23-09, 23:47): «ayudar más con el texto, y que se vea que es un
      // CTA». Botón secundario del DS (outline, pequeño, como las acciones
      // secundarias de ResponseCard), con un verbo al principio, qué vas a ver
      // y cuántas. Muestra u oculta DENTRO de la caja: no es un mensaje al
      // chat ni navega.
      <Button
        size="sm"
        variant="outline"
        hideArrow
        // En el teléfono el texto parte línea dentro de la caja (el botón del
        // DS es `nowrap` y a 390 px se salía 12 px del hilo).
        className="h-auto min-h-9 max-w-full gap-1.5 whitespace-normal py-1.5 text-left"
        aria-expanded={verNo}
        aria-controls={idDeLaLista}
        onClick={() => {
          if (!verNo && !yaSeAbrio.current) {
            yaSeAbrio.current = true;
            // La primera vez que se abre es usar la respuesta (señal para el
            // cerebro); cerrarla o volverla a abrir no dice nada nuevo.
            anotarTarjetaAbierta(turnoId, {
              tipo: no[0].entidad.tipo,
              id: no[0].entidad.id,
            });
          }
          setVerNo((v) => !v);
        }}
      >
        {verNo
          ? t('beta.enElChat.acciones.ocultarNo')
          : t(no.length === 1 ? 'beta.enElChat.acciones.verNoUna' : 'beta.enElChat.acciones.verNoVarias', {
              n: no.length,
            })}
        <CaretDown
          aria-hidden
          className={cn(
            'size-4 transition-transform duration-200 motion-reduce:transition-none',
            verNo && 'rotate-180',
          )}
        />
      </Button>
    ) : undefined;

  return (
    <CajaDelChat
      role="region"
      aria-label={t('beta.enElChat.acciones.titulo')}
      data-testid="caja-de-acciones"
      titulo={t('beta.enElChat.acciones.titulo')}
      pie={botonNo}
    >
      {disponibles.length > 0 ? (
        <QuickActionChips
          aria-label={t('beta.enElChat.acciones.titulo')}
          chips={disponibles.map((a) => ({
            id: `${a.id}|${a.entidad.id}`,
            label: a.titulo,
            icon: <IconoDelRiesgo riesgo={a.riesgo} lectura={a.lectura} />,
            disabled: ocupado,
          }))}
          onChipClick={(id) => {
            const a = disponibles.find((x) => `${x.id}|${x.entidad.id}` === id);
            if (!a) return;
            // Tocar una acción sobre una entidad dice CUÁL resultado servía
            // (señal para el cerebro, igual que abrir su tarjeta).
            anotarTarjetaAbierta(turnoId, {
              tipo: a.entidad.tipo,
              id: a.entidad.id,
            });
            mandar(a.titulo, { accion: a.id, entidad: a.entidad });
          }}
        />
      ) : (
        <p className="font-body text-[14px] text-fg-muted">{t('beta.enElChat.acciones.ninguna')}</p>
      )}
      {verNo && (
        <ul id={idDeLaLista} className="mt-3 space-y-2" data-testid="acciones-no-disponibles">
          {no.map((a) => (
            <li key={`${a.id}|${a.entidad.id}`} className="font-body text-[14px] leading-snug">
              <span className="text-fg">
                {a.titulo}
                {a.desde && (
                  <span className="text-fg-muted">
                    {' '}
                    ·{' '}
                    {t('beta.enElChat.acciones.sePuedeDesde', {
                      fecha: fechaCivilLarga(a.desde),
                    })}
                  </span>
                )}
              </span>
              {a.porQueNo && <span className="block text-fg-muted">{a.porQueNo}</span>}
            </li>
          ))}
        </ul>
      )}
    </CajaDelChat>
  );
}

// ── «Voy a … ¿Lo hago?» ─────────────────────────────────────────────────────

function etiquetaDelRiesgo(r: RiesgoDeLaAccion, t: (k: string) => string): string | null {
  if (r.irreversible) return t('beta.enElChat.riesgo.irreversible');
  if (r.muevePlata) return t('beta.enElChat.riesgo.plata');
  if (r.escribeATerceros) return t('beta.enElChat.riesgo.terceros');
  return null;
}

function TarjetaDeConfirmacion({
  confirmacion: c,
  posteriores,
}: {
  confirmacion: ConfirmacionEnElHilo;
  posteriores: ChatMessage[];
}) {
  const { t } = useI18n();
  const { mandar } = useMandar();
  const respuesta = respuestaDeLaPropuesta(c.propuestaId, posteriores);
  const vencida = !respuesta && c.venceEn !== null && Date.parse(c.venceEn) < Date.now();
  const abierta = !respuesta && !vencida;
  // La píldora dice POR QUÉ pregunta: el riesgo que siempre se pregunta, o el modo.
  const flag = etiquetaDelRiesgo(c.riesgo, t) ?? t(`beta.enElChat.modo.${c.modo}`);

  return (
    <div data-testid="tarjeta-de-confirmacion" data-estado={respuesta ?? (vencida ? 'vencida' : 'abierta')}>
      <SensitiveActionConfirm
        flag={flag}
        description={
          <>
            {c.frase} <strong className="font-semibold">{c.pregunta}</strong>
          </>
        }
        message={c.porQue || undefined}
        confirmLabel={t('beta.enElChat.confirmacion.si')}
        cancelLabel={t('beta.enElChat.confirmacion.no')}
        {...(abierta
          ? {
              onConfirm: () =>
                mandar(t('beta.enElChat.mensaje.si'), {
                  accion: 'confirmar',
                  propuestaId: c.propuestaId,
                }),
              onCancel: () =>
                mandar(t('beta.enElChat.mensaje.no'), {
                  accion: 'cancelar',
                  propuestaId: c.propuestaId,
                }),
            }
          : {})}
      />
      {vencida && (
        <p className="mt-2 px-1 font-body text-[14px] text-fg-muted">{t('beta.enElChat.confirmacion.vencida')}</p>
      )}
    </div>
  );
}

// ── El resultado ────────────────────────────────────────────────────────────

const PRESENTACION_DEL_RESULTADO: Record<
  ResultadoEnElHilo['estado'],
  { tono: 'success' | 'critical' | 'neutral'; icono: ReactNode }
> = {
  hecha: {
    tono: 'success',
    icono: <CheckCircle weight="fill" className="size-5 text-success" aria-hidden />,
  },
  fallida: {
    tono: 'critical',
    icono: <WarningCircle weight="fill" className="size-5 text-danger" aria-hidden />,
  },
  cancelada: {
    tono: 'neutral',
    icono: <XCircle weight="duotone" className="size-5 text-fg-muted" aria-hidden />,
  },
  deshecha: {
    tono: 'neutral',
    icono: <ArrowCounterClockwise weight="duotone" className="size-5 text-fg-muted" aria-hidden />,
  },
};

function TarjetaDeResultado({
  resultado: r,
  posteriores,
}: {
  resultado: ResultadoEnElHilo;
  posteriores: ChatMessage[];
}) {
  const { t } = useI18n();
  const { mandar, ocupado } = useMandar();
  const p = PRESENTACION_DEL_RESULTADO[r.estado];
  const yaDeshecho = r.deshacer ? respuestaDeLaPropuesta(r.deshacer.propuestaId, posteriores) === 'deshacer' : false;

  return (
    <CajaDelChat
      role={r.estado === 'fallida' ? 'alert' : 'status'}
      data-testid="tarjeta-de-resultado"
      data-estado={r.estado}
      pie={
        r.deshacer && !yaDeshecho ? (
          <Button
            size="sm"
            variant="outline"
            hideArrow
            disabled={ocupado}
            className="gap-1.5"
            onClick={() =>
              mandar(
                t('beta.enElChat.mensaje.deshacer', {
                  etiqueta: r.deshacer!.etiqueta,
                }),
                {
                  accion: 'deshacer',
                  propuestaId: r.deshacer!.propuestaId,
                },
              )
            }
          >
            <ArrowCounterClockwise className="size-4" aria-hidden />
            {t('beta.enElChat.resultado.deshacer')}
          </Button>
        ) : undefined
      }
    >
      <div className="flex items-center gap-2.5">
        {p.icono}
        {/* El estado nunca sólo con color: ícono + palabra. */}
        <StatusBadge tone={p.tono}>{t(`beta.enElChat.resultado.${r.estado}`)}</StatusBadge>
        {r.titulo && <span className="min-w-0 truncate font-body text-[14px] text-fg-muted">{r.titulo}</span>}
      </div>
      <p className="mt-2.5 font-body text-[15px] leading-relaxed text-fg">{r.resumen}</p>
    </CajaDelChat>
  );
}

// ── Los datos que faltan ────────────────────────────────────────────────────

function FormularioDeLaAccion({ formulario: f, yaEnviado }: { formulario: FormularioEnElHilo; yaEnviado: boolean }) {
  const { t } = useI18n();
  const { mandar, ocupado } = useMandar();
  const [valores, setValores] = useState<Record<string, string>>(() =>
    // Un mes siempre tiene valor (el selector no se puede dejar «vacío»).
    Object.fromEntries(f.campos.map((c) => [c.clave, c.valor ?? (c.tipo === 'mes' ? mesActual() : '')])),
  );
  const poner = (clave: string, v: string) => setValores((x) => ({ ...x, [clave]: v }));
  const faltan = f.campos.filter((c) => c.requerido && !(valores[c.clave] ?? '').trim());

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (faltan.length || ocupado || yaEnviado) return;
    const datos: Record<string, string | number> = {};
    for (const c of f.campos) {
      const v = (valores[c.clave] ?? '').trim();
      if (!v) continue;
      datos[c.clave] = c.tipo === 'moneda' || c.tipo === 'numero' ? Number(v.replace(',', '.')) : v;
    }
    mandar(textoDelFormulario(f, valores), {
      accion: f.accion,
      entidad: f.entidad,
      datos,
    });
  };

  return (
    <form onSubmit={enviar} aria-label={f.titulo} data-testid="formulario-de-la-accion">
      <CajaDelChat
        titulo={f.titulo}
        pie={
          <Button type="submit" size="sm" hideArrow disabled={faltan.length > 0 || ocupado || yaEnviado}>
            {t('beta.enElChat.formulario.seguir')}
          </Button>
        }
      >
        <div className="space-y-4">
          {f.errores.length > 0 && (
            <ul
              role="alert"
              className="space-y-1 rounded-[10px] bg-danger-soft px-3 py-2 font-body text-[14px] text-danger"
            >
              {f.errores.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {f.campos.map((c) => {
              const id = `campo-${f.accion}-${c.clave}`;
              const ancho = c.tipo === 'texto_largo' ? 'sm:col-span-2' : '';
              return (
                <div key={c.clave} className={cn('space-y-1.5', ancho)}>
                  <label htmlFor={id} className="block font-body text-[14px] font-medium text-fg">
                    {c.etiqueta}
                  </label>
                  {c.tipo === 'moneda' ? (
                    <CurrencyInput
                      id={id}
                      value={valores[c.clave] ? Number(valores[c.clave]) : undefined}
                      onChange={(v) => poner(c.clave, Number.isFinite(v) ? String(v) : '')}
                    />
                  ) : c.tipo === 'fecha' ? (
                    <Input
                      id={id}
                      type="date"
                      value={valores[c.clave] ?? ''}
                      onChange={(e) => poner(c.clave, e.target.value)}
                    />
                  ) : c.tipo === 'mes' ? (
                    <SelectorDeMes
                      mes={valores[c.clave] || mesActual()}
                      onCambiar={(m) => poner(c.clave, m)}
                      testId={id}
                    />
                  ) : c.tipo === 'opcion' ? (
                    <Select value={valores[c.clave] ?? ''} onValueChange={(v) => poner(c.clave, v)}>
                      <SelectTrigger id={id} aria-label={c.etiqueta}>
                        <SelectValue placeholder={t('beta.enElChat.formulario.elige')} />
                      </SelectTrigger>
                      <SelectContent>
                        {c.opciones.map((o) => (
                          <SelectItem key={o.valor} value={o.valor}>
                            {o.etiqueta}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : c.tipo === 'texto_largo' ? (
                    <Textarea
                      id={id}
                      rows={3}
                      value={valores[c.clave] ?? ''}
                      onChange={(e) => poner(c.clave, e.target.value)}
                    />
                  ) : (
                    <Input
                      id={id}
                      inputMode={c.tipo === 'numero' ? 'decimal' : undefined}
                      value={valores[c.clave] ?? ''}
                      onChange={(e) => poner(c.clave, e.target.value)}
                    />
                  )}
                  {c.ayuda && <p className="font-body text-[13px] text-fg-muted">{c.ayuda}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </CajaDelChat>
    </form>
  );
}
