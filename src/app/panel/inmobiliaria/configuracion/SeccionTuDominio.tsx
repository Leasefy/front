'use client';

/**
 * «Tu dominio» (Nico, 31-10-2026: «debemos de dar la posibilidad de que la inmobiliaria ponga su propio dominio si
 * quiere para que cuando lo comparta sea ese dominio y no el de leasefy»). Su página y las fichas de sus inmuebles en
 * SU dominio; sólo en los planes de pago. Va debajo de «Tu página».
 *
 * El recorrido: escribe el dominio → Leasefy lo da de alta y le dice qué registros crear donde compró el dominio
 * (cada uno con su «Copiar») → «Ya los creé» vuelve a mirar → activo: lo que comparte sale con su dominio.
 * Las rutas viven en `lib/api/dominio-propio.service.ts`; la regla del dominio, en `lib/dominio-propio/dominio.ts`.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowSquareOut, Check, Copy, Globe } from '@phosphor-icons/react';
import { Presence, StatusBadge } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { toast } from '@/components/ui/toast';
import { dominioPropioApi, type DominioPropio, type RegistroDelDns } from '@/lib/api/dominio-propio.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { normalizarDominio, problemaDelDominio } from '@/lib/dominio-propio/dominio';
import { olvidarElDominioActivo } from '@/lib/dominio-propio/use-dominio-activo';

export function SeccionTuDominio() {
  const [d, setD] = useState<DominioPropio | null>(null);
  const [fallo, setFallo] = useState<unknown>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vivo = true;
    setFallo(null);
    dominioPropioApi
      .ver()
      .then((r) => vivo && setD(r))
      .catch((e) => vivo && setFallo(e));
    return () => {
      vivo = false;
    };
  }, [intento]);

  const cambio = useCallback((r: DominioPropio) => {
    olvidarElDominioActivo();
    setD(r);
  }, []);

  return (
    <section className="space-y-4 border-t border-border pt-8" aria-labelledby="tu-dominio-titulo" data-testid="seccion-tu-dominio">
      <div className="space-y-1">
        <h2 id="tu-dominio-titulo" className="text-h3 text-fg">
          Tu dominio
        </h2>
        <p className="max-w-[64ch] text-body-sm text-fg-muted">
          Tu página y las fichas de tus inmuebles en tu propio dominio, por ejemplo <span className="font-mono">inmuebles.tuinmobiliaria.com</span>.
          Lo que compartas sale con él, no con leasefy.co.
        </p>
      </div>

      {fallo ? (
        <FalloDeCarga error={fallo} queEs="tu dominio" onReintentar={() => setIntento((n) => n + 1)} />
      ) : !d ? (
        <div className="space-y-2" aria-busy="true" data-testid="tu-dominio-cargando">
          <div className="h-11 w-full max-w-md animate-pulse rounded-lg bg-surface-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-surface-muted" />
        </div>
      ) : !d.disponible ? (
        <p className="rounded-lg border border-border bg-surface-muted p-4 text-body-sm text-fg-muted" data-testid="tu-dominio-no-disponible">
          Todavía no se puede conectar un dominio: Leasefy tiene pendiente una actualización. Cuando esté, lo haces aquí
          mismo en dos minutos.
        </p>
      ) : !d.puedeUsarlo ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted p-4 sm:flex-row sm:items-center sm:justify-between" data-testid="tu-dominio-plan">
          <p className="text-body-sm text-fg">
            Tu propio dominio viene con los planes de pago de Leasefy. Mientras tanto, tu página es{' '}
            <span className="font-mono">leasefy.co/i/…</span>
          </p>
          <Button asChild variant="secondary" hideArrow className="shrink-0">
            <Link href="/panel/inmobiliaria/upgrade">Ver los planes</Link>
          </Button>
        </div>
      ) : d.estado === 'SIN_DOMINIO' || !d.dominio ? (
        <ConectarDominio onCambio={cambio} />
      ) : (
        <DominioConectado d={d} onCambio={cambio} />
      )}
    </section>
  );
}

function ConectarDominio({ onCambio }: { onCambio: (d: DominioPropio) => void }) {
  const [texto, setTexto] = useState('');
  const [tocado, setTocado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [delServidor, setDelServidor] = useState<string | null>(null);
  const problema = problemaDelDominio(texto);
  const error = delServidor ?? (tocado ? problema : null);

  async function conectar() {
    setTocado(true);
    if (problema) return;
    setGuardando(true);
    setDelServidor(null);
    try {
      const r = await dominioPropioApi.guardar(normalizarDominio(texto));
      onCambio(r);
      toast.success('Conectamos tu dominio', { description: 'Ahora crea los registros que te mostramos donde compraste el dominio.' });
    } catch (e) {
      setDelServidor(mensajeParaLaPersona(e, { porDefecto: 'No pudimos conectar tu dominio.', accion: 'conectar tu dominio' }));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form
      className="max-w-xl space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        void conectar();
      }}
      data-testid="conectar-dominio"
    >
      <label htmlFor="dominio-propio" className="block text-body-sm font-medium text-fg">
        Tu dominio
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex min-w-0 flex-1 items-center rounded-lg border border-border bg-surface focus-within:border-primary" data-invalid={error ? '' : undefined}>
          <span className="pl-3 font-mono text-[13px] text-fg-subtle">https://</span>
          <input
            id="dominio-propio"
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setDelServidor(null);
            }}
            onBlur={() => {
              setTocado(true);
              if (texto) setTexto(normalizarDominio(texto));
            }}
            placeholder="inmuebles.tuinmobiliaria.com"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            aria-describedby="dominio-propio-ayuda dominio-propio-error"
            className="h-11 min-w-0 flex-1 bg-transparent pr-3 font-mono text-[14px] text-fg focus:outline-none"
          />
        </div>
        <Button type="submit" variant="ink" hideArrow disabled={guardando} className="shrink-0" data-testid="conectar-dominio-boton">
          {guardando ? 'Conectando…' : 'Conectar mi dominio'}
        </Button>
      </div>
      <ErrorDelCampo id="dominio-propio-error" mensaje={error} />
      <p id="dominio-propio-ayuda" className="text-caption text-fg-muted">
        Usa un subdominio como <span className="font-mono">inmuebles.</span> o <span className="font-mono">www.</span>: tu
        página web de siempre sigue igual y sólo ese dominio pasa a Leasefy.
      </p>
    </form>
  );
}

function DominioConectado({ d, onCambio }: { d: DominioPropio; onCambio: (d: DominioPropio) => void }) {
  const [revisando, setRevisando] = useState(false);
  const [quitando, setQuitando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const activo = d.estado === 'ACTIVO';

  async function revisar() {
    setRevisando(true);
    try {
      const r = await dominioPropioApi.verificar();
      onCambio(r);
      if (r.estado === 'ACTIVO') toast.success('Tu dominio quedó activo', { description: `Tu página ya se ve en ${r.dominio}.` });
      else toast.info('Todavía no vemos los registros', { description: 'El DNS puede tardar unos minutos (a veces hasta un día). Vuelve a revisar en un rato.' });
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: 'No pudimos revisar tu dominio.', accion: 'revisar tu dominio' }));
    } finally {
      setRevisando(false);
    }
  }

  async function quitar() {
    setQuitando(true);
    try {
      const r = await dominioPropioApi.quitar();
      setConfirmar(false);
      onCambio(r);
      toast.success('Quitamos tu dominio', { description: 'Tu página vuelve a leasefy.co y lo que compartas sale con ese enlace.' });
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: 'No pudimos quitar tu dominio.', accion: 'quitar tu dominio' }));
    } finally {
      setQuitando(false);
    }
  }

  return (
    <Presence show>
      <div className="space-y-5" data-testid="dominio-conectado">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            {/* El dominio entero, aunque sea largo: es lo que la persona compara con su proveedor (QA 390, 31-10). */}
            <p className="flex items-start gap-2">
              <Globe className="mt-1 h-4 w-4 shrink-0 text-fg-muted" aria-hidden />
              <span className="min-w-0 break-all font-mono text-body text-fg" data-testid="dominio-conectado-nombre">
                {d.dominio}
              </span>
            </p>
            <StatusBadge tone={activo ? 'success' : 'warning'}>{activo ? 'Activo' : 'Esperando el DNS'}</StatusBadge>
            <p className="text-caption text-fg-muted">
              {activo
                ? 'Tu página y las fichas que compartas salen con este dominio.'
                : 'Falta crear los registros de abajo donde compraste el dominio.'}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {activo && d.enlace ? (
              <Button asChild variant="secondary" hideArrow>
                <a href={d.enlace} target="_blank" rel="noreferrer noopener">
                  Ver mi página
                  <ArrowSquareOut className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                </a>
              </Button>
            ) : (
              <Button type="button" variant="ink" hideArrow onClick={() => void revisar()} disabled={revisando} data-testid="dominio-revisar">
                {revisando ? 'Revisando…' : 'Ya los creé, revisar'}
              </Button>
            )}
          </div>
        </div>

        {!activo && d.registros.length > 0 ? (
          <div className="space-y-3" data-testid="dominio-registros">
            <ol className="space-y-1 text-body-sm text-fg">
              <li>1. Entra a donde compraste tu dominio (GoDaddy, Hostinger, Google, tu proveedor de hosting…).</li>
              <li>2. En «DNS» o «Zona DNS», crea {d.registros.length === 1 ? 'este registro' : 'estos registros'}:</li>
            </ol>
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
              {d.registros.map((r) => (
                <RegistroParaCopiar key={`${r.tipo}-${r.nombre}-${r.valor}`} r={r} />
              ))}
            </div>
            <p className="text-caption text-fg-muted">
              3. Vuelve aquí y toca «Ya los creé, revisar». El DNS suele tardar unos minutos; a veces, hasta un día.
            </p>
          </div>
        ) : null}

        <div>
          <Button type="button" variant="ghost" hideArrow className="text-fg-muted" onClick={() => setConfirmar(true)} data-testid="dominio-quitar">
            Quitar mi dominio
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmar} onOpenChange={(o) => !quitando && setConfirmar(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar {d.dominio}?</AlertDialogTitle>
            <AlertDialogDescription>
              Tu página vuelve a leasefy.co/i/… y los enlaces que ya compartiste con este dominio dejan de abrir. Lo
              puedes volver a conectar cuando quieras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={quitando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void quitar();
              }}
              disabled={quitando}
              data-testid="dominio-quitar-confirmar"
            >
              {quitando ? 'Quitando…' : 'Quitar el dominio'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Presence>
  );
}

const PARA_QUE: Record<RegistroDelDns['para'], string> = {
  apuntar: 'Lleva tu dominio a Leasefy',
  verificar: 'Prueba que el dominio es tuyo',
};

function RegistroParaCopiar({ r }: { r: RegistroDelDns }) {
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-[5rem_minmax(0,1fr)_minmax(0,1.6fr)] sm:items-start" data-testid={`registro-${r.tipo}`}>
      <div>
        <p className="font-mono text-caption uppercase tracking-[0.06em] text-fg-subtle">Tipo</p>
        <p className="font-mono text-body text-fg">{r.tipo}</p>
      </div>
      <DatoParaCopiar rotulo="Nombre" valor={r.nombre} />
      <div className="min-w-0 space-y-1">
        <DatoParaCopiar rotulo="Valor" valor={r.valor} />
        <p className="text-caption text-fg-muted">{PARA_QUE[r.para]}</p>
      </div>
    </div>
  );
}

function DatoParaCopiar({ rotulo, valor }: { rotulo: string; valor: string }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1800);
    } catch {
      toast.error('El navegador no dejó copiarlo', { description: 'Selecciónalo y cópialo a mano.' });
    }
  }
  return (
    <div className="min-w-0">
      <p className="font-mono text-caption uppercase tracking-[0.06em] text-fg-subtle">{rotulo}</p>
      <div className="flex items-center gap-1.5">
        <p className="min-w-0 break-all font-mono text-body text-fg">{valor}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          hideArrow
          onClick={() => void copiar()}
          aria-label={`Copiar ${rotulo.toLowerCase()}: ${valor}`}
          className="h-8 shrink-0 px-2"
        >
          {copiado ? <Check className="h-4 w-4 text-success" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        </Button>
      </div>
    </div>
  );
}
