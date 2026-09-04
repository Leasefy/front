'use client';

/**
 * «Generar documento» — el diálogo que arma uno de los documentos legales.
 *
 * Antes, el menú de este botón listaba cinco tipos y cuatro de ellos abrían un
 * toast que decía «próximamente». Ahora cada tipo pide lo que le falta y sale
 * con un PDF: el tipo, sobre qué contrato o inmueble, y los datos que NO están
 * en el sistema (la fecha de entrega, las lecturas de los contadores, el
 * porcentaje del incremento). Todo lo demás lo trae el backend prellenado.
 *
 * Nada acá inventa contenido legal: el texto, sus variables y el tope del
 * artículo 20 viven en el backend, y esta pantalla sólo evita mandar a la
 * persona a un error que ya se puede ver.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Warning } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useContracts } from '@/lib/hooks/useContracts';
import { useConsignaciones } from '@/lib/hooks/useInmobiliaria';
import {
  documentosLegalesApi,
  type CodigoDeDocumentoLegal,
  type DocumentoGenerado,
  type PlantillaLegalDelSistema,
  type PreparacionDeDocumento,
} from '@/lib/api/documentos.service';
import {
  ORDEN_DE_TIPOS,
  avisoDelIncremento,
  camposFaltantes,
  formatearPesos,
  puedeGenerar,
  puedePreparar,
  queFaltaElegir,
} from './reglas';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se llama con el documento creado, para que la tabla lo muestre. */
  onGenerado: (documento: DocumentoGenerado) => void;
}

export function GenerarDocumentoDialog({ open, onOpenChange, onGenerado }: Props) {
  const { contracts, isLoading: cargandoContratos } = useContracts();
  const { consignaciones, isLoading: cargandoInmuebles } = useConsignaciones();

  const [plantillas, setPlantillas] = useState<PlantillaLegalDelSistema[]>([]);
  const [codigo, setCodigo] = useState<CodigoDeDocumentoLegal | ''>('');
  const [contractId, setContractId] = useState('');
  const [consignacionId, setConsignacionId] = useState('');
  const [preparacion, setPreparacion] = useState<PreparacionDeDocumento | null>(null);
  /*
   * 🔴 El tope del incremento NO es un dato fijo del contrato: es el IPC del año
   * calendario anterior a aquel en que empieza a regir el reajuste (Ley 820 de
   * 2003, art. 20). Si la persona cambia «Rige a partir de», el tope cambia con
   * ella. Antes se preguntaba una sola vez —para el aniversario que propone el
   * sistema— y una vigencia dentro de este año quedaba bloqueada por el IPC del
   * año que viene, que el DANE todavía no publicó: un callejón sin salida.
   */
  const [vigenciaPedida, setVigenciaPedida] = useState('');
  const [valores, setValores] = useState<Record<string, string>>({});
  const [preparando, setPreparando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plantilla = useMemo(
    () => plantillas.find((p) => p.codigo === codigo) ?? null,
    [plantillas, codigo],
  );

  // Los tipos que el sistema sabe armar. Se piden al abrir: la lista es del
  // backend, así que agregar una plantilla no obliga a tocar esta pantalla.
  useEffect(() => {
    if (!open) return;
    let vigente = true;
    documentosLegalesApi
      .plantillasLegales()
      .then((p) => {
        if (vigente) setPlantillas(p);
      })
      .catch((e: unknown) => {
        if (vigente) setError(e instanceof Error ? e.message : 'No pudimos cargar los tipos de documento.');
      });
    return () => {
      vigente = false;
    };
  }, [open]);

  // Al cerrar, todo vuelve a cero: reabrir con el formulario a medio llenar de
  // otro contrato es una fuente de documentos mal emitidos.
  useEffect(() => {
    if (open) return;
    setCodigo('');
    setContractId('');
    setConsignacionId('');
    setPreparacion(null);
    setValores({});
    setError(null);
  }, [open]);

  const listo = puedePreparar(plantilla, { contractId, consignacionId });

  /**
   * Escribir en un campo. `fechaDeVigencia` es especial: además de guardarse,
   * vuelve a pedirle el tope al backend, porque el IPC que lo fija es el del
   * año calendario anterior a esa fecha (Ley 820 de 2003, art. 20).
   */
  const escribirCampo = useCallback((nombre: string, valor: string) => {
    setValores((v) => ({ ...v, [nombre]: valor }));
    if (nombre === 'fechaDeVigencia' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      setVigenciaPedida(valor);
    }
  }, []);

  // Los campos prellenados los calcula el backend con los datos reales del
  // contrato; acá no se deduce ninguno.
  useEffect(() => {
    if (!codigo || !listo) {
      setPreparacion(null);
      setValores({});
      return;
    }
    let vigente = true;
    setPreparando(true);
    setError(null);
    documentosLegalesApi
      .preparar({
        codigo,
        contractId: contractId || undefined,
        consignacionId: consignacionId || undefined,
        fechaDeVigencia: vigenciaPedida || undefined,
      })
      .then((p) => {
        if (!vigente) return;
        setPreparacion(p);
        // Al REpreguntar por una fecha nueva no se pisa lo que la persona ya
        // escribió: sólo se completa lo que todavía está vacío.
        setValores((antes) => {
          const delBack = Object.fromEntries(p.campos.map((c) => [c.nombre, c.valor]));
          if (!vigenciaPedida) return delBack;
          const mezcla = { ...delBack };
          for (const [k, v] of Object.entries(antes)) {
            if (v !== '' && v !== undefined) mezcla[k] = v;
          }
          return mezcla;
        });
      })
      .catch((e: unknown) => {
        if (!vigente) return;
        setPreparacion(null);
        setError(e instanceof Error ? e.message : 'No pudimos preparar el documento.');
      })
      .finally(() => {
        if (vigente) setPreparando(false);
      });
    return () => {
      vigente = false;
    };
  }, [codigo, contractId, consignacionId, listo, vigenciaPedida]);

  const opcionesDeTipo = useMemo<ComboboxOption[]>(
    () =>
      [...plantillas]
        .sort((a, b) => ORDEN_DE_TIPOS.indexOf(a.codigo) - ORDEN_DE_TIPOS.indexOf(b.codigo))
        .map((p) => ({ value: p.codigo, label: p.nombre })),
    [plantillas],
  );

  const opcionesDeContrato = useMemo<ComboboxOption[]>(
    () =>
      contracts
        .filter((c) => c.status !== 'cancelled')
        .map((c) => ({
          value: c.id,
          // El Combobox busca sólo por `label`, así que todo lo buscable va acá.
          label: [
            c.code ? `#${c.code}` : null,
            c.propertyAddress || null,
            c.tenantName || null,
          ]
            .filter(Boolean)
            .join(' · ') || c.id,
        })),
    [contracts],
  );

  const opcionesDeInmueble = useMemo<ComboboxOption[]>(
    () =>
      consignaciones.map((c) => ({
        value: c.id,
        label: [c.propertyTitle, c.propertyAddress].filter(Boolean).join(' · '),
      })),
    [consignaciones],
  );

  const aceptaInmueble = plantilla?.requiere === 'contrato-o-inmueble';

  const aviso = useMemo(
    () =>
      plantilla?.codigo === 'CARTA_INCREMENTO'
        ? avisoDelIncremento(preparacion?.incremento ?? null, valores.porcentajeIncremento ?? '')
        : null,
    [plantilla, preparacion, valores],
  );

  const faltantes = preparacion ? camposFaltantes(preparacion.campos, valores) : [];

  const sePuede =
    !!preparacion &&
    puedeGenerar({
      plantilla,
      contractId: contractId || undefined,
      consignacionId: consignacionId || undefined,
      campos: preparacion.campos,
      valores,
      incremento: preparacion.incremento,
    });

  const generar = useCallback(async () => {
    if (!codigo || !preparacion) return;
    setGenerando(true);
    setError(null);
    try {
      const documento = await documentosLegalesApi.generar({
        codigo,
        contractId: contractId || undefined,
        consignacionId: consignacionId || undefined,
        overrides: valores,
        name: preparacion.nombreSugerido,
      });
      toast.success('Documento generado', { description: documento.name });
      onGenerado(documento);
      onOpenChange(false);
    } catch (e: unknown) {
      // El mensaje del backend tal cual: cuando faltan variables dice
      // exactamente cuáles, y cuando el incremento se pasa del tope dice el
      // artículo y el IPC.
      setError(e instanceof Error ? e.message : 'No pudimos generar el documento.');
    } finally {
      setGenerando(false);
    }
  }, [codigo, contractId, consignacionId, valores, preparacion, onGenerado, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generar documento</DialogTitle>
          <DialogDescription>
            El texto sale de las plantillas legales del sistema y los datos, del contrato.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-5 overflow-y-auto px-1 py-1">
          {/* 1 — Tipo */}
          <div className="space-y-1.5">
            <Label htmlFor="doc-tipo">Documento</Label>
            <Combobox
              data-testid="doc-tipo"
              options={opcionesDeTipo}
              value={codigo || undefined}
              onChange={(v) => setCodigo((v ?? '') as CodigoDeDocumentoLegal | '')}
              placeholder={opcionesDeTipo.length ? 'Elegí qué generar' : 'Cargando…'}
              searchPlaceholder="Contrato, acta, inventario, carta"
              disabled={opcionesDeTipo.length === 0}
              contentClassName="z-[400]"
            />
            {plantilla && <p className="text-caption text-fg-muted">{plantilla.descripcion}</p>}
          </div>

          {/* 2 — Sobre qué */}
          {plantilla && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="doc-contrato">
                  Contrato{' '}
                  {aceptaInmueble && <span className="font-normal text-fg-muted">(o un inmueble)</span>}
                </Label>
                <Combobox
                  data-testid="doc-contrato"
                  options={opcionesDeContrato}
                  value={contractId || undefined}
                  onChange={(v) => {
                    setContractId(v ?? '');
                    if (v) setConsignacionId('');
                  }}
                  placeholder={
                    cargandoContratos
                      ? 'Cargando contratos…'
                      : opcionesDeContrato.length
                        ? 'Buscar por número, dirección o inquilino'
                        : 'No hay contratos'
                  }
                  searchPlaceholder="Número, dirección o inquilino"
                  disabled={opcionesDeContrato.length === 0}
                  contentClassName="z-[400]"
                />
              </div>

              {aceptaInmueble && (
                <div className="space-y-1.5">
                  <Label htmlFor="doc-inmueble">Inmueble</Label>
                  <Combobox
                    data-testid="doc-inmueble"
                    options={opcionesDeInmueble}
                    value={consignacionId || undefined}
                    onChange={(v) => {
                      setConsignacionId(v ?? '');
                      if (v) setContractId('');
                    }}
                    placeholder={
                      cargandoInmuebles
                        ? 'Cargando inmuebles…'
                        : opcionesDeInmueble.length
                          ? 'Buscar por título o dirección'
                          : 'No hay inmuebles'
                    }
                    searchPlaceholder="Título o dirección"
                    disabled={opcionesDeInmueble.length === 0}
                    contentClassName="z-[400]"
                  />
                </div>
              )}
            </div>
          )}

          {/* 3 — Campos */}
          {plantilla && !listo && (
            <p className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-body-sm text-fg-muted">
              {queFaltaElegir(plantilla)}
            </p>
          )}

          {preparando && (
            <div className="flex items-center justify-center py-8">
              <Spinner />
            </div>
          )}

          {preparacion && !preparando && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-surface-muted px-4 py-3">
                <p className="text-body-sm text-fg">{preparacion.nombreSugerido}</p>
                <p className="text-caption text-fg-muted">
                  {preparacion.contrato
                    ? `Contrato #${preparacion.contrato.codigo} · ${
                        preparacion.contrato.uso === 'COMERCIAL' ? 'uso comercial' : 'vivienda'
                      }${
                        preparacion.contrato.canon !== null
                          ? ` · canon ${formatearPesos(preparacion.contrato.canon)}`
                          : ''
                      }`
                    : 'Sin contrato'}
                  {' · '}
                  {preparacion.itemsDeInventario > 0
                    ? `${preparacion.itemsDeInventario} ítems de inventario`
                    : 'sin inventario cargado'}
                </p>
              </div>

              {aviso && (
                <p
                  data-testid="doc-aviso-incremento"
                  className={cn(
                    'flex items-start gap-2 rounded-lg px-4 py-3 text-body-sm',
                    aviso.bloquea
                      ? 'bg-danger-soft text-danger'
                      : 'bg-surface-muted text-fg-muted',
                  )}
                >
                  {aviso.bloquea && <Warning className="mt-0.5 h-4 w-4 shrink-0" weight="fill" />}
                  <span>{aviso.texto}</span>
                </p>
              )}

              {preparacion.campos.length === 0 ? (
                <p className="text-body-sm text-fg-muted">
                  Este documento sale entero de los datos del contrato: no hay nada que completar.
                </p>
              ) : (
                <div className="space-y-3">
                  {preparacion.campos.map((campo) => {
                    const id = `doc-campo-${campo.nombre}`;
                    const valor = valores[campo.nombre] ?? '';
                    const vacio = campo.requerida && valor.trim() === '';
                    return (
                      <div key={campo.nombre} className="space-y-1.5">
                        <Label htmlFor={id}>
                          {campo.etiqueta}
                          {!campo.requerida && (
                            <span className="font-normal text-fg-muted"> (opcional)</span>
                          )}
                        </Label>
                        {campo.tipo === 'parrafo' ? (
                          <Textarea
                            id={id}
                            data-testid={id}
                            rows={3}
                            value={valor}
                            aria-invalid={vacio}
                            onChange={(e) => escribirCampo(campo.nombre, e.target.value)}
                          />
                        ) : (
                          <Input
                            id={id}
                            data-testid={id}
                            value={valor}
                            inputMode={
                              campo.tipo === 'porcentaje' || campo.tipo === 'numero'
                                ? 'decimal'
                                : undefined
                            }
                            aria-invalid={vacio}
                            onChange={(e) => escribirCampo(campo.nombre, e.target.value)}
                          />
                        )}
                        {campo.ayuda && (
                          <p className="text-caption text-fg-muted">{campo.ayuda}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {error && (
            <p
              data-testid="doc-error"
              className="rounded-lg bg-danger-soft px-4 py-3 text-body-sm text-danger"
            >
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" hideArrow onClick={() => onOpenChange(false)} disabled={generando}>
            Cancelar
          </Button>
          <Button
            hideArrow
            data-testid="doc-generar"
            onClick={() => void generar()}
            disabled={!sePuede || generando}
          >
            {generando ? 'Generando…' : 'Generar'}
          </Button>
        </DialogFooter>

        {faltantes.length > 0 && preparacion && (
          <p className="px-1 text-caption text-fg-muted">
            Falta completar: {faltantes.map((c) => c.etiqueta).join(', ')}.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
