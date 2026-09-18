/**
 * Lo puro del P&G, del balance general y del libro mayor: qué filas se dibujan,
 * qué columnas, y qué se dice del descuadre.
 *
 * ── 🔴 La frase que el P&G lleva escrita: el canon NO es ingreso ────────────
 *
 * Es la decisión de producto más importante de esta pantalla. Una inmobiliaria
 * que administra $1.200 millones de canon al mes factura $120 millones de
 * comisión; un P&G que mostrara el canon como ingreso diría que factura diez
 * veces más, y con eso se calculan impuestos, se piden créditos y se venden
 * participaciones. El canon vive en 2815, que es PASIVO —plata del propietario—
 * y por eso no aparece. `LEYENDA_DEL_CANON` es esa explicación, y va en la
 * pantalla siempre: también —sobre todo— cuando los números están bien, porque
 * es entonces cuando alguien pregunta «¿y el canon dónde está?».
 *
 * ── Un balance que no cuadra es la noticia ──────────────────────────────────
 *
 * `descripcionDelDescuadre` arma la frase con los dos lados y la diferencia. La
 * pantalla la pone ARRIBA y en rojo. No se esconde detrás de un ícono ni se
 * deja al pie: un balance descuadrado invalida todo lo que está debajo, así que
 * leerlo primero es leerlo en el orden correcto.
 *
 * ── `null` es `—`, nunca `0` ────────────────────────────────────────────────
 *
 * `presupuestoMesCop` en `null` significa «esta cuenta no tiene rubro
 * presupuestado», y `anioAnteriorMesCop` en `null`, «el año pasado esta cuenta
 * no existía o no movió». Un cero ahí se leería como «se presupuestó cero» y
 * como «el año pasado no se gastó nada» — dos afirmaciones que nadie hizo. Ver
 * el encabezado de `components/finanzas/Presupuesto.tsx`.
 */

import type {
  BalanceGeneral,
  ComparacionDelPyg,
  EstadoDeResultados,
  GrupoDelBalance,
  LibroMayor,
  SinAsentar,
} from '@/lib/api/estados-financieros.service';

/**
 * La frase del canon, con estas palabras. No es copy decorativo: es lo que
 * impide leer el P&G como si la inmobiliaria facturara el canon.
 */
export const LEYENDA_DEL_CANON =
  'El canon recaudado NO es ingreso de la inmobiliaria: es plata del propietario y vive en la 2815, que es una cuenta de pasivo. Acá sólo aparece lo propio — la comisión de administración, los recargos y los gastos de la inmobiliaria (CTCP 2020-0678).';

// ── Filas del P&G ──────────────────────────────────────────────────────────

/** Una fila de la tabla del P&G: la clase, o una cuenta dentro de ella. */
export interface FilaDelPyg {
  /** Para la `key` de React: el código es único entre clases y cuentas. */
  clave: string;
  tipo: 'grupo' | 'cuenta';
  codigo: string;
  nombre: string;
  mesCop: number;
  acumuladoCop: number;
  presupuestoMesCop: number | null;
  anioAnteriorMesCop: number | null;
  /** El rubro del presupuesto, sólo en las cuentas. */
  rubro: string | null;
}

/**
 * Los grupos y sus cuentas, aplanados en el orden en que se leen.
 *
 * Aplanar y no anidar: una tabla con `<tbody>` por grupo no se puede ordenar ni
 * exportar, y el contador lee el P&G de arriba abajo. La jerarquía la dice
 * `tipo`, que es lo que la celda usa para la sangría y el peso de la letra.
 */
export function filasDelPyg(pyg: EstadoDeResultados): FilaDelPyg[] {
  const filas: FilaDelPyg[] = [];
  for (const g of pyg.grupos) {
    filas.push({
      clave: `grupo-${g.clase}`,
      tipo: 'grupo',
      codigo: g.clase,
      nombre: g.nombre,
      mesCop: g.mesCop,
      acumuladoCop: g.acumuladoCop,
      presupuestoMesCop: g.presupuestoMesCop,
      anioAnteriorMesCop: g.anioAnteriorMesCop,
      rubro: null,
    });
    for (const c of g.cuentas) {
      filas.push({
        clave: `cuenta-${g.clase}-${c.codigo}`,
        tipo: 'cuenta',
        codigo: c.codigo,
        nombre: c.nombre,
        mesCop: c.mesCop,
        acumuladoCop: c.acumuladoCop,
        presupuestoMesCop: c.presupuestoMesCop,
        anioAnteriorMesCop: c.anioAnteriorMesCop,
        rubro: c.rubro,
      });
    }
  }
  return filas;
}

/** Las columnas de la tabla, en orden, según lo que se pidió comparar. */
export interface ColumnaDelPyg {
  clave: 'mes' | 'acumulado' | 'presupuesto' | 'anioAnterior';
  titulo: string;
  /** Qué mide, para el `title` del encabezado. */
  definicion: string;
}

export function columnasDelPyg(
  comparar: readonly ComparacionDelPyg[],
  conAcumulado: boolean,
): ColumnaDelPyg[] {
  const columnas: ColumnaDelPyg[] = [
    { clave: 'mes', titulo: 'Mes', definicion: 'Lo asentado con fecha dentro del mes elegido.' },
  ];
  if (conAcumulado) {
    columnas.push({
      clave: 'acumulado',
      titulo: 'Acumulado del año',
      definicion: 'Desde el 1.º de enero hasta el último día del mes elegido.',
    });
  }
  if (comparar.includes('presupuesto')) {
    columnas.push({
      clave: 'presupuesto',
      titulo: 'Presupuesto',
      definicion:
        'Lo cargado en el presupuesto del mes, por el rubro que el mapeo le asigna a cada cuenta. «—» = esa cuenta no tiene rubro presupuestado.',
    });
  }
  if (comparar.includes('anioAnterior')) {
    columnas.push({
      clave: 'anioAnterior',
      titulo: 'Año anterior',
      definicion:
        'El mismo mes del año pasado. «—» = esa cuenta no movió, o todavía no existía.',
    });
  }
  return columnas;
}

/**
 * Cuánto de lo que pasó NO está en el informe, en palabras. `null` cuando todo
 * está asentado.
 *
 * La regla del contrato: «lo que no está asentado no aparece, y el informe lo
 * dice con el número de lo que falta por asentar». Un P&G que calla tres recibos
 * sin asiento no está incompleto: está mal, y nadie lo sabe.
 */
export function avisoDeLoQueFalta(sinAsentar: SinAsentar | null | undefined): string | null {
  if (!sinAsentar || sinAsentar.total <= 0) return null;
  const partes = [
    sinAsentar.recibos > 0
      ? `${sinAsentar.recibos} ${sinAsentar.recibos === 1 ? 'recibo' : 'recibos'}`
      : null,
    sinAsentar.cobros > 0
      ? `${sinAsentar.cobros} ${sinAsentar.cobros === 1 ? 'cobro' : 'cobros'}`
      : null,
    sinAsentar.lotes > 0
      ? `${sinAsentar.lotes} ${sinAsentar.lotes === 1 ? 'lote' : 'lotes'}`
      : null,
  ].filter((p): p is string => p !== null);
  const detalle = partes.length > 0 ? ` (${partes.join(', ')})` : '';
  return (
    `Hay ${sinAsentar.total} ${sinAsentar.total === 1 ? 'documento' : 'documentos'} sin asentar${detalle}: ` +
    'lo que no está en el libro no está en este informe.'
  );
}

/** El margen en texto. `null` → «—»: dividir por cero no es 0 %. */
export function margenLegible(margenPct: number | null, sinMedir: string): string {
  if (margenPct === null || !Number.isFinite(margenPct)) return sinMedir;
  return `${margenPct.toFixed(1)}%`;
}

// ── Balance general ────────────────────────────────────────────────────────

/** Pasivo + patrimonio + resultado del ejercicio: el otro lado de la igualdad. */
export function totalDelOtroLado(balance: BalanceGeneral): number {
  return (
    balance.pasivo.totalCop + balance.patrimonio.totalCop + balance.resultadoDelEjercicioCop
  );
}

/**
 * La frase del descuadre, con los dos lados y la diferencia. `null` cuando
 * cuadra.
 *
 * Dice los dos totales y no sólo la diferencia porque la diferencia sola no
 * orienta: con $3.000 de descuadre sobre $4.000 millones el problema es un
 * redondeo, y con $3.000 sobre $6.000 es medio balance.
 */
export function descripcionDelDescuadre(
  balance: BalanceGeneral,
  formatoDeMonto: (n: number) => string,
): string | null {
  if (balance.cuadra) return null;
  const otroLado = totalDelOtroLado(balance);
  return (
    `El balance no cuadra: el activo suma ${formatoDeMonto(balance.activo.totalCop)} y ` +
    `pasivo + patrimonio + resultado del ejercicio suman ${formatoDeMonto(otroLado)} — ` +
    `${formatoDeMonto(Math.abs(balance.diferenciaCop))} de diferencia. ` +
    'Es un defecto del libro, no de este informe: mientras no cuadre, nada de lo que está ' +
    'abajo se puede firmar. Mirá el balance de prueba para ver en qué cuenta se abre.'
  );
}

/** Los tres lados del balance, para dibujarlos con el mismo componente. */
export interface LadoDibujable {
  clave: 'activo' | 'pasivo' | 'patrimonio';
  titulo: string
  totalCop: number;
  anioAnteriorCop: number | null;
  grupos: GrupoDelBalance[];
}

export function ladosDelBalance(balance: BalanceGeneral): LadoDibujable[] {
  return [
    {
      clave: 'activo',
      titulo: 'Activo',
      totalCop: balance.activo.totalCop,
      anioAnteriorCop: balance.activo.anioAnteriorCop ?? null,
      grupos: balance.activo.grupos,
    },
    {
      clave: 'pasivo',
      titulo: 'Pasivo',
      totalCop: balance.pasivo.totalCop,
      anioAnteriorCop: balance.pasivo.anioAnteriorCop ?? null,
      grupos: balance.pasivo.grupos,
    },
    {
      clave: 'patrimonio',
      titulo: 'Patrimonio',
      totalCop: balance.patrimonio.totalCop,
      anioAnteriorCop: balance.patrimonio.anioAnteriorCop ?? null,
      grupos: balance.patrimonio.grupos,
    },
  ];
}

/**
 * Por qué el resultado del ejercicio está aparte del patrimonio. La pantalla lo
 * dice al lado de la cifra: sin esta frase parece un error de clasificación.
 */
export const POR_QUE_EL_RESULTADO_VA_APARTE =
  'El resultado del ejercicio se calcula (ingresos menos gastos del año) y va aparte del patrimonio porque el cierre anual que lo traslada lo hace el contador, no el sistema. Hasta que lo haga, el balance cuadra sumándolo acá.';

// ── Libro mayor ────────────────────────────────────────────────────────────

/**
 * El último día del mes del período que todavía no pasó, para no dibujar
 * columnas de meses futuros en cero.
 *
 * El back manda `meses` con todo el rango pedido; si el rango llega a diciembre
 * y hoy es septiembre, tres columnas en cero se leen como «no se movió nada en
 * octubre», cuando lo que pasa es que octubre no llegó.
 */
export function mesesConDatos(mayor: LibroMayor, mesDeHoy: string): string[] {
  return mayor.meses.filter((m) => m <= mesDeHoy);
}

/** Cuántas columnas de mes hay que dibujar, incluidas las de saldo. */
export function anchoDelMayor(meses: readonly string[]): number {
  // código + nombre + saldo anterior + (débitos + créditos por mes) + total
  // débitos + total créditos + saldo final.
  return 2 + 1 + meses.length * 2 + 3;
}

/**
 * La frase del descuadre del mayor. Mismo criterio que el balance: se dice
 * arriba, con el número.
 */
export function descuadreDelMayor(
  mayor: LibroMayor,
  formatoDeMonto: (n: number) => string,
): string | null {
  if (mayor.cuadra) return null;
  return (
    `El mayor no cuadra: ${formatoDeMonto(mayor.totalDebitosCop)} de débitos contra ` +
    `${formatoDeMonto(mayor.totalCreditosCop)} de créditos, ` +
    `${formatoDeMonto(Math.abs(mayor.diferenciaCop))} de diferencia. ` +
    'Con la partida doble eso no puede pasar: es un defecto del libro.'
  );
}
