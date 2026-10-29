'use client';

/**
 * LA FOTO DEL FIRMANTE con nuestra cámara (Nico, 28-10-2026: «solo necesitamos la foto y no prueba de vida… eso de la
 * foto podríamos tenerlo nosotros» → eligió «cámara propia + revisar la cara»). Es el modo de siempre (`FOTO`).
 *
 * Recorrido: «Abrir la cámara» → la cámara de frente, en vivo, con un óvalo; el navegador revisa la cara cada 0,4 s
 * (`lib/firmas/revisor-de-la-cara.ts`) y «Tomar la foto» se prende sólo con UNA cara de frente, centrada y cerca → la
 * foto quieta: «Usar esta foto» o «Tomar otra» → se guarda y la página pasa al código y la firma.
 *
 * Salidas: sin permiso (cómo darlo), sin cámara (abrir el mismo enlace en el celular), cámara ocupada. Si el revisor no
 * carga (red, un navegador viejo) en 12 s, deja tomarla igual y se guarda «sin revisar»: la firma no se frena por eso.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, WarningCircle } from '@phosphor-icons/react';
import { CopyButton, CrossFade, Ilustracion } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { firmaPublicaApi, type PruebaDeVidaDelFirmante } from '@/lib/api/firmas.service';
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion';
import {
  cargarElRevisorDeLaCara,
  encuadreDeLaFoto,
  FRASE_DEL_ENCUADRE,
  type EncuadreDeLaFoto,
  type RevisorDeLaCara,
} from '@/lib/firmas/revisor-de-la-cara';
import { cn } from '@/lib/utils';

import { CajaDelPaso } from './CajaDelPaso';

/** Cada cuánto se revisa la cara en vivo. */
const CADA_MS = 400;
/** Si el revisor no cargó en este tiempo, se deja tomar la foto sin revisión. */
const TOPE_DEL_REVISOR_MS = 12_000;
/** El lado largo de la foto que se guarda (≈ 80–150 KB en JPEG). */
const ANCHO_DE_LA_FOTO = 720;

type Fase = 'inicio' | 'abriendo' | 'en-vivo' | 'tomada';
export type FalloDeLaCamara = 'sin-permiso' | 'sin-camara' | 'ocupada';

/** Qué pasó al pedir la cámara, por el nombre del error del navegador. */
export function falloDeLaCamara(e: unknown): FalloDeLaCamara {
  const nombre = (e as { name?: string } | null)?.name ?? '';
  if (nombre === 'NotAllowedError' || nombre === 'SecurityError' || nombre === 'PermissionDeniedError') return 'sin-permiso';
  if (nombre === 'NotFoundError' || nombre === 'DevicesNotFoundError' || nombre === 'OverconstrainedError') return 'sin-camara';
  return 'ocupada';
}

const TEXTO_DEL_FALLO: Record<FalloDeLaCamara, { titulo: string; texto: string }> = {
  'sin-permiso': {
    titulo: 'Tu navegador no dejó usar la cámara',
    texto: 'Toca el candado o el ícono de la cámara junto a la dirección de la página, permite la cámara y vuelve a intentarlo.',
  },
  'sin-camara': {
    titulo: 'No encontramos una cámara',
    texto: 'Abre este mismo enlace en tu celular: ahí te tomas la foto y firmas en un minuto.',
  },
  ocupada: {
    titulo: 'No pudimos abrir la cámara',
    texto: 'Puede que otra aplicación la esté usando. Ciérrala y vuelve a intentarlo.',
  },
};

export function CamaraDelFirmante({ token, onCambio }: { token: string; onCambio: (p: PruebaDeVidaDelFirmante) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const flujo = useRef<MediaStream | null>(null);
  const revisor = useRef<RevisorDeLaCara | null>(null);
  const [fase, setFase] = useState<Fase>('inicio');
  const [fallo, setFallo] = useState<FalloDeLaCamara | null>(null);
  const [encuadre, setEncuadre] = useState<EncuadreDeLaFoto | null>(null);
  const [sinRevisor, setSinRevisor] = useState(false);
  const [foto, setFoto] = useState<{ dataUrl: string; caraRevisada: boolean } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const apagar = () => {
    flujo.current?.getTracks().forEach((t) => t.stop());
    flujo.current = null;
  };
  useEffect(() => apagar, []);

  const abrir = async () => {
    setFallo(null);
    setFoto(null);
    setEncuadre(null);
    setFase('abriendo');
    // El revisor se carga mientras la cámara arranca; si no llega a tiempo, se deja tomar la foto igual.
    if (!revisor.current) {
      const tope = setTimeout(() => setSinRevisor(true), TOPE_DEL_REVISOR_MS);
      cargarElRevisorDeLaCara()
        .then((r) => {
          revisor.current = r;
        })
        .catch(() => setSinRevisor(true))
        .finally(() => clearTimeout(tope));
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setFallo('sin-camara');
      setFase('inicio');
      return;
    }
    try {
      flujo.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      setFase('en-vivo');
    } catch (e) {
      setFallo(falloDeLaCamara(e));
      setFase('inicio');
    }
  };

  // La cámara en el video: cuando llega la cámara o cuando se pinta el video, lo que pase de último.
  const conectar = useCallback((el: HTMLVideoElement | null) => {
    video.current = el;
    if (el && flujo.current && el.srcObject !== flujo.current) {
      el.srcObject = flujo.current;
      void el.play().catch(() => undefined);
    }
  }, []);
  useEffect(() => {
    if (fase === 'en-vivo') conectar(video.current);
  }, [fase, conectar]);

  /** El revisor falló a mitad: se deja tomar la foto sin revisión. */
  const sinRevision = () => {
    revisor.current = null;
    setEncuadre(null);
    setSinRevisor(true);
  };

  // La revisión en vivo: qué decirle a la persona y cuándo prender «Tomar la foto».
  useEffect(() => {
    if (fase !== 'en-vivo') return;
    let vivo = true;
    let espera: ReturnType<typeof setTimeout> | undefined;
    const vuelta = async () => {
      const v = video.current;
      const r = revisor.current;
      if (r && v && v.videoWidth > 0) {
        try {
          const caras = await r.revisar(v);
          if (vivo) setEncuadre(encuadreDeLaFoto(caras, v.videoWidth, v.videoHeight));
        } catch {
          if (vivo) sinRevision();
        }
      }
      if (vivo) espera = setTimeout(vuelta, CADA_MS);
    };
    void vuelta();
    return () => {
      vivo = false;
      if (espera) clearTimeout(espera);
    };
  }, [fase]);

  const puedeTomar = encuadre === 'lista' || (sinRevisor && !revisor.current);

  const tomar = async () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.min(ANCHO_DE_LA_FOTO, v.videoWidth);
    lienzo.height = Math.round((v.videoHeight / v.videoWidth) * lienzo.width);
    lienzo.getContext('2d')?.drawImage(v, 0, 0, lienzo.width, lienzo.height);
    // La foto misma también se revisa: la que se guarda es la que tiene la cara.
    let caraRevisada = false;
    const r = revisor.current;
    if (r) {
      try {
        const e = encuadreDeLaFoto(await r.revisar(lienzo), lienzo.width, lienzo.height);
        caraRevisada = e === 'lista';
        if (!caraRevisada) {
          setEncuadre(e);
          return;
        }
      } catch {
        sinRevision();
      }
    }
    setFoto({ dataUrl: lienzo.toDataURL('image/jpeg', 0.85), caraRevisada });
    apagar();
    setFase('tomada');
  };

  const cancelar = () => {
    apagar();
    setFase('inicio');
  };

  const usar = async () => {
    if (!foto) return;
    setEnviando(true);
    try {
      onCambio(await firmaPublicaApi.subirFoto(token, foto.dataUrl, foto.caraRevisada));
    } catch (err) {
      toast.error('No pudimos guardar tu foto.', { description: mensajeDelFallo(err, 'Intenta de nuevo en un momento.') });
    } finally {
      setEnviando(false);
    }
  };

  const enLaCamara = fase === 'abriendo' || fase === 'en-vivo';
  const frase =
    fase === 'abriendo'
      ? 'Abriendo la cámara…'
      : encuadre
        ? FRASE_DEL_ENCUADRE[encuadre]
        : sinRevisor
          ? 'Que tu cara se vea completa y con buena luz.'
          : 'Preparando la revisión de tu cara…';

  return (
    <CajaDelPaso testId="foto-del-firmante">
      {fallo ? (
        <WarningCircle className="mt-0.5 h-7 w-7 shrink-0 text-warning" aria-hidden="true" />
      ) : fase === 'inicio' ? (
        <Ilustracion nombre="camara" tono="voltaje" tamano={72} className="shrink-0" />
      ) : null}
      {/* «Abriendo» y «en vivo» son el mismo contenido: el video no se vuelve a montar. */}
      <CrossFade swapKey={fallo ?? (enLaCamara ? 'camara' : fase)} className="min-w-0 flex-1">
        {fallo ? (
          <div className="space-y-3" data-testid={`camara-${fallo}`}>
            <div className="space-y-1.5">
              <h2 className="text-h3 text-fg">{TEXTO_DEL_FALLO[fallo].titulo}</h2>
              <p className="text-body-sm text-fg-muted">{TEXTO_DEL_FALLO[fallo].texto}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              {fallo === 'sin-camara' ? (
                <>
                  <CopyButton
                    text={typeof window === 'undefined' ? '' : window.location.href}
                    label="Copiar el enlace"
                    copiedLabel="Copiado"
                    size="sm"
                  />
                  <Button variant="ghost" size="sm" onClick={() => void abrir()}>
                    Intentarlo de nuevo
                  </Button>
                </>
              ) : (
                <Button onClick={() => void abrir()} className="w-full sm:w-auto" data-testid="camara-reintentar">
                  <Camera className="mr-1.5 h-4 w-4" aria-hidden="true" /> Intentarlo de nuevo
                </Button>
              )}
            </div>
          </div>
        ) : fase === 'inicio' ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <h2 className="text-h3 text-fg">Tómate una foto</h2>
              <p className="text-body-sm text-fg-muted">
                Antes de firmar te tomas una foto con la cámara. Va en la hoja de firmas, junto a tu firma, para que se sepa
                que fuiste tú. Tarda unos segundos.
              </p>
            </div>
            <Button onClick={() => void abrir()} className="w-full sm:w-auto" data-testid="abrir-la-camara">
              <Camera className="mr-1.5 h-4 w-4" aria-hidden="true" /> Abrir la cámara
            </Button>
            <p className="text-caption text-fg-subtle">
              Busca buena luz y deja tu cara descubierta. Leasefy guarda la foto sólo como evidencia de esta firma.
            </p>
          </div>
        ) : enLaCamara ? (
          <div className="space-y-4">
            <h2 className="text-h3 text-fg">Pon tu cara en el óvalo</h2>
            <div className="relative mx-auto aspect-[3/4] w-full max-w-xs overflow-hidden rounded-md bg-surface-muted sm:mx-0">
              <video
                ref={conectar}
                muted
                playsInline
                autoPlay
                className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
                aria-label="Lo que ve la cámara"
              />
              <span
                aria-hidden="true"
                className={cn(
                  'pointer-events-none absolute left-1/2 top-[44%] h-[62%] w-[68%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 transition-colors duration-base',
                  encuadre === 'lista' ? 'border-success' : 'border-ink-fg/80',
                )}
              />
              <p
                role="status"
                aria-live="polite"
                className="absolute inset-x-3 bottom-3 rounded-full bg-ink/90 px-3 py-1.5 text-center text-caption text-ink-fg"
                data-testid="frase-de-la-camara"
              >
                {frase}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={() => void tomar()} disabled={fase !== 'en-vivo' || !puedeTomar} data-testid="tomar-la-foto">
                <Camera className="mr-1.5 h-4 w-4" aria-hidden="true" /> Tomar la foto
              </Button>
              <Button variant="ghost" onClick={cancelar}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : foto ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <h2 className="text-h3 text-fg">¿Se ve bien?</h2>
              <p className="text-body-sm text-fg-muted">Así va en la hoja de firmas. Si salió borrosa o cortada, tómate otra.</p>
            </div>
            <div className="mx-auto aspect-[3/4] w-full max-w-xs overflow-hidden rounded-md bg-surface-muted sm:mx-0">
              {/* eslint-disable-next-line @next/next/no-img-element -- la foto recién tomada, en memoria */}
              <img src={foto.dataUrl} alt="Tu foto" className="h-full w-full object-cover" />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={() => void usar()} isLoading={enviando} data-testid="usar-la-foto">
                Usar esta foto
              </Button>
              <Button variant="ghost" onClick={() => void abrir()} disabled={enviando}>
                Tomar otra
              </Button>
            </div>
          </div>
        ) : null}
      </CrossFade>
    </CajaDelPaso>
  );
}
