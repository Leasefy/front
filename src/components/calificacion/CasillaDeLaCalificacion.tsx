'use client';

/**
 * La casilla de la Calificación Leasefy en la postulación (Nico, 18-10-2026):
 * APARTE de la autorización de datos, SIN MARCAR y opcional. Si la marca, al
 * enviar la postulación se guarda la autorización (versionada) y la
 * inmobiliaria ve su calificación con TODO su historial en Leasefy; si no,
 * sólo lo que pasó con esa inmobiliaria. Nunca frena la postulación.
 *
 * Si ya la autorizó antes, no se le vuelve a preguntar: se le dice.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { Checkbox } from '@/components/ui/checkbox';
import { apiClient } from '@/lib/api/client';
import { calificacionLeasefyApi } from '@/lib/api/calificacion-leasefy.service';

export function CasillaDeLaCalificacion({
  marcada,
  onCambio,
}: {
  marcada: boolean;
  onCambio: (v: boolean) => void;
}) {
  const [yaAutorizo, setYaAutorizo] = useState<boolean | null>(null);
  const [texto, setTexto] = useState<{ title: string; text: string } | null>(null);
  const [verTexto, setVerTexto] = useState(false);

  useEffect(() => {
    calificacionLeasefyApi
      .autorizacion()
      .then((a) => setYaAutorizo(a.vigente && !a.hayVersionNueva))
      .catch(() => setYaAutorizo(false));
    apiClient
      .get<{ title: string; text: string }>('/legal/consent-text?type=calificacion-leasefy&lang=es')
      .then(setTexto)
      .catch(() => setTexto(null));
  }, []);

  if (yaAutorizo) {
    return (
      <p className="text-xs text-fg-muted" data-testid="calificacion-ya-autorizada">
        Tu Calificación Leasefy ya se comparte con las inmobiliarias de Leasefy.{' '}
        <Link href="/inquilino/calificacion" className="underline hover:no-underline">
          Verla
        </Link>
      </p>
    );
  }
  if (yaAutorizo === null || !texto) return null;

  return (
    <div className="space-y-2" data-testid="casilla-calificacion">
      <label className="flex cursor-pointer items-start gap-3">
        <Checkbox
          id="autoriza-calificacion"
          checked={marcada}
          onCheckedChange={(c) => onCambio(c === true)}
          className="mt-0.5"
        />
        <span className="text-sm text-foreground/70">
          Opcional: autorizo que mis arriendos en Leasefy cuenten para mi Calificación Leasefy y que las
          inmobiliarias de Leasefy la consulten.{' '}
          <button type="button" className="underline hover:no-underline" onClick={() => setVerTexto((v) => !v)}>
            {verTexto ? 'Ocultar el texto' : 'Leer el texto'}
          </button>
        </span>
      </label>
      {verTexto && (
        <div
          className="max-h-32 overflow-y-auto rounded-md border border-border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground"
          data-lenis-prevent
        >
          <p className="mb-1.5 font-medium text-foreground">{texto.title}</p>
          {texto.text}
        </div>
      )}
    </div>
  );
}

/** Al enviar la postulación: guarda la autorización si la marcó. Nunca lanza. */
export async function guardarLaCasillaDeLaCalificacion(marcada: boolean): Promise<void> {
  if (!marcada) return;
  await calificacionLeasefyApi.decidir(true).catch(() => undefined);
}
