"use client";

/**
 * FaltantesDeFila — qué le falta a una fila, y qué se hace para resolverlo.
 *
 * Cada faltante tiene su propia salida. Decir "falta algo" y ofrecer un solo
 * botón obligaría a adivinar; lo que hay que hacer para conseguir un inmueble
 * que no existe no se parece en nada a corregir un correo mal escrito.
 */

import { useState, useEffect } from "react";
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
import { propietariosApi } from "@/lib/api/inmobiliaria.service";
import type { Propietario } from "@/lib/types/inmobiliaria";

/** El nombre humano de cada faltante, y por qué importa. */
export const EXPLICACION: Record<string, { titulo: string; porque: string }> = {
  inmueble: {
    titulo: "No encontramos el inmueble",
    porque:
      "La dirección del archivo no coincide con ninguno de tu portafolio. No es obligatorio: podés migrar el contrato igual, sin inmueble.",
  },
  inmueble_ambiguo: {
    titulo: "Hay más de un inmueble con esa dirección",
    porque:
      "Elegir por vos pegaría el contrato al inmueble equivocado, y quedaría perfecto.",
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
  inquilino_correo: {
    titulo: "Falta el correo del inquilino",
    porque:
      "Sin correo no hay a quién invitar ni cómo distinguirlo de un homónimo.",
  },
  inquilino_nombre: { titulo: "Falta el nombre del inquilino", porque: "" },
  fechas: {
    titulo: "Las fechas no cuadran",
    porque: "La de fin no es posterior a la de inicio.",
  },
  canon: {
    titulo: "El canon está en cero",
    porque: "Un contrato que no cobra nada.",
  },
  uso: {
    titulo: "Falta el uso del inmueble",
    porque: "Decide el IVA: vivienda está excluida y comercial no.",
  },
  dia_de_pago: {
    titulo: "Falta el día de pago",
    porque:
      "Sin él no se puede programar el cobro ni los recordatorios de vencimiento.",
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
    inquilino?: { nombre?: unknown; correo?: unknown };
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
    case 'inquilino_correo':
      return texto(datos?.inquilino?.correo);
    case 'inquilino_nombre':
      return texto(datos?.inquilino?.nombre);
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
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function correr(accion: () => Promise<FilaDeMigracion>) {
    setOcupado(true);
    setError(null);
    try {
      onResuelta(await accion());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="space-y-3">
      {fila.faltantes
        .filter((f) => !omitir?.includes(f))
        .map((f) => (
        <div key={f} className="rounded-lg border border-border p-3">
          <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Warning className="h-4 w-4 text-warning" />
            {EXPLICACION[f]?.titulo ?? f}
          </p>
          {EXPLICACION[f]?.porque ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {EXPLICACION[f].porque}
            </p>
          ) : null}
          {celdaDelFaltante(fila, f) ? (
            <p
              className="mt-1 text-xs text-muted-foreground"
              data-testid={`celda-de-${f}`}
            >
              El archivo dice:{" "}
              <span className="font-medium text-foreground">
                «{celdaDelFaltante(fila, f)}»
              </span>
            </p>
          ) : null}

          <div className="mt-3">
            {f === "inmueble" || f === "inmueble_ambiguo" ? (
              <ElegirInmueble fila={fila} ocupado={ocupado} correr={correr} />
            ) : null}
            {f === "inmueble_ocupado" ? (
              <InmuebleOcupado fila={fila} ocupado={ocupado} correr={correr} />
            ) : null}
            {f === "propietario" ? (
              <RegistrarPropietario
                fila={fila}
                ocupado={ocupado}
                correr={correr}
              />
            ) : null}
            {f === "inquilino_correo" ? (
              <CampoSimple
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
            {f === "uso" ? (
              <Select
                onValueChange={(v) =>
                  void correr(() =>
                    contractsApi.migracion.resolver(fila.id, {
                      usoInmueble: v as "VIVIENDA" | "COMERCIAL",
                    }),
                  )
                }
              >
                <SelectTrigger className="max-w-xs">
                  <SelectValue placeholder="Elegí el uso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIVIENDA">Vivienda</SelectItem>
                  <SelectItem value="COMERCIAL">Comercial</SelectItem>
                </SelectContent>
              </Select>
            ) : null}
            {f === "canon" ? (
              <CampoSimple
                etiqueta="Canon mensual"
                tipo="number"
                ocupado={ocupado}
                onGuardar={(v) =>
                  correr(() =>
                    contractsApi.migracion.resolver(fila.id, {
                      monthlyRent: Number(v) || 0,
                    }),
                  )
                }
              />
            ) : null}
            {f === "fechas" ? (
              <Fechas fila={fila} ocupado={ocupado} correr={correr} />
            ) : null}
            {f === "dia_de_pago" ? (
              <CampoSimple
                etiqueta="Día de pago (1-28)"
                tipo="number"
                ocupado={ocupado}
                onGuardar={(v) => {
                  const dia = Number(v);
                  if (!Number.isFinite(dia) || dia < 1 || dia > 28) return;
                  correr(() =>
                    contractsApi.migracion.resolver(fila.id, {
                      paymentDay: dia,
                    }),
                  );
                }}
              />
            ) : null}
          </div>
        </div>
      ))}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function ElegirInmueble({
  fila,
  ocupado,
  correr,
}: {
  fila: FilaDeMigracion;
  ocupado: boolean;
  correr: (a: () => Promise<FilaDeMigracion>) => Promise<void>;
}) {
  const [creando, setCreando] = useState(false);
  const [ciudad, setCiudad] = useState("");
  const direccion = fila.datos.direccion ?? "";

  return (
    <div className="space-y-3">
      {/*
       * T-0033 §3.2.C2/E4 — el checklist ya no bloquea la activación (§3.2.C2):
       * la fila igual se activa sin inmueble si el usuario presiona Activar
       * sin resolver esto. Sin esta nota, el componente lee como "tenés que
       * resolver esto sí o sí", que ahora es falso. No hay tercer botón: es
       * puramente informativo.
       */}
      <p className="text-xs text-muted-foreground">
        No hace falta resolver esto para migrar el contrato: si lo dejás así, se
        va a activar igual y va a decir «Sin inmueble».
      </p>
      {fila.candidatos.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">
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

      {creando ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[180px] flex-1">
            <label className="text-xs text-muted-foreground">Dirección</label>
            <Input defaultValue={direccion} id={`dir-${fila.id}`} />
          </div>
          <div className="w-40">
            <label className="text-xs text-muted-foreground">Ciudad</label>
            <Input value={ciudad} onChange={(e) => setCiudad(e.target.value)} />
          </div>
          <Button
            size="sm"
            hideArrow
            disabled={ocupado || !ciudad.trim()}
            onClick={() => {
              const el = document.getElementById(
                `dir-${fila.id}`,
              ) as HTMLInputElement | null;
              void correr(() =>
                contractsApi.migracion.crearInmueble(fila.id, {
                  address: el?.value?.trim() || direccion,
                  city: ciudad.trim(),
                }),
              );
            }}
          >
            Crear inmueble
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          hideArrow
          onClick={() => setCreando(true)}
        >
          El inmueble no está cargado — crearlo
        </Button>
      )}
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
}: {
  fila: FilaDeMigracion;
  ocupado: boolean;
  correr: (a: () => Promise<FilaDeMigracion>) => Promise<void>;
}) {
  return (
    <div className="space-y-3">
      <ElegirInmueble fila={fila} ocupado={ocupado} correr={correr} />
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
}: {
  fila: FilaDeMigracion;
  ocupado: boolean;
  correr: (a: () => Promise<FilaDeMigracion>) => Promise<void>;
}) {
  const [nombre, setNombre] = useState("");
  const [documento, setDocumento] = useState("");
  const [comision, setComision] = useState(
    String(fila.datos.comisionPorcentaje ?? ""),
  );
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
    setDocumento(p.documentNumber);
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
                  <span className="shrink-0 font-mono text-xs text-fg-subtle">
                    {p.documentNumber}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {fallaLaBusqueda ? (
        <p className="text-xs text-warning" data-testid="busqueda-fallida">
          No pudimos buscar entre los que ya existen. Probá de nuevo en un
          momento — si escribís el documento a mano, igual se enlaza al que ya
          está en vez de duplicarlo.
        </p>
      ) : null}
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[160px] flex-1">
          <label className="text-xs text-muted-foreground">
            Nombre del propietario
          </label>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className="w-36">
          <label className="text-xs text-muted-foreground">Documento</label>
          <Input
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
          />
        </div>
        <div className="w-24">
          <label className="text-xs text-muted-foreground">Comisión %</label>
          <Input
            type="number"
            value={comision}
            onChange={(e) => setComision(e.target.value)}
          />
        </div>
        <Button
          size="sm"
          hideArrow
          disabled={ocupado || !nombre.trim() || !documento.trim()}
          onClick={() =>
            void correr(() =>
              contractsApi.migracion.registrarPropietario(fila.id, {
                nombre: nombre.trim(),
                documento: documento.trim(),
                correo,
                telefono,
                comisionPorcentaje: Number(comision) || undefined,
              }),
            )
          }
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
}: {
  fila: FilaDeMigracion;
  ocupado: boolean;
  correr: (a: () => Promise<FilaDeMigracion>) => Promise<void>;
}) {
  const [inicio, setInicio] = useState(
    fila.datos.startDate?.slice(0, 10) ?? "",
  );
  const [fin, setFin] = useState(fila.datos.endDate?.slice(0, 10) ?? "");
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div>
        <label className="text-xs text-muted-foreground">Inicio</label>
        <Input
          type="date"
          value={inicio}
          onChange={(e) => setInicio(e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Fin</label>
        <Input
          type="date"
          value={fin}
          onChange={(e) => setFin(e.target.value)}
        />
      </div>
      <Button
        size="sm"
        hideArrow
        disabled={ocupado || !inicio || !fin}
        onClick={() =>
          void correr(() =>
            contractsApi.migracion.resolver(fila.id, {
              startDate: inicio,
              endDate: fin,
            }),
          )
        }
      >
        Guardar
      </Button>
    </div>
  );
}

function CampoSimple({
  icono: Icono,
  etiqueta,
  tipo = "text",
  ocupado,
  onGuardar,
}: {
  icono?: React.ComponentType<{ className?: string }>;
  etiqueta: string;
  tipo?: string;
  ocupado: boolean;
  onGuardar: (v: string) => void;
}) {
  const [valor, setValor] = useState("");
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-[200px] flex-1">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {Icono ? <Icono className="h-3.5 w-3.5" /> : null}
          {etiqueta}
        </label>
        <Input
          type={tipo}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
      </div>
      <Button
        size="sm"
        hideArrow
        disabled={ocupado || !valor.trim()}
        onClick={() => onGuardar(valor.trim())}
      >
        Guardar
      </Button>
    </div>
  );
}
