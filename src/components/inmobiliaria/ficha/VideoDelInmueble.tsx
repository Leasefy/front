'use client';

import { useEffect, useState } from 'react';
import { VideoCamera } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { toast } from '@/components/ui/toast';
import { propertiesApi } from '@/lib/api/properties.service';
import { LARGO_MAXIMO_DEL_ENLACE, MENSAJE_DEL_VIDEO, videoInvalido } from '@/lib/marketplace/video';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';

/**
 * El video del inmueble, pegando el enlace (Juan, 27-10-2026: «no aparece dónde pegar el vídeo cuando ya el
 * inmueble está creado»). Va en «Multimedia», junto a las fotos. La misma regla de `lib/marketplace/video.ts`.
 */
export function VideoDelInmueble({ propertyId, videoUrl, onGuardado }: { propertyId: string; videoUrl?: string | null; onGuardado?: () => void }) {
  const [enlace, setEnlace] = useState(videoUrl ?? '');
  const [guardando, setGuardando] = useState(false);
  useEffect(() => setEnlace(videoUrl ?? ''), [videoUrl]);
  const error = videoInvalido(enlace) ? MENSAJE_DEL_VIDEO : null;
  const cambio = enlace.trim() !== (videoUrl ?? '').trim();

  const guardar = async () => {
    if (error) return;
    setGuardando(true);
    try {
      await propertiesApi.update(propertyId, { videoUrl: enlace.trim() || null });
      toast.success(enlace.trim() ? 'Video guardado' : 'Video quitado');
      onGuardado?.();
    } catch (e) {
      toast.error('No pudimos guardar el video', { description: mensajeParaLaPersona(e, { accion: 'guardar el video' }) });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="rounded-lg border border-border bg-surface p-5" data-testid="video-del-inmueble">
      <h3 className="flex items-center gap-2 text-[16px] font-medium text-fg">
        <VideoCamera className="h-5 w-5 text-primary" weight="duotone" aria-hidden="true" />
        Video
      </h3>
      <p className="mt-1 text-sm text-fg-muted">Pega el enlace del video que ya subiste a Instagram, TikTok, YouTube o Facebook.</p>
      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          void guardar();
        }}
        noValidate
      >
        <Input
          type="url"
          inputMode="url"
          value={enlace}
          onChange={(e) => setEnlace(e.target.value)}
          placeholder="https://www.instagram.com/reel/…"
          maxLength={LARGO_MAXIMO_DEL_ENLACE}
          aria-label="Enlace del video"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'video-del-inmueble-error' : undefined}
          className="min-w-0 flex-1"
          data-testid="video-del-inmueble-enlace"
        />
        <Button type="submit" hideArrow disabled={!cambio || Boolean(error)} isLoading={guardando}>
          Guardar
        </Button>
      </form>
      <ErrorDelCampo id="video-del-inmueble-error" mensaje={error} />
    </section>
  );
}
