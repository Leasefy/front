"use client";

/**
 * Los incrementos del canon del contrato y su carta (Nico, 17-09).
 *
 *   · Vivienda sube SOLA al 100 % del IPC del año anterior desde el aniversario.
 *   · Local comercial: el funcionario digita el incremento de un año, o la tasa
 *     pactada para cada año.
 *   · El canon sube SIEMPRE, aunque la carta no se haya enviado.
 *   · 🔴 D6 (17-09 ~03:10): la carta se genera SOLA N días antes del aniversario
 *     (30 por defecto) y se envía con UN clic (el clic es la revisión). Sólo un
 *     correo que salió deja constancia; si no se puede por correo, se registra
 *     la constancia de otro medio. Sin constancia al llegar el aniversario:
 *     alerta roja.
 *
 * La regla vive en el back (`incrementos-del-contrato.ts`): acá no se calcula
 * ningún canon, sólo se muestra y se digita.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import {
  cicloDeVidaApi,
  type AniversarioDelContrato,
  type IncrementosDelContrato as Incrementos,
} from "@/lib/api/ciclo-de-vida.service";
import { ErrorDelCampo } from "@/components/estado/ErrorDelCampo";
import { mensajeParaLaPersona } from "@/lib/errores/traductor-de-errores";
import { repartirErroresDelServidor } from "@/lib/errores/errores-en-el-formulario";
import { errorDelPorcentajeDelIncremento } from "@/lib/contratos/limites-del-contrato-vigente";
import { plataEnPantalla } from "@/lib/plata/escribir-plata";
import { diaLegible } from '@/lib/mandato/textos';
import { CampoDeDia } from "@/components/contabilidad/CampoDeDia";
import { localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras';
import {
  CartaDelIncrementoCajon,
  type CartaQueSeAbre,
} from "@/components/contratos/CartaDelIncrementoCajon";

const PESOS = plataEnPantalla(localeDeLasCifras, {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const ORIGEN: Record<string, string> = {
  IPC: "IPC del año anterior (vivienda)",
  DIGITADO: "Digitado para este año",
  TASA_PACTADA: "Tasa pactada",
  RENOVACION: "Renovación",
};

const CARTA: Record<string, string> = {
  PENDIENTE_DE_REVISION: "Carta por revisar",
  REVISADA: "Carta revisada",
  ENVIADA: "Carta enviada",
};

function numeroOVacio(texto: string): number | null {
  const limpio = texto.replace(",", ".").trim();
  if (limpio === "") return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

/** Lo que el back rechazó de cada campo, por el nombre del campo en su DTO. */
type ErroresDelServidor = Partial<Record<string, string>>;

/**
 * El foco al primer campo con error, cuando ya se puede: mientras guarda, la
 * sección está apagada (`ocupado`) y algunos campos ni se dibujan; `focus()`
 * sobre uno así no hace nada. Se aplica después del render en que vuelve.
 */
function useFocoAlPrimerError() {
  const pendientes = useRef<string[] | null>(null);
  useEffect(() => {
    if (!pendientes.current) return;
    for (const id of pendientes.current) {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (!el) continue;
      if (el.disabled) return;
      el.focus();
      pendientes.current = null;
      return;
    }
  });
  return (ids: string[]) => {
    pendientes.current = ids.length ? ids : null;
  };
}

export function IncrementosDelContrato({
  contractId,
  puedeEditar,
}: {
  contractId: string;
  puedeEditar: boolean;
}) {
  const [datos, setDatos] = useState<Incrementos | null>(null);
  const [fallo, setFallo] = useState(false);
  const [tasa, setTasa] = useState("");
  const [errorDeLaTasa, setErrorDeLaTasa] = useState<string | undefined>(undefined);
  const enfocar = useFocoAlPrimerError();
  const [ocupado, setOcupado] = useState(false);
  // 🔴 19-10-2026: la carta se ve en su cajón antes de salir, y una enviada se abre igual.
  const [cartaAbierta, setCartaAbierta] = useState<CartaQueSeAbre | null>(null);

  const cargar = useCallback(async () => {
    try {
      const r = await cicloDeVidaApi.incrementos(contractId);
      setDatos(r);
      setTasa(r.tasaAnualPactadaPct != null ? String(r.tasaAnualPactadaPct) : "");
      setFallo(false);
    } catch {
      setFallo(true);
    }
  }, [contractId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /**
   * Guarda y devuelve lo que el back rechazó POR CAMPO (para pintarlo debajo
   * de su campo). Al toast va SÓLO lo que no tiene campo: un 409, un 5xx con su
   * referencia o la red, por el traductor.
   */
  const accion = async (
    hacer: () => Promise<Incrementos>,
    exito: string,
    queSeHacia: string,
    campos: readonly string[] = [],
  ): Promise<ErroresDelServidor> => {
    setOcupado(true);
    try {
      const r = await hacer();
      setDatos(r);
      if (r.ultimoEnvio?.resultado === 'SIMULADA') {
        toast.error('La carta no salió.', { description: r.ultimoEnvio.mensaje });
      } else {
        toast.success(r.ultimoEnvio?.mensaje ?? exito);
      }
      return {};
    } catch (err) {
      const { porCampo, sueltos } = repartirErroresDelServidor(err, {
        campos,
        porDefecto: `No pudimos ${queSeHacia}.`,
        accion: queSeHacia,
      });
      if (sueltos.length) toast.error("No se pudo guardar.", { description: sueltos.join(" · ") });
      return porCampo;
    } finally {
      setOcupado(false);
    }
  };

  if (fallo) {
    return (
      <section className="rounded-lg border border-border p-4 text-sm text-muted-foreground" data-testid="incrementos-del-contrato">
        No se pudieron traer los incrementos del canon.{" "}
        <button type="button" className="underline" onClick={() => void cargar()}>
          Reintentar
        </button>
      </section>
    );
  }
  if (!datos) return null;

  const comercial = datos.uso === "COMERCIAL";
  const editable = puedeEditar && datos.disponible && !ocupado;
  // Sólo un contrato que parte el mes lo prorratea (19-10-2026: la ficha decía
  // «se cobra prorrateado» a todos; uno fecha a fecha empieza el período ese día).
  const prorrateo = datos.prorrateaElMes ? " El mes del aniversario se cobra prorrateado." : "";

  return (
    <section className="space-y-3 rounded-lg border border-border p-4" data-testid="incrementos-del-contrato">
      <div>
        <h3 className="text-sm font-medium">Incrementos del canon</h3>
        <p className="text-caption text-muted-foreground">
          {datos.uso === "VIVIENDA"
            ? `Vivienda: sube sola al 100 % del IPC del año anterior en cada aniversario.${prorrateo}`
            : comercial
              ? `Local comercial: digita el incremento de un año o la tasa pactada para cada año.${prorrateo}`
              : "El contrato no dice si es vivienda o local comercial: define el uso para saber cómo sube."}{" "}
          El canon sube aunque la carta no se haya enviado.
        </p>
        {!datos.disponible && (
          <p className="mt-1 text-caption text-warning-700 dark:text-warning-100">
            Falta una actualización de la base: todavía no se puede digitar ni generar cartas.
          </p>
        )}
        <p className="mt-1 text-caption text-muted-foreground">
          La carta aparece sola {datos.diasAntesDeLaCarta ?? 30} días antes del aniversario. Antes de enviarla se
          ve tal como le llega al inquilino.
        </p>
        {datos.correoSaleDeVerdad === false && (
          <p className="mt-1 text-caption text-warning-700 dark:text-warning-100" data-testid="correo-simulado">
            El correo está apagado en esta copia de pruebas de Leasefy: enviar la carta no le llega a nadie ni deja constancia. En producción sí se manda.
          </p>
        )}
      </div>

      {comercial && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-caption" htmlFor="tasa-pactada">
            Tasa pactada para cada año (%)
            <Input
              id="tasa-pactada"
              inputMode="decimal"
              value={tasa}
              onChange={(e) => {
                setTasa(e.target.value);
                setErrorDeLaTasa(undefined);
              }}
              disabled={!editable}
              data-testid="tasa-pactada"
              className="mt-1 w-32"
              aria-invalid={errorDeLaTasa ? true : undefined}
              aria-describedby="tasa-pactada-error"
            />
          </label>
          <Button
            size="sm"
            variant="outline"
            disabled={!editable}
            onClick={() =>
              void (async () => {
                // Los topes del back, antes de mandar y con su frase (02-10-2026).
                const local = errorDelPorcentajeDelIncremento(tasa, "tasaPactada");
                if (local) {
                  setErrorDeLaTasa(local);
                  enfocar(["tasa-pactada"]);
                  return;
                }
                const delServidor = await accion(
                  () => cicloDeVidaApi.fijarTasaAnual(contractId, numeroOVacio(tasa)),
                  "Tasa pactada guardada. La tabla se recalcula.",
                  "guardar la tasa pactada",
                  ["porcentaje"],
                );
                setErrorDeLaTasa(delServidor.porcentaje);
                if (delServidor.porcentaje) enfocar(["tasa-pactada"]);
              })()
            }
          >
            Guardar tasa
          </Button>
          <ErrorDelCampo id="tasa-pactada-error" mensaje={errorDeLaTasa} className="w-full" />
        </div>
      )}

      {datos.aniversarios.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay aniversarios dentro del contrato.</p>
      ) : (
        <ul className="divide-y divide-border">
          {datos.aniversarios.map((a) => (
            <Aniversario
              key={a.desde}
              a={a}
              comercial={comercial}
              editable={editable}
              envioHabilitado={datos.envioHabilitado}
              onDigitar={(body) =>
                accion(
                  () => cicloDeVidaApi.digitarIncremento(contractId, a.desde, body),
                  "Incremento guardado. La tabla se recalcula.",
                  "guardar el incremento",
                  ["porcentaje", "canonNuevoCop"],
                )
              }
              onAbrirCarta={() =>
                setCartaAbierta({
                  contractId,
                  desde: a.desde,
                  titulo: `Aniversario del ${diaLegible(a.desde)}`,
                })
              }
              onVerSoporte={() =>
                void (async () => {
                  try {
                    const { url } = await cicloDeVidaApi.soporteDeLaConstancia(contractId, a.desde);
                    window.open(url, "_blank", "noopener,noreferrer");
                  } catch (e) {
                    toast.error("No se pudo abrir el soporte.", {
                      description: mensajeParaLaPersona(e, {
                        porDefecto: "No pudimos abrir el soporte.",
                        accion: "abrir el soporte",
                      }),
                    });
                  }
                })()
              }
              onConstancia={(body) =>
                accion(
                  () => cicloDeVidaApi.registrarConstancia(contractId, a.desde, body),
                  "Constancia registrada: la carta queda enviada.",
                  "registrar la constancia",
                  ["medio", "fecha", "nota"],
                )
              }
            />
          ))}
        </ul>
      )}

      <CartaDelIncrementoCajon
        carta={cartaAbierta}
        onCerrar={() => setCartaAbierta(null)}
        puedeEnviar={puedeEditar && datos.disponible}
        onEnviada={cargar}
      />
    </section>
  );
}

const MEDIO: Record<string, string> = {
  CORREO: "por correo",
  FISICO: "en físico",
  WHATSAPP: "por WhatsApp",
  OTRO: "por otro medio",
};

function Aniversario({
  a,
  comercial,
  editable,
  envioHabilitado,
  onDigitar,
  onAbrirCarta,
  onConstancia,
  onVerSoporte,
}: {
  a: AniversarioDelContrato;
  comercial: boolean;
  editable: boolean;
  envioHabilitado: boolean;
  onDigitar: (body: { porcentaje?: number | null; canonNuevoCop?: number | null }) => Promise<ErroresDelServidor>;
  /**
   * Abre el cajón de la carta: ahí se ve tal como sale, se corrige y se envía
   * (19-10-2026: «Ver y editar» en la ficha sobraba al lado del cajón).
   */
  onAbrirCarta: () => void;
  onConstancia: (body: {
    medio: "FISICO" | "WHATSAPP" | "OTRO";
    fecha: string;
    nota: string;
    /** 🔴 OPCIONAL (Nico, 17-09): la constancia vale igual sin adjunto. */
    soporte?: File | null;
  }) => Promise<ErroresDelServidor>;
  onVerSoporte: () => void;
}) {
  // Lo que el back rechazó de un campo de ESTE aniversario va debajo de él.
  const [errores, setErrores] = useState<ErroresDelServidor>({});
  const ids = {
    porcentaje: `incremento-${a.desde}`,
    fecha: `constancia-fecha-${a.desde}`,
    nota: `constancia-nota-${a.desde}`,
    medio: `constancia-medio-${a.desde}`,
  } as const;
  const enfocar = useFocoAlPrimerError();
  const pintar = (delServidor: ErroresDelServidor) => {
    setErrores(delServidor);
    const campos = (Object.keys(ids) as (keyof typeof ids)[]).filter(
      (c) => delServidor[c] || (c === "porcentaje" && delServidor.canonNuevoCop),
    );
    enfocar(campos.map((c) => ids[c]));
  };
  const limpiar = (campo: keyof typeof ids) =>
    setErrores((prev) => (prev[campo] ? { ...prev, [campo]: undefined } : prev));
  const [porcentaje, setPorcentaje] = useState("");
  const [constancia, setConstancia] = useState(false);
  const [medio, setMedio] = useState<"FISICO" | "WHATSAPP" | "OTRO">("FISICO");
  const [fecha, setFecha] = useState("");
  const [nota, setNota] = useState("");
  const [soporte, setSoporte] = useState<File | null>(null);
  const sube = a.origen !== null && a.canonNuevoCop !== a.canonAnteriorCop;
  const enviada = a.carta?.estado === "ENVIADA";
  const enVentana =
    a.bandeja?.estado === "POR_ENVIAR" || a.bandeja?.estado === "VENCIDA_SIN_CONSTANCIA";

  return (
    <li className="space-y-2 py-3 text-sm" data-testid={`aniversario-${a.desde}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        {/* QA-CONT-95 (C-10): la fecha larga de la casa, nunca el ISO crudo. */}
        <span className="font-medium">Desde el {diaLegible(a.desde)}</span>
        {sube ? (
          <span>
            {PESOS.format(a.canonAnteriorCop)} → <strong>{PESOS.format(a.canonNuevoCop)}</strong>
            {a.porcentaje != null && ` (${porcentajeLegible(a.porcentaje)} %)`}
          </span>
        ) : (
          <span className="text-muted-foreground">Sin incremento</span>
        )}
      </div>
      <p className="text-caption text-muted-foreground">
        {sube ? ORIGEN[a.origen as string] : a.motivo}
        {a.carta && ` · ${CARTA[a.carta.estado]}`}
        {enviada && a.carta?.enviadaAt && ` el ${diaLegible(a.carta.enviadaAt)}${a.carta.medio ? ` ${MEDIO[a.carta.medio]}` : ""}`}
        {enviada && a.carta?.soporteNombre && (
          <>
            {" · "}
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={onVerSoporte}
              data-testid={`ver-soporte-constancia-${a.desde}`}
            >
              soporte: {a.carta.soporteNombre}
            </button>
          </>
        )}
      </p>

      {enviada && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAbrirCarta()}
          data-testid={`ver-carta-enviada-${a.desde}`}
        >
          Ver la carta enviada
        </Button>
      )}

      {a.bandeja?.alertaRoja && (
        <p
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-caption font-medium text-destructive"
          data-testid={`alerta-sin-constancia-${a.desde}`}
        >
          Llegó el aniversario sin constancia de la carta. El canon subió igual: envíala o registra cómo se entregó.
        </p>
      )}
      {a.bandeja?.estado === "POR_ENVIAR" && (
        <p className="text-caption text-warning-700 dark:text-warning-100" data-testid={`carta-por-enviar-${a.desde}`}>
          Carta por enviar: faltan {a.bandeja.diasParaElAniversario} días para el aniversario.
        </p>
      )}
      {a.carta?.ultimoIntento && !enviada && (
        <p className="text-caption text-muted-foreground">Último intento: {a.carta.ultimoIntento}</p>
      )}

      {comercial && editable && (
        <div className="flex flex-wrap items-end gap-2">
          <Input
            id={ids.porcentaje}
            inputMode="decimal"
            placeholder="% de este año"
            value={porcentaje}
            onChange={(e) => {
              setPorcentaje(e.target.value);
              limpiar("porcentaje");
            }}
            className="w-32"
            aria-label={`Incremento del ${diaLegible(a.desde)} en porcentaje`}
            aria-invalid={errores.porcentaje || errores.canonNuevoCop ? true : undefined}
            aria-describedby={`${ids.porcentaje}-error`}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={numeroOVacio(porcentaje) === null}
            onClick={() => {
              // Los topes del back, antes de mandar y con su frase (02-10-2026).
              const local = errorDelPorcentajeDelIncremento(porcentaje, "incremento");
              if (local) {
                pintar({ porcentaje: local });
                return;
              }
              void onDigitar({ porcentaje: numeroOVacio(porcentaje) }).then(pintar);
            }}
          >
            Digitar incremento
          </Button>
          <ErrorDelCampo
            id={`${ids.porcentaje}-error`}
            mensaje={errores.porcentaje ?? errores.canonNuevoCop}
            className="w-full"
          />
        </div>
      )}

      {sube && editable && !enviada && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Un solo botón: el cajón muestra la carta tal como sale, deja
                corregirla y la envía (y dice por qué no, si no se puede). */}
            <Button
              size="sm"
              variant={enVentana ? "default" : "outline"}
              onClick={() => onAbrirCarta()}
              data-testid={`enviar-carta-${a.desde}`}
            >
              Ver y enviar la carta
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConstancia((v) => !v)} disabled={!envioHabilitado}>
              Se entregó por otro medio
            </Button>
            {!envioHabilitado && (
              <span className="text-caption text-muted-foreground">
                Falta una actualización de la base para enviar y dejar constancia. El canon sube igual.
              </span>
            )}
          </div>
          {constancia && (
            <div className="flex flex-wrap items-end gap-2 rounded-md border border-border p-2" data-testid={`constancia-${a.desde}`}>
              <label className="text-caption">
                Medio
                <select
                  id={ids.medio}
                  className="mt-1 block rounded-md border border-border bg-background px-2 py-1 text-sm"
                  value={medio}
                  onChange={(e) => {
                    setMedio(e.target.value as "FISICO" | "WHATSAPP" | "OTRO");
                    limpiar("medio");
                  }}
                  aria-invalid={errores.medio ? true : undefined}
                  aria-describedby={`${ids.medio}-error`}
                >
                  <option value="FISICO">En físico</option>
                  <option value="WHATSAPP">Por WhatsApp</option>
                  <option value="OTRO">Otro</option>
                </select>
                <ErrorDelCampo id={`${ids.medio}-error`} mensaje={errores.medio} />
              </label>
              <label className="text-caption">
                Fecha
                <CampoDeDia
                  id={ids.fecha}
                  value={fecha}
                  onChange={(v) => {
                    setFecha(v);
                    limpiar("fecha");
                  }}
                  invalido={Boolean(errores.fecha)}
                  describedBy={`${ids.fecha}-error`}
                  className="mt-1"
                />
                <ErrorDelCampo id={`${ids.fecha}-error`} mensaje={errores.fecha} />
              </label>
              <label className="text-caption">
                Cómo se entregó
                <Input
                  id={ids.nota}
                  value={nota}
                  maxLength={2000}
                  onChange={(e) => {
                    setNota(e.target.value);
                    limpiar("nota");
                  }}
                  className="mt-1 w-64"
                  placeholder="A quién, guía de envío…"
                  aria-invalid={errores.nota ? true : undefined}
                  aria-describedby={`${ids.nota}-error`}
                />
                <ErrorDelCampo id={`${ids.nota}-error`} mensaje={errores.nota} className="w-64" />
              </label>
              {/* 🔴 El soporte es OPCIONAL (Nico, 17-09): una entrega en
                  portería sin papel también vale como constancia. */}
              <label className="text-caption">
                Soporte (opcional)
                <Input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => setSoporte(e.target.files?.[0] ?? null)}
                  className="mt-1"
                  data-testid={`constancia-soporte-${a.desde}`}
                />
              </label>
              <Button
                size="sm"
                variant="outline"
                disabled={!fecha || nota.trim().length < 3}
                onClick={() => void onConstancia({ medio, fecha, nota: nota.trim(), soporte }).then(pintar)}
                data-testid={`registrar-constancia-${a.desde}`}
              >
                Registrar constancia
              </Button>
              <p className="w-full text-caption text-muted-foreground">
                La guía del correo certificado o el acta de entrega ayudan, pero no son obligatorias: con la fecha, el
                medio y quién la entregó la constancia ya vale.
              </p>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

/** QA-CONT-95: «5,1» con coma decimal (es-CO), no «5.1». */
export function porcentajeLegible(valor: number): string {
  return valor.toLocaleString(localeDeLasCifras(), { maximumFractionDigits: 3 });
}
