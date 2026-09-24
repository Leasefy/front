/**
 * 🔴 Repartir la plata del propietario entre varias cuentas, desde el cambio
 * controlado de cuenta (22-09).
 *
 * «Mi dinero me lo ponen, ejemplo, el 50 % en Bancolombia, otro 20 % en Nubank
 * y otro 30 % en Banco de Occidente» (Nico).
 *
 * Lo que fija: el botón no se prende hasta que los porcentajes sumen 100, y
 * mientras tanto la pantalla dice cuánto falta; lo que sale al back es el
 * reparto entero; sin la migración, «Repartido en varias» está apagado con el
 * porqué; y el reparto vigente se ve en la tarjeta.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({
  cambiosDeCuenta: vi.fn(),
  solicitarCambioDeCuenta: vi.fn(),
  archivoDelCambio: vi.fn(),
}));

vi.mock('@/lib/api/mandato.service', () => ({ mandatoApi: h }));
vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));
vi.mock('@/lib/hooks/usePermissions', () => ({ usePermissions: () => ({ isAdmin: true }) }));
/*
 * El traductor con el es.json REAL: una clave que falta sale cruda y la prueba
 * la ve. Doblar `t` para que devuelva la clave hace que «clave» y «texto» sean
 * lo mismo del lado de la prueba.
 */
vi.mock('@/lib/i18n', async () => {
  const es = (await import('@/lib/i18n/locales/es.json')).default as Record<string, unknown>;
  const t = (clave: string, params: Record<string, string | number> = {}) => {
    const valor = clave.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], es);
    if (typeof valor !== 'string') return clave;
    return valor.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(params[k] ?? ''));
  };
  return { useI18n: () => ({ t, locale: 'es' }) };
});

import { CambioDeCuentaBancaria } from './CambioDeCuentaBancaria';

const FICHA = {
  bankName: 'Bancolombia',
  bankAccountType: 'Ahorros',
  bankAccountNumber: '0012344521',
  bankAccountHolder: null,
  bankAccountHolderDocument: null,
  bankAccountHolderDocumentType: null,
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  h.cambiosDeCuenta.mockReset();
  h.solicitarCambioDeCuenta.mockReset().mockResolvedValue({
    cambio: { envioEstado: 'SIMULADO', destinoEnmascarado: null },
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const porTestId = (id: string) => document.body.querySelector<HTMLElement>(`[data-testid="${id}"]`);

async function pintar() {
  await act(async () => {
    root.render(
      <CambioDeCuentaBancaria
        propietarioId="p1"
        propietario={{ nombre: 'Jorge Restrepo', documento: '71234567' }}
        tieneCuenta
        puedeEditar
        onCuentaCambiada={() => {}}
      />,
    );
  });
}

async function clic(el: HTMLElement | null) {
  if (!el) throw new Error('no existe el elemento');
  await act(async () => {
    el.click();
  });
}

async function escribir(el: HTMLInputElement | HTMLSelectElement | null, valor: string) {
  if (!el) throw new Error('no existe el campo');
  await act(async () => {
    const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, valor);
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  });
}

async function adjuntar(testId = 'archivo-certificacion', nombre = 'certificaciones.pdf') {
  const input = document.body.querySelector<HTMLInputElement>(`[data-testid="${testId}"]`);
  if (!input) throw new Error(`no existe ${testId}`);
  const archivo = new File(['%PDF'], nombre, { type: 'application/pdf' });
  await act(async () => {
    Object.defineProperty(input, 'files', { value: [archivo], configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

const campo = <T extends HTMLElement>(id: string) => document.body.querySelector<T>(`#${id}`);

describe('repartir en varias cuentas', () => {
  it('el botón espera a que sumen 100 y dice cuánto falta; lo que sale es el reparto entero', async () => {
    h.cambiosDeCuenta.mockResolvedValue({
      disponible: true,
      motivo: null,
      cambios: [],
      cuentasVigentes: [{ ...FICHA, porcentaje: 100 }],
      repartoDisponible: true,
      motivoDelReparto: null,
    });
    await pintar();
    await clic(porTestId('pedir-cambio-de-cuenta'));
    await clic(porTestId('modo-varias-cuentas'));

    // La cuenta 1 arranca con la de la ficha; la 2, vacía.
    expect(campo<HTMLSelectElement>('reparto-0-banco')?.value).toBe('bancolombia');
    expect(campo<HTMLInputElement>('reparto-0-numero')?.value).toBe('0012344521');

    await escribir(campo('reparto-0-porcentaje'), '50');
    await escribir(campo('reparto-1-banco'), 'nu');
    await escribir(campo('reparto-1-numero'), '77001234');
    await escribir(campo('reparto-1-porcentaje'), '20');
    await adjuntar('certificacion-cuenta-1', 'nubank.pdf');

    expect(porTestId('suma-del-reparto')?.textContent).toBe('Los porcentajes suman 70 %: falta repartir 30 %.');
    expect((porTestId('enviar-cambio') as HTMLButtonElement).disabled).toBe(true);

    await clic(porTestId('agregar-cuenta-al-reparto'));
    await escribir(campo('reparto-2-banco'), 'occidente');
    await escribir(campo('reparto-2-numero'), '990001234');
    await escribir(campo('reparto-2-porcentaje'), '30');

    expect(porTestId('suma-del-reparto')?.textContent).toBe('Suman 100 %.');
    // 🔴 23-09: suma 100, pero a Occidente le falta SU certificación.
    expect((porTestId('enviar-cambio') as HTMLButtonElement).disabled).toBe(true);
    await adjuntar('certificacion-cuenta-2', 'occidente.pdf');
    expect((porTestId('enviar-cambio') as HTMLButtonElement).disabled).toBe(false);

    await clic(porTestId('enviar-cambio'));
    expect(h.solicitarCambioDeCuenta).toHaveBeenCalledTimes(1);
    const [propietarioId, solicitud] = h.solicitarCambioDeCuenta.mock.calls[0];
    expect(propietarioId).toBe('p1');
    expect(solicitud.reparto).toEqual([
      expect.objectContaining({ bankCode: 'BANCOLOMBIA', bankAccountNumber: '0012344521', porcentaje: 50 }),
      expect.objectContaining({ bankCode: 'NU_COLOMBIA', bankAccountNumber: '77001234', porcentaje: 20 }),
      expect.objectContaining({ bankCode: 'BANCO_OCCIDENTE', bankAccountNumber: '990001234', porcentaje: 30 }),
    ]);
    // Una sola cuenta por arriba NO viaja: manda el reparto.
    expect(solicitud.bankAccountNumber).toBeUndefined();
  });

  it('sin la migración del reparto, «Repartido en varias» está apagado y dice por qué', async () => {
    h.cambiosDeCuenta.mockResolvedValue({
      disponible: true,
      motivo: null,
      cambios: [],
      cuentasVigentes: [{ ...FICHA, porcentaje: 100 }],
      repartoDisponible: false,
      motivoDelReparto: 'falta aplicar la migración 20260922220000_reparto_de_cuentas.',
    });
    await pintar();
    await clic(porTestId('pedir-cambio-de-cuenta'));
    expect((porTestId('modo-varias-cuentas') as HTMLButtonElement).disabled).toBe(true);
    expect(document.body.textContent).toContain('20260922220000_reparto_de_cuentas');
  });

  it('con reparto vigente, la tarjeta lo muestra y el formulario arranca con sus cuentas', async () => {
    h.cambiosDeCuenta.mockResolvedValue({
      disponible: true,
      motivo: null,
      cambios: [],
      cuentasVigentes: [
        { ...FICHA, porcentaje: 60 },
        { ...FICHA, bankName: 'Banco de Occidente', bankAccountNumber: '990001234', porcentaje: 40 },
      ],
      repartoDisponible: true,
      motivoDelReparto: null,
    });
    await pintar();
    const vigente = porTestId('reparto-vigente');
    expect(vigente?.textContent).toContain('Recibe en 2 cuentas');
    expect(vigente?.textContent).toContain('60 % · Bancolombia · Ahorros · •••• 4521');

    await clic(porTestId('pedir-cambio-de-cuenta'));
    expect(campo<HTMLInputElement>('reparto-0-porcentaje')?.value).toBe('60');
    expect(campo<HTMLSelectElement>('reparto-1-banco')?.value).toBe('occidente');
    expect(porTestId('suma-del-reparto')?.textContent).toBe('Suman 100 %.');
  });
});

/**
 * 🔴 23-09, Nico: «que el reparto pida una certificación por cada cuenta
 * nueva». Antes había UN campo de archivo para todo el reparto («en un solo
 * archivo»), y un banco certifica UNA cuenta.
 */
describe('una certificación por cada cuenta nueva', () => {
  const SIN_CAMBIOS = {
    disponible: true,
    motivo: null,
    cambios: [],
    cuentasVigentes: [{ ...FICHA, porcentaje: 100 }],
    repartoDisponible: true,
    motivoDelReparto: null,
  };

  async function repartoDeTres() {
    h.cambiosDeCuenta.mockResolvedValue(SIN_CAMBIOS);
    await pintar();
    await clic(porTestId('pedir-cambio-de-cuenta'));
    await clic(porTestId('modo-varias-cuentas'));
    await escribir(campo('reparto-0-porcentaje'), '50');
    await escribir(campo('reparto-1-banco'), 'nu');
    await escribir(campo('reparto-1-numero'), '77001234');
    await escribir(campo('reparto-1-porcentaje'), '20');
    await clic(porTestId('agregar-cuenta-al-reparto'));
    await escribir(campo('reparto-2-banco'), 'occidente');
    await escribir(campo('reparto-2-numero'), '990001234');
    await escribir(campo('reparto-2-porcentaje'), '30');
  }

  it('la cuenta que ya recibe dice «ya certificada»; cada nueva pide la suya y el botón dice cuáles faltan', async () => {
    await repartoDeTres();
    expect(porTestId('archivo-certificacion')).toBeNull();
    expect(porTestId('cuenta-ya-certificada-0')?.textContent).toContain('Ya certificada');
    // Para la que ya recibe, el archivo es opcional (por si la anterior venció).
    expect(document.body.textContent).toContain('¿La certificación venció? Adjunta una nueva (opcional)');
    expect(porTestId('certificacion-cuenta-1')).not.toBeNull();
    expect(porTestId('certificacion-cuenta-2')).not.toBeNull();

    expect((porTestId('enviar-cambio') as HTMLButtonElement).disabled).toBe(true);
    // 23-09 (QA): decía «de la cuenta 2, la cuenta 3».
    expect(porTestId('faltan-certificaciones')?.textContent).toBe(
      'Falta la certificación de las cuentas 2 y 3: cada banco certifica una cuenta.',
    );
    await adjuntar('certificacion-cuenta-1', 'nubank.pdf');
    expect(porTestId('faltan-certificaciones')?.textContent).toBe(
      'Falta la certificación de la cuenta 3: cada banco certifica una cuenta.',
    );
    await adjuntar('certificacion-cuenta-2', 'occidente.pdf');
    expect(porTestId('faltan-certificaciones')).toBeNull();

    await clic(porTestId('enviar-cambio'));
    const [, solicitud] = h.solicitarCambioDeCuenta.mock.calls[0];
    expect(solicitud.certificacion).toBeUndefined();
    expect((solicitud.certificacionesPorCuenta as (File | null)[]).map((a) => a?.name ?? null)).toEqual([
      null,
      'nubank.pdf',
      'occidente.pdf',
    ]);
  });

  it('quitar una cuenta no le pasa su certificación a la siguiente', async () => {
    await repartoDeTres();
    await adjuntar('certificacion-cuenta-1', 'nubank.pdf');
    await adjuntar('certificacion-cuenta-2', 'occidente.pdf');
    // Quita Nubank: Occidente pasa a ser la cuenta 2, CON su archivo.
    await clic(document.body.querySelector<HTMLElement>('[aria-label="Quitar la cuenta 2"]'));
    await escribir(campo('reparto-0-porcentaje'), '70');
    await clic(porTestId('enviar-cambio'));
    const [, solicitud] = h.solicitarCambioDeCuenta.mock.calls[0];
    expect(solicitud.reparto.map((c: { bankCode: string }) => c.bankCode)).toEqual(['BANCOLOMBIA', 'BANCO_OCCIDENTE']);
    expect((solicitud.certificacionesPorCuenta as (File | null)[]).map((a) => a?.name ?? null)).toEqual([
      null,
      'occidente.pdf',
    ]);
  });

  it('🔴 a la cuenta que ya recibe se le puede adjuntar una certificación nueva, y viaja en su posición', async () => {
    await repartoDeTres();
    await adjuntar('certificacion-cuenta-0', 'bancolombia-2026.pdf');
    await adjuntar('certificacion-cuenta-1', 'nubank.pdf');
    await adjuntar('certificacion-cuenta-2', 'occidente.pdf');
    await clic(porTestId('enviar-cambio'));
    const [, solicitud] = h.solicitarCambioDeCuenta.mock.calls[0];
    expect((solicitud.certificacionesPorCuenta as (File | null)[]).map((a) => a?.name ?? null)).toEqual([
      'bancolombia-2026.pdf',
      'nubank.pdf',
      'occidente.pdf',
    ]);
  });

  it('🔴 una cuenta que YA recibe pero está a nombre de otra persona sí pide su certificación', async () => {
    h.cambiosDeCuenta.mockResolvedValue({
      ...SIN_CAMBIOS,
      cuentasVigentes: [
        { ...FICHA, porcentaje: 60 },
        {
          ...FICHA,
          bankName: 'Banco de Occidente',
          bankAccountNumber: '990001234',
          bankAccountHolder: 'Carlos Restrepo',
          bankAccountHolderDocument: '80012345',
          bankAccountHolderDocumentType: 'CC',
          porcentaje: 40,
        },
      ],
    });
    await pintar();
    await clic(porTestId('pedir-cambio-de-cuenta'));
    await escribir(campo('reparto-0-porcentaje'), '50');
    await escribir(campo('reparto-1-porcentaje'), '50');
    expect(porTestId('suma-del-reparto')?.textContent).toBe('Suman 100 %.');
    expect(porTestId('cuenta-ya-certificada-0')).not.toBeNull();
    expect(porTestId('cuenta-ya-certificada-1')).toBeNull();
    expect(document.body.textContent).toContain(
      'Certificación bancaria de esta cuenta (obligatoria: está a nombre de otra persona)',
    );
    expect((porTestId('enviar-cambio') as HTMLButtonElement).disabled).toBe(true);
    expect(porTestId('faltan-certificaciones')?.textContent).toBe(
      'Falta la certificación de la cuenta 2: cada banco certifica una cuenta.',
    );
    await adjuntar('certificacion-cuenta-1', 'occidente.pdf');
    expect((porTestId('enviar-cambio') as HTMLButtonElement).disabled).toBe(false);
  });

  const CUENTA_NUEVA = {
    ...FICHA,
    bankAccountNumber: '0012344521',
    reparto: [
      { ...FICHA, porcentaje: 50, certificacion: null },
      {
        ...FICHA,
        bankName: 'Nu Colombia',
        bankAccountNumber: '77001234',
        porcentaje: 50,
        certificacion: { nombre: 'nubank.pdf', tipo: 'application/pdf' },
      },
    ],
  };
  const CAMBIO = {
    id: 'c1',
    propietarioId: 'p1',
    estado: 'CONFIRMADO',
    cuentaAnterior: { ...FICHA, reparto: [] },
    cuentaNueva: CUENTA_NUEVA,
    certificacionNombre: 'nubank.pdf',
    canal: 'CORREO',
    destinoEnmascarado: null,
    envioEstado: 'SIMULADO',
    expiraAt: '2026-09-26T00:00:00.000Z',
    intentos: 0,
    confirmadoAt: '2026-09-23T00:00:00.000Z',
    confirmadoPor: 'CODIGO',
    aprobadoAt: null,
    aprobadoPorUserId: null,
    tieneSoporteDeAprobacion: false,
    cerradoAt: null,
    motivoDeCierre: null,
    solicitadoPorUserId: null,
    createdAt: '2026-09-23T00:00:00.000Z',
    retieneElGiro: true,
  };

  it('el cambio y la aprobación dejan bajar la certificación de CADA cuenta', async () => {
    const abrir = vi.spyOn(window, 'open').mockImplementation(() => null);
    h.archivoDelCambio.mockResolvedValue({ url: 'https://firmado.test/nubank.pdf', nombre: 'nubank.pdf' });
    h.cambiosDeCuenta.mockResolvedValue({ ...SIN_CAMBIOS, cambios: [CAMBIO] });
    await pintar();

    // Sin el botón único: cada certificación va al lado de su cuenta.
    expect(porTestId('abrir-certificacion')).toBeNull();
    expect(porTestId('ya-certificada-0')?.textContent).toBe('ya certificada');
    await clic(porTestId('abrir-certificacion-1'));
    expect(h.archivoDelCambio).toHaveBeenCalledWith('p1', 'c1', 1);
    expect(abrir).toHaveBeenCalledWith('https://firmado.test/nubank.pdf', '_blank', 'noopener');

    await clic(porTestId('aprobar-cambio-de-cuenta'));
    const aRevisar = porTestId('certificaciones-a-revisar');
    expect(aRevisar?.textContent).toContain('Certificaciones del reparto');
    await clic(aRevisar!.querySelector<HTMLElement>('[data-testid="abrir-certificacion-1"]'));
    expect(h.archivoDelCambio).toHaveBeenCalledTimes(2);
    abrir.mockRestore();
  });

  it('🔴 cada cuenta del reparto dice a nombre de quién está, en la tarjeta y al aprobar', async () => {
    // 23-09 (QA): «A nombre de: El propietario» sobre un reparto con una
    // cuenta de María Fernanda Ruiz (PPT): la línea miraba sólo la principal.
    const DE_MARIA = {
      ...FICHA,
      bankName: 'BBVA Colombia',
      bankAccountNumber: '001300987654',
      bankAccountHolder: 'María Fernanda Ruiz',
      bankAccountHolderDocument: '5123456',
      bankAccountHolderDocumentType: 'PPT',
      porcentaje: 50,
      certificacion: { nombre: 'maria.pdf', tipo: 'application/pdf' },
    };
    h.cambiosDeCuenta.mockResolvedValue({
      ...SIN_CAMBIOS,
      cambios: [{ ...CAMBIO, cuentaNueva: { ...CUENTA_NUEVA, reparto: [CUENTA_NUEVA.reparto[0], DE_MARIA] } }],
    });
    await pintar();

    expect(porTestId('titular-de-la-cuenta-0')?.textContent).toBe('A nombre de Jorge Restrepo, el propietario');
    expect(porTestId('titular-de-la-cuenta-1')?.textContent).toBe('A nombre de María Fernanda Ruiz · PPT 5123456');
    // La línea única para todo el reparto no vuelve.
    expect(porTestId('titular-del-cambio')).toBeNull();

    await clic(porTestId('aprobar-cambio-de-cuenta'));
    const aRevisar = porTestId('certificaciones-a-revisar');
    expect(aRevisar?.textContent).toContain('A nombre de María Fernanda Ruiz · PPT 5123456');
    expect(aRevisar?.textContent).toContain('A nombre de Jorge Restrepo, el propietario');
  });

  it('una solicitud vieja (una certificación para todo el reparto) sigue con su botón único', async () => {
    h.cambiosDeCuenta.mockResolvedValue({
      ...SIN_CAMBIOS,
      cambios: [
        {
          ...CAMBIO,
          cuentaNueva: {
            ...CUENTA_NUEVA,
            reparto: CUENTA_NUEVA.reparto.map(({ certificacion: _c, ...c }) => c),
          },
        },
      ],
    });
    await pintar();
    expect(porTestId('abrir-certificacion')).not.toBeNull();
    expect(porTestId('abrir-certificacion-1')).toBeNull();
  });

  /*
   * 🔴 Auditoría de seguridad (23-09): quien pidió el cambio no lo aprueba si
   * la inmobiliaria tiene otro administrador. El back lo decide y lo dice en
   * `aprobacion`; la pantalla apaga «Aprobar» con ESE porqué (nunca un botón
   * vivo que responde 403, nunca un botón muerto sin explicación).
   */
  it('🔴 a quien pidió el cambio, «Aprobar» le sale apagado con el porqué del back', async () => {
    const motivo =
      'Tú pediste este cambio de cuenta: lo tiene que aprobar otro administrador de la inmobiliaria. Así una sola persona no puede desviar los giros de un propietario.';
    h.cambiosDeCuenta.mockResolvedValue({
      ...SIN_CAMBIOS,
      cambios: [
        {
          ...CAMBIO,
          aprobacion: { puede: false, codigo: 'APROBADOR_DISTINTO_AL_SOLICITANTE', motivo, mismaPersona: true },
        },
      ],
    });
    await pintar();

    const aprobar = porTestId('aprobar-cambio-de-cuenta') as HTMLButtonElement;
    expect(aprobar.disabled).toBe(true);
    expect(porTestId('por-que-no-aprueba')?.textContent).toBe(motivo);
    await clic(aprobar);
    expect(porTestId('certificaciones-a-revisar')).toBeNull();
  });

  it('con un solo administrador puede aprobar lo que pidió, y la pantalla le dice que queda marcado', async () => {
    h.cambiosDeCuenta.mockResolvedValue({
      ...SIN_CAMBIOS,
      cambios: [{ ...CAMBIO, aprobacion: { puede: true, codigo: null, motivo: null, mismaPersona: true } }],
    });
    await pintar();

    expect((porTestId('aprobar-cambio-de-cuenta') as HTMLButtonElement).disabled).toBe(false);
    expect(porTestId('aprueba-quien-lo-pidio')?.textContent).toContain('queda marcado en la bitácora');
    expect(porTestId('por-que-no-aprueba')).toBeNull();
  });
});

/**
 * 🔴 23-09, QA: con «De otra persona» y sus datos vacíos, «Pedir el reparto»
 * estaba ENCENDIDO; el primer clic marcaba tipo y nombre, y el número faltante
 * salía recién en el segundo. Ahora el botón se apaga y dice todo lo que falta
 * de una vez, igual que con las certificaciones.
 */
describe('lo que falta, todo de una vez y con el botón apagado', () => {
  it('otra persona sin datos: el botón se apaga y nombra tipo, número y nombre juntos', async () => {
    h.cambiosDeCuenta.mockResolvedValue({
      disponible: true,
      motivo: null,
      cambios: [],
      cuentasVigentes: [{ ...FICHA, porcentaje: 100 }],
      repartoDisponible: true,
      motivoDelReparto: null,
    });
    await pintar();
    await clic(porTestId('pedir-cambio-de-cuenta'));
    await clic(porTestId('modo-varias-cuentas'));
    await escribir(campo('reparto-0-porcentaje'), '50');
    await escribir(campo('reparto-1-banco'), 'bbva');
    await escribir(campo('reparto-1-numero'), '001300987654');
    await escribir(campo('reparto-1-porcentaje'), '50');
    await adjuntar('certificacion-cuenta-1', 'maria.pdf');
    expect((porTestId('enviar-cambio') as HTMLButtonElement).disabled).toBe(false);

    const cuenta2 = porTestId('cuenta-del-reparto-1')!;
    await clic(cuenta2.querySelector<HTMLElement>('[data-testid="titular-tercero"]'));

    expect((porTestId('enviar-cambio') as HTMLButtonElement).disabled).toBe(true);
    expect(porTestId('faltan-datos')?.textContent).toBe(
      'Para pedirlo, completa en la cuenta 2, el tipo de documento del titular, el número de documento del titular y el nombre del titular.',
    );
    // Lo vacío no se pinta en rojo antes de tiempo: lo dice la frase.
    expect(cuenta2.querySelector('[role="alert"]')).toBeNull();

    await escribir(campo('reparto-1-titular-nombre'), 'María Fernanda Ruiz');
    await escribir(campo('reparto-1-titular-numero'), '5123456');
    expect(porTestId('faltan-datos')?.textContent).toBe(
      'Para pedirlo, completa en la cuenta 2, el tipo de documento del titular.',
    );
    expect((porTestId('enviar-cambio') as HTMLButtonElement).disabled).toBe(true);
  });

  it('una cuenta sola: sin banco, número ni certificación, el botón dice las tres cosas', async () => {
    h.cambiosDeCuenta.mockResolvedValue({
      disponible: true,
      motivo: null,
      cambios: [],
      cuentasVigentes: [],
      repartoDisponible: true,
      motivoDelReparto: null,
    });
    await pintar();
    await clic(porTestId('pedir-cambio-de-cuenta'));
    expect((porTestId('enviar-cambio') as HTMLButtonElement).disabled).toBe(true);
    expect(porTestId('faltan-datos')?.textContent).toBe(
      'Para pedirlo, completa el banco, el número de la cuenta y la certificación bancaria.',
    );
  });
});

/**
 * 🔴 23-09, QA: el giro de la inmobiliaria ofrecía 25 bancos y el cambio de
 * cuenta del propietario 14. Un propietario recibe en cualquier banco.
 */
describe('el catálogo completo de bancos', () => {
  it('se puede pedir el cambio a un banco que antes no estaba (Banco Agrario)', async () => {
    h.cambiosDeCuenta.mockResolvedValue({
      disponible: true,
      motivo: null,
      cambios: [],
      cuentasVigentes: [],
      repartoDisponible: true,
      motivoDelReparto: null,
    });
    await pintar();
    await clic(porTestId('pedir-cambio-de-cuenta'));
    const banco = campo<HTMLSelectElement>('banco-nuevo')!;
    const nombres = Array.from(banco.options).map((o) => o.textContent);
    for (const n of ['Banco Agrario', 'Lulo Bank', 'Banco Santander', 'Nu Colombia (Nubank)', 'Banco Pichincha']) {
      expect(nombres).toContain(n);
    }
    await escribir(banco, 'agrario');
    await escribir(campo('numero-nuevo'), '4000123456');
    await adjuntar();
    expect(porTestId('faltan-datos')).toBeNull();
    await clic(porTestId('enviar-cambio'));
    const [, solicitud] = h.solicitarCambioDeCuenta.mock.calls[0];
    expect(solicitud.bankCode).toBe('BANCO_AGRARIO');
  });
});
