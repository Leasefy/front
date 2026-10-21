'use client';

/**
 * LA PORTADA DE NÓMINA — GLOW UP 21-10: qué falta para liquidar, la nómina del
 * mes paso a paso y lo que cuesta.
 *
 * Nico: «que el flujo realmente quede optimizado para lo que un usuario haría
 * para su job to be done, no solo colocarle la UI nueva». Antes la portada era
 * una lista de avisos sueltos, cuatro tarjetas de cifras, seis tarjetas iguales
 * («Por dónde entrar») y otra tarjeta con lo que Leasefy no hace: todo del
 * mismo peso. Ahora va en el orden en que se trabaja:
 *
 *   1. Lo que falta para poder liquidar (`ListaParaEmpezar`), cada cosa con su
 *      botón; con todo listo se pliega en una línea.
 *   2. La nómina del mes, paso a paso (`PasosDeLaTarea`): liquidar → revisar y
 *      aprobar → asentar y pagar, leído del período real.
 *   3. Lo que cuesta el mes, en una franja de cifras.
 *   4. Las pantallas de nómina, agrupadas por cuándo se usan, y lo que Leasefy
 *      no hace, plegado.
 *
 * ── Lo que esta pantalla se niega a hacer ───────────────────────────────────
 *
 * 1. **Decir «todo listo» cuando no lo está.** Si faltan las cifras del año, si
 *    hay conceptos sin cuenta del PUC o si nadie confirmó los parámetros, sale
 *    arriba y con el botón a dónde arreglarlo.
 * 2. **Mostrar el NETO como si fuera el costo.** El costo de la nómina es
 *    devengado + aportes del empleador + provisiones; el neto es lo que se gira.
 *    Son dos números distintos y los dos aparecen, con su definición.
 * 3. **Prometer la planilla PILA.** Se hace por fuera, y la pantalla lo dice en
 *    vez de dejar que alguien busque el botón.
 * 4. **Inventar el estado de un período.** Los pasos salen del período que
 *    devolvió el back; si los períodos no cargan, se dice, y no se pinta nada.
 */

import Link from 'next/link';
import { useMemo, useState, type ComponentType } from 'react';
import {
  BookOpen,
  Calculator,
  FileText,
  GearSix,
  PiggyBank,
  UsersThree,
} from '@phosphor-icons/react';
import { Cifra, FranjaDeCifras } from '@leasefy/cadence';

import { SelectorDeMes } from '@/components/finanzas/SelectorDeMes';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { ListaParaEmpezar, type Requisito } from '@/components/pantalla/ListaParaEmpezar';
import { MasDetalles } from '@/components/pantalla/MasDetalles';
import { PasosDeLaTarea, type PasoDeLaTarea } from '@/components/pantalla/PasosDeLaTarea';
import { Button } from '@/components/ui/button';
import { nominaApi } from '@/lib/api/nomina.service';
import type {
  EstadoDeNomina as Estado,
  PeriodoDeNomina,
  ResumenDelMes,
} from '@/lib/api/nomina.types';
import { motivoEnCristiano } from '@/lib/errores/en-cristiano';
import { fechaCorta } from '@/lib/fechas/fecha-de-la-casa';
import { mesActual, nombreDelMes } from '@/lib/recaudo/meses';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { Avisos } from './piezas';
import { Cargado, useCargaDeNomina } from './usar-nomina';

const PANEL = '/panel/inmobiliaria/nomina';

interface DatosDeLaPortada {
  estado: Estado;
  resumen: ResumenDelMes;
  /** `null`: los períodos no cargaron (los pasos lo dicen en vez de adivinar). */
  periodos: PeriodoDeNomina[] | null;
}

export function EstadoDeNominaPanel() {
  const [mes, setMes] = useState(() => mesActual());
  const anio = Number(mes.slice(0, 4));

  const carga = useCargaDeNomina<DatosDeLaPortada>(
    async () => {
      const [estado, resumen, periodos] = await Promise.all([
        nominaApi.estado(anio),
        nominaApi.resumen(mes),
        // Los períodos fallan por su lado: sin ellos la portada sigue sirviendo
        // (lo que falta y el costo), y los pasos dicen que no pudieron leerse.
        nominaApi
          .periodos({ mes })
          .then((r) => r.periodos)
          .catch(() => null),
      ]);
      return { estado, resumen, periodos };
    },
    [mes, anio],
  );

  // La acción principal sólo existe con el módulo abierto: con el cartel de
  // «no está habilitada», un botón a Liquidación llevaría al mismo cartel.
  const abierta = carga.datos != null;
  // 🔴 Y sólo con las cifras del año: sin ellas armar el borrador es un 422
  // («falta salario mínimo…»). La lista de arriba dice cómo cargarlas.
  const sePuedeLiquidar = puedeLiquidar(carga.datos?.estado);

  return (
    <div className="space-y-6">
      <EncabezadoDePantalla
        seccion="Nómina"
        titulo="Nómina"
        descripcion="Empleados, asesores, contratistas y aprendices: liquidar cada período, aprobarlo, asentarlo y pagarlo."
        acciones={
          abierta ? (
            <Button asChild size="sm" variant="outline" hideArrow>
              <Link href={`${PANEL}/personas`} data-testid="ir-a-personas">
                Personas
              </Link>
            </Button>
          ) : undefined
        }
        accionPrincipal={
          abierta && sePuedeLiquidar ? (
            <Button asChild size="sm" hideArrow>
              <Link href={`${PANEL}/periodos`} data-testid="ir-a-liquidacion">
                Liquidar un período
              </Link>
            </Button>
          ) : undefined
        }
        data-testid="encabezado-de-nomina"
      />
      <Cargado estado={carga} queEs="el estado de nómina" queSeEspera="usar nómina">
        {(datos) => <Contenido {...datos} mes={mes} onMes={setMes} />}
      </Cargado>
    </div>
  );
}

function Contenido({
  estado,
  resumen,
  periodos,
  mes,
  onMes,
}: DatosDeLaPortada & { mes: string; onMes: (m: string) => void }) {
  const requisitos = useMemo(() => requisitosParaLiquidar(estado), [estado]);
  const aprendices = estado.personas.cuotaDeAprendices?.aviso;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <ListaParaEmpezar
          paraQue={`liquidar y asentar la nómina de ${estado.anio}`}
          requisitos={requisitos}
          recordarComo="nomina"
          data-testid="lista-para-liquidar"
        />
        {aprendices ? <Avisos avisos={[aprendices]} testId="cuota-de-aprendices" /> : null}
      </div>

      <NominaDelMes mes={mes} periodos={periodos} sePuedeLiquidar={puedeLiquidar(estado)} />

      <section className="space-y-3" aria-labelledby="costo-de-la-nomina">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <h2 id="costo-de-la-nomina" className="text-sm font-semibold text-fg">
              Lo que cuesta la nómina de {nombreDelMes(mes)}
            </h2>
            <p className="text-caption text-fg-muted">
              Sólo cuenta los períodos aprobados o pagados.
            </p>
          </div>
          <SelectorDeMes mes={mes} onCambiar={onMes} />
        </div>
        {resumen.disponible ? (
          <>
            <FranjaDeCifras fila="xl" aria-label="El costo de la nómina" data-testid="costo-de-la-nomina">
              <Cifra
                etiqueta="Costo total"
                valor={formatCurrency(resumen.costoTotalCop)}
                detalle="Devengado + aportes + provisiones"
                data-testid="cifra-costo"
              />
              <Cifra
                etiqueta="Devengado"
                valor={formatCurrency(resumen.devengadoCop)}
                detalle="Lo reconocido a las personas"
                data-testid="cifra-devengado"
              />
              <Cifra
                etiqueta="Aportes del empleador"
                valor={formatCurrency(resumen.aportesCop)}
                detalle="A cargo de la inmobiliaria"
                data-testid="cifra-aportes"
              />
              <Cifra
                etiqueta="Neto girado"
                valor={resumen.netoCop != null ? formatCurrency(resumen.netoCop) : '—'}
                detalle={
                  resumen.netoCop != null
                    ? 'Lo que se les paga'
                    : 'Sin períodos aprobados este mes'
                }
                data-testid="cifra-neto"
              />
            </FranjaDeCifras>
            <MasDetalles etiqueta="Qué cuenta cada cifra" etiquetaAbierto="Ocultar" data-testid="que-cuenta-cada-cifra">
              <dl className="grid gap-x-6 gap-y-3 text-caption sm:grid-cols-2">
                {DEFINICIONES.map((d) => (
                  <div key={d.que} className="space-y-0.5">
                    <dt className="font-medium text-fg">{d.que}</dt>
                    <dd className="leading-relaxed text-fg-muted">{d.es}</dd>
                  </div>
                ))}
              </dl>
              {resumen.porSede.length > 1 ? (
                <div className="mt-4 space-y-2" data-testid="costo-por-sede">
                  <p className="text-caption font-medium text-fg">Por centro de costo (sede)</p>
                  <ul className="divide-y divide-border-faint rounded-lg border border-border">
                    {resumen.porSede.map((s) => (
                      <li key={s.sedeId ?? 'sin-sede'} className="flex justify-between gap-4 px-3 py-2 text-caption">
                        <span className="min-w-0 truncate text-fg-muted">{s.sedeId ?? 'Sin sede asignada'}</span>
                        <span className="font-mono tabular-nums text-fg">
                          {formatCurrency(s.devengadoCop + s.aportesCop + s.provisionesCop)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </MasDetalles>
          </>
        ) : (
          <Avisos
            avisos={[resumen.motivo ?? 'El resumen del mes todavía no está disponible.']}
            testId="resumen-no-disponible"
          />
        )}
      </section>

      <PantallasDeNomina />

      <MasDetalles etiqueta="Lo que Leasefy no hace en nómina" etiquetaAbierto="Ocultar" data-testid="lo-que-no-hace">
        <ul className="space-y-2 text-sm text-fg-muted">
          {[
            estado.avisos.pila,
            estado.nominaElectronica.aviso ??
              `Nómina electrónica: proveedor «${estado.nominaElectronica.nombre}».`,
            estado.avisos.recobroEps,
            estado.avisos.recorteDeDeducciones,
          ].map((aviso) => (
            <li key={aviso}>{aviso}</li>
          ))}
        </ul>
      </MasDetalles>
    </div>
  );
}

// ── 1. Lo que falta para liquidar ───────────────────────────────────────────

function Ir({ href, children, testId, variant = 'outline' }: { href: string; children: string; testId: string; variant?: 'outline' | 'ghost' }) {
  return (
    <Button asChild size="sm" variant={variant} hideArrow>
      <Link href={href} data-testid={testId}>
        {children}
      </Link>
    </Button>
  );
}

/**
 * 🔴 Cada requisito sale de lo que respondió el back. Lo que no se pudo revisar
 * (la tabla todavía no existe) va como `desconocido`: no cuenta como hecho, y la
 * lista no dice «Todo listo».
 */
export function requisitosParaLiquidar(e: Estado): Requisito[] {
  const P = e.parametros;
  const C = e.conceptos;
  const lista: Requisito[] = [];

  if (!P.disponible) {
    lista.push({
      id: 'cifras',
      titulo: `Las cifras de ${e.anio}`,
      detalle:
        motivoEnCristiano(P.motivo) ??
        'Todavía no se pueden guardar: nuestro equipo lo está habilitando.',
      estado: 'falta',
    });
  } else {
    lista.push({
      id: 'cifras',
      titulo: `Las cifras de ${e.anio}`,
      detalle: P.completos
        ? 'Salario mínimo, auxilio de transporte y UVT cargados.'
        : P.queFalta.length === 0 || P.queFalta.includes('todo')
          ? // El back responde `["todo"]` cuando el año no tiene ninguna cifra.
            'Todavía no hay ninguna: salario mínimo, auxilio de transporte y UVT. Los fijan el Gobierno y la DIAN cada año.'
          : `Falta ${P.queFalta.join(', ')}. Los fijan el Gobierno y la DIAN cada año.`,
      estado: P.completos ? 'listo' : 'falta',
      accion: <Ir href={`${PANEL}/configuracion`} testId="requisito-cargar-cifras">Cargarlas</Ir>,
      accionListo: <Ir href={`${PANEL}/configuracion`} testId="requisito-ver-cifras" variant="ghost">Ver</Ir>,
    });
    lista.push({
      id: 'confirmadas',
      titulo: 'Confirmadas con tu contador',
      detalle: P.confirmados
        ? 'Alguien las revisó y las confirmó.'
        : P.completos
          ? 'Mientras nadie las confirme, cada desprendible sale con un aviso.'
          : 'Después de cargarlas, revísalas con tu contador.',
      estado: P.confirmados ? 'listo' : 'falta',
      accion: P.completos ? (
        <Ir href={`${PANEL}/configuracion`} testId="requisito-confirmar-cifras">Revisar y confirmar</Ir>
      ) : undefined,
    });
  }

  if (!C.disponible) {
    lista.push({ id: 'conceptos', titulo: 'Los conceptos con su cuenta del PUC', detalle: 'Todavía no se pueden revisar.', estado: 'desconocido' });
  } else if (C.sembrados === 0) {
    lista.push({
      id: 'conceptos',
      titulo: 'Los conceptos con su cuenta del PUC',
      detalle: 'El catálogo está vacío. Se siembra con los conceptos que calcula el motor y las cuentas del Decreto 2650 como sugerencia.',
      estado: 'falta',
      accion: <Ir href={`${PANEL}/conceptos`} testId="requisito-sembrar-conceptos">Sembrar los conceptos</Ir>,
    });
  } else if (C.sinCuenta.length > 0) {
    const n = C.sinCuenta.length;
    lista.push({
      id: 'conceptos',
      titulo: 'Los conceptos con su cuenta del PUC',
      detalle: `${n} sin cuenta: ${C.sinCuenta.map((c) => c.codigo).join(', ')}. Sin ellas se liquida, pero no se asienta.`,
      estado: 'falta',
      accion: <Ir href={`${PANEL}/conceptos`} testId="requisito-mapear-conceptos">Asignar las cuentas</Ir>,
    });
  } else {
    lista.push({
      id: 'conceptos',
      titulo: 'Los conceptos con su cuenta del PUC',
      detalle: `${C.sembrados} concepto${C.sembrados === 1 ? '' : 's'}, todos con su cuenta.`,
      estado: 'listo',
      accionListo: <Ir href={`${PANEL}/conceptos`} testId="requisito-ver-conceptos" variant="ghost">Ver</Ir>,
    });
  }

  if (!e.personas.disponible) {
    lista.push({ id: 'personas', titulo: 'Las personas en nómina', detalle: 'Todavía no se pueden revisar.', estado: 'desconocido' });
  } else {
    const n = e.personas.total;
    lista.push({
      id: 'personas',
      titulo: 'Las personas en nómina',
      detalle:
        n === 0
          ? 'Todavía no hay nadie: empleados, asesores, contratistas y aprendices.'
          : `${n} persona${n === 1 ? '' : 's'} en nómina.`,
      estado: n === 0 ? 'falta' : 'listo',
      accion: <Ir href={`${PANEL}/personas`} testId="requisito-agregar-personas">Agregar personas</Ir>,
      accionListo: <Ir href={`${PANEL}/personas`} testId="requisito-ver-personas" variant="ghost">Ver</Ir>,
    });
  }

  return lista;
}

// ── 2. La nómina del mes, paso a paso ───────────────────────────────────────

/** «octubre de 2026» o «octubre de 2026 · quincena 2». */
function nombreDelPeriodo(mes: string, quincena: number | null): string {
  return quincena == null ? nombreDelMes(mes) : `${nombreDelMes(mes)} · quincena ${quincena}`;
}

type Foco =
  | { tipo: 'periodo'; periodo: PeriodoDeNomina }
  /** Nada armado todavía para esa quincena (o para el mes). */
  | { tipo: 'sin-armar'; quincena: number | null };

/**
 * El período en el que hay trabajo: el primero del mes que no esté pagado (la
 * quincena 1 antes que la 2). Con la quincena 1 pagada y la 2 sin armar, el
 * trabajo es armar la 2. Los anulados no cuentan.
 */
export function periodoEnFoco(periodos: PeriodoDeNomina[]): Foco {
  const vivos = periodos
    .filter((p) => p.estado !== 'ANULADO')
    .sort((a, b) => (a.quincena ?? 0) - (b.quincena ?? 0));
  const pendiente = vivos.find((p) => p.estado !== 'PAGADO');
  if (pendiente) return { tipo: 'periodo', periodo: pendiente };
  const ultimo = vivos[vivos.length - 1];
  if (!ultimo) return { tipo: 'sin-armar', quincena: null };
  if (ultimo.quincena === 1) return { tipo: 'sin-armar', quincena: 2 };
  return { tipo: 'periodo', periodo: ultimo };
}

export function pasosDelPeriodo(foco: Foco, sePuedeLiquidar = true): PasoDeLaTarea[] {
  const p = foco.tipo === 'periodo' ? foco.periodo : null;
  const aLiquidacion = (texto: string, testId: string) => (
    <Button asChild size="sm" variant="secondary" hideArrow>
      <Link href={`${PANEL}/periodos`} data-testid={testId}>
        {texto}
      </Link>
    </Button>
  );

  return [
    {
      id: 'liquidar',
      titulo: 'Liquidar el período',
      descripcion: 'El borrador con las personas activas y sus novedades. Se recalcula las veces que haga falta.',
      // Sin las cifras del año no hay borrador posible: el paso espera, y dice por qué.
      estado: p ? 'hecho' : sePuedeLiquidar ? 'actual' : 'pendiente',
      bloqueadoPorque: 'Primero, lo que falta arriba: las cifras del año.',
      resumen: p
        ? `${p.personas} persona${p.personas === 1 ? '' : 's'} · neto ${formatCurrency(p.totalNetoCop)}`
        : undefined,
      contenido: aLiquidacion(p ? 'Recalcular en Liquidación' : 'Armar el borrador', 'paso-armar-borrador'),
      etiquetaDeCambio: p?.estado === 'BORRADOR' ? 'Recalcular' : 'Ver',
    },
    {
      id: 'aprobar',
      titulo: 'Revisarlo y aprobarlo',
      descripcion: 'Aprobar congela las líneas, escribe las provisiones y le manda a cada persona su desprendible por correo.',
      estado: !p ? 'pendiente' : p.estado === 'BORRADOR' ? 'actual' : 'hecho',
      resumen: p?.aprobadoAt ? `Aprobado el ${fechaCorta(p.aprobadoAt)}` : 'Aprobado',
      bloqueadoPorque: 'Primero arma el borrador.',
      contenido: p ? (
        <div className="flex flex-wrap gap-2">
          {aLiquidacion('Aprobar en Liquidación', 'paso-aprobar')}
          <Button asChild size="sm" variant="ghost" hideArrow>
            <Link href={`${PANEL}/periodos/${p.id}`} data-testid="paso-revisar-desprendibles">
              Revisar los desprendibles
            </Link>
          </Button>
        </div>
      ) : undefined,
      etiquetaDeCambio: 'Ver',
    },
    {
      id: 'asentar-y-pagar',
      titulo: 'Asentarlo y pagarlo',
      descripcion: 'El asiento en contabilidad (con el mes contable abierto) y marcarlo pagado cuando salga el giro.',
      estado: !p || p.estado === 'BORRADOR' ? 'pendiente' : p.estado === 'APROBADO' ? 'actual' : 'hecho',
      resumen: p
        ? `${p.pagadoAt ? `Pagado el ${fechaCorta(p.pagadoAt)}` : 'Pagado'} · ${p.asientoId ? 'asentado' : 'sin asiento contable'}`
        : undefined,
      bloqueadoPorque: 'Después de aprobarlo.',
      contenido: p ? (
        <div className="space-y-3">
          <ul className="space-y-1 text-sm" data-testid="asiento-y-pago">
            <li className="text-fg">
              Asiento contable:{' '}
              <span className="text-fg-muted">{p.asientoId ? 'hecho.' : 'falta.'}</span>
            </li>
            <li className="text-fg">
              Pago:{' '}
              <span className="text-fg-muted">
                {p.estado === 'PAGADO' ? 'marcado.' : 'falta marcarlo cuando salga el giro.'}
              </span>
            </li>
          </ul>
          {aLiquidacion(p.asientoId ? 'Marcar pagado en Liquidación' : 'Asentar en Liquidación', 'paso-asentar-o-pagar')}
        </div>
      ) : undefined,
      etiquetaDeCambio: 'Ver',
    },
  ];
}

/** Con las cifras del año cargadas (las que el back exige para armar un borrador). */
export function puedeLiquidar(e: Estado | undefined): boolean {
  return Boolean(e?.parametros.disponible && e.parametros.completos);
}

function NominaDelMes({
  mes,
  periodos,
  sePuedeLiquidar,
}: {
  mes: string;
  periodos: PeriodoDeNomina[] | null;
  sePuedeLiquidar: boolean;
}) {
  if (periodos === null) {
    return (
      <section
        className="space-y-2 rounded-lg border border-border bg-surface p-4"
        data-testid="nomina-del-mes-sin-leer"
      >
        <p className="text-sm font-medium text-fg">La nómina de {nombreDelMes(mes)}</p>
        <p className="text-caption text-fg-muted">
          No pude leer los períodos de este mes: no sé en qué paso va. En Liquidación están todos.
        </p>
        <Button asChild size="sm" variant="outline" hideArrow>
          <Link href={`${PANEL}/periodos`}>Ver Liquidación</Link>
        </Button>
      </section>
    );
  }
  const foco = periodoEnFoco(periodos);
  const quincena = foco.tipo === 'periodo' ? foco.periodo.quincena : foco.quincena;
  return (
    <PasosDeLaTarea
      titulo={`La nómina de ${nombreDelPeriodo(mes, quincena)}`}
      pasos={pasosDelPeriodo(foco, sePuedeLiquidar)}
      data-testid="nomina-del-mes"
    />
  );
}

// ── 3. Las cifras, explicadas ───────────────────────────────────────────────

const DEFINICIONES = [
  {
    que: 'Costo total',
    es: 'Devengado + aportes del empleador + provisiones de prestaciones. Es lo que la nómina le cuesta a la inmobiliaria y va al P&G; NO es lo que se le gira a la gente.',
  },
  {
    que: 'Devengado',
    es: 'Todo lo que se les reconoció a las personas: sueldo, auxilio de transporte, horas extras, comisiones, incapacidades.',
  },
  {
    que: 'Aportes del empleador',
    es: 'Salud, pensión, ARL, caja de compensación, SENA e ICBF a cargo de la inmobiliaria. No se le descuentan a nadie.',
  },
  {
    que: 'Neto girado',
    es: 'Lo que efectivamente se les paga: devengado menos deducciones.',
  },
] as const;

// ── 4. Las pantallas, por cuándo se usan ────────────────────────────────────

const GRUPOS: { titulo: string; pantallas: { href: string; titulo: string; que: string; icono: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' }>; key: string }[] }[] = [
  {
    titulo: 'Cada período',
    pantallas: [
      { key: 'periodos', href: `${PANEL}/periodos`, titulo: 'Liquidación', que: 'El borrador, su aprobación, el asiento y el pago.', icono: Calculator },
      { key: 'personas', href: `${PANEL}/personas`, titulo: 'Personas', que: 'Empleados, asesores, contratistas y aprendices, con sus novedades.', icono: UsersThree },
      { key: 'provisiones', href: `${PANEL}/provisiones`, titulo: 'Prestaciones sociales', que: 'Prima, cesantías, intereses y vacaciones, mes a mes.', icono: PiggyBank },
      { key: 'electronica', href: `${PANEL}/electronica`, titulo: 'Nómina electrónica (DIAN)', que: 'Los documentos, su CUNE y lo que falta por transmitir.', icono: FileText },
    ],
  },
  {
    titulo: 'Configurar',
    pantallas: [
      { key: 'configuracion', href: `${PANEL}/configuracion`, titulo: 'Configuración del año', que: 'Salario mínimo, auxilio de transporte, UVT, horas extras y tarifas de aportes.', icono: GearSix },
      { key: 'conceptos', href: `${PANEL}/conceptos`, titulo: 'Conceptos y cuentas', que: 'Lo que se devenga y se deduce, y a qué cuenta del PUC va.', icono: BookOpen },
    ],
  },
];

function PantallasDeNomina() {
  return (
    <section className="space-y-3" aria-labelledby="pantallas-de-nomina">
      <h2 id="pantallas-de-nomina" className="text-sm font-semibold text-fg">
        Todas las pantallas de nómina
      </h2>
      <nav aria-label="Secciones de nómina" className="grid gap-x-5 gap-y-5 lg:grid-cols-2">
        {GRUPOS.map((g) => (
          <div key={g.titulo} className="min-w-0 space-y-2">
            <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-fg-subtle">
              {g.titulo}
            </h3>
            <ul className="divide-y divide-border-faint overflow-hidden rounded-lg border border-border bg-surface">
              {g.pantallas.map((d) => (
                <li key={d.href}>
                  <Link
                    href={d.href}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
                    data-testid={`puerta-${d.key}`}
                  >
                    <d.icono className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
                    <span className="min-w-0 space-y-0.5">
                      <span className="block text-sm font-medium text-fg">{d.titulo}</span>
                      <span className="block text-caption text-fg-muted">{d.que}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </section>
  );
}
