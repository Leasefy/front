'use client';

/**
 * Crear o editar un medio de pago. Un solo diálogo; el tipo decide qué
 * campos aparecen. Las validaciones son las del back, letra por letra, para
 * frenar acá y no con un 400.
 */

import { useEffect, useState } from 'react';
import { Banner, Chip } from '@leasefy/cadence';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api/client';
import type {
  MedioDePago,
  NuevoMedioDePago,
  TipoDeMedioDePago,
} from '@/lib/api/medios-de-pago.types';
import {
  CAMPOS_DEL_TIPO,
  ICONO_DEL_TIPO,
  NOMBRE_DEL_TIPO,
  TIPOS,
  etiquetaDelCampo,
  faltanteDe,
  type CampoDelMedio,
} from './legible';

export interface EditorDeMedioProps {
  abierto: boolean;
  /** `null` = crear. Con valores iniciales sin id = crear prellenado (sugerencia). */
  medio: MedioDePago | null;
  inicial?: NuevoMedioDePago | null;
  onCerrar: () => void;
  /** Tiene que relanzar el error: el 400 del back se muestra acá adentro. */
  onGuardar: (valores: NuevoMedioDePago) => Promise<unknown>;
}

const VACIO: NuevoMedioDePago = {
  tipo: 'TRANSFERENCIA',
  nombre: '',
  instrucciones: '',
  banco: '',
  tipoDeCuenta: null,
  numeroDeCuenta: '',
  titular: '',
  documentoTitular: '',
  enlace: '',
  visibleAlInquilino: true,
  activo: true,
};

function desdeMedio(m: MedioDePago): NuevoMedioDePago {
  return {
    tipo: m.tipo,
    nombre: m.nombre,
    instrucciones: m.instrucciones ?? '',
    banco: m.banco ?? '',
    tipoDeCuenta: (m.tipoDeCuenta as NuevoMedioDePago['tipoDeCuenta']) ?? null,
    numeroDeCuenta: m.numeroDeCuenta ?? '',
    titular: m.titular ?? '',
    documentoTitular: m.documentoTitular ?? '',
    enlace: m.enlace ?? '',
    visibleAlInquilino: m.visibleAlInquilino,
    activo: m.activo,
  };
}

export function EditorDeMedio({ abierto, medio, inicial, onCerrar, onGuardar }: EditorDeMedioProps) {
  const [valores, setValores] = useState<NuevoMedioDePago>(VACIO);
  const [tocado, setTocado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorDelBack, setErrorDelBack] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) return;
    setValores(medio ? desdeMedio(medio) : { ...VACIO, ...(inicial ?? {}) });
    setTocado(false);
    setErrorDelBack(null);
  }, [abierto, medio, inicial]);

  const cambiar = <K extends keyof NuevoMedioDePago>(clave: K, valor: NuevoMedioDePago[K]) =>
    setValores((v) => ({ ...v, [clave]: valor }));

  const sinNombre = valores.nombre.trim().length < 2;
  const faltante = faltanteDe(valores);
  const campos = CAMPOS_DEL_TIPO[valores.tipo];

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setTocado(true);
    if (sinNombre || faltante) return;
    setGuardando(true);
    setErrorDelBack(null);
    try {
      await onGuardar(valores);
    } catch (error) {
      setErrorDelBack(
        error instanceof ApiError || error instanceof Error
          ? error.message
          : 'No se pudo guardar el medio de pago.',
      );
    } finally {
      setGuardando(false);
    }
  };

  const campo = (nombre: CampoDelMedio) => {
    if (nombre === 'tipoDeCuenta') {
      return (
        <div key={nombre} className="space-y-2">
          <Label>{etiquetaDelCampo(nombre, valores.tipo)}</Label>
          <div className="flex gap-2">
            {(['AHORROS', 'CORRIENTE'] as const).map((t) => (
              <Chip
                key={t}
                selected={valores.tipoDeCuenta === t}
                onClick={() => cambiar('tipoDeCuenta', t)}
                data-testid={`tipo-de-cuenta-${t}`}
              >
                {t === 'AHORROS' ? 'Ahorros' : 'Corriente'}
              </Chip>
            ))}
          </div>
        </div>
      );
    }
    const obligatorio = campos.exige.includes(nombre);
    return (
      <div key={nombre} className="space-y-2">
        <Label htmlFor={`medio-${nombre}`}>
          {etiquetaDelCampo(nombre, valores.tipo)}
          {!obligatorio && <span className="ml-1 text-xs text-fg-muted">(opcional)</span>}
        </Label>
        <Input
          id={`medio-${nombre}`}
          value={(valores[nombre] as string | null) ?? ''}
          onChange={(e) => cambiar(nombre, e.target.value)}
          inputMode={nombre === 'numeroDeCuenta' ? 'numeric' : undefined}
          placeholder={nombre === 'enlace' ? 'https://…' : undefined}
        />
      </div>
    );
  };

  return (
    <Dialog open={abierto} onOpenChange={(open) => !open && onCerrar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{medio ? 'Editar medio de pago' : 'Nuevo medio de pago'}</DialogTitle>
          <DialogDescription>
            Lo que el inquilino ve para saber cómo pagarte. El número de cuenta se le muestra tapado.
          </DialogDescription>
        </DialogHeader>

        <form id="form-medio-de-pago" onSubmit={guardar} className="space-y-5 px-6 py-5">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <div className="flex flex-wrap gap-2">
              {TIPOS.map((t: TipoDeMedioDePago) => {
                const Icono = ICONO_DEL_TIPO[t];
                return (
                  <Chip
                    key={t}
                    selected={valores.tipo === t}
                    onClick={() => cambiar('tipo', t)}
                    icon={<Icono className="h-4 w-4" />}
                    data-testid={`tipo-${t}`}
                  >
                    {NOMBRE_DEL_TIPO[t]}
                  </Chip>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="medio-nombre">Nombre</Label>
            <Input
              id="medio-nombre"
              value={valores.nombre}
              onChange={(e) => cambiar('nombre', e.target.value)}
              placeholder="Como lo va a leer el inquilino"
              maxLength={80}
            />
            {tocado && sinNombre && <p className="text-xs text-danger">Ponele un nombre de al menos dos letras.</p>}
          </div>

          {campos.muestra.length > 0 && <div className="grid gap-4 sm:grid-cols-2">{campos.muestra.map(campo)}</div>}

          <div className="space-y-2">
            <Label htmlFor="medio-instrucciones">
              Instrucciones <span className="ml-1 text-xs text-fg-muted">(opcional)</span>
            </Label>
            <Textarea
              id="medio-instrucciones"
              value={valores.instrucciones ?? ''}
              onChange={(e) => cambiar('instrucciones', e.target.value)}
              placeholder="Qué tiene que hacer el inquilino después de pagar: mandar el comprobante, poner la dirección…"
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 text-sm">
              <span>
                Visible al inquilino
                <span className="block text-xs text-fg-muted">Aparece en su portal en «Cómo pagar».</span>
              </span>
              <Switch
                checked={valores.visibleAlInquilino ?? true}
                onCheckedChange={(v) => cambiar('visibleAlInquilino', v)}
                aria-label="Visible al inquilino"
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 text-sm">
              <span>
                Activo
                <span className="block text-xs text-fg-muted">Apagado no se ofrece en ningún lado.</span>
              </span>
              <Switch
                checked={valores.activo ?? true}
                onCheckedChange={(v) => cambiar('activo', v)}
                aria-label="Medio activo"
              />
            </label>
          </div>

          {tocado && faltante && <Banner variant="warning">{faltante}</Banner>}
          {errorDelBack && (
            <Banner variant="danger" data-testid="error-del-back">
              {errorDelBack}
            </Banner>
          )}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" hideArrow onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="submit" form="form-medio-de-pago" hideArrow isLoading={guardando}>
            {medio ? 'Guardar cambios' : 'Crear medio'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
