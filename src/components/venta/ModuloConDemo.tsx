'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle, PlayCircle, Sparkle, WhatsappLogo } from '@phosphor-icons/react';
import { motionDuration, motionEase } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
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

  return (
    <section className="px-4 py-8 sm:px-6 lg:px-8 lg:py-12" data-testid="modulo-con-demo">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: motionDuration.slow, ease: motionEase.enter }}
        className="relative mx-auto grid max-w-[1120px] overflow-hidden rounded-xl border border-border bg-surface lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"
      >
        <div className="flex flex-col justify-center p-6 sm:p-10">
          <span className="inline-flex items-center gap-2 font-mono text-[11.5px] uppercase tracking-[0.08em] text-primary">
            <Sparkle size={14} weight="fill" aria-hidden="true" />
            {quien === 'inmobiliaria' ? 'Con Leasefy, en piloto automático' : 'Leasefy lo administra por ti'}
          </span>
          <h1 className="mt-4 text-[28px] font-medium leading-[1.1] tracking-[-0.03em] text-fg sm:text-[34px]" style={{ textWrap: 'balance' }}>
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
            <Button asChild className="h-12 rounded-full px-6 text-[15px]" data-testid="quiero-leasefy">
              <a href={whatsapp} target="_blank" rel="noreferrer noopener">
                <WhatsappLogo size={18} weight="fill" className="mr-2" aria-hidden="true" />
                {llamado}
              </a>
            </Button>
            <Button type="button" variant="secondary" className="h-12 rounded-full px-6 text-[15px]" onClick={() => setVerDemo(true)} data-testid="ver-demo">
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
          <Image src={demo.capturas[0]!.src} alt="" fill sizes="600px" className="object-cover object-left-top opacity-60 blur-[1.5px] transition duration-slow group-hover:opacity-80 group-hover:blur-0" />
          <span className="absolute inset-0 bg-gradient-to-l from-transparent via-surface/10 to-surface/60" aria-hidden="true" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-fg px-5 py-2.5 text-[14px] font-medium text-bg shadow-lg transition-transform duration-fast group-hover:scale-105">
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
  const actual = demo.capturas[Math.min(i, total - 1)]!;
  return (
    <Dialog open={abierta} onOpenChange={(o) => !o && alCerrar()}>
      <DialogContent size="xl" className="max-w-[1180px] p-0" data-testid="demo-en-grande">
        <DialogTitle className="sr-only">Demo: {demo.titulo}</DialogTitle>
        <div className="flex items-center justify-between gap-3 border-b border-border py-3 pl-4 pr-16 sm:pl-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-[12px] font-semibold text-primary-fg">
              {(empresa?.trim()?.[0] ?? 'L').toUpperCase()}
            </span>
            <span className="truncate text-[14px] font-medium text-fg">{empresa ?? 'Tu cuenta'}</span>
            <span className="hidden rounded-full bg-surface-muted px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.06em] text-fg-muted sm:inline">
              Demo · datos de ejemplo
            </span>
          </div>
          <span className="font-mono text-[12px] text-fg-subtle">
            {Math.min(i, total - 1) + 1} / {total}
          </span>
        </div>
        <div className="relative aspect-[16/10] w-full bg-surface-muted">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={actual.src}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: motionDuration.base, ease: motionEase.standard }}
              className="absolute inset-0"
            >
              <Image src={actual.src} alt={actual.alt} fill sizes="1180px" className="object-contain" />
            </motion.div>
          </AnimatePresence>
          {total > 1 && (
            <>
              <BotonDeLado lado="izquierda" onClick={() => setI((x) => (x - 1 + total) % total)} />
              <BotonDeLado lado="derecha" onClick={() => setI((x) => (x + 1) % total)} />
            </>
          )}
        </div>
        <div className="flex flex-col gap-3 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-[14px] text-fg-muted">{actual.alt}.</p>
          <Button asChild className="h-11 rounded-full px-5">
            <a href={whatsapp} target="_blank" rel="noreferrer noopener" data-testid="quiero-leasefy-demo">
              <WhatsappLogo size={18} weight="fill" className="mr-2" aria-hidden="true" />
              {llamado}
            </a>
          </Button>
        </div>
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
        'absolute top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface/95 text-fg shadow-md transition hover:scale-105',
        lado === 'izquierda' ? 'left-3' : 'right-3',
      )}
    >
      {lado === 'izquierda' ? <ArrowLeft size={18} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
    </button>
  );
}
