/**
 * El catálogo de conceptos de la inmobiliaria (Nico, 13-10-2026: «Base de
 * Leasefy + lo suyo»). El back sirve la base de Leasefy con lo propio de la
 * inmobiliaria encima: sus nombres, los que apagó y los que creó o trajo de su
 * sistema anterior. `/inmobiliaria/conceptos`.
 */
import { apiClient } from '@/lib/api/client'
import type { Parte } from '@/lib/contratos/conceptos'
import type { BaseTributaria } from '@/lib/contratos/escenarios-tributarios'

const BASE = '/inmobiliaria/conceptos'

export type OrigenDelConcepto = 'LEASEFY' | 'MIGRACION' | 'MANUAL'

export interface ConceptoDelCatalogo {
  clave: string
  nombre: string
  base: BaseTributaria
  paga: Parte
  recibe: Parte
  activo: boolean
  origen: OrigenDelConcepto
  /** El nombre de Leasefy cuando la inmobiliaria lo renombró. */
  nombreDeLeasefy: string | null
  nombresDelSistemaAnterior: string[]
}

export interface CatalogoDeConceptos {
  /** `false`: la base todavía no tiene el catálogo propio (sólo se puede leer). */
  disponible: boolean
  conceptos: ConceptoDelCatalogo[]
}

export interface FilaDeConceptoDelArchivo {
  nombre: string
  iva?: number | null
  retencion?: number | null
  reteIva?: number | null
  reteIca?: number | null
}

export type AccionDelConcepto = 'RENOMBRA_BASE' | 'IGUAL_A_LA_BASE' | 'NUEVO'

export interface ConceptoPropuesto {
  clave: string | null
  nombre: string
  base: BaseTributaria
  paga: Parte
  recibe: Parte
  activo: boolean
  accion: AccionDelConcepto
  nombresDelSistemaAnterior: string[]
}

export interface PlanDeImportacionDeConceptos {
  conceptos: ConceptoPropuesto[]
  resumen: {
    filas: number
    conceptos: number
    calzanConLaBase: number
    nuevos: number
    apagados: number
    juntadas: number
  }
}

export const conceptosApi = {
  catalogo(): Promise<CatalogoDeConceptos> {
    return apiClient.get<CatalogoDeConceptos>(BASE)
  },
  crear(datos: { nombre: string; base: BaseTributaria; paga: Parte; recibe: Parte }): Promise<ConceptoDelCatalogo> {
    return apiClient.post<ConceptoDelCatalogo>(BASE, datos)
  },
  actualizar(
    clave: string,
    cambios: Partial<{ nombre: string; activo: boolean; base: BaseTributaria; paga: Parte; recibe: Parte }>,
  ): Promise<ConceptoDelCatalogo> {
    return apiClient.patch<ConceptoDelCatalogo>(`${BASE}/${encodeURIComponent(clave)}`, cambios)
  },
  vistaPrevia(filas: FilaDeConceptoDelArchivo[]): Promise<PlanDeImportacionDeConceptos> {
    return apiClient.post<PlanDeImportacionDeConceptos>(`${BASE}/importar/vista-previa`, { filas })
  },
  importar(conceptos: ConceptoPropuesto[]): Promise<{ renombrados: number; apagados: number; nuevos: number; actualizados: number }> {
    // Clave por clave: el back corre con `forbidNonWhitelisted` (sin `accion`).
    return apiClient.post(`${BASE}/importar`, {
      conceptos: conceptos.map((c) => ({
        clave: c.clave,
        nombre: c.nombre,
        base: c.base,
        paga: c.paga,
        recibe: c.recibe,
        activo: c.activo,
        nombresDelSistemaAnterior: c.nombresDelSistemaAnterior,
      })),
    })
  },
}
