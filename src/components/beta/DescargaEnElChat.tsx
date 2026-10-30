'use client';

/**
 * «Descargar» dentro de una tarjeta del chat (D1, 30-10-2026): la pieza común
 * del chat del panel y del portal. Baja el archivo ahí mismo con la sesión de
 * la persona; mientras baja, el botón dice que está en curso y no se dispara
 * dos veces; al terminar dice qué pasó, y si falla, por qué y se puede
 * reintentar. Nunca navega.
 */
import { useState } from 'react';
import { DownloadSimple } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { useTr } from '@/lib/i18n/use-tr';

export function DescargaEnElChat({
  etiqueta,
  bajar,
  accion,
  sinBorde = false,
}: {
  /** Lo que dice el botón: «Descargar el certificado», «Descargar exogena-1001.csv». */
  etiqueta: string;
  bajar: () => Promise<void>;
  /** Para el error en palabras: «bajar el archivo». */
  accion: string;
  /** Dentro del pie de una tarjeta, sin la línea de arriba. */
  sinBorde?: boolean;
}) {
  const tr = useTr();
  const [bajando, setBajando] = useState(false);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alTocar = async () => {
    if (bajando) return;
    setError(null);
    setBajando(true);
    try {
      await bajar();
      setListo(true);
    } catch (e) {
      setError(
        mensajeParaLaPersona(e, {
          accion,
          porDefecto: tr('No pude bajar el archivo. Prueba de nuevo en un momento.'),
        }),
      );
    } finally {
      setBajando(false);
    }
  };

  return (
    <div className={sinBorde ? 'flex flex-col gap-2' : 'flex flex-col gap-2 border-t border-border-faint pt-3'} data-testid="descarga-en-el-chat">
      {listo && !error && (
        <p role="status" className="font-body text-caption text-success">
          {tr('Listo: quedó en tus descargas.')}
        </p>
      )}
      {error && (
        <p role="alert" className="font-body text-caption text-danger">
          {error}
        </p>
      )}
      <div>
        <Button variant="outline" size="sm" hideArrow isLoading={bajando} disabled={bajando} className="gap-1.5" onClick={() => void alTocar()}>
          <DownloadSimple className="size-4" aria-hidden="true" />
          {listo ? tr('Descargarlo otra vez') : etiqueta}
        </Button>
      </div>
    </div>
  );
}
