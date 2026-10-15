'use client';

/**
 * El SOBRECOSTO de una reparación que ya aprobaste (Nico, 11-10-2026:
 * «Volver a pedirle aprobación»). Se te descuenta lo que aprobaste; la
 * diferencia sólo si la apruebas aquí. Si la rechazas, la decide tu
 * inmobiliaria.
 */
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { formatCurrency } from '@/lib/format';
import { portalDelPropietarioApi, type SobrecostoDeReparacion } from '@/lib/api/portal-del-propietario.service';

function Pendiente({ s, onListo }: { s: SobrecostoDeReparacion; onListo: () => void }) {
  const [enviando, setEnviando] = useState<null | 'aprobar' | 'rechazar'>(null);
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState('');

  const decidir = async (cual: 'aprobar' | 'rechazar') => {
    setEnviando(cual);
    try {
      if (cual === 'aprobar') {
        await portalDelPropietarioApi.aprobarSobrecosto(s.id);
        toast.success('Aprobaste el sobrecosto', {
          description: `Se te descuentan ${formatCurrency(s.costoFinalCop)} en total por esta reparación.`,
        });
      } else {
        await portalDelPropietarioApi.rechazarSobrecosto(s.id, motivo.trim() || undefined);
        toast.success('Rechazaste el sobrecosto', {
          description: `Se te descuenta sólo lo que aprobaste (${formatCurrency(s.aprobadoCop)}). Tu inmobiliaria decide la diferencia.`,
        });
      }
      onListo();
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: 'No pudimos guardar tu decisión.', accion: 'decidir el sobrecosto' }));
    } finally {
      setEnviando(null);
    }
  };

  return (
    <Card className="space-y-3 p-5" data-testid="sobrecosto-pendiente">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-caption text-fg-muted">{s.inmueble ?? 'Tu inmueble'}</p>
          <h3 className="text-subtitle text-fg">{s.titulo}: costó más de lo que aprobaste</h3>
        </div>
        <p className="font-mono text-subtitle tabular-nums text-fg">+{formatCurrency(s.diferenciaCop)}</p>
      </div>
      <p className="text-body-sm text-fg-muted">
        Aprobaste {formatCurrency(s.aprobadoCop)} y el trabajo terminó costando {formatCurrency(s.costoFinalCop)}. Hoy se te
        descuenta lo que aprobaste; la diferencia sólo si la apruebas.
      </p>
      {rechazando && (
        <Textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Cuéntale a tu inmobiliaria por qué (opcional)"
          maxLength={500}
          data-testid="sobrecosto-motivo"
        />
      )}
      <div className="flex flex-wrap gap-2">
        {!rechazando && (
          <Button hideArrow isLoading={enviando === 'aprobar'} disabled={enviando !== null} onClick={() => void decidir('aprobar')} data-testid="sobrecosto-aprobar">
            Aprobar la diferencia
          </Button>
        )}
        {rechazando ? (
          <Button variant="outline" hideArrow isLoading={enviando === 'rechazar'} disabled={enviando !== null} onClick={() => void decidir('rechazar')} data-testid="sobrecosto-confirmar-rechazo">
            Rechazar la diferencia
          </Button>
        ) : (
          <Button variant="outline" hideArrow disabled={enviando !== null} onClick={() => setRechazando(true)} data-testid="sobrecosto-rechazar">
            Rechazar
          </Button>
        )}
      </div>
    </Card>
  );
}

/** Los sobrecostos por aprobar; sin la migración del back o sin ninguno, no pinta nada. */
export function SobrecostosPorAprobar({ alCambiar }: { alCambiar?: () => void }) {
  const [pendientes, setPendientes] = useState<SobrecostoDeReparacion[]>([]);

  const cargar = useCallback(async () => {
    try {
      const r = await portalDelPropietarioApi.sobrecostos();
      setPendientes(r.pendientes);
    } catch {
      setPendientes([]);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (pendientes.length === 0) return null;
  return (
    <section className="space-y-3" aria-label="Sobrecostos por aprobar" data-testid="sobrecostos-por-aprobar">
      <h2 className="text-sm font-semibold text-fg">Costaron más de lo que aprobaste</h2>
      {pendientes.map((s) => (
        <Pendiente
          key={s.id}
          s={s}
          onListo={() => {
            void cargar();
            alCambiar?.();
          }}
        />
      ))}
    </section>
  );
}
