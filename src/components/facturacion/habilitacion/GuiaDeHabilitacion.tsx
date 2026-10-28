'use client';

/**
 * «Activa tu facturación electrónica» (Nico, 28-10-2026): «algo increíble… un paso a paso que le diga: primer paso es
 * esto, ve y hazlo y espera hasta que lo tenga, y así hasta que termine todo». Para dejar a Feel (BPM Consulting) como
 * proveedor tecnológico ante la DIAN sin que nadie de Leasefy ni de Feel tenga que acompañar.
 *
 * Disposición: arriba el avance; a la izquierda el riel de los 9 pasos (en qué va, quién lo hace); a la derecha el paso
 * abierto, grande, con su ilustración, lo que hay que hacer en la DIAN con los botones tal como salen allá, lo que hay que
 * copiar a un toque y UNA acción en voltaje. Lo que depende de Feel se ve «esperando», y no se le insiste a la persona.
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowSquareOut, Check, CircleNotch, Clock, Warning } from '@phosphor-icons/react';
import { CopyButton, FileDropzone, Ilustracion, StatusBadge } from '@leasefy/cadence';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { habilitacionApi, type ClaveDelPaso, type VistaDeLaHabilitacion } from '@/lib/api/habilitacion-de-facturacion.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { cn } from '@/lib/utils';
import { BOTON_DE_HECHO, PASOS_DE_LA_GUIA } from './pasos-de-la-guia';

const ESTADO: Record<string, { texto: string; tono: 'success' | 'info' | 'warning' | 'neutral' }> = {
  hecho: { texto: 'Hecho', tono: 'success' },
  'te-toca': { texto: 'Te toca', tono: 'info' },
  esperando: { texto: 'Esperando a Feel', tono: 'warning' },
  despues: { texto: 'Después', tono: 'neutral' },
  'no-aplica': { texto: 'No aplica', tono: 'neutral' },
};

/** `**texto**` → el nombre exacto del botón de la DIAN, resaltado. */
function ConBotones({ texto }: { texto: string }) {
  const partes = texto.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {partes.map((p, i) =>
        i % 2 ? (
          <span key={i} className="rounded-md bg-surface-muted px-1.5 py-0.5 font-medium text-fg">
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function Copiable({ rotulo, valor, mono = false }: { rotulo: string; valor: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-2.5">
      <div className="min-w-0">
        <p className="text-label uppercase text-fg-subtle">{rotulo}</p>
        <p className={cn('truncate text-body-sm text-fg', mono && 'font-mono')}>{valor}</p>
      </div>
      <CopyButton text={valor} label="Copiar" copiedLabel="Copiado" size="sm" variant="ghost" />
    </div>
  );
}

export function GuiaDeHabilitacion() {
  const [vista, setVista] = useState<VistaDeLaHabilitacion | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [abierto, setAbierto] = useState<ClaveDelPaso | null>(null);
  const [haciendo, setHaciendo] = useState<string | null>(null);
  const [testSetId, setTestSetId] = useState('');

  const leer = useCallback(async () => {
    try {
      const v = await habilitacionApi.vista();
      setVista(v);
      setError(null);
      setAbierto((a) => a ?? v.siguiente ?? 'antes');
    } catch (e) {
      setError(e);
    }
  }, []);
  useEffect(() => {
    void leer();
  }, [leer]);

  const hacer = async (clave: string, accion: () => Promise<VistaDeLaHabilitacion>, exito: string, siguiente = true) => {
    setHaciendo(clave);
    try {
      const v = await accion();
      setVista(v);
      toast.success(exito);
      if (siguiente && v.siguiente) setAbierto(v.siguiente);
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: 'No se pudo. Intenta de nuevo.', accion: 'guardar el paso' }));
    } finally {
      setHaciendo(null);
    }
  };

  const indice = useMemo(() => (vista && abierto ? vista.pasos.findIndex((p) => p.clave === abierto) : -1), [vista, abierto]);

  if (error && !vista) return <FalloDeCarga error={error} queEs="la guía de la facturación electrónica" onReintentar={leer} />;
  if (!vista) {
    return (
      <div className="space-y-6 p-6 lg:p-8" aria-busy="true">
        <div className="h-8 w-80 animate-pulse rounded-lg bg-surface-muted" />
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="h-[520px] animate-pulse rounded-2xl bg-surface-muted" />
          <div className="h-[520px] animate-pulse rounded-2xl bg-surface-muted" />
        </div>
      </div>
    );
  }

  if (!vista.disponible) {
    return (
      <div className="space-y-6 p-6 lg:p-8" data-testid="guia-pronto">
        <EncabezadoDePantalla seccion="Facturación" titulo="Activa tu facturación electrónica" />
        <div className="flex flex-col items-center rounded-2xl border border-border bg-surface px-6 py-12 text-center">
          <Ilustracion nombre="factura" tamano={140} />
          <p className="mt-4 text-h3 text-fg">Se está activando</p>
          <p className="mt-1 max-w-md text-body-sm text-fg-muted">{vista.motivo ?? 'Vuelve en un rato.'}</p>
        </div>
      </div>
    );
  }

  const paso = vista.pasos[indice] ?? vista.pasos[0];
  const texto = PASOS_DE_LA_GUIA[paso.clave];
  const numero = vista.pasos.findIndex((p) => p.clave === paso.clave) + 1;

  return (
    <div className="space-y-6 p-6 lg:p-8" data-testid="guia-de-habilitacion">
      <EncabezadoDePantalla
        seccion="Facturación"
        titulo="Activa tu facturación electrónica"
        descripcion="Paso a paso para dejar a Feel como tu proveedor ante la DIAN. Lo haces tú, a tu ritmo; Leasefy te dice qué sigue."
        junto={
          <StatusBadge tone={vista.termino ? 'success' : 'info'} data-testid="guia-avance">
            {vista.termino ? 'Lista' : `${vista.avance.hechos} de ${vista.avance.total}`}
          </StatusBadge>
        }
      />

      {/* El avance: un tramo por paso. */}
      <div className="flex gap-1" aria-hidden="true">
        {vista.pasos.map((p) => (
          <span
            key={p.clave}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors duration-base',
              p.estado === 'hecho' || p.estado === 'no-aplica'
                ? 'bg-primary'
                : p.estado === 'esperando'
                  ? 'bg-warning/60'
                  : p.clave === paso.clave
                    ? 'bg-primary/30'
                    : 'bg-surface-muted',
            )}
          />
        ))}
      </div>

      {vista.termino ? (
        <div className="flex flex-col items-center rounded-2xl border border-border bg-surface px-6 py-12 text-center" data-testid="guia-lista">
          <Ilustracion nombre="pago_confirmado" tamano={160} />
          <p className="mt-4 text-h2 text-fg">¡Listo, ya facturas electrónicamente!</p>
          <p className="mt-1 max-w-lg text-body-sm text-fg-muted">
            Feel es tu proveedor ante la DIAN y Leasefy ve tu numeración. Tus facturas salen solas y validadas.
          </p>
          <Button asChild hideArrow className="mt-6">
            <Link href="/panel/inmobiliaria/facturacion">Ir a Facturación</Link>
          </Button>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* El riel de los pasos. */}
        <nav aria-label="Pasos" className="h-fit rounded-2xl border border-border bg-surface p-2" data-testid="guia-riel">
          <ol className="space-y-0.5">
            {vista.pasos.map((p, i) => {
              const t = PASOS_DE_LA_GUIA[p.clave];
              const activo = p.clave === paso.clave;
              const listo = p.estado === 'hecho' || p.estado === 'no-aplica';
              return (
                <li key={p.clave}>
                  <button
                    type="button"
                    onClick={() => setAbierto(p.clave)}
                    aria-current={activo ? 'step' : undefined}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-instant',
                      activo ? 'bg-surface-muted' : 'hover:bg-surface-muted/60',
                    )}
                    data-testid={`guia-paso-${p.clave}`}
                  >
                    <span
                      className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-caption tabular-nums',
                        listo ? 'bg-primary text-white' : p.estado === 'esperando' ? 'bg-warning-soft text-warning' : activo ? 'ring-2 ring-primary text-primary' : 'bg-surface-muted text-fg-subtle',
                      )}
                    >
                      {listo ? <Check size={14} weight="bold" aria-hidden="true" /> : p.estado === 'esperando' ? <Clock size={14} aria-hidden="true" /> : i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block truncate text-body-sm', listo ? 'text-fg-muted' : 'text-fg')}>{t.titulo}</span>
                      <span className="block text-caption text-fg-subtle">
                        {p.estado === 'no-aplica' ? 'Ya lo tienes' : p.quien === 'feel' ? 'Lo hace Feel' : t.tiempo}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* El paso abierto. */}
        <section className="rounded-2xl border border-border bg-surface" aria-labelledby="guia-titulo-del-paso" data-testid={`guia-detalle-${paso.clave}`}>
          <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start lg:p-8">
            <Ilustracion nombre={texto.ilustracion} tamano={120} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-label uppercase text-fg-subtle">
                Paso {numero} de {vista.pasos.length} · {texto.tiempo}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h2 id="guia-titulo-del-paso" className="text-h2 text-fg">
                  {texto.titulo}
                </h2>
                <StatusBadge tone={ESTADO[paso.estado].tono}>{ESTADO[paso.estado].texto}</StatusBadge>
              </div>
              <p className="mt-2 max-w-2xl text-body-sm text-fg-muted">{texto.porque}</p>
            </div>
          </div>

          <div className="space-y-6 border-t border-border-faint p-6 lg:p-8">
            {paso.estado === 'esperando' && texto.espera ? (
              <p className="flex items-start gap-2.5 rounded-xl bg-warning-soft px-4 py-3 text-body-sm text-fg" data-testid="guia-esperando">
                <CircleNotch size={16} className="mt-0.5 shrink-0 animate-spin text-warning motion-reduce:animate-none" aria-hidden="true" />
                {texto.espera}
              </p>
            ) : null}

            <ol className="space-y-3">
              {texto.instrucciones.map((linea, i) => (
                <li key={i} className="flex gap-3 text-body-sm leading-relaxed text-fg">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-muted font-mono text-[11px] text-fg-muted">
                    {i + 1}
                  </span>
                  <span>
                    <ConBotones texto={linea} />
                  </span>
                </li>
              ))}
            </ol>

            {texto.ojo?.length ? (
              <div className="space-y-1.5 rounded-xl border border-border px-4 py-3">
                {texto.ojo.map((o, i) => (
                  <p key={i} className="flex items-start gap-2 text-body-sm text-fg-muted">
                    <Warning size={15} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
                    <span>
                      <ConBotones texto={o} />
                    </span>
                  </p>
                ))}
              </div>
            ) : null}

            <LoDelPaso
              clave={paso.clave}
              vista={vista}
              haciendo={haciendo}
              testSetId={testSetId}
              setTestSetId={setTestSetId}
              hacer={hacer}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-faint px-6 py-4 lg:px-8">
            <div>
              {texto.abre ? (
                <Button asChild variant="outline" size="sm" hideArrow>
                  <a href={vista.enlaces[texto.abre]} target="_blank" rel="noopener noreferrer" data-testid="guia-abrir-dian">
                    {texto.textoDelEnlace} <ArrowSquareOut className="ml-1.5 h-4 w-4" aria-hidden="true" />
                  </a>
                </Button>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {paso.seMarca && paso.estado === 'hecho' ? (
                <Button
                  variant="ghost"
                  size="sm"
                  hideArrow
                  disabled={haciendo !== null}
                  onClick={() => void hacer(`deshacer-${paso.clave}`, () => habilitacionApi.marcar(paso.clave, false), 'Listo, lo volviste a abrir', false)}
                >
                  Deshacer
                </Button>
              ) : null}
              {paso.seMarca && paso.estado !== 'hecho' ? (
                <Button
                  hideArrow
                  isLoading={haciendo === `marcar-${paso.clave}`}
                  disabled={haciendo !== null}
                  onClick={() => void hacer(`marcar-${paso.clave}`, () => habilitacionApi.marcar(paso.clave, true), '¡Bien! Sigue el próximo paso.')}
                  data-testid="guia-ya-lo-hice"
                >
                  {BOTON_DE_HECHO[paso.clave] ?? 'Ya lo hice'}
                </Button>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/** Lo propio de cada paso: subir el RUT, pegar el código, copiar el proveedor, los prefijos, la resolución. */
function LoDelPaso({
  clave,
  vista,
  haciendo,
  testSetId,
  setTestSetId,
  hacer,
}: {
  clave: ClaveDelPaso;
  vista: VistaDeLaHabilitacion;
  haciendo: string | null;
  testSetId: string;
  setTestSetId: (v: string) => void;
  hacer: (clave: string, accion: () => Promise<VistaDeLaHabilitacion>, exito: string, siguiente?: boolean) => Promise<void>;
}): ReactNode {
  if (clave === 'antes') {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <fieldset className="rounded-xl border border-border px-4 py-3">
          <legend className="px-1 text-label uppercase text-fg-subtle">¿Ya facturas electrónicamente?</legend>
          <div className="mt-1 flex gap-2">
            {[false, true].map((v) => (
              <Button
                key={String(v)}
                size="sm"
                variant={vista.yaFacturaConOtro === v ? 'secondary' : 'ghost'}
                hideArrow
                aria-pressed={vista.yaFacturaConOtro === v}
                disabled={haciendo !== null}
                onClick={() => void hacer('ajustar', () => habilitacionApi.contarDeLaInmobiliaria({ yaFacturaConOtro: v }), 'Guardado', false)}
              >
                {v ? 'Sí, con otro proveedor' : 'No, es la primera vez'}
              </Button>
            ))}
          </div>
        </fieldset>
        <fieldset className="rounded-xl border border-border px-4 py-3">
          <legend className="px-1 text-label uppercase text-fg-subtle">Facturas como</legend>
          <div className="mt-1 flex gap-2">
            {(['EMPRESA', 'PERSONA'] as const).map((v) => (
              <Button
                key={v}
                size="sm"
                variant={vista.tipoDePersona === v ? 'secondary' : 'ghost'}
                hideArrow
                aria-pressed={vista.tipoDePersona === v}
                disabled={haciendo !== null}
                onClick={() => void hacer('ajustar', () => habilitacionApi.contarDeLaInmobiliaria({ tipoDePersona: v }), 'Guardado', false)}
              >
                {v === 'EMPRESA' ? 'Empresa' : 'Persona natural'}
              </Button>
            ))}
          </div>
        </fieldset>
      </div>
    );
  }
  if (clave === 'rut') {
    return vista.rut.subido ? (
      <p className="flex items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-body-sm text-fg" data-testid="guia-rut-subido">
        <Check size={16} weight="bold" className="text-success" aria-hidden="true" />
        Tu RUT ya está. {vista.rut.avisoAFeel === 'ENVIADO' ? 'Se lo mandamos a Feel.' : 'Lo tenemos y se lo pasamos a Feel.'}
      </p>
    ) : (
      <FileDropzone
        accept="application/pdf,.pdf"
        hint="El PDF del RUT, hasta 5 MB."
        onFiles={(lista) => {
          const f = lista[0];
          if (!f) return;
          if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') return void toast.error('El RUT tiene que ser el PDF de la DIAN.');
          void hacer('rut', () => habilitacionApi.subirRut(f), 'Listo: le mandamos tu RUT a Feel.');
        }}
      />
    );
  }
  if (clave === 'proveedor') {
    return (
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <Copiable rotulo="Empresa proveedora" valor={vista.proveedor.empresa} />
          <Copiable rotulo="NIT" valor={vista.proveedor.nit} mono />
          <Copiable rotulo="Software" valor={vista.proveedor.software} />
        </div>
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void hacer('test', () => habilitacionApi.testSetId(testSetId), 'Listo: le mandamos el código a Feel.');
          }}
        >
          <label htmlFor="guia-test-set-id" className="sr-only">
            Código del set de pruebas (TestSetId)
          </label>
          <Input
            id="guia-test-set-id"
            value={testSetId || vista.testSetId.valor || ''}
            onChange={(e) => setTestSetId(e.target.value)}
            placeholder="Pega aquí el TestSetId (ej.: a70562e0-631e-4ceb-…)"
            className="font-mono"
            data-testid="guia-test-set-id"
          />
          <Button type="submit" hideArrow isLoading={haciendo === 'test'} disabled={haciendo !== null || !testSetId.trim()} data-testid="guia-guardar-test-set-id">
            Mandárselo a Feel
          </Button>
        </form>
      </div>
    );
  }
  if (clave === 'numeracion') {
    return (
      <div className="overflow-hidden rounded-xl border border-border" data-testid="guia-prefijos">
        <table className="w-full text-body-sm">
          <thead className="bg-surface-muted text-left">
            <tr className="text-label uppercase text-fg-subtle">
              <th className="px-4 py-2 font-normal">Prefijo</th>
              <th className="px-4 py-2 font-normal">Para</th>
              <th className="px-4 py-2 text-right font-normal">Desde</th>
              <th className="px-4 py-2 text-right font-normal">Hasta</th>
            </tr>
          </thead>
          <tbody>
            {vista.prefijos.map((p) => (
              <tr key={p.tipo} className="border-t border-border-faint">
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center gap-1 font-mono text-fg">
                    {p.prefijo}
                    <CopyButton text={p.prefijo} label="Copiar" copiedLabel="Copiado" size="sm" variant="ghost" />
                  </span>
                </td>
                <td className="px-4 py-2.5 text-fg-muted">{p.yaLaTiene ? `${p.nombre} · ya la tienes` : p.nombre}</td>
                <td className="px-4 py-2.5 text-right font-mono tabular-nums">{p.desde.toLocaleString('es-CO')}</td>
                <td className="px-4 py-2.5 text-right font-mono tabular-nums">{p.hasta.toLocaleString('es-CO')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (clave === 'resolucion') {
    return (
      <Button asChild hideArrow data-testid="guia-cargar-resolucion">
        <Link href="/panel/inmobiliaria/facturacion?tab=resolucion">Cargar la resolución</Link>
      </Button>
    );
  }
  if (clave === 'asociar') {
    return <Copiable rotulo="Proveedor – Software" valor={`${vista.proveedor.empresa} – ${vista.proveedor.software}`} />;
  }
  return null;
}
