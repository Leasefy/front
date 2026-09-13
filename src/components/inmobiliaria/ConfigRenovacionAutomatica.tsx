'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowsClockwise, Warning } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui';
import { Switch } from '@/components/ui/switch';
import { renovacionAutomaticaApi } from '@/lib/api/renovacion-automatica.service';
import type { AgencyProfile, UpdateAgencyPayload } from '@/lib/types/inmobiliaria';

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
 * 🔴 Lo que este interruptor enciende NO es un reporte: a las 00:20 le manda
 * correo al inquilino Y al propietario de cada contrato que entra en preaviso,
 * y le sube el canon al que vence. Por eso la pantalla dice antes cuántos son
 * —`?simular=true` cuenta sin hacer— en vez de dejar que Nico se entere
 * mañana. Y por eso el default en el esquema sigue en `false`: prenderla es
 * una decisión de la inmobiliaria, agencia por agencia.
 *
 * El contrato se prorroga por ley (820/2003, art. 22) aunque esto esté
 * apagado: lo que cambia es si Leasefy avisa y sube el canon solo, o si lo
 * hace un humano desde el cajón de renovaciones.
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
  const [pronostico, setPronostico] = useState<{ propuestas: number; renovadas: number } | null>(null);
  useEffect(() => {
    if (!canEdit) return;
    let vigente = true;
    renovacionAutomaticaApi
      .simular()
      .then((r) => {
        if (vigente) setPronostico({ propuestas: r.propuestas, renovadas: r.renovadas });
      })
      .catch(() => {
        /* silencio: el pronóstico es información de más, no el estado */
      });
    return () => {
      vigente = false;
    };
  }, [canEdit]);

  const hayMovimiento = !!pronostico && pronostico.propuestas + pronostico.renovadas > 0;

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
            Renovar los contratos solos
          </label>
          <p className="text-xs text-muted-foreground" data-testid="renovacion-automatica-hint">
            {prendida
              ? 'Tres meses antes del vencimiento sale la propuesta al inquilino y al propietario con el canon incrementado; el día del vencimiento, si nadie avisó que no renueva, el contrato se prorroga solo y el canon sube.'
              : 'Apagado: el contrato se prorroga igual por ley, pero Leasefy no manda la propuesta ni sube el canon solo. Lo hace un humano desde el cajón de renovaciones.'}
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

      {hayMovimiento && pronostico && (
        <p
          className="flex items-start gap-2 rounded-lg border border-border bg-surface-muted p-3 text-xs text-fg-muted"
          data-testid="renovacion-pronostico"
        >
          <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" weight="duotone" />
          <span>
            Si corriera ahora: <span className="font-mono tabular-nums">{pronostico.propuestas}</span> propuestas
            por correo al inquilino y al propietario, y{' '}
            <span className="font-mono tabular-nums">{pronostico.renovadas}</span> contratos renovados con el
            canon nuevo. El cron corre todos los días a las 00:20.
          </span>
        </p>
      )}
    </section>
  );
}

export default ConfigRenovacionAutomatica;
