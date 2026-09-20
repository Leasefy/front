/**
 * El vacío del asistente de dispersión dice su causa VERDADERA.
 *
 * 🔴 Desde el 16-09 el giro sale de la cuota del propietario, no de los cobros
 * pagados, y se gira aunque el inquilino no haya pagado. Ninguna frase de acá
 * puede volver a decir «cobros pagados» ni mandar a esperar un pago: en la
 * inmobiliaria migrada (0 cobros) esa frase explicaba TODOS los meses vacíos
 * con una causa que no era.
 */
import { describe, it, expect } from 'vitest';

import { motivoDelMesVacio } from './dispersion-mes-vacio';
import type { PorQueElMesVieneVacio } from '@/lib/types/inmobiliaria';

function vacio(p: Partial<PorQueElMesVieneVacio> = {}): PorQueElMesVieneVacio {
  return {
    cuotasDelMes: 0,
    enUnaDispersion: 0,
    porGirar: 0,
    delSistemaAnterior: 0,
    contratosVigentes: 739,
    ...p,
  };
}

const todo = (m: { titulo: string; detalle: string }) => `${m.titulo} ${m.detalle}`;

describe('motivoDelMesVacio', () => {
  it('🔴 agosto de la migrada: 761 cuotas del sistema anterior, no «sin cobros pagados»', () => {
    const m = motivoDelMesVacio({
      mes: '2026-08',
      yaGenerados: 0,
      vacio: vacio({ cuotasDelMes: 761, delSistemaAnterior: 761 }),
    });
    expect(m.titulo).toBe('Agosto de 2026 lo gestionó tu sistema anterior');
    expect(m.detalle).toContain('761 cuotas de propietario');
    expect(todo(m)).not.toMatch(/cobro/i);
    expect(todo(m)).not.toMatch(/pag(os|ado|ue)/i);
  });

  it('sin contratos vigentes lo dice así', () => {
    const m = motivoDelMesVacio({
      mes: '2026-09',
      yaGenerados: 0,
      vacio: vacio({ contratosVigentes: 0 }),
    });
    expect(m.titulo).toBe('No tienes contratos vigentes');
  });

  it('con contratos pero sin una cuota ese mes: fuera de su vigencia o sin tabla', () => {
    const m = motivoDelMesVacio({ mes: '2025-01', yaGenerados: 0, vacio: vacio() });
    expect(m.titulo).toBe('Ningún contrato tiene cuota en enero de 2025');
    expect(m.detalle).toContain('739 contratos vigentes');
    expect(m.detalle).toContain('tabla de cuotas');
  });

  it('cuotas con saldo que no salieron: falta el propietario, no un pago', () => {
    const m = motivoDelMesVacio({
      mes: '2026-09',
      yaGenerados: 0,
      vacio: vacio({ cuotasDelMes: 3, porGirar: 3 }),
    });
    expect(m.titulo).toBe('Hay cuotas, pero no a quién girarlas');
    expect(m.detalle).toContain('3 cuotas de propietario');
    expect(m.detalle).toContain('propietario de tu inmobiliaria');
  });

  it('las ya atadas a una dispersión se buscan en la lista', () => {
    const m = motivoDelMesVacio({
      mes: '2026-09',
      yaGenerados: 0,
      vacio: vacio({ cuotasDelMes: 730, enUnaDispersion: 730 }),
    });
    expect(m.titulo).toBe('Ya están en una dispersión');
    expect(m.detalle).toContain('730 cuotas de propietario');
  });

  it('sin saldo por otra razón: canceladas o anuladas, en singular cuando es una', () => {
    expect(
      motivoDelMesVacio({ mes: '2026-09', yaGenerados: 0, vacio: vacio({ cuotasDelMes: 1 }) }).detalle,
    ).toContain('está cancelada o anulada');
  });

  it('las ya generadas mandan, aunque la cuenta diga otra cosa', () => {
    const m = motivoDelMesVacio({ mes: '2026-09', yaGenerados: 2, vacio: vacio() });
    expect(m.titulo).toBe('Ya están generadas');
    expect(m.detalle).toContain('Búscalas');
  });

  it('un back que todavía no manda la cuenta recibe la frase general, sin cobros', () => {
    const m = motivoDelMesVacio({ mes: '2026-09', yaGenerados: 0 });
    expect(m.titulo).toBe('Nada por girar');
    expect(todo(m)).not.toMatch(/cobro/i);
  });
});
