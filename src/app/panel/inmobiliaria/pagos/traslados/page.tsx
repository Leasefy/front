'use client';

/**
 * Traslado de la comisión — `/panel/inmobiliaria/pagos/traslados`.
 *
 * Permiso `dispersiones:view`, el mismo con el que el back protege el cuadre de
 * plata de terceros: es plata de propietarios e inquilinos hasta que se separa la
 * comisión, y «el asesor no ve nada que tenga que ver con operación» (17-09).
 */

import { PageGuard } from '@/components/auth/PageGuard';
import { SectionLabel } from '@/components/ui/section-label';
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
import { TrasladoDeComisionPanel } from '@/components/tesoreria/TrasladoDeComision';

export default function TrasladosPage() {
  return (
    <PageGuard module="dispersiones" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        {/* 🔴 El párrafo de arriba y el del bloque decían LA MISMA FRASE
            («mientras no la trasladas, el cuadre de plata de terceros va a
            mostrar esa diferencia»), cinco renglones aparte. Nico, 21-09: «lo
            mismo, esto parece un vómito, organízala!!». Arriba queda una línea
            y el porqué entero se va detrás del botón. */}
        <header className="space-y-1.5">
          <SectionLabel>Tesorería</SectionLabel>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-h2 text-fg">Traslado de la comisión a tu cuenta</h1>
            <ParaEntenderMas
              etiqueta="Por qué hay que trasladarla"
              descripcion="Qué es tuyo dentro de la cuenta de recaudo, y por qué no sale solo."
            >
              <div className="space-y-3 text-sm text-fg-muted">
                <p>
                  En la cuenta de recaudo <strong className="text-fg">casi nada es tuyo</strong>:
                  es plata de propietarios que todavía no cobraron y de inquilinos que
                  adelantaron.
                </p>
                <p>
                  Tu comisión sí es tuya, y también los ingresos del mandato (intereses de mora,
                  gastos de cobranza) — pero <strong className="text-fg">entran a esa misma
                  cuenta</strong> y se quedan ahí hasta que alguien los mueva.
                </p>
                <p>
                  Mientras no se muevan, el{' '}
                  <strong className="text-fg">cuadre de plata de terceros</strong> va a mostrar
                  esa diferencia: el banco tiene más de lo que le debes a terceros, y lo que
                  sobra es tu comisión sin trasladar.
                </p>
                <p>
                  Acá se <strong className="text-fg">propone</strong> con su desglose renglón por
                  renglón y una persona lo <strong className="text-fg">aprueba</strong>. No sale
                  solo: mover plata entre cuentas deja comprobante y lleva firma.
                </p>
              </div>
            </ParaEntenderMas>
          </div>
          <p className="max-w-2xl text-sm text-fg-muted">
            Tu comisión está en la cuenta de recaudo. Acá se propone moverla y se aprueba.
          </p>
        </header>
        <TrasladoDeComisionPanel />
      </div>
    </PageGuard>
  );
}
