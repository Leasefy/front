import { describe, expect, it } from 'vitest';

import {
  alternarLista,
  alternarMarca,
  bloquesDeLaDescripcion,
  insertar,
  textoPlanoDeLaDescripcion,
  trozosDeLaLinea,
} from './descripcion-con-formato';

describe('la descripción con formato (Nico 31-10-2026: negrilla, cursiva, listas y emojis)', () => {
  it('lee negrilla y cursiva al estilo de WhatsApp, y **doble** también es negrilla', () => {
    expect(trozosDeLaLinea('Un *gran* balcón con _vista_ y **parqueadero**')).toEqual([
      { tipo: 'texto', texto: 'Un ' },
      { tipo: 'negrilla', hijos: [{ tipo: 'texto', texto: 'gran' }] },
      { tipo: 'texto', texto: ' balcón con ' },
      { tipo: 'cursiva', hijos: [{ tipo: 'texto', texto: 'vista' }] },
      { tipo: 'texto', texto: ' y ' },
      { tipo: 'negrilla', hijos: [{ tipo: 'texto', texto: 'parqueadero' }] },
    ]);
  });

  it('un asterisco suelto o pegado a un espacio no es negrilla (precios, notas)', () => {
    expect(trozosDeLaLinea('Canon $3.800.000 * mes')).toEqual([{ tipo: 'texto', texto: 'Canon $3.800.000 * mes' }]);
    expect(trozosDeLaLinea('* hola*')).toEqual([{ tipo: 'texto', texto: '* hola*' }]);
    expect(trozosDeLaLinea('correo_de_la_inmobiliaria')).toEqual([{ tipo: 'texto', texto: 'correo_de_la_inmobiliaria' }]);
  });

  it('negrilla con cursiva adentro, y la marca al lado de un signo', () => {
    expect(trozosDeLaLinea('¡*Gran _oportunidad_*!')).toEqual([
      { tipo: 'texto', texto: '¡' },
      {
        tipo: 'negrilla',
        hijos: [
          { tipo: 'texto', texto: 'Gran ' },
          { tipo: 'cursiva', hijos: [{ tipo: 'texto', texto: 'oportunidad' }] },
        ],
      },
      { tipo: 'texto', texto: '!' },
    ]);
  });

  it('una descripción vieja (texto con saltos y emojis) se lee igual que antes: cada línea en su sitio', () => {
    const vieja = 'HERMOSO APARTAMENTO\n\nVive en una unidad completa.\nPiso 10\n3 alcobas';
    expect(bloquesDeLaDescripcion(vieja)).toEqual([
      { tipo: 'parrafo', lineas: [[{ tipo: 'texto', texto: 'HERMOSO APARTAMENTO' }]] },
      {
        tipo: 'parrafo',
        lineas: [
          [{ tipo: 'texto', texto: 'Vive en una unidad completa.' }],
          [{ tipo: 'texto', texto: 'Piso 10' }],
          [{ tipo: 'texto', texto: '3 alcobas' }],
        ],
      },
    ]);
  });

  it('las líneas con «- » o «• » son viñetas y las de «1. » una lista numerada', () => {
    const bloques = bloquesDeLaDescripcion('Tiene:\n- Balcón\n• Cuarto útil\n\n1. Llama\n2. Agenda');
    expect(bloques.map((b) => b.tipo)).toEqual(['parrafo', 'vinetas', 'numerada']);
    expect(bloques[1]).toMatchObject({ items: [[{ texto: 'Balcón' }], [{ texto: 'Cuarto útil' }]] });
    expect(bloques[2]).toMatchObject({ desde: 1, items: [[{ texto: 'Llama' }], [{ texto: 'Agenda' }]] });
  });

  it('el texto plano quita las marcas (para el CSV de los portales y los resúmenes)', () => {
    expect(textoPlanoDeLaDescripcion('*Gran* apartamento\n- _Balcón_\n- Parqueadero')).toBe(
      'Gran apartamento\n\n• Balcón\n• Parqueadero',
    );
    expect(textoPlanoDeLaDescripcion(null)).toBe('');
  });
});

describe('la barra de formato', () => {
  it('negrilla sobre la selección, y otra vez la quita', () => {
    const una = alternarMarca('Gran balcón', 5, 11, '*');
    expect(una).toEqual({ valor: 'Gran *balcón*', inicio: 5, fin: 13 });
    expect(alternarMarca(una.valor, 6, 12, '*')).toEqual({ valor: 'Gran balcón', inicio: 5, fin: 11 });
    expect(alternarMarca(una.valor, una.inicio, una.fin, '*')).toEqual({ valor: 'Gran balcón', inicio: 5, fin: 11 });
  });

  it('sin selección deja las marcas con el cursor en medio; los espacios de los bordes quedan afuera', () => {
    expect(alternarMarca('Hola ', 5, 5, '_')).toEqual({ valor: 'Hola __', inicio: 6, fin: 6 });
    expect(alternarMarca('a  vista  b', 1, 9, '_').valor).toBe('a  _vista_  b');
  });

  it('con varias líneas marca cada una (las marcas no cruzan líneas)', () => {
    expect(alternarMarca('Piso 10\n\n3 alcobas', 0, 18, '*').valor).toBe('*Piso 10*\n\n*3 alcobas*');
  });

  it('viñetas en las líneas tocadas; otra vez las quita; numerada cambia el tipo', () => {
    const texto = 'Tiene:\nBalcón\nCuarto útil';
    const conVinetas = alternarLista(texto, 9, 15, 'vinetas');
    expect(conVinetas.valor).toBe('Tiene:\n- Balcón\n- Cuarto útil');
    expect(alternarLista(conVinetas.valor, conVinetas.inicio, conVinetas.fin, 'vinetas').valor).toBe(texto);
    expect(alternarLista(conVinetas.valor, conVinetas.inicio, conVinetas.fin, 'numerada').valor).toBe(
      'Tiene:\n1. Balcón\n2. Cuarto útil',
    );
  });

  it('el cursor en una línea vacía la convierte al empezar a escribir la lista', () => {
    expect(alternarLista('', 0, 0, 'vinetas').valor).toBe('');
    expect(alternarLista('Balcón', 3, 3, 'vinetas').valor).toBe('- Balcón');
  });

  it('un emoji entra donde está el cursor (o en lugar de lo elegido)', () => {
    expect(insertar('Balcón', 0, 0, '\u{1F33F} ')).toEqual({ valor: '\u{1F33F} Balcón', inicio: 3, fin: 3 });
    expect(insertar('Balcón grande', 7, 13, 'amplio')).toEqual({ valor: 'Balcón amplio', inicio: 13, fin: 13 });
  });
});
