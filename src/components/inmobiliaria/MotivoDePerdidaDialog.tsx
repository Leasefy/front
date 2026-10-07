'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button, Textarea } from '@/components/ui';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { cn } from '@/lib/utils';
import { MAX_LARGO_MOTIVO_DE_PERDIDA } from '@/lib/pipeline/limites-del-pipeline';

/**
 * PL-17 (QA del 04-10-2026): «Marcar como perdido» era texto libre, así que no
 * se podía contar «por qué se nos caen». Ahora se escoge un motivo FIJO (y se
 * puede agregar el detalle); «Otro» pide escribirlo. Se guarda como
 * «<Motivo>» o «<Motivo>: <detalle>», así el informe cuenta por el motivo.
 */
export const MOTIVOS_DE_PERDIDA = [
  'Arrendó en otro lado',
  'El canon no le alcanza',
  'No cumple los requisitos',
  'Dejó de responder',
  'El inmueble no le sirvió',
  'Se arrendó a otro candidato',
  'Otro',
] as const;

export function motivoCompuesto(motivo: string, detalle: string): string {
  const d = detalle.trim();
  if (motivo === 'Otro') return d;
  return d ? `${motivo}: ${d}` : motivo;
}

export function MotivoDePerdidaDialog({
  abierto,
  nombre,
  enviando = false,
  error = null,
  onCerrar,
  onConfirmar,
}: {
  abierto: boolean;
  nombre: string;
  enviando?: boolean;
  error?: string | null;
  onCerrar: () => void;
  onConfirmar: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState<string | null>(null);
  const [detalle, setDetalle] = useState('');
  useEffect(() => {
    if (abierto) {
      setMotivo(null);
      setDetalle('');
    }
  }, [abierto]);

  const final = motivo ? motivoCompuesto(motivo, detalle) : '';
  const faltaElDetalle = motivo === 'Otro' && detalle.trim().length < 5;
  const largo = final.length > MAX_LARGO_MOTIVO_DE_PERDIDA;
  const puede = Boolean(motivo) && !faltaElDetalle && !largo && !enviando;

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="sm:max-w-lg" data-testid="motivo-de-perdida">
        <DialogHeader>
          <DialogTitle>¿Marcar a {nombre} como perdido?</DialogTitle>
          <DialogDescription>
            Sale del embudo. Escoge por qué se cayó: es lo que se cuenta después para saber qué falló.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Motivo">
          {MOTIVOS_DE_PERDIDA.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={motivo === m}
              onClick={() => setMotivo(m)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm transition-colors',
                motivo === m ? 'border-primary bg-primary-soft text-primary' : 'border-border text-fg-muted hover:text-fg',
              )}
              data-testid="motivo-de-perdida-opcion"
            >
              {m}
            </button>
          ))}
        </div>
        <AnimatePresence initial={false}>
          {motivo && (
            <motion.div
              key="detalle"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
            >
              <label htmlFor="motivo-detalle" className="mb-1.5 block text-caption text-muted-foreground">
                {motivo === 'Otro' ? 'Cuéntalo' : 'Detalle (opcional)'}
              </label>
              <Textarea
                id="motivo-detalle"
                rows={3}
                value={detalle}
                onChange={(e) => setDetalle(e.target.value)}
                placeholder={motivo === 'Otro' ? 'Por qué se cayó' : 'Lo que ayude a entenderlo después'}
                maxLength={MAX_LARGO_MOTIVO_DE_PERDIDA}
              />
              {faltaElDetalle && detalle.length > 0 && (
                <p className="mt-1 text-caption text-fg-muted">Escribe un poco más para que se entienda.</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <ErrorDelCampo id="motivo-de-perdida-error" mensaje={error} />
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" hideArrow onClick={onCerrar} disabled={enviando}>
            Volver
          </Button>
          <Button
            hideArrow
            disabled={!puede}
            isLoading={enviando}
            onClick={() => onConfirmar(final)}
            className="bg-danger text-white hover:bg-danger/90"
            data-testid="motivo-de-perdida-confirmar"
          >
            Marcar como perdido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
