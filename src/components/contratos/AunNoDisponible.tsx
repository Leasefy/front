/**
 * El aviso de «esta parte todavía no se puede usar», una sola vez y arriba.
 *
 * ── 🔴 El defecto que resuelve (Nico, 18-09-2026) ──────────────────────────
 *
 * «Hay cosas que se ven muy pequeñas y que veo que ni funcionan.» Tenía razón
 * y era peor de lo que señalaba: cuando a una tarjeta le falta su migración,
 * lo que hacíamos era **dejar los controles puestos y muertos** —un `input`
 * gris, un botón apagado, unos radios que no se mueven— y explicar el porqué
 * en una línea de 11 px debajo de cada uno.
 *
 * Eso está mal por tres razones, y las tres se ven en la ficha del contrato:
 *
 *   1. Un control deshabilitado sin explicación AL LADO se lee como roto, no
 *      como «todavía no». La persona hace clic, no pasa nada, y aprende a
 *      desconfiar de la pantalla entera.
 *   2. El porqué iba en el tamaño más chico de la tipografía, gris sobre
 *      blanco: el mensaje más importante de la tarjeta era el menos legible.
 *   3. Se repetía una vez por control. En «Condiciones del contrato» la misma
 *      frase aparecía tres veces en la misma tarjeta.
 *
 * Acá se dice UNA vez, arriba, con el peso que le corresponde — y los
 * controles muertos no se dibujan: en su lugar va el estado actual como texto.
 * Lo que no se puede hacer no se ofrece.
 */

import { Info } from '@phosphor-icons/react';

export function AunNoDisponible({
  /** Qué es lo que todavía no se puede hacer: «elegir quién paga la administración». */
  queNoSePuede,
  /** Qué pasa mientras tanto: «se cobra como hoy». Es lo que calma a quien lee. */
  mientrasTanto,
  testId = 'aun-no-disponible',
}: {
  queNoSePuede: string;
  mientrasTanto: string;
  testId?: string;
}) {
  return (
    <div
      className="flex gap-2.5 rounded-lg border border-border bg-surface px-4 py-3"
      role="status"
      data-testid={testId}
    >
      <Info
        weight="duotone"
        className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle"
        aria-hidden="true"
      />
      <p className="text-sm leading-relaxed text-fg-muted">
        <span className="font-medium text-fg">Todavía no puedes {queNoSePuede}.</span>{' '}
        {mientrasTanto} Lo estamos habilitando.
      </p>
    </div>
  );
}
