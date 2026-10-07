'use client';

/**
 * 🔴 ARREGLOS-6b (Nico, Q1 a: «alinear la fila del front con la regla del
 * back»): cuando recibos YA EMITIDOS respaldan la línea (de la misma persona del
 * 1:1, o que la línea misma nombra), la fila no ofrece las cuotas ni «Conciliar
 * con un cliente» —emitiría otro recibo por la misma plata— y dice cuáles son.
 * Si no son una propuesta de muchos a uno (recibos del mismo cliente que suman
 * la línea), ofrece conciliar con ellos aquí mismo; si lo son, se aprueban en la
 * tarjeta de arriba. Con un back anterior (sin `recibosYaEmitidos`), la frase de
 * siempre.
 */

import { useState } from 'react';
import { CheckCircle } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { conciliacionBancariaApi } from '@/lib/api/conciliacion-bancaria.service';
import type { MovimientoBancario } from '@/lib/api/conciliacion-bancaria.types';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { losRecibosNumero } from './muchos-a-uno';

interface Props {
  movimiento: MovimientoBancario;
  puedeConciliar: boolean;
  ocupado: boolean;
  onCambio: () => void;
}

export function RecibosYaEmitidos({ movimiento: m, puedeConciliar, ocupado, onCambio }: Props) {
  const [enviando, setEnviando] = useState(false);
  const ya = m.muchosAUno?.recibosYaEmitidos ?? null;

  if (!ya || ya.numeros.length === 0) {
    return (
      <p className="text-caption text-fg-muted" data-testid={`sin-uno-a-uno-${m.id}`}>
        Los recibos de arriba ya están emitidos y suman exacto este movimiento: apruébalos, o usa «Corregir» si son
        otros. Conciliarlo contra una cuota o un cliente emitiría otro recibo por la misma plata.
      </p>
    );
  }

  const cuales = losRecibosNumero(ya.numeros);
  const Cuales = cuales.charAt(0).toUpperCase() + cuales.slice(1);

  if (ya.deLaPropuesta) {
    return (
      <p className="text-caption text-fg-muted" data-testid={`sin-uno-a-uno-${m.id}`}>
        {Cuales} ya {ya.numeros.length === 1 ? 'está emitido' : 'están emitidos'} y{' '}
        {ya.numeros.length === 1 ? 'suma' : 'suman'} exacto este movimiento:{' '}
        {ya.numeros.length === 1 ? 'apruébalo arriba, o usa «Corregir» si es otro' : 'apruébalos arriba, o usa «Corregir» si son otros'}.
        Conciliarlo contra una cuota o un cliente emitiría otro recibo por la misma plata.
      </p>
    );
  }

  const conciliar = async () => {
    setEnviando(true);
    try {
      await conciliacionBancariaApi.conciliarConRecibos(m.id, ya.reciboIds);
      toast.success(`Movimiento conciliado con ${cuales}. No se emitió ningún recibo nuevo.`);
      onCambio();
    } catch (error) {
      toast.error(
        mensajeParaLaPersona(error, {
          porDefecto: 'No se pudo conciliar el movimiento con esos recibos.',
          accion: 'conciliar el movimiento con esos recibos',
        }),
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-1.5" data-testid={`sin-uno-a-uno-${m.id}`}>
      <p className="text-caption text-fg-muted">
        {Cuales} de este cliente ya {ya.numeros.length === 1 ? 'está emitido' : 'están emitidos'} y{' '}
        {ya.numeros.length === 1 ? 'suma' : 'suman'} exacto este movimiento. Si es esa plata, concílialo con{' '}
        {ya.numeros.length === 1 ? 'él' : 'ellos'}: contra una cuota o un cliente emitiría otro recibo por la misma
        plata.
      </p>
      <Button
        size="sm"
        variant="secondary"
        hideArrow
        disabled={!puedeConciliar || ocupado || enviando}
        isLoading={enviando}
        onClick={() => void conciliar()}
        data-testid={`conciliar-con-los-recibos-${m.id}`}
      >
        <CheckCircle className="h-4 w-4" aria-hidden="true" />
        Conciliar con {ya.numeros.length === 1 ? 'ese recibo' : 'esos recibos'}
      </Button>
    </div>
  );
}
