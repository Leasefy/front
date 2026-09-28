'use client';

/**
 * T-0109 contract.md §3.1.E1–E4 — codeudores del contrato. Vive en la ficha
 * del contrato, panel de agencia. Se oculta sola contra un back sin WU-4
 * (404 en E1) — contract.md §3.2, última fila.
 */

import { useCallback, useEffect, useState } from 'react';
import { PencilSimple, Plus, TrashSimple, UserPlus, Users } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
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
import { codeudoresApi } from '@/lib/api/pagare.service';
import type { CodeudorDto, CodeudorResponse, TipoDeDocumentoDelCodeudor } from '@/lib/api/pagare.types';
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion';
import { esPagareNoDisponible } from '@/lib/contratos/pagare';

export interface CodeudoresSectionProps {
  contractId: string;
  /** `contratos:edit` — sin esto la lista es de sólo lectura. */
  puedeEditar: boolean;
}

const DOCUMENTOS: TipoDeDocumentoDelCodeudor[] = ['CC', 'CE', 'PASSPORT', 'PPT'];

const DOCUMENTO_VACIO: CodeudorDto = { nombre: '', tipoDeDocumento: 'CC', documento: '', email: '', celular: '' };

export function CodeudoresSection({ contractId, puedeEditar }: CodeudoresSectionProps) {
  const [cargando, setCargando] = useState(true);
  const [noDisponible, setNoDisponible] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [codeudores, setCodeudores] = useState<CodeudorResponse[]>([]);
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [editando, setEditando] = useState<CodeudorResponse | null>(null);
  const [porBorrar, setPorBorrar] = useState<CodeudorResponse | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setCodeudores(await codeudoresApi.list(contractId));
      setNoDisponible(false);
    } catch (e) {
      if (esPagareNoDisponible(e)) setNoDisponible(true);
      else setError(e);
    } finally {
      setCargando(false);
    }
  }, [contractId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (noDisponible) return null;

  const cerrarFormulario = () => {
    setFormularioAbierto(false);
    setEditando(null);
  };

  const confirmarBorrado = async () => {
    if (!porBorrar) return;
    try {
      await codeudoresApi.remove(contractId, porBorrar.id);
      toast.success(`${porBorrar.nombre} eliminado.`);
      setPorBorrar(null);
      void cargar();
    } catch (err) {
      toast.error('No se pudo eliminar.', { description: mensajeDelFallo(err, '') });
    }
  };

  return (
    <div className="rounded-lg border border-border dark:border-border-strong bg-surface dark:bg-bg overflow-hidden" data-testid="codeudores-section">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border-faint dark:border-border-strong">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-surface-muted dark:bg-ink flex items-center justify-center text-fg-muted dark:text-fg-subtle">
            <Users className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-fg">Codeudores</h3>
        </div>
        {puedeEditar && !formularioAbierto && (
          <Button variant="outline" size="sm" hideArrow onClick={() => setFormularioAbierto(true)} className="gap-1.5" data-testid="agregar-codeudor">
            <UserPlus className="w-3.5 h-3.5" />
            Agregar
          </Button>
        )}
      </div>
      <div className="p-5 space-y-4">
        {cargando ? (
          <div className="flex items-center justify-center py-6">
            <Spinner size="sm" variant="muted" />
          </div>
        ) : error ? (
          <FalloDeCarga error={error} queEs="los codeudores" onReintentar={cargar} enmarcado={false} />
        ) : (
          <>
            {codeudores.length === 0 && !formularioAbierto ? (
              <p className="text-sm text-fg-muted">Este contrato no tiene codeudores.</p>
            ) : (
              <ul className="space-y-2" data-testid="codeudores-lista">
                {codeudores.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted dark:bg-ink px-3 py-2" data-testid="codeudor-item">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-fg truncate">{c.nombre}</p>
                      <p className="text-xs text-fg-muted">
                        {c.tipoDeDocumento} {c.documento} · {c.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {c.enPagare && <Badge variant="secondary">En pagaré</Badge>}
                      {puedeEditar && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            hideArrow
                            onClick={() => { setEditando(c); setFormularioAbierto(true); }}
                            className="h-8 w-8 p-0"
                            aria-label={`Editar a ${c.nombre}`}
                            data-testid="editar-codeudor"
                          >
                            <PencilSimple className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            hideArrow
                            onClick={() => setPorBorrar(c)}
                            className="h-8 w-8 p-0 text-danger hover:text-danger"
                            aria-label={`Eliminar a ${c.nombre}`}
                            data-testid="eliminar-codeudor"
                          >
                            <TrashSimple className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {formularioAbierto && (
              <FormularioDeCodeudor
                contractId={contractId}
                inicial={editando}
                onGuardado={() => { cerrarFormulario(); void cargar(); }}
                onCancelar={cerrarFormulario}
              />
            )}
          </>
        )}
      </div>

      <AlertDialog open={!!porBorrar} onOpenChange={(open) => !open && setPorBorrar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar a {porBorrar?.nombre}?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmarBorrado()} data-testid="confirmar-eliminar-codeudor">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FormularioDeCodeudor({
  contractId,
  inicial,
  onGuardado,
  onCancelar,
}: {
  contractId: string;
  inicial: CodeudorResponse | null;
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const [datos, setDatos] = useState<CodeudorDto>(
    inicial
      ? { nombre: inicial.nombre, tipoDeDocumento: inicial.tipoDeDocumento, documento: inicial.documento, email: inicial.email, celular: inicial.celular }
      : DOCUMENTO_VACIO,
  );
  const [guardando, setGuardando] = useState(false);

  const campo = (k: keyof CodeudorDto) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDatos((d) => ({ ...d, [k]: e.target.value }));

  const guardar = async () => {
    if (guardando) return;
    setGuardando(true);
    try {
      if (inicial) {
        await codeudoresApi.update(contractId, inicial.id, datos);
        toast.success('Codeudor actualizado.');
      } else {
        await codeudoresApi.create(contractId, datos);
        toast.success('Codeudor agregado.');
      }
      onGuardado();
    } catch (err) {
      toast.error('No se pudo guardar.', { description: mensajeDelFallo(err, '') });
    } finally {
      setGuardando(false);
    }
  };

  const valido = datos.nombre.trim() && datos.documento.trim() && datos.email.trim() && datos.celular.trim();

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface p-4" data-testid="formulario-codeudor">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input placeholder="Nombre completo" value={datos.nombre} onChange={campo('nombre')} data-testid="codeudor-nombre" />
        <select
          value={datos.tipoDeDocumento}
          onChange={(e) => setDatos((d) => ({ ...d, tipoDeDocumento: e.target.value as TipoDeDocumentoDelCodeudor }))}
          className="h-11 rounded-md border border-border bg-surface px-3 text-sm"
          data-testid="codeudor-tipo-documento"
        >
          {DOCUMENTOS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <Input placeholder="Número de documento" value={datos.documento} onChange={campo('documento')} data-testid="codeudor-documento" />
        <Input placeholder="Correo" type="email" value={datos.email} onChange={campo('email')} data-testid="codeudor-email" />
        <Input placeholder="Celular" value={datos.celular} onChange={campo('celular')} data-testid="codeudor-celular" />
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={() => void guardar()} disabled={!valido || guardando} isLoading={guardando} hideArrow className="gap-1.5" data-testid="guardar-codeudor">
          <Plus className="w-3.5 h-3.5" />
          {inicial ? 'Guardar cambios' : 'Agregar codeudor'}
        </Button>
        <Button variant="ghost" hideArrow onClick={onCancelar} disabled={guardando}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
