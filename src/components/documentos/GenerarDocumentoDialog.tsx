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
 *
 * ── Los dos orígenes del texto, en UNA sola puerta (21-09-2026) ────────────
 *
 * El mismo selector lista las ocho plantillas legales del sistema y las que
 * escribió la inmobiliaria. Son dos llamadas distintas al back —`codigo` para
 * las legales, `templateId` para las propias— y el diálogo decide cuál usar,
 * pero para quien genera un documento es una sola pregunta: «¿qué documento
 * quieres?». Dos botones de «generar documento» en la misma pantalla serían dos
 * caminos que se van separando.
 *
 * La diferencia visible: una plantilla propia no tiene campos que escribir a
 * mano —su catálogo de variables lo llena el sistema entero— así que se salta
 * el paso de «preparar» y sólo pide sobre qué contrato o inmueble se genera.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Appear, Presence } from '@leasefy/cadence';
import { Warning } from '@phosphor-icons/react';
import { toast } from '@/components/ui/toast';
import { camposDelError, mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
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
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import {
  errorDeLaFechaDeVigencia,
  vigenciaComoIso,
} from '@/lib/documentos/limites-de-los-documentos';
import {
  elSelectorSirve,
  loQueDiceUnSelector,
} from '@/lib/errores/lo-que-dice-un-selector';
import {
  documentosLegalesApi,
  type CodigoDeDocumentoLegal,
  type DocumentoGenerado,
  type PlantillaDeLaAgencia,
  type PlantillaLegalDelSistema,
  type PreparacionDeDocumento,
} from '@/lib/api/documentos.service';
import {
  CIUDADES_DE_COLOMBIA,
  etiquetaDeCiudad,
} from '@/lib/constants/colombia-geo';
import {
  ORDEN_DE_TIPOS,
  avisoDelIncremento,
  camposFaltantes,
  esCampoDeCiudad,
  formatearPesos,
  puedeGenerar,
  puedePreparar,
  queFaltaElegir,
  etiquetaDelContratoParaElCombo,
  rotuloDelContratoPreparado,
} from './reglas';

/**
 * Las ciudades del país para el selector. Se arma una sola vez, fuera del
 * componente: son 1.100 y no cambian entre renders.
 */
const OPCIONES_DE_CIUDAD: ComboboxOption[] = CIUDADES_DE_COLOMBIA.map((c) => ({
  value: c.ciudad,
  label: etiquetaDeCiudad(c),
}));

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se llama con el documento creado, para que la tabla lo muestre. */
  onGenerado: (documento: DocumentoGenerado) => void;
  /**
   * Las plantillas que escribió la inmobiliaria (`codigo === null`). Se pasan
   * desde la pantalla, que ya las tiene: pedirlas otra vez acá sería una
   * segunda lectura de la misma lista.
   */
  plantillasPropias?: PlantillaDeLaAgencia[];
}

/** Prefijo del valor de una plantilla propia en el selector, para que su id no
 *  se pueda confundir con el `codigo` de una legal. */
const PREFIJO_PROPIA = 'propia:';

export function GenerarDocumentoDialog({
  open,
  onOpenChange,
  onGenerado,
  plantillasPropias = [],
}: Props) {
  /* 🔴 Los errores se LEEN, no se ignoran (21-09). Sin esto, con la lectura de
     inmuebles caída el selector decía «No hay inmuebles» habiendo 2.965: un
     fallo disfrazado de vacío, que nadie reporta porque parece un dato. */
  const {
    contracts,
    isLoading: cargandoContratos,
    errorCrudo: errorDeContratos,
  } = useContracts();
  const {
    consignaciones,
    isLoading: cargandoInmuebles,
    errorCrudo: errorDeInmuebles,
  } = useConsignaciones();

  const [plantillas, setPlantillas] = useState<PlantillaLegalDelSistema[]>([]);
  const [codigo, setCodigo] = useState<CodigoDeDocumentoLegal | ''>('');
  /** Id de la plantilla propia elegida. Excluyente con `codigo`. */
  const [propiaId, setPropiaId] = useState('');
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
  /*
   * 02-10-2026 · Lo que el back rechazó de la fecha de vigencia AL GENERAR
   * (`GenerateDocumentDto.overrides`, Nico): va bajo «Fecha de vigencia», no en
   * el aviso general. Se borra al escribir en ese campo.
   */
  const [vigenciaRechazada, setVigenciaRechazada] = useState<string | null>(null);
  /*
   * 02-10-2026 (Nico: «¿no tenemos parsers…?»): la fecha de vigencia se
   * escribe como la escribe una persona («01/12/2026», «1 de diciembre de
   * 2026»…). Lo que todavía se puede arreglar tecleando (falta el año, aún no
   * se entiende) se dice cuando sale del campo o pide generar: `true` desde
   * ese momento hasta que vuelve a escribir.
   */
  const [vigenciaTerminada, setVigenciaTerminada] = useState(false);

  const plantilla = useMemo(
    () => plantillas.find((p) => p.codigo === codigo) ?? null,
    [plantillas, codigo],
  );

  const propia = useMemo(
    () => plantillasPropias.find((p) => p.id === propiaId) ?? null,
    [plantillasPropias, propiaId],
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
        if (vigente)
          setError(
            mensajeParaLaPersona(e, {
              porDefecto: 'No pudimos cargar los tipos de documento.',
              accion: 'cargar los tipos de documento',
            }),
          );
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
    setPropiaId('');
    setContractId('');
    setConsignacionId('');
    setPreparacion(null);
    setValores({});
    setError(null);
    setVigenciaRechazada(null);
    setVigenciaTerminada(false);
    // `fechaDeVigencia` es SÓLO de la carta de incremento: es lo que fija el
    // tope del art. 20. Si sobrevive al cierre, el próximo documento —un
    // inventario, un acta— se prepara con un parámetro que no es suyo.
    setVigenciaPedida('');
  }, [open]);

  const listo = puedePreparar(plantilla, { contractId, consignacionId });

  /**
   * Escribir en un campo. `fechaDeVigencia` es especial: además de guardarse,
   * vuelve a pedirle el tope al backend, porque el IPC que lo fija es el del
   * año calendario anterior a esa fecha (Ley 820 de 2003, art. 20).
   */
  const escribirCampo = useCallback((nombre: string, valor: string) => {
    setValores((v) => ({ ...v, [nombre]: valor }));
    if (nombre !== 'fechaDeVigencia') return;
    setVigenciaRechazada(null);
    setVigenciaTerminada(false);
    // 🔴 02-10-2026 · Un día que no existe (`2026-02-31`) o fuera de 2000–2100
    // no se le pregunta al back: se dice bajo el campo con su misma frase.
    // Con el año de cuatro cifras («01/12/2026», «1 de diciembre de 2026») ya
    // está entera y se le pregunta el tope de una; con dos («1/12/26») se
    // espera a que salga del campo: «1/12/20» también es una fecha y pediría
    // el tope de 2020 a mitad de camino.
    const iso = vigenciaComoIso(valor);
    if (iso && /\d{4}/.test(valor)) setVigenciaPedida(iso);
  }, []);

  /** Salir de la fecha de vigencia: ahí se dice lo que falta y se pide el tope. */
  const terminarLaVigencia = useCallback((valor: string) => {
    setVigenciaTerminada(true);
    const iso = vigenciaComoIso(valor);
    if (iso) setVigenciaPedida(iso);
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
        setError(
          mensajeParaLaPersona(e, {
            porDefecto: 'No pudimos preparar el documento.',
            accion: 'preparar el documento',
          }),
        );
      })
      .finally(() => {
        if (vigente) setPreparando(false);
      });
    return () => {
      vigente = false;
    };
  }, [codigo, contractId, consignacionId, listo, vigenciaPedida]);

  const opcionesDeTipo = useMemo<ComboboxOption[]>(
    () => [
      ...[...plantillas]
        .sort((a, b) => ORDEN_DE_TIPOS.indexOf(a.codigo) - ORDEN_DE_TIPOS.indexOf(b.codigo))
        .map((p) => ({ value: p.codigo, label: p.nombre })),
      /* Las de la inmobiliaria, al final y rotuladas: el Combobox busca por
         `label`, así que «tuya» sirve para encontrarlas todas de una vez. */
      ...plantillasPropias.map((p) => ({
        value: `${PREFIJO_PROPIA}${p.id}`,
        label: `${p.name} · plantilla tuya`,
      })),
    ],
    [plantillas, plantillasPropias],
  );

  const opcionesDeContrato = useMemo<ComboboxOption[]>(
    () =>
      contracts
        .filter((c) => c.status !== 'cancelled')
        .map((c) => ({
          value: c.id,
          // El Combobox busca sólo por `label`, así que todo lo buscable va
          // acá: los DOS números (el de Nui y el nuestro, rotulado).
          label: etiquetaDelContratoParaElCombo(c),
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

  // La fecha de vigencia que el back rechazaría (`@EsDiaDelCalendario` +
  // `@FechaEntre`): con ella no se genera la carta.
  const tieneVigencia = preparacion?.campos.some((c) => c.nombre === 'fechaDeVigencia') ?? false;
  const errorDeLaVigencia = tieneVigencia
    ? (errorDeLaFechaDeVigencia(valores.fechaDeVigencia, { terminada: vigenciaTerminada }) ??
      vigenciaRechazada)
    : null;

  /* Una propia se puede generar en cuanto hay sobre qué; si no usa variables,
     desde el momento en que se elige. */
  const sePuedeLaPropia =
    !!propia && (propia.variables.length === 0 || !!contractId || !!consignacionId);

  const sePuede =
    sePuedeLaPropia ||
    (!!preparacion &&
    !errorDeLaVigencia &&
    puedeGenerar({
      plantilla,
      contractId: contractId || undefined,
      consignacionId: consignacionId || undefined,
      campos: preparacion.campos,
      valores,
      incremento: preparacion.incremento,
      certificado: preparacion.certificado,
    }));

  const generar = useCallback(async () => {
    /*
     * Una plantilla propia va por otra ruta del back (`templateId` en vez de
     * `codigo`) y no tiene `preparacion`: no hay campos que escribir a mano.
     */
    if (propia) {
      setGenerando(true);
      setError(null);
      try {
        const documento = await documentosLegalesApi.generarDePlantillaPropia({
          templateId: propia.id,
          contractId: contractId || undefined,
          consignacionId: consignacionId || undefined,
          name: propia.name,
        });
        toast.success('Documento generado', { description: documento.name });
        onGenerado(documento);
        onOpenChange(false);
      } catch (e: unknown) {
        setError(
          mensajeParaLaPersona(e, {
            porDefecto: 'No pudimos generar el documento.',
            accion: 'generar el documento',
          }),
        );
      } finally {
        setGenerando(false);
      }
      return;
    }

    if (!codigo || !preparacion) return;
    // La fecha de vigencia que todavía no se entiende se dice bajo el campo y
    // no se manda: el back diría lo mismo.
    if (
      tieneVigencia &&
      errorDeLaFechaDeVigencia(valores.fechaDeVigencia, { terminada: true })
    ) {
      setVigenciaTerminada(true);
      return;
    }
    // Viaja en AAAA-MM-DD (el back también la lee escrita, pero no hace falta).
    const vigenciaIso = tieneVigencia ? vigenciaComoIso(valores.fechaDeVigencia) : null;
    setGenerando(true);
    setError(null);
    try {
      const documento = await documentosLegalesApi.generar({
        codigo,
        contractId: contractId || undefined,
        consignacionId: consignacionId || undefined,
        overrides: vigenciaIso ? { ...valores, fechaDeVigencia: vigenciaIso } : valores,
        name: preparacion.nombreSugerido,
      });
      toast.success('Documento generado', { description: documento.name });
      onGenerado(documento);
      onOpenChange(false);
    } catch (e: unknown) {
      // 02-10-2026 · La fecha de vigencia que el back rechaza al generar
      // (`overrides`, regla `fecha`) va bajo su campo, con la frase del back.
      const deLaVigencia = tieneVigencia
        ? camposDelError(e).find(
            (c) =>
              c.campo === 'overrides.fechaDeVigencia' ||
              c.campo === 'fechaDeVigencia' ||
              (c.campo === 'overrides' && c.regla === 'fecha'),
          )
        : undefined;
      if (deLaVigencia) {
        setVigenciaRechazada(deLaVigencia.mensaje);
        return;
      }
      // El mensaje del backend tal cual: cuando faltan variables dice
      // exactamente cuáles, y cuando el incremento se pasa del tope dice el
      // artículo y el IPC. Por el traductor (02-10-2026): un 5xx dice que falló
      // de nuestro lado con su referencia, y «conexión» sólo sin respuesta.
      setError(
        mensajeParaLaPersona(e, {
          porDefecto: 'No pudimos generar el documento.',
          accion: 'generar el documento',
        }),
      );
    } finally {
      setGenerando(false);
    }
  }, [
    codigo,
    propia,
    contractId,
    consignacionId,
    valores,
    preparacion,
    tieneVigencia,
    onGenerado,
    onOpenChange,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Generar documento</DialogTitle>
          {/* La frase nombra los DOS orígenes desde que el selector lista también
              las plantillas de la inmobiliaria: decir sólo «las legales del
              sistema» dejaba a la propia pareciendo que no cuenta. */}
          <DialogDescription>
            El texto sale de una plantilla —legal del sistema o tuya— y los datos, del
            contrato.
          </DialogDescription>
        </DialogHeader>

        {/* Este scroll propio es a propósito (no el del cuerpo del modal): deja
            el error y el «falta completar» de abajo pegados al pie. Ver el 🔴. */}
        <div
          data-testid="doc-campos"
          className="max-h-[60vh] space-y-5 overflow-y-auto px-1 py-1"
          data-lenis-prevent
        >
          {/* 1 — Tipo */}
          <div className="space-y-1.5">
            <Label htmlFor="doc-tipo">Documento</Label>
            <Combobox
              data-testid="doc-tipo"
              options={opcionesDeTipo}
              value={codigo || (propiaId ? `${PREFIJO_PROPIA}${propiaId}` : undefined)}
              onChange={(v) => {
                const elegido = v ?? '';
                if (elegido.startsWith(PREFIJO_PROPIA)) {
                  setPropiaId(elegido.slice(PREFIJO_PROPIA.length));
                  setCodigo('');
                  // Una propia no tiene campos que preparar: lo que quedara de
                  // una legal elegida antes se iría a la llamada equivocada.
                  setPreparacion(null);
                  setValores({});
                } else {
                  setCodigo(elegido as CodigoDeDocumentoLegal | '');
                  setPropiaId('');
                }
              }}
              placeholder={opcionesDeTipo.length ? 'Elige qué generar' : 'Cargando…'}
              searchPlaceholder="Contrato, acta, inventario, carta"
              disabled={opcionesDeTipo.length === 0}
              contentClassName="z-[400]"
            />
            {plantilla && <p className="text-caption text-fg-muted">{plantilla.descripcion}</p>}
            {propia && (
              <p className="text-caption text-fg-muted" data-testid="doc-propia-desc">
                Plantilla escrita por tu inmobiliaria.{' '}
                {propia.variables.length === 0
                  ? 'No usa datos del contrato: sale igual siempre.'
                  : propia.variables.length === 1
                    ? 'Usa 1 dato del contrato, y lo llena el sistema.'
                    : `Usa ${propia.variables.length} datos del contrato, y los llena el sistema.`}
              </p>
            )}
          </div>

          {/* 2 — Sobre qué. Una plantilla propia acepta contrato O inmueble: sus
              variables salen del mismo resolvedor que las legales, que sabe
              llenar lo que haya. */}
          {propia && propia.variables.length > 0 && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="doc-contrato-propia">
                  Contrato <span className="font-normal text-fg-muted">(o un inmueble)</span>
                </Label>
                <Combobox
                  data-testid="doc-contrato"
                  options={opcionesDeContrato}
                  value={contractId || undefined}
                  onChange={(v) => {
                    setContractId(v ?? '');
                    if (v) setConsignacionId('');
                  }}
                  placeholder={loQueDiceUnSelector({
                    cargando: cargandoContratos,
                    error: errorDeContratos,
                    cuantos: opcionesDeContrato.length,
                    queSon: 'los contratos',
                    pista: 'Buscar por número, dirección o inquilino',
                    cuandoNoHay: 'No hay contratos',
                  })}
                  searchPlaceholder="Número, dirección o inquilino"
                  disabled={
                    !elSelectorSirve({
                      cargando: cargandoContratos,
                      error: errorDeContratos,
                      cuantos: opcionesDeContrato.length,
                    })
                  }
                  contentClassName="z-[400]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="doc-inmueble-propia">Inmueble</Label>
                <Combobox
                  data-testid="doc-inmueble"
                  options={opcionesDeInmueble}
                  value={consignacionId || undefined}
                  onChange={(v) => {
                    setConsignacionId(v ?? '');
                    if (v) setContractId('');
                  }}
                  placeholder={loQueDiceUnSelector({
                    cargando: cargandoInmuebles,
                    error: errorDeInmuebles,
                    cuantos: opcionesDeInmueble.length,
                    queSon: 'los inmuebles',
                    pista: 'Buscar por título o dirección',
                    cuandoNoHay: 'No hay inmuebles',
                  })}
                  searchPlaceholder="Título o dirección"
                  disabled={
                    !elSelectorSirve({
                      cargando: cargandoInmuebles,
                      error: errorDeInmuebles,
                      cuantos: opcionesDeInmueble.length,
                    })
                  }
                  contentClassName="z-[400]"
                />
              </div>
              {!contractId && !consignacionId && (
                <p
                  className="rounded-[14px] border border-border px-4 py-3 text-body-sm text-fg-muted"
                  data-testid="doc-propia-falta-sobre-que"
                >
                  Elige el contrato o el inmueble de donde salen los datos: esta plantilla
                  usa {propia.variables.length === 1 ? 'uno' : propia.variables.length} y sin
                  eso saldrían en blanco.
                </p>
              )}
            </div>
          )}

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
                  placeholder={loQueDiceUnSelector({
                    cargando: cargandoContratos,
                    error: errorDeContratos,
                    cuantos: opcionesDeContrato.length,
                    queSon: 'los contratos',
                    pista: 'Buscar por número, dirección o inquilino',
                    cuandoNoHay: 'No hay contratos',
                  })}
                  searchPlaceholder="Número, dirección o inquilino"
                  disabled={
                    !elSelectorSirve({
                      cargando: cargandoContratos,
                      error: errorDeContratos,
                      cuantos: opcionesDeContrato.length,
                    })
                  }
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
                    placeholder={loQueDiceUnSelector({
                      cargando: cargandoInmuebles,
                      error: errorDeInmuebles,
                      cuantos: opcionesDeInmueble.length,
                      queSon: 'los inmuebles',
                      pista: 'Buscar por título o dirección',
                      cuandoNoHay: 'No hay inmuebles',
                    })}
                    searchPlaceholder="Título o dirección"
                    disabled={
                      !elSelectorSirve({
                        cargando: cargandoInmuebles,
                        error: errorDeInmuebles,
                        cuantos: opcionesDeInmueble.length,
                      })
                    }
                    contentClassName="z-[400]"
                  />
                </div>
              )}
            </div>
          )}

          {/* 3 — Campos */}
          {plantilla && !listo && (
            <p className="rounded-[14px] border border-border px-4 py-3 text-body-sm text-fg-muted">
              {queFaltaElegir(plantilla)}
            </p>
          )}

          {preparando && (
            <div className="flex items-center justify-center py-8">
              <Spinner />
            </div>
          )}

          {/* Lo que el servidor preparó llega con su entrada (el spinner se va). */}
          {preparacion && !preparando && (
            <Appear className="space-y-4">
              <div className="rounded-[14px] border border-border px-4 py-3">
                <p className="text-body-sm text-fg">{preparacion.nombreSugerido}</p>
                <p className="text-caption text-fg-muted">
                  {preparacion.contrato
                    ? `${rotuloDelContratoPreparado(preparacion.contrato)} · ${
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
                      : 'bg-surface-hover text-fg-muted',
                  )}
                >
                  {aviso.bloquea && <Warning className="mt-0.5 h-4 w-4 shrink-0" weight="fill" />}
                  <span>{aviso.texto}</span>
                </p>
              )}

              {/*
                🔴 El veredicto del paz y salvo va ARRIBA de los campos, no
                abajo del botón: quien está atendiendo a alguien que espera el
                papel tiene que ver de una vez todo lo que falta, y no
                descubrirlo de a un motivo por intento. Las cifras no se pintan
                acá — las pone el back en el documento.
              */}
              {preparacion.certificado && !preparacion.certificado.puedeEmitirse && (
                <div
                  data-testid="doc-impedimentos-certificado"
                  className="space-y-1.5 rounded-lg bg-danger-soft px-4 py-3 text-body-sm text-danger"
                >
                  {preparacion.certificado.impedimentos.map((i) => (
                    <p key={i.code} className="flex items-start gap-2">
                      <Warning className="mt-0.5 h-4 w-4 shrink-0" weight="fill" />
                      <span>{i.mensaje}</span>
                    </p>
                  ))}
                </div>
              )}

              {preparacion.certificado?.puedeEmitirse && (
                <p
                  data-testid="doc-certificado-procede"
                  className="rounded-[14px] bg-surface-hover px-4 py-3 text-body-sm text-fg-muted"
                >
                  El estado de cuenta de este contrato está en cero. Las cifras del documento
                  las toma el sistema del estado de cuenta: no se escriben a mano.
                  {plantilla?.codigo === 'PAZ_Y_SALVO' &&
                    !preparacion.certificado.hayActa &&
                    ' No hay acta de devolución registrada, así que el documento lo dice y aclara que no certifica el estado en que se entregó el inmueble.'}
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
                    const errorDelCampo =
                      campo.nombre === 'fechaDeVigencia' ? errorDeLaVigencia : null;
                    return (
                      <div key={campo.nombre} className="space-y-1.5">
                        {/* El Combobox del DS no acepta `id`, así que para la
                            ciudad la etiqueta no puede apuntar a nada: un
                            `htmlFor` colgando es peor que no tenerlo. */}
                        <Label htmlFor={esCampoDeCiudad(campo) ? undefined : id}>
                          {campo.etiqueta}
                          {!campo.requerida && (
                            <span className="font-normal text-fg-muted"> (opcional)</span>
                          )}
                        </Label>
                        {esCampoDeCiudad(campo) ? (
                          /*
                           * Ciudad no se escribe: se elige. Es la misma lista
                           * DIVIPOLA que ya usa el onboarding, no una copia.
                           */
                          <Combobox
                            data-testid={id}
                            options={OPCIONES_DE_CIUDAD}
                            value={valor || undefined}
                            onChange={(v) => escribirCampo(campo.nombre, v ?? '')}
                            placeholder="Elige la ciudad"
                            searchPlaceholder="Ciudad o departamento"
                            invalid={vacio}
                            contentClassName="z-[400]"
                          />
                        ) : campo.tipo === 'parrafo' ? (
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
                            aria-invalid={vacio || !!errorDelCampo}
                            // 🔴 03-10 (pruebas en el navegador): el borde rojo lo pinta
                            // el DS con `invalid`; con sólo `aria-invalid` la fecha
                            // rechazada se veía igual que una buena. Sólo con el error
                            // dicho: un requerido vacío lo dice el pie, no un borde rojo
                            // desde que se abre el diálogo.
                            invalid={!!errorDelCampo}
                            aria-describedby={
                              campo.nombre === 'fechaDeVigencia' ? `${id}-error` : undefined
                            }
                            placeholder={
                              campo.nombre === 'fechaDeVigencia' ? 'Por ejemplo 01/12/2026' : undefined
                            }
                            onChange={(e) => escribirCampo(campo.nombre, e.target.value)}
                            onBlur={
                              campo.nombre === 'fechaDeVigencia'
                                ? (e) => terminarLaVigencia(e.target.value)
                                : undefined
                            }
                          />
                        )}
                        {campo.nombre === 'fechaDeVigencia' && (
                          <ErrorDelCampo id={`${id}-error`} mensaje={errorDelCampo} />
                        )}
                        {campo.ayuda && (
                          <p className="text-caption text-fg-muted">{campo.ayuda}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Appear>
          )}

        </div>

        {/*
         * 🔴 El error y el «falta completar» viven FUERA del cajón que scrollea.
         *
         * Estaban adentro, al final de los campos. El acta de devolución tiene
         * trece: con el formulario scrolleado hasta abajo, el botón «Generar»
         * —que está en el pie, siempre a la vista— disparaba un 400 y el mensaje
         * se pintaba en una parte del cajón que nadie estaba mirando. Desde
         * afuera se veía exactamente lo que reportó Nico: «le di generar y no
         * pasó nada». Acá, pegados al pie, aparecen justo encima del botón que
         * los produjo. `role="alert"` para que un lector de pantalla los cante.
         */}
        <Presence show={Boolean(error)} initial={false} distance="xs" as="p" data-testid="doc-error" role="alert" className="mx-1 rounded-lg bg-danger-soft px-4 py-3 text-body-sm text-danger">
          {error}
        </Presence>

        {faltantes.length > 0 && preparacion && (
          <p data-testid="doc-faltantes" className="px-1 text-caption text-fg-muted">
            Falta completar: {faltantes.map((c) => c.etiqueta).join(', ')}.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" hideArrow onClick={() => onOpenChange(false)} disabled={generando}>
            Cancelar
          </Button>
          <Button
            hideArrow
            data-testid="doc-generar"
            onClick={() => void generar()}
            disabled={!sePuede || generando}
            isLoading={generando}
          >
            {generando ? 'Generando…' : 'Generar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
