import { describe, expect, it } from 'vitest';
import { mensajeDeLaFirmaDelInquilino } from './firma-del-inquilino';

describe('QA-CONT-95 · lo que el portal dice al firmar el inquilino', () => {
  it('🔴 con la firma del propietario pendiente NO dice que firmaron las dos partes ni que está activo', () => {
    const m = mensajeDeLaFirmaDelInquilino('pending_landlord', 'es');
    expect(m.titulo).toBe('¡Firmaste el contrato!');
    expect(m.texto).toMatch(/Ahora firma el propietario/);
    expect(`${m.titulo} ${m.texto}`).not.toMatch(/Ambas partes|activo/);
  });

  it('firmado por las dos partes, sin activar: se activa en su fecha de inicio', () => {
    expect(mensajeDeLaFirmaDelInquilino('signed', 'es').texto).toMatch(/se activa en su fecha de inicio/);
  });

  it('activo: firmado y activo', () => {
    expect(mensajeDeLaFirmaDelInquilino('active', 'es').titulo).toBe('¡Contrato firmado y activo!');
  });
});
