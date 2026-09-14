'use client';

/**
 * «Preparar para trabajar sin señal» — el botón que se toca en la OFICINA,
 * antes de salir.
 *
 * 🔴 Nico, 2026-09-12: «hay muchos apartamentos donde no hay señal; la persona
 * que hace el inventario debería poder agregar todo sin señal y, cuando tenga
 * señal, cargarlo».
 *
 * La copia también se guarda sola cada vez que la ficha abre con señal, así
 * que este botón no es la única forma. Existe porque lo otro es suerte: quien
 * sabe a qué tres apartamentos va mañana no puede depender de haber pasado
 * por sus fichas esta semana.
 *
 * Dice SIEMPRE de cuándo es lo guardado. Una copia sin fecha es una promesa
 * sin plazo, y la persona necesita saber si lo que va a ver en el apartamento
 * es de hoy o del mes pasado.
 */

import { CheckCircle, CloudArrowDown, SpinnerGap, WarningCircle, WifiSlash } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';

interface Props {
  /** Cuándo se guardó la copia. `null` = este inmueble no está preparado. */
  guardadoEn: number | null;
  preparando: boolean;
  /** Cómo salió la última vez que se tocó. `null` = no se tocó. */
  ultimaPreparacion: boolean | null;
  /** `true` cuando el navegador dice que no hay red. */
  sinSenal: boolean;
  onPreparar: () => void;
}

/** «12 de septiembre, 9:19 p. m.» */
export function cuando(marca: number): string {
  return new Date(marca).toLocaleString('es-CO', {
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function PrepararParaSinSenal({
  guardadoEn,
  preparando,
  ultimaPreparacion,
  sinSenal,
  onPreparar,
}: Props) {
  const { t } = useI18n();

  return (
    <div
      className="rounded-md border border-border bg-surface p-3 flex flex-col gap-2"
      data-testid="preparar-sin-senal"
    >
      <div className="flex items-start gap-2">
        {sinSenal ? (
          <WifiSlash className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
        ) : (
          <CloudArrowDown className="w-5 h-5 text-fg-muted flex-shrink-0 mt-0.5" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-fg">{t('inmobiliaria.sinSenal.titulo')}</p>
          <p className="text-xs text-fg-muted" data-testid="preparar-sin-senal-estado">
            {guardadoEn
              ? t('inmobiliaria.sinSenal.guardado', { cuando: cuando(guardadoEn) })
              : sinSenal
                ? t('inmobiliaria.sinSenal.sinCopia')
                : t('inmobiliaria.sinSenal.explicacion')}
          </p>
        </div>
      </div>

      {/* Sin red no hay nada que bajar: ofrecer el botón sería prometer algo
          que no se puede cumplir justo cuando más se nota. */}
      {!sinSenal && (
        <Button
          variant="secondary"
          hideArrow
          size="sm"
          className="w-full"
          disabled={preparando}
          onClick={onPreparar}
          data-testid="preparar-sin-senal-boton"
        >
          {preparando ? (
            <SpinnerGap className="w-4 h-4 animate-spin" />
          ) : (
            <CloudArrowDown className="w-4 h-4" />
          )}
          {guardadoEn
            ? t('inmobiliaria.sinSenal.actualizar')
            : t('inmobiliaria.sinSenal.preparar')}
        </Button>
      )}

      {ultimaPreparacion === true && !preparando && (
        <p className="text-xs text-success flex items-center gap-1">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {t('inmobiliaria.sinSenal.listo')}
        </p>
      )}
      {ultimaPreparacion === false && !preparando && (
        <p className="text-xs text-warning flex items-start gap-1">
          <WarningCircle className="w-4 h-4 flex-shrink-0 mt-px" />
          {t('inmobiliaria.sinSenal.noSePudo')}
        </p>
      )}
    </div>
  );
}
