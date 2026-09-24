/**
 * El ciclo de vida del contrato después de firmado: terminarlo antes de
 * tiempo, ver cuántos están vencidos y registrar la cesión cuando el
 * propietario vende.
 *
 * Espeja `CicloDeVidaDelContratoController` del back.
 */

import { apiClient, ApiError, getAccessToken } from './client';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

/** Un multipart al back, con el mismo manejo de error que `apiClient`. */
async function enviarFormulario<T>(ruta: string, formulario: FormData): Promise<T> {
  const token = getAccessToken();
  let respuesta: Response;
  try {
    respuesta = await fetch(`${BACKEND_URL}${ruta}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formulario,
    });
  } catch (error) {
    throw new ApiError(
      0,
      `No pudimos conectarnos al servidor. ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!respuesta.ok) {
    const cuerpo = (await respuesta.json().catch(() => ({}))) as { message?: unknown; code?: unknown };
    const mensaje = Array.isArray(cuerpo.message)
      ? (cuerpo.message as string[])
      : typeof cuerpo.message === 'string'
        ? cuerpo.message
        : 'No se pudo guardar';
    throw new ApiError(respuesta.status, mensaje, typeof cuerpo.code === 'string' ? cuerpo.code : undefined);
  }
  return respuesta.json() as Promise<T>;
}

export interface MotivoDeTerminacion {
  codigo: string;
  nombre: string;
  /** `OTRO` — el back rechaza la terminación sin nota. */
  exigeNota: boolean;
}

export interface ProrrateoDelUltimoMes {
  mes: string;
  diasOcupados: number;
  diasDelMes: number;
  valorCop: number;
  canonMensualCop: number;
  /**
   * 🔴 El último día que se cobra: la fecha del acta, INCLUSIVE (Nico, 17-09,
   * segunda vuelta). D8 —«el fin que cae en el aniversario termina un día
   * antes»— es la regla del TÉRMINO del contrato, no la de una entrega.
   */
  ultimoDiaCobrado?: string;
  /** Siempre `false` en una terminación: D8 no aplica acá. */
  terminaUnDiaAntes?: boolean;
}

export interface VistaPreviaDeTerminacion {
  puedeTerminarse: boolean;
  /** Por qué no se puede, en castellano. `null` cuando sí se puede. */
  razon: string | null;
  prorrateoDelUltimoMes: ProrrateoDelUltimoMes | null;
  finPactado: string | null;
  /** `false` = falta aplicar la migración en esta base. */
  disponible: boolean;
  /** La penalidad por defecto (cánones del contrato o de la inmobiliaria), para prellenar. */
  penalidadSugerida?: { canones: number; valorCop: number } | null;
  /** D10: lo que falta de la garantía de servicios para recibir el inmueble. */
  garantiaDeServiciosPendiente?: string | null;
}

export interface ResultadoDeTerminacion {
  contractId: string;
  terminadoEn: string;
  motivo: string;
  motivoLegible: string;
  finPactadoOriginal: string | null;
  inmuebleLiberado: boolean;
  prorrateoDelUltimoMes: ProrrateoDelUltimoMes | null;
}

export interface ContratoVencido {
  id: string;
  code: number;
  externalId: string | null;
  tenantName: string | null;
  propertyAddress: string | null;
  propertyId: string | null;
  monthlyRent: number | null;
  endDate: string;
  diasVencido: number;
  leyenda: string;
  tieneRenovacionAbierta: boolean;
  /** Hasta cuándo quedaría renovado por el término inicial (17-09). */
  renovarPorTerminoInicialHasta?: string | null;
}

export type OrigenDelIncremento = 'IPC' | 'DIGITADO' | 'TASA_PACTADA' | 'RENOVACION';
export type EstadoDeLaCarta = 'PENDIENTE_DE_REVISION' | 'REVISADA' | 'ENVIADA';
export type MedioDeLaCarta = 'CORREO' | 'FISICO' | 'WHATSAPP' | 'OTRO';
/** D6: dónde está la carta hoy. */
export type EstadoEnLaBandeja =
  | 'TODAVIA_NO'
  | 'POR_ENVIAR'
  | 'VENCIDA_SIN_CONSTANCIA'
  | 'ENVIADA'
  | 'ARCHIVADA';

export interface CartaDelIncremento {
  estado: EstadoDeLaCarta;
  contenido: string | null;
  generadaAt: string | null;
  revisadaAt: string | null;
  enviadaAt: string | null;
  medio?: MedioDeLaCarta | null;
  destinatario?: string | null;
  constancia?: string | null;
  ultimoIntentoAt?: string | null;
  ultimoIntento?: string | null;
  /**
   * 🔴 El soporte de la constancia (guía del correo certificado, acta de
   * entrega personal). `null` = no se adjuntó ninguno, y está bien: adjuntarlo
   * es OPCIONAL (Nico, 17-09).
   */
  soporteNombre?: string | null;
}

export interface AniversarioDelContrato {
  /** `YYYY-MM-DD`: desde este día rige el canon nuevo. */
  desde: string;
  origen: OrigenDelIncremento | null;
  porcentaje: number | null;
  canonAnteriorCop: number;
  canonNuevoCop: number;
  /** Por qué no sube, cuando no sube. */
  motivo: string | null;
  carta: CartaDelIncremento | null;
  /** D6: `null` cuando no hay incremento. */
  bandeja?: {
    estado: EstadoEnLaBandeja;
    diasParaElAniversario: number;
    /** 🔴 Llegó el aniversario sin constancia. */
    alertaRoja: boolean;
  } | null;
}

export interface IncrementosDelContrato {
  uso: 'VIVIENDA' | 'COMERCIAL' | null;
  tasaAnualPactadaPct: number | null;
  aniversarios: AniversarioDelContrato[];
  /** `false` = falta la migración: no se puede digitar ni generar cartas. */
  disponible: boolean;
  /** `false` = falta la migración de la constancia: no se puede enviar. */
  envioHabilitado: boolean;
  /** `false` = en este entorno el correo no sale de verdad: enviar simula y no deja constancia. */
  correoSaleDeVerdad?: boolean;
  diasAntesDeLaCarta?: number;
  /** Sólo en la respuesta de enviar. */
  ultimoEnvio?: { resultado: 'ENVIADA' | 'SIMULADA'; mensaje: string };
}

/** D6 · Una carta en la bandeja de la inmobiliaria. */
export interface CartaEnLaBandeja {
  contractId: string;
  code: number;
  externalId: string | null;
  inquilino: string | null;
  correoDelInquilino: string | null;
  inmueble: string | null;
  desde: string;
  diasParaElAniversario: number;
  estado: 'POR_ENVIAR' | 'VENCIDA_SIN_CONSTANCIA' | 'ENVIADA';
  alertaRoja: boolean;
  origen: string;
  porcentaje: number | null;
  canonAnteriorCop: number;
  canonNuevoCop: number;
  contenido: string;
  enviadaAt: string | null;
  medio: MedioDeLaCarta | null;
  ultimoIntento: string | null;
}

export interface BandejaDeCartas {
  diasAntes: number;
  disponible: boolean;
  porEnviar: number;
  vencidasSinConstancia: number;
  enviadas: number;
  cartas: CartaEnLaBandeja[];
}

// ── D5 · Prórroga ────────────────────────────────────────────────────────────

export type AccionDeLaProrroga =
  | 'NO_VENCIDO'
  | 'NO_APLICA'
  | 'PRORROGAR'
  | 'ALERTA_AVISO_DE_NO_RENOVACION'
  | 'ALERTA_SIN_USO'
  | 'ALERTA_TERMINO_POR_CONFIRMAR'
  /** 🔴 El contrato dice que NO se prorroga: nadie genera cuotas. */
  | 'ALERTA_NO_SE_PRORROGA';
export type ParteQueAvisa = 'INQUILINO' | 'PROPIETARIO' | 'INMOBILIARIA';

export interface PlanDeLaProrroga {
  contractId: string;
  accion: AccionDeLaProrroga;
  porQue: string;
  /** El último día que rige (D8). */
  ultimoDia: string | null;
  diasVencido: number;
  regla: 'LEY_820_ART_6' | 'PACTADA' | 'MES_A_MES' | null;
  meses: number | null;
  tramos: { finAnterior: string; finNuevo: string }[];
  finNuevo: string | null;
  /** Un solo término: lo puede hacer el proceso diario. */
  automatica: boolean;
  aviso: { at: string; por: string | null; motivo: string | null; fuente: 'CONTRATO' | 'RENOVACION' } | null;
  prorrogaMeses: number | null;
  /** 🔴 Al vencer NO se prorroga: queda en alerta y nadie genera cuotas. */
  noSeProrroga: boolean;
  /** `false` = falta la migración 20260918021000: no se puede apagar. */
  noSeProrrogaDisponible: boolean;
  /** 🔴 Esta prórroga es el PUENTE mes a mes de una renovación firmándose. */
  puenteDeRenovacion: boolean;
  uso: 'VIVIENDA' | 'COMERCIAL' | null;
  automaticaPrendida: boolean;
  /** `false` = falta la migración: se calcula, no se escribe. */
  disponible: boolean;
  historial: {
    finAnterior: string;
    finNuevo: string;
    meses: number;
    regla: string;
    origen: string;
    createdAt: string;
  }[];
}

export interface ResultadoDeLaProrroga {
  contractId: string;
  finAnterior: string;
  finNuevo: string;
  meses: number;
  regla: string;
  tramos: number;
}

// ── Condiciones del contrato ────────────────────────────────────────────────

export type ModalidadDeAdministracion =
  | 'INCLUIDA_EN_CANON'
  | 'LA_PAGA_EL_PROPIETARIO'
  | 'LA_PAGA_LA_INMOBILIARIA';

export interface CondicionesDelContrato {
  contractId: string;
  gastosDeCobranza: {
    disponible: boolean;
    delContrato: boolean | null;
    deLaAgencia: boolean | null;
    resuelto: boolean | null;
  };
  seguroOpcional: {
    disponible: boolean;
    /** `false` = falta la migración 20260918021000: sólo prima fija. */
    porcentajeDisponible: boolean;
    /**
     * 🔴 `pct` es el % DEL CANON que la inmobiliaria le puso a ese plan
     * (Nico, 17-09: «% del canon, no valor fijo»). Con él, `primaCop` ya es lo
     * que da el canon de hoy, no el valor fijo del plan.
     */
    oferta: { plan: string; nombre: string; primaCop: number; pct: number | null } | null;
    aceptado: {
      nombre: string | null;
      primaCop: number;
      /** `null` = prima fija, como hasta hoy. */
      pct: number | null;
      aceptadoEl: string;
      aceptadoPor: string;
    } | null;
    /** El % por plan que tiene configurado la inmobiliaria. */
    pctPorPlan: Record<string, number>;
  };
  poliza: {
    disponible: boolean;
    aseguradora: string | null;
    numero: string | null;
    cobertura: string | null;
    vigenciaDesde: string | null;
    vigenciaHasta: string | null;
  };
  administracion: {
    disponible: boolean;
    /** La modalidad RESUELTA: la elegida, o la del respaldo de los migrados. */
    modalidad: ModalidadDeAdministracion | null;
    /** Lo que el contrato tiene guardado. `null` = nadie la eligió. */
    modalidadElegida: ModalidadDeAdministracion | null;
    /**
     * 🔴 `true` = la modalidad sale del RESPALDO (Nico, 17-09: los contratos
     * migrados con `adminFee` quedan en «la paga la inmobiliaria»). No está
     * guardada: cualquier elección la reemplaza.
     */
    porRespaldo: boolean;
    valorCop: number | null;
    delMandatoCop: number | null;
    /** El mandato del inmueble: sin él no hay a qué colgarle la copropiedad. */
    consignacionId: string | null;
    /**
     * 🔴 A QUÉ COPROPIEDAD pertenece el inmueble (20-09-2026). Este bloque
     * hablaba de «la administración de la copropiedad» sin decir nunca cuál, y
     * sin ese dato la cuota se asienta SIN TERCERO en el libro — lo que tenía
     * a la cuenta 2815 con 1.241 líneas sin dueño y la exógena trabada.
     */
    copropiedad: {
      id: string;
      nombre: string;
      nit: string;
      digitoVerificacion: number | null;
    } | null;
    /** `false` = falta la migración `20260920090000`; no se puede declarar. */
    sePuedeDeclararLaCopropiedad: boolean;
  };
}

// ── D10 · Garantía de servicios públicos ─────────────────────────────────────

export type TipoDeMovimientoDeGarantia =
  | 'RECAUDO'
  | 'PAGO_DE_SERVICIO'
  | 'DEVOLUCION'
  | 'COBRO_DE_DIFERENCIA';

export interface FacturaDeServicio {
  servicio: string;
  periodo: string;
  valorCop: number;
}

export interface GarantiaDeServicios {
  contractId: string;
  disponible: boolean;
  momento: 'INICIO' | 'ENTREGA' | null;
  topeCop: number | null;
  /** 🔴 El tope en PERÍODOS de facturación (Nico, 17-09). Por defecto 2. */
  topePeriodos: number;
  /** Cuántos meses entran al promedio sugerido (6). */
  mesesDelPromedio: number;
  /** 🔴 El valor SUGERIDO: el promedio mensual de los últimos 6 períodos. */
  valorSugeridoCop: number | null;
  /** El tope que de verdad aplica: el más bajo entre pesos y períodos. */
  topeEfectivoCop: number | null;
  avisoDelTope: string | null;
  garantia: {
    momento: 'INICIO' | 'ENTREGA';
    valorCop: number;
    facturas: FacturaDeServicio[] | null;
    soporteNombre: string;
    nota: string | null;
    createdAt: string;
  } | null;
  cuenta: {
    valorCop: number;
    recaudadoCop: number;
    pagadoCop: number;
    devueltoCop: number;
    cobradoCop: number;
    saldoCop: number;
    faltaPorRecaudarCop: number;
    diferenciaPorCobrarCop: number;
    estado: 'POR_RECAUDAR' | 'RECAUDADA' | 'CON_DIFERENCIA_POR_COBRAR' | 'LIQUIDADA';
  } | null;
  movimientos: {
    id: string;
    tipo: TipoDeMovimientoDeGarantia;
    valorCop: number;
    fecha: string;
    descripcion: string;
    medio: string | null;
    soporteNombre: string | null;
    anulado: boolean;
    motivoDeAnulacion: string | null;
  }[];
  pendiente: string | null;
}

export interface ResultadoDeLaExtension {
  contractId: string;
  modo: 'DIAS_OCUPADOS' | 'TERMINO_INICIAL';
  finAnterior: string;
  finNuevo: string;
}

export interface ResumenDeVencidos {
  cuantos: number;
  cuantosSinRenovacion: number;
  aviso: string | null;
  contratos: ContratoVencido[];
}

export interface ResultadoDeLaCesion {
  contractId: string;
  desde: string;
  propietarioAnterior: string | null;
  propietarioNuevo: string;
  cuotasReapuntadas: number;
  parteId: string;
}

export const cicloDeVidaApi = {
  motivosDeTerminacion: () =>
    apiClient.get<{ motivos: MotivoDeTerminacion[] }>(
      '/contracts/motivos-de-terminacion',
    ),

  /** Qué pasa si termino en esa fecha. No escribe nada. */
  vistaPreviaDeTerminacion: (contractId: string, terminadoEn: string) =>
    apiClient.get<VistaPreviaDeTerminacion>(
      `/contracts/${contractId}/terminacion/vista-previa?terminadoEn=${encodeURIComponent(terminadoEn)}`,
    ),

  terminar: (
    contractId: string,
    body: {
      terminadoEn: string;
      motivo: string;
      nota?: string;
      /**
       * La penalidad, en pesos enteros. Ausente = la por defecto; `null` = sin
       * penalidad. Entra como cargo de una vez y le llega al propietario menos
       * la comisión (17-09).
       */
      penalidadCop?: number | null;
      /** Reparto negociado: la parte que se queda la inmobiliaria. */
      penalidadParaLaInmobiliariaCop?: number;
    },
  ) =>
    apiClient.post<ResultadoDeTerminacion>(
      `/contracts/${contractId}/terminar`,
      body,
    ),

  vencidos: () => apiClient.get<ResumenDeVencidos>('/contracts/vencidos'),

  registrarCesion: (
    contractId: string,
    body: {
      desde: string;
      nuevosPropietarios: { propietarioId: string; participacionBps: number }[];
      nota?: string;
    },
  ) =>
    apiClient.post<ResultadoDeLaCesion>(`/contracts/${contractId}/cesion`, body),

  /** Contrato vencido con el inquilino adentro: renovar por los días ocupados o por el término inicial. */
  extender: (
    contractId: string,
    body: { modo: 'DIAS_OCUPADOS' | 'TERMINO_INICIAL'; hasta?: string },
  ) => apiClient.post<ResultadoDeLaExtension>(`/contracts/${contractId}/extender`, body),

  incrementos: (contractId: string) =>
    apiClient.get<IncrementosDelContrato>(`/contracts/${contractId}/incrementos`),

  fijarTasaAnual: (contractId: string, porcentaje: number | null) =>
    apiClient.put<IncrementosDelContrato>(`/contracts/${contractId}/incrementos/tasa-anual`, {
      porcentaje,
    }),

  digitarIncremento: (
    contractId: string,
    desde: string,
    body: { porcentaje?: number | null; canonNuevoCop?: number | null },
  ) => apiClient.put<IncrementosDelContrato>(`/contracts/${contractId}/incrementos/${desde}`, body),

  generarCarta: (contractId: string, desde: string) =>
    apiClient.post<IncrementosDelContrato>(`/contracts/${contractId}/incrementos/${desde}/carta`, {}),

  revisarCarta: (contractId: string, desde: string, contenido?: string) =>
    apiClient.post<IncrementosDelContrato>(
      `/contracts/${contractId}/incrementos/${desde}/carta/revisar`,
      contenido ? { contenido } : {},
    ),

  /** D6: un clic. El back decide si el correo sale de verdad (`EMAIL_DELIVERY_ENABLED`). */
  enviarCarta: (contractId: string, desde: string, contenido?: string) =>
    apiClient.post<IncrementosDelContrato>(
      `/contracts/${contractId}/incrementos/${desde}/carta/enviar`,
      contenido ? { contenido } : {},
    ),

  /**
   * D6: la carta se entregó por otro medio (correo certificado, entrega
   * personal). 🔴 El soporte es OPCIONAL (Nico, 17-09): sin archivo se manda
   * como siempre; con archivo va en multipart.
   */
  registrarConstancia: (
    contractId: string,
    desde: string,
    body: {
      medio: 'FISICO' | 'WHATSAPP' | 'OTRO';
      fecha: string;
      nota: string;
      soporte?: File | null;
    },
  ) => {
    const ruta = `/contracts/${contractId}/incrementos/${desde}/carta/constancia`;
    if (!body.soporte) {
      return apiClient.post<IncrementosDelContrato>(ruta, {
        medio: body.medio,
        fecha: body.fecha,
        nota: body.nota,
      });
    }
    const formulario = new FormData();
    formulario.append('medio', body.medio);
    formulario.append('fecha', body.fecha);
    formulario.append('nota', body.nota);
    formulario.append('soporte', body.soporte);
    return enviarFormulario<IncrementosDelContrato>(ruta, formulario);
  },

  /** La URL firmada del soporte de una constancia. */
  soporteDeLaConstancia: (contractId: string, desde: string) =>
    apiClient.get<{ url: string; nombre: string }>(
      `/contracts/${contractId}/incrementos/${desde}/carta/constancia/soporte`,
    ),

  /** D6: la bandeja de cartas por enviar de la inmobiliaria. */
  bandejaDeCartas: () => apiClient.get<BandejaDeCartas>('/inmobiliaria/cartas-de-incremento'),

  // ── D5 ──
  prorroga: (contractId: string) =>
    apiClient.get<PlanDeLaProrroga>(`/contracts/${contractId}/prorroga`),

  prorrogar: (contractId: string) =>
    apiClient.post<ResultadoDeLaProrroga>(`/contracts/${contractId}/prorroga`, {}),

  fijarMesesDeProrroga: (contractId: string, meses: number | null) =>
    apiClient.put<PlanDeLaProrroga>(`/contracts/${contractId}/prorroga/meses`, { meses }),

  /** 🔴 «Este contrato NO se prorroga al vencer» (Nico, 17-09). */
  fijarNoSeProrroga: (contractId: string, noSeProrroga: boolean) =>
    apiClient.put<PlanDeLaProrroga>(`/contracts/${contractId}/prorroga/no-se-prorroga`, {
      noSeProrroga,
    }),

  registrarAvisoDeNoRenovacion: (contractId: string, body: { parte: ParteQueAvisa; motivo: string }) =>
    apiClient.post<PlanDeLaProrroga>(`/contracts/${contractId}/aviso-de-no-renovacion`, body),

  retirarAvisoDeNoRenovacion: (contractId: string) =>
    apiClient.delete<PlanDeLaProrroga>(`/contracts/${contractId}/aviso-de-no-renovacion`),

  // ── Condiciones ──
  condiciones: (contractId: string) =>
    apiClient.get<CondicionesDelContrato>(`/contracts/${contractId}/condiciones`),

  fijarGastosDeCobranza: (contractId: string, pacta: boolean | null) =>
    apiClient.put<CondicionesDelContrato>(`/contracts/${contractId}/gastos-de-cobranza`, { pacta }),

  aceptarSeguroOpcional: (
    contractId: string,
    body: {
      aceptadoPor: string;
      aceptadoEl: string;
      primaCop?: number | null;
      /** 🔴 El % del canon. Ausente = el que la inmobiliaria le puso al plan. */
      pct?: number | null;
    },
  ) => apiClient.put<CondicionesDelContrato>(`/contracts/${contractId}/seguro-opcional`, body),

  retirarSeguroOpcional: (contractId: string) =>
    apiClient.delete<CondicionesDelContrato>(`/contracts/${contractId}/seguro-opcional`),

  registrarPoliza: (
    contractId: string,
    body: {
      aseguradora: string | null;
      numero: string | null;
      cobertura: string | null;
      vigenciaDesde: string | null;
      vigenciaHasta: string | null;
    },
  ) => apiClient.put<CondicionesDelContrato>(`/contracts/${contractId}/poliza`, body),

  fijarAdministracionDeLaCopropiedad: (
    contractId: string,
    body: { modalidad: ModalidadDeAdministracion | null; valorCop?: number | null },
  ) =>
    apiClient.put<CondicionesDelContrato>(
      `/contracts/${contractId}/administracion-de-la-copropiedad`,
      body,
    ),

  // ── D10 ──
  garantiaDeServicios: (contractId: string) =>
    apiClient.get<GarantiaDeServicios>(`/contracts/${contractId}/garantia-de-servicios`),

  registrarGarantia: (
    contractId: string,
    datos: { valorCop?: number | null; facturas?: FacturaDeServicio[]; nota?: string; soporte: File },
  ) => {
    const formulario = new FormData();
    if (datos.valorCop) formulario.append('valorCop', String(datos.valorCop));
    if (datos.facturas && datos.facturas.length > 0) {
      formulario.append('facturas', JSON.stringify(datos.facturas));
    }
    if (datos.nota) formulario.append('nota', datos.nota);
    formulario.append('soporte', datos.soporte);
    return enviarFormulario<GarantiaDeServicios>(
      `/contracts/${contractId}/garantia-de-servicios`,
      formulario,
    );
  },

  movimientoDeGarantia: (
    contractId: string,
    datos: {
      tipo: TipoDeMovimientoDeGarantia;
      valorCop: number;
      fecha: string;
      descripcion: string;
      medio?: string;
      soporte?: File | null;
    },
  ) => {
    const formulario = new FormData();
    formulario.append('tipo', datos.tipo);
    formulario.append('valorCop', String(datos.valorCop));
    formulario.append('fecha', datos.fecha);
    formulario.append('descripcion', datos.descripcion);
    if (datos.medio) formulario.append('medio', datos.medio);
    if (datos.soporte) formulario.append('soporte', datos.soporte);
    return enviarFormulario<GarantiaDeServicios>(
      `/contracts/${contractId}/garantia-de-servicios/movimientos`,
      formulario,
    );
  },

  soporteDeLaGarantia: (contractId: string, movimientoId?: string | null) =>
    apiClient.get<{ url: string; nombre: string }>(
      `/contracts/${contractId}/garantia-de-servicios/soporte${
        movimientoId ? `?movimientoId=${encodeURIComponent(movimientoId)}` : ''
      }`,
    ),

  anularMovimientoDeGarantia: (contractId: string, movimientoId: string, motivo: string) =>
    apiClient.post<GarantiaDeServicios>(
      `/contracts/${contractId}/garantia-de-servicios/movimientos/${movimientoId}/anular`,
      { motivo },
    ),
};
