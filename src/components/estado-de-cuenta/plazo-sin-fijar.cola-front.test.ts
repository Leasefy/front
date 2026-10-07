/**
 * COLA-FRONT (04-10-2026), CR-31 (Nico: «Sin plazo… avisar en notificaciones»)
 * en el estado de cuenta:
 *   · la fila `plazoSinFijar` (cajón VENCIDA_EN_PLAZO, 0 días de mora) hace que
 *     el estado del cliente sea «Vencida», no «Vencido, en plazo»;
 *   · el interés que el back todavía manda para esas cuotas no se pinta ni se
 *     suma (sin plazo no corre interés).
 */
import { describe, expect, it } from 'vitest';

import { resumirElCliente } from './resumen';
import { interesesDelContrato, interesesDelEstado } from './intereses';
import { contrato, estadoDeCuenta, fila } from './ejemplo-de-prueba';
import { texto } from './textos';
import { deudaDelContrato } from '@/lib/contratos/deuda-del-contrato';
import type { InteresesDelContrato } from '@/lib/types/estado-de-cuenta';

const HOY = '2026-10-04';

const vencidaSinPlazo = fila({
  estado: 'PENDIENTE',
  fechaDePago: null,
  documentoDePago: null,
  valorBruto: 12_500_000,
  valorNeto: 12_500_000,
  fechaVencimiento: '2026-08-01',
  cuotaId: 'cuota-ago',
  cajon: 'VENCIDA_EN_PLAZO',
  diasDeMora: 0,
  plazoSinFijar: true,
});

const intereses: InteresesDelContrato = {
  filas: [
    {
      cuotaId: 'cuota-ago',
      mes: '2026-08',
      concepto: 'Intereses de mora sobre Canon',
      fechaVencimiento: '2026-08-01',
      diasDeMora: 64,
      liquidado: 250_000,
      abonado: 0,
      pendiente: 250_000,
      origen: 'COBRO',
      pagadaEnMora: false,
    },
    {
      cuotaId: 'cuota-vieja',
      mes: '2026-05',
      concepto: 'Intereses de mora sobre Canon de mayo',
      fechaVencimiento: '2026-05-01',
      diasDeMora: 10,
      liquidado: 40_000,
      abonado: 40_000,
      pendiente: 0,
      origen: 'COBRO',
      pagadaEnMora: true,
    },
  ],
  liquidado: 290_000,
  abonado: 40_000,
  pendiente: 250_000,
  pendienteConIntereses: 12_750_000,
  restaPorPagarConIntereses: 12_750_000,
  sinInteres: null,
  plazoSinFijar: true,
};

function conVencidaSinPlazo() {
  const c = contrato({
    secciones: { arriendos: [vencidaSinPlazo], otrosConceptos: [] },
    totales: { cancelado: 0, pendiente: 12_500_000, restaPorPagar: 12_500_000 },
    intereses,
  });
  return estadoDeCuenta({
    contratos: [c],
    totales: { cancelado: 0, pendiente: 12_500_000, restaPorPagar: 12_500_000 },
    intereses: {
      liquidado: 290_000,
      abonado: 40_000,
      pendiente: 250_000,
      pendienteConIntereses: 12_750_000,
      restaPorPagarConIntereses: 12_750_000,
      sinReglas: false,
      plazoSinFijar: true,
    },
  });
}

describe('estado de cuenta con vencidas sin plazo fijado', () => {
  it('🔴 el estado del cliente es «Vencida», con su detalle', () => {
    const r = resumirElCliente(conVencidaSinPlazo(), HOY);
    expect(r.enMora).toBe(false);
    expect(r.enPlazo).toBe(true);
    expect(r.sinPlazoFijado).toBe(true);
    expect(texto('estadoDeCuenta.vencidaSinPlazo')).toBe('Vencida');
    expect(texto('estadoDeCuenta.unaVencidaSinPlazoDetalle')).toBe('1 cuota vencida sin pagar: todavía no corre interés de mora.');
    expect(texto('estadoDeCuenta.vencidaSinPlazoDetalle', { n: 3 })).toBe('3 cuotas vencidas sin pagar: todavía no corre interés de mora.');
  });

  it('con el plazo fijado sigue siendo «Vencido, en plazo»', () => {
    const doc = conVencidaSinPlazo();
    doc.contratos[0].secciones.arriendos = [{ ...vencidaSinPlazo, plazoSinFijar: undefined }];
    expect(resumirElCliente(doc, HOY).sinPlazoFijado).toBe(false);
  });

  it('🔴 el interés de la cuota sin plazo no se pinta ni se suma; el de las demás, sí', () => {
    const doc = conVencidaSinPlazo();
    const i = interesesDelContrato(doc.contratos[0])!;
    expect(i.filas.map((f) => f.cuotaId)).toEqual(['cuota-vieja']);
    expect(i.pendiente).toBe(0);
    expect(i.liquidado).toBe(40_000);
    expect(i.pendienteConIntereses).toBe(12_500_000);
    const total = interesesDelEstado(doc)!;
    expect(total.pendiente).toBe(0);
    expect(total.restaPorPagarConIntereses).toBe(12_500_000);
  });

  it('sin filas `plazoSinFijar`, el bloque llega tal cual', () => {
    const doc = conVencidaSinPlazo();
    doc.contratos[0].secciones.arriendos = [{ ...vencidaSinPlazo, plazoSinFijar: undefined }];
    expect(interesesDelContrato(doc.contratos[0])).toBe(doc.contratos[0].intereses);
  });
});


describe('la ficha del contrato con vencidas sin plazo fijado', () => {
  it('🔴 marca `plazoSinFijar` y no cuenta días de plazo que no existen', () => {
    const doc = conVencidaSinPlazo();
    const d = deudaDelContrato({ contrato: doc.contratos[0], hoy: HOY, diasDePlazo: 0 });
    expect(d.estado).toBe('VENCIDO_EN_PLAZO');
    expect(d.plazoSinFijar).toBe(true);
    expect(d.diasDePlazoQueQuedan).toBeNull();
    expect(d.vencido).toBe(12_500_000);
  });

  it('con el plazo fijado, como antes', () => {
    const doc = conVencidaSinPlazo();
    doc.contratos[0].secciones.arriendos = [{ ...vencidaSinPlazo, plazoSinFijar: undefined }];
    expect(deudaDelContrato({ contrato: doc.contratos[0], hoy: HOY, diasDePlazo: 0 }).plazoSinFijar).toBe(false);
  });
});
