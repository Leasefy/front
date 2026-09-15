/**
 * Un estado de cuenta de ejemplo para las pruebas.
 *
 * 🔴 Es SÓLO para pruebas: ninguna pantalla lo importa. Los números y los
 * conceptos salen de los dos PDF reales de Nui (PORTOFINO PROPIEDAD RAIZ
 * S.A.S, contratos 1298 y 1659 de J Y C PAPAS S.A.S), porque una prueba con
 * datos inventados no atrapa los casos que rompen: el abono parcial que parte
 * la fila, el contrato sin un solo impuesto, el período migrado.
 */

import type {
  ContratoDelEstadoDeCuenta,
  EstadoDeCuenta,
  FilaDelEstadoDeCuenta,
} from '@/lib/types/estado-de-cuenta';

export function fila(
  over: Partial<FilaDelEstadoDeCuenta> = {},
): FilaDelEstadoDeCuenta {
  return {
    concepto: 'Canon De Arrendamiento Personas Naturales. De 21-Jun-2026 hasta 20-Jul-2026',
    estado: 'CANCELADA',
    fechaDePago: '2026-07-10',
    valorBruto: 808_902,
    iva: 0,
    retencion: 0,
    reteIva: 0,
    reteIca: 0,
    valorNeto: 808_902,
    fechaVencimiento: '2026-06-21',
    documentoDePago: {
      numero: '28518',
      tipo: 'INGRESO',
      descripcion: 'J Y C PAPAS S.A.S PAGO CANON MAYO MEZANINE',
    },
    parcial: false,
    periodoDesde: '2026-06-21',
    periodoHasta: '2026-07-20',
    ...over,
  };
}

export function contrato(
  over: Partial<ContratoDelEstadoDeCuenta> = {},
): ContratoDelEstadoDeCuenta {
  return {
    id: 'ct-1298',
    numero: '1298',
    rol: 'INQUILINO',
    inmueble: { direccion: 'CL 129 SUR 56 53 LC 01 MEZANINE ED. MIXTO TORRE ALEJANDRIA PH' },
    vigente: true,
    secciones: {
      arriendos: [
        // Una cuota abonada a medias: Nui la parte en dos filas y nosotros
        // también. La primera es lo que entró; la segunda, lo que falta.
        fila({ valorBruto: 808_902, valorNeto: 808_902 }),
        fila({
          concepto:
            'Saldo pendiente por Canon De Arrendamiento Personas Naturales. De 21-Jun-2026 hasta 20-Jul-2026',
          estado: 'PENDIENTE',
          fechaDePago: null,
          documentoDePago: null,
          parcial: true,
          valorBruto: 299_098,
          valorNeto: 299_098,
        }),
        fila({
          concepto: 'Canon De Arrendamiento Personas Naturales. De 21-Sep-2026 hasta 20-Oct-2026',
          estado: 'PENDIENTE',
          fechaDePago: null,
          documentoDePago: null,
          valorBruto: 1_108_000,
          valorNeto: 1_108_000,
          fechaVencimiento: '2026-09-21',
          periodoDesde: '2026-09-21',
          periodoHasta: '2026-10-20',
        }),
        // Un período que gestionó el sistema anterior: se muestra, no se cobra.
        fila({
          concepto: 'Canon De Arrendamiento. De 21-Ene-2022 hasta 20-Feb-2022',
          estado: 'ANTERIOR',
          fechaDePago: null,
          documentoDePago: null,
          valorBruto: 500_000,
          valorNeto: 500_000,
          fechaVencimiento: '2022-01-21',
          periodoDesde: '2022-01-21',
          periodoHasta: '2022-02-20',
        }),
      ],
      otrosConceptos: [],
    },
    totales: { cancelado: 808_902, pendiente: 299_098, restaPorPagar: 1_407_098 },
    cortes: [
      {
        fecha: '2024-03-01',
        rol: 'PROPIETARIO',
        motivo: 'Venta del inmueble',
        parteAnterior: 'CONSTRUCTORA ALEJANDRIA Y ASOCIADOS S.A.S',
        parteNueva: 'INVERSIONES EL PORTAL S.A.S',
      },
    ],
    ...over,
  };
}

/** El contrato 1659: con IVA y retención, y con «Otros conceptos». */
export function contratoConImpuestos(): ContratoDelEstadoDeCuenta {
  return contrato({
    id: 'ct-1659',
    numero: '1659',
    vigente: false,
    inmueble: { direccion: 'CALLE 128 SUR # 44B 05, 1ER PISO' },
    secciones: {
      arriendos: [
        fila({
          concepto: 'Canon De Arrendamiento Con Iva y Retención. De 01-Mar-2026 hasta 31-Mar-2026',
          valorBruto: 2_000_000,
          iva: 380_000,
          retencion: 70_000,
          valorNeto: 2_310_000,
          fechaVencimiento: '2026-03-01',
          periodoDesde: '2026-03-01',
          periodoHasta: '2026-03-31',
        }),
      ],
      otrosConceptos: [
        fila({
          concepto: 'Papelería',
          valorBruto: 29_412,
          iva: 5_588,
          valorNeto: 35_000,
          fechaVencimiento: '2026-02-15',
          periodoDesde: null,
          periodoHasta: null,
        }),
      ],
    },
    totales: { cancelado: 2_345_000, pendiente: 0, restaPorPagar: 0 },
    cortes: [],
  });
}

export function estadoDeCuenta(
  over: Partial<EstadoDeCuenta> = {},
): EstadoDeCuenta {
  const contratos = over.contratos ?? [contrato(), contratoConImpuestos()];
  return {
    cliente: { nombre: 'J Y C PAPAS S.A.S', documento: '901559008', tipo: 'INQUILINO' },
    inmobiliaria: {
      razonSocial: 'PORTOFINO PROPIEDAD RAIZ S.A.S',
      nit: '901548190',
      matricula: '165',
      telefono: '3205234056',
      ciudad: 'Caldas',
      logoUrl: null,
    },
    fecha: '2026-09-13',
    contratos,
    totales: { cancelado: 3_153_902, pendiente: 299_098, restaPorPagar: 1_407_098 },
    ...over,
  };
}
