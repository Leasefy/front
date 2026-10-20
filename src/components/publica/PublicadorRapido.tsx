'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowSquareOut, CheckCircle, ImageSquare, Plus, SpinnerGap, Trash, WarningCircle, X } from '@phosphor-icons/react';
import { motionDuration, motionEase } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { AddressAutocomplete } from '@/components/publicar/AddressAutocomplete';
import { propertiesApi } from '@/lib/api/properties.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import {
  TIPOS,
  borrarBorrador,
  fraseDeLoQueFalta,
  guardarBorrador,
  inmuebleVacio,
  leerBorrador,
  loQueFalta,
  paraCrear,
  tituloDe,
  type InmuebleRapido,
} from '@/lib/publica/borrador';
import { cn } from '@/lib/utils';

/**
 * ══ EL PUBLICADOR RÁPIDO ════════════════════════════════════════════════════
 *
 * Juan y Nico (19-10-2026): «que lo deje crear la propiedad o las propiedades
 * en un flujo diferente al que está dentro de la plataforma», «que pueda
 * publicar muy rápido uno o muchos, que se sienta rápido».
 *
 * Una tarjeta por inmueble con lo justo para salir en el marketplace: fotos,
 * arriendo o venta, tipo, dirección, precio, habitaciones, baños y área. «+
 * Agregar otro» copia la operación, el tipo y la ciudad del anterior. «Publicar
 * los N» crea cada uno (POST /properties, disponible y en el marketplace) y sube
 * sus fotos; cada tarjeta dice cómo le fue. Lo escrito se guarda en el
 * navegador mientras tanto (las fotos no: son archivos).
 */
type Estado = { que: 'borrador' } | { que: 'publicando' } | { que: 'publicado'; id: string } | { que: 'fallo'; motivo: string; id?: string };

const MAX_FOTOS = 20;

export function PublicadorRapido({
  usuario,
  alTerminar,
}: {
  usuario: string;
  /** Dónde sigue después de publicar (su cuenta). */
  alTerminar: { href: string; texto: string };
}) {
  const contador = useRef(0);
  const nuevaClave = () => `i${Date.now().toString(36)}${(contador.current += 1)}`;
  const [inmuebles, setInmuebles] = useState<InmuebleRapido[]>(() => [inmuebleVacio('i0')]);
  const [fotos, setFotos] = useState<Record<string, File[]>>({});
  const [estados, setEstados] = useState<Record<string, Estado>>({});
  const [publicando, setPublicando] = useState(false);
  const [recuperado, setRecuperado] = useState(false);
  const [intento, setIntento] = useState(false);

  // Lo que dejó escrito la última vez.
  useEffect(() => {
    const guardado = leerBorrador(usuario);
    if (guardado) {
      setInmuebles(guardado);
      setRecuperado(true);
    }
  }, [usuario]);
  useEffect(() => {
    const pendientes = inmuebles.filter((i) => estados[i.clave]?.que !== 'publicado');
    if (pendientes.length === 0) borrarBorrador(usuario);
    else guardarBorrador(usuario, pendientes);
  }, [inmuebles, estados, usuario]);

  const cambiar = (clave: string, parcial: Partial<InmuebleRapido>) =>
    setInmuebles((lista) => lista.map((i) => (i.clave === clave ? { ...i, ...parcial } : i)));
  const agregar = () =>
    setInmuebles((lista) => {
      const ultimo = lista[lista.length - 1];
      return [...lista, inmuebleVacio(nuevaClave(), { operacion: ultimo?.operacion, tipo: ultimo?.tipo, ciudad: ultimo?.ciudad })];
    });
  const quitar = (clave: string) => {
    setInmuebles((lista) => (lista.length === 1 ? lista : lista.filter((i) => i.clave !== clave)));
    setFotos((f) => {
      const { [clave]: _fuera, ...resto } = f;
      return resto;
    });
  };

  const porPublicar = inmuebles.filter((i) => estados[i.clave]?.que !== 'publicado');
  const listos = porPublicar.filter((i) => loQueFalta(i, fotos[i.clave]?.length ?? 0).length === 0);
  const publicados = inmuebles.filter((i) => estados[i.clave]?.que === 'publicado');
  const todosPublicados = inmuebles.length > 0 && publicados.length === inmuebles.length;

  const publicarTodos = async () => {
    setIntento(true);
    if (listos.length === 0 || publicando) return;
    setPublicando(true);
    for (const i of listos) {
      const previo = estados[i.clave];
      setEstados((e) => ({ ...e, [i.clave]: { que: 'publicando' } }));
      try {
        // Si ya se creó antes (sólo fallaron las fotos), no se crea otra vez.
        const id = previo && previo.que === 'fallo' && previo.id ? previo.id : (await propertiesApi.create(paraCrear(i) as Parameters<typeof propertiesApi.create>[0])).id;
        const archivos = fotos[i.clave] ?? [];
        let fallaron = 0;
        for (const archivo of archivos) {
          try {
            await propertiesApi.uploadImage(id, archivo);
          } catch {
            fallaron += 1;
          }
        }
        setEstados((e) => ({
          ...e,
          [i.clave]:
            fallaron === 0
              ? { que: 'publicado', id }
              : { que: 'fallo', id, motivo: `Se publicó, pero ${fallaron === 1 ? '1 foto no subió' : `${fallaron} fotos no subieron`}. Vuelve a intentar.` },
        }));
      } catch (err) {
        setEstados((e) => ({
          ...e,
          [i.clave]: { que: 'fallo', motivo: mensajeParaLaPersona(err, { porDefecto: 'No se pudo publicar. Intenta de nuevo.', accion: 'publicar el inmueble' }) },
        }));
      }
    }
    setPublicando(false);
  };

  if (todosPublicados) {
    return <TodoPublicado inmuebles={publicados} estados={estados} fotos={fotos} alTerminar={alTerminar} alAgregarOtro={agregar} />;
  }

  return (
    <div className="mx-auto w-full max-w-[760px] pb-40" data-testid="publicador-rapido">
      <p className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-fg-subtle">
        <i className="inline-block size-2 rounded-[2px] bg-primary" aria-hidden="true" />
        Publica gratis
      </p>
      <h1 className="mt-4 text-[30px] font-medium leading-[1.08] tracking-[-0.03em] text-fg sm:text-[36px]">
        {inmuebles.length > 1 ? `Tus ${inmuebles.length} inmuebles` : 'Tu inmueble'}
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-fg-subtle">
        Lo justo para salir en el marketplace. Lo demás lo completas cuando quieras.
      </p>
      {recuperado && (
        <p className="mt-4 rounded-md bg-info-soft px-4 py-2.5 text-[13px] text-info" role="status">
          Recuperamos lo que dejaste escrito. Las fotos hay que elegirlas otra vez.
        </p>
      )}

      <div className="mt-8 space-y-5">
        <AnimatePresence initial={false}>
          {inmuebles.map((i, n) => (
            <motion.div
              key={i.clave}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, transition: { duration: motionDuration.fast, ease: motionEase.exit } }}
              transition={{ duration: motionDuration.slow, ease: motionEase.enter }}
            >
              <TarjetaDeInmueble
                numero={n + 1}
                inmueble={i}
                fotos={fotos[i.clave] ?? []}
                estado={estados[i.clave] ?? { que: 'borrador' }}
                mostrarFaltantes={intento}
                alCambiar={(p) => cambiar(i.clave, p)}
                alCambiarFotos={(f) => setFotos((todas) => ({ ...todas, [i.clave]: f }))}
                alQuitar={inmuebles.length > 1 ? () => quitar(i.clave) : undefined}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={agregar}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong py-5 text-[15px] font-medium text-fg-muted transition-colors duration-fast hover:border-primary hover:bg-primary-soft hover:text-primary"
        data-testid="agregar-otro-inmueble"
      >
        <Plus size={18} weight="bold" aria-hidden="true" />
        Agregar otro inmueble
      </button>

      {/* El pie fijo: cuántos van y publicar. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
        <div className="mx-auto flex w-full max-w-[760px] items-center justify-between gap-4">
          <p className="text-[14px] text-fg-muted" data-testid="cuantos-listos">
            <span className="font-mono font-medium text-fg">{listos.length}</span> de{' '}
            <span className="font-mono">{porPublicar.length}</span> {porPublicar.length === 1 ? 'listo' : 'listos'} para publicar
          </p>
          <Button
            type="button"
            onClick={() => void publicarTodos()}
            disabled={publicando}
            className="h-12 rounded-full px-7 text-[15px] shadow-[0_12px_32px_-12px_rgba(26,64,255,0.65)]"
            data-testid="publicar-todos"
          >
            {publicando ? (
              <>
                <SpinnerGap className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Publicando…
              </>
            ) : listos.length > 1 ? (
              `Publicar los ${listos.length}`
            ) : (
              'Publicar'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function TarjetaDeInmueble({
  numero,
  inmueble: i,
  fotos,
  estado,
  mostrarFaltantes,
  alCambiar,
  alCambiarFotos,
  alQuitar,
}: {
  numero: number;
  inmueble: InmuebleRapido;
  fotos: File[];
  estado: Estado;
  mostrarFaltantes: boolean;
  alCambiar: (p: Partial<InmuebleRapido>) => void;
  alCambiarFotos: (f: File[]) => void;
  alQuitar?: () => void;
}) {
  const faltan = loQueFalta(i, fotos.length);
  const entrada = useRef<HTMLInputElement>(null);
  const vistas = useMemo(() => fotos.map((f) => URL.createObjectURL(f)), [fotos]);
  useEffect(() => () => vistas.forEach((u) => URL.revokeObjectURL(u)), [vistas]);
  const bloqueada = estado.que === 'publicando' || estado.que === 'publicado';
  const [arrastrando, setArrastrando] = useState(false);
  const sumar = (lista: FileList | null) => {
    if (!lista) return;
    const imagenes = Array.from(lista).filter((f) => f.type.startsWith('image/'));
    alCambiarFotos([...fotos, ...imagenes].slice(0, MAX_FOTOS));
  };
  const falta = (c: Parameters<typeof faltan.includes>[0]) => mostrarFaltantes && faltan.includes(c);

  return (
    <section
      className={cn(
        'relative rounded-lg border bg-surface p-5 shadow-[0_1px_2px_rgba(20,19,15,0.05)] sm:p-6',
        estado.que === 'fallo' ? 'border-danger/50' : 'border-border',
      )}
      data-testid={`tarjeta-inmueble-${numero}`}
      aria-label={`Inmueble ${numero}`}
    >
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">Inmueble {numero}</p>
          <p className="mt-1 truncate text-[16px] font-medium text-fg">{tituloDe(i)}</p>
        </div>
        {alQuitar && !bloqueada && (
          <button
            type="button"
            onClick={alQuitar}
            aria-label={`Quitar el inmueble ${numero}`}
            className="inline-flex size-9 items-center justify-center rounded-full border border-border text-fg-subtle hover:text-danger"
          >
            <Trash size={16} aria-hidden="true" />
          </button>
        )}
      </header>

      <fieldset disabled={bloqueada} className="min-w-0 space-y-5">
        {/* Fotos: arrastrar varias, la primera es la portada. */}
        <div>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={(e) => {
              e.preventDefault();
              setArrastrando(false);
              sumar(e.dataTransfer.files);
            }}
            className={cn(
              'rounded-lg border-2 border-dashed p-3 transition-colors duration-fast',
              arrastrando ? 'border-primary bg-primary-soft' : falta('fotos') ? 'border-danger/60' : 'border-border',
            )}
          >
            {fotos.length === 0 ? (
              <button
                type="button"
                onClick={() => entrada.current?.click()}
                className="flex w-full flex-col items-center gap-2 py-8 text-center"
                data-testid={`fotos-inmueble-${numero}`}
              >
                <span className="inline-flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <ImageSquare size={24} weight="duotone" aria-hidden="true" />
                </span>
                <span className="text-[15px] font-medium text-fg">Arrastra tus fotos o toca para elegirlas</span>
                <span className="text-[13px] text-fg-subtle">Varias a la vez. La primera es la portada.</span>
              </button>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {vistas.map((url, k) => (
                  <div key={url} className="group relative aspect-square overflow-hidden rounded-md bg-surface-muted">
                    <Image src={url} alt={`Foto ${k + 1}`} fill sizes="140px" className="object-cover" unoptimized />
                    {k === 0 && (
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-black/55 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-white">
                        Portada
                      </span>
                    )}
                    {!bloqueada && (
                      <button
                        type="button"
                        onClick={() => alCambiarFotos(fotos.filter((_, x) => x !== k))}
                        aria-label={`Quitar la foto ${k + 1}`}
                        className="absolute right-1.5 top-1.5 inline-flex size-6 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        <X size={12} weight="bold" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
                {fotos.length < MAX_FOTOS && !bloqueada && (
                  <button
                    type="button"
                    onClick={() => entrada.current?.click()}
                    className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-[12px] text-fg-subtle hover:border-primary hover:text-primary"
                  >
                    <Plus size={18} aria-hidden="true" />
                    Más
                  </button>
                )}
              </div>
            )}
            <input
              ref={entrada}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                sumar(e.target.files);
                e.target.value = '';
              }}
              data-testid={`entrada-fotos-${numero}`}
            />
          </div>
        </div>

        {/* Arriendo o venta + tipo */}
        <div className="flex flex-wrap items-center gap-2">
          {(['rent', 'sale'] as const).map((op) => (
            <Pastilla key={op} activa={i.operacion === op} onClick={() => alCambiar({ operacion: op })}>
              {op === 'rent' ? 'Arriendo' : 'Venta'}
            </Pastilla>
          ))}
          <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
          {TIPOS.map((t) => (
            <Pastilla key={t.valor} activa={i.tipo === t.valor} aviso={falta('tipo')} onClick={() => alCambiar({ tipo: t.valor })}>
              {t.nombre}
            </Pastilla>
          ))}
        </div>

        {/* Dirección: con sugerencias; si no hay, se escribe y se pone la ciudad. */}
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
          <Campo etiqueta="Dirección" aviso={falta('direccion')}>
            <AddressAutocomplete
              value={i.direccion}
              onChangeText={(t) => alCambiar({ direccion: t, latitud: undefined, longitud: undefined })}
              onSelect={(s) =>
                alCambiar({ direccion: s.address, ciudad: s.city || i.ciudad, barrio: s.neighborhood || i.barrio, latitud: s.latitude, longitud: s.longitude })
              }
              placeholder="Calle 10 # 43-21"
            />
          </Campo>
          <Campo etiqueta="Ciudad" aviso={falta('ciudad')}>
            <input className={CAMPO} value={i.ciudad} onChange={(e) => alCambiar({ ciudad: e.target.value })} placeholder="Medellín" maxLength={50} data-testid={`ciudad-${numero}`} />
          </Campo>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <Campo etiqueta={i.operacion === 'sale' ? 'Precio de venta' : 'Canon mensual'} aviso={falta('precio')} className="col-span-2 sm:col-span-1">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-[15px] text-fg-subtle">$</span>
              <input
                className={cn(CAMPO, 'pl-8 font-mono tabular-nums')}
                inputMode="numeric"
                value={i.precio ? i.precio.toLocaleString('es-CO') : ''}
                onChange={(e) => {
                  const n = Number(e.target.value.replace(/\D/g, ''));
                  alCambiar({ precio: Number.isFinite(n) && n > 0 ? Math.min(n, 2_000_000_000) : null });
                }}
                placeholder={i.operacion === 'sale' ? '450.000.000' : '2.500.000'}
                data-testid={`precio-${numero}`}
              />
            </div>
          </Campo>
          <Numero etiqueta="Habitaciones" valor={i.habitaciones} alCambiar={(v) => alCambiar({ habitaciones: v })} max={20} />
          <Numero etiqueta="Baños" valor={i.banos} alCambiar={(v) => alCambiar({ banos: v })} max={20} />
          <Numero etiqueta="Área m²" valor={i.area} alCambiar={(v) => alCambiar({ area: v })} max={100000} />
        </div>

        <Campo etiqueta="Descripción (opcional)">
          <textarea
            className={cn(CAMPO, 'h-auto min-h-[84px] py-3')}
            value={i.descripcion}
            onChange={(e) => alCambiar({ descripcion: e.target.value })}
            maxLength={5000}
            placeholder="Lo que lo hace especial: la luz, la vista, lo cerca que queda de todo…"
          />
          {i.descripcion.trim().length > 0 && i.descripcion.trim().length < 20 && (
            <p className="mt-1 text-[12.5px] text-fg-subtle">Escribe al menos 20 letras para que salga en el aviso.</p>
          )}
        </Campo>
      </fieldset>

      <EstadoDeLaTarjeta estado={estado} faltan={faltan} mostrarFaltantes={mostrarFaltantes} />
    </section>
  );
}

const CAMPO =
  'h-12 w-full rounded-md border border-transparent bg-surface-muted/70 px-4 text-base text-fg placeholder:text-fg-placeholder transition-[background-color,border-color,box-shadow] duration-fast focus:border-primary focus:bg-surface focus:shadow-[0_0_0_4px_rgba(26,64,255,0.10)] focus:outline-none md:text-[14px]';

function Campo({ etiqueta, aviso, className, children }: { etiqueta: string; aviso?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn('block', className)}>
      <span className={cn('mb-1.5 block text-[13px] font-medium', aviso ? 'text-danger' : 'text-fg-muted')}>{etiqueta}</span>
      {children}
    </label>
  );
}

function Numero({ etiqueta, valor, alCambiar, max }: { etiqueta: string; valor: number | null; alCambiar: (v: number | null) => void; max: number }) {
  return (
    <Campo etiqueta={etiqueta}>
      <input
        className={cn(CAMPO, 'font-mono tabular-nums')}
        inputMode="numeric"
        value={valor ?? ''}
        onChange={(e) => {
          const n = Number(e.target.value.replace(/\D/g, ''));
          alCambiar(e.target.value.trim() === '' || !Number.isFinite(n) ? null : Math.min(n, max));
        }}
        placeholder="—"
      />
    </Campo>
  );
}

function Pastilla({ activa, aviso, onClick, children }: { activa: boolean; aviso?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className={cn(
        'h-9 rounded-full border px-3.5 text-[13.5px] font-medium transition-[background-color,border-color,color] duration-fast active:scale-[0.97]',
        activa ? 'border-primary bg-primary text-primary-fg' : aviso ? 'border-danger/50 bg-surface text-fg-muted' : 'border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg',
      )}
    >
      {children}
    </button>
  );
}

function EstadoDeLaTarjeta({ estado, faltan, mostrarFaltantes }: { estado: Estado; faltan: ReturnType<typeof loQueFalta>; mostrarFaltantes: boolean }) {
  if (estado.que === 'publicando')
    return (
      <p className="mt-5 flex items-center gap-2 text-[14px] text-fg-muted" role="status">
        <SpinnerGap className="h-4 w-4 animate-spin" aria-hidden="true" /> Publicando y subiendo las fotos…
      </p>
    );
  if (estado.que === 'publicado')
    return (
      <p className="mt-5 flex items-center gap-2 text-[14px] font-medium text-success" role="status">
        <CheckCircle size={18} weight="fill" aria-hidden="true" /> Publicado en el marketplace
      </p>
    );
  if (estado.que === 'fallo')
    return (
      <p className="mt-5 flex items-start gap-2 text-[14px] text-danger" role="alert">
        <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" /> {estado.motivo}
      </p>
    );
  return (
    <p className={cn('mt-5 text-[13px]', faltan.length === 0 ? 'text-success' : mostrarFaltantes ? 'text-danger' : 'text-fg-subtle')}>
      {fraseDeLoQueFalta(faltan)}
    </p>
  );
}

function TodoPublicado({
  inmuebles,
  estados,
  fotos,
  alTerminar,
  alAgregarOtro,
}: {
  inmuebles: InmuebleRapido[];
  estados: Record<string, Estado>;
  fotos: Record<string, File[]>;
  alTerminar: { href: string; texto: string };
  alAgregarOtro: () => void;
}) {
  const portadas = useMemo(
    () => Object.fromEntries(inmuebles.map((i) => [i.clave, fotos[i.clave]?.[0] ? URL.createObjectURL(fotos[i.clave][0]) : null])),
    [inmuebles, fotos],
  );
  return (
    <div className="mx-auto w-full max-w-[640px] text-center" data-testid="todo-publicado">
      <motion.span
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 18 }}
        className="mx-auto inline-flex size-16 items-center justify-center rounded-full bg-success-soft text-success"
      >
        <CheckCircle size={34} weight="fill" aria-hidden="true" />
      </motion.span>
      <h1 className="mt-6 text-[30px] font-medium leading-[1.1] tracking-[-0.03em] text-fg sm:text-[36px]">
        {inmuebles.length === 1 ? 'Ya está en el marketplace' : `Ya están en el marketplace: ${inmuebles.length}`}
      </h1>
      <p className="mt-3 text-[15px] text-fg-subtle">Compártelos y te llegan los interesados a tu WhatsApp y a tu cuenta.</p>
      <ul className="mt-8 space-y-3 text-left">
        {inmuebles.map((i) => {
          const e = estados[i.clave];
          const id = e && e.que === 'publicado' ? e.id : null;
          return (
            <li key={i.clave} className="flex items-center gap-4 rounded-lg border border-border bg-surface p-3">
              <span className="relative size-16 shrink-0 overflow-hidden rounded-md bg-surface-muted">
                {portadas[i.clave] && <Image src={portadas[i.clave] as string} alt="" fill sizes="64px" className="object-cover" unoptimized />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium text-fg">{tituloDe(i)}</span>
                <span className="block font-mono text-[13px] text-fg-subtle">
                  $ {(i.precio ?? 0).toLocaleString('es-CO')}
                  {i.operacion === 'rent' ? ' / mes' : ''}
                </span>
              </span>
              {id && (
                <Link href={`/propiedades/${id}`} target="_blank" className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-primary hover:underline">
                  Ver
                  <ArrowSquareOut size={14} aria-hidden="true" />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button asChild className="h-12 rounded-full px-7 text-[15px]" data-testid="entrar-a-mi-cuenta">
          <Link href={alTerminar.href}>{alTerminar.texto}</Link>
        </Button>
        <Button type="button" variant="secondary" className="h-12 rounded-full px-6 text-[15px]" onClick={alAgregarOtro}>
          Publicar otro
        </Button>
      </div>
    </div>
  );
}
