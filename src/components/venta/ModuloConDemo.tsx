'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle, PlayCircle, Sparkle, WhatsappLogo } from '@phosphor-icons/react';
import { motionDuration, motionEase } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { DemoDelModulo } from '@/lib/venta/demos-del-panel';
import { enlaceDeWhatsApp, type QuienCompra } from '@/lib/venta/whatsapp-de-leasefy';
import { cn } from '@/lib/utils';

/**
 * Lo que ve en una parte cerrada quien llegó por el marketplace y todavía no es
 * cliente (Nico, 20-10-2026): «que le muestre todo pero deshabilitado, que pueda
 * ver demos de cómo quedaría su inmobiliaria, y que la intención de compra lleve
 * a nuestro WhatsApp». Sin precio: se habla por WhatsApp. La demo sólo al tocar
 * «Ver demo», con las pantallas reales del producto y SU nombre arriba.
 */
export function ModuloConDemo({
  demo,
  quien,
  nombre,
  empresa,
  queVio,
  yaEsCliente,
}: {
  demo: DemoDelModulo;
  quien: QuienCompra;
  /** Nombre de pila de quien mira. */
  nombre?: string | null;
  /** La inmobiliaria (o el nombre del propietario) para el marco de la demo y el mensaje. */
  empresa?: string | null;
  /** Lo que estaba mirando («Cobranza»). */
  queVio?: string | null;
  /** «¿Ya eres cliente?»: a dónde va quien ya habló con Leasefy. */
  yaEsCliente?: { href: string; texto: string };
}) {
  const [verDemo, setVerDemo] = useState(false);
  const whatsapp = enlaceDeWhatsApp({ quien, nombre, empresa, queVio });
  const llamado = quien === 'inmobiliaria' ? 'Quiero que Leasefy maneje mi inmobiliaria' : 'Quiero que Leasefy administre mi inmueble';
  const portada = demo.capturas[0]?.src;

  return (
    // Revisora r24/r25 (B-V): a 390 el texto se cortaba («…si se atrasa [lo]»): la grilla con su columna (grid-cols-1,
    // min-w-0) y los botones que parten el renglón a lo ancho.
    <section className="px-4 py-8 sm:px-6 lg:px-8 lg:py-12" data-testid="modulo-con-demo">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: motionDuration.slow, ease: motionEase.enter }}
        className="relative mx-auto grid max-w-[1120px] grid-cols-1 overflow-hidden rounded-lg border border-border bg-surface lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"
      >
        <div className="flex min-w-0 flex-col justify-center p-6 sm:p-10">
          <span className="inline-flex items-center gap-2 font-mono text-caption uppercase tracking-[0.08em] text-fg-muted">
            <Sparkle size={14} weight="fill" aria-hidden="true" />
            {quien === 'inmobiliaria' ? 'Con Leasefy, en piloto automático' : 'Leasefy lo administra por ti'}
          </span>
          <h1 className="mt-4 text-[28px] font-[420] leading-[1.1] tracking-[-0.03em] text-fg sm:text-[34px]" style={{ textWrap: 'balance' }}>
            {demo.titulo}
          </h1>
          <p className="mt-3 max-w-[46ch] text-[15.5px] leading-relaxed text-fg-muted">{demo.promesa}</p>
          <ul className="mt-6 space-y-2.5">
            {demo.puntos.map((p) => (
              <li key={p} className="flex items-center gap-2.5 text-[14.5px] text-fg">
                <CheckCircle size={18} weight="fill" className="shrink-0 text-primary" aria-hidden="true" />
                {p}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
            <Button asChild className="h-auto min-h-12 w-full whitespace-normal rounded-full px-6 py-3 text-center text-[15px] sm:w-auto" data-testid="quiero-leasefy">
              <a href={whatsapp} target="_blank" rel="noreferrer noopener">
                <WhatsappLogo size={18} weight="fill" className="mr-2" aria-hidden="true" />
                {llamado}
              </a>
            </Button>
            {/* Ronda 30 (revisora r27): a 1440 la vista previa de al lado ya es «Ver cómo se vería…»; un solo llamado al demo por ancho. */}
            <Button type="button" variant="secondary" className="h-auto min-h-12 w-full whitespace-normal rounded-full px-6 py-3 text-[15px] sm:w-auto lg:hidden" onClick={() => setVerDemo(true)} data-testid="ver-demo">
              <PlayCircle size={18} className="mr-2" aria-hidden="true" />
              Ver demo
            </Button>
          </div>
          <p className="mt-4 text-[13px] text-fg-subtle">
            Te respondemos por WhatsApp y te contamos cuánto cuesta para ti.
            {yaEsCliente && (
              <>
                {' '}
                <Link href={yaEsCliente.href} className="font-medium text-primary hover:underline">
                  {yaEsCliente.texto}
                </Link>
              </>
            )}
          </p>
        </div>

        {/* La vista previa: la primera pantalla, apagada, con «Ver demo» encima. */}
        <button
          type="button"
          onClick={() => setVerDemo(true)}
          className="group relative hidden min-h-[360px] overflow-hidden border-l border-border bg-surface-muted lg:block"
          aria-label="Ver demo"
        >
          {portada && (
            <Image src={portada} alt="" fill sizes="600px" className="object-cover object-left-top opacity-60 blur-[1.5px] transition duration-slow group-hover:opacity-80 group-hover:blur-0" />
          )}
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-fg px-5 py-2.5 text-[14px] font-medium text-bg transition-transform duration-fast group-hover:scale-105">
              <PlayCircle size={18} weight="fill" aria-hidden="true" />
              {quien === 'inmobiliaria' && empresa ? `Ver cómo se vería en ${empresa}` : 'Ver cómo se vería en tu cuenta'}
            </span>
          </span>
        </button>
      </motion.div>

      <DemoEnGrande abierta={verDemo} alCerrar={() => setVerDemo(false)} demo={demo} empresa={empresa} whatsapp={whatsapp} llamado={llamado} />
    </section>
  );
}

function DemoEnGrande({
  abierta,
  alCerrar,
  demo,
  empresa,
  whatsapp,
  llamado,
}: {
  abierta: boolean;
  alCerrar: () => void;
  demo: DemoDelModulo;
  empresa?: string | null;
  whatsapp: string;
  llamado: string;
}) {
  const [i, setI] = useState(0);
  const total = demo.capturas.length;
  const actual = demo.capturas[Math.min(i, total - 1)];
  const pantalla = actual?.src;
  return (
    <Dialog open={abierta} onOpenChange={(o) => !o && alCerrar()}>
      <DialogContent size="xl" className="max-w-[1180px]" data-testid="demo-en-grande">
        {/* La cabecera de todos los modales (guardián «una sola cabecera», 22-10): título de 16 px,
            filete y la ✕. Antes era una barra propia con la inicial pintada a mano. */}
        <DialogHeader>
          <DialogTitle>Demo: {demo.titulo}</DialogTitle>
          <DialogDescription>
            {empresa ?? 'Tu cuenta'} · datos de ejemplo
            <span className="font-mono tabular-nums"> · {Math.min(i, total - 1) + 1} / {total}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-surface-muted">
          <AnimatePresence mode="wait" initial={false}>
            {pantalla && (
            <motion.div
              key={pantalla}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: motionDuration.base, ease: motionEase.standard }}
              className="absolute inset-0"
            >
              <Image src={pantalla} alt={actual?.alt ?? ''} fill sizes="1180px" className="object-contain" />
            </motion.div>
            )}
          </AnimatePresence>
          {total > 1 && (
            <>
              <BotonDeLado lado="izquierda" onClick={() => setI((x) => (x - 1 + total) % total)} />
              <BotonDeLado lado="derecha" onClick={() => setI((x) => (x + 1) % total)} />
            </>
          )}
        </div>
        <DialogFooter className="sm:justify-between">
          <p className="text-[14px] text-fg-muted">{actual?.alt ? `${actual.alt}.` : ''}</p>
          <Button asChild className="h-11 rounded-full px-5">
            <a href={whatsapp} target="_blank" rel="noreferrer noopener" data-testid="quiero-leasefy-demo">
              <WhatsappLogo size={18} weight="fill" className="mr-2" aria-hidden="true" />
              {llamado}
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BotonDeLado({ lado, onClick }: { lado: 'izquierda' | 'derecha'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={lado === 'izquierda' ? 'Pantalla anterior' : 'Pantalla siguiente'}
      className={cn(
        'absolute top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface/95 text-fg transition hover:scale-105',
        lado === 'izquierda' ? 'left-3' : 'right-3',
      )}
    >
      {lado === 'izquierda' ? <ArrowLeft size={18} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
    </button>
  );
}
