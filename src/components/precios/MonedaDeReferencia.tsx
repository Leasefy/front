'use client';

/**
 * Ver los precios de Leasefy en otra moneda (Nico, 31-10-2026: «tienes que dejar claro que esto se cobra en pesos
 * colombianos, o sea que lo puedan ver en varias monedas»). `ConMonedaDeReferencia` guarda la moneda elegida para
 * toda la pantalla; `SelectorDeMoneda` la cambia y dice que se cobra en COP; las piezas que escriben precios leen
 * `useMonedaDeReferencia().formato`. Sin tasa del back no se ofrece otra moneda: todo en pesos, como siempre.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Presence, SegmentedControl } from '@leasefy/cadence';

import { tarifasApi } from '@/lib/api/tarifas.service';
import { fechaLarga } from '@/lib/fechas/fecha-de-la-casa';
import { precioDelMes } from '@/lib/conversion/acceso';
import {
  MONEDAS,
  NOMBRE_DE_LA_MONEDA,
  formatoDe,
  guardarMoneda,
  leerLasTasas,
  monedaGuardada,
  type FormatoDePlata,
  type Moneda,
  type TasasDeCambio,
} from '@/lib/precios/moneda-de-referencia';
import { cn } from '@/lib/utils';

interface ValorDeLaMoneda {
  moneda: Moneda;
  elegir: (moneda: Moneda) => void;
  tasas: TasasDeCambio | null;
  /** Cómo se escribe una cifra en la moneda elegida («≈ 165 USD»); en COP, el precio de siempre. */
  formato: FormatoDePlata;
}

const SIN_PROVEEDOR: ValorDeLaMoneda = { moneda: 'COP', elegir: () => undefined, tasas: null, formato: precioDelMes };
const Contexto = createContext<ValorDeLaMoneda | null>(null);

let tasasPedidas: Promise<TasasDeCambio | null> | null = null;
/** Una sola pregunta por visita; si falla, se vuelve a preguntar la próxima vez que se monte la pantalla. */
function pedirLasTasas(): Promise<TasasDeCambio | null> {
  tasasPedidas ??= Promise.resolve()
    .then(() => tarifasApi.tasasDeCambio())
    .then(leerLasTasas)
    .catch(() => {
      tasasPedidas = null;
      return null;
    });
  return tasasPedidas;
}

export function ConMonedaDeReferencia({ children }: { children: ReactNode }) {
  const [elegida, setElegida] = useState<Moneda>('COP');
  const [tasas, setTasas] = useState<TasasDeCambio | null>(null);
  useEffect(() => {
    setElegida(monedaGuardada());
    let vivo = true;
    void pedirLasTasas().then((t) => {
      if (vivo) setTasas(t);
    });
    return () => {
      vivo = false;
    };
  }, []);
  const valor = useMemo<ValorDeLaMoneda>(() => {
    const moneda = tasas ? elegida : 'COP';
    return {
      moneda,
      tasas,
      formato: formatoDe(moneda, tasas),
      elegir: (m) => {
        setElegida(m);
        guardarMoneda(m);
      },
    };
  }, [elegida, tasas]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useMonedaDeReferencia(): ValorDeLaMoneda {
  return useContext(Contexto) ?? SIN_PROVEEDOR;
}

/**
 * «Ver en COP · USD · EUR · MXN · CLP» y la frase que lo deja claro: se cobra en pesos colombianos; lo demás es una
 * referencia con la tasa del día y su fuente. Sin tasa, sólo la frase.
 */
export function SelectorDeMoneda({ className, apilado = false }: { className?: string; apilado?: boolean }) {
  const { moneda, elegir, tasas } = useMonedaDeReferencia();
  return (
    <div
      className={cn(
        'flex flex-col gap-2',
        // Apilado (a la derecha de un título): el control arriba y la frase debajo, alineados a la derecha en escritorio.
        apilado ? 'lg:max-w-sm lg:items-end lg:text-right' : 'sm:flex-row sm:items-center sm:gap-4',
        className,
      )}
      data-testid="moneda-de-referencia"
    >
      {tasas ? (
        <SegmentedControl<Moneda>
          size="sm"
          aria-label="Ver los precios en"
          value={moneda}
          onChange={elegir}
          options={MONEDAS.map((m) => ({ value: m, label: m, ariaLabel: NOMBRE_DE_LA_MONEDA[m] }))}
          className="self-start"
        />
      ) : null}
      <p className="text-caption text-fg-muted" data-testid="moneda-se-cobra-en-cop">
        Se cobra en pesos colombianos (COP).
        <Presence as="span" show={moneda !== 'COP' && tasas !== null}>
          {tasas ? (
            <span data-testid="moneda-referencia">
              {' '}
              En {NOMBRE_DE_LA_MONEDA[moneda]} es una referencia con la tasa del {fechaLarga(tasas.fecha)}, de{' '}
              <a href={tasas.fuente.url} target="_blank" rel="noreferrer noopener" className="underline underline-offset-2 hover:text-fg">
                {tasas.fuente.nombre}
              </a>
              .
            </span>
          ) : null}
        </Presence>
      </p>
    </div>
  );
}
