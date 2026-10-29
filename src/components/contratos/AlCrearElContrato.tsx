'use client';

/**
 * Nico, 29-10-2026 (reunión con Portofino): al crear el contrato se pueden
 * agregar codeudores (opcional: sólo quedan como dato del contrato, no se
 * les manda nada) y documentos que no son el contrato (cédulas, certificados,
 * póliza…), que quedan en «Documentos» del contrato.
 */
import { Plus, TrashSimple, UploadSimple } from '@phosphor-icons/react';
import { Presence } from '@leasefy/cadence';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CodeudorDto, TipoDeDocumentoDelCodeudor } from '@/lib/api/pagare.types';
import {
  NOMBRE_DEL_TIPO_DE_DOCUMENTO,
  TIPOS_DE_DOCUMENTO_DEL_CONTRATO,
  type TipoDeDocumentoDelContrato,
} from '@/lib/api/documentos-del-contrato.service';

const TIPOS_DEL_CODEUDOR: readonly TipoDeDocumentoDelCodeudor[] = ['CC', 'CE', 'PASSPORT', 'PPT'];
const NOMBRE_DEL_TIPO_DEL_CODEUDOR: Record<TipoDeDocumentoDelCodeudor, string> = {
  CC: 'Cédula',
  CE: 'Cédula de extranjería',
  PASSPORT: 'Pasaporte',
  PPT: 'Permiso de protección temporal',
};

export const CODEUDOR_VACIO: CodeudorDto = { nombre: '', tipoDeDocumento: 'CC', documento: '', email: '', celular: '' };

/** Un codeudor empezado a medias no deja crear: o se completa o se quita. */
export function codeudorCompleto(c: CodeudorDto): boolean {
  return (
    c.nombre.trim().length > 1 &&
    /^[A-Za-z0-9-]{3,20}$/.test(c.documento.trim()) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim()) &&
    c.celular.replace(/\D/g, '').length >= 10
  );
}

export function codeudorVacio(c: CodeudorDto): boolean {
  return !c.nombre.trim() && !c.documento.trim() && !c.email.trim() && !c.celular.trim();
}

export function CodeudoresAlCrear({
  codeudores,
  onCambio,
}: {
  codeudores: CodeudorDto[];
  onCambio: (siguiente: CodeudorDto[]) => void;
}) {
  const cambiar = (i: number, parte: Partial<CodeudorDto>) =>
    onCambio(codeudores.map((c, j) => (j === i ? { ...c, ...parte } : c)));
  return (
    <section className="rounded-lg border border-border bg-card p-5 space-y-4" data-testid="nuevo-contrato-codeudores">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-h3 text-fg">Codeudores</h2>
          <p className="text-sm text-muted-foreground">Opcional. Quedan como dato del contrato; no se les envía nada.</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          hideArrow
          onClick={() => onCambio([...codeudores, { ...CODEUDOR_VACIO }])}
          data-testid="agregar-codeudor"
        >
          <Plus className="w-4 h-4" />
          Agregar codeudor
        </Button>
      </div>
      {codeudores.map((c, i) => {
        const aMedias = !codeudorVacio(c) && !codeudorCompleto(c);
        return (
          <div key={i} className="rounded-md border border-border p-4 space-y-3" data-testid="codeudor-al-crear">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-fg">Codeudor {i + 1}</p>
              <Button
                type="button"
                variant="ghost"
                hideArrow
                aria-label={`Quitar el codeudor ${i + 1}`}
                onClick={() => onCambio(codeudores.filter((_, j) => j !== i))}
              >
                <TrashSimple className="w-4 h-4" />
                Quitar
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input aria-label="Nombre completo" placeholder="Nombre completo" value={c.nombre} onChange={(e) => cambiar(i, { nombre: e.target.value })} />
              <Select value={c.tipoDeDocumento} onValueChange={(v) => cambiar(i, { tipoDeDocumento: v as TipoDeDocumentoDelCodeudor })}>
                <SelectTrigger aria-label="Tipo de documento" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_DEL_CODEUDOR.map((t) => (
                    <SelectItem key={t} value={t}>{NOMBRE_DEL_TIPO_DEL_CODEUDOR[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input aria-label="Número de documento" placeholder="Número de documento" inputMode="numeric" value={c.documento} onChange={(e) => cambiar(i, { documento: e.target.value })} />
              <Input aria-label="Correo" type="email" placeholder="Correo" value={c.email} onChange={(e) => cambiar(i, { email: e.target.value })} />
              <Input aria-label="Celular" type="tel" placeholder="Celular" value={c.celular} onChange={(e) => cambiar(i, { celular: e.target.value })} />
            </div>
            <Presence show={aMedias} initial={false} distance="xs">
              <p className="text-sm text-muted-foreground">Complétalo (nombre, documento, correo y celular) o quítalo para crear el contrato.</p>
            </Presence>
          </div>
        );
      })}
    </section>
  );
}

export interface DocumentoAlCrear {
  archivo: File;
  tipo: TipoDeDocumentoDelContrato;
}

/** El contrato firmado va arriba, en su propio campo: aquí, todo lo demás. */
const TIPOS_ADICIONALES = TIPOS_DE_DOCUMENTO_DEL_CONTRATO.filter((t) => t !== 'CONTRATO_FIRMADO');

export function DocumentosAlCrear({
  documentos,
  onCambio,
}: {
  documentos: DocumentoAlCrear[];
  onCambio: (siguiente: DocumentoAlCrear[]) => void;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 space-y-4" data-testid="nuevo-contrato-documentos">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-h3 text-fg">Documentos adicionales</h2>
          <p className="text-sm text-muted-foreground">
            Opcional. Cédulas, certificados, póliza o lo que haga falta: quedan en los documentos del contrato. PDF o imagen, hasta 10 MB cada uno.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-fg hover:bg-muted focus-within:ring-2 focus-within:ring-ring">
          <UploadSimple className="w-4 h-4" />
          Agregar documentos
          <input
            type="file"
            multiple
            accept="application/pdf,image/*"
            className="sr-only"
            data-testid="documentos-adicionales-input"
            onChange={(e) => {
              const nuevos = Array.from(e.target.files ?? []).map((archivo) => ({ archivo, tipo: 'OTRO' as TipoDeDocumentoDelContrato }));
              onCambio([...documentos, ...nuevos]);
              e.target.value = '';
            }}
          />
        </label>
      </div>
      {documentos.length > 0 && (
        <ul className="divide-y divide-border rounded-md border border-border">
          {documentos.map((d, i) => (
            <li key={`${d.archivo.name}-${i}`} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
              <p className="min-w-0 flex-1 truncate text-sm text-fg" title={d.archivo.name}>{d.archivo.name}</p>
              <Select
                value={d.tipo}
                onValueChange={(v) => onCambio(documentos.map((x, j) => (j === i ? { ...x, tipo: v as TipoDeDocumentoDelContrato } : x)))}
              >
                <SelectTrigger aria-label={`Qué es ${d.archivo.name}`} className="w-full sm:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_ADICIONALES.map((t) => (
                    <SelectItem key={t} value={t}>{NOMBRE_DEL_TIPO_DE_DOCUMENTO[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                hideArrow
                aria-label={`Quitar ${d.archivo.name}`}
                onClick={() => onCambio(documentos.filter((_, j) => j !== i))}
              >
                <TrashSimple className="w-4 h-4" />
                Quitar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
