/**
 * QA-MIGRACION-95 (06-10-2026): re-subir el mismo archivo de terceros decía
 * «8 creadas» de 8 personas que ya estaban (el back las enlaza, no duplica).
 * El informe cuenta como creadas sólo las que nacieron: `aplicadas − yaEstaban`.
 */
import { describe, it, expect } from 'vitest';
import { aplicarLoteDeTerceros, creadasDeVerdad } from './aplicar-lote-de-terceros';
import type { ResumenDeAplicacion } from '@/lib/api/migracion-terceros.service';

const tanda = (over: Partial<ResumenDeAplicacion>): ResumenDeAplicacion => ({
  lote: 'l', intentadas: 0, aplicadas: 0, fallidas: 0, invitados: 0, resultados: [], restantes: 0, ...over,
});

describe('creadas de verdad (QA-MIGRACION-95)', () => {
  it('suma las que ya estaban de cada tanda y las descuenta de las creadas', async () => {
    const respuestas = [
      tanda({ intentadas: 5, aplicadas: 5, yaEstaban: 3, restantes: 3 }),
      tanda({ intentadas: 3, aplicadas: 3, yaEstaban: 2, restantes: 0 }),
    ];
    const r = await aplicarLoteDeTerceros('l', async () => respuestas.shift()!);
    expect(r.aplicadas).toBe(8);
    expect(r.yaEstaban).toBe(5);
    expect(creadasDeVerdad(r)).toBe(3);
  });

  it('un back que no manda yaEstaban se lee como antes (todas creadas)', () => {
    expect(creadasDeVerdad({ aplicadas: 8 })).toBe(8);
    expect(creadasDeVerdad({ aplicadas: 8, yaEstaban: 8 })).toBe(0);
  });
});
