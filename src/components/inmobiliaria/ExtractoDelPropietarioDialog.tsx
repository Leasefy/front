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
import { CalendarBlank } from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';
import { Spinner } from '@/components/ui/spinner';
import { Input, Label } from '@/components/ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { propietariosApi } from '@/lib/api/inmobiliaria.service';
import { ApiError } from '@/lib/api/client';
import type { ExtractoPropietario as ExtractoDelMes } from '@/lib/types/inmobiliaria';
import { descargar } from '@/lib/propietarios/exportar-datos';
import { nombreDelMes } from '@/lib/utils/mes';
import { ExtractoPropietario } from './ExtractoPropietario';

interface ExtractoDelPropietarioDialogProps {
  propietarioId: string;
  propietarioName: string;
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
}

const FORMA_DE_MES = /^\d{4}-(0[1-9]|1[0-2])$/;

/** El mes de hoy en 'YYYY-MM', en hora local. */
export function mesDeHoy(hoy: Date = new Date()): string {
  const mm = String(hoy.getMonth() + 1).padStart(2, '0');
  return `${hoy.getFullYear()}-${mm}`;
}

/** «septiembre de 2026» → «Septiembre de 2026». Con `capitalize` de CSS salía «Septiembre De 2026». */
function conInicialMayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function mensajeDe(error: unknown, porDefecto: string): string {
  if (error instanceof ApiError) return error.messages?.join(' · ') ?? error.message;
  if (error instanceof Error && error.message) return error.message;
  return porDefecto;
}

export function ExtractoDelPropietarioDialog({
  propietarioId,
  propietarioName,
  abierto,
  onOpenChange,
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
        setError(mensajeDe(e, t('inmobiliaria.propietario.extracto.sinDatos')));
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
  }, [propietarioId, mes]);

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      {/* Ancho de dispersiones: el extracto tiene nueve columnas. El scroll lo
          pone el Dialog; `data-lenis-prevent` para que el scroll suave no se
          coma el de esto que flota. */}
      <DialogContent className="max-w-5xl max-h-[90vh]" data-lenis-prevent>
        <DialogHeader>
          <DialogTitle>{t('inmobiliaria.propietario.extracto.ownerStatement')}</DialogTitle>
          <DialogDescription>{propietarioName}</DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4 p-6 pt-2">
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="mes-del-extracto" className="text-xs">
                {t('inmobiliaria.propietario.extracto.elegirMes')}
              </Label>
              <Input
                id="mes-del-extracto"
                type="month"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                className="h-10 w-44 font-mono"
                data-testid="extracto-mes"
              />
            </div>
            {mesValido && (
              <p className="flex items-center gap-1.5 pb-2.5 text-sm text-fg-muted">
                <CalendarBlank className="h-4 w-4" />
                <span>{conInicialMayuscula(nombreDelMes(mes))}</span>
              </p>
            )}
          </div>

          {cargando && (
            <div
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-6 text-sm text-fg-muted"
              role="status"
              aria-live="polite"
              data-testid="extracto-cargando"
            >
              <Spinner size="sm" />
              {t('inmobiliaria.propietario.extracto.cargando')}
            </div>
          )}

          {!cargando && error && (
            <p className="rounded-xl border border-danger/30 bg-danger-soft p-4 text-sm text-danger" data-testid="extracto-error">
              {error}
            </p>
          )}

          {!cargando && !error && extracto && (
            <ExtractoPropietario
              extracto={extracto}
              onDownloadPDF={descargarPdf}
              onEmail={enviarPorCorreo}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ExtractoDelPropietarioDialog;
