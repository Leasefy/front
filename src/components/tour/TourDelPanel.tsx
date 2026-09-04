'use client';

/**
 * TourDelPanel — el recorrido guiado de 3 pasos que la pantalla de
 * Preferencias venía prometiendo y que no existía.
 *
 * «Iniciar tour ahora» sólo bajaba una bandera en memoria y sacaba un toast
 * («Tour iniciado — sigue las pistas en pantalla»); no había ninguna pista, ni
 * nada que la leyera. Esto es lo que faltaba.
 *
 * Cómo funciona: cada paso apunta a un elemento REAL del panel por selector
 * (`pasos-del-tour.ts`). Se recorta un hueco sobre él —un recuadro que sigue su
 * posición— y se pone una tarjeta al lado. Los pasos cuyo elemento no está en
 * la página se saltan, así que a quien no ve un módulo no se le señala un
 * hueco. Si no queda ningún paso, esto no se monta y no pasa nada.
 *
 * Terminar o saltar apaga la preferencia (`setTourDismissed(true)`), que es lo
 * mismo que hace el interruptor de Preferencias: verlo una vez cuenta como
 * verlo.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { usePanelPrefs } from '@/lib/context/PanelPrefsContext';
import {
  PASOS_DEL_TOUR,
  elPanelEstaBloqueado,
  pasosVisibles,
  type PasoDelTour,
} from './pasos-del-tour';

/** Aire alrededor del elemento resaltado. */
const MARGEN = 8;
/** Ancho de la tarjeta; también su tope en pantallas chicas. */
const ANCHO = 340;

interface Recuadro {
  top: number;
  left: number;
  width: number;
  height: number;
}

function medir(selector: string): Recuadro | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/**
 * Dónde poner la tarjeta: debajo del elemento si cabe, si no encima, y
 * siempre dentro de la ventana. Se calcula acá, aparte del componente, para
 * poder probar el caso que se rompe solo — un elemento pegado al borde.
 */
export function ubicarTarjeta(
  recuadro: Recuadro,
  ventana: { width: number; height: number },
  alto = 200,
): { top: number; left: number } {
  const debajo = recuadro.top + recuadro.height + MARGEN * 2;
  const cabeDebajo = debajo + alto < ventana.height;
  const top = cabeDebajo
    ? debajo
    : Math.max(MARGEN, recuadro.top - alto - MARGEN * 2);

  const centrado = recuadro.left + recuadro.width / 2 - ANCHO / 2;
  const left = Math.min(
    Math.max(MARGEN, centrado),
    Math.max(MARGEN, ventana.width - ANCHO - MARGEN),
  );

  return { top, left };
}

export function TourDelPanel() {
  const { t } = useI18n();
  const { tourDismissed, setTourDismissed } = usePanelPrefs();

  const [pasos, setPasos] = useState<PasoDelTour[] | null>(null);
  const [indice, setIndice] = useState(0);
  const [recuadro, setRecuadro] = useState<Recuadro | null>(null);
  const tarjetaRef = useRef<HTMLDivElement | null>(null);

  const activo = tourDismissed === false;

  // Los pasos se resuelven al arrancar el recorrido, no al montar: el panel
  // tarda en pintar el sidebar y la píldora, y medir antes daría cero pasos.
  useEffect(() => {
    if (!activo) {
      setPasos(null);
      setIndice(0);
      return;
    }
    let cancelado = false;
    const id = setTimeout(() => {
      if (cancelado) return;
      const hay = (sel: string) => document.querySelector(sel) != null;

      // Con el muro de la puesta en marcha arriba no se arranca — y la
      // preferencia se deja COMO ESTÁ, para que el recorrido salga solo
      // cuando el muro caiga, en vez de perderse.
      if (elPanelEstaBloqueado(hay)) {
        setPasos(null);
        return;
      }

      const visibles = pasosVisibles(hay);
      setPasos(visibles);
      setIndice(0);
      // Nadie a quien señalar ⇒ el recorrido no arranca y la preferencia se
      // apaga igual, para no reintentarlo en cada navegación.
      if (visibles.length === 0) setTourDismissed(true);
    }, 400);
    return () => {
      cancelado = true;
      clearTimeout(id);
    };
  }, [activo, setTourDismissed]);

  const paso = pasos && pasos.length > 0 ? pasos[Math.min(indice, pasos.length - 1)] : null;

  // El recuadro se remide en scroll y resize: el elemento se mueve y el hueco
  // tiene que seguirlo, si no el recorrido señala aire.
  useLayoutEffect(() => {
    if (!paso) return;
    const remedir = () => setRecuadro(medir(paso.selector));
    remedir();
    window.addEventListener('scroll', remedir, true);
    window.addEventListener('resize', remedir);
    return () => {
      window.removeEventListener('scroll', remedir, true);
      window.removeEventListener('resize', remedir);
    };
  }, [paso]);

  const terminar = useCallback(() => {
    setTourDismissed(true);
    setPasos(null);
    setIndice(0);
  }, [setTourDismissed]);

  // Escape sale, como cualquier capa que tapa la pantalla.
  useEffect(() => {
    if (!paso) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') terminar();
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [paso, terminar]);

  if (!activo || !paso || !pasos || !recuadro) return null;
  if (typeof document === 'undefined') return null;

  const total = pasos.length;
  const esUltimo = indice >= total - 1;
  const alto = tarjetaRef.current?.offsetHeight ?? 200;
  const { top, left } = ubicarTarjeta(recuadro, {
    width: window.innerWidth,
    height: window.innerHeight,
  }, alto);

  return createPortal(
    <div
      className="fixed inset-0 z-[400]"
      role="dialog"
      aria-modal="true"
      aria-label={t(`${paso.tituloKey}`)}
      data-testid="tour-del-panel"
    >
      {/* El velo y el hueco son la MISMA caja: el `box-shadow` gigante pinta
          todo lo de afuera y deja el elemento a la vista, sin recortes ni
          cuatro divs alrededor. */}
      <div
        className="pointer-events-none absolute rounded-md ring-2 ring-primary transition-all duration-200"
        style={{
          top: recuadro.top - MARGEN,
          left: recuadro.left - MARGEN,
          width: recuadro.width + MARGEN * 2,
          height: recuadro.height + MARGEN * 2,
          boxShadow: '0 0 0 9999px rgba(20, 19, 15, 0.55)',
        }}
      />

      {/* Clic fuera = salir, como cualquier capa modal. Va debajo de la
          tarjeta en el orden de pintado para no comerse sus botones. */}
      <button
        type="button"
        aria-label={t('inmobiliaria.tour.saltar')}
        onClick={terminar}
        className="absolute inset-0 cursor-default"
      />

      <div
        ref={tarjetaRef}
        style={{ top, left, width: ANCHO, maxWidth: 'calc(100vw - 16px)' }}
        className="absolute rounded-lg border border-border bg-surface p-5 shadow-lg"
        data-testid="tour-tarjeta"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-caption uppercase tracking-wide text-fg-subtle">
            {t('inmobiliaria.tour.paso', { n: indice + 1, total })}
          </p>
          <button
            type="button"
            onClick={terminar}
            aria-label={t('inmobiliaria.tour.saltar')}
            className="-mr-1 -mt-1 rounded-full p-1 text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <h2 className="mt-2 text-base font-semibold text-fg">{t(paso.tituloKey)}</h2>
        <p className="mt-1.5 text-body-sm text-fg-muted">{t(paso.cuerpoKey)}</p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={terminar}
            className="text-body-sm text-fg-muted underline-offset-2 hover:text-fg hover:underline"
            data-testid="tour-saltar"
          >
            {t('inmobiliaria.tour.saltar')}
          </button>

          <div className="flex items-center gap-2">
            {indice > 0 && (
              <Button
                variant="outline"
                size="sm"
                hideArrow
                onClick={() => setIndice((i) => i - 1)}
                data-testid="tour-atras"
              >
                {t('inmobiliaria.tour.atras')}
              </Button>
            )}
            <Button
              size="sm"
              hideArrow
              onClick={() => (esUltimo ? terminar() : setIndice((i) => i + 1))}
              data-testid="tour-siguiente"
            >
              {esUltimo ? t('inmobiliaria.tour.terminar') : t('inmobiliaria.tour.siguiente')}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export { PASOS_DEL_TOUR };
