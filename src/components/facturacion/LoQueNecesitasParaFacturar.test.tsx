/**
 * «Para facturar te faltan N pasos» (GLOW UP de Facturación, 20-10-2026).
 *
 * Lo que fija: cada requisito sale de lo que el back respondió — sin resolución
 * vigente es el que sigue y su botón abre la carga; el documento del propietario
 * sólo aparece si el back dice que hay alguno; los correos no frenan; lo que no
 * se pudo leer no se pinta como listo.
 */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const resoluciones = vi.fn();
const tercerosSinCorreo = vi.fn();
const estadoAnteLaDian = vi.fn();
const aviso = { current: null as null | { total: number; enlace: string; detalle: string | null } };

vi.mock('@/lib/api/facturacion-por-mes.service', () => ({
  facturacionPorMesService: { resoluciones: () => resoluciones() },
}));
vi.mock('@/lib/api/facturacion-electronica.service', () => ({
  facturacionElectronicaService: {
    tercerosSinCorreo: () => tercerosSinCorreo(),
    estadoAnteLaDian: () => estadoAnteLaDian(),
  },
  seTransmiteDeVerdad: (e: { transmite?: boolean } | null) => e?.transmite === true,
}));
vi.mock('@/lib/hooks/use-aviso-tipo-de-documento', () => ({
  useAvisoTipoDeDocumento: () => ({ aviso: aviso.current }),
}));
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContextSafe: () => ({ isAdmin: true, isLoading: false, canAccess: () => true }),
}));

import { LoQueNecesitasParaFacturar } from './LoQueNecesitasParaFacturar';

const vigente = (puedeNumerar: boolean) => ({
  resoluciones: [],
  vigente: {
    puedeNumerar,
    motivo: puedeNumerar ? null : 'SIN_RESOLUCION',
    explicacion: puedeNumerar
      ? null
      : 'La inmobiliaria no tiene ninguna resolución vigente. Cárgala en Facturación → Resolución.',
    numero: puedeNumerar ? '18764003394379' : null,
    prefijo: puedeNumerar ? 'FE' : null,
    desde: null,
    hasta: null,
    vigenteHasta: null,
    disponibles: puedeNumerar ? 4800 : 0,
    siguiente: null,
  },
  porTipoDisponible: false,
  porTipo: [],
  umbrales: { numeros: 50, dias: 30 },
  avisos: [],
});

let host: HTMLDivElement;
let root: Root;
const cargar = vi.fn();
const verCorreos = vi.fn();

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  resoluciones.mockReset();
  tercerosSinCorreo.mockReset();
  estadoAnteLaDian.mockReset();
  cargar.mockReset();
  verCorreos.mockReset();
  aviso.current = null;
  try {
    window.localStorage.clear();
  } catch {
    /* sin almacenamiento */
  }
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const q = (s: string) => host.querySelector(s);

/** Con todo listo la tarjeta viene plegada: se abre para leer sus filas. */
async function abrir() {
  const cabecera = q('[data-testid="lo-que-necesitas-para-facturar"] button[aria-expanded="false"]');
  if (cabecera) {
    await act(async () => {
      (cabecera as HTMLButtonElement).click();
    });
  }
}

async function pintar() {
  await act(async () => {
    root.render(
      <LoQueNecesitasParaFacturar
        onCargarResolucion={cargar}
        onVerResoluciones={() => undefined}
        onVerCorreos={verCorreos}
      />,
    );
  });
  // Las tres lecturas.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

/** 22-10: la lista empieza plegada en una línea («Sigue: …»); se abre como la abre la persona. */
async function abrirLaLista() {
  const boton = document.querySelector<HTMLButtonElement>('[data-testid="lo-que-necesitas-para-facturar"] > button[aria-expanded="false"]');
  if (boton) {
    await act(async () => {
      boton.click();
    });
  }
}

describe('LoQueNecesitasParaFacturar', () => {
  it('🔴 sin resolución vigente, es lo que sigue y su botón abre la carga', async () => {
    resoluciones.mockResolvedValue(vigente(false));
    tercerosSinCorreo.mockResolvedValue({ total: 10, sinCorreo: 3 });
    estadoAnteLaDian.mockResolvedValue({ estado: 'FALTA_RESOLUCION', titulo: 'Falta la resolución', transmite: false, ambiente: null, pasos: [], avisos: [], descripcion: '' });
    await pintar();
    await abrirLaLista();
    const fila = q('[data-testid="lo-que-necesitas-para-facturar-resolucion"]')!;
    expect(fila.getAttribute('data-estado')).toBe('falta');
    expect(fila.textContent).toContain('Sigue');
    // La explicación del back, sin «Cárgala en Facturación → Resolución» (estando ahí).
    expect(fila.textContent).not.toContain('Cárgala en Facturación');
    await act(async () => {
      (q('[data-testid="requisito-cargar-resolucion"]') as HTMLButtonElement).click();
    });
    expect(cargar).toHaveBeenCalledTimes(1);
    // La DIAN no repite el aviso de la resolución: dice que se habilita con ella.
    expect(q('[data-testid="lo-que-necesitas-para-facturar-dian"]')!.textContent).toContain(
      'Se habilita cuando cargues la resolución',
    );
  });

  it('con la resolución vigente queda lista, con su número', async () => {
    resoluciones.mockResolvedValue(vigente(true));
    tercerosSinCorreo.mockResolvedValue({ total: 10, sinCorreo: 0 });
    estadoAnteLaDian.mockResolvedValue({ estado: 'LISTA', titulo: 'Lista', transmite: true, ambiente: 'PRODUCCION', pasos: [], avisos: [], descripcion: '' });
    await pintar();
    expect(q('[data-testid="lo-que-necesitas-para-facturar"]')!.getAttribute('data-estado')).toBe('listo');
    await abrir();
    const fila = q('[data-testid="lo-que-necesitas-para-facturar-resolucion"]')!;
    expect(fila.getAttribute('data-estado')).toBe('listo');
    expect(fila.textContent).toContain('18764003394379');
  });

  it('el documento del propietario sale SÓLO si el back dice que hay alguno', async () => {
    resoluciones.mockResolvedValue(vigente(true));
    tercerosSinCorreo.mockResolvedValue({ total: 10, sinCorreo: 0 });
    estadoAnteLaDian.mockResolvedValue({ estado: 'APAGADA', titulo: '', transmite: false, ambiente: null, pasos: [], avisos: [], descripcion: '' });
    await pintar();
    await abrir();
    expect(q('[data-testid="lo-que-necesitas-para-facturar-documento-del-propietario"]')).toBeNull();
    // Apagada para todos no es un paso de la inmobiliaria.
    expect(q('[data-testid="lo-que-necesitas-para-facturar-dian"]')).toBeNull();

    act(() => root.unmount());
    root = createRoot(host);
    aviso.current = { total: 2, enlace: '/panel/inmobiliaria/propietarios?filtro=tipo', detalle: 'En octubre todavía no frena ninguna.' };
    await pintar();
    const fila = q('[data-testid="lo-que-necesitas-para-facturar-documento-del-propietario"]')!;
    expect(fila.textContent).toContain('2 propietarios');
    // La frase del back (dice si este mes ya frena o no).
    expect(fila.textContent).toContain('En octubre todavía no frena ninguna.');
  });

  it('los correos no frenan la factura: no cuentan, llevan su rótulo y abren su lista', async () => {
    resoluciones.mockResolvedValue(vigente(true));
    tercerosSinCorreo.mockResolvedValue({ total: 3514, sinCorreo: 887 });
    estadoAnteLaDian.mockResolvedValue({ estado: 'LISTA', titulo: 'Lista', transmite: true, ambiente: 'PRODUCCION', pasos: [], avisos: [], descripcion: '' });
    await pintar();
    // Lo obligatorio está listo: la tarjeta dice «Todo listo» aunque falten correos.
    expect(q('[data-testid="lo-que-necesitas-para-facturar"]')!.getAttribute('data-estado')).toBe('listo');
    await abrir();
    const fila = q('[data-testid="lo-que-necesitas-para-facturar-correos"]')!;
    expect(fila.getAttribute('data-estado')).toBe('opcional');
    expect(fila.textContent).toContain('No frena la factura');
    await act(async () => {
      (q('[data-testid="requisito-ver-correos"]') as HTMLButtonElement).click();
    });
    expect(verCorreos).toHaveBeenCalledTimes(1);
  });

  it('🔴 lo que no se pudo leer no se pinta como listo', async () => {
    resoluciones.mockRejectedValue(new Error('caído'));
    tercerosSinCorreo.mockRejectedValue(new Error('caído'));
    estadoAnteLaDian.mockRejectedValue(new Error('caído'));
    await pintar();
    await abrirLaLista();
    expect(q('[data-testid="lo-que-necesitas-para-facturar"]')!.textContent).not.toContain('Todo listo');
    expect(q('[data-testid="lo-que-necesitas-para-facturar-resolucion"]')!.getAttribute('data-estado')).toBe(
      'desconocido',
    );
    expect(q('[data-testid="lo-que-necesitas-para-facturar-correos"]')!.getAttribute('data-estado')).toBe(
      'desconocido',
    );
  });
});
