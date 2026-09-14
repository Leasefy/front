'use client';

/**
 * «Disponibles sin señal» — qué inmuebles puede abrir esta persona, en este
 * teléfono, sin red.
 *
 * 🔴 Nico, 2026-09-12: «hay muchos apartamentos donde no hay señal; la persona
 * que hace el inventario debería poder agregar todo sin señal y, cuando tenga
 * señal, cargarlo».
 *
 * Sin esta lista, «Preparar para trabajar sin señal» sería un botón que no se
 * puede verificar: la persona sale a la calle sin saber si lo que apretó hace
 * dos días sigue ahí. Por eso cada renglón dice de CUÁNDO es lo guardado —una
 * copia de hace un mes no miente sobre existir, miente sobre estar al día— y
 * se puede quitar lo que ya no sirve.
 *
 * No aparece si no hay nada preparado: una tarjeta vacía explicando una
 * función que nadie usó todavía ocupa el lugar de la tabla.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CloudCheck, X } from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';
import {
  borrarCopia,
  esRutaDeContrato,
  esRutaDeInmueble,
  EVENTO_DE_CAMBIO,
  listarCopias,
  MAXIMO_DE_COPIAS,
  rutaDeLaFichaDelInmueble,
  type CopiaDeInmueble,
} from '@/lib/inventario/copia-de-inmueble';

/** «12 de septiembre, 9:19 p. m.» */
function cuando(marca: number): string {
  return new Date(marca).toLocaleString('es-CO', {
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface Props {
  /**
   * Cómo salió el último «Preparar…». Vive acá y no en un toast porque los
   * toasts de este panel no se pintan, y este aviso es lo único que dice si
   * la persona puede salir a la calle confiada.
   */
  aviso?: { ok: boolean; texto: string } | null;
}

export function DisponiblesSinSenal({ aviso = null }: Props = {}) {
  const { t } = useI18n();
  const [copias, setCopias] = useState<CopiaDeInmueble[]>([]);

  const cargar = useCallback(() => {
    void listarCopias()
      .then(setCopias)
      .catch(() => setCopias([]));
  }, []);

  // Se recarga con el evento que dispara la capa de copias: preparar un
  // inmueble desde el menú de una fila tiene que verse acá sin recargar.
  useEffect(() => {
    cargar();
    window.addEventListener(EVENTO_DE_CAMBIO, cargar);
    return () => window.removeEventListener(EVENTO_DE_CAMBIO, cargar);
  }, [cargar]);

  // Sin nada preparado y sin nada que avisar, la tarjeta no existe: explicar
  // una función que nadie usó todavía le saca el lugar a la tabla.
  if (copias.length === 0 && !aviso) return null;

  return (
    <div
      className="rounded-md border border-border bg-surface p-4 space-y-3"
      data-testid="disponibles-sin-senal"
    >
      <div className="flex items-center gap-2">
        <CloudCheck className="w-5 h-5 text-fg-muted flex-shrink-0" />
        <h2 className="text-sm font-medium text-fg">
          {t('inmobiliaria.sinSenal.listaTitulo')}
        </h2>
        <span className="text-xs text-fg-muted">
          {copias.length} / {MAXIMO_DE_COPIAS}
        </span>
      </div>

      {aviso && (
        <p
          className={`text-xs ${aviso.ok ? 'text-success' : 'text-warning'}`}
          role="status"
          data-testid="aviso-sin-senal"
        >
          {aviso.texto}
        </p>
      )}

      <ul className="divide-y divide-border">
        {copias.map((copia) => {
          /*
           * 🔴 Desde el 2026-09-13 el inventario también se carga desde la
           * ficha del CONTRATO, y el service worker guarda PÁGINAS: preparar
           * desde el contrato no deja lista la del inmueble ni al revés. Por
           * eso el renglón dice desde dónde se abre —es la única forma de que
           * la persona lo sepa antes de llegar al apartamento— y sólo nombra
           * las páginas que el worker confirmó (ver `rutas` en la copia).
           *
           * Las copias guardadas antes de esto no tienen `rutas`: se las trata
           * como lo que eran, la ficha del inmueble.
           */
          const rutas = copia.rutas ?? [];
          const delInmueble =
            rutas.find(esRutaDeInmueble) ??
            (rutas.length === 0 ? rutaDeLaFichaDelInmueble(copia.consignacionId) : undefined);
          const delContrato = rutas.find(esRutaDeContrato);
          const principal = delInmueble ?? delContrato ?? rutaDeLaFichaDelInmueble(copia.consignacionId);
          return (
          <li
            key={copia.consignacionId}
            className="py-2 flex items-center justify-between gap-3"
            data-testid="disponible-sin-senal"
          >
            <div className="min-w-0">
            <Link href={principal} className="min-w-0 group block">
              <p className="text-sm text-fg truncate group-hover:text-primary transition-colors">
                {copia.titulo}
              </p>
              <p className="text-xs text-fg-muted truncate">
                {copia.direccion} · {t('inmobiliaria.sinSenal.guardado', { cuando: cuando(copia.guardadoEn) })}
              </p>
            </Link>
            <p className="text-xs text-fg-muted truncate" data-testid="se-abre-desde">
              {t('inmobiliaria.sinSenal.seAbreDesde')}{' '}
              {delInmueble && (
                <Link href={delInmueble} className="hover:text-primary transition-colors underline">
                  {t('inmobiliaria.sinSenal.elInmueble')}
                </Link>
              )}
              {delInmueble && delContrato ? ' · ' : ''}
              {delContrato && (
                <Link href={delContrato} className="hover:text-primary transition-colors underline">
                  {t('inmobiliaria.sinSenal.elContrato')}
                </Link>
              )}
            </p>
            </div>
            <button
              type="button"
              className="text-fg-muted hover:text-fg transition-colors shrink-0 p-1"
              aria-label={t('inmobiliaria.sinSenal.quitar')}
              onClick={() => void borrarCopia(copia.consignacionId)}
            >
              <X className="w-4 h-4" />
            </button>
          </li>
          );
        })}
      </ul>
    </div>
  );
}
