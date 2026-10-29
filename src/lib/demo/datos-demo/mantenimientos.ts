/**
 * Operación → Mantenimientos con datos de ejemplo (el modo demo). Inquilinos, propietarios, proveedores y direcciones
 * INVENTADOS: no son de ningún cliente. Las fechas se cuentan desde hoy, así la demo siempre se ve al día.
 *
 * Ocho solicitudes que recorren el flujo entero: una emergencia recién reportada, una cotizada que espera al
 * propietario, una aprobada y diferida en dos meses, una en curso, una que hace el propietario por su cuenta y dos
 * cerradas. La bandeja «con el propietario» cuenta las mismas.
 */
import type {
  BandejaConElPropietario,
  FilaConElPropietario,
  GrupoConElPropietario,
} from '@/lib/types/deducciones';
import type { SolicitudMantenimiento } from '@/lib/types/inmobiliaria';
import { mantenimientoAlBack, PRIORIDAD_AL_BACK } from '@/lib/api/mantenimiento-enums';
import type { LecturaDeLaDemo } from './index';

const HORA = 3_600_000;
const DIA = 24 * HORA;

const haceRato = (ms: number) => new Date(Date.now() - ms).toISOString();
const mesDesdeHoy = (n: number) => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1)).toISOString().slice(0, 7);
};

interface InmuebleDeEjemplo {
  consignacionId: string;
  propertyId: string;
  titulo: string;
  direccion: string;
  zona: string;
  inquilino: string;
  propietario: string;
  propietarioId: string;
}

const INMUEBLES: readonly InmuebleDeEjemplo[] = [
  { consignacionId: 'demo-mc-1', propertyId: 'demo-mp-1', titulo: 'Apartamento en El Poblado', direccion: 'Cra 43A # 18 Sur 135, apto 702, Medellín', zona: 'El Poblado', inquilino: 'Laura Restrepo', propietario: 'Carlos Mejía', propietarioId: 'demo-mo-1' },
  { consignacionId: 'demo-mc-2', propertyId: 'demo-mp-2', titulo: 'Casa en Sabaneta', direccion: 'Cl 10 # 34-21, casa 4, Sabaneta', zona: 'Sabaneta', inquilino: 'Andrés Gómez', propietario: 'Beatriz Uribe', propietarioId: 'demo-mo-2' },
  { consignacionId: 'demo-mc-3', propertyId: 'demo-mp-3', titulo: 'Apartamento en Aves María', direccion: 'Cl 79 Sur # 47E-80, apto 1504, Sabaneta', zona: 'Aves María', inquilino: 'Valentina Ríos', propietario: 'Jorge Arango', propietarioId: 'demo-mo-3' },
  { consignacionId: 'demo-mc-4', propertyId: 'demo-mp-4', titulo: 'Apartamento en Laureles', direccion: 'Cra 70 # 44-10, apto 301, Medellín', zona: 'Laureles', inquilino: 'Juan Pablo Cardona', propietario: 'Lucía Henao', propietarioId: 'demo-mo-4' },
  { consignacionId: 'demo-mc-5', propertyId: 'demo-mp-5', titulo: 'Apartamento en Envigado', direccion: 'Cl 5 Sur # 25-80, apto 902, Envigado', zona: 'Envigado', inquilino: 'Mariana Ochoa', propietario: 'Ricardo Posada', propietarioId: 'demo-mo-5' },
  { consignacionId: 'demo-mc-6', propertyId: 'demo-mp-6', titulo: 'Local en El Poblado', direccion: 'Cra 37 # 8A-56, local 2, Medellín', zona: 'El Poblado', inquilino: 'Comercializadora El Poblado SAS', propietario: 'Inversiones Arango Henao', propietarioId: 'demo-mo-6' },
  { consignacionId: 'demo-mc-7', propertyId: 'demo-mp-7', titulo: 'Apartamento en Castropol', direccion: 'Cra 25 # 1A Sur-155, apto 1102, Medellín', zona: 'Castropol', inquilino: 'Sofía Vélez', propietario: 'Martha Londoño', propietarioId: 'demo-mo-7' },
  { consignacionId: 'demo-mc-8', propertyId: 'demo-mp-8', titulo: 'Casa en Belén', direccion: 'Cl 30A # 76-41, casa 12, Medellín', zona: 'Belén', inquilino: 'Felipe Zuluaga', propietario: 'Hernán Restrepo', propietarioId: 'demo-mo-8' },
];

function base(i: number, id: string, creada: number): Pick<
  SolicitudMantenimiento,
  | 'id' | 'consignacionId' | 'propertyId' | 'propietarioId' | 'tenantId' | 'agenteId' | 'propertyTitle'
  | 'propertyAddress' | 'tenantName' | 'propietarioName' | 'createdAt' | 'updatedAt' | 'quotes' | 'photoUrls'
> {
  const x = INMUEBLES[i];
  return {
    id,
    consignacionId: x.consignacionId,
    propertyId: x.propertyId,
    propietarioId: x.propietarioId,
    tenantId: `demo-mt-${i + 1}`,
    agenteId: 'demo-agente',
    propertyTitle: x.titulo,
    propertyAddress: x.direccion,
    tenantName: x.inquilino,
    propietarioName: x.propietario,
    createdAt: haceRato(creada),
    updatedAt: haceRato(Math.max(creada - 2 * HORA, HORA / 2)),
    quotes: [],
    photoUrls: [],
  };
}

function solicitudes(): SolicitudMantenimiento[] {
  return [
    {
      ...base(0, 'demo-mant-1', 2 * HORA),
      type: 'plumbing',
      priority: 'emergency',
      title: 'Fuga de agua debajo del lavaplatos',
      description: 'El agua sale por la unión del sifón y ya mojó el mueble de la cocina. La inquilina cerró el registro.',
      status: 'reported',
      paidBy: 'owner',
      reportadaPor: { nombre: 'Laura Restrepo', quien: 'INQUILINO' },
      pqrs: { id: 'demo-pqrs-mant-1', radicado: 'PQRS-0044' },
    },
    {
      ...base(1, 'demo-mant-2', 26 * HORA),
      type: 'electrical',
      priority: 'medium',
      title: 'Tomacorriente de la sala sin energía',
      description: 'Dejó de funcionar el doble de la pared del televisor; los demás de la sala sí tienen energía.',
      status: 'reported',
      paidBy: 'owner',
      reportadaPor: { nombre: 'Andrés Gómez', quien: 'INQUILINO' },
    },
    {
      ...base(2, 'demo-mant-3', 3 * DIA),
      type: 'appliance',
      priority: 'high',
      title: 'El calentador de gas no enciende',
      description: 'Hace chispa pero no prende la llama. El técnico de la primera visita sospecha del termopar.',
      status: 'quoted',
      paidBy: 'owner',
      reportadaPor: { nombre: 'Valentina Ríos', quien: 'INQUILINO' },
      quotes: [
        { id: 'demo-cot-3a', providerName: 'Gas y Agua Sabaneta', providerPhone: '3104567890', amount: 380_000, description: 'Cambio del termopar y mantenimiento del calentador.', estimatedDays: 1, createdAt: haceRato(2 * DIA) },
        { id: 'demo-cot-3b', providerName: 'Técnicos del Valle', providerPhone: '3017654321', amount: 420_000, description: 'Termopar, válvula piloto y prueba de escapes.', estimatedDays: 2, createdAt: haceRato(2 * DIA - 3 * HORA) },
      ],
      selectedQuoteId: 'demo-cot-3a',
      aprobacionDelPropietario: {
        id: 'demo-aprob-3',
        solicitudId: 'demo-mant-3',
        quoteId: 'demo-cot-3a',
        consignacionId: 'demo-mc-3',
        propietarioId: 'demo-mo-3',
        valorCop: 380_000,
        motivo: 'Cambio del termopar del calentador de gas',
        estado: 'PENDIENTE',
        emergencia: false,
        motivoDeEmergencia: null,
        soporteNombre: 'cotizacion-gas-y-agua.pdf',
        aviso: null,
        pedidaAt: haceRato(40 * HORA),
        decididaAt: null,
        motivoDeRechazo: null,
        anuladaAt: null,
        motivoDeAnulacion: null,
      },
    },
    {
      ...base(3, 'demo-mant-4', 6 * DIA),
      type: 'painting',
      priority: 'medium',
      title: 'Pintar la habitación principal',
      description: 'Manchas de humedad ya tratadas; falta pintar techo y paredes de la habitación principal.',
      status: 'approved',
      paidBy: 'owner',
      reportadaPor: { nombre: 'Diana Prueba', quien: 'INMOBILIARIA' },
      quotes: [
        { id: 'demo-cot-4a', providerName: 'Pinturas y Acabados Laureles', providerPhone: '3125558899', amount: 650_000, description: 'Estuco donde haga falta y dos manos de vinilo tipo 1.', estimatedDays: 3, createdAt: haceRato(5 * DIA) },
      ],
      selectedQuoteId: 'demo-cot-4a',
      approvedAmount: 650_000,
      proveedor: { id: 'demo-prov-4', nombre: 'Pinturas y Acabados Laureles', telefono: '3125558899', activo: true },
      diferida: {
        PROPIETARIO: {
          conceptoId: 'demo-concepto-4',
          contractId: 'demo-contrato-4',
          valorCop: 650_000,
          plan: [
            { mes: mesDesdeHoy(1), valorCop: 325_000 },
            { mes: mesDesdeHoy(2), valorCop: 325_000 },
          ],
        },
      },
    },
    {
      ...base(4, 'demo-mant-5', 2 * DIA),
      type: 'locks',
      priority: 'high',
      title: 'Cambiar la chapa de la puerta principal',
      description: 'La llave se queda trabada y desde ayer no gira. Se cambia la chapa completa con tres copias.',
      status: 'in_progress',
      paidBy: 'owner',
      reportadaPor: { nombre: 'Mariana Ochoa', quien: 'INQUILINO' },
      quotes: [
        { id: 'demo-cot-5a', providerName: 'Cerrajería La 33', providerPhone: '3009871234', amount: 180_000, description: 'Chapa de seguridad nueva, instalación y tres copias.', estimatedDays: 1, createdAt: haceRato(40 * HORA) },
      ],
      selectedQuoteId: 'demo-cot-5a',
      approvedAmount: 180_000,
      proveedor: { id: 'demo-prov-5', nombre: 'Cerrajería La 33', telefono: '3009871234', activo: true },
    },
    {
      ...base(7, 'demo-mant-8', 4 * DIA),
      type: 'structural',
      priority: 'low',
      title: 'Reja del antejardín desajustada',
      description: 'La bisagra de abajo se soltó y la reja roza el piso al abrir.',
      status: 'reported',
      paidBy: 'owner',
      reportadaPor: { nombre: 'Felipe Zuluaga', quien: 'INQUILINO' },
      laHaceElPropietario: {
        loDecidio: 'PROPIETARIO',
        nota: 'La arregla su maestro de confianza esta semana.',
        desde: haceRato(3 * DIA),
        terminadaAt: null,
        terminadaNota: null,
      },
    },
    {
      ...base(5, 'demo-mant-6', 12 * DIA),
      type: 'other',
      priority: 'low',
      title: 'Revisar la humedad del baño social',
      description: 'Mancha en la pared que da al baño. Se selló la regadera y se pintó con antihumedad.',
      status: 'completed',
      paidBy: 'owner',
      reportadaPor: { nombre: 'Comercializadora El Poblado SAS', quien: 'INQUILINO' },
      quotes: [
        { id: 'demo-cot-6a', providerName: 'Mantenimientos Integrales MDE', providerPhone: '3145552211', amount: 240_000, description: 'Sellado de la regadera y pintura antihumedad.', estimatedDays: 2, createdAt: haceRato(11 * DIA) },
      ],
      selectedQuoteId: 'demo-cot-6a',
      approvedAmount: 240_000,
      proveedor: { id: 'demo-prov-6', nombre: 'Mantenimientos Integrales MDE', telefono: '3145552211', activo: true },
      completedAt: haceRato(5 * DIA),
      completionNotes: 'Quedó sellada y pintada. Se revisa otra vez en un mes.',
    },
    {
      ...base(6, 'demo-mant-7', 15 * DIA),
      type: 'plumbing',
      priority: 'medium',
      title: 'Destapar el sifón de la ducha',
      description: 'El agua se demora en bajar. Se destapó el sifón y se cambió la rejilla.',
      status: 'completed',
      paidBy: 'tenant',
      reportadaPor: { nombre: 'Sofía Vélez', quien: 'INQUILINO' },
      quotes: [
        { id: 'demo-cot-7a', providerName: 'Gas y Agua Sabaneta', providerPhone: '3104567890', amount: 120_000, description: 'Destape del sifón y rejilla nueva.', estimatedDays: 1, createdAt: haceRato(14 * DIA) },
      ],
      selectedQuoteId: 'demo-cot-7a',
      approvedAmount: 120_000,
      proveedor: { id: 'demo-prov-7', nombre: 'Gas y Agua Sabaneta', telefono: '3104567890', activo: true },
      completedAt: haceRato(9 * DIA),
      completionNotes: 'Destapado. El inquilino lo paga con su próximo canon.',
    },
  ];
}

function lista(camino: string): Record<string, unknown>[] {
  const estado = /[?&]status=([A-Z_]+)/.exec(camino)?.[1];
  return solicitudes()
    .map((s) => mantenimientoAlBack(s))
    .filter((s) => !estado || s.status === estado);
}

function una(camino: string): Record<string, unknown> | null {
  const id = /\/mantenimiento\/(demo-mant-[^/?]+)$/.exec(camino)?.[1];
  const s = solicitudes().find((x) => x.id === id);
  return s ? mantenimientoAlBack(s) : null;
}

function filasConElPropietario(): FilaConElPropietario[] {
  return solicitudes().flatMap((s): FilaConElPropietario[] => {
    const comun = { solicitudId: s.id, reparacion: s.title, inmueble: s.propertyAddress, propietario: s.propietarioName, prioridad: PRIORIDAD_AL_BACK[s.priority] };
    if (s.aprobacionDelPropietario?.estado === 'PENDIENTE') {
      const a = s.aprobacionDelPropietario;
      return [{ ...comun, grupo: 'ESPERANDO', aprobacionId: a.id, valorCop: a.valorCop, desde: a.pedidaAt, motivoDeRechazo: null, nota: null, loDecidio: null, venceAt: new Date(Date.parse(a.pedidaAt) + 3 * DIA).toISOString() }];
    }
    if (s.laHaceElPropietario && !s.laHaceElPropietario.terminadaAt) {
      const h = s.laHaceElPropietario;
      return [{ ...comun, grupo: 'LA_HACE_EL', aprobacionId: null, valorCop: null, desde: h.desde, motivoDeRechazo: null, nota: h.nota, loDecidio: h.loDecidio, venceAt: null }];
    }
    return [];
  });
}

function bandeja(camino: string): BandejaConElPropietario {
  const filas = filasConElPropietario();
  const grupos: GrupoConElPropietario[] = ['ESPERANDO', 'RECHAZADAS', 'LA_HACE_EL'];
  const conteos = Object.fromEntries(grupos.map((g) => [g, filas.filter((f) => f.grupo === g).length])) as Record<GrupoConElPropietario, number>;
  const pedido = /[?&]grupo=([A-Z_]+)/.exec(camino)?.[1] as GrupoConElPropietario | undefined;
  const grupo = pedido && grupos.includes(pedido) ? pedido : (grupos.find((g) => conteos[g] > 0) ?? 'ESPERANDO');
  const q = decodeURIComponent(/[?&]q=([^&]+)/.exec(camino)?.[1] ?? '').replace(/\+/g, ' ').trim().toLowerCase();
  const delGrupo = filas.filter((f) => f.grupo === grupo && (!q || `${f.reparacion} ${f.inmueble} ${f.propietario}`.toLowerCase().includes(q)));
  return { grupo, conteos, filas: delGrupo, total: delGrupo.length, pagina: 1, porPagina: 20 };
}

/** Los inmuebles arrendados (los pide el formulario de «Nueva solicitud»), como los manda el back. */
function inmuebles(): Record<string, unknown>[] {
  return INMUEBLES.map((x) => ({
    id: x.consignacionId,
    propertyId: x.propertyId,
    propertyTitle: x.titulo,
    propertyAddress: x.direccion,
    propertyZone: x.zona,
    propietarioId: x.propietarioId,
    propietarioName: x.propietario,
    currentTenantName: x.inquilino,
    status: 'ACTIVE',
    availability: 'RENTED',
    propertyType: 'APARTMENT',
    listingType: 'RENT',
  }));
}

export const MANTENIMIENTOS_DEMO: readonly LecturaDeLaDemo[] = [
  { patron: /^\/inmobiliaria\/mantenimiento\/con-el-propietario(\?|$)/, respuesta: bandeja },
  { patron: /^\/inmobiliaria\/mantenimiento\/demo-mant-[^/?]+$/, respuesta: una },
  { patron: /^\/inmobiliaria\/mantenimiento(\?|$)/, respuesta: lista },
  { patron: /^\/inmobiliaria\/consignaciones(\?|$)/, respuesta: inmuebles },
];
