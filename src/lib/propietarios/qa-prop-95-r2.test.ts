/**
 * QA-PROP-95, ronda 2 (04-10-2026):
 * - C-35: «Mis informes» abre en el año que se declara (el anterior) si está.
 * - B-08: «CC» con forma de NIT se dice en palabras en «Datos por completar».
 */
import { describe, it, expect } from 'vitest';

import { anioQueAbreElCertificado } from './anio-del-certificado';
import { textoDeDatosPorCompletar } from './datos-por-completar';

describe('C-35 · el año con que abre «Mis informes»', () => {
  const octubre2026 = new Date('2026-10-04T12:00:00-05:00');

  it('con 2026 y 2025 abre 2025, el que se declara', () => {
    expect(anioQueAbreElCertificado([2026, 2025], octubre2026)).toBe(2025);
  });

  it('sin el año anterior, el más nuevo', () => {
    expect(anioQueAbreElCertificado([2026], octubre2026)).toBe(2026);
    expect(anioQueAbreElCertificado([2024, 2023], octubre2026)).toBe(2024);
  });

  it('sin años, ninguno', () => {
    expect(anioQueAbreElCertificado([], octubre2026)).toBeNull();
  });
});

describe('B-08 · el tipo de documento por revisar, en palabras', () => {
  it('no deja la clave cruda', () => {
    const texto = textoDeDatosPorCompletar(['tipoDocumentoPorRevisar', 'cuentaBancaria']);
    expect(texto).toBe('Datos por completar: revisar el tipo de documento (el número parece un NIT), cuenta bancaria');
    expect(texto).not.toContain('tipoDocumentoPorRevisar');
  });
});

import { estadoDelGiroDeLaLinea, partesDelGiro } from './estado-del-giro';

describe('C-10 · el estado del giro en el extracto', () => {
  it('una línea en un solo estado lo dice en una palabra; partida, con sus montos', () => {
    expect(estadoDelGiroDeLaLinea({ giradoCop: 0, enGiroCop: 1_083_630, porGirarCop: 0 })).toBe('En giro')
    expect(estadoDelGiroDeLaLinea({ giradoCop: 2_070_350, enGiroCop: 0, porGirarCop: 0 })).toBe('Girado')
    expect(estadoDelGiroDeLaLinea({ giradoCop: 1_000, enGiroCop: 0, porGirarCop: 2_000 })).toBe('Girado $ 1.000 · Por girar $ 2.000')
    expect(estadoDelGiroDeLaLinea({})).toBeNull()
  })

  it('el total: girado + en giro + por girar, sólo lo que tiene plata (como el PDF)', () => {
    const partes = partesDelGiro({ totalGirado: 2_070_350, totalEnGiro: 0, totalPorGirar: 5_946_750 })
    expect(partes).toEqual([
      { etiqueta: 'De eso, ya girado', valor: 2_070_350 },
      { etiqueta: 'Por girar', valor: 5_946_750 },
    ])
  })
})
