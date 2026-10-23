/**
 * «Mori recuerda la factura» (Portofino, Nico 22-10-2026): arranca apagado,
 * prenderlo pone el día 20, se apaga con el mismo interruptor, y cada fila del
 * tablero dice lo que Mori hizo con la factura de ese mes.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/api/servicios-publicos.service', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/servicios-publicos.service')>()),
  serviciosPublicosApi: { guardarRecordatorio: vi.fn() },
}));

import { serviciosPublicosApi, type ConfiguracionDelRecordatorio } from '@/lib/api/servicios-publicos.service';
import { toast } from '@/components/ui/toast';
import { MoriRecuerdaLaFactura, fraseDeLosRecordatorios } from './MoriRecuerdaLaFactura';

const guardar = serviciosPublicosApi.guardarRecordatorio as unknown as ReturnType<typeof vi.fn>;
const APAGADO: ConfiguracionDelRecordatorio = { disponible: true, dia: null, diaPorDefecto: 20, diaMaximo: 21 };

let contenedor: HTMLDivElement;
let raiz: Root;
beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
  guardar.mockReset();
});
afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

const q = (id: string) => document.body.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;

async function pintar(configuracion: ConfiguracionDelRecordatorio, puedeEditar = true, onCambio = vi.fn()) {
  await act(async () => {
    raiz.render(<MoriRecuerdaLaFactura configuracion={configuracion} puedeEditar={puedeEditar} onCambio={onCambio} />);
  });
  return onCambio;
}

describe('<MoriRecuerdaLaFactura>', () => {
  it('apagado: lo dice, sin selector de día; prenderlo guarda el 20', async () => {
    guardar.mockResolvedValue({ ...APAGADO, dia: 20 });
    const onCambio = await pintar(APAGADO);
    expect(q('mori-recuerda')?.textContent).toContain('Apagado');
    expect(q('mori-recuerda-dia')).toBeNull();
    await act(async () => {
      q('mori-recuerda-interruptor')!.click();
    });
    expect(guardar).toHaveBeenCalledWith(20);
    expect(onCambio).toHaveBeenCalledWith(expect.objectContaining({ dia: 20 }));
    expect(toast.success).toHaveBeenCalled();
  });

  it('prendido: dice el día y el riesgo de corte; el interruptor lo apaga', async () => {
    guardar.mockResolvedValue(APAGADO);
    await pintar({ ...APAGADO, dia: 15 });
    expect(q('mori-recuerda')?.textContent).toContain('El día 15 del mes siguiente y 7 días después');
    expect(q('mori-recuerda')?.textContent).toContain('riesgo de corte');
    expect(q('mori-recuerda-dia')).not.toBeNull();
    await act(async () => {
      q('mori-recuerda-interruptor')!.click();
    });
    expect(guardar).toHaveBeenCalledWith(null);
  });

  it('sin permiso de editar: se ve pero no se cambia', async () => {
    await pintar({ ...APAGADO, dia: 20 }, false);
    expect((q('mori-recuerda-interruptor') as HTMLButtonElement).disabled).toBe(true);
  });

  it('sin la actualización de la base no se pinta', async () => {
    await pintar({ ...APAGADO, disponible: false });
    expect(q('mori-recuerda')).toBeNull();
  });
});

describe('fraseDeLosRecordatorios', () => {
  it('lo que Mori hizo, en una frase', () => {
    expect(fraseDeLosRecordatorios(undefined)).toBeNull();
    expect(fraseDeLosRecordatorios([{ intento: 1, estado: 'EN_CURSO', dia: '2026-11-20', detalle: null }])).toBeNull();
    expect(fraseDeLosRecordatorios([{ intento: 1, estado: 'ENVIADO', dia: '2026-11-20', detalle: null }])).toMatch(/^Mori le recordó el /);
    expect(
      fraseDeLosRecordatorios([
        { intento: 2, estado: 'ENVIADO', dia: '2026-11-27', detalle: null },
        { intento: 1, estado: 'ENVIADO', dia: '2026-11-20', detalle: null },
      ]),
    ).toMatch(/^Mori le recordó 2 veces/);
    expect(fraseDeLosRecordatorios([{ intento: 1, estado: 'EN_LA_GESTION_DE_COBRO', dia: '2026-11-20', detalle: null }])).toMatch(
      /^Mori se lo dice en su gestión de cobro/,
    );
    expect(
      fraseDeLosRecordatorios([{ intento: 1, estado: 'NO_SE_ENVIA', dia: '2026-11-20', detalle: 'pidió que no le escribamos por WhatsApp' }]),
    ).toBe('Mori no pudo escribirle: pidió que no le escribamos por WhatsApp');
  });
});
