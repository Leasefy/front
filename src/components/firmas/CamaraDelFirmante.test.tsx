/**
 * @vitest-environment happy-dom
 *
 * La foto del firmante con nuestra cámara (Nico, 28-10-2026: «cámara propia + revisar la cara», sin Didit). Lo que
 * sostiene:
 *   1. «Tomar la foto» se prende sólo con UNA cara de frente (y dice qué falta mientras tanto);
 *   2. la foto se ve antes de guardarla y se guarda marcada «cara revisada»;
 *   3. sin permiso o sin cámara, dice qué hacer (en el celular, el mismo enlace);
 *   4. si el revisor no carga, deja tomarla igual y se guarda «sin revisar».
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CaraVista } from '@/lib/firmas/revisor-de-la-cara';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const subirFoto = vi.hoisted(() => vi.fn());
const cargar = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/firmas.service', () => ({ firmaPublicaApi: { subirFoto } }));
vi.mock('@/lib/firmas/revisor-de-la-cara', async (original) => ({
  ...(await original<typeof import('@/lib/firmas/revisor-de-la-cara')>()),
  cargarElRevisorDeLaCara: cargar,
}));
vi.mock('@/components/ui/toast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { CamaraDelFirmante, falloDeLaCamara } from './CamaraDelFirmante';

const CENTRADA: CaraVista = { x: 240, y: 140, ancho: 160, alto: 190, puntaje: 0.9 };
const LEJOS: CaraVista = { x: 290, y: 190, ancho: 80, alto: 95, puntaje: 0.8 };

let raiz: Root | null = null;
let caras: CaraVista[] = [];
const pista = { stop: vi.fn() };

beforeEach(() => {
  caras = [];
  Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', { configurable: true, get: () => 640 });
  Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', { configurable: true, get: () => 480 });
  HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/jpeg;base64,Rk9UTw==');
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: vi.fn(async () => {
        const flujo = new MediaStream();
        flujo.getTracks = () => [pista as unknown as MediaStreamTrack];
        return flujo;
      }),
    },
  });
  cargar.mockResolvedValue({ revisar: vi.fn(async () => caras) });
});

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

async function montar(onCambio = vi.fn()) {
  const caja = document.createElement('div');
  document.body.appendChild(caja);
  raiz = createRoot(caja);
  await act(async () => raiz!.render(<CamaraDelFirmante token="tok" onCambio={onCambio} />));
  return onCambio;
}

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T | null => document.querySelector<T>(sel);
const boton = (texto: string) =>
  [...document.querySelectorAll('button')].find((b) => b.textContent?.trim().includes(texto)) as HTMLButtonElement | undefined;

/** Espera (con el reloj de verdad) hasta que se cumpla; la cámara revisa cada 0,4 s y el cambio de paso se anima. */
async function hastaQue(cumple: () => boolean, ms = 3000) {
  const fin = Date.now() + ms;
  while (!cumple()) {
    if (Date.now() > fin) throw new Error(`no pasó: ${document.body.textContent}`);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
  }
}

async function tocar(el: HTMLElement | undefined | null) {
  if (!el) throw new Error(`no está el botón: ${document.body.textContent}`);
  await act(async () => el.click());
}

describe('CamaraDelFirmante', () => {
  it('sólo con la cara centrada se toma; se ve antes de guardarla y se guarda «revisada»', async () => {
    subirFoto.mockResolvedValue({ requerida: true, modo: 'FOTO', estado: 'APROBADA', intentosQuedan: 4, motivo: null });
    const onCambio = await montar();
    expect(document.body.textContent).toContain('Tómate una foto');

    caras = [LEJOS];
    await tocar($('[data-testid="abrir-la-camara"]'));
    await hastaQue(() => $('[data-testid="frase-de-la-camara"]')?.textContent === 'Acércate un poco a la cámara.');
    expect($<HTMLButtonElement>('[data-testid="tomar-la-foto"]')!.disabled).toBe(true);

    caras = [CENTRADA, { ...CENTRADA, x: 20, y: 20, ancho: 40, alto: 48 }];
    await hastaQue(() => $('[data-testid="frase-de-la-camara"]')?.textContent === 'Listo. Toma la foto.');
    caras = [CENTRADA];
    await tocar($('[data-testid="tomar-la-foto"]'));
    await hastaQue(() => document.body.textContent?.includes('¿Se ve bien?') ?? false);
    expect($<HTMLImageElement>('img[alt="Tu foto"]')!.src).toContain('data:image/jpeg');
    expect(pista.stop).toHaveBeenCalled();

    await tocar($('[data-testid="usar-la-foto"]'));
    expect(subirFoto).toHaveBeenCalledWith('tok', 'data:image/jpeg;base64,Rk9UTw==', true);
    expect(onCambio).toHaveBeenCalledWith(expect.objectContaining({ estado: 'APROBADA' }));
  });

  it('dos personas: pide que salga sólo una y no deja tomarla', async () => {
    await montar();
    caras = [CENTRADA, { ...CENTRADA, x: 40, ancho: 140 }];
    await tocar($('[data-testid="abrir-la-camara"]'));
    await hastaQue(() => $('[data-testid="frase-de-la-camara"]')?.textContent === 'Que salga sólo tu cara.');
    expect($<HTMLButtonElement>('[data-testid="tomar-la-foto"]')!.disabled).toBe(true);
  });

  it('sin permiso: cómo darlo y volver a intentar; sin cámara: el mismo enlace en el celular', async () => {
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      Object.assign(new Error('no'), { name: 'NotAllowedError' }),
    );
    await montar();
    await tocar($('[data-testid="abrir-la-camara"]'));
    await hastaQue(() => Boolean($('[data-testid="camara-sin-permiso"]')));
    expect(document.body.textContent).toContain('Tu navegador no dejó usar la cámara');

    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      Object.assign(new Error('no'), { name: 'NotFoundError' }),
    );
    await tocar($('[data-testid="camara-reintentar"]'));
    await hastaQue(() => Boolean($('[data-testid="camara-sin-camara"]')));
    expect(document.body.textContent).toContain('Abre este mismo enlace en tu celular');
    expect(boton('Copiar el enlace')).toBeTruthy();
  });

  it('si el revisor no carga, deja tomarla igual y se guarda «sin revisar»', async () => {
    cargar.mockRejectedValue(new Error('sin red'));
    subirFoto.mockResolvedValue({ requerida: true, modo: 'FOTO', estado: 'APROBADA', intentosQuedan: 4, motivo: null });
    await montar();
    await tocar($('[data-testid="abrir-la-camara"]'));
    await hastaQue(() => $('[data-testid="frase-de-la-camara"]')?.textContent === 'Que tu cara se vea completa y con buena luz.');
    expect($<HTMLButtonElement>('[data-testid="tomar-la-foto"]')!.disabled).toBe(false);
    await tocar($('[data-testid="tomar-la-foto"]'));
    await hastaQue(() => Boolean($('[data-testid="usar-la-foto"]')));
    await tocar($('[data-testid="usar-la-foto"]'));
    expect(subirFoto).toHaveBeenCalledWith('tok', expect.stringMatching(/^data:image\/jpeg/), false);
  });

  it('lee el error del navegador', () => {
    expect(falloDeLaCamara({ name: 'NotAllowedError' })).toBe('sin-permiso');
    expect(falloDeLaCamara({ name: 'NotFoundError' })).toBe('sin-camara');
    expect(falloDeLaCamara({ name: 'NotReadableError' })).toBe('ocupada');
    expect(falloDeLaCamara(null)).toBe('ocupada');
  });
});
