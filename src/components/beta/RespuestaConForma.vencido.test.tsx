/**
 * QA-CHAT (04-10-2026, laboratorio): la tarjeta del «contrato 13» decía
 * «Cartera $0 · Al día» con $15.600.000 vencidos sin pagar (la inmobiliaria
 * no fijó su plazo: CR-31, sin plazo no hay mora), y al asesor —que no ve la
 * Cartera— le mostraba «Al día». P-8: primero lo vencido sin pagar. P-9: lo
 * que el rol no ve, no se muestra.
 */
import { describe, it, expect } from 'vitest';
import { semaforoDelContrato, vencidoSinPagar } from './RespuestaConForma';
import type { ContratoDeEntidad } from '@/lib/chat/bloques';

const base: ContratoDeEntidad = {
  id: 'c-13', codigo: 13, estado: 'ACTIVE', vigente: true, inquilino: 'Consultores en Mora Ltda.',
  inicio: '2025-08-01', fin: '2027-07-31', canonCop: 5_200_000, diasParaVencer: 300, inmueble: null,
  propietarios: [], renovacion: null,
  cartera: { estado: 'ok', deudaTotalCop: 62_400_000, carteraCop: 0, porVencerCop: 46_800_000, diasDeMoraMaximo: 0, interesDeMoraCop: 0, vencidaEnPlazoCop: 15_600_000 },
} as unknown as ContratoDeEntidad;

describe('la tarjeta del contrato con lo vencido sin pagar', () => {
  it('con plata vencida dentro del plazo NO dice «Al día»: dice «Vencido sin pagar»', () => {
    expect(vencidoSinPagar(base.cartera)).toBe(15_600_000);
    expect(semaforoDelContrato(base).clave).toBe('beta.forma.semaforo.vencidoSinPagar');
  });

  it('sin permiso de ver la cartera no dice «Al día» (no lo sabe)', () => {
    const c = { ...base, cartera: { estado: 'sin_permiso' } } as unknown as ContratoDeEntidad;
    expect(semaforoDelContrato(c).clave).not.toBe('beta.forma.semaforo.alDia');
  });

  it('al día de verdad (cartera leída, nada vencido): «Al día»', () => {
    const c = { ...base, cartera: { ...base.cartera, vencidaEnPlazoCop: 0 } } as unknown as ContratoDeEntidad;
    expect(semaforoDelContrato(c).clave).toBe('beta.forma.semaforo.alDia');
  });
});

describe('lo que llega del micro (done.entidades) conserva lo vencido y el permiso', () => {
  const entidad = (cartera: Record<string, unknown>) => ({
    tipo: 'contrato', id: 'c-13', titulo: 'Contrato 13', motivo: 'codigo', puntaje: 1, documentoFinal: null, telefonoFinal: null,
    correo: null, documento: null, telefono: null, datosCompletos: false, totalContratos: 1, otrosRoles: [],
    contratos: [{ ...base, cartera }],
  });

  it('vencidaEnPlazoCop sobrevive a la lectura → «Vencido sin pagar»', async () => {
    const { leerEntidades } = await import('@/lib/chat/bloques');
    const [e] = leerEntidades([entidad({ estado: 'ok', deudaTotalCop: 62_400_000, carteraCop: 0, porVencerCop: 46_800_000, vencidaEnPlazoCop: 15_600_000, interesCop: 0, cuotasEnCartera: 0, diasDeMoraMaximo: 0 })]);
    const c = (e as unknown as { contratos: ContratoDeEntidad[] }).contratos[0];
    expect(vencidoSinPagar(c.cartera)).toBe(15_600_000);
    expect(semaforoDelContrato(c).clave).toBe('beta.forma.semaforo.vencidoSinPagar');
  });

  it('«sin_permiso» sobrevive a la lectura (no se vuelve «no_disponible»)', async () => {
    const { leerEntidades } = await import('@/lib/chat/bloques');
    const [e] = leerEntidades([entidad({ estado: 'sin_permiso' })]);
    expect((e as unknown as { contratos: ContratoDeEntidad[] }).contratos[0].cartera).toEqual({ estado: 'sin_permiso' });
  });
});
