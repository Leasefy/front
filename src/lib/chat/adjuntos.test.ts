import { describe, expect, it } from 'vitest';

import {
  familiaDe,
  leerAdjuntosDelMensaje,
  nombreDelPegado,
  pesoLegible,
  porQueNoSeAdjunta,
  textoSinPalabras,
} from './adjuntos';
import { leerCampos, textoDelFormulario, type FormularioEnElHilo } from './acciones-del-hilo';

/**
 * Adjuntos en el chat (29-10-2026): lo que el chat recibe, dicho ANTES de
 * subir (el back lo vuelve a revisar todo), y el archivo nunca a la vista por
 * su id.
 */

const archivo = (name: string, size: number, type = '') => ({ name, size, type });

describe('lo que el chat recibe', () => {
  it('fotos, PDF, XML, planillas, OFX y TXT, por su extensión; una captura pegada, por su tipo', () => {
    expect(familiaDe(archivo('daño.JPG', 1))).toBe('imagen');
    expect(familiaDe(archivo('factura.pdf', 1))).toBe('pdf');
    expect(familiaDe(archivo('FE4521.xml', 1))).toBe('xml');
    expect(familiaDe(archivo('extracto.xlsx', 1))).toBe('planilla');
    expect(familiaDe(archivo('octubre.ofx', 1))).toBe('texto');
    expect(familiaDe(archivo('', 1, 'image/png'))).toBe('imagen');
    expect(familiaDe(archivo('virus.exe', 1))).toBeNull();
  });

  it('dice por qué no, en palabras', () => {
    expect(porQueNoSeAdjunta(archivo('virus.exe', 10))).toContain('no se puede mandar al chat');
    expect(porQueNoSeAdjunta(archivo('grande.pdf', 11 * 1024 * 1024))).toBe('«grande.pdf» pesa 11 MB: el máximo es 10 MB. Mándalo más liviano.');
    expect(porQueNoSeAdjunta(archivo('vacio.pdf', 0))).toBe('«vacio.pdf» está vacío.');
    expect(porQueNoSeAdjunta(archivo('ok.pdf', 2048))).toBeNull();
    expect(pesoLegible(230_000)).toBe('225 KB');
  });

  it('una captura pegada lleva un nombre que se lee, no «image.png»', () => {
    const pegada = new File([new Uint8Array(4)], 'image.png', { type: 'image/png' });
    expect(nombreDelPegado(pegada, new Date(2026, 9, 29, 9, 5), 0).name).toBe('captura-0905.png');
    expect(nombreDelPegado(pegada, new Date(2026, 9, 29, 9, 5), 1).name).toBe('captura-0905-2.png');
    const conNombre = new File([new Uint8Array(4)], 'comprobante.png', { type: 'image/png' });
    expect(nombreDelPegado(conNombre, new Date(), 0)).toBe(conNombre);
  });

  it('el texto cuando sólo se mandan archivos', () => {
    expect(textoSinPalabras([{ nombre: 'gotera.jpg' }])).toBe('Te mando «gotera.jpg».');
    expect(textoSinPalabras([{ nombre: 'a.jpg' }, { nombre: 'b.jpg' }])).toBe('Te mando 2 archivos.');
  });

  it('los adjuntos guardados en un mensaje se leen sin confiar en la forma', () => {
    expect(
      leerAdjuntosDelMensaje([
        { id: 'x', nombre: 'a.pdf', tipo: 'application/pdf', familia: 'pdf', tamano: 10 },
        { id: 'y', nombre: 'b' },
        'basura',
      ]),
    ).toEqual([{ id: 'x', nombre: 'a.pdf', tipo: 'application/pdf', familia: 'pdf', tamano: 10 }]);
    expect(leerAdjuntosDelMensaje(undefined)).toEqual([]);
  });
});

describe('el campo «adjunto» del formulario', () => {
  const campos = leerCampos([
    { clave: 'adjuntoId', etiqueta: 'Comprobante', tipo: 'adjunto', requerido: true, ayuda: 'comprobante.jpg', valor: '55555555-5555-4555-8555-555555555555' },
    { clave: 'valorCop', etiqueta: 'Valor recibido', tipo: 'moneda', requerido: true },
  ]);

  it('se lee (no se descarta) y lo que la persona «dijo» nombra el archivo, nunca su id', () => {
    expect(campos.map((c) => c.tipo)).toEqual(['adjunto', 'moneda']);
    const f: FormularioEnElHilo = {
      accion: 'registrar_pago_con_comprobante',
      entidad: { tipo: 'contrato', id: '4a23f784-2050-4874-bfc4-bc9d1352794a' },
      titulo: 'Registrar el pago',
      frase: '',
      campos,
      errores: [],
    };
    const texto = textoDelFormulario(f, { adjuntoId: '55555555-5555-4555-8555-555555555555', valorCop: '1200000' });
    expect(texto).toContain('comprobante.jpg');
    expect(texto).not.toContain('55555555');
  });
});
