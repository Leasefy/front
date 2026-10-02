'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { useLenis } from '@/components/providers/SmoothScroll';
import { ApiError } from '@/lib/api/client';
import { agencyApi, inmobiliariaConfigApi } from '@/lib/api/inmobiliaria.service';
import { camposDelError, mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { validarCorreo } from '@/lib/auth/correo';
import type { AgencyInviteResult, AgencyRole, AgencyUser, UserInvite } from '@/lib/types/inmobiliaria';
import { ConAcceso, quienesTienenAcceso, type LoDeEstaVisita } from './ConAcceso';
import { EnlaceDeInvitacion, type EnlaceVisible } from './EnlaceDeInvitacion';
import { FormularioDeInvitacion, type FalloDelEnvio } from './FormularioDeInvitacion';
import { copiarAlPortapapeles, enlaceDeLaInvitacion } from './enlace-de-la-invitacion';
import { estadoDelCorreo } from './estado-de-la-invitacion';
import { ROL_POR_DEFECTO } from './roles-para-invitar';
import { useMovimiento } from './movimiento';

/**
 * «Invitar a tu equipo» — el modal del ícono de persona con «+» del encabezado
 * del panel de la inmobiliaria (02-10-2026).
 *
 * Reemplaza al popover de antes (cabecera gris, cuatro tarjetas grandes de rol,
 * avatares sueltos), que Nico encontró pesado, sobre todo en oscuro. Sigue la
 * referencia que trajo —un modal de «Compartir» con mucho aire— con lo de
 * Leasefy:
 *
 *   · La primitiva `Dialog` (foco atrapado, Esc, la ✕ única del producto, el
 *     velo desenfocado y las esquinas de 24 px); bajo 640 px la misma
 *     primitiva sube como hoja desde abajo. Ningún estilo suyo se pisa acá.
 *   · «Con acceso (N)»: miembros activos e invitaciones pendientes.
 *   · «Invitar»: nombre, correo y rol. Sólo la ve quien puede invitar (el
 *     ADMINISTRADOR: el back corta a cualquier otro rol con 403).
 *   · El enlace personal de CADA invitación (decisión de Nico, no uno abierto):
 *     aparece al invitar o reenviar, con «Copiar», para pasarlo por WhatsApp
 *     cuando el correo no llega (lo que le pasó a Alexis).
 *
 * Movimiento (`movimiento.ts`): el modal entra y sale con el `Dialog`, el
 * indicador de la pestaña se desliza con el `layoutId` de `Tabs`, y acá se
 * animan el bloque del enlace, «Copiar» → «Copiado», las filas que llegan o
 * se van, la confirmación de cancelar y los avisos.
 *
 * 🔒 El enlace vive sólo en la memoria de este componente: ni `localStorage`,
 * ni la URL, ni logs. Al cerrar el modal deja de mostrarse; lo que se sabe del
 * correo de cada invitación de esta visita se conserva hasta salir del panel.
 */

const TITULO = 'Invitar a tu equipo';
const SUBTITULO = 'Dale acceso a la gente de tu inmobiliaria y decide qué puede hacer cada quien.';
const EQUIPO_EN_CONFIGURACION = '/panel/inmobiliaria/configuracion/equipo';

type Pestana = 'con-acceso' | 'invitar';

export interface AccionesDelEquipo {
  invitar: (invite: UserInvite) => Promise<AgencyInviteResult>;
  reenviar: (memberId: string) => Promise<AgencyInviteResult>;
  cancelar: (memberId: string) => Promise<void>;
}

const ACCIONES_REALES: AccionesDelEquipo = {
  invitar: (invite) => inmobiliariaConfigApi.inviteUser(invite),
  reenviar: (memberId) => agencyApi.resendInvitation(memberId),
  // Cancelar = quitar la fila (`REMOVED`): el token deja de servir porque el
  // back sólo acepta invitaciones en estado INVITED.
  cancelar: (memberId) => inmobiliariaConfigApi.deleteUser(memberId),
};

export interface InvitarAlEquipoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  miembros: AgencyUser[];
  cargando: boolean;
  error: unknown;
  /** Devuelve la promesa del reintento: «Intentar de nuevo» queda ocupado mientras dura. */
  onReintentar: () => unknown;
  /** Recargar el equipo después de invitar, reenviar o cancelar. */
  onCambio: () => unknown;
  /** Sólo el administrador invita (`agenciaQueAdministra` en el back). */
  puedeInvitar: boolean;
  correoPropio?: string;
  /** Para las pruebas; en la app pega al back. */
  acciones?: AccionesDelEquipo;
}

function esLaMisma(a: string | undefined, b: string | undefined): boolean {
  return !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function InvitarAlEquipo({
  open,
  onOpenChange,
  miembros,
  cargando,
  error,
  onReintentar,
  onCambio,
  puedeInvitar,
  correoPropio,
  acciones = ACCIONES_REALES,
}: InvitarAlEquipoProps) {
  const router = useRouter();
  const lenis = useLenis();
  const mov = useMovimiento();

  const conAcceso = quienesTienenAcceso(miembros);

  // Al abrir: con el equipo vacío (sólo tú), directo a «Invitar». Se decide
  // EN el render en que se abre —no en un efecto—: el `Dialog` pone el foco en
  // la pestaña activa al montarse, y con un efecto el foco quedaba en «Con
  // acceso» mientras se mostraba «Invitar». Una lista que llega después no le
  // cambia la pestaña a quien ya está mirando.
  const pestanaAlAbrir = (): Pestana => {
    const nadieMas = conAcceso.every((m) => esLaMisma(m.email, correoPropio));
    return puedeInvitar && !cargando && nadieMas ? 'invitar' : 'con-acceso';
  };
  const [pestana, setPestana] = useState<Pestana>(() => (open ? pestanaAlAbrir() : 'con-acceso'));
  const [estabaAbierto, setEstabaAbierto] = useState(open);
  if (open !== estabaAbierto) {
    setEstabaAbierto(open);
    if (open) setPestana(pestanaAlAbrir());
  }
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [rol, setRol] = useState<AgencyRole>(ROL_POR_DEFECTO);
  const [errorDelCorreo, setErrorDelCorreo] = useState<string | null>(null);
  const [sugerencia, setSugerencia] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [fallo, setFallo] = useState<FalloDelEnvio | null>(null);
  const [enlace, setEnlace] = useState<EnlaceVisible | null>(null);
  const [deEstaVisita, setDeEstaVisita] = useState<Record<string, LoDeEstaVisita>>({});
  const [ocupado, setOcupado] = useState<string | null>(null);
  // Invitaciones de esta visita que todavía no se vieron en «Con acceso»: se
  // crean desde «Invitar» y la lista se monta recién al volver a su pestaña,
  // así que la fila entra animada ahí, una sola vez.
  const [recienLlegadas, setRecienLlegadas] = useState<ReadonlySet<string>>(() => new Set());
  const [enfocarCopiar, setEnfocarCopiar] = useState(0);
  const copiarRef = useRef<HTMLButtonElement>(null);
  const correoRef = useRef<HTMLInputElement>(null);

  // DESIGN.md §8: Lenis no se frena con el bloqueo de scroll de Radix. El
  // contador de `SmoothScroll` hace seguro pedirlo también desde acá.
  useEffect(() => {
    if (!open) return;
    lenis.stop();
    return () => lenis.start();
  }, [open, lenis]);

  // Después de invitar o reenviar, el foco va a «Copiar»: es lo siguiente que
  // se hace, y lleva el bloque del enlace a la vista en una pantalla chica.
  useEffect(() => {
    if (enfocarCopiar > 0) copiarRef.current?.focus();
  }, [enfocarCopiar]);

  const cambiarAbierto = (abierto: boolean) => {
    if (!abierto) {
      // Lo escrito y el enlace en pantalla no sobreviven al cierre.
      setNombre('');
      setCorreo('');
      setRol(ROL_POR_DEFECTO);
      setErrorDelCorreo(null);
      setSugerencia(null);
      setFallo(null);
      setEnlace(null);
      setRecienLlegadas(new Set());
    }
    onOpenChange(abierto);
  };

  const irA = (href: string) => {
    cambiarAbierto(false);
    router.push(href);
  };

  const revisarCorreo = () => {
    if (!correo.trim()) {
      setErrorDelCorreo(null);
      setSugerencia(null);
      return;
    }
    const v = validarCorreo(correo);
    setErrorDelCorreo(v.ok ? null : v.motivo);
    setSugerencia(v.sugerencia);
  };

  const enviar = async () => {
    if (enviando) return;
    const v = validarCorreo(correo);
    if (!correo.trim() || !v.ok) {
      setErrorDelCorreo(!correo.trim() ? 'Escribe el correo de la persona.' : v.ok ? null : v.motivo);
      correoRef.current?.focus();
      return;
    }
    const email = v.correo;
    const nombreLimpio = nombre.trim();
    setEnviando(true);
    setFallo(null);
    try {
      const respuesta = await acciones.invitar({ email, name: nombreLimpio, role: rol });
      const enlaceNuevo = enlaceDeLaInvitacion(respuesta);
      const comoLeFue = estadoDelCorreo(respuesta);
      setDeEstaVisita((antes) => ({ ...antes, [respuesta.id]: { correo: comoLeFue, enlace: enlaceNuevo } }));
      setRecienLlegadas((antes) => new Set(antes).add(respuesta.id));
      if (enlaceNuevo) {
        setEnlace({
          memberId: respuesta.id,
          email,
          nombre: nombreLimpio,
          enlace: enlaceNuevo,
          correo: comoLeFue,
          reenviado: false,
        });
        setEnfocarCopiar((n) => n + 1);
      } else {
        // Un back que no manda ni el token: se dice lo que se sabe.
        setEnlace(null);
        toast.success('Invitación creada', { description: `${email} ya está en la lista de invitaciones pendientes.` });
      }
      // El rol se queda: invitar a tres asesores seguidos no pide elegirlo tres veces.
      setNombre('');
      setCorreo('');
      setErrorDelCorreo(null);
      setSugerencia(null);
      void onCambio();
    } catch (err) {
      // Un 400 sobre el correo va debajo del campo (el traductor de errores
      // del front, `camposDelError`); lo demás, en el aviso del formulario.
      const campos = camposDelError(err);
      const delCorreo = campos.find((c) => c.campo === 'email');
      if (delCorreo) {
        setErrorDelCorreo(delCorreo.mensaje);
        correoRef.current?.focus();
      }
      setFallo(
        delCorreo && campos.length === 1
          ? null
          : {
              mensaje: mensajeParaLaPersona(err, {
                porDefecto: 'No pudimos crear la invitación. Intenta de nuevo.',
                accion: 'crear la invitación',
              }),
              tope: err instanceof ApiError && err.status === 402,
            },
      );
    } finally {
      setEnviando(false);
    }
  };

  const yaSeVio = useCallback((id: string) => {
    setRecienLlegadas((antes) => {
      if (!antes.has(id)) return antes;
      const resto = new Set(antes);
      resto.delete(id);
      return resto;
    });
  }, []);

  const nombreDe = (m: AgencyUser) => (esLaMisma(m.name, m.email) ? '' : m.name ?? '');

  const copiarDeLaLista = async (m: AgencyUser) => {
    const deLaVisita = deEstaVisita[m.id];
    if (!deLaVisita?.enlace) return;
    setEnlace({
      memberId: m.id,
      email: m.email,
      nombre: nombreDe(m),
      enlace: deLaVisita.enlace,
      correo: deLaVisita.correo ?? 'sent',
      reenviado: false,
    });
    if (await copiarAlPortapapeles(deLaVisita.enlace)) {
      toast.success('Enlace copiado', { description: `Pásaselo a ${m.email}. Sólo sirve para ese correo.` });
    } else {
      setEnfocarCopiar((n) => n + 1);
    }
  };

  const reenviar = async (m: AgencyUser) => {
    setOcupado(m.id);
    try {
      const respuesta = await acciones.reenviar(m.id);
      const enlaceNuevo = enlaceDeLaInvitacion(respuesta);
      const comoLeFue = estadoDelCorreo(respuesta);
      setDeEstaVisita((antes) => ({ ...antes, [m.id]: { correo: comoLeFue, enlace: enlaceNuevo } }));
      if (enlaceNuevo) {
        setEnlace({
          memberId: m.id,
          email: m.email,
          nombre: nombreDe(m),
          enlace: enlaceNuevo,
          correo: comoLeFue,
          reenviado: true,
        });
        if (await copiarAlPortapapeles(enlaceNuevo)) {
          toast.success('Enlace nuevo copiado', { description: `El anterior ya no sirve. Pásaselo a ${m.email}.` });
        }
        setEnfocarCopiar((n) => n + 1);
      } else {
        toast.success('Invitación reenviada', { description: `Le mandamos un enlace nuevo a ${m.email}.` });
      }
      void onCambio();
    } catch (err) {
      toast.error('No pudimos reenviar la invitación', {
        description: mensajeParaLaPersona(err, { porDefecto: 'Intenta de nuevo en unos minutos.' }),
      });
    } finally {
      setOcupado(null);
    }
  };

  const cancelar = async (m: AgencyUser): Promise<boolean> => {
    setOcupado(m.id);
    try {
      await acciones.cancelar(m.id);
      setDeEstaVisita((antes) => {
        const resto = { ...antes };
        delete resto[m.id];
        return resto;
      });
      setEnlace((actual) => (actual?.memberId === m.id ? null : actual));
      toast.success('Invitación cancelada', { description: `El enlace de ${m.email} ya no sirve.` });
      void onCambio();
      return true;
    } catch (err) {
      toast.error('No pudimos cancelar la invitación', {
        description: mensajeParaLaPersona(err, { porDefecto: 'Intenta de nuevo.' }),
      });
      return false;
    } finally {
      setOcupado(null);
    }
  };

  const lista = (
    <ConAcceso
      miembros={conAcceso}
      cargando={cargando}
      error={error}
      onReintentar={onReintentar}
      correoPropio={correoPropio}
      puedeInvitar={puedeInvitar}
      deEstaVisita={deEstaVisita}
      recienLlegadas={recienLlegadas}
      onYaSeVio={yaSeVio}
      ocupado={ocupado}
      onCopiarEnlace={(m) => void copiarDeLaLista(m)}
      onReenviar={(m) => void reenviar(m)}
      onCancelar={cancelar}
      onIrAInvitar={() => setPestana('invitar')}
      onIrAConfiguracion={() => irA(EQUIPO_EN_CONFIGURACION)}
    />
  );

  const cuerpo = (
    <div className="space-y-6">
      {/* Entra con su propia animación (ver `EnlaceDeInvitacion`); acá sólo
          su salida, al cancelar esa invitación. */}
      <AnimatePresence initial={false}>
        {enlace && (
          <motion.div key="enlace" exit={mov.llega.exit}>
            <EnlaceDeInvitacion ref={copiarRef} enlace={enlace} />
          </motion.div>
        )}
      </AnimatePresence>

      {puedeInvitar ? (
        <Tabs value={pestana} onValueChange={(v) => setPestana(v as Pestana)}>
          <TabsList className="w-full justify-start" aria-label="Equipo">
            <TabsTrigger value="con-acceso">
              Con acceso <span className="ml-1 font-mono tabular-nums">({conAcceso.length})</span>
            </TabsTrigger>
            <TabsTrigger value="invitar">Invitar</TabsTrigger>
          </TabsList>
          <TabsContent value="con-acceso" className="mt-5 focus-visible:outline-none">
            {lista}
          </TabsContent>
          <TabsContent value="invitar" className="mt-5 focus-visible:outline-none">
            <FormularioDeInvitacion
              ref={correoRef}
              nombre={nombre}
              correo={correo}
              rol={rol}
              errorDelCorreo={errorDelCorreo}
              sugerencia={sugerencia}
              enviando={enviando}
              fallo={fallo}
              onNombre={setNombre}
              onCorreo={(v) => {
                setCorreo(v);
                setErrorDelCorreo(null);
                setSugerencia(null);
              }}
              onSalirDelCorreo={revisarCorreo}
              onUsarSugerencia={() => {
                if (sugerencia) setCorreo(sugerencia);
                setSugerencia(null);
                setErrorDelCorreo(null);
              }}
              onRol={(r) => {
                setRol(r);
                setFallo(null);
              }}
              onEnviar={() => void enviar()}
              onVerPlanes={() => cambiarAbierto(false)}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <section aria-labelledby="con-acceso-titulo" className="space-y-4">
          <h3 id="con-acceso-titulo" className="border-b border-border-faint pb-2 text-sm font-medium text-fg">
            Con acceso <span className="font-mono tabular-nums text-fg-muted">({conAcceso.length})</span>
          </h3>
          {lista}
        </section>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={cambiarAbierto}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{TITULO}</DialogTitle>
          <DialogDescription>{SUBTITULO}</DialogDescription>
        </DialogHeader>
        {cuerpo}
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => cambiarAbierto(false)}>
            Listo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
