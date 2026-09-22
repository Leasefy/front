'use client';

/**
 * Plata pendiente de aplicar — `/panel/inmobiliaria/pagos/pendientes`.
 *
 * Permiso `dispersiones:view`: es plata de un tercero (una aseguradora) hasta
 * que se aplica o se devuelve, igual que el cuadre y los giros.
 */

import { PageGuard } from '@/components/auth/PageGuard';
import { SectionLabel } from '@/components/ui/section-label';
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
import { PendientesDeAplicarPanel } from '@/components/tesoreria/PendientesDeAplicar';

export default function PendientesDeAplicarPage() {
  return (
    <PageGuard module="dispersiones" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        {/* 🔴 LA MISMA FRASE DICHA DOS VECES (Nico, 21-09: «no se entiende
            nada»).
            La pantalla decía el mismo párrafo arriba —«lo que una aseguradora
            pagó por encima de lo VENCIDO…»— y otra vez adentro, en el vacío; y
            con la agencia sin pendientes, ESO era la pantalla entera: el mismo
            texto dos veces y nada más. Repetir una explicación no la explica
            mejor, hace dudar de si son dos cosas distintas.
            Ahora arriba va UNA línea, el porqué completo va detrás de un botón
            (la regla de la casa) y el vacío dice lo suyo: qué pasa cuando no
            hay nada. */}
        <header className="space-y-1.5">
          <SectionLabel>Tesorería</SectionLabel>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-h2 text-fg">Pendiente de aplicar</h1>
            <ParaEntenderMas
              etiqueta="Por qué esta plata no se puede aplicar"
              descripcion="De dónde sale, de quién es mientras está acá, y qué la libera."
            >
              <div className="space-y-3 text-sm text-fg-muted">
                <p>
                  Cuando una aseguradora paga un siniestro, a veces consigna{' '}
                  <strong className="text-fg">más de lo que el inquilino tiene vencido</strong>.
                  Un siniestro cubre la mora; no adelanta cánones que todavía no vencen.
                </p>
                <p>
                  Ese excedente entra igual —antes se rechazaba, y la aseguradora ya había
                  consignado— y se queda acá con nombre: de quién es la deuda que iba a pagar,
                  quién puso la plata, y cuánto se puede aplicar hoy.
                </p>
                <p>
                  Mientras está acá es un <strong className="text-fg">pasivo</strong>: se le debe
                  a quien la puso. No es un saldo a favor de la inmobiliaria.
                </p>
                <p>
                  Sale de acá de dos maneras: se <strong className="text-fg">aplica</strong>{' '}
                  cuando vencen más cuotas de ese inquilino —lo decide una persona, y emite un
                  recibo de caja— o se <strong className="text-fg">devuelve</strong> a quien la
                  puso.
                </p>
              </div>
            </ParaEntenderMas>
          </div>
          <p className="max-w-2xl text-sm text-fg-muted">
            Plata que entró, es de un tercero, y todavía no tiene contra qué aplicarse.
          </p>
        </header>
        <PendientesDeAplicarPanel />
      </div>
    </PageGuard>
  );
}
