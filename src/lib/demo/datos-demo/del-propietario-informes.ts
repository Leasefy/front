/**
 * El propietario independiente → Informes con datos de ejemplo (el modo demo; Nico 30-10-2026: «ver cómo quedaría
 * pintada cada sección»). El certificado de ingresos del apartamento de las demás demos (Cra 43A): hasta febrero de
 * 2026 lo tenía una empresa por $2.200.000, que le retenía el 3,5 % (el certificado de la retención de 2025 está en la
 * demo de Certificados); desde marzo está con Laura Restrepo, por $2.350.000. Noviembre y diciembre de 2026 no se han
 * causado. Comisión del 10 %, como
 * en Giros. Las reparaciones son las del historial de Aprobaciones. Cifras INVENTADAS.
 *
 * 🔴 `/portal/propietario/informes` es también la pregunta del portal «¿tiene ficha con una inmobiliaria?»
 * (`useContratosAdministrados`): el portal la hace con `apiClient.getDeVerdad`.
 */
import type {
  CertificadoDeIngresos,
  InformesDisponibles,
  MesDelCertificado,
  ReparacionDelPropietario,
} from '@/lib/api/informes-del-propietario.service';
import type { LecturaDeLaDemo } from './index';

const INMUEBLE = 'Cra 43A # 18 Sur 135, apto 702';
/** La comisión del 10 %, en pesos enteros (`canon / 10`: `canon * 0.1` deja una cola de flotante). */
const comisionDe = (canon: number) => canon / 10;
/** La retención en la fuente del 3,5 % que le practicaba la empresa (la que pagaba $2.200.000); Laura no retiene. */
const retencionDe = (canon: number) => (canon === 2_200_000 ? (canon * 35) / 1000 : 0);

/** El canon de cada mes de un año (0 = desocupado). */
const CANON_POR_ANIO: Readonly<Record<number, readonly number[]>> = {
  2025: Array.from({ length: 12 }, () => 2_200_000),
  2026: [2_200_000, 2_200_000, 2_350_000, 2_350_000, 2_350_000, 2_350_000, 2_350_000, 2_350_000, 2_350_000, 2_350_000, 0, 0],
};

function certificado(anio: number): CertificadoDeIngresos {
  const canones = CANON_POR_ANIO[anio] ?? CANON_POR_ANIO[2025]!;
  const meses: MesDelCertificado[] = canones.flatMap((canon, i) =>
    canon > 0 ? [{ mes: `${anio}-${String(i + 1).padStart(2, '0')}`, ingresoBrutoCop: canon, ivaCop: 0, comisionCop: comisionDe(canon), retenidoCop: retencionDe(canon) }] : [],
  );
  const ingreso = meses.reduce((s, m) => s + m.ingresoBrutoCop, 0);
  const comision = meses.reduce((s, m) => s + m.comisionCop, 0);
  const retenido = meses.reduce((s, m) => s + m.retenidoCop, 0);
  return {
    anio,
    ingresoBrutoCop: ingreso,
    ivaCop: 0,
    otrosConceptosCop: 0,
    comisionCop: comision,
    ivaComisionCop: 0,
    retencionesQueLePracticaronCop: retenido,
    retencionesQueElPracticoCop: 0,
    periodos: meses.length,
    periodosDelSistemaAnterior: 0,
    periodosAnulados: 0,
    meses,
    inmuebles: [{ contractId: anio === 2025 ? 'demo-ct-anterior' : 'demo-ct-1', inmueble: INMUEBLE, ingresoBrutoCop: ingreso, comisionCop: comision, retenidoCop: retenido }],
    advertencias: ['Sólo incluye lo que se recaudó por Leasefy: si recibiste arriendos por fuera, súmalos en tu declaración.'],
    motivo: null,
  };
}

const REPARACIONES: readonly ReparacionDelPropietario[] = [
  { id: 'demo-rep-1', fecha: '2026-09-12', inmueble: INMUEBLE, titulo: 'Daño eléctrico en la cocina', descripcion: 'Se cambió el breaker de la cocina (emergencia).', estado: 'Terminada', aCargoDelPropietarioCop: 340_000, fotos: [], comprobante: null, proveedor: 'Electricistas del Valle de Aburrá' },
  { id: 'demo-rep-2', fecha: '2026-08-21', inmueble: INMUEBLE, titulo: 'Cambio del flotador del sanitario', descripcion: 'Lo hizo el inquilino, a su cargo.', estado: 'Terminada', aCargoDelPropietarioCop: null, fotos: [], comprobante: null, proveedor: null },
  { id: 'demo-rep-3', fecha: '2026-07-04', inmueble: INMUEBLE, titulo: 'Cambio de la chapa de la puerta principal', descripcion: 'La chapa se trababa al cerrar.', estado: 'Terminada', aCargoDelPropietarioCop: 185_000, fotos: [], comprobante: null, proveedor: 'Cerrajería Envigado' },
];

const DISPONIBLES: InformesDisponibles = {
  fichas: [{ propietarioId: 'demo-pr-1', agencyId: 'demo-leasefy', agencia: 'Leasefy' }],
  anios: [2026, 2025],
  motivo: null,
};

export const INFORMES_DEL_PROPIETARIO_DEMO: readonly LecturaDeLaDemo[] = [
  { patron: /^\/portal\/propietario\/informes(\?|$)/, respuesta: () => DISPONIBLES },
  {
    patron: /^\/portal\/propietario\/certificado-de-ingresos(\?|$)/,
    respuesta: (camino) => certificado(Number(new URLSearchParams(camino.split('?')[1] ?? '').get('anio')) || 2025),
  },
  { patron: /^\/portal\/propietario\/reparaciones(\?|$)/, respuesta: () => ({ reparaciones: [...REPARACIONES], motivo: null }) },
];
