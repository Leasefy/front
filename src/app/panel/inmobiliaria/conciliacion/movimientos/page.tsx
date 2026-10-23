'use client';

/**
 * Movimientos — el ÚNICO lugar donde se concilia el banco.
 *
 * ── Qué pasó acá ────────────────────────────────────────────────────────────
 *
 * Había dos pantallas de conciliación bancaria y Nico pidió una sola:
 *
 *   · `/cobros/extracto-bancario` hablaba con el MONOLITO. Subía el extracto en
 *     CSV **o Excel** de cualquier banco, lo cruzaba contra los cobros con
 *     saldo y conciliar EMITÍA UN RECIBO DE CAJA; también conciliaba los
 *     seguros en lote.
 *   · esta página hablaba con el MICRO: taxonomía de excepciones, sugerencias
 *     del agente y `reverse`. Confirmar acá sólo marca `status: 'confirmed'`.
 *
 * El dato que decidió cuál manda: en la agencia de pruebas el ERP tiene 6 filas
 * en `movimientos_bancarios` y el micro 0 en `agent.bank_movements`. Esta
 * pantalla estaba mirando una tabla vacía mientras la plata vivía en el ERP.
 *
 * Así que la pantalla del ERP se mudó ACÁ ADENTRO, con el look del workspace, y
 * lo del micro quedó debajo en `<ConciliacionDelAgente />`, que sólo muestra lo
 * que el micro realmente tenga (y nada si no tiene, o si no contesta). La URL
 * vieja redirige a ésta — la tabla vive en
 * `src/lib/nav/conciliacion-en-un-solo-lugar.data.mjs`.
 *
 * Permisos: `cobros`/view (lo que pedía la pantalla retirada, porque esto emite
 * recibos) Y el rol del workspace (ADMIN|CONTADOR, alineado con el nav del
 * layout). `PageGuard` los combina con AND; `CONTADOR` tiene `cobros` de fábrica
 * —es su ruta de inicio— así que nadie que entraba antes queda afuera.
 * IA95-34 (Nico, 05-10-2026): el auxiliar de cartera también entra
 * (`ROLES_QUE_CONCILIAN`); lo que pide `cobros:edit` lo cierra cada botón.
 */

import { PageGuard } from '@/components/auth/PageGuard';
import { ROLES_QUE_CONCILIAN } from '@/lib/nav/el-auxiliar-de-cartera-no-ve-los-bancos';
import { ExtractoBancario } from '@/components/cobros/extracto-bancario/ExtractoBancario';
import { ConciliacionDelAgente } from '@/components/inmobiliaria/ai/ConciliacionDelAgente';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { UploadSimple } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/lib/hooks/usePermissions';

function ConciliacionMovimientos() {
  // Cargar emite recibos al conciliar: la misma llave que el bloque de carga (`cobros:create`).
  const { canAccess, isLoading } = usePermissions();
  const puedeCargar = isLoading || canAccess('cobros', 'create');
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <EncabezadoDePantalla
        seccion="Agentes IA" // Ronda 30: el mismo sobretítulo que la raíz de Conciliación (antes uno distinto)
        titulo="Movimientos"
        descripcion="Cada línea del extracto se cruza con las cuotas con saldo; conciliarla emite el recibo de caja."
        accionPrincipal={
          // Revisora r25 (Movimientos #3): cargar es la acción del encabezado; la cola va primero.
          puedeCargar ? (
            <Button asChild size="sm" hideArrow data-testid="ir-a-cargar-el-extracto">
              <a href="#upload">
                <UploadSimple className="h-4 w-4" aria-hidden="true" />
                Cargar el extracto
              </a>
            </Button>
          ) : undefined
        }
      />

      {/*
        El extracto del ERP: CSV o Excel, cualquier banco, y conciliar emite el
        recibo. `idDeCarga="upload"` conserva el ancla `…/movimientos#upload`
        con la que la Sala enlaza «Subir extracto del banco».
      */}
      <ExtractoBancario idDeCarga="upload" />

      {/* Lo del micro, sólo si el micro tiene algo que mostrar. */}
      <ConciliacionDelAgente />
    </div>
  );
}

export default function ConciliacionMovimientosPage() {
  return (
    <PageGuard module="cobros" action="view" roles={[...ROLES_QUE_CONCILIAN]}>
      <ConciliacionMovimientos />
    </PageGuard>
  );
}
