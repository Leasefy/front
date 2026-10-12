"use client";

/**
 * FaltantesDeFila — qué le falta a una fila, y qué se hace para resolverlo.
 *
 * Cada faltante tiene su propia salida. Decir "falta algo" y ofrecer un solo
 * botón obligaría a adivinar; lo que hay que hacer para conseguir un inmueble
 * que no existe no se parece en nada a corregir un correo mal escrito.
 */

import { useState, useEffect, useRef } from "react";
import { Presence } from "@leasefy/cadence";
import { Buildings, Envelope, User, Warning } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  contractsApi,
  type FilaDeMigracion,
} from "@/lib/api/contracts.service";
import { SIN_TIPO, TIPOS_DE_INMUEBLE_FALTANTE } from "@/lib/contratos/tipos-de-inmueble-faltante";
import { propietariosApi } from "@/lib/api/inmobiliaria.service";
import { formatCurrency } from "@/lib/format";
import {
  SelectorDeInmueble,
  olvidarPortafolio,
  usePortafolioDeLaAgencia,
} from "./SelectorDeInmueble";
import type { Propietario } from "@/lib/types/inmobiliaria";
import { documentoParaMostrar } from "@/lib/propietarios/datos-por-completar";
import { ErrorDelCampo } from "@/components/estado/ErrorDelCampo";
import { repartirErroresDelServidor } from "@/lib/errores/errores-en-el-formulario";
import {
  errorDeLaComision,
  errorDelCanon,
  errorDelDiaDePago,
  erroresDeLasFechas,
} from "@/components/migracion/limites-de-la-migracion";
import { usePlataConCentavos } from "@/lib/plata/use-plata-con-centavos";
import { CampoDeDia } from "@/components/contabilidad/CampoDeDia";

/**
 * Los campos de esta fila que tienen dónde pintar su error, con el nombre que
 * usa el back (`ResolverFilaDto`, `RegistrarPropietarioDto`,
 * `CrearInmuebleDeFilaDto`). Un error de otro campo (el `propertyId` de un
 * botón, un correo del propietario que no se ve acá) va al aviso de la fila.
 */
const CAMPOS_CON_LUGAR = [
  "inquilinoCorreo",
  "inquilinoNombre",
  "inquilinoDocumento",
  "monthlyRent",
  "startDate",
  "endDate",
  "paymentDay",
  "usoInmueble",
  "nombre",
  "documento",
  "comisionPorcentaje",
  "address",
  "city",
  // El tipo del inmueble que se crea desde la fila (QA-MIG-A, MG-34).
  "tipo",
] as const;

/** El `id` del control de un campo de la fila (y `${id}-error`, el de su error). */
export function idDelCampo(filaId: string, campo: string): string {
  return `faltante-${filaId}-${campo}`;
}

/** Lo que el back dijo de cada campo en el último guardado de la fila. */
type ErroresPorCampo = Partial<Record<string, string>>;

/** El nombre humano de cada faltante, y por qué importa. */
/**
 * La explicación de un faltante mirando lo que la fila TRAE, no sólo el
 * código. «fechas» y «canon» los da el back igual cuando el dato está mal y
 * cuando no vino: decir «la de fin no es posterior a la de inicio» a una fila
 * sin fecha de fin, o «el canon está en cero» a un «2.1M» que no se pudo leer,
 * manda a buscar el error donde no está (QA-MIG-A, MG-25).
 */
export function explicacionDe(
  fila: { datos?: unknown },
  faltante: string,
): { titulo: string; porque: string } | undefined {
  const datos = (fila.datos ?? {}) as { startDate?: unknown; endDate?: unknown; monthlyRent?: unknown }
  const vacio = (v: unknown) => v === undefined || v === null || String(v).trim() === ''
  if (faltante === 'fechas') {
    const sinInicio = vacio(datos.startDate)
    const sinFin = vacio(datos.endDate)
    const porque = 'El archivo no la trae o no se pudo leer como fecha (día/mes/año). Escríbela acá.'
    if (sinInicio && sinFin) return { titulo: 'Faltan las fechas del contrato', porque: 'El archivo no las trae o no se pudieron leer como fecha (día/mes/año). Escríbelas acá.' }
    if (sinInicio) return { titulo: 'Falta la fecha de inicio', porque }
    if (sinFin) return { titulo: 'Falta la fecha de terminación', porque }
  }
  if (faltante === 'canon' && vacio(datos.monthlyRent)) {
    return {
      titulo: 'Falta el canon',
      porque: 'El archivo no lo trae o no se pudo leer como pesos (por ejemplo «2.1M»). Escríbelo acá.',
    }
  }
  return EXPLICACION[faltante] ?? {
    titulo: 'Falta un dato que esta versión todavía no sabe nombrar',
    porque: `Código interno: ${faltante}. Abre la fila en el archivo y revisa sus datos; si no ves qué falta, avísanos con ese código.`,
  }
}

export const EXPLICACION: Record<string, { titulo: string; porque: string }> = {
  inmueble: {
    titulo: "No encontramos el inmueble",
    porque:
      "La dirección del archivo no coincide con ninguno de tu portafolio. Sin inmueble el contrato no se activa: no tendría consignación ni cobros.",
  },
  inmueble_codigo: {
    titulo: "Ese inmueble todavía no está en Leasefy",
    /*
     * 🔴 Este texto decía «un código que no existe suele ser el archivo
     * corrido». Era falso y costó cuatro rondas: Nico abría su Excel, veía el
     * inmueble con ese código y esa dirección, y el producto le decía que su
     * archivo estaba mal. Su inmueble de código 3 estaba en la fila 2862 de su
     * importación, LISTO y sin faltantes — sólo que sin activar.
     *
     * La causa más común de verdad es ésa: el inmueble está cargado a medias
     * (preparado, sin activar) o no se cargó. El aviso de arriba
     * (`InmueblesSinActivar`) cuenta cuántos son y lleva al botón. Acá se
     * nombra la causa sin acusar al archivo.
     */
    porque:
      "El archivo señala el inmueble por su código y ningún inmueble tuyo lo tiene todavía. Casi siempre es que la importación de inmuebles quedó a medias: el inmueble está preparado pero sin activar, o no se subió. No lo pegamos por la dirección cuando el código no existe — pegarlo por parecido lo dejaría en el inmueble equivocado. Actívalo desde Inmuebles, elígelo acá abajo, o créalo.",
  },
  inmueble_ambiguo: {
    titulo: "Hay más de un inmueble con esa dirección",
    porque:
      "Elegir por ti pegaría el contrato al inmueble equivocado, y quedaría perfecto.",
  },
  // QA-MIGRACION-95 (06-10): un arriendo vigente no va sobre un inmueble en venta.
  inmueble_en_venta: {
    titulo: "Ese inmueble está en venta",
    porque:
      "Un contrato de arriendo vigente no se activa sobre un inmueble publicado en venta. Elige el inmueble correcto o, si de verdad se arrienda, cámbialo a arriendo en su ficha y pulsa «Volver a cruzar con lo ya cargado» arriba.",
  },
  inquilino_correo_invalido: {
    titulo: "El correo del inquilino no se puede usar",
    porque:
      "El archivo trae algo que no es un correo válido (por ejemplo, con tildes o espacios). Corrígelo aquí: con él se invita al inquilino al portal.",
  },
  inmueble_ocupado: {
    titulo: "Ese inmueble ya tiene un contrato vigente",
    porque:
      "Dos arriendos sobre la misma puerta le cobran a dos personas por lo mismo.",
  },
  propietario: {
    titulo: "El inmueble no está consignado",
    porque:
      "Los cobros se generan desde la consignación: sin ella no habrá cartera.",
  },
  /*
   * El back frena con `inquilino_correo` cuando la fila no trae NI documento NI
   * correo: el documento basta para identificarlo (Nico, 09-09). Pedir sólo
   * el correo escondía la salida buena (QA-MIG-A, MG-35).
   */
  inquilino_correo: {
    titulo: "Falta el documento o el correo del inquilino",
    porque:
      "Con el documento basta para saber quién es; el correo sirve para invitarlo al portal. Escribe uno de los dos.",
  },
  inquilino_nombre: {
    titulo: "Falta el nombre del inquilino",
    porque: "Sin nombre no se puede crear la cuenta ni el contrato. Escríbelo acá.",
  },
  consecutivo_repetido: {
    titulo: "Ese consecutivo viene en más de una fila del archivo",
    porque:
      "Dos filas con el mismo número serían dos contratos con el mismo número. Deja una sola: descarta la que sobra aquí abajo (busca el consecutivo en el archivo para saber cuál es la buena) y pulsa «Volver a cruzar con lo ya cargado» arriba para liberar la que se queda.",
  },
  inquilino_documento_ajeno: {
    titulo: "Ese documento es de una cuenta que no es de inquilino",
    porque:
      "Coincide con un agente o un propietario con cuenta en el portal. No se le cuelga un arriendo a esa persona: corrige el documento, o vacialo para que el contrato se resuelva por el correo.",
  },
  fechas: {
    titulo: "Las fechas no cuadran",
    porque: "La de fin no es posterior a la de inicio.",
  },
  canon: {
    titulo: "El canon está en cero",
    porque: "Un contrato que no cobra nada.",
  },
  // EN-38 (QA-MIGRACION-95): misma regla que la fila de inmuebles (NI-07).
  canon_con_centavos: {
    titulo: "El canon del archivo trae centavos",
    porque:
      "Tu plataforma todavía no guarda centavos y no se redondea por ti: escribe el canon al peso aquí, o pide que se activen los centavos.",
  },
  uso: {
    titulo: "Falta el uso del inmueble",
    porque: "Decide el IVA: vivienda está excluida y comercial no.",
  },
  dia_de_pago: {
    titulo: "El día de pago del archivo no es válido",
    porque:
      "Es opcional: si lo dejas vacío se usa la fecha de cartera. Si lo escribes, va del 1 al 28.",
  },
  cartera_antes_del_inicio: {
    titulo: "La fecha de cartera es anterior al inicio",
    porque:
      "Se cobra desde que el inquilino recibe el inmueble, y eso no pasa antes de que arranque el contrato. Corrige la fecha de cartera (o la de inicio) en el archivo y vuelve a subirlo.",
  },
  reparto_del_canon: {
    titulo: "La plata por dueño no cuadra",
    porque:
      "«Valor Canon» reparte el canon entre los dueños y la lista no coincide con ellos o no suma el canon. No se inventa un 50/50: define abajo cuánto es de cada dueño, sin volver a subir el archivo.",
  },
  // T-0163: varios inquilinos con «Valor Canon». Sin editor: lo derivó el back.
  reparto_de_inquilinos: {
    titulo: "La plata por inquilino no cuadra",
    porque:
      "«Valor Canon» reparte el canon entre los inquilinos y la lista no coincide con ellos o no suma el canon. Corrige la celda en el archivo y vuelve a subirlo, o descarta la fila: no se inventa un reparto.",
  },
  // El back lo pone DESPUÉS de activar: el contrato ya existe.
  verificacion_difiere: {
    titulo: "Lo guardado no coincide con el archivo",
    porque:
      "La doble verificación encontró que lo que quedó guardado no es lo que el archivo decía. El contrato ya existe y nada se corrigió solo: abre su detalle, compara el campo que difiere con el archivo y corrígelo ahí.",
  },
  otros: {
    titulo: "Falta un dato que esta versión todavía no sabe nombrar",
    porque:
      "Abre la fila en el archivo y revisa sus datos; si no ves qué falta, avísanos.",
  },
};

/**
 * Qué decía la celda del archivo para este faltante.
 *
 * «No encontramos el inmueble» no dice cuál dirección se buscó, y en 1.200
 * filas eso obliga a abrir el Excel y contar líneas. El valor ya viaja en
 * `datos` —es lo que el archivo mandó— así que mostrarlo no cuesta nada.
 *
 * Sólo los faltantes cuyo valor SOBREVIVE el parseo: un canon o una fecha
 * ilegibles se descartan al armar la fila y nunca llegan hasta acá (para
 * mostrarlos habría que hacerlos viajar en el DTO — ver el reporte).
 */
export function celdaDelFaltante(
  fila: FilaDeMigracion,
  faltante: string,
): string | null {
  const datos = fila.datos as {
    direccion?: unknown;
    codigoInmueble?: unknown;
    externalId?: unknown;
    inquilino?: { nombre?: unknown; correo?: unknown; documento?: unknown };
    canonConCentavosDelArchivo?: unknown;
    startDate?: unknown;
    fechaDeCartera?: unknown;
  } | null;
  const texto = (v: unknown) => {
    const t = String(v ?? '').trim();
    if (!t) return null;
    return t.length > 60 ? `${t.slice(0, 60)}…` : t;
  };
  switch (faltante) {
    case 'inmueble':
    case 'inmueble_ambiguo':
      return texto(datos?.direccion);
    // «código 999», no «#999»: el «#» es cómo Leasefy escribe SU consecutivo,
    // y desde el 2026-09-08 lo que trae este campo es el código del sistema
    // del que se migra. Escribirlo con almohadilla lo hace pasar por otra cosa.
    case 'inmueble_codigo':
      return texto(
        datos?.codigoInmueble != null
          ? `código ${String(datos.codigoInmueble)} · ${String(datos.direccion ?? '')}`
          : datos?.direccion,
      );
    // El inmueble SÍ se encontró: la fila dice cuál era la dirección del archivo.
    case 'inmueble_en_venta':
    case 'inmueble_ocupado':
      return texto(datos?.direccion);
    case 'canon_con_centavos':
      return texto(datos?.canonConCentavosDelArchivo);
    case 'cartera_antes_del_inicio': {
      const dia = (v: unknown) => String(v ?? '').slice(0, 10);
      return datos?.fechaDeCartera && datos?.startDate
        ? texto(`cartera ${dia(datos.fechaDeCartera)} · inicio ${dia(datos.startDate)}`)
        : null;
    }
    case 'inquilino_correo_invalido':
    case 'inquilino_correo':
      return texto(datos?.inquilino?.correo);
    case 'inquilino_nombre':
      return texto(datos?.inquilino?.nombre);
    case 'inquilino_documento_ajeno':
      return texto(datos?.inquilino?.documento);
    // La lista de plata tal como viajó, y el motivo exacto que dio el back
    // (viene en la asociación de la fila, no en `datos`).
    case 'reparto_del_canon': {
      const lista = (datos as { canonPorPropietario?: unknown } | null)?.canonPorPropietario;
      const plata = Array.isArray(lista)
        ? lista.map((n) => formatCurrency(Number(n))).join(', ')
        : null;
      const motivo = fila.asociacion?.propietario?.reparto?.problema ?? null;
      return texto([plata, motivo].filter(Boolean).join(' — '));
    }
    // T-0163: el motivo exacto que dio el back al derivar el reparto de los inquilinos.
    case 'reparto_de_inquilinos':
      return texto(fila.asociacion?.inquilino?.repartoDeInquilinos?.problema);
    // El consecutivo del sistema anterior, tal cual vino: es lo que hay que
    // buscar en el archivo para decidir cuál de las filas gemelas se queda.
    case 'consecutivo_repetido':
      return texto(datos?.externalId != null ? `consecutivo ${String(datos.externalId)}` : null);
    default:
      return null;
  }
}

interface Props {
  fila: FilaDeMigracion;
  onResuelta: (f: FilaDeMigracion) => void;
  /**
   * Faltantes que la pantalla que la contiene ya resuelve por su cuenta.
   *
   * Nace de la revisión de contratos: ahí el propietario tiene su propio
   * selector con buscador en la misma fila, así que pintar además el
   * formulario de «El inmueble no está consignado» daba DOS controles para lo
   * mismo, con formas distintas y a un centímetro de distancia.
   */
  omitir?: string[];
}

export function FaltantesDeFila({ fila, onResuelta, omitir }: Props) {
  // «Centavos en todo»: el canon corregido a mano acepta centavos con la llave
  // de los contratos (`ResolverFilaDto` del back).
  const contratosConCentavos = usePlataConCentavos('contratos_y_cuotas');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /*
   * Sistema de errores (02-10-2026): un 400 con `campos` se pinta debajo de
   * SU campo y le da el foco; lo que no tiene campo acá (o un 5xx, o la red)
   * va al aviso de la fila, con el traductor — nunca el `message` crudo.
   */
  const [erroresDelServidor, setErroresDelServidor] = useState<ErroresPorCampo>({});
  /**
   * El campo que hay que enfocar cuando termine de guardar: mientras guarda,
   * algunos controles (el uso) están apagados y un `focus()` no hace nada.
   */
  const [porEnfocar, setPorEnfocar] = useState<string | null>(null);
  useEffect(() => {
    if (ocupado || !porEnfocar) return;
    document.getElementById(idDelCampo(fila.id, porEnfocar))?.focus();
    setPorEnfocar(null);
  }, [ocupado, porEnfocar, fila.id]);
  const quitarErrorDe = (campo: string) =>
    setErroresDelServidor((previos) => {
      if (!previos[campo]) return previos;
      const { [campo]: _quitado, ...resto } = previos;
      void _quitado;
      return resto;
    });

  async function correr(accion: () => Promise<FilaDeMigracion>) {
    setOcupado(true);
    setError(null);
    setErroresDelServidor({});
    try {
      onResuelta(await accion());
    } catch (e) {
      const reparto = repartirErroresDelServidor(e, {
        campos: CAMPOS_CON_LUGAR,
        porDefecto: "No pudimos guardar el cambio. Prueba de nuevo en un momento.",
        accion: "guardar el cambio",
      });
      setErroresDelServidor(reparto.porCampo);
      setError(reparto.sueltos.length > 0 ? reparto.sueltos.join(" · ") : null);
      setPorEnfocar(reparto.orden[0] ?? null);
    } finally {
      setOcupado(false);
    }
  }

  /** Lo que comparten todos los campos: su id, su error del back y cómo borrarlo. */
  const campo = (nombre: string) => ({
    id: idDelCampo(fila.id, nombre),
    mensaje: erroresDelServidor[nombre] ?? null,
    onEditar: () => quitarErrorDe(nombre),
  });

  return (
    <div className="space-y-3">
      {fila.faltantes
        .filter((f) => !omitir?.includes(f))
        .map((f) => (
        <div key={f} className="rounded-lg border border-border p-3">
          <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Warning className="h-4 w-4 text-warning" />
            {explicacionDe(fila, f)?.titulo ?? f}
          </p>
          {explicacionDe(fila, f)?.porque ? (
            <p className="mt-0.5 text-caption text-muted-foreground">
              {explicacionDe(fila, f)?.porque}
            </p>
          ) : null}
          {celdaDelFaltante(fila, f) ? (
            <p
              className="mt-1 text-caption text-muted-foreground"
              data-testid={`celda-de-${f}`}
            >
              El archivo dice:{" "}
              <span className="font-medium text-foreground">
                «{celdaDelFaltante(fila, f)}»
              </span>
            </p>
          ) : null}

          <div className="mt-3">
            {f === "inmueble" ||
            f === "inmueble_ambiguo" ||
            f === "inmueble_codigo" ? (
              <ElegirInmueble
                fila={fila}
                ocupado={ocupado}
                correr={correr}
                campo={campo}
              />
            ) : null}
            {f === "inmueble_en_venta" ? (
              <ElegirInmueble
                fila={fila}
                ocupado={ocupado}
                correr={correr}
                campo={campo}
                elInmuebleExiste
              />
            ) : null}
            {f === "inmueble_ocupado" ? (
              <InmuebleOcupado
                fila={fila}
                ocupado={ocupado}
                correr={correr}
                campo={campo}
              />
            ) : null}
            {f === "propietario" ? (
              <RegistrarPropietario
                fila={fila}
                ocupado={ocupado}
                correr={correr}
                campo={campo}
              />
            ) : null}
            {f === "inquilino_correo" ? (
              <div className="space-y-2">
                <CampoSimple
                  {...campo("inquilinoDocumento")}
                  icono={User}
                  etiqueta="Documento del inquilino"
                  ocupado={ocupado}
                  onGuardar={(v) =>
                    correr(() =>
                      contractsApi.migracion.resolver(fila.id, {
                        inquilinoDocumento: v,
                      }),
                    )
                  }
                />
                <CampoSimple
                  {...campo("inquilinoCorreo")}
                  icono={Envelope}
                  etiqueta="Correo del inquilino"
                  tipo="email"
                  ocupado={ocupado}
                  onGuardar={(v) =>
                    correr(() =>
                      contractsApi.migracion.resolver(fila.id, {
                        inquilinoCorreo: v,
                      }),
                    )
                  }
                />
              </div>
            ) : null}
            {/* QA-MIGRACION-95: el correo del archivo no se puede usar; se corrige aquí. */}
            {f === "inquilino_correo_invalido" ? (
              <CampoSimple
                {...campo("inquilinoCorreo")}
                icono={Envelope}
                etiqueta="Correo del inquilino"
                tipo="email"
                ocupado={ocupado}
                onGuardar={(v) =>
                  correr(() =>
                    contractsApi.migracion.resolver(fila.id, {
                      inquilinoCorreo: v,
                    }),
                  )
                }
              />
            ) : null}
            {f === "inquilino_nombre" ? (
              <CampoSimple
                {...campo("inquilinoNombre")}
                icono={User}
                etiqueta="Nombre del inquilino"
                ocupado={ocupado}
                onGuardar={(v) =>
                  correr(() =>
                    contractsApi.migracion.resolver(fila.id, {
                      inquilinoNombre: v,
                    }),
                  )
                }
              />
            ) : null}
            {f === "inquilino_documento_ajeno" ? (
              <DocumentoDelInquilino
                fila={fila}
                ocupado={ocupado}
                correr={correr}
                campo={campo}
              />
            ) : null}
            {f === "uso" ? (
              <UsoDelInmueble
                {...campo("usoInmueble")}
                ocupado={ocupado}
                onElegir={(v) =>
                  void correr(() =>
                    contractsApi.migracion.resolver(fila.id, {
                      usoInmueble: v,
                    }),
                  )
                }
              />
            ) : null}
            {f === "canon" || f === "canon_con_centavos" ? (
              <CampoSimple
                {...campo("monthlyRent")}
                etiqueta="Canon mensual"
                tipo="number"
                ocupado={ocupado}
                // El mismo tope y la misma frase que `ResolverFilaDto`.
                validar={(v) => errorDelCanon(v, { conCentavos: contratosConCentavos })}
                onGuardar={(v) =>
                  correr(() =>
                    contractsApi.migracion.resolver(fila.id, {
                      monthlyRent: Number(v),
                    }),
                  )
                }
              />
            ) : null}
            {f === "fechas" ? (
              <Fechas
                fila={fila}
                ocupado={ocupado}
                correr={correr}
                campo={campo}
              />
            ) : null}
            {f === "reparto_del_canon" ? (
              <RepartoEditable fila={fila} ocupado={ocupado} correr={correr} />
            ) : null}
            {f === "reparto_de_inquilinos" ? (
              <Button
                variant="outline"
                size="sm"
                hideArrow
                disabled={ocupado}
                data-testid="descartar-fila-sin-reparto"
                onClick={() => void correr(() => contractsApi.migracion.descartar(fila.id))}
              >
                Descartar esta fila
              </Button>
            ) : null}
            {f === "consecutivo_repetido" ? (
              <Button
                variant="outline"
                size="sm"
                hideArrow
                disabled={ocupado}
                data-testid="descartar-fila-repetida"
                onClick={() => void correr(() => contractsApi.migracion.descartar(fila.id))}
              >
                Descartar esta fila
              </Button>
            ) : null}
            {f === "dia_de_pago" ? (
              <CampoSimple
                {...campo("paymentDay")}
                etiqueta="Día de pago (1-28). Si lo dejas vacío se usa la fecha de cartera."
                tipo="number"
                ocupado={ocupado}
                // Antes un 30 no hacía nada y no decía por qué.
                validar={errorDelDiaDePago}
                onGuardar={(v) =>
                  correr(() =>
                    contractsApi.migracion.resolver(fila.id, {
                      paymentDay: Number(v),
                    }),
                  )
                }
              />
            ) : null}
          </div>
        </div>
      ))}

      {/* Lo que no es de un campo de acá: un 409, un 5xx con su referencia,
          la red. Es el aviso de la fila, no el error de un campo. */}
      <Presence show={Boolean(error)} initial={false} distance="xs" as="p" className="text-sm text-destructive" role="alert" data-testid="error-de-faltantes">
        {error}
      </Presence>
    </div>
  );
}

/** Las props de un campo de la fila: su id, su error del back y cómo borrarlo. */
type PropsDelCampo = {
  id: string;
  mensaje: string | null;
  onEditar: () => void;
};

type Correr = (a: () => Promise<FilaDeMigracion>) => Promise<void>;

/** «9001»: sólo dígitos. Es un código del sistema anterior, no una dirección (CO-27). */
export function pareceUnCodigo(d: string | null | undefined): boolean {
  return /^\s*\d{1,12}\s*$/.test(d ?? "");
}

function ElegirInmueble({
  fila,
  ocupado,
  correr,
  campo,
  elInmuebleExiste = false,
}: {
  fila: FilaDeMigracion;
  ocupado: boolean;
  correr: Correr;
  campo: (nombre: string) => PropsDelCampo;
  /**
   * CO-27 (QA-MIGRACION-95, 06-10): la fila SÍ encontró su inmueble y está
   * ocupado. Decir «sin inmueble… créalo» ahí era falso, y crearlo duplicaba
   * el inmueble con la dirección del archivo (que puede ser sólo «9001»).
   */
  elInmuebleExiste?: boolean;
}) {
  const [creando, setCreando] = useState(false);
  const [ciudad, setCiudad] = useState("");
  const direccion = fila.datos.direccion ?? "";
  const esCodigo = pareceUnCodigo(direccion);
  const sePuedeCrear = !elInmuebleExiste && !esCodigo;
  const dir = campo("address");
  const ciu = campo("city");
  const tip = campo("tipo");
  const [tipoNuevo, setTipoNuevo] = useState<string>(SIN_TIPO);
  /*
   * El portafolio entero, para elegir a mano. Se pide una vez y lo comparten
   * todas las filas de la pantalla (ver `usePortafolioDeLaAgencia`).
   */
  const portafolio = usePortafolioDeLaAgencia(true);

  return (
    <div className="space-y-3">
      {/*
       * 2026-09-02 — sin inmueble el contrato NO se activa (el modo sparse
       * del back quedó apagado por defecto: una agencia activó 90 contratos
       * así, «Sin inmueble», y ninguno generó un cobro). La nota anterior
       * decía lo contrario. No hay tercer botón: es puramente informativo,
       * la fila se queda pendiente hasta que se le elija o cree el inmueble.
       */}
      <p className="text-caption text-muted-foreground" data-testid="elegir-inmueble-ayuda">
        {elInmuebleExiste && fila.faltantes.includes("inmueble_en_venta")
          ? "Si este contrato es de OTRO inmueble, elígelo aquí."
          : elInmuebleExiste
          ? "Si este contrato es de OTRO inmueble, elígelo aquí. Si es el mismo, confírmalo con «Sé que está ocupado, seguir igual»."
          : esCodigo
            ? `El archivo trae «${direccion.trim()}»: es un código, no una dirección. Elige el inmueble con ese código o cárgalo en el paso de Inmuebles.`
            : "Sin inmueble el contrato no se activa: no tendría consignación ni generaría cobros. Elige uno de los candidatos o créalo desde la dirección del archivo."}
      </p>
      {fila.candidatos.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-caption text-muted-foreground">
            {fila.candidatos.length === 1
              ? "¿Es este?"
              : `Hay ${fila.candidatos.length} parecidos. ¿Cuál es?`}
          </p>
          <div className="flex flex-wrap gap-2">
            {fila.candidatos.map((c) => (
              <Button
                key={c.id}
                variant="outline"
                size="sm"
                hideArrow
                disabled={ocupado}
                onClick={() =>
                  void correr(() =>
                    contractsApi.migracion.resolver(fila.id, {
                      propertyId: c.id,
                    }),
                  )
                }
              >
                <Buildings className="mr-1.5 h-3.5 w-3.5" />
                {c.address}
                {c.ocupado ? " · ocupado" : ""}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {/*
       * Buscar en TODO el portafolio.
       *
       * Los «parecidos» de arriba salen del resolutor y son cinco como mucho,
       * elegidos por los números de la dirección. Cuando ninguno sirve —el
       * caso más común: el archivo trae un código que existe en el sistema
       * viejo pero cuyo inmueble todavía no se cargó— la única salida era
       * crear el inmueble otra vez, duplicándolo. Esto abre la lista entera.
       */}
      <div className="space-y-1.5">
        <p className="text-caption text-muted-foreground">
          {fila.candidatos.length > 0
            ? "¿Ninguno es? Búscalo entre todos tus inmuebles:"
            : "Búscalo entre todos tus inmuebles:"}
        </p>
        <SelectorDeInmueble
          inmuebles={portafolio.inmuebles}
          disabled={ocupado || portafolio.cargando}
          testId={`selector-inmueble-${fila.id}`}
          onElegir={(i) =>
            void correr(() =>
              contractsApi.migracion.resolver(fila.id, { propertyId: i.id }),
            )
          }
        />
        {portafolio.error ? (
          <p
            className="flex flex-wrap items-center gap-2 text-caption text-destructive"
            data-testid={`portafolio-fallo-${fila.id}`}
          >
            {portafolio.error}
            <Button
              variant="ghost"
              size="sm"
              hideArrow
              disabled={ocupado || portafolio.cargando}
              onClick={portafolio.reintentar}
              data-testid={`portafolio-reintentar-${fila.id}`}
            >
              Reintentar
            </Button>
            <span className="text-muted-foreground">
              O créalo desde la dirección del archivo.
            </span>
          </p>
        ) : null}
        {portafolio.recortado ? (
          <p className="text-caption text-muted-foreground">
            La lista muestra los {portafolio.inmuebles.length} más recientes.
          </p>
        ) : null}
      </div>

      {creando ? (
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-[180px] flex-1">
            <label htmlFor={dir.id} className="text-caption text-muted-foreground">
              Dirección
            </label>
            <Input
              defaultValue={direccion}
              id={dir.id}
              aria-invalid={dir.mensaje ? true : undefined}
              invalid={Boolean(dir.mensaje)}
              aria-describedby={dir.mensaje ? `${dir.id}-error` : undefined}
              onChange={dir.onEditar}
            />
            <ErrorDelCampo id={`${dir.id}-error`} mensaje={dir.mensaje} />
          </div>
          <div className="w-40">
            <label htmlFor={ciu.id} className="text-caption text-muted-foreground">
              Ciudad
            </label>
            <Input
              id={ciu.id}
              value={ciudad}
              aria-invalid={ciu.mensaje ? true : undefined}
              invalid={Boolean(ciu.mensaje)}
              aria-describedby={ciu.mensaje ? `${ciu.id}-error` : undefined}
              onChange={(e) => {
                setCiudad(e.target.value);
                ciu.onEditar();
              }}
            />
            <ErrorDelCampo id={`${ciu.id}-error`} mensaje={ciu.mensaje} />
          </div>
          <div className="w-44">
            <label htmlFor={tip.id} className="text-caption text-muted-foreground">
              Tipo
            </label>
            <Select
              value={tipoNuevo}
              onValueChange={(v) => {
                setTipoNuevo(v);
                tip.onEditar();
              }}
            >
              <SelectTrigger
                id={tip.id}
                aria-invalid={tip.mensaje ? true : undefined}
                aria-describedby={tip.mensaje ? `${tip.id}-error` : undefined}
                data-testid={`tipo-del-inmueble-${fila.id}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SIN_TIPO}>El que diga la dirección</SelectItem>
                {TIPOS_DE_INMUEBLE_FALTANTE.map((t) => (
                  <SelectItem key={t.valor} value={t.valor}>
                    {t.etiqueta}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ErrorDelCampo id={`${tip.id}-error`} mensaje={tip.mensaje} />
          </div>
          <Button
            size="sm"
            hideArrow
            className="mt-5"
            disabled={ocupado || !ciudad.trim()}
            onClick={() => {
              const el = document.getElementById(dir.id) as HTMLInputElement | null;
              void correr(async () => {
                const r = await contractsApi.migracion.crearInmueble(fila.id, {
                  address: el?.value?.trim() || direccion,
                  city: ciudad.trim(),
                  // Sólo si la persona lo eligió: si la dirección lo dice, manda
                  // la dirección; si no dice nada y no se eligió, el back pide
                  // el tipo bajo este campo (QA-MIG-A, MG-34).
                  ...(tipoNuevo !== SIN_TIPO ? { tipo: tipoNuevo } : {}),
                });
                // El recién creado tiene que aparecer en el desplegable de las
                // OTRAS filas; si no, alguien lo crearía por segunda vez.
                olvidarPortafolio();
                return r;
              });
            }}
          >
            Crear inmueble
          </Button>
        </div>
      ) : sePuedeCrear ? (
        <Button
          variant="ghost"
          size="sm"
          hideArrow
          onClick={() => setCreando(true)}
        >
          El inmueble no está cargado — crearlo
        </Button>
      ) : null}
    </div>
  );
}

/**
 * La salida de `inmueble_ocupado` (N11/§3.2.B4/J7). Antes de esto la fila
 * quedaba en un estado que `EXPLICACION` describía y el render no ofrecía
 * cómo resolver — exactamente el dead end que nace cuando `EXPLICACION` y el
 * `if` del render se editan por separado. Dos salidas, no una: reasignar el
 * inmueble (reusa `<ElegirInmueble>`, misma pantalla que resuelve `inmueble`/
 * `inmueble_ambiguo`) o aceptar explícitamente que ya está ocupado y seguir
 * igual — se persiste en `MigracionContrato.overrides`, nunca se pierde al
 * recargar.
 */
function InmuebleOcupado({
  fila,
  ocupado,
  correr,
  campo,
}: {
  fila: FilaDeMigracion;
  ocupado: boolean;
  correr: Correr;
  campo: (nombre: string) => PropsDelCampo;
}) {
  return (
    <div className="space-y-3">
      <ElegirInmueble fila={fila} ocupado={ocupado} correr={correr} campo={campo} elInmuebleExiste />
      <Button
        variant="outline"
        size="sm"
        hideArrow
        disabled={ocupado}
        onClick={() =>
          void correr(() =>
            contractsApi.migracion.resolver(fila.id, {
              permitirInmuebleOcupado: true,
            }),
          )
        }
      >
        Sé que está ocupado, seguir igual
      </Button>
    </div>
  );
}

function RegistrarPropietario({
  fila,
  ocupado,
  correr,
  campo,
}: {
  fila: FilaDeMigracion;
  ocupado: boolean;
  correr: Correr;
  campo: (nombre: string) => PropsDelCampo;
}) {
  const [nombre, setNombre] = useState("");
  const [documento, setDocumento] = useState("");
  const [comision, setComision] = useState(
    String(fila.datos.comisionPorcentaje ?? ""),
  );
  const cNombre = campo("nombre");
  const cDocumento = campo("documento");
  const cComision = campo("comisionPorcentaje");
  /** La comisión se ataja acá: el back sólo acepta de 0 a 100. */
  const [errorDeComision, setErrorDeComision] = useState<string | null>(null);
  const mensajeDeComision = errorDeComision ?? cComision.mensaje;
  const [correo, setCorreo] = useState<string | undefined>(undefined);
  const [telefono, setTelefono] = useState<string | undefined>(undefined);
  /*
   * Buscador sobre los propietarios que ya existen (los migrados en el paso
   * 1, por ejemplo): elegir uno llena nombre y documento, y el back enlaza
   * por documento en vez de crear un homónimo. Escribir a mano sigue valiendo.
   */
  const [busqueda, setBusqueda] = useState("");
  const [opciones, setOpciones] = useState<Propietario[]>([]);
  /*
   * Un fallo de la búsqueda NO puede parecer «no existe ese propietario»:
   * la persona escribiría el documento a mano y crearía un homónimo del que
   * ya está. Se dice que falló y que el camino manual sigue abierto.
   */
  const [fallaLaBusqueda, setFallaLaBusqueda] = useState(false);
  useEffect(() => {
    const q = busqueda.trim();
    if (q.length < 2) {
      setOpciones([]);
      setFallaLaBusqueda(false);
      return;
    }
    let vigente = true;
    const t = setTimeout(() => {
      propietariosApi
        .getAll({ search: q, limit: 8 })
        .then((r) => {
          if (vigente) {
            setOpciones(r);
            setFallaLaBusqueda(false);
          }
        })
        .catch(() => {
          if (vigente) {
            setOpciones([]);
            setFallaLaBusqueda(true);
          }
        });
    }, 250);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [busqueda]);
  const elegir = (p: Propietario) => {
    setNombre(p.name);
    setDocumento(p.documentNumber ?? '');
    setCorreo(p.email ?? undefined);
    setTelefono(p.phone ?? undefined);
    setBusqueda(p.name);
    setOpciones([]);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar un propietario que ya existe (nombre o documento)…"
          data-testid="buscar-propietario"
        />
        {opciones.length > 0 ? (
          <ul
            className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-border bg-surface shadow-md"
            data-testid="propietarios-encontrados"
          >
            {opciones.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => elegir(p)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-surface-muted"
                >
                  <span className="truncate">{p.name}</span>
                  <span className="shrink-0 font-mono text-caption text-fg-subtle">
                    {documentoParaMostrar(p.documentNumber)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {fallaLaBusqueda ? (
        <p className="text-caption text-warning" data-testid="busqueda-fallida">
          No pudimos buscar entre los que ya existen. Prueba de nuevo en un
          momento — si escribes el documento a mano, igual se enlaza al que ya
          está en vez de duplicarlo.
        </p>
      ) : null}
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-[160px] flex-1">
          <label htmlFor={cNombre.id} className="text-caption text-muted-foreground">
            Nombre del propietario
          </label>
          <Input
            id={cNombre.id}
            value={nombre}
            aria-invalid={cNombre.mensaje ? true : undefined}
            invalid={Boolean(cNombre.mensaje)}
            aria-describedby={cNombre.mensaje ? `${cNombre.id}-error` : undefined}
            onChange={(e) => {
              setNombre(e.target.value);
              cNombre.onEditar();
            }}
          />
          <ErrorDelCampo id={`${cNombre.id}-error`} mensaje={cNombre.mensaje} />
        </div>
        <div className="w-36">
          <label htmlFor={cDocumento.id} className="text-caption text-muted-foreground">
            Documento
          </label>
          <Input
            id={cDocumento.id}
            value={documento}
            aria-invalid={cDocumento.mensaje ? true : undefined}
            invalid={Boolean(cDocumento.mensaje)}
            aria-describedby={cDocumento.mensaje ? `${cDocumento.id}-error` : undefined}
            onChange={(e) => {
              setDocumento(e.target.value);
              cDocumento.onEditar();
            }}
          />
          <ErrorDelCampo id={`${cDocumento.id}-error`} mensaje={cDocumento.mensaje} />
        </div>
        <div className="w-28">
          <label htmlFor={cComision.id} className="text-caption text-muted-foreground">
            Comisión %
          </label>
          <Input
            id={cComision.id}
            type="number"
            value={comision}
            aria-invalid={mensajeDeComision ? true : undefined}
            invalid={Boolean(mensajeDeComision)}
            aria-describedby={mensajeDeComision ? `${cComision.id}-error` : undefined}
            onChange={(e) => {
              setComision(e.target.value);
              setErrorDeComision(null);
              cComision.onEditar();
            }}
          />
          <ErrorDelCampo id={`${cComision.id}-error`} mensaje={mensajeDeComision} />
        </div>
        <Button
          size="sm"
          hideArrow
          className="mt-5"
          disabled={ocupado || !nombre.trim() || !documento.trim()}
          onClick={() => {
            const m = errorDeLaComision(comision);
            if (m) {
              setErrorDeComision(m);
              document.getElementById(cComision.id)?.focus();
              return;
            }
            void correr(() =>
              contractsApi.migracion.registrarPropietario(fila.id, {
                nombre: nombre.trim(),
                documento: documento.trim(),
                correo,
                telefono,
                // Vacío no viaja; un 0 escrito sí: el 0 % es una comisión real.
                comisionPorcentaje: comision.trim() ? Number(comision) : undefined,
              }),
            );
          }}
        >
          Registrar y consignar
        </Button>
      </div>
    </div>
  );
}

function Fechas({
  fila,
  ocupado,
  correr,
  campo,
}: {
  fila: FilaDeMigracion;
  ocupado: boolean;
  correr: Correr;
  campo: (nombre: string) => PropsDelCampo;
}) {
  const [inicio, setInicio] = useState(
    fila.datos.startDate?.slice(0, 10) ?? "",
  );
  const [fin, setFin] = useState(fila.datos.endDate?.slice(0, 10) ?? "");
  const cInicio = campo("startDate");
  const cFin = campo("endDate");
  /** Lo que se ataja antes de mandar: el rango del back y el orden de las dos. */
  const [locales, setLocales] = useState<Partial<Record<"startDate" | "endDate", string>>>({});
  const mensajeDeInicio = locales.startDate ?? cInicio.mensaje;
  const mensajeDeFin = locales.endDate ?? cFin.mensaje;
  return (
    <div className="flex flex-wrap items-start gap-2">
      <div>
        <label htmlFor={cInicio.id} className="text-caption text-muted-foreground">
          Inicio
        </label>
        <CampoDeDia
          id={cInicio.id}
          value={inicio}
          onChange={(v) => {
            setInicio(v);
            setLocales({});
            cInicio.onEditar();
          }}
          invalido={Boolean(Boolean(mensajeDeInicio))}
          describedBy={mensajeDeInicio ? `${cInicio.id}-error` : undefined}
        />
        <ErrorDelCampo id={`${cInicio.id}-error`} mensaje={mensajeDeInicio} />
      </div>
      <div>
        <label htmlFor={cFin.id} className="text-caption text-muted-foreground">
          Fin
        </label>
        <CampoDeDia
          id={cFin.id}
          value={fin}
          onChange={(v) => {
            setFin(v);
            setLocales({});
            cFin.onEditar();
          }}
          invalido={Boolean(Boolean(mensajeDeFin))}
          describedBy={mensajeDeFin ? `${cFin.id}-error` : undefined}
        />
        <ErrorDelCampo id={`${cFin.id}-error`} mensaje={mensajeDeFin} />
      </div>
      <Button
        size="sm"
        hideArrow
        className="mt-5"
        disabled={ocupado || !inicio || !fin}
        onClick={() => {
          const errores = erroresDeLasFechas(inicio, fin);
          if (errores.startDate || errores.endDate) {
            setLocales(errores);
            document
              .getElementById(errores.startDate ? cInicio.id : cFin.id)
              ?.focus();
            return;
          }
          void correr(() =>
            contractsApi.migracion.resolver(fila.id, {
              startDate: inicio,
              endDate: fin,
            }),
          );
        }}
      >
        Guardar
      </Button>
    </div>
  );
}

/**
 * Corregir el documento del inquilino, o quitarlo.
 *
 * Son dos salidas y no una: el archivo pudo traer la cédula equivocada (se
 * corrige), o pudo traer una que de verdad es de otra persona con cuenta y el
 * inquilino no tiene documento conocido (se vacía, y la fila vuelve a
 * resolverse por correo, como siempre).
 */
function DocumentoDelInquilino({
  fila,
  ocupado,
  correr,
  campo,
}: {
  fila: FilaDeMigracion;
  ocupado: boolean;
  correr: Correr;
  campo: (nombre: string) => PropsDelCampo;
}) {
  return (
    <div className="space-y-2">
      <CampoSimple
        {...campo("inquilinoDocumento")}
        icono={User}
        etiqueta="Documento del inquilino"
        ocupado={ocupado}
        onGuardar={(v) =>
          correr(() =>
            contractsApi.migracion.resolver(fila.id, {
              inquilinoDocumento: v,
            }),
          )
        }
      />
      <Button
        variant="ghost"
        size="sm"
        hideArrow
        disabled={ocupado}
        data-testid="quitar-documento-inquilino"
        onClick={() =>
          void correr(() =>
            contractsApi.migracion.resolver(fila.id, {
              inquilinoDocumento: "",
            }),
          )
        }
      >
        Quitar el documento y resolver por correo
      </Button>
    </div>
  );
}

/** Pesos enteros desde lo que se teclea («2.558.800», «2558800»); `null` si no es un monto. */
function pesosDeTexto(texto: string): number | null {
  const limpio = texto.replace(/[\s.$]/g, "");
  if (!/^\d+$/.test(limpio)) return null;
  const n = Number(limpio);
  return Number.isSafeInteger(n) ? n : null;
}

/** Reparte `canon` en `n` partes enteras; el resto de pesos va al primer dueño. */
export function partesIguales(canon: number, n: number): number[] {
  const base = Math.floor(canon / n);
  const resto = canon - base * n;
  return Array.from({ length: n }, (_, i) => (i === 0 ? base + resto : base));
}

/**
 * Corregir la plata por dueño en la app. Un campo por dueño, con lo que dijo el
 * archivo de punto de partida; sólo se guarda cuando la suma es EXACTAMENTE el
 * canon de la fila (que no se toca). Un dueño en $0 sale del reparto.
 */
function RepartoEditable({
  fila,
  ocupado,
  correr,
}: {
  fila: FilaDeMigracion;
  ocupado: boolean;
  correr: (a: () => Promise<FilaDeMigracion>) => Promise<void>;
}) {
  const duenos = fila.asociacion?.propietario?.reparto?.duenos ?? [];
  const canon = fila.datos.monthlyRent;
  const [valores, setValores] = useState<string[]>(() =>
    duenos.map((d) => (typeof d.canon === "number" ? String(d.canon) : "")),
  );

  if (duenos.length < 2 || !canon || canon <= 0)
    return (
      <p className="text-caption text-warning" data-testid="reparto-sin-lista">
        Esta fila no trae la lista de dueños para repartir acá. Corrige «Valor Canon» en el archivo y
        súbelo de nuevo, o quita esa columna del mapeo: el contrato entra sin el porcentaje de cada
        dueño y lo pones en el mandato. Después pulsa «Volver a cruzar con lo ya cargado».
      </p>
    );

  const montos = valores.map(pesosDeTexto);
  const completo = montos.every((m) => m !== null);
  const suma = montos.reduce<number>((a, m) => a + (m ?? 0), 0);
  const diferencia = canon - suma;
  const cuadra = completo && diferencia === 0;
  const nombreDe = (i: number) =>
    duenos[i].nombre || duenos[i].documento || `Dueño ${i + 1}`;

  return (
    <div className="space-y-2" data-testid="editor-de-reparto">
      <div className="space-y-1.5">
        {duenos.map((d, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <label
              className="min-w-[160px] flex-1 text-caption text-muted-foreground"
              htmlFor={`reparto-${fila.id}-${i}`}
            >
              {nombreDe(i)}
            </label>
            <Input
              id={`reparto-${fila.id}-${i}`}
              inputMode="numeric"
              className="max-w-[180px]"
              value={valores[i] ?? ""}
              disabled={ocupado}
              data-testid={`reparto-dueno-${i}`}
              onChange={(e) =>
                setValores((v) => v.map((x, j) => (j === i ? e.target.value : x)))
              }
            />
          </div>
        ))}
      </div>

      <p
        className={`text-caption ${cuadra ? "text-foreground" : "text-warning"}`}
        data-testid="reparto-suma"
      >
        Suma {formatCurrency(suma)} de {formatCurrency(canon)}
        {!completo
          ? " — escribe un monto entero en cada dueño."
          : diferencia > 0
            ? ` — faltan ${formatCurrency(diferencia)}.`
            : diferencia < 0
              ? ` — sobran ${formatCurrency(-diferencia)}.`
              : " — cuadra."}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          hideArrow
          disabled={ocupado}
          data-testid="reparto-partes-iguales"
          onClick={() =>
            setValores(partesIguales(canon, duenos.length).map(String))
          }
        >
          Partes iguales
        </Button>
        {duenos.map((_, i) => (
          <Button
            key={i}
            variant="outline"
            size="sm"
            hideArrow
            disabled={ocupado}
            data-testid={`reparto-todo-a-${i}`}
            onClick={() =>
              setValores(duenos.map((__, j) => (j === i ? String(canon) : "0")))
            }
          >
            Todo a {nombreDe(i)}
          </Button>
        ))}
        <Button
          size="sm"
          hideArrow
          disabled={ocupado || !cuadra}
          data-testid="reparto-guardar"
          onClick={() =>
            void correr(() =>
              contractsApi.migracion.corregirReparto(
                fila.id,
                montos as number[],
              ),
            )
          }
        >
          Guardar reparto
        </Button>
      </div>
      <p className="text-caption text-muted-foreground">
        Un dueño en $0 sale del reparto de este contrato.
      </p>
    </div>
  );
}

/**
 * El uso del inmueble, con su error debajo si el back lo rechazó.
 */
function UsoDelInmueble({
  id,
  mensaje,
  onEditar,
  ocupado,
  onElegir,
}: PropsDelCampo & {
  ocupado: boolean;
  onElegir: (v: "VIVIENDA" | "COMERCIAL") => void;
}) {
  return (
    <div className="max-w-xs">
      <Select
        disabled={ocupado}
        onValueChange={(v) => {
          onEditar();
          onElegir(v as "VIVIENDA" | "COMERCIAL");
        }}
      >
        <SelectTrigger
          id={id}
          aria-invalid={mensaje ? true : undefined}
          aria-describedby={mensaje ? `${id}-error` : undefined}
        >
          <SelectValue placeholder="Elige el uso" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="VIVIENDA">Vivienda</SelectItem>
          <SelectItem value="COMERCIAL">Comercial</SelectItem>
        </SelectContent>
      </Select>
      <ErrorDelCampo id={`${id}-error`} mensaje={mensaje} />
    </div>
  );
}

/**
 * Un campo con su botón de guardar. El error —el del cliente (`validar`, con
 * los mismos topes y frases del back) o el que mandó el back en `campos`— va
 * DEBAJO del campo con `ErrorDelCampo`, y el campo queda `aria-invalid`.
 */
function CampoSimple({
  id,
  mensaje,
  onEditar,
  icono: Icono,
  etiqueta,
  tipo = "text",
  ocupado,
  validar,
  onGuardar,
}: PropsDelCampo & {
  icono?: React.ComponentType<{ className?: string }>;
  etiqueta: string;
  tipo?: string;
  ocupado: boolean;
  /** El error del cliente para este valor, o `null` si se puede mandar. */
  validar?: (v: string) => string | null;
  onGuardar: (v: string) => void;
}) {
  const [valor, setValor] = useState("");
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const campoRef = useRef<HTMLInputElement>(null);
  const error = errorLocal ?? mensaje;
  return (
    <div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1">
          <label
            htmlFor={id}
            className="flex items-center gap-1.5 text-caption text-muted-foreground"
          >
            {Icono ? <Icono className="h-3.5 w-3.5" /> : null}
            {etiqueta}
          </label>
          <Input
            ref={campoRef}
            id={id}
            type={tipo}
            value={valor}
            aria-invalid={error ? true : undefined}
            invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined}
            onChange={(e) => {
              setValor(e.target.value);
              setErrorLocal(null);
              onEditar();
            }}
          />
        </div>
        <Button
          size="sm"
          hideArrow
          disabled={ocupado || !valor.trim()}
          onClick={() => {
            const v = valor.trim();
            const m = validar?.(v) ?? null;
            if (m) {
              setErrorLocal(m);
              campoRef.current?.focus();
              return;
            }
            onGuardar(v);
          }}
        >
          Guardar
        </Button>
      </div>
      <ErrorDelCampo id={`${id}-error`} mensaje={error} />
    </div>
  );
}
