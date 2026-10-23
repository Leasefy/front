'use client';

/**
 * Calendario de días hábiles — `/panel/inmobiliaria/pagos/calendario`.
 *
 * Permiso `configuracion:view`: es un ajuste de la inmobiliaria, no una
 * operación de plata. Vive bajo Pagos porque el plazo que corrige es el de la
 * factura electrónica y el de responder una PQRS, y ahí es donde se nota.
 *
 * GLOW UP (revisora r25, 23-10-2026): el encabezado común (antes un sobretítulo
 * y un h1 sueltos), UNA línea de para qué sirve y lo de la Ley 51 y la Pascua en
 * la ayuda (antes tres renglones arriba y otros tres sobre la tabla).
 */

import { PageGuard } from '@/components/auth/PageGuard';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
import { CalendarioDeFestivosPanel } from '@/components/tesoreria/CalendarioDeFestivos';

export default function CalendarioPage() {
  return (
    <PageGuard module="configuracion" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <EncabezadoDePantalla
          seccion="Cobrar a inquilinos"
          titulo="Días hábiles y festivos"
          descripcion="Los días que no cuentan para los plazos: se calculan solos y aquí se corrigen."
          ayuda={
            <ParaEntenderMas
              etiqueta="¿Cómo se calculan?"
              descripcion="Para qué sirven los días hábiles y de dónde sale cada festivo."
            >
              <div className="space-y-3 text-caption text-fg-muted">
                <p>
                  La aceptación tácita de una factura corre a los <strong className="text-fg">3 días
                  hábiles</strong> y el plazo para responder una PQRS, a los{' '}
                  <strong className="text-fg">15</strong>. Un festivo en medio corre el plazo un día.
                </p>
                <p>
                  Los 18 festivos de Colombia se calculan solos: siete se corren al lunes siguiente
                  (Ley 51 de 1983) y cinco dependen de la Pascua. Dos festivos pueden caer el mismo
                  día: en 2025 el Sagrado Corazón y San Pedro cayeron los dos el 30 de junio.
                </p>
                <p>
                  Si la ley crea un festivo nuevo o tu oficina no trabaja un día, agrégalo. Si el
                  cálculo marca mal un día, márcalo como hábil.
                </p>
              </div>
            </ParaEntenderMas>
          }
        />
        <CalendarioDeFestivosPanel />
      </div>
    </PageGuard>
  );
}
