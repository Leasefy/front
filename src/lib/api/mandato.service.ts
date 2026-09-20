/**
 * El mandato y la plata del propietario (reglas del 17-09) — el cliente del back.
 *
 *   · D1 modalidad por mandato (garantizado / sobre recaudo) y D2 destino de los
 *     intereses de mora: `/inmobiliaria/consignaciones/:id/mandato`.
 *   · La modalidad por defecto, los cobros al arrendar y cómo se cobra el IVA de
 *     la comisión (D4): `/inmobiliaria/mandato/configuracion`.
 *   · Conceptos comisionables, cobros al arrendar y la bitácora del contrato:
 *     `/inmobiliaria/contratos/:id/...`.
 *   · El retiro de la administración con contrato vigente:
 *     `/inmobiliaria/consignaciones/:id/retiro`.
 *   · El cambio controlado de la cuenta bancaria del propietario:
 *     `/inmobiliaria/propietarios/:id/cambios-de-cuenta` y el público
 *     `/cuenta-bancaria/:token`.
 *
 * Sin las migraciones del back, las lecturas dicen `disponible: false` con el
 * motivo y las escrituras responden 503 con el mensaje en palabras.
 */

import { apiClient, ApiError, getAccessToken } from '@/lib/api/client';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

// ── Tipos ─────────────────────────────────────────────────────────────────

export type Modalidad = 'GARANTIZADO' | 'SOBRE_RECAUDO';
export type ModalidadDeLaLiquidacion = Modalidad | 'MIXTA';
export type DestinoDeLosIntereses = 'INMOBILIARIA' | 'PROPIETARIO' | 'REPARTO';

export interface ModalidadResuelta {
  modalidad: Modalidad | null;
  fuente: 'MANDATO' | 'INMOBILIARIA' | null;
  desde: string | null;
}

export interface DestinoResuelto {
  destino: DestinoDeLosIntereses;
  porcentajeAlPropietario: number;
  fuente: 'MANDATO' | 'MODALIDAD' | 'HOY';
  desde: string | null;
}

export interface MandatoDeLaConsignacion {
  disponible: boolean;
  motivo: string | null;
  consignacionId: string;
  modalidad: Modalidad | null;
  destinoDeLosIntereses: DestinoDeLosIntereses | null;
  interesesAlPropietarioPct: number | null;
  modalidadDesde: string | null;
  efectivo: { modalidad: ModalidadResuelta; intereses: DestinoResuelto };
  inmobiliaria: { modalidadDeMandato: Modalidad | null };
}

export type TipoDeCobroAlArrendar = 'PORCENTAJE_PRIMER_CANON' | 'VALOR_FIJO';

export interface CobroAlArrendar {
  id: string;
  nombre: string;
  tipo: TipoDeCobroAlArrendar;
  valor: number;
  opcional: boolean;
  activo: boolean;
}

export interface ConfiguracionDelMandato {
  disponible: boolean;
  motivo: string | null;
  modalidadDeMandato: Modalidad | null;
  modalidadDeMandatoDesde: string | null;
  cobrosAlArrendar: CobroAlArrendar[];
  ivaDeLaComision: {
    responsableIva: boolean | null;
    ivaPorcentaje: number;
    efecto: string;
  };
}

export interface CobroAlArrendarDelContrato extends CobroAlArrendar {
  valorCop: number;
  aplicado: boolean;
  motivo: string;
}

export interface CobrosAlArrendarDelContrato {
  disponible: boolean;
  motivo: string | null;
  primerCanonCop: number;
  propietarioName: string | null;
  cobros: CobroAlArrendarDelContrato[];
}

export interface EntradaDeLaBitacora {
  id: string;
  tipo: string;
  titulo: string;
  detalle: string | null;
  tieneAnexo: boolean;
  anexoNombre: string | null;
  actorUserId: string | null;
  actorNombre: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface BitacoraDelContrato {
  disponible: boolean;
  motivo: string | null;
  entradas: EntradaDeLaBitacora[];
}

export interface CuotaFuera {
  id: string;
  lado: 'INQUILINO' | 'PROPIETARIO';
  mes: string;
  netoCop: number;
}

export interface CuotaQueSeQueda extends CuotaFuera {
  porque: string;
}

export interface LiquidacionFinal {
  fechaDeCorte: string;
  porGirarCop: number;
  cuotasPorGirar: { mes: string; pendienteCop: number; enLiquidacion: boolean }[];
  carteraDelInquilinoCop: number;
  cuotasDelInquilinoPendientes: { mes: string; pendienteCop: number }[];
  deducciones: { pendienteCop: number; enLiquidacionCop: number; saldoEnContraCop: number };
  netoEstimadoCop: number;
  anuladoInquilinoCop: number;
  anuladoPropietarioCop: number;
}

export type ModoDeRetiro = 'HASTA_FIN_DEL_CONTRATO' | 'CORTE';

export interface RetiroGuardado {
  id: string;
  modo: ModoDeRetiro;
  fechaDeCorte: string | null;
  motivo: string | null;
  contractId: string;
  cuotasAnuladas: CuotaFuera[];
  cuotasSinAnular: CuotaQueSeQueda[];
  liquidacionFinal: LiquidacionFinal | null;
  tieneAviso: boolean;
  avisoGeneradoAt: string | null;
  createdAt: string;
}

export interface EstadoDelRetiro {
  disponible: boolean;
  motivo: string | null;
  consignacionId: string;
  terminada: boolean;
  contratoVigente: {
    id: string;
    code: number | null;
    tenantName: string | null;
    startDate: string | null;
    endDate: string | null;
  } | null;
  retiro: RetiroGuardado | null;
}

export interface PrevisualizacionDelCorte {
  fechaDeCorte: string;
  cuotasQueSalen: CuotaFuera[];
  cuotasQueNoSeTocan: CuotaQueSeQueda[];
  liquidacionFinal: LiquidacionFinal;
}

export type EstadoDelCambioDeCuenta =
  | 'PENDIENTE_CONFIRMACION'
  | 'CONFIRMADO'
  | 'APROBADO'
  | 'RECHAZADO'
  | 'ANULADO';

export interface CuentaBancaria {
  bankName: string | null;
  bankAccountType: string | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
  bankAccountHolderDocument: string | null;
  bankAccountHolderDocumentType: string | null;
}

export interface CambioDeCuenta {
  id: string;
  propietarioId: string;
  estado: EstadoDelCambioDeCuenta;
  cuentaAnterior: CuentaBancaria;
  cuentaNueva: CuentaBancaria;
  certificacionNombre: string;
  canal: string;
  destinoEnmascarado: string | null;
  envioEstado: string | null;
  expiraAt: string;
  intentos: number;
  confirmadoAt: string | null;
  confirmadoPor: string | null;
  aprobadoAt: string | null;
  aprobadoPorUserId: string | null;
  tieneSoporteDeAprobacion: boolean;
  cerradoAt: string | null;
  motivoDeCierre: string | null;
  solicitadoPorUserId: string | null;
  createdAt: string;
  retieneElGiro: boolean;
}

export interface CambiosDeCuentaDelPropietario {
  disponible: boolean;
  motivo: string | null;
  cambios: CambioDeCuenta[];
}

export interface SolicitudDeCambioDeCuenta {
  bankCode?: string;
  bankName?: string;
  bankAccountType: 'AHORROS' | 'CORRIENTE';
  bankAccountNumber: string;
  bankAccountHolder?: string;
  bankAccountHolderDocument?: string;
  bankAccountHolderDocumentType?: string;
  certificacion: File;
}

export interface CambioDeCuentaPublico {
  estado: EstadoDelCambioDeCuenta;
  inmobiliaria: string;
  propietario: string;
  banco: string | null;
  tipoDeCuenta: string | null;
  cuentaEnmascarada: string;
  expiraAt: string;
  vencido: boolean;
}

export interface CaptacionesYArriendos {
  desde: string;
  hasta: string;
  asesores: {
    userId: string;
    nombre: string;
    activo: boolean;
    captados: number;
    arrendados: number;
  }[];
  sinAsesor: { captados: number; arrendados: number };
  captaciones: {
    consignacionId: string;
    inmueble: string;
    propietario: string | null;
    fecha: string;
    agenteUserId: string | null;
    agenteNombre: string | null;
  }[];
  arriendos: {
    pipelineItemId: string;
    consignacionId: string | null;
    inmueble: string | null;
    inquilino: string;
    fecha: string;
    agenteUserId: string | null;
    agenteNombre: string | null;
  }[];
}

// ── Multipart ─────────────────────────────────────────────────────────────

/** Un POST con archivo, con el mismo manejo de errores que `apiClient`. */
async function enviarFormulario<T>(ruta: string, formulario: FormData, porDefecto: string): Promise<T> {
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
        : porDefecto;
    throw new ApiError(respuesta.status, mensaje, typeof cuerpo.code === 'string' ? cuerpo.code : undefined);
  }
  return respuesta.json() as Promise<T>;
}

/** Una llamada pública, sin token ni manejo de sesión. */
async function sinSesion<T>(method: 'GET' | 'POST', ruta: string): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${BACKEND_URL}${ruta}`, {
      method,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
  } catch (error) {
    throw new ApiError(
      0,
      `No pudimos conectarnos al servidor. ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!respuesta.ok) {
    const cuerpo = (await respuesta.json().catch(() => ({}))) as { message?: unknown; code?: unknown };
    throw new ApiError(
      respuesta.status,
      typeof cuerpo.message === 'string' ? cuerpo.message : `Error ${respuesta.status}`,
      typeof cuerpo.code === 'string' ? cuerpo.code : undefined,
    );
  }
  return respuesta.json() as Promise<T>;
}

// ── Cliente ───────────────────────────────────────────────────────────────

export const mandatoApi = {
  configuracion: () => apiClient.get<ConfiguracionDelMandato>('/inmobiliaria/mandato/configuracion'),

  guardarConfiguracion: (cambios: {
    modalidadDeMandato?: Modalidad | null;
    cobrosAlArrendar?: Array<Omit<CobroAlArrendar, 'id' | 'activo'> & { id?: string; activo?: boolean }> | null;
  }) => apiClient.put<ConfiguracionDelMandato>('/inmobiliaria/mandato/configuracion', cambios),

  delMandato: (consignacionId: string) =>
    apiClient.get<MandatoDeLaConsignacion>(`/inmobiliaria/consignaciones/${consignacionId}/mandato`),

  guardarMandato: (
    consignacionId: string,
    cambios: {
      modalidad?: Modalidad | null;
      destinoDeLosIntereses?: DestinoDeLosIntereses | null;
      interesesAlPropietarioPct?: number | null;
    },
  ) => apiClient.put<MandatoDeLaConsignacion>(`/inmobiliaria/consignaciones/${consignacionId}/mandato`, cambios),

  marcarComisionable: (contractId: string, conceptoId: string, comisionable: boolean) =>
    apiClient.put<{ id: string; comisionable: boolean | null }>(
      `/inmobiliaria/contratos/${contractId}/conceptos/${conceptoId}/comisionable`,
      { comisionable },
    ),

  cobrosAlArrendar: (contractId: string) =>
    apiClient.get<CobrosAlArrendarDelContrato>(`/inmobiliaria/contratos/${contractId}/cobros-al-arrendar`),

  aplicarCobrosAlArrendar: (contractId: string, cobroIds: string[]) =>
    apiClient.post<{
      aplicados: { cobroId: string; nombre: string; valorCop: number }[];
      yaEstaban: { cobroId: string; nombre: string }[];
    }>(`/inmobiliaria/contratos/${contractId}/cobros-al-arrendar`, { cobroIds }),

  bitacora: (contractId: string) =>
    apiClient.get<BitacoraDelContrato>(`/inmobiliaria/contratos/${contractId}/bitacora`),

  anexoDeLaBitacora: (contractId: string, entradaId: string) =>
    apiClient.get<{ url: string; nombre: string }>(
      `/inmobiliaria/contratos/${contractId}/bitacora/${entradaId}/anexo`,
    ),

  estadoDelRetiro: (consignacionId: string) =>
    apiClient.get<EstadoDelRetiro>(`/inmobiliaria/consignaciones/${consignacionId}/retiro`),

  previsualizarRetiro: (consignacionId: string, fechaDeCorte: string) =>
    apiClient.get<PrevisualizacionDelCorte>(
      `/inmobiliaria/consignaciones/${consignacionId}/retiro/previsualizar?fechaDeCorte=${encodeURIComponent(fechaDeCorte)}`,
    ),

  registrarRetiro: (
    consignacionId: string,
    retiro: { modo: ModoDeRetiro; fechaDeCorte?: string; motivo?: string },
  ) => apiClient.post<EstadoDelRetiro>(`/inmobiliaria/consignaciones/${consignacionId}/retiro`, retiro),

  avisoDelRetiro: (consignacionId: string) =>
    apiClient.get<{ html: string }>(`/inmobiliaria/consignaciones/${consignacionId}/retiro/aviso`),

  avisoDelRetiroEnPdf: (consignacionId: string) =>
    apiClient.getBlob(`/inmobiliaria/consignaciones/${consignacionId}/retiro/aviso.pdf`),

  cambiosDeCuenta: (propietarioId: string) =>
    apiClient.get<CambiosDeCuentaDelPropietario>(`/inmobiliaria/propietarios/${propietarioId}/cambios-de-cuenta`),

  solicitarCambioDeCuenta: (propietarioId: string, s: SolicitudDeCambioDeCuenta) => {
    const f = new FormData();
    if (s.bankCode) f.append('bankCode', s.bankCode);
    if (s.bankName) f.append('bankName', s.bankName);
    f.append('bankAccountType', s.bankAccountType);
    f.append('bankAccountNumber', s.bankAccountNumber);
    if (s.bankAccountHolder) f.append('bankAccountHolder', s.bankAccountHolder);
    if (s.bankAccountHolderDocument) f.append('bankAccountHolderDocument', s.bankAccountHolderDocument);
    if (s.bankAccountHolderDocumentType) f.append('bankAccountHolderDocumentType', s.bankAccountHolderDocumentType);
    f.append('certificacion', s.certificacion);
    return enviarFormulario<{ cambio: CambioDeCuenta; enlaceDePrueba?: string }>(
      `/inmobiliaria/propietarios/${propietarioId}/cambios-de-cuenta`,
      f,
      'No se pudo pedir el cambio de cuenta',
    );
  },

  confirmarCambioConCodigo: (propietarioId: string, cambioId: string, codigo: string) =>
    apiClient.post<CambioDeCuenta>(
      `/inmobiliaria/propietarios/${propietarioId}/cambios-de-cuenta/${cambioId}/confirmar`,
      { codigo },
    ),

  aprobarCambioDeCuenta: (propietarioId: string, cambioId: string, soporte: File | null) => {
    const f = new FormData();
    if (soporte) f.append('soporte', soporte);
    return enviarFormulario<CambioDeCuenta>(
      `/inmobiliaria/propietarios/${propietarioId}/cambios-de-cuenta/${cambioId}/aprobar`,
      f,
      'No se pudo aprobar el cambio de cuenta',
    );
  },

  cerrarCambioDeCuenta: (propietarioId: string, cambioId: string, motivo: string) =>
    apiClient.post<CambioDeCuenta>(
      `/inmobiliaria/propietarios/${propietarioId}/cambios-de-cuenta/${cambioId}/cerrar`,
      { motivo },
    ),

  archivoDelCambio: (propietarioId: string, cambioId: string, cual: 'certificacion' | 'aprobacion') =>
    apiClient.get<{ url: string; nombre: string }>(
      `/inmobiliaria/propietarios/${propietarioId}/cambios-de-cuenta/${cambioId}/${cual}`,
    ),

  /*
   * Las dos del propietario van SIN sesión y sin `apiClient`: la página no tiene
   * login, y el cliente del panel espera una sesión y redirige ante un 401.
   */
  cambioPublico: (token: string) =>
    sinSesion<CambioDeCuentaPublico>('GET', `/cuenta-bancaria/${encodeURIComponent(token)}`),

  confirmarCambioPublico: (token: string) =>
    sinSesion<CambioDeCuentaPublico>('POST', `/cuenta-bancaria/${encodeURIComponent(token)}/confirmar`),

  captacionesYArriendos: (rango: { desde?: string; hasta?: string } = {}) => {
    const q = new URLSearchParams();
    if (rango.desde) q.set('desde', rango.desde);
    if (rango.hasta) q.set('hasta', rango.hasta);
    const s = q.toString();
    return apiClient.get<CaptacionesYArriendos>(`/inmobiliaria/agentes/captaciones-y-arriendos${s ? `?${s}` : ''}`);
  },
};
