/**
 * La página pública de verificación de un estudio.
 *
 * ⚠️ El caso «no se pudo preguntar» vive en `page.red-caida.test.tsx`: acá el
 * servicio está doblado con `vi.fn`, y el espía de Vitest le engancha un
 * `.then` con manejador de error a lo que devuelve el doble, así que CUALQUIER
 * rechazo queda marcado como no manejado y tumba la prueba aunque el
 * componente lo atrape bien. En el otro archivo se dobla `fetch`, que es más
 * abajo, y de paso se ejercita el servicio de verdad.
 *
 * 🔴 Antes de hoy esta pantalla leía `localStorage` DEL VISITANTE para decir
 * si un documento era auténtico, y el nombre del inquilino estaba escrito a
 * mano. Consecuencias medidas: el propietario que recibía el certificado
 * siempre veía «no encontrado», y cualquiera podía fabricar un «verificado»
 * desde la consola del navegador.
 *
 * Lo que estas pruebas sostienen, por orden de gravedad:
 *   1. NUNCA vuelve a leer `localStorage` para decidir autenticidad;
 *   2. un fallo de red NO se muestra como «documento falso»;
 *   3. el puntaje exacto no aparece en una página sin sesión.
 */

import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/navigation', () => ({ useParams: () => ({ code: 'cod-1' }) }));

const verificar = vi.fn();
vi.mock('@/lib/api/verificacion.service', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/verificacion.service')>(
    '@/lib/api/verificacion.service',
  );
  return { ...real, verificarEstudio: (c: string) => verificar(c) };
});

import VerificarPage from './page';

let host: HTMLDivElement | null = null;
let root: Root | null = null;

const esperar = () => act(async () => { await Promise.resolve(); });

async function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => { root!.render(<VerificarPage />); });
  await esperar();
  await esperar();
}

beforeEach(() => verificar.mockReset());
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  host = null;
  root = null;
});

const texto = () => document.body.textContent ?? '';

const VERIFICADO = {
  autentico: true,
  motivo: null,
  nombreEnmascarado: 'Nic*** Gar***',
  nivel: 'B',
  emitidoEl: '2026-03-15T10:00:00.000Z',
  venceEl: '2027-03-15T10:00:00.000Z',
};

describe('verificación pública de un estudio', () => {
  it('🔴 le pregunta al BACK, no al localStorage del visitante', async () => {
    localStorage.setItem(
      'leasefy_evaluation',
      JSON.stringify({ verificationCode: 'cod-1', status: 'paid' }),
    );
    verificar.mockResolvedValue({ ...VERIFICADO, autentico: false, motivo: 'NO_EXISTE' });
    await montar();

    expect(verificar).toHaveBeenCalledWith('cod-1');
    // Con el localStorage «correcto» puesto a mano, la página NO certifica.
    expect(texto()).toContain('no corresponde a ningún estudio');
    expect(texto()).not.toContain('Estudio verificado');
    localStorage.removeItem('leasefy_evaluation');
  });

  it('un estudio auténtico se muestra con el nombre enmascarado y el nivel', async () => {
    verificar.mockResolvedValue(VERIFICADO);
    await montar();
    expect(texto()).toContain('Estudio verificado');
    expect(texto()).toContain('Nic*** Gar***');
    expect(texto()).toContain('B');
  });

  /** El número lo pagó el propietario; esta página la abre cualquiera. */
  it('🔴 no muestra el puntaje exacto', async () => {
    verificar.mockResolvedValue(VERIFICADO);
    await montar();
    expect(texto()).not.toMatch(/\d{1,3}\s*\/\s*100/);
    expect(texto()).toContain('El puntaje exacto sólo lo ve quien pidió el estudio');
  });

  it('un estudio vencido lo dice con su fecha, no como «no existe»', async () => {
    verificar.mockResolvedValue({ ...VERIFICADO, autentico: false, motivo: 'VENCIDO' });
    await montar();
    expect(texto()).toContain('ya venció');
    expect(texto()).toContain('2026');
  });

  it('un estudio sin terminar no se certifica ni se niega', async () => {
    verificar.mockResolvedValue({
      ...VERIFICADO,
      autentico: false,
      motivo: 'SIN_TERMINAR',
      nivel: null,
    });
    await montar();
    expect(texto()).toContain('todavía no está terminado');
  });
});
