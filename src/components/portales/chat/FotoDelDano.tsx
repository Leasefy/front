'use client';

/**
 * La foto (o el video) del daño, DENTRO de la tarjeta de la solicitud recién
 * radicada desde el chat del portal: sube a `POST /pqrs/:id/adjuntos` con la
 * sesión de la persona (mismo camino y mismos topes que «Nueva solicitud»).
 */
import { useRef, useState } from 'react';
import { Camera } from '@phosphor-icons/react';
import { Button } from '@leasefy/cadence';

import { pqrsApi } from '@/lib/api/pqrs.service';
import { ACCEPT_DE_ADJUNTOS_DE_PQRS, problemaDelAdjuntoDePqrs } from '@/lib/api/pqrs-adjuntos';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';

export function FotoDelDano({ pqrsId }: { pqrsId: string }) {
  const input = useRef<HTMLInputElement | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [subidas, setSubidas] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const subir = async (archivo: File | undefined) => {
    if (!archivo) return;
    const problema = problemaDelAdjuntoDePqrs(archivo);
    if (problema) {
      setError(problema);
      return;
    }
    setError(null);
    setSubiendo(true);
    try {
      await pqrsApi.subirAdjunto(pqrsId, archivo);
      setSubidas((s) => [...s, archivo.name]);
    } catch (e) {
      setError(
        mensajeParaLaPersona(e, {
          accion: 'subir la foto',
          porDefecto: 'No pude subir la foto. Prueba de nuevo en un momento.',
        }),
      );
    } finally {
      setSubiendo(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-2 border-t border-border-faint pt-3">
      {subidas.length > 0 && (
        <p role="status" className="font-body text-[13px] leading-relaxed text-success">
          {subidas.length === 1
            ? `Le agregué a tu solicitud «${subidas[0]}».`
            : `Le agregué ${subidas.length} archivos a tu solicitud.`}
        </p>
      )}
      {error && (
        <p role="alert" className="font-body text-[13px] leading-relaxed text-danger">
          {error}
        </p>
      )}
      <input
        ref={input}
        type="file"
        accept={ACCEPT_DE_ADJUNTOS_DE_PQRS}
        className="hidden"
        aria-label="Foto o video del daño"
        onChange={(e) => void subir(e.target.files?.[0])}
      />
      <div>
        <Button
          variant="outline"
          size="sm"
          loading={subiendo}
          disabled={subiendo}
          onClick={() => input.current?.click()}
        >
          <Camera className="size-4" aria-hidden="true" />
          {subidas.length > 0 ? 'Agregar otra foto' : 'Agregar una foto del daño'}
        </Button>
      </div>
    </div>
  );
}
