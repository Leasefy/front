'use client';

/**
 * EL PASO DE LA FOTO antes de firmar (Nico, 28-10-2026): «la firma debe llevar la foto». Ese mismo día: «¿crees que sea
 * necesario Didit? porque solo necesitamos la foto y no prueba de vida» → «cámara propia + revisar la cara».
 *
 * Quien firma llega desde su enlace, lee el documento y, antes del código, se toma una foto:
 *   · `FOTO` (lo normal): nuestra cámara, con la cara revisada en el navegador (`CamaraDelFirmante`);
 *   · `DIDIT` (sólo si algún día se ponen sus llaves): «Tomarme la foto» lo lleva a la prueba de vida de Didit y Didit lo
 *     trae de vuelta a su enlace con `?vida=1`; aquí se pregunta el resultado unos segundos hasta que llega. Si no pasa,
 *     dice por qué y deja intentarlo otra vez (con cuántos intentos le quedan).
 * Lista la foto, la página muestra el código y la firma. El back es quien decide: aquí sólo se pinta lo que dice.
 */

import { useCallback, useEffect, useState } from 'react';
import { ArrowsClockwise, Camera, WarningCircle } from '@phosphor-icons/react';
import { Ilustracion } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { firmaPublicaApi, type PruebaDeVidaDelFirmante } from '@/lib/api/firmas.service';
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion';

import { CajaDelPaso } from './CajaDelPaso';
import { CamaraDelFirmante } from './CamaraDelFirmante';

/** Cada cuánto y cuántas veces se pregunta el resultado al volver de Didit (≈ 40 s). */
const CADA_MS = 2500;
const VECES = 16;

export interface PruebaDeVidaProps {
  token: string;
  prueba: PruebaDeVidaDelFirmante;
  quienEnvia: string;
  /** Volvió de Didit (`?vida=1`): se pregunta el resultado solo. */
  volvioDeDidit: boolean;
  onCambio: (prueba: PruebaDeVidaDelFirmante) => void;
}

export function PruebaDeVida({ token, prueba, quienEnvia, volvioDeDidit, onCambio }: PruebaDeVidaProps) {
  const [abriendo, setAbriendo] = useState(false);
  const [comprobando, setComprobando] = useState(false);
  const [esperoSola, setEsperoSola] = useState(
    volvioDeDidit && (prueba.estado === 'EN_CURSO' || prueba.estado === 'EN_REVISION'),
  );

  const abrirDidit = async () => {
    setAbriendo(true);
    try {
      const r = await firmaPublicaApi.iniciarPruebaDeVida(token);
      if (r.url) {
        window.location.assign(r.url);
        return;
      }
      onCambio(r.pruebaDeVida);
      setAbriendo(false);
    } catch (err) {
      setAbriendo(false);
      toast.error('No pudimos abrir la prueba de vida.', { description: mensajeDelFallo(err, 'Intenta de nuevo en un momento.') });
    }
  };

  const comprobar = useCallback(async () => {
    setComprobando(true);
    try {
      const r = await firmaPublicaApi.comprobarPruebaDeVida(token);
      onCambio(r);
      return r;
    } catch {
      return null;
    } finally {
      setComprobando(false);
    }
  }, [token, onCambio]);

  // Al volver de Didit, el resultado tarda unos segundos: se pregunta solo.
  useEffect(() => {
    if (!esperoSola) return;
    let vez = 0;
    let vivo = true;
    let espera: ReturnType<typeof setTimeout> | undefined;
    const siguiente = async () => {
      if (!vivo) return;
      vez += 1;
      const r = await firmaPublicaApi.comprobarPruebaDeVida(token).catch(() => null);
      if (!vivo) return;
      if (r) onCambio(r);
      const sigue = !r || r.estado === 'EN_CURSO' || r.estado === 'EN_REVISION';
      if (sigue && vez < VECES) espera = setTimeout(siguiente, CADA_MS);
      else setEsperoSola(false);
    };
    void siguiente();
    return () => {
      vivo = false;
      if (espera) clearTimeout(espera);
    };
  }, [esperoSola, token, onCambio]);

  if (prueba.modo === 'FOTO') {
    return <CamaraDelFirmante token={token} onCambio={onCambio} />;
  }

  const sinIntentos = prueba.intentosQuedan === 0;

  if (esperoSola) {
    return (
      <CajaDelPaso testId="prueba-de-vida-comprobando">
        <Ilustracion nombre="camara" tono="voltaje" tamano={72} className="shrink-0" />
        <div className="min-w-0 space-y-1.5">
          <h2 className="text-h3 text-fg">Estamos comprobando tu foto</h2>
          <p className="text-body-sm text-fg-muted" role="status" aria-live="polite">
            Tarda unos segundos. No cierres esta página.
          </p>
        </div>
      </CajaDelPaso>
    );
  }

  if (prueba.estado === 'EN_REVISION') {
    return (
      <CajaDelPaso testId="prueba-de-vida-en-revision">
        <Ilustracion nombre="camara" tono="grafito" tamano={72} className="shrink-0" />
        <div className="min-w-0 space-y-3">
          <div className="space-y-1.5">
            <h2 className="text-h3 text-fg">Tu foto está en revisión</h2>
            <p className="text-body-sm text-fg-muted">
              Una persona de Didit, nuestro aliado de verificación, la está mirando. Suele tardar unos minutos: vuelve a este
              enlace y sigues donde ibas.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void comprobar()} isLoading={comprobando}>
            <ArrowsClockwise className="mr-1.5 h-4 w-4" aria-hidden="true" /> Comprobar de nuevo
          </Button>
        </div>
      </CajaDelPaso>
    );
  }

  if (prueba.estado === 'RECHAZADA' || (sinIntentos && prueba.estado !== 'EN_CURSO')) {
    return (
      <CajaDelPaso testId="prueba-de-vida-rechazada">
        <WarningCircle className="mt-0.5 h-7 w-7 shrink-0 text-warning" aria-hidden="true" />
        <div className="min-w-0 space-y-3">
          <div className="space-y-1.5">
            <h2 className="text-h3 text-fg">{sinIntentos ? 'Ya no quedan intentos' : 'No pudimos confirmar que eras tú'}</h2>
            <p className="text-body-sm text-fg-muted">
              {sinIntentos
                ? `Usaste los intentos de la prueba de vida. Escríbele a ${quienEnvia} para seguir con la firma.`
                : prueba.motivo ?? 'Busca buena luz, quítate gafas oscuras o gorra y vuelve a intentarlo.'}
            </p>
          </div>
          {sinIntentos ? null : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button onClick={() => void abrirDidit()} isLoading={abriendo} className="w-full sm:w-auto" data-testid="prueba-de-vida-reintentar">
                <Camera className="mr-1.5 h-4 w-4" aria-hidden="true" /> Intentarlo de nuevo
              </Button>
              <p className="text-caption text-fg-subtle">
                {prueba.intentosQuedan === 1 ? 'Te queda 1 intento.' : `Te quedan ${prueba.intentosQuedan} intentos.`}
              </p>
            </div>
          )}
        </div>
      </CajaDelPaso>
    );
  }

  // PENDIENTE, o EN_CURSO: la empezó y no volvió (cerró la pestaña, o la hizo en el celular).
  const aMedias = prueba.estado === 'EN_CURSO';
  return (
    <CajaDelPaso testId="prueba-de-vida">
      <Ilustracion nombre="camara" tono="voltaje" tamano={72} className="shrink-0" />
      <div className="min-w-0 space-y-3">
        <div className="space-y-1.5">
          <h2 className="text-h3 text-fg">{aMedias ? 'Termina tu foto' : 'Confirma que eres tú'}</h2>
          <p className="text-body-sm text-fg-muted">
            {aMedias
              ? 'Empezaste la prueba de vida y no vimos el final. Si ya la terminaste en el celular, compruébala; si no, hazla de nuevo.'
              : 'Antes de firmar te tomas una selfie en vivo. Didit, nuestro aliado de verificación, confirma que eres tú y no una foto o un video, y la foto va en la hoja de firmas. Tarda menos de un minuto.'}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Button onClick={() => void abrirDidit()} isLoading={abriendo} className="w-full sm:w-auto" data-testid="prueba-de-vida-empezar">
            <Camera className="mr-1.5 h-4 w-4" aria-hidden="true" /> {aMedias ? 'Hacer la prueba de nuevo' : 'Tomarme la foto'}
          </Button>
          {aMedias ? (
            <Button variant="ghost" size="sm" onClick={() => void comprobar()} isLoading={comprobando}>
              Ya la terminé: comprobar
            </Button>
          ) : null}
        </div>
        <p className="text-caption text-fg-subtle">
          Necesitas la cámara del celular o del computador y buena luz. Leasefy guarda la foto sólo como evidencia de esta firma.
        </p>
      </div>
    </CajaDelPaso>
  );
}
