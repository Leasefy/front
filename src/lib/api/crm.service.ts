/**
 * crm.service.ts — el CRM comercial del 18-09-2026.
 *
 * Leads con origen (B-01 a B-07), publicación a portales (D-01, D-02),
 * visitas con asesor y no-show (E-03), requisitos por perfil (F-05), el motivo
 * general del rechazo (F-07), matching con requisitos (G-02), documentos y firma
 * del mandato (C-04 a C-10) y el vencimiento de la invitación a firmar (A-13).
 *
 * 🔴 TODOS estos endpoints responden **503 `*_SIN_MIGRACION`** mientras la
 * migración no esté aplicada, y las LECTURAS devuelven `{ disponible: false,
 * motivo }` en vez de fallar. Se maneja con `resultadoDelCrm`, que es el mismo
 * patrón de `owner-portal.http.ts`: 503 y 404 = «próximamente» con el motivo;
 * 403, 5xx y red = fallo con reintento.
 */

import { ApiError, apiClient } from '@/lib/api/client'

const BASE = '/inmobiliaria'

// ═══════════════════════════════════════════════════════════════════════════
// El estado de una función que puede no estar habilitada
// ═══════════════════════════════════════════════════════════════════════════

export type ResultadoDelCrm<T> =
  | { estado: 'ok'; datos: T }
  | { estado: 'no-habilitado'; motivo: string }
  | { estado: 'fallo'; status: number | null; mensaje: string }

/** 503 = la migración no está; 404 = el endpoint no está desplegado. */
const STATUS_DE_NO_HABILITADO = new Set([404, 503])

export async function resultadoDelCrm<T>(
  hacer: () => Promise<T>,
): Promise<ResultadoDelCrm<T>> {
  try {
    return { estado: 'ok', datos: await hacer() }
  } catch (e) {
    if (e instanceof ApiError && STATUS_DE_NO_HABILITADO.has(e.status)) {
      return {
        estado: 'no-habilitado',
        // El back manda el motivo con la migración que falta: se muestra tal
        // cual, porque es lo que Víctor necesita leer para saber qué aplicar.
        motivo: e.messages?.[0] ?? e.message ?? 'Todavía no está habilitado.',
      }
    }
    return {
      estado: 'fallo',
      status: e instanceof ApiError ? e.status : null,
      mensaje:
        e instanceof Error ? e.message : 'No se pudo cargar. Vuelve a intentar.',
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Leads
// ═══════════════════════════════════════════════════════════════════════════

export interface ConfiguracionComercial {
  disponible: boolean
  motivo: string | null
  horasParaResponderLead: number
  origenesDeLead: string[]
  minimoDeFotosParaPublicar: number | null
  margenDeBajaDePrecioPct: number | null
  horasDeAvisoAlInquilino: number | null
  diasParaFirmarElContrato: number | null
  pesosDelMatching: Record<string, number> | null
}

export interface EntraUnLeadInput {
  origen: string
  origenDetalle?: string
  tipoDeNegocio?: 'ARRIENDO' | 'VENTA'
  consignacionId?: string
  nombre: string
  documento?: string
  telefono?: string
  correo?: string
  notas?: string
  /** Cuánto puede pagar al mes, dicho por él. Sin esto se deduce del inmueble. */
  presupuestoCop?: number
  agenteUserId?: string
}

export interface LeadCreado {
  pipelineItemId: string
  contactoId: string | null
  origen: string
  asignadoA: string | null
  porQueSeAsigno: 'ASESOR_DEL_INMUEBLE' | 'TURNO' | 'SIN_ASESORES'
  /** B-07: el aviso de que se unió a un contacto que ya existía. */
  contactoUnido: boolean
  seReconocioPor: 'DOCUMENTO' | 'TELEFONO' | null
}

export interface AsesorConCarga {
  userId: string
  leadsActivos: number
  ultimoLeadEl: string | null
}

export interface RenglonPorOrigen {
  origen: string
  nombre: string
  leads: number
  abiertos: number
  cerrados: number
  perdidos: number
  conversion: number
}

export interface InformePorOrigen {
  disponible: boolean
  motivo: string | null
  renglones: RenglonPorOrigen[]
  totales: Omit<RenglonPorOrigen, 'origen' | 'nombre'>
}

export interface ContactoComercial {
  id: string
  nombre: string
  documento: string | null
  telefono: string | null
  correo: string | null
  notas: string | null
}

export interface ReasignacionDeLead {
  id: string
  deUserId: string | null
  aUserId: string
  motivo: 'SIN_RESPUESTA' | 'MANUAL' | 'SIN_ASESOR_DEL_INMUEBLE' | 'TURNO'
  nota: string | null
  horasSinTocar: number | null
  decididaPorUserId: string | null
  createdAt: string
}

export const leadsApi = {
  configuracion: () =>
    apiClient.get<ConfiguracionComercial>(`${BASE}/leads/configuracion`),

  guardarConfiguracion: (body: Partial<ConfiguracionComercial>) =>
    apiClient.put<ConfiguracionComercial>(`${BASE}/leads/configuracion`, body),

  entra: (body: EntraUnLeadInput) =>
    apiClient.post<LeadCreado>(`${BASE}/leads`, body),

  asesores: () => apiClient.get<AsesorConCarga[]>(`${BASE}/leads/asesores`),

  respondido: (pipelineItemId: string) =>
    apiClient.post<{ marcado: boolean }>(
      `${BASE}/leads/${pipelineItemId}/respondido`,
      {},
    ),

  reasignar: (pipelineItemId: string, aUserId: string, nota?: string) =>
    apiClient.post<{ reasignado: boolean }>(
      `${BASE}/leads/${pipelineItemId}/reasignar`,
      { aUserId, nota },
    ),

  reasignaciones: (pipelineItemId: string) =>
    apiClient.get<ReasignacionDeLead[]>(
      `${BASE}/leads/${pipelineItemId}/reasignaciones`,
    ),

  reasignarVencidos: () =>
    apiClient.post<{ revisados: number; horas: number; pases: unknown[] }>(
      `${BASE}/leads/reasignar-vencidos`,
      {},
    ),

  continuar: (
    pipelineItemId: string,
    body: { consignacionId?: string; conservarEstudio?: boolean } = {},
  ) =>
    apiClient.post<{ pipelineItemId: string; oportunidadAnteriorId: string }>(
      `${BASE}/leads/${pipelineItemId}/continuar`,
      body,
    ),

  buscarContactos: (texto: string) =>
    apiClient.get<ContactoComercial[]>(
      `${BASE}/leads/contactos?texto=${encodeURIComponent(texto)}`,
    ),

  contacto: (contactoId: string) =>
    apiClient.get<{
      contacto: ContactoComercial
      oportunidades: {
        pipelineItemId: string
        origen: string
        tipoDeNegocio: string
        oportunidadAnteriorId: string | null
        asignadoAUserId: string | null
        asignadoEl: string | null
        respondidoEl: string | null
        reasignaciones: number
        tarjeta: { stage: string; candidateName: string } | null
      }[]
    }>(`${BASE}/leads/contactos/${contactoId}`),

  informePorOrigen: (rango?: { desde?: string; hasta?: string }) => {
    const q = new URLSearchParams()
    if (rango?.desde) q.set('desde', rango.desde)
    if (rango?.hasta) q.set('hasta', rango.hasta)
    const qs = q.toString()
    return apiClient.get<InformePorOrigen>(
      `${BASE}/leads/informe-por-origen${qs ? `?${qs}` : ''}`,
    )
  },
}

// ═══════════════════════════════════════════════════════════════════════════
// Publicación
// ═══════════════════════════════════════════════════════════════════════════

export type EstadoDePublicacion =
  | 'PENDIENTE'
  | 'POR_EXPORTAR'
  | 'PUBLICADA'
  | 'POR_DESPUBLICAR'
  | 'DESPUBLICADA'
  | 'ERROR'

export interface CuentaDePortal {
  id: string
  portal: string
  etiqueta: string | null
  modo: 'API' | 'EXPORTACION'
  modoEfectivo: 'API' | 'EXPORTACION'
  activa: boolean
  identificadorEnElPortal: string | null
  notas: string | null
}

export interface PortalConCuenta {
  portal: string
  nombre: string
  /** 🔴 Hoy sólo el sitio propio: no hay convenio con los portales de afuera. */
  tieneApi: boolean
  cuenta: CuentaDePortal | null
}

export interface FilaDelTablero {
  id: string
  propertyId: string
  portal: string
  nombreDelPortal: string
  estado: EstadoDePublicacion
  viva: boolean
  urlExterna: string | null
  ultimoError: string | null
  publicadaEl: string | null
  exportadaEl: string | null
  inmueble: {
    id: string
    title: string
    code: number | null
    neighborhood: string | null
    city: string
    status: string
  } | null
}

export interface RevisionDePublicacion {
  propertyId: string
  estado: string
  fotos: number
  fotosMinimas: number
  falta: { campo: string; que: string }[]
  sePuedePublicar: boolean
  ocupacion: {
    puede: boolean
    disponibleDesde: string | null
    porQue: string
    motivo: string | null
  }
}

export const publicacionApi = {
  cuentas: () =>
    apiClient.get<{
      disponible: boolean
      motivo: string | null
      portales: PortalConCuenta[]
    }>(`${BASE}/publicacion/cuentas`),

  guardarCuenta: (body: {
    portal: string
    etiqueta?: string
    modo?: 'API' | 'EXPORTACION'
    activa?: boolean
    identificadorEnElPortal?: string
    notas?: string
  }) =>
    apiClient.put<CuentaDePortal & { aviso: string | null }>(
      `${BASE}/publicacion/cuentas`,
      body,
    ),

  tablero: (portal?: string) =>
    apiClient.get<{
      disponible: boolean
      motivo: string | null
      filas: FilaDelTablero[]
    }>(`${BASE}/publicacion/tablero${portal ? `?portal=${portal}` : ''}`),

  revision: (propertyId: string) =>
    apiClient.get<RevisionDePublicacion>(
      `${BASE}/publicacion/inmuebles/${propertyId}/revision`,
    ),

  publicar: (propertyId: string, portales: string[]) =>
    apiClient.post<{ porSubirAMano: string[]; disponibleDesde: string | null }>(
      `${BASE}/publicacion/inmuebles/${propertyId}/publicar`,
      { portales },
    ),

  despublicar: (propertyId: string, portales: string[]) =>
    apiClient.post<{ porBajarAMano: string[] }>(
      `${BASE}/publicacion/inmuebles/${propertyId}/despublicar`,
      { portales },
    ),

  confirmar: (propertyId: string, portal: string, urlExterna?: string) =>
    apiClient.post<FilaDelTablero>(
      `${BASE}/publicacion/inmuebles/${propertyId}/confirmar`,
      { portal, urlExterna },
    ),

  /** El CSV para subir al panel del portal. */
  exportarUrl: (portal: string) =>
    `${BASE}/publicacion/exportar/${encodeURIComponent(portal)}`,
}

// ═══════════════════════════════════════════════════════════════════════════
// Visitas
// ═══════════════════════════════════════════════════════════════════════════

export interface DetalleDeVisita {
  disponible: boolean
  motivo: string | null
  visitaEn: string
  comoSeLee: string
  asesorUserId: string | null
  confirmadaEl: string | null
  recordatorioEnviadoEl: string | null
  avisoAlInquilinoEl: string | null
  noShowEl: string | null
  noShowNota: string | null
  noShow: boolean
}

export const visitasApi = {
  detalle: (visitId: string) =>
    apiClient.get<DetalleDeVisita>(`${BASE}/visitas/${visitId}`),

  asignarAsesor: (visitId: string, asesorUserId: string) =>
    apiClient.post<unknown>(`${BASE}/visitas/${visitId}/asesor`, {
      asesorUserId,
    }),

  avisoAlInquilino: (visitId: string, canal: 'WHATSAPP' | 'CORREO') =>
    apiClient.post<unknown>(`${BASE}/visitas/${visitId}/aviso-al-inquilino`, {
      canal,
    }),

  marcarNoShow: (visitId: string, nota?: string) =>
    apiClient.post<unknown>(`${BASE}/visitas/${visitId}/no-show`, { nota }),

  quitarNoShow: (visitId: string) =>
    apiClient.delete<unknown>(`${BASE}/visitas/${visitId}/no-show`),

  recordatorios: (marcar = false) =>
    apiClient.get<{
      disponible: boolean
      motivo: string | null
      visitas: {
        visitId: string
        visitaEn: string
        correo: string | null
        telefono: string | null
        mensaje: string
      }[]
    }>(`${BASE}/visitas/recordatorios${marcar ? '?marcar=true' : ''}`),

  porAtender: () =>
    apiClient.get<{
      disponible: boolean
      motivo: string | null
      horasDeAvisoAlInquilino?: number
      visitas: {
        visitId: string
        status: string
        visitaEn: string
        comoSeLee: string
        quien: string | null
        correo: string | null
        telefono: string | null
        inmueble: {
          id: string
          title: string
          neighborhood: string | null
          city: string
        } | null
        asesorUserId: string | null
        confirmadaEl: string | null
        noShow: boolean
        /** E-03: sin asesor la visita no se confirma. */
        faltaElAsesor: boolean
        /** D-02: hay alguien viviendo adentro. */
        ocupado: boolean
        faltaElAvisoAlInquilino: {
          code: string
          message: string
          avisarAntesDe: string
        } | null
      }[]
    }>(`${BASE}/visitas/por-atender`),

  noShows: (desde?: string) =>
    apiClient.get<
      { visitId: string; noShowEl: string; noShowNota: string | null }[]
    >(`${BASE}/visitas/no-shows${desde ? `?desde=${desde}` : ''}`),

  sePuedeMostrar: (propertyId: string) =>
    apiClient.get<{
      puede: boolean
      ocupado: boolean
      disponibleDesde: string | null
      motivo: string | null
      horasDeAvisoAlInquilino: number
    }>(`${BASE}/visitas/inmuebles/${propertyId}/se-puede-mostrar`),
}

// ═══════════════════════════════════════════════════════════════════════════
// Postulaciones
// ═══════════════════════════════════════════════════════════════════════════

export interface RequisitoDePostulacion {
  id: string
  perfil: string
  etiqueta: string
  detalle: string | null
  clase: 'DOCUMENTO' | 'DATO' | 'ACCION'
  obligatorio: boolean
  orden: number
  activo: boolean
  /** F-08: el del estudio no se puede volver opcional ni apagar. */
  esElEstudio?: boolean
}

export interface RequisitosDeLaAgencia {
  disponible: boolean
  motivo: string | null
  /** `true` = todavía es el sugerido, no la lista de la inmobiliaria. */
  esElPreset: boolean
  perfiles: { perfil: string; nombre: string }[]
  requisitos: RequisitoDePostulacion[]
}

export interface ReclamoDelEstudio {
  id: string
  applicationId: string | null
  solicitanteNombre: string
  solicitanteCorreo: string
  tipo: 'DETALLE' | 'CORRECCION'
  mensaje: string
  estado: 'ABIERTO' | 'EN_REVISION' | 'RESUELTO'
  respuesta: string | null
  respondidoEl: string | null
  createdAt: string
}

export const postulacionesApi = {
  requisitos: (perfil?: string) =>
    apiClient.get<RequisitosDeLaAgencia>(
      `${BASE}/postulaciones/requisitos${perfil ? `?perfil=${perfil}` : ''}`,
    ),

  sembrarPreset: () =>
    apiClient.post<RequisitosDeLaAgencia & { creados: number }>(
      `${BASE}/postulaciones/requisitos/preset`,
      {},
    ),

  crearRequisito: (body: {
    perfil: string
    etiqueta: string
    detalle?: string
    clase?: 'DOCUMENTO' | 'DATO' | 'ACCION'
    obligatorio?: boolean
    orden?: number
  }) =>
    apiClient.post<RequisitoDePostulacion>(
      `${BASE}/postulaciones/requisitos`,
      body,
    ),

  editarRequisito: (
    id: string,
    body: Partial<
      Pick<
        RequisitoDePostulacion,
        'detalle' | 'clase' | 'obligatorio' | 'orden' | 'activo'
      >
    >,
  ) =>
    apiClient.patch<RequisitoDePostulacion>(
      `${BASE}/postulaciones/requisitos/${id}`,
      body,
    ),

  borrarRequisito: (id: string) =>
    apiClient.delete<void>(`${BASE}/postulaciones/requisitos/${id}`),

  /** F-07: qué se le dice al candidato, y si la nota interna filtra datos. */
  revisarCierre: (
    clase: 'RECHAZADA' | 'NO_ADJUDICADO',
    notaInterna?: string,
  ) =>
    apiClient.post<{
      clase: string
      motivo: string
      puedeReclamar: boolean
      ofrecerOtrasOpciones: boolean
    }>(`${BASE}/postulaciones/cierre/revisar`, { clase, notaInterna }),

  reclamos: (estado?: string) =>
    apiClient.get<{
      disponible: boolean
      motivo: string | null
      reclamos: ReclamoDelEstudio[]
    }>(`${BASE}/postulaciones/reclamos${estado ? `?estado=${estado}` : ''}`),

  tomarReclamo: (id: string) =>
    apiClient.post<ReclamoDelEstudio>(
      `${BASE}/postulaciones/reclamos/${id}/tomar`,
      {},
    ),

  responderReclamo: (id: string, respuesta: string) =>
    apiClient.post<ReclamoDelEstudio>(
      `${BASE}/postulaciones/reclamos/${id}/responder`,
      { respuesta },
    ),
}

// ═══════════════════════════════════════════════════════════════════════════
// Matching
// ═══════════════════════════════════════════════════════════════════════════

export interface PesosDelMatching {
  zona: number
  fecha: number
  habitaciones: number
  tipo: number
  holgura: number
}

export const matchingApi = {
  pesos: () =>
    apiClient.get<{
      pesos: PesosDelMatching
      configurados: boolean
      /** 🔴 G-02: esto NO se configura, y la pantalla lo dice. */
      requisitos: string[]
    }>(`${BASE}/matching/pesos`),

  guardarPesos: (body: Partial<PesosDelMatching>) =>
    apiClient.put<{ pesos: PesosDelMatching }>(`${BASE}/matching/pesos`, body),

  paraElLead: (pipelineItemId: string) =>
    apiClient.get<{
      lead: { pipelineItemId: string; nombre: string; correo: string | null }
      busca: { presupuestoCop: number | null; topeAsegurableCop: number | null }
      /** `true` = lo dijo el interesado; `false` = se dedujo del inmueble. */
      presupuestoDicho: boolean
      falta: { code: string; message: string } | null
      opciones: {
        propertyId: string
        puntaje: number
        porQue: string[]
        inmueble: {
          title: string
          neighborhood: string | null
          city: string
          monthlyRent: number | null
          adminFee: number
          bedrooms: number | null
        } | null
      }[]
    }>(`${BASE}/matching/leads/${pipelineItemId}`),

  paraElInmueble: (propertyId: string) =>
    apiClient.get<{
      ofrecible: boolean
      motivo: string | null
      leads: {
        pipelineItemId: string
        nombre: string
        correo: string | null
        puntaje: number
        porQue: string[]
      }[]
    }>(`${BASE}/matching/inmuebles/${propertyId}`),
}

// ═══════════════════════════════════════════════════════════════════════════
// Captación y mandato
// ═══════════════════════════════════════════════════════════════════════════

export interface DocumentoDelMandato {
  id: string
  tipo: string
  nombreDelTipo: string
  archivoNombre: string
  expedidoEl: string | null
  propietarioId: string | null
  diasQueLeQuedan: number | null
  reemplazadoEl: string | null
  createdAt: string
}

export interface DocumentosDelMandato {
  disponible: boolean
  motivo: string | null
  tipos: { tipo: string; nombre: string }[]
  documentos: DocumentoDelMandato[]
  paraPublicar: {
    completo: boolean
    falta: { tipo: string; nombre: string; porQue: string; detalle: string }[]
  }
  paraElPrimerGiro: {
    completo: boolean
    falta: { tipo: string; nombre: string; porQue: string; detalle: string }[]
  }
}

export interface ConsultaDeListas {
  id: string
  terceroTipo: string
  nombre: string
  documento: string | null
  proveedor: string
  /** `SIN_LISTA` = no había con qué comparar; `ERROR` = había y falló. */
  resultado: 'LIBRE' | 'COINCIDENCIA' | 'ERROR' | 'SIN_LISTA'
  /** 🔴 `SIN_VERIFICAR` opera y va a la bandeja; sólo `BLOQUEADO` frena. */
  estado:
    | 'BLOQUEADO'
    | 'LIBERADO'
    | 'CONFIRMADO'
    | 'SIN_BLOQUEO'
    | 'SIN_VERIFICAR'
  coincidencias: { lista: string; nombreEnLaLista: string; parecido: number }[] | null
  motivoDeLaRevision: string | null
  createdAt: string
}

export const captacionApi = {
  documentos: (consignacionId: string) =>
    apiClient.get<DocumentosDelMandato>(
      `${BASE}/captacion/mandatos/${consignacionId}/documentos`,
    ),

  urlDelDocumento: (id: string) =>
    apiClient.get<{ url: string }>(`${BASE}/captacion/documentos/${id}/url`),

  sePuedePublicar: (consignacionId: string) =>
    apiClient.get<{ puede: boolean; sinMigracion: boolean; motivo: string | null }>(
      `${BASE}/captacion/mandatos/${consignacionId}/se-puede-publicar`,
    ),

  datos: (consignacionId: string) =>
    apiClient.get<{
      disponible: boolean
      motivo: string | null
      /** C-04: siempre `false`. No se maneja exclusividad. */
      exclusividad: boolean
      plazoMinimo: null
      margenDeBajaPct: number
      principalPropietarioId: string
      principalEscogidoAMano: boolean
      copropietarios: { propietarioId: string; participacionBps: number }[]
    }>(`${BASE}/captacion/mandatos/${consignacionId}/datos`),

  guardarDatos: (
    consignacionId: string,
    body: { margenDeBajaPct?: number | null; principalPropietarioId?: string | null },
  ) =>
    apiClient.put<unknown>(
      `${BASE}/captacion/mandatos/${consignacionId}/datos`,
      body,
    ),

  revisarBaja: (consignacionId: string, precioNuevo: number) =>
    apiClient.post<{
      precioActual: number
      precioNuevo: number
      margenDeBajaPct: number
      necesitaAprobacion: boolean
      problema: { code: string; message: string; bajaPct: number } | null
    }>(`${BASE}/captacion/mandatos/${consignacionId}/revisar-baja`, {
      precioNuevo,
    }),

  listas: (estado?: string) =>
    apiClient.get<{
      disponible: boolean
      motivo: string | null
      /** Sin lista cargada nada se verifica y nada se bloquea. */
      hayListaCargada: boolean
      /** 🔴 La bandeja: cuántos terceros operan sin haberse verificado. */
      sinVerificar: number
      consultas: ConsultaDeListas[]
    }>(`${BASE}/captacion/listas${estado ? `?estado=${estado}` : ''}`),

  listasCargadas: () =>
    apiClient.get<{
      disponible: boolean
      motivo: string | null
      listas: {
        id: string
        agencyId: string | null
        lista: string
        etiqueta: string | null
        vigenteDesde: string
        filas: number
        fuente: string | null
        activa: boolean
      }[]
    }>(`${BASE}/captacion/listas/cargadas`),

  cargarLista: (body: {
    lista: string
    etiqueta?: string
    vigenteDesde: string
    fuente?: string
    global?: boolean
    filas: { nombre: string; documento?: string; detalle?: string }[]
  }) =>
    apiClient.post<{
      lista: { id: string; lista: string; filas: number }
      revisados: { revisados: number; bloqueados: number; liberados: number }
    }>(`${BASE}/captacion/listas/cargadas`, body),

  revisarSinVerificar: () =>
    apiClient.post<{
      revisados: number
      bloqueados: number
      liberados: number
    }>(`${BASE}/captacion/listas/revisar-sin-verificar`, {}),

  previsualizarVenta: (
    consignacionId: string,
    body: {
      comprador: 'EL_INQUILINO' | 'UN_TERCERO'
      fechaDeLaEscritura: string
      precioDeVentaCop?: number
    },
  ) =>
    apiClient.post<{
      camino: {
        comprador: string
        que: 'TERMINAR' | 'CAMBIAR_DE_PROPIETARIO'
        porQue: string
        elInquilino: string
      }
      comision: {
        precioDeVentaCop: number
        porcentaje: number
        comisionCop: number
        pactada: boolean
      } | null
      falta: { code: string; message: string } | null
      sePuedeRegistrarLaComision: boolean
    }>(
      `${BASE}/captacion/mandatos/${consignacionId}/venta/previsualizar`,
      body,
    ),

  consultarListas: (body: {
    tipo: 'PROPIETARIO' | 'INQUILINO' | 'CODEUDOR' | 'PROVEEDOR' | 'CONTACTO'
    id?: string
    nombre: string
    documento?: string
    listaPropia?: { lista: string; nombre: string; documento?: string }[]
  }) => apiClient.post<ConsultaDeListas>(`${BASE}/captacion/listas/consultar`, body),

  revisarConsulta: (
    id: string,
    decision: 'LIBERADO' | 'CONFIRMADO',
    motivo: string,
  ) =>
    apiClient.post<ConsultaDeListas>(`${BASE}/captacion/listas/${id}/revisar`, {
      decision,
      motivo,
    }),

  firmas: (consignacionId: string) =>
    apiClient.get<{
      disponible: boolean
      motivo: string | null
      firmas: {
        id: string
        forma: 'ELECTRONICA' | 'PDF_CARGADO'
        estado: 'PENDIENTE' | 'FIRMADA' | 'VENCIDA' | 'ANULADA'
        firmanteNombre: string
        firmanteCorreo: string | null
        venceEl: string | null
        firmadaEl: string | null
        pdfNombre: string | null
        createdAt: string
      }[]
    }>(`${BASE}/captacion/mandatos/${consignacionId}/firmas`),

  pedirFirmaElectronica: (
    consignacionId: string,
    body: { propietarioId?: string; firmanteNombre: string; firmanteCorreo?: string },
  ) =>
    apiClient.post<{ id: string; venceEl: string; token: string }>(
      `${BASE}/captacion/mandatos/${consignacionId}/firmas/electronica`,
      body,
    ),

  anularFirma: (id: string, motivo: string) =>
    apiClient.post<unknown>(`${BASE}/captacion/firmas/${id}/anular`, { motivo }),
}

// ═══════════════════════════════════════════════════════════════════════════
// A-13 · La invitación a firmar
// ═══════════════════════════════════════════════════════════════════════════

export interface EstadoDeLaInvitacion {
  disponible: boolean
  motivo: string | null
  invitacion: {
    id: string
    venceEl: string
    dias: number
    estado: 'PENDIENTE' | 'FIRMADA' | 'VENCIDA' | 'CANCELADA'
    recordatoriosEnviados: number
    ultimoRecordatorioEl: string | null
    vencidaEl: string | null
    createdAt: string
  } | null
  recordatorios?: string[]
  queHacer?: { que: 'NADA' | 'RECORDAR' | 'VENCER'; diasQueFaltan?: number }
  /** 🔴 A-13: lo que el vencimiento NO toca. */
  alVencer?: {
    contratoA: 'DRAFT'
    inmuebleA: null
    mandatoA: null
    avisarAlAsesor: true
  }
}

export const invitacionApi = {
  estado: (contractId: string) =>
    apiClient.get<EstadoDeLaInvitacion>(
      `${BASE}/invitacion-a-firmar/contratos/${contractId}`,
    ),

  enviar: (contractId: string) =>
    apiClient.post<unknown>(
      `${BASE}/invitacion-a-firmar/contratos/${contractId}`,
      {},
    ),

  cancelar: (contractId: string, motivo: string, liberarElInmueble = false) =>
    apiClient.post<{ cancelada: boolean; inmuebleLiberado: boolean }>(
      `${BASE}/invitacion-a-firmar/contratos/${contractId}/cancelar`,
      { motivo, liberarElInmueble },
    ),

  barrido: () =>
    apiClient.get<{
      disponible: boolean
      motivo: string | null
      recordatorios: {
        contractId: string
        numero: number
        de: number
        diasQueFaltan: number
        correo: string | null
        mensaje: string
      }[]
      vencidas: {
        contractId: string
        contratoVolvioABorrador: boolean
        inmuebleLiberado: boolean
        aviso: string
      }[]
    }>(`${BASE}/invitacion-a-firmar/barrido`),
}
