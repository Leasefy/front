/**
 * Exportar los datos de un propietario a Excel.
 *
 * «Exportar datos» en la ficha era un botón sin `onClick`: se abría el menú,
 * se apretaba, y nada. Lo que se exporta es lo mismo que la ficha muestra —
 * quién es, cómo se le gira, qué inmuebles tiene consignados y qué se le ha
 * girado — en tres hojas, para que quien lo abra en Excel encuentre cada cosa
 * donde la espera y no una sola tabla con columnas de tres asuntos distintos.
 *
 * Las hojas se arman puras (`armarHojasDelPropietario`) y se prueban; la
 * descarga es la única parte que toca el navegador.
 */

import type { Consignacion, Dispersion, Propietario } from '@/lib/types/inmobiliaria';
import { COLOMBIAN_BANKS } from '@/lib/types/payment-accounts';
import { nombreDelMes } from '@/lib/utils/mes';

export type Celda = string | number;

export interface HojaDelPropietario {
  nombre: string;
  filas: Celda[][];
}

const DISPONIBILIDAD: Record<Consignacion['availability'], string> = {
  available: 'Disponible',
  rented: 'Arrendado',
  in_process: 'En proceso',
  maintenance: 'En mantenimiento',
};

const ESTADO_DEL_MANDATO: Record<Consignacion['status'], string> = {
  active: 'Activo',
  pending: 'Pendiente',
  terminated: 'Terminado',
  expired: 'Vencido',
};

const ESTADO_DEL_GIRO: Record<Dispersion['status'], string> = {
  pending: 'Pendiente',
  processing: 'En proceso',
  completed: 'Girado',
  failed: 'Fallido',
};

function nombreDelBanco(cuenta: { bank: string; bankName?: string }): string {
  return COLOMBIAN_BANKS.find((b) => b.code === cuenta.bank)?.name ?? cuenta.bankName ?? cuenta.bank;
}

/** Las tres hojas: Propietario · Inmuebles · Giros. Siempre las tres, aunque una quede sólo con encabezados. */
export function armarHojasDelPropietario(
  propietario: Propietario,
  consignaciones: readonly Consignacion[],
  dispersiones: readonly Dispersion[],
): HojaDelPropietario[] {
  const cuenta = propietario.bankAccount;
  const tieneCuenta = Boolean(cuenta?.accountNumber);

  const ficha: Celda[][] = [
    ['Campo', 'Valor'],
    ['Nombre', propietario.name],
    ['Tipo de documento', propietario.documentType],
    ['Número de documento', propietario.documentNumber],
    ['Correo', propietario.email ?? ''],
    ['Teléfono', propietario.phone ?? ''],
    ['Dirección', propietario.address ?? ''],
    ['Ciudad', propietario.city ?? ''],
    ['Banco', tieneCuenta ? nombreDelBanco(cuenta) : ''],
    ['Tipo de cuenta', tieneCuenta ? (cuenta.accountType === 'savings' ? 'Ahorros' : 'Corriente') : ''],
    ['Número de cuenta', tieneCuenta ? cuenta.accountNumber : ''],
    ['Titular', tieneCuenta ? cuenta.accountHolder : ''],
    ['Inmuebles consignados', propietario.propertyCount],
    ['Arrendados', propietario.activeLeases],
    ['Canon mensual total', propietario.totalMonthlyRent],
    ['Saldo pendiente', propietario.pendingBalance],
    ['Notas', propietario.notes ?? ''],
    ['Creado', propietario.createdAt.slice(0, 10)],
  ];

  const inmuebles: Celda[][] = [
    [
      'Código',
      'Inmueble',
      'Dirección',
      'Ciudad',
      'Tipo de mandato',
      'Canon',
      'Comisión %',
      'Comisión venta %',
      'Disponibilidad',
      'Estado del mandato',
      'Inquilino actual',
      'Inicio del mandato',
    ],
    ...consignaciones.map((c) => [
      c.propertyCode ?? '',
      c.propertyTitle,
      c.propertyAddress,
      c.propertyCity,
      c.listingType === 'sale' ? 'Venta' : 'Arriendo',
      c.monthlyRent ?? '',
      c.listingType === 'sale' ? '' : c.commissionPercent,
      c.saleCommissionPercent ?? '',
      DISPONIBILIDAD[c.availability] ?? c.availability,
      ESTADO_DEL_MANDATO[c.status] ?? c.status,
      c.currentTenantName ?? '',
      c.contractDate.slice(0, 10),
    ]),
  ];

  const giros: Celda[][] = [
    [
      'Mes',
      'Inmueble',
      'Canon recaudado',
      'Comisión %',
      'Comisión',
      'Conceptos a favor',
      'Conceptos a cargo',
      'Neto',
      'Estado del giro',
      'Referencia',
    ],
    ...dispersiones.flatMap((d) =>
      // Una fila por inmueble del giro; el giro sin renglones queda igual con su total.
      (d.items.length > 0 ? d.items : [null]).map((item) => [
        nombreDelMes(d.month),
        item?.propertyTitle ?? '',
        item?.rentCollected ?? d.totalCollected,
        item?.commissionPercent ?? '',
        item?.commissionAmount ?? d.totalCommission,
        item?.conceptosAFavor ?? d.totalConceptosAFavor,
        item?.conceptosACargo ?? d.totalConceptosACargo,
        item?.netAmount ?? d.netToPropietario,
        ESTADO_DEL_GIRO[d.status] ?? d.status,
        d.transferReference ?? '',
      ]),
    ),
  ];

  return [
    { nombre: 'Propietario', filas: ficha },
    { nombre: 'Inmuebles', filas: inmuebles },
    { nombre: 'Giros', filas: giros },
  ];
}

/** `propietario-<nombre>-<fecha>.xlsx`, sin caracteres que un sistema de archivos rechace. */
export function nombreDelArchivoDelPropietario(nombre: string, hoy: Date = new Date()): string {
  const seguro = nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  const fecha = hoy.toISOString().slice(0, 10);
  return `propietario-${seguro || 'sin-nombre'}-${fecha}.xlsx`;
}

/**
 * Arma el libro y dispara la descarga.
 *
 * 🔴 `XLSX.writeFile()` NO sirve en el navegador (escribe con `fs`, no falla y
 * no baja nada). Se arma el buffer con `XLSX.write` y se baja con `<a download>`
 * — mismo aprendizaje que `plantilla-de-terceros.ts`.
 */
export async function descargarDatosDelPropietario(
  propietario: Propietario,
  consignaciones: readonly Consignacion[],
  dispersiones: readonly Dispersion[],
): Promise<string> {
  // Dinámico: `xlsx` pesa y esto sólo corre cuando alguien aprieta el botón.
  const XLSX = await import('xlsx');
  const libro = XLSX.utils.book_new();
  for (const hoja of armarHojasDelPropietario(propietario, consignaciones, dispersiones)) {
    const ws = XLSX.utils.aoa_to_sheet(hoja.filas);
    const encabezados = hoja.filas[0] ?? [];
    ws['!cols'] = encabezados.map((titulo) => ({ wch: Math.max(14, String(titulo).length + 4) }));
    XLSX.utils.book_append_sheet(libro, ws, hoja.nombre);
  }
  const bytes = XLSX.write(libro, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  const nombre = nombreDelArchivoDelPropietario(propietario.name);
  descargar(
    new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    nombre,
  );
  return nombre;
}

/** Dispara la descarga de un Blob con el nombre pedido. */
export function descargar(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revocar en el siguiente tick: hacerlo de inmediato cancela la descarga en
  // algunos navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/* ────────────────────────────────────────────────────────────────────────────
 * La LISTA entera del directorio.
 *
 * «Exportar» en la tabla de Propietarios era `toast.info('Exportando…')` y un
 * `// TODO`: el cartel decía que estaba pasando algo, no bajaba nada, y no
 * había forma de darse cuenta salvo esperar un archivo que nunca llegaba. Es
 * exactamente lo que ya se había arreglado en la ficha de UN propietario.
 *
 * Se exporta lo que la tabla muestra —incluidos los filtros y el orden que
 * tenga puestos quien la exporta—, no «todos los propietarios»: si alguien
 * filtró por empresa y exporta, el archivo tiene que traer empresas.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Una fila por propietario, con las columnas de la tabla más la cuenta de giro. */
export function armarHojaDeLaLista(
  propietarios: readonly Propietario[],
): HojaDelPropietario {
  const filas: Celda[][] = [
    [
      'Nombre',
      'Tipo de documento',
      'Número de documento',
      'Correo',
      'Teléfono',
      'Ciudad',
      'Inmuebles',
      'Arrendados',
      'Canon mensual total',
      'Saldo pendiente',
      'Banco',
      'Tipo de cuenta',
      'Número de cuenta',
      'Titular',
      'Creado',
    ],
    ...propietarios.map((p) => {
      const cuenta = p.bankAccount;
      const tieneCuenta = Boolean(cuenta?.accountNumber);
      return [
        p.name,
        p.documentType,
        p.documentNumber,
        p.email ?? '',
        p.phone ?? '',
        p.city ?? '',
        p.propertyCount,
        p.activeLeases,
        p.totalMonthlyRent,
        p.pendingBalance,
        tieneCuenta ? nombreDelBanco(cuenta) : '',
        tieneCuenta ? (cuenta.accountType === 'savings' ? 'Ahorros' : 'Corriente') : '',
        tieneCuenta ? cuenta.accountNumber : '',
        tieneCuenta ? cuenta.accountHolder : '',
        p.createdAt.slice(0, 10),
      ];
    }),
  ];

  return { nombre: 'Propietarios', filas };
}

/** `propietarios-<fecha>.xlsx`. */
export function nombreDelArchivoDeLaLista(hoy: Date = new Date()): string {
  return `propietarios-${hoy.toISOString().slice(0, 10)}.xlsx`;
}

/**
 * Arma el libro de la lista y dispara la descarga. Devuelve el nombre del
 * archivo para poder decir QUÉ se bajó (un «Listo» a secas no se distingue de
 * un «Listo» que no bajó nada).
 */
export async function descargarListaDePropietarios(
  propietarios: readonly Propietario[],
): Promise<string> {
  // Dinámico por lo mismo que en la ficha: `xlsx` pesa y esto sólo corre
  // cuando alguien aprieta el botón.
  const XLSX = await import('xlsx');
  const libro = XLSX.utils.book_new();
  const hoja = armarHojaDeLaLista(propietarios);
  const ws = XLSX.utils.aoa_to_sheet(hoja.filas);
  ws['!cols'] = (hoja.filas[0] ?? []).map((titulo) => ({
    wch: Math.max(14, String(titulo).length + 4),
  }));
  XLSX.utils.book_append_sheet(libro, ws, hoja.nombre);
  const bytes = XLSX.write(libro, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  const nombre = nombreDelArchivoDeLaLista();
  descargar(
    new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    nombre,
  );
  return nombre;
}
