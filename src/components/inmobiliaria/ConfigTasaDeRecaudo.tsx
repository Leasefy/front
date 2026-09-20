'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChartLineUp, Info, Warning } from '@phosphor-icons/react';
import { RadioCard, RadioCardGroup } from '@leasefy/cadence';

import { useI18n } from '@/lib/i18n';
import { inmobiliariaDashboardApi } from '@/lib/api/inmobiliaria.service';
import { textoDeTasa } from '@/lib/tasas';
import {
  BASES_DE_LA_TASA_DE_RECAUDO,
  BASE_POR_DEFECTO,
  esBaseDeLaTasa,
  fraseDeLasCifras,
  type BaseDeLaTasaDeRecaudo,
  type ComoSeMideLaTasa,
} from '@/lib/tasa-de-recaudo';
import { nombreDelMes } from '@/lib/utils/mes';
import type { AgencyProfile, UpdateAgencyPayload } from '@/lib/types/inmobiliaria';

interface ConfigTasaDeRecaudoProps {
  /** La fila real de la agencia (GET /inmobiliaria/config → `agency`). */
  agency: AgencyProfile;
  /**
   * Guarda SÓLO el campo cambiado por PUT /inmobiliaria/agency — el mismo
   * handler del perfil (avisa con toast, con el mensaje del back, y refresca la
   * agencia). Debe rechazar si falla, para que la opción vuelva a como estaba.
   */
  onSave?: (payload: UpdateAgencyPayload) => Promise<void> | void;
  /** Sólo el ADMIN de la agencia: el back rechaza el PUT a los demás. */
  canEdit?: boolean;
}

/**
 * ConfigTasaDeRecaudo — «¿Cómo mides tu tasa de recaudo?»
 *
 * 🔴 Por qué existe: para la misma agencia el Resumen decía 2,2 % y Cobros
 * emitidos 43,6 %, las dos «tasa de recaudo». Eran dos preguntas distintas, y
 * Nico decidió que «eso lo pone cada negocio». Acá se elige, y todas las
 * pantallas que muestran la tasa la miden igual y dicen con qué fórmula.
 *
 * Cada opción lleva una frase, un ejemplo con números y —si el back pudo
 * medirlas— lo que daría con los números de la inmobiliaria este mes: elegir
 * a ciegas entre dos definiciones es cómo se llega a comparar 2,2 con 43,6.
 *
 * Se guarda al elegir, como las demás perillas del perfil. Sin la migración en
 * la base el back dice `disponible: false` y la tarjeta lo explica en vez de
 * dejar tocar algo que va a responder 503.
 */
export function ConfigTasaDeRecaudo({ agency, onSave, canEdit = true }: ConfigTasaDeRecaudoProps) {
  const { t, locale, formatCurrency } = useI18n();

  const [datos, setDatos] = useState<ComoSeMideLaTasa | null>(null);
  const [cargando, setCargando] = useState(true);
  const [falloAlCargar, setFalloAlCargar] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    inmobiliariaDashboardApi
      .getTasaDeRecaudo()
      .then((r) => {
        if (!vigente) return;
        setDatos(r);
        setFalloAlCargar(false);
      })
      .catch(() => {
        if (vigente) setFalloAlCargar(true);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [version]);

  /*
   * Lo guardado: lo que dice el back (que ya resolvió el NULL y la columna que
   * falta), o la fila de la agencia mientras llega, o el valor por defecto.
   */
  const guardada: BaseDeLaTasaDeRecaudo =
    datos?.base ?? (esBaseDeLaTasa(agency.tasaDeRecaudoSobre) ? agency.tasaDeRecaudoSobre : BASE_POR_DEFECTO);

  const [elegida, setElegida] = useState<BaseDeLaTasaDeRecaudo>(guardada);
  const [guardando, setGuardando] = useState(false);
  useEffect(() => setElegida(guardada), [guardada]);

  const disponible = datos?.disponible !== false;
  const bloqueada = !canEdit || !disponible || guardando;

  const elegir = useCallback(
    async (valor: string) => {
      if (!esBaseDeLaTasa(valor) || valor === guardada) return;
      setElegida(valor);
      setGuardando(true);
      try {
        await onSave?.({ tasaDeRecaudoSobre: valor });
        setVersion((v) => v + 1);
      } catch {
        // El padre ya avisó con el mensaje del back (403, o el 503 sin migración).
        setElegida(guardada);
      } finally {
        setGuardando(false);
      }
    },
    [guardada, onSave],
  );

  const medidaDelMes = (base: BaseDeLaTasaDeRecaudo) => datos?.opciones.find((o) => o.base === base) ?? null;

  return (
    <section
      className="space-y-4 p-5 rounded-lg bg-card border border-border"
      data-testid="config-tasa-de-recaudo"
      aria-labelledby="tasa-de-recaudo-titulo"
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-foreground">
          <ChartLineUp className="w-5 h-5 text-fg-muted" weight="duotone" />
          <h3 id="tasa-de-recaudo-titulo" className="text-base font-semibold">
            {t('inmobiliaria.tasaDeRecaudo.ajuste.titulo')}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">{t('inmobiliaria.tasaDeRecaudo.ajuste.intro')}</p>
      </div>

      {!disponible && (
        <p
          className="flex items-start gap-2 rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm text-fg-muted"
          role="status"
          data-testid="tasa-de-recaudo-no-disponible"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          {t('inmobiliaria.tasaDeRecaudo.ajuste.noDisponible')}
        </p>
      )}

      <RadioCardGroup
        className="grid gap-3 md:grid-cols-2"
        value={elegida}
        onValueChange={(v) => void elegir(v)}
        disabled={bloqueada}
        aria-labelledby="tasa-de-recaudo-titulo"
      >
        {BASES_DE_LA_TASA_DE_RECAUDO.map((base) => {
          const medida = medidaDelMes(base);
          return (
            <RadioCard
              key={base}
              value={base}
              data-testid={`tasa-de-recaudo-opcion-${base}`}
              label={t(`inmobiliaria.tasaDeRecaudo.ajuste.opcion.${base}.titulo`)}
              badge={
                base === guardada ? (
                  <span className="text-xs font-medium text-primary">{t('inmobiliaria.tasaDeRecaudo.ajuste.enUso')}</span>
                ) : base === BASE_POR_DEFECTO ? (
                  <span className="text-xs text-fg-muted">{t('inmobiliaria.tasaDeRecaudo.ajuste.porDefecto')}</span>
                ) : undefined
              }
              description={
                <span className="mt-1 block space-y-2 text-left">
                  <span className="block text-sm text-fg-muted">
                    {t(`inmobiliaria.tasaDeRecaudo.ajuste.opcion.${base}.explicacion`)}
                  </span>
                  <span className="block text-xs text-fg-muted">
                    {t(`inmobiliaria.tasaDeRecaudo.ajuste.opcion.${base}.ejemplo`)}
                  </span>
                  {medida && datos && (
                    <span
                      className="block text-xs font-medium text-fg tabular-nums"
                      data-testid={`tasa-de-recaudo-con-tus-numeros-${base}`}
                    >
                      {t('inmobiliaria.tasaDeRecaudo.ajuste.conTusNumeros', {
                        mes: nombreDelMes(datos.month, locale),
                        tasa: textoDeTasa(medida.pct),
                        cifras: fraseDeLasCifras(medida, t, formatCurrency),
                      })}
                    </span>
                  )}
                </span>
              }
            />
          );
        })}
      </RadioCardGroup>

      {cargando && !datos && (
        <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
          {t('inmobiliaria.tasaDeRecaudo.ajuste.cargando')}
        </p>
      )}
      {!cargando && falloAlCargar && !datos && (
        <p className="flex items-center gap-2 text-xs text-fg-muted" data-testid="tasa-de-recaudo-sin-numeros">
          <Warning className="h-4 w-4 shrink-0" />
          {t('inmobiliaria.tasaDeRecaudo.ajuste.errorNumeros')}
        </p>
      )}
      {!canEdit && <p className="text-xs text-muted-foreground">{t('inmobiliaria.tasaDeRecaudo.ajuste.soloAdmin')}</p>}
    </section>
  );
}

export default ConfigTasaDeRecaudo;
