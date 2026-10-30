import { describe, expect, it } from 'vitest';
import { pasosDesde } from './CambiarEstadoDelContrato';

describe('cambiar el estado del contrato: sólo lo que permite el back', () => {
  it('el borrador se activa (ya viene firmado) o se cancela', () => {
    expect(pasosDesde('draft').map((p) => p.paso)).toEqual(['activar-ya-firmado', 'cancelar']);
  });
  it('el firmado se activa; el activo se termina', () => {
    expect(pasosDesde('signed').map((p) => p.paso)).toEqual(['activar']);
    expect(pasosDesde('active').map((p) => p.paso)).toEqual(['terminar']);
  });
  it('cancelado y vencido no cambian', () => {
    expect(pasosDesde('cancelled')).toEqual([]);
    expect(pasosDesde('expired')).toEqual([]);
  });
});
