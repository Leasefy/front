/**
 * El bloque del rango: mes a mes, por contrato, y sin un solo botón de emitir.
 *
 * Lo que se protege acá y no en «Nueva factura»: que el tope por defecto no se
 * corra un día por la zona horaria, que las filas de un mes sean las de ESE mes,
 * y que un contrato que se acaba dentro del rango lo diga — que es la mitad de
 * la frase del CEO («los contratos que finalicen antes se van eliminando de la
 * prefactura»).
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import {
  AVISO_CONTRATOS_QUE_TERMINAN,
  AVISO_SE_GENERAN_POR_MES,
  PrefacturasDelRango,
  filasDelMes,
  finDeAnio,
  totalDelMes,
} from './PrefacturasDelRango';
import type {
  FacturaDelMes,
  FacturasPorGenerar,
  MesDelRango,
} from '@/lib/api/facturacion-por-mes.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function lado(over: Partial<MesDelRango['inquilinos']> = {}) {
  return {
    porEmitir: 0,
    emitidas: 0,
    totalCop: 0,
    baseCop: 0,
    ivaCop: 0,
    retencionesCop: 0,
    sinConfirmar: 0,
    conIva: 0,
    conRetenciones: 0,
    ...over,
  };
}

function factura(over: Partial<FacturaDelMes> = {}): FacturaDelMes {
  return {
    clave: 'ct-1|2026-09|INQUILINO',
    cuotaId: 'cu-1',
    contractId: 'ct-1',
    codigo: 1839,
    numeroExterno: '1686',
    inmueble: 'Cra 76 #45-12 apto 302',
    mes: '2026-09',
    destinatario: 'INQUILINO',
    terceroId: null,
    terceroNombre: 'Nubia Amparo David',
    terceroDocumento: '43123456',
    lineas: [],
    subtotalCop: 1_800_000,
    descuentoCop: 0,
    baseCop: 1_800_000,
    ivaCop: 0,
    retencionesCop: 0,
    totalCop: 1_800_000,
    netoCop: 1_800_000,
    impuestos: [],
    impuestosSinConfirmar: false,
    notasTributarias: [],
    escenario: null,
    estado: 'POR_EMITIR',
    numero: null,
    numeroDian: null,
    diasFacturados: 30,
    diasDelMes: 30,
    deduccionAlEgresoCop: 0,
    emitible: true,
    motivoNoEmitible: null,
    avisos: [],
    ...over,
  };
}

function datos(over: Partial<FacturasPorGenerar> = {}): FacturasPorGenerar {
  return {
    desde: '2026-09',
    hasta: '2026-12',
    mes: '2026-09',
    inquilinos: [
      factura(),
      factura({
        clave: 'ct-1|2026-12|INQUILINO',
        cuotaId: 'cu-2',
        mes: '2026-12',
        emitible: false,
        motivoNoEmitible: 'Diciembre de 2026 todavía no empieza: faltan 3 meses.',
      }),
    ],
    propietarios: [],
    omitidos: [],
    meses: [
      {
        mes: '2026-09',
        nombre: 'Septiembre de 2026',
        emitible: true,
        motivoNoEmitible: null,
        inquilinos: lado({ porEmitir: 1, totalCop: 1_800_000 }),
        propietarios: lado(),
      },
      {
        mes: '2026-12',
        nombre: 'Diciembre de 2026',
        emitible: false,
        motivoNoEmitible: 'Diciembre de 2026 todavía no empieza: faltan 3 meses.',
        inquilinos: lado({ porEmitir: 1, totalCop: 1_800_000 }),
        propietarios: lado(),
      },
    ],
    porContrato: [
      {
        contractId: 'ct-1',
        destinatario: 'INQUILINO',
        codigo: 1839,
        numeroExterno: '1686',
        inmueble: 'Cra 76 #45-12 apto 302',
        terceroNombre: 'Nubia Amparo David',
        cantidad: 2,
        totalCop: 3_600_000,
        valorTipicoCop: 1_800_000,
        valorParejo: true,
        primerMes: '2026-09',
        ultimoMes: '2026-12',
        terminaEnElRango: true,
        terminaEl: '2026-12-31',
      },
    ],
    totales: {
      contratos: 1,
      meses: 2,
      emitiblesHoy: 1,
      totalEmitibleHoyCop: 1_800_000,
      inquilinos: lado({ porEmitir: 2, totalCop: 3_600_000 }),
      propietarios: lado(),
    },
    resolucion: {
      puedeNumerar: true,
      motivo: null,
      explicacion: null,
      numero: '187',
      prefijo: 'FE',
      desde: 1,
      hasta: 5000,
      vigenteHasta: '2028-01-15',
      disponibles: 5000,
      siguiente: 'FE-1',
    },
    ...over,
  };
}

describe('finDeAnio', () => {
  it('🔴 el 31 de diciembre del año en curso, sin corrimiento de zona horaria', () => {
    // El 1 de enero a las 00:30 en Bogotá: el año es el nuevo, no el anterior.
    expect(finDeAnio(new Date(2026, 0, 1, 0, 30))).toBe('2026-12-31');
    expect(finDeAnio(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });
});

describe('filasDelMes', () => {
  it('trae las de ESE mes, de los dos lados', () => {
    const d = datos();
    expect(filasDelMes(d, '2026-09').map((f) => f.clave)).toEqual([
      'ct-1|2026-09|INQUILINO',
    ]);
    expect(filasDelMes(d, '2026-12').map((f) => f.clave)).toEqual([
      'ct-1|2026-12|INQUILINO',
    ]);
    expect(filasDelMes(d, '2027-01')).toEqual([]);
  });
});

describe('totalDelMes', () => {
  it('cuenta los dos lados, lo emitido y lo pendiente', () => {
    expect(
      totalDelMes({
        mes: '2026-09',
        nombre: 'Septiembre de 2026',
        emitible: true,
        motivoNoEmitible: null,
        inquilinos: lado({ porEmitir: 3, emitidas: 1, totalCop: 400 }),
        propietarios: lado({ porEmitir: 2, totalCop: 100 }),
      }),
    ).toEqual({ cantidad: 6, totalCop: 500 });
  });
});

describe('PrefacturasDelRango', () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => {
      root.render(<PrefacturasDelRango datos={datos()} />);
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    host.remove();
  });

  const q = (s: string) => host.querySelector(s);

  it('🔴 dice que se mira todo y se emite mes a mes', () => {
    expect(host.textContent).toContain(AVISO_SE_GENERAN_POR_MES);
    expect(host.textContent).toContain(AVISO_CONTRATOS_QUE_TERMINAN);
  });

  it('🔴 y NO tiene ningún botón de emitir: acá sólo se mira', () => {
    expect(host.querySelector('button')).toBeNull();
    expect(host.querySelector('input[type="checkbox"]')).toBeNull();
  });

  it('marca qué mes se puede emitir y cuál todavía no, con su motivo', () => {
    expect(q('[data-testid="rango-emitible-2026-09"]')).not.toBeNull();
    expect(q('[data-testid="rango-no-emitible-2026-12"]')).not.toBeNull();
    expect(q('[data-testid="rango-motivo-2026-12"]')?.textContent).toContain(
      'todavía no empieza',
    );
  });

  it('cada mes trae sus filas, y una fila futura dice «Todavía no»', () => {
    expect(q('[data-testid="rango-fila-ct-1|2026-09|INQUILINO"]')).not.toBeNull();
    expect(
      q('[data-testid="rango-todavia-no-ct-1|2026-12|INQUILINO"]'),
    ).not.toBeNull();
    // La de septiembre sí se puede emitir: no lleva la marca.
    expect(
      q('[data-testid="rango-todavia-no-ct-1|2026-09|INQUILINO"]'),
    ).toBeNull();
  });

  it('🔴 un contrato que se acaba dentro del rango lo dice, con la fecha', () => {
    const fila = q('[data-testid="rango-termina-ct-1"]');
    expect(fila?.textContent).toContain('31/12/2026');
  });

  it('los totales del rango salen del back, no de una segunda cuenta', () => {
    expect(q('[data-testid="rango-total-meses"]')?.textContent).toBe('2');
    expect(q('[data-testid="rango-total-contratos"]')?.textContent).toBe('1');
    expect(q('[data-testid="rango-total-emitibles"]')?.textContent).toContain(
      '1 ·',
    );
  });
});
