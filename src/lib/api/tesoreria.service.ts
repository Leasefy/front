/**
 * Tesorería — `/inmobiliaria/tesoreria`.
 *
 * Mismo patrón que `conciliacion-bancaria.service.ts`: `apiClient` y cuerpos
 * armados CLAVE POR CLAVE. El back corre con `forbidNonWhitelisted: true`, así
 * que una clave de más es un 400 del request entero — mandar el objeto del
 * formulario con un spread es la forma de que un campo nuevo rompa todo.
 *
 * 🔴 Qué invalida cada mutación:
 *   · importar un archivo de recaudo crea movimientos bancarios y puede armar el
 *     lote → despierta `cobros`, que es lo que de verdad cambió;
 *   · aprobar un traslado y aplicar un pendiente mueven plata → `dispersiones`.
 */

import { apiClient } from '@/lib/api/client';
import { invalidar } from './refresco-de-datos';
import type {
  CalendarioDelAnio,
  CuentaDeclarada,
  ConfiguracionDeTesoreria,
  DetalleDelArchivo,
  GuardarConvenio,
  ListaDeAplicables,
  ListaDeConvenios,
  ListaDePendientes,
  ListaDeTraslados,
  PendienteDeAplicar,
  PreviaDelRecaudo,
  PropuestaDeTraslado,
  MisCertificados,
  ResultadoDeImportar,
  Traslado,
} from './tesoreria.types';

const BASE = '/inmobiliaria/tesoreria';

/** Sólo las claves que el DTO del back acepta, y sin `undefined`. */
function cuerpoDelConvenio(dto: GuardarConvenio): Record<string, unknown> {
  const cuerpo: Record<string, unknown> = {
    banco: dto.banco,
    codigo: dto.codigo,
    nombre: dto.nombre,
    tipo: dto.tipo,
    columnas: dto.columnas,
    formatoDeFecha: dto.formatoDeFecha,
    decimales: dto.decimales,
  };
  if (dto.separador) cuerpo.separador = dto.separador;
  if (dto.lineasDeEncabezado !== undefined) cuerpo.lineasDeEncabezado = dto.lineasDeEncabezado;
  if (dto.lineasDePie !== undefined) cuerpo.lineasDePie = dto.lineasDePie;
  if (dto.marcaDeDetalle) cuerpo.marcaDeDetalle = dto.marcaDeDetalle;
  if (dto.marcaEn !== undefined && dto.marcaEn !== null) cuerpo.marcaEn = dto.marcaEn;
  if (dto.referenciaLargo !== undefined && dto.referenciaLargo !== null) {
    cuerpo.referenciaLargo = dto.referenciaLargo;
  }
  if (dto.referenciaPrefijo) cuerpo.referenciaPrefijo = dto.referenciaPrefijo;
  if (dto.referenciaDv) cuerpo.referenciaDv = dto.referenciaDv;
  if (dto.activo !== undefined) cuerpo.activo = dto.activo;
  return cuerpo;
}

export const tesoreriaApi = {
  // ── El convenio de recaudo ────────────────────────────────────────────────

  listarConvenios(): Promise<ListaDeConvenios> {
    return apiClient.get<ListaDeConvenios>(`${BASE}/convenios`);
  },

  async crearConvenio(dto: GuardarConvenio) {
    const r = await apiClient.post(`${BASE}/convenios`, cuerpoDelConvenio(dto));
    invalidar('convenios');
    return r;
  },

  async guardarConvenio(id: string, dto: GuardarConvenio) {
    const r = await apiClient.put(`${BASE}/convenios/${id}`, cuerpoDelConvenio(dto));
    invalidar('convenios');
    return r;
  },

  // ── El archivo de recaudo ─────────────────────────────────────────────────

  /** Lee el archivo con el formato del convenio. NO escribe nada. */
  previa(contenido: string, nombreArchivo: string, convenioId?: string): Promise<PreviaDelRecaudo> {
    const cuerpo: Record<string, unknown> = { nombreArchivo, contenido };
    if (convenioId) cuerpo.convenioId = convenioId;
    return apiClient.post<PreviaDelRecaudo>(`${BASE}/recaudo/previa`, cuerpo);
  },

  async importar(
    contenido: string,
    nombreArchivo: string,
    convenioId?: string,
  ): Promise<ResultadoDeImportar> {
    const cuerpo: Record<string, unknown> = { nombreArchivo, contenido };
    if (convenioId) cuerpo.convenioId = convenioId;
    const r = await apiClient.post<ResultadoDeImportar>(`${BASE}/recaudo/importar`, cuerpo);
    // Importar crea movimientos bancarios y puede armar el lote de conciliación.
    invalidar('cobros');
    return r;
  },

  listarArchivos(limite = 20): Promise<{ disponible: boolean; archivos: ResultadoDeImportar['archivo'][] }> {
    return apiClient.get(`${BASE}/recaudo/archivos?limite=${limite}`);
  },

  detalleDelArchivo(id: string): Promise<DetalleDelArchivo> {
    return apiClient.get<DetalleDelArchivo>(`${BASE}/recaudo/archivos/${id}`);
  },

  // ── El traslado de la comisión ────────────────────────────────────────────

  configuracion(): Promise<ConfiguracionDeTesoreria> {
    return apiClient.get<ConfiguracionDeTesoreria>(`${BASE}/configuracion`);
  },

  async guardarConfiguracion(
    dto: Partial<Omit<ConfiguracionDeTesoreria, 'disponible' | 'motivo'>>,
  ): Promise<ConfiguracionDeTesoreria> {
    const cuerpo: Record<string, unknown> = {};
    if (dto.cuentaPucRecaudoId) cuerpo.cuentaPucRecaudoId = dto.cuentaPucRecaudoId;
    if (dto.cuentaPucPropiaId) cuerpo.cuentaPucPropiaId = dto.cuentaPucPropiaId;
    if (dto.cuentaDeRecaudo !== undefined && dto.cuentaDeRecaudo !== null) {
      cuerpo.cuentaDeRecaudo = dto.cuentaDeRecaudo;
    }
    if (dto.cuentaPropia !== undefined && dto.cuentaPropia !== null) {
      cuerpo.cuentaPropia = dto.cuentaPropia;
    }
    if (dto.trasladarIvaDeLaComision !== undefined) {
      cuerpo.trasladarIvaDeLaComision = dto.trasladarIvaDeLaComision;
    }
    if (dto.trasladarIntereses !== undefined) {
      cuerpo.trasladarIntereses = dto.trasladarIntereses;
    }
    if (dto.trasladarGastosDeCobranza !== undefined) {
      cuerpo.trasladarGastosDeCobranza = dto.trasladarGastosDeCobranza;
    }
    const r = await apiClient.put<ConfiguracionDeTesoreria>(`${BASE}/configuracion`, cuerpo);
    invalidar('dispersiones');
    return r;
  },

  listarTraslados(): Promise<ListaDeTraslados> {
    return apiClient.get<ListaDeTraslados>(`${BASE}/traslados`);
  },

  propuestaDeTraslado(periodo: string): Promise<PropuestaDeTraslado> {
    return apiClient.get<PropuestaDeTraslado>(`${BASE}/traslados/propuesta?periodo=${periodo}`);
  },

  async proponerTraslado(periodo: string) {
    const r = await apiClient.post<{ propuesta: PropuestaDeTraslado; traslado: Traslado | null }>(
      `${BASE}/traslados`,
      { periodo },
    );
    invalidar('dispersiones');
    return r;
  },

  async aprobarTraslado(id: string, fecha?: string) {
    const cuerpo: Record<string, unknown> = {};
    if (fecha) cuerpo.fecha = fecha;
    const r = await apiClient.post<{ traslado: Traslado; avisos: string[] }>(
      `${BASE}/traslados/${id}/aprobar`,
      cuerpo,
    );
    invalidar('dispersiones');
    return r;
  },

  async rechazarTraslado(id: string, motivo: string) {
    const r = await apiClient.post<Traslado>(`${BASE}/traslados/${id}/rechazar`, { motivo });
    invalidar('dispersiones');
    return r;
  },

  // ── La plata pendiente de aplicar ─────────────────────────────────────────

  pendientes(): Promise<ListaDeAplicables> {
    return apiClient.get<ListaDeAplicables>(`${BASE}/pendientes`);
  },

  pendientesDelContrato(contractId: string): Promise<ListaDePendientes> {
    return apiClient.get<ListaDePendientes>(`${BASE}/pendientes/contrato/${contractId}`);
  },

  async aplicarPendiente(id: string, valorCop?: number, fecha?: string) {
    const cuerpo: Record<string, unknown> = {};
    if (valorCop !== undefined) cuerpo.valorCop = valorCop;
    if (fecha) cuerpo.fecha = fecha;
    const r = await apiClient.post<{ pendiente: PendienteDeAplicar; pago: unknown }>(
      `${BASE}/pendientes/${id}/aplicar`,
      cuerpo,
    );
    // Aplicar EMITE recibos de caja: lo que cambió es la cartera del inquilino.
    invalidar('cobros');
    invalidar('dispersiones');
    return r;
  },

  async devolverPendiente(id: string, motivo: string, valorCop?: number) {
    const cuerpo: Record<string, unknown> = { motivo };
    if (valorCop !== undefined) cuerpo.valorCop = valorCop;
    const r = await apiClient.post<{ pendiente: PendienteDeAplicar; avisos: string[] }>(
      `${BASE}/pendientes/${id}/devolver`,
      cuerpo,
    );
    invalidar('dispersiones');
    return r;
  },

  /**
   * 🔴 Las cuentas con camino de entrada declarado. La pantalla del extracto las
   * ofrece en vez de pedir que alguien teclee un número: si una cuenta recauda
   * por ARCHIVO, cargar su extracto responde 409, y eso no se puede descubrir
   * apretando el botón.
   */
  cuentasDeclaradas(): Promise<CuentaDeclarada[]> {
    return apiClient.get<CuentaDeclarada[]>(`${BASE}/cuentas`);
  },

  // ── El portal del propietario ─────────────────────────────────────────────

  /**
   * Mis certificados de retención, resueltos por la SESIÓN.
   *
   * 🔴 No recibe a quién mostrar, y es a propósito: un certificado trae el NIT y
   * las bases gravables de una persona. Devuelve los de TODAS sus inmobiliarias,
   * porque para declarar los necesita todos.
   */
  misCertificados(): Promise<MisCertificados> {
    return apiClient.get<MisCertificados>('/portal/certificados-de-retencion');
  },

  // ── El calendario de días hábiles ─────────────────────────────────────────

  calendario(anio: number): Promise<CalendarioDelAnio> {
    return apiClient.get<CalendarioDelAnio>(`${BASE}/calendario?anio=${anio}`);
  },

  async corregirCalendario(dto: {
    fecha: string;
    nombre: string;
    activo?: boolean;
    alcance?: 'NACIONAL' | 'INMOBILIARIA';
  }) {
    const cuerpo: Record<string, unknown> = { fecha: dto.fecha, nombre: dto.nombre };
    if (dto.activo !== undefined) cuerpo.activo = dto.activo;
    if (dto.alcance) cuerpo.alcance = dto.alcance;
    const r = await apiClient.post(`${BASE}/calendario`, cuerpo);
    invalidar('calendario');
    return r;
  },

  async borrarCorreccion(id: string) {
    const r = await apiClient.delete(`${BASE}/calendario/${id}`);
    invalidar('calendario');
    return r;
  },
};
