'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { motionDuration, motionEase } from '@leasefy/cadence';
import { CheckCircle, FileZip, Images, WarningCircle } from '@phosphor-icons/react';

import { inmueblesImportacionApi } from '@/lib/api/inmuebles-importacion.service';
import { propertiesApi } from '@/lib/api/properties.service';
import { validatePropertyPhoto } from '@/lib/api/property-photos';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { emparejar, FOTOS_MAXIMAS_POR_INMUEBLE, leerFotosDelZip, type Emparejamiento } from '@/lib/inmuebles/fotos-del-zip';
import { correrEnElNavegador } from '@/lib/procesos/en-el-centro';
import { cn } from '@/lib/utils';

/**
 * «Fotos de muchos inmuebles» desde un ZIP (Nico, 09-10-2026). Una carpeta por
 * inmueble con su código; se lee aquí, se dice qué calza y qué no ANTES de
 * subir, y se sube en el centro de procesos (se puede seguir trabajando).
 */
export function FotosEnUnZip() {
  const entrada = useRef<HTMLInputElement>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nombre, setNombre] = useState<string | null>(null);
  const [lista, setLista] = useState<Emparejamiento[] | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [hecho, setHecho] = useState<string | null>(null);

  const leer = async (archivo: File | undefined) => {
    if (!archivo) return;
    setLeyendo(true);
    setError(null);
    setHecho(null);
    setNombre(archivo.name);
    try {
      const [carpetas, inmuebles] = await Promise.all([
        leerFotosDelZip(await archivo.arrayBuffer()),
        inmueblesImportacionApi.codigos(),
      ]);
      if (carpetas.length === 0) {
        setLista(null);
        setError('El ZIP no trae fotos (JPG, PNG o WebP) dentro de carpetas.');
      } else setLista(emparejar(carpetas, inmuebles));
    } catch (e) {
      setLista(null);
      setError(mensajeParaLaPersona(e, { porDefecto: 'No pudimos leer el ZIP.', accion: 'leer el ZIP' }));
    } finally {
      setLeyendo(false);
      if (entrada.current) entrada.current.value = '';
    }
  };

  const calzan = (lista ?? []).filter((e) => e.inmueble && e.caben > 0);
  const totalFotos = calzan.reduce((n, e) => n + e.caben, 0);

  const subir = async () => {
    if (totalFotos === 0 || subiendo) return;
    setSubiendo(true);
    try {
      const r = await correrEnElNavegador({
        tipo: 'CARGA',
        titulo: `Fotos desde ${nombre ?? 'un ZIP'}`,
        total: totalFotos,
        trabajo: async (ctx) => {
          let hechas = 0;
          let subidas = 0;
          const fallas: string[] = [];
          for (const e of calzan) {
            for (const foto of e.fotos.slice(0, e.caben)) {
              if (!(await ctx.avanzar(hechas))) return { mensaje: `Detenido: ${subidas} fotos subidas.` };
              const archivo = new File([foto.bytes as BlobPart], foto.nombre, { type: foto.tipo });
              const invalida = validatePropertyPhoto(archivo);
              if (invalida) fallas.push(`${e.carpeta}/${foto.nombre}: ${invalida}`);
              else {
                try {
                  await propertiesApi.uploadImage(e.inmueble!.id, archivo);
                  subidas++;
                } catch (err) {
                  fallas.push(`${e.carpeta}/${foto.nombre}: ${mensajeParaLaPersona(err, { porDefecto: 'no se subió', accion: 'subir la foto' })}`);
                }
              }
              hechas++;
            }
          }
          await ctx.avanzar(hechas);
          const texto = `${subidas} ${subidas === 1 ? 'foto subida' : 'fotos subidas'} a ${calzan.length} ${calzan.length === 1 ? 'inmueble' : 'inmuebles'}${fallas.length ? `; ${fallas.length} no se pudieron subir (${fallas.slice(0, 3).join(' · ')}${fallas.length > 3 ? '…' : ''})` : ''}.`;
          return { mensaje: texto };
        },
      });
      // El resumen viene en `resultado` (antes se leía de `r` y siempre salía
      // «Listo», aunque alguna foto fallara; QA del marketplace, 10-10-2026).
      const mensaje = (r.resultado as { mensaje?: string } | undefined)?.mensaje;
      const sinInmueble = (lista ?? []).filter((e) => !e.inmueble).map((e) => `«${e.carpeta || 'sin carpeta'}»`);
      const aparte = sinInmueble.length
        ? ` ${sinInmueble.length === 1 ? 'La carpeta' : 'Las carpetas'} ${sinInmueble.join(', ')} no ${sinInmueble.length === 1 ? 'tenía' : 'tenían'} inmueble y no se ${sinInmueble.length === 1 ? 'subió' : 'subieron'}.`
        : '';
      setHecho(`${mensaje ?? 'Listo: las fotos quedaron en sus inmuebles.'}${aparte}`);
      setLista(null);
    } catch (e) {
      setError(mensajeParaLaPersona(e, { porDefecto: 'No pudimos subir las fotos.', accion: 'subir las fotos' }));
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="space-y-5" data-testid="fotos-en-un-zip">
      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="text-[15px] font-medium text-fg">Cómo armar el ZIP</p>
        <ul className="mt-2 space-y-1 text-caption text-fg-muted">
          <li>· Una carpeta por inmueble, con su código: el de tu sistema anterior (por ejemplo «4021») o el de Leasefy.</li>
          <li>· Adentro, sus fotos en JPG, PNG o WebP (hasta 5 MB cada una). Van en el orden del nombre: 1, 2, 3…</li>
          <li>· Se suman a las que el inmueble ya tiene, hasta {FOTOS_MAXIMAS_POR_INMUEBLE} por inmueble.</li>
        </ul>
        <input
          ref={entrada}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(e) => leer(e.target.files?.[0])}
          data-testid="zip-de-fotos"
        />
        <button
          type="button"
          onClick={() => entrada.current?.click()}
          disabled={leyendo || subiendo}
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-[14px] font-medium text-primary-fg transition-colors duration-fast hover:bg-primary-600 active:scale-[0.97] disabled:opacity-60"
        >
          <FileZip className="h-4 w-4" aria-hidden />
          {leyendo ? 'Leyendo el ZIP…' : lista ? 'Elegir otro ZIP' : 'Elegir el ZIP'}
        </button>
      </div>

      {error && (
        <p className="flex items-start gap-2 rounded-lg bg-danger/10 px-4 py-3 text-[14px] text-danger" role="alert">
          <WarningCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      {hecho && (
        <p className="flex items-start gap-2 rounded-lg bg-success/10 px-4 py-3 text-[14px] text-fg" role="status">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-success" weight="fill" aria-hidden />
          {hecho}
        </p>
      )}

      {lista && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: motionDuration.base, ease: motionEase.enter }}
          className="rounded-xl border border-border bg-surface"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <p className="text-[14.5px] text-fg">
              <span className="font-medium">{nombre}</span>: {lista.length} {lista.length === 1 ? 'carpeta' : 'carpetas'} ·{' '}
              <span className="font-mono tabular-nums">{totalFotos}</span> fotos para {calzan.length}{' '}
              {calzan.length === 1 ? 'inmueble' : 'inmuebles'}
            </p>
            <button
              type="button"
              onClick={subir}
              disabled={totalFotos === 0 || subiendo}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-[14px] font-medium text-primary-fg transition-colors duration-fast hover:bg-primary-600 active:scale-[0.97] disabled:opacity-50"
              data-testid="subir-fotos-del-zip"
            >
              <Images className="h-4 w-4" aria-hidden />
              {subiendo ? 'Subiendo…' : `Subir ${totalFotos} fotos`}
            </button>
          </div>
          <ul className="max-h-[420px] divide-y divide-border overflow-y-auto">
            {lista.map((e) => (
              <li key={e.carpeta || '(sin carpeta)'} className="flex items-center justify-between gap-3 px-5 py-2.5 text-[14px]">
                <span className="min-w-0">
                  <span className="font-mono text-[13px] text-fg">{e.carpeta || '(fotos sueltas, sin carpeta)'}</span>
                  <span className={cn('ml-2', e.inmueble ? 'text-fg-muted' : 'text-danger')}>
                    {e.inmueble
                      ? `→ ${e.inmueble.titulo}`
                      : e.carpeta
                        ? `No hay un inmueble con el código «${e.carpeta}»`
                        : 'Van dentro de la carpeta de su inmueble'}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[13px] tabular-nums text-fg-muted">
                  {e.inmueble
                    ? e.caben < e.fotos.length
                      ? `${e.caben} de ${e.fotos.length} (ya tiene ${e.inmueble.fotos})`
                      : `${e.fotos.length} fotos`
                    : `${e.fotos.length} sin subir`}
                </span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
}
