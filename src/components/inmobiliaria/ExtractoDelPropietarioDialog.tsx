'use client';

/**
 * «Generar extracto» desde la ficha del propietario.
 *
 * El extracto de un mes ya existía en el back (`GET /propietarios/:id/extracto`)
 * y en el modal de dispersiones; en la ficha el botón no tenía `onClick`. Acá
 * se elige el mes, se arma el extracto con datos reales y se puede bajar como
 * PDF o mandarlo al correo del propietario — las dos cosas contra el back, no
 * contra un `setTimeout`.
 */

import { useCallback, useEffect, useState } from 'react';
import { CrossFade } from '@leasefy/cadence';
import { useI18n } from '@/lib/i18n';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SelectorDeMes } from '@/components/finanzas/SelectorDeMes';
import { propietariosApi } from '@/lib/api/inmobiliaria.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import type { ExtractoPropietario as ExtractoDelMes } from '@/lib/types/inmobiliaria';
import { descargar } from '@/lib/propietarios/exportar-datos';
import { AccionesDelExtracto, ExtractoPropietario } from './ExtractoPropietario';

interface ExtractoDelPropietarioDialogProps {
  propietarioId: string;
  propietarioName: string;
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  /** Se llama cuando «Enviar por email» terminó bien (la ficha refresca sus huellas). */
  onEnviado?: () => void;
}

const FORMA_DE_MES = /^\d{4}-(0[1-9]|1[0-2])$/;

/** El mes de hoy en 'YYYY-MM', en hora local. */
export function mesDeHoy(hoy: Date = new Date()): string {
  const mm = String(hoy.getMonth() + 1).padStart(2, '0');
  return `${hoy.getFullYear()}-${mm}`;
}

export function ExtractoDelPropietarioDialog({
  propietarioId,
  propietarioName,
  abierto,
  onOpenChange,
  onEnviado,
}: ExtractoDelPropietarioDialogProps) {
  const { t } = useI18n();
  const [mes, setMes] = useState(() => mesDeHoy());
  const [extracto, setExtracto] = useState<ExtractoDelMes | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mesValido = FORMA_DE_MES.test(mes);

  useEffect(() => {
    if (!abierto || !mesValido) return;
    let vigente = true;
    setCargando(true);
    setError(null);
    propietariosApi
      .getExtracto(propietarioId, mes)
      .then((datos) => {
        if (vigente) setExtracto(datos);
      })
      .catch((e: unknown) => {
        if (!vigente) return;
        setExtracto(null);
        setError(
          mensajeParaLaPersona(e, {
            porDefecto: t('inmobiliaria.propietario.extracto.sinDatos'),
            accion: 'armar el extracto',
          }),
        );
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [abierto, mes, mesValido, propietarioId, t]);

  const descargarPdf = useCallback(async () => {
    const blob = await propietariosApi.getExtractoPdf(propietarioId, mes);
    const nombre = propietarioName.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
    descargar(blob, `extracto-${nombre}-${mes}.pdf`);
  }, [propietarioId, propietarioName, mes]);

  const enviarPorCorreo = useCallback(async () => {
    await propietariosApi.enviarExtracto(propietarioId, mes);
    onEnviado?.();
  }, [propietarioId, mes, onEnviado]);

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      {/* Más ancho que `xl` (880): el extracto tiene diez columnas y una tabla
          de ~1.170 px. Mirado en pantalla el 02-10, a 880 sólo se veían seis
          (Propiedad → Estado) y Comisión, Conceptos y Neto —lo que el
          propietario recibe— quedaban detrás del scroll lateral; a 1024, el
          ancho de antes, se ven casi ocho. Se le devuelve ese ancho. El scroll
          (y su `data-lenis-prevent`) lo pone el cuerpo del Dialog. */}
      {/* P-23 (QA-PROP, 03-10): a 1440 px la tabla (~1.030 px) seguía sin caber
          en 1024 y Neto, fija, tapaba Comisión y Conceptos al correrla. Con
          «Com. %» plegado en Comisión y el diálogo en 1152 (`max-w-6xl`) cabe
          entera; en una pantalla más angosta se corre como antes. */}
      <DialogContent size="xl" className="max-w-6xl" data-testid="extracto-del-propietario">
        <DialogHeader>
          <DialogTitle>{t('inmobiliaria.propietario.extracto.ownerStatement')}</DialogTitle>
          <DialogDescription>{propietarioName}</DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4">
          {/* 🔴 P-23 (QA-PROP, 03-10): el `<input type="month">` del navegador
              decía «October 2026» en un panel en español. Es el selector de
              mes de la casa (‹ Octubre de 2026 ›), el de las pantallas de
              finanzas: en español y sin meses futuros. */}
          <div
            role="group"
            aria-labelledby="mes-del-extracto-etiqueta"
            className="flex flex-wrap items-center gap-x-3 gap-y-1"
          >
            <span id="mes-del-extracto-etiqueta" className="text-xs font-medium text-fg">
              {t('inmobiliaria.propietario.extracto.elegirMes')}
            </span>
            <SelectorDeMes mes={mes} onCambiar={setMes} testId="extracto-mes" />
          </div>

          {/* Cargando → el extracto del mes (o el fallo): se cruzan. */}
          <CrossFade
            swapKey={cargando ? 'cargando' : error ? 'fallo' : extracto ? 'extracto' : 'nada'}
            mode="popLayout"
            className="empty:hidden"
          >
            {cargando && (
              <div
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-6 text-sm text-fg-muted"
                role="status"
                aria-live="polite"
                data-testid="extracto-cargando"
              >
                <Spinner size="sm" />
                {t('inmobiliaria.propietario.extracto.cargando')}
              </div>
            )}

            {!cargando && error && (
              <p className="rounded-lg border border-danger/30 bg-danger-soft p-4 text-sm text-danger" data-testid="extracto-error">
                {error}
              </p>
            )}

            {!cargando && !error && extracto && (
              <ExtractoPropietario
                extracto={extracto}
                onDownloadPDF={descargarPdf}
                onEmail={enviarPorCorreo}
                acciones="afuera"
              />
            )}
          </CrossFade>
        </div>

        {/* P-23: Imprimir / Enviar / Descargar en el pie FIJO del diálogo
            (hijo directo de `DialogContent`): antes iban al final del
            documento, detrás del scroll. */}
        {!cargando && !error && extracto && (
          <DialogFooter>
            <AccionesDelExtracto
              extracto={extracto}
              onDownloadPDF={descargarPdf}
              onEmail={enviarPorCorreo}
              className="w-full"
            />
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ExtractoDelPropietarioDialog;
