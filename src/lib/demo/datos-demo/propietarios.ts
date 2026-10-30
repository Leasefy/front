/**
 * Arrendamientos → Propietarios con datos de ejemplo (el modo demo; Nico 30-10-2026: «la sección de demo de propietario
 * no vi ningún video»). Las mismas personas e inmuebles de la demo de Contratos (`./contratos.ts`), para que la demo
 * cuadre de una sección a otra. Personas, documentos, cuentas y cifras INVENTADAS: no son de ningún cliente.
 *
 * Dos con el giro atrasado (la lista abre en «Por girar», como en una cuenta de verdad), una ficha por completar
 * (le falta la cuenta) y una sin inmuebles arrendados.
 */
import type { Consignacion, InmuebleDelPropietario, Propietario } from '@/lib/types/inmobiliaria';
import type { LecturaDeLaDemo } from './index';

type Fila = {
  id: string;
  nombre: string;
  tipo: 'CC' | 'NIT';
  documento: string;
  ciudad: string;
  banco: string | null;
  ultimos4: string | null;
  inmuebles: Array<[direccion: string, canon: number | null, contrato: string | null]>;
  atrasado: number;
  desde: string | null;
  proximo: { fecha: string; monto: number } | null;
};

const COMISION = 10;

const FILAS: readonly Fila[] = [
  { id: 'demo-pr-1', nombre: 'Carlos Mejía', tipo: 'CC', documento: '70123456', ciudad: 'Medellín', banco: 'Bancolombia', ultimos4: '4821', inmuebles: [['Cra 43A # 18 Sur 135, apto 702', 2_350_000, 'demo-ct-1'], ['Cl 5 Sur # 25-80, apto 902', null, null]], atrasado: 2_115_000, desde: '2026-10-08', proximo: { fecha: '2026-11-08', monto: 2_115_000 } },
  { id: 'demo-pr-2', nombre: 'María Isabel Uribe', tipo: 'CC', documento: '43567890', ciudad: 'Envigado', banco: 'Davivienda', ultimos4: '0937', inmuebles: [['Cl 10 # 34-21, casa 4', 1_850_000, 'demo-ct-2']], atrasado: 0, desde: null, proximo: { fecha: '2026-11-08', monto: 1_665_000 } },
  { id: 'demo-pr-3', nombre: 'Inversiones Palmas SAS', tipo: 'NIT', documento: '900456789', ciudad: 'Medellín', banco: 'Banco de Bogotá', ultimos4: '5512', inmuebles: [['Cra 37 # 8A-56, local 2', 6_400_000, 'demo-ct-3']], atrasado: 5_760_000, desde: '2026-10-08', proximo: { fecha: '2026-11-08', monto: 5_760_000 } },
  { id: 'demo-pr-4', nombre: 'Jorge Arango', tipo: 'CC', documento: '8345612', ciudad: 'Sabaneta', banco: 'Bancolombia', ultimos4: '7260', inmuebles: [['Cl 79 Sur # 47E-80, apto 1504', 2_900_000, 'demo-ct-4']], atrasado: 0, desde: null, proximo: { fecha: '2026-11-08', monto: 2_610_000 } },
  { id: 'demo-pr-5', nombre: 'Luz Marina Henao', tipo: 'CC', documento: '32456789', ciudad: 'Medellín', banco: null, ultimos4: null, inmuebles: [['Cra 70 # 44-10, apto 301', 1_650_000, 'demo-ct-5']], atrasado: 0, desde: null, proximo: { fecha: '2026-11-08', monto: 1_485_000 } },
  { id: 'demo-pr-6', nombre: 'Ana Lucía Vélez', tipo: 'CC', documento: '42890123', ciudad: 'Bello', banco: 'Nequi', ultimos4: '3318', inmuebles: [['Cra 80 # 33-15, apto 210', null, null]], atrasado: 0, desde: null, proximo: null },
];

function inmueblesDe(f: Fila): InmuebleDelPropietario[] {
  return f.inmuebles.map(([direccion, canon, contrato], i) => {
    const comision = canon === null ? null : Math.round((canon * COMISION) / 100);
    return {
      consignacionId: `${f.id}-mandato-${i + 1}`,
      propertyId: `${f.id}-inmueble-${i + 1}`,
      propertyTitle: null,
      propertyAddress: direccion,
      esPrincipal: true,
      participacionBps: 10_000,
      arrendado: canon !== null,
      contratoId: contrato,
      canonDelContratoCop: canon,
      comisionPorcentaje: COMISION,
      canonCop: canon,
      comisionCop: comision,
      netoCop: canon === null || comision === null ? null : canon - comision,
    };
  });
}

/** En la forma del cable (el banco plano), como lo manda el back: el servicio lo normaliza. */
function propietario(f: Fila, conDetalle: boolean) {
  const inmuebles = inmueblesDe(f);
  const arrendados = inmuebles.filter((i) => i.arrendado);
  const canon = arrendados.reduce((s, i) => s + (i.canonCop ?? 0), 0);
  const comision = arrendados.reduce((s, i) => s + (i.comisionCop ?? 0), 0);
  const fila: Omit<Propietario, 'bankAccount'> & Record<string, unknown> = {
    id: f.id,
    name: f.nombre,
    email: `${f.nombre.split(' ')[0].toLowerCase()}@ejemplo.test`,
    phone: '300 555 0' + f.id.slice(-1).padStart(3, '0'),
    documentType: f.tipo,
    documentNumber: f.documento,
    digitoDeVerificacion: f.tipo === 'NIT' ? 7 : null,
    datosPendientes: f.banco ? [] : ['cuentaBancaria'],
    city: f.ciudad,
    department: 'Antioquia',
    propertyCount: inmuebles.length,
    copropiedadesCount: 0,
    activeLeases: arrendados.length,
    totalMonthlyRent: canon,
    totalCommission: comision,
    netToOwner: canon - comision,
    pendingBalance: f.atrasado,
    girosVencidos: f.atrasado > 0 ? 1 : 0,
    giroVencidoDesde: f.desde,
    generadoSinGirar: 0,
    proximoGiro: f.proximo,
    lastPaymentDate: f.banco ? '2026-09-08T15:00:00.000Z' : null,
    inmuebles: conDetalle ? inmuebles : undefined,
    cuentaDePortalId: null,
    tags: [],
    createdAt: '2025-01-10T15:00:00.000Z',
    updatedAt: '2026-10-01T15:00:00.000Z',
  };
  return {
    ...fila,
    bankName: f.banco,
    bankAccountType: f.banco ? 'AHORROS' : null,
    bankAccountNumber: conDetalle && f.banco ? `0000000${f.ultimos4}` : null,
    bankAccountHolder: f.banco ? f.nombre : null,
    bankAccountUltimos4: conDetalle ? null : f.ultimos4,
  };
}

/**
 * Las consignaciones (los inmuebles de cada uno, en la ficha): las mismas direcciones e inquilinos de Contratos. En la
 * forma del cable: el tipo de mandato va en mayúsculas (`RENT`), como lo manda el back y lo exige `normalizeConsignacion`.
 */
type ConsignacionDelCable = Omit<Consignacion, 'listingType'> & { listingType: 'RENT' };
const INQUILINOS: Record<string, string> = {
  'demo-ct-1': 'Laura Restrepo',
  'demo-ct-2': 'Andrés Gómez',
  'demo-ct-3': 'Comercializadora El Poblado SAS',
  'demo-ct-4': 'Valentina Ríos',
  'demo-ct-5': 'Juan Pablo Cardona',
};

function consignaciones(propietarioId: string | null): ConsignacionDelCable[] {
  return FILAS.filter((f) => !propietarioId || f.id === propietarioId).flatMap((f) =>
    inmueblesDe(f).map((i, n): ConsignacionDelCable => {
      const local = i.propertyAddress?.includes('local') ?? false;
      const casa = i.propertyAddress?.includes('casa') ?? false;
      return {
        id: i.consignacionId,
        propertyId: i.propertyId ?? `${f.id}-inmueble-${n + 1}`,
        propietarioId: f.id,
        copropietarios: [{ propietarioId: f.id, participacionBps: 10_000, propietario: { id: f.id, name: f.nombre } }],
        agenteId: 'demo-asesor',
        propertyTitle: `${local ? 'Local' : casa ? 'Casa' : 'Apartamento'} en ${f.ciudad}`,
        propertyAddress: i.propertyAddress ?? '',
        propertyCity: f.ciudad,
        propertyZone: f.ciudad === 'Medellín' ? 'El Poblado' : f.ciudad,
        propertyType: local ? 'commercial' : casa ? 'house' : 'apartment',
        monthlyRent: i.canonDelContratoCop,
        listingType: 'RENT',
        saleCommissionPercent: null,
        propertyCode: 2_000 + Number(f.id.slice(-1)) * 10 + n,
        propertyStatus: i.arrendado ? 'RENTED' : 'AVAILABLE',
        arrendado: i.arrendado,
        commissionPercent: COMISION,
        contractDate: '2025-01-10',
        status: 'active',
        availability: i.arrendado ? 'rented' : 'available',
        currentLeaseId: i.contratoId ?? undefined,
        currentTenantName: i.contratoId ? INQUILINOS[i.contratoId] : undefined,
        inquilino: null,
        createdAt: '2025-01-10T15:00:00.000Z',
        updatedAt: '2026-10-01T15:00:00.000Z',
      };
    }),
  );
}

export const PROPIETARIOS_DEMO: readonly LecturaDeLaDemo[] = [
  // Sólo los inmuebles de UNO de estos propietarios (la ficha): la lista general de consignaciones es de la demo de
  // Mantenimientos (su formulario de «Nueva solicitud»). Por eso va antes que ella en el registro.
  {
    patron: /^\/inmobiliaria\/consignaciones\?(.*&)?propietarioId=demo-pr-/,
    respuesta: (camino) => consignaciones(new URLSearchParams(camino.split('?')[1] ?? '').get('propietarioId')),
  },
  { patron: /^\/inmobiliaria\/propietarios(\?|$)/, respuesta: () => FILAS.map((f) => propietario(f, false)) },
  {
    patron: /^\/inmobiliaria\/propietarios\/demo-pr-[^/?]+$/,
    respuesta: (camino) => {
      const f = FILAS.find((x) => camino.endsWith(x.id));
      return f ? propietario(f, true) : null;
    },
  },
];
