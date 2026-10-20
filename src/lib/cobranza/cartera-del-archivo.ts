/**
 * La cartera que sube una inmobiliaria, leída como venga.
 *
 * Nico, 20-10-2026: «ellos pueden subir como quieran y deberíamos tomarlo».
 * El archivo del cliente traía «Contrato · Documento Inquilino · Inquilino ·
 * Valor adeudado a la fecha · Contacto» y el importador dijo que a las 26 filas
 * les faltaba el documento, el nombre y el teléfono. Tenían los tres.
 *
 * Esto arma, fila por fila, lo que el micro necesita para crear al deudor
 * (`POST /api/agency/:id/cartera/import`, filas JSON con las claves que el
 * micro ya conoce) y dice en español lo que no se pudo leer.
 *
 * 🔴 El vencimiento (Nico, 20-10): si el archivo no lo trae, se SACA DEL
 * CONTRATO EN LEASEFY —por el número de contrato o por el documento del
 * inquilino, la cuota más vieja con saldo— y sólo si no aparece se le pregunta
 * a la persona. Sin vencimiento no hay días de mora y la fila no entra a
 * cobranza: inventarlo dispararía llamadas y cartas con cifras falsas.
 */

import { parsearFechaDeExtracto, parsearValorCop } from '@/lib/cobros/extracto-bancario';
import type { CarteraDeInquilinos } from '@/lib/api/cartera.types';
import {
  correoDeLaCelda,
  documentoDeLaCelda,
  normalizarEncabezado,
  telefonosDeLaCelda,
  textoDeLaCelda,
  type CampoReconocible,
  type Mapeo,
} from '@/lib/importar/reconocer-columnas';

export type CampoDeCartera =
  | 'documento'
  | 'tipoDocumento'
  | 'nombre'
  | 'nombres'
  | 'apellidos'
  | 'telefono'
  | 'telefono2'
  | 'correo'
  | 'deuda'
  | 'vencimiento'
  | 'contrato'
  | 'inmueble'
  | 'periodo'
  | 'canon'
  | 'administracion'
  | 'interesDeMora'
  | 'otros';

/** De quién NO es el dato aunque la columna diga «documento» o «teléfono». */
const DE_OTRA_PERSONA = ['propietario', 'codeudor', 'fiador', 'deudor solidario', 'asesor', 'agente', 'arrendador'];

export const CAMPOS_DE_CARTERA: readonly CampoReconocible<CampoDeCartera>[] = [
  {
    campo: 'documento',
    etiqueta: 'Documento',
    requerido: true,
    tipo: 'documento',
    sinonimos: [
      'documento', 'numero documento', 'numero de documento', 'documento de identidad', 'documento inquilino',
      'documento del inquilino', 'documento arrendatario', 'cedula', 'cedula inquilino', 'cedula arrendatario',
      'cedula de ciudadania', 'cc', 'cc nit', 'nit cc', 'identificacion', 'numero identificacion',
      'numero de identificacion', 'nit', 'id inquilino', 'doc', 'numero doc', 'documento cliente', 'cedula cliente',
      'documento deudor', 'cedula deudor', 'identificacion inquilino',
    ],
    palabras: ['documento', 'cedula', 'identificacion', 'nit', 'cc', 'doc'],
    evitar: [...DE_OTRA_PERSONA, 'tipo', 'fecha', 'expedicion', 'lugar'],
  },
  {
    campo: 'tipoDocumento',
    etiqueta: 'Tipo de documento',
    tipo: 'codigo',
    sinonimos: ['tipo documento', 'tipo de documento', 'tipo id', 'tipo identificacion', 'tipo de identificacion', 'tipo doc'],
    evitar: DE_OTRA_PERSONA,
  },
  {
    campo: 'nombre',
    etiqueta: 'Nombre',
    requerido: true,
    tipo: 'nombre',
    sinonimos: [
      'nombre', 'nombre completo', 'nombres y apellidos', 'nombre y apellido', 'inquilino', 'arrendatario',
      'nombre inquilino', 'nombre del inquilino', 'nombre arrendatario', 'nombre del arrendatario', 'cliente',
      'nombre cliente', 'nombre del cliente', 'deudor', 'nombre deudor', 'titular', 'razon social', 'tercero',
      'nombre tercero', 'locatario', 'arrendatario principal',
    ],
    palabras: ['nombre', 'inquilino', 'arrendatario', 'cliente', 'deudor', 'titular', 'tercero'],
    evitar: [
      ...DE_OTRA_PERSONA, 'documento', 'cedula', 'identificacion', 'nit', 'cc', 'telefono', 'celular', 'correo', 'email',
      'inmueble', 'propiedad', 'barrio', 'ciudad', 'banco', 'usuario', 'tipo', 'codigo', 'valor', 'saldo', 'deuda',
      'monto', 'fecha', 'dias', 'contacto',
    ],
  },
  {
    campo: 'nombres',
    etiqueta: 'Nombres',
    tipo: 'texto',
    sinonimos: ['nombres', 'primer nombre', 'nombres inquilino', 'nombres del inquilino'],
    evitar: DE_OTRA_PERSONA,
  },
  {
    campo: 'apellidos',
    etiqueta: 'Apellidos',
    tipo: 'texto',
    sinonimos: ['apellidos', 'primer apellido', 'apellidos inquilino', 'apellidos del inquilino'],
    evitar: DE_OTRA_PERSONA,
  },
  {
    campo: 'telefono',
    etiqueta: 'Teléfono',
    requerido: true,
    tipo: 'telefono',
    porLosValores: true,
    sinonimos: [
      'telefono', 'celular', 'movil', 'tel', 'cel', 'telefono celular', 'numero celular', 'numero de celular',
      'telefono inquilino', 'celular inquilino', 'telefono del inquilino', 'telefono contacto', 'telefono de contacto',
      'contacto', 'whatsapp', 'numero whatsapp', 'telefono 1', 'celular 1', 'telefonos', 'celulares',
      'numero telefono', 'numero de telefono', 'phone', 'telefono movil', 'tel contacto', 'cel contacto',
      'telefono cliente', 'celular cliente',
    ],
    palabras: ['telefono', 'celular', 'movil', 'tel', 'cel', 'contacto', 'whatsapp', 'telefonos', 'celulares'],
    evitar: DE_OTRA_PERSONA,
  },
  {
    campo: 'telefono2',
    etiqueta: 'Otro teléfono',
    tipo: 'telefono',
    sinonimos: [
      'telefono 2', 'telefono2', 'celular 2', 'telefono secundario', 'otro telefono', 'telefono alterno',
      'telefono fijo', 'fijo', 'telefono adicional', 'celular secundario', 'tel 2',
    ],
    evitar: DE_OTRA_PERSONA,
  },
  {
    campo: 'correo',
    etiqueta: 'Correo',
    tipo: 'correo',
    porLosValores: true,
    sinonimos: ['correo', 'email', 'e mail', 'correo electronico', 'mail', 'correo inquilino', 'email inquilino', 'correo del inquilino'],
    palabras: ['correo', 'email', 'mail', 'contacto'],
    evitar: DE_OTRA_PERSONA,
  },
  {
    campo: 'deuda',
    etiqueta: 'Valor adeudado',
    tipo: 'plata',
    sinonimos: [
      'valor adeudado', 'saldo', 'saldo pendiente', 'saldo total', 'saldo en mora', 'saldo vencido', 'saldo a la fecha',
      'deuda', 'deuda total', 'total deuda', 'valor deuda', 'monto', 'monto adeudado', 'valor', 'valor total', 'total',
      'total adeudado', 'adeudado', 'valor pendiente', 'cartera', 'valor cartera', 'total cartera', 'valor en mora',
      'valor vencido', 'debe', 'total a pagar', 'valor a pagar', 'obligacion', 'capital', 'saldo cartera',
    ],
    palabras: ['saldo', 'deuda', 'adeudado', 'monto', 'debe', 'pendiente', 'cartera', 'valor', 'total'],
    evitar: [
      'canon', 'arriendo', 'administracion', 'interes', 'intereses', 'dias', 'comision', 'iva', 'propietario',
      'codeudor', 'cuota', 'deposito', 'garantia',
    ],
  },
  {
    campo: 'vencimiento',
    etiqueta: 'Vencimiento',
    tipo: 'fecha',
    sinonimos: [
      'fecha vencimiento', 'fecha de vencimiento', 'vencimiento', 'fecha limite', 'fecha limite de pago',
      'fecha de pago', 'fecha pago', 'vence', 'fecha vence', 'mora desde', 'vencida desde', 'fecha mora',
      'fecha inicio mora', 'fecha de mora', 'desde', 'fecha cuota', 'fecha de la cuota',
    ],
    palabras: ['vencimiento', 'vence', 'limite'],
    evitar: ['valor', 'adeudado', 'saldo', 'monto', 'dias', 'contrato', 'firma', 'nacimiento', 'expedicion', 'ingreso', 'inicio contrato'],
  },
  {
    campo: 'contrato',
    etiqueta: 'Contrato',
    tipo: 'codigo',
    sinonimos: [
      'contrato', 'numero contrato', 'numero de contrato', 'numero del contrato', 'codigo contrato',
      'codigo del contrato', 'cod contrato', 'id contrato', 'contrato numero', 'consecutivo contrato',
      'ref contrato', 'referencia contrato', 'referencia',
    ],
    palabras: ['contrato'],
    evitar: ['fecha', 'inicio', 'fin', 'valor', 'canon', 'tipo', 'estado', 'duracion', 'vigencia'],
  },
  {
    campo: 'inmueble',
    etiqueta: 'Inmueble',
    tipo: 'texto',
    sinonimos: [
      'inmueble', 'direccion', 'direccion inmueble', 'direccion del inmueble', 'propiedad', 'apartamento', 'apto',
      'unidad', 'codigo inmueble', 'ubicacion', 'direccion propiedad', 'inmueble arrendado',
    ],
    palabras: ['inmueble', 'direccion', 'propiedad', 'apartamento'],
    evitar: ['propietario', 'correo', 'email', 'telefono', 'valor', 'canon', 'correspondencia', 'tipo', 'estado'],
  },
  {
    campo: 'periodo',
    etiqueta: 'Período',
    tipo: 'periodo',
    sinonimos: ['periodo', 'mes', 'periodo facturado', 'mes facturado', 'mes de cobro', 'periodo de cobro'],
    evitar: ['dias', 'meses', 'numero'],
  },
  {
    campo: 'canon',
    etiqueta: 'Canon',
    tipo: 'plata',
    sinonimos: ['canon', 'valor canon', 'canon arrendamiento', 'canon de arrendamiento', 'arriendo', 'valor arriendo', 'canon mensual'],
    palabras: ['canon', 'arriendo'],
    evitar: ['fecha', 'incremento', 'anterior', 'nuevo'],
  },
  {
    campo: 'administracion',
    etiqueta: 'Administración',
    tipo: 'plata',
    sinonimos: ['administracion', 'cuota administracion', 'cuota de administracion', 'valor administracion', 'admon', 'admin'],
    evitar: ['fecha'],
  },
  {
    campo: 'interesDeMora',
    etiqueta: 'Intereses de mora',
    tipo: 'plata',
    sinonimos: ['interes mora', 'intereses mora', 'intereses de mora', 'interes de mora', 'intereses', 'interes', 'recargo'],
    evitar: ['fecha', 'tasa', 'porcentaje'],
  },
  {
    campo: 'otros',
    etiqueta: 'Otros cobros',
    tipo: 'plata',
    sinonimos: ['otros', 'otros conceptos', 'otros cobros', 'servicios', 'servicios publicos'],
    evitar: ['fecha'],
  },
];

export function etiquetaDelCampoDeCartera(campo: CampoDeCartera): string {
  return CAMPOS_DE_CARTERA.find((c) => c.campo === campo)?.etiqueta ?? campo;
}

/** Una fila lista para mirar y para mandar. */
export interface FilaDeCartera {
  /** El número de la fila en el archivo, como lo ve la persona en Excel. */
  fila: number;
  documento: string | null;
  nombre: string | null;
  telefono: string | null;
  telefono2: string | null;
  correo: string | null;
  deuda: number | null;
  /** `YYYY-MM-DD`. */
  vencimiento: string | null;
  /** De dónde salió el vencimiento. */
  origenDelVencimiento: 'archivo' | 'contrato' | 'escrito' | null;
  contrato: string | null;
  inmueble: string | null;
  periodo: string | null;
  canon: number | null;
  administracion: number | null;
  interesDeMora: number | null;
  otros: number | null;
  tipoDocumento: string | null;
  /** Lo que impide crear al deudor («Falta el teléfono»). Vacío = se importa. */
  problemas: string[];
}

function celda(fila: Record<string, unknown>, mapeo: Mapeo<CampoDeCartera>, campo: CampoDeCartera): unknown {
  const columna = mapeo[campo];
  return columna === undefined ? undefined : fila[columna];
}

function texto(v: unknown): string | null {
  const s = textoDeLaCelda(v);
  return s === '' ? null : s;
}

function plata(v: unknown): number | null {
  const s = textoDeLaCelda(v);
  if (!s) return null;
  const n = parsearValorCop(s);
  return n === null || !Number.isFinite(n) ? null : n;
}

/** ¿La fila repite los encabezados? (un reporte con el título en cada página). */
function esEncabezadoRepetido(fila: Record<string, unknown>): boolean {
  const celdas = Object.entries(fila).filter(([k]) => k !== '_rowIndex');
  const iguales = celdas.filter(([k, v]) => normalizarEncabezado(v) !== '' && normalizarEncabezado(v) === normalizarEncabezado(k));
  return iguales.length >= 2;
}

/**
 * Las filas del archivo, ya leídas con el mapeo. Se saltan las vacías (sin
 * documento, nombre ni teléfono) y las que repiten los encabezados; las demás
 * salen todas, con sus `problemas` si les falta algo.
 */
export function armarFilasDeCartera(
  filas: readonly Record<string, unknown>[],
  mapeo: Mapeo<CampoDeCartera>,
): FilaDeCartera[] {
  const salida: FilaDeCartera[] = [];
  filas.forEach((f, i) => {
    if (esEncabezadoRepetido(f)) return;
    const numero = typeof f._rowIndex === 'number' ? f._rowIndex + 1 : i + 2;

    const documento = documentoDeLaCelda(celda(f, mapeo, 'documento')) || null;
    let nombre = texto(celda(f, mapeo, 'nombre'));
    if (!nombre) {
      const partes = [texto(celda(f, mapeo, 'nombres')), texto(celda(f, mapeo, 'apellidos'))].filter(Boolean);
      nombre = partes.length > 0 ? partes.join(' ') : null;
    }

    const crudoDelTelefono = celda(f, mapeo, 'telefono');
    const telefonos = telefonosDeLaCelda(crudoDelTelefono);
    const telefonos2 = telefonosDeLaCelda(celda(f, mapeo, 'telefono2'));
    const telefono = telefonos[0] ?? null;
    const telefono2 = telefonos2[0] ?? telefonos[1] ?? null;
    // «Contacto: 3001234567 · juan@correo.com»: el correo también sale de ahí.
    const correo = correoDeLaCelda(celda(f, mapeo, 'correo')) ?? correoDeLaCelda(crudoDelTelefono);

    if (!documento && !nombre && !telefono && !texto(crudoDelTelefono)) return;

    const vencimientoCrudo = celda(f, mapeo, 'vencimiento');
    const vencimiento = vencimientoCrudo === undefined ? null : parsearFechaDeExtracto(textoDeLaCelda(vencimientoCrudo) || vencimientoCrudo);

    const problemas: string[] = [];
    if (!documento) problemas.push('Falta el documento');
    if (!nombre) problemas.push('Falta el nombre');
    if (!telefono) {
      const escrito = texto(crudoDelTelefono);
      problemas.push(escrito ? `El teléfono «${escrito}» no es un número de Colombia` : 'Falta el teléfono');
    }

    salida.push({
      fila: numero,
      documento,
      nombre,
      telefono,
      telefono2: telefono2 && telefono2 !== telefono ? telefono2 : null,
      correo,
      deuda: plata(celda(f, mapeo, 'deuda')),
      vencimiento,
      origenDelVencimiento: vencimiento ? 'archivo' : null,
      contrato: texto(celda(f, mapeo, 'contrato')),
      inmueble: texto(celda(f, mapeo, 'inmueble')),
      periodo: texto(celda(f, mapeo, 'periodo')),
      canon: plata(celda(f, mapeo, 'canon')),
      administracion: plata(celda(f, mapeo, 'administracion')),
      interesDeMora: plata(celda(f, mapeo, 'interesDeMora')),
      otros: plata(celda(f, mapeo, 'otros')),
      tipoDocumento: texto(celda(f, mapeo, 'tipoDocumento')),
      problemas,
    });
  });
  return salida;
}

// ── El vencimiento, del contrato en Leasefy ────────────────────────────────

/** «#282», «282», «0282», «Leasefy #282» → «282». Letras se conservan («A-12»). */
export function claveDeContrato(v: unknown): string | null {
  const s = textoDeLaCelda(v).toUpperCase().replace(/LEASEFY/g, '').replace(/[#\s]/g, '');
  if (!s) return null;
  return /^\d+$/.test(s) ? String(Number(s)) : s;
}

function claveDeDocumento(v: unknown): string | null {
  const d = documentoDeLaCelda(v).replace(/-\d$/, '').replace(/\D/g, '');
  return d ? d.replace(/^0+/, '') : null;
}

export interface CruceConLosContratos {
  filas: FilaDeCartera[];
  /** Filas sin vencimiento en el archivo a las que se les encontró en Leasefy. */
  encontradas: number;
  /** Filas sin vencimiento que tampoco aparecen (o están al día) en Leasefy. */
  sinEncontrar: number;
}

/**
 * A cada fila SIN vencimiento le busca su contrato en la cartera de Leasefy
 * (`GET /inmobiliaria/cartera/inquilinos`) y le pone el vencimiento de la
 * cuota más vieja que todavía tiene saldo. Primero por número de contrato y
 * documento juntos; si no, por el contrato solo (si es uno); si no, por el
 * documento. El inmueble también sale de ahí si el archivo no lo trae. Sólo
 * cuenta lo YA vencido: al día en Leasefy = no aparece.
 */
export function cruzarConLosContratos(
  filas: readonly FilaDeCartera[],
  cartera: Pick<CarteraDeInquilinos, 'inquilinos'> | null,
  hoy: Date = new Date(),
): CruceConLosContratos {
  // Sólo cuotas YA vencidas: si en Leasefy no debe nada vencido, una fecha
  // futura no es «desde cuándo debe» (se le pregunta a la persona).
  const hoyIso = hoy.toISOString().slice(0, 10);
  if (!cartera) {
    return { filas: [...filas], encontradas: 0, sinEncontrar: filas.filter((f) => !f.vencimiento).length };
  }

  interface Cuota { contrato: string | null; vence: string; inmueble: string }
  const porDocumento = new Map<string, Cuota[]>();
  const porContrato = new Map<string, Array<{ documento: string | null; cuotas: Cuota[] }>>();

  for (const inquilino of cartera.inquilinos) {
    const documento = claveDeDocumento(inquilino.documento);
    const cuotas: Cuota[] = inquilino.filas
      .filter(
        (c) =>
          c.saldoCop > 0 &&
          /^\d{4}-\d{2}-\d{2}/.test(c.vence) &&
          (typeof c.esVencida === 'boolean' ? c.esVencida : c.vence.slice(0, 10) <= hoyIso),
      )
      .map((c) => ({ contrato: c.contrato ?? null, vence: c.vence.slice(0, 10), inmueble: c.inmueble }));
    if (documento) porDocumento.set(documento, [...(porDocumento.get(documento) ?? []), ...cuotas]);
    for (const contrato of inquilino.contratos) {
      for (const etiqueta of [contrato.contrato, contrato.contratoDeLeasefy]) {
        const clave = claveDeContrato(etiqueta);
        if (!clave) continue;
        const suyas = cuotas.filter((c) => c.contrato === contrato.contrato);
        porContrato.set(clave, [...(porContrato.get(clave) ?? []), { documento, cuotas: suyas }]);
      }
    }
  }

  const masVieja = (cuotas: readonly Cuota[]): Cuota | null =>
    cuotas.length === 0 ? null : [...cuotas].sort((a, b) => a.vence.localeCompare(b.vence))[0];

  let encontradas = 0;
  let sinEncontrar = 0;
  const salida = filas.map((f) => {
    if (f.vencimiento) return f;
    const documento = claveDeDocumento(f.documento);
    const contrato = claveDeContrato(f.contrato);
    let cuotas: Cuota[] | null = null;
    if (contrato && porContrato.has(contrato)) {
      const candidatos = porContrato.get(contrato) ?? [];
      const delMismo = documento ? candidatos.find((c) => c.documento === documento) : undefined;
      if (delMismo) cuotas = delMismo.cuotas;
      else if (candidatos.length === 1 && !documento) cuotas = candidatos[0].cuotas;
    }
    if (!cuotas && documento && porDocumento.has(documento)) cuotas = porDocumento.get(documento) ?? null;
    const cuota = cuotas ? masVieja(cuotas) : null;
    if (!cuota) {
      sinEncontrar++;
      return f;
    }
    encontradas++;
    return {
      ...f,
      vencimiento: cuota.vence,
      origenDelVencimiento: 'contrato' as const,
      inmueble: f.inmueble ?? (cuota.inmueble || null),
    };
  });
  return { filas: salida, encontradas, sinEncontrar };
}

/** Pone la fecha que escribió la persona a las filas que siguen sin vencimiento. */
export function ponerVencimientoEscrito(filas: readonly FilaDeCartera[], fecha: string | null): FilaDeCartera[] {
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return [...filas];
  return filas.map((f) => (f.vencimiento ? f : { ...f, vencimiento: fecha, origenDelVencimiento: 'escrito' as const }));
}

/**
 * La fila con las claves que el micro ya entiende (`HEADER_ALIASES` y
 * `ALIAS_VENCIMIENTO` de `agency-cartera-import.ts`). Lo vacío no viaja.
 */
export function filaParaElMicro(f: FilaDeCartera): Record<string, string | number> {
  const salida: Record<string, string | number | null> = {
    documento: f.documento,
    tipo_documento: f.tipoDocumento,
    nombre: f.nombre,
    telefono: f.telefono,
    telefono_2: f.telefono2,
    correo: f.correo,
    monto: f.deuda,
    vencimiento: f.vencimiento,
    referencia: f.contrato,
    inmueble: f.inmueble,
    periodo: f.periodo,
    canon: f.canon,
    administracion: f.administracion,
    intereses: f.interesDeMora,
    otros: f.otros,
  };
  return Object.fromEntries(Object.entries(salida).filter(([, v]) => v !== null && v !== '')) as Record<
    string,
    string | number
  >;
}

/** Cuántas filas se pueden importar y cuántas entran a cobranza (con deuda y vencimiento). */
export function resumenDeLaCartera(filas: readonly FilaDeCartera[]): {
  total: number;
  seImportan: number;
  conProblemas: number;
  entranACobranza: number;
  sinVencimiento: number;
  deudaTotal: number;
} {
  const buenas = filas.filter((f) => f.problemas.length === 0);
  return {
    total: filas.length,
    seImportan: buenas.length,
    conProblemas: filas.length - buenas.length,
    entranACobranza: buenas.filter((f) => f.vencimiento && (f.deuda ?? 0) > 0).length,
    sinVencimiento: buenas.filter((f) => !f.vencimiento && (f.deuda ?? 0) > 0).length,
    deudaTotal: buenas.reduce((s, f) => s + (f.deuda ?? 0), 0),
  };
}
