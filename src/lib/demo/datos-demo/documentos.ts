/**
 * Documentos con datos de ejemplo (el modo demo): lo generado con las plantillas legales, las plantillas de la
 * inmobiliaria y las actas de entrega y devolución. Personas y direcciones INVENTADAS (las mismas de la demo de
 * Contratos, `./contratos.ts`): no son de ningún cliente. Las fechas se cuentan desde hoy.
 *
 * Todo viaja en la forma del back (`AgencyDocumentStatus`, el acta en `ENTREGA`/`ACTA_COMPLETED`/`GOOD`): el servicio
 * lo traduce como con una respuesta de verdad.
 */
import type {
  CategoriaDeDocumento,
  CodigoDeDocumentoLegal,
  DocumentoGenerado,
  EstadoDeDocumento,
  PlantillaDeLaAgencia,
} from '@/lib/api/documentos.service';
import type { LecturaDeLaDemo } from './index';

const HORA = 3_600_000;
const DIA = 24 * HORA;

const haceRato = (ms: number) => new Date(Date.now() - ms).toISOString();

interface ContratoDeEjemplo {
  id: string;
  code: number;
  inquilino: string;
  documento: string;
  propietario: string;
  direccion: string;
  ciudad: string;
  inmueble: string;
}

/** Los contratos de la demo de Contratos, con lo que un documento necesita de cada uno. */
const CONTRATOS: Record<string, ContratoDeEjemplo> = {
  laura: { id: 'demo-ct-1', code: 101, inquilino: 'Laura Restrepo', documento: '1036654321', propietario: 'Carlos Mejía', direccion: 'Cra 43A # 18 Sur 135, apto 702', ciudad: 'Medellín', inmueble: 'Apartamento en El Poblado' },
  andres: { id: 'demo-ct-2', code: 102, inquilino: 'Andrés Gómez', documento: '71234567', propietario: 'María Isabel Uribe', direccion: 'Cl 10 # 34-21, casa 4', ciudad: 'Sabaneta', inmueble: 'Casa en Sabaneta' },
  local: { id: 'demo-ct-3', code: 103, inquilino: 'Comercializadora El Poblado SAS', documento: '901234567', propietario: 'Inversiones Palmas SAS', direccion: 'Cra 37 # 8A-56, local 2', ciudad: 'Medellín', inmueble: 'Local en El Poblado' },
  valentina: { id: 'demo-ct-4', code: 104, inquilino: 'Valentina Ríos', documento: '1017223344', propietario: 'Jorge Arango', direccion: 'Cl 79 Sur # 47E-80, apto 1504', ciudad: 'Sabaneta', inmueble: 'Apartamento en Aves María' },
  juanPablo: { id: 'demo-ct-5', code: 105, inquilino: 'Juan Pablo Cardona', documento: '98765432', propietario: 'Luz Marina Henao', direccion: 'Cra 70 # 44-10, apto 301', ciudad: 'Medellín', inmueble: 'Apartamento en Laureles' },
  mariana: { id: 'demo-ct-6', code: 106, inquilino: 'Mariana Ochoa', documento: '1152334455', propietario: 'Carlos Mejía', direccion: 'Cl 5 Sur # 25-80, apto 902', ciudad: 'Envigado', inmueble: 'Apartamento en Envigado' },
  felipe: { id: 'demo-ct-7', code: 107, inquilino: 'Felipe Zuluaga', documento: '1020456789', propietario: 'Ana Lucía Vélez', direccion: 'Cra 80 # 33-15, apto 210', ciudad: 'Medellín', inmueble: 'Apartamento en Belén' },
};

// ─── Las plantillas ─────────────────────────────────────────────────────────

const PLANTILLAS_LEGALES: readonly [CodigoDeDocumentoLegal, string, CategoriaDeDocumento, string, string[]][] = [
  ['CONTRATO_VIVIENDA', 'Contrato de arrendamiento de vivienda urbana', 'CONTRATO', '3.2', ['arrendador', 'arrendatario', 'direccion', 'canon', 'fecha_inicio', 'duracion_meses']],
  ['CONTRATO_COMERCIAL', 'Contrato de arrendamiento de local comercial', 'CONTRATO', '2.4', ['arrendador', 'arrendatario', 'direccion', 'canon', 'fecha_inicio', 'destinacion']],
  ['ACTA_ENTREGA', 'Acta de entrega del inmueble', 'ACTA', '2.1', ['arrendatario', 'direccion', 'fecha_entrega']],
  ['ACTA_DEVOLUCION', 'Acta de devolución del inmueble', 'ACTA', '2.1', ['arrendatario', 'direccion', 'fecha_devolucion']],
  ['INVENTARIO', 'Inventario del inmueble', 'INVENTARIO', '1.6', ['direccion', 'espacios']],
  ['CARTA_INCREMENTO', 'Carta de incremento del canon', 'CARTA', '1.8', ['arrendatario', 'canon_actual', 'canon_nuevo', 'ipc']],
  ['PAZ_Y_SALVO', 'Paz y salvo del arrendatario', 'CARTA', '1.3', ['arrendatario', 'direccion', 'fecha_corte']],
  ['CERTIFICADO_ESTAR_AL_DIA', 'Certificado de estar al día', 'CARTA', '1.2', ['arrendatario', 'direccion', 'fecha_corte']],
];

function contenido(nombre: string, variables: string[]): string {
  const filas = variables.map((v) => `<p><strong>${v.replace(/_/g, ' ')}:</strong> {{${v}}}</p>`).join('');
  return `<h1>${nombre}</h1><p>Entre los suscritos, {{inmobiliaria}}, y las partes que se identifican abajo, se deja constancia de lo siguiente:</p>${filas}<p>Para constancia se firma en {{ciudad}}, el {{fecha}}.</p>`;
}

function plantillas(): PlantillaDeLaAgencia[] {
  const legales = PLANTILLAS_LEGALES.map(([codigo, nombre, categoria, version, variables], i) => ({
    id: `demo-pt-${i + 1}`,
    name: nombre,
    category: categoria,
    version,
    variables,
    codigo,
    isActive: true,
    updatedAt: haceRato((40 + i * 9) * DIA),
    content: contenido(nombre, variables),
  }));
  const propia: PlantillaDeLaAgencia = {
    id: 'demo-pt-propia',
    name: 'Carta de bienvenida al inquilino',
    category: 'CARTA',
    version: '1.0',
    variables: ['arrendatario', 'direccion', 'fecha_inicio'],
    codigo: null,
    isActive: true,
    updatedAt: haceRato(6 * DIA),
    content: contenido('Carta de bienvenida al inquilino', ['arrendatario', 'direccion', 'fecha_inicio']),
  };
  return [...legales, propia];
}

// ─── Lo generado ────────────────────────────────────────────────────────────

const DOCUMENTOS: readonly [keyof typeof CONTRATOS, number, EstadoDeDocumento, number, string[]][] = [
  // contrato, plantilla (índice en PLANTILLAS_LEGALES), estado, hace cuántos días, quiénes firmaron
  ['mariana', 0, 'PENDING_SIGNATURE', 1, ['propietario']],
  ['juanPablo', 5, 'DOC_DRAFT', 2, []],
  ['laura', 2, 'DOC_SIGNED', 4, ['inquilino', 'propietario']],
  ['andres', 7, 'DOC_SIGNED', 6, []],
  ['felipe', 6, 'DOC_SIGNED', 9, []],
  ['felipe', 3, 'DOC_SIGNED', 12, ['inquilino', 'propietario']],
  ['valentina', 4, 'DOC_SIGNED', 18, ['inquilino']],
  ['local', 1, 'DOC_SIGNED', 27, ['inquilino', 'propietario']],
  ['laura', 0, 'DOC_SIGNED', 35, ['inquilino', 'propietario']],
  ['valentina', 5, 'DOC_EXPIRED', 64, []],
];

function correo(nombre: string): string {
  return `${nombre.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}@correo-demo.test`;
}

function documentos(): DocumentoGenerado[] {
  return DOCUMENTOS.map(([clave, p, estado, dias, firmaron], i) => {
    const c = CONTRATOS[clave];
    const [codigo, nombre, categoria] = PLANTILLAS_LEGALES[p];
    const firmas = (['inquilino', 'propietario'] as const)
      .filter((quien) => codigo.startsWith('CONTRATO') || firmaron.includes(quien))
      .map((quien) => {
        const persona = quien === 'inquilino' ? c.inquilino : c.propietario;
        return {
          signerName: persona,
          signerEmail: correo(persona),
          signedAt: firmaron.includes(quien) ? haceRato(dias * DIA - 3 * HORA) : undefined,
        };
      });
    return {
      id: `demo-dl-${i + 1}`,
      name: `${nombre} · ${c.inquilino}`,
      status: estado,
      createdAt: haceRato(dias * DIA),
      updatedAt: haceRato(dias * DIA - 3 * HORA),
      signatures: firmas,
      template: { id: `demo-pt-${p + 1}`, name: nombre, category: categoria, codigo },
      consignacion: { id: `${c.id}-inmueble`, propertyTitle: c.inmueble },
      contract: {
        id: c.id,
        code: c.code,
        externalId: null,
        propertyAddress: c.direccion,
        propertyCity: c.ciudad,
        tenantName: c.inquilino,
        landlordName: c.propietario,
      },
    };
  });
}

// ─── Las actas ──────────────────────────────────────────────────────────────

/** Un acta como la manda el back (`actaDelBack` la traduce al vocabulario del panel). */
function acta(
  id: string,
  clave: keyof typeof CONTRATOS,
  tipo: 'ENTREGA' | 'DEVOLUCION',
  estado: 'ACTA_DRAFT' | 'ACTA_IN_PROGRESS' | 'PENDING_SIGNATURES' | 'ACTA_COMPLETED',
  dias: number,
  firmaron: ('INQUILINO' | 'ASESOR' | 'PROPIETARIO')[],
): Record<string, unknown> {
  const c = CONTRATOS[clave];
  const cuando = haceRato(dias * DIA);
  const devolucion = tipo === 'DEVOLUCION';
  return {
    id,
    type: tipo,
    status: estado,
    propertyId: `${c.id}-inmueble`,
    propertyTitle: c.inmueble,
    propertyAddress: `${c.direccion}, ${c.ciudad}`,
    consignacionId: `${c.id}-consignacion`,
    leaseId: c.id,
    tenantId: `${c.id}-inquilino`,
    tenantName: c.inquilino,
    tenantCedula: c.documento,
    tenantPhone: '+57 300 555 0142',
    tenantEmail: correo(c.inquilino),
    propietarioId: `${c.id}-propietario`,
    propietarioName: c.propietario,
    agenteId: 'demo-ag-1',
    agenteName: 'Daniela Restrepo',
    fechaDeEntrega: cuando,
    rooms: ['sala', 'cocina', 'habitacion_principal', 'habitacion_2', 'bano_principal', 'balcon'],
    items: [
      { id: `${id}-i1`, room: 'sala', name: 'Piso en porcelanato', quantity: 1, condition: 'bueno', hasDefects: false },
      { id: `${id}-i2`, room: 'sala', name: 'Ventanal con persiana', quantity: 2, condition: 'bueno', hasDefects: false },
      { id: `${id}-i3`, room: 'cocina', name: 'Estufa a gas de 4 puestos', quantity: 1, condition: 'excelente', hasDefects: false },
      { id: `${id}-i4`, room: 'cocina', name: 'Mueble superior e inferior', quantity: 1, condition: devolucion ? 'regular' : 'bueno', hasDefects: devolucion, defectDescription: devolucion ? 'Una puerta descolgada' : undefined },
      { id: `${id}-i5`, room: 'habitacion_principal', name: 'Clóset de madera', quantity: 1, condition: 'bueno', hasDefects: false },
      { id: `${id}-i6`, room: 'bano_principal', name: 'Mampara de vidrio', quantity: 1, condition: devolucion ? 'malo' : 'excelente', hasDefects: devolucion, defectDescription: devolucion ? 'Vidrio con una fisura' : undefined },
      { id: `${id}-i7`, room: 'balcon', name: 'Baranda en aluminio', quantity: 1, condition: 'bueno', hasDefects: false },
    ],
    meterReadings: [
      { type: 'agua', reading: devolucion ? '01284' : '00871', unit: 'm³' },
      { type: 'luz', reading: devolucion ? '25410' : '21987', unit: 'kWh' },
      { type: 'gas', reading: devolucion ? '00932' : '00610', unit: 'm³' },
    ],
    keysDelivered: [
      { type: 'Llave de la puerta principal', quantity: 2 },
      { type: 'Control del parqueadero', quantity: 1 },
      { type: 'Tarjeta de la portería', quantity: 2 },
    ],
    generalCondition: devolucion ? 'FAIR' : 'GOOD',
    generalObservations: devolucion
      ? 'Se recibe con desgaste normal; la mampara y una puerta de la cocina se descuentan del depósito.'
      : 'Se entrega pintado y aseado, con todos los servicios al día.',
    signatures: firmaron.map((papel) => ({
      signerName: papel === 'INQUILINO' ? c.inquilino : papel === 'PROPIETARIO' ? c.propietario : 'Daniela Restrepo',
      signerRole: papel,
      signedAt: haceRato(dias * DIA - 2 * HORA),
    })),
    ...(devolucion
      ? {
          depositAmount: 2_800_000,
          deductions: [
            { concept: 'Cambio de la mampara del baño', amount: 480_000 },
            { concept: 'Arreglo de la puerta de la cocina', amount: 120_000 },
          ],
          depositToReturn: 2_200_000,
        }
      : {}),
    createdAt: haceRato((dias + 1) * DIA),
    updatedAt: haceRato(dias * DIA - 2 * HORA),
    completedAt: estado === 'ACTA_COMPLETED' ? haceRato(dias * DIA - 2 * HORA) : undefined,
  };
}

function actas(): Record<string, unknown>[] {
  return [
    acta('demo-acta-1', 'mariana', 'ENTREGA', 'ACTA_IN_PROGRESS', 0, []),
    acta('demo-acta-2', 'felipe', 'DEVOLUCION', 'PENDING_SIGNATURES', 3, ['ASESOR', 'INQUILINO']),
    acta('demo-acta-3', 'laura', 'ENTREGA', 'ACTA_COMPLETED', 4, ['ASESOR', 'INQUILINO', 'PROPIETARIO']),
    acta('demo-acta-4', 'valentina', 'ENTREGA', 'ACTA_COMPLETED', 18, ['ASESOR', 'INQUILINO', 'PROPIETARIO']),
  ];
}

export const DOCUMENTOS_DEMO: readonly LecturaDeLaDemo[] = [
  { patron: /^\/inmobiliaria\/documents\/templates(\?|$)/, respuesta: plantillas },
  { patron: /^\/inmobiliaria\/documents(\?|$)/, respuesta: documentos },
  { patron: /^\/inmobiliaria\/actas\/demo-acta-[^/?]+$/, respuesta: (camino) => actas().find((a) => camino.endsWith(String(a.id))) ?? null },
  { patron: /^\/inmobiliaria\/actas(\?|$)/, respuesta: actas },
];
