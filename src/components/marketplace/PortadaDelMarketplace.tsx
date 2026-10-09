'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, FileText, House, MagnifyingGlass, ShieldCheck, Sparkle, Wallet } from '@phosphor-icons/react';
import { Chip, Eyebrow, SegmentedControl } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { OrbeDeAgente } from '@/components/agentes/OrbeDeAgente';
import { PortadaDelInmueble, primeraFoto } from '@/components/property/PortadaDelInmueble';
import { useProperties } from '@/lib/hooks/useProperties';
import { formatCurrency } from '@/lib/format';
import { barrioYCiudad } from '@/lib/inmuebles/barrio-y-ciudad';
import { escribirBusqueda, type Busqueda, type Operacion } from '@/lib/marketplace/busqueda';
import {
  CIUDADES_DEL_FILTRO,
  busquedaDeLaSugerencia,
  sugerenciasDelCatalogo,
} from '@/lib/marketplace/sugerencias';

/**
 * ══ LA PORTADA DEL MARKETPLACE (Nico, 09-10-2026) ══════════════════════════
 *
 * Lo que se ve en «Buscar inmueble» antes de buscar. Elegida por Nico: «dos
 * puertas» —Buscar y Publicar— y adentro, «Con IA» o «Sin IA». Con IA se
 * escribe como se le habla a un asesor y se abre el momento de Ori
 * (`AperturaConIA`); sin IA, los campos de siempre. Las dos escriben la MISMA
 * búsqueda en la dirección (`src/lib/marketplace/busqueda.ts`).
 *
 * Todo lo que muestra es real: las fotos y los ejemplos salen del catálogo, y
 * lo que Leasefy hace por cada lado es lo que la plataforma ya hace. Publicar
 * es gratis por ahora.
 */

const RANGOS_HASTA = [
  { value: '', label: 'Cualquier valor' },
  { value: '1500000', label: 'Hasta $1,5 M' },
  { value: '2500000', label: 'Hasta $2,5 M' },
  { value: '4000000', label: 'Hasta $4 M' },
  { value: '6000000', label: 'Hasta $6 M' },
];
const RANGOS_HASTA_VENTA = [
  { value: '', label: 'Cualquier valor' },
  { value: '300000000', label: 'Hasta $300 M' },
  { value: '600000000', label: 'Hasta $600 M' },
  { value: '1000000000', label: 'Hasta $1.000 M' },
];

const LO_QUE_HACEMOS = [
  {
    icono: ShieldCheck,
    titulo: 'Sin depósito',
    texto: 'En arriendo de vivienda la ley no permite pedirlo, y aquí nadie te lo pide.',
  },
  {
    icono: MagnifyingGlass,
    titulo: 'Tu estudio, una sola vez',
    texto: 'Sabes hasta cuánto puedes arrendar y te sirve para postularte donde quieras.',
  },
  {
    icono: FileText,
    titulo: 'Contrato en línea',
    texto: 'Lo firmas desde el celular, con código a tu correo, sin ir a una oficina.',
  },
  {
    icono: Wallet,
    titulo: 'Pagos en línea',
    texto: 'Pagas el arriendo por PSE o tarjeta y te queda el comprobante.',
  },
];

const PARA_EL_PROPIETARIO = [
  'Te sugerimos el canon con el avalúo de Leasefy.',
  'Revisamos a los interesados antes de que los conozcas.',
  'Firman el contrato en línea y el pago llega por la plataforma.',
];


export function PortadaDelMarketplace() {
  const router = useRouter();
  const { properties, meta, isLoading } = useProperties({ limit: 100 });

  const [puerta, setPuerta] = useState<'buscar' | 'publicar'>('buscar');
  const [operacion, setOperacion] = useState<Operacion>('arriendo');
  const [modo, setModo] = useState<'ia' | 'campos'>('ia');
  const [texto, setTexto] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [barrio, setBarrio] = useState('');
  const [hasta, setHasta] = useState('');
  const [habitaciones, setHabitaciones] = useState('');

  const sugerencias = useMemo(() => sugerenciasDelCatalogo(properties, 6), [properties]);
  const conFoto = useMemo(() => properties.filter((p) => primeraFoto(p)).slice(0, 3), [properties]);
  const ejemplo = sugerencias[0]?.texto
    ? `${sugerencias[0].texto}, 2 habitaciones, que acepte mascotas`
    : 'Apartamento con balcón, 2 habitaciones, que acepte mascotas';

  const ir = (b: Busqueda, conIA = false) => {
    const qs = escribirBusqueda(b);
    router.push(`/propiedades?${qs}${conIA ? '&abrir=ia' : ''}`);
  };

  const buscarConIA = () => {
    const q = texto.trim();
    if (!q) return;
    ir({ q, operacion }, true);
  };

  const buscarConCampos = () => {
    ir({
      operacion,
      ...(ciudad ? { ciudad } : {}),
      ...(barrio.trim() ? { barrio: barrio.trim() } : {}),
      ...(hasta ? { hasta: Number(hasta) } : {}),
      ...(habitaciones ? { habitaciones: Number(habitaciones) } : {}),
    });
  };

  const campo =
    'w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-[15px] text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30';

  return (
    <div className="min-h-screen bg-background pt-16 lg:pt-[76px]">
      {/* ── Las dos puertas ── */}
      <section className="mx-auto grid max-w-[1280px] gap-8 px-4 py-8 md:px-6 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)] lg:items-center lg:py-14">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm md:p-8" data-testid="portada-del-marketplace">
          <SegmentedControl
            aria-label="¿Qué quieres hacer?"
            value={puerta}
            onChange={(v) => setPuerta(v)}
            options={[
              { value: 'buscar', label: 'Buscar inmueble' },
              { value: 'publicar', label: 'Publicar inmueble' },
            ]}
            fullWidth
          />

          {puerta === 'buscar' ? (
            <div className="mt-7">
              <h1 className="font-heading text-[32px] font-semibold leading-[1.08] tracking-[-0.03em] text-fg text-balance md:text-[42px]">
                Encuentra dónde vivir, contándolo como se lo contarías a alguien
              </h1>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <div role="tablist" aria-label="Arrendar o comprar" className="flex gap-5 border-b border-border">
                  {(['arriendo', 'venta'] as const).map((op) => (
                    <button
                      key={op}
                      type="button"
                      role="tab"
                      aria-selected={operacion === op}
                      onClick={() => {
                        setOperacion(op);
                        setHasta('');
                      }}
                      className={
                        operacion === op
                          ? '-mb-px border-b-2 border-primary pb-2 text-[15px] font-medium text-primary'
                          : '-mb-px border-b-2 border-transparent pb-2 text-[15px] text-fg-muted hover:text-fg'
                      }
                    >
                      {op === 'arriendo' ? 'Arrendar' : 'Comprar'}
                    </button>
                  ))}
                </div>
                <SegmentedControl
                  aria-label="Cómo buscar"
                  size="sm"
                  value={modo}
                  onChange={(v) => setModo(v)}
                  options={[
                    {
                      value: 'ia',
                      label: (
                        <span className="inline-flex items-center gap-1.5">
                          <Sparkle className="h-3.5 w-3.5" weight="fill" aria-hidden />
                          Con IA
                        </span>
                      ),
                      ariaLabel: 'Con IA',
                    },
                    { value: 'campos', label: 'Sin IA' },
                  ]}
                />
              </div>

              {modo === 'ia' ? (
                <form
                  className="mt-5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    buscarConIA();
                  }}
                >
                  <label htmlFor="busqueda-con-ia" className="text-[13px] font-medium text-fg">
                    ¿Qué estás buscando?
                  </label>
                  <textarea
                    id="busqueda-con-ia"
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        buscarConIA();
                      }
                    }}
                    rows={3}
                    placeholder={ejemplo}
                    className={`${campo} mt-2 resize-none leading-relaxed`}
                    data-testid="busqueda-con-ia"
                  />
                  <Button type="submit" className="mt-4 w-full gap-2" size="lg" hideArrow disabled={!texto.trim()}>
                    <Sparkle className="h-4 w-4" weight="fill" aria-hidden />
                    Buscar con IA
                  </Button>
                  <p className="mt-3 text-[12.5px] text-fg-subtle">
                    Ciudad, barrio, presupuesto, habitaciones, mascotas… Lo convertimos en filtros que puedes quitar.
                  </p>
                </form>
              ) : (
                <form
                  className="mt-5 grid grid-cols-2 gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    buscarConCampos();
                  }}
                >
                  <div className="col-span-2">
                    <label htmlFor="portada-ciudad" className="text-[13px] font-medium text-fg">Ciudad</label>
                    <select id="portada-ciudad" value={ciudad} onChange={(e) => setCiudad(e.target.value)} className={`${campo} mt-1.5`}>
                      <option value="">Todas</option>
                      {CIUDADES_DEL_FILTRO.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label htmlFor="portada-barrio" className="text-[13px] font-medium text-fg">Barrio</label>
                    <input
                      id="portada-barrio"
                      value={barrio}
                      onChange={(e) => setBarrio(e.target.value)}
                      placeholder="Ej.: Laureles, Chicó, El Poblado"
                      className={`${campo} mt-1.5`}
                    />
                  </div>
                  <div>
                    <label htmlFor="portada-hasta" className="text-[13px] font-medium text-fg">
                      {operacion === 'venta' ? 'Precio hasta' : 'Canon hasta'}
                    </label>
                    <select id="portada-hasta" value={hasta} onChange={(e) => setHasta(e.target.value)} className={`${campo} mt-1.5`}>
                      {(operacion === 'venta' ? RANGOS_HASTA_VENTA : RANGOS_HASTA).map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="portada-habitaciones" className="text-[13px] font-medium text-fg">Habitaciones</label>
                    <select
                      id="portada-habitaciones"
                      value={habitaciones}
                      onChange={(e) => setHabitaciones(e.target.value)}
                      className={`${campo} mt-1.5`}
                    >
                      <option value="">Cualquiera</option>
                      {['1', '2', '3', '4'].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit" className="col-span-2 mt-2 w-full" size="lg" hideArrow>
                    Buscar inmuebles
                  </Button>
                </form>
              )}

              {sugerencias.length > 0 && (
                <div className="mt-6">
                  <p className="text-[12.5px] text-fg-subtle">O empieza por lo que más hay:</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sugerencias.slice(0, 4).map((s) => (
                      <Chip key={s.texto} onClick={() => ir(busquedaDeLaSugerencia(s))} className="whitespace-nowrap">
                        {s.texto}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-7" data-testid="portada-publicar">
              <Eyebrow accent>Gratis por ahora</Eyebrow>
              <h1 className="mt-3 font-heading text-[32px] font-semibold leading-[1.08] tracking-[-0.03em] text-fg text-balance md:text-[42px]">
                Publica tu inmueble y arriéndalo con todo resuelto
              </h1>
              <ul className="mt-6 space-y-3">
                {PARA_EL_PROPIETARIO.map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-[15px] text-fg-muted">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <Button asChild size="lg" className="mt-7 w-full gap-2" hideArrow>
                <Link href="/publicar">
                  <House className="h-4 w-4" aria-hidden />
                  Publicar mi inmueble
                </Link>
              </Button>
              <p className="mt-4 text-[13px] text-fg-muted">
                ¿Eres una inmobiliaria?{' '}
                <Link href="/" className="font-medium text-primary hover:underline">
                  Conoce Leasefy para inmobiliarias
                </Link>
              </p>
            </div>
          )}
        </div>

        {/* Lo que hay: fotos reales del catálogo, cada una lleva a su ficha. */}
        <div className="hidden lg:block" aria-label="Algunos inmuebles disponibles">
          {conFoto.length > 0 ? (
            <div className="grid grid-cols-2 grid-rows-2 gap-3 [height:520px]">
              {conFoto.map((p, i) => (
                <Link
                  key={p.id}
                  href={`/propiedades/${p.id}`}
                  className={`group relative overflow-hidden rounded-2xl ${i === 0 ? 'row-span-2' : ''}`}
                >
                  <PortadaDelInmueble
                    property={p}
                    alt={p.title}
                    sizes="(min-width: 1024px) 30vw, 100vw"
                    className="object-cover transition-transform duration-reveal ease-enter group-hover:scale-[1.03]"
                  />
                  <span className="absolute inset-x-3 bottom-3 rounded-xl bg-black/45 px-3 py-2 text-white backdrop-blur-md">
                    <span className="block truncate text-[13px]">{barrioYCiudad(p.neighborhood, p.city)}</span>
                    <span className="block font-mono text-[14px] font-semibold tabular-nums">
                      {p.listingType === 'sale'
                        ? p.salePrice != null ? formatCurrency(p.salePrice) : 'Precio por confirmar'
                        : p.monthlyRent != null ? `${formatCurrency(p.monthlyRent)} al mes` : 'Canon por confirmar'}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex h-[520px] flex-col items-start justify-end rounded-2xl border border-border bg-surface-muted p-8">
              <OrbeDeAgente agente="orquestador" tamano={72} decorativo />
              <p className="mt-5 max-w-[34ch] font-heading text-[22px] leading-snug text-fg">
                Cuéntale a Ori qué buscas y te muestra lo que cumple.
              </p>
            </div>
          )}
          {!isLoading && meta?.total ? (
            <p className="mt-3 text-[13px] text-fg-muted">
              <span className="font-mono tabular-nums text-fg">{meta.total}</span> inmuebles disponibles hoy
            </p>
          ) : null}
        </div>
      </section>

      {/* ── Lo que Leasefy hace por ti ── */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-[1280px] px-4 py-12 md:px-6">
          <Eyebrow accent>Arrendar con Leasefy</Eyebrow>
          <h2 className="mt-3 max-w-[28ch] font-heading text-[26px] font-semibold leading-tight tracking-[-0.02em] text-fg">
            Del primer mensaje a la entrega de las llaves, en un solo lugar
          </h2>
          <div className="mt-8 grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr))]">
            {LO_QUE_HACEMOS.map(({ icono: Icono, titulo, texto: t }) => (
              <div key={titulo}>
                <Icono className="h-5 w-5 text-primary" aria-hidden />
                <p className="mt-3 text-[15px] font-medium text-fg">{titulo}</p>
                <p className="mt-1 text-[14px] leading-relaxed text-fg-muted">{t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Para quien tiene un inmueble ── */}
      <section className="mx-auto max-w-[1280px] px-4 py-12 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-border bg-surface p-6 md:p-8">
          <div className="max-w-[52ch]">
            <p className="font-heading text-[22px] font-semibold tracking-[-0.02em] text-fg">¿Tienes un inmueble para arrendar o vender?</p>
            <p className="mt-2 text-[15px] text-fg-muted">
              Publícalo gratis. Te ayudamos con el precio, revisamos a los interesados y el contrato se firma en línea.
            </p>
          </div>
          <Button asChild size="lg" className="gap-2" hideArrow>
            <Link href="/publicar">
              Publicar gratis
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
