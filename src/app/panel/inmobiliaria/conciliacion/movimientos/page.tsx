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
 */

import { PageGuard } from '@/components/auth/PageGuard';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import { SectionLabel } from '@/components/ui/section-label';
import { ExtractoBancario } from '@/components/cobros/extracto-bancario/ExtractoBancario';
import { ConciliacionDelAgente } from '@/components/inmobiliaria/ai/ConciliacionDelAgente';

function ConciliacionMovimientos() {
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="space-y-1.5">
        <SectionLabel>Conciliación</SectionLabel>
        <h1 className="text-h2 text-fg">Movimientos</h1>
        <p className="max-w-2xl text-sm text-muted-foreground line-clamp-2">
          Cada línea del extracto se cruza con los cobros que tienen saldo, y conciliarla emite el
          recibo de caja. Nada entra sin que alguien lo confirme.
        </p>
      </header>

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
    <PageGuard module="cobros" action="view" roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <ConciliacionMovimientos />
    </PageGuard>
  );
}
