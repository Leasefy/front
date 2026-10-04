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
import { CaretDown, CloudCheck, X } from '@phosphor-icons/react';
import { Collapse } from '@leasefy/cadence';
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
  const [abierto, setAbierto] = useState(false);

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

  /*
   * IN-01 (QA 04-10): el bloque abría desplegado arriba de la tabla —nueve
   * filas, media pantalla— antes de los inmuebles. Ahora es UNA línea plegada
   * («9 inmuebles guardados para trabajar sin señal · Ver») y la lista se abre
   * a pedido. El aviso de lo recién guardado se ve siempre.
   */
  return (
    <div
      className="rounded-md border border-border bg-surface px-4 py-3"
      data-testid="disponibles-sin-senal"
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 text-left"
        aria-expanded={abierto}
        onClick={() => setAbierto((a) => !a)}
        data-testid="disponibles-sin-senal-ver"
      >
        <CloudCheck className="w-5 h-5 text-fg-muted flex-shrink-0" />
        {/* 🔴 «2 / 25» no significa nada por sí solo (Nico, 18-09-2026): se
            dice con palabras, y el tope de 25 va adentro. */}
        <span className="min-w-0 flex-1 text-sm text-fg">
          {copias.length === 1
            ? '1 inmueble guardado para trabajar sin señal'
            : `${copias.length} inmuebles guardados para trabajar sin señal`}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-sm text-primary">
          {abierto ? 'Ocultar' : 'Ver'}
          <CaretDown className={`h-3.5 w-3.5 transition-transform ${abierto ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {aviso && (
        <p
          className={`mt-2 text-xs ${aviso.ok ? 'text-success' : 'text-warning'}`}
          role="status"
          data-testid="aviso-sin-senal"
        >
          {aviso.texto}
        </p>
      )}

      <Collapse open={abierto}>
      <div className="space-y-3 pt-3">
      <p className="text-xs text-fg-muted">
        {copias.length === 1
          ? 'Este inmueble ya está descargado en este dispositivo: puedes abrirlo y llenar su inventario aunque no haya señal, y se sube cuando vuelvas a tener.'
          : 'Estos inmuebles ya están descargados en este dispositivo: puedes abrirlos y llenar su inventario aunque no haya señal, y se suben cuando vuelvas a tener.'}{' '}
        Caben hasta {MAXIMO_DE_COPIAS}.
      </p>

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
                {/* La dirección sólo si no es el mismo título (antes salía dos veces). */}
                {copia.direccion && copia.direccion.trim() !== copia.titulo.trim() ? `${copia.direccion} · ` : ''}
                {t('inmobiliaria.sinSenal.guardado', { cuando: cuando(copia.guardadoEn) })}
              </p>
            </Link>
            {/* «Se abre desde» sólo cuando hay algo que decir: con la ficha del
                inmueble sola, el renglón ya lleva ahí. */}
            {delContrato && (
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
            )}
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
      </Collapse>
    </div>
  );
}
