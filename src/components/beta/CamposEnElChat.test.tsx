import { describe, expect, it } from 'vitest';
import { datosDeLosCampos, soloNumero, tecladoDelFormato } from './CamposEnElChat';
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

// Nico (16-10): «obliga al input solo a numérico y ya».
describe('soloNumero', () => {
  it('las letras no se dejan escribir', () => {
    expect(soloNumero('doce')).toBe('');
    expect(soloNumero('12 meses')).toBe('12');
    expect(soloNumero('a-3')).toBe('3');
  });

  it('el menos sólo al principio (el incremento puede ser una rebaja)', () => {
    expect(soloNumero('-3,5')).toBe('-3,5');
    expect(soloNumero('3-5')).toBe('35');
  });

  it('cifras y un solo separador decimal', () => {
    expect(soloNumero('12')).toBe('12');
    expect(soloNumero('1,5')).toBe('1,5');
    expect(soloNumero('1.2.3')).toBe('1.23');
  });
});

// 29-10 (modificar desde el chat): el teclado del celular según cómo se escribe el dato.
describe('tecladoDelFormato', () => {
  const campo = (formato: CampoDelFormulario['formato'], tipo: CampoDelFormulario['tipo'] = 'texto'): CampoDelFormulario => ({
    ...meses,
    clave: 'x',
    tipo,
    formato,
  });

  it('correo, celular, cuenta y dirección abren su teclado y su autocompletado', () => {
    expect(tecladoDelFormato(campo('correo'))).toEqual({ type: 'email', inputMode: 'email', autoComplete: 'email' });
    expect(tecladoDelFormato(campo('celular'))).toEqual({ type: 'tel', inputMode: 'tel', autoComplete: 'tel' });
    expect(tecladoDelFormato(campo('cuenta'))).toEqual({ inputMode: 'numeric', autoComplete: 'off' });
    expect(tecladoDelFormato(campo('direccion'))).toEqual({ autoComplete: 'street-address' });
  });

  it('sin formato, el de su tipo (un número abre el decimal, como siempre)', () => {
    expect(tecladoDelFormato(meses)).toEqual({ inputMode: 'decimal' });
    expect(tecladoDelFormato(campo(undefined))).toEqual({});
    expect(tecladoDelFormato(campo('dia_del_mes', 'numero'))).toEqual({ inputMode: 'numeric' });
  });
});
