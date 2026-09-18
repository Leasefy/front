/**
 * La cuenta de una factura de proveedor, mientras se digita.
 *
 * ── 🔴 Por qué esta cuenta es el ÚNICO control del total ────────────────────
 *
 * El contrato del 18-09 decía que el cliente mandaba `totalCop` y que el back lo
 * comparaba contra su propia liquidación (400 `TOTALES_NO_CUADRAN` con los dos
 * números). **El back quedó implementado de otra forma**: liquida todo de las
 * líneas y las retenciones, el DTO no declara ningún total y ese código de error
 * no existe (verificado en `CrearFacturaDeProveedorDto` y
 * `liquidar-factura-de-proveedor.ts`).
 *
 * O sea que el total del papel NO viaja y nadie del otro lado lo verifica. Si las
 * líneas suman $475.900 y la factura dice $476.000, la factura se registra por
 * $475.900 **en silencio**, y el libro queda cuadrado contra un papel que dice
 * otra cosa. Por eso el total se sigue pidiendo —es un doble ingreso del monto,
 * el control clásico contra la transposición de dígitos— y el aviso de descuadre
 * es más fuerte que cuando había un 400 atrás: es el único que hay.
 *
 * Lo que estas funciones NO hacen sigue siendo lo mismo: corregir nada. Ajustar
 * la base o el IVA automáticamente taparía el error de digitación —o el IVA que
 * el proveedor calculó distinto, que es un caso legítimo— y la decisión es de
 * quien tiene el papel en la mano.
 *
 * ── Redondeo: al peso, siempre ──────────────────────────────────────────────
 *
 * Los montos del libro son `Int` de Postgres: no hay centavos. `Math.round` y
 * no `Math.floor`, porque truncar 19 % de $400.001 ($76.000,19) a $76.000 es lo
 * mismo que redondear, pero truncar 19 % de $399.999 perdería un peso en cada
 * línea — y con 30 líneas el total no cuadra y nadie sabe por qué.
 *
 * ── El IVA descontable no es el IVA ─────────────────────────────────────────
 *
 * `ivaDescontableCop` lo decide el back con la responsabilidad de IVA de la
 * inmobiliaria: si NO es responsable, el IVA de la factura es MÁS GASTO, no un
 * activo por descontar, y va a la cuenta del gasto en vez de 240810. Acá no se
 * adivina: la pantalla muestra lo que el back devolvió y dice cuál de los dos
 * casos es.
 */

import type { LineaNueva } from '@/lib/api/gastos.service';

/** Una línea mientras se digita: puede estar incompleta. */
export interface LineaEnCurso {
  descripcion: string;
  cuentaId: string;
  /** Lo que se escribió. `null` = el campo está vacío, que no es un cero. */
  baseCop: number | null;
  ivaPct: number;
}

export function lineaVacia(): LineaEnCurso {
  return { descripcion: '', cuentaId: '', baseCop: null, ivaPct: 19 };
}

/** El IVA de una línea, al peso. */
export function ivaDeLaLinea(baseCop: number, ivaPct: number): number {
  if (!Number.isFinite(baseCop) || !Number.isFinite(ivaPct)) return 0;
  return Math.round((baseCop * ivaPct) / 100);
}

export interface TotalesDeLasLineas {
  subtotalCop: number;
  ivaCop: number;
  /** subtotal + IVA: lo que la factura debería decir. */
  totalCop: number;
}

/**
 * Lo que suman las líneas. Una línea sin base cuenta como 0 en la suma pero
 * aparece en `problemasDeLaFactura`: sumarla como cero Y callarlo haría que el
 * total pareciera correcto con una línea a medio llenar.
 */
export function totalesDeLasLineas(lineas: readonly LineaEnCurso[]): TotalesDeLasLineas {
  let subtotalCop = 0;
  let ivaCop = 0;
  for (const l of lineas) {
    const base = l.baseCop ?? 0;
    subtotalCop += base;
    ivaCop += ivaDeLaLinea(base, l.ivaPct);
  }
  return { subtotalCop, ivaCop, totalCop: subtotalCop + ivaCop };
}

export interface Retenciones {
  retefuenteCop: number;
  reteivaCop: number;
  reteicaCop: number;
}

export function sumaDeRetenciones(r: Retenciones): number {
  return (r.retefuenteCop || 0) + (r.reteivaCop || 0) + (r.reteicaCop || 0);
}

/** Lo que se le paga al proveedor: lo que dice la factura menos las retenciones. */
export function netoAPagar(totalCop: number, r: Retenciones): number {
  return totalCop - sumaDeRetenciones(r);
}

/** La diferencia entre lo que dice el papel y lo que suman las líneas. `0` = cuadra. */
export function diferenciaDelTotal(
  totalDeclaradoCop: number,
  lineas: readonly LineaEnCurso[],
): number {
  return totalDeclaradoCop - totalesDeLasLineas(lineas).totalCop;
}

/** Un borrador de factura, con lo que el formulario tiene en la mano. */
export interface BorradorDeFactura {
  proveedorNombre: string;
  proveedorDocumento: string;
  numeroDelProveedor: string;
  fecha: string;
  concepto: string;
  lineas: readonly LineaEnCurso[];
  totalCop: number | null;
  retefuenteCop: number;
  reteivaCop: number;
  reteicaCop: number;
}

/**
 * Qué le falta o qué está mal, en palabras, para deshabilitar el botón CON su
 * motivo escrito en vez de un botón gris sin explicación.
 *
 * El orden es el del formulario, de arriba abajo: la primera frase es la que se
 * pone al lado del primer campo que hay que arreglar.
 */
export function problemasDeLaFactura(borrador: BorradorDeFactura): string[] {
  const problemas: string[] = [];

  if (!borrador.proveedorNombre.trim()) {
    problemas.push('Falta el nombre del proveedor.');
  }
  if (!borrador.proveedorDocumento.trim()) {
    problemas.push(
      'Falta el documento del proveedor: sin él la factura no puede ir a la exógena.',
    );
  }
  if (!borrador.numeroDelProveedor.trim()) {
    problemas.push('Falta el número de la factura del proveedor.');
  }
  if (!borrador.fecha) {
    problemas.push('Falta la fecha de la factura.');
  }
  if (!borrador.concepto.trim()) {
    problemas.push('Falta el concepto: es lo que se lee en el libro.');
  }

  if (borrador.lineas.length === 0) {
    problemas.push('Una factura necesita al menos una línea.');
  } else {
    const sinBase = borrador.lineas.filter((l) => l.baseCop === null || l.baseCop <= 0).length;
    if (sinBase > 0) {
      problemas.push(
        sinBase === 1
          ? 'Hay una línea sin base: escribí su valor o quitala.'
          : `Hay ${sinBase} líneas sin base: escribí su valor o quitalas.`,
      );
    }
    const sinDescripcion = borrador.lineas.filter((l) => !l.descripcion.trim()).length;
    if (sinDescripcion > 0) {
      problemas.push(
        sinDescripcion === 1
          ? 'Hay una línea sin descripción.'
          : `Hay ${sinDescripcion} líneas sin descripción.`,
      );
    }
  }

  if (borrador.totalCop === null || borrador.totalCop <= 0) {
    // Se pide aunque no viaje: es el doble ingreso del monto contra el que se
    // compara la suma de las líneas, y es el único control que queda.
    problemas.push('Falta el total que dice la factura: con él se verifica que las líneas sumen bien.');
  }

  const retenciones = sumaDeRetenciones(borrador);
  if (retenciones < 0) {
    problemas.push('Las retenciones van en positivo: se restan del total, no se suman.');
  }
  if (borrador.totalCop !== null && retenciones > borrador.totalCop) {
    problemas.push(
      'Las retenciones suman más que el total: al proveedor le quedaría un pago negativo.',
    );
  }

  return problemas;
}

/**
 * El aviso de que el papel y las líneas no dicen lo mismo, con LOS DOS números.
 * `null` cuando cuadran o cuando todavía no hay total escrito.
 *
 * 🔴 No bloquea, y NADIE MÁS lo va a mirar: el total del papel no viaja al back.
 * Si se registra así, la factura queda por lo que suman las líneas y el libro
 * cuadra contra un papel que dice otra cosa. El aviso lo dice con esas palabras y
 * nombra el arreglo —la base o el IVA de una línea—, porque el caso legítimo
 * existe: un proveedor puede haber calculado el IVA distinto, y para eso la línea
 * acepta el IVA en pesos.
 */
export function avisoDeTotalQueNoCuadra(
  borrador: BorradorDeFactura,
  formatoDeMonto: (n: number) => string,
): string | null {
  if (borrador.totalCop === null) return null;
  const calculado = totalesDeLasLineas(borrador.lineas).totalCop;
  if (calculado === borrador.totalCop) return null;
  const diferencia = borrador.totalCop - calculado;
  return (
    `La factura dice ${formatoDeMonto(borrador.totalCop)} y las líneas suman ` +
    `${formatoDeMonto(calculado)}: ${formatoDeMonto(Math.abs(diferencia))} de diferencia. ` +
    'El total del papel no se le manda al back, así que si la registrás así va a quedar ' +
    `por ${formatoDeMonto(calculado)} y nadie más lo va a notar. Revisá la base o el IVA de cada línea.`
  );
}

/**
 * El borrador, convertido en el cuerpo que espera el DTO.
 *
 * Las líneas sin base se dejan afuera —ya se avisó en `problemasDeLaFactura`— y
 * `cuentaId` vacío se omite: el back usa entonces la cuenta del rubro o
 * `GASTO_SIN_RUBRO`, que es exactamente para eso.
 */
export function lineasParaElBack(lineas: readonly LineaEnCurso[]): LineaNueva[] {
  return lineas
    .filter((l) => l.baseCop !== null && l.baseCop > 0)
    .map((l) => ({
      descripcion: l.descripcion.trim(),
      ...(l.cuentaId ? { cuentaId: l.cuentaId } : {}),
      baseCop: l.baseCop as number,
      // `ivaPct` y no `ivaCop`: este formulario captura un porcentaje. El DTO
      // acepta los dos y el de pesos manda, pero acá no hay de dónde sacarlo.
      ivaPct: l.ivaPct,
    }));
}
