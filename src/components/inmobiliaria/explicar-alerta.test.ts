/**
 * Las alertas de integridad, dichas en cristiano.
 *
 * Los textos de este archivo NO son inventados: se sacaron de
 * `public.evaluation_results` de la base de dev el 2026-08-16, que es lo que el
 * agente escribe de verdad. Un test con textos idealizados no protege nada.
 *
 * Lo que se protege:
 *  · que las CIFRAS aparezcan. El titular decía «El salario declarado difiere
 *    más del 10%» y jamás decía de cuánto a cuánto.
 *  · que `null` (no supimos traducir) siga siendo posible, porque quien
 *    renderiza depende de eso para mostrar el crudo en vez de esconderlo.
 */

import { describe, it, expect } from 'vitest';
import { explicarAlerta } from './CandidateDrawer';
import type { IntegrityFlag } from '@/lib/api/applications.types';

const flag = (code: string, detail: string): IntegrityFlag => ({
  code,
  detail,
  doc_type: 'cross_validation',
  source: 'cross_validation',
  severity: 'high',
});

describe('salario que no cuadra', () => {
  it('enfrenta las dos cifras, con el monto de cada documento', () => {
    const r = explicarAlerta(
      flag(
        'salary_mismatch',
        'Diferencia de salario entre contrato (6.419.000) y nómina/certificado (3.625.317,5) es del 43.5%, supera el umbral del 10%.',
      ),
    );

    expect(r?.caraACara?.izqRotulo).toBe('contrato');
    expect(r?.caraACara?.izqValor).toContain('6.419.000');
    expect(r?.caraACara?.derRotulo).toBe('nómina/certificado');
    expect(r?.caraACara?.derValor).toContain('3.625.318'); // se redondea al peso
    expect(r?.caraACara?.brecha).toBe('43,5% de diferencia');
    expect(r?.texto).toContain('10%');
  });

  it('también cuando la segunda cifra viene después de dos puntos', () => {
    // Esta forma no lleva paréntesis; con un regex ingenuo se perdía el monto.
    const r = explicarAlerta(
      flag(
        'salary_mismatch',
        'Diferencia de salario entre contrato (6.419.000) y nómina quincenal normalizada a mensual: 7.250.635 es del 13.0%, supera el umbral del 10%.',
      ),
    );

    expect(r?.caraACara?.derRotulo).toBe('nómina quincenal normalizada a mensual');
    expect(r?.caraACara?.derValor).toContain('7.250.635');
    expect(r?.caraACara?.brecha).toBe('13,0% de diferencia');
  });
});

describe('nombre que no coincide', () => {
  it('reconoce el mismo nombre en otro orden y lo dice', () => {
    const r = explicarAlerta(
      flag(
        'name_mismatch',
        "Nombre en cédula ('Victor Jose Ortiz Espitia') no coincide con empleado en nómina ('Ortiz Espitia Victor Jose').",
      ),
    );

    expect(r?.texto).toContain('mismas palabras en otro orden');
    expect(r?.caraACara?.izqValor).toBe('Victor Jose Ortiz Espitia');
    expect(r?.caraACara?.derValor).toBe('Ortiz Espitia Victor Jose');
  });

  it('no minimiza cuando son nombres distintos de verdad', () => {
    const r = explicarAlerta(
      flag(
        'name_mismatch',
        "Nombre en cédula ('Victor Jose Ortiz Espitia') no coincide con empleado en nómina ('Ana María Restrepo').",
      ),
    );

    expect(r?.texto).not.toContain('mismas palabras');
    expect(r?.texto).toContain('Verificá');
  });
});

describe('metadatos del PDF', () => {
  it('cuenta los días en la unidad en que se entienden', () => {
    const r = explicarAlerta(
      flag(
        'metadata_modified',
        "ModDate posterior a CreationDate por 1623 día(s). Producer: 'pdf-lib (https://github.com/Hopding/pdf-lib)'.",
      ),
    );
    expect(r?.texto).toContain('4 años después');
    expect(r?.texto).toContain('pdf-lib');
    expect(r?.texto).not.toContain('ModDate');
  });

  it('8 días son días, no «0 meses»', () => {
    const r = explicarAlerta(
      flag(
        'metadata_modified',
        "ModDate posterior a CreationDate por 8 día(s). Producer: 'pdf-lib (https://github.com/Hopding/pdf-lib)'.",
      ),
    );
    expect(r?.texto).toContain('8 días después');
  });
});

describe('lo que no sabemos traducir', () => {
  it('devuelve null para que el crudo se muestre, no se esconda', () => {
    expect(explicarAlerta(flag('otra_cosa', 'Algo que nadie previó.'))).toBeNull();
  });
});
