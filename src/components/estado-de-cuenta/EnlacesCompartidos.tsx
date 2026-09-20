'use client';

/**
 * «Enlaces compartidos» — ver y revocar los enlaces públicos de un estado de
 * cuenta (auditoría de casos de error 13-09, E3).
 *
 * El enlace vence a los 30 días, pero es la deuda de una persona con nombre y
 * documento: si se mandó al correo equivocado, o el cliente ya no está, tiene
 * que poder cerrarse HOY. El back ya tenía cómo (`GET :tipo/:id/enlaces` y
 * `DELETE enlaces/:id`); la pantalla no. Un enlace revocado responde 404 a
 * quien lo abra.
 *
 * Los cuatro estados de la casa (`EstadoDeDatos`): mientras lee, si falla
 * (con reintento), si no hay ninguno abierto, y la lista.
 *
 * 🔴 Cada enlace dice QUÉ MUESTRA (E4): desde que el recorte viaja con el
 * enlace, dos enlaces del mismo cliente pueden entregar cosas distintas —uno
 * la cartera entera, otro sólo lo pendiente de un contrato—. Decidir cuál
 * revocar sin saber cuál entrega qué es adivinar.
 */

import * as React from 'react';
import { LinkSimple } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SinDatos } from '@/components/estado/SinDatos';
import { estadoDeCuentaApi, type EnlaceVivo } from '@/lib/api/estado-de-cuenta.service';
import type { FiltrosDelEstadoDeCuenta } from '@/lib/types/estado-de-cuenta';
import { fechaLegible } from './filas';
import { motivoDeCompartir } from './usar-compartir';

export interface EnlacesCompartidosProps {
  abierto: boolean;
  onCerrar: () => void;
  tipo: 'inquilino' | 'propietario';
  id: string;
  /** Para que «Copiar enlace» no vuelva a dar uno revocado. */
  onRevocado: (enlaceId: string) => void;
}

export function EnlacesCompartidos({
  abierto,
  onCerrar,
  tipo,
  id,
  onRevocado,
}: EnlacesCompartidosProps) {
  const [enlaces, setEnlaces] = React.useState<EnlaceVivo[] | null>(null);
  const [cargando, setCargando] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);
  const [revocando, setRevocando] = React.useState<string | null>(null);

  const cargar = React.useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setEnlaces(await estadoDeCuentaApi.enlaces(tipo, id));
    } catch (e) {
      setError(e);
      setEnlaces(null);
    } finally {
      setCargando(false);
    }
  }, [tipo, id]);

  React.useEffect(() => {
    // Se lee al abrir, cada vez: un enlace que se mandó hace un minuto tiene
    // que estar en la lista.
    if (abierto) void cargar();
  }, [abierto, cargar]);

  const revocar = async (enlace: EnlaceVivo) => {
    setRevocando(enlace.id);
    try {
      await estadoDeCuentaApi.revocarEnlace(enlace.id);
      setEnlaces((previos) => previos?.filter((e) => e.id !== enlace.id) ?? null);
      onRevocado(enlace.id);
      toast.success('Enlace revocado: quien lo abra ya no ve el estado de cuenta.');
    } catch (e) {
      toast.error(motivoDeCompartir(e, 'No se pudo revocar el enlace.'));
    } finally {
      setRevocando(null);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent data-testid="enlaces-compartidos">
        <DialogHeader>
          <DialogTitle>Enlaces compartidos</DialogTitle>
          <DialogDescription>
            Los enlaces de este estado de cuenta que siguen abiertos. Revocar uno lo cierra al
            instante: quien lo abra ya no ve nada.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 py-4">
          <EstadoDeDatos
            cargando={cargando}
            error={error}
            vacio={enlaces !== null && enlaces.length === 0}
            queEs="los enlaces compartidos"
            onReintentar={cargar}
            cuandoVacio={
              <SinDatos
                queSon="enlaces abiertos"
                icono={LinkSimple}
                titulo="No hay enlaces abiertos"
                descripcion="Cuando copies el enlace o lo mandes por correo o WhatsApp, aparece acá para poder revocarlo."
              />
            }
          >
            <ul className="divide-y divide-border">
              {(enlaces ?? []).map((e) => (
                <li
                  key={e.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3"
                  data-testid={`enlace-${e.id}`}
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-body-sm text-fg">
                      Creado el <span className="font-mono tabular-nums">{fechaLegible(e.creadoEl)}</span>
                    </p>
                    <p className="text-caption text-fg-muted">
                      Vence el <span className="font-mono tabular-nums">{fechaLegible(e.venceEl)}</span>
                      {' · '}
                      <span className="font-mono tabular-nums">{e.aperturas}</span>{' '}
                      {e.aperturas === 1 ? 'apertura' : 'aperturas'}
                    </p>
                    <p className="text-caption text-fg-muted">{queMuestra(e.filtro)}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    hideArrow
                    onClick={() => void revocar(e)}
                    disabled={revocando !== null}
                    data-testid={`revocar-${e.id}`}
                  >
                    {revocando === e.id ? 'Revocando…' : 'Revocar'}
                  </Button>
                </li>
              ))}
            </ul>
          </EstadoDeDatos>
        </div>
        <DialogFooter>
          <Button variant="outline" hideArrow onClick={onCerrar}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Qué entrega este enlace, en palabras.
 *
 * Sin recorte guardado —los enlaces creados antes de E4, y los que se emiten
 * mientras la migración del back no esté aplicada— es el documento entero, y
 * así se dice: lo que ve el cliente no cambia por detrás.
 */
export function queMuestra(filtro?: FiltrosDelEstadoDeCuenta | null): string {
  if (!filtro) return 'Muestra el estado de cuenta entero';
  const partes: string[] = [];
  if (filtro.soloPendientes) partes.push('sólo lo pendiente');
  if (filtro.desde && filtro.hasta) {
    partes.push(`del ${fechaLegible(filtro.desde)} al ${fechaLegible(filtro.hasta)}`);
  } else if (filtro.desde) partes.push(`desde el ${fechaLegible(filtro.desde)}`);
  else if (filtro.hasta) partes.push(`hasta el ${fechaLegible(filtro.hasta)}`);
  if (filtro.contrato) partes.push(`contrato ${filtro.contrato}`);
  return partes.length > 0
    ? `Muestra ${partes.join(', ')}`
    : 'Muestra el estado de cuenta entero';
}
