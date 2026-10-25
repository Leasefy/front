'use client';

/**
 * Operación → Servicios públicos: «Mori recuerda la factura» (reunión con
 * Portofino, Nico 22-10-2026, «Sí, y también cobra»).
 *
 * Reglas de Nico: el día que elige la inmobiliaria del mes siguiente (20 por
 * defecto) y otra vez 7 días después, Mori le escribe por WhatsApp al inquilino
 * que no ha subido la factura pagada (o se la rechazaron, con el motivo) y le
 * explica el riesgo de corte. Si ya lo está cobrando, se lo dice en esa misma
 * gestión de cobro. Arranca APAGADO: nadie recibe nada hasta prenderlo.
 */

import { useState } from 'react';

import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { fechaCorta } from '@/components/contratos/BandejaDeCartasDelIncremento';
import {
  serviciosPublicosApi,
  type ConfiguracionDelRecordatorio,
  type RecordatorioDeMori,
} from '@/lib/api/servicios-publicos.service';

/** Lo que Mori hizo con la factura de un contrato este mes, en una frase. */
export function fraseDeLosRecordatorios(recordatorios: ReadonlyArray<RecordatorioDeMori> | undefined): string | null {
  const hechos = (recordatorios ?? []).filter((r) => r.estado !== 'EN_CURSO').sort((a, b) => a.intento - b.intento);
  if (hechos.length === 0) return null;
  const ultimo = hechos[hechos.length - 1];
  if (ultimo.estado === 'EN_LA_GESTION_DE_COBRO')
    return `Mori se lo dice en su gestión de cobro (${fechaCorta(ultimo.dia)})`;
  if (ultimo.estado === 'NO_SE_ENVIA') return `Mori no pudo escribirle: ${ultimo.detalle ?? 'no recibe WhatsApp'}`;
  const enviados = hechos.filter((r) => r.estado === 'ENVIADO');
  if (enviados.length >= 2)
    return `Mori le recordó 2 veces (${fechaCorta(enviados[0].dia)} y ${fechaCorta(enviados[1].dia)})`;
  return `Mori le recordó el ${fechaCorta(ultimo.dia)}`;
}

export function MoriRecuerdaLaFactura({
  configuracion,
  puedeEditar,
  onCambio,
}: {
  configuracion: ConfiguracionDelRecordatorio;
  puedeEditar: boolean;
  onCambio: (c: ConfiguracionDelRecordatorio) => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const prendido = configuracion.dia !== null;
  const dia = configuracion.dia ?? configuracion.diaPorDefecto;

  async function guardar(nuevo: number | null) {
    setGuardando(true);
    try {
      const c = await serviciosPublicosApi.guardarRecordatorio(nuevo);
      onCambio(c);
      toast.success(
        nuevo === null
          ? 'Mori ya no recuerda la factura de servicios.'
          : `Listo: Mori recuerda la factura el día ${nuevo} del mes siguiente y 7 días después.`,
      );
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { accion: 'guardar el recordatorio' }));
    } finally {
      setGuardando(false);
    }
  }

  if (!configuracion.disponible) return null;
  const dias = Array.from({ length: configuracion.diaMaximo }, (_, i) => i + 1);

  return (
    <div
      className="flex flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5"
      data-testid="mori-recuerda"
    >
      <div className="min-w-0 space-y-0.5">
        <p className="text-body-sm text-fg">Mori recuerda la factura</p>
        <p className="max-w-2xl text-caption text-fg-muted">
          {prendido
            ? `El día ${dia} del mes siguiente y 7 días después, Mori le escribe por WhatsApp a quien no ha subido la factura pagada (o se la rechazaron) y le explica el riesgo de corte. Si ya lo está cobrando, se lo dice en esa gestión.`
            : 'Apagado. Al prenderlo, Mori le recuerda por WhatsApp al inquilino la factura que no ha subido, con el riesgo de corte, dos veces al mes.'}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {prendido && (
          <Select
            value={String(dia)}
            onValueChange={(v) => void guardar(Number(v))}
            disabled={!puedeEditar || guardando}
          >
            <SelectTrigger className="w-[130px]" aria-label="Día del recordatorio" data-testid="mori-recuerda-dia">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dias.map((d) => (
                <SelectItem key={d} value={String(d)}>
                  Día {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Switch
          checked={prendido}
          onCheckedChange={(v) => void guardar(v ? configuracion.diaPorDefecto : null)}
          disabled={!puedeEditar || guardando}
          aria-label="Mori recuerda la factura"
          data-testid="mori-recuerda-interruptor"
        />
      </div>
    </div>
  );
}
