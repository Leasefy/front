/**
 * /mandato/firma/[token] — la página pública donde el PROPIETARIO firma el
 * mandato (auditoría de lógica, 23-09-2026). Antes no existía: el enlace daba
 * 404 y el token lo tenía la inmobiliaria.
 *
 * Fija: sin sesión (ninguna petición lleva `Authorization`), el código se pide
 * al correo enmascarado, se firma con `{ codigo }`, y los estados de enlace no
 * vigente, código vencido y firmado.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/navigation', () => ({ useParams: () => ({ token: 'tok-del-correo' }) }));

import FirmaDelMandatoPage from './page';

const CONTEXTO = {
  firmante: 'Jorge Restrepo',
  codigoA: 'jor***@correo.co',
  documento: { sha256: 'ab'.repeat(32), bytes: 12345 },
  venceEl: '2026-09-30T15:00:00.000Z',
  inmueble: { titulo: 'Apto 301', sector: 'Laureles, Medellín' },
  inmobiliaria: 'Inmo Norte',
  comisionPct: 10,
};

type Respuesta = { status: number; body: unknown };
let respuestas: Record<string, Respuesta[]>;
let llamadas: Array<{ url: string; init: RequestInit }>;

function responder(clave: string, ...r: Respuesta[]) {
  respuestas[clave] = [...(respuestas[clave] ?? []), ...r];
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  respuestas = {};
  llamadas = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      llamadas.push({ url, init });
      const ruta = new URL(url).pathname;
      const clave = `${init.method ?? 'GET'} ${ruta}`;
      if (clave === `GET ${BASE}/pdf`) {
        return new Response(new Blob(['%PDF-mandato']), { status: 200 });
      }
      const r = respuestas[clave]?.shift() ?? { status: 500, body: {} };
      return new Response(JSON.stringify(r.body), { status: r.status });
    }),
  );
  vi.stubGlobal('open', vi.fn());
  URL.createObjectURL = vi.fn(() => 'blob:mandato');
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

const $ = (t: string) => container.querySelector<HTMLElement>(`[data-testid="${t}"]`);
const esperar = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

async function pintar() {
  await act(async () => root.render(<FirmaDelMandatoPage />));
  await esperar();
}

async function clic(t: string) {
  await act(async () => { $(t)?.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  await esperar();
}

function escribirCodigo(valor: string) {
  const input = $('codigo') as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    setter.call(input, valor);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

const BASE = '/mandato/firma/tok-del-correo';

describe('/mandato/firma/[token]', () => {
  it('🔴 el camino completo: reconoce el mandato, pide el código al correo enmascarado y firma con { codigo }, sin sesión', async () => {
    responder(`GET ${BASE}`, { status: 200, body: CONTEXTO });
    responder(`POST ${BASE}/codigo`, {
      status: 200,
      body: { enviadoA: 'jor***@correo.co', venceEl: '2026-09-23T20:10:00.000Z' },
    });
    responder(`POST ${BASE}/firmar`, {
      status: 200,
      body: { id: 'f-1', estado: 'FIRMADA', firmadaEl: '2026-09-23T20:05:00.000Z' },
    });
    await pintar();

    expect($('datos-del-mandato')?.textContent).toContain('Apto 301');
    expect(container.textContent).toContain('jor***@correo.co');
    // 🔴 Primero el documento: sin abrir el PDF no se puede aceptar.
    expect(($('acepto-el-mandato') as HTMLInputElement).disabled).toBe(true);
    expect($('huella-del-documento')?.textContent).toContain('abababab');
    await clic('ver-el-mandato');
    expect(llamadas.some((l) => l.url.endsWith(`${BASE}/pdf`))).toBe(true);
    // Hasta aceptar, no se pide el código.
    expect(($('pedir-codigo') as HTMLButtonElement).disabled).toBe(true);
    await clic('acepto-el-mandato');
    await clic('pedir-codigo');
    expect($('codigo-enviado')?.textContent).toContain('jor***@correo.co');

    expect(($('firmar-mandato') as HTMLButtonElement).disabled).toBe(true);
    escribirCodigo('12a34-56');
    expect(($('codigo') as HTMLInputElement).value).toBe('123456');
    await clic('firmar-mandato');

    const firmar = llamadas.find((l) => l.url.endsWith(`${BASE}/firmar`));
    expect(firmar?.init.method).toBe('POST');
    // La firma va atada a la huella del PDF que se le mostró.
    expect(JSON.parse(String(firmar?.init.body))).toEqual({
      codigo: '123456',
      sha256: 'ab'.repeat(32),
    });
    for (const l of llamadas) {
      expect(JSON.stringify(l.init.headers ?? {})).not.toMatch(/authorization/i);
    }
    expect($('mandato-firmado')).not.toBeNull();
  });

  it('enlace vencido, anulado o ya firmado (404): lo dice y no ofrece firmar', async () => {
    responder(`GET ${BASE}`, {
      status: 404,
      body: { code: 'ENLACE_NO_VALIDO', message: 'Ese enlace de firma no existe o ya no está vigente.' },
    });
    await pintar();
    expect($('enlace-no-vigente')).not.toBeNull();
    expect($('pedir-codigo')).toBeNull();
  });

  it('código vencido o agotado: muestra el motivo y vuelve a ofrecer pedir otro', async () => {
    responder(`GET ${BASE}`, { status: 200, body: CONTEXTO });
    responder(`POST ${BASE}/codigo`, {
      status: 200,
      body: { enviadoA: 'jor***@correo.co', venceEl: '2026-09-23T20:10:00.000Z' },
    });
    responder(`POST ${BASE}/firmar`, {
      status: 400,
      body: { code: 'DEMASIADOS_INTENTOS', message: 'Demasiados intentos fallidos. Pide un código nuevo.' },
    });
    await pintar();
    await clic('ver-el-mandato');
    await clic('acepto-el-mandato');
    await clic('pedir-codigo');
    escribirCodigo('000000');
    await clic('firmar-mandato');
    expect(container.textContent).toContain('Pide un código nuevo');
    expect($('pedir-codigo')).not.toBeNull();
    expect($('mandato-firmado')).toBeNull();
  });

  it('🔴 un enlace sin documento no deja firmar', async () => {
    responder(`GET ${BASE}`, { status: 200, body: { ...CONTEXTO, documento: null } });
    await pintar();
    expect($('sin-documento')).not.toBeNull();
    expect($('pedir-codigo')).toBeNull();
  });
});
