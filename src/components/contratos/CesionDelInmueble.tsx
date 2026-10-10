"use client";

/**
 * Cambiar de propietario: registrar el punto de quiebre del contrato.
 *
 * ── Por qué existe (auditoría del 2026-09-13, N4) ──────────────────────────
 *
 * Cuando el dueño de un inmueble arrendado vende, el arriendo NO se acaba: el
 * comprador entra en la posición del arrendador con el mismo inquilino, el
 * mismo canon y el mismo plazo. Lo único que cambia es a quién se le gira la
 * plata. No había cómo registrarlo, y cambiar el dueño en el mandato reescribía
 * el pasado: las liquidaciones viejas pasaban a ser del comprador.
 *
 * ── La fecha es lo importante, y por eso es el primer campo ─────────────────
 *
 * Lo anterior a esa fecha sigue siendo del vendedor y no se toca. El back
 * rechaza cualquier fecha que caiga sobre un período ya cobrado, y ese mensaje
 * se muestra tal cual: dice qué mes es el problema, que es lo que hace falta
 * para corregirlo.
 *
 * ── Un solo dueño nuevo ────────────────────────────────────────────────────
 *
 * DECISIÓN DE PRODUCTO (conservadora; se puede cambiar): esta pantalla cede al
 * 100 % a UNA persona, que es el caso real de una venta. El back acepta la
 * lista completa con porcentajes —una venta a dos hermanos es representable—,
 * así que abrirlo acá es agregar filas al formulario, no cambiar el modelo.
 */

import { useEffect, useState } from "react";
import { ArrowRightLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { SelectorDePropietario } from "@/components/contratos/SelectorDePropietario";
import { cicloDeVidaApi, type ResultadoDeLaCesion } from "@/lib/api/ciclo-de-vida.service";
import { propietariosApi } from "@/lib/api/inmobiliaria.service";
import { isPermissionError } from "@/lib/contratos/fallo-de-accion";
import { ErrorDelCampo } from "@/components/estado/ErrorDelCampo";
import { repartirErroresDelServidor } from "@/lib/errores/errores-en-el-formulario";
import type { Propietario } from "@/lib/types/inmobiliaria";
// QA-CONT C-10: la fecha larga de la casa, nunca el ISO crudo.
import { diaLegible } from "@/lib/mandato/textos";
import { hoyEnColombia } from "@/lib/fechas/fecha-de-la-casa";
import { CampoDeDia } from "@/components/contabilidad/CampoDeDia";

/** 100 % en puntos básicos, el mismo lenguaje del mandato. */
const BPS_TOTAL = 10000;

function hoyComoInput(): string {
  // QA-CONT-95: hoy EN COLOMBIA. `toISOString()` es UTC: desde las 7 p. m. de
  // Bogotá ya daba mañana y la fecha precargada quedaba un día corrida.
  return hoyEnColombia();
}

export interface CesionDelInmuebleProps {
  contractId: string;
  /** Quién figura hoy, para poder decir «de X a Y». */
  propietarioActual?: string | null;
  abierto: boolean;
  onCerrar: () => void;
  onRegistrada: () => void;
}

/** Los campos de `RegistrarCesionDto`. */
type CampoDeLaCesion = "desde" | "nuevosPropietarios" | "nota";
const CAMPOS_DE_LA_CESION: readonly CampoDeLaCesion[] = ["desde", "nuevosPropietarios", "nota"];

export function CesionDelInmueble({
  contractId,
  propietarioActual,
  abierto,
  onCerrar,
  onRegistrada,
}: CesionDelInmuebleProps) {
  const [propietarios, setPropietarios] = useState<Propietario[]>([]);
  const [nuevo, setNuevo] = useState<Propietario | null>(null);
  const [desde, setDesde] = useState(hoyComoInput);
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);
  // Lo que el back rechazó de un campo va debajo de ESE campo.
  const [errores, setErrores] = useState<Partial<Record<CampoDeLaCesion, string>>>({});

  useEffect(() => {
    if (!abierto) return;
    const traer = () =>
      propietariosApi
        .getAll({ limit: 500 })
        .then(setPropietarios)
        .catch(() => setPropietarios([]));
    void traer();
    /*
     * QA-CONT: si el comprador no tiene ficha, se crea en otra pestaña sin
     * cerrar este diálogo («Crear su ficha», abajo). Al volver a esta pestaña
     * la lista se vuelve a pedir y el nuevo ya aparece para elegirlo.
     */
    const alVolver = () => {
      if (document.visibilityState === "visible") void traer();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => document.removeEventListener("visibilitychange", alVolver);
  }, [abierto]);

  async function confirmar() {
    if (!nuevo) return;
    setGuardando(true);
    setErrores({});
    try {
      const r = await cicloDeVidaApi.registrarCesion(contractId, {
        desde,
        nuevosPropietarios: [
          { propietarioId: nuevo.id, participacionBps: BPS_TOTAL },
        ],
        nota: nota.trim() || undefined,
      });
      toast.success(`Cesión registrada desde el ${diaLegible(r.desde)}.`, {
        description: `${r.cuotasReapuntadas} ${r.cuotasReapuntadas === 1 ? "período quedó" : "períodos quedaron"} a nombre de ${r.propietarioNuevo}. Lo anterior sigue siendo de ${r.propietarioAnterior ?? "el dueño anterior"}.${queSeHizoConElMes(r)}`,
      });
      onCerrar();
      onRegistrada();
    } catch (err) {
      if (isPermissionError(err)) {
        toast.error("No tienes permisos para registrar una cesión.");
        return;
      }
      // Un 400 con `campos` va bajo su campo (la fecha, los dueños, la nota);
      // un 409, un 5xx con su referencia o la red al toast, por el traductor.
      const { porCampo, orden, sueltos } = repartirErroresDelServidor(err, {
        campos: CAMPOS_DE_LA_CESION,
        // `nuevosPropietarios.0.propietarioId` también es del selector de dueño.
        mapa: { propietarioId: "nuevosPropietarios", participacionBps: "nuevosPropietarios" },
        porDefecto: "No pudimos registrar la cesión.",
        accion: "registrar la cesión",
      });
      setErrores(porCampo);
      if (orden[0] === "desde") document.getElementById("desde")?.focus();
      else if (orden[0] === "nota") document.getElementById("nota-cesion")?.focus();
      if (sueltos.length) toast.error("No se pudo registrar la cesión.", { description: sueltos.join(" · ") });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent size="md" data-testid="cesion-del-inmueble">
        <DialogHeader>
          {/*
            🔴 20-09 · «Cambiar de propietario», no «El propietario vendió el
            inmueble» (Juan Camilo, 16-09). El botón de la ficha ya decía lo
            correcto y el diálogo que abre seguía diciendo lo viejo: se clickea
            «Cambiar de propietario» y arriba aparece «vendió».
            No es sólo el nombre: el cambio de dueño también pasa por herencia,
            donación o por corregir a quién se le venía girando, y un título que
            habla de una venta hace dudar de si sirve para eso.
          */}
          <DialogTitle>Cambiar de propietario</DialogTitle>
          <DialogDescription>
            Por una venta, una herencia o una corrección. El contrato sigue con
            el mismo inquilino, el mismo canon y el mismo plazo. Desde la fecha
            que elijas, las liquidaciones y el estado de cuenta le corresponden
            al nuevo dueño; lo anterior no se reescribe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="desde">Desde qué día es del nuevo dueño</Label>
            <CampoDeDia
              id="desde"
              value={desde}
              onChange={(v) => {
                setDesde(v);
                setErrores((prev) => ({ ...prev, desde: undefined }));
              }}
              invalido={Boolean(errores.desde)}
              describedBy="desde-error"
              testid="cesion-desde"
            />
            <ErrorDelCampo
              id="desde-error"
              mensaje={errores.desde}
              pista={pistaDeLaFechaDeCesion(desde, propietarioActual)}
              className="mt-0"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Nuevo propietario</Label>
            {propietarioActual && (
              <p className="text-caption text-muted-foreground">
                Hoy figura {propietarioActual}.
              </p>
            )}
            <SelectorDePropietario
              propietarios={propietarios}
              actualId={nuevo?.id ?? null}
              onElegir={(p) => {
                setNuevo(p);
                setErrores((prev) => ({ ...prev, nuevosPropietarios: undefined }));
              }}
              disabled={guardando}
              testId="cesion-propietario"
            />
            <ErrorDelCampo id="cesion-propietario-error" mensaje={errores.nuevosPropietarios} className="mt-0" />
            <p className="text-caption text-muted-foreground">
              ¿El comprador todavía no tiene ficha?{" "}
              <a
                href="/panel/inmobiliaria/propietarios?nuevo=true"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline underline-offset-2"
                data-testid="cesion-crear-propietario"
              >
                Crear su ficha
              </a>{" "}
              (se abre en otra pestaña; al volver, aparece en la lista).
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nota-cesion">Nota (opcional)</Label>
            <Textarea
              id="nota-cesion"
              value={nota}
              maxLength={1000}
              onChange={(e) => {
                setNota(e.target.value);
                setErrores((prev) => ({ ...prev, nota: undefined }));
              }}
              rows={2}
              data-testid="nota-de-cesion"
              aria-invalid={errores.nota ? true : undefined}
              aria-describedby="nota-cesion-error"
            />
            <ErrorDelCampo id="nota-cesion-error" mensaje={errores.nota} className="mt-0" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" hideArrow onClick={onCerrar} disabled={guardando}>
            Volver
          </Button>
          <Button
            hideArrow
            onClick={confirmar}
            disabled={!nuevo || !desde}
            isLoading={guardando}
            data-testid="confirmar-cesion"
          >
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            {guardando ? "Registrando…" : "Registrar la cesión"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** `'2026-11'` → «noviembre de 2026». */
function mesEnPalabras(aaaaMm: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(aaaaMm ?? '');
  return m ? `${MESES[Number(m[2]) - 1]} de ${m[1]}` : aaaaMm;
}

/**
 * QA-CONT-95 r3 (E-10, Nico 05-10): la cesión a mitad de mes REPARTE ese mes
 * por días entre el que vende y el que compra (back: `reparto-por-dias.ts`).
 * La pantalla lo dice antes de registrar, con la excepción: un mes ya girado,
 * o con IVA o retenciones, queda completo del que vende.
 */
export function pistaDeLaFechaDeCesion(desde: string, propietarioActual?: string | null): string {
  const base = 'Tiene que ser posterior al último período ya cobrado.';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(desde ?? '');
  if (!m || m[3] === '01') return base;
  const mes = mesEnPalabras(desde);
  const quien = propietarioActual ? `de ${propietarioActual}` : 'del dueño de hoy';
  const diaAnterior = Number(m[3]) - 1;
  return `${base} ${mes.charAt(0).toUpperCase()}${mes.slice(1)} se reparte por días: hasta el ${diaAnterior} es ${quien} y desde el ${Number(m[3])}, del nuevo dueño (si ese mes ya se giró o lleva IVA o retenciones, queda completo ${quien}).`;
}

/**
 * Lo que el back hizo con el mes de la fecha (E-10), para el aviso de «listo».
 * Vacío si la fecha no parte ningún mes.
 */
export function queSeHizoConElMes(
  r: Pick<ResultadoDeLaCesion, 'mesRepartido' | 'propietarioAnterior' | 'propietarioNuevo'>,
): string {
  const m = r.mesRepartido;
  if (!m) return '';
  const mes = mesEnPalabras(m.mes);
  const vende = r.propietarioAnterior ?? 'el dueño anterior';
  if (m.diasDelQueVende && m.diasDelQueCompra) {
    return ` ${mes.charAt(0).toUpperCase()}${mes.slice(1)} quedó repartido por días: ${m.diasDelQueVende} de ${vende} y ${m.diasDelQueCompra} de ${r.propietarioNuevo}.`;
  }
  if (m.sinRepartir) {
    return ` ${mes.charAt(0).toUpperCase()}${mes.slice(1)} quedó completo de ${vende}: ${m.sinRepartir}.`;
  }
  return '';
}
