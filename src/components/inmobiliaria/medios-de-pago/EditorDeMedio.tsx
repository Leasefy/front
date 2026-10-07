'use client';

/**
 * Crear o editar un medio de pago. Un solo diálogo; el tipo decide qué
 * campos aparecen. Las validaciones son las del back, letra por letra, para
 * frenar acá y no con un 400.
 */

import { useEffect, useState } from 'react';
import { Banner, Chip, Presence } from '@leasefy/cadence';
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
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import {
  MENSAJE_NOMBRE_CORTO,
  MIN_LARGO_NOMBRE_DEL_MEDIO,
  TOPES_DEL_MEDIO,
  erroresDeLargoDelMedio,
} from '@/lib/configuracion/limites-de-los-medios-de-pago';
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

/** Los campos del formulario que pueden traer su propio error. */
type CampoDelFormulario = 'nombre' | 'instrucciones' | CampoDelMedio;
const CAMPOS_DEL_FORMULARIO: readonly CampoDelFormulario[] = [
  'nombre',
  'banco',
  'tipoDeCuenta',
  'numeroDeCuenta',
  'titular',
  'documentoTitular',
  'enlace',
  'instrucciones',
];

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
  // Los errores por campo: los del largo (el espejo del back) y los `campos`
  // de un 400 del servidor.
  const [errores, setErrores] = useState<Partial<Record<CampoDelFormulario, string>>>({});

  useEffect(() => {
    if (!abierto) return;
    setValores(medio ? desdeMedio(medio) : { ...VACIO, ...(inicial ?? {}) });
    setTocado(false);
    setErrorDelBack(null);
    setErrores({});
  }, [abierto, medio, inicial]);

  const cambiar = <K extends keyof NuevoMedioDePago>(clave: K, valor: NuevoMedioDePago[K]) => {
    setValores((v) => ({ ...v, [clave]: valor }));
    setErrores((previos) => {
      if (!(clave in previos)) return previos;
      const siguientes = { ...previos };
      delete siguientes[clave as CampoDelFormulario];
      return siguientes;
    });
  };

  const sinNombre = valores.nombre.trim().length < MIN_LARGO_NOMBRE_DEL_MEDIO;
  const faltante = faltanteDe(valores);
  const campos = CAMPOS_DEL_TIPO[valores.tipo];

  const enfocar = (campo: CampoDelFormulario | undefined) => {
    if (!campo) return;
    requestAnimationFrame(() => document.getElementById(`medio-${campo}`)?.focus());
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setTocado(true);
    // Lo que el back rechazaría por largo se ataja acá, con su frase.
    const deLargo = erroresDeLargoDelMedio(valores);
    if (Object.keys(deLargo).length > 0) {
      setErrores(deLargo);
      enfocar(CAMPOS_DEL_FORMULARIO.find((c) => c in deLargo));
      return;
    }
    if (sinNombre || faltante) {
      if (sinNombre) enfocar('nombre');
      return;
    }
    setGuardando(true);
    setErrorDelBack(null);
    try {
      await onGuardar(valores);
    } catch (error) {
      // Un 400 con `campos` va a cada campo (foco en el primero); lo demás
      // (un 409, un 5xx con su referencia, la red) va al aviso de abajo.
      const reparto = repartirErroresDelServidor(error, {
        campos: CAMPOS_DEL_FORMULARIO,
        porDefecto: 'No se pudo guardar el medio de pago.',
        accion: 'guardar el medio de pago',
      });
      setErrores(reparto.porCampo);
      setErrorDelBack(reparto.sueltos.length > 0 ? reparto.sueltos.join(' · ') : null);
      enfocar(reparto.orden[0]);
    } finally {
      setGuardando(false);
    }
  };

  const errorDelNombre = errores.nombre ?? (tocado && sinNombre ? MENSAJE_NOMBRE_CORTO : undefined);

  const campo = (nombre: CampoDelMedio) => {
    if (nombre === 'tipoDeCuenta') {
      return (
        <div key={nombre} className="space-y-2">
          <Label>{etiquetaDelCampo(nombre, valores.tipo)}</Label>
          <div className="flex gap-2">
            {(['AHORROS', 'CORRIENTE'] as const).map((t, i) => (
              <Chip
                key={t}
                id={i === 0 ? 'medio-tipoDeCuenta' : undefined}
                selected={valores.tipoDeCuenta === t}
                onClick={() => cambiar('tipoDeCuenta', t)}
                data-testid={`tipo-de-cuenta-${t}`}
              >
                {t === 'AHORROS' ? 'Ahorros' : 'Corriente'}
              </Chip>
            ))}
          </div>
          <ErrorDelCampo id="medio-tipoDeCuenta-error" mensaje={errores.tipoDeCuenta} className="mt-0" />
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
          maxLength={TOPES_DEL_MEDIO[nombre].tope}
          aria-invalid={Boolean(errores[nombre]) || undefined}
          aria-describedby={`medio-${nombre}-error`}
        />
        <ErrorDelCampo id={`medio-${nombre}-error`} mensaje={errores[nombre]} className="mt-0" />
      </div>
    );
  };

  return (
    <Dialog open={abierto} onOpenChange={(open) => !open && onCerrar()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{medio ? 'Editar medio de pago' : 'Nuevo medio de pago'}</DialogTitle>
          <DialogDescription>
            Lo que el inquilino ve para saber cómo pagarte. El número de cuenta se le muestra tapado.
          </DialogDescription>
        </DialogHeader>

        {/* El pie va FUERA del <form> (hijo directo del Content, fijo abajo); el
            botón de guardar lo envía con `form=`. El cuerpo ya trae su margen. */}
        <form id="form-medio-de-pago" onSubmit={guardar} className="space-y-5">
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
              maxLength={TOPES_DEL_MEDIO.nombre.tope}
              aria-invalid={Boolean(errorDelNombre) || undefined}
              aria-describedby="medio-nombre-error"
            />
            <ErrorDelCampo id="medio-nombre-error" mensaje={errorDelNombre} className="mt-0" />
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
              maxLength={TOPES_DEL_MEDIO.instrucciones.tope}
              aria-invalid={Boolean(errores.instrucciones) || undefined}
              aria-describedby="medio-instrucciones-error"
              rows={3}
            />
            <ErrorDelCampo id="medio-instrucciones-error" mensaje={errores.instrucciones} className="mt-0" />
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
          <Presence show={!!errorDelBack}>
            <Banner variant="danger" role="alert" data-testid="error-del-back">
              {errorDelBack}
            </Banner>
          </Presence>
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
