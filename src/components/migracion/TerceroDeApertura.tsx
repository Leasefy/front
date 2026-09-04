'use client';

/**
 * El tercero de una línea del asiento de apertura.
 *
 * Un saldo en 130505 sin decir DE QUIÉN es cartera sin nombre: el estado de
 * cuenta por inquilino nace en cero aunque la cartera exista (medido
 * 2026-09-02). Acá se elige la ficha —propietario o inquilino con cuenta— y
 * viaja como `terceroTipo + terceroId`, los mismos que asienta el motor, así
 * el saldo migrado y los movimientos de mañana quedan en la misma auxiliar.
 *
 * Es opcional a propósito: un saldo global sigue siendo un saldo válido.
 */

import { useEffect, useState } from 'react';
import { X } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { propietariosApi } from '@/lib/api/inmobiliaria.service';
import { inquilinosApi } from '@/lib/api/inquilinos.service';
import type {
  TerceroDeApertura as Tercero,
  TipoDeTerceroDeApertura,
} from '@/lib/migracion/asiento-de-apertura';

const NOMBRE_DE_TIPO: Record<TipoDeTerceroDeApertura, string> = {
  PROPIETARIO: 'Propietario',
  ARRENDATARIO: 'Inquilino',
};

interface Candidato {
  id: string;
  nombre: string;
  detalle: string;
}

/** Las dos listas del panel, con el id que la contabilidad entiende. */
async function buscarCandidatos(tipo: TipoDeTerceroDeApertura, q: string): Promise<Candidato[]> {
  if (tipo === 'PROPIETARIO') {
    return (await propietariosApi.getAll({ search: q, limit: 8 })).map((p) => ({
      id: p.id,
      nombre: p.name,
      detalle: p.documentNumber ? `${p.documentType} ${p.documentNumber}` : (p.email ?? ''),
    }));
  }
  return (await inquilinosApi.listar({ buscar: q })).slice(0, 8).map((i) => ({
    id: i.tenantId,
    nombre: i.nombre,
    detalle: i.email ?? i.telefono ?? '',
  }));
}

export function TerceroDeApertura({
  valor,
  onCambio,
  testId,
}: {
  valor: Tercero | null | undefined;
  onCambio: (tercero: Tercero | null) => void;
  testId: string;
}) {
  const [tipo, setTipo] = useState<TipoDeTerceroDeApertura>(valor?.tipo ?? 'ARRENDATARIO');
  const [busqueda, setBusqueda] = useState('');
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);

  useEffect(() => {
    const q = busqueda.trim();
    if (q.length < 2) {
      setCandidatos([]);
      return;
    }
    let vivo = true;
    const t = setTimeout(async () => {
      try {
        const lista = await buscarCandidatos(tipo, q);
        if (vivo) setCandidatos(lista);
      } catch {
        if (vivo) setCandidatos([]);
      }
    }, 250);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [tipo, busqueda]);

  if (valor) {
    return (
      <div className="mt-1.5 flex items-center gap-1.5 text-xs" data-testid={`${testId}-elegido`}>
        <span className="text-fg-muted">{NOMBRE_DE_TIPO[valor.tipo]}:</span>
        <span className="font-medium text-fg">{valor.nombre}</span>
        <Button
          size="sm"
          variant="ghost"
          hideArrow
          onClick={() => onCambio(null)}
          aria-label="Quitar el tercero"
          data-testid={`${testId}-quitar`}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-1.5 space-y-1" data-testid={testId}>
      <div className="flex items-center gap-1.5">
        <Select value={tipo} onValueChange={(v) => setTipo(v as TipoDeTerceroDeApertura)}>
          <SelectTrigger className="h-8 w-32 text-xs" aria-label="Tipo de tercero" data-testid={`${testId}-tipo`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(NOMBRE_DE_TIPO) as TipoDeTerceroDeApertura[]).map((t) => (
              <SelectItem key={t} value={t}>
                {NOMBRE_DE_TIPO[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Nombre o documento (opcional)"
          aria-label="Buscar el tercero"
          className="h-8 text-xs"
          data-testid={`${testId}-buscar`}
        />
      </div>
      {candidatos.length > 0 ? (
        <ul className="divide-y divide-border-faint rounded-md border border-border bg-surface" role="listbox">
          {candidatos.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                className="flex w-full items-center justify-between gap-2 px-2 py-1 text-left text-xs hover:bg-surface-muted"
                onClick={() => {
                  onCambio({ tipo, id: c.id, nombre: c.nombre });
                  setBusqueda('');
                  setCandidatos([]);
                }}
                data-testid={`${testId}-opcion-${c.id}`}
              >
                <span className="font-medium text-fg">{c.nombre}</span>
                <span className="text-fg-subtle">{c.detalle}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
