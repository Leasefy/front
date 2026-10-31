'use client';

/**
 * «Por firmar por ti» (Nico, 31-10-2026: «si nuestro cliente tiene varias cosas por firmar en el día se las
 * mostremos en el módulo de firmas, las pueda seleccionar las que quiera y le dé firmar, y con una sola firma
 * queden todas firmadas»). Lo que espera la firma de quien mira (su correo es el de un firmante pendiente):
 * elige, dibuja la firma UNA vez, marca que los leyó y escribe el código de su aplicación.
 */
import { useCallback, useEffect, useState } from 'react';
import { Banner } from '@leasefy/cadence';
import { PenNib } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { SignaturePad } from '@/components/contract/SignaturePad';
import { CampoDelCodigoDeLaApp } from '@/components/seguridad/CodigoDeLaApp';
import { firmasApi } from '@/lib/api/firmas.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { useTr } from '@/lib/i18n/use-tr';

type PorFirmar = { documentoId: string; firmanteId: string; titulo: string; pideVerificacion: boolean };

export function PorFirmarPorTi({ onFirmados }: { onFirmados?: () => void }) {
  const tr = useTr();
  const [documentos, setDocumentos] = useState<PorFirmar[]>([]);
  const [elegidos, setElegidos] = useState<Set<string>>(new Set());
  const [firmando, setFirmando] = useState(false);
  const [firma, setFirma] = useState<string | null>(null);
  const [leidos, setLeidos] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leer = useCallback(async () => {
    try {
      const r = await firmasApi('inmobiliaria').porFirmarYo();
      setDocumentos(r.documentos);
      setElegidos(new Set(r.documentos.filter((d) => !d.pideVerificacion).map((d) => d.firmanteId)));
    } catch {
      setDocumentos([]);
    }
  }, []);
  useEffect(() => {
    void leer();
  }, [leer]);

  if (documentos.length === 0) return null;

  const alternar = (id: string) =>
    setElegidos((prev) => {
      const sig = new Set(prev);
      if (sig.has(id)) sig.delete(id);
      else sig.add(id);
      return sig;
    });

  const firmar = async () => {
    if (!firma) return;
    setError(null);
    try {
      const r = await firmasApi('inmobiliaria').firmarEnBloque([...elegidos], firma);
      toast.success(
        r.firmados.length === 1 ? tr('Firmaste 1 documento') : tr('Firmaste {n} documentos', { n: r.firmados.length }),
        r.noSePudo.length > 0 ? { description: r.noSePudo.map((x) => x.motivo).join(' · ') } : undefined,
      );
      setFirmando(false);
      setFirma(null);
      setLeidos(false);
      await leer();
      onFirmados?.();
    } catch (e) {
      setError(mensajeParaLaPersona(e, { porDefecto: tr('No se pudo firmar.'), accion: tr('firmar los documentos') }));
    }
  };

  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface p-4 sm:p-5" data-testid="por-firmar-por-ti">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-caption uppercase tracking-wide text-fg-muted">{tr('Por firmar por ti')}</p>
          <p className="text-body text-fg">
            {documentos.length === 1
              ? tr('Tienes 1 documento esperando tu firma')
              : tr('Tienes {n} documentos esperando tu firma', { n: documentos.length })}
          </p>
        </div>
        <Button hideArrow disabled={elegidos.size === 0} onClick={() => setFirmando(true)} data-testid="firmar-los-elegidos">
          <PenNib className="h-4 w-4" aria-hidden="true" />
          {elegidos.size === 1 ? tr('Firmar 1 documento') : tr('Firmar {n} documentos', { n: elegidos.size })}
        </Button>
      </div>
      <ul className="divide-y divide-border-faint">
        {documentos.map((d) => (
          <li key={d.firmanteId} className="flex items-center gap-3 py-2.5">
            <Checkbox
              checked={elegidos.has(d.firmanteId)}
              disabled={d.pideVerificacion}
              onCheckedChange={() => alternar(d.firmanteId)}
              aria-label={d.titulo}
            />
            <span className="min-w-0 flex-1 truncate text-body-sm text-fg">{d.titulo}</span>
            {d.pideVerificacion ? (
              <span className="shrink-0 text-caption text-fg-muted">{tr('Pide verificar tu identidad: fírmalo desde su enlace')}</span>
            ) : null}
          </li>
        ))}
      </ul>

      <Dialog open={firmando} onOpenChange={(o) => !o && setFirmando(false)}>
        <DialogContent size="md" data-testid="dialogo-firmar-en-bloque">
          <DialogHeader>
            <DialogTitle>
              {elegidos.size === 1 ? tr('Firmar 1 documento') : tr('Firmar {n} documentos', { n: elegidos.size })}
            </DialogTitle>
            <DialogDescription>{tr('Una sola firma para todos los que elegiste. Cada documento queda con su constancia.')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <SignaturePad onChange={setFirma} />
            <label className="flex items-start gap-3 text-body-sm text-fg">
              <Checkbox checked={leidos} onCheckedChange={(v) => setLeidos(v === true)} />
              <span>{tr('Leí los documentos que voy a firmar y acepto firmarlos electrónicamente.')}</span>
            </label>
            <CampoDelCodigoDeLaApp
              deshabilitado={!firma || !leidos}
              ayuda={!firma || !leidos ? tr('Primero dibuja tu firma y marca que los leíste.') : undefined}
              onVerificado={firmar}
            />
            {error ? <Banner variant="danger">{error}</Banner> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" hideArrow onClick={() => setFirmando(false)}>
              {tr('Cancelar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
