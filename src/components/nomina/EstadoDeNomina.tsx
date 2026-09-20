'use client';

/**
 * LA PORTADA DE NÓMINA: qué falta para poder liquidar, y el costo del mes.
 *
 * ── Lo que esta pantalla se niega a hacer ───────────────────────────────────
 *
 * 1. **Decir «todo listo» cuando no lo está.** Si faltan las cifras del año, si
 *    hay conceptos sin cuenta del PUC o si nadie confirmó los parámetros, sale
 *    arriba y con el enlace a dónde arreglarlo.
 * 2. **Mostrar el NETO como si fuera el costo.** El costo de la nómina es
 *    devengado + aportes del empleador + provisiones; el neto es lo que se gira.
 *    Son dos números distintos y los dos aparecen, con su definición.
 * 3. **Prometer la planilla PILA.** Se hace por fuera, y la pantalla lo dice en
 *    vez de dejar que alguien busque el botón.
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { SelectorDeMes } from '@/components/finanzas/SelectorDeMes';
import { nominaApi } from '@/lib/api/nomina.service';
import type { EstadoDeNomina as Estado, ResumenDelMes } from '@/lib/api/nomina.types';
import { mesActual } from '@/lib/recaudo/meses';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { Avisos, Cifra, TituloDeBloque } from './piezas';
import { Cargado, useCargaDeNomina } from './usar-nomina';

const PANEL = '/panel/inmobiliaria/nomina';

export function EstadoDeNominaPanel() {
  const [mes, setMes] = useState(() => mesActual());
  const anio = Number(mes.slice(0, 4));

  const estado = useCargaDeNomina<{ estado: Estado; resumen: ResumenDelMes }>(
    async () => {
      const [e, r] = await Promise.all([
        nominaApi.estado(anio),
        nominaApi.resumen(mes),
      ]);
      return { estado: e, resumen: r };
    },
    [mes, anio],
  );

  return (
    <div className="space-y-6">
      <Cargado
        estado={estado}
        queEs="el estado de nómina"
        queSeEspera="usar nómina"
      >
        {({ estado: e, resumen }) => (
          <Contenido
            estado={e}
            resumen={resumen}
            mes={mes}
            onMes={setMes}
          />
        )}
      </Cargado>
    </div>
  );
}

function Contenido({
  estado,
  resumen,
  mes,
  onMes,
}: {
  estado: Estado;
  resumen: ResumenDelMes;
  mes: string;
  onMes: (m: string) => void;
}) {
  /**
   * 🔴 Lo que falta, en el orden en que hay que resolverlo. Nada de esto es un
   * error: es trabajo pendiente, y cada línea dice dónde se hace.
   */
  const pendientes = useMemo(() => {
    const lista: string[] = [];
    if (!estado.parametros.disponible) {
      lista.push(
        estado.parametros.motivo ??
          'Los parámetros de nómina todavía no se pueden guardar: falta una migración.',
      );
    } else if (!estado.parametros.completos) {
      lista.push(
        `No se puede liquidar ${estado.anio}: falta ${estado.parametros.queFalta.join(', ')}. Los fija el Gobierno (decreto) y la DIAN (resolución) cada año — cárgalos en Configuración.`,
      );
    } else if (!estado.parametros.confirmados) {
      lista.push(
        `Los parámetros de ${estado.anio} no los ha confirmado nadie. Revísalos con tu contador y márcalos como confirmados: mientras tanto cada desprendible sale con este aviso.`,
      );
    }

    if (estado.conceptos.disponible && estado.conceptos.sembrados === 0) {
      lista.push(
        'El catálogo de conceptos está vacío. Siémbralo en Conceptos: trae los que el motor calcula, con las cuentas del Decreto 2650 como sugerencia.',
      );
    } else if (estado.conceptos.sinCuenta.length > 0) {
      lista.push(
        `${estado.conceptos.sinCuenta.length} concepto${estado.conceptos.sinCuenta.length === 1 ? '' : 's'} sin cuenta del PUC: ${estado.conceptos.sinCuenta.map((c) => c.codigo).join(', ')}. Sin ellas la nómina se liquida pero NO se asienta.`,
      );
    }

    if (estado.personas.disponible && estado.personas.total === 0) {
      lista.push(
        'Todavía no hay nadie en nómina. Empieza por Personas: empleados, asesores, contratistas y aprendices.',
      );
    }

    if (estado.personas.cuotaDeAprendices?.aviso) {
      lista.push(estado.personas.cuotaDeAprendices.aviso);
    }

    return lista;
  }, [estado]);

  const listo = pendientes.length === 0;

  return (
    <div className="space-y-6">
      <Avisos
        avisos={pendientes}
        titulo={
          listo ? undefined : `Falta esto para que la nómina de ${estado.anio} quede lista`
        }
        testId="pendientes-de-nomina"
      />
      {listo ? (
        <Avisos
          avisos={[
            `Los parámetros de ${estado.anio} están cargados y confirmados, el catálogo de conceptos está mapeado y hay ${estado.personas.total} persona${estado.personas.total === 1 ? '' : 's'} en nómina.`,
          ]}
          titulo="Nómina lista para liquidar"
          tono="info"
          testId="nomina-lista"
        />
      ) : null}

      <section className="space-y-3">
        <TituloDeBloque
          titulo="El costo de la nómina"
          explicacion="El costo NO es lo que se le gira a la gente: es el devengado más los aportes del empleador más las provisiones de prestaciones. Es la cifra que va al P&G y al rubro «nómina» del presupuesto. Sólo cuenta los períodos aprobados o pagados."
          accion={<SelectorDeMes mes={mes} onCambiar={onMes} />}
        />
        {resumen.disponible ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Cifra
              id="costo"
              etiqueta="Costo total del mes"
              valor={resumen.costoTotalCop}
              definicion="Devengado + aportes del empleador + provisiones de prestaciones. Es lo que la nómina le cuesta a la inmobiliaria."
            />
            <Cifra
              id="devengado"
              etiqueta="Devengado"
              valor={resumen.devengadoCop}
              definicion="Todo lo que se les reconoció a las personas: sueldo, auxilio de transporte, horas extras, comisiones, incapacidades."
            />
            <Cifra
              id="aportes"
              etiqueta="Aportes del empleador"
              valor={resumen.aportesCop}
              definicion="Salud, pensión, ARL, caja de compensación, SENA e ICBF a cargo de la inmobiliaria. No se le descuentan a nadie."
            />
            <Cifra
              id="neto"
              etiqueta="Neto girado"
              valor={resumen.netoCop ?? null}
              definicion="Lo que efectivamente se les paga: devengado menos deducciones."
              sinMedir="Todavía no hay períodos aprobados en este mes."
            />
          </div>
        ) : (
          <Avisos
            avisos={[resumen.motivo ?? 'El resumen del mes todavía no está disponible.']}
            testId="resumen-no-disponible"
          />
        )}

        {resumen.disponible && resumen.porSede.length > 1 ? (
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="mb-2 text-xs font-medium text-fg">Por centro de costo (sede)</p>
            <ul className="space-y-1 text-xs text-fg-muted">
              {resumen.porSede.map((s) => (
                <li key={s.sedeId ?? 'sin-sede'} className="flex justify-between gap-4">
                  <span>{s.sedeId ?? 'Sin sede asignada'}</span>
                  <span className="font-mono tabular-nums">
                    {formatCurrency(
                      s.devengadoCop + s.aportesCop + s.provisionesCop,
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <TituloDeBloque
          titulo="Por dónde entrar"
          explicacion="Cada pieza de nómina tiene su pantalla. El orden de la primera vez es: configuración → conceptos → personas → liquidación."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PUERTAS.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="block space-y-1 rounded-lg border border-border bg-surface p-4 transition hover:border-brand/50"
              data-testid={`puerta-${p.key}`}
            >
              <p className="text-sm font-medium text-fg">{p.titulo}</p>
              <p className="text-xs leading-relaxed text-fg-muted">{p.que}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <TituloDeBloque
          titulo="Lo que Leasefy NO hace, dicho acá"
          explicacion="Para que nadie busque un botón que no existe ni suponga que algo ya se cumplió."
        />
        <Avisos
          avisos={[
            estado.avisos.pila,
            estado.nominaElectronica.aviso ??
              `Nómina electrónica: proveedor «${estado.nominaElectronica.nombre}».`,
            estado.avisos.recobroEps,
            estado.avisos.recorteDeDeducciones,
          ]}
          tono="info"
          testId="lo-que-no-hace"
        />
      </section>
    </div>
  );
}

const PUERTAS = [
  {
    key: 'configuracion',
    href: `${PANEL}/configuracion`,
    titulo: 'Configuración del año',
    que: 'Salario mínimo, auxilio de transporte, UVT, factores de horas extras y tarifas de aportes. Sin las tres primeras no se puede liquidar.',
  },
  {
    key: 'conceptos',
    href: `${PANEL}/conceptos`,
    titulo: 'Conceptos y cuentas',
    que: 'El catálogo de lo que se devenga y se deduce, y a qué cuenta del PUC va cada renglón.',
  },
  {
    key: 'personas',
    href: `${PANEL}/personas`,
    titulo: 'Personas',
    que: 'Empleados con contrato laboral, asesores por comisiones, contratistas de prestación de servicios y aprendices.',
  },
  {
    key: 'periodos',
    href: `${PANEL}/periodos`,
    titulo: 'Liquidación',
    que: 'El borrador del período, su aprobación, el asiento contable y el pago.',
  },
  {
    key: 'provisiones',
    href: `${PANEL}/provisiones`,
    titulo: 'Prestaciones sociales',
    que: 'La provisión mensual de prima, cesantías, intereses y vacaciones, y el cruce al pagarlas.',
  },
  {
    key: 'electronica',
    href: `${PANEL}/electronica`,
    titulo: 'Nómina electrónica (DIAN)',
    que: 'Los documentos, su CUNE y la cola de lo que falta por transmitir. La planilla PILA se hace por fuera.',
  },
] as const;
