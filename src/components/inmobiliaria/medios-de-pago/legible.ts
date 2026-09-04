/**
 * Cómo se lee un medio de pago: nombres de los tipos, qué campos pide cada
 * uno, la frase de una línea y el número tapado. Sin React, para probarse
 * en frío.
 */

import { Bank, DeviceMobile, DotsThree, Link as LinkIcon, Money, Wallet } from '@phosphor-icons/react';
import type {
  MedioDePago,
  NuevoMedioDePago,
  TipoDeMedioDePago,
} from '@/lib/api/medios-de-pago.types';

export const NOMBRE_DEL_TIPO: Record<TipoDeMedioDePago, string> = {
  TRANSFERENCIA: 'Transferencia bancaria',
  EFECTIVO: 'Efectivo',
  PSE: 'PSE',
  NEQUI: 'Nequi',
  DAVIPLATA: 'Daviplata',
  ENLACE_DE_PAGO: 'Enlace de pago',
  OTRO: 'Otro',
};

export const ICONO_DEL_TIPO: Record<TipoDeMedioDePago, typeof Bank> = {
  TRANSFERENCIA: Bank,
  EFECTIVO: Money,
  PSE: Wallet,
  NEQUI: DeviceMobile,
  DAVIPLATA: DeviceMobile,
  ENLACE_DE_PAGO: LinkIcon,
  OTRO: DotsThree,
};

export const TIPOS: readonly TipoDeMedioDePago[] = [
  'TRANSFERENCIA',
  'EFECTIVO',
  'NEQUI',
  'DAVIPLATA',
  'ENLACE_DE_PAGO',
  'PSE',
  'OTRO',
];

export type CampoDelMedio =
  | 'banco'
  | 'tipoDeCuenta'
  | 'numeroDeCuenta'
  | 'titular'
  | 'documentoTitular'
  | 'enlace';

/** Qué campos muestra cada tipo, y cuáles son obligatorios (calca el back). */
export const CAMPOS_DEL_TIPO: Record<
  TipoDeMedioDePago,
  { muestra: CampoDelMedio[]; exige: CampoDelMedio[] }
> = {
  TRANSFERENCIA: {
    muestra: ['banco', 'tipoDeCuenta', 'numeroDeCuenta', 'titular', 'documentoTitular'],
    exige: ['banco', 'tipoDeCuenta', 'numeroDeCuenta', 'titular'],
  },
  EFECTIVO: { muestra: [], exige: [] },
  PSE: { muestra: ['enlace'], exige: [] },
  NEQUI: { muestra: ['numeroDeCuenta', 'titular'], exige: ['numeroDeCuenta'] },
  DAVIPLATA: { muestra: ['numeroDeCuenta', 'titular'], exige: ['numeroDeCuenta'] },
  ENLACE_DE_PAGO: { muestra: ['enlace'], exige: ['enlace'] },
  OTRO: { muestra: ['enlace'], exige: [] },
};

export const ETIQUETA_DEL_CAMPO: Record<CampoDelMedio, string> = {
  banco: 'Banco',
  tipoDeCuenta: 'Tipo de cuenta',
  numeroDeCuenta: 'Número de cuenta',
  titular: 'Titular',
  documentoTitular: 'NIT o cédula del titular',
  enlace: 'Enlace (https)',
};

/** Para Nequi y Daviplata el «número de cuenta» es el celular. */
export function etiquetaDelCampo(campo: CampoDelMedio, tipo: TipoDeMedioDePago): string {
  if (campo === 'numeroDeCuenta' && (tipo === 'NEQUI' || tipo === 'DAVIPLATA')) return 'Celular';
  return ETIQUETA_DEL_CAMPO[campo];
}

/** Los últimos cuatro a la vista; el resto tapado. */
export function enmascarar(numero: string | null | undefined): string | null {
  if (!numero) return null;
  const limpio = numero.replace(/\s/g, '');
  if (limpio.length <= 4) return limpio;
  return `•••• ${limpio.slice(-4)}`;
}

/**
 * Los mensajes que devuelve el back, letra por letra, para frenar antes de
 * mandar. Devuelve `null` si el medio está completo.
 */
export function faltanteDe(m: Pick<NuevoMedioDePago, 'tipo' | 'banco' | 'tipoDeCuenta' | 'numeroDeCuenta' | 'titular' | 'enlace'>): string | null {
  const nombreTipo = NOMBRE_DEL_TIPO[m.tipo];
  const falta = (campo: string) => `${campo} es obligatorio para un medio de tipo ${nombreTipo}.`;
  const vacio = (v: string | null | undefined) => !v || v.trim() === '';
  const https = (v: string) => /^https:\/\/\S+$/i.test(v.trim());
  switch (m.tipo) {
    case 'TRANSFERENCIA':
      if (vacio(m.banco)) return falta('El banco');
      if (vacio(m.tipoDeCuenta)) return falta('El tipo de cuenta');
      if (vacio(m.numeroDeCuenta)) return falta('El número de cuenta');
      if (vacio(m.titular)) return falta('El titular');
      return null;
    case 'NEQUI':
    case 'DAVIPLATA':
      if (vacio(m.numeroDeCuenta)) return falta('El número de celular');
      return null;
    case 'ENLACE_DE_PAGO':
      if (vacio(m.enlace)) return falta('El enlace');
      if (!https(m.enlace!)) {
        return 'El enlace de pago tiene que empezar con https:// — un enlace sin cifrar no se le manda a un inquilino.';
      }
      return null;
    default:
      if (!vacio(m.enlace) && !https(m.enlace!)) return 'Si hay un enlace, tiene que empezar con https://.';
      return null;
  }
}

/** La línea que va debajo del nombre en la lista. */
export function describirMedio(m: Pick<MedioDePago, 'tipo' | 'banco' | 'tipoDeCuenta' | 'numeroDeCuenta' | 'titular' | 'enlace'>): string {
  const partes: string[] = [];
  switch (m.tipo) {
    case 'TRANSFERENCIA':
      if (m.banco) partes.push(m.banco);
      if (m.tipoDeCuenta) partes.push(m.tipoDeCuenta === 'AHORROS' ? 'Ahorros' : m.tipoDeCuenta === 'CORRIENTE' ? 'Corriente' : m.tipoDeCuenta);
      if (m.numeroDeCuenta) partes.push(enmascarar(m.numeroDeCuenta)!);
      if (m.titular) partes.push(m.titular);
      break;
    case 'NEQUI':
    case 'DAVIPLATA':
      partes.push(NOMBRE_DEL_TIPO[m.tipo]);
      if (m.numeroDeCuenta) partes.push(enmascarar(m.numeroDeCuenta)!);
      if (m.titular) partes.push(m.titular);
      break;
    case 'ENLACE_DE_PAGO':
      partes.push(m.enlace ?? 'Sin enlace');
      break;
    case 'EFECTIVO':
      partes.push('Se recibe en la oficina y se emite el recibo de caja en el momento.');
      break;
    default:
      partes.push(NOMBRE_DEL_TIPO[m.tipo]);
      if (m.enlace) partes.push(m.enlace);
  }
  return partes.join(' · ');
}

export interface SugerenciaDeMedio {
  id: 'transferencia' | 'efectivo';
  titulo: string;
  explicacion: string;
  /** Con qué se abre el editor. La cuenta la escribe la persona. */
  valores: NuevoMedioDePago;
  /** Si está completa se crea de un clic; si no, se abre el editor. */
  directa: boolean;
}

export function sugerencias(agencia?: { name?: string | null; razonSocial?: string | null; nit?: string | null } | null): SugerenciaDeMedio[] {
  return [
    {
      id: 'transferencia',
      titulo: 'Transferencia a la cuenta de la inmobiliaria',
      explicacion:
        'La cuenta a la que el inquilino transfiere el canon. Se muestra con el número tapado; el completo lo das vos por el canal que elijas.',
      valores: {
        tipo: 'TRANSFERENCIA',
        nombre: 'Transferencia bancaria',
        titular: agencia?.razonSocial || agencia?.name || null,
        documentoTitular: agencia?.nit || null,
        instrucciones: 'Mandá el comprobante con la dirección del inmueble.',
      },
      directa: false,
    },
    {
      id: 'efectivo',
      titulo: 'Efectivo en la oficina',
      explicacion: 'Para quien paga en persona. El recibo de caja se emite en el momento.',
      valores: { tipo: 'EFECTIVO', nombre: 'Efectivo en la oficina' },
      directa: true,
    },
  ];
}
