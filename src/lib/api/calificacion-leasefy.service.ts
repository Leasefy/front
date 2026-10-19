/**
 * La Calificación Leasefy (Nico, 18-10-2026): el «buró» informal de la
 * plataforma, sólo para arrendar.
 *
 *   La persona (gratis, Ley 2157):
 *     GET  /calificacion-leasefy/mia
 *     GET  /calificacion-leasefy/autorizacion
 *     POST /calificacion-leasefy/autorizacion          { aceptar }
 *     POST /calificacion-leasefy/evaluaciones/:id/respuesta { texto }
 *     POST /calificacion-leasefy/certificados          → { certificadoId, paymentUrl, valorCop }
 *     GET  /calificacion-leasefy/certificados/:id      → { estado, codigo }
 *   Pública:
 *     GET  /calificacion-leasefy/verificar/:codigo
 *   La inmobiliaria:
 *     POST /inmobiliaria/calificacion-leasefy/buscar   { documento, canon? }   (portafolio:view)
 *     GET  /inmobiliaria/calificacion-leasefy/postulaciones/:applicationId    (portafolio:view)
 *     GET  /inmobiliaria/calificacion-leasefy/evaluaciones/preguntas            (contratos:view)
 *     GET  /inmobiliaria/calificacion-leasefy/evaluaciones/por-evaluar          (contratos:view)
 *     POST /inmobiliaria/calificacion-leasefy/evaluaciones { contractId, respuestas, nota? } (contratos:edit)
 */

import { apiClient } from '@/lib/api/client';

export type Letra = 'A' | 'B' | 'C' | 'D';
export type Veredicto = 'FACIL' | 'CON_CONDICIONES' | 'NO' | 'REVISAR';
export type EstadoDeLaCalificacion = 'CALIFICADO' | 'SOLO_HISTORIAL' | 'SIN_DATOS';

export type ComponenteDelHistorial = 'puntualidad' | 'peorAtraso' | 'comoTermino' | 'acuerdos' | 'permanencia';
export type ComponenteDeLosDocumentos = 'solvencia' | 'ingresoEstable' | 'capacidadDePago';

export interface RenglonDelDesglose<K extends string> {
  componente: K;
  pesoNominal: number;
  pesoEfectivo: number;
  valor: number | null;
}

export interface Bloque<K extends string> {
  puntaje: number | null;
  desglose: RenglonDelDesglose<K>[];
}

export interface Calificacion {
  version: string;
  estado: EstadoDeLaCalificacion;
  puntaje: number | null;
  puntajeSinFrenos?: number | null;
  letra: Letra | null;
  pesoDelHistorial: number;
  mesesObservados: number;
  historial: Bloque<ComponenteDelHistorial> | null;
  documentos: Bloque<ComponenteDeLosDocumentos> | null;
  frenos: { codigo: string; texto: string }[];
  revisiones: { codigo: string; texto: string }[];
  veredicto: Veredicto | null;
  condiciones: string[];
  canonMaximoCop: number | null;
  explicacion: string[];
}

export interface ResumenDelHistorial {
  mesesObservados: number;
  cuotasContadas: number;
  porcentajeATiempo: number | null;
  peorAtrasoDias24m: number | null;
  contratos: number;
  inmobiliarias: number;
  contratosTerminados: number;
  terminaronSinDeuda: number;
}

export interface EstadoDeLaAutorizacion {
  vigente: boolean;
  version: string | null;
  desde: string | null;
  versionActual: string;
  hayVersionNueva: boolean;
}

export interface ContratoDeLaPersona {
  contractId: string;
  inmobiliaria: string | null;
  direccion: string | null;
  inicio: string | null;
  fin: string | null;
  meses: number;
  cuotasContadas: number;
  cuotasATiempo: number;
  peorAtrasoDias: number;
  termino: 'VIGENTE' | 'SIN_DEUDA' | 'CON_DEUDA' | 'JURIDICO';
  deudaVencidaCop: number;
}

export interface EvaluacionDeFin {
  id: string;
  contractId: string;
  inmobiliaria: string | null;
  direccion: string | null;
  puntaje: number;
  respuestas: { pregunta: string; respuesta: string }[];
  nota: string | null;
  evaluadaEl: string;
  respuestaDelInquilino: string | null;
  respondidaEl: string | null;
}

export interface CertificadoDeLaPersona {
  id: string;
  codigo: string | null;
  estado: string;
  letra: string | null;
  emitidoEl: string | null;
  venceEl: string | null;
  vencido: boolean;
}

export interface MiCalificacion {
  persona?: { userId: string; nombre: string };
  autorizacion: EstadoDeLaAutorizacion;
  calificacion?: Calificacion;
  historial?: ResumenDelHistorial & { porContrato: ContratoDeLaPersona[] };
  documentos?: {
    ingresoVerificadoCop: number | null;
    estudioDel: string;
    pagadorPrincipal: string | null;
    deudasMensualesCop: number | null;
    canonUsadoCop: number | null;
  } | null;
  calculadaEl?: string;
  consultas: { disponible: boolean; lista: { inmobiliaria: string; cuando: string }[] };
  evaluaciones: { disponible: boolean; lista: EvaluacionDeFin[] };
  certificados: {
    disponible: boolean;
    precioCop: number | null;
    /** El pedido más reciente que sigue esperando el pago (el enlace vive 24 h); un back anterior no lo manda. */
    pendienteId?: string | null;
    lista: CertificadoDeLaPersona[];
  };
}

export type Alcance = 'TODO_LEASEFY' | 'SOLO_ESTA_INMOBILIARIA';

export interface CalificacionParaLaInmobiliaria {
  persona: { userId: string; nombre: string };
  calificacion: Calificacion;
  historial: ResumenDelHistorial;
  documentos: { tieneEstudioVigente: boolean; estudioDel: string | null };
  calculadaEl: string;
  alcance: Alcance;
}

export interface ResultadoDeLaBusqueda {
  resultados: CalificacionParaLaInmobiliaria[];
  mensaje: string | null;
}

export interface PreguntaDeFin {
  clave: string;
  texto: string;
  opciones: { valor: string; texto: string; resta: number }[];
}

export interface ContratoPorEvaluar {
  contractId: string;
  inquilino: string | null;
  direccion: string | null;
  terminoEl: string | null;
}

export interface CertificadoVerificado {
  autentico: boolean;
  motivo: 'NO_EXISTE' | 'SIN_PAGAR' | 'VENCIDO' | 'REVOCADO' | null;
  codigo: string | null;
  nombreEnmascarado: string | null;
  puntaje: number | null;
  letra: Letra | null;
  veredicto: Veredicto | null;
  canonMaximoCop: number | null;
  resumen: {
    historial: ResumenDelHistorial;
    condiciones: string[];
    explicacion: string[];
    estudioDel: string | null;
  } | null;
  emitidoEl: string | null;
  venceEl: string | null;
}

export const calificacionLeasefyApi = {
  mia(): Promise<MiCalificacion> {
    return apiClient.get<MiCalificacion>('/calificacion-leasefy/mia');
  },
  autorizacion(): Promise<EstadoDeLaAutorizacion> {
    return apiClient.get<EstadoDeLaAutorizacion>('/calificacion-leasefy/autorizacion');
  },
  decidir(aceptar: boolean): Promise<EstadoDeLaAutorizacion> {
    return apiClient.post<EstadoDeLaAutorizacion>('/calificacion-leasefy/autorizacion', { aceptar });
  },
  responder(evaluacionId: string, texto: string): Promise<EvaluacionDeFin> {
    return apiClient.post<EvaluacionDeFin>(
      `/calificacion-leasefy/evaluaciones/${encodeURIComponent(evaluacionId)}/respuesta`,
      { texto },
    );
  },
  pedirCertificado(): Promise<{ certificadoId: string; paymentUrl: string; valorCop: number }> {
    return apiClient.post('/calificacion-leasefy/certificados');
  },
  estadoDelCertificado(id: string): Promise<{ estado: string; codigo: string | null }> {
    return apiClient.get(`/calificacion-leasefy/certificados/${encodeURIComponent(id)}`);
  },
  verificar(codigo: string): Promise<CertificadoVerificado> {
    return apiClient.get<CertificadoVerificado>(
      `/calificacion-leasefy/verificar/${encodeURIComponent(codigo)}`,
    );
  },
  buscar(documento: string, canon?: number): Promise<ResultadoDeLaBusqueda> {
    return apiClient.post<ResultadoDeLaBusqueda>('/inmobiliaria/calificacion-leasefy/buscar', {
      documento,
      ...(canon ? { canon } : {}),
    });
  },
  /**
   * La calificación de quien se postuló a un inmueble de la inmobiliaria, desde su cuenta (19-10-2026):
   * para el cajón del candidato cuando no hay estudio. `disponible: false` = sin las tablas del buró.
   */
  deLaPostulacion(
    applicationId: string,
  ): Promise<{ disponible: boolean; resultado: CalificacionParaLaInmobiliaria | null }> {
    return apiClient.get(
      `/inmobiliaria/calificacion-leasefy/postulaciones/${encodeURIComponent(applicationId)}`,
    );
  },
  preguntas(): Promise<{ preguntas: PreguntaDeFin[] }> {
    return apiClient.get('/inmobiliaria/calificacion-leasefy/evaluaciones/preguntas');
  },
  porEvaluar(): Promise<{ disponible: boolean; contratos: ContratoPorEvaluar[] }> {
    return apiClient.get('/inmobiliaria/calificacion-leasefy/evaluaciones/por-evaluar');
  },
  evaluar(contractId: string, respuestas: Record<string, string>, nota?: string): Promise<EvaluacionDeFin> {
    return apiClient.post('/inmobiliaria/calificacion-leasefy/evaluaciones', {
      contractId,
      respuestas,
      ...(nota?.trim() ? { nota: nota.trim() } : {}),
    });
  },
};
