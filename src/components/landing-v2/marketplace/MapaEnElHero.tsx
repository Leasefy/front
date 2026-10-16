'use client';

import { useEffect, useMemo, useState } from 'react';
import Map, { Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@/components/map/trabajador-de-maplibre';

import { tieneCoordenadas } from '@/components/map/coordenadas';
import { MAP_STYLES } from '@/lib/constants/map';
import { useCatalogo, useQuieto } from './catalogo';

/**
 * El mapa chico pegado al marco del hero (Nico, 16-10-2026, de la opción
 * «El mapa»: «agreguemos esto también a la 3131»). Se queda quieto sobre el
 * centro del valle y va encendiendo, de a uno, los precios que caben en él.
 * Mismo MapLibre y mismos tiles de OpenFreeMap (sin llave) que el marketplace.
 *
 * El crédito del mapa va en texto chico, en la esquina: el botón «i» de
 * MapLibre tapaba el precio que quedaba debajo.
 */

/** «$2,4 M» en el pin, como lo leería una persona. */
function precioCorto(n: number | null): string {
  if (!n) return '—';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`;
  return `$${Math.round(n / 1000)} mil`;
}

/** Va de un precio al siguiente cada `ms`; con «reducir movimiento», quieto. */
function useEncendido(largo: number, ms: number, activo: boolean): number {
  const quieto = useQuieto();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (quieto || !activo || largo < 2) return;
    const t = window.setInterval(() => setI((x) => (x + 1) % largo), ms);
    return () => window.clearInterval(t);
  }, [quieto, activo, largo, ms]);
  return largo ? i % largo : 0;
}

const CENTRO_DEL_MAPA = { latitude: 6.229, longitude: -75.588 };

export function MapaEnElHero() {
  const { inmuebles, total, fallo, cargando } = useCatalogo();
  const ubicados = useMemo(
    () =>
      inmuebles.filter(
        (p) =>
          tieneCoordenadas(p.latitude, p.longitude) &&
          Math.abs((p.latitude as number) - CENTRO_DEL_MAPA.latitude) < 0.045 &&
          Math.abs((p.longitude as number) - CENTRO_DEL_MAPA.longitude) < 0.07,
      ),
    [inmuebles],
  );
  const [listo, setListo] = useState(false);
  const i = useEncendido(ubicados.length, 2000, listo);

  if (fallo || cargando || ubicados.length < 2) return null;

  return (
    <a className="mk-pip" href="/propiedades" aria-label={`Marketplace: ${total} inmuebles en el mapa`}>
      <span className="mk-pip-cab">
        <i className="mk-cuadro" aria-hidden="true" />
        Marketplace
        <em>
          <i className="mk-vivo" aria-hidden="true" />
          En vivo
        </em>
      </span>
      <span className="mk-pip-mapa" aria-hidden="true">
        <Map
          initialViewState={{ ...CENTRO_DEL_MAPA, zoom: 11.25 }}
          style={{ width: '100%', height: '100%' }}
          mapStyle={MAP_STYLES.light}
          interactive={false}
          attributionControl={false}
          onLoad={() => setListo(true)}
        >
          {ubicados.map((p, k) => (
            <Marker key={p.id} longitude={p.longitude as number} latitude={p.latitude as number} anchor="bottom">
              <span className="mk-pin mk-pin-sm" data-activo={k === i || undefined} style={{ animationDelay: `${0.4 + k * 0.06}s` }}>
                {precioCorto(p.monthlyRent)}
              </span>
            </Marker>
          ))}
        </Map>
        <small className="mk-pip-credito">© OpenMapTiles © OpenStreetMap</small>
      </span>
      <span className="mk-pip-pie">
        <b>{total.toLocaleString('es-CO')} inmuebles</b>
        <span>Explorar →</span>
      </span>
    </a>
  );
}
