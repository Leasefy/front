'use client';

/**
 * La ficha de un propietario, adentro del paso de la migración.
 *
 * Nico, 01-10: «si yo ya subí el archivo y pasé a inquilinos y me quiero
 * devolver a propietarios, ¿por qué no me muestra esa información que ya subí?
 * … debería poder verlos, quizás en una tabla con paginación, y hasta poder
 * editarlos si quiero y ver su información completa».
 *
 * Un cajón y no la página `/propietarios/[id]`: detrás del muro no hay panel
 * al que ir, y salir a otra pantalla es perder el paso en el que se estaba.
 *
 * 🔴 Lee la FICHA (`GET :id`), no la fila de la lista. La lista trae sólo los
 * 4 últimos dígitos de la cuenta: editar con ella guardaría una cuenta vacía
 * (el mismo motivo por el que el «Editar» de Propietarios pide la ficha).
 * Editar es el MISMO formulario de Propietarios — completar un dato que la
 * migración dejó en blanco no tiene pantalla propia.
 */

import { useEffect, useState } from 'react';
import { PencilSimple, Warning } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from '@/components/ui/toast';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { DatosPorCompletar } from '@/components/inmobiliaria/DatosPorCompletar';
import { PropietarioBankInfo } from '@/components/inmobiliaria/PropietarioBankInfo';
import { PropietarioForm } from '@/components/inmobiliaria/PropietarioForm';
import { inicialesDe } from '@/components/inmobiliaria/InquilinoDrawer';
import { propietariosApi } from '@/lib/api/inmobiliaria.service';
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext';
import { useUltimoPresente } from '@/lib/hooks/use-ultimo-presente';
import { documentoConTipo, SIN_REGISTRAR } from '@/lib/propietarios/datos-por-completar';
import {
  errorAlGuardarPropietario,
  type ErrorAlGuardarPropietario,
} from '@/lib/propietarios/errores-del-propietario';
import type { DocumentType, Propietario, PropietarioFormData } from '@/lib/types/inmobiliaria';
import { cn } from '@/lib/utils';

const NOMBRE_DEL_TIPO: Record<DocumentType, string> = {
  CC: 'Cédula de ciudadanía',
  CE: 'Cédula de extranjería',
  TI: 'Tarjeta de identidad',
  NIT: 'NIT',
  PASSPORT: 'Pasaporte',
  PPT: 'Permiso por protección temporal',
};

/** `null` = «no lo sabemos», que NO es «no» (ver `Propietario.responsableIva`). */
function siNo(valor: boolean | null | undefined): string | null {
  if (valor === true) return 'Sí';
  if (valor === false) return 'No';
  return null;
}

export function FichaDelPropietario({
  propietario,
  onCerrar,
}: {
  /** La fila elegida; `null` cierra el cajón. */
  propietario: Propietario | null;
  onCerrar: () => void;
}) {
  // El cajón anima la salida con el contenido montado: sin esto saldría en blanco.
  const ultimo = useUltimoPresente(propietario);

  return (
    <Sheet open={Boolean(propietario)} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <SheetContent
        side="right"
        size="lg"
        // Cabecera y cuerpo viven en `CuerpoDeLaFicha`.
        layout="manual"
        aria-describedby={undefined}
        data-testid="ficha-del-propietario"
      >
        <SheetTitle className="sr-only">{ultimo?.name ?? ''}</SheetTitle>
        {ultimo ? <CuerpoDeLaFicha key={ultimo.id} fila={ultimo} /> : null}
      </SheetContent>
    </Sheet>
  );
}

/**
 * Separado del `Sheet`: así se prueba sin portal, y el pedido de la ficha sólo
 * corre con el cajón abierto (Radix desmonta el contenido al cerrarlo).
 */
export function CuerpoDeLaFicha({ fila }: { fila: Propietario }) {
  // Sin proveedor (la pantalla suelta, una prueba) se ofrece: el back decide igual.
  const permisos = usePermissionsContextSafe();
  const puedeEditar = permisos === null || permisos.canAccess('propietarios', 'edit');

  const [ficha, setFicha] = useState<Propietario | null>(null);
  const [errorDeCarga, setErrorDeCarga] = useState<unknown>(null);
  const [intento, setIntento] = useState(0);
  const [editando, setEditando] = useState(false);
  const [errorAlGuardar, setErrorAlGuardar] = useState<ErrorAlGuardarPropietario | null>(null);

  useEffect(() => {
    let vigente = true;
    setErrorDeCarga(null);
    propietariosApi
      .getById(fila.id)
      .then((p) => {
        if (vigente) setFicha(p);
      })
      .catch((e) => {
        if (vigente) setErrorDeCarga(e);
      });
    return () => {
      vigente = false;
    };
  }, [fila.id, intento]);

  // Mientras llega la ficha, la cabecera ya sabe lo que trae la fila.
  const persona = ficha ?? fila;

  const guardar = async (datos: PropietarioFormData) => {
    setErrorAlGuardar(null);
    try {
      await propietariosApi.update(fila.id, datos);
      toast.success(`Guardamos los cambios de ${datos.name || persona.name}`);
      setEditando(false);
      // Se vuelve a pedir: la respuesta de `update` no trae los campos que
      // calcula el back (inmuebles, arriendos), y la lista se refresca sola.
      setIntento((n) => n + 1);
    } catch (e) {
      // Duplicado → al lado del documento; lo demás, arriba del formulario.
      setErrorAlGuardar(errorAlGuardarPropietario(e));
      // El formulario lo necesita para soltar su estado de «guardando».
      throw e;
    }
  };

  const abrirEdicion = () => {
    setErrorAlGuardar(null);
    setEditando(true);
  };

  return (
    <>
      <SheetHeader>
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary"
          >
            {inicialesDe(persona.name)}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-fg">{persona.name}</h2>
            <p className="mt-0.5 truncate font-mono text-caption tabular-nums text-fg-subtle">
              {documentoConTipo(persona.documentType, persona.documentNumber, ' ')}
            </p>
          </div>
          {puedeEditar && ficha && !editando ? (
            <Button
              size="sm"
              variant="outline"
              hideArrow
              onClick={abrirEdicion}
              data-testid="ficha-editar"
            >
              <PencilSimple className="h-4 w-4" />
              Editar
            </Button>
          ) : null}
        </div>
        <DatosPorCompletar
          className="mt-3 inline-flex flex-wrap items-center gap-2"
          pendientes={persona.datosPendientes}
          onCompletar={puedeEditar && ficha && !editando ? abrirEdicion : undefined}
        />
      </SheetHeader>

      <SheetBody>
        {errorDeCarga ? (
          <FalloDeCarga
            error={errorDeCarga}
            queEs="la ficha del propietario"
            onReintentar={() => setIntento((n) => n + 1)}
          />
        ) : !ficha ? (
          <div className="space-y-6" data-testid="ficha-cargando" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-3 w-32" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                </div>
              </div>
            ))}
          </div>
        ) : editando ? (
          <div data-testid="ficha-edicion">
            {errorAlGuardar?.general ? (
              <p
                role="alert"
                className="mb-4 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
              >
                {errorAlGuardar.general}
              </p>
            ) : null}
            <PropietarioForm
              initialData={ficha}
              mode="edit"
              onSubmit={guardar}
              onCancel={() => {
                setEditando(false);
                setErrorAlGuardar(null);
              }}
              serverError={errorAlGuardar?.campo ?? null}
              // Sistema de errores (02-10-2026): TODOS los campos que el back
              // señaló, cada uno bajo el suyo (no sólo el primero).
              serverErrors={errorAlGuardar?.porCampo ?? null}
            />
          </div>
        ) : (
          <LecturaDeLaFicha ficha={ficha} onEditar={puedeEditar ? abrirEdicion : undefined} />
        )}
      </SheetBody>
    </>
  );
}

function LecturaDeLaFicha({ ficha, onEditar }: { ficha: Propietario; onEditar?: () => void }) {
  const copropiedades = ficha.copropiedadesCount ?? 0;
  return (
    <div className="space-y-7" data-testid="ficha-lectura">
      <Seccion titulo="Identificación">
        <Dato
          etiqueta="Tipo de documento"
          valor={ficha.documentType ? NOMBRE_DEL_TIPO[ficha.documentType] ?? ficha.documentType : null}
        />
        <Dato etiqueta="Número de documento" valor={ficha.documentNumber} mono />
      </Seccion>

      <Seccion titulo="Contacto">
        <Dato etiqueta="Correo" valor={ficha.email} />
        <Dato etiqueta="Teléfono" valor={ficha.phone} mono />
        <Dato etiqueta="Dirección" valor={ficha.address} />
        <Dato
          etiqueta="Ciudad"
          valor={[ficha.city, ficha.department].filter(Boolean).join(', ') || null}
        />
      </Seccion>

      <section className="space-y-3">
        <TituloDeSeccion>Cuenta para girarle</TituloDeSeccion>
        {ficha.datosBancariosOcultos ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-fg-muted">
            La cuenta bancaria de este propietario no hace parte de tu rol. Si la necesitas, pídele a un
            administrador el permiso de ver dispersiones.
          </p>
        ) : (
          <PropietarioBankInfo
            bankAccount={ficha.bankAccount}
            propietario={{ nombre: ficha.name, documento: ficha.documentNumber ?? '' }}
            onEdit={onEditar}
          />
        )}
      </section>

      <Seccion titulo="Perfil tributario">
        <Dato etiqueta="Responsable de IVA" valor={siNo(ficha.responsableIva)} vacio="Sin definir" />
        <Dato etiqueta="Agente retenedor de renta" valor={siNo(ficha.agenteRetenedorRenta)} vacio="Sin definir" />
        <Dato etiqueta="Agente retenedor de IVA" valor={siNo(ficha.agenteRetenedorIva)} vacio="Sin definir" />
        <Dato etiqueta="Agente retenedor de ICA" valor={siNo(ficha.agenteRetenedorIca)} vacio="Sin definir" />
      </Seccion>

      <Seccion titulo="De tu sistema anterior">
        <Dato etiqueta="Código en tu sistema" valor={ficha.externalId} mono />
        <Dato etiqueta="Notas" valor={ficha.notes} ancho />
      </Seccion>

      <Seccion titulo="En Leasefy">
        <Dato etiqueta="Inmuebles consignados" valor={String(ficha.propertyCount)} mono />
        <Dato etiqueta="Arriendos activos" valor={String(ficha.activeLeases)} mono />
        {copropiedades > 0 ? (
          <Dato etiqueta="Copropietario en" valor={`${copropiedades} ${copropiedades === 1 ? 'inmueble' : 'inmuebles'}`} />
        ) : null}
      </Seccion>

      {ficha.datosPendientes && ficha.datosPendientes.length > 0 && !onEditar ? (
        <p className="flex items-start gap-2 text-sm text-fg-muted">
          <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          A esta ficha le faltan datos. Pídele a un administrador que la complete.
        </p>
      ) : null}
    </div>
  );
}

function TituloDeSeccion({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-mono text-label uppercase tracking-mono-label text-fg-subtle">{children}</h3>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <TituloDeSeccion>{titulo}</TituloDeSeccion>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

/** Un dato que falta se dice («Sin registrar»), no se deja el hueco. */
function Dato({
  etiqueta,
  valor,
  mono,
  ancho,
  vacio = SIN_REGISTRAR,
}: {
  etiqueta: string;
  valor: string | null | undefined;
  mono?: boolean;
  ancho?: boolean;
  vacio?: string;
}) {
  const texto = valor?.trim();
  return (
    <div className={cn('min-w-0', ancho && 'sm:col-span-2')}>
      <dt className="text-caption text-fg-muted">{etiqueta}</dt>
      <dd
        className={cn(
          'mt-0.5 break-words text-sm',
          texto ? 'text-fg' : 'text-fg-subtle',
          texto && mono && 'font-mono tabular-nums',
          ancho && 'whitespace-pre-line',
        )}
      >
        {texto || vacio}
      </dd>
    </div>
  );
}
