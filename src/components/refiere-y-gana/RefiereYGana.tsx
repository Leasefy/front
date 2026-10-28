'use client';

/**
 * «Refiere y gana» (Nico, 28-10-2026: «eso de refiere y gana está bueno»). Lo que decidió:
 *   · Refieren los clientes que pagan; se refiere a un COLEGA con cuenta nueva (inmobiliaria, agente o propietario que
 *     arrienda solo). Tus propios propietarios e inquilinos no cuentan («eso es lo que tiene en su base de datos»).
 *   · El colega entra con su primer mes gratis; cuando paga su primer mes, quien lo refirió gana un mes gratis.
 *   · Hasta 3 meses por año. Se invita con el enlace (también por WhatsApp) o con el código. El enlace cuenta 30 días.
 *   · Vive en el menú de la cuenta y en una tarjeta de «Tu plan».
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Copy, Gift, ShieldCheck, WhatsappLogo } from '@phosphor-icons/react';
import { Alert, Ilustracion, Pagination, SearchInput, StatusBadge, enterTransition, usePrefersReducedMotion } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { ApiError } from '@/lib/api/client';
import { refiereYGanaApi, type ColegaReferido, type MiRefiereYGana } from '@/lib/api/refiere-y-gana.service';
import {
  NOMBRE_DEL_TIPO,
  enlaceDeWhatsAppParaCompartir,
  enlaceDelCodigo,
  estadoDelColega,
} from '@/lib/refiere-y-gana/refiere-y-gana';
import { cn } from '@/lib/utils';

const POR_PAGINA = 10;
type Filtro = 'todos' | 'mes-gratis' | 'pagaron';

const fecha = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Bogota' });

function origenDelFront(): string {
  return typeof window !== 'undefined' ? window.location.origin : 'https://leasefy.co';
}

/** ¿Es el 503 de «falta la migración»? Entonces el programa todavía no está activo en esta base. */
function faltaLaMigracion(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'FALTA_UNA_MIGRACION';
}

export function RefiereYGana({ rutaDelPlan }: { rutaDelPlan: string }) {
  const [datos, setDatos] = useState<MiRefiereYGana | null>(null);
  const [error, setError] = useState<unknown>(null);

  const leer = useCallback(async () => {
    setError(null);
    try {
      setDatos(await refiereYGanaApi.mio());
    } catch (e) {
      setError(e);
    }
  }, []);
  useEffect(() => {
    void leer();
  }, [leer]);

  const inactivo = Boolean(error) && faltaLaMigracion(error);

  return (
    <div className="space-y-6 p-6 lg:p-8" data-testid="refiere-y-gana">
      <EncabezadoDePantalla
        seccion="Tu cuenta"
        titulo="Refiere y gana"
        descripcion={`Pásale tu enlace a un colega: entra con su primer mes gratis y, cuando pague su primer mes, tú no pagas el siguiente. Hasta ${datos?.tope ?? 3} meses gratis al año.`}
      />
      {error && !inactivo ? <FalloDeCarga error={error} onReintentar={leer} queEs="Refiere y gana" /> : null}
      {inactivo ? <Alert variant="warning">Refiere y gana todavía no está activo en esta base de Leasefy.</Alert> : null}

      {!datos && !error ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]" aria-busy="true">
          <div className="h-64 animate-pulse rounded-3xl bg-surface-muted" />
          <div className="h-64 animate-pulse rounded-3xl bg-surface-muted" />
        </div>
      ) : null}

      {datos ? (
        datos.puedeReferir && datos.codigo ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
            <TuEnlace codigo={datos.codigo} diasGratis={datos.diasGratisDelReferido} />
            <TusMeses ganados={datos.ganadosEsteAnio} tope={datos.tope} porUsar={datos.porUsar} anio={datos.anio} />
          </div>
        ) : (
          <SinPlanTodavia rutaDelPlan={rutaDelPlan} tope={datos.tope} />
        )
      ) : null}

      {datos || inactivo ? <ComoFunciona tope={datos?.tope ?? 3} /> : null}

      {datos ? <TusColegas colegas={datos.referidos} puedeReferir={datos.puedeReferir} /> : null}

      {datos || inactivo ? (
        <p className="flex items-start gap-2 text-caption text-fg-subtle" data-testid="letra-menuda">
          <ShieldCheck size={16} weight="duotone" className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
          Cuentan las inmobiliarias, los agentes y los propietarios que arriendan solos que abren su cuenta con tu enlace
          o tu código (hasta {datos?.diasDelEnlace ?? 30} días después de abrirlo). No cuentan tus propios propietarios ni
          inquilinos, ni una cuenta que ya pagaba Leasefy. El mes ganado se descuenta de tu próximo cobro.
        </p>
      ) : null}
    </div>
  );
}

/** El enlace, para copiar o mandar por WhatsApp, y el código para dictarlo. */
function TuEnlace({ codigo, diasGratis }: { codigo: string; diasGratis: number }) {
  const reducido = usePrefersReducedMotion();
  const enlace = enlaceDelCodigo(origenDelFront(), codigo);
  const copiar = async (texto: string, que: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success(`Copiamos ${que}`, { description: texto });
    } catch {
      toast.error(`No pudimos copiar ${que}. Selecciónalo y cópialo a mano.`);
    }
  };
  return (
    <motion.section
      initial={reducido ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={enterTransition(reducido)}
      className="relative overflow-hidden rounded-3xl border border-primary/25 bg-surface p-6 sm:p-8"
      data-testid="tu-enlace"
    >
      <Ilustracion nombre="megafono" tamano={104} tono="auto" alt="" className="pointer-events-none absolute right-5 top-5 hidden sm:block" />
      <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-primary">
        <Gift size={14} weight="bold" aria-hidden="true" />
        Tu enlace
      </p>
      <h2 className="mt-3 max-w-[26ch] text-[22px] font-medium leading-tight tracking-[-0.02em] text-fg sm:pr-28">
        Tu colega entra con {diasGratis === 30 ? 'su primer mes' : `${diasGratis} días`} de Leasefy completo gratis
      </h2>
      <div className="mt-6 flex min-w-0 items-center gap-2 rounded-2xl border border-border bg-surface-muted/60 py-2 pl-4 pr-2">
        <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-fg" data-testid="el-enlace" title={enlace}>
          {enlace}
        </span>
        <Button size="sm" variant="secondary" hideArrow onClick={() => void copiar(enlace, 'tu enlace')} data-testid="copiar-enlace">
          <Copy size={16} aria-hidden="true" />
          Copiar
        </Button>
      </div>
      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <Button asChild className="h-11 rounded-full px-6">
          <a href={enlaceDeWhatsAppParaCompartir(enlace, diasGratis)} target="_blank" rel="noreferrer noopener" data-testid="mandar-por-whatsapp">
            <WhatsappLogo size={18} weight="fill" aria-hidden="true" />
            Mandar por WhatsApp
          </a>
        </Button>
        <p className="text-body-sm text-fg-muted">
          O dile tu código:{' '}
          <button
            type="button"
            onClick={() => void copiar(codigo, 'tu código')}
            className="rounded-md bg-primary-soft px-2 py-0.5 font-mono text-[13px] font-medium uppercase tracking-wide text-primary transition-colors duration-base hover:bg-primary/15"
            data-testid="el-codigo"
            aria-label={`Copiar tu código ${codigo}`}
          >
            {codigo}
          </button>
        </p>
      </div>
    </motion.section>
  );
}

/** Los meses ganados este año, de 3. */
function TusMeses({ ganados, tope, porUsar, anio }: { ganados: number; tope: number; porUsar: number; anio: number }) {
  const reducido = usePrefersReducedMotion();
  const lleno = ganados >= tope;
  return (
    <section className="flex flex-col rounded-3xl border border-border bg-surface p-6 sm:p-8" data-testid="tus-meses">
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-muted">Tus meses gratis · {anio}</p>
      <div className="mt-5 flex items-end gap-3" aria-hidden="true">
        {Array.from({ length: tope }, (_, i) => {
          const ganado = i < ganados;
          return (
            <motion.span
              key={i}
              initial={reducido ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...enterTransition(reducido), delay: reducido ? 0 : 0.1 + i * 0.08 }}
              className={cn(
                'flex size-16 items-center justify-center rounded-2xl border sm:size-[72px]',
                ganado ? 'border-primary/30 bg-primary-soft' : 'border-dashed border-border bg-surface-muted/50',
              )}
            >
              <Ilustracion nombre="novedad_regalo" tamano={ganado ? 56 : 40} tono="auto" alt="" className={ganado ? '' : 'opacity-30 grayscale'} />
            </motion.span>
          );
        })}
      </div>
      <p className="mt-5 text-[18px] font-medium text-fg" data-testid="ganados-este-anio">
        {ganados === 0 ? 'Todavía no has ganado meses este año' : `Llevas ${ganados} de ${tope} este año`}
      </p>
      <p className="mt-1 text-body-sm text-fg-muted">
        {porUsar > 0
          ? `${porUsar === 1 ? 'Un mes' : `${porUsar} meses`} por usar: ${porUsar === 1 ? 'tu próximo cobro no lo pagas' : 'tus próximos cobros no los pagas'}.`
          : lleno
            ? 'Ya ganaste los de este año. Los colegas que refieras desde enero vuelven a sumar.'
            : 'Cada colega que pague su primer mes te gana uno.'}
      </p>
    </section>
  );
}

/** Quien todavía no paga: el programa con la invitación a activar su plan. */
function SinPlanTodavia({ rutaDelPlan, tope }: { rutaDelPlan: string; tope: number }) {
  return (
    <section className="flex flex-col items-center gap-5 rounded-3xl border border-border bg-surface px-6 py-10 text-center sm:flex-row sm:text-left" data-testid="sin-plan-todavia">
      <Ilustracion nombre="plan_insignia" tamano={112} tono="auto" alt="" />
      <div className="max-w-xl">
        <h2 className="text-[20px] font-medium text-fg">Tu enlace llega con Leasefy completo</h2>
        <p className="mt-1 text-body-sm text-fg-muted">
          Refiere y gana es para las cuentas que pagan su plan. Cuando lo actives, tienes tu enlace y ganas un mes gratis
          por cada colega que pague su primer mes, hasta {tope} al año.
        </p>
        <Button asChild className="mt-5" hideArrow>
          <Link href={rutaDelPlan}>Ver mi plan</Link>
        </Button>
      </div>
    </section>
  );
}

/** Los tres pasos, cada uno con su 3D. */
function ComoFunciona({ tope }: { tope: number }) {
  const reducido = usePrefersReducedMotion();
  const pasos = [
    { ilustracion: 'mensajes' as const, titulo: 'Le pasas tu enlace', texto: 'Por WhatsApp, por correo o le dices tu código. Sirve para inmobiliarias, agentes y propietarios.' },
    { ilustracion: 'novedad_regalo' as const, titulo: 'Entra con su mes gratis', texto: 'Abre su cuenta y tiene todo Leasefy un mes, sin tarjeta. Te avisamos cuando entre.' },
    { ilustracion: 'pago_confirmado' as const, titulo: 'Paga y tú ganas un mes', texto: `Cuando pague su primer mes, tu próximo cobro no lo pagas. Hasta ${tope} meses al año.` },
  ];
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-surface" data-testid="como-funciona-refiere">
      <div className="grid gap-px bg-border md:grid-cols-3">
        {pasos.map((p, i) => (
          <motion.div
            key={p.titulo}
            className="flex flex-col items-center bg-surface px-6 py-8 text-center"
            initial={reducido ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...enterTransition(reducido), delay: reducido ? 0 : i * 0.08 }}
          >
            <Ilustracion nombre={p.ilustracion} tamano={96} tono="auto" alt="" />
            <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-primary">Paso {i + 1}</p>
            <p className="mt-1 text-body font-medium text-fg">{p.titulo}</p>
            <p className="mt-1 max-w-[30ch] text-body-sm text-fg-muted">{p.texto}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/** Los colegas que entraron con tu enlace: buscador, filtro y paginación. */
function TusColegas({ colegas, puedeReferir }: { colegas: ColegaReferido[]; puedeReferir: boolean }) {
  const [buscar, setBuscar] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [pagina, setPagina] = useState(1);
  const visibles = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return colegas.filter(
      (c) =>
        (filtro === 'todos' || (filtro === 'mes-gratis' ? c.estado === 'registrado' : c.estado === 'pago')) &&
        (!q || c.nombre.toLowerCase().includes(q)),
    );
  }, [colegas, buscar, filtro]);
  useEffect(() => setPagina(1), [buscar, filtro]);
  const deEstaPagina = visibles.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const enSuMes = colegas.filter((c) => c.estado === 'registrado').length;
  const pagaron = colegas.length - enSuMes;

  return (
    <section className="space-y-4" data-testid="tus-colegas">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-h3 text-fg">
          Tus colegas {colegas.length > 0 ? <span className="font-mono text-body-sm text-fg-muted">· {colegas.length}</span> : null}
        </h2>
        {colegas.length > 0 ? (
          <SearchInput
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            onClear={() => setBuscar('')}
            placeholder="Buscar por nombre"
            aria-label="Buscar colegas"
            className="md:w-72"
          />
        ) : null}
      </div>

      {colegas.length > 0 ? (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar colegas">
          {(
            [
              ['todos', 'Todos', colegas.length],
              ['mes-gratis', 'En su mes gratis', enSuMes],
              ['pagaron', 'Pagaron', pagaron],
            ] as const
          ).map(([valor, texto, n]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setFiltro(valor)}
              aria-pressed={filtro === valor}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-caption transition-colors duration-base',
                filtro === valor ? 'border-primary bg-primary-soft font-medium text-primary' : 'border-border text-fg-muted hover:bg-surface-muted',
              )}
            >
              {texto}
              <span className="font-mono text-[11px] opacity-70">{n}</span>
            </button>
          ))}
        </div>
      ) : null}

      {colegas.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-border bg-surface px-6 py-12 text-center" data-testid="sin-colegas">
          <Ilustracion nombre="buzon" tamano={104} tono="auto" alt="" />
          <p className="mt-4 text-body font-medium text-fg">Todavía no ha entrado nadie con tu enlace</p>
          <p className="mt-1 max-w-sm text-body-sm text-fg-muted">
            {puedeReferir
              ? 'Cuando un colega abra su cuenta con tu enlace o tu código, aparece aquí y te avisamos.'
              : 'Cuando actives tu plan y compartas tu enlace, aquí ves a cada colega que entre.'}
          </p>
        </div>
      ) : visibles.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-border bg-surface px-6 py-10 text-center">
          <Ilustracion nombre="lupa" tamano={88} tono="auto" alt="" />
          <p className="mt-3 text-body font-medium text-fg">Ningún colega coincide</p>
          <p className="mt-1 text-body-sm text-fg-muted">Prueba con otro nombre o cambia el filtro.</p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface" data-testid="lista-de-colegas">
            {deEstaPagina.map((c) => {
              const e = estadoDelColega(c);
              return (
                <li key={c.id} className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-body-sm font-medium text-fg">
                      {c.nombre.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-body-sm font-medium text-fg">{c.nombre}</p>
                      <p className="truncate text-caption text-fg-muted">
                        {NOMBRE_DEL_TIPO[c.tipo]} · entró el {fecha.format(new Date(c.registradoEn))}
                        {c.pagoEn ? ` · pagó el ${fecha.format(new Date(c.pagoEn))}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pl-12 sm:pl-0">
                    <p className="hidden max-w-[28ch] text-right text-caption text-fg-subtle lg:block">{e.detalle}</p>
                    <StatusBadge tone={e.tono}>{e.etiqueta}</StatusBadge>
                  </div>
                </li>
              );
            })}
          </ul>
          {visibles.length > POR_PAGINA ? <Pagination total={visibles.length} page={pagina} pageSize={POR_PAGINA} onPageChange={setPagina} /> : null}
        </>
      )}
    </section>
  );
}

/**
 * La tarjeta de «Tu plan»: el programa en una línea y lo que llevas. Si no se puede leer (sin la migración, un back
 * anterior), no se pinta: Tu plan sigue como antes.
 */
export function TarjetaDeRefiereYGana({ ruta }: { ruta: string }) {
  const [datos, setDatos] = useState<MiRefiereYGana | null>(null);
  useEffect(() => {
    let vivo = true;
    refiereYGanaApi
      .mio()
      .then((d) => vivo && setDatos(d))
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);
  if (!datos) return null;
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6 sm:flex-row sm:items-center sm:p-8" data-testid="tarjeta-refiere-y-gana">
      <Ilustracion nombre="novedad_regalo" tamano={80} tono="auto" alt="" />
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-primary">Refiere y gana</p>
        <h2 className="mt-1 text-[18px] font-medium text-fg">Gana hasta {datos.tope} meses gratis al año</h2>
        <p className="mt-1 text-body-sm text-fg-muted">
          {datos.puedeReferir
            ? datos.ganadosEsteAnio > 0
              ? `Llevas ${datos.ganadosEsteAnio} de ${datos.tope} este año${datos.porUsar > 0 ? ` y ${datos.porUsar === 1 ? 'un mes' : `${datos.porUsar} meses`} por usar` : ''}.`
              : 'Pásale tu enlace a un colega: entra con su primer mes gratis y, cuando pague, tú no pagas el siguiente.'
            : 'Con tu plan activo, cada colega que traigas y pague su primer mes te gana un mes gratis.'}
        </p>
      </div>
      <Button asChild variant="secondary" className="shrink-0 rounded-full">
        <Link href={ruta} data-testid="ir-a-refiere-y-gana">
          {datos.puedeReferir ? 'Ver mi enlace' : 'Cómo funciona'}
        </Link>
      </Button>
    </section>
  );
}
