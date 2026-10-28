'use client';

import { useState } from 'react';
import { LinkSimple, Sparkle } from '@phosphor-icons/react';
import { Collapse } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { leerEnlaces, separarEnlaces, traerFotoComoArchivo } from '@/lib/inmuebles/enlaces.service';
import { datosDelAsistenteDesdeElEnlace, loQueTrajo } from '@/lib/inmuebles/asistente-desde-enlace';
import { PROPERTY_PHOTO_MAX_COUNT, validatePropertyPhoto } from '@/lib/api/property-photos';
import type { WizardFormData } from '../ConsignacionWizardSteps';

/**
 * «¿Ya lo tienes publicado en otro lado? Pega el enlace» (Juan y Nico, 27-10-2026: «que con una URL le creemos
 * el inmueble y hasta arrastremos las fotos»). El mismo lector de `/publica` (`/api/inmuebles/desde-enlace` y el
 * proxy de imágenes), dentro del asistente del panel. Completa lo que el aviso dice y trae sus fotos; la persona
 * revisa y sigue.
 */
export function TraerDelEnlace({
  fotosActuales,
  alTraer,
}: {
  fotosActuales: number;
  alTraer: (datos: Partial<WizardFormData>, fotos: File[]) => void;
}) {
  const [enlace, setEnlace] = useState('');
  const [estado, setEstado] = useState<'quieto' | 'leyendo' | 'fotos'>('quieto');
  const [avance, setAvance] = useState<{ listas: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<string | null>(null);

  const traer = async () => {
    setError(null);
    setListo(null);
    const [url] = separarEnlaces(enlace);
    if (!url) {
      setError('Pega el enlace completo del aviso (Fincaraíz, Metrocuadrado, Ciencuadras, tu página…).');
      return;
    }
    setEstado('leyendo');
    try {
      const [leido] = await leerEnlaces([url]);
      if (!leido || !leido.ok) {
        setError(leido?.mensaje ?? 'No pudimos leer ese enlace. Revisa que abra el aviso del inmueble.');
        return;
      }
      const datos = datosDelAsistenteDesdeElEnlace(leido.inmueble);
      const cupo = Math.max(PROPERTY_PHOTO_MAX_COUNT - fotosActuales, 0);
      const urls = leido.inmueble.imagenes.slice(0, cupo);
      const fotos: File[] = [];
      if (urls.length > 0) {
        setEstado('fotos');
        setAvance({ listas: 0, total: urls.length });
        // De a cuatro: el proxy tiene límite por IP y una página con 30 fotos no debe frenarlo.
        for (let i = 0; i < urls.length; i += 4) {
          const tanda = await Promise.all(
            urls.slice(i, i + 4).map((u, j) => traerFotoComoArchivo(u, `foto-${String(i + j + 1).padStart(2, '0')}`)),
          );
          for (const f of tanda) if (f && !validatePropertyPhoto(f)) fotos.push(f);
          setAvance({ listas: Math.min(i + 4, urls.length), total: urls.length });
        }
      }
      alTraer(datos, fotos);
      const partes = loQueTrajo(datos, fotos.length);
      setListo(
        partes.length > 0
          ? `Listo: trajimos ${unir(partes)}. Revisa y completa lo que falte.`
          : 'Leímos el enlace, pero el aviso no trae datos que podamos usar. Llénalo a mano.',
      );
      setEnlace('');
    } catch {
      setError('No pudimos leer ese enlace. Prueba de nuevo en un momento.');
    } finally {
      setEstado('quieto');
      setAvance(null);
    }
  };

  const ocupado = estado !== 'quieto';
  return (
    <div className="rounded-lg border border-primary/25 bg-primary-soft/40 p-4" data-testid="traer-del-enlace">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface text-primary">
          <LinkSimple className="h-5 w-5" weight="bold" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-fg">¿Ya está publicado en otro lado?</p>
          <p className="text-sm text-fg-muted">Pega el enlace y traemos los datos y las fotos del aviso.</p>
          <form
            className="mt-3 flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (!ocupado) void traer();
            }}
            noValidate
          >
            <Input
              type="url"
              inputMode="url"
              value={enlace}
              onChange={(e) => setEnlace(e.target.value)}
              placeholder="https://www.fincaraiz.com.co/…"
              aria-label="Enlace del aviso"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'traer-del-enlace-error' : undefined}
              disabled={ocupado}
              className="min-w-0 flex-1"
              data-testid="traer-del-enlace-url"
            />
            <Button type="submit" hideArrow isLoading={ocupado} disabled={!enlace.trim()} data-testid="traer-del-enlace-boton">
              <Sparkle className="h-4 w-4" weight="fill" aria-hidden="true" />
              {estado === 'fotos' && avance ? `Fotos ${avance.listas} de ${avance.total}` : estado === 'leyendo' ? 'Leyendo…' : 'Traer'}
            </Button>
          </form>
          <ErrorDelCampo id="traer-del-enlace-error" mensaje={error} />
          <Collapse open={Boolean(listo)}>
            <p className="mt-2 text-sm text-success" role="status" data-testid="traer-del-enlace-listo">
              {listo}
            </p>
          </Collapse>
        </div>
      </div>
    </div>
  );
}

function unir(partes: string[]): string {
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}
