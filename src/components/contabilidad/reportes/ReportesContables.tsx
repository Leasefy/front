'use client';

/**
 * Los tres informes con los que un contador firma: balance de prueba, libro
 * auxiliar y estado de cuenta por tercero. Cada pestaña carga lo suyo recién
 * cuando se abre.
 */

import { useState } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BalanceDePrueba } from './BalanceDePrueba';
import { EstadoDeCuenta } from './EstadoDeCuenta';
import { LibroAuxiliar } from './LibroAuxiliar';

export type Informe = 'balance' | 'auxiliar' | 'tercero';

export function ReportesContables({ inicial = 'balance' }: { inicial?: Informe }) {
  const [informe, setInforme] = useState<Informe>(inicial);

  return (
    <Tabs value={informe} onValueChange={(v) => setInforme(v as Informe)}>
      <TabsList variant="underline" className="justify-start">
        <TabsTrigger value="balance" data-testid="pestana-balance">
          Balance de prueba
        </TabsTrigger>
        <TabsTrigger value="auxiliar" data-testid="pestana-auxiliar">
          Libro auxiliar
        </TabsTrigger>
        <TabsTrigger value="tercero" data-testid="pestana-tercero">
          Estado de cuenta
        </TabsTrigger>
      </TabsList>
      <TabsContent value="balance" className="pt-5">
        {informe === 'balance' ? <BalanceDePrueba /> : null}
      </TabsContent>
      <TabsContent value="auxiliar" className="pt-5">
        {informe === 'auxiliar' ? <LibroAuxiliar /> : null}
      </TabsContent>
      <TabsContent value="tercero" className="pt-5">
        {informe === 'tercero' ? <EstadoDeCuenta /> : null}
      </TabsContent>
    </Tabs>
  );
}
