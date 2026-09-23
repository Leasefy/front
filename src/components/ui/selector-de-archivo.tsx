'use client';

/**
 * Elegir UN archivo para un formulario, en español.
 *
 * 🔴 23-09, QA del cambio de cuenta: el `<input type="file">` desnudo pinta su
 * botón en el idioma del NAVEGADOR («Choose File», «No file chosen»), igual
 * que `<input type="month">` pinta el mes. Acá el input queda escondido
 * (`sr-only`, sigue en el árbol: la etiqueta con `htmlFor` lo abre y el lector
 * de pantalla lo anuncia) y lo que se ve es nuestro: un botón «Elegir
 * archivo» y, con el archivo elegido, la misma tarjeta que la migración
 * (`TarjetaDeArchivo`): nombre, peso, «Elegir otro» y «Quitar».
 *
 * No sube nada: guarda el `File` en el padre, que decide cuándo enviarlo.
 * `TarjetaDeArchivo` no sirve tal cual porque vive atada a `react-dropzone`
 * (su input es el del dropzone) y pinta el ícono de Excel.
 */

import { useRef } from 'react';
import { FileText, Trash, UploadSimple } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { pesoLegible } from '@/components/migracion/TarjetaDeArchivo';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function SelectorDeArchivo({
  id,
  accept,
  archivo,
  onElegir,
  testid,
  deshabilitado = false,
  invalido = false,
  className,
}: {
  /** El `id` del input: la etiqueta de afuera lo apunta con `htmlFor`. */
  id: string;
  accept?: string;
  archivo: File | null;
  /** `null` = quitaron el archivo. */
  onElegir: (archivo: File | null) => void;
  /** Va en el input escondido: las pruebas le disparan el `change`. */
  testid?: string;
  deshabilitado?: boolean;
  /** Falta y es obligatorio: el borde lo dice. */
  invalido?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const abrir = () => input.current?.click();

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface px-3 py-2',
        invalido && !archivo && 'border-danger/30',
        className,
      )}
      data-testid={testid ? `${testid}-selector` : undefined}
    >
      <input
        ref={input}
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={deshabilitado}
        data-testid={testid}
        onChange={(e) => {
          onElegir(e.target.files?.[0] ?? null);
          // Elegir el MISMO archivo después de quitarlo vuelve a disparar el cambio.
          e.target.value = '';
        }}
      />
      {archivo ? (
        <>
          <FileText className="h-5 w-5 shrink-0 text-fg-muted" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-fg" title={archivo.name}>
              {archivo.name}
            </p>
            <p className="text-caption text-fg-muted font-mono">{pesoLegible(archivo.size)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button type="button" variant="ghost" size="sm" hideArrow onClick={abrir} disabled={deshabilitado}>
              <UploadSimple className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {t('common.selectorDeArchivo.elegirOtro')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              hideArrow
              onClick={() => onElegir(null)}
              disabled={deshabilitado}
              className="text-destructive hover:text-destructive"
              aria-label={t('common.selectorDeArchivo.quitarArchivo', { nombre: archivo.name })}
            >
              <Trash className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {t('common.selectorDeArchivo.quitar')}
            </Button>
          </div>
        </>
      ) : (
        <>
          <Button type="button" variant="outline" size="sm" hideArrow onClick={abrir} disabled={deshabilitado}>
            <UploadSimple className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {t('common.selectorDeArchivo.elegir')}
          </Button>
          <span className="text-sm text-fg-muted">{t('common.selectorDeArchivo.ninguno')}</span>
        </>
      )}
    </div>
  );
}
