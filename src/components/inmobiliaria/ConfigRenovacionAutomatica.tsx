'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowsClockwise, Warning } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui';
import { Switch } from '@/components/ui/switch';
import { renovacionAutomaticaApi } from '@/lib/api/renovacion-automatica.service';
import type { AgencyProfile, UpdateAgencyPayload } from '@/lib/types/inmobiliaria';
import { ConfigIpcPorAnio } from './ConfigIpcPorAnio';

/** El mismo `@Min(0) @Max(30)` del DTO del back. */
export const MIN_IPC = 0;
export const MAX_IPC = 30;

/**
 * El IPC como lo escribe una persona en Colombia: «5,2» o «5.2». Devuelve
 * `null` para el campo vacío (= usar la tabla del DANE que trae Leasefy) y
 * `undefined` cuando lo escrito no es un IPC válido.
 *
 * Dos decimales, que es como lo publica el DANE: un tercero es falsa
 * precisión y el back lo rechaza (`maxDecimalPlaces: 2`).
 */
export function leerIpc(texto: string): number | null | undefined {
  const limpio = texto.trim().replace(',', '.');
  if (limpio === '') return null;
  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return undefined;
  const n = Number(limpio);
  if (!Number.isFinite(n) || n < MIN_IPC || n > MAX_IPC) return undefined;
  return n;
}

/** Cómo se pinta un IPC guardado en el campo: con coma, como se escribe acá. */
export function escribirIpc(valor: number | null | undefined): string {
  if (valor == null) return '';
  return String(valor).replace('.', ',');
}

interface Props {
  /** La fila real de la agencia (GET /inmobiliaria/config → `agency`). */
  agency: AgencyProfile;
  /**
   * Guarda SÓLO los campos cambiados por PUT /inmobiliaria/agency — el mismo
   * handler del perfil (avisa con toast y refresca la agencia). Debe rechazar
   * si falla, para que el interruptor vuelva a como estaba.
   */
  onSave?: (payload: UpdateAgencyPayload) => Promise<void> | void;
  /** Sólo el ADMIN de la agencia: el back rechaza el PUT a los demás. */
  canEdit?: boolean;
}

/**
 * ConfigRenovacionAutomatica — prender la renovación automática.
 *
 * Nico, 2026-09-12: «esto debe hacerse: prender la renovación automática».
 * La regla y el cron existen desde hoy, pero las dos perillas de la agencia
 * (`renovacionAutomatica` e `ipcVigente`) sólo se prendían por SQL. Acá se
 * prenden.
 *
 * 🔴 Lo que este interruptor enciende NO es un reporte. Desde el 17-09 (D5):
 * a las 00:20, cada contrato vencido sin aviso de no renovación se PRORROGA
 * —vivienda por el mismo término (Ley 820 art. 6), local comercial lo pactado
 * o mes a mes— y eso ESCRIBE cuotas nuevas. Por eso la pantalla dice antes
 * cuántos son —`?simular=true` cuenta sin hacer— y el default sigue en
 * `false`: prenderla es una decisión de la inmobiliaria, agencia por agencia.
 *
 * Ya no sale ningún correo solo: la carta del incremento se manda desde la
 * bandeja de cartas (D6), y un contrato con aviso de no renovación queda en
 * alerta para que una persona decida.
 */
export function ConfigRenovacionAutomatica({ agency, onSave, canEdit = true }: Props) {
  const prendidaGuardada = agency.renovacionAutomatica ?? false;
  const ipcGuardado = agency.ipcVigente ?? null;

  const [prendida, setPrendida] = useState(prendidaGuardada);
  const [ipcTexto, setIpcTexto] = useState(escribirIpc(ipcGuardado));
  const [errorDeIpc, setErrorDeIpc] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // La agencia se refresca después de cada guardado: el estado local sigue a la fila.
  useEffect(() => setPrendida(prendidaGuardada), [prendidaGuardada]);
  useEffect(() => setIpcTexto(escribirIpc(ipcGuardado)), [ipcGuardado]);

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

  const cambiarPrendida = async (valor: boolean) => {
    setPrendida(valor);
    const ok = await guardar({ renovacionAutomatica: valor });
    if (!ok) setPrendida(prendidaGuardada);
  };

  const confirmarIpc = async () => {
    const valor = leerIpc(ipcTexto);
    if (valor === undefined) {
      setErrorDeIpc(`Un porcentaje entre ${MIN_IPC} y ${MAX_IPC}, con hasta dos decimales.`);
      setIpcTexto(escribirIpc(ipcGuardado));
      return;
    }
    setErrorDeIpc(null);
    if (valor === ipcGuardado) return;
    const ok = await guardar({ ipcVigente: valor });
    if (!ok) setIpcTexto(escribirIpc(ipcGuardado));
  };

  // ── Qué pasaría hoy ────────────────────────────────────────────────────────
  // No es una promesa de marketing: es el número que el cron va a mover esta
  // noche. Se pide una sola vez y en silencio; si falla, no se dice nada —un
  // fallo de red no es «no va a pasar nada».
  const [pronostico, setPronostico] = useState<{ prorrogas: number; alertas: number; porConfirmar: number } | null>(
    null,
  );
  useEffect(() => {
    if (!canEdit) return;
    let vigente = true;
    /*
     * 🔴 El pedido va DENTRO del `try`, no colgado de un `.catch()`.
     *
     * Un `.catch()` sólo atrapa el rechazo de la promesa. Si la llamada falla
     * antes de que haya promesa —`simular` que todavía no existe porque el
     * módulo del servicio quedó viejo en el dev server, un import a medio
     * recargar— el error sale del efecto, y de un efecto va derecho a la
     * frontera de error: la sección entera se cambia por «Esta sección se
     * rompió · REFERENCIA TYPEERROR». Le pasó a Nico el 2026-09-13 a las
     * 00:44 en Configuración → Perfil, con
     * `renovacionAutomaticaApi.simular is not a function`.
     *
     * Este número es información de más —la sección se lee entera sin él—,
     * así que no puede tumbar nada: pase lo que pase, se calla.
     */
    void (async () => {
      try {
        const r = await renovacionAutomaticaApi.simular();
        // Y si la respuesta viniera con otra forma, tampoco se pinta: un
        // «NaN propuestas» asusta más que no decir nada.
        if (typeof r?.renovadas !== 'number' || !Number.isFinite(r.renovadas)) return;
        const a = r.alertas;
        const alertas = a
          ? [a.avisoDeNoRenovacion, a.sinUso, a.terminoPorConfirmar, a.renovacionEnCurso]
              .map((n) => (Number.isFinite(Number(n)) ? Number(n) : 0))
              .reduce((x, y) => x + y, 0)
          : 0;
        const porConfirmar = Number.isFinite(Number(r.porConfirmar)) ? Number(r.porConfirmar) : 0;
        if (vigente) setPronostico({ prorrogas: r.renovadas, alertas, porConfirmar });
      } catch {
        /* silencio: no saber cuántos son no es saber que no son ninguno */
      }
    })();
    return () => {
      vigente = false;
    };
  }, [canEdit]);

  const hayMovimiento =
    !!pronostico && pronostico.prorrogas + pronostico.alertas + pronostico.porConfirmar > 0;

  return (
    <section
      className="space-y-4 p-5 rounded-lg bg-card border border-border"
      data-testid="config-renovacion-automatica"
      aria-labelledby="renovacion-automatica-titulo"
    >
      <div className="flex items-center gap-2 text-foreground">
        <ArrowsClockwise className="w-5 h-5 text-fg-muted" weight="duotone" />
        <h3 id="renovacion-automatica-titulo" className="text-base font-semibold">
          Renovación automática
        </h3>
      </div>

      <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-surface-muted p-4">
        <div className="space-y-1">
          <label htmlFor="renovacion-automatica-switch" className="block text-sm font-medium text-foreground">
            Prorrogar los contratos vencidos solos
          </label>
          <p className="text-xs text-muted-foreground" data-testid="renovacion-automatica-hint">
            {prendida
              ? 'Al día siguiente del vencimiento, si nadie avisó que no renueva, el contrato se prorroga solo: vivienda por el mismo término (Ley 820, art. 6), local comercial por lo pactado o mes a mes. Se extienden sus cuotas y el canon sube en el aniversario. Con aviso de no renovación queda en alerta para que decidas. Ningún correo sale solo: la carta del incremento se manda desde la bandeja de cartas.'
              : 'Apagado: el contrato se prorroga igual por ley, pero Leasefy no extiende sus cuotas solo. Se prorroga a mano desde la ficha del contrato.'}
          </p>
          {!canEdit && <p className="text-xs text-muted-foreground">Sólo un administrador puede cambiar esto.</p>}
        </div>
        <Switch
          id="renovacion-automatica-switch"
          data-testid="renovacion-automatica-switch"
          checked={prendida}
          disabled={!canEdit || guardando}
          onCheckedChange={(v) => void cambiarPrendida(v)}
        />
      </div>

      <div className="max-w-xs space-y-1.5">
        <label htmlFor="renovacion-ipc-vigente" className="block text-sm font-medium text-foreground">
          IPC vigente (%)
        </label>
        <Input
          id="renovacion-ipc-vigente"
          data-testid="renovacion-ipc-vigente"
          type="text"
          inputMode="decimal"
          placeholder="5,2"
          value={ipcTexto}
          disabled={!canEdit || guardando}
          aria-invalid={!!errorDeIpc}
          aria-describedby="renovacion-ipc-ayuda"
          onChange={(e) => setIpcTexto(e.target.value)}
          onBlur={() => void confirmarIpc()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          className={cn('w-28 tabular-nums', errorDeIpc && 'border-danger/30')}
        />
        <p
          id="renovacion-ipc-ayuda"
          data-testid="renovacion-ipc-ayuda"
          className={cn('text-xs', errorDeIpc ? 'text-danger' : 'text-muted-foreground')}
        >
          {errorDeIpc ??
            'Se usa para el incremento del canon en cada renovación; si está vacío se usa el IPC de diciembre del año anterior de la tabla de Leasefy.'}
        </p>
      </div>

      {/* N3: el IPC por año. El de arriba no tiene año y se queda viejo en silencio. */}
      <ConfigIpcPorAnio agency={agency} onSave={onSave} canEdit={canEdit} />

      {hayMovimiento && pronostico && (
        <p
          className="flex items-start gap-2 rounded-lg border border-border bg-surface-muted p-3 text-xs text-fg-muted"
          data-testid="renovacion-pronostico"
        >
          <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" weight="duotone" />
          <span>
            Si corriera ahora: <span className="font-mono tabular-nums">{pronostico.prorrogas}</span> contratos
            se prorrogarían (se escriben sus cuotas nuevas),{' '}
            <span className="font-mono tabular-nums">{pronostico.alertas}</span> quedarían en alerta y{' '}
            <span className="font-mono tabular-nums">{pronostico.porConfirmar}</span> esperan que una persona
            confirme el término. El proceso corre todos los días a las 00:20.
          </span>
        </p>
      )}
    </section>
  );
}

export default ConfigRenovacionAutomatica;
