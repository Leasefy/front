'use client';

/**
 * EL QR DEL BANCO de un medio de pago (Nico 29-10-2026: «demos opción también con llave de Bre-B y QR»). Dentro del
 * editor del medio: la inmobiliaria sube la imagen del QR que le dio su banco (Bancolombia, Nequi, Bre-B…), la cambia
 * o la quita. El inquilino la ve en «Cómo pagar» y al pagar su aprobación, y la escanea con la app de su banco.
 *
 * El QR se guarda en el momento (no espera a «Guardar cambios»): es un archivo, no un campo del formulario. Por eso
 * sólo se ofrece en un medio que ya existe.
 */

import { useRef, useState } from 'react';
import { QrCode, UploadSimple } from '@phosphor-icons/react';
import { Presence } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { toast } from '@/components/ui/toast';
import { mediosDePagoApi } from '@/lib/api/medios-de-pago.service';
import type { MedioDePago } from '@/lib/api/medios-de-pago.types';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';

/** Lo mismo que acepta el back: JPG, PNG o WebP, hasta 2 MB. */
const TIPOS_DE_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 2 * 1024 * 1024;

export function porQueNoSirveElQr(archivo: File): string | null {
  if (!TIPOS_DE_IMAGEN.includes(archivo.type)) return 'El QR tiene que ser una imagen JPG, PNG o WebP.';
  if (archivo.size > MAX_BYTES) return 'La imagen del QR pesa más de 2 MB. Sube una captura más liviana.';
  return null;
}

export interface QrDelMedioProps {
  /** `null` = todavía no se puede subir (el medio no existe, o se guardó con un tipo que no lleva QR). */
  medio: Pick<MedioDePago, 'id' | 'nombre'> | null;
  /** Lo que se dice cuando `medio` es `null`. */
  porQueTodaviaNo?: string;
  qrUrl: string | null;
  puedeEditar: boolean;
  onCambio: (medio: MedioDePago) => void;
}

export function QrDelMedio({ medio, porQueTodaviaNo, qrUrl, puedeEditar, onCambio }: QrDelMedioProps) {
  const archivo = useRef<HTMLInputElement>(null);
  const [haciendo, setHaciendo] = useState<'subir' | 'quitar' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const subir = async (f: File | undefined) => {
    if (archivo.current) archivo.current.value = '';
    if (!f || !medio) return;
    const malo = porQueNoSirveElQr(f);
    setError(malo);
    if (malo) return;
    setHaciendo('subir');
    try {
      onCambio(await mediosDePagoApi.subirQr(medio.id, f));
      toast.success(`Listo: el QR de «${medio.nombre}» ya lo ve el inquilino.`);
    } catch (e) {
      setError(mensajeParaLaPersona(e, { porDefecto: 'No pudimos subir el QR.', accion: 'subir el QR' }));
    } finally {
      setHaciendo(null);
    }
  };

  const quitar = async () => {
    if (!medio) return;
    setHaciendo('quitar');
    setError(null);
    try {
      onCambio(await mediosDePagoApi.quitarQr(medio.id));
      toast.success(`Listo: «${medio.nombre}» ya no muestra el QR.`);
    } catch (e) {
      setError(mensajeParaLaPersona(e, { porDefecto: 'No pudimos quitar el QR.', accion: 'quitar el QR' }));
    } finally {
      setHaciendo(null);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-border px-4 py-3" data-testid="qr-del-medio">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {qrUrl ? (
          // Una captura del banco: se pinta tal cual, con su fondo (el QR necesita el blanco para leerse).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrUrl}
            alt={medio ? `QR de «${medio.nombre}»` : 'QR del medio'}
            className="h-24 w-24 shrink-0 rounded-md border border-border object-contain"
            data-testid="qr-del-medio-imagen"
          />
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-surface-muted">
            <QrCode className="h-8 w-8 text-fg-subtle" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="space-y-0.5 text-sm">
            <p className="text-fg">
              QR del banco <span className="ml-1 text-caption text-fg-muted">(opcional)</span>
            </p>
            <p className="text-caption text-fg-muted">
              {medio
                ? 'El inquilino lo escanea con la app de su banco para pagarte. Imagen JPG, PNG o WebP, hasta 2 MB.'
                : (porQueTodaviaNo ?? 'Crea el medio y, al editarlo, sube el QR que te dio tu banco.')}
            </p>
          </div>
          {medio && puedeEditar ? (
            <div className="flex flex-wrap gap-2">
              <input
                ref={archivo}
                type="file"
                accept={TIPOS_DE_IMAGEN.join(',')}
                className="hidden"
                onChange={(e) => void subir(e.target.files?.[0])}
                data-testid="qr-del-medio-archivo"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                hideArrow
                isLoading={haciendo === 'subir'}
                disabled={haciendo !== null}
                onClick={() => archivo.current?.click()}
                data-testid="qr-del-medio-subir"
              >
                <UploadSimple className="h-4 w-4" aria-hidden="true" />
                {qrUrl ? 'Cambiar el QR' : 'Subir el QR'}
              </Button>
              {qrUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  hideArrow
                  isLoading={haciendo === 'quitar'}
                  disabled={haciendo !== null}
                  onClick={() => void quitar()}
                  data-testid="qr-del-medio-quitar"
                >
                  Quitar
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <Presence show={Boolean(error)} direction="down">
        <ErrorDelCampo id="qr-del-medio-error" mensaje={error ?? undefined} className="mt-0" />
      </Presence>
    </div>
  );
}
