'use client';

/**
 * «Exportar» de Mantenimientos (Juan Camilo y Nico, 28-10-2026): «exportar reportes en Excel y también un reporte de
 * todo lo que hizo en el mes para liquidar a los proveedores». Dos cosas en una ventana:
 *   · Todo Mantenimientos (Excel): solicitudes, cotizaciones, proveedores, calificaciones y tiempos del mes.
 *   · Liquidación de proveedores: por proveedor, lo que cerró en el mes y el total a pagarle; Excel o PDF, uno o todos.
 */

import { useMemo, useState } from 'react';
import { DownloadSimple, FilePdf, FileXls } from '@phosphor-icons/react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { proveedoresDeMantenimientoApi } from '@/lib/api/proveedores-de-mantenimiento.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { descargar } from '@/lib/propietarios/exportar-datos';
import {
  hojaDeCalificaciones,
  hojaDeCotizaciones,
  hojaDeLiquidacion,
  hojaDeProveedores,
  hojaDeSolicitudes,
  hojaDeTiempos,
  liquidacionDelMes,
  mesEnPalabras,
  ultimosMeses,
  type LiquidacionDelProveedor,
} from '@/lib/mantenimiento/reportes-de-mantenimiento';
import type { SolicitudMantenimiento } from '@/lib/types/inmobiliaria';
import { cn } from '@/lib/utils';

type Que = 'todo' | 'liquidacion';
const TODOS = '__todos__';
const XLSX_TIPO = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const pesos = (v: number) => `$ ${Math.round(v).toLocaleString('es-CO')}`;

async function libro(hojas: Array<[string, (string | number)[][]]>, nombre: string) {
  const XLSX = await import('xlsx');
  const l = XLSX.utils.book_new();
  for (const [titulo, filas] of hojas) {
    const ws = XLSX.utils.aoa_to_sheet(filas);
    ws['!cols'] = (filas[0] ?? []).map((t) => ({ wch: Math.max(14, String(t).length + 4) }));
    XLSX.utils.book_append_sheet(l, ws, titulo.slice(0, 31));
  }
  descargar(new Blob([XLSX.write(l, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer], { type: XLSX_TIPO }), nombre);
}

async function liquidacionEnPdf(liquidaciones: readonly LiquidacionDelProveedor[], mes: string, nombre: string) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const m = 48;
  liquidaciones.forEach((l, k) => {
    if (k > 0) doc.addPage();
    let y = m;
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(90);
    doc.text(`LIQUIDACIÓN DE PROVEEDORES · ${mesEnPalabras(mes).toUpperCase()}`, m, y);
    y += 26;
    doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(20);
    doc.text(l.nombre, m, y);
    y += 16;
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(90);
    if (l.telefono) doc.text(`Teléfono: ${l.telefono}`, m, y);
    y += 26;
    const cols = [m, m + 170, m + 330, m + 400, ancho - m];
    doc.setFontSize(9).setTextColor(90);
    ['Inmueble', 'Trabajo', 'Cerrada', 'A cargo de'].forEach((t, i) => doc.text(t, cols[i], y));
    doc.text('A pagar', cols[4], y, { align: 'right' });
    y += 8;
    doc.setDrawColor(220).line(m, y, ancho - m, y);
    y += 16;
    doc.setFontSize(10).setTextColor(20);
    for (const t of l.trabajos) {
      if (y > alto - 90) {
        doc.addPage();
        y = m;
      }
      doc.text(doc.splitTextToSize(t.inmueble, 160)[0] ?? '', cols[0], y);
      doc.text(doc.splitTextToSize(t.titulo, 150)[0] ?? '', cols[1], y);
      doc.text(t.cerrada, cols[2], y);
      doc.text(doc.splitTextToSize(t.aCargoDe, 90)[0] ?? '', cols[3], y);
      doc.text(pesos(t.aPagar), cols[4], y, { align: 'right' });
      y += 20;
    }
    doc.setDrawColor(220).line(m, y - 6, ancho - m, y - 6);
    y += 10;
    doc.setFont('helvetica', 'bold').setFontSize(12);
    doc.text(`Total a pagar: ${pesos(l.total)}`, ancho - m, y, { align: 'right' });
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(120);
    doc.text(`${l.trabajos.length} ${l.trabajos.length === 1 ? 'trabajo cerrado' : 'trabajos cerrados'} en ${mesEnPalabras(mes)}. Generado con Leasefy.`, m, alto - m);
  });
  descargar(doc.output('blob'), nombre);
}

export function ExportarMantenimientos({ solicitudes, className }: { solicitudes: readonly SolicitudMantenimiento[]; className?: string }) {
  const [abierto, setAbierto] = useState(false);
  const [que, setQue] = useState<Que>('todo');
  const meses = useMemo(() => ultimosMeses(12), []);
  const [mes, setMes] = useState(meses[0]);
  const [proveedor, setProveedor] = useState(TODOS);
  const [bajando, setBajando] = useState<null | 'excel' | 'pdf'>(null);

  const liquidaciones = useMemo(() => liquidacionDelMes(solicitudes, mes), [solicitudes, mes]);
  const elegidas = proveedor === TODOS ? liquidaciones : liquidaciones.filter((l) => l.clave === proveedor);
  const total = elegidas.reduce((t, l) => t + l.total, 0);
  const trabajos = elegidas.reduce((t, l) => t + l.trabajos.length, 0);

  const bajar = async (formato: 'excel' | 'pdf') => {
    setBajando(formato);
    try {
      if (que === 'todo') {
        const proveedores = await proveedoresDeMantenimientoApi.listar().catch(() => []);
        await libro(
          [
            ['Solicitudes', hojaDeSolicitudes(solicitudes)],
            ['Cotizaciones', hojaDeCotizaciones(solicitudes)],
            ['Proveedores', hojaDeProveedores(proveedores)],
            ['Calificaciones', hojaDeCalificaciones(proveedores)],
            [`Tiempos ${mes}`, hojaDeTiempos(solicitudes, mes)],
          ],
          `mantenimientos-${mes}.xlsx`,
        );
      } else if (formato === 'excel') {
        await libro([['Liquidación', hojaDeLiquidacion(elegidas)]], `liquidacion-proveedores-${mes}.xlsx`);
      } else {
        await liquidacionEnPdf(elegidas, mes, `liquidacion-proveedores-${mes}.pdf`);
      }
      toast.success('Listo, se descargó el archivo');
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: 'No pudimos armar el archivo. Intenta de nuevo.', accion: 'exportar' }));
    } finally {
      setBajando(null);
    }
  };

  return (
    <>
      <Button size="sm" variant="secondary" hideArrow onClick={() => setAbierto(true)} className={className} data-testid="exportar-mantenimientos">
        <DownloadSimple className="h-4 w-4" />
        Exportar
      </Button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="sm:max-w-[520px]" data-testid="ventana-exportar">
          <DialogHeader>
            <DialogTitle>Exportar Mantenimientos</DialogTitle>
            <DialogDescription>Todo en Excel, o lo que hizo cada proveedor en el mes para liquidarle.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-1 rounded-full bg-surface-muted p-1" role="radiogroup" aria-label="Qué exportar">
            {(
              [
                ['todo', 'Todo en Excel'],
                ['liquidacion', 'Liquidar proveedores'],
              ] as const
            ).map(([v, t]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={que === v}
                onClick={() => setQue(v)}
                className={cn('h-10 rounded-full text-[14px] font-medium transition-colors', que === v ? 'bg-surface text-fg shadow-[0_1px_3px_rgba(20,19,15,0.12)]' : 'text-fg-muted hover:text-fg')}
                data-testid={`exportar-${v}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-[13px] font-medium text-fg-muted">Mes</span>
              <Select value={mes} onValueChange={(v) => { setMes(v); setProveedor(TODOS); }}>
                <SelectTrigger data-testid="exportar-mes"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {meses.map((m) => (
                    <SelectItem key={m} value={m}>{mesEnPalabras(m)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            {que === 'liquidacion' && (
              <label className="space-y-1.5">
                <span className="text-[13px] font-medium text-fg-muted">Proveedor</span>
                <Select value={proveedor} onValueChange={setProveedor}>
                  <SelectTrigger data-testid="exportar-proveedor"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TODOS}>Todos ({liquidaciones.length})</SelectItem>
                    {liquidaciones.map((l) => (
                      <SelectItem key={l.clave} value={l.clave}>{l.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            )}
          </div>

          {que === 'todo' ? (
            <p className="text-body-sm text-fg-muted">
              Un archivo con cinco hojas: solicitudes ({solicitudes.length.toLocaleString('es-CO')}), cotizaciones, proveedores, calificaciones y los tiempos de {mesEnPalabras(mes)}.
            </p>
          ) : elegidas.length === 0 ? (
            <p className="rounded-xl bg-surface-muted px-4 py-3 text-body-sm text-fg-muted" data-testid="exportar-sin-trabajos">
              En {mesEnPalabras(mes)} no se cerró ningún arreglo con proveedor: no hay nada que liquidar.
            </p>
          ) : (
            <div className="rounded-xl border border-border px-4 py-3" data-testid="exportar-resumen">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">A pagar en {mesEnPalabras(mes)}</p>
              <p className="mt-1 font-mono text-[22px] font-medium tabular-nums text-fg">{pesos(total)}</p>
              <p className="text-body-sm text-fg-muted">
                {trabajos} {trabajos === 1 ? 'trabajo cerrado' : 'trabajos cerrados'} · {elegidas.length} {elegidas.length === 1 ? 'proveedor' : 'proveedores'}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            {que === 'liquidacion' && (
              <Button variant="secondary" hideArrow disabled={elegidas.length === 0 || bajando !== null} isLoading={bajando === 'pdf'} onClick={() => void bajar('pdf')} data-testid="exportar-pdf">
                <FilePdf className="h-4 w-4" />
                PDF
              </Button>
            )}
            <Button hideArrow disabled={(que === 'liquidacion' && elegidas.length === 0) || bajando !== null} isLoading={bajando === 'excel'} onClick={() => void bajar('excel')} data-testid="exportar-excel">
              <FileXls className="h-4 w-4" />
              Excel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
