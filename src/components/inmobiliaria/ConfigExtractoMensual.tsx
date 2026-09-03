'use client';

import { useCallback, useEffect, useState } from 'react';
import { EnvelopeSimple, PaperPlaneTilt, Warning, CaretDown } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button, Input } from '@/components/ui';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useI18n } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import { mesEnTitulo, nombreDelMes } from '@/lib/utils/mes';
import { propietariosApi } from '@/lib/api/inmobiliaria.service';
import type {
  AgencyProfile,
  UpdateAgencyPayload,
  ResumenDeExtractos,
  ResultadoDeEnvioMasivo,
} from '@/lib/types/inmobiliaria';

/** Rango del día — el mismo `@Min(1) @Max(28)` del DTO del back: existe en todos los meses. */
export const MIN_DIA_DEL_EXTRACTO = 1;
export const MAX_DIA_DEL_EXTRACTO = 28;
/** Default del esquema (`Agency.extracto_mensual_dia`). */
const DIA_POR_DEFECTO = 1;

/** El mes anterior en 'YYYY-MM', en hora local — el que se manda. */
export function mesAnterior(hoy: Date = new Date()): string {
  const primeroDeEsteMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  primeroDeEsteMes.setMonth(primeroDeEsteMes.getMonth() - 1);
  const mm = String(primeroDeEsteMes.getMonth() + 1).padStart(2, '0');
  return `${primeroDeEsteMes.getFullYear()}-${mm}`;
}

interface ConfigExtractoMensualProps {
  /** La fila real de la agencia (GET /inmobiliaria/config → `agency`). */
  agency: AgencyProfile;
  /**
   * Guarda SÓLO los campos cambiados por PUT /inmobiliaria/agency — el mismo
   * handler que usa el perfil (avisa con toast y refresca la agencia). Debe
   * rechazar si falla, para que el switch vuelva a como estaba.
   */
  onSave?: (payload: UpdateAgencyPayload) => Promise<void> | void;
  /** Sólo el ADMIN de la agencia: el back rechaza el PUT a los demás. */
  canEdit?: boolean;
}

/**
 * ConfigExtractoMensual — el extracto mensual automático al propietario.
 *
 * Dos perillas de la agencia (`extractoMensualAutomatico` + `extractoMensualDia`)
 * que se guardan al tocarlas, igual que el motor de cobros, y un bloque «Último
 * mes» que lee el resumen real de envíos del mes anterior y deja mandarlos ahora
 * (correos REALES: pide confirmación y muestra quién no salió y por qué).
 */
export function ConfigExtractoMensual({ agency, onSave, canEdit = true }: ConfigExtractoMensualProps) {
  const { t, locale } = useI18n();

  const automaticoGuardado = agency.extractoMensualAutomatico ?? false;
  const diaGuardado = agency.extractoMensualDia ?? DIA_POR_DEFECTO;

  const [automatico, setAutomatico] = useState(automaticoGuardado);
  const [diaTexto, setDiaTexto] = useState(String(diaGuardado));
  const [errorDeDia, setErrorDeDia] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // La agencia se refresca después de cada guardado: el estado local sigue a la fila.
  useEffect(() => setAutomatico(automaticoGuardado), [automaticoGuardado]);
  useEffect(() => setDiaTexto(String(diaGuardado)), [diaGuardado]);

  const guardar = useCallback(
    async (payload: UpdateAgencyPayload) => {
      setGuardando(true);
      try {
        await onSave?.(payload);
        return true;
      } catch {
        // El padre ya avisó con el mensaje del back (p. ej. 403).
        return false;
      } finally {
        setGuardando(false);
      }
    },
    [onSave],
  );

  const cambiarAutomatico = async (prendido: boolean) => {
    setAutomatico(prendido);
    const ok = await guardar({ extractoMensualAutomatico: prendido });
    if (!ok) setAutomatico(automaticoGuardado);
  };

  const confirmarDia = async () => {
    const n = parseInt(diaTexto, 10);
    if (Number.isNaN(n) || n < MIN_DIA_DEL_EXTRACTO || n > MAX_DIA_DEL_EXTRACTO) {
      setErrorDeDia(t('inmobiliaria.config.extractoMensual.diaError'));
      setDiaTexto(String(diaGuardado));
      return;
    }
    setErrorDeDia(null);
    if (n === diaGuardado) return;
    const ok = await guardar({ extractoMensualDia: n });
    if (!ok) setDiaTexto(String(diaGuardado));
  };

  // ── Último mes ─────────────────────────────────────────────────────────────
  const [resumen, setResumen] = useState<ResumenDeExtractos | null>(null);
  const [cargandoResumen, setCargandoResumen] = useState(true);
  // `{ mensaje: null }` = falló sin mensaje; se traduce al pintar, así el
  // efecto no depende de `t` (un `t` nuevo por render lo relanzaría sin fin).
  const [errorDeResumen, setErrorDeResumen] = useState<{ mensaje: string | null } | null>(null);
  const [resumenVersion, setResumenVersion] = useState(0);

  useEffect(() => {
    let vigente = true;
    setCargandoResumen(true);
    propietariosApi
      .extractosResumen()
      .then((datos) => {
        if (!vigente) return;
        setResumen(datos);
        setErrorDeResumen(null);
      })
      .catch((e: unknown) => {
        if (!vigente) return;
        setErrorDeResumen({ mensaje: e instanceof Error && e.message ? e.message : null });
      })
      .finally(() => {
        if (vigente) setCargandoResumen(false);
      });
    return () => {
      vigente = false;
    };
  }, [resumenVersion]);

  const mes = resumen?.month ?? mesAnterior();
  const mesTitulo = mesEnTitulo(mes, locale);
  const mesEnFrase = nombreDelMes(mes, locale);
  const nadaEnviado = !!resumen && resumen.enviados + resumen.fallidos + resumen.omitidos === 0;

  // ── Enviar ahora ───────────────────────────────────────────────────────────
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoDeEnvioMasivo | null>(null);
  const [detalleAbierto, setDetalleAbierto] = useState(false);

  const enviarAhora = async () => {
    setEnviando(true);
    try {
      const r = await propietariosApi.enviarExtractosDelMes(mes, true);
      setResultado(r);
      setDetalleAbierto(false);
      toast.success(t('inmobiliaria.config.extractoMensual.resultadoTitle', { mes: mesEnTitulo(r.month, locale) }), {
        description: t('inmobiliaria.config.extractoMensual.resultadoDesc', {
          enviados: r.enviados,
          fallidos: r.fallidos,
          omitidos: r.omitidos,
        }),
      });
      setResumenVersion((v) => v + 1);
    } catch (e: unknown) {
      toast.error(t('inmobiliaria.config.extractoMensual.errorEnvio'), {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setEnviando(false);
      setConfirmando(false);
    }
  };

  const noSalieron = resultado?.detalle.filter((d) => d.estado !== 'ENVIADO') ?? [];

  return (
    <section
      className="space-y-4 p-5 rounded-xl bg-card border border-border"
      data-testid="config-extracto-mensual"
      aria-labelledby="extracto-mensual-titulo"
    >
      <div className="flex items-center gap-2 text-foreground">
        <EnvelopeSimple className="w-5 h-5 text-fg-muted" weight="duotone" />
        <h3 id="extracto-mensual-titulo" className="text-base font-semibold">
          {t('inmobiliaria.config.extractoMensual.title')}
        </h3>
      </div>

      {/* Automático + día */}
      <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-surface-muted p-4">
        <div className="space-y-1">
          <label htmlFor="extracto-mensual-automatico" className="block text-sm font-medium text-foreground">
            {t('inmobiliaria.config.extractoMensual.switchLabel')}
          </label>
          <p className="text-xs text-muted-foreground" data-testid="extracto-mensual-hint">
            {automatico
              ? t('inmobiliaria.config.extractoMensual.hintPrendido', { dia: diaGuardado })
              : t('inmobiliaria.config.extractoMensual.hintApagado')}
          </p>
          {!canEdit && (
            <p className="text-xs text-muted-foreground">{t('inmobiliaria.config.extractoMensual.soloAdmin')}</p>
          )}
        </div>
        <Switch
          id="extracto-mensual-automatico"
          data-testid="extracto-mensual-automatico"
          checked={automatico}
          disabled={!canEdit || guardando}
          onCheckedChange={(v) => void cambiarAutomatico(v)}
        />
      </div>

      {automatico && (
        <div className="max-w-xs space-y-1.5">
          <label htmlFor="extracto-mensual-dia" className="block text-sm font-medium text-foreground">
            {t('inmobiliaria.config.extractoMensual.diaLabel')}
          </label>
          <Input
            id="extracto-mensual-dia"
            data-testid="extracto-mensual-dia"
            type="number"
            inputMode="numeric"
            min={MIN_DIA_DEL_EXTRACTO}
            max={MAX_DIA_DEL_EXTRACTO}
            step={1}
            value={diaTexto}
            disabled={!canEdit || guardando}
            aria-invalid={!!errorDeDia}
            aria-describedby="extracto-mensual-dia-ayuda"
            onChange={(e) => setDiaTexto(e.target.value)}
            onBlur={() => void confirmarDia()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            className={cn('w-28 tabular-nums', errorDeDia && 'border-danger/30')}
          />
          <p id="extracto-mensual-dia-ayuda" className={cn('text-xs', errorDeDia ? 'text-danger' : 'text-muted-foreground')}>
            {errorDeDia ?? t('inmobiliaria.config.extractoMensual.diaHint')}
          </p>
        </div>
      )}

      {/* Último mes */}
      <div className="rounded-lg bg-muted/50 p-4 space-y-3" data-testid="extracto-mensual-ultimo-mes">
        <div className="text-xs text-muted-foreground">{t('inmobiliaria.config.extractoMensual.ultimoMes')}</div>

        {cargandoResumen && (
          <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
            {t('inmobiliaria.config.extractoMensual.cargando')}
          </p>
        )}

        {!cargandoResumen && errorDeResumen && (
          <p className="flex items-center gap-2 text-sm text-danger" role="alert" data-testid="extracto-mensual-error">
            <Warning className="w-4 h-4 shrink-0" />
            {errorDeResumen.mensaje ?? t('inmobiliaria.config.extractoMensual.errorResumen')}
          </p>
        )}

        {!cargandoResumen && resumen && (
          <div className="space-y-1" data-testid="extracto-mensual-resumen">
            {nadaEnviado ? (
              <p className="text-sm text-foreground">
                {t('inmobiliaria.config.extractoMensual.todaviaNo', { mes: mesEnFrase })}
              </p>
            ) : (
              <p className="text-sm text-foreground">
                <span className="font-semibold">{mesTitulo}</span>
                {': '}
                <span className="tabular-nums">{t('inmobiliaria.config.extractoMensual.enviados', { n: resumen.enviados })}</span>
                {' · '}
                <span className={cn('tabular-nums', resumen.fallidos > 0 && 'text-danger')}>
                  {t('inmobiliaria.config.extractoMensual.fallidos', { n: resumen.fallidos })}
                </span>
                {' · '}
                <span className="tabular-nums">{t('inmobiliaria.config.extractoMensual.omitidos', { n: resumen.omitidos })}</span>
                {resumen.ultimoEnvioAt && (
                  <>
                    {' · '}
                    <span className="text-muted-foreground">
                      {t('inmobiliaria.config.extractoMensual.ultimoEnvio', {
                        fecha: formatDateTime(resumen.ultimoEnvioAt, locale),
                      })}
                    </span>
                  </>
                )}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {t('inmobiliaria.config.extractoMensual.conActividad', { n: resumen.propietariosConActividad })}
              {resumen.omitidos > 0 && ` · ${t('inmobiliaria.config.extractoMensual.omitidosHint')}`}
            </p>
          </div>
        )}

        {canEdit && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            hideArrow
            data-testid="extracto-mensual-enviar-ahora"
            disabled={cargandoResumen || enviando}
            onClick={() => setConfirmando(true)}
          >
            <PaperPlaneTilt className="w-4 h-4" />
            {enviando
              ? t('inmobiliaria.config.extractoMensual.enviando')
              : t('inmobiliaria.config.extractoMensual.enviarAhora', { mes: mesEnFrase })}
          </Button>
        )}

        {resultado && (
          <div className="space-y-2 rounded-md border border-border bg-card p-3" data-testid="extracto-mensual-resultado">
            <p className="text-sm text-foreground">
              <span className="font-semibold">
                {t('inmobiliaria.config.extractoMensual.resultadoTitle', { mes: mesEnTitulo(resultado.month, locale) })}
              </span>
              {': '}
              {t('inmobiliaria.config.extractoMensual.resultadoDesc', {
                enviados: resultado.enviados,
                fallidos: resultado.fallidos,
                omitidos: resultado.omitidos,
              })}
            </p>
            {noSalieron.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t('inmobiliaria.config.extractoMensual.todosSalieron')}</p>
            ) : (
              <>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  aria-expanded={detalleAbierto}
                  aria-controls="extracto-mensual-detalle"
                  data-testid="extracto-mensual-ver-detalle"
                  onClick={() => setDetalleAbierto((v) => !v)}
                >
                  {t('inmobiliaria.config.extractoMensual.verDetalle', { n: noSalieron.length })}
                  <CaretDown className={cn('w-3 h-3 transition-transform', detalleAbierto && 'rotate-180')} />
                </button>
                {detalleAbierto && (
                  <ul id="extracto-mensual-detalle" className="divide-y divide-border text-sm" data-testid="extracto-mensual-detalle">
                    {noSalieron.map((d) => (
                      <li key={d.propietarioId} className="flex flex-wrap items-baseline gap-x-2 py-1.5">
                        <span className="font-medium text-foreground">{d.nombre}</span>
                        <span className={cn('text-xs', d.estado === 'FALLIDO' ? 'text-danger' : 'text-muted-foreground')}>
                          {t(`inmobiliaria.config.extractoMensual.estado.${d.estado}`)}
                          {d.motivo ? ` · ${d.motivo}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={confirmando} onOpenChange={(abierto) => !enviando && setConfirmando(abierto)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('inmobiliaria.config.extractoMensual.confirmTitle', { mes: mesEnFrase })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('inmobiliaria.config.extractoMensual.confirmDesc', {
                mes: mesEnFrase,
                n: resumen?.propietariosConActividad ?? 0,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={enviando}>{t('inmobiliaria.config.extractoMensual.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              data-testid="extracto-mensual-confirmar"
              disabled={enviando}
              onClick={(e) => {
                // Se queda abierto mientras manda: el cierre lo decide el envío.
                e.preventDefault();
                void enviarAhora();
              }}
            >
              {enviando
                ? t('inmobiliaria.config.extractoMensual.enviando')
                : t('inmobiliaria.config.extractoMensual.confirmAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

export default ConfigExtractoMensual;
