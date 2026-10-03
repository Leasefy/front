'use client';

/**
 * Marcar una solicitud como completada, con las fotos del trabajo (02-10-2026).
 *
 * Nico: «Subir fotos del trabajo» al cerrar una solicitud. Se eligen acá (el
 * mismo selector y las mismas reglas que las fotos del reporte: JPG, PNG o
 * WebP, hasta 5 MB, hasta 30 — el tope del back) y se suben de verdad al
 * confirmar (`completarConFotos`: la subida real de siempre con
 * `destino: 'trabajo'` —directo a `completionPhotoUrls`, con su propio tope de
 * 30, sin tocar las fotos del reporte— y después `PUT :id/complete` con sus
 * rutas en `completionPhotoUrls`).
 *
 * Errores con el sistema de siempre, bajo las fotos (`<ErrorDelCampo>`):
 *  · una foto que no sirve, al elegirla, con la frase del back;
 *  · una foto que no subió: la solicitud NO se cierra, se dice cuál y por qué
 *    (`mensajeParaLaPersona`), y se puede reintentar (sólo las que faltan) o
 *    quitarla. El 400 del tope del trabajo (`campos` en
 *    `completionPhotoUrls`) dice SU frase;
 *  · el cierre rechazado: si el back trae `campos` de las fotos van bajo las
 *    fotos (`repartirErroresDelServidor`); lo demás, por el traductor (un 5xx
 *    dice que fue nuestro, con la referencia; «conexión» sólo sin respuesta).
 * El diálogo queda abierto con lo elegido mientras haya algo que decir.
 *
 * Cancelar (el botón, Escape o fuera del diálogo) borra las fotos del trabajo
 * que subió ESTE intento (Nico, 02-10-2026: `borrarLasDelIntento`, con
 * `DELETE :id/fotos`), para que no queden en «Fotos de después» ni ocupen
 * cupo. Las que la solicitud ya tenía no se tocan. El diálogo se cierra de una:
 * un borrado que falla no lo frena y queda escrito en el log.
 */

import { useEffect, useRef, useState } from 'react';
import { CheckCircle } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { mantenimientoApi } from '@/lib/api/inmobiliaria.service';
import { borrarLasDelIntento, completarConFotos } from '@/lib/mantenimiento/completar-con-fotos';
import { lasQueNoSubieron } from '@/lib/mantenimiento/subir-fotos-del-mantenimiento';
import { fotosQueEntran, MAX_FOTOS_DEL_MANTENIMIENTO } from '@/lib/mantenimiento/limites-del-mantenimiento';
import type { SolicitudMantenimiento } from '@/lib/types/inmobiliaria';
import { SelectorDeFotosDelMantenimiento } from './SelectorDeFotosDelMantenimiento';

const ID_DE_LAS_FOTOS = 'mantenimiento-fotos-del-trabajo';
const ID_DEL_ERROR = `${ID_DE_LAS_FOTOS}-error`;

export interface CompletarSolicitudDialogProps {
  abierto: boolean;
  solicitudId: string;
  onCerrar: () => void;
  /** La solicitud ya quedó completada (con sus fotos). */
  onCompletada: (solicitud: SolicitudMantenimiento) => void | Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function CompletarSolicitudDialog({
  abierto,
  solicitudId,
  onCerrar,
  onCompletada,
  t,
}: CompletarSolicitudDialogProps) {
  const [fotos, setFotos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // Las que ya subieron en un intento anterior: no se suben dos veces.
  const yaSubidas = useRef(new Map<File, string>());

  // Cada vez que se abre, de cero: las fotos de otra solicitud no son de ésta.
  useEffect(() => {
    if (abierto) {
      setFotos([]);
      setError(null);
      yaSubidas.current = new Map();
    }
  }, [abierto, solicitudId]);

  const agregar = (elegidas: File[]) => {
    const { entran, problemas } = fotosQueEntran(fotos.length, elegidas);
    if (entran.length > 0) setFotos((prev) => [...prev, ...entran]);
    setError(problemas.length > 0 ? problemas.join(' · ') : null);
  };

  const confirmar = async () => {
    setEnviando(true);
    setError(null);
    try {
      const r = await completarConFotos(solicitudId, fotos, yaSubidas.current, {
        subir: (id, foto, destino) => mantenimientoApi.subirFoto(id, foto, destino),
        completar: (id, cierre) => mantenimientoApi.completar(id, cierre),
      });
      if (!r.completada && r.fraseDelTope) {
        // El tope de las fotos del trabajo es del campo, no de una foto.
        setError(`${r.fraseDelTope} La solicitud sigue abierta: quita las que sobran y vuelve a confirmar.`);
        return;
      }
      if (!r.completada) {
        const n = r.fallidas.length;
        setError(
          `${n === 1 ? 'Una foto no se subió' : `${n} fotos no se subieron`} y la solicitud sigue abierta. ` +
            `Vuelve a intentarlo o quítala${n === 1 ? '' : 's'} para completar sin ella${n === 1 ? '' : 's'}. ` +
            lasQueNoSubieron(r.fallidas),
        );
        return;
      }
      // Ya son las fotos de un cierre hecho: ningún «Cancelar» las borra.
      yaSubidas.current = new Map();
      await onCompletada(r.solicitud);
    } catch (e) {
      const { porCampo, sueltos } = repartirErroresDelServidor<'completionPhotoUrls'>(e, {
        campos: ['completionPhotoUrls'],
        porDefecto: 'Prueba de nuevo en un momento.',
        accion: 'completar la solicitud',
      });
      setError([porCampo.completionPhotoUrls, ...sueltos].filter(Boolean).join(' · ') || null);
    } finally {
      setEnviando(false);
    }
  };

  /**
   * Cancelar el intento: se cierra YA y, por detrás, se borran las fotos del
   * trabajo que este intento alcanzó a subir. Nunca espera ni falla por ellas.
   */
  const cancelar = () => {
    const delIntento = yaSubidas.current;
    yaSubidas.current = new Map();
    if (delIntento.size > 0) {
      void borrarLasDelIntento(solicitudId, delIntento, {
        borrar: (id, ruta, destino) => mantenimientoApi.borrarFoto(id, ruta, destino),
      });
    }
    onCerrar();
  };

  return (
    <Dialog open={abierto} onOpenChange={(a) => !a && !enviando && cancelar()}>
      <DialogContent variant="confirm" icon={<CheckCircle weight="bold" />} data-testid="completar-solicitud">
        <DialogHeader>
          <DialogTitle>{t('inmobiliaria.mantenimiento.markAsCompleted')}</DialogTitle>
          <DialogDescription>{t('inmobiliaria.mantenimiento.completeConfirm')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <SelectorDeFotosDelMantenimiento
            id={ID_DE_LAS_FOTOS}
            etiqueta="Subir fotos del trabajo"
            pista={`Opcional. Hasta ${MAX_FOTOS_DEL_MANTENIMIENTO} fotos JPG, PNG o WebP, de hasta 5 MB cada una.`}
            textoAgregar="Agregar foto"
            fotos={fotos}
            onAgregar={agregar}
            onQuitar={(index) => {
              setFotos((prev) => prev.filter((_, i) => i !== index));
              setError(null);
            }}
            conError={Boolean(error)}
            idDelError={ID_DEL_ERROR}
            deshabilitado={enviando}
            testIdFoto="foto-del-trabajo"
            testIdInput="fotos-del-trabajo-input"
          />
          <ErrorDelCampo id={ID_DEL_ERROR} mensaje={error} />
        </div>

        <DialogFooter>
          <Button variant="outline" hideArrow disabled={enviando} onClick={cancelar} data-testid="completar-cancelar">
            {t('inmobiliaria.mantenimiento.cancel')}
          </Button>
          <Button hideArrow isLoading={enviando} disabled={enviando} onClick={() => void confirmar()} data-testid="completar-confirmar">
            {enviando && fotos.length > 0 ? 'Subiendo las fotos…' : t('inmobiliaria.mantenimiento.confirmCompleted')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
