import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

const agentFetch = vi.fn();
vi.mock('@/lib/api/agent-fetch', () => ({ agentFetch: (...a: unknown[]) => agentFetch(...a) }));
const subirAdjunto = vi.fn();
vi.mock('@/lib/api/pqrs.service', () => ({ pqrsApi: { subirAdjunto: (...a: unknown[]) => subirAdjunto(...a) } }));

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
const bajarExtracto = vi.fn();
const pedirCambioDeCuenta = vi.fn();
const bajarCertificadoDeIngresos = vi.fn();
vi.mock('@/lib/api/portal-del-propietario.service', () => ({
  portalDelPropietarioApi: {
    bajarExtracto: (...a: unknown[]) => bajarExtracto(...a),
    pedirCambioDeCuenta: (...a: unknown[]) => pedirCambioDeCuenta(...a),
    bajarCertificadoDeIngresos: (...a: unknown[]) => bajarCertificadoDeIngresos(...a),
  },
}));
const pdfDelCertificado = vi.fn();
vi.mock('@/lib/api/lease-documents.service', () => ({ leaseDocumentsApi: { pdf: (...a: unknown[]) => pdfDelCertificado(...a) } }));
const cabecerasDeLaCuenta = vi.fn((): Record<string, string> => ({}));
vi.mock('@/lib/auth/cuenta-activa', async (original) => ({
  ...(await original<typeof import('@/lib/auth/cuenta-activa')>()),
  cabecerasDeLaCuenta: () => cabecerasDeLaCuenta(),
}));

import { ChatDelPortal, navegacionDelPago } from './ChatDelPortal';

const json = (status: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json' } });

const TARJETA = {
  accion: 'radicar_pqrs',
  titulo: 'Radicar una solicitud',
  detalle: 'Le llega a tu inmobiliaria con lo que escribiste: «se dañó la ducha».',
  boton: 'Sí, hazlo',
  datos: { tipo: 'SOLICITUD', asunto: 'Daño reportado desde el chat del portal', descripcion: 'se dañó la ducha' },
};

void React;
let container: HTMLDivElement;
let root: Root;
const texto = () => document.body.textContent ?? '';
const boton = (nombre: string) =>
  [...document.body.querySelectorAll('button')].find(
    (b) => (b.getAttribute('aria-label') ?? b.textContent?.trim()) === nombre,
  ) ?? null;
async function hasta<T>(fn: () => T | null | undefined | false): Promise<T> {
  for (let i = 0; i < 100; i++) {
    const r = fn();
    if (r) return r;
    await act(async () => {
      await new Promise((ok) => setTimeout(ok, 10));
    });
  }
  throw new Error('no apareció');
}
async function clic(nombre: string) {
  const b = await hasta(() => boton(nombre));
  await act(async () => {
    b.click();
  });
}
async function escribir(valor: string) {
  const el = document.body.querySelector('textarea[aria-label="Escríbele a Ori"]') as HTMLTextAreaElement;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(el, valor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function abrir(portal: 'inquilino' | 'propietario' | 'postulante' = 'inquilino') {
  await act(async () => {
    root.render(<ChatDelPortal portal={portal} />);
  });
  await clic('Pregúntale a Ori');
}

describe('ChatDelPortal — Ori dentro del portal, sin modelo', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'http://micro.test/');
    agentFetch.mockReset();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllEnvs();
  });

  it('una sugerencia es un mensaje de la persona: pregunta al micro con su portal y pinta la respuesta', async () => {
    agentFetch.mockResolvedValueOnce(json(200, { pedido: 'cuanto_debo', texto: 'Debes **$ 1.200.000**.', tarjeta: null }));
    await abrir();
    await clic('¿Cuánto debo?');
    await hasta(() => texto().includes('1.200.000'));
    const [url, init] = agentFetch.mock.calls[0];
    expect(url).toBe('http://micro.test/api/portal/chat/pedido');
    expect(JSON.parse(init.body)).toEqual({ texto: '¿Cuánto debo?', portal: 'inquilino' });
  });

  it('la tarjeta no hace nada sin el clic; «Sí, hazlo» manda accion y datos a /hacer y deja el resultado', async () => {
    agentFetch
      .mockResolvedValueOnce(json(200, { pedido: 'radicar_pqrs', texto: 'Te dejo lista la solicitud.', tarjeta: TARJETA }))
      .mockResolvedValueOnce(json(200, { hecho: true, texto: 'Listo, quedó radicada con el radicado PQRS-12.' }));
    await abrir();
    await escribir('se dañó la ducha');
    await clic('Enviar');
    await hasta(() => texto().includes('Te dejo lista la solicitud.'));
    expect(agentFetch).toHaveBeenCalledTimes(1);
    await clic('Sí, hazlo');
    await hasta(() => texto().includes('PQRS-12'));
    const [url, init] = agentFetch.mock.calls[1];
    expect(url).toBe('http://micro.test/api/portal/chat/hacer');
    expect(JSON.parse(init.body)).toEqual({ accion: 'radicar_pqrs', datos: TARJETA.datos });
    expect(boton('Sí, hazlo')).toBeNull();
  });

  it('«Ahora no» cierra la tarjeta sin llamar a nadie', async () => {
    agentFetch.mockResolvedValueOnce(json(200, { pedido: 'radicar_pqrs', texto: 'Te dejo lista la solicitud.', tarjeta: TARJETA }));
    await abrir();
    await escribir('tengo una gotera');
    await clic('Enviar');
    await clic('Ahora no');
    expect(texto()).toContain('No se hizo');
    expect(agentFetch).toHaveBeenCalledTimes(1);
  });

  it('sesión vencida o micro caído: lo dice en palabras, nunca un código', async () => {
    agentFetch.mockResolvedValueOnce(json(401, { error: 'unauthorized', code: 'SESION_NO_VERIFICADA' }));
    await abrir('propietario');
    await clic('¿Cuándo y cuánto me giran?');
    await hasta(() => texto().includes('Tu sesión se venció'));
    agentFetch.mockRejectedValueOnce(new TypeError('fetch failed'));
    await escribir('¿cuándo me giran?');
    await clic('Enviar');
    await hasta(() => texto().includes('No pude responderte'));
    expect(texto()).not.toMatch(/SESION_NO_VERIFICADA|unauthorized/);
  });
  it('«Mándame el link de pago» → «Sí, hazlo» abre la MISMA sesión de Wompi de lo vencido (monto del back), nunca /hacer', async () => {
    const PAGO = {
      accion: 'pagar_en_linea',
      titulo: 'Pagar en línea',
      detalle: 'Pagas $ 2.400.000: 2 cuotas de Cra 43 # 10-20. Con PSE, tarjeta o Nequi.',
      boton: 'Sí, hazlo',
      datos: { leaseId: 'l-1', cuotas: '2' },
    };
    agentFetch.mockResolvedValueOnce(json(200, { pedido: 'link_de_pago', texto: 'Te dejo listo el pago.', tarjeta: PAGO }));
    const fetchCrudo = vi.fn().mockResolvedValue(
      json(200, { publicKey: 'pub_test_x', currency: 'COP', amountInCents: 240000000, reference: 'vencido-9', integrity: 'abc' }),
    );
    vi.stubGlobal('fetch', fetchCrudo);
    const irA = vi.spyOn(navegacionDelPago, 'irA').mockImplementation(() => {});
    await abrir();
    await clic('Mándame el link de pago');
    await clic('Sí, hazlo');
    await hasta(() => irA.mock.calls.length > 0);
    const [ruta, init] = fetchCrudo.mock.calls[0];
    expect(ruta).toBe('/api/inquilino/pagos/vencido/wompi-session');
    expect(JSON.parse(init.body)).toEqual({ leaseId: 'l-1', cuotas: 2 });
    expect(String(irA.mock.calls[0][0])).toContain('reference=vencido-9');
    expect(agentFetch).toHaveBeenCalledTimes(1);
    expect(texto()).toContain('Te llevo a la pasarela');
    vi.unstubAllGlobals();
  });

  it('si la sesión de pago no abre, la tarjeta dice por qué con el texto del back', async () => {
    agentFetch.mockResolvedValueOnce(
      json(200, {
        pedido: 'link_de_pago',
        texto: 'Te dejo listo el pago.',
        tarjeta: { accion: 'pagar_en_linea', titulo: 'Pagar en línea', detalle: 'Pagas $ 900.000.', boton: 'Sí, hazlo', datos: { leaseId: 'l-1', cuotas: '1' } },
      }),
    );
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(409, { statusCode: 409, code: 'PAGO_EN_CURSO', message: 'Ya tienes un pago en verificación.' })));
    await abrir();
    await clic('Mándame el link de pago');
    await clic('Sí, hazlo');
    await hasta(() => texto().includes('Ya tienes un pago en verificación.'));
    expect(texto()).toContain('No salió');
    vi.unstubAllGlobals();
  });
  it('radicada la solicitud, la foto del daño se agrega ahí mismo a ESA solicitud (POST /pqrs/:id/adjuntos)', async () => {
    const id = '7d3f0c2a-1b2c-4d5e-8f90-123456789abc';
    agentFetch
      .mockResolvedValueOnce(json(200, { pedido: 'radicar_pqrs', texto: 'Te dejo lista la solicitud.', tarjeta: TARJETA }))
      .mockResolvedValueOnce(json(200, { hecho: true, texto: 'Listo, quedó radicada con el radicado PQRS-12.', pqrsId: id }));
    subirAdjunto.mockReset().mockResolvedValue({ id: 'a-1' });
    await abrir();
    await escribir('se dañó la ducha');
    await clic('Enviar');
    await clic('Sí, hazlo');
    await clic('Agregar una foto del daño');
    const input = document.body.querySelector('input[type="file"]') as HTMLInputElement;
    const foto = new File(['x'], 'ducha.jpg', { type: 'image/jpeg' });
    Object.defineProperty(input, 'files', { value: [foto], configurable: true });
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await hasta(() => texto().includes('Le agregué a tu solicitud «ducha.jpg».'));
    expect(subirAdjunto).toHaveBeenCalledWith(id, foto);
    expect(boton('Agregar otra foto')).not.toBeNull();
  });

  it('sin la solicitud radicada no se ofrece la foto; un archivo que no sirve se dice sin subirlo', async () => {
    const id = '7d3f0c2a-1b2c-4d5e-8f90-123456789abc';
    agentFetch
      .mockResolvedValueOnce(json(200, { pedido: 'radicar_pqrs', texto: 'Te dejo lista la solicitud.', tarjeta: TARJETA }))
      .mockResolvedValueOnce(json(200, { hecho: true, texto: 'Listo, quedó radicada.', pqrsId: id }));
    subirAdjunto.mockReset();
    await abrir();
    await escribir('se dañó la ducha');
    await clic('Enviar');
    await hasta(() => boton('Sí, hazlo'));
    expect(boton('Agregar una foto del daño')).toBeNull();
    await clic('Sí, hazlo');
    await hasta(() => boton('Agregar una foto del daño'));
    const input = document.body.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [new File(['x'], 'notas.txt', { type: 'text/plain' })], configurable: true });
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await hasta(() => document.body.querySelector('[role="alert"]'));
    expect(subirAdjunto).not.toHaveBeenCalled();
  });

  it('R15: emitido el paz y salvo, se descarga AHÍ MISMO con la sesión de la persona (sin ir a «Mis certificados»)', async () => {
    const documentoId = '9a8b7c6d-1b2c-4d5e-8f90-123456789abc';
    const PAZ_Y_SALVO = {
      accion: 'pedir_certificado',
      titulo: 'Emitir tu paz y salvo',
      detalle: 'Paz y salvo del arriendo de Cra 10 # 20-30.',
      boton: 'Sí, hazlo',
      datos: { contractId: '11111111-1111-4111-8111-111111111111' },
    };
    agentFetch
      .mockResolvedValueOnce(json(200, { pedido: 'certificado', texto: 'Revisé tu estado de cuenta: no te queda nada por pagar.', tarjeta: PAZ_Y_SALVO }))
      .mockResolvedValueOnce(json(200, { hecho: true, texto: 'Listo, tu paz y salvo quedó emitido.', documentoId }));
    pdfDelCertificado.mockReset().mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }));
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() });
    await abrir();
    await escribir('necesito mi paz y salvo');
    await clic('Enviar');
    await hasta(() => boton('Sí, hazlo'));
    expect(boton('Descargar el certificado')).toBeNull();
    await clic('Sí, hazlo');
    await clic('Descargar el certificado');
    await hasta(() => texto().includes('Listo: quedó en tus descargas.'));
    expect(pdfDelCertificado).toHaveBeenCalledWith(documentoId);
    expect(agentFetch).toHaveBeenCalledTimes(2);
  });

  describe('el propietario hace lo suyo desde el chat (29-10)', () => {
    const ID = '00000000-0000-4000-8000-000000000001';
    const EXTRACTO = {
      accion: 'bajar_extracto',
      titulo: 'Extracto de septiembre de 2026',
      detalle: 'Tu giro de Portofino: $ 2.300.000, va en camino.',
      boton: 'Descargar extracto',
      datos: { giroId: ID, mes: '2026-09' },
    };
    const reparacion = (id: string, titulo: string) => ({
      accion: 'decidir_reparacion',
      titulo,
      detalle: 'Apto 301: $ 350.000.',
      boton: 'Sí, hazlo',
      datos: { id, titulo },
      opciones: [
        { accion: 'aprobar_reparacion', boton: 'Aprobar', pideMotivo: false, principal: true },
        { accion: 'rechazar_reparacion', boton: 'Rechazar', pideMotivo: true, principal: false },
        { accion: 'la_hago_yo', boton: 'La hago yo', pideMotivo: false, principal: false },
      ],
    });
    const CUENTA = {
      accion: 'cambiar_cuenta',
      titulo: 'Cambiar la cuenta donde te giran',
      detalle: 'Hoy Portofino te gira a Bancolombia ****1234.',
      boton: 'Abrir el formulario',
      datos: { propietarioId: ID, inmobiliaria: 'Portofino' },
    };
    beforeEach(() => {
      bajarExtracto.mockReset();
      pedirCambioDeCuenta.mockReset();
      cabecerasDeLaCuenta.mockReturnValue({});
    });

    it('«Mándame el extracto» → «Descargar extracto» lo baja con la sesión de la persona, sin /hacer', async () => {
      bajarExtracto.mockResolvedValueOnce(undefined);
      agentFetch.mockResolvedValueOnce(json(200, { pedido: 'extracto', texto: 'Te dejo listo el extracto.', tarjeta: EXTRACTO }));
      await abrir('propietario');
      await clic('Mándame el extracto');
      await hasta(() => texto().includes('Extracto de septiembre de 2026'));
      expect(boton('Ahora no')).toBeNull();
      await clic('Descargar extracto');
      await hasta(() => texto().includes('quedó en tus descargas'));
      expect(bajarExtracto).toHaveBeenCalledWith({ id: ID, mes: '2026-09' });
      expect(agentFetch).toHaveBeenCalledTimes(1);
    });

    it('R16: «Mi certificado de ingresos y retenciones» → «Descargar certificado» baja el PDF de ESE año con su sesión, sin /hacer', async () => {
      bajarCertificadoDeIngresos.mockReset().mockResolvedValueOnce(undefined);
      agentFetch.mockResolvedValueOnce(
        json(200, {
          pedido: 'certificado_de_ingresos',
          texto: 'Tu certificado de ingresos y retenciones de 2025: ingreso bruto por arrendamiento $ 27.600.000.',
          tarjeta: {
            accion: 'bajar_certificado_de_ingresos',
            titulo: 'Certificado de ingresos y retenciones 2025',
            detalle: 'El PDF con el resumen del año, por inmueble y por mes, para tu declaración.',
            boton: 'Descargar certificado',
            datos: { anio: '2025' },
          },
        }),
      );
      await abrir('propietario');
      await clic('Mi certificado de ingresos y retenciones');
      await hasta(() => texto().includes('Certificado de ingresos y retenciones 2025'));
      expect(boton('Ahora no')).toBeNull();
      await clic('Descargar certificado');
      await hasta(() => texto().includes('quedó en tus descargas'));
      expect(bajarCertificadoDeIngresos).toHaveBeenCalledWith(2025);
      expect(agentFetch).toHaveBeenCalledTimes(1);
    });

    it('una tarjeta por reparación; «Rechazar» pide el porqué (opcional) y manda ESA decisión con él', async () => {
      const otro = '00000000-0000-4000-8000-000000000002';
      agentFetch
        .mockResolvedValueOnce(
          json(200, {
            pedido: 'reparaciones',
            texto: 'Tienes 2 reparaciones por aprobar. Nada se decide sin tu clic.',
            tarjeta: reparacion(ID, 'Fuga en el baño'),
            otrasTarjetas: [reparacion(otro, 'Chapa de la cocina')],
          }),
        )
        .mockResolvedValueOnce(json(200, { hecho: true, texto: 'Listo, la rechazaste: no se te descuenta nada.' }));
      await abrir('propietario');
      await clic('¿Qué reparaciones tengo por aprobar?');
      await hasta(() => texto().includes('Chapa de la cocina'));
      expect(document.body.querySelectorAll('[role="region"][data-estado="pendiente"]')).toHaveLength(2);
      expect(agentFetch).toHaveBeenCalledTimes(1);
      await clic('Rechazar');
      const motivo = await hasta(() => document.body.querySelector('textarea[id$="-motivo"]') as HTMLTextAreaElement | null);
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(motivo, 'Está muy cara');
        motivo.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await clic('Rechazar');
      await hasta(() => texto().includes('la rechazaste'));
      const [url, init] = agentFetch.mock.calls[1];
      expect(url).toBe('http://micro.test/api/portal/chat/hacer');
      expect(JSON.parse(init.body)).toEqual({ accion: 'rechazar_reparacion', datos: { id: ID, titulo: 'Fuga en el baño', motivo: 'Está muy cara' } });
    });

    it('«Aprobar» va de una, sin porqué', async () => {
      agentFetch
        .mockResolvedValueOnce(json(200, { pedido: 'reparaciones', texto: 'Te dejo lista la reparación.', tarjeta: reparacion(ID, 'Fuga en el baño') }))
        .mockResolvedValueOnce(json(200, { hecho: true, texto: 'Listo, la aprobaste.' }));
      await abrir('propietario');
      await escribir('aprueba la reparación del baño');
      await clic('Enviar');
      await clic('Aprobar');
      await hasta(() => texto().includes('la aprobaste'));
      expect(JSON.parse(agentFetch.mock.calls[1][1].body)).toEqual({ accion: 'aprobar_reparacion', datos: { id: ID, titulo: 'Fuga en el baño' } });
    });

    it('«Quiero cambiar mi cuenta» abre el formulario controlado DENTRO del chat; nunca /hacer', async () => {
      pedirCambioDeCuenta.mockResolvedValueOnce({ cambio: {} });
      agentFetch.mockResolvedValueOnce(json(200, { pedido: 'cambiar_cuenta', texto: 'Te dejo el formulario para cambiarla.', tarjeta: CUENTA }));
      await abrir('propietario');
      await clic('Quiero cambiar mi cuenta');
      expect(document.body.querySelector('[data-testid="formulario-cambio-de-cuenta"]')).toBeNull();
      await clic('Abrir el formulario');
      await hasta(() => document.body.querySelector('[data-testid="formulario-cambio-de-cuenta"]'));
      expect(boton('Abrir el formulario')).toBeNull();
      await clic('Pedir el cambio');
      await hasta(() => texto().includes('Elige el banco y el tipo'));
      expect(pedirCambioDeCuenta).not.toHaveBeenCalled();
      await clic('Cancelar');
      await hasta(() => boton('Abrir el formulario'));
      expect(agentFetch).toHaveBeenCalledTimes(1);
    });

    it('si escribió un número de cuenta, el formulario llega abierto', async () => {
      agentFetch.mockResolvedValueOnce(
        json(200, { pedido: 'cambiar_cuenta', texto: 'Por seguridad no tomo números de cuenta escritos en el chat.', tarjeta: { ...CUENTA, datos: { ...CUENTA.datos, abrir: 'si' } } }),
      );
      await abrir('propietario');
      await escribir('mi nueva cuenta es 123 456 7890');
      await clic('Enviar');
      await hasta(() => document.body.querySelector('[data-testid="formulario-cambio-de-cuenta"]'));
    });

    it('quien tiene dos cuentas: el chat le dice al micro desde cuál pregunta y desde cuál decide', async () => {
      cabecerasDeLaCuenta.mockReturnValue({ 'x-cuenta': 'propietario' });
      agentFetch
        .mockResolvedValueOnce(json(200, { pedido: 'reparaciones', texto: 'Te dejo lista la reparación.', tarjeta: reparacion(ID, 'Fuga') }))
        .mockResolvedValueOnce(json(200, { hecho: true, texto: 'Listo: la haces tú.' }));
      await abrir('propietario');
      await clic('¿Qué reparaciones tengo por aprobar?');
      await clic('La hago yo');
      await hasta(() => texto().includes('la haces tú'));
      expect(JSON.parse(agentFetch.mock.calls[0][1].body)).toMatchObject({ portal: 'propietario', cuenta: 'propietario' });
      expect(JSON.parse(agentFetch.mock.calls[1][1].body)).toMatchObject({ accion: 'la_hago_yo', cuenta: 'propietario' });
    });

    it('la cuenta de OTRO portal no viaja (sólo la del portal desde el que pregunta)', async () => {
      cabecerasDeLaCuenta.mockReturnValue({ 'x-cuenta': 'inquilino' });
      agentFetch.mockResolvedValueOnce(json(200, { pedido: 'mis_giros', texto: 'Tu giro va en camino.', tarjeta: null }));
      await abrir('propietario');
      await clic('¿Cuándo y cuánto me giran?');
      await hasta(() => texto().includes('va en camino'));
      expect(JSON.parse(agentFetch.mock.calls[0][1].body)).toEqual({ texto: '¿Cuándo y cuánto me giran?', portal: 'propietario' });
    });
  });

  describe('el postulante le pide lo suyo (29-10)', () => {
    beforeEach(() => cabecerasDeLaCuenta.mockReturnValue({}));

    it('sus propias sugerencias (nada de cuánto debo); pregunta con portal «postulante»', async () => {
      agentFetch.mockResolvedValueOnce(json(200, { pedido: 'mi_postulacion', texto: 'Tu postulación a «Apartamento 301» está aprobada.', tarjeta: null }));
      await abrir('postulante');
      expect(boton('¿Cuánto debo?')).toBeNull();
      expect(boton('¿Cuándo es mi visita?')).not.toBeNull();
      await clic('¿En qué va mi postulación?');
      await hasta(() => texto().includes('está aprobada'));
      expect(JSON.parse(agentFetch.mock.calls[0][1].body)).toEqual({ texto: '¿En qué va mi postulación?', portal: 'postulante' });
    });

    it('«Retira mi postulación»: nada sin el clic; «Sí, hazlo» manda ESA postulación a /hacer y deja el resultado', async () => {
      const RETIRO = {
        accion: 'retirar_postulacion',
        titulo: 'Retirar tu postulación',
        detalle: 'A «Apartamento 301». La inmobiliaria deja de verla y no se puede deshacer.',
        boton: 'Sí, hazlo',
        datos: { applicationId: '11111111-1111-4111-8111-111111111111', inmueble: '«Apartamento 301»' },
      };
      agentFetch
        .mockResolvedValueOnce(json(200, { pedido: 'retirar_postulacion', texto: 'Te la dejo lista. Nada se retira sin tu sí.', tarjeta: RETIRO }))
        .mockResolvedValueOnce(json(200, { hecho: true, texto: 'Listo, retiraste tu postulación a «Apartamento 301».' }));
      await abrir('postulante');
      await escribir('Retira mi postulación');
      await clic('Enviar');
      await hasta(() => boton('Sí, hazlo'));
      expect(agentFetch).toHaveBeenCalledTimes(1);
      await clic('Sí, hazlo');
      await hasta(() => texto().includes('Listo, retiraste'));
      const [url, init] = agentFetch.mock.calls[1];
      expect(url).toBe('http://micro.test/api/portal/chat/hacer');
      expect(JSON.parse(init.body)).toEqual({ accion: 'retirar_postulacion', datos: RETIRO.datos });
    });

    it('quien tiene dos cuentas pregunta desde su cuenta de inquilino (la misma sesión del portal)', async () => {
      cabecerasDeLaCuenta.mockReturnValue({ 'x-cuenta': 'inquilino' });
      agentFetch.mockResolvedValueOnce(json(200, { pedido: 'mis_visitas', texto: 'No tienes visitas agendadas.', tarjeta: null }));
      await abrir('postulante');
      await clic('¿Cuándo es mi visita?');
      await hasta(() => texto().includes('No tienes visitas'));
      expect(JSON.parse(agentFetch.mock.calls[0][1].body)).toEqual({ texto: '¿Cuándo es mi visita?', portal: 'postulante', cuenta: 'inquilino' });
    });
  });
});
