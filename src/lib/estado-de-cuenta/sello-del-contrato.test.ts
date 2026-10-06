import { describe, expect, it } from 'vitest';
import { estadoDe, selloDelContrato } from './sello-del-contrato';

describe('sello del contrato (QA-PROP-95, PO-01)', () => {
  it('un firmado que empieza en noviembre no es «Vigente» ni cuenta como vigente', () => {
    const c = { vigente: true, estadoDelContrato: 'POR_EMPEZAR' as const, inicio: '2026-11-01' };
    expect(selloDelContrato(c)).toEqual({ texto: 'Empieza el 1 de noviembre de 2026', vivo: false });
    expect(estadoDe(c)).toBe('POR_EMPEZAR');
  });
  it('uno cancelado dice «Cancelado», no «Terminado»', () => {
    expect(selloDelContrato({ vigente: false, estadoDelContrato: 'CANCELADO' }).texto).toBe('Cancelado');
  });
  it('sin el campo nuevo (back viejo) se usa `vigente`', () => {
    expect(selloDelContrato({ vigente: true }).texto).toBe('Vigente');
    expect(selloDelContrato({ vigente: false }).texto).toBe('Terminado');
  });
});
