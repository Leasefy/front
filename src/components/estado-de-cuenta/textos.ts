'use client';

/**
 * Los textos del estado de cuenta, en un solo lugar.
 *
 * Van acá y no en `locales/es.json` por la misma razón que los de
 * `CuentaDeCobro`: es un documento que se ENTREGA, sus palabras son las que la
 * inmobiliaria ya conoce de su formato de siempre, y `t()` devuelve la clave
 * cuando no la encuentra — un documento con `estadoDeCuenta.titulo` impreso
 * encima sería peor que no tenerlo.
 *
 * El porqué de no pasar por `useI18n` está en `useTextoDelEstado`, abajo.
 */

export const TEXTO: Record<string, string> = {
  'estadoDeCuenta.titulo': 'Estado de cuenta',
  'estadoDeCuenta.de': 'Estado de cuenta de',
  'estadoDeCuenta.nit': 'NIT',
  'estadoDeCuenta.matricula': 'Matrícula inmobiliaria',
  'estadoDeCuenta.telefono': 'Teléfono',
  'estadoDeCuenta.ciudadYFecha': '{{ciudad}}, {{fecha}}',
  'estadoDeCuenta.sinEmisor': 'Inmobiliaria sin datos de contacto cargados',

  'estadoDeCuenta.restaPorPagar': 'Resta por pagar',
  'estadoDeCuenta.cancelado': 'Cancelado',
  'estadoDeCuenta.pendiente': 'Pendiente',
  'estadoDeCuenta.totalesDelContrato': 'Totales del contrato {{numero}}',
  'estadoDeCuenta.totalGeneral': 'Total en todos sus contratos',

  'estadoDeCuenta.proximaCuota': 'Próxima cuota',
  'estadoDeCuenta.sinProxima': 'No queda ninguna cuota por vencer',
  'estadoDeCuenta.estado': 'Estado',
  'estadoDeCuenta.alDia': 'Al día',
  'estadoDeCuenta.enMoraDias': 'En mora · {{dias}} días',
  'estadoDeCuenta.cuotasVencidas': '{{n}} cuotas vencidas',
  'estadoDeCuenta.unaCuotaVencida': '1 cuota vencida',
  'estadoDeCuenta.cuotasDe': '{{pagadas}} de {{total}} cuotas',
  'estadoDeCuenta.delSistemaAnterior': '{{n}} del sistema anterior',

  'estadoDeCuenta.compartir': 'Compartir',
  'estadoDeCuenta.porCorreo': 'Enviar por correo',
  'estadoDeCuenta.porWhatsapp': 'Enviar por WhatsApp',
  'estadoDeCuenta.copiarEnlace': 'Copiar enlace',
  'estadoDeCuenta.enlaceCopiado': 'Enlace copiado',
  'estadoDeCuenta.enlaceVence': 'Vence el {{fecha}}',
  'estadoDeCuenta.copialoAMano': 'Cópialo a mano',
  'estadoDeCuenta.armandoEnlace': 'Armando el enlace…',
  'estadoDeCuenta.falloEnlace': 'No se pudo armar el enlace para compartir.',
  'estadoDeCuenta.correoEnviado': 'Estado de cuenta enviado a {{correo}}',
  'estadoDeCuenta.whatsappEnviado': 'Estado de cuenta enviado por WhatsApp a {{telefono}}',
  'estadoDeCuenta.falloCorreo': 'No se pudo enviar el correo.',
  'estadoDeCuenta.sinWhatsapp':
    'Este cliente no autorizó WhatsApp o no tiene teléfono cargado.',
  'estadoDeCuenta.mensajeParaCompartir':
    'Hola {{nombre}}, este es tu estado de cuenta con {{inmobiliaria}}: {{url}}',

  'estadoDeCuenta.verEstadoDeCuenta': 'Ver estado de cuenta',
  'estadoDeCuenta.miEstadoDeCuenta': 'Mi estado de cuenta',
  'estadoDeCuenta.enlaceVencido': 'Este enlace ya venció',
  'estadoDeCuenta.enlaceVencidoDetalle':
    'Pídele a tu inmobiliaria uno nuevo: los enlaces vencen para que tu información no quede abierta en internet.',

  'estadoDeCuenta.contrato': 'Contrato {{numero}}',
  'estadoDeCuenta.numeroDeLeasefy': 'Leasefy #{{numero}}',
  'estadoDeCuenta.comoInquilino': 'Inquilino del inmueble en {{direccion}}',
  'estadoDeCuenta.comoPropietario': 'Propietario del inmueble en {{direccion}}',
  'estadoDeCuenta.vigente': 'Vigente',
  'estadoDeCuenta.terminado': 'Terminado',

  'estadoDeCuenta.arriendos': 'Arriendos',
  'estadoDeCuenta.otrosConceptos': 'Otros conceptos',
  'estadoDeCuenta.sinOtrosConceptos': 'Este contrato no tiene otros conceptos.',
  'estadoDeCuenta.sinArriendos': 'Ninguna cuota de arriendo con estos filtros.',

  'estadoDeCuenta.colConcepto': 'Concepto',
  'estadoDeCuenta.colEstado': 'Estado',
  'estadoDeCuenta.colPagado': 'Fecha de pago',
  'estadoDeCuenta.colBruto': 'Valor bruto',
  'estadoDeCuenta.colNeto': 'Valor neto',
  'estadoDeCuenta.colVence': 'Vence',
  'estadoDeCuenta.colDocumento': 'Documento de pago',
  'estadoDeCuenta.sinPago': 'Sin pago',
  'estadoDeCuenta.vencida': 'vencida',
  'estadoDeCuenta.saldoDe': 'Saldo pendiente',
  'estadoDeCuenta.columnasOmitidas':
    'No se muestran {{columnas}}: son cero en todas las filas de este contrato.',

  'estadoDeCuenta.quiebre': '{{motivo}} · {{fecha}}',
  'estadoDeCuenta.quiebreDeA': 'de {{anterior}} a {{nueva}}',

  'estadoDeCuenta.filtros': 'Filtros',
  'estadoDeCuenta.soloPendientes': 'Sólo lo pendiente',
  'estadoDeCuenta.todo': 'Todo',
  'estadoDeCuenta.pendientes': 'Pendiente',
  'estadoDeCuenta.queMostrar': 'Qué mostrar',
  'estadoDeCuenta.periodo': 'Período',
  'estadoDeCuenta.periodoTodo': 'Todo el período',
  'estadoDeCuenta.periodoDesde': 'desde {{desde}}',
  'estadoDeCuenta.periodoHasta': 'hasta {{hasta}}',
  'estadoDeCuenta.esteMes': 'Este mes',
  'estadoDeCuenta.ultimosTresMeses': 'Últimos 3 meses',
  'estadoDeCuenta.proximosTresMeses': 'Próximos 3 meses',
  'estadoDeCuenta.esteAnio': 'Este año',
  'estadoDeCuenta.quitarPeriodo': 'Quitar el período',
  'estadoDeCuenta.fechasExactas': 'Fechas exactas…',
  'estadoDeCuenta.desde': 'Desde',
  'estadoDeCuenta.hasta': 'Hasta',
  'estadoDeCuenta.todosLosContratos': 'Todos los contratos',
  'estadoDeCuenta.limpiar': 'Limpiar',
  'estadoDeCuenta.viendoFilas': '{{visibles}} de {{total}} filas',
  'estadoDeCuenta.filtrado':
    'Los totales son de lo que estás viendo, no de todo el contrato.',

  'estadoDeCuenta.volver.contrato': 'Volver al contrato',
  'estadoDeCuenta.volver.inmueble': 'Volver al inmueble',
  'estadoDeCuenta.volver.cobro': 'Volver a cobros',
  'estadoDeCuenta.volver.propietario': 'Volver al propietario',
  'estadoDeCuenta.volver.dispersiones': 'Volver a dispersiones',
  'estadoDeCuenta.volver.lista': 'Volver a la lista',
  'estadoDeCuenta.volver.otro': 'Volver',

  'estadoDeCuenta.contratoPalabra': 'Contrato',
  'estadoDeCuenta.colPago': 'Pago',
  'estadoDeCuenta.pagadasDe': 'Pagadas {{pagadas}} de {{total}} cuotas',
  'estadoDeCuenta.deLoPactado': '{{pagado}} de {{pactado}}',
  'estadoDeCuenta.leyendaPagadas': 'Pagadas en Leasefy',
  'estadoDeCuenta.leyendaAnteriores': 'Del sistema anterior',
  'estadoDeCuenta.leyendaPorPagar': 'Por pagar',
  'estadoDeCuenta.unaFila': '1 fila',
  'estadoDeCuenta.nFilas': '{{n}} filas',
  'estadoDeCuenta.totalDelContrato': 'Total del contrato',
  'estadoDeCuenta.vencido': 'Vencido',

  // Intereses de mora (2026-09-16): van APARTE del capital.
  'estadoDeCuenta.intereses': 'Intereses de mora',
  'estadoDeCuenta.interesesExplicacion':
    'Van aparte del capital. Se liquidan con las reglas de mora de la inmobiliaria y crecen cada día mientras la cuota siga en mora.',
  'estadoDeCuenta.colDiasDeMora': 'Días de mora',
  'estadoDeCuenta.colLiquidado': 'Liquidado',
  'estadoDeCuenta.colAbonado': 'Abonado',
  'estadoDeCuenta.colFalta': 'Falta',
  'estadoDeCuenta.pagadaEnMora': 'La cuota se pagó en mora',
  'estadoDeCuenta.unDia': '1 día',
  'estadoDeCuenta.nDias': '{{n}} días',
  'estadoDeCuenta.unaCuota': '1 cuota',
  'estadoDeCuenta.nCuotas': '{{n}} cuotas',
  'estadoDeCuenta.interesesDeMora': 'Intereses de mora',
  'estadoDeCuenta.conIntereses': 'Total con intereses',
  'estadoDeCuenta.masIntereses': '+ {{monto}} de intereses de mora',
  'estadoDeCuenta.sinReglasDeMora':
    'La inmobiliaria no tiene reglas de mora activas: {{cuotas}} en mora sin intereses.',
  'estadoDeCuenta.sinInteresPorOtroMotivo': '{{cuotas}} en mora sin intereses. {{motivo}}',
  'estadoDeCuenta.configurarReglas': 'Configurar las reglas de mora',

  'estadoDeCuenta.descargarPDF': 'Descargar PDF',
  'estadoDeCuenta.imprimir': 'Imprimir',
  'estadoDeCuenta.generando': 'Armando el PDF…',
  'estadoDeCuenta.falloPDF': 'No se pudo armar el PDF. Vuelve a intentarlo.',

  'estadoDeCuenta.sinContratos': 'Este cliente no tiene contratos',
  'estadoDeCuenta.sinContratosDetalle':
    'Sin contrato no hay cuotas que diferir, así que no hay estado de cuenta que mostrar.',
  'estadoDeCuenta.sinResultados': 'Ninguna fila con estos filtros',
  'estadoDeCuenta.sinResultadosDetalle':
    'Quita los filtros para volver a ver el estado de cuenta completo.',
  'estadoDeCuenta.pie': 'Generado por Leasefy el {{fecha}}',
  'estadoDeCuenta.pagina': 'Página {{n}} de {{total}}',
};

export function interpolar(
  texto: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return texto;
  return texto.replace(/\{\{(\w+)\}\}/g, (_, k: string) =>
    params[k] === undefined ? `{{${k}}}` : String(params[k]),
  );
}

/** El texto de una clave, ya interpolado. */
export function texto(
  clave: string,
  params?: Record<string, string | number>,
): string {
  const propio = TEXTO[clave];
  return propio ? interpolar(propio, params) : clave;
}

/**
 * 🔴 Este documento NO pasa por `useI18n`, y es a propósito.
 *
 * Se monta en SEIS lugares: la pantalla del panel, la ficha del contrato, la
 * del inquilino, la del propietario, los dos portales y —la que manda— la
 * página PÚBLICA del enlace, que vive fuera de todo proveedor porque quien la
 * abre no tiene sesión. `useI18n` TIRA sin `I18nProvider` encima, y
 * `useOptionalI18n` tampoco alcanza: las pruebas de las tres fichas que lo
 * hospedan reemplazan `@/lib/i18n` con un doble que sólo exporta `useI18n`, y
 * llamar a lo que el doble no exporta tumbaba esas pantallas enteras.
 *
 * Un resumen en una ficha no puede tumbar la ficha. Las palabras del estado de
 * cuenta viven arriba, en castellano, que es el idioma del documento que la
 * inmobiliaria le entrega a su cliente en Colombia; el día que haya que
 * traducirlo, se cambia acá y en un solo lugar.
 *
 * Se deja como hook —y no como `texto` a secas— para que ese día el cambio sea
 * de una línea y no de cuarenta llamadas.
 */
export function useTextoDelEstado() {
  return texto;
}
