/**
 * El límite por IP de las rutas propias del front (auditoría 23-09). La IP se
 * lee con la misma regla que el back (`TRUST_PROXY_HOPS`): lo de la izquierda
 * de `X-Forwarded-For` lo escribe el cliente y no sirve para contar.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  _olvidarCuentas,
  ipDeLaPeticion,
  limitarLaRuta,
  saltosDeProxy,
} from './limite-de-la-ruta';

const POLITICA = { nombre: 'prueba', maximo: 3, ventanaSegundos: 60 };

function pedido(xff?: string) {
  return new Request('http://localhost/api/x', {
    headers: xff ? { 'x-forwarded-for': xff } : {},
  });
}

beforeEach(() => _olvidarCuentas());

describe('ipDeLaPeticion', () => {
  it('con 1 salto toma la entrada que agregó nuestro proxy (la de la derecha)', () => {
    expect(ipDeLaPeticion(pedido('1.2.3.4, 203.0.113.7'), 1)).toBe('203.0.113.7');
  });

  it('con 2 saltos (CDN + nginx), la segunda desde la derecha', () => {
    expect(ipDeLaPeticion(pedido('1.2.3.4, 198.51.100.2, 10.0.0.1'), 2)).toBe('198.51.100.2');
  });

  it('con 0 saltos no confía en el encabezado', () => {
    expect(ipDeLaPeticion(pedido('1.2.3.4'), 0)).toBe('desconocida');
  });

  it('saltos por defecto: 1 en producción, 0 fuera; TRUST_PROXY_HOPS manda', () => {
    expect(saltosDeProxy({ NODE_ENV: 'production' })).toBe(1);
    expect(saltosDeProxy({ NODE_ENV: 'development' })).toBe(0);
    expect(saltosDeProxy({ NODE_ENV: 'production', TRUST_PROXY_HOPS: '2' })).toBe(2);
  });
});

describe('limitarLaRuta', () => {
  it('deja pasar hasta el máximo y después responde 429 con Retry-After y el cuerpo del back', async () => {
    const t0 = 1_000_000;
    for (let i = 0; i < POLITICA.maximo; i++) {
      expect(limitarLaRuta(pedido(), POLITICA, t0)).toBeNull();
    }
    const res = limitarLaRuta(pedido(), POLITICA, t0 + 18_000);
    expect(res?.status).toBe(429);
    expect(res?.headers.get('Retry-After')).toBe('42');
    expect(await res?.json()).toMatchObject({
      code: 'DEMASIADAS_SOLICITUDES',
      reintentarEnSegundos: 42,
      message: 'Hiciste demasiadas solicitudes seguidas. Espera 42 segundos y vuelve a intentar.',
    });
  });

  it('al vencer la ventana vuelve a contar desde cero', () => {
    const t0 = 1_000_000;
    for (let i = 0; i <= POLITICA.maximo; i++) limitarLaRuta(pedido(), POLITICA, t0);
    expect(limitarLaRuta(pedido(), POLITICA, t0 + 60_001)).toBeNull();
  });
});
