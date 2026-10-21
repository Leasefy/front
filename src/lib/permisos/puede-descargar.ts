'use client';

/**
 * 🔴 Descargar datos personales (Nico, 20-10-2026, política de datos: «quien
 * tenga los permisos»). Un Excel con inquilinos, propietarios, contratos o
 * cartera saca los datos de la plataforma: sólo lo baja quien tenga la acción
 * «Exportar» de ese módulo en la matriz de permisos de su inmobiliaria (el
 * administrador la tiene siempre; a los demás roles se la da la inmobiliaria en
 * Configuración → Permisos). Mientras los permisos cargan, o sin ellos, no se
 * descarga (falla cerrada).
 */
import { usePermissions } from '@/lib/hooks/usePermissions';

export type ModuloConDatosPersonales = 'contratos' | 'clientes' | 'propietarios' | 'cobros';

const NOMBRE: Record<ModuloConDatosPersonales, string> = {
  contratos: 'Contratos',
  clientes: 'Clientes',
  propietarios: 'Propietarios',
  cobros: 'Cobros',
};

export function porQueNoSeDescarga(modulo: ModuloConDatosPersonales): string {
  return `Descargar estos datos pide el permiso «Exportar» de ${NOMBRE[modulo]}. Pídeselo a un administrador de tu inmobiliaria.`;
}

/** Los permisos, o `null` fuera del proveedor (el hook lanza; el orden de hooks no cambia). */
function usePermisosSiHay(): ReturnType<typeof usePermissions> | null {
  try {
    return usePermissions();
  } catch {
    return null;
  }
}

export function usePuedeDescargar(modulo: ModuloConDatosPersonales): { puede: boolean; porQue: string | null } {
  const permisos = usePermisosSiHay();
  const puede = Boolean(permisos && !permisos.isLoading && (permisos.isAdmin || permisos.canAccess(modulo, 'export')));
  return { puede, porQue: puede ? null : porQueNoSeDescarga(modulo) };
}
