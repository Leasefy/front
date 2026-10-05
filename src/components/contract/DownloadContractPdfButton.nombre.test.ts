import { describe, expect, it } from 'vitest';
import { nombreDelPdfDelContrato } from './DownloadContractPdfButton';

describe('QA-CONT-95 · B-06 el nombre del PDF descargado', () => {
  it('🔴 lleva el número del contrato, no 8 letras del id', () => {
    expect(nombreDelPdfDelContrato('2dea8734-d7df-4294-ad6f-5ba023ca0e28', '#53')).toBe('contrato-53.pdf');
    expect(nombreDelPdfDelContrato('2dea8734-d7df-4294-ad6f-5ba023ca0e28', 'QC-01')).toBe('contrato-QC-01.pdf');
  });
  it('sin número, el de antes', () => {
    expect(nombreDelPdfDelContrato('2dea8734-d7df-4294-ad6f-5ba023ca0e28', null)).toBe('contrato-2dea8734.pdf');
  });
});
