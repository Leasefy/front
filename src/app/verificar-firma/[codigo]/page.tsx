'use client';

/**
 * «¿ESTE DOCUMENTO FIRMADO ES DE VERDAD?» — lo que abre el QR de la hoja de firmas (Nico, 28-10-2026: «si o si el qr
 * debe de verificar que si existe y es real la firma»). Pública, sin sesión.
 *
 * Quien tiene el PDF (un banco, un juzgado, el otro firmante) escanea el QR o escribe el código y ve, en este orden:
 *   1. LA respuesta: si el documento existe en Leasefy y en qué quedó (firmado por todos, esperando firmas, cancelado);
 *   2. quién lo firmó, cuándo y cómo se identificó cada persona (código por correo o WhatsApp, prueba de vida), con su
 *      huella;
 *   3. «Compara tu archivo»: elige el PDF que le mandaron y el navegador saca su huella SHA-256 —el archivo NO se sube—
 *      y la compara con la del documento firmado, la del sellado y la del original;
 *   4. plegado, las huellas para copiar.
 * Todo lo dice el back (`GET /publico/verificar-firma/:codigo`), que devuelve poco a propósito: el nombre recortado,
 * nunca el correo, el celular, el documento ni la foto. Esta página no decide nada.
 */

import { use, useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Clock, Copy, FileMagnifyingGlass, SealCheck, SealWarning, WarningCircle, XCircle } from '@phosphor-icons/react';
import { Appear, CrossFade, Ilustracion, Presence } from '@leasefy/cadence';

import { LeasefyLogotype } from '@/components/brand';
import { MasDetalles } from '@/components/pantalla/MasDetalles';
import { Button } from '@/components/ui/button';
import { CargaDeMarca } from '@/components/ui/carga-de-marca';
import { Input } from '@/components/ui/input';
import { firmaPublicaApi, type DocumentoVerificado } from '@/lib/api/firmas.service';
import { fechaYHora } from '@/components/firmas/textos-de-firmas';
import { cn } from '@/lib/utils';

type Encontrado = Extract<DocumentoVerificado, { encontrado: true }>;

/** «k7q2m-x9p4t» → «K7Q2MX9P4T» (lo que espera el back) y «K7Q2M-X9P4T» (como se lee). */
function codigoEscrito(segmento: string): { limpio: string; paraLeer: string } {
  const limpio = decodeURIComponent(segmento ?? '').toUpperCase().replace(/[\s-]/g, '');
  return { limpio, paraLeer: limpio.length === 10 ? `${limpio.slice(0, 5)}-${limpio.slice(5)}` : limpio };
}

async function huellaDelArchivo(archivo: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await archivo.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function porcentaje(n: number): string {
  return `${String(n).replace('.', ',')} %`;
}

export default function VerificarFirmaPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo: segmento } = use(params);
  const { limpio, paraLeer } = codigoEscrito(segmento);
  const [r, setR] = useState<DocumentoVerificado | null>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    setR(null);
    setFallo(false);
    firmaPublicaApi.verificar(limpio).then(setR).catch(() => setFallo(true));
  }, [limpio]);

  const vista = fallo ? 'fallo' : !r ? 'comprobando' : r.encontrado ? 'encontrado' : 'no-encontrado';

  return (
    <main className="min-h-screen bg-bg px-4 pb-16 pt-8 sm:pt-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-3 text-center">
          <LeasefyLogotype className="mx-auto h-6 w-auto text-fg" title="Leasefy" />
          <h1 className="text-balance font-heading text-[26px] font-[420] leading-[1.12] tracking-[-0.025em] text-fg sm:text-[30px]">
            Verificar un documento firmado
          </h1>
          <p className="font-mono text-body-sm tabular-nums text-fg-muted" data-testid="codigo-verificado">
            {paraLeer}
          </p>
        </header>

        <Appear>
          <CrossFade swapKey={vista}>
            {vista === 'comprobando' ? (
              <div className="rounded-lg border border-border bg-surface px-6 py-10">
                <CargaDeMarca tamano="md" disposicion="apilada" texto="Buscando el documento…" className="flex text-center" />
              </div>
            ) : null}

            {fallo ? (
              <div className="flex items-start gap-2.5 rounded-lg bg-warning-soft p-4 text-body-sm text-fg" role="alert">
                <WarningCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" weight="fill" aria-hidden="true" />
                <div className="space-y-2">
                  <p>No pudimos comprobarlo en este momento. Intenta de nuevo en un rato.</p>
                  <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                    Intentar de nuevo
                  </Button>
                </div>
              </div>
            ) : null}

            {r && !r.encontrado ? <NoEncontrado codigo={paraLeer} /> : null}
            {r?.encontrado ? <Documento d={r} /> : null}
          </CrossFade>
        </Appear>
      </div>
    </main>
  );
}

function NoEncontrado({ codigo }: { codigo: string }) {
  const router = useRouter();
  const [otro, setOtro] = useState('');
  const ir = (e: FormEvent) => {
    e.preventDefault();
    const limpio = otro.toUpperCase().replace(/[\s-]/g, '');
    if (limpio) router.push(`/verificar-firma/${limpio}`);
  };
  return (
    <div className="space-y-5 rounded-lg border border-border bg-surface p-6" data-testid="documento-no-encontrado">
      <div className="space-y-3">
        <SealWarning className="h-8 w-8 text-danger" aria-hidden="true" />
        <p className="font-heading text-[22px] font-[420] leading-tight tracking-[-0.02em] text-fg">
          No encontramos un documento con ese código
        </p>
        <p className="text-body-sm text-fg-muted">
          Revisa que esté escrito igual que en la hoja de firmas ({codigo || 'sin código'}). Si lo escaneaste del QR y no
          aparece, el documento no se firmó con Leasefy.
        </p>
      </div>
      <form onSubmit={ir} className="flex flex-col gap-2 border-t border-border-faint pt-5 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <label htmlFor="otro-codigo" className="text-caption text-fg-muted">
            Escribe el código de la hoja de firmas
          </label>
          <Input
            id="otro-codigo"
            value={otro}
            onChange={(e) => setOtro(e.target.value)}
            placeholder="K7Q2M-X9P4T"
            className="font-mono uppercase"
            autoComplete="off"
            maxLength={14}
          />
        </div>
        <Button type="submit" disabled={!otro.trim()}>
          Verificar
        </Button>
      </form>
    </div>
  );
}

function Documento({ d }: { d: Encontrado }) {
  const firmaron = d.firmantes.filter((f) => f.firmado).length;
  const todos = d.firmantes.length;
  const veredicto =
    d.estado === 'FIRMADO'
      ? {
          Icono: SealCheck,
          color: 'text-success',
          titulo: 'Es auténtico: lo firmaron todos con Leasefy',
          linea: d.firmadoAt ? `Quedó firmado el ${fechaYHora(d.firmadoAt)}.` : null,
        }
      : d.estado === 'CANCELADO'
        ? {
            Icono: XCircle,
            color: 'text-fg-subtle',
            titulo: `Existe, pero ${d.quienEnvia} lo canceló`,
            linea: d.canceladoAt ? `Se canceló el ${fechaYHora(d.canceladoAt)}. No vale como documento firmado.` : 'No vale como documento firmado.',
          }
        : {
            Icono: Clock,
            color: 'text-warning',
            titulo: 'Existe y todavía le faltan firmas',
            linea: `Firmaron ${firmaron} de ${todos}. Hasta que firmen todos no es un documento firmado.`,
          };
  const { Icono } = veredicto;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-border bg-surface" data-testid="documento-verificado">
        {/* LA respuesta, arriba y en grande. */}
        <div className="flex items-start gap-3 border-b border-border-faint px-6 py-5">
          <Icono className={cn('mt-0.5 h-7 w-7 shrink-0', veredicto.color)} weight="fill" aria-hidden="true" />
          <div className="min-w-0 space-y-1">
            <p className="font-heading text-[20px] font-[420] leading-tight tracking-[-0.015em] text-fg" data-testid="veredicto">
              {veredicto.titulo}
            </p>
            {veredicto.linea ? <p className="text-body-sm text-fg-muted">{veredicto.linea}</p> : null}
          </div>
        </div>

        <div className="space-y-6 p-6">
          <div className="space-y-1">
            <p className="text-h3 text-fg">{d.titulo}</p>
            <p className="text-body-sm text-fg-muted">
              Enviado por {d.quienEnvia} · {d.paginas === 1 ? '1 página' : `${d.paginas} páginas`}
              {d.sellado ? ' · sellado digitalmente' : ''}
            </p>
          </div>

          <div className="space-y-2">
            <p className="font-mono text-label uppercase text-fg-subtle">Quiénes firman</p>
            <ul className="divide-y divide-border-faint rounded-md border border-border" aria-label="Quiénes firman">
              {d.firmantes.map((f, i) => (
                <li key={`${f.nombre}-${i}`} className="space-y-2 px-4 py-3.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="flex items-center gap-2 text-body-sm text-fg">
                      {f.firmado ? (
                        <CheckCircle className="h-4 w-4 shrink-0 text-success" weight="fill" aria-hidden="true" />
                      ) : (
                        <Clock className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                      )}
                      {f.nombre}
                    </p>
                    <p className="text-caption text-fg-muted">
                      {f.firmado && f.firmadoAt ? `Firmó el ${fechaYHora(f.firmadoAt)}` : 'Falta su firma'}
                    </p>
                  </div>
                  {f.firmado ? (
                    <ul className="flex flex-wrap gap-1.5" aria-label={`Cómo se identificó ${f.nombre}`}>
                      {f.conCodigo ? (
                        <Insignia>
                          {f.canales.length > 0 ? `Código por ${f.canales.join(' y ')}` : 'Código de un solo uso'}
                        </Insignia>
                      ) : null}
                      {f.pruebaDeVida ? (
                        <Insignia>
                          {f.pruebaDeVida.proveedor === 'SIMULADA'
                            ? 'Foto (laboratorio)'
                            : `Prueba de vida${f.pruebaDeVida.puntaje !== null ? ` · ${porcentaje(f.pruebaDeVida.puntaje)}` : ''}`}
                        </Insignia>
                      ) : null}
                      <Insignia>Firma en pantalla</Insignia>
                    </ul>
                  ) : null}
                  {f.huella ? (
                    <p className="break-all font-mono text-caption text-fg-subtle">
                      <span className="sr-only">Huella del firmante: </span>
                      {f.huella}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <CompararElArchivo d={d} />

      <MasDetalles etiqueta="Ver las huellas del documento" etiquetaAbierto="Ocultar las huellas" data-testid="huellas">
        <dl className="space-y-4 pt-2">
          <Huella rotulo="Del documento firmado (con la hoja de firmas)" valor={d.huellas.firmado} />
          <Huella rotulo="Del documento sellado" valor={d.huellas.sellado} extra={d.sellado ? `Sellado el ${fechaYHora(d.sellado.at)}` : null} />
          <Huella rotulo="Del original que se subió" valor={d.huellas.original} />
        </dl>
        <p className="pt-4 text-caption text-fg-subtle">
          La huella SHA-256 es como la cédula del archivo: si le cambian una sola letra, la huella cambia. Cada hoja del
          documento firmado lleva la huella del original al pie.
        </p>
      </MasDetalles>

      <p className="text-center text-caption text-fg-subtle">
        Leasefy guarda la evidencia de cada firma (Ley 527 de 1999). Esta página muestra sólo lo necesario para verificar:
        ni correos, ni celulares, ni fotos.
      </p>
    </div>
  );
}

function Insignia({ children }: { children: React.ReactNode }) {
  return <li className="rounded-full bg-surface-muted px-2.5 py-0.5 text-caption text-fg-muted">{children}</li>;
}

function Huella({ rotulo, valor, extra }: { rotulo: string; valor: string | null; extra?: string | null }) {
  const [copiada, setCopiada] = useState(false);
  if (!valor) return null;
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiada(true);
      setTimeout(() => setCopiada(false), 2000);
    } catch {
      /* sin portapapeles: el texto queda a la vista para copiarlo a mano */
    }
  };
  return (
    <div className="min-w-0 space-y-1">
      <dt className="text-caption text-fg-muted">
        {rotulo}
        {extra ? ` · ${extra}` : ''}
      </dt>
      <dd className="flex items-start gap-2">
        <span className="min-w-0 flex-1 break-all font-mono text-body-sm text-fg">{valor}</span>
        <Button variant="ghost" size="sm" onClick={() => void copiar()} aria-label={`Copiar la huella ${rotulo.toLowerCase()}`}>
          <Copy className="mr-1 h-4 w-4" aria-hidden="true" /> {copiada ? 'Copiada' : 'Copiar'}
        </Button>
      </dd>
    </div>
  );
}

type Comparacion = 'FIRMADO' | 'SELLADO' | 'ORIGINAL' | 'DISTINTO';

function CompararElArchivo({ d }: { d: Encontrado }) {
  const input = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [resultado, setResultado] = useState<Comparacion | null>(null);
  const [error, setError] = useState<string | null>(null);

  const elegir = async (f: File | null) => {
    setArchivo(f);
    setResultado(null);
    setError(null);
    if (!f) return;
    setCalculando(true);
    try {
      const h = await huellaDelArchivo(f);
      setResultado(
        h === d.huellas.sellado ? 'SELLADO' : h === d.huellas.firmado ? 'FIRMADO' : h === d.huellas.original ? 'ORIGINAL' : 'DISTINTO',
      );
    } catch {
      setError('No pudimos leer ese archivo. Prueba con otro.');
    } finally {
      setCalculando(false);
    }
  };

  const RESULTADOS: Record<Comparacion, { tono: string; color: string; Icono: typeof CheckCircle; titulo: string; linea: string }> = {
    SELLADO: {
      tono: 'bg-success-soft',
      color: 'text-success',
      Icono: SealCheck,
      titulo: 'Es exactamente el documento firmado y sellado',
      linea: 'No le cambiaron nada desde que firmaron todos.',
    },
    FIRMADO: {
      tono: 'bg-success-soft',
      color: 'text-success',
      Icono: CheckCircle,
      titulo: 'Es exactamente el documento firmado',
      linea: 'No le cambiaron nada desde que firmaron todos.',
    },
    ORIGINAL: {
      tono: 'bg-info-soft',
      color: 'text-info',
      Icono: FileMagnifyingGlass,
      titulo: 'Es el original, antes de firmarlo',
      linea: 'Es el mismo documento que se subió, pero sin la hoja de firmas. El que vale es el firmado.',
    },
    DISTINTO: {
      tono: 'bg-danger-soft',
      color: 'text-danger',
      Icono: WarningCircle,
      titulo: 'Este archivo no es el que se firmó',
      linea: 'Su huella no coincide con la del documento firmado ni con la del original: le cambiaron algo, o es otro documento.',
    },
  };
  const r = resultado ? RESULTADOS[resultado] : null;

  return (
    <section className="space-y-4 rounded-lg border border-border bg-surface p-6" aria-labelledby="comparar-titulo" data-testid="comparar-archivo">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Ilustracion nombre="lupa" tono="voltaje" tamano={56} className="hidden shrink-0 sm:block" />
          <div className="space-y-1">
            <h2 id="comparar-titulo" className="text-h3 text-fg">
              Compara tu archivo
            </h2>
            <p className="text-body-sm text-fg-muted">
              Elige el PDF que te mandaron. Tu navegador saca su huella y la compara: el archivo no se sube a ningún lado.
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <input
            ref={input}
            id="archivo-a-comparar"
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            data-testid="archivo-a-comparar"
            onChange={(e) => void elegir(e.target.files?.[0] ?? null)}
          />
          <Button variant="outline" onClick={() => input.current?.click()} isLoading={calculando} className="w-full sm:w-auto">
            {archivo ? 'Elegir otro PDF' : 'Elegir el PDF'}
          </Button>
        </div>
      </div>
      {archivo && !calculando && !error ? (
        <p className="truncate text-caption text-fg-subtle">{archivo.name}</p>
      ) : null}
      {error ? <p className="text-body-sm text-danger">{error}</p> : null}
      <Presence show={Boolean(r)}>
        {r ? (
          <div className={cn('flex items-start gap-3 rounded-md p-4', r.tono)} role="status" data-testid="resultado-de-la-comparacion">
            <r.Icono className={cn('mt-0.5 h-5 w-5 shrink-0', r.color)} weight="fill" aria-hidden="true" />
            <div className="space-y-0.5">
              <p className="text-body-sm text-fg">{r.titulo}</p>
              <p className="text-body-sm text-fg-muted">{r.linea}</p>
            </div>
          </div>
        ) : null}
      </Presence>
    </section>
  );
}
