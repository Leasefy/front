/**
 * La lógica del estado de cuenta, fijada.
 *
 * Lo que se protege acá es lo que puede mentirle a un cliente: una fecha
 * corrida un día, una columna de impuestos que desaparece teniendo valor, un
 * punto de quiebre en el lugar equivocado, un total que no cuadra con las filas
 * que se están viendo.
 */

import { describe, expect, it } from 'vitest';

import {
  aplicarFiltros,
  columnasDeImpuestos,
  columnasOmitidas,
  comoSeLlamaElRol,
  conceptoLimpio,
  cuantasFilas,
  cuantasFilasDelDocumento,
  estaVencida,
  fechaLegible,
  hayFiltros,
  hoyLocal,
  intercalarCortes,
  periodoDeLaFila,
  periodoLegible,
  pintaDelEstado,
  rangoPreestablecido,
  SIN_FILTROS,
  sumarTotales,
  totalesDeFilas,
} from './filas';
import {
  contrato,
  contratoConImpuestos,
  estadoDeCuenta,
  fila,
} from './ejemplo-de-prueba';

describe('atajos del período', () => {
  it('«este mes» es el mes calendario entero, no 30 días desde hoy', () => {
    expect(rangoPreestablecido('esteMes', '2026-09-13')).toEqual({
      desde: '2026-09-01',
      hasta: '2026-09-30',
    });
    // Febrero termina donde termina, y el bisiesto también.
    expect(rangoPreestablecido('esteMes', '2028-02-10')).toEqual({
      desde: '2028-02-01',
      hasta: '2028-02-29',
    });
  });

  it('los tres meses cruzan el año sin corrimientos', () => {
    expect(rangoPreestablecido('ultimosTresMeses', '2026-01-20')).toEqual({
      desde: '2025-11-01',
      hasta: '2026-01-31',
    });
    expect(rangoPreestablecido('proximosTresMeses', '2026-11-05')).toEqual({
      desde: '2026-11-01',
      hasta: '2027-01-31',
    });
  });

  it('«este año» va del 1 de enero al 31 de diciembre', () => {
    expect(rangoPreestablecido('esteAnio', '2026-09-13')).toEqual({
      desde: '2026-01-01',
      hasta: '2026-12-31',
    });
  });

  it('un atajo aplicado deja filas que el filtro cuenta contra el total del documento', () => {
    const doc = estadoDeCuenta({ contratos: [contrato()] });
    const rango = rangoPreestablecido('esteAnio', '2024-06-01');
    const filtrado = aplicarFiltros(doc, { ...SIN_FILTROS, ...rango });
    expect(cuantasFilasDelDocumento(filtrado)).toBeLessThanOrEqual(
      cuantasFilasDelDocumento(doc),
    );
    expect(cuantasFilasDelDocumento(doc)).toBe(cuantasFilas(contrato()));
  });
});

describe('fechas', () => {
  it('lee la fecha del texto, sin construir un Date (en Bogotá se corría un día)', () => {
    expect(fechaLegible('2024-05-22')).toBe('22 may 2024');
    expect(fechaLegible('2024-05-22T00:00:00.000Z')).toBe('22 may 2024');
    expect(fechaLegible('2026-01-01')).toBe('1 ene 2026');
  });

  it('una fecha que falta es una raya, no un cero ni «Invalid Date»', () => {
    expect(fechaLegible(null)).toBe('—');
    expect(fechaLegible(undefined)).toBe('—');
  });

  it('`hoyLocal` da el día LOCAL, no el de UTC', () => {
    // 31 de diciembre a las 20:00 en Bogotá: en UTC ya es el 1 de enero.
    const nocheDeAnioNuevo = new Date(2026, 11, 31, 20, 0, 0);
    expect(hoyLocal(nocheDeAnioNuevo)).toBe('2026-12-31');
  });

  it('el período se lee como un rango', () => {
    expect(periodoLegible(fila())).toBe('21 jun 2026 → 20 jul 2026');
  });

  it('sin período suelto ni cola legible no inventa un rango', () => {
    expect(
      periodoLegible(fila({ concepto: 'Papelería', periodoDesde: null, periodoHasta: null })),
    ).toBeNull();
  });
});

describe('concepto', () => {
  it('recorta la cola «De … hasta …» cuando el período se pinta aparte', () => {
    expect(conceptoLimpio(fila())).toBe('Canon De Arrendamiento Personas Naturales');
  });

  it('sin período suelto, LEE la cola de Nui («De 05-Ago-2024 hasta 31-Ago-2024») y la pinta aparte', () => {
    const sinPeriodo = fila({
      concepto: 'Canon de arrendamiento. De 05-Ago-2024 hasta 31-Ago-2024',
      periodoDesde: null,
      periodoHasta: null,
    });
    expect(periodoDeLaFila(sinPeriodo)).toEqual({ desde: '2024-08-05', hasta: '2024-08-31' });
    expect(periodoLegible(sinPeriodo)).toBe('5 ago 2024 → 31 ago 2024');
    expect(conceptoLimpio(sinPeriodo)).toBe('Canon de arrendamiento');
  });

  it('la cola del back viene en ISO («De 2024-08-05 hasta 2024-08-31») y también se lee', () => {
    const delBack = fila({
      concepto: 'Canon de arrendamiento. De 2024-08-05 hasta 2024-08-31',
      periodoDesde: null,
      periodoHasta: null,
    });
    expect(periodoDeLaFila(delBack)).toEqual({ desde: '2024-08-05', hasta: '2024-08-31' });
    expect(conceptoLimpio(delBack)).toBe('Canon de arrendamiento');
  });

  it('una cola que no se deja leer deja el concepto ENTERO: no se borra lo que no se puede volver a mostrar', () => {
    const rara = fila({
      concepto: 'Canon de arrendamiento. De ayer hasta mañana',
      periodoDesde: null,
      periodoHasta: null,
    });
    expect(periodoDeLaFila(rara)).toBeNull();
    expect(periodoLegible(rara)).toBeNull();
    expect(conceptoLimpio(rara)).toBe(rara.concepto);
  });

  it('un concepto sin cola no se toca', () => {
    const papeleria = fila({ concepto: 'Papelería' });
    expect(conceptoLimpio(papeleria)).toBe('Papelería');
  });
});

describe('columnas de impuestos', () => {
  it('un contrato sin un solo impuesto no gasta cuatro columnas de ceros', () => {
    expect(columnasDeImpuestos(contrato().secciones.arriendos)).toEqual([]);
  });

  it('con IVA y retención, esas dos columnas aparecen y las otras no', () => {
    const c = contratoConImpuestos();
    const todas = [...c.secciones.arriendos, ...c.secciones.otrosConceptos];
    expect(columnasDeImpuestos(todas)).toEqual(['iva', 'retencion']);
  });

  it('las omitidas se pueden nombrar, para decirlo al pie', () => {
    expect(columnasOmitidas(contrato().secciones.arriendos, false)).toEqual([
      'iva',
      'retencion',
      'reteIva',
      'reteIca',
    ]);
  });

  it('del lado del propietario las de comisión también entran en la cuenta', () => {
    const omitidas = columnasOmitidas(contrato().secciones.arriendos, true);
    expect(omitidas).toContain('comision');
    expect(omitidas).toContain('ivaComision');
  });

  it('basta UNA fila con valor para que la columna vuelva a todo el contrato', () => {
    const filas = [fila({ iva: 0 }), fila({ iva: 1 })];
    expect(columnasDeImpuestos(filas)).toEqual(['iva']);
  });
});

describe('puntos de quiebre', () => {
  it('sin cortes, los renglones son las filas y nada más', () => {
    const r = intercalarCortes(contrato().secciones.arriendos, []);
    expect(r.every((x) => x.tipo === 'fila')).toBe(true);
    expect(r).toHaveLength(4);
  });

  it('el corte entra JUSTO ANTES de la primera cuota que ya es de la parte nueva', () => {
    const filas = [
      fila({ fechaVencimiento: '2024-01-01' }),
      fila({ fechaVencimiento: '2024-06-01' }),
    ];
    const r = intercalarCortes(filas, [
      { fecha: '2024-03-01', rol: 'PROPIETARIO', motivo: 'Venta', parteAnterior: 'A', parteNueva: 'B' },
    ]);
    expect(r.map((x) => x.tipo)).toEqual(['fila', 'corte', 'fila']);
  });

  it('un corte posterior a todas las filas se pinta al final: el cambio ya pasó', () => {
    const filas = [fila({ fechaVencimiento: '2024-01-01' })];
    const r = intercalarCortes(filas, [
      { fecha: '2030-01-01', rol: 'INQUILINO', motivo: 'Cesión', parteAnterior: 'A', parteNueva: 'B' },
    ]);
    expect(r.map((x) => x.tipo)).toEqual(['fila', 'corte']);
  });

  it('varios cortes salen en orden de fecha aunque lleguen desordenados', () => {
    const filas = [fila({ fechaVencimiento: '2030-01-01' })];
    const r = intercalarCortes(filas, [
      { fecha: '2025-01-01', rol: 'INQUILINO', motivo: 'B', parteAnterior: 'x', parteNueva: 'y' },
      { fecha: '2024-01-01', rol: 'PROPIETARIO', motivo: 'A', parteAnterior: 'x', parteNueva: 'y' },
    ]);
    const motivos = r.flatMap((x) => (x.tipo === 'corte' ? [x.corte.motivo] : []));
    expect(motivos).toEqual(['A', 'B']);
  });
});

describe('totales', () => {
  it('cuentan lo cancelado y lo pendiente; lo anulado y lo del sistema anterior, no', () => {
    const t = totalesDeFilas([
      fila({ estado: 'CANCELADA', valorNeto: 100 }),
      fila({ estado: 'PENDIENTE', valorNeto: 50 }),
      fila({ estado: 'ANULADA', valorNeto: 999 }),
      fila({ estado: 'ANTERIOR', valorNeto: 777 }),
    ]);
    expect(t).toEqual({ cancelado: 100, pendiente: 50, restaPorPagar: 50 });
  });

  it('se suman entre contratos', () => {
    expect(
      sumarTotales([
        { cancelado: 1, pendiente: 2, restaPorPagar: 3 },
        { cancelado: 10, pendiente: 20, restaPorPagar: 30 },
      ]),
    ).toEqual({ cancelado: 11, pendiente: 22, restaPorPagar: 33 });
  });

  it('cuenta las filas de un contrato para decidir si se pagina', () => {
    expect(cuantasFilas(contratoConImpuestos())).toBe(2);
  });
});

describe('filtros', () => {
  it('sin nada puesto, el documento sale TAL CUAL del back', () => {
    const doc = estadoDeCuenta();
    expect(hayFiltros(SIN_FILTROS)).toBe(false);
    expect(aplicarFiltros(doc, SIN_FILTROS)).toBe(doc);
  });

  it('«sólo pendientes» deja lo que se debe y RECALCULA los totales', () => {
    const doc = estadoDeCuenta({ contratos: [contrato()] });
    const r = aplicarFiltros(doc, { ...SIN_FILTROS, soloPendientes: true });
    const filas = r.contratos[0]!.secciones.arriendos;
    expect(filas).toHaveLength(2);
    expect(filas.every((f) => f.estado === 'PENDIENTE')).toBe(true);
    // El total del back decía 808.902 cancelado; sobre lo visible es cero.
    expect(r.contratos[0]!.totales.cancelado).toBe(0);
    expect(r.totales.restaPorPagar).toBe(299_098 + 1_108_000);
  });

  it('el rango de fechas corta por vencimiento', () => {
    const doc = estadoDeCuenta({ contratos: [contrato()] });
    const r = aplicarFiltros(doc, { ...SIN_FILTROS, desde: '2026-01-01' });
    // La cuota de 2022 (sistema anterior) queda afuera.
    expect(r.contratos[0]!.secciones.arriendos).toHaveLength(3);
  });

  it('un contrato que se queda sin filas DESAPARECE: una sección vacía miente', () => {
    const doc = estadoDeCuenta();
    const r = aplicarFiltros(doc, { ...SIN_FILTROS, desde: '2030-01-01' });
    expect(r.contratos).toHaveLength(0);
  });

  it('filtrar por contrato deja sólo ese', () => {
    const r = aplicarFiltros(estadoDeCuenta(), { ...SIN_FILTROS, contrato: '1659' });
    expect(r.contratos.map((c) => c.numero)).toEqual(['1659']);
  });
});

describe('estados', () => {
  it('una cuota pendiente que ya venció se marca vencida', () => {
    const f = fila({ estado: 'PENDIENTE', fechaVencimiento: '2026-01-01' });
    expect(estaVencida(f, '2026-09-13')).toBe(true);
  });

  it('una cancelada NUNCA está vencida, por vieja que sea', () => {
    const f = fila({ estado: 'CANCELADA', fechaVencimiento: '2020-01-01' });
    expect(estaVencida(f, '2026-09-13')).toBe(false);
  });

  it('la del día de hoy todavía no venció', () => {
    const f = fila({ estado: 'PENDIENTE', fechaVencimiento: '2026-09-13' });
    expect(estaVencida(f, '2026-09-13')).toBe(false);
  });

  it('la misma cuota saldada se lee «Cancelada» al inquilino y «Pagada» al propietario', () => {
    expect(pintaDelEstado('CANCELADA', 'INQUILINO').texto).toBe('Cancelada');
    expect(pintaDelEstado('CANCELADA', 'PROPIETARIO').texto).toBe('Pagada');
    expect(pintaDelEstado('PENDIENTE', 'PROPIETARIO').texto).toBe('Pendiente');
  });

  it('«Sistema anterior» es su propia palabra, no «Contrato terminado»', () => {
    expect(pintaDelEstado('ANTERIOR', 'INQUILINO').texto).toBe('Sistema anterior');
  });

  it('el rol tiene nombre en castellano', () => {
    expect(comoSeLlamaElRol('INQUILINO')).toBe('Inquilino');
    expect(comoSeLlamaElRol('PROPIETARIO')).toBe('Propietario');
  });
});
