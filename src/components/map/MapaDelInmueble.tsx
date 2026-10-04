'use client';

/**
 * MapaDelInmueble — el mapa de UN inmueble, sólo lectura.
 *
 * Mismo MapLibre y mismos tiles de OpenFreeMap (sin API key) que
 * `LocationPicker`, pero sin arrastre: acá el pin ya está puesto y lo único
 * que se hace es mirarlo, abrirlo en Google Maps o pedir cómo llegar.
 *
 * Decisiones de interacción:
 * - `scrollZoom` apagado: la ficha scrollea con Lenis y un mapa que se come
 *   la rueda deja al usuario atascado. El zoom va por los botones (+/−).
 * - `cooperativeGestures`: en el celular un dedo sigue scrolleando la página
 *   y el mapa pide dos; en escritorio el arrastre con el mouse funciona.
 * - Estilo según el tema (`next-themes`): positron en claro, liberty en oscuro.
 *   Fuera de un ThemeProvider (detalle público) cae al claro.
 * - Atribución compacta pero presente: OpenFreeMap/OSM la exigen.
 * - 🔴 Si el mapa no carga (sin su worker —«Worker failed to load», el mapa
 *   gris que vio Nico el 03-10— o sin estilo a los `ESPERA_DEL_MAPA_MS`), la
 *   tarjeta NO queda gris muda: dice que el mapa no cargó y deja «Abrir en
 *   Google Maps» a la mano (`AvisoDelMapaQueNoCargo`). El mapa sigue montado
 *   debajo: si termina de cargar tarde, el aviso se va solo.
 *
 * Toca `window`, así que se monta con `dynamic(..., { ssr: false })`.
 */

import { useEffect, useMemo, useState } from 'react';
import Map, { AttributionControl, Marker, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import './trabajador-de-maplibre';
import { useTheme } from 'next-themes';
import { ArrowSquareOut, MapPin, MapTrifold, NavigationArrow } from '@phosphor-icons/react';
import { Presence } from '@leasefy/cadence';
import { Button } from '@/components/ui/button';
import { MAP_STYLES, ZOOM_LEVELS } from '@/lib/constants/map';
import { useOptionalI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export interface MapaDelInmuebleProps {
  latitude: number;
  longitude: number;
  /** Nombre del inmueble: va al `aria-label` del mapa y al `title` del pin. */
  titulo: string;
  /** Dirección legible que se muestra debajo del mapa. */
  direccion?: string;
  className?: string;
}

export function urlDeGoogleMaps(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function urlDeComoLlegar(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/**
 * Cuánto se espera a que el mapa pinte su estilo antes de decir que no cargó.
 * Holgado a propósito: con una red lenta el estilo de OpenFreeMap tarda, y un
 * aviso que aparece y se va sería peor que esperar.
 */
export const ESPERA_DEL_MAPA_MS = 15_000;

/**
 * ¿Este error de MapLibre deja el mapa sin pintar para siempre? Sólo el del
 * worker («Worker failed to load. Check that the worker URL is correct.»):
 * sin worker no se procesa ni una tesela. Una tesela que falla, en cambio, es
 * ruido normal de la red y el mapa sigue.
 */
export function esFalloDelTrabajador(error: unknown): boolean {
  const mensaje = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return /worker failed to load/i.test(mensaje);
}

// Textos de los gestos cooperativos de MapLibre, en español.
const LOCALE_MAPA = {
  'CooperativeGesturesHandler.WindowsHelpText': 'Usa Ctrl + rueda para hacer zoom en el mapa',
  'CooperativeGesturesHandler.MacHelpText': 'Usa ⌘ + rueda para hacer zoom en el mapa',
  'CooperativeGesturesHandler.MobileHelpText': 'Usa dos dedos para mover el mapa',
};

export function MapaDelInmueble({ latitude, longitude, titulo, direccion, className }: MapaDelInmuebleProps) {
  const { resolvedTheme } = useTheme();
  const i18n = useOptionalI18n();
  const etiquetas = useMemo(
    () => ({
      abrir: i18n?.t('inmobiliaria.inmuebles.ubicacion.abrirEnGoogleMaps') ?? 'Abrir en Google Maps',
      comoLlegar: i18n?.t('inmobiliaria.inmuebles.ubicacion.comoLlegar') ?? 'Cómo llegar',
      noCargo: i18n?.t('inmobiliaria.inmuebles.ubicacion.mapaNoCargo') ?? 'El mapa no cargó',
      noCargoDesc:
        i18n?.t('inmobiliaria.inmuebles.ubicacion.mapaNoCargoDesc') ??
        'La ubicación sí está guardada: puedes verla en Google Maps.',
    }),
    [i18n],
  );
  const mapStyle = resolvedTheme === 'dark' ? MAP_STYLES.dark : MAP_STYLES.light;

  // 'cargando' → 'listo' con el `load` del mapa; → 'fallo' con el error del
  // worker o si pasa `ESPERA_DEL_MAPA_MS` sin `load`. Un `load` tardío gana.
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'fallo'>('cargando');
  useEffect(() => {
    if (estado !== 'cargando') return;
    const reloj = window.setTimeout(() => {
      setEstado((actual) => (actual === 'cargando' ? 'fallo' : actual));
    }, ESPERA_DEL_MAPA_MS);
    return () => window.clearTimeout(reloj);
  }, [estado]);
  const noCargo = estado === 'fallo';

  return (
    <div className={cn('space-y-3', className)}>
      <div
        className="relative w-full h-56 sm:h-64 rounded-lg border border-border overflow-hidden"
        data-testid="mapa-del-inmueble"
        data-estado={estado}
      >
        <Map
          initialViewState={{ latitude, longitude, zoom: ZOOM_LEVELS.property }}
          style={{ width: '100%', height: '100%' }}
          mapStyle={mapStyle}
          scrollZoom={false}
          dragRotate={false}
          cooperativeGestures
          locale={LOCALE_MAPA}
          attributionControl={false}
          onLoad={() => setEstado('listo')}
          onError={(e) => {
            if (esFalloDelTrabajador(e.error)) setEstado('fallo');
          }}
        >
          <NavigationControl position="top-right" showCompass={false} />
          <AttributionControl compact position="bottom-right" />
          <Marker longitude={longitude} latitude={latitude} anchor="bottom">
            <MapPin className="w-8 h-8 text-primary drop-shadow-sm" weight="fill" aria-hidden="true" />
            <span className="sr-only">{titulo}</span>
          </Marker>
        </Map>

        {/* El mapa que no cargó: tapa el gris con lo que pasó y la salida. */}
        <Presence show={noCargo} className="absolute inset-0 z-10">
          <AvisoDelMapaQueNoCargo
            titulo={etiquetas.noCargo}
            detalle={etiquetas.noCargoDesc}
            abrir={etiquetas.abrir}
            href={urlDeGoogleMaps(latitude, longitude)}
          />
        </Presence>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {direccion && (
          <p className="flex items-start gap-1.5 text-sm text-fg min-w-0">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-fg-subtle" aria-hidden="true" />
            <span className="truncate">{direccion}</span>
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 shrink-0">
          {/* Con el aviso en pantalla, «Abrir en Google Maps» ya está en él. */}
          {!noCargo && (
            <a
              href={urlDeGoogleMaps(latitude, longitude)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <ArrowSquareOut className="w-4 h-4" aria-hidden="true" />
              {etiquetas.abrir}
            </a>
          )}
          <a
            href={urlDeComoLlegar(latitude, longitude)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <NavigationArrow className="w-4 h-4" aria-hidden="true" />
            {etiquetas.comoLlegar}
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Lo que se ve en lugar del mapa gris cuando no cargó: qué pasó, que la
 * ubicación sí está, y la salida a Google Maps. Tapa todo el recuadro (los
 * controles y la atribución del mapa que no pintó no sirven de nada) y entra
 * con `Presence` (fundido + 8 px, tokens de Cadence; con movimiento reducido,
 * sólo el fundido). `role="status"`: el lector de pantalla lo anuncia.
 */
function AvisoDelMapaQueNoCargo({
  titulo,
  detalle,
  abrir,
  href,
}: {
  titulo: string;
  detalle: string;
  abrir: string;
  href: string;
}) {
  return (
    <div
      role="status"
      data-testid="mapa-no-cargo"
      className="flex h-full w-full flex-col items-center justify-center gap-3 bg-surface-muted px-6 text-center"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-border bg-surface text-fg-muted">
        <MapTrifold className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-fg">{titulo}</p>
        <p className="mx-auto max-w-[34ch] text-caption text-fg-muted">{detalle}</p>
      </div>
      <Button asChild variant="outline" size="sm">
        <a href={href} target="_blank" rel="noopener noreferrer">
          <ArrowSquareOut className="h-4 w-4" aria-hidden="true" />
          {abrir}
        </a>
      </Button>
    </div>
  );
}
