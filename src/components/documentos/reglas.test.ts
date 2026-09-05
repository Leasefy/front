import { describe, it, expect } from 'vitest';
import type {
  CampoDeDocumento,
  DocumentoGenerado,
  RevisionDelIncremento,
} from '@/lib/api/documentos.service';
import {
  avisoDelIncremento,
  camposFaltantes,
  etiquetaDelInmueble,
  etiquetaDePartes,
  filtrarDocumentos,
  formatearPesos,
  formatearPorcentaje,
  parsearPorcentaje,
  puedeGenerar,
  puedePreparar,
  queFaltaElegir,
  esCampoDeCiudad,
} from './reglas';

const DOC: DocumentoGenerado = {
  id: 'd-1',
  name: 'Contrato de arrendamiento — Apartamento en Chicó',
  status: 'DOC_DRAFT',
  createdAt: '2026-09-03T10:00:00.000Z',
  updatedAt: '2026-09-03T10:00:00.000Z',
  signatures: [],
  template: {
    id: 't-1',
    name: 'Contrato de arrendamiento de vivienda urbana',
    category: 'CONTRATO',
    codigo: 'CONTRATO_VIVIENDA',
  },
  consignacion: { id: 'g-1', propertyTitle: 'Apartamento en Chicó' },
  contract: {
    id: 'c-1',
    code: 111,
    propertyAddress: 'Calle 100 # 15-20',
    propertyCity: 'Bogotá',
    tenantName: 'Ana Pérez',
    landlordName: 'Carlos Ruiz',
  },
};

const CARTA: DocumentoGenerado = {
  ...DOC,
  id: 'd-2',
  name: 'Carta de incremento — Casa Envigado',
  status: 'DOC_SIGNED',
  template: { id: 't-2', name: 'Carta de incremento', category: 'CARTA', codigo: 'CARTA_INCREMENTO' },
  consignacion: { id: 'g-2', propertyTitle: 'Casa Envigado' },
  contract: null,
};

describe('etiquetas de la tabla', () => {
  it('el inmueble sale del contrato cuando lo hay, con su número', () => {
    expect(etiquetaDelInmueble(DOC)).toBe('#111 · Calle 100 # 15-20');
  });

  it('sin contrato cae al título del mandato', () => {
    expect(etiquetaDelInmueble(CARTA)).toBe('Casa Envigado');
  });

  it('sin ninguno de los dos devuelve null, y la tabla muestra el guion', () => {
    expect(etiquetaDelInmueble({ ...CARTA, consignacion: null })).toBeNull();
  });

  it('un contrato sin dirección igual dice de cuál se trata', () => {
    expect(
      etiquetaDelInmueble({
        ...DOC,
        consignacion: null,
        contract: { ...DOC.contract!, propertyAddress: null },
      }),
    ).toBe('Contrato #111');
  });

  it('las partes salen del contrato: arrendador y arrendatario', () => {
    expect(etiquetaDePartes(DOC)).toBe('Carlos Ruiz · Ana Pérez');
    expect(etiquetaDePartes(CARTA)).toBeNull();
  });
});

describe('filtrarDocumentos', () => {
  const todos = [DOC, CARTA];

  it('sin filtros devuelve todo', () => {
    expect(filtrarDocumentos(todos, { texto: '', categoria: 'todas', estado: 'todos' })).toHaveLength(2);
  });

  it('filtra por categoría y por estado', () => {
    expect(
      filtrarDocumentos(todos, { texto: '', categoria: 'CARTA', estado: 'todos' }).map((d) => d.id),
    ).toEqual(['d-2']);
    expect(
      filtrarDocumentos(todos, { texto: '', categoria: 'todas', estado: 'DOC_SIGNED' }).map((d) => d.id),
    ).toEqual(['d-2']);
  });

  it('el buscador mira el nombre, el inmueble, las partes y la plantilla', () => {
    const f = { categoria: 'todas', estado: 'todos' } as const;
    expect(filtrarDocumentos(todos, { ...f, texto: 'ana pérez' }).map((d) => d.id)).toEqual(['d-1']);
    expect(filtrarDocumentos(todos, { ...f, texto: 'envigado' }).map((d) => d.id)).toEqual(['d-2']);
    expect(filtrarDocumentos(todos, { ...f, texto: '#111' }).map((d) => d.id)).toEqual(['d-1']);
    expect(filtrarDocumentos(todos, { ...f, texto: 'no existe' })).toEqual([]);
  });
});

describe('qué pide cada tipo', () => {
  it('el contrato y la carta exigen un contrato: un inmueble no alcanza', () => {
    const soloContrato = { requiere: 'contrato' } as const;
    expect(puedePreparar(soloContrato, { consignacionId: 'g-1' })).toBe(false);
    expect(puedePreparar(soloContrato, { contractId: 'c-1' })).toBe(true);
    expect(queFaltaElegir(soloContrato)).toContain('el contrato');
  });

  it('las actas y el inventario aceptan cualquiera de los dos', () => {
    const cualquiera = { requiere: 'contrato-o-inmueble' } as const;
    expect(puedePreparar(cualquiera, { consignacionId: 'g-1' })).toBe(true);
    expect(puedePreparar(cualquiera, { contractId: 'c-1' })).toBe(true);
    expect(puedePreparar(cualquiera, {})).toBe(false);
  });

  it('el diálogo guarda «nada elegido» como cadena vacía, y eso NO puede tapar al inmueble', () => {
    const cualquiera = { requiere: 'contrato-o-inmueble' } as const;
    expect(puedePreparar(cualquiera, { contractId: '', consignacionId: 'g-1' })).toBe(true);
    expect(puedePreparar(cualquiera, { contractId: '', consignacionId: '' })).toBe(false);
  });

  it('sin plantilla elegida no se prepara nada', () => {
    expect(puedePreparar(null, { contractId: 'c-1' })).toBe(false);
    expect(queFaltaElegir(null)).toContain('qué documento');
  });
});

describe('camposFaltantes', () => {
  const campos: CampoDeDocumento[] = [
    { nombre: 'ciudad', etiqueta: 'Ciudad', tipo: 'texto', requerida: true, valor: 'Bogotá' },
    { nombre: 'garantiaPersonal', etiqueta: 'Garantía', tipo: 'parrafo', requerida: true, valor: '' },
    { nombre: 'notas', etiqueta: 'Notas', tipo: 'parrafo', requerida: false, valor: '' },
  ];

  it('sólo cuenta los requeridos vacíos, mirando el prellenado del backend', () => {
    expect(camposFaltantes(campos, {}).map((c) => c.nombre)).toEqual(['garantiaPersonal']);
  });

  it('lo que escribe la persona cuenta como lleno', () => {
    expect(camposFaltantes(campos, { garantiaPersonal: 'Codeudor' })).toEqual([]);
  });

  it('vaciar un campo prellenado lo vuelve a marcar como faltante', () => {
    expect(camposFaltantes(campos, { ciudad: '   ' }).map((c) => c.nombre)).toEqual([
      'ciudad',
      'garantiaPersonal',
    ]);
  });
});

describe('avisoDelIncremento — Ley 820 de 2003, art. 20', () => {
  const revision: RevisionDelIncremento = {
    ipcAno: 2025,
    ipcValor: 5.1,
    topeLegal: 5.1,
    canonVigente: 2_000_000,
    canonEnElTope: 2_102_000,
    mesesBajoElMismoPrecio: 12,
    cumpleLosDoceMeses: true,
    fuente: 'https://www.dane.gov.co/…',
  };

  it('sin revisión no dice nada: no es una carta de incremento', () => {
    expect(avisoDelIncremento(null, '5')).toBeNull();
  });

  it('bloquea por encima del tope y nombra el año del IPC', () => {
    const aviso = avisoDelIncremento(revision, '8');
    expect(aviso?.bloquea).toBe(true);
    expect(aviso?.texto).toContain('8,00 %');
    expect(aviso?.texto).toContain('5,10 %');
    expect(aviso?.texto).toContain('2025');
  });

  it('el tope exacto NO bloquea: el art. 20 dice «hasta en»', () => {
    expect(avisoDelIncremento(revision, '5.1')?.bloquea).toBe(false);
    expect(avisoDelIncremento(revision, '5,1')?.bloquea).toBe(false);
  });

  it('por debajo del tope tampoco: es techo, no piso', () => {
    const aviso = avisoDelIncremento(revision, '3');
    expect(aviso?.bloquea).toBe(false);
    expect(aviso?.texto).toContain('Tope legal 5,10 %');
  });

  it('bloquea si el canon no lleva doce meses bajo el mismo precio', () => {
    const aviso = avisoDelIncremento(
      { ...revision, mesesBajoElMismoPrecio: 7, cumpleLosDoceMeses: false },
      '3',
    );
    expect(aviso?.bloquea).toBe(true);
    expect(aviso?.texto).toContain('7 meses');
    expect(aviso?.texto).toContain('doce');
  });

  it('bloquea cuando el DANE todavía no publicó ese IPC, en vez de dejar pasar cualquier número', () => {
    const aviso = avisoDelIncremento({ ...revision, ipcAno: null, topeLegal: null }, '3');
    expect(aviso?.bloquea).toBe(true);
    expect(aviso?.texto).toContain('DANE');
  });

  it('un porcentaje vacío, cero o basura bloquea', () => {
    expect(avisoDelIncremento(revision, '')?.bloquea).toBe(true);
    expect(avisoDelIncremento(revision, '0')?.bloquea).toBe(true);
    expect(avisoDelIncremento(revision, 'mucho')?.bloquea).toBe(true);
  });
});

describe('puedeGenerar', () => {
  const campos: CampoDeDocumento[] = [
    { nombre: 'porcentajeIncremento', etiqueta: 'Incremento', tipo: 'porcentaje', requerida: true, valor: '5.1' },
    { nombre: 'canalDeNotificacion', etiqueta: 'Canal', tipo: 'texto', requerida: true, valor: 'Servicio postal autorizado' },
  ];
  const incremento: RevisionDelIncremento = {
    ipcAno: 2025,
    ipcValor: 5.1,
    topeLegal: 5.1,
    canonVigente: 2_000_000,
    canonEnElTope: 2_102_000,
    mesesBajoElMismoPrecio: 14,
    cumpleLosDoceMeses: true,
    fuente: 'x',
  };
  const plantilla = { requiere: 'contrato', codigo: 'CARTA_INCREMENTO' } as const;

  it('con todo en orden, se puede', () => {
    expect(
      puedeGenerar({ plantilla, contractId: 'c-1', campos, valores: {}, incremento }),
    ).toBe(true);
  });

  it('un incremento por encima del tope lo impide, aunque no falte ningún campo', () => {
    expect(
      puedeGenerar({
        plantilla,
        contractId: 'c-1',
        campos,
        valores: { porcentajeIncremento: '9' },
        incremento,
      }),
    ).toBe(false);
  });

  it('sin contrato elegido no se puede', () => {
    expect(puedeGenerar({ plantilla, campos, valores: {}, incremento })).toBe(false);
  });

  it('un campo requerido vacío lo impide', () => {
    expect(
      puedeGenerar({
        plantilla,
        contractId: 'c-1',
        campos,
        valores: { canalDeNotificacion: '' },
        incremento,
      }),
    ).toBe(false);
  });

  it('el tope sólo se revisa en la carta: un acta no lo mira', () => {
    expect(
      puedeGenerar({
        plantilla: { requiere: 'contrato-o-inmueble', codigo: 'ACTA_ENTREGA' },
        consignacionId: 'g-1',
        campos: [{ nombre: 'estadoGeneral', etiqueta: 'Estado', tipo: 'parrafo', requerida: true, valor: 'Bueno' }],
        valores: {},
        incremento: null,
      }),
    ).toBe(true);
  });
});

describe('formatos', () => {
  it('el porcentaje va con coma y dos decimales', () => {
    expect(formatearPorcentaje(5.1)).toBe('5,10 %');
    expect(formatearPorcentaje(13.12)).toBe('13,12 %');
  });

  it('los pesos van con punto de miles y sin centavos', () => {
    expect(formatearPesos(2_102_000)).toBe('$ 2.102.000');
  });

  it('parsearPorcentaje acepta coma y punto, y rechaza lo que no es número', () => {
    expect(parsearPorcentaje('5,1')).toBe(5.1);
    expect(parsearPorcentaje('5.1')).toBe(5.1);
    expect(parsearPorcentaje('')).toBeNull();
    expect(parsearPorcentaje('cinco')).toBeNull();
  });
});

describe('esCampoDeCiudad', () => {
  const campo = (nombre: string, tipo = 'texto') =>
    ({ nombre, tipo }) as Parameters<typeof esCampoDeCiudad>[0]

  it('reconoce el tipo que va a mandar el backend', () => {
    expect(esCampoDeCiudad(campo('lugarDeFirma', 'ciudad'))).toBe(true)
  })

  it('mientras tanto lo reconoce por el nombre de la variable', () => {
    expect(esCampoDeCiudad(campo('ciudad'))).toBe(true)
    expect(esCampoDeCiudad(campo('ciudadDeFirma'))).toBe(true)
    expect(esCampoDeCiudad(campo('municipio'))).toBe(true)
  })

  it('no se lleva por delante campos que no son ciudad', () => {
    for (const n of ['direccion', 'canalDeNotificacion', 'porcentajeIncremento', 'fechaDeVigencia']) {
      expect(esCampoDeCiudad(campo(n))).toBe(false)
    }
  })
})
