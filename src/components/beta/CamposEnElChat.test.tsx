import { describe, expect, it } from 'vitest';
import { datosDeLosCampos } from './CamposEnElChat';
import type { CampoDelFormulario } from '@/lib/chat/acciones-del-hilo';

const meses: CampoDelFormulario = {
  clave: 'meses',
  etiqueta: 'Término de cada período, en meses',
  tipo: 'numero',
  requerido: true,
  opciones: [],
  ayuda: null,
  valor: null,
};

describe('datosDeLosCampos', () => {
  it('un número va como número (también con coma decimal)', () => {
    expect(datosDeLosCampos([meses], { meses: '12' })).toEqual({ meses: 12 });
    expect(datosDeLosCampos([meses], { meses: '1,5' })).toEqual({ meses: 1.5 });
  });

  // QA-AGENTES 16-10 (lab, contrato #1028): «doce» viajaba como NaN → `null`,
  // el micro descartaba la tarjeta entera y contestaba «No encontré a nadie
  // con «vencido ley»». Lo que no es un número va tal cual: el micro dice que
  // tiene que ser un número.
  it('lo que no es un número va tal cual, nunca NaN', () => {
    const datos = datosDeLosCampos([meses], { meses: 'doce' });
    expect(datos).toEqual({ meses: 'doce' });
    expect(JSON.parse(JSON.stringify(datos))).toEqual({ meses: 'doce' });
  });

  it('lo vacío no viaja', () => {
    expect(datosDeLosCampos([meses], { meses: '  ' })).toEqual({});
  });
});
