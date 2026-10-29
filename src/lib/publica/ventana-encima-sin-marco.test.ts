import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Window } from 'happy-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * «Publicar gratis» de la landing estática abre /publica/ventana encima, en un iframe (public/landing/js/conexion.js).
 * 28-10-2026, producción (Nico: «sigue sin funcionar… se queda cargando»): vercel.json mandaba `X-Frame-Options: DENY`,
 * el navegador no pintaba el marco y la salida de emergencia de conexion.js lanzaba un error al leer `href` de un marco
 * bloqueado: el velo giraba para siempre. En el 3001 no pasaba porque `next dev` no lee vercel.json.
 */

const RAIZ = process.cwd();
const CONEXION = readFileSync(join(RAIZ, 'public/landing/js/conexion.js'), 'utf8');
const ORIGEN = 'https://leasefy.co';

/** La `location` de un marco que el navegador no dejó pintar: tomarla se puede, leerla no. */
function ubicacionBloqueada() {
  const bloqueado = () => {
    throw new Error("Failed to read a named property 'href' from 'Location': Blocked a frame with origin \"https://leasefy.co\"");
  };
  return { get href() { return bloqueado(); }, get pathname() { return bloqueado(); } };
}

function abrirLaLanding() {
  const win = new Window({ url: `${ORIGEN}/es`, settings: { disableIframePageLoading: true } });
  const doc = win.document;
  doc.body.innerHTML = '<a id="publicar" href="/publica">Publicar gratis</a>';
  const ir = vi.fn();
  const ubicacion = { origin: ORIGEN, href: `${ORIGEN}/es`, assign: ir };
  // Con sus globales propios: cada prueba arranca con una página nueva (sin oyentes de la anterior).
  const correr = new Function('window', 'document', 'location', 'fetch', 'requestAnimationFrame', 'setTimeout', 'clearTimeout', 'URL', CONEXION);
  correr(win, doc, ubicacion, () => new Promise(() => {}), (fn: () => void) => fn(), setTimeout, clearTimeout, URL);

  const enlace = doc.getElementById('publicar')!;
  const marco = () => doc.querySelector('[data-ventana-para-publicar] iframe') as unknown as HTMLIFrameElement | null;
  const capa = () => doc.querySelector('[data-ventana-para-publicar]') as unknown as HTMLElement | null;
  /** Hace que el marco «cargue» con esta ventana adentro. */
  const cargarElMarco = (ventana: object) => {
    const m = marco()!;
    Object.defineProperty(m, 'contentWindow', { configurable: true, get: () => ventana });
    m.dispatchEvent(new win.Event('load') as unknown as Event);
  };
  const clic = () => {
    const evento = new win.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    enlace.dispatchEvent(evento);
    return evento;
  };
  const pasarElMouse = () => enlace.dispatchEvent(new win.Event('pointerover', { bubbles: true }));
  const avisar = (ventana: object, tipo: string) =>
    win.dispatchEvent(new win.MessageEvent('message', { data: { tipo }, origin: ORIGEN, source: ventana as never }));
  return { win, ir, marco, capa, cargarElMarco, clic, pasarElMouse, avisar };
}

describe('«Publicar gratis» nunca se queda girando (28-10-2026)', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('con el marco bloqueado después del clic, va a /publica (antes el error dejaba el velo girando)', () => {
    const landing = abrirLaLanding();
    expect(landing.clic().defaultPrevented).toBe(true);
    expect(landing.capa()!.style.visibility).toBe('visible');
    expect(() => landing.cargarElMarco({ location: ubicacionBloqueada(), postMessage() {} })).not.toThrow();
    expect(landing.ir).toHaveBeenCalledWith('/publica');
  });

  it('con el marco bloqueado al precargar, lo descarta y el clic es un enlace normal a /publica', () => {
    const landing = abrirLaLanding();
    landing.pasarElMouse();
    expect(landing.marco()).not.toBeNull();
    landing.cargarElMarco({ location: ubicacionBloqueada(), postMessage() {} });
    expect(landing.capa()).toBeNull();
    expect(landing.ir).not.toHaveBeenCalled();
    // No se vuelve a armar el marco ni se intercepta el clic: el navegador sigue el href="/publica".
    landing.pasarElMouse();
    expect(landing.marco()).toBeNull();
    expect(landing.clic().defaultPrevented).toBe(false);
  });

  it('si la ventana no aparece en 8 s después del clic, va a /publica; antes de eso, espera', () => {
    const landing = abrirLaLanding();
    landing.clic();
    vi.advanceTimersByTime(7900);
    expect(landing.ir).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(landing.ir).toHaveBeenCalledWith('/publica');
  });

  it('la ventana que carga y avisa que está lista se queda encima (sin irse a /publica)', () => {
    const landing = abrirLaLanding();
    const ventana = { location: { href: `${ORIGEN}/publica/ventana?encima=1`, pathname: '/publica/ventana' }, postMessage: vi.fn() };
    landing.clic();
    landing.cargarElMarco(ventana);
    landing.avisar(ventana, 'leasefy:ventana-cargada');
    expect(ventana.postMessage).toHaveBeenCalledWith({ tipo: 'leasefy:abrir-ventana' }, ORIGEN);
    landing.avisar(ventana, 'leasefy:ventana-lista');
    expect(landing.marco()!.style.opacity).toBe('1');
    vi.advanceTimersByTime(30_000);
    expect(landing.ir).not.toHaveBeenCalled();
  });

  it('cerrar la ventana antes del plazo no manda a /publica', () => {
    const landing = abrirLaLanding();
    const ventana = { location: { href: `${ORIGEN}/publica/ventana?encima=1`, pathname: '/publica/ventana' }, postMessage() {} };
    landing.clic();
    landing.cargarElMarco(ventana);
    landing.avisar(ventana, 'leasefy:ventana-cerrada');
    vi.advanceTimersByTime(30_000);
    expect(landing.ir).not.toHaveBeenCalled();
  });
});

describe('Las cabeceras dejan que Leasefy se enmarque a sí mismo (y nadie de afuera)', () => {
  it('vercel.json no manda X-Frame-Options: DENY (en Vercel pisa a next.config.mjs y bloquea /publica/ventana)', () => {
    const vercel = JSON.parse(readFileSync(join(RAIZ, 'vercel.json'), 'utf8')) as {
      headers?: { source: string; headers: { key: string; value: string }[] }[];
    };
    const valores = (vercel.headers ?? []).flatMap((regla) =>
      regla.headers.filter((h) => h.key.toLowerCase() === 'x-frame-options').map((h) => h.value.toUpperCase()),
    );
    expect(valores.length).toBeGreaterThan(0);
    for (const valor of valores) expect(valor).toBe('SAMEORIGIN');
  });

  it('next.config.mjs dice lo mismo', () => {
    const config = readFileSync(join(RAIZ, 'next.config.mjs'), 'utf8');
    expect(config).toMatch(/key:\s*"X-Frame-Options",\s*value:\s*"SAMEORIGIN"/);
    expect(config).not.toMatch(/"X-Frame-Options",\s*value:\s*"DENY"/);
  });
});
