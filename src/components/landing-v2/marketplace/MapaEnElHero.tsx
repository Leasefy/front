'use client';

import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import Map, { Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@/components/map/trabajador-de-maplibre';

import { tieneCoordenadas } from '@/components/map/coordenadas';
import { MAP_STYLES } from '@/lib/constants/map';
import { useEnlace, useIdioma, useTx } from '@/lib/idioma/use-idioma';
import { useCatalogo, useQuieto } from './catalogo';

/**
 * El mapa chico pegado al marco del hero (Nico, 16-10-2026, de la opción
 * «El mapa»: «agreguemos esto también a la 3131»). Se queda quieto sobre el
 * centro del valle y va encendiendo, de a uno, los precios que caben en él.
 * Mismo MapLibre y mismos tiles de OpenFreeMap (sin llave) que el marketplace.
 *
 * Sin catálogo (el back no contesta o nadie ha publicado cerca) el mapa se
 * queda con un solo pin, «Tu inmueble aquí», y lleva a publicar gratis: lo
 * que invita a publicar nunca se esconde por falta de datos (Nico, 16-10-2026:
 * «no veo el widget bonito de marketplace… al lado de la pantalla grande»).
 * Sin precios ni «En vivo» inventados.
 *
 * El crédito del mapa va en texto chico, en la esquina: el botón «i» de
 * MapLibre tapaba el precio que quedaba debajo.
 */

/** «$2,4 M» en el pin, como lo leería una persona; en pesos también en inglés. */
function precioCorto(n: number | null, en: boolean): string {
  if (!n) return '—';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toLocaleString(en ? 'en-US' : 'es-CO', { maximumFractionDigits: 1 })}${en ? 'M' : ' M'}`;
  return en ? `$${Math.round(n / 1000)}K` : `$${Math.round(n / 1000)} mil`;
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

export function MapaEnElHero({ hrefPublicar, alTocarPublicar }: { hrefPublicar: string; alTocarPublicar: (e: MouseEvent<HTMLAnchorElement>) => void }) {
  const { inmuebles, total, fallo, cargando } = useCatalogo();
  const tx = useTx();
  const en = useIdioma() === 'en';
  const enlace = useEnlace();
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
  const conPrecios = !fallo && ubicados.length >= 2;
  const [listo, setListo] = useState(false);
  const i = useEncendido(conPrecios ? ubicados.length : 0, 2000, listo);

  if (cargando) return null;

  const mapa = (
    <span className="mk-pip-mapa" aria-hidden="true">
      <Map
        initialViewState={{ ...CENTRO_DEL_MAPA, zoom: 11.25 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLES.light}
        interactive={false}
        attributionControl={false}
        onLoad={() => setListo(true)}
      >
        {conPrecios ? (
          ubicados.map((p, k) => (
            <Marker key={p.id} longitude={p.longitude as number} latitude={p.latitude as number} anchor="bottom">
              <span className="mk-pin mk-pin-sm" data-activo={k === i || undefined} style={{ animationDelay: `${0.4 + k * 0.06}s` }}>
                {precioCorto(p.monthlyRent, en)}
              </span>
            </Marker>
          ))
        ) : (
          <Marker longitude={CENTRO_DEL_MAPA.longitude} latitude={CENTRO_DEL_MAPA.latitude} anchor="bottom">
            <span className="mk-pin mk-pin-sm mk-pin-tuyo">{tx('Tu inmueble aquí', 'Your property here')}</span>
          </Marker>
        )}
      </Map>
      <small className="mk-pip-credito">© OpenMapTiles © OpenStreetMap</small>
    </span>
  );

  if (!conPrecios) {
    return (
      <a
        className="mk-pip"
        href={hrefPublicar}
        onClick={alTocarPublicar}
        aria-label={tx('Marketplace: publica tus inmuebles gratis', 'Marketplace: list your properties for free')}
      >
        <span className="mk-pip-cab">
          <i className="mk-cuadro" aria-hidden="true" />
          Marketplace
        </span>
        {mapa}
        <span className="mk-pip-pie">
          <b>{tx('Publicar es gratis', 'Listing is free')}</b>
          <span>{tx('Empezar →', 'Start →')}</span>
        </span>
      </a>
    );
  }

  const cuantos = total.toLocaleString(en ? 'en-US' : 'es-CO');
  return (
    <a className="mk-pip" href={enlace('/propiedades')} aria-label={tx(`Marketplace: ${cuantos} inmuebles en el mapa`, `Marketplace: ${cuantos} properties on the map`)}>
      <span className="mk-pip-cab">
        <i className="mk-cuadro" aria-hidden="true" />
        Marketplace
        <em>
          <i className="mk-vivo" aria-hidden="true" />
          {tx('En vivo', 'Live')}
        </em>
      </span>
      {mapa}
      <span className="mk-pip-pie">
        <b>{tx(`${cuantos} inmuebles`, `${cuantos} properties`)}</b>
        <span>{tx('Explorar →', 'Explore →')}</span>
      </span>
    </a>
  );
}
