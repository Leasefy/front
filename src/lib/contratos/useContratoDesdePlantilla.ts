'use client';

/**
 * Todo el estado de «armar el contrato desde la plantilla legal».
 *
 * Vive en un hook y no dentro del panel porque la pantalla necesita dos cosas
 * de acá antes de que el panel exista: si la redacción asistida está
 * configurada —para no ofrecer un botón muerto— y si el backend pudo decidir
 * que el contrato es de vivienda o comercial. Las dos salen de `preparar`, así
 * que `preparar` se pide al montar y su resultado lo comparten la sección de
 * «Tipo de contrato» y el panel.
 *
 * 🔴 Lo que este hook NO hace: decidir nada legal. El texto, el catálogo de
 * cláusulas, los topes de los artículos 18 y 20 y el validador están del otro
 * lado, y el validador corre SIEMPRE, venga la propuesta del modelo o del
 * formulario.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  contratosPlantillaApi,
  esIaCaida,
  esUsoIndeterminado,
  etiquetasFaltantes,
  motivosDelRechazo,
  type BorradorDeContrato,
  type ContratoGeneradoDesdePlantilla,
  type MotivoDeRechazo,
  type PreparacionDeContrato,
  type PropuestaDeLaIa,
} from '@/lib/api/contratos-plantilla.service';
import {
  alternarClausula,
  aplicarPropuesta,
  camposATrabajar,
  camposIncompletos,
  huellaDelBorrador,
  instruccionesValidas,
  mezclarValores,
  valoresDe,
} from './plantilla-legal';

/**
 * El formulario se escribe a mano y cada tecla cambiaría el borrador. Se espera
 * a que la persona pare antes de volver a preguntarle al backend.
 */
const ESPERA_ANTES_DE_PREPARAR_MS = 400;

export interface EstadoDelContratoDesdePlantilla {
  // — Preparación —
  preparacion: PreparacionDeContrato | null;
  preparando: boolean;
  /** El backend no pudo decidir vivienda o comercial. Trae su mensaje. */
  usoIndeterminado: string | null;
  /** Cualquier otro fallo al preparar. */
  errorDePreparacion: string | null;
  /** `null` mientras no se sabe: la primera preparación todavía no volvió. */
  iaDisponible: boolean | null;

  // — Lo que se está armando —
  valores: Record<string, string>;
  clausulas: string[];
  estipulaciones: string;

  // — IA —
  instrucciones: string;
  propuesta: PropuestaDeLaIa | null;
  /** Las variables que la propuesta dedujo, para poder señalarlas. */
  deducidasPorLaIa: string[];
  pidiendoPropuesta: boolean;
  errorDeLaIa: string | null;

  // — Generación —
  generando: boolean;
  generado: ContratoGeneradoDesdePlantilla | null;
  /** Se generó un PDF y después cambió algo que va impreso: hay que rehacerlo. */
  generadoQuedoViejo: boolean;
  motivosDeRechazo: MotivoDeRechazo[];
  faltantes: string[];
  errorAlGenerar: string | null;

  // — Derivados —
  campos: ReturnType<typeof camposATrabajar>;
  incompletos: ReturnType<typeof camposIncompletos>;
  puedeGenerar: boolean;
  puedePedirPropuesta: boolean;

  // — Acciones —
  escribirCampo: (nombre: string, valor: string) => void;
  alternar: (codigo: string) => void;
  quitarClausula: (codigo: string) => void;
  escribirEstipulaciones: (texto: string) => void;
  escribirInstrucciones: (texto: string) => void;
  pedirPropuesta: () => Promise<void>;
  descartarPropuesta: () => void;
  generar: () => Promise<ContratoGeneradoDesdePlantilla | null>;
}

export function useContratoDesdePlantilla(
  borrador: BorradorDeContrato,
  opciones: {
    /**
     * ¿La persona está usando el panel? Con `false` se prepara UNA sola vez
     * —hace falta para saber si la redacción asistida está configurada, y eso
     * decide si la tarjeta se puede apretar— y después se deja de preguntar.
     * Sin esto, alguien que sube su propio PDF dispara una preparación por cada
     * tecla del canon: peticiones que nadie va a mirar.
     */
    activo?: boolean;
  } = {},
): EstadoDelContratoDesdePlantilla {
  const { activo = true } = opciones;
  const [preparacion, setPreparacion] = useState<PreparacionDeContrato | null>(null);
  const [preparando, setPreparando] = useState(false);
  const [usoIndeterminado, setUsoIndeterminado] = useState<string | null>(null);
  const [errorDePreparacion, setErrorDePreparacion] = useState<string | null>(null);
  const [iaDisponible, setIaDisponible] = useState<boolean | null>(null);

  const [valores, setValores] = useState<Record<string, string>>({});
  const [clausulas, setClausulas] = useState<string[]>([]);
  const [estipulaciones, setEstipulaciones] = useState('');

  const [instrucciones, setInstrucciones] = useState('');
  const [propuesta, setPropuesta] = useState<PropuestaDeLaIa | null>(null);
  const [deducidasPorLaIa, setDeducidasPorLaIa] = useState<string[]>([]);
  const [pidiendoPropuesta, setPidiendoPropuesta] = useState(false);
  const [errorDeLaIa, setErrorDeLaIa] = useState<string | null>(null);

  const [generando, setGenerando] = useState(false);
  const [generado, setGenerado] = useState<ContratoGeneradoDesdePlantilla | null>(null);
  const [huellaGenerada, setHuellaGenerada] = useState<string | null>(null);
  const [motivosDeRechazo, setMotivos] = useState<MotivoDeRechazo[]>([]);
  const [faltantes, setFaltantes] = useState<string[]>([]);
  const [errorAlGenerar, setErrorAlGenerar] = useState<string | null>(null);

  /*
   * Los campos que la persona editó a mano. El resto lo manda el backend y
   * tiene que poder cambiar solo: si alguien corrige el canon arriba, el canon
   * impreso cambia con él. Sin esta distinción, o se pierde lo tecleado o se
   * imprime un número viejo — y lo segundo es un contrato firmado con una
   * cifra que nadie acordó.
   */
  const tocados = useRef<Set<string>>(new Set());

  /** Ya se preguntó al menos una vez: alcanza para saber si la IA está. */
  const yaSeSondeo = useRef(false);

  /*
   * `borrador` es un objeto nuevo en cada render de la pantalla que lo arma.
   * Lo que decide si hay que volver a preguntar es su CONTENIDO, no su
   * identidad; sin esto el efecto de abajo se dispararía en bucle.
   */
  const borradorSerializado = JSON.stringify(borrador);
  const clausulasSerializadas = JSON.stringify([...clausulas].sort());

  // ── Preparar ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!activo && yaSeSondeo.current) return;

    let vigente = true;
    const b = JSON.parse(borradorSerializado) as BorradorDeContrato;
    const elegidas = JSON.parse(clausulasSerializadas) as string[];

    const temporizador = setTimeout(() => {
      yaSeSondeo.current = true;
      setPreparando(true);
      contratosPlantillaApi
        .preparar({ borrador: b, valores, clausulas: elegidas })
        .then((p) => {
          if (!vigente) return;
          setPreparacion(p);
          setIaDisponible(p.iaDisponible);
          setUsoIndeterminado(null);
          setErrorDePreparacion(null);
          setValores((actuales) =>
            mezclarValores(valoresDe(p.campos.concat(...p.clausulas.map((c) => c.campos))), actuales, tocados.current),
          );
        })
        .catch((e: unknown) => {
          if (!vigente) return;
          setPreparacion(null);
          if (esUsoIndeterminado(e)) {
            // No es un fallo: es una pregunta que falta contestar, y el
            // backend ya la redactó mejor de lo que la redactaría acá.
            setUsoIndeterminado(
              e instanceof Error ? e.message : 'Falta elegir el uso del inmueble.',
            );
            setErrorDePreparacion(null);
            return;
          }
          setUsoIndeterminado(null);
          setErrorDePreparacion(
            e instanceof Error ? e.message : 'No pudimos preparar el contrato.',
          );
        })
        .finally(() => {
          if (vigente) setPreparando(false);
        });
    }, ESPERA_ANTES_DE_PREPARAR_MS);

    return () => {
      vigente = false;
      clearTimeout(temporizador);
    };
    // `valores` a propósito fuera: se LEE al preparar pero no dispara —
    // escribir un campo no puede volver a pedir el prellenado, o cada tecla
    // pelearía con la respuesta anterior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [borradorSerializado, clausulasSerializadas, activo]);

  // ── Un PDF generado deja de valer cuando cambia lo que va impreso ──────────

  const huella = useMemo(
    () =>
      huellaDelBorrador(JSON.parse(borradorSerializado) as BorradorDeContrato, {
        valores,
        clausulas,
        estipulaciones,
      }),
    [borradorSerializado, valores, clausulas, estipulaciones],
  );

  const generadoQuedoViejo = generado !== null && huellaGenerada !== huella;

  // ── Acciones ───────────────────────────────────────────────────────────────

  const escribirCampo = useCallback((nombre: string, valor: string) => {
    tocados.current.add(nombre);
    setValores((v) => ({ ...v, [nombre]: valor }));
  }, []);

  const alternar = useCallback((codigo: string) => {
    setClausulas((c) => alternarClausula(c, codigo));
  }, []);

  const quitarClausula = useCallback((codigo: string) => {
    setClausulas((c) => c.filter((x) => x !== codigo));
  }, []);

  const escribirEstipulaciones = useCallback((texto: string) => {
    setEstipulaciones(texto);
  }, []);

  const escribirInstrucciones = useCallback((texto: string) => {
    setInstrucciones(texto);
  }, []);

  const descartarPropuesta = useCallback(() => {
    setPropuesta(null);
    setDeducidasPorLaIa([]);
    setErrorDeLaIa(null);
  }, []);

  /**
   * Le pide una PROPUESTA al modelo y la vuelca sobre el formulario.
   *
   * 🔴 No genera nada. Lo que vuelve queda editable en los mismos campos del
   * modo plantilla: las cláusulas se pueden quitar una por una y las variables
   * deducidas se pueden reescribir. El sistema propone, la persona decide.
   */
  const pedirPropuesta = useCallback(async () => {
    if (!instruccionesValidas(instrucciones)) return;
    setPidiendoPropuesta(true);
    setErrorDeLaIa(null);
    try {
      const p = await contratosPlantillaApi.redactarConIa({
        borrador: JSON.parse(borradorSerializado) as BorradorDeContrato,
        instrucciones,
      });
      setPropuesta(p);
      const aplicada = aplicarPropuesta(p, { valores, clausulas });
      // Lo que dedujo el modelo cuenta como escrito por la persona: es lo que
      // está revisando, y una preparación posterior no puede pisárselo.
      for (const nombre of aplicada.deducidas) tocados.current.add(nombre);
      setValores(aplicada.valores);
      setClausulas(aplicada.clausulas);
      if (aplicada.estipulacionesEspeciales) {
        setEstipulaciones(aplicada.estipulacionesEspeciales);
      }
      setDeducidasPorLaIa(aplicada.deducidas);
    } catch (e: unknown) {
      setPropuesta(null);
      setDeducidasPorLaIa([]);
      setErrorDeLaIa(
        e instanceof Error
          ? e.message
          : 'No pudimos consultar el asistente de redacción.',
      );
      // Un 503 también significa que la clave dejó de estar: que la tarjeta se
      // apague sola es más honesto que ofrecer un botón que ya no responde.
      if (esIaCaida(e)) setIaDisponible(false);
    } finally {
      setPidiendoPropuesta(false);
    }
  }, [borradorSerializado, instrucciones, valores, clausulas]);

  const campos = useMemo(
    () =>
      preparacion
        ? camposATrabajar(preparacion.campos, preparacion.clausulas, clausulas)
        : [],
    [preparacion, clausulas],
  );

  const incompletos = useMemo(
    () => camposIncompletos(campos, valores),
    [campos, valores],
  );

  const generar = useCallback(async (): Promise<ContratoGeneradoDesdePlantilla | null> => {
    if (!preparacion) return null;
    setGenerando(true);
    setMotivos([]);
    setFaltantes([]);
    setErrorAlGenerar(null);
    try {
      const g = await contratosPlantillaApi.generar({
        borrador: JSON.parse(borradorSerializado) as BorradorDeContrato,
        valores,
        clausulas,
        estipulacionesEspeciales: estipulaciones,
      });
      setGenerado(g);
      setHuellaGenerada(huella);
      return g;
    } catch (e: unknown) {
      setGenerado(null);
      setHuellaGenerada(null);
      const motivos = motivosDelRechazo(e);
      const etiquetas = etiquetasFaltantes(e);
      setMotivos(motivos);
      setFaltantes(etiquetas);
      // Con motivos o con faltantes, la lista ES el mensaje: repetir arriba el
      // párrafo que los concatena sería decir dos veces lo mismo.
      setErrorAlGenerar(
        motivos.length || etiquetas.length
          ? null
          : e instanceof Error
            ? e.message
            : 'No pudimos generar el contrato.',
      );
      return null;
    } finally {
      setGenerando(false);
    }
  }, [preparacion, borradorSerializado, valores, clausulas, estipulaciones, huella]);

  return {
    preparacion,
    preparando,
    usoIndeterminado,
    errorDePreparacion,
    iaDisponible,

    valores,
    clausulas,
    estipulaciones,

    instrucciones,
    propuesta,
    deducidasPorLaIa,
    pidiendoPropuesta,
    errorDeLaIa,

    generando,
    generado,
    generadoQuedoViejo,
    motivosDeRechazo,
    faltantes,
    errorAlGenerar,

    campos,
    incompletos,
    puedeGenerar:
      preparacion !== null && !preparando && !generando && incompletos.length === 0,
    puedePedirPropuesta:
      iaDisponible === true &&
      preparacion !== null &&
      !pidiendoPropuesta &&
      instruccionesValidas(instrucciones),

    escribirCampo,
    alternar,
    quitarClausula,
    escribirEstipulaciones,
    escribirInstrucciones,
    pedirPropuesta,
    descartarPropuesta,
    generar,
  };
}
