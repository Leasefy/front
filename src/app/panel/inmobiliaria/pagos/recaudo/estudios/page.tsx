'use client';

/**
 * Estudios pagados a la inmobiliaria (17-09-2026) — la caja del estudio.
 *
 * Cada fila es un recibo (del consecutivo de la agencia) con su factura
 * generada. El estudio no se devuelve: anular es sólo para un error de caja, lo
 * hace un administrador y con motivo.
 *
 * Permiso: `cobros`/view, el mismo del back (`GET /inmobiliaria/estudios/pagos`).
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import { PageGuard } from '@/components/auth/PageGuard';
import { SectionLabel } from '@/components/ui/section-label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { formatCurrency } from '@/lib/format';
import { estudiosApi, type PagoDeEstudio } from '@/lib/api/estudios.service';

function Contenido() {
  const { isAdmin, agencyRole } = usePermissions();
  const esAdministrador = isAdmin || agencyRole === 'ADMIN';
  const [pagos, setPagos] = useState<PagoDeEstudio[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [cargando, setCargando] = useState(true);
  /* 🔴 Anular pide el motivo con el diálogo del sistema de diseño: el del
     navegador ignora el tema y algunos navegadores lo suprimen. */
  const [anulando, setAnulando] = useState<PagoDeEstudio | null>(null);
  const [motivo, setMotivo] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setPagos(await estudiosApi.listar());
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const anular = async () => {
    const pago = anulando;
    if (!pago || motivo.trim().length < 5) return;
    try {
      await estudiosApi.anular(pago.id, motivo.trim());
      toast.success(`Recibo #${pago.numeroRecibo} anulado`);
      setAnulando(null);
      setMotivo('');
      await cargar();
    } catch (e) {
      toast.error('No se pudo anular', { description: e instanceof Error ? e.message : undefined });
    }
  };

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="space-y-1.5">
        <SectionLabel>Pagos · inquilinos</SectionLabel>
        <h1 className="text-h2 text-fg">Estudios pagados</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          El estudio lo paga el solicitante a la inmobiliaria: recibo y factura. No se devuelve y, mientras esté vigente,
          le sirve para cualquier inmueble sin volver a pagar.{' '}
          <Link className="underline" href="/panel/inmobiliaria/pagos/recaudo">
            Volver a Recaudo
          </Link>
        </p>
      </header>
      <EstadoDeDatos
        cargando={cargando}
        error={error}
        queEs="los estudios pagados"
        onReintentar={cargar}
        vacio={!pagos || pagos.length === 0}
        cuandoVacio={<p className="text-sm text-fg-muted">Todavía no hay estudios pagados.</p>}
      >
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm" data-testid="estudios-pagados">
            <thead className="bg-surface-muted text-left text-xs text-fg-muted">
              <tr>
                <th className="p-3">Recibo</th>
                <th className="p-3">Fecha</th>
                <th className="p-3">Solicitante</th>
                <th className="p-3 text-right">Valor</th>
                <th className="p-3">Factura</th>
                <th className="p-3">Vigencia</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {(pagos ?? []).map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3 font-mono">#{p.numeroRecibo}</td>
                  <td className="p-3">{p.fecha}</td>
                  <td className="p-3">
                    {p.solicitante.nombre}
                    {p.solicitante.documento ? <span className="block text-xs text-fg-muted">{p.solicitante.documento}</span> : null}
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums">{formatCurrency(p.valorCop)}</td>
                  <td className="p-3">{p.factura.estado === 'GENERADA' ? 'Generada (sin número)' : p.factura.estado}</td>
                  <td className="p-3">
                    {p.anulado ? `Anulado: ${p.motivoDeAnulacion ?? ''}` : p.vigente ? `Vigente hasta ${p.vigenteHasta.slice(0, 10)}` : 'Vencido'}
                  </td>
                  <td className="p-3 text-right">
                    {esAdministrador && !p.anulado && (
                      <Button
                        size="sm"
                        variant="outline"
                        hideArrow
                        onClick={() => {
                          setAnulando(p);
                          setMotivo('');
                        }}
                        data-testid={`anular-${p.id}`}
                      >
                        Anular
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </EstadoDeDatos>

      <AlertDialog open={anulando !== null} onOpenChange={(abierto) => !abierto && setAnulando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Anular el recibo #{anulando?.numeroRecibo ?? ''}
            </AlertDialogTitle>
            <AlertDialogDescription>
              El estudio NO se devuelve: anular es sólo para un error de caja. Queda escrito el motivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo-anular-estudio">Motivo</Label>
            <Textarea
              id="motivo-anular-estudio"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Se registró dos veces el mismo pago."
              rows={3}
              maxLength={300}
            />
            <p className="text-caption text-fg-muted">Entre 5 y 300 caracteres.</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void anular();
              }}
              disabled={motivo.trim().length < 5}
              data-testid="confirmar-anular-estudio"
            >
              Anular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function EstudiosPagadosPage() {
  return (
    <PageGuard module="cobros" action="view">
      <Contenido />
    </PageGuard>
  );
}
