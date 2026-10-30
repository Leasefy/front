'use client';

/**
 * Nico, 29-10-2026 (reunión con Portofino): al crear el contrato se pueden
 * agregar codeudores (opcional: sólo quedan como dato del contrato, no se
 * les manda nada) y documentos que no son el contrato (cédulas, certificados,
 * póliza…), que quedan en «Documentos» del contrato.
 *
 * Revisión en pantalla con datos de Portofino (29-10, tarde): cada campo con
 * su rótulo arriba (no sólo el texto de ejemplo, que se va al escribir), el
 * error de cada campo bajo el campo al dejarlo, sin tarjeta dentro de la
 * tarjeta (los codeudores y los archivos se separan con líneas finas) y los
 * archivos se revisan al elegirlos con los mismos topes del back (PDF, JPG,
 * PNG o WebP de hasta 10 MB): antes uno que no cabía se aceptaba y fallaba
 * después de crear el contrato.
 */
import { useRef, useState } from 'react';
import { Plus, TrashSimple, UploadSimple } from '@phosphor-icons/react';
import { Presence } from '@leasefy/cadence';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { CampoDelTermino as Campo } from '@/components/contract/CampoDelTermino';
import type { CodeudorDto, TipoDeDocumentoDelCodeudor } from '@/lib/api/pagare.types';
import {
  MAX_BYTES_DEL_DOCUMENTO,
  NOMBRE_DEL_TIPO_DE_DOCUMENTO,
  TIPOS_DE_ARCHIVO_DEL_DOCUMENTO,
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

/** Los topes del DTO del back (`CodeudorDto`): nombre ≤ 200, documento 3–20 letras o números. */
const LARGO_MAXIMO_DEL_NOMBRE = 200;
const DOCUMENTO_VALIDO = /^[A-Za-z0-9-]{3,20}$/;
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type CampoDelCodeudor = 'nombre' | 'documento' | 'email' | 'celular';

/** Lo que está mal de cada campo, en palabras y con cómo arreglarlo. Vacío = completo. */
export function erroresDelCodeudor(c: CodeudorDto): Partial<Record<CampoDelCodeudor, string>> {
  const errores: Partial<Record<CampoDelCodeudor, string>> = {};
  if (c.nombre.trim().length < 2) errores.nombre = 'Escribe el nombre completo del codeudor.';
  if (!DOCUMENTO_VALIDO.test(c.documento.trim())) {
    errores.documento = 'Entre 3 y 20 letras o números, sin puntos ni espacios. Ej.: 71999001.';
  }
  if (!CORREO_VALIDO.test(c.email.trim())) errores.email = 'Revisa el correo. Ej.: nombre@correo.com.';
  if (c.celular.replace(/\D/g, '').length < 10) errores.celular = 'Escribe los 10 números del celular. Ej.: 300 123 4567.';
  return errores;
}

/** Un codeudor empezado a medias no deja crear: o se completa o se quita. */
export function codeudorCompleto(c: CodeudorDto): boolean {
  return Object.keys(erroresDelCodeudor(c)).length === 0;
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
  // Los campos que la persona ya dejó: su error sale al salir del campo, no mientras escribe.
  const [dejados, setDejados] = useState<ReadonlySet<string>>(new Set());
  const dejar = (i: number, campo: CampoDelCodeudor) =>
    setDejados((antes) => (antes.has(`${i}-${campo}`) ? antes : new Set(antes).add(`${i}-${campo}`)));
  const cambiar = (i: number, parte: Partial<CodeudorDto>) =>
    onCambio(codeudores.map((c, j) => (j === i ? { ...c, ...parte } : c)));
  const quitar = (i: number) => {
    onCambio(codeudores.filter((_, j) => j !== i));
    setDejados(new Set());
  };

  return (
    <section className="rounded-lg border border-border bg-card p-5" data-testid="nuevo-contrato-codeudores">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="text-h3 text-fg">Codeudores</h2>
          <p className="text-sm text-fg-muted">Opcional. Quedan como dato del contrato; no se les envía nada.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          hideArrow
          onClick={() => onCambio([...codeudores, { ...CODEUDOR_VACIO }])}
          data-testid="agregar-codeudor"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Agregar codeudor
        </Button>
      </div>
      {codeudores.map((c, i) => {
        const vacio = codeudorVacio(c);
        const errores = vacio ? {} : erroresDelCodeudor(c);
        const aMedias = !vacio && Object.keys(errores).length > 0;
        const id = (campo: CampoDelCodeudor | 'tipo') => `codeudor-${i}-${campo}`;
        const error = (campo: CampoDelCodeudor) => (dejados.has(`${i}-${campo}`) ? errores[campo] : undefined);
        const aria = (campo: CampoDelCodeudor) => ({
          id: id(campo),
          'aria-invalid': error(campo) ? true : undefined,
          'aria-describedby': `${id(campo)}-error`,
          onBlur: () => dejar(i, campo),
        });
        return (
          <div key={i} className="mt-4 space-y-3 border-t border-border-faint pt-4" data-testid="codeudor-al-crear">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-label uppercase text-fg-muted">Codeudor {i + 1}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                hideArrow
                aria-label={`Quitar el codeudor ${i + 1}`}
                onClick={() => quitar(i)}
              >
                <TrashSimple className="h-4 w-4" aria-hidden="true" />
                Quitar
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Campo id={id('nombre')} label="Nombre completo" error={error('nombre')}>
                <Input
                  {...aria('nombre')}
                  value={c.nombre}
                  maxLength={LARGO_MAXIMO_DEL_NOMBRE}
                  autoComplete="off"
                  onChange={(e) => cambiar(i, { nombre: e.target.value })}
                />
              </Campo>
              <Campo id={id('tipo')} label="Tipo de documento">
                <Select value={c.tipoDeDocumento} onValueChange={(v) => cambiar(i, { tipoDeDocumento: v as TipoDeDocumentoDelCodeudor })}>
                  <SelectTrigger id={id('tipo')} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_DEL_CODEUDOR.map((t) => (
                      <SelectItem key={t} value={t}>{NOMBRE_DEL_TIPO_DEL_CODEUDOR[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Campo>
              <Campo id={id('documento')} label="Número de documento" error={error('documento')}>
                <Input
                  {...aria('documento')}
                  inputMode="numeric"
                  autoComplete="off"
                  value={c.documento}
                  onChange={(e) => cambiar(i, { documento: e.target.value })}
                />
              </Campo>
              <Campo id={id('email')} label="Correo" error={error('email')}>
                <Input {...aria('email')} type="email" autoComplete="off" value={c.email} onChange={(e) => cambiar(i, { email: e.target.value })} />
              </Campo>
              <Campo id={id('celular')} label="Celular" error={error('celular')}>
                <Input {...aria('celular')} type="tel" inputMode="tel" autoComplete="off" value={c.celular} onChange={(e) => cambiar(i, { celular: e.target.value })} />
              </Campo>
            </div>
            <Presence show={aMedias} initial={false} distance="xs">
              <p className="text-caption text-fg-muted">Complétalo o quítalo: un codeudor a medias no deja crear el contrato.</p>
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
const TIPOS_QUE_ACEPTA = TIPOS_DE_ARCHIVO_DEL_DOCUMENTO.split(',');

/** «1,2 MB», «340 KB». */
function peso(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toLocaleString('es-CO', { maximumFractionDigits: 1 })} MB`;
  return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString('es-CO')} KB`;
}

/** Los que no caben (tipo o tamaño), con su nombre: se dicen y no se agregan. */
export function archivosQueNoCaben(archivos: readonly File[]): string | null {
  const malos = archivos.filter((a) => !TIPOS_QUE_ACEPTA.includes(a.type) || a.size > MAX_BYTES_DEL_DOCUMENTO);
  if (malos.length === 0) return null;
  const nombres = malos.map((a) => `«${a.name}»`).join(', ');
  return `${malos.length === 1 ? 'No se agregó' : 'No se agregaron'} ${nombres}: sólo PDF, JPG, PNG o WebP de hasta 10 MB.`;
}

export function DocumentosAlCrear({
  documentos,
  onCambio,
}: {
  documentos: DocumentoAlCrear[];
  onCambio: (siguiente: DocumentoAlCrear[]) => void;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [rechazados, setRechazados] = useState<string | null>(null);

  return (
    <section className="rounded-lg border border-border bg-card p-5" data-testid="nuevo-contrato-documentos">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="text-h3 text-fg">Documentos adicionales</h2>
          <p className="text-sm text-fg-muted">
            Opcional. Cédulas, certificados, póliza o lo que haga falta: quedan en los documentos del contrato.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          hideArrow
          onClick={() => entrada.current?.click()}
          aria-describedby="documentos-adicionales-error"
          data-testid="agregar-documentos"
        >
          <UploadSimple className="h-4 w-4" aria-hidden="true" />
          Agregar documentos
        </Button>
        <input
          ref={entrada}
          type="file"
          multiple
          accept={TIPOS_DE_ARCHIVO_DEL_DOCUMENTO}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          data-testid="documentos-adicionales-input"
          onChange={(e) => {
            const elegidos = Array.from(e.target.files ?? []);
            e.target.value = '';
            setRechazados(archivosQueNoCaben(elegidos));
            const caben = elegidos.filter((a) => TIPOS_QUE_ACEPTA.includes(a.type) && a.size <= MAX_BYTES_DEL_DOCUMENTO);
            if (caben.length > 0) onCambio([...documentos, ...caben.map((archivo) => ({ archivo, tipo: 'OTRO' as TipoDeDocumentoDelContrato }))]);
          }}
        />
      </div>
      <ErrorDelCampo
        id="documentos-adicionales-error"
        mensaje={rechazados ?? undefined}
        pista={documentos.length === 0 ? 'PDF, JPG, PNG o WebP, hasta 10 MB cada uno.' : undefined}
        className="mt-2"
      />
      {documentos.length > 0 && (
        <ul className="mt-3 divide-y divide-border-faint border-t border-border-faint" data-testid="documentos-adicionales">
          {documentos.map((d, i) => (
            <li key={`${d.archivo.name}-${i}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-3 sm:grid-cols-[minmax(0,1fr)_14rem_auto]">
              <div className="min-w-0">
                <p className="truncate text-sm text-fg" title={d.archivo.name}>{d.archivo.name}</p>
                <p className="font-mono text-caption text-fg-muted">{peso(d.archivo.size)}</p>
              </div>
              <Select
                value={d.tipo}
                onValueChange={(v) => onCambio(documentos.map((x, j) => (j === i ? { ...x, tipo: v as TipoDeDocumentoDelContrato } : x)))}
              >
                <SelectTrigger aria-label={`Qué es ${d.archivo.name}`} className="order-last col-span-2 w-full sm:order-none sm:col-span-1">
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
                size="sm"
                hideArrow
                aria-label={`Quitar ${d.archivo.name}`}
                onClick={() => onCambio(documentos.filter((_, j) => j !== i))}
              >
                <TrashSimple className="h-4 w-4" aria-hidden="true" />
                Quitar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
