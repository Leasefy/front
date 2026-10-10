'use client';

/**
 * Los documentos que la inmobiliaria SUBE a un contrato (Nico, 10-10-2026: «el
 * usuario debería de poder agregar documentos al contrato»).
 *
 * Vive dentro de la tarjeta «Documento» de la ficha. En un contrato migrado
 * —que no tiene documento generado en Leasefy— el vacío invita a subir el
 * contrato firmado en papel; en cualquier contrato se suman otrosíes,
 * inventario, pagaré, póliza…
 *
 * Decisiones de Nico (10-10): los ve SÓLO la inmobiliaria; se suben en TODOS
 * los contratos; quitar uno lo ARCHIVA (queda con quién y cuándo), no lo borra.
 */

import { useCallback, useEffect, useId, useState } from 'react';
import { ArrowSquareOut, FileImage, FilePdf, Paperclip, Trash, UploadSimple } from '@phosphor-icons/react';
import { Presence, Stagger, StaggerItem } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { confirmar } from '@/components/ui/confirmar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SelectorDeArchivo } from '@/components/ui/selector-de-archivo';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { pesoLegible } from '@/components/migracion/TarjetaDeArchivo';
import {
  MAX_BYTES_DEL_DOCUMENTO,
  MAX_LARGO_DE_LA_NOTA_DEL_DOCUMENTO,
  NOMBRE_DEL_TIPO_DE_DOCUMENTO,
  TIPOS_DE_ARCHIVO_DEL_DOCUMENTO,
  TIPOS_DE_DOCUMENTO_DEL_CONTRATO,
  documentosDelContratoApi,
  type DocumentoDelContrato,
  type DocumentosDelContrato as ListaDeDocumentos,
  type TipoDeDocumentoDelContrato,
} from '@/lib/api/documentos-del-contrato.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';

/** «10 de octubre de 2026», en la hora de Colombia (un instante, no un día). */
function diaDeSubida(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'long', year: 'numeric' });
}

const TIPOS_DE_ARCHIVO_ACEPTADOS = TIPOS_DE_ARCHIVO_DEL_DOCUMENTO.split(',');

/** El error del archivo ANTES de mandarlo: los mismos topes que `ArchivosDelMandato.validar` del back. */
export function errorDelArchivo(archivo: File | null): string | undefined {
  if (!archivo) return 'Elige el archivo: un PDF o una foto.';
  if (!TIPOS_DE_ARCHIVO_ACEPTADOS.includes(archivo.type)) {
    return 'El documento tiene que ser un PDF o una imagen (JPG, PNG o WEBP).';
  }
  if (archivo.size > MAX_BYTES_DEL_DOCUMENTO) return 'El documento no puede pesar más de 10 MB.';
  return undefined;
}

export function DocumentosDelContrato({
  contractId,
  puedeEditar,
  migrado,
}: {
  contractId: string;
  puedeEditar: boolean;
  /** Sin documento generado en Leasefy: el vacío invita a subir el contrato firmado. */
  migrado: boolean;
}) {
  const [datos, setDatos] = useState<ListaDeDocumentos | null>(null);
  const [fallo, setFallo] = useState<unknown>(null);
  const [subiendo, setSubiendo] = useState<TipoDeDocumentoDelContrato | null>(null);
  const [abriendo, setAbriendo] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setFallo(null);
      setDatos(await documentosDelContratoApi.listar(contractId));
    } catch (e) {
      setFallo(e);
    }
  }, [contractId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const abrir = async (doc: DocumentoDelContrato) => {
    // La pestaña se abre YA (dentro del clic) para que el navegador no la bloquee;
    // la URL firmada llega después.
    const pestana = window.open('', '_blank');
    setAbriendo(doc.id);
    try {
      const { url } = await documentosDelContratoApi.url(contractId, doc.id);
      if (pestana) pestana.location.href = url;
      else window.open(url, '_blank', 'noopener');
    } catch (e) {
      pestana?.close();
      toast.error(mensajeParaLaPersona(e, { accion: 'abrir el documento' }));
    } finally {
      setAbriendo(null);
    }
  };

  const quitar = (doc: DocumentoDelContrato) =>
    confirmar({
      titulo: `¿Quitar «${doc.tipoNombre}»?`,
      descripcion:
        'Deja de verse en el contrato, pero no se borra: queda archivado con tu nombre y la fecha de hoy.',
      tipo: 'advertencia',
      accion: 'Quitar del contrato',
      alConfirmar: async () => {
        try {
          await documentosDelContratoApi.archivar(contractId, doc.id);
          toast.success('Documento quitado del contrato');
          await cargar();
        } catch (e) {
          toast.error(mensajeParaLaPersona(e, { accion: 'quitar el documento' }));
          throw e;
        }
      },
    });

  if (fallo) {
    return (
      <FalloDeCarga
        error={fallo}
        queEs="los documentos del contrato"
        onReintentar={cargar}
        enmarcado={false}
      />
    );
  }
  if (!datos) return null;

  const documentos = datos.documentos;
  const sePuedeSubir = puedeEditar && datos.disponible;

  return (
    <div className="space-y-3" data-testid="documentos-del-contrato">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h4 className="text-sm font-semibold text-foreground">Documentos subidos</h4>
          {documentos.length > 0 && (
            <span className="font-mono text-caption text-muted-foreground">{documentos.length}</span>
          )}
        </div>
        {sePuedeSubir && documentos.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => setSubiendo('OTRO')} data-testid="subir-documento">
            <UploadSimple className="h-4 w-4" aria-hidden />
            Subir documento
          </Button>
        )}
      </div>

      {!datos.disponible ? (
        <p className="text-sm text-muted-foreground" data-testid="documentos-sin-migracion">
          Todavía no se pueden guardar documentos del contrato en tu cuenta. Estamos terminando de prepararlo.
        </p>
      ) : documentos.length === 0 ? (
        <div
          className="flex flex-col items-start gap-3 rounded-md border border-dashed border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
          data-testid="documentos-vacio"
        >
          <p className="text-sm text-muted-foreground">
            {migrado
              ? 'Sube el contrato firmado en papel y sus anexos (otrosíes, inventario, pagaré…) para tenerlos acá.'
              : 'Otrosíes, inventario, pagaré, póliza… súbelos y quedan guardados con el contrato.'}
          </p>
          {sePuedeSubir && (
            <Button
              size="sm"
              hideArrow
              onClick={() => setSubiendo(migrado ? 'CONTRATO_FIRMADO' : 'OTRO')}
              data-testid="subir-documento"
            >
              <UploadSimple className="h-4 w-4" aria-hidden />
              {migrado ? 'Subir el contrato firmado' : 'Subir documento'}
            </Button>
          )}
        </div>
      ) : (
        <Stagger as="ul" className="divide-y divide-border rounded-md border border-border">
          {documentos.map((doc) => {
            const Icono = doc.archivoTipo === 'application/pdf' ? FilePdf : FileImage;
            return (
              <StaggerItem
                key={doc.id}
                as="li"
                className="flex flex-wrap items-center gap-3 px-4 py-3"
                data-testid={`documento-${doc.id}`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface text-muted-foreground">
                  <Icono className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{doc.tipoNombre}</p>
                  <p className="truncate text-caption text-muted-foreground" title={doc.archivoNombre}>
                    {doc.archivoNombre} · <span className="font-mono">{pesoLegible(doc.archivoBytes)}</span>
                  </p>
                  {doc.nota && <p className="mt-1 text-caption text-foreground/80">{doc.nota}</p>}
                  <p className="mt-0.5 text-caption text-muted-foreground">
                    Lo subió {doc.subidoPorNombre} el {diaDeSubida(doc.subidoEl)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void abrir(doc)}
                    isLoading={abriendo === doc.id}
                    aria-label={`Abrir ${doc.tipoNombre}`}
                  >
                    <ArrowSquareOut className="h-4 w-4" aria-hidden />
                    Abrir
                  </Button>
                  {puedeEditar && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void quitar(doc)}
                      aria-label={`Quitar ${doc.tipoNombre}`}
                      data-testid={`quitar-${doc.id}`}
                    >
                      <Trash className="h-4 w-4" aria-hidden />
                    </Button>
                  )}
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}

      {datos.archivados > 0 && (
        <p className="text-caption text-muted-foreground">
          {datos.archivados === 1
            ? '1 documento quitado queda archivado.'
            : `${datos.archivados} documentos quitados quedan archivados.`}
        </p>
      )}

      <SubirDocumentoDialog
        contractId={contractId}
        tipoInicial={subiendo}
        onCerrar={() => setSubiendo(null)}
        onSubido={() => {
          setSubiendo(null);
          void cargar();
        }}
      />
    </div>
  );
}

function SubirDocumentoDialog({
  contractId,
  tipoInicial,
  onCerrar,
  onSubido,
}: {
  contractId: string;
  /** `null` = cerrado. */
  tipoInicial: TipoDeDocumentoDelContrato | null;
  onCerrar: () => void;
  onSubido: () => void;
}) {
  const id = useId();
  const [tipo, setTipo] = useState<TipoDeDocumentoDelContrato>('OTRO');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState<{ archivo?: string; general?: string }>({});

  useEffect(() => {
    if (tipoInicial) {
      setTipo(tipoInicial);
      setArchivo(null);
      setNota('');
      setErrores({});
    }
  }, [tipoInicial]);

  const subir = async () => {
    const delArchivo = errorDelArchivo(archivo);
    if (delArchivo || !archivo) {
      setErrores({ archivo: delArchivo });
      return;
    }
    setEnviando(true);
    setErrores({});
    try {
      await documentosDelContratoApi.subir(contractId, { tipo, nota, archivo });
      toast.success(`${NOMBRE_DEL_TIPO_DE_DOCUMENTO[tipo]} quedó guardado en el contrato`);
      onSubido();
    } catch (e) {
      setErrores({ general: mensajeParaLaPersona(e, { accion: 'subir el documento' }) });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={tipoInicial !== null} onOpenChange={(abierto) => !abierto && !enviando && onCerrar()}>
      <DialogContent size="md" data-testid="subir-documento-dialogo">
        <DialogHeader>
          <DialogTitle>Subir un documento al contrato</DialogTitle>
          <DialogDescription>
            Un PDF o una foto de hasta 10 MB. Sólo lo ve tu inmobiliaria.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-tipo`}>Qué documento es</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoDeDocumentoDelContrato)}>
              <SelectTrigger id={`${id}-tipo`} data-testid="tipo-de-documento">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_DE_DOCUMENTO_DEL_CONTRATO.map((t) => (
                  <SelectItem key={t} value={t}>
                    {NOMBRE_DEL_TIPO_DE_DOCUMENTO[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-archivo`} required>
              Archivo
            </Label>
            <SelectorDeArchivo
              id={`${id}-archivo`}
              accept={TIPOS_DE_ARCHIVO_DEL_DOCUMENTO}
              archivo={archivo}
              onElegir={(a) => {
                setArchivo(a);
                setErrores((prev) => ({ ...prev, archivo: undefined }));
              }}
              testid="archivo-del-documento"
              invalido={Boolean(errores.archivo)}
              describedBy={`${id}-archivo-error`}
              requerido
            />
            <ErrorDelCampo id={`${id}-archivo-error`} mensaje={errores.archivo} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-nota`}>Nota (opcional)</Label>
            <Textarea
              id={`${id}-nota`}
              value={nota}
              maxLength={MAX_LARGO_DE_LA_NOTA_DEL_DOCUMENTO}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej.: otrosí del incremento de 2025"
              rows={2}
            />
          </div>
          <Presence show={Boolean(errores.general)}>
            <p className="text-sm text-danger" role="alert" data-testid="subir-documento-error">
              {errores.general}
            </p>
          </Presence>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={() => void subir()} isLoading={enviando} hideArrow data-testid="guardar-documento">
            Subir documento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
