import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

// 10-10-2026: las fechas son campos de Cadence (se eligen, no se escriben); en la
// prueba, un <input> con el mismo id y data-testid (`campos-de-fecha.doble-de-prueba`).
vi.mock('@/components/contabilidad/CampoDeDia', () => import('@/components/ui/campos-de-fecha.doble-de-prueba'));
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/api/ciclo-de-vida.service', () => ({
  cicloDeVidaApi: {
    incrementos: vi.fn(),
    fijarTasaAnual: vi.fn(),
    digitarIncremento: vi.fn(),
    enviarCarta: vi.fn(),
    verCarta: vi.fn(),
    vencidos: vi.fn(),
    extender: vi.fn(),
    prorroga: vi.fn(),
    registrarConstancia: vi.fn(),
    soporteDeLaConstancia: vi.fn(),
  },
}));
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { cicloDeVidaApi } from '@/lib/api/ciclo-de-vida.service';
import { IncrementosDelContrato } from './IncrementosDelContrato';
import { RenovarContratoVencido } from './RenovarContratoVencido';

const api = cicloDeVidaApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
let root: Root | null = null;
let container: HTMLDivElement | null = null;

const aniversario = {
  desde: '2026-08-21',
  origen: 'IPC',
  porcentaje: 5.1,
  canonAnteriorCop: 1_000_000,
  canonNuevoCop: 1_051_000,
  motivo: null,
  carta: null,
};

async function escribir(input: HTMLInputElement, valor: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, valor);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function montar(el: React.ReactElement) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(el);
  });
  await act(async () => {});
}

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset());
});
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
});

describe('<IncrementosDelContrato> (17-09)', () => {
  it('vivienda: muestra el aniversario al IPC y UN solo botón abre la carta en el cajón (19-10)', async () => {
    api.incrementos.mockResolvedValue({
      uso: 'VIVIENDA',
      tasaAnualPactadaPct: null,
      aniversarios: [aniversario],
      disponible: true,
      envioHabilitado: true,
      prorrateaElMes: true,
    });
    api.verCarta.mockResolvedValue({
      contractId: 'c1',
      desde: '2026-08-21',
      estado: 'POR_ENVIAR',
      inquilino: 'Ana',
      inmueble: 'Cra 1',
      canonAnteriorCop: 1_000_000,
      canonNuevoCop: 1_051_000,
      para: 'ana@example.com',
      asunto: 'Incremento del canon de arrendamiento desde el 21 de agosto de 2026',
      contenido: 'Señor(a) Ana: …',
      corregida: false,
      reajuste: null,
      enviada: null,
      correoSaleDeVerdad: true,
      envioHabilitado: true,
    });
    await montar(<IncrementosDelContrato contractId="c1" puedeEditar />);
    const bloque = document.querySelector('[data-testid="aniversario-2026-08-21"]')!;
    expect(bloque.textContent).toContain('IPC del año anterior');
    // QA-CONT-95: con coma decimal, como se escribe en Colombia.
    expect(bloque.textContent).toContain('5,1 %');
    expect(document.querySelector('[data-testid="tasa-pactada"]')).toBeNull();
    // El contrato parte el mes: la ficha lo dice.
    expect(document.body.textContent).toContain('El mes del aniversario se cobra prorrateado.');

    // «Ver y editar la carta» en la ficha sobraba al lado del cajón (que ya corrige).
    const botones = [...bloque.querySelectorAll('button')].map((b) => b.textContent);
    expect(botones).not.toContain('Ver y editar la carta');
    expect(botones.filter((t) => t?.startsWith('Ver y enviar la carta'))).toHaveLength(1);
    expect(bloque.querySelector('textarea')).toBeNull();

    const abrir = document.querySelector('[data-testid="enviar-carta-2026-08-21"]') as HTMLButtonElement;
    await act(async () => abrir.click());
    await act(async () => {});
    expect(api.verCarta).toHaveBeenCalledWith('c1', '2026-08-21');
  });

  it('🔴 un contrato fecha a fecha (o sin el dato) no dice «se cobra prorrateado» (19-10)', async () => {
    for (const prorrateaElMes of [false, null, undefined]) {
      api.incrementos.mockResolvedValue({
        uso: 'VIVIENDA',
        tasaAnualPactadaPct: null,
        aniversarios: [aniversario],
        disponible: true,
        envioHabilitado: true,
        prorrateaElMes,
      });
      await montar(<IncrementosDelContrato contractId="c1" puedeEditar />);
      expect(document.body.textContent).toContain('sube sola al 100 % del IPC');
      expect(document.body.textContent).not.toContain('prorrateado');
      act(() => root?.unmount());
      container?.remove();
    }
    root = null;
    container = null;
  });

  it('🔴 D6 + 19-10: la carta por enviar se ve antes de salir; si el correo se simula, lo dice y no hay constancia', async () => {
    api.incrementos.mockResolvedValue({
      uso: 'VIVIENDA',
      tasaAnualPactadaPct: null,
      aniversarios: [{ ...aniversario, bandeja: { estado: 'POR_ENVIAR', diasParaElAniversario: 12, alertaRoja: false } }],
      disponible: true,
      envioHabilitado: true,
      correoSaleDeVerdad: false,
      diasAntesDeLaCarta: 30,
    });
    api.verCarta.mockResolvedValue({
      contractId: 'c1',
      desde: '2026-08-21',
      estado: 'POR_ENVIAR',
      inquilino: 'Ana',
      inmueble: 'Cra 1',
      canonAnteriorCop: 1_000_000,
      canonNuevoCop: 1_051_000,
      para: 'ana@example.com',
      asunto: 'Incremento del canon de arrendamiento desde el 21 de agosto de 2026',
      contenido: 'Señor(a) Ana: …',
      corregida: false,
      reajuste: null,
      enviada: null,
      correoSaleDeVerdad: false,
      envioHabilitado: true,
    });
    api.enviarCarta.mockResolvedValue({
      uso: 'VIVIENDA',
      tasaAnualPactadaPct: null,
      aniversarios: [aniversario],
      disponible: true,
      envioHabilitado: true,
      ultimoEnvio: { resultado: 'SIMULADA', mensaje: 'No salió: EMAIL_DELIVERY_ENABLED' },
    });
    await montar(<IncrementosDelContrato contractId="c1" puedeEditar />);
    expect(document.body.textContent).toContain('faltan 12 días');
    expect(document.querySelector('[data-testid="correo-simulado"]')).not.toBeNull();
    const abrir = document.querySelector('[data-testid="enviar-carta-2026-08-21"]') as HTMLButtonElement;
    await act(async () => abrir.click());
    await act(async () => {});
    // Abrir NO envía: primero se ve la carta.
    expect(api.enviarCarta).not.toHaveBeenCalled();
    expect(document.querySelector('[data-testid="texto-de-la-carta"]')?.textContent).toContain('Señor(a) Ana');
    const enviar = document.querySelector('[data-testid="enviar-la-carta"]') as HTMLButtonElement;
    await act(async () => enviar.click());
    expect(api.enviarCarta).toHaveBeenCalledWith('c1', '2026-08-21', 'Señor(a) Ana: …');
    const { toast } = await import('@/components/ui/toast');
    expect(toast.error).toHaveBeenCalledWith('La carta no salió.', expect.anything());
  });

  it('🔴 D6: llegado el aniversario sin constancia, alerta roja; y se puede registrar la constancia de otro medio', async () => {
    api.incrementos.mockResolvedValue({
      uso: 'VIVIENDA',
      tasaAnualPactadaPct: null,
      aniversarios: [{ ...aniversario, bandeja: { estado: 'VENCIDA_SIN_CONSTANCIA', diasParaElAniversario: -3, alertaRoja: true } }],
      disponible: true,
      envioHabilitado: true,
    });
    await montar(<IncrementosDelContrato contractId="c1" puedeEditar />);
    expect(document.querySelector('[data-testid="alerta-sin-constancia-2026-08-21"]')).not.toBeNull();
    const otroMedio = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Se entregó por otro medio')!;
    await act(async () => otroMedio.click());
    expect(document.querySelector('[data-testid="constancia-2026-08-21"]')).not.toBeNull();
  });

  it('🔴 la constancia se registra SIN soporte: adjuntarlo es opcional (Nico, 17-09)', async () => {
    api.incrementos.mockResolvedValue({
      uso: 'VIVIENDA',
      tasaAnualPactadaPct: null,
      aniversarios: [aniversario],
      disponible: true,
      envioHabilitado: true,
    });
    api.registrarConstancia.mockResolvedValue({
      uso: 'VIVIENDA',
      tasaAnualPactadaPct: null,
      aniversarios: [aniversario],
      disponible: true,
      envioHabilitado: true,
    });
    await montar(<IncrementosDelContrato contractId="c1" puedeEditar />);
    const otroMedio = [...document.querySelectorAll('button')].find(
      (b) => b.textContent === 'Se entregó por otro medio',
    )!;
    await act(async () => otroMedio.click());

    const bloque = document.querySelector('[data-testid="constancia-2026-08-21"]')!;
    expect(bloque.textContent).toContain('no son obligatorias');
    const fecha = bloque.querySelector('input[type="date"]') as HTMLInputElement;
    const nota = bloque.querySelectorAll('input[type="text"], input:not([type])')[0] as HTMLInputElement;
    await escribir(fecha, '2026-07-25');
    await escribir(nota, 'Correo certificado 472, guía 88');
    await act(async () =>
      (document.querySelector('[data-testid="registrar-constancia-2026-08-21"]') as HTMLButtonElement).click(),
    );

    expect(api.registrarConstancia).toHaveBeenCalledWith('c1', '2026-08-21', {
      medio: 'FISICO',
      fecha: '2026-07-25',
      nota: 'Correo certificado 472, guía 88',
      soporte: null,
    });
  });

  it('la constancia con soporte lo deja abrir después', async () => {
    api.incrementos.mockResolvedValue({
      uso: 'VIVIENDA',
      tasaAnualPactadaPct: null,
      aniversarios: [
        {
          ...aniversario,
          carta: {
            estado: 'ENVIADA',
            contenido: 'x',
            generadaAt: null,
            revisadaAt: null,
            enviadaAt: '2026-07-25T17:00:00.000Z',
            medio: 'FISICO',
            soporteNombre: 'guia-472-88.pdf',
          },
        },
      ],
      disponible: true,
      envioHabilitado: true,
    });
    api.soporteDeLaConstancia.mockResolvedValue({ url: 'https://firmada/guia.pdf', nombre: 'guia-472-88.pdf' });
    await montar(<IncrementosDelContrato contractId="c1" puedeEditar />);
    const enlace = document.querySelector('[data-testid="ver-soporte-constancia-2026-08-21"]')!;
    expect(enlace.textContent).toContain('guia-472-88.pdf');
    await act(async () => (enlace as HTMLButtonElement).click());
    expect(api.soporteDeLaConstancia).toHaveBeenCalledWith('c1', '2026-08-21');
  });

  it('sin la migración de la constancia lo dice; la carta igual se puede ver (el cajón no deja enviarla)', async () => {
    api.incrementos.mockResolvedValue({
      uso: 'VIVIENDA',
      tasaAnualPactadaPct: null,
      aniversarios: [{ ...aniversario, carta: { estado: 'REVISADA', contenido: 'x', generadaAt: null, revisadaAt: null, enviadaAt: null } }],
      disponible: true,
      envioHabilitado: false,
    });
    await montar(<IncrementosDelContrato contractId="c1" puedeEditar />);
    const ver = document.querySelector('[data-testid="enviar-carta-2026-08-21"]') as HTMLButtonElement;
    expect(ver.disabled).toBe(false);
    expect(document.body.textContent).toContain('Falta una actualización de la base para enviar');
    // «Se entregó por otro medio» sí queda muerto: también necesita la migración.
    const otroMedio = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Se entregó por otro medio') as HTMLButtonElement;
    expect(otroMedio.disabled).toBe(true);
  });

  it('local comercial: guarda la tasa pactada', async () => {
    const comercial = {
      uso: 'COMERCIAL',
      tasaAnualPactadaPct: null,
      aniversarios: [{ ...aniversario, origen: null, porcentaje: null, canonNuevoCop: 1_000_000, motivo: 'Local comercial sin incremento digitado ni tasa pactada: el canon no sube.' }],
      disponible: true,
      envioHabilitado: false,
    };
    api.incrementos.mockResolvedValue(comercial);
    api.fijarTasaAnual.mockResolvedValue({ ...comercial, tasaAnualPactadaPct: 6 });
    await montar(<IncrementosDelContrato contractId="c1" puedeEditar />);
    const input = document.querySelector('[data-testid="tasa-pactada"]') as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '6');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const guardar = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Guardar tasa')!;
    await act(async () => guardar.click());
    expect(api.fijarTasaAnual).toHaveBeenCalledWith('c1', 6);
  });
});

describe('<RenovarContratoVencido> (17-09)', () => {
  it('ofrece las dos salidas y renueva por el término inicial', async () => {
    api.vencidos.mockResolvedValue({
      cuantos: 1,
      cuantosSinRenovacion: 1,
      aviso: null,
      contratos: [{ id: 'c1', endDate: '2026-08-20', renovarPorTerminoInicialHasta: '2027-08-20' }],
    });
    api.prorroga.mockResolvedValue({ accion: 'ALERTA_AVISO_DE_NO_RENOVACION' });
    api.extender.mockResolvedValue({ contractId: 'c1', modo: 'TERMINO_INICIAL', finAnterior: '2026-08-20', finNuevo: '2027-08-20' });
    const onRenovado = vi.fn();
    await montar(<RenovarContratoVencido contractId="c1" onRenovado={onRenovado} />);
    expect(document.body.textContent).toContain('con aviso de no renovación');
    const porDias = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Renovar por los días ocupados') as HTMLButtonElement;
    expect(porDias.disabled).toBe(true);
    const termino = [...document.querySelectorAll('button')].find((b) => b.textContent?.startsWith('Renovar por el término inicial'))!;
    await act(async () => termino.click());
    expect(api.extender).toHaveBeenCalledWith('c1', { modo: 'TERMINO_INICIAL' });
    expect(onRenovado).toHaveBeenCalled();
  });

  it('🔴 D5: vencido SIN aviso de no renovación no ofrece renovar (se prorroga)', async () => {
    api.vencidos.mockResolvedValue({
      cuantos: 1,
      cuantosSinRenovacion: 1,
      aviso: null,
      contratos: [{ id: 'c1', endDate: '2026-08-20', renovarPorTerminoInicialHasta: '2027-08-20' }],
    });
    api.prorroga.mockResolvedValue({ accion: 'PRORROGAR' });
    await montar(<RenovarContratoVencido contractId="c1" onRenovado={() => {}} />);
    expect(document.querySelector('[data-testid="renovar-contrato-vencido"]')).toBeNull();
  });

  it('un contrato que no está vencido no muestra nada', async () => {
    api.prorroga.mockResolvedValue({ accion: 'NO_VENCIDO' });
    api.vencidos.mockResolvedValue({ cuantos: 0, cuantosSinRenovacion: 0, aviso: null, contratos: [] });
    await montar(<RenovarContratoVencido contractId="c1" onRenovado={() => {}} />);
    expect(document.querySelector('[data-testid="renovar-contrato-vencido"]')).toBeNull();
  });
});
