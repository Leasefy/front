'use client';
import { PageGuard } from '@/components/auth/PageGuard';

import { useState, useMemo, useEffect, useRef, useId } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import {
  Plus,
  UserPlus,
  Sparkle,
  Buildings,
  CurrencyDollar,
  Warning,
  GridFour,
  List,
  CaretRight,
  Users,
  UserCircle,
} from '@phosphor-icons/react';
import { toast } from '@/components/ui/toast';
import {
  PropietarioCard,
  PropietarioTable,
  PropietarioForm,
} from '@/components/inmobiliaria';
import { TerceroIACapture } from '@/components/inmobiliaria/TerceroIACapture';
import { usePropietarios } from '@/lib/hooks/useInmobiliaria';
import { propietariosApi } from '@/lib/api/inmobiliaria.service';
import type { Propietario, PropietarioFormData } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import { Spinner } from '@/components/ui/spinner';
import {
  RUTA_DE_LA_MIGRACION,
  useCopyDeMigracionEnLista,
} from '@/components/migracion/VeredictoDeMigracion';
import { vacioPorMigracion } from '@/components/migracion/muro-reglas';
import { useMigracionConDeuda } from '@/lib/hooks/use-migracion-con-deuda';
import { TablePagination } from '@/components/ui/pagination';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SinDatos } from '@/components/estado/SinDatos';
import { KpiValor } from '@/components/estado/KpiValor';
import { AlertaAccionable } from '@/components/ui/alerta-accionable';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useUltimoPresente } from '@/lib/hooks/use-ultimo-presente';
import {
  errorAlGuardarPropietario,
  motivoAlEliminarPropietario,
  type ErrorAlGuardarPropietario,
} from '@/lib/propietarios/errores-del-propietario';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import {
  FILTROS_INICIALES,
  conteosDePropietarios,
  filtrarPropietarios,
  type FiltrosDePropietarios,
} from '@/lib/propietarios/filtrar-propietarios';
import { descargarListaDePropietarios } from '@/lib/propietarios/exportar-datos';
import { laListaOcultaLaPlata } from '@/lib/propietarios/lo-que-muestra-la-lista';
import { SegmentedControl, KpiCard, AnimatedNumber, Presence, Stagger, StaggerItem } from '@leasefy/cadence';

type ViewMode = 'table' | 'grid';

/**
 * La cáscara del diálogo de «Eliminar» (una confirmación, no un formulario).
 * Nuevo, Crear con IA y Editar van en el cajón (`CajonDelFormulario`, Nico,
 * 03-10: «la experiencia de nuevo propietario debería ser en un drawer»).
 *
 * Era un portal hecho a mano (capa `fixed inset-0`, ✕ propia, `lenis.stop()`
 * y un bloqueo del scroll que fijaba el body con `position: fixed` y lo
 * devolvía a su `scrollY`), sin Esc, sin foco atrapado y sin `role="dialog"`.
 * Ahora es el `Dialog` de la plataforma (DESIGN.md §17): el velo, la ✕, el
 * Esc, el foco y el bloqueo del scroll los pone la primitiva —que bloquea sin
 * mover la página, así que el salto al tope que corregía ese efecto ya no
 * tiene de dónde salir (`modal-conserva-el-scroll.test.tsx`)—, y a Lenis lo
 * frena `SmoothScroll` al ver un `[role=dialog]` abierto.
 *
 * El pie va por `footer` y no dentro de `children`: el `DialogContent` reparte
 * sólo a sus hijos DIRECTOS, y un pie metido en el cuerpo se iría con el
 * scroll. `variant="destructive"` (eliminar) pone el medallón rojo; el botón
 * rojo lo trae el pie.
 */
function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  variant,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'destructive';
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(abierto) => {
        if (!abierto) onClose();
      }}
    >
      <DialogContent
        size={size}
        variant={variant}
        // Sin descripción visible, Radix no tiene a qué apuntar: se le avisa.
        {...(description ? {} : { 'aria-describedby': undefined })}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}

/**
 * El motivo del back, dentro del diálogo que lo provocó. Un toast se va solo
 * en cuatro segundos y se lleva la única explicación de por qué no se guardó.
 */
function AvisoEnElDialogo({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      data-testid="aviso-en-el-dialogo"
      className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
    >
      {children}
    </p>
  );
}

/**
 * El cajón del formulario del propietario: Nuevo y Editar (Nico, 03-10). La
 * misma experiencia que «Nuevo inquilino»: cabecera, cuerpo que se desplaza y
 * pie FIJO, así «Cancelar / Crear propietario» se ven siempre enteros (P-12).
 * El formulario va en el cuerpo sin su fila de botones (`accionesAfuera`) y el
 * botón del pie lo manda con `form=`. Lo que el back dijo sin campo va arriba
 * del cuerpo; lo que es de un campo, bajo ese campo (y ahí va el foco, P-11).
 */
function CajonDelFormulario({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  aviso,
  idDelFormulario,
  textoDelBoton,
  guardando,
  children,
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  descripcion?: React.ReactNode;
  aviso?: string | null;
  idDelFormulario: string;
  textoDelBoton: string;
  guardando: boolean;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <Cajon
      abierto={abierto}
      onOpenChange={(sigue) => {
        if (!sigue) onCerrar();
      }}
      tamano="lg"
      data-testid="cajon-del-propietario"
    >
      <CajonCabecera titulo={titulo} descripcion={descripcion} />
      <CajonCuerpo>
        {aviso ? (
          <div className="mb-4">
            <AvisoEnElDialogo>{aviso}</AvisoEnElDialogo>
          </div>
        ) : null}
        {children}
      </CajonCuerpo>
      <CajonPie>
        <Button type="button" variant="secondary" size="sm" hideArrow onClick={onCerrar} disabled={guardando}>
          {t('inmobiliaria.propietario.form.cancel')}
        </Button>
        <Button
          type="submit"
          form={idDelFormulario}
          size="sm"
          hideArrow
          disabled={guardando}
          className="gap-2"
          data-testid="guardar-propietario"
        >
          {guardando ? (
            <>
              <Spinner size="sm" variant="current" />
              {t('inmobiliaria.propietario.form.saving')}
            </>
          ) : (
            textoDelBoton
          )}
        </Button>
      </CajonPie>
    </Cajon>
  );
}

/**
 * Propietarios List Page
 * Main CRM view for managing property owners
 */
function PropietariosContent() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  // ⚠️ Tomar SÓLO los datos era el defecto: `useApiData` captura el fallo en su
  // estado y no lo relanza, así que una petición muerta llegaba acá como lista
  // vacía y la pantalla decía «todavía no tienes propietarios» — afirmando algo
  // que nadie verificó. `errorCrudo` es el error entero, que es lo que
  // `FalloDeCarga` necesita para saber si reintentar sirve.
  const {
    propietarios: apiPropietarios,
    isLoading: cargandoPropietarios,
    errorCrudo: errorPropietarios,
    refetch: recargarPropietarios,
  } = usePropietarios();

  /*
   * La lista es la del hook, sin copia local.
   *
   * Había un `useState` espejo que se llenaba con
   * `if (apiPropietarios.length > 0) setPropietarios(...)`. Ese `> 0` es una
   * trampa: el espejo sólo copia hacia adelante, así que **borrar el último
   * propietario dejaba su fila en pantalla para siempre** — la petición salía,
   * el hook devolvía la lista vacía y la copia se quedaba con lo viejo.
   *
   * Con el refresco automático el problema se agrava: la pantalla recibe el
   * dato nuevo y lo ignora. Un espejo que no puede vaciarse no es un caché, es
   * una afirmación desactualizada.
   *
   * Y tenía un segundo daño, menos visible (visto al integrar #87): los KPI de
   * arriba —inmuebles, canon, pendiente— se suman de ESTA lista, y esos campos
   * los calcula el backend. Un objeto recién creado los trae en cero, así que
   * parchear la copia a mano al crear un propietario **bajaba los totales de la
   * agencia**. Leer siempre del hook no tiene ninguno de los dos problemas.
   */
  const propietarios = apiPropietarios;

  /*
   * 🔴 Los filtros de la tabla viven ACÁ, no adentro de `PropietarioTable`.
   *
   * La tabla los tenía en estado propio y filtraba lo que recibía… que era el
   * `slice` de la página actual. O sea: buscar «Martínez» desde la página 1
   * decía «No se encontraron propietarios» con Martínez en la página 3, y
   * «Con saldo pendiente» mostraba los morosos *de esas 10 filas*. Un
   * buscador que sólo mira una página es un buscador que miente, y no hay
   * nada en la pantalla que lo delate.
   *
   * El orden correcto —filtrar → ordenar → paginar— sólo se puede hacer donde
   * está la lista completa. Ver `lib/propietarios/filtrar-propietarios.ts`.
   */
  const [filtros, setFiltros] = useState<FiltrosDePropietarios>(FILTROS_INICIALES);
  const propietariosFiltrados = useMemo(
    () => filtrarPropietarios(propietarios, filtros),
    [propietarios, filtros],
  );
  /* Los números de los chips salen de la lista COMPLETA, no de la página. */
  const conteos = useMemo(
    () => conteosDePropietarios(propietarios, filtros),
    [propietarios, filtros],
  );

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showIACapture, setShowIACapture] = useState(false);
  const [editingPropietario, setEditingPropietario] = useState<Propietario | null>(null);
  const [deletingPropietario, setDeletingPropietario] = useState<Propietario | null>(null);
  /*
   * Lo que los diálogos de editar y eliminar MUESTRAN: el último propietario.
   * Al cerrar, el estado vuelve a `null` en el mismo render en que el `Dialog`
   * empieza a salir; sin esto el modal se vaciaba (sin formulario, sin pie) y
   * se iba en blanco. Las acciones siguen leyendo el estado de verdad.
   */
  const propietarioQueSeEdita = useUltimoPresente(editingPropietario);
  const propietarioQueSeBorra = useUltimoPresente(deletingPropietario);
  const [isDeleting, setIsDeleting] = useState(false);
  /** El pie del cajón vive afuera del formulario: sabe que se está guardando por acá. */
  const [guardandoAlta, setGuardandoAlta] = useState(false);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const idDelAlta = `propietario-nuevo-${useId().replace(/:/g, '')}`;
  const idDeLaEdicion = `propietario-editar-${useId().replace(/:/g, '')}`;

  /*
   * 🔴 Lo que el back explica se queda en el diálogo.
   *
   * Los tres `catch` de abajo tiraban el motivo y ponían «Intenta de nuevo»:
   * sobre «tiene 7 inmuebles consignados» (reintentar da lo mismo) y sobre
   * «ese documento ya existe» (el dato está mal, no la red). Ahora el motivo
   * se muestra adentro, y el duplicado va al lado del campo. Ver
   * `lib/propietarios/errores-del-propietario.ts`.
   */
  const [motivoAlEliminar, setMotivoAlEliminar] = useState<string | null>(null);
  const [errorAlCrear, setErrorAlCrear] = useState<ErrorAlGuardarPropietario | null>(null);
  const [errorAlEditar, setErrorAlEditar] = useState<ErrorAlGuardarPropietario | null>(null);

  /*
   * 🔴 Las mismas llaves con que el back protege cada ruta
   * (`propietarios.controller.ts`: POST create · PUT edit · DELETE delete).
   * Un CONTADOR o un VIEWER sólo tienen `propietarios:view`: antes veían
   * «Nuevo», «Editar» y «Eliminar», y el clic terminaba en un 403.
   * `canAccess` en false mientras los permisos cargan: los botones aparecen
   * cuando se sabe, nunca antes.
   */
  const { canAccess } = usePermissions();
  const puedeCrear = canAccess('propietarios', 'create');
  const puedeEditar = canAccess('propietarios', 'edit');
  const puedeEliminar = canAccess('propietarios', 'delete');

  /*
   * Esta pantalla no tiene filtros, así que un vacío es siempre «no hay
   * ninguno» — pero el PORQUÉ importa: si la migración dejó contratos sin
   * propietario, no hay dueños registrados por eso, no porque nadie se haya
   * sentado a cargarlos.
   */
  const deudaDeMigracion = useMigracionConDeuda();
  const armarCopyDeMigracion = useCopyDeMigracionEnLista();
  const copyDeMigracion =
    deudaDeMigracion && vacioPorMigracion(deudaDeMigracion)
      ? armarCopyDeMigracion(deudaDeMigracion)
      : null;

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Open modal if ?nuevo=true query param is present
  useEffect(() => {
    if (searchParams.get('nuevo') === 'true') {
      setShowAddModal(true);
      // Clean up URL without reload
      router.replace('/panel/inmobiliaria/propietarios', { scroll: false });
    }
  }, [searchParams, router]);

  /**
   * `?persona=<User.id>` — entrar acá con un propietario ya elegido.
   *
   * Lo usa «Ver ficha del propietario» en el menú de la conversación
   * (`/panel/inmobiliaria/mensajes`), donde de la persona sólo se tiene su
   * `User.id`.
   *
   * 🔴 La fila NO se busca por `id`: el `id` es el de la ficha comercial de la
   * agencia, que no es un usuario. La llave es `cuentaDePortalId`, que el back
   * resuelve por correo y manda también en la lista justamente para esto. Es
   * `null` en quien no tiene cuenta del portal, así que los nulos se saltean —
   * si no, un `persona` vacío haría match con el primer propietario sin cuenta.
   */
  const personaBuscada = searchParams.get('persona');
  const personaYaResuelta = useRef<string | null>(null);
  const [personaNoEncontrada, setPersonaNoEncontrada] = useState(false);

  useEffect(() => {
    if (!personaBuscada || cargandoPropietarios || errorPropietarios) return;
    if (personaYaResuelta.current === personaBuscada) return;
    personaYaResuelta.current = personaBuscada;

    const encontrado = propietarios.find(
      (p) => p.cuentaDePortalId != null && p.cuentaDePortalId === personaBuscada,
    );
    if (encontrado) {
      // El detalle del propietario es una PÁGINA (no un cajón), la misma a la
      // que lleva un clic en la fila. Se usa `replace` para que el «atrás» del
      // navegador vuelva a la conversación y no a esta lista intermedia.
      router.replace(`/panel/inmobiliaria/propietarios/${encontrado.id}`);
    } else {
      setPersonaNoEncontrada(true);
    }
  }, [
    personaBuscada,
    propietarios,
    cargandoPropietarios,
    errorPropietarios,
    router,
  ]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalProperties = propietarios.reduce((sum, p) => sum + p.propertyCount, 0);
    const totalMonthlyRent = propietarios.reduce((sum, p) => sum + p.totalMonthlyRent, 0);
    const totalPending = propietarios.reduce((sum, p) => sum + p.pendingBalance, 0);
    const pendingCount = propietarios.filter((p) => p.pendingBalance > 0).length;

    return {
      totalPropietarios: propietarios.length,
      totalProperties,
      totalMonthlyRent,
      totalPending,
      pendingCount,
    };
  }, [propietarios]);

  // Pagination calculations — sobre lo FILTRADO, que es lo que se ve.
  const paginationData = useMemo(() => {
    const totalItems = propietariosFiltrados.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = propietariosFiltrados.slice(startIndex, endIndex);

    return {
      totalItems,
      totalPages,
      startIndex,
      endIndex: Math.min(endIndex, totalItems),
      paginatedItems,
    };
  }, [propietariosFiltrados, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, paginationData.totalPages)));
  };

  const handleView = (propietario: Propietario) => {
    router.push(`/panel/inmobiliaria/propietarios/${propietario.id}`);
  };

  /*
   * El menú de cada fila vive en `PropietarioTable`, que siempre dibuja
   * «Editar» y «Eliminar». Mientras no se puedan esconder allá, el clic sin
   * permiso DICE por qué no abre nada, en vez de abrir un formulario cuyo
   * guardar devuelve 403.
   */
  const avisarSinPermiso = (accion: 'editar' | 'eliminar') => {
    toast.error(`No tienes permiso para ${accion} propietarios`, {
      description: 'Pídeselo al administrador de tu inmobiliaria.',
    });
  };

  /*
   * 🔴 El modal de editar se llena con la FICHA, no con la fila de la lista
   * (23-09, datos personales). La lista ya no trae el número de cuenta —sólo
   * sus 4 últimos dígitos— y llenar el formulario con ella lo dejaba en blanco:
   * guardar habría mandado una cuenta vacía. La ficha (`GET :id`) trae la
   * cuenta entera a quien la puede ver, y a quien no, `datosBancariosOcultos`,
   * con lo que el formulario esconde el bloque bancario.
   */
  const [abriendoEdicion, setAbriendoEdicion] = useState<string | null>(null);
  const handleEdit = async (propietario: Propietario) => {
    if (!puedeEditar) return avisarSinPermiso('editar');
    if (abriendoEdicion) return;
    setErrorAlEditar(null);
    setAbriendoEdicion(propietario.id);
    try {
      setEditingPropietario(await propietariosApi.getById(propietario.id));
    } catch (err) {
      // Por qué no se pudo abrir, con la regla de oro: un 404 dice que ya no
      // está, un 5xx «de nuestro lado» con la referencia, la red la conexión.
      toast.error(t('inmobiliaria.propietarios.toasts.loadForEditError'), {
        description: mensajeParaLaPersona(err, { porDefecto: '', accion: 'abrir la ficha' }) || undefined,
      });
    } finally {
      setAbriendoEdicion(null);
    }
  };

  const handleDelete = (propietario: Propietario) => {
    if (!puedeEliminar) return avisarSinPermiso('eliminar');
    setMotivoAlEliminar(null);
    setDeletingPropietario(propietario);
  };

  const cerrarEliminar = () => {
    setDeletingPropietario(null);
    setMotivoAlEliminar(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingPropietario || isDeleting) return;

    setIsDeleting(true);
    setMotivoAlEliminar(null);
    try {
      await propietariosApi.delete(deletingPropietario.id);
      // La fila se va sola: el cliente avisa que «propietarios» cambió y la
      // lista se vuelve a pedir. Antes se la sacaba a mano de una copia local,
      // que es una segunda versión de la verdad y podía discrepar del back.
      toast.success(t('inmobiliaria.propietarios.toasts.deleted', { name: deletingPropietario.name }));
      setDeletingPropietario(null);
    } catch (err) {
      // El 409 dice QUÉ lo retiene («tiene N inmuebles consignados»): se
      // muestra tal cual, dentro del diálogo, que se queda abierto.
      setMotivoAlEliminar(motivoAlEliminarPropietario(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateSubmit = async (data: PropietarioFormData) => {
    setErrorAlCrear(null);
    setGuardandoAlta(true);
    try {
      const created = await propietariosApi.create(data);
      // Aparece solo. Y se pide de nuevo al back a propósito: el objeto que
      // devuelve `create` no trae los campos calculados (propiedades, canon),
      // así que insertarlo a mano mostraba una fila incompleta hasta recargar.
      toast.success(t('inmobiliaria.propietarios.toasts.created', { name: created.name }));
      setShowAddModal(false);
      setCurrentPage(1); // Reset to first page to show new item
    } catch (err) {
      // Duplicado → al lado del documento; 400 → al lado de su campo; lo
      // demás, arriba del formulario. Nunca un «Intenta de nuevo» a secas.
      setErrorAlCrear(errorAlGuardarPropietario(err));
      // Re-throw so the form keeps the modal open and resets its submitting state
      throw err;
    } finally {
      setGuardandoAlta(false);
    }
  };

  const handleEditSubmit = async (data: PropietarioFormData) => {
    if (!editingPropietario) return;

    setErrorAlEditar(null);
    setGuardandoEdicion(true);
    try {
      await propietariosApi.update(editingPropietario.id, data);
      // Se actualiza sola.
      toast.success(t('inmobiliaria.propietarios.toasts.updated'));
      setEditingPropietario(null);
    } catch (err) {
      setErrorAlEditar(errorAlGuardarPropietario(err));
      // Re-throw so the form keeps the modal open and resets its submitting state
      throw err;
    } finally {
      setGuardandoEdicion(false);
    }
  };

  /**
   * Exportar el directorio a Excel.
   *
   * 🔴 Esto era `toast.info('Exportando…')` y un `// TODO`: el cartel afirmaba
   * que estaba pasando algo, no bajaba ningún archivo y no había manera de
   * darse cuenta salvo esperar. Ahora baja de verdad, y **lo que se ve**: si
   * hay un filtro puesto, el archivo trae lo filtrado, no toda la base.
   */
  const [exportando, setExportando] = useState(false);
  const handleExport = async () => {
    if (exportando) return; // dos clics seguidos = dos libros armados
    setExportando(true);
    try {
      const archivo = await descargarListaDePropietarios(propietariosFiltrados);
      toast.success(t('inmobiliaria.propietarios.toasts.exported'), {
        description: t('inmobiliaria.propietarios.toasts.exportedDesc', {
          archivo,
          count: propietariosFiltrados.length,
        }),
      });
    } catch (err) {
      console.error('Export propietarios error:', err);
      toast.error(t('inmobiliaria.propietarios.toasts.exportError'));
    } finally {
      setExportando(false);
    }
  };

  /*
   * 🔴 Los tiles salen de la MISMA lista que la tabla de abajo: mientras
   * carga, un hueco; si falló, «—» con «No se pudo traer». Antes, con el back
   * caído, la tabla decía «no se pudo cargar» y arriba los tiles afirmaban
   * «0 propietarios · $0 · Al día» — y «Al día» es lo más peligroso de leer
   * sobre datos que no llegaron.
   *
   * `KpiCard` tipa `value` como string pero lo pinta como hijo: el nodo se ve
   * igual que el texto (mismo arreglo que Pipeline e Inquilinos).
   */
  const kpiSinDato = cargandoPropietarios || Boolean(errorPropietarios);
  /*
   * 🔴 P-21 (QA de Propietarios, 03-10): al asesor el back le oculta la plata
   * (`plataOculta`, montos en `null` que `normalizePropietario` vuelve 0). Los
   * tiles de plata decían «Canon mensual $0» y «Sin pendientes · Al día»: no
   * los mostramos como cero, decimos que no tiene acceso.
   */
  const plataOculta = !kpiSinDato && laListaOcultaLaPlata(propietarios);
  const sinAccesoALaPlata = t('inmobiliaria.propietario.table.sinAccesoALaPlata');
  const tileSinPlata = (
    // El porqué lo dice el subtítulo del tile (visible y leído una sola vez).
    <span className="text-fg-subtle" data-testid="kpi-valor" data-estado="oculto" title={sinAccesoALaPlata}>
      <span aria-hidden="true">—</span>
    </span>
  ) as unknown as string;
  const valorDeTile = (valor: string) =>
    (
      <KpiValor cargando={cargandoPropietarios} fallo={errorPropietarios}>
        {valor}
      </KpiValor>
    ) as unknown as string;

  const cerrarAlta = () => {
    setShowAddModal(false);
    setErrorAlCrear(null);
  };
  const cerrarCapturaIA = () => {
    setShowIACapture(false);
    setErrorAlCrear(null);
  };
  const cerrarEdicion = () => {
    setEditingPropietario(null);
    setErrorAlEditar(null);
  };
  /* O5: con inmuebles consignados, o figurando como dueño en mandatos de otro
     (copropiedades), el back rechaza el borrado con un 409. Se dice antes y el
     botón no se ofrece activo. */
  const inmueblesDelBorrado = propietarioQueSeBorra?.propertyCount ?? 0;
  const copropiedadesDelBorrado = propietarioQueSeBorra?.copropiedadesCount ?? 0;
  const borradoBloqueado = inmueblesDelBorrado > 0 || copropiedadesDelBorrado > 0;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{t('inmobiliaria.common.title')}</span>
            <CaretRight className="w-3 h-3" />
            <span className="text-foreground">{t('inmobiliaria.propietarios.title')}</span>
          </div>
          <h1 className="text-h2 text-fg">
            {t('inmobiliaria.propietarios.title')}
          </h1>
          <p className="text-body text-fg-muted max-w-2xl line-clamp-2">
            {t('inmobiliaria.propietarios.subtitle')}
          </p>
        </div>

        {/* P-22: a 390 px los dos no caben en una línea («Nuevo propietario»
            se salía del borde y la página medía 416 px): se acomodan en dos,
            cada uno a lo ancho. */}
        {puedeCrear && (
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            <Button variant="secondary" hideArrow onClick={() => setShowIACapture(true)} className="flex-1 sm:flex-none">
              <Sparkle className="w-5 h-5 text-primary" weight="fill" />
              {t('inmobiliaria.propietarios.addOwnerIA')}
            </Button>
            <Button hideArrow onClick={() => setShowAddModal(true)} className="flex-1 sm:flex-none">
              <UserPlus className="w-5 h-5" />
              {t('inmobiliaria.propietarios.addOwner')}
            </Button>
          </div>
        )}
      </div>

      {/* El clic que vino de otra pantalla y no llegó a ningún lado. Se dice:
          una lista que se queda igual parece un botón roto. */}
      <Presence
        show={Boolean(personaNoEncontrada)}
        data-testid="persona-no-encontrada"
        className="flex items-start gap-3 rounded-lg border border-border bg-surface-muted p-4"
      >
        <Warning className="mt-0.5 h-5 w-5 flex-shrink-0 text-fg-muted" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-fg">
            No encontramos a esa persona en el directorio
          </p>
          <p className="mt-0.5 text-sm text-fg-muted">
            La ficha del propietario se cruza con su cuenta del portal por
            correo: si el de la ficha no es el mismo con el que entra a
            Leasefy, no hay forma de enlazarlos. Abajo está la lista completa.
          </p>
        </div>
      </Presence>

      {/* Summary Stats — P-22: a 390 px, en dos columnas, «$96.600.000» se
          cortaba («$96.600.0») y las etiquetas también («PROPIETA…»). Una
          columna en el celular, dos en tableta y cuatro desde `xl`, donde la
          cifra cabe con el menú abierto. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label={t('inmobiliaria.propietarios.title')}
          value={valorDeTile(String(stats.totalPropietarios))}
          icon={<Users />}
        />
        <KpiCard
          label={t('inmobiliaria.propietarios.properties')}
          value={valorDeTile(String(stats.totalProperties))}
          icon={<Buildings />}
        />
        <KpiCard
          label={t('inmobiliaria.propietarios.monthlyRevenue')}
          value={plataOculta ? tileSinPlata : valorDeTile(formatCurrency(stats.totalMonthlyRent))}
          sublabel={plataOculta ? sinAccesoALaPlata : undefined}
          icon={<CurrencyDollar />}
        />
        {/* Sin dato, la etiqueta tampoco puede decir «Sin pendientes» ni
            pintarse en verde: es la misma afirmación que el «$0». Sin acceso
            a la plata (P-21), tampoco. */}
        <KpiCard
          label={
            kpiSinDato || plataOculta
              ? 'Saldo pendiente'
              : stats.pendingCount > 0
                ? t('inmobiliaria.propietarios.withBalance', { count: stats.pendingCount })
                : t('inmobiliaria.propietarios.noPending')
          }
          value={
            plataOculta
              ? tileSinPlata
              : valorDeTile(
                  stats.pendingCount > 0 ? formatCurrency(stats.totalPending) : t('inmobiliaria.propietarios.upToDate'),
                )
          }
          sublabel={plataOculta ? sinAccesoALaPlata : undefined}
          icon={!kpiSinDato && !plataOculta && stats.pendingCount > 0 ? <Warning /> : <CurrencyDollar />}
          deltaDirection={kpiSinDato || plataOculta ? 'neutral' : stats.pendingCount > 0 ? 'down' : 'up'}
        />
      </div>

      {/* Unified Data Card - View Toggle + Content + Pagination.
          Sin entrada propia: la página ya entra con el `template.tsx`; lo que
          se anima adentro son los cambios (filas, tarjetas, la cifra). */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* View Toggle Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/20">
          <SegmentedControl<ViewMode>
            value={viewMode}
            onChange={setViewMode}
            aria-label={t('inmobiliaria.propietarios.viewTable')}
            options={[
              {
                value: 'table',
                label: (
                  <span className="flex items-center gap-2">
                    <List className="w-4 h-4" />
                    {t('inmobiliaria.propietarios.viewTable')}
                  </span>
                ),
                ariaLabel: t('inmobiliaria.propietarios.viewTable'),
              },
              {
                value: 'grid',
                label: (
                  <span className="flex items-center gap-2">
                    <GridFour className="w-4 h-4" />
                    {t('inmobiliaria.propietarios.viewCards')}
                  </span>
                ),
                ariaLabel: t('inmobiliaria.propietarios.viewCards'),
              },
            ]}
          />
          {/* El mismo «0» que los tiles, un renglón más abajo: sin dato, no se dice. */}
          {!kpiSinDato && (
            <span className="text-sm text-muted-foreground tabular-nums">
              <AnimatedNumber value={paginationData.totalItems} format={(n) => String(Math.round(n))} />{' '}
              {paginationData.totalItems === 1
                ? t('inmobiliaria.propietarios.propietarioUno')
                : t('inmobiliaria.propietarios.title').toLowerCase()}
            </span>
          )}
        </div>

        {/* Content */}
        <div>
          <EstadoDeDatos
            cargando={cargandoPropietarios}
            error={errorPropietarios}
            queEs="los propietarios"
            onReintentar={recargarPropietarios}
          >
            {propietarios.length === 0 ? (
              /* «Todavía no hay ninguno» es esto y sólo esto: la lista del
                 back llegó VACÍA. Antes se miraba el total ya filtrado, así
                 que buscar algo que no está decía «Registra al dueño de un
                 inmueble» a quien tiene cuarenta. */
              /*
                 Y si está vacío PORQUE la migración quedó a medias, se dice:
                 84 contratos migrados sin propietario significan que nadie
                 quedó registrado como dueño. Decirle «registra al dueño» a
                 quien acaba de subir su cartera entera esconde la causa.
              */
              <SinDatos
                queSon="propietarios"
                icono={UserCircle}
                titulo={copyDeMigracion?.titulo}
                descripcion={
                  copyDeMigracion?.detalle ??
                  'Registra al dueño de un inmueble para poder consignarlo y liquidarle sus pagos.'
                }
                accion={
                  copyDeMigracion ? (
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Button asChild hideArrow>
                        <Link href={RUTA_DE_LA_MIGRACION}>{copyDeMigracion.accion}</Link>
                      </Button>
                      {puedeCrear && (
                        <Button variant="outline" hideArrow onClick={() => setShowAddModal(true)}>
                          Agregar propietario
                        </Button>
                      )}
                    </div>
                  ) : undefined
                }
                crear={
                  puedeCrear
                    ? { label: 'Agregar propietario', onClick: () => setShowAddModal(true) }
                    : undefined
                }
              />
            ) : viewMode === 'table' ? (
              <PropietarioTable
                propietarios={paginationData.paginatedItems}
                totalFiltrado={paginationData.totalItems}
                total={propietarios.length}
                filtros={filtros}
                conteos={conteos}
                onFiltros={(nuevos) => {
                  setFiltros(nuevos);
                  // Filtrar desde la página 3 dejaba la tabla en blanco.
                  setCurrentPage(1);
                }}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onExport={handleExport}
                plataOculta={plataOculta}
              />
            ) : paginationData.totalItems === 0 ? (
              /* En tarjetas no hay barra de filtros —vive dentro de la tabla—,
                 así que acá el vacío filtrado tiene que traer su propia salida:
                 si no, la única forma de volver es adivinar que hay que cambiar
                 de vista. */
              <SinDatos
                hayFiltros
                queSon="propietarios"
                icono={UserCircle}
                onLimpiarFiltros={() => {
                  setFiltros(FILTROS_INICIALES);
                  setCurrentPage(1);
                }}
              />
            ) : (
              /* Las tarjetas entran escalonadas (techo de 320 ms) y, al cambiar
                 de página, las que se van salen: `key` = el id. Sin `layout`:
                 una página entera cambia de una vez, no se reacomoda. */
              <Stagger layout={false} className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {paginationData.paginatedItems.map((propietario) => (
                  <StaggerItem key={propietario.id}>
                    <PropietarioCard
                      propietario={propietario}
                      onClick={() => handleView(propietario)}
                    />
                  </StaggerItem>
                ))}
              </Stagger>
            )}
          </EstadoDeDatos>
        </div>

        {/* Pagination Footer */}
        {paginationData.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border bg-muted/10">
            <TablePagination
              total={paginationData.totalItems}
              page={currentPage}
              pageSize={itemsPerPage}
              pageSizeOptions={[5, 10, 20, 50]}
              onPageChange={handlePageChange}
              onPageSizeChange={(size) => {
                setItemsPerPage(size);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* Nuevo propietario — en el CAJÓN (Nico, 03-10). El permiso también
          cierra el `?nuevo=true`: sin él, el enlace no abre un formulario que
          el back va a rechazar. */}
      <CajonDelFormulario
        abierto={showAddModal && puedeCrear}
        onCerrar={cerrarAlta}
        titulo={t('inmobiliaria.propietarios.addOwner')}
        descripcion="Regístralo para consignar sus inmuebles y girarle lo que le corresponde. La cuenta bancaria la puedes cargar después."
        aviso={errorAlCrear?.general}
        idDelFormulario={idDelAlta}
        textoDelBoton={t('inmobiliaria.propietario.form.createOwner')}
        guardando={guardandoAlta}
      >
        <PropietarioForm
          onSubmit={handleCreateSubmit}
          onCancel={cerrarAlta}
          mode="create"
          serverError={errorAlCrear?.campo ?? null}
          serverErrors={errorAlCrear?.porCampo ?? null}
          accionesAfuera
          idDelFormulario={idDelAlta}
        />
      </CajonDelFormulario>

      {/* Crear con IA (v6-07; reusa el alta) — también en el cajón (Nico,
          03-10: «el de crear con IA sigue en modal»): subir → leer → revisar y
          guardar, todo adentro. `TerceroIACapture` pone su cuerpo y su pie; el
          error por campo va a SU campo (02-10-2026) y arriba sólo lo que no
          tiene campo. */}
      <Cajon
        abierto={showIACapture && puedeCrear}
        onOpenChange={(sigue) => {
          if (!sigue) cerrarCapturaIA();
        }}
        tamano="lg"
        data-testid="cajon-crear-con-ia"
      >
        <CajonCabecera
          titulo={t('inmobiliaria.propietarios.addOwnerIA')}
          descripcion="Sube sus documentos, revisa lo que leímos y guárdalo."
        />
        <TerceroIACapture
          onCreated={handleCreateSubmit}
          onClose={cerrarCapturaIA}
          errorDelServidor={errorAlCrear}
          aviso={errorAlCrear?.general ? <AvisoEnElDialogo>{errorAlCrear.general}</AvisoEnElDialogo> : null}
        />
      </Cajon>

      {/* Editar — el MISMO formulario en el mismo cajón que «Nuevo» (una sola
          experiencia; decisión anotada para Nico). */}
      <CajonDelFormulario
        abierto={!!editingPropietario && puedeEditar}
        onCerrar={cerrarEdicion}
        titulo={t('inmobiliaria.propietarios.editOwner')}
        descripcion={propietarioQueSeEdita?.name}
        aviso={errorAlEditar?.general}
        idDelFormulario={idDeLaEdicion}
        textoDelBoton={t('inmobiliaria.propietario.form.saveChanges')}
        guardando={guardandoEdicion}
      >
        {propietarioQueSeEdita && (
          <PropietarioForm
            initialData={propietarioQueSeEdita}
            onSubmit={handleEditSubmit}
            onCancel={cerrarEdicion}
            mode="edit"
            serverError={errorAlEditar?.campo ?? null}
            serverErrors={errorAlEditar?.porCampo ?? null}
            accionesAfuera
            idDelFormulario={idDeLaEdicion}
          />
        )}
      </CajonDelFormulario>

      {/* Delete Confirmation Modal — destructiva: dice qué se borra (la ficha
          entera; el back hace un `delete`, no la archiva) y, si algo lo
          retiene, por qué y a dónde ir. */}
      <Modal
        open={!!deletingPropietario && puedeEliminar}
        onClose={cerrarEliminar}
        title={t('inmobiliaria.propietarios.deleteOwner')}
        description={
          propietarioQueSeBorra
            ? t('inmobiliaria.propietarios.deleteConfirm', { name: propietarioQueSeBorra.name })
            : undefined
        }
        size="sm"
        variant="destructive"
        footer={
          propietarioQueSeBorra ? (
            <>
              <Button
                variant="secondary"
                hideArrow
                onClick={cerrarEliminar}
                disabled={isDeleting}
              >
                {t('inmobiliaria.common.cancel')}
              </Button>
              <Button
                variant="destructive"
                hideArrow
                onClick={handleConfirmDelete}
                isLoading={isDeleting}
                disabled={isDeleting || borradoBloqueado}
                title={borradoBloqueado ? 'Primero retira o reasigna los mandatos donde figura como dueño' : undefined}
                data-testid="confirmar-eliminar"
              >
                {t('inmobiliaria.common.delete')}
              </Button>
            </>
          ) : null
        }
      >
        {/* O5 — lo mismo que la ficha: qué lo retiene y a dónde ir. El aviso
            ámbar de antes lo decía, pero dejaba el botón activo y el clic
            terminaba en el 409. */}
        {propietarioQueSeBorra && borradoBloqueado && (
          <AlertaAccionable
            severidad="danger"
            titulo={
              /* P-26: «1 inmueble consignado» / «3 inmuebles consignados», no «inmueble(s)». */
              inmueblesDelBorrado > 0
                ? inmueblesDelBorrado === 1
                  ? t('inmobiliaria.propietarios.deleteBloqueado.tituloUno')
                  : t('inmobiliaria.propietarios.deleteBloqueado.tituloN', { count: inmueblesDelBorrado })
                : copropiedadesDelBorrado === 1
                  ? t('inmobiliaria.propietarios.deleteBloqueado.tituloCopropietarioUno')
                  : t('inmobiliaria.propietarios.deleteBloqueado.tituloCopropietarioN', {
                      count: copropiedadesDelBorrado,
                    })
            }
            accion={{
              label: t('inmobiliaria.propietarios.deleteBloqueado.accion'),
              href: '/panel/inmobiliaria/inmuebles',
            }}
            data-testid="borrar-bloqueado"
          >
            {/* Como en la ficha: a un copropietario no se le pide retirar
                mandatos desde el portafolio, sino quitarlo del reparto. */}
            {inmueblesDelBorrado > 0
              ? t('inmobiliaria.propietarios.deleteBloqueado.detalle')
              : t('inmobiliaria.propietarios.deleteBloqueado.detalleCopropietario')}
          </AlertaAccionable>
        )}
        {/* O1 — el motivo del back cuando igual lo rechaza (p. ej. una
            copropiedad que la lista no cuenta). Se queda en el diálogo. */}
        {propietarioQueSeBorra && motivoAlEliminar && (
          <p
            role="alert"
            data-testid="motivo-al-eliminar"
            className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
          >
            {motivoAlEliminar}
          </p>
        )}
      </Modal>
    </div>
  );
}

export default function PropietariosPage() {
  return (
    <PageGuard module="propietarios">
      <PropietariosContent />
    </PageGuard>
  );
}
