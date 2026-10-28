'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, CheckCircle, SpinnerGap, WarningCircle } from '@phosphor-icons/react';
import { Ilustracion, motionDuration, motionEase, type NombreIlustracion } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { separarEnlaces, type EnlaceFallido } from '@/lib/inmuebles/enlaces.service';
import { leerLoElegido, leerLoSoltado, type ArchivoConRuta } from '@/lib/publica/carpetas';
import { cn } from '@/lib/utils';

/**
 * «¿Son muchos? Tráelos de una» (Nico, 20-10-2026: pegar enlaces, arrastrar
 * carpetas y el Excel leído en el publicador). Esta pieza es sólo la
 * pantalla: lo que hace cada camino lo decide el publicador, que es el dueño
 * de las tarjetas.
 */

export type CaminoParaMuchos = 'enlaces' | 'excel' | 'carpetas';

export interface ResultadoDeEnlaces {
  creados: number;
  fallidos: EnlaceFallido[];
}

export interface ResultadoDelExcel {
  filas: number;
  creados: number;
  conFaltantes: number;
  conFotosEnLaCelda: number;
  /** Las columnas que no encontramos: «la dirección», «el precio». */
  columnasQueFaltan: string[];
}

export interface ResultadoDeCarpetas {
  carpetas: number;
  acomodadas: number;
  nuevas: number;
}

export function TraerMuchos({
  alTraerEnlaces,
  alLeerExcel,
  alSoltarCarpetas,
  inicial = null,
}: {
  alTraerEnlaces: (urls: string[], alAvanzar: (listos: number, total: number) => void) => Promise<ResultadoDeEnlaces>;
  alLeerExcel: (archivo: File) => Promise<ResultadoDelExcel>;
  alSoltarCarpetas: (archivos: ArchivoConRuta[]) => Promise<ResultadoDeCarpetas>;
  inicial?: CaminoParaMuchos | null;
}) {
  const [camino, setCamino] = useState<CaminoParaMuchos | null>(inicial);

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 sm:p-6" data-testid="traer-muchos">
      {/* Nico, 28-10: «eso está todo desordenado». El título arriba y las tres maneras en tres opciones parejas. */}
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[16px] font-medium text-fg">¿Son muchos? Tráelos de una</p>
        <p className="hidden text-caption text-fg-subtle sm:block">Hasta 500 por vez</p>
      </div>
      <p className="mt-0.5 text-body-sm text-fg-subtle">Elige de dónde vienen y los armamos por ti. Después los revisas uno por uno o todos juntos.</p>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-3" role="tablist" aria-label="Cómo traerlos">
        {CAMINOS.map(({ c, titulo, detalle, ilustracion }) => {
          const elegido = camino === c;
          return (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={elegido}
              onClick={() => setCamino((a) => (a === c ? null : c))}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl border p-3 text-left transition-[background-color,border-color,box-shadow,transform] duration-fast active:scale-[0.99] sm:flex-col sm:items-start sm:gap-2.5 sm:p-4',
                elegido
                  ? 'border-primary bg-primary-soft/60 shadow-[0_0_0_3px_rgba(26,64,255,0.12)]'
                  : 'border-border bg-surface hover:border-border-strong hover:shadow-sm',
              )}
              data-testid={`camino-${c}`}
            >
              <Ilustracion nombre={ilustracion} tamano={44} tono="auto" alt="" />
              <span className="min-w-0">
                <span className={cn('block text-body-sm font-medium', elegido ? 'text-primary' : 'text-fg')}>{titulo}</span>
                <span className="mt-0.5 block text-caption leading-snug text-fg-subtle">{detalle}</span>
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  'absolute right-3 top-3 flex size-5 items-center justify-center rounded-full transition-[opacity,transform] duration-fast',
                  elegido ? 'scale-100 bg-primary text-primary-fg opacity-100' : 'scale-75 opacity-0',
                )}
              >
                <Check size={12} weight="bold" />
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence initial={false} mode="wait">
        {camino && (
          <motion.div
            key={camino}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: motionDuration.base, ease: motionEase.standard }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-xl bg-surface-muted/60 p-4">
              {camino === 'enlaces' && <PegarEnlaces alTraer={alTraerEnlaces} />}
              {camino === 'excel' && <SubirExcel alLeer={alLeerExcel} alSeguirConCarpetas={() => setCamino('carpetas')} />}
              {camino === 'carpetas' && <SoltarCarpetas alSoltar={alSoltarCarpetas} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/** Las tres maneras de traerlos, cada una con su 3D. */
const CAMINOS: readonly { c: CaminoParaMuchos; titulo: string; detalle: string; ilustracion: NombreIlustracion }[] = [
  { c: 'enlaces', titulo: 'Pegar tus avisos', detalle: 'Enlaces de Finca Raíz, Metrocuadrado o tu página.', ilustracion: 'megafono' },
  { c: 'excel', titulo: 'Subir un Excel', detalle: 'Tu lista de inmuebles, con las columnas que tengas.', ilustracion: 'inventario' },
  { c: 'carpetas', titulo: 'Carpetas de fotos', detalle: 'Una carpeta por inmueble y armamos cada uno.', ilustracion: 'camara' },
];

function Aviso({ tono, children }: { tono: 'bien' | 'ojo'; children: React.ReactNode }) {
  return (
    <div
      className={cn('mt-3 flex items-start gap-2 rounded-md px-3.5 py-2.5 text-[13px]', tono === 'bien' ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning')}
      role="status"
    >
      {tono === 'bien' ? (
        <CheckCircle size={16} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
      ) : (
        <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
      )}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function PegarEnlaces({ alTraer }: { alTraer: (urls: string[], alAvanzar: (l: number, t: number) => void) => Promise<ResultadoDeEnlaces> }) {
  const [texto, setTexto] = useState('');
  const [avance, setAvance] = useState<{ listos: number; total: number } | null>(null);
  const [resultado, setResultado] = useState<ResultadoDeEnlaces | null>(null);
  const urls = separarEnlaces(texto);

  const traer = async () => {
    if (urls.length === 0 || avance) return;
    setResultado(null);
    setAvance({ listos: 0, total: urls.length });
    try {
      const r = await alTraer(urls, (listos, total) => setAvance({ listos, total }));
      setResultado(r);
      if (r.creados > 0) setTexto(r.fallidos.map((f) => f.url).join('\n'));
    } finally {
      setAvance(null);
    }
  };

  return (
    <div>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-fg-muted">Pega los enlaces de tus avisos</span>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={4}
          placeholder={'https://www.fincaraiz.com.co/…\nhttps://www.metrocuadrado.com/…\nhttps://tupagina.com/inmueble/…'}
          className="w-full rounded-md border border-transparent bg-surface-muted/70 px-4 py-3 font-mono text-[13px] text-fg placeholder:text-fg-placeholder focus:border-primary focus:bg-surface focus:outline-none"
          data-testid="enlaces-texto"
        />
      </label>
      <p className="mt-1.5 text-[13px] text-fg-subtle">
        Fincaraíz, Metrocuadrado, Ciencuadras o tu página. Uno por línea, o como los copies: los separamos solos.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button type="button" onClick={() => void traer()} disabled={urls.length === 0 || !!avance} className="h-10 rounded-full px-5 text-[14px]" data-testid="enlaces-traer">
          {avance ? (
            <>
              <SpinnerGap className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Leyendo {avance.listos} de {avance.total}…
            </>
          ) : urls.length > 1 ? (
            `Traer los ${urls.length}`
          ) : (
            'Traer'
          )}
        </Button>
        {urls.length > 0 && !avance && <span className="font-mono text-[13px] text-fg-subtle">{urls.length === 1 ? '1 enlace' : `${urls.length} enlaces`}</span>}
      </div>
      {resultado && resultado.creados > 0 && (
        <Aviso tono="bien">
          {resultado.creados === 1 ? 'Listo: 1 inmueble más abajo.' : `Listo: ${resultado.creados} inmuebles más abajo.`} Las fotos se van trayendo
          solas; revisa cada uno antes de publicar.
        </Aviso>
      )}
      {resultado && resultado.fallidos.length > 0 && (
        <Aviso tono="ojo">
          <p>{resultado.fallidos.length === 1 ? 'Este enlace no se pudo leer:' : `Estos ${resultado.fallidos.length} enlaces no se pudieron leer:`}</p>
          <ul className="mt-1 space-y-0.5">
            {resultado.fallidos.slice(0, 6).map((f) => (
              <li key={f.url} className="truncate">
                <span className="font-mono">{f.url}</span> — {f.mensaje}
              </li>
            ))}
            {resultado.fallidos.length > 6 && <li>Y {resultado.fallidos.length - 6} más (los dejamos arriba para que los revises).</li>}
          </ul>
        </Aviso>
      )}
    </div>
  );
}

function SubirExcel({ alLeer, alSeguirConCarpetas }: { alLeer: (archivo: File) => Promise<ResultadoDelExcel>; alSeguirConCarpetas: () => void }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [resultado, setResultado] = useState<ResultadoDelExcel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);

  const leer = async (archivo: File | undefined) => {
    if (!archivo || leyendo) return;
    setLeyendo(true);
    setError(null);
    setResultado(null);
    try {
      setResultado(await alLeer(archivo));
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'No pudimos leer ese archivo. Prueba guardándolo como .xlsx o .csv.');
    } finally {
      setLeyendo(false);
    }
  };

  return (
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
          void leer(e.dataTransfer.files?.[0]);
        }}
        className={cn('rounded-lg border-2 border-dashed p-5 text-center transition-colors duration-fast', arrastrando ? 'border-primary bg-primary-soft' : 'border-border')}
      >
        <p className="text-[14.5px] font-medium text-fg">Cada fila se vuelve un inmueble</p>
        <p className="mx-auto mt-1 max-w-[460px] text-[13px] text-fg-subtle">
          Con las columnas que ya tienes: dirección, ciudad, barrio, tipo, canon o precio, habitaciones, baños, área, código y, si los tienes, los
          enlaces de las fotos.
        </p>
        <Button type="button" variant="secondary" onClick={() => entrada.current?.click()} disabled={leyendo} className="mt-4 h-10 rounded-full px-5 text-[14px]" data-testid="excel-elegir">
          {leyendo ? (
            <>
              <SpinnerGap className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Leyendo el archivo…
            </>
          ) : (
            'Elegir el Excel'
          )}
        </Button>
        <input
          ref={entrada}
          type="file"
          accept=".xlsx,.xls,.csv,.tsv,.txt"
          className="sr-only"
          onChange={(e) => {
            void leer(e.target.files?.[0]);
            e.target.value = '';
          }}
          data-testid="excel-entrada"
        />
      </div>
      {error && <Aviso tono="ojo">{error}</Aviso>}
      {resultado && resultado.creados > 0 && (
        <Aviso tono="bien">
          <p>
            Leímos {resultado.filas === 1 ? '1 fila' : `${resultado.filas} filas`}: {resultado.creados === 1 ? '1 inmueble' : `${resultado.creados} inmuebles`} más abajo.
          </p>
          {resultado.conFaltantes > 0 && (
            <p className="mt-1">
              {resultado.conFaltantes === 1 ? 'A 1 le falta' : `A ${resultado.conFaltantes} les falta`} un dato además de las fotos: lo ves en cada uno.
            </p>
          )}
          {resultado.conFotosEnLaCelda > 0 && <p className="mt-1">Las fotos de los enlaces del archivo se van trayendo solas.</p>}
          <p className="mt-1">
            ¿Tienes las fotos en carpetas?{' '}
            <button type="button" onClick={alSeguirConCarpetas} className="font-medium underline underline-offset-2">
              Arrástralas
            </button>
            : si cada carpeta se llama como el código o la dirección, se acomodan solas.
          </p>
        </Aviso>
      )}
      {resultado && resultado.columnasQueFaltan.length > 0 && (
        <Aviso tono="ojo">
          No encontramos la columna de {resultado.columnasQueFaltan.join(' ni la de ')}: llénala en cada inmueble o agrégala al archivo y súbelo
          otra vez.
        </Aviso>
      )}
      {resultado && resultado.creados === 0 && (
        <Aviso tono="ojo">No encontramos inmuebles en ese archivo. Revisa que la primera fila tenga los nombres de las columnas.</Aviso>
      )}
    </div>
  );
}

function SoltarCarpetas({ alSoltar }: { alSoltar: (archivos: ArchivoConRuta[]) => Promise<ResultadoDeCarpetas> }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoDeCarpetas | null>(null);

  const soltar = async (archivos: ArchivoConRuta[] | Promise<ArchivoConRuta[]>) => {
    if (leyendo) return;
    setLeyendo(true);
    setResultado(null);
    try {
      setResultado(await alSoltar(await archivos));
    } finally {
      setLeyendo(false);
    }
  };

  return (
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
          void soltar(leerLoSoltado(e.dataTransfer));
        }}
        className={cn('rounded-lg border-2 border-dashed p-6 text-center transition-colors duration-fast', arrastrando ? 'border-primary bg-primary-soft' : 'border-border')}
        data-testid="carpetas-zona"
      >
        {/* Ronda 30: la carpeta suelta, sin el círculo azul. */}
        <span className="mx-auto block w-fit" aria-hidden="true">
          <Ilustracion nombre="carpeta" tamano={64} tono="auto" alt="" />
        </span>
        <p className="mt-3 text-[14.5px] font-medium text-fg">Arrastra aquí tus carpetas: una por inmueble</p>
        <p className="mx-auto mt-1 max-w-[460px] text-[13px] text-fg-subtle">
          O la carpeta que las tiene todas. Cada carpeta se vuelve un inmueble con sus fotos; la primera por nombre es la portada.
        </p>
        <Button type="button" variant="secondary" onClick={() => entrada.current?.click()} disabled={leyendo} className="mt-4 h-10 rounded-full px-5 text-[14px]">
          {leyendo ? (
            <>
              <SpinnerGap className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Leyendo las carpetas…
            </>
          ) : (
            'Elegir una carpeta'
          )}
        </Button>
        <input
          ref={entrada}
          type="file"
          multiple
          className="sr-only"
          // @ts-expect-error — `webkitdirectory` no está en los tipos de React, pero Chrome, Edge, Safari y Firefox lo entienden.
          webkitdirectory=""
          onChange={(e) => {
            void soltar(leerLoElegido(e.target.files));
            e.target.value = '';
          }}
          data-testid="carpetas-entrada"
        />
      </div>
      {resultado && resultado.carpetas > 0 && (
        <Aviso tono="bien">
          {resultado.carpetas === 1 ? '1 carpeta' : `${resultado.carpetas} carpetas`}
          {resultado.acomodadas > 0 ? `: ${resultado.acomodadas === 1 ? '1 se acomodó' : `${resultado.acomodadas} se acomodaron`} con su inmueble` : ''}
          {resultado.nuevas > 0 ? `${resultado.acomodadas > 0 ? ' y' : ':'} ${resultado.nuevas === 1 ? '1 es un inmueble nuevo' : `${resultado.nuevas} son inmuebles nuevos`}` : ''}.
        </Aviso>
      )}
      {resultado && resultado.carpetas === 0 && <Aviso tono="ojo">No encontramos fotos en lo que soltaste.</Aviso>}
    </div>
  );
}
