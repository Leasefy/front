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
 *
 * Quitar con la «x» una foto que YA subió (tras un intento con una foto que
 * falló) y confirmar BORRA su archivo (Nico, 02-10-2026): antes del cierre,
 * con el mismo `DELETE :id/fotos`; si no, quedaba huérfana en Storage. Un
 * borrado que falla no frena el cierre y queda en el log. Si en vez de
 * confirmar se cancela, se borra igual (era de este intento).
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
import { MoneyInput } from '@/components/ui/money-input';
import { Textarea } from '@/components/ui';
import { formatCurrency } from '@/lib/format';

const ID_DE_LAS_FOTOS = 'mantenimiento-fotos-del-trabajo';
const ID_DEL_ERROR = `${ID_DE_LAS_FOTOS}-error`;

export interface CompletarSolicitudDialogProps {
  abierto: boolean;
  solicitudId: string;
  onCerrar: () => void;
  /** La solicitud ya quedó completada (con sus fotos). */
  onCompletada: (solicitud: SolicitudMantenimiento) => void | Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
  /**
   * 🔴 SO-14 (QA 04-10): lo aprobado. Con él, el cierre pide el COSTO FINAL
   * (prellenado con lo aprobado): si difiere, el back ajusta el descuento al
   * propietario (o el cargo al inquilino) y el motivo dice las dos cifras.
   */
  costoAprobado?: number | null;
}

export function CompletarSolicitudDialog({
  abierto,
  solicitudId,
  onCerrar,
  onCompletada,
  t,
  costoAprobado = null,
}: CompletarSolicitudDialogProps) {
  const [costo, setCosto] = useState<string>('');
  const [notas, setNotas] = useState('');
  const [errorDelCosto, setErrorDelCosto] = useState<string | null>(null);
  useEffect(() => {
    if (abierto) {
      setCosto(costoAprobado && costoAprobado > 0 ? String(costoAprobado) : '');
      setNotas('');
      setErrorDelCosto(null);
    }
  }, [abierto, costoAprobado]);
  const costoFinal = costo.trim() === '' ? null : Number(costo);
  const cambiaElCosto =
    costoAprobado !== null && costoFinal !== null && costoFinal > 0 && costoFinal !== costoAprobado;
  const [fotos, setFotos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // Las que ya subieron en un intento anterior: no se suben dos veces.
  const yaSubidas = useRef(new Map<File, string>());
  // Las que ya subieron y se quitaron con la «x»: se borran al confirmar.
  const quitadas = useRef(new Set<string>());

  // Cada vez que se abre, de cero: las fotos de otra solicitud no son de ésta.
  useEffect(() => {
    if (abierto) {
      setFotos([]);
      setError(null);
      yaSubidas.current = new Map();
      quitadas.current = new Set();
    }
  }, [abierto, solicitudId]);

  /** Quitar con la «x». Si ya había subido, su ruta queda para borrarla al confirmar. */
  const quitar = (index: number) => {
    const foto = fotos[index];
    const ruta = foto ? yaSubidas.current.get(foto) : undefined;
    if (foto && ruta) {
      yaSubidas.current.delete(foto);
      quitadas.current.add(ruta);
    }
    setFotos((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  };

  const agregar = (elegidas: File[]) => {
    const { entran, problemas } = fotosQueEntran(fotos.length, elegidas);
    if (entran.length > 0) setFotos((prev) => [...prev, ...entran]);
    setError(problemas.length > 0 ? problemas.join(' · ') : null);
  };

  const confirmar = async () => {
    if (costoAprobado !== null && !(costoFinal !== null && costoFinal > 0)) {
      setErrorDelCosto('Escribe cuánto costó el trabajo.');
      return;
    }
    setErrorDelCosto(null);
    setEnviando(true);
    setError(null);
    try {
      const r = await completarConFotos(
        solicitudId,
        fotos,
        yaSubidas.current,
        {
          subir: (id, foto, destino) => mantenimientoApi.subirFoto(id, foto, destino),
          completar: (id, cierre) =>
            mantenimientoApi.completar(id, {
              ...cierre,
              ...(notas.trim() ? { completionNotes: notas.trim() } : {}),
              ...(costoFinal !== null && costoFinal > 0 ? { costoFinalCop: costoFinal } : {}),
            }),
          borrar: (id, ruta, destino) => mantenimientoApi.borrarFoto(id, ruta, destino),
        },
        quitadas.current,
      );
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
    const lasQuitadas = quitadas.current;
    yaSubidas.current = new Map();
    quitadas.current = new Set();
    if (delIntento.size > 0 || lasQuitadas.size > 0) {
      void borrarLasDelIntento(
        solicitudId,
        delIntento,
        { borrar: (id, ruta, destino) => mantenimientoApi.borrarFoto(id, ruta, destino) },
        lasQuitadas,
      );
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

        {costoAprobado !== null && (
          <div className="space-y-1.5">
            <label htmlFor="cierre-costo-final" className="block text-sm font-medium text-fg">
              Costo final del trabajo <span className="text-danger">*</span>
            </label>
            <MoneyInput
              id="cierre-costo-final"
              data-testid="cierre-costo-final"
              value={costo}
              onChange={(crudo) => {
                setCosto(crudo);
                setErrorDelCosto(null);
              }}
              aria-invalid={errorDelCosto ? true : undefined}
              aria-describedby={errorDelCosto ? 'cierre-costo-final-error' : undefined}
            />
            <ErrorDelCampo id="cierre-costo-final-error" mensaje={errorDelCosto ?? undefined} />
            {cambiaElCosto ? (
              <p className="text-xs text-warning" data-testid="cierre-costo-cambia">
                Lo aprobado fue {formatCurrency(costoAprobado)}. Al confirmar, el descuento (o el cargo) se ajusta a{' '}
                {formatCurrency(costoFinal)} y quien lo paga lo verá en su estado de cuenta.
              </p>
            ) : (
              <p className="text-xs text-fg-muted">Lo aprobado: {formatCurrency(costoAprobado)}.</p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="cierre-notas" className="block text-sm font-medium text-fg">
            Notas del cierre <span className="text-fg-subtle font-normal">(opcional)</span>
          </label>
          <Textarea
            id="cierre-notas"
            value={notas}
            maxLength={2000}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Qué se hizo, qué se cambió"
            className="min-h-[72px] resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <SelectorDeFotosDelMantenimiento
            id={ID_DE_LAS_FOTOS}
            etiqueta="Subir fotos del trabajo"
            pista={`Opcional. Hasta ${MAX_FOTOS_DEL_MANTENIMIENTO} fotos JPG, PNG o WebP, de hasta 5 MB cada una.`}
            textoAgregar="Agregar foto"
            fotos={fotos}
            onAgregar={agregar}
            onQuitar={quitar}
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
