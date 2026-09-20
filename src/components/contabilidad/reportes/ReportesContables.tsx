'use client';

/**
 * Los informes con los que un contador firma. Cada pestaña carga lo suyo recién
 * cuando se abre.
 *
 * ── Las dos que se agregaron el 18-09 (§7) ─────────────────────────────────
 *
 *   Mayor    → cada cuenta con sus débitos y créditos PARTIDOS POR MES. Un total
 *              de doce meses no dice nada; lo que el contador busca es el mes en
 *              que se salió de la línea.
 *   Terceros → el auxiliar por tercero como LISTA. El «Estado de cuenta» que ya
 *              estaba exige saber el id del tercero: sirve para llegar desde una
 *              ficha, no para encontrar a nadie. Esto los enumera, y desde cada
 *              fila se salta a su estado de cuenta.
 *
 * El orden de las pestañas es el del trabajo: balance (¿cuadra?) → mayor (¿en qué
 * mes?) → auxiliar (¿en qué asiento?) → terceros (¿de quién?) → estado de cuenta
 * (¿qué le pasó a esta persona?).
 */

import { useState } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuxiliarPorTercero } from './AuxiliarPorTercero';
import { BalanceDePrueba } from './BalanceDePrueba';
import { EstadoDeCuenta } from './EstadoDeCuenta';
import { LibroAuxiliar } from './LibroAuxiliar';
import { LibroMayor } from './LibroMayor';

export type Informe = 'balance' | 'mayor' | 'auxiliar' | 'terceros' | 'tercero';

export const INFORMES: readonly Informe[] = [
  'balance',
  'mayor',
  'auxiliar',
  'terceros',
  'tercero',
];

/**
 * `?informe=auxiliar` abre esa pestaña. Lo usan los accesos de la portada
 * («Para el contador»), la alerta de balance que no cuadra y los enlaces
 * «Estado de cuenta» de la lista de terceros: mandar a «Reportes» a secas
 * obligaría a buscar la pestaña a mano.
 *
 * Un valor que no está en la lista NO es un error de pantalla: queda el
 * balance, que es el default. Vive acá y no en la página porque el que sabe
 * qué pestañas hay es este componente.
 */
export function informeDe(valor: string | null | undefined): Informe {
  return INFORMES.find((i) => i === valor) ?? 'balance';
}

export function ReportesContables({ inicial = 'balance' }: { inicial?: Informe }) {
  const [informe, setInforme] = useState<Informe>(inicial);

  return (
    <Tabs value={informe} onValueChange={(v) => setInforme(v as Informe)}>
      <TabsList variant="underline" className="justify-start">
        <TabsTrigger value="balance" data-testid="pestana-balance">
          Balance de prueba
        </TabsTrigger>
        <TabsTrigger value="mayor" data-testid="pestana-mayor">
          Mayor
        </TabsTrigger>
        <TabsTrigger value="auxiliar" data-testid="pestana-auxiliar">
          Libro auxiliar
        </TabsTrigger>
        <TabsTrigger value="terceros" data-testid="pestana-terceros">
          Terceros
        </TabsTrigger>
        <TabsTrigger value="tercero" data-testid="pestana-tercero">
          Estado de cuenta
        </TabsTrigger>
      </TabsList>
      <TabsContent value="balance" className="pt-5">
        {informe === 'balance' ? <BalanceDePrueba /> : null}
      </TabsContent>
      <TabsContent value="mayor" className="pt-5">
        {informe === 'mayor' ? <LibroMayor /> : null}
      </TabsContent>
      <TabsContent value="auxiliar" className="pt-5">
        {informe === 'auxiliar' ? <LibroAuxiliar /> : null}
      </TabsContent>
      <TabsContent value="terceros" className="pt-5">
        {informe === 'terceros' ? <AuxiliarPorTercero /> : null}
      </TabsContent>
      <TabsContent value="tercero" className="pt-5">
        {informe === 'tercero' ? <EstadoDeCuenta /> : null}
      </TabsContent>
    </Tabs>
  );
}
