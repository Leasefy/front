'use client';

/**
 * «A N inquilinos no les llegó su invitación» — el aviso y el cajón que la manda.
 *
 * ── Por qué esta pantalla existe ────────────────────────────────────────────
 *
 * Una cuenta creada por la migración existe pero su dueño no puede entrar:
 * nunca eligió una contraseña. Lo único que la vuelve utilizable es el correo
 * con el enlace. El 8 de septiembre de 2026 se crearon 1.470 cuentas de
 * inquilino y salieron 24 correos, y no había forma de enterarse: la lista de
 * inquilinos los mostraba igual, como si estuvieran adentro.
 *
 * ── Dos decisiones ──────────────────────────────────────────────────────────
 *
 * 1. **El aviso sólo aparece cuando hay pendientes.** No es una sección del
 *    menú: es una deuda que se salda y desaparece. Una pantalla vacía
 *    permanente enseña a ignorarla.
 * 2. **Se manda por tandas y se dice cuánto falta.** El back manda de a 100
 *    por llamada; acá el botón sigue llamando mientras `restantes > 0` y la
 *    barra dice el número real. Mandar 100 sobre 1.500 y decir «listo» es
 *    volver a dejar a 1.400 personas afuera creyendo lo contrario.
 */

import { useCallback, useEffect, useState } from 'react';
import { EnvelopeSimple, PaperPlaneTilt, Warning } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import {
  Cajon,
  CajonCabecera,
  CajonCuerpo,
  CajonPie,
} from '@/components/ui/cajon';
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla';
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableBodyAnimado,
  TableRowAnimada,
} from '@/components/ui/table';
import { CrossFade } from '@leasefy/cadence';

import { toast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import { ApiError } from '@/lib/api/client';
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import {
  invitacionesApi,
  type FilaDeTanda,
  type PersonaPendiente,
} from '@/lib/api/invitaciones.service';

/** Cuántas filas se listan en el cajón. El total real va en la cabecera. */
const A_LA_VISTA = 50;

/** M-06 (18-09): la vigencia de la invitación cuando el back no la manda. */
const DIAS_DE_VIGENCIA_POR_DEFECTO = 7;

function comoFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
  });
}

/**
 * 🔴 I-24 (QA-INQ, 03-10): el motivo por el que NO salió una invitación, en
 * palabras y con qué hacer. El back manda un CÓDIGO (`DOMINIO_NO_ENTREGABLE`…)
 * y hasta hoy la pantalla lo pintaba tal cual. Un código que no está acá
 * tampoco se muestra: se dice lo general.
 */
export function fraseDelMotivo(motivo: string | undefined): string {
  switch (motivo) {
    case 'RECIEN_ENVIADA':
      return 'Ya se la mandamos hace menos de 10 minutos. Espera un rato antes de volver a mandarla.';
    case 'DOMINIO_NO_ENTREGABLE':
      return 'Su correo es de un dominio que no recibe mensajes (de prueba o reservado). Cámbialo por su correo real y vuelve a mandarla.';
    case 'CORREO_NO_CONFIGURADO':
      return 'El envío de correos no está disponible en este momento. Vuelve a intentarlo más tarde; si sigue igual, escríbenos.';
    case 'ENVIO_FALLIDO':
      return 'El correo no salió esta vez. Vuelve a intentarlo en unos minutos.';
    default:
      return 'No pudimos mandarla. Vuelve a intentarlo en unos minutos.';
  }
}

/**
 * E-13: por qué no salió NINGUNA en una corrida, leído de lo que dijo el back
 * de cada una. Antes era siempre «revisa que el correo del servidor esté
 * configurado», también cuando lo que pasaba era que ya se habían mandado hace
 * un rato o que los correos eran de dominios de prueba. Gana el motivo más
 * repetido.
 */
export function porQueNoSalioNinguna(resultados: readonly FilaDeTanda[]): string {
  const cuantas = new Map<string, number>();
  for (const r of resultados) {
    if (r.enviada) continue;
    const motivo = r.motivo ?? 'ERROR';
    cuantas.set(motivo, (cuantas.get(motivo) ?? 0) + 1);
  }
  let elMasRepetido: string | undefined;
  let mas = 0;
  for (const [motivo, n] of cuantas) {
    if (n > mas) {
      elMasRepetido = motivo;
      mas = n;
    }
  }
  if (elMasRepetido === 'RECIEN_ENVIADA') {
    return 'Ya se las mandamos hace menos de 10 minutos. Espera un rato antes de volver a mandarlas.';
  }
  if (elMasRepetido === 'DOMINIO_NO_ENTREGABLE') {
    return 'Las que quedan tienen correos de dominios que no reciben mensajes (de prueba o reservados). Cámbialos por los correos reales y vuelve a mandarlas.';
  }
  return fraseDelMotivo(elMasRepetido);
}

/**
 * E-15: ¿el fallo de la lectura es de los que se callan? Sin permiso (403) o
 * sin sesión, sí: el aviso no le corresponde a esta persona. Un 5xx o la red
 * caída, NO: escondían la deuda de invitaciones como si no hubiera ninguna.
 */
function falloQueSeCalla(error: unknown): boolean {
  if (error instanceof ApiError) return error.status > 0 && error.status < 500;
  return !(error instanceof TypeError);
}

export function InvitacionesPendientes({ version = 0 }: {
  /**
   * I-23: sube cuando la pantalla sabe que cambió la lista (se creó un
   * inquilino con correo) y el aviso se vuelve a leer. Sin esto decía «A 2…»
   * con 3 pendientes hasta recargar.
   */
  version?: number;
} = {}) {
  const [total, setTotal] = useState<number | null>(null);
  /** E-12: cuántas de `total` ya salieron y vencieron (el back las suma en `total`). */
  const [vencidas, setVencidas] = useState(0);
  const [personas, setPersonas] = useState<PersonaPendiente[]>([]);
  const [cargando, setCargando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [mandando, setMandando] = useState(false);
  /** Cuántas salieron en la corrida actual, para la línea de progreso. */
  const [yaSalieron, setYaSalieron] = useState(0);
  const [reenviando, setReenviando] = useState<string | null>(null);
  /** E-15: la lectura falló por algo que no es «no te toca». */
  const [falloLaLectura, setFalloLaLectura] = useState(false);

  /*
   * I-26: mandar invitaciones pide `clientes:edit` en el back
   * (`invitaciones.controller.ts`). El contador y el viewer ven el aviso
   * (`clientes:view`) y antes recibían un 403 en inglés al tocar «Enviar».
   * Fuera del layout del panel (las pruebas del componente) no hay contexto y
   * no se recorta nada.
   */
  const permisos = usePermissionsContextSafe();
  const puedeEnviar = permisos ? permisos.canAccess('clientes', 'edit') : true;

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await invitacionesApi.pendientes({ limite: A_LA_VISTA });
      setTotal(r.total);
      setVencidas(r.vencidas ?? 0);
      setPersonas(r.personas);
      setFalloLaLectura(false);
    } catch (e) {
      /* Sin permiso: el aviso simplemente no se pinta. Un error rojo
         permanente sobre algo que nadie pidió es ruido. Un 5xx o la red, en
         cambio, se dicen (E-15): callarlos es decir «no hay pendientes». */
      setTotal(0);
      setFalloLaLectura(!falloQueSeCalla(e));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar, version]);

  const diasDeVigencia = personas.find((p) => p.diasDeVigencia)?.diasDeVigencia ?? DIAS_DE_VIGENCIA_POR_DEFECTO;

  /**
   * Manda hasta agotar, llamando por tandas.
   *
   * 🔴 El corte por vueltas no es una optimización: sin él, un fallo que deja
   * la fila pendiente para siempre convierte esto en un bucle infinito que
   * manda correos sin parar.
   */
  const mandarTodas = useCallback(async () => {
    setMandando(true);
    setYaSalieron(0);
    let salieron = 0;
    let quedan = total ?? 0;
    let ultimosResultados: FilaDeTanda[] = [];
    try {
      for (let vuelta = 0; vuelta < 40; vuelta += 1) {
        const r = await invitacionesApi.enviar({});
        ultimosResultados = r.resultados ?? [];
        salieron += r.enviadas;
        quedan = r.restantes;
        setYaSalieron(salieron);
        setTotal(r.restantes);
        // Ninguna salió en esta vuelta: seguir sería repetir la misma tanda.
        if (r.enviadas === 0 || r.restantes === 0) break;
      }
      if (salieron > 0) {
        toast.success(
          salieron === 1
            ? 'Salió 1 invitación'
            : `Salieron ${salieron} invitaciones`,
          {
            description:
              quedan > 0
                ? `Quedan ${quedan} por mandar. Vuelve a intentarlo.`
                : 'Ya no queda ninguna pendiente.',
          },
        );
      } else {
        toast.error('No salió ninguna invitación', {
          description: porQueNoSalioNinguna(ultimosResultados),
        });
      }
    } catch (e) {
      /*
       * Con la regla de oro (02-10-2026): un 4xx dice lo que dijo el back, un
       * 5xx «de nuestro lado» con la referencia y la red, la conexión. Si ya
       * habían salido algunas, se dice cuántas: «no se pudieron» sobre 300
       * enviadas es mentir al revés.
       */
      toast.error(
        salieron > 0
          ? `Salieron ${salieron} ${salieron === 1 ? 'invitación' : 'invitaciones'} y se cortó el envío`
          : 'No se pudieron mandar las invitaciones',
        {
          description:
            mensajeParaLaPersona(e, { porDefecto: '', accion: 'mandar las invitaciones' }) || undefined,
        },
      );
    } finally {
      setMandando(false);
      void cargar();
    }
  }, [total, cargar]);

  const reenviarUna = useCallback(
    async (persona: PersonaPendiente) => {
      setReenviando(persona.id);
      try {
        const r = await invitacionesApi.enviar({ userIds: [persona.id] });
        if (r.enviadas === 1) {
          toast.success(`Invitación enviada a ${persona.correo}`);
        } else {
          toast.error(`No salió la invitación a ${persona.correo}`, {
            description: fraseDelMotivo(r.resultados[0]?.motivo),
          });
        }
      } catch (e) {
        toast.error(`No salió la invitación a ${persona.correo}`, {
          description: mensajeParaLaPersona(e, { porDefecto: '', accion: 'mandar la invitación' }) || undefined,
        });
      } finally {
        setReenviando(null);
        void cargar();
      }
    },
    [cargar],
  );

  /*
   * E-15: la lectura falló (un 5xx, la red). No es «no hay pendientes»: se
   * dice, chico y con su reintento, en el mismo lugar del aviso.
   */
  if (falloLaLectura) {
    return (
      <div
        data-testid="invitaciones-sin-leer"
        role="status"
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3"
      >
        <p className="text-sm text-fg-muted">
          No pudimos revisar si hay invitaciones al portal sin entregar.
        </p>
        <Button hideArrow variant="outline" size="sm" onClick={() => void cargar()}>
          Reintentar
        </Button>
      </div>
    );
  }

  // Nada pendiente (o todavía sin saberlo): no hay nada que decir.
  if (total === null || total === 0) return null;

  /** Las que nunca llegaron (el «no les ha llegado»); las vencidas se dicen aparte. */
  const sinLlegar = Math.max(0, total - vencidas);

  return (
    <>
      <div
        data-testid="invitaciones-pendientes"
        className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border bg-surface-muted p-4"
      >
        <div className="flex min-w-0 items-start gap-3">
          <Warning
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-fg-muted"
            weight="duotone"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-fg">
              {sinLlegar === 0
                ? vencidas === 1
                  ? 'A 1 inquilino se le venció la invitación al portal'
                  : `A ${vencidas} inquilinos se les venció la invitación al portal`
                : sinLlegar === 1
                  ? 'A 1 inquilino no le ha llegado su invitación al portal'
                  : `A ${sinLlegar} inquilinos no les ha llegado su invitación al portal`}
            </p>
            {sinLlegar > 0 && vencidas > 0 ? (
              <p className="mt-0.5 text-sm text-fg-muted" data-testid="invitaciones-vencidas">
                {vencidas === 1
                  ? 'Y a 1 se le venció la que le mandamos: reenvíasela.'
                  : `Y a ${vencidas} se les venció la que les mandamos: reenvíaselas.`}
              </p>
            ) : null}
            <p className="mt-0.5 text-sm text-fg-muted">
              Su cuenta está creada, pero sin ese correo no pueden poner su
              contraseña ni entrar a ver su contrato.
            </p>
            {/* I-26: sin `clientes:edit` el aviso se queda —la deuda existe—,
                pero no se ofrece mandar: se dice quién puede. */}
            {!puedeEnviar ? (
              <p className="mt-1.5 text-sm text-fg-muted" data-testid="invitaciones-sin-permiso">
                Mandarlas lo puede hacer un administrador de tu inmobiliaria: pídeselo.
              </p>
            ) : null}
          </div>
        </div>
        {puedeEnviar ? (
          <Button
            hideArrow
            variant="outline"
            className="shrink-0 gap-2"
            onClick={() => setAbierto(true)}
            data-testid="ver-invitaciones-pendientes"
          >
            <EnvelopeSimple className="h-4 w-4" weight="bold" aria-hidden="true" />
            Ver y enviar
          </Button>
        ) : null}
      </div>

      <Cajon
        abierto={abierto && puedeEnviar}
        onOpenChange={setAbierto}
        ancho="sm:max-w-2xl"
        data-testid="cajon-invitaciones"
      >
        <CajonCabecera
          titulo="Invitaciones al portal"
          descripcion={
            total === 1
              ? '1 inquilino con la cuenta creada y sin invitación entregada.'
              : `${total} inquilinos con la cuenta creada y sin invitación entregada.`
          }
        />

        <CajonCuerpo>
          {/* Cargando → la lista: se cruzan (`popLayout`: la tabla entra YA y
              el esqueleto se va por encima). */}
          <CrossFade swapKey={cargando ? 'cargando' : 'lista'} mode="popLayout">
            {cargando ? (
              <EsqueletoTabla columnas={3} filas={6} />
            ) : (
              /*
               * A SANGRE (Nico, 03-10: «no respeta pegando bien el contenido
               * a los paddings»): la banda de la cabecera y el hover de las
               * filas tocan los bordes del cajón (`-mx-6`, el padding del
               * `SheetBody`), y la primera y la última celda llevan ese mismo
               * padding. Así el nombre arranca donde arranca el título y
               * «Enviar» termina donde termina el padding de la derecha.
               */
              <div className="-mx-6" data-testid="invitaciones-tabla">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Persona</TableHead>
                      {/* A 390 px la columna no cabe: su dato baja bajo el nombre. */}
                      <TableHead className="hidden sm:table-cell">Invitación</TableHead>
                      <TableHead className="pr-6">
                        <span className="sr-only">Acción</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  {/* La que ya salió y deja de estar pendiente se va con su
                      salida (`key` = el id). */}
                  <TableBodyAnimado>
                    {personas.length === 0 ? (
                      <TableRowAnimada key="ninguna">
                        <TableCell colSpan={3} className="px-6 py-8 text-center text-sm text-fg-muted">
                          No queda ninguna pendiente.
                        </TableCell>
                      </TableRowAnimada>
                    ) : (
                      personas.map((p) => (
                        <TableRowAnimada key={p.id} data-testid="invitacion-fila">
                          <TableCell className="pl-6">
                            <span className="block text-sm font-medium text-fg">
                              {p.nombre ?? p.correo}
                            </span>
                            {p.nombre ? (
                              <span className="block text-xs text-fg-muted">{p.correo}</span>
                            ) : null}
                            <div className="mt-1 text-sm text-fg-muted sm:hidden">
                              <EstadoDeLaInvitacion persona={p} />
                            </div>
                          </TableCell>
                          <TableCell className="hidden text-sm text-fg-muted sm:table-cell">
                            <EstadoDeLaInvitacion persona={p} conIds />
                          </TableCell>
                          <TableCell className="pr-6 text-right">
                            <Button
                              hideArrow
                              variant="ghost"
                              size="sm"
                              className="gap-1.5"
                              disabled={reenviando === p.id || mandando}
                              onClick={() => void reenviarUna(p)}
                            >
                              <PaperPlaneTilt className="h-4 w-4" aria-hidden="true" />
                              {reenviando === p.id ? 'Enviando…' : p.ultimoEnvio ? 'Reenviar' : 'Enviar'}
                            </Button>
                          </TableCell>
                        </TableRowAnimada>
                      ))
                    )}
                  </TableBodyAnimado>
                </Table>
              </div>
            )}
          </CrossFade>

          {total > personas.length ? (
            <p className="mt-3 text-xs text-fg-muted">
              Se listan las {personas.length} más recientes. «Enviar a todos»
              las cubre todas, incluidas las {total - personas.length} que no
              están en pantalla.
            </p>
          ) : null}
        </CajonCuerpo>

        <CajonPie
          ayuda={
            mandando
              ? `Enviando… ${yaSalieron} de ${yaSalieron + (total ?? 0)}`
              : `Cada persona recibe un enlace para poner su contraseña. Vence en ${diasDeVigencia} ${diasDeVigencia === 1 ? 'día' : 'días'}.`
          }
        >
          <Button variant="outline" hideArrow onClick={() => setAbierto(false)}>
            Cerrar
          </Button>
          <Button
            hideArrow
            className="gap-2"
            // «A todos» manda las que nunca salieron; las vencidas se reenvían
            // una por una (E-12, así lo hace el back).
            disabled={mandando || sinLlegar === 0}
            onClick={() => void mandarTodas()}
            data-testid="enviar-todas-las-invitaciones"
          >
            <PaperPlaneTilt className="h-4 w-4" weight="bold" aria-hidden="true" />
            {mandando ? 'Enviando…' : `Enviar a todos (${sinLlegar})`}
          </Button>
        </CajonPie>
      </Cajon>
    </>
  );
}

/**
 * Cuándo se creó la cuenta, si ya se intentó y hasta cuándo sirve la
 * invitación. En escritorio es su columna; a 390 px va bajo el nombre.
 */
function EstadoDeLaInvitacion({ persona: p, conIds = false }: { persona: PersonaPendiente; conIds?: boolean }) {
  return (
    <>
      <span className="block">Cuenta creada el {comoFecha(p.creada)}</span>
      {/* Que ya haya salido una y siga pendiente significa
          que esa no llegó: decirlo evita que alguien crea
          que el botón no hizo nada. */}
      {p.ultimoEnvio ? (
        <span className="block text-xs">
          Se intentó el {comoFecha(p.ultimoEnvio)}
        </span>
      ) : null}
      {/* E-12 (Nico, 03-10): cuándo vence, y la vencida
          marcada. Nunca salió = no vence: está sin mandar. */}
      {p.vencida ? (
        <Badge variant="warning" className="mt-1" data-testid={conIds ? 'invitacion-vencida' : undefined}>
          {p.vence ? `Venció el ${comoFecha(p.vence)}` : 'Vencida'}
        </Badge>
      ) : p.vence ? (
        <span className="block text-caption" data-testid={conIds ? 'invitacion-vence' : undefined}>
          Vence el {comoFecha(p.vence)}
        </span>
      ) : null}
    </>
  );
}
