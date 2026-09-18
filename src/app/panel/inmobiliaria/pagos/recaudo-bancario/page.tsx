'use client';

/**
 * Recaudo por convenio con el banco — `/panel/inmobiliaria/pagos/recaudo-bancario`.
 *
 * Permiso `cobros:view`, el mismo con el que el back protege
 * `/inmobiliaria/tesoreria/convenios` y el mismo de la conciliación bancaria:
 * importar el archivo del banco termina en recibos de caja, y quien puede lo uno
 * puede lo otro. El asesor comercial no ve operación.
 */

import { PageGuard } from '@/components/auth/PageGuard';
import { SectionLabel } from '@/components/ui/section-label';
import { RecaudoBancarioPanel } from '@/components/tesoreria/RecaudoBancario';

export default function RecaudoBancarioPage() {
  return (
    <PageGuard module="cobros" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <header className="space-y-1.5">
          <SectionLabel>Tesorería</SectionLabel>
          <h1 className="text-h2 text-fg">Recaudo por convenio con el banco</h1>
          <p className="max-w-2xl text-sm text-fg-muted">
            Cada contrato paga con su referencia única. El banco te manda un archivo con lo que
            recaudó y acá se importa: lo que calza exacto entra al lote que apruebas en
            Conciliación, y lo demás cae en la cola manual de siempre. Nada se aplica sin que una
            persona lo apruebe.
          </p>
        </header>
        <RecaudoBancarioPanel />
      </div>
    </PageGuard>
  );
}
