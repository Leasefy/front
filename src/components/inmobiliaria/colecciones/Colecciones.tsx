'use client';

/**
 * Colecciones para el cliente, en Arrendamientos (28-10-2026). El agente elige inmuebles de su portafolio, le pone el
 * nombre del cliente y le manda UN enlace; aquí ve cuándo la abrió, cuántas veces y qué marcó o comentó.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Heart, ThumbsDown, WhatsappLogo } from '@phosphor-icons/react';
import { Alert, CopyButton, Ilustracion, SearchInput, StatusBadge } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { coleccionesApi, enlaceLocalDeLaColeccion, type InmuebleDeLaColeccion, type ResumenDeColeccion } from '@/lib/api/colecciones.service';
import { comisionesCompartidasApi } from '@/lib/api/comisiones-compartidas.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { useConsignaciones, useInmueblesSinConsignacion } from '@/lib/hooks/useInmobiliaria';
import { celularParaMarcar } from '@/lib/tu-dia/tu-dia';
import { cn } from '@/lib/utils';

const fechaCorta = (iso: string) => new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota' }).format(new Date(iso));
const sinTildes = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

interface Elegible {
  id: string;
  titulo: string;
  donde: string;
  canon: number | null;
  /** Otra inmobiliaria te lo compartió (comisión compartida aceptada): también lo muestras. */
  compartidoPor?: string;
  /** Publicado y libre: lo que el cliente puede arrendar. Lo demás le sale «Ya no está disponible». */
  disponible: boolean;
}

export function Colecciones() {
  const [datos, setDatos] = useState<{ disponible: boolean; colecciones: ResumenDeColeccion[] } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [nueva, setNueva] = useState(false);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [inicial, setInicial] = useState<string[]>([]);

  // «Mandar en una colección» desde la comisión compartida: llega con ?nueva=1&inmueble=<id>.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('nueva') !== '1') return;
    const inmueble = p.get('inmueble');
    setInicial(inmueble ? [inmueble] : []);
    setNueva(true);
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  const leer = useCallback(async () => {
    setError(null);
    try {
      setDatos(await coleccionesApi.listar());
    } catch (e) {
      setError(e);
    }
  }, []);
  useEffect(() => {
    void leer();
  }, [leer]);

  return (
    <div className="space-y-6 p-6 lg:p-8" data-testid="colecciones">
      <EncabezadoDePantalla
        seccion="Arrendamientos"
        titulo="Colecciones"
        descripcion="Mándale a tu cliente un solo enlace con los inmuebles que le propones; él marca los que le gustan."
        accionPrincipal={
          datos?.disponible ? (
            <Button size="sm" hideArrow onClick={() => setNueva(true)} data-testid="nueva-coleccion">
              Nueva colección
            </Button>
          ) : undefined
        }
      />
      {error ? <FalloDeCarga error={error} onReintentar={leer} queEs="tus colecciones" /> : null}
      {datos && !datos.disponible ? <Alert variant="warning">Las colecciones todavía no están activas en esta base de Leasefy.</Alert> : null}
      {datos?.disponible && datos.colecciones.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-border bg-surface px-6 py-12 text-center" data-testid="colecciones-vacio">
          <Ilustracion nombre="carpeta" tamano={112} tono="auto" alt="" />
          <p className="mt-4 text-body font-medium text-fg">Todavía no le has mandado una colección a nadie</p>
          <p className="mt-1 max-w-sm text-body-sm text-fg-muted">Elige unos inmuebles para un cliente y mándale el enlace por WhatsApp. Lo abre sin crear cuenta.</p>
          <Button className="mt-5" hideArrow onClick={() => setNueva(true)}>
            Armar la primera
          </Button>
        </div>
      ) : null}
      {datos?.disponible && datos.colecciones.length > 0 ? (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {datos.colecciones.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => setAbierta(c.id)} className="w-full rounded-2xl border border-border bg-surface p-4 text-left transition-shadow duration-base hover:shadow-md" data-testid={`coleccion-${c.id}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium text-fg">{c.paraQuien}</p>
                  {c.abiertaEn ? <StatusBadge tone="success">Abierta</StatusBadge> : <StatusBadge tone="neutral">Sin abrir</StatusBadge>}
                </div>
                <p className="mt-1 text-caption text-fg-subtle">
                  {c.inmuebles === 1 ? '1 inmueble' : `${c.inmuebles} inmuebles`} · {fechaCorta(c.creadaEn)}
                </p>
                <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-fg-muted">
                  <span>{c.vistas === 1 ? '1 vista' : `${c.vistas} vistas`}</span>
                  <span className="inline-flex items-center gap-1 text-primary">
                    <Heart size={14} weight="fill" aria-hidden="true" /> {c.meGusta}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ThumbsDown size={14} aria-hidden="true" /> {c.no}
                  </span>
                  {c.comentarios > 0 ? <span>{c.comentarios === 1 ? '1 comentario' : `${c.comentarios} comentarios`}</span> : null}
                </p>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <NuevaColeccion abierta={nueva} inicial={inicial} alCerrar={() => { setNueva(false); setInicial([]); }} alCrear={leer} />
      <DetalleDeLaColeccion id={abierta} alCerrar={() => setAbierta(null)} alArchivar={leer} />
    </div>
  );
}

function NuevaColeccion({ abierta, inicial = [], alCerrar, alCrear }: { abierta: boolean; inicial?: string[]; alCerrar: () => void; alCrear: () => void }) {
  const { consignaciones } = useConsignaciones(undefined, { skip: !abierta });
  const { inmuebles: sinMandato } = useInmueblesSinConsignacion();
  const [paraQuien, setParaQuien] = useState('');
  const [celular, setCelular] = useState('');
  const [nota, setNota] = useState('');
  const [buscar, setBuscar] = useState('');
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const [creada, setCreada] = useState<{ token: string } | null>(null);
  const [compartidos, setCompartidos] = useState<Elegible[]>([]);

  // Los que otra inmobiliaria le compartió con la comisión aceptada (sin la migración, ninguno).
  useEffect(() => {
    if (!abierta) return;
    let vivo = true;
    comisionesCompartidasApi
      .listar()
      .then((r) => {
        if (!vivo) return;
        setCompartidos(
          r.comisiones
            .filter((c) => c.lado === 'trae' && c.estado === 'aceptada')
            .map((c) => ({ id: c.inmueble.id, titulo: c.inmueble.titulo, donde: [c.inmueble.barrio, c.inmueble.ciudad].filter(Boolean).join(', '), canon: c.inmueble.canon, compartidoPor: c.otra.nombre, disponible: c.inmueble.disponible })),
        );
      })
      .catch(() => vivo && setCompartidos([]));
    return () => {
      vivo = false;
    };
  }, [abierta]);
  useEffect(() => {
    if (abierta && inicial.length > 0) setElegidos((l) => (l.length === 0 ? inicial.slice(0, 30) : l));
  }, [abierta, inicial]);

  const todos: Elegible[] = useMemo(() => {
    const vistos = new Set<string>();
    const lista: Elegible[] = [];
    for (const c of consignaciones) {
      if (!c.propertyId || vistos.has(c.propertyId)) continue;
      vistos.add(c.propertyId);
      lista.push({ id: c.propertyId, titulo: c.propertyTitle, donde: [c.propertyAddress !== c.propertyTitle ? c.propertyAddress : null, c.propertyCity].filter(Boolean).join(', '), canon: c.monthlyRent ?? null, disponible: !c.arrendado && (c.propertyStatus == null || c.propertyStatus === 'AVAILABLE') });
    }
    for (const i of sinMandato) {
      if (vistos.has(i.propertyId)) continue;
      vistos.add(i.propertyId);
      lista.push({ id: i.propertyId, titulo: i.propertyTitle, donde: [i.propertyZone, i.propertyCity].filter(Boolean).join(', '), canon: i.monthlyRent, disponible: i.status === 'available' });
    }
    for (const c of compartidos) {
      if (vistos.has(c.id)) continue;
      vistos.add(c.id);
      lista.push(c);
    }
    // Lo que llegó elegido (desde la comisión compartida) va arriba; después lo disponible.
    return lista.sort((a, b) => Number(inicial.includes(b.id)) - Number(inicial.includes(a.id)) || Number(b.disponible) - Number(a.disponible));
  }, [consignaciones, sinMandato, compartidos, inicial]);
  const visibles = useMemo(() => {
    const q = sinTildes(buscar.trim());
    return q ? todos.filter((i) => sinTildes(`${i.titulo} ${i.donde}`).includes(q)) : todos;
  }, [todos, buscar]);

  const cerrar = () => {
    setParaQuien('');
    setCelular('');
    setNota('');
    setElegidos([]);
    setFallo(null);
    setCreada(null);
    alCerrar();
  };
  const crear = async () => {
    if (paraQuien.trim().length < 2) return setFallo('Escribe para quién es.');
    if (elegidos.length === 0) return setFallo('Elige al menos un inmueble.');
    setGuardando(true);
    setFallo(null);
    try {
      const r = await coleccionesApi.crear({ paraQuien: paraQuien.trim(), ...(celular.trim() ? { celular: celular.trim() } : {}), ...(nota.trim() ? { nota: nota.trim() } : {}), inmuebles: elegidos });
      setCreada({ token: r.token });
      alCrear();
    } catch (e) {
      setFallo(mensajeParaLaPersona(e, { accion: 'armar la colección', porDefecto: 'No pudimos armar la colección.' }));
    } finally {
      setGuardando(false);
    }
  };
  const enlace = creada ? enlaceLocalDeLaColeccion(creada.token) : '';
  const cel = celularParaMarcar(celular);
  const mensaje = `Hola ${paraQuien.trim().split(/\s+/)[0]}, te armé una selección de inmuebles. Marca los que te gusten: ${enlace}`;

  return (
    <Cajon abierto={abierta} onOpenChange={(a) => (a ? null : cerrar())}>
      <CajonCabecera titulo={creada ? 'Lista para mandar' : 'Nueva colección'} descripcion={creada ? 'Tu cliente la abre sin crear cuenta.' : 'Elige los inmuebles que le propones a tu cliente.'} />
      <CajonCuerpo>
        {creada ? (
          <div className="flex flex-col items-center py-4 text-center" data-testid="coleccion-creada">
            <Ilustracion nombre="correo_enviado" tamano={104} tono="auto" alt="" />
            <p className="mt-3 break-all rounded-xl bg-surface-muted px-3 py-2 font-mono text-caption text-fg">{enlace}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <CopyButton text={enlace} label="Copiar el enlace" copiedLabel="Copiado" />
              <Button asChild hideArrow>
                <a href={cel ? `https://wa.me/${cel}?text=${encodeURIComponent(mensaje)}` : `https://wa.me/?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noreferrer noopener">
                  <WhatsappLogo size={18} weight="fill" aria-hidden="true" className="mr-1.5" />
                  Mandar por WhatsApp
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="coleccion-para" className="text-body-sm font-medium text-fg">Para quién</label>
                <Input id="coleccion-para" value={paraQuien} onChange={(e) => setParaQuien(e.target.value)} placeholder="Camila Restrepo" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="coleccion-celular" className="text-body-sm font-medium text-fg">Su celular (opcional)</label>
                <Input id="coleccion-celular" inputMode="tel" value={celular} onChange={(e) => setCelular(e.target.value)} placeholder="300 123 4567" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="coleccion-nota" className="text-body-sm font-medium text-fg">Una nota para tu cliente (opcional)</label>
              <Input id="coleccion-nota" value={nota} maxLength={500} onChange={(e) => setNota(e.target.value)} placeholder="Te escogí los que quedan cerca de tu trabajo" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-body-sm font-medium text-fg">Inmuebles</p>
                <p className="text-caption text-fg-subtle">{elegidos.length} elegidos · hasta 30</p>
              </div>
              <SearchInput value={buscar} onChange={(e) => setBuscar(e.target.value)} onClear={() => setBuscar('')} placeholder="Buscar por título o barrio" aria-label="Buscar inmuebles" />
              <ul className="max-h-[22rem] space-y-1.5 overflow-y-auto pr-1" data-lenis-prevent>
                {visibles.map((i) => {
                  const marcado = elegidos.includes(i.id);
                  return (
                    <li key={i.id}>
                      <label className={cn('flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5', marcado ? 'border-primary bg-primary-soft/50' : 'border-border hover:bg-surface-muted')}>
                        <Checkbox
                          checked={marcado}
                          onCheckedChange={(v) => setElegidos((l) => (v ? (l.length < 30 ? [...l, i.id] : l) : l.filter((x) => x !== i.id)))}
                          aria-label={i.titulo}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-body-sm font-medium text-fg">{i.titulo}</span>
                          <span className="block truncate text-caption text-fg-subtle">
                            {i.compartidoPor ? <span className="font-medium text-primary">Compartido por {i.compartidoPor} · </span> : null}
                            {!i.disponible ? <span className="font-medium text-warning-ink">No disponible · </span> : null}
                            {i.donde}
                          </span>
                        </span>
                        {i.canon ? <span className="shrink-0 font-mono text-caption text-fg-muted">${i.canon.toLocaleString('es-CO')}</span> : null}
                      </label>
                    </li>
                  );
                })}
                {visibles.length === 0 ? <li className="py-6 text-center text-body-sm text-fg-muted">{todos.length === 0 ? 'Todavía no tienes inmuebles publicados.' : 'Ninguno coincide.'}</li> : null}
              </ul>
            </div>
            {fallo ? <Alert variant="danger">{fallo}</Alert> : null}
          </div>
        )}
      </CajonCuerpo>
      <CajonPie>
        {creada ? (
          <Button hideArrow variant="outline" onClick={cerrar}>
            Listo
          </Button>
        ) : (
          <>
            <Button variant="outline" hideArrow onClick={cerrar}>
              Cancelar
            </Button>
            <Button hideArrow isLoading={guardando} onClick={() => void crear()} data-testid="crear-coleccion">
              Armar la colección
            </Button>
          </>
        )}
      </CajonPie>
    </Cajon>
  );
}

function DetalleDeLaColeccion({ id, alCerrar, alArchivar }: { id: string | null; alCerrar: () => void; alArchivar: () => void }) {
  const [detalle, setDetalle] = useState<(ResumenDeColeccion & { inmuebles: InmuebleDeLaColeccion[] }) | null>(null);
  useEffect(() => {
    if (!id) return setDetalle(null);
    let vivo = true;
    coleccionesApi
      .ver(id)
      .then((d) => vivo && setDetalle(d))
      .catch(() => vivo && setDetalle(null));
    return () => {
      vivo = false;
    };
  }, [id]);
  const archivar = async () => {
    if (!id) return;
    await coleccionesApi.archivar(id).catch(() => undefined);
    alArchivar();
    alCerrar();
  };
  return (
    <Cajon abierto={id !== null} onOpenChange={(a) => (a ? null : alCerrar())}>
      <CajonCabecera
        titulo={detalle ? `Para ${detalle.paraQuien}` : 'Colección'}
        descripcion={detalle ? (detalle.abiertaEn ? `La abrió el ${fechaCorta(detalle.abiertaEn)} · ${detalle.vistas} vistas` : 'Todavía no la abre.') : ''}
      />
      <CajonCuerpo>
        {detalle ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl bg-surface-muted px-3 py-2">
              <span className="min-w-0 flex-1 truncate font-mono text-caption text-fg">{enlaceLocalDeLaColeccion(detalle.token)}</span>
              <CopyButton text={enlaceLocalDeLaColeccion(detalle.token)} label="Copiar" copiedLabel="Copiado" size="sm" variant="ghost" />
            </div>
            <ul className="space-y-2">
              {detalle.inmuebles.map((i) => (
                <li key={i.propertyId} className="rounded-xl border border-border px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-body-sm font-medium text-fg">{i.titulo}</p>
                    {i.reaccion === 'me_gusta' ? <StatusBadge tone="success">Le gusta</StatusBadge> : i.reaccion === 'no' ? <StatusBadge tone="neutral">No</StatusBadge> : <span className="text-caption text-fg-subtle">Sin marcar</span>}
                  </div>
                  {i.comentario ? <p className="mt-1 text-body-sm text-fg-muted">«{i.comentario}»</p> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CajonCuerpo>
      <CajonPie>
        <Button variant="ghost" hideArrow onClick={() => void archivar()}>
          Archivar
        </Button>
        <Button variant="outline" hideArrow onClick={alCerrar}>
          Cerrar
        </Button>
      </CajonPie>
    </Cajon>
  );
}
