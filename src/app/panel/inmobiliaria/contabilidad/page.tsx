'use client';

/**
 * Contabilidad — la portada.
 *
 * Guard por `module="reportes"` y `view`: el back no tiene módulo
 * `contabilidad` en la matriz de permisos todavía (`ContabilidadEscrituraGuard`
 * explica por qué), y «reportes» es el módulo financiero que tienen ADMIN y
 * CONTADOR y no tiene el AGENTE. 🔴 Antes era `configuracion`, que el
 * CONTADOR NO tiene (`role-defaults.ts`): el único rol no-ADMIN al que el back
 * deja escribir asientos no podía ni abrir la pantalla (auditoría 2026-09-01).
 * Escribir lo decide el back (ADMIN o CONTADOR) y las pantallas muestran ese
 * 403 en palabras.
 */

import { PageGuard } from '@/components/auth/PageGuard';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
import { HubDeContabilidad } from '@/components/contabilidad/HubDeContabilidad';
import { ROLES_DE_LA_CONTABILIDAD } from '@/lib/auth/roles-de-la-contabilidad';

export default function ContabilidadPage() {
  return (
    <PageGuard module="reportes" roles={ROLES_DE_LA_CONTABILIDAD} seccion="Contabilidad">
      <div className="space-y-6 p-6 lg:p-8">
        {/* Revisora r23 (Contabilidad #5): el encabezado común, con la sección del menú («Dinero») y una línea. */}
        <EncabezadoDePantalla
          seccion="Dinero"
          titulo="Contabilidad"
          descripcion="Cierra el mes con el libro en orden y entrégale al contador lo que firma."
          // Revisora r24 (Contabilidad #6): el cierre es una tarea nueva para la inmobiliaria.
          ayuda={
            <ParaEntenderMas
              etiqueta="Cómo se cierra un mes"
              descripcion="Los cuatro pasos, en orden, y la regla del libro."
            >
              <div className="space-y-3 text-sm text-fg-muted">
                <p>
                  Primero, que todo lo que pasó en el mes tenga su asiento. Después, que el libro
                  cuadre: débitos y créditos iguales. Con eso, se cierra el mes y se le entrega al
                  contador el libro y los informes que firma.
                </p>
                <p>
                  <strong className="text-fg">Un asiento nunca se edita ni se borra: se reversa.</strong>{' '}
                  Así el libro guarda lo que pasó y lo que se corrigió.
                </p>
                <p>
                  Al cerrar el mes nadie asienta con fecha de ese mes; si hace falta, el administrador
                  lo reabre con motivo.
                </p>
              </div>
            </ParaEntenderMas>
          }
        />
        <HubDeContabilidad />
      </div>
    </PageGuard>
  );
}
