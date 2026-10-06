"use client";

/**
 * Cambiar de inquilino: el contrato sigue, con otra persona desde una fecha
 * (QA-CONT CR-06, back ff282197: `POST /contracts/:id/cambio-de-inquilino`).
 *
 * ── Lo que decidió Ori (03-10, la recomendada) ─────────────────────────────
 *  · Sólo con fecha de HOY o PASADA: programarlo necesita guardar el correo y el
 *    teléfono del entrante hasta ese día, y no hay dónde sin migración. El campo
 *    no deja elegir mañana y, si llega igual, el 400 `CAMBIO_DE_INQUILINO_FUTURO`
 *    va bajo la fecha.
 *  · El período que contiene la fecha queda del saliente; lo anterior también.
 *  · 🔴 Si el saliente debe vencido, el back responde 409
 *    `INQUILINO_SALIENTE_CON_DEUDA` con cuánto debe, en palabras: se dice AQUÍ,
 *    dentro del cajón y con el camino a su estado de cuenta, no en un toast que
 *    se va solo.
 *  · El propietario tiene que haberlo aceptado (CEO 17-09): la casilla es
 *    obligatoria.
 *
 * Es un formulario: va en un CAJÓN, como «Nuevo propietario» y el recibo de
 * caja (Nico, 03-10).
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { UserSwitch } from "@phosphor-icons/react";
import { Presence } from "@leasefy/cadence";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from "@/components/ui/cajon";
import { ErrorDelCampo } from "@/components/estado/ErrorDelCampo";
import { cicloDeVidaApi } from "@/lib/api/ciclo-de-vida.service";
import { isPermissionError } from "@/lib/contratos/fallo-de-accion";
import { repartirErroresDelServidor } from "@/lib/errores/errores-en-el-formulario";
import { leerFallo } from "@/lib/errores/traductor-de-errores";
import { diaLegible } from "@/lib/mandato/textos";

/** Hoy en la hora de quien mira, `AAAA-MM-DD` (el máximo del campo). */
function hoyLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Campo = "desde" | "nombre" | "documento" | "correo" | "telefono" | "aceptaElPropietario" | "nota";
const CAMPOS: readonly Campo[] = ["desde", "nombre", "documento", "correo", "telefono", "aceptaElPropietario", "nota"];

export interface CambioDeInquilinoProps {
  contractId: string;
  /** Quién figura hoy, para decir «de X a …» y nombrarlo si debe. */
  inquilinoActual?: string | null;
  /** El estado de cuenta del contrato, para el aviso de deuda. */
  rutaDelEstadoDeCuenta?: string | null;
  abierto: boolean;
  onCerrar: () => void;
  onRegistrado: () => void;
}

export function CambioDeInquilino({
  contractId,
  inquilinoActual,
  rutaDelEstadoDeCuenta,
  abierto,
  onCerrar,
  onRegistrado,
}: CambioDeInquilinoProps) {
  const hoy = hoyLocal();
  const [desde, setDesde] = useState(hoy);
  const [nombre, setNombre] = useState("");
  const [documento, setDocumento] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({});
  /** Lo que el back dijo sin campo (la deuda del saliente, un 409, un 5xx). */
  const [aviso, setAviso] = useState<{ texto: string; deuda: boolean } | null>(null);

  // Cada vez que se abre, limpio: un cajón que se reabre con la deuda de la
  // vez pasada confunde.
  useEffect(() => {
    if (!abierto) return;
    setDesde(hoyLocal());
    setNombre("");
    setDocumento("");
    setCorreo("");
    setTelefono("");
    setAcepta(false);
    setNota("");
    setErrores({});
    setAviso(null);
  }, [abierto]);

  const loQueFalta = useMemo(() => {
    const falta: string[] = [];
    if (!desde) falta.push("la fecha");
    if (!nombre.trim()) falta.push("el nombre");
    if (!documento.trim()) falta.push("el documento");
    if (!acepta) falta.push("que el propietario lo aceptó");
    return falta;
  }, [desde, nombre, documento, acepta]);
  const fechaFutura = Boolean(desde) && desde > hoy;

  function limpiar(campo: Campo) {
    setErrores((prev) => ({ ...prev, [campo]: undefined }));
    setAviso(null);
  }

  async function confirmar() {
    if (fechaFutura) {
      setErrores((prev) => ({
        ...prev,
        desde: `El cambio se registra el día en que el nuevo inquilino recibe el inmueble o después: el ${diaLegible(desde)} todavía no ha llegado.`,
      }));
      document.getElementById("cambio-desde")?.focus();
      return;
    }
    if (loQueFalta.length > 0) return;
    setGuardando(true);
    setErrores({});
    setAviso(null);
    try {
      const r = await cicloDeVidaApi.cambiarDeInquilino(contractId, {
        desde,
        nombre: nombre.trim(),
        documento: documento.trim(),
        correo: correo.trim() || undefined,
        telefono: telefono.trim() || undefined,
        aceptaElPropietario: acepta,
        nota: nota.trim() || undefined,
      });
      toast.success(`Cambio de inquilino registrado desde el ${diaLegible(r.desde)}.`, {
        description: [
          `Desde ahí el contrato es de ${r.inquilinoNuevo}`,
          r.cuotasReapuntadas > 0
            ? `${r.cuotasReapuntadas} ${r.cuotasReapuntadas === 1 ? "cuota quedó" : "cuotas quedaron"} a su nombre`
            : null,
          `lo anterior sigue siendo de ${r.inquilinoAnterior ?? "el inquilino anterior"}.`,
        ]
          .filter(Boolean)
          .join("; ")
          .concat(r.conCuenta ? "" : " Todavía no tiene cuenta en el portal."),
      });
      onCerrar();
      onRegistrado();
    } catch (err) {
      if (isPermissionError(err)) {
        setAviso({ texto: "No tienes permiso para cambiar el inquilino de un contrato. Pídeselo a un administrador.", deuda: false });
        return;
      }
      const { porCampo, orden, sueltos } = repartirErroresDelServidor(err, {
        campos: CAMPOS,
        porDefecto: "No pudimos registrar el cambio de inquilino.",
        accion: "registrar el cambio de inquilino",
      });
      setErrores(porCampo);
      if (orden[0]) document.getElementById(`cambio-${orden[0]}`)?.focus();
      if (sueltos.length) {
        setAviso({ texto: sueltos.join(" "), deuda: leerFallo(err).code === "INQUILINO_SALIENTE_CON_DEUDA" });
      }
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Cajon abierto={abierto} onOpenChange={(v) => !v && onCerrar()} tamano="md" data-testid="cambio-de-inquilino">
      <CajonCabecera
        titulo="Cambiar de inquilino"
        descripcion={
          inquilinoActual
            ? `El contrato sigue con el mismo inmueble, canon y plazo. Hoy figura ${inquilinoActual}; desde la fecha que elijas, las cuotas son del nuevo inquilino y lo anterior no se reescribe.`
            : "El contrato sigue con el mismo inmueble, canon y plazo. Desde la fecha que elijas, las cuotas son del nuevo inquilino y lo anterior no se reescribe."
        }
      />
      <CajonCuerpo className="space-y-4">
        <Presence
          show={Boolean(aviso)}
          distance="xs"
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
          data-testid="cambio-de-inquilino-aviso"
        >
          <p>{aviso?.texto}</p>
          {aviso?.deuda && rutaDelEstadoDeCuenta ? (
            <Link
              href={rutaDelEstadoDeCuenta}
              className="mt-1 inline-block font-medium underline underline-offset-2"
              data-testid="cambio-de-inquilino-ver-deuda"
            >
              Ver su estado de cuenta
            </Link>
          ) : null}
        </Presence>

        <div className="space-y-1.5">
          <Label htmlFor="cambio-desde">Desde qué día es del nuevo inquilino</Label>
          <Input
            id="cambio-desde"
            type="date"
            max={hoy}
            value={desde}
            onChange={(e) => {
              setDesde(e.target.value);
              limpiar("desde");
            }}
            aria-invalid={errores.desde ? true : undefined}
            aria-describedby="cambio-desde-error"
            data-testid="cambio-desde"
          />
          <ErrorDelCampo
            id="cambio-desde-error"
            mensaje={errores.desde}
            pista="Hoy o antes: el día en que el nuevo inquilino recibió el inmueble."
            className="mt-0"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cambio-nombre">Nombre del nuevo inquilino</Label>
            <Input
              id="cambio-nombre"
              value={nombre}
              maxLength={200}
              autoComplete="off"
              onChange={(e) => {
                setNombre(e.target.value);
                limpiar("nombre");
              }}
              aria-invalid={errores.nombre ? true : undefined}
              aria-describedby="cambio-nombre-error"
              data-testid="cambio-nombre"
            />
            <ErrorDelCampo id="cambio-nombre-error" mensaje={errores.nombre} className="mt-0" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cambio-documento">Documento</Label>
            <Input
              id="cambio-documento"
              value={documento}
              maxLength={30}
              inputMode="numeric"
              autoComplete="off"
              onChange={(e) => {
                setDocumento(e.target.value);
                limpiar("documento");
              }}
              aria-invalid={errores.documento ? true : undefined}
              aria-describedby="cambio-documento-error"
              data-testid="cambio-documento"
            />
            <ErrorDelCampo id="cambio-documento-error" mensaje={errores.documento} className="mt-0" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cambio-correo">Correo (opcional)</Label>
            <Input
              id="cambio-correo"
              type="email"
              value={correo}
              maxLength={255}
              onChange={(e) => {
                setCorreo(e.target.value);
                limpiar("correo");
              }}
              aria-invalid={errores.correo ? true : undefined}
              aria-describedby="cambio-correo-error"
              data-testid="cambio-correo"
            />
            <ErrorDelCampo id="cambio-correo-error" mensaje={errores.correo} className="mt-0" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cambio-telefono">Teléfono (opcional)</Label>
            <Input
              id="cambio-telefono"
              type="tel"
              value={telefono}
              maxLength={30}
              onChange={(e) => {
                setTelefono(e.target.value);
                limpiar("telefono");
              }}
              aria-invalid={errores.telefono ? true : undefined}
              aria-describedby="cambio-telefono-error"
              data-testid="cambio-telefono"
            />
            <ErrorDelCampo id="cambio-telefono-error" mensaje={errores.telefono} className="mt-0" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="cambio-aceptaElPropietario" className="flex items-start gap-3 text-sm text-fg">
            <Checkbox
              id="cambio-aceptaElPropietario"
              checked={acepta}
              onCheckedChange={(v) => {
                setAcepta(v === true);
                limpiar("aceptaElPropietario");
              }}
              aria-invalid={errores.aceptaElPropietario ? true : undefined}
              aria-describedby="cambio-aceptaElPropietario-error"
              data-testid="cambio-acepta"
            />
            <span>El propietario aceptó el cambio de inquilino.</span>
          </label>
          <ErrorDelCampo id="cambio-aceptaElPropietario-error" mensaje={errores.aceptaElPropietario} className="mt-0" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cambio-nota">Nota (opcional)</Label>
          <Textarea
            id="cambio-nota"
            value={nota}
            maxLength={1000}
            rows={2}
            onChange={(e) => {
              setNota(e.target.value);
              limpiar("nota");
            }}
            aria-invalid={errores.nota ? true : undefined}
            aria-describedby="cambio-nota-error"
            data-testid="cambio-nota"
          />
          <ErrorDelCampo id="cambio-nota-error" mensaje={errores.nota} className="mt-0" />
        </div>
      </CajonCuerpo>
      <CajonPie
        ayuda={
          loQueFalta.length > 0 ? (
            <span data-testid="cambio-lo-que-falta">Falta {unir(loQueFalta)}.</span>
          ) : undefined
        }
      >
        <Button type="button" variant="secondary" size="sm" hideArrow onClick={onCerrar} disabled={guardando}>
          Volver
        </Button>
        <Button
          type="button"
          size="sm"
          hideArrow
          onClick={confirmar}
          disabled={loQueFalta.length > 0}
          isLoading={guardando}
          className="gap-2"
          data-testid="confirmar-cambio-de-inquilino"
        >
          <UserSwitch className="h-4 w-4" aria-hidden="true" />
          {guardando ? "Registrando…" : "Registrar el cambio"}
        </Button>
      </CajonPie>
    </Cajon>
  );
}

/** «la fecha, el nombre y el documento». */
function unir(partes: string[]): string {
  if (partes.length <= 1) return partes.join("");
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}
